import { createHash } from 'node:crypto'
import { describeFalRuntimeInputs, falRuntimeFingerprintMaterial } from '../shared/falRuntimeInputs'
import { falCatalogModel, falEndpointId } from '../shared/falModelCatalog'
import type { FalSchemaContract } from '../shared/falSchemaBinding'
import { compileFalContractIsolated } from './falSchemaValidation'
import { ScopedCatalogCache } from './scopedCatalogCache'

export interface FalSchemaDiscoveryOptions {
  request(url: string): Promise<Response>
  assertCurrent(): void
}

/** Fetch public contract data from the fixed catalog origin, never a provider schema URL. */
export async function readFalModelSchema(endpointId: string, options: FalSchemaDiscoveryOptions): Promise<FalSchemaContract> {
  const id = falEndpointId(endpointId)
  const url = new URL('https://api.fal.ai/v1/models')
  url.searchParams.set('endpoint_id', id)
  url.searchParams.set('expand', 'openapi-3.0')
  options.assertCurrent()
  const response = await options.request(url.toString())
  options.assertCurrent()
  if (!response.ok) {
    const error = new Error(`Could not load the selected fal model contract (${response.status}).`)
    Object.assign(error, { status: response.status })
    throw error
  }
  if (!response.body) throw new Error('Missing fal model contract response.')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      options.assertCurrent()
      const part = await reader.read()
      options.assertCurrent()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > 8 * 1024 * 1024) {
        await reader.cancel()
        throw new Error('Fal model contract response exceeds its supported size.')
      }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  const raw: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Malformed fal model contract response.')
  const body = raw as Record<string, unknown>
  if (!Array.isArray(body.models) || body.models.length !== 1 || body.has_more !== false || body.next_cursor !== null) {
    throw new Error('The selected fal model contract is missing, ambiguous or incomplete.')
  }
  const entry = body.models[0] as Record<string, unknown> | null
  const model = falCatalogModel(entry)
  if (!model || model.id !== id) throw new Error('The selected fal endpoint is not an active 2D production model.')
  const compiled = await compileFalContractIsolated(id, entry?.openapi)
  const contract = { ...compiled, category: model.category }
  options.assertCurrent()
  const runtime = describeFalRuntimeInputs(contract)
  const fingerprint = createHash('sha256').update(falRuntimeFingerprintMaterial(contract, runtime)).digest('hex')
  options.assertCurrent()
  return { ...contract, runtime: { ...runtime, fingerprint } }
}

/** Bounded per-endpoint cache, cleared on project/profile ownership changes; no stale execution fallback. */
export class FalModelSchemaCache {
  private scope: string | undefined
  private readonly entries = new Map<string, { cache: ScopedCatalogCache<FalSchemaContract>; pending?: Promise<FalSchemaContract> }>()
  private activeLoads = 0
  constructor(private readonly ttlMs = 5 * 60_000, private readonly maximum = 64, private readonly now: () => number = Date.now) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 256) throw new Error('Invalid fal contract cache limits.')
  }
  read(scope: string, endpointId: string, load: () => Promise<FalSchemaContract>, assertCurrent: () => void): Promise<FalSchemaContract> {
    const id = falEndpointId(endpointId)
    assertCurrent()
    if (this.scope !== scope) { this.entries.clear(); this.scope = scope }
    let entry = this.entries.get(id)
    if (!entry) {
      if (this.entries.size >= this.maximum) {
        // A pending lookup must stay coalesced until it settles. Evicting it
        // would allow duplicate transport calls for the same selected model.
        const evictable = [...this.entries].find(([, value]) => !value.pending)
        if (!evictable) return Promise.reject(new Error('Too many fal model contracts are loading. Try again when a lookup finishes.'))
        this.entries.delete(evictable[0])
      }
      entry = { cache: new ScopedCatalogCache<FalSchemaContract>(this.ttlMs, this.now) }
    }
    // Refresh insertion order for bounded least-recently-used retention.
    this.entries.delete(id)
    this.entries.set(id, entry)
    const owner = entry
    const pending = owner.cache.read(scope, async () => {
      // Includes obsolete-scope transports until they actually finish.
      if (this.activeLoads >= 8) throw new Error('Too many fal model contracts are loading. Try again when a lookup finishes.')
      this.activeLoads++
      try {
        const contract = await load()
        if (contract.endpointId !== id) throw new Error('Fal model contract identity changed during lookup.')
        return contract
      } finally { this.activeLoads-- }
    }, assertCurrent).finally(() => { if (owner.pending === pending) owner.pending = undefined })
    owner.pending = pending
    return pending
  }
}
