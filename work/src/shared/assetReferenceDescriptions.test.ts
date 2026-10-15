import { describe, expect, it } from 'vitest'
import type { StudioNode, GenerationRequest, ImportedAsset } from './types'
import { assetReferenceDescription, reusableAssetHydrationPatch } from './semanticAssetPromptBoundary'
import { assetDescriptionKnownTags, automaticAssetDescriptionPatch, mediaDescriptionConnectedToGenerator, referenceDescriptionLines, referenceDescriptionReadinessFailures, resolvedAssetReferenceDescription, assetDescriptionPlaceholder, assetDescriptionPlaceholderForNode, assetDescriptionRevampContext, assetDescriptionRevampInstruction, validateAssetDescriptionRevamp } from './assetReferenceDescriptions'
import { referenceRoleInstructions, compileProviderPrompt } from './referenceInstructions'
import { buildGenerationRequest } from './workflowResolver'
import { buildStoryboardConnectedContextManifest } from './storyboardRewrite'

const asset: ImportedAsset = { id: 'door', name: 'door.png', path: '/fixture/door.png', mimeType: 'image/png', createdAt: 'fixture', metadata: { assetGenerationPrompt: 'GENERATION HISTORY SENTINEL', referenceDescription: 'Sole reference for Door A closed; the same entrance shown open in @door-open in @hallway.' } }
const node = (id: string, kind: StudioNode['data']['kind'], patch: Partial<StudioNode['data']> = {}): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, referenceTag: `@${id}`, ...patch } })

describe('authored asset descriptions independent of intake and generation history', () => {
  it('recognizes downstream Character owners and other asset mentions independently of generation-input compatibility', () => {
    const wardrobe = node('haji-wardrobe', 'wardrobe'), person = node('haji-identity', 'character'), location = node('hallway', 'location'), text = node('writing', 'prompt')
    expect(assetDescriptionKnownTags([wardrobe, person, location, text])).toEqual(['@haji-wardrobe', '@haji-identity', '@hallway'])
    expect(assetDescriptionKnownTags([wardrobe, person, location, text])).not.toContain('@unavailable')
  })
  it('stores proven automatic descriptions, keeps their disconnected snapshot, and updates actual reconnected ownership', () => {
    const wardrobe = node('coat', 'wardrobe', { assetPath: '/coat.png' }), person = node('haji', 'character'), other = node('other', 'character')
    const nodes = [wardrobe, person, other], edge = { id: 'owner', source: wardrobe.id, target: person.id, targetHandle: 'wardrobe-in' }
    const patch = automaticAssetDescriptionPatch(wardrobe, nodes, [edge])!
    expect(patch.referenceDescriptionMode).toBe('auto')
    expect(patch.referenceDescription).toContain('for @haji')
    const saved = { ...wardrobe, data: { ...wardrobe.data, ...patch } }
    expect(automaticAssetDescriptionPatch(saved, [saved, person, other], [])).toBeUndefined()
    expect(resolvedAssetReferenceDescription(saved, [saved, person, other], [])).toBe(patch.referenceDescription)
    expect(automaticAssetDescriptionPatch(saved, [saved, person, other], [{ ...edge, target: other.id }])!.referenceDescription).toContain('for @other')
    const authored = { ...saved, data: { ...saved.data, referenceDescription: '', referenceDescriptionMode: 'authored' as const } }
    expect(automaticAssetDescriptionPatch(authored, [authored, person, other], [edge])).toBeUndefined()
  })
  it.each(['image-generator', 'video-generator'] as const)('detects dropped media connected to %s directly or through workflow nodes; disconnect hides without deleting text', kind => {
    const media = node('camera', 'upload', { assetPath: '/camera.png', outputType: 'image', referenceDescription: 'Authored camera path.' }), generator = node('generator', kind, { videoEngine: 'bytedance/seedance-2.5/reference-to-video' }), router = node('router', 'router'), list = node('list', 'list'), story = node('story', 'storyboard')
    const nodes = [media, generator, router, list, story]
    const edge = (source: string, target: string, targetHandle = 'input') => ({ id: source + target, source, target, targetHandle })
    expect(mediaDescriptionConnectedToGenerator(media.id, nodes, [edge(media.id, generator.id, 'reference-in')])).toBe(true)
    const routed = [edge(media.id, router.id), edge(router.id, list.id), ...(kind === 'video-generator' ? [edge(list.id, story.id, 'reference-in'), edge(story.id, generator.id, 'storyboard-in')] : [edge(list.id, generator.id, 'reference-in')]), edge(list.id, router.id)]
    expect(mediaDescriptionConnectedToGenerator(media.id, nodes, routed)).toBe(true)
    expect(mediaDescriptionConnectedToGenerator(media.id, nodes, routed.filter(item => item.target !== generator.id))).toBe(false)
    expect(mediaDescriptionConnectedToGenerator(media.id, nodes, [edge(generator.id, media.id)])).toBe(false)
    expect(mediaDescriptionConnectedToGenerator(media.id, nodes, [edge(media.id, 'removed-node')])).toBe(false)
    expect(media.data.referenceDescription).toBe('Authored camera path.')
  })
  it('derives both sides of actual Wardrobe ownership and updates them until authored', () => {
    const wardrobe = node('coat', 'wardrobe'), person = node('haji', 'character'), other = node('other', 'character')
    const nodes = [wardrobe, person, other], edges = [{ id: 'coat-owner', source: wardrobe.id, target: person.id, targetHandle: 'wardrobe-in' }]
    expect(resolvedAssetReferenceDescription(wardrobe, nodes, edges)).toContain('for @haji')
    expect(resolvedAssetReferenceDescription(person, nodes, edges)).toContain('wardrobe from @coat')
    expect(resolvedAssetReferenceDescription(wardrobe, nodes, [{ ...edges[0], target: other.id }])).toContain('for @other')
    const authored = { ...wardrobe, data: { ...wardrobe.data, referenceDescription: 'Authored coat authority.', referenceDescriptionMode: 'authored' as const } }
    expect(resolvedAssetReferenceDescription(authored, nodes, edges)).toBe('Authored coat authority.')
    expect(resolvedAssetReferenceDescription({ ...authored, data: { ...authored.data, referenceDescription: '' } }, nodes, edges)).toBe('')
    expect(resolvedAssetReferenceDescription(wardrobe, nodes, [])).toBe('')
  })
  it('fills a sole connected Location but leaves multiple-location and Element examples as placeholders', () => {
    const hall = node('hall', 'location', { assetPath: '/hall.png' }), door = node('door', 'location', { assetPath: '/door.png' }), story = node('story', 'storyboard'), prop = node('cup', 'element')
    const edges = [{ id: 'hall-story', source: hall.id, target: story.id, targetHandle: 'location-in' }]
    expect(resolvedAssetReferenceDescription(hall, [hall, door, story], edges)).toContain('sole Location reference')
    expect(resolvedAssetReferenceDescription(hall, [hall, door, story], [...edges, { id: 'door-story', source: door.id, target: story.id, targetHandle: 'location-in' }])).toBe('')
    expect(resolvedAssetReferenceDescription(prop, [prop], [])).toBe('')
    expect(assetDescriptionPlaceholder('location', '@door')).toContain('@door is the sole reference for [this part or state')
    expect(assetDescriptionPlaceholder('element', '@cup')).toContain('@cup is the sole reference for [this prop')
  })
  it('offers the first connected Location a whole-environment placeholder and later Locations a part/state placeholder without filling them', () => {
    const unrelated = node('another-scene', 'location', { assetPath: '/other.png' }), empty = node('unplaced', 'location'), hall = node('hall', 'location', { assetPath: '/hall.png' }), door = node('door', 'location', { assetPath: '/door.png' }), story = node('story', 'storyboard'), video = node('video', 'video-generator'), router = node('route', 'router')
    const nodes = [unrelated, empty, hall, door, story, video, router]
    const edges = [{ id: 'empty-story', source: empty.id, target: story.id }, { id: 'hall-story', source: hall.id, target: story.id }, { id: 'story-video', source: story.id, target: video.id }, { id: 'door-route', source: door.id, target: router.id }, { id: 'route-video', source: router.id, target: video.id }, { id: 'route-cycle', source: router.id, target: router.id }]
    expect(assetDescriptionPlaceholderForNode(hall, nodes, edges)).toBe('@hall is the sole representation of [the location and its environment]…')
    expect(assetDescriptionPlaceholderForNode(door, nodes, edges)).toContain('[this part or state of the location]')
    expect(resolvedAssetReferenceDescription(hall, nodes, edges)).toBe('')
    expect(resolvedAssetReferenceDescription(door, nodes, edges)).toBe('')
    expect(assetDescriptionPlaceholderForNode(hall, [hall, door], [])).toContain('sole representation')
    expect(assetDescriptionPlaceholderForNode(door, [hall, door], [])).toContain('part or state')
    const authored = { ...hall, data: { ...hall.data, referenceDescription: 'Edited authority.', referenceDescriptionMode: 'authored' as const } }
    expect(resolvedAssetReferenceDescription(authored, nodes, edges)).toBe('Edited authority.')
  })
  it('fills the sole remaining placed Location when two peers are removed, while preserving user wording and clears', () => {
    const empty = node('unplaced', 'location'), hall = node('hall', 'location', { assetPath: '/hall.png' }), doorA = node('door-a', 'location', { assetPath: '/a.png' }), doorB = node('door-b', 'location', { assetPath: '/b.png' }), video = node('video', 'video-generator')
    const nodes = [empty, hall, doorA, doorB, video], edges = nodes.filter(node => node.data.kind === 'location').map(node => ({ id: node.id + '-video', source: node.id, target: video.id }))
    expect(automaticAssetDescriptionPatch(hall, nodes, edges)).toBeUndefined()
    const remaining = nodes.filter(node => !['door-a', 'door-b'].includes(node.id)), remainingEdges = edges.filter(edge => !['door-a', 'door-b'].includes(edge.source))
    const patch = automaticAssetDescriptionPatch(hall, remaining, remainingEdges)!
    expect(patch.referenceDescriptionMode).toBe('auto')
    expect(patch.referenceDescription).toContain('@hall is the sole Location reference')
    expect(patch.referenceDescription).not.toContain('[')
    const saved = { ...hall, data: { ...hall.data, ...patch } }
    expect(resolvedAssetReferenceDescription(saved, [empty, saved, video], remainingEdges)).toBe(patch.referenceDescription)
    expect(automaticAssetDescriptionPatch(saved, [empty, saved, video], [])).toBeUndefined()
    expect(resolvedAssetReferenceDescription(saved, [empty, saved, video], [])).toBe(patch.referenceDescription)
    for (const description of ['User authority.', '']) {
      const authored = { ...saved, data: { ...saved.data, referenceDescription: description, referenceDescriptionMode: 'authored' as const } }
      expect(automaticAssetDescriptionPatch(authored, [empty, authored, video], remainingEdges)).toBeUndefined()
      expect(resolvedAssetReferenceDescription(authored, [empty, authored, video], remainingEdges)).toBe(description)
    }
  })
  it.each(['character', 'wardrobe', 'element', 'location', 'style-reference'] as const)('restores %s description independently of generation Prompt', kind => {
    const patch = reusableAssetHydrationPatch(kind, [asset])
    expect(patch.referenceDescription).toBe(asset.metadata!.referenceDescription)
    expect(patch.assetGenerationPrompt).toBe('GENERATION HISTORY SENTINEL')
    expect(patch.prompt).toBeUndefined()
    expect(assetReferenceDescription({ referenceAssets: [asset] })).toBe(asset.metadata!.referenceDescription)
    expect(assetReferenceDescription({ referenceAssets: [asset], referenceDescription: '' })).toBe('')
  })
  it.each(['single', 'multi'] as const)('preserves %s Character description with its saved views', mode => {
    const restored = reusableAssetHydrationPatch('character', [JSON.parse(JSON.stringify({ ...asset, metadata: { ...asset.metadata, characterInputMode: mode, characterView: 'front' } }))])
    expect(restored.referenceDescription).toBe(asset.metadata!.referenceDescription)
  })
  it('omits pending physical reference authorities while retaining completed introductions and authored actions', () => {
    const refs: NonNullable<GenerationRequest['references']> = [
      { role: 'location', tag: '@hall', path: '/hall.png', referenceDescription: '' },
      { role: 'location', tag: '@door', path: '/door.png', referenceDescription: '   ' },
      { role: 'element', tag: '@case', path: '/case.png', referenceDescription: 'The sole prop-design reference.' },
      { role: 'reference', tag: '@camera', path: '/camera.mp4', mediaType: 'video', authority: 'motion-camera', referenceDescription: 'Camera path and motion only.' },
    ]
    const request: GenerationRequest = { nodeId: 'video', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: 'Walk through @hall carrying @case.', duration: 5, references: refs, connectionRules: [{ tag: '@hall', label: 'Location', rule: 'Use for the location.' }] }
    const snapshot = JSON.stringify(request)
    const before = compileProviderPrompt(request, { family: 'seedance', preserveSemanticTags: true })
    const authority = before.blocks.filter(block => /authority|reference-roles|reference-introductions/.test(block.id)).map(block => block.text).join('\n')
    expect(authority).not.toContain('Use @hall for the location')
    expect(authority).not.toContain('@hall — Location')
    expect(authority).not.toContain('@door')
    expect(before.text).toContain('@case — The sole prop-design reference.')
    expect(before.text).toContain('@camera — Camera path and motion only.')
    const completed = { ...request, references: refs.map(ref => ref.tag === '@hall' ? { ...ref, referenceDescription: 'The sole reference for the complete arrival hall.' } : ref) }
    const after = compileProviderPrompt(completed, { family: 'seedance', preserveSemanticTags: true })
    expect(after.text).not.toContain('Use @hall for the location.')
    expect(after.text.indexOf('@hall — The sole reference for the complete arrival hall.')).toBeLessThan(after.text.indexOf('REFERENCE AUTHORITY'))
    expect(after.text).toContain('@hall — The sole reference for the complete arrival hall.')
    expect(after.text).not.toContain('Use @door for the location.')
    expect(JSON.stringify(request)).toBe(snapshot)
  })
  it('omits an empty nonphysical Location connection instead of inventing text-described authority', () => {
    const empty = node('unplaced', 'location'), video = node('video', 'video-generator', { prompt: 'Show an empty hallway.', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 5 })
    const request = buildGenerationRequest(video, [empty, video], [{ id: 'empty-video', source: empty.id, target: video.id, targetHandle: 'location-in' }])
    expect(request.connectionRules!.find(rule => rule.tag === '@unplaced')!.referenceDescription).toBe('')
    const body = compileProviderPrompt(request, { family: 'seedance', preserveSemanticTags: true }).text
    expect(body).not.toContain('@unplaced')
    expect(body).toContain('Show an empty hallway.')
  })
  it('introduces explicit location states once in the final reference-role instructions', () => {
    const references: NonNullable<GenerationRequest['references']> = [
      { role: 'location', path: asset.path, tag: '@door-closed', referenceDescription: asset.metadata!.referenceDescription },
      { role: 'location', path: '/fixture/open.png', tag: '@door-open', referenceDescription: 'Door A open; same doorway as @door-closed.' },
      { role: 'location', path: '/fixture/hall.png', tag: '@hallway', referenceDescription: 'The complete hallway geometry.' },
    ]
    const request: GenerationRequest = { nodeId: 'video', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: 'Walk through the doorway.', duration: 5, references }
    expect(referenceDescriptionReadinessFailures(request)).toEqual([])
    expect(referenceDescriptionLines(request)).toEqual([`@door-closed — ${asset.metadata!.referenceDescription}`, '@door-open — Door A open; same doorway as @door-closed.', '@hallway — The complete hallway geometry.'])
    expect(referenceRoleInstructions(references)).toContain(asset.metadata!.referenceDescription)
    const prompt = compileProviderPrompt(request, { family: 'seedance' }).text
    expect(prompt.split(asset.metadata!.referenceDescription!)).toHaveLength(2)
    expect(prompt.slice(prompt.indexOf('REFERENCE INTRODUCTIONS'))).toContain(asset.metadata!.referenceDescription)
    expect(prompt).not.toContain('GENERATION HISTORY SENTINEL')
    expect(prompt).not.toContain('Ending Frame authority')
    request.references = references.map(reference => reference.tag === '@door-open' ? { ...reference, tag: '@Door-open' } : reference)
    expect(referenceDescriptionReadinessFailures(request)).toEqual([expect.stringContaining('@door-open, which is not connected')])
    request.references = references.filter(reference => reference.tag !== '@door-open')
    expect(referenceDescriptionReadinessFailures(request)).toEqual([expect.stringContaining('@door-open, which is not connected')])
    request.providerPromptOwnership = 'authored'; request.providerPromptOverride = 'Exact Manual text.'
    expect(referenceDescriptionReadinessFailures(request)).toEqual([])
  })
  it('introduces a non-media Style Description without inventing an image or borrowing generation history', () => {
    const style = node('cinematic-look', 'style-reference', {
      referenceDescription: 'Look and finish only for the scene in @hallway; supplies no people or wardrobe.',
      stylePrompt: 'Authored scene finish.', styleSavedAt: 'fixture', assetGenerationPrompt: 'STYLE GENERATION HISTORY SENTINEL',
    })
    const hall = node('hallway', 'location', { referenceAssets: [{ ...asset, metadata: {} }] })
    const video = node('video', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: 'Walk through @hallway.', duration: 5 })
    const request = buildGenerationRequest(video, [video, style, hall], [
      { id: 'style-video', source: style.id, target: video.id, targetHandle: 'style-in' },
      { id: 'hall-video', source: hall.id, target: video.id, targetHandle: 'location-in' },
    ])
    const before = JSON.stringify(request)
    expect(referenceDescriptionReadinessFailures(request)).toEqual([])
    const prompt = compileProviderPrompt(request, { family: 'seedance', preserveSemanticTags: true }).text
    expect(prompt.split(style.data.referenceDescription!)).toHaveLength(2)
    expect(prompt.slice(prompt.indexOf('REFERENCE INTRODUCTIONS'))).toContain('@cinematic-look — ' + style.data.referenceDescription)
    expect(prompt).not.toContain('STYLE GENERATION HISTORY SENTINEL')
    expect(request.references?.map(reference => reference.tag)).toEqual(['@hallway'])
    expect(JSON.stringify(request)).toBe(before)
    const rule = request.connectionRules!.find(rule => rule.tag === '@cinematic-look')!
    expect(referenceDescriptionReadinessFailures({ ...request, connectionRules: request.connectionRules!.map(item => item === rule ? { ...item, referenceDescription: 'Finish for @missing-location.' } : item) })).toEqual([expect.stringContaining('@missing-location, which is not connected')])
  })

  it('carries full role descriptions to hidden Storyboard context without borrowing generation history', () => {
    const description = `${asset.metadata!.referenceDescription} ${'Keep these architectural state assignments unchanged. '.repeat(6)}`
    const door = node('door-closed', 'location', { referenceAssets: [asset], referenceDescription: description }), story = node('story', 'storyboard')
    const context = buildStoryboardConnectedContextManifest(story.id, [story, door], [{ id: 'door-story', source: door.id, target: story.id, targetHandle: 'location-in' }], '')
    expect(context.text).toContain(description)
    expect(context.text).not.toContain('GENERATION HISTORY SENTINEL')
  })
  it('uses the actual Wardrobe connection and preserves semantic tags during description Revamp', () => {
    const wardrobe = node('coat', 'wardrobe', { referenceDescription: 'The complete wardrobe worn by @haji.' }), person = node('haji', 'character'), stranger = node('unrelated', 'character')
    const context = assetDescriptionRevampContext(wardrobe, [wardrobe, person, stranger], [{ id: 'coat-owner', source: wardrobe.id, target: person.id, targetHandle: 'wardrobe-in' }])
    expect(context.definitions[0].wardrobeFor).toEqual(['@haji'])
    expect(context.allowedTags).not.toContain('@unrelated')
    expect(assetDescriptionRevampInstruction(context)).toContain('Do not convert a location-state reference into a Starting/Ending Frame')
    expect(assetDescriptionRevampInstruction(context)).toContain('retain the exact base reference, named replacement target, replacement reference and change-only scope')
    expect(assetDescriptionRevampInstruction(context)).toContain('do not infer a replacement or new constraint when none is authored')
    expect(validateAssetDescriptionRevamp(context.description, 'Sole wardrobe and accessory reference for @haji; adds no separate person.', context.allowedTags)).toContain('@haji')
    expect(() => validateAssetDescriptionRevamp(context.description, 'A costume for somebody.', context.allowedTags)).toThrow(/removed/)
    expect(() => validateAssetDescriptionRevamp(context.description, 'For @haji and @unrelated.', context.allowedTags)).toThrow(/unrelated/)
    expect(() => validateAssetDescriptionRevamp(context.description, 'For @haji in [Image1].', context.allowedTags)).toThrow(/ordinals/)
  })
})
