import routes from './fixtures/higgsfieldReferenceVideoRoutes.json'
import schemas from './fixtures/higgsfieldReferenceVideoSchemas.json'
import { validateFalSchema, type FalJson, type FalSchemaNode } from './falSchemaBinding'
import { assertHiggsfieldPublicUrl } from './higgsfieldPublicUrl'
import type { HiggsfieldNativeRequest } from './higgsfieldNative'

/** Input adapter only. Route admission remains owned by the native catalog. */
export const HIGGSFIELD_REFERENCE_VIDEO_REVISION = 'prism-higgsfield-reference-video-inputs-2026-10-11-v1'

export type HiggsfieldReferenceVideoMediaType = 'image' | 'video' | 'audio'
export type HiggsfieldReferenceVideoMediaRole = 'start-frame' | 'end-frame' | 'reference-image' | 'reference-video' | 'reference-audio'
export type HiggsfieldReferenceVideoSource = HiggsfieldNativeRequest['media'][string][number]

export interface HiggsfieldReferenceVideoMediaBinding {
  type: HiggsfieldReferenceVideoMediaType
  array: boolean
  role: HiggsfieldReferenceVideoMediaRole
  label: string
}

export const HIGGSFIELD_REFERENCE_VIDEO_MEDIA: Readonly<Record<string, HiggsfieldReferenceVideoMediaBinding>> = Object.freeze({
  audio_url: Object.freeze({ type: 'audio', array: false, role: 'reference-audio', label: 'Audio reference' }),
  first_frame_url: Object.freeze({ type: 'image', array: false, role: 'start-frame', label: 'Start frame' }),
  last_frame_url: Object.freeze({ type: 'image', array: false, role: 'end-frame', label: 'End frame' }),
  image_url: Object.freeze({ type: 'image', array: false, role: 'start-frame', label: 'Start frame' }),
  end_image_url: Object.freeze({ type: 'image', array: false, role: 'end-frame', label: 'End frame' }),
  last_image_url: Object.freeze({ type: 'image', array: false, role: 'end-frame', label: 'End frame' }),
  image_urls: Object.freeze({ type: 'image', array: true, role: 'reference-image', label: 'Image references' }),
  video_urls: Object.freeze({ type: 'video', array: true, role: 'reference-video', label: 'Video references' }),
  audio_urls: Object.freeze({ type: 'audio', array: true, role: 'reference-audio', label: 'Audio references' }),
})

const fixture = routes as Readonly<Record<string, {
  label: string; company: string; release: string; media: readonly string[]; omittedControls: readonly string[]
}>>
type HiggsfieldReferenceVideoEndpoint = string
const routeMedia = Object.freeze(Object.fromEntries(Object.entries(fixture).map(([id, row]) => [id, Object.freeze([...row.media])])))
const omittedStructuredControls = Object.freeze(Object.fromEntries(Object.entries(fixture).map(([id, row]) => [id, Object.freeze([...row.omittedControls])])))
const registry = Object.freeze(Object.fromEntries(Object.entries(fixture).map(([id, row]) => [id, Object.freeze({
  kind: 'reference-video' as const, id, label: row.label, company: row.company, release: row.release,
})])))

export const HIGGSFIELD_REFERENCE_VIDEO_MODELS = Object.freeze(Object.values(registry))

const owns = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const clone = <T>(value: T): T => structuredClone(value)

function freezeDeep<T>(value: T): T {
  const pending: unknown[] = [value], seen = new WeakSet<object>()
  while (pending.length) {
    const item = pending.pop()
    if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item)
      for (const child of Object.values(item)) pending.push(child)
      Object.freeze(item)
    }
  }
  return value
}

function assertJson(value: unknown, path: string, depth = 0, budget = { nodes: 0 }, seen = new WeakSet<object>()): asserts value is FalJson {
  if (depth > 32 || ++budget.nodes > 100_000) throw new Error(`${path} exceeds Prism’s supported input complexity.`)
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (!value || typeof value !== 'object' || !Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${path} must contain finite JSON values; authored values were preserved.`)
  if (seen.has(value)) throw new Error(`${path} must not contain circular values; authored values were preserved.`)
  seen.add(value)
  const entries = Array.isArray(value) ? value.map((child, index) => [String(index), child] as const) : Object.entries(value)
  for (const [key, child] of entries) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error(`${path} contains an unsupported field; authored values were preserved.`)
    assertJson(child, `${path}.${key}`, depth + 1, budget, seen)
  }
  seen.delete(value)
}

function requireModel(endpointId: string): HiggsfieldReferenceVideoEndpoint {
  if (!owns(registry, endpointId)) throw new Error('This Higgsfield Reference route has no verified input adapter. Its saved selection was preserved.')
  return endpointId as HiggsfieldReferenceVideoEndpoint
}

export function higgsfieldReferenceVideoSchema(endpointId: string): FalSchemaNode {
  const id = requireModel(endpointId)
  return clone((schemas as unknown as Record<string, FalSchemaNode>)[id])
}

/** Baseline structured controls with no Reference UI or semantics in Prism. */
export function higgsfieldReferenceVideoOmittedControls(endpointId: string): readonly string[] {
  return omittedStructuredControls[requireModel(endpointId)]
}

function routeMediaBinding(endpointId: string, key: string): HiggsfieldReferenceVideoMediaBinding | undefined {
  if (!(routeMedia[endpointId as HiggsfieldReferenceVideoEndpoint] as readonly string[]).includes(key)) return undefined
  return HIGGSFIELD_REFERENCE_VIDEO_MEDIA[key]
}

function mediaShapeMatches(field: FalSchemaNode | undefined, binding: HiggsfieldReferenceVideoMediaBinding): boolean {
  return binding.array
    ? field?.type === 'array' && field.items?.type === 'string'
    : field?.type === 'string'
}

function mediaLike(key: string): boolean { return /(?:^|_)urls?$/i.test(key) }

function hasUriSchema(schema: FalSchemaNode, depth = 0): boolean {
  if (depth > 32) throw new Error('The current Higgsfield schema exceeds Prism’s supported input complexity.')
  if (schema.format === 'uri') return true
  if (Object.values(schema.properties || {}).some(child => hasUriSchema(child, depth + 1))) return true
  if (schema.items && hasUriSchema(schema.items, depth + 1)) return true
  for (const key of ['if', 'then', 'else', 'not'] as const) if (schema[key] && hasUriSchema(schema[key]!, depth + 1)) return true
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) if (schema[key]?.some(child => hasUriSchema(child, depth + 1))) return true
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object' && hasUriSchema(schema.additionalProperties, depth + 1)) return true
  return false
}

function containsStructuredSchema(schema: FalSchemaNode, depth = 0): boolean {
  if (depth > 32) throw new Error('The current Higgsfield schema exceeds Prism’s supported input complexity.')
  if (schema.type === 'object' || schema.type === 'array' || schema.properties || schema.items) return true
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) if (schema[key]?.some(child => containsStructuredSchema(child, depth + 1))) return true
  for (const key of ['if', 'then', 'else', 'not'] as const) if (schema[key] && containsStructuredSchema(schema[key]!, depth + 1)) return true
  return false
}

function canonicalSchemaShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalSchemaShape)
  if (!record(value)) return value
  const ignoredMetadata = new Set(['title', 'description', 'default', 'examples', 'example', 'deprecated'])
  return Object.fromEntries(Object.keys(value).sort().filter(key => !ignoredMetadata.has(key)).map(key => [key, canonicalSchemaShape(value[key])]))
}

function equalSchemaShape(left: FalSchemaNode, right: FalSchemaNode): boolean {
  return JSON.stringify(canonicalSchemaShape(left)) === JSON.stringify(canonicalSchemaShape(right))
}

function assertNoUnboundUriSchema(endpointId: string, schema: FalSchemaNode): void {
  const visit = (node: FalSchemaNode, dataPath: string[] = [], depth = 0): void => {
    if (depth > 32) throw new Error('The current Higgsfield schema exceeds Prism’s supported input complexity.')
    const root = dataPath[0]
    const binding = root ? routeMediaBinding(endpointId, root) : undefined
    const allowedUri = Boolean(binding && (dataPath.length === 1 && !binding.array || dataPath.length === 2 && dataPath[1] === '[]' && binding.array))
    if (node.format === 'uri' && !allowedUri) throw new Error(`The current ${endpointId} schema adds an unbound media URI. Review this route before generating.`)
    for (const [key, child] of Object.entries(node.properties || {})) {
      const next = [...dataPath, key]
      if (dataPath.length === 0 && ['file_url', 'link_url'].includes(key) && omittedStructuredControls[endpointId].includes(key)) continue
      if (mediaLike(key) && (!routeMediaBinding(endpointId, key) || dataPath.length > 0)) throw new Error(`The current ${endpointId} schema adds an unbound media field ${key}. Review this route before generating.`)
      visit(child, next, depth + 1)
    }
    if (node.items) visit(node.items, [...dataPath, '[]'], depth + 1)
    for (const key of ['if', 'then', 'else', 'not'] as const) if (node[key]) visit(node[key]!, dataPath, depth + 1)
    for (const key of ['anyOf', 'oneOf', 'allOf'] as const) for (const child of node[key] || []) visit(child, dataPath, depth + 1)
    if (node.additionalProperties && typeof node.additionalProperties === 'object') visit(node.additionalProperties, dataPath, depth + 1)
  }
  visit(schema)
}

function assertCurrentSchema(endpointId: string, schema: FalSchemaNode): void {
  if (!record(schema) || schema.type !== 'object' || !record(schema.properties)) throw new Error(`The current ${endpointId} input schema is not a supported object. Review its saved inputs.`)
  const id = requireModel(endpointId), properties = schema.properties as Record<string, FalSchemaNode>
  const baseline = higgsfieldReferenceVideoSchema(endpointId)
  for (const required of baseline.required || []) if (!owns(properties, required)) throw new Error(`The current ${endpointId} schema removed required input ${required}. Review the saved bindings.`)
  const omitted = omittedStructuredControls[id]
  for (const key of omitted.filter(key => ['file_url', 'link_url'].includes(key))) {
    const original = baseline.properties?.[key], current = properties[key]
    if (current && (!original || !equalSchemaShape(original, current))) throw new Error(`The current ${endpointId} omitted control ${key} changed shape. Review this route before generating.`)
    if ((schema.required as string[] | undefined)?.includes(key)) throw new Error(`The current ${endpointId} requires unsupported ${key}. Review this route before generating.`)
  }
  assertNoUnboundUriSchema(id, schema)
  for (const required of (schema.required as string[] | undefined) || []) if (omitted.includes(required)) throw new Error(`The current ${endpointId} schema requires unsupported structured control ${required}. Review this route before generating.`)
  for (const [key, field] of Object.entries(properties)) {
    if (omitted.includes(key)) {
      const original = baseline.properties?.[key]
      if (!original || !equalSchemaShape(original, field)) throw new Error(`The current ${endpointId} structured control ${key} changed shape. Review this route before generating.`)
      continue
    }
    if (routeMediaBinding(id, key)) continue
    const original = baseline.properties?.[key]
    if (containsStructuredSchema(field) && (!original || !containsStructuredSchema(original))) {
      const detail = original ? `control ${key} changed to an unsupported structured shape` : `schema adds unsupported structured control ${key}`
      throw new Error(`The current ${endpointId} ${detail}. Review this route before generating.`)
    }
  }
  for (const key of routeMedia[id]) {
    const current = properties[key]
    if (!current) continue
    const binding = HIGGSFIELD_REFERENCE_VIDEO_MEDIA[key]
    if (!mediaShapeMatches(current, binding)) throw new Error(`The current ${endpointId} ${binding.label.toLowerCase()} media shape changed. Its saved connections were preserved.`)
  }
}

export interface HiggsfieldReferenceVideoField {
  key: string
  schema: FalSchemaNode
  required: boolean
  media?: HiggsfieldReferenceVideoMediaBinding
  unsupportedReason?: string
}

export function higgsfieldReferenceVideoFields(endpointId: string, inputSchema?: FalSchemaNode): HiggsfieldReferenceVideoField[] {
  const id = requireModel(endpointId), schema = inputSchema ? clone(inputSchema) : higgsfieldReferenceVideoSchema(id)
  if (!record(schema.properties)) throw new Error(`The current ${id} schema has no readable fields. Review this model before generating.`)
  const properties = schema.properties as Record<string, FalSchemaNode>
  return Object.entries(properties).flatMap(([key, field]): HiggsfieldReferenceVideoField[] => {
    if (omittedStructuredControls[id].includes(key)) return []
    const binding = routeMediaBinding(id, key)
    if (binding) return mediaShapeMatches(field, binding)
      ? [{ key, schema: clone(field), required: schema.required?.includes(key) || false, media: clone(binding) }]
      : [{ key, schema: clone(field), required: schema.required?.includes(key) || false, unsupportedReason: `${binding.label} changed shape; preserve and review this connection.` }]
    if (mediaLike(key) || hasUriSchema(field)) return [{ key, schema: clone(field), required: schema.required?.includes(key) || false, unsupportedReason: `${key} needs a reviewed Reference media binding; its saved input was preserved.` }]
    if (containsStructuredSchema(field)) return [{ key, schema: clone(field), required: schema.required?.includes(key) || false, unsupportedReason: `${key} is an unsupported structured control; its saved input was preserved.` }]
    return [{ key, schema: clone(field), required: schema.required?.includes(key) || false }]
  })
}

export interface HiggsfieldReferenceVideoSlot {
  field: string
  index: number
  source: HiggsfieldReferenceVideoSource
  type: HiggsfieldReferenceVideoMediaType
  role: HiggsfieldReferenceVideoMediaRole
}

export interface HiggsfieldReferenceVideoInputPlan {
  kind: 'reference-video'
  endpointId: string
  contractRevision: string
  values: Record<string, FalJson>
  slots: HiggsfieldReferenceVideoSlot[]
  /** Shape-only preview. Placeholder URLs never reach provider submission. */
  preview: Record<string, FalJson>
  schema: FalSchemaNode
  /** Supplied separately by trusted main; renderer metadata cannot substitute it. */
  inputSchema?: FalSchemaNode
  fingerprint?: string
}

function isNativeRequest(value: unknown): value is HiggsfieldNativeRequest {
  return record(value) && !Object.keys(value).some(key => !['endpointId', 'contractRevision', 'values', 'media', 'allowSourceTrimming', 'fingerprint'].includes(key))
}

function assemble(plan: Pick<HiggsfieldReferenceVideoInputPlan, 'endpointId' | 'values' | 'slots' | 'schema' | 'inputSchema'>, urls: string[]): Record<string, FalJson> {
  if (urls.length !== plan.slots.length) throw new Error('Higgsfield Reference media slot count changed during preparation.')
  const input = clone(plan.values), grouped = new Map<string, string[]>()
  for (const [index, slot] of plan.slots.entries()) {
    assertHiggsfieldPublicUrl(urls[index])
    const current = grouped.get(slot.field) || []
    if (slot.index !== current.length) throw new Error('Higgsfield Reference media slot order changed during preparation.')
    current.push(urls[index]); grouped.set(slot.field, current)
  }
  for (const [field, entries] of grouped) {
    const binding = HIGGSFIELD_REFERENCE_VIDEO_MEDIA[field]
    input[field] = binding.array ? [...entries] : entries[0]
  }
  if (plan.inputSchema) validateFalSchema(plan.inputSchema, input)
  return input
}

/** Capture the immutable renderer body. If a digest is present but main has not
 * supplied its schema yet, preserve the baseline shape only; the executor must
 * bind the fresh schema and validate it before credentials or media work. */
export function planHiggsfieldReferenceVideoInput(request: HiggsfieldNativeRequest, inputSchema?: FalSchemaNode): HiggsfieldReferenceVideoInputPlan {
  if (!isNativeRequest(request)) throw new Error('Higgsfield Reference has an unsupported request field; preserve the saved values and review the model.')
  const endpointId = requireModel(request.endpointId)
  if (request.contractRevision !== HIGGSFIELD_REFERENCE_VIDEO_REVISION) throw new Error('Higgsfield Reference contract revision changed. Review the preserved model inputs.')
  if (request.allowSourceTrimming !== undefined) throw new Error('Reference routes do not accept Genjutsu source-trimming consent; the saved request was preserved.')
  if (request.fingerprint !== undefined && (typeof request.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(request.fingerprint))) throw new Error('Load and review the current Higgsfield Reference model inputs before generating.')
  if (!record(request.values) || !record(request.media)) throw new Error('Review Higgsfield Reference controls and media bindings.')
  for (const key of omittedStructuredControls[endpointId]) if (owns(request.values, key)) throw new Error(`The saved ${endpointId} ${['file_url','link_url'].includes(key) ? 'document/web input' : 'structured control'} ${key} is not implemented in Prism Reference; its authored value was preserved for review.`)
  assertJson(request.values, 'Higgsfield Reference controls')
  const currentOwned = inputSchema !== undefined
  const schema = inputSchema ? clone(inputSchema) : higgsfieldReferenceVideoSchema(endpointId)
  if (currentOwned) assertCurrentSchema(endpointId, schema)
  const properties = schema.properties || {}, baselineProperties = higgsfieldReferenceVideoSchema(endpointId).properties || {}, values: Record<string, FalJson> = {}, slots: HiggsfieldReferenceVideoSlot[] = []
  const routeFields = routeMedia[endpointId] as readonly string[]
  for (const key of Object.keys(request.media)) {
    if (!routeFields.includes(key) || !owns(properties, key)) throw new Error(`The selected Higgsfield Reference route does not accept media binding ${key}; its saved connection was preserved.`)
    if (!Array.isArray(request.media[key])) throw new Error(`Higgsfield Reference ${key} must retain an ordered media list.`)
  }
  for (const [key, value] of Object.entries(request.values)) {
    if ((inputSchema || !request.fingerprint) && !owns(properties, key) || Object.hasOwn(HIGGSFIELD_REFERENCE_VIDEO_MEDIA, key)) throw new Error(`The selected Higgsfield Reference route does not accept saved control ${key}; its authored value was preserved.`)
    values[key] = clone(value as FalJson)
  }
  for (const key of routeFields) {
    const sources = owns(request.media, key) ? request.media[key] : []
    const binding = HIGGSFIELD_REFERENCE_VIDEO_MEDIA[key]
    if (!Array.isArray(sources) || !binding.array && sources.length > 1) throw new Error(`Higgsfield Reference ${binding.label.toLowerCase()} needs ${binding.array ? 'an ordered media list' : 'at most one source'}.`)
    const fieldSchema = properties[key]
    if (sources.length && (!fieldSchema || !owns(baselineProperties, key))) throw new Error(`The selected Higgsfield Reference route no longer declares ${key}; its connection was preserved.`)
    if (fieldSchema?.type === 'array' && fieldSchema.maxItems !== undefined && sources.length > fieldSchema.maxItems) throw new Error(`Higgsfield Reference ${binding.label.toLowerCase()} exceeds its current schema item count.`)
    for (const [index, source] of sources.entries()) {
      if (!record(source) || Object.keys(source).some(field => !['path', 'url', 'mediaType'].includes(field)) || source.mediaType !== binding.type || Boolean(source.path) === Boolean(source.url) || source.path !== undefined && (typeof source.path !== 'string' || !source.path) || source.url !== undefined && (typeof source.url !== 'string' || !source.url)) throw new Error(`Higgsfield Reference ${binding.label.toLowerCase()} needs bound ${binding.type} media with exactly one transport.`)
      if (source.url) assertHiggsfieldPublicUrl(source.url)
      slots.push({ field: key, index, source: clone(source as HiggsfieldReferenceVideoSource), type: binding.type, role: binding.role })
    }
  }
  // Only defaults from the trusted current schema enter a generation snapshot.
  if (inputSchema) {
    for (const [key, field] of Object.entries(properties)) if (!Object.hasOwn(HIGGSFIELD_REFERENCE_VIDEO_MEDIA, key) && !omittedStructuredControls[endpointId].includes(key) && !owns(values, key) && owns(field, 'default')) values[key] = clone(field.default!)
  } else if (!request.fingerprint) {
    for (const [key, field] of Object.entries(properties)) if (!Object.hasOwn(HIGGSFIELD_REFERENCE_VIDEO_MEDIA, key) && !omittedStructuredControls[endpointId].includes(key) && !owns(values, key) && owns(field, 'default')) values[key] = clone(field.default!)
  }
  const preview = assemble({ endpointId, values, slots, schema, ...(inputSchema ? { inputSchema } : {}) }, slots.map((slot, index) => slot.source.url || `https://media.prism.example/reference-${index}`))
  if (!inputSchema && !request.fingerprint) validateFalSchema(schema, preview)
  return freezeDeep({
    kind: 'reference-video' as const,
    endpointId,
    contractRevision: request.contractRevision,
    values,
    slots,
    preview,
    schema,
    ...(inputSchema ? { inputSchema: clone(inputSchema) } : {}),
    ...(request.fingerprint !== undefined ? { fingerprint: request.fingerprint } : {}),
  })
}

export function materializeHiggsfieldReferenceVideoInput(plan: HiggsfieldReferenceVideoInputPlan, urls: string[]): Record<string, FalJson> {
  if (plan.kind !== 'reference-video' || plan.contractRevision !== HIGGSFIELD_REFERENCE_VIDEO_REVISION) throw new Error('Higgsfield Reference adapter revision changed during media preparation.')
  if (!plan.inputSchema || !plan.fingerprint) throw new Error('The current main-owned Higgsfield schema and fingerprint are required before materialization.')
  assertCurrentSchema(plan.endpointId, plan.inputSchema)
  return assemble(plan, [...urls])
}
