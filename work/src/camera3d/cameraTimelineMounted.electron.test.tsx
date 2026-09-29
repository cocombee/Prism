import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runMountedTimeline() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-timeline-mounted-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  const css = readFileSync(resolve(import.meta.dirname, 'camera3d.css'), 'utf8')
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraShotTimeline}from${JSON.stringify(component)};import{addShot,createCameraDocument}from${JSON.stringify(model)};
let source=addShot(addShot(createCameraDocument('mounted-timeline')));const camera=source.entities.find(x=>x.kind==='camera');if(camera)camera.keyframes=[{id:'position-zero',frame:0,property:'position',value:[0,0,0],ease:'linear'}];source.shots[0].camera.keyframes=[{id:'target-zero',frame:0,property:'camera.target',target:{mode:'free'},ease:'linear'}];
window.counts={duplicate:0,reorder:0,resize:0,slice:0,frame:0,keyframe:0,reset:0};
function App(){const[locked,setLocked]=useState(false);return <CameraShotTimeline document={{...source,timelineEditLocked:locked}} frame={0} selectedEntityId={camera?.id} selectedShotId={source.shots[0].id} expanded={true} showKeyframes={true} timelineLocked={locked} onToggleTimelineLock={()=>setLocked(v=>!v)} onFrame={()=>window.counts.frame++} onShot={()=>{}} onToggleExpanded={()=>{}} onToggleKeyframes={()=>{}} onReorder={()=>window.counts.reorder++} onResizeShot={()=>window.counts.resize++} onEase={()=>{}} onTool={()=>{}} onEditTool={()=>{}} onSliceShot={()=>window.counts.slice++} onDuplicateShot={()=>window.counts.duplicate++} onTimelinePropertyKeyframe={()=>window.counts.keyframe++} onTimelinePropertyReset={()=>window.counts.reset++}/>};createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>${css}</style><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const script = `(async()=>{const wait=()=>new Promise(r=>setTimeout(r,80));await wait();const shot=document.querySelector('.camera3d-shot-block');const track=document.querySelector('.camera3d-shot-track');const resize=document.querySelector('[aria-label^="Resize Shot"]');const lock=document.querySelector('[aria-label="Lock Timeline"]');
const drag=async()=>{shot.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,altKey:true}));await wait();track.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true}));await wait()};await drag();lock.click();await wait();await drag();shot.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,altKey:true,key:'ArrowDown'}));resize.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'ArrowRight'}));document.querySelector('.camera3d-ruler').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:300}));await wait();const lockedDisabled=[...document.querySelectorAll('.camera3d-property-label button')].every(x=>x.disabled);document.querySelector('[aria-label="Unlock Timeline"]').click();await wait();shot.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,altKey:true,key:'ArrowDown'}));resize.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'ArrowRight'}));await wait();const divider=document.querySelector('.camera3d-property-label').getBoundingClientRect().right;const rulerZero=document.querySelector('.camera3d-ruler-scale>span').getBoundingClientRect().left;const shotZero=shot.getBoundingClientRect().left;const key=document.querySelector('.camera3d-property-tracks button[aria-label$="keyframe 0"]');const keyX=key?.getBoundingClientRect().left??-1;const playhead=document.querySelector('.camera3d-playhead-overlay').getBoundingClientRect().left;return{counts:window.counts,lockedDisabled,divider,rulerZero,shotZero,keyX,keyOwner:key?.className||'',playhead,keyRightOfDivider:keyX>=divider-1};})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:900,height:650,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});const result=await w.webContents.executeJavaScript(${JSON.stringify(script)});console.log('TIMELINE_RESULT:'+JSON.stringify(result));w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('TIMELINE_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('TIMELINE_RESULT:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('mounted Camera timeline edit lock, Option duplication, and time-zero anatomy', () => {
  it('duplicates once unlocked, blocks every exercised mutation while locked, restores after unlock, and keeps time zero right of the divider', () => {
    const result = runMountedTimeline()
    expect(result.counts.duplicate).toBe(1)
    expect(result.counts.reorder).toBe(1)
    expect(result.counts.resize).toBe(1)
    expect(result.counts.frame).toBeGreaterThan(0)
    expect(result.lockedDisabled).toBe(true)
    expect(Math.abs(result.rulerZero - result.divider)).toBeLessThanOrEqual(2)
    expect(Math.abs(result.shotZero - result.divider)).toBeLessThanOrEqual(2)
    expect(Math.abs(result.playhead - result.divider)).toBeLessThanOrEqual(2)
    expect(result.keyRightOfDivider, JSON.stringify(result)).toBe(true)
    expect(result.keyOwner).toContain('camera3d-keyframe-button')
  }, 60000)

  it('seeks from the painted time-lane boundary and ignores the fixed parameter column', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-camera-timeline-seek-red-'))
    const entry = join(directory, 'entry.tsx'), bundle = join(directory, 'renderer.js'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
    const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
    const model = resolve(import.meta.dirname, 'model.ts')
    const css = readFileSync(resolve(import.meta.dirname, 'camera3d.css'), 'utf8')
    writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraShotTimeline}from${JSON.stringify(component)};import{addShot,createCameraDocument}from${JSON.stringify(model)};const source=addShot(addShot(createCameraDocument('timeline-seek-red')));function App(){const[frame,setFrame]=useState(0);return <CameraShotTimeline document={source} frame={frame} selectedShotId={source.shots[0].id} expanded={true} showKeyframes={false} onFrame={setFrame} onShot={()=>{}} onToggleExpanded={()=>{}} onToggleKeyframes={()=>{}} onReorder={()=>{}} onResizeShot={()=>{}} onEase={()=>{}}/>}createRoot(document.getElementById('root')).render(<App/>);`)
    buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
    writeFileSync(html, `<style>${css}</style><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
    const probe = `(async()=>{await new Promise(r=>setTimeout(r,80));const ruler=document.querySelector('.camera3d-ruler');const rect=ruler.getBoundingClientRect();const style=getComputedStyle(ruler);const laneLeft=rect.left+parseFloat(style.paddingLeft);const laneWidth=document.querySelector('.camera3d-shot-block:last-of-type').getBoundingClientRect().right-laneLeft;const sample=(fraction)=>{ruler.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:laneLeft+laneWidth*fraction,clientY:rect.top+10,button:0,pointerId:1}));return new Promise(r=>requestAnimationFrame(r))};const frames=[];for(const fraction of [0,.25,.5,.99]){await sample(fraction);frames.push(Number(ruler.getAttribute('aria-valuenow')))}ruler.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:rect.left+2,clientY:rect.top+10,button:0,pointerId:2}));await new Promise(requestAnimationFrame);return{frames,laneLeft,rectLeft:rect.left,laneWidth,scrollWidth:ruler.scrollWidth,clientWidth:ruler.clientWidth,playhead:document.querySelector('.camera3d-playhead-overlay').getBoundingClientRect().left,parameterWidth:parseFloat(style.paddingLeft)}})()`
    writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1100,height:650,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});const result=await w.webContents.executeJavaScript(${JSON.stringify(probe)});console.log('TIMELINE_SEEK_RESULT:'+JSON.stringify(result));w.close();app.quit()})`)
    try {
      const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
      const marker = run.stdout.split('\n').find((line) => line.startsWith('TIMELINE_SEEK_RESULT:'))
      expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
      expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
      const result = JSON.parse(marker!.slice('TIMELINE_SEEK_RESULT:'.length))
      console.log(`TIMELINE_SEEK_SAMPLES:${JSON.stringify(result)}`)
      expect(result.frames, JSON.stringify(result)).toEqual([0, 24, 48, 95])
      expect(result.playhead).toBeCloseTo(result.laneLeft + 95 * 4, 0)
      expect(result.parameterWidth).toBeGreaterThan(0)
    } finally { rmSync(directory, { recursive: true, force: true }) }
  }, 60000)
})
