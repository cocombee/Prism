import { describe, expect, it, vi } from 'vitest'
import captured from './higgsfieldPublicCatalog.fixtures.json'
import { HiggsfieldPublicCatalog, higgsfieldCatalogRoots, higgsfieldDeclaredContract, higgsfieldDocumentUrl, higgsfieldPublishedPage } from './higgsfieldCatalogDiscovery'
import { ScopedCatalogCache } from './scopedCatalogCache'
const pages = captured.pages as Record<string, { html: string }>, contracts = captured.contracts as Record<string, { text: string; id: string; schema: any }>
const genjutsu = 'higgsfield/genjutsu/motion-transfer/v1.0'
const source = `https://dash.higgsfield.ai/models/${genjutsu}/llms.txt`
function transport() {
  return vi.fn(async (url: string, init: RequestInit) => {
    expect(init.credentials).toBe('omit'); expect(init.redirect).toBe('error')
    expect(init.headers || {}).not.toHaveProperty('Authorization'); expect(init.headers || {}).not.toHaveProperty('Cookie')
    const root = Object.values(captured.catalogs).find(item => item.source === url)
    const text = root?.html || pages[url]?.html || contracts[url]?.text
    return new Response(text || 'Missing published document', { status: text ? 200 : 404, headers: { 'content-type': url.endsWith('/llms.txt') ? 'text/plain' : 'text/html' } })
  })
}
describe('Higgsfield public API discovery owns its metadata and schemas', () => {
  it('reads exactly the captured 23 video and 13 image model cards without using scripts/navigation/media', () => {
    for (const [kind, count] of [['video', 23], ['image', 13]] as const) {
      const { html, source } = captured.catalogs[kind]
      const result = higgsfieldCatalogRoots(html + '<script>throw new Error("never execute")</script><a href="/models/fake/playground">Fake</a>', source)
      expect(result).toHaveLength(count)
      expect(result.every(item => item.category === kind)).toBe(true)
    }
    expect(higgsfieldCatalogRoots(captured.catalogs.video.html, captured.catalogs.video.source)[0]).toMatchObject({ title: 'Seedance 2.5', company: 'bytedance' })
  })
  it('reads published company, family, mode and agent-query llms URL without deserializing router code', () => {
    const url = 'https://open.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/playground'
    const result = higgsfieldPublishedPage(pages[url].html, url, { title: 'ignored', company: 'ignored' })
    expect(result).toMatchObject({ title: 'Seedance 2.5', mode: 'Text-to-Video', company: 'ByteDance' })
    expect(result.llms).toEqual(['https://dash.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/llms.txt'])
    expect(result.releasedAt).toBe('2026-07-01')
  })
  it('parses all 85 exact schemas and preserves native conditional and nested constraints', () => {
    for (const [url, document] of Object.entries(contracts)) expect(higgsfieldDeclaredContract(document.text, url)).toMatchObject({ id: document.id, schema: document.schema })
    const seedance = higgsfieldDeclaredContract(contracts['https://dash.higgsfield.ai/models/bytedance/seedance-2.5/reference-to-video/llms.txt'].text, 'https://dash.higgsfield.ai/models/bytedance/seedance-2.5/reference-to-video/llms.txt')
    expect(seedance.schema).toHaveProperty('if'); expect(seedance.schema).toHaveProperty('else')
    expect((seedance.schema.properties as any).image_urls.maxItems).toBe(30)
  })
  it('traverses current root and declared variant links, using exact schema IDs and retaining explicit unresolved workflows', async () => {
    const request = transport(), catalog = new HiggsfieldPublicCatalog(request)
    const snapshot = await catalog.read()
    expect(snapshot.contracts.size).toBe(85)
    expect(snapshot.availability.models.some(model => model.id === 'bytedance/seedance-2.5/reference-to-video' && model.catalog?.company === 'ByteDance')).toBe(true)
    expect(snapshot.availability.models.some(model => model.id === 'higgsfield/cinema-studio/4.0' && model.catalog?.release === 'Cinema Studio 4.0')).toBe(true)
    expect(snapshot.availability.catalogComplete).toBe(false)
    expect(snapshot.availability.catalogError).toContain('404')
    expect(snapshot.availability.models.some(model => model.id.startsWith('documentation::') && model.description?.includes('unavailable'))).toBe(true)
    const count = request.mock.calls.length
    expect(await catalog.read()).toBe(snapshot); expect(request).toHaveBeenCalledTimes(count)
    expect(request.mock.calls.every(([url]) => !url.includes('/assets/') && !url.startsWith('https://api.higgsfield.ai'))).toBe(true)
  })
  it('revalidates a selected current schema, including narrowed limits and new required fields before uploads', async () => {
    const request = transport(), catalog = new HiggsfieldPublicCatalog(request)
    await catalog.read()
    const input = { video_url: 'https://media.example/video.mp4', image_urls: ['https://media.example/image.png'], resolution: '720p', prompt: '' }
    await catalog.validate(genjutsu, input, () => undefined)
    const original = contracts[source].text
    request.mockImplementation(async (url, init) => {
      expect(init.credentials).toBe('omit')
      const changed = JSON.parse(JSON.stringify(contracts[source].schema)); changed.properties.image_urls.maxItems = 0
      return new Response(original.replace(JSON.stringify(contracts[source].schema, null, 2), JSON.stringify(changed, null, 2)), { headers: { 'content-type': 'text/plain' } })
    })
    await expect(catalog.validate(genjutsu, input, () => undefined)).rejects.toThrow()
    expect(input.image_urls).toHaveLength(1)
    request.mockImplementation(async () => {
      const changed = JSON.parse(JSON.stringify(contracts[source].schema)); changed.properties.new_control = { type: 'string' }; changed.required.push('new_control')
      return new Response(original.replace(JSON.stringify(contracts[source].schema, null, 2), JSON.stringify(changed, null, 2)), { headers: { 'content-type': 'text/plain' } })
    })
    await expect(catalog.validate(genjutsu, input, () => undefined)).rejects.toThrow()
    expect(input).not.toHaveProperty('new_control')
  })
  it('does not drop conditional rules merely to enable native Seedance reference mode', async () => {
    const catalog = new HiggsfieldPublicCatalog(transport())
    await catalog.read()
    const schema = await catalog.readContract('bytedance/seedance-2.5/reference-to-video', () => undefined)
    expect(schema.if?.required).toEqual(['image_urls'])
    expect(schema.else?.if?.required).toEqual(['video_urls'])
    expect(schema.else?.else?.required).toEqual(['audio_urls'])
  })
  it('supports conditional public-document ETag reads without sending account headers', async () => {
    const request = transport(), catalog = new HiggsfieldPublicCatalog(request)
    await catalog.read()
    let calls = 0
    request.mockImplementation(async (url, init) => {
      expect(url).toBe(source); expect(init.credentials).toBe('omit')
      if (++calls === 1) return new Response(contracts[source].text, { headers: { 'content-type': 'text/plain', etag: '"public-schema-v1"' } })
      expect(init.headers).toEqual({ 'If-None-Match': '"public-schema-v1"' })
      return new Response(null, { status: 304 })
    })
    await expect(catalog.readContract(genjutsu, () => undefined)).resolves.toHaveProperty('properties.image_urls.maxItems', 8)
    await expect(catalog.readContract(genjutsu, () => undefined)).resolves.toHaveProperty('properties.image_urls.maxItems', 8)
  })
  it('coalesces a public read while rejecting a superseded service/profile owner through the existing scoped cache', async () => {
    const request = transport(), catalog = new HiggsfieldPublicCatalog(request), owned = new ScopedCatalogCache<any>(10000)
    let active = 'original'
    const original = owned.read('original', async () => (await catalog.read()).availability, () => { if (active !== 'original') throw Error('Superseded') })
    // Attach rejection observation before allowing the other profile to complete.
    const stopped = expect(original).rejects.toThrow('Superseded')
    active = 'replacement'
    const replacement = owned.read('replacement', async () => (await catalog.read()).availability, () => { if (active !== 'replacement') throw Error('Superseded') })
    const result = await replacement; await stopped
    expect(result.provider).toBe('higgsfield'); expect(owned.snapshot('replacement')).toBe(result); expect(owned.snapshot('original')).toBeUndefined()
    expect(request.mock.calls.filter(([url]) => url === captured.catalogs.video.source)).toHaveLength(1)
  })
  it('retains the last owned catalog on later root access failures rather than publishing an empty list', async () => {
    let now = 0
    const request = transport(), catalog = new HiggsfieldPublicCatalog(request, () => now, 1000), owned = new ScopedCatalogCache<any>(500, () => now)
    const initial = await owned.read('same', async () => (await catalog.read()).availability, () => undefined)
    now = 2000; request.mockResolvedValue(new Response('Denied', { status: 403, headers: { 'content-type': 'text/plain' } }))
    await expect(owned.read('same', async () => (await catalog.read()).availability, () => undefined)).rejects.toThrow('403')
    expect(owned.snapshot('same')).toBe(initial); expect(initial.models.length).toBeGreaterThan(85)
  })
  it('marks bounded partial traversal and keeps known Genjutsu IDs without guessing pending modes', async () => {
    const catalog = new HiggsfieldPublicCatalog(transport())
    const snapshot = await catalog.refresh({ maxRequests: 6, maxBytes: 2097152, maxTotalBytes: 67108864, timeoutMs: 10000, totalMs: 120000 })
    expect(snapshot.availability.catalogComplete).toBe(false)
    expect(snapshot.availability.catalogError).toContain('bounded')
    expect(snapshot.availability.models.some(model => model.id === genjutsu)).toBe(true)
  })
  it.each(['status','non-text','header-size','stream-size','total-size'])('rejects %s public transport data without producing a usable empty catalog', async kind => {
    const request=vi.fn(async()=>{
      if(kind==='status')return new Response('Denied',{status:403,headers:{'content-type':'text/plain'}})
      if(kind==='non-text')return new Response('binary',{headers:{'content-type':'video/mp4'}})
      if(kind==='header-size')return new Response('x',{headers:{'content-type':'text/plain','content-length':'2097153'}})
      if(kind==='stream-size')return new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(2097153));controller.close()}}),{headers:{'content-type':'text/plain'}})
      return new Response(captured.catalogs.video.html,{headers:{'content-type':'text/html'}})
    })
    const catalog=new HiggsfieldPublicCatalog(request)
    await expect(catalog.refresh({maxRequests:384,maxBytes:2097152,maxTotalBytes:kind==='total-size'?1:67108864,timeoutMs:10000,totalMs:120000})).rejects.toThrow()
    expect(request).toHaveBeenCalledOnce()
  })
  it('handles malformed repeated HTML delimiters without evaluating scripts or a greedy whole-document retry', () => {
    const data='<script>'.repeat(100000)
    expect(()=>higgsfieldCatalogRoots(data,captured.catalogs.video.source)).toThrow(/no readable/)
    expect(()=>higgsfieldPublishedPage('<h1>'.repeat(100000),'https://open.higgsfield.ai/models/a/playground',{title:'A',company:'Company'})).toThrow(/structure/)
  })
  it.each(['http://open.higgsfield.ai/models/a/playground', 'https://example.com/models/a/playground', 'https://open.higgsfield.ai/models/a/playground?key=secret', 'https://open.higgsfield.ai/models/3d-jutsu/a/playground', 'https://open.higgsfield.ai/assets/index.js'])('rejects unsupported discovery URL %s', url => {
    expect(() => higgsfieldDocumentUrl(url)).toThrow()
  })
  it.each(['missing', 'duplicate', 'foreign-endpoint', 'external-ref', 'prototype'])('fails closed on %s contract data', kind => {
    let text = contracts[source].text
    if (kind === 'missing') text = text.replace('### Input JSON Schema', '### Other schema')
    if (kind === 'duplicate') text += '\n' + text
    if (kind === 'foreign-endpoint') text = text.replace('https://api.higgsfield.ai/', 'https://api.example.com/')
    if (kind === 'external-ref') text = text.replace('"properties": {', '"$ref":"https://example.com/schema","properties": {')
    if (kind === 'prototype') text = text.replace('"properties": {', '"__proto__":{},"properties": {')
    expect(() => higgsfieldDeclaredContract(text, source)).toThrow()
  })
  it('rejects ambiguous/empty/paginated cards and ignores a synthetic inline executable URL', () => {
    expect(() => higgsfieldCatalogRoots('<main/>', captured.catalogs.video.source)).toThrow()
    expect(() => higgsfieldCatalogRoots(captured.catalogs.video.html + '<a rel="next" href="/explore/video?page=2">Next</a>', captured.catalogs.video.source)).toThrow(/pagination/)
    const url = 'https://open.higgsfield.ai/models/a/playground'
    const parsed = higgsfieldPublishedPage('<h1>Model</h1><script>fetch("https://dash.higgsfield.ai/models/fake/llms.txt")</script>', url, { title: 'Model', company: 'Company' })
    expect(parsed.llms).toEqual([])
  })
})
