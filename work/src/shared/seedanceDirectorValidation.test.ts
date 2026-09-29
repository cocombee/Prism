import { describe, expect, it } from 'vitest'
import { validateSeedanceDirectorPrompt } from './seedanceDirectorValidation'
import type { GenerationRequest } from './types'

const typedRequest: GenerationRequest = {
  nodeId: 'restaurant-video', kind: 'video-generator',
  storyboardShots: [
    { panelId: 's1', prompt: 'Owner works.', duration: 2, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut', continuityGroupId: 'restaurant', activeCharacterTags: ['@owner', '@cook-one'], characterStates: [{ characterTag: '@owner', worldPosition: 'chef-side' }, { characterTag: '@cook-one', workstation: 'exact burner' }] },
    { panelId: 's2', prompt: 'Cut closer.', duration: 2, shotSize: 'close-up', camera: 'static', continuityGroupId: 'restaurant', activeCharacterTags: ['@owner', '@cook-one'] },
  ],
}

function body(lines: string[]): string {
  return [...lines, 'HARD CUT.', 'NEGATIVE PROMPT', 'continuity resets'].join('\n')
}

describe('typed Seedance continuity validation', () => {
  it('rejects missing active-cast state, group drift, and dropped inherited state without overblocking legacy requests', () => {
    const missing = validateSeedanceDirectorPrompt(body([
      'SHOT 1', 'CHARACTER STATE · @owner | world=chef-side', 'CHARACTER STATE · @cook-one | workstation=exact burner',
      'SHOT 2', 'CHARACTER STATE · @owner | world=chef-side',
    ]), typedRequest)
    expect(missing.errors).toContain('Shot 2 is missing active Character state for @cook-one.')

    const drift = validateSeedanceDirectorPrompt(body([
      'SHOT 1', 'CONTINUITY GROUP · restaurant', 'CHARACTER STATE · @owner | world=chef-side', 'CHARACTER STATE · @cook-one | workstation=exact burner',
      'SHOT 2', 'CONTINUITY GROUP · lobby', 'CHARACTER STATE · @owner | world=chef-side', 'CHARACTER STATE · @cook-one | workstation=exact burner',
    ]), typedRequest)
    expect(drift.errors).toContain('Shot 2 continuity group must remain restaurant; found lobby.')

    const dropped = validateSeedanceDirectorPrompt(body([
      'SHOT 1', 'CHARACTER STATE · @owner | world=chef-side', 'CHARACTER STATE · @cook-one | workstation=exact burner',
      'SHOT 2', 'CHARACTER STATE · @owner | world=chef-side', 'CHARACTER STATE · @cook-one',
    ]), typedRequest)
    expect(dropped.errors).toContain('Shot 2 dropped inherited state for @cook-one: workstation.')

    const legacy: GenerationRequest = { nodeId: 'legacy', kind: 'video-generator', storyboardShots: [{ prompt: 'Legacy action.', duration: 2, shotSize: 'wide', camera: 'static' }] }
    expect(validateSeedanceDirectorPrompt('SHOT 1\nLegacy action.\nNEGATIVE PROMPT\ndrift', legacy).ok).toBe(true)
  })

  it('rejects future-only typed state narrated inside an earlier provider-visible shot', () => {
    const request: GenerationRequest = {
      nodeId: 'future-scope', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardShots: [
        { panelId: 's1', prompt: '@chef works.', duration: 2, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut', continuityGroupId: 'service', activeCharacterTags: ['@chef'], characterStates: [{ characterTag: '@chef', worldPosition: 'front station', currentAction: 'current task' }] },
        { panelId: 's2', prompt: '@chef turns.', duration: 2, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut', continuityGroupId: 'service', activeCharacterTags: ['@chef'], characterStateDeltas: [{ characterTag: '@chef', worldPosition: 'later screen-right', bodyOrientation: 'reverse-view front relation' }] },
        { panelId: 's3', prompt: '@chef serves.', duration: 2, shotSize: 'medium', camera: 'static', continuityGroupId: 'service', activeCharacterTags: ['@chef'], characterStateDeltas: [{ characterTag: '@chef', currentAction: 'future action raises the plated dish' }] },
      ],
    }
    const earlyAnticipation = body([
      'SHOT 1', 'CHARACTER STATE · @chef | world=front station | action=current task', 'The chef is already later screen-right in the reverse-view front relation and future action raises the plated dish.',
      'SHOT 2', 'CHARACTER STATE · @chef | world=later screen-right | orientation=reverse-view front relation | action=current task', 'HARD CUT.',
      'SHOT 3', 'CHARACTER STATE · @chef | world=later screen-right | orientation=reverse-view front relation | action=future action raises the plated dish',
    ])
    expect(validateSeedanceDirectorPrompt(earlyAnticipation, request)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([expect.stringMatching(/Shot 1.*future-only.*later screen-right/i)]),
    })
  })
})
