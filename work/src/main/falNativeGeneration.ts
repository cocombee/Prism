import { falNativeCompiledPromptErrors, SeedancePromptIntegrityError } from '../shared/seedancePromptIntegrity'
import { assertFalMediaUrl, extractFalNativeOutputs, materializeFalNativeInput, planFalNativeExecution, type FalNativeMediaSource, type FalNativeOutput, type FalNativeRequest } from '../shared/falNativeExecution'
import type { FalSchemaContract } from '../shared/falSchemaBinding'
import type { FalMediaType } from '../shared/falRuntimeInputs'
import type { NodeKind } from '../shared/types'
import { validateFalContractValue } from './falSchemaValidation'

export interface FalNativeGenerationDependencies<Client> {
  contract(endpointId: string): Promise<FalSchemaContract>
  assertCurrent(): void
  prepareSource(source: FalNativeMediaSource, expectedType: FalMediaType, maximumBytes?: number): Promise<FalNativeMediaSource>
  client(): Promise<Client>
  upload(client: Client, path: string): Promise<string>
  submit(client: Client, endpointId: string, input: Record<string, unknown>, signal?: AbortSignal): Promise<{ requestId: string; data: unknown }>
  persist(output: FalNativeOutput, endpointId: string, signal?: AbortSignal, data?: unknown): Promise<{ path: string; url: string }>
}
export interface FalNativeGenerationResult {
  requestId: string
  modelId: string
  outputs: Array<{ path: string; url: string; type: FalMediaType }>
  primaryIndex: number
}

/** Contract-owned execution; the renderer supplies values, not executable code or a schema. */
export async function executeFalNativeGeneration<Client>(request: FalNativeRequest, kind: NodeKind, dependencies: FalNativeGenerationDependencies<Client>, signal?: AbortSignal): Promise<FalNativeGenerationResult> {
  const promptErrors = falNativeCompiledPromptErrors(request)
  if (promptErrors.length) throw new SeedancePromptIntegrityError(promptErrors)
  const assertCurrent = () => { signal?.throwIfAborted(); dependencies.assertCurrent() }
  assertCurrent()
  const contract = await dependencies.contract(request.endpointId)
  assertCurrent()
  let plan = planFalNativeExecution(contract, request, kind)
  // Mixed local/remote arrays must not defer syntax checks for their remote entries.
  for (const binding of plan.media) {
    const remote = binding.sources.filter(source => source.url)
    if (!remote.length) continue
    const mediaSchema = binding.field.schema
    if (!binding.field.media!.multiple) await validateFalContractValue(mediaSchema, remote[0].url, binding.field.key)
    else {
      const itemSchemas = arrayItemSchemas(mediaSchema)
      for (const source of remote) await validateFalContractValue({ allOf: itemSchemas }, source.url, binding.field.key)
    }
    assertCurrent()
  }
  await validateFalContractValue(plan.preflightSchema, plan.preflightInput)
  assertCurrent()
  // Validate every managed path/type before creating a client or uploading the first file.
  const prepared: FalNativeMediaSource[][] = []
  for (const binding of plan.media) {
    const sources: FalNativeMediaSource[] = []
    for (const source of binding.sources) {
      const resolved = await dependencies.prepareSource(source, binding.field.media!.type, binding.field.media!.maximumBytes)
      assertCurrent()
      if (resolved.mediaType !== source.mediaType || Boolean(resolved.path) !== Boolean(source.path) || resolved.url !== source.url) throw new Error('Prepared media binding changed its type or transport.')
      sources.push(resolved)
    }
    prepared.push(sources)
  }
  // Canonical managed paths can reveal two aliases for the same file. Check
  // schema uniqueness again before the first client/upload, without dropping either occurrence.
  plan = planFalNativeExecution(contract, { ...request, media: Object.fromEntries(plan.media.map((binding, index) => [binding.field.key, prepared[index]])) }, kind)
  await validateFalContractValue(plan.preflightSchema, plan.preflightInput)
  assertCurrent()
  const client = await dependencies.client()
  assertCurrent()
  const uploaded = new Map<string, string>(), urls: string[][] = []
  for (const sources of prepared) {
    const values: string[] = []
    for (const source of sources) {
      let url = source.url
      if (!url) {
        url = uploaded.get(source.path!)
        if (!url) {
          assertCurrent(); url = await dependencies.upload(client, source.path!); assertCurrent(); assertFalMediaUrl(url)
          uploaded.set(source.path!, url)
        }
      }
      values.push(url)
    }
    urls.push(values)
  }
  const input = materializeFalNativeInput(plan, urls)
  await validateFalContractValue(contract.input, input)
  assertCurrent()
  // Uploads may outlive the discovery TTL; a changed contract requires review.
  const currentContract = await dependencies.contract(plan.endpointId)
  assertCurrent()
  if (currentContract.endpointId !== plan.endpointId || currentContract.runtime?.fingerprint !== contract.runtime?.fingerprint) throw new Error('Model contract changed during preparation. Review the preserved inputs before generation.')
  const result = await dependencies.submit(client, plan.endpointId, input, signal)
  assertCurrent()
  await validateFalContractValue(contract.output, result.data, 'Output')
  assertCurrent()
  const outputs = extractFalNativeOutputs(plan, result.data)
  const saved: FalNativeGenerationResult['outputs'] = []
  for (const output of outputs) {
    const persisted = await dependencies.persist(output, plan.endpointId, signal, result.data)
    assertCurrent()
    saved.push({ ...persisted, type: output.type })
  }
  const primaryIndex = saved.reduce((index, output, current) => output.type === plan.outputType ? current : index, -1)
  return { requestId: result.requestId, modelId: plan.endpointId, outputs: saved, primaryIndex }
}

function arrayItemSchemas(schema: FalSchemaContract['input']): FalSchemaContract['input'][] {
  const nullable = (schema.anyOf || []).filter(item => item.type !== 'null')
  return [...(schema.items ? [schema.items] : []), ...(schema.allOf || []).flatMap(arrayItemSchemas), ...(nullable.length === 1 && schema.anyOf?.some(item => item.type === 'null') ? arrayItemSchemas(nullable[0]) : [])]
}
