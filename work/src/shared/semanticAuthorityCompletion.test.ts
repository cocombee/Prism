import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { semanticAuthorityCompletion } from './semanticAuthorityCompletion'

const request = (authoredPrompt = ''): GenerationRequest => ({
  nodeId: 'video',
  kind: 'video-generator',
  prompt: authoredPrompt,
  authoredPrompt,
  videoEngine: 'bytedance/seedance-2.5/reference-to-video',
  references: [
    { role: 'character', tag: '@actor-c', slot: 'reference', mediaType: 'image' },
    { role: 'wardrobe', tag: '@wardrobe-c', boundCharacterTag: '@actor-c', slot: 'reference', mediaType: 'image' },
    { role: 'character', tag: '@actor-d', slot: 'reference', mediaType: 'image' },
    { role: 'wardrobe', tag: '@wardrobe-d', boundCharacterTag: '@actor-d', slot: 'reference', mediaType: 'image' },
    { role: 'location', tag: '@room', slot: 'reference', mediaType: 'image' },
  ],
  connectionRules: [
    { tag: '@actor-c', label: 'Character Identity', rule: 'HARD RULE · identity' },
    { tag: '@wardrobe-c', label: 'Wardrobe', rule: 'HARD RULE · binding' },
    { tag: '@actor-d', label: 'Character Identity', rule: 'HARD RULE · identity' },
    { tag: '@wardrobe-d', label: 'Wardrobe', rule: 'HARD RULE · binding' },
    { tag: '@room', label: 'Location', rule: 'HARD RULE · geometry' },
    { tag: '@look', label: 'Style', rule: 'HARD RULE · style' },
  ],
})

describe('semantic authority completion', () => {
  it('supplies one missing authority and one continuity clause per semantic tag without performance', () => {
    const plan = semanticAuthorityCompletion(request())
    expect(plan.authorityLines.join('\n')).toContain('@wardrobe-c governs the wardrobe of @actor-c')
    expect(plan.authorityLines.join('\n')).toContain('@wardrobe-d governs the wardrobe of @actor-d')
    expect(plan.characterContinuityLines).toHaveLength(2)
    expect(plan.wardrobeContinuityLines).toHaveLength(2)
    expect(plan.sceneContinuityLines).toEqual([expect.stringContaining('@room')])
    expect(plan.styleContinuityLines).toEqual([expect.stringContaining('@look')])
    expect(JSON.stringify(plan)).not.toMatch(/breath|gaze|micro-hesitation|performance/i)
  })

  it('emits no equivalent secret domain clauses when every exact tag is fully governed in authored text', () => {
    const authored = [
      '@actor-c exact identity, face, anatomy and body proportions remain consistent through motion, occlusion and every cut.',
      '@actor-d exact identity, face, anatomy and body proportions remain consistent through motion, occlusion and every cut.',
      '@wardrobe-c governs the wardrobe of @actor-c; garment silhouette, construction, materials, colors, patterns, layering, fit, accessories and worn state remain unchanged across every shot; never transfer it to another character.',
      '@wardrobe-d governs the wardrobe of @actor-d; garment silhouette, construction, materials, colors, patterns, layering, fit, accessories and worn state remain unchanged across every shot; never transfer it to another character.',
      '@room preserves exact environment layout, geometry, perspective, scale, atmosphere and lighting with persistent continuity across every shot.',
      '@look preserves visual language, medium, rendering, palette, texture, lens and finish consistently across every shot without copying depicted subjects.',
    ].join('\n')
    const plan = semanticAuthorityCompletion(request(authored))
    expect(plan.authorityLines).toEqual([])
    expect(plan.characterContinuityLines).toEqual([])
    expect(plan.wardrobeContinuityLines).toEqual([])
    expect(plan.sceneContinuityLines).toEqual([])
    expect(plan.styleContinuityLines).toEqual([])
  })

  it('adds only missing Wardrobe domains and never leaks between bound Character pairs', () => {
    const authored = '@wardrobe-c materials and colors remain unchanged across every shot.'
    const plan = semanticAuthorityCompletion(request(authored))
    const wardrobeC = plan.authorityLines.find((line) => line.includes('@wardrobe-c')) || ''
    expect(wardrobeC).toContain('governs the wardrobe of @actor-c')
    expect(wardrobeC).toMatch(/never transfer|another character/i)
    expect(wardrobeC).not.toMatch(/materials|colors/i)
    expect(wardrobeC).not.toContain('@actor-d')
    const wardrobeD = plan.authorityLines.find((line) => line.includes('@wardrobe-d')) || ''
    expect(wardrobeD).toContain('@actor-d')
    expect(wardrobeD).not.toContain('@actor-c')
  })
})
