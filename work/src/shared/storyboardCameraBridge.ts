import type { StoryboardPanel } from './types'
import { storyboardTimecodes } from './storyboardTimecodes'
import { shotFov, shotFramingRank } from './shotRecipes'
import { normalizedStoryboardTransition } from './storyboardSequence'

export type StoryboardBridgeKind = 'none' | 'merged' | 'compound' | 'conflict'
export type StoryboardBridgeDirection = 'tighter' | 'wider' | 'same'
export type StoryboardCameraAxis = 'forward' | 'backward' | 'lateral' | 'vertical' | 'angular' | 'optical' | 'locked' | 'unknown'

export interface StoryboardCameraEndpoint {
  panelId: string
  shotSize: string
  /** Retained only for reading older stored bridge metadata. */
  fovDegrees?: number
  framingRank?: number
  lensMm?: number
  camera: string
  axis: StoryboardCameraAxis
}

export interface StoryboardCameraBridgePlan {
  boundaryIndex: number
  transition: 'continue' | 'hard-cut' | undefined
  kind: StoryboardBridgeKind
  source?: StoryboardCameraEndpoint
  target?: StoryboardCameraEndpoint
  /** Legacy metadata, never generated from a Shot Size choice. */
  fovDeltaDegrees?: number
  framingSteps?: number
  concurrent?: boolean
  direction: StoryboardBridgeDirection
  requiredSeconds: number
  reservedSeconds: number
  actionReserveSeconds: number
  reactionReserveSeconds: number
  authoredMoveCompatible: boolean
  bridgeText?: string
  conflict?: string
}

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
  if (/dolly-zoom|vertigo/.test(value)) return false
  if (direction === 'tighter') return /(?:dolly-in|push-in|zoom-in)/.test(value)
  return /(?:dolly-out|pull-out|zoom-out)/.test(value)
}

function conflictPlan(boundaryIndex: number, transition: StoryboardCameraBridgePlan['transition'], conflict: string): StoryboardCameraBridgePlan {
  return { boundaryIndex, transition, kind: 'conflict', direction: 'same', requiredSeconds: 0, reservedSeconds: 0, actionReserveSeconds: 0, reactionReserveSeconds: 0, authoredMoveCompatible: false, conflict }
}

export function planStoryboardCameraBridge(previous: StoryboardPanel, next: StoryboardPanel, boundaryIndex: number): StoryboardCameraBridgePlan {
  const transition = previous.transitionToNext === 'continue' ? 'continue' : previous.transitionToNext === 'hard-cut' ? 'hard-cut' : undefined
  if (transition !== 'continue') return conflictPlan(boundaryIndex, transition, '').kind === 'conflict'
    ? { ...conflictPlan(boundaryIndex, transition, ''), kind: 'none' }
    : conflictPlan(boundaryIndex, transition, '')
  if (!next.prompt.trim()) return conflictPlan(boundaryIndex, transition, `Storyboard panel ${boundaryIndex + 2} is blank. Describe its action before compiling Video Generator.`)
  const sourceRank = shotFramingRank(previous.shotSize || 'auto')
  const targetRank = shotFramingRank(next.shotSize || 'auto')
  if (sourceRank === undefined || targetRank === undefined) return conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue has unknown framing. Select a supported shot size or choose Cut.`)
  const source: StoryboardCameraEndpoint = { panelId: previous.id, shotSize: previous.shotSize || 'auto', framingRank: sourceRank, lensMm: previous.lensMm, camera: previous.camera || 'auto', axis: cameraAxis(previous.camera || 'auto') }
  const target: StoryboardCameraEndpoint = { panelId: next.id, shotSize: next.shotSize || 'auto', framingRank: targetRank, lensMm: next.lensMm, camera: next.camera || 'auto', axis: cameraAxis(next.camera || 'auto') }
  const framingSteps = Math.abs(targetRank - sourceRank)
  const direction: StoryboardBridgeDirection = framingSteps === 0 ? 'same' : targetRank > sourceRank ? 'tighter' : 'wider'
  const duration = Number(next.duration || 0)
  const metadata = { source, target, framingSteps, direction }
  const lensChanges = previous.lensMm !== undefined && next.lensMm !== undefined && previous.lensMm !== next.lensMm
  if (framingSteps === 0 && source.shotSize === target.shotSize && !lensChanges) return { ...conflictPlan(boundaryIndex, transition, ''), ...metadata, kind: 'none', authoredMoveCompatible: true }
  if ((next.camera || 'auto') === 'auto') return { ...conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue has a ${source.shotSize} → ${target.shotSize} framing change. Auto cannot plan a physically safe bridge; select a compatible movement or choose Cut.`), ...metadata }
  const movement = (next.camera || '').toLowerCase()
  const optical = /zoom|vertigo/.test(movement)
  const lensDirectionCompatible = !lensChanges || (next.lensMm! > previous.lensMm! ? /^(zoom-in|slow-zoom-in|crash-zoom-in|dolly-zoom-out|vertigo-out)$/.test(movement) : /^(zoom-out|slow-zoom-out|crash-zoom-out|dolly-zoom-in|vertigo-in)$/.test(movement))
  const compatible = next.camera !== 'static' && cameraMovementBridgeCompatibility(next.camera || 'auto', direction) && lensDirectionCompatible
  if (!compatible || (lensChanges && !optical)) return { ...conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue cannot change framing or focal length with the selected ${next.camera}. Select a compatible movement or choose Cut; no additional camera operation is inserted.`), ...metadata }
  // Framing alone cannot establish real-world distance, angular velocity or rig limits.
  // Camera motion and authored action share the selected interval; no invented reserves.
  if (!Number.isFinite(duration) || duration < 1) return { ...conflictPlan(boundaryIndex, transition, `Panel ${boundaryIndex + 2} Continue needs a selected interval of at least 1.0s. Physical feasibility still depends on authored path and extent.`), ...metadata }
  const cameraLabel = (next.camera || 'auto').replace(/-/g, ' ')
  const bridgeText = `Use the authored ${cameraLabel} once to move from ${shotFov(source.shotSize)} to ${shotFov(target.shotSize)} over the selected ${storyboardTimecodes([duration]).format(duration)}s interval, concurrently with the authored action. Preserve continuous geometry and authored endpoints; do not add another camera operation, hold or hidden lens jump.`
  return { boundaryIndex, transition, kind: 'merged', ...metadata, concurrent: true, requiredSeconds: 0, reservedSeconds: 0, actionReserveSeconds: 0, reactionReserveSeconds: 0, authoredMoveCompatible: true, bridgeText }

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
