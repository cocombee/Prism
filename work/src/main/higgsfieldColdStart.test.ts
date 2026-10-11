import { describe, expect, it } from 'vitest'
import captured from './higgsfieldPublicCatalog.fixtures.json'
import sources from './higgsfieldDeclaredDocumentSources.json'
import { HiggsfieldPublicCatalog, higgsfieldDeclaredContract } from './higgsfieldCatalogDiscovery'

describe('selected Higgsfield schema loads independently of discovery', () => {
  it('uses only previously verified published document identities', () => {
    const documents = captured.contracts as Record<string, { text: string }>
    for (const [id, url] of Object.entries(sources.documents)) expect(higgsfieldDeclaredContract(documents[url].text, url).id).toBe(id)
  })

  it('loads a cold selected video schema while unrelated image discovery is still blocked', async () => {
    const selected = 'alibaba/wan-3.0/text-to-video'
    const calls: string[] = []
    let release!: () => void, entered!: () => void
    const blocked = new Promise<void>(resolve => { release = resolve })
    const imageEntered = new Promise<void>(resolve => { entered = resolve })
    const catalog = new HiggsfieldPublicCatalog(async (url: string) => {
      calls.push(url)
      if (url === captured.catalogs.image.source) { entered(); await blocked }
      const root = Object.values(captured.catalogs).find(item => item.source === url)
      const pages = captured.pages as Record<string, { html: string }>
      const documents = captured.contracts as Record<string, { text: string }>
      const text = root?.html || pages[url]?.html || documents[url]?.text
      return new Response(text || 'Missing published document', { status: text ? 200 : 404, headers: { 'content-type': url.endsWith('/llms.txt') ? 'text/plain' : 'text/html' } })
    })
    const discovering = catalog.read()
    await imageEntered
    try {
      const schema = await catalog.readContract(selected, () => undefined)
      expect(schema.properties?.duration).toBeDefined()
      expect(schema.properties?.aspect_ratio).toBeDefined()
      expect(schema.properties?.resolution).toBeDefined()
      expect(calls).toEqual([captured.catalogs.video.source, captured.catalogs.image.source, sources.documents[selected]])
    } finally { release(); await discovering }
  })

  it('rejects a changed identity on a priority document rather than substituting a route', async () => {
    const selected = 'alibaba/wan-3.0/text-to-video'
    const url = sources.documents[selected]
    const doc = (captured.contracts as Record<string, { text: string }>)[url]
    const catalog = new HiggsfieldPublicCatalog(async () => new Response(doc.text.replaceAll(selected, 'alibaba/wrong-model/text-to-video'), { headers: { 'content-type': 'text/plain' } }))
    await expect(catalog.readContract(selected, () => undefined)).rejects.toThrow('identity')
  })
})
