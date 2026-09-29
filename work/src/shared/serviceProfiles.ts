import type { ProjectWorkspace, ServiceProfile, ServiceProfileRegistry, ServiceProvider } from './types'

export type ServiceProfileTransition = 'disconnect' | 'reconnect' | 'sign-out' | 'delete'

export interface ProjectServiceProfileSelection {
  source: 'project' | 'default' | 'none'
  profile?: ServiceProfile
  available: boolean
  reason?: 'missing' | 'disconnected' | 'signed-out'
}

export function emptyServiceProfileRegistry(): ServiceProfileRegistry {
  return { schemaVersion: 1, localNamingVersion: 1, profiles: [], defaults: {} }
}

export function upsertServiceProfile(registry: ServiceProfileRegistry, incoming: ServiceProfile): ServiceProfileRegistry {
  const matchIndex = registry.profiles.findIndex((profile) =>
    profile.provider === incoming.provider
    && profile.accountIdentifier.trim().toLocaleLowerCase() === incoming.accountIdentifier.trim().toLocaleLowerCase())
  if (matchIndex < 0) return { ...registry, profiles: [...registry.profiles, incoming] }
  const existing = registry.profiles[matchIndex]
  const profiles = [...registry.profiles]
  profiles[matchIndex] = { ...incoming, id: existing.id, createdAt: existing.createdAt }
  return { ...registry, profiles }
}

export function setDefaultServiceProfile(registry: ServiceProfileRegistry, provider: ServiceProvider, profileId?: string): ServiceProfileRegistry {
  if (!profileId) {
    const defaults = { ...registry.defaults }
    delete defaults[provider]
    return { ...registry, defaults }
  }
  const profile = registry.profiles.find((candidate) => candidate.id === profileId && candidate.provider === provider)
  if (!profile) throw new Error('That account profile no longer exists.')
  if (profile.status !== 'connected') throw new Error('Only a connected account can be the default.')
  return { ...registry, defaults: { ...registry.defaults, [provider]: profileId } }
}

export function transitionServiceProfile(registry: ServiceProfileRegistry, profileId: string, transition: ServiceProfileTransition, updatedAt: string): ServiceProfileRegistry {
  const profile = registry.profiles.find((candidate) => candidate.id === profileId)
  if (!profile) throw new Error('That account profile no longer exists.')
  if (transition === 'delete') {
    const defaults = { ...registry.defaults }
    if (defaults[profile.provider] === profileId) delete defaults[profile.provider]
    return { ...registry, profiles: registry.profiles.filter((candidate) => candidate.id !== profileId), defaults }
  }
  const status = transition === 'disconnect' ? 'disconnected'
    : transition === 'reconnect' ? 'connected'
      : 'signed-out'
  return {
    ...registry,
    profiles: registry.profiles.map((candidate) => candidate.id === profileId ? { ...candidate, status, updatedAt } : candidate),
  }
}

export function projectServiceProfileSelection(
  registry: ServiceProfileRegistry,
  project: Pick<ProjectWorkspace, 'serviceProfileOverrides'> | null | undefined,
  provider: ServiceProvider,
): ProjectServiceProfileSelection {
  const projectProfileId = project?.serviceProfileOverrides?.[provider]
  const profileId = projectProfileId || registry.defaults[provider]
  const source = projectProfileId ? 'project' : profileId ? 'default' : 'none'
  if (!profileId) return { source, available: false, reason: 'missing' }
  const profile = registry.profiles.find((candidate) => candidate.id === profileId && candidate.provider === provider)
  if (!profile) return { source, available: false, reason: 'missing' }
  if (profile.status !== 'connected') return { source, profile, available: false, reason: profile.status }
  return { source, profile, available: true }
}

export function withProjectServiceProfileOverride(
  project: ProjectWorkspace,
  provider: ServiceProvider,
  profileId: string | undefined,
): ProjectWorkspace {
  const overrides = { ...(project.serviceProfileOverrides || {}) }
  if (profileId) overrides[provider] = profileId
  else delete overrides[provider]
  return {
    ...project,
    serviceProfileOverrides: Object.keys(overrides).length ? overrides : undefined,
  }
}