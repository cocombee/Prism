import { createHash } from 'node:crypto'
import type { ServiceModelAvailability } from '../shared/types'
import type { ModelMenuMetadata } from '../shared/modelCatalogMenu'
import { higgsfieldBundledCatalogModels } from '../shared/higgsfieldNative'
import type { FalSchemaNode } from '../shared/falSchemaBinding'
import { compileFalContractIsolated, validateFalContractValue } from './falSchemaValidation'
import declaredDocumentSources from './higgsfieldDeclaredDocumentSources.json'

export const HIGGSFIELD_PUBLIC_CATALOGS = ['https://open.higgsfield.ai/explore/video', 'https://open.higgsfield.ai/explore/image'] as const
export const HIGGSFIELD_CATALOG_REVISION = 'prism-higgsfield-public-documents-v1'
type ObjectValue = Record<string, unknown>
type Model = ServiceModelAvailability['models'][number]
export interface HiggsfieldDocument { url: string; hash: string; text: string; etag?: string }
export interface HiggsfieldPublishedPage { url: string; title: string; mode: string; company: string; links: string[]; llms: string[]; releasedAt?: string }
export interface HiggsfieldDeclaredContract { id: string; endpoint: string; title: string; category: string; schema: ObjectValue; documentUrl: string; hash: string }
export interface HiggsfieldCatalogSnapshot { availability: ServiceModelAvailability; documents: Map<string, string>; contracts: Map<string, HiggsfieldDeclaredContract> }
const object = (value: unknown): value is ObjectValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const decode = (text: string) => text.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
  const fixed: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' }
  if (fixed[entity]) return fixed[entity]
  const number = entity.startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10)
  return Number.isSafeInteger(number) && number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ''
})
function withoutComments(text: string): string {
  let cursor = 0, result = ''
  for (;;) { const start = text.indexOf('<!--', cursor); if (start < 0) return result + text.slice(cursor); result += text.slice(cursor, start); const end = text.indexOf('-->', start + 4); if (end < 0) return result; cursor = end + 3 }
}
const plain = (text: string) => {
  const input = withoutComments(text); let cursor = 0, result = ''
  for (;;) { const start = input.indexOf('<', cursor); if (start < 0) { result += input.slice(cursor); break }; result += input.slice(cursor, start) + ' '; const end = input.indexOf('>', start + 1); if (end < 0) break; cursor = end + 1 }
  return decode(result).replace(/\s+/g, ' ').trim()
}
function label(text: string): string { const value = plain(text); if (!value || value.length > 300 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Higgsfield published an invalid model label.'); return value }
function attribute(tag: string, name: string): string | undefined { return decode(tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] || '') || undefined }
function inertHtml(text: string): string {
  if (text.length > 2 * 1024 * 1024) throw new Error('Higgsfield public document exceeds its supported size.')
  const input = withoutComments(text), lower = input.toLowerCase(); let cursor = 0, result = ''
  for (;;) {
    const script = lower.indexOf('<script', cursor), style = lower.indexOf('<style', cursor)
    const start = script < 0 ? style : style < 0 ? script : Math.min(script, style)
    if (start < 0) return result + input.slice(cursor)
    result += input.slice(cursor, start)
    const kind = start === script ? 'script' : 'style', end = lower.indexOf(`</${kind}>`, start + kind.length + 1)
    if (end < 0) return result
    cursor = end + kind.length + 3
  }
}
/** Bounded inert elements; missing delimiters never restart a greedy whole-document search. */
function elements(text: string, kind: string): Array<{ tag: string; body: string }> {
  const lower = text.toLowerCase(), result: Array<{ tag: string; body: string }> = []; let cursor = 0
  for (;;) {
    const start = lower.indexOf(`<${kind}`, cursor); if (start < 0) return result
    if (!/[\s>]/.test(lower[start + kind.length + 1] || '')) { cursor = start + kind.length + 1; continue }
    const openEnd = lower.indexOf('>', start + kind.length + 1), close = openEnd < 0 ? -1 : lower.indexOf(`</${kind}>`, openEnd + 1)
    if (openEnd < 0 || close < 0 || openEnd - start > 16384) throw new Error('Higgsfield public HTML has unsupported model-element structure.')
    result.push({ tag: text.slice(start + kind.length + 1, openEnd), body: text.slice(openEnd + 1, close) }); cursor = close + kind.length + 3
    if (result.length > 4096) throw new Error('Higgsfield public HTML exceeds its supported element count.')
  }
}
function links(text: string, source: string): Array<{ url: string; text: string }> {
  return elements(text, 'a').flatMap(match => {
    const href = attribute(match.tag, 'href'); if (!href) return []
    try { const url = new URL(href, source); url.hash = ''; return [{ url: url.href, text: plain(match.body) }] } catch { return [] }
  })
}
export function higgsfieldDocumentUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !['open.higgsfield.ai', 'dash.higgsfield.ai'].includes(url.hostname) ||
    !/^\/models\/[a-zA-Z0-9._/-]+\/(?:playground|api-reference|llms\.txt)$/.test(url.pathname) || /(?:^|\/)(?:3d|3d-jutsu)(?:\/|$)/i.test(url.pathname)) throw new Error('Higgsfield discovery requires an explicitly published public model document.')
  return url.href
}
/** Rendered model cards only; page scripts, navigation and thumbnails are not catalog records. */
export function higgsfieldCatalogRoots(text: string, source: string): Array<{ url: string; title: string; company: string; category: string }> {
  if (!HIGGSFIELD_PUBLIC_CATALOGS.includes(source as typeof HIGGSFIELD_PUBLIC_CATALOGS[number])) throw new Error('Invalid Higgsfield catalog source.')
  const html = inertHtml(text), records = new Map<string, { url: string; title: string; company: string; category: string }>()
  for (const match of elements(html, 'article')) {
    if (attribute(match.tag, 'data-sentry-component') !== 'ExploreCatalogModelCard') continue
    const title = elements(match.body, 'h3')[0]?.body
    if (!title) throw new Error('Higgsfield catalog card is missing its published name.')
    const name = label(title), parts = name.split(' / ')
    const routes = [...new Set(links(match.body, source).map(link => link.url).filter(url => url.endsWith('/playground')))]
    if (routes.length !== 1) throw new Error('Higgsfield catalog card has ambiguous model links.')
    const url = higgsfieldDocumentUrl(routes[0])
    if (records.has(url)) throw new Error('Higgsfield catalog contains a duplicate model card.')
    records.set(url, { url, title: parts.length > 1 ? parts.slice(1).join(' / ') : name, company: parts.length > 1 ? parts[0] : 'Higgsfield', category: source.endsWith('/video') ? 'video' : 'image' })
    if (records.size > 256) throw new Error('Higgsfield catalog exceeds its supported model count.')
  }
  if (!records.size) throw new Error('Higgsfield published no readable model cards; the previous catalog was preserved.')
  // A changed/paginated HTML surface is not silently treated as a full catalog.
  if (/<a\b[^>]*(?:rel=["']next["']|aria-label=["'](?:next|next page)["'])/i.test(html)) throw new Error('Higgsfield catalog pagination needs a supported discovery adapter.')
  return [...records.values()]
}
/** Inert DOM labels and explicit links. The agent URL query contains the published llms URL. */
export function higgsfieldPublishedPage(text: string, source: string, fallback: { title: string; company: string }): HiggsfieldPublishedPage {
  higgsfieldDocumentUrl(source)
  const html = inertHtml(text), title = elements(html, 'h1')[0]?.body
  if (!title) throw new Error('Higgsfield model documentation is missing its published heading.')
  const allLinks = links(html, source)
  const published = new Set<string>()
  for (const link of allLinks) if (link.url.includes('/models/') && /\/(?:playground|api-reference|llms\.txt)$/.test(new URL(link.url).pathname)) {
    try { published.add(higgsfieldDocumentUrl(link.url)) } catch { /* Foreign/unsupported documents cannot become discovery requests. */ }
  }
  const llms = new Set([...published].filter(url => url.endsWith('/llms.txt')))
  // Read only URL string literals for the published agent_install open_url actions.
  // No router-state deserialization, JS escape decoding, eval or inline execution.
  for (const match of text.matchAll(/action:[^{}]{0,80}\{type:"open_url",url:"([^"\\]{1,8192})"\}/g)) {
    let target: URL; try { target = new URL(match[1]) } catch { continue }
    if (!['https://claude.ai', 'https://cursor.com', 'https://chatgpt.com'].includes(target.origin)) continue
    for (const name of ['prompt', 'text']) {
      const prompt = target.searchParams.get(name) || ''
      for (const found of prompt.matchAll(/https:\/\/(?:dash|open)\.higgsfield\.ai\/models\/[a-zA-Z0-9._/-]+\/llms\.txt/g)) llms.add(higgsfieldDocumentUrl(found[0]))
    }
  }
  const mode = html.match(/aria-label=["']Select model variant: ([^"']+)["']/i)?.[1]
  const company = elements(html, 'h2').find(item => attribute(item.tag, 'id') === 'related-models-title')?.body
  // One literal published overview.released_on; no router evaluation or date inference.
  const dates = [...text.matchAll(/\boverview:\$R\[\d+\]=\{[^{}]{0,2048}\breleased_on:"(\d{4}-\d{2}-\d{2})"/g)]
  const date = dates.length === 1 ? dates[0][1] : undefined
  const releasedAt = date && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date ? date : undefined
  return { url: source, title: label(title), mode: mode ? label(mode) : '', company: company ? label(company).replace(/^More models by /, '') : fallback.company, links: [...published].filter(url => url.endsWith('/playground')), llms: [...llms], ...(releasedAt ? { releasedAt } : {}) }
}
export function higgsfieldDeclaredContract(text: string, source: string): HiggsfieldDeclaredContract {
  higgsfieldDocumentUrl(source)
  const headings = [...text.matchAll(/^### Input JSON Schema[ \t]*\r?$/gm)]
  if (headings.length !== 1) throw new Error('Higgsfield must publish one bounded Input JSON Schema.')
  const start = headings[0].index! + headings[0][0].length, opening = text.slice(start).match(/^\s*```json[ \t]*\r?\n/)
  if (!opening) throw new Error('Higgsfield must publish one bounded Input JSON Schema.')
  const contentStart = start + opening[0].length, end = text.indexOf('\n```', contentStart)
  if (end < 0 || end - contentStart > 256 * 1024) throw new Error('Higgsfield must publish one bounded Input JSON Schema.')
  const endpoint = text.match(/^- \*\*Endpoint\*\*: `([^`]+)`/m)?.[1], id = text.match(/^- \*\*Model ID\*\*: `([^`]+)`/m)?.[1]
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,255}$/.test(id) || id.includes('..') || id.includes('//') || endpoint !== `https://api.higgsfield.ai/${id}`) throw new Error('Higgsfield must declare an exact production API endpoint and model ID.')
  const schema: unknown = JSON.parse(text.slice(contentStart, end))
  let nodes = 0
  function inspect(value: unknown, depth = 0): void {
    if (++nodes > 20000 || depth > 32) throw new Error('Higgsfield input schema exceeds its supported structure.')
    if (Array.isArray(value)) value.forEach(item => inspect(item, depth + 1))
    else if (object(value)) for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key) || key === '$ref' && (typeof child !== 'string' || !child.startsWith('#/'))) throw new Error('Higgsfield input schema requires safe local declarations.')
      inspect(child, depth + 1)
    }
  }
  inspect(schema)
  if (!object(schema)) throw new Error('Higgsfield must publish an object JSON Schema declaration.')
  return { id, endpoint, title: label(text.match(/^# (.+)$/m)?.[1] || id), category: text.match(/^- \*\*Category\*\*: (.+)$/m)?.[1]?.trim() || 'unknown', schema, documentUrl: source, hash: hash(text) }
}
export interface HiggsfieldCatalogBounds { maxRequests: number; maxBytes: number; maxTotalBytes: number; timeoutMs: number; totalMs: number }
const defaultBounds: HiggsfieldCatalogBounds = { maxRequests: 384, maxBytes: 2 * 1024 * 1024, maxTotalBytes: 64 * 1024 * 1024, timeoutMs: 10000, totalMs: 120000 }
type Request = (url: string, init: RequestInit) => Promise<Response>
export class HiggsfieldPublicCatalog {
  private snapshot?: HiggsfieldCatalogSnapshot
  private checkedAt = 0
  private pending?: Promise<HiggsfieldCatalogSnapshot>
  private readonly readCache = new Map<string, HiggsfieldDocument>()
  constructor(private readonly request: Request, private readonly now: () => number = Date.now, private readonly ttlMs = 9 * 60_000) {}
  read(): Promise<HiggsfieldCatalogSnapshot> {
    if (this.pending) return this.pending
    if (this.snapshot && this.now() - this.checkedAt < this.ttlMs) return Promise.resolve(this.snapshot)
    const pending = this.refresh().then(value => { this.snapshot = value; this.checkedAt = this.now(); return value }).finally(() => { if (this.pending === pending) this.pending = undefined })
    this.pending = pending
    return pending
  }
  async readContract(id: string, assertCurrent: () => void): Promise<FalSchemaNode> {
    assertCurrent()
    // A selected known route must not wait for unrelated image/video discovery.
    // These are captured published links, not URLs inferred from a model ID.
    // The exact document is still fetched and its identity checked on each read.
    const sources = declaredDocumentSources.documents as Readonly<Record<string, string>>
    const source = this.snapshot?.documents.get(id) || sources[id] || (await this.read()).documents.get(id)
    assertCurrent()
    if (!source) throw new Error('The selected Higgsfield model has no current declared input document. Preserve it and refresh the catalog.')
    const budget = this.budget({ ...defaultBounds, maxRequests: 1, totalMs: 10000 })
    const doc = await this.document(source, budget)
    assertCurrent()
    const declared = higgsfieldDeclaredContract(doc.text, source)
    if (declared.id !== id) throw new Error('Higgsfield changed the declared model identity. No inputs were uploaded.')
    // Reuse the bounded worker compiler as a JSON-schema owner, never its transport.
    const contract = await compileFalContractIsolated(id, { paths: {
      [`/${id}`]: { post: { requestBody: { content: { 'application/json': { schema: declared.schema } } } } },
      [`/${id}/requests/{request_id}`]: { get: { responses: { '200': { content: { 'application/json': { schema: { type: 'object' } } } } } } },
    } })
    assertCurrent()
    return contract.input
  }
  async validate(id: string, input: unknown, assertCurrent: () => void): Promise<void> {
    const schema = await this.readContract(id, assertCurrent)
    await validateFalContractValue(schema, input); assertCurrent()
  }
  private budget(bounds: HiggsfieldCatalogBounds) { return { bounds, started: this.now(), requests: 0, bytes: 0 } }
  private async document(url: string, budget: ReturnType<HiggsfieldPublicCatalog['budget']>): Promise<HiggsfieldDocument> {
    if (!HIGGSFIELD_PUBLIC_CATALOGS.includes(url as typeof HIGGSFIELD_PUBLIC_CATALOGS[number])) higgsfieldDocumentUrl(url)
    const { bounds } = budget
    if (++budget.requests > bounds.maxRequests || this.now() - budget.started >= bounds.totalMs) throw new Error('Higgsfield catalog refresh reached its bounded traversal limit.')
    const old = this.readCache.get(url)
    const response = await this.request(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(Math.min(bounds.timeoutMs, Math.max(1, bounds.totalMs - (this.now() - budget.started)))), ...(old?.etag ? { headers: { 'If-None-Match': old.etag } } : {}) })
    if (response.status === 304 && old) return old
    if (!response.ok || !response.body) throw new Error(`Could not read public Higgsfield documentation (${response.status}).`)
    if (response.url && response.url !== url) { await response.body.cancel(); throw new Error('Higgsfield public documentation redirected to another identity.') }
    if (!/^(?:text\/(?:html|plain)|application\/(?:json|[^;]*\+json))(?:;|$)/i.test(response.headers.get('content-type') || '')) { await response.body.cancel(); throw new Error('Higgsfield returned non-text public metadata.') }
    if (Number(response.headers.get('content-length')) > bounds.maxBytes) { await response.body.cancel(); throw new Error('Higgsfield public document exceeds its supported size.') }
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let total = 0
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break
        total += value.byteLength; budget.bytes += value.byteLength
        if (total > bounds.maxBytes || budget.bytes > bounds.maxTotalBytes || this.now() - budget.started >= bounds.totalMs) throw new Error('Higgsfield public metadata exceeds its bounded size or time.')
        chunks.push(value)
      }
    } catch (error) { await reader.cancel().catch(() => undefined); throw error } finally { reader.releaseLock() }
    const text = Buffer.concat(chunks).toString('utf8'), etag = response.headers.get('etag')
    const result = { url, hash: hash(text), text, ...(etag && etag.length <= 300 && !/[\r\n]/.test(etag) ? { etag } : {}) }
    this.readCache.set(url, result)
    // Public content only, bounded independently of the catalog traversal.
    while (this.readCache.size > 384) this.readCache.delete(this.readCache.keys().next().value!)
    let cachedBytes = [...this.readCache.values()].reduce((total, value) => total + Buffer.byteLength(value.text), 0)
    while (cachedBytes > 32 * 1024 * 1024) {
      const first = this.readCache.keys().next().value!
      cachedBytes -= Buffer.byteLength(this.readCache.get(first)!.text)
      this.readCache.delete(first)
    }
    return result
  }
  async refresh(bounds = defaultBounds): Promise<HiggsfieldCatalogSnapshot> {
    if (!Object.values(bounds).every(value => Number.isSafeInteger(value) && value > 0) || bounds.maxRequests > 384 || bounds.maxBytes > defaultBounds.maxBytes || bounds.maxTotalBytes > defaultBounds.maxTotalBytes || bounds.totalMs > defaultBounds.totalMs || bounds.timeoutMs > 10000) throw new Error('Invalid Higgsfield discovery bounds.')
    const budget = this.budget(bounds), roots = [] as ReturnType<typeof higgsfieldCatalogRoots>, hashes = new Map<string, string>(), warnings: string[] = []
    for (const url of HIGGSFIELD_PUBLIC_CATALOGS) { const doc = await this.document(url, budget); roots.push(...higgsfieldCatalogRoots(doc.text, url)); hashes.set(url, doc.hash) }
    const queue = roots.map(root => ({ ...root })), visited = new Set<string>(), contracts = new Map<string, HiggsfieldDeclaredContract>(), documents = new Map<string, string>(), models = new Map<string, Model>()
    let cursor = 0, complete = true, schemaBytes = 0
    // All published related/variant pages are traversed; no route or variant is inferred.
    while (cursor < queue.length && budget.requests < bounds.maxRequests && this.now() - budget.started < bounds.totalMs) {
      const slice = queue.slice(cursor, cursor + 2); cursor += slice.length
      const records = await Promise.all(slice.map(async item => {
        if (visited.has(item.url)) return undefined
        visited.add(item.url)
        try { const doc = await this.document(item.url, budget); hashes.set(item.url, doc.hash); return { item, page: higgsfieldPublishedPage(doc.text, item.url, item) } }
        catch (error) { complete = false; warnings.push(`${item.title}: ${error instanceof Error ? error.message : String(error)}`); return { item } }
      }))
      for (const record of records) {
        if (!record) continue
        const { item, page } = record
        const catalog: ModelMenuMetadata = { service: 'Higgsfield', company: page?.company || item.company, release: page?.title || item.title, ...(page?.mode ? { mode: page.mode } : {}), ...(page?.releasedAt ? { releasedAt: page.releasedAt } : {}) }
        for (const url of page?.links || []) if (!visited.has(url) && !queue.some(item => item.url === url)) queue.push({ ...item, title: page!.title, company: page!.company, url })
        let resolved = false
        for (const url of page?.llms || []) {
          try {
            const doc = await this.document(url, budget), declared = higgsfieldDeclaredContract(doc.text, url)
            hashes.set(url, doc.hash)
            const previous = contracts.get(declared.id)
            if (previous && previous.hash !== declared.hash) throw new Error('Conflicting published input schemas for one Higgsfield model.')
            if (!previous) {
              schemaBytes += Buffer.byteLength(JSON.stringify(declared.schema))
              if (contracts.size >= 256 || schemaBytes > 8 * 1024 * 1024) throw new Error('Higgsfield declared inputs exceed the bounded contract count or size.')
            }
            contracts.set(declared.id, declared); documents.set(declared.id, url)
            const category = declared.category.replace(/2/g, '-to-')
            if (category.toLowerCase().includes('3d')) continue
            const label = page?.mode ? `${page.title} · ${page.mode}` : declared.title
            const structured = declared.schema.type === 'object' && object(declared.schema.properties)
            models.set(declared.id, { id: declared.id, label, category, catalog, description: structured ? 'Publicly documented Higgsfield API model. Account access and executed output are not attested.' : 'Published API declaration has no typed input structure; preserved as unavailable.', documentationUrl: url, nativeContractFingerprint: declared.hash })
            resolved = true
          } catch (error) { complete = false; warnings.push(`${page?.title || item.title}: ${error instanceof Error ? error.message : String(error)}`) }
        }
        if (!resolved) {
          complete = false
          models.set(`documentation::${item.url}`, { id: `documentation::${item.url}`, label: page?.title || item.title, category: item.category, catalog, documentationUrl: item.url, description: 'Published model/workflow has no verified API input contract; preserved as unavailable.' })
        }
      }
    }
    if (cursor < queue.length) { complete = false; warnings.push('More published variants remain beyond this bounded refresh.') }
    if (!contracts.size) throw new Error('No Higgsfield API model contract could be verified; the previous catalog was preserved.')
    // Previously verified identities survive partial/failing document traversal.
    if (!complete && this.snapshot) for (const model of this.snapshot.availability.models) if (!models.has(model.id)) models.set(model.id, model)
    for (const known of higgsfieldBundledCatalogModels()) if (!models.has(known.id)) models.set(known.id, known)
    for (const [id, value] of this.snapshot?.documents || []) if (!documents.has(id)) documents.set(id, value)
    const fingerprint = hash(JSON.stringify([...hashes].sort((a, b) => a[0].localeCompare(b[0]))))
    return { documents, contracts, availability: { provider: 'higgsfield', verified: true, models: [...models.values()], catalogComplete: complete, catalogCheckedAt: new Date(this.now()).toISOString(), catalogSource: HIGGSFIELD_PUBLIC_CATALOGS.join(' + '), catalogFingerprint: fingerprint, ...(warnings.length ? { catalogError: `${warnings.length} public model-document issue(s). ${warnings.slice(0, 3).join(' ')} Saved selections and prior identities were preserved.` } : {}) } }
  }
}
