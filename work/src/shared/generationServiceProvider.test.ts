import { describe, expect, it } from 'vitest'
import { generationServiceProvider } from './generationServiceProvider'

describe('generationServiceProvider', () => {
  it('derives video service from the explicit model provider', () => {
    expect(generationServiceProvider({ kind: 'video-generator', videoEngine: 'byteplus/seedance-2.5/text-to-video' })).toBe('byteplus')
    expect(generationServiceProvider({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/text-to-video' })).toBe('fal')
  })

  it('preserves direct image and Fish Audio provider routing', () => {
    expect(generationServiceProvider({ kind: 'image-generator', imageProvider: 'google' })).toBe('google')
    expect(generationServiceProvider({ kind: 'voiceover', voiceEngine: 'fish-audio' })).toBe('fish')
  })
  it('uses the explicit native fal binding rather than a stale static provider alias', () => {
    expect(generationServiceProvider({ kind: 'video-generator', videoEngine: 'byteplus/seedance-2.5/text-to-video', falNative: { endpointId: 'fixture/new-model' } })).toBe('fal')
  })
})
