import { describe, expect, it } from 'vitest'
import { CAMERA_MOVEMENT_GROUPS, cameraMovementName, storyboardCameraMovementOptions } from './StoryboardSharedControls'

const allCameraValues = CAMERA_MOVEMENT_GROUPS.flatMap((group) => group.options.map(([value]) => value))

describe('Storyboard camera movement picker options', () => {
  it('shows consolidated pace choices while preserving unique paths, rigs, support, and extents', () => {
    expect(allCameraValues).toContain('pan-left')
    expect(allCameraValues).not.toContain('slow-pan-left')
    expect(allCameraValues).not.toContain('whip-pan-left')
    expect(allCameraValues).not.toContain('slow-dolly-in')
    expect(allCameraValues).not.toContain('snap-push-in')
    expect(allCameraValues).not.toContain('crash-zoom-in')
    expect(allCameraValues).not.toContain('over-shoulder-follow')

    for (const value of [
      'dolly-forward-left', 'dolly-back-right', 'dolly-pass-by', 'dolly-reveal',
      'half-orbit-left', 'full-orbit-right', 'dolly-up', 'dolly-down', 'pedestal-up',
      'crane-up', 'jib-down', 'slider-left', 'slider-right', 'gimbal-orbit', 'chase',
      'handheld', 'handheld-subtle', 'handheld-intense', 'shoulder-rig',
    ]) expect(allCameraValues).toContain(value)

    expect(cameraMovementName('truck-left')).toBe('Track Left')
    expect(cameraMovementName('truck-right')).toBe('Track Right')
  })

  it('adds only the selected legacy ID with its authored label and value', () => {
    const legacy = [
      ['fast-dolly-in', 'Fast Dolly In'],
      ['slow-pan-left', 'Slow Pan Left'],
      ['snap-push-in', 'Snap Push In'],
      ['crash-zoom-in', 'Crash Zoom In'],
      ['whip-pan-left', 'Whip Pan Left'],
      ['dolly-down-slow', 'Dolly Down Slow'],
    ] as const

    for (const [value, label] of legacy) {
      const options = storyboardCameraMovementOptions(value)
      expect(options.find((option) => option.value === value)).toMatchObject({ value, label, group: 'Saved selection' })
      expect(options.find((option) => option.value === 'static')?.label).toBe('Static / Locked')
    }

    const ordinary = storyboardCameraMovementOptions('dolly-in')
    expect(ordinary.some((option) => option.value === 'fast-dolly-in')).toBe(false)
    expect(ordinary.some((option) => option.value === 'slow-pan-left')).toBe(false)
    expect(ordinary.find((option) => option.value === 'dolly-in')?.label).toBe('Dolly In')
  })

  it('keeps Over-The-Shoulder Follow out of ordinary choices but displays it for an existing saved selection', () => {
    expect(storyboardCameraMovementOptions('static').some((option) => option.value === 'over-shoulder-follow')).toBe(false)
    expect(storyboardCameraMovementOptions('over-shoulder-follow').find((option) => option.value === 'over-shoulder-follow')).toMatchObject({
      value: 'over-shoulder-follow',
      label: 'Over-The-Shoulder Follow',
      group: 'Saved selection',
    })
  })
})
