import { referenceIntroductionLine } from './assetReferenceDescriptions'
import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { buildGenerationRequest } from './workflowResolver'
import { connectionCompatibilityError, compatibleNodeSources } from './nodeConnections'
import { compileProviderPromptForSubmission, orderedProviderImageReferences, providerPromptPreview, providerSeedancePayloadCompilation } from './referenceInstructions'
import { NODE_PALETTE } from '../renderer/src/nodePalette'
import { generationRequirementFailures } from './generationReadiness'

const node = (id: string, kind: StudioNode['data']['kind'], data: Partial<StudioNode['data']> = {}): StudioNode => ({
  id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...data },
})
const asset = (id: string) => ({ id, name: `${id}.png`, path: `/fixture/${id}.png`, mimeType: 'image/png', createdAt: '', metadata: { referenceDescription: 'Authored fixture reference purpose.' } })
const edge = (source: string, target: string, targetHandle: string, sourceHandle = 'media-out'): Edge => ({
  id: `${source}-${target}-${targetHandle}`, source, target, sourceHandle, targetHandle,
})

function pipelineFixture() {
  const wardrobe = node('coat', 'wardrobe', { referenceTag: '@coat', referenceAssets: [asset('coat')], appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement' })
  const prop = node('case', 'element', { referenceTag: '@case', referenceDescription: 'The case carried by Maya; sole prop-design reference.', referenceAssets: [asset('case')] })
  const character = node('maya', 'character', { title: 'Maya', referenceTag: '@maya', characterAuthorityMode: 'identity-body-with-layers', referenceAssets: [asset('maya')] })
  const location = node('station', 'location', { referenceTag: '@station', referenceAssets: [asset('station')] })
  const style = node('look', 'style-reference', { referenceTag: '@look', styleSavedAt: '2026-10-09', stylePrompt: 'Authored muted copper photography.' })
  const panels = [
    { id: 's1', prompt: '@maya wearing @coat carries @case into @station.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' },
    { id: 's2', prompt: '@maya places @case on the counter.', duration: 1.5, shotSize: 'medium', camera: 'static', transitionToNext: 'continue' },
    { id: 's3', prompt: '@maya keeps her right hand on the case latch.', duration: 2, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut' },
    { id: 's4', prompt: '@maya says “Tunggu di sini.” without moving the case.', duration: 1.5, shotSize: 'close-up', camera: 'static', transitionToNext: 'hard-cut' },
    { id: 's5', prompt: '@maya turns toward the platform; @case stays on the counter.', duration: 3, shotSize: 'wide', camera: 'static' },
  ] as const
  const storyboard = node('board', 'storyboard', { storyboardDuration: 10, storyboardPanels: panels.map((panel) => ({ ...panel })) })
  const video = node('video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 10, promptMode: 'auto', resolution: '720p' })
  const nodes = [wardrobe, prop, character, location, style, storyboard, video]
  const edges = [edge('coat', 'maya', 'wardrobe-in'), edge('case', 'maya', 'element-in'), edge('maya', 'station', 'character-in'), edge('station', 'board', 'location-in'), edge('look', 'video', 'style-in'), edge('board', 'video', 'storyboard-in')]
  return { nodes, edges, video, panels }
}

describe('ordered semantic production pipeline', () => {
  it('offers typed Props to Character and Character to Location while rejecting mismatched semantic roles', () => {
    expect(compatibleNodeSources({ kind: 'character' }, 'element-in')).toContain('element')
    expect(compatibleNodeSources({ kind: 'location' }, 'character-in')).toContain('character')
    expect(connectionCompatibilityError({ kind: 'location' }, { kind: 'character' }, 'media-out', 'element-in')).not.toBeNull()
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, { kind: 'location' }, 'media-out', 'character-in')).not.toBeNull()
  })

  it.each([['video', 'video-reference-in', 'motion-camera'], ['audio', 'audio-reference-in', 'audio-timing']] as const)(
    'preserves the final %s reference domain through fifteen Routers', (mediaType, targetHandle, authority) => {
      const { nodes, edges, video } = pipelineFixture()
      const source = node('routed-media', 'upload', { assetPath: `/fixture/reference.${mediaType === 'video' ? 'mp4' : 'wav'}`, outputType: mediaType })
      const routers = Array.from({ length: 15 }, (_, index) => node(`route-${index}`, 'router', { routeSignal: mediaType }))
      nodes.push(source, ...routers)
      const chain = [source, ...routers]
      edges.push(...chain.slice(0, -1).map((item, index) => edge(item.id, chain[index + 1].id, 'input', item.data.kind === 'router' ? 'output' : 'media-out')),
        edge(routers.at(-1)!.id, 'video', targetHandle, 'output'))
      const request = buildGenerationRequest(video, nodes, edges)
      const media = request.references?.filter((reference) => reference.mediaType === mediaType)
      expect(media).toHaveLength(1)
      expect(media![0]).toMatchObject({ authority, path: source.data.assetPath })
      expect(generationRequirementFailures(request)).toEqual([])
      expect(providerSeedancePayloadCompilation(request).text).toContain(mediaType === 'video' ? '@Video1' : '@Audio1')
    },
  )

  it('carries Wardrobe and Props through Character, Location and Storyboard into one generation', () => {
    const { nodes, edges, video, panels } = pipelineFixture()
    for (const connection of edges) {
      expect(connectionCompatibilityError(nodes.find((item) => item.id === connection.source)!.data, nodes.find((item) => item.id === connection.target)!.data, connection.sourceHandle, connection.targetHandle)).toBeNull()
    }
    const request = buildGenerationRequest(video, nodes, edges)
    expect(request.references?.map((reference) => reference.tag)).toEqual(['@coat', '@case', '@maya', '@station'])
    expect(request.references?.find((reference) => reference.tag === '@coat')).toMatchObject({ role: 'wardrobe', boundCharacterTag: '@maya', appearanceScope: 'wardrobe' })
    expect(request.references?.find((reference) => reference.tag === '@case')).toMatchObject({ role: 'element', boundCharacterTag: '@maya' })
    expect(generationRequirementFailures(request)).toEqual([])
    const visible = providerPromptPreview(request)
    expect(visible).toContain("Use @coat for @maya's wardrobe.")
    expect(visible).toContain(referenceIntroductionLine(request.references!.find(reference => reference.tag === '@case')!)!)
    expect(visible).toContain('Use @maya as Maya.')
    expect(visible).toContain(referenceIntroductionLine(request.references!.find(reference => reference.tag === '@station')!)!)
    expect(visible).toContain('Authored muted copper photography.')
    expect(visible).toContain('FOUR SHOTS, THREE HARD CUTS, 10s TOTAL')
    expect(visible.match(/^HARD CUT\.$/gm)).toHaveLength(3)
    expect(visible).toContain('“Tunggu di sini.”')
    expect(visible.match(/^NEGATIVE PROMPT$/gm)).toHaveLength(1)
    expect(compileProviderPromptForSubmission(request).text).toBe(visible)
    const expectedPayload = visible.replaceAll('@coat', '@Image1').replaceAll('@case', '@Image2').replaceAll('@maya', '@Image3').replaceAll('@station', '@Image4')
    expect(providerSeedancePayloadCompilation(request).text).toBe(expectedPayload)
    expect(request.resolution).toBe('720p')
    expect(nodes.find((item) => item.id === 'board')!.data.storyboardPanels).toEqual(panels)
    const creation = buildGenerationRequest(nodes.find((item) => item.id === 'maya')!, nodes, edges)
    expect(creation.semanticAssetCreation).toEqual({ kind: 'character', tag: '@maya' })
    expect(orderedProviderImageReferences(creation).map((reference) => reference.tag)).toEqual(['@coat', '@case'])
    const sceneCreation = buildGenerationRequest(nodes.find((item) => item.id === 'station')!, nodes, edges)
    expect(orderedProviderImageReferences(sceneCreation).map((reference) => reference.tag)).toEqual(['@coat', '@case', '@maya'])
  })

  it('combines the semantic chain with image generation/edit/upscale, video, audio, List, Router and Gallery branches', () => {
    const { nodes, edges, video } = pipelineFixture()
    nodes.push(
      node('prompt', 'prompt', { prompt: 'Keep the authored station sequence.' }),
      node('text-route', 'router', { routeSignal: 'text' }),
      node('image', 'image-generator', { prompt: 'Create a station notice.', outputPath: '/fixture/image.png', outputType: 'image' }),
      node('edit', 'image-editor', { referenceDescription: 'The station notice with its approved border.', prompt: 'Change only the notice border.', outputPath: '/fixture/edit.png', outputType: 'image' }),
      node('upscale', 'upscaler', { referenceDescription: 'The station notice appearance reference.', outputPath: '/fixture/upscale.png', outputType: 'image', scale: 2 }),
      node('image-list', 'list', { listSignal: 'image' }),
      node('clip', 'upload', { title: 'Motion Clip', assetPath: '/fixture/clip.mp4', outputType: 'video' }),
      node('video-route', 'router', { routeSignal: 'video' }),
      node('voice', 'voiceover', { referenceDescription: 'Maya’s authored speech and its timing.', prompt: 'Tunggu di sini.', outputPath: '/fixture/voice.wav', outputType: 'audio' }),
      node('sfx', 'sound-effects', { referenceDescription: 'The sound of the case latch clicking.', prompt: 'Case latch click.', outputPath: '/fixture/sfx.wav', outputType: 'audio' }),
      node('music', 'music-generator', { musicVersion: 1, audioProvider: 'elevenlabs', musicModelId: 'music_v2_5', musicGenerationMode: 'prompt', musicSeconds: '3', prompt: '  Authored beat\r\nPulse  ', referenceDescription: 'The authored Music beat and timing.', outputPath: '/fixture/music.mp3', outputType: 'audio' }),
      node('audio-list', 'list', { listSignal: 'audio' }),
      node('gallery', 'gallery'),
      node('note', 'sticky-note', { prompt: 'ANNOTATION_MUST_NOT_BECOME_PROVIDER_TEXT' }),
      node('frame', 'frame'), node('comment', 'comment'), node('sticker', 'sticker'),
    )
    edges.push(edge('prompt', 'text-route', 'input', 'text-out'), edge('text-route', 'video', 'text-in', 'output'),
      edge('image', 'edit', 'image-in'), edge('edit', 'upscale', 'image-in'), edge('upscale', 'image-list', 'input'), edge('image-list', 'video', 'reference-in'),
      edge('clip', 'video-route', 'input'), edge('video-route', 'video', 'video-reference-in', 'output'),
      edge('voice', 'audio-list', 'input'), edge('sfx', 'audio-list', 'input'), edge('music', 'audio-list', 'input'), edge('audio-list', 'video', 'audio-reference-in'), edge('video', 'gallery', 'media-in'))
    const request = buildGenerationRequest(video, nodes, edges)
    const kinds = new Set(nodes.map((item) => item.data.kind))
    expect(NODE_PALETTE.every((item) => kinds.has(item.kind))).toBe(true)
    const music = nodes.find(item => item.id === 'music')!
    expect(buildGenerationRequest(music, nodes, edges).musicRequest).toMatchObject({ mode: 'prompt', modelId: 'music_v2_5', prompt: '  Authored beat\r\nPulse  ', durationMs: 3000 })
    expect(request.references).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/fixture/music.mp3', mediaType: 'audio' })]))
    expect(generationRequirementFailures(request)).toEqual([])
    expect(request.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: '@coat', boundCharacterTag: '@maya' }),
      expect.objectContaining({ tag: '@case', boundCharacterTag: '@maya' }),
      expect.objectContaining({ path: '/fixture/upscale.png', mediaType: 'image' }),
      expect.objectContaining({ path: '/fixture/clip.mp4', mediaType: 'video', authority: 'motion-camera' }),
      expect.objectContaining({ path: '/fixture/voice.wav', mediaType: 'audio', authority: 'audio-timing' }),
      expect.objectContaining({ path: '/fixture/sfx.wav', mediaType: 'audio', authority: 'audio-timing' }),
    ]))
    const visible = providerPromptPreview(request)
    expect(visible).toContain('Keep the authored station sequence.')
    expect(visible).not.toContain('ANNOTATION_MUST_NOT_BECOME_PROVIDER_TEXT')
    expect(compileProviderPromptForSubmission(request).text).toBe(visible)
    const payload = providerSeedancePayloadCompilation(request).text
    expect(payload).toContain('@Video1')
    expect(payload).toContain('@Audio1')
    expect(payload).toContain('@Audio2')
    expect(payload).not.toContain('@Video2')
    const restoredNodes = JSON.parse(JSON.stringify(nodes)) as StudioNode[]
    const restoredEdges = JSON.parse(JSON.stringify(edges)) as Edge[]
    expect(providerSeedancePayloadCompilation(buildGenerationRequest(restoredNodes.find((item) => item.id === 'video')!, restoredNodes, restoredEdges)).text).toBe(payload)
    // Each generating branch still resolves its own required source independently.
    expect(buildGenerationRequest(nodes.find((item) => item.id === 'edit')!, nodes, edges).inputPath).toBe('/fixture/image.png')
    expect(buildGenerationRequest(nodes.find((item) => item.id === 'upscale')!, nodes, edges).inputPath).toBe('/fixture/edit.png')
  })
})
