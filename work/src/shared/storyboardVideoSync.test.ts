import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { clampToLegalDuration, connectedStoryboardVideo, normalizedGeneratorDurationPatch } from './storyboardVideoSync'

const node = (id: string, kind: StudioNode['data']['kind'], data: Partial<StudioNode['data']> = {}): StudioNode => ({ id, type: 'default', position: { x: 0, y: 0 }, data: { kind, title: id, ...data } as StudioNode['data'] })
const edge = (id: string, source: string, target: string): Edge => ({ id, source, target, sourceHandle: 'storyboard-out', targetHandle: 'storyboard-in' })

describe('direct Storyboard → Video Generator ownership', () => {
  it('covers below, above, nearest, and exact-tie-lower clamp branches', () => {
    expect(clampToLegalDuration(1, [4, 6, 10])).toBe(4)
    expect(clampToLegalDuration(12, [4, 6, 10])).toBe(10)
    expect(clampToLegalDuration(9, [4, 6, 10])).toBe(10)
    expect(clampToLegalDuration(8, [4, 6, 10])).toBe(6)
    expect(clampToLegalDuration(6, [4, 6, 10])).toBe(6)
  })

  it('reads the connected Generator budget without mutating any graph state', () => {
    const panels = [
      { id: 'one', prompt: 'First authored panel.', duration: 9, shotSize: 'wide' as const, camera: 'static' },
      { id: 'two', prompt: 'Second authored panel.', duration: 7, shotSize: 'medium' as const, camera: 'dolly-down-slow' },
    ]
    const storyboard = node('s', 'storyboard', { storyboardModelId: 'wan-controlled', storyboardDuration: 16, storyboardMode: 'single', storyboardPanels: panels })
    const generator = node('v1', 'video-generator', { videoEngine: 'fal-ai/veo3.1', duration: 8 })
    const nodes = [storyboard, generator]
    const edges = [edge('connected', 's', 'v1')]
    expect(connectedStoryboardVideo(nodes, edges, 's')).toEqual({ nodeId: 'v1', modelId: 'fal-ai/veo3.1', duration: 8, durationOptions: [4, 6, 8] })
    expect(nodes).toEqual([storyboard, generator])
    expect(storyboard.data.storyboardPanels).toBe(panels)
  })

  it('returns no budget for a disconnected Storyboard', () => {
    expect(connectedStoryboardVideo([node('s', 'storyboard')], [], 's')).toBeUndefined()
  })

  it('changes a connected Generator model without replacing Canvas graph state or Storyboard authority', () => {
    const panels = [
      { id: 'one', prompt: 'First authored panel.', duration: 9, shotSize: 'wide' as const, camera: 'static' },
      { id: 'two', prompt: 'Second authored panel.', duration: 7, shotSize: 'medium' as const, camera: 'dolly-down-slow' },
    ]
    const storyboard = { ...node('s', 'storyboard', { storyboardPanels: panels }), position: { x: 120, y: 80 } }
    const generator = { ...node('v1', 'video-generator', { videoEngine: 'fal-ai/kling-video/o3/pro/reference-to-video', duration: 15 }), position: { x: 520, y: 80 } }
    const canvasNodes = [storyboard, generator]
    const canvasEdges = [edge('connected', 's', 'v1')]
    let nextNodes: StudioNode[] | undefined

    expect(() => {
      const nextEngine = 'fal-ai/veo3.1'
      const durationPatch = normalizedGeneratorDurationPatch({ videoEngine: nextEngine, duration: generator.data.duration })
      nextNodes = canvasNodes.map((candidate) => candidate.id === generator.id
        ? { ...candidate, data: { ...candidate.data, videoEngine: nextEngine, ...durationPatch } }
        : candidate)
    }).not.toThrow()

    expect(nextNodes).toHaveLength(2)
    expect(nextNodes?.[0]).toBe(storyboard)
    expect(nextNodes?.[0].position).toEqual({ x: 120, y: 80 })
    expect(nextNodes?.[0].data.storyboardPanels).toBe(panels)
    expect(nextNodes?.[1].position).toEqual({ x: 520, y: 80 })
    expect(nextNodes?.[1].data).toMatchObject({ videoEngine: 'fal-ai/veo3.1', duration: 8, autoDuration: false })
    expect(canvasEdges).toEqual([edge('connected', 's', 'v1')])
    expect(connectedStoryboardVideo(nextNodes!, canvasEdges, storyboard.id)).toEqual({ nodeId: 'v1', modelId: 'fal-ai/veo3.1', duration: 8, durationOptions: [4, 6, 8] })
  })

  it('normalizes only the Generator own duration when its model changes', () => {
    expect(normalizedGeneratorDurationPatch({ videoEngine: 'fal-ai/veo3.1', duration: 5 })).toEqual({ duration: 4, autoDuration: false })
  })
})
