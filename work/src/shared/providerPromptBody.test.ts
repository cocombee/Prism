import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { compileProviderPrompt, compileProviderPromptForSubmission, providerSeedancePayloadCompilation, providerPromptPreview, visibleProviderPromptBody } from './referenceInstructions'
import { NATURAL_SKIN_NEGATIVE_TERMS, NATURAL_SKIN_POSITIVE_CLAUSES, providerNativeNaturalSkinFields } from './naturalSkinRendering'

const request: GenerationRequest = {
  nodeId: 'video', kind: 'video-generator', prompt: '@hero crosses the hall.', authoredPrompt: '@hero crosses the hall.',
  videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 8, motionCadence: 24,
  references: [{ role: 'character', tag: '@hero', description: 'Exact hero identity', path: '/hero.png', url: 'hero', mediaType: 'image', slot: 'reference' }],
  storyboardShots: [
    { prompt: '@hero enters.', duration: 4, shotSize: 'wide', camera: 'static', transitionToNext: 'continue' },
    { prompt: '@hero stops.', duration: 4, shotSize: 'close-up', camera: 'dolly-in' },
  ],
  negativePrompt: 'No identity drift.', connectionRules: [{ tag: '@hero', label: 'Character', rule: 'HARD RULE · preserve exact identity' }],
}

describe('visible provider prompt body parity', () => {
  it('uses one complete long body for Locked, preview, and submitted Seedance payload', () => {
    const locked = visibleProviderPromptBody(request)
    for (const heading of ['REFERENCE AUTHORITY', 'FORMAT MODE', 'TIMELINE AND CONTINUOUS ACTION', 'IDENTITY AND ANATOMY CONTINUITY', 'NEGATIVE PROMPT']) expect(locked).toContain(heading)
    expect(locked).not.toMatch(/ASSISTANT TASK|EDIT CONTROL|EDITABLE VARIABLE REGISTRY/)
    expect(providerPromptPreview(request)).toBe(locked)
    expect(providerSeedancePayloadCompilation(request).text).toBe(locked.replaceAll('@hero', '@Image1'))
  })
  it('returns User overrides byte-for-byte without rewrapping or duplication', () => {
    const user = 'ASSISTANT TASK\nUser-owned complete provider body.\nNEGATIVE PROMPT\nNo drift.'
    const override = { ...request, providerPromptOverride: user }
    expect(visibleProviderPromptBody(override)).toBe(user)
    expect(providerPromptPreview(override)).toBe(user)
    expect(providerSeedancePayloadCompilation(override).text).toBe(user)
  })
  it('uses fal at-tokens for both versions and preserves BytePlus 2.5 syntax in attachment order', () => {
    const refs = [
      { role: 'character' as const, tag: '@hero', description: 'Hero', path: '/hero.png', mediaType: 'image' as const, slot: 'reference' as const },
      { role: 'reference' as const, tag: '@clip', description: 'Clip', path: '/clip.mp4', mediaType: 'video' as const, slot: 'reference' as const },
      { role: 'reference' as const, tag: '@sound', description: 'Sound', path: '/sound.wav', mediaType: 'audio' as const, slot: 'reference' as const },
    ]
    const body = 'Use @hero, then @clip, then @sound.'
    expect(providerSeedancePayloadCompilation({ ...request, providerPromptOverride: body, references: refs }).text).toBe('Use @Image1, then @Video1, then @Audio1.')
    expect(providerSeedancePayloadCompilation({ ...request, videoEngine: 'bytedance/seedance-2.0/reference-to-video', providerPromptOverride: body, references: refs }).text).toBe('Use @Image1, then @Video1, then @Audio1.')
    expect(providerSeedancePayloadCompilation({ ...request, videoEngine: 'byteplus/seedance-2.5/reference-to-video', providerPromptOverride: body, references: refs }).text).toBe('Use [Image1], then [Video1], then [Audio1].')
  })

  it('shows qualified skin instructions in the exact submitted body while preserving Manual/User bytes', () => {
    const qualified: GenerationRequest = {
      ...request,
      prompt: 'A visible organic human woman crosses a physically photographed live-action hall.',
      authoredPrompt: 'A visible organic human woman crosses a physically photographed live-action hall.',
      stylePrompt: 'Selected photoreal live-action photography.',
      references: [{ role: 'character', tag: '@hero', description: 'Organic human woman, age 42, warm brown complexion and authored freckles.', path: '/hero.png', mediaType: 'image', slot: 'reference' }],
    }
    const visible = visibleProviderPromptBody(qualified)
    expect(visible).toContain('NATURAL SKIN TEXTURE')
    expect(visible).toContain(NATURAL_SKIN_NEGATIVE_TERMS[0])
    expect(visible.match(/^NEGATIVE PROMPT$/gm)).toHaveLength(1)
    expect(visible.indexOf('NATURAL SKIN TEXTURE')).toBeLessThan(visible.indexOf('NEGATIVE PROMPT'))
    expect(compileProviderPromptForSubmission(qualified).text).toBe(visible)
    const payload = providerSeedancePayloadCompilation(qualified).text
    expect(payload).toBe(visible.replaceAll('@hero', '@Image1'))
    expect(payload).toContain(`NATURAL SKIN TEXTURE\n${NATURAL_SKIN_POSITIVE_CLAUSES.join('\n\n')}`)
    for (const term of NATURAL_SKIN_NEGATIVE_TERMS) expect(payload).toContain(term)

    const manual = 'Manual/User body remains byte-exact with a visible organic human woman in selected photoreal live-action photography.'
    const manualRequest = { ...qualified, providerPromptOverride: manual }
    expect(visibleProviderPromptBody(manualRequest)).toBe(manual)
    expect(providerPromptPreview(manualRequest)).toBe(manual)
    expect(providerSeedancePayloadCompilation(manualRequest).text).toBe(manual)
    expect(compileProviderPromptForSubmission(manualRequest).text).toBe(manual)
  })

  it('passes under-limit text unchanged, compresses optional guidance, and preserves deliberate authored lock repetitions', () => {
    const typed: GenerationRequest = {
      ...request,
      storyboardShots: [{
        panelId: 's1', prompt: '@hero works.', duration: 4, shotSize: 'wide', camera: 'static', continuityGroupId: 'hall',
        activeCharacterTags: ['@hero'], characterStates: [{ characterTag: '@hero', worldPosition: 'exact doorway', currentAction: 'holds the latch', contacts: ['right hand on latch'] }],
      }],
      shotLocks: 'door stays closed\ndoor stays closed',
    }
    const unlimited = compileProviderPrompt(typed, { family: 'seedance' })
    // The fixture deliberately authors two lock lines. The compiler must emit
    // that block once, rather than normalize either authored occurrence away.
    expect(typed.shotLocks!.match(/door stays closed/g)).toHaveLength(2)
    expect(unlimited.text.split(typed.shotLocks!)).toHaveLength(2)
    const underLimit = compileProviderPrompt(typed, { family: 'seedance', ceiling: unlimited.text.length, ceilingSource: 'fixture-model-capability' })
    expect(underLimit.text).toBe(unlimited.text)
    expect(underLimit.promptBudgetDiagnostic).toMatchObject({
      modelId: 'bytedance/seedance-2.5/reference-to-video', limitSource: 'fixture-model-capability',
      measuredCharacterCount: unlimited.text.length, compressedCharacterCount: unlimited.text.length, blocking: false,
    })

    const compressedProbe = compileProviderPrompt(typed, { family: 'seedance', ceiling: unlimited.text.length - 1, ceilingSource: 'fixture-model-capability' })
    expect(compressedProbe.text.match(/door stays closed/g)).toHaveLength(2)
    expect(compressedProbe.text.split(typed.shotLocks!)).toHaveLength(2)
    expect(compressedProbe.text).toContain('CHARACTER STATE · @hero | world=exact doorway | action=holds the latch | contacts=right hand on latch')
    expect(compressedProbe.promptBudgetDiagnostic?.compressedCharacterCount).toBeLessThan(compressedProbe.promptBudgetDiagnostic!.measuredCharacterCount)

    const irreducible = compileProviderPrompt(typed, { family: 'seedance', ceiling: 500, ceilingSource: 'fixture-model-capability' })
    expect(irreducible.promptBudgetDiagnostic).toMatchObject({ modelId: 'bytedance/seedance-2.5/reference-to-video', limit: 500, limitSource: 'fixture-model-capability', blocking: true })
    expect(irreducible.promptBudgetDiagnostic?.blockingReason).toContain('mandatory continuity state was preserved without truncation')
    expect(() => compileProviderPromptForSubmission(typed, { family: 'seedance', ceiling: 500, ceilingSource: 'fixture-model-capability' })).toThrow(/blocks provider dispatch/i)
    expect(irreducible.blocks.at(-1)?.label).toBe('NEGATIVE PROMPT')
    const semanticMaster = visibleProviderPromptBody(typed)
    expect(providerPromptPreview(typed)).toBe(semanticMaster)
    expect(providerSeedancePayloadCompilation(typed).text).toBe(semanticMaster.replaceAll('@hero', '@Image1'))
  })

  it('budgets visible skin clauses before submission and preserves qualified Manual CRLF bytes', () => {
    const qualified = { ...request, prompt: 'A visible human woman in live-action photography.', authoredPrompt: 'A visible human woman in live-action photography.' }
    const full = compileProviderPrompt(qualified)
    expect(full.text).toContain('NATURAL SKIN TEXTURE')
    const limit = full.text.length
    const exact = compileProviderPromptForSubmission(qualified, { ceiling: limit })
    expect(exact.text).toBe(full.text)
    expect(exact.promptBudgetDiagnostic).toMatchObject({ measuredCharacterCount: limit, compressedCharacterCount: limit, blocking: false })
    expect(() => compileProviderPromptForSubmission(qualified, { ceiling: 50 })).toThrow(/Prompt budget blocks provider dispatch/)
    const manual = '  A visible human woman in live-action photography.\r\nNEGATIVE PROMPT\r\nUser exclusions.  '
    expect(compileProviderPromptForSubmission({ ...qualified, providerPromptOverride: manual }).text).toBe(manual)
    expect(providerSeedancePayloadCompilation({ ...qualified, providerPromptOverride: manual }).text).toBe(manual)
  })

  it('projects connected visual references as sole authority without leaking metadata and preserves one named authored delta', () => {
    const referenceExclusive: GenerationRequest = {
      ...request,
      videoEngine: 'bytedance/seedance-2.0/reference-to-video',
      prompt: '@image2 wears @image6. @image3 wears @image5 and carries @image4. Manual garment prose: a hand-knitted red scarf with two tassels.',
      authoredPrompt: '@image2 wears @image6. @image3 wears @image5 and carries @image4. Manual garment prose: a hand-knitted red scarf with two tassels.',
      references: [
        { role: 'character', tag: '@image2', path: '/character-2.png', mediaType: 'image', slot: 'reference', description: 'mustard sweater with leopard pattern', characterAuthorityMode: 'identity-body-with-layers' },
        { role: 'wardrobe', tag: '@image6', path: '/wardrobe-6.png', mediaType: 'image', slot: 'reference', boundCharacterTag: '@image2', description: 'mustard knit and leopard trim', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement' },
        { role: 'character', tag: '@image3', path: '/character-3.png', mediaType: 'image', slot: 'reference', description: 'round cyan glasses', characterAuthorityMode: 'identity-body-with-layers' },
        { role: 'element', tag: '@image5', path: '/glasses-5.png', mediaType: 'image', slot: 'reference', boundCharacterTag: '@image3', description: 'black frame and blue lenses', appearanceScope: 'glasses-accessory', appearanceSelection: 'explicit-replacement' },
        { role: 'element', tag: '@image4', path: '/helmet-4.png', mediaType: 'image', slot: 'reference', boundCharacterTag: '@image3', description: 'cyan blue plastic helmet', appearanceScope: 'helmet-headwear', appearanceSelection: 'explicit-delta', visualAuthorityMode: 'reference-plus-authored-delta', authoredAppearanceDelta: { property: 'visor finish', value: 'matte' } },
      ],
      storyboardShots: [{ prompt: '@image2 wears @image6. @image3 wears @image5 and carries @image4.', duration: 4, shotSize: 'wide', camera: 'static' }],
    }
    const semanticMaster = visibleProviderPromptBody(referenceExclusive)
    for (const tag of ['@image2', '@image6', '@image3', '@image5', '@image4']) expect(semanticMaster).toContain(tag)
    expect(semanticMaster.match(/Use @image2 as image2\./g)).toHaveLength(1)
    expect(semanticMaster.match(/Use @image3 as image3\./g)).toHaveLength(1)
    expect(semanticMaster.match(/Use @image6 for @image2's wardrobe\./g)).toHaveLength(1)
    expect(semanticMaster.match(/Use @image5 for @image3's glasses or accessory\./g)).toHaveLength(1)
    expect(semanticMaster.match(/Use @image4 for @image3's helmet or headwear\./g)).toHaveLength(1)
    expect(semanticMaster.match(/Authored appearance delta · @image4 · visor finish=matte/g)).toHaveLength(1)
    expect(semanticMaster).toContain('Manual garment prose: a hand-knitted red scarf with two tassels.')
    for (const metadata of ['mustard', 'leopard', 'round cyan glasses', 'black frame', 'blue lenses', 'cyan blue plastic helmet']) expect(semanticMaster).not.toContain(metadata)
    expect(providerPromptPreview(referenceExclusive)).toBe(semanticMaster)
    const payload = providerSeedancePayloadCompilation(referenceExclusive).text
    expect(payload).not.toContain('@image2')
    expect(payload).toContain('@Image1')
  })

  it('reports deterministic semantic-prompt-only native-unverified support without undocumented fields', () => {
    const compilation = compileProviderPrompt({
      ...request,
      prompt: 'A visible organic human woman crosses a physically photographed live-action hall.',
      authoredPrompt: 'A visible organic human woman crosses a physically photographed live-action hall.',
      stylePrompt: 'Selected photoreal live-action photography.',
    })
    expect(compilation.controlDiagnostics).toContainEqual(expect.objectContaining({
      code: 'natural-skin-provider-support',
      blocking: false,
      status: 'semantic-prompt-only',
      nativeSupport: 'native-unverified',
      qualification: 'qualified-explicit-photographed-organic-human',
    }))
    expect(providerNativeNaturalSkinFields()).toEqual({})
  })
})
