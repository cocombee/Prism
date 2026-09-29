import { describe, expect, it } from 'vitest'
import type { StoryboardPanel } from './types'
import { cameraMovementBridgeCompatibility, planStoryboardCameraBridge, planStoryboardCameraBridges, storyboardCameraBridgeReadiness } from './storyboardCameraBridge'

const panel = (id: string, shotSize: StoryboardPanel['shotSize'], camera: string, duration = 4, transitionToNext: StoryboardPanel['transitionToNext'] = 'continue', prompt = `${id} action.`): StoryboardPanel => ({ id, prompt, duration, shotSize, camera, transitionToNext })

describe('Storyboard Continue camera bridge planner', () => {
  it('reserves no bridge for same framing', () => {
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'wide', 'static'), 0)).toMatchObject({ kind: 'none', fovDeltaDegrees: 0, reservedSeconds: 0 })
  })

  it('merges a compatible authored move without duplicating it', () => {
    const plan = planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'close-up', 'dolly-in', 4), 0)
    expect(plan).toMatchObject({ kind: 'merged', direction: 'tighter', fovDeltaDegrees: 34, requiredSeconds: 1, reservedSeconds: 1, authoredMoveCompatible: true })
    expect(plan.bridgeText).toContain('63° wide')
    expect(plan.bridgeText).toContain('29° portrait compression')
    expect(plan.bridgeText?.match(/dolly in/gi)).toHaveLength(1)
  })

  it('creates a compound bridge before static lock', () => {
    const plan = planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'medium', 'static', 4), 0)
    expect(plan).toMatchObject({ kind: 'compound', requiredSeconds: 1, authoredMoveCompatible: false })
    expect(plan.bridgeText).toMatch(/translate physically.*47° neutral.*settle.*lock/si)
  })

  it('never bridges authored hard cuts', () => {
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static', 4, 'hard-cut'), panel('b', 'detail', 'static'), 0).kind).toBe('none')
    expect(planStoryboardCameraBridges([panel('a', 'wide', 'static', 4, 'hard-cut'), panel('b', 'detail', 'static')])[0].kind).toBe('none')
  })

  it('blocks unknown FOV, Auto large deltas, blank panels, and physically short beats', () => {
    expect(planStoryboardCameraBridge(panel('a', 'auto', 'static'), panel('b', 'wide', 'static'), 0).conflict).toMatch(/unknown framing/i)
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'close-up', 'auto'), 0).conflict).toMatch(/Auto cannot plan/i)
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'medium', 'static', 4, 'continue', '  '), 0).conflict).toMatch(/panel 2 is blank/i)
    const short = planStoryboardCameraBridge(panel('a', 'detail', 'static'), panel('b', 'establishing' as StoryboardPanel['shotSize'], 'pan-right', 2), 0)
    expect(short.conflict).toContain('Increase panel duration, reduce the framing change, choose a compatible camera movement, or choose Cut.')
  })

  it('uses exact threshold, timing formula, and compatibility directions', () => {
    expect(cameraMovementBridgeCompatibility('dolly-in', 'tighter')).toBe(true)
    expect(cameraMovementBridgeCompatibility('pull-out', 'wider')).toBe(true)
    expect(cameraMovementBridgeCompatibility('rack-focus-near', 'tighter')).toBe(false)
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'medium', 'dolly-in', 4), 0)).toMatchObject({ requiredSeconds: 0.7, reactionReserveSeconds: 0.8, actionReserveSeconds: 1.8 })
    expect(storyboardCameraBridgeReadiness([planStoryboardCameraBridge(panel('a', 'detail', 'static'), panel('b', 'establishing' as StoryboardPanel['shotSize'], 'pan-right', 2), 0)])).toMatch(/Panel 2 Continue/)
  })
})
