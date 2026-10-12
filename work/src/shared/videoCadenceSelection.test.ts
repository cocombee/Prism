import { describe, it, expect } from 'vitest'
import { nativeFpsLabel, verifiedNativeVideoFrameRate, userPromptWithCadence, nativeVideoOutputFrameRate } from './videoCadenceSelection'
import { nativeVideoMotionCadenceOptions, normalizedNativeVideoMotionCadence } from './nativeVideoFooterControls'
import { VIDEO_MODELS } from './videoModels'

describe('native output and explicit User cadence boundary',()=>{
 it.each(['text-to-video','image-to-video','reference-to-video'])('retains Wan3/Prime Native30 and caps %s cadence',route=>{
  for(const base of ['alibaba/wan-3.0','alibaba/wan-3.0-prime']) {
   const endpoint=`${base}/${route}`
   expect(verifiedNativeVideoFrameRate(endpoint)).toBe(30)
   expect(nativeVideoMotionCadenceOptions(endpoint)).toEqual([12,16,24])
   expect(nativeFpsLabel(30)).toBe('30 fps (Native)')
  }
 })
 it('uses schema-native50 over fixed metadata and never invents unknown rates',()=>{
  expect(nativeVideoMotionCadenceOptions('alibaba/wan-3.0/text-to-video',50)).toEqual([12,16,24,35,50])
  expect(verifiedNativeVideoFrameRate('fictional/wan-3.0')).toBeUndefined()
  expect(nativeFpsLabel(undefined)).toBe('Provider FPS (Native)')
 })
 it('preserves old/manual/native/empty authored bytes and appends explicit cadence once',()=>{
  const text='  Shot.\r\n'
  expect(userPromptWithCadence(text,undefined,16)).toBe(text)
  expect(userPromptWithCadence(text,'native',16)).toBe(text)
  expect(userPromptWithCadence('', 'custom',16)).toBe('')
  expect(userPromptWithCadence(text,'custom',16)).toContain(`${text}\n\nMOTION CADENCE:`)
 })
})


it.each(['fal-ai/wan/v2.7/text-to-video', 'fal-ai/wan/v2.7/image-to-video', 'fal-ai/wan/v2.7/reference-to-video', 'wan/v2.7/text-to-video', 'wan/v2.7/image-to-video', 'wan/v2.7/reference-to-video'])('retains verified Wan 2.7 Native30 and rejects higher cadence for %s', endpoint => {
  expect(verifiedNativeVideoFrameRate(endpoint)).toBe(30)
  expect(nativeVideoMotionCadenceOptions(endpoint)).toEqual([12, 16, 24])
  expect(nativeVideoMotionCadenceOptions(endpoint, 24)).toEqual([12, 16, 24])
  expect(nativeVideoMotionCadenceOptions(endpoint, 50)).toEqual([12, 16, 24, 35, 50])
})
it('does not infer native rates from an arbitrary Wan name or future route', () => {
  for (const endpoint of ['fictional/wan/v2.7/reference-to-video', 'fal-ai/wan/v2.8/reference-to-video', 'fal-ai/wan/v2.7/fictional']) expect(verifiedNativeVideoFrameRate(endpoint)).toBeUndefined()
})

it('shares current declared native FPS precedence without inventing unknown rates', () => {
  expect(nativeVideoOutputFrameRate('alibaba/wan-3.0/text-to-video', '48')).toBe(48)
  expect(nativeVideoOutputFrameRate('alibaba/wan-3.0/text-to-video')).toBe(30)
  expect(nativeVideoOutputFrameRate('fictional/native')).toBeUndefined()
  for (const invalid of [0, -1, NaN, Infinity, '', null, true]) expect(nativeVideoOutputFrameRate('fictional/native', invalid)).toBeUndefined()
})

it('offers no custom cadence or fabricated default when native output FPS is unknown', () => {
  for (const endpoint of ['fictional/native', 'fal-ai/kling-video/v3/pro/text-to-video']) {
    expect(nativeVideoMotionCadenceOptions(endpoint)).toEqual([])
    expect(normalizedNativeVideoMotionCadence(endpoint, undefined, 60)).toBeUndefined()
  }
  expect(nativeVideoMotionCadenceOptions('fictional/native', 16)).toEqual([12, 16])
})

it('uses the official24fps output of each registered Veo3.1 route without guessing future variants', () => {
  for (const model of VIDEO_MODELS.filter(model => model.family === 'veo')) {
    expect(verifiedNativeVideoFrameRate(model.id)).toBe(24)
    expect(nativeVideoMotionCadenceOptions(model.id)).toEqual([12, 16, 24])
  }
  expect(verifiedNativeVideoFrameRate('fal-ai/veo3.1/future')).toBeUndefined()
})
