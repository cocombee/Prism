import type { CameraTesterAPI } from '../camera-tester/api'
import { ArtifactStore, type ArtifactResolution, type RenderArtifact } from './artifacts'
import { CleanThreeFrameRenderer, renderDimensions } from './cleanRenderer'
import type { CameraDocument } from './model'
import type { RenderRange } from './renderRange'

export type CameraRenderProgress = { completed: number; total: number; jobId: string }
type FrameRenderer = { render(frame: number): { bytes: Uint8Array }; dispose(): void }

export async function runCameraRender(input: {
  nodeId: string
  document: CameraDocument
  range: RenderRange
  store: ArtifactStore
  api: Pick<CameraTesterAPI, 'startRender' | 'writeRenderFrame' | 'finishRender' | 'cancelRender' | 'mediaUrl'>
  signal?: AbortSignal
  rendererFactory?: (document: CameraDocument, dimensions: { width: number; height: number }) => FrameRenderer
  onProgress?(completed: number, total: number, jobId: string): void
}): Promise<{ artifact: RenderArtifact; resolution: ArtifactResolution; jobId: string }> {
  const frozenDocument = structuredClone(input.document)
  const frozenRange = { ...input.range }
  const dimensions = renderDimensions(frozenDocument.resolution, frozenDocument.aspect)
  const pending = input.store.begin(frozenDocument, frozenRange.scope, { start: frozenRange.start, end: frozenRange.end })
  const jobId = `job-${pending.id}`
  const renderer = (input.rendererFactory || ((document, size) => new CleanThreeFrameRenderer(document, size)))(frozenDocument, dimensions)
  let started = false
  let abortHandler: (() => void) | null = null
  try {
    input.onProgress?.(0, frozenRange.frameCount, jobId)
    await input.api.startRender({ jobId, nodeId: input.nodeId, artifactId: pending.id, width: dimensions.width, height: dimensions.height, fps: frozenDocument.fps, startFrame: frozenRange.start, endFrame: frozenRange.end })
    started = true
    abortHandler = () => { if (started) void input.api.cancelRender(jobId).catch(() => undefined) }
    input.signal?.addEventListener('abort', abortHandler, { once: true })
    if (input.signal?.aborted) throw new Error('RENDER_CANCELLED')
    for (let index = 0; index < frozenRange.frameCount; index += 1) {
      if (input.signal?.aborted) throw new Error('RENDER_CANCELLED')
      const frame = renderer.render(frozenRange.start + index)
      const progress = await input.api.writeRenderFrame(jobId, index, frame.bytes)
      input.onProgress?.(progress.completed, progress.total, jobId)
    }
    if (input.signal?.aborted) throw new Error('RENDER_CANCELLED')
    const media = await input.api.finishRender(jobId)
    started = false
    if (input.signal?.aborted) throw new Error('RENDER_CANCELLED')
    const artifact = await input.store.promote(pending.id, media)
    const resolution = await input.api.mediaUrl(input.nodeId, artifact.id, artifact.locator)
    input.store.resolve(artifact.id, resolution)
    return { artifact, resolution, jobId }
  } catch (error) {
    input.store.cancel(pending.id)
    if (started) await input.api.cancelRender(jobId).catch(() => undefined)
    throw error
  } finally {
    if (abortHandler) input.signal?.removeEventListener('abort', abortHandler)
    renderer.dispose()
  }
}
