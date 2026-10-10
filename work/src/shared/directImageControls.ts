import type { GenerationRequest } from './types'

/** Exact fixed native settings used by the current direct-image adapters. */
export function openAIImageSize(ratio?: string): '1024x1024' | '1536x1024' | '1024x1536' {
  if (!ratio || ratio === 'auto' || ratio === '1:1') return '1024x1024'
  const [width, height] = ratio.split(':').map(Number)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('Choose a valid image aspect ratio.')
  return width < height ? '1024x1536' : '1536x1024'
}
export function directImageControls(request: GenerationRequest): Record<string, unknown> {
  const outputFormat = request.outputFormat || 'png'
  if (!['png', 'jpeg', 'webp'].includes(outputFormat)) throw new Error('Choose a supported image output format.')
  if (request.imageProvider === 'openai') return { model: request.imageModelId || 'gpt-image-2', size: openAIImageSize(request.aspectRatio), output_format: outputFormat, n: 1 }
  if (request.imageProvider === 'google') return { model: request.imageModelId || 'gemini-3.1-flash-image', response_format: { type: 'image', mime_type: `image/${outputFormat}`, aspect_ratio: request.aspectRatio || '1:1', image_size: request.imageResolution || '1K' } }
  throw new Error('Choose a direct image provider.')
}
