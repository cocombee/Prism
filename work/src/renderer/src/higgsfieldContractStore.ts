import type { HiggsfieldInputContract } from '../../shared/higgsfieldInputContract'
import { higgsfieldContractRevision, higgsfieldModel } from '../../shared/higgsfieldNative'

/** Public contracts still belong to the requesting account/project. No fal transport or fallback. */
export class HiggsfieldContractStore {
  private readonly entries = new Map<string, { value?: HiggsfieldInputContract; expiresAt?: number; pending?: Promise<HiggsfieldInputContract> }>()
  private readonly queue: Array<() => void> = []
  private active = 0
  constructor(private readonly now: () => number = Date.now, private readonly ttlMs = 5 * 60_000) {}
  read(scope: string, endpointId: string, load: () => Promise<HiggsfieldInputContract>, current: () => boolean): Promise<HiggsfieldInputContract> {
    const id = higgsfieldModel(endpointId).id, key = JSON.stringify([scope, id])
    const assertScope = () => { if (!current()) throw new DOMException('The Higgsfield account or project changed.', 'AbortError') }
    assertScope()
    let entry = this.entries.get(key)
    if (!entry) {
      if (this.entries.size >= 64) {
        const evictable = [...this.entries].find(([, item]) => !item.pending)
        if (!evictable) return Promise.reject(new Error('Too many Higgsfield contracts are queued. Retry when a lookup finishes.'))
        this.entries.delete(evictable[0])
      }
      entry = {}; this.entries.set(key, entry)
    }
    const owner = entry
    const assertCurrent = () => {
      assertScope()
      if (this.entries.get(key) !== owner) throw new DOMException('The Higgsfield model inputs were refreshed.', 'AbortError')
    }
    const receive = (value: HiggsfieldInputContract) => { assertCurrent(); return structuredClone(value) }
    if (owner.value && (owner.expiresAt || 0) > this.now()) return Promise.resolve(owner.value).then(receive)
    if (owner.pending) return owner.pending.then(receive)
    const pending = new Promise<HiggsfieldInputContract>((resolve, reject) => {
      this.queue.push(() => {
        this.active++
        void Promise.resolve().then(() => { assertCurrent(); return load() }).then(value => {
          assertCurrent()
          if (value.endpointId !== id || value.contractRevision !== higgsfieldContractRevision(id) || !/^[a-f0-9]{64}$/.test(value.fingerprint)) throw new Error('Selected Higgsfield input contract identity changed.')
          owner.value = structuredClone(value); owner.expiresAt = this.now() + this.ttlMs; resolve(owner.value)
        }).catch(reject).finally(() => { this.active--; this.pump() })
      })
      this.pump()
    }).finally(() => { if (owner.pending === pending) owner.pending = undefined })
    owner.pending = pending
    return pending.then(receive)
  }
  invalidate(scope: string, endpointId: string): void {
    this.entries.delete(JSON.stringify([scope, higgsfieldModel(endpointId).id]))
  }
  private pump(): void { while (this.active < 4 && this.queue.length) this.queue.shift()!() }
}
