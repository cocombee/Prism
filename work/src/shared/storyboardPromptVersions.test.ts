import { describe, expect, it } from 'vitest'
import type { StoryboardPanel } from './types'
import {
  applySuccessfulStoryboardRevamps,
  editStoryboardOriginal,
  migrateStoryboardPromptVersions,
  selectStoryboardPromptVersion,
  selectedStoryboardPrompt,
} from './storyboardPromptVersions'

const legacy = (prompt = '  Original\nline two  '): StoryboardPanel => ({ id: 'panel-1', prompt, duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'continue' })

describe('Storyboard Original / Revamped prompt lifecycle', () => {
  it('migrates legacy panels to byte-exact Original-selected state with no Revamped snapshot', () => {
    const panel = legacy()
    const migrated = migrateStoryboardPromptVersions(panel)
    expect(migrated).toMatchObject({ prompt: panel.prompt, originalPrompt: panel.prompt, selectedPromptVersion: 'original' })
    expect(migrated.revampedPrompt).toBeUndefined()
    expect(selectedStoryboardPrompt(migrated)).toBe(panel.prompt)
  })

  it('switches views without rewriting either snapshot or non-prompt panel state', () => {
    const panel = { ...migrateStoryboardPromptVersions(legacy()), revampedPrompt: 'Revamped text' }
    const selected = selectStoryboardPromptVersion(panel, 'revamped')
    expect(selectedStoryboardPrompt(selected)).toBe('Revamped text')
    expect(selected.prompt).toBe(panel.prompt)
    expect(selected.originalPrompt).toBe(panel.originalPrompt)
    expect(selected.transitionToNext).toBe('continue')
    expect(selectStoryboardPromptVersion(selected, 'original')).toEqual(panel)
  })

  it('edits only Original, selects it, and retains the successful Revamped snapshot', () => {
    const panel = { ...migrateStoryboardPromptVersions(legacy()), revampedPrompt: 'Prior revamped', selectedPromptVersion: 'revamped' as const }
    const edited = editStoryboardOriginal(panel, '\nNew original\t')
    expect(edited).toMatchObject({ prompt: '\nNew original\t', originalPrompt: '\nNew original\t', revampedPrompt: 'Prior revamped', selectedPromptVersion: 'original' })
  })

  it('atomically replaces only changed successful Revamped targets and selects them', () => {
    const one = migrateStoryboardPromptVersions(legacy('One original'))
    const two = migrateStoryboardPromptVersions({ ...legacy('Two original'), id: 'panel-2' })
    const result = applySuccessfulStoryboardRevamps([one, two], new Map([['panel-1', 'One revamped']]))
    expect(result.changed).toBe(true)
    expect(result.panels[0]).toMatchObject({ originalPrompt: 'One original', revampedPrompt: 'One revamped', selectedPromptVersion: 'revamped' })
    expect(result.panels[1]).toBe(two)
  })

  it('leaves snapshots and selection byte-identical for failed, missing, or unchanged results', () => {
    const panel = { ...migrateStoryboardPromptVersions(legacy('Original')), revampedPrompt: 'Current revamped', selectedPromptVersion: 'revamped' as const }
    const before = structuredClone(panel)
    expect(applySuccessfulStoryboardRevamps([panel], new Map()).panels[0]).toBe(panel)
    expect(applySuccessfulStoryboardRevamps([panel], new Map([['panel-1', 'Current revamped']])).panels[0]).toBe(panel)
    expect(panel).toEqual(before)
  })

  it('round-trips selected authority through save/load and independent Undo/Redo snapshots', () => {
    const original = migrateStoryboardPromptVersions(legacy('Original bytes\n'))
    const revamped = applySuccessfulStoryboardRevamps([original], new Map([['panel-1', 'Revamped bytes']])).panels[0]
    const saved = JSON.parse(JSON.stringify(revamped)) as StoryboardPanel
    expect(selectedStoryboardPrompt(saved)).toBe('Revamped bytes')
    const undo = structuredClone(original)
    const redo = structuredClone(saved)
    expect(selectedStoryboardPrompt(undo)).toBe('Original bytes\n')
    expect(selectedStoryboardPrompt(redo)).toBe('Revamped bytes')
    expect(undo.originalPrompt).toBe('Original bytes\n')
    expect(redo.originalPrompt).toBe('Original bytes\n')
  })
})
