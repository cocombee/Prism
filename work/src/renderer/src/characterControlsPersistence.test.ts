import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { migrateCharacterControls } from '../../shared/resolvedAssetRequest'

const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')
const draft = readFileSync(new URL('../../shared/reusableEditorDraft.ts', import.meta.url), 'utf8')

describe('inactive legacy Character control compatibility', () => {
  it('does not initialize invented state when old data has no property', () => {
    const existing = { kind: 'character', title: 'Nadia', prompt: 'Exact authored prose', characterInputMode: 'single', referenceAssets: [{ id: 'asset-1' }] }
    expect(migrateCharacterControls(existing)).toEqual(existing)
    expect(migrateCharacterControls(existing)).not.toHaveProperty('characterControls')
  })

  it('reads old transient candidate data without migrating or making it active', () => {
    const legacyControls = { age: { mode: 'exact', years: 37 }, height: { mode: 'preset', value: 'Typical for age' }, bodyFrame: 'broad', softTissueFullness: 'moderate', muscularity: 'high' }
    const existing = { kind: 'character', title: 'Nadia', characterControls: legacyControls }
    expect(migrateCharacterControls(existing)).toEqual(existing)
    expect(migrateCharacterControls(existing).characterControls).toBe(legacyControls)
  })

  it('removes active initialization, persistence, library restoration, and draft ownership', () => {
    expect(app).not.toContain('characterControls')
    expect(draft).not.toContain('characterControls')
    expect(draft).not.toContain('UNSPECIFIED_CHARACTER_CONTROLS')
  })
})
