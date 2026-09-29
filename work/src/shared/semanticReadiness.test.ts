import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { incompleteSemanticReason, semanticWarning, upstreamIncompleteSemanticReasons, upstreamSemanticWarnings } from './semanticReadiness'

const node = (id: string, data: StudioNode['data']): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data })

describe('reusable dependency readiness', () => {
  it('distinguishes an incomplete typed source from an incompatible connection', () => {
    expect(incompleteSemanticReason({ kind: 'character', title: 'Hero', referenceAssets: [] })).toContain('required Face')
    expect(incompleteSemanticReason({ kind: 'element', title: 'Chair', referenceAssets: [] })).toContain('required Three-Quarter view')
    expect(incompleteSemanticReason({ kind: 'location', title: 'Studio', referenceAssets: [] })).toContain('Location image')
    expect(incompleteSemanticReason({ kind: 'style-reference', title: 'Noir', prompt: 'dark', runState: 'idle' })).toContain('finalized')
    expect(incompleteSemanticReason({ kind: 'style-reference', title: 'Noir', prompt: 'dark', runState: 'complete' })).toBeNull()
  })

  it('requires Element Three-Quarter even when another named view already exists', () => {
    const side = { id: 'side', name: 'side.png', path: '/tmp/side.png', url: 'asset://side', mimeType: 'image/png', category: 'element' as const, createdAt: '2026-08-02T00:00:00.000Z', metadata: { elementView: 'side' as const } }
    const threeQuarter = { ...side, id: 'three-quarter', name: 'three-quarter.png', path: '/tmp/three-quarter.png', metadata: { elementView: 'three-quarter' as const } }
    expect(incompleteSemanticReason({ kind: 'element', title: 'Chair', referenceAssets: [side] })).toContain('required Three-Quarter view')
    expect(incompleteSemanticReason({ kind: 'element', title: 'Chair', referenceAssets: [threeQuarter] })).toBeNull()
  })

  it('blocks a target when an unfinished dependency is hidden fifteen links upstream', () => {
    const nodes: StudioNode[] = [node('style', { kind: 'style-reference', title: 'Draft Style', prompt: 'draft', runState: 'idle' })]
    const edges: Edge[] = []
    let previous = 'style'
    for (let index = 1; index <= 15; index += 1) {
      const id = `pass-${index}`
      nodes.push(node(id, { kind: 'router', title: `Pass ${index}` }))
      edges.push({ id: `edge-${index}`, source: previous, target: id })
      previous = id
    }
    nodes.push(node('generator', { kind: 'image-generator', title: 'Image Generator' }))
    edges.push({ id: 'edge-final', source: previous, target: 'generator' })
    expect(upstreamIncompleteSemanticReasons('generator', nodes, edges)).toEqual(['@draft-style needs a finalized reusable Style prompt'])
  })

  it('warns without marking a stale compiled Storyboard incomplete', () => {
    const stale = { kind: 'storyboard' as const, title: 'Chase', referenceTag: '@chase', storyboardNeedsCompile: true, outputPath: '/project/chase.png' }
    expect(incompleteSemanticReason(stale)).toBeNull()
    expect(semanticWarning(stale)).toContain('unsaved panel edits')
    expect(semanticWarning({ ...stale, outputPath: undefined, outputUrl: undefined })).toBeNull()
    const nodes = [node('story', stale), node('video', { kind: 'video-generator', title: 'Video' })]
    expect(upstreamSemanticWarnings('video', nodes, [{ id: 'story-video', source: 'story', target: 'video', targetHandle: 'storyboard-in' }])).toEqual([
      '@chase has unsaved panel edits — recompile to include the current shot map',
    ])
  })
})
