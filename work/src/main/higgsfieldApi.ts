import { createHiggsfieldSubmission, validateHiggsfieldSubmission, higgsfieldRequestUrl, type HiggsfieldSubmission } from './higgsfieldSubmission'
import { HIGGSFIELD_API, assertHiggsfieldPublicUrl, higgsfieldModel, higgsfieldWireMediaUrls, validateHiggsfieldWireInput, type HiggsfieldPreset } from '../shared/higgsfieldNative'
import type { FalSchemaNode } from '../shared/falSchemaBinding'
import { validateFalContractValue } from './falSchemaValidation'
export interface HiggsfieldRemoteJob { requestId: string; state: 'queued'|'in_progress'|'unknown'; statusUrl: string; cancelUrl: string }
export class HiggsfieldRemoteJobError extends Error {
  readonly code = 'HIGGSFIELD_REMOTE_JOB_UNCERTAIN'
  constructor(message: string, readonly remoteJob?: HiggsfieldRemoteJob) { super(message); this.name='HiggsfieldRemoteJobError' }
}
export interface HiggsfieldJobObserver {
  beforeSubmit(submission:HiggsfieldSubmission): Promise<void>
  observed(job:HiggsfieldRemoteJob,state:'queued'|'in_progress'|'completed'|'failed'|'nsfw'|'canceled'):Promise<void>
  rejected():Promise<void>
  canceled(job:HiggsfieldRemoteJob):Promise<void>
}
export type HiggsfieldObservedState = 'queued'|'in_progress'|'completed'|'failed'|'nsfw'|'canceled'
export interface HiggsfieldObservedJob { job: HiggsfieldRemoteJob; state: HiggsfieldObservedState; output?: { requestId: string; url: string; contentType?: string } }
export interface HiggsfieldApiDependencies {
  observer?: HiggsfieldJobObserver
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  key: string
  assertCurrent: () => void
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>
  now?: () => number
  progress?: (state: 'queued'|'in_progress') => void
  maxPollMs?: number
}
const object = (value: unknown): value is Record<string,unknown> => Boolean(value&&typeof value==='object'&&!Array.isArray(value))
async function boundedJson(response: Response): Promise<Record<string,unknown>> {
  const declared=Number(response.headers.get('content-length'));if(Number.isFinite(declared)&&declared>2*1024*1024)throw new Error('Higgsfield response exceeds its supported size.')
  if(!response.body)throw new Error('Higgsfield returned an empty response.')
  const reader=response.body.getReader(), chunks:Uint8Array[]=[];let length=0
  try { while(true){const next=await reader.read();if(next.done)break;length+=next.value.byteLength;if(length>2*1024*1024)throw new Error('Higgsfield response exceeds its supported size.');chunks.push(next.value)} }
  catch(error){await reader.cancel().catch(()=>undefined);throw error}finally{reader.releaseLock()}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  let value:unknown;try{value=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new Error('Higgsfield returned malformed JSON.')}
  if(!object(value))throw new Error('Higgsfield returned a malformed response.');return value
}
/** Keep the requested container when both native outputs are returned. */
function completedVideo(current:Record<string,unknown>,requestId:string,format?:'mp4'|'mov'):{requestId:string;url:string;contentType?:string}{
  const file=format==='mov'&&object(current.mov)?current.mov:object(current.video)?current.video:object(current.mov)?current.mov:undefined
  if(!file||typeof file.url!=='string')throw new Error('Higgsfield completed without a generated video.')
  assertHiggsfieldPublicUrl(file.url)
  const expected=format==='mov'?'video/quicktime':format==='mp4'?'video/mp4':file===current.mov?'video/quicktime':undefined
  const declared=file.content_type
  if(declared!==undefined&&(typeof declared!=='string'||!declared.startsWith('video/')||expected&&declared.split(';')[0].trim().toLowerCase()!==expected))throw new Error('Higgsfield returned an incompatible or different requested output type.')
  const contentType=typeof declared==='string'?declared:expected
  return {requestId,url:file.url,...(contentType?{contentType}:{})}
}
function apiFailure(status:number): Error { return Object.assign(new Error(`Higgsfield request failed (${status}). Check this service's access and balance.`),{status}) }
function waitFor(ms:number,signal?:AbortSignal):Promise<void>{return new Promise((resolve,reject)=>{
 signal?.throwIfAborted();const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(signal?.reason??new Error('Stopped waiting.'))};const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve()},ms);signal?.addEventListener('abort',abort,{once:true})
})}
export class HiggsfieldApi {
  constructor(private readonly dependencies:HiggsfieldApiDependencies){
    if(!/^[^\s:]+:[^\s:]+$/.test(dependencies.key))throw new Error('Use the complete Higgsfield KEY_ID:KEY_SECRET credential.')
  }
  private async json(path:string,method:'GET'|'POST',body?:unknown,signal?:AbortSignal,submission?:HiggsfieldSubmission):Promise<Record<string,unknown>>{
    signal?.throwIfAborted();this.dependencies.assertCurrent()
    const response=await this.dependencies.fetch(`${HIGGSFIELD_API}${path}`,{method,redirect:'error',headers:{Authorization:`Key ${this.dependencies.key}`,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(submission?{'Idempotency-Key':submission.idempotencyKey}:{})},...(body!==undefined?{body:submission?.body??JSON.stringify(body)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30_000)]):AbortSignal.timeout(30_000)})
    this.dependencies.assertCurrent();if(!response.ok)throw apiFailure(response.status)
    const value=await boundedJson(response);this.dependencies.assertCurrent();return value
  }
  async presets(signal?:AbortSignal):Promise<HiggsfieldPreset[]>{
    const value=await this.json('/models/higgsfield/genjutsu/restyle/v1.0/presets','GET',undefined,signal)
    if(value.model!=='higgsfield/genjutsu/restyle/v1.0'||!Array.isArray(value.items)||value.items.length>5000)throw new Error('Higgsfield returned an unsupported preset catalog.')
    const ids=new Set<string>();return value.items.map(item=>{
      if(!object(item)||typeof item.id!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>512||ids.has(item.id))throw new Error('Higgsfield returned a malformed preset.');ids.add(item.id)
      if(item.preview_url!==undefined){if(typeof item.preview_url!=='string')throw new Error('Higgsfield returned a malformed preset preview.');assertHiggsfieldPublicUrl(item.preview_url)}
      return {id:item.id,name:item.name,...(typeof item.preview_url==='string'?{previewUrl:item.preview_url}:{})}
    })
  }
  async upload(bytes:Uint8Array,contentType:string,signal?:AbortSignal):Promise<string>{
    if(!bytes.length||!['image/jpeg','image/jpg','image/png','image/webp','image/gif','video/mp4','audio/wav','audio/x-wav'].includes(contentType))throw new Error('Choose a supported Higgsfield upload format.')
    const value=await this.json('/files/generate-upload-url','POST',{content_type:contentType},signal)
    if(typeof value.public_url!=='string'||typeof value.upload_url!=='string'||value.content_type!==contentType||!object(value.upload_headers))throw new Error('Higgsfield returned malformed upload instructions.')
    assertHiggsfieldPublicUrl(value.public_url);assertHiggsfieldPublicUrl(value.upload_url)
    const headers:Record<string,string>={};if(Object.keys(value.upload_headers).length>64)throw new Error('Higgsfield returned too many upload headers.')
    for(const [name,header] of Object.entries(value.upload_headers)){
      if(!/^[A-Za-z0-9-]+$/.test(name)||typeof header!=='string'||header.length>8192||/[\r\n]/.test(header)||header.includes(this.dependencies.key)||/^(?:cookie|host|proxy-authorization)$/i.test(name))throw new Error('Higgsfield returned unsafe upload headers.')
      headers[name]=header
    }
    if(Object.entries(headers).find(([name])=>name.toLowerCase()==='content-type')?.[1]!==contentType)throw new Error('Higgsfield upload content type changed.')
    signal?.throwIfAborted();this.dependencies.assertCurrent()
    const response=await this.dependencies.fetch(value.upload_url,{method:'PUT',redirect:'error',headers,body:bytes as BodyInit,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120_000)]):AbortSignal.timeout(120_000)})
    this.dependencies.assertCurrent();signal?.throwIfAborted();if(!response.ok)throw new Error(`Higgsfield storage upload failed (${response.status}).`)
    return value.public_url
  }
  private job(value:Record<string,unknown>,previous?:HiggsfieldRemoteJob):HiggsfieldRemoteJob{
    if(typeof value.request_id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(value.request_id)||previous&&value.request_id!==previous.requestId)throw new Error('Higgsfield request identity changed or is malformed.')
    if(!['queued','in_progress','completed','failed','nsfw','canceled'].includes(String(value.status)))throw new Error('Higgsfield returned an unknown request status.')
    const statusUrl=higgsfieldRequestUrl((value.status_url===undefined?previous?.statusUrl??`${HIGGSFIELD_API}/requests/${value.request_id}/status`:value.status_url),value.request_id,'status')
    const cancelUrl=higgsfieldRequestUrl((value.cancel_url===undefined?previous?.cancelUrl??`${HIGGSFIELD_API}/requests/${value.request_id}/cancel`:value.cancel_url),value.request_id,'cancel')
    if(previous&&(statusUrl!==previous.statusUrl||cancelUrl!==previous.cancelUrl))throw new Error('Higgsfield returned a changed request URL.')
    return {requestId:value.request_id,state:value.status==='queued'?'queued':value.status==='in_progress'?'in_progress':'unknown',statusUrl,cancelUrl}
  }
  async status(identity:string|HiggsfieldRemoteJob,signal?:AbortSignal,format?:'mp4'|'mov'):Promise<HiggsfieldObservedJob>{
    const requestId=typeof identity==='string'?identity:identity.requestId
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(requestId))throw new Error('Invalid Higgsfield remote request identity.')
    const previous=typeof identity==='string'?{requestId,state:'unknown' as const,statusUrl:`${HIGGSFIELD_API}/requests/${requestId}/status`,cancelUrl:`${HIGGSFIELD_API}/requests/${requestId}/cancel`}:identity
    higgsfieldRequestUrl(previous.statusUrl,requestId,'status');higgsfieldRequestUrl(previous.cancelUrl,requestId,'cancel')
    const current=await this.json(previous.statusUrl.slice(HIGGSFIELD_API.length),'GET',undefined,signal)
    const job=this.job(current,previous),state=current.status as HiggsfieldObservedState
    if(state!=='completed')return {job,state}
    return {job,state,output:completedVideo(current,requestId,format)}
  }
  async cancel(job:HiggsfieldRemoteJob):Promise<boolean>{
    // Cancellation is cleanup for the original owner only, never a replacement profile.
    higgsfieldRequestUrl(job.cancelUrl,job.requestId,'cancel');higgsfieldRequestUrl(job.statusUrl,job.requestId,'status')
    this.dependencies.assertCurrent();const response=await this.dependencies.fetch(job.cancelUrl,{method:'POST',redirect:'error',headers:{Authorization:`Key ${this.dependencies.key}`},signal:AbortSignal.timeout(10_000)});this.dependencies.assertCurrent();return response.status===202
  }
  /** Explicit recovery only: same protected endpoint/body/key; no upload, new key or automatic retry. */
  async recoverSubmission(value:HiggsfieldSubmission,signal?:AbortSignal):Promise<HiggsfieldRemoteJob> {
    const submission=validateHiggsfieldSubmission(value)
    signal?.throwIfAborted();this.dependencies.assertCurrent()
    try {
      const current=await this.json(`/${submission.endpointId}`,'POST',JSON.parse(submission.body),signal,submission)
      // Replay is an acceptance receipt, not a claim about current terminal status. Recovery polls only after storing it.
      return this.job(current)
    }catch{throw new HiggsfieldRemoteJobError('The original Higgsfield submission could not be reconciled. Its identity is preserved; check the original dashboard before another Run.')}
  }
  async generate(endpointId:string,authoredInput:Record<string,unknown>,signal?:AbortSignal,inputSchema?:FalSchemaNode):Promise<{requestId:string;url:string;contentType?:string}>{
    higgsfieldModel(endpointId);signal?.throwIfAborted();this.dependencies.assertCurrent()
    const input=structuredClone(authoredInput)
    if(inputSchema){await validateFalContractValue(inputSchema,input);signal?.throwIfAborted();this.dependencies.assertCurrent()}
    else validateHiggsfieldWireInput(endpointId,input)
    for(const url of higgsfieldWireMediaUrls(endpointId,input,inputSchema))assertHiggsfieldPublicUrl(url as string)
    const submission=createHiggsfieldSubmission(endpointId,input)
    await this.dependencies.observer?.beforeSubmit(submission)
    let current:Record<string,unknown>,job:HiggsfieldRemoteJob|undefined
    try{current=await this.json(`/${endpointId}`,'POST',input,signal,submission)}catch(error){
      if(object(error)&&typeof error.status==='number'&&error.status<500&&error.status!==408&&error.status!==422){await this.dependencies.observer?.rejected();throw error}
      throw new HiggsfieldRemoteJobError('Higgsfield submission status is unknown. Do not automatically repeat this request; check the provider dashboard.')
    }
    try{
      job=this.job(current);await this.dependencies.observer?.observed(job,current.status as 'queued'|'in_progress'|'completed'|'failed'|'nsfw'|'canceled');const started=(this.dependencies.now??Date.now)(),max=this.dependencies.maxPollMs??20*60_000
      while(true){
        signal?.throwIfAborted();this.dependencies.assertCurrent()
        if(current.status==='completed'){
          return completedVideo(current,job.requestId,input.output_format==='mov'?'mov':input.output_format==='mp4'?'mp4':undefined)
        }
        if(['failed','nsfw','canceled'].includes(String(current.status)))throw Object.assign(new Error(`Higgsfield request ${job.requestId} ended ${current.status}.`),{terminal:true})
        this.dependencies.progress?.(job.state==='queued'?'queued':'in_progress')
        if((this.dependencies.now??Date.now)()-started>=max)throw new Error('Local polling timed out.')
        await (this.dependencies.wait??waitFor)(2000,signal);signal?.throwIfAborted();this.dependencies.assertCurrent()
        current=await this.json(job.statusUrl.slice(HIGGSFIELD_API.length),'GET',undefined,signal);job=this.job(current,job);await this.dependencies.observer?.observed(job,current.status as 'queued'|'in_progress'|'completed'|'failed'|'nsfw'|'canceled')
      }
    }catch(error){
      if(object(error)&&error.terminal===true)throw error
      let canceled=false
      if(signal?.aborted&&job)try{canceled=await this.cancel(job)}catch{/* Preserve uncertain remote state. */}
      if(canceled){await this.dependencies.observer?.canceled(job!);throw Object.assign(new Error(`Higgsfield queued request ${job!.requestId} was canceled.`),{name:'AbortError',remoteCanceled:true})}
      throw new HiggsfieldRemoteJobError(job?`Stopped local waiting for Higgsfield request ${job.requestId}; remote work may continue. Check the provider dashboard before retrying.`:'Higgsfield accepted an unresolved request. Check the provider dashboard before retrying.',job)
    }
  }
}
