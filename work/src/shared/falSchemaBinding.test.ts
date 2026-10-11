import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { describeFalRuntimeInputs } from './falRuntimeInputs'
import { compileFalSchemaContract, validateFalSchema } from './falSchemaBinding'

const fixtures = JSON.parse(readFileSync(new URL('falSchemaBinding.fixtures.json', import.meta.url), 'utf8')) as { models: Array<{ endpoint_id: string; openapi: unknown }> }
const seedance = fixtures.models.find((model) => model.endpoint_id.startsWith('bytedance/'))!
const minimax = fixtures.models[0]
const current = JSON.parse(readFileSync(new URL('falSchemaCurrentFixture.json', import.meta.url), 'utf8')) as { endpoint_id: string; openapi: unknown }
const media = JSON.parse(readFileSync(new URL('falSchemaMedia.fixtures.json', import.meta.url), 'utf8')) as { models: Array<{ endpoint_id: string; openapi: unknown }> }
const inputOf = (schema: unknown) => ({ paths: { '/fal-ai/test': { post: { requestBody: { content: { 'application/json': { schema } } } } }, '/fal-ai/test/requests/{request_id}': { get: { responses: { '200': { content: { 'application/json': { schema: { type: 'object', properties: { image: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } }, required: ['image'] } } } } } } } } })

describe('actual fal OpenAPI model bindings', () => {
  it('preserves captured native file-byte limits without treating URL length as file size', () => {
    const raw = JSON.parse(readFileSync(new URL('falAudioFileLimit.fixture.json', import.meta.url), 'utf8'))
    const contract = compileFalSchemaContract(raw.endpoint_id, raw.openapi)
    const field = describeFalRuntimeInputs(contract).fields.find(field => field.key === 'audio_url')!
    expect(field.control).toBe('media')
    expect(field.media?.maximumBytes).toBe(60_000_000)
    expect(() => compileFalSchemaContract('fal-ai/test', inputOf({type:'string',max_file_size:-1}))).toThrow('file-size')
    expect(() => validateFalSchema({type:'string',maxFileSize:60_000_000},'https://fal.media/audio.wav')).not.toThrow()
  })
  it('loads the captured Wan 2.7 references schema including real video/image inputs', () => {
    const raw = JSON.parse(readFileSync(new URL('falWan27Schema.fixture.json', import.meta.url), 'utf8'))
    const contract = compileFalSchemaContract(raw.endpoint_id, raw.openapi)
    const fields = describeFalRuntimeInputs(contract).fields
    expect(fields.find(field => field.key === 'reference_video_urls')?.media?.type).toBe('video')
    expect(fields.find(field => field.key === 'reference_image_urls')?.media?.type).toBe('image')
    expect(fields.some(field => field.key === 'duration')).toBe(true)
    expect(() => validateFalSchema(contract.input, {prompt:'Owned prompt',duration:1000})).toThrow()
  })
  it('ignores provider UI annotations without dropping validation or acquiring media authority', () => {
    const contract = compileFalSchemaContract('fal-ai/test', inputOf({type:'object',required:['duration'],properties:{duration:{type:'integer',minimum:2,maximum:10,ui:{component:'slider'}},image:{type:'string',ui:{component:'upload'}}}}))
    expect(contract.input.properties?.image.uiField).toBeUndefined()
    expect(() => validateFalSchema(contract.input,{duration:1})).toThrow('minimum')
    expect(() => validateFalSchema(contract.input,{duration:5})).not.toThrow()
    expect(() => compileFalSchemaContract('fal-ai/test',inputOf({type:'string',unknownValidation:true,ui:{}}))).toThrow('unknownValidation')
  })
  it('binds current image/reference contracts including declared video and audio presentation annotations', () => {
    const image = compileFalSchemaContract(media.models[0].endpoint_id, media.models[0].openapi)
    expect(image.input.required).toContain('image_url')
    expect(() => validateFalSchema(image.input, {})).toThrow('image_url')
    expect(() => validateFalSchema(image.input, { image_url: 'https://fal.media/start.png', end_image_url: null })).not.toThrow()
    const reference = compileFalSchemaContract(media.models[1].endpoint_id, media.models[1].openapi)
    expect(reference.input.properties?.video_urls.items?.uiField).toBe('video')
    expect(reference.input.properties?.audio_urls.items?.uiField).toBe('audio')
    expect(() => validateFalSchema(reference.input, { image_urls: ['https://fal.media/image.png'], video_urls: ['https://fal.media/reference.mp4'] })).not.toThrow()
  })
  it('binds the current API schema namespace without changing the exact catalog execution ID', () => {
    const contract = compileFalSchemaContract(current.endpoint_id, current.openapi)
    expect(contract.endpointId).toBe('bytedance/seedance-2.5/text-to-video')
    expect(contract.schemaPath).toBe('/fal-ai/seedance-2.5/text-to-video')
    expect(contract.input.propertyOrder?.slice(0, 4)).toEqual(['prompt', 'resolution', 'draft', 'duration'])
    expect(() => validateFalSchema(contract.input, { prompt: 'Owned final prompt', duration: '30', resolution: '720p' })).not.toThrow()
  })
  it('preserves declared field format and ordering without making schema URLs executable', () => {
    const contract = compileFalSchemaContract('fal-ai/test', inputOf({
      type: 'object', 'x-fal-order-properties': ['video_url', 'prompt'],
      properties: { video_url: { type: 'string', format: 'uri' }, prompt: { type: 'string' } },
    }))
    expect(contract.input.propertyOrder).toEqual(['video_url', 'prompt'])
    expect(contract.input.properties?.video_url.format).toBe('uri')
    // Format is a display annotation; authorized media transport validates URLs.
    expect(() => validateFalSchema(contract.input, { video_url: 'local-reference' })).not.toThrow()
  })
  it('rejects ambiguous namespace alternatives and unpaired result paths', () => {
    const api = inputOf({ type: 'object' })
    expect(() => compileFalSchemaContract('bytedance/test', { paths: {
      ...api.paths, '/fal-ai/another': api.paths['/fal-ai/test'],
    } })).toThrow('ambiguous')
    expect(() => compileFalSchemaContract('bytedance/test', { paths: {
      '/fal-ai/test': api.paths['/fal-ai/test'],
      '/unrelated/requests/{request_id}': api.paths['/fal-ai/test/requests/{request_id}'],
    } })).toThrow('queued result')
  })

  it('prefers the exact declared endpoint pair when unrelated POST operations exist', () => {
    const api = inputOf({ type: 'object', required: ['prompt'] })
    const contract = compileFalSchemaContract('fal-ai/test', { paths: {
      ...api.paths, '/fal-ai/another': api.paths['/fal-ai/test'],
    } })
    expect(contract.schemaPath).toBe('/fal-ai/test')
    expect(contract.input.required).toEqual(['prompt'])
  })
  it('compiles all three actual provider contracts and binds result output rather than queue status', () => {
    for (const model of fixtures.models) {
      const contract = compileFalSchemaContract(model.endpoint_id, model.openapi)
      expect(contract.endpointId).toBe(model.endpoint_id)
      expect(() => validateFalSchema(contract.output, { video: { url: 'https://fal.media/fixture.mp4' }, seed: 42 })).not.toThrow()
      expect(() => validateFalSchema(contract.output, { status: 'COMPLETED', request_id: 'queue-only' })).toThrow('video')
    }
  })

  it('retains the real Seedance string duration choices through 30 seconds', () => {
    const { input } = compileFalSchemaContract(seedance.endpoint_id, seedance.openapi)
    expect(input.properties?.duration.enum).toContain('30')
    expect(() => validateFalSchema(input, { prompt: 'A cyclist crosses the street', duration: '30', resolution: '720p' })).not.toThrow()
    expect(() => validateFalSchema(input, { prompt: 'A cyclist crosses the street', duration: 30 })).toThrow()
    expect(() => validateFalSchema(input, { prompt: 'A cyclist crosses the street', duration: '31' })).toThrow()
  })

  it('preserves MiniMax numeric/fractional durations, uppercase resolutions and required expansion mode', () => {
    const { input } = compileFalSchemaContract(minimax.endpoint_id, minimax.openapi)
    expect(() => validateFalSchema(input, { prompt: 'User prompt', prompt_expansion_mode: 'balanced', duration: 5.75, resolution: '768P' })).not.toThrow()
    expect(() => validateFalSchema(input, { prompt: 'User prompt', duration: 5 })).toThrow('prompt_expansion_mode')
    expect(() => validateFalSchema(input, { prompt: 'User prompt', prompt_expansion_mode: 'balanced', duration: 0.5 })).toThrow('minimum')
    expect(() => validateFalSchema(input, { prompt: 'User prompt', prompt_expansion_mode: 'balanced', resolution: '720p' })).toThrow('available option')
  })

  it('honors reference siblings and nullable variants without dereferencing an external server', () => {
    const api = { ...inputOf({ type: 'object', required: ['media'], properties: { media: { $ref: '#/components/schemas/File', description: 'Original file', nullable: true } } }), components: { schemas: { File: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } } }
    const contract = compileFalSchemaContract('fal-ai/test', api)
    expect(() => validateFalSchema(contract.input, { media: { url: 'https://fal.media/file.png' } })).not.toThrow()
    expect(() => validateFalSchema(contract.input, { media: null })).not.toThrow()
    expect(() => validateFalSchema(contract.input, { media: {} })).toThrow('Input.media')
    const external = inputOf({ $ref: 'https://untrusted.invalid/schema.json' })
    expect(() => compileFalSchemaContract('fal-ai/test', external)).toThrow('external')
  })

  it('rejects missing, recursive or unknown validation contracts before any execution', () => {
    expect(() => compileFalSchemaContract('fal-ai/test', {})).toThrow()
    expect(() => compileFalSchemaContract('fal-ai/test', inputOf({ type: 'object', dependentRequired: { first: ['second'] } }))).toThrow('dependentRequired')
    const recursive = { ...inputOf({ $ref: '#/components/schemas/Loop' }), components: { schemas: { Loop: { $ref: '#/components/schemas/Loop' } } } }
    expect(() => compileFalSchemaContract('fal-ai/test', recursive)).toThrow('recursive')
  })

  it('validates object/array constraints, exact alternatives and safe scalar increments', () => {
    const { input } = compileFalSchemaContract('fal-ai/test', inputOf({ type: 'object', additionalProperties: false, required: ['frames', 'speed'], properties: {
      frames: { type: 'array', minItems: 1, maxItems: 2, uniqueItems: true, items: { type: 'string', minLength: 1 } },
      speed: { type: 'number', minimum: 0, exclusiveMinimum: true, maximum: 2, multipleOf: 0.1 },
      optional: { oneOf: [{ type: 'null' }, { type: 'integer' }] },
    } }))
    expect(() => validateFalSchema(input, { frames: ['A'], speed: 0.3, optional: null })).not.toThrow()
    expect(() => validateFalSchema(input, { frames: ['A', 'A'], speed: 0.3 })).toThrow('unique')
    expect(() => validateFalSchema(input, { frames: ['A'], speed: 0 })).toThrow('minimum')
    expect(() => validateFalSchema(input, { frames: ['A'], speed: 0.33 })).toThrow('increment')
    expect(() => validateFalSchema(input, { frames: ['A'], speed: 0.3, unexpected: true })).toThrow('does not accept')
  })

  it('rejects values that JSON would silently omit or convert and dangerous property keys', () => {
    for (const value of [undefined, Infinity, () => undefined, new Date()]) expect(() => validateFalSchema({}, value)).toThrow()
    expect(() => validateFalSchema({}, JSON.parse('{"__proto__":{"private":"ignored"}}'))).toThrow('unsafe')
    expect(() => compileFalSchemaContract('fal-ai/test', inputOf(JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"}}}')))).toThrow('Unsafe')
  })

  it.each([{ type: [] }, { type: ['string', 'string'] }, { nullable: 'yes' }, { minItems: 1.5 }, { maxLength: 2.5 }])('rejects malformed rule data rather than approximating it: %j', (schema) => {
    expect(() => compileFalSchemaContract('fal-ai/test', inputOf(schema))).toThrow()
  })
})
