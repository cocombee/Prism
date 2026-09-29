import { describe, expect, it } from 'vitest'
import { generationTimingKey, learnedGenerationSeconds } from './generationTiming'
import type { GenerationRequest, HistoryEntry } from './types'

const request: GenerationRequest = { nodeId: 'image', kind: 'image-generator', imageModelId: 'openai/gpt-image-2/edit', imageResolution: '1K', aspectRatio: '4:3', quantity: 1, references: [{ role: 'reference', path: '/project/face.jpg', mediaType: 'image' }] }

describe('adaptive generation timing', () => {
  it('keys observations by the settings that materially affect generation time', () => {
    expect(generationTimingKey(request)).not.toBe(generationTimingKey({ ...request, imageResolution: '4K' }))
    expect(generationTimingKey(request)).not.toBe(generationTimingKey({ ...request, references: [...request.references!, { role: 'reference', path: '/project/style.jpg', mediaType: 'image' }] }))
  })

  it('keeps exact estimates above the slowest recent matching completion', () => {
    const timingKey = generationTimingKey(request)
    const history: HistoryEntry[] = [
      { id: 'new', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T02:00:00Z', durationMs: 40_000, timingKey },
      { id: 'old', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T01:00:00Z', durationMs: 80_000, timingKey },
      { id: 'other', nodeId: 'video', nodeTitle: 'Video', modelId: 'video', status: 'complete', createdAt: '2026-08-15T03:00:00Z', durationMs: 900_000, timingKey: 'other' },
    ]
    expect(learnedGenerationSeconds(history, timingKey, 60)).toBe(92)
    expect(learnedGenerationSeconds(history, 'unseen', 60)).toBe(75)
  })

  it('raises the next estimate above a matching completion that overran its shown estimate', () => {
    const timingKey = generationTimingKey(request)
    const history: HistoryEntry[] = [
      { id: 'overrun', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T04:00:00Z', durationMs: 70_000, estimatedDurationMs: 60_000, timingKey },
    ]
    expect(learnedGenerationSeconds(history, timingKey, 60)).toBe(81)
  })

  it('scales provider-call evidence to the full visible batch duration', () => {
    const timingKey = generationTimingKey(request)
    const history: HistoryEntry[] = [
      { id: 'batch', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T05:00:00Z', durationMs: 40_000, estimatedDurationMs: 30_000, timingScale: 2, timingKey },
    ]
    expect(learnedGenerationSeconds(history, timingKey, 60)).toBe(92)
  })

  it('does not forget same-endpoint timing when only the reference count changes', () => {
    const twoReferences = generationTimingKey({ ...request, references: [
      request.references![0],
      { role: 'reference', path: '/project/style.jpg', mediaType: 'image' },
    ] })
    const fiveReferences = generationTimingKey({ ...request, references: [
      request.references![0],
      { role: 'reference', path: '/project/a.jpg', mediaType: 'image' },
      { role: 'reference', path: '/project/b.jpg', mediaType: 'image' },
      { role: 'reference', path: '/project/c.jpg', mediaType: 'image' },
      { role: 'reference', path: '/project/d.jpg', mediaType: 'image' },
    ] })
    const history: HistoryEntry[] = [
      { id: 'recent', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T04:00:00Z', durationMs: 125_000, timingKey: twoReferences },
      { id: 'older', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T03:00:00Z', durationMs: 121_000, timingKey: twoReferences },
    ]
    expect(learnedGenerationSeconds(history, fiveReferences, 60)).toBe(144)
  })

  it('does not let a later fast completion erase earlier slow evidence', () => {
    const timingKey = generationTimingKey(request)
    const history: HistoryEntry[] = [
      { id: 'fast-newest', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T05:00:00Z', durationMs: 43_000, timingKey },
      { id: 'slow', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T04:00:00Z', durationMs: 80_000, timingKey },
      { id: 'fast', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-15T03:00:00Z', durationMs: 44_000, timingKey },
    ]
    expect(learnedGenerationSeconds(history, timingKey, 60)).toBeGreaterThanOrEqual(92)
  })

  it('uses only the newest eight observations from newest-first history', () => {
    const timingKey = generationTimingKey(request)
    const history: HistoryEntry[] = [
      ...Array.from({ length: 8 }, (_, index) => ({ id: `recent-${index}`, nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete' as const, createdAt: `2026-08-15T0${index}:00:00Z`, durationMs: 50_000, timingKey })),
      { id: 'stale-slow', nodeId: 'image', nodeTitle: 'Image', modelId: request.imageModelId!, status: 'complete', createdAt: '2026-08-14T00:00:00Z', durationMs: 500_000, timingKey },
    ]
    const estimate = learnedGenerationSeconds(history, timingKey, 60)
    expect(estimate).toBeGreaterThanOrEqual(57)
    expect(estimate).toBeLessThan(100)
  })
})
