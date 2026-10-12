import { describe, expect, it } from 'vitest'
import { compileProviderPrompt, providerSeedancePayloadCompilation } from './referenceInstructions'
import { seedanceFinalSectionErrors } from './seedanceFinalSection'
import { buildGenerationRequest } from './workflowResolver'
import { buildStoryboardConnectedContextManifest } from './storyboardRewrite'
import { nodeConnectionError } from './nodeConnections'
import type { GenerationRequest, StudioNode } from './types'

const request: GenerationRequest = { nodeId: 'fixture', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.0/reference-to-video', prompt: 'Walk through the doorway.', duration: 5, references: [
  { role: 'character', characterAuthorityMode: 'identity-body-with-layers', tag: '@actor', path: '/fictional/actor.png', mediaType: 'image', slot: 'reference' },
  { role: 'wardrobe', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement', tag: '@coat', boundCharacterTag: '@actor', path: '/fictional/coat.png', mediaType: 'image', slot: 'reference' },
  { role: 'reference', tag: '@movement', path: '/fictional/clip.mp4', mediaType: 'video', authority: 'motion-camera', slot: 'reference' },
  { role: 'reference', tag: '@sound', path: '/fictional/audio.wav', mediaType: 'audio', authority: 'audio-timing', slot: 'reference' },
], connectionRules: [{ tag: '@movement', label: 'Video reference', rule: 'Use the first five seconds for walking rhythm only; retain authored geography.' }] }

describe('connected media introductions and Storyboard routing', () => {
  it('keeps required domain-specific roles before the final negative section', () => {
    const result = compileProviderPrompt(request)
    expect(result.blocks.at(-1)?.label).toBe('NEGATIVE PROMPT')
    expect(result.blocks.find(block => block.id === 'reference-roles')?.required).toBe(true)
    expect(result.text.indexOf('REFERENCE ROLES')).toBeLessThan(result.text.indexOf('NEGATIVE PROMPT'))
    expect(result.blocks.at(-1)?.required).toBe(true)
    const appendix = result.text.split('REFERENCE ROLES\n')[1]
    expect(appendix).toContain('@movement is the Motion and Camera authority only')
    expect(appendix).toContain('walking rhythm only; retain authored geography.')
    expect(appendix).toContain('@sound is the Sound and Timing authority only')
    expect(appendix).toContain('sole clothing and accessory authority for @actor')
    expect(appendix).not.toMatch(/fictional|actor\.png/)
    expect(seedanceFinalSectionErrors(result.text)).toEqual([])
  })
  it.each(['bytedance/seedance-2.0/reference-to-video', 'bytedance/seedance-2.5/reference-to-video'])('uses the exact physical attachment mapping for %s', videoEngine => {
    const appendix = providerSeedancePayloadCompilation({ ...request, videoEngine }).text.split('REFERENCE ROLES\n')[1]
    expect(appendix).not.toMatch(/@actor|@coat|@movement|@sound/)
    expect(appendix).toContain('@Video1')
    expect(appendix).toContain('@Audio1')
    expect(appendix).toContain('@Image2')
  })
  it('preserves exact Manual bytes, including original whitespace', () => {
    const manual = 'Keep these exact bytes.\r\n'
    expect(compileProviderPrompt({ ...request, providerPromptOverride: manual, providerPromptOwnership: 'authored' }).text).toBe(manual)
  })
  it('rejects reference roles or introductions after the negative section', () => {
    for (const heading of ['REFERENCE ROLES', 'REFERENCE INTRODUCTIONS']) {
      const body = `NEGATIVE PROMPT\nwatermarks\n${heading}\n@Video1 is motion only.`
      expect(seedanceFinalSectionErrors(body)).toEqual([expect.stringContaining(`${heading} follows`)])
    }
    expect(seedanceFinalSectionErrors('REFERENCE ROLES\nOne.\nREFERENCE ROLES\nTwo.\nNEGATIVE PROMPT\nwatermarks')).toContain('REFERENCE ROLES must occur once.')
  })
  it('places completed media introductions before the single final negative without dropping content', () => {
    const described = { ...request, references: request.references!.map(reference => ({ ...reference, referenceDescription: `${reference.tag} is the sole reference for its assigned role.` })) }
    const result = compileProviderPrompt(described)
    expect(result.blocks.at(-1)?.label).toBe('NEGATIVE PROMPT')
    expect(result.text.match(/^NEGATIVE PROMPT$/gm)).toHaveLength(1)
    expect(result.text.indexOf('REFERENCE INTRODUCTIONS')).toBeLessThan(result.text.indexOf('NEGATIVE PROMPT'))
    for (const reference of described.references) expect(result.text).toContain(reference.referenceDescription)
    expect(seedanceFinalSectionErrors(result.text)).toEqual([])
  })
  it('automatically anchors active identity, assigned wardrobe and location while other media need authored use', () => {
    const make = (id: string, data: StudioNode['data']): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data })
    const board = make('board', { kind: 'storyboard', title: 'Shot', storyboardPanels: [{ id: 'shot', prompt: 'I walk slowly.', duration: 5 }] })
    const actor = make('actor', { kind: 'character', title: 'Actor', referenceTag: '@actor', characterAuthorityMode: 'identity-body-with-layers' })
    const coat = make('coat', { kind: 'wardrobe', title: 'Coat', referenceTag: '@coat', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement' })
    const location = make('hall', { kind: 'location', title: 'Hall', referenceTag: '@hall' })
    const prop = make('prop', { kind: 'element', title: 'Lantern', referenceTag: '@lantern' })
    const clip = make('clip', { kind: 'upload', title: 'Walking Motion', referenceTag: '@walking', outputType: 'video', assetPath: '/fictional/walk.mp4' })
    const audio = make('audio', { kind: 'upload', title: 'Footsteps', referenceTag: '@footsteps', outputType: 'audio', assetPath: '/fictional/audio.wav' })
    const edges = [actor, location, prop, clip, audio].map(source => ({ id: source.id, source: source.id, target: 'board' }))
    edges.push({ id: 'wardrobe', source: 'coat', target: 'actor' })
    const context = buildStoryboardConnectedContextManifest('board', [board, actor, coat, location, prop, clip, audio], edges, 'I walk slowly.', { id: 'shot' })
    expect(context.entries.filter(entry => entry.requiredInsertion).map(entry => entry.tag).sort()).toEqual(['@actor', '@coat', '@hall'])
    expect(context.entries.find(entry => entry.tag === '@coat')?.appearanceOwnerCharacterTag).toBe('@actor')
    const indirect = edges.filter(edge => edge.source !== 'actor' && edge.source !== 'hall').concat([{ id: 'actor-location', source: 'actor', target: 'hall' }, { id: 'hall-board', source: 'hall', target: 'board' }])
    const nested = buildStoryboardConnectedContextManifest('board', [board, actor, coat, location, prop, clip, audio], indirect, 'I walk slowly.', { id: 'shot' })
    expect(nested.entries.find(entry => entry.tag === '@coat')?.appearanceOwnerCharacterTag).toBe('@actor')
    expect(nested.entries.filter(entry => entry.requiredInsertion).map(entry => entry.tag).sort()).toEqual(['@actor', '@coat', '@hall'])
    expect(context.entries.filter(entry => ['Element/Prop', 'Video Reference', 'Audio Reference'].includes(entry.role)).every(entry => !entry.requiredInsertion)).toBe(true)
  })
  it('carries Storyboard Video/Audio semantic mentions and actual media into the final provider body', () => {
    const node = (id: string, data: StudioNode['data']): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data })
    const clip = node('clip', { kind: 'upload', title: 'Walking Motion', referenceTag: '@walking', outputType: 'video', assetPath: '/fictional/walk.mp4' })
    const sound = node('sound', { kind: 'upload', title: 'Footsteps', referenceTag: '@footsteps', outputType: 'audio', assetPath: '/fictional/sound.wav' })
    const board = node('board', { kind: 'storyboard', title: 'Shot', storyboardPanels: [{ id: 'shot', prompt: 'Use @walking for the walk and @footsteps for timing.', duration: 5, camera: 'static', shotSize: 'wide' }] })
    const video = node('video', { kind: 'video-generator', title: 'Video', videoEngine: 'bytedance/seedance-2.0/reference-to-video', duration: 5 })
    const nodes = [clip, sound, board, video]
    const edges = [{ id: 'clip-board', source: 'clip', target: 'board', targetHandle: 'video-reference-in' }, { id: 'sound-board', source: 'sound', target: 'board', targetHandle: 'audio-reference-in' }, { id: 'board-video', source: 'board', target: 'video', targetHandle: 'storyboard-in' }]
    expect(nodeConnectionError('clip', 'board', clip.data, board.data, undefined, 'video-reference-in')).toBeNull()
    expect(nodeConnectionError('sound', 'board', sound.data, board.data, undefined, 'audio-reference-in')).toBeNull()
    const context = buildStoryboardConnectedContextManifest('board', nodes, edges, board.data.storyboardPanels![0].prompt)
    expect(context.entries.map(entry => entry.role)).toEqual(['Video Reference', 'Audio Reference'])
    expect(context.text).not.toMatch(/fictional|walk\.mp4/)
    const compiled = buildGenerationRequest(video, nodes, edges)
    expect(compiled.references?.map(reference => reference.authority)).toEqual(['motion-camera', 'audio-timing'])
    const appendix = providerSeedancePayloadCompilation(compiled).text.split('REFERENCE ROLES\n')[1]
    expect(appendix).toContain('@Video1 is a supplied video reference.')
    expect(appendix).toContain('Apply only that authored assignment')
    expect(compiled.references![0].mediaReferenceMode).toBe('reference')
    expect(compiled.references![1].mediaReferenceMode).toBe('sound')
    expect(appendix).toContain('@Audio1 is a supplied audio reference.')
    expect(appendix).not.toContain('@Audio1 is the Sound and Timing authority only')
  })
})
