import { describe, expect, it } from 'vitest'
import type { StudioNode } from '../../shared/types'
import { continuityVideoEngine, orderedSequenceNodes } from './sequenceContinuity'

const node = (id: string, x: number, order?: number): StudioNode => ({ id, type: 'studio', position: { x, y: 0 }, data: { kind: 'video-generator', title: id, sequenceEnabled: true, sequenceOrder: order } })

describe('sequence continuity', () => {
  it('orders opted-in video nodes explicitly, then spatially', () => {
    expect(orderedSequenceNodes([node('third', 300), node('second', 200, 2), node('first', 100, 1)]).map((item) => item.id)).toEqual(['first', 'second', 'third'])
  })

  it('selects the corresponding image endpoint for text-only models', () => {
    expect(continuityVideoEngine('bytedance/seedance-2.0/fast/text-to-video')).toBe('bytedance/seedance-2.0/fast/image-to-video')
    expect(continuityVideoEngine('fal-ai/kling-video/v3/standard/text-to-video')).toBe('fal-ai/kling-video/v3/standard/image-to-video')
    expect(() => continuityVideoEngine('wan-controlled')).toThrow('no Starting Image endpoint')
  })
})
