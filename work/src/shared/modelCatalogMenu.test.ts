import { describe, expect, it } from 'vitest'
import { isRecentModelRelease, modelCatalogMenu, visibleModelCatalogOptions } from './modelCatalogMenu'
import { VIDEO_MODELS } from './videoModels'

const modes = (service = 'fal.ai') => ['2.5', '2.0'].flatMap((version) => ['text', 'image', 'reference'].map((mode) => ({
  value: `${service}/${version}/${mode}`, label: `Seedance ${version} · ${mode}`,
  catalog: { service, company: 'ByteDance', release: `Seedance ${version}`, mode },
})))

describe('two latest releases per service/company/family', () => {
  it('keeps named-version order within a family and ranks featured families by published dates', () => {
    const now = Date.parse('2026-10-09T12:00:00Z')
    const options = [
      { value: 'old-high-number', label: 'Model 100', catalog: { service: 'fal.ai', company: 'A', release: 'Model 100', releasedAt: '2026-01-01' } },
      { value: 'new-low-number', label: 'Model 2', catalog: { service: 'fal.ai', company: 'A', release: 'Model 2', releasedAt: '2026-08-01' } },
      { value: 'newest', label: 'Named release', catalog: { service: 'fal.ai', company: 'B', release: 'Named release', releasedAt: '2026-09-01' } },
      ...modes('BytePlus'),
    ]
    const snapshot = structuredClone(options)
    const providers = modelCatalogMenu([{ label: '', options }], 5, now)
    expect(providers[0].featured.map((release) => release.options[0].value)).toEqual(['newest', 'old-high-number'])
    expect(providers[0].featured.every((release) => !release.isNew)).toBe(true)
    expect(providers[1].featured.map((release) => release.label)).toEqual(['Seedance 2.5'])
    expect(options).toEqual(snapshot)
  })

  it('retains the newest verified mode date regardless of mode discovery order', () => {
    const now = Date.parse('2026-10-09T12:00:00Z')
    const options = modes().slice(0, 3).map((option, index) => ({ ...option, catalog: { ...option.catalog, releasedAt: ['2026-01-01', '2026-10-01', '2027-01-01'][index] } }))
    for (const order of [options, [...options].reverse()]) {
      const release = modelCatalogMenu([{ label: 'fal.ai', options: order }], 5, now)[0].featured[0]
      expect(release.releasedAt).toBe('2026-10-01')
      expect(release.isNew).toBe(true)
      expect(release.options).toHaveLength(3)
    }
  })
  it('counts releases rather than modes and preserves the full older release', () => {
    const menu = modelCatalogMenu([{ label: 'fal.ai', options: modes() }])
    expect(menu[0].featured.map((release) => release.label)).toEqual(['Seedance 2.5'])
    expect(menu[0].releases.flatMap((release) => release.options)).toEqual(modes())
    expect(menu[0].featured[0].options.map((option) => option.catalog.mode)).toEqual(['text', 'image', 'reference'])
  })

  it('keeps same-named releases and routes independent across services', () => {
    const menu = modelCatalogMenu([{ label: '', options: [...modes(), ...modes('BytePlus')] }])
    expect(menu.map((provider) => provider.label)).toEqual(['fal.ai', 'BytePlus'])
    expect(menu[0].featured[0].key).not.toBe(menu[1].featured[0].key)
    expect(menu.flatMap((provider) => provider.releases.flatMap((release) => release.options))).toHaveLength(12)
  })

  it('projects two latest releases without changing the full discovery input', () => {
    const options = Array.from({ length: 10 }, (_, index) => ({ value: `model-${index}`, label: `Model ${index}` }))
    const snapshot = structuredClone(options)
    const [provider] = modelCatalogMenu([{ label: 'Native', options }])
    expect(provider.featured.map((release) => release.label)).toEqual(['Model 9'])
    expect(provider.releases.flatMap((release) => release.options).map((option) => option.value)).not.toContain('model-0')
    expect(options).toEqual(snapshot)
    expect(modelCatalogMenu([{ label: 'Native', options }], 100)[0].featured).toHaveLength(1)
  })

  it('deduplicates exact options and excludes disabled releases only from featured', () => {
    const first = { value: 'saved', label: 'Unavailable saved model', disabled: true }
    const available = { value: 'live', label: 'Live model' }
    const [provider] = modelCatalogMenu([{ label: 'Native', options: [first, available, available] }])
    expect(provider.featured.flatMap((release) => release.options)).toEqual([available])
    expect(provider.releases.flatMap((release) => release.options)).toEqual([first, available])
  })

  it('expands release choices only; search reaches the two retained releases', () => {
    const menu = modelCatalogMenu([{ label: 'fal.ai', options: modes() }])
    const expanded = new Set(['fal.ai', menu[0].releases[1].key])
    expect(visibleModelCatalogOptions(menu, expanded).map((option) => option.catalog.release)).toEqual(['Seedance 2.0', 'Seedance 2.0', 'Seedance 2.0'])
    expect(visibleModelCatalogOptions(menu, new Set(), true)).toHaveLength(6)
    expect(visibleModelCatalogOptions(menu, new Set())).toEqual([])
  })

  it('preserves every adapter-supported video mode and separates fal from BytePlus', () => {
    const options = VIDEO_MODELS.map((model) => ({ value: model.id, label: model.label, catalog: {
      service: model.provider, company: model.family, release: model.shortLabel, mode: model.mode,
    } }))
    const menu = modelCatalogMenu([{ label: '', options }])
    expect(menu.map((provider) => provider.label)).toEqual(['fal', 'byteplus'])
    expect(menu.flatMap((provider) => provider.releases.flatMap((release) => release.options)).map((option) => option.value)).toEqual(expect.arrayContaining(VIDEO_MODELS.map((model) => model.id)))
    for (const provider of menu) {
      expect(provider.featured.length).toBeLessThanOrEqual(5)
      expect(provider.featured.every((release) => release.options.every((option) => option.catalog.service === provider.label))).toBe(true)
    }
  })

  it('offers single-route models directly without a provider dropdown', () => {
    const options = [{ value: 'native::v3', label: 'Eleven v3' }, { value: 'native::v4', label: 'Eleven v4' }]
    const menu = modelCatalogMenu([{ label: 'Native', options }])
    expect(visibleModelCatalogOptions(menu, new Set())).toEqual([...options].reverse())
  })
  it('keeps each service independent when two catalogs use the same model identifier', () => {
    const menu = modelCatalogMenu([
      { label: 'fal.ai', options: [{ value: 'shared-id', label: 'fal release', catalog: { service: 'fal.ai', company: 'Fixture', release: 'fal release' } }] },
      { label: 'Native', options: [{ value: 'shared-id', label: 'native release', catalog: { service: 'Native', company: 'Fixture', release: 'native release' } }] },
    ])
    expect(menu.map(provider => [provider.label, provider.featured[0].label])).toEqual([['fal.ai', 'fal release'], ['Native', 'native release']])
  })

  it('rejects invalid recent calendar dates as New', () => {
    expect(isRecentModelRelease('2026-09-31', Date.parse('2026-10-08'))).toBe(false)
  })

  it('never labels featured, beta, missing, old or future release metadata New', () => {
    const now = Date.parse('2026-10-08T12:00:00Z')
    expect(isRecentModelRelease('2026-10-01', now)).toBe(true)
    for (const date of [undefined, 'New', 'beta', '2026-08-01', '2026-10-09', '2026-02-30', 'invalid']) expect(isRecentModelRelease(date, now)).toBe(false)
    expect(modelCatalogMenu([{ label: 'Native', options: [{ value: 'v5', label: 'Model 5 Beta' }] }], 5, now)[0].featured[0].isNew).toBe(false)
  })
  it('keeps all Wan 3.0 and 2.7 tiers/modes while excluding 2.6 and 2.2, even through search', () => {
    const options = ['2.2', '2.6', '2.7', '3.0'].flatMap(version => ['Standard', 'Prime'].flatMap(tier => ['Text', 'Image', 'Reference'].map(mode => ({
      value: `wan/${version}/${tier}/${mode}`, label: `Wan ${version} ${tier} ${mode}`,
      catalog: { service: 'fal.ai', company: 'Alibaba', release: `Wan ${version}${tier === 'Standard' ? '' : ' Prime'}`, mode },
    }))))
    const input = structuredClone(options)
    const menu = modelCatalogMenu([{ label: 'fal.ai', options }])
    expect(menu[0].releases.map(release => release.label)).toEqual(['Wan 3.0', 'Wan 2.7'])
    expect(menu[0].featured.map(release => release.label)).toEqual(['Wan 3.0'])
    expect(menu[0].releases.map(release => release.options.length)).toEqual([6, 6])
    expect(visibleModelCatalogOptions(menu, new Set(), true).map(option => option.value)).not.toContain('wan/2.2/Standard/Text')
    expect(options).toEqual(input)
  })
  it('refreshing a new release retires the third without mutating saved models or references', () => {
    const saved = { model: 'wan/2.7', prompt: ' Original ', references: ['one', 'two'] }
    const before = structuredClone(saved)
    const options = ['2.7', '3.0'].map(version => ({ value: `wan/${version}`, label: `Wan ${version}`, catalog: { service: 'fal.ai', company: 'Alibaba', release: `Wan ${version}` } }))
    expect(modelCatalogMenu([{ label: 'fal.ai', options }])[0].releases).toHaveLength(2)
    const updated = [...options, { value: 'wan/3.1', label: 'Wan 3.1', catalog: { service: 'fal.ai', company: 'Alibaba', release: 'Wan 3.1' } }]
    expect(modelCatalogMenu([{ label: 'fal.ai', options: updated }])[0].releases.map(release => release.label)).toEqual(['Wan 3.1', 'Wan 3.0'])
    expect(saved).toEqual(before)
    expect(options).toHaveLength(2)
  })
  it('does not spend release slots on tiers or mix Kling O and V lineages or separate model families', () => {
    const labels = ['Kling V3 Standard', 'Kling V3 Pro', 'Kling V3 Turbo Pro', 'Kling V2.6 Pro', 'Kling V2.5 Pro', 'Kling O3 Pro', 'Kling O2 Pro', 'Veo 3.1 Fast', 'Veo 3.1 Lite', 'Veo 3', 'Veo 2']
    const options = labels.map(label => ({ value: label, label, catalog: { service: 'Native', company: 'Company', release: label, mode: 'Text' } }))
    const menu = modelCatalogMenu([{ label: 'Native', options }])
    expect(menu[0].releases.map(release => release.label)).toEqual(['Kling V3', 'Kling V2.6', 'Kling O3', 'Kling O2', 'Veo 3.1', 'Veo 3'])
    expect(menu[0].releases[0].options).toHaveLength(3)
    expect(menu[0].releases[4].options).toHaveLength(2)
  })
  it('keeps unversioned unrelated models and disabled published latest releases visible with no false New badge', () => {
    const labels = ['Soul', 'Recraft', 'Wan 3.0', 'Wan 2.7', 'Wan 2.2']
    const options = labels.map(label => ({ value: label, label, disabled: label === 'Wan 3.0', catalog: { service: 'Native', company: 'Company', release: label } }))
    expect(modelCatalogMenu([{ label: 'Native', options }])[0].releases.map(release => release.label)).toEqual(['Soul', 'Recraft', 'Wan 3.0', 'Wan 2.7'])
  })

  it('groups newly named provider variations automatically and never revives old versions from a new mode date', () => {
    const options = [
      { value: 'new-tier', label: 'Seedance 3.0 New Provider Tier', catalog: { service: 'fal.ai', company: 'ByteDance', release: 'Seedance 3.0 New Provider Tier', mode: 'Reference', releasedAt: '2026-09-01' } },
      { value: 'prior', label: 'Seedance 2.5', catalog: { service: 'fal.ai', company: 'ByteDance', release: 'Seedance 2.5', mode: 'Text', releasedAt: '2026-08-01' } },
      { value: 'new-old-tier', label: 'Seedance 2.0 New Tier', catalog: { service: 'fal.ai', company: 'ByteDance', release: 'Seedance 2.0 New Tier', mode: 'Text', releasedAt: '2026-10-08' } },
    ]
    const [provider] = modelCatalogMenu([{ label: 'fal.ai', options }], 5, Date.parse('2026-10-09'))
    expect(provider.releases.map(release => release.label)).toEqual(['Seedance 3.0', 'Seedance 2.5'])
    expect(provider.releases[0].options[0].value).toBe('new-tier')
  })

  it('groups dotted published versions and bracketed tiers without reviving an older tier', () => {
    const options = ['FLUX.1 [dev]', 'FLUX.2 [dev]', 'FLUX.2 [pro]', 'FLUX 2 Turbo', 'FLUX.3 [preview]'].map(label => ({
      value: `fixture/${label}`, label, catalog: { service: 'fal.ai', company: 'Black Forest Labs', release: label, mode: 'Text to Image', releasedAt: label.includes('.1 ') ? '2026-10-08' : '2026-09-01' },
    }))
    const snapshot = structuredClone(options)
    const [provider] = modelCatalogMenu([{ label: 'fal.ai', options }], 5, Date.parse('2026-10-09'))
    expect(provider.releases.map(release => release.label)).toEqual(['FLUX 3', 'FLUX 2'])
    expect(provider.featured.map(release => release.label)).toEqual(['FLUX 3'])
    expect(provider.releases[1].options).toEqual(options.slice(1, 4))
    expect(visibleModelCatalogOptions([provider], new Set(), true)).toEqual([options[4], ...options.slice(1, 4)])
    expect(options).toEqual(snapshot)
  })

  it('keeps dotted named subfamilies, compact letter series, companies and services independent', () => {
    const labels = ['FLUX.2 [dev]', 'FLUX.2 [pro]', 'FLUX.1 Kontext [pro]', 'FLUX.2 Klein 4B', 'GPT 4o', 'GPT 4', 'Kling O3', 'Kling V3', 'Soul']
    const options = labels.map(label => ({ value: label, label, catalog: { service: 'Native', company: 'Fixture', release: label } }))
    const sameService = { value: 'other-company', label: 'FLUX.2 [dev]', catalog: { service: 'Native', company: 'Other', release: 'FLUX.2 [dev]' } }
    const otherService = { value: options[0].value, label: options[0].label, catalog: { ...options[0].catalog, service: 'fal.ai' } }
    const menu = modelCatalogMenu([{ label: '', options: [...options, sameService, otherService] }])
    expect(menu.map(provider => provider.label)).toEqual(['Native', 'fal.ai'])
    expect(menu[0].releases.map(release => release.label)).toEqual(['FLUX 2', ...labels.slice(2), 'FLUX 2'])
    expect(menu[0].releases[0].options).toEqual(options.slice(0, 2))
    expect(menu[0].releases.at(-1)?.company).toBe('Other')
    expect(menu[1].releases[0].options).toEqual([otherService])
  })

})
