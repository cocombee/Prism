import { describe, expect, it, vi } from 'vitest'
import captured from './higgsfieldPublicCatalog.fixtures.json'
import { HiggsfieldPublicCatalog } from './higgsfieldCatalogDiscovery'
import { validateFalContractValue } from './falSchemaValidation'
import { HIGGSFIELD_GENJUTSU_MODELS } from '../shared/higgsfieldNative'

const id = 'bytedance/seedance-2.5/reference-to-video'
const source = `https://dash.higgsfield.ai/models/${id}/llms.txt`
const retained = captured.contracts[source]
const url = (i = 0) => `https://media.example/fixture-${i}.bin`
describe('independent Higgsfield captured conditional input contract', () => {
  it('reads the exact captured input through the actual native lookup owner, not a fal transport', async () => {
    const request = vi.fn(async (address: string, init: RequestInit) => {
      expect(address).toBe(source)
      expect(init.credentials).toBe('omit')
      expect(init.redirect).toBe('error')
      expect(init.headers || {}).not.toHaveProperty('Authorization')
      return new Response(retained.text, { headers: { 'content-type': 'text/plain' } })
    })
    const catalog = new HiggsfieldPublicCatalog(request)
    vi.spyOn(catalog, 'read').mockResolvedValue({ documents: new Map([[id, source]]), contracts: new Map(), availability: { provider: 'higgsfield', verified: true, models: [] } })
    const assertCurrent = vi.fn(), schema = await catalog.readContract(id, assertCurrent)
    expect(schema.if?.required).toEqual(['image_urls'])
    expect(schema.else?.if?.required).toEqual(['video_urls'])
    expect(schema.else?.else?.required).toEqual(['audio_urls'])
    const base = { prompt: 'Fictional contract test only', duration: 5 }
    for (const refs of [{ image_urls: [url()] }, { video_urls: [url()] }, { audio_urls: [url()] }, { image_urls: [url()], video_urls: [url()], audio_urls: [url()] }]) await expect(validateFalContractValue(schema, { ...base, ...refs })).resolves.toBeUndefined()
    await expect(validateFalContractValue(schema, base)).rejects.toThrow('audio_urls')
    for (const refs of [{ image_urls: [] }, { video_urls: [] }, { audio_urls: [] }, { image_urls: Array.from({ length: 31 }, (_, i) => url(i)) }, { video_urls: Array.from({ length: 11 }, (_, i) => url(i)) }, { audio_urls: Array.from({ length: 11 }, (_, i) => url(i)) }, { image_urls: null }, { audio_urls: [5] }]) await expect(validateFalContractValue(schema, { ...base, ...refs })).rejects.toThrow()
    expect(request).toHaveBeenCalledOnce()
    expect(assertCurrent).toHaveBeenCalled()
    expect(HIGGSFIELD_GENJUTSU_MODELS).toHaveLength(3)
    expect(HIGGSFIELD_GENJUTSU_MODELS.some(model => String(model.id) === id)).toBe(false)
  })
})
