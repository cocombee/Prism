interface CatalogEntry<T> { scope: string; value?: T; fetchedAt?: number; pending?: Promise<T> }

/** One account/project scope; older requests cannot replace a newer scope's cache. */
export class ScopedCatalogCache<T> {
  private entry: CatalogEntry<T> | undefined
  constructor(private readonly ttlMs: number, private readonly now: () => number = Date.now) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error('Invalid catalog cache lifetime.')
  }

  snapshot(scope: string): T | undefined { return this.entry?.scope === scope ? this.entry.value : undefined }

  invalidate(scope: string): void { if (this.entry?.scope === scope) this.entry.fetchedAt = undefined }

  read(scope: string, load: () => Promise<T>, assertCurrent: () => void): Promise<T> {
    assertCurrent()
    const prior = this.entry
    const entry = prior?.scope === scope ? prior : { scope } as CatalogEntry<T>
    this.entry = entry
    if (entry.pending) return entry.pending.then((value) => { assertCurrent(); return value })
    if (entry.fetchedAt !== undefined && entry.value !== undefined && this.now() - entry.fetchedAt < this.ttlMs) return Promise.resolve().then(() => { assertCurrent(); return entry.value! })
    const pending = Promise.resolve().then(load).then((value) => {
      assertCurrent()
      if (this.entry === entry) { entry.value = value; entry.fetchedAt = this.now() }
      return value
    }).catch((error) => { assertCurrent(); throw error }).finally(() => { if (entry.pending === pending) entry.pending = undefined })
    entry.pending = pending
    return pending
  }
}
