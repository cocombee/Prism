import { describe, expect, it } from 'vitest'
import { groupStoryboardSequence, storyboardTransitionConflicts } from './storyboardSequence'

describe('Storyboard Cut / Continue sequence grouping', () => {
  it('keeps legacy missing boundaries as hard cuts', () => {
    const sequence = groupStoryboardSequence([
      { prompt: 'First.', duration: 3 },
      { prompt: 'Second.', duration: 2 },
    ])
    expect(sequence.hardCutCount).toBe(1)
    expect(sequence.totalDuration).toBe(5)
    expect(sequence.shots.map((shot) => ({ duration: shot.duration, beats: shot.beats.map((beat) => beat.prompt), closesWithHardCut: shot.closesWithHardCut }))).toEqual([
      { duration: 3, beats: ['First.'], closesWithHardCut: true },
      { duration: 2, beats: ['Second.'], closesWithHardCut: false },
    ])
  })

  it('groups Continue panels into one unbroken shot', () => {
    const sequence = groupStoryboardSequence([
      { prompt: 'First beat.', duration: 3.5, transitionToNext: 'continue' as const },
      { prompt: 'Second beat.', duration: 11.5, transitionToNext: 'hard-cut' as const },
    ])
    expect(sequence.hardCutCount).toBe(0)
    expect(sequence.totalDuration).toBe(15)
    expect(sequence.shots).toHaveLength(1)
    expect(sequence.shots[0].duration).toBe(15)
    expect(sequence.shots[0].beats.map((beat) => beat.prompt)).toEqual(['First beat.', 'Second beat.'])
    expect(sequence.shots[0].closesWithHardCut).toBe(false)
  })

  it('supports mixed Continue and Cut boundaries', () => {
    const sequence = groupStoryboardSequence([
      { prompt: 'Beat one.', duration: 2, transitionToNext: 'continue' as const },
      { prompt: 'Beat two.', duration: 3, transitionToNext: 'hard-cut' as const },
      { prompt: 'Beat three.', duration: 4, transitionToNext: 'continue' as const },
    ])
    expect(sequence.hardCutCount).toBe(1)
    expect(sequence.totalDuration).toBe(9)
    expect(sequence.shots.map((shot) => ({ duration: shot.duration, beats: shot.beats.map((beat) => beat.prompt), closesWithHardCut: shot.closesWithHardCut }))).toEqual([
      { duration: 5, beats: ['Beat one.', 'Beat two.'], closesWithHardCut: true },
      { duration: 4, beats: ['Beat three.'], closesWithHardCut: false },
    ])
  })

  it('uses authored boundaries even when legacy saved mode claims Separate Shots', () => {
    const sequence = groupStoryboardSequence([
      { prompt: 'First.', duration: 1, transitionToNext: 'continue' as const },
      { prompt: 'Second.', duration: 1, transitionToNext: 'continue' as const },
    ], 'separate' as never)
    expect(sequence.hardCutCount).toBe(0)
    expect(sequence.shots).toHaveLength(1)
  })

  it('groups all Hard Cut boundaries as separate shots', () => {
    const sequence = groupStoryboardSequence([
      { prompt: 'First.', duration: 1, transitionToNext: 'hard-cut' as const },
      { prompt: 'Second.', duration: 1, transitionToNext: 'hard-cut' as const },
      { prompt: 'Third.', duration: 1 },
    ])
    expect(sequence.hardCutCount).toBe(2)
    expect(sequence.shots).toHaveLength(3)
  })

  it('reports authored hard-cut prose that conflicts with Continue', () => {
    expect(storyboardTransitionConflicts([
      { prompt: 'Hold on Oli. HARD CUT.', duration: 3.5, transitionToNext: 'continue' as const },
      { prompt: 'Pan to the reporter.', duration: 11.5 },
    ])).toEqual(['Continue after Storyboard panel 1 conflicts with its authored HARD CUT.'])
  })
})
