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
  if (transition !== undefined && transition !== 'continue' && transition !== 'hard-cut') return undefined
  if (index >= count - 1) return transition === 'continue' ? 'continue' : undefined
  return transition === 'continue' ? 'continue' : 'hard-cut'
}

export function groupStoryboardSequence<T extends StoryboardSequenceBeat>(
  beats: T[],
  ..._legacyIgnored: unknown[]
): StoryboardSequence<T> {
  const conflicts = storyboardTransitionConflicts(beats)
  if (conflicts.length) throw new Error(conflicts[0])
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

export const STORYBOARD_OUTGOING_CONTINUATION = 'CONTINUE · OUTGOING CONTINUATION HOOK · Preserve the authored final camera endpoint and performance state for a future beat; no next beat, cut or extra duration is specified.'

export function storyboardTransitionConflicts<T extends Pick<StoryboardSequenceBeat, 'prompt' | 'transitionToNext'>>(beats: T[]): string[] {
  return beats.flatMap((beat, index) => {
    if (beat.transitionToNext !== undefined && beat.transitionToNext !== 'continue' && beat.transitionToNext !== 'hard-cut') return [`Storyboard panel ${index + 1} has an unsupported saved transition. Review its preserved transition; it was not converted to a hard cut.`]
    return beat.transitionToNext === 'continue' && /\bHARD\s+CUT\b/i.test(beat.prompt)
      ? [`Continue after Storyboard panel ${index + 1} conflicts with its authored HARD CUT.`]
      : []
  })
}
