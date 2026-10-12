import type { FalJson } from './falSchemaBinding'
import type { FalRuntimeField } from './falRuntimeInputs'
import { projectNativeVideoFooterFields, type FalNativeVideoFooterField } from './nativeVideoFooterControls'
import { numericVideoSeconds } from './videoTiming'

/** New controls use contract choices; authored values/drafts and source-owned timelines survive hydration. */
export function nativeVideoDefaults(fields: readonly FalRuntimeField[], authored: { values: Record<string, FalJson>; drafts?: Record<string, string> }, defaults: Record<string, FalJson>, bindings: Partial<Record<FalNativeVideoFooterField, string>> = {}, sourceOwned = false): Record<string, FalJson> {
  const values = { ...defaults }
  if (sourceOwned) return values
  for (const control of projectNativeVideoFooterFields(fields, {values:{}}, bindings)) {
    const key = control.fieldKey || control.key
    if (Object.hasOwn(authored.values, key) || Object.hasOwn(authored.drafts || {}, key)) continue
    const choices = control.options.filter(option => option.kind === 'value' && !option.disabled && option.value !== undefined)
    if (control.key === 'duration') {
      const durations = choices.map(option => ({ value: option.value!, seconds: numericVideoSeconds(option.value) })).filter(option => option.seconds !== undefined).sort((a,b) => a.seconds! - b.seconds!)
      if (durations.length) values[key] = durations[0].value
    } else if (control.key === 'aspect_ratio') {
      const ratios = choices.filter(option => typeof option.value === 'string' && /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(option.value))
      const ratio = ratios.find(option => option.value === '16:9') || ratios[0]
      if (ratio) values[key] = ratio.value!
    }
  }
  return values
}
