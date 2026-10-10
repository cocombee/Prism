import { falCatalogModel, falEndpointId, type FalCatalogModel } from '../shared/falModelCatalog'

const origin = 'https://api.fal.ai/v1/models'
export interface FalCatalogDiscoveryOptions {
  request(url: string): Promise<Response>
  assertCurrent?(): void
  maxPages?: number
  maxRecords?: number
}

async function catalogBody(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('Missing fal catalog response body.')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error('Fal catalog page exceeds its supported size.') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** A returned catalog is complete; failed or bounded-out pagination never returns partial data. */
export async function readFalModelCatalog({ request, assertCurrent, maxPages = 200, maxRecords = 20_000 }: FalCatalogDiscoveryOptions): Promise<FalCatalogModel[]> {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 200 || !Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 20_000) throw new Error('Invalid fal catalog limits.')
  const initial = new URL(origin)
  initial.searchParams.set('status', 'active')
  initial.searchParams.set('limit', '100')
  const seen = new Set<string>(), cursors = new Set<string>(), models: FalCatalogModel[] = []
  let url = initial.toString()
  for (let page = 0; page < maxPages; page += 1) {
    assertCurrent?.()
    const response = await request(url)
    assertCurrent?.()
    if (!response.ok) {
      const error = new Error(`Could not load fal model catalog (${response.status}).`)
      Object.assign(error, { status: response.status })
      throw error
    }
    const raw = await catalogBody(response)
    assertCurrent?.()
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Malformed fal model catalog response.')
    const body = raw as Record<string, unknown>
    if (!Array.isArray(body.models) || typeof body.has_more !== 'boolean' || !(body.next_cursor === null || typeof body.next_cursor === 'string')) throw new Error('Malformed fal model catalog pagination.')
    if (body.models.length > 1000) throw new Error('Fal catalog page contains too many records.')
    for (const rawEntry of body.models) {
      const id = falEndpointId((rawEntry as Record<string, unknown> | null)?.endpoint_id)
      const model = falCatalogModel(rawEntry)
      if (seen.has(id)) continue
      seen.add(id)
      if (seen.size > maxRecords) throw new Error('Fal model catalog record limit reached; availability is incomplete.')
      if (model) models.push(model)
    }
    if (!body.has_more) {
      if (body.next_cursor !== null && body.next_cursor !== '') throw new Error('Inconsistent fal model catalog pagination.')
      return models
    }
    if (typeof body.next_cursor !== 'string' || !body.next_cursor.trim()) throw new Error('Missing fal model catalog cursor.')
    if (cursors.has(body.next_cursor)) throw new Error('Repeated fal model catalog cursor.')
    cursors.add(body.next_cursor)
    if (page + 1 === maxPages) throw new Error('Fal model catalog page limit reached; availability is incomplete.')
    const next = new URL(initial)
    next.searchParams.set('cursor', body.next_cursor)
    url = next.toString()
  }
  throw new Error('Fal model catalog is incomplete.')
}
