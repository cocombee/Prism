import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { sanitizeCanvasHistoryNodes } from './canvasHistoryRuntime'

const node = (id: string, data: Partial<StudioNode['data']>): StudioNode => ({ id, type: 'studio', position: { x: 12, y: 34 }, data: { kind: 'storyboard', title: id, ...data } })

describe('Canvas history runtime sanitization', () => {
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
