import { compileMusicRequest } from './musicRequest'
import { MUSIC_ENCODED_OUTPUT_FORMATS } from './musicNodeState'
import { validateSoundEffectDuration } from './soundEffectsDuration'
import {higgsfieldStoryboardTimingFailures} from './higgsfieldVideoTiming'
import { providerPromptOwnershipErrors } from './providerPromptOwnership'
import { referenceDescriptionReadinessFailures } from './assetReferenceDescriptions'
import { seedancePromptIntegrityFailures } from './seedancePromptIntegrity'
import { videoDialogueAudioReadinessFailures } from './videoDialogueAudio'
import { storyboardPhysicalCastReadinessFailures } from './storyboardPhysicalCast'
import { planHiggsfieldNativeInput, higgsfieldSourceOwnsTimeline } from './higgsfieldNative'
import { videoTimingReadinessFailures } from './videoTiming'
import { compileFishAudioRequest } from './fishAudio'
import type { GenerationRequest } from './types'
import { imageReferenceLimit } from './imageModels'
import { findVideoModel } from './videoModels'
import { seedanceReferenceCapacityFailures } from './referenceCapacity'
import { sameBodyAuthorityReadinessFailures } from './sameBodyAuthority'
import { propScaleReadinessFailures } from './propScaleAuthority'
import { compileElevenAudioRequest, isDirectElevenAudio } from './elevenLabsAudio'
import { klingNativeStoryboardReadinessFailures } from './klingNativeStoryboard'
import { falNativeFlowForKind } from './falNativeExecution'
import { nativeVideoOutputFrameRate } from './videoCadenceSelection'

function hasMedia(reference: NonNullable<GenerationRequest['references']>[number]): boolean {
  return Boolean(reference.path || reference.url)
}

/**
 * Renderer-safe mirror of the provider's required-input contract. This powers
 * Play readiness before a paid request is submitted; provider execution still
 * validates the request again in Electron main.
 */
export function generationRequirementFailures(request: GenerationRequest): string[] {
  if (request.promptPreviewOnly) return ['review the live controls; this request is a display-only prompt preview']
  if (request.musicVersion !== undefined || request.musicRequest !== undefined) {
    if (request.kind !== 'music-generator' || request.musicVersion !== 1 || request.audioProvider !== 'elevenlabs' || request.falNative || request.higgsfieldNative || !request.musicRequest) return ['choose one current direct ElevenLabs Music route']
    try {
      const compiled = compileMusicRequest(request.musicRequest)
      if (!(MUSIC_ENCODED_OUTPUT_FORMATS as readonly string[]).includes(compiled.outputFormat)) return ['choose an encoded Music output format']
      if (request.inputPath || request.inputUrl || request.references?.length || request.storyboardShots?.length || request.stylePrompt) return ['Music accepts text only; disconnect media, Style and Storyboard inputs']
      if (request.quantity !== undefined && (!Number.isInteger(request.quantity) || request.quantity < 1 || request.quantity > 4)) return ['choose a Music quantity from 1 to 4']
      return []
    } catch (error) { return [error instanceof Error ? error.message : 'check the Music fields'] }
  }
  if (request.falDraftRecovery) return request.kind === 'video-generator' && request.quantity === 1 && typeof request.falDraftRecovery.requestId === 'string' && typeof request.falDraftRecovery.endpointId === 'string' ? [] : ['choose one original fal draft request']
  if (request.draftCompletion) return request.kind === 'video-generator' && request.quantity === 1 && ['fal', 'byteplus'].includes(request.draftCompletion.provider) && typeof request.draftCompletion.outputPath === 'string' && request.draftCompletion.outputPath ? [] : ['choose one valid linked draft result']
  const failures: string[] = [...providerPromptOwnershipErrors(request), ...(request.kind === 'voiceover' && request.elevenSpeechMode === 'voice-change' ? [] : referenceDescriptionReadinessFailures(request)), ...storyboardPhysicalCastReadinessFailures(request), ...videoDialogueAudioReadinessFailures(request), ...seedancePromptIntegrityFailures(request)]
  const nativeVideo = request.kind === 'video-generator' && (request.falNative || request.higgsfieldNative)
  if (nativeVideo && request.motionCadence !== undefined) {
    const fps = request.nativeOutputFrameRate === null ? undefined : nativeVideoOutputFrameRate(nativeVideo.endpointId, request.nativeOutputFrameRate)
    if (fps === undefined) failures.push('verify native output FPS before using a custom Motion FPS, or select Native')
    else if (request.motionCadence > fps) failures.push(`Motion FPS ${request.motionCadence} exceeds native output FPS ${fps}; choose a cadence at or below Native`)
  }
  for (const source of request.offlineSemanticSources || []) failures.push(`relink ${source.title} (Media Offline)`)
  if (request.higgsfieldNative) {
    if (request.kind !== 'video-generator' || request.falNative) failures.push('choose one Higgsfield video route without another provider binding')
    try { if (higgsfieldSourceOwnsTimeline(request.higgsfieldNative.endpointId) && (request.storyboardShots?.length || request.multiPrompt?.length)) failures.push('Timing and shots come from its source video; choose a compatible generator for an authored Storyboard') } catch { /* The mode-owned planner below reports an unavailable route. */ }
    failures.push(...higgsfieldStoryboardTimingFailures(request))
    if (!higgsfieldSourceOwnsTimeline(request.higgsfieldNative.endpointId)) failures.push(...sameBodyAuthorityReadinessFailures(request), ...propScaleReadinessFailures(request))
    for (const panelNumber of request.storyboardIncompletePanels || []) failures.push(`Storyboard panel ${panelNumber} is blank — describe its action`)
    try { planHiggsfieldNativeInput(request.higgsfieldNative) } catch (error) { failures.push(error instanceof Error ? error.message : 'Review the Higgsfield inputs.') }
    return [...new Set(failures)]
  }
  if (request.falNative) {
    if (!falNativeFlowForKind(request.kind) || falNativeFlowForKind(request.kind) !== request.falNative.flow) failures.push('choose a model belonging to this node flow')
    if (!/^[a-f0-9]{64}$/.test(request.falNative.fingerprint)) failures.push('load and review the selected model contract')
    for (const panelNumber of request.storyboardIncompletePanels || []) failures.push(`Storyboard panel ${panelNumber} is blank — describe its action`)
    if (request.kind === 'video-generator') failures.push(...sameBodyAuthorityReadinessFailures(request), ...propScaleReadinessFailures(request))
    return [...new Set(failures)] // The owned full schema, not the static adapter, owns native requirements in main.
  }
  const prompt = request.prompt?.trim()
  const references = (request.references || []).filter(hasMedia)
  const inputReady = Boolean(request.inputPath || request.inputUrl)
  const images = references.filter((reference) => !reference.mediaType || reference.mediaType === 'image')
  const videos = references.filter((reference) => reference.mediaType === 'video')
  const audios = references.filter((reference) => reference.mediaType === 'audio')
  const startReady = inputReady || images.some((reference) => reference.slot === 'start')
  const endReady = images.some((reference) => reference.slot === 'end')

  switch (request.kind) {
    case 'image-generator':
      if (!prompt) failures.push('add a prompt')
      if (references.some((reference) => reference.mediaType && reference.mediaType !== 'image')) failures.push('remove non-image references')
      {
        const maximum = imageReferenceLimit(request)
        if (images.length > maximum) failures.push(`remove ${images.length - maximum} image reference${images.length - maximum === 1 ? '' : 's'} (maximum ${maximum} for the selected model)`)
      }
      break
    case 'image-editor':
      if (!prompt) failures.push('add an edit instruction')
      if (!inputReady && !images.length) failures.push('connect or import at least one source image')
      break
    case 'upscaler':
      if (!inputReady) failures.push(`connect or import the ${request.upscalerModel === 'realesrgan-video' ? 'video' : 'image'} to upscale`)
      break
    case 'video-generator': {
      failures.push(...videoTimingReadinessFailures(request))
      for (const panelNumber of request.storyboardIncompletePanels || []) failures.push(`Storyboard panel ${panelNumber} is blank — describe its action`)
      if (!prompt && !request.multiPrompt?.length) failures.push('add a prompt or connect a populated Storyboard/text List')
      const model = findVideoModel(request.videoEngine)
      if (!model) {
        failures.push(`choose a supported video model (saved selection: ${request.videoEngine})`)
        break
      }
      if (model.mode === 'image' && !startReady) failures.push(`connect the starting image required by ${model.label}`)
      if (model.mode === 'first-last') {
        if (!startReady) failures.push(`connect the starting image required by ${model.label}`)
        if (!endReady) failures.push(`connect the ending image required by ${model.label}`)
      }
      if (model.mode === 'extend' && !videos.length) failures.push(`connect the source video required by ${model.label}`)
      if (model.mode === 'reference') {
        if (model.family === 'seedance' && !images.length && !videos.length && !audios.length) failures.push('connect a List or Character, Location, Element, image, video, or audio reference')
        if (model.family === 'seedance' && audios.length && !images.length && !videos.length) failures.push('connect at least one image or video alongside the audio reference')
        if (model.family === 'veo' && !images.length && !inputReady) failures.push(`connect at least one reference image required by ${model.label}`)
      }
      if (model.family === 'kling' && audios.length) failures.push('remove audio references or choose Seedance 2 References')
      if (model.family === 'kling') failures.push(...klingNativeStoryboardReadinessFailures(request))
      if (model.family === 'seedance') failures.push(...seedanceReferenceCapacityFailures(request), ...sameBodyAuthorityReadinessFailures(request), ...propScaleReadinessFailures(request))
      if (model.mode === 'text' && (inputReady || references.length)) failures.push(`disconnect media references or choose an input-aware ${model.shortLabel} mode`)
      break
    }
    case 'voiceover':
      if (request.elevenSpeechMode === 'voice-change') {
        if (request.voiceEngine !== 'elevenlabs-direct') failures.push('choose direct ElevenLabs for Voice Change')
        if (references.length !== 1 || references[0]?.mediaType !== 'audio' || !references[0]?.path) failures.push('connect one original audio recording')
        if (!request.voice?.trim()) failures.push('choose a target voice')
        if (!request.voiceModelId?.trim()) failures.push('choose a Voice Change model')
      } else if (!prompt) failures.push('add voiceover text')
      if (request.voiceEngine === 'fish-audio' && !request.fishReferenceId?.trim()) failures.push('add a Fish Audio voice Reference ID')
      break
    case 'sound-effects':
      if (!prompt) failures.push('describe the sound effect')
      if (!isDirectElevenAudio(request)) {
        try { validateSoundEffectDuration(request.duration, 'fal') }
        catch (error) { failures.push(error instanceof Error ? error.message : 'check the Sound Effect duration') }
      }
      break
    case 'music-generator':
      if (!prompt) failures.push('describe the music')
      break
    default:
      failures.push('use a node that supports generation')
  }
  if (request.kind === 'voiceover' && request.voiceEngine === 'fish-audio' && prompt && request.fishReferenceId?.trim()) {
    try { compileFishAudioRequest(request) }
    catch (error) { failures.push(error instanceof Error ? error.message : 'check the Fish Audio settings') }
  }
  if (isDirectElevenAudio(request) && request.elevenSpeechMode !== 'voice-change') {
    try { compileElevenAudioRequest(request) }
    catch (error) { failures.push(error instanceof Error ? error.message : 'check the ElevenLabs audio settings') }
  }
  return [...new Set(failures)]
}

export function assertGenerationRequirements(request: GenerationRequest): void {
  const failures = generationRequirementFailures(request)
  if (failures.length) throw new Error(`Cannot run: ${formatRequirementList(failures)}.`)
}

export function generationReadinessTooltip(request: GenerationRequest): { disabled: boolean; tooltip: string } {
  const failures = generationRequirementFailures(request)
  return failures.length
    ? { disabled: true, tooltip: `Cannot run: ${formatRequirementList(failures)}.` }
    : { disabled: false, tooltip: 'Run — all required inputs and settings are ready.' }
}

export function formatRequirementList(reasons: string[]): string {
  return [...new Set(reasons.map((reason) => reason.trim().replace(/[.;:]+$/g, '')).filter(Boolean))].join('; ')
}
