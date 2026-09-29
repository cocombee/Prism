export type CameraNativeInput = {
  type: string
  key: string
  code: string
  modifiers: readonly string[]
  isAutoRepeat: boolean
}

export type CameraNativeKeyPayload = {
  type: 'keydown' | 'keyup'
  key: string
  code: string
  altKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  repeat: boolean
}

const arrows = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const modifiers = new Set(['Alt', 'Meta', 'Control'])

export function cameraNativeKeyPayload(input: CameraNativeInput): CameraNativeKeyPayload | null {
  if (!['keyDown', 'rawKeyDown', 'keyUp'].includes(input.type)) return null
  if (!arrows.has(input.key) && !modifiers.has(input.key)) return null
  const active = new Set(input.modifiers.map((modifier) => modifier.toLowerCase()))
  return {
    type: input.type === 'keyDown' || input.type === 'rawKeyDown' ? 'keydown' : 'keyup',
    key: input.key,
    code: input.code,
    altKey: active.has('alt'),
    metaKey: active.has('meta') || active.has('command'),
    ctrlKey: active.has('control') || active.has('ctrl'),
    shiftKey: active.has('shift'),
    repeat: input.isAutoRepeat,
  }
}
