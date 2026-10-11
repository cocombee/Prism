import { describe, expect, it } from 'vitest'
import { modelCompanyFor, videoModelGroups } from './NodeCardNext'
import { modelCatalogMenu } from '../../shared/modelCatalogMenu'
import type { ServiceModelAvailability } from '../../shared/types'
describe('independent Higgsfield native catalog identity', () => {
  it('keeps actual service/company/release/mode metadata, hides image-only entries, and preserves unknown saved selections', () => {
    const availability: ServiceModelAvailability = { provider: 'higgsfield', verified: true, models: [
      { id: 'bytedance/seedance-3.0/reference-to-video', label: 'Seedance 3.0 · References', category: 'image-to-video', catalog: { service: 'Higgsfield', company: 'ByteDance', release: 'Seedance 3.0', mode: 'References', releasedAt: '2026-10-09' } },
      { id: 'minimax/future/text-to-video', label: 'Future MiniMax', category: 'text-to-video', catalog: { service: 'Higgsfield', company: 'MiniMax', release: 'Future MiniMax', mode: 'Text' } },
      { id: 'higgsfield/genjutsu/restyle/v1.0', label: 'Genjutsu · Restyle', category: 'video-to-video', catalog: { service: 'Higgsfield', company: 'Higgsfield', release: 'Genjutsu', mode: 'Restyle' } },
      { id: 'image/only', label: 'Image Only', category: 'text-to-image' },
    ] }
    const saved = { higgsfieldNative: { endpointId: 'saved/retired', label: 'Saved Retired', contractRevision: 'original', values: { prompt: '  Original  ' } } }
    const original = structuredClone(saved)
    const options = videoModelGroups(undefined, availability, saved).find(group => group.label === 'Higgsfield')!.options
    expect(options.map(option => option.value)).not.toContain('higgsfield-native::image/only')
    expect(options.find(option => option.value.includes('seedance-3.0'))).toMatchObject({ provider: 'bytedance', disabled: true, catalog: availability.models[0].catalog })
    expect(options.find(option => option.value.includes('minimax/'))).toMatchObject({ provider: 'minimax', disabled: true })
    expect(options.find(option => option.value.endsWith('restyle/v1.0'))).toBeUndefined()
    expect(options.find(option => option.value.endsWith('saved/retired'))).toMatchObject({ disabled: true, label: 'Unavailable (Saved Retired)' })
    expect(saved).toEqual(original)
  })
  it('removes bundled, discovered and documentation Genjutsu entries without losing Higgsfield video models or saved data', () => {
    const bundled = videoModelGroups().find(group => group.service === 'higgsfield')!
    expect(bundled.options.some(option => /genjutsu/i.test(option.value + option.label))).toBe(false)
    expect(bundled.options.some(option => option.value.endsWith('seedance-2.5/video-edit'))).toBe(true)
    const saved = { higgsfieldNative: { endpointId: 'higgsfield/genjutsu/object-swap/v1.0', label: 'Genjutsu · Object Swap', contractRevision: 'original', values: { prompt: '  Exact prompt  ', resolution: '1080p' } } }
    const original = structuredClone(saved)
    const availability: ServiceModelAvailability = { provider: 'higgsfield', verified: true, models: [
      { id: saved.higgsfieldNative.endpointId, label: saved.higgsfieldNative.label },
      { id: 'documentation::https://open.higgsfield.ai/models/workflows/genjutsu/playground', label: 'Workflow', catalog: { service: 'Higgsfield', company: 'Higgsfield', release: 'Genjutsu 1.0' } },
      { id: 'future/opaque/workflow', label: 'Native workflow', catalog: { service: 'Higgsfield', company: 'Higgsfield', release: 'Genjutsu 2.0' } },
      { id: 'bytedance/seedance-2.5/video-edit', label: 'Seedance 2.5 · Video Edit' },
    ] }
    const groups = videoModelGroups({ provider: 'fal', verified: true, models: [{ id: 'fal-ai/fixture/video', label: 'Fal fixture', category: 'text-to-video' }] }, availability, saved)
    expect(groups.find(group => group.service === 'higgsfield')!.options.map(option => option.value)).toEqual(['higgsfield-native::bytedance/seedance-2.5/video-edit'])
    expect(groups.some(group => group.options.some(option => option.value.startsWith('byteplus/')))).toBe(true)
    expect(groups.some(group => group.service === 'fal')).toBe(true)
    expect(saved).toEqual(original)
    expect(availability.models).toHaveLength(4)
  })
  it('uses the actual vendor rather than the native namespace for known and unknown logos', () => {
    expect(modelCompanyFor('higgsfield-native::bytedance/seedance-3.0/reference-to-video', 'ByteDance')).toBe('bytedance')
    expect(modelCompanyFor('higgsfield-native::minimax/future/text-to-video', 'MiniMax')).toBe('minimax')
    expect(modelCompanyFor('Higgsfield')).toBe('higgsfield')
    expect(modelCompanyFor('fal-native::kling-video/v3', 'Kling')).toBe('kuaishou')
  })
  it('uses published native Wan modes as variations of 3.0 and keeps only 2.7 as its predecessor', () => {
    const availability: ServiceModelAvailability = { provider: 'higgsfield', verified: true, models: ['2.2', '2.6', '2.7', '3.0'].flatMap(version => ['Text to Video', 'Image to Video', 'Reference to Video'].map(mode => ({
      id: `wan/${version}/${mode}`, label: `Wan ${version} ${mode}`, category: 'text-to-video',
      catalog: { service: 'Higgsfield', company: 'Alibaba', release: `Wan ${version} ${mode}`, mode },
    }))) }
    const [provider] = modelCatalogMenu(videoModelGroups(undefined, availability).filter(group => group.label === 'Higgsfield'))
    expect(provider.releases.map(release => release.label)).toEqual(['Wan 3.0', 'Wan 2.7'])
    expect(provider.releases[0].options).toHaveLength(3)
    expect(provider.releases.every(release => release.options.every(option => option.disabled))).toBe(true)
    expect(availability.models).toHaveLength(12)
  })

})
