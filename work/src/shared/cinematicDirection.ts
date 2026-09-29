import type { GenerationRequest } from './types'
import { productionShotSpecSections, renderShotSpecSections } from './shotSpec'

/**
 * The Direction Layer is the film-craft half of the prompt. Reference authority
 * says what must be preserved; this says how it should be *shot*. It is derived
 * from the resolved graph, so it never contradicts a connected authority: every
 * clause is explicitly subordinate to the written prompt, the Style asset, the
 * Storyboard, and the semantic references.
 */

export type DirectionFormat = 'motion' | 'still'

export interface DirectionInputs {
  format: DirectionFormat
  duration?: number
  shotCount: number
  hasAuthoredShotPlan: boolean
  hasStyleAuthority: boolean
  hasCharacter: boolean
  hasLocation: boolean
  hasElement: boolean
  hasAudioAuthority: boolean
  hasMotionAuthority: boolean
  hasStartFrame: boolean
  hasEndFrame: boolean
  aspectRatio?: string
}

export function directionInputsFor(request: GenerationRequest): DirectionInputs {
  const references = request.references || []
  // storyboardShotCount survives per-shot splitting; multiPrompt only exists on
  // the combined request, so an authored plan must be read from both.
  const shots = request.storyboardShotCount || request.multiPrompt?.length || 0
  return {
    format: request.kind === 'video-generator' ? 'motion' : 'still',
    duration: request.duration,
    shotCount: shots,
    hasAuthoredShotPlan: shots > 0,
    hasStyleAuthority: references.some((reference) => reference.role === 'style')
      || (request.connectionRules || []).some((rule) => /style/i.test(rule.label)),
    hasCharacter: references.some((reference) => reference.role === 'character'),
    hasLocation: references.some((reference) => reference.role === 'location'),
    hasElement: references.some((reference) => reference.role === 'element'),
    hasAudioAuthority: references.some((reference) => reference.authority === 'audio-timing'),
    hasMotionAuthority: references.some((reference) => reference.authority === 'motion-camera'),
    hasStartFrame: references.some((reference) => reference.slot === 'start'),
    hasEndFrame: references.some((reference) => reference.slot === 'end'),
    aspectRatio: request.aspectRatio,
  }
}

/**
 * Beat count is a directing decision, not a fixed constant: a 5s clip carries one
 * gesture, a 20s clip needs a turn or it reads as a loop.
 */
export function storySpine(duration: number | undefined, shotCount: number): string[] {
  if (shotCount > 1) return []
  const seconds = duration && duration > 0 ? duration : 5
  if (seconds <= 6) return [
    'SINGLE BEAT — one clear intention carried from first to last frame. Open already inside the moment, land one readable change of state, and hold the final composition long enough to register.',
  ]
  if (seconds <= 12) return [
    'BEAT 1 — Establish: reveal who, where, and what is at stake in the first third. Let the frame settle before anything moves.',
    'BEAT 2 — Turn: one motivated change — an action completes, an object is revealed, a gaze redirects, or the light shifts.',
    'BEAT 3 — Land: resolve into a composition distinctly different from the opening frame. No loop back to frame one.',
  ]
  return [
    'BEAT 1 — Establish: geography and subject relationship, wide enough to read the space.',
    'BEAT 2 — Engage: move in on the subject as intention becomes visible; commit to one point of view.',
    'BEAT 3 — Turn: the decisive action or reveal, carried at full readability, cause visible before effect.',
    'BEAT 4 — Consequence: the world reacts and the change persists in the frame.',
    'BEAT 5 — Land: settle into a final composition that could not be mistaken for the opening frame.',
  ]
}

export function cameraDirection(inputs: DirectionInputs): string[] {
  const lines: string[] = []
  if (inputs.hasMotionAuthority) {
    lines.push('CAMERA: A motion reference governs camera geometry and speed curve. Do not invent a competing move; add only the framing adjustments needed to keep the subject readable.')
  } else if (inputs.format === 'motion') {
    lines.push('CAMERA: Choose one motivated move and commit to it — the camera moves because the subject, the reveal, or the tension requires it, never as decoration. Prefer a slow dolly, a settled handheld drift, or a locked frame over restless reframing. Start and end on stable, composed frames.')
    lines.push('LENS: Read the intent and pick a coherent focal length — 24–35mm to hold subject inside environment, 40–50mm for neutral human perspective, 85mm+ to isolate and compress. Keep one focal language for the whole clip unless a cut motivates the change.')
  } else {
    lines.push('LENS AND CAMERA: Choose a focal length and viewpoint that serve the subject — 24–35mm to place the subject inside its environment, 50mm for honest human perspective, 85–135mm to isolate and compress. Set a deliberate camera height and distance rather than a default eye-level centre.')
  }
  lines.push('COMPOSITION: Build depth in explicit foreground, midground, and background layers. Give the subject motivated screen direction and negative space to move into. Keep horizons, eyelines, and verticals intentional.')
  if (inputs.hasStartFrame && inputs.hasEndFrame) lines.push('FRAME ANCHORS: A start and end frame are locked. Design the intervening movement as the shortest physically coherent path between them — no detours, no morphing, no resets.')
  else if (inputs.hasStartFrame) lines.push('FRAME ANCHORS: The opening frame is locked. Every subsequent choice must be reachable from it by continuous physical motion.')
  else if (inputs.hasEndFrame) lines.push('FRAME ANCHORS: The closing frame is locked. Build a motivated approach into it rather than cutting to it.')
  return lines
}

export function lightingDirection(inputs: DirectionInputs): string[] {
  if (inputs.hasStyleAuthority) return [
    'LIGHT AND GRADE: A Style asset is the visual-language authority. Match its palette, contrast ratio, texture, and finish exactly; add only the practical light needed to keep the subject legible.',
  ]
  const lines = [
    'LIGHT: Give the scene one dominant motivated source with a visible direction, plus falloff that separates the subject from the background. Keep highlights controlled and let shadows retain detail and colour.',
    'GRADE AND TEXTURE: Commit to a coherent palette with a clear temperature relationship between key and shadow. Physically plausible optics only — natural highlight roll-off, real depth of field, honest grain. No plastic sheen, no HDR halo, no uniform flat fill.',
  ]
  if (inputs.hasLocation) lines.push('The connected Location dictates the lighting logic — respect its existing sources, time of day, and atmosphere rather than relighting the space.')
  return lines
}

export function performanceDirection(inputs: DirectionInputs): string[] {
  const lines: string[] = []
  if (inputs.hasCharacter) lines.push('PERFORMANCE: Direct the connected character with specific, restrained physical behaviour — weight, breath, micro-hesitation, where the eyes go and when. Emotion reads through behaviour and framing, never through exaggerated mugging or symmetrical posing.')
  if (inputs.hasElement) lines.push('OBJECT ACTION: Handle the connected element with real physical logic — mass, grip, contact, resistance, and a persistent state after it is used.')
  if (inputs.hasAudioAuthority) lines.push('SYNC: Audio governs rhythm and timing. Stage the action so its accents fall on the connected audio events; never derive appearance from sound.')
  if (inputs.format === 'motion') lines.push('MOTION QUALITY: Movement carries weight, inertia, and follow-through. No floating, no rubbery limbs, no speed ramps that were not asked for, no simultaneous slow-motion and real-time elements in one frame.')
  return lines
}

/**
 * Composes the direction block. Returns an empty string when there is nothing
 * useful to add, so callers can join unconditionally.
 */
export function cinematicDirection(request: GenerationRequest): string {
  if (request.directionLayer === false) return ''
  if (!['video-generator', 'image-generator'].includes(request.kind)) return ''
  if (request.kind === 'video-generator') {
    const sections = productionShotSpecSections(request).filter((section) => !['scene-context', 'active-references', 'reference-map', 'positive-locks'].includes(section.id))
    const kept = [] as typeof sections
    for (const section of sections) {
      const candidate = renderShotSpecSections([...kept, section])
      if (candidate.length <= 600) kept.push(section)
    }
    return renderShotSpecSections(kept)
  }
  const inputs = directionInputsFor(request)
  const sections: string[] = []
  if (inputs.hasAuthoredShotPlan) {
    sections.push('STORY: An authored shot plan governs the sequence; preserve cause, state, and screen direction across cuts without re-planning it.')
  } else if (inputs.format === 'motion') {
    sections.push('STORY: Shape one readable change of state with a distinct opening, turn, and final composition; never loop back to frame one.')
  }
  if (inputs.hasMotionAuthority) sections.push('CAMERA: The motion reference controls geometry and speed. Do not invent a competing move; adjust framing only for readability.')
  else if (inputs.format === 'motion') sections.push('CAMERA: Choose one motivated move and commit to it; start and end on stable, composed frames.')
  else sections.push('LENS AND CAMERA: Choose a deliberate focal length, height, and distance that serve the subject and preserve authored composition.')
  if (inputs.hasStartFrame && inputs.hasEndFrame) sections.push('FRAME ANCHORS: Follow the shortest physically coherent path between them; no morphing, detours, or resets.')
  else if (inputs.hasStartFrame) sections.push('FRAME ANCHOR: The opening is locked; every later state must follow by continuous physical motion.')
  else if (inputs.hasEndFrame) sections.push('FRAME ANCHOR: Build a motivated approach into it; never cut or morph abruptly to the locked close.')
  if (inputs.hasStyleAuthority) sections.push('LIGHT AND GRADE: A Style asset is the visual-language authority; preserve its palette, contrast, texture, and finish.')
  else sections.push('GRADE AND TEXTURE: Use one motivated light direction, controlled highlights, readable shadows, natural optics, and a coherent palette.')
  if (inputs.hasCharacter) sections.push('PERFORMANCE: Use restrained weight, breath, gaze, and micro-hesitation; preserve identity and anatomy.')
  if (inputs.hasElement) sections.push('OBJECT ACTION: Preserve mass, contact, resistance, design, and the object’s changed state.')
  if (inputs.hasAudioAuthority) sections.push('SYNC: Let audio govern rhythm and timing, never visual appearance.')
  const header = 'DIRECTION LAYER — apply only where the written prompt and the connected authorities above are silent; never override them:'
  let result = header
  for (const section of sections) {
    if (`${result}\n${section}`.length > 600) continue
    result += `\n${section}`
  }
  return result
}
