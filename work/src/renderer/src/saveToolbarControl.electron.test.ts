import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { buildSync } = require(resolve(process.cwd(), 'node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string
const temporaryDirectories: string[] = []
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('rendered manual Save routing and accessibility', () => {
  it('renders 0/0/1 controls on Project list, Canvas list, and active Canvas editor', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-save-toolbar-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const bundle = join(directory, 'renderer.js')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React, {useState} from 'react'
      import {createRoot} from 'react-dom/client'
      import {CanvasManualSaveControl} from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/SaveToolbarControl.tsx'))}
      const stateFor=(surface)=>surface==='canvas-editor'?'unsaved':'saved'
      function App(){const [surface,setSurface]=useState('project-list');const [activations,setActivations]=useState(0);const [state,setState]=useState('saved');window.__saveHarness={show:(next,nextState=stateFor(next))=>{setSurface(next);setState(nextState)},activations:()=>activations};return <div className="top-actions"><button aria-label="Before">Before</button><CanvasManualSaveControl surface={surface} state={state} onSave={()=>setActivations(value=>value+1)}/><button className="responsive-action" aria-label="Assets">Assets</button><button className="delete-current-page" aria-label="Delete Current Page">Delete</button><button aria-label="Connections">Settings</button></div>}
      createRoot(document.getElementById('root')).render(<App/>)
    `)
    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', logLevel:'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${styles}"></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const wait=ms=>new Promise(r=>setTimeout(r,ms));const finish=(v,c=0)=>{process.stdout.write('SAVE_TOOLBAR_RESULT:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1000,height:700,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});const js=c=>w.webContents.executeJavaScript(c);await wait(120);const snap=()=>js("(()=>{const b=document.querySelector('[aria-label=\\\"Save project\\\"]');return {tag:b?.tagName,hasCustomKeyHandler:Boolean(b?.onkeydown),count:document.querySelectorAll('[aria-label=\\\"Save project\\\"]').length,tooltip:b?.getAttribute('data-tooltip'),busy:b?.getAttribute('aria-busy'),disabled:b?.disabled,status:document.querySelector('[role=status]')?.textContent||'',order:Array.from(document.querySelector('.top-actions').children).filter(n=>!n.matches('[role=status]')).map(n=>n.getAttribute('aria-label')||n.className),height:b?getComputedStyle(b).height:null,width:b?getComputedStyle(b).width:null}})()");const result={project:await snap()};await js("window.__saveHarness.show('canvas-list')");await wait(30);result.canvasList=await snap();await js("window.__saveHarness.show('canvas-editor','unsaved')");await wait(30);result.editor=await snap();await js("document.querySelector('[aria-label=\\\"Save project\\\"]').click()");await wait(20);result.activations=await js("window.__saveHarness.activations()");await js("window.__saveHarness.show('canvas-editor','saving')");await wait(20);result.saving=await snap();await js("window.__saveHarness.show('canvas-editor','success')");await wait(20);result.success=await snap();finish(result)}).catch(e=>finish({error:e.stack||String(e)},1));`)
    const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:30000})
    const marker=run.stdout.split('\n').find(line=>line.startsWith('SAVE_TOOLBAR_RESULT:'))
    expect(run.status,`${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker,`${run.stdout}\n${run.stderr}`).toBeDefined()
    const result=JSON.parse(marker!.slice('SAVE_TOOLBAR_RESULT:'.length))
    expect(result.project.count).toBe(0)
    expect(result.canvasList.count).toBe(0)
    expect(result.editor).toMatchObject({tag:'BUTTON',hasCustomKeyHandler:false,count:1,tooltip:'Save',busy:'false',disabled:false,height:'34px',width:'34px'})
    expect(result.editor.order).toEqual(['Before','top-align-separator','Save project','top-align-separator','Assets','Delete Current Page','Connections'])
    expect(result.activations).toBe(1)
    expect(result.saving).toMatchObject({count:1,busy:'true',disabled:true,status:'Saving project'})
    expect(result.success).toMatchObject({count:1,busy:'false',disabled:true,status:'Project saved'})
  }, 40_000)
})

declare global { interface Window { __saveHarness: { show:(surface:string,state?:string)=>void;activations:()=>number } } }
