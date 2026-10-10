import { hasExactAuthoredProviderBody } from './providerPromptOwnership'
import { ownsExactSeedanceMaster } from './seedanceAuthoredMaster'
import {higgsfieldSourceOwnsTimeline} from './higgsfieldNative'
import type { GenerationRequest, StoryboardTypedContinuity } from './types'

export interface StoryboardPhysicalCast {
  readonly tags: string[]
  /** An explicit empty list is known; an absent first list remains unknown. */
  readonly known: boolean
}

/** Physical cast includes off-camera identities; visibility never changes membership. */
export function resolveStoryboardPhysicalCast(panels: readonly StoryboardTypedContinuity[]): { shots: StoryboardPhysicalCast[]; errors: string[] } {
  const errors: string[] = [], shots: StoryboardPhysicalCast[] = []
  let previousGroup: string | undefined, previous: StoryboardPhysicalCast = { tags: [], known: false }
  const semanticTag = (value: unknown): value is string => typeof value === 'string' && /^@[\p{L}\p{N}_-]+$/u.test(value) && !/^@(?:Image|Video|Audio)\d+$/.test(value)
  for (const [index, panel] of panels.entries()) {
    const label = `Storyboard panel ${index + 1}`
    if (!panel || typeof panel !== 'object' || Array.isArray(panel)) {
      errors.push(`${label} needs an authored continuity record; no cast was guessed.`)
      shots.push({ tags: [], known: false }); previous = { tags: [], known: false }; previousGroup = undefined; continue
    }
    const tags = (values: unknown, role: string): string[] => {
      if (values === undefined) return []
      if (!Array.isArray(values) || values.some(value => !semanticTag(value))) { errors.push(`${label} ${role} needs canonical Character tags; its authored values were preserved.`); return [] }
      return [...new Set(values as string[])]
    }
    const excluded = new Set(tags(panel.excludedCharacterTags, 'excluded cast'))
    const inherited = panel.continuityGroupId === previousGroup ? previous : { tags: [], known: false }
    const cast = panel.activeCharacterTags !== undefined
      ? { tags: tags(panel.activeCharacterTags, 'physical cast'), known: true }
      : { tags: [...inherited.tags], known: inherited.known }
    cast.tags = cast.tags.filter(tag => !excluded.has(tag))
    for (const [kind, records] of [['state', panel.characterStates], ['state delta', panel.characterStateDeltas]] as const) {
      if (records === undefined) continue
      if (!Array.isArray(records)) { errors.push(`${label} character ${kind} needs an ordered state list; its authored values were preserved.`); continue }
      for (const record of records) {
        const tag = record && typeof record === 'object' ? record.characterTag : undefined
        if (!semanticTag(tag)) errors.push(`${label} character ${kind} needs a canonical physical cast owner; no owner was guessed.`)
        else if (!excluded.has(tag) && !cast.tags.includes(tag)) errors.push(`${label} physical cast must include ${tag} before its authored ${kind} can be compiled; no state was discarded.`)
      }
    }
    shots.push(cast); previous = cast; previousGroup = panel.continuityGroupId
  }
  return { shots, errors: [...new Set(errors)] }
}

export function assertStoryboardPhysicalCast(panels: readonly StoryboardTypedContinuity[]): StoryboardPhysicalCast[] {
  const resolved = resolveStoryboardPhysicalCast(panels)
  if (resolved.errors.length) throw new Error(resolved.errors[0])
  return resolved.shots
}

/** Exact authored masters do not consume or repair unused typed state. */
export function storyboardPhysicalCastReadinessFailures(request: GenerationRequest): string[] {
  if (request.kind !== 'video-generator' || hasExactAuthoredProviderBody(request) || ownsExactSeedanceMaster(request) || request.higgsfieldNative && higgsfieldSourceOwnsTimeline(request.higgsfieldNative.endpointId)) return []
  return resolveStoryboardPhysicalCast(request.storyboardShots || []).errors
}
