import { describe, expect, it } from 'vitest'
import { findVideoModel, defaultVideoRatio, effectiveOutputFrameRate, formatDurationSeconds, motionCadenceOptions, MOTION_CADENCES, normalizedMotionCadence, referenceCapableVideoEngine, resolveVideoModel, videoModelDurationInventory, VIDEO_MODELS } from './videoModels'

describe('video model aspect-ratio capabilities', () => {
  it('keeps registered selections and known legacy aliases exact while rejecting unknown IDs', () => {
    for (const model of VIDEO_MODELS) expect(findVideoModel(model.id)?.id).toBe(model.id)
    expect(findVideoModel('kling-v3')?.id).toBe('fal-ai/kling-video/v3/standard/text-to-video')
    expect(findVideoModel('seedance-reference')?.id).toBe('bytedance/seedance-2.0/reference-to-video')
    expect(findVideoModel()?.id).toBe('wan-controlled')
    expect(findVideoModel('unsupported-saved-model')).toBeUndefined()
  })

  it('requires an unambiguous route when a provider API ID is supplied', () => {
    const sharedApiId = VIDEO_MODELS.find((model) => VIDEO_MODELS.filter((other) => other.apiModelId === model.apiModelId).length > 1)!.apiModelId
    expect(findVideoModel(sharedApiId)).toBeUndefined()
    const uniqueApiModel = VIDEO_MODELS.find((model) => VIDEO_MODELS.filter((other) => other.apiModelId === model.apiModelId).length === 1)!
    expect(findVideoModel(uniqueApiModel.apiModelId)?.id).toBe(uniqueApiModel.id)
  })

  it('gives every route an explicit provider and provider-native API model id', () => {
    for (const model of VIDEO_MODELS) {
      expect(['fal', 'byteplus']).toContain(model.provider)
      expect(model.apiModelId).toBeTruthy()
      if (model.provider === 'fal') expect(model.apiModelId).toBe(model.id)
    }
  })

  it('maps every BytePlus virtual mode to the exact official Seedance model id', () => {
    const expected = {
      'seedance-2.5': 'dreamina-seedance-2-5-260628',
      'seedance-2.0': 'dreamina-seedance-2-0-260128',
      'seedance-2.0-fast': 'dreamina-seedance-2-0-fast-260128',
      'seedance-2.0-mini': 'dreamina-seedance-2-0-mini-260615',
    }
    for (const [tier, apiModelId] of Object.entries(expected)) {
      const routes = VIDEO_MODELS.filter((model) => model.id.startsWith(`byteplus/${tier}/`))
      expect(routes.map((model) => model.mode)).toEqual(['text', 'image', 'reference'])
      expect(routes.every((model) => model.provider === 'byteplus' && model.apiModelId === apiModelId)).toBe(true)
    }
    expect(resolveVideoModel('byteplus/seedance-2.5/image-to-video').resolutions).toEqual(['480p', '720p', '1080p'])
    expect(resolveVideoModel('byteplus/seedance-2.5/text-to-video').durations).toEqual(Array.from({ length: 27 }, (_, index) => index + 4))
  })

  it('preserves the provider when adopting a BytePlus reference route', () => {
    expect(referenceCapableVideoEngine('byteplus/seedance-2.5/text-to-video')).toBe('byteplus/seedance-2.5/reference-to-video')
    expect(referenceCapableVideoEngine('byteplus/seedance-2.0-fast/image-to-video')).toBe('byteplus/seedance-2.0-fast/reference-to-video')
  })

  it('exposes direct BytePlus 4K only for 2.0 Standard', () => {
    for (const model of VIDEO_MODELS.filter((item) => item.provider === 'byteplus')) {
      const isStandard = model.id.includes('seedance-2.0/')
      const isTopTier = model.id.includes('seedance-2.5') || isStandard
      expect(model.resolutions).toEqual(isStandard ? ['480p', '720p', '1080p', '4k'] : isTopTier ? ['480p', '720p', '1080p'] : ['480p', '720p'])
      expect(model.resolutions.includes('4k')).toBe(isStandard)
    }
    expect(resolveVideoModel('bytedance/seedance-2.0/text-to-video').resolutions).toEqual(['480p', '720p', '1080p', '4k'])
  })

  it('keeps Seedance ratios aligned with each fal.ai endpoint schema', () => {
    const expected = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']
    for (const model of VIDEO_MODELS.filter((item) => item.family === 'seedance' && !(item.id.includes('seedance-2.5') && item.mode === 'image'))) {
      expect(model.ratios).toEqual(expected)
    }
    expect(resolveVideoModel('bytedance/seedance-2.5/image-to-video').ratios).toEqual([])
    expect(resolveVideoModel('bytedance/seedance-2.5/image-to-video').fixedAspectRatioLabel).toBe('From Input')
  })

  it('does not advertise unsupported 3:2 or 2:3 video ratios', () => {
    for (const model of VIDEO_MODELS) {
      expect(model.ratios).not.toContain('3:2')
      expect(model.ratios).not.toContain('2:3')
    }
  })

  it('uses Auto only for Veo modes whose fal.ai schema can infer from an input', () => {
    expect(resolveVideoModel('fal-ai/veo3.1').ratios).toEqual(['16:9', '9:16'])
    expect(resolveVideoModel('fal-ai/veo3.1/reference-to-video').ratios).toEqual(['16:9', '9:16'])
    expect(resolveVideoModel('fal-ai/veo3.1/image-to-video').ratios).toEqual(['auto', '16:9', '9:16'])
    expect(resolveVideoModel('fal-ai/veo3.1/first-last-frame-to-video').ratios).toEqual(['auto', '16:9', '9:16'])
    expect(resolveVideoModel('fal-ai/veo3.1/extend-video').ratios).toEqual(['auto', '16:9', '9:16'])
  })

  it('exposes FPS only for the Wan endpoint that has a native integer FPS field', () => {
    expect(resolveVideoModel('wan-controlled').frameRates).toEqual([12, 16, 24, 25, 30, 50, 60])
    for (const model of VIDEO_MODELS.filter((item) => item.family !== 'wan')) expect(model.frameRates).toEqual([])
  })

  it('keeps visual Motion Cadence separate from encoded Output FPS', () => {
    expect(MOTION_CADENCES).toEqual([12, 16, 24, 35, 50, 60])
    expect(motionCadenceOptions(resolveVideoModel('fal-ai/veo3.1'))).toEqual([12, 16, 24])
    expect(motionCadenceOptions(resolveVideoModel('wan-controlled'), 60)).toEqual([12, 16, 24, 35, 50, 60])
    expect(motionCadenceOptions(resolveVideoModel('wan-controlled'), 25)).toEqual([12, 16, 24])
    expect(motionCadenceOptions(resolveVideoModel('bytedance/seedance-2.0/text-to-video'))).toEqual([12, 16, 24, 35, 50, 60])
    expect(normalizedMotionCadence(resolveVideoModel('fal-ai/veo3.1'), undefined, 24)).toBe(24)
    expect(normalizedMotionCadence(resolveVideoModel('fal-ai/veo3.1'), undefined, 16)).toBe(16)
    expect(normalizedMotionCadence(resolveVideoModel('bytedance/seedance-2.0/text-to-video'))).toBe(24)
    expect(normalizedMotionCadence(resolveVideoModel('wan-controlled'), 25)).toBe(24)
    expect(normalizedMotionCadence(resolveVideoModel('wan-controlled'), 16)).toBe(16)
    expect(effectiveOutputFrameRate(resolveVideoModel('wan-controlled'), 24)).toBe(24)
    expect(effectiveOutputFrameRate(resolveVideoModel('fal-ai/veo3.1'))).toBe(24)
    expect(effectiveOutputFrameRate(resolveVideoModel('bytedance/seedance-2.0/text-to-video'))).toBe(24)
  })

  it('keeps Seedance resolution choices aligned with the live tier schemas', () => {
    for (const model of VIDEO_MODELS.filter((item) => item.provider === 'fal' && item.family === 'seedance' && (item.fast || item.mini || item.id.includes('seedance-2.5')))) {
      expect(model.resolutions).toEqual(['480p', '720p'])
    }
    for (const model of VIDEO_MODELS.filter((item) => item.provider === 'fal' && item.family === 'seedance' && !item.fast && !item.mini && !item.id.includes('seedance-2.5'))) {
      expect(model.resolutions).toEqual(['480p', '720p', '1080p', '4k'])
    }
  })

  it('includes every current Seedance 2.5, standard, Fast, and Mini generator mode', () => {
    expect(VIDEO_MODELS.filter((model) => model.id.startsWith('bytedance/seedance-2.5/')).map((model) => model.mode)).toEqual(['text', 'image', 'reference'])
    expect(VIDEO_MODELS.filter((model) => model.id.startsWith('bytedance/seedance-2.0/') && !model.fast && !model.mini).map((model) => model.mode)).toEqual(['text', 'image', 'reference'])
    expect(VIDEO_MODELS.filter((model) => model.provider === 'fal' && model.fast && model.family === 'seedance').map((model) => model.mode)).toEqual(['text', 'image', 'reference'])
    expect(VIDEO_MODELS.filter((model) => model.provider === 'fal' && model.mini).map((model) => model.mode)).toEqual(['text', 'image', 'reference'])
    expect(resolveVideoModel('bytedance/seedance-2.5/reference-to-video').referenceLimits).toEqual({ images: 30, videos: 10, audios: 10, total: 50 })
    expect(resolveVideoModel('bytedance/seedance-2.0/mini/reference-to-video').referenceLimits).toEqual({ images: 9, videos: 3, audios: 3, total: 12 })
  })

  it('preserves the matching tier when adopting a reference-capable route', () => {
    expect(referenceCapableVideoEngine('bytedance/seedance-2.5/text-to-video')).toBe('bytedance/seedance-2.5/reference-to-video')
    expect(referenceCapableVideoEngine('bytedance/seedance-2.0/mini/image-to-video')).toBe('bytedance/seedance-2.0/mini/reference-to-video')
    expect(referenceCapableVideoEngine('fal-ai/veo3.1/fast')).toBe('fal-ai/veo3.1/fast/reference-to-video')
  })

  it('keeps Veo standard and Fast at 4K while Lite remains capped at 1080p', () => {
    for (const model of VIDEO_MODELS.filter((item) => item.family === 'veo' && !item.id.includes('/lite'))) {
      expect(model.resolutions).toEqual(['720p', '1080p', '4k'])
      expect(model.fixedFrameRate).toBe(24)
    }
    for (const model of VIDEO_MODELS.filter((item) => item.family === 'veo' && item.id.includes('/lite'))) {
      expect(model.resolutions).toEqual(['720p', '1080p'])
    }
  })

  it('does not advertise a resolution selector for fixed-quality Kling endpoints', () => {
    for (const model of VIDEO_MODELS.filter((item) => item.family === 'kling')) {
      expect(model.resolutions).toEqual([])
      expect(model.fixedResolutionLabel).toBe(model.fourK ? '4K' : 'Native')
    }
  })

  it('uses the connected image ratio for Kling image modes instead of a fake ratio control', () => {
    for (const model of VIDEO_MODELS.filter((item) => item.family === 'kling' && item.mode === 'image')) {
      expect(model.ratios).toEqual([])
      expect(model.fixedAspectRatioLabel).toBe('From Input')
    }
    for (const model of VIDEO_MODELS.filter((item) => item.family === 'kling' && item.mode !== 'image')) {
      expect(model.ratios).toEqual(['16:9', '9:16', '1:1'])
    }
  })

  it('defaults every selectable video ratio to horizontal 16:9 and never offers automatic duration', () => {
    for (const model of VIDEO_MODELS) {
      if (model.ratios.includes('16:9')) expect(defaultVideoRatio(model)).toBe('16:9')
      expect(model.durations).not.toContain('auto')
    }
  })

  it('keeps Generator duration inventory exact to provider/model native choices', () => {
    const seedance25 = videoModelDurationInventory('bytedance/seedance-2.5/reference-to-video')
    expect(seedance25).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30])
    expect(seedance25.at(-1)).toBe(30)
    expect(seedance25).not.toContain(0.5)
    expect(videoModelDurationInventory('fal-ai/veo3.1')).toEqual([4, 6, 8])
    expect(formatDurationSeconds(0)).toBe('0.0s')
    expect(formatDurationSeconds(15)).toBe('15.0s')
  })

  it('upgrades visible semantic inputs to the closest legal reference endpoint', () => {
    expect(referenceCapableVideoEngine('wan-controlled')).toBe('bytedance/seedance-2.0/reference-to-video')
    expect(referenceCapableVideoEngine('bytedance/seedance-2.0/fast/text-to-video')).toBe('bytedance/seedance-2.0/fast/reference-to-video')
    expect(referenceCapableVideoEngine('fal-ai/kling-video/o3/pro/image-to-video')).toBe('fal-ai/kling-video/o3/pro/reference-to-video')
    expect(referenceCapableVideoEngine('fal-ai/veo3.1')).toBe('fal-ai/veo3.1/reference-to-video')
  })
})

 it('retains provider Native25 while replacing deprecated visual25 with the existing24 default', () => {
   const model = resolveVideoModel('wan-controlled')
   expect(model.frameRates).toContain(25)
   expect(effectiveOutputFrameRate(model, 25)).toBe(25)
   expect(motionCadenceOptions(model, 60)).not.toContain(25)
   expect(normalizedMotionCadence(model, 60, 25)).toBe(24)
 })

 it('keeps a native24 cinematic cadence selectable, not capped at16',()=>{
   const model=resolveVideoModel('fal-ai/veo3.1')
   expect(motionCadenceOptions(model)).toContain(24)
   expect(normalizedMotionCadence(model)).toBe(24)
   for(const candidate of VIDEO_MODELS) {
     const rates=candidate.frameRates.length?candidate.frameRates:[candidate.fixedFrameRate]
     for(const rate of rates) if(rate)expect(motionCadenceOptions(candidate,rate).every(fps=>fps<=rate)).toBe(true)
   }
 })
