import schemas from './fixtures/higgsfieldTextVideoSchemas.json'
import { validateFalSchema, type FalJson, type FalSchemaNode } from './falSchemaBinding'
import type { HiggsfieldNativeRequest } from './higgsfieldNative'

/** Separate contract revision; these routes never pass through the Seedance dispatcher. */
export const HIGGSFIELD_TEXT_VIDEO_REVISION = 'prism-higgsfield-text-video-2026-10-11-v1'
const fixture = schemas as unknown as Record<string, {
  label: string; company: string; release: string; sourceUrl: string
  documentSha256: string; schemaSha256: string; omittedControls: string[]; outputContract: {completedStatus:string;required:string[];fileProperty:string;fileRequired:boolean;fileUrlProperty:string;fileUrlFormat?:string}; inputSchema: FalSchemaNode
}>

export const HIGGSFIELD_TEXT_VIDEO_MODELS = Object.freeze(Object.entries(fixture).map(([id, row]) => Object.freeze({
  kind: 'text-video' as const, id, label: `${row.label} · Text to Video`,
  // Reviewed public naming aliases share one technology identity with Reference
  // and existing connected hosts; the original document metadata stays in fixture.
  company: row.company === 'Kling AI' ? 'Kling' : row.company,
  release: row.company === 'MiniMax' && row.release === 'H3' ? 'MiniMax H3'
    : row.company === 'PixVerse' && row.release === 'V6' ? 'PixVerse V6' : row.release,
})))

export interface HiggsfieldTextVideoField { key: string; label: string; schema: FalSchemaNode; required: boolean; media?: undefined }
export interface HiggsfieldTextVideoInputPlan {
  kind: 'text-video'
  endpointId: string
  contractRevision: string
  values: Record<string, FalJson>
  slots: []
  preview: Record<string, FalJson>
  schema: FalSchemaNode
  /** Present only when supplied by the active main-process contract owner. */
  inputSchema?: FalSchemaNode
  fingerprint?: string
}

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const clone = <T>(value: T): T => structuredClone(value)
const SAFE_SCHEMA_KEYS = new Set([
  'type','title','description','default','enum','const','properties','propertyOrder','uiField','required','additionalProperties','items',
  'minimum','maximum','exclusiveMinimum','exclusiveMaximum','multipleOf','minLength','maxLength','minItems','maxItems',
  'minProperties','maxProperties','uniqueItems','format','pattern','anyOf','oneOf','allOf','not','if','then','else',
])
const MEDIA_NAMES = new Set(['image','images','image_url','image_urls','start_image','start_image_url','end_image','end_image_url','last_image','last_image_url','video','videos','video_url','video_urls','source_video','source_video_url','audio','audios','audio_url','audio_urls','reference','references','reference_url','reference_urls','reference_images','reference_videos','reference_audios','media','media_url','media_urls'])
const mediaName = (key: string) => {
  const normalized=key.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase()
  if(normalized==='generate_audio')return false
  return MEDIA_NAMES.has(normalized) || /(?:^|_)(?:url|urls)$/i.test(normalized) || /^reference(?:_|$)/i.test(normalized) || /(?:^|_)(?:image|images|video|videos|audio|audios|media)(?:_|$)/i.test(normalized)
}
const UNSAFE_OUTPUT_NAMES = /(?:^|_)(?:output|format)(?:_|$)/i
const CONDITIONAL_KEYS = new Set(['anyOf','oneOf','allOf','not','if','then','else'])
const MAX_SCHEMA_NODES = 2000
const MAX_DEPTH = 24

function freeze<T>(value: T): T {
  const pending: unknown[] = [value], seen = new WeakSet<object>()
  while (pending.length) {
    const item = pending.pop()
    if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item); for (const child of Object.values(item)) pending.push(child); Object.freeze(item)
    }
  }
  return value
}

function assertJson(value: unknown, label: string): void {
  try { JSON.stringify(value) } catch { throw new Error(`${label} must be finite, acyclic JSON; its authored values were preserved.`) }
  const pending: unknown[] = [value], seen = new WeakSet<object>()
  while (pending.length) {
    const item = pending.pop()
    if (item === null || typeof item === 'string' || typeof item === 'boolean' || typeof item === 'number' && Number.isFinite(item)) continue
    if (!item || typeof item !== 'object' || !Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item))) throw new Error(`${label} must be finite, acyclic JSON; its authored values were preserved.`)
    if (seen.has(item)) continue
    seen.add(item)
    for (const [key, child] of Array.isArray(item) ? item.map((child, index) => [String(index), child] as const) : Object.entries(item)) {
      if (!Array.isArray(item) && ['__proto__','prototype','constructor'].includes(key)) throw new Error(`${label} contains an unsafe field.`)
      pending.push(child)
    }
  }
}

export function higgsfieldTextVideoSchema(endpointId: string): FalSchemaNode {
  const row = fixture[endpointId]
  if (!row) throw new Error('This Higgsfield text-to-video route has no verified input schema. Its saved state was preserved.')
  return clone(row.inputSchema)
}

/** Declared optional controls intentionally left out of the zero-media UI and request body. */
export function higgsfieldTextVideoOmittedControls(endpointId: string): readonly string[] {
  const row=fixture[endpointId]
  if(!row)throw new Error('This Higgsfield text-to-video route has no verified input schema. Its saved state was preserved.')
  return Object.freeze([...row.omittedControls])
}

function supportedFields(endpointId: string, schema: FalSchemaNode): HiggsfieldTextVideoField[] {
  const baseline = higgsfieldTextVideoSchema(endpointId)
  const baselineProperties = baseline.properties || {}, currentProperties = schema.properties || {}
  const omitted = new Set(higgsfieldTextVideoOmittedControls(endpointId))
  return Object.entries(baselineProperties).flatMap(([key, expected]) => {
    // Optional structured controls are intentionally outside this zero-media scalar adapter.
    if (omitted.has(key) || !['string','number','integer','boolean'].includes(String(expected.type))) return []
    const current = currentProperties[key]
    if (!current) return []
    return [{ key, label: current.title || expected.title || key, schema: clone(current), required: schema.required?.includes(key) === true }]
  })
}

function assertSupportedSchema(endpointId: string, schema: FalSchemaNode): void {
  if (!record(schema) || schema.type !== 'object' || !record(schema.properties)) throw new Error('The current Higgsfield text-to-video input shape needs a reviewed adapter.')
  const properties = schema.properties as Record<string,FalSchemaNode>
  const omitted = new Set(higgsfieldTextVideoOmittedControls(endpointId))
  let nodes = 0
  const visit = (node: unknown, path: string, depth: number, omittedUri = false): void => {
    if (depth > MAX_DEPTH || ++nodes > MAX_SCHEMA_NODES) throw new Error('The current Higgsfield text-to-video schema exceeds its supported bounds.')
    if (!record(node) || Array.isArray(node)) throw new Error(`The current Higgsfield schema at ${path} needs a reviewed adapter.`)
    for (const key of Object.keys(node)) {
      if (!SAFE_SCHEMA_KEYS.has(key)) throw new Error(`The current Higgsfield schema uses unsupported rule ${key}; review its fields before generating.`)
      if (CONDITIONAL_KEYS.has(key) || key === 'pattern') throw new Error('The current Higgsfield schema contains an unsupported conditional or string pattern; review its fields before generating.')
    }
    if (node.format !== undefined && !(omittedUri && node.format === 'uri')) throw new Error(`The current Higgsfield schema at ${path} declares a format that this text-only adapter cannot transport.`)
    if (record(node.properties)) for (const [key, child] of Object.entries(node.properties)) {
      const omittedMedia=depth===0&&omitted.has(key)
      if (mediaName(key) && !omittedMedia) throw new Error(`The current Higgsfield schema adds media input ${key}; this adapter accepts text-only requests.`)
      if (UNSAFE_OUTPUT_NAMES.test(key)) throw new Error(`The current Higgsfield schema changes the output contract through ${key}; review its native result adapter.`)
      if(omittedMedia&&key==='audio_url'&&(!record(child)||child.type!=='string'||child.format!=='uri'))throw new Error('Wan 2.7 audio_url changed its optional URI input shape; review the zero-media route before generating.')
      visit(child, `${path}.${key}`, depth + 1, omittedMedia&&key==='audio_url')
    }
    if (node.items !== undefined) visit(node.items, `${path}[]`, depth + 1)
    if (node.additionalProperties !== undefined && node.additionalProperties !== false) throw new Error(`The current Higgsfield schema at ${path} accepts undeclared keys; review its native input contract.`)
  }
  const rootKeys=new Set(['type','title','description','properties','propertyOrder','uiField','required','additionalProperties'])
  if(Object.keys(schema).some(key=>!rootKeys.has(key)))throw new Error('The current Higgsfield text-to-video root input contract has unsupported rules.')
  visit(schema, 'Input', 0)
  if (Object.keys(properties).length > 100 || schema.required !== undefined && (!Array.isArray(schema.required) || schema.required.some(key => typeof key !== 'string'))) throw new Error('The current Higgsfield text-to-video schema has malformed fields.')
  const prompt = properties.prompt
  if (!prompt || prompt.type !== 'string') throw new Error('The current Higgsfield text-to-video prompt must remain a string; authored text was preserved.')
  const baseline = higgsfieldTextVideoSchema(endpointId), baselineProperties = baseline.properties || {}
  for (const [key, field] of Object.entries(properties)) {
    const expected = baselineProperties[key]
    if (!expected) {
      if (schema.required?.includes(key)) throw new Error(`The current Higgsfield schema requires unsupported input ${key}; its saved state was preserved.`)
      continue // Unimplemented optional controls are never exposed or sent.
    }
    if (['string','number','integer','boolean'].includes(String(expected.type)) && field.type !== expected.type) throw new Error(`The current Higgsfield input ${key} changed type; review its preserved value.`)
    if (schema.required?.includes(key) && !['string','number','integer','boolean'].includes(String(expected.type))) throw new Error(`The current Higgsfield schema requires unsupported structured input ${key}.`)
  }
  for (const key of schema.required || []) {
    if (!properties[key]) throw new Error(`The current Higgsfield schema requires missing input ${key}.`)
    if(omitted.has(key))throw new Error(`The current Higgsfield schema requires omitted control ${key}; this zero-media adapter cannot safely use it.`)
  }
  if (schema.required?.includes('prompt') && properties.prompt.type !== 'string') throw new Error('The current Higgsfield required prompt must remain a string.')
  // All supported controls are scalar and are also confirmed against the fixture's scalar contract.
  for (const field of supportedFields(endpointId, schema)) {
    if (field.key === 'prompt' && field.schema.type !== 'string') throw new Error('The current Higgsfield prompt must remain a string.')
  }
}

export function higgsfieldTextVideoFields(endpointId: string, inputSchema?: FalSchemaNode): HiggsfieldTextVideoField[] {
  const schema = inputSchema ? clone(inputSchema) : higgsfieldTextVideoSchema(endpointId)
  assertSupportedSchema(endpointId, schema)
  return supportedFields(endpointId, schema)
}

function assertKnownKeys(schema: FalSchemaNode, value: unknown, path = 'Input', depth = 0): void {
  if (depth > MAX_DEPTH) throw new Error('Higgsfield text-to-video inputs exceed their supported depth.')
  if (!record(value)) return
  const properties = schema.properties || {}
  for (const [key, child] of Object.entries(value)) {
    const declared = properties[key]
    if (!declared) throw new Error(`${path} does not accept ${key}; the authored value was preserved.`)
    if (mediaName(key)) throw new Error(`${path} does not accept media input ${key}.`)
    if (declared.type === 'object') assertKnownKeys(declared, child, `${path}.${key}`, depth + 1)
    if (declared.type === 'array' && declared.items?.type === 'object' && Array.isArray(child)) child.forEach((item, index) => assertKnownKeys(declared.items!, item, `${path}.${key}[${index}]`, depth + 1))
  }
}

function buildValues(endpointId: string, requestValues: Record<string, FalJson>, schema: FalSchemaNode): Record<string, FalJson> {
  const supported = new Set(higgsfieldTextVideoFields(endpointId, schema).map(field => field.key))
  for (const key of Object.keys(requestValues)) if (!supported.has(key)) throw new Error(`The selected Higgsfield text-to-video route does not support ${key}; its authored value was preserved.`)
  const values: Record<string,FalJson> = Object.create(null)
  for (const [key,value] of Object.entries(requestValues)) values[key] = clone(value)
  // Only current provider-declared scalar defaults are materialized.
  for (const field of higgsfieldTextVideoFields(endpointId, schema)) if (!own(values, field.key) && own(field.schema, 'default')) values[field.key] = clone(field.schema.default!)
  assertKnownKeys(schema, values)
  return values
}

export function planHiggsfieldTextVideoInput(native: HiggsfieldNativeRequest, inputSchema?: FalSchemaNode): HiggsfieldTextVideoInputPlan {
  if (!record(native) || Object.keys(native).some(key => !['endpointId','contractRevision','values','media','fingerprint'].includes(key))) throw new Error('Higgsfield text-to-video has an unsupported request field; review the preserved request.')
  if (native.contractRevision !== HIGGSFIELD_TEXT_VIDEO_REVISION) throw new Error('Higgsfield text-to-video contract changed. Review the preserved inputs before generating.')
  if (typeof native.endpointId !== 'string' || !own(fixture, native.endpointId)) throw new Error('This Higgsfield text-to-video route has no verified input schema. Its saved state was preserved.')
  if (!record(native.values) || !record(native.media)) throw new Error('Review Higgsfield text-to-video controls and media bindings.')
  if (Object.keys(native.media).length) throw new Error('Higgsfield text-to-video accepts no media bindings; its authored connections were preserved.')
  assertJson(native.values, 'Higgsfield controls')
  if (native.fingerprint !== undefined && (typeof native.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(native.fingerprint))) throw new Error('Load and review the current Higgsfield model inputs before generating.')
  const baseline = higgsfieldTextVideoSchema(native.endpointId)
  if (!inputSchema && native.fingerprint !== undefined) {
    // Preflight captures are immutable only; the owning main process must attach the current schema before materialization.
    for (const key of Object.keys(native.values)) if (mediaName(key)) throw new Error(`Higgsfield text-to-video does not accept media input ${key}.`)
    const values = clone(native.values)
    return freeze({ kind:'text-video', endpointId:native.endpointId, contractRevision:native.contractRevision, values, slots:[], preview:clone(values), schema:baseline, fingerprint:native.fingerprint })
  }
  const schema = inputSchema ? clone(inputSchema) : baseline
  if (inputSchema && native.fingerprint === undefined) throw new Error('The current main-owned Higgsfield schema fingerprint is required before generation.')
  assertSupportedSchema(native.endpointId, schema)
  const values = buildValues(native.endpointId, native.values as Record<string,FalJson>, schema)
  validateFalSchema(schema, values)
  return freeze({
    kind:'text-video', endpointId:native.endpointId, contractRevision:native.contractRevision,
    values, slots:[], preview:clone(values), schema:clone(schema),
    ...(inputSchema ? {inputSchema:clone(schema)} : {}),
    ...(native.fingerprint ? {fingerprint:native.fingerprint} : {}),
  })
}

export function materializeHiggsfieldTextVideoInput(plan: HiggsfieldTextVideoInputPlan, urls: string[] = []): Record<string,FalJson> {
  if (!plan || plan.kind !== 'text-video' || plan.contractRevision !== HIGGSFIELD_TEXT_VIDEO_REVISION || !own(fixture, plan.endpointId)) throw new Error('The Higgsfield text-to-video plan changed before materialization.')
  if (!Array.isArray(urls) || urls.length !== 0 || plan.slots.length !== 0) throw new Error('Higgsfield text-to-video has no media transport.')
  if (!plan.inputSchema || typeof plan.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(plan.fingerprint)) throw new Error('The current main-owned Higgsfield schema and fingerprint are required before materialization.')
  assertSupportedSchema(plan.endpointId, plan.inputSchema)
  const input = clone(plan.values)
  assertKnownKeys(plan.inputSchema, input)
  validateFalSchema(plan.inputSchema, input)
  return input
}
