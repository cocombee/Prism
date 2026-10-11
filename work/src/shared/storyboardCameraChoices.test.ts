import { describe, expect, it } from 'vitest'
import { CAMERA_CHOICE_ALIASES, consolidateCameraChoices, type CameraChoiceGroup } from './storyboardCameraChoices'

const choice = (value: string, help = value): readonly [string, string] => [value, help]

const fixture = (): CameraChoiceGroup[] => [
  {
    label: 'Pan & tilt',
    options: [
      choice('pan-left', 'Pan Left'),
      choice('slow-pan-left', 'Slow Pan Left'),
      choice('whip-pan-left', 'Whip Pan Left'),
      choice('pan-right', 'Pan Right'),
      choice('slow-pan-right', 'Slow Pan Right'),
      choice('whip-pan-right', 'Whip Pan Right'),
      choice('tilt-up', 'Tilt Up'),
      choice('slow-tilt-up', 'Slow Tilt Up'),
      choice('whip-tilt-up', 'Whip Tilt Up'),
      choice('tilt-down', 'Tilt Down'),
      choice('slow-tilt-down', 'Slow Tilt Down'),
      choice('whip-tilt-down', 'Whip Tilt Down'),
    ],
  },
  {
    label: 'Dolly & track',
    options: [
      choice('dolly-in', 'Dolly In'),
      choice('slow-dolly-in', 'Slow Dolly In'),
      choice('fast-dolly-in', 'Fast Dolly In'),
      choice('push-in', 'Push In'),
      choice('track-forward', 'Track Forward'),
      choice('snap-push-in', 'Snap Push In'),
      choice('dolly-out', 'Dolly Out'),
      choice('slow-dolly-out', 'Slow Dolly Out'),
      choice('fast-dolly-out', 'Fast Dolly Out'),
      choice('pull-out', 'Pull Out'),
      choice('track-backward', 'Track Backward'),
      choice('snap-pull-out', 'Snap Pull Out'),
      choice('dolly-forward-left', 'Dolly Forward Left'),
      choice('dolly-forward-right', 'Dolly Forward Right'),
      choice('dolly-back-left', 'Dolly Back Left'),
      choice('dolly-back-right', 'Dolly Back Right'),
      choice('dolly-left', 'Dolly Left'),
      choice('crab-left', 'Crab Left'),
      choice('truck-left', 'Truck Left'),
      choice('dolly-right', 'Dolly Right'),
      choice('crab-right', 'Crab Right'),
      choice('truck-right', 'Truck Right'),
      choice('dolly-up', 'Dolly Up'),
      choice('dolly-down', 'Dolly Down'),
      choice('dolly-down-slow', 'Dolly Down Slow'),
      choice('pedestal-up', 'Pedestal Up'),
      choice('pedestal-down', 'Pedestal Down'),
    ],
  },
  {
    label: 'Orbit & rotation',
    options: [
      choice('orbit-left', 'Orbit Left'),
      choice('orbit-right', 'Orbit Right'),
      choice('half-orbit-left', 'Half Orbit Left'),
      choice('half-orbit-right', 'Half Orbit Right'),
      choice('full-orbit-left', 'Full Orbit Left'),
      choice('full-orbit-right', 'Full Orbit Right'),
      choice('arc-left', 'Arc Left'),
      choice('arc-right', 'Arc Right'),
    ],
  },
  {
    label: 'Lens & focus',
    options: [
      choice('zoom-in', 'Zoom In'),
      choice('slow-zoom-in', 'Slow Zoom In'),
      choice('crash-zoom-in', 'Crash Zoom In'),
      choice('zoom-out', 'Zoom Out'),
      choice('slow-zoom-out', 'Slow Zoom Out'),
      choice('crash-zoom-out', 'Crash Zoom Out'),
      choice('dolly-zoom-in', 'Dolly Zoom In'),
      choice('dolly-zoom-out', 'Dolly Zoom Out'),
      choice('vertigo-in', 'Vertigo In'),
      choice('vertigo-out', 'Vertigo Out'),
    ],
  },
  {
    label: 'Subject tracking',
    options: [
      choice('tracking', 'Track Subject'),
      choice('follow', 'Follow'),
      choice('dolly-follow', 'Dolly Follow'),
      choice('chase', 'Chase'),
      choice('over-shoulder-follow', 'Follow Over The Shoulder'),
    ],
  },
  {
    label: 'Stabilized & handheld',
    options: [
      choice('handheld', 'Natural Handheld'),
      choice('handheld-subtle', 'Gentle Handheld'),
      choice('handheld-intense', 'Intense Handheld'),
      choice('shoulder-rig', 'Shoulder-Mounted Camera'),
      choice('steadicam-follow', 'Steadicam Follow'),
      choice('gimbal-follow', 'Gimbal Follow'),
      choice('gimbal-orbit', 'Gimbal Orbit'),
      choice('slider-left', 'Slider Left'),
      choice('slider-right', 'Slider Right'),
    ],
  },
]

const values = (group: CameraChoiceGroup): string[] => group.options.map(([value]) => value)

describe('consolidateCameraChoices', () => {
  it('maps pace and synonymous choices to existing bases, without removing directional bases', () => {
    const result = consolidateCameraChoices(fixture())
    const byGroup = new Map(result.map((group) => [group.label, group]))

    expect(values(byGroup.get('Pan & tilt')!)).toEqual(['pan-left', 'pan-right', 'tilt-up', 'tilt-down'])
    expect(values(byGroup.get('Dolly & track')!)).toEqual([
      'dolly-in', 'dolly-out', 'dolly-forward-left', 'dolly-forward-right', 'dolly-back-left', 'dolly-back-right',
      'truck-left', 'truck-right', 'dolly-up', 'dolly-down', 'pedestal-up', 'pedestal-down',
    ])
    expect(values(byGroup.get('Lens & focus')!)).toEqual(['zoom-in', 'zoom-out', 'dolly-zoom-in', 'dolly-zoom-out'])
    expect(values(byGroup.get('Subject tracking')!)).toEqual(['follow', 'chase'])
    expect(CAMERA_CHOICE_ALIASES['dolly-down-slow']).toBe('dolly-down')
    expect(CAMERA_CHOICE_ALIASES['snap-push-in']).toBe('dolly-in')
    expect(CAMERA_CHOICE_ALIASES['whip-pan-left']).toBe('pan-left')
    expect(CAMERA_CHOICE_ALIASES['crash-zoom-in']).toBe('zoom-in')
  })

  it('retains orbit extents, support types, stabilization, sliders, and distinct vertical rigs', () => {
    const result = consolidateCameraChoices(fixture())
    const byGroup = new Map(result.map((group) => [group.label, group]))

    expect(values(byGroup.get('Orbit & rotation')!)).toEqual([
      'orbit-left', 'orbit-right', 'half-orbit-left', 'half-orbit-right',
      'full-orbit-left', 'full-orbit-right', 'arc-left', 'arc-right',
    ])
    expect(values(byGroup.get('Stabilized & handheld')!)).toEqual([
      'handheld', 'handheld-subtle', 'handheld-intense', 'shoulder-rig',
      'steadicam-follow', 'gimbal-follow', 'gimbal-orbit', 'slider-left', 'slider-right',
    ])
    expect(values(byGroup.get('Dolly & track')!)).toContain('dolly-up')
    expect(values(byGroup.get('Dolly & track')!)).toContain('dolly-down')
    expect(values(byGroup.get('Dolly & track')!)).toContain('pedestal-up')
    expect(values(byGroup.get('Dolly & track')!)).toContain('pedestal-down')
  })

  it('removes Over-The-Shoulder Follow from new choices and keeps chase distinct', () => {
    const result = consolidateCameraChoices(fixture())
    const tracking = result.find((group) => group.label === 'Subject tracking')!

    expect(values(tracking)).toEqual(['follow', 'chase'])
    expect(values(tracking)).not.toContain('over-shoulder-follow')
    expect(values(tracking)).not.toContain('fast-chase')
  })

  it('does not mutate inputs, deduplicates canonical values, and is idempotent', () => {
    const input = fixture()
    const duplicateTruckGroup: CameraChoiceGroup = {
      label: 'Duplicate entries',
      options: [choice('truck-left', 'Truck Left Again'), choice('crab-left', 'Crab Left Again')],
    }
    input.push(duplicateTruckGroup)
    const before = JSON.stringify(input)

    const result = consolidateCameraChoices(input)
    const secondPass = consolidateCameraChoices(result)

    expect(JSON.stringify(input)).toBe(before)
    expect(result).not.toBe(input)
    expect(result[0]).not.toBe(input[0])
    expect(result.some((group) => group.label === 'Duplicate entries')).toBe(false)
    expect(secondPass).toEqual(result)
    expect(result.flatMap(values).filter((value) => value === 'truck-left')).toHaveLength(1)
  })

  it('keeps group order and canonical option placement when aliases precede their bases', () => {
    const result = consolidateCameraChoices([
      { label: 'Earlier alias group', options: [choice('tracking', 'Track Subject')] },
      { label: 'Later base group', options: [choice('follow', 'Follow')] },
      { label: 'Last group', options: [choice('static', 'Static / Locked')] },
    ])

    expect(result.map((group) => group.label)).toEqual(['Later base group', 'Last group'])
    expect(values(result[0])).toEqual(['follow'])
  })
})
