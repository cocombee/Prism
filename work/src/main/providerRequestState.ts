import { AsyncLocalStorage } from 'node:async_hooks'
import type { ServiceProvider } from '../shared/types'

interface RequestOwner {
  provider: ServiceProvider
  projectRevision: number
  providerRevision: number
  overrides?: Partial<Record<ServiceProvider, string>>
}

/** Owns transient account failures and async reads; never stores or decrypts keys. */
export class ProviderRequestState<T> {
  private readonly failures = new Map<ServiceProvider, T>()
  private readonly revisions = new Map<ServiceProvider, number>()
  private readonly mutations = new Map<ServiceProvider, number>()
  private readonly idleWaiters = new Map<ServiceProvider, Set<() => void>>()
  private readonly context = new AsyncLocalStorage<RequestOwner>()
  private projectIdentity: string | null = null
  private projectRevision = 0

  activateProject(identity: string | null): void {
    if (identity === this.projectIdentity) return
    this.projectIdentity = identity
    this.projectRevision += 1
    this.failures.clear()
  }

  async run<R>(provider: ServiceProvider, work: () => Promise<R>, options: {
    overrides?: Partial<Record<ServiceProvider, string>>
    validateResult?: boolean
  } = {}): Promise<R> {
    const owner: RequestOwner = { provider, projectRevision: this.projectRevision,
      providerRevision: this.revision(provider), overrides: options.overrides ? { ...options.overrides } : undefined }
    return this.context.run(owner, async () => {
      this.assertCurrent(provider)
      try {
        const result = await work()
        if (options.validateResult !== false) this.assertCurrent(provider)
        return result
      } catch (error) {
        if (options.validateResult !== false) this.assertCurrent(provider)
        throw error
      }
    })
  }

  async change<R>(provider: ServiceProvider, mutation: () => Promise<R>): Promise<R> {
    this.revisions.set(provider, this.revision(provider) + 1)
    this.mutations.set(provider, (this.mutations.get(provider) || 0) + 1)
    let succeeded = false
    try {
      const result = await mutation()
      succeeded = true
      return result
    } finally {
      this.revisions.set(provider, this.revision(provider) + 1)
      const remaining = (this.mutations.get(provider) || 1) - 1
      if (remaining) this.mutations.set(provider, remaining)
      else {
        this.mutations.delete(provider)
        const waiters = this.idleWaiters.get(provider)
        this.idleWaiters.delete(provider)
        waiters?.forEach(resolve => resolve())
      }
      if (succeeded) this.failures.delete(provider)
    }
  }

  /** Read-only status checks wait for mutations; generation still rejects stale ownership. */
  async readWhenIdle<R>(provider: ServiceProvider, read: () => Promise<R>): Promise<R> {
    const project = this.projectRevision
    const assertProject = () => {
      if (this.projectRevision !== project) throw new DOMException('The project changed before the service read completed.', 'AbortError')
    }
    for (;;) {
      assertProject()
      while (this.mutations.has(provider)) {
        await new Promise<void>(resolve => {
          const waiters = this.idleWaiters.get(provider) || new Set<() => void>()
          waiters.add(resolve)
          this.idleWaiters.set(provider, waiters)
        })
        assertProject()
      }
      const revision = this.revision(provider)
      try {
        const result = await read()
        assertProject()
        if (this.revision(provider) !== revision) continue
        return result
      } catch (error) {
        assertProject()
        if (error instanceof Error && error.name === 'AbortError' && this.revision(provider) !== revision) continue
        throw error
      }
    }
  }

  assertCurrent(provider: ServiceProvider): void {
    if (!this.isCurrent(provider)) throw new DOMException('The service account or project changed. Try again with the current selection.', 'AbortError')
  }

  catalogScope(provider: ServiceProvider): string {
    this.assertCurrent(provider)
    const owner = this.context.getStore()
    return JSON.stringify([owner?.projectRevision ?? this.projectRevision, owner?.providerRevision ?? this.revision(provider)])
  }

  overrides(provider: ServiceProvider, fallback?: Partial<Record<ServiceProvider, string>>): Partial<Record<ServiceProvider, string>> | undefined {
    this.assertCurrent(provider)
    const owner = this.context.getStore()
    return owner ? owner.overrides : fallback
  }

  get(provider: ServiceProvider): T | undefined {
    return this.isCurrent(provider) ? this.failures.get(provider) : undefined
  }

  set(provider: ServiceProvider, value: T): void {
    if (this.isCurrent(provider)) this.failures.set(provider, value)
  }

  delete(provider: ServiceProvider): boolean {
    return this.isCurrent(provider) && this.failures.delete(provider)
  }

  private revision(provider: ServiceProvider): number { return this.revisions.get(provider) || 0 }

  private isCurrent(provider: ServiceProvider): boolean {
    if (this.mutations.has(provider)) return false
    const owner = this.context.getStore()
    return !owner || owner.provider === provider && owner.projectRevision === this.projectRevision && owner.providerRevision === this.revision(provider)
  }
}
