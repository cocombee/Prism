import { HIGGSFIELD_API, type HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import { higgsfieldJobRequiresRecovery, type HiggsfieldJobCommand, type HiggsfieldJobScope, type HiggsfieldJobView } from '../shared/higgsfieldJobs'
import type { GenerationResult } from '../shared/types'
import { HiggsfieldApi, type HiggsfieldObservedJob } from './higgsfieldApi'
import { openHiggsfieldJobSnapshot, openHiggsfieldSubmission, openHiggsfieldRemoteJob, sealHiggsfieldRemoteJob, relocateHiggsfieldJobEnvelope } from './higgsfieldJobLifecycle'
import { HiggsfieldJobStore, higgsfieldJobView, type HiggsfieldJobRecord } from './higgsfieldJobStore'
export interface HiggsfieldRecoveryDependencies {
 store: HiggsfieldJobStore
 signal?: AbortSignal
 assertCurrent(): void
 profileId(): Promise<string>
 /** The trusted main adapter compares the original public key identity before constructing the API. */
 createApi(originalCredentialIdentity: string): Promise<HiggsfieldApi>
 decrypt(value: Buffer): string
 encrypt(value: string): Buffer
 /** Reconcile/restore a durable local receipt; never create a new provider generation. */
 persist(record: HiggsfieldJobRecord, original: HiggsfieldNativeRequest, output?: HiggsfieldObservedJob['output']): Promise<GenerationResult>
}
/** Main decrypts and verifies the receipt before advertising reconciliation. No private payload leaves main. */
export function higgsfieldRecoveryView(record:HiggsfieldJobRecord,decrypt:(value:Buffer)=>string):HiggsfieldJobView {
 const submission=openHiggsfieldSubmission(record,decrypt)
 return {...higgsfieldJobView(record),...(!record.requestId&&record.credentialId&&higgsfieldJobRequiresRecovery(record.state)&&submission?{canReconcile:true}:{})}
}
export function higgsfieldJobCommand(value: unknown): HiggsfieldJobCommand {
 if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('Invalid Higgsfield recovery action.')
 const input=value as Record<string,unknown>
 if(Object.keys(input).some(key=>!['id','nodeId','action','dashboardReviewed'].includes(key)) || typeof input.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input.id)||typeof input.nodeId!=='string'||!input.nodeId||input.nodeId.length>160||/[\u0000-\u001f]/.test(input.nodeId)||!['check','cancel','recover','review','relocate'].includes(String(input.action))||input.dashboardReviewed!==undefined&&typeof input.dashboardReviewed!=='boolean')throw new Error('Invalid Higgsfield recovery action.')
 return input as unknown as HiggsfieldJobCommand
}
export async function performHiggsfieldJobAction(scope:HiggsfieldJobScope,value:unknown,dependencies:HiggsfieldRecoveryDependencies):Promise<{job:HiggsfieldJobView;result?:GenerationResult}> {
 const command=higgsfieldJobCommand(value)
 dependencies.assertCurrent()
 if(command.nodeId!==scope.nodeId)throw new Error('This remote job does not belong to the current node and project.')
 let record=command.action==='review'||command.action==='relocate'?await dependencies.store.findStable(scope,command.id):await dependencies.store.get(scope,command.id)
 dependencies.assertCurrent()
 const original=openHiggsfieldJobSnapshot(record,dependencies.decrypt)
 const view=async(result?:GenerationResult)=>({job:higgsfieldRecoveryView(await dependencies.store.get(scope,record.id),dependencies.decrypt),...(result?{result}:{})})
 if(command.action==='review') {
   if(command.dashboardReviewed!==true)throw new Error('Confirm that you checked the original provider dashboard and resolved this request before enabling another Run.')
   dependencies.assertCurrent();await dependencies.store.review(record,record.id);return {job:higgsfieldJobView(await dependencies.store.get(record,record.id))}
 }
 if(command.action==='relocate') {
   if(record.rootPath!==scope.rootPath)throw new Error('This job belongs to the original project root. Preserve its output for explicit relocation or review the original dashboard.')
   if(await dependencies.profileId()!==record.profileId)throw new Error('Select the original Higgsfield account profile to operate this request.')
   dependencies.assertCurrent();if(record.credentialId)await dependencies.createApi(record.credentialId)
   const sealed=relocateHiggsfieldJobEnvelope(record,scope,dependencies.decrypt,dependencies.encrypt)
   dependencies.assertCurrent();await dependencies.store.relocateDocument(record,scope,record.id,sealed);return view()
 }
 if(!higgsfieldJobRequiresRecovery(record.state)&&!(record.state==='persisted'&&command.action==='recover'))return view()
 const submission=openHiggsfieldSubmission(record,dependencies.decrypt)
 if(!record.credentialId||!record.requestId&&(!submission||!['check','recover'].includes(command.action)))throw new Error('The accepted request ID is unknown. Check the original provider dashboard; do not submit this generation again automatically.')
 if(await dependencies.profileId()!==record.profileId)throw new Error('Select the original Higgsfield account profile to operate this request.')
 dependencies.assertCurrent()
 const api=await dependencies.createApi(record.credentialId)
 dependencies.assertCurrent()
 if(!record.requestId){
   // This is explicit recovery of one original intent, not a new Run or automatic transport retry.
   try{
     const accepted=await api.recoverSubmission(submission!,dependencies.signal)
     dependencies.assertCurrent()
     const sealed=sealHiggsfieldRemoteJob(record,accepted,dependencies.decrypt,dependencies.encrypt)
     record=await dependencies.store.observed(scope,record.id,accepted.requestId,'queued',sealed)
   }catch(error){await dependencies.store.unknown(scope,record.id);throw error}
 }
 const remoteJob=openHiggsfieldRemoteJob(record,dependencies.decrypt)??{requestId:record.requestId!,state:'unknown' as const,statusUrl:`${HIGGSFIELD_API}/requests/${record.requestId}/status`,cancelUrl:`${HIGGSFIELD_API}/requests/${record.requestId}/cancel`}
 if(record.state==='persisted') { const result=await dependencies.persist(record,original);dependencies.assertCurrent();return view(result) }
 if(command.action==='cancel') {
   if(record.state==='completed')throw new Error('This request is already complete. Recover its output or explicitly review it; it cannot be canceled.')
   let confirmed=false
   try { confirmed=await api.cancel(remoteJob) }
   catch(error) { await dependencies.store.unknown(scope,record.id);throw error }
   if(!confirmed) { await dependencies.store.unknown(scope,record.id);throw new Error('Remote cancellation was not confirmed. Work may continue; check status before reviewing this request.') }
   dependencies.assertCurrent();await dependencies.store.observed(scope,record.id,remoteJob.requestId,'canceled');return view()
 }
 let observed:HiggsfieldObservedJob
 try { observed=await api.status(remoteJob,dependencies.signal,original.values.output_format==='mov'?'mov':original.values.output_format==='mp4'?'mp4':undefined) }
 catch(error) { if(record.state!=='completed')await dependencies.store.unknown(scope,record.id);throw error }
 dependencies.assertCurrent()
 await dependencies.store.observed(scope,record.id,observed.job.requestId,observed.state,sealHiggsfieldRemoteJob(record,observed.job,dependencies.decrypt,dependencies.encrypt))
 if(command.action!=='recover'||observed.state!=='completed')return view()
 const current=await dependencies.store.get(scope,record.id)
 dependencies.assertCurrent()
 const result=await dependencies.persist(current,original,observed.output)
 dependencies.assertCurrent();await dependencies.store.persisted(scope,record.id,result.outputPath)
 return view(result)
}

/** Recovery actions share one main process owner; simultaneous actions never race a receipt/review. */
export class HiggsfieldJobActions {
 private readonly active = new Set<string>()
 assertIdle(scope:HiggsfieldJobScope):void { if(this.active.has(JSON.stringify([scope.projectId,scope.nodeId])))throw new Error('A recovery action is already running for this node.') }
 async run<T>(scope:HiggsfieldJobScope,work:()=>Promise<T>):Promise<T> {
   const key=JSON.stringify([scope.projectId,scope.nodeId])
   if(this.active.has(key))throw new Error('A recovery action is already running for this node.')
   this.active.add(key)
   try{return await work()}finally{this.active.delete(key)}
 }
}
