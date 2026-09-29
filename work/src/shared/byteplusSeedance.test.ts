import { describe, expect, it } from 'vitest'
import {
  BYTEPLUS_BASE_URL,
  BYTEPLUS_SEEDANCE_MODELS,
  compileBytePlusSeedancePayload,
  parseBytePlusCreateResponse,
  parseBytePlusTaskResponse,
  validateBytePlusSeedanceRoute,
} from './byteplusSeedance'
import { resolveVideoModel } from './videoModels'

const model = (id: string) => resolveVideoModel(id)

describe('BytePlus Seedance foundation', () => {
  it('uses the official international ModelArk endpoint and exact model catalog', () => {
    expect(BYTEPLUS_BASE_URL).toBe('https://ark.ap-southeast.bytepluses.com/api/v3')
    expect(BYTEPLUS_SEEDANCE_MODELS.map((item) => item.id)).toEqual([
      'dreamina-seedance-2-5-260628',
      'dreamina-seedance-2-0-260128',
      'dreamina-seedance-2-0-fast-260128',
      'dreamina-seedance-2-0-mini-260615',
    ])
  })

  it('rejects a fal route and any unapproved official model id', () => {
    expect(() => validateBytePlusSeedanceRoute(model('bytedance/seedance-2.5/text-to-video'))).toThrow(/BytePlus route/)
    expect(() => validateBytePlusSeedanceRoute({ ...model('byteplus/seedance-2.5/text-to-video'), apiModelId: 'invented' })).toThrow(/supported BytePlus/)
  })

  it('compiles exact Text controls with no secret-bearing field', () => {
    const payload = compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/text-to-video'), prompt: 'Exact structured prompt', ratio: '16:9', resolution: '720p', duration: 30, generateAudio: true, seed: 7 })
    expect(payload).toEqual({ model: 'dreamina-seedance-2-5-260628', content: [{ type: 'text', text: 'Exact structured prompt' }], ratio: '16:9', resolution: '720p', duration: 30, generate_audio: true, watermark: false, seed: 7 })
    expect(JSON.stringify(payload)).not.toMatch(/api.?key|authorization|bearer|credential/i)
  })

  it('accepts direct Standard 4K while rejecting it for 2.5, Fast, and Mini', () => {
    expect(compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/text-to-video'), prompt: 'x', resolution: '1080p', duration: 4 }).resolution).toBe('1080p')
    expect(compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.0/text-to-video'), prompt: 'x', resolution: '1080p', duration: 4 }).resolution).toBe('1080p')
    for (const route of ['byteplus/seedance-2.0-fast/text-to-video', 'byteplus/seedance-2.0-mini/text-to-video']) {
      expect(() => compileBytePlusSeedancePayload({ route: model(route), prompt: 'x', resolution: '1080p', duration: 4 })).toThrow(/resolution/)
    }
    expect(compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.0/text-to-video'), prompt: 'x', resolution: '4k', duration: 4 }).resolution).toBe('4k')
    for (const route of ['byteplus/seedance-2.5/text-to-video', 'byteplus/seedance-2.0-fast/text-to-video', 'byteplus/seedance-2.0-mini/text-to-video']) {
      expect(() => compileBytePlusSeedancePayload({ route: model(route), prompt: 'x', resolution: '4k', duration: 4 })).toThrow(/resolution/)
    }
  })

  it('compiles Image first/last frames in authored order', () => {
    expect(compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/image-to-video'), prompt: 'Move naturally', duration: 4, media: [
      { kind: 'image', url: 'https://assets/start.png', role: 'first_frame' },
      { kind: 'image', url: 'https://assets/end.png', role: 'last_frame' },
    ] }).content).toEqual([
      { type: 'text', text: 'Move naturally' },
      { type: 'image_url', image_url: { url: 'https://assets/start.png' }, role: 'first_frame' },
      { type: 'image_url', image_url: { url: 'https://assets/end.png' }, role: 'last_frame' },
    ])
  })

  it('compiles ordered image/video/audio References with exact roles', () => {
    expect(compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/reference-to-video'), prompt: 'Use [Image1], [Video1], [Audio1]', duration: 8, media: [
      { kind: 'image', url: 'https://assets/look.png', role: 'reference_image' },
      { kind: 'video', url: 'https://assets/motion.mp4', role: 'reference_video' },
      { kind: 'audio', url: 'https://assets/timing.wav', role: 'reference_audio' },
    ] }).content).toEqual([
      { type: 'text', text: 'Use [Image1], [Video1], [Audio1]' },
      { type: 'image_url', image_url: { url: 'https://assets/look.png' }, role: 'reference_image' },
      { type: 'video_url', video_url: { url: 'https://assets/motion.mp4' }, role: 'reference_video' },
      { type: 'audio_url', audio_url: { url: 'https://assets/timing.wav' }, role: 'reference_audio' },
    ])
  })

  it('enforces mode exclusions, reference limits, and supported settings', () => {
    expect(() => compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/text-to-video'), prompt: 'x', duration: 4, media: [{ kind: 'image', url: 'https://x', role: 'reference_image' }] })).toThrow(/Text route/)
    expect(() => compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/image-to-video'), prompt: 'x', duration: 4, media: [{ kind: 'image', url: 'https://x', role: 'reference_image' }] })).toThrow(/first_frame/)
    expect(() => compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.0-mini/reference-to-video'), prompt: 'x', duration: 4, media: Array.from({ length: 10 }, (_, i) => ({ kind: 'image' as const, url: `https://x/${i}`, role: 'reference_image' as const })) })).toThrow(/9 images/)
    expect(() => compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/text-to-video'), prompt: 'x', duration: 31 })).toThrow(/duration/)
    expect(() => compileBytePlusSeedancePayload({ route: model('byteplus/seedance-2.5/text-to-video'), prompt: 'x', duration: 4, resolution: '4k' })).toThrow(/resolution/)
  })

  it('parses create and normalized retrieve states, output and usage', () => {
    expect(parseBytePlusCreateResponse({ id: 'task-1' })).toEqual({ taskId: 'task-1' })
    expect(parseBytePlusTaskResponse({ id: 'task-1', status: 'queued' })).toMatchObject({ taskId: 'task-1', status: 'queued', terminal: false })
    expect(parseBytePlusTaskResponse({ id: 'task-1', status: 'running' })).toMatchObject({ status: 'running', terminal: false })
    expect(parseBytePlusTaskResponse({ id: 'task-1', status: 'succeeded', content: { video_url: 'https://out/video.mp4', last_frame_url: 'https://out/last.png' }, usage: { output_tokens: 42 } })).toEqual({ taskId: 'task-1', status: 'succeeded', terminal: true, outputUrl: 'https://out/video.mp4', lastFrameUrl: 'https://out/last.png', usage: { output_tokens: 42 } })
  })

  it('normalizes failures, expiry, cancellation and malformed success without leaking response extras', () => {
    expect(parseBytePlusTaskResponse({ id: 'a', status: 'failed', error: { code: 'Moderation', message: 'Rejected', api_key: 'must-not-leak' } })).toMatchObject({ status: 'failed', terminal: true, error: { code: 'Moderation', message: 'Rejected' } })
    expect(parseBytePlusTaskResponse({ id: 'b', status: 'expired' })).toMatchObject({ status: 'expired', terminal: true })
    expect(parseBytePlusTaskResponse({ id: 'c', status: 'cancelled' })).toMatchObject({ status: 'cancelled', terminal: true })
    expect(parseBytePlusTaskResponse({ id: 'd', status: 'succeeded', content: {} })).toMatchObject({ status: 'failed', error: { code: 'missing_output' } })
    expect(() => parseBytePlusCreateResponse({ error: { message: 'no id' } })).toThrow(/task id/)
  })
})
