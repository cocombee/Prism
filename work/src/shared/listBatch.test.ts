import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { generatorBatchType, synchronizeListBatchItems } from './listBatch'

const generator = (quantity: number, overrides: Partial<StudioNode['data']> = {}): StudioNode => ({
  id: 'generator',
  type: 'studio',
  position: { x: 0, y: 0 },
  data: { kind: 'video-generator', title: 'Video Generator', quantity, runState: 'idle', ...overrides },
})

describe('generator-linked List batches', () => {
  it('mirrors one pending media box per requested generator output', () => {
    const items = synchronizeListBatchItems([], [generator(3)])
    expect(items).toHaveLength(3)
    expect(items).toEqual(items.map((item, index) => expect.objectContaining({ id: `batch:generator:${index}`, type: 'video', sourceNodeId: 'generator', sourceResultIndex: index, status: 'pending' })))
  })

  it('replaces pending boxes with completed media without duplicating the batch', () => {
    const results = [0, 1, 2].map((index) => ({ path: `/project/${index}.mp4`, url: `file:///project/${index}.mp4`, type: 'video' as const, modelId: 'seedance' }))
    const items = synchronizeListBatchItems([], [generator(3, { generatedResults: results, runState: 'complete' })])
    expect(items).toHaveLength(3)
    expect(items.map((item) => item.asset?.path)).toEqual(['/project/0.mp4', '/project/1.mp4', '/project/2.mp4'])
    expect(items.every((item) => item.status === 'complete')).toBe(true)
  })

  it('removes only excess pending slots when quantity decreases and preserves completed media', () => {
    const pending = synchronizeListBatchItems([], [generator(3)])
    expect(synchronizeListBatchItems(pending, [generator(1)])).toHaveLength(1)
    const completed = synchronizeListBatchItems([], [generator(3, { generatedResults: [0, 1, 2].map((index) => ({ path: `/project/${index}.mp4`, url: `file:///project/${index}.mp4`, type: 'video' as const, modelId: 'seedance' })) })])
    expect(synchronizeListBatchItems(completed, [generator(1, { generatedResults: [0, 1, 2].map((index) => ({ path: `/project/${index}.mp4`, url: `file:///project/${index}.mp4`, type: 'video' as const, modelId: 'seedance' })) })])).toHaveLength(3)
  })

  it('keeps manual media after synchronized items and rejects text as a List medium', () => {
    const manual = [{ id: 'manual', type: 'image' as const, asset: { id: 'manual', name: 'Still', path: '/project/still.png', mimeType: 'image/png', createdAt: 'now' } }, { id: 'legacy', type: 'text' as const, text: 'legacy' }]
    const items = synchronizeListBatchItems(manual, [generator(1)])
    expect(items.map((item) => item.id)).toEqual(['batch:generator:0', 'manual'])
    expect(generatorBatchType({ kind: 'image-generator' })).toBe('image')
    expect(generatorBatchType({ kind: 'prompt' })).toBeNull()
  })
})
