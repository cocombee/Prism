import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import {
  NATURAL_SKIN_NEGATIVE_TERMS,
  NATURAL_SKIN_POSITIVE_CLAUSES,
  compileNaturalSkinProviderPrompt,
  naturalSkinQualification,
} from './naturalSkinRendering'

const request = (overrides: Partial<GenerationRequest> = {}): GenerationRequest => ({
  nodeId: 'natural-skin-video',
  kind: 'video-generator',
  prompt: 'A visible organic human woman waits in a physically photographed live-action room.',
  authoredPrompt: 'A visible organic human woman waits in a physically photographed live-action room.',
  references: [{ role: 'character', tag: '@mara', description: 'Visible organic human woman, age 42, warm brown complexion.', slot: 'reference' }],
  stylePrompt: 'Explicit photoreal live-action photography.',
  ...overrides,
})

describe('natural skin rendering qualification', () => {
  it('qualifies only explicit photographed organic-human provenance', () => {
    expect(naturalSkinQualification(request())).toEqual(expect.objectContaining({
      qualified: true,
      reason: 'qualified-explicit-photographed-organic-human',
      humanEvidence: 'authored-and-character-reference',
      photographedEvidence: 'authored-and-selected-style',
    }))
  })

  it('fails closed when a visible organic human is not explicitly established', () => {
    expect(naturalSkinQualification(request({
      prompt: 'A brass flight case waits in a photographed room.',
      authoredPrompt: 'A brass flight case waits in a photographed room.',
      references: [{ role: 'element', tag: '@case', description: 'Brass flight case.', slot: 'reference' }],
    }))).toEqual(expect.objectContaining({ qualified: false, reason: 'omitted-human-not-explicitly-established' }))
  })

  it('fails closed when a human is only offscreen or otherwise not visibly established', () => {
    expect(naturalSkinQualification(request({
      prompt: 'An empty photographed room carries an organic human woman’s offscreen voice.',
      authoredPrompt: 'An empty photographed room carries an organic human woman’s offscreen voice.',
      references: [],
    }))).toEqual(expect.objectContaining({ qualified: false, reason: 'omitted-human-not-explicitly-established' }))
  })

  it('fails closed when photographed intent is absent and ignores compiler-owned universal filler', () => {
    expect(naturalSkinQualification(request({
      prompt: 'A visible organic human woman waits.',
      authoredPrompt: 'A visible organic human woman waits.',
      stylePrompt: undefined,
    }))).toEqual(expect.objectContaining({ qualified: false, reason: 'omitted-photographed-intent-not-explicitly-established' }))
  })

  it.each(['robot android', 'mannequin doll', 'plastic skin', 'porcelain skin', 'cartoon anime illustration', 'clay stop-motion'])(
    'suppresses explicit incompatible treatment: %s',
    (treatment) => {
      expect(naturalSkinQualification(request({
        authoredPrompt: `A visible organic human woman appears in live-action photography with intentional ${treatment} treatment.`,
        prompt: `A visible organic human woman appears in live-action photography with intentional ${treatment} treatment.`,
      }))).toEqual(expect.objectContaining({ qualified: false, reason: 'omitted-explicit-incompatible-treatment' }))
    },
  )
})

describe('natural skin hidden provider compilation', () => {
  const ownedBase = `SCENE CONTEXT
A visible organic human woman waits in a physically photographed live-action room.

IDENTITY AND ANATOMY CONTINUITY
@mara identity constants: Organic human woman, age 42, warm brown complexion, authored freckles and makeup.

LIGHTING
Window key only.

CAMERA
Pan right.

TIMELINE AND CONTINUOUS ACTION
At 2s Mara looks back; Ivo reacts at 3s.

LENS AND OPTICS
Authored 50mm lens and shallow focus.

LOOK AND CAPTURE CHARACTER
Explicit photoreal live-action photography with authored copper finish.

FILMIC MOTION RENDERING
Existing verified Filmic Motion bytes.

NEGATIVE PROMPT
identity drift, frame blending`

  it('adds the exact approved positive clauses and all 12 negative terms only to qualified provider text', () => {
    const result = compileNaturalSkinProviderPrompt(request(), ownedBase)
    expect(result.qualification.qualified).toBe(true)
    expect(result.text).toContain(`NATURAL SKIN TEXTURE\n${NATURAL_SKIN_POSITIVE_CLAUSES.join('\n\n')}`)
    for (const term of NATURAL_SKIN_NEGATIVE_TERMS) expect(result.text).toContain(term)
  })

  it('deduplicates equivalent owned clauses and terms case-insensitively while preserving every authored byte', () => {
    const authored = `${ownedBase}\n${NATURAL_SKIN_POSITIVE_CLAUSES[0].toUpperCase()}\nPLASTIC SKIN, Waxy Skin`
    const result = compileNaturalSkinProviderPrompt(request(), authored)
    expect(result.text.match(/Render natural photographed human skin with visible pore-level texture/gi)).toHaveLength(1)
    expect(result.text.match(/plastic skin/gi)).toHaveLength(1)
    expect(result.text.match(/waxy skin/gi)).toHaveLength(1)
    expect(result.text).toContain(authored)
  })

  it('changes no owned identity, lighting, camera/action, timing/composition/lens/focus, Style, or Filmic Motion bytes', () => {
    const result = compileNaturalSkinProviderPrompt(request(), ownedBase)
    for (const exact of [
      '@mara identity constants: Organic human woman, age 42, warm brown complexion, authored freckles and makeup.',
      'Window key only.',
      'Pan right.',
      'At 2s Mara looks back; Ivo reacts at 3s.',
      'Authored 50mm lens and shallow focus.',
      'Explicit photoreal live-action photography with authored copper finish.',
      'Existing verified Filmic Motion bytes.',
    ]) expect(result.text).toContain(exact)
    expect(result.text).not.toMatch(/asymmetric mole|new scar|new light|dolly|grain|halation|palette|grade/i)
  })
})
