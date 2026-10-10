import { describe, expect, it } from 'vitest'
import { authoredPlaybackTiming, FILMIC_MOTION_NEGATIVE_TERMS, filmicMotionSemantics } from './filmicMotion'

const APPROVED_TEMPORAL_CLAUSES = [
  'Render motion with an even 24fps cinematic cadence and natural directional exposure blur across each frame’s exposure interval.',
  'Preserve coherent temporal progression between successive frames, with stable motion phase, consistent object boundaries and continuous spatial identity.',
  'Motion blur follows the direction and velocity present during the exposure, remaining naturally integrated into the photographed image rather than appearing as frame blending or artificial smoothing.',
  'Preserve clear leading edges, naturally softened trailing motion and stable detail whenever movement slows or stops.',
] as const

const UNRELATED_TERMS = [
  'physical camera translation', 'camera rotation', 'parallax', 'grounded contact', 'weight transfer', 'inertia',
  'follow-through', 'consequences', 'settling', 'foot skating', 'digital scale pumping',
] as const

describe('filmic motion semantics', () => {
  it('leaves capture rate, shutter exposure and speed factors unknown for authored playback intervals', () => {
    const result = filmicMotionSemantics({ authoredText: 'Slow motion then return to real time.', captureFps: 24, selectedAngle: 180, playback: { mode: 'authored', deliveryFps: 24 } })
    expect(result.deliveryFps).toBe(24)
    expect(result.captureFps).toBeUndefined()
    expect(result.playbackFps).toBeUndefined()
    expect(result.exposureSeconds).toBeUndefined()
    expect(result.positive).not.toContain('at normal speed')
    expect(result.positive).not.toContain('1/48-second')
    expect(result.positive).toContain('capture cadence, playback speed and ramp intervals in each shot or beat')
  })
  it('detects playback wording without interpreting slow camera travel as slow playback', () => {
    for (const text of ['slow-motion', 'No slow motion', 'Speed ramping at impact', 'play back at 24fps', 'real-time', '120fps capture']) expect(authoredPlaybackTiming(text)).toBe(true)
    for (const text of ['Slow dolly down', 'Extremely fast pan', '80cm travel in 4 seconds', 'Slow shutter']) expect(authoredPlaybackTiming(text)).toBe(false)
  })
  it('retains the literal no-motion-blur conflict when authored playback owns intervals', () => {
    const result = filmicMotionSemantics({ authoredText: 'Slow motion, no motion blur.', captureFps: 24, selectedAngle: 180, playback: { mode: 'authored', deliveryFps: 24 } })
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'shutter-no-motion-blur', severity: 'conflict' }))
  })
  it('checks an explicit authored capture/shutter pair against capture rather than delivery cadence', () => {
    const input = { captureFps: 24, selectedAngle: 180, playback: { mode: 'authored' as const, deliveryFps: 24 } }
    const correct = filmicMotionSemantics({ ...input, authoredText: 'Slow motion. Capture at 120fps with 180-degree shutter angle and shutter speed 1/240 second.' })
    expect(correct.captureFps).toBe(120)
    expect(correct.exposureSeconds).toBeCloseTo(1 / 240)
    expect(correct.diagnostics).toEqual([])
    const conflict = filmicMotionSemantics({ ...input, authoredText: 'Slow motion. Capture at 120fps with 180-degree shutter angle and shutter speed 1/120 second.' })
    expect(conflict.diagnostics).toContainEqual(expect.objectContaining({ code: 'shutter-pair-conflict' }))
  })
  it('resolves ordinary capture/playback and 180-degree exposure from capture FPS', () => {
    for (const [captureFps, reciprocal] of [[24, 48], [25, 50], [30, 60], [60, 120], [100, 200]] as const) {
      const result = filmicMotionSemantics({ authoredText: '', captureFps, selectedAngle: 180, playback: { mode: 'normal' } })
      expect(result.capturePlaybackSentence).toBe(`Capture at ${captureFps}fps and play back at ${captureFps}fps at normal speed.`)
      expect(result.shutterSentence).toBe(`Use a 180-degree shutter angle, equivalent to 1/${reciprocal}-second exposure for every captured frame.`)
      expect(result.exposureSeconds).toBeCloseTo(1 / reciprocal, 10)
    }
  })

  it('uses capture FPS rather than playback or Motion FPS as the shutter basis', () => {
    const result = filmicMotionSemantics({ authoredText: '', captureFps: 24, selectedAngle: 180, motionFps: 16, playback: { mode: 'normal' } })
    expect(result.shutterSentence).toContain('1/48-second')
    expect(result.shutterSentence).not.toContain('1/32-second')
    expect(result.motionCadenceSentence).toBe('Visual Motion FPS intent: 16fps; capture and playback remain 24fps at normal speed.')
  })

  it('keeps normal-speed and future conformed-slow-motion representations distinct', () => {
    const normal = filmicMotionSemantics({ authoredText: '', captureFps: 100, selectedAngle: 180, playback: { mode: 'normal' } })
    const conformed = filmicMotionSemantics({ authoredText: '', captureFps: 100, selectedAngle: 180, playback: { mode: 'conformed-slow-motion', playbackFps: 25 } })
    expect(normal.capturePlaybackSentence).toBe('Capture at 100fps and play back at 100fps at normal speed.')
    expect(conformed.capturePlaybackSentence).toBe('Capture at 100fps and conform playback to 25fps for slow motion.')
    expect(normal.shutterSentence).toContain('1/200-second')
    expect(conformed.shutterSentence).toContain('1/200-second')
  })

  it('renders only the approved temporal clauses and no camera/action/timing semantics', () => {
    const result = filmicMotionSemantics({ authoredText: '', captureFps: 24, selectedAngle: 180, playback: { mode: 'normal' } })
    expect(result.positive).toContain('FILMIC MOTION RENDERING')
    for (const clause of APPROVED_TEMPORAL_CLAUSES) expect(result.positive).toContain(clause)
    for (const term of UNRELATED_TERMS) expect(`${result.positive}\n${result.negative}`).not.toContain(term)
  })

  it('emits and deduplicates the exact 14 approved negative terms', () => {
    expect(FILMIC_MOTION_NEGATIVE_TERMS).toEqual([
      'hard photographic cadence', 'disconnected still frames', 'slideshow motion', 'stop-motion cadence',
      'cadence jitter', 'frame skipping', 'frame duplication', 'frame blending', 'optical-flow artifacts',
      'temporal ghosting', 'repeated contours', 'detached motion trails', 'double images', 'excessive motion smear',
    ])
    const result = filmicMotionSemantics({ authoredText: 'NEGATIVE PROMPT: frame blending, No Temporal Ghosting.', captureFps: 24, selectedAngle: 180, playback: { mode: 'normal' } })
    const combined = `${result.authoredText} ${result.negative}`
    expect(combined.match(/frame blending/gi)).toHaveLength(1)
    expect(combined.match(/temporal ghosting/gi)).toHaveLength(1)
    expect(result.negative.split(', ')).toHaveLength(12)
  })

  it('derives authored shutter pairs, preserves authored bytes, and reports conflicts', () => {
    const angleText = 'Use a 90° shutter angle. Camera and action remain authored.'
    const angle = filmicMotionSemantics({ authoredText: angleText, captureFps: 24, selectedAngle: 180, playback: { mode: 'normal' } })
    expect(angle.authoredText).toBe(angleText)
    expect(angle.shutterSentence).toBe('Use the authored 90-degree shutter angle, equivalent to 1/96-second exposure for every captured frame.')
    expect(angle.shutterSentence).not.toContain('180-degree')

    const speedText = 'Use shutter speed 1/120 second.'
    const speed = filmicMotionSemantics({ authoredText: speedText, captureFps: 30, selectedAngle: 180, playback: { mode: 'normal' } })
    expect(speed.authoredText).toBe(speedText)
    expect(speed.shutterSentence).toBe('Use the authored 90-degree shutter angle, equivalent to 1/120-second exposure for every captured frame.')

    const conflict = filmicMotionSemantics({ authoredText: 'Use a 180° shutter angle and shutter speed 1/120 second.', captureFps: 24, selectedAngle: 180, playback: { mode: 'normal' } })
    expect(conflict.diagnostics).toContainEqual(expect.objectContaining({ severity: 'conflict', code: 'shutter-pair-conflict' }))
  })

  it('distinguishes literal no motion blur, no ghosting, slow shutter, and slow motion', () => {
    expect(filmicMotionSemantics({ authoredText: 'Use a 180° shutter angle with no motion blur.', captureFps: 24, selectedAngle: 180, playback: { mode: 'normal' } }).diagnostics)
      .toContainEqual(expect.objectContaining({ severity: 'conflict', code: 'shutter-no-motion-blur' }))
    expect(filmicMotionSemantics({ authoredText: 'Use a 180° shutter angle with no ghosting.', captureFps: 24, selectedAngle: 180, playback: { mode: 'normal' } }).diagnostics)
      .not.toContainEqual(expect.objectContaining({ code: 'shutter-no-motion-blur' }))
    const longExposure = filmicMotionSemantics({ authoredText: '', captureFps: 24, selectedAngle: 360, playback: { mode: 'normal' } })
    expect(longExposure.shutterSentence).toContain('1/24-second')
    expect(longExposure.capturePlaybackSentence).toContain('normal speed')
    expect(longExposure.positive).not.toContain('slow motion')
  })
})
