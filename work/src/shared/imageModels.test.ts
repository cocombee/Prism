import { describe, expect, it } from 'vitest'
import { effectiveFalImageModel, falImageEditInput, FAL_IMAGE_MODELS, FAL_REFERENCE_IMAGE_MODELS, generationMediaInputCount, IMAGE_MODEL_RESOLUTION_OPTIONS, imageDimensionsForTier, imageModelSelectionPatch, imageReferenceLimit, imageResolutionOptions, semanticImageRequestControls } from './imageModels'

describe('effectiveFalImageModel', () => {
  it('keeps text-to-image endpoints provider-valid when no image is connected', () => {
    expect(effectiveFalImageModel({ kind: 'image-generator', imageModelId: FAL_IMAGE_MODELS.nanoBananaEdit })).toBe(FAL_IMAGE_MODELS.nanoBanana)
    expect(effectiveFalImageModel({ kind: 'image-generator', imageModelId: FAL_IMAGE_MODELS.fluxSchnell })).toBe(FAL_IMAGE_MODELS.fluxSchnell)
  })

  it('uses the edit endpoint when an image generator receives an image', () => {
    expect(effectiveFalImageModel({ kind: 'image-generator', imageModelId: FAL_IMAGE_MODELS.fluxSchnell, inputUrl: 'https://example.com/source.png' })).toBe(FAL_IMAGE_MODELS.nanoBananaEdit)
  })

  it('keeps a single-source Kontext edit but promotes multi-reference edits to Nano Banana', () => {
    expect(effectiveFalImageModel({ kind: 'image-editor', imageModelId: FAL_IMAGE_MODELS.fluxKontext, inputPath: '/tmp/source.png' })).toBe(FAL_IMAGE_MODELS.fluxKontext)
    expect(effectiveFalImageModel({ kind: 'image-editor', imageModelId: FAL_IMAGE_MODELS.fluxKontext, inputPath: '/tmp/source.png', references: [{ role: 'reference', path: '/tmp/look.png', mediaType: 'image' }] })).toBe(FAL_IMAGE_MODELS.nanoBananaEdit)
  })

  it('honors explicit Nano Banana editing with one primary source', () => {
    expect(effectiveFalImageModel({ kind: 'image-editor', imageModelId: FAL_IMAGE_MODELS.nanoBananaEdit, inputPath: '/tmp/source.png' })).toBe(FAL_IMAGE_MODELS.nanoBananaEdit)
  })

  it('preserves both provider-native fal reference endpoints without a separate Character catalog', () => {
    expect(FAL_REFERENCE_IMAGE_MODELS).toContain(FAL_IMAGE_MODELS.seedream5ProEdit)
    expect(FAL_REFERENCE_IMAGE_MODELS).toContain(FAL_IMAGE_MODELS.gptImage2Edit)
    expect(effectiveFalImageModel({ kind: 'image-editor', imageModelId: FAL_IMAGE_MODELS.seedream5ProEdit, inputPath: '/tmp/face.png' })).toBe(FAL_IMAGE_MODELS.seedream5ProEdit)
    expect(effectiveFalImageModel({ kind: 'image-editor', imageModelId: FAL_IMAGE_MODELS.gptImage2Edit, inputPath: '/tmp/face.png' })).toBe(FAL_IMAGE_MODELS.gptImage2Edit)
  })

  it('offers and preserves every fal reference-capable Image Generator endpoint', () => {
    expect(FAL_REFERENCE_IMAGE_MODELS).toEqual([
      FAL_IMAGE_MODELS.nanoBananaEdit,
      FAL_IMAGE_MODELS.seedream5ProEdit,
      FAL_IMAGE_MODELS.gptImage2Edit,
      FAL_IMAGE_MODELS.fluxKontext,
    ])
    expect(effectiveFalImageModel({ kind: 'image-generator', imageModelId: FAL_IMAGE_MODELS.seedream5ProEdit, inputUrl: 'https://example.com/source.png' })).toBe(FAL_IMAGE_MODELS.seedream5ProEdit)
    expect(effectiveFalImageModel({ kind: 'image-generator', imageModelId: FAL_IMAGE_MODELS.gptImage2Edit, inputUrl: 'https://example.com/source.png' })).toBe(FAL_IMAGE_MODELS.gptImage2Edit)
  })

  it('builds exact provider-native edit fields and limits', () => {
    expect(falImageEditInput(FAL_IMAGE_MODELS.seedream5ProEdit, { aspectRatio: '2:3', imageResolution: '2K', outputFormat: 'webp' }, 'keep identity', Array.from({ length: 12 }, (_, index) => `seed-${index}`))).toMatchObject({ image_size: { width: 1360, height: 2048 }, output_format: 'png', enable_safety_checker: true, image_urls: Array.from({ length: 10 }, (_, index) => `seed-${index}`) })
    expect(falImageEditInput(FAL_IMAGE_MODELS.gptImage2Edit, { aspectRatio: '1:1', imageResolution: '4K', outputFormat: 'webp' }, 'keep identity', Array.from({ length: 18 }, (_, index) => `gpt-${index}`))).toMatchObject({ image_size: { width: 2880, height: 2880 }, quality: 'high', output_format: 'webp', image_urls: Array.from({ length: 16 }, (_, index) => `gpt-${index}`) })
  })

  it('publishes only the concrete model resolution tiers and converts tier plus ratio to legal dimensions', () => {
    expect(Object.keys(IMAGE_MODEL_RESOLUTION_OPTIONS)).toEqual(expect.arrayContaining([
      FAL_IMAGE_MODELS.fluxSchnell, FAL_IMAGE_MODELS.fluxKontext, FAL_IMAGE_MODELS.nanoBanana, FAL_IMAGE_MODELS.nanoBananaEdit,
      FAL_IMAGE_MODELS.seedream5ProEdit, FAL_IMAGE_MODELS.gptImage2Edit, 'gpt-image-2', 'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image',
    ]))
    expect(imageResolutionOptions('fal', FAL_IMAGE_MODELS.nanoBananaEdit)).toEqual(['1K', '2K', '4K'])
    expect(imageResolutionOptions('fal', FAL_IMAGE_MODELS.seedream5ProEdit)).toEqual(['1K', '2K'])
    expect(imageResolutionOptions('google', 'gemini-3.1-flash-image')).toEqual(['0.5K', '1K', '2K', '4K'])
    expect(imageResolutionOptions('google', 'gemini-3.1-flash-lite-image')).toEqual(['1K'])
    expect(imageResolutionOptions('google', 'gemini-2.5-flash-image')).toEqual(['1K'])
    expect(imageResolutionOptions('openai', 'gpt-image-2')).toEqual(['1K'])
    expect(imageDimensionsForTier('16:9', '2K')).toEqual({ width: 2048, height: 1152 })
  })

  it('derives semantic selection and request controls from the exact Image Generator model capabilities', () => {
    expect(imageModelSelectionPatch('fal', FAL_IMAGE_MODELS.gptImage2Edit, '1K')).toEqual({ imageProvider: 'fal', imageModelId: FAL_IMAGE_MODELS.gptImage2Edit, imageResolution: '1K' })
    expect(imageModelSelectionPatch('fal', FAL_IMAGE_MODELS.seedream5ProEdit, '4K')).toEqual({ imageProvider: 'fal', imageModelId: FAL_IMAGE_MODELS.seedream5ProEdit, imageResolution: '1K' })
    expect(semanticImageRequestControls({ imageProvider: 'fal', imageModelId: FAL_IMAGE_MODELS.nanoBananaEdit, imageResolution: '4K', outputFormat: 'webp' })).toEqual({ imageProvider: 'fal', imageModelId: FAL_IMAGE_MODELS.nanoBananaEdit, imageResolution: '4K', outputFormat: 'webp' })
  })

  it('derives the image reference budget from the provider-effective model', () => {
    expect(imageReferenceLimit({ kind: 'image-generator', imageProvider: 'openai', imageModelId: 'gpt-image-2' })).toBe(16)
    expect(imageReferenceLimit({ kind: 'image-generator', imageProvider: 'google', imageModelId: 'gemini-3.1-flash-image' })).toBe(14)
    expect(imageReferenceLimit({ kind: 'image-generator', imageProvider: 'fal', imageModelId: FAL_IMAGE_MODELS.seedream5ProEdit, references: [{ role: 'reference', path: '/tmp/face.png', mediaType: 'image' }] })).toBe(10)
    expect(imageReferenceLimit({ kind: 'image-generator', imageProvider: 'fal', imageModelId: FAL_IMAGE_MODELS.gptImage2Edit, references: [{ role: 'reference', path: '/tmp/face.png', mediaType: 'image' }] })).toBe(16)
    expect(imageReferenceLimit({ kind: 'image-generator', imageProvider: 'fal', imageModelId: FAL_IMAGE_MODELS.nanoBananaEdit })).toBe(14)
  })

  it('counts only materialized media inputs, not prompt or empty connections', () => {
    expect(generationMediaInputCount({ references: [{ role: 'reference', tag: '@style', mediaType: 'image' }] })).toBe(0)
    expect(generationMediaInputCount({ inputPath: '/tmp/source.png', references: [{ role: 'reference', path: '/tmp/look.png', mediaType: 'image' }] })).toBe(2)
  })
})
