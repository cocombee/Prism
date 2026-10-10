import { describe, expect, it } from 'vitest'
import { compileFalContractIsolated, validateFalContractValue } from './falSchemaValidation'
import { readFileSync } from 'node:fs'

describe('isolated provider schema validation', () => {
  it('compiles the current captured contract off the main thread and preserves its exact ID and choices', async () => {
    const model = JSON.parse(readFileSync(new URL('../shared/falSchemaCurrentFixture.json', import.meta.url), 'utf8'))
    const contract = await compileFalContractIsolated(model.endpoint_id, model.openapi)
    expect(contract.endpointId).toBe(model.endpoint_id)
    expect(contract.schemaPath).toBe('/fal-ai/seedance-2.5/text-to-video')
    expect(contract.input.properties?.duration.enum).toContain('30')
    await expect(validateFalContractValue(contract.input, { prompt: 'Test only', duration: '30' })).resolves.toBeUndefined()
    await expect(compileFalContractIsolated(model.endpoint_id, { paths: {} })).rejects.toThrow('ambiguous')
  })
  it('honors provider expressions using data, without interpreting them as application code', async () => {
    await expect(validateFalContractValue({ type: 'string', pattern: '^(red|blue)$' }, 'blue')).resolves.toBeUndefined()
    await expect(validateFalContractValue({ type: 'string', pattern: '^(red|blue)$' }, 'green')).rejects.toThrow('pattern')
    await expect(validateFalContractValue({ type: 'string', pattern: '\\S' }, ' ')).rejects.toThrow('pattern')
  })

  it('contains a slow expression within its deadline', async () => {
    await expect(validateFalContractValue({ type: 'string', pattern: '(a+)+$' }, 'a'.repeat(50_000) + '!', 'Input', 200)).rejects.toThrow('timed out')
    // The caller remains usable after termination.
    await expect(validateFalContractValue({ type: 'number', maximum: 10 }, 5)).resolves.toBeUndefined()
  })

  it('applies the same nested alternative semantics as the shared validator', async () => {
    const schema = { type: 'object' as const, required: ['voice'], properties: { voice: { anyOf: [{ type: 'string' as const, pattern: '^(A|B)$' }, { type: 'null' as const }] } } }
    await expect(validateFalContractValue(schema, { voice: null })).resolves.toBeUndefined()
    await expect(validateFalContractValue(schema, { voice: 'B' })).resolves.toBeUndefined()
    await expect(validateFalContractValue(schema, { voice: 'C' })).rejects.toThrow('allowed type')
  })

  it('also bounds non-regex alternative expansion and remains usable afterward', async () => {
    // Eight shared branches at each level grow exponentially even with no regex.
    let schema: Parameters<typeof validateFalContractValue>[0] = { const: false }
    for (let depth = 0; depth < 12; depth++) schema = { oneOf: Array(8).fill(schema) }
    await expect(validateFalContractValue(schema, true, 'Input', 200)).rejects.toThrow('timed out')
    await expect(validateFalContractValue({ type: 'number', minimum: 1 }, 2)).resolves.toBeUndefined()
  })

  it.each([0, 10, Infinity, 5001])('validates every deadline before starting work: %s', async (deadline) => {
    await expect(validateFalContractValue({ type: 'number' }, 1, 'Input', deadline)).rejects.toThrow('deadline')
  })
})
