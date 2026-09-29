import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'
import { addEntity, createCameraDocument, deployCameraShot, type CameraDocument } from './model'

type ProbeResult = {
  leftClick: { selected: string[]; position: string; viewer: string; saves: number }
  leftDrag: { position: string; viewer: string; saves: number; preview: number }
  blankLeftDrag: { viewerBefore: string; viewerAfter: string; saves: number }
  blankLeftClick: { selected: string[] }
  middleDrag: { positionBefore: string; positionAfter: string; viewerBefore: string; viewerAfter: string; savesBefore: number; savesAfter: number; previews: number }
  middleBlankDrag: { before: string; after: string }
  rightClick: { menu: string | null }
  wheel: { before: string; after: string }
}

function runMountedProbe(): ProbeResult {
  const directory = mkdtempSync(join(tmpdir(), 'prism-v18-direct-pointer-remap-'))
  const entry = join(directory, 'entry.tsx'); const bundle = join(directory, 'renderer.js'); const html = join(directory, 'index.html'); const main = join(directory, 'main.cjs')
  const app = resolve(import.meta.dirname, '../camera-tester/CameraTesterApp.tsx')
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  let fixture: CameraDocument = addEntity(createCameraDocument('v18-mounted'), 'camera', 'Camera')
  fixture = addEntity(fixture, 'human', 'Human')
  fixture = addEntity(fixture, 'block', 'Block')
  fixture = { ...fixture, entities: fixture.entities.map((entity) => entity.name === 'Human' ? { ...entity, transform: { ...entity.transform, position: [-1, 1, 0] } } : entity.name === 'Block' ? { ...entity, transform: { ...entity.transform, position: [1, .5, 0] } } : entity) }
  fixture = deployCameraShot(fixture, [0, 0, 0])
  const fixtureJson = JSON.stringify(fixture)
  writeFileSync(entry, `import React from 'react';import*as THREE from'three';import{createRoot}from'react-dom/client';import{CameraTesterApp}from${JSON.stringify(app)};const probeCamera=new THREE.PerspectiveCamera(42,1400/900,.1,500);probeCamera.position.set(9,7,12);probeCamera.lookAt(0,1,0);probeCamera.updateMatrixWorld(true);window.__ndc=(x,y,z,w=1400,h=900)=>{probeCamera.aspect=w/h;probeCamera.updateProjectionMatrix();const p=new THREE.Vector3(x,y,z).project(probeCamera);return{x:p.x,y:p.y}};window.__trace={saves:[],previews:[]};Object.defineProperty(window,'cameraTester',{configurable:true,writable:true,value:{loadNodeState:async()=>({document:${fixtureJson}}),saveNodeState:async(_id,state)=>window.__trace.saves.push(state),mediaUrl:async()=>({ok:false,reason:'not used'}),revealMedia:async()=>false,deleteMedia:async()=>false,startRender:async()=>({jobId:'unused',total:0}),writeRenderFrame:async()=>({}),finishRender:async()=>({}),cancelRender:async()=>{},objectAssistantStatus:async()=>({connected:false,vision:false}),createObjectRecipe:async()=>null}});createRoot(document.getElementById('root')).render(<React.StrictMode><CameraTesterApp/></React.StrictMode>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'file' }, logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const probe = `(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));const frame=()=>new Promise(requestAnimationFrame);await wait(900);
    const canvas=document.querySelector('.camera3d-stage canvas');if(!canvas)throw Error('canvas missing');canvas.setPointerCapture=()=>{};canvas.releasePointerCapture=()=>{};canvas.hasPointerCapture=()=>false;
    const trace=()=>window.__trace;const selected=()=>[...document.querySelectorAll('.camera3d-entity-row[aria-selected="true"]')].map(e=>e.textContent.trim());const viewer=()=>{const p=document.querySelector('[data-viewer-position]'),t=document.querySelector('[data-viewer-target]');return (p?.getAttribute('data-viewer-position')||'')+'|'+(t?.getAttribute('data-viewer-target')||'')};const position=()=>{const row=[...document.querySelectorAll('.camera3d-entity-row')].find(e=>e.textContent.includes('Human'));return row?.getAttribute('data-transform-position')||trace().saves.at(-1)?.document?.entities?.find(e=>e.name==='Human')?.transform.position.join(',')||''};const changedTransformSaves=()=>trace().saves.filter(s=>s.document?.entities?.find(e=>e.name==='Human')?.transform.position.join(',')!=='-1,1,0').length;
    const rect=canvas.getBoundingClientRect();const point=(x,y)=>({clientX:rect.left+rect.width*(x+1)/2,clientY:rect.top+rect.height*(1-y)/2});const fire=(type,pt,button,buttons=button===0?1:button===1?4:2,extra={})=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'mouse',button,buttons,...pt,...extra}));
    const project=async(id)=>{const marker=JSON.parse(${JSON.stringify(fixtureJson)}).entities.find(e=>e.id===id);const p=window.__threeProject?.(marker);return p};
    const fallbackPoint=(name)=>name==='Human'?point(-.12,.12):name==='Block'?point(.12,.12):point(0,0);const human=JSON.parse(${JSON.stringify(fixtureJson)}).entities.find(e=>e.name==='Human');
    const hpNdc=window.__ndc(-1,1,0,rect.width,rect.height);const hp=point(hpNdc.x,hpNdc.y), blank=point(.82,.82);const beforeViewer=viewer();const beforeSaves=changedTransformSaves();fire('pointerdown',hp,0);fire('pointerup',hp,0);await wait(120);const leftClick={selected:selected(),position:position(),viewer:viewer(),saves:changedTransformSaves()-beforeSaves};
    const dragEnd={clientX:hp.clientX+28,clientY:hp.clientY+18};const leftDragSaves=changedTransformSaves();fire('pointerdown',hp,0);fire('pointermove',dragEnd,0);await frame();fire('pointerup',dragEnd,0);await wait(120);const leftDrag={position:position(),viewer:viewer(),saves:changedTransformSaves()-leftDragSaves,preview:trace().previews.length};
    const blankBefore=viewer();fire('pointerdown',blank,0);fire('pointermove',{clientX:blank.clientX+35,clientY:blank.clientY+20},0);await frame();fire('pointerup',{clientX:blank.clientX+35,clientY:blank.clientY+20},0);await wait(120);const blankLeftDrag={viewerBefore:blankBefore,viewerAfter:viewer(),saves:changedTransformSaves()};
    fire('pointerdown',blank,0);fire('pointerup',blank,0);await wait(120);const blankLeftClick={selected:selected()};
    fire('pointerdown',hp,0);fire('pointerup',hp,0);await wait(80);const middleBefore=position();const middleSaves=changedTransformSaves();fire('pointerdown',hp,1,4);fire('pointermove',{clientX:hp.clientX+28,clientY:hp.clientY+18},1,4);await frame();const middlePreviewPosition=position();fire('pointerup',{clientX:hp.clientX+28,clientY:hp.clientY+18},1,4);await wait(120);const middleDrag={positionBefore:middleBefore,positionAfter:position(),viewerBefore:beforeViewer,viewerAfter:viewer(),savesBefore:middleSaves,savesAfter:changedTransformSaves(),previews:trace().previews.length};
    const middleBlankBefore=viewer();fire('pointerdown',blank,1,4);fire('pointermove',{clientX:blank.clientX+35,clientY:blank.clientY+20},1,4);await frame();fire('pointerup',{clientX:blank.clientX+35,clientY:blank.clientY+20},1,4);await wait(120);const middleBlankDrag={before:middleBlankBefore,after:viewer()};
    fire('pointerdown',hp,2,2);fire('pointerup',hp,2,0);canvas.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:hp.clientX,clientY:hp.clientY}));await wait(80);const rightClick={menu:document.querySelector('.canvas-context-menu')?.textContent?.trim()||null};canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:120,deltaMode:0}));await wait(250);const wheel={before:middleBlankDrag.after,after:viewer()};
    return{leftClick,leftDrag,blankLeftDrag,blankLeftClick,middleDrag,middleBlankDrag,rightClick,wheel,canvasRect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},hp};
  })()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1400,height:900,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false,backgroundThrottling:false}});await w.loadFile(${JSON.stringify(html)});try{console.log('V18_RESULT:'+JSON.stringify(await w.webContents.executeJavaScript(${JSON.stringify(probe)})))}catch(e){console.log('V18_ERROR:'+String(e&&e.stack||e));process.exitCode=1}w.close();app.quit()})`)
  try { const run=spawnSync(electronPath as unknown as string,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:120000});const marker=run.stdout.split('\n').find(line=>line.startsWith('V18_RESULT:'));expect(run.status,`${run.stdout}\n${run.stderr}`).toBe(0);expect(marker,`${run.stdout}\n${run.stderr}`).toBeDefined();return JSON.parse(marker!.slice('V18_RESULT:'.length)) as ProbeResult } finally { rmSync(directory,{recursive:true,force:true}) }
}

describe('V18 mounted direct pointer remap',()=>{it('proves left selection-only, middle ordinary drag, and neighboring pointer contracts',()=>{const result=runMountedProbe();process.stdout.write('V18_EXACT_RESULT:'+JSON.stringify(result)+'\\n');expect(result.leftClick.selected.some(value=>value.includes('Human'))).toBe(true);expect(result.leftClick.saves).toBe(0);expect(result.leftDrag.position).toBe(result.leftClick.position);expect(result.leftDrag.viewer).toBe(result.leftClick.viewer);expect(result.leftDrag.saves).toBe(0);expect(result.blankLeftDrag.saves).toBe(0);expect(result.blankLeftDrag.viewerAfter).toBe(result.blankLeftDrag.viewerBefore);expect(result.blankLeftClick.selected).toEqual([]);expect(result.middleDrag.positionAfter).not.toBe(result.middleDrag.positionBefore);expect(result.middleDrag.viewerAfter).toBe(result.middleDrag.viewerBefore);expect(result.middleDrag.savesAfter-result.middleDrag.savesBefore).toBe(1);expect(result.middleBlankDrag.after).not.toBe(result.middleBlankDrag.before);expect(result.rightClick.menu).toContain('HUMAN');expect(result.wheel.after).not.toBe(result.wheel.before)},60000)})
