import { planHiggsfieldInput, materializeHiggsfieldInput, higgsfieldModel, type HiggsfieldNativeRequest, type HiggsfieldMediaSource } from '../shared/higgsfieldNative'
import { HiggsfieldApi } from './higgsfieldApi'
export interface HiggsfieldPreparedMedia { source: HiggsfieldMediaSource; bytes?: Uint8Array; contentType?: string; videoInfo?: { duration: number; width: number; height: number } }
export interface HiggsfieldGenerationDependencies {
  assertCurrent: () => void
  prepare: (source: HiggsfieldMediaSource, signal?: AbortSignal) => Promise<HiggsfieldPreparedMedia>
  /** Current public contract owner validates materialized URLs before the paid submission. */
  validateInput?: (input: unknown) => Promise<void>
  api: () => Promise<HiggsfieldApi>
  persist: (output: { requestId: string; url: string; contentType?: string }, endpointId: string, signal?: AbortSignal) => Promise<{ path: string; url: string }>
}
/** All type/count/managed-file/metadata checks precede client credentials and upload. */
export async function executeHiggsfieldGeneration(request: HiggsfieldNativeRequest, dependencies: HiggsfieldGenerationDependencies, signal?: AbortSignal) {
  const assertCurrent=()=>{signal?.throwIfAborted();dependencies.assertCurrent()}
  assertCurrent();const plan=planHiggsfieldInput(request),model=higgsfieldModel(plan.endpointId),prepared:HiggsfieldPreparedMedia[]=[]
  if(model.kind!=='genjutsu')throw new Error('Use the mode-owned Seedance executor for this route.')
  for(const source of [plan.video,...plan.images]){
    const media=await dependencies.prepare(source,signal);assertCurrent()
    if(media.source.mediaType!==source.mediaType||Boolean(media.source.path)!==Boolean(source.path)||media.source.url!==source.url)throw new Error('Higgsfield prepared media changed its type or transport.')
    if(source.path){
      const max=source.mediaType==='video'?200*1024*1024:64*1024*1024
      if(!media.source.path||!media.bytes?.length||media.bytes.length>max||!media.contentType||(source.mediaType==='video'?media.contentType!=='video/mp4':!['image/jpeg','image/png','image/webp','image/gif'].includes(media.contentType)))throw new Error('Higgsfield managed media exceeds its supported format or size.')
      if(source.mediaType==='video'){
        const info=media.videoInfo
        if(!info||!Number.isFinite(info.duration)||info.duration<4||!Number.isSafeInteger(info.width)||info.width<1||!Number.isSafeInteger(info.height)||info.height<1)throw new Error('Genjutsu needs a decodable source video of at least 4 seconds.')
        if(info.width*info.height<model.minimumPixels)throw new Error('Genjutsu Object Swap requires at least 409600 source pixels per frame.')
        if(info.duration>30&&!plan.allowSourceTrimming)throw new Error('Genjutsu will trim this source to its first 30 seconds. Trim it first or explicitly confirm source trimming.')
      }
    }else if(media.bytes||media.contentType||media.videoInfo)throw new Error('Remote Higgsfield sources cannot substitute renderer-provided metadata or bytes.')
    prepared.push(media)
  }
  // Snapshots are checked again after preparation; caller changes cannot alter submitted values.
  assertCurrent();const api=await dependencies.api();assertCurrent()
  if(model.minImages===0){const presets=await api.presets(signal);assertCurrent();if(!presets.some(preset=>preset.id===plan.values.preset_id))throw new Error('The saved Higgsfield preset is no longer available. Refresh and select a current style; the saved ID was preserved.')}
  const uploaded=new Map<string,string>(),urls:string[]=[]
  for(const media of prepared){
    assertCurrent();let url=media.source.url
    if(!url){url=uploaded.get(media.source.path!);if(!url){url=await api.upload(media.bytes!,media.contentType!,signal);assertCurrent();uploaded.set(media.source.path!,url)}}
    urls.push(url)
  }
  const input=materializeHiggsfieldInput(plan,urls[0],urls.slice(1));assertCurrent()
  await dependencies.validateInput?.(input);assertCurrent()
  // A removed preset cannot silently fall back after a long upload.
  if(model.minImages===0){const presets=await api.presets(signal);assertCurrent();if(!presets.some(preset=>preset.id===input.preset_id))throw new Error('Higgsfield preset changed during preparation. Review the preserved style before generating.')}
  const output=await api.generate(plan.endpointId,input,signal);assertCurrent()
  const saved=await dependencies.persist(output,plan.endpointId,signal);assertCurrent()
  return {requestId:output.requestId,modelId:plan.endpointId,outputPath:saved.path,outputUrl:saved.url,outputType:'video' as const}
}
