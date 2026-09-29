import type { StoryboardTransition } from './types'

export interface StoryboardSequenceBeat {
  prompt: string
  duration: number
  transitionToNext?: StoryboardTransition
}

export interface StoryboardShotGroup<T extends StoryboardSequenceBeat> {
  beats: T[]
  duration: number
  closesWithHardCut: boolean
}

export interface StoryboardSequence<T extends StoryboardSequenceBeat> {
  shots: Array<StoryboardShotGroup<T>>
  hardCutCount: number
  totalDuration: number
}

export function normalizedStoryboardTransition(
  transition: StoryboardTransition | undefined,
  index: number,
  count: number,
  ..._legacyIgnored: unknown[]
): StoryboardTransition | undefined {
  if (index >= count - 1) return undefined
  return transition === 'continue' ? 'continue' : 'hard-cut'
}

export function groupStoryboardSequence<T extends StoryboardSequenceBeat>(
  beats: T[],
  ..._legacyIgnored: unknown[]
): StoryboardSequence<T> {
  const shots: Array<StoryboardShotGroup<T>> = []
  let currentBeats: T[] = []
  let currentDuration = 0
  let hardCutCount = 0

  beats.forEach((beat, index) => {
    currentBeats.push(beat)
    currentDuration += Number(beat.duration || 0)
    const transition = normalizedStoryboardTransition(beat.transitionToNext, index, beats.length)
    if (transition !== 'hard-cut') return
    shots.push({ beats: currentBeats, duration: currentDuration, closesWithHardCut: true })
    currentBeats = []
    currentDuration = 0
    hardCutCount += 1
  })

  if (currentBeats.length) shots.push({ beats: currentBeats, duration: currentDuration, closesWithHardCut: false })

  return {
    shots,
    hardCutCount,
    totalDuration: beats.reduce((total, beat) => total + Number(beat.duration || 0), 0),
  }
}

export function storyboardTransitionConflicts<T extends StoryboardSequenceBeat>(beats: T[]): string[] {
  return beats.flatMap((beat, index) => index < beats.length - 1
    && beat.transitionToNext === 'continue'
    && /\bHARD\s+CUT\b/i.test(beat.prompt)
    ? [`Continue after Storyboard panel ${index + 1} conflicts with its authored HARD CUT.`]
    : [])
}
