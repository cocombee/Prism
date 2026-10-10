import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { compileProviderPrompt, compileProviderPromptForSubmission } from './referenceInstructions'

const request: GenerationRequest = {
  nodeId: 'compiler-video',
  kind: 'video-generator',
  prompt: 'A courier crosses the flooded market.',
  connectionRules: [{ tag: '@courier', label: 'Character Identity', rule: 'Preserve the exact identity.' }],
}

describe('semantic provider prompt compiler', () => {
  it('uses canonical Seedance structure only for an actual Seedance endpoint', () => {
    const seedance = compileProviderPrompt({ ...request, videoEngine: 'bytedance/seedance-2.0/text-to-video' }).text
    const wan = compileProviderPrompt({ ...request, videoEngine: 'wan-controlled' }).text
    expect(seedance).toContain('REFERENCE AUTHORITY')
    expect(seedance).not.toMatch(/ASSISTANT TASK|EDIT CONTROL|EDITABLE VARIABLE REGISTRY/)
    expect(seedance).toContain('TIMELINE AND CONTINUOUS ACTION')
    expect(seedance).not.toContain('SCENE CONTEXT')
    expect(wan).toContain('SCENE CONTEXT')
  })

  it('places the provider reference legend immediately after authored text', () => {
    const compilation = compileProviderPrompt({ ...request, videoEngine: 'bytedance/seedance-2.0/reference-to-video' }, { family: 'seedance', legend: { heading: 'SEEDANCE REFERENCE MAP', body: '@Image1 = @courier identity' } })
    expect(compilation.blocks.map((block) => block.id)).toEqual([
      'shot-spec-seedance-reference-authority',
      'shot-spec-seedance-subject-performance', 'shot-spec-seedance-camera',
      'shot-spec-seedance-lens-optics', 'shot-spec-seedance-lighting', 'shot-spec-seedance-look',
      'shot-spec-seedance-timeline', 'shot-spec-seedance-opening-lock', 'shot-spec-seedance-identity',
      'shot-spec-seedance-camera-gate', 'shot-spec-seedance-final-gate', 'shot-spec-seedance-negative-prompt',
    ])
    expect(compilation.text.indexOf('REFERENCE AUTHORITY')).toBeLessThan(compilation.text.indexOf('SEEDANCE REFERENCE MAP'))
    expect(compilation.text.indexOf('SEEDANCE REFERENCE MAP')).toBeLessThan(compilation.text.indexOf('TIMELINE AND CONTINUOUS ACTION'))
  })

  it('does not create a style or lighting package merely to fill the provider prompt', () => {
    const unbounded = compileProviderPrompt(request, { family: 'kling' })
    expect(unbounded.blocks.some((block) => block.label === 'STYLE')).toBe(false)
    expect(unbounded.text).not.toMatch(/5600K|3200K|3% haze|Photoreal live-action|8K master/)
  })

  const authored: GenerationRequest = {
    ...request, videoEngine: 'fal-ai/kling-video/v3/standard/text-to-video',
    stylePrompt: 'Silkscreen ink.\nUneven paper texture.',
    shotLocks: 'The seal remains intact.',
    storyboardShots: [{
      panelId: 'courier', prompt: 'The courier holds the sealed package.', duration: 4, shotSize: 'medium', camera: 'static',
      activeCharacterTags: ['@courier'], characterStates: [{ characterTag: '@courier', handState: 'left hand holds package' }],
      dialogueSpans: [{ id: 'delivery', speakerTag: '@courier', text: 'Your package is here.', startPanelId: 'courier', endPanelId: 'courier' }],
    }],
  }

  it('drops optional physics before higher-priority camera guidance while preserving authored Style and continuity', () => {
    const unbounded = compileProviderPrompt(authored, { family: 'kling' })
    const bounded = compileProviderPromptForSubmission(authored, { family: 'kling', ceiling: unbounded.text.length - 1, ceilingSource: 'documented-test-provider-contract' })
    expect(bounded.droppedBlocks).toEqual(['PHYSICS'])
    expect(bounded.text).toContain('CAMERA\n')
    expect(bounded.text).toContain('OPTICS\n')
    expect(bounded.text).toContain(authored.stylePrompt)
    expect(bounded.text).toContain('left hand holds package')
    expect(bounded.text).toContain('Your package is here.')
    expect(bounded.text).toContain('The seal remains intact.')
    expect(bounded.promptBudgetDiagnostic).toMatchObject({ blocking: false, limitSource: 'documented-test-provider-contract' })
  })

  it('blocks an irreducible budget without deleting required authored Style, exact dialogue or continuity', () => {
    const options = { family: 'kling' as const, ceiling: 1, ceilingSource: 'documented-test-provider-contract' }
    const bounded = compileProviderPrompt(authored, options)
    expect(bounded.text).toContain(authored.stylePrompt)
    expect(bounded.text).toContain('speaker=@courier')
    expect(bounded.text).toContain('Your package is here.')
    expect(bounded.text).toContain('The seal remains intact.')
    expect(bounded.droppedBlocks).not.toContain('STYLE')
    expect(bounded.droppedBlocks).not.toContain('AUTHORED CONTINUITY')
    expect(bounded.promptBudgetDiagnostic?.blocking).toBe(true)
    expect(() => compileProviderPromptForSubmission(authored, options)).toThrow('Prompt budget blocks provider dispatch')
  })
})
