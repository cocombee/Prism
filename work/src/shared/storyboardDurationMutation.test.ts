import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { applyGeneratorLocalDurationPatch } from './storyboardDurationMutation'

const panels = [
  { id: 'one', prompt: 'First', duration: 2, shotSize: 'wide' as const, camera: 'static', transitionToNext: 'continue' as const },
  { id: 'two', prompt: 'Second', duration: 2, shotSize: 'medium' as const, camera: 'dolly-in' },
]
const storyboard: StudioNode = { id: 'storyboard', type: 'storyboard', position: { x: 90, y: 120 }, data: { kind: 'storyboard', title: 'Storyboard', storyboardPanels: panels, storyboardEditorOpen: true } }
const generator: StudioNode = { id: 'video', type: 'studio', position: { x: 520, y: 120 }, data: { kind: 'video-generator', title: 'Video Generator', videoEngine: 'fal-ai/bytedance/seedance/v2/text-to-video', duration: 5, autoDuration: true, frameRate: 24, aspectRatio: '16:9', resolution: '1080p' } }
const edge: Edge = { id: 'storyboard-video', source: 'storyboard', sourceHandle: 'storyboard-out', target: 'video', targetHandle: 'storyboard-in' }

describe('Generator-local duration mutation', () => {
  it('preserves mounted Canvas graph identity and every unrelated node field', () => {
    const nodes = [storyboard, generator]
    const edges = [edge]
    const next = applyGeneratorLocalDurationPatch(nodes, 'video', { duration: 10, autoDuration: false })
    expect(next).toHaveLength(2)
    expect(next[0]).toBe(storyboard)
    expect(next[0].position).toEqual({ x: 90, y: 120 })
    expect(next[0].data.storyboardPanels).toBe(panels)
    expect(next[1].position).toEqual(generator.position)
    expect(next[1].data).toEqual({ ...generator.data, duration: 10, autoDuration: false })
    expect(edges).toEqual([edge])
    expect(nodes).toEqual([storyboard, generator])
  })

  it('rejects invalid or non-Generator duration writes without a transient illegal graph', () => {
    expect(applyGeneratorLocalDurationPatch([storyboard, generator], 'video', { duration: Number.NaN, autoDuration: false })).toEqual([storyboard, generator])
    expect(applyGeneratorLocalDurationPatch([storyboard, generator], 'storyboard', { duration: 10, autoDuration: false })).toEqual([storyboard, generator])
  })
})
