import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { buildGenerationRequest } from './workflowResolver'
import { compileProviderPrompt, providerSeedancePayloadCompilation, visibleProviderPromptBody } from './referenceInstructions'
import { buildStoryboardConnectedContextManifest, storyboardBatchRewriteInstruction, storyboardRewriteInstruction } from './storyboardRewrite'

function node(id: string, kind: StudioNode['data']['kind'], patch: Partial<StudioNode['data']> = {}): StudioNode {
  return { id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...patch } }
}

describe('semantic asset generation request boundary', () => {
  const sentinel = 'ASSET_GENERATION_ONLY_SENTINEL'

  it('keeps reusable asset generation text in local Create/Edit/Rerun requests only', () => {
    for (const kind of ['character', 'wardrobe', 'element', 'location'] as const) {
      const asset = node(kind, kind, {
        assetGenerationPrompt: `${sentinel} ${kind}`,
        prompt: `${sentinel} legacy ${kind}`,
        imageProvider: 'fal', imageModelId: 'fal-ai/flux/schnell',
      })
      const request = buildGenerationRequest(asset, [asset], [])
      expect(request.prompt, kind).toContain(`${sentinel} ${kind}`)
      expect(JSON.stringify(request), kind).toContain(sentinel)
    }
  })

  it('excludes reusable generation text from a multi-hop Storyboard to Video request and keeps approved identity media only', () => {
    const reference = { id: 'character-a', name: 'Character A.png', path: '/managed/character-a.png', url: 'asset://character-a', mimeType: 'image/png', createdAt: '2026-08-26T00:00:00.000Z', metadata: { identityDescription: 'Approved scar and silhouette.' } }
    const character = node('character', 'character', { title: 'Character A', referenceTag: '@character-a', referenceAssets: [reference], assetGenerationPrompt: sentinel, prompt: sentinel })
    const storyboard = node('storyboard', 'storyboard', { storyboardPanels: [{ id: 'shot-1', prompt: 'Walks into frame.', duration: 5, shotSize: 'medium', camera: 'static' }], storyboardDuration: 5 })
    const video = node('video', 'video-generator', { promptMode: 'auto', prompt: '', videoEngine: 'bytedance/seedance-2.0/mini/reference-to-video', duration: 5, aspectRatio: '16:9' })
    const edges: Edge[] = [
      { id: 'character-storyboard', source: character.id, sourceHandle: 'media-out', target: storyboard.id, targetHandle: 'character-in' },
      { id: 'storyboard-video', source: storyboard.id, sourceHandle: 'media-out', target: video.id, targetHandle: 'storyboard-in' },
    ]
    const resolved = buildGenerationRequest(video, [character, storyboard, video], edges)
    const serialized = JSON.stringify(resolved)
    expect(serialized).not.toContain(sentinel)
    expect(resolved.prompt).not.toContain(sentinel)
    expect(resolved.references).toEqual(expect.arrayContaining([expect.objectContaining({ tag: '@character-a', url: 'asset://character-a', description: 'Approved scar and silhouette.' })]))
  })

  it('projects all five reusable kinds through direct Video, Composed Prompt, continuity, Revamp, provider body, and adapter without local generation history', () => {
    const kinds = ['character', 'wardrobe', 'element', 'location', 'style-reference'] as const
    const reusable = kinds.map((kind) => node(kind, kind, {
      title: kind,
      referenceTag: `@${kind}`,
      referenceAssets: [{
        id: `${kind}-ref`, name: `${kind}.png`, path: `/managed/${kind}.png`, url: `asset://${kind}`,
        mimeType: 'image/png', createdAt: '2026-08-26T00:00:00.000Z',
        metadata: { identityDescription: `Approved ${kind} identity.`, assetGenerationPrompt: `${sentinel} metadata ${kind}`, prompt: `${sentinel} metadata legacy ${kind}` },
      }],
      assetGenerationPrompt: `${sentinel} ${kind}`,
      prompt: `${sentinel} legacy ${kind}`,
      ...(kind === 'style-reference' ? { stylePrompt: 'Approved watercolor rendering.', styleSavedAt: '2026-08-26T00:00:00.000Z' } : {}),
    }))
    const byKind = new Map(reusable.map((entry) => [entry.data.kind, entry]))
    const character = byKind.get('character')!
    const wardrobe = byKind.get('wardrobe')!
    const directVideo = node('direct-video-all-kinds', 'video-generator', { promptMode: 'auto', prompt: 'Direct approved video action.', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 5, aspectRatio: '16:9' })
    const directVideoEdges: Edge[] = [
      { id: 'direct-wardrobe-character', source: wardrobe.id, sourceHandle: 'media-out', target: character.id, targetHandle: 'wardrobe-in' },
      { id: 'direct-character-video', source: character.id, sourceHandle: 'media-out', target: directVideo.id, targetHandle: 'character-in' },
      { id: 'direct-element-video', source: 'element', sourceHandle: 'media-out', target: directVideo.id, targetHandle: 'element-in' },
      { id: 'direct-location-video', source: 'location', sourceHandle: 'media-out', target: directVideo.id, targetHandle: 'location-in' },
      { id: 'direct-style-video', source: 'style-reference', sourceHandle: 'media-out', target: directVideo.id, targetHandle: 'style-in' },
    ]
    const directVideoRequest = buildGenerationRequest(directVideo, [...reusable, directVideo], directVideoEdges)
    const storyboard = node('storyboard-all-kinds', 'storyboard', {
      storyboardPanels: [{ id: 'shot-1', prompt: '@character uses @element at @location.', duration: 5, shotSize: 'medium', camera: 'static' }],
      storyboardDuration: 5,
    })
    const video = node('video-all-kinds', 'video-generator', { promptMode: 'auto', prompt: '', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 5, aspectRatio: '16:9' })
    const edges: Edge[] = [
      { id: 'wardrobe-character', source: wardrobe.id, sourceHandle: 'media-out', target: character.id, targetHandle: 'wardrobe-in' },
      { id: 'character-storyboard', source: character.id, sourceHandle: 'media-out', target: storyboard.id, targetHandle: 'character-in' },
      { id: 'element-storyboard', source: 'element', sourceHandle: 'media-out', target: storyboard.id, targetHandle: 'element-in' },
      { id: 'location-storyboard', source: 'location', sourceHandle: 'media-out', target: storyboard.id, targetHandle: 'location-in' },
      { id: 'style-storyboard', source: 'style-reference', sourceHandle: 'media-out', target: storyboard.id, targetHandle: 'style-in' },
      { id: 'storyboard-video', source: storyboard.id, sourceHandle: 'media-out', target: video.id, targetHandle: 'storyboard-in' },
    ]
    const graph = [...reusable, storyboard, video]
    const request = buildGenerationRequest(video, graph, edges)
    const compilation = compileProviderPrompt(request)
    const composedPrompt = visibleProviderPromptBody(request)
    const adapterPayload = providerSeedancePayloadCompilation(request).text
    const manifest = buildStoryboardConnectedContextManifest(storyboard.id, graph, edges, storyboard.data.storyboardPanels![0].prompt, storyboard.data.storyboardPanels![0])
    const revampShot = storyboardRewriteInstruction(storyboard.data.storyboardPanels!, 'shot-1', manifest.text)
    const revampAll = storyboardBatchRewriteInstruction(storyboard.data.storyboardPanels!, new Map([['shot-1', manifest]]))

    const surfaces = {
      directVideoRequest,
      request,
      referenceDescriptions: request.references?.map((reference) => reference.description),
      composedPrompt,
      continuity: compilation.continuityLedger,
      providerSemanticBody: compilation.text,
      adapterPayload,
      revampShot,
      revampAll,
    }
    for (const [surface, value] of Object.entries(surfaces)) expect(JSON.stringify(value), surface).not.toContain(sentinel)
    expect(request.authoredPrompt || '').not.toContain(sentinel)
    expect(request.storyboardContext || '').not.toContain(sentinel)
    expect(JSON.stringify(request.references)).toContain('Approved character identity.')
    expect(JSON.stringify(request.references)).toContain('Approved element identity.')
    expect(JSON.stringify(request.references)).toContain('Approved location identity.')
    expect(composedPrompt).toContain('@character')
    expect(adapterPayload).toContain('[Image1]')
  })

  it('excludes generation sentinels for every reusable kind from direct downstream provider payloads', () => {
    for (const kind of ['character', 'wardrobe', 'element', 'location', 'style-reference'] as const) {
      const reference = { id: `${kind}-ref`, name: `${kind}.png`, path: `/managed/${kind}.png`, url: `asset://${kind}`, mimeType: 'image/png', createdAt: '2026-08-26T00:00:00.000Z', metadata: { identityDescription: `Approved ${kind} identity.`, prompt: sentinel } }
      const asset = node(kind, kind, {
        title: kind,
        referenceTag: `@${kind}`,
        referenceAssets: [reference],
        assetGenerationPrompt: `${sentinel} ${kind}`,
        prompt: `${sentinel} legacy ${kind}`,
        ...(kind === 'style-reference' ? { stylePrompt: 'Approved watercolor rendering.', styleSavedAt: '2026-08-26T00:00:00.000Z' } : {}),
      })
      const image = node(`image-${kind}`, 'image-generator', { prompt: 'A quiet approved composition.', imageProvider: 'fal', imageModelId: 'fal-ai/flux/schnell' })
      let graphNodes = [asset, image]
      let edges: Edge[] = [{ id: `edge-${kind}`, source: asset.id, sourceHandle: 'media-out', target: image.id, targetHandle: kind === 'style-reference' ? 'style-in' : 'reference-in' }]
      if (kind === 'wardrobe') {
        const character = node('wardrobe-character', 'character', { title: 'Approved Character', referenceTag: '@approved-character', referenceAssets: [{ ...reference, id: 'character-ref', metadata: { identityDescription: 'Approved character identity.' } }] })
        graphNodes = [asset, character, image]
        edges = [
          { id: 'wardrobe-character-edge', source: asset.id, sourceHandle: 'media-out', target: character.id, targetHandle: 'wardrobe-in' },
          { id: 'character-image-edge', source: character.id, sourceHandle: 'media-out', target: image.id, targetHandle: 'reference-in' },
        ]
      }
      const serialized = JSON.stringify(buildGenerationRequest(image, graphNodes, edges))
      expect(serialized, kind).not.toContain(sentinel)
      if (kind === 'style-reference') expect(serialized).toContain('Approved watercolor rendering.')
      else expect(serialized).toContain(`Approved ${kind} identity.`)
    }
  })

  it('ignores legacy invented Character fields while preserving Style, background lock, and hidden ratio', () => {
    const character = node('character', 'character', {
      prompt: 'Élodie, private investigator.',
      characterControls: {
        age: { mode: 'exact', years: 37 },
        height: { mode: 'preset', value: 'Typical for age' },
        bodyFrame: 'broad',
        softTissueFullness: 'moderate',
        muscularity: 'high',
      },
      imageProvider: 'fal',
      imageModelId: 'fal-ai/nano-banana-pro',
    })
    const style = node('style', 'style-reference', { prompt: 'Graphite illustration.', stylePrompt: 'Graphite illustration.', runState: 'complete', styleSavedAt: '2026-08-26T00:00:00.000Z' })
    const edges: Edge[] = [{ id: 'style-edge', source: style.id, sourceHandle: 'media-out', target: character.id, targetHandle: 'style-in' }]
    const request = buildGenerationRequest(character, [character, style], edges)

    expect(request.prompt?.startsWith('Élodie, private investigator.')).toBe(true)
    for (const invented of ['Age:', 'Height:', 'Body frame:', 'Soft-tissue fullness:', 'Muscularity:']) expect(request.prompt).not.toContain(invented)
    expect(request.prompt).toContain('exact #D8D8D6')
    expect(request.prompt).toContain('Style may affect rendering language only')
    expect(request.stylePrompt).toBe('Graphite illustration.')
    expect(request.aspectRatio).toBe('16:9')
    expect(request.imageProvider).toBe('fal')
    expect(request.imageModelId).toBe('fal-ai/nano-banana-pro')
  })

  it('blocks an incompatible selected execution model before any caller can submit it', () => {
    const character = node('character', 'character', {
      prompt: '東京の雨', promptLanguageTag: 'ja',
      imageProvider: 'fal', imageModelId: 'fal-ai/flux/schnell',
    })
    expect(() => buildGenerationRequest(character, [character], [])).toThrow('does not accept original-language input tagged ja')
  })

  it('keeps Location exempt from the studio field while retaining hidden wide coverage', () => {
    const location = node('location', 'location', { prompt: 'A narrow station platform.', imageProvider: 'google', imageModelId: 'gemini-3.1-flash-image' })
    const request = buildGenerationRequest(location, [location], [])
    expect(request.prompt).toContain('authored environment fills the frame')
    expect(request.prompt).not.toContain('#D8D8D6')
    expect(request.aspectRatio).toBe('16:9')
  })
})
