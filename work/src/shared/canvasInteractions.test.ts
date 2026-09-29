import { describe, expect, it } from 'vitest'
import { canvasPanButtons, EDGE_ACTION_HOVER_DELAY_MS, isMiddleMouseButton, isMiddleMousePressed, isTextEntryTarget, optionWheelZoomViewport, shouldEndMiddleMousePan, shouldZoomCanvasFromWheel } from './canvasInteractions'

describe('canvas interactions', () => {
  it('lets persistent Hand or a temporary Space grab own left-drag while preserving ordinary Select drag', () => {
    expect(canvasPanButtons('select')).toEqual([1])
    expect(canvasPanButtons('select', true)).toEqual([0, 1])
    expect(canvasPanButtons('select', false)).toEqual([1])
    expect(canvasPanButtons('hand')).toEqual([0, 1])
    expect(canvasPanButtons('cut')).toEqual([1])
  })

  it('reserves a deliberate half-second hover before showing edge actions', () => {
    expect(EDGE_ACTION_HOVER_DELAY_MS).toBe(500)
  })

  it('does not activate temporary canvas pan from a text-entry surface', () => {
    expect(isTextEntryTarget({ tagName: 'INPUT' })).toBe(true)
    expect(isTextEntryTarget({ tagName: 'textarea' })).toBe(true)
    expect(isTextEntryTarget({ tagName: 'select' })).toBe(true)
    expect(isTextEntryTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(isTextEntryTarget({ tagName: 'DIV', closest: () => ({}) })).toBe(true)
    expect(isTextEntryTarget({ tagName: 'DIV', closest: () => null })).toBe(false)
  })

  it('recognizes only the middle mouse button as temporary middle pan', () => {
    expect(isMiddleMouseButton(1)).toBe(true)
    expect(isMiddleMouseButton(0)).toBe(false)
    expect(isMiddleMouseButton(2)).toBe(false)
  })

  it('ends middle panning on release and recovers from a swallowed release', () => {
    expect(isMiddleMousePressed(4)).toBe(true)
    expect(isMiddleMousePressed(5)).toBe(true)
    expect(isMiddleMousePressed(0)).toBe(false)
    expect(shouldEndMiddleMousePan(1, 0)).toBe(true)
    expect(shouldEndMiddleMousePan(0, 4)).toBe(false)
    expect(shouldEndMiddleMousePan(0, 0)).toBe(true)
  })

  it('reserves wheel zoom exclusively for Option-modified scrolling', () => {
    expect(shouldZoomCanvasFromWheel(false)).toBe(false)
    expect(shouldZoomCanvasFromWheel(true)).toBe(true)
  })

  it('keeps the canvas point under the pointer fixed while Option-wheel zooming', () => {
    const before = { x: 40, y: 30, zoom: 1 }
    const pointer = { x: 240, y: 180 }
    const after = optionWheelZoomViewport(before, pointer, -100)
    expect(after.zoom).toBeGreaterThan(before.zoom)
    expect((pointer.x - after.x) / after.zoom).toBeCloseTo((pointer.x - before.x) / before.zoom)
    expect((pointer.y - after.y) / after.zoom).toBeCloseTo((pointer.y - before.y) / before.zoom)
    expect(optionWheelZoomViewport({ x: 0, y: 0, zoom: 4.4 }, pointer, -100)).toEqual({ x: 0, y: 0, zoom: 4.4 })
  })
})
