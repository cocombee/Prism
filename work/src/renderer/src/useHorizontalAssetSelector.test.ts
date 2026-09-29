import { describe, expect, it } from 'vitest'
import { horizontalSelectorWheelDelta, selectorGestureBelongsToCanvas, shouldStartHorizontalSelectorDrag } from './useHorizontalAssetSelector'

describe('global horizontal special-asset selector behavior', () => {
  it('translates a dominant vertical wheel gesture and leaves horizontal trackpad movement native', () => {
    expect(horizontalSelectorWheelDelta(2, 30)).toBe(30)
    expect(horizontalSelectorWheelDelta(-24, 5)).toBeNull()
    expect(horizontalSelectorWheelDelta(12, 12)).toBeNull()
  })

  it('uses the Canvas Assets eight-pixel drag threshold', () => {
    expect(shouldStartHorizontalSelectorDrag(8)).toBe(false)
    expect(shouldStartHorizontalSelectorDrag(-8)).toBe(false)
    expect(shouldStartHorizontalSelectorDrag(9)).toBe(true)
  })

  it('cedes middle-button and Space-held primary gestures to Canvas panning', () => {
    expect(selectorGestureBelongsToCanvas(1, false)).toBe(true)
    expect(selectorGestureBelongsToCanvas(0, true)).toBe(true)
    expect(selectorGestureBelongsToCanvas(0, false)).toBe(false)
  })
})
