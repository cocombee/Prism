import type { VideoModelDefinition } from './videoModels'

export const BYTEPLUS_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3'
export const BYTEPLUS_CREATE_PATH = '/contents/generations/tasks'
export const BYTEPLUS_RETRIEVE_PATH = (taskId: string) => `/contents/generations/tasks/${encodeURIComponent(taskId)}`

export const BYTEPLUS_SEEDANCE_MODELS = [
  { id: 'dreamina-seedance-2-5-260628', label: 'Seedance 2.5' },
  { id: 'dreamina-seedance-2-0-260128', label: 'Seedance 2.0' },
  { id: 'dreamina-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast' },
  { id: 'dreamina-seedance-2-0-mini-260615', label: 'Seedance 2.0 Mini' },
] as const

const MODEL_IDS = new Set<string>(BYTEPLUS_SEEDANCE_MODELS.map((model) => model.id))

export type BytePlusReference =
  | { kind: 'image'; url: string; role: 'first_frame' | 'last_frame' | 'reference_image' }
  | { kind: 'video'; url: string; role: 'reference_video' }
  | { kind: 'audio'; url: string; role: 'reference_audio' }

export interface BytePlusSeedanceInput {
  route: VideoModelDefinition
  prompt: string
  media?: readonly BytePlusReference[]
  ratio?: string
  resolution?: string
  duration: number
  generateAudio?: boolean
  seed?: number
}

export type BytePlusContentItem =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string }; role: 'first_frame' | 'last_frame' | 'reference_image' }
  | { type: 'video_url'; video_url: { url: string }; role: 'reference_video' }
  | { type: 'audio_url'; audio_url: { url: string }; role: 'reference_audio' }

export interface BytePlusCreatePayload {
  model: string
  content: BytePlusContentItem[]
  ratio?: string
  resolution?: string
  duration: number
  generate_audio?: boolean
  watermark: false
  seed?: number
}

export function validateBytePlusSeedanceRoute(route: VideoModelDefinition): void {
  if (route.provider !== 'byteplus' || !route.id.startsWith('byteplus/')) throw new Error('Select an explicit BytePlus route.')
  if (!MODEL_IDS.has(route.apiModelId)) throw new Error('The route does not map to a supported BytePlus Seedance model.')
}

function validateMedia(route: VideoModelDefinition, media: readonly BytePlusReference[]): void {
  for (const item of media) {
    if (!item.url.trim()) throw new Error('Every BytePlus reference needs a URL.')
    if (item.kind === 'image' && !['first_frame', 'last_frame', 'reference_image'].includes(item.role)) throw new Error('Invalid BytePlus image role.')
    if (item.kind === 'video' && item.role !== 'reference_video') throw new Error('Invalid BytePlus video role.')
    if (item.kind === 'audio' && item.role !== 'reference_audio') throw new Error('Invalid BytePlus audio role.')
  }
  if (route.mode === 'text' && media.length) throw new Error('A BytePlus Text route cannot receive media.')
  if (route.mode === 'image') {
    if (!media.length || media.some((item) => item.kind !== 'image' || !['first_frame', 'last_frame'].includes(item.role))) throw new Error('A BytePlus Image route requires first_frame and optional last_frame images.')
    if (media[0].role !== 'first_frame' || media.length > 2 || media.filter((item) => item.role === 'first_frame').length !== 1 || media.filter((item) => item.role === 'last_frame').length > 1) throw new Error('Use one first_frame followed by at most one last_frame.')
  }
  if (route.mode === 'reference') {
    if (media.some((item) => item.role === 'first_frame' || item.role === 'last_frame')) throw new Error('Reference routes cannot mix first/last frames with references.')
    const limits = route.referenceLimits
    const counts = {
      images: media.filter((item) => item.kind === 'image').length,
      videos: media.filter((item) => item.kind === 'video').length,
      audios: media.filter((item) => item.kind === 'audio').length,
    }
    if (limits && counts.images > limits.images) throw new Error(`This route supports at most ${limits.images} images.`)
    if (limits && counts.videos > limits.videos) throw new Error(`This route supports at most ${limits.videos} videos.`)
    if (limits && counts.audios > limits.audios) throw new Error(`This route supports at most ${limits.audios} audios.`)
    if (limits && media.length > limits.total) throw new Error(`This route supports at most ${limits.total} references.`)
  }
}

function contentItem(item: BytePlusReference): BytePlusContentItem {
  if (item.kind === 'image') return { type: 'image_url', image_url: { url: item.url }, role: item.role }
  if (item.kind === 'video') return { type: 'video_url', video_url: { url: item.url }, role: item.role }
  return { type: 'audio_url', audio_url: { url: item.url }, role: item.role }
}

export function compileBytePlusSeedancePayload(input: BytePlusSeedanceInput): BytePlusCreatePayload {
  validateBytePlusSeedanceRoute(input.route)
  const prompt = input.prompt.trim()
  if (!prompt) throw new Error('BytePlus Seedance requires a prompt.')
  if (!input.route.durations.includes(input.duration)) throw new Error('Unsupported BytePlus duration.')
  if (input.ratio !== undefined && !input.route.ratios.includes(input.ratio)) throw new Error('Unsupported BytePlus ratio.')
  if (input.resolution !== undefined && !input.route.resolutions.includes(input.resolution)) throw new Error('Unsupported BytePlus resolution.')
  if (input.seed !== undefined && (!input.route.supportsSeed || !Number.isSafeInteger(input.seed))) throw new Error('This BytePlus route does not support that seed.')
  const media = input.media || []
  validateMedia(input.route, media)
  return {
    model: input.route.apiModelId,
    content: [{ type: 'text', text: prompt }, ...media.map(contentItem)],
    ...(input.ratio === undefined ? {} : { ratio: input.ratio }),
    ...(input.resolution === undefined ? {} : { resolution: input.resolution }),
    duration: input.duration,
    ...(input.generateAudio === undefined ? {} : { generate_audio: input.generateAudio }),
    watermark: false,
    ...(input.seed === undefined ? {} : { seed: input.seed }),
  }
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {} }
function text(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined }

export function parseBytePlusCreateResponse(value: unknown): { taskId: string } {
  const body = record(value)
  const taskId = text(body.id)
  if (!taskId) throw new Error('BytePlus create response did not include a task id.')
  return { taskId }
}

export type BytePlusNormalizedStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'expired'
export interface BytePlusTaskResult {
  taskId: string
  status: BytePlusNormalizedStatus
  terminal: boolean
  outputUrl?: string
  lastFrameUrl?: string
  usage?: Record<string, unknown>
  error?: { code: string; message: string }
}

export function parseBytePlusTaskResponse(value: unknown): BytePlusTaskResult {
  const body = record(value)
  const taskId = text(body.id)
  if (!taskId) throw new Error('BytePlus retrieve response did not include a task id.')
  const rawStatus = text(body.status)?.toLowerCase()
  const status: BytePlusNormalizedStatus = rawStatus === 'queued' || rawStatus === 'running' || rawStatus === 'succeeded' || rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'expired' ? rawStatus : 'failed'
  const content = record(body.content)
  const outputUrl = text(content.video_url)
  if (status === 'succeeded' && !outputUrl) return { taskId, status: 'failed', terminal: true, error: { code: 'missing_output', message: 'BytePlus succeeded without a video output URL.' } }
  const error = record(body.error)
  const normalized: BytePlusTaskResult = { taskId, status, terminal: !['queued', 'running'].includes(status) }
  if (outputUrl) normalized.outputUrl = outputUrl
  const lastFrameUrl = text(content.last_frame_url)
  if (lastFrameUrl) normalized.lastFrameUrl = lastFrameUrl
  if (body.usage && typeof body.usage === 'object') normalized.usage = { ...record(body.usage) }
  if (status === 'failed') normalized.error = { code: text(error.code) || (rawStatus ? 'provider_failed' : 'unknown_status'), message: text(error.message) || (rawStatus ? 'BytePlus task failed.' : 'BytePlus returned an unknown task status.') }
  return normalized
}
