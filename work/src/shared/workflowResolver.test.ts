import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { ImportedAsset, NodeKind, StudioNode, StudioNodeData } from './types'
import { buildGenerationRequest, inspectGenerationRequest, resolveWorkflowInput } from './workflowResolver'
import { klingStoryboardPrompts, providerPromptPreview, resolvedPromptWithReferences, seedanceReferenceLegend, selectSeedanceReferences } from './referenceInstructions'
import { STYLE_PRESETS } from './stylePresets'
import { incompleteSemanticReason } from './semanticReadiness'
import { generationRequirementFailures } from './generationReadiness'

function node(id: string, kind: NodeKind, data: Partial<StudioNodeData> = {}): StudioNode {
  return { id, type: kind === 'storyboard' ? 'storyboard' : 'studio', position: { x: 0, y: 0 }, data: { kind, title: data.title || kind, ...data } }
}

function asset(id: string, view?: NonNullable<ImportedAsset['metadata']>['characterView'], mimeType = 'image/png'): ImportedAsset {
  return { id, name: `${id}.png`, path: `/project/${id}.png`, url: `https://assets.invalid/${id}.png`, mimeType, createdAt: '2026-08-01T00:00:00.000Z', metadata: view ? { characterView: view } : undefined }
}

function edge(source: string, target: string, targetHandle = 'reference', inputFidelity?: 'guide' | 'auto' | 'lock'): Edge {
  return { id: `${source}-${target}-${targetHandle}`, source, sourceHandle: 'media-out', target, targetHandle, ...(inputFidelity ? { data: { inputFidelity } } : {}) }
}

describe('combined graph prompt X-ray', () => {
  it('rejects unsupported saved video selections instead of compiling a default model request', () => {
    const unsupported = node('unknown-video', 'video-generator', { prompt: 'Follow this motion.', videoEngine: 'not-a-supported-provider/video' })
    expect(() => buildGenerationRequest(unsupported, [unsupported], [])).toThrow(/supported video model/i)
  })

  const characterViews = ['full-body', 'full-body-back', 'front', 'profile', 'three-quarter', 'back', 'smile', 'neutral'] as const
  const nodes: StudioNode[] = [
    node('base-prompt', 'prompt', { prompt: 'A craftsman repairs a ceremonial compass while a storm approaches.' }),
    node('character', 'character', { title: 'Idris', referenceTag: '@idris', referenceAssets: characterViews.map((view) => asset(`idris-${view}`, view)) }),
    node('location', 'location', { title: 'Cliff Workshop', referenceTag: '@cliff-workshop', referenceAssets: [asset('cliff-workshop')] }),
    node('element', 'element', { title: 'Brass Compass', referenceTag: '@brass-compass', referenceAssets: [asset('compass-front'), asset('compass-back')] }),
    node('style', 'style-reference', { title: 'Cinematic Naturalism', referenceTag: '@cinematic-naturalism', stylePrompt: 'Grounded cinematic naturalism, restrained earth tones, soft directional daylight, subtle 35mm grain, modest wardrobe.', prompt: 'Grounded cinematic naturalism, restrained earth tones, soft directional daylight, subtle 35mm grain, modest wardrobe.' }),
    node('storyboard', 'storyboard', {
      title: 'Repair Sequence', storyboardDuration: 15, storyboardMode: 'single',
      storyboardPanels: [
        { id: 'p1', prompt: 'Establish Idris at the workbench as thunder rolls outside.', duration: 4, shotSize: 'wide', camera: 'jib-down', audioCue: 'distant thunder' },
        { id: 'p2', prompt: 'Idris opens the compass and studies the damaged gear.', duration: 3, shotSize: 'medium', camera: 'dolly-in', audioCue: 'small metal click' },
        { id: 'p3', prompt: 'His hands reseat the brass gear and the needle begins to turn.', duration: 4, shotSize: 'detail', camera: 'rack-focus-near', audioCue: 'mechanical ticking' },
        { id: 'p4', prompt: 'He looks toward the storm as the repaired compass points home.', duration: 4, shotSize: 'close-up', camera: 'pull-out', audioCue: 'wind rises' },
      ],
    }),
    node('video', 'video-generator', {
      prompt: 'Maintain a clear cause-before-effect repair sequence.', videoEngine: 'fal-ai/kling-video/o3/pro/reference-to-video',
      duration: 15, aspectRatio: '16:9', resolution: '1080p', generateAudio: true, negativePrompt: 'identity drift, extra fingers, text, watermark', guidanceScale: 0.65,
      bitrateMode: 'high',
    }),
    node('voice', 'voiceover', { prompt: 'The old compass remembered the way home.', voiceEngine: 'fish-audio', fishModel: 's2-pro', fishTemperature: 0.35, fishTopP: 0.8, fishVolume: 0.9, fishNormalizeLoudness: true, fishLatency: 'balanced', speed: 0.95, audioOutputFormat: 'mp3_44100_128' }),
    node('sfx', 'sound-effects', { prompt: 'Wind against old workshop windows and delicate brass ticking.', duration: 12, promptInfluence: 0.72, loop: true, audioOutputFormat: 'wav_44100' }),
    node('music', 'music-generator', { prompt: 'Restrained cinematic strings with frame drum, tense then resolving.', duration: 45, forceInstrumental: true, audioOutputFormat: 'mp3_44100_192' }),
  ]
  const edges: Edge[] = [
    edge('base-prompt', 'video', 'text-in'), edge('character', 'video', 'reference-in'), edge('location', 'video', 'reference-in'), edge('element', 'video', 'reference-in'), edge('style', 'storyboard', 'style-in'), edge('storyboard', 'video', 'storyboard-in'),
  ]

  it('returns a validation result instead of throwing while Options inspects an incompatible legacy edge', () => {
    const audio = node('invalid-audio', 'upload', { assetPath: '/project/voice.wav', mimeType: 'audio/wav', outputType: 'audio' })
    const video = node('invalid-video', 'video-generator', { videoEngine: 'fal-ai/kling-video/v3/standard/image-to-video' })
    const inspection = inspectGenerationRequest(video, [audio, video], [edge('invalid-audio', 'invalid-video', 'image-in')])
    expect(inspection.request).toBeNull()
    expect(inspection.error).toMatch(/image|audio|compatible/i)
  })

  it('sends only the selected generated result and its identity downstream even when node output fields are stale', () => {
    const source = node('history', 'image-generator', {
      title: 'Image Generator',
      outputPath: '/project/stale.jpg', outputUrl: 'file:///stale.jpg', outputType: 'image',
      generatedResults: [
        { path: '/project/first.jpg', url: 'file:///first.jpg', type: 'image', modelId: 'model', name: 'First Portrait' },
        { path: '/project/second.jpg', url: 'file:///second.jpg', type: 'image', modelId: 'model', name: 'Second Portrait' },
      ],
      activeResultIndex: 1,
    })
    const target = node('consumer', 'video-generator', { prompt: 'Animate @second-portrait.', videoEngine: 'fal-ai/kling-video/v3/standard/image-to-video' })
    const resolved = resolveWorkflowInput(target.id, [source, target], [edge(source.id, target.id, 'image-in')])
    expect(resolved.references).toHaveLength(1)
    expect(resolved.references[0]).toMatchObject({ path: '/project/second.jpg', url: 'file:///second.jpg', name: 'Second Portrait', tag: '@second-portrait' })
    expect(JSON.stringify(resolved)).not.toContain('stale.jpg')
    expect(JSON.stringify(resolved)).not.toContain('first.jpg')
  })

  it('rejects a persisted self-node edge before provider request assembly', () => {
    const image = node('self-image', 'image-generator', { prompt: 'Do not execute this cycle.', outputType: 'image' })
    const inspection = inspectGenerationRequest(image, [image], [edge('self-image', 'self-image', 'image-in')])
    expect(inspection.request).toBeNull()
    expect(inspection.error).toContain('cannot connect its output back into its own input')
  })

  it('carries the per-node Direction Layer choice into the provider request', () => {
    const image = node('direction-off-image', 'image-generator', { prompt: 'A precise still life.', directionLayer: false })
    expect(buildGenerationRequest(image, [image], [])).toMatchObject({ directionLayer: false })
  })

  it('defaults a legacy Character to Multi and sends one hidden compiled sheet while preserving editable source views locally', () => {
    const sourceViews = ['front', 'three-quarter', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter', 'side-body', 'full-body-back'] as const
    const character = node('compiled-character', 'character', {
      title: 'haji-asri',
      referenceTag: '@haji-asri',
      referenceAssets: sourceViews.map((view) => asset(`haji-${view}`, view)),
      characterSheetPath: '/project/01. Characters/haji-asri/.prism-internal/character-reference-sheet.jpg',
      characterSheetUrl: 'prism-asset://local/compiled-haji.jpg',
      characterSheetViews: [...sourceViews],
    })
    const target = node('compiled-target', 'image-generator', { prompt: 'Create one portrait.', imageProvider: 'openai', imageModelId: 'gpt-image-2' })
    const built = buildGenerationRequest(target, [character, target], [edge(character.id, target.id, 'reference-in')])
    expect(character.data.referenceAssets).toHaveLength(9)
    expect(built.references).toHaveLength(1)
    expect(built.references?.[0]).toMatchObject({ role: 'character', path: character.data.characterSheetPath, sourceViews: [...sourceViews] })
    expect(providerPromptPreview(built)).toContain('one hidden compiled reference sheet containing 9 coordinated views')
    expect(providerPromptPreview(built)).toContain('never render the sheet layout, gutters, or multiple copies')
  })

  it.each([
    ['character', 'character-in'],
    ['wardrobe', 'wardrobe-in'],
    ['element', 'element-in'],
    ['location', 'location-in'],
    ['style-reference', 'style-in'],
  ] as const)('keeps an offline %s edge but excludes stale media and blocks the required target before provider assembly', (kind, targetHandle) => {
    const sourceAsset = asset(`offline-${kind}`)
    const source = node(`offline-${kind}`, kind, {
      title: `Offline ${kind}`,
      referenceTag: `@offline-${kind}`,
      referenceAssets: [sourceAsset],
      ...(kind === 'style-reference' ? { stylePrompt: 'Offline custom style.', styleSavedAt: '2026-08-01T00:00:00.000Z' } : {}),
      ...({ semanticAssetAvailability: { state: 'offline', requiredAssetIds: [sourceAsset.id], unavailableAssetIds: [sourceAsset.id] } } as Partial<StudioNodeData>),
    })
    const finalTarget = node(`required-${kind}-target`, 'video-generator', {
      prompt: `Use @offline-${kind}.`,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
    })
    const wardrobeOwner = kind === 'wardrobe'
      ? node('offline-wardrobe-owner', 'character', { title: 'Wardrobe Owner', referenceTag: '@wardrobe-owner' })
      : undefined
    const persistedEdge = edge(source.id, wardrobeOwner?.id || finalTarget.id, targetHandle)
    const downstreamEdge = wardrobeOwner ? edge(wardrobeOwner.id, finalTarget.id, 'character-in') : undefined
    const graphEdges = downstreamEdge ? [persistedEdge, downstreamEdge] : [persistedEdge]
    const graphNodes = wardrobeOwner ? [source, wardrobeOwner, finalTarget] : [source, finalTarget]

    const resolved = resolveWorkflowInput(finalTarget.id, graphNodes, graphEdges)
    const request = buildGenerationRequest(finalTarget, graphNodes, graphEdges)

    expect(graphEdges).toContainEqual(persistedEdge)
    expect(persistedEdge).toMatchObject({ source: source.id, target: wardrobeOwner?.id || finalTarget.id, targetHandle })
    expect(resolved.references).toEqual([])
    expect(resolved.connectionRules.some((rule) => rule.tag === `@offline-${kind}`)).toBe(false)
    expect(JSON.stringify(resolved)).not.toContain(sourceAsset.path)
    expect(JSON.stringify(resolved)).not.toContain(sourceAsset.url)
    expect(JSON.stringify(resolved)).not.toContain(`@offline-${kind}`)
    expect(request.offlineSemanticSources).toEqual([{ nodeId: source.id, kind, role: kind === 'style-reference' ? 'style' : kind, title: `Offline ${kind}`, assetIds: [sourceAsset.id] }])
    expect(generationRequirementFailures(request)).toContain(`relink Offline ${kind} (Media Offline)`)
  })

  it('sends only Face for a Single Character and ignores stale Multi sheet data', () => {
    const face = asset('single-face', 'front')
    const profile = asset('stored-profile', 'profile')
    const character = node('single-character', 'character', {
      title: 'nadia',
      referenceTag: '@nadia',
      ...({ characterInputMode: 'single' } as Partial<StudioNode['data']> & Record<string, unknown>),
      referenceAssets: [face, profile],
      characterSheetPath: '/project/stale-compiled-sheet.jpg',
    })
    const target = node('single-target', 'image-generator', { prompt: 'Create one portrait of @nadia.', imageProvider: 'openai', imageModelId: 'gpt-image-2' })
    expect(incompleteSemanticReason(character.data)).toBeNull()
    const inspection = inspectGenerationRequest(target, [character, target], [edge(character.id, target.id, 'reference-in')])
    expect(inspection.error).toBeNull()
    expect(inspection.request?.references).toHaveLength(1)
    expect(inspection.request?.references?.[0]).toMatchObject({ role: 'character', path: face.path, tag: '@nadia', mediaType: 'image', slot: 'reference' })
    expect(inspection.request?.references?.[0].path).not.toBe(character.data.characterSheetPath)
    expect(inspection.request?.references?.[0].path).not.toBe(profile.path)
  })

  it('preserves and X-rays one prompt through fifteen typed Router levels', () => {
    const source = node('deep-source', 'prompt', { title: 'Deep Source', prompt: 'The lighthouse keeper shields one flame from the storm.' })
    const intermediate = Array.from({ length: 15 }, (_, index) => node(`deep-${index + 1}`, 'router', { title: `Router ${index + 1}`, routeSignal: 'text' }))
    const target = node('deep-target', 'image-generator', { title: 'Deep Image', prompt: 'Cinematic maritime realism.' })
    const chain = [source, ...intermediate, target]
    const deepEdges: Edge[] = chain.slice(0, -1).map((current, index) => {
      const next = chain[index + 1]
      const sourceHandle = current.data.kind === 'prompt' ? 'text-out' : 'output'
      const targetHandle = next.data.kind === 'router' ? 'input' : 'text-in'
      return { id: `deep-edge-${index + 1}`, source: current.id, sourceHandle, target: next.id, targetHandle }
    })

    const request = buildGenerationRequest(target, chain, deepEdges)
    const preview = providerPromptPreview(request)
    expect(deepEdges).toHaveLength(16)
    expect(intermediate).toHaveLength(15)
    expect(request.prompt).toContain('The lighthouse keeper shields one flame from the storm.')
    expect(request.prompt?.match(/The lighthouse keeper shields one flame from the storm\./g)).toHaveLength(1)
    expect(preview).toContain('Cinematic maritime realism.')
    expect(preview.match(/The lighthouse keeper shields one flame from the storm\./g)).toHaveLength(1)
    expect(request.connectionRules?.some((rule) => rule.label === 'Prompt')).toBe(true)
  })

  it('reapplies a legacy built-in Style exactly once to an Image request beside fifteen valid Router levels', () => {
    const preset = STYLE_PRESETS.find((candidate) => candidate.id === 'dimensional-comic')!
    const style = node('deep-style', 'style-reference', { title: preset.title, referenceTag: `@${preset.id}` })
    const source = node('deep-style-source', 'prompt', { prompt: 'Yusuf stands above New York without a mask.' })
    const routers = Array.from({ length: 15 }, (_, index) => node(`deep-style-router-${index + 1}`, 'router', { routeSignal: 'text' }))
    const target = node('deep-style-image', 'image-generator', { prompt: '@yusuf-anaqi wears a superhero-inspired red and blue suit.' })
    const chain = [source, ...routers, target]
    const deepEdges: Edge[] = chain.slice(0, -1).map((current, index) => ({
      id: `deep-style-edge-${index + 1}`,
      source: current.id,
      sourceHandle: current.data.kind === 'prompt' ? 'text-out' : 'output',
      target: chain[index + 1].id,
      targetHandle: chain[index + 1].data.kind === 'router' ? 'input' : 'text-in',
    }))
    const request = buildGenerationRequest(target, [style, ...chain], [edge(style.id, target.id, 'style-in'), ...deepEdges])
    const providerPrompt = resolvedPromptWithReferences(request)

    expect(routers).toHaveLength(15)
    expect(request.stylePrompt).toBe(preset.prompt)
    expect(request.builtInStylePrompts).toEqual([preset.prompt])
    expect(providerPrompt.match(new RegExp(preset.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    expect(providerPrompt).toContain('STYLE:')
    expect(providerPrompt.match(/Yusuf stands above New York without a mask\./g)).toHaveLength(1)
  })

  it('rejects a wrong typed edge hidden fifteen levels upstream', () => {
    const source = node('deep-invalid-audio', 'upload', { title: 'Wrong Audio', assetPath: '/project/wrong.wav', outputType: 'audio' })
    const routers = Array.from({ length: 15 }, (_, index) => node(`invalid-router-${index + 1}`, 'router', { routeSignal: 'text' }))
    const target = node('deep-invalid-target', 'image-generator', { prompt: 'Should never run.' })
    const chain = [source, ...routers, target]
    const deepEdges: Edge[] = chain.slice(0, -1).map((current, index) => ({
      id: `invalid-edge-${index + 1}`,
      source: current.id,
      sourceHandle: current.data.kind === 'upload' ? 'media-out' : 'output',
      target: chain[index + 1].id,
      targetHandle: chain[index + 1].data.kind === 'router' ? 'input' : 'text-in',
    }))
    const inspection = inspectGenerationRequest(target, chain, deepEdges)
    expect(inspection.request).toBeNull()
    expect(inspection.error).toMatch(/audio|text/i)
  })

  it('applies visual Motion Cadence exactly once through fifteen typed levels without changing Output FPS', () => {
    const source = node('cadence-source', 'prompt', { prompt: 'Handcrafted paper-cutout movement with restrained gestures.' })
    const routers = Array.from({ length: 15 }, (_, index) => node(`cadence-router-${index + 1}`, 'router', { routeSignal: 'text' }))
    const video = node('cadence-video', 'video-generator', { prompt: 'A fox crosses the handmade forest.', videoEngine: 'wan-controlled', frameRate: 24, motionCadence: 16 })
    const chain = [source, ...routers, video]
    const cadenceEdges: Edge[] = chain.slice(0, -1).map((current, index) => ({
      id: `cadence-edge-${index + 1}`,
      source: current.id,
      sourceHandle: current.data.kind === 'prompt' ? 'text-out' : 'output',
      target: chain[index + 1].id,
      targetHandle: chain[index + 1].data.kind === 'router' ? 'input' : 'text-in',
    }))
    const request = buildGenerationRequest(video, chain, cadenceEdges)
    expect(request.frameRate).toBe(24)
    expect(request.motionCadence).toBe(16)
    expect(request.prompt?.match(/MOTION CADENCE:/g)).toHaveLength(1)
    expect(request.prompt?.match(/16 fps animation cadence/g)).toHaveLength(1)
    expect(request.prompt).toContain('Preserve the provider-native encoded output frame rate and playback duration')
    expect(request.prompt?.match(/Handcrafted paper-cutout movement with restrained gestures\./g)).toHaveLength(1)

    const wrongSource = node('cadence-wrong-audio', 'upload', { assetPath: '/project/wrong.wav', outputType: 'audio' })
    const invalidChain = [wrongSource, ...routers, video]
    const invalidEdges: Edge[] = invalidChain.slice(0, -1).map((current, index) => ({
      id: `cadence-invalid-edge-${index + 1}`,
      source: current.id,
      sourceHandle: current.data.kind === 'upload' ? 'media-out' : 'output',
      target: invalidChain[index + 1].id,
      targetHandle: invalidChain[index + 1].data.kind === 'router' ? 'input' : 'text-in',
    }))
    const invalidInspection = inspectGenerationRequest(video, invalidChain, invalidEdges)
    expect(invalidInspection.request).toBeNull()
    expect(invalidInspection.error).toMatch(/audio|text|compatible/i)
  })

  it('carries every storyboard choice and semantic authority to the final video request', () => {
    const video = nodes.find((candidate) => candidate.id === 'video')!
    const request = buildGenerationRequest(video, nodes, edges)
    expect(request.duration).toBe(15)
    expect(request.aspectRatio).toBe('16:9')
    expect(request.resolution).toBe('1080p')
    expect(request.generateAudio).toBe(true)
    expect(request.bitrateMode).toBe('high')
    expect(request.negativePrompt).toContain('identity drift')
    expect(request.guidanceScale).toBe(0.65)
    expect(request.references?.filter((reference) => reference.role === 'character')).toHaveLength(8)
    expect(request.references?.filter((reference) => reference.role === 'location')).toHaveLength(1)
    expect(request.references?.filter((reference) => reference.role === 'element')).toHaveLength(2)
    expect(request.prompt).not.toContain('Maintain a clear cause-before-effect')
    expect(request.prompt).toContain('A craftsman repairs a ceremonial compass')
    expect(request.prompt).not.toContain('Style Direction')
    expect(request.stylePrompt).toBe(STYLE_PRESETS.find((preset) => preset.id === 'cinematic-naturalism')!.prompt)
    expect(request.prompt).toContain('grouped into 4 shots by authored Cut/Continue boundaries')
    expect(request.prompt).not.toContain('Sequence Type')
    expect(request.connectionRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: '@repair-sequence', label: 'Storyboard', mode: 'auto', rule: expect.stringContaining('automatically improving') }),
      expect.objectContaining({ tag: '@prompt', label: 'Prompt' }),
      expect.objectContaining({ tag: '@idris', label: expect.stringContaining('Character') }),
      expect.objectContaining({ tag: '@cliff-workshop', label: 'Location' }),
      expect.objectContaining({ tag: '@brass-compass', label: 'Element' }),
      expect.objectContaining({ tag: '@cinematic-naturalism', label: 'Style' }),
    ]))
    expect(request.prompt).toContain('SHOT 1 · 0.0–4.0s')
    expect(request.prompt).toContain('FRAMING: Wide — establish subject, environment, and spatial relationships.')
    expect(request.prompt).toContain('CAMERA: Jib Down — swing downward on a jib and settle into the subject or action')
    expect(request.prompt).toContain('SHOT 4 · 11.0–15.0s')
    expect(request.prompt).not.toMatch(/HARD CUT\.\s*$/)
    expect(request.multiPrompt).toHaveLength(4)
    expect(request.multiPrompt?.[2]).toEqual(expect.objectContaining({ duration: '4', prompt: expect.stringContaining('Rack Focus Near') }))
  })

  it('blocks empty Manual before style, references, or cadence can make composition non-empty', () => {
    const style = node('manual-style', 'style-reference', { title: 'Style', referenceTag: '@style', stylePrompt: 'Film grain.' })
    const video = node('manual-empty-video', 'video-generator', { promptMode: 'manual', manualPromptDraft: '', manualPromptSeeded: true, motionCadence: 12, videoEngine: 'bytedance/seedance-2.5/reference-to-video' })
    expect(() => buildGenerationRequest(video, [style, video], [edge(style.id, video.id, 'style-in')])).toThrow('Write a User prompt before running.')
  })

  it('keeps nested semantic authorities in Manual while excluding Storyboard payload', () => {
    const location = node('nested-location', 'location', { title: 'Alley', referenceTag: '@alley', prompt: 'Red concrete alley.', referenceAssets: [asset('alley')] })
    const storyboard = node('nested-board', 'storyboard', { storyboardDuration: 4, storyboardPanels: [{ id: 'p', prompt: 'Storyboard action.', duration: 4, shotSize: 'wide', camera: 'static' }] })
    const video = node('nested-manual-video', 'video-generator', { promptMode: 'manual', manualPromptDraft: 'Manual action only.', manualPromptSeeded: true, videoEngine: 'bytedance/seedance-2.5/reference-to-video' })
    const request = buildGenerationRequest(video, [location, storyboard, video], [edge(location.id, storyboard.id, 'location-in'), edge(storyboard.id, video.id, 'storyboard-in')])
    expect(request.prompt).toContain('Manual action only.')
    expect(request.providerPromptOverride).toBe('Manual action only.')
    expect(providerPromptPreview(request)).toBe('Manual action only.')
    expect(request.prompt).not.toMatch(/Storyboard action|Storyboard sequence|CAMERA BRIDGE|Shot 1|Range:/)
    expect(request.references).toEqual(expect.arrayContaining([expect.objectContaining({ role: 'location', tag: '@alley' })]))
    expect(generationRequirementFailures(request)).toEqual([])
  })

  it('treats semantic tags as optional in a valid User body without weakening provider media requirements', () => {
    const character = node('manual-character', 'character', { title: 'Mara', referenceTag: '@mara', referenceAssets: [asset('mara')] })
    const userBytes = '  Mara crosses the room.\r\nNo semantic tag is required.  '
    const video = node('manual-video-no-tags', 'video-generator', { promptMode: 'manual', manualPromptDraft: userBytes, manualPromptSeeded: true, videoEngine: 'bytedance/seedance-2.5/reference-to-video' })
    const valid = buildGenerationRequest(video, [character, video], [edge(character.id, video.id, 'character-in')])
    expect(valid.providerPromptOverride).toBe(userBytes)
    expect(providerPromptPreview(valid)).toBe(userBytes)
    expect(generationRequirementFailures(valid)).toEqual([])

    const missingMedia = buildGenerationRequest(video, [video], [])
    expect(missingMedia.providerPromptOverride).toBe(userBytes)
    expect(generationRequirementFailures(missingMedia)).toContain('connect a List or Character, Location, Element, image, video, or audio reference')
  })

  it('keeps a blank Storyboard panel in draft request structure without inventing action prose', () => {
    const storyboard = node('blank-storyboard', 'storyboard', { storyboardMode: 'single', storyboardDuration: 4, storyboardPanels: [
      { id: 'one', prompt: 'The courier enters.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' },
      { id: 'two', prompt: '   ', duration: 2, shotSize: 'medium', camera: 'dolly-in' },
    ] })
    const video = node('blank-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video' })
    const request = buildGenerationRequest(video, [storyboard, video], [edge(storyboard.id, video.id, 'storyboard-in')])
    expect(request.storyboardIncompletePanels).toEqual([2])
    expect(request.storyboardShots).toHaveLength(2)
    expect(request.storyboardShots?.[1]).toMatchObject({ prompt: '', duration: 2, shotSize: 'medium', camera: 'dolly-in', panelNumber: 2 })
    expect(providerPromptPreview(request)).toContain('STORYBOARD PANEL 2 INCOMPLETE')
    expect(providerPromptPreview(request)).not.toContain('Continue the established action')
  })

  it('compiles cumulative timing and deterministic Continue bridge metadata for Roko-style panels', () => {
    const storyboard = node('roko-storyboard', 'storyboard', { storyboardMode: 'single', storyboardDuration: 15, storyboardPanels: [
      { id: 'one', prompt: 'The crew faces the enforcers.', duration: 4, shotSize: 'wide', camera: 'static', transitionToNext: 'continue' },
      { id: 'two', prompt: 'Roko rolls into the alley.', duration: 5, shotSize: 'medium', camera: 'dolly-in', transitionToNext: 'hard-cut' },
      { id: 'three', prompt: 'Roko lands the short punch.', duration: 6, shotSize: 'close-up', camera: 'static' },
    ] })
    const video = node('roko-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 15 })
    const request = buildGenerationRequest(video, [storyboard, video], [edge(storyboard.id, video.id, 'storyboard-in')])
    expect(request.storyboardShots?.map((shot) => [shot.startSeconds, shot.endSeconds])).toEqual([[0, 4], [4, 9], [9, 15]])
    expect(request.storyboardShots?.[1].incomingBridge).toMatchObject({ kind: 'merged', source: { fovDegrees: 63 }, target: { fovDegrees: 47 } })
    expect(request.prompt).toContain('CAMERA BRIDGE')
    expect(request.prompt).toContain('4.0–4.7s')
    expect(request.prompt).not.toContain('Continue the established action')
  })

  it('blocks a zero-duration Storyboard panel without dropping or rewriting it', () => {
    const storyboard = node('zero-storyboard', 'storyboard', {
      storyboardMode: 'single', storyboardDuration: 5,
      storyboardPanels: [
        { id: 'one', prompt: 'The first authored panel remains intact.', duration: 5, shotSize: 'wide', camera: 'static' },
        { id: 'two', prompt: 'The exhausted authored panel remains intact.', duration: 0, shotSize: 'medium', camera: 'static' },
      ],
    })
    const video = node('zero-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    expect(() => buildGenerationRequest(video, [storyboard, video], [edge(storyboard.id, video.id, 'storyboard-in')])).toThrow(
      'Storyboard panel 2 is below the minimum 1.0s duration.',
    )
    expect(storyboard.data.storyboardPanels?.map((panel) => panel.prompt)).toEqual([
      'The first authored panel remains intact.',
      'The exhausted authored panel remains intact.',
    ])
  })

  it('keeps a passive Storyboard connection instruction-only even after panel images exist', () => {
    const storyboard = node('passive-storyboard', 'storyboard', {
      storyboardDuration: 2,
      storyboardPanels: [
        { id: 'one', prompt: 'A courier enters the station.', duration: 1, shotSize: 'wide', camera: 'static', asset: asset('rendered-panel-one') },
        { id: 'two', prompt: 'She checks the departure board.', duration: 1, shotSize: 'medium', camera: 'dolly-in', asset: asset('rendered-panel-two') },
      ],
    })
    const video = node('passive-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/text-to-video' })
    const request = buildGenerationRequest(video, [storyboard, video], [edge('passive-storyboard', 'passive-video', 'storyboard-in')])

    expect(request.prompt).toContain('courier enters the station')
    expect(request.prompt).toContain('checks the departure board')
    expect(request.storyboardContext).toBeUndefined()
    expect(request.references).toEqual([])
    expect(request.inputPath).toBeUndefined()
    expect(request.inputUrl).toBeUndefined()
  })

  it('turns Auto framing and movement into motivated model guidance without inventing a move', () => {
    const autoNodes = [
      node('auto-storyboard', 'storyboard', { storyboardDuration: 6, storyboardPanels: [{ id: 'auto-shot', prompt: 'Idris silently recognizes the compass marking.', duration: 'auto', shotSize: 'auto', camera: 'auto' }] }),
      node('auto-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/text-to-video', duration: 6 }),
    ]
    const request = buildGenerationRequest(autoNodes[1], autoNodes, [edge('auto-storyboard', 'auto-video', 'storyboard-in')])
    expect(request.prompt).toContain('choose the clearest framing for action and emotion')
    expect(request.prompt).toContain('stay static when movement adds no story value')
  })

  it('rejects two Storyboards on one Video Generator instead of silently overwriting either plan', () => {
    const first = node('story-a', 'storyboard', { storyboardDuration: 4, storyboardPanels: [{ id: 'a', prompt: 'First authored plan.', duration: 4, shotSize: 'wide', camera: 'static' }] })
    const second = node('story-b', 'storyboard', { storyboardDuration: 4, storyboardPanels: [{ id: 'b', prompt: 'Second authored plan.', duration: 4, shotSize: 'detail', camera: 'dolly-in' }] })
    const video = node('two-story-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    expect(() => buildGenerationRequest(video, [first, second, video], [
      edge(first.id, video.id, 'storyboard-in'),
      edge(second.id, video.id, 'storyboard-in'),
    ])).toThrow('accepts one Storyboard plan')
  })

  it('rejects weakening a typed Storyboard into a generic List', () => {
    const storyboard = node('listed-storyboard', 'storyboard', { storyboardDuration: 6, storyboardPanels: [
      { id: 'one', prompt: 'A pilot checks the runway lights.', duration: 3, shotSize: 'wide', camera: 'static' },
      { id: 'two', prompt: 'The engine starts and instruments glow.', duration: 3, shotSize: 'detail', camera: 'dolly-in' },
    ] })
    const list = node('story-list', 'list')
    const video = node('listed-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    expect(() => buildGenerationRequest(video, [storyboard, list, video], [edge('listed-storyboard', 'story-list', 'input'), edge('story-list', 'listed-video', 'text-in')])).toThrow('generated-media batch')
  })

  it('makes authored Hard Cut boundaries produce separate shots without hidden mode authority', () => {
    const separateNodes = [
      node('separate-storyboard', 'storyboard', { storyboardMode: 'single', storyboardDuration: 6, storyboardPanels: [{ id: 'one', prompt: 'Exterior lighthouse at dawn.', duration: 3, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' }, { id: 'two', prompt: 'Interior lens begins rotating.', duration: 3, shotSize: 'detail', camera: 'static' }] }),
      node('separate-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video', duration: 6 }),
    ]
    const request = buildGenerationRequest(separateNodes[1], separateNodes, [edge('separate-storyboard', 'separate-video', 'storyboard-in')])
    expect(request.prompt).toContain('grouped into 2 shots by authored Cut/Continue boundaries')
    expect(request.prompt).not.toContain('Sequence Type')
  })

  it('carries explicit Cut and Continue boundaries into the resolved video request', () => {
    const storyboard = node('transition-storyboard', 'storyboard', {
      storyboardMode: 'single', storyboardDuration: 9,
      storyboardPanels: [
        { id: 'one', prompt: 'Follow Oli toward the ambulance.', duration: 2, shotSize: 'wide', camera: 'handheld', transitionToNext: 'continue' },
        { id: 'two', prompt: 'Pan with Oli and settle on the reporter.', duration: 3, shotSize: 'medium', camera: 'pan-right', transitionToNext: 'hard-cut' },
        { id: 'three', prompt: 'Hold on the reporter sign-off.', duration: 4, shotSize: 'close-up', camera: 'static', transitionToNext: 'continue' },
      ],
    })
    const video = node('transition-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 9 })
    const request = buildGenerationRequest(video, [storyboard, video], [edge(storyboard.id, video.id, 'storyboard-in')])

    expect(request.storyboardShots?.map((shot) => shot.transitionToNext)).toEqual(['continue', 'hard-cut', 'continue'])
  })

  it('compiles the selected Revamped snapshot without mutating or leaking byte-exact Original', () => {
    const original = '  Original authored bytes\nline two  '
    const storyboard = node('versioned-storyboard', 'storyboard', {
      storyboardPanels: [{
        id: 'one', prompt: original, originalPrompt: original, revampedPrompt: 'Selected cinematic wording.',
        selectedPromptVersion: 'revamped', duration: 4, shotSize: 'wide', camera: 'static',
      }],
    })
    const video = node('versioned-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 4 })
    const request = buildGenerationRequest(video, [storyboard, video], [edge(storyboard.id, video.id, 'storyboard-in')])
    expect(request.prompt).toContain('Selected cinematic wording.')
    expect(request.prompt).not.toContain('Original authored bytes')
    expect(storyboard.data.storyboardPanels?.[0]).toMatchObject({ prompt: original, originalPrompt: original, revampedPrompt: 'Selected cinematic wording.', selectedPromptVersion: 'revamped' })
  })

  it('ignores a legacy mistaken image mode and resolves every authored Storyboard panel', () => {
    const storyboard = node('legacy-layout-storyboard', 'storyboard', {
      ...({ storyboardImageMode: 'single' } as Partial<StudioNode['data']> & Record<string, unknown>),
      storyboardDuration: 6,
      outputPath: '/project/storyboard.png',
      outputUrl: 'prism-asset://local/storyboard',
      storyboardNeedsCompile: false,
      storyboardPanels: [
        { id: 'one', prompt: 'The first authored panel.', duration: 3, shotSize: 'wide', camera: 'static' },
        { id: 'two', prompt: 'The second authored panel.', duration: 3, shotSize: 'detail', camera: 'dolly-in' },
      ],
    })
    const video = node('storyboard-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video', duration: 6 })
    const request = buildGenerationRequest(video, [storyboard, video], [edge(storyboard.id, video.id, 'storyboard-in')])
    expect(request.storyboardShots).toHaveLength(2)
    expect(request.prompt).toContain('The first authored panel.')
    expect(request.prompt).toContain('The second authored panel.')
    expect(request.references).toEqual(expect.arrayContaining([expect.objectContaining({ role: 'storyboard', path: '/project/storyboard.png' })]))
  })

  it('rejects legacy inbound prompting because Character identity prompting is embedded', () => {
    const semanticNodes = [
      node('identity-prompt', 'prompt', { prompt: 'Idris is a weathered Malay navigator in his fifties, wearing a modest indigo work coat.' }),
      node('prompt-character', 'character', { title: 'Idris', referenceTag: '@idris' }),
      node('semantic-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video', prompt: 'Idris studies the horizon.' }),
    ]
    const semanticEdges = [edge('identity-prompt', 'prompt-character', 'text-in'), edge('prompt-character', 'semantic-video', 'reference-in')]
    expect(() => buildGenerationRequest(semanticNodes[2], semanticNodes, semanticEdges)).toThrow(/compatible text-in socket|optional Style input/)
  })

  it('retains one shared output-only Style through separate valid branches without treating reuse as a cycle', () => {
    const sharedNodes = [
      node('rain-style', 'style-reference', { title: 'Rain Dusk', referenceTag: '@rain-dusk', prompt: 'LOCAL_STYLE_GENERATION_HISTORY', stylePrompt: 'One continuous rainstorm at dusk.', styleSavedAt: '2026-08-27T00:00:00.000Z' }),
      node('rain-storyboard', 'storyboard', { storyboardPanels: [{ id: 'rain', prompt: 'The harbor remains visible.', duration: 4 }] }),
      node('shared-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video' }),
    ]
    const sharedEdges = [edge('rain-style', 'rain-storyboard', 'style-in'), edge('rain-style', 'shared-video', 'style-in'), edge('rain-storyboard', 'shared-video', 'storyboard-in')]
    const request = buildGenerationRequest(sharedNodes[2], sharedNodes, sharedEdges)
    expect(request.prompt).not.toContain('One continuous rainstorm at dusk.')
    expect(JSON.stringify(request)).not.toContain('LOCAL_STYLE_GENERATION_HISTORY')
    expect(request.stylePrompt?.match(/One continuous rainstorm at dusk\./g)).toHaveLength(1)
    expect(providerPromptPreview(request).match(/One continuous rainstorm at dusk\./g)).toHaveLength(1)
  })

  it('builds explicit multi-view character identity authority in the provider prompt', () => {
    const request = buildGenerationRequest(nodes.find((candidate) => candidate.id === 'video')!, nodes, edges)
    const finalPrompt = resolvedPromptWithReferences(request)
    expect(finalPrompt.match(/Use @idris as Idris\./g)).toHaveLength(1)
    expect(finalPrompt).toContain('Only 1 person appears.')
    expect(finalPrompt.match(/Studio sheet background and layout NOT inherited\./g)).toHaveLength(1)
    expect(finalPrompt).toContain('@cliff-workshop matches the reference in every appearance.')
    expect(finalPrompt).toContain('@brass-compass matches the reference in every appearance.')
  })

  it('maps semantic character views to Seedance numbered reference tokens', () => {
    const request = buildGenerationRequest(nodes.find((candidate) => candidate.id === 'video')!, nodes, edges)
    const images = request.references || []
    const legend = seedanceReferenceLegend(images, [], [])
    expect(legend).toContain('@Image1 = idris character — full body view; identity, anatomy, body proportions, reference wardrobe, accessories, and rear-continuity authority')
    expect(legend).toContain('@Image3 = idris character — front view; face/head identity authority')
    expect(legend).toContain('@Image9 = cliff-workshop location — environment, layout, lighting, perspective, and scene-geometry authority')
    expect(legend).toContain('@Image10 = brass-compass element — the connected reference owns every unnamed appearance property')
  })

  it('shows the exact Seedance reference map in the no-credit provider prompt preview', () => {
    const seedanceVideo = node('seedance-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video', duration: 15 })
    const seedanceEdges = edges.map((candidate) => candidate.target === 'video' ? { ...candidate, id: `${candidate.id}-seedance`, target: 'seedance-video' } : candidate)
    const request = buildGenerationRequest(seedanceVideo, [...nodes, seedanceVideo], seedanceEdges)
    const preview = providerPromptPreview(request)
    expect(preview).toContain('REFERENCE AUTHORITY')
    expect(preview).toContain('Use @idris as Idris.')
    expect(preview).toContain('Use @cliff-workshop for the location')
    expect(preview).toContain('Use @brass-compass for the element')
    expect(preview).not.toMatch(/@Image\d+/)
    expect(preview).toContain("exceed Seedance 2's 9-image / 12-total limit. Generation is blocked")
  })

  it('reserves a valid Seedance total budget when image, video, and audio references are combined', () => {
    const references = [
      ...characterViews.map((view) => ({ role: 'character' as const, path: `/project/${view}.png`, mediaType: 'image' as const, view, tag: '@idris' })),
      { role: 'location' as const, path: '/project/location.png', mediaType: 'image' as const, tag: '@location' },
      ...Array.from({ length: 3 }, (_, index) => ({ role: 'reference' as const, path: `/project/video-${index}.mp4`, mediaType: 'video' as const, tag: `@video-${index + 1}` })),
      ...Array.from({ length: 3 }, (_, index) => ({ role: 'reference' as const, path: `/project/audio-${index}.wav`, mediaType: 'audio' as const, tag: `@audio-${index + 1}` })),
    ]
    const selected = selectSeedanceReferences(references)
    expect(selected.images).toHaveLength(6)
    expect(selected.videos).toHaveLength(3)
    expect(selected.audios).toHaveLength(3)
    expect(selected.images.length + selected.videos.length + selected.audios.length).toBe(12)
    expect(selected.images.some((reference) => reference.role === 'location')).toBe(true)
    expect(selected.images.some((reference) => 'view' in reference && reference.view === 'front')).toBe(true)
    expect(selected.images.some((reference) => 'view' in reference && reference.view === 'full-body')).toBe(true)
  })

  it('uses the larger verified Seedance 2.5 multimodal reference budget without truncating valid sources', () => {
    const references = [
      ...Array.from({ length: 30 }, (_, index) => ({ role: 'reference' as const, path: `/project/image-${index}.png`, mediaType: 'image' as const, tag: `@image-${index + 1}` })),
      ...Array.from({ length: 10 }, (_, index) => ({ role: 'reference' as const, path: `/project/video-${index}.mp4`, mediaType: 'video' as const, tag: `@video-${index + 1}` })),
      ...Array.from({ length: 10 }, (_, index) => ({ role: 'reference' as const, path: `/project/audio-${index}.wav`, mediaType: 'audio' as const, tag: `@audio-${index + 1}` })),
    ]
    const selected = selectSeedanceReferences(references, { images: 30, videos: 10, audios: 10, total: 50 })
    expect(selected.images).toHaveLength(30)
    expect(selected.videos).toHaveLength(10)
    expect(selected.audios).toHaveLength(10)
    expect(selected.omitted).toHaveLength(0)
  })

  it('shows semantic assets as exact Kling @Element tokens in the provider preview', () => {
    const request = buildGenerationRequest(nodes.find((candidate) => candidate.id === 'video')!, nodes, edges)
    const preview = providerPromptPreview(request)
    expect(preview).toContain('KLING REFERENCE MAP:')
    expect(preview).toContain('@Element1 = @idris (character authority)')
    expect(preview).toContain('@Element2 = @brass-compass (element authority)')
    expect(preview).toContain('@Image1 = @cliff-workshop (location appearance authority)')
  })

  it('preserves all audio-node controls in dry-run requests', () => {
    const voice = buildGenerationRequest(nodes.find((candidate) => candidate.id === 'voice')!, nodes, edges)
    expect(voice).toMatchObject({ voiceEngine: 'fish-audio', fishModel: 's2-pro', fishTemperature: 0.35, fishTopP: 0.8, fishVolume: 0.9, fishNormalizeLoudness: true, fishLatency: 'balanced', speed: 0.95, audioOutputFormat: 'mp3_44100_128' })
    const sfx = buildGenerationRequest(nodes.find((candidate) => candidate.id === 'sfx')!, nodes, edges)
    expect(sfx).toMatchObject({ duration: 12, promptInfluence: 0.72, loop: true, audioOutputFormat: 'wav_44100' })
    const music = buildGenerationRequest(nodes.find((candidate) => candidate.id === 'music')!, nodes, edges)
    expect(music).toMatchObject({ duration: 45, forceInstrumental: true, audioOutputFormat: 'mp3_44100_192' })
    const legacyLanguageVoice = node('legacy-language-voice', 'voiceover', { prompt: 'Selamat datang.', voiceEngine: 'elevenlabs', languageCode: 'ms' })
    expect(buildGenerationRequest(legacyLanguageVoice, [legacyLanguageVoice], [])).toMatchObject({ languageCode: 'msa' })
    const defaultEnglishVoice = node('default-english-voice', 'voiceover', { prompt: 'Welcome.', voiceEngine: 'elevenlabs' })
    expect(buildGenerationRequest(defaultEnglishVoice, [defaultEnglishVoice], [])).toMatchObject({ languageCode: 'eng' })
  })

  it('builds a no-credit executable request for every runnable node kind', () => {
    const source = node('catalog-source', 'upload', { title: 'Catalog Source', assetPath: '/project/catalog.png', assetUrl: 'https://assets.invalid/catalog.png', outputType: 'image' })
    const runnable: StudioNode[] = [
      node('catalog-image', 'image-generator', { prompt: 'Generate a catalog image.', imageProvider: 'fal', imageModelId: 'fal-ai/flux/schnell' }),
      node('catalog-editor', 'image-editor', { prompt: 'Edit the catalog image.', imageProvider: 'fal', imageModelId: 'fal-ai/flux-pro/kontext' }),
      node('catalog-upscaler', 'upscaler', { scale: 2 }),
      node('catalog-video', 'video-generator', { prompt: 'Generate a catalog video.', videoEngine: 'wan-controlled', duration: 5 }),
      node('catalog-voice', 'voiceover', { prompt: 'Read this catalog line.', voiceEngine: 'elevenlabs' }),
      node('catalog-sfx', 'sound-effects', { prompt: 'A clean catalog click.', duration: 2 }),
      node('catalog-music', 'music-generator', { prompt: 'A short restrained catalog theme.', duration: 30 }),
      node('catalog-character', 'character', { prompt: 'A reusable adult male navigator.', quantity: 1 }),
      node('catalog-location', 'location', { prompt: 'A reusable harbor workshop.', quantity: 1 }),
      node('catalog-element', 'element', { prompt: 'A reusable brass compass.', quantity: 3 }),
    ]
    const catalogNodes = [source, ...runnable]
    const catalogEdges = [
      edge('catalog-source', 'catalog-editor', 'image-in', 'lock'),
      edge('catalog-source', 'catalog-upscaler', 'image-in', 'lock'),
    ]
    for (const candidate of runnable) {
      const request = buildGenerationRequest(candidate, catalogNodes, catalogEdges)
      expect(request.nodeId).toBe(candidate.id)
      expect(request.kind).toBe(['character', 'location', 'element'].includes(candidate.data.kind) ? 'image-generator' : candidate.data.kind)
      expect(() => providerPromptPreview(request)).not.toThrow()
    }
  })

  it('carries optional Style through fifteen typed levels into semantic asset creation exactly once', () => {
    const style = node('semantic-style-source', 'style-reference', { title: 'Ink Style', stylePrompt: 'Fine black ink lines with restrained warm paper texture.', prompt: 'Fine black ink lines with restrained warm paper texture.', runState: 'complete' })
    const routers = Array.from({ length: 15 }, (_, index) => node(`semantic-style-router-${index + 1}`, 'router', { routeSignal: 'style' }))
    const character = node('semantic-style-character', 'character', { prompt: 'A calm middle-aged navigator with a weathered coat.' })
    const chain = [style, ...routers, character]
    const styleEdges: Edge[] = chain.slice(0, -1).map((current, index) => ({
      id: `semantic-style-edge-${index + 1}`,
      source: current.id,
      sourceHandle: current.data.kind === 'router' ? 'output' : 'media-out',
      target: chain[index + 1].id,
      targetHandle: chain[index + 1].data.kind === 'router' ? 'input' : 'style-in',
    }))
    const request = buildGenerationRequest(character, chain, styleEdges)
    expect(routers).toHaveLength(15)
    expect(request.prompt).not.toContain('Fine black ink lines with restrained warm paper texture.')
    expect(request.stylePrompt?.match(/Fine black ink lines with restrained warm paper texture\./g)).toHaveLength(1)

    const text = node('wrong-semantic-source', 'prompt', { prompt: 'This must not become a Style.' })
    const wrongRouters = Array.from({ length: 15 }, (_, index) => node(`wrong-semantic-router-${index + 1}`, 'router', { routeSignal: 'text' }))
    const wrongChain = [text, ...wrongRouters, character]
    const wrongEdges: Edge[] = wrongChain.slice(0, -1).map((current, index) => ({
      id: `wrong-semantic-edge-${index + 1}`,
      source: current.id,
      sourceHandle: current.data.kind === 'prompt' ? 'text-out' : 'output',
      target: wrongChain[index + 1].id,
      targetHandle: wrongChain[index + 1].data.kind === 'router' ? 'input' : 'style-in',
    }))
    expect(() => buildGenerationRequest(character, wrongChain, wrongEdges)).toThrow(/Style asset|style input/i)
  })

  it('preserves image generation, editing, and upscale controls through media inputs', () => {
    const image = node('image', 'image-generator', { prompt: 'A brass compass on slate.', aspectRatio: '4:3', quantity: 2, outputFormat: 'webp', imageResolution: '4K', imageProvider: 'google', imageModelId: 'gemini-image', safetyTolerance: 3, enableWebSearch: true, inferenceSteps: 8, guidanceScale: 4.5, acceleration: 'high', seed: 42 })
    const source = node('source-image', 'upload', { assetPath: '/project/source.png', assetUrl: 'https://assets.invalid/source.png', outputType: 'image' })
    const editor = node('editor', 'image-editor', { prompt: 'Replace the surface with dark walnut.', outputFormat: 'png', imageResolution: '2K', safetyTolerance: 4 })
    const upscaler = node('upscale', 'upscaler', { scale: 4 })
    const localNodes = [image, source, editor, upscaler]
    const localEdges = [edge('source-image', 'editor', 'image-in', 'lock'), edge('source-image', 'upscale', 'image-in')]
    expect(buildGenerationRequest(image, localNodes, localEdges)).toMatchObject({ aspectRatio: '4:3', quantity: 2, outputFormat: 'webp', imageResolution: '4K', imageProvider: 'google', imageModelId: 'gemini-image', safetyTolerance: 3, enableWebSearch: true, inferenceSteps: 8, guidanceScale: 4.5, acceleration: 'high', seed: 42 })
    expect(buildGenerationRequest(editor, localNodes, localEdges)).toMatchObject({ inputPath: '/project/source.png', outputFormat: 'png', imageResolution: '2K' })
    expect(buildGenerationRequest(upscaler, localNodes, localEdges)).toMatchObject({ inputPath: '/project/source.png', scale: 4 })
  })

  it('keeps the Image Editor source socket primary at default Auto fidelity', () => {
    const source = node('auto-editor-source', 'upload', { title: 'Portrait Base', assetPath: '/project/base.png', assetUrl: 'https://assets.invalid/base.png', outputType: 'image' })
    const reference = node('editor-reference', 'upload', { title: 'Fabric Reference', assetPath: '/project/fabric.png', outputType: 'image' })
    const editor = node('auto-editor', 'image-editor', { prompt: 'Change only the jacket fabric.', imageProvider: 'fal', imageModelId: 'fal-ai/flux-pro/kontext' })
    const request = buildGenerationRequest(editor, [source, reference, editor], [
      edge('auto-editor-source', 'auto-editor', 'image-in'),
      edge('editor-reference', 'auto-editor', 'reference-in'),
    ])
    expect(request).toMatchObject({ inputPath: '/project/base.png', inputUrl: 'https://assets.invalid/base.png', inputRole: 'source-image' })
    expect(request.references).toEqual([expect.objectContaining({ path: '/project/fabric.png', slot: 'reference' })])
  })

  it('preserves the required source image when an Upscaler input passes through a Router', () => {
    const source = node('routed-source', 'upload', { title: 'Portrait Source', assetPath: '/project/portrait.png', assetUrl: 'https://assets.invalid/portrait.png', outputType: 'image' })
    const router = node('image-router', 'router', { title: 'Image Route', routeSignal: 'image' })
    const upscaler = node('routed-upscale', 'upscaler', { scale: 3 })
    const request = buildGenerationRequest(upscaler, [source, router, upscaler], [
      edge('routed-source', 'image-router', 'input'),
      edge('image-router', 'routed-upscale', 'image-in'),
    ])
    expect(request).toMatchObject({ inputPath: '/project/portrait.png', inputUrl: 'https://assets.invalid/portrait.png', inputRole: 'source-image', scale: 3 })
    expect(request.connectionRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Image To Upscale', rule: expect.stringContaining('automatically balancing faithful restoration') }),
    ]))
  })

  it('preserves a Router image as the required Starting Image for a Video Generator', () => {
    const source = node('routed-start-source', 'upload', { title: 'Opening Frame', assetPath: '/project/opening.png', assetUrl: 'https://assets.invalid/opening.png', outputType: 'image' })
    const router = node('start-image-router', 'router', { title: 'Starting Image Route', routeSignal: 'image' })
    const video = node('routed-start-video', 'video-generator', { prompt: 'Animate the opening frame.', videoEngine: 'fal-ai/kling-video/v3/standard/image-to-video' })
    const request = buildGenerationRequest(video, [source, router, video], [
      edge('routed-start-source', 'start-image-router', 'input'),
      edge('start-image-router', 'routed-start-video', 'image-in'),
    ])

    expect(request).toMatchObject({
      inputPath: '/project/opening.png',
      inputUrl: 'https://assets.invalid/opening.png',
      inputName: 'Opening Frame',
      inputRole: 'start-frame',
    })
    expect(request.connectionRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Starting Frame', mode: 'auto' }),
    ]))
  })

  it('preserves a Router image as the Image Editor source at default Auto fidelity', () => {
    const source = node('routed-editor-source', 'upload', { title: 'Portrait Base', assetPath: '/project/base.png', assetUrl: 'https://assets.invalid/base.png', outputType: 'image' })
    const router = node('editor-image-router', 'router', { title: 'Editor Source Route', routeSignal: 'image' })
    const editor = node('routed-editor', 'image-editor', { prompt: 'Change only the jacket color.' })
    const request = buildGenerationRequest(editor, [source, router, editor], [
      edge('routed-editor-source', 'editor-image-router', 'input'),
      edge('editor-image-router', 'routed-editor', 'image-in'),
    ])

    expect(request).toMatchObject({
      inputPath: '/project/base.png',
      inputUrl: 'https://assets.invalid/base.png',
      inputName: 'Portrait Base',
      inputRole: 'source-image',
    })
    expect(request.connectionRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Source Image', mode: 'auto' }),
    ]))
  })

  it('preserves Router video inputs as source-video for extension and video upscaling', () => {
    const source = node('routed-video-source', 'upload', { title: 'Previous Take', assetPath: '/project/take.mp4', assetUrl: 'https://assets.invalid/take.mp4', outputType: 'video' })
    const router = node('video-router', 'router', { title: 'Video Source Route', routeSignal: 'video' })
    const extender = node('routed-extender', 'video-generator', { videoEngine: 'fal-ai/veo3.1/extend-video' })
    const upscaler = node('routed-video-upscaler', 'upscaler', { upscalerModel: 'realesrgan-video' })
    const routedNodes = [source, router, extender, upscaler]

    const extendRequest = resolveWorkflowInput(extender.id, routedNodes, [
      edge('routed-video-source', 'video-router', 'input'),
      edge('video-router', 'routed-extender', 'video-in'),
    ])
    expect(extendRequest).toMatchObject({ inputPath: '/project/take.mp4', inputUrl: 'https://assets.invalid/take.mp4', inputRole: 'source-video' })
    expect(extendRequest.connectionRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Video To Extend', mode: 'auto' }),
    ]))

    const upscaleRequest = resolveWorkflowInput(upscaler.id, routedNodes, [
      edge('routed-video-source', 'video-router', 'input'),
      edge('video-router', 'routed-video-upscaler', 'video-in'),
    ])
    expect(upscaleRequest).toMatchObject({ inputPath: '/project/take.mp4', inputUrl: 'https://assets.invalid/take.mp4', inputRole: 'source-video' })
    expect(upscaleRequest.connectionRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Video To Upscale', mode: 'auto' }),
    ]))
  })

  it('keeps routed image and video reference sockets as ordinary references', () => {
    const image = node('routed-reference-image', 'upload', { title: 'Color Guide', assetPath: '/project/color.png', outputType: 'image' })
    const imageRouter = node('reference-image-router', 'router', { routeSignal: 'image' })
    const imageTarget = node('routed-reference-target', 'image-generator', { prompt: 'Create a new portrait.' })
    const imageRequest = buildGenerationRequest(imageTarget, [image, imageRouter, imageTarget], [
      edge('routed-reference-image', 'reference-image-router', 'input'),
      edge('reference-image-router', 'routed-reference-target', 'reference-in', 'lock'),
    ])
    expect(imageRequest.inputPath).toBeUndefined()
    expect(imageRequest.inputRole).toBeUndefined()
    expect(imageRequest.references).toEqual([expect.objectContaining({ path: '/project/color.png', mediaType: 'image', role: 'reference', slot: 'reference' })])

    const video = node('routed-reference-video', 'upload', { title: 'Motion Guide', assetPath: '/project/motion.mp4', outputType: 'video' })
    const videoRouter = node('reference-video-router', 'router', { routeSignal: 'video' })
    const videoTarget = node('routed-video-reference-target', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    const videoRequest = resolveWorkflowInput(videoTarget.id, [video, videoRouter, videoTarget], [
      edge('routed-reference-video', 'reference-video-router', 'input'),
      edge('reference-video-router', 'routed-video-reference-target', 'video-reference-in', 'lock'),
    ])
    expect(videoRequest.inputPath).toBeUndefined()
    expect(videoRequest.inputRole).toBeUndefined()
    expect(videoRequest.references).toEqual([expect.objectContaining({ path: '/project/motion.mp4', mediaType: 'video', role: 'reference', slot: 'reference' })])
  })

  it('preserves controlled-FPS Wan and Veo-specific controls', () => {
    const wan = node('wan', 'video-generator', { prompt: 'Cloud shadows cross a valley.', videoEngine: 'wan-controlled', duration: 4, frameRate: 30, resolution: '580p', aspectRatio: '16:9', inferenceSteps: 64, guidanceScale: 1.2, shift: 6, acceleration: 'regular', interpolatorModel: 'rife', numInterpolatedFrames: 3, adjustFpsForInterpolation: false, videoQuality: 'maximum', videoWriteMode: 'small', enablePromptExpansion: true, enableInputSafety: false, enableOutputSafety: false, seed: 88 })
    const veo = node('veo', 'video-generator', { prompt: 'A slow reveal of a mountain observatory.', videoEngine: 'fal-ai/veo3.1', duration: 8, aspectRatio: '9:16', resolution: '4k', generateAudio: true, negativePrompt: 'text, watermark', autoFix: true, safetyTolerance: 2, seed: 7 })
    expect(buildGenerationRequest(wan, [wan], [])).toMatchObject({ duration: 4, frameRate: 30, resolution: '580p', inferenceSteps: 64, shift: 6, interpolatorModel: 'rife', numInterpolatedFrames: 3, adjustFpsForInterpolation: false, videoQuality: 'maximum', videoWriteMode: 'small', enablePromptExpansion: true, enableInputSafety: false, enableOutputSafety: false, seed: 88 })
    expect(buildGenerationRequest(veo, [veo], [])).toMatchObject({ duration: 8, aspectRatio: '9:16', resolution: '4k', generateAudio: true, negativePrompt: 'text, watermark', autoFix: true, safetyTolerance: 2, seed: 7 })
  })

  it('keeps Motion Cadence provider-effective inside every Kling storyboard shot', () => {
    const storyboard = node('cadence-storyboard', 'storyboard', { storyboardDuration: 6, storyboardPanels: [
      { id: 'cadence-shot-1', prompt: 'The paper fox looks up.', duration: 3, shotSize: 'medium', camera: 'static' },
      { id: 'cadence-shot-2', prompt: 'The paper fox walks away.', duration: 3, shotSize: 'wide', camera: 'pan-right' },
    ] })
    const video = node('cadence-kling', 'video-generator', { prompt: 'Visible handmade paper motion.', videoEngine: 'fal-ai/kling-video/v3/standard/text-to-video', duration: 6, motionCadence: 16 })
    const request = buildGenerationRequest(video, [storyboard, video], [edge('cadence-storyboard', 'cadence-kling', 'storyboard-in')])
    expect(request.multiPrompt).toHaveLength(2)
    for (const shot of request.multiPrompt || []) expect(shot.prompt.match(/MOTION CADENCE:/g)).toHaveLength(1)
  })

  it('preserves start, end, and independent references by selecting a compatible provider route', () => {
    const start = node('hybrid-start', 'upload', { title: 'Start Frame', assetPath: '/project/start.png', assetUrl: 'https://assets.invalid/start.png', outputType: 'image' })
    const end = node('hybrid-end', 'upload', { title: 'End Frame', assetPath: '/project/end.png', assetUrl: 'https://assets.invalid/end.png', outputType: 'image' })
    const character = node('hybrid-character', 'character', { title: 'Idris', referenceTag: '@idris', characterRole: 'main', referenceAssets: [asset('hybrid-idris-front', 'front'), asset('hybrid-idris-profile', 'profile')] })
    const video = node('hybrid-video', 'video-generator', { prompt: '@idris crosses the room and reaches the doorway.', videoEngine: 'fal-ai/veo3.1/first-last-frame-to-video' })
    const request = buildGenerationRequest(video, [start, end, character, video], [edge('hybrid-start', 'hybrid-video', 'image-in', 'lock'), edge('hybrid-end', 'hybrid-video', 'end-image', 'lock'), edge('hybrid-character', 'hybrid-video', 'reference-in')])
    expect(request.videoEngine).toBe('fal-ai/kling-video/o3/standard/reference-to-video')
    expect(request.inputPath).toBe('/project/start.png')
    expect(request.inputTag).toBe('@start-frame')
    expect(request.inputName).toBe('Start Frame')
    expect(request.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/project/end.png', slot: 'end' }),
      expect.objectContaining({ role: 'character', tag: '@idris', view: 'front', slot: 'reference' }),
      expect.objectContaining({ role: 'character', tag: '@idris', view: 'profile', slot: 'reference' }),
    ]))
    const preview = providerPromptPreview(request)
    expect(preview).toContain('@Element1 = @idris (character authority)')
    expect(preview).toContain('@start-frame — Starting Frame: Start Frame')
    expect(preview).toContain('@end-frame matches the reference in every appearance.')
    expect(preview).toContain('Use @idris as Idris.')
    expect(preview).not.toContain('Narrative Role:')
  })

  it('preserves several character identities without permanent narrative roles', () => {
    const main = node('main-character', 'character', { title: 'Idris', referenceTag: '@idris', characterRole: 'main', referenceAssets: [asset('idris-front', 'front')] })
    const extra = node('extra-character', 'character', { title: 'Dock Worker', referenceTag: '@dock-worker', characterRole: 'extra', referenceAssets: [asset('worker-front', 'front')] })
    const video = node('cast-video', 'video-generator', { prompt: '@idris crosses the dock while @dock-worker remains behind him.', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' })
    const castEdges = [edge('main-character', 'cast-video', 'reference-in'), edge('extra-character', 'cast-video', 'reference-in')]
    const preview = providerPromptPreview(buildGenerationRequest(video, [main, extra, video], castEdges))
    expect(preview).toContain('Only 2 people appear.')
    expect(preview).toContain('@idris matches the reference in every appearance.')
    expect(preview).toContain('@dock-worker matches the reference in every appearance.')
    expect(preview).not.toContain('Narrative Role:')
    const undefinedExtra = { ...extra, data: { ...extra.data, characterRole: 'unspecified' as const } }
    expect(() => buildGenerationRequest(video, [main, undefinedExtra, video], castEdges)).not.toThrow()
    const secondMain = { ...extra, data: { ...extra.data, characterRole: 'main' as const } }
    expect(() => buildGenerationRequest(video, [main, secondMain, video], castEdges)).not.toThrow()
  })

  it('X-rays the maximal frame-anchored Kling topology without misusing audio or losing storyboard semantics', () => {
    const prompt = node('kmax-prompt', 'prompt', { title: 'Frame Action', prompt: 'The courier moves screen-left to screen-right, opens the marked case, and keeps it open through the final frame.' })
    const start = node('kmax-start', 'upload', { title: 'Opening Frame', assetPath: '/project/kling-start.png', outputType: 'image' })
    const end = node('kmax-end', 'upload', { title: 'Closing Frame', assetPath: '/project/kling-end.png', outputType: 'image' })
    const character = node('kmax-character', 'character', { title: 'Courier', referenceTag: '@courier', referenceAssets: [asset('kmax-courier-front', 'front'), asset('kmax-courier-full-body', 'full-body')] })
    const element = node('kmax-element', 'element', { title: 'Marked Case', referenceTag: '@marked-case', referenceAssets: [asset('kmax-case')] })
    const location = node('kmax-location', 'location', { title: 'Platform', referenceTag: '@platform', referenceAssets: [asset('kmax-platform')] })
    const style = node('kmax-style', 'style-reference', { title: 'Night Texture', referenceTag: '@night-texture', stylePrompt: 'Wet practical night lighting with restrained cyan and natural skin.', referenceAssets: [asset('kmax-night-texture')] })
    const storyboard = node('kmax-story', 'storyboard', { title: 'Kling Storyboard', storyboardDuration: 6, outputPath: '/project/kling-storyboard.png', outputType: 'image', referenceTag: '@kling-storyboard', storyboardPanels: [
      { id: 'kmax-a', prompt: 'The courier approaches the case without changing travel direction.', duration: 3, shotSize: 'medium', camera: 'tracking' },
      { id: 'kmax-b', prompt: 'The case opens and remains open as the courier reaches the closing composition.', duration: 3, shotSize: 'close-up', camera: 'pull-out' },
    ] })
    const motion = node('kmax-motion', 'output', { title: 'Tracking Motion', outputPath: '/project/kling-motion.mp4', outputType: 'video' })
    const motionList = node('kmax-motion-list', 'list', { listSignal: 'video' })
    const video = node('kmax-video', 'video-generator', { prompt: 'Keep causal state and physical direction continuous.', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video', duration: 6, negativePrompt: 'identity blend, closed case after opening' })
    const localNodes = [prompt, start, end, character, element, location, style, storyboard, motion, motionList, video]
    const localEdges = [
      edge('kmax-prompt', 'kmax-video', 'text-in'),
      edge('kmax-character', 'kmax-video', 'reference-in'),
      edge('kmax-element', 'kmax-video', 'reference-in'),
      edge('kmax-location', 'kmax-video', 'reference-in'),
      edge('kmax-style', 'kmax-story', 'style-in'),
      edge('kmax-story', 'kmax-video', 'storyboard-in'),
      edge('kmax-start', 'kmax-video', 'image-in', 'lock'),
      edge('kmax-end', 'kmax-video', 'end-image', 'lock'),
      edge('kmax-motion', 'kmax-motion-list', 'input'),
      edge('kmax-motion-list', 'kmax-video', 'video-reference-in'),
    ]
    const request = buildGenerationRequest(video, localNodes, localEdges)
    const preview = providerPromptPreview(request)
    expect(request.inputPath).toBe('/project/kling-start.png')
    expect(request.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/project/kling-end.png', slot: 'end' }),
      expect.objectContaining({ path: '/project/kling-storyboard.png', role: 'storyboard', authority: 'storyboard-map' }),
      expect.objectContaining({ path: '/project/kling-motion.mp4', mediaType: 'video', authority: 'motion-camera' }),
      expect.objectContaining({ role: 'character', tag: '@courier' }),
      expect.objectContaining({ role: 'element', tag: '@marked-case' }),
      expect.objectContaining({ role: 'location', tag: '@platform' }),
      expect.objectContaining({ role: 'style', tag: '@night-texture' }),
    ]))
    expect(preview).toContain('KLING REFERENCE MAP:')
    expect(preview).toContain('Controls shot order, editorial map, composition and continuity only')
    expect(preview).toContain('Camera geometry, path and speed curve only')
    expect(preview).toContain('FIRST FRAME')
    expect(preview).toContain('@closing-frame matches the reference in every appearance.')
    expect(preview).toContain('POSITIVE LOCKS')
    expect(preview.match(/Wet practical night lighting with restrained cyan and natural skin\./g)).toHaveLength(1)
    expect(request.references?.some((reference) => reference.mediaType === 'audio')).toBe(false)
  })

  it('assigns role-specific hard rules to prompt, source image, extend video, and audio reference inputs exactly once', () => {
    const prompt = node('connected-prompt', 'prompt', { title: 'Action Brief', prompt: 'Keep the action restrained and physically plausible.' })
    const image = node('connected-image', 'upload', { title: 'Portrait Base', assetPath: '/project/base.png', outputType: 'image' })
    const videoSource = node('connected-video', 'output', { title: 'Previous Take', outputPath: '/project/take.mp4', outputType: 'video' })
    const audioSource = node('connected-audio', 'output', { title: 'Dialogue Timing', outputPath: '/project/dialogue.wav', outputType: 'audio' })
    const editor = node('connected-editor', 'image-editor', { prompt: 'Change only the jacket color.' })
    const extender = node('connected-extender', 'video-generator', { prompt: 'Continue the walk into the doorway.', videoEngine: 'fal-ai/veo3.1/extend-video' })
    const referenceVideo = node('connected-reference-video', 'video-generator', { prompt: 'Animate a quiet conversation.', videoEngine: 'bytedance/seedance-2.0/reference-to-video' })

    const editorRequest = buildGenerationRequest(editor, [image, editor], [edge('connected-image', 'connected-editor', 'image-in', 'lock')])
    expect(editorRequest.inputRole).toBe('source-image')
    expect(editorRequest.connectionRules).toEqual([expect.objectContaining({ label: 'Source Image', mode: 'lock', rule: expect.stringContaining('locked base image') })])

    const extendRequest = buildGenerationRequest(extender, [prompt, videoSource, extender], [edge('connected-prompt', 'connected-extender', 'text-in'), edge('connected-video', 'connected-extender', 'video-in', 'lock')])
    expect(extendRequest.inputRole).toBe('source-video')
    expect(extendRequest.connectionRules).toEqual(expect.arrayContaining([expect.objectContaining({ tag: '@action-brief', label: 'Prompt' }), expect.objectContaining({ tag: '@previous-take', label: 'Video To Extend' })]))
    const extendPreview = providerPromptPreview(extendRequest)
    expect(extendPreview).toContain('Video To Extend')

    const audioRequest = buildGenerationRequest(referenceVideo, [audioSource, referenceVideo], [edge('connected-audio', 'connected-reference-video', 'audio-reference-in')])
    expect(audioRequest.connectionRules).toEqual([expect.objectContaining({ tag: '@dialogue-timing', label: 'Audio Reference', rule: expect.stringContaining('never reinterpret it as visual content') })])
  })

  it('routes Guide as a repairable reference and Lock as the provider frame anchor', () => {
    const frame = node('fidelity-frame', 'upload', { title: 'Pixelated Opening', assetPath: '/project/pixelated.png', outputType: 'image' })
    const video = node('fidelity-video', 'video-generator', { prompt: 'A cyclist rides away from the camera.', videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video' })
    const guide = buildGenerationRequest(video, [frame, video], [edge('fidelity-frame', 'fidelity-video', 'image-in', 'guide')])
    expect(guide.inputPath).toBeUndefined()
    expect(guide.references).toEqual([expect.objectContaining({ path: '/project/pixelated.png', slot: 'reference' })])
    expect(guide.connectionRules).toEqual([expect.objectContaining({ mode: 'guide', rule: expect.stringContaining('loose opening-state guidance') })])
    const automatic = buildGenerationRequest(video, [frame, video], [edge('fidelity-frame', 'fidelity-video', 'image-in', 'auto')])
    expect(automatic.inputPath).toBeUndefined()
    expect(automatic.references).toEqual([expect.objectContaining({ path: '/project/pixelated.png', slot: 'start' })])
    expect(automatic.connectionRules).toEqual([expect.objectContaining({ tag: '@pixelated-opening', mode: 'auto', rule: expect.stringContaining('automatically repairing pixelation') })])
    const lock = buildGenerationRequest(video, [frame, video], [edge('fidelity-frame', 'fidelity-video', 'image-in', 'lock')])
    expect(lock.inputPath).toBe('/project/pixelated.png')
    expect(lock.inputRole).toBe('start-frame')
    expect(lock.connectionRules).toEqual([expect.objectContaining({ mode: 'lock', rule: expect.stringContaining('pixel-for-pixel') })])
  })

  it('promotes prompt-sensitive Auto artwork to deterministic lock metadata', () => {
    const artwork = node('exact-artwork', 'upload', { title: 'Analisa', referenceTag: '@analisa', assetPath: '/project/analisa.png', outputType: 'image' })
    const image = node('exact-image', 'image-generator', { prompt: 'Place @analisa on the lowest placard exactly unmodified with its original letterforms and layout intact.' })
    const request = buildGenerationRequest(image, [artwork, image], [edge('exact-artwork', 'exact-image', 'reference-in', 'auto')])
    expect(request.connectionRules).toEqual([expect.objectContaining({ mode: 'auto', rule: expect.stringContaining('AUTO → PRESERVE RULE') })])
    expect(request.references).toEqual([expect.objectContaining({ tag: '@analisa', fidelity: 'lock' })])
  })

  it('resolves Prompt, Router, media List, unified Storyboard, Style, and Video together', () => {
    const auditNodes = [
      node('audit-prompt', 'prompt', { title: 'Courier Brief', prompt: 'A courier reaches the lighthouse before sunrise.' }),
      node('audit-router', 'router', { routeSignal: 'text' }),
      node('audit-image', 'image-generator', { title: 'Signal Reference', generatedResults: [{ path: '/project/signal.png', url: 'file:///project/signal.png', type: 'image', modelId: 'fal-ai/flux/schnell' }], quantity: 1, outputType: 'image' }),
      node('audit-list', 'list', { listSignal: 'image' }),
      node('audit-style', 'style-reference', { title: 'Noir Dawn', referenceTag: '@noir-dawn', stylePrompt: 'Cool dawn haze, restrained monochrome palette, practical lighthouse glow.' }),
      node('audit-story', 'storyboard', { storyboardDuration: 6, storyboardPanels: [{ id: 'a', prompt: 'Courier enters frame.', duration: 3, shotSize: 'wide', camera: 'tracking' }, { id: 'b', prompt: 'Signal lamp turns green.', duration: 3, shotSize: 'detail', camera: 'rack-focus-near' }] }),
      node('audit-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video', duration: 6 }),
    ]
    const auditEdges = [
      edge('audit-prompt', 'audit-router', 'input'),
      edge('audit-router', 'audit-video', 'text-in'),
      edge('audit-image', 'audit-list', 'input'),
      edge('audit-style', 'audit-story', 'style-in'),
      edge('audit-story', 'audit-video', 'storyboard-in'),
      edge('audit-list', 'audit-video', 'reference-in'),
    ]
    const request = buildGenerationRequest(auditNodes.at(-1)!, auditNodes, auditEdges)
    expect(request.prompt).toContain('courier reaches the lighthouse')
    expect(request.references).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/project/signal.png', role: 'reference' })]))
    expect(request.prompt).not.toContain('Cool dawn haze')
    expect(request.stylePrompt).toContain('Cool dawn haze')
    expect(providerPromptPreview(request).match(/Cool dawn haze/g)).toHaveLength(1)
    expect(request.prompt).toContain('Courier enters frame')
  })

  it('keeps edited Storyboard structure downstream while withholding its stale compiled sheet', () => {
    const storyboard = node('stale-story', 'storyboard', { title: 'stale-story', referenceTag: '@stale-story', storyboardNeedsCompile: true, outputPath: '/project/stale-sheet.png', outputType: 'image', storyboardDuration: 4, storyboardPanels: [
      { id: 'stale-a', prompt: 'The revised opening shot.', duration: 4, shotSize: 'wide', camera: 'static' },
    ] })
    const video = node('stale-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    const request = buildGenerationRequest(video, [storyboard, video], [edge('stale-story', 'stale-video', 'storyboard-in')])
    expect(request.prompt).toContain('The revised opening shot')
    expect(request.references).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: '/project/stale-sheet.png' })]))
  })

  it('rejects an illogical connection anywhere upstream, not only on the final generator', () => {
    const audio = node('bad-audio', 'output', { outputPath: '/project/dialogue.wav', outputType: 'audio' })
    const imageEditor = node('bad-image-editor', 'image-editor', { outputType: 'image' })
    const video = node('bad-video', 'video-generator', { prompt: 'Test.', videoEngine: 'bytedance/seedance-2.0/reference-to-video' })
    expect(() => buildGenerationRequest(video, [audio, imageEditor, video], [edge('bad-audio', 'bad-image-editor', 'image-in'), edge('bad-image-editor', 'bad-video', 'reference-in')])).toThrow('Audio can connect only')
  })

  it('X-rays provider-native Kling shots with global Style and reference authority exactly once', () => {
    const request = buildGenerationRequest(nodes.find((candidate) => candidate.id === 'video')!, nodes, edges)
    const shots = klingStoryboardPrompts(request, '\n\nKLING REFERENCE MAP:\n@Test') || []
    expect(shots).toHaveLength(4)
    for (const shot of shots) {
      expect(shot.prompt).toContain('LOOK-ONLY KODAK AUTHORITY')
      expect(shot.prompt.match(/LOOK-ONLY KODAK AUTHORITY/g)).toHaveLength(1)
      expect(shot.prompt).toContain('Use @idris as Idris.')
      expect(shot.prompt).toContain('Use @cliff-workshop for the location')
      expect(shot.prompt).toContain('Use @brass-compass for the element')
      expect(shot.prompt.match(/ACTIVE REFERENCES/g)).toHaveLength(1)
      expect(shot.prompt.match(/KLING REFERENCE MAP:/g)).toHaveLength(1)
    }
    expect(shots[0].prompt).toContain('Descend on a coherent jib arc')
    expect(shots[0].prompt).not.toContain('6 m/s')
    expect(shots[3].prompt).toContain('Move physically away from the subject')
  })

  it('X-rays a maximal Seedance graph without losing image, video, audio, semantic, Style, or Storyboard roles', () => {
    const canonical = node('max-canonical', 'prompt', { title: 'Canonical Direction', prompt: `ASSISTANT TASK: Execute one coherent cinematic repair sequence.
REFERENCE AUTHORITY: Keep every connected source inside its assigned domain.
CAMERA AND LENS: A physical dolly on a 40mm spherical lens; preserve screen-left to screen-right travel.
LIGHTING AND LOOK: Cool dawn window light, restrained contrast, fine practical texture.
STATE LEDGER: The compass begins open with its loose gear on the bench; after Idris reseats it, the gear remains attached and the needle remains active.
FINAL ACCEPTANCE: Idris, compass geometry, travel direction, repair outcome, and final doorway composition all remain continuous.
HARD AVOID: no identity drift, impossible hand geometry, state reset, text, logo, subtitle, or watermark.` })
    const routers = Array.from({ length: 15 }, (_, index) => node(`max-router-${index + 1}`, 'router', { title: `Max Router ${index + 1}`, routeSignal: 'text' }))
    const visual = node('max-visual', 'upload', { title: 'Opening Guide', assetPath: '/project/opening.png', outputType: 'image' })
    const generatedImage = node('max-generated-image', 'image-generator', { title: 'Generated Prop Guide', generatedResults: [{ path: '/project/generated-prop.png', url: 'file:///project/generated-prop.png', type: 'image', modelId: 'fal-ai/flux/schnell' }], outputType: 'image' })
    const upscaledImage = node('max-upscaled-image', 'upscaler', { title: 'Upscaled Surface Guide', generatedResults: [{ path: '/project/upscaled-surface.png', url: 'file:///project/upscaled-surface.png', type: 'image', modelId: 'fal-ai/esrgan' }], outputType: 'image' })
    const motion = node('max-motion', 'output', { title: 'Motion Guide', outputPath: '/project/motion.mp4', outputType: 'video' })
    const generatedMotion = node('max-generated-motion', 'video-generator', { title: 'Generated Camera Guide', generatedResults: [{ path: '/project/generated-camera.mp4', url: 'file:///project/generated-camera.mp4', type: 'video', modelId: 'fal-ai/kling-video' }], outputType: 'video' })
    const dialogue = node('max-dialogue', 'voiceover', { title: 'Dialogue Guide', generatedResults: [{ path: '/project/dialogue.wav', url: 'file:///project/dialogue.wav', type: 'audio', modelId: 'elevenlabs/tts' }], outputType: 'audio' })
    const soundEffects = node('max-sound-effects', 'sound-effects', { title: 'Sound Guide', generatedResults: [{ path: '/project/sound-effects.wav', url: 'file:///project/sound-effects.wav', type: 'audio', modelId: 'elevenlabs/sound-effects' }], outputType: 'audio' })
    const uploadedAudio = node('max-uploaded-audio', 'upload', { title: 'Rhythm Guide', assetPath: '/project/rhythm.wav', outputType: 'audio' })
    const imageList = node('max-image-list', 'list', { title: 'Image References', listSignal: 'image' })
    const videoList = node('max-video-list', 'list', { title: 'Video References', listSignal: 'video' })
    const audioList = node('max-audio-list', 'list', { title: 'Audio References', listSignal: 'audio' })
    const character = node('max-character', 'character', { title: 'Idris', referenceTag: '@idris', characterRole: 'main', referenceAssets: [asset('max-idris-front', 'front'), asset('max-idris-full-body', 'full-body')] })
    const location = node('max-location', 'location', { title: 'Workshop', referenceTag: '@workshop', referenceAssets: [asset('max-workshop')] })
    const element = node('max-element', 'element', { title: 'Compass', referenceTag: '@compass', referenceAssets: [asset('max-compass')] })
    const style = node('max-style', 'style-reference', { title: 'Grounded Film', referenceTag: '@grounded-film', stylePrompt: 'Grounded practical lighting, restrained color, natural texture.', referenceAssets: [asset('max-style-guide')] })
    const storyboard = node('max-storyboard', 'storyboard', { title: 'Repair Story', storyboardDuration: 8, outputPath: '/project/repair-storyboard.png', outputUrl: 'file:///project/repair-storyboard.png', outputType: 'image', referenceTag: '@repair-storyboard', storyboardPanels: [
      { id: 'max-one', prompt: 'Idris studies the compass at the bench.', duration: 4, shotSize: 'medium', camera: 'dolly-in', audioCue: 'quiet dialogue begins' },
      { id: 'max-two', prompt: 'The compass needle aligns with the doorway.', duration: 4, shotSize: 'detail', camera: 'rack-focus-far', audioCue: 'metal click' },
    ] })
    const video = node('max-video', 'video-generator', { prompt: 'Preserve a single continuous repair action.', videoEngine: 'bytedance/seedance-2.0/reference-to-video', duration: 8, aspectRatio: '21:9', resolution: '1080p', generateAudio: true, bitrateMode: 'high', seed: 73, negativePrompt: 'duplicate people, malformed hands' })
    const maxNodes = [canonical, ...routers, visual, generatedImage, upscaledImage, motion, generatedMotion, dialogue, soundEffects, uploadedAudio, imageList, videoList, audioList, character, location, element, style, storyboard, video]
    const routedEdges: Edge[] = [canonical, ...routers].slice(0, -1).map((current, index) => ({
      id: `max-route-${index + 1}`,
      source: current.id,
      sourceHandle: current.data.kind === 'prompt' ? 'text-out' : 'output',
      target: routers[index].id,
      targetHandle: 'input',
    }))
    const maxEdges = [
      ...routedEdges,
      { id: 'max-route-video', source: routers.at(-1)!.id, sourceHandle: 'output', target: 'max-video', targetHandle: 'text-in' },
      edge('max-visual', 'max-image-list', 'input'),
      edge('max-generated-image', 'max-image-list', 'input'),
      edge('max-upscaled-image', 'max-image-list', 'input'),
      edge('max-motion', 'max-video-list', 'input'),
      edge('max-generated-motion', 'max-video-list', 'input'),
      edge('max-dialogue', 'max-audio-list', 'input'),
      edge('max-sound-effects', 'max-audio-list', 'input'),
      edge('max-uploaded-audio', 'max-audio-list', 'input'),
      edge('max-character', 'max-storyboard', 'character-in'),
      edge('max-location', 'max-storyboard', 'location-in'),
      edge('max-element', 'max-storyboard', 'element-in'),
      edge('max-style', 'max-storyboard', 'style-in'),
      edge('max-storyboard', 'max-video', 'storyboard-in'),
      edge('max-character', 'max-video', 'character-in'),
      edge('max-location', 'max-video', 'location-in'),
      edge('max-element', 'max-video', 'element-in'),
      edge('max-style', 'max-video', 'style-in'),
      edge('max-image-list', 'max-video', 'reference-in'),
      edge('max-video-list', 'max-video', 'video-reference-in'),
      edge('max-audio-list', 'max-video', 'audio-reference-in'),
    ]
    const request = buildGenerationRequest(video, maxNodes, maxEdges)
    const preview = providerPromptPreview(request)
    expect(request).toMatchObject({ duration: 8, aspectRatio: '21:9', resolution: '1080p', generateAudio: true, bitrateMode: 'high', seed: 73, negativePrompt: 'duplicate people, malformed hands' })
    expect(request.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: '@idris', role: 'character', mediaType: 'image' }),
      expect.objectContaining({ tag: '@workshop', role: 'location', mediaType: 'image' }),
      expect.objectContaining({ tag: '@compass', role: 'element', mediaType: 'image' }),
      expect.objectContaining({ path: '/project/opening.png', mediaType: 'image' }),
      expect.objectContaining({ path: '/project/generated-prop.png', mediaType: 'image', authority: 'appearance' }),
      expect.objectContaining({ path: '/project/upscaled-surface.png', mediaType: 'image', authority: 'appearance' }),
      expect.objectContaining({ path: '/project/motion.mp4', mediaType: 'video', authority: 'motion-camera' }),
      expect.objectContaining({ path: '/project/generated-camera.mp4', mediaType: 'video', authority: 'motion-camera' }),
      expect.objectContaining({ path: '/project/dialogue.wav', mediaType: 'audio', authority: 'audio-timing' }),
      expect.objectContaining({ path: '/project/sound-effects.wav', mediaType: 'audio', authority: 'audio-timing' }),
      expect.objectContaining({ path: '/project/rhythm.wav', mediaType: 'audio', authority: 'audio-timing' }),
      expect.objectContaining({ path: '/project/repair-storyboard.png', mediaType: 'image', role: 'storyboard', authority: 'storyboard-map' }),
    ]))
    expect(preview).toContain('REFERENCE AUTHORITY')
    expect(preview).toContain('@repair-storyboard — storyboard.')
    expect(preview).toContain('Use @idris as Idris.')
    expect(preview).toContain('Use @workshop for the location')
    expect(preview).toContain('Use @compass for the element')
    expect(preview.match(/Use @idris as Idris\./g)).toHaveLength(1)
    expect(preview.match(/Use @workshop for the location\./g)).toHaveLength(1)
    expect(preview.match(/Use @compass for the element\./g)).toHaveLength(1)
    expect(preview).not.toMatch(/@Image\d+/)
    expect(preview.match(/Grounded practical lighting, restrained color, natural texture\./g)).toHaveLength(1)
    expect(preview).toContain('motion reference')
    expect(preview).toContain('audio reference')
    expect(preview).toContain('@repair-storyboard — storyboard.')
    expect(preview).toContain('Controls shot order, editorial map, composition and continuity only; sheet layout not rendered.')
    expect(preview).toContain('FINAL-FRAME AND OUTPUT HARD GATE')
    expect(preview).toContain('Hard cuts occur only at Storyboard boundaries selected Cut.')
    expect(preview).toContain('Continue boundaries remain one uninterrupted take')
    expect(preview).toContain('STATE LEDGER: The compass begins open')
    expect(preview.match(/STATE LEDGER: The compass begins open/g)).toHaveLength(1)
    expect(preview).toContain('Authored camera and lens: A physical dolly on a 40mm spherical lens')
    expect(preview.match(/^ASSISTANT TASK$/gm)).toHaveLength(1)
    expect(preview.match(/FINAL-FRAME AND OUTPUT HARD GATE/g)).toHaveLength(1)
    expect(preview.match(/Grounded practical lighting/g)?.length).toBeGreaterThanOrEqual(1)
    expect(preview).toContain('Dolly physically toward the subject')
    expect(preview).not.toContain('6 m/s')
    expect(preview).toContain('Shift the focus plane from the nearer subject to the farther subject')
  })

  it('preserves more than six edited panels in the draft while blocking unsupported native shot count', () => {
    const eightPanels = Array.from({ length: 8 }, (_, index) => ({ id: `k${index}`, prompt: `Shot ${index + 1}`, duration: 1, shotSize: 'auto' as const, camera: 'auto' }))
    const eightStory = node('eight-story', 'storyboard', { storyboardDuration: 8, storyboardPanels: eightPanels })
    const kling = node('twenty-capable', 'video-generator', { videoEngine: 'fal-ai/kling-video/o3/standard/text-to-video', duration: 8 })
    const request = buildGenerationRequest(kling, [eightStory, kling], [edge('eight-story', 'twenty-capable', 'storyboard-in')])
    expect(request.storyboardShots).toHaveLength(8)
    expect(request.multiPrompt).toHaveLength(8)
    expect(generationRequirementFailures(request)).toEqual(expect.arrayContaining([expect.stringContaining('supports 1–6 shots')]))
  })

  it('preserves optional typed continuity fields from panels into the generation request', () => {
    const board = node('typed-board', 'storyboard', {
      storyboardPanels: [{
        id: 'restaurant-1', prompt: 'Owner works off camera.', duration: 2,
        continuityGroupId: 'restaurant', activeCharacterTags: ['@owner', '@cook-one'], excludedCharacterTags: ['@outsider'],
        characterStates: [{ characterTag: '@owner', worldPosition: 'chef-side', visibility: 'sharp-foreground' }],
        characterStateDeltas: [{ characterTag: '@cook-one', visibility: 'off-camera' }],
        stateAuthorities: [{ authorityTag: '@reduced-meal', scope: 'post-cut', state: 'reduced meal directly before owner' }],
        dialogueSpans: [{ id: 'order-line', speakerTag: '@owner', text: 'Order up.', startPanelId: 'restaurant-1', endPanelId: 'restaurant-1' }],
      }],
    })
    const video = node('typed-video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 2 })
    const request = buildGenerationRequest(video, [board, video], [edge('typed-board', 'typed-video', 'storyboard-in')])

    expect(request.storyboardShots?.[0]).toMatchObject({
      continuityGroupId: 'restaurant', activeCharacterTags: ['@owner', '@cook-one'], excludedCharacterTags: ['@outsider'],
      characterStates: [{ characterTag: '@owner', worldPosition: 'chef-side', visibility: 'sharp-foreground' }],
      characterStateDeltas: [{ characterTag: '@cook-one', visibility: 'off-camera' }],
      stateAuthorities: [{ authorityTag: '@reduced-meal', scope: 'post-cut' }],
      dialogueSpans: [{ id: 'order-line', text: 'Order up.' }],
    })
  })
})
