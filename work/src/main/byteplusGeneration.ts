import { BYTEPLUS_SEEDANCE_DRAFT_MODEL } from '../shared/videoDraft'
import { assertVideoProviderPromptPreflight } from '../shared/providerPromptPreflight'
import { videoDialogueAudioReadinessFailures } from '../shared/videoDialogueAudio'
import { storyboardPhysicalCastReadinessFailures } from '../shared/storyboardPhysicalCast'
import { legacyVideoDurationPlan, authoredTimelineSeconds } from '../shared/videoTiming'
import { compileBytePlusSeedancePayload, type BytePlusCreatePayload, type BytePlusReference } from '../shared/byteplusSeedance'
import { providerSeedancePayloadCompilation, selectSeedanceReferences } from '../shared/referenceInstructions'
import type { GenerationRequest } from '../shared/types'
import { resolveVideoModel } from '../shared/videoModels'
import { seedanceReferenceCandidates, seedanceReferenceCapacityFailures } from '../shared/referenceCapacity'

type GenerationReference = NonNullable<GenerationRequest['references']>[number]
export type BytePlusMediaResolver = (source: { path?: string; url?: string; mediaType?: 'image' | 'video' | 'audio' }) => Promise<string>

async function resolvedReference(reference: GenerationReference, resolveMedia: BytePlusMediaResolver): Promise<{ reference: GenerationReference; url: string }> {
  return { reference, url: await resolveMedia(reference) }
}

export async function compileBytePlusGenerationRequest(request: GenerationRequest, resolveMedia: BytePlusMediaResolver): Promise<BytePlusCreatePayload> {
  const route = resolveVideoModel(request.videoEngine)
  if (request.videoDraft && route.apiModelId !== BYTEPLUS_SEEDANCE_DRAFT_MODEL) throw new Error('This model has no verified draft mode.')
  if (route.provider !== 'byteplus') throw new Error('The selected video model is not a BytePlus route.')

  const castFailures = [...storyboardPhysicalCastReadinessFailures(request), ...videoDialogueAudioReadinessFailures(request)]
  if (castFailures.length) throw new Error(castFailures.join('; '))
  assertVideoProviderPromptPreflight(request)

  const timing = legacyVideoDurationPlan(request, route), timeline = authoredTimelineSeconds(request)
  if (timeline !== undefined && Math.abs(timeline - timing.seconds!) > 0.000001) throw new Error(`BytePlus duration must match the authored ${timeline}s timeline; timing was not substituted.`)
  const capacityFailures = seedanceReferenceCapacityFailures(request)
  if (capacityFailures.length) throw new Error(capacityFailures.join('; '))
  const references: GenerationReference[] = route.mode === 'reference' ? seedanceReferenceCandidates(request).filter(reference => Boolean(reference.path || reference.url)) : [...(request.references || [])]
  if (route.mode !== 'reference' && (request.inputPath || request.inputUrl) && !references.some((reference) => Boolean(request.inputPath && reference.path === request.inputPath) || Boolean(request.inputUrl && reference.url === request.inputUrl))) {
    references.unshift({ role: 'reference', slot: 'start', path: request.inputPath, url: request.inputUrl, mediaType: 'image' })
  }

  let media: BytePlusReference[] = []
  let promptRequest: GenerationRequest = { ...request, references: [] }
  if (route.mode === 'image') {
    const start = references.find((reference) => reference.slot === 'start' && (!reference.mediaType || reference.mediaType === 'image'))
    const end = references.find((reference) => reference.slot === 'end' && (!reference.mediaType || reference.mediaType === 'image'))
    if (!start) throw new Error('BytePlus image-to-video needs a connected start image.')
    const resolved = await Promise.all([start, end].filter((reference): reference is GenerationReference => Boolean(reference)).map((reference) => resolvedReference(reference, resolveMedia)))
    media = resolved.map(({ reference, url }, index) => ({ kind: 'image', url, role: index === 0 ? 'first_frame' : 'last_frame' }))
    promptRequest = { ...request, references: resolved.map(({ reference, url }) => ({ ...reference, url, path: undefined })) }
  } else if (route.mode === 'reference') {
    const selected = selectSeedanceReferences(references, route.referenceLimits)
    const ordered = [...selected.images, ...selected.videos, ...selected.audios]
    if (!ordered.length) throw new Error('BytePlus reference mode needs a connected reference.')
    const resolved = await Promise.all(ordered.map((reference) => resolvedReference(reference, resolveMedia)))
    media = resolved.map(({ reference, url }) => reference.mediaType === 'video'
      ? { kind: 'video', url, role: 'reference_video' }
      : reference.mediaType === 'audio'
        ? { kind: 'audio', url, role: 'reference_audio' }
        : { kind: 'image', url, role: 'reference_image' })
    promptRequest = { ...request, references: resolved.map(({ reference, url }) => ({ ...reference, url, path: undefined })) }
  }

  const duration = timing.seconds!
  const ratio = request.aspectRatio && route.ratios.includes(request.aspectRatio) ? request.aspectRatio : route.ratios.includes('16:9') ? '16:9' : undefined
  const resolution = request.resolution && route.resolutions.includes(request.resolution) ? request.resolution : route.resolutions.includes('720p') ? '720p' : route.resolutions[0]
  const prompt = providerSeedancePayloadCompilation(promptRequest).text

  const payload = compileBytePlusSeedancePayload({
    route,
    prompt,
    media,
    ratio,
    resolution,
    duration,
    generateAudio: Boolean(request.generateAudio),
    ...(route.supportsSeed && Number.isSafeInteger(request.seed) ? { seed: request.seed } : {}),
  })
  return request.videoDraft ? { ...payload, draft: true, resolution: '480p' } : payload
}
