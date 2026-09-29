import { describe, expect, it } from 'vitest'
import { cameraNativeKeyPayload } from './nativeCameraKey'

describe('native Camera held-key boundary', () => {
  it('forwards physical Command arrows and their releases without relying on renderer repeat', () => {
    expect(cameraNativeKeyPayload({ type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', modifiers: ['meta'], isAutoRepeat: false })).toEqual({ type: 'keydown', key: 'ArrowRight', code: 'ArrowRight', altKey: false, metaKey: true, ctrlKey: false, shiftKey: false, repeat: false })
    expect(cameraNativeKeyPayload({ type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', modifiers: ['meta'], isAutoRepeat: false })).toEqual({ type: 'keydown', key: 'ArrowRight', code: 'ArrowRight', altKey: false, metaKey: true, ctrlKey: false, shiftKey: false, repeat: false })
    expect(cameraNativeKeyPayload({ type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', modifiers: ['meta'], isAutoRepeat: false })).toEqual({ type: 'keyup', key: 'ArrowRight', code: 'ArrowRight', altKey: false, metaKey: true, ctrlKey: false, shiftKey: false, repeat: false })
    expect(cameraNativeKeyPayload({ type: 'keyUp', key: 'Meta', code: 'MetaLeft', modifiers: [], isAutoRepeat: false })).toEqual({ type: 'keyup', key: 'Meta', code: 'MetaLeft', altKey: false, metaKey: false, ctrlKey: false, shiftKey: false, repeat: false })
  })

  it('does not bridge unrelated native typing', () => {
    expect(cameraNativeKeyPayload({ type: 'keyDown', key: 'a', code: 'KeyA', modifiers: [], isAutoRepeat: false })).toBeNull()
  })
})
