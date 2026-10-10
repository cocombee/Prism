import { describe, expect, it } from 'vitest'
import {
  CAMERA_SUPPORT_VALUES,
  cameraSupportConflict,
  cameraSupportSemantics,
  mergeCameraSupportNegatives,
} from './cameraSupportSemantics'

const expected = {
  handheld: {
    providerClause: 'Restrained natural handheld micro-sway and micro-translation remain local to the current authored viewpoint and framing; settle at that anchor only where authored.',
  },
  'handheld-subtle': {
    providerClause: 'Near-locked gentle handheld micro-sway remains local to the current authored viewpoint and framing; settle calmly at that anchor only where authored.',
  },
  'handheld-intense': {
    providerClause: 'Strong reactive handheld shake may disturb the framing locally, but remains anchored to the current authored viewpoint and recovers into that composition only where authored.',
  },
  'shoulder-rig': {
    providerClause: 'Weighted shoulder-mounted micro-movement and bodily operator transfer remain local to the current authored viewpoint and framing; settle firmly at that anchor only where authored.',
  },
} as const

const sharedSupportNegatives = [
  'no support-generated invented camera path', 'no support-generated orbit', 'no support-generated arc', 'no support-generated circling',
  'no support-generated wraparound', 'no support-generated lateral travel', 'no support-generated parallax sweep', 'no support-generated track',
  'no support-generated dolly', 'no support-generated pan', 'no support-generated tilt', 'no support-generated zoom', 'no support-generated push-in',
  'no support-generated pull-out', 'no support-generated crane', 'no support-generated jib', 'no support-generated pedestal', 'no support-generated roll',
  'no support-generated yaw sweep', 'no support-generated continuous directional drift', 'no support-generated viewpoint migration',
  'no support-generated viewing-side change', 'no support-generated invented reframing',
] as const

describe('camera support semantics', () => {
  it('maps all four persisted values to the exact Director clauses without aliases', () => {
    expect(CAMERA_SUPPORT_VALUES).toEqual(['handheld', 'handheld-subtle', 'handheld-intense', 'shoulder-rig'])
    for (const value of CAMERA_SUPPORT_VALUES) {
      const semantic = cameraSupportSemantics(value)!
      expect(semantic.providerClause).toBe(expected[value].providerClause)
      expect(semantic.revampInstruction).toContain(expected[value].providerClause)
      expect(semantic.revampInstruction).toContain('support rides only that path while preserving authored pace and endpoint state; settling is added only where authored')
      expect(semantic.revampInstruction).toContain('A non-spatial Continue preserves the current anchor')
      expect(semantic.revampInstruction).toContain('A Cut resets the anchor')
      expect(semantic.negatives).toEqual(expect.arrayContaining([...sharedSupportNegatives]))
    }
  })

  it('leaves static, stabilized, unknown, and empty selections outside handheld semantics', () => {
    for (const value of ['', 'static', 'auto', 'steadicam', 'steadicam-follow', 'gimbal-follow', 'gimbal-orbit', 'unknown']) {
      expect(cameraSupportSemantics(value)).toBeUndefined()
    }
  })

  it('dedupes exclusions case-insensitively while preserving authored negative bytes and scoped authored exceptions', () => {
    const authoredNegative = 'NO RANDOM JITTER; preserve authored grain'
    const authored = 'The authored rack focus hunts once, then a crash zoom corrects framing; the impact triggers a camera shudder and operator overshoot correction.'
    const merged = mergeCameraSupportNegatives(authoredNegative, 'handheld-intense', authored)
    expect(merged.startsWith(authoredNegative)).toBe(true)
    expect(merged.match(/random jitter/gi)).toHaveLength(1)
    expect(merged).toContain('no support-generated track')
    expect(merged).toContain('no support-generated zoom')
    expect(merged).toContain('no support-generated invented reframing')
    expect(merged).toContain('preserve authored grain')
    expect(mergeCameraSupportNegatives('', 'static', authored)).toBe('')
  })

  it('reports only explicit global locked-static contradictions', () => {
    const message = 'Camera support conflict: handheld cannot be combined with an explicitly locked static camera with zero camera movement.'
    expect(cameraSupportConflict('handheld', 'Use a locked static camera with zero camera movement.')).toBe(message)
    expect(cameraSupportConflict('shoulder-rig', 'LOCKED-OFF CAMERA; no camera movement.')).toBe('Camera support conflict: shoulder-rig cannot be combined with an explicitly locked static camera with zero camera movement.')
    for (const text of ['Hold the static endpoint for one second.', 'Static electricity crackles.', 'The actor holds still while the camera tracks left.', 'Track left, then lock the final composition.']) {
      expect(cameraSupportConflict('handheld-subtle', text)).toBeNull()
    }
    expect(cameraSupportConflict('static', 'Locked static camera with zero camera movement.')).toBeNull()
  })
})
