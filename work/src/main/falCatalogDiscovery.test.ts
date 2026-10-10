import { describe, expect, it } from 'vitest'
import { readFalModelCatalog } from './falCatalogDiscovery'
import { falCatalogModel, falEndpointId } from '../shared/falModelCatalog'
import { modelCatalogMenu } from '../shared/modelCatalogMenu'

const model = (id = 'bytedance/seedance-2.5/text-to-video', extra: Record<string, unknown> = {}) => ({ endpoint_id: id, metadata: { display_name: 'Seedance 2.5 Text to Video', category: 'text-to-video', status: 'active', kind: 'inference', date: '2026-07-20T21:03:22.667Z', ...extra } })
const page = (models: unknown[], next_cursor: string | null = null, has_more = Boolean(next_cursor)) => new Response(JSON.stringify({ models, next_cursor, has_more }))

describe('complete public fal discovery', () => {
  it('reads every page, keeps exact IDs and deduplicates repeated endpoints', async () => {
    const calls: string[] = []
    const catalog = await readFalModelCatalog({ request: async (url) => { calls.push(url); return calls.length === 1 ? page([model()], 'next') : page([model(), model('minimax/h3-max/text-to-video', { display_name: 'MiniMax H3 Max Text to Video' })]) } })
    expect(catalog.map((item) => item.id)).toEqual(['bytedance/seedance-2.5/text-to-video', 'minimax/h3-max/text-to-video'])
    expect(new URL(calls[1]).searchParams.get('cursor')).toBe('next')
    expect(catalog[0].catalog).toEqual({ service: 'fal.ai', company: 'ByteDance', release: 'Seedance 2.5', mode: 'Text to Video', releasedAt: '2026-07-20T21:03:22.667Z' })
  })

  it('uses an opaque cursor as a query value, never as a provider URL', async () => {
    const calls: string[] = []
    const cursor = 'https://other.invalid/path?key=unrelated'
    await readFalModelCatalog({ request: async (url) => { calls.push(url); return calls.length === 1 ? page([], cursor) : page([]) } })
    expect(new URL(calls[1]).origin).toBe('https://api.fal.ai')
    expect(new URL(calls[1]).pathname).toBe('/v1/models')
    expect(new URL(calls[1]).searchParams.get('cursor')).toBe(cursor)
  })

  it('accepts verified empty discovery and excludes standalone 3D/training/deprecated flows', async () => {
    expect(await readFalModelCatalog({ request: async () => page([]) })).toEqual([])
    const records = [model(), model('fal-ai/mesh', { category: 'image-to-3d' }), model('fal-ai/trainer', { category: 'training', kind: 'training' }), model('fal-ai/retired', { status: 'deprecated' })]
    expect(await readFalModelCatalog({ request: async () => page(records) })).toHaveLength(1)
  })

  it.each([
    { models: [], has_more: true, next_cursor: null },
    { models: [], has_more: false, next_cursor: 'ignored' },
    { models: [], has_more: 'false', next_cursor: null },
    { models: {}, has_more: false, next_cursor: null },
    { models: [{ endpoint_id: 'valid/id' }], has_more: false, next_cursor: null },
  ])('rejects malformed/incomplete pages instead of returning a partial catalog', async (body) => {
    await expect(readFalModelCatalog({ request: async () => new Response(JSON.stringify(body)) })).rejects.toThrow()
  })

  it('rejects repeated cursors and bounded-out pages', async () => {
    await expect(readFalModelCatalog({ request: async () => page([model()], 'same') })).rejects.toThrow('Repeated')
    await expect(readFalModelCatalog({ maxPages: 1, request: async () => page([model()], 'more') })).rejects.toThrow('incomplete')
    await expect(readFalModelCatalog({ maxRecords: 1, request: async () => page([model(), model('minimax/h3')]) })).rejects.toThrow('incomplete')
  })

  it('does not return earlier records when a later page fails', async () => {
    let call = 0
    await expect(readFalModelCatalog({ request: async () => ++call === 1 ? page([model()], 'next') : new Response('{}', { status: 429 }) })).rejects.toMatchObject({ status: 429 })
  })

  it('stops obsolete discovery before requesting another page', async () => {
    let current = true, calls = 0
    await expect(readFalModelCatalog({ assertCurrent: () => { if (!current) throw new DOMException('obsolete', 'AbortError') }, request: async () => { calls += 1; current = false; return page([model()], 'next') } })).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toBe(1)
  })

  it('retains complete discovery while menus group modes and show two latest releases per family', () => {
    const records = [model(), model('bytedance/seedance-2.5/image-to-video', { display_name: 'Seedance 2.5 Image to Video', category: 'image-to-video' }), ...Array.from({ length: 7 }, (_, index) => model(`minimax/h${index}/text-to-video`, { display_name: `MiniMax H${index} Text to Video` }))]
    const options = records.map((item) => falCatalogModel(item)!).map((item) => ({ value: item.id, label: item.label, catalog: item.catalog }))
    const [provider] = modelCatalogMenu([{ label: 'fal.ai', options }])
    expect(provider.featured).toHaveLength(2)
    expect(provider.releases).toHaveLength(3)
    expect(provider.releases.find((item) => item.company === 'ByteDance')?.options).toHaveLength(2)
    expect(provider.releases.flatMap((item) => item.options)).toHaveLength(4)
    expect(options).toHaveLength(9)
  })

  it('never replaces release date with metadata update time or accepts a remote URL as an ID', () => {
    const value = falCatalogModel(model('minimax/h3-max', { date: undefined, updated_at: '2026-10-08T12:00:00Z' }))!
    expect(value.catalog.releasedAt).toBeUndefined()
    expect(value.updatedAt).toBe('2026-10-08T12:00:00Z')
    for (const id of ['https://other.invalid/model', '../model', 'fal-ai/../model', 'fal-ai/model?key=secret', 'fal-ai/model#part']) expect(() => falEndpointId(id)).toThrow()
  })

  it('projects official dotted FLUX names through the real catalog owner without deleting discovery or saved state', () => {
    const records = [
      model('fal-ai/flux/dev', { display_name: 'FLUX.1 [dev]', category: 'text-to-image' }),
      model('fal-ai/flux-2', { display_name: 'FLUX.2 [dev]', category: 'text-to-image' }),
      model('fal-ai/flux-2-pro', { display_name: 'FLUX.2 [pro]', category: 'text-to-image' }),
    ]
    const catalog = records.map(record => falCatalogModel(record)!)
    const saved = { model: catalog[0].id, prompt: ' Original prompt ', references: ['one', 'two'] }
    const before = structuredClone({ records, catalog, saved })
    const options = catalog.map(item => ({ value: item.id, label: item.label, catalog: item.catalog }))
    const menu = modelCatalogMenu([{ label: 'fal.ai', options }])
    expect(menu[0].releases.map(release => release.label)).toEqual(['FLUX 2', 'FLUX 1'])
    expect(menu[0].featured.map(release => release.label)).toEqual(['FLUX 2'])
    expect(menu[0].releases[0].options.map(option => option.value)).toEqual(['fal-ai/flux-2', 'fal-ai/flux-2-pro'])
    const refreshed = [...options, { value: 'fixture/flux-next', label: 'FLUX.3 [future fixture]', catalog: { service: 'fal.ai', company: 'Black Forest Labs', release: 'FLUX.3 [future fixture]', mode: 'Text to Image' } }]
    expect(modelCatalogMenu([{ label: 'fal.ai', options: refreshed }])[0].releases.flatMap(release => release.options).map(option => option.value)).not.toContain(saved.model)
    expect({ records, catalog, saved }).toEqual(before)
    expect(catalog).toHaveLength(3)
  })
  it('keeps status on a non-JSON failure and rejects oversized successful pages', async () => {
    await expect(readFalModelCatalog({ request: async () => new Response('temporarily unavailable', { status: 503 }) })).rejects.toMatchObject({ status: 503 })
    await expect(readFalModelCatalog({ request: async () => new Response(' '.repeat(8 * 1024 * 1024 + 1)) })).rejects.toThrow('supported size')
  })

  it('retains the declared endpoint reference mode even when the category is broader', () => {
    const value = falCatalogModel(model('bytedance/seedance-2.5/reference-to-video', { display_name: 'Seedance 2.5 Reference to Video', category: 'image-to-video' }))!
    expect(value.catalog.mode).toBe('Reference to Video')
    expect(value.catalog.release).toBe('Seedance 2.5')
    expect(falCatalogModel(model('fal-ai/veo3/text-to-video'))!.catalog.company).toBe('Google')
  })

})
