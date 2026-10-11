import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'
import type { HiggsfieldMovieMime } from './higgsfieldMovieContainer'
import { validateHiggsfieldSubmission, higgsfieldRequestUrl, type HiggsfieldSubmission } from './higgsfieldSubmission'
import { createHash } from 'node:crypto'
import { materializeHiggsfieldNativeInput, planHiggsfieldNativeInput, validateHiggsfieldWireInput, type HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import type { HiggsfieldJobScope } from '../shared/higgsfieldJobs'
import type { FalSchemaNode } from '../shared/falSchemaBinding'
import type { HiggsfieldJobObserver, HiggsfieldRemoteJob } from './higgsfieldApi'
import { HiggsfieldRemoteJobError } from './higgsfieldApi'
import { HiggsfieldJobStore, type HiggsfieldJobRecord } from './higgsfieldJobStore'

function canonical(value: unknown): string {
  if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if(value && typeof value==='object') return `{${Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')}}`
  return JSON.stringify(value)
}
export function higgsfieldJobSnapshot(request: HiggsfieldNativeRequest, inputSchema?:FalSchemaNode): HiggsfieldNativeRequest {
  if(request.fingerprint!==undefined&&!inputSchema)throw new Error('The current Higgsfield schema must be owned by main before creating a new job snapshot.')
  const plan=planHiggsfieldNativeInput(request,inputSchema)
  const source = (item: import('../shared/higgsfieldNative').HiggsfieldMediaSource) => ({ ...(item.path ? { path: item.path } : { url: item.url! }), mediaType: item.mediaType })
  if(plan.kind!=='genjutsu'){
    const media:HiggsfieldNativeRequest['media']={}
    for(const slot of plan.slots)(media[slot.field]||=([])).push(source(slot.source))
    return {endpointId:plan.endpointId,contractRevision:request.contractRevision,...(request.fingerprint!==undefined?{fingerprint:request.fingerprint}:{}),values:structuredClone(plan.values),media}
  }
  return {endpointId:plan.endpointId,contractRevision:request.contractRevision,values:plan.values,media:{video_url:[source(plan.video)],image_urls:plan.images.map(source)},allowSourceTrimming:plan.allowSourceTrimming}
}
function snapshotDigest(snapshot: HiggsfieldNativeRequest): string { return createHash('sha256').update(canonical(snapshot)).digest('hex') }
export function higgsfieldJobFingerprint(request: HiggsfieldNativeRequest,inputSchema?:FalSchemaNode): string { return snapshotDigest(higgsfieldJobSnapshot(request,inputSchema)) }
interface HiggsfieldJobEnvelope {
 schemaVersion:1|2;scope:HiggsfieldJobScope;profileId:string;fingerprint:string;request:HiggsfieldNativeRequest
 id?:string;credentialId?:string;requestId?:string;submission?:HiggsfieldSubmission;remoteJob?:HiggsfieldRemoteJob;outputReceipt?:HiggsfieldOutputReceipt
}
function sealEnvelope(envelope:HiggsfieldJobEnvelope,encrypt:(value:string)=>Buffer):string {
 const body=JSON.stringify(envelope)
 if(Buffer.byteLength(body)>HIGGSFIELD_RESOURCE_LIMITS.requestEnvelopeBytes)throw new Error('The protected Higgsfield request exceeds its supported size.')
 return encrypt(body).toString('base64')
}
function submissionMatches(snapshot:HiggsfieldNativeRequest,value:HiggsfieldSubmission,inputSchema?:FalSchemaNode):HiggsfieldSubmission {
 const submission=validateHiggsfieldSubmission(value),body=JSON.parse(submission.body),plan=planHiggsfieldNativeInput(snapshot,inputSchema)
 if(submission.endpointId!==snapshot.endpointId)throw new Error('The Higgsfield submission no longer matches its original request.')
 if(!inputSchema)validateHiggsfieldWireInput(submission.endpointId,body)
 const slots=plan.kind!=='genjutsu'?plan.slots:[{field:'video_url',index:0,source:plan.video},...plan.images.map((source,index)=>({field:'image_urls',index,source}))]
 const urls=slots.map(slot=>Array.isArray(body[slot.field])?body[slot.field][slot.index]:body[slot.field])
 const expected=materializeHiggsfieldNativeInput(plan,urls)
 if(canonical(body)!==canonical(expected)||slots.some((slot,index)=>slot.source.url&&slot.source.url!==urls[index]))throw new Error('The Higgsfield submission no longer matches its original request.')
 return submission
}
export async function beginHiggsfieldJob(store:HiggsfieldJobStore,scope:HiggsfieldJobScope,profileId:string,request:HiggsfieldNativeRequest,encrypt:(value:string)=>Buffer,inputSchema?:FalSchemaNode) {
 const ownedSchema=inputSchema?structuredClone(inputSchema):undefined
 const snapshot=higgsfieldJobSnapshot(request,ownedSchema),fingerprint=snapshotDigest(snapshot)
 let submission:HiggsfieldSubmission|undefined,remoteJob:HiggsfieldRemoteJob|undefined
 const seal=(extra:{id?:string;credentialId?:string;requestId?:string}={})=>sealEnvelope({schemaVersion:2,scope:{...scope},profileId,fingerprint,request:snapshot,...(submission?{submission}:{}),...(remoteJob?{remoteJob}:{}),...extra},encrypt)
 const record=await store.prepare(scope,{endpointId:request.endpointId,profileId,fingerprint,sealedRequest:seal()})
 return {
  record,
  observer(credentialId:string):HiggsfieldJobObserver {return {
   beforeSubmit:async value=>{submission=submissionMatches(snapshot,value,ownedSchema);await store.submitting(scope,record.id,credentialId,seal({id:record.id,credentialId}))},
   observed:async(job,state)=>{if(!submission)throw new Error('The original Higgsfield wire receipt must be durable before acceptance.');remoteJob=validateRemoteJob(job);await store.observed(scope,record.id,job.requestId,state,seal({id:record.id,credentialId,requestId:job.requestId}))},
   rejected:async()=>{await store.rejected(scope,record.id)},
   canceled:async job=>{if(!submission)throw new Error('The original Higgsfield wire receipt must be durable before acceptance.');remoteJob=validateRemoteJob(job);await store.observed(scope,record.id,job.requestId,'canceled',seal({id:record.id,credentialId,requestId:job.requestId}))},
  }},
  failed:async(error:unknown)=>{const current=await store.get(scope,record.id);if(error instanceof HiggsfieldRemoteJobError||current.state==='submitting'||current.state==='queued'||current.state==='in_progress')await store.unknown(scope,record.id);else if(current.state==='prepared')await store.rejected(scope,record.id)},
  persisted:async(outputPath:string)=>{await store.persisted(scope,record.id,outputPath)},
 }
}
function validateRemoteJob(job:HiggsfieldRemoteJob):HiggsfieldRemoteJob {
 if(!job||typeof job!=='object'||Array.isArray(job)||Object.keys(job).some(key=>!['requestId','state','statusUrl','cancelUrl'].includes(key))||!['queued','in_progress','unknown'].includes(job.state))throw new Error('The protected Higgsfield remote identity is invalid.')
 higgsfieldRequestUrl(job.statusUrl,job.requestId,'status');higgsfieldRequestUrl(job.cancelUrl,job.requestId,'cancel')
 return {...job}
}
function openEnvelope(record:HiggsfieldJobRecord,decrypt:(value:Buffer)=>string):HiggsfieldJobEnvelope {
 let envelope:HiggsfieldJobEnvelope
 try{const text=decrypt(Buffer.from(record.sealedRequest,'base64'));if(Buffer.byteLength(text)>HIGGSFIELD_RESOURCE_LIMITS.requestEnvelopeBytes)throw new Error('Snapshot bound');envelope=JSON.parse(text)}catch{throw new Error('The original protected request cannot be recovered. Review the provider dashboard; do not repeat it automatically.')}
 if(![1,2].includes(envelope?.schemaVersion)||Object.keys(envelope).some(key=>!['schemaVersion','scope','profileId','fingerprint','request','id','credentialId','requestId','submission','remoteJob','outputReceipt'].includes(key))||!envelope.scope||['projectId','rootPath','documentPath','nodeId'].some(key=>envelope.scope[key as keyof HiggsfieldJobScope]!==record[key as keyof HiggsfieldJobScope])||envelope.profileId!==record.profileId||envelope.fingerprint!==record.fingerprint||envelope.id!==undefined&&envelope.id!==record.id||envelope.credentialId!==record.credentialId||envelope.requestId!==record.requestId)throw new Error('The protected original request no longer matches its job owner or accepted identity. Preserve it for review.')
 if(record.outputDigest!==undefined&&(!envelope.outputReceipt||envelope.outputReceipt.path!==record.outputPath||envelope.outputReceipt.digest!==record.outputDigest||envelope.outputReceipt.bytes!==record.outputBytes||envelope.outputReceipt.contentType!==record.outputContentType))throw new Error('The protected output receipt no longer matches this job. Preserve it for review.')
 const snapshot=envelope.request
 // Historical accepted work is never revalidated as a NEW submission under a changed contract.
 if(!snapshot||snapshot.endpointId!==record.endpointId||(!snapshot.values||typeof snapshot.values!=='object'||Array.isArray(snapshot.values)||snapshot.values.prompt!==undefined&&typeof snapshot.values.prompt!=='string')||snapshotDigest(snapshot)!==record.fingerprint)throw new Error('The protected original request no longer matches its durable job. Preserve it for review.')
 if(envelope.schemaVersion===2){
  if(record.credentialId&&!envelope.submission||record.requestId&&!envelope.remoteJob)throw new Error('The protected Higgsfield submission receipt is missing. Preserve it for review.')
  if(envelope.submission&&validateHiggsfieldSubmission(envelope.submission).endpointId!==record.endpointId)throw new Error('The protected Higgsfield submission route changed.')
  if(envelope.remoteJob&&validateRemoteJob(envelope.remoteJob).requestId!==record.requestId)throw new Error('The protected Higgsfield remote identity changed.')
 }else if(envelope.submission!==undefined||envelope.remoteJob!==undefined)throw new Error('A historical Higgsfield request cannot acquire a new replay identity.')
 return envelope
}
export function openHiggsfieldJobSnapshot(record:HiggsfieldJobRecord,decrypt:(value:Buffer)=>string):HiggsfieldNativeRequest {return openEnvelope(record,decrypt).request}
export function openHiggsfieldSubmission(record:HiggsfieldJobRecord,decrypt:(value:Buffer)=>string):HiggsfieldSubmission|undefined {return openEnvelope(record,decrypt).submission}
export function openHiggsfieldRemoteJob(record:HiggsfieldJobRecord,decrypt:(value:Buffer)=>string):HiggsfieldRemoteJob|undefined {return openEnvelope(record,decrypt).remoteJob}
/** Bind a reconciled acceptance receipt before status/output work, retaining the original immutable submission. */
export function sealHiggsfieldRemoteJob(record:HiggsfieldJobRecord,job:HiggsfieldRemoteJob,decrypt:(value:Buffer)=>string,encrypt:(value:string)=>Buffer):string {
 const envelope=openEnvelope(record,decrypt),remoteJob=validateRemoteJob(job)
 if(record.requestId&&record.requestId!==remoteJob.requestId||envelope.remoteJob&&(envelope.remoteJob.statusUrl!==remoteJob.statusUrl||envelope.remoteJob.cancelUrl!==remoteJob.cancelUrl))throw new Error('The protected Higgsfield remote identity changed.')
 return sealEnvelope({...envelope,requestId:remoteJob.requestId,...(envelope.schemaVersion===2?{remoteJob}:{} )},encrypt)
}

export interface HiggsfieldOutputReceipt {path:string;digest:string;bytes:number;contentType:HiggsfieldMovieMime}
export function sealHiggsfieldOutputReceipt(record:HiggsfieldJobRecord,receipt:HiggsfieldOutputReceipt,decrypt:(value:Buffer)=>string,encrypt:(value:string)=>Buffer):string {
 openHiggsfieldJobSnapshot(record,decrypt)
 const envelope=JSON.parse(decrypt(Buffer.from(record.sealedRequest,'base64')))
 return sealEnvelope({...envelope,outputReceipt:receipt},encrypt)
}

export function relocateHiggsfieldJobEnvelope(record:HiggsfieldJobRecord,scope:HiggsfieldJobScope,decrypt:(value:Buffer)=>string,encrypt:(value:string)=>Buffer):string {
 openHiggsfieldJobSnapshot(record,decrypt)
 if(record.projectId!==scope.projectId||record.nodeId!==scope.nodeId||record.rootPath!==scope.rootPath)throw new Error('This remote job cannot silently move to another project root.')
 const envelope=JSON.parse(decrypt(Buffer.from(record.sealedRequest,'base64')))
 return sealEnvelope({...envelope,scope:{...scope}},encrypt)
}
