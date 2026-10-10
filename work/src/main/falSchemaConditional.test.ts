import { describe, expect, it } from 'vitest'
import { compileFalContractIsolated, validateFalContractValue } from './falSchemaValidation'

const api = (schema: unknown) => ({ paths: {
  '/fal-ai/conditional-fixture': { post: { requestBody: { content: { 'application/json': { schema } } } } },
  '/fal-ai/conditional-fixture/requests/{request_id}': { get: { responses: { '200': { content: { 'application/json': { schema: {} } } } } } },
} })
describe('actual bounded conditional schema workers', () => {
  it('compiles nested branches and evaluates predicates using the isolated regex owner', async () => {
    const contract = await compileFalContractIsolated('fal-ai/conditional-fixture', api({ type: 'object', properties: { colour: { type: 'string' }, count: { type: 'number' } }, if: { required: ['colour'], properties: { colour: { pattern: '^(red|blue)$' } } }, then: { properties: { count: { maximum: 2 } } }, else: { properties: { count: { maximum: 5 } } } }))
    await expect(validateFalContractValue(contract.input, { colour: 'red', count: 2 })).resolves.toBeUndefined()
    await expect(validateFalContractValue(contract.input, { colour: 'red', count: 3 })).rejects.toThrow('maximum')
    await expect(validateFalContractValue(contract.input, { colour: 'green', count: 5 })).resolves.toBeUndefined()
    await expect(validateFalContractValue(contract.input, { colour: 'green', count: 6 })).rejects.toThrow('maximum')
  })
  it('never selects an alternate branch after an invalid expression', async () => {
    await expect(validateFalContractValue({ if: { type: 'string', pattern: '[' }, else: {} }, 'anything')).rejects.toThrow()
  })
  it('bounds a slow conditional predicate and keeps the caller usable afterward', async () => {
    await expect(validateFalContractValue({ if: { type: 'string', pattern: '(a+)+$' }, else: {} }, 'a'.repeat(50_000) + '!', 'Input', 200)).rejects.toThrow('timed out')
    await expect(validateFalContractValue({ if: { const: 1 }, then: { maximum: 2 }, else: {} }, 3)).resolves.toBeUndefined()
  })
  it('preserves boolean schemas through worker compilation and validation', async () => {
    const allowed = await compileFalContractIsolated('fal-ai/conditional-fixture', api(true))
    const rejected = await compileFalContractIsolated('fal-ai/conditional-fixture', api(false))
    await expect(validateFalContractValue(allowed.input, { fixture: true })).resolves.toBeUndefined()
    await expect(validateFalContractValue(rejected.input, { fixture: true })).rejects.toThrow('prohibited')
  })
})
