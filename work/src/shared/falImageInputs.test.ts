import { describe, expect, it } from 'vitest'
import { fluxKontextInput, nanoBananaInput } from './falImageInputs'

describe('fal image provider inputs', () => {
  it('keeps Nano Banana text generation free of edit-only image_urls', () => {
    expect(nanoBananaInput({ nodeId: 'image', kind: 'image-generator', aspectRatio: '2:3', outputFormat: 'webp', imageResolution: '2K', seed: 9, enableWebSearch: true }, 'Portrait')).toEqual({
      prompt: 'Portrait', aspect_ratio: '2:3', num_images: 1, output_format: 'webp', resolution: '2K', seed: 9, safety_tolerance: '4', limit_generations: true, enable_web_search: true,
    })
  })

  it('uses required image_urls and provider-native auto ratio for Nano Banana editing', () => {
    expect(nanoBananaInput({ nodeId: 'edit', kind: 'image-editor' }, 'Change jacket', ['https://example.com/a.png'])).toMatchObject({ image_urls: ['https://example.com/a.png'], aspect_ratio: 'auto' })
  })

  it('carries every exposed Kontext control into the edit payload', () => {
    expect(fluxKontextInput({ nodeId: 'edit', kind: 'image-editor', guidanceScale: 6, outputFormat: 'jpeg', safetyTolerance: 3, seed: 42 }, 'Change jacket', 'https://example.com/source.png')).toEqual({
      prompt: 'Change jacket', image_url: 'https://example.com/source.png', guidance_scale: 6, num_images: 1, output_format: 'jpeg', safety_tolerance: '3', seed: 42,
    })
  })
})
