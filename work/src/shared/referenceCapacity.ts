import type { GenerationRequest } from './types'
import { providerVisibleReferences } from './sameBodyAuthority'
import { findVideoModel } from './videoModels'

type Reference = NonNullable<GenerationRequest['references']>[number]
export interface ReferenceCapacity {
  images: number
  videos: number
  audios: number
  total: number
}

/** Count physical attachments, not semantic node count or panels inside a sheet. */
export function referenceCapacityFailures(references: readonly Reference[], limits: Readonly<ReferenceCapacity>, label: string): string[] {
  const counts = { images: 0, videos: 0, audios: 0, total: 0 }
  for (const reference of references) {
    if (!reference.path && !reference.url) continue
    counts[reference.mediaType === 'video' ? 'videos' : reference.mediaType === 'audio' ? 'audios' : 'images']++
    counts.total++
  }
  const failures: string[] = []
  for (const key of ['images', 'videos', 'audios', 'total'] as const) {
    if (counts[key] > limits[key]) failures.push(`${label} accepts at most ${limits[key]} ${key === 'total' ? 'total references' : key}; connected ${counts[key]} — remove ${counts[key] - limits[key]} before generation`)
  }
  return failures
}

/** The same visible references own capacity, uploads and reference-mode binding. */
export function seedanceReferenceCandidates(request: GenerationRequest): Reference[] {
  const references = providerVisibleReferences(request)
  if ((request.inputPath || request.inputUrl) && !references.some(reference => Boolean(request.inputPath && reference.path === request.inputPath) || Boolean(request.inputUrl && reference.url === request.inputUrl))) {
    references.unshift({ role: 'reference', path: request.inputPath, url: request.inputUrl, name: request.inputName, tag: request.inputTag,
      mediaType: request.inputRole === 'source-video' ? 'video' : 'image', slot: request.inputRole === 'source-video' ? 'reference' : 'start' })
  }
  return references
}

export function seedanceReferenceCapacityFailures(request: GenerationRequest): string[] {
  const model = findVideoModel(request.videoEngine)
  if (request.kind !== 'video-generator' || model?.family !== 'seedance' || model.mode !== 'reference' || !model.referenceLimits) return []
  return referenceCapacityFailures(seedanceReferenceCandidates(request), model.referenceLimits, model.label)
}
