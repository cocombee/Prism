import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

type StartupResult = {
  checkpoints: Array<{ label: string; expanded: boolean; compactCreate: boolean; rows: number; clips: number; cameras: number; saves: number }>
  afterClick: Array<{ label: string; rows: number; clips: number; cameras: number; durations: number[]; frames: number[][]; saves: number }>
}

function runStartupScenario(explicitEmpty: boolean): StartupResult {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-tester-startup-'))
  const userData = join(directory, 'u')
  const stateDir = join(userData, 'camera-nodes')
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const preload = join(directory, 'preload.cjs')
  if (explicitEmpty) {
    mkdirSync(stateDir, { recursive: true })
    writeFileSync(join(stateDir, 'camera-node-01.json'), JSON.stringify({ document: { id: 'camera-node-01', name: '3D Camera', aspect: '16:9', resolution: '1080p', fps: 24, scope: 'full', entities: [], groups: [], objects: [], shots: [], sceneTree: [] } }))
  }
  writeFileSync(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{CameraTesterApp}from${JSON.stringify(resolve(import.meta.dirname, './CameraTesterApp.tsx'))};createRoot(document.getElementById('root')!).render(<React.StrictMode><CameraTesterApp/></React.StrictMode>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'file' }, logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href}"><link rel="stylesheet" href="${pathToFileURL(resolve(import.meta.dirname, '../camera3d/camera3d.css')).href}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  writeFileSync(preload, `const{contextBridge,ipcRenderer}=require('electron');const trace={saves:0,last:null};const getTrace=()=>({saves:trace.saves,last:trace.last});contextBridge.exposeInMainWorld('cameraTester',{loadNodeState:id=>ipcRenderer.invoke('load',id),saveNodeState:(id,state)=>{trace.saves++;trace.last=state;return ipcRenderer.invoke('save',id,state)},getTrace,mediaUrl:async()=>({ok:false,reason:'test'}),revealMedia:async()=>false,deleteMedia:async()=>false,startRender:async()=>({jobId:'x',total:0}),writeRenderFrame:async()=>({}),finishRender:async()=>({}),cancelRender:async()=>{},objectAssistantStatus:async()=>({connected:false,vision:false}),createObjectRecipe:async()=>null});`)
  const snapshot = `(()=>{const rows=[...document.querySelectorAll('.camera3d-shot-row')];const trace=window.cameraTester.getTrace();return{expanded:Boolean(document.querySelector('.camera3d-workspace')),compactCreate:[...document.querySelectorAll('button')].some(b=>b.textContent?.trim()==='Create'),rows:rows.length,clips:document.querySelectorAll('.camera3d-shot-block[data-shot-id]').length,cameras:document.querySelectorAll('[data-entity-kind="camera"]').length,last:trace.last}})()`
  const script = `(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));const snap=label=>{const value=${snapshot};return{...value,label,saves:window.cameraTester.getTrace().saves}};const checkpoints=[snap('first')];await wait(200);checkpoints.push(snap('0.2s'));await wait(800);checkpoints.push(snap('1s'));await wait(2000);checkpoints.push(snap('3s'));const add=document.querySelector('.camera3d-local-toolbar button[aria-label="Add Camera"]')||[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Add Camera');if(!add)throw Error('Add Camera tool missing');add.click();const afterClick=[{label:'immediate',...${snapshot},durations:window.cameraTester.getTrace().last?.document?.shots?.map(s=>s.duration)||[],frames:window.cameraTester.getTrace().last?.document?.shots?.map(s=>[s.startFrame,s.endFrame])||[],saves:window.cameraTester.getTrace().saves}];await wait(1000);afterClick.push({label:'1s',...${snapshot},durations:window.cameraTester.getTrace().last?.document?.shots?.map(s=>s.duration)||[],frames:window.cameraTester.getTrace().last?.document?.shots?.map(s=>[s.startFrame,s.endFrame])||[],saves:window.cameraTester.getTrace().saves});await wait(1000);afterClick.push({label:'settled',...${snapshot},durations:window.cameraTester.getTrace().last?.document?.shots?.map(s=>s.duration)||[],frames:window.cameraTester.getTrace().last?.document?.shots?.map(s=>[s.startFrame,s.endFrame])||[],saves:window.cameraTester.getTrace().saves});return{checkpoints,afterClick}})()`
  writeFileSync(main, `const{app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');app.setPath('userData',${JSON.stringify(userData)});app.whenReady().then(async()=>{ipcMain.handle('load',async(_,id)=>{try{return JSON.parse(await fs.readFile(path.join(${JSON.stringify(stateDir)},id+'.json'),'utf8'))}catch{return null}});ipcMain.handle('save',async(_,id,state)=>{await fs.mkdir(${JSON.stringify(stateDir)},{recursive:true});await fs.writeFile(path.join(${JSON.stringify(stateDir)},id+'.json'),JSON.stringify(state))});const w=new BrowserWindow({show:false,width:1400,height:900,useContentSize:true,webPreferences:{preload:${JSON.stringify(preload)},contextIsolation:true,sandbox:false}});await w.loadFile(${JSON.stringify(html)});const result=await w.webContents.executeJavaScript(${JSON.stringify(script)});console.log('CAMERA_TESTER_STARTUP:'+JSON.stringify(result));w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_TESTER_STARTUP:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('CAMERA_TESTER_STARTUP:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('CameraTesterApp standalone startup contract', () => {
  for (const explicitEmpty of [false, true]) {
    it(`${explicitEmpty ? 'explicit empty file' : 'absent file'} stays empty until one canvas Add Camera`, () => {
      const result = runStartupScenario(explicitEmpty)
      expect(result.checkpoints).toEqual(expect.arrayContaining([
        expect.objectContaining({ expanded: true, compactCreate: false, rows: 0, clips: 0, cameras: 0, saves: 0 }),
      ]))
      expect(result.checkpoints).toHaveLength(4)
      expect(result.afterClick).toHaveLength(3)
      for (const state of result.afterClick) expect(state).toMatchObject({ rows: 1, clips: 1, cameras: 1, durations: [2], frames: [[0, 48]], saves: 1 })
    }, 60000)
  }
})
