import type { GenerationRequest, StudioNodeData } from './types'
import { findVideoModel } from './videoModels'
import { activeGeneratedResult } from './generatedMedia'

export type VideoDraftProvider = 'fal' | 'byteplus'
export interface VideoDraftReceipt {
  version: 1
  provider: VideoDraftProvider
  modelId: string
  draftId: string
  nodeId: string
  accountFingerprint: string
  createdAt: string
  expiresAt: string
  status: 'draft' | 'final'
  sourcePath?: string
  settings?: { duration?: string | number; aspectRatio?: string; generateAudio?: boolean }
}
export const FAL_SEEDANCE_DRAFT_COMPLETE = 'bytedance/seedance-2.5/draft/complete'
export const BYTEPLUS_SEEDANCE_DRAFT_MODEL = 'dreamina-seedance-2-5-260628'
export function supportsFalSeedanceDraft(endpointId: string): boolean {
  return /^(?:bytedance|fal-ai)\/seedance-2\.5\/(?:us\/)?(?:text-to-video|image-to-video|reference-to-video)$/.test(endpointId)
}
/** Omni's published 360p preview is a resolution, not a Seedance draft token. */
export function videoDraftResolutionLabel(endpointId: string, resolution: unknown): string | undefined {
  return /^google\/gemini-omni-flash\/v1\.1\/(?:text-to-video|image-to-video|reference-to-video)$/.test(endpointId) && resolution === '360p' ? 'Draft · 360p' : undefined
}
export function videoDraftProvider(data: Pick<StudioNodeData, 'falNative' | 'higgsfieldNative' | 'videoEngine'>): VideoDraftProvider | undefined {
  if (data.higgsfieldNative) return undefined
  if (data.falNative) return supportsFalSeedanceDraft(data.falNative.endpointId) ? 'fal' : undefined
  const route = findVideoModel(data.videoEngine)
  return route?.provider === 'byteplus' && route.apiModelId === BYTEPLUS_SEEDANCE_DRAFT_MODEL ? 'byteplus' : undefined
}
export function assertVideoDraftReceipt(value: unknown, now = Date.now()): asserts value is VideoDraftReceipt {
  const r = value as Partial<VideoDraftReceipt> | undefined
  if (!r || r.version !== 1 || !['fal', 'byteplus'].includes(r.provider || '') || r.status !== 'draft'
    || typeof r.draftId !== 'string' || !r.draftId.trim() || r.draftId.length > (r.provider === 'fal' ? 8192 : 256)
    || typeof r.nodeId !== 'string' || !r.nodeId || typeof r.modelId !== 'string'
    || !/^[a-f0-9]{64}$/.test(r.accountFingerprint || '')
    || !Number.isFinite(Date.parse(r.createdAt || '')) || !Number.isFinite(Date.parse(r.expiresAt || ''))
    || Date.parse(r.expiresAt!) !== Date.parse(r.createdAt!) + 7 * 86400_000) throw new Error('This result has no valid linked draft receipt. Generate a new draft.')
  if (r.provider === 'fal' ? !supportsFalSeedanceDraft(r.modelId) : r.modelId !== BYTEPLUS_SEEDANCE_DRAFT_MODEL) throw new Error('This model has no verified draft completion route.')
  if (now >= Date.parse(r.expiresAt!)) throw new Error('This draft expired after seven days. Generate a new draft.')
}
export function createVideoDraftReceipt(provider: VideoDraftProvider, modelId: string, draftId: unknown, nodeId: string, accountFingerprint: string, createdAt: string, settings?: VideoDraftReceipt['settings']): VideoDraftReceipt {
  const receipt: VideoDraftReceipt = { version: 1, provider, modelId, draftId: typeof draftId === 'string' ? draftId : '', nodeId, accountFingerprint, createdAt, expiresAt: new Date(Date.parse(createdAt) + 7 * 86400_000).toISOString(), status: 'draft', ...(settings ? { settings } : {}) }
  assertVideoDraftReceipt(receipt)
  return receipt
}
/** fal's UUIDv7 queue IDs carry the original submission timestamp, not recovery time. */
export function falDraftRequestCreatedAt(requestId: string, now = Date.now()): string {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) throw new Error('Recover Draft requires the original fal UUIDv7 request ID.')
  const timestamp = parseInt(requestId.replace(/-/g, '').slice(0, 12), 16)
  if (timestamp > now + 60000) throw new Error('The draft request timestamp is in the future.')
  if (now >= timestamp + 7 * 86400_000) throw new Error('This draft expired after seven days.')
  return new Date(timestamp).toISOString()
}
/** The final request contains no regenerated prompt, reference, seed or timing. */
export function videoDraftCompletionInput(receipt: VideoDraftReceipt, accountFingerprint: string, now = Date.now()) {
  assertVideoDraftReceipt(receipt, now)
  if (receipt.accountFingerprint !== accountFingerprint) throw new Error('Select the original account that generated this draft before rendering its final.')
  return receipt.provider === 'fal'
    ? { draft_id: receipt.draftId, resolution: '1080p', codec: 'auto' }
    : { model: receipt.modelId, content: [{ type: 'draft_task' as const, draft_task: { id: receipt.draftId } }], resolution: '1080p', watermark: false as const }
}
export function selectedVideoDraft(data: StudioNodeData): VideoDraftReceipt | undefined {
  const result = activeGeneratedResult(data)
  if (result?.type !== 'video' || result.videoDraft?.provider !== videoDraftProvider(data)) return undefined
  const modelId = data.falNative?.endpointId || findVideoModel(data.videoEngine)?.apiModelId
  if (result.videoDraft?.modelId.replace(/^fal-ai\//, 'bytedance/') !== modelId?.replace(/^fal-ai\//, 'bytedance/')) return undefined
  const receipt = result.videoDraft?.status === 'final' && result.videoDraft.sourcePath ? { ...result.videoDraft, status: 'draft' as const } : result.videoDraft
  try { assertVideoDraftReceipt(receipt); return receipt } catch { return undefined }
}
export function videoDraftCompletionRequest(nodeId: string, data: StudioNodeData): GenerationRequest {
  const result = activeGeneratedResult(data), provider = videoDraftProvider(data)
  const sourcePath = result?.videoDraft?.status === 'final' ? result.videoDraft.sourcePath : result?.path
  if (data.kind !== 'video-generator' || !provider || !result || sourcePath !== data.draftCompletionPath || !selectedVideoDraft(data)) throw new Error('Select the original draft result and choose 1080p from Draft again.')
  return { nodeId, kind: 'video-generator', quantity: 1, draftCompletion: { provider, outputPath: sourcePath! } }
}

/** An explicit generation edit exits linked-final intent; existing takes survive. */
export function videoDraftModelTransition(current: StudioNodeData, patch: Partial<StudioNodeData>): Partial<StudioNodeData> {
  if(current.kind!=='video-generator'||!current.draftCompletionPath)return patch
  const identity=(data:StudioNodeData)=>data.higgsfieldNative?`higgsfield:${data.higgsfieldNative.endpointId}`:data.falNative?`fal:${data.falNative.endpointId}`:`legacy:${data.videoEngine || ''}`
  const next={...current,...patch}
  const edited = identity(current)!==identity(next)
    || (['falNative','higgsfieldNative'] as const).some(key => Object.prototype.hasOwnProperty.call(patch,key) && JSON.stringify(current[key]?.values)!==JSON.stringify(next[key]?.values))
    || (['duration','aspectRatio','resolution','frameRate','generateAudio','quantity','motionCadence','motionCadenceMode','manualPromptDraft'] as const).some(key => Object.prototype.hasOwnProperty.call(patch,key) && current[key]!==next[key])
  // Explicit resolution-menu completion selection owns its path; never override it.
  return edited && !Object.prototype.hasOwnProperty.call(patch,'draftCompletionPath') ? {...patch,draftCompletionPath:undefined} : patch
}
