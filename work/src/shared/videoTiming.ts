import { STORYBOARD_MIN_PANEL_DURATION } from './storyboardPanels'
import type { GenerationRequest } from './types'
import { findVideoModel, type VideoModelDefinition } from './videoModels'
import type { FalRuntimeField } from './falRuntimeInputs'
export type FalVideoTiming = { kind: 'seconds'; field: string; suffix?: 's'; source: 'provider-declaration' } | { kind: 'frames'; framesField: string; fpsField: string; source: 'provider-declaration' }

/** Units must be explicitly declared, not inferred from an arbitrary future model ID. */
export function inferFalVideoTiming(fields: FalRuntimeField[]): FalVideoTiming | undefined {
  const descriptions = (field: FalRuntimeField): string => {
    const visit = (schema: FalRuntimeField['schema']): string[] => [schema.description || '', ...(schema.allOf || []).flatMap(visit), ...(schema.anyOf || []).flatMap(visit), ...(schema.oneOf || []).flatMap(visit)]
    return visit(field.schema).join(' ').slice(0, 8192)
  }
  const suffixSeconds = (field: FalRuntimeField): boolean => {
    const visit = (schema: FalRuntimeField['schema']): unknown[] => [...(schema.enum || []), ...(schema.default !== undefined ? [schema.default] : []), ...(schema.allOf || []).flatMap(visit), ...(schema.anyOf || []).flatMap(visit), ...(schema.oneOf || []).flatMap(visit)]
    const values = visit(field.schema).filter(value => value !== null)
    return values.length > 0 && values.every(value => typeof value === 'string' && /^\d+(?:\.\d+)?s$/.test(value))
  }
  const candidates = fields.filter(field => ['number', 'choice', 'text'].includes(field.control))
  const durations = candidates.filter(field => {
    const description = descriptions(field)
    const name = `${field.key} ${field.label}`.replace(/_/g, ' ')
    return /\b(?:duration|length)\b/i.test(name) && !/\b(?:max|min|maximum|minimum|offset|audio|transition|fade|reference)\b/i.test(name)
      && /\b(?:video|clip|generation|generated)\b/i.test(description) && (/\bseconds\b/i.test(description) || suffixSeconds(field)) && !/\bmilliseconds\b/i.test(description)
  })
  const frames = candidates.filter(field => /\b(?:video|generate|generated)\b/i.test(descriptions(field)) && /\b(?:number|count)\b.*\bframes\b/i.test(descriptions(field)) && !/interpolat/i.test(`${field.key} ${field.label}`))
  const rates = candidates.filter(field => /\bframes per second\b/i.test(descriptions(field)))
  if (durations.length === 1 && !frames.length) return { kind: 'seconds', field: durations[0].key, ...(!/\bseconds\b/i.test(descriptions(durations[0])) && suffixSeconds(durations[0]) ? { suffix: 's' as const } : {}), source: 'provider-declaration' }
  if (!durations.length && frames.length === 1 && rates.length === 1) return { kind: 'frames', framesField: frames[0].key, fpsField: rates[0].key, source: 'provider-declaration' }
  return undefined
}
export function numericVideoSeconds(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
  if (typeof value === 'string' && /^(?:\d+(?:\.\d+)?)(?:s)?$/.test(value)) { const seconds = Number(value.replace(/s$/, '')); return seconds > 0 ? seconds : undefined }
  return undefined
}
export function falVideoSeconds(binding: FalVideoTiming | undefined, values: Record<string, unknown>): number | undefined {
  if (!binding) return undefined
  if (binding.kind === 'seconds') {
    const value = values[binding.field]
    if (binding.suffix && (typeof value !== 'string' || !/^\d+(?:\.\d+)?s$/.test(value))) return undefined
    return numericVideoSeconds(value)
  }
  const numeric = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value
    : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : undefined
  const frames = numeric(values[binding.framesField]), fps = numeric(values[binding.fpsField])
  return frames !== undefined && Number.isSafeInteger(frames) && frames > 0 && fps !== undefined && fps > 0 ? frames / fps : undefined
}
/** Typed authoring only; never parse numbers from an approved Manual master. */
export function authoredTimelineSeconds(request: Pick<GenerationRequest, 'kind' | 'storyboardShots' | 'multiPrompt'>): number | undefined {
  if (request.kind !== 'video-generator') return undefined
  const beats = request.storyboardShots?.length ? request.storyboardShots : request.multiPrompt?.length ? request.multiPrompt : undefined
  if (!beats) return undefined
  let total = 0
  for (const [index, beat] of beats.entries()) {
    const seconds = numericVideoSeconds(beat.duration)
    if (seconds === undefined || seconds < STORYBOARD_MIN_PANEL_DURATION) throw new Error(`Storyboard panel ${index + 1} needs a finite duration of at least 1.0s.`)
    total += seconds
  }
  if (!Number.isFinite(total) || total <= 0) throw new Error('Authored timeline needs a finite positive total duration.')
  return total
}
export function assertFalTimelineTiming(binding: FalVideoTiming | undefined, seconds: number | undefined, values: Record<string, unknown>): void {
  if (seconds === undefined) return
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Authored timeline needs a finite positive total duration.')
  if (!binding) throw new Error('This model has no unambiguous declared timing unit for the authored Storyboard. Refresh its contract or choose a compatible model; the timing was preserved.')
  const actual = falVideoSeconds(binding, values)
  if (actual === undefined) throw new Error(`Choose a fixed native duration matching the authored ${seconds}s timeline; automatic or unspecified timing was not substituted.`)
  if (Math.abs(actual - seconds) > 0.000001) throw new Error(`Native duration ${actual}s must match the authored ${seconds}s timeline. Match the duration or explicitly revise panel timing; no padding, rounding or trimming was applied.`)
}
export interface LegacyVideoDurationPlan { seconds?: number; wire: string | number; framesPerSecond?: number; numFrames?: number }
export function legacyVideoDurationPlan(request: GenerationRequest, model: VideoModelDefinition = findVideoModel(request.videoEngine)!): LegacyVideoDurationPlan {
  if (!model) throw new Error('Choose a supported video model before validating duration.')
  if (model.family === 'wan') {
    if (request.autoDuration) throw new Error('The selected route does not support automatic video duration. Choose a fixed duration explicitly.')
    const fps = request.frameRate ?? 24, seconds = request.duration ?? 5, frames = seconds * fps
    if (!Number.isInteger(fps) || fps < 4 || fps > 60 || !Number.isFinite(seconds) || seconds <= 0 || !Number.isSafeInteger(frames) || frames < 17 || frames > 161) throw new Error('Wan requires an exact integer frame count from17–161 at4–60fps. The selected duration/FPS was not rounded or clamped.')
    return { seconds, wire: frames, framesPerSecond: fps, numFrames: frames }
  }
  if (request.autoDuration) {
    if (model.family !== 'seedance' || model.provider !== 'fal') throw new Error('The selected route does not support automatic video duration.')
    return { wire: 'auto' }
  }
  const fallback = model.provider === 'byteplus' ? model.durations.find((value): value is number => typeof value === 'number') ?? 4 : model.family === 'veo' ? model.mode === 'extend' ? 7 : 8 : 5
  const seconds = request.duration ?? fallback
  if (!Number.isFinite(seconds) || !model.durations.includes(seconds)) throw new Error(`The selected ${model.label} duration (${seconds}s) is unsupported; its saved value was not substituted.`)
  return { seconds, wire: model.provider === 'byteplus' ? seconds : model.family === 'veo' ? `${seconds}s` : String(seconds) }
}
export function videoTimingReadinessFailures(request: GenerationRequest): string[] {
  if (request.kind !== 'video-generator' || request.falNative) return []
  try {
    const plan = legacyVideoDurationPlan(request), authored = authoredTimelineSeconds(request)
    if (authored !== undefined && (plan.seconds === undefined || Math.abs(authored - plan.seconds) > 0.000001)) return [`selected native duration ${plan.seconds ?? 'auto'} must match the authored ${authored}s timeline; no padding or trimming was applied`]
    return []
  } catch (error) { return [error instanceof Error ? error.message : 'Review the video timing.'] }
}
