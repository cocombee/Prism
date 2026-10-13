/** Current Sound Effects operation contracts, independent of native fal schemas. */
import { normalizedStoryboardDurationOptions } from './storyboardDurationBudget'
import { formatDurationSeconds } from './videoModels'

export const SOUND_EFFECT_MIN_SECONDS = 0.5
export function defaultSoundEffectDuration(value: number | undefined): number {
  return value ?? SOUND_EFFECT_MIN_SECONDS
}
export function soundEffectDurationLabel(value: number | undefined): string {
  const selected = defaultSoundEffectDuration(value)
  return Number.isFinite(selected) ? formatDurationSeconds(selected) : String(selected)
}
export function validateSoundEffectDuration(value: number | undefined, provider: 'elevenlabs' | 'fal'): number {
  const selected = defaultSoundEffectDuration(value), maximum = provider === 'elevenlabs' ? 30 : 22
  if (typeof selected !== 'number' || !Number.isFinite(selected) || selected < SOUND_EFFECT_MIN_SECONDS || selected > maximum) {
    throw new Error(`Effect duration must be between ${SOUND_EFFECT_MIN_SECONDS} and ${maximum} seconds.`)
  }
  return selected
}

/** Shared footer/Inspector choices; labels never rewrite exact authored seconds. */
export function soundEffectDurationOptions(value: number | undefined, provider: 'elevenlabs' | 'fal'): Array<{value: string; label: string; disabled?: boolean}> {
  const selected = defaultSoundEffectDuration(value)
  const maximum = provider === 'elevenlabs' ? 30 : 22
  const options: Array<{value: string; label: string; disabled?: boolean}> = [SOUND_EFFECT_MIN_SECONDS, ...normalizedStoryboardDurationOptions([maximum])]
    .map(seconds => ({value: String(seconds), label: formatDurationSeconds(seconds)}))
  if (!options.some(option => option.value === String(selected))) {
    let valid = true
    try { validateSoundEffectDuration(selected, provider) } catch { valid = false }
    options.push({value: String(selected), label: soundEffectDurationLabel(selected) + (valid ? '' : ' · review'), ...(valid ? {} : {disabled: true})})
  }
  options.sort((left, right) => {
    const seconds = (raw: string) => Number.isFinite(Number(raw)) ? Number(raw) : Number.NEGATIVE_INFINITY
    return seconds(left.value) - seconds(right.value)
  })
  return options
}
