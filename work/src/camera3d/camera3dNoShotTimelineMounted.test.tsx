import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

it('keeps the timeline workspace mounted and usable when there are no Shots', () => {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-no-shot-timeline-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  writeFileSync(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{CameraShotTimeline}from${JSON.stringify(component)};import{createCameraDocument}from${JSON.stringify(model)};createRoot(document.getElementById('root')).render(<CameraShotTimeline document={createCameraDocument('no-shot')} frame={0} selectedShotId="" expanded={false} showKeyframes={false} onFrame={()=>{}} onShot={()=>{}} onToggleExpanded={()=>{}} onToggleKeyframes={()=>{}} onReorder={()=>{}} onResizeShot={()=>{}} onEase={()=>{}} onTool={()=>{}} onEditTool={()=>{}} />);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:900,height:600,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,300));const result=await w.webContents.executeJavaScript(${JSON.stringify(`({timeline:Boolean(document.querySelector('.camera3d-timeline')),transport:Boolean(document.querySelector('[aria-label="Sequence transport"]')),shotCount:document.querySelectorAll('.camera3d-shot-block').length})`)});console.log('NO_SHOT_TIMELINE:'+JSON.stringify(result));w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 50000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('NO_SHOT_TIMELINE:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('NO_SHOT_TIMELINE:'.length))
    expect(result.timeline).toBe(true)
    expect(result.transport).toBe(true)
    expect(result.shotCount).toBe(0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}, 60000)
