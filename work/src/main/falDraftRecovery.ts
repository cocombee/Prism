import type { GenerationRequest, GenerationResult } from '../shared/types'
import { assertFalMediaUrl } from '../shared/falNativeExecution'
import { createVideoDraftReceipt, falDraftRequestCreatedAt, supportsFalSeedanceDraft, type VideoDraftReceipt } from '../shared/videoDraft'

export interface FalDraftRecoveryDependencies {
  assertCurrent(): void
  accountFingerprint(): Promise<string>
  /** Reads an existing owned request and validates the provider output contract. No submission. */
  result(endpointId: string, requestId: string, signal?: AbortSignal): Promise<{ requestId: string; data: unknown }>
  persist(url: string, receipt: VideoDraftReceipt, signal?: AbortSignal): Promise<{ path: string; url: string }>
}
export async function executeFalDraftRecovery(request: GenerationRequest, dependencies: FalDraftRecoveryDependencies, signal?: AbortSignal): Promise<GenerationResult> {
  const current = () => { signal?.throwIfAborted(); dependencies.assertCurrent() }
  current()
  const source = request.falDraftRecovery
  if (request.kind !== 'video-generator' || request.quantity !== 1 || !source || !supportsFalSeedanceDraft(source.endpointId)) throw new Error('Choose one supported fal Seedance draft to recover.')
  const createdAt = falDraftRequestCreatedAt(source.requestId)
  const account = await dependencies.accountFingerprint(); current()
  const result = await dependencies.result(source.endpointId, source.requestId, signal); current()
  if (result.requestId !== source.requestId) throw new Error('The recovered provider request identity changed.')
  const data = result.data as { draft_id?: unknown; video?: { url?: unknown; content_type?: unknown } } | undefined
  const receipt = createVideoDraftReceipt('fal', source.endpointId, data?.draft_id, request.nodeId, account, createdAt)
  if (typeof data?.video?.url !== 'string') throw new Error('The existing request did not return a video.')
  assertFalMediaUrl(data.video.url)
  const media = await dependencies.persist(data.video.url, receipt, signal); current()
  return { requestId: source.requestId, modelId: source.endpointId, outputPath: media.path, outputUrl: media.url, outputType: 'video', videoDraft: receipt }
}
