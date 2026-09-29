import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runRotationProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-rotation-mounted-'))
  const entry = join(directory, 'entry.tsx'); const bundle = join(directory, 'renderer.js'); const html = join(directory, 'index.html'); const main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx'); const model = resolve(import.meta.dirname, 'model.ts')
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraTransformInspector,CameraOpticsInspector}from${JSON.stringify(component)};import{addEntity,createCameraDocument}from${JSON.stringify(model)};const seeded=addEntity(addEntity(createCameraDocument('rotation-mounted'),'camera','Camera'),'human','Human');function App(){const[d,setD]=useState(seeded);const camera=d.entities.find(e=>e.kind==='camera');return <main style={{width:'339px',marginLeft:'600px'}}><div data-inspector-root>{camera&&<><CameraTransformInspector entity={camera} frame={0} disabled={false} onDraft={()=>{}} onCommit={next=>setD({...d,entities:d.entities.map(e=>e.id===next.id?next:e)})} onKeyframe={()=>{}} onReset={()=>{}} onResetTransform={()=>{}} onTransformLock={()=>{}} onRotationLock={()=>{}}/><CameraOpticsInspector entity={camera} entities={d.entities} disabled={false} durationSeconds={2} fps={24} shotBoundary='continue' onBoundaryChange={()=>{}} onDurationFrames={()=>{}} onChange={next=>setD({...d,entities:d.entities.map(e=>e.id===next.id?next:e)})} onSectionKeyframe={()=>{}} onMasterReset={()=>{}} onSettingsLock={()=>{}}/></>}</div></main>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const probe = `(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom,height:r.height}};const q=s=>document.querySelector(s);const input=n=>q('[aria-label="'+n+' value"]');const row=n=>n==='Focal Length'?q('[aria-label="Focal Length"]')?.closest('.camera3d-keyframe-control'):input(n)?.closest('.camera3d-rotation-property,.camera3d-axis-row');const headingPair=h=>{const lock=h?.querySelector('.camera3d-location-lock-button svg'),reset=h?.querySelector('.camera3d-property-reset svg');const lockButton=h?.querySelector('.camera3d-location-lock-button'),resetButton=h?.querySelector('.camera3d-property-reset');return{lock:rect(lock),reset:rect(reset),spacing:lock&&reset?reset.getBoundingClientRect().left-lock.getBoundingClientRect().right:null,rail:rect(h),buttonRail:{lock:rect(lockButton),reset:rect(resetButton)}}};const headings=[q('.camera3d-transform-section>.camera3d-transform-header'),q('.camera3d-rotation-section>.camera3d-transform-header'),q('.camera3d-camera-section>.camera3d-section-heading')];const positionX=input('Position X'),positionY=input('Position Y'),positionZ=input('Position Z');const anchorZ=input('Anchor Point Z');const rowPair=n=>{const e=row(n),lock=e?.querySelector('.camera3d-location-lock-button'),reset=e?.querySelector('.camera3d-property-reset');return{lock:rect(lock?.querySelector('svg')),reset:rect(reset?.querySelector('svg')),spacing:lock&&reset?reset.getBoundingClientRect().left-lock.getBoundingClientRect().right:null,wrapper:rect(reset)}};const rotationDivider=q('.camera3d-rotation-section>.camera3d-transform-divider');const cameraDivider=q('.camera3d-camera-section>.camera3d-camera-pre-divider');const sliders=['Pitch','Yaw','Roll'].map(n=>q('[aria-label="'+n+' slider"]'));return{position:{x:rect(positionX),y:rect(positionY),z:rect(positionZ),top:rect(positionX)?.top},rotation:sliders.map((slider)=>{const r=slider.closest('.camera3d-rotation-property');return{slider:rect(slider),numeric:rect(r.querySelector('input[type="text"]')),row:rect(r),scrub:{overflow:getComputedStyle(slider).overflow,scrollWidth:slider.scrollWidth,clientWidth:slider.clientWidth}}}),anchorZ:rect(anchorZ),rotationDivider:rect(rotationDivider),cameraDivider:rect(cameraDivider),headings:headings.map(headingPair),rows:{position:rowPair('Position X'),pitch:rowPair('Pitch'),focal:rowPair('Focal Length')}}})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1200,height:1100,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});const measured=await w.webContents.executeJavaScript(${JSON.stringify(probe)});console.log('ROTATION_MOUNTED:'+JSON.stringify(measured));w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
  try { const marker = run.stdout.split('\n').find((line) => line.startsWith('ROTATION_MOUNTED:')); expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0); expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined(); return JSON.parse(marker!.slice('ROTATION_MOUNTED:'.length)) } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('mounted Camera Rotation exact painted parity', () => {
  it('uses standard rows, restored slider starts, shared divider rhythm, and painted heading rail', () => {
    const measured = runRotationProbe(); const near = (a: number, b: number, name: string) => expect(Math.abs(a - b), `${name}: ${a} vs ${b}`).toBeLessThanOrEqual(.5)
    expect(measured.position.x.left).toBeGreaterThan(500)
    for (const [index, row] of measured.rotation.entries()) {
      near(row.row.height, 28, `row ${index} height`)
      near(row.numeric.left, measured.position.z.left, `row ${index} numeric left`); near(row.numeric.right, measured.position.z.right, `row ${index} numeric right`); near(row.numeric.width, measured.position.z.width, `row ${index} numeric width`)
      near(row.slider.left, measured.position.x.left, `row ${index} slider left`); near(row.slider.right, measured.position.y.right, `row ${index} slider right`)
      expect(row.scrub.overflow).toBe('hidden'); expect(row.scrub.scrollWidth).toBeLessThanOrEqual(row.scrub.clientWidth + 1)
      if (index > 0) near(row.numeric.top - measured.rotation[index - 1].numeric.top, 37, `row ${index} value top delta`)
    }
    near(measured.cameraDivider.top - measured.rotation[2].row.bottom, measured.rotationDivider.top - measured.anchorZ.bottom, 'shared divider top rhythm')
    near(measured.headings[2].rail.top - measured.cameraDivider.bottom, measured.headings[1].rail.top - measured.rotationDivider.bottom, 'shared divider to heading rhythm')
    near(measured.position.top, measured.headings[0].rail.bottom, 'Position top equals Transform heading bottom')
    near(measured.rotation[0].row.top, measured.headings[1].rail.bottom, 'Pitch top equals Rotation heading bottom')
    near(measured.headings[0].rail.right, measured.rows.position.wrapper.right, 'Transform heading rail right equals Position reset wrapper right')
    near(measured.headings[1].rail.right, measured.rows.pitch.wrapper.right, 'Rotation heading rail right equals Pitch reset wrapper right')
    near(measured.headings[2].rail.right, measured.rows.focal.wrapper.right, 'Camera heading rail right equals Focal reset wrapper right')
    for (const [index, pair] of measured.headings.entries()) {
      const row = [measured.rows.position, measured.rows.pitch, measured.rows.focal][index]
      near(pair.lock.right, measured.headings[1].lock.right, `heading ${index} painted lock right`)
      near(pair.reset.right, row.reset.right, `heading ${index} painted reset right`)
      near(pair.spacing, measured.headings[1].spacing, `heading ${index} painted lock/reset spacing`)
    }
  }, 60000)
})
