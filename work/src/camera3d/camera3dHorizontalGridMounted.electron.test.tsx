import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runHorizontalLedgerProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-horizontal-ledger-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraTransformInspector,CameraOpticsInspector}from${JSON.stringify(component)};import{addEntity,createCameraDocument}from${JSON.stringify(model)};const seeded=addEntity(addEntity(createCameraDocument('horizontal-ledger'),'camera','Camera'),'block','Block');function App(){const[d,setD]=useState(seeded);const camera=d.entities.find(e=>e.kind==='camera');return <main style={{width:331}}><div data-ledger-root>{camera&&<><CameraTransformInspector entity={camera} frame={0} disabled={false} onDraft={()=>{}} onCommit={next=>setD({...d,entities:d.entities.map(e=>e.id===next.id?next:e)})} onKeyframe={()=>{}} onReset={()=>{}} onResetTransform={()=>{}} onTransformLock={()=>{}} onRotationLock={()=>{}}/><CameraOpticsInspector entity={camera} entities={d.entities} disabled={false} durationSeconds={2} fps={24} shotBoundary='continue' onBoundaryChange={()=>{}} onDurationFrames={()=>{}} onChange={next=>setD({...d,entities:d.entities.map(e=>e.id===next.id?next:e)})} onSectionKeyframe={()=>{}} onMasterReset={()=>{}} onSettingsLock={()=>{}}/></>}</div></main>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const probe = `(async()=>{const root=document.querySelector('[data-ledger-root]');const rel=e=>{if(!e)return null;const r=e.getBoundingClientRect(),p=root.getBoundingClientRect();return{left:(r.left-p.left)/p.width,right:(r.right-p.left)/p.width,top:r.top-p.top,bottom:r.bottom-p.top,width:r.width,height:r.height}};const textRange=(e,text)=>{if(!e)return null;const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const i=n.nodeValue?.indexOf(text);if(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+text.length);return rel(r)}}return null};const all=[...document.querySelectorAll('*')];const byText=(text)=>{const e=all.find(x=>[...x.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue?.includes(text)));return textRange(e,text)};const q=s=>document.querySelector(s);const row=(label)=>{const e=all.find(x=>x.children.length===0&&x.textContent?.trim()===label);return e?.closest('.camera3d-axis-row,.camera3d-rotation-property,.camera3d-keyframe-control')};const position=q('.camera3d-transform-grid .camera3d-axis-row');const rotation=q('.camera3d-rotation-property');const continuity=q('[aria-label="Continuity"]')?.closest('.camera3d-keyframe-control');const fov=[...document.querySelectorAll('.camera3d-lens-readouts>label')];const dividers=[...document.querySelectorAll('.camera3d-transform-divider,.camera3d-camera-pre-divider')];const cameraRect=(name)=>{const r=row(name);return{text:byText(name),selector:rel(r?.querySelector('.storyboard-compact-select')),actions:rel(r?.querySelector('.camera3d-camera-action-row'))}};const headings=['Transform','Rotation','Camera'].map(byText);const labels=['Position','Anchor Point','Pitch','Yaw','Roll','Focal Length','Duration','Movement','Target','Horizontal FOV'].map(byText);return{content:root.getBoundingClientRect().width,headings,labels,position:{text:byText('Position'),axis:rel(position?.querySelector('.camera3d-axis-fields')),controls:[...position.querySelectorAll('input')].map(rel),actions:rel(position?.querySelector('.camera3d-camera-action-row'))},anchor:{text:byText('Anchor Point'),axis:rel(row('Anchor Point')?.querySelector('.camera3d-axis-fields')),controls:[...row('Anchor Point').querySelectorAll('input')].map(rel)},rotation:{labels:['Pitch','Yaw','Roll'].map(byText),slider:rel(rotation?.querySelector('.camera3d-scrub-wheel')),value:rel(rotation?.querySelector('input[type="text"]')),actions:rel(rotation?.querySelector('.camera3d-camera-action-row'))},camera:['Focal Length','Movement','Target'].map(cameraRect),duration:{label:byText('Duration'),input:rel(q('[aria-label="Camera Duration (seconds)"]'))},continuity:{label:byText('Continuity'),select:rel(continuity?.querySelector('.storyboard-compact-select')),text:continuity?.querySelector('.storyboard-compact-select')?.textContent?.trim()},fov:fov.map(e=>({label:textRange(e,e.textContent?.includes('Horizontal')?'Horizontal':'Vertical'),value:[...e.querySelectorAll('output')].map(rel)})),dividers:dividers.map(rel),heights:[...document.querySelectorAll('input,button,.storyboard-compact-select')].map(rel)}})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:700,height:1100,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,300));console.log('HORIZONTAL_LEDGER:'+JSON.stringify(await w.webContents.executeJavaScript(${JSON.stringify(probe)})));w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 50000 })
  try {
    const marker = run.stdout.split('\n').find((line) => line.startsWith('HORIZONTAL_LEDGER:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('HORIZONTAL_LEDGER:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('mounted Prism 3D Camera left-edge ledger', () => {
  it('matches every named painted label to Position while preserving label presence', () => {
    const result = runHorizontalLedgerProbe()

    const near = (actual: number, expected: number, name: string, tolerance = .002) => expect(Math.abs(actual - expected), name).toBeLessThanOrEqual(tolerance)
    expect(result.headings.every((x: any) => x), 'all three heading painted ranges queried').toBe(true)
    expect(result.labels.every((x: any) => x), 'every named row label painted range queried').toBe(true)
    const left = result.headings[0].left
    for (const [i,x] of result.headings.entries()) near(x.left,left,`heading ${i} left`)
    for (const [i,x] of result.labels.entries()) near(x.left,left,`row label ${i} left`)
  }, 60000)
})

