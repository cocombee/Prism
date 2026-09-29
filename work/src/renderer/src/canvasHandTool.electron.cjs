const { app, BrowserWindow } = require('electron')
const { buildSync } = require('esbuild')
const fs = require('node:fs')
const path = require('node:path')

app.commandLine.appendSwitch('disable-gpu')
const root = process.cwd()
const bundle = '/tmp/prism-canvas-hand-electron.js'
buildSync({ entryPoints: [path.join(root, 'src/renderer/src/canvasHandTool.electron.tsx')], bundle: true, platform: 'browser', format: 'iife', outfile: bundle, jsx: 'automatic' })
const css = fs.readFileSync(path.join(root, 'node_modules/@xyflow/react/dist/style.css'), 'utf8')
const html = `<!doctype html><html><head><style>html,body,#root{width:100%;height:100%;margin:0}textarea{position:absolute;z-index:20;left:8px;top:8px;width:150px;height:30px}</style><style>${css}</style></head><body><div id="root"></div><script>${fs.readFileSync(bundle, 'utf8')}</script></body></html>`
const htmlPath = '/tmp/prism-canvas-hand-electron.html'
fs.writeFileSync(htmlPath, html)
const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms))
const assert = (value, message) => { if (!value) throw new Error(message) }
const changed = (a, b) => Math.abs(a.x - b.x) > .5 || Math.abs(a.y - b.y) > .5

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 760, height: 560, webPreferences: { sandbox: true } })
  win.webContents.on('console-message', (event) => console.error(`renderer: ${event.message || JSON.stringify(event)}`))
  await win.loadFile(htmlPath)
  await win.webContents.executeJavaScript(`new Promise((resolve, reject) => { const started=Date.now(); const check=()=>window.canvasHarness ? resolve(true) : Date.now()-started > 5000 ? reject(new Error('canvas harness mount timeout')) : setTimeout(check,10); check() })`)
  const api = script => win.webContents.executeJavaScript(script)
  const key = (type, keyCode) => win.webContents.sendInputEvent({ type, keyCode })
  const drag = async (x, y, dx = 9, dy = 6) => {
    win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 })
    win.webContents.sendInputEvent({ type: 'mouseMove', x: x + Math.ceil(dx / 2), y: y + Math.ceil(dy / 2), button: 'left', movementX: Math.ceil(dx / 2), movementY: Math.ceil(dy / 2) })
    win.webContents.sendInputEvent({ type: 'mouseMove', x: x + dx, y: y + dy, button: 'left', movementX: Math.floor(dx / 2), movementY: Math.floor(dy / 2) })
    win.webContents.sendInputEvent({ type: 'mouseUp', x: x + dx, y: y + dy, button: 'left', clickCount: 1 })
    await wait()
  }
  const viewport = () => api('window.canvasHarness.getViewport()')
  const reset = async () => { await api('window.canvasHarness.setViewport({x:0,y:0,zoom:1})'); await wait() }

  await reset()
  for (let cycle = 0; cycle < 30; cycle += 1) {
    const before = await viewport()
    key('keyDown', 'Space')
    await drag(620, 430, 5 + (cycle % 3), 4)
    key('keyUp', 'Space')
    await wait()
    const after = await viewport()
    assert(changed(before, after), `Space immediate pan failed at cycle ${cycle + 1}`)
    const released = await viewport()
    await drag(620, 430, 7, 5)
    assert(!changed(released, await viewport()), `Space release stayed active at cycle ${cycle + 1}`)
    assert(await api("window.canvasHarness.getTool() === 'select'"), `persistent Select lost at cycle ${cycle + 1}`)
  }

  await reset()
  await api("window.canvasHarness.setTool('hand')")
  await wait()
  const handBefore = await viewport()
  await drag(620, 430, 12, 8)
  assert(changed(handBefore, await viewport()), 'persistent Hand did not left-pan')

  await reset()
  await api("window.canvasHarness.setTool('select')")
  await wait()
  const nodeBefore = await api('window.canvasHarness.getNode().position')
  const nodeRect = await api('window.canvasHarness.getNodeRect()')
  await drag(Math.round(nodeRect.x + nodeRect.width / 2), Math.round(nodeRect.y + nodeRect.height / 2), 24, 18)
  const nodeAfter = await api('window.canvasHarness.getNode().position')
  assert(changed(nodeBefore, nodeAfter), 'Select node drag regressed')

  await reset()
  await api("document.querySelector('#text-entry').focus()")
  key('keyDown', 'Space')
  await wait()
  await drag(620, 430, 12, 8)
  key('keyUp', 'Space')
  assert(!changed({ x: 0, y: 0 }, await viewport()), 'textarea Space activated pan')
  assert(await api("document.querySelector('#text-entry').value.includes(' ')"), 'textarea Space was not inserted')

  await reset()
  key('keyDown', 'Space')
  await wait()
  await api("window.dispatchEvent(new Event('blur'))")
  await wait()
  assert(!(await api('window.canvasHarness.getSpace()')), 'blur left visual Space state stuck')
  await drag(620, 430, 12, 8)
  assert(!changed({ x: 0, y: 0 }, await viewport()), 'blur left React Flow Space pan stuck')

  await reset()
  key('keyDown', 'Space')
  await wait()
  await api('window.canvasHarness.triggerVisibilityLoss()')
  await wait()
  assert(!(await api('window.canvasHarness.getSpace()')), 'visibility loss left visual Space state stuck')
  await drag(620, 430, 12, 8)
  assert(!changed({ x: 0, y: 0 }, await viewport()), 'visibility loss left React Flow Space pan stuck')

  process.stdout.write('30/30 immediate Space-pan cycles passed; keyup, persistent Hand, Select node drag, textarea, blur, and visibility cleanup passed\n')
  win.destroy()
  app.exit(0)
}).catch(error => { console.error(error); app.exit(1) })
