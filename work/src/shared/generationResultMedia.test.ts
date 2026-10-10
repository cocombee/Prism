import { describe, expect, it } from 'vitest'
import { generationCallCount, generationResultMedia } from './generationResultMedia'
import type { GenerationResult } from './types'

describe('native provider result ownership', () => {
  it('keeps a schema count inside one call while preserving the legacy quantity loop', () => {
    expect(generationCallCount(true, 4)).toBe(1)
    expect(generationCallCount(false, 4)).toBe(4)
    expect(generationCallCount(false, undefined, 2)).toBe(2)
  })
  it('keeps all outputs in order and retains legacy adapters', () => {
    const primary: GenerationResult = { requestId: 'fixture', modelId: 'fixture/image', outputPath: '/fixture/a', outputUrl: 'prism://a', outputType: 'image' }
    const outputs = Array.from({ length: 5 }, (_, i) => ({ path: `/fixture/${i}`, url: `prism://${i}`, type: 'image' as const }))
    expect(generationResultMedia({ ...primary, outputs })).toEqual(outputs)
    expect(generationResultMedia(primary)).toEqual([{ path: primary.outputPath, url: primary.outputUrl, type: 'image' }])
    expect(() => generationResultMedia({ ...primary, outputs: [] })).toThrow('without returning media')
  })
})
