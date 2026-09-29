import { describe, expect, it } from 'vitest'
import { analyzeCharacterImageLayout, validateCharacterImageLayout, type CharacterPixelSample } from './characterImageValidation'

function sampleWithRects(rects: Array<[number, number, number, number]>, width = 96, height = 96): CharacterPixelSample {
  const data = new Uint8Array(width * height * 3).fill(255)
  for (const [left, top, right, bottom] of rects) {
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const offset = (y * width + x) * 3
        data[offset] = 24
        data[offset + 1] = 24
        data[offset + 2] = 24
      }
    }
  }
  return { data, width, height, channels: 3 }
}

describe('Character image layout validation', () => {
  it('classifies one dominant subject as one view', () => {
    const result = analyzeCharacterImageLayout(sampleWithRects([[24, 10, 72, 88]]))

    expect(result.viewCount).toBe(1)
    expect(result.classification).toBe('single-view')
  })

  it('classifies separated large subjects as multiple views', () => {
    const result = analyzeCharacterImageLayout(sampleWithRects([[7, 12, 40, 86], [56, 12, 89, 86]]))

    expect(result.viewCount).toBe(2)
    expect(result.classification).toBe('multi-view')
  })

  it('rejects a clear sheet for Multi Face and requires at least two views for Single', () => {
    const oneView = sampleWithRects([[24, 10, 72, 88]])
    const twoViews = sampleWithRects([[7, 12, 40, 86], [56, 12, 89, 86]])

    expect(validateCharacterImageLayout(oneView, 'multi')).toMatchObject({ valid: true, viewCount: 1 })
    expect(validateCharacterImageLayout(twoViews, 'multi')).toMatchObject({ valid: false, viewCount: 2 })
    expect(validateCharacterImageLayout(oneView, 'single')).toMatchObject({ valid: false, viewCount: 1 })
    expect(validateCharacterImageLayout(twoViews, 'single')).toMatchObject({ valid: true, viewCount: 2 })
  })

  it('rejects a blank image instead of treating it as a Character view', () => {
    expect(validateCharacterImageLayout(sampleWithRects([]), 'multi')).toMatchObject({ valid: false, viewCount: 0 })
    expect(validateCharacterImageLayout(sampleWithRects([]), 'single')).toMatchObject({ valid: false, viewCount: 0 })
  })

  it('accepts a nine-panel sheet whose individual Character views are small after validation downscaling', () => {
    const rects: Array<[number, number, number, number]> = []
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        rects.push([column * 64 + 22, row * 64 + 12, column * 64 + 42, row * 64 + 54])
      }
    }
    const sheet = sampleWithRects(rects, 192, 192)

    expect(validateCharacterImageLayout(sheet, 'single')).toMatchObject({ valid: true, viewCount: 9, classification: 'multi-view' })
    expect(validateCharacterImageLayout(sheet, 'multi')).toMatchObject({ valid: false, viewCount: 9, classification: 'multi-view' })
  })

  it('does not count a detached view label as another Character view', () => {
    const labeledSingleView = sampleWithRects([[55, 8, 142, 186], [4, 160, 48, 184]], 192, 192)

    expect(validateCharacterImageLayout(labeledSingleView, 'multi')).toMatchObject({ valid: true, viewCount: 1, classification: 'single-view' })
  })
})