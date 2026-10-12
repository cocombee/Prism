export type VideoModelFamily = 'wan' | 'seedance' | 'kling' | 'veo'
export type VideoModelMode = 'text' | 'image' | 'reference' | 'first-last' | 'extend'

export interface VideoModelDefinition {
  id: string
  provider: 'fal' | 'byteplus'
  apiModelId: string
  label: string
  shortLabel: string
  family: VideoModelFamily
  mode: VideoModelMode
  ratios: readonly string[]
  durations: readonly (number | 'auto')[]
  durationRange?: Readonly<{ min: number; max: number; step: number }>
  resolutions: readonly string[]
  frameRates: readonly number[]
  fixedResolutionLabel?: string
  fixedFrameRate?: number
  fixedAspectRatioLabel?: string
  nativeAudio: boolean
  menuSection: 'wan' | 'seedance-2.5' | 'seedance-2' | 'byteplus-seedance-2.5' | 'byteplus-seedance-2' | 'kling' | 'veo'
  fast?: boolean
  mini?: boolean
  fourK?: boolean
  referenceLimit?: number
  referenceLimits?: Readonly<{ images: number; videos: number; audios: number; total: number }>
  supportsBitrateMode?: boolean
  supportsSeed?: boolean
  /** Present only after exact provider/model field verification. */
  nativeShutter?: {
    field: 'shutter_angle' | 'shutter_speed'
    representation: 'degrees' | 'reciprocal-denominator'
  }
}

export function closedVideoModelLabel(model: Pick<VideoModelDefinition, 'shortLabel'>): string {
  return `${model.shortLabel}…`
}

/** Visual animation cadence choices. These never masquerade as encoded output FPS. */
export const MOTION_CADENCES = [12, 16, 24, 35, 50, 60] as const

export function knownOutputFrameRate(model: VideoModelDefinition, selectedFrameRate?: number): number | undefined {
  if (model.frameRates.length) return selectedFrameRate && model.frameRates.includes(selectedFrameRate) ? selectedFrameRate : model.frameRates[0]
  return model.fixedFrameRate
}

/** Actual encoded capture/output FPS. Visual Motion FPS is intentionally excluded. */
export function effectiveOutputFrameRate(model: VideoModelDefinition, selectedFrameRate?: number): number {
  return knownOutputFrameRate(model, selectedFrameRate) || selectedFrameRate || 24
}

export function motionCadenceOptions(model: VideoModelDefinition, selectedFrameRate?: number): number[] {
  const outputFrameRate = knownOutputFrameRate(model, selectedFrameRate)
  return outputFrameRate ? MOTION_CADENCES.filter((cadence) => cadence <= outputFrameRate) : [...MOTION_CADENCES]
}

export function normalizedMotionCadence(model: VideoModelDefinition, selectedFrameRate?: number, cadence?: number): number | undefined {
  const legal = motionCadenceOptions(model, selectedFrameRate)
  if (cadence && legal.includes(cadence)) return cadence
  if (legal.includes(24)) return 24
  return [...legal].reverse().find((value) => value < 24) ?? legal[0]
}

const SEEDANCE_RATIOS = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const
const KLING_RATIOS = ['16:9', '9:16', '1:1'] as const
const VEO_FIXED_RATIOS = ['16:9', '9:16'] as const
const VEO_INPUT_RATIOS = ['auto', '16:9', '9:16'] as const
const SEEDANCE_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const
const SEEDANCE_25_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] as const
const KLING_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const
const VEO_DURATIONS = [4, 6, 8] as const

function seedance(id: string, label: string, mode: VideoModelMode, options: { fast?: boolean; mini?: boolean; version?: '2.0' | '2.5' } = {}): VideoModelDefinition {
  const version = options.version || '2.0'
  const compactTier = Boolean(options.fast || options.mini || version === '2.5')
  const referenceLimits = mode === 'reference'
    ? version === '2.5'
      ? { images: 30, videos: 10, audios: 10, total: 50 }
      : { images: 9, videos: 3, audios: 3, total: 12 }
    : undefined
  return {
    id,
    provider: 'fal',
    apiModelId: id,
    label,
    shortLabel: `Seedance ${version === '2.0' ? '2' : version}${options.fast ? ' Fast' : options.mini ? ' Mini' : ''}`,
    family: 'seedance',
    menuSection: version === '2.5' ? 'seedance-2.5' : 'seedance-2',
    mode,
    ratios: version === '2.5' && mode === 'image' ? [] : SEEDANCE_RATIOS,
    durations: version === '2.5' ? SEEDANCE_25_DURATIONS : SEEDANCE_DURATIONS,
    resolutions: compactTier ? ['480p', '720p'] : ['480p', '720p', '1080p', '4k'],
    frameRates: [],
    fixedFrameRate: version === '2.5' ? 24 : undefined,
    fixedAspectRatioLabel: version === '2.5' && mode === 'image' ? 'From Input' : undefined,
    nativeAudio: true,
    fast: options.fast,
    mini: options.mini,
    referenceLimit: referenceLimits?.total || (mode === 'image' ? 2 : 0),
    referenceLimits,
    supportsBitrateMode: version === '2.0' && !options.mini,
    supportsSeed: version === '2.0' && !options.mini,
  }
}

function byteplusSeedance(id: string, apiModelId: string, label: string, mode: VideoModelMode, options: { fast?: boolean; mini?: boolean; version?: '2.0' | '2.5' } = {}): VideoModelDefinition {
  const model = seedance(id, label, mode, options)
  return { ...model, provider: 'byteplus', apiModelId, menuSection: options.version === '2.5' ? 'byteplus-seedance-2.5' : 'byteplus-seedance-2', resolutions: options.fast || options.mini ? ['480p', '720p'] : options.version === '2.5' ? ['480p', '720p', '1080p'] : ['480p', '720p', '1080p', '4k'], supportsSeed: !options.mini }
}

function kling(id: string, label: string, mode: VideoModelMode, options: { short?: string; fourK?: boolean; fast?: boolean } = {}): VideoModelDefinition {
  return { id, provider: 'fal', apiModelId: id, label, shortLabel: options.short || label.replace(/ · .*/, ''), family: 'kling', menuSection: 'kling', mode, ratios: mode === 'image' ? [] : KLING_RATIOS, durations: KLING_DURATIONS, resolutions: [], frameRates: [], fixedResolutionLabel: options.fourK ? '4K' : 'Native', fixedAspectRatioLabel: mode === 'image' ? 'From Input' : undefined, nativeAudio: true, fourK: options.fourK, fast: options.fast, referenceLimit: mode === 'reference' ? (options.fourK ? 7 : 4) : mode === 'image' ? 2 : 0 }
}

function veo(id: string, label: string, mode: VideoModelMode, options: { fast?: boolean; lite?: boolean } = {}): VideoModelDefinition {
  const duration = mode === 'extend' ? [7] : mode === 'reference' || (options.lite && mode === 'first-last') ? [8] : VEO_DURATIONS
  const ratios = mode === 'image' || mode === 'first-last' || mode === 'extend' ? VEO_INPUT_RATIOS : VEO_FIXED_RATIOS
  return { id, provider: 'fal', apiModelId: id, label, shortLabel: `Veo 3.1${options.fast ? ' Fast' : options.lite ? ' Lite' : ''}`, family: 'veo', menuSection: 'veo', mode, ratios, durations: duration, resolutions: options.lite ? ['720p', '1080p'] : ['720p', '1080p', '4k'], frameRates: [], fixedFrameRate: 24, nativeAudio: true, fast: options.fast, referenceLimit: mode === 'first-last' ? 2 : mode === 'reference' ? 3 : mode === 'image' || mode === 'extend' ? 1 : 0 }
}

export const VIDEO_MODELS: readonly VideoModelDefinition[] = [
  { id: 'wan-controlled', provider: 'fal', apiModelId: 'wan-controlled', label: 'Wan 2.2 · Controlled FPS', shortLabel: 'Wan FPS', family: 'wan', menuSection: 'wan', mode: 'text', ratios: ['16:9', '9:16', '1:1'], durations: [], resolutions: ['580p', '720p'], frameRates: [12, 16, 24, 25, 30, 50, 60], nativeAudio: false },

  seedance('bytedance/seedance-2.5/text-to-video', 'Seedance 2.5 · Text', 'text', { version: '2.5' }),
  seedance('bytedance/seedance-2.5/image-to-video', 'Seedance 2.5 · Image', 'image', { version: '2.5' }),
  seedance('bytedance/seedance-2.5/reference-to-video', 'Seedance 2.5 · References', 'reference', { version: '2.5' }),

  seedance('bytedance/seedance-2.0/text-to-video', 'Seedance 2 · Text', 'text'),
  seedance('bytedance/seedance-2.0/fast/text-to-video', 'Seedance 2 Fast · Text', 'text', { fast: true }),
  seedance('bytedance/seedance-2.0/mini/text-to-video', 'Seedance 2 Mini · Text', 'text', { mini: true }),
  seedance('bytedance/seedance-2.0/image-to-video', 'Seedance 2 · Image', 'image'),
  seedance('bytedance/seedance-2.0/fast/image-to-video', 'Seedance 2 Fast · Image', 'image', { fast: true }),
  seedance('bytedance/seedance-2.0/mini/image-to-video', 'Seedance 2 Mini · Image', 'image', { mini: true }),
  seedance('bytedance/seedance-2.0/reference-to-video', 'Seedance 2 · References', 'reference'),
  seedance('bytedance/seedance-2.0/fast/reference-to-video', 'Seedance 2 Fast · References', 'reference', { fast: true }),
  seedance('bytedance/seedance-2.0/mini/reference-to-video', 'Seedance 2 Mini · References', 'reference', { mini: true }),

  byteplusSeedance('byteplus/seedance-2.5/text-to-video', 'dreamina-seedance-2-5-260628', 'BytePlus Seedance 2.5 · Text', 'text', { version: '2.5' }),
  byteplusSeedance('byteplus/seedance-2.5/image-to-video', 'dreamina-seedance-2-5-260628', 'BytePlus Seedance 2.5 · Image', 'image', { version: '2.5' }),
  byteplusSeedance('byteplus/seedance-2.5/reference-to-video', 'dreamina-seedance-2-5-260628', 'BytePlus Seedance 2.5 · References', 'reference', { version: '2.5' }),
  byteplusSeedance('byteplus/seedance-2.0/text-to-video', 'dreamina-seedance-2-0-260128', 'BytePlus Seedance 2 · Text', 'text'),
  byteplusSeedance('byteplus/seedance-2.0/image-to-video', 'dreamina-seedance-2-0-260128', 'BytePlus Seedance 2 · Image', 'image'),
  byteplusSeedance('byteplus/seedance-2.0/reference-to-video', 'dreamina-seedance-2-0-260128', 'BytePlus Seedance 2 · References', 'reference'),
  byteplusSeedance('byteplus/seedance-2.0-fast/text-to-video', 'dreamina-seedance-2-0-fast-260128', 'BytePlus Seedance 2 Fast · Text', 'text', { fast: true }),
  byteplusSeedance('byteplus/seedance-2.0-fast/image-to-video', 'dreamina-seedance-2-0-fast-260128', 'BytePlus Seedance 2 Fast · Image', 'image', { fast: true }),
  byteplusSeedance('byteplus/seedance-2.0-fast/reference-to-video', 'dreamina-seedance-2-0-fast-260128', 'BytePlus Seedance 2 Fast · References', 'reference', { fast: true }),
  byteplusSeedance('byteplus/seedance-2.0-mini/text-to-video', 'dreamina-seedance-2-0-mini-260615', 'BytePlus Seedance 2 Mini · Text', 'text', { mini: true }),
  byteplusSeedance('byteplus/seedance-2.0-mini/image-to-video', 'dreamina-seedance-2-0-mini-260615', 'BytePlus Seedance 2 Mini · Image', 'image', { mini: true }),
  byteplusSeedance('byteplus/seedance-2.0-mini/reference-to-video', 'dreamina-seedance-2-0-mini-260615', 'BytePlus Seedance 2 Mini · References', 'reference', { mini: true }),

  kling('fal-ai/kling-video/v3/standard/text-to-video', 'Kling V3 Standard · Text', 'text', { short: 'Kling V3 Std' }),
  kling('fal-ai/kling-video/v3/standard/image-to-video', 'Kling V3 Standard · Image', 'image', { short: 'Kling V3 Std' }),
  kling('fal-ai/kling-video/v3/pro/text-to-video', 'Kling V3 Pro · Text', 'text', { short: 'Kling V3 Pro' }),
  kling('fal-ai/kling-video/v3/pro/image-to-video', 'Kling V3 Pro · Image', 'image', { short: 'Kling V3 Pro' }),
  kling('fal-ai/kling-video/v3/turbo/standard/text-to-video', 'Kling V3 Turbo Standard · Text', 'text', { short: 'Kling Turbo', fast: true }),
  kling('fal-ai/kling-video/v3/turbo/standard/image-to-video', 'Kling V3 Turbo Standard · Image', 'image', { short: 'Kling Turbo', fast: true }),
  kling('fal-ai/kling-video/v3/turbo/pro/text-to-video', 'Kling V3 Turbo Pro · Text', 'text', { short: 'Kling Turbo Pro', fast: true }),
  kling('fal-ai/kling-video/v3/turbo/pro/image-to-video', 'Kling V3 Turbo Pro · Image', 'image', { short: 'Kling Turbo Pro', fast: true }),
  kling('fal-ai/kling-video/v3/4k/text-to-video', 'Kling V3 4K · Text', 'text', { short: 'Kling V3 4K', fourK: true }),
  kling('fal-ai/kling-video/v3/4k/image-to-video', 'Kling V3 4K · Image', 'image', { short: 'Kling V3 4K', fourK: true }),

  kling('fal-ai/kling-video/o3/standard/text-to-video', 'Kling O3 Standard · Text', 'text', { short: 'Kling O3 Std' }),
  kling('fal-ai/kling-video/o3/standard/image-to-video', 'Kling O3 Standard · Image', 'image', { short: 'Kling O3 Std' }),
  kling('fal-ai/kling-video/o3/standard/reference-to-video', 'Kling O3 Standard · References', 'reference', { short: 'Kling O3 Std' }),
  kling('fal-ai/kling-video/o3/pro/text-to-video', 'Kling O3 Pro · Text', 'text', { short: 'Kling O3 Pro' }),
  kling('fal-ai/kling-video/o3/pro/image-to-video', 'Kling O3 Pro · Image', 'image', { short: 'Kling O3 Pro' }),
  kling('fal-ai/kling-video/o3/pro/reference-to-video', 'Kling O3 Pro · References', 'reference', { short: 'Kling O3 Pro' }),
  kling('fal-ai/kling-video/o3/4k/text-to-video', 'Kling O3 4K · Text', 'text', { short: 'Kling O3 4K', fourK: true }),
  kling('fal-ai/kling-video/o3/4k/image-to-video', 'Kling O3 4K · Image', 'image', { short: 'Kling O3 4K', fourK: true }),
  kling('fal-ai/kling-video/o3/4k/reference-to-video', 'Kling O3 4K · References', 'reference', { short: 'Kling O3 4K', fourK: true }),

  veo('fal-ai/veo3.1', 'Veo 3.1 · Text', 'text'),
  veo('fal-ai/veo3.1/fast', 'Veo 3.1 Fast · Text', 'text', { fast: true }),
  veo('fal-ai/veo3.1/image-to-video', 'Veo 3.1 · Image', 'image'),
  veo('fal-ai/veo3.1/fast/image-to-video', 'Veo 3.1 Fast · Image', 'image', { fast: true }),
  veo('fal-ai/veo3.1/first-last-frame-to-video', 'Veo 3.1 · First + Last', 'first-last'),
  veo('fal-ai/veo3.1/fast/first-last-frame-to-video', 'Veo 3.1 Fast · First + Last', 'first-last', { fast: true }),
  veo('fal-ai/veo3.1/reference-to-video', 'Veo 3.1 · References', 'reference'),
  veo('fal-ai/veo3.1/fast/reference-to-video', 'Veo 3.1 Fast · References', 'reference', { fast: true }),
  veo('fal-ai/veo3.1/extend-video', 'Veo 3.1 · Extend', 'extend'),
  veo('fal-ai/veo3.1/fast/extend-video', 'Veo 3.1 Fast · Extend', 'extend', { fast: true }),
  veo('fal-ai/veo3.1/lite', 'Veo 3.1 Lite · Text', 'text', { lite: true }),
  veo('fal-ai/veo3.1/lite/image-to-video', 'Veo 3.1 Lite · Image', 'image', { lite: true }),
  veo('fal-ai/veo3.1/lite/first-last-frame-to-video', 'Veo 3.1 Lite · First + Last', 'first-last', { lite: true }),
] as const

const LEGACY_VIDEO_MODELS: Record<string, string> = {
  'kling-v3': 'fal-ai/kling-video/v3/standard/text-to-video',
  'seedance-reference': 'bytedance/seedance-2.0/reference-to-video',
}

/** Exact request lookup; an ambiguous provider API ID does not identify a route. */
export function findVideoModel(id?: string): VideoModelDefinition | undefined {
  const resolved = LEGACY_VIDEO_MODELS[id || ''] || id || 'wan-controlled'
  const registered = VIDEO_MODELS.find((model) => model.id === resolved)
  if (registered) return registered
  const apiMatches = VIDEO_MODELS.filter((model) => model.apiModelId === resolved)
  return apiMatches.length === 1 ? apiMatches[0] : undefined
}

/** Display-only fallback. Request paths must validate with findVideoModel first. */
export function resolveVideoModel(id?: string): VideoModelDefinition {
  return findVideoModel(id) || VIDEO_MODELS[0]
}

export function videoModelDurationInventory(id?: string, frameRate = 24): Array<number | 'auto'> {
  const model = resolveVideoModel(id)
  if (model.durationRange) {
    const { min, max, step } = model.durationRange
    const count = Math.floor((max - min) / step) + 1
    return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(3)))
  }
  if (model.family !== 'wan') return [...model.durations]
  const fps = Math.min(Math.max(Math.round(frameRate || 24), 4), 60)
  const minimum = Math.max(1, Math.ceil(17 / fps))
  const maximum = Math.max(minimum, Math.floor(161 / fps))
  return Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index)
}

export function formatDurationSeconds(value: number): string {
  return `${value.toFixed(1)}s`
}

/** Selects the closest route that can legally receive independent references. */
export function referenceCapableVideoEngine(id?: string): string {
  const model = resolveVideoModel(id)
  if (model.mode === 'reference') return model.id
  if (model.family === 'seedance') {
    const prefix = model.provider === 'byteplus' ? 'byteplus' : 'bytedance'
    if (model.id.includes('seedance-2.5')) return `${prefix}/seedance-2.5/reference-to-video`
    if (model.provider === 'byteplus') {
      if (model.mini) return 'byteplus/seedance-2.0-mini/reference-to-video'
      return model.fast ? 'byteplus/seedance-2.0-fast/reference-to-video' : 'byteplus/seedance-2.0/reference-to-video'
    }
    if (model.mini) return 'bytedance/seedance-2.0/mini/reference-to-video'
    return model.fast ? 'bytedance/seedance-2.0/fast/reference-to-video' : 'bytedance/seedance-2.0/reference-to-video'
  }
  if (model.family === 'veo') return model.fast ? 'fal-ai/veo3.1/fast/reference-to-video' : 'fal-ai/veo3.1/reference-to-video'
  if (model.family === 'kling') {
    const tier = model.fourK ? '4k' : /\/pro\//.test(model.id) ? 'pro' : 'standard'
    return `fal-ai/kling-video/o3/${tier}/reference-to-video`
  }
  return 'bytedance/seedance-2.0/reference-to-video'
}

export function defaultVideoRatio(model: VideoModelDefinition): string | undefined {
  return model.ratios.includes('16:9') ? '16:9' : model.ratios.find((ratio) => ratio !== 'auto') || model.ratios[0]
}

export function resolvedVideoRatio(model: VideoModelDefinition, value?: string): string | undefined {
  return value && value !== 'auto' && model.ratios.includes(value) ? value : defaultVideoRatio(model)
}

export const VIDEO_MODEL_MENU_SECTIONS = ['wan', 'seedance-2.5', 'seedance-2', 'byteplus-seedance-2.5', 'byteplus-seedance-2', 'kling', 'veo'] as const
