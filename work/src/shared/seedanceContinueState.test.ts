import { describe, expect, it } from 'vitest'
import { providerPromptPreviewCompilation, providerSeedancePayloadCompilation, visibleProviderPromptBody } from './referenceInstructions'
import { seedanceShotSpecSections } from './shotSpec'
import { validateSeedanceDirectorPrompt } from './seedanceDirectorValidation'
import type { GenerationRequest } from './types'
import type { StoryboardCameraBridgePlan } from './storyboardCameraBridge'

const base: GenerationRequest = {
  nodeId: 'continue-state', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video',
  prompt: '', authoredPrompt: '', duration: 9,
}

function request(transition: 'continue' | 'hard-cut' = 'continue', bridge?: StoryboardCameraBridgePlan): GenerationRequest {
  return {
    ...base,
    storyboardShots: [
      { panelId: 'a', prompt: 'The actor waits.', duration: 3, shotSize: 'medium', camera: 'static', transitionToNext: 'continue', continuityGroupId: 'counter', activeCharacterTags: ['@actor'], characterStates: [{ characterTag: '@actor', worldPosition: 'counter-left', gazeTarget: 'doorway', currentAction: 'holds the cup', performanceState: 'delighted' }], dialogueSpans: [{ id: 'greeting', speakerTag: '@actor', text: '欢迎，慢慢来。', startPanelId: 'a', endPanelId: 'c', insertAudioPanelIds: ['b'], delivery: 'warm', lipSync: 'continuous' }] },
      { panelId: 'b', prompt: 'The actor turns toward the visitor.', duration: 3, shotSize: 'medium', camera: 'static', transitionToNext: transition, continuityGroupId: 'counter', characterStateDeltas: [{ characterTag: '@actor', gazeTarget: 'visitor' }], stateAuthorities: [{ authorityTag: '@cup', scope: 'before', state: 'cup remains full' }], incomingBridge: bridge },
      { panelId: 'c', prompt: 'The actor keeps speaking.', duration: 3, shotSize: 'medium', camera: 'static', continuityGroupId: 'counter' },
    ],
  }
}

function timeline(body: string): string {
  return body.split('TIMELINE AND CONTINUOUS ACTION\n')[1].split('\n\n')[0]
}

describe('typed state across Seedance Continue beats', () => {
  it('keeps inherited state, authored deltas and one exact dialogue span inside a continuous take', () => {
    const input = request()
    const frozen = JSON.stringify(input)
    const body = providerPromptPreviewCompilation(input).text
    const action = timeline(body)
    expect(body).toContain('CONTINUOUS WAYPOINT TAKE, ONE UNBROKEN SHOT, 9s TOTAL')
    expect(action).not.toMatch(/^SHOT\s+\d|HARD CUT\./m)
    expect(action.match(/CHARACTER STATE · @actor/g)).toHaveLength(3)
    expect(action).toContain('BEAT 2 · 3.0–6.0s')
    expect(action).toContain('BEAT 3 · 6.0–9.0s')
    expect(action).toContain('world=counter-left')
    expect(action).toContain('gaze=visitor')
    expect(action).toContain('STATE AUTHORITY · before · @cup | cup remains full')
    expect(action).toContain('DIALOGUE SPAN · greeting · beats 1–3')
    expect(action.match(/欢迎，慢慢来。/g)).toHaveLength(1)
    expect(action).toContain('DIALOGUE CONTINUATION · greeting')
    expect(validateSeedanceDirectorPrompt(body, input).ok).toBe(true)
    expect(JSON.stringify(input)).toBe(frozen)
  })

  it('maps three authored beats onto two shots and validates each beat independently', () => {
    const input = request('hard-cut')
    const body = providerPromptPreviewCompilation(input).text
    const action = timeline(body)
    expect(body).toContain('TWO SHOTS, ONE HARD CUT, 9s TOTAL (SHOT 1 6s, SHOT 2 3s)')
    expect(action).toContain('SHOT 1 / BEAT 1 · 0.0–3.0s')
    expect(action).toContain('SHOT 1 / BEAT 2 · 3.0–6.0s')
    expect(action).toContain('SHOT 2 · 6.0–9.0s')
    expect(action).not.toMatch(/^SHOT 3/m)
    expect(action.match(/HARD CUT\./g)).toHaveLength(1)
    expect(action).toContain('DIALOGUE SPAN · greeting · shots 1–2')
    expect(action.match(/欢迎，慢慢来。/g)).toHaveLength(1)
    expect(validateSeedanceDirectorPrompt(body, input).ok).toBe(true)
    const missingBeatState = body.replace(/(SHOT 1 \/ BEAT 2 ·[\s\S]*?)\nCHARACTER STATE ·[^\n]+/, '$1')
    expect(validateSeedanceDirectorPrompt(missingBeatState, input).errors).toContain('Shot 1 / beat 2 is missing active Character state for @actor.')
  })

  it('does not accept camera-summary state as a substitute for missing timeline beat state', () => {
    const input = request()
    const body = providerPromptPreviewCompilation(input).text
    const missing = body.replace(/(BEAT 2 ·[\s\S]*?)\nCHARACTER STATE ·[^\n]+/, '$1')
    const falseState = `BEAT 2: Camera overview.\nCHARACTER STATE · @actor | world=counter-left | gaze=visitor\n${missing}`
    expect(validateSeedanceDirectorPrompt(falseState, input).errors).toContain('Beat 2 is missing active Character state for @actor.')
  })

  it('keeps bridge-local typed state and insert audio without changing bridge timing', () => {
    const bridge: StoryboardCameraBridgePlan = {
      boundaryIndex: 0, transition: 'continue', kind: 'merged', source: { panelId: 'a', shotSize: 'medium', fovDegrees: 47, camera: 'static', axis: 'locked' },
      target: { panelId: 'b', shotSize: 'medium', fovDegrees: 47, camera: 'static', axis: 'locked' }, fovDeltaDegrees: 0, direction: 'same', requiredSeconds: 0.5,
      reservedSeconds: 0.5, actionReserveSeconds: 1.5, reactionReserveSeconds: 1, authoredMoveCompatible: true, bridgeText: 'Keep the camera at its current endpoint.',
    }
    const input = request('hard-cut', bridge)
    input.references = [{ role: 'character', tag: '@actor', name: 'Visitor', path: '/fixture/actor.png', characterAuthorityMode: 'complete-dressed-body' }]
    input.storyboardShots![1].prompt = '@actor turns toward the visitor.'
    const sections = seedanceShotSpecSections(input)
    const action = sections.find(section => section.heading === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(action).toContain('CAMERA BRIDGE · 3.0–3.5s')
    expect(action).toContain('MAIN ACTION · 3.5–5.0s')
    expect(action).toContain('ENDPOINT / REACTION · 5.0–6.0s')
    const second = action.split('SHOT 1 / BEAT 2 ·')[1].split('SHOT 2 ·')[0]
    expect(second).toContain('REFERENCES · Use @actor as Visitor.')
    expect(second).toContain('CHARACTER STATE · @actor')
    expect(second).toContain('gaze=visitor')
    expect(second).toContain('STATE AUTHORITY · before · @cup')
    expect(second).toContain('DIALOGUE CONTINUATION · greeting')
    expect(() => providerPromptPreviewCompilation(input)).not.toThrow()
  })

  it('rejects future state anticipated inside an earlier Continue beat', () => {
    const input = request()
    const body = providerPromptPreviewCompilation(input).text
    const early = body.replace('PURPOSE / ACTION · The actor waits.', 'PURPOSE / ACTION · The actor waits with visitor already as the gaze target.')
    expect(validateSeedanceDirectorPrompt(early, input).errors).toContain('Beat 1 contains future-only typed state before its owning shot: visitor.')
  })

  it('leaves an authored Manual body byte-exact despite connected typed Continue data', () => {
    const authored = '  用户原文\nKeep my accepted layout and timing.  '
    const input = { ...request(), providerPromptOverride: authored }
    expect(visibleProviderPromptBody(input)).toBe(authored)
    expect(providerSeedancePayloadCompilation(input).text).toBe(authored)
  })
})
