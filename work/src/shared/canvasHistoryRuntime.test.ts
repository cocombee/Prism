import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { canvasHistoryEdges, recordCanvasHistorySnapshot, switchCanvasHistoryOwner, sanitizeCanvasHistoryNodes, type CanvasHistoryState } from './canvasHistoryRuntime'
import type { Edge } from '@xyflow/react'

const node = (id: string, data: Partial<StudioNode['data']>): StudioNode => ({ id, type: 'studio', position: { x: 12, y: 34 }, data: { kind: 'storyboard', title: id, ...data } })

describe('Canvas history runtime sanitization', () => {
  it('does not create a content checkpoint when only connection selection changes', () => {
    const edge: Edge = { id: 'edge', source: 'location', target: 'board', sourceHandle: 'output', targetHandle: 'location-in', selected: false, data: { rule: 'Keep @set.' }, style: { stroke: '#a68cff' } }
    const before = JSON.stringify(canvasHistoryEdges([edge]))
    expect(JSON.stringify(canvasHistoryEdges([{ ...edge, selected: true }]))).toBe(before)
    expect(JSON.stringify(canvasHistoryEdges([]))).not.toBe(before)
    expect(canvasHistoryEdges([edge])[0]).toEqual({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle, data: edge.data, style: edge.style })
    expect(edge.selected).toBe(false)
  })

  it('keeps independent page history, including pending edits and redo, on navigation away and back', () => {
    const histories = new Map<string, CanvasHistoryState>()
    const alpha: CanvasHistoryState = { undo: [], redo: [], baseline: 'Alpha original' }
    const beta = switchCanvasHistoryOwner(histories, 'project/canvas/alpha', 'project/canvas/beta', alpha, 'Alpha edited', 'Beta original')
    expect(beta).toEqual({ undo: [], redo: [], baseline: 'Beta original' })
    const betaEdited = recordCanvasHistorySnapshot(beta, 'Beta edited')
    const returnedAlpha = switchCanvasHistoryOwner(histories, 'project/canvas/beta', 'project/canvas/alpha', betaEdited, 'Beta edited', 'Alpha edited')
    expect(returnedAlpha).toEqual({ undo: ['Alpha original'], redo: [], baseline: 'Alpha edited' })
    const alphaUndone: CanvasHistoryState = { undo: [], redo: ['Alpha edited'], baseline: 'Alpha original' }
    const returnedBeta = switchCanvasHistoryOwner(histories, 'project/canvas/alpha', 'project/canvas/beta', alphaUndone, 'Alpha original', 'Beta edited')
    expect(returnedBeta).toEqual({ undo: ['Beta original'], redo: [], baseline: 'Beta edited' })
    expect(switchCanvasHistoryOwner(histories, 'project/canvas/beta', 'project/canvas/alpha', returnedBeta, 'Beta edited', 'Alpha original').redo).toEqual(['Alpha edited'])
  })

  it('captures only content changes, retains redo on selection-only renders, and never records a restoration as an edit', () => {
    const original: CanvasHistoryState = { undo: ['earlier'], redo: ['future'], baseline: 'current' }
    expect(recordCanvasHistorySnapshot(original, 'current')).toBe(original)
    expect(recordCanvasHistorySnapshot(original, 'edited')).toEqual({ undo: ['earlier', 'current'], redo: [], baseline: 'edited' })
    expect(recordCanvasHistorySnapshot(original, 'restored', true)).toEqual({ undo: ['earlier'], redo: ['future'], baseline: 'restored' })
    const histories = new Map<string, CanvasHistoryState>()
    switchCanvasHistoryOwner(histories, 'alpha', 'beta', original, 'restored', 'new page', true)
    expect(histories.get('alpha')).toEqual({ undo: ['earlier'], redo: ['future'], baseline: 'restored' })
    expect(switchCanvasHistoryOwner(histories, 'beta', 'another activation/alpha', original, 'current', 'other project').undo).toEqual([])
  })

  it('removes running Storyboard presentation while preserving authored panels and layout', () => {
    const panels = [{ id: 'panel', prompt: 'Authored sentence.', duration: 2, locked: true }]
    const [sanitized] = sanitizeCanvasHistoryNodes([node('board', { runState: 'running', progress: 'Revamping 3 panels', runStartedAt: '2026-08-23T00:00:00Z', storyboardPanels: panels })])
    expect(sanitized).toMatchObject({ id: 'board', position: { x: 12, y: 34 }, data: { runState: 'idle', storyboardPanels: panels } })
    expect(sanitized.data.progress).toBeUndefined()
    expect(sanitized.data.runStartedAt).toBeUndefined()
  })

  it('normalizes queued generators and running sequences but preserves terminal states and errors', () => {
    const sanitized = sanitizeCanvasHistoryNodes([
      node('queued', { kind: 'video-generator', runState: 'queued', progress: 'Queued', sequenceStatus: 'running' }),
      node('complete', { kind: 'video-generator', runState: 'complete', progress: 'Video ready', sequenceStatus: 'complete' }),
      node('error', { kind: 'video-generator', runState: 'error', error: 'Reconnect provider.', sequenceStatus: 'failed' }),
    ])
    expect(sanitized[0].data).toMatchObject({ runState: 'idle', sequenceStatus: 'idle' })
    expect(sanitized[0].data.progress).toBeUndefined()
    expect(sanitized[1].data).toMatchObject({ runState: 'complete', progress: 'Video ready', sequenceStatus: 'complete' })
    expect(sanitized[2].data).toMatchObject({ runState: 'error', error: 'Reconnect provider.', sequenceStatus: 'failed' })
  })
})
