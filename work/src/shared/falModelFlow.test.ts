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
