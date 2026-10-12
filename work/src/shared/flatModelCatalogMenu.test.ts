import { describe, expect, it } from 'vitest'
import { modelCatalogMenu, visibleModelCatalogOptions } from './modelCatalogMenu'
import { admittedModelCatalogMenu, flatModelCatalogMenu, modelMenuMode, POPULAR_IMAGE_MODEL_POLICY, POPULAR_VIDEO_FEATURED_POLICY, primaryImageCatalogMenu, primaryModelCatalogMenu, primaryModelModeOptions } from './flatModelCatalogMenu'

const options = (service: string, versions = ['2.5', '2.0', '1.5']) => versions.flatMap(version => ['Text to Video', 'Image to Video'].map(mode => ({
  value: `${service}/${version}/${mode}`,
  label: `Seedance ${version} · ${mode}`,
  catalog: { service, company: 'ByteDance', release: `Seedance ${version}`, mode },
})))

describe('approved flat media catalog', () => {
  it('puts one latest representative per family in Featured and starts All with predecessor representatives', () => {
    const families = [['Seedance', 'ByteDance', ['2.5', '2.0']], ['Kling', 'Kling', ['3.0', '2.6']], ['Wan', 'Alibaba', ['3.0', '2.7']]] as const
    const input = families.flatMap(([name, company, versions]) => options('Higgsfield', [...versions]).map(option => ({
      ...option,
      value: option.value.replace('Higgsfield/', `${name}/`),
      label: option.label.replace('Seedance', name),
      catalog: { ...option.catalog, company, release: option.catalog.release.replace('Seedance', name) },
    })))
    const result = flatModelCatalogMenu(admittedModelCatalogMenu([{ label: 'Higgsfield', options: input }]), '')
    expect(result.featured.map(row => row.option.catalog.release)).toEqual(['Seedance 2.5', 'Kling 3.0', 'Wan 3.0'])
    expect(result.all.slice(0, 3).map(row => row.option.catalog.release)).toEqual(['Seedance 2.0', 'Kling 2.6', 'Wan 2.7'])
    expect(new Set(result.rows.map(row => row.option.value)).size).toBe(result.rows.length)
    expect(result.rows).toHaveLength(12)
  })

  it('fills both generation slots when every route in the newest release is disabled', () => {
    const input = options('fal', ['3.0', '2.7', '2.6']).map(option => ({ ...option, disabled: option.value.includes('3.0') }))
    const projection = flatModelCatalogMenu(admittedModelCatalogMenu([{ label: 'fal', options: input }]), '')
    expect(projection.rows).toHaveLength(4)
    expect(projection.rows.map(row => row.option.value)).toEqual(expect.arrayContaining(['fal/2.7/Text to Video', 'fal/2.6/Text to Video']))
    expect(projection.rows.every(row => !row.option.disabled)).toBe(true)
  })

  it('keeps exact connected-host, tier, and mode choices from the latest two generations', () => {
    const input = [
      ...options('BytePlus', ['2.5', '2.0']),
      ...options('Higgsfield', ['2.5', '2.0']),
    ]
    const before = structuredClone(input)
    const providers = modelCatalogMenu([{ label: '', options: input }])
    const selected = 'Higgsfield/2.5/Image to Video'
    const projection = flatModelCatalogMenu(providers, selected)
    expect(projection.featured).toHaveLength(1)
    expect(projection.featured[0].option.value).toBe(selected)
    expect(projection.rows).toHaveLength(8)
    expect(projection.all[0].option.value).toBe('BytePlus/2.0/Text to Video')
    expect(projection.all).toHaveLength(7)
    expect(projection.all.map(row => row.option.value)).toContain('BytePlus/2.5/Text to Video')
    expect(projection.all.map(row => row.option.value)).toContain('Higgsfield/2.5/Text to Video')
    expect(projection.all.map(row => row.option.value)).not.toContain(selected)
    expect(new Set(projection.rows.map(row => row.option.value)).size).toBe(projection.rows.length)
    expect(input).toEqual(before)
  })

  it('retains every release already admitted for each host while ranking family representatives globally', () => {
    const input = [
      ...options('BytePlus', ['3.0', '2.7']),
      ...options('Higgsfield', ['2.6', '2.2']),
    ]
    const projection = flatModelCatalogMenu(modelCatalogMenu([{ label: '', options: input }]), '')
    expect(projection.featured[0].option.catalog.release).toBe('Seedance 3.0')
    expect(projection.all[0].option.catalog.release).toBe('Seedance 2.7')
    expect(projection.rows.map(row => row.option.catalog.release)).toEqual(expect.arrayContaining(['Seedance 2.6', 'Seedance 2.2']))
    expect(projection.rows).toHaveLength(8)
  })

  it('restores four-plus releases across two hosts, placing second-newest representatives first', () => {
    const input = [
      ...options('BytePlus', ['4.0', '3.0', '2.0', '1.0']),
      ...options('Higgsfield', ['3.5', '2.5', '1.5', '0.5']),
    ]
    const before = structuredClone(input)
    const providers = admittedModelCatalogMenu([{ label: '', options: input }])
    const projection = flatModelCatalogMenu(providers, '')
    const oldest = 'Higgsfield/0.5/Image to Video'
    expect(providers.map(provider => provider.releases.length)).toEqual([4, 4])
    expect(projection.featured[0].option.value).toBe('BytePlus/4.0/Text to Video')
    expect(projection.all[0].option.value).toBe('Higgsfield/3.5/Text to Video')
    expect(projection.rows.filter(row => row.option.value === oldest)).toHaveLength(1)
    expect(visibleModelCatalogOptions(providers, new Set(), true).filter(option => option.value === oldest)).toHaveLength(1)
    expect(new Set(projection.rows.map(row => row.option.value)).size).toBe(16)
    const higgsfield = projection.rows.find(row => row.option.value === 'Higgsfield/3.5/Text to Video')!.option.catalog!
    expect(higgsfield.service).toBe('Higgsfield')
    expect(higgsfield.company).toBe('ByteDance')
    expect(input).toEqual(before)
  })

  it('groups the same normalized model family across services even when one provider label is generic', () => {
    const input = [
      { value: 'fal/kling-v3/text', label: 'Kling 3.0 · Text to Video', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 3.0', mode: 'Text to Video' } },
      { value: 'hf/kling-v2/text', label: 'Kling 2.6 · Text to Video', catalog: { service: 'Higgsfield', company: 'Higgsfield', release: 'Kling 2.6', mode: 'Text to Video' } },
    ]
    const projection = flatModelCatalogMenu(admittedModelCatalogMenu([{ label: '', options: input }]), '')
    expect(projection.featured).toHaveLength(1)
    expect(projection.featured[0].option.value).toBe('fal/kling-v3/text')
    expect(projection.all[0].option.value).toBe('hf/kling-v2/text')
    expect(projection.rows.map(row => row.option.value)).toEqual(['fal/kling-v3/text', 'hf/kling-v2/text'])
    expect(projection.rows[1].option.catalog).toMatchObject({ service: 'Higgsfield', company: 'Higgsfield' })
  })

  it('supports an opt-in popular video Featured order across normalized provider labels', () => {
    const route = (value: string, service: string, company: string, release: string, mode = 'Text to Video', releasedAt?: string) => ({
      value,
      label: `${release} · ${mode}`,
      catalog: { service, company, release, mode, ...(releasedAt ? { releasedAt } : {}) },
    })
    const input = [
      route('byteplus/seedance-2.5/text', 'BytePlus', 'ByteDance', 'BytePlus Seedance 2.5'),
      route('higgsfield/seedance-2.5/image', 'Higgsfield', 'ByteDance', 'Seedance 2.5', 'Image to Video'),
      route('fal/seedance-3.0/text', 'fal.ai', 'ByteDance', 'Seedance 3.0'),
      route('fal/kling-v3/text', 'fal.ai', 'Kling', 'Kling V3'),
      route('fal/kling-v4/text', 'fal.ai', 'Kling', 'Kling V4'),
      route('fal/gemini-omni-1.0/text', 'fal.ai', 'Google', 'Gemini OmniFlash 1.0'),
      route('fal/gemini-omni-1.1/text', 'fal.ai', 'Google', 'Gemini Omni Flash 1.1'),
      route('fal/wan-2.7/text', 'fal.ai', 'Alibaba', 'Wan 2.7'),
      route('fal/wan-3.1/text', 'fal.ai', 'Alibaba', 'Wan 3.1'),
      route('fal/ltx-2.3/text', 'fal.ai', 'Lightricks', 'LTX 2.3'),
      route('fal/ltx-2.5/text', 'fal.ai', 'Lightricks', 'LTX 2.5'),
      route('fal/hailuo-h3/text', 'fal.ai', 'MiniMax', 'Hailuo H3', 'Text to Video', '2026-10-10'),
      route('fal/vidu-4/text', 'fal.ai', 'Vidu', 'Vidu 4.0', 'Text to Video', '2026-10-09'),
      route('fal/kandinsky-6/image', 'fal.ai', 'Kandinsky', 'Kandinsky 6', 'Text to Image', '2026-10-08'),
      route('fal/grok-image/text', 'fal.ai', 'xAI', 'Grok Image 2', 'Text to Image', '2026-10-07'),
      route('fal/pixelcut/text', 'fal.ai', 'Pixelcut', 'Pixelcut 5', 'Text to Image', '2026-10-06'),
    ]
    const before = structuredClone(input)
    const providers = admittedModelCatalogMenu([{ label: '', options: input }])
    const policy = { featuredFamilyPriority: [
      { family: 'Seedance', version: '2.5' },
      { family: 'Kling', version: '4' },
      { family: 'Gemini OmniFlash', version: '1.1' },
      { family: 'Wan' },
      { family: 'LTX' },
      { family: 'Unavailable Model' },
    ] }
    const popular = flatModelCatalogMenu(providers, '', 5, policy)
    const defaultOrder = flatModelCatalogMenu(providers, '')
    expect(popular.featured.map(row => row.option.value)).toEqual([
      'byteplus/seedance-2.5/text',
      'fal/kling-v4/text',
      'fal/gemini-omni-1.1/text',
      'fal/wan-3.1/text',
      'fal/ltx-2.5/text',
    ])
    expect(popular.featured.some(row => /hailuo|vidu|kandinsky|grok|pixelcut/i.test(row.option.value))).toBe(false)
    expect(popular.all.map(row => row.option.value)).not.toContain('byteplus/seedance-2.5/text')
    expect(popular.rows.map(row => row.option.value)).toContain('higgsfield/seedance-2.5/image')
    expect(defaultOrder.featured[0].option.value).toBe('fal/hailuo-h3/text')
    expect(new Set(popular.rows.map(row => row.option.value))).toEqual(new Set(input.map(row => row.value)))
    expect(input).toEqual(before)
  })

  it('retains Fast, Mini, Turbo, named tiers, and first/last routes while excluding declared video Edit and Extend modes', () => {
    const names = ['Standard', 'Pro', '4K', 'Fast', 'Mini', 'Turbo']
    const latest = names.map(tier => ({
      value: `fal/kling-v3/${tier.toLowerCase()}`,
      label: `Kling 3.0 ${tier} · Text to Video`,
      catalog: { service: 'fal.ai', company: 'Kling', release: `Kling 3.0 ${tier}`, mode: 'Text to Video' },
    }))
    const input = [
      ...latest,
      { value: 'fal/kling-v3/start-end', label: 'Kling 3.0 · Start / End to Video', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 3.0', mode: 'Start / End to Video' } },
      { value: 'fal/kling-v3/edit', label: 'Kling 3.0 · Video Edit', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 3.0', mode: 'Video Edit' } },
      { value: 'fal/kling-v3/extend', label: 'Kling 3.0 · Extend Video', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 3.0', mode: 'Extend Video' } },
      { value: 'fal/kling-v2/text', label: 'Kling 2.6 · Text to Video', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 2.6', mode: 'Text to Video' } },
    ]
    const providers = modelCatalogMenu([{ label: '', options: input }])
    const projection = primaryModelCatalogMenu(providers, '')
    const values = projection.rows.map(row => row.option.value)
    for (const tier of names) expect(values).toContain(`fal/kling-v3/${tier.toLowerCase()}`)
    expect(values).toContain('fal/kling-v3/start-end')
    expect(values).not.toContain('fal/kling-v3/edit')
    expect(values).not.toContain('fal/kling-v3/extend')
    expect(projection.rows.find(row => row.option.value === 'fal/kling-v3/pro')?.label).toBe('Kling 3.0 Pro · Text to Video')
    expect(projection.all[0].option.value).toBe('fal/kling-v2/text')
    expect(projection.rows).toHaveLength(8)
  })

  it('keeps image model modes and serving providers as separate selectable routes', () => {
    const input = [
      { value: 'openai/gpt-image-2/text', label: 'GPT Image 2 · Text to Image', catalog: { service: 'OpenAI', company: 'OpenAI', release: 'GPT Image 2', mode: 'Text to Image' } },
      { value: 'openai/gpt-image-2/edit', label: 'GPT Image 2 · Image to Image', catalog: { service: 'OpenAI', company: 'OpenAI', release: 'GPT Image 2', mode: 'Image to Image' } },
      { value: 'fal/gpt-image-2/text', label: 'GPT Image 2 · Text to Image', catalog: { service: 'fal.ai', company: 'OpenAI', release: 'GPT Image 2', mode: 'Text to Image' } },
      { value: 'fal/gpt-image-2/edit', label: 'GPT Image 2 · Image to Image', catalog: { service: 'fal.ai', company: 'OpenAI', release: 'GPT Image 2', mode: 'Image to Image' } },
      { value: 'fal/gpt-image-1/text', label: 'GPT Image 1 · Text to Image', catalog: { service: 'fal.ai', company: 'OpenAI', release: 'GPT Image 1', mode: 'Text to Image' } },
    ]
    const providers = modelCatalogMenu([{ label: '', options: input }])
    const selected = 'fal/gpt-image-2/edit'
    const menu = primaryImageCatalogMenu(providers, selected)
    expect(menu.featured[0].option.value).toBe(selected)
    expect(menu.all[0].option.value).toBe('fal/gpt-image-1/text')
    expect(new Set(menu.rows.map(row => row.option.value))).toEqual(new Set(input.map(option => option.value)))
    expect(menu.rows.find(row => row.option.value === selected)?.routes['image to image']?.value).toBe(selected)
    expect(menu.rows.find(row => row.option.value === 'openai/gpt-image-2/text')?.label).toBe('GPT Image 2 · Text to Image')
  })

  it('pairs only routes on the selected service and exact named release', () => {
    const input = [
      { value: 'fal/kling-v3/std/text', label: 'Kling 3.0 Standard · Text to Video', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 3.0 Standard', mode: 'Text to Video' } },
      { value: 'fal/kling-v3/std/ref', label: 'Kling 3.0 Standard · Reference to Video', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 3.0 Standard', mode: 'Reference to Video' } },
      { value: 'fal/kling-v3/pro/ref', label: 'Kling 3.0 Pro · Reference to Video', catalog: { service: 'fal.ai', company: 'Kling', release: 'Kling 3.0 Pro', mode: 'Reference to Video' } },
      { value: 'Higgsfield/kling-v3/std/ref', label: 'Kling 3.0 Standard · Reference to Video', catalog: { service: 'Higgsfield', company: 'Kling', release: 'Kling 3.0 Standard', mode: 'Reference to Video' } },
    ]
    const providers = modelCatalogMenu([{ label: '', options: input }])
    expect(primaryModelModeOptions(providers, input[0].value)).toEqual({ text: input[0], reference: input[1] })
    expect(primaryModelModeOptions(providers, input[2].value)).toEqual({ reference: input[2] })
    expect(modelMenuMode(input[3])).toBe('reference')
    expect(modelMenuMode(input[3].value)).toBeUndefined()
  })

  it('preserves full image variant names and exact option objects without mutating saved values', () => {
    const input = ['FLUX.2 [dev]', 'FLUX.2 [pro]', 'FLUX.1 [pro]'].flatMap(model => ['Text to Image', 'Image to Image'].map(mode => ({
      value: `${model}/${mode}`,
      label: `${model} · ${mode}`,
      catalog: { service: 'fal.ai', company: 'Black Forest Labs', release: model, mode },
    })))
    const providers = modelCatalogMenu([{ label: '', options: input }])
    const selected = 'FLUX.2 [pro]/Image to Image'
    const saved = { model: selected, mode: 'Image to Image', prompt: ' draft ', references: ['one'] }
    const before = structuredClone(saved)
    const result = primaryImageCatalogMenu(providers, selected)
    expect(result.featured[0].option).toBe(input[3])
    expect(result.all[0].label).toBe('FLUX.1 [pro] · Text to Image')
    expect(result.rows.map(row => row.option.value)).toContain('FLUX.2 [dev]/Text to Image')
    expect(result.rows.map(row => row.option.value)).toContain('FLUX.2 [pro]/Image to Image')
    expect(saved).toEqual(before)
  })

  it('does not mutate catalog options or historical state while projecting exact routes', () => {
    const input = options('fal', ['3.0', '2.7']).map(option => ({ ...option, catalog: { ...option.catalog } }))
    const providers = modelCatalogMenu([{ label: '', options: input }])
    const beforeOptions = structuredClone(input)
    const saved = { model: input[1].value, mode: 'Image to Video', prompt: ' Exact draft ', references: ['one'] }
    const beforeSaved = structuredClone(saved)
    const result = flatModelCatalogMenu(providers, saved.model)
    expect(result.featured.find(row => row.option.value === saved.model)?.option).toBe(input[1])
    expect(input).toEqual(beforeOptions)
    expect(saved).toEqual(beforeSaved)
  })

  it('reduces popular video families to two generations per serving provider and groups All by that provider', () => {
    const route = (service: string, company: string, release: string, mode: string, suffix = '') => ({
      value: `${service}/${release}/${mode}${suffix}`,
      label: `${release} · ${mode}${suffix ? ` · ${suffix}` : ''}`,
      catalog: { service, company, release, mode },
    })
    const input = [
      ...['3.0', '2.5', '2.0'].flatMap(version => ['Text to Video', 'Reference to Video'].map(mode => route('fal.ai', 'ByteDance', `Seedance ${version}`, mode))),
      ...['2.5', '2.0', '1.5'].flatMap(version => ['Text to Video', 'Reference to Video'].map(mode => route('Higgsfield', 'ByteDance', `Seedance ${version}`, mode))),
      ...['4', '3', '2.6'].flatMap(version => ['Text to Video', 'Reference to Video'].map(mode => route('fal.ai', 'Kling', `Kling V${version}`, mode))),
      ...['1.1', '1.0', '0.9'].map(version => route('fal.ai', 'Google', `Gemini Omni Flash ${version}`, 'Text to Video')),
      ...['3.0', '2.7', '2.6'].map(version => route('fal.ai', 'Alibaba', `Wan ${version}`, 'Text to Video')),
      ...['2.5', '2.3', '2.0'].map(version => route('fal.ai', 'Lightricks', `LTX ${version}`, 'Text to Video')),
      ...['2.3', '2.2', '2.1'].map(version => route('fal.ai', 'MiniMax', `MiniMax H${version}`, 'Text to Video')),
      ...['2.3', '2.2', '2.1'].map(version => route('fal.ai', 'MiniMax', `Hailuo ${version}`, 'Text to Video')),
      ...['6', '5', '4'].map(version => route('fal.ai', 'PixVerse', `PixVerse V${version}`, 'Text to Video')),
      ...['3.1', '3.0', '2.0'].map(version => route('fal.ai', 'Google', `Veo ${version}`, 'Text to Video')),
      ...['2', '1.5', '1'].map(version => route('fal.ai', 'OpenAI', `Sora ${version}`, 'Text to Video')),
      ...['4.5', '4.0', '3.0'].map(version => route('fal.ai', 'Runway ML', `Gen-${version}`, 'Text to Video')),
      ...['2.0', '1.5', '1.0'].map(version => route('fal.ai', 'ByteDance', `HappyHorse ${version}`, 'Text to Video')),
      ...['2.0', '1.5', '1.0'].map(version => route('fal.ai', 'ByteDance', `OmniHuman ${version}`, 'Text to Video')),
      route('fal.ai', 'Vidu', 'Vidu 4.0', 'Text to Video'),
      route('fal.ai', 'Kling', 'Kling V4', 'Video Edit'),
      route('fal.ai', 'Kling', 'Kling V4', 'Extend Video'),
      route('fal.ai', 'Kling', 'Kling V4', 'Text to Video', 'Fast'),
    ]
    const before = structuredClone(input)
    const selected = 'Higgsfield/Seedance 2.5/Reference to Video'
    const providers = admittedModelCatalogMenu([{ label: 'fal.ai', options: input.filter(option => option.catalog.service === 'fal.ai') }, { label: 'Higgsfield', options: input.filter(option => option.catalog.service === 'Higgsfield') }])
    const result = flatModelCatalogMenu(providers, selected, 5, POPULAR_VIDEO_FEATURED_POLICY)

    expect(result.featured.map(row => row.option.catalog.release)).toEqual(['Seedance 2.5', 'Kling V4', 'Gemini Omni Flash 1.1', 'Wan 3.0', 'LTX 2.5'])
    expect(result.rows.some(row => row.option.value === selected)).toBe(true)
    expect(result.allGroups.map(group => group.label)).toEqual(['fal.ai', 'Higgsfield'])
    expect(result.all).toEqual(result.allGroups.flatMap(group => group.rows))
    expect(result.allGroups.every(group => group.rows.slice(0, 1).every(row => row.option.catalog.release !== (group.label === 'fal.ai' ? 'Seedance 3.0' : 'Seedance 2.5')))).toBe(true)
    expect(result.rows.some(row => row.option.value === 'fal.ai/Vidu 4.0/Text to Video')).toBe(false)
    expect(result.rows.some(row => row.option.catalog.mode === 'Video Edit' || row.option.catalog.mode === 'Extend Video')).toBe(false)
    expect(result.rows.some(row => row.option.label.endsWith(' · Fast'))).toBe(false)
    expect(result.rows.some(row => row.option.value === 'fal.ai/Kling V2.6/Text to Video')).toBe(false)
    const retainedSeedance = result.rows.filter(row => row.option.catalog.release.startsWith('Seedance'))
    expect(retainedSeedance.map(row => row.option.value)).toContain('fal.ai/Seedance 2.5/Text to Video')
    expect(retainedSeedance.map(row => row.option.value)).toContain('Higgsfield/Seedance 2.0/Text to Video')
    expect(new Set(result.rows.map(row => row.option.value)).size).toBe(result.rows.length)
    expect(input).toEqual(before)

    const outsideSavedSelection = { model: 'fal.ai/Vidu 4.0/Text to Video', prompt: 'keep exact draft' }
    const snapshot = structuredClone(outsideSavedSelection)
    const filtered = flatModelCatalogMenu(providers, outsideSavedSelection.model, 5, POPULAR_VIDEO_FEATURED_POLICY)
    expect(filtered.rows.some(row => row.option.value === outsideSavedSelection.model)).toBe(false)
    expect(outsideSavedSelection).toEqual(snapshot)
  })

  it('shares one two-generation budget across provider spellings and keeps one main endpoint per input mode', () => {
    const route = (release: string, mode: string) => ({ value: `${release}/${mode}`, label: `${release} · ${mode}`, catalog: { service: 'fal.ai', company: 'MiniMax', release, mode } })
    const input = [
      route('H3 Max Turbo', 'Text to Video'), route('MiniMax H3 Max', 'Text to Video'),
      route('H3 Max', 'Image to Video'), route('MiniMax H3', 'Reference to Video'),
      ...['Hailuo 2.3', 'MiniMax Hailuo 02 Standard', 'MiniMax Hailuo 01'].flatMap(release => ['Text to Video', 'Image to Video', 'Reference to Video'].map(mode => route(release, mode))),
    ]
    const before = structuredClone(input)
    const menu = flatModelCatalogMenu(admittedModelCatalogMenu([{ label: 'fal.ai', options: input }]), '', 5, POPULAR_VIDEO_FEATURED_POLICY)
    expect(menu.rows.filter(row => row.family === 'minimaxh')).toHaveLength(2)
    expect(menu.rows.filter(row => row.family === 'hailuo')).toHaveLength(4)
    expect(menu.rows.some(row => row.option.catalog.release === 'MiniMax Hailuo 01')).toBe(false)
    expect(menu.rows.some(row => row.option.value === 'MiniMax H3/Reference to Video')).toBe(true)
    expect(menu.rows.every(row => / · (?:Text|References(?: \(Image\))?)$/.test(row.label))).toBe(true)
    expect(input).toEqual(before)
  })

  it('keeps compact main choices, features References, admits Kling O and limits extra Fal families to latest', () => {
    const route = (release: string, mode: string) => ({ value: `${release}/${mode}`, label: `${release} · ${mode}`, catalog: { service: 'fal.ai', company: release.startsWith('Kling') ? 'Kling' : 'Google', release, mode } })
    const input = [
      route('Kling V3 Pro', 'Text to Video'), route('Kling V3 Standard', 'Text to Video'),
      route('Kling V3 Pro', 'Image to Video'), route('Kling V3 Standard', 'Image to Video'),
      route('Kling O3 Pro', 'Reference to Video'), route('Kling O3 Standard', 'Reference to Video'),
      route('Kling O1 Pro', 'Reference to Video'),
      ...['1.1', '1.0'].flatMap(v => ['Text to Video', 'Reference to Video'].map(m => route(`Gemini Omni Flash ${v}`, m))),
      ...['3.1', '3.0'].flatMap(v => ['Text to Video', 'Reference to Video'].map(m => route(`Veo ${v}`, m))),
    ]
    const before = structuredClone(input)
    const menu = flatModelCatalogMenu(admittedModelCatalogMenu([{label: 'fal.ai',options: input}]), input[0].value, 5, POPULAR_VIDEO_FEATURED_POLICY)
    expect(menu.featured.find(r => r.family === 'kling')?.option.catalog.mode).toBe('Image to Video')
    expect(menu.rows.filter(r => r.family === 'kling')).toHaveLength(2)
    expect(menu.rows.filter(r => r.family === 'klingo')).toHaveLength(2)
    expect(menu.rows.some(r => r.option.value === 'Kling O3 Pro/Reference to Video')).toBe(true)
    expect(menu.rows.filter(r => r.option.catalog.release.startsWith('Gemini Omni'))).toHaveLength(2)
    expect(menu.rows.filter(r => r.option.catalog.release.startsWith('Veo'))).toHaveLength(2)
    expect(menu.rows.some(r => /Omni Flash 1.0|Veo 3.0/.test(r.option.catalog.release))).toBe(false)
    expect(input).toEqual(before)
  })

  it('applies the reduced image family policy only to admitted declared routes', () => {
    const route = (company: string, release: string, mode = 'Text to Image') => ({
      value: `fal.ai/${release}/${mode}`,
      label: `${release} · ${mode}`,
      catalog: { service: 'fal.ai', company, release, mode },
    })
    const input = [
      ...['3', '2', '1'].flatMap(version => ['Text to Image', 'Image to Image'].map(mode => route('OpenAI', `GPT Image ${version}`, mode))),
      ...['3', '2', '1'].map(version => route('Google', `Nano Banana ${version} Pro`)),
      ...['5.0', '4.5', '4.0'].map(version => route('ByteDance', `Seedream ${version} Pro`)),
      ...['3.0', '2.0', '1.0'].map(version => route('Black Forest Labs', `FLUX.${version} [pro]`)),
      ...['3.0', '2.0', '1.0'].map(version => route('Ideogram', `Ideogram ${version}`)),
      ...['4.0', '3.0', '2.0'].map(version => route('Luma AI', `Ray ${version}`)),
      ...['4.0', '3.0', '2.0'].map(version => route('Google', `Imagen ${version}`)),
      ...['3', '2', '1'].map(version => route('Recraft', `Recraft V${version}`)),
      route('Unsupported', 'Unknown Model 9'),
    ]
    const before = structuredClone(input)
    const providers = admittedModelCatalogMenu([{ label: 'fal.ai', options: input }])
    const result = flatModelCatalogMenu(providers, '', 5, POPULAR_IMAGE_MODEL_POLICY)
    expect(result.featured.map(row => row.option.catalog.release)).toEqual(['GPT Image 3', 'Nano Banana 3 Pro', 'Seedream 5.0 Pro', 'FLUX.3.0 [pro]', 'Ideogram 3.0'])
    expect(result.allGroups.map(group => group.label)).toEqual(['fal.ai'])
    expect(result.all).toEqual(result.allGroups.flatMap(group => group.rows))
    expect(result.rows.some(row => row.option.catalog.company === 'Unsupported')).toBe(false)
    expect(result.rows.map(row => row.family)).not.toContain('unknownmodel')
    for (const family of ['gptimage', 'nanobanana', 'seedream', 'flux', 'ideogram', 'ray', 'imagen', 'recraft']) {
      const familyRows = result.rows.filter(row => row.family === family)
      expect(familyRows.length, family).toBeGreaterThan(0)
      expect(new Set(familyRows.map(row => row.option.catalog.release)).size).toBeLessThanOrEqual(2)
    }
    expect(new Set(result.rows.map(row => row.option.value)).size).toBe(result.rows.length)
    expect(input).toEqual(before)
  })

  it('retains bounded published image aliases from declared releases without admitting Google video models', () => {
    let routeIndex = 0
    const route = (service: string, company: string, release: string, withCatalog = true) => ({
      value: `route-${++routeIndex}`,
      label: release,
      ...(withCatalog ? { catalog: { service, company, release, mode: 'Text to Image' } } : {}),
    })
    const input = [
      ...['2.1', '2.0', '1.0'].map(version => route('fal.ai', 'Google', `Nano Banana ${version}`)),
      route('Google', 'Google', 'Gemini 3.1 Flash Image', false),
      route('Google', 'Google', 'Gemini 3 Pro Image', false),
      route('Google', 'Google', 'Gemini 3.1 Flash Lite Image', false),
      route('Google', 'Google', 'Veo 3.1'),
      route('OpenAI', 'OpenAI', 'GPT Image 2.5 Sunburst'),
      route('OpenAI', 'OpenAI', 'GPT Image 2'),
      route('fal.ai', 'Black Forest Labs', 'FLUX.2 Klein 9B'),
      route('fal.ai', 'Black Forest Labs', 'FLUX.2 Klein 4B'),
      route('fal.ai', 'Black Forest Labs', 'FLUX.1 Kontext [pro]'),
    ]
    const before = structuredClone(input)
    const providers = admittedModelCatalogMenu([
      { label: 'fal.ai', options: input.filter(option => option.catalog?.service === 'fal.ai') },
      { label: 'Google', options: input.filter(option => option.label.startsWith('Gemini') || option.catalog?.service === 'Google') },
      { label: 'OpenAI', options: input.filter(option => option.catalog?.service === 'OpenAI') },
    ])
    const result = flatModelCatalogMenu(providers, '', 5, POPULAR_IMAGE_MODEL_POLICY)
    const releaseName = (row: typeof result.rows[number]) => row.option.catalog?.release || row.option.label
    const retained = new Set(result.rows.map(releaseName))
    expect(retained).toEqual(new Set([
      'Nano Banana 2.1', 'Nano Banana 2.0', 'Gemini 3.1 Flash Image', 'Gemini 3 Pro Image',
      'Gemini 3.1 Flash Lite Image', 'GPT Image 2.5 Sunburst', 'GPT Image 2', 'FLUX.2 Klein 9B',
      'FLUX.2 Klein 4B', 'FLUX.1 Kontext [pro]',
    ]))
    expect(result.rows.some(row => releaseName(row) === 'Veo 3.1')).toBe(false)
    const nanoBanana = result.rows.filter(row => releaseName(row).startsWith('Nano Banana'))
    expect(nanoBanana.map(releaseName)).toEqual(['Nano Banana 2.1', 'Nano Banana 2.0'])
    expect(result.rows.filter(row => releaseName(row).startsWith('Gemini')).length).toBe(3)
    expect(result.rows.filter(row => releaseName(row).startsWith('GPT Image')).length).toBe(2)
    expect(result.rows.filter(row => releaseName(row).startsWith('FLUX.2 Klein')).length).toBe(2)
    expect(input).toEqual(before)
  })

  it('always returns All groups while the default flat ordering and membership stay unchanged', () => {
    const input = [...options('BytePlus', ['4.0', '3.0', '2.0']), ...options('Higgsfield', ['3.5', '2.5', '1.5'])]
    const result = flatModelCatalogMenu(admittedModelCatalogMenu([{ label: '', options: input }]), '')
    expect(result.allGroups).toEqual([{ label: '', rows: result.all }])
    expect(result.rows).toHaveLength(12)
    expect(result.all.map(row => row.option.value)).toEqual(expect.arrayContaining(['Higgsfield/1.5/Text to Video', 'BytePlus/2.0/Text to Video']))
  })
})

it('pairs reviewed native Text and Reference endpoints only within their existing service and release', async () => {
  const { higgsfieldBundledCatalogModels } = await import('./higgsfieldNative')
  const { HIGGSFIELD_TEXT_VIDEO_MODELS } = await import('./higgsfieldTextVideo')
  const { HIGGSFIELD_REFERENCE_VIDEO_MODELS } = await import('./higgsfieldReferenceVideo')
  const groups = [{ label: 'Higgsfield', options: higgsfieldBundledCatalogModels().map(row => ({ value: row.id, label: row.label, catalog: row.catalog })) }]
  const providers = admittedModelCatalogMenu(groups)
  for (const model of HIGGSFIELD_TEXT_VIDEO_MODELS) {
    const routes = primaryModelModeOptions(providers, model.id)
    expect(routes.text?.value).toBe(model.id)
    const reference = HIGGSFIELD_REFERENCE_VIDEO_MODELS.find(row => row.company === model.company && row.release === model.release)!
    expect(reference).toBeDefined()
    expect(routes.reference?.value).toBe(reference.id)
  }
})
