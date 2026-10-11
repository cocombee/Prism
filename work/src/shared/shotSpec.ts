import { assertStoryboardPhysicalCast } from './storyboardPhysicalCast'
import { quantifiedCameraRecipe, timedCameraRecipe, shotFov, selectedLensInstruction } from './shotRecipes'
import { semanticAuthorityCompletion } from './semanticAuthorityCompletion'
import type { GenerationRequest, StoryboardBoundaryState, StoryboardCharacterState, StoryboardDialogueSpan, StoryboardStateAuthority } from './types'
import { groupStoryboardSequence, storyboardTransitionConflicts, STORYBOARD_OUTGOING_CONTINUATION } from './storyboardSequence'
import { storyboardDurationReadinessError } from './storyboardDurationBudget'
import { authoredPlaybackTiming, filmicMotionSemantics } from './filmicMotion'
import { storyboardTimecodes } from './storyboardTimecodes'
import { effectiveOutputFrameRate, resolveVideoModel } from './videoModels'
import { cameraSupportConflict, cameraSupportSemantics, mergeCameraSupportNegatives } from './cameraSupportSemantics'
import { authoredAppearanceDeltaLine, isReferenceExclusive, soleVisualAuthorityLine } from './referenceVisualAuthority'
import { appearanceLayerRoleLine, characterBodyAuthorityLine, emittedAppearanceLayers, isTypedAppearanceLayer } from './sameBodyAuthority'
import { propScaleInstruction, propScaleNegativeTerms } from './propScaleAuthority'
import {
  SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS,
  SEEDANCE_PROMPT_STRUCTURE_IDS,
  SEEDANCE_REFERENCE_EXCLUSIVE_IDS,
  directorProvenance,
  type SeedanceDirectorKnowledgeId,
} from './seedanceDirectorContract'

const LOCAL_SEEDANCE_COMPLETION_IDS = [
  ...SEEDANCE_PROMPT_STRUCTURE_IDS,
  ...SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS.filter((id) => id !== 'SD-AB-025'),
] as readonly SeedanceDirectorKnowledgeId[]

export interface ShotSpecSection {
  id: string
  heading: string
  text: string
  priority: number
  required?: boolean
  knowledgeIds?: readonly SeedanceDirectorKnowledgeId[]
}

export interface ContinuityLedger {
  mode: 'continuous' | 'separate'
  global: {
    identities: string[]
    wardrobe: string[]
    locations: string[]
    props: string[]
    axis: string[]
    lighting: string[]
  }
  shots: Array<{
    index: number
    panelId?: string
    groupId?: string
    activeCharacterTags: string[]
    physicalCastKnown: boolean
    excludedCharacterTags: string[]
    characterStates: StoryboardCharacterState[]
    stateAuthorities: StoryboardStateAuthority[]
    dialogueSpans: StoryboardDialogueSpan[]
    tags: string[]
    authored: string
  }>
  boundaries: Array<{
    index: number
    transition: 'continue' | 'hard-cut'
    incomingTags: string[]
    outgoingTags: string[]
    heldTags: string[]
    incomingState: string[]
    outgoingState: string[]
    heldState: string[]
  }>
}

/** Internal projection context; never serialized into a provider request. */
export interface ProductionContinuityContext {
  ledger: ContinuityLedger
  /** Full-ledger indices corresponding to the request's local storyboard beats. */
  shotIndices: number[]
}

type Reference = NonNullable<GenerationRequest['references']>[number]

function compact(value?: string): string {
  return (value || '').trim().replace(/\s+/g, ' ')
}

function boundaryValues(values?: string[]): string[] {
  return [...new Set((values || []).map((value) => compact(value)).filter(Boolean))]
}

function boundaryState(previous: StoryboardBoundaryState | undefined, next: StoryboardBoundaryState | undefined): {
  incoming: string[]
  outgoing: string[]
  held: string[]
} {
  const incoming = boundaryValues(next?.incoming)
  const outgoing = boundaryValues(previous?.outgoing)
  const nextHeld = new Set(boundaryValues(next?.held))
  const held = boundaryValues(previous?.held).filter((value) => nextHeld.has(value))
  return { incoming, outgoing, held }
}

function boundaryLine(index: number, transition: string, state: ReturnType<typeof boundaryState>): string {
  if (!state.incoming.length && !state.outgoing.length && !state.held.length) return ''
  return `BOUNDARY ${index}→${index + 1} · ${transition.toUpperCase()} · outgoing state: ${state.outgoing.join('; ') || 'unspecified'}; incoming state: ${state.incoming.join('; ') || 'unspecified'}; held: ${state.held.join('; ') || 'unspecified'}.`
}

function authoredDescription(value?: string): string {
  return compact(value)
    .replace(/\b(?:HARD|AUTO|GUIDE|LOCK)\s+RULE\s*(?:[·:—-]\s*)?/gi, '')
    .replace(/[.]+$/g, '')
    .trim()
}

function referenceTag(reference: Reference, index: number): string {
  return reference.tag || `@reference-${index + 1}`
}

function referenceScope(reference: Reference, characterOwnsWardrobe = true, nativeVideoGuidance = false): string {
  if (reference.role === 'style') return 'Controls visual language, palette, texture and finish only; depicted subjects not inherited.'
  if (reference.role === 'location') return 'Controls environment, layout, perspective and lighting logic only; reference framing not inherited.'
  if (reference.role === 'character') return characterOwnsWardrobe
    ? 'Identity, face, anatomy, body proportions, reference wardrobe and accessories locked. Studio sheet background and layout NOT inherited.'
    : 'Identity, face, anatomy and body proportions locked; the bound Wardrobe owns garment and accessory design. Studio sheet background and layout NOT inherited.'
  if (reference.role === 'wardrobe') return 'Controls garment identity, silhouette, construction, materials, colors, patterns, fit, accessories and worn state only; depicted person identity not inherited.'
  if (reference.role === 'element') return 'Controls object design, materials, proportions and markings only.'
  if (reference.authority === 'audio-timing' || reference.mediaType === 'audio') return 'Sound, speech, rhythm and timing authority only; never visual content.'
  if (reference.authority === 'motion-camera' || reference.mediaType === 'video') return nativeVideoGuidance ? 'Motion, performance and camera guidance follow the authored instruction; appearance and audio are not inherited.' : 'Camera geometry, path and speed curve only; appearance not inherited.'
  if (reference.role === 'storyboard' || reference.authority === 'storyboard-map') return 'Controls shot order, editorial map, composition and continuity only; sheet layout not rendered.'
  return 'Controls only its assigned visual reference domain; unrelated content not inherited.'
}

function ruleRole(label: string): Reference['role'] | undefined {
  if (/wardrobe/i.test(label)) return 'wardrobe'
  if (/character/i.test(label)) return 'character'
  if (/location/i.test(label)) return 'location'
  if (/element/i.test(label)) return 'element'
  if (/style/i.test(label)) return 'style'
  if (/storyboard/i.test(label)) return 'storyboard'
  return undefined
}

function activeReferenceLines(request: GenerationRequest): string[] {
  const references = request.references || []
  const boundCharacters = new Set(references.filter((reference) => reference.role === 'wardrobe' && reference.boundCharacterTag).map((reference) => reference.boundCharacterTag!))
  const lines: string[] = []
  const knownTags = new Set<string>()
  const knownReferenceRoles = new Set<string>()
  references.forEach((reference, index) => {
    const tag = referenceTag(reference, index)
    if (isTypedAppearanceLayer(reference) || reference.role === 'character' && reference.characterAuthorityMode && request.storyboardShots?.length) {
      knownTags.add(tag)
      return
    }
    const authorityRole = reference.authority || reference.mediaType || reference.role
    const referenceRoleKey = `${tag}:${authorityRole}`
    if (knownReferenceRoles.has(referenceRoleKey)) return
    knownReferenceRoles.add(referenceRoleKey)
    knownTags.add(tag)
    if (isReferenceExclusive(reference)) {
      const authority = characterBodyAuthorityLine({ ...reference, tag }) || soleVisualAuthorityLine({ ...reference, tag })
      if (authority) lines.push(authority)
      return
    }
    if (request.inputTag === tag && request.inputRole === 'source-video') {
      lines.push(`${tag} — Video To Extend${request.inputName ? `: ${request.inputName}` : ''}. 100% matches the reference; Exact source-video state and temporal continuity; continue rather than regenerate its beginning.`)
      return
    }
    const sourceText = reference.authority === 'motion-camera' || reference.mediaType === 'video'
      ? 'motion reference'
      : reference.authority === 'audio-timing' || reference.mediaType === 'audio'
        ? 'audio reference'
        : reference.role === 'style' ? 'Style authority' : reference.description
    const description = authoredDescription(sourceText) || authoredDescription(reference.view || reference.role)
    lines.push(`${tag} — ${description}. 100% matches the reference; ${referenceScope(reference, reference.role === 'character' ? !boundCharacters.has(tag) : true, Boolean(request.higgsfieldNative))}`)
  })
  if (request.inputTag && !knownTags.has(request.inputTag)) {
    const label = request.inputRole === 'start-frame' ? 'Starting Frame' : request.inputRole === 'source-video' ? 'Video To Extend' : 'Source Image'
    const scope = request.inputRole === 'source-video'
      ? 'Exact source-video state and temporal continuity; continue rather than regenerate its beginning.'
      : request.inputRole === 'start-frame'
        ? 'Exact opening composition and visual state; motion develops only after this frame.'
        : 'Exact base-image content; change only what the authored instruction requests.'
    lines.push(`${request.inputTag} — ${label}${request.inputName ? `: ${request.inputName}` : ''}. 100% matches the reference; ${scope}`)
    knownTags.add(request.inputTag)
  }
  for (const rule of request.connectionRules || []) {
    const role = ruleRole(rule.label)
    if (!role || knownTags.has(rule.tag)) continue
    const pseudo: Reference = { role, tag: rule.tag, slot: 'reference' }
    const roleName = role.charAt(0).toUpperCase() + role.slice(1)
    lines.push(`${rule.tag} — ${roleName} reference. 100% matches the reference; ${referenceScope(pseudo)}`)
    knownTags.add(rule.tag)
  }
  return lines
}

function referenceMap(request: GenerationRequest, providerLegend?: string): string {
  if (providerLegend?.trim()) return providerLegend.trim()
  const lines: string[] = []
  const seen = new Set<string>()
  for (const [index, reference] of (request.references || []).entries()) {
    const tag = referenceTag(reference, index)
    if (seen.has(tag)) continue
    lines.push(`${tag} = ${reference.role} authority`)
    seen.add(tag)
  }
  if (request.inputTag && !seen.has(request.inputTag)) {
    lines.push(`${request.inputTag} = ${request.inputRole || 'source-image'} authority`)
    seen.add(request.inputTag)
  }
  for (const rule of request.connectionRules || []) {
    if (!ruleRole(rule.label) || seen.has(rule.tag)) continue
    lines.push(`${rule.tag} = ${authoredDescription(rule.label)} authority`)
    seen.add(rule.tag)
  }
  return lines.join('\n')
}

function shotsFor(request: GenerationRequest): NonNullable<GenerationRequest['storyboardShots']> {
  const shots = request.storyboardShots?.length
    ? request.storyboardShots
    : (request.multiPrompt || []).map((shot) => {
      const parsedDuration = Number(shot.duration)
      return {
        prompt: shot.prompt,
        duration: Number.isFinite(parsedDuration) ? parsedDuration : 1,
        shotSize: 'auto',
        camera: 'auto',
      }
    })
  const durationError = storyboardDurationReadinessError(shots)
  if (durationError) throw new Error(durationError)
  return shots
}

function continuityMode(request: GenerationRequest, shots: NonNullable<GenerationRequest['storyboardShots']>): ContinuityLedger['mode'] {
  return shots.length > 1 && groupStoryboardSequence(shots).hardCutCount === 0 ? 'continuous' : 'separate'
}

export function stateAuthorityReadinessErrors(request: GenerationRequest): string[] {
  return (request.storyboardShots || []).flatMap((shot) => (shot.stateAuthorities || []).flatMap((authority) => {
    const requiredState = authority.requiredState?.trim()
    if (!requiredState || !authority.availableStates) return []
    const knownStates = [...new Map(authority.availableStates.map((state) => [state.trim().toLocaleLowerCase(), state.trim()])).values()].filter(Boolean)
    if (knownStates.length <= 1) return []
    return [`State authority ${authority.authorityTag} must use a single-state reference for exact required state "${requiredState}"; known available states are: ${knownStates.join(', ')}.`]
  }))
}

/** A local exclusion never withdraws an identity used by another shot or its audio. */
function globallyExcludedCharacters(shots: NonNullable<GenerationRequest['storyboardShots']>): Set<string> {
  if (!shots.length) return new Set()
  const excluded = new Set(boundaryValues(shots[0].excludedCharacterTags))
  for (const shot of shots.slice(1)) {
    const local = new Set(boundaryValues(shot.excludedCharacterTags))
    for (const tag of excluded) if (!local.has(tag)) excluded.delete(tag)
  }
  for (const shot of shots) for (const span of shot.dialogueSpans || []) {
    excluded.delete(span.speakerTag)
    if (span.targetTag) excluded.delete(span.targetTag)
  }
  return excluded
}

export function buildContinuityLedger(request: GenerationRequest): ContinuityLedger {
  const shots = shotsFor(request)
  const completion = semanticAuthorityCompletion(request)
  const excludedAcrossSequence = globallyExcludedCharacters(shots)
  const records = completion.records.filter((record) => !excludedAcrossSequence.has(record.tag))
  const tagsForShot = (shot: NonNullable<GenerationRequest['storyboardShots']>[number], index: number) => [...new Set(pointOfUseReferences(request, shot.prompt, shot.panelId, { physicalCastKnown: physicalCast[index].known, activeCharacterTags: physicalCast[index].tags }).flatMap((value) => value.match(/@[A-Za-z0-9][A-Za-z0-9-_]*/g) || []))]
  let priorGroup: string | undefined
  const physicalCast = assertStoryboardPhysicalCast(shots)
  let inherited = new Map<string, StoryboardCharacterState>()
  const shotEntries = shots.map((shot, index) => {
    const groupId = shot.continuityGroupId
    if (groupId !== priorGroup) inherited = new Map<string, StoryboardCharacterState>()
    const excluded = new Set(boundaryValues(shot.excludedCharacterTags))
    const active = physicalCast[index].tags
    for (const state of shot.characterStates || []) {
      if (!active.includes(state.characterTag) || excluded.has(state.characterTag)) continue
      inherited.set(state.characterTag, { ...(inherited.get(state.characterTag) || { characterTag: state.characterTag }), ...state })
    }
    for (const delta of shot.characterStateDeltas || []) {
      if (!active.includes(delta.characterTag) || excluded.has(delta.characterTag)) continue
      inherited.set(delta.characterTag, { ...(inherited.get(delta.characterTag) || { characterTag: delta.characterTag }), ...delta })
    }
    const characterStates = active.flatMap((tag) => inherited.has(tag) ? [{ ...inherited.get(tag)! }] : [])
    priorGroup = groupId
    return {
      index: index + 1, panelId: shot.panelId, groupId, activeCharacterTags: active, physicalCastKnown: physicalCast[index].known, excludedCharacterTags: [...excluded], characterStates,
      stateAuthorities: [...(shot.stateAuthorities || [])], dialogueSpans: [...(shot.dialogueSpans || [])],
      tags: tagsForShot(shot, index).filter((tag) => !excluded.has(tag)), authored: shot.prompt.trim(),
    }
  })
  const authoredSequence = [request.authoredPrompt || '', ...shots.map((shot) => shot.prompt)].join('\n')
  const authoredLines = authoredSequence.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const global = {
    identities: records.filter((record) => record.role === 'character').map((record) => record.tag),
    wardrobe: records.filter((record) => record.role === 'wardrobe').map((record) => record.tag),
    locations: records.filter((record) => record.role === 'location').map((record) => record.tag),
    props: records.filter((record) => record.role === 'element').map((record) => record.tag),
    axis: [...new Set(authoredLines.filter((line) => /screen[- ](?:left|right)|eyeline|axis|world[- ]space/i.test(line)))],
    lighting: [...new Set(authoredLines.filter((line) => /lighting|light|day|night|dawn|dusk|time of day/i.test(line)))],
  }
  const boundaries = shots.slice(0, -1).map((shot, index) => {
    const outgoingTags = shotEntries[index].tags
    const incomingTags = shotEntries[index + 1].tags
    const state = boundaryState(shot.boundaryState, shots[index + 1].boundaryState)
    return {
      index: index + 1,
      transition: shot.transitionToNext || 'hard-cut',
      incomingTags,
      outgoingTags,
      heldTags: incomingTags.filter((tag) => outgoingTags.includes(tag)),
      incomingState: state.incoming,
      outgoingState: state.outgoing,
      heldState: state.held,
    }
  })
  return { mode: continuityMode(request, shots), global, shots: shotEntries, boundaries }
}

function inspectableStateValues(value: unknown, key = ''): string[] {
  if (typeof value === 'string') return key === 'characterTag' || !value.trim() ? [] : [value.trim()]
  if (Array.isArray(value)) return value.flatMap((entry) => inspectableStateValues(entry, key))
  if (!value || typeof value !== 'object') return []
  return Object.entries(value as Record<string, unknown>).flatMap(([entryKey, entry]) => inspectableStateValues(entry, entryKey))
}

/** Values first owned by a later shot. They stay inspectable but cannot be projected into this shot's provider prose. */
export function futureOnlyTypedContinuityValues(request: GenerationRequest, shotIndex: number): string[] {
  const ledger = buildContinuityLedger(request)
  const current = ledger.shots[shotIndex]
  if (!current) return []
  const shots = request.storyboardShots || []
  const currentValues = new Set([
    ...current.characterStates.flatMap((state) => inspectableStateValues(state)),
    ...current.stateAuthorities.flatMap((state) => inspectableStateValues(state)),
    ...(shots[shotIndex]?.camera && shots[shotIndex].camera !== 'auto' ? [shots[shotIndex].camera!] : []),
  ])
  return [...new Set(ledger.shots.slice(shotIndex + 1).flatMap((shot, offset) => [
    ...shot.characterStates.flatMap((state) => inspectableStateValues(state)),
    ...shot.stateAuthorities.flatMap((state) => inspectableStateValues(state)),
    ...(shots[shotIndex + offset + 1]?.camera && shots[shotIndex + offset + 1].camera !== 'auto' ? [shots[shotIndex + offset + 1].camera!] : []),
  ]).filter((value) => !currentValues.has(value)))]
}

function characterStateLine(state: StoryboardCharacterState): string {
  const fields: Array<[string, string | string[] | undefined]> = [
    ['wardrobe', state.wardrobeTag], ['world', state.worldPosition], ['feet', state.footState], ['orientation', state.bodyOrientation],
    ['gaze', state.gazeTarget], ['performance', state.performanceState], ['action', state.currentAction], ['phase', state.actionPhase],
    ['props', state.propOwnership], ['contacts', state.contacts], ['hand', state.handState], ['grip', state.gripContact],
    ['prop-orientation', state.propOrientation], ['workstation', state.workstation], ['visibility', state.visibility],
  ]
  const authored = fields.flatMap(([label, value]) => value === undefined || value === '' || (Array.isArray(value) && !value.length)
    ? [] : [`${label}=${Array.isArray(value) ? value.join(', ') : value}`])
  return `CHARACTER STATE · ${state.characterTag}${authored.length ? ` | ${authored.join(' | ')}` : ''}`
}

function typedShotLines(ledger: ContinuityLedger, shotIndex: number): string[] {
  const shot = ledger.shots[shotIndex]
  if (!shot) return []
  const authority = shot.stateAuthorities.map((item) => `STATE AUTHORITY · ${item.scope} · ${item.authorityTag} | ${item.state}${item.trajectory ? ` | trajectory=${item.trajectory}` : ''}`)
  const byId = new Map<string, StoryboardDialogueSpan>()
  const dialogueSignature = (span: StoryboardDialogueSpan) => JSON.stringify([span.speakerTag, span.targetTag, span.text, span.startPanelId, span.endPanelId, span.delivery, span.lipSync, [...(span.insertAudioPanelIds || [])].sort()])
  for (const span of ledger.shots.flatMap((entry) => entry.dialogueSpans)) {
    const previous = byId.get(span.id)
    if (previous && dialogueSignature(previous) !== dialogueSignature(span)) throw new Error(`Dialogue span ${span.id} has conflicting authored definitions.`)
    byId.set(span.id, span)
  }
  const spans = [...byId.values()]
  const dialogue = spans.flatMap((span) => {
    const start = ledger.shots.findIndex((entry) => entry.panelId === span.startPanelId)
    const end = ledger.shots.findIndex((entry) => entry.panelId === span.endPanelId)
    if (start < 0 || end < start) throw new Error(`Dialogue span ${span.id} needs an ordered start and end in the authored sequence.`)
    const ordinal = (index: number) => 1 + ledger.boundaries.slice(0, index).filter((boundary) => boundary.transition === 'hard-cut').length
    const range = ledger.mode === 'continuous' ? `beats ${start + 1}–${end + 1}` : `shots ${ordinal(start)}–${ordinal(end)}`
    if (shotIndex === start) return [`DIALOGUE SPAN · ${span.id} · ${range} · speaker=${span.speakerTag}${span.targetTag ? ` | target=${span.targetTag}` : ''} | exact line: "${span.text}" | spoken once over one continuous timing/lip-sync state${span.delivery ? ` | delivery=${span.delivery}` : ''}${span.lipSync ? ` | lip-sync=${span.lipSync}` : ''}`]
    if (shotIndex > start && shotIndex <= end) return [`DIALOGUE CONTINUATION · ${span.id} · ${((span.insertAudioPanelIds || []).includes(shot.panelId || '')) ? 'audio continues while mouth may be outside crop' : 'same uninterrupted line continues'} | speaker=${span.speakerTag}${span.targetTag ? ` | target=${span.targetTag}` : ''} | do not restart or repeat the line`]
    return []
  })
  return [...(shot.physicalCastKnown && !shot.activeCharacterTags.length ? ['PHYSICAL CAST · none — no Character is assigned to this beat.'] : []), ...shot.characterStates.map(characterStateLine), ...authority, ...dialogue]
}

function storyboardAction(shot: NonNullable<GenerationRequest['storyboardShots']>[number], fallbackPanelNumber: number): string {
  return shot.prompt.trim() || `[STORYBOARD PANEL ${shot.panelNumber || fallbackPanelNumber} INCOMPLETE — no action authored.]`
}

export function positiveLocks(request: GenerationRequest): string {
  const references = request.references || []
  const characters = new Map<string, Reference>()
  references.filter((reference) => reference.role === 'character').forEach((reference, index) => {
    const tag = referenceTag(reference, index)
    const existing = characters.get(tag)
    if (!existing || (!existing.description && reference.description)) characters.set(tag, reference)
  })
  for (const rule of request.connectionRules || []) {
    if (!/character/i.test(rule.label) || characters.has(rule.tag)) continue
    characters.set(rule.tag, { role: 'character', tag: rule.tag, slot: 'reference' })
  }
  const lines: string[] = []
  // References identify assets; typed beat membership does not assert visible headcount.
  const typedCast = (request.storyboardShots || []).some(shot => shot.activeCharacterTags !== undefined || shot.characterStates?.length || shot.characterStateDeltas?.length)
  if (characters.size && !typedCast) lines.push(characters.size === 1 ? 'Only 1 person appears.' : `Only ${characters.size} people appear.`)
  for (const [tag, character] of characters) {
    const identity = isReferenceExclusive(character) ? '' : authoredDescription(character.description)
    if (identity) lines.push(`${tag} identity constants: ${identity}`)
    lines.push(`${tag} matches the reference in every appearance.`)
    lines.push(`${tag}: Studio sheet background and layout NOT inherited.`)
  }
  const fidelityTags = new Set<string>()
  references.filter((reference) => reference.role !== 'character').forEach((reference, index) => fidelityTags.add(referenceTag(reference, index)))
  for (const rule of request.connectionRules || []) if (ruleRole(rule.label) && !characters.has(rule.tag)) fidelityTags.add(rule.tag)
  for (const tag of fidelityTags) lines.push(`${tag} matches the reference in every appearance.`)
  if (shotsFor(request).length > 1) lines.push('Same lighting, same wardrobe across all cuts.')
  lines.push('Cuts only at the specified points.')
  if (request.shotLocks?.trim()) lines.push(request.shotLocks.trim())
  return lines.join('\n')
}

function tagsByRole(request: GenerationRequest, role: Reference['role']): string[] {
  const tags = (request.references || []).filter((reference) => reference.role === role).map(referenceTag)
  for (const rule of request.connectionRules || []) if (ruleRole(rule.label) === role) tags.push(rule.tag)
  return [...new Set(tags)]
}

function pointOfUseReferences(request: GenerationRequest, prompt: string, panelId?: string, cast?: Pick<ContinuityLedger['shots'][number], 'physicalCastKnown' | 'activeCharacterTags'>): string[] {
  panelId ||= (request.storyboardShots || []).find((shot) => shot.prompt === prompt)?.panelId
  const permitsOwner = (tag?: string) => !cast?.physicalCastKnown || Boolean(tag && cast.activeCharacterTags.includes(tag))
  const records = semanticAuthorityCompletion(request).records
  const authoredTags = new Set(prompt.match(/@[A-Za-z0-9][A-Za-z0-9-_]*/g) || [])
  const wardrobeByCharacter = new Map(records.filter((record) => record.role === 'wardrobe' && record.boundCharacterTag).map((record) => [record.boundCharacterTag!, record.tag]))
  const characterByWardrobe = new Map([...wardrobeByCharacter].map(([character, wardrobe]) => [wardrobe, character]))
  const ordered: string[] = []
  const add = (value?: string) => { if (value && !ordered.includes(value)) ordered.push(value) }
  for (const record of records) {
    if (!authoredTags.has(record.tag)) continue
    if (record.role === 'character' && !permitsOwner(record.tag)) continue
    if (record.role === 'wardrobe' && characterByWardrobe.has(record.tag) && !permitsOwner(characterByWardrobe.get(record.tag))) continue
    if (record.role === 'character') {
      const character = record.reference
      const complete = character && characterBodyAuthorityLine(character)
      if (complete) {
        add(complete)
        continue
      }
      const wardrobe = wardrobeByCharacter.get(record.tag)
      add(wardrobe ? `${record.tag} wearing ${wardrobe}` : record.tag)
    } else if (record.role === 'wardrobe') {
      const character = characterByWardrobe.get(record.tag)
      add(character ? `${character} wearing ${record.tag}` : record.tag)
    } else if (record.role === 'location' || record.role === 'element' || record.role === 'style') {
      const scaleLines = record.role === 'element' ? propScaleInstruction(request, record.tag, panelId) : []
      if (scaleLines.length) for (const line of scaleLines) add(line)
      else add(record.tag)
    }
  }
  panelId ||= (request.storyboardShots || []).find((shot) => shot.prompt === prompt)?.panelId
  for (const layer of emittedAppearanceLayers(request, panelId)) {
    if (!permitsOwner(layer.boundCharacterTag)) continue
    const character = (request.references || []).find((reference) => reference.role === 'character' && reference.tag === layer.boundCharacterTag)
    const label = character?.name?.trim() || layer.boundCharacterTag?.replace(/^@/, '')
    if (character?.tag && layer.tag) {
      add(`Use ${character.tag} as ${label}.`)
      add(appearanceLayerRoleLine(layer))
      add(authoredAppearanceDeltaLine(layer))
    }
  }
  return ordered
}

type SeedanceAuthoredField = 'assistantTask' | 'editControl' | 'referenceAuthority' | 'variableRegistry' | 'subjectPerformance' | 'camera' | 'cameraAndLens' | 'lensOptics' | 'lighting' | 'lightingAndLook' | 'look' | 'timeline' | 'openingLock' | 'identityContinuity' | 'wardrobeContinuity' | 'sceneContinuity' | 'stateLedger' | 'cameraGate' | 'finalAcceptance' | 'hardAvoid'

export function seedanceAuthoredFields(value: string): Record<SeedanceAuthoredField | 'general', string> {
  const fields: Record<SeedanceAuthoredField | 'general', string> = {
    general: '', assistantTask: '', editControl: '', referenceAuthority: '', variableRegistry: '', subjectPerformance: '', camera: '', cameraAndLens: '', lensOptics: '', lighting: '', lightingAndLook: '', look: '', timeline: '', openingLock: '', identityContinuity: '', wardrobeContinuity: '', sceneContinuity: '', stateLedger: '', cameraGate: '', finalAcceptance: '', hardAvoid: '',
  }
  const headings: Record<string, SeedanceAuthoredField> = {
    'ASSISTANT TASK': 'assistantTask', 'EDIT CONTROL': 'editControl', 'REFERENCE AUTHORITY': 'referenceAuthority', 'EDITABLE VARIABLE REGISTRY': 'variableRegistry',
    'SUBJECT AND PERFORMANCE': 'subjectPerformance', 'CAMERA': 'camera', 'CAMERA AND LENS': 'cameraAndLens', 'LENS AND OPTICS': 'lensOptics', 'LIGHTING': 'lighting', 'LIGHTING AND LOOK': 'lightingAndLook', 'LOOK AND CAPTURE CHARACTER': 'look',
    'TIMELINE AND CONTINUOUS ACTION': 'timeline', 'OPENING-FRAME HARD LOCK': 'openingLock', 'IDENTITY AND ANATOMY CONTINUITY': 'identityContinuity',
    'WARDROBE, ACCESSORY, AND PROP CONTINUITY': 'wardrobeContinuity', 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY': 'sceneContinuity', 'STATE LEDGER': 'stateLedger',
    'CAMERA, FRAMING, AND OPTICAL HARD GATE': 'cameraGate', 'FINAL-FRAME AND OUTPUT HARD GATE': 'finalAcceptance', 'HARD AVOID': 'hardAvoid', 'NEGATIVE PROMPT': 'hardAvoid',
  }
  let current: SeedanceAuthoredField | 'general' = 'general'
  for (const rawLine of value.split(/(?<=\n)/)) {
    const trimmed = rawLine.trim()
    const colon = trimmed.indexOf(':')
    const heading = (colon >= 0 ? trimmed.slice(0, colon) : trimmed).trim().toUpperCase()
    const field = headings[heading]
    if (field) {
      current = field
      const remainder = colon >= 0 ? trimmed.slice(colon + 1).trim() : ''
      const newline = rawLine.match(/\r?\n$/)?.[0] || ''
      if (remainder) fields[current] += `${remainder}${newline}`
    } else fields[current] += rawLine
  }
  // Normalize the structural edges only; internal authored line breaks,
  // indentation, spacing, punctuation and multilingual text remain unchanged.
  for (const field of Object.keys(fields) as Array<keyof typeof fields>) fields[field] = fields[field].trim()
  return fields
}

/** Seedance receives the canonical production structure once, assembled only at provider time. */
export function seedanceShotSpecSections(request: GenerationRequest, providerLegend?: string): ShotSpecSection[] {
  directorProvenance('local-deterministic-completion', LOCAL_SEEDANCE_COMPLETION_IDS)
  const stateAuthorityErrors = stateAuthorityReadinessErrors(request)
  if (stateAuthorityErrors.length) throw new Error(stateAuthorityErrors[0])
  const excluded = globallyExcludedCharacters(request.storyboardShots || [])
  if (excluded.size) request = {
    ...request,
    references: (request.references || []).filter((reference) => !reference.tag || !excluded.has(reference.tag)),
    connectionRules: (request.connectionRules || []).filter((rule) => !excluded.has(rule.tag)),
  }
  const shots = shotsFor(request)
  const typedLedger = buildContinuityLedger(request)
  for (const shot of shots) {
    const supportConflict = cameraSupportConflict(shot.camera, shot.prompt)
    if (supportConflict) throw new Error(supportConflict)
  }
  const transitionConflicts = storyboardTransitionConflicts(shots)
  if (transitionConflicts.length) throw new Error(transitionConflicts[0])
  const sequence = groupStoryboardSequence(shots)
  const references = request.references || []
  const characters = tagsByRole(request, 'character')
  const completion = semanticAuthorityCompletion(request)
  const semanticTags = new Set(completion.records.map((record) => record.tag))
  const style = (request.stylePrompt || references.find((reference) => reference.role === 'style')?.description || '').trim()
  const authoredSource = request.authoredPrompt ?? (shots.length ? '' : request.prompt || '')
  const authored = compact(authoredSource)
  const authoredFields = seedanceAuthoredFields(authoredSource)
  const active = activeReferenceLines(request).filter((line) => !providerLegend || ![...semanticTags].some((tag) => line.startsWith(`${tag} —`)))
  const authority = [...new Set([
    providerLegend?.trim(),
    ...active,
    ...completion.authorityLines,
    authoredFields.referenceAuthority ? `Authored authority: ${authoredFields.referenceAuthority}` : '',
  ].filter((line): line is string => Boolean(line)))].join('\n') || (characters.length
    ? `Use ${characters.join(', ')} as stable Character identities. Visible presence and body or appearance authority follow each authored shot below; a reference is not an additional cast member.`
    : 'No external reference authority is connected.')
  const generalDirection = compact(authoredFields.general.replace(/@[A-Za-z0-9][\w.-]*/g, '').replace(/[,&;+]/g, ''))
  const authoredAction = authoredFields.timeline || (generalDirection ? authoredFields.general : '')
  const noAction = 'No action or Character performance is inferred from connected references. Performance follows only the authored Video prompt or Storyboard; otherwise it remains unspecified.'
  const countWords = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE']
  const countLabel = (value: number) => countWords[value] || String(value)
  const timecodes = storyboardTimecodes(shots.flatMap(shot => [shot.duration, ...(shot.incomingBridge ? [shot.incomingBridge.reservedSeconds, shot.incomingBridge.reactionReserveSeconds] : [])]))
  const shotDurationTotal = timecodes.sum(...shots.map(shot => shot.duration))
  const continuousTake = shots.length > 1 && sequence.hardCutCount === 0
  const formatMode = shots.length > 1
    ? continuousTake
      ? `CONTINUOUS WAYPOINT TAKE, ONE UNBROKEN SHOT, ${shotDurationTotal}s TOTAL (${shots.map((shot, index) => `BEAT ${index + 1} ${Number(shot.duration || 0)}s`).join(', ')}).`
      : `${countLabel(sequence.shots.length)} SHOTS, ${countLabel(sequence.hardCutCount)} HARD CUT${sequence.hardCutCount === 1 ? '' : 'S'}, ${shotDurationTotal}s TOTAL (${sequence.shots.map((shot, index) => `SHOT ${index + 1} ${timecodes.sum(...shot.beats.map(beat => beat.duration))}s`).join(', ')}).`
    : ''
  let elapsedSeconds = 0
  const timedShots: string[] = []
  const labeledBeats: Array<{ label: string; shot: NonNullable<GenerationRequest['storyboardShots']>[number]; continued: boolean }> = []
  sequence.shots.forEach((shotGroup, shotIndex) => {
    const groupStart = elapsedSeconds
    const beatLines = shotGroup.beats.map((shot, beatIndex) => {
      const startSeconds = elapsedSeconds
      elapsedSeconds = timecodes.sum(elapsedSeconds, shot.duration)
      const label = continuousTake
        ? `BEAT ${beatIndex + 1}`
        : shotGroup.beats.length > 1 ? `SHOT ${shotIndex + 1} / BEAT ${beatIndex + 1}` : `SHOT ${shotIndex + 1}`
      labeledBeats.push({ label, shot, continued: beatIndex > 0 })
      const outgoingContinue = shotIndex === sequence.shots.length - 1 && beatIndex === shotGroup.beats.length - 1 && shot.transitionToNext === 'continue'
      const terminalHardCut = beatIndex === shotGroup.beats.length - 1 && shotGroup.closesWithHardCut
      const authoredPrompt = storyboardAction(shot, labeledBeats.length)
      const prompt = terminalHardCut ? authoredPrompt.replace(/\s*(?:—\s*)?HARD\s+CUT\.\s*$/i, '').trim() : authoredPrompt
      const referencesAtPointOfUse = pointOfUseReferences(request, prompt, shot.panelId, typedLedger.shots[labeledBeats.length - 1])
      const typedLines = typedShotLines(typedLedger, labeledBeats.length - 1)
      const bridge = shot.incomingBridge
      if (beatIndex > 0 && !bridge?.concurrent && bridge?.reservedSeconds && bridge.bridgeText) {
        const bridgeEnd = timecodes.sum(startSeconds, bridge.reservedSeconds)
        const reactionStart = timecodes.sum(elapsedSeconds, -bridge.reactionReserveSeconds)
        const bridgeReferences = !continuousTake && referencesAtPointOfUse.length ? `\nREFERENCES · ${referencesAtPointOfUse.join('; ')}` : ''
        return `${label} · ${timecodes.format(startSeconds)}–${timecodes.format(elapsedSeconds)}s\nPURPOSE / ACTION · CONTINUE IN THE SAME UNBROKEN TAKE.${bridgeReferences}${typedLines.length ? `\n${typedLines.join('\n')}` : ''}\nCAMERA BRIDGE · ${timecodes.format(startSeconds)}–${timecodes.format(bridgeEnd)}s: ${bridge.bridgeText}\nMAIN ACTION · ${timecodes.format(bridgeEnd)}–${timecodes.format(reactionStart)}s: ${prompt}${shot.audioCue ? `\nDIALOGUE / AUDIO · ${shot.audioCue}\nAUDIO ENDPOINT · Preserve authored dialogue/audio timing through this interval and any declared continuation; do not insert a pause, repeat or hold.` : ''}\nENDPOINT / REACTION · ${timecodes.format(reactionStart)}–${timecodes.format(elapsedSeconds)}s: ${outgoingContinue ? 'preserve the authored endpoint and performance state for the outgoing continuation hook.' : 'preserve the authored consequence and reaction in this reserved interval; settle or hold only where authored.'}`
      }
      const continuation = beatIndex > 0 ? 'CONTINUE IN THE SAME UNBROKEN TAKE. Carry the camera physically from the prior endpoint into this authored camera move; no edit, dissolve, reset, viewpoint teleport, continuity break, or hidden lens jump. ' : ''
      const referenceLine = !continuousTake && referencesAtPointOfUse.length ? `\nREFERENCES · ${referencesAtPointOfUse.join('; ')}` : ''
      const authoredDialogueAudio = Boolean(shot.audioCue?.trim()) || /\b(?:dialogue|audio|sound|room tone|ambience|speaker)\b|[“"][^”"\n]+[”"]/i.test(prompt)
      const dialogueAudioLine = authoredDialogueAudio
        ? `\nDIALOGUE / AUDIO · ${shot.audioCue?.trim() || 'Authored in PURPOSE / ACTION above; preserve it byte-exact.'}\nAUDIO ENDPOINT · Preserve authored dialogue/audio timing through this interval and any declared continuation; do not insert a pause, repeat or hold.`
        : ''
      const boundary = !continuousTake && shotIndex < sequence.shots.length - 1 && shotGroup.beats.length === beatIndex + 1
        ? boundaryLine(shotIndex + 1, shot.transitionToNext || 'hard-cut', boundaryState(shot.boundaryState, sequence.shots[shotIndex + 1].beats[0].boundaryState))
        : ''
      return `${label} · ${timecodes.format(startSeconds)}–${timecodes.format(elapsedSeconds)}s\nPURPOSE / ACTION · ${continuation}${prompt}${referenceLine}${typedLines.length ? `\n${typedLines.join('\n')}` : ''}${dialogueAudioLine}${bridge?.concurrent && bridge.bridgeText ? `\nCAMERA THROUGH SAME INTERVAL: ${bridge.bridgeText}` : ''}${boundary ? `\n${boundary}` : ''}\nENDPOINT / REACTION · ${outgoingContinue ? 'Preserve the authored endpoint and performance state for the outgoing continuation hook; no unauthored stop or next beat.' : 'Keep the authored consequence and reaction readable within this interval; follow authored motion through its boundary, and settle or hold only where authored.'}`
    })
    if (!continuousTake && shotGroup.beats.length > 1) timedShots.push(`SHOT ${shotIndex + 1} · ${timecodes.format(groupStart)}–${timecodes.format(elapsedSeconds)}s`)
    timedShots.push(...beatLines)
    if (shotGroup.closesWithHardCut) timedShots.push('HARD CUT.')
  })
  if (shots.at(-1)?.transitionToNext === 'continue') timedShots.push(STORYBOARD_OUTGOING_CONTINUATION)
  const continuousReferences = continuousTake ? [...new Set(shots.flatMap((shot, index) => pointOfUseReferences(request, shot.prompt, shot.panelId, typedLedger.shots[index])))].join('; ') : ''
  const timeline = shots.length
    ? [continuousReferences ? `REFERENCES · ${continuousReferences}` : '', authoredAction ? `Overall action: ${authoredAction}` : '', ...timedShots].filter(Boolean).join('\n')
    : [completion.pointOfUseLine, authoredAction || noAction].filter(Boolean).join('\n')
  const referenceCamera = [...new Map(references.filter(reference => reference.authority === 'motion-camera' && reference.mediaType === 'video')
    .map((reference,index) => [reference.path || reference.url || reference.tag || String(index), reference.tag || reference.name || `connected motion reference ${index + 1}`])).values()]
  const unspecifiedCamera = referenceCamera.length > 1
    ? 'Multiple motion/camera references are connected. Camera behavior follows the authored reference assignment for each shot; their paths are not combined or averaged. Unassigned reference camera behavior stays unspecified.'
    : referenceCamera.length
    ? `Where no camera behavior is authored, follow ${[...new Set(referenceCamera)].join(', ')} for camera geometry, path and speed curve. Preserve authored camera instructions; do not invent unobserved measurements.`
    : 'No camera movement, framing, or viewing axis is authored; leave camera behavior unspecified rather than infer it from connected authorities.'
  const camera = [shots.length ? labeledBeats.map(({ label, shot, continued }, index) => {
    const support = cameraSupportSemantics(shot.camera)
    const previous = index > 0 ? labeledBeats[index - 1].shot : undefined
    const previousSupport = cameraSupportSemantics(previous?.camera)
    const previousSpatialPath = previous && !previousSupport && !['', 'auto', 'static'].includes(previous.camera || '')
    const anchorRule = support && continued && previousSpatialPath
      ? ' Support rides only the explicit authored path while preserving authored pace and endpoint state; settle only where authored.'
      : support && continued
        ? ' Non-spatial Continue preserves the current authored anchor; it does not imply travel.'
        : support && index > 0
          ? " Cut resets the support anchor to the new shot's authored viewpoint, framing, angle, and camera side; no prior momentum, path, or recovery carries across."
          : continued
            ? ' Continue physically from the prior camera endpoint; no reset, teleport, dissolve, morph, or hidden lens jump.'
            : ''
    return `${label}: ${timedCameraRecipe(shot.camera, shot.duration, shot.prompt)}${anchorRule}`
  }).join('\n') : '', authoredFields.camera, authoredFields.cameraAndLens ? `Authored camera and lens: ${authoredFields.cameraAndLens}` : '', !shots.length && !authoredFields.camera && !authoredFields.cameraAndLens ? unspecifiedCamera : ''].filter(Boolean).join('\n')
  const model = resolveVideoModel(request.videoEngine)
  const outputFps = effectiveOutputFrameRate(model, request.frameRate)
  const selectedShutter = typeof request.shutterAngle === 'number' ? request.shutterAngle : 180
  const motion = !request.higgsfieldNative || request.frameRate !== undefined || request.shutterAngle !== undefined
    ? filmicMotionSemantics({ authoredText: authoredSource, captureFps: outputFps, selectedAngle: selectedShutter, motionFps: request.motionCadence, playback: authoredPlaybackTiming([authoredSource, ...shots.map(shot => shot.prompt)].join('\n')) ? { mode: 'authored', deliveryFps: outputFps } : { mode: 'normal' } }) : undefined
  const motionConflict = motion?.diagnostics.find((diagnostic) => diagnostic.severity === 'conflict')
  if (motionConflict) throw new Error(motionConflict.message)
  const motionSignature = motion?.positive || (request.higgsfieldNative && request.motionCadence !== undefined
    ? `Visual Motion FPS intent: ${request.motionCadence}fps, approximately ${request.motionCadence} distinct motion updates per second. Preserve provider-native encoded frame rate, normal playback speed and the authored duration. This is visual cadence intent, not a native output FPS setting.`
    : undefined)
  const cameraSupportNegative = labeledBeats.reduce(
    (negative, { shot }) => mergeCameraSupportNegatives(negative, shot.camera, shot.prompt),
    [request.negativePrompt, authoredFields.hardAvoid].filter(Boolean).join('\n'),
  )
  const optics = [shots.length ? labeledBeats.map(({ label, shot }) => `${label}: ${shotFov(shot.shotSize)}.`).join('\n') : '', shots.length ? labeledBeats.map(({ label, shot }) => { const lens = selectedLensInstruction(shot.lensMm); return lens ? `${label}: ${lens}` : '' }).filter(Boolean).join('\n') : '', authoredFields.lensOptics, 'Shot size describes subject framing independently of focal length and lens projection.', motionSignature ? `Motion signature: ${motionSignature}` : !shots.some(shot => shot.lensMm !== undefined) && !authoredFields.lensOptics ? 'No lens, focal length, shutter, or optical behavior is authored; leave optics unspecified rather than invent values.' : ''].filter(Boolean).join('\n')
  const start = references.find((reference) => reference.slot === 'start')
  const startTag = request.inputRole === 'start-frame' ? request.inputTag || '@start-frame' : start ? referenceTag(start, references.indexOf(start)) : ''
  const duration = request.editControlDuration ? `${request.editControlDuration}s` : request.duration ? `${request.duration}s` : shots.length ? `${shots.reduce((total, shot) => total + Number(shot.duration || 0), 0)}s` : 'provider-selected duration'
  const characterPerformance = authoredFields.subjectPerformance || noAction
  const identity = [completion.characterContinuityLines.join('\n'), authoredFields.identityContinuity].filter(Boolean).join('\n')
  const wardrobe = [completion.wardrobeContinuityLines.join('\n'), completion.elementContinuityLines.join('\n'), authoredFields.wardrobeContinuity].filter(Boolean).join('\n')
  const sceneContinuity = [completion.sceneContinuityLines.join('\n'), authoredFields.sceneContinuity, authoredFields.stateLedger ? `STATE LEDGER: ${authoredFields.stateLedger}` : '', request.shotLocks?.trim()].filter(Boolean).join('\n')
  const connectedVisualLighting = completion.records.some((record) => record.role === 'location')
  const lighting = authoredFields.lighting || (connectedVisualLighting
    ? 'Physical lighting follows only the connected Location authority: preserve its visible source, direction, quality, falloff, and motivation. Do not invent unassigned fixture positions, color temperatures, contrast ratios, or haze.'
    : 'No lighting design is authored; leave fixture placement, color temperature, contrast ratio, and atmosphere unspecified.')
  const look = [style, authoredFields.look, authoredFields.lightingAndLook, completion.styleContinuityLines.join('\n'), !style && !authoredFields.look && !authoredFields.lightingAndLook ? 'No look or capture character is authored; preserve connected visual authority without applying a universal style preset.' : ''].filter(Boolean).join('\n')

  return [
    { id: 'seedance-assistant-task', heading: 'ASSISTANT TASK', text: authoredFields.assistantTask, priority: 120, required: true },
    { id: 'seedance-edit-control', heading: 'EDIT CONTROL', text: authoredFields.editControl, priority: 119, required: true },
    { id: 'seedance-reference-authority', heading: 'REFERENCE AUTHORITY', text: authority, priority: 118, required: true },
    { id: 'seedance-variable-registry', heading: 'EDITABLE VARIABLE REGISTRY', text: authoredFields.variableRegistry, priority: 95, required: Boolean(authoredFields.variableRegistry) },
    { id: 'seedance-subject-performance', heading: 'SUBJECT AND PERFORMANCE', text: characterPerformance, priority: 112, required: characters.length > 0 || Boolean(authoredFields.subjectPerformance) },
    { id: 'seedance-camera', heading: 'CAMERA', text: camera, priority: 106, required: true },
    { id: 'seedance-lens-optics', heading: 'LENS AND OPTICS', text: optics, priority: 93, required: Boolean(authoredFields.lensOptics) },
    { id: 'seedance-lighting', heading: 'LIGHTING', text: lighting, priority: 77, required: Boolean(authoredFields.lighting) },
    { id: 'seedance-look', heading: 'LOOK AND CAPTURE CHARACTER', text: look, priority: 76, required: Boolean(style || authoredFields.look || authoredFields.lightingAndLook) },
    { id: 'seedance-format-mode', heading: 'FORMAT MODE', text: formatMode, priority: 117, required: Boolean(formatMode) },
    { id: 'seedance-timeline', heading: 'TIMELINE AND CONTINUOUS ACTION', text: timeline, priority: 117, required: true },
    { id: 'seedance-opening-lock', heading: 'OPENING-FRAME HARD LOCK', text: [startTag ? `${startTag} is the exact opening composition, camera viewpoint, subject placement and physical state; motion begins only after that state is established.` : 'Not applicable — no opening-frame authority connected.', authoredFields.openingLock].filter(Boolean).join('\n'), priority: 108, required: Boolean(startTag || authoredFields.openingLock) },
    { id: 'seedance-identity', heading: 'IDENTITY AND ANATOMY CONTINUITY', text: identity, priority: 114, required: characters.length > 0 || Boolean(authoredFields.identityContinuity) },
    { id: 'seedance-wardrobe', heading: 'WARDROBE, ACCESSORY, AND PROP CONTINUITY', text: wardrobe, priority: 91, required: Boolean(authoredFields.wardrobeContinuity) },
    { id: 'seedance-scene', heading: 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY', text: sceneContinuity, priority: 90, required: Boolean(authoredFields.sceneContinuity || authoredFields.stateLedger || request.shotLocks?.trim()) },
    { id: 'seedance-camera-gate', heading: 'CAMERA, FRAMING, AND OPTICAL HARD GATE', text: [referenceCamera.length > 1 ? 'Execute authored camera instructions and shot-specific reference assignments. Keep reference camera paths distinct; unassigned paths are not combined or averaged. Preserve coherent geometry and physically valid parallax without inventing unobserved measurements.' : referenceCamera.length ? 'Execute authored camera instructions; otherwise use the connected motion/camera reference for camera behavior. Preserve coherent geometry and physically valid parallax without inventing unobserved measurements.' : 'Execute only an authored camera path and framing; when none is authored, do not invent a move or lens change. Preserve coherent geometry and physically valid parallax.', authoredFields.cameraGate].filter(Boolean).join('\n'), priority: 111, required: true },
    { id: 'seedance-final-gate', heading: 'FINAL-FRAME AND OUTPUT HARD GATE', text: ['Hard cuts occur only at Storyboard boundaries selected Cut. Continue boundaries remain one uninterrupted take whose prior camera endpoint is the next beat’s starting state. Preserve shot order, screen direction, identity, geometry, causal action outcome, timing relationships and accumulated state. Keep the authored final composition without visible prompt text.', shots.at(-1)?.transitionToNext === 'continue' ? 'The final Continue is an outgoing hook only; retain its endpoint and performance state without inventing a following beat or forcing an unauthored stop.' : 'End on a distinct, stable final composition.', authoredFields.finalAcceptance].filter(Boolean).join('\n'), priority: 113, required: true },
    { id: 'seedance-negative-prompt', heading: 'NEGATIVE PROMPT', text: ['identity blending, face replacement, anatomy or geometry morphing, wardrobe or prop redesign, floating contact, rubbery motion, invented text, logos, subtitles, watermarks, contact sheets, storyboard borders, labels, continuity resets', propScaleNegativeTerms(request).join(', '), motion?.negative, cameraSupportNegative].filter(Boolean).join('\n'), priority: 115, required: true },
  ].filter((section) => section.text.trim()).map((section) => ({
    ...section,
    knowledgeIds: ['REFERENCE AUTHORITY', 'IDENTITY AND ANATOMY CONTINUITY', 'WARDROBE, ACCESSORY, AND PROP CONTINUITY'].includes(section.heading)
      ? SEEDANCE_REFERENCE_EXCLUSIVE_IDS
      : LOCAL_SEEDANCE_COMPLETION_IDS,
  }))
}

export function productionShotSpecSections(request: GenerationRequest, providerLegend?: string, continuityContext?: ProductionContinuityContext): ShotSpecSection[] {
  const shots = shotsFor(request)
  const stateAuthorityErrors = stateAuthorityReadinessErrors(request)
  if (stateAuthorityErrors.length) throw new Error(stateAuthorityErrors[0])
  for (const shot of shots) {
    const supportConflict = cameraSupportConflict(shot.camera, shot.prompt)
    if (supportConflict) throw new Error(supportConflict)
  }
  const directionOn = request.directionLayer !== false
  const ledger = continuityContext?.ledger || buildContinuityLedger(request)
  const indices = continuityContext?.shotIndices || shots.map((_shot, index) => index)
  if (indices.length !== shots.length || new Set(indices).size !== indices.length || indices.some((index, localIndex) => !Number.isInteger(index) || !ledger.shots[index] || shots[localIndex].panelId && shots[localIndex].panelId !== ledger.shots[index].panelId)) throw new Error('Storyboard continuity projection must map every local beat to its authored sequence.')
  const sequence = groupStoryboardSequence(shots)
  const labels = sequence.shots.flatMap((group, groupIndex) => group.beats.map((_beat, beatIndex) => sequence.hardCutCount === 0 && shots.length > 1
    ? `BEAT ${beatIndex + 1}`
    : group.beats.length > 1 ? `SHOT ${groupIndex + 1} / BEAT ${beatIndex + 1}` : `CUT ${groupIndex + 1}`))
  const sections: ShotSpecSection[] = []
  // An explicitly empty authored source must not re-import the graph's already
  // compiled storyboard. Keep authored layout and dialogue punctuation intact.
  const scene = (request.authoredPrompt ?? request.prompt ?? '').trim()
  if (scene) sections.push({ id: 'scene-context', heading: 'SCENE CONTEXT', text: scene, priority: 100, required: true })
  const active = activeReferenceLines(request)
  if (active.length) sections.push({ id: 'active-references', heading: 'ACTIVE REFERENCES', text: active.join('\n'), priority: 95, required: true })
  const map = referenceMap(request, providerLegend)
  if (map) sections.push({ id: 'reference-map', heading: 'REFERENCE MAP', text: map, priority: 94, required: true })

  if (directionOn) {
    const references = request.references || []
    const locations = references.filter((reference) => reference.role === 'location' && compact(reference.description))
    if (locations.length) sections.push({ id: 'location-map', heading: 'LOCATION MAP', text: locations.map((reference, index) => `${referenceTag(reference, index)} — ${authoredDescription(reference.description)}`).join('\n'), priority: 80 })
    const start = references.find((reference) => reference.slot === 'start')
    if (request.inputRole === 'start-frame' || start) {
      const tag = request.inputRole === 'start-frame' ? request.inputTag || '@start-frame' : referenceTag(start!, references.indexOf(start!))
      const description = compact(request.inputName || start?.description || start?.name)
      sections.push({ id: 'first-frame', heading: 'FIRST FRAME', text: `${tag} is the exact opening composition${description ? `: ${description}` : ''}.`, priority: 85 })
    }
    if (shots.length) sections.push({ id: 'format-mode', heading: 'FORMAT MODE', text: sequence.hardCutCount ? 'authored shot groups separated by hard cuts' : 'one continuous shot', priority: 88 })
    shots.forEach((shot, index) => sections.push({
      id: `cut-${index + 1}`,
      heading: labels[index],
      text: `${shot.duration}s; ${shotFov(shot.shotSize)}; ${selectedLensInstruction(shot.lensMm)} ${storyboardAction(shot, index + 1)}${index === shots.length - 1 && shot.transitionToNext === 'continue' ? `\n${STORYBOARD_OUTGOING_CONTINUATION}` : ''}`,
      priority: 92,
      required: true,
    }))
    if (shots.length) sections.push({
      id: 'optics',
      heading: 'OPTICS',
      text: `${shots.map((shot, index) => `${labels[index]}: ${shotFov(shot.shotSize)}.`).join(' ')} No drift mid-segment.`,
      priority: 70,
    })
    if (shots.length) sections.push({
      id: 'camera',
      heading: 'CAMERA',
      text: shots.map((shot, index) => `${labels[index]}: ${timedCameraRecipe(shot.camera, shot.duration, shot.prompt)}`).join('\n'),
      priority: 68,
      required: shots.some(shot => !!shot.camera && shot.camera !== 'auto'),
    })
    const hasCharacter = references.some((reference) => reference.role === 'character') || (request.connectionRules || []).some((rule) => /character/i.test(rule.label))
    const hasElement = references.some((reference) => reference.role === 'element') || (request.connectionRules || []).some((rule) => /element/i.test(rule.label))
    if (request.kind === 'video-generator' && (hasCharacter || hasElement)) {
      const physics: string[] = []
      if (hasCharacter) physics.push('Character: Preserve grounded weight, balance, contact, inertia and follow-through; no floating, rubbery anatomy or unmotivated speed changes.')
      if (hasElement) physics.push('Element: Preserve mass, grip, contact, resistance, attachment and the changed physical state after use.')
      sections.push({ id: 'physics', heading: 'PHYSICS', text: physics.join('\n'), priority: 67 })
    }
    if (hasCharacter) sections.push({
      id: 'performance',
      heading: 'PERFORMANCE',
      text: 'Direct restrained, specific physical behaviour through weight, breath, gaze and micro-hesitation; preserve identity and anatomy without exaggerated mugging or symmetrical posing.',
      priority: 93,
      required: true,
    })
    const audioReferences = references.filter((reference) => reference.authority === 'audio-timing' || reference.mediaType === 'audio')
    const hasAudio = shots.some((shot) => shot.audioCue) || audioReferences.length > 0
    if (hasAudio) {
      const audioLines = shots.flatMap((shot, index) => shot.audioCue ? [`${labels[index]}: ${shot.audioCue}`] : [])
      audioLines.push(...audioReferences.map((reference, index) => `${referenceTag(reference, index)} — ${compact(reference.description || reference.name || 'sound and timing authority')}`))
      sections.push({ id: 'audio', heading: 'AUDIO', text: audioLines.join('\n'), priority: 76 })
    }
  }

  const style = (request.references || []).find((reference) => reference.role === 'style' && compact(reference.description))
  const styleText = (request.stylePrompt || style?.description || '').trim()
  if (styleText && !scene.includes(styleText)) sections.push({ id: 'style', heading: 'STYLE', text: styleText, priority: 40, required: true })

  // These are authored facts, independent of optional directing suggestions.
  // Preserve state and once-only dialogue across both hard cuts and Continue.
  const continuity = indices.flatMap((index) => {
    const lines = typedShotLines(ledger, index)
    return lines.length ? [`PANEL ${index + 1}\n${lines.join('\n')}`] : []
  }).join('\n')
  if (continuity) sections.push({ id: 'authored-continuity', heading: 'AUTHORED CONTINUITY', text: continuity, priority: 110, required: true })

  sections.push({ id: 'positive-locks', heading: 'POSITIVE LOCKS', text: positiveLocks(request), priority: 110, required: true })

  if (request.kind === 'video-generator') {
    const model = resolveVideoModel(request.videoEngine)
    const captureFps = effectiveOutputFrameRate(model, request.frameRate)
    const selectedShutter = typeof request.shutterAngle === 'number' ? request.shutterAngle : 180
    const authoredSource = request.authoredPrompt ?? request.prompt ?? ''
    const motion = filmicMotionSemantics({ authoredText: authoredSource, captureFps, selectedAngle: selectedShutter, motionFps: request.motionCadence, playback: authoredPlaybackTiming([authoredSource, ...shots.map(shot => shot.prompt)].join('\n')) ? { mode: 'authored', deliveryFps: captureFps } : { mode: 'normal' } })
    const conflict = motion.diagnostics.find((diagnostic) => diagnostic.severity === 'conflict')
    if (conflict) throw new Error(conflict.message)
    sections.push({ id: 'filmic-motion', heading: 'FILMIC MOTION RENDERING', text: motion.positive.replace(/^FILMIC MOTION RENDERING\n+/, ''), priority: 69 })
    const cameraSupportNegative = (request.storyboardShots || []).reduce(
      (negative, shot) => mergeCameraSupportNegatives(negative, shot.camera, shot.prompt),
      request.negativePrompt || '',
    )
    const finalNegative = [motion.negative, cameraSupportNegative].filter(Boolean).join('\n')
    if (finalNegative) sections.push({ id: 'filmic-motion-negative', heading: 'NEGATIVE PROMPT', text: finalNegative, priority: 69 })
  }

  return sections.filter((section) => section.text.trim())
}

export function renderShotSpecSections(sections: ShotSpecSection[]): string {
  return sections.map((section) => `${section.heading}\n${section.text}`).join('\n\n')
}
