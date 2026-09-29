export type TextSelectionDirection = 'forward' | 'backward' | 'none'
export interface TextSelection { start: number; end: number; direction: TextSelectionDirection }

export function captureTextSelection(source: { selectionStart: number | null; selectionEnd: number | null; selectionDirection: string | null }): TextSelection {
  const start = Math.max(0, source.selectionStart ?? 0)
  const end = Math.max(start, source.selectionEnd ?? start)
  const direction = source.selectionDirection === 'forward' || source.selectionDirection === 'backward' ? source.selectionDirection : 'none'
  return { start, end, direction }
}

export function clampTextSelection(selection: TextSelection, length: number): TextSelection {
  const maximum = Math.max(0, length)
  const start = Math.min(selection.start, maximum)
  return { start, end: Math.max(start, Math.min(selection.end, maximum)), direction: selection.direction }
}

export function editorOwnsDestructiveOrSelectAllKey(event: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  const key = event.key.toLowerCase()
  return key === 'backspace' || key === 'delete' || ((event.metaKey || event.ctrlKey) && key === 'a')
}

export function nativeTextHistoryAction(event: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }): 'undo' | 'redo' | undefined {
  const key = event.key.toLowerCase()
  if ((event.metaKey || event.ctrlKey) && key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (event.ctrlKey && !event.metaKey && !event.shiftKey && key === 'y') return 'redo'
  return undefined
}
