import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { GenerationRequest, PrismAPI, WorkflowDocument } from '../shared/types'

const api: PrismAPI = {
  projects: {
    current: () => ipcRenderer.invoke('projects:current'),
    recent: () => ipcRenderer.invoke('projects:recent'),
    create: () => ipcRenderer.invoke('projects:create'),
    open: () => ipcRenderer.invoke('projects:open'),
    openRecent: (rootPath) => ipcRenderer.invoke('projects:open-recent', rootPath),
    openDocument: () => ipcRenderer.invoke('projects:open-document'),
    renameDocument: (rootPath, name) => ipcRenderer.invoke('projects:rename-document', rootPath, name),
    forget: (rootPath) => ipcRenderer.invoke('projects:forget', rootPath),
    close: () => ipcRenderer.invoke('projects:close'),
    legacyImportStatus: () => ipcRenderer.invoke('projects:legacy-import-status'),
    removeLegacyImport: () => ipcRenderer.invoke('projects:remove-legacy-import'),
    onOpened: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, project: Parameters<typeof listener>[0]) => listener(project)
      ipcRenderer.on('projects:opened', handler)
      return () => ipcRenderer.removeListener('projects:opened', handler)
    },
  },
  credentials: {
    status: () => ipcRenderer.invoke('credentials:status'),
    save: (key) => ipcRenderer.invoke('credentials:save', key),
    remove: () => ipcRenderer.invoke('credentials:remove'),
    fishStatus: () => ipcRenderer.invoke('credentials:fish-status'),
    saveFish: (key) => ipcRenderer.invoke('credentials:save-fish', key),
    removeFish: () => ipcRenderer.invoke('credentials:remove-fish'),
  },
  services: {
    list: () => ipcRenderer.invoke('services:list'),
    save: (provider, key) => ipcRenderer.invoke('services:save', provider, key),
    remove: (provider) => ipcRenderer.invoke('services:remove', provider),
    models: (provider) => ipcRenderer.invoke('services:models', provider),
    account: (provider) => ipcRenderer.invoke('services:account', provider),
    profiles: (provider, refresh) => ipcRenderer.invoke('services:profiles', provider, refresh),
    addProfile: (provider, key, expectedProfileId) => ipcRenderer.invoke('services:add-profile', provider, key, expectedProfileId),
    transitionProfile: (profileId, transition) => ipcRenderer.invoke('services:transition-profile', profileId, transition),
    setDefaultProfile: (provider, profileId) => ipcRenderer.invoke('services:set-default-profile', provider, profileId),
    renameProfile: (profileId, displayName) => ipcRenderer.invoke('services:rename-profile', profileId, displayName),
    selectProjectProfile: (provider, profileId) => ipcRenderer.invoke('services:select-project-profile', provider, profileId),
  },
  workflows: {
    load: () => ipcRenderer.invoke('workflows:load'),
    save: (document: WorkflowDocument) => ipcRenderer.invoke('workflows:save', document),
  },

  assets: {
    import: (kind, collectionName) => ipcRenderer.invoke('assets:import', kind, collectionName),
    importPaths: (paths, kind, collectionName) => ipcRenderer.invoke('assets:import-paths', paths, kind, collectionName),
    inspectBatch: (paths, kind) => ipcRenderer.invoke('assets:inspect-batch', paths, kind),
    chooseBatch: (kind) => ipcRenderer.invoke('assets:choose-batch', kind),
    importBuffer: (bytes, mimeType, name, metadata) => ipcRenderer.invoke('assets:import-buffer', bytes, mimeType, name, metadata),
    markCanvasCopy: () => ipcRenderer.invoke('assets:mark-canvas-copy'),
    pasteImages: () => ipcRenderer.invoke('assets:paste-images'),
    readCharacterImage: (id) => ipcRenderer.invoke('assets:read-character-image', id),
    validateCharacterImage: (id, mode) => ipcRenderer.invoke('assets:validate-character-image', id, mode),
    saveCharacterSheet: (bytes, name, previousPath) => ipcRenderer.invoke('assets:save-character-sheet', bytes, name, previousPath),
    commitCharacterCollection: (request) => ipcRenderer.invoke('assets:commit-character-collection', request),
    commitSemanticResult: (request) => ipcRenderer.invoke('assets:commit-semantic-result', request),
    pathForFile: (file) => webUtils.getPathForFile(file),
    list: () => ipcRenderer.invoke('assets:list'),
    rename: (id, name) => ipcRenderer.invoke('assets:rename', id, name),
    updateMetadata: (id, metadata) => ipcRenderer.invoke('assets:update-metadata', id, metadata),
    updateState: (id, patch) => ipcRenderer.invoke('assets:update-state', id, patch),
    updateCollection: (ids, patch) => ipcRenderer.invoke('assets:update-collection', ids, patch),
    trashCollection: (ids, workflow) => ipcRenderer.invoke('assets:trash-collection', ids, workflow),
    restoreCollection: (ids, workflow) => ipcRenderer.invoke('assets:restore-collection', ids, workflow),
    deleteCollection: (ids, workflow) => ipcRenderer.invoke('assets:delete-collection', ids, workflow),
    delete: (id) => ipcRenderer.invoke('assets:delete', id),
    reveal: (id) => ipcRenderer.invoke('assets:reveal', id),
    revealCollection: (id) => ipcRenderer.invoke('assets:reveal-collection', id),
    revealPath: (path) => ipcRenderer.invoke('assets:reveal-path', path),
    copyMedia: (path, type) => ipcRenderer.invoke('assets:copy-media', path, type),
    exportMetadata: (id) => ipcRenderer.invoke('assets:export-metadata', id),
    exportPackage: (id) => ipcRenderer.invoke('assets:export-package', id),
    importPackage: () => ipcRenderer.invoke('assets:import-package'),
    promote: (paths, kind, collectionName) => ipcRenderer.invoke('assets:promote', paths, kind, collectionName),
    saveStylePrompt: (name, prompt, modelId, intent) => ipcRenderer.invoke('assets:save-style-prompt', name, prompt, modelId, intent),
    status: () => ipcRenderer.invoke('assets:status'),
    relink: (id, mode) => ipcRenderer.invoke('assets:relink', id, mode),
    relinkMissing: () => ipcRenderer.invoke('assets:relink-missing'),
  },
  assistant: {
    rewrite: (provider, text, instruction, model) => ipcRenderer.invoke('assistant:rewrite', provider, text, instruction, model),
  },
  generation: {
    run: (request: GenerationRequest) => ipcRenderer.invoke('generation:run', request),
    cancel: (nodeId) => ipcRenderer.invoke('generation:cancel', nodeId),
    estimate: (request: GenerationRequest) => ipcRenderer.invoke('generation:estimate', request),
    onProgress: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: { nodeId: string; message: string; status: string }) => listener(payload)
      ipcRenderer.on('generation:progress', handler)
      return () => ipcRenderer.removeListener('generation:progress', handler)
    },
  },
  history: {
    list: () => ipcRenderer.invoke('history:list'),
  },
  experiments: {
    recordWinner: (record) => ipcRenderer.invoke('experiments:record-winner', record),
  },
}

contextBridge.exposeInMainWorld('prism', api)
