import { describe, expect, it } from 'vitest'
import type { StoryboardPanel } from './types'
import { cameraMovementBridgeCompatibility, planStoryboardCameraBridge, planStoryboardCameraBridges, storyboardCameraBridgeReadiness } from './storyboardCameraBridge'

const panel = (id: string, shotSize: StoryboardPanel['shotSize'], camera: string, duration = 4, transitionToNext: StoryboardPanel['transitionToNext'] = 'continue', prompt = `${id} action.`): StoryboardPanel => ({ id, prompt, duration, shotSize, camera, transitionToNext })

describe('Storyboard Continue camera bridge planner', () => {
  it('reserves no bridge for same framing', () => {
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'wide', 'static'), 0)).toMatchObject({ kind: 'none', framingSteps: 0, reservedSeconds: 0 })
  })

  it('merges a compatible authored move without duplicating it', () => {
    const plan = planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'close-up', 'dolly-in', 4), 0)
    expect(plan).toMatchObject({ kind: 'merged', direction: 'tighter', framingSteps: 2, requiredSeconds: 0, reservedSeconds: 0, concurrent: true, authoredMoveCompatible: true })
    expect(plan.bridgeText).toContain('Full performer visible within meaningful surroundings')
    expect(plan.bridgeText).toContain('Face dominates the frame, approximately head and shoulders')
    expect(plan.bridgeText?.match(/dolly in/gi)).toHaveLength(1)
  })

  it('preserves a static choice rather than injecting another movement to reach a different crop', () => {
    const plan = planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'medium', 'static', 4), 0)
    expect(plan).toMatchObject({ kind: 'conflict', authoredMoveCompatible: false })
    expect(plan.conflict).toContain('no additional camera operation is inserted')
    expect(plan.bridgeText).toBeUndefined()
  })

  it('never bridges authored hard cuts', () => {
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static', 4, 'hard-cut'), panel('b', 'detail', 'static'), 0).kind).toBe('none')
    expect(planStoryboardCameraBridges([panel('a', 'wide', 'static', 4, 'hard-cut'), panel('b', 'detail', 'static')])[0].kind).toBe('none')
  })

  it('blocks unknown framing, Auto, blank panels and incompatible movement', () => {
    expect(planStoryboardCameraBridge(panel('a', 'auto', 'static'), panel('b', 'wide', 'static'), 0).conflict).toMatch(/unknown framing/i)
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'close-up', 'auto'), 0).conflict).toMatch(/Auto cannot plan/i)
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'medium', 'static', 4, 'continue', '  '), 0).conflict).toMatch(/panel 2 is blank/i)
    const short = planStoryboardCameraBridge(panel('a', 'detail', 'static'), panel('b', 'establishing' as StoryboardPanel['shotSize'], 'pan-right', 2), 0)
    expect(short.conflict).toContain('Select a compatible movement or choose Cut')
  })

  it('keeps compatibility directions without inventing physical speed from crop size', () => {
    expect(cameraMovementBridgeCompatibility('dolly-in', 'tighter')).toBe(true)
    expect(cameraMovementBridgeCompatibility('pull-out', 'wider')).toBe(true)
    expect(cameraMovementBridgeCompatibility('rack-focus-near', 'tighter')).toBe(false)
    expect(planStoryboardCameraBridge(panel('a', 'wide', 'static'), panel('b', 'medium', 'dolly-in', 4), 0)).toMatchObject({ requiredSeconds: 0, reactionReserveSeconds: 0, actionReserveSeconds: 0, concurrent: true })
    expect(storyboardCameraBridgeReadiness([planStoryboardCameraBridge(panel('a', 'detail', 'static'), panel('b', 'establishing' as StoryboardPanel['shotSize'], 'pan-right', 2), 0)])).toMatch(/Panel 2 Continue/)
  })
})

it('allows compatible one-second optical widening and keeps a selected focal change explicit', () => {
  const a = { ...panel('a', 'close-up', 'static'), lensMm: 85 }
  const b = { ...panel('b', 'extreme-wide', 'zoom-out', 1), lensMm: 16 }
  expect(planStoryboardCameraBridge(a, b, 0)).toMatchObject({ kind: 'merged', concurrent: true, framingSteps: 3, reservedSeconds: 0 })
  expect(planStoryboardCameraBridge(a, { ...b, camera: 'dolly-out' }, 0).kind).toBe('conflict')
  expect(planStoryboardCameraBridge(a, { ...b, duration: 0.5 }, 0).conflict).toMatch(/at least 1.0s/)
})

it('rejects opposing selected focal lengths and does not treat a dolly zoom as a framing change', () => {
  const prior = {id:'a',prompt:'Face.',duration:1,shotSize:'close-up',camera:'static',lensMm:85,transitionToNext:'continue'} as const
  const next = {id:'b',prompt:'Reveal the room.',duration:1,shotSize:'wide',camera:'zoom-in',lensMm:16} as const
  expect(planStoryboardCameraBridge(prior,next,0).kind).toBe('conflict')
  expect(planStoryboardCameraBridge(prior,{...next,camera:'zoom-out'},0)).toMatchObject({kind:'merged',concurrent:true,reservedSeconds:0})
  expect(planStoryboardCameraBridge(prior,{...next,camera:'dolly-zoom-in'},0).kind).toBe('conflict')
  expect(planStoryboardCameraBridge(prior,{...next,shotSize:'close-up',camera:'dolly-zoom-in'},0).kind).toBe('merged')
})


it('does not erase same-scale target choices or the physical component of a dolly zoom', () => {
  const a={id:'a',prompt:'A facial feature.',duration:1,shotSize:'extreme-close-up',camera:'static',transitionToNext:'continue'} as const
  const b={id:'b',prompt:'A hand detail.',duration:1.25,shotSize:'detail',camera:'static'} as const
  expect(planStoryboardCameraBridge(a,b,0).kind).toBe('conflict')
  const plan=planStoryboardCameraBridge({...a,shotSize:'close-up',lensMm:85},{...b,shotSize:'close-up',lensMm:16,camera:'dolly-zoom-in'},0)
  expect(plan.bridgeText).toContain('authored dolly zoom in once')
  expect(plan.bridgeText).toContain('1.25s interval')
  expect(plan.bridgeText).not.toContain('authored optical zoom')
})
