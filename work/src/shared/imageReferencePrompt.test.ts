import { describe, expect, it } from 'vitest'
import { orderedProviderImageReferences, providerArtworkCarrierRequest, providerNativeImagePrompt, providerPromptPreview } from './referenceInstructions'
import type { GenerationRequest } from './types'

const request: GenerationRequest = {
  nodeId: 'image', kind: 'image-generator', prompt: 'Place @analisa on the lowest card, @masters on the middle card, and @person beside them.',
  connectionRules: [
    { tag: '@analisa', label: 'Image Reference', rule: 'Preserve the artwork exactly.' },
    { tag: '@masters', label: 'Image Reference', rule: 'Preserve the artwork exactly.' },
    { tag: '@person', label: 'Character Identity', rule: 'Preserve identity.' },
  ],
  references: [
    { role: 'reference', tag: '@analisa', path: '/project/analisa.png', mediaType: 'image', slot: 'reference' },
    { role: 'reference', tag: '@masters', path: '/project/masters.png', mediaType: 'image', slot: 'reference' },
    { role: 'character', tag: '@person', path: '/project/person-sheet.jpg', mediaType: 'image', slot: 'reference', sourceViews: ['front', 'profile'] },
  ],
}

describe('provider-native image reference prompts', () => {
  it('replaces internal asset tags with the exact anonymous provider image order', () => {
    const prompt = providerNativeImagePrompt(request)
    expect(prompt).toContain('Place Reference Image 1 on the lowest card, Reference Image 2 on the middle card, and Reference Image 3 beside them.')
    expect(prompt).toContain('Reference Image 1 — Image Reference')
    expect(prompt).not.toContain('@analisa')
    expect(prompt).not.toContain('@masters')
    expect(prompt).not.toContain('@person')
    expect(prompt).toContain('Never render, print, typeset, caption, or reproduce these identifiers')
    expect(prompt).toContain('exact placement assignment; preserve its number-to-source and source-to-location mapping')
    expect(prompt).toContain('Do not output an at sign, username, handle, slug, node name, layer name, file name, placeholder, or variable label.')
    expect(prompt).toContain('Attached artwork, logos, marks, and lettering are authoritative source pixels, not inspiration.')
    expect(prompt).toContain('Never add any logo, word, or mark that is absent from both the authored prompt and the attached source pixels.')
    expect(prompt).toContain('Do not infer surrounding, associated, or topical text from a source image.')
    expect(prompt).toContain('rather than inventing or substituting content')
    expect(providerPromptPreview(request)).toBe(prompt)
  })

  it('groups multiple submitted views sharing one logical tag', () => {
    const multiView: GenerationRequest = { ...request, references: [
      request.references![0],
      { role: 'character', tag: '@person', path: '/project/person-front.jpg', mediaType: 'image', slot: 'reference' },
      { role: 'character', tag: '@person', path: '/project/person-side.jpg', mediaType: 'image', slot: 'reference' },
    ] }
    expect(providerNativeImagePrompt(multiView)).toContain('Reference Images 2, 3 beside them.')
  })

  it('deduplicates a repeated primary image without changing later numbering', () => {
    const withPrimary: GenerationRequest = { ...request, inputPath: '/project/analisa.png', inputTag: '@analisa' }
    expect(orderedProviderImageReferences(withPrimary).map((reference) => reference.path)).toEqual([
      '/project/analisa.png', '/project/masters.png', '/project/person-sheet.jpg',
    ])
  })

  it('keeps four artwork placements and a separate character reference in exact submitted order', () => {
    const composed: GenerationRequest = {
      ...request,
      prompt: 'Lowest: @analisa. Middle: @kewangan. Highest: @pentadbiran. Rosette: @bursa. Figure: @person.',
      connectionRules: [],
      references: [
        { role: 'character', tag: '@person', path: '/project/person-sheet.jpg', mediaType: 'image' },
        { role: 'reference', tag: '@bursa', path: '/project/bursa.png', mediaType: 'image' },
        { role: 'reference', tag: '@analisa', path: '/project/analisa.png', mediaType: 'image' },
        { role: 'reference', tag: '@pentadbiran', path: '/project/pentadbiran.png', mediaType: 'image' },
        { role: 'reference', tag: '@kewangan', path: '/project/kewangan.png', mediaType: 'image' },
      ],
    }
    expect(orderedProviderImageReferences(composed).map((reference) => reference.tag)).toEqual([
      '@analisa', '@kewangan', '@pentadbiran', '@bursa', '@person',
    ])
    expect(providerNativeImagePrompt(composed)).toContain('Lowest: Reference Image 1. Middle: Reference Image 2. Highest: Reference Image 3. Rosette: Reference Image 4. Figure: Reference Image 5.')
  })

  it('derives the same ordinal order from every graph-edge permutation', () => {
    const references = request.references!
    const permutations = references.flatMap((first, firstIndex) => references
      .filter((_candidate, index) => index !== firstIndex)
      .flatMap((second, secondIndex, remaining) => remaining
        .filter((_candidate, index) => index !== secondIndex)
        .map((third) => [first, second, third])))
    for (const shuffled of permutations) {
      const candidate = { ...request, references: shuffled }
      expect(orderedProviderImageReferences(candidate).map((reference) => reference.tag)).toEqual(['@analisa', '@masters', '@person'])
      const prompt = providerNativeImagePrompt(candidate)
      expect(prompt).not.toMatch(/@(analisa|masters|person)\b/)
      expect(prompt).toContain('Place Reference Image 1 on the lowest card, Reference Image 2 on the middle card, and Reference Image 3 beside them.')
    }
  })

  it('removes exact artwork from the model request and compiles blank post-composite carriers without changing the authored request', () => {
    const exact: GenerationRequest = {
      ...request,
      references: request.references!.map((reference, index) => index < 2 ? { ...reference, fidelity: 'lock' } : reference),
    }
    const compiled = providerArtworkCarrierRequest(exact)
    expect(exact.prompt).toContain('@analisa')
    expect(compiled.references?.map((reference) => reference.tag)).toEqual(['@person'])
    expect(compiled.prompt).toContain('Reserved Blank Carrier 1 on the lowest card, Reserved Blank Carrier 2 on the middle card')
    expect(compiled.prompt).toContain('completely blank, clean, fully visible, unobstructed printable face')
    expect(compiled.prompt).toContain('at least 8% clear paper margin on every side')
    expect(compiled.prompt).toContain('the lowest placard must never overlap it or sit behind it')
    expect(compiled.prompt).toContain('Original artwork will be placed deterministically after this generation.')
    expect(compiled.prompt).not.toMatch(/@(analisa|masters)\b/)
  })
})
