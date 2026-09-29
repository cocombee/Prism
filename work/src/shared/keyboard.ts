export type CanvasKeyboardAction = 'select-all' | 'delete-selection'

export function canvasKeyboardAction(input: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  textEntryActive: boolean
  canvasScope: boolean
}): CanvasKeyboardAction | null {
  if (!input.canvasScope || input.textEntryActive) return null
  const key = input.key.toLowerCase()
  if (key === 'a' && (input.metaKey || input.ctrlKey)) return 'select-all'
  if (key === 'backspace' || key === 'delete') return 'delete-selection'
  return null
}
