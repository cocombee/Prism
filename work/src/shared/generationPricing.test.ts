import { describe, expect, it } from 'vitest'
import { publishedFalEstimate } from './generationPricing'
import { FAL_IMAGE_MODELS } from './imageModels'
import type { GenerationRequest } from './types'

const request = (data: Partial<GenerationRequest> = {}): GenerationRequest => ({ nodeId: 'image', kind: 'image-generator', quantity: 1, imageResolution: '1K', ...data })

describe('published fal pricing fallback', () => {
  it('estimates Nano Banana Pro text and edit routes at the official per-image rate', () => {
    expect(publishedFalEstimate(request(), FAL_IMAGE_MODELS.nanoBanana)?.totalCost).toBe(0.15)
    expect(publishedFalEstimate(request({ quantity: 3 }), FAL_IMAGE_MODELS.nanoBananaEdit)?.totalCost).toBeCloseTo(0.45)
  })

  it('applies the official 4K multiplier and one web-search request fee', () => {
    expect(publishedFalEstimate(request({ quantity: 2, imageResolution: '4K', enableWebSearch: true }), FAL_IMAGE_MODELS.nanoBananaEdit)).toMatchObject({ totalCost: 0.615, currency: 'USD' })
  })

  it('never invents a fallback for an unaudited endpoint', () => {
    expect(publishedFalEstimate(request(), 'fal-ai/unknown')).toBeNull()
  })

  it('uses request-shaped GPT Image 2 Edit pricing instead of the catalog ceiling', () => {
    const references = Array.from({ length: 14 }, (_, index) => ({ role: 'reference' as const, path: `/project/reference-${index}.jpg`, mediaType: 'image' as const }))
    const estimate = publishedFalEstimate(request({ aspectRatio: '4:3', imageModelId: FAL_IMAGE_MODELS.gptImage2Edit, references }), FAL_IMAGE_MODELS.gptImage2Edit)
    expect(estimate?.totalCost).toBeCloseTo(0.52)
    expect(estimate?.basis).toContain('14 image inputs')
  })

  it('interpolates the official size table without inventing a per-character surcharge', () => {
    const shortPrompt = publishedFalEstimate(request({ aspectRatio: '4:3', imageResolution: '2K', imageModelId: FAL_IMAGE_MODELS.gptImage2Edit, prompt: 'short', references: [{ role: 'character', path: '/project/character-sheet.jpg', mediaType: 'image' }] }), FAL_IMAGE_MODELS.gptImage2Edit)
    const longPrompt = publishedFalEstimate(request({ aspectRatio: '4:3', imageResolution: '2K', imageModelId: FAL_IMAGE_MODELS.gptImage2Edit, prompt: 'x'.repeat(7_583), references: [{ role: 'character', path: '/project/character-sheet.jpg', mediaType: 'image' }] }), FAL_IMAGE_MODELS.gptImage2Edit)
    expect(shortPrompt?.totalCost).toBeCloseTo(0.2085, 3)
    expect(longPrompt?.totalCost).toBe(shortPrompt?.totalCost)
    expect(longPrompt?.basis).toContain('official size-table interpolation refreshed 2026-08-16')
  })
})
