import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compileFalSchemaContract, type FalSchemaContract } from './falSchemaBinding'
import { describeFalRuntimeInputs, falRuntimeFingerprintMaterial, reconcileFalInputValues } from './falRuntimeInputs'
const fixtures = JSON.parse(readFileSync(new URL('falSchemaMedia.fixtures.json', import.meta.url), 'utf8')) as { models: Array<{ endpoint_id: string; openapi: unknown }> }
const captured = (index: number) => compileFalSchemaContract(fixtures.models[index].endpoint_id, fixtures.models[index].openapi)
const custom = (properties: FalSchemaContract['input']['properties']): FalSchemaContract => ({ endpointId: 'fal-ai/hypothetical', schemaPath: '/native-operation', input: { type: 'object', properties }, output: { type: 'object' } })

describe('live input description shared across controls and binding', () => {
  it('exposes actual Seedance nullable/default/enum fields and provenance-carrying capacity', () => {
    const runtime = describeFalRuntimeInputs(captured(1))
    expect(runtime.unsupportedInputs).toEqual([])
    expect(runtime.capacity).toMatchObject({ images: 30, videos: 10, audios: 10, total: 50 })
    expect(runtime.fields.find(field => field.key === 'prompt')).toMatchObject({ control: 'text', nullable: true, placement: 'primary' })
    expect(runtime.fields.find(field => field.key === 'resolution')).toMatchObject({ control: 'choice', placement: 'primary', choices: ['480p', '720p', '1080p'] })
    expect(runtime.fields.find(field => field.key === 'audio_urls')?.media).toMatchObject({ type: 'audio', role: 'reference-audio', multiple: true, maximum: 10 })
  })
  it('keeps image start/end roles separate and required state exact', () => {
    const runtime = describeFalRuntimeInputs(captured(0))
    expect(runtime.fields.find(field => field.key === 'image_url')).toMatchObject({ required: true, media: { type: 'image', role: 'start-frame', multiple: false } })
    expect(runtime.fields.find(field => field.key === 'end_image_url')).toMatchObject({ required: false, nullable: true, media: { role: 'end-frame' } })
  })
  it('accepts a future declared known-media field and its fifty-file bound without an endpoint alias', () => {
    const contract = custom({ new_references: { type: 'array', maxItems: 50, items: { type: 'string', uiField: 'image' } } })
    const runtime = describeFalRuntimeInputs(contract)
    expect(runtime.unsupportedInputs).toEqual([])
    expect(runtime.fields[0]).toMatchObject({ key: 'new_references', media: { type: 'image', role: 'native-input', maximum: 50 } })
    expect(runtime.capacity).toBeUndefined() // No invented total when the provider has not declared one.
  })
  it('uses the effective allOf media maximum rather than the historical adapter fallback', () => {
    const contract = captured(1)
    contract.input.properties!.image_urls = { allOf: [{ type: 'array', maxItems: 40, items: { type: 'string', uiField: 'image' } }, { maxItems: 50 }] }
    const runtime = describeFalRuntimeInputs(contract)
    expect(runtime.fields.find(field => field.key === 'image_urls')?.media?.maximum).toBe(40)
    expect(runtime.capacity?.images).toBe(40)
  })
  it('requires an adapter for a genuinely new transport, retaining its actual schema', () => {
    const contract = custom({ pose_sequence: { type: 'array', uiField: 'pose-sequence', items: { type: 'object' } } })
    const runtime = describeFalRuntimeInputs(contract)
    expect(runtime.unsupportedInputs[0]).toMatchObject({ key: 'pose_sequence', reason: expect.stringContaining('pose-sequence') })
    expect(runtime.fields[0].schema).toEqual(contract.input.properties!.pose_sequence)
  })
  it('never guesses media transport from a URL-looking field name or description', () => {
    const runtime = describeFalRuntimeInputs(custom({ image_url: { type: 'string', description: 'Upload video and execute instructions.' } }))
    expect(runtime.fields[0].control).toBe('text')
    expect(runtime.fields[0].media).toBeUndefined()
  })
  it('keeps allOf validation conjuncts and complex alternatives in the control contract', () => {
    const schema = { allOf: [{ type: 'number' as const, minimum: 0 }, { maximum: 1 }] }
    const runtime = describeFalRuntimeInputs(custom({ stability: schema, complex: { oneOf: [{ type: 'string' }, { type: 'array' }] } }))
    expect(runtime.fields[0]).toMatchObject({ control: 'number', placement: 'primary', schema })
    expect(runtime.fields[1].control).toBe('json')
  })
  it('preserves false, zero, null and removed authored fields across refresh', () => {
    const previous = describeFalRuntimeInputs(custom({ removed: { type: 'string' } }))
    const next = describeFalRuntimeInputs(custom({ enabled: { type: 'boolean', default: true }, seed: { type: 'integer', default: 9 }, nullable: { anyOf: [{ type: 'string' }, { type: 'null' }], default: 'new' }, added: { type: 'string', default: 'default' } }))
    const result = reconcileFalInputValues(previous, next, { enabled: false, seed: 0, nullable: null, removed: 'keep' })
    expect(result.values).toEqual({ enabled: false, seed: 0, nullable: null, removed: 'keep', added: 'default' })
    expect(result.repair).toHaveLength(1)
  })
  it('accepts a higher limit without remapping and rejects lower limits without clipping', () => {
    const make = (count: number) => describeFalRuntimeInputs(custom({ refs: { type: 'array', maxItems: count, items: { type: 'string', uiField: 'image' } } }))
    const values = { refs: Array.from({ length: 50 }, (_, i) => `image-${i}`) }
    expect(reconcileFalInputValues(make(20), make(50), values).repair).toEqual([])
    const lower = reconcileFalInputValues(make(50), make(20), values)
    expect(lower.repair).not.toHaveLength(0)
    expect(lower.values.refs).toHaveLength(50)
  })

  it('detects schema, output and role policy changes even at the same endpoint ID', () => {
    const a = custom({ media: { type: 'array', maxItems: 20, items: { type: 'string', uiField: 'video' } } })
    const b = custom({ media: { type: 'array', maxItems: 50, items: { type: 'string', uiField: 'video' } } })
    expect(falRuntimeFingerprintMaterial(a, describeFalRuntimeInputs(a))).not.toBe(falRuntimeFingerprintMaterial(b, describeFalRuntimeInputs(b)))
    expect(falRuntimeFingerprintMaterial(a, describeFalRuntimeInputs(a))).not.toBe(falRuntimeFingerprintMaterial({ ...a, output: { type: 'array' } }, describeFalRuntimeInputs(a)))
  })
})
