import type { GenerationRequest } from './types'

function clampedSafety(value: GenerationRequest['safetyTolerance'], fallback: number): string {
  return String(Math.min(6, Math.max(1, value || fallback)))
}

export function nanoBananaInput(request: GenerationRequest, prompt: string, imageUrls: string[] = []): Record<string, unknown> {
  return {
    prompt,
    ...(imageUrls.length ? { image_urls: imageUrls } : {}),
    aspect_ratio: imageUrls.length && request.kind === 'image-editor' ? 'auto' : request.aspectRatio || (imageUrls.length ? 'auto' : '1:1'),
    num_images: 1,
    output_format: request.outputFormat || 'png',
    resolution: request.imageResolution || '1K',
    ...(Number.isFinite(request.seed) ? { seed: request.seed } : {}),
    safety_tolerance: clampedSafety(request.safetyTolerance, 4),
    limit_generations: true,
    enable_web_search: Boolean(request.enableWebSearch),
  }
}

export function fluxKontextInput(request: GenerationRequest, prompt: string, imageUrl: string): Record<string, unknown> {
  return {
    prompt,
    image_url: imageUrl,
    guidance_scale: Math.min(20, Math.max(1, request.guidanceScale || 3.5)),
    num_images: 1,
    output_format: request.outputFormat || 'png',
    safety_tolerance: clampedSafety(request.safetyTolerance, 2),
    ...(Number.isFinite(request.seed) ? { seed: request.seed } : {}),
  }
}
