import { providerDisplayName } from '../shared/providerErrors'

export interface ProviderCatalogPageOptions {
  provider: 'anthropic' | 'google'
  initialUrl: string
  request: (url: string) => Promise<Response>
  maxPages?: number
}

export async function readProviderCatalogPages(options: ProviderCatalogPageOptions): Promise<Record<string, unknown>> {
  const maxPages = options.maxPages ?? 100
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) throw new Error('Invalid model catalog page limit.')
  const field = options.provider === 'google' ? 'models' : 'data'
  const identifier = options.provider === 'google' ? 'name' : 'id'
  const records: Record<string, unknown>[] = []
  const ids = new Set<string>(), cursors = new Set<string>()
  let url = options.initialUrl
  for (let page = 0; page < maxPages; page += 1) {
    const response = await options.request(url)
    const raw: unknown = await response.json()
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Malformed provider model catalog response.')
    const body = raw as Record<string, unknown>
    if (!response.ok) {
      const detail = (body.error as { message?: unknown } | undefined)?.message
      const error = new Error(typeof detail === 'string' ? detail : `Could not load ${providerDisplayName(options.provider)} models.`)
      Object.assign(error, { status: response.status })
      throw error
    }
    if (!Array.isArray(body[field])) throw new Error('Malformed provider model catalog records.')
    for (const record of body[field] as unknown[]) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Malformed provider model catalog record.')
      const item = record as Record<string, unknown>
      const id = item[identifier]
      if (typeof id !== 'string' || !id.trim()) throw new Error('Missing provider model identifier.')
      if (!ids.has(id)) { ids.add(id); records.push(item) }
    }
    if (options.provider === 'anthropic' && body.has_more !== undefined && typeof body.has_more !== 'boolean') {
      throw new Error('Invalid provider catalog pagination flag.')
    }
    const cursor = options.provider === 'google' ? body.nextPageToken : body.has_more === true ? body.last_id : undefined
    if (cursor === undefined || cursor === '') {
      if (options.provider === 'anthropic' && body.has_more === true) throw new Error('Missing provider catalog pagination cursor.')
      return { ...body, [field]: records }
    }
    if (typeof cursor !== 'string' || !cursor.trim()) throw new Error('Invalid provider catalog pagination cursor.')
    if (cursors.has(cursor)) throw new Error('Repeated provider catalog pagination cursor.')
    cursors.add(cursor)
    if (page + 1 === maxPages) throw new Error('Provider model catalog page limit reached; availability is incomplete.')
    // Treat opaque cursors only as query values; retain the fixed provider origin.
    const next = new URL(options.initialUrl)
    next.searchParams.set(options.provider === 'google' ? 'pageToken' : 'after_id', cursor)
    url = next.toString()
  }
  throw new Error('Provider model catalog page limit reached.')
}
