import { verifiedNativeVideoFrameRate } from './videoCadenceSelection'
import { MOTION_CADENCES, formatDurationSeconds } from './videoModels'
import { normalizedStoryboardDurationOptions } from './storyboardDurationBudget'
import { describeFalRuntimeInputs, type FalRuntimeField } from './falRuntimeInputs'
import { validateFalSchema, type FalJson, type FalSchemaContract, type FalSchemaNode } from './falSchemaBinding'
import type { FalNativeNodeState } from './falNodeBinding'

/** Provider fields that can back the existing video-card footer controls. */
export const FAL_NATIVE_VIDEO_FOOTER_FIELD_ORDER = [
  'aspect_ratio', 'duration', 'resolution', 'fps', 'sound', 'generate_audio',
] as const

export type FalNativeVideoFooterField = typeof FAL_NATIVE_VIDEO_FOOTER_FIELD_ORDER[number]
export type FalNativeVideoFooterControlType = 'choice' | 'boolean' | 'number' | 'text'

export interface FalNativeVideoFooterOption {
  token: string
  kind: 'value' | 'default' | 'unavailable' | 'missing'
  label: string
  /** Absent for Default/Missing sentinels; consumers should preserve field absence. */
  value?: FalJson
  disabled?: boolean
}

export interface FalNativeVideoFooterControl {
  key: FalNativeVideoFooterField
  /** Provider payload key, when a verified timing descriptor uses a different name. */
  fieldKey?: string
  label: string
  control: FalNativeVideoFooterControlType
  schema: FalSchemaNode
  required: boolean
  nullable: boolean
  hasValue: boolean
  value?: FalJson
  hasDraft: boolean
  draft?: string
  hasDefault: boolean
  defaultValue?: FalJson
  selectedToken: string
  options: FalNativeVideoFooterOption[]
}

export interface FalNativeVideoFooterState {
  values: Record<string, FalJson>
  drafts?: Record<string, string>
}

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const tokenForValue = (value: FalJson) => `value:${JSON.stringify(value)}`
const scalar = (value: FalJson) => value === null || ['string', 'number', 'boolean'].includes(typeof value)

function schemaDefaults(schema: FalSchemaNode): FalJson[] {
  return [
    ...(own(schema, 'default') ? [schema.default as FalJson] : []),
    ...(schema.allOf || []).flatMap(schemaDefaults),
  ]
}

function sameJson(a: FalJson, b: FalJson): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function uniqueDefault(schema: FalSchemaNode): { hasDefault: boolean; value?: FalJson } {
  const defaults = schemaDefaults(schema)
  return defaults.length && defaults.every(value => sameJson(value, defaults[0]))
    ? { hasDefault: true, value: defaults[0] }
    : { hasDefault: false }
}

type NumericChoices = { status: 'ready'; values: number[]; sampledSeconds?: true } | { status: 'unbounded' | 'unsupported' | 'too-many' }

function schemaLayers(schema: FalSchemaNode): FalSchemaNode[] {
  // A nullable scalar has one concrete branch. Read its bounds without
  // flattening other alternatives into an invented numeric range.
  const branches = schema.anyOf || schema.oneOf
  const concrete = branches?.filter(branch => branch.type !== 'null')
  const nullableBranch = branches?.some(branch => branch.type === 'null') && concrete?.length === 1 ? concrete[0] : undefined
  return [schema, ...(nullableBranch ? schemaLayers(nullableBranch) : []), ...(schema.allOf || []).flatMap(schemaLayers)]
}

function hasDiscreteNumericRule(schema: FalSchemaNode, depth = 0): boolean {
  if (depth > 32 || schema.enum || own(schema, 'const') || schema.multipleOf !== undefined) return true
  return [...(schema.allOf || []), ...(schema.anyOf || []), ...(schema.oneOf || [])].some(child => hasDiscreteNumericRule(child, depth + 1))
}

function numericChoices(schema: FalSchemaNode, verifiedSeconds = false, exactValues: Array<FalJson | undefined> = []): NumericChoices {
  const layers = schemaLayers(schema)
  const types = new Set(layers.map(layer => layer.type).filter((type): type is 'integer' | 'number' => type === 'integer' || type === 'number'))
  if (types.size !== 1) return { status: 'unsupported' }
  const type = [...types][0]
  const minimums: Array<{ value: number; exclusive: boolean }> = []
  const maximums: Array<{ value: number; exclusive: boolean }> = []
  for (const layer of layers) {
    if (layer.minimum !== undefined) minimums.push({ value: layer.minimum, exclusive: layer.exclusiveMinimum === true })
    if (typeof layer.exclusiveMinimum === 'number') minimums.push({ value: layer.exclusiveMinimum, exclusive: true })
    if (layer.maximum !== undefined) maximums.push({ value: layer.maximum, exclusive: layer.exclusiveMaximum === true })
    if (typeof layer.exclusiveMaximum === 'number') maximums.push({ value: layer.exclusiveMaximum, exclusive: true })
  }
  if (!minimums.length || !maximums.length) return { status: 'unbounded' }
  const lowerValue = Math.max(...minimums.map(bound => bound.value))
  const upperValue = Math.min(...maximums.map(bound => bound.value))
  const lowerExclusive = minimums.some(bound => bound.value === lowerValue && bound.exclusive)
  const upperExclusive = maximums.some(bound => bound.value === upperValue && bound.exclusive)

  const increments = [...new Set(layers.map(layer => layer.multipleOf).filter((value): value is number => value !== undefined))]
  if (increments.length > 1) return { status: 'unsupported' }
  if (verifiedSeconds && type === 'number' && !increments.length && !hasDiscreteNumericRule(schema)) {
    if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue) || upperValue < lowerValue) return { status: 'unsupported' }
    // Bound allocation before invoking the shared sampler. Provider validation,
    // rather than UI rounding, owns every proposed and authored value.
    const sampleCount = Math.max(0, Math.floor((upperValue - 1) / 0.5 + 1e-9) + 1)
    if (sampleCount > 1199) return { status: 'too-many' }
    const accepted = (value: number) => { try { validateFalSchema(schema, value, 'footer value'); return true } catch { return false } }
    const values = normalizedStoryboardDurationOptions([upperValue]).filter(accepted)
    for (const value of exactValues) if (typeof value === 'number' && Number.isFinite(value) && accepted(value) && !values.includes(value)) values.push(value)
    if (!values.length) return { status: 'unsupported' }
    if (values.length > 1200) return { status: 'too-many' }
    return { status: 'ready', values: values.sort((left, right) => left - right), sampledSeconds: true }
  }
  const step = increments[0] ?? (type === 'integer' ? 1 : undefined)
  if (!step || !Number.isFinite(step) || step <= 0) return { status: 'unsupported' }
  const near = (a: number, b: number) => Math.abs(a - b) <= Number.EPSILON * Math.max(Math.abs(a), Math.abs(b), 1) * 8
  const normalize = (value: number) => Number(value.toPrecision(15))
  let firstIndex = Math.ceil(lowerValue / step)
  let firstValue = normalize(firstIndex * step)
  if (firstValue < lowerValue || lowerExclusive && near(firstValue, lowerValue)) {
    firstIndex++
    firstValue = normalize(firstIndex * step)
  }
  let lastIndex = Math.floor(upperValue / step)
  let lastValue = normalize(lastIndex * step)
  if (lastValue > upperValue || upperExclusive && near(lastValue, upperValue)) {
    lastIndex--
    lastValue = normalize(lastIndex * step)
  }
  const count = lastIndex - firstIndex + 1
  if (count <= 0) return { status: 'unsupported' }
  if (count > 256) return { status: 'too-many' }

  const values = Array.from({ length: count }, (_, index) => normalize((firstIndex + index) * step))
  try { values.forEach(value => validateFalSchema(schema, value, 'footer value')) }
  catch { return { status: 'unsupported' } }
  return { status: 'ready', values }
}

function displayValue(key: FalNativeVideoFooterField, value: FalJson): string {
  if (key === 'duration') {
    if (value === 'auto') return 'Auto'
    if (value === null) return 'Auto'
    if (typeof value === 'number' && Number.isFinite(value)) return `${value}s`
    if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)) return `${value}s`
  }
  if (key === 'fps' && (typeof value === 'number' || typeof value === 'string')) return `${value} fps`
  if (key === 'aspect_ratio' && value === 'auto') return 'Auto'
  if (key === 'generate_audio' && typeof value === 'boolean') return value ? 'On' : 'Off'
  if (key === 'sound' && typeof value === 'string' && ['on', 'off'].includes(value.toLowerCase())) return value.toLowerCase() === 'on' ? 'On' : 'Off'
  return value === null ? 'None' : String(value)
}

function supportedControl(field: FalRuntimeField): FalNativeVideoFooterControlType | undefined {
  if (field.control === 'choice' && field.choices?.length && field.choices.every(scalar)) return 'choice'
  if (field.control === 'boolean') return 'boolean'
  if (field.control === 'number') return 'number'
  if (field.control === 'text') return 'text'
  return undefined
}

function optionsFor(
  key: FalNativeVideoFooterField,
  field: FalRuntimeField,
  control: FalNativeVideoFooterControlType,
  nullable: boolean,
  hasDefault: boolean,
  defaultValue: FalJson | undefined,
  hasValue: boolean,
  value: FalJson | undefined,
  numericValues: number[] | undefined,
  sourceOwnedAspectRatio: boolean,
  sampledSeconds = false,
): { options: FalNativeVideoFooterOption[]; selectedToken: string } {
  const options: FalNativeVideoFooterOption[] = []
  const display = (value: FalJson) => sampledSeconds && key === 'duration' && typeof value === 'number' && Number.isFinite(value) ? formatDurationSeconds(value) : displayValue(key, value)
  const explicitRatioOnly = key === 'aspect_ratio' && !sourceOwnedAspectRatio && field.choices?.some(value => typeof value === 'string' && /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(value))
  if (!field.required && !explicitRatioOnly) {
    options.push({
      token: '@default', kind: 'default',
      label: hasDefault && defaultValue !== undefined ? `Default (${display(defaultValue)})` : 'Default',
    })
  }
  const values = field.control === 'choice' ? field.choices || []
    : field.control === 'boolean' ? [false, true]
      : numericValues || []
  if (!explicitRatioOnly && nullable && !values.some(optionValue => optionValue === null)) {
    options.push({ token: tokenForValue(null), kind: 'value', value: null, label: key === 'duration' ? 'Auto' : 'None' })
  }
  for (const optionValue of values) {
    if (explicitRatioOnly && (optionValue === null || typeof optionValue === 'string' && optionValue.toLowerCase() === 'auto')) continue
    const label = control === 'boolean' && key === 'generate_audio'
      ? (optionValue ? 'On' : 'Off')
      : display(optionValue)
    options.push({ token: tokenForValue(optionValue), kind: 'value', value: optionValue, label })
  }

  if (!hasValue) return { options, selectedToken: field.required ? '@missing' : '@default' }
  const selected = value as FalJson
  if (control === 'text' || control === 'number' && !numericValues?.length) return { options, selectedToken: tokenForValue(selected) }
  const matching = options.find(option => option.kind === 'value' && option.value !== undefined && sameJson(option.value, selected))
  if (matching) return { options, selectedToken: matching.token }

  const token = `unavailable:${JSON.stringify(selected)}`
  options.push({ token, kind: 'unavailable', value: selected, label: `Unavailable (${display(selected)})`, disabled: true })
  return { options, selectedToken: token }
}

/**
 * Read-only projection from the current compiled Fal contract into fields that
 * the established video footer can render. It never inserts defaults, coerces
 * values, chooses a fallback, or creates a control for an absent schema field.
 */
export function projectFalNativeVideoFooterControls(
  contract: FalSchemaContract | undefined,
  state: FalNativeVideoFooterState | Pick<FalNativeNodeState, 'values' | 'drafts'>,
): FalNativeVideoFooterControl[] {
  if (!contract || !state || !state.values || typeof state.values !== 'object') return []
  const runtime=describeFalRuntimeInputs(contract)
  const bindings=runtime.timing?.kind==='seconds' ? {duration:runtime.timing.field} : {}
  // Source-video timelines need an explicitly reviewed generated-extension adapter.
  const verifiedSeconds = runtime.timing?.kind === 'seconds' && !runtime.fields.some(field => field.media?.role === 'source-video')
  return projectNativeVideoFooterFields(runtime.fields, state, bindings, undefined, verifiedSeconds)
}

/** Endpoint-owned seconds declaration verified against its public API/playground.
 * https://open.higgsfield.ai/models/pixverse/v6/text-to-video/api-reference
 * https://open.higgsfield.ai/models/pixverse/v6/text-to-video/playground
 * Other endpoints retain the generic projector's conservative unit policy.
 */
export function projectHiggsfieldNativeVideoFooterControls(
  endpointId: string,
  runtimeFields: readonly FalRuntimeField[],
  state: FalNativeVideoFooterState,
): FalNativeVideoFooterControl[] {
  const verifiedSeconds = endpointId === 'pixverse/v6/text-to-video'
    && !runtimeFields.some(field => field.media?.role === 'source-video')
  return projectNativeVideoFooterFields(runtimeFields, state, {}, undefined, verifiedSeconds)
}

/** Shared projection for schema-owned native routes from any provider. */
export function projectNativeVideoFooterFields(
  runtimeFields: readonly FalRuntimeField[],
  state: FalNativeVideoFooterState | Pick<FalNativeNodeState, 'values' | 'drafts'>,
  bindings: Partial<Record<FalNativeVideoFooterField,string>> = {},
  sourceOwnedAspectRatio = runtimeFields.some(field => field.media?.role === 'source-video'),
  verifiedSecondsDuration = false,
): FalNativeVideoFooterControl[] {
  if (!state || !state.values || typeof state.values !== 'object') return []
  const fields = new Map(runtimeFields.map(field => [field.key, field]))
  const controls: FalNativeVideoFooterControl[] = []

  for (const key of FAL_NATIVE_VIDEO_FOOTER_FIELD_ORDER) {
    const audioAlias = key === 'generate_audio' && !fields.has(key) ? ['audio', 'sound'].find(candidate => fields.get(candidate)?.control === 'boolean') : undefined
    const fieldKey=bindings[key] || audioAlias || key
    const field = fields.get(fieldKey)
    if (!field) continue
    const schemaControl = supportedControl(field)
    if (!schemaControl || key === 'generate_audio' && schemaControl !== 'boolean') continue
    if (key !== 'generate_audio' && key !== 'sound' && (schemaControl === 'boolean' || field.choices?.some(value => typeof value === 'boolean'))) continue
    if (key === 'sound' && !(schemaControl === 'choice' && field.choices && field.choices.length === 2 &&
      field.choices.every(value => typeof value === 'string') &&
      new Set(field.choices.map(value => String(value).toLowerCase())).size === 2 &&
      field.choices.every(value => ['on', 'off'].includes(String(value).toLowerCase())))) continue

    const hasValue = own(state.values, fieldKey)
    const value = hasValue ? state.values[fieldKey] : undefined
    const hasDraft = Boolean(state.drafts && own(state.drafts, fieldKey))
    const draft = hasDraft ? state.drafts?.[fieldKey] : undefined
    const { hasDefault, value: defaultValue } = uniqueDefault(field.schema)
    const numericRange = schemaControl === 'number' ? numericChoices(field.schema, key === 'duration' && verifiedSecondsDuration, [value, defaultValue]) : undefined
    if (numericRange && numericRange.status !== 'ready' && numericRange.status !== 'unbounded') continue
    const numericValues = numericRange?.status === 'ready' ? numericRange.values : undefined
    const control: FalNativeVideoFooterControlType = numericValues ? 'choice' : schemaControl
    const { options, selectedToken } = optionsFor(key, field, control, field.nullable, hasDefault, defaultValue, hasValue, value, numericValues, sourceOwnedAspectRatio, numericRange?.status === 'ready' && numericRange.sampledSeconds === true)
    const label = key === 'aspect_ratio' ? 'Aspect Ratio'
      : key === 'duration' ? 'Duration'
        : key === 'resolution' ? 'Resolution'
          : key === 'fps' ? 'FPS'
            : 'Sound'

    controls.push({
      key, ...(fieldKey!==key?{fieldKey}:{}), label, control, schema: JSON.parse(JSON.stringify(field.schema)) as FalSchemaNode,
      required: field.required, nullable: field.nullable,
      hasValue, ...(hasValue ? { value } : {}), hasDraft, ...(hasDraft ? { draft } : {}),
      hasDefault, ...(hasDefault ? { defaultValue } : {}), selectedToken, options,
    })
  }
  return controls
}

/** Motion cadence is prompt intent; this never declares a provider output FPS field. */
export function nativeVideoMotionCadenceOptions(endpointId: string, fps?: number): number[] {
  const ceiling = fps ?? verifiedNativeVideoFrameRate(endpointId)
  if (ceiling && Number.isFinite(ceiling)) return MOTION_CADENCES.filter(value => value <= ceiling)
  return []
}

export function normalizedNativeVideoMotionCadence(endpointId: string, fps?: number, cadence?: number): number | undefined {
  const options = nativeVideoMotionCadenceOptions(endpointId, fps)
  if (cadence && options.includes(cadence)) return cadence
  return options.includes(24) ? 24 : [...options].reverse().find(value => value < 24) ?? options[0]
}

/** Preserve the actual schema field and value type, including provider audio aliases. */
export function nativeVideoSoundChoice(control: FalNativeVideoFooterControl, state: FalNativeVideoFooterState): {active: boolean; next?: FalNativeVideoFooterOption} {
  const key=control.fieldKey || control.key
  const value=own(state.values,key)?state.values[key]:control.hasDefault?control.defaultValue:undefined
  const boolean=control.control==='boolean'
  const active=boolean?value===true:typeof value==='string'&&value.toLowerCase()==='on'
  const next=control.options.find(option=>option.kind==='value'&&(boolean?option.value===!active:typeof option.value==='string'&&option.value.toLowerCase()===(active?'off':'on')))
  return {active,next}
}
