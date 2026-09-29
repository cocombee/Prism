import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'
import { addEntity, createCameraDocument, deployCameraShot, setCameraAimMode } from './model'

type GestureResult = {
  samples: number[]
  before: number
  after: number
  savesBefore: number
  savesWhileHeld: number
  savesAfterRelease: number
  viewerBefore: { position: string; target: string }
  viewerDuring: { position: string; target: string }
  viewerAfter: { position: string; target: string }
  targetBefore: string
  targetAfter: string
  stoppedSample: number
  releaseOrder: string[]
}

type ProbeResult = {
  selectedRollModifierFirst: GestureResult
  selectedRollArrowFirst: GestureResult
  freePitchModifierFirst: GestureResult
  freeYawModifierFirst: GestureResult
  freePitchArrowFirst: GestureResult
  freeYawArrowFirst: GestureResult
  ctrlPitchModifierFirst: GestureResult
  ctrlYawModifierFirst: GestureResult
  ctrlPitchArrowFirst: GestureResult
  ctrlYawArrowFirst: GestureResult
  selectedPositionY: GestureResult
  targetedRoll: GestureResult
  targetedBlockedPitch: { before: number; after: number; savesBefore: number; savesAfter: number; targetBefore: string; targetAfter: string }
}

function runMountedProbe(): ProbeResult {
  const directory = mkdtempSync(join(tmpdir(), 'prism-v17-honest-mounted-'))
  const entry = join(directory, 'entry.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  const app = resolve(import.meta.dirname, '../camera-tester/CameraTesterApp.tsx')
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href

  let fixture = addEntity(createCameraDocument('v17-honest-mounted'), 'camera', 'Camera')
  fixture = addEntity(fixture, 'human', 'Human')
  fixture = addEntity(fixture, 'block', 'Block')
  const camera = fixture.entities.find((entity) => entity.kind === 'camera')!
  fixture = { ...fixture, entities: fixture.entities.map((entity) => entity.id === camera.id ? setCameraAimMode(entity, 'free', fixture.entities) : entity) }
  fixture = deployCameraShot(fixture, [0, 0, 0])
  const fixtureJson = JSON.stringify(fixture)

  writeFileSync(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{CameraTesterApp}from${JSON.stringify(app)};window.__trace={saves:[],initial:${fixtureJson}};window.cameraTester={loadNodeState:async()=>({document:${fixtureJson}}),saveNodeState:async(_id,state)=>window.__trace.saves.push(state),mediaUrl:async()=>({ok:false,reason:'not used'}),revealMedia:async()=>false,deleteMedia:async()=>false,startRender:async()=>({jobId:'unused',total:0}),writeRenderFrame:async()=>({}),finishRender:async()=>({}),cancelRender:async()=>{},objectAssistantStatus:async()=>({connected:false,vision:false}),createObjectRecipe:async()=>null};createRoot(document.getElementById('root')).render(<React.StrictMode><CameraTesterApp/></React.StrictMode>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'file' }, logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)

  const probe = `(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));let phase='start';
    const frame=()=>new Promise(r=>requestAnimationFrame(r));
    const finite=(value,label)=>{const n=Number(value);if(!Number.isFinite(n))throw Error('missing/NaN '+label+': '+value);return n};
    const input=label=>{const e=document.querySelector('[aria-label="'+label+'"]');if(!e)throw Error('phase='+phase+' missing '+label+' current labels='+[...document.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')).filter(Boolean).join('|'));return e};
    const value=label=>finite(input(label).value,label);
    const targetValue=()=>{const e=document.querySelector('[aria-label="Target"]');if(!e)return '';const v=e.value||e.getAttribute('aria-valuetext')||e.textContent?.trim();if(!v)throw Error('missing/empty Target value');return v};
    const viewer=()=>{const e=document.querySelector('[data-viewer-position]');const t=document.querySelector('[data-viewer-target]');if(!e||!t)throw Error('missing viewer snapshot');return{position:e.getAttribute('data-viewer-position')||'',target:t.getAttribute('data-viewer-target')||''}};
    const saves=()=>window.__trace.saves.length;
    const fire=(el,type,key,mods={})=>el.dispatchEvent(new KeyboardEvent(type,{bubbles:true,cancelable:true,key,code:key,...mods}));
    const waitFor=async(fn,label)=>{for(let i=0;i<120;i++){const result=fn();if(result)return result;await wait(25)}throw Error('timeout waiting for '+label)};
    const selectEntity=async(name)=>{if(name==='Camera'){const e=document.querySelector('.camera3d-shot-select');if(!e)throw Error('missing Camera shot selector');e.click()}else{const e=document.querySelector('[aria-label^="Select '+name+',"]');if(!e)throw Error('missing map Select '+name+' control');e.click()}await waitFor(()=>document.querySelector('[aria-label="Pitch value"]')&&[...document.querySelectorAll('.camera3d-entity-row[aria-selected="true"]')].some(e=>e.textContent?.trim().includes(name))||name==='Camera'&&document.querySelector('[aria-label="Position X value"]'),name+' Inspector');await wait(50)};
    const settle=async()=>{for(let i=0;i<2;i++)await frame()};
    const gesture=async({axis,label,key,modifier,modifierFirst=true,releaseModifierFirst=true,threshold,duration=2500})=>{
      const canvas=document.querySelector('.camera3d-stage canvas');if(!canvas)throw Error('missing camera canvas');canvas.focus();
      const before=value(label), viewerBefore=viewer(), targetBefore=targetValue(), savesBefore=saves();
      const mods=modifier==='alt'?{altKey:true}:modifier==='meta'?{metaKey:true}:modifier==='ctrl'?{ctrlKey:true}:{};
      const releaseMods=modifier==='alt'?{altKey:false}:modifier==='meta'?{metaKey:false}:modifier==='ctrl'?{ctrlKey:false}:{};
      const modifierKey=modifier==='alt'?'Alt':modifier==='meta'?'Meta':'Control';
      const order=[];
      if(modifierFirst){fire(window,'keydown',modifierKey,mods);order.push('modifier-down');fire(canvas,'keydown',key,mods);order.push('arrow-down')}else{fire(canvas,'keydown',key,{});order.push('arrow-down');fire(window,'keydown',modifierKey,mods);order.push('modifier-down')}
      const sampleTimes=[0,250,500,750,1000,1250,1500,2000,2500];const samples=[value(label)];for(const sampleTime of sampleTimes.slice(1)){await wait(sampleTime-(sampleTimes[samples.length-1]||0));await frame();samples.push(value(label))}
      const during=saves();const viewerDuring=viewer();
      if(releaseModifierFirst){fire(window,'keyup',modifierKey,releaseMods);order.push('modifier-up');fire(canvas,'keyup',key,releaseMods);order.push('arrow-up')}else{fire(canvas,'keyup',key,mods);order.push('arrow-up');fire(window,'keyup',modifierKey,releaseMods);order.push('modifier-up')}
      await wait(550);const after=value(label),viewerAfter=viewer(),targetAfter=targetValue();
      if(samples.some(n=>!Number.isFinite(n))||!Number.isFinite(before)||!Number.isFinite(after))throw Error('missing/NaN sampled '+axis);
      const distinct=[...new Set(samples)];if(distinct.length<3)throw Error(axis+' has fewer than 3 distinct samples: '+JSON.stringify(samples));if(Math.abs(samples.at(-1)-samples[0])<=threshold)throw Error(axis+' total delta too small: '+JSON.stringify(samples));
      const stoppedSample=value(label);if(stoppedSample!==after)throw Error(axis+' continued after keyup: '+after+' -> '+stoppedSample);
      return{samples,before,after,savesBefore,savesWhileHeld:during-savesBefore,savesAfterRelease:saves()-savesBefore,viewerBefore,viewerDuring,viewerAfter,targetBefore,targetAfter,stoppedSample,releaseOrder:order};
    };
    const assertFiniteInputs=()=>['Pitch value','Yaw value','Roll value','Position X value','Position Y value','Position Z value'].forEach(label=>finite(input(label).value,label));
    await wait(900);await waitFor(()=>document.querySelector('.camera3d-stage canvas'),'Camera canvas');
    await selectEntity('Human');phase='selected-roll-1';const selectedRollModifierFirst=await gesture({axis:'roll',label:'Roll value',key:'ArrowRight',modifier:'alt',modifierFirst:true,releaseModifierFirst:true,threshold:1});
    const selectedRollArrowFirst=await gesture({axis:'roll',label:'Roll value',key:'ArrowRight',modifier:'alt',modifierFirst:false,releaseModifierFirst:false,threshold:1});
    await selectEntity('Camera');const freePitchModifierFirst=await gesture({axis:'pitch',label:'Pitch value',key:'ArrowUp',modifier:'meta',modifierFirst:true,releaseModifierFirst:true,threshold:1});
    const freeYawModifierFirst=await gesture({axis:'yaw',label:'Yaw value',key:'ArrowRight',modifier:'meta',modifierFirst:true,releaseModifierFirst:false,threshold:1});
    const freePitchArrowFirst=await gesture({axis:'pitch',label:'Pitch value',key:'ArrowUp',modifier:'meta',modifierFirst:false,releaseModifierFirst:false,threshold:1});
    const freeYawArrowFirst=await gesture({axis:'yaw',label:'Yaw value',key:'ArrowRight',modifier:'meta',modifierFirst:false,releaseModifierFirst:true,threshold:1});
    const ctrlPitchModifierFirst=await gesture({axis:'pitch',label:'Pitch value',key:'ArrowUp',modifier:'ctrl',modifierFirst:true,releaseModifierFirst:true,threshold:1});
    const ctrlYawModifierFirst=await gesture({axis:'yaw',label:'Yaw value',key:'ArrowRight',modifier:'ctrl',modifierFirst:true,releaseModifierFirst:true,threshold:1});
    const ctrlPitchArrowFirst=await gesture({axis:'pitch',label:'Pitch value',key:'ArrowUp',modifier:'ctrl',modifierFirst:false,releaseModifierFirst:true,threshold:1});
    const ctrlYawArrowFirst=await gesture({axis:'yaw',label:'Yaw value',key:'ArrowRight',modifier:'ctrl',modifierFirst:false,releaseModifierFirst:true,threshold:1});
    await selectEntity('Human');const selectedPositionY=await gesture({axis:'position-y',label:'Position Y value',key:'ArrowUp',modifier:'alt',modifierFirst:true,releaseModifierFirst:true,threshold:.1});
    await selectEntity('Camera');
    const cameraTargetSelect=input('Target');const humanId=${JSON.stringify(fixture.entities.find(e=>e.kind==='human')!.id)};cameraTargetSelect.click();const targetOption=await waitFor(()=>document.querySelector('[role="option"][data-option-value="'+humanId+'"]'),'target option');targetOption.click();await waitFor(()=>targetValue()==='Human','target selection');await settle();
    const targetedRoll=await gesture({axis:'roll',label:'Roll value',key:'ArrowRight',modifier:'alt',modifierFirst:true,releaseModifierFirst:true,threshold:1});
    const pitchBefore=value('Pitch value'),blockedSavesBefore=saves(),blockedTargetBefore=targetValue();fire(window,'keydown','Meta',{metaKey:true});fire(document.querySelector('.camera3d-stage canvas'),'keydown','ArrowUp',{metaKey:true});for(let i=0;i<18;i++){await frame();await wait(5)}fire(document.querySelector('.camera3d-stage canvas'),'keyup','ArrowUp',{metaKey:true});fire(window,'keyup','Meta',{metaKey:false});await wait(180);const targetedBlockedPitch={before:pitchBefore,after:value('Pitch value'),savesBefore:blockedSavesBefore,savesAfter:saves(),targetBefore:blockedTargetBefore,targetAfter:targetValue()};
    return{selectedRollModifierFirst,selectedRollArrowFirst,freePitchModifierFirst,freeYawModifierFirst,freePitchArrowFirst,freeYawArrowFirst,ctrlPitchModifierFirst,ctrlYawModifierFirst,ctrlPitchArrowFirst,ctrlYawArrowFirst,selectedPositionY,targetedRoll,targetedBlockedPitch};
  })()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1400,height:900,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false,backgroundThrottling:false}});await w.loadFile(${JSON.stringify(html)});try{console.log('V17_HONEST_RESULT:'+JSON.stringify(await w.webContents.executeJavaScript(${JSON.stringify(probe)})))}catch(e){console.log('V17_HONEST_ERROR:'+String(e&&e.stack||e));process.exitCode=1}w.close();app.quit()})`)
  try {
    const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 120000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('V17_HONEST_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    return JSON.parse(marker!.slice('V17_HONEST_RESULT:'.length)) as ProbeResult
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

const expectGesture = (result: GestureResult, threshold: number) => {
  expect(result.samples.length).toBeGreaterThanOrEqual(9)
  expect(new Set(result.samples).size).toBeGreaterThanOrEqual(3)
  expect(Math.abs(result.samples.at(-1)! - result.samples[0])).toBeGreaterThan(threshold)
  expect(result.savesWhileHeld).toBe(0)
  expect(result.savesAfterRelease).toBe(1)
  expect(result.stoppedSample).toBe(result.after)
  expect(result.viewerAfter).toEqual(result.viewerDuring)
  expect(result.targetAfter).toBe(result.targetBefore)
}

 describe('V17 honest mounted continuous modifier hold lifecycle', () => {
  it('proves every real mounted multi-chord path with independent samples, snapshots, commits, and cancellation', () => {
    const result = runMountedProbe();process.stdout.write('V17_EXACT_ARRAYS:'+JSON.stringify(result)+'\\n')
    expectGesture(result.selectedRollModifierFirst, 1);expectGesture(result.selectedRollArrowFirst, 1)
    expectGesture(result.freePitchModifierFirst, 1);expectGesture(result.freeYawModifierFirst, 1);expectGesture(result.freePitchArrowFirst, 1);expectGesture(result.freeYawArrowFirst, 1)
    expectGesture(result.ctrlPitchModifierFirst, 1);expectGesture(result.ctrlYawModifierFirst, 1);expectGesture(result.ctrlPitchArrowFirst, 1);expectGesture(result.ctrlYawArrowFirst, 1)
    expectGesture(result.selectedPositionY, .1);expectGesture(result.targetedRoll, 1)
    expect(result.targetedBlockedPitch.after).toBe(result.targetedBlockedPitch.before)
    expect(result.targetedBlockedPitch.savesAfter).toBe(result.targetedBlockedPitch.savesBefore)
    expect(result.targetedBlockedPitch.targetAfter).toBe(result.targetedBlockedPitch.targetBefore)

    expect(result.selectedRollModifierFirst.samples).not.toEqual(result.selectedRollArrowFirst.samples)
    expect(result.freePitchModifierFirst.samples).not.toEqual(result.freePitchArrowFirst.samples)
    expect(result.freeYawModifierFirst.samples).not.toEqual(result.freeYawArrowFirst.samples)
    process.stdout.write('V17_EXACT_ARRAYS:'+JSON.stringify(result)+'\\n')
  }, 120000)
})
