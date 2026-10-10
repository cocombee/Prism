import type { ServiceProvider } from '../../shared/types'

export type ServiceResponseChannel = 'models' | 'account' | 'manual'

/** Read-only responses belong to the profile/project that requested them. */
export function createServiceResponseScope() {
  let projectEpoch = 0
  const providerEpochs = new Map<ServiceProvider, number>()
  const requests = new Map<string, number>()

  const capture = (provider: ServiceProvider): (() => boolean) => {
    const project = projectEpoch
    const profile = providerEpochs.get(provider) || 0
    return () => project === projectEpoch && profile === (providerEpochs.get(provider) || 0)
  }

  return {
    capture,
    identity(provider: ServiceProvider): string { return `${projectEpoch}:${providerEpochs.get(provider) || 0}` },
    begin(provider: ServiceProvider, channel: ServiceResponseChannel): () => boolean {
      const ownsProfile = capture(provider)
      const key = `${provider}:${channel}`
      const token = (requests.get(key) || 0) + 1
      requests.set(key, token)
      return () => ownsProfile() && requests.get(key) === token
    },
    invalidate(provider?: ServiceProvider): void {
      if (provider) providerEpochs.set(provider, (providerEpochs.get(provider) || 0) + 1)
      else { projectEpoch += 1; requests.clear() }
    },
  }
}
