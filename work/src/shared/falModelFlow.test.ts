import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { falCatalogModel } from './falModelCatalog'
import { falFlowMenuOptions, falProductionFlow } from './falModelFlow'
import { modelCatalogMenu } from './modelCatalogMenu'
import type { ServiceModelAvailability } from './types'

const captured = JSON.parse(readFileSync(new URL('falSchemaMedia.fixtures.json', import.meta.url), 'utf8'))
const models = captured.models.map(falCatalogModel)
const availability: ServiceModelAvailability = { provider: 'fal', verified: true, models }

describe('live fal production flow menus', () => {
  it('distinguishes repeated LTX display names without deleting or substituting endpoint routes', () => {
    const entries = ['text-to-video', 'image-to-video', 'image-to-video/lora', 'clean-plate', 'render-to-real'].map(path => falCatalogModel({
      endpoint_id: `fal-ai/ltx-2.3-quality/${path}`,
      metadata: { display_name: 'Ltx 2.3 Quality', status: 'active', category: path.startsWith('text') ? 'text-to-video' : path.startsWith('image') ? 'image-to-video' : 'video-to-video' },
    })!)
    const catalog: ServiceModelAvailability = { provider: 'fal', verified: true, models: [...entries, entries[0]] }
    const before = structuredClone(catalog)
    const options = falFlowMenuOptions('video', catalog)
    expect(options.map(option => option.value)).toEqual(entries.map(entry => entry.id))
    expect(new Set(options.map(option => option.label)).size).toBe(entries.length)
    expect(options[0].label).toBe('LTX 2.3 Quality · Text to Video')
    expect(options[2].label).toContain('LoRA')
    expect(options[3].label).toContain('Clean Plate')
    expect(options[4].label).toContain('Render To Real')
    expect(catalog).toEqual(before)
  })

  it('matches the model / tier / input naming while retaining a mode before a tier suffix', () => {
    const entry = falCatalogModel({ endpoint_id: 'lightricks/ltx-2.5/image-to-video/pro', metadata: { display_name: 'LTX 2.5 Image to Video Pro', category: 'video-to-video', status: 'active' } })!
    expect(entry.catalog).toMatchObject({ release: 'LTX 2.5 Pro', mode: 'Image to Video' })
    expect(falFlowMenuOptions('video', { provider: 'fal', verified: true, models: [entry] })[0]).toMatchObject({ value: entry.id, label: 'LTX 2.5 Pro · Image to Video' })
  })

  it('retains exact image/reference video routes despite the provider categorizing both as image-to-video', () => {
    const options = falFlowMenuOptions('video', availability)
    expect(options.map((option) => option.value)).toEqual(models.map((model: { id: string }) => model.id))
    expect(options.map((option) => option.catalog?.mode)).toEqual(['Image to Video', 'Reference to Video'])
    const tree = modelCatalogMenu([{ label: 'fal.ai', options }])
    expect(tree[0].releases[0].company).toBe('ByteDance')
    expect(tree[0].releases[0].options).toHaveLength(2)
    expect(falFlowMenuOptions('image', availability)).toEqual([])
  })

  it('retains all 140 discovered endpoints but projects two current releases in the menu', () => {
    const catalog: ServiceModelAvailability = { provider: 'fal', verified: true, models: Array.from({ length: 140 }, (_, index) => ({
      id: `fal-ai/model-${index}/text-to-video`, label: `Model ${index}`, category: 'text-to-video',
      catalog: { service: 'fal.ai', company: 'Fixture', release: `Model ${index}`, mode: 'Text to Video' },
    })) }
    const snapshot = structuredClone(catalog)
    const options = falFlowMenuOptions('video', catalog)
    const [provider] = modelCatalogMenu([{ label: 'fal.ai', options }])
    expect(options).toHaveLength(140)
    expect(provider.featured).toHaveLength(1)
    expect(provider.releases.map(release => release.label)).toEqual(['Model 139', 'Model 138'])
    expect(catalog).toEqual(snapshot)
  })

  it('preserves missing saved IDs without treating an incomplete, stale or native catalog as proof of absence', () => {
    const saved = { id: 'fal-ai/saved/text-to-video', label: 'Saved model' }
    expect(falFlowMenuOptions('video', availability, saved).at(-1)).toMatchObject({ value: saved.id, disabled: true })
    expect(falFlowMenuOptions('video', { ...availability, verified: false }, saved).at(-1)?.disabled).toBe(false)
    expect(falFlowMenuOptions('video', { ...availability, catalogStale: true }, saved).at(-1)?.disabled).toBe(false)
    expect(falFlowMenuOptions('video', { ...availability, provider: 'byteplus' })).toEqual([])
    expect(falFlowMenuOptions('video', undefined, saved).map((option) => option.value)).toEqual([saved.id])
  })

  it('keeps speech, effects and generated media separate while excluding retired music, training, 3D and analysis outputs', () => {
    expect(falProductionFlow('text-to-image')).toBe('image')
    expect(falProductionFlow('video-to-video')).toBe('video')
    expect(falProductionFlow('text-to-speech')).toBe('voice')
    expect(falProductionFlow('text-to-dialogue')).toBe('voice')
    expect(falProductionFlow('video-to-audio')).toBe('effects')
    for (const category of ['image-to-3d', 'image-to-mesh', 'training', 'text-to-music', 'speech-to-text', undefined]) expect(falProductionFlow(category)).toBeUndefined()
  })
})
