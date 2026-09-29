import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runContractProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-approved-contract-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraOpticsInspector,CameraTransformInspector}from${JSON.stringify(component)};import{addEntity,createCameraDocument}from${JSON.stringify(model)};const seeded=addEntity(addEntity(addEntity(createCameraDocument('approved-contract'),'camera','Camera'),'human','Human'),'block','Block');function App(){const[d,setD]=useState(seeded);const[duration,setDuration]=useState(2);const camera=d.entities.find(e=>e.kind==='camera');const selected=d.entities.find(e=>e.kind==='camera')||d.entities[0];const[mode,setMode]=useState('camera');const entity=mode==='camera'?camera:d.entities.find(e=>e.kind==='human');const shot=d.shots[0];return <main><button aria-label="Select Human" onClick={()=>setMode('asset')}>Asset</button><button aria-label="Select Camera" onClick={()=>setMode('camera')}>Camera</button><div data-contract-root="true">{entity&&<><CameraTransformInspector entity={entity} frame={0} disabled={false} onDraft={()=>{}} onCommit={next=>setD({...d,entities:d.entities.map(e=>e.id===next.id?next:e)})} onKeyframe={()=>{}} onReset={()=>{}} onResetTransform={()=>{}} onTransformLock={()=>{}}/><button aria-label="Rotation Lock" onClick={()=>{}}>rotation</button>{entity.kind==='camera'&&<CameraOpticsInspector entity={entity} entities={d.entities} disabled={false} durationSeconds={duration} fps={24} shotBoundary={shot.boundary} onBoundaryChange={()=>{}} onDurationFrames={frames=>{window.__durationFrames=frames;setDuration(frames/24)}} onChange={next=>setD({...d,entities:d.entities.map(e=>e.id===next.id?next:e)})} onSectionKeyframe={()=>{}} onMasterReset={()=>{}} onSettingsLock={()=>{}}/>}</>}</div></main>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const probe = `(async()=>{const wait=()=>new Promise(requestAnimationFrame);const sections=()=>[...document.querySelectorAll('[data-contract-root="true"] > .inspector-section')].map(e=>e.className);const duration=()=>document.querySelector('[aria-label="Camera Duration (seconds)"]');const target=()=>document.querySelector('[aria-label="Target"]');const cameraSections=sections();const input=duration();const initialDuration=input?.value;const step=input?.step;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,'2.5');input?.dispatchEvent(new Event('input',{bubbles:true}));input?.dispatchEvent(new Event('change',{bubbles:true}));await wait();const afterDuration=input?.value;const durationFrames=window.__durationFrames;target()?.click();await wait();const targetOptions=[...document.querySelectorAll('[role="option"]')].map(e=>e.textContent?.trim());const targetCount=document.querySelectorAll('.camera3d-target-control .storyboard-compact-select').length;document.querySelector('[aria-label="Select Human"]')?.click();await wait();const assetSections=sections();const cameraTabStops=[...document.querySelectorAll('[aria-label^="Camera"], [aria-label="Target"], [aria-label="Camera Duration (seconds)"]')].filter(e=>!e.closest('[aria-hidden="true"]')).length;document.querySelector('[aria-label="Select Camera"]')?.click();await wait();const cameraSection=document.querySelector('.camera3d-camera-section');const rotationSection=document.querySelector('.camera3d-rotation-section');const rotationLock=document.querySelector('[aria-label="Lock Rotation"],[aria-label="Unlock Rotation"]');const transformHeader=document.querySelector('.camera3d-transform-header');const rotationHeader=rotationSection?.querySelector('.camera3d-transform-header');const rows=[...document.querySelectorAll('.camera3d-axis-row,.camera3d-rotation-property')].map(e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height}});return{cameraSections,assetSections,cameraTabStops,targetOptions,targetCount,initialDuration,afterDuration,durationFrames,step,rotationSection:Boolean(rotationSection),rotationLock:Boolean(rotationLock),rotationHeader:Boolean(rotationHeader),transformHeader:Boolean(transformHeader),rows,divider:getComputedStyle(document.querySelector('.camera3d-transform-divider')).cssText||''}})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:900,height:900,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,400));const result=await w.webContents.executeJavaScript(${JSON.stringify(probe)});console.log('CAMERA_APPROVED_CONTRACT:'+JSON.stringify(result));w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 50000 })
  try {
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_APPROVED_CONTRACT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('CAMERA_APPROVED_CONTRACT:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('approved mounted Prism 3D inspector contract', () => {
  it('mounts camera/non-camera sections, uses one target selector, and formats duration', () => {
    const result = runContractProbe()
    expect(result.cameraSections.every((value: string) => value.includes('camera3d-transform-section') || value.includes('camera3d-rotation-section') || value.includes('camera3d-camera-section'))).toBe(true)
    expect(result.cameraSections.some((value: string) => value.includes('camera3d-camera-section'))).toBe(true)
    expect(result.assetSections.map((value: string) => value.split(' ').filter(Boolean)[1])).toEqual(['camera3d-transform-section', 'camera3d-rotation-section'])
    expect(result.cameraTabStops).toBe(0)
    expect(result.targetOptions).toEqual(['None', 'Human', 'Block'])
    expect(result.targetCount).toBe(1)
    expect(result.initialDuration).toBe('2.0')
    expect(result.afterDuration).toBe('2.5')
    expect(result.durationFrames).toBe(60)
    expect(result.step).toBe('0.5')
    expect(result.rotationSection).toBe(true)
    expect(result.rotationLock).toBe(true)
    expect(result.rotationHeader).toBe(true)
    expect(result.transformHeader).toBe(true)
    expect(result.rows.every((row: {height:number}) => row.height === 28)).toBe(true)
  }, 60000)
})
