import { describe, expect, it } from 'vitest'
import { captureTextSelection, clampTextSelection, editorOwnsDestructiveOrSelectAllKey, nativeTextHistoryAction } from './textEditorSelection'

describe('controlled text editor selection', () => {
  it('captures a middle caret and range before controlled updates and clamps only when text shrinks', () => {
    expect(captureTextSelection({ selectionStart: 8, selectionEnd: 8, selectionDirection: 'none' })).toEqual({ start: 8, end: 8, direction: 'none' })
    const range = captureTextSelection({ selectionStart: 4, selectionEnd: 12, selectionDirection: 'backward' })
    expect(clampTextSelection(range, 20)).toEqual(range)
    expect(clampTextSelection(range, 7)).toEqual({ start: 4, end: 7, direction: 'backward' })
  })

  it('classifies editor-owned select-all and destructive keys without claiming ordinary typing', () => {
    expect(editorOwnsDestructiveOrSelectAllKey({ key: 'a', metaKey: true, ctrlKey: false })).toBe(true)
    expect(editorOwnsDestructiveOrSelectAllKey({ key: 'A', metaKey: false, ctrlKey: true })).toBe(true)
    expect(editorOwnsDestructiveOrSelectAllKey({ key: 'Backspace', metaKey: false, ctrlKey: false })).toBe(true)
    expect(editorOwnsDestructiveOrSelectAllKey({ key: 'Delete', metaKey: false, ctrlKey: false })).toBe(true)
    expect(editorOwnsDestructiveOrSelectAllKey({ key: 'a', metaKey: false, ctrlKey: false })).toBe(false)
    expect(editorOwnsDestructiveOrSelectAllKey({ key: 'Escape', metaKey: false, ctrlKey: false })).toBe(false)
  })

  it('classifies native Cmd/Ctrl undo and redo without claiming unrelated shortcuts', () => {
    expect(nativeTextHistoryAction({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: false })).toBe('undo')
    expect(nativeTextHistoryAction({ key: 'Z', metaKey: false, ctrlKey: true, shiftKey: false })).toBe('undo')
    expect(nativeTextHistoryAction({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: true })).toBe('redo')
    expect(nativeTextHistoryAction({ key: 'y', metaKey: false, ctrlKey: true, shiftKey: false })).toBe('redo')
    expect(nativeTextHistoryAction({ key: 'y', metaKey: true, ctrlKey: false, shiftKey: false })).toBeUndefined()
    expect(nativeTextHistoryAction({ key: 'z', metaKey: false, ctrlKey: false, shiftKey: false })).toBeUndefined()
  })
})
