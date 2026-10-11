import {
  materializeHiggsfieldTextVideoInput, planHiggsfieldTextVideoInput,
  type HiggsfieldTextVideoInputPlan,
} from '../shared/higgsfieldTextVideo'
import type { HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import type { FalSchemaNode } from '../shared/falSchemaBinding'
import { assertHiggsfieldPublicUrl } from '../shared/higgsfieldPublicUrl'
import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'
import type { HiggsfieldApi } from './higgsfieldApi'

export interface HiggsfieldTextVideoGenerationDependencies {
  /** Must be the active main-owned model contract, never a renderer-supplied schema. */
  inputSchema: FalSchemaNode
  assertCurrent(): void
  /** Re-reads and validates against the current owner, before credentials and before submission. */
  validateInput(input: unknown): Promise<void>
  /** The API instance is lazy so missing/stale contracts fail before credentials are opened. */
  api(): Promise<Pick<HiggsfieldApi,'generate'>>
  persist(output: {requestId:string;url:string;contentType?:string}, endpointId:string, signal?:AbortSignal): Promise<{path:string;url:string}>
}

function assertOutput(output: unknown): asserts output is {requestId:string;url:string;contentType?:string} {
  if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error('Higgsfield completed without a supported generated video receipt.')
  const value = output as Record<string,unknown>
  if (Object.keys(value).some(key => !['requestId','url','contentType'].includes(key)) || typeof value.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.requestId) || typeof value.url !== 'string') throw new Error('Higgsfield completed without a supported generated video receipt.')
  if (value.contentType !== undefined && (typeof value.contentType !== 'string' || !value.contentType.toLowerCase().startsWith('video/'))) throw new Error('Higgsfield returned a non-video output type.')
  assertHiggsfieldPublicUrl(value.url)
}

/** Independent zero-media T2V lane. Registry, job journaling and IPC dispatch remain main-owned. */
export async function executeHiggsfieldTextVideoGeneration(
  native: HiggsfieldNativeRequest,
  dependencies: HiggsfieldTextVideoGenerationDependencies,
  signal?: AbortSignal,
) {
  const snapshot = structuredClone(native)
  const assertCurrent = () => { signal?.throwIfAborted(); dependencies.assertCurrent() }
  assertCurrent()
  if (!dependencies.inputSchema) throw new Error('The current main-owned Higgsfield text-to-video schema is required before generation.')
  const plan: HiggsfieldTextVideoInputPlan = planHiggsfieldTextVideoInput(snapshot, dependencies.inputSchema)
  if (plan.fingerprint !== snapshot.fingerprint) throw new Error('The current Higgsfield schema fingerprint changed. Review the preserved values before generating.')
  const input = materializeHiggsfieldTextVideoInput(plan)
  if (Buffer.byteLength(JSON.stringify(input)) > HIGGSFIELD_RESOURCE_LIMITS.wireBytes) throw new Error('Higgsfield text-to-video inputs exceed Prism’s protected request capacity; authored values were preserved.')

  // Check the active owner before opening an API instance that may read credentials.
  await dependencies.validateInput(input)
  assertCurrent()
  const api = await dependencies.api()
  assertCurrent()
  // The API's own generate path validates with this same current schema before its protected POST.
  await dependencies.validateInput(input)
  assertCurrent()
  const output = await api.generate(plan.endpointId, input, signal, plan.inputSchema)
  assertOutput(output)
  assertCurrent()
  const saved = await dependencies.persist(output, plan.endpointId, signal)
  assertCurrent()
  if (!saved || typeof saved.path !== 'string' || !saved.path || typeof saved.url !== 'string' || !saved.url) throw new Error('Prism did not return a durable Higgsfield output receipt.')
  return { requestId: output.requestId, modelId: plan.endpointId, outputPath: saved.path, outputUrl: saved.url, outputType: 'video' as const }
}
