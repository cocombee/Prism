import { describe, expect, it } from 'vitest'
import { generationCallCount, generationResultMedia, nativeVideoQuantityAvailable, runNativeVideoBatch } from './generationResultMedia'
import type { GenerationResult } from './types'

describe('native provider result ownership', () => {
  it('keeps native image/audio calls to one while video can opt into Prism quantity', () => {
    expect(generationCallCount(true, 4)).toBe(1)
    expect(generationCallCount(false, 4)).toBe(4)
    expect(generationCallCount(false, undefined, 2)).toBe(2)
    expect([1, 2, 3, 4].map(quantity => generationCallCount(true, quantity, 1, true))).toEqual([1, 2, 3, 4])
    expect([1, 2, 3, 4].map(quantity => generationCallCount(false, quantity))).toEqual([1, 2, 3, 4])
  })
  it('bounds opted-in quantities and returns an integer minimum for zero or non-finite values', () => {
    for (const quantity of [undefined, 0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(generationCallCount(true, quantity, 1, true)).toBe(1)
      expect(generationCallCount(true, quantity, 2, true)).toBe(2)
    }
    expect(generationCallCount(true, -3, 1, true)).toBe(1)
    expect(generationCallCount(true, 1.9, 1, true)).toBe(1)
    expect(generationCallCount(true, 2.9, 1, true)).toBe(2)
    expect(generationCallCount(true, 99, 1, true)).toBe(4)
    expect(generationCallCount(true, 1, 2, true)).toBe(2)
  })
  it('keeps all outputs in order and retains legacy adapters', () => {
    const primary: GenerationResult = { requestId: 'fixture', modelId: 'fixture/image', outputPath: '/fixture/a', outputUrl: 'prism://a', outputType: 'image' }
    const outputs = Array.from({ length: 5 }, (_, i) => ({ path: `/fixture/${i}`, url: `prism://${i}`, type: 'image' as const }))
    expect(generationResultMedia({ ...primary, outputs })).toEqual(outputs)
    expect(generationResultMedia(primary)).toEqual([{ path: primary.outputPath, url: primary.outputUrl, type: 'image' }])
    expect(() => generationResultMedia({ ...primary, outputs: [] })).toThrow('without returning media')
  })

  it('offers a local video quantity only when current fields do not own output count', () => {
    expect(nativeVideoQuantityAvailable(undefined)).toBe(false)
    expect(nativeVideoQuantityAvailable([])).toBe(true)
    for (const key of ['num_outputs', 'n_outputs', 'number_of_outputs', 'output_count', 'outputs_count', 'num_videos', 'n_videos', 'number_of_videos', 'video_count', 'videos_count', 'num_clips', 'clip_count', 'num_generations', 'generation_count', 'number_of_generations', 'batch_size']) {
      expect(nativeVideoQuantityAvailable([{ key, label: key }])).toBe(false)
    }
    expect(nativeVideoQuantityAvailable([{ key: 'count', label: 'Number of videos' }])).toBe(false)
    expect(nativeVideoQuantityAvailable([{ key: 'batch', label: 'Output count' }])).toBe(false)
    expect(nativeVideoQuantityAvailable([{ key: 'results', label: 'Result videos' }])).toBe(false)
    expect(nativeVideoQuantityAvailable([
      { key: 'num_images', label: 'Number of images' },
      { key: 'duration', label: 'Duration' },
      { key: 'num_frames', label: 'Number of frames' },
    ])).toBe(true)
  })

  it('runs bounded iterations sequentially and preserves their order', async () => {
    const events: string[] = []
    await runNativeVideoBatch(3, async index => {
      events.push(`start:${index}`)
      await Promise.resolve()
      events.push(`end:${index}`)
    }, () => false)
    expect(events).toEqual(['start:0', 'end:0', 'start:1', 'end:1', 'start:2', 'end:2'])
  })

  it('stops with AbortError when cancellation occurs during a call', async () => {
    const calls: number[] = []
    let cancelled = false
    await expect(runNativeVideoBatch(4, async index => {
      calls.push(index)
      cancelled = true
    }, () => cancelled)).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toEqual([0])
  })

  it('checks cancellation before the first call and bounds requested iterations to four', async () => {
    const cancelledCalls: number[] = []
    await expect(runNativeVideoBatch(4, async index => { cancelledCalls.push(index) }, () => true)).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelledCalls).toEqual([])

    const boundedCalls: number[] = []
    await runNativeVideoBatch(99, async index => { boundedCalls.push(index) }, () => false)
    expect(boundedCalls).toEqual([0, 1, 2, 3])

    const minimumCalls: number[] = []
    await runNativeVideoBatch(0, async index => { minimumCalls.push(index) }, () => false)
    expect(minimumCalls).toEqual([0])
    const nonFiniteCalls: number[] = []
    await runNativeVideoBatch(Number.NaN, async index => { nonFiniteCalls.push(index) }, () => false)
    expect(nonFiniteCalls).toEqual([0])
  })

  it('propagates an unknown failed attempt without starting or retrying later calls', async () => {
    const calls: number[] = []
    const unknownOutcome = new Error('submission outcome is unknown')
    await expect(runNativeVideoBatch(4, async index => {
      calls.push(index)
      if (index === 1) throw unknownOutcome
    }, () => false)).rejects.toBe(unknownOutcome)
    expect(calls).toEqual([0, 1])
  })
})
