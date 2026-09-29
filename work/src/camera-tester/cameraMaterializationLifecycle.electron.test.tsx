import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runCameraTesterLifecycle() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-materialization-lifecycle-'))
  const userData = join(directory, 'u')
  const stateDir = join(userData, 'camera-nodes')
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const preload = join(directory, 'preload.cjs')
  const fixture = JSON.parse(readFileSync('/tmp/prism-current-working-camera-oracle/camera-node-01.json', 'utf8'))
  const authoredShot = fixture.document.shots[0]
  fixture.document.entities = fixture.document.entities.filter((entity: { kind: string }) => entity.kind !== 'camera')
  fixture.document.shots = [fixture.document.shots[0]]
  fixture.document.sceneTree = fixture.document.sceneTree.filter((id: string) => id === 'shot-2' || fixture.document.entities.some((entity: { id: string }) => entity.id === id))
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(stateDir, 'camera-node-01.json'), JSON.stringify(fixture))
  writeFileSync(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{CameraTesterApp}from${JSON.stringify(resolve(import.meta.dirname, './CameraTesterApp.tsx'))};createRoot(document.getElementById('root')!).render(<React.StrictMode><CameraTesterApp/></React.StrictMode>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'file' }, logLevel: 'silent' })
  writeFileSync(html, `<div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  writeFileSync(preload, `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('cameraTester',{loadNodeState:id=>ipcRenderer.invoke('load',id),saveNodeState:(id,state)=>ipcRenderer.invoke('save',id,state),mediaUrl:async()=>({ok:false,reason:'test'}),revealMedia:async()=>false,deleteMedia:async()=>false,startRender:async()=>({jobId:'x',total:0}),writeRenderFrame:async()=>({}),finishRender:async()=>({}),cancelRender:async()=>{},objectAssistantStatus:async()=>({connected:false,vision:false}),createObjectRecipe:async()=>({})});`)
  writeFileSync(main, `const{app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');app.setPath('userData',${JSON.stringify(userData)});let saves=0;app.whenReady().then(async()=>{await fs.mkdir(${JSON.stringify(stateDir)},{recursive:true});ipcMain.handle('load',async(_,id)=>JSON.parse(await fs.readFile(path.join(${JSON.stringify(stateDir)},id+'.json'),'utf8')));ipcMain.handle('save',async(_,id,state)=>{saves++;await fs.writeFile(path.join(${JSON.stringify(stateDir)},id+'.json'),JSON.stringify(state))});const w=new BrowserWindow({show:false,width:1400,height:900,webPreferences:{preload:${JSON.stringify(preload)},contextIsolation:true,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,900));await new Promise(r=>setTimeout(r,1800));await new Promise(r=>setTimeout(r,900));const result=await w.webContents.executeJavaScript(${JSON.stringify(`(()=>({shots:document.querySelectorAll('.camera3d-shot-row').length,cameras:Array.from(document.querySelectorAll('.camera3d-entity-row[data-entity-kind="camera"]')).map(x=>x.getAttribute('data-entity-id')),names:Array.from(document.querySelectorAll('.camera3d-shot-row')).map(x=>x.textContent)}))()`)});const saved=JSON.parse(await fs.readFile(path.join(${JSON.stringify(stateDir)},'camera-node-01.json'),'utf8'));console.log('CAMERA_MATERIALIZATION_LIFECYCLE:'+JSON.stringify({result,saves,persistedShots:saved.document.shots.map(x=>x.id),authoredShot:${JSON.stringify(authoredShot)},persistedShot:saved.document.shots[0],persistedCameras:saved.document.entities.filter(x=>x.kind==='camera').map(x=>x.id)}));w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_MATERIALIZATION_LIFECYCLE:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('CAMERA_MATERIALIZATION_LIFECYCLE:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('CameraTester persisted Camera materialization lifecycle', () => {
  it('keeps one authored Camera-less Shot as one Shot/Camera through direct startup materialization', () => {
    const result = runCameraTesterLifecycle()
    expect(result.result.shots).toBe(1)
    expect(result.result.names).toHaveLength(1)
    expect(result.persistedShots).toEqual(['shot-2'])
    expect(result.persistedShot).toMatchObject({ id: result.authoredShot.id, startFrame: result.authoredShot.startFrame, endFrame: result.authoredShot.endFrame, entityOrder: result.authoredShot.entityOrder })
    expect(result.persistedCameras).toHaveLength(1)
  }, 60000)
})