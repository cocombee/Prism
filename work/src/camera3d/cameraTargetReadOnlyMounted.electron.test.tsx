import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { buildSync } from 'esbuild'
import electronPath from 'electron'
import { describe, expect, it } from 'vitest'

function runTargetReadOnlyProbe(targeted = true) {
  const directory = mkdtempSync(join(tmpdir(), 'prism-camera-target-readonly-mounted-'))
  const entry = join(directory, 'entry.tsx'), bundle = join(directory, 'renderer.js'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
  const component = resolve(import.meta.dirname, 'exactCanvasCamera.tsx')
  const model = resolve(import.meta.dirname, 'model.ts')
  const sharedCss = pathToFileURL(resolve(import.meta.dirname, '../renderer/src/styles-next.css')).href
  const cameraCss = pathToFileURL(resolve(import.meta.dirname, 'camera3d.css')).href
  writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CameraTransformInspector}from${JSON.stringify(component)};import{addEntity,createCameraDocument,setCameraAimMode,toggleEntityLockScope}from${JSON.stringify(model)};const seeded=addEntity(addEntity(createCameraDocument('target-readonly-mounted'),'camera','Camera'),'human','Human');const cam=seeded.entities.find(e=>e.kind==='camera');const initial={...seeded,entities:seeded.entities.map(e=>e.id===cam.id?setCameraAimMode(e,${targeted ? "'object'" : "'free'"},seeded.entities):e)};function App(){const[d,setD]=useState(initial);const camera=d.entities.find(e=>e.kind==='camera');window.__counts ||= {draft:0,commit:0,keyframe:0,reset:0,navigate:0};const patch=(next,kind)=>{window.__counts[kind]++;setD({...d,entities:d.entities.map(e=>e.id===camera.id?{...e,transform:next}:e)})};return <CameraTransformInspector entity={camera} frame={0} disabled={false} onDraft={next=>patch(next,'draft')} onCommit={next=>patch(next,'commit')} onKeyframe={()=>window.__counts.keyframe++} onReset={()=>window.__counts.reset++} onNavigateKeyframe={()=>window.__counts.navigate++} onResetTransform={()=>window.__counts.commit++} onRotationLock={()=>setD(toggleEntityLockScope(d,camera.id,'rotation'))}/>}createRoot(document.getElementById('root')).render(<App/>);`)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', logLevel: 'silent' })
  writeFileSync(html, `<style>html,body,#root{margin:0;width:100%;min-height:100%;background:#111;color:#ddd}*{box-sizing:border-box}</style><link rel="stylesheet" href="${sharedCss}"><link rel="stylesheet" href="${cameraCss}"><div id="root"></div><script src="${pathToFileURL(bundle).href}"></script>`)
  const probe = `(async()=>{const wait=()=>new Promise(requestAnimationFrame);await wait();await wait();const pick=(label)=>document.querySelector('[aria-label="'+label+'"]');const rect=e=>{const r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};const target={pitch:pick('Pitch value'),yaw:pick('Yaw value'),roll:pick('Roll value'),pitchSlider:pick('Pitch slider'),yawSlider:pick('Yaw slider'),rollSlider:pick('Roll slider')};const rows=Object.fromEntries(['Pitch','Yaw','Roll'].map(axis=>{const input=pick(axis+' value');const row=input?.closest('.camera3d-rotation-property');const actions=row?.querySelector('.camera3d-camera-action-row');const buttons=[...(actions?.querySelectorAll('button')||[])];return[axis.toLowerCase(),{row:rect(row),icon:rect(row?.querySelector('.camera3d-linked-status')),slider:rect(row?.querySelector('[aria-label="'+axis+' slider"]')),numeric:rect(input),controls:rect(row?.querySelector('.camera3d-transform-controls')),action:rect(actions),actionTerminal:rect(buttons.at(-1))}]}));const read=e=>({disabled:e?.hasAttribute('disabled')||false,readOnly:e?.getAttribute('aria-readonly'),ariaDisabled:e?.getAttribute('aria-disabled'),value:e?.value||e?.getAttribute('aria-valuenow')});const actionStates=Object.fromEntries(Object.entries(rows).map(([axis])=>{const buttons=[...document.querySelector('[aria-label="'+axis[0].toUpperCase()+axis.slice(1)+' value"]')?.closest('.camera3d-rotation-property')?.querySelectorAll('button')||[]];return[axis,buttons.map(e=>({disabled:e.disabled,opacity:getComputedStyle(e).opacity,color:getComputedStyle(e).color}))]}));const targetSemantics=Object.fromEntries(Object.entries(target).map(([key,e])=>[key,read(e)]));const before=JSON.parse(JSON.stringify(window.__counts));for(const axis of ['pitch','yaw']){const input=target[axis];const row=input?.closest('.camera3d-rotation-property');for(const button of [...row?.querySelectorAll('button')||[]])button.click();input?.click()}const targetCounts=JSON.parse(JSON.stringify(window.__counts));const rollRow=target.roll?.closest('.camera3d-rotation-property');for(const button of [...rollRow?.querySelectorAll('button')||[]])button.click();await wait();const afterRollActions={counts:JSON.parse(JSON.stringify(window.__counts)),values:{pitch:target.pitch?.value,yaw:target.yaw?.value,roll:target.roll?.value}};target.rollSlider?.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await wait();const afterRoll={counts:JSON.parse(JSON.stringify(window.__counts)),values:{pitch:target.pitch?.value,yaw:target.yaw?.value,roll:target.roll?.value}};pick('Lock Rotation')?.click();await wait();const locked=Object.fromEntries(Object.entries(target).map(([key,e])=>[key,read(e)]));const lockedActionStates=Object.fromEntries(Object.entries(rows).map(([axis])=>{const buttons=[...document.querySelector('[aria-label="'+axis[0].toUpperCase()+axis.slice(1)+' value"]')?.closest('.camera3d-rotation-property')?.querySelectorAll('button')||[]];return[axis,buttons.map(e=>e.disabled)]}));return{targetSemantics,targetCounts,afterRollActions,afterRoll,locked,lockedActionStates,rows,actionStates,icons:document.querySelectorAll('.camera3d-linked-status').length,before}})()`
  writeFileSync(main, `const{app,BrowserWindow}=require('electron'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'u'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:900,height:800,useContentSize:true,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,400));console.log('CAMERA_TARGET_READONLY_RESULT:'+JSON.stringify(await w.webContents.executeJavaScript(${JSON.stringify(probe)})));w.close();app.quit()})`)
  const run = spawnSync(electronPath as unknown as string, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60000 })
  try { const marker = run.stdout.split('\n').find((line) => line.startsWith('CAMERA_TARGET_READONLY_RESULT:')); expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0); expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined(); return JSON.parse(marker!.slice('CAMERA_TARGET_READONLY_RESULT:'.length)) } finally { rmSync(directory, { recursive: true, force: true }) }
}

const closeTo = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 1)

 describe('mounted Camera Target Lock target-linked grey/read-only contract', () => {
  it('keeps target-linked Pitch/Yaw grey/read-only and inert, while Roll remains enabled and Rotation Lock disables all', () => {
    const result = runTargetReadOnlyProbe()
    for (const axis of ['pitch','yaw']) { expect(result.targetSemantics[axis].disabled).toBe(true); expect(result.targetSemantics[axis].readOnly).toBe('true') }
    for (const axis of ['pitchSlider','yawSlider']) { expect(result.targetSemantics[axis].disabled).toBe(false); expect(result.targetSemantics[axis].ariaDisabled).toBe('true'); expect(result.targetSemantics[axis].readOnly).toBe('true') }
    expect(result.icons).toBe(2)
    expect(result.targetSemantics.pitch.value).toBeTruthy()
    expect(result.targetSemantics.yaw.value).toBeTruthy()
    expect(result.targetCounts).toEqual(result.before)
    for (const axis of ['pitch','yaw']) {
      expect(result.actionStates[axis].every((button: { disabled: boolean; opacity: string }) => button.disabled)).toBe(true)
      expect(result.actionStates[axis].every((button: { opacity: string }) => Number(button.opacity) < 1)).toBe(true)
    }
    expect(result.afterRollActions.counts.keyframe - result.targetCounts.keyframe).toBe(1)
    expect(result.afterRollActions.counts.reset - result.targetCounts.reset).toBe(1)
    expect(result.afterRollActions.counts.navigate - result.targetCounts.navigate).toBe(2)
    expect(result.afterRoll.counts.commit - result.afterRollActions.counts.commit).toBe(1)
    expect(result.afterRoll.values.roll).toBe('1')
    expect(result.actionStates.roll.every((button: { disabled: boolean }) => !button.disabled)).toBe(true)
    for (const axis of ['pitch','yaw','roll']) expect(result.locked[axis].disabled).toBe(true)
    for (const axis of ['pitchSlider','yawSlider','rollSlider']) expect(result.locked[axis].ariaDisabled).toBe('true')
    for (const axis of ['pitch','yaw','roll']) expect(result.lockedActionStates[axis].every(Boolean)).toBe(true)

    const roll = result.rows.roll

    for (const axis of ['pitch','yaw']) {
      const row = result.rows[axis]
      expect(row.icon).not.toBeNull()
      expect(row.icon.left).toBeGreaterThanOrEqual(row.row.left)
      expect(row.icon.right).toBeLessThanOrEqual(row.slider.left)
      expect(row.slider.right).toBeLessThanOrEqual(row.controls.right)
      expect(row.slider.left - row.icon.right).toBeGreaterThanOrEqual(0)
      for (const edge of ['left','right','width'] as const) closeTo(row.numeric[edge], roll.numeric[edge])
      for (const edge of ['left','right','width'] as const) closeTo(row.actionTerminal[edge], roll.actionTerminal[edge])
      for (const edge of ['left','right','height'] as const) closeTo(row.row[edge], roll.row[edge])
      expect(row.icon.right).toBeLessThanOrEqual(row.controls.right)
      expect(row.slider.right).toBeLessThanOrEqual(row.controls.right)
    }
    closeTo(result.rows.yaw.row.top - result.rows.pitch.row.bottom, 9)
    closeTo(result.rows.roll.row.top - result.rows.yaw.row.bottom, 9)
    closeTo(result.rows.pitch.action.right, roll.action.right)
    closeTo(result.rows.yaw.action.right, roll.action.right)
  }, 60000)

  it('keeps a free target icon-free with normal editable rotation actions', () => {
    const result = runTargetReadOnlyProbe(false)
    expect(result.icons).toBe(0)
    for (const axis of ['pitch','yaw','roll']) { expect(result.targetSemantics[axis].disabled).toBe(false); expect(result.targetSemantics[axis].readOnly).toBe(null); expect(result.actionStates[axis].every((button: { disabled: boolean }) => !button.disabled)).toBe(true) }
    for (const axis of ['pitchSlider','yawSlider','rollSlider']) { expect(result.targetSemantics[axis].ariaDisabled).toBe('false'); expect(result.targetSemantics[axis].readOnly).toBe(null) }
  })
})
