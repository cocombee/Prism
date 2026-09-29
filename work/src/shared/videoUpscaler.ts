import type { GenerationRequest } from './types'

/** Exact fal-ai/video-upscaler (RealESRGAN) input assembled in Electron main. */
export function realEsrganVideoUpscalerInput(request: GenerationRequest, videoUrl: string) {
  return {
    video_url: videoUrl,
    scale: Math.min(Math.max(request.scale || 2, 1), 4),
  }
}
