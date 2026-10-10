import { afterEach, describe, expect, it, vi } from 'vitest'
import { startServiceAvailabilityRefresh } from './serviceAvailabilityRefresh'
import type { ServiceAccountStatus, ServiceModelAvailability } from '../../shared/types'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const catalog: ServiceModelAvailability = { provider: 'omniroute', verified: true, models: [{ id: 'old-account/model', label: 'Old account model' }] }
const account: ServiceAccountStatus = { provider: 'omniroute', state: 'ready', message: 'Old account', checkedAt: '2026-10-08' }
afterEach(() => { vi.useRealTimers() })
const settle = async () => { await Promise.resolve(); await Promise.resolve() }

describe('service availability refresh ownership', () => {
  it('refreshes public Fish engine advertisements without querying credentials/account state and deduplicates connected entries', async () => {
    vi.useFakeTimers()
    const models = vi.fn(async () => ({ ...catalog, provider: 'fish' as const })), loadAccount = vi.fn(), onModels = vi.fn()
    const stop = startServiceAvailabilityRefresh({ connected: [], publicCatalogs: ['fish'], models, account: loadAccount, onModels, onAccount: vi.fn() })
    await settle(); expect(models.mock.calls).toEqual([['fish']]); expect(loadAccount).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10 * 60_000); expect(models.mock.calls).toEqual([['fish'], ['fish']]); expect(onModels).toHaveBeenCalledTimes(2); stop()
    models.mockClear(); const stopConnected = startServiceAvailabilityRefresh({ connected: ['fish'], publicCatalogs: ['fish'], models, account: loadAccount, onModels, onAccount: vi.fn() })
    await settle(); expect(models).toHaveBeenCalledOnce(); expect(loadAccount).not.toHaveBeenCalled(); stopConnected()
  })
  it('refreshes Higgsfield independently of fal and Fish, without overlapping pending public work or polling its account', async () => {
    vi.useFakeTimers()
    const pending = deferred<ServiceModelAvailability>(), account = vi.fn(), onModels = vi.fn()
    const models = vi.fn(async provider => provider === 'higgsfield' ? pending.promise : { provider, verified: true, models: [] })
    const stop = startServiceAvailabilityRefresh({ connected: ['fal', 'higgsfield'], publicCatalogs: ['fish', 'higgsfield'], models, account, onModels, onAccount: vi.fn() })
    await settle(); expect(models.mock.calls.map(call => call[0])).toEqual(['fal','higgsfield','fish'])
    await vi.advanceTimersByTimeAsync(10*60_000)
    expect(models.mock.calls.filter(call => call[0] === 'higgsfield')).toHaveLength(1)
    expect(models.mock.calls.filter(call => call[0] === 'fal')).toHaveLength(2);expect(account).not.toHaveBeenCalled()
    pending.resolve({ provider: 'higgsfield', verified: true, models: [{ id:'future/model-50-references',label:'Future model' }] });await settle()
    expect(onModels).toHaveBeenCalledWith('higgsfield',expect.objectContaining({provider:'higgsfield'}));stop()
  })
  it('reports current model-load errors without reporting errors from a cancelled scope', async () => {
    const failure = new Error('model access denied')
    const older = deferred<ServiceModelAvailability>()
    const onModelsError = vi.fn()
    const stop = startServiceAvailabilityRefresh({ connected: ['elevenlabs'], models: () => older.promise, account: vi.fn(), onModels: vi.fn(), onAccount: vi.fn(), onModelsError })
    stop(); older.reject(failure); await settle()
    expect(onModelsError).not.toHaveBeenCalled()
    startServiceAvailabilityRefresh({ connected: ['elevenlabs'], models: async () => { throw failure }, account: vi.fn(), onModels: vi.fn(), onAccount: vi.fn(), onModelsError })
    await settle()
    expect(onModelsError.mock.calls).toEqual([['elevenlabs', failure]])
  })
  it('does not restore catalog or account responses after disconnection or scope cleanup', async () => {
    const models = deferred<ServiceModelAvailability>()
    const status = deferred<ServiceAccountStatus>()
    const onModels = vi.fn(), onAccount = vi.fn()
    const stop = startServiceAvailabilityRefresh({ connected: ['omniroute'], models: () => models.promise, account: () => status.promise, onModels, onAccount })
    stop()
    models.resolve(catalog); status.resolve(account)
    await settle()
    expect(onModels).not.toHaveBeenCalled()
    expect(onAccount).not.toHaveBeenCalled()
  })

  it('accepts the replacement scope while rejecting older out-of-order responses', async () => {
    const older = deferred<ServiceModelAvailability>()
    const newer = deferred<ServiceModelAvailability>()
    const onModels = vi.fn(), onAccount = vi.fn()
    const stop = startServiceAvailabilityRefresh({ connected: ['openai'], models: () => older.promise, account: vi.fn(), onModels, onAccount })
    stop()
    startServiceAvailabilityRefresh({ connected: ['openai'], models: () => newer.promise, account: vi.fn(), onModels, onAccount })
    const newCatalog = { ...catalog, provider: 'openai' as const, models: [{ id: 'current/model', label: 'Current' }] }
    newer.resolve(newCatalog); await settle()
    older.resolve({ ...catalog, provider: 'openai' }); await settle()
    expect(onModels.mock.calls).toEqual([['openai', newCatalog]])
    expect(onAccount).not.toHaveBeenCalled()
  })

  it('loads only connected catalogs and OmniRoute account state, retaining verified empty catalogs', async () => {
    const empty = { ...catalog, models: [] }
    const models = vi.fn(async () => empty), loadAccount = vi.fn(async () => account)
    const onModels = vi.fn(), onAccount = vi.fn()
    startServiceAvailabilityRefresh({ connected: ['omniroute', 'google'], models, account: loadAccount, onModels, onAccount })
    await settle()
    expect(models.mock.calls).toEqual([['omniroute'], ['google']])
    expect(loadAccount.mock.calls).toEqual([['omniroute']])
    expect(onModels.mock.calls).toEqual([['omniroute', empty], ['google', empty]])
    expect(onAccount.mock.calls).toEqual([['omniroute', account]])
  })

  it('does not replace existing state on a catalog error or prevent another provider from loading', async () => {
    const onModels = vi.fn(), onAccount = vi.fn()
    startServiceAvailabilityRefresh({ connected: ['openai', 'google'], models: async (provider) => {
      if (provider === 'openai') throw new Error('offline')
      return { ...catalog, provider }
    }, account: vi.fn(), onModels, onAccount })
    await settle()
    expect(onModels.mock.calls).toEqual([['google', { ...catalog, provider: 'google' }]])
    expect(onAccount).not.toHaveBeenCalled()
  })
  it('automatically refreshes each native and fal catalog and stops after cleanup', async () => {
    vi.useFakeTimers()
    const models = vi.fn(async (provider) => ({ ...catalog, provider }))
    const stop = startServiceAvailabilityRefresh({ connected: ['fal', 'elevenlabs', 'google'], models, account: vi.fn(), onModels: vi.fn(), onAccount: vi.fn(), refreshIntervalMs: 30_000 })
    await settle(); expect(models).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(30_000); expect(models).toHaveBeenCalledTimes(6)
    stop(); await vi.advanceTimersByTimeAsync(60_000); expect(models).toHaveBeenCalledTimes(6)
  })

  it('does not overlap a slow catalog request with background ticks', async () => {
    vi.useFakeTimers()
    const pending = deferred<ServiceModelAvailability>(), models = vi.fn(() => pending.promise), onModels = vi.fn()
    const stop = startServiceAvailabilityRefresh({ connected: ['fal'], models, account: vi.fn(), onModels, onAccount: vi.fn(), refreshIntervalMs: 30_000 })
    await vi.advanceTimersByTimeAsync(60_000); expect(models).toHaveBeenCalledTimes(1)
    pending.resolve({ ...catalog, provider: 'fal' }); await settle()
    await vi.advanceTimersByTimeAsync(30_000); expect(models).toHaveBeenCalledTimes(2)
    stop()
  })

  it('rejects a late background response superseded by another producer', async () => {
    vi.useFakeTimers()
    const pending = deferred<ServiceModelAvailability>(); let owned = true
    const onModels = vi.fn(), models = vi.fn().mockResolvedValueOnce({ ...catalog, provider: 'fal' }).mockImplementation(() => pending.promise)
    const stop = startServiceAvailabilityRefresh({ connected: ['fal'], models, account: vi.fn(), onModels, onAccount: vi.fn(), refreshIntervalMs: 30_000, requestGuard: () => () => owned })
    await settle(); await vi.advanceTimersByTimeAsync(30_000)
    owned = false; pending.resolve({ ...catalog, provider: 'fal', models: [] }); await settle()
    expect(onModels).toHaveBeenCalledTimes(1); stop()
  })

})
