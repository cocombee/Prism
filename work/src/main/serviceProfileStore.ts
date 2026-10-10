import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ServiceProfile, ServiceProfileRegistry, ServiceProvider } from '../shared/types'
import {
  emptyServiceProfileRegistry,
  projectServiceProfileSelection,
  setDefaultServiceProfile,
  transitionServiceProfile,
  upsertServiceProfile,
  type ServiceProfileTransition,
} from '../shared/serviceProfiles'

interface ServiceProfileStoreOptions {
  dataRoot: string
  encryptString: (value: string) => Buffer
  decryptString: (value: Buffer) => string
  now?: () => string
  createId?: () => string
}

function nextAccountName(registry: ServiceProfileRegistry, provider: ServiceProvider) {
  const providerProfiles = registry.profiles.filter((profile) => profile.provider === provider)
  const highestSequence = providerProfiles.reduce((highest, profile) => {
    const match = /^Account (\d+)$/i.exec(profile.displayName || '')
    return Math.max(highest, match ? Number(match[1]) : 0)
  }, 0)
  const sequence = Math.max(providerProfiles.length, highestSequence) + 1
  return `Account ${String(sequence).padStart(2, '0')}`
}

function profileName(profile: ServiceProfile): string { return profile.displayName || profile.accountIdentifier }

function markProfileManaged(registry: ServiceProfileRegistry, provider: ServiceProvider): ServiceProfileRegistry {
  return { ...registry, profileManagedProviders: [...new Set([...(registry.profileManagedProviders || []), provider])] }
}

export class ServiceProfileStore {
  private readonly options: ServiceProfileStoreOptions
  private mutation = Promise.resolve()

  constructor(options: ServiceProfileStoreOptions) {
    this.options = options
  }

  async listProfiles(provider: ServiceProvider, refresh: boolean): Promise<ServiceProfileRegistry> {
    return this.exclusive(async () => {
      let registry = await this.readRegistry()
      if (refresh && !registry.profiles.some((profile) => profile.provider === provider) && !registry.profileManagedProviders?.includes(provider)) {
        const legacyPath = await this.legacyCredentialPath(provider)
        if (legacyPath) registry = await this.migrateLegacyCredential(registry, provider, legacyPath)
      }
      return registry
    })
  }

  async addProfile(provider: ServiceProvider, rawKey: string, expectedProfileId?: string): Promise<ServiceProfileRegistry> {
    return this.exclusive(async () => {
      const key = rawKey.trim()
      if (key.length < 20) throw new Error('That API key does not look complete.')
      let registry = await this.readRegistry()
      const requested = expectedProfileId ? registry.profiles.find((profile) => profile.id === expectedProfileId && profile.provider === provider) : undefined
      if (expectedProfileId && !requested) throw new Error('That signed-out account no longer exists.')
      const now = this.now()
      const profileId = requested?.id || this.createId()
      const incoming: ServiceProfile = {
        id: profileId,
        provider,
        accountIdentifier: requested?.accountIdentifier || profileId,
        displayName: requested?.displayName || nextAccountName(registry, provider),
        status: 'connected',
        createdAt: requested?.createdAt || now,
        updatedAt: now,
      }
      registry = markProfileManaged(upsertServiceProfile(registry, incoming), provider)
      await this.writeCredential(provider, profileId, key)
      if (!registry.defaults[provider]) registry = setDefaultServiceProfile(registry, provider, profileId)
      await this.writeRegistry(registry)
      return registry
    })
  }

  async transitionProfile(profileId: string, transition: ServiceProfileTransition): Promise<ServiceProfileRegistry> {
    return this.exclusive(async () => {
      let registry = await this.readRegistry()
      const profile = registry.profiles.find((candidate) => candidate.id === profileId)
      if (!profile) throw new Error('That account profile no longer exists.')
      if (transition === 'reconnect') this.options.decryptString(await readFile(this.profileCredentialPath(profile.provider, profile.id)))
      registry = markProfileManaged(transitionServiceProfile(registry, profileId, transition, this.now()), profile.provider)
      await this.writeRegistry(registry)
      if (transition === 'sign-out' || transition === 'delete') await unlink(this.profileCredentialPath(profile.provider, profile.id)).catch(() => undefined)
      return registry
    })
  }

  async setDefault(provider: ServiceProvider, profileId?: string): Promise<ServiceProfileRegistry> {
    return this.exclusive(async () => {
      const registry = setDefaultServiceProfile(await this.readRegistry(), provider, profileId)
      await this.writeRegistry(registry)
      return registry
    })
  }

  async renameProfile(profileId: string, displayName: string): Promise<ServiceProfileRegistry> {
    return this.exclusive(async () => {
      const name = displayName.trim()
      if (!name) throw new Error('Enter an account profile name.')
      if (name.length > 100) throw new Error('Keep the account profile name under 100 characters.')
      let registry = await this.readRegistry()
      const profile = registry.profiles.find((candidate) => candidate.id === profileId)
      if (!profile) throw new Error('That account profile no longer exists.')
      registry = upsertServiceProfile(registry, { ...profile, displayName: name, updatedAt: this.now() })
      await this.writeRegistry(registry)
      return registry
    })
  }

  async isConnectedForProject(provider: ServiceProvider, overrides?: Partial<Record<ServiceProvider, string>>): Promise<boolean> {
    return this.exclusive(async () => {
      const registry = await this.readRegistry()
      const selection = projectServiceProfileSelection(registry, { serviceProfileOverrides: overrides }, provider)
      if (selection.profile) return selection.available && await this.exists(this.profileCredentialPath(provider, selection.profile.id))
      if (selection.source !== 'none' || registry.profiles.some((profile) => profile.provider === provider) || registry.profileManagedProviders?.includes(provider)) return false
      // Status does not decrypt keys, migrate files or select between old accounts.
      return (await this.legacyCredentialCandidates(provider)).length === 1
    })
  }

  async loadCredentialForProject(provider: ServiceProvider, overrides?: Partial<Record<ServiceProvider, string>>): Promise<string> {
    return this.exclusive(async () => {
      const registry = await this.readRegistry()
      const selection = projectServiceProfileSelection(registry, { serviceProfileOverrides: overrides }, provider)
      if (selection.source === 'none' && !registry.profiles.some((profile) => profile.provider === provider) && !registry.profileManagedProviders?.includes(provider)) {
        const legacyPath = await this.legacyCredentialPath(provider)
        if (legacyPath) return this.options.decryptString(await readFile(legacyPath))
      }
      if (!selection.profile) {
        if (selection.source === 'project') throw new Error('The account selected for this project no longer exists. Choose another account in Connections.')
        throw new Error(`Choose a ${provider === 'fal' ? 'fal.ai' : provider} account in Connections before running.`)
      }
      if (!selection.available) {
        const state = selection.reason === 'signed-out' ? 'signed out' : 'disconnected'
        throw new Error(`The ${profileName(selection.profile)} account is ${state}. Reconnect or sign in from Connections.`)
      }
      try {
        return this.options.decryptString(await readFile(this.profileCredentialPath(provider, selection.profile.id)))
      } catch {
        throw new Error(`Sign in to ${profileName(selection.profile)} again from Connections.`)
      }
    })
  }

  private async migrateLegacyCredential(registry: ServiceProfileRegistry, provider: ServiceProvider, legacyPath: string): Promise<ServiceProfileRegistry> {
    const key = this.options.decryptString(await readFile(legacyPath))
    const now = this.now()
    const profile: ServiceProfile = {
      id: this.createId(),
      provider,
      accountIdentifier: '',
      displayName: nextAccountName(registry, provider),
      status: 'connected',
      createdAt: now,
      updatedAt: now,
    }
    profile.accountIdentifier = profile.id
    let next = markProfileManaged(upsertServiceProfile(registry, profile), provider)
    next = setDefaultServiceProfile(next, provider, profile.id)
    await this.writeCredential(provider, profile.id, key)
    await this.writeRegistry(next)
    await unlink(legacyPath)
    return next
  }

  private registryPath(): string { return join(this.options.dataRoot, 'service-profiles.json') }
  private profilesRoot(): string { return join(this.options.dataRoot, 'service-profiles') }
  private async legacyCredentialCandidates(provider: ServiceProvider): Promise<string[]> {
    const paths = provider === 'fal' ? [join(this.options.dataRoot, 'credential.enc')]
      : [join(this.options.dataRoot, 'service-credentials', `${provider}.enc`), join(this.options.dataRoot, `${provider}-credential.enc`)]
    const existing = await Promise.all(paths.map(async (path) => await this.exists(path) ? path : undefined))
    return existing.filter((path): path is string => Boolean(path))
  }

  private async legacyCredentialPath(provider: ServiceProvider): Promise<string | undefined> {
    const candidates = await this.legacyCredentialCandidates(provider)
    if (candidates.length > 1) throw new Error('Multiple legacy credentials exist for this service. Sign in to an explicit account in Connections; the old files are preserved.')
    return candidates[0]
  }

  private profileCredentialPath(provider: ServiceProvider, profileId: string): string {
    if (!/^[a-zA-Z0-9-]+$/.test(profileId)) throw new Error('Invalid service profile id.')
    return join(this.profilesRoot(), provider, `${profileId}.enc`)
  }

  private async writeCredential(provider: ServiceProvider, profileId: string, key: string): Promise<void> {
    const path = this.profileCredentialPath(provider, profileId)
    await mkdir(join(this.profilesRoot(), provider), { recursive: true })
    const temporary = `${path}.tmp`
    await writeFile(temporary, this.options.encryptString(key), { flag: 'w', mode: 0o600 })
    await rename(temporary, path)
  }

  private async readRegistry(): Promise<ServiceProfileRegistry> {
    try {
      const parsed = JSON.parse(await readFile(this.registryPath(), 'utf8')) as ServiceProfileRegistry
      if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.profiles) || !parsed.defaults || typeof parsed.defaults !== 'object' || (parsed.profileManagedProviders !== undefined && !Array.isArray(parsed.profileManagedProviders))) throw new Error('Invalid service profile registry.')
      const resetToLocalNames = parsed.localNamingVersion !== 1
      const providerCounts = new Map<ServiceProvider, number>()
      return {
        ...parsed,
        localNamingVersion: 1,
        profiles: parsed.profiles.map((profile) => {
          const number = (providerCounts.get(profile.provider) || 0) + 1
          providerCounts.set(profile.provider, number)
          const { balance: _balance, currency: _currency, balanceCheckedAt: _balanceCheckedAt, ...metadata } = profile
          return {
            ...metadata,
            accountIdentifier: profile.id,
            displayName: resetToLocalNames || profile.accountIdentifier !== profile.id ? `Account ${String(number).padStart(2, '0')}` : profile.displayName || `Account ${String(number).padStart(2, '0')}`,
          }
        }),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyServiceProfileRegistry()
      throw error
    }
  }

  private async writeRegistry(registry: ServiceProfileRegistry): Promise<void> {
    await mkdir(this.options.dataRoot, { recursive: true })
    const path = this.registryPath()
    const temporary = `${path}.tmp`
    await writeFile(temporary, JSON.stringify(registry, null, 2), { flag: 'w', mode: 0o600 })
    await rename(temporary, path)
  }

  private async exists(path: string): Promise<boolean> {
    try { return (await stat(path)).isFile() } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error }
  }

  private now(): string { return this.options.now?.() || new Date().toISOString() }
  private createId(): string { return this.options.createId?.() || crypto.randomUUID() }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutation
    let release!: () => void
    this.mutation = new Promise<void>((resolve) => { release = resolve })
    await previous
    try { return await operation() } finally { release() }
  }
}
