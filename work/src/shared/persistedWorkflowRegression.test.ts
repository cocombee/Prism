import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { NodeKind, StudioNode, StudioNodeData } from './types'
import { buildGenerationRequest, recursiveUpstreamSemanticTags } from './workflowResolver'
import { generationRequirementFailures } from './generationReadiness'
import { resetManualPrompt, switchVideoPromptMode } from './videoPromptMode'
import { providerPromptPreviewCompilation, visibleProviderPromptBody } from './referenceInstructions'
import { STYLE_PRESETS } from './stylePresets'
import { quantifiedCameraRecipe } from './shotRecipes'

const activeAppSource = readFileSync(new URL('../renderer/src/AppNext.tsx', import.meta.url), 'utf8')
const node = (id: string, kind: NodeKind, data: Partial<StudioNodeData> = {}): StudioNode => ({ id, type: kind === 'storyboard' ? 'storyboard' : 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...data } as StudioNodeData })
const reference = (id: string) => ({ id, name: `${id}.png`, path: `/isolated/${id}.png`, url: `file:///isolated/${id}.png`, mimeType: 'image/png', createdAt: '2026-08-26T00:00:00.000Z' })
const connect = (id: string, source: string, target: string, targetHandle: string): Edge => ({ id, source, sourceHandle: 'media-out', target, targetHandle })
const fixture: { nodes: StudioNode[]; edges: Edge[] } = {
  nodes: [
    node('wardrobe-c', 'wardrobe', { title: 'Indian D', referenceTag: '@video-01-scene-01-lelaki-indian-d', referenceAssets: [reference('wardrobe-c')] }),
    node('actor-c', 'character', { title: 'Actor C', referenceTag: '@actor-c', referenceAssets: [reference('actor-c')] }),
    node('wardrobe-d', 'wardrobe', { title: 'Chinese C', referenceTag: '@video-01-scene-01-lelaki-chinese-c', referenceAssets: [reference('wardrobe-d')] }),
    node('actor-d', 'character', { title: 'Actor D', referenceTag: '@actor-d', referenceAssets: [reference('actor-d')] }),
    node('location', 'location', { title: 'Living Room', referenceTag: '@video-01-scene-01-harga-kedai-living-room', referenceAssets: [reference('location')] }),
    node('phone', 'element', { title: 'Phone', referenceTag: '@video-01-scene-01-telefon-pintar-customer', referenceAssets: [reference('phone')] }),
    node('style', 'style-reference', { title: 'Cinematic Naturalism', referenceTag: '@cinematic-naturalism', stylePresetId: 'cinematic-naturalism' }),
    node('storyboard', 'storyboard', { storyboardMode: 'single', storyboardPanels: [
      { id: 'one', prompt: '@actor-c checks @video-01-scene-01-telefon-pintar-customer beside @actor-d.', duration: 2, shotSize: 'wide', camera: 'dolly-down-slow', transitionToNext: 'hard-cut' },
      { id: 'two', prompt: '@actor-c asks why delivery costs more.', duration: 3, shotSize: 'close-up', camera: 'handheld', transitionToNext: 'hard-cut' },
      { id: 'three', prompt: '@actor-d recommends the alternative.', duration: 3, shotSize: 'close-up', camera: 'handheld', transitionToNext: 'hard-cut' },
      { id: 'four', prompt: '@actor-c smiles and nods.', duration: 2, shotSize: 'medium', camera: 'dolly-in' },
    ] }),
    node('video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 10, aspectRatio: '4:3', resolution: '1080p', promptMode: 'manual', manualPromptSeeded: true, manualPromptDraft: 'ISOLATED USER PROMPT BYTE-FOR-BYTE.' }),
    node('unrelated', 'element', { referenceTag: '@unrelated', referenceAssets: [reference('unrelated')] }),
  ],
  edges: [
    connect('wardrobe-c-actor-c', 'wardrobe-c', 'actor-c', 'wardrobe-in'),
    connect('wardrobe-d-actor-d', 'wardrobe-d', 'actor-d', 'wardrobe-in'),
    connect('actor-c-story', 'actor-c', 'storyboard', 'character-in'),
    connect('actor-d-story', 'actor-d', 'storyboard', 'character-in'),
    connect('location-story', 'location', 'storyboard', 'location-in'),
    connect('phone-story', 'phone', 'storyboard', 'element-in'),
    connect('style-story', 'style', 'storyboard', 'style-in'),
    connect('story-video', 'storyboard', 'video', 'storyboard-in'),
  ],
}
const video = fixture.nodes.find((node) => node.data.kind === 'video-generator')!
const storyboard = fixture.nodes.find((node) => node.data.kind === 'storyboard')!
const actions = storyboard.data.storyboardPanels!.map((panel) => panel.prompt.trim())
const count = (text: string, needle: string) => text.split(needle).length - 1

describe('persisted Misi Delivery prompt regression', () => {
  it('emits one canonical timeline and one deterministic camera recipe per shot', () => {
    const lockedVideo: StudioNode = { ...video, data: { ...video.data, promptMode: 'auto' } }
    const lockedNodes = fixture.nodes.map((node) => node.id === video.id ? lockedVideo : node)
    const request = buildGenerationRequest(lockedVideo, lockedNodes, fixture.edges)
    const prompt = visibleProviderPromptBody(request)
    expect(prompt.length).toBeGreaterThan(3000)
    const cameraRecipes = storyboard.data.storyboardPanels!.map((panel) => quantifiedCameraRecipe(panel.camera || 'auto'))
    for (const recipe of new Set(cameraRecipes)) expect(count(prompt, recipe)).toBe(cameraRecipes.filter((candidate) => candidate === recipe).length)
    expect(count(prompt, 'HARD CUT.')).toBe(Math.max(0, storyboard.data.storyboardPanels!.length - 1))
    for (const action of actions) expect(count(prompt, action)).toBe(1)
    const camera = prompt.split('\nCAMERA\n')[1]?.split('\n\n')[0] || ''
    expect(camera).not.toMatch(/HARD CUT|Overall action|FRAMING:|selected motion cadence/)
    expect(prompt).not.toContain('Overall action: Storyboard sequence:')
    for (const heading of ['REFERENCE AUTHORITY', 'FORMAT MODE', 'TIMELINE AND CONTINUOUS ACTION', 'CAMERA', 'NEGATIVE PROMPT']) expect(prompt).toContain(heading)
  })

  it('keeps blank saved Storyboard panels as draft previews while blocking generation until action returns', () => {
    const lockedVideo: StudioNode = { ...video, data: { ...video.data, promptMode: 'auto' } }
    const lockedNodes = fixture.nodes.map((node) => node.id === video.id ? lockedVideo : node)
    const completeRequest = buildGenerationRequest(lockedVideo, lockedNodes, fixture.edges)
    const completeLocked = visibleProviderPromptBody(completeRequest)
    const draftNodes = structuredClone(lockedNodes)
    const draftStoryboard = draftNodes.find((node) => node.id === storyboard.id)!
    draftStoryboard.data.storyboardPanels![0].prompt = ''
    const draftVideo = draftNodes.find((node) => node.id === video.id)!

    let draftRequest: ReturnType<typeof buildGenerationRequest> | undefined
    expect(() => { draftRequest = buildGenerationRequest(draftVideo, draftNodes, fixture.edges) }).not.toThrow()
    expect(draftRequest).toBeDefined()
    expect(() => visibleProviderPromptBody(draftRequest!)).not.toThrow()
    expect(() => providerPromptPreviewCompilation(draftRequest!)).not.toThrow()

    const draftLocked = visibleProviderPromptBody(draftRequest!)
    const draftCompilation = providerPromptPreviewCompilation(draftRequest!)
    for (const heading of ['FORMAT MODE', 'TIMELINE AND CONTINUOUS ACTION', 'CAMERA', 'NEGATIVE PROMPT']) {
      expect(draftLocked).toContain(heading)
      expect(draftCompilation.text).toContain(heading)
    }
    expect(draftRequest!.storyboardShots).toHaveLength(storyboard.data.storyboardPanels!.length)
    expect(draftRequest!.storyboardShots?.map((shot) => [shot.startSeconds, shot.endSeconds])).toEqual(
      completeRequest.storyboardShots?.map((shot) => [shot.startSeconds, shot.endSeconds]),
    )
    expect(draftLocked).toContain('STORYBOARD PANEL 1 INCOMPLETE')
    expect(draftLocked).not.toContain(actions[0])
    expect(generationRequirementFailures(draftRequest!)).toContain('Storyboard panel 1 is blank — describe its action')

    draftStoryboard.data.storyboardPanels![0].prompt = storyboard.data.storyboardPanels![0].prompt
    const restored = visibleProviderPromptBody(buildGenerationRequest(draftVideo, draftNodes, fixture.edges))
    expect(restored).toBe(completeLocked)
    expect(generationRequirementFailures(buildGenerationRequest(draftVideo, draftNodes, fixture.edges))).not.toContain('Storyboard panel 1 is blank — describe its action')
  })

  it('keeps Locked/User byte ownership independent of native output control changes', () => {
    expect(typeof video.data.manualPromptDraft).toBe('string')
    expect(visibleProviderPromptBody(buildGenerationRequest(video, fixture.nodes, fixture.edges))).toBe(video.data.manualPromptDraft)

    const lockedVideo: StudioNode = { ...video, data: { ...video.data, promptMode: 'auto' } }
    const lockedNodes = fixture.nodes.map((node) => node.id === video.id ? lockedVideo : node)
    const locked = visibleProviderPromptBody(buildGenerationRequest(lockedVideo, lockedNodes, fixture.edges))
    expect(locked).not.toContain('EDIT CONTROL')
    const unseededVideo: StudioNode = { ...lockedVideo, data: { ...lockedVideo.data, manualPromptDraft: undefined, manualPromptSeeded: false, manualPromptSeedVersion: undefined } }
    const seeded = switchVideoPromptMode(unseededVideo, 'manual', locked)
    expect(seeded.manualPromptDraft).toBe(locked)
    const userEdited = `${locked}\nUSER NOTE.`
    const editedVideo = { ...lockedVideo, data: { ...lockedVideo.data, ...seeded, manualPromptDraft: userEdited } }
    const changedVideo: StudioNode = { ...lockedVideo, data: { ...lockedVideo.data, duration: 10, aspectRatio: '9:16', resolution: '720p' } }
    const changedNodes = lockedNodes.map((node) => node.id === video.id ? changedVideo : node)
    const changedLocked = visibleProviderPromptBody(buildGenerationRequest(changedVideo, changedNodes, fixture.edges))
    expect(changedLocked).toBe(locked)
    expect(buildGenerationRequest(changedVideo, changedNodes, fixture.edges)).toMatchObject({ duration: 10, aspectRatio: '9:16', resolution: '720p' })
    expect(changedLocked).toContain('10s TOTAL')
    expect(userEdited).toBe(editedVideo.data.manualPromptDraft)
    const autoSwitch = switchVideoPromptMode(editedVideo, 'auto', changedLocked)
    expect(autoSwitch.manualPromptDraft).toBe(userEdited)
    expect(switchVideoPromptMode({ ...editedVideo, data: { ...editedVideo.data, ...autoSwitch } }, 'manual', changedLocked).manualPromptDraft).toBe(userEdited)
    expect(resetManualPrompt(editedVideo, changedLocked).manualPromptDraft).toBe(changedLocked)
    for (const heading of ['REFERENCE AUTHORITY', 'FORMAT MODE', 'TIMELINE AND CONTINUOUS ACTION', 'NEGATIVE PROMPT']) expect(changedLocked).toContain(heading)
  })

  it('finds every recursively connected semantic tag and excludes unrelated tags', () => {
    const tags = recursiveUpstreamSemanticTags(video.id, fixture.nodes, fixture.edges)
    for (const tag of ['@actor-c', '@actor-d', '@video-01-scene-01-lelaki-indian-d', '@video-01-scene-01-lelaki-chinese-c', '@video-01-scene-01-harga-kedai-living-room', '@video-01-scene-01-telefon-pintar-customer', '@cinematic-naturalism']) expect(tags).toContain(tag)
    expect(tags).not.toContain('@unrelated')
  })

  it('observes recursive semantic tags without compiling an over-budget Storyboard', () => {
    const overflowVideo: StudioNode = { ...video, data: { ...video.data, duration: 5, promptMode: 'auto' } }
    const overflowNodes = fixture.nodes.map((candidate) => candidate.id === video.id ? overflowVideo : candidate)
    expect(() => buildGenerationRequest(overflowVideo, overflowNodes, fixture.edges)).toThrow(/Storyboard timing 10\.0s exceeds.*5\.0s/i)
    expect(() => recursiveUpstreamSemanticTags(video.id, overflowNodes, fixture.edges)).not.toThrow()
    const tags = recursiveUpstreamSemanticTags(video.id, overflowNodes, fixture.edges)
    expect(tags).toContain('@actor-c')
    expect(tags).toContain('@cinematic-naturalism')
    expect(tags).not.toContain('@unrelated')
    expect(overflowNodes.find((candidate) => candidate.id === storyboard.id)?.data.storyboardPanels).toEqual(storyboard.data.storyboardPanels)
  })

  it('preserves persisted Wardrobe media-out to Character wardrobe-in semantics', () => {
    const byId = new Map(fixture.nodes.map((node) => [node.id, node]))
    const wardrobeEdges = fixture.edges.filter((edge) => byId.get(edge.source)?.data.kind === 'wardrobe' && byId.get(edge.target)?.data.kind === 'character')
    expect(wardrobeEdges.length).toBeGreaterThanOrEqual(2)
    for (const edge of wardrobeEdges) expect(edge).toMatchObject({ sourceHandle: 'media-out', targetHandle: 'wardrobe-in' })
    expect(activeAppSource).toContain("new Set<NodeKind>(['character', 'wardrobe', 'element', 'location'])")
    expect(activeAppSource).toContain("category === 'wardrobe' ? 'wardrobe'")
  })

  it('upgrades stale built-in Style bytes dynamically and preserves custom Style bytes', () => {
    const request = buildGenerationRequest(video, fixture.nodes, fixture.edges)
    const kodak = STYLE_PRESETS.find((preset) => preset.id === 'cinematic-naturalism')!.prompt
    expect(request.stylePrompt).toBe(kodak)
    expect(request.stylePrompt).not.toContain('grounded production design')
    const style = fixture.nodes.find((node) => node.data.kind === 'style-reference')!
    const switched = { ...style, data: { ...style.data, stylePresetId: 'dimensional-comic', referenceTag: '@dimensional-comic', title: 'Dimensional Comic' } }
    const switchedNodes = fixture.nodes.map((node) => node.id === style.id ? switched : node)
    expect(buildGenerationRequest(video, switchedNodes, fixture.edges).stylePrompt).toBe(STYLE_PRESETS.find((preset) => preset.id === 'dimensional-comic')!.prompt)
    const customText = 'MY CUSTOM STYLE BYTE-FOR-BYTE.'
    const custom = { ...style, data: { ...style.data, stylePresetId: undefined, styleSavedAt: '2026-08-24T00:00:00.000Z', stylePrompt: customText, prompt: customText } }
    const customNodes = fixture.nodes.map((node) => node.id === style.id ? custom : node)
    expect(buildGenerationRequest(video, customNodes, fixture.edges).stylePrompt).toBe(customText)
  })
})


describe('connected provider reference tag coverage', () => {
  it('includes video, audio and sheet references routed through Storyboard, while ignoring unrelated media', () => {
    const node = (id: string, kind: StudioNode['data']['kind'], outputType?: 'image' | 'video' | 'audio'): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, referenceTag: '@' + id, ...(outputType ? { outputType, assetPath: '/fixture/' + id } : {}) } })
    const video = node('generator', 'video-generator'), board = node('story', 'storyboard'), motion = node('blender-camera-reference', 'upload', 'video'), audio = node('audio-reference', 'upload', 'audio'), sheet = node('sheet-reference', 'upload', 'image'), unrelated = node('unrelated', 'upload', 'video')
    const edge = (source: string, target: string, targetHandle: string) => ({ id: source + target, source, target, sourceHandle: 'media-out', targetHandle })
    const tags = recursiveUpstreamSemanticTags(video.id, [video, board, motion, audio, sheet, unrelated], [edge(motion.id, board.id, 'video-reference-in'), edge(audio.id, board.id, 'audio-reference-in'), edge(sheet.id, board.id, 'reference-in'), edge(board.id, video.id, 'storyboard-in')])
    expect(tags).toContain('@blender-camera-reference')
    expect(tags).toContain('@audio-reference')
    expect(tags).toContain('@sheet-reference')
    expect(tags).not.toContain('@unrelated')
  })
})
