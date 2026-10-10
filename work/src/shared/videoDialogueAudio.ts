import {higgsfieldSourceOwnsTimeline} from './higgsfieldNative'
import type { GenerationRequest } from './types'
import { hasExactAuthoredProviderBody } from './providerPromptOwnership'
import { ownsExactSeedanceMaster } from './seedanceAuthoredMaster'
import { findVideoModel } from './videoModels'

function unusedTypedDialogue(request: GenerationRequest): boolean {
  return request.kind !== 'video-generator' || hasExactAuthoredProviderBody(request) || ownsExactSeedanceMaster(request) || Boolean(request.higgsfieldNative && higgsfieldSourceOwnsTimeline(request.higgsfieldNative.endpointId))
}

/** Validate only declared typed records. Empty arrays and empty authored text remain empty. */
export function typedDialogueReadinessFailures(request: GenerationRequest): string[] {
  if (unusedTypedDialogue(request)) return []
  const errors: string[] = []
  for (const [index, shot] of (request.storyboardShots || []).entries()) {
    if (shot.dialogueSpans === undefined) continue
    const malformed = !Array.isArray(shot.dialogueSpans) || shot.dialogueSpans.some(span => {
      if (!span || typeof span !== 'object' || Array.isArray(span)) return true
      if (['id', 'speakerTag', 'startPanelId', 'endPanelId'].some(key => typeof span[key as keyof typeof span] !== 'string' || !(span[key as keyof typeof span] as string).trim())) return true
      if (typeof span.text !== 'string') return true
      if (span.targetTag !== undefined && (typeof span.targetTag !== 'string' || !span.targetTag.trim())) return true
      if (['delivery', 'lipSync'].some(key => span[key as keyof typeof span] !== undefined && typeof span[key as keyof typeof span] !== 'string')) return true
      return span.insertAudioPanelIds !== undefined && (!Array.isArray(span.insertAudioPanelIds) || span.insertAudioPanelIds.some(id => typeof id !== 'string' || !id.trim()))
    })
    if (malformed) errors.push(`Typed dialogue in panel ${index + 1} is malformed; review its declared span records before generating.`)
  }
  return errors
}

/** Typed spans request spoken generation; prose and unused exact-master metadata are not inferred. */
export function requiresGeneratedDialogueAudio(request: GenerationRequest): boolean {
  const malformed = typedDialogueReadinessFailures(request)
  if (malformed.length) throw new VideoDialogueAudioConflictError(malformed.join(' '))
  if (unusedTypedDialogue(request)) return false
  return (request.storyboardShots || []).some(shot => Array.isArray(shot.dialogueSpans) && shot.dialogueSpans.some(span => typeof span?.text === 'string' && Boolean(span.text.trim())))
}

export function videoDialogueAudioReadinessFailures(request: GenerationRequest): string[] {
  const malformed = typedDialogueReadinessFailures(request)
  if (malformed.length) return malformed
  if (!requiresGeneratedDialogueAudio(request)) return []
  if (request.falNative || request.higgsfieldNative) {
    if ((request.falNative || request.higgsfieldNative)!.values?.generate_audio === false) return ['Typed spoken dialogue requires generated audio; enable the selected model’s audio control or remove its spoken dialogue assignment']
    // Undeclared/default values belong to the fresh main-owned schema, never a static route fallback.
    return []
  }
  const model = findVideoModel(request.videoEngine)
  if (!model?.nativeAudio) return ['Typed spoken dialogue needs a model with verified native generated speech audio']
  if (request.generateAudio !== true) return ['Typed spoken dialogue requires generated audio; enable audio or remove its spoken dialogue assignment']
  return []
}

export class VideoDialogueAudioConflictError extends Error {
  constructor(message = 'Typed spoken dialogue needs verified generated audio enabled in the current model contract; no audio control was guessed or changed.') { super(message); this.name = 'VideoDialogueAudioConflictError' }
}
