import type { ServiceAccountStatus, ServiceModelAvailability, ServiceProvider } from '../../shared/types'
import type { ServiceResponseChannel } from './serviceResponseScope'

export interface ServiceAvailabilityRefreshOptions {
  connected: ServiceProvider[]
  /** Public advertised schemas can refresh without querying a connected account. */
  publicCatalogs?: ServiceProvider[]
  refreshIntervalMs?: number
  models: (provider: ServiceProvider) => Promise<ServiceModelAvailability>
  snapshot?: (provider: ServiceProvider) => Promise<ServiceModelAvailability | undefined>
  account: (provider: ServiceProvider) => Promise<ServiceAccountStatus>
  onModels: (provider: ServiceProvider, availability: ServiceModelAvailability) => void
  onAccount: (provider: ServiceProvider, account: ServiceAccountStatus) => void
  requestGuard?: (provider: ServiceProvider, channel: ServiceResponseChannel) => () => boolean
  onModelsError?: (provider: ServiceProvider, error: unknown) => void
}

export function startServiceAvailabilityRefresh(options: ServiceAvailabilityRefreshOptions): () => void {
  const interval = options.refreshIntervalMs ?? 10 * 60_000
  if (!Number.isFinite(interval) || interval < 30_000) throw new Error('Invalid model refresh interval.')
  let active = true
  const snapshotReads = new Set<ServiceProvider>()
  const pendingModels = new Set<ServiceProvider>(), pendingAccounts = new Set<ServiceProvider>()
  const refresh = () => {
    if (!active) return
    [...new Set([...options.connected, ...(options.publicCatalogs || [])])].forEach((provider) => {
      if (!pendingModels.has(provider)) {
        pendingModels.add(provider)
        const acceptsModels = options.requestGuard?.(provider, 'models') || (() => true)
        void (async () => {
          try {
            // A retained complete catalog is presentation only. Publish it before
            // the potentially paginated live read, under the same owner guard.
            if (options.snapshot && !snapshotReads.has(provider)) {
              snapshotReads.add(provider)
              try {
                const snapshot = await options.snapshot(provider)
                if (snapshot && active && acceptsModels()) options.onModels(provider, snapshot)
              } catch { /* A missing/corrupt cache never prevents fresh discovery. */ }
            }
            if (!active || !acceptsModels()) return
            const availability = await options.models(provider)
            if (active && acceptsModels()) options.onModels(provider, availability)
          } catch (error) {
            if (active && acceptsModels()) options.onModelsError?.(provider, error)
          } finally { pendingModels.delete(provider) }
        })()
      }
      if (provider === 'omniroute' && options.connected.includes(provider) && !pendingAccounts.has(provider)) {
        pendingAccounts.add(provider)
        const acceptsAccount = options.requestGuard?.(provider, 'account') || (() => true)
        void (async () => {
          try {
            const account = await options.account(provider)
            if (active && acceptsAccount()) options.onAccount(provider, account)
          } catch { /* Preserve the previous owned account status. */ }
          finally { pendingAccounts.delete(provider) }
        })()
      }
    })
  }
  refresh()
  const timer = setInterval(refresh, interval)
  timer.unref?.()
  return () => { active = false; clearInterval(timer) }
}
