#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const sourceApp = resolve(process.argv[2] || process.env.PRISM_PACKAGED_APP || '')
if (!sourceApp || !existsSync(sourceApp)) throw new Error('Pass the packaged Prism .app path as the first argument or PRISM_PACKAGED_APP.')
const root = mkdtempSync(join(tmpdir(), 'prism-duration-packaged-regression-'))
const appPath = join(root, 'Prism Duration Regression.app')
const userData = join(root, 'user-data')
const projectRoot = join(root, 'project')
const port = 19333 + Math.floor(Math.random() * 1000)
const now = '2026-08-26T08:00:00.000Z'
let child

function json(path, value) { mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`) }
function fixture() {
  const project = { schemaVersion: 1, id: 'duration-regression', name: 'Duration Regression', rootPath: projectRoot, createdAt: now, updatedAt: now }
  const panels = [
    { id: 'panel-a', prompt: 'First authored shot.', duration: 8, shotSize: 'wide', camera: 'static', transitionToNext: 'continue', locked: false, originalPrompt: 'First authored shot.', revampedPrompt: 'First revamped shot.', selectedPromptVersion: 'original' },
    { id: 'panel-b', prompt: 'Second authored shot.', duration: 7, shotSize: 'medium', camera: 'static', transitionToNext: 'continue', locked: false, originalPrompt: 'Second authored shot.', revampedPrompt: 'Second revamped shot.', selectedPromptVersion: 'original' },
  ]
  const nodes = [
    { id: 'storyboard', type: 'storyboard', position: { x: 70, y: 100 }, data: { kind: 'storyboard', title: 'Authored board', storyboardEditorOpen: true, referenceTag: '@saved-board', selectorDeployment: true, storyboardPanels: panels, storyboardPanelCount: 2, assistantProvider: 'anthropic', assistantModelId: 'claude-opus-5' } },
    { id: 'video', type: 'studio', position: { x: 520, y: 100 }, data: { kind: 'video-generator', title: 'Video Generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 20, autoDuration: false, frameRate: 24, motionCadence: 24, aspectRatio: '16:9', resolution: '480p', quantity: 1, generateAudio: true, prompt: 'Unrelated generator state', seed: 77 } },
  ]
  const edges = [{ id: 'storyboard-video', source: 'storyboard', sourceHandle: 'storyboard-out', target: 'video', targetHandle: 'storyboard-in', animated: false, style: { stroke: '#a68cff', strokeWidth: 2 } }]
  const page = { id: 'page', name: 'Page 1', nodes, edges, viewport: { x: 60, y: 60, zoom: 1 }, updatedAt: now }
  const canvas = { id: 'canvas', name: 'Canvas 1', pages: [page], activePageId: 'page', updatedAt: now }
  const workflow = { schemaVersion: 1, id: 'workflow', name: 'Duration Regression', createdAt: now, updatedAt: now, nodes, edges, viewport: page.viewport, pages: [page], activePageId: 'page', canvases: [canvas], activeCanvasId: 'canvas' }
  json(join(projectRoot, 'Prism Foundry Project.json'), project)
  json(join(userData, 'studio-data/current-project.json'), { ...project, documentPath: join(projectRoot, '00. Project/Duration Regression.prismflow') })
  json(join(userData, 'studio-data/recent-projects.json'), [])
  json(join(projectRoot, '05. Canvas/workflow.json'), workflow)
  json(join(projectRoot, '05. Canvas/assets.json'), [])
  json(join(projectRoot, '05. Canvas/history.json'), [])
}
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`)
}
async function waitForTarget() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets[0]) return targets[0] } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Packaged renderer DevTools endpoint did not become ready.')
}
async function main() {
  fixture()
  cpSync(sourceApp, appPath, { recursive: true, force: true, verbatimSymlinks: true })
  const plist = join(appPath, 'Contents/Info.plist')
  run('plutil', ['-replace', 'CFBundleIdentifier', '-string', `com.cocombees.prismfoundry.duration-regression.${process.pid}`, plist])
  run('codesign', ['--force', '--deep', '--sign', '-', appPath])
  const executableName = readFileSync(plist).includes(Buffer.from('Prism Flight Tester')) ? 'Prism Flight Tester' : basename(sourceApp, '.app')
  const executable = join(appPath, 'Contents/MacOS', executableName)
  child = spawn(executable, [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] })
  const target = await waitForTarget()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const errors = []
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id); return message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result) }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    if (message.method === 'Inspector.targetCrashed') errors.push('Renderer target crashed')
  }
  await new Promise((resolveOpen, reject) => { ws.onopen = resolveOpen; ws.onerror = reject })
  const send = (method, params = {}) => new Promise((resolveSend, reject) => { const next = ++id; pending.set(next, { resolve: resolveSend, reject }); ws.send(JSON.stringify({ id: next, method, params })) })
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  await new Promise((resolveWait) => setTimeout(resolveWait, 900))
  await evaluate(`document.querySelector('article.page-card')?.click()`)
  await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  await evaluate(`window.__durationRegression={errors:[],rejections:[],mutations:0};window.addEventListener('error',e=>window.__durationRegression.errors.push(e.error?.stack||e.message));window.addEventListener('unhandledrejection',e=>window.__durationRegression.rejections.push(e.reason?.stack||String(e.reason)));new MutationObserver(list=>window.__durationRegression.mutations+=list.length).observe(document.querySelector('#root'),{subtree:true,childList:true,attributes:true,characterData:true})`)
  const iconStyles = () => evaluate(`(()=>Array.from(document.querySelector('.storyboard-panel-head [role="group"]')?.querySelectorAll('button')||[]).map(button=>{const style=getComputedStyle(button);return{label:button.getAttribute('aria-label'),pressed:button.getAttribute('aria-pressed'),radius:style.borderRadius,overflow:style.overflow,width:style.width,height:style.height,background:style.backgroundColor,color:style.color}}))()`)
  const originalIconPaint = await iconStyles()
  await evaluate(`document.querySelector('[aria-label="Show revamped prompt"]')?.click()`)
  await new Promise((resolveWait) => setTimeout(resolveWait, 80))
  await evaluate(`document.querySelector('[aria-label="Lock panel"]')?.click();document.querySelector('[aria-label="Delete panel"]')?.focus()`)
  await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  const selectedIconPaint = await iconStyles()
  const deleteButtonRect = await evaluate(`(()=>{const e=document.querySelector('[aria-label="Delete panel"]');const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: deleteButtonRect.x, y: deleteButtonRect.y })
  const hoveredIconPaint = await iconStyles()
  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const iconScreenshotPath = join(process.env.PRISM_REGRESSION_EVIDENCE_DIR || root, 'rounded-storyboard-header.png')
  mkdirSync(resolve(iconScreenshotPath, '..'), { recursive: true })
  writeFileSync(iconScreenshotPath, Buffer.from(screenshot.data, 'base64'))
  for (const state of [originalIconPaint, selectedIconPaint, hoveredIconPaint]) {
    if (state.length !== 4 || state.some((button) => button.radius !== '6px' || button.overflow !== 'hidden' || button.width !== '21px' || button.height !== '21px')) throw new Error(`rounded icon geometry mismatch: ${JSON.stringify(state)}`)
  }
  const selectedButtons = selectedIconPaint.filter((button) => button.pressed === 'true')
  if (selectedButtons.length !== 2 || selectedButtons.some((button) => button.background === 'rgba(0, 0, 0, 0)')) throw new Error(`selected icon paint is not persistently clipped: ${JSON.stringify(selectedIconPaint)}`)
  if (Buffer.from(screenshot.data, 'base64').length < 1000) throw new Error('Rounded icon screenshot was empty.')
  await evaluate(`document.querySelector('[aria-label="Show original prompt"]')?.click()`)
  await new Promise((resolveWait) => setTimeout(resolveWait, 80))
  await evaluate(`document.querySelector('[aria-label="Unlock panel"]')?.click()`)
  await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  const snapshot = () => evaluate(`(()=>({root:document.querySelector('#root')?.childElementCount||0,canvas:!!document.querySelector('.react-flow'),nodeIds:Array.from(document.querySelectorAll('.react-flow__node')).map(n=>n.dataset.id),edgeIds:Array.from(document.querySelectorAll('.react-flow__edge')).map(e=>e.dataset.id||e.id),panelIds:Array.from(document.querySelectorAll('.storyboard-panel')).map(e=>e.dataset.panelId),duration:document.querySelector('[aria-label="Video Duration"]')?.textContent.trim(),budget:document.querySelector('.storyboard-budget strong')?.textContent.trim(),diagnostics:structuredClone(window.__durationRegression)}))()`)
  const choose = async (label, option) => {
    const trigger = await evaluate(`(()=>{const trigger=document.querySelector('[aria-label=${JSON.stringify(label)}]');if(!trigger)return {ok:false,reason:'missing trigger'};trigger.click();return {ok:true}})()`)
    if (!trigger?.ok) throw new Error(`${label} ${option}: ${trigger?.reason}`)
    await new Promise((resolveWait) => setTimeout(resolveWait, 60))
    const selected = await evaluate(`(()=>{const row=Array.from(document.querySelectorAll('[role=option]')).find(e=>e.textContent.trim()===${JSON.stringify(option)});if(!row)return {ok:false,reason:'missing option',options:Array.from(document.querySelectorAll('[role=option]')).map(e=>e.textContent.trim())};row.click();return {ok:true}})()`)
    if (!selected?.ok) throw new Error(`${label} ${option}: ${selected?.reason}; ${JSON.stringify(selected?.options || [])}`)
    await new Promise((resolveWait) => setTimeout(resolveWait, 180))
    return snapshot()
  }
  const initial = await snapshot()
  const states = []
  const record = async (name, promise) => {
    const state = await promise
    states.push([name, state])
    if (!state.root || !state.canvas) throw new Error(`${name}: root/Canvas unmounted; ${JSON.stringify({ errors, diagnostics: state.diagnostics })}`)
    return state
  }
  await record('legal-lower', choose('Video Duration', '18.0s'))
  await record('overflow-lower', choose('Video Duration', '10.0s'))
  await record('raise', choose('Video Duration', '20.0s'))
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await record(`cycle-${cycle}-lower`, choose('Video Duration', '10.0s'))
    await record(`cycle-${cycle}-raise`, choose('Video Duration', '20.0s'))
  }
  await record('model-change', choose('Video Model', 'Seedance 2 · References'))
  const expectedNodes = ['storyboard', 'video']; const expectedPanels = ['panel-a', 'panel-b']; const expectedEdges = ['storyboard-video']
  for (const [name, state] of [['initial', initial], ...states]) {
    if (!state.root || !state.canvas) throw new Error(`${name}: root/Canvas unmounted`)
    if (JSON.stringify(state.nodeIds) !== JSON.stringify(expectedNodes)) throw new Error(`${name}: graph nodes replaced: ${JSON.stringify(state.nodeIds)}`)
    if (JSON.stringify(state.edgeIds) !== JSON.stringify(expectedEdges)) throw new Error(`${name}: edge replaced: ${JSON.stringify(state.edgeIds)}`)
    if (JSON.stringify(state.panelIds) !== JSON.stringify(expectedPanels)) throw new Error(`${name}: Storyboard panels changed: ${JSON.stringify(state.panelIds)}`)
  }
  const diagnostics = states.at(-1)[1].diagnostics
  if (errors.length || diagnostics.errors.length || diagnostics.rejections.length) throw new Error(`uncaught renderer errors: ${JSON.stringify({ errors, diagnostics })}`)
  if (diagnostics.mutations > 1500) throw new Error(`runaway renderer mutations: ${diagnostics.mutations}`)
  if (child.exitCode !== null) throw new Error(`packaged process terminated with ${child.exitCode}`)
  console.log(JSON.stringify({ result: 'PASS', sourceApp, initial, states, iconPaint: { original: originalIconPaint, selectedLocked: selectedIconPaint, deleteHovered: hoveredIconPaint, screenshotPath: iconScreenshotPath }, rendererErrors: errors, processAlive: child.exitCode === null }, null, 2))
  ws.close()
}

try { await main() } catch (error) { console.error(error.stack || String(error)); process.exitCode = 1 } finally {
  if (child?.exitCode === null) child.kill('SIGTERM')
  await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  rmSync(root, { recursive: true, force: true })
}
