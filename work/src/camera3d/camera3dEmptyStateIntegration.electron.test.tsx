import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

it('mounts the empty timeline workspace through CameraTesterApp and deploys through canvas Add Camera', () => {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-empty-state-integration-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const app = resolve(import.meta.dirname, '../camera-tester/CameraTesterApp.tsx')
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href

  writeFileSync(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{ReactFlowProvider}from'@xyflow/react';import{CameraTesterApp}from${JSON.stringify(app)};createRoot(document.getElementById('root')).render(<ReactFlowProvider><CameraTesterApp/></ReactFlowProvider>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'file' }, logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1400,height:900,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await w.webContents.executeJavaScript('localStorage.clear()');await new Promise(r=>setTimeout(r,500));const empty=await w.webContents.executeJavaScript(${JSON.stringify(`(()=>({timeline:Boolean(document.querySelector('.camera3d-timeline')),transport:Boolean(document.querySelector('[aria-label="Sequence transport"]')),transportButtons:document.querySelectorAll('[aria-label="Sequence transport"] button').length,shotBlocks:document.querySelectorAll('.camera3d-shot-block').length,shotRows:document.querySelectorAll('.camera3d-shot-row').length,cameraRequired:Boolean(Array.from(document.querySelectorAll('*')).find((item)=>item.textContent?.trim()==='Camera Required')),addCamera:Boolean(Array.from(document.querySelectorAll('button')).find((item)=>item.textContent?.trim()==='Add Camera')),shotSettings:Boolean(document.querySelector('.camera3d-shot-settings')),shotSettingControls:document.querySelectorAll('.camera3d-shot-settings input,.camera3d-shot-settings button,[aria-label="Shot Camera Settings"] [role="combobox"]').length,}))()`)});await w.webContents.executeJavaScript(${JSON.stringify(`Array.from(document.querySelectorAll('button')).find((item)=>item.getAttribute('aria-label')==='Add Camera')?.click()`)});await new Promise(r=>setTimeout(r,500));const deployed=await w.webContents.executeJavaScript(${JSON.stringify(`(async()=>{const clip=document.querySelector('.camera3d-shot-block');const track=document.querySelector('.camera3d-shot-track');const content=document.querySelector('.camera3d-timeline-content');const read=()=>{const clipStyle=clip?getComputedStyle(clip):null;const trackStyle=track?getComputedStyle(track):null;const contentStyle=content?getComputedStyle(content):null;return{shotBlocks:document.querySelectorAll('.camera3d-shot-block').length,shotRows:document.querySelectorAll('.camera3d-shot-row').length,cameras:document.querySelectorAll('[data-entity-kind="camera"]').length,shotSettings:Boolean(document.querySelector('.camera3d-shot-settings')),shotSettingControls:document.querySelectorAll('.camera3d-shot-settings input,.camera3d-shot-settings button,[aria-label="Shot Camera Settings"] [role="combobox"]').length,cameraInspector:Boolean(document.querySelector('.camera3d-camera-section')),humanInspector:Boolean(document.querySelector('.camera3d-transform-section')),humanTransform:Boolean(document.querySelector('.camera3d-transform-section')),humanRotation:Boolean(document.querySelector('.camera3d-rotation-section')),addCameraButtons:document.querySelectorAll('button[aria-label="Add Camera"]').length,clipOpacity:clipStyle?.opacity,clipBackground:clipStyle?.backgroundColor,trackBackground:trackStyle?.backgroundColor,trackLeft:track?.getBoundingClientRect().left,trackRight:track?track.getBoundingClientRect().right:0,contentLeft:content?.getBoundingClientRect().left,contentRight:content?.getBoundingClientRect().right,clipZ:clipStyle?.zIndex,trackZ:trackStyle?.zIndex,clipBorder:clipStyle?.borderTopColor}};const clear=read();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await new Promise(requestAnimationFrame);const cleared=read();Array.from(document.querySelectorAll('button')).find((item)=>item.getAttribute('aria-label')==='Add Human')?.click();await new Promise(requestAnimationFrame);document.querySelector('.camera3d-entity-select')?.click();await new Promise(requestAnimationFrame);const human=read();clip?.setAttribute('data-clip-color','orange');clip?.classList.add('is-active');const colorized=read();return{clear,cleared,human,colorized}})()`)});console.log('CAMERA_EMPTY_STATE_INTEGRATION:'+JSON.stringify({empty,deployed}));w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_EMPTY_STATE_INTEGRATION:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('CAMERA_EMPTY_STATE_INTEGRATION:'.length))
    expect(result.empty.timeline).toBe(true)
    expect(result.empty.transport).toBe(true)
    expect(result.empty.transportButtons).toBeGreaterThan(0)
    expect(result.empty.shotBlocks).toBe(0)
    expect(result.empty.shotRows).toBe(0)
    expect(result.empty.cameraRequired).toBe(true)
    expect(result.empty.addCamera).toBe(false)
    expect(result.empty.shotSettings).toBe(false)
    expect(result.empty.shotSettingControls).toBe(0)
    expect(result, JSON.stringify(result)).toBeDefined()
    expect(result.deployed.clear.shotBlocks).toBe(1)
    expect(result.deployed.clear.shotRows).toBe(1)
    expect(result.deployed.clear.cameras).toBe(1)
    expect(result.deployed.clear.shotSettings).toBe(false)
    expect(result.deployed.clear.cameraInspector).toBe(true)
    expect(result.deployed.cleared.shotSettings).toBe(false)
    expect(result.deployed.cleared.cameraInspector).toBe(false)
    expect(result.deployed.human.humanInspector).toBe(true)
    expect(result.deployed.human.humanTransform).toBe(true)
    expect(result.deployed.human.humanRotation).toBe(true)
    expect(result.deployed.human.cameraInspector).toBe(false)
    expect(result.deployed.human.shotSettings).toBe(false)
    expect(result.deployed.human.shotSettingControls).toBe(0)
    expect(result.deployed.cleared.shotBlocks).toBe(1)
    expect(result.deployed.clear.addCameraButtons).toBe(1)
    for (const state of [result.deployed.clear, result.deployed.colorized]) {
      expect(state.clipOpacity).toBe('1')
      expect(state.clipBackground).not.toBe('rgba(0, 0, 0, 0)')
      expect(state.trackBackground).not.toBe('rgba(0, 0, 0, 0)')
      expect(state.trackLeft).toBe(state.contentLeft)
      expect(state.trackRight).toBe(state.contentRight)
      expect(Number(state.clipZ)).toBeGreaterThan(Number(state.trackZ))
    }
    expect(result.deployed.colorized.clipBorder).toBe('rgb(165, 139, 232)')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}, 60000)
