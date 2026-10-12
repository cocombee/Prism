import { describe, expect, it } from 'vitest'
import {
  HIGGSFIELD_REFERENCE_VIDEO_MEDIA,
  HIGGSFIELD_REFERENCE_VIDEO_MODELS,
  HIGGSFIELD_REFERENCE_VIDEO_REVISION,
  higgsfieldReferenceVideoFields,
  higgsfieldReferenceVideoOmittedControls,
  higgsfieldReferenceVideoSchema,
  materializeHiggsfieldReferenceVideoInput,
  planHiggsfieldReferenceVideoInput,
} from './higgsfieldReferenceVideo'
import type { HiggsfieldNativeRequest } from './higgsfieldNative'
import type { FalSchemaNode } from './falSchemaBinding'

const id = (model: string) => model
const source = (mediaType: 'image' | 'video' | 'audio', n = 0) => ({ mediaType, path: `/fixture/${mediaType}-${n}` })
const request = (endpointId: string, values: Record<string, any> = {}, media: Record<string, any> = {}, fingerprint?: string): HiggsfieldNativeRequest => ({
  endpointId,
  contractRevision: HIGGSFIELD_REFERENCE_VIDEO_REVISION,
  values,
  media,
  ...(fingerprint ? { fingerprint } : {}),
})
const urls = (count: number) => Array.from({ length: count }, (_, index) => `https://cdn.prism.example/reference-${index}`)

describe('independent Higgsfield Reference input adapter', () => {
  it('retains the established eight Reference identities before reviewed additions', () => {
    expect(HIGGSFIELD_REFERENCE_VIDEO_MODELS.slice(0, 8).map(model => model.id)).toEqual([
      'kling-video/v3.0/std/image-to-video',
      'kling-video/v2.6/pro/image-to-video',
      'minimax/h3/reference-to-video',
      'minimax/hailuo-2.3/standard/image-to-video',
      'lightricks/ltx-2.5/image-to-video/pro',
      'pixverse/v6/image-to-video',
      'wan/v2.7/reference-to-video',
      'alibaba/wan-3.0/image-to-video',
    ])
    expect(HIGGSFIELD_REFERENCE_VIDEO_MODELS.slice(0, 8).map(model => [model.company, model.release])).toEqual([
      ['Kling', 'Kling 3.0'], ['Kling', 'Kling 2.6'], ['MiniMax', 'MiniMax H3'], ['MiniMax', 'Hailuo 2.3'],
      ['Lightricks', 'LTX 2.5'], ['PixVerse', 'PixVerse V6'], ['Alibaba', 'Wan 2.7'], ['Alibaba', 'Wan 3.0'],
    ])
    expect(() => higgsfieldReferenceVideoSchema('bytedance/seedance-2.5/reference-to-video')).toThrow(/no verified input adapter/)
    expect(higgsfieldReferenceVideoSchema('alibaba/wan-3.0/reference-to-video').properties?.video_urls).toMatchObject({type:'array'})
    expect(higgsfieldReferenceVideoSchema('lightricks/ltx-2.5/image-to-video/fast').properties?.image_url).toMatchObject({type:'string'})
    expect(() => higgsfieldReferenceVideoSchema('unpublished/future/reference-to-video')).toThrow(/no verified input adapter/)
    expect(higgsfieldReferenceVideoOmittedControls('kling-video/v3.0/std/image-to-video')).toEqual(['elements', 'multi_prompt'])
    expect(higgsfieldReferenceVideoOmittedControls('kling-video/v2.6/pro/image-to-video')).toEqual([])
  })

  it('omits Kling structured controls, preserves scalar controls, and never copies their defaults', () => {
    const route = 'kling-video/v3.0/std/image-to-video', schema = higgsfieldReferenceVideoSchema(route)
    schema.properties!.elements.default = ['legacy element']
    schema.properties!.multi_prompt.default = [{ prompt: 'Legacy shot', duration: 5 }]
    const fields = higgsfieldReferenceVideoFields(route, schema)
    expect(fields.map(field => field.key)).not.toContain('elements')
    expect(fields.map(field => field.key)).not.toContain('multi_prompt')
    expect(fields.map(field => field.key)).toContain('multi_shots')
    const plan = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Single prompt.', multi_shots: false }, { image_url: [source('image')] }, '9'.repeat(64)), schema)
    expect(plan.values).not.toHaveProperty('elements')
    expect(plan.values).not.toHaveProperty('multi_prompt')
    expect(plan.values.multi_shots).toBe(false)
  })

  it('rejects authored Kling structured values before reading the current schema', () => {
    const route = 'kling-video/v3.0/std/image-to-video'
    for (const key of ['elements', 'multi_prompt']) {
      const authored = request(route, { prompt: 'Preserve the saved prompt.', [key]: [{ legacy: 'keep' }] }, { image_url: [source('image')] }, '8'.repeat(64))
      expect(() => planHiggsfieldReferenceVideoInput(authored, null as unknown as FalSchemaNode)).toThrow(new RegExp(`structured control ${key}.*preserved`))
      expect(authored.values[key]).toEqual([{ legacy: 'keep' }])
    }
  })

  it('marks unknown structured fields unsupported and rejects required or changed omitted schema shapes', () => {
    const route = 'kling-video/v3.0/std/image-to-video', fingerprint = '7'.repeat(64)
    const added = higgsfieldReferenceVideoSchema(route)
    added.properties!.future_control = { type: 'array', items: { type: 'object', properties: { prompt: { type: 'string' } } } }
    expect(higgsfieldReferenceVideoFields(route, added).find(field => field.key === 'future_control')?.unsupportedReason).toMatch(/unsupported structured control/)
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Exact.' }, { image_url: [source('image')] }, fingerprint), added)).toThrow(/adds unsupported structured control future_control/)

    const required = higgsfieldReferenceVideoSchema(route)
    required.required = [...(required.required || []), 'multi_prompt']
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Exact.' }, { image_url: [source('image')] }, fingerprint), required)).toThrow(/requires unsupported structured control multi_prompt/)

    const changedShape = higgsfieldReferenceVideoSchema(route)
    changedShape.properties!.elements.items = { type: 'object', properties: { name: { type: 'string' } } }
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Exact.' }, { image_url: [source('image')] }, fingerprint), changedShape)).toThrow(/structured control elements changed shape/)
  })

  it('binds native frame endpoints and multimodal arrays to distinct media roles', () => {
    expect(HIGGSFIELD_REFERENCE_VIDEO_MEDIA.image_url).toMatchObject({ type: 'image', array: false, role: 'start-frame', label: 'Start frame' })
    expect(HIGGSFIELD_REFERENCE_VIDEO_MEDIA.last_image_url).toMatchObject({ type: 'image', array: false, role: 'end-frame', label: 'End frame' })
    expect(HIGGSFIELD_REFERENCE_VIDEO_MEDIA.end_image_url).toMatchObject({ type: 'image', array: false, role: 'end-frame', label: 'End frame' })
    expect(HIGGSFIELD_REFERENCE_VIDEO_MEDIA.image_urls).toMatchObject({ type: 'image', array: true, role: 'reference-image' })
    expect(HIGGSFIELD_REFERENCE_VIDEO_MEDIA.video_urls).toMatchObject({ type: 'video', array: true, role: 'reference-video' })
    expect(HIGGSFIELD_REFERENCE_VIDEO_MEDIA.audio_urls).toMatchObject({ type: 'audio', array: true, role: 'reference-audio' })
    expect(higgsfieldReferenceVideoFields('kling-video/v3.0/std/image-to-video').filter(field => field.media).map(field => [field.key, field.media?.role])).toEqual([
      ['image_url', 'start-frame'], ['last_image_url', 'end-frame'],
    ])
  })

  it('keeps scalar frame slot order and repeated frame assignments in the exact wire keys', () => {
    const route = id('alibaba/wan-3.0/image-to-video')
    const plan = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Keep the original action.', duration: 7 }, {
      image_url: [source('image', 1)], end_image_url: [source('image', 2)],
    }, 'a'.repeat(64)), higgsfieldReferenceVideoSchema(route))
    expect(plan.kind).toBe('reference-video')
    expect(plan.slots.map(slot => [slot.field, slot.index, slot.role])).toEqual([
      ['image_url', 0, 'start-frame'], ['end_image_url', 0, 'end-frame'],
    ])
    expect(materializeHiggsfieldReferenceVideoInput(plan, urls(2))).toMatchObject({
      prompt: 'Keep the original action.', duration: 7, image_url: urls(2)[0], end_image_url: urls(2)[1],
      resolution: '1080p', aspect_ratio: 'adaptive', generate_audio: true, enable_thinking: false,
    })
  })

  it('keeps the Kling 3 last frame separate from its required start frame', () => {
    const route = 'kling-video/v3.0/std/image-to-video'
    const plan = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Original motion.', multi_shots: false }, {
      image_url: [source('image', 1)], last_image_url: [source('image', 2)],
    }, 'b'.repeat(64)), higgsfieldReferenceVideoSchema(route))
    const input = materializeHiggsfieldReferenceVideoInput(plan, urls(2))
    expect(input.image_url).toBe(urls(2)[0]); expect(input.last_image_url).toBe(urls(2)[1])
    expect(input).not.toHaveProperty('end_image_url')
    expect(input.multi_shots).toBe(false)
  })

  it('retains H3 conditional image/video branches, audio slots, order, and published caps', () => {
    const route = 'minimax/h3/reference-to-video', revision = 'c'.repeat(64)
    const imagePlan = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Match image and sound references.' }, {
      image_urls: [source('image', 0), source('image', 1)], video_urls: [source('video')], audio_urls: [source('audio')],
    }, revision), higgsfieldReferenceVideoSchema(route))
    expect(imagePlan.slots.map(slot => slot.field)).toEqual(['image_urls', 'image_urls', 'video_urls', 'audio_urls'])
    const input = materializeHiggsfieldReferenceVideoInput(imagePlan, urls(4))
    expect(input.image_urls).toEqual(urls(4).slice(0, 2)); expect(input.video_urls).toEqual([urls(4)[2]]); expect(input.audio_urls).toEqual([urls(4)[3]])

    const videoPlan = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Use the motion reference.' }, { video_urls: [source('video')] }, revision), higgsfieldReferenceVideoSchema(route))
    expect(videoPlan.preview).toHaveProperty('video_urls')
    expect(videoPlan.preview).not.toHaveProperty('image_urls')
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Audio only.' }, { audio_urls: [source('audio')] }), higgsfieldReferenceVideoSchema(route))).toThrow(/video_urls/)
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Too many images.' }, { image_urls: Array.from({ length: 10 }, (_, n) => source('image', n)) }), higgsfieldReferenceVideoSchema(route))).toThrow(/item count/)
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Too many videos.' }, { video_urls: Array.from({ length: 4 }, (_, n) => source('video', n)) }), higgsfieldReferenceVideoSchema(route))).toThrow(/item count/)
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Too much audio.' }, { image_urls: [source('image')], audio_urls: Array.from({ length: 4 }, (_, n) => source('audio', n)) }), higgsfieldReferenceVideoSchema(route))).toThrow(/item count/)
  })

  it('retains Wan 2.7 conditional choices without inventing reference caps', () => {
    const route = 'wan/v2.7/reference-to-video', schema = higgsfieldReferenceVideoSchema(route)
    expect(higgsfieldReferenceVideoFields(route).find(field => field.key === 'image_urls')?.schema.maxItems).toBeUndefined()
    expect(higgsfieldReferenceVideoFields(route).find(field => field.key === 'video_urls')?.schema.maxItems).toBeUndefined()
    expect(planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Image reference.' }, { image_urls: [source('image')] }), schema).preview).toHaveProperty('image_urls')
    expect(planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Video reference.' }, { video_urls: [source('video')] }), schema).preview).toHaveProperty('video_urls')
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'No reference.' }), schema)).toThrow(/video_urls/)
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Empty image list.' }, { image_urls: [] }), schema)).toThrow(/video_urls/)
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'No audio alias.' }, { audio_urls: [source('audio')] }), schema)).toThrow(/does not accept media binding audio_urls/)
  })

  it('uses only current declared defaults and preserves authored falsey values and limits', () => {
    const route = 'kling-video/v2.6/pro/image-to-video', schema = higgsfieldReferenceVideoSchema(route)
    const authored = request(route, { prompt: 'Exact prompt.', sound: 'off', duration: 10, cfg_scale: 0 }, { image_url: [source('image')] }, 'd'.repeat(64))
    const plan = planHiggsfieldReferenceVideoInput(authored, schema)
    expect(materializeHiggsfieldReferenceVideoInput(plan, urls(1))).toMatchObject({ prompt: 'Exact prompt.', sound: 'off', duration: 10, cfg_scale: 0, image_url: urls(1)[0] })
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Invalid duration.', duration: 6 }, { image_url: [source('image')] }), schema)).toThrow()

    const current = higgsfieldReferenceVideoSchema('pixverse/v6/image-to-video')
    current.properties!.duration.default = 8
    current.properties!.duration.maximum = 10
    const defaults = planHiggsfieldReferenceVideoInput(request('pixverse/v6/image-to-video', { prompt: 'Use the current limit.' }, { image_url: [source('image')] }, 'e'.repeat(64)), current)
    expect(defaults.values.duration).toBe(8)
    expect(() => planHiggsfieldReferenceVideoInput(request('pixverse/v6/image-to-video', { prompt: 'Past current limit.', duration: 11 }, { image_url: [source('image')] }, 'e'.repeat(64)), current)).toThrow(/maximum/)
    current.properties!.duration.default = 9
    expect(defaults.values.duration).toBe(8)
  })

  it('captures immutable baseline values while the current schema is not yet owned', () => {
    const route = 'alibaba/wan-3.0/image-to-video'
    const authored = request(route, { prompt: 'Exact.', future_control: { keep: false } }, { image_url: [source('image')] }, 'f'.repeat(64))
    const before = JSON.stringify(authored), plan = planHiggsfieldReferenceVideoInput(authored)
    expect(plan.inputSchema).toBeUndefined()
    expect(plan.values.future_control).toEqual({ keep: false })
    expect(plan.values).not.toHaveProperty('duration')
    expect(() => materializeHiggsfieldReferenceVideoInput(plan, urls(1))).toThrow(/current main-owned/)
    expect(JSON.stringify(authored)).toBe(before)
  })

  it('rejects wrong role/type/cardinality, unsafe URLs, and media smuggled as controls', () => {
    const kling = 'kling-video/v2.6/pro/image-to-video'
    for (const bad of [
      { mediaType: 'video', path: '/fixture/video.mp4' },
      { mediaType: 'image', path: '/fixture/image.png', url: 'https://cdn.prism.example/image.png' },
      { mediaType: 'image', url: 'http://localhost/image.png' },
      { mediaType: 'image', path: '/fixture/image.png', arbitrary: 'metadata' },
    ]) expect(() => planHiggsfieldReferenceVideoInput(request(kling, {}, { image_url: [bad] }), higgsfieldReferenceVideoSchema(kling))).toThrow()
    expect(() => planHiggsfieldReferenceVideoInput(request(kling, {}, { image_url: [source('image'), source('image', 2)] }), higgsfieldReferenceVideoSchema(kling))).toThrow(/at most one/)
    expect(() => planHiggsfieldReferenceVideoInput(request(kling, { image_url: 'https://cdn.prism.example/input.png' }, { image_url: [source('image')] }), higgsfieldReferenceVideoSchema(kling))).toThrow(/does not accept saved control image_url/)
    const plan = planHiggsfieldReferenceVideoInput(request(kling, { prompt: 'Exact.' }, { image_url: [source('image')] }, 'a'.repeat(64)), higgsfieldReferenceVideoSchema(kling))
    expect(() => materializeHiggsfieldReferenceVideoInput(plan, ['https://127.0.0.1/input.png'])).toThrow(/private/)
    expect(() => materializeHiggsfieldReferenceVideoInput(plan, [])).toThrow(/slot count/)
  })

  it('rejects schema/media drift and unknown current inputs before accepting a current plan', () => {
    const route = 'minimax/h3/reference-to-video', fingerprint = 'b'.repeat(64)
    const unknownValue = request(route, { prompt: 'Exact.', invented: true }, { image_urls: [source('image')] }, fingerprint)
    expect(() => planHiggsfieldReferenceVideoInput(unknownValue, higgsfieldReferenceVideoSchema(route))).toThrow(/does not accept saved control invented/)

    const unknownUri = higgsfieldReferenceVideoSchema(route)
    unknownUri.properties!.source_url = { type: 'string', format: 'uri' }
    expect(() => planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Exact.' }, { image_urls: [source('image')] }, fingerprint), unknownUri)).toThrow(/unbound media/)

    const nestedUri = higgsfieldReferenceVideoSchema('kling-video/v3.0/std/image-to-video')
    nestedUri.properties!.future_control = { type: 'object', properties: { reference_url: { type: 'string', format: 'uri' } } }
    expect(() => planHiggsfieldReferenceVideoInput(request('kling-video/v3.0/std/image-to-video', { prompt: 'Exact.', future_control: { reference_url: 'https://cdn.prism.example/ref' } }, { image_url: [source('image')] }, fingerprint), nestedUri)).toThrow(/unbound media/)

    const shapeDrift = higgsfieldReferenceVideoSchema('pixverse/v6/image-to-video')
    shapeDrift.properties!.image_url = { type: 'array', items: { type: 'string' } }
    expect(() => planHiggsfieldReferenceVideoInput(request('pixverse/v6/image-to-video', { prompt: 'Exact.' }, { image_url: [source('image')] }, fingerprint), shapeDrift)).toThrow(/media shape changed/)
  })

  it('validates materialized array slots against the same conditional current schema', () => {
    const route = 'wan/v2.7/reference-to-video', schema = higgsfieldReferenceVideoSchema(route)
    const plan = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Image branch.' }, { image_urls: [source('image')] }, 'c'.repeat(64)), schema)
    const current = structuredClone(plan)
    expect(materializeHiggsfieldReferenceVideoInput(current, urls(1)).image_urls).toEqual(urls(1))
    const missing = { ...current, slots: [] }
    expect(() => materializeHiggsfieldReferenceVideoInput(missing, [])).toThrow(/video_urls/)
  })

  it('retains deeply frozen schemas, controls, slots and snapshots', () => {
    const route = 'lightricks/ltx-2.5/image-to-video/pro', schema = higgsfieldReferenceVideoSchema(route)
    const plan = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Original.' }, { image_url: [source('image')], end_image_url: [source('image', 1)] }, 'd'.repeat(64)), schema)
    expect(Object.isFrozen(plan)).toBe(true); expect(Object.isFrozen(plan.slots[0].source)).toBe(true)
    expect(Object.isFrozen(plan.schema.properties!.duration)).toBe(true)
    expect(() => { (plan.values as any).prompt = 'Changed.' }).toThrow()
    expect(() => { (plan.slots as any).push({}) }).toThrow()
    expect(materializeHiggsfieldReferenceVideoInput(plan, urls(2)).prompt).toBe('Original.')
  })

  it('includes provider defaults only after the main-owned schema arrives', () => {
    const route = 'minimax/h3/reference-to-video', baseline = higgsfieldReferenceVideoSchema(route)
    const preflight = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Exact.' }, { image_urls: [source('image')] }, 'e'.repeat(64)))
    expect(preflight.values).not.toHaveProperty('duration')
    const current = planHiggsfieldReferenceVideoInput(request(route, { prompt: 'Exact.' }, { image_urls: [source('image')] }, 'e'.repeat(64)), baseline)
    expect(current.values).toMatchObject({ duration: 5, resolution: '2K', aspect_ratio: 'auto', aigc_watermark: false })
    expect(current.values.prompt).toBe('Exact.')
  })
})
