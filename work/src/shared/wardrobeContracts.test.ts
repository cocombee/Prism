import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import { acceptedAssetBatch, type AssetBatchInspection } from './assetBatch'
import { semanticKindForCategory } from './assetClassification'
import { connectedInputRule } from './inputRules'
import { compatibleNodeSources, compatibleNodeTargets, compatibleTargetHandle, nodeConnectionError, recoveredConnectionTargetHandle } from './nodeConnections'
import { nodeInputPorts } from './nodePorts'
import { providerPromptPreview, referenceRoleInstructions } from './referenceInstructions'
import { groupSemanticAssets } from './semanticAssetCollections'
import type { ImportedAsset, StudioNode } from './types'
import { buildGenerationRequest } from './workflowResolver'

const wardrobeAsset: ImportedAsset = {
  id: 'wardrobe-coat',
  name: 'ceremonial-coat.png',
  path: '/project/04. Wardrobes/Ceremonial Coat/ceremonial-coat.png',
  url: 'prism-asset://local/wardrobe-coat',
  mimeType: 'image/png',
  category: 'wardrobe',
  origin: 'imported',
  createdAt: '2026-08-22T00:00:00.000Z',
  metadata: { assetName: 'Ceremonial Coat', wardrobeInputMode: 'single' },
}

const batchRow = (id: string): AssetBatchInspection => ({
  id,
  path: `/tmp/${id}.png`,
  fileName: `${id}.png`,
  mimeType: 'image/png',
  previewDataUrl: 'data:image/png;base64,preview',
  perceptualFingerprint: id.padEnd(64, '0').slice(0, 64),
  contentFingerprint: id.padEnd(64, '0').slice(0, 64),
  viewCount: 1,
})

describe('Wardrobe semantic asset contract', () => {
  it('maps Wardrobe storage and grouping as its own reusable category', () => {
    expect(semanticKindForCategory('wardrobe')).toBe('wardrobe')
    expect(groupSemanticAssets([wardrobeAsset])).toEqual([
      expect.objectContaining({ category: 'wardrobe', name: 'ceremonial-coat', assets: [wardrobeAsset] }),
    ])
  })

  it('uses the same two-row Batch acceptance contract as Location', () => {
    expect(acceptedAssetBatch('wardrobe', [batchRow('coat-a')]).canInsert).toBe(false)
    expect(acceptedAssetBatch('wardrobe', [batchRow('coat-a'), batchRow('coat-b')])).toMatchObject({ canInsert: true, rows: [expect.objectContaining({ id: 'coat-a' }), expect.objectContaining({ id: 'coat-b' })] })
  })

  it('connects Wardrobe only to one dedicated Character input while allowing source fan-out', () => {
    expect(nodeInputPorts({ kind: 'character' }).find((port) => port.id === 'wardrobe-in')).toMatchObject({ label: 'Wardrobe Reference', icon: 'wardrobe-reference', maxConnections: 1 })
    expect(nodeInputPorts({ kind: 'storyboard' }).some((port) => port.id === 'wardrobe-in')).toBe(false)
    expect(nodeInputPorts({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' }).some((port) => port.id === 'wardrobe-in')).toBe(false)
    expect(compatibleNodeTargets({ kind: 'wardrobe' })).toEqual(['character'])
    expect(compatibleNodeSources({ kind: 'character' }, 'wardrobe-in')).toEqual(['wardrobe'])
    expect(compatibleTargetHandle({ kind: 'wardrobe' }, 'character')).toBe('wardrobe-in')
    expect(nodeConnectionError('wardrobe', 'character', { kind: 'wardrobe' }, { kind: 'character' }, 'media-out', 'wardrobe-in')).toBeNull()
    expect(compatibleTargetHandle({ kind: 'wardrobe' }, 'image-generator')).toBe('')
    expect(recoveredConnectionTargetHandle({ kind: 'wardrobe' }, { kind: 'character' }, 'media-out', undefined)).toBe('wardrobe-in')
    expect(recoveredConnectionTargetHandle({ kind: 'style-reference' }, { kind: 'character' }, 'media-out', undefined)).toBe('style-in')
    expect(recoveredConnectionTargetHandle({ kind: 'wardrobe' }, { kind: 'character' }, 'media-out', 'style-in')).toBe('style-in')
    expect(recoveredConnectionTargetHandle({ kind: 'wardrobe' }, { kind: 'storyboard' }, 'media-out', undefined)).toBe('')
  })

  it('keeps Wardrobe authority explicitly bound to its Character in hidden and Seedance instructions', () => {
    const rule = connectedInputRule({ kind: 'wardrobe', title: 'Ceremonial Coat', referenceTag: '@ceremonial-coat' }, { kind: 'character', title: 'Idris', referenceTag: '@idris' }, 'wardrobe-in')
    expect(rule).toMatchObject({ tag: '@ceremonial-coat', label: 'Wardrobe' })
    expect(rule.rule).toContain('@ceremonial-coat governs the wardrobe of @idris')
    const hidden = referenceRoleInstructions([{ role: 'wardrobe', path: wardrobeAsset.path, tag: '@ceremonial-coat', boundCharacterTag: '@idris', mediaType: 'image', slot: 'reference' }])
    expect(hidden).toContain('@ceremonial-coat is the wardrobe authority and governs the wardrobe of @idris')
    expect(hidden).toContain('garment identity')

    const face: ImportedAsset = { ...wardrobeAsset, id: 'idris-face', name: 'idris.png', path: '/project/idris.png', category: 'character', metadata: { assetName: 'Idris', characterInputMode: 'single', characterView: 'front' } }
    const nodes: StudioNode[] = [
      { id: 'wardrobe', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'wardrobe', title: 'Ceremonial Coat', referenceTag: '@ceremonial-coat', referenceAssets: [wardrobeAsset], appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement' } },
      { id: 'character', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'character', title: 'Idris', referenceTag: '@idris', characterInputMode: 'single', referenceAssets: [face], characterAuthorityMode: 'identity-body-with-layers' } },
      { id: 'video', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'video-generator', title: 'Video', prompt: 'Idris walks through the hall.', videoEngine: 'bytedance/seedance-2.0/reference-to-video' } },
    ]
    const edges: Edge[] = [
      { id: 'wardrobe-character', source: 'wardrobe', sourceHandle: 'media-out', target: 'character', targetHandle: 'wardrobe-in' },
      { id: 'character-video', source: 'character', sourceHandle: 'media-out', target: 'video', targetHandle: 'character-in' },
    ]
    const request = buildGenerationRequest(nodes[2], nodes, edges)
    expect(request.references).toEqual(expect.arrayContaining([expect.objectContaining({ role: 'wardrobe', tag: '@ceremonial-coat', boundCharacterTag: '@idris' })]))
    const preview = providerPromptPreview(request)
    expect(preview).toContain('Use @idris as Idris.\nUse @ceremonial-coat for @idris\'s wardrobe.')
    expect(preview).not.toContain('@ceremonial-coat remains worn only by @idris; the connected reference remains sole visual authority.')
    expect(preview).not.toMatch(/@Image\d+/)
    expect(preview).not.toContain('@idris character — identity view; body proportions, wardrobe, accessories')
  })
})
