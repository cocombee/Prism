import { cameraSupportSemantics } from './cameraSupportSemantics'

export type ShotRecipeKind = 'shot-size' | 'camera'
export type ShotRecipeFamily = 'generic' | 'seedance' | 'kling' | 'veo' | 'wan'

export interface ShotRecipeEntry {
  version: string
  text: string
  /** Quantified movement wording used by the production shot specification. */
  spec?: string
  /** Numeric horizontal field-of-view authority used by deterministic planners. */
  degrees?: number
}

const RECIPES: Record<ShotRecipeKind, Record<string, Partial<Record<ShotRecipeFamily, ShotRecipeEntry>>>> = {
  'shot-size': {
    auto: { generic: { version: 'shot-size-auto-g1', text: 'Auto — choose the clearest framing for action and emotion while preserving spatial continuity' } },
    wide: { generic: { version: 'shot-size-wide-g2', text: 'Wide — establish subject, environment, and spatial relationships', spec: '63° wide', degrees: 63 } },
    medium: { generic: { version: 'shot-size-medium-g2', text: 'Medium — balance performance, gesture, and surrounding context', spec: '47° neutral', degrees: 47 } },
    'close-up': { generic: { version: 'shot-size-close-up-g2', text: 'Close-Up — prioritize facial performance and emotional detail', spec: '29° portrait compression', degrees: 29 } },
    detail: { generic: { version: 'shot-size-detail-g2', text: 'Detail — isolate the important hand, object, or action detail', spec: '8° detail compression', degrees: 8 } },
    establishing: { generic: { version: 'shot-size-establishing-g1', text: 'Establishing — map architecture and complete spatial relationships', spec: '84° architectural wide', degrees: 84 } },
    architectural: { generic: { version: 'shot-size-architectural-g1', text: 'Architectural — preserve full environment geometry and scale', spec: '84° architectural wide', degrees: 84 } },
  },
  camera: {
    auto: { generic: { version: 'camera-auto-g3', text: 'Auto — choose motivated camera treatment from the action; stay static when movement adds no story value', spec: 'Use one motivated, physically coherent camera treatment; keep magnitude and timing unspecified unless authored.' } },
    static: { generic: { version: 'camera-static-g3', text: 'Static / Locked — keep the camera fixed', spec: 'Locked camera; 0 m/s translation.' } },
    'dolly-in': { generic: { version: 'camera-dolly-in-g4', text: 'Dolly In — move physically closer to increase focus or intensity', spec: 'Dolly physically toward the subject on the viewing axis; preserve parallax, decelerate into the selected endpoint, then hold. Speed and distance remain authored or unspecified.' } },
    'dolly-out': { generic: { version: 'camera-dolly-out-g4', text: 'Dolly Out — move physically away to reveal context or isolation', spec: 'Dolly physically away from the subject on the viewing axis; reveal context through parallax, decelerate into the selected endpoint, then hold. Speed and distance remain authored or unspecified.' } },
    'dolly-down-slow': { generic: { version: 'camera-dolly-down-slow-g1', text: 'Dolly Down Slow', spec: 'The camera makes a markedly slow, deliberate dolly straight downward, preserving the authored subject framing and viewing side throughout the descent.' } },
    'jib-down': { generic: { version: 'camera-jib-down-g4', text: 'Jib Down — swing downward on a jib and settle into the subject or action', spec: 'Descend on a coherent jib arc toward the selected framing; preserve target and parallax, decelerate into the endpoint, then hold. Magnitude and timing remain authored or unspecified.' } },
    'rack-focus-near': { generic: { version: 'camera-rack-focus-near-g3', text: 'Rack Focus Near — shift optical focus to the nearer subject or detail', spec: 'Shift the focus plane from the farther subject to the nearer subject without camera translation; timing remains authored or unspecified.' } },
    'rack-focus-far': { generic: { version: 'camera-rack-focus-far-g3', text: 'Rack Focus Far — shift optical focus to the farther subject or detail', spec: 'Shift the focus plane from the nearer subject to the farther subject without camera translation; timing remains authored or unspecified.' } },
    'pull-out': { generic: { version: 'camera-pull-out-g3', text: 'Pull Out — move away from the subject to reveal more context', spec: 'Move physically away from the subject to reveal context through parallax; decelerate into the selected endpoint and hold. Speed and distance remain authored or unspecified.' } },
  },
}

function titleCaseSlug(value: string): string {
  return value.split('-').map((word) => word === 'pov' ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function legacyFallback(kind: ShotRecipeKind, value: string): ShotRecipeEntry {
  if (kind === 'shot-size') return { version: `shot-size-${value || 'auto'}-legacy-v1`, text: value ? titleCaseSlug(value) : RECIPES['shot-size'].auto.generic!.text }
  return { version: `camera-${value || 'auto'}-legacy-v1`, text: value ? `${titleCaseSlug(value)} — execute this camera direction smoothly and keep the subject readable` : RECIPES.camera.auto.generic!.text }
}

export function shotRecipeDetails(kind: ShotRecipeKind, value: string, family: string = 'generic'): ShotRecipeEntry & { family: string; fallback: boolean } {
  const normalized = value || 'auto'
  const support = kind === 'camera' ? cameraSupportSemantics(normalized) : undefined
  if (support) return { version: `camera-${normalized}-support-v1`, text: support.providerClause, spec: support.providerClause, family: 'generic', fallback: family !== 'generic' }
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
  return shotRecipeDetails('shot-size', value, family).degrees
}

export function quantifiedCameraRecipe(value: string, family?: string): string {
  const details = shotRecipeDetails('camera', value, family)
  if (details.spec) return details.spec
  const normalized = (value || 'auto').toLowerCase()
  if (/rack-focus|focus-pull|deep-to-shallow|shallow-to-deep|lens-breathing/.test(normalized)) return `${details.text}; complete the authored optical transition without camera translation; timing remains unspecified.`
  if (/handheld-subtle|breath/.test(normalized)) return `${details.text}; keep the texture bounded and recover a readable endpoint; amplitude remains unspecified.`
  if (/handheld|shoulder|shake/.test(normalized)) return `${details.text}; preserve the viewing axis and subject readability while keeping amplitude unspecified.`
  if (/blast|impact|kick/.test(normalized)) return `${details.text}; motivate the displacement from the authored impact and recover the selected endpoint; magnitude remains unspecified.`
  if (/pan|tilt|roll|dutch/.test(normalized)) return `${details.text}; rotate around the appropriate camera axis toward the authored target, decelerate, and hold; angular magnitude and speed remain unspecified.`
  if (/zoom/.test(normalized)) return `${details.text}; change focal framing without claiming physical translation; rate and focal values remain unspecified.`
  if (/crane|dolly|jib|truck|pedestal|push|pull|orbit|arc|boom/.test(normalized)) return `${details.text}; use a coherent physical path, viewing axis, target, parallax, deceleration, endpoint, and hold; speed and distance remain unspecified.`
  return `${details.text}; preserve coherent geometry and a readable endpoint; magnitude and timing remain unspecified.`
}

export function allShotRecipeEntries(): ShotRecipeEntry[] {
  return Object.values(RECIPES).flatMap((byValue) => Object.values(byValue).flatMap((byFamily) => Object.values(byFamily).filter((entry): entry is ShotRecipeEntry => Boolean(entry))))
}
