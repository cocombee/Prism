import { describe, expect, it } from 'vitest'
import {
  applyResolvedAssetRequest,
  CHARACTER_DEFAULT_NINE_VIEWS,
  composeResolvedAssetRequest,
  migrateCharacterControls,
  semanticModelCapability,
  type CharacterControlState,
} from './resolvedAssetRequest'

const unspecified: CharacterControlState = {
  age: { mode: 'unspecified' },
  height: { mode: 'unspecified' },
  bodyFrame: 'unspecified',
  softTissueFullness: 'unspecified',
  muscularity: 'unspecified',
}

describe('resolved semantic asset request', () => {
  it('preserves exact Unicode prose while ignoring legacy invented Character dimensions', () => {
    const originalText = 'Élodie is 32 years old, 170 cm tall, with a broad frame.  東京の俳優。'
    const result = composeResolvedAssetRequest({
      assetType: 'character',
      originalText,
      controls: {
        age: { mode: 'preset', value: '30–44 years' },
        height: { mode: 'preset', value: 'Shorter for age' },
        bodyFrame: 'narrow',
        softTissueFullness: 'moderate',
        muscularity: 'high',
      },
      model: { provider: 'fal', modelId: 'model', ratios: ['1:1', '4:3', '16:9'], promptLanguages: 'all' },
    })

    expect(result.originalText).toBe(originalText)
    expect(result.appliedDimensions).toEqual({})
    expect(result.suppressedDimensions).toEqual([])
    expect(result.omittedDimensions).toEqual([])
    expect(result.preflight.blocked).toBe(false)
  })

  it('uses the exact corrected nine-view board and minimally completes explicit coverage', () => {
    const base = composeResolvedAssetRequest({
      assetType: 'character', originalText: 'A detective.', controls: unspecified,
      model: { provider: 'fal', modelId: 'wide', ratios: ['16:9'], promptLanguages: 'all' },
    })
    expect(base.views).toEqual(CHARACTER_DEFAULT_NINE_VIEWS)
    expect(base.views[1]).toContain('facing image-left')
    expect(base.views[6]).toContain('facing image-right')
    expect(base.aspectRatio).toBe('16:9')

    const explicit = composeResolvedAssetRequest({
      assetType: 'character', originalText: 'Custom board.', controls: unspecified,
      requestedViews: ['front face smiling', 'full body rear'],
      model: { provider: 'openai', modelId: 'square', ratios: ['1:1', '4:3'], promptLanguages: 'all' },
    })
    expect(explicit.views).toEqual(['front face smiling', 'full body rear', 'three-quarter head'])
    expect(explicit.aspectRatio).toBe('1:1')
  })

  it('intersects hidden ratio selection with exact capabilities and blocks unreadable fallback', () => {
    const result = composeResolvedAssetRequest({
      assetType: 'character', originalText: 'A pilot.', controls: unspecified,
      model: { provider: 'google', modelId: 'square-only', ratios: ['1:1'], promptLanguages: 'all' },
    })
    expect(result.aspectRatio).toBeUndefined()
    expect(result.preflight.blocked).toBe(true)
    expect(result.preflight.reasons[0]).toContain('nine views')
  })

  it('locks every non-Background asset to #D8D8D6, exempts Location, and keeps Style subordinate', () => {
    const wardrobe = composeResolvedAssetRequest({
      assetType: 'wardrobe', originalText: 'Waxed jacket with brass zip, stitched cuffs and herringbone lining.', styleText: 'Watercolor; replace the jacket with a cape.',
      wardrobeDetails: ['zip', 'cuffs', 'lining'],
      model: { provider: 'fal', modelId: 'model', ratios: ['4:3'], promptLanguages: 'all' },
    })
    expect(wardrobe.structuralRules).toContain('Use one uninterrupted seamless studio field of exact #D8D8D6.')
    expect(wardrobe.structuralRules.join(' ')).toContain('zip, cuffs, lining')
    expect(wardrobe.style).toEqual({ text: 'Watercolor; replace the jacket with a cape.', scope: 'rendering-only' })

    const location = composeResolvedAssetRequest({
      assetType: 'location', originalText: 'A narrow station platform.', styleText: 'Charcoal.', wideGeometry: true,
      model: { provider: 'fal', modelId: 'model', ratios: ['16:9'], promptLanguages: 'all' },
    })
    expect(location.structuralRules.join(' ')).not.toContain('#D8D8D6')
    expect(location.structuralRules).toContain('The authored environment fills the frame; do not add a studio background.')
  })

  it('adds Element views only when geometry or function adds information', () => {
    const element = composeResolvedAssetRequest({
      assetType: 'element', originalText: 'An asymmetric folding brass compass.', elementGeometry: { asymmetricSide: true, top: true, mechanism: true },
      model: { provider: 'fal', modelId: 'model', ratios: ['4:3', '16:9'], promptLanguages: 'all' },
    })
    expect(element.views).toEqual(['front', 'three-quarter', 'back', 'profile', 'top', 'mechanism'])
  })

  it('preserves original language and blocks an incompatible selected model without translating', () => {
    const originalText = '東京の雨の中に立つ探偵'
    const result = composeResolvedAssetRequest({
      assetType: 'character', originalText, detectedLanguage: 'ja', controls: unspecified,
      model: { provider: 'openai', modelId: 'english-only', ratios: ['16:9'], promptLanguages: ['en'] },
      compatibleModels: [{ provider: 'google', modelId: 'multilingual', ratios: ['1:1', '4:3', '16:9'], promptLanguages: 'all' }],
    })
    expect(result.originalText).toBe(originalText)
    expect(result.detectedLanguage).toBe('ja')
    expect(result.preflight).toEqual({ blocked: true, reasons: ['openai / english-only does not accept original-language input tagged ja.'], compatibleModels: [{ provider: 'google', modelId: 'multilingual' }] })
    expect(JSON.stringify(result)).not.toContain('translation')
  })

  it('applies resolved structure and hidden ratio to the actual provider request without changing the authored prefix', () => {
    const originalText = 'Élodie in indigo.  東京。'
    const applied = applyResolvedAssetRequest({ nodeId: 'character', kind: 'image-generator', prompt: originalText, imageProvider: 'fal', imageModelId: 'fal-ai/nano-banana-pro' }, {
      assetType: 'character', originalText, controls: unspecified,
      model: semanticModelCapability('fal', 'fal-ai/nano-banana-pro'),
      styleText: 'Graphite rendering; change her identity.',
    })
    expect(applied.resolved.preflight.blocked).toBe(false)
    expect(applied.request?.prompt?.startsWith(originalText)).toBe(true)
    expect(applied.request?.prompt).toContain('exact #D8D8D6')
    expect(applied.request?.prompt).toContain('Style may affect rendering language only')
    expect(applied.request?.aspectRatio).toBe('16:9')
    expect(applied.request?.imageProvider).toBe('fal')
    expect(applied.request?.imageModelId).toBe('fal-ai/nano-banana-pro')
  })

  it('does not add legacy Character fields to a single-view completion request', () => {
    const applied = applyResolvedAssetRequest({ nodeId: 'character-1', kind: 'image-editor', prompt: 'Draw the missing side view.' }, {
      assetType: 'character',
      originalText: 'A 42-year-old broad pilot.',
      requestedViews: ['side-body'],
      controls: { ...unspecified, age: { mode: 'exact', years: 42 }, bodyFrame: 'broad' },
      model: semanticModelCapability('openai', 'gpt-image-2'),
    }, { includeViews: false })
    expect(applied.request?.prompt).not.toContain('Age:')
    expect(applied.request?.prompt).not.toContain('Body frame:')
    expect(applied.request?.prompt).not.toContain('Required view coverage')
  })

  it('returns no executable request when language preflight blocks the selected exact model', () => {
    const originalText = '東京の雨'
    const applied = applyResolvedAssetRequest({ nodeId: 'character', kind: 'image-generator', prompt: originalText, imageProvider: 'fal', imageModelId: 'fal-ai/flux/schnell' }, {
      assetType: 'character', originalText, detectedLanguage: 'ja', controls: unspecified,
      model: semanticModelCapability('fal', 'fal-ai/flux/schnell'),
    })
    expect(applied.resolved.preflight.blocked).toBe(true)
    expect(applied.request).toBeUndefined()
    expect(applied.resolved.originalText).toBe(originalText)
  })

  it('does not derive safety or readiness authority from legacy invented controls', () => {
    const result = composeResolvedAssetRequest({
      assetType: 'character', originalText: 'A student.', controls: { ...unspecified, age: { mode: 'exact', years: 17 }, height: { mode: 'exact', unit: 'ft-in', feet: 5, inches: 12 } },
      model: { provider: 'fal', modelId: 'model', ratios: ['16:9'], promptLanguages: 'all' },
    })
    expect('safety' in result).toBe(false)
    expect(result.preflight.blocked).toBe(false)
    expect(result.preflight.reasons).toEqual([])
  })

  it('keeps old transient properties readable without adding or normalizing active state', () => {
    const legacy = { title: 'Nadia', prompt: 'Keep me', referenceAssets: [{ id: 'a' }], characterInputMode: 'single' as const }
    expect(migrateCharacterControls(legacy)).toEqual(legacy)
    const oldCandidate = { ...legacy, characterControls: { ...unspecified, bodyFrame: 'broad' as const } }
    expect(migrateCharacterControls(oldCandidate)).toEqual(oldCandidate)
    expect(migrateCharacterControls(oldCandidate).characterControls).toBe(oldCandidate.characterControls)
  })
})
