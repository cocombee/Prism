import { describe, expect, it } from 'vitest'
import { canvasKeyboardAction } from './keyboard'

describe('Canvas keyboard ownership', () => {
  it('claims Meta/Ctrl+A only in Canvas scope outside text entry', () => {
    const base = { key: 'a', textEntryActive: false, canvasScope: true }
    expect(canvasKeyboardAction({ ...base, metaKey: true, ctrlKey: false })).toBe('select-all')
    expect(canvasKeyboardAction({ ...base, metaKey: false, ctrlKey: true })).toBe('select-all')
    expect(canvasKeyboardAction({ ...base, key: 'A', metaKey: true, ctrlKey: false })).toBe('select-all')
    expect(canvasKeyboardAction({ ...base, textEntryActive: true, metaKey: true, ctrlKey: false })).toBeNull()
  })

  it('deletes selection for Backspace/Delete while Canvas owns scope outside text entry', () => {
    const base = { metaKey: false, ctrlKey: false, textEntryActive: false, canvasScope: true }
    expect(canvasKeyboardAction({ ...base, key: 'Backspace' })).toBe('delete-selection')
    expect(canvasKeyboardAction({ ...base, key: 'Delete' })).toBe('delete-selection')
  })

  it('never claims editor keys or keys outside Canvas scope', () => {
    expect(canvasKeyboardAction({ key: 'Delete', metaKey: false, ctrlKey: false, textEntryActive: true, canvasScope: true })).toBeNull()
    expect(canvasKeyboardAction({ key: 'a', metaKey: true, ctrlKey: false, textEntryActive: false, canvasScope: false })).toBeNull()
    expect(canvasKeyboardAction({ key: 'Backspace', metaKey: false, ctrlKey: false, textEntryActive: false, canvasScope: false })).toBeNull()
    expect(canvasKeyboardAction({ key: 'Escape', metaKey: false, ctrlKey: false, textEntryActive: false, canvasScope: true })).toBeNull()
  })
})
