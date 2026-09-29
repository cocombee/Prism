import { describe, expect, it } from 'vitest'
import { realEsrganVideoUpscalerInput } from './videoUpscaler'

describe('RealESRGAN video upscaler request assembly', () => {
  it('sends only the exact provider-effective video URL and upscale factor', () => {
    expect(realEsrganVideoUpscalerInput({ nodeId: 'video-upscale', kind: 'upscaler', upscalerModel: 'realesrgan-video', scale: 4, creativity: 0.9, resemblance: 0.1, seed: 42 }, 'https://example.com/source.mp4')).toEqual({
      video_url: 'https://example.com/source.mp4',
      scale: 4,
    })
  })

  it('clamps unsupported persisted scale values before billing', () => {
    expect(realEsrganVideoUpscalerInput({ nodeId: 'video-upscale', kind: 'upscaler', upscalerModel: 'realesrgan-video', scale: 12 }, 'video')).toEqual({ video_url: 'video', scale: 4 })
  })
})
