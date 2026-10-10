import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { FalModelSchemaCache, readFalModelSchema } from './falSchemaDiscovery'
import type { FalSchemaContract } from '../shared/falSchemaBinding'
import { ProviderRequestState } from './providerRequestState'

const fixtures = JSON.parse(readFileSync(new URL('../shared/falSchemaBinding.fixtures.json', import.meta.url), 'utf8')) as { models: Array<{ endpoint_id: string; metadata: Record<string, unknown>; openapi: unknown }> }
// Captured schemas are minimal fixtures; discovery metadata is explicit mocked data.
const model = { ...fixtures.models[0], metadata: { display_name: 'Fixture video model', category: 'text-to-video', status: 'active' } }
const response = (models: unknown[], extra = {}) => new Response(JSON.stringify({ models, has_more: false, next_cursor: null, ...extra }))
const contract = (id = model.endpoint_id): FalSchemaContract => ({ endpointId: id, schemaPath: `/${id}`, input: { type: 'object' }, output: { type: 'object' } })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r }); return { promise, resolve } }

describe('selected-model schema discovery', () => {
  it('fetches the exact active endpoint contract from the fixed catalog origin', async () => {
    const request = vi.fn(async (_url: string) => response([model])), assertCurrent = vi.fn()
    const result = await readFalModelSchema(model.endpoint_id, { request, assertCurrent })
    const url = new URL(request.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.fal.ai/v1/models')
    expect([...url.searchParams]).toEqual([['endpoint_id', model.endpoint_id], ['expand', 'openapi-3.0']])
    expect(result.endpointId).toBe(model.endpoint_id)
    expect(result.category).toBe(model.metadata.category)
    expect(result.input.properties).toHaveProperty('duration')
    expect(result.output.properties).toHaveProperty('video')
    expect(result.runtime?.fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(result.runtime?.fields.find(field => field.key === 'duration')).toBeDefined()
    expect(assertCurrent.mock.calls.length).toBeGreaterThan(2)
  })

  it.each([
    [], [model, model], [{ ...model, endpoint_id: 'fal-ai/wrong-model' }],
    [{ ...model, metadata: { ...model.metadata, status: 'deprecated' } }],
    [{ ...model, metadata: { ...model.metadata, category: 'image-to-3d' } }],
    [{ ...model, openapi: { paths: {} } }],
  ])('rejects missing, ambiguous, different, inactive, 3D or schema-less endpoints', async (...models) => {
    // The table rows themselves are the entire response model array.
    await expect(readFalModelSchema(model.endpoint_id, { request: async () => response(models), assertCurrent: () => undefined })).rejects.toThrow()
  })

  it('rejects incomplete and oversized responses and preserves provider failures', async () => {
    await expect(readFalModelSchema(model.endpoint_id, { request: async () => response([model], { has_more: true, next_cursor: 'more' }), assertCurrent: () => undefined })).rejects.toThrow('incomplete')
    await expect(readFalModelSchema(model.endpoint_id, { request: async () => new Response(' '.repeat(8 * 1024 * 1024 + 1)), assertCurrent: () => undefined })).rejects.toThrow('supported size')
    await expect(readFalModelSchema(model.endpoint_id, { request: async () => new Response('', { status: 429 }), assertCurrent: () => undefined })).rejects.toMatchObject({ status: 429 })
    const request = vi.fn()
    await expect(readFalModelSchema('../unsafe', { request, assertCurrent: () => undefined })).rejects.toThrow('identifier')
    expect(request).not.toHaveBeenCalled()
  })

  it('does not publish a contract returned after the actual profile request owner changes', async () => {
    const state = new ProviderRequestState<unknown>(), pending = deferred<Response>(), entered = deferred<void>()
    state.activateProject('fixture-project')
    const result = state.run('fal', () => readFalModelSchema(model.endpoint_id, {
      request: async () => { entered.resolve(); return pending.promise }, assertCurrent: () => state.assertCurrent('fal'),
    }))
    await entered.promise
    await state.change('fal', async () => undefined)
    pending.resolve(response([model]))
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('bounded account/project model-contract cache', () => {
  it('keeps pending endpoints coalesced instead of evicting them under retention pressure', async () => {
    const cache = new FalModelSchemaCache(100, 1), pending = deferred<FalSchemaContract>()
    const load = vi.fn(() => pending.promise)
    const first = cache.read('A', model.endpoint_id, load, () => undefined)
    await expect(cache.read('A', 'fal-ai/other', async () => contract('fal-ai/other'), () => undefined)).rejects.toThrow('Too many')
    const duplicate = cache.read('A', model.endpoint_id, load, () => undefined)
    pending.resolve(contract())
    await Promise.all([first, duplicate])
    expect(load).toHaveBeenCalledTimes(1)
    await expect(cache.read('A', 'fal-ai/other', async () => contract('fal-ai/other'), () => undefined)).resolves.toMatchObject({ endpointId: 'fal-ai/other' })
  })

  it('bounds simultaneous transports even when the project/profile scope changes', async () => {
    const cache = new FalModelSchemaCache(), pending = deferred<void>()
    const load = vi.fn(async (id: string) => { await pending.promise; return contract(id) })
    const reads = Array.from({ length: 8 }, (_, index) => {
      const id = `fal-ai/model-${index}`
      return cache.read('A', id, () => load(id), () => undefined)
    })
    await Promise.resolve()
    const extra = vi.fn(async () => contract('fal-ai/extra'))
    await expect(cache.read('B', 'fal-ai/extra', extra, () => undefined)).rejects.toThrow('Too many')
    expect(extra).not.toHaveBeenCalled()
    pending.resolve(); await Promise.all(reads)
    await expect(cache.read('B', 'fal-ai/extra', extra, () => undefined)).resolves.toMatchObject({ endpointId: 'fal-ai/extra' })
    expect(load).toHaveBeenCalledTimes(8)
  })

  it('coalesces each endpoint separately, expires by TTL, and clears on account scope change', async () => {
    let now = 0; const cache = new FalModelSchemaCache(100, 2, () => now), pending = deferred<FalSchemaContract>()
    const first = vi.fn(() => pending.promise), second = vi.fn(async () => contract('fal-ai/other'))
    const a = cache.read('profile-A', model.endpoint_id, first, () => undefined)
    const duplicate = cache.read('profile-A', model.endpoint_id, first, () => undefined)
    await cache.read('profile-A', 'fal-ai/other', second, () => undefined)
    pending.resolve(contract()); await Promise.all([a, duplicate])
    expect(first).toHaveBeenCalledTimes(1)
    await cache.read('profile-A', model.endpoint_id, first, () => undefined)
    expect(first).toHaveBeenCalledTimes(1)
    now = 100
    await cache.read('profile-A', model.endpoint_id, first, () => undefined)
    expect(first).toHaveBeenCalledTimes(2)
    await cache.read('profile-B', model.endpoint_id, first, () => undefined)
    expect(first).toHaveBeenCalledTimes(3)
  })

  it('bounds retention and refuses stale or identity-mismatched execution contracts', async () => {
    const cache = new FalModelSchemaCache(1, 1, () => now); let now = 0
    const original = vi.fn(async () => contract())
    await cache.read('A', model.endpoint_id, original, () => undefined)
    await cache.read('A', 'fal-ai/other', async () => contract('fal-ai/other'), () => undefined)
    await cache.read('A', model.endpoint_id, original, () => undefined)
    expect(original).toHaveBeenCalledTimes(2)
    now = 1
    await expect(cache.read('A', model.endpoint_id, async () => { throw new Error('refresh failed') }, () => undefined)).rejects.toThrow('refresh failed')
    await expect(cache.read('B', model.endpoint_id, async () => contract('fal-ai/different'), () => undefined)).rejects.toThrow('identity changed')
  })
})
