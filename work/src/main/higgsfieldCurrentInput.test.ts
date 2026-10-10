import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readHiggsfieldInputContract } from './higgsfieldInputContract'
import { resolveHiggsfieldCurrentInput } from './higgsfieldCurrentInput'
import { higgsfieldSeedanceSchema, HIGGSFIELD_SEEDANCE_INPUT_REVISION } from '../shared/higgsfieldSeedanceInput'
import { HIGGSFIELD_CONTRACT_REVISION, higgsfieldSeedanceRequest, planHiggsfieldNativeInput, type HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import { executeHiggsfieldSeedanceGeneration } from './higgsfieldSeedanceGeneration'
import { HiggsfieldApi } from './higgsfieldApi'
import { HiggsfieldJobStore, higgsfieldCredentialIdentity } from './higgsfieldJobStore'
import { beginHiggsfieldJob, openHiggsfieldSubmission, openHiggsfieldJobSnapshot } from './higgsfieldJobLifecycle'
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function fixture(mode = 'text-to-video') {
  const endpointId = `bytedance/seedance-2.5/${mode}`, schema = higgsfieldSeedanceSchema(endpointId)
  schema.properties!.duration.maximum = 40; schema.properties!.duration.default = 8
  schema.properties!.seed = { type: 'integer', default: 12, minimum: 0 }
  if (mode === 'reference-to-video') schema.properties!.image_urls.maxItems = 40
  const dependencies = { assertCurrent: vi.fn(), readContract: vi.fn(async () => structuredClone(schema)) }
  const contract = await readHiggsfieldInputContract(endpointId, dependencies)
  const request: HiggsfieldNativeRequest = { endpointId, contractRevision: HIGGSFIELD_SEEDANCE_INPUT_REVISION, fingerprint: contract.fingerprint, values: { prompt: '  Authored action.\r\n' }, media: {} }
  return { schema, dependencies, request, contract }
}
describe('main-owned current Higgsfield inputs', () => {
  it('uses changed current defaults and new scalar fields only under their exact digest', async () => {
    const x = await fixture(), before = JSON.stringify(x.request)
    const current = await resolveHiggsfieldCurrentInput(x.request, x.dependencies)
    expect(current.plan.values).toMatchObject({ duration: 8, seed: 12, prompt: x.request.values.prompt })
    expect(JSON.stringify(x.request)).toBe(before)
    expect((await resolveHiggsfieldCurrentInput({ ...x.request, values: { ...x.request.values, duration: 35, seed: 42 } }, x.dependencies)).plan.values).toMatchObject({ duration: 35, seed: 42 })
  })
  it('accepts a changed declared media cap without applying the captured cap', async () => {
    const x = await fixture('reference-to-video')
    x.request.media.image_urls = Array.from({ length: 35 }, (_, i) => ({ mediaType: 'image', url: `https://cdn.prism.example/image-${i}` }))
    const current = await resolveHiggsfieldCurrentInput(x.request, x.dependencies)
    expect(current.plan.preview.image_urls).toHaveLength(35)
    await expect(resolveHiggsfieldCurrentInput({ ...x.request, media: { image_urls: [...x.request.media.image_urls, ...x.request.media.image_urls] } }, x.dependencies)).rejects.toThrow('item count')
  })
  it('rejects a stale digest and unsupported current media shape rather than selecting a fallback', async () => {
    const x = await fixture()
    await expect(resolveHiggsfieldCurrentInput({ ...x.request, fingerprint: 'b'.repeat(64) }, x.dependencies)).rejects.toThrow('inputs changed')
    x.schema.properties!.unknown_url = { type: 'string', format: 'uri' }
    const changed = await readHiggsfieldInputContract(x.request.endpointId, x.dependencies)
    await expect(resolveHiggsfieldCurrentInput({ ...x.request, fingerprint: changed.fingerprint }, x.dependencies)).rejects.toThrow('verified Higgsfield media binding')
  })
  it('rejects renderer schema injection and malformed digests before reading a schema', async () => {
    const x = await fixture(); x.dependencies.readContract.mockClear()
    await expect(resolveHiggsfieldCurrentInput({ ...x.request, fingerprint: '' }, x.dependencies)).rejects.toThrow('current Higgsfield model inputs')
    await expect(resolveHiggsfieldCurrentInput({ ...x.request, inputSchema: x.schema } as HiggsfieldNativeRequest, x.dependencies)).rejects.toThrow('unsupported request field')
    await expect(resolveHiggsfieldCurrentInput({ ...x.request, endpointId:'higgsfield/genjutsu/restyle/v1.0', contractRevision:HIGGSFIELD_CONTRACT_REVISION }, x.dependencies)).rejects.toThrow('Genjutsu does not yet use')
    expect(x.dependencies.readContract).not.toHaveBeenCalled()
  })
  it('rejects non-JSON/cyclic edits before lookup and preserves unsafe named fields for explicit rejection', async () => {
    const x = await fixture(); x.dependencies.readContract.mockClear()
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
    for (const value of [cyclic, new Map(), Infinity, undefined]) {
      await expect(resolveHiggsfieldCurrentInput({ ...x.request, values: { ...x.request.values, seed: value } } as HiggsfieldNativeRequest, x.dependencies)).rejects.toThrow('finite, acyclic JSON')
    }
    expect(x.dependencies.readContract).not.toHaveBeenCalled()
    x.schema.properties = { ...x.schema.properties, constructor: { type: 'integer' as const } }
    const contract = await readHiggsfieldInputContract(x.request.endpointId, x.dependencies)
    const request = { ...x.request, fingerprint: contract.fingerprint, values: { ...x.request.values, constructor: 42 } }, before = JSON.stringify(request)
    expect(Object.hasOwn(planHiggsfieldNativeInput(request).values, 'constructor')).toBe(true)
    await expect(resolveHiggsfieldCurrentInput(request, x.dependencies)).rejects.toThrow('unsafe field')
    expect(JSON.stringify(request)).toBe(before)
  })
  it('keeps arbitrary pattern/JSON validation in the bounded worker and preserves invalid authored values', async () => {
    const x = await fixture(); x.schema.properties!.code = { type: 'string', pattern: '^OK-[0-9]+$' }
    const contract = await readHiggsfieldInputContract(x.request.endpointId, x.dependencies)
    const request = { ...x.request, fingerprint: contract.fingerprint, values: { ...x.request.values, code: 'bad' } }, before = JSON.stringify(request)
    await expect(resolveHiggsfieldCurrentInput(request, x.dependencies)).rejects.toThrow('code')
    expect(JSON.stringify(request)).toBe(before)
    expect((await resolveHiggsfieldCurrentInput({ ...request, values: { ...request.values, code: 'OK-12' } }, x.dependencies)).plan.values.code).toBe('OK-12')
  })
  it('blocks schema changes after preparation and retains the strict captured-default guard for old requests', async () => {
    const x = await fixture(), current = await resolveHiggsfieldCurrentInput(x.request, x.dependencies)
    x.schema.properties!.seed.default = 99
    await expect(current.validateInput(current.plan.preview)).rejects.toThrow('inputs changed')
    const { fingerprint: _fingerprint, ...old } = x.request
    await expect(resolveHiggsfieldCurrentInput(old, x.dependencies)).rejects.toThrow('native default for duration changed')
  })
  it('cannot open a current job/client or prepare media from a digest without a main-owned schema', async () => {
    const x = await fixture(), client = vi.fn(), inspect = vi.fn()
    await expect(executeHiggsfieldSeedanceGeneration(higgsfieldSeedanceRequest(x.request), { assertCurrent: () => {}, inspect, read: vi.fn(), validate: vi.fn(), validateInput: vi.fn(), api: client, persist: vi.fn() })).rejects.toThrow('owned by main')
    expect(client).not.toHaveBeenCalled(); expect(inspect).not.toHaveBeenCalled()
    const root = await mkdtemp(join(tmpdir(), 'prism-current-higgs-')); roots.push(root)
    const store = new HiggsfieldJobStore(root), scope = { projectId: 'fictional', rootPath: '/fixture', documentPath: '/fixture/Example.prismflow', nodeId: 'fixture' }
    await expect(beginHiggsfieldJob(store, scope, 'fixture-profile', x.request, text => Buffer.from(text))).rejects.toThrow('owned by main')
    expect(await store.list(scope)).toEqual([])
  })
  it('submits exact owned defaults/new controls and reopens accepted receipts independently of later schemas', async () => {
    const x = await fixture('reference-to-video'); x.request.values.duration = 35
    x.request.media.image_urls = Array.from({ length: 35 }, (_, i) => ({ mediaType: 'image', url: `https://cdn.prism.example/image-${i}` }))
    const current = await resolveHiggsfieldCurrentInput(x.request, x.dependencies)
    const root = await mkdtemp(join(tmpdir(), 'prism-current-higgs-')); roots.push(root)
    const store = new HiggsfieldJobStore(root), scope = { projectId: 'fictional', rootPath: '/fixture', documentPath: '/fixture/Example.prismflow', nodeId: 'fixture' }
    const lifecycle = await beginHiggsfieldJob(store, scope, 'fixture-profile', x.request, text => Buffer.from(text), current.schema)
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const receipt = openHiggsfieldSubmission(await store.get(scope, lifecycle.record.id), bytes => bytes.toString())!
      expect(init!.body).toBe(receipt.body)
      const body = JSON.parse(receipt.body); expect(body.duration).toBe(35); expect(body.seed).toBe(12); expect(body.image_urls).toHaveLength(35); expect(body.prompt).toBe(x.request.values.prompt)
      return new Response(JSON.stringify({ request_id: 'fixture-request', status: 'completed', video: { url: 'https://cdn.prism.example/Result.mp4', content_type: 'video/mp4' } }))
    })
    const api = new HiggsfieldApi({ key: 'fixture:nonsecret', assertCurrent: () => {}, fetch, observer: lifecycle.observer(higgsfieldCredentialIdentity('fixture:nonsecret')) })
    await executeHiggsfieldSeedanceGeneration(higgsfieldSeedanceRequest(x.request), { inputSchema: current.schema, assertCurrent: () => {}, inspect: vi.fn(), read: vi.fn(), validate: vi.fn(), validateInput: async input => { await current.validateInput(input) }, api: async () => api, persist: async () => ({ path: '/fixture/Result.mp4', url: 'prism://fixture/Result' }) })
    const record = await store.get(scope, lifecycle.record.id)
    x.schema.properties!.duration.maximum = 4; x.dependencies.readContract.mockClear()
    const reopened = openHiggsfieldJobSnapshot(record, bytes => bytes.toString()), receipt = openHiggsfieldSubmission(record, bytes => bytes.toString())!
    expect(reopened.values.duration).toBe(35); expect(reopened.fingerprint).toBe(x.contract.fingerprint); expect(JSON.parse(receipt.body).image_urls).toHaveLength(35)
    expect(x.dependencies.readContract).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledOnce()
  })
})
