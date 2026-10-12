import {describe,expect,it} from 'vitest'
import {videoModelGroups} from './NodeCardNext'
import {admittedModelCatalogMenu,flatModelCatalogMenu,POPULAR_VIDEO_FEATURED_POLICY,modelMenuMode} from '../../shared/flatModelCatalogMenu'
const menu=(selected='')=>flatModelCatalogMenu(admittedModelCatalogMenu(videoModelGroups()),selected,5,POPULAR_VIDEO_FEATURED_POLICY)
describe('current Higgsfield family completion in the real Video selector owner',()=>{
 it('exposes admitted Cinema Studio, Grok and Happy Horse without admitting unrelated fal tools',()=>{
  const actual=menu(),rows=actual.rows
  for(const name of ['Cinema Studio 4.0','Grok Imagine Video 1.5','Happy Horse 1.1','Happy Horse 1.0'])expect(rows.some(row=>row.label.startsWith(name))).toBe(true)
  expect(rows.some(row=>/genjutsu|video-edit|video-extend|motion-control/.test(row.option.value))).toBe(false)
  expect(rows.some(row=>/kling-video\/v4/.test(row.option.value))).toBe(false)
  for(const row of actual.featured)expect(modelMenuMode(row.option)).toBe('reference')
 })
 it('prefers the full Wan multimodal Reference route over its frame-only fallback',()=>{
  const rows=menu().rows
  expect(rows.some(row=>row.option.value==='higgsfield-native::alibaba/wan-3.0-prime/reference-to-video')).toBe(true)
  expect(rows.some(row=>row.option.value==='higgsfield-native::alibaba/wan-3.0-prime/image-to-video')).toBe(false)
  const frameOnly=rows.find(row=>row.option.value==='higgsfield-native::kling-video/v3.0/std/image-to-video')
  expect(frameOnly?.label).toContain('References (Image)')
  const selected=menu('higgsfield-native::alibaba/wan-3.0-prime/image-to-video')
  expect(selected.rows.some(row=>row.option.value==='higgsfield-native::alibaba/wan-3.0-prime/image-to-video')).toBe(true)
 })
 it('does not expand named tiers and preserves an exact selected 4K endpoint',()=>{
  const initial=menu(),key='higgsfield-native::kling-video/v3.0/4k/image-to-video',selected=menu(key)
  expect(selected.rows.some(row=>row.option.value===key)).toBe(true)
  const keys=new Set(initial.rows.map(row=>row.option.value));expect(keys.size).toBe(initial.rows.length)
  const groups=new Map<string,Set<string>>()
  for(const row of initial.rows){const info=row.option.catalog!;const id=JSON.stringify([info.service,row.family,info.release]);const modes=groups.get(id)||new Set<string>();modes.add(modelMenuMode(row.option)!);groups.set(id,modes)}
  for(const modes of groups.values())expect(modes.size).toBeLessThanOrEqual(2)
  const kling=selected.rows.filter(row=>row.option.catalog?.service==='Higgsfield'&&row.family==='kling')
  expect(kling.some(row=>row.option.value.includes('v2.5-turbo'))).toBe(false)
 })
})
