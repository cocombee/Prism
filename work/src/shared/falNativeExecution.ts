import { falNativeCompiledPromptErrors, SeedancePromptIntegrityError } from './seedancePromptIntegrity'
import { VideoDialogueAudioConflictError } from './videoDialogueAudio'
import { assertFalTimelineTiming } from './videoTiming'
import { falEndpointId } from './falModelCatalog'
import { falProductionFlow, type FalProductionFlow } from './falModelFlow'
import { validateFalSchema, type FalJson, type FalSchemaContract, type FalSchemaNode } from './falSchemaBinding'
import type { FalMediaType, FalRuntimeField } from './falRuntimeInputs'
import type { NodeKind } from './types'

export interface FalNativeMediaSource { path?: string; url?: string; mediaType: FalMediaType }
/** Persist values and bindings, never a renderer-supplied authoritative schema. */
export interface FalNativeRequest {
  endpointId: string
  fingerprint: string
  flow: FalProductionFlow
  /** Typed authoring intent, validated against main-owned units; never submitted as a provider field. */
  timelineSeconds?: number
  /** Local typed authoring requirement; never forwarded as a provider field. */
  requiresGeneratedSpeech?: boolean
  /** Local final-body ownership; not a model field. */
  promptOwnership?: 'authored' | 'compiled'
  /** Exact schema field receiving the already visible final prompt. */
  promptField?: string
  values: Record<string, FalJson>
  media: Record<string, FalNativeMediaSource[]>
}
export interface FalNativeOutput { url: string; contentType?: string; type: FalMediaType }
export interface FalOutputBinding { path: Array<string | null>; type: FalMediaType }
export interface FalNativePlan {
  endpointId: string
  values: Record<string, FalJson>
  media: Array<{ field: FalRuntimeField; sources: FalNativeMediaSource[] }>
  preflightSchema: FalSchemaNode
  preflightInput: Record<string, FalJson>
  outputType: FalMediaType
  outputs: FalOutputBinding[]
}
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))

export function falNativeFlowForKind(kind: NodeKind): FalProductionFlow | undefined {
  if (kind === 'image-generator' || kind === 'image-editor' || kind === 'upscaler') return 'image'
  if (kind === 'video-generator') return 'video'
  if (kind === 'voiceover') return 'voice'
  if (kind === 'sound-effects') return 'effects'
  return undefined
}

/** URI transport only. It assigns no semantic camera/character authority. */
export function assertFalMediaUrl(value: string): void {
  let url: URL
  try { url = new URL(value) } catch { throw new Error('Media requires an absolute HTTP or HTTPS URL.') }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password || value.length > 8192) throw new Error('Media requires an absolute HTTP or HTTPS URL without credentials.')
}

function layers(schema: FalSchemaNode): FalSchemaNode[] {
  const nonNull = (schema.anyOf || []).filter(item => item.type !== 'null')
  const nullable = schema.anyOf?.some(item => item.type === 'null') && nonNull.length === 1 ? nonNull[0] : undefined
  return [schema, ...(nullable ? layers(nullable) : []), ...(schema.allOf || []).flatMap(layers)]
}
function properties(schema: FalSchemaNode): Record<string, FalSchemaNode> {
  const result: Record<string, FalSchemaNode> = {}
  for (const layer of layers(schema)) for (const [key, child] of Object.entries(layer.properties || {})) result[key] = result[key] ? { allOf: [result[key], child] } : child
  return result
}
function initialValue(schema: FalSchemaNode): FalJson | undefined {
  const candidates = layers(schema).flatMap(layer => own(layer, 'const') ? [layer.const!] : own(layer, 'default') ? [layer.default!] : [])
  if (!candidates.length) return undefined
  if (!candidates.every(value => JSON.stringify(value) === JSON.stringify(candidates[0]))) throw new Error('Conflicting model defaults require explicit input.')
  return clone(candidates[0])
}

/** Only local upload URL syntax is deferred; all counts/types/other input constraints remain. */
function deferLocalUrlSyntax(schema: FalSchemaNode): FalSchemaNode {
  const result = clone(schema)
  delete result.pattern; delete result.minLength; delete result.maxLength
  if (result.items) result.items = deferLocalUrlSyntax(result.items)
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) if (result[key]) result[key] = result[key]!.map(deferLocalUrlSyntax)
  // enum/const/not cannot safely be deferred: preflight rejects incompatible local placeholders.
  return result
}
function deferFields(schema: FalSchemaNode, localFields: Set<string>): FalSchemaNode {
  const result = clone(schema)
  for (const [key, value] of Object.entries(result.properties || {})) if (localFields.has(key)) result.properties![key] = deferLocalUrlSyntax(value)
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) if (result[key]) result[key] = result[key]!.map(item => deferFields(item, localFields))
  return result
}

function outputBindings(schema: FalSchemaNode, expected: FalMediaType): FalOutputBinding[] {
  const result: FalOutputBinding[] = []
  const visit = (node: FalSchemaNode, path: Array<string | null>, hint?: FalMediaType, depth = 0): void => {
    if (depth > 32) throw new Error('Output binding exceeds its supported depth.')
    const projection = layers(node), props = properties(node)
    const annotation = projection.find(layer => ['image', 'video', 'audio'].includes(layer.uiField || ''))?.uiField as FalMediaType | undefined
    if (props.url && projection.some(layer => layer.uiField && !['image', 'video', 'audio'].includes(layer.uiField))) throw new Error('This output transport needs a supported media adapter before generation.')
    const type = annotation || hint
    if (props.url && layers(props.url).some(layer => layer.type === 'string') && type) {
      result.push({ path, type }); return
    }
    const items = projection.find(layer => layer.type === 'array' && layer.items)?.items
    if (items) { visit(items, [...path, null], type, depth + 1); return }
    for (const [key, child] of Object.entries(props)) {
      const conventional = /^(images?|videos?|audios?)$/.test(key) ? key.replace(/s$/, '') as FalMediaType : undefined
      visit(child, [...path, key], conventional || type, depth + 1)
    }
  }
  visit(schema, [], expected)
  if (!result.some(binding => binding.type === expected)) throw new Error('This model output requires a supported media adapter for the selected flow before generation.')
  return result
}

/** No IO. Main supplies its own fresh contract; values are never remapped or truncated. */
export function planFalNativeExecution(contract: FalSchemaContract, request: FalNativeRequest, kind: NodeKind): FalNativePlan {
  const promptErrors = falNativeCompiledPromptErrors(request)
  if (promptErrors.length) throw new SeedancePromptIntegrityError(promptErrors)
  validateFalSchema({}, request, 'Model binding')
  if (JSON.stringify(request).length > 1024 * 1024) throw new Error('Model inputs exceed their supported size.')
  const endpointId = falEndpointId(request.endpointId), runtime = contract.runtime
  if (endpointId !== contract.endpointId) throw new Error('Selected model endpoint changed. Review the model inputs.')
  if (!runtime || !/^[a-f0-9]{64}$/.test(request.fingerprint) || request.fingerprint !== runtime.fingerprint) throw new Error('Model contract changed. Refresh and review the preserved inputs before generation.')
  if (request.flow !== falNativeFlowForKind(kind) || request.flow !== falProductionFlow(contract.category)) throw new Error('The selected model does not belong to this generation flow.')
  if (!object(request.values) || !object(request.media)) throw new Error('Model values and media bindings must be objects.')
  const fields = new Map(runtime.fields.map(field => [field.key, field]))
  if (request.promptField && !fields.has(request.promptField)) throw new Error('Final prompt field is no longer declared. Review the prompt binding.')
  for (const item of runtime.unsupportedInputs) if (item.key === '$' || fields.get(item.key)?.required || own(request.values, item.key) || own(request.media, item.key)) throw new Error(item.reason)
  const values = clone(request.values)
  for (const key of Object.keys(values)) {
    const field = fields.get(key)
    if (!field) throw new Error(`${key} is no longer declared. Review its preserved value.`)
    if (field.control === 'media' && values[key] !== null) throw new Error(`${key} requires its typed media binding, not an ordinary field value.`)
  }
  for (const field of runtime.fields) if (!own(values, field.key) && field.control !== 'unsupported') {
    const value = initialValue(field.schema)
    if (value !== undefined) values[field.key] = value
  }
  if (request.requiresGeneratedSpeech !== undefined && typeof request.requiresGeneratedSpeech !== 'boolean') throw new Error('Review the typed dialogue audio requirement.')
  if (request.requiresGeneratedSpeech && (kind !== 'video-generator' || !fields.has('generate_audio') || values.generate_audio !== true)) throw new VideoDialogueAudioConflictError()
  assertFalTimelineTiming(runtime.timing, request.timelineSeconds, values)
  const media: FalNativePlan['media'] = [], localFields = new Set<string>()
  const sourceIdentities = new Map<string, number>()
  const preflightInput = clone(values)
  for (const [key, sources] of Object.entries(request.media)) {
    const field = fields.get(key)
    if (!field?.media || field.control !== 'media') throw new Error(`${key} no longer accepts connected media. Review its connections.`)
    if (!Array.isArray(sources) || !sources.length) throw new Error(`${key} has an empty media binding. Disconnect it or supply media.`)
    if (own(request.values, key)) throw new Error(`${key} has conflicting field and media values.`)
    if (!field.media.multiple && sources.length !== 1 || field.media.maximum !== undefined && sources.length > field.media.maximum) throw new Error(`${key} exceeds the model's media capacity.`)
    const urls = sources.map(source => {
      if (!object(source) || source.mediaType !== field.media!.type || Object.keys(source).some(item => !['path', 'url', 'mediaType'].includes(item))) throw new Error(`${key} requires ${field.media!.type} sources.`)
      const hasPath = typeof source.path === 'string' && Boolean(source.path), hasUrl = typeof source.url === 'string' && Boolean(source.url)
      if (hasPath === hasUrl || source.path !== undefined && !hasPath || source.url !== undefined && !hasUrl) throw new Error(`${key} requires exactly one media path or URL.`)
      if (hasUrl) { assertFalMediaUrl(source.url!); return source.url! }
      if (source.path!.length > 8192) throw new Error('Media path exceeds its supported size.')
      localFields.add(key)
      if (!sourceIdentities.has(source.path!)) sourceIdentities.set(source.path!, sourceIdentities.size)
      return `https://prism-upload.invalid/${sourceIdentities.get(source.path!)}`
    })
    preflightInput[key] = field.media.multiple ? urls : urls[0]
    media.push({ field, sources: clone(sources) })
  }
  if (runtime.capacity && media.reduce((sum, binding) => sum + binding.sources.length, 0) > runtime.capacity.total) throw new Error(`This model accepts at most ${runtime.capacity.total} total media references.`)
  if (contract.endpointId === 'bytedance/seedance-2.5/reference-to-video' && media.some(binding => binding.field.key === 'audio_urls') && !media.some(binding => ['image_urls', 'video_urls'].includes(binding.field.key))) throw new Error('Seedance audio references require at least one image or video reference.')
  const expected = request.flow === 'image' ? 'image' : request.flow === 'video' ? 'video' : 'audio'
  return { endpointId, values, media, preflightSchema: deferFields(contract.input, localFields), preflightInput, outputType: expected, outputs: outputBindings(contract.output, expected) }
}

/** Apply only exact-field URLs returned by the owned upload adapter. */
export function materializeFalNativeInput(plan: FalNativePlan, urls: string[][]): Record<string, FalJson> {
  if (urls.length !== plan.media.length) throw new Error('Media upload binding count changed.')
  const input = clone(plan.values)
  plan.media.forEach(({ field, sources }, index) => {
    if (urls[index].length !== sources.length) throw new Error(`${field.key} upload count changed.`)
    urls[index].forEach(assertFalMediaUrl)
    input[field.key] = field.media!.multiple ? [...urls[index]] : urls[index][0]
  })
  return input
}

/** Called after isolated full output-schema validation. Preserve every declared media result. */
export function extractFalNativeOutputs(plan: FalNativePlan, payload: unknown): FalNativeOutput[] {
  const result: FalNativeOutput[] = []
  for (const binding of plan.outputs) {
    let values: unknown[] = [payload]
    for (const key of binding.path) values = values.flatMap(value => key === null ? Array.isArray(value) ? value : [] : object(value) && own(value, key) ? [value[key]] : [])
    for (const value of values) {
      if (value === null || value === undefined) continue
      if (!object(value) || typeof value.url !== 'string') throw new Error('The model returned an invalid media file.')
      assertFalMediaUrl(value.url)
      const contentType = typeof value.content_type === 'string' ? value.content_type : undefined
      if (contentType && !contentType.toLowerCase().startsWith(`${binding.type}/`)) throw new Error('The model returned a media type outside its declared flow.')
      result.push({ url: value.url, type: binding.type, ...(contentType ? { contentType } : {}) })
    }
  }
  if (!result.some(output => output.type === plan.outputType)) throw new Error('The model completed without returning media for its declared flow.')
  return result
}
