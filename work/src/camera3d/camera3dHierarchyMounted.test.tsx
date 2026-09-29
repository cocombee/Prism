import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runMountedHierarchy(script: string) {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-hierarchy-mounted-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const hierarchySource = resolve(import.meta.dirname, 'CameraSceneHierarchy.tsx')
  const modelSource = resolve(import.meta.dirname, 'model.ts')
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href

  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraSceneHierarchy}from${JSON.stringify(hierarchySource)};import{addEntity,createCameraDocument,deployCameraShot,sanitizeCameraDocument,toggleEntityLockScope}from${JSON.stringify(modelSource)};const empty=createCameraDocument('hierarchy-mounted');window.__m={entities:[],shots:[],lockIds:[],duplicateCount:0,boundaries:[],deletes:0,entityDeletes:[]};function App(){const[document,setDocument]=useState(empty);const[selectedIds,setSelectedIds]=useState([]);const[activeShotId,setActiveShotId]=useState('');const deploy=()=>{let next=sanitizeCameraDocument(deployCameraShot(document,[0,0,0]));next=sanitizeCameraDocument(addEntity(next,'human','Human with a deliberately long hierarchy label that must truncate'));const shot=next.shots.at(-1);setDocument(next);setActiveShotId(shot?.id||'');setSelectedIds(shot?.camera.activeCameraId?[shot.camera.activeCameraId]:[])};return <div id="panel" style={{width:'360px',padding:'8px'}}><button id="add-camera" type="button" onClick={deploy}>Add Camera</button><CameraSceneHierarchy document={document} activeShotId={activeShotId} selectedIds={selectedIds} expandedGroups={new Set()} onShot={id=>{window.__m.shots.push(id);const shot=document.shots.find(item=>item.id===id);setActiveShotId(id);setSelectedIds(shot?.camera.activeCameraId?[shot.camera.activeCameraId]:[])}} onBoundaryChange={(id,boundary)=>{window.__m.boundaries.push([id,boundary]);setDocument(current=>({...current,shots:current.shots.map(shot=>shot.id===id?{...shot,boundary}:shot)}))}} onEntity={id=>{window.__m.entities.push(id);setSelectedIds([id])}} onGroup={()=>{}} onToggleGroup={()=>{}} onAllLock={id=>{window.__m.lockIds.push('shot:'+id)}} onEntityAllLock={id=>{window.__m.lockIds.push(id);setDocument(current=>toggleEntityLockScope(current,id,'all'))}} onDuplicateShot={()=>{window.__m.duplicateCount+=1}} onDeleteShot={()=>{window.__m.deletes+=1}} onDeleteEntity={id=>{window.__m.entityDeletes.push(id)}}/></div>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:700,height:600,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,250));const result=await w.webContents.executeJavaScript(${JSON.stringify(script)});console.log('CAMERA_HIERARCHY_MOUNTED:'+JSON.stringify(result));await w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 50000 })
  try {
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_HIERARCHY_MOUNTED:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('CAMERA_HIERARCHY_MOUNTED:'.length))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('3D Camera hierarchy mounted authored-unit behavior', () => {
  it('preserves the installed icon-toggle hierarchy contract at narrow and wide widths', () => {
    const result = runMountedHierarchy(`(async()=>{const wait=async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)};const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};const snapshot=()=>{const panel=document.querySelector('#panel'),row=document.querySelector('.camera3d-shot-row'),actions=row?.querySelector('.camera3d-shot-actions'),human=document.querySelector('.camera3d-entity-row[data-entity-id]'),humanActions=human?.querySelector('.camera3d-entity-actions'),boundary=row?.querySelector('.camera3d-boundary-toggle');const buttons=Array.from(actions?.querySelectorAll('button')||[]),humanButtons=Array.from(humanActions?.querySelectorAll('button')||[]);return{panel:rect(panel),row:rect(row),actions:rect(actions),human:rect(human),humanActions:rect(humanActions),labels:buttons.map(b=>b.getAttribute('aria-label')),humanLabels:humanButtons.map(b=>b.getAttribute('aria-label')),buttons:buttons.map(rect),humanButtons:humanButtons.map(rect),boundaryLabel:boundary?.getAttribute('aria-label'),humanEntityId:human?.getAttribute('data-entity-id'),humanDelete:rect(human?.querySelector('[aria-label^="Delete Human"]')),cameraDelete:rect(row?.querySelector('[aria-label^="Delete Shot"]')),iconClass:boundary?.querySelector('svg')?.getAttribute('class'),pressed:boundary?.getAttribute('aria-pressed'),radio:Boolean(row?.querySelector('[role="radiogroup"]')),rowSelected:row?.getAttribute('aria-selected'),events:structuredClone(window.__m)}};const contained=s=>[s.row,s.actions,s.human,s.humanActions].every(r=>r&&r.left>=s.panel.left&&r.right<=s.panel.right);document.querySelector('#add-camera').click();await wait();const deployed=snapshot();document.querySelector('[aria-label^="Delete Human"]')?.click();await wait();const afterHumanDelete=snapshot();const narrowBefore=(document.querySelector('#panel').style.width='240px',await wait(),snapshot());const boundary=document.querySelector('.camera3d-boundary-toggle');boundary.click();await wait();const changed=snapshot();const wide=(document.querySelector('#panel').style.width='560px',await wait(),snapshot());return{deployed,afterHumanDelete,narrowBefore,changed,wide,contained:[contained(narrowBefore),contained(wide)],cameraEntityId:document.querySelector('.camera3d-shot-row')?.getAttribute('data-camera-entity-id'),linkedShotId:document.querySelector('.camera3d-shot-row')?.getAttribute('data-shot-id')}})()`)
    expect(result.deployed.radio).toBe(false)
    expect(result.deployed.labels).toEqual(['Continue boundary for Shot 01; click to switch to Cut', 'Duplicate Shot 01', 'Lock All', 'Delete Shot 01'])

    expect(result.deployed.boundaryLabel).toBe('Continue boundary for Shot 01; click to switch to Cut')
    expect(result.deployed.iconClass).toContain('lucide-link-2')
    expect(result.deployed.pressed).toBe('true')
    expect(result.deployed.buttons).toHaveLength(4)
    expect(result.deployed.buttons.every((button: { width: number }) => button.width).valueOf()).toBeTruthy()
    expect(result.narrowBefore.labels).toEqual(result.deployed.labels)
    expect(result.changed.boundaryLabel).toBe('Cut boundary for Shot 01; click to switch to Continue')
    expect(result.changed.iconClass).toContain('lucide-scissors')
    expect(result.changed.pressed).toBe('false')
    expect(result.changed.rowSelected).toBe('true')
    expect(result.changed.events.boundaries).toEqual([[result.linkedShotId, 'cut']])
    expect(result.changed.events.shots).toEqual([])
    expect(result.changed.events.entities).toEqual([])
    expect(result.deployed.humanLabels).toEqual(['Duplicate Human with a deliberately long hierarchy label that must truncate', 'Lock All', 'Delete Human with a deliberately long hierarchy label that must truncate'])
    expect(result.deployed.humanButtons.map((button: { width: number }) => button.width)).toEqual([24, 24, 24])
    expect(result.deployed.humanDelete.width).toBe(24)
    expect(result.deployed.humanDelete.right).toBe(result.deployed.cameraDelete.right)
    expect(result.afterHumanDelete.events).toMatchObject({ entities: [], lockIds: [], duplicateCount: 0 })
    expect(result.afterHumanDelete.events.entityDeletes).toEqual([result.deployed.humanEntityId])
    expect(result.deployed.labels.slice(1, 3)).toEqual(['Duplicate Shot 01', 'Lock All'])
    expect(result.contained).toEqual([true, true])
  }, 60000)
})
