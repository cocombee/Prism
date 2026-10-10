import {
  planHiggsfieldSeedanceInput, materializeHiggsfieldSeedanceInput,
  type HiggsfieldSeedanceInputRequest, type HiggsfieldSeedanceInputPlan, type HiggsfieldSeedanceSource,
} from '../shared/higgsfieldSeedanceInput'
import type { FalSchemaNode } from '../shared/falSchemaBinding'

/** Prism memory guards, not advertised provider limits. No conversion or clipping. */
export const HIGGSFIELD_SEEDANCE_LOCAL_BUDGET = Object.freeze({
  imageBytes: 64 * 1024 * 1024, videoBytes: 200 * 1024 * 1024,
  audioBytes: 64 * 1024 * 1024, totalBytes: 512 * 1024 * 1024,
})
const uploadTypes = {
  image: ['image/jpeg','image/jpg','image/png','image/webp','image/gif'],
  video: ['video/mp4'], audio: ['audio/wav','audio/x-wav'],
}
export interface HiggsfieldSeedanceInspection {
  source: HiggsfieldSeedanceSource
  byteLength: number
  contentType: string
}
export interface HiggsfieldSeedancePreparedMedia {
  source: HiggsfieldSeedanceSource
  bytes?: Uint8Array
  contentType?: string
}
export interface HiggsfieldSeedancePreparationDependencies {
  /** Separately owned main input; never read from the generation DTO. */
  inputSchema?: FalSchemaNode
  assertCurrent: () => void
  /** Main-owned managed-path and stable-file metadata check; no renderer metadata. */
  inspect: (source: HiggsfieldSeedanceSource, signal?: AbortSignal) => Promise<HiggsfieldSeedanceInspection>
  /** Read the exact inspected file and reject inode/size/mtime changes. */
  read: (inspection: HiggsfieldSeedanceInspection, signal?: AbortSignal) => Promise<Uint8Array>
  /** Inspect actual content, using the image/video/audio adapter for this source. */
  validate: (media: HiggsfieldSeedancePreparedMedia, signal?: AbortSignal) => Promise<void>
}
export interface HiggsfieldSeedancePreparedInput {
  plan: HiggsfieldSeedanceInputPlan
  /** One entry per declared slot, including intentional repeated assignments. */
  media: readonly HiggsfieldSeedancePreparedMedia[]
}

/** Preparation-only foundation. The caller must validate the fresh owned contract
 * before journal/credentials, and the actual wire body before submission. */
export async function prepareHiggsfieldSeedanceMedia(
  request: HiggsfieldSeedanceInputRequest, dependencies: HiggsfieldSeedancePreparationDependencies, signal?: AbortSignal,
): Promise<HiggsfieldSeedancePreparedInput> {
  const assertCurrent = () => { signal?.throwIfAborted(); dependencies.assertCurrent() }
  assertCurrent()
  if(request.fingerprint!==undefined&&!dependencies.inputSchema)throw new Error('The current Higgsfield schema must be owned by main before media preparation.')
  const plan = planHiggsfieldSeedanceInput(request, dependencies.inputSchema)
  const inspections = new Map<string,HiggsfieldSeedanceInspection>()
  const key = (source:HiggsfieldSeedanceSource) => JSON.stringify([source.mediaType,source.path])
  let total = 0
  // Inspect the whole unique set before retaining any buffers. Remote URLs are
  // passed through unchanged and never downloaded or assigned invented metadata.
  for (const {source} of plan.slots) {
    assertCurrent()
    if (!source.path || inspections.has(key(source))) continue
    const inspected = await dependencies.inspect(source,signal)
    assertCurrent()
    if (inspected.source.mediaType !== source.mediaType || inspected.source.path !== source.path || inspected.source.url !== undefined)
      throw new Error('Higgsfield Seedance inspected media changed its type or managed path.')
    const maximum = HIGGSFIELD_SEEDANCE_LOCAL_BUDGET[`${source.mediaType}Bytes`]
    if (!Number.isSafeInteger(inspected.byteLength) || inspected.byteLength < 1 || inspected.byteLength > maximum)
      throw new Error('Higgsfield Seedance media exceeds Prism’s local file-size bound; its original input was preserved.')
    if (!uploadTypes[source.mediaType].includes(inspected.contentType))
      throw new Error('Higgsfield Seedance needs a supported upload format; no conversion was performed.')
    total += inspected.byteLength
    if (total > HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.totalBytes)
      throw new Error('Higgsfield Seedance aggregate local media exceeds Prism’s memory bound; no files were read or uploaded.')
    inspections.set(key(source),Object.freeze({...inspected,source:Object.freeze({...source})}))
  }
  const prepared = new Map<string,HiggsfieldSeedancePreparedMedia>()
  for (const [identity,inspection] of inspections) {
    assertCurrent()
    const bytes = await dependencies.read(inspection,signal)
    assertCurrent()
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== inspection.byteLength)
      throw new Error('Higgsfield Seedance media changed during preparation.')
    const media = Object.freeze({source:inspection.source,bytes,contentType:inspection.contentType})
    await dependencies.validate(media,signal)
    assertCurrent()
    prepared.set(identity,media)
  }
  const media = plan.slots.map(({source}) => source.path ? prepared.get(key(source))! : Object.freeze({source}))
  assertCurrent()
  return Object.freeze({plan,media:Object.freeze(media)})
}

export function materializePreparedHiggsfieldSeedance(prepared:HiggsfieldSeedancePreparedInput, urls:string[]) {
  return materializeHiggsfieldSeedanceInput(prepared.plan,urls)
}
