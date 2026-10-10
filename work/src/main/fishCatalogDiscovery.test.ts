import { describe, expect, it, vi } from 'vitest'
import { fishAdvertisedModels, readFishAdvertisedCatalog, FISH_PUBLIC_OPENAPI } from './fishCatalogDiscovery'
import captured from './fishPublicCatalog.fixtures.json'
import { ScopedCatalogCache } from './scopedCatalogCache'
const document = (ids = ['s1', 's2-pro', 's2.1-pro', 's2.1-pro-free', 'drama-3-preview']) => ({ paths: { '/v1/tts': { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, parameters: [{ name: 'model', in: 'header', schema: { type: 'string', enum: ids, default: 's2.1-pro' } }] } }, '/model': { get: { parameters: [{ in: 'query', name: 'model', schema: { type: 'string', enum: ['VOICE_ID_NOT_ENGINE'] } }] } } } })
describe('Fish advertised inference-engine discovery', () => {
  it('parses the captured official TTS header without treating voice profile IDs as engines', () => {
    expect(fishAdvertisedModels(captured.document)).toEqual({ ids: ['s1', 's2-pro', 's2.1-pro', 's2.1-pro-free', 'drama-3-preview'], defaultModel: 's2.1-pro' })
  })
  it('reads only the exact TTS header, preserves new/removed IDs, and separates public provenance from account access', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(document(['s2.1-pro', 'future-50-inputs']))))
    const catalog = await readFishAdvertisedCatalog(request)
    expect(request).toHaveBeenCalledOnce(); expect(request.mock.calls[0][0]).toBe(FISH_PUBLIC_OPENAPI)
    expect(request.mock.calls[0][1]).toMatchObject({ redirect: 'error' }); expect(request.mock.calls[0][1]).not.toHaveProperty('headers')
    expect(catalog.models.map(model => model.id)).toEqual(['s2.1-pro', 'future-50-inputs'])
    expect(catalog.catalogSource).toBe(FISH_PUBLIC_OPENAPI); expect(catalog.catalogFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(catalog.models.every(model => model.description?.includes('not attested'))).toBe(true)
  })
  it('handles inherited parameters with a declared operation override and bounded local references', () => {
    const raw: any = document(); raw.paths['/v1/tts'].parameters = [{ in: 'header', name: 'model', schema: { enum: ['old-engine'] } }]
    raw.components = { schemas: { Models: { type: 'string', anyOf: [{ const: 's2.1-pro' }, { enum: ['new-engine'] }], default: 's2.1-pro' } } }
    raw.paths['/v1/tts'].post.parameters[0].schema = { $ref: '#/components/schemas/Models' }
    expect(fishAdvertisedModels(raw)).toEqual({ ids: ['s2.1-pro', 'new-engine'], defaultModel: 's2.1-pro' })
  })
  it.each(['duplicate', 'missing', 'arbitrary', 'unbounded-branch', 'external', 'cycle', 'invalid-default', 'header-injection', 'constraint'])('rejects %s without selecting a fallback', kind => {
    const raw: any = document(), operation = raw.paths['/v1/tts'].post, schema = operation.parameters[0].schema
    if (kind === 'duplicate') operation.parameters.push(operation.parameters[0])
    if (kind === 'missing') operation.parameters = []
    if (kind === 'arbitrary') delete schema.enum
    if (kind === 'unbounded-branch') operation.parameters[0].schema = { anyOf: [{ enum: ['s2.1-pro'] }, { type: 'string' }] }
    if (kind === 'external') operation.parameters[0].schema = { $ref: 'https://example.com/schema' }
    if (kind === 'cycle') { operation.parameters[0].schema = { $ref: '#/components/schemas/Loop' }; raw.components = { schemas: { Loop: { $ref: '#/components/schemas/Loop' } } } }
    if (kind === 'invalid-default') schema.default = 'old-retired'
    if (kind === 'header-injection') schema.enum.push('new\r\nAuthorization:private')
    if (kind === 'constraint') schema.not = { enum: ['s1'] }
    expect(() => fishAdvertisedModels(raw)).toThrow()
  })
  it('bounds public bytes and cancels oversize responses', async () => {
    const cancelled = vi.fn(), response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)) }, cancel: cancelled }))
    await expect(readFishAdvertisedCatalog(async () => response)).rejects.toThrow(/supported size/); expect(cancelled).toHaveBeenCalledOnce()
  })
  it('uses the existing scoped cache for coalescing, fresh expiry, stale display and late-account rejection', async () => {
    let time = 0, current = 'project/account-a', resolve!: (value: string) => void
    const cache = new ScopedCatalogCache<string>(300000, () => time), assertCurrent = () => { if (current !== 'project/account-a') throw Error('Owner changed') }
    const loader = vi.fn(() => new Promise<string>(done => { resolve = done }))
    const first = cache.read(current, loader, assertCurrent), second = cache.read(current, loader, assertCurrent); await Promise.resolve(); resolve('first'); expect(await first).toBe('first'); expect(await second).toBe('first'); expect(loader).toHaveBeenCalledOnce()
    time = 300000; await expect(cache.read(current, async () => { throw Error('Malformed refresh') }, assertCurrent)).rejects.toThrow(); expect(cache.snapshot(current)).toBe('first')
    const late = cache.read(current, loader, assertCurrent); await Promise.resolve(); current = 'project/account-b'; resolve('wrong-owner'); await expect(late).rejects.toThrow(/Owner changed/)
    expect(cache.snapshot(current)).toBeUndefined()
  })
})
