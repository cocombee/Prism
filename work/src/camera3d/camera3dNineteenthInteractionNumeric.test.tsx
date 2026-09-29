import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runMountedNumeric(script: string) {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-nineteenth-numeric-'))
  const entry = join(directory, 'entry.tsx'), bundle = join(directory, 'renderer.js'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraTransformInspector}from ${JSON.stringify(resolve(import.meta.dirname, 'exactCanvasCamera.tsx'))};import{addEntity,createCameraDocument}from ${JSON.stringify(resolve(import.meta.dirname, 'model.ts'))};const initial=addEntity(createCameraDocument('numeric-19'),'block','Block').entities[0];window.__m={drafts:0,commits:0,cancels:0};function App(){const[entity,setEntity]=useState(initial);const draft=transform=>{window.__m.drafts++;setEntity(current=>({...current,transform}))};const commit=transform=>{window.__m.commits++;setEntity(current=>({...current,transform}))};const cancel=()=>{window.__m.cancels++;setEntity(initial)};return <><CameraTransformInspector entity={entity} frame={0} disabled={false} onDraft={draft} onCommit={commit} onCancelPreview={cancel} onKeyframe={()=>{}} onReset={()=>{}}/><output aria-label="asset-position-x">{entity.transform.position[0]}</output></>};createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<div id="root"></div><script src="renderer.js"></script>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:700,height:600,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,200));const result=await w.webContents.executeJavaScript(${JSON.stringify(script)});console.log('NINETEENTH_NUMERIC:'+JSON.stringify(result));await w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 40000 })
  try {
    const marker = run.stdout.split('\n').find((line) => line.startsWith('NINETEENTH_NUMERIC:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('NINETEENTH_NUMERIC:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('3D Camera Nineteenth mounted numeric physical interactions', () => {
  it('updates the numeric field and asset transform in the same frame during horizontal drag', () => {
    const result = runMountedNumeric(`(async()=>{const field=document.querySelector('[aria-label="Position X value"]');field.setPointerCapture=()=>{};field.releasePointerCapture=()=>{};field.hasPointerCapture=()=>true;const fire=(type,x)=>field.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:9,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:20}));fire('pointerdown',100);fire('pointermove',120);await new Promise(requestAnimationFrame);return{field:field.value,asset:document.querySelector('[aria-label="asset-position-x"]').textContent,...window.__m}})()`)
    expect(result).toMatchObject({ field: '0.1', asset: '0.1', drafts: 1, commits: 0 })
  }, 50000)

  it('commits a horizontal drag exactly once on pointer release', () => {
    const result = runMountedNumeric(`(async()=>{const field=document.querySelector('[aria-label="Position X value"]');field.setPointerCapture=()=>{};field.releasePointerCapture=()=>{};field.hasPointerCapture=()=>true;const fire=(type,x,buttons=1)=>field.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:9,pointerType:'mouse',button:0,buttons,clientX:x,clientY:20}));fire('pointerdown',100);fire('pointermove',120);await new Promise(requestAnimationFrame);fire('pointerup',120,0);await new Promise(requestAnimationFrame);return{field:field.value,asset:document.querySelector('[aria-label="asset-position-x"]').textContent,...window.__m}})()`)
    expect(result).toMatchObject({ field: '0.1', asset: '0.1', drafts: 1, commits: 1, cancels: 0 })
  }, 50000)

  it('restores the exact predrag number and asset without commit on pointercancel', () => {
    const result = runMountedNumeric(`(async()=>{const field=document.querySelector('[aria-label="Position X value"]');field.setPointerCapture=()=>{};field.releasePointerCapture=()=>{};field.hasPointerCapture=()=>true;const fire=(type,x)=>field.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:9,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:20}));fire('pointerdown',100);fire('pointermove',120);await new Promise(requestAnimationFrame);fire('pointercancel',120);await new Promise(requestAnimationFrame);return{field:field.value,asset:document.querySelector('[aria-label="asset-position-x"]').textContent,...window.__m}})()`)
    expect(result).toMatchObject({ field: '0', asset: '0', drafts: 1, commits: 0, cancels: 1 })
  }, 50000)

  it('restores the exact predrag number and asset without commit on Escape', () => {
    const result = runMountedNumeric(`(async()=>{const field=document.querySelector('[aria-label="Position X value"]');field.setPointerCapture=()=>{};field.releasePointerCapture=()=>{};field.hasPointerCapture=()=>true;const fire=(type,x)=>field.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:9,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:20}));field.focus();fire('pointerdown',100);fire('pointermove',120);await new Promise(requestAnimationFrame);field.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Escape'}));await new Promise(requestAnimationFrame);return{field:field.value,asset:document.querySelector('[aria-label="asset-position-x"]').textContent,...window.__m}})()`)
    expect(result).toMatchObject({ field: '0', asset: '0', drafts: 1, commits: 0, cancels: 1 })
  }, 50000)
})
