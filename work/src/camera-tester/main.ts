import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { explicitCameraUserDataDir, resolveCameraUserDataPath } from './userDataPath'
import { cameraMediaFile, resolveCameraMedia } from './mediaLocator'
import { LocalRenderEngine, type LocalRenderStart } from './localRenderEngine'
import { RenderIpcCoordinator } from './renderIpc'
import { validateObjectAssistantIpcRequest } from './objectAssistantIpc'
import { cameraNativeKeyPayload } from './nativeCameraKey'

protocol.registerSchemesAsPrivileged([{ scheme: 'camera-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])
// Preserve the historical default, but never override Electron's explicit user-data-dir switch.
app.setName('Prism 3D Camera Eighteenth Flight Tester')
if (!explicitCameraUserDataDir(process.argv)) app.setPath('userData', resolveCameraUserDataPath(process.argv, app.getPath('appData')))
const safeId = (value: unknown) => { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('INVALID_ID'); return value }
const stateRoot = () => join(app.getPath('userData'), 'camera-nodes')
const mediaRoot = () => join(app.getPath('userData'), 'camera-media')
const renderEngine = new LocalRenderEngine({ mediaRoot: mediaRoot() })
const renderIpc = new RenderIpcCoordinator(renderEngine)
const observedRenderSenders = new Set<number>()
const ownRenderSender = (event: Electron.IpcMainInvokeEvent) => {
  const sender = event.sender
  if (!observedRenderSenders.has(sender.id)) {
    observedRenderSenders.add(sender.id)
    sender.once('destroyed', () => { observedRenderSenders.delete(sender.id); void renderIpc.cancelSender(sender.id) })
  }
  return sender.id
}
let mainWindow: BrowserWindow | null = null
function createWindow() { mainWindow = new BrowserWindow({ show: false, width: 1280, height: 800, minWidth: 960, minHeight: 640, title: 'Prism 3D Camera Nineteenth Flight Tester', backgroundColor: '#14131b', webPreferences: { preload: join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } }); const win = mainWindow; win.webContents.on('before-input-event', (_event, input) => { const payload = cameraNativeKeyPayload({ type: input.type, key: input.key, code: input.code, modifiers: input.modifiers, isAutoRepeat: input.isAutoRepeat }); if (payload && !win.isDestroyed()) win.webContents.send('camera:native-key', payload) }); win.once('ready-to-show', () => { if (mainWindow === win && !win.isDestroyed()) win.show() }); win.on('closed', () => { if (mainWindow === win) mainWindow = null }); win.removeMenu(); if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/index.html`); else void win.loadFile(join(__dirname, '../renderer/index.html')) }
app.whenReady().then(async () => {
  await Promise.all([mkdir(stateRoot(), { recursive: true }), mkdir(mediaRoot(), { recursive: true })])
  protocol.handle('camera-media', async (request) => {
    try {
      const url = new URL(request.url)
      if (url.hostname !== 'local') return new Response('Not found', { status: 404 })
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts.length !== 2 || !parts[1].endsWith('.mp4')) return new Response('Not found', { status: 404 })
      const nodeId = safeId(decodeURIComponent(parts[0])); const artifactId = safeId(decodeURIComponent(parts[1].slice(0, -4)))
      const resolution = await resolveCameraMedia(mediaRoot(), { nodeId, artifactId, locator: `${nodeId}/${artifactId}.mp4` })
      if (!resolution.ok) return new Response('Not found', { status: 404 })
      return net.fetch(pathToFileURL(cameraMediaFile(mediaRoot(), nodeId, artifactId)).toString())
    } catch { return new Response('Not found', { status: 404 }) }
  })
  createWindow()
})
app.on('activate', () => { if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return } mainWindow.show() })
app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => { void renderIpc.cancelAll() })
ipcMain.handle('camera:render-start', (event, request: LocalRenderStart) => renderIpc.start(ownRenderSender(event), request))
ipcMain.handle('camera:render-frame', (event, jobId, index, bytes) => renderIpc.submit(ownRenderSender(event), safeId(jobId), Number(index), bytes))
ipcMain.handle('camera:render-finish', (event, jobId) => renderIpc.finish(ownRenderSender(event), safeId(jobId)))
ipcMain.handle('camera:render-cancel', (event, jobId) => renderIpc.cancel(ownRenderSender(event), safeId(jobId)))
const ownWindowSender = (event: Electron.IpcMainInvokeEvent) => { if (!mainWindow || event.sender.id !== mainWindow.webContents.id) throw new Error('UNTRUSTED_SENDER') }
ipcMain.handle('camera:object-assistant-status', (event) => { ownWindowSender(event); return { connected:false, vision:false, reason:'Connect a compatible assistant in Prism Connections.' } })
ipcMain.handle('camera:object-assistant-request', (event, request) => { ownWindowSender(event); validateObjectAssistantIpcRequest(request); throw new Error('Connection required. Open Prism Connections and connect a compatible assistant.') })
ipcMain.handle('camera:load-state', async (_event, rawId) => { const id = safeId(rawId); try { return JSON.parse(await readFile(join(stateRoot(), `${id}.json`), 'utf8')) } catch { return null } })
ipcMain.handle('camera:save-state', async (_event, rawId, state) => { const id = safeId(rawId); const destination = join(stateRoot(), `${id}.json`); const temporary = `${destination}.tmp`; await writeFile(temporary, JSON.stringify(state)); await rename(temporary, destination) })
ipcMain.handle('camera:media-url', (_event, rawNodeId, rawArtifactId, rawLocator) => resolveCameraMedia(mediaRoot(), { nodeId: safeId(rawNodeId), artifactId: safeId(rawArtifactId), locator: String(rawLocator || '') }))
ipcMain.handle('camera:reveal-media', async (_event, rawNodeId, rawArtifactId, rawLocator) => { const nodeId = safeId(rawNodeId); const artifactId = safeId(rawArtifactId); const resolution = await resolveCameraMedia(mediaRoot(), { nodeId, artifactId, locator: String(rawLocator || '') }); if (!resolution.ok) return false; shell.showItemInFolder(cameraMediaFile(mediaRoot(), nodeId, artifactId)); return true })
ipcMain.handle('camera:delete-media', async (_event, rawNodeId, rawArtifactId, rawLocator) => { const nodeId = safeId(rawNodeId); const artifactId = safeId(rawArtifactId); const resolution = await resolveCameraMedia(mediaRoot(), { nodeId, artifactId, locator: String(rawLocator || '') }); if (!resolution.ok) return false; await unlink(cameraMediaFile(mediaRoot(), nodeId, artifactId)); return true })
