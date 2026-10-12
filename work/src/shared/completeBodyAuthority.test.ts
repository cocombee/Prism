import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { GenerationRequest, StudioNode } from './types'
import { compileProviderPrompt, compileProviderPromptForSubmission, orderedProviderImageReferences, providerSeedancePayloadCompilation } from './referenceInstructions'
import { generationRequirementFailures } from './generationReadiness'
import { buildGenerationRequest } from './workflowResolver'
import { buildStoryboardConnectedContextManifest, storyboardRewriteInstruction, validateStoryboardRewrite } from './storyboardRewrite'

const base = (references: GenerationRequest['references'], shots: NonNullable<GenerationRequest['storyboardShots']>): GenerationRequest => ({
  nodeId: 'same-body-video',
  kind: 'video-generator',
  prompt: shots.map((shot) => shot.prompt).join('\n'),
  authoredPrompt: '',
  videoEngine: 'bytedance/seedance-2.5/reference-to-video',
  references,
  storyboardShots: shots,
})

const node = (id: string, kind: StudioNode['data']['kind'], patch: Partial<StudioNode['data']> = {}): StudioNode => ({
  id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...patch },
})

describe('complete dressed-body and same-body appearance authority', () => {
  it('binds one merged complete Character once across three Continue beats in one uninterrupted shot', () => {
    const request = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya-dressed.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'complete-dressed-body' },
    ], [
      { panelId: 'c1', prompt: '@maya enters.', duration: 1, shotSize: 'wide', camera: 'static', transitionToNext: 'continue' },
      { panelId: 'c2', prompt: 'Maya crosses to the counter.', duration: 1, shotSize: 'medium', camera: 'dolly-in', transitionToNext: 'continue' },
      { panelId: 'c3', prompt: 'She stops at the counter.', duration: 1, shotSize: 'close-up', camera: 'static' },
    ])
    const compiled = compileProviderPrompt(request)
    const exact = 'Use @maya as Maya.'
    expect(compiled.text.match(new RegExp(exact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    expect(compiled.text).toContain('Maya crosses to the counter.')
    expect(compiled.text).toContain('She stops at the counter.')
    expect(compiled.text).not.toMatch(/Wardrobe modifier|identity\s*\+\s*Wardrobe|wearing the appearance governed by/i)
    expect(compiled.continuityLedger?.global).toMatchObject({ identities: ['@maya'], wardrobe: [] })
  })

  it('rebinds only the applicable complete Character once per edited owning shot', () => {
    const request = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya-dressed.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'complete-dressed-body' },
      { role: 'character', tag: '@liam', name: 'Liam', path: '/liam-dressed.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'complete-dressed-body' },
    ], [
      { panelId: 'e1', prompt: '@maya enters.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' },
      { panelId: 'e2', prompt: '@maya sits.', duration: 2, shotSize: 'medium', camera: 'static' },
    ])
    const compiled = compileProviderPrompt(request).text
    const exact = 'Use @maya as Maya.'
    expect(compiled.match(new RegExp(exact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(2)
    expect(compiled).not.toContain('Use @liam as Liam.')
  })

  it('never generates ambiguous pronouns for multiple complete Characters', () => {
    const request = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya-dressed.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'complete-dressed-body' },
      { role: 'character', tag: '@liam', name: 'Liam', path: '/liam-dressed.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'complete-dressed-body' },
    ], [{ panelId: 'm1', prompt: '@maya faces @liam.', duration: 2, shotSize: 'medium', camera: 'static' }])
    const compiled = compileProviderPrompt(request).text
    expect(compiled).toContain('Use @maya as Maya.')
    expect(compiled).toContain('Use @liam as Liam.')
    expect(compiled).not.toMatch(/\b(?:he|she|they|him|her|them)\b/i)
  })

  it('A: projects one complete dressed-body Character as one body and one cast member', () => {
    const request = base([
      {
        role: 'character', tag: '@maya', name: 'Maya', path: '/maya-dressed.png', mediaType: 'image', slot: 'reference',
        characterAuthorityMode: 'complete-dressed-body',
      },
    ] as GenerationRequest['references'], [
      { panelId: 'shot-a', prompt: '@maya enters the station.', duration: 4, shotSize: 'wide', camera: 'static' },
    ])

    const compiled = compileProviderPrompt(request)
    const exact = 'Use @maya as Maya.'
    expect(compiled.text.match(new RegExp(exact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    expect(compiled.continuityLedger?.global.identities).toEqual(['@maya'])
    expect(compiled.continuityLedger?.global.wardrobe).toEqual([])
    expect(compiled.text).not.toMatch(/generated appearance|wardrobe authority|wearing @/i)
  })

  it('B: suppresses a redundant Wardrobe from semantic prose and provider attachments', () => {
    const request = base([
      {
        role: 'character', tag: '@maya', name: 'Maya', path: '/maya-dressed.png', mediaType: 'image', slot: 'reference',
        characterAuthorityMode: 'complete-dressed-body',
      },
      {
        role: 'wardrobe', tag: '@maya-coat', path: '/coat.png', mediaType: 'image', slot: 'reference',
        boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'redundant',
      },
    ], [
      { panelId: 'shot-b', prompt: '@maya enters the station.', duration: 4, shotSize: 'wide', camera: 'static' },
    ])

    const compiled = compileProviderPrompt(request)
    expect(compiled.text).not.toContain('@maya-coat')
    expect(compiled.continuityLedger?.global.wardrobe).toEqual([])
    expect(orderedProviderImageReferences(request).map((reference) => reference.tag)).toEqual(['@maya'])
    const payload = providerSeedancePayloadCompilation(request).text
    expect(payload).toContain('Use @Image1 as Maya.')
    expect(payload).not.toContain('@maya-coat')
    expect(payload).not.toContain('@Image2')
  })

  it('C: projects an explicitly selected Wardrobe only as appearance on the same counted body', () => {
    const request = base([
      {
        role: 'character', tag: '@maya', name: 'Maya', path: '/maya.png', mediaType: 'image', slot: 'reference',
        characterAuthorityMode: 'identity-body-with-layers',
      },
      {
        role: 'wardrobe', tag: '@maya-coat', path: '/coat.png', mediaType: 'image', slot: 'reference',
        boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement',
        appearanceShotIds: ['shot-c'],
      },
    ] as GenerationRequest['references'], [
      { panelId: 'shot-c', prompt: '@maya enters the station.', duration: 4, shotSize: 'wide', camera: 'static' },
    ])

    const compiled = compileProviderPrompt(request)
    const exact = "Use @maya-coat for @maya's wardrobe."
    expect(compiled.text.match(new RegExp(exact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    expect(compiled.continuityLedger?.global.identities).toEqual(['@maya'])
    expect(compiled.continuityLedger?.global.wardrobe).toEqual([])
    expect(compiled.text).not.toMatch(/@maya-coat is the sole visual authority|Only 2 people/)
  })

  it('D: keeps helmet, glasses, and accessory layers on one Character body and out of cast/tableau ledgers', () => {
    const layers = [
      { tag: '@helmet', scope: 'helmet-headwear' as const },
      { tag: '@glasses', scope: 'glasses-accessory' as const },
      { tag: '@brooch', scope: 'connected-element' as const },
    ]
    const request = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'identity-body-with-layers' },
      ...layers.map(({ tag, scope }) => ({
        role: 'element' as const, tag, path: `/${tag.slice(1)}.png`, mediaType: 'image' as const, slot: 'reference' as const,
        boundCharacterTag: '@maya', appearanceScope: scope, appearanceElementTag: scope === 'connected-element' ? tag : undefined,
        appearanceSelection: 'explicit-replacement' as const,
      })),
    ], [{ panelId: 'shot-d', prompt: '@maya turns.', duration: 4, shotSize: 'medium', camera: 'static' }])
    const compiled = compileProviderPromptForSubmission(request)
    for (const { tag, scope } of layers) expect(compiled.text).toContain(`Use ${tag} for @maya's ${scope === 'helmet-headwear' ? 'helmet or headwear' : scope === 'glasses-accessory' ? 'glasses or accessory' : 'assigned item'}.`)
    expect(compiled.text.match(/Use @maya as Maya\./g)).toHaveLength(1)
    expect(compiled.continuityLedger?.global).toMatchObject({ identities: ['@maya'], wardrobe: [], props: [] })
    expect(compiled.text).not.toMatch(/Only [234] people|mannequin|donor body|separate torso/i)
  })

  it('G: suppresses a fallback precomposed appearance layer from prose and attachments', () => {
    const request = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya-complete.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'complete-dressed-body' },
      { role: 'wardrobe', tag: '@fallback-coat', path: '/coat.png', mediaType: 'image', slot: 'reference', boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'precomposed-fallback' },
    ], [{ panelId: 'shot-g', prompt: '@maya turns.', duration: 4, shotSize: 'medium', camera: 'static' }])
    expect(compileProviderPrompt(request).text).not.toContain('@fallback-coat')
    expect(orderedProviderImageReferences(request).map((reference) => reference.tag)).toEqual(['@maya'])

    const outside = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'identity-body-with-layers' },
      { role: 'wardrobe', tag: '@later-coat', path: '/later.png', mediaType: 'image', slot: 'reference', boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement', appearanceShotIds: ['later-shot'] },
    ], [{ panelId: 'shot-g', prompt: '@maya turns.', duration: 4, shotSize: 'medium', camera: 'static' }])
    expect(compileProviderPrompt(outside).text).not.toContain('@later-coat')
    expect(orderedProviderImageReferences(outside).map((reference) => reference.tag)).toEqual(['@maya'])
  })

  it('H: repeats one-body authority shot-locally while counting one Character through cuts and off-camera state', () => {
    const request = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'identity-body-with-layers' },
      { role: 'wardrobe', tag: '@maya-coat', path: '/coat.png', mediaType: 'image', slot: 'reference', boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement' },
    ], [
      { panelId: 'h1', prompt: '@maya crosses.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut', continuityGroupId: 'maya-sequence', activeCharacterTags: ['@maya'], characterStates: [{ characterTag: '@maya', visibility: 'partially-visible' }] },
      { panelId: 'h2', prompt: 'The work continues.', duration: 2, shotSize: 'medium', camera: 'static', continuityGroupId: 'maya-sequence', activeCharacterTags: ['@maya'], characterStateDeltas: [{ characterTag: '@maya', visibility: 'off-camera' }] },
    ])
    const compiled = compileProviderPromptForSubmission(request)
    const exact = "Use @maya-coat for @maya's wardrobe."
    expect(compiled.text.match(new RegExp(exact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(2)
    expect(compiled.continuityLedger?.global).toMatchObject({ identities: ['@maya'], wardrobe: [] })
    expect(compiled.continuityLedger?.shots.map((shot) => shot.characterStates[0]?.visibility)).toEqual(['partially-visible', 'off-camera'])
  })

  it('E: rejects conflicting same-scope layers atomically at submission', () => {
    const request = base([
      {
        role: 'character', tag: '@maya', name: 'Maya', path: '/maya.png', mediaType: 'image', slot: 'reference',
        characterAuthorityMode: 'identity-body-with-layers',
      },
      {
        role: 'wardrobe', tag: '@coat-a', path: '/coat-a.png', mediaType: 'image', slot: 'reference',
        boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement',
      },
      {
        role: 'wardrobe', tag: '@coat-b', path: '/coat-b.png', mediaType: 'image', slot: 'reference',
        boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement',
      },
    ], [
      { panelId: 'shot-e', prompt: '@maya enters the station.', duration: 4, shotSize: 'wide', camera: 'static' },
    ])

    expect(() => compileProviderPromptForSubmission(request)).toThrow(
      'select exactly one wardrobe appearance layer for @maya; conflicting same-scope layers cannot be chosen automatically',
    )
  })

  it('F: blocks historical unresolved Character plus appearance authority before dispatch', () => {
    const request = base([
      { role: 'character', tag: '@maya', name: 'Maya', path: '/maya.png', mediaType: 'image', slot: 'reference' },
      { role: 'wardrobe', tag: '@maya-coat', path: '/coat.png', mediaType: 'image', slot: 'reference', boundCharacterTag: '@maya' },
    ], [
      { panelId: 'shot-f', prompt: '@maya enters the station.', duration: 4, shotSize: 'wide', camera: 'static' },
    ])

    expect(generationRequirementFailures(request)).toContain(
      'resolve @maya body authority: use/select a precomposed complete dressed-body Character authority and suppress separate Wardrobe, or explicitly assign same-body appearance owner and scope',
    )
    expect(compileProviderPrompt(request).text).not.toContain('@maya-coat')
    expect(orderedProviderImageReferences(request).map((reference) => reference.tag)).toEqual(['@maya'])

    const ambiguous = base([
      { role: 'character', tag: '@maya', path: '/maya.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'identity-body-with-layers' },
      { role: 'wardrobe', tag: '@coat', path: '/coat.png', mediaType: 'image', slot: 'reference', appearanceSelection: 'explicit-replacement' },
    ], [{ panelId: 'shot-f', prompt: '@maya enters.', duration: 4, shotSize: 'wide', camera: 'static' }])
    expect(generationRequirementFailures(ambiguous)).toContain('resolve @coat owner: select one connected Character body')
  })

  it('I: propagates persisted Character and Wardrobe authority through Storyboard into the executable request', () => {
    const character = node('maya', 'character', {
      title: 'Maya', referenceTag: '@maya', characterAuthorityMode: 'identity-body-with-layers',
      referenceAssets: [{ id: 'maya-ref', name: 'maya.png', path: '/maya.png', mimeType: 'image/png', createdAt: '', metadata: { identityDescription: 'Approved Maya identity.' } }],
    })
    const wardrobe = node('coat', 'wardrobe', {
      title: 'Coat', referenceTag: '@maya-coat', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement', appearanceShotIds: ['shot-i'],
      referenceAssets: [{ id: 'coat-ref', name: 'coat.png', path: '/coat.png', mimeType: 'image/png', createdAt: '' }],
    })
    const storyboard = node('storyboard', 'storyboard', {
      storyboardPanels: [{ id: 'shot-i', prompt: '@maya enters.', duration: 4, shotSize: 'wide', camera: 'static' }], storyboardDuration: 4,
    })
    const video = node('video', 'video-generator', { promptMode: 'auto', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 4 })
    const edges: Edge[] = [
      { id: 'coat-maya', source: 'coat', sourceHandle: 'media-out', target: 'maya', targetHandle: 'wardrobe-in' },
      { id: 'maya-storyboard', source: 'maya', sourceHandle: 'media-out', target: 'storyboard', targetHandle: 'character-in' },
      { id: 'storyboard-video', source: 'storyboard', sourceHandle: 'media-out', target: 'video', targetHandle: 'storyboard-in' },
    ]

    const request = buildGenerationRequest(video, [character, wardrobe, storyboard, video], edges)
    expect(request.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: '@maya', characterAuthorityMode: 'identity-body-with-layers' }),
      expect.objectContaining({ tag: '@maya-coat', boundCharacterTag: '@maya', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement', appearanceShotIds: ['shot-i'] }),
    ]))
    expect(generationRequirementFailures(request)).toEqual([])
    const submitted = compileProviderPromptForSubmission(request).text
    expect(submitted).toContain("Use @maya-coat for @maya's wardrobe.")
    expect(submitted).toContain('Approved Maya identity.')
    const adapter = providerSeedancePayloadCompilation(request).text
    expect(adapter).toMatch(/Use @Image\d+ for @Image\d+'s wardrobe\./)
    const manifest = buildStoryboardConnectedContextManifest('storyboard', [character, wardrobe, storyboard, video], edges, '@maya enters.', storyboard.data.storyboardPanels![0])
    expect(manifest.text).toContain('body-authority=identity-body-with-layers')
    expect(manifest.text).toContain('anchor=@maya-coat | role=Appearance | owner=@maya | scope=wardrobe | selection=explicit-replacement | shots=shot-i')
    const revamp = storyboardRewriteInstruction(storyboard.data.storyboardPanels!, 'shot-i', manifest.text)
    expect(revamp).toContain('Never split one Character body or promote an appearance layer to a person, cast member, tableau, or independent state entry.')
    expect(() => validateStoryboardRewrite('@maya enters.', '@maya enters beside @maya-coat as a second person and cast member.', manifest)).toThrow('Revamp split one Character body or promoted an appearance layer into cast/tableau state.')
  })
})
