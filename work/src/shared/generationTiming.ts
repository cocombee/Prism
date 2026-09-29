import type { GenerationRequest, HistoryEntry } from './types'
import { generationMediaInputCount } from './imageModels'

export function generationTimingKey(request: GenerationRequest): string {
  return JSON.stringify({
    kind: request.kind,
    model: request.imageModelId || request.videoEngine || request.voiceEngine || request.upscalerModel || '',
    resolution: request.imageResolution || request.resolution || '',
    duration: request.duration || 0,
    quantity: request.quantity || 1,
    references: generationMediaInputCount(request),
    audio: Boolean(request.generateAudio),
  })
}

type TimingShape = {
  kind?: unknown
  model?: unknown
  resolution?: unknown
  duration?: unknown
  quantity?: unknown
  references?: unknown
  audio?: unknown
}

function parseTimingShape(key: string | undefined): TimingShape | null {
  if (!key) return null
  try {
    const parsed = JSON.parse(key)
    return parsed && typeof parsed === 'object' ? parsed as TimingShape : null
  } catch {
    return null
  }
}

function sameTimingFamily(candidateKey: string | undefined, targetKey: string): boolean {
  const candidate = parseTimingShape(candidateKey)
  const target = parseTimingShape(targetKey)
  if (!candidate || !target) return false
  return candidate.kind === target.kind
    && candidate.model === target.model
    && candidate.resolution === target.resolution
    && candidate.duration === target.duration
    && candidate.quantity === target.quantity
    && candidate.audio === target.audio
}

function elapsedSeconds(entry: HistoryEntry): number {
  return (entry.durationMs! / 1000) * Math.max(1, entry.timingScale || 1)
}

const COLD_START_SAFETY_FACTOR = 1.25
const OBSERVED_SAFETY_FACTOR = 1.15

export function learnedGenerationSeconds(history: HistoryEntry[], timingKey: string, fallbackSeconds: number): number {
  const completed = history
    .filter((entry) => entry.status === 'complete' && Number.isFinite(entry.durationMs) && (entry.durationMs || 0) > 0)
  const exactSamples = completed
    .filter((entry) => entry.status === 'complete' && entry.timingKey === timingKey && Number.isFinite(entry.durationMs) && (entry.durationMs || 0) > 0)
    .slice(0, 8)
    .reverse()
  const usingFamilyFallback = exactSamples.length === 0
  const samples = usingFamilyFallback
    ? completed.filter((entry) => sameTimingFamily(entry.timingKey, timingKey)).slice(0, 8).reverse()
    : exactSamples
  if (!samples.length) return Math.max(1, Math.round(fallbackSeconds * COLD_START_SAFETY_FACTOR))
  let estimate = fallbackSeconds
  for (const sample of samples) estimate = estimate * 0.35 + elapsedSeconds(sample) * 0.65
  // The countdown is an upper estimate, not a mean. Preserve the slowest recent
  // completion plus margin on both exact and family paths so one fast run cannot
  // make the app repeat a known underrun. The bounded window keeps this adaptive.
  const recentPeak = Math.max(...samples.map(elapsedSeconds))
  estimate = Math.max(estimate, recentPeak * OBSERVED_SAFETY_FACTOR)
  if (usingFamilyFallback) estimate = Math.max(estimate, fallbackSeconds * COLD_START_SAFETY_FACTOR)
  return Math.max(1, Math.round(estimate))
}
