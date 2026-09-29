import { describe, expect, it } from 'vitest'
import type { ImportedAsset, StudioNode, WorkflowDocument } from '../shared/types'
import { workflowMediaAssets } from './workflowMediaAssets'

const node = (id: string, assetPath: string): StudioNode => ({
  id,
  type: 'studio',
  position: { x: 0, y: 0 },
  data: { kind: 'upload', title: id, assetPath, assetUrl: `prism-asset://local/${encodeURIComponent(assetPath)}`, outputType: 'image' },
})

const workflow = (nodes: StudioNode[]): WorkflowDocument => ({
  schemaVersion: 1,
  id: 'workflow',
  name: 'Fixture',
  createdAt: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
  nodes,
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
})

const mimeFor = (path: string) => path.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'image/png'

describe('workflow media asset recovery', () => {
  it('exposes unindexed ordinary node media as a stable relinkable asset', () => {
    const missingPath = '/project/07. Imported Assets/01. Images/ACTOR-C.png'
    const result = workflowMediaAssets(workflow([node('actor-c', missingPath)]), [], mimeFor)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'ACTOR-C.png', path: missingPath, mimeType: 'image/png', category: 'image', origin: 'imported' })
    expect(result[0].id).toMatch(/^workflow-media:/)
  })

  it('does not duplicate a path already owned by the managed asset index', () => {
    const path = '/project/07. Imported Assets/01. Images/actor.png'
    const indexed: ImportedAsset = { id: 'managed', name: 'actor.png', path, mimeType: 'image/png', category: 'image', origin: 'imported', createdAt: '2026-08-22T00:00:00.000Z' }
    expect(workflowMediaAssets(workflow([node('actor', path)]), [indexed], mimeFor)).toEqual([])
  })

  it('deduplicates the same orphan path across legacy, page, and canvas node collections', () => {
    const path = '/project/missing.png'
    const document = workflow([node('legacy', path)])
    document.pages = [{ id: 'page', name: 'Page', nodes: [node('page-node', path)], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: document.updatedAt }]
    document.canvases = [{ id: 'canvas', name: 'Canvas', pages: [{ id: 'nested', name: 'Nested', nodes: [node('nested-node', path)], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: document.updatedAt }], activePageId: 'nested', updatedAt: document.updatedAt }]
    expect(workflowMediaAssets(document, [], mimeFor)).toHaveLength(1)
  })
})
