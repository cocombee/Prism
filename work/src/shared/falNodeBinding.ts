import { nativeVideoDefaults } from './nativeVideoDefaults'
import { preserveHiggsfieldSelection, type HiggsfieldNodeSelection } from './higgsfieldNodeBinding'
import type { FalVideoTiming } from './videoTiming'
import type { FalJson, FalSchemaContract } from './falSchemaBinding'
import { reconcileFalInputValues, type FalInputRole, type FalMediaType, type FalRuntimeInputs } from './falRuntimeInputs'
import type { FalProductionFlow } from './falModelFlow'
export { editNativeInputValue as editFalNodeValue } from './nativeInputValue'

export interface FalNodeMediaBinding {
  key: string
  portId: string
  label: string
  type: FalMediaType
  role: FalInputRole
  multiple: boolean
  maximum?: number
  maximumBytes?: number
  required: boolean
  retired?: boolean
}
export interface FalNativeNodeState {
  endpointId: string
  label: string
  flow: FalProductionFlow
  values: Record<string, FalJson>
  /** Incomplete numeric/JSON edits survive focus changes and save/reopen. */
  drafts?: Record<string, string>
  fingerprint?: string
  timing?: FalVideoTiming
  fieldControls?: Record<string, string>
  reviewedFingerprint?: string
  promptField?: string | null
  media: FalNodeMediaBinding[]
  retiredPorts?: Array<{ id: string; label: string; signal: FalMediaType | 'text' | 'storyboard' | 'style' | 'mixed' }>
  repairs?: string[]
}

/** ASCII UTF-16 units preserve every JSON field key without CSS interpolation ambiguity. */
export function falFieldPortId(key: string): string {
  let encoded = ''
  for (let index = 0; index < key.length; index++) encoded += key.charCodeAt(index).toString(16).padStart(4, '0')
  return `fal-input-${encoded}`
}
const legacyRolePort: Partial<Record<FalInputRole, string>> = { 'start-frame': 'image-in', 'end-frame': 'end-image', 'source-image': 'image-in', 'source-video': 'video-in', 'reference-image': 'reference-in', 'reference-video': 'video-reference-in', 'reference-audio': 'audio-reference-in' }

export function falNodeMediaBindings(runtime: FalRuntimeInputs): FalNodeMediaBinding[] {
  const occupied = new Set<string>()
  return runtime.fields.flatMap(field => {
    if (!field.media || field.control !== 'media') return []
    const role = field.media.role || 'native-input'
    let portId = legacyRolePort[role] || falFieldPortId(field.key)
    if (occupied.has(portId)) portId = falFieldPortId(field.key)
    occupied.add(portId)
    return [{ key: field.key, portId, label: field.media.maximumBytes === undefined ? field.label : `${field.label} · Max ${field.media.maximumBytes / 1_000_000} MB`, type: field.media.type, role, multiple: field.media.multiple, required: field.required, ...(field.media.maximumBytes !== undefined ? { maximumBytes: field.media.maximumBytes } : {}), ...(field.media.maximum !== undefined ? { maximum: field.media.maximum } : {}) }]
  })
}

/** Compact data snapshot; the full schema stays in the owned ephemeral contract store. */
export function reconcileFalNodeBinding(state: FalNativeNodeState, contract: FalSchemaContract): FalNativeNodeState {
  if (state.endpointId !== contract.endpointId || !contract.runtime) throw new Error('Selected model contract identity changed.')
  const previous = { adapterRevision: '', fields: state.media.map(binding => ({ key: binding.key, media: { type: binding.type, role: binding.role, multiple: binding.multiple } })) } as FalRuntimeInputs
  // Structured values need the bounded main-process validator. Do not run
  // potentially multiplicative object/array alternatives on the UI thread.
  const primitiveValues = Object.fromEntries(Object.entries(state.values).filter(([, value]) => value === null || typeof value !== 'object'))
  const reconciled = reconcileFalInputValues(previous, contract.runtime, primitiveValues)
  reconciled.values = { ...reconciled.values, ...state.values }
  if (state.flow === 'video') reconciled.values = nativeVideoDefaults(contract.runtime.fields, state, reconciled.values, contract.runtime.timing?.kind === 'seconds' ? { duration: contract.runtime.timing.field } : {}, contract.runtime.fields.some(field => field.media?.role === 'source-video'))
  for (const field of contract.runtime.fields) if (!Object.prototype.hasOwnProperty.call(state.values, field.key)) {
    const value = reconciled.values[field.key]
    if (field.control === 'unsupported' || field.control === 'media' && (value === null || Array.isArray(value) && !value.length)) delete reconciled.values[field.key]
  }
  for (const key of Object.keys(state.values)) if (!contract.runtime.fields.some(field => field.key === key)) reconciled.repair.push(`${key} is no longer declared; its authored value is preserved for review.`)
  const media = falNodeMediaBindings(contract.runtime), repairs = [...reconciled.repair]
  if (state.fingerprint === contract.runtime.fingerprint) repairs.push(...state.repairs || [])
  for (const field of contract.runtime.fields) if (state.fieldControls?.[field.key] && state.fieldControls[field.key] !== field.control) repairs.push(`${field.label} changed its input type. Review its preserved value and connections.`)
  for (const old of state.media) {
    const next = media.find(binding => binding.key === old.key)
    if (!next) { media.push({ ...old, retired: true }); repairs.push(`${old.label} is no longer declared. Review its preserved connections.`) }
    else {
      // New semantic role knowledge must not orphan an existing physical edge
      // to the same unchanged provider field and media shape.
      if (old.type === next.type && old.multiple === next.multiple) next.portId = old.portId
      if (old.type !== next.type || old.role !== next.role || old.multiple !== next.multiple) repairs.push(`${old.label} changed its media binding. Review its connections.`)
    }
  }
  if (state.timing && JSON.stringify(state.timing) !== JSON.stringify(contract.runtime.timing)) repairs.push('The model timing field or unit changed. Review the preserved duration and Storyboard.')
  const promptField = state.promptField === null ? null : state.promptField || ['prompt', 'text'].find(key => contract.runtime!.fields.some(field => field.key === key && field.control === 'text'))
  if (promptField && !contract.runtime.fields.some(field => field.key === promptField && field.control === 'text')) repairs.push('The final prompt field changed. Review its preserved binding.')
  return { ...state, timing: contract.runtime.timing, values: reconciled.values, fingerprint: contract.runtime.fingerprint, promptField, media, fieldControls: Object.fromEntries(contract.runtime.fields.map(field => [field.key, field.control])), reviewedFingerprint: state.reviewedFingerprint === contract.runtime.fingerprint ? state.reviewedFingerprint : undefined, repairs: state.reviewedFingerprint === contract.runtime.fingerprint ? [] : [...new Set(repairs)] }
}

/** Field edits have one JSON owner; temporary invalid text never becomes zero or disappears. */
export function preserveFalNativeSelection(data: { falNative?: FalNativeNodeState; falNativePresets?: Record<string, FalNativeNodeState> } & HiggsfieldNodeSelection) {
  return { ...preserveHiggsfieldSelection(data), falNative: undefined, falNativePresets: { ...data.falNativePresets, ...(data.falNative ? { [data.falNative.endpointId]: data.falNative } : {}) } }
}
