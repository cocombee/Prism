import type { GenerationRequest } from './types'

export type ImageResolution = NonNullable<GenerationRequest['imageResolution']>

export const FAL_IMAGE_MODELS = {
  fluxSchnell: 'fal-ai/flux/schnell',
  fluxKontext: 'fal-ai/flux-pro/kontext',
  nanoBanana: 'fal-ai/nano-banana-pro',
  nanoBananaEdit: 'fal-ai/nano-banana-pro/edit',
  seedream5ProEdit: 'bytedance/seedream/v5/pro/edit',
  gptImage2Edit: 'openai/gpt-image-2/edit',
} as const

export const FAL_REFERENCE_IMAGE_MODELS = [
  FAL_IMAGE_MODELS.nanoBananaEdit,
  FAL_IMAGE_MODELS.seedream5ProEdit,
  FAL_IMAGE_MODELS.gptImage2Edit,
  FAL_IMAGE_MODELS.fluxKontext,
] as const

// Legacy compatibility only. Active next-generation semantic/image surfaces own the
// reference-capable catalog through FAL_REFERENCE_IMAGE_MODELS.
export const FAL_CHARACTER_COMPLETION_MODELS = FAL_REFERENCE_IMAGE_MODELS

export const IMAGE_MODEL_RESOLUTION_OPTIONS: Readonly<Record<string, readonly ImageResolution[]>> = {
  [FAL_IMAGE_MODELS.fluxSchnell]: ['1K'],
  [FAL_IMAGE_MODELS.fluxKontext]: ['1K'],
  [FAL_IMAGE_MODELS.nanoBanana]: ['1K', '2K', '4K'],
  [FAL_IMAGE_MODELS.nanoBananaEdit]: ['1K', '2K', '4K'],
  [FAL_IMAGE_MODELS.seedream5ProEdit]: ['1K', '2K'],
  [FAL_IMAGE_MODELS.gptImage2Edit]: ['1K', '2K', '4K'],
  'gpt-image-2': ['1K'],
  'gemini-3.1-flash-image': ['0.5K', '1K', '2K', '4K'],
  'gemini-3.1-flash-lite-image': ['1K'],
  'gemini-3-pro-image': ['1K', '2K', '4K'],
  'gemini-2.5-flash-image': ['1K'],
}

/** Provider-published output tiers for the concrete model route actually selected. */
export function imageResolutionOptions(provider: GenerationRequest['imageProvider'], modelId: string): readonly ImageResolution[] {
  const published = IMAGE_MODEL_RESOLUTION_OPTIONS[modelId]
  if (published) return published
  // Connected provider aliases may appear beyond the built-in verified catalog.
  // A single native tier is the safe fallback until that concrete schema is known.
  if (provider === 'fal' || provider === 'openai' || provider === 'google') return ['1K']
  return ['1K']
}

export function imageModelSelectionPatch(
  imageProvider: GenerationRequest['imageProvider'],
  imageModelId: string,
  currentResolution?: ImageResolution,
): Pick<GenerationRequest, 'imageProvider' | 'imageModelId' | 'imageResolution'> {
  const resolutions = imageResolutionOptions(imageProvider, imageModelId)
  return {
    imageProvider,
    imageModelId,
    imageResolution: currentResolution && resolutions.includes(currentResolution) ? currentResolution : resolutions[0],
  }
}

export function semanticImageRequestControls(data: Pick<GenerationRequest, 'imageProvider' | 'imageModelId' | 'imageResolution' | 'outputFormat'>): Pick<GenerationRequest, 'imageProvider' | 'imageModelId' | 'imageResolution' | 'outputFormat'> {
  const imageProvider = data.imageProvider || 'fal'
  const imageModelId = data.imageModelId || FAL_IMAGE_MODELS.nanoBananaEdit
  return {
    ...imageModelSelectionPatch(imageProvider, imageModelId, data.imageResolution),
    outputFormat: data.outputFormat || 'png',
  }
}

export function imageDimensionsForTier(aspectRatio: string | undefined, resolution: ImageResolution | undefined, maximumEdge = 3840, maximumPixels = 8_294_400): { width: number; height: number } {
  const [rawWidth, rawHeight] = (aspectRatio && aspectRatio !== 'auto' ? aspectRatio : '1:1').split(':').map(Number)
  const ratioWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 1
  const ratioHeight = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 1
  const requestedEdge = resolution === '4K' ? maximumEdge : resolution === '2K' ? 2048 : resolution === '0.5K' ? 512 : 1024
  const landscape = ratioWidth >= ratioHeight
  const longEdge = Math.min(requestedEdge, maximumEdge)
  let width = landscape ? longEdge : longEdge * ratioWidth / ratioHeight
  let height = landscape ? longEdge * ratioHeight / ratioWidth : longEdge
  if (width * height > maximumPixels) {
    const scale = Math.sqrt(maximumPixels / (width * height))
    width *= scale
    height *= scale
  }
  return { width: Math.max(16, Math.floor(width / 16) * 16), height: Math.max(16, Math.floor(height / 16) * 16) }
}

export function imageReferenceLimit(request: Pick<GenerationRequest, 'kind' | 'imageProvider' | 'imageModelId' | 'inputPath' | 'inputUrl' | 'references'>): number {
  if (request.imageProvider === 'openai') return 16
  if (request.imageProvider === 'google') return 14
  const modelId = effectiveFalImageModel(request)
  if (modelId === FAL_IMAGE_MODELS.seedream5ProEdit) return 10
  if (modelId === FAL_IMAGE_MODELS.gptImage2Edit) return 16
  return 14
}

/** Visible Canvas input cardinality for the exact selected image endpoint. */
export function imageReferenceConnectionLimit(request: Pick<GenerationRequest, 'imageProvider' | 'imageModelId'>): number {
  if (request.imageProvider === 'openai' && /^gpt-image-2(?:$|-)/.test(request.imageModelId || '')) return 16
  if (request.imageProvider === 'google') return 14
  if (request.imageProvider !== 'fal') return 1
  if (request.imageModelId === FAL_IMAGE_MODELS.gptImage2Edit) return 16
  if (request.imageModelId === FAL_IMAGE_MODELS.seedream5ProEdit) return 10
  if ([FAL_IMAGE_MODELS.nanoBanana, FAL_IMAGE_MODELS.nanoBananaEdit].includes(request.imageModelId as typeof FAL_IMAGE_MODELS.nanoBanana | typeof FAL_IMAGE_MODELS.nanoBananaEdit)) return 14
  return 1
}

export function falImageEditInput(
  modelId: string,
  request: Pick<GenerationRequest, 'aspectRatio' | 'imageResolution' | 'outputFormat'>,
  prompt: string,
  imageUrls: string[],
): Record<string, unknown> | null {
  if (modelId === FAL_IMAGE_MODELS.seedream5ProEdit) {
    return {
      prompt,
      image_urls: imageUrls.slice(0, 10),
      image_size: request.aspectRatio && request.aspectRatio !== 'auto'
        ? imageDimensionsForTier(request.aspectRatio, request.imageResolution, 2048, 4_194_304)
        : request.imageResolution === '1K' ? 'auto_1K' : 'auto_2K',
      num_images: 1,
      output_format: request.outputFormat === 'jpeg' ? 'jpeg' : 'png',
      enable_safety_checker: true,
    }
  }
  if (modelId === FAL_IMAGE_MODELS.gptImage2Edit) {
    return {
      prompt,
      image_urls: imageUrls.slice(0, 16),
      image_size: request.aspectRatio && request.aspectRatio !== 'auto'
        ? imageDimensionsForTier(request.aspectRatio, request.imageResolution, 3840)
        : 'auto',
      quality: 'high',
      num_images: 1,
      output_format: request.outputFormat || 'png',
    }
  }
  return null
}

export function effectiveFalImageModel(request: Pick<GenerationRequest, 'kind' | 'imageModelId' | 'inputPath' | 'inputUrl' | 'references'>): string | undefined {
  if (request.kind !== 'image-generator' && request.kind !== 'image-editor') return undefined
  const requested = request.imageModelId
  const hasPrimaryImage = Boolean(request.inputPath || request.inputUrl)
  const hasReferenceImages = Boolean(request.references?.some((reference) => !reference.mediaType || reference.mediaType === 'image'))

  if (request.kind === 'image-editor') {
    if (requested === FAL_IMAGE_MODELS.seedream5ProEdit || requested === FAL_IMAGE_MODELS.gptImage2Edit) return requested
    if (requested === FAL_IMAGE_MODELS.fluxKontext && !hasReferenceImages) return requested
    if (hasReferenceImages || requested === FAL_IMAGE_MODELS.nanoBanana || requested === FAL_IMAGE_MODELS.nanoBananaEdit) return FAL_IMAGE_MODELS.nanoBananaEdit
    return requested || FAL_IMAGE_MODELS.fluxKontext
  }

  if (hasPrimaryImage || hasReferenceImages) {
    if (requested === FAL_IMAGE_MODELS.seedream5ProEdit || requested === FAL_IMAGE_MODELS.gptImage2Edit || requested === FAL_IMAGE_MODELS.fluxKontext || requested === FAL_IMAGE_MODELS.nanoBananaEdit) return requested
    return FAL_IMAGE_MODELS.nanoBananaEdit
  }
  if (requested === FAL_IMAGE_MODELS.nanoBananaEdit) return FAL_IMAGE_MODELS.nanoBanana
  return requested || FAL_IMAGE_MODELS.fluxSchnell
}

export function generationMediaInputCount(request: Pick<GenerationRequest, 'inputPath' | 'inputUrl' | 'references'>): number {
  return new Set([
    ...(request.inputPath || request.inputUrl ? [`primary:${request.inputPath || request.inputUrl}`] : []),
    ...(request.references || []).filter((reference) => reference.path || reference.url).map((reference) => `${reference.mediaType || 'image'}:${reference.path || reference.url}`),
  ]).size
}
