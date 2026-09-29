import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'
import { cleanRenderFrameWithoutCameraEntities } from './CameraViewport'
import { addEntity, createCameraDocument, evaluateFrame } from './model'

function runMountedProjection(projection: 'top' | 'side') {
  const directory = mkdtempSync(join(tmpdir(), `prism-camera-nineteenth-${projection}-`))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraViewport}from ${JSON.stringify(resolve(import.meta.dirname, 'CameraViewport.tsx'))};import{addEntity,createCameraDocument}from ${JSON.stringify(resolve(import.meta.dirname, 'model.ts'))};let initial=addEntity(createCameraDocument('nineteenth-${projection}'),'camera','Camera');initial.entities[0].transform.position=[0,1,0];window.__m={previews:[],commits:[]};function App(){const[document,setDocument]=useState(initial);const preview=(id,transform)=>{window.__m.previews.push(structuredClone(transform));setDocument(current=>({...current,entities:current.entities.map(entity=>entity.id===id?{...entity,transform}:entity)}))};const commit=(id,transform)=>{window.__m.commits.push(structuredClone(transform));setDocument(current=>({...current,entities:current.entities.map(entity=>entity.id===id?{...entity,transform}:entity)}))};return <CameraViewport document={document} frame={0} selectedIds={[]} guides={{grid:true,cameraPath:false,fov:false,entityPaths:false}} onSelect={()=>{}} onTransformPreview={preview} onTransform={commit}/>};createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}.camera3d-viewport-wrap,.camera3d-viewport-canvas{position:relative;width:100%;height:100%}</style><div id="root"></div><script src="renderer.js"></script>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:900,height:700,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,500));const result=await w.webContents.executeJavaScript(\`(async()=>{const wait=(n=80)=>new Promise(r=>setTimeout(r,n));document.querySelector('button[aria-pressed=false]:nth-of-type(${projection === 'top' ? 3 : 4})')?.click();await wait(150);const canvas=document.querySelector('.camera3d-viewport-canvas canvas');canvas.setPointerCapture=()=>{};canvas.releasePointerCapture=()=>{};canvas.hasPointerCapture=()=>true;const rect=canvas.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;const fire=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'mouse',button:1,buttons:type==='pointerup'?0:4,clientX:x,clientY:y}));for(const [dx,dy] of [[36,0],[-36,0],[0,36],[0,-36]]){window.__m.previews=[];fire('pointerdown',cx,cy);fire('pointermove',cx+dx,cy+dy);fire('pointerup',cx+dx,cy+dy);await wait();}const wrap=document.querySelector('.camera3d-viewport-wrap');const before=Number(wrap.dataset.editorZoom);canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:-200}));await wait(500);const zoomIn=Number(wrap.dataset.editorZoom);canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:400}));await wait(500);const zoomOut=Number(wrap.dataset.editorZoom);return{...window.__m,zoom:{before,zoomIn,zoomOut}}})()\`);console.log('NINETEENTH:'+JSON.stringify(result));await w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 40000 })
  try {
    const marker = run.stdout.split('\n').find((line) => line.startsWith('NINETEENTH:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('NINETEENTH:'.length)) as { previews: Array<{ position: number[] }>; commits: Array<{ position: number[] }>; zoom: { before: number; zoomIn: number; zoomOut: number } }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('3D Camera Nineteenth mounted physical interactions', () => {
  it('removes every deployed Camera entity only from the clean-render EvaluatedFrame', () => {
    let document = addEntity(createCameraDocument('clean-camera-filter'), 'camera', 'Camera A')
    document = addEntity(document, 'block', 'Block')
    document = addEntity(document, 'camera', 'Camera B')
    const editorFrame = evaluateFrame(document, 0)
    const cleanFrame = cleanRenderFrameWithoutCameraEntities(editorFrame)
    expect(editorFrame.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(2)
    expect(cleanFrame.entities.map((entity) => entity.kind)).toEqual(['block'])
    expect(editorFrame.entities).toHaveLength(3)
  })

  it('moves a deployed Camera in all four Top-view screen directions', () => {
    const result = runMountedProjection('top')
    expect(result.commits).toHaveLength(4)
    expect(result.commits[0].position[0]).toBeGreaterThan(0)
    expect(result.commits[1].position[0]).toBeCloseTo(0, 5)
    expect(result.commits[2].position[2]).not.toBeCloseTo(0, 5)
    expect(result.commits[3].position[2]).toBeCloseTo(0, 5)
  }, 50000)

  it('moves a deployed Camera in all four Side-view screen directions', () => {
    const result = runMountedProjection('side')
    expect(result.commits).toHaveLength(4)
    expect(result.commits[0].position[2]).not.toBeCloseTo(0, 5)
    expect(result.commits[1].position[2]).toBeCloseTo(0, 5)
    expect(result.commits[2].position[1]).toBeLessThan(1)
    expect(result.commits[3].position[1]).toBeCloseTo(1, 5)
  }, 50000)

  it.each(['top', 'side'] as const)('zooms in and out from physical wheel input in %s view', (projection) => {
    const { zoom } = runMountedProjection(projection)
    expect(zoom.before).toBeGreaterThan(0)
    expect(zoom.zoomIn).toBeGreaterThan(zoom.before)
    expect(zoom.zoomOut).toBeLessThan(zoom.zoomIn)
  }, 50000)
})
