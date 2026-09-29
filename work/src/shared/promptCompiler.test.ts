import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { compileProviderPrompt } from './referenceInstructions'

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
    expect(seedance).toContain('ASSISTANT TASK')
    expect(seedance).toContain('TIMELINE AND CONTINUOUS ACTION')
    expect(seedance).not.toContain('SCENE CONTEXT')
    expect(wan).toContain('SCENE CONTEXT')
  })

  it('places the provider reference legend immediately after authored text', () => {
    const compilation = compileProviderPrompt({ ...request, videoEngine: 'bytedance/seedance-2.0/reference-to-video' }, { family: 'seedance', legend: { heading: 'SEEDANCE REFERENCE MAP', body: '@Image1 = @courier identity' } })
    expect(compilation.blocks.map((block) => block.id)).toEqual([
      'shot-spec-seedance-assistant-task', 'shot-spec-seedance-edit-control', 'shot-spec-seedance-reference-authority',
      'shot-spec-seedance-variable-registry', 'shot-spec-seedance-subject-performance', 'shot-spec-seedance-camera',
      'shot-spec-seedance-lens-optics', 'shot-spec-seedance-lighting', 'shot-spec-seedance-look',
      'shot-spec-seedance-timeline', 'shot-spec-seedance-opening-lock', 'shot-spec-seedance-identity',
      'shot-spec-seedance-camera-gate', 'shot-spec-seedance-final-gate', 'shot-spec-seedance-negative-prompt',
    ])
    expect(compilation.text.indexOf('REFERENCE AUTHORITY')).toBeLessThan(compilation.text.indexOf('SEEDANCE REFERENCE MAP'))
    expect(compilation.text.indexOf('SEEDANCE REFERENCE MAP')).toBeLessThan(compilation.text.indexOf('TIMELINE AND CONTINUOUS ACTION'))
  })

  it('drops the lowest-priority optional blocks first under an explicit documented ceiling', () => {
    const unbounded = compileProviderPrompt(request, { family: 'kling' })
    const bounded = compileProviderPrompt(request, { family: 'kling', ceiling: unbounded.text.length - 1 })
    expect(bounded.droppedBlocks[0]).toBe('STYLE')
    expect(bounded.text).not.toContain('\nSTYLE\n')
    expect(bounded.text).toContain('A courier crosses the flooded market.')
    expect(bounded.text).toContain('POSITIVE LOCKS')
  })
})
