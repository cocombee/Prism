import type { GenerationRequest } from './types'

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum)

/** Exact fal-ai/clarity-upscaler input assembled in Electron main. */
export function clarityUpscalerInput(request: GenerationRequest, imageUrl: string) {
  return {
    image_url: imageUrl,
    upscale_factor: clamp(request.scale ?? 2, 1, 4),
    creativity: clamp(request.creativity ?? 0.35, 0, 1),
    resemblance: clamp(request.resemblance ?? 0.6, 0, 1),
    num_inference_steps: Math.round(clamp(request.inferenceSteps ?? 18, 1, 100)),
    ...(Number.isFinite(request.seed) ? { seed: request.seed } : {}),
    enable_safety_checker: true,
  }
}
