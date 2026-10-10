import type { GenerationRequest } from './types'
import { findVideoModel } from './videoModels'
import { groupStoryboardSequence, storyboardTransitionConflicts, STORYBOARD_OUTGOING_CONTINUATION } from './storyboardSequence'
import { shotRecipe } from './shotRecipes'

type Beat = NonNullable<GenerationRequest['storyboardShots']>[number]

/** Exact routes reviewed against fal's public endpoint schemas, 2026-10-09.
 * Per-shot enum: 1–15 integer seconds; total enum: 3–15 seconds.
 * Six-shot ceiling: https://blog.fal.ai/kling-3-0-is-now-available-on-fal/
 * Endpoint schemas: https://fal.ai/models/<exact route>/api
 * O3 4K References: public Schema link's OpenAPI verifies the same enums.
 * New releases/modes must be reviewed explicitly, never inherited by family.
 */
const VERIFIED_ROUTES: Readonly<Record<string, 'text' | 'image' | 'reference'>> = Object.freeze({
  'fal-ai/kling-video/v3/standard/text-to-video': 'text',
  'fal-ai/kling-video/v3/standard/image-to-video': 'image',
  'fal-ai/kling-video/v3/pro/text-to-video': 'text',
  'fal-ai/kling-video/v3/pro/image-to-video': 'image',
  'fal-ai/kling-video/v3/turbo/standard/text-to-video': 'text',
  'fal-ai/kling-video/v3/turbo/standard/image-to-video': 'image',
  'fal-ai/kling-video/v3/turbo/pro/text-to-video': 'text',
  'fal-ai/kling-video/v3/turbo/pro/image-to-video': 'image',
  'fal-ai/kling-video/v3/4k/text-to-video': 'text',
  'fal-ai/kling-video/v3/4k/image-to-video': 'image',
  'fal-ai/kling-video/o3/standard/text-to-video': 'text',
  'fal-ai/kling-video/o3/standard/image-to-video': 'image',
  'fal-ai/kling-video/o3/standard/reference-to-video': 'reference',
  'fal-ai/kling-video/o3/pro/text-to-video': 'text',
  'fal-ai/kling-video/o3/pro/image-to-video': 'image',
  'fal-ai/kling-video/o3/pro/reference-to-video': 'reference',
  'fal-ai/kling-video/o3/4k/text-to-video': 'text',
  'fal-ai/kling-video/o3/4k/image-to-video': 'image',
  'fal-ai/kling-video/o3/4k/reference-to-video': 'reference',
})

export interface KlingNativeShotGroup {
  beats: Beat[]
  shotIndices: number[]
  duration: number
}

export function groupedKlingStoryboard(shots: Beat[]): KlingNativeShotGroup[] {
  let panelIndex = 0
  return groupStoryboardSequence(shots).shots.map(group => ({
    beats: group.beats,
    duration: group.duration,
    shotIndices: group.beats.map(() => panelIndex++),
  }))
}

/** Draft compilation never changes durations or drops an over-capacity panel. */
export function buildKlingNativeMultiPrompt(shots: Beat[], cadenceInstruction?: string): NonNullable<GenerationRequest['multiPrompt']> {
  return groupedKlingStoryboard(shots).map(group => {
    let elapsed = 0
    const beats = group.beats.map((beat, index) => {
      const start = elapsed
      elapsed += beat.duration
      return `${group.beats.length > 1 ? `BEAT ${index + 1} · ${start}–${elapsed}s\n` : ''}Shot Size: ${shotRecipe('shot-size', beat.shotSize, 'kling')}; Camera Movement: ${shotRecipe('camera', beat.camera, 'kling')}${beat.audioCue ? `; Audio Cue: ${beat.audioCue}` : ''}. ${beat.prompt}`
    })
    return {
      duration: String(group.duration),
      prompt: [group.beats.length > 1 ? 'One unbroken shot. Continue between its beats without an internal cut or reset.' : '', ...beats, group.beats.at(-1)?.transitionToNext === 'continue' ? STORYBOARD_OUTGOING_CONTINUATION : '', cadenceInstruction].filter(Boolean).join('\n\n'),
    }
  })
}

/** Renderer and main call the same fail-closed guard before paid preparation. */
export function klingNativeStoryboardReadinessFailures(request: GenerationRequest): string[] {
  const model = findVideoModel(request.videoEngine)
  if (request.kind !== 'video-generator' || model?.family !== 'kling' && !request.videoEngine?.includes('kling-video')) return []
  if (!request.storyboardShots?.length && !request.multiPrompt?.length) return []
  const failures: string[] = []
  if (!model || VERIFIED_ROUTES[model.id] !== model.mode) failures.push(`Kling native multi-shot capability is unverified for ${request.videoEngine || 'the selected route'}.`)
  if (request.providerPromptOverride !== undefined) failures.push('A Manual master cannot be split or repeated as native multi_prompt; use its unchanged single prompt or an explicitly authored native shot plan.')
  const shots = request.storyboardShots || []
  for (const [index, beat] of shots.entries()) {
    if (!Number.isFinite(beat.duration) || beat.duration <= 0) failures.push(`Storyboard panel ${index + 1} needs a finite positive duration.`)
    if (typeof beat.prompt !== 'string' || !beat.prompt.trim()) failures.push(`Storyboard panel ${index + 1} needs authored action before native dispatch.`)
    if (beat.transitionToNext && !['continue', 'hard-cut'].includes(beat.transitionToNext)) failures.push(`Kling native shots cannot represent the authored transition after panel ${index + 1}.`)
  }
  const transitionFailures = storyboardTransitionConflicts(shots)
  failures.push(...transitionFailures)
  if (transitionFailures.length) return [...new Set(failures)]
  const grouped = groupedKlingStoryboard(shots)
  const entries = request.multiPrompt || (shots.length ? buildKlingNativeMultiPrompt(shots) : [])
  if (shots.length && (entries.length !== grouped.length || entries.some((entry, index) => Number(entry.duration) !== grouped[index]?.duration))) failures.push('Kling native multi_prompt must match the authored Cut/Continue shot groups and exact durations. Rebuild the request without changing its panels.')
  if (entries.length < 1 || entries.length > 6) failures.push(`Kling native multi_prompt supports 1–6 shots; this authored plan has ${entries.length}. Keep the plan and choose a compatible route or explicitly revise it.`)
  for (const [index, entry] of entries.entries()) {
    const duration = Number(entry.duration)
    if (typeof entry.prompt !== 'string' || !entry.prompt.trim()) failures.push(`Kling native shot ${index + 1} needs an authored prompt.`)
    if (typeof entry.duration !== 'string' || !/^(?:[1-9]|1[0-5])$/.test(entry.duration) || !Number.isInteger(duration) || duration < 1 || duration > 15) failures.push(`Kling native shot ${index + 1} requires an integer duration from 1–15s; authored ${entry.duration}s is not representable. No padding or rounding was applied.`)
  }
  const total = entries.reduce((sum, entry) => sum + Number(entry.duration), 0)
  if (!Number.isInteger(total) || total < 3 || total > 15) failures.push(`Kling native multi_prompt requires a total integer duration from 3–15s; the authored total is ${total}s.`)
  if (request.autoDuration || request.duration !== total) failures.push(`Kling native duration must exactly equal its authored shot total (${total}s); selected ${request.autoDuration ? 'auto' : request.duration ?? 'unspecified'} was not substituted.`)
  return [...new Set(failures)]
}

export function assertKlingNativeStoryboard(request: GenerationRequest): void {
  const failures = findVideoModel(request.videoEngine)?.family === 'kling'
    ? klingNativeStoryboardReadinessFailures(request)
    : [`Kling native multi-shot capability is unverified for ${request.videoEngine || 'the selected route'}.`]
  if (failures.length) throw new Error(`Kling native storyboard blocks provider dispatch: ${failures.join('; ')}`)
}
