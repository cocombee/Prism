import { describe, expect, it } from 'vitest'
import type { StudioNodeData } from './types'
import { migrateSemanticAssetLifecycleMetadata, semanticAssetGenerationPatch, semanticAssetGenerationStartedPatch, semanticAssetGenerationStoppedPatch } from './semanticAssetLifecycleMigration'

describe('semantic asset lifecycle identity migration', () => {
  it('preserves persisted identities byte-for-byte and deterministically assigns only missing legacy identities', () => {
    const legacy = {
      kind: 'character', title: 'hero',
      referenceAssets: [{ id: 'saved-id', name: 'hero.png', path: '/managed/hero.png', mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', origin: 'generated' }],
      generatedResults: [
        { id: 'provider-result-id', path: '/managed/result-a.png', url: 'prism://a', type: 'image', modelId: 'model', createdAt: '2026-08-26T01:02:00Z' },
        { path: '/managed/result-b.png', url: 'prism://b', type: 'image', modelId: 'model', createdAt: '2026-08-26T01:03:00Z' },
      ],
      activeResultIndex: 1,
    } satisfies StudioNodeData
    const migrated = migrateSemanticAssetLifecycleMetadata(legacy)
    expect(migrated.semanticAssetLifecycle?.references.map((item) => item.id)).toEqual(['saved-id', 'provider-result-id', 'legacy-generated:%2Fmanaged%2Fresult-b.png'])
    expect(migrated.semanticAssetLifecycle?.selectedId).toBe('legacy-generated:%2Fmanaged%2Fresult-b.png')
    expect(migrateSemanticAssetLifecycleMetadata(migrated)).toEqual(migrated)
  })

  it('recovers persisted transient save state to deterministic steady state and excludes partial generated files', () => {
    const data = {
      kind: 'location', title: 'set',
      semanticAssetLifecycle: { version: 1 as const, status: 'SAVE_COMMITTING' as const, references: [
        { id: 'saved', path: '/managed/saved.png', url: 'saved', source: 'saved' as const, createdAt: '1' },
        { id: 'complete', path: '/managed/complete.png', url: 'complete', source: 'generated' as const, createdAt: '2' },
        { id: 'partial', path: '/managed/partial.png', source: 'generated' as const, createdAt: '3' },
      ], selectedId: 'complete', pendingSave: { selectedResultId: 'complete', deleteGeneratedIds: [], deletionCount: 0 } },
    } satisfies StudioNodeData
    const migrated = migrateSemanticAssetLifecycleMetadata(data)
    expect(migrated.semanticAssetLifecycle?.status).toBe('RESULTS_READY')
    expect(migrated.semanticAssetLifecycle?.references.map((reference) => reference.id)).toEqual(['saved', 'complete'])
    expect(migrated.semanticAssetLifecycle?.pendingSave).toBeUndefined()
  })

  it('keeps inactive mode references losslessly without placing imported external files in generated deletion scope', () => {
    const data = {
      kind: 'element', title: 'prop', elementInputMode: 'single',
      referenceAssets: [
        { id: 'active', name: 'active.png', path: '/managed/active.png', mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', metadata: { elementInputMode: 'single' } },
        { id: 'inactive', name: 'inactive.png', path: '/external/inactive.png', mimeType: 'image/png', createdAt: '2026-08-26T01:01:00Z', origin: 'imported', metadata: { elementInputMode: 'multi' } },
      ],
    } satisfies StudioNodeData
    const migrated = migrateSemanticAssetLifecycleMetadata(data)
    expect(migrated.referenceAssets).toEqual(data.referenceAssets)
    expect(migrated.semanticAssetLifecycle?.references).toEqual([
      expect.objectContaining({ id: 'active', source: 'imported' }),
      expect.objectContaining({ id: 'inactive', source: 'imported' }),
    ])
  })

  it('keeps prior generated references unsaved across regeneration and admits only complete image results', () => {
    const saved = { id: 'saved', name: 'hero.png', path: '/managed/hero.png', url: 'saved.png', mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', origin: 'generated' as const }
    const prior = migrateSemanticAssetLifecycleMetadata({
      kind: 'character', title: 'Hero', prompt: 'hero', referenceAssets: [saved],
      generatedResults: [{ id: 'prior', path: '/managed/prior.png', url: 'prior.png', type: 'image', modelId: 'm', createdAt: '2026-08-26T01:01:00Z' }],
    })
    const patch = semanticAssetGenerationPatch(prior, [
      { id: 'new', path: '/managed/new.png', url: 'new.png', type: 'image', modelId: 'm', createdAt: '2026-08-26T02:00:00Z' },
      { id: 'partial', path: '', url: '', type: 'image', modelId: 'm' },
      { id: 'wrong-type', path: '/managed/video.mp4', url: 'video.mp4', type: 'video', modelId: 'm' },
    ])
    expect(patch.generatedResults?.map((result) => result.id)).toEqual(['prior', 'new'])
    expect(patch.semanticAssetLifecycle?.references.map((reference) => [reference.id, reference.source])).toEqual([
      ['saved', 'saved'], ['prior', 'generated'], ['new', 'generated'],
    ])
    expect(patch.semanticAssetLifecycle?.selectedId).toBe('new')
    expect(patch.semanticAssetLifecycle?.status).toBe('RESULTS_READY')
    expect(patch.referenceAssets).toBeUndefined()
  })

  it.each(['character', 'wardrobe', 'element', 'location', 'style-reference'] as const)('clears stale Edit replacement authority during %s hydration without changing saved asset identity', (kind) => {
    const data = {
      kind, title: 'Hero',
      referenceAssets: [{ id: 'saved', name: 'hero.png', path: '/managed/hero.png', url: 'hero.png', mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', origin: 'generated' as const }],
      semanticAssetLifecycle: { version: 1 as const, status: 'EDITING_SAVED' as const, references: [{ id: 'saved', path: '/managed/hero.png', url: 'hero.png', source: 'saved' as const, createdAt: '2026-08-26T01:00:00Z' }], selectedId: 'saved' },
      semanticReplacementAuthority: { targetAssetId: 'saved', token: 'stale-process-token' },
    } satisfies StudioNodeData
    const hydrated = migrateSemanticAssetLifecycleMetadata(data, { clearReplacementAuthority: true })
    expect(hydrated.semanticReplacementAuthority).toBeUndefined()
    expect(hydrated.referenceAssets).toEqual(data.referenceAssets)
  })

  it('moves generation through GENERATING and restores a nonblank prior steady state on failure', () => {
    const saved = { id: 'saved', name: 'hero.png', path: '/managed/hero.png', url: 'saved.png', mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', origin: 'generated' as const }
    const savedView = migrateSemanticAssetLifecycleMetadata({ kind: 'character', title: 'Hero', referenceAssets: [saved] })
    expect(semanticAssetGenerationStartedPatch(savedView).semanticAssetLifecycle?.status).toBe('GENERATING')
    expect(semanticAssetGenerationStoppedPatch(savedView).semanticAssetLifecycle?.status).toBe('SAVED_VIEW')
    const empty = migrateSemanticAssetLifecycleMetadata({ kind: 'element', title: 'Prop' })
    expect(semanticAssetGenerationStoppedPatch(empty).semanticAssetLifecycle?.status).toBe('EMPTY')
  })
})
