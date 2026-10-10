import type { StudioNodeData } from './types'
import { reconcileFalInputValues } from './falRuntimeInputs'
import { findVideoModel, videoModelDurationInventory } from './videoModels'
import { falVideoSeconds, numericVideoSeconds, legacyVideoDurationPlan } from './videoTiming'
import { validateFalSchema, type FalSchemaContract, type FalSchemaNode, type FalJson } from './falSchemaBinding'
import type { HiggsfieldInputContract } from './higgsfieldInputContract'
import type { HiggsfieldNodeState } from './higgsfieldNodeBinding'
import { higgsfieldModel } from './higgsfieldNative'

export interface VideoDurationLimits {
  minimum?: number
  maximum?: number
  minimumExclusive?: boolean
  maximumExclusive?: boolean
  /** Exact finite native choices only. A continuous range is not an enum. */
  choices: number[]
  selectedSeconds?: number
  error?: string
}
type Domain = { minimum?: number; maximum?: number; minimumExclusive?: boolean; maximumExclusive?: boolean; choices?: number[]; absent?: boolean }
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
const accepted = (schema: FalSchemaNode, value: unknown): boolean => {
  try { validateFalSchema(schema, value); return true }
  catch (error) { if (error instanceof Error && error.name === 'FalSchemaValueMismatch') return false; throw error }
}
const sorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b)
function intersect(a: Domain, b: Domain): Domain {
  if (a.absent || b.absent) return { absent: true }
  const minimum = a.minimum === undefined ? b.minimum : b.minimum === undefined ? a.minimum : Math.max(a.minimum, b.minimum)
  const maximum = a.maximum === undefined ? b.maximum : b.maximum === undefined ? a.maximum : Math.min(a.maximum, b.maximum)
  const minimumExclusive = minimum !== undefined && (a.minimum === minimum && a.minimumExclusive || b.minimum === minimum && b.minimumExclusive) || undefined
  const maximumExclusive = maximum !== undefined && (a.maximum === maximum && a.maximumExclusive || b.maximum === maximum && b.maximumExclusive) || undefined
  const choices = a.choices && b.choices ? a.choices.filter(v => b.choices!.includes(v)) : a.choices || b.choices
  const filtered = choices?.filter(v => (minimum === undefined || (minimumExclusive ? v > minimum : v >= minimum)) && (maximum === undefined || (maximumExclusive ? v < maximum : v <= maximum)))
  if (minimum !== undefined && maximum !== undefined && (minimum > maximum || minimum === maximum && (minimumExclusive || maximumExclusive)) || filtered?.length === 0) return { absent: true }
  return { minimum: filtered?.[0] ?? minimum, maximum: filtered?.at(-1) ?? maximum, ...(filtered ? { choices: filtered } : {}), minimumExclusive, maximumExclusive }
}
function union(domains: Domain[]): Domain {
  const present = domains.filter(d => !d.absent)
  if (!present.length) return { absent: true }
  const minimum = present.every(d => d.minimum !== undefined) ? Math.min(...present.map(d => d.minimum!)) : undefined
  const maximum = present.every(d => d.maximum !== undefined) ? Math.max(...present.map(d => d.maximum!)) : undefined
  return { minimum, maximum, minimumExclusive: minimum !== undefined && present.filter(d => d.minimum === minimum).every(d => d.minimumExclusive) || undefined, maximumExclusive: maximum !== undefined && present.filter(d => d.maximum === maximum).every(d => d.maximumExclusive) || undefined,
    ...(present.every(d => d.choices) ? { choices: sorted(present.flatMap(d => d.choices!)) } : {}) }
}
/** Projection is deliberately conservative: defaults are values, never limit evidence. */
function domain(schema: FalSchemaNode, depth = 0): Domain {
  if (depth > 32) return {}
  if (schema.type === 'null' || schema.type === 'boolean' || schema.type === 'array' || schema.type === 'object') return { absent: true }
  let result: Domain = {}
  const enumValues = schema.enum || (own(schema, 'const') ? [schema.const!] : undefined)
  if (enumValues) {
    const values = sorted(enumValues.map(numericVideoSeconds).filter((v): v is number => v !== undefined))
    result = values.length ? { minimum: values[0], maximum: values.at(-1), choices: values } : { absent: true }
  }
  const lower = schema.type === 'string' ? undefined : typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : schema.minimum
  const upper = schema.type === 'string' ? undefined : typeof schema.exclusiveMaximum === 'number' ? schema.exclusiveMaximum : schema.maximum
  result = intersect(result, { minimum: lower, maximum: upper, minimumExclusive: (schema.exclusiveMinimum === true || typeof schema.exclusiveMinimum === 'number') || undefined, maximumExclusive: (schema.exclusiveMaximum === true || typeof schema.exclusiveMaximum === 'number') || undefined })
  for (const child of schema.allOf || []) result = intersect(result, domain(child, depth + 1))
  for (const children of [schema.anyOf, schema.oneOf]) if (children) result = intersect(result, union(children.map(child => domain(child, depth + 1))))
  // Field-level conditions depend on the trial duration itself; do not promise inferred bounds.
  if (schema.if || schema.not) return { ...(result.choices ? { choices: result.choices.filter(v => accepted(schema, v)) } : {}) }
  if (result.choices) {
    const values = result.choices.filter(v => accepted(schema, v) || accepted(schema, String(v)) || accepted(schema, `${v}s`))
    return values.length ? { choices: values, minimum: values[0], maximum: values.at(-1) } : { absent: true }
  }
  // Integer and multipleOf constraints change the attainable endpoint.
  const step = schema.type === 'string' ? undefined : schema.multipleOf || (schema.type === 'integer' ? 1 : undefined)
  if (step) {
    if (result.minimum !== undefined) result.minimum = (Math.ceil(result.minimum / step) + (result.minimumExclusive && Math.abs(result.minimum / step - Math.round(result.minimum / step)) < 1e-8 ? 1 : 0)) * step
    if (result.maximum !== undefined) result.maximum = (Math.floor(result.maximum / step) - (result.maximumExclusive && Math.abs(result.maximum / step - Math.round(result.maximum / step)) < 1e-8 ? 1 : 0)) * step
    delete result.minimumExclusive; delete result.maximumExclusive
  }
  if (result.minimum !== undefined && result.maximum !== undefined && result.minimum > result.maximum) return { absent: true }
  if (schema.oneOf && result.maximum !== undefined && !result.maximumExclusive && ![result.maximum, String(result.maximum), `${result.maximum}s`].some(value => accepted(schema, value))) delete result.maximum
  return result
}
/** Root constraints on this field are retained; an unsupported root alternative is never flattened. */
function timingSchema(root: FalSchemaNode, key: string, values: Record<string, FalJson>, depth = 0): FalSchemaNode | undefined {
  if (depth > 32 || root.anyOf || root.oneOf || root.not) return undefined
  const layers: FalSchemaNode[] = root.properties?.[key] ? [root.properties[key]] : []
  for (const child of root.allOf || []) {
    const projected = timingSchema(child, key, values, depth + 1)
    if (!projected) return undefined
    layers.push(projected)
  }
  if (root.if) {
    if (JSON.stringify(root.if).includes(`"${key}"`)) return undefined
    const branch = accepted(root.if, values) ? root.then : root.else
    if (branch) {
      const projected = timingSchema(branch, key, values, depth + 1)
      if (!projected) return undefined
      layers.push(projected)
    }
  }
  return { allOf: layers }
}
export function falVideoDurationLimits(contract: FalSchemaContract | undefined, authored: Record<string, FalJson>): VideoDurationLimits {
  const timing = contract?.runtime?.timing
  if (!contract || !timing) return { choices: [], error: 'Refresh the selected model contract to verify video timing.' }
  const values = reconcileFalInputValues(undefined, contract.runtime!, authored).values
  const key = timing.kind === 'seconds' ? timing.field : timing.framesField
  const schema = timingSchema(contract.input, key, values)
  if (!schema) return { choices: [], error: 'The selected model timing limits require a reviewed adapter.' }
  const projected = domain(schema)
  if (projected.absent) return { choices: [], error: 'No supported fixed video duration is declared by this contract.' }
  const fps = timing.kind === 'frames' ? numericVideoSeconds(values[timing.fpsField]) : 1
  const selectedSeconds = falVideoSeconds(timing, values)
  if (!fps) return { choices: [], error: 'Choose a valid frame rate to verify video duration.' }
  let error: string | undefined
  const selectedValue = values[key]
  if (selectedSeconds === undefined) error = 'Choose a fixed native duration to budget the Storyboard.'
  else if (!accepted(schema, selectedValue)) error = 'The saved native duration is unsupported; revise it explicitly.'
  if (timing.kind === 'frames') {
    const fpsSchema = timingSchema(contract.input, timing.fpsField, values)
    if (!fpsSchema || !accepted(fpsSchema, values[timing.fpsField])) error = 'The saved frame rate is unsupported; revise it explicitly.'
  }
  return { minimum: projected.minimum !== undefined ? projected.minimum / fps : undefined, maximum: projected.maximum !== undefined ? projected.maximum / fps : undefined, minimumExclusive: projected.minimumExclusive, maximumExclusive: projected.maximumExclusive, choices: (projected.choices || []).map(v => v / fps), selectedSeconds, error }
}
export function higgsfieldVideoDurationLimits(state: HiggsfieldNodeState, contract?: HiggsfieldInputContract): VideoDurationLimits {
  try { if (higgsfieldModel(state.endpointId).kind === 'genjutsu') return { minimum: 4, maximum: 30, choices: [], error: 'This model uses source-video timing (4–30s), not an editable clip duration.' } }
  catch { return { choices: [], error: 'The saved Higgsfield route has no verified timing adapter.' } }
  if (!contract || contract.endpointId !== state.endpointId || !state.fingerprint || contract.fingerprint !== state.fingerprint || contract.contractRevision !== state.contractRevision) return { choices: [], error: 'Refresh the selected Higgsfield model inputs to verify video timing.' }
  if (contract.timingScope === 'source-video') return { choices: [], error: 'This model uses source-video timing, not an editable clip duration.' }
  const schema = contract.input.properties?.duration
  if (contract.unsupportedInputs.length || !schema) return { choices: [], error: 'The selected Higgsfield timing limits require a reviewed adapter.' }
  const projected = domain(schema), value = own(state.values, 'duration') ? state.values.duration : schema.default
  const selectedSeconds = numericVideoSeconds(value)
  return { minimum: projected.minimum, maximum: projected.maximum, minimumExclusive: projected.minimumExclusive, maximumExclusive: projected.maximumExclusive, choices: projected.choices || [], selectedSeconds,
    ...(!selectedSeconds || !accepted(schema, value) ? { error: 'The saved native duration is unsupported; revise it explicitly.' } : {}) }
}

export function generatorVideoDurationLimits(data: Pick<StudioNodeData, 'videoEngine' | 'duration' | 'frameRate' | 'autoDuration' | 'falNative' | 'higgsfieldNative'>, contract?: FalSchemaContract, higgsfieldContract?: HiggsfieldInputContract): VideoDurationLimits {
  if (data.higgsfieldNative) return higgsfieldVideoDurationLimits(data.higgsfieldNative, higgsfieldContract)
  if (data.falNative) {
    if (!contract || contract.endpointId !== data.falNative.endpointId || contract.runtime?.fingerprint !== data.falNative.fingerprint) return { choices: [], error: 'Refresh the selected model contract to verify video timing.' }
    return falVideoDurationLimits(contract, data.falNative.values)
  }
  const model = findVideoModel(data.videoEngine)
  if (!model) return { choices: [], error: 'Choose a supported video model to verify duration.' }
  const choices = videoModelDurationInventory(model.id, data.frameRate).filter((v): v is number => typeof v === 'number')
  let selectedSeconds = data.autoDuration ? undefined : data.duration
  let error: string | undefined
  try {
    const plan = legacyVideoDurationPlan({ nodeId: 'duration-observation', kind: 'video-generator', prompt: '', videoEngine: model.id, duration: data.duration, frameRate: data.frameRate, autoDuration: data.autoDuration }, model)
    selectedSeconds = plan.seconds
    if (selectedSeconds === undefined) error = 'Choose a fixed duration to budget the Storyboard.'
  } catch (reason) { error = reason instanceof Error ? reason.message : 'Review video timing.' }
  if (model.family === 'wan') {
    const fps = data.frameRate ?? 24
    return Number.isInteger(fps) && fps >= 4 && fps <= 60 ? { minimum: 17 / fps, maximum: 161 / fps, choices, selectedSeconds, error } : { choices: [], selectedSeconds, error }
  }
  return { minimum: choices[0], maximum: choices.at(-1), choices, selectedSeconds, error }
}
export function videoMaximumLabel(limits: VideoDurationLimits): string {
  if (limits.maximum === undefined) return 'Maximum duration unverified'
  const maximum = Number(limits.maximum.toFixed(3))
  return `${limits.maximumExclusive ? 'Duration <' : 'Max'} ${maximum !== limits.maximum ? '≈' : ''}${maximum}s`
}
