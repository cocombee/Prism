import {
  planHiggsfieldSeedanceInput, type HiggsfieldSeedanceInputRequest,
} from '../shared/higgsfieldSeedanceInput'
import { assertHiggsfieldPublicUrl } from '../shared/higgsfieldNative'
import {
  prepareHiggsfieldSeedanceMedia, materializePreparedHiggsfieldSeedance,
  type HiggsfieldSeedancePreparationDependencies,
} from './higgsfieldSeedancePreparation'
import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'
import type { HiggsfieldApi } from './higgsfieldApi'

export interface HiggsfieldSeedanceGenerationDependencies extends HiggsfieldSeedancePreparationDependencies {
  /** Required: current account/project-owned model input, never only the fixture. */
  validateInput: (input:unknown) => Promise<void>
  /** Caller installs the existing protected beforeSubmit/job observer. */
  api: () => Promise<Pick<HiggsfieldApi,'upload'|'generate'>>
  persist: (output:{requestId:string;url:string;contentType?:string},endpointId:string,signal?:AbortSignal) => Promise<{path:string;url:string}>
}

/** Mode-owned executor foundation. Registry, protected journal and main/renderer
 * dispatch must be integrated before any new route is declared runnable. */
export async function executeHiggsfieldSeedanceGeneration(
  request:HiggsfieldSeedanceInputRequest,dependencies:HiggsfieldSeedanceGenerationDependencies,signal?:AbortSignal,
) {
  const assertCurrent=()=>{signal?.throwIfAborted();dependencies.assertCurrent()}
  assertCurrent()
  if(request.fingerprint!==undefined&&!dependencies.inputSchema)throw new Error('The current Higgsfield schema must be owned by main before generation.')
  const plan=planHiggsfieldSeedanceInput(request,dependencies.inputSchema),snapshot=structuredClone(request)
  if(Buffer.byteLength(JSON.stringify(plan.preview))>HIGGSFIELD_RESOURCE_LIMITS.wireBytes)throw new Error('Higgsfield Seedance inputs exceed Prism’s protected request capacity; authored values were preserved.')
  await dependencies.validateInput(plan.preview)
  assertCurrent()
  const prepared=await prepareHiggsfieldSeedanceMedia(snapshot,dependencies,signal)
  assertCurrent()
  // Preparation may be long. Recheck the fresh owner before opening a client.
  await dependencies.validateInput(prepared.plan.preview)
  assertCurrent()
  const api=await dependencies.api()
  assertCurrent()
  const uploaded=new Map<object,string>(),urls:string[]=[]
  for(const media of prepared.media) {
    assertCurrent()
    let url=media.source.url || uploaded.get(media)
    if(!url) {
      url=await api.upload(media.bytes!,media.contentType!,signal)
      assertCurrent()
      assertHiggsfieldPublicUrl(url)
      uploaded.set(media,url)
    }
    urls.push(url)
  }
  const input=materializePreparedHiggsfieldSeedance(prepared,urls)
  if(Buffer.byteLength(JSON.stringify(input))>HIGGSFIELD_RESOURCE_LIMITS.wireBytes)throw new Error('Higgsfield Seedance materialized inputs exceed Prism’s protected request capacity; generation was not submitted.')
  await dependencies.validateInput(input)
  assertCurrent()
  const output=dependencies.inputSchema ? await api.generate(plan.endpointId,input,signal,dependencies.inputSchema) : await api.generate(plan.endpointId,input,signal)
  assertCurrent()
  const saved=await dependencies.persist(output,plan.endpointId,signal)
  assertCurrent()
  return {requestId:output.requestId,modelId:plan.endpointId,outputPath:saved.path,outputUrl:saved.url,outputType:'video' as const}
}
