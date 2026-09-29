import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runNativeSeek() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-native-seek-'))
  const entry = join(directory, 'entry.tsx'), bundle = join(directory, 'renderer.js'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  const css = readFileSync(resolve(import.meta.dirname, 'camera3d.css'), 'utf8')
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraShotTimeline}from${JSON.stringify(component)};import{addShot,createCameraDocument}from${JSON.stringify(model)};const source=addShot(addShot(createCameraDocument('native-seek')));function App(){const[frame,setFrame]=useState(0);return <CameraShotTimeline document={source} frame={frame} selectedShotId={source.shots[0].id} expanded={true} showKeyframes={false} onFrame={setFrame} onShot={()=>{}} onToggleExpanded={()=>{}} onToggleKeyframes={()=>{}} onReorder={()=>{}} onResizeShot={()=>{}} onEase={()=>{}}/>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>${css}</style><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const probe = `(async()=>{const e=document.querySelector('.camera3d-ruler'),r=e.getBoundingClientRect(),s=getComputedStyle(e),p=document.querySelector('.camera3d-playhead-overlay').getBoundingClientRect(),scroll=document.querySelector('.camera3d-timeline-scroll');return{left:r.left+parseFloat(s.paddingLeft),top:r.top+10,width:document.querySelector('.camera3d-shot-block:last-of-type').getBoundingClientRect().right-(r.left+parseFloat(s.paddingLeft))+scroll.scrollLeft,frame:Number(e.getAttribute('aria-valuenow')),playhead:p.left,scrollLeft:scroll.scrollLeft}})()`
  const readProbe = JSON.stringify(probe)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1100,height:650,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,250));const get=()=>w.webContents.executeJavaScript(${readProbe});const g=await get();const samples=[];for(const f of [0,.25,.5,.99]){const x=g.left+g.width*f;w.webContents.sendInputEvent({type:'mouseDown',x,y:g.top,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,30));samples.push({fraction:f,x,...await get()})}await w.webContents.executeJavaScript("document.querySelector('.camera3d-timeline-scroll').scrollLeft=100");await new Promise(r=>setTimeout(r,30));const sc=await get();const x=sc.left+sc.width*.5;w.webContents.sendInputEvent({type:'mouseDown',x,y:sc.top,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,30));const afterScroll=await get();console.log('NATIVE_SEEK_RESULT:'+JSON.stringify({initial:g,samples,scrolledBefore:sc,afterScroll}));w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('NATIVE_SEEK_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('NATIVE_SEEK_RESULT:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('Camera timeline native Electron seek', () => {
  it('maps native window mouse input from the painted lane, including scroll, to frame and playhead', () => {
    const result = runNativeSeek()
    console.log(`NATIVE_SEEK_COORDINATES:${JSON.stringify(result)}`)
    expect(result.samples.map((s: { frame: number }) => s.frame)).toEqual([0, 24, 48, 95])
    for (const sample of result.samples) expect(sample.playhead).toBeCloseTo(sample.left + sample.frame * 4, 0)
    expect(result.afterScroll.frame).toBeGreaterThan(0)
    expect(result.afterScroll.playhead).toBeCloseTo(result.afterScroll.left + result.afterScroll.frame * 4 - result.afterScroll.scrollLeft, 0)
  }, 60000)
})
