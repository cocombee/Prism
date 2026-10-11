import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { GenerationRequest, ImportedAsset, StudioNode, StudioNodeData } from './types'
import { buildGenerationRequest } from './workflowResolver'
import { providerPromptPreviewCompilation, providerSeedancePayloadCompilation } from './referenceInstructions'

const asset = (id: string, name: string, category: ImportedAsset['category'], metadata: ImportedAsset['metadata'] = {}): ImportedAsset => ({
  id, name, path: `/project/${name}`, mimeType: 'image/png', category, origin: 'imported', createdAt: '2026-08-23T00:00:00.000Z', metadata,
})
const node = (id: string, kind: StudioNodeData['kind'], data: Partial<StudioNodeData> = {}): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...data } })
const edge = (source: string, target: string, targetHandle: string): Edge => ({ id: `${source}-${target}-${targetHandle}`, source, sourceHandle: 'media-out', target, targetHandle })

describe('saved graph secret Seedance prompt', () => {
  it('compiles every direct and transitive authority without a one-character prompt trigger', () => {
    const video = node('video', 'video-generator', { prompt: '', promptMode: 'auto', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 4, aspectRatio: '16:9', resolution: '720p' })
    const actorC = node('actor-c', 'character', { referenceTag: '@actor-c', characterInputMode: 'single', characterAuthorityMode: 'identity-body-with-layers', referenceAssets: [asset('actor-c-face', 'actor-c.png', 'character', { characterView: 'front' })] })
    const actorD = node('actor-d', 'character', { referenceTag: '@actor-d', characterInputMode: 'single', characterAuthorityMode: 'identity-body-with-layers', referenceAssets: [asset('actor-d-face', 'actor-d.png', 'character', { characterView: 'front' })] })
    const wardrobeC = node('wardrobe-c', 'wardrobe', { referenceTag: '@video-05-scene-01-kawan-malay-f', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement', referenceAssets: [asset('wardrobe-c-image', 'wardrobe-c.png', 'wardrobe')] })
    const wardrobeD = node('wardrobe-d', 'wardrobe', { referenceTag: '@video-05-scene-01-birthday-boy-chinese-c', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement', referenceAssets: [asset('wardrobe-d-image', 'wardrobe-d.png', 'wardrobe')] })
    const location = node('location', 'location', { referenceTag: '@video-01-scene-01-harga-kedai-living-room', referenceAssets: [asset('location-image', 'living-room.png', 'location')] })
    const style = node('style', 'style-reference', { referenceTag: '@cinematic-naturalism', stylePrompt: 'Grounded cinematic naturalism, restrained color, natural texture.' })
    const phone = node('phone', 'element', { referenceTag: '@video-01-scene-01-telefon-pintar-customer', referenceAssets: [asset('phone-image', 'phone.png', 'element', { elementView: 'three-quarter' })] })
    const nodes = [video, actorC, actorD, wardrobeC, wardrobeD, location, style, phone]
    const edges = [
      edge('wardrobe-c', 'actor-c', 'wardrobe-in'), edge('wardrobe-d', 'actor-d', 'wardrobe-in'),
      edge('actor-c', 'video', 'character-in'), edge('actor-d', 'video', 'character-in'), edge('location', 'video', 'location-in'), edge('style', 'video', 'style-in'), edge('phone', 'video', 'element-in'),
    ]

    const request = buildGenerationRequest(video, nodes, edges)
    expect(request.authoredPrompt || '').toBe('')
    expect(request.references).toHaveLength(6)
    expect(request.connectionRules).toHaveLength(7)
    expect(request.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: '@video-05-scene-01-kawan-malay-f', role: 'wardrobe', boundCharacterTag: '@actor-c' }),
      expect.objectContaining({ tag: '@video-05-scene-01-birthday-boy-chinese-c', role: 'wardrobe', boundCharacterTag: '@actor-d' }),
    ]))

    const preview = providerPromptPreviewCompilation(request)
    const boundTags = ['@actor-c', '@actor-d', '@video-05-scene-01-kawan-malay-f', '@video-05-scene-01-birthday-boy-chinese-c', '@video-01-scene-01-harga-kedai-living-room', '@video-01-scene-01-telefon-pintar-customer']
    for (const tag of boundTags) expect(preview.text).toContain(tag)
    expect(preview.text).toContain('No action or Character performance is inferred from connected references')
    expect(preview.text).not.toMatch(/restrained, specific performance|breath|micro-hesitation/i)
    expect(preview.text).toContain('Use @actor-c as actor-c.')
    expect(preview.text).toContain('Use @video-05-scene-01-kawan-malay-f for @actor-c\'s wardrobe.')
    expect(preview.text).toContain('Use @actor-d as actor-d.')
    expect(preview.text).toContain('Use @video-05-scene-01-birthday-boy-chinese-c for @actor-d\'s wardrobe.')
    expect(preview.text).not.toContain('remains worn only by')
    expect(preview.text).not.toMatch(/@(Image|Video|Audio)\d+/)
    expect(preview.text).toContain('Use cinematic-naturalism for the visual style.')
    expect(preview.text).not.toContain('@cinematic-naturalism')
    const scene = preview.blocks.find((block) => block.label === 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY')!.text
    expect(scene).toContain('@video-01-scene-01-harga-kedai-living-room')
    expect(scene).not.toContain('@video-01-scene-01-telefon-pintar-customer')
    const props = preview.blocks.find((block) => block.label === 'WARDROBE, ACCESSORY, AND PROP CONTINUITY')!.text
    expect(props).toContain('@video-01-scene-01-telefon-pintar-customer')
    expect(preview.blocks.at(-1)?.label).toBe('Reference roles')

    const payload = providerSeedancePayloadCompilation(request)
    expect(payload.text).toContain('Use [Image2] as actor-c.')
    expect(payload.text).toContain('Use [Image1] for [Image2]\'s wardrobe.')
    expect(payload.text).toContain('Use [Image4] as actor-d.')
    expect(payload.text).toContain('Use [Image3] for [Image4]\'s wardrobe.')
    expect(payload.text).not.toContain('remains worn only by')
    expect(payload.text).not.toMatch(/@actor-[cd]\b/)
    expect(payload.text).not.toMatch(/@video-0[15]-scene-/)
    expect(payload.text).not.toContain('[Image7]')
  })

  it('binds every selected view of one semantic identity through its provider slots', () => {
    const request: GenerationRequest = {
      nodeId: 'video',
      kind: 'video-generator',
      prompt: '',
      authoredPrompt: '',
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [
        { role: 'character', tag: '@actor-c', slot: 'reference', mediaType: 'image', path: '/project/actor-c-front.png', view: 'front' },
        { role: 'character', tag: '@actor-c', slot: 'reference', mediaType: 'image', path: '/project/actor-c-profile.png', view: 'profile' },
      ],
      connectionRules: [{ tag: '@actor-c', label: 'Character Identity', rule: 'HARD RULE · identity' }],
    }
    const preview = providerPromptPreviewCompilation(request)
    expect(preview.text).toContain('Use @actor-c as actor-c.')
    expect(preview.text).toContain('@actor-c retains the exact connected Character identity')
    expect(preview.text).not.toMatch(/@Image\d+/)
    const payload = providerSeedancePayloadCompilation(request)
    expect(payload.text).toContain('[Image1] + [Image2]')
    expect(payload.text).toContain('Use [Image1] + [Image2] as actor-c.')
    expect(payload.text).toContain('[Image1] + [Image2] retains the exact connected Character identity')
    expect(payload.text).not.toContain('@actor-c')
  })

  it('keeps a manual text authority plain instead of inventing an unreferenced image slot', () => {
    const request: GenerationRequest = {
      nodeId: 'video',
      kind: 'video-generator',
      prompt: '',
      authoredPrompt: '',
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      stylePrompt: 'Grounded cinematic naturalism with restrained color and natural texture.',
      connectionRules: [{ tag: '@cinematic-naturalism', label: 'Style', rule: 'HARD RULE · style' }],
    }
    const preview = providerPromptPreviewCompilation(request)
    expect(preview.text).toContain('Use cinematic-naturalism for the visual style.')
    expect(preview.text).not.toContain('@cinematic-naturalism')
    expect(preview.text).not.toMatch(/@Image\d+/)
    expect(providerSeedancePayloadCompilation(request).text).not.toMatch(/@Image\d+/)
  })

  it('returns a complete authored Seedance master prompt byte-for-byte without automatic completion', () => {
    const authored = `STYLE PREFIX — grounded photoreal crime-comedy
CAMERA — GLOBAL RULE
Strong unstabilised handheld movement in every shot.
FORMAT AND CUTS
TWO SHOTS, ONE HARD CUT, 8s total.
SCENE CONTEXT
Night interior after the smash.
ACTIVE REFERENCES
@actor-c — exact Character identity.
WORLD AND LIGHTING
Oxblood practical interior with cold window fill.
CONTINUITY AND DIALOGUE-TARGET LOCK
Identity, wardrobe, geometry, and eyelines remain fixed.
VOICES
Actor C uses the authored British voice.
AUDIO
Diegetic room tone only.
SHOT 1 — WIDE, 4s
@actor-c crosses the room. HARD CUT.
SHOT 2 — MEDIUM, 4s
@actor-c stops at the desk.
CHARACTER ACTING
Performance follows the authored actions only.
PHYSICS
Grounded weight and contact.
STYLE
Photoreal 35mm finish.
QUALITY
Natural anatomy and optics.
POSITIVE CONSTRAINTS
Preserve every authored lock.
NEGATIVE PROMPT
identity drift, geometry morphing`
    const request: GenerationRequest = {
      nodeId: 'video', kind: 'video-generator', prompt: authored, authoredPrompt: authored,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [{ role: 'character', tag: '@actor-c', slot: 'reference', mediaType: 'image', path: '/project/actor-c.png' }],
      connectionRules: [{ tag: '@actor-c', label: 'Character Identity', rule: 'HARD RULE · identity' }],
    }
    const preview = providerPromptPreviewCompilation(request)
    expect(preview.text).toBe(authored)
    expect(preview.blocks).toHaveLength(1)
    expect(preview.blocks[0].label).toBe('Authored master prompt')
  })

  it('preserves a partial structured prompt once and appends only uncovered domains', () => {
    const authored = `FORMAT AND CUTS
TWO SHOTS, ONE HARD CUT, 4s total.
SHOT 1 — WIDE, 3s
The character waits. HARD CUT.
SHOT 2 — MEDIUM, 1s
The character turns.`
    const request: GenerationRequest = {
      nodeId: 'video', kind: 'video-generator', prompt: authored, authoredPrompt: authored,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [{ role: 'character', tag: '@actor-c', slot: 'reference', mediaType: 'image', path: '/project/actor-c.png' }],
      connectionRules: [{ tag: '@actor-c', label: 'Character Identity', rule: 'HARD RULE · identity' }],
      storyboardShots: [
        { prompt: 'The character waits.', duration: 3, shotSize: 'wide', camera: 'static' },
        { prompt: 'The character turns.', duration: 1, shotSize: 'medium', camera: 'static' },
      ],
    }
    const preview = providerPromptPreviewCompilation(request)
    expect(preview.text.match(/FORMAT AND CUTS/g)).toHaveLength(1)
    expect(preview.text.match(/SHOT 1 — WIDE, 3s/g)).toHaveLength(1)
    expect(preview.text).toContain('REFERENCE AUTHORITY')
    expect(preview.text).not.toContain('\nFORMAT MODE\n')
    expect(preview.text).not.toContain('\nTIMELINE AND CONTINUOUS ACTION\n')
  })
})
