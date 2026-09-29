import { describe, expect, it, vi } from 'vitest'
import { compileBytePlusGenerationRequest } from './byteplusGeneration'
import type { GenerationRequest } from '../shared/types'

const request = (overrides: Partial<GenerationRequest> = {}): GenerationRequest => ({
  nodeId: 'video-1',
  kind: 'video-generator',
  videoEngine: 'byteplus/seedance-2.5/text-to-video',
  prompt: 'Exact provider prompt',
  providerPromptOverride: 'Exact provider prompt',
  duration: 4,
  resolution: '720p',
  aspectRatio: '16:9',
  ...overrides,
})

describe('compileBytePlusGenerationRequest', () => {
  it('compiles an actual Text GenerationRequest without resolving media', async () => {
    const resolveMedia = vi.fn()
    const payload = await compileBytePlusGenerationRequest(request(), resolveMedia)
    expect(payload).toEqual({
      model: 'dreamina-seedance-2-5-260628',
      content: [{ type: 'text', text: 'Exact provider prompt' }],
      ratio: '16:9', resolution: '720p', duration: 4, generate_audio: false, watermark: false,
    })
    expect(resolveMedia).not.toHaveBeenCalled()
  })

  it('compiles first and last images from the actual request', async () => {
    const resolveMedia = vi.fn(async (source: { path?: string; url?: string }) => source.url || `data:image/png;base64,${source.path}`)
    const payload = await compileBytePlusGenerationRequest(request({
      videoEngine: 'byteplus/seedance-2.5/image-to-video',
      inputPath: '/project/start.png',
      references: [{ role: 'reference', slot: 'end', path: '/project/end.png', mediaType: 'image' }],
    }), resolveMedia)
    expect(payload.content).toEqual([
      { type: 'text', text: 'Exact provider prompt' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,/project/start.png' }, role: 'first_frame' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,/project/end.png' }, role: 'last_frame' },
    ])
  })

  it('preserves selected image/video/audio reference order and translated provider prompt', async () => {
    const payload = await compileBytePlusGenerationRequest(request({
      videoEngine: 'byteplus/seedance-2.5/reference-to-video',
      providerPromptOverride: 'Use @Look, @Motion, and @Beat exactly.',
      references: [
        { role: 'reference', tag: '@Look', url: 'https://assets/look.png', mediaType: 'image' },
        { role: 'reference', tag: '@Motion', url: 'https://assets/motion.mp4', mediaType: 'video' },
        { role: 'reference', tag: '@Beat', url: 'https://assets/beat.wav', mediaType: 'audio' },
      ],
    }), async (source) => source.url!)
    expect(payload.content.map((item) => item.type)).toEqual(['text', 'image_url', 'video_url', 'audio_url'])
    expect(payload.content[0]).toEqual({ type: 'text', text: 'Use [Image1], [Video1], and [Audio1] exactly.' })
  })

  it('rejects a non-BytePlus route before resolving any media', async () => {
    const resolveMedia = vi.fn()
    await expect(compileBytePlusGenerationRequest(request({ videoEngine: 'bytedance/seedance-2.5/text-to-video' }), resolveMedia)).rejects.toThrow(/BytePlus/)
    expect(resolveMedia).not.toHaveBeenCalled()
  })
})
