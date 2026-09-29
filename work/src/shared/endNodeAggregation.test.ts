import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import { resolveWorkflowInput } from './workflowResolver'
import { compatibleNodeSources, compatibleNodeTargets, compatibleTargetHandle } from './nodeConnections'
import { nodeInputPorts } from './nodePorts'
import type { NodeKind, StudioNode, StudioNodeData } from './types'

let seq = 0
function node(kind: NodeKind, data: Partial<StudioNodeData> = {}): StudioNode {
  const id = `${kind}-${++seq}`
  return { id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, prompt: '', ...data } as StudioNodeData } as StudioNode
}
function edge(source: StudioNode, sourceHandle: string, target: StudioNode, targetHandle: string): Edge {
  return { id: `${source.id}->${target.id}:${targetHandle}`, source: source.id, sourceHandle, target: target.id, targetHandle }
}

describe('end node aggregation', () => {
  it('carries every independently authored upstream text into the terminal generator exactly once', () => {
    const prompt = node('prompt', { prompt: 'A courier crosses a flooded market at dawn.' })
    const semanticAsset = (id: string, identityDescription: string) => [{
      id, name: `${id}.png`, path: `/managed/${id}.png`, url: `asset://${id}`, mimeType: 'image/png', createdAt: 'fixture', metadata: { identityDescription },
    }]
    const character = node('character', { prompt: 'LOCAL_CHARACTER_GENERATION_HISTORY', referenceAssets: semanticAsset('mira', 'Mira, soaked canvas jacket.'), referenceTag: '@mira' })
    const location = node('location', { prompt: 'LOCAL_LOCATION_GENERATION_HISTORY', referenceAssets: semanticAsset('market', 'Flooded night market, sodium lamps.'), referenceTag: '@market' })
    const element = node('element', { prompt: 'LOCAL_ELEMENT_GENERATION_HISTORY', referenceAssets: semanticAsset('satchel', 'Brass courier satchel.'), referenceTag: '@satchel' })
    const style = node('style-reference', { stylePrompt: 'Kodak 5219, anamorphic flare.', referenceTag: '@look' })
    const storyboard = node('storyboard', {
      storyboardDuration: 12,
      storyboardPanels: [{ id: 'p1', prompt: 'Courier wades into frame.', duration: 'auto', shotSize: 'wide', camera: 'dolly-in' }],
    })
    const end = node('video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    const nodes = [prompt, character, location, element, style, storyboard, end]
    const edges = [
      edge(prompt, 'text-out', end, 'text-in'),
      edge(character, 'media-out', end, 'reference-in'),
      edge(location, 'media-out', end, 'reference-in'),
      edge(element, 'media-out', end, 'reference-in'),
      edge(style, 'media-out', end, 'style-in'),
      edge(storyboard, 'storyboard-out', end, 'storyboard-in'),
      // The same Style also feeds the Storyboard, so it reaches the end node twice.
      edge(style, 'media-out', storyboard, 'style-in'),
    ]

    const resolved = resolveWorkflowInput(end.id, nodes, edges)
    const text = resolved.prompt || ''
    for (const fragment of ['flooded market at dawn', 'Mira, soaked canvas jacket', 'sodium lamps', 'Brass courier satchel', 'anamorphic flare', 'Courier wades into frame']) {
      expect(text).toContain(fragment)
    }
    expect(text).not.toContain('LOCAL_')
    expect(text.split('Style Direction @look:')).toHaveLength(2)
    expect(resolved.storyboardShots).toHaveLength(1)
  })

  it('reads a legacy Assistant node text so migration cannot silently drop it', () => {
    const assistant = node('assistant', { prompt: '', assistantOutput: 'Neon reflections, handheld intimacy.' })
    const end = node('image-generator')
    const resolved = resolveWorkflowInput(end.id, [assistant, end], [edge(assistant, 'generated_prompt', end, 'text-in')])
    expect(resolved.prompt).toContain('Neon reflections, handheld intimacy.')
  })

  it('lets every media signal reach Gallery while keeping legacy Output source-only', () => {
    for (const source of [
      { kind: 'image-generator' as const },
      { kind: 'video-generator' as const },
      { kind: 'voiceover' as const },
      { kind: 'upscaler' as const },
    ]) {
      expect(compatibleNodeTargets(source)).toContain('gallery')
      expect(compatibleNodeTargets(source)).not.toContain('output')
    }
    expect(compatibleNodeSources({ kind: 'output' }, 'media-in')).toEqual([])
  })

  it('routes Gallery media to the handle it actually declares', () => {
    const declared = nodeInputPorts({ kind: 'gallery' }).map((port) => port.id)
    for (const source of [{ kind: 'image-generator' as const }, { kind: 'voiceover' as const }]) {
      expect(declared).toContain(compatibleTargetHandle(source, 'gallery'))
    }
  })
})
