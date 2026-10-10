import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { describeFalRuntimeInputs } from './falRuntimeInputs'
import type { FalSchemaContract } from './falSchemaBinding'
import { clampToLegalDuration, connectedStoryboardVideo, normalizedGeneratorDurationPatch } from './storyboardVideoSync'

const node = (id: string, kind: StudioNode['data']['kind'], data: Partial<StudioNode['data']> = {}): StudioNode => ({ id, type: 'default', position: { x: 0, y: 0 }, data: { kind, title: id, ...data } as StudioNode['data'] })
const edge = (id: string, source: string, target: string): Edge => ({ id, source, target, sourceHandle: 'storyboard-out', targetHandle: 'storyboard-in' })

describe('direct Storyboard → Video Generator ownership', () => {
  it('reads native contract/values, preserves authored graph, and never falls back to stale Wan',()=>{
    const contract:FalSchemaContract={endpointId:'fixture/model/text-to-video',schemaPath:'/fixture',category:'text-to-video',input:{type:'object',properties:{duration:{type:'integer',minimum:4,maximum:30,description:'Duration of the generated video in seconds.'}}},output:{type:'object'}}
    contract.runtime={...describeFalRuntimeInputs(contract),fingerprint:'fixture'}
    const storyboard=node('s','storyboard'),generator=node('v','video-generator',{videoEngine:'wan-controlled',duration:5,falNative:{endpointId:contract.endpointId,label:'Fixture',flow:'video',fingerprint:'fixture',values:{duration:30},media:[]}})
    const nodes=[storyboard,generator],edges=[edge('native','s','v')],before=JSON.stringify({nodes,edges})
    expect(connectedStoryboardVideo(nodes,edges,'s',()=>contract)).toMatchObject({modelId:contract.endpointId,duration:30,maximumSeconds:30,minimumSeconds:4})
    expect(connectedStoryboardVideo(nodes,edges,'s')).toMatchObject({modelId:contract.endpointId,duration:undefined,timingError:expect.stringContaining('Refresh')})
    expect(JSON.stringify({nodes,edges})).toBe(before)
  })
  it('flags an unsupported saved legacy duration rather than displaying a clamped value',()=>{
    const nodes=[node('s','storyboard'),node('v','video-generator',{videoEngine:'fal-ai/veo3.1',duration:5})]
    expect(connectedStoryboardVideo(nodes,[edge('invalid','s','v')],'s')).toMatchObject({duration:undefined,maximumSeconds:8,timingError:expect.stringContaining('unsupported')})
    expect(nodes[1].data.duration).toBe(5)
  })
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
    expect(connectedStoryboardVideo(nodes, edges, 's')).toEqual({ nodeId: 'v1', modelId: 'fal-ai/veo3.1', duration: 8, durationOptions: [4, 6, 8], minimumSeconds:4, maximumSeconds:8, timingError:undefined })
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
    expect(connectedStoryboardVideo(nextNodes!, canvasEdges, storyboard.id)).toEqual({ nodeId: 'v1', modelId: 'fal-ai/veo3.1', duration: 8, durationOptions: [4, 6, 8], minimumSeconds:4, maximumSeconds:8, timingError:undefined })
  })

  it('normalizes only the Generator own duration when its model changes', () => {
    expect(normalizedGeneratorDurationPatch({ videoEngine: 'fal-ai/veo3.1', duration: 5 })).toEqual({ duration: 4, autoDuration: false })
  })
})
