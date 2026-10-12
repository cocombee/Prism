import reviewedMedia from './falReviewedMediaFields.json'
import { falProductionFlow } from './falModelFlow'
import { inferFalVideoTiming, type FalVideoTiming } from './videoTiming'
import { validateFalSchema } from './falSchemaBinding'
import type { FalJson, FalSchemaContract, FalSchemaNode } from './falSchemaBinding'

export type FalMediaType = 'image' | 'video' | 'audio'
export type FalInputRole = 'native-input' | 'start-frame' | 'end-frame' | 'source-image' | 'source-video' | 'reference-image' | 'reference-video' | 'reference-audio'
export interface FalRuntimeField {
  key: string
  label: string
  schema: FalSchemaNode
  required: boolean
  nullable: boolean
  control: 'text' | 'number' | 'boolean' | 'choice' | 'json' | 'media' | 'unsupported'
  placement: 'primary' | 'advanced'
  choices?: FalJson[]
  media?: { type: FalMediaType; role?: FalInputRole; multiple: boolean; maximum?: number; maximumBytes?: number; provenance: 'provider-annotation' | 'verified-adapter' }
}
export interface FalRuntimeInputs {
  adapterRevision: string
  timing?: FalVideoTiming
  fields: FalRuntimeField[]
  unsupportedInputs: Array<{ key: string; reason: string }>
  capacity?: { images: number; videos: number; audios: number; total: number; keys?: string[]; source: string; verifiedAt: string }
}
export const FAL_INPUT_ADAPTER_REVISION = 'prism-fal-inputs-2026-10-11-v3'
const owned = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Exact verified fields only. Descriptions, filenames and model-name guesses never authorize media roles. */
function verifiedFields(endpointId: string): Record<string, { type: FalMediaType; role: FalInputRole; maximum?: number; multiple?: boolean }> {
  if (endpointId === 'bytedance/seedance-2.5/image-to-video') return {
    image_url: { type: 'image', role: 'start-frame' }, end_image_url: { type: 'image', role: 'end-frame' },
  }
  if (endpointId === 'bytedance/seedance-2.5/reference-to-video') return {
    image_urls: { type: 'image', role: 'reference-image', maximum: 30 },
    video_urls: { type: 'video', role: 'reference-video', maximum: 10 },
    audio_urls: { type: 'audio', role: 'reference-audio', maximum: 10 },
  }
  // Exact fields from the captured public utility contracts. They are audio
  // inputs only and gain no Character/camera/reference authority.
  if (endpointId === 'fal-ai/workflow-utilities/audio-compressor') return {
    audio_url: { type: 'audio', role: 'native-input' },
  }
  if (endpointId === 'fal-ai/workflow-utilities/impulse-response') return {
    audio_url: { type: 'audio', role: 'native-input' }, impulse_response_url: { type: 'audio', role: 'native-input' },
  }
  return Object.hasOwn(reviewedMedia.models, endpointId) ? reviewedMedia.models[endpointId as keyof typeof reviewedMedia.models] as Record<string, {type:FalMediaType;role:FalInputRole;maximum?:number;multiple?:boolean}> : {}
}

/** Presentation projection only: the original schema still owns validation, including all alternatives. */
function layers(schema: FalSchemaNode): FalSchemaNode[] {
  const nonNull = (schema.anyOf || []).filter(item => item.type !== 'null')
  const selected = schema.anyOf && nonNull.length === 1 && schema.anyOf.some(item => item.type === 'null') ? nonNull[0] : undefined
  return [schema, ...(selected ? layers(selected) : []), ...(schema.allOf || []).flatMap(layers)]
}
function unambiguous<T>(values: Array<T | undefined>): T | undefined {
  const defined = values.filter((value): value is T => value !== undefined)
  return defined.length && defined.every(value => JSON.stringify(value) === JSON.stringify(defined[0])) ? defined[0] : undefined
}
function objectFields(schema: FalSchemaNode): { properties: Record<string, FalSchemaNode>; required: Set<string>; order: string[] } {
  const properties: Record<string, FalSchemaNode> = {}, required = new Set<string>(), order: string[] = []
  for (const layer of layers(schema)) {
    for (const key of layer.required || []) required.add(key)
    for (const key of layer.propertyOrder || []) if (!order.includes(key)) order.push(key)
    for (const [key, child] of Object.entries(layer.properties || {})) {
      properties[key] = properties[key] ? { allOf: [properties[key], child] } : child
      if (!order.includes(key)) order.push(key)
    }
  }
  return { properties, required, order }
}

export function describeFalRuntimeInputs(contract: FalSchemaContract): FalRuntimeInputs {
  const { properties, required, order } = objectFields(contract.input), rules = verifiedFields(contract.endpointId)
  const unsupportedInputs: FalRuntimeInputs['unsupportedInputs'] = []
  if (layers(contract.input).some(layer => layer.if !== undefined)) unsupportedInputs.push({ key: '$conditional', reason: 'Conditional root inputs require a reviewed control and media-binding adapter; the full schema is preserved for validation.' })
  const fields: FalRuntimeField[] = order.filter(key => owned(properties, key)).map(key => {
    const schema = properties[key], projection = layers(schema)
    const type = unambiguous(projection.map(item => item.type))
    const items = unambiguous(projection.map(item => item.items))
    const annotation = unambiguous([...projection, ...(items ? layers(items) : [])].map(item => item.uiField))
    const rule = rules[key]
    const annotatedType = annotation && ['image', 'video', 'audio'].includes(annotation) ? annotation as FalMediaType : undefined
    const declaredType = rule?.type || annotatedType
    const multiple = type === 'array'
    const scalarType = multiple && items ? unambiguous(layers(items).map(item => item.type)) : type
    const choices = unambiguous(projection.map(item => item.enum))
    const maxima = projection.flatMap(item => item.maxItems === undefined ? [] : [item.maxItems])
    const schemaMaximum = maxima.length ? Math.min(...maxima) : undefined
    const fileLimits = [...projection, ...(items ? layers(items) : [])].flatMap(item => item.maxFileSize === undefined ? [] : [item.maxFileSize])
    const maximumBytes = fileLimits.length ? Math.min(...fileLimits) : undefined
    const field: FalRuntimeField = { key, label: projection.find(item => item.title)?.title || key.replace(/_/g, ' '), schema,
      required: required.has(key), nullable: projection.some(item => item.type === 'null' || item.anyOf?.some(child => child.type === 'null')),
      control: choices ? 'choice' : type === 'boolean' ? 'boolean' : type === 'number' || type === 'integer' ? 'number' : type === 'string' ? 'text' : 'json',
      placement: ['prompt', 'text', 'voice', 'voice_id', 'stability', 'similarity_boost', 'aspect_ratio', 'duration', 'resolution', 'fps', 'num_images'].includes(key) || declaredType ? 'primary' : 'advanced',
      ...(choices ? { choices } : {}) }
    if (annotation && !annotatedType) {
      field.control = 'unsupported'; unsupportedInputs.push({ key, reason: `Input type ${annotation} needs a supported Prism adapter.` })
    } else if (declaredType) {
      if (annotation && rule && annotatedType !== rule.type || scalarType !== 'string' || rule?.multiple !== undefined && rule.multiple !== multiple) {
        field.control = 'unsupported'; unsupportedInputs.push({ key, reason: 'Media field shape/type differs from its verified binding; review its adapter.' })
      } else {
        field.control = 'media'
        field.media = { type: declaredType, role: rule?.role || 'native-input', multiple,
          ...(schemaMaximum !== undefined || rule?.maximum !== undefined ? { maximum: schemaMaximum ?? rule?.maximum } : {}),
          ...(maximumBytes !== undefined ? { maximumBytes } : {}),
          provenance: rule ? 'verified-adapter' : 'provider-annotation' }
        // A declared native input binds only this exact field; it inherits no camera/appearance authority.
      }
    }
    if (maximumBytes !== undefined && !field.media) {
      field.control = 'unsupported'; unsupportedInputs.push({ key, reason: 'This file-size limit needs a verified native media binding.' })
    }
    return field
  })
  if (!fields.length && (contract.input.type !== 'object' || contract.input.additionalProperties)) unsupportedInputs.push({ key: '$', reason: 'The root input needs a supported structured adapter.' })
  const timing = falProductionFlow(contract.category) === 'video' ? inferFalVideoTiming(fields, true) : undefined
  if (timing) for (const field of fields) if (timing.kind === 'seconds' ? field.key === timing.field : [timing.framesField, timing.fpsField].includes(field.key)) field.placement = 'primary'
  const referenceKeys = contract.endpointId === 'bytedance/seedance-2.0/us/reference-to-video' ? ['image_urls','video_urls','audio_urls']
    : contract.endpointId === 'minimax/h3-max/reference-to-video' ? ['reference_image_urls','reference_video_urls','reference_audio_urls'] : undefined
  const reviewedCapacity = referenceKeys ? { images: fields.find(field => field.key === referenceKeys[0])?.media?.maximum ?? 9, videos: fields.find(field => field.key === referenceKeys[1])?.media?.maximum ?? 3, audios: fields.find(field => field.key === referenceKeys[2])?.media?.maximum ?? 3, total:12, keys:referenceKeys, source:`https://fal.ai/models/${contract.endpointId}/api`,verifiedAt:'2026-10-11' } : undefined
  return { adapterRevision: FAL_INPUT_ADAPTER_REVISION, fields, unsupportedInputs, ...(timing ? { timing } : {}), ...(reviewedCapacity ? {capacity:reviewedCapacity} : {}),
    ...(contract.endpointId === 'bytedance/seedance-2.5/reference-to-video' ? { capacity: { images: fields.find(field => field.key === 'image_urls')?.media?.maximum ?? 30, videos: fields.find(field => field.key === 'video_urls')?.media?.maximum ?? 10, audios: fields.find(field => field.key === 'audio_urls')?.media?.maximum ?? 10, total: 50,
      source: 'https://fal.ai/models/bytedance/seedance-2.5/reference-to-video/api', verifiedAt: '2026-10-09' } } : {}) }
}

/** Preserve authored values across refresh. Incompatible fields require repair rather than being dropped/coerced. */
export function reconcileFalInputValues(previous: FalRuntimeInputs | undefined, next: FalRuntimeInputs, authored: Record<string, FalJson>): { values: Record<string, FalJson>; repair: string[] } {
  const values = clone(authored), repair: string[] = []
  const fields = new Map(next.fields.map(field => [field.key, field]))
  for (const [key] of Object.entries(authored)) if (!fields.has(key)) repair.push(`${key} is no longer declared; its authored value is preserved for review.`)
  for (const field of previous?.fields || []) {
    const current = fields.get(field.key)
    if (current && owned(authored, field.key) && JSON.stringify(field.media ? [field.media.type, field.media.role, field.media.multiple] : null) !== JSON.stringify(current.media ? [current.media.type, current.media.role, current.media.multiple] : null)) repair.push(`${field.key} changed its media binding; review the preserved value and connections.`)
  }
  for (const field of next.fields) if (!owned(values, field.key)) {
    const defaults = layers(field.schema).filter(item => owned(item, 'default')).map(item => item.default)
    const value = unambiguous(defaults)
    if (value !== undefined) values[field.key] = clone(value)
  }
  for (const field of next.fields) if (owned(authored, field.key)) {
    try { validateFalSchema(field.schema, authored[field.key], field.key) }
    catch (error) { repair.push(error instanceof Error ? error.message : `${field.key} needs input validation.`) }
  }
  return { values, repair: [...new Set(repair)] }
}


/** Stable data-only identity includes input/output and our role/capacity policy. */
export function falRuntimeFingerprintMaterial(contract: FalSchemaContract, runtime: FalRuntimeInputs): string {
  const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable)
    : value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, stable(item)])) : value
  return JSON.stringify(stable({ endpointId: contract.endpointId, schemaPath: contract.schemaPath, category: contract.category, input: contract.input, output: contract.output, runtime }))
}
