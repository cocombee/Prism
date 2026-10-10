import { describe, expect, it, vi } from 'vitest'
import { FalContractStore } from './falContractStore'
import { createServiceResponseScope } from './serviceResponseScope'
import type { FalSchemaContract } from '../../shared/falSchemaBinding'
const contract = (endpointId = 'fixture/model'): FalSchemaContract => ({ endpointId, schemaPath: '/native', input: {}, output: {}, runtime: { adapterRevision: 'fixture', fields: [], unsupportedInputs: [], fingerprint: 'a'.repeat(64) } })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }

describe('owned renderer contract producer', () => {
  it('coalesces only the current profile/project scope and expires its lease', async () => {
    let now = 0; const store = new FalContractStore(() => now, 10), scope = createServiceResponseScope(), load = vi.fn(async () => contract())
    await Promise.all([store.read(scope.identity('fal'), 'fixture/model', load, scope.capture('fal')), store.read(scope.identity('fal'), 'fixture/model', load, scope.capture('fal'))])
    expect(load).toHaveBeenCalledTimes(1)
    await store.read(scope.identity('fal'), 'fixture/model', load, scope.capture('fal')); expect(load).toHaveBeenCalledTimes(1)
    now = 10; await store.read(scope.identity('fal'), 'fixture/model', load, scope.capture('fal')); expect(load).toHaveBeenCalledTimes(2)
    store.invalidate(scope.identity('fal'), 'fixture/model'); await store.read(scope.identity('fal'), 'fixture/model', load, scope.capture('fal')); expect(load).toHaveBeenCalledTimes(3)
    scope.invalidate('fal'); await store.read(scope.identity('fal'), 'fixture/model', load, scope.capture('fal')); expect(load).toHaveBeenCalledTimes(4)
  })
  it('rejects a late old-account response and lets the new account load independently', async () => {
    const store = new FalContractStore(), scope = createServiceResponseScope(), a = deferred<FalSchemaContract>(), entered = deferred<void>()
    const first = store.read(scope.identity('fal'), 'fixture/model', async () => { entered.resolve(); return a.promise }, scope.capture('fal'))
    await entered.promise; scope.invalidate('fal')
    const b = await store.read(scope.identity('fal'), 'fixture/model', async () => contract(), scope.capture('fal'))
    a.resolve(contract()); await expect(first).rejects.toMatchObject({ name: 'AbortError' }); expect(b.endpointId).toBe('fixture/model')
  })
  it('queues ten endpoints with at most four simultaneous transports and rejects wrong identities', async () => {
    const store = new FalContractStore(), pending = deferred<void>(); let active = 0, maximum = 0
    const reads = Array.from({ length: 10 }, (_, i) => store.read('A', `fixture/model-${i}`, async () => { active++; maximum = Math.max(maximum, active); await pending.promise; active--; return contract(`fixture/model-${i}`) }, () => true))
    await Promise.resolve(); await Promise.resolve(); expect(maximum).toBe(4)
    pending.resolve(); await Promise.all(reads); expect(maximum).toBe(4)
    await expect(store.read('A', 'fixture/bad', async () => contract('fixture/other'), () => true)).rejects.toThrow('identity')
  })
})
