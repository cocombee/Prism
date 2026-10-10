import { seedanceFinalSectionErrors } from './seedanceFinalSection'
import { ownsExactSeedanceMaster } from './seedanceAuthoredMaster'
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

function typedBeatBlocks(body: string, sequence: ReturnType<typeof groupStoryboardSequence>): Map<number, { text: string; label: string }> {
  // Camera summaries use `SHOT N:` too; only timeline headings delimit state.
  const matches = [...body.matchAll(/^(?:SHOT\s+(\d+)(?:\s*\/\s*BEAT\s+(\d+))?|BEAT\s+(\d+))(?=\s*(?:[·—-]|$))/gm)]
  const blocks = new Map(matches.map((match, index) => [
    match[3] ? `beat-${match[3]}` : `shot-${match[1]}${match[2] ? `-beat-${match[2]}` : ''}`,
    body.slice(match.index!, matches[index + 1]?.index ?? body.length),
  ]))
  const continuous = sequence.hardCutCount === 0 && (sequence.shots[0]?.beats.length || 0) > 1
  const result = new Map<number, { text: string; label: string }>()
  let panelIndex = 0
  sequence.shots.forEach((group, shotIndex) => group.beats.forEach((_, beatIndex) => {
    const key = continuous ? `beat-${beatIndex + 1}`
      : `shot-${shotIndex + 1}${group.beats.length > 1 ? `-beat-${beatIndex + 1}` : ''}`
    const label = continuous ? `Beat ${beatIndex + 1}`
      : `Shot ${shotIndex + 1}${group.beats.length > 1 ? ` / beat ${beatIndex + 1}` : ''}`
    result.set(++panelIndex, { text: blocks.get(key) || '', label })
  }))
  return result
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
  const shots = ownsExactSeedanceMaster(request) ? [] : request.storyboardShots || []
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
    if (shots.some((shot) => shot.continuityGroupId || shot.activeCharacterTags !== undefined || shot.characterStates?.length || shot.characterStateDeltas?.length)) {
      let ledger: ReturnType<typeof buildContinuityLedger>
      try { ledger = buildContinuityLedger(request) }
      catch (error) { return { ok: false, knowledgeIds: VALIDATION_IDS, errors: [...errors, error instanceof Error ? error.message : 'Review physical cast ownership.'] } }
      const blocks = typedBeatBlocks(body, sequence)
      for (const shot of ledger.shots) {
        const entry = blocks.get(shot.index)
        const block = entry?.text || ''
        const label = entry?.label || `Shot ${shot.index}`
        const renderedGroup = block.match(/^CONTINUITY GROUP · (.+)$/m)?.[1]
        if (renderedGroup && shot.groupId && renderedGroup !== shot.groupId) errors.push(`${label} continuity group must remain ${shot.groupId}; found ${renderedGroup}.`)
        for (const state of shot.characterStates) {
          const fields = stateFields(block, state.characterTag)
          if (!fields) {
            errors.push(`${label} is missing active Character state for ${state.characterTag}.`)
            continue
          }
          const dropped = authoredStateFields(state).filter((field) => !fields.has(field))
          if (dropped.length) errors.push(`${label} dropped inherited state for ${state.characterTag}: ${dropped.join(', ')}.`)
        }
        for (const value of futureOnlyTypedContinuityValues(request, shot.index - 1)) {
          if (block.includes(value) && !shots[shot.index - 1].prompt.includes(value)) errors.push(`${label} contains future-only typed state before its owning shot: ${value}.`)
        }
      }
    }
  }
  errors.push(...seedanceFinalSectionErrors(body))
  for (const dialogue of body.matchAll(/^DIALOGUE \/ AUDIO ·/gm)) {
    const remainder = body.slice(dialogue.index)
    const audioEndpoint = remainder.indexOf('\nAUDIO ENDPOINT ·')
    const heldEndpoint = remainder.indexOf('\nENDPOINT / REACTION ·')
    if (heldEndpoint >= 0 && (audioEndpoint < 0 || audioEndpoint > heldEndpoint)) errors.push('Authored dialogue/audio must finish before the held endpoint.')
  }
  if (/@(?:Image|Video|Audio)\d+|\[(?:Image|Video|Audio)\d+\]/.test(body)) errors.push('Provider transport tokens are forbidden in the semantic master.')
  return errors.length ? { ok: false, knowledgeIds: VALIDATION_IDS, errors } : { ok: true, knowledgeIds: VALIDATION_IDS }
}
