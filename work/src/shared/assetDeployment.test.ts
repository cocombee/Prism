import { describe, expect, it } from 'vitest'
import { nodeDirectlyDeploysAsset, pruneAssetDeployments } from './assetDeployment'
import type { CanvasPage, ImportedAsset, StudioNode, WorkspaceCanvas } from './types'

const asset = (id: string, category: ImportedAsset['category'] = 'image'): ImportedAsset => ({
  id,
  name: `${id}.png`,
  path: `/project/${id}.png`,
  mimeType: 'image/png',
  category,
  createdAt: '2026-08-16T00:00:00.000Z',
  metadata: ['character', 'element', 'location'].includes(category || '') ? { assetName: 'shared-asset' } : undefined,
})

const node = (id: string, kind: StudioNode['data']['kind'], data: Partial<StudioNode['data']> = {}): StudioNode => ({
  id,
  type: 'studio',
  position: { x: 0, y: 0 },
  data: { kind, title: id, ...data },
})

const page = (id: string, nodes: StudioNode[], edges: CanvasPage['edges'] = []): CanvasPage => ({
  id,
  name: id,
  nodes,
  edges,
  viewport: { x: 0, y: 0, zoom: 1 },
  updatedAt: '2026-08-16T00:00:00.000Z',
})

describe('project-wide asset deployment deletion', () => {
  it('preserves reusable node shells while removing the managed asset from every Canvas and Page', () => {
    const face = asset('face', 'character')
    const consumer = node('consumer', 'video-generator')
    const canvases: WorkspaceCanvas[] = [
      { id: 'canvas-a', name: 'Canvas A', activePageId: 'page-a', updatedAt: '', pages: [page('page-a', [node('character-a', 'character', { referenceTag: '@shared-asset', referenceAssets: [face], characterSheetPath: face.path }), consumer], [{ id: 'edge-a', source: 'character-a', target: 'consumer' }])] },
      { id: 'canvas-b', name: 'Canvas B', activePageId: 'page-b', updatedAt: '', pages: [page('page-b', [node('character-b', 'character', { referenceTag: '@shared-asset', referenceAssets: [face] })])] },
    ]

    const result = pruneAssetDeployments(canvases, [face])
    expect(result.affectedNodeCount).toBe(2)
    expect(result.affectedPageCount).toBe(2)
    expect(result.affectedCanvasCount).toBe(2)
    expect(result.canvases[0].pages[0].nodes.map((item) => item.id)).toEqual(['character-a', 'consumer'])
    expect(result.canvases[0].pages[0].nodes[0].data.referenceAssets).toEqual([])
    expect(result.canvases[0].pages[0].nodes[0].data.referenceTag).toBeUndefined()
    expect(result.canvases[0].pages[0].nodes[0].data.characterSheetPath).toBeUndefined()
    expect(result.canvases[0].pages[0].edges).toHaveLength(1)
    expect(result.canvases[1].pages[0].nodes.map((item) => item.id)).toEqual(['character-b'])
  })

  it('scrubs generated history, Lists, and Storyboard panels so no cached snapshot can restore deleted media', () => {
    const deleted = asset('deleted')
    const kept = asset('kept')
    const generator = node('generator', 'image-generator', {
      outputPath: deleted.path,
      outputUrl: 'deleted-url',
      generatedResults: [
        { path: deleted.path, url: 'deleted-url', type: 'image', modelId: 'model' },
        { path: kept.path, url: 'kept-url', type: 'image', modelId: 'model' },
      ],
    })
    const list = node('list', 'list', { listItems: [{ id: 'deleted-item', type: 'image', asset: deleted }, { id: 'kept-item', type: 'image', asset: kept }] })
    const storyboard = node('story', 'storyboard', { storyboardPanels: [{ id: 'panel', prompt: '', duration: 1, asset: deleted }] })
    const canvas: WorkspaceCanvas = { id: 'canvas', name: 'Canvas', activePageId: 'page', updatedAt: '', pages: [page('page', [generator, list, storyboard])] }

    const result = pruneAssetDeployments([canvas], [deleted])
    const [nextGenerator, nextList, nextStoryboard] = result.canvases[0].pages[0].nodes
    expect(nextGenerator.data.generatedResults?.map((item) => item.path)).toEqual([kept.path])
    expect(nextGenerator.data.outputPath).toBe(kept.path)
    expect(nextList.data.listItems?.map((item) => item.id)).toEqual(['kept-item'])
    expect(nextStoryboard.data.storyboardPanels?.[0].asset).toBeUndefined()
    expect(nextStoryboard.data.storyboardNeedsCompile).toBe(true)
  })

  it('does not mistake embedded generator media for a directly deployed library node', () => {
    const generated = asset('generated')
    expect(nodeDirectlyDeploysAsset(node('generator', 'image-generator', { outputPath: generated.path }), [generated])).toBe(false)
    expect(nodeDirectlyDeploysAsset(node('upload', 'upload', { assetPath: generated.path }), [generated])).toBe(true)
  })
})
