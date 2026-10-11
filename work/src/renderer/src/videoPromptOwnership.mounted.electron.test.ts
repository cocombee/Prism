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

describe('mounted Video prompt ownership control', () => {
  it('keeps Lock/User/Reset compact on one local row while preserving ownership editing and history', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-video-prompt-ownership-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const bundle = join(directory, 'renderer.js')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React, { useMemo, useState } from 'react'
      import { createRoot } from 'react-dom/client'
      import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
      import { NodeCard, NodeRuntimeContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
    import { ProviderAvailabilityContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/ProviderAvailabilityContext.tsx'))}

      const autoPrompt = 'LOCKED PROVIDER PROMPT\\n\\nPreserve exact connected Storyboard timing, identity, camera, and continuity.'
      const initialData = { kind:'video-generator', title:'Video Generator', videoEngine:'bytedance/seedance-2.5/reference-to-video', promptMode:'manual', manualPromptDraft:'User draft', manualPromptSeeded:true, prompt:'User draft', runState:'idle', aspectRatio:'16:9', duration:4, resolution:'480p', quantity:1, generateAudio:true }
      const noop = () => undefined
      function Harness() {
        const [data,setData] = useState(initialData)
        const runtime = useMemo(() => new Proxy({
          videoPromptState: () => { const mode=data.promptMode==='auto'?'auto':'manual'; const manualPrompt=data.manualPromptDraft||data.prompt||''; return { connected:true, mode, autoPrompt, manualPrompt, activePrompt:mode==='auto'?autoPrompt:manualPrompt, fingerprint:'fixture', resetDisabled:mode!=='manual'||manualPrompt===autoPrompt } },
          setVideoPromptMode: (_id,mode) => setData(current => ({...current,promptMode:mode,manualPromptDraft:current.manualPromptDraft||autoPrompt,manualPromptSeeded:true})),
          resetManualPrompt: () => setData(current => ({...current,promptMode:'manual',manualPromptDraft:autoPrompt,manualPromptSeeded:true,prompt:autoPrompt})),
          updatePrompt: (_id,prompt) => setData(current => current.promptMode==='auto'?current:{...current,manualPromptDraft:prompt,prompt}),
          updateNode: (_id,patch) => setData(current => ({...current,...patch})),
          connectedReferenceTags: () => [], connectedInputRules: () => [], availablePromptTags: () => [],
          connectedInputMedia: () => undefined, connectedStoryboardVideoFamily: () => 'seedance', nodeMediaLinkState: () => undefined,
          generatedMediaFavorite: () => false, providerAccount: () => undefined, providerConnected: () => true,
          runReadiness: () => ({disabled:false,tooltip:'Ready'}), estimateNode: async () => null, availableModels: () => [],
          characterLibrary: [], storyboardLibrary: [], semanticLibraries: {element:[],location:[],wardrobe:[],'style-reference':[]},
        }, { get(target,property) { return property in target ? target[property] : noop } }), [data])
        const nodes=[{id:'video',type:'studio',position:{x:0,y:0},style:{width:315},data}]
        return <section data-video-case style={{width:315,height:700}}><ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} defaultViewport={{x:0,y:0,zoom:1}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider></section>
      }
      const rect = element => { const value=element.getBoundingClientRect(); return {left:value.left,right:value.right,top:value.top,bottom:value.bottom,width:value.width,height:value.height,cx:value.left+value.width/2,cy:value.top+value.height/2} }
      window.__ownership = {
        snapshot: () => { const shell=document.querySelector('.video-prompt-owner-shell'); const editor=shell.querySelector('textarea'); const group=shell.querySelector('.video-prompt-actions'); const rail=group.querySelector('.storyboard-transition-choice'); const reset=group.querySelector('[aria-label="Reset Manual Prompt to Auto"]'); const lock=group.querySelector('[aria-label="Use Locked Storyboard Prompt"]'); const user=group.querySelector('[aria-label="Use User Prompt"]'); const shellBox=rect(shell), groupBox=rect(group), railBox=rect(rail), resetBox=rect(reset), editorBox=rect(editor); return {shell:shellBox,group:groupBox,rail:railBox,reset:resetBox,editor:editorBox,position:getComputedStyle(group).position,display:getComputedStyle(group).display,gap:parseFloat(getComputedStyle(group).gap)||0,compact:groupBox.width<shellBox.width*.75,sameRow:Math.abs(railBox.cy-resetBox.cy)<=1,ordered:railBox.right<=resetBox.left+1,contained:groupBox.left>=shellBox.left-1&&groupBox.right<=shellBox.right-1,labels:[lock.textContent.trim(),user.textContent.trim()],checked:[lock.getAttribute('aria-checked'),user.getAttribute('aria-checked')],readOnly:editor.readOnly,resetDisabled:reset.disabled,value:editor.value} },
        click: label => document.querySelector('[aria-label="'+label+'"]').click(),
        setValue: value => { const editor=document.querySelector('.video-prompt-owner-shell textarea'); const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; setter.call(editor,value); editor.focus(); editor.setSelectionRange(value.length,value.length); editor.dispatchEvent(new Event('input',{bubbles:true})) },
        history: (shiftKey=false) => { const editor=document.querySelector('.video-prompt-owner-shell textarea'); editor.focus(); editor.dispatchEvent(new KeyboardEvent('keydown',{key:'z',metaKey:true,shiftKey,bubbles:true,cancelable:true})) },
      }
      createRoot(document.getElementById('root')).render(<Harness/>)
    `)
    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader: { '.svg': 'dataurl','.png':'dataurl'}, logLevel:'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    const flowStyles = resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${flowStyles}"><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}html,body,#root{margin:0;width:100%;height:100%}body{background:#111;color:#ddd}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));const finish=(value,code=0)=>{process.stdout.write('VIDEO_PROMPT_OWNERSHIP_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:500,height:850,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');await wait(350);const js=code=>win.webContents.executeJavaScript(code);const result={initial:await js('window.__ownership.snapshot()')};await js("window.__ownership.click('Use Locked Storyboard Prompt')");await wait(60);result.locked=await js('window.__ownership.snapshot()');await js("window.__ownership.click('Use User Prompt')");await wait(60);result.user=await js('window.__ownership.snapshot()');await js("window.__ownership.setValue('User draft edited')");await wait(60);result.edited=await js('window.__ownership.snapshot()');await js('window.__ownership.history(false)');await wait(60);result.undo=await js('window.__ownership.snapshot()');await js('window.__ownership.history(true)');await wait(60);result.redo=await js('window.__ownership.snapshot()');await js("window.__ownership.click('Reset Manual Prompt to Auto')");await wait(60);result.reset=await js('window.__ownership.snapshot()');finish(result)}).catch(error=>finish({error:error.stack||String(error)},1));`)
    const run = spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:50_000})
    const marker = run.stdout.split('\n').find(line=>line.startsWith('VIDEO_PROMPT_OWNERSHIP_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('VIDEO_PROMPT_OWNERSHIP_RESULT:'.length))
    expect(result.initial).toMatchObject({position:'absolute',display:'flex',compact:true,sameRow:true,ordered:true,contained:true,labels:['Lock','User'],checked:['false','true'],readOnly:false,resetDisabled:false,value:'User draft'})
    expect(result.locked).toMatchObject({labels:['Locked','User'],checked:['true','false'],readOnly:true,resetDisabled:true,value:'LOCKED PROVIDER PROMPT\n\nPreserve exact connected Storyboard timing, identity, camera, and continuity.'})
    expect(result.user).toMatchObject({labels:['Lock','User'],checked:['false','true'],readOnly:false,value:'User draft'})
    expect(result.edited.value).toBe('User draft edited')
    expect(result.undo.value).toBe('User draft')
    expect(result.redo.value).toBe('User draft edited')
    expect(result.reset).toMatchObject({readOnly:false,resetDisabled:true,value:'LOCKED PROVIDER PROMPT\n\nPreserve exact connected Storyboard timing, identity, camera, and continuity.'})
    for (const state of Object.values(result) as any[]) expect(state.editor.height).toBe(result.initial.editor.height)
  }, 60_000)
})

declare global { interface Window { __ownership: any } }
