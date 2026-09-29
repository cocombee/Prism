import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { expect, it } from 'vitest'

it('keeps one authored camera unit while the fresh-profile load is delayed', () => {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-load-race-mounted-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const app = resolve(import.meta.dirname, '../camera-tester/CameraTesterApp.tsx')
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  writeFileSync(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{CameraTesterApp}from${JSON.stringify(app)};window.__cameraTrace={saves:[],loads:0};const emptyDocument={id:'camera-node-01',name:'3D Camera',aspect:'16:9',resolution:'1080p',fps:24,scope:'full',entities:[],groups:[],objects:[],shots:[],sceneTree:[]};window.cameraTester={loadNodeState:async()=>{const call=++window.__cameraTrace.loads;await new Promise(r=>setTimeout(r,1500));return call===1?null:{document:emptyDocument}},saveNodeState:async(_id,state)=>{window.__cameraTrace.saves.push(state)},mediaUrl:async()=>({ok:false,reason:'not used'}),revealMedia:async()=>false,deleteMedia:async()=>false,startRender:async()=>({jobId:'unused',total:0}),writeRenderFrame:async()=>({}),finishRender:async()=>({}),cancelRender:async()=>{},objectAssistantStatus:async()=>({connected:false,vision:false}),createObjectRecipe:async()=>null};createRoot(document.getElementById('root')).render(<React.StrictMode><CameraTesterApp/></React.StrictMode>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'file' }, logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const snapshotScript = `(()=>{const rows=[...document.querySelectorAll('.camera3d-shot-row')];const clips=[...document.querySelectorAll('.camera3d-shot-block[data-shot-id]')];return{rows:rows.length,clips:clips.length,cameras:rows.filter(e=>e.hasAttribute('data-camera-entity-id')).length,durations:window.__cameraTrace.saves.at(-1)?.document?.shots?.map(s=>s.duration)||[],frames:window.__cameraTrace.saves.at(-1)?.document?.shots?.map(s=>[s.startFrame,s.endFrame])||[],saves:window.__cameraTrace.saves.length}})()`
  const delayedAction = `(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await wait(400);const empty=${snapshotScript};await wait(400);const add=document.querySelector('.tool-rail button[aria-label="Add Camera"]');if(!add)throw new Error('Add Camera tool not found');add.click();await frame();const immediate=${snapshotScript};await wait(1000);const oneSecond=${snapshotScript};await wait(1000);const settled=${snapshotScript};return{empty,immediate,oneSecond,settled,loads:window.__cameraTrace.loads}})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1400,height:900,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});const result=await w.webContents.executeJavaScript(${JSON.stringify(delayedAction)});console.log('CAMERA_LOAD_RACE:'+JSON.stringify(result));await w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_LOAD_RACE:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('CAMERA_LOAD_RACE:'.length))
    expect(result.empty).toMatchObject({ rows: 0, clips: 0, cameras: 0 })
    expect(result.loads).toBeGreaterThanOrEqual(2)
    for (const checkpoint of [result.immediate, result.oneSecond, result.settled]) {
      expect(checkpoint, JSON.stringify(result)).toMatchObject({ rows: 1, clips: 1, cameras: 1 })
      expect(checkpoint.durations).toEqual([2])
      expect(checkpoint.frames).toEqual([[0, 48]])
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}, 60000)
