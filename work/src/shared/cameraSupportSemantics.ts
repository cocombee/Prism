export const CAMERA_SUPPORT_VALUES = ['handheld', 'handheld-subtle', 'handheld-intense', 'shoulder-rig'] as const
export type CameraSupportValue = typeof CAMERA_SUPPORT_VALUES[number]

export interface CameraSupportSemantic {
  providerClause: string
  revampInstruction: string
  negatives: readonly string[]
}

export interface CameraSupportProviderDiagnostic {
  code: 'camera-support-provider-support'
  severity: 'info'
  blocking: false
  status: 'semantic-prompt-only'
  nativeSupport: 'native-unverified'
  selectedValues: CameraSupportValue[]
  message: string
}

const SHARED_SUPPORT_NEGATIVES = [
  'no support-generated invented camera path', 'no support-generated orbit', 'no support-generated arc', 'no support-generated circling',
  'no support-generated wraparound', 'no support-generated lateral travel', 'no support-generated parallax sweep', 'no support-generated track',
  'no support-generated dolly', 'no support-generated pan', 'no support-generated tilt', 'no support-generated zoom', 'no support-generated push-in',
  'no support-generated pull-out', 'no support-generated crane', 'no support-generated jib', 'no support-generated pedestal', 'no support-generated roll',
  'no support-generated yaw sweep', 'no support-generated continuous directional drift', 'no support-generated viewpoint migration',
  'no support-generated viewing-side change', 'no support-generated invented reframing',
] as const

function revampInstruction(providerClause: string): string {
  return `Preserve the already-authored camera path and action exactly. ${providerClause} During an explicit authored camera movement or spatial Continue bridge, support rides only that path, then anchors and settles at the arrived endpoint. A non-spatial Continue preserves the current anchor and does not imply travel. A Cut resets the anchor to the new shot authored viewpoint, framing, angle, and camera side; no prior momentum, path, or recovery carries across. If support and the authored path become ambiguous, preserve the authored path and omit support embellishment.`
}

const CAMERA_SUPPORT_SEMANTICS: Record<CameraSupportValue, CameraSupportSemantic> = {
  handheld: {
    providerClause: 'Restrained natural handheld micro-sway and micro-translation remain local to the current authored viewpoint and framing, then settle at that anchor.',
    revampInstruction: revampInstruction('Restrained natural handheld micro-sway and micro-translation remain local to the current authored viewpoint and framing, then settle at that anchor.'),
    negatives: SHARED_SUPPORT_NEGATIVES,
  },
  'handheld-subtle': {
    providerClause: 'Near-locked gentle handheld micro-sway remains local to the current authored viewpoint and framing, then settles calmly at that anchor.',
    revampInstruction: revampInstruction('Near-locked gentle handheld micro-sway remains local to the current authored viewpoint and framing, then settles calmly at that anchor.'),
    negatives: SHARED_SUPPORT_NEGATIVES,
  },
  'handheld-intense': {
    providerClause: 'Strong reactive handheld shake may disturb the framing locally, but remains anchored to the current authored viewpoint and recovers into that composition.',
    revampInstruction: revampInstruction('Strong reactive handheld shake may disturb the framing locally, but remains anchored to the current authored viewpoint and recovers into that composition.'),
    negatives: SHARED_SUPPORT_NEGATIVES,
  },
  'shoulder-rig': {
    providerClause: 'Weighted shoulder-mounted micro-movement and bodily operator transfer remain local to the current authored viewpoint and framing, then settle firmly at that anchor.',
    revampInstruction: revampInstruction('Weighted shoulder-mounted micro-movement and bodily operator transfer remain local to the current authored viewpoint and framing, then settle firmly at that anchor.'),
    negatives: SHARED_SUPPORT_NEGATIVES,
  },
}

export function cameraSupportSemantics(value: string | undefined): CameraSupportSemantic | undefined {
  return value && CAMERA_SUPPORT_VALUES.includes(value as CameraSupportValue)
    ? CAMERA_SUPPORT_SEMANTICS[value as CameraSupportValue]
    : undefined
}

function conflictsWithAuthoredBehavior(negative: string, authoredText: string): boolean {
  if (negative === 'no focus hunting') return /\b(?:rack\s+focus|focus\s+(?:pull|hunt(?:ing)?|shift|transition))\b/i.test(authoredText)
  if (negative === 'no zoom corrections') return /\b(?:zoom|focal\s+(?:length|correction))\b/i.test(authoredText)
  if (/overshoot or correction/.test(negative)) return /\b(?:operator\s+)?overshoot\b|\bcorrection\b/i.test(authoredText)
  if (negative === 'no invented impact response') return /\b(?:impact|collision|hit|strike)\b[^.\n]*(?:camera|jolt|shudder|shake|response)|(?:camera|jolt|shudder|shake|response)[^.\n]*\b(?:impact|collision|hit|strike)\b/i.test(authoredText)
  if (negative === 'no event-linked jolt or shudder unless separately authored') return /\b(?:impact|collision|hit|strike|event|blast|explosion)\b[^.\n]*(?:jolt|shudder|shake)|(?:jolt|shudder|shake)[^.\n]*\b(?:impact|collision|hit|strike|event|blast|explosion)\b/i.test(authoredText)
  return false
}

export function mergeCameraSupportNegatives(authoredNegative: string, value: string | undefined, authoredText = ''): string {
  const semantic = cameraSupportSemantics(value)
  if (!semantic) return authoredNegative
  const existing = new Set(authoredNegative.split(/[;\n]+/).map((term) => term.trim().toLocaleLowerCase('en-US')).filter(Boolean))
  const additions = semantic.negatives.filter((negative) => !existing.has(negative.toLocaleLowerCase('en-US')) && !conflictsWithAuthoredBehavior(negative, authoredText))
  if (!additions.length) return authoredNegative
  return `${authoredNegative}${authoredNegative ? '; ' : ''}${additions.join('; ')}`
}

const LOCKED_STATIC_CAMERA = /\b(?:locked(?:[- ]off)?(?:\s+static)?\s+camera|locked\s+static|static\s*\/\s*locked|fixed\s+camera\s+with\s+zero\s+camera\s+movement|zero\s+camera\s+movement|camera\s+(?:is|remains|stays)\s+(?:locked|fixed)\s+with\s+(?:zero|no)\s+(?:camera\s+)?movement)\b/i

export function cameraSupportConflict(value: string | undefined, authoredText: string): string | null {
  if (!cameraSupportSemantics(value) || !LOCKED_STATIC_CAMERA.test(authoredText)) return null
  return `Camera support conflict: ${value} cannot be combined with an explicitly locked static camera with zero camera movement.`
}

export function cameraSupportProviderDiagnostic(values: readonly string[]): CameraSupportProviderDiagnostic | undefined {
  const selectedValues = [...new Set(values.filter((value): value is CameraSupportValue => CAMERA_SUPPORT_VALUES.includes(value as CameraSupportValue)))]
  if (!selectedValues.length) return undefined
  return {
    code: 'camera-support-provider-support', severity: 'info', blocking: false, status: 'semantic-prompt-only', nativeSupport: 'native-unverified', selectedValues,
    message: 'Selected handheld/shoulder camera support is semantic provider-prompt intent only; native provider separation and controls are unverified.',
  }
}

export function cameraSupportNativeFields(): Record<string, never> { return {} }
