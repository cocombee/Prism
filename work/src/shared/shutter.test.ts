import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHUTTER_ANGLE,
  SHUTTER_ANGLE_GROUPS,
  migrateShutterSelection,
  resetShutterSelection,
  resolvedShutter,
  shutterPromptSentence,
  shutterAngleFromDenominator,
  shutterSpeedGroups,
} from './shutter'

describe('shutter selection', () => {
  it('converts angle and speed in both directions without losing 172.8 degrees', () => {
    expect(resolvedShutter(180, 24)).toEqual({ angle: 180, fps: 24, denominator: 48, speed: '1/48s', rounded: false, display: '180° • 1/48s at 24fps' })
    const sync = resolvedShutter(172.8, 25)
    expect(sync).toMatchObject({ angle: 172.8, fps: 25, speed: '≈ 1/52s', rounded: true, display: '172.8° • ≈ 1/52s at 25fps' })
    expect(sync.denominator).toBeCloseTo(52.083333333333336, 10)
    expect(shutterAngleFromDenominator(52.083333333333336, 25)).toBeCloseTo(172.8, 10)
  })

  it('groups the seven canonical angle values and derives speed labels from the current FPS', () => {
    expect(SHUTTER_ANGLE_GROUPS.map((group) => [group.label, group.options.map((option) => option.angle)])).toEqual([
      ['Creative', [45, 90, 180, 270, 360]],
      ['Sync Utility', [144, 172.8]],
    ])
    expect(shutterSpeedGroups(24)).toEqual([
      { label: 'Creative', options: [
        { angle: 45, value: '45', label: '1/192s — Impact Crisp' },
        { angle: 90, value: '90', label: '1/96s — Action Crisp' },
        { angle: 180, value: '180', label: '1/48s — Cinematic Natural' },
        { angle: 270, value: '270', label: '1/32s — Fluid Dream' },
        { angle: 360, value: '360', label: '1/24s — Maximum Smear' },
      ] },
      { label: 'Sync Utility', options: [
        { angle: 144, value: '144', label: '1/60s — Sync Utility' },
        { angle: 172.8, value: '172.8', label: '1/50s — Sync Utility' },
      ] },
    ])
  })

  it('serializes the exact physical motion wording and bounded slow-shutter continuity', () => {
    expect(shutterPromptSentence(45, 24)).toBe('45° shutter angle, equivalent to 1/192s at 24fps; very short per-frame exposure with minimal directional motion blur, crisp staccato movement, and sharply separated fast-action poses.')
    expect(shutterPromptSentence(90, 24)).toContain('short per-frame exposure with reduced directional motion blur, crisp readable action, and clearly separated limb and impact positions.')
    expect(shutterPromptSentence(180, 24)).toContain('natural cinematic motion blur with a balanced transition between positional clarity and fluid continuous movement.')
    expect(shutterPromptSentence(270, 24)).toContain('long per-frame exposure with pronounced directional motion smear, fluid temporal blending, and graceful trails following moving limbs, hair, fabric, and practical lights.')
    expect(shutterPromptSentence(360, 24)).toContain('full-frame-interval exposure with maximum directional motion smear and strong temporal blending along the true paths of moving subjects and lights.')
    expect(shutterPromptSentence(144, 24)).toContain('utility timing relationship; do not claim anti-flicker without a verified source frequency.')
    expect(shutterPromptSentence(172.8, 25)).toContain('utility timing relationship; do not claim anti-flicker without a verified source frequency.')
    for (const angle of [270, 360]) {
      const sentence = shutterPromptSentence(angle, 24)
      expect(sentence).toContain('Smear only actually moving elements along their true paths; keep stationary architecture, horizon, and geometry stable; preserve one identity, face and anatomy, wardrobe, limbs, props, contact, screen direction, and continuity; settle to a clean readable endpoint.')
      expect(sentence).not.toMatch(/guarantee|slow motion/i)
    }
  })

  it('defaults and migrates old workflows to canonical angle storage while preserving display mode', () => {
    expect(DEFAULT_SHUTTER_ANGLE).toBe(180)
    expect(migrateShutterSelection({})).toEqual({ shutterMode: 'angle', shutterAngle: 180 })
    expect(migrateShutterSelection({ shutterMode: 'speed', shutterAngle: 172.8 })).toEqual({ shutterMode: 'speed', shutterAngle: 172.8 })
    expect(migrateShutterSelection({ shutterMode: 'speed', shutterSpeedDenominator: 48 }, 24)).toEqual({ shutterMode: 'speed', shutterAngle: 180 })
    expect(resetShutterSelection()).toEqual({ shutterMode: 'angle', shutterAngle: 180 })
  })
})
