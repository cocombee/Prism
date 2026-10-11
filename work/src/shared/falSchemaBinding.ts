import type { FalRuntimeInputs } from './falRuntimeInputs'
import { falEndpointId } from './falModelCatalog'

export type FalJson = null | boolean | number | string | FalJson[] | { [key: string]: FalJson }
export interface FalSchemaNode {
  type?: 'null' | 'boolean' | 'number' | 'integer' | 'string' | 'array' | 'object'
  title?: string
  description?: string
  /** Presentation annotations only; URL/media authorization remains a main-process responsibility. */
  format?: string
  propertyOrder?: string[]
  uiField?: string
  default?: FalJson
  enum?: FalJson[]
  const?: FalJson
  properties?: Record<string, FalSchemaNode>
  required?: string[]
  additionalProperties?: boolean | FalSchemaNode
  items?: FalSchemaNode
  anyOf?: FalSchemaNode[]
  oneOf?: FalSchemaNode[]
  allOf?: FalSchemaNode[]
  not?: FalSchemaNode
  if?: FalSchemaNode
  then?: FalSchemaNode
  else?: FalSchemaNode
  minimum?: number
  maximum?: number
  exclusiveMinimum?: boolean | number
  exclusiveMaximum?: boolean | number
  multipleOf?: number
  minLength?: number
  /** Native transport constraint; managed-file preparation validates bytes before upload. */
  maxFileSize?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  minProperties?: number
  maxProperties?: number
  uniqueItems?: boolean
  pattern?: string
}
export interface FalSchemaContract { endpointId: string; schemaPath: string; category?: string; input: FalSchemaNode; output: FalSchemaNode; runtime?: FalRuntimeInputs & { fingerprint: string } }
const object = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const safeKey = (key: string) => !['__proto__', 'prototype', 'constructor'].includes(key)

/** Local references only. Unknown validation rules never silently become a runnable contract. */
export function compileFalSchemaContract(endpointId: string, value: unknown): FalSchemaContract {
  return compileFalSchemaDocument(falEndpointId(endpointId), value)
}

/** Receives an ID already validated by the public entry point or worker owner. */
function compileFalSchemaDocument(endpointId: string, value: unknown): FalSchemaContract {
  // Keep compiler constants inside the serialized function so production
  // bundling cannot rename an external binding out of the worker program.
  const numeric = ['minimum', 'maximum', 'multipleOf', 'minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties'] as const
  const supported = new Set(['type', '$ref', '$schema', 'nullable', 'title', 'description', 'default', 'enum', 'const', 'properties', 'required', 'additionalProperties', 'items', 'anyOf', 'oneOf', 'allOf', 'not', 'if', 'then', 'else', 'exclusiveMinimum', 'exclusiveMaximum', 'uniqueItems', 'pattern', 'max_file_size', ...numeric])
  const annotations = new Set(['examples', 'example', 'format', 'deprecated', 'readOnly', 'writeOnly', '$id', '_fal_ui_field', 'ui', 'limit_description'])
  const id = endpointId, api = object(value), paths = object(api?.paths)
  if (!api || !paths) throw new Error('Missing fal OpenAPI model contract.')
  // fal's catalog namespace can differ from the path in its returned OpenAPI.
  // Bind one declared input/result pair, while keeping the catalog ID as the
  // only execution ID. A schema path is never an alternate submission URL.
  const exactPath = `/${id}`
  const declaredPosts = Object.keys(paths).filter((path) => object(object(paths[path])?.post))
  const schemaPath = object(object(paths[exactPath])?.post) ? exactPath : declaredPosts.length === 1 ? declaredPosts[0] : undefined
  if (!schemaPath) throw new Error('Fal model input operation is missing or ambiguous.')
  const submit = object(object(paths[schemaPath])?.post)
  const jsonSchema = (content: unknown) => object(object(content)?.['application/json'])?.schema
  const input = jsonSchema(object(submit?.requestBody)?.content)
  // The submit response is queue status. Only the result operation owns output.
  const result = object(object(paths[`${schemaPath}/requests/{request_id}`])?.get)
  const output = jsonSchema(object(object(result?.responses)?.['200'])?.content)
  if (input === undefined || output === undefined) throw new Error('Missing fal input or queued result schema.')
  let nodes = 0
  const compile = (raw: unknown, depth = 0, references: readonly string[] = []): FalSchemaNode => {
    if (depth > 24 || ++nodes > 4000) throw new Error('Fal model schema exceeds its supported complexity.')
    if (typeof raw === 'boolean') return raw ? {} : { not: {} }
    const schema = object(raw)
    if (!schema) throw new Error('Malformed fal model schema.')
    if (schema.nullable !== undefined && typeof schema.nullable !== 'boolean') throw new Error('Malformed fal nullable rule.')
    if (schema.$ref !== undefined) {
      const reference = schema.$ref
      if (typeof reference !== 'string' || !reference.startsWith('#/') || references.includes(reference)) throw new Error('Fal schema requires an unsupported external or recursive reference.')
      let target: unknown = api
      for (const part of reference.slice(2).split('/').map((item) => item.replace(/~1/g, '/').replace(/~0/g, '~'))) {
        if (!safeKey(part) || !object(target) || !own(target as object, part)) throw new Error('Invalid fal schema reference.')
        target = (target as Record<string, unknown>)[part]
      }
      const base = compile(target, depth + 1, [...references, reference])
      const sibling = { ...schema }; delete sibling.$ref
      const nullable = sibling.nullable === true; delete sibling.nullable
      const resolved = Object.keys(sibling).length ? { allOf: [base, compile(sibling, depth + 1, references)] } : base
      return nullable ? { anyOf: [resolved, { type: 'null' }] } : resolved
    }
    for (const key of Object.keys(schema)) if (!supported.has(key) && !annotations.has(key) && !key.startsWith('x-')) throw new Error(`Fal schema validation rule is not supported: ${key}.`)
    const node: FalSchemaNode = {}
    const type = schema.type
    if (Array.isArray(type)) {
      if (!type.length || new Set(type).size !== type.length) throw new Error('Malformed fal schema type alternatives.')
      return { anyOf: type.map((item) => compile({ ...schema, type: item }, depth + 1, references)) }
    }
    if (type !== undefined) {
      if (!['null', 'boolean', 'number', 'integer', 'string', 'array', 'object'].includes(String(type))) throw new Error('Unsupported fal schema type.')
      node.type = type as FalSchemaNode['type']
    }
    for (const key of ['title', 'description'] as const) if (typeof schema[key] === 'string') node[key] = schema[key]
    if (schema.format !== undefined) {
      if (typeof schema.format !== 'string' || schema.format.length > 128) throw new Error('Malformed fal field format.')
      node.format = schema.format
    }
    if (schema._fal_ui_field !== undefined) {
      if (typeof schema._fal_ui_field !== 'string' || schema._fal_ui_field.length > 128) throw new Error('Malformed fal field presentation.')
      node.uiField = schema._fal_ui_field
    }
    if (schema.max_file_size !== undefined) {
      if (!Number.isSafeInteger(schema.max_file_size) || Number(schema.max_file_size) <= 0) throw new Error('Malformed fal file-size limit.')
      node.maxFileSize = schema.max_file_size as number
    }
    const presentation = object(schema.ui)
    if (schema.ui !== undefined && !presentation) throw new Error('Malformed fal field presentation.')
    if (presentation?.field !== undefined) {
      if (typeof presentation.field !== 'string' || presentation.field.length > 128) throw new Error('Malformed fal field presentation.')
      if (node.uiField && node.uiField !== presentation.field) throw new Error('Conflicting fal field presentation.')
      node.uiField = presentation.field
    }
    if (schema.limit_description !== undefined && (typeof schema.limit_description !== 'string' || schema.limit_description.length > 4096)) throw new Error('Malformed fal limit annotation.')
    if (schema['x-fal-order-properties'] !== undefined) {
      const order = schema['x-fal-order-properties']
      if (!Array.isArray(order) || order.some((key) => typeof key !== 'string' || !safeKey(key)) || new Set(order).size !== order.length) throw new Error('Malformed fal field order.')
      node.propertyOrder = order
    }
    for (const key of ['default', 'const'] as const) if (own(schema, key)) { requireJson(schema[key], `Schema ${key}`); node[key] = schema[key] as FalJson }
    if (schema.enum !== undefined) {
      if (!Array.isArray(schema.enum) || !schema.enum.length) throw new Error('Malformed fal schema choices.')
      requireJson(schema.enum, 'Schema choices')
      node.enum = schema.enum as FalJson[]
    }
    for (const key of numeric) if (schema[key] !== undefined) {
      if (typeof schema[key] !== 'number' || !Number.isFinite(schema[key])) throw new Error('Malformed fal schema bound.')
      if (key !== 'minimum' && key !== 'maximum' && schema[key] < 0 || key === 'multipleOf' && schema[key] <= 0) throw new Error('Invalid fal schema bound.')
      if (key.startsWith('min') && key !== 'minimum' || key.startsWith('max') && key !== 'maximum') {
        if (!Number.isSafeInteger(schema[key])) throw new Error('Malformed fal schema count bound.')
      }
      node[key] = schema[key]
    }
    for (const key of ['exclusiveMinimum', 'exclusiveMaximum'] as const) if (schema[key] !== undefined) {
      if (typeof schema[key] !== 'boolean' && (typeof schema[key] !== 'number' || !Number.isFinite(schema[key]))) throw new Error('Malformed fal exclusive bound.')
      node[key] = schema[key]
    }
    if (schema.uniqueItems !== undefined) {
      if (typeof schema.uniqueItems !== 'boolean') throw new Error('Malformed fal uniqueness rule.')
      node.uniqueItems = schema.uniqueItems
    }
    if (schema.pattern !== undefined) {
      if (typeof schema.pattern !== 'string' || schema.pattern.length > 1024) throw new Error('Malformed fal string pattern.')
      node.pattern = schema.pattern
    }
    if (schema.properties !== undefined) {
      const properties = object(schema.properties)
      if (!properties) throw new Error('Malformed fal model fields.')
      node.properties = Object.fromEntries(Object.entries(properties).map(([key, child]) => {
        if (!safeKey(key)) throw new Error('Unsafe fal model field.')
        return [key, compile(child, depth + 1, references)]
      }))
    }
    if (schema.required !== undefined) {
      if (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== 'string' || !safeKey(key))) throw new Error('Malformed required fal fields.')
      node.required = schema.required
    }
    if (schema.additionalProperties !== undefined) node.additionalProperties = typeof schema.additionalProperties === 'boolean' ? schema.additionalProperties : compile(schema.additionalProperties, depth + 1, references)
    if (schema.items !== undefined) node.items = compile(schema.items, depth + 1, references)
    for (const key of ['anyOf', 'oneOf', 'allOf'] as const) if (schema[key] !== undefined) {
      if (!Array.isArray(schema[key]) || !schema[key].length) throw new Error('Malformed fal schema alternatives.')
      node[key] = schema[key].map((item) => compile(item, depth + 1, references))
    }
    if (schema.not !== undefined) node.not = compile(schema.not, depth + 1, references)
    for (const key of ['if', 'then', 'else'] as const) if (schema[key] !== undefined) node[key] = compile(schema[key], depth + 1, references)
    return schema.nullable === true ? { anyOf: [node, { type: 'null' }] } : node
  }
  return { endpointId: id, schemaPath, input: compile(input), output: compile(output) }
}

function requireJson(value: unknown, path: string, depth = 0, budget = { nodes: 0 }): void {
  if (depth > 32 || ++budget.nodes > 100_000) throw new Error(`${path} exceeds its supported complexity.`)
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (Array.isArray(value)) { value.forEach((item, index) => requireJson(item, `${path}[${index}]`, depth + 1, budget)); return }
  const entries = object(value)
  if (!entries || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${path} must contain JSON values.`)
  for (const [key, item] of Object.entries(entries)) {
    if (!safeKey(key)) throw new Error(`${path} contains an unsafe field.`)
    requireJson(item, `${path}.${key}`, depth + 1, budget)
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (object(value)) return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function linearPattern(pattern: string, value: string): boolean {
  // General provider expressions are evaluated in the main isolated validator.
  // This synchronous shared path allows only a conservative linear subset.
  if (/[()|]/.test(pattern) || (pattern.match(/[+*?{]/g) || []).length > 1) throw new Error('This string pattern requires isolated validation.')
  return new RegExp(pattern).test(value)
}

export function falValidatorWorkerSource(): string {
  // Only trusted application functions become code. Provider schema/payload
  // arrive as workerData; neither is interpolated into this program.
  const helpers = [object, own, safeKey, requireJson, canonical, validateFalSchema]
  return `const { parentPort, workerData } = require('node:worker_threads');\n`
    + helpers.map((fn) => `const ${fn.name} = (${fn.toString()});`).join('\n')
    + `\ntry { ${validateFalSchema.name}(workerData.schema, workerData.value, workerData.path, 0, (pattern, value) => new RegExp(pattern).test(value)); parentPort.postMessage({ ok: true }); } catch (error) { parentPort.postMessage({ ok: false, message: error.message }); }`
}

/** Only application-owned code is serialized; public contracts are worker data. */
export function falCompilerWorkerSource(): string {
  const helpers = [object, own, safeKey, requireJson, compileFalSchemaDocument]
  return `const { parentPort, workerData } = require('node:worker_threads');\n`
    + helpers.map((fn) => `const ${fn.name} = (${fn.toString()});`).join('\n')
    + `\ntry { const value = ${compileFalSchemaDocument.name}(workerData.endpointId, workerData.openapi); if (JSON.stringify(value).length > 8 * 1024 * 1024) throw new Error('Compiled fal model contract exceeds its supported size.'); parentPort.postMessage({ ok: true, value }); } catch (error) { parentPort.postMessage({ ok: false, message: error.message }); }`
}

/** Validate exactly as declared; no type coercion, dropped choices or fallback values. */
export function validateFalSchema(schema: FalSchemaNode, value: unknown, path = 'Input', depth = 0, patternTest: (pattern: string, value: string) => boolean = linearPattern): void {
  if (depth === 0) requireJson(value, path)
  if (depth > 32) throw new Error(`${path} exceeds its supported depth.`)
  const fail = (detail: string): never => { const error = new Error(`${path}: ${detail}`); error.name = 'FalSchemaValueMismatch'; throw error }
  const valid = (child: FalSchemaNode) => {
    try { validateFalSchema(child, value, path, depth + 1, patternTest); return true }
    catch (error) { if (error instanceof Error && error.name === 'FalSchemaValueMismatch') return false; throw error }
  }
  if (schema.anyOf && !schema.anyOf.some(valid)) fail('does not match an allowed type.')
  if (schema.oneOf && schema.oneOf.filter(valid).length !== 1) fail('does not match exactly one allowed type.')
  for (const child of schema.allOf || []) validateFalSchema(child, value, path, depth + 1, patternTest)
  if (schema.not && valid(schema.not)) fail('matches a prohibited value.')
  if (schema.if) {
    const branch = valid(schema.if) ? schema.then : schema.else
    if (branch) validateFalSchema(branch, value, path, depth + 1, patternTest)
  }
  if (schema.enum && !schema.enum.some((item) => canonical(item) === canonical(value))) fail('is not an available option.')
  if (own(schema, 'const') && canonical(schema.const) !== canonical(value)) fail('does not match the required value.')
  const type = schema.type
  if (type === 'null' && value !== null || type === 'boolean' && typeof value !== 'boolean' || type === 'string' && typeof value !== 'string' || (type === 'number' || type === 'integer') && (typeof value !== 'number' || !Number.isFinite(value)) || type === 'integer' && !Number.isSafeInteger(value) || type === 'array' && !Array.isArray(value) || type === 'object' && !object(value)) fail(`requires ${type}.`)
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && (value < schema.minimum || schema.exclusiveMinimum === true && value === schema.minimum)) fail('is below the allowed minimum.')
    if (schema.maximum !== undefined && (value > schema.maximum || schema.exclusiveMaximum === true && value === schema.maximum)) fail('exceeds the allowed maximum.')
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum || typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) fail('exceeds an exclusive bound.')
    if (schema.multipleOf !== undefined && Math.abs(value / schema.multipleOf - Math.round(value / schema.multipleOf)) > 1e-8) fail('does not match the allowed increment.')
  }
  if (typeof value === 'string') {
    if (schema.pattern !== undefined && !patternTest(schema.pattern, value)) fail('does not match its declared pattern.')
    const length = [...value].length
    if (schema.minLength !== undefined && length < schema.minLength || schema.maxLength !== undefined && length > schema.maxLength) fail('has an invalid length.')
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems || schema.maxItems !== undefined && value.length > schema.maxItems) fail('has an invalid item count.')
    if (schema.uniqueItems && new Set(value.map(canonical)).size !== value.length) fail('requires unique items.')
    if (schema.items) value.forEach((item, index) => validateFalSchema(schema.items!, item, `${path}[${index}]`, depth + 1, patternTest))
  }
  const entries = object(value)
  if (entries) {
    const keys = Object.keys(entries)
    if (schema.minProperties !== undefined && keys.length < schema.minProperties || schema.maxProperties !== undefined && keys.length > schema.maxProperties) fail('has an invalid field count.')
    for (const key of schema.required || []) if (!own(entries, key)) fail(`requires ${key}.`)
    for (const key of keys) {
      if (!safeKey(key)) fail('contains an unsafe field.')
      const declared = schema.properties?.[key]
      if (declared) validateFalSchema(declared, entries[key], `${path}.${key}`, depth + 1, patternTest)
      else if (schema.additionalProperties === false) fail(`does not accept ${key}.`)
      else if (object(schema.additionalProperties)) validateFalSchema(schema.additionalProperties as FalSchemaNode, entries[key], `${path}.${key}`, depth + 1, patternTest)
    }
  }
}
