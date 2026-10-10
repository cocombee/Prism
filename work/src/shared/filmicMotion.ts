import { shutterAngleFromDenominator, shutterDenominator } from './shutter'

export const FILMIC_MOTION_NEGATIVE_TERMS = [
  'hard photographic cadence',
  'disconnected still frames',
  'slideshow motion',
  'stop-motion cadence',
  'cadence jitter',
  'frame skipping',
  'frame duplication',
  'frame blending',
  'optical-flow artifacts',
  'temporal ghosting',
  'repeated contours',
  'detached motion trails',
  'double images',
  'excessive motion smear',
] as const

export type FilmicMotionDiagnosticSeverity = 'conflict' | 'warning'

export interface FilmicMotionDiagnostic {
  severity: FilmicMotionDiagnosticSeverity
  code: string
  message: string
}

export type FilmicMotionPlayback =
  | { mode: 'normal' }
  | { mode: 'conformed-slow-motion'; playbackFps: number }
  | { mode: 'authored'; deliveryFps: number }

export interface FilmicMotionSemantics {
  authoredText: string
  captureFps?: number
  playbackFps?: number
  deliveryFps?: number
  shutterAngle: number
  exposureSeconds?: number
  capturePlaybackSentence: string
  shutterSentence: string
  motionCadenceSentence: string
  positive: string
  negative: string
  diagnostics: FilmicMotionDiagnostic[]
}

function authoredAngle(text: string): number | undefined {
  const match = text.match(/(?:\bshutter\s+angle\s*(?:of|:|=)?\s*|\b)(\d+(?:\.\d+)?)\s*(?:°|[- ]?degrees?)\s+shutter\b/i)
    || text.match(/\bshutter\s+angle\s*(?:of|:|=)?\s*(\d+(?:\.\d+)?)\s*(?:°|degrees?)?/i)
  const value = match ? Number(match[1]) : undefined
  return value && value > 0 ? value : undefined
}

function authoredDenominator(text: string): number | undefined {
  const match = text.match(/\bshutter\s+speed\s*(?:of|:|=|at)?\s*1\s*\/\s*(\d+(?:\.\d+)?)/i)
    || text.match(/\b1\s*\/\s*(\d+(?:\.\d+)?)\s*(?:s|sec(?:ond)?s?)?\s+shutter\b/i)
  const value = match ? Number(match[1]) : undefined
  return value && value > 0 ? value : undefined
}

function displayNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

function reciprocalText(denominator: number): string {
  const displayed = Math.round(denominator)
  return `${Math.abs(denominator - displayed) > 1e-9 ? 'approximately ' : ''}1/${displayed}-second`
}

function missingNegativeTerms(authoredText: string): string[] {
  const normalized = authoredText.toLocaleLowerCase()
  return FILMIC_MOTION_NEGATIVE_TERMS.filter((term) => !normalized.includes(term))
}

/** Detection defers to authored intervals; it does not infer a ramp, FPS or speed factor. */
export function authoredPlaybackTiming(text: string): boolean {
  return /\b(?:slow[ -]?motion|speed[ -]?ramp(?:ing)?|playback|play\s*back|conform(?:ed|ing)?|overcrank(?:ed|ing)?|undercrank(?:ed|ing)?|real[ -]?time|normal[ -]?speed)\b|\b\d+(?:\.\d+)?\s*fps\b/i.test(text)
}

export function filmicMotionSemantics(input: {
  authoredText: string
  captureFps: number
  selectedAngle: number
  motionFps?: number
  playback: FilmicMotionPlayback
}): FilmicMotionSemantics {
  const { authoredText, captureFps, selectedAngle, motionFps, playback } = input
  if (playback.mode === 'authored') {
    const captureRates = [...new Set([...authoredText.matchAll(/\b(?:capture(?:d)?|record(?:ed)?|shoot)\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*fps\b/gi)].map(match => Number(match[1])).filter(rate => rate > 0))]
    const explicitCaptureFps = captureRates.length === 1 ? captureRates[0] : undefined
    const angle = authoredAngle(authoredText)
    const denominator = authoredDenominator(authoredText)
    const shutterAngle = angle || (denominator && explicitCaptureFps ? shutterAngleFromDenominator(denominator, explicitCaptureFps) : undefined) || selectedAngle
    const diagnostics: FilmicMotionDiagnostic[] = shutterAngle > 0 && /\bno\s+motion\s+blur\b/i.test(authoredText)
      ? [{ severity: 'conflict', code: 'shutter-no-motion-blur', message: 'A positive shutter angle creates directional exposure blur and conflicts with literal "no motion blur".' }]
      : []
    if (angle && denominator && explicitCaptureFps && Math.abs(shutterDenominator(angle, explicitCaptureFps) - denominator) > 0.5) diagnostics.push({
      severity: 'conflict', code: 'shutter-pair-conflict',
      message: `Authored shutter angle ${displayNumber(angle)}° conflicts with authored shutter speed 1/${displayNumber(denominator)}s at authored capture ${explicitCaptureFps}fps.`,
    })
    const capturePlaybackSentence = `Deliver at ${playback.deliveryFps}fps. Preserve the authored capture cadence, playback speed and ramp intervals in each shot or beat; delivery cadence does not define camera movement speed.`
    const shutterSentence = `Preserve authored shutter angle and exposure within each interval; otherwise use the selected ${displayNumber(selectedAngle)}-degree shutter angle with exposure based on that interval’s capture cadence, not delivery FPS.`
    const motionCadenceSentence = motionFps === undefined ? '' : `Selected visual Motion FPS intent: ${motionFps}fps; retain authored interval-specific capture and playback timing.`
    return {
      authoredText, deliveryFps: playback.deliveryFps, captureFps: explicitCaptureFps, shutterAngle,
      exposureSeconds: explicitCaptureFps ? shutterAngle / (360 * explicitCaptureFps) : undefined,
      capturePlaybackSentence, shutterSentence, motionCadenceSentence,
      positive: ['FILMIC MOTION RENDERING', capturePlaybackSentence, shutterSentence, motionCadenceSentence,
        'Preserve coherent temporal progression, spatial identity and natural directional exposure blur within each authored interval; do not infer a capture rate, playback factor or additional ramp.',
      ].filter(Boolean).join('\n\n'),
      negative: missingNegativeTerms(authoredText).join(', '), diagnostics,
    }
  }
  const diagnostics: FilmicMotionDiagnostic[] = []
  const angle = authoredAngle(authoredText)
  const denominator = authoredDenominator(authoredText)
  const derivedAngle = denominator ? shutterAngleFromDenominator(denominator, captureFps) : undefined

  if (angle && denominator) {
    const expected = shutterDenominator(angle, captureFps)
    if (Math.abs(expected - denominator) > 0.5) diagnostics.push({
      severity: 'conflict',
      code: 'shutter-pair-conflict',
      message: `Authored shutter angle ${displayNumber(angle)}° conflicts with authored shutter speed 1/${displayNumber(denominator)}s at ${captureFps}fps.`,
    })
  }

  const shutterAngle = angle || derivedAngle || selectedAngle
  if (shutterAngle > 0 && /\bno\s+motion\s+blur\b/i.test(authoredText)) diagnostics.push({
    severity: 'conflict',
    code: 'shutter-no-motion-blur',
    message: `A positive shutter angle creates directional exposure blur and conflicts with literal "no motion blur" at ${captureFps}fps.`,
  })

  const exposureDenominator = shutterDenominator(shutterAngle, captureFps)
  const playbackFps = playback.mode === 'normal' ? captureFps : playback.playbackFps
  const capturePlaybackSentence = playback.mode === 'normal'
    ? `Capture at ${captureFps}fps and play back at ${playbackFps}fps at normal speed.`
    : `Capture at ${captureFps}fps and conform playback to ${playbackFps}fps for slow motion.`
  const ownership = angle || denominator ? 'the authored ' : 'a '
  const shutterSentence = `Use ${ownership}${displayNumber(shutterAngle)}-degree shutter angle, equivalent to ${reciprocalText(exposureDenominator)} exposure for every captured frame.`
  const motionCadenceSentence = motionFps === undefined
    ? ''
    : `Visual Motion FPS intent: ${motionFps}fps; capture and playback remain ${captureFps}fps at normal speed.`
  const temporalCadence = motionFps === undefined || motionFps === captureFps
    ? `Render motion with an even ${captureFps}fps cinematic cadence and natural directional exposure blur across each frame’s exposure interval.`
    : `Render the selected ${motionFps}fps visual motion intent within the even ${captureFps}fps captured cadence, with natural directional exposure blur across each frame’s exposure interval.`
  const positive = [
    'FILMIC MOTION RENDERING',
    capturePlaybackSentence,
    shutterSentence,
    motionCadenceSentence,
    temporalCadence,
    'Preserve coherent temporal progression between successive frames, with stable motion phase, consistent object boundaries and continuous spatial identity.',
    'Motion blur follows the direction and velocity present during the exposure, remaining naturally integrated into the photographed image rather than appearing as frame blending or artificial smoothing.',
    'Preserve clear leading edges, naturally softened trailing motion and stable detail whenever movement slows or stops.',
  ].filter(Boolean).join('\n\n')

  return {
    authoredText,
    captureFps,
    playbackFps,
    shutterAngle,
    exposureSeconds: shutterAngle / (360 * captureFps),
    capturePlaybackSentence,
    shutterSentence,
    motionCadenceSentence,
    positive,
    negative: missingNegativeTerms(authoredText).join(', '),
    diagnostics,
  }
}
