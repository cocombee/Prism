import { readFile, writeFile, rename, rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { falEndpointId } from '../shared/falModelCatalog'
import type { ServiceModelAvailability } from '../shared/types'
import bundled from './falAdvertisedCatalogSnapshot.json'

const MAX_BYTES = 8 * 1024 * 1024
const MAX_AGE = 7 * 24 * 60 * 60_000
/** Only public display metadata is retained; this is not account or schema readiness. */
export function falCatalogSnapshot(value: unknown, now = Date.now()): ServiceModelAvailability | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const snapshot = value as { version?: unknown; checkedAt?: unknown; models?: unknown }
  if (snapshot.version !== 1 || typeof snapshot.checkedAt !== 'string' || !Array.isArray(snapshot.models) || snapshot.models.length > 20_000) return
  const checked = Date.parse(snapshot.checkedAt)
  if (!Number.isFinite(checked) || checked > now + 60_000 || now - checked > MAX_AGE) return
  const seen = new Set<string>()
  try {
    const models = snapshot.models.map(raw => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid model')
      const item = raw as Record<string, unknown>, catalog = item.catalog as Record<string, unknown> | undefined
      const id = falEndpointId(item.id)
      const text = (v: unknown): string => { if (typeof v !== 'string' || !v.trim() || v.length > 4096) throw Error('Invalid metadata'); return v }
      if (seen.has(id) || !catalog || catalog.service !== 'fal.ai') throw Error('Invalid catalog')
      seen.add(id)
      return { id, label: text(item.label), category: text(item.category), catalog: { service: 'fal.ai', company: text(catalog.company), release: text(catalog.release), ...(catalog.mode ? { mode: text(catalog.mode) } : {}), ...(catalog.releasedAt ? { releasedAt: text(catalog.releasedAt) } : {}) } }
    })
    return { provider: 'fal', verified: false, catalogStale: true, catalogComplete: true, catalogCheckedAt: snapshot.checkedAt, catalogSource: 'Retained complete public fal catalog; refreshing', models }
  } catch { return }
}

export async function readFalCatalogSnapshot(path: string, now = Date.now()): Promise<ServiceModelAvailability | undefined> {
  try {
    if ((await stat(path)).size <= MAX_BYTES) {
      const cached = falCatalogSnapshot(JSON.parse(await readFile(path, 'utf8')), now)
      if (cached) return cached
    }
  } catch { /* Missing or malformed optional display cache. */ }
  return falCatalogSnapshot(bundled, now)
}

export async function writeFalCatalogSnapshot(path: string, availability: ServiceModelAvailability): Promise<void> {
  if (availability.provider !== 'fal' || !availability.verified || availability.catalogStale) return
  const candidate = { version: 1, checkedAt: availability.catalogCheckedAt || new Date().toISOString(), models: availability.models }
  const validated = falCatalogSnapshot(candidate)
  if (!validated) return
  const body = JSON.stringify({ ...candidate, models: validated.models })
  if (Buffer.byteLength(body) > MAX_BYTES) return
  const temporary = `${path}.${randomUUID()}.tmp`
  try { await writeFile(temporary, body, { mode: 0o600 }); await rename(temporary, path) }
  finally { await rm(temporary, { force: true }).catch(() => undefined) }
}
