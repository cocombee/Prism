import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { INTERRUPTED_GENERATION_MESSAGE, mergeLiveGeneratedResults, pruneMissingGeneratedResults, recoverCompletedGenerationNodes, recoverInterruptedGenerationNodes } from './workflowRunRecovery'

const node = (id: string, data: Partial<StudioNode['data']> = {}): StudioNode => ({
  id,
  type: 'studio',
  position: { x: 0, y: 0 },
  data: { kind: 'image-generator', title: id, ...data },
})

describe('recoverInterruptedGenerationNodes', () => {
  it('turns persisted queued and running states into an honest terminal error', () => {
    const recovered = recoverInterruptedGenerationNodes([
      node('queued', { runState: 'queued', progress: 'Submitting…' }),
      node('running', { runState: 'running', progress: 'Generating…' }),
    ])

    for (const item of recovered) {
      expect(item.data).toMatchObject({ runState: 'error', error: INTERRUPTED_GENERATION_MESSAGE })
      expect(item.data.progress).toBeUndefined()
    }
  })

  it('preserves prior output so the recovered action remains Rerun', () => {
    const previousOutput = '/project/generated/previous.png'
    const [recovered] = recoverInterruptedGenerationNodes([
      node('rerun', { runState: 'running', outputPath: previousOutput, outputUrl: 'prism-asset://previous' }),
    ])

    expect(recovered.data).toMatchObject({
      runState: 'error',
      outputPath: previousOutput,
      outputUrl: 'prism-asset://previous',
    })
  })

  it('marks an interrupted sequence shot failed and leaves terminal nodes unchanged', () => {
    const complete = node('complete', { runState: 'complete', progress: 'Complete' })
    const error = node('error', { runState: 'error', error: 'Provider rejected the request.' })
    const recovered = recoverInterruptedGenerationNodes([
      node('sequence', { runState: 'running', sequenceStatus: 'running' }),
      complete,
      error,
    ])

    expect(recovered[0].data.sequenceStatus).toBe('failed')
    expect(recovered[1]).toBe(complete)
    expect(recovered[2]).toBe(error)
  })
})

describe('recoverCompletedGenerationNodes', () => {
  it('restores the exact completed run from durable History without resurrecting older deleted results', () => {
    const previous = { path: '/project/generated/fifth.jpg', url: 'prism-asset://fifth', type: 'image' as const, modelId: 'openai/gpt-image-2/edit' }
    const [recovered] = recoverCompletedGenerationNodes([
      node('generator', {
        runState: 'error',
        runStartedAt: '2026-08-16T09:19:43.943Z',
        generatedResults: [previous],
        outputPath: previous.path,
        outputUrl: previous.url,
      }),
    ], [
      { id: 'older', nodeId: 'generator', nodeTitle: 'image-generator', modelId: previous.modelId, status: 'complete', createdAt: '2026-08-15T18:34:44.224Z', outputPath: '/project/generated/intentionally-deleted.jpg', outputUrl: 'prism-asset://deleted' },
      { id: 'sixth', nodeId: 'generator', nodeTitle: 'image-generator', modelId: previous.modelId, status: 'complete', createdAt: '2026-08-16T09:21:48.091Z', outputPath: '/project/generated/sixth.jpg', outputUrl: 'prism-asset://sixth' },
    ])

    expect(recovered.data.generatedResults?.map((result) => result.path)).toEqual([previous.path, '/project/generated/sixth.jpg'])
    expect(recovered.data).toMatchObject({ runState: 'complete', outputPath: '/project/generated/sixth.jpg', activeResultIndex: 1 })
    expect(recovered.data.error).toBeUndefined()
    expect(recovered.data.runStartedAt).toBeUndefined()
  })

  it('does nothing without an exact persisted run marker', () => {
    const original = node('generator', { runState: 'complete' })
    const recovered = recoverCompletedGenerationNodes([original], [
      { id: 'old', nodeId: 'generator', nodeTitle: 'image-generator', modelId: 'model', status: 'complete', createdAt: '2026-08-16T09:21:48.091Z', outputPath: '/project/generated/old.jpg', outputUrl: 'prism-asset://old' },
    ])
    expect(recovered[0]).toBe(original)
  })
})

describe('pruneMissingGeneratedResults', () => {
  it('removes a deleted managed result instead of leaving a broken carousel slot', () => {
    const [pruned] = pruneMissingGeneratedResults([
      node('generator', {
        runState: 'complete',
        generatedResults: [
          { path: '/project/kept-a.jpg', url: 'prism-asset://kept-a', type: 'image', modelId: 'model' },
          { path: '/project/deleted.jpg', url: 'prism-asset://deleted', type: 'image', modelId: 'model' },
          { path: '/project/kept-b.jpg', url: 'prism-asset://kept-b', type: 'image', modelId: 'model' },
        ],
        activeResultIndex: 1,
        outputPath: '/project/deleted.jpg',
        outputUrl: 'prism-asset://deleted',
      }),
    ], new Set(['/project/kept-a.jpg', '/project/kept-b.jpg']))

    expect(pruned.data.generatedResults?.map((result) => result.path)).toEqual(['/project/kept-a.jpg', '/project/kept-b.jpg'])
    expect(pruned.data).toMatchObject({ activeResultIndex: 0, outputPath: '/project/kept-a.jpg', outputUrl: 'prism-asset://kept-a', runState: 'complete' })
  })

  it('returns the same nodes when every generated result still exists', () => {
    const original = node('generator', { generatedResults: [{ path: '/project/kept.jpg', url: 'prism-asset://kept', type: 'image', modelId: 'model' }] })
    expect(pruneMissingGeneratedResults([original], new Set(['/project/kept.jpg']))[0]).toBe(original)
  })
})

describe('mergeLiveGeneratedResults', () => {
  it('keeps live deletions deleted while appending the provider batch', () => {
    const retained = { path: '/project/retained.jpg', url: 'prism-asset://retained', type: 'image' as const, modelId: 'model' }
    const generated = { path: '/project/new.jpg', url: 'prism-asset://new', type: 'image' as const, modelId: 'model' }

    expect(mergeLiveGeneratedResults([retained], [generated])).toEqual([retained, generated])
    expect(mergeLiveGeneratedResults([retained], [generated]).map((result) => result.path)).not.toContain('/project/deleted-during-run.jpg')
  })

  it('deduplicates a provider result already present in live state', () => {
    const result = { path: '/project/new.jpg', url: 'prism-asset://new', type: 'image' as const, modelId: 'model' }
    expect(mergeLiveGeneratedResults([result], [result])).toEqual([result])
  })
})
