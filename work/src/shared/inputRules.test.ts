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
      { kind: 'image-editor', title: 'Image Editor', prompt },
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


describe('generators retire legacy input fidelity', () => {
  it.each(['image-generator', 'video-generator'] as const)('%s exposes no Guide/Auto/Lock on its connected inputs', kind => {
    const target = { kind, title: 'Generator' }
    for (const handle of ['reference-in', 'video-reference-in', 'image-in', 'end-image', 'video-in', 'storyboard-in']) {
      for (const mode of ['guide', 'auto', 'lock'] as const) {
        const rule = connectedInputRule({ kind: handle === 'storyboard-in' ? 'storyboard' : 'upload', title: 'Input', mediaReferenceMode: 'blocking' }, target, handle, mode)
        expect(rule.toggleable).toBeUndefined()
        expect(rule.mode).toBeUndefined()
        if (['reference-in', 'video-reference-in'].includes(handle)) expect(rule.rule).not.toMatch(/LOCK RULE|GUIDE RULE|AUTO RULE|exact matching|pixel/)
      }
    }
  })
  it('keeps semantic assets fixed rather than offering fidelity choices', () => {
    for (const kind of ['character', 'wardrobe', 'element', 'location', 'style-reference'] as const) {
      const rule = connectedInputRule({ kind, title: kind }, { kind: 'video-generator', title: 'Generator' }, `${kind}-in`, 'guide')
      expect(rule.rule).toContain('HARD RULE')
      expect(rule.toggleable).toBeUndefined()
      expect(rule.mode).toBeUndefined()
    }
  })
})


describe('current input declarations override cached retired snapshots', () => {
  it.each(['fal', 'higgsfield', 'higgsfield-wan'])('uses the active %s Storyboard socket instead of its cached retirement', provider => {
    const state = { endpointId: provider === 'fal' ? 'alibaba/wan-3.0/reference-to-video' : provider === 'higgsfield' ? 'bytedance/seedance-2.5/reference-to-video' : 'wan/v2.7/reference-to-video', label: 'Video', flow: 'video' as const, values: {}, media: [], promptField: 'prompt', retiredPorts: [{ id: 'storyboard-in', label: 'Unavailable · Storyboard (Optional)', signal: 'storyboard' as const }] }
    const target: import('./types').StudioNodeData = provider === 'fal' ? { kind: 'video-generator', title: 'Video Generator', falNative: state } : { kind: 'video-generator', title: 'Video Generator', higgsfieldNative: { ...state, contractRevision: '' } }
    const saved = structuredClone(target)
    const rule = connectedInputRule({ kind: 'storyboard', title: 'Storyboard', referenceTag: '@sequence' }, target, 'storyboard-in')
    expect(rule.label).toBe('Storyboard')
    expect(rule.rule).not.toContain('needs repair')
    expect(target).toEqual(saved)
  })
  it('revives a current media binding while retaining a truly removed socket and its repair gate', () => {
    const target: import('./types').StudioNodeData = { kind: 'video-generator', title: 'Video Generator', falNative: { endpointId: 'alibaba/wan-3.0/reference-to-video', label: 'Video', flow: 'video', values: {}, media: [{ key: 'reference_image_urls', portId: 'reference-in', label: 'Reference Images', type: 'image', role: 'reference-image', multiple: true, required: false }], retiredPorts: [{ id: 'reference-in', label: 'Unavailable · Image Urls', signal: 'image' }, { id: 'old-image-in', label: 'Unavailable · Unavailable · Old Images', signal: 'image' }] } }
    const source: import('./types').StudioNodeData = { kind: 'upload', title: 'Reference', referenceTag: '@reference', mediaReferenceMode: 'composition' }
    expect(connectedInputRule(source, target, 'reference-in').label).toBe('Reference Images')
    expect(connectedInputRule(source, target, 'reference-in').rule).not.toContain('needs repair')
    expect(connectedInputRule(source, target, 'old-image-in')).toMatchObject({ label: 'Unavailable · Old Images', rule: 'This saved connection needs repair before generation.' })
  })
})
