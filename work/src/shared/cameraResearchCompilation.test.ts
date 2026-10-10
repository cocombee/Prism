import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { compileProviderPromptForSubmission, providerSeedancePayloadCompilation } from './referenceInstructions'

const request = (): GenerationRequest => ({
  nodeId: 'video', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/text-to-video', duration: 16,
  prompt: 'Show the action and its consequence.', authoredPrompt: 'CAMERA\nKeep the authored viewing side; camera height 1.3 m.\nLENS AND OPTICS\n32mm lens at f/4.',
  storyboardShots: [
    { panelId: 'a', prompt: 'The worker notices the falling part.', duration: 4, shotSize: 'medium', camera: 'pan-left', transitionToNext: 'hard-cut' },
    { panelId: 'b', prompt: 'Reveal the held part and the worker relationship.', duration: 4, shotSize: 'wide', camera: 'orbit-right', transitionToNext: 'continue' },
    { panelId: 'c', prompt: 'Continue toward the consequence.', duration: 4, shotSize: 'medium', camera: 'dolly-zoom-in', transitionToNext: 'hard-cut' },
    { panelId: 'd', prompt: 'Hold the readable result.', duration: 4, shotSize: 'detail', camera: 'static' },
  ],
})

describe('research-refined camera in the single visible master', () => {
  it('keeps selected mechanisms, authored optics and Continue boundary in one generation', () => {
    const compilation = compileProviderPromptForSubmission(request())
    const camera = compilation.blocks.find(block => block.label === 'CAMERA')!.text
    expect(camera).toContain('Rotate horizontally left from the fixed camera station')
    expect(camera).toContain('Translate right around the authored subject')
    expect(camera).toContain('Translate toward the authored subject while shortening focal length')
    expect(camera).toContain('Continue physically from the prior camera endpoint')
    expect(camera).toContain('camera height 1.3 m')
    expect(compilation.text).toContain('32mm lens at f/4.')
    expect(compilation.text.match(/^HARD CUT\.$/gm)).toHaveLength(2)
    expect(compilation.text).not.toMatch(/a new generation|separate paid request/i)
  })

  it('preserves Manual prompt bytes with new camera recipes present', () => {
    const exact = 'Authored camera: stationary.\r\nUse the existing 16mm lens.  '
    const draft = { ...request(), providerPromptOverride: exact }
    expect(compileProviderPromptForSubmission(draft).text).toBe(exact)
    expect(providerSeedancePayloadCompilation(draft).text).toBe(exact)
  })
})
