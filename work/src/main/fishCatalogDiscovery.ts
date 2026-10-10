import { createHash } from 'node:crypto'
import type { ServiceModelAvailability } from '../shared/types'
import { compileFalContractIsolated } from './falSchemaValidation'

export const FISH_PUBLIC_OPENAPI = 'https://docs.fish.audio/api-reference/openapi.json'
type ObjectValue = Record<string, unknown>
const object = (value: unknown): value is ObjectValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const own = (value: ObjectValue, key: string) => Object.prototype.hasOwnProperty.call(value, key)

function resolved(document: ObjectValue, value: unknown, seen = new Set<string>()): ObjectValue {
  if (!object(value)) throw new Error('Fish Audio returned an invalid model declaration.')
  if (!own(value, '$ref')) return value
  const reference = value.$ref
  if (typeof reference !== 'string' || !reference.startsWith('#/') || seen.has(reference) || seen.size >= 12) throw new Error('Fish Audio model declarations require bounded local references.')
  let target: unknown = document
  for (const escaped of reference.slice(2).split('/')) {
    const key = escaped.replace(/~1/g, '/').replace(/~0/g, '~')
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !object(target) || !own(target, key)) throw new Error('Invalid Fish Audio schema reference.')
    target = target[key]
  }
  // Sibling constraints are not discarded. An unknown composition remains unavailable.
  if (Object.keys(value).some(key => key !== '$ref' && !['description', 'title', 'summary'].includes(key))) throw new Error('Unsupported Fish Audio reference constraints.')
  return resolved(document, target, new Set([...seen, reference]))
}

function finiteStrings(document: ObjectValue, raw: unknown, depth = 0): string[] {
  if (depth > 12) throw new Error('Fish Audio model declaration is too deeply nested.')
  const schema = resolved(document, raw)
  if (schema.type !== undefined && schema.type !== 'string') throw new Error('Fish Audio model header must declare strings.')
  if (schema.not !== undefined || schema.if !== undefined || schema.pattern !== undefined) throw new Error('Unsupported Fish Audio model constraints.')
  let values: unknown[] | undefined
  if (Array.isArray(schema.enum)) values = schema.enum
  if (schema.const !== undefined) values = values ? values.filter(value => value === schema.const) : [schema.const]
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    if (schema[key] === undefined) continue
    if (!Array.isArray(schema[key]) || !schema[key].length || schema[key].length > 64) throw new Error('Invalid Fish Audio model alternatives.')
    const branches = schema[key].map(branch => finiteStrings(document, branch, depth + 1))
    const combined = key === 'allOf' ? branches.reduce((left, right) => left.filter(value => right.includes(value))) : branches.flat()
    values = values ? values.filter(value => combined.includes(value as string)) : combined
  }
  if (!values?.length || values.length > 1000 || values.some(value => typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value))) throw new Error('Fish Audio must advertise a bounded explicit model list.')
  return [...new Set(values as string[])]
}

/** Read only the TTS inference header. Voice-profile and ASR IDs cannot leak in. */
export function fishAdvertisedModels(raw: unknown): { ids: string[]; defaultModel?: string } {
  if (!object(raw) || !object(raw.paths) || !object(raw.paths['/v1/tts'])) throw new Error('Fish Audio TTS contract is missing.')
  const path = raw.paths['/v1/tts'], operation = resolved(raw, path.post)
  const parameters = new Map<string, ObjectValue>()
  for (const declared of [path.parameters, operation.parameters]) {
    if (declared === undefined) continue
    if (!Array.isArray(declared) || declared.length > 128) throw new Error('Invalid Fish Audio header declarations.')
    const layer = new Set<string>()
    for (const value of declared) {
      const parameter = resolved(raw, value)
      if (typeof parameter.in !== 'string' || typeof parameter.name !== 'string') throw new Error('Invalid Fish Audio parameter.')
      const identity = JSON.stringify([parameter.in, parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name])
      if (layer.has(identity)) throw new Error('Duplicate Fish Audio parameter declaration.')
      layer.add(identity); parameters.set(identity, parameter)
    }
  }
  const parameter = parameters.get(JSON.stringify(['header', 'model']))
  if (!parameter || parameter.deprecated === true) throw new Error('Fish Audio model selection is unavailable.')
  const schema = resolved(raw, parameter.schema), ids = finiteStrings(raw, schema)
  if (schema.default !== undefined && (typeof schema.default !== 'string' || !ids.includes(schema.default))) throw new Error('Fish Audio returned an invalid default model.')
  return { ids, ...(typeof schema.default === 'string' ? { defaultModel: schema.default } : {}) }
}

export async function readFishAdvertisedCatalog(request: (url: string, init: RequestInit) => Promise<Response>, assertCurrent: () => void = () => undefined): Promise<ServiceModelAvailability> {
  assertCurrent()
  const response = await request(FISH_PUBLIC_OPENAPI, { redirect: 'error', signal: AbortSignal.timeout(10_000) })
  if (!response.ok || !response.body) throw new Error(`Could not read the public Fish Audio contract (${response.status}).`)
  const maximum = 2 * 1024 * 1024
  if (Number(response.headers.get('content-length')) > maximum) { await response.body.cancel(); throw new Error('Fish Audio public contract exceeds its supported size.') }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let total = 0
  try {
    for (;;) {
      assertCurrent()
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maximum) throw new Error('Fish Audio public contract exceeds its supported size.')
      chunks.push(value)
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error }
  finally { reader.releaseLock() }
  assertCurrent()
  const bytes = Buffer.concat(chunks), raw: unknown = JSON.parse(bytes.toString('utf8')), contract = fishAdvertisedModels(raw)
  if (!object(raw) || !object(raw.paths) || !object(raw.paths['/v1/tts'])) throw new Error('Fish Audio TTS input contract is missing.')
  const operation = resolved(raw, raw.paths['/v1/tts'].post), body = resolved(raw, operation.requestBody)
  if (!object(body.content) || !object(body.content['application/json']) || !object(body.content['application/json'].schema)) throw new Error('Fish Audio must declare its native JSON input schema.')
  // Adapt only the standard JSON schema to the existing bounded compiler.
  // These internal operation names are never transport routes; execution stays /v1/tts.
  const compilerId = 'fish-audio/tts'
  const input = await compileFalContractIsolated(compilerId, { components: raw.components, paths: {
    [`/${compilerId}`]: { post: { requestBody: { content: { 'application/json': { schema: body.content['application/json'].schema } } } } },
    [`/${compilerId}/requests/{request_id}`]: { get: { responses: { '200': { content: { 'application/json': { schema: { type: 'object' } } } } } } },
  } })
  assertCurrent()
  const labels: Record<string, string> = { s1: 'Fish Audio S1', 's2-pro': 'Fish Audio S2 Pro', 's2.1-pro': 'Fish Audio S2.1 Pro', 's2.1-pro-free': 'Fish Audio S2.1 Pro Free', 'drama-3-preview': 'Fish Audio Drama 3 Preview' }
  return { provider: 'fish', verified: true, catalogCheckedAt: new Date().toISOString(), catalogSource: FISH_PUBLIC_OPENAPI,
    catalogFingerprint: createHash('sha256').update(bytes).digest('hex'),
    nativeInputSchema: input.input,
    models: [...contract.ids].sort((left, right) => Number(right === contract.defaultModel) - Number(left === contract.defaultModel)).map(id => ({ id, label: labels[id] || `Fish Audio ${id}`, description: 'Advertised by the official public TTS contract; account access and executed engine are not attested.' })) }
}
