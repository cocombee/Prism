import {
  planHiggsfieldSeedanceInput, materializeHiggsfieldSeedanceInput,
  type HiggsfieldSeedanceInputRequest, type HiggsfieldSeedanceInputPlan, type HiggsfieldSeedanceSource,
} from '../shared/higgsfieldSeedanceInput'
import type { FalSchemaNode } from '../shared/falSchemaBinding'

/** Prism memory guards, not advertised provider limits. Never clip inputs. */
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
  /** Main-owned MP3 decoder. Original source identity remains unchanged. */
  prepareAudio?: (media:HiggsfieldSeedancePreparedMedia,maximumBytes:number,signal?:AbortSignal) => Promise<{bytes:Uint8Array;contentType:'audio/wav'}>
  /** Inspect actual content, using the image/video/audio adapter for this source. */
  validate: (media: HiggsfieldSeedancePreparedMedia, signal?: AbortSignal) => Promise<void>
}

export function supportsHiggsfieldLocalSource(inspection:HiggsfieldSeedanceInspection,dependencies:Pick<HiggsfieldSeedancePreparationDependencies,'prepareAudio'>):boolean {
  return uploadTypes[inspection.source.mediaType].includes(inspection.contentType)||
    (inspection.source.mediaType==='audio'&&inspection.contentType==='audio/mpeg'&&typeof dependencies.prepareAudio==='function')
}

/** Original buffers plus retained derivatives plus current chunks/concatenation.
 * Small multiple MP3s remain supported; expansion fails before any upload. */
export function higgsfieldLocalDerivativeBound(originalBytes:number,retainedDerivatives=0):number {
  return Math.min(HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.audioBytes,Math.floor((HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.totalBytes-originalBytes-retainedDerivatives)/2))
}

export async function prepareHiggsfieldInspectedMedia(inspection:HiggsfieldSeedanceInspection,dependencies:HiggsfieldSeedancePreparationDependencies,signal?:AbortSignal,maximumDerivedBytes=HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.audioBytes):Promise<HiggsfieldSeedancePreparedMedia> {
  const check=()=>{signal?.throwIfAborted();dependencies.assertCurrent()}
  check()
  const convert=inspection.source.mediaType==='audio'&&inspection.contentType==='audio/mpeg'
  if(convert&&(!Number.isSafeInteger(maximumDerivedBytes)||maximumDerivedBytes<44||maximumDerivedBytes>HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.audioBytes))throw Error('Higgsfield aggregate local memory cannot retain the WAV derivative; no files were uploaded.')
  const original=await dependencies.read(inspection,signal)
  check()
  if(!(original instanceof Uint8Array)||original.byteLength!==inspection.byteLength)throw Error('Higgsfield media changed during preparation.')
  let bytes=original,contentType=inspection.contentType
  if(convert){
    if(!dependencies.prepareAudio)throw Error('MP3 audio preparation is unavailable; the source was preserved.')
    const derivative=await dependencies.prepareAudio(Object.freeze({source:inspection.source,bytes:original,contentType}),maximumDerivedBytes,signal)
    check()
    if(!(derivative.bytes instanceof Uint8Array)||derivative.bytes.byteLength<1||derivative.bytes.byteLength>maximumDerivedBytes||derivative.contentType!=='audio/wav')throw Error('MP3 preparation needs bounded actual WAV output; no upload was performed.')
    bytes=derivative.bytes;contentType=derivative.contentType
  }
  const media=Object.freeze({source:inspection.source,bytes,contentType})
  await dependencies.validate(media,signal)
  check()
  return media
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
    if (!supportsHiggsfieldLocalSource(inspected,dependencies))
      throw new Error('Higgsfield Seedance needs a supported upload format; no conversion was performed.')
    total += inspected.byteLength
    if (total > HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.totalBytes)
      throw new Error('Higgsfield Seedance aggregate local media exceeds Prism’s memory bound; no files were read or uploaded.')
    inspections.set(key(source),Object.freeze({...inspected,source:Object.freeze({...source})}))
  }
  if([...inspections.values()].some(i=>i.source.mediaType==='audio'&&i.contentType==='audio/mpeg')&&higgsfieldLocalDerivativeBound(total)<44)throw Error('Higgsfield Seedance aggregate local memory cannot retain decoded audio; no files were read or uploaded.')
  const prepared = new Map<string,HiggsfieldSeedancePreparedMedia>()
  let derivativeBytes=0
  for (const [identity,inspection] of inspections) {
    assertCurrent()
    const media=await prepareHiggsfieldInspectedMedia(inspection,dependencies,signal,higgsfieldLocalDerivativeBound(total,derivativeBytes))
    if(inspection.source.mediaType==='audio'&&inspection.contentType==='audio/mpeg')derivativeBytes+=media.bytes!.byteLength
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
