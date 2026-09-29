import type { GenerationRequest } from './types'
import { groupStoryboardSequence } from './storyboardSequence'
import { directorProvenance, type SeedanceDirectorKnowledgeId } from './seedanceDirectorContract'
import { buildContinuityLedger, futureOnlyTypedContinuityValues } from './shotSpec'

export interface SeedanceDirectorValidationResult {
  readonly ok: boolean
  readonly knowledgeIds: readonly SeedanceDirectorKnowledgeId[]
  readonly errors?: readonly string[]
}

const VALIDATION_IDS = [
  'SD-PS-002', 'SD-PS-004', 'SD-PS-005', 'SD-PS-007', 'SD-PS-008', 'SD-PS-010', 'SD-PS-011',
  'SD-AB-001', 'SD-AB-002', 'SD-AB-010', 'SD-AB-011', 'SD-AB-017', 'SD-AB-018', 'SD-AB-021',
] as const satisfies readonly SeedanceDirectorKnowledgeId[]

function count(value: string, pattern: RegExp): number {
  return [...value.matchAll(new RegExp(pattern.source, pattern.flags))].length
}

function typedShotBlocks(body: string): Map<number, string> {
  const matches = [...body.matchAll(/^SHOT\s+(\d+)\b/gm)]
  return new Map(matches.map((match, index) => [Number(match[1]), body.slice(match.index!, matches[index + 1]?.index ?? body.length)]))
}

function stateFields(block: string, tag: string): Set<string> | undefined {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const line = block.match(new RegExp(`^CHARACTER STATE · ${escaped}(?: \\| (.*))?$`, 'm'))
  if (!line) return undefined
  return new Set((line[1] || '').split(' | ').flatMap((field) => field.includes('=') ? [field.slice(0, field.indexOf('='))] : []))
}

function authoredStateFields(state: ReturnType<typeof buildContinuityLedger>['shots'][number]['characterStates'][number]): string[] {
  const values: Array<[string, unknown]> = [
    ['wardrobe', state.wardrobeTag], ['world', state.worldPosition], ['feet', state.footState], ['orientation', state.bodyOrientation],
    ['gaze', state.gazeTarget], ['performance', state.performanceState], ['action', state.currentAction], ['phase', state.actionPhase],
    ['props', state.propOwnership], ['contacts', state.contacts], ['hand', state.handState], ['grip', state.gripContact],
    ['prop-orientation', state.propOrientation], ['workstation', state.workstation], ['visibility', state.visibility],
  ]
  return values.flatMap(([key, value]) => value === undefined || value === '' || (Array.isArray(value) && !value.length) ? [] : [key])
}

export function validateSeedanceDirectorPrompt(body: string, request: GenerationRequest): SeedanceDirectorValidationResult {
  directorProvenance('local-validation', VALIDATION_IDS)
  const errors: string[] = []
  const shots = request.storyboardShots || []
  if (shots.length) {
    const sequence = groupStoryboardSequence(shots)
    const cuts = count(body, /\bHARD CUT\./g)
    if (cuts !== sequence.hardCutCount) errors.push(`Expected ${sequence.hardCutCount} HARD CUT markers; found ${cuts}.`)
    if (/HARD CUT\.\s*$/.test(body)) errors.push('A final HARD CUT is forbidden.')
    const duration = shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0)
    if (Math.abs(duration - sequence.totalDuration) > 1e-6) errors.push('Storyboard duration sum does not match the compiled sequence.')
    if (shots.length > 1 && sequence.hardCutCount === 0) {
      if (/^SHOT\s+\d+/m.test(body)) errors.push('Continuous mode must not create SHOT boundaries.')
      if (cuts) errors.push('Continuous mode must not contain HARD CUT markers.')
    }
    if (shots.some((shot) => shot.continuityGroupId || shot.activeCharacterTags?.length || shot.characterStates?.length || shot.characterStateDeltas?.length)) {
      const ledger = buildContinuityLedger(request)
      const blocks = typedShotBlocks(body)
      for (const shot of ledger.shots) {
        const block = blocks.get(shot.index) || ''
        const renderedGroup = block.match(/^CONTINUITY GROUP · (.+)$/m)?.[1]
        if (renderedGroup && shot.groupId && renderedGroup !== shot.groupId) errors.push(`Shot ${shot.index} continuity group must remain ${shot.groupId}; found ${renderedGroup}.`)
        for (const state of shot.characterStates) {
          const fields = stateFields(block, state.characterTag)
          if (!fields) {
            errors.push(`Shot ${shot.index} is missing active Character state for ${state.characterTag}.`)
            continue
          }
          const dropped = authoredStateFields(state).filter((field) => !fields.has(field))
          if (dropped.length) errors.push(`Shot ${shot.index} dropped inherited state for ${state.characterTag}: ${dropped.join(', ')}.`)
        }
        for (const value of futureOnlyTypedContinuityValues(request, shot.index - 1)) {
          if (block.includes(value) && !shots[shot.index - 1].prompt.includes(value)) errors.push(`Shot ${shot.index} contains future-only typed state before its owning shot: ${value}.`)
        }
      }
    }
  }
  const negativeIndex = body.lastIndexOf('NEGATIVE PROMPT')
  if (negativeIndex < 0) errors.push('NEGATIVE PROMPT is required.')
  else {
    const afterNegative = body.slice(negativeIndex + 'NEGATIVE PROMPT'.length)
    if (/^\s*(?:ASSISTANT TASK|EDIT CONTROL|REFERENCE AUTHORITY|FORMAT MODE|TIMELINE AND CONTINUOUS ACTION|CAMERA|LENS AND OPTICS|LIGHTING|LOOK AND CAPTURE CHARACTER|IDENTITY AND ANATOMY CONTINUITY|FINAL-FRAME AND OUTPUT HARD GATE)\s*$/m.test(afterNegative)) errors.push('NEGATIVE PROMPT must be the final section.')
  }
  for (const dialogue of body.matchAll(/^DIALOGUE \/ AUDIO ·/gm)) {
    const remainder = body.slice(dialogue.index)
    const audioEndpoint = remainder.indexOf('\nAUDIO ENDPOINT ·')
    const heldEndpoint = remainder.indexOf('\nENDPOINT / REACTION ·')
    if (heldEndpoint >= 0 && (audioEndpoint < 0 || audioEndpoint > heldEndpoint)) errors.push('Authored dialogue/audio must finish before the held endpoint.')
  }
  if (/@(?:Image|Video|Audio)\d+|\[(?:Image|Video|Audio)\d+\]/.test(body)) errors.push('Provider transport tokens are forbidden in the semantic master.')
  return errors.length ? { ok: false, knowledgeIds: VALIDATION_IDS, errors } : { ok: true, knowledgeIds: VALIDATION_IDS }
}
