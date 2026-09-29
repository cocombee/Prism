import { describe, expect, it } from 'vitest'
import { connectedInputRule, inferredAutoFidelity, prioritizeConnectedInputRules, resolveAutoConnectedInputRule, type ConnectedInputRule } from './inputRules'

describe('connected input rule display order', () => {
  it('keeps fidelity-controlled rows first and preserves stable order inside both groups', () => {
    const fixedA: ConnectedInputRule = { tag: '@element', label: 'Element', rule: 'HARD RULE · A' }
    const controlledA: ConnectedInputRule = { tag: '@storyboard', label: 'Storyboard', rule: 'AUTO RULE · A', toggleable: true }
    const fixedB: ConnectedInputRule = { tag: '@character', label: 'Character', rule: 'HARD RULE · B' }
    const controlledB: ConnectedInputRule = { tag: '@start', label: 'Starting Frame', rule: 'AUTO RULE · B', toggleable: true }

    expect(prioritizeConnectedInputRules([fixedA, controlledA, fixedB, controlledB])).toEqual([
      controlledA,
      controlledB,
      fixedA,
      fixedB,
    ])
  })
})

describe('prompt-sensitive Auto fidelity', () => {
  it('escalates exact supplied artwork requirements to preservation without changing the visible Auto mode', () => {
    const prompt = 'Each supplied reference image is reproduced exactly as supplied. Original letterforms, spacing, proportions and layout stay intact.'
    expect(inferredAutoFidelity(prompt, '@analisa')).toBe('lock')
    const rule = connectedInputRule(
      { kind: 'upload', title: 'Analisa', referenceTag: '@analisa' },
      { kind: 'image-generator', title: 'Image Generator', prompt },
      'reference-in',
      'auto',
    )
    expect(rule).toMatchObject({ mode: 'auto', toggleable: true })
    expect(rule.rule).toContain('AUTO → PRESERVE RULE')
    expect(rule.rule).toContain('place the original source deterministically after generation')
  })

  it('honors tag-local guidance language before unrelated global preservation language', () => {
    const prompt = 'Use @texture as loose inspiration. Reproduce the attached @logo exactly and keep its original layout intact.'
    expect(inferredAutoFidelity(prompt, '@texture')).toBe('guide')
    expect(inferredAutoFidelity(prompt, '@logo')).toBe('lock')
  })

  it('keeps ambiguous prompts at balanced Auto strength', () => {
    expect(inferredAutoFidelity('Place @subject on the left side.', '@subject')).toBe('auto')
  })

  it('re-evaluates Auto after an upstream authored Prompt is assembled', () => {
    const initial: ConnectedInputRule = { tag: '@logo', label: 'Image Reference', rule: 'AUTO RULE · balanced', mode: 'auto', toggleable: true }
    expect(resolveAutoConnectedInputRule(initial, 'Keep the attached @logo unmodified with its original layout intact.').rule).toContain('AUTO → PRESERVE RULE')
  })
})
