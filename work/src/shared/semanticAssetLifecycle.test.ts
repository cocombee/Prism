import { describe, expect, it } from 'vitest'
import {
  beginSemanticAssetSave,
  createSemanticAssetLifecycle,
  semanticAssetLifecycleReducer,
  semanticAssetNavigation,
  type SemanticAssetReference,
} from './semanticAssetLifecycle'

const saved: SemanticAssetReference = { id: 'saved', path: '/managed/character/saved.png', source: 'saved', createdAt: '2026-08-26T01:00:00.000Z' }
const generated = (id: string, minute: number): SemanticAssetReference => ({ id, path: `/managed/character/${id}.png`, source: 'generated', createdAt: `2026-08-26T01:${String(minute).padStart(2, '0')}:00.000Z` })

describe('semantic asset lifecycle', () => {
  it('starts EMPTY and returns to EMPTY after the final reference is deleted', () => {
    const initial = createSemanticAssetLifecycle([])
    expect(initial.status).toBe('EMPTY')
    expect(initial.showIntake).toBe(true)
    expect(initial.canSave).toBe(false)

    const ready = semanticAssetLifecycleReducer(initial, { type: 'REFERENCES_REPLACED', references: [{ ...saved, source: 'imported' }] })
    expect(ready.status).toBe('REFERENCE_READY')
    const empty = semanticAssetLifecycleReducer(ready, { type: 'REFERENCE_DELETED', id: 'saved' })
    expect(empty.status).toBe('EMPTY')
    expect(empty.showIntake).toBe(true)
  })

  it('orders saved first and generated references by immutable creation order with non-wrapping navigation', () => {
    const state = createSemanticAssetLifecycle([generated('later', 3), saved, generated('earlier', 2)])
    expect(state.references.map((reference) => reference.id)).toEqual(['saved', 'earlier', 'later'])
    expect(semanticAssetNavigation(state)).toEqual({ current: 1, total: 3, canFirst: false, canPrevious: false, canNext: true, canLast: true })
    const atLast = semanticAssetLifecycleReducer(state, { type: 'NAVIGATE', target: 'last' })
    expect(atLast.selectedId).toBe('later')
    expect(semanticAssetLifecycleReducer(atLast, { type: 'NAVIGATE', target: 'next' }).selectedId).toBe('later')
  })

  it('captures an immutable selected result and deletion count while confirmation is open', () => {
    const state = semanticAssetLifecycleReducer(
      createSemanticAssetLifecycle([saved, generated('one', 2), generated('two', 3)]),
      { type: 'SELECT', id: 'one' },
    )
    const confirmation = beginSemanticAssetSave(state)
    expect(confirmation.status).toBe('SAVE_CONFIRMATION')
    expect(confirmation.pendingSave).toEqual({ selectedResultId: 'one', deleteGeneratedIds: ['two'], deletionCount: 1 })
    const attemptedNavigation = semanticAssetLifecycleReducer(confirmation, { type: 'NAVIGATE', target: 'last' })
    expect(attemptedNavigation.selectedId).toBe('one')
    expect(attemptedNavigation.pendingSave).toEqual(confirmation.pendingSave)
  })

  it('skips confirmation when no generated references will be deleted and cancel is non-destructive', () => {
    const oneResult = semanticAssetLifecycleReducer(createSemanticAssetLifecycle([saved, generated('one', 2)]), { type: 'SELECT', id: 'one' })
    expect(beginSemanticAssetSave(oneResult).status).toBe('SAVE_COMMITTING')

    const multiple = beginSemanticAssetSave(semanticAssetLifecycleReducer(createSemanticAssetLifecycle([saved, generated('one', 2), generated('two', 3)]), { type: 'SELECT', id: 'one' }))
    const cancelled = semanticAssetLifecycleReducer(multiple, { type: 'SAVE_CANCELLED' })
    expect(cancelled.status).toBe('RESULTS_READY')
    expect(cancelled.references.map((reference) => reference.id)).toEqual(['saved', 'one', 'two'])
    expect(cancelled.selectedId).toBe('one')
    expect(cancelled.pendingSave).toBeUndefined()
  })
})
