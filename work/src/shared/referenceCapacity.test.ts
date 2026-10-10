import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { referenceCapacityFailures, seedanceReferenceCandidates } from './referenceCapacity'
import { assertGenerationRequirements, generationRequirementFailures } from './generationReadiness'
import { providerSeedancePayloadCompilation } from './referenceInstructions'

type Reference = NonNullable<GenerationRequest['references']>[number]
const refs = (count: number, mediaType: 'image' | 'video' | 'audio' = 'image'): Reference[] => Array.from({ length: count }, (_, i) => ({ role: 'reference', mediaType, path: `/fixture/${mediaType}-${i}`, tag: `@${mediaType}-${i}` }))
const request = (references: Reference[], patch: Partial<GenerationRequest> = {}): GenerationRequest => ({ kind: 'video-generator', nodeId: 'video', videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: 'Keep every assigned identity.', providerPromptOverride: 'Use @image-0 and @video-0.', references, ...patch })

describe('physical reference capacity before provider preparation', () => {
  it('allows the complete fifty-reference set without modifying its records', () => {
    const references = [...refs(30), ...refs(10, 'video'), ...refs(10, 'audio')]
    expect(generationRequirementFailures(request(references))).toEqual([])
    expect(seedanceReferenceCandidates(request(references))).toEqual(references)
  })

  it.each([['image', 31], ['video', 11], ['audio', 11]] as const)('blocks %s overflow even below fifty total', (type, count) => {
    const draft = request(type === 'image' ? refs(count) : [...refs(1), ...refs(count, type)])
    expect(() => assertGenerationRequirements(draft)).toThrow(/accepts at most/)
  })

  it('blocks total overflow and retains every original for repair', () => {
    const references = [...refs(31), ...refs(10, 'video'), ...refs(10, 'audio')]
    const failures = generationRequirementFailures(request(references))
    expect(failures).toHaveLength(2)
    expect(failures.join('; ')).toContain('50 total references; connected 51')
    expect(references).toHaveLength(51)
  })

  it('uses the exact selected model capacity, preserving older routes', () => {
    expect(generationRequirementFailures(request(refs(20)))).toEqual([])
    expect(() => assertGenerationRequirements(request(refs(20), { videoEngine: 'bytedance/seedance-2.0/reference-to-video' }))).toThrow(/at most 9 images/)
  })

  it('counts a distinct direct input once and preserves a source-video role', () => {
    const duplicate = request(refs(30), { inputPath: '/fixture/image-0', inputTag: '@image-0' })
    expect(seedanceReferenceCandidates(duplicate)).toHaveLength(30)
    expect(generationRequirementFailures(duplicate)).toEqual([])
    expect(() => assertGenerationRequirements({ ...duplicate, inputPath: '/fixture/new-image' })).toThrow(/connected 31/)
    const video = request(refs(1), { inputPath: '/fixture/source.mp4', inputRole: 'source-video', inputTag: '@motion', providerPromptOverride: 'Match @motion.' })
    expect(seedanceReferenceCandidates(video)[0]).toMatchObject({ mediaType: 'video', slot: 'reference', tag: '@motion' })
    expect(providerSeedancePayloadCompilation(video).text).toBe('Match [Video1].')
  })

  it('counts separate views individually and a compiled sheet as one physical file', () => {
    const views = refs(9).map((reference, i) => ({ ...reference, role: 'character' as const, tag: '@hero', view: (['front', 'profile', 'back'] as const)[i % 3] }))
    expect(seedanceReferenceCandidates(request(views))).toHaveLength(9)
    const sheet: Reference = { role: 'character', path: '/fixture/sheet.png', tag: '@hero' }
    expect(seedanceReferenceCandidates(request([sheet]))).toEqual([sheet])
  })

  it('suppresses only explicit body-authority redundancy, retaining physical records with shared paths', () => {
    const character: Reference = { role: 'character', path: '/fixture/hero.png', tag: '@hero', characterAuthorityMode: 'complete-dressed-body' }
    const layer: Reference = { role: 'wardrobe', path: '/fixture/coat.png', tag: '@coat', boundCharacterTag: '@hero', appearanceScope: 'wardrobe', appearanceSelection: 'redundant' }
    const draft = request([...refs(29), character, layer])
    expect(seedanceReferenceCandidates(draft)).toHaveLength(30)
    expect(generationRequirementFailures(draft)).toEqual([])
    expect(seedanceReferenceCandidates(request([character, { ...character, tag: '@other' }]))).toHaveLength(2)
  })

  it('takes verified capacity as data, so a future supported contract can allow fifty images', () => {
    const limits = { images: 50, videos: 20, audios: 20, total: 50 }
    expect(referenceCapacityFailures(refs(50), limits, 'Hypothetical contract')).toEqual([])
    expect(referenceCapacityFailures(refs(51), limits, 'Hypothetical contract')).toHaveLength(2)
  })
})
