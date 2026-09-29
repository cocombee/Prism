export type ShutterMode = 'angle' | 'speed'

export const DEFAULT_SHUTTER_ANGLE = 180

export interface ShutterOption {
  angle: number
  value: string
  label: string
}

export interface ShutterOptionGroup {
  label: 'Creative' | 'Sync Utility'
  options: ShutterOption[]
}

const CREATIVE_ANGLES = [
  [45, 'Impact Crisp'],
  [90, 'Action Crisp'],
  [180, 'Cinematic Natural'],
  [270, 'Fluid Dream'],
  [360, 'Maximum Smear'],
] as const
const UTILITY_ANGLES = [[144, 'Sync Utility'], [172.8, 'Sync Utility']] as const

function angleOptions(entries: readonly (readonly [number, string])[]): ShutterOption[] {
  return entries.map(([angle, label]) => ({ angle, value: String(angle), label: `${angle}° — ${label}` }))
}

export const SHUTTER_ANGLE_GROUPS: readonly ShutterOptionGroup[] = [
  { label: 'Creative', options: angleOptions(CREATIVE_ANGLES) },
  { label: 'Sync Utility', options: angleOptions(UTILITY_ANGLES) },
]

export function shutterDenominator(angle: number, fps: number): number {
  return 360 * fps / angle
}

export function shutterAngleFromDenominator(denominator: number, fps: number): number {
  return 360 * fps / denominator
}

export function resolvedShutter(angle: number, fps: number) {
  const denominator = shutterDenominator(angle, fps)
  const displayedDenominator = Math.round(denominator)
  const rounded = Math.abs(denominator - displayedDenominator) > 1e-9
  const speed = `${rounded ? '≈ ' : ''}1/${displayedDenominator}s`
  return { angle, fps, denominator, speed, rounded, display: `${angle}° • ${speed} at ${fps}fps` }
}

export function shutterSpeedGroups(fps: number): ShutterOptionGroup[] {
  return [
    { label: 'Creative', options: CREATIVE_ANGLES.map(([angle, name]) => ({ angle, value: String(angle), label: `${resolvedShutter(angle, fps).speed} — ${name}` })) },
    { label: 'Sync Utility', options: UTILITY_ANGLES.map(([angle, name]) => ({ angle, value: String(angle), label: `${resolvedShutter(angle, fps).speed} — ${name}` })) },
  ]
}

const SHUTTER_PHYSICAL_WORDING: Readonly<Record<string, string>> = {
  '45': 'very short per-frame exposure with minimal directional motion blur, crisp staccato movement, and sharply separated fast-action poses.',
  '90': 'short per-frame exposure with reduced directional motion blur, crisp readable action, and clearly separated limb and impact positions.',
  '180': 'natural cinematic motion blur with a balanced transition between positional clarity and fluid continuous movement.',
  '270': 'long per-frame exposure with pronounced directional motion smear, fluid temporal blending, and graceful trails following moving limbs, hair, fabric, and practical lights.',
  '360': 'full-frame-interval exposure with maximum directional motion smear and strong temporal blending along the true paths of moving subjects and lights.',
  '144': 'utility timing relationship; do not claim anti-flicker without a verified source frequency.',
  '172.8': 'utility timing relationship; do not claim anti-flicker without a verified source frequency.',
}

const SLOW_SHUTTER_CONTINUITY = 'Smear only actually moving elements along their true paths; keep stationary architecture, horizon, and geometry stable; preserve one identity, face and anatomy, wardrobe, limbs, props, contact, screen direction, and continuity; settle to a clean readable endpoint.'

export function shutterPromptSentence(angle: number, fps: number): string {
  const wording = SHUTTER_PHYSICAL_WORDING[String(angle)] || SHUTTER_PHYSICAL_WORDING[String(DEFAULT_SHUTTER_ANGLE)]
  return `${angle}° shutter angle, equivalent to ${resolvedShutter(angle, fps).speed} at ${fps}fps; ${wording}${angle === 270 || angle === 360 ? ` ${SLOW_SHUTTER_CONTINUITY}` : ''}`
}

interface LegacyShutterSelection {
  shutterMode?: unknown
  shutterAngle?: unknown
  shutterSpeedDenominator?: unknown
}

const CANONICAL_ANGLES = new Set(SHUTTER_ANGLE_GROUPS.flatMap((group) => group.options.map((option) => option.angle)))

export function migrateShutterSelection(value: LegacyShutterSelection, fps = 24): { shutterMode: ShutterMode; shutterAngle: number } {
  const shutterMode: ShutterMode = value.shutterMode === 'speed' ? 'speed' : 'angle'
  const authoredAngle = typeof value.shutterAngle === 'number' && CANONICAL_ANGLES.has(value.shutterAngle) ? value.shutterAngle : undefined
  const derivedCandidate = typeof value.shutterSpeedDenominator === 'number'
    ? shutterAngleFromDenominator(value.shutterSpeedDenominator, fps)
    : undefined
  const derivedAngle = derivedCandidate === undefined
    ? undefined
    : [...CANONICAL_ANGLES].find((angle) => Math.abs(angle - derivedCandidate) < 1e-9)
  const shutterAngle = authoredAngle ?? derivedAngle ?? DEFAULT_SHUTTER_ANGLE
  return { shutterMode, shutterAngle }
}

export function resetShutterSelection(): { shutterMode: ShutterMode; shutterAngle: number } {
  return { shutterMode: 'angle', shutterAngle: DEFAULT_SHUTTER_ANGLE }
}
