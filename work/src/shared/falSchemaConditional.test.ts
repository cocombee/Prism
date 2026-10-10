import { describe, expect, it } from 'vitest'
import { compileFalSchemaContract, validateFalSchema } from './falSchemaBinding'
import { describeFalRuntimeInputs } from './falRuntimeInputs'

export const conditionalApi = (schema: unknown) => ({ paths: {
  '/fal-ai/conditional-fixture': { post: { requestBody: { content: { 'application/json': { schema } } } } },
  '/fal-ai/conditional-fixture/requests/{request_id}': { get: { responses: { '200': { content: { 'application/json': { schema: {} } } } } } },
} })
const input = (schema: unknown) => compileFalSchemaContract('fal-ai/conditional-fixture', conditionalApi(schema)).input

describe('provider JSON schema conditionals retain declared validation', () => {
  it('keeps conditional root forms unavailable until their control/media projection is reviewed', () => {
    const contract = compileFalSchemaContract('fal-ai/conditional-fixture', conditionalApi({ type: 'object', properties: { mode: { type: 'string' } }, if: { required: ['mode'] }, then: { required: ['extra'] } }))
    expect(describeFalRuntimeInputs(contract).unsupportedInputs).toContainEqual(expect.objectContaining({ key: '$conditional' }))
    expect(contract.input.then?.required).toEqual(['extra'])
  })
  it('validates exactly the selected branch and still enforces independent root constraints', () => {
    const schema = input({ type: 'object', additionalProperties: false, properties: { mode: { enum: ['fast', 'slow'] }, count: { type: 'integer', minimum: 1 } },
      if: { required: ['mode'], properties: { mode: { const: 'fast' } } }, then: { required: ['count'], properties: { count: { maximum: 2 } } }, else: { properties: { count: { maximum: 5 } } },
    })
    expect(() => validateFalSchema(schema, { mode: 'fast', count: 2 })).not.toThrow()
    expect(() => validateFalSchema(schema, { mode: 'slow', count: 5 })).not.toThrow()
    for (const value of [{ mode: 'fast' }, { mode: 'fast', count: 3 }, { mode: 'slow', count: 6 }, { mode: 'slow', count: 0 }, { mode: 'fast', count: '2' }, { mode: 'fast', count: 2, invented: true }]) expect(() => validateFalSchema(schema, value)).toThrow()
  })
  it('does not insert defaults or implicitly require a property in a predicate', () => {
    const schema = input({ type: 'object', properties: { mode: { default: 'slow' }, value: {} }, if: { properties: { mode: { const: 'fast' } } }, then: { required: ['value'] } })
    const absent = {}
    expect(() => validateFalSchema(schema, absent)).toThrow('value')
    expect(absent).toEqual({})
    expect(() => validateFalSchema(schema, { mode: 'slow' })).not.toThrow()
  })
  it('ignores then/else without if and treats an absent selected branch as unrestricted', () => {
    expect(() => validateFalSchema(input({ then: false, else: false }), 3)).not.toThrow()
    expect(() => validateFalSchema(input({ if: true, else: false }), 3)).not.toThrow()
    expect(() => validateFalSchema(input({ if: false, then: false }), 3)).not.toThrow()
  })
  it('supports boolean root, nested branch and item schemas without turning false into missing data', () => {
    expect(() => validateFalSchema(input(true), { arbitrary: 'JSON' })).not.toThrow()
    expect(() => validateFalSchema(input(false), {})).toThrow('prohibited')
    expect(() => validateFalSchema(input({ if: true, then: false }), {})).toThrow('prohibited')
    expect(() => validateFalSchema(input({ if: false, else: false }), {})).toThrow('prohibited')
    expect(() => validateFalSchema(input({ type: 'array', items: false }), [])).not.toThrow()
    expect(() => validateFalSchema(input({ type: 'array', items: false }), [1])).toThrow('prohibited')
  })
  it('supports conditional local references, allOf and nullable siblings', () => {
    const document = conditionalApi({ $ref: '#/components/schemas/Conditional', nullable: true })
    const schema = compileFalSchemaContract('fal-ai/conditional-fixture', { ...document, components: { schemas: { Conditional: { allOf: [{ type: 'object' }, { if: { required: ['flag'] }, then: { required: ['value'] } }] } } } }).input
    expect(() => validateFalSchema(schema, null)).not.toThrow()
    expect(() => validateFalSchema(schema, {})).not.toThrow()
    expect(() => validateFalSchema(schema, { flag: false })).toThrow()
    expect(() => validateFalSchema(schema, { flag: false, value: 0 })).not.toThrow()
  })
  it('does not use the else branch or another alternative when predicate evaluation is unavailable', () => {
    const complex = { type: 'string' as const, pattern: '^(red|blue)$' }
    for (const schema of [{ if: complex, else: {} }, { anyOf: [complex, {}] }, { not: complex }]) expect(() => validateFalSchema(schema, 'green')).toThrow('isolated validation')
  })
  it('does not hide depth exhaustion as a false predicate', () => {
    let schema = input({ if: true, then: true })
    for (let i = 0; i < 35; i++) schema = { if: schema, else: {} }
    expect(() => validateFalSchema(schema, {})).toThrow('depth')
  })
  it.each([null, 5, 'true', [], { unsupportedConstraint: true }])('rejects malformed or unsupported conditional schemas: %j', child => {
    expect(() => input({ if: child, then: {} })).toThrow()
  })
})
