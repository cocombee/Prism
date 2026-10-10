import { describe, expect, it } from 'vitest'
import { compileProviderPromptForSubmission, visibleProviderPromptBody } from './referenceInstructions'
import { buildContinuityLedger, productionShotSpecSections, renderShotSpecSections } from './shotSpec'
import type { GenerationRequest, StoryboardDialogueSpan } from './types'

const line: StoryboardDialogueSpan = { id: 'greeting', speakerTag: '@actor', targetTag: '@visitor', text: '欢迎，慢慢来。\nStay here.', startPanelId: 'a', endPanelId: 'c', insertAudioPanelIds: ['b'], delivery: 'warm', lipSync: 'continuous' }
const fixture = (transition: 'continue' | 'hard-cut' = 'continue'): GenerationRequest => ({
  nodeId: 'scene', kind: 'video-generator', videoEngine: 'fal-ai/veo3.1', prompt: 'Already compiled graph story.', authoredPrompt: '', duration: 9,
  storyboardShots: [
    { panelId: 'a', prompt: 'The actor waits.', duration: 3, shotSize: 'medium', camera: 'static', transitionToNext: 'continue', continuityGroupId: 'counter', activeCharacterTags: ['@actor'], characterStates: [{ characterTag: '@actor', worldPosition: 'counter-left', handState: 'left hand holds cup', gazeTarget: 'doorway' }], dialogueSpans: [line] },
    { panelId: 'b', prompt: 'Close on the cup.', duration: 3, shotSize: 'medium', camera: 'static', transitionToNext: transition, continuityGroupId: 'counter', characterStateDeltas: [{ characterTag: '@actor', gazeTarget: 'visitor' }], stateAuthorities: [{ authorityTag: '@cup', scope: 'before', state: 'cup remains full' }], dialogueSpans: [line] },
    { panelId: 'c', prompt: 'The actor keeps speaking.', duration: 3, shotSize: 'medium', camera: 'static', continuityGroupId: 'counter' },
  ],
})

describe('provider-neutral authored video state', () => {
  it.each(['fal-ai/kling-video/v3/standard/text-to-video', 'fal-ai/veo3.1', 'wan-controlled'])('%s keeps authored medium/lighting and multiline layout without default fixtures', (videoEngine) => {
    const authored = 'STYLE\nPaper animation.\nLIGHTING\nOnly red moonlight.\nNo haze.'
    const text = compileProviderPromptForSubmission({ nodeId: 'v', kind: 'video-generator', videoEngine, prompt: authored, authoredPrompt: authored }).text
    expect(text).toContain(authored)
    expect(text).not.toMatch(/5600K|3200K|3% haze|Photoreal live-action|8K master/)
  })

  it('keeps connected Style multiline bytes once without projecting visual descriptions onto reference-only subjects', () => {
    const stylePrompt = 'Paper texture.\nViolet ink only.'
    const text = renderShotSpecSections(productionShotSpecSections({ ...fixture(), stylePrompt, references: [{ role: 'style', tag: '@look', description: 'Stale unrelated appearance.' }, { role: 'character', tag: '@actor', visualAuthorityMode: 'reference-exclusive', description: 'Unapproved face design.' }] }))
    expect(text.split(stylePrompt)).toHaveLength(2)
    expect(text).not.toMatch(/Stale unrelated appearance|Unapproved face design/)
  })

  it.each(['continue', 'hard-cut'] as const)('preserves one exact dialogue and inherited states across %s', (transition) => {
    const input = fixture(transition), frozen = JSON.stringify(input)
    const text = compileProviderPromptForSubmission(input).text
    expect(text).not.toContain('Already compiled graph story.')
    expect(text.split(line.text)).toHaveLength(2)
    expect(text).toContain('speaker=@actor | target=@visitor')
    expect(text.match(/hand=left hand holds cup/g)).toHaveLength(3)
    expect(text).toContain('gaze=visitor')
    expect(text).toContain('STATE AUTHORITY · before · @cup | cup remains full')
    expect(text).toContain('audio continues while mouth may be outside crop')
    expect(text).toContain('same uninterrupted line continues')
    expect(text).toContain(transition === 'continue' ? 'beats 1–3' : 'shots 1–2')
    expect(text).not.toContain('ACTION\n')
    expect(JSON.stringify(input)).toBe(frozen)
  })

  it('keeps typed authored state even when optional direction is off', () => {
    const stylePrompt = 'Authored ink.\nPreserve uneven paper.'
    const text = renderShotSpecSections(productionShotSpecSections({ ...fixture(), stylePrompt, directionLayer: false }))
    expect(text).toContain(line.text)
    expect(text).toContain('hand=left hand holds cup')
    expect(text).not.toContain('CAMERA\n')
    expect(text).toContain(stylePrompt)
  })

  it('projects an owning native group with full-sequence state and a continuation without restarting dialogue', () => {
    const input = fixture('hard-cut'), ledger = buildContinuityLedger(input)
    const before = renderShotSpecSections(productionShotSpecSections({ ...input, storyboardShots: input.storyboardShots!.slice(0, 2) }, undefined, { ledger, shotIndices: [0, 1] }))
    const after = renderShotSpecSections(productionShotSpecSections({ ...input, storyboardShots: input.storyboardShots!.slice(2) }, undefined, { ledger, shotIndices: [2] }))
    expect(before).toContain(line.text)
    expect(after).not.toContain(line.text)
    expect(after).toContain('PANEL 3')
    expect(after).toContain('speaker=@actor | target=@visitor')
    expect(after).toContain('do not restart or repeat the line')
    expect(after).toContain('hand=left hand holds cup')
    expect(after).toContain('gaze=visitor')
  })

  it('rejects invalid projection or contradictory dialogue records', () => {
    const input = fixture(), ledger = buildContinuityLedger(input)
    expect(() => productionShotSpecSections(input, undefined, { ledger, shotIndices: [0] })).toThrow('map every local beat')
    expect(() => productionShotSpecSections(input, undefined, { ledger, shotIndices: [0, 0, 2] })).toThrow('map every local beat')
    expect(() => productionShotSpecSections(input, undefined, { ledger, shotIndices: [1, 0, 2] })).toThrow('map every local beat')
    input.storyboardShots![1].dialogueSpans = [{ ...line, speakerTag: '@wrong' }]
    expect(() => productionShotSpecSections(input)).toThrow('conflicting authored definitions')
  })

  it('places authored audio cues once at their original panel without a default music prohibition', () => {
    const input = fixture()
    input.storyboardShots![2].audioCue = '"A final line."\nAuthored music continues.'
    const text = renderShotSpecSections(productionShotSpecSections(input))
    expect(text.split(input.storyboardShots![2].audioCue!)).toHaveLength(2)
    expect(text).toContain('BEAT 3: "A final line."\nAuthored music continues.')
    expect(text).not.toContain('No music.')
  })

  it('does not augment a Manual master or impose video state sections on image/audio bodies', () => {
    const master = '  STYLE\nInk.\nLIGHTING\nRed.\n  '
    expect(visibleProviderPromptBody({ ...fixture(), providerPromptOverride: master })).toBe(master)
    const image = visibleProviderPromptBody({ nodeId: 'image', kind: 'image-generator', prompt: 'Ink circle.', directionLayer: false })
    const speech = visibleProviderPromptBody({ nodeId: 'speech', kind: 'voiceover', voiceEngine: 'elevenlabs-direct', prompt: '  Hello.  ' })
    expect(image).not.toContain('AUTHORED CONTINUITY')
    expect(speech).toBe('  Hello.  ')
  })
})
