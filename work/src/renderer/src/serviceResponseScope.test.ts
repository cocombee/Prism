import { describe, expect, it, vi } from 'vitest'
import { createServiceResponseScope } from './serviceResponseScope'
import { startServiceAvailabilityRefresh } from './serviceAvailabilityRefresh'
import type { ServiceAccountStatus, ServiceModelAvailability } from '../../shared/types'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve() }
const catalog: ServiceModelAvailability = { provider: 'omniroute', verified: true, models: [{ id: 'old', label: 'Old' }] }
const account: ServiceAccountStatus = { provider: 'omniroute', state: 'ready', message: 'Ready', checkedAt: '2026-10-08' }

describe('shared service response ownership', () => {
  it('invalidates a changed profile without discarding another provider response', () => {
    const scope = createServiceResponseScope()
    const oldOpenAI = scope.begin('openai', 'models')
    const google = scope.begin('google', 'models')
    scope.invalidate('openai')
    expect(oldOpenAI()).toBe(false)
    expect(google()).toBe(true)
    expect(scope.begin('openai', 'models')()).toBe(true)
  })

  it('rejects all prior owners on project change or unmount even when tokens are reused', () => {
    const scope = createServiceResponseScope()
    const models = scope.begin('openai', 'models')
    const status = scope.begin('google', 'account')
    const generationOwner = scope.capture('byteplus')
    scope.invalidate()
    expect(scope.begin('openai', 'models')()).toBe(true)
    expect(models()).toBe(false)
    expect(status()).toBe(false)
    expect(generationOwner()).toBe(false)
  })

  it('lets only the newest request publish while keeping models and account independent', () => {
    const scope = createServiceResponseScope()
    const old = scope.begin('omniroute', 'models')
    const status = scope.begin('omniroute', 'account')
    const newest = scope.begin('omniroute', 'models')
    expect(old()).toBe(false)
    expect(status()).toBe(true)
    expect(newest()).toBe(true)
  })

  it('does not let an older startup response overwrite a newer manual response', async () => {
    const scope = createServiceResponseScope()
    const olderModels = deferred<ServiceModelAvailability>()
    const olderAccount = deferred<ServiceAccountStatus>()
    const onModels = vi.fn(), onAccount = vi.fn()
    startServiceAvailabilityRefresh({ connected: ['omniroute'], models: () => olderModels.promise, account: () => olderAccount.promise, onModels, onAccount, requestGuard: scope.begin })
    const acceptModels = scope.begin('omniroute', 'models')
    const acceptAccount = scope.begin('omniroute', 'account')
    const newer = { ...catalog, models: [{ id: 'new', label: 'New' }] }
    if (acceptModels()) onModels('omniroute', newer)
    if (acceptAccount()) onAccount('omniroute', account)
    olderModels.resolve(catalog); olderAccount.resolve(account)
    await settle()
    expect(onModels.mock.calls).toEqual([['omniroute', newer]])
    expect(onAccount.mock.calls).toEqual([['omniroute', account]])
  })

  it('rejects late startup models/account after a provider change without needing effect cleanup', async () => {
    const scope = createServiceResponseScope()
    const models = deferred<ServiceModelAvailability>(), status = deferred<ServiceAccountStatus>()
    const onModels = vi.fn(), onAccount = vi.fn()
    startServiceAvailabilityRefresh({ connected: ['omniroute'], models: () => models.promise, account: () => status.promise, onModels, onAccount, requestGuard: scope.begin })
    scope.invalidate('omniroute')
    models.resolve(catalog); status.resolve(account)
    await settle()
    expect(onModels).not.toHaveBeenCalled()
    expect(onAccount).not.toHaveBeenCalled()
  })

  it('retains a generation owner across other refreshes but rejects it when its account changes', () => {
    const scope = createServiceResponseScope()
    const ownsGeneration = scope.capture('byteplus')
    scope.begin('byteplus', 'models')
    scope.begin('byteplus', 'account')
    scope.invalidate('openai')
    expect(ownsGeneration()).toBe(true)
    scope.invalidate('byteplus')
    expect(ownsGeneration()).toBe(false)
  })
})
