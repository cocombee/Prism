import { contextBridge, ipcRenderer } from 'electron'
import type { CameraTesterAPI } from './api'
const api: CameraTesterAPI = {
  loadNodeState: (nodeId) => ipcRenderer.invoke('camera:load-state', nodeId),
  saveNodeState: (nodeId, state) => ipcRenderer.invoke('camera:save-state', nodeId, state),
  mediaUrl: (nodeId, artifactId, locator) => ipcRenderer.invoke('camera:media-url', nodeId, artifactId, locator),
  revealMedia: (nodeId, artifactId, locator) => ipcRenderer.invoke('camera:reveal-media', nodeId, artifactId, locator),
  deleteMedia: (nodeId, artifactId, locator) => ipcRenderer.invoke('camera:delete-media', nodeId, artifactId, locator),
  startRender: (request) => ipcRenderer.invoke('camera:render-start', request),
  writeRenderFrame: (jobId, index, bytes) => ipcRenderer.invoke('camera:render-frame', jobId, index, bytes),
  finishRender: (jobId) => ipcRenderer.invoke('camera:render-finish', jobId),
  cancelRender: (jobId) => ipcRenderer.invoke('camera:render-cancel', jobId),
  objectAssistantStatus: () => ipcRenderer.invoke('camera:object-assistant-status'),
  createObjectRecipe: (request) => ipcRenderer.invoke('camera:object-assistant-request', request),
  onNativeKey: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) => listener(payload)
    ipcRenderer.on('camera:native-key', handler)
    return () => ipcRenderer.removeListener('camera:native-key', handler)
  },
}
contextBridge.exposeInMainWorld('cameraTester', api)
