import type { StoryboardPanel } from './types'
import { shotFov, shotFovDegrees } from './shotRecipes'
import { normalizedStoryboardTransition } from './storyboardSequence'

export type StoryboardBridgeKind = 'none' | 'merged' | 'compound' | 'conflict'
export type StoryboardBridgeDirection = 'tighter' | 'wider' | 'same'
export type StoryboardCameraAxis = 'forward' | 'backward' | 'lateral' | 'vertical' | 'angular' | 'optical' | 'locked' | 'unknown'

export interface StoryboardCameraEndpoint {
  panelId: string
  shotSize: string
  fovDegrees: number
  camera: string
  axis: StoryboardCameraAxis
}

export interface StoryboardCameraBridgePlan {
  boundaryIndex: number
  transition: 'continue' | 'hard-cut' | undefined
  kind: StoryboardBridgeKind
  source?: StoryboardCameraEndpoint
  target?: StoryboardCameraEndpoint
  fovDeltaDegrees: number
  direction: StoryboardBridgeDirection
  requiredSeconds: number
  reservedSeconds: number
  actionReserveSeconds: number
  reactionReserveSeconds: number
  authoredMoveCompatible: boolean
  bridgeText?: string
  conflict?: string
}

const roundToTenth = (value: number) => Math.round(value * 10) / 10
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function cameraAxis(camera: string): StoryboardCameraAxis {
  const value = (camera || '').toLowerCase()
  if (value === 'static') return 'locked'
  if (/rack-focus|focus-pull|zoom|lens-breathing/.test(value)) return 'optical'
  if (/dolly-in|push-in/.test(value)) return 'forward'
  if (/dolly-out|pull-out/.test(value)) return 'backward'
  if (/truck|pan/.test(value)) return 'lateral'
  if (/jib|crane|pedestal|tilt/.test(value)) return 'vertical'
  if (/orbit|arc|roll|dutch|handheld|shoulder/.test(value)) return 'angular'
  return 'unknown'
}

export function cameraMovementBridgeCompatibility(camera: string, direction: StoryboardBridgeDirection): boolean {
  if (direction === 'same') return true
  const value = (camera || '').toLowerCase()
  if (direction === 'tighter') return /(?:dolly-in|push-in|zoom-in)/.test(value)
  return /(?:dolly-out|pull-out|zoom-out)/.test(value)
}

function conflictPlan(boundaryIndex: number, transition: StoryboardCameraBridgePlan['transition'], conflict: string): StoryboardCameraBridgePlan {
  return { boundaryIndex, transition, kind: 'conflict', fovDeltaDegrees: 0, direction: 'same', requiredSeconds: 0, reservedSeconds: 0, actionReserveSeconds: 0, reactionReserveSeconds: 0, authoredMoveCompatible: false, conflict }
}

export function planStoryboardCameraBridge(previous: StoryboardPanel, next: StoryboardPanel, boundaryIndex: number): StoryboardCameraBridgePlan {
  const transition = previous.transitionToNext === 'continue' ? 'continue' : previous.transitionToNext === 'hard-cut' ? 'hard-cut' : undefined
  if (transition !== 'continue') return conflictPlan(boundaryIndex, transition, '').kind === 'conflict'
    ? { ...conflictPlan(boundaryIndex, transition, ''), kind: 'none' }
    : conflictPlan(boundaryIndex, transition, '')
  if (!next.prompt.trim()) return conflictPlan(boundaryIndex, transition, `Storyboard panel ${boundaryIndex + 2} is blank. Describe its action before compiling Video Generator.`)
  const sourceFov = shotFovDegrees(previous.shotSize || 'auto')
  const targetFov = shotFovDegrees(next.shotSize || 'auto')
  if (sourceFov === undefined || targetFov === undefined) return conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue has unknown framing. Select a supported shot size or choose Cut.`)
  const source: StoryboardCameraEndpoint = { panelId: previous.id, shotSize: previous.shotSize || 'auto', fovDegrees: sourceFov, camera: previous.camera || 'auto', axis: cameraAxis(previous.camera || 'auto') }
  const target: StoryboardCameraEndpoint = { panelId: next.id, shotSize: next.shotSize || 'auto', fovDegrees: targetFov, camera: next.camera || 'auto', axis: cameraAxis(next.camera || 'auto') }
  const delta = Math.abs(targetFov - sourceFov)
  const direction: StoryboardBridgeDirection = delta <= 8 ? 'same' : targetFov < sourceFov ? 'tighter' : 'wider'
  const duration = Number(next.duration || 0)
  const reactionReserveSeconds = roundToTenth(Math.max(0.5, duration * 0.2))
  const actionReserveSeconds = roundToTenth(Math.max(0.75, duration * 0.45))
  const base = delta <= 8 ? 0 : clamp(roundToTenth(0.5 + delta / 35), 0.8, 2.3)
  if (delta <= 8) return { boundaryIndex, transition, kind: 'none', source, target, fovDeltaDegrees: delta, direction, requiredSeconds: 0, reservedSeconds: 0, actionReserveSeconds, reactionReserveSeconds, authoredMoveCompatible: true }
  if ((next.camera || 'auto') === 'auto') return { ...conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue has a ${source.shotSize} → ${target.shotSize} framing change. Auto cannot plan a physically safe bridge; select a compatible movement or choose Cut.`), source, target, fovDeltaDegrees: delta, direction, actionReserveSeconds, reactionReserveSeconds }
  if (target.axis === 'unknown') return { ...conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue has an unknown camera movement. Select a supported movement or choose Cut.`), source, target, fovDeltaDegrees: delta, direction, actionReserveSeconds, reactionReserveSeconds }
  const compatible = cameraMovementBridgeCompatibility(next.camera || 'auto', direction)
  const requiredSeconds = compatible ? Math.max(0.5, roundToTenth(base * 0.65)) : base
  const available = roundToTenth(duration - reactionReserveSeconds - actionReserveSeconds)
  if (available < requiredSeconds) return { ...conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue cannot fit the ${source.shotSize} → ${target.shotSize} camera bridge plus authored action in ${duration}s. Increase panel duration, reduce the framing change, choose a compatible camera movement, or choose Cut.`), source, target, fovDeltaDegrees: delta, direction, requiredSeconds, actionReserveSeconds, reactionReserveSeconds, authoredMoveCompatible: compatible }
  const targetLabel = shotFov(target.shotSize)
  const sourceLabel = shotFov(source.shotSize)
  const optical = /zoom/.test((next.camera || '').toLowerCase())
  const cameraLabel = (next.camera || 'auto').replace(/-/g, ' ')
  const bridgeText = compatible
    ? `${optical ? 'Use the authored optical zoom' : `Use the authored ${cameraLabel}`} once to move from ${sourceLabel} to ${targetLabel}; preserve continuous geometry and settle at the target before the main action.`
    : `Start from ${sourceLabel}; translate physically on the established axis to ${targetLabel}, preserve possible parallax, settle at the target, then ${target.axis === 'locked' ? 'lock the camera at 0 m/s' : `execute the authored ${cameraLabel}`}. No hidden lens jump, teleport, dissolve, or reset.`
  return { boundaryIndex, transition, kind: compatible ? 'merged' : 'compound', source, target, fovDeltaDegrees: delta, direction, requiredSeconds, reservedSeconds: requiredSeconds, actionReserveSeconds, reactionReserveSeconds, authoredMoveCompatible: compatible, bridgeText }
}

export function planStoryboardCameraBridges(panels: StoryboardPanel[], mode: 'single' | 'separate' = 'single'): StoryboardCameraBridgePlan[] {
  return panels.slice(0, -1).map((panel, index) => {
    const normalized = normalizedStoryboardTransition(panel.transitionToNext, index, panels.length, mode)
    return planStoryboardCameraBridge({ ...panel, transitionToNext: normalized }, panels[index + 1], index)
  })
}

export function storyboardCameraBridgeReadiness(plans: StoryboardCameraBridgePlan[]): string | null {
  return plans.find((plan) => plan.conflict)?.conflict || null
}
