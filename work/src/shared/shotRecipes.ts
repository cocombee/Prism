import { cameraSupportSemantics } from './cameraSupportSemantics'
import { storyboardTimecodes } from './storyboardTimecodes'

export type ShotRecipeKind = 'shot-size' | 'camera'
export type ShotRecipeFamily = 'generic' | 'seedance' | 'kling' | 'veo' | 'wan'

export interface ShotRecipeEntry {
  version: string
  text: string
  /** Quantified movement wording used by the production shot specification. */
  spec?: string
  /** Legacy numeric field retained for older recipe readers; framing no longer derives FOV. */
  degrees?: number
}

const RECIPES: Record<ShotRecipeKind, Record<string, Partial<Record<ShotRecipeFamily, ShotRecipeEntry>>>> = {
  'shot-size': {
    auto: { generic: { version: 'shot-size-auto-g1', text: 'Auto — choose the clearest framing for action and emotion while preserving spatial continuity' } },
    'extreme-wide': { generic: { version: 'shot-size-extreme-wide-g1', text: 'Extreme Wide Shot', spec: 'Environment dominates; the performer occupies a small part of the frame' } },
    wide: { generic: { version: 'shot-size-wide-g4', text: 'Wide Shot', spec: 'Full performer visible within meaningful surroundings' } },
    medium: { generic: { version: 'shot-size-medium-g4', text: 'Medium Shot', spec: 'Approximately waist-up, keeping expression and gestures readable' } },
    'close-up': { generic: { version: 'shot-size-close-up-g4', text: 'Close-up', spec: 'Face dominates the frame, approximately head and shoulders' } },
    'extreme-close-up': { generic: { version: 'shot-size-extreme-close-up-g1', text: 'Extreme Close-up', spec: 'Only the selected facial feature fills the frame; the whole face is outside the crop' } },
    detail: { generic: { version: 'shot-size-detail-g4', text: 'Detail / Insert', spec: 'Isolate the authored hand, object or action detail' } },
    establishing: { generic: { version: 'shot-size-establishing-g3', text: 'Establishing', spec: 'Establish the subject within the environment and its spatial relationships' } },
    architectural: { generic: { version: 'shot-size-architectural-g3', text: 'Architectural', spec: 'Preserve the environment geometry and scale in the selected framing' } },
  },
  camera: {
    auto: { generic: { version: 'camera-auto-g3', text: 'Auto — choose motivated camera treatment from the action; stay static when movement adds no story value', spec: 'Use one motivated, physically coherent camera treatment; keep magnitude and timing unspecified unless authored.' } },
    static: { generic: { version: 'camera-static-g3', text: 'Static / Locked — keep the camera fixed', spec: 'Locked camera; 0 m/s translation.' } },
    'dolly-in': { generic: { version: 'camera-dolly-in-g5', text: 'Dolly In — move physically closer to increase focus or intensity', spec: 'Dolly physically toward the subject on the viewing axis; preserve parallax and the authored pace through the selected endpoint; decelerate or hold only where authored. Speed and distance remain authored or unspecified.' } },
    'dolly-out': { generic: { version: 'camera-dolly-out-g5', text: 'Dolly Out — move physically away to reveal context or isolation', spec: 'Dolly physically away from the subject on the viewing axis; reveal context through parallax and preserve the authored pace through the selected endpoint; decelerate or hold only where authored. Speed and distance remain authored or unspecified.' } },
    'dolly-down-slow': { generic: { version: 'camera-dolly-down-slow-g1', text: 'Dolly Down Slow', spec: 'The camera makes a markedly slow, deliberate dolly straight downward, preserving the authored subject framing and viewing side throughout the descent.' } },
    'jib-down': { generic: { version: 'camera-jib-down-g5', text: 'Jib Down — swing downward on a jib and settle into the subject or action', spec: 'Descend on a coherent jib arc toward the selected framing; preserve target, parallax and authored pace through the endpoint; decelerate or hold only where authored. Magnitude and timing remain authored or unspecified.' } },
    'rack-focus-near': { generic: { version: 'camera-rack-focus-near-g3', text: 'Rack Focus Near — shift optical focus to the nearer subject or detail', spec: 'Shift the focus plane from the farther subject to the nearer subject without camera translation; timing remains authored or unspecified.' } },
    'rack-focus-far': { generic: { version: 'camera-rack-focus-far-g3', text: 'Rack Focus Far — shift optical focus to the farther subject or detail', spec: 'Shift the focus plane from the nearer subject to the farther subject without camera translation; timing remains authored or unspecified.' } },
    'pull-out': { generic: { version: 'camera-pull-out-g4', text: 'Pull Out — move away from the subject to reveal more context', spec: 'Move physically away from the subject to reveal context through parallax; preserve the authored pace through the selected endpoint; decelerate or hold only where authored. Speed and distance remain authored or unspecified.' } },
  },
}

function titleCaseSlug(value: string): string {
  return value.split('-').map((word) => word === 'pov' ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

/** Research-backed physical distinctions; never supplies an unauthored measurement or reference role. */
function cameraPhysicalMechanism(value: string): string | undefined {
  if (['dolly-zoom-in', 'vertigo-in'].includes(value)) return 'Translate toward the authored subject while shortening focal length to hold its frame size; change background perspective through real parallax. Preserve authored focus, axis and endpoint; travel, focal values and timing remain authored or unspecified.'
  if (['dolly-zoom-out', 'vertigo-out'].includes(value)) return 'Translate away from the authored subject while lengthening focal length to hold its frame size; compress the background through the opposing optical change. Preserve authored focus, axis and endpoint; travel, focal values and timing remain authored or unspecified.'
  const pan = /^(slow-|whip-)?pan-(left|right)$/.exec(value)
  if (pan) return `Rotate horizontally ${pan[2]} from the fixed camera station toward the authored attention target; preserve camera height and physical position. ${pan[1] === 'whip-' ? 'Motivate the rapid reorientation from the authored action or attention trigger.' : pan[1] === 'slow-' ? 'Use deliberate slow angular motion.' : 'Use the authored angular motion.'} Carry eyelines and the selected endpoint; angle, exact speed and timing remain authored or unspecified.`
  const tilt = /^(slow-|whip-)?tilt-(up|down)$/.exec(value)
  if (tilt) return `Rotate vertically ${tilt[2]} from the fixed camera station toward the authored attention target; retain camera position rather than lift or lower the rig. ${tilt[1] === 'whip-' ? 'Motivate the rapid reorientation from the authored action or attention trigger.' : tilt[1] === 'slow-' ? 'Use deliberate slow angular motion.' : 'Use the authored angular motion.'} Angle, exact speed and timing remain authored or unspecified.`
  const roll = /^roll-(clockwise|counterclockwise)$/.exec(value)
  if (roll) return `Rotate ${roll[1]} around the optical axis; retain the authored camera station and attention target. Roll extent, endpoint and timing remain authored or unspecified.`
  const dutch = /^dutch-(left|right)$/.exec(value)
  if (dutch) return `Cant the frame ${dutch[1]} around the optical axis at the authored camera station. Preserve the selected subject relationship; cant angle and any transition timing remain authored or unspecified.`
  const orbit = /^(?:(half|full)-)?(?:orbit|arc)-(left|right)$/.exec(value) || /^dolly-(circle|arc)-(left|right)$/.exec(value)
  if (orbit || value === 'gimbal-orbit') {
    const extent = orbit?.[1] === 'half' ? 'a half circuit' : orbit?.[1] === 'full' ? 'a full circuit' : 'the authored arc'
    const direction = orbit ? ` ${orbit[2]}` : ''
    return `Translate${direction} around the authored subject through ${extent}, maintaining its attention target while perspective and occlusion change; camera position travels rather than only panning. Preserve the authored camera side or intentional axis crossing; radius, height, speed and endpoint remain authored or unspecified.`
  }
  const zoom = /^(slow-|crash-)?zoom-(in|out)$/.exec(value)
  if (zoom) return `${zoom[2] === 'in' ? 'Lengthen' : 'Shorten'} focal length from the fixed camera station to ${zoom[2] === 'in' ? 'tighten' : 'widen'} the authored crop; optical zoom leaves the physical viewpoint and parallax unchanged. ${zoom[1] === 'crash-' ? 'Make the rapid optical change serve the authored attention trigger.' : zoom[1] === 'slow-' ? 'Use a deliberately slow optical change.' : 'Preserve the authored optical transition.'} Focal values, endpoint and exact timing remain authored or unspecified.`
  const lateral = /^(?:truck|crab|slider|dolly)-(left|right)$/.exec(value)
  if (lateral) return `Translate laterally ${lateral[1]} along the authored path, preserving the selected attention target and camera side; reveal depth and occlusion through parallax rather than an optical zoom or fixed-station pan. Travel, speed and endpoint remain authored or unspecified.`
  const vertical = /^(?:pedestal|dolly)-(up|down)$/.exec(value)
  if (vertical) return `Translate the camera straight ${vertical[1]} from its authored station while preserving the viewing direction and subject relationship; height changes rather than only tilting. Height change, speed and endpoint remain authored or unspecified.`
  if (['tracking', 'follow', 'dolly-follow', 'steadicam-follow', 'gimbal-follow', 'walk-and-talk', 'chase', 'over-shoulder-follow'].includes(value)) return 'Translate along the authored subject route while preserving its selected framing relationship and attention target. Carry set geography, subject travel direction and the action axis; rig character, following distance, speed and ending composition remain authored or unspecified.'
  if (['lead', 'dolly-lead'].includes(value)) return 'Retreat ahead of the advancing subject along the authored route, preserving its selected frame size and travel direction while background parallax changes. Following distance, speed and endpoint remain authored or unspecified.'
  if (['parallel-track', 'dolly-parallel', 'side-follow-left', 'side-follow-right'].includes(value)) return 'Translate beside the subject along its authored route, preserving the selected side, relative spacing, framing relationship and action axis. Travel, speed and endpoint remain authored or unspecified.'
  if (value === 'point-of-view') return 'Use the authored observer’s eye position, height and viewing direction; preserve the information it can plausibly see. Movement remains authored or unspecified rather than inferred from the POV label.'
  return undefined
}

function legacyFallback(kind: ShotRecipeKind, value: string): ShotRecipeEntry {
  if (kind === 'shot-size') return { version: `shot-size-${value || 'auto'}-legacy-v1`, text: value ? titleCaseSlug(value) : RECIPES['shot-size'].auto.generic!.text }
  const text = value ? `${titleCaseSlug(value)} — execute this camera direction smoothly and keep the subject readable` : RECIPES.camera.auto.generic!.text
  const mechanism = cameraPhysicalMechanism(value)
  return mechanism ? { version: `camera-${value}-physical-v2`, text, spec: `${text}; ${mechanism}` } : { version: `camera-${value || 'auto'}-legacy-v1`, text }
}

export function shotRecipeDetails(kind: ShotRecipeKind, value: string, family: string = 'generic'): ShotRecipeEntry & { family: string; fallback: boolean } {
  const normalized = value || 'auto'
  const support = kind === 'camera' ? cameraSupportSemantics(normalized) : undefined
  if (support) return { version: `camera-${normalized}-support-v2`, text: support.providerClause, spec: support.providerClause, family: 'generic', fallback: family !== 'generic' }
  const entry = RECIPES[kind][normalized]
  const familyRecipe = entry?.[family as ShotRecipeFamily]
  const generic = entry?.generic
  const resolved = familyRecipe || generic || legacyFallback(kind, normalized)
  return { ...resolved, family: familyRecipe ? family : 'generic', fallback: !familyRecipe && family !== 'generic' }
}

export function shotRecipe(kind: ShotRecipeKind, value: string, family?: string): string {
  return shotRecipeDetails(kind, value, family).text
}

export function shotFov(value: string, family?: string): string {
  const details = shotRecipeDetails('shot-size', value, family)
  return details.spec || details.text
}

export function shotFovDegrees(value: string, family?: string): number | undefined {
  return undefined // A shot-size choice does not establish an angle of view.
}

export function quantifiedCameraRecipe(value: string, family?: string): string {
  const details = shotRecipeDetails('camera', value, family)
  if (details.spec) return details.spec
  const normalized = (value || 'auto').toLowerCase()
  if (/rack-focus|focus-pull|deep-to-shallow|shallow-to-deep|lens-breathing/.test(normalized)) return `${details.text}; complete the authored optical transition without camera translation; timing remains unspecified.`
  if (/handheld-subtle|breath/.test(normalized)) return `${details.text}; keep the texture bounded and recover a readable endpoint; amplitude remains unspecified.`
  if (/handheld|shoulder|shake/.test(normalized)) return `${details.text}; preserve the viewing axis and subject readability while keeping amplitude unspecified.`
  if (/blast|impact|kick/.test(normalized)) return `${details.text}; motivate the displacement from the authored impact and recover the selected endpoint; magnitude remains unspecified.`
  if (/pan|tilt|roll|dutch/.test(normalized)) return `${details.text}; rotate around the appropriate camera axis toward the authored target; decelerate or hold only where authored; angular magnitude and speed remain unspecified.`
  if (/zoom/.test(normalized)) return `${details.text}; change focal framing without claiming physical translation; rate and focal values remain unspecified.`
  if (/crane|dolly|jib|truck|pedestal|push|pull|orbit|arc|boom/.test(normalized)) return `${details.text}; use a coherent physical path, viewing axis, target, parallax and authored endpoint; decelerate or hold only where authored; speed and distance remain unspecified.`
  return `${details.text}; preserve coherent geometry and a readable endpoint; magnitude and timing remain unspecified.`
}

export function allShotRecipeEntries(): ShotRecipeEntry[] {
  return Object.values(RECIPES).flatMap((byValue) => Object.values(byValue).flatMap((byFamily) => Object.values(byFamily).filter((entry): entry is ShotRecipeEntry => Boolean(entry))))
}

/** Ordinal crop relationship only, never a measured angle or focal length. */
export function shotFramingRank(value: string): number | undefined {
  return ({ 'extreme-wide': 0, establishing: 0, architectural: 0, wide: 1, medium: 2, 'close-up': 3, 'extreme-close-up': 4, detail: 4 } as Record<string, number>)[value]
}

export function selectedLensInstruction(lensMm?: number): string {
  if (lensMm === undefined) return ''
  if (!Number.isFinite(lensMm) || lensMm <= 0) throw new Error('Selected lens focal length must be a positive finite mm value.')
  return `Lens: ${lensMm}mm. Camera-to-subject distance achieves the selected framing; preserve the authored capture format and lens projection.`
}

export function timedCameraRecipe(camera: string, seconds: number, authoredPrompt = '', family?: string): string {
  if (!camera || camera === 'auto') return shotRecipe('camera', camera || 'auto', family)
  const mechanism = quantifiedCameraRecipe(camera, family)
  const interval = `${storyboardTimecodes([Number(seconds)]).format(Number(seconds))}s`
  const support = cameraSupportSemantics(camera)
  if (support) return mechanism
  if (camera === 'static') return `${mechanism} Maintain the selected view for ${interval}; no camera travel is added.`
  const authoredPace = /\b(?:slow(?:ly)?|fast|rapid(?:ly)?)\s+(?:camera|dolly|track|truck|crane|jib|zoom|pan|tilt|orbit|push|pull)\b|\b(?:camera|dolly|track|truck|crane|jib|zoom|pan|tilt|orbit|push|pull)\b(?:\s+(?:moves?|moving|dollies|tracks?|tracking|pans?|zooms?|tilts?|in|out|left|right|up|down|forward|backward|at|with|a|an|the|very|extremely)){0,5}\s+(?:slow(?:ly)?|fast|rapid(?:ly)?|constant (?:physical )?speed|speed ramp|\d+(?:\.\d+)?\s*(?:m\/s|degrees per second))\b/i.test(authoredPrompt)
  const legacyPace = /slow|fast|whip|crash|snap/.test(camera)
  if (authoredPace || legacyPace) return `${mechanism} Preserve the authored pace and extent within the ${interval} interval; do not slow or stretch the movement merely to fill the interval, and do not invent a hold.`
  return `${mechanism} Execute this operation over the selected ${interval} interval; action continues concurrently. Preserve authored endpoints and the extent specified by this choice; do not invent additional travel distance or rotation.`
}
