import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { ImportedAsset, StudioNode, WorkspaceCanvas } from '../../shared/types'
import { commitGraphToOrigin, generatedMediaDeletionPatch, generationEstimateFingerprint, isRunnableNodeKind, normalizedDiscreteDuration, reusableSelectorItemIsActive, runAfterSuccessfulFlush, sequenceCompletionPatch, styleAssetPreviewUrl } from './rendererBehavior'
import * as rendererBehavior from './rendererBehavior'

const node = (id: string, title = id): StudioNode => ({
  id,
  type: 'studio',
  position: { x: 0, y: 0 },
  data: { kind: 'video-generator', title },
})

const edge = (id: string): Edge => ({ id, source: 'shot-1', target: 'shot-2' })

function canvas(id: string, pageId: string, nodes: StudioNode[], edges: Edge[] = []): WorkspaceCanvas {
  return {
    id,
    name: id,
    activePageId: pageId,
    updatedAt: 'before',
    pages: [{ id: pageId, name: pageId, nodes, edges, viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: 'before' }],
  }
}

describe('origin-bound renderer state', () => {
  it('commits an async sequence graph only to its originating canvas and page', () => {
    const current = [
      canvas('origin-canvas', 'origin-page', [node('shot-1')]),
      canvas('active-canvas', 'active-page', [node('active-node')]),
    ]

    const next = commitGraphToOrigin(
      current,
      { canvasId: 'origin-canvas', pageId: 'origin-page' },
      [node('shot-1', 'completed'), node('continuity-frame')],
      [edge('continuity-edge')],
      'after',
    )

    expect(next[0].pages[0].nodes.map((item) => item.data.title)).toEqual(['completed', 'continuity-frame'])
    expect(next[0].pages[0].edges.map((item) => item.id)).toEqual(['continuity-edge'])
    expect(next[1]).toBe(current[1])
  })

  it('merges a sequence result into confirmation-time live generation history', () => {
    const live = {
      kind: 'video-generator' as const,
      title: 'Shot',
      generatedResults: [{ path: '/kept.mp4', url: 'kept', type: 'video' as const, modelId: 'model' }],
    }
    const patch = sequenceCompletionPatch(live, {
      path: '/new.mp4', url: 'new', type: 'video', modelId: 'model',
    }, 'done')

    expect(patch.generatedResults?.map((result) => result.path)).toEqual(['/kept.mp4', '/new.mp4'])
    expect(patch.activeResultIndex).toBe(1)
  })

  it('deletes from confirmation-time live history without dropping results generated while the dialog was open', () => {
    const patch = generatedMediaDeletionPatch({
      kind: 'video-generator',
      title: 'Shot',
      generatedResults: [
        { path: '/delete.mp4', url: 'delete', type: 'video', modelId: 'model' },
        { path: '/generated-later.mp4', url: 'later', type: 'video', modelId: 'model' },
      ],
      activeResultIndex: 0,
    }, '/delete.mp4')

    expect(patch.generatedResults?.map((result) => result.path)).toEqual(['/generated-later.mp4'])
    expect(patch.outputPath).toBe('/generated-later.mp4')
    expect(patch.activeResultIndex).toBe(0)
  })

  it('normalizes a Seedance five-second duration to a legal Veo discrete option', () => {
    expect(normalizedDiscreteDuration(5, [4, 6, 8])).toBe(4)
  })

  it('does not invalidate a card cost estimate when unrelated presentation state changes', () => {
    const before = generationEstimateFingerprint({ kind: 'video-generator', title: 'Shot', videoEngine: 'veo', duration: 4, quantity: 1 })
    const unrelated = generationEstimateFingerprint({ kind: 'video-generator', title: 'Renamed Shot', videoEngine: 'veo', duration: 4, quantity: 1, progress: 'Other state changed' })
    const estimateInputChanged = generationEstimateFingerprint({ kind: 'video-generator', title: 'Renamed Shot', videoEngine: 'veo', duration: 6, quantity: 1 })

    expect(unrelated).toBe(before)
    expect(estimateInputChanged).not.toBe(before)
  })

  it('uses Palette fallback for prompt-only prismstyle assets while retaining image style previews', () => {
    const asset = (mimeType: string, url: string): ImportedAsset => ({
      id: mimeType,
      name: 'Style',
      path: '/Style.prismstyle',
      mimeType,
      origin: 'generated',
      createdAt: 'now',
      url,
    })

    expect(styleAssetPreviewUrl(asset('application/vnd.prism-foundry.style+json', 'prism-asset://style'))).toBeUndefined()
    expect(styleAssetPreviewUrl(asset('image/png', 'prism-asset://preview'))).toBe('prism-asset://preview')
  })

  it('does not navigate away when the dirty-workflow flush fails', async () => {
    const calls: string[] = []
    const navigated = await runAfterSuccessfulFlush(
      async () => { calls.push('flush'); return false },
      async () => { calls.push('navigate') },
    )

    expect(navigated).toBe(false)
    expect(calls).toEqual(['flush'])
  })

  it('treats music generation as executable everywhere runnable nodes are gated', () => {
    expect(isRunnableNodeKind('music-generator')).toBe(true)
    expect(isRunnableNodeKind('prompt')).toBe(false)
  })

  it('duplicates only the node instance while preserving inputs, selections, and managed asset identity but resetting runtime state', () => {
    const duplicateNodeSnapshot = (rendererBehavior as unknown as {
      duplicateNodeSnapshot?: (source: StudioNode, id: string, position: StudioNode['position']) => StudioNode
    }).duplicateNodeSnapshot
    expect(duplicateNodeSnapshot).toBeTypeOf('function')
    if (!duplicateNodeSnapshot) return
    const reference: ImportedAsset = {
      id: 'managed-character-face', name: 'hero.png', path: '/project/hero.png', mimeType: 'image/png', origin: 'imported', createdAt: 'now',
      metadata: { assetName: 'hero', characterView: 'front' },
    }
    const source: StudioNode = {
      id: 'source-node', type: 'studio', selected: true, position: { x: 10, y: 20 },
      data: {
        kind: 'character', title: 'hero', referenceTag: '@hero', referenceAssets: [reference],
        characterInputMode: 'multi', imageProvider: 'fal', imageModel: 'model', runState: 'complete', progress: 'Saved', groupId: 'group-a',
      },
    }

    const duplicate = duplicateNodeSnapshot(source, 'duplicate-node', { x: 50, y: 60 })

    expect(duplicate).toEqual({
      ...source,
      id: 'duplicate-node',
      selected: false,
      position: { x: 50, y: 60 },
      data: { ...source.data, groupId: undefined, runState: 'idle', progress: undefined, error: undefined },
    })
    expect(duplicate.data.referenceAssets?.[0].id).toBe(reference.id)
    expect(duplicate.data).not.toBe(source.data)
  })

  it('keeps duplicated selector state isolated when same-tag Location assets are selected independently', () => {
    const locationA = { id: 'location-a', name: 'office.png', path: '/project/a/office.png', mimeType: 'image/png', origin: 'imported', createdAt: 'now' } as ImportedAsset
    const locationB = { id: 'location-b', name: 'office.png', path: '/project/b/office.png', mimeType: 'image/png', origin: 'imported', createdAt: 'now' } as ImportedAsset
    const original = { kind: 'location', title: 'Office', referenceTag: '@office', referenceAssets: [locationA] } as StudioNode['data']
    const duplicate = structuredClone(original)
    const selectedOnOriginal = { ...original, referenceAssets: [locationB] }
    const itemA = { referenceTag: '@office', referenceAssets: [locationA] }
    const itemB = { referenceTag: '@office', referenceAssets: [locationB] }

    expect(reusableSelectorItemIsActive(selectedOnOriginal, itemB)).toBe(true)
    expect(reusableSelectorItemIsActive(selectedOnOriginal, itemA)).toBe(false)
    expect(reusableSelectorItemIsActive(duplicate, itemA)).toBe(true)
    expect(reusableSelectorItemIsActive(duplicate, itemB)).toBe(false)
  })

  it('keeps one reusable selector source when several canvas nodes reference the same managed asset', () => {
    const uniqueReusableSelectorNodes = (rendererBehavior as unknown as {
      uniqueReusableSelectorNodes?: (nodes: StudioNode[]) => StudioNode[]
    }).uniqueReusableSelectorNodes
    expect(uniqueReusableSelectorNodes).toBeTypeOf('function')
    if (!uniqueReusableSelectorNodes) return
    const reference = { id: 'managed-character-face', name: 'hero.png', path: '/project/hero.png', mimeType: 'image/png', origin: 'imported', createdAt: 'now' } as ImportedAsset
    const first = node('first')
    first.data = { kind: 'character', title: 'hero', referenceTag: '@hero', referenceAssets: [reference] }
    const duplicate = structuredClone(first)
    duplicate.id = 'duplicate'
    const other = structuredClone(first)
    other.id = 'other'
    other.data.referenceAssets = [{ ...reference, id: 'managed-villain-face', path: '/project/villain.png' }]
    const differentKind = structuredClone(first)
    differentKind.id = 'upload'
    differentKind.data.kind = 'upload'

    expect(uniqueReusableSelectorNodes([differentKind, first, duplicate, other]).map((item) => item.id)).toEqual(['upload', 'first', 'other'])
  })

  it('keeps reusable selector thumbnails in stable identity order when a deployed node changes selection', () => {
    const asset = (id: string): ImportedAsset => ({ id, name: `${id}.png`, path: `/project/${id}.png`, mimeType: 'image/png', origin: 'imported', createdAt: 'now' })
    const reusable = (id: string, assetId: string): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'location', title: assetId, referenceAssets: [asset(assetId)] } })
    const sourceA = reusable('source-a', 'asset-a')
    const sourceB = reusable('source-b', 'asset-b')
    const sourceC = reusable('source-c', 'asset-c')
    const deploymentBefore = reusable('deployment', 'asset-a')
    const deploymentAfter = reusable('deployment', 'asset-c')
    const identities = (items: StudioNode[]) => rendererBehavior.uniqueReusableSelectorNodes(items).map((item) => item.data.referenceAssets?.[0].id)

    expect(identities([deploymentBefore, sourceA, sourceB, sourceC])).toEqual(['asset-a', 'asset-b', 'asset-c'])
    expect(identities([deploymentAfter, sourceA, sourceB, sourceC])).toEqual(['asset-a', 'asset-b', 'asset-c'])
  })

  it('keeps selection two and three independent while only saved-source add/remove changes their selector library', () => {
    const asset = (id: string): ImportedAsset => ({ id, name: `${id}.png`, path: `/project/${id}.png`, mimeType: 'image/png', origin: 'imported', createdAt: 'now' })
    const reusable = (id: string, assetId: string, selectorDeployment = false): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'location', title: assetId, referenceAssets: [asset(assetId)], selectorDeployment } })
    const sourceA = reusable('source-a', 'asset-a')
    const sourceB = reusable('source-b', 'asset-b')
    const sourceC = reusable('source-c', 'asset-c')
    const selectionTwoAfterClick = reusable('selection-2', 'asset-c', true)
    const selectionThreeUntouched = reusable('selection-3', 'asset-b', true)
    const sourceIds = (items: StudioNode[]) => rendererBehavior.reusableSelectorSourceNodes(items).map((item) => item.data.referenceAssets?.[0].id)

    expect(sourceIds([sourceA, sourceB, sourceC, selectionTwoAfterClick, selectionThreeUntouched])).toEqual(['asset-a', 'asset-b', 'asset-c'])
    expect(reusableSelectorItemIsActive(selectionTwoAfterClick.data, sourceC.data)).toBe(true)
    expect(reusableSelectorItemIsActive(selectionTwoAfterClick.data, sourceB.data)).toBe(false)
    expect(reusableSelectorItemIsActive(selectionThreeUntouched.data, sourceB.data)).toBe(true)
    expect(reusableSelectorItemIsActive(selectionThreeUntouched.data, sourceC.data)).toBe(false)
    expect(sourceIds([sourceA, sourceC, selectionTwoAfterClick, selectionThreeUntouched])).toEqual(['asset-a', 'asset-c'])
  })
})
