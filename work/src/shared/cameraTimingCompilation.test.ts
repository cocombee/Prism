import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { compileProviderPromptForSubmission, providerSeedancePayloadCompilation } from './referenceInstructions'

const request = (shots: NonNullable<GenerationRequest['storyboardShots']>): GenerationRequest => ({
  nodeId: 'camera-audit', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/text-to-video',
  duration: shots.reduce((sum, shot) => sum + shot.duration, 0), prompt: '', authoredPrompt: '', storyboardShots: shots,
})
const shot = (duration: number, prompt: string, camera = 'auto') => ({ duration, prompt, camera, shotSize: 'medium' })

describe('camera timing in visible and submitted prompt composition', () => {
  for (const [surface, compile] of Object.entries({ visible: compileProviderPromptForSubmission, payload: providerSeedancePayloadCompilation })) {
    it(`${surface}: preserves exact cut times and immediate endpoint without an added hold`, () => {
      const input = request([
        shot(1.15, 'Rear stabilized dolly down behind the rider.', 'dolly-down-slow'),
        shot(1, 'Over the rider shoulder toward residents.', 'static'),
        shot(1.35, 'Dedicated rider-front handheld reverse.', 'handheld'),
        shot(2.5, 'Door closes at exactly 6.00s. End immediately on closure, no aftermath hold.', 'handheld'),
      ])
      const before = JSON.stringify(input)
      const body = compile(input).text
      for (const range of ['0.0–1.15s', '1.15–2.15s', '2.15–3.5s', '3.5–6.0s']) expect(body).toContain(range)
      expect(body).toContain('SHOT 1 1.15s, SHOT 2 1s, SHOT 3 1.35s, SHOT 4 2.5s')
      expect(body.match(/^HARD CUT\.$/gm)).toHaveLength(3)
      expect(body).toContain(input.storyboardShots![3].prompt)
      expect(body).not.toContain('decelerate when moving, and hold the selected final composition')
      expect(body).not.toContain('then settle at that anchor')
      expect(JSON.stringify(input)).toBe(before)
    })
    it(`${surface}: preserves constant physical speed through Continue with authored slow playback`, () => {
      const input = request([
        { ...shot(3, 'Orbit rapidly at constant physical speed through the boundary. Do not decelerate or stop.', 'orbit-right'), transitionToNext: 'continue' },
        shot(3, 'Continue the same orbit at the same physical speed until the end. Playback remains slow-motion; the camera does not slow or hold.', 'orbit-right'),
      ])
      const body = compile(input).text
      expect(body).toContain('ONE UNBROKEN SHOT, 6s TOTAL')
      expect(body).not.toContain('HARD CUT.')
      expect(body).not.toContain('at normal speed')
      expect(body).not.toContain('1/48-second exposure')
      expect(body).not.toContain('decelerate when moving, and hold the selected final composition')
      expect(body).toContain('delivery cadence does not define camera movement speed')
      for (const beat of input.storyboardShots!) expect(body).toContain(beat.prompt)
    })
    it(`${surface}: retains mixed per-shot playback without inventing capture FPS or speed factors`, () => {
      const body = compile(request([
        shot(2, 'Normal speed: subject approaches.'),
        shot(2, 'Slow motion impact, capture at 120fps with 180-degree shutter; conform to 24fps.'),
        shot(2, 'Return to real time and end on contact. No hold.'),
      ])).text
      expect(body).toContain('capture at 120fps with 180-degree shutter; conform to 24fps')
      expect(body).not.toContain('Capture at 24fps and play back at 24fps at normal speed')
      expect(body).not.toContain('1/48-second exposure')
      expect(body).not.toMatch(/\b(?:2x|5x|0\.2x)\b/)
      expect(body.match(/^HARD CUT\.$/gm)).toHaveLength(2)
    })
    it(`${surface}: slow physical travel does not imply slow-motion playback or calibrated velocity`, () => {
      const body = compile(request([shot(4, 'Slowly travel 80cm while following the rider; movement duration remains unspecified.', 'dolly-in')])).text
      expect(body).toContain('at normal speed')
      expect(body).not.toMatch(/\d+(?:\.\d+)?\s*m\/s|then hold\./)
      expect(body).toContain('decelerate or hold only where authored')
    })
    it(`${surface}: retains Manual bytes with precise timing and mixed playback metadata`, () => {
      const exact = '  0.85s\r\nSlow motion. No hold.  '
      expect(compile({ ...request([shot(1, 'Ignored Auto plan')]), providerPromptOverride: exact }).text).toBe(exact)
    })
  }
  it('preserves decimal bridge, main-action and reaction subwindows', () => {
    const input = request([
      { ...shot(1.15, 'The worker approaches.', 'static'), transitionToNext: 'continue' },
      { ...shot(2, 'The worker turns.', 'static'), incomingBridge: {
        boundaryIndex: 0, transition: 'continue', kind: 'merged',
        source: { panelId: 'a', shotSize: 'medium', fovDegrees: 47, camera: 'static', axis: 'locked' },
        target: { panelId: 'b', shotSize: 'medium', fovDegrees: 47, camera: 'static', axis: 'locked' },
        fovDeltaDegrees: 0, direction: 'same', requiredSeconds: .125, reservedSeconds: .125,
        actionReserveSeconds: 1, reactionReserveSeconds: .875, authoredMoveCompatible: true,
        bridgeText: 'Keep the authored camera station.',
      } },
    ])
    const text = compileProviderPromptForSubmission(input).text
    expect(text).toContain('CAMERA BRIDGE · 1.15–1.275s')
    expect(text).toContain('MAIN ACTION · 1.275–2.275s')
    expect(text).toContain('ENDPOINT / REACTION · 2.275–3.15s')
    expect(text).toContain('3.15s TOTAL')
  })
  it('keeps support on an authored forward path rather than inventing a vertical Continue', () => {
    const text = compileProviderPromptForSubmission(request([
      { ...shot(2, 'Dolly physically forward toward the worker.', 'dolly-in'), transitionToNext: 'continue' },
      shot(2, 'Continue the same forward route with handheld support; no change in physical direction.', 'handheld'),
    ])).text
    expect(text).toContain('Dolly physically toward the subject on the viewing axis')
    expect(text).toContain('Support rides only the explicit authored path')
    expect(text).not.toContain('authored vertical path')
    expect(text).not.toContain('then settle at that anchor')
  })
})
