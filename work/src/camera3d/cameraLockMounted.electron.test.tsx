import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runLockedCameraInspector() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-lock-mounted-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraOpticsInspector,CameraTransformInspector}from${JSON.stringify(component)};import{addEntity,createCameraDocument,setCameraAimMode,toggleEntityLockScope}from${JSON.stringify(model)};const seeded=addEntity(addEntity(createCameraDocument('camera-lock-mounted'),'camera','Camera'),'human','Human');const seededCamera=seeded.entities.find(e=>e.kind==='camera');const initial={...seeded,entities:seeded.entities.map(e=>e.id===seededCamera.id?setCameraAimMode(e,'object',seeded.entities):e)};function App(){const[d,setD]=useState(initial);const camera=d.entities.find(e=>e.kind==='camera');const shot=d.shots[0];window.__state=()=>JSON.stringify(d);const toggle=()=>setD(toggleEntityLockScope(d,camera.id,'all'));return <main><CameraTransformInspector entity={camera} frame={0} disabled={false} onDraft={next=>setD({...d,entities:d.entities.map(e=>e.id===camera.id?{...e,transform:next}:e)})} onCommit={next=>setD({...d,entities:d.entities.map(e=>e.id===camera.id?{...e,transform:next}:e)})} onKeyframe={()=>setD({...d})} onReset={()=>setD({...d})} onResetTransform={()=>setD({...d})} onTransformLock={toggle}/><CameraOpticsInspector entity={camera} entities={d.entities} disabled={false} durationSeconds={2} fps={24} shotBoundary={shot.boundary} onBoundaryChange={boundary=>setD({...d,shots:d.shots.map(s=>s.id===shot.id?{...s,boundary}:s)})} onDurationFrames={()=>setD({...d})} onChange={next=>setD({...d,entities:d.entities.map(e=>e.id===next.id?next:e)})} onSectionKeyframe={()=>setD({...d})} onMasterReset={()=>setD({...d})} onSettingsLock={toggle}/></main>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const probe = `(async()=>{const wait=()=>new Promise(requestAnimationFrame);const lock=document.querySelector('[aria-label="Lock Transform"]');lock.click();document.querySelector('[aria-label="Lock Camera Settings"]')?.click();await wait();const lockedState=window.__state();const all=[...document.querySelectorAll('button,input,[role="combobox"]')].filter(e=>!['Lock All','Lock Transform','Unlock Camera Settings','Unlock Transform'].includes(String(e.getAttribute('aria-label')||'')));const names=all.map(e=>e.getAttribute('aria-label')).filter(Boolean);const disabled=all.filter(e=>e instanceof HTMLButtonElement||e instanceof HTMLInputElement||e.getAttribute('role')==='combobox').every(e=>e.hasAttribute('disabled')||e.getAttribute('aria-disabled')==='true');for(const e of all)e.click();await wait();const attemptedState=window.__state();document.querySelector('[aria-label="Unlock Camera Settings"]').click();await wait();const restored=[...document.querySelectorAll('button,input,[role="combobox"]')].filter(e=>!['Lock All','Lock Transform','Unlock Camera Settings','Unlock Transform'].includes(e.getAttribute('aria-label')||'')).some(e=>!e.hasAttribute('disabled')&&e.getAttribute('aria-disabled')!=='true');const headings=[...document.querySelectorAll('.camera3d-section-heading button,.camera3d-transform-header button')].map(e=>e.getAttribute('aria-label'));return{names,disabled,unchanged:lockedState===attemptedState,restored,headings}})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1000,height:900,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,400));console.log('CAMERA_LOCK_RESULT:'+JSON.stringify(await w.webContents.executeJavaScript(${JSON.stringify(probe)})));w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
  try { const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_LOCK_RESULT:')); expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0); expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined(); return JSON.parse(marker!.slice('CAMERA_LOCK_RESULT:'.length)) } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('mounted Camera Lock contract', () => {
  it('locks every Camera and Transform edit/action, blocks mutations, and restores after unlock', () => {
    const result = runLockedCameraInspector()
    expect(result.names).toEqual(expect.arrayContaining([
      'Reset Camera Settings','Focal Length','Keyframe Focal Length','Reset Focal Length',
      'Camera Duration (seconds)','Camera Movement','Keyframe Camera Movement','Reset Camera Movement',
      'Target','Keyframe Target','Reset Target','Continuity','Reset Transform','Reset Rotation',
      'Position X value','Position Y value','Position Z value','Keyframe Position','Reset Position','Pitch value','Yaw value','Roll value',
    ]))
    expect(result.disabled).toBe(true)
    expect(result.unchanged).toBe(true)
    expect(result.restored).toBe(true)
    expect(result.headings).toEqual(expect.arrayContaining(['Lock Camera Settings','Lock Transform']))
  }, 60000)
})
