import { describe, expect, it, vi } from 'vitest'
import { HiggsfieldContractStore } from './higgsfieldContractStore'
import { createServiceResponseScope } from './serviceResponseScope'
import { describeHiggsfieldInputContract, type HiggsfieldInputContract } from '../../shared/higgsfieldInputContract'
import { HIGGSFIELD_SEEDANCE25_ROUTES, higgsfieldSeedanceSchema } from '../../shared/higgsfieldSeedanceInput'
const endpoint = HIGGSFIELD_SEEDANCE25_ROUTES[0]
const contract = (id = endpoint) => describeHiggsfieldInputContract(id, higgsfieldSeedanceSchema(id), 'a'.repeat(64))
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }

describe('Higgsfield current contract ownership', () => {
  it('coalesces within one owner and expires, with independent cloned snapshots', async () => {
    let now = 0
    const store = new HiggsfieldContractStore(() => now, 10), scope = createServiceResponseScope(), load = vi.fn(async () => contract())
    const [one, two] = await Promise.all([store.read(scope.identity('higgsfield'), endpoint, load, scope.capture('higgsfield')), store.read(scope.identity('higgsfield'), endpoint, load, scope.capture('higgsfield'))])
    expect(load).toHaveBeenCalledTimes(1)
    one.fields[0].label = 'Changed caller'; expect(two.fields[0].label).not.toBe('Changed caller')
    expect((await store.read(scope.identity('higgsfield'), endpoint, load, scope.capture('higgsfield'))).fields[0].label).not.toBe('Changed caller')
    now = 10; await store.read(scope.identity('higgsfield'), endpoint, load, scope.capture('higgsfield')); expect(load).toHaveBeenCalledTimes(2)
  })
  it.each(['profile', 'project'])('rejects late old-%s responses without populating the new owner', async kind => {
    const store = new HiggsfieldContractStore(), scope = createServiceResponseScope(), pending = deferred<HiggsfieldInputContract>(), entered = deferred<void>()
    const first = store.read(scope.identity('higgsfield'), endpoint, async () => { entered.resolve(); return pending.promise }, scope.capture('higgsfield'))
    const failure = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await entered.promise; if (kind === 'profile') scope.invalidate('higgsfield'); else scope.invalidate()
    const next = await store.read(scope.identity('higgsfield'), endpoint, async () => contract(), scope.capture('higgsfield'))
    pending.resolve(contract()); await failure; expect(next.fingerprint).toBe('a'.repeat(64))
  })
  it('explicit refresh invalidates pending reads as well as cached data', async () => {
    const store = new HiggsfieldContractStore(), pending = deferred<HiggsfieldInputContract>(), entered = deferred<void>()
    const first = store.read('owner', endpoint, async () => { entered.resolve(); return pending.promise }, () => true)
    const failure = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await entered.promise; store.invalidate('owner', endpoint)
    const next = await store.read('owner', endpoint, async () => ({ ...contract(), fingerprint: 'b'.repeat(64) }), () => true)
    pending.resolve(contract()); await failure
    expect((await store.read('owner', endpoint, async () => contract(), () => true)).fingerprint).toBe(next.fingerprint)
  })
  it('limits simultaneous transport and rejects wrong endpoint/revision/fingerprint', async () => {
    const store = new HiggsfieldContractStore(), pending = deferred<void>(); let active = 0, maximum = 0
    const reads = HIGGSFIELD_SEEDANCE25_ROUTES.map(id => store.read('owner', id, async () => { active++; maximum = Math.max(maximum, active); await pending.promise; active--; return contract(id) }, () => true))
    await Promise.resolve(); await Promise.resolve(); expect(maximum).toBe(4)
    pending.resolve(); await Promise.all(reads); expect(maximum).toBe(4)
    for (const patch of [{ endpointId: HIGGSFIELD_SEEDANCE25_ROUTES[1] }, { contractRevision: 'old' }, { fingerprint: 'invented' }]) {
      store.invalidate('owner', endpoint)
      await expect(store.read('owner', endpoint, async () => ({ ...contract(), ...patch }), () => true)).rejects.toThrow('identity')
    }
  })
  it('does not turn a failed lookup into a current fallback contract', async () => {
    const store = new HiggsfieldContractStore(), load = vi.fn(async () => { throw new Error('Lookup unavailable') })
    await expect(store.read('owner', endpoint, load, () => true)).rejects.toThrow('Lookup unavailable')
    const next = await store.read('owner', endpoint, async () => contract(), () => true)
    expect(next.endpointId).toBe(endpoint); expect(load).toHaveBeenCalledTimes(1)
  })
})
