import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { GenerationRequest, NodeKind, StudioNodeData } from './types'
import { assertGenerationRequirements } from './generationReadiness'
import { projectSemanticAssetData, semanticAssetAvailability, semanticEdgePresentation } from './semanticAssetAvailability'

const kinds = ['character', 'wardrobe', 'element', 'location', 'style-reference'] as const
const data = (kind: typeof kinds[number], id: string): StudioNodeData => ({
  kind,
  title: `${kind}-${id}`,
  referenceAssets: [{ id, name: id, path: `/disposable/${id}.png`, url: `prism-asset:///${id}.png`, mimeType: 'image/png', createdAt: '' }],
  ...(kind === 'style-reference' ? { stylePrompt: 'Saved custom style.', styleSavedAt: '2026-08-27' } : {}),
})

describe('semantic asset availability projection', () => {
  it.each(kinds)('recomputes %s online → offline → online from the live missing-ID inventory', (kind) => {
    const online = projectSemanticAssetData(data(kind, `${kind}-A`), [])
    const offline = projectSemanticAssetData(data(kind, `${kind}-B`), [`${kind}-B`])
    const relinked = projectSemanticAssetData(offline, [])
    expect(semanticAssetAvailability(online).state).toBe('online')
    expect(semanticAssetAvailability(offline)).toMatchObject({ state: 'offline', unavailableAssetIds: [`${kind}-B`] })
    expect(semanticAssetAvailability(relinked).state).toBe('online')
  })

  it('keeps exact persisted edge topology/role while projecting the existing Not Ready red-wire presentation', () => {
    const edge: Edge = { id: 'semantic-edge', source: 'character', sourceHandle: 'media-out', target: 'video', targetHandle: 'character-in', data: { inputFidelity: 'lock' }, animated: true }
    const offlineData = projectSemanticAssetData(data('character', 'character-B'), ['character-B'])
    const projected = semanticEdgePresentation(edge, offlineData)
    expect(projected).toMatchObject({ id: edge.id, source: edge.source, sourceHandle: edge.sourceHandle, target: edge.target, targetHandle: edge.targetHandle, animated: false, data: { inputFidelity: 'lock', semanticOffline: true } })
    expect(projected.className || '').not.toContain('semantic-offline-edge')
    expect(projected.style).toMatchObject({ stroke: '#ff596d', strokeWidth: 2 })
    expect(projected.style).not.toHaveProperty('opacity')
    expect(projected.style).not.toHaveProperty('strokeDasharray')
    expect(semanticEdgePresentation(edge, projectSemanticAssetData(offlineData, []))).toBe(edge)
  })

  it('makes the main-process requirement assertion reject offline semantic evidence before provider dispatch', () => {
    const request = { nodeId: 'video', kind: 'video-generator' as NodeKind, prompt: 'Animate.', videoEngine: 'bytedance/seedance-2.5/reference-to-video', offlineSemanticSources: [{ nodeId: 'character', kind: 'character' as const, role: 'character' as const, title: 'Hero', assetIds: ['hero-B'] }] } satisfies GenerationRequest
    expect(() => assertGenerationRequirements(request)).toThrow('relink Hero (Media Offline)')
  })
})
