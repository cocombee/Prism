import type { FalJson, FalSchemaNode } from './falSchemaBinding'
import { HIGGSFIELD_REFERENCE_VIDEO_MEDIA, higgsfieldReferenceVideoOmittedControls } from './higgsfieldReferenceVideo'
import { higgsfieldTextVideoOmittedControls } from './higgsfieldTextVideo'
import { describeFalRuntimeInputs, type FalRuntimeField } from './falRuntimeInputs'
import { higgsfieldContractRevision, higgsfieldInputSchema, higgsfieldModel, higgsfieldSourceOwnsTimeline } from './higgsfieldNative'

export interface HiggsfieldMediaBinding {
  key: string
  portId: string
  label: string
  type: 'image' | 'video' | 'audio'
  role: 'start-frame' | 'end-frame' | 'source-video' | 'reference-image' | 'reference-video' | 'reference-audio'
  multiple: boolean
  required: boolean
  maximum?: number
}
export interface HiggsfieldInputContract {
  endpointId: string
  contractRevision: string
  fingerprint: string
  input: FalSchemaNode
  fields: FalRuntimeField[]
  media: HiggsfieldMediaBinding[]
  timingScope: 'generated-clip' | 'generated-extension' | 'source-video'
  unsupportedInputs: Array<{ key: string; reason: string }>
}
export interface HiggsfieldContractView { contract?: HiggsfieldInputContract; loading?: boolean; error?: string }

const MEDIA: Record<string, Pick<HiggsfieldMediaBinding, 'type' | 'role' | 'multiple' | 'label'>> = {
  image_url: { type: 'image', role: 'start-frame', multiple: false, label: 'Starting Image' },
  end_image_url: { type: 'image', role: 'end-frame', multiple: false, label: 'Ending Image' },
  video_url: { type: 'video', role: 'source-video', multiple: false, label: 'Source Video' },
  image_urls: { type: 'image', role: 'reference-image', multiple: true, label: 'Image References' },
  video_urls: { type: 'video', role: 'reference-video', multiple: true, label: 'Video References' },
  audio_urls: { type: 'audio', role: 'reference-audio', multiple: true, label: 'Audio References' },
}
export const higgsfieldFieldPortId = (key: string) => `higgsfield-input::${key}`
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable)
  : value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, stable(child)])) : value
const same = (left: unknown, right: unknown) => JSON.stringify(stable(left)) === JSON.stringify(stable(right))

/** A UI projection of main-owned JSON Schema. It shares field widgets, never fal roles, transport or billing. */
export function describeHiggsfieldInputContract(endpointId: string, input: FalSchemaNode, fingerprint: string): HiggsfieldInputContract {
  const model = higgsfieldModel(endpointId), schema = structuredClone(input)
  // Prefix deliberately prevents fal's exact-endpoint role/capacity adapters from applying.
  const projection = describeFalRuntimeInputs({ endpointId: `higgsfield:${endpointId}`, schemaPath: `/${endpointId}`, input: schema, output: { type: 'object' } })
  const baseline = higgsfieldInputSchema(endpointId)
  // Reviewed main-prompt adapters omit unimplemented optional structured fields.
  // Their planners reject authored values for these keys before credentials.
  const omitted = new Set(model.kind==='text-video'?higgsfieldTextVideoOmittedControls(endpointId):model.kind==='reference-video'?higgsfieldReferenceVideoOmittedControls(endpointId):[])
  const unsupportedInputs = projection.unsupportedInputs.filter(item => item.key !== '$conditional' && !omitted.has(item.key))
  const conditional = (value: FalSchemaNode) => ({ if: value.if, then: value.then, else: value.else, anyOf: value.anyOf, oneOf: value.oneOf, allOf: value.allOf, not: value.not })
  // Some reviewed primary routes omit JSON Schema's closure flag. Their adapters
  // independently whitelist declared keys; omission never grants arbitrary input.
  const reviewedImplicitClosure = (model.kind === 'text-video' || model.kind === 'reference-video')
    && baseline.additionalProperties === undefined && schema.additionalProperties === undefined
  if (schema.type !== 'object' || (!reviewedImplicitClosure && schema.additionalProperties !== false) || !schema.properties) unsupportedInputs.push({ key: '$', reason: 'This native input shape needs a reviewed Higgsfield adapter.' })
  if (!same(conditional(schema), conditional(baseline))) unsupportedInputs.push({ key: '$conditional', reason: 'The native input alternatives changed. Review the preserved fields and bindings.' })
  const fields = projection.fields.filter(field=>!omitted.has(field.key)).map(field => {
    if(field.key==='prompt' && field.schema.type!=='string') {
      unsupportedInputs.push({key:field.key,reason:'The current prompt field needs a reviewed Higgsfield text adapter; authored text is preserved.'})
      return {...field,control:'unsupported' as const,media:undefined}
    }
    if(field.key==='output_format' && (field.schema.type!=='string'||!field.schema.enum?.length||field.schema.enum.some(value=>value!=='mp4'&&value!=='mov'))) {
      unsupportedInputs.push({key:field.key,reason:'The current output formats need a reviewed Higgsfield movie adapter; saved values are preserved.'})
      return {...field,control:'unsupported' as const,media:undefined}
    }
    const adapterMedia=model.kind==='reference-video'&&Object.hasOwn(HIGGSFIELD_REFERENCE_VIDEO_MEDIA,field.key)?HIGGSFIELD_REFERENCE_VIDEO_MEDIA[field.key]:undefined
    const known = adapterMedia ? {type:adapterMedia.type,role:adapterMedia.role,multiple:adapterMedia.array,label:adapterMedia.label} : Object.hasOwn(MEDIA,field.key) ? MEDIA[field.key] : undefined, expected = Object.hasOwn(baseline.properties || {},field.key) ? baseline.properties?.[field.key] : undefined
    if (known && expected) {
      const matches = known.multiple ? field.schema.type === 'array' && field.schema.items?.type === 'string' : field.schema.type === 'string'
      if (!matches) {
        unsupportedInputs.push({ key: field.key, reason: `${known.label} changed its native media shape. Preserve and review its connections.` })
        return { ...field, control: 'unsupported' as const, media: undefined }
      }
      return { ...field, label: known.label, control: 'media' as const, placement: 'primary' as const,
        media: { type: known.type, role: known.role, multiple: known.multiple, provenance: 'verified-adapter' as const,
          ...(field.schema.maxItems !== undefined ? { maximum: field.schema.maxItems } : {}) } }
    }
    // New URL fields do not acquire arbitrary physical or camera authority from their names.
    if (field.media || /(?:^|_)urls?$/.test(field.key) || field.schema.format === 'uri') {
      unsupportedInputs.push({ key: field.key, reason: `${field.label} needs a verified Higgsfield media binding.` })
      return { ...field, control: 'unsupported' as const, media: undefined }
    }
    return field
  })
  for (const key of baseline.required || []) if (!schema.properties?.[key]) unsupportedInputs.push({ key, reason: `The required native ${key} input changed. Review its adapter.` })
  const media = fields.flatMap(field => field.control === 'media' && field.media ? [{
    key: field.key, portId: model.kind === 'genjutsu' ? field.key === 'video_url' ? 'video-in' : 'reference-in' : higgsfieldFieldPortId(field.key),
    label: field.label, type: field.media.type, role: field.media.role as HiggsfieldMediaBinding['role'], multiple: field.media.multiple,
    required: field.required, ...(field.media.maximum !== undefined ? { maximum: field.media.maximum } : {}),
  }] : [])
  return { endpointId, contractRevision: higgsfieldContractRevision(endpointId), fingerprint, input: schema, fields, media,
    timingScope: higgsfieldSourceOwnsTimeline(endpointId) ? 'source-video' : endpointId.endsWith('/video-extend') ? 'generated-extension' : 'generated-clip', unsupportedInputs }
}

/** Stable identity covers schema and local role/control policy. Only main assigns its digest. */
export function higgsfieldInputFingerprintMaterial(endpointId: string, input: FalSchemaNode): string {
  const contract = describeHiggsfieldInputContract(endpointId, input, '')
  return JSON.stringify(stable(contract))
}
export function higgsfieldControlDefaults(contract: HiggsfieldInputContract): Record<string, FalJson> {
  return Object.fromEntries(contract.fields.filter(field => field.key !== 'prompt' && field.control !== 'media' && field.control !== 'unsupported' && Object.hasOwn(field.schema, 'default')).map(field => [field.key, structuredClone(field.schema.default!)]))
}
