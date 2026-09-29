import type { LocalRenderProgress, LocalRenderResult, LocalRenderStart } from './localRenderEngine'
import type { ObjectAssistantIpcRequest } from './objectAssistantIpc'
import type { CameraNativeKeyPayload } from './nativeCameraKey'

export interface CameraTesterAPI {
  loadNodeState(nodeId: string): Promise<unknown | null>
  saveNodeState(nodeId: string, state: unknown): Promise<void>
  mediaUrl(nodeId: string, artifactId: string, locator: string): Promise<{ ok: true; url: string } | { ok: false; reason: string }>
  revealMedia(nodeId: string, artifactId: string, locator: string): Promise<boolean>
  deleteMedia(nodeId: string, artifactId: string, locator: string): Promise<boolean>
  startRender(request: LocalRenderStart): Promise<{ jobId: string; total: number }>
  writeRenderFrame(jobId: string, index: number, bytes: Uint8Array): Promise<LocalRenderProgress>
  finishRender(jobId: string): Promise<LocalRenderResult>
  cancelRender(jobId: string): Promise<void>
  objectAssistantStatus(): Promise<{ connected: boolean; vision: boolean; reason?: string }>
  createObjectRecipe(request: ObjectAssistantIpcRequest): Promise<unknown>
  onNativeKey(listener: (event: CameraNativeKeyPayload) => void): () => void
}
declare global { interface Window { cameraTester: CameraTesterAPI } }
