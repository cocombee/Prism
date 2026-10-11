import { describe, expect, it } from 'vitest'
import type { NodeKind, StudioNodeData } from './types'
import { compatibleNodeSources, compatibleNodeTargets, compatibleSourceHandle, compatibleTargetHandle, connectionCompatibilityError, inputCardinalityError, nodeConnectionError, outputCardinalityError, outputSignalFor, pruneSurplusInputEdges, recommendedVideoEngineForSource, reconcileDynamicInputEdges } from './nodeConnections'
import { nodeInputPorts } from './nodePorts'

describe('typed node connections', () => {
  it('prefers the Image input for ordinary image references and Reference input for video image references', () => {
    const ordinaryImage = { kind: 'upload' as const, outputType: 'image' as const }
    expect(compatibleTargetHandle(ordinaryImage, 'image-generator')).toBe('image-in')
    expect(compatibleTargetHandle(ordinaryImage, { kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/image-to-video' })).toBe('reference-in')
  })
  it('routes concrete Image media into generator reference inputs by default', () => {
    for (const source of [
      { kind: 'upload' as const, outputType: 'image' as const },
      { kind: 'image-generator' as const, outputType: 'image' as const },
    ]) {
      expect(compatibleTargetHandle(source, 'image-generator')).toBe('image-in')
      expect(compatibleTargetHandle(source, 'video-generator')).toBe('reference-in')
      expect(connectionCompatibilityError(source, { kind: 'video-generator', videoEngine: recommendedVideoEngineForSource(source) }, 'media-out', 'reference-in')).toBeNull()
    }
  })

  it('routes ordinary Images into the Storyboard generic reference input without changing semantic roles', () => {
    const ordinaryImage = { kind: 'upload' as const, outputType: 'image' as const }
    const storyboard = { kind: 'storyboard' as const }
    expect(nodeInputPorts(storyboard).map((port) => port.id)).toContain('reference-in')
    expect(compatibleTargetHandle(ordinaryImage, storyboard)).toBe('reference-in')
    expect(connectionCompatibilityError(ordinaryImage, storyboard, 'media-out', 'reference-in')).toBeNull()
    expect(compatibleTargetHandle({ kind: 'character' as const }, storyboard)).toBe('character-in')
    expect(compatibleTargetHandle({ kind: 'element' as const }, storyboard)).toBe('element-in')
    expect(compatibleTargetHandle({ kind: 'location' as const }, storyboard)).toBe('location-in')
  })

  it('uses the exact selected generator contract for direct image intake', () => {
    const image = { kind: 'upload' as const, outputType: 'image' as const }
    expect(compatibleTargetHandle(image, { kind: 'image-generator', imageProvider: 'fal', imageModelId: 'fal-ai/nano-banana-pro/edit' })).toBe('image-in')
    expect(compatibleTargetHandle(image, { kind: 'video-generator', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' })).toBe('reference-in')
    expect(compatibleTargetHandle(image, { kind: 'video-generator', videoEngine: 'fal-ai/veo3.1/first-last-frame-to-video' })).toBe('reference-in')
  })

  it('rejects every self-node connection before signal compatibility is considered', () => {
    const generator = { kind: 'image-generator' as const, outputType: 'image' as const }
    expect(connectionCompatibilityError(generator, generator, 'media-out', 'image-in')).toBeNull()
    expect(nodeConnectionError('node-a', 'node-a', generator, generator, 'media-out', 'image-in')).toContain('cannot connect its output back into its own input')
    expect(nodeConnectionError('node-a', 'node-b', generator, generator, 'media-out', 'image-in')).toBeNull()
  })

  it('routes storyboards only to meaningful consumers and keeps List distinct from Gallery', () => {
    const source = { kind: 'storyboard' as const, outputType: undefined }
    expect(compatibleNodeTargets(source)).toEqual(['video-generator'])
    expect(compatibleNodeTargets(source)).not.toContain('list')
    expect(compatibleTargetHandle(source, 'video-generator')).toBe('storyboard-in')
  })

  it('allows only one Storyboard plan on one dedicated input and one direct Generator target per Storyboard', () => {
    const existing = [{ source: 'story-a', target: 'video-a', targetHandle: 'storyboard-in' }]
    const source = { kind: 'storyboard' as const, title: 'Storyboard A' }
    const target = { kind: 'video-generator' as const, title: 'Video Generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' }
    expect(inputCardinalityError([], 'video-a', target, 'storyboard-in', true)).toBeNull()
    expect(inputCardinalityError(existing, 'video-a', target, 'storyboard-in', true)).toContain('accepts one Storyboard plan')
    expect(outputCardinalityError([], 'story-a', source, target, 'storyboard-in', true)).toBeNull()
    expect(outputCardinalityError(existing, 'story-a', source, target, 'storyboard-in', true)).toContain('accepts one direct Video Generator target')
    expect(inputCardinalityError(existing, 'video-a', target, 'reference-in', true)).toBeNull()
    expect(outputCardinalityError(existing, 'story-a', source, target, 'reference-in', true)).toBeNull()
    expect(inputCardinalityError([...existing, { source: 'story-b', target: 'video-a', targetHandle: 'storyboard-in' }], 'video-a', target, 'storyboard-in')).toContain('Disconnect the existing one')
  })

  it('enforces every declared port limit and migrates surplus edges in stable order', () => {
    const targets = [
      { id: 'video', data: { kind: 'video-generator' as const, title: 'Video', videoEngine: 'bytedance/seedance-2.0/reference-to-video' } },
      { id: 'router', data: { kind: 'router' as const, title: 'Router' } },
    ]
    for (const target of targets) {
      for (const port of nodeInputPorts(target.data)) {
        if (!port.maxConnections) {
          const many = Array.from({ length: 8 }, (_, index) => ({ source: `source-${index}`, target: target.id, targetHandle: port.id }))
          expect(inputCardinalityError(many, target.id, target.data, port.id, true), `${target.data.kind}:${port.id}`).toBeNull()
          continue
        }
        const atLimit = Array.from({ length: port.maxConnections }, (_, index) => ({ source: `source-${index}`, target: target.id, targetHandle: port.id }))
        expect(inputCardinalityError(atLimit.slice(0, -1), target.id, target.data, port.id, true), `${target.data.kind}:${port.id} below limit`).toBeNull()
        expect(inputCardinalityError(atLimit, target.id, target.data, port.id, true), `${target.data.kind}:${port.id} over limit`).not.toBeNull()
      }
    }
    const surplus = [
      { id: 'first', source: 'story-a', target: 'video', targetHandle: 'storyboard-in' },
      { id: 'second', source: 'story-b', target: 'video', targetHandle: 'storyboard-in' },
    ]
    const migrated = pruneSurplusInputEdges(surplus, targets)
    expect(migrated.edges.map((edge) => edge.id)).toEqual(['first'])
    expect(migrated.removed.map(({ edge }) => edge.id)).toEqual(['second'])
    expect(migrated.removed[0].message).toContain('accepts one Storyboard plan')

    const oneToOneTargets = [
      { id: 'story', data: { kind: 'storyboard' as const, title: 'Storyboard' } },
      { id: 'video-a', data: { kind: 'video-generator' as const, title: 'Video A', videoEngine: 'bytedance/seedance-2.5/reference-to-video' } },
      { id: 'video-b', data: { kind: 'video-generator' as const, title: 'Video B', videoEngine: 'bytedance/seedance-2.5/reference-to-video' } },
    ]
    const restored = pruneSurplusInputEdges([
      { id: 'keep', source: 'story', target: 'video-a', targetHandle: 'storyboard-in' },
      { id: 'reject', source: 'story', target: 'video-b', targetHandle: 'storyboard-in' },
    ], oneToOneTargets)
    expect(restored.edges.map((edge) => edge.id)).toEqual(['keep'])
    expect(restored.removed[0].message).toContain('one direct Video Generator target')
  })

  it('reconciles dynamic model ports by semantic role without crossing Start or End roles', () => {
    const edges = [
      { id: 'ordinary', source: 'image', target: 'video', sourceHandle: 'media-out', targetHandle: 'image-reference-in' },
      { id: 'character', source: 'character', target: 'video', sourceHandle: 'media-out', targetHandle: 'reference-in' },
      { id: 'start', source: 'start', target: 'video', sourceHandle: 'media-out', targetHandle: 'image-in' },
      { id: 'end', source: 'end', target: 'video', sourceHandle: 'media-out', targetHandle: 'end-image' },
    ]
    const sources: Record<string, StudioNodeData> = {
      image: { kind: 'upload', title: 'Reference', outputType: 'image' },
      character: { kind: 'character', title: 'Hero' },
      start: { kind: 'upload', title: 'Start', outputType: 'image' },
      end: { kind: 'upload', title: 'End', outputType: 'image' },
    }

    const result = reconcileDynamicInputEdges(edges, 'video', { kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' }, sources)

    expect(result.edges.find((edge) => edge.id === 'ordinary')?.targetHandle).toBe('reference-in')
    expect(result.edges.find((edge) => edge.id === 'character')?.targetHandle).toBe('reference-in')
    expect(result.edges.find((edge) => edge.id === 'start')?.targetHandle).toBe('image-in')
    expect(result.removed.map(({ edge }) => edge.id)).toEqual(['end'])
    expect(result.removed.every(({ message }) => /disconnected/i.test(message))).toBe(true)
  })

  it('moves a semantic reference only to its matching declared role and explicitly disconnects when none exists', () => {
    const characterEdge = [{ id: 'character', source: 'character', target: 'video', sourceHandle: 'media-out', targetHandle: 'legacy-reference-in' }]
    const sources = { character: { kind: 'character', title: 'Hero' } satisfies StudioNodeData }

    const remapped = reconcileDynamicInputEdges(characterEdge, 'video', { kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/text-to-video' }, sources)
    expect(remapped.edges[0].targetHandle).toBe('character-in')

    const disconnected = reconcileDynamicInputEdges(characterEdge, 'upscaler', { kind: 'upscaler', upscalerModel: 'clarity-image' }, sources)
    expect(disconnected.edges).toEqual(characterEdge)
    const trulyTargeted = reconcileDynamicInputEdges([{ ...characterEdge[0], target: 'upscaler' }], 'upscaler', { kind: 'upscaler', upscalerModel: 'clarity-image' }, sources)
    expect(trulyTargeted.edges).toEqual([])
    expect(trulyTargeted.removed[0].message).toContain('Hero')
  })

  it('routes generated media by its actual media type', () => {
    expect(outputSignalFor({ kind: 'video-generator', outputType: 'video' })).toBe('video')
    expect(outputSignalFor({ kind: 'upload', outputType: 'audio' })).toBe('audio')
    expect(outputSignalFor({ kind: 'output', outputType: 'video' })).toBe('video')
    expect(outputSignalFor({ kind: 'upload', outputType: undefined })).toBe('mixed')
    expect(compatibleNodeTargets({ kind: 'video-generator', outputType: 'video' })).toEqual(['video-generator', 'list', 'gallery', 'storyboard', 'router'])
    expect(outputSignalFor({ kind: 'upscaler', upscalerModel: 'realesrgan-video' })).toBe('video')
    expect(compatibleTargetHandle({ kind: 'music-generator', outputType: 'audio' }, 'list')).toBe('input')
  })

  it('accepts typed image and video pass-throughs through Router without widening consumer sockets', () => {
    const router = { kind: 'router' as const }
    const imageRouter = { kind: 'router' as const, routeSignal: 'image' as const }
    const videoRouter = { kind: 'router' as const, routeSignal: 'video' as const }
    const imageVideo = { kind: 'video-generator' as const, videoEngine: 'bytedance/seedance-2.0/image-to-video' }
    const extendVideo = { kind: 'video-generator' as const, videoEngine: 'fal-ai/veo3.1/extend-video' }

    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, router, 'media-out', 'input')).toBeNull()
    expect(connectionCompatibilityError(imageRouter, imageVideo, 'output', 'image-in')).toBeNull()
    expect(connectionCompatibilityError(imageRouter, { kind: 'upscaler' }, 'output', 'image-in')).toBeNull()
    expect(connectionCompatibilityError(imageRouter, { kind: 'image-editor' }, 'output', 'image-in')).toBeNull()

    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'video' }, router, 'media-out', 'input')).toBeNull()
    expect(connectionCompatibilityError(videoRouter, extendVideo, 'output', 'video-in')).toBeNull()
    expect(connectionCompatibilityError(videoRouter, { kind: 'upscaler', upscalerModel: 'realesrgan-video' }, 'output', 'video-in')).toBeNull()

    expect(connectionCompatibilityError(imageRouter, extendVideo, 'output', 'video-in')).not.toBeNull()
    expect(connectionCompatibilityError(videoRouter, { kind: 'image-editor' }, 'output', 'image-in')).not.toBeNull()
    expect(connectionCompatibilityError(imageRouter, imageVideo, 'output', 'reference-in')).toBeNull()
    expect(connectionCompatibilityError(videoRouter, { kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' }, 'output', 'video-reference-in')).toBeNull()
  })

  it('offers exact source-node choices from input sockets and permits only Location as a semantic frame', () => {
    const video = { kind: 'video-generator' as const, videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' }
    const startSources = compatibleNodeSources(video, 'image-in')
    expect(startSources).toEqual(expect.arrayContaining(['upload', 'image-generator', 'upscaler', 'location']))
    expect(startSources).not.toContain('image-editor')
    expect(startSources).not.toContain('character')
    expect(startSources).not.toContain('element')
    expect(compatibleNodeSources(video, 'end-image')).toContain('location')
    expect(compatibleNodeSources(video, 'reference-in')).toEqual(expect.arrayContaining(['character', 'location', 'element']))
    expect(compatibleNodeSources(video, 'storyboard-in')).toEqual(['storyboard'])
    expect(compatibleNodeSources(video, 'storyboard-in')).not.toContain('list')
  })

  it('keeps Style on rendering owners and excludes Storyboard', () => {
    const style = { kind: 'style-reference' as const, outputType: 'image' as const }
    expect(compatibleNodeTargets(style)).not.toContain('storyboard')
    expect(compatibleTargetHandle(style, 'storyboard')).toBe('')
    expect(compatibleNodeTargets(style)).not.toContain('storyboard-asset')
    expect(compatibleTargetHandle(style, 'image-generator')).toBe('style-in')
    expect(compatibleTargetHandle(style, 'video-generator')).toBe('style-in')
    expect(compatibleNodeTargets(style)).toEqual(expect.arrayContaining(['character', 'element', 'location']))
    for (const kind of ['character', 'element', 'location'] as const) {
      expect(compatibleTargetHandle(style, kind)).toBe('style-in')
      expect(connectionCompatibilityError(style, { kind }, 'media-out', 'style-in')).toBeNull()
    }
    expect(compatibleNodeTargets(style)).not.toContain('list')
    expect(compatibleNodeTargets(style)).not.toContain('gallery')
    expect(connectionCompatibilityError(style, { kind: 'video-generator', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' }, 'media-out', 'image-in')).toContain('Style asset')
    expect(connectionCompatibilityError(style, { kind: 'video-generator', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' }, 'media-out', 'end-image')).toContain('Style asset')
    expect(connectionCompatibilityError(style, { kind: 'video-generator', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' }, 'media-out', 'style-in')).toBeNull()
  })

  it('routes each reusable semantic role only into its matching Storyboard input', () => {
    const storyboard = { kind: 'storyboard' as const }
    for (const kind of ['character', 'element', 'location'] as const) {
      const source = { kind, outputType: 'image' as const }
      expect(compatibleNodeTargets(source)).toContain('storyboard')
      expect(compatibleTargetHandle(source, 'storyboard')).toBe(`${kind}-in`)
      expect(compatibleNodeSources(storyboard, `${kind}-in`)).toContain(kind)
      expect(connectionCompatibilityError(source, storyboard, 'media-out', `${kind}-in`)).toBeNull()
      for (const wrongKind of ['character', 'element', 'location'].filter((candidate) => candidate !== kind) as Array<'character' | 'element' | 'location'>) {
        expect(connectionCompatibilityError({ kind: wrongKind, outputType: 'image' }, storyboard, 'media-out', `${kind}-in`)).toContain('accepts only a matching')
      }
      expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, storyboard, 'media-out', `${kind}-in`)).toContain('accepts only a matching')
    }
  })

  it('never routes ordinary image or video media into semantic-only asset roles', () => {
    const ordinaryImage = { kind: 'upload' as const, outputType: 'image' as const }
    const ordinaryVideo = { kind: 'upload' as const, outputType: 'video' as const }
    for (const kind of ['character', 'element', 'location'] as const) {
      expect(compatibleNodeTargets(ordinaryImage)).not.toContain(kind)
      expect(compatibleNodeTargets(ordinaryVideo)).not.toContain(kind)
      expect(connectionCompatibilityError(ordinaryImage, { kind }, 'media-out', 'style-in')).not.toBeNull()
      expect(connectionCompatibilityError(ordinaryVideo, { kind }, 'media-out', 'style-in')).not.toBeNull()
    }
    expect(connectionCompatibilityError(ordinaryImage, { kind: 'storyboard' }, 'media-out', 'character-in')).toContain('matching reusable character')
    expect(connectionCompatibilityError(ordinaryImage, { kind: 'storyboard' }, 'media-out', 'element-in')).toContain('matching reusable element')
    expect(connectionCompatibilityError(ordinaryVideo, { kind: 'storyboard' }, 'media-out', 'location-in')).toContain('matching reusable location')
  })

  it('keeps semantic prompting and image intake internal while permitting only declared semantic inputs', () => {
    expect(compatibleNodeTargets({ kind: 'prompt' })).not.toContain('upscaler')
    expect(compatibleNodeTargets({ kind: 'prompt' })).not.toContain('character')
    expect(compatibleNodeTargets({ kind: 'upload', outputType: 'image' })).not.toContain('character')
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, { kind: 'character' }, 'media-out', 'image-in')).toContain('accepts optional Style, Wardrobe, and Prop inputs')
    expect(connectionCompatibilityError({ kind: 'prompt' }, { kind: 'element' }, 'text-out', 'text-in')).toContain('accepts only an optional Style input')
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, { kind: 'location' }, 'media-out', 'image-in')).toContain('accepts optional Style, Character, and Prop inputs')
  })

  it('keeps Style output-only because prompt building and optional reference intake happen inside the node', () => {
    expect(compatibleNodeTargets({ kind: 'prompt' })).not.toContain('style-reference')
    expect(compatibleNodeTargets({ kind: 'upload', outputType: 'image' })).not.toContain('style-reference')
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, { kind: 'style-reference' }, 'media-out', 'image-in')).toContain('output-only visual-language asset')
  })

  it('keeps Voiceover script entry self-contained with no upstream text socket', () => {
    expect(nodeInputPorts({ kind: 'voiceover' })).toEqual([])
    expect(compatibleNodeTargets({ kind: 'prompt' })).not.toContain('voiceover')
    expect(compatibleNodeTargets({ kind: 'router', routeSignal: 'text' })).not.toContain('voiceover')
    expect(connectionCompatibilityError({ kind: 'prompt' }, { kind: 'voiceover' }, 'text-out', 'text-in')).toContain('does not expose an upstream input')
    expect(compatibleNodeTargets({ kind: 'prompt' })).not.toContain('sound-effects')
    expect(nodeInputPorts({ kind: 'sound-effects' })).toEqual([])
    expect(connectionCompatibilityError({ kind: 'prompt' }, { kind: 'sound-effects' }, 'text-out', 'text-in')).toContain('does not expose an upstream input')
  })

  it('routes audio only to typed audio consumers and rejects generic visual sockets', () => {
    const audio = { kind: 'music-generator' as const, outputType: 'audio' as const }
    expect(compatibleNodeTargets(audio)).toEqual(['video-generator', 'list', 'gallery', 'storyboard', 'router'])
    expect(compatibleTargetHandle(audio, 'video-generator')).toBe('audio-reference-in')
    expect(connectionCompatibilityError(audio, { kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' }, 'media-out', 'audio-reference-in')).toBeNull()
    expect(connectionCompatibilityError(audio, { kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video' }, 'media-out', 'image-in')).toContain('Audio can connect only')
  })

  it('keeps Gallery media-only and legacy Output source-only', () => {
    expect(connectionCompatibilityError({ kind: 'prompt' }, { kind: 'gallery' }, 'text-out', 'media-in')).toContain('media-only terminal')
    expect(connectionCompatibilityError({ kind: 'router', routeSignal: 'text' }, { kind: 'gallery' }, 'output', 'media-in')).toContain('media-only terminal')
    expect(connectionCompatibilityError({ kind: 'image-generator', outputType: 'image' }, { kind: 'gallery' }, 'media-out', 'media-in')).toBeNull()
    expect(connectionCompatibilityError({ kind: 'image-generator', outputType: 'image' }, { kind: 'output' }, 'media-out', 'media-in')).toContain('legacy materialized result')
    expect(compatibleNodeSources({ kind: 'output' }, 'media-in')).toEqual([])
  })

  it('preserves a derived List type instead of advertising impossible mixed-media routes', () => {
    expect(compatibleNodeTargets({ kind: 'list', listSignal: 'mixed' })).toEqual([])
    expect(compatibleNodeTargets({ kind: 'list', listSignal: 'image' })).toContain('gallery')
    expect(compatibleNodeTargets({ kind: 'list', listSignal: 'text' })).not.toContain('voiceover')
    expect(compatibleNodeTargets({ kind: 'prompt' })).not.toContain('list')
    expect(connectionCompatibilityError({ kind: 'prompt' }, { kind: 'list' }, 'text-out', 'input')).toContain('generated-media batch')
    expect(compatibleTargetHandle({ kind: 'list', listSignal: 'image' }, 'video-generator')).toBe('reference-in')
    expect(compatibleTargetHandle({ kind: 'list', listSignal: 'video' }, 'video-generator')).toBe('video-reference-in')
    expect(compatibleTargetHandle({ kind: 'list', listSignal: 'audio' }, 'video-generator')).toBe('audio-reference-in')
    expect(compatibleNodeTargets({ kind: 'list', listSignal: 'image' })).not.toContain('upscaler')
  })

  it('proves every advertised quick-connect route has a real compatible input port', () => {
    const sources: Array<Pick<StudioNodeData, 'kind' | 'outputType' | 'listSignal' | 'routeSignal'>> = [
      { kind: 'prompt' },
      { kind: 'upload', outputType: 'image' },
      { kind: 'upload', outputType: 'video' },
      { kind: 'upload', outputType: 'audio' },
      { kind: 'image-generator', outputType: 'image' },
      { kind: 'image-editor', outputType: 'image' },
      { kind: 'upscaler', outputType: 'image' },
      { kind: 'video-generator', outputType: 'video' },
      { kind: 'voiceover', outputType: 'audio' },
      { kind: 'sound-effects', outputType: 'audio' },
      { kind: 'music-generator', outputType: 'audio' },
      { kind: 'output', outputType: 'image' },
      { kind: 'output', outputType: 'video' },
      { kind: 'output', outputType: 'audio' },
      { kind: 'style-reference', outputType: 'image' },
      { kind: 'character', outputType: 'image' },
      { kind: 'location', outputType: 'image' },
      { kind: 'element', outputType: 'image' },
      { kind: 'storyboard' },
      { kind: 'storyboard-asset' },
      { kind: 'list', listSignal: 'text' },
      { kind: 'list', listSignal: 'image' },
      { kind: 'list', listSignal: 'video' },
      { kind: 'list', listSignal: 'audio' },
      { kind: 'list', listSignal: 'mixed' },
      { kind: 'router', routeSignal: 'text' },
      { kind: 'router', routeSignal: 'image' },
      { kind: 'router', routeSignal: 'video' },
      { kind: 'router', routeSignal: 'audio' },
      { kind: 'router', routeSignal: 'mixed' },
    ]

    for (const source of sources) {
      for (const targetKind of compatibleNodeTargets(source)) {
        const target = {
          kind: targetKind,
          videoEngine: targetKind === 'video-generator'
            ? recommendedVideoEngineForSource(source) || 'wan-controlled'
            : undefined,
        } as Pick<StudioNodeData, 'kind' | 'videoEngine'>
        const targetHandle = compatibleTargetHandle(source, targetKind as NodeKind)
        const ports = nodeInputPorts(target)
        expect(ports.map((port) => port.id), `${source.kind}:${outputSignalFor(source)} -> ${targetKind}:${targetHandle}`).toContain(targetHandle)
        expect(connectionCompatibilityError(source, target, null, targetHandle), `${source.kind}:${outputSignalFor(source)} -> ${targetKind}:${targetHandle}`).toBeNull()
      }
    }
  })

  it('uses real typed source ports when inserting nodes into an existing connection', () => {
    expect(compatibleSourceHandle('storyboard', 'storyboard')).toBe('storyboard-out')
    expect(compatibleSourceHandle('list', 'video')).toBe('mixed-out')
    expect(compatibleSourceHandle('router', 'mixed')).toBe('output')
  })

  it('keeps canvas-only utilities and the view-only Gallery from advertising fake outputs', () => {
    for (const kind of ['frame', 'sticky-note', 'comment', 'sticker', 'drawing', 'gallery'] as const) {
      expect(compatibleNodeTargets({ kind }), kind).toEqual([])
    }
    expect(nodeInputPorts({ kind: 'gallery' })).toEqual([expect.objectContaining({ id: 'media-in', signal: 'mixed' })])
    expect(nodeInputPorts({ kind: 'frame' })).toEqual([])
  })

  it('rejects media connected to the wrong exact socket with a useful message', () => {
    const videoTarget = { kind: 'video-generator' as const, videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' }
    expect(connectionCompatibilityError({ kind: 'music-generator', outputType: 'audio' }, videoTarget, 'media-out', 'reference-in')).toContain('Audio can connect only')
    expect(connectionCompatibilityError({ kind: 'video-generator', outputType: 'video' }, videoTarget, 'media-out', 'image-in')).toContain('Video can connect only')
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, videoTarget, 'media-out', 'end-image')).toBeNull()
    expect(connectionCompatibilityError({ kind: 'location', outputType: 'image' }, videoTarget, 'media-out', 'image-in')).toBeNull()
    expect(connectionCompatibilityError({ kind: 'music-generator', outputType: 'audio' }, { kind: 'list' }, 'media-out', 'input')).toBeNull()
    expect(connectionCompatibilityError({ kind: 'video-generator', outputType: 'video' }, videoTarget, 'media-out', 'video-reference-in')).toBeNull()
    expect(connectionCompatibilityError({ kind: 'music-generator', outputType: 'audio' }, videoTarget, 'media-out', 'text-in')).toContain('Audio can connect only')
    expect(connectionCompatibilityError({ kind: 'music-generator', outputType: 'audio' }, videoTarget, 'media-out', 'end-image')).toContain('Audio can connect only')
    expect(connectionCompatibilityError({ kind: 'character', outputType: 'image' }, videoTarget, 'media-out', 'image-in')).toContain('semantic Reference')
    expect(connectionCompatibilityError({ kind: 'character', outputType: 'image' }, videoTarget, 'media-out', 'end-image')).toContain('semantic Reference')
    expect(connectionCompatibilityError({ kind: 'character', outputType: 'image' }, videoTarget, 'media-out', 'audio-reference-in')).toContain('semantic Reference')
    expect(connectionCompatibilityError({ kind: 'storyboard', outputType: undefined }, videoTarget, 'storyboard-out', 'audio-reference-in')).toContain('Storyboard')
    expect(connectionCompatibilityError({ kind: 'storyboard', outputType: undefined }, videoTarget, 'storyboard-out', 'image-in')).toContain('Storyboard')
    expect(connectionCompatibilityError({ kind: 'storyboard' }, { kind: 'gallery' }, 'storyboard-out', 'media-in')).toContain('dedicated Storyboard input')
    expect(connectionCompatibilityError({ kind: 'list', listSignal: 'mixed' }, { kind: 'gallery' }, 'mixed-out', 'media-in')).toContain('homogeneous')
  })
})
