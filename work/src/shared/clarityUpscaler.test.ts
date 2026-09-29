import { describe, expect, it } from 'vitest'
import { clarityUpscalerInput } from './clarityUpscaler'
import type { GenerationRequest } from './types'

const request = (patch: Partial<GenerationRequest> = {}): GenerationRequest => ({ nodeId: 'upscale', kind: 'upscaler', ...patch })

describe('Clarity Upscaler provider input', () => {
  it('uses provider-native defaults without inventing an empty prompt', () => {
    expect(clarityUpscalerInput(request(), 'https://example.com/input.png')).toEqual({
      image_url: 'https://example.com/input.png',
      upscale_factor: 2,
      creativity: 0.35,
      resemblance: 0.6,
      num_inference_steps: 18,
      enable_safety_checker: true,
    })
  })

  it('forwards every visible attribute control, clamps values, and never leaks prompt fields', () => {
    expect(clarityUpscalerInput(request({ prompt: '  restore fine textile detail  ', negativePrompt: '  waxy skin  ', scale: 9, creativity: 1.4, resemblance: -1, guidanceScale: 40, inferenceSteps: 18.6, seed: 42 }), 'image')).toEqual({
      image_url: 'image',
      upscale_factor: 4,
      creativity: 1,
      resemblance: 0,
      num_inference_steps: 19,
      seed: 42,
      enable_safety_checker: true,
    })
  })
})
