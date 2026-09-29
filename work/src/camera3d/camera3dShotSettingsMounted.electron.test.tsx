import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runMountedShotSettings(script: string) {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-shot-settings-mounted-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href

  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraShotSettings}from${JSON.stringify(component)};import{addEntity,createCameraDocument}from${JSON.stringify(model)};const initial=addEntity(createCameraDocument('shot-settings-mounted'),'camera','Camera');function App(){const[document,setDocument]=useState(initial);const shot=document.shots[0];return <main style={{width:'300px'}}><CameraShotSettings document={document} shotId={shot.id} disabled={false} includeBoundary={false} includeShotSize={false} onChange={setDocument} onDurationFrames={()=>{}}/></main>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:900,height:700,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,500));const result=await w.webContents.executeJavaScript(${JSON.stringify(script)});console.log('CAMERA_SHOT_SETTINGS_MOUNTED:'+JSON.stringify(result));await w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 50000 })
  try {
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_SHOT_SETTINGS_MOUNTED:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('CAMERA_SHOT_SETTINGS_MOUNTED:'.length))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('3D Camera Shot Settings mounted narrow layout', () => {
  it('omits redundant boundary and Shot Size presentations while preserving Name and Duration', () => {
    const result = runMountedShotSettings(`(()=>{const section=document.querySelector('.camera3d-shot-settings');return{labels:Array.from(section?.querySelectorAll('.camera3d-adaptive-field span')||[]).map(e=>e.textContent),boundary:Boolean(section?.querySelector('[data-fluid-control-id="boundary"]')),shotSize:Boolean(section?.querySelector('[aria-label="Shot Size"]')),duration:Boolean(section?.querySelector('[aria-label="Duration (seconds)"]')),name:Boolean(section?.querySelector('input:not([aria-label])'))}})()`)
    expect(result.labels).toEqual(['Duration (s)'])
    expect(result.boundary).toBe(false)
    expect(result.shotSize).toBe(false)
    expect(result.duration).toBe(true)
    expect(result.name).toBe(true)
  }, 60000)
})
