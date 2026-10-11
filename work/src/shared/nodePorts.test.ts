import { describe, expect, it } from 'vitest'
import { nodeInputPorts } from './nodePorts'

describe('node input port contracts', () => {
  it('keeps image generation inputs consistent', () => {
    expect(nodeInputPorts({ kind: 'image-generator' }).map((port) => [port.id, port.signal])).toEqual([
      ['text-in', 'text'], ['image-in', 'image'], ['reference-in', 'image'], ['style-in', 'style'],
    ])
  })

  it('uses the selected image endpoint reference capacity on the visible Image Reference port', () => {
    const limit = (imageProvider: 'fal' | 'openai' | 'google', imageModelId: string) => nodeInputPorts({ kind: 'image-generator', imageProvider, imageModelId }).find((port) => port.id === 'image-in')?.maxConnections
    expect(limit('fal', 'openai/gpt-image-2/edit')).toBe(16)
    expect(limit('openai', 'gpt-image-2')).toBe(16)
    expect(limit('fal', 'bytedance/seedream/v5/pro/edit')).toBe(10)
    expect(limit('fal', 'fal-ai/nano-banana-pro/edit')).toBe(14)
    expect(limit('fal', 'fal-ai/flux-pro/kontext')).toBe(1)
  })

  it('changes video inputs only when the selected model capability changes', () => {
    const semantic = ['text-in', 'storyboard-in', 'character-in', 'element-in', 'location-in', 'style-in']
    expect(nodeInputPorts({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/text-to-video' }).map((port) => port.id)).toEqual(semantic)
    expect(nodeInputPorts({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/image-to-video' }).map((port) => port.id)).toEqual([...semantic, 'image-in', 'end-image', 'reference-in'])
    expect(nodeInputPorts({ kind: 'video-generator', videoEngine: 'fal-ai/veo3.1/first-last-frame-to-video' }).map((port) => port.id)).toEqual([...semantic, 'image-in', 'end-image', 'reference-in'])
    expect(nodeInputPorts({ kind: 'video-generator', videoEngine: 'fal-ai/veo3.1/extend-video' }).map((port) => port.id)).toEqual([...semantic, 'video-in'])
    expect(nodeInputPorts({ kind: 'video-generator', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' }).map((port) => port.id)).toEqual([...semantic, 'image-in', 'end-image', 'reference-in', 'video-reference-in'])
    expect(nodeInputPorts({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' }).map((port) => [port.id, port.signal])).toEqual([
      ['text-in', 'text'], ['storyboard-in', 'storyboard'], ['character-in', 'image'], ['element-in', 'image'], ['location-in', 'image'], ['style-in', 'style'], ['image-in', 'image'], ['reference-in', 'image'], ['video-reference-in', 'video'], ['audio-reference-in', 'audio'],
    ])
  })

  it('distinguishes timeline anchors from ordinary image references', () => {
    const ports = nodeInputPorts({ kind: 'video-generator', videoEngine: 'fal-ai/veo3.1/first-last-frame-to-video' })
    expect(ports.find((port) => port.id === 'image-in')).toMatchObject({ icon: 'start-frame', label: 'Starting Image' })
    expect(ports.find((port) => port.id === 'end-image')).toMatchObject({ icon: 'end-frame', label: 'Ending Image' })
    expect(ports.find((port) => port.id === 'character-in')).toMatchObject({ icon: 'character-reference' })
    expect(ports.find((port) => port.id === 'element-in')).toMatchObject({ icon: 'element-reference' })
    expect(ports.find((port) => port.id === 'location-in')).toMatchObject({ icon: 'location-reference' })
  })

  it('declares cardinality on authoritative single-value and bounded-reference ports', () => {
    const ports = nodeInputPorts({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    expect(ports.find((port) => port.id === 'storyboard-in')?.maxConnections).toBe(1)
    expect(ports.find((port) => port.id === 'image-in')).toMatchObject({ maxConnections: 1, icon: 'start-frame' })
    expect(ports.find((port) => port.id === 'style-in')?.maxConnections).toBe(1)
    expect(ports.find((port) => port.id === 'video-reference-in')?.maxConnections).toBe(3)
    expect(ports.find((port) => port.id === 'audio-reference-in')?.maxConnections).toBe(3)
    expect(ports.find((port) => port.id === 'reference-in')?.maxConnections).toBeUndefined()
    expect(nodeInputPorts({ kind: 'router' })[0].maxConnections).toBe(1)
    expect(nodeInputPorts({ kind: 'gallery' })[0].maxConnections).toBeUndefined()
  })

  it('exposes Seedance 2.5 full video and audio reference cardinality', () => {
    const ports = nodeInputPorts({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video' })
    expect(ports.find((port) => port.id === 'video-reference-in')?.maxConnections).toBe(10)
    expect(ports.find((port) => port.id === 'audio-reference-in')?.maxConnections).toBe(10)
  })

  it('declares stable semantic roles while reserving collection roles for collections', () => {
    const ports = nodeInputPorts({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    expect(ports.find((port) => port.id === 'text-in')).toMatchObject({ icon: 'prompt' })
    expect(ports.find((port) => port.id === 'character-in')).toMatchObject({ icon: 'character-reference' })

    expect(ports.find((port) => port.id === 'element-in')).toMatchObject({ icon: 'element-reference' })
    expect(ports.find((port) => port.id === 'location-in')).toMatchObject({ icon: 'location-reference' })
    expect(ports.find((port) => port.id === 'reference-in')).toMatchObject({ icon: 'image-reference' })
    expect(ports.find((port) => port.id === 'video-reference-in')).toMatchObject({ icon: 'reference-video', maxConnections: 3 })
    expect(ports.find((port) => port.id === 'audio-reference-in')).toMatchObject({ icon: 'reference-audio', maxConnections: 3 })
    expect(nodeInputPorts({ kind: 'list' })[0]).toMatchObject({ icon: 'media-collection' })
    expect(nodeInputPorts({ kind: 'gallery' })[0]).toMatchObject({ icon: 'media-collection' })
    expect(nodeInputPorts({ kind: 'router' })[0]).toMatchObject({ icon: 'single-mixed', maxConnections: 1 })
  })

  it('exposes correct semantic and utility media contracts', () => {
    expect(nodeInputPorts({ kind: 'upscaler' }).map((port) => [port.id, port.signal])).toEqual([['image-in', 'image']])
    expect(nodeInputPorts({ kind: 'upscaler', upscalerModel: 'realesrgan-video' }).map((port) => [port.id, port.signal])).toEqual([['video-in', 'video']])
    expect(nodeInputPorts({ kind: 'character' })).toEqual([
      expect.objectContaining({ id: 'style-in', signal: 'style', label: 'Creation Style (Optional)' }),
      expect.objectContaining({ id: 'wardrobe-in', signal: 'image', maxConnections: 1 }),
      expect.objectContaining({ id: 'element-in', signal: 'image', icon: 'element-reference' }),
    ])
    expect(nodeInputPorts({ kind: 'location' })).toEqual([
      expect.objectContaining({ id: 'style-in', signal: 'style' }),
      expect.objectContaining({ id: 'character-in', signal: 'image', icon: 'character-reference' }),
      expect.objectContaining({ id: 'element-in', signal: 'image', icon: 'element-reference' }),
    ])
    for (const kind of ['wardrobe', 'element'] as const) expect(nodeInputPorts({ kind })).toEqual([expect.objectContaining({ id: 'style-in', signal: 'style', label: 'Creation Style (Optional)' })])
    expect(nodeInputPorts({ kind: 'style-reference' })).toEqual([])
    expect(nodeInputPorts({ kind: 'storyboard' })).toEqual([
      expect.objectContaining({ id: 'character-in', signal: 'image', icon: 'character-reference' }),

      expect.objectContaining({ id: 'element-in', signal: 'image', icon: 'element-reference' }),
      expect.objectContaining({ id: 'location-in', signal: 'image', icon: 'location-reference' }),
      expect.objectContaining({ id: 'reference-in', signal: 'image', icon: 'image-reference' }),
      expect.objectContaining({ id: 'video-reference-in', signal: 'video', icon: 'reference-video' }),
      expect.objectContaining({ id: 'audio-reference-in', signal: 'audio', icon: 'reference-audio' }),
    ])
    expect(nodeInputPorts({ kind: 'storyboard' }).slice(1).every((port) => port.maxConnections === undefined)).toBe(true)
    expect(nodeInputPorts({ kind: 'storyboard-asset' }).map((port) => port.id)).toEqual(['storyboard-in'])
    expect(nodeInputPorts({ kind: 'router' }).map((port) => port.id)).toEqual(['input'])
    expect(nodeInputPorts({ kind: 'list' })).toEqual([expect.objectContaining({ id: 'input', signal: 'mixed' })])
    expect(nodeInputPorts({ kind: 'gallery' })[0]).toMatchObject({ id: 'media-in', signal: 'mixed' })
    expect(nodeInputPorts({ kind: 'output' })).toEqual([])
    expect(nodeInputPorts({ kind: 'voiceover' })).toEqual([])
    expect(nodeInputPorts({ kind: 'sound-effects' })).toEqual([])
    expect(nodeInputPorts({ kind: 'music-generator' })).toEqual([])
  })
})
