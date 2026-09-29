import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'
import { addEntity, createCameraDocument, setCameraLockTarget } from './model'
import { isPilotCameraOnlyTransformChange } from './CameraViewport'
import { selectedEntityArrowTransform } from './interaction'

describe('V12 camera pilot model authority', () => {
  it('materializes the resolved authored rotation when locking to a Human', () => {
    let document = addEntity(createCameraDocument('v12-lock'), 'camera', 'Camera')
    document = addEntity(document, 'human', 'Human')
    const camera = document.entities.find((entity) => entity.kind === 'camera')!
    const human = document.entities.find((entity) => entity.kind === 'human')!
    camera.transform.position = [0, 1, 4]
    human.transform.position = [3, 2, 0]
    const locked = setCameraLockTarget(camera, human.id, document.entities)
    expect(locked.camera?.target).toMatchObject({ mode: 'object', entityId: human.id })
    expect(locked.transform.rotation).not.toEqual(camera.transform.rotation)
  })

  it('classifies Inspector preview as camera-only so scene rebuild is avoidable', () => {
    const previous = addEntity(addEntity(createCameraDocument('v12-latency'), 'camera', 'Camera'), 'human', 'Human')
    const camera = previous.entities.find((entity) => entity.kind === 'camera')!
    const next = structuredClone(previous)
    next.entities = next.entities.map((entity) => entity.id === camera.id ? { ...entity, transform: { ...entity.transform, position: [1, 2, 3] } } : entity)
    expect(isPilotCameraOnlyTransformChange(previous, next, camera.id)).toBe(true)
    next.entities = next.entities.map((entity) => entity.kind === 'human' ? { ...entity, transform: { ...entity.transform, position: [2, 0, 0] } } : entity)
    expect(isPilotCameraOnlyTransformChange(previous, next, camera.id)).toBe(false)
  })

  it('keeps a locked target while authored lateral movement recomputes aim', () => {
    let document = addEntity(addEntity(createCameraDocument('v12-target-move'), 'camera', 'Camera'), 'human', 'Human')
    const camera = document.entities.find((entity) => entity.kind === 'camera')!
    const human = document.entities.find((entity) => entity.kind === 'human')!
    camera.transform.position = [0, 1, 4]; human.transform.position = [2, 1, 0]
    const locked = setCameraLockTarget(camera, human.id, document.entities)
    document = { ...document, entities: document.entities.map((entity) => entity.id === camera.id ? locked : entity) }
    const result = selectedEntityArrowTransform(document, camera.id, { key: 'ArrowRight', altKey: false, metaKey: false, ctrlKey: false, shiftKey: false })
    expect(result.blocked).toBe(false)
    expect(result.transform?.position).not.toEqual(camera.transform.position)
    expect(result.transform?.rotation).not.toEqual(camera.transform.rotation)
  })
})

function runMountedPilotSync() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-pilot-sync-v12-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const viewport = resolve(import.meta.dirname, 'CameraViewport.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  writeFileSync(entry, `import React,{useRef,useState}from'react';import{createRoot}from'react-dom/client';import{CameraViewport}from${JSON.stringify(viewport)};import{addEntity,createCameraDocument,applyTransformCommit}from${JSON.stringify(model)};let initial=addEntity(createCameraDocument('v12-mounted'),'camera','Camera');initial.entities.find(e=>e.kind==='camera').transform.position=[0,1,4];initial.shots[0].camera.transform=structuredClone(initial.entities.find(e=>e.kind==='camera').transform);initial.shots[0].camera.keyframes.forEach(k=>k.transform=structuredClone(initial.entities.find(e=>e.kind==='camera').transform));window.__m={previews:[],commits:[]};function App(){const[d,setD]=useState(initial);const ref=useRef(null);const camera=d.entities.find(e=>e.kind==='camera');const update=(next)=>setD(current=>{const result=applyTransformCommit(current,next.id,next.transform,{gridSnap:false,collision:false,groundSnap:false,optionBypass:false,explicitAxis:null,frame:0});return result.ok?result.document:current});return <><button id="pilot" onClick={()=>ref.current.viewThroughCamera(camera.id)}>Pilot</button><button id="author" onClick={()=>{const next={...camera,transform:{...camera.transform,position:[2,2,5],rotation:[0,45,0]}};update(next)}}/><button id="pan" onClick={()=>ref.current.panScreenRight(1)}/> <CameraViewport ref={ref} document={d} frame={0} selectedIds={[camera.id]} guides={{grid:false,cameraPath:false,fov:false,entityPaths:false}} onSelect={()=>{}} onTransformPreview={(id,t)=>{window.__m.previews.push(t);update({...camera,transform:t})}} onPilotPreview={(id,t)=>{window.__m.previews.push(t);update({...camera,transform:t})}} onPilotCommit={(id,t)=>{window.__m.commits.push(t);update({...camera,transform:t})}} onTransform={(id,t)=>update({...camera,transform:t})}/></>};createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}.camera3d-viewport-wrap,.camera3d-viewport-canvas{position:relative;width:100%;height:100%}</style><div id="root"></div><script src="renderer.js"></script>`)
  const probe = `(async()=>{const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const map=()=>document.querySelector('[data-viewer-position]');document.querySelector('#pilot').click();await wait();const before={position:map()?.getAttribute('data-viewer-position'),target:map()?.getAttribute('data-viewer-target')};document.querySelector('#author').click();await wait();const after={position:map()?.getAttribute('data-viewer-position'),target:map()?.getAttribute('data-viewer-target')};document.querySelector('#pan').click();await wait();return{before,after,previews:window.__m.previews,commits:window.__m.commits}})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:900,height:700,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,500));console.log('V12_PILOT:'+JSON.stringify(await w.webContents.executeJavaScript(${JSON.stringify(probe)})));w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
  try { const marker = run.stdout.split('\n').find((line) => line.startsWith('V12_PILOT:')); expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0); expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined(); return JSON.parse(marker!.slice('V12_PILOT:'.length)) } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('V12 mounted CameraViewport pilot synchronization', () => {
  it('publishes authored Camera changes while piloting without re-entering', () => {
    const result = runMountedPilotSync()
    expect(result.before.position).not.toBe(result.after.position)
    expect(result.after.position).toBe('2,2,5')
    expect(result.after.target).not.toBe(result.before.target)
  }, 60000)

  it('authors lateral pilot movement through the parent callback', () => {
    const result = runMountedPilotSync()
    expect(result.previews.length).toBeGreaterThan(0)
    expect(result.previews.at(-1).position).not.toEqual([2, 2, 5])
  }, 60000)
})
