import { assertHiggsfieldPublicUrl } from '../shared/higgsfieldPublicUrl'
import {
  materializeHiggsfieldReferenceVideoInput,
  planHiggsfieldReferenceVideoInput,
  type HiggsfieldReferenceVideoInputPlan,
  type HiggsfieldReferenceVideoSource,
} from '../shared/higgsfieldReferenceVideo'
import type { FalSchemaNode } from '../shared/falSchemaBinding'
import type {
  HiggsfieldSeedanceInspection,
  HiggsfieldSeedancePreparedMedia,
  HiggsfieldSeedancePreparationDependencies,
} from './higgsfieldSeedancePreparation'
import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'
import type { HiggsfieldApi } from './higgsfieldApi'
import type { HiggsfieldNativeRequest } from '../shared/higgsfieldNative'

/** Prism-owned memory guards, not published provider media limits. */
export const HIGGSFIELD_REFERENCE_VIDEO_LOCAL_BUDGET = Object.freeze({
  imageBytes: 64 * 1024 * 1024,
  videoBytes: 200 * 1024 * 1024,
  audioBytes: 64 * 1024 * 1024,
  totalBytes: 512 * 1024 * 1024,
})

const uploadTypes = Object.freeze({
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4'],
  audio: ['audio/wav', 'audio/x-wav'],
})

export type HiggsfieldReferenceVideoInspection = HiggsfieldSeedanceInspection
export type HiggsfieldReferenceVideoPreparedMedia = HiggsfieldSeedancePreparedMedia
export type HiggsfieldReferenceVideoManagedMediaDependencies = Pick<HiggsfieldSeedancePreparationDependencies, 'assertCurrent' | 'inspect' | 'read' | 'validate'>

export interface HiggsfieldReferenceVideoGenerationDependencies extends HiggsfieldReferenceVideoManagedMediaDependencies {
  /** Fresh input schema returned by the trusted main current-contract owner. */
  inputSchema: FalSchemaNode
  /** Rereads the main-owned contract and checks the request fingerprint/body. */
  validateInput: (input: unknown) => Promise<void>
  api: () => Promise<Pick<HiggsfieldApi, 'upload' | 'generate'>>
  persist: (output: { requestId: string; url: string; contentType?: string }, endpointId: string, signal?: AbortSignal) => Promise<{ path: string; url: string }>
}

type Identity = string
const identity = (source: HiggsfieldReferenceVideoSource): Identity => JSON.stringify([source.mediaType, source.path])

function assertCurrentFactory(dependencies: HiggsfieldReferenceVideoGenerationDependencies, signal?: AbortSignal): () => void {
  return () => { signal?.throwIfAborted(); dependencies.assertCurrent() }
}

async function prepareManagedMedia(plan: HiggsfieldReferenceVideoInputPlan, dependencies: HiggsfieldReferenceVideoGenerationDependencies, signal: AbortSignal | undefined, assertCurrent: () => void): Promise<HiggsfieldReferenceVideoPreparedMedia[]> {
  const inspections = new Map<Identity, HiggsfieldReferenceVideoInspection>()
  let totalBytes = 0
  for (const slot of plan.slots) {
    assertCurrent()
    const source = slot.source
    if (!source.path) continue
    const key = identity(source)
    if (inspections.has(key)) continue
    const inspected = await dependencies.inspect(source, signal)
    assertCurrent()
    if (inspected.source.mediaType !== source.mediaType || inspected.source.path !== source.path || inspected.source.url !== undefined) throw new Error('Higgsfield Reference inspected media changed its type or managed path.')
    const maximum = HIGGSFIELD_REFERENCE_VIDEO_LOCAL_BUDGET[`${source.mediaType}Bytes`]
    if (!Number.isSafeInteger(inspected.byteLength) || inspected.byteLength < 1 || inspected.byteLength > maximum) throw new Error('Higgsfield Reference media exceeds Prism’s local file-size bound; the source was preserved.')
    if (!(uploadTypes[source.mediaType] as readonly string[]).includes(inspected.contentType)) throw new Error('Higgsfield Reference needs a locally supported upload format; no conversion was performed.')
    totalBytes += inspected.byteLength
    if (totalBytes > HIGGSFIELD_REFERENCE_VIDEO_LOCAL_BUDGET.totalBytes) throw new Error('Higgsfield Reference media exceeds Prism’s aggregate local-memory bound; no files were read or uploaded.')
    inspections.set(key, Object.freeze({ ...inspected, source: Object.freeze({ ...inspected.source }) }))
  }

  const preparedByIdentity = new Map<Identity, HiggsfieldReferenceVideoPreparedMedia>()
  for (const [key, inspection] of inspections) {
    assertCurrent()
    const bytes = await dependencies.read(inspection, signal)
    assertCurrent()
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== inspection.byteLength) throw new Error('Higgsfield Reference media changed during local preparation.')
    const media: HiggsfieldReferenceVideoPreparedMedia = Object.freeze({ source: inspection.source, bytes, contentType: inspection.contentType })
    await dependencies.validate(media, signal)
    assertCurrent()
    preparedByIdentity.set(key, media)
  }
  const prepared = plan.slots.map(({ source }) => source.path ? preparedByIdentity.get(identity(source))! : Object.freeze({ source: Object.freeze({ ...source }) }))
  assertCurrent()
  return prepared
}

/** Reference-only executor. It reuses main's managed-media boundary while
 * keeping a separate route contract and exact endpoint identity. */
export async function executeHiggsfieldReferenceVideoGeneration(
  request: HiggsfieldNativeRequest,
  dependencies: HiggsfieldReferenceVideoGenerationDependencies,
  signal?: AbortSignal,
) {
  const assertCurrent = assertCurrentFactory(dependencies, signal)
  assertCurrent()
  if (!dependencies.inputSchema) throw new Error('The current main-owned Higgsfield Reference schema is required before generation.')
  if (!request.fingerprint) throw new Error('Load and review the current Higgsfield Reference model inputs before generation.')

  const plan = planHiggsfieldReferenceVideoInput(request, dependencies.inputSchema)
  if (Buffer.byteLength(JSON.stringify(plan.preview)) > HIGGSFIELD_RESOURCE_LIMITS.wireBytes) throw new Error('Higgsfield Reference inputs exceed Prism’s protected request capacity; authored values were preserved.')

  // Current identity and schema are checked before file inspection or credentials.
  await dependencies.validateInput(plan.preview)
  assertCurrent()
  const prepared = await prepareManagedMedia(plan, dependencies, signal, assertCurrent)
  assertCurrent()
  await dependencies.validateInput(plan.preview)
  assertCurrent()

  const api = await dependencies.api()
  assertCurrent()
  const uploaded = new Map<Identity, string>(), urls: string[] = []
  for (const media of prepared) {
    assertCurrent()
    let url = media.source.url
    if (!url) {
      const key = identity(media.source)
      url = uploaded.get(key)
      if (!url) {
        if (!media.bytes?.byteLength || !media.contentType) throw new Error('Higgsfield Reference prepared media is missing its validated local bytes.')
        url = await api.upload(media.bytes, media.contentType, signal)
        assertCurrent()
        assertHiggsfieldPublicUrl(url)
        uploaded.set(key, url)
      }
    }
    urls.push(url)
  }

  const input = materializeHiggsfieldReferenceVideoInput(plan, urls)
  if (Buffer.byteLength(JSON.stringify(input)) > HIGGSFIELD_RESOURCE_LIMITS.wireBytes) throw new Error('Higgsfield Reference inputs exceed Prism’s protected request capacity; generation was not submitted.')
  await dependencies.validateInput(input)
  assertCurrent()
  const output = await api.generate(plan.endpointId, input, signal, plan.inputSchema)
  assertCurrent()
  const saved = await dependencies.persist(output, plan.endpointId, signal)
  assertCurrent()
  return { requestId: output.requestId, modelId: plan.endpointId, outputPath: saved.path, outputUrl: saved.url, outputType: 'video' as const }
}
