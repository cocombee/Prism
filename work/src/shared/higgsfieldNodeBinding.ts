import { nativeVideoDefaults } from './nativeVideoDefaults'
import type { FalJson } from './falSchemaBinding'
import type { ConnectionSignal } from './nodeConnections'
import { higgsfieldContractRevision, higgsfieldInputSchema, higgsfieldModel } from './higgsfieldNative'
import { describeHiggsfieldInputContract, higgsfieldControlDefaults, type HiggsfieldInputContract, type HiggsfieldContractView, type HiggsfieldMediaBinding } from './higgsfieldInputContract'
import { reconcileFalInputValues, type FalRuntimeInputs } from './falRuntimeInputs'

/** Persist controls, UUID and retired sockets; media remain owned by the canvas graph. */
export interface HiggsfieldNodeState {
  endpointId: string
  label: string
  contractRevision: string
  values: Record<string, FalJson>
  drafts?: Record<string, string>
  fingerprint?: string
  reviewedFingerprint?: string
  media?: Array<HiggsfieldMediaBinding & { retired?: boolean }>
  fieldControls?: Record<string, string>
  repairs?: string[]
  allowSourceTrimming?: boolean
  retiredPorts?: Array<{ id: string; label: string; signal: ConnectionSignal }>
}
export interface HiggsfieldNodeSelection {
  higgsfieldNative?: HiggsfieldNodeState
  higgsfieldNativePresets?: Record<string, HiggsfieldNodeState>
}
export function preserveHiggsfieldSelection(data: HiggsfieldNodeSelection) {
  return { higgsfieldNative: undefined, higgsfieldNativePresets: { ...data.higgsfieldNativePresets, ...(data.higgsfieldNative ? { [data.higgsfieldNative.endpointId]: data.higgsfieldNative } : {}) } }
}
export function selectHiggsfieldBinding(data: HiggsfieldNodeSelection, endpointId: string, connectedPorts: Array<{ id: string; label: string; signal: ConnectionSignal }>) {
  const model = higgsfieldModel(endpointId)
  const saved = preserveHiggsfieldSelection(data)
  const contract = describeHiggsfieldInputContract(endpointId, higgsfieldInputSchema(endpointId), '')
  const state = structuredClone(data.higgsfieldNative?.endpointId === endpointId ? data.higgsfieldNative : saved.higgsfieldNativePresets[endpointId] || { endpointId, label: model.label, contractRevision: higgsfieldContractRevision(endpointId), values: model.kind === 'genjutsu' ? { resolution: '720p' } : {}, media: contract.media })
  const bindings: NonNullable<HiggsfieldNodeState['media']> = state.media || contract.media
  const active = new Set(['text-in', ...(model.kind === 'genjutsu' ? ['video-in', 'reference-in', 'character-in', 'element-in', 'location-in'] : ['style-in', ...(contract.timingScope !== 'source-video' ? ['storyboard-in'] : []), ...bindings.filter(binding => !binding.retired).map(binding => binding.portId), ...(bindings.some(binding => binding.role === 'reference-image' && !binding.retired) ? ['character-in', 'element-in', 'location-in'] : [])])])
  const retained = [...(state.retiredPorts || []), ...connectedPorts].filter(port => !active.has(port.id))
  return { ...saved, higgsfieldNative: { ...state, retiredPorts: [...new Map(retained.map(port => [port.id, port])).values()] } }
}

export function higgsfieldPresetReadinessFailures(state: HiggsfieldNodeState, view: { presets?: Array<{id:string}>; loading?: boolean; error?: string }): string[] {
  if (state.endpointId !== 'higgsfield/genjutsu/restyle/v1.0') return []
  if (view.error) return [view.error]
  if (view.loading || !view.presets) return ['load current Higgsfield style presets']
  return view.presets.some(preset => preset.id === state.values.preset_id) ? [] : ['select a current Higgsfield style preset; the saved UUID is preserved']
}

export function higgsfieldInputReadinessFailures(state: HiggsfieldNodeState, view: HiggsfieldContractView): string[] {
  try { if (higgsfieldModel(state.endpointId).kind === 'genjutsu') return [] }
  catch { return ['the saved Higgsfield route has no verified adapter; its values and connections are preserved'] }
  if (view.error) return [view.error]
  if (view.loading || !view.contract) return ['load current Higgsfield model inputs']
  const contract = view.contract
  if (contract.endpointId !== state.endpointId || contract.contractRevision !== state.contractRevision || contract.fingerprint !== state.fingerprint) return ['review the refreshed Higgsfield model inputs']
  return [...new Set([...contract.unsupportedInputs.map(item => item.reason), ...(state.repairs || []), ...Object.keys(state.drafts || {}).map(key => `finish the preserved ${key} edit`)])]
}

export function resetHiggsfieldBinding(state: HiggsfieldNodeState, contract?: HiggsfieldInputContract): HiggsfieldNodeState {
  let model: ReturnType<typeof higgsfieldModel>
  try { model = higgsfieldModel(state.endpointId) } catch { return state }
  if (contract && contract.endpointId !== state.endpointId) throw new Error('Selected Higgsfield input contract identity changed.')
  const current = contract || describeHiggsfieldInputContract(state.endpointId, higgsfieldInputSchema(state.endpointId), '')
  return { ...state, contractRevision: higgsfieldContractRevision(state.endpointId), values: model.kind === 'genjutsu' ? { resolution: '720p' } : nativeVideoDefaults(current.fields, { values: {} }, higgsfieldControlDefaults(current), {}, current.timingScope === 'source-video'), drafts: {}, repairs: [], reviewedFingerprint: undefined, ...(model.kind === 'genjutsu' ? { allowSourceTrimming: false } : {}) }
}

/** Current defaults fill only unauthored controls; saved values and retired sockets are never discarded. */
export function reconcileHiggsfieldNodeBinding(state: HiggsfieldNodeState, contract: HiggsfieldInputContract): HiggsfieldNodeState {
  if (state.endpointId !== contract.endpointId || state.contractRevision !== contract.contractRevision) throw new Error('Selected Higgsfield input contract identity changed. Preserve its saved values for review.')
  const controls = contract.fields.filter(field => field.key !== 'prompt' && field.control !== 'media' && field.control !== 'unsupported')
  const primitive = Object.fromEntries(Object.entries(state.values).filter(([, value]) => value === null || typeof value !== 'object'))
  const reconciled = reconcileFalInputValues(undefined, { adapterRevision: contract.contractRevision, fields: controls, unsupportedInputs: contract.unsupportedInputs } as FalRuntimeInputs, primitive)
  const values = nativeVideoDefaults(controls, state, { ...reconciled.values, ...structuredClone(state.values) }, {}, contract.timingScope === 'source-video')
  const repairs = [...reconciled.repair, ...contract.unsupportedInputs.map(item => item.reason)]
  for (const key of Object.keys(state.values)) if (!controls.some(field => field.key === key)) repairs.push(`${key} is no longer a native control; its authored value is preserved for review.`)
  for (const field of controls) if (state.fieldControls?.[field.key] && state.fieldControls[field.key] !== field.control) repairs.push(`${field.label} changed its input type. Review its preserved value.`)
  const media: NonNullable<HiggsfieldNodeState['media']> = structuredClone(contract.media)
  for (const old of state.media || []) {
    const next = media.find(binding => binding.key === old.key)
    if (!next) { media.push({ ...old, retired: true }); repairs.push(`${old.label} is no longer declared. Review its preserved connections.`) }
    else if (old.type !== next.type || old.role !== next.role || old.multiple !== next.multiple) repairs.push(`${old.label} changed its native media binding. Review its preserved connections.`)
  }
  if (state.fingerprint === contract.fingerprint) repairs.push(...state.repairs || [])
  return { ...state, values, media, fingerprint: contract.fingerprint, fieldControls: Object.fromEntries(controls.map(field => [field.key, field.control])), reviewedFingerprint: state.reviewedFingerprint === contract.fingerprint ? state.reviewedFingerprint : undefined, repairs: state.reviewedFingerprint === contract.fingerprint ? [] : [...new Set(repairs)] }
}
