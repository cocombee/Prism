import type { FalSchemaContract } from '../../shared/falSchemaBinding'
import { falEndpointId } from '../../shared/falModelCatalog'

/** A scoped, bounded producer queue; pending old-owner reads cannot populate the new owner. */
export class FalContractStore {
  private readonly entries = new Map<string, { value?: FalSchemaContract; expiresAt?: number; pending?: Promise<FalSchemaContract> }>()
  private readonly queue: Array<() => void> = []
  private active = 0
  constructor(private readonly now: () => number = Date.now, private readonly ttlMs = 5 * 60_000) {}
  read(scope: string, endpointId: string, load: () => Promise<FalSchemaContract>, current: () => boolean): Promise<FalSchemaContract> {
    const id = falEndpointId(endpointId), key = JSON.stringify([scope, id])
    const assertCurrent = () => { if (!current()) throw new DOMException('The service account or project changed.', 'AbortError') }
    assertCurrent()
    let entry = this.entries.get(key)
    if (entry?.value && (entry.expiresAt || 0) > this.now()) return Promise.resolve(entry.value).then(value => { assertCurrent(); return value })
    if (entry?.pending) return entry.pending.then(value => { assertCurrent(); return value })
    if (!entry) {
      if (this.entries.size >= 64) {
        const evictable = [...this.entries].find(([, item]) => !item.pending)
        if (!evictable) return Promise.reject(new Error('Too many model contracts are queued. Retry when a lookup finishes.'))
        this.entries.delete(evictable[0])
      }
      entry = {}; this.entries.set(key, entry)
    }
    const owner = entry
    const pending = new Promise<FalSchemaContract>((resolve, reject) => {
      this.queue.push(() => {
        this.active++
        void Promise.resolve().then(() => { assertCurrent(); return load() }).then(value => {
          assertCurrent()
          if (value.endpointId !== id || !value.runtime?.fingerprint) throw new Error('Selected model contract identity changed.')
          owner.value = value; owner.expiresAt = this.now() + this.ttlMs; resolve(value)
        }).catch(reject).finally(() => { this.active--; this.pump() })
      })
      this.pump()
    }).finally(() => { if (owner.pending === pending) owner.pending = undefined })
    owner.pending = pending
    return pending
  }
  invalidate(scope: string, endpointId: string): void {
    const entry = this.entries.get(JSON.stringify([scope, falEndpointId(endpointId)]))
    if (entry) { entry.value = undefined; entry.expiresAt = undefined }
  }
  private pump(): void { while (this.active < 4 && this.queue.length) this.queue.shift()!() }
}
