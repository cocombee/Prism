import { describe, expect, it } from 'vitest'
import { storyboardTimecodes } from './storyboardTimecodes'

describe('authored decimal storyboard clock', () => {
  it('preserves the delivery example cut boundaries without shortening shots', () => {
    const clock = storyboardTimecodes([0.85, 1, 1.35, 2.8])
    expect(clock.format(clock.sum(0.85, 1))).toBe('1.85')
    expect(clock.format(clock.sum(0.85, 1, 1.35))).toBe('3.2')
    expect(clock.format(clock.sum(0.85, 1, 1.35, 2.8))).toBe('6.0')
  })
  it('keeps fractional bridge precision while removing binary addition noise', () => {
    const clock = storyboardTimecodes([0.7, 1.1, 0.125, 0.875])
    expect(clock.format(clock.sum(0.7, 1.1))).toBe('1.8')
    expect(clock.format(clock.sum(0.7, 0.125))).toBe('0.825')
    expect(clock.format(clock.sum(1.8, -0.875))).toBe('0.925')
    expect(clock.format(0)).toBe('0.0')
  })
  it('handles scientific decimal input and rejects nonfinite values', () => {
    const clock = storyboardTimecodes([1, 1e-7])
    expect(clock.format(clock.sum(1, 1e-7))).toBe('1.0000001')
    expect(() => storyboardTimecodes([Number.NaN])).toThrow('finite seconds')
  })
})
