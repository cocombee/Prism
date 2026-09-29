import { describe, expect, it } from 'vitest'
import { AUTOSAVE_INTERVAL_MS, nextAutosaveDelay } from './autosave'

describe('one-minute autosave cadence', () => {
  it('waits a complete minute after an actual save', () => {
    expect(nextAutosaveDelay(1_000, 1_000)).toBe(AUTOSAVE_INTERVAL_MS)
  })

  it('keeps the original checkpoint while edits continue', () => {
    expect(nextAutosaveDelay(1_000, 31_000)).toBe(30_000)
  })

  it('runs immediately once the minute is due without producing a negative delay', () => {
    expect(nextAutosaveDelay(1_000, 61_000)).toBe(0)
    expect(nextAutosaveDelay(1_000, 91_000)).toBe(0)
  })
})
