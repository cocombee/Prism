import { describe, it, expect } from 'vitest'
import captured from './falVideoMenu.fixtures.json'
import { falCatalogModel } from './falModelCatalog'
import { falFlowMenuOptions } from './falModelFlow'
import { admittedModelCatalogMenu, flatModelCatalogMenu, POPULAR_VIDEO_FEATURED_POLICY } from './flatModelCatalogMenu'

describe('captured current fal main video choices', () => {
  const models = captured.models.map(falCatalogModel).filter(model => model !== null)
  const project = (selected = '') => flatModelCatalogMenu(admittedModelCatalogMenu([{ label: 'fal.ai', options: falFlowMenuOptions('video', { provider: 'fal', verified: true, models }) }]), selected, 5, POPULAR_VIDEO_FEATURED_POLICY)

  it('keeps only Text and References for Omni, current Veo and the two latest LTX generations', () => {
    const before = structuredClone(models)
    const menu = project()
    const ids = menu.rows.map(row => row.option.value)
    expect(ids).toEqual(expect.arrayContaining([
      'google/gemini-omni-flash/v1.1/text-to-video',
      'google/gemini-omni-flash/v1.1/reference-to-video',
      'fal-ai/ltx-2.3-quality/text-to-video',
      'fal-ai/ltx-2.3-quality/image-to-video',
      'lightricks/ltx-2.5/text-to-video/pro',
      'lightricks/ltx-2.5/image-to-video/pro',
      'fal-ai/veo3.1',
      'fal-ai/veo3.1/reference-to-video',
    ]))
    expect(menu.featured.some(row => row.option.value.includes('gemini-omni-flash/v1.1'))).toBe(true)
    expect(ids.some(id => /\/lora|\/clean-plate|\/inpaint|\/outpaint|\/render-to-real|\/edit$|first-last-frame/.test(id))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
    expect(menu.rows.every(row => / · (?:Text|References)$/.test(row.label))).toBe(true)
    expect(menu.rows.filter(row => row.option.value.includes('veo3.1')).map(row => row.label)).toEqual(['Veo 3.1 · Text', 'Veo 3.1 · References'])
    expect(menu.rows.find(row => row.option.value === 'lightricks/ltx-2.5/text-to-video/pro')?.label).toBe('LTX 2.5 Pro · Text')
    expect(menu.rows.find(row => row.option.value === 'fal-ai/ltx-2.3-quality/image-to-video')?.option.catalog?.mode).toBe('Image to Video')
    expect(models).toEqual(before)
  })

  it('retains a selected supported main route without adding a third mode or mutating its schema identity', () => {
    const selected = 'google/gemini-omni-flash/v1.1/image-to-video'
    const menu = project(selected)
    const omni = menu.rows.filter(row => row.option.value.includes('gemini-omni-flash/v1.1'))
    expect(omni).toHaveLength(2)
    expect(omni.find(row => row.option.value === selected)).toMatchObject({ label: 'Gemini Omni Flash 1.1 · References', option: { catalog: { mode: 'Image to Video' } } })
    expect(omni.some(row => row.option.value.endsWith('/reference-to-video'))).toBe(false)
    expect(project('fal-ai/veo3.1/first-last-frame-to-video').rows.some(row => row.option.value.endsWith('/first-last-frame-to-video'))).toBe(false)
  })
})
