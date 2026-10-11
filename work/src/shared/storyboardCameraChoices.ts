export type CameraChoice = readonly [string, string]

export interface CameraChoiceGroup {
  label: string
  options: readonly CameraChoice[]
}

/** Picker-only aliases. Persisted storyboard camera IDs are never rewritten. */
export const CAMERA_CHOICE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'push-in': 'dolly-in',
  'track-forward': 'dolly-in',
  'slow-dolly-in': 'dolly-in',
  'fast-dolly-in': 'dolly-in',
  'snap-push-in': 'dolly-in',
  'pull-out': 'dolly-out',
  'track-backward': 'dolly-out',
  'slow-dolly-out': 'dolly-out',
  'fast-dolly-out': 'dolly-out',
  'snap-pull-out': 'dolly-out',
  'dolly-left': 'truck-left',
  'crab-left': 'truck-left',
  'dolly-right': 'truck-right',
  'crab-right': 'truck-right',
  'slow-pan-left': 'pan-left',
  'whip-pan-left': 'pan-left',
  'slow-pan-right': 'pan-right',
  'whip-pan-right': 'pan-right',
  'slow-tilt-up': 'tilt-up',
  'whip-tilt-up': 'tilt-up',
  'slow-tilt-down': 'tilt-down',
  'whip-tilt-down': 'tilt-down',
  'dolly-down-slow': 'dolly-down',
  'slow-zoom-in': 'zoom-in',
  'crash-zoom-in': 'zoom-in',
  'slow-zoom-out': 'zoom-out',
  'crash-zoom-out': 'zoom-out',
  'vertigo-in': 'dolly-zoom-in',
  'vertigo-out': 'dolly-zoom-out',
  tracking: 'follow',
  'dolly-follow': 'follow',
})

const REMOVED_CAMERA_CHOICES = new Set(['over-shoulder-follow'])

/**
 * Return picker options with equivalent/profile-only choices consolidated.
 * Canonical options keep their original group and position when present.
 * This function only changes the picker catalog; callers must leave saved IDs
 * and the compiler input untouched.
 */
export function consolidateCameraChoices(groups: readonly CameraChoiceGroup[]): CameraChoiceGroup[] {
  const sourceIds = new Set(groups.flatMap((group) => group.options.map(([value]) => value)))
  const emittedValues = new Set<string>()

  return groups
    .map(({ label, options }) => {
      const consolidated: CameraChoice[] = []

      for (const [value, help] of options) {
        if (REMOVED_CAMERA_CHOICES.has(value)) continue

        const canonical = CAMERA_CHOICE_ALIASES[value] || value
        if (canonical !== value && sourceIds.has(canonical)) continue
        if (emittedValues.has(canonical)) continue

        emittedValues.add(canonical)
        consolidated.push([canonical, help])
      }

      return { label, options: consolidated }
    })
    .filter((group) => group.options.length > 0)
}
