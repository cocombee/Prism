import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'
import { higgsfieldMovieFormat, type HiggsfieldMovieMime } from './higgsfieldMovieContainer'
import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { mkdir, lstat, open, rename, unlink } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { higgsfieldModel } from '../shared/higgsfieldNative'
import { higgsfieldJobRequiresRecovery, type HiggsfieldJobScope, type HiggsfieldJobState, type HiggsfieldJobView } from '../shared/higgsfieldJobs'

export interface HiggsfieldJobRecord extends HiggsfieldJobScope {
  id: string; endpointId: string; state: HiggsfieldJobState; createdAt: string; updatedAt: string
  profileId: string; credentialId?: string; fingerprint: string; sealedRequest: string
  requestId?: string; outputPath?: string; outputDigest?: string; outputBytes?: number; outputContentType?: HiggsfieldMovieMime
}
export interface HiggsfieldJournalProtection { encrypt(value:string):Buffer; decrypt(value:Buffer):string }
interface JobDocument { schemaVersion: 1; revision: string; jobs: HiggsfieldJobRecord[] }
const states: HiggsfieldJobState[] = ['prepared','submitting','queued','in_progress','unknown','completed','persisted','failed','nsfw','canceled','reviewed']
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/.test(value)
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const equalScope = (a: HiggsfieldJobScope, b: HiggsfieldJobScope) => a.projectId===b.projectId && a.rootPath===b.rootPath && a.documentPath===b.documentPath && a.nodeId===b.nodeId
const sameDocument = (a: HiggsfieldJobScope, b: Omit<HiggsfieldJobScope,'nodeId'>) => a.projectId===b.projectId && a.rootPath===b.rootPath && a.documentPath===b.documentPath
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export function higgsfieldCredentialIdentity(key: string): string {
  const parts = key.split(':'); if(parts.length!==2 || !parts.every(part=>part.length>0)) throw new Error('Choose a complete Higgsfield account credential.')
  return digest(parts[0]) // Public key id only. Never persist or fingerprint its secret.
}
function validScope(value: HiggsfieldJobScope): void {
  if(!value || !text(value.projectId,160) || !text(value.nodeId,160) || !text(value.rootPath,8192) || !isAbsolute(value.rootPath) || !text(value.documentPath,8192) || !isAbsolute(value.documentPath)) throw new Error('Invalid Higgsfield job owner.')
  const document = relative(value.rootPath,value.documentPath); if(!document || document==='..' || document.startsWith('../') || isAbsolute(document)) throw new Error('Higgsfield job document must belong to its project.')
}
function validateRecord(record: HiggsfieldJobRecord): void {
  validScope(record)
  if(!text(record.id,128) || !/^[a-zA-Z0-9_-]+$/.test(record.id) || !text(record.profileId,160) || !hash(record.fingerprint) || record.credentialId!==undefined&&!hash(record.credentialId) || !states.includes(record.state)) throw new Error('Invalid Higgsfield job identity.')
  if(!text(record.endpointId,240)||!/^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*){1,7}$/.test(record.endpointId))throw new Error('Invalid historical Higgsfield route identity.')
  for(const stamp of [record.createdAt,record.updatedAt]) if(!text(stamp,40) || new Date(stamp).toISOString()!==stamp) throw new Error('Invalid Higgsfield job timestamp.')
  if(!text(record.sealedRequest,HIGGSFIELD_RESOURCE_LIMITS.sealedRequestCharacters) || !/^[A-Za-z0-9+/]+={0,2}$/.test(record.sealedRequest) || Buffer.from(record.sealedRequest,'base64').toString('base64')!==record.sealedRequest) throw new Error('Invalid protected Higgsfield request snapshot.')
  if(record.requestId!==undefined && (!text(record.requestId,128)||!/^[A-Za-z0-9_-]+$/.test(record.requestId))) throw new Error('Invalid Higgsfield remote request identity.')
  if(['queued','in_progress','completed','persisted','failed','nsfw','canceled'].includes(record.state) && !record.requestId && record.state!=='failed') throw new Error('Higgsfield accepted job identity is missing.')
  if(['submitting','queued','in_progress','completed','persisted'].includes(record.state)&&!record.credentialId) throw new Error('Higgsfield job account identity is missing.')
  if(record.outputPath!==undefined) { const path=relative(record.rootPath,record.outputPath);if(!text(record.outputPath,8192)||!isAbsolute(record.outputPath)||!path||path==='..'||path.startsWith('../')||isAbsolute(path))throw new Error('Higgsfield output receipt must belong to its original project.') }
  if(record.state==='persisted'&&!record.outputPath)throw new Error('Higgsfield persisted output receipt is missing.')
  if(record.outputDigest!==undefined && (!hash(record.outputDigest)||!record.outputPath||!Number.isSafeInteger(record.outputBytes)||record.outputBytes!<=0||record.outputBytes!>200*1024*1024||!['video/mp4','video/quicktime'].includes(record.outputContentType!)||record.outputPath!==undefined&&record.outputContentType!==undefined&&!record.outputPath.endsWith('.'+higgsfieldMovieFormat(record.outputContentType).extension)))throw new Error('Invalid Higgsfield output receipt.')
  if(record.outputDigest===undefined&&(record.outputBytes!==undefined||record.outputContentType!==undefined))throw new Error('Incomplete Higgsfield output receipt.')
  const known=new Set(['projectId','rootPath','documentPath','nodeId','id','endpointId','state','createdAt','updatedAt','profileId','credentialId','fingerprint','sealedRequest','requestId','outputPath','outputDigest','outputBytes','outputContentType'])
  if(Object.keys(record).some(key=>!known.has(key)))throw new Error('Unknown Higgsfield job data. Preserve the file for recovery.')
}
export function higgsfieldJobView(record: HiggsfieldJobRecord): HiggsfieldJobView { const {id,nodeId,endpointId,state,createdAt,updatedAt,requestId}=record;return {id,nodeId,endpointId,state,createdAt,updatedAt,...(requestId?{requestId}:{}),recoveryRequired:higgsfieldJobRequiresRecovery(state)} }
/** Single-process serialized private journal, with bounded strict reads, atomic/fsynced writes and external-edit checks. */
export class HiggsfieldJobStore {
  private tail = Promise.resolve()
  private readonly directory: string
  constructor(dataRoot: string, private readonly now:()=>string=()=>new Date().toISOString(), private readonly id:()=>string=randomUUID, private readonly protection?:HiggsfieldJournalProtection) { if(!isAbsolute(dataRoot))throw new Error('Invalid private job-store root.');this.directory=join(dataRoot,'provider-jobs') }
  async list(document: Omit<HiggsfieldJobScope,'nodeId'>): Promise<HiggsfieldJobRecord[]> { validScope({...document,nodeId:'read'});return this.exclusive(async()=>{const {data}=await this.read();return data.jobs.filter(job=>job.projectId===document.projectId).map(job=>({...job}))}) }
  async get(scope: HiggsfieldJobScope, id: string): Promise<HiggsfieldJobRecord> { validScope(scope);return this.exclusive(async()=>{const {data}=await this.read();const job=data.jobs.find(item=>item.id===id&&equalScope(item,scope));if(!job)throw new Error('This remote job does not belong to the current node and project.');return {...job}}) }
  async findStable(scope:HiggsfieldJobScope,id:string):Promise<HiggsfieldJobRecord>{validScope(scope);return this.exclusive(async()=>{const {data}=await this.read();const record=data.jobs.find(job=>job.id===id&&job.projectId===scope.projectId&&job.nodeId===scope.nodeId);if(!record)throw new Error('This remote job does not belong to the current node and project.');return {...record}})}
  async relocateDocument(original:HiggsfieldJobScope,next:HiggsfieldJobScope,id:string,sealedRequest:string):Promise<HiggsfieldJobRecord>{validScope(next);if(original.projectId!==next.projectId||original.nodeId!==next.nodeId||original.rootPath!==next.rootPath)throw new Error('Moving a remote job to another project root requires explicit output relocation; its record was preserved.');return this.update(original,id,job=>{job.documentPath=next.documentPath;job.sealedRequest=sealedRequest})}
  async prepare(scope: HiggsfieldJobScope, input: Pick<HiggsfieldJobRecord,'endpointId'|'profileId'|'fingerprint'|'sealedRequest'>): Promise<HiggsfieldJobRecord> {
    validScope(scope); higgsfieldModel(input.endpointId)
    return this.mutate(data=>{
      if(data.jobs.some(job=>job.projectId===scope.projectId&&job.nodeId===scope.nodeId&&higgsfieldJobRequiresRecovery(job.state)))throw new Error('A prior Higgsfield job needs recovery. Check its status or review the provider dashboard before another submission.')
      const createdAt=this.now(),job:HiggsfieldJobRecord={...scope,endpointId:input.endpointId,profileId:input.profileId,fingerprint:input.fingerprint,sealedRequest:input.sealedRequest,id:this.id(),state:'prepared',createdAt,updatedAt:createdAt};validateRecord(job)
      const pending=data.jobs.filter(job=>higgsfieldJobRequiresRecovery(job.state)),resolved=data.jobs.filter(job=>!higgsfieldJobRequiresRecovery(job.state)).slice(-32)
      if(pending.length>=480)throw new Error('Too many unresolved Higgsfield jobs. Review existing jobs before submitting another.')
      data.jobs=[...pending,...resolved,job];return job
    })
  }
  async submitting(scope:HiggsfieldJobScope,id:string,credentialId:string,sealedRequest?:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{if(job.state!=='prepared'||!hash(credentialId))throw new Error('Higgsfield job cannot be submitted again.');job.credentialId=credentialId;if(sealedRequest!==undefined)job.sealedRequest=sealedRequest;job.state='submitting'})}
  async observed(scope:HiggsfieldJobScope,id:string,requestId:string,state:'queued'|'in_progress'|'completed'|'failed'|'nsfw'|'canceled',sealedRequest?:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{
    if(!job.credentialId||job.requestId&&job.requestId!==requestId||!['submitting','queued','in_progress','unknown','completed'].includes(job.state)||job.state==='in_progress'&&state==='queued'||job.state==='completed'&&state!=='completed')throw new Error('Higgsfield remote job changed its identity or lifecycle.')
    job.requestId=requestId;job.state=state;if(sealedRequest!==undefined)job.sealedRequest=sealedRequest
  })}
  async unknown(scope:HiggsfieldJobScope,id:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{if(higgsfieldJobRequiresRecovery(job.state))job.state='unknown'})}
  async rejected(scope:HiggsfieldJobScope,id:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{if(job.state==='prepared'||job.state==='submitting'&&!job.requestId)job.state='failed'})}
  async review(scope:HiggsfieldJobScope,id:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{if(!higgsfieldJobRequiresRecovery(job.state))throw new Error('This remote job is already resolved.');job.state='reviewed'})}
  async reserveOutput(scope:HiggsfieldJobScope,id:string,outputPath:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{if(job.state!=='completed'||job.outputPath&&job.outputPath!==outputPath)throw new Error('Higgsfield output reservation changed. Preserve it for review.');job.outputPath=outputPath})}
  async outputReady(scope:HiggsfieldJobScope,id:string,receipt:{path:string;digest:string;bytes:number;contentType:HiggsfieldMovieMime},sealedRequest:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{if(job.state!=='completed'||job.outputPath!==receipt.path||job.outputDigest&&job.outputDigest!==receipt.digest)throw new Error('Higgsfield output receipt changed. Preserve it for review.');job.outputDigest=receipt.digest;job.outputBytes=receipt.bytes;job.outputContentType=receipt.contentType;job.sealedRequest=sealedRequest})}
  async persisted(scope:HiggsfieldJobScope,id:string,outputPath:string):Promise<HiggsfieldJobRecord>{return this.update(scope,id,job=>{if(job.state!=='completed')throw new Error('Higgsfield output is not confirmed complete.');job.outputPath=outputPath;job.state='persisted'})}
  private update(scope:HiggsfieldJobScope,id:string,change:(record:HiggsfieldJobRecord)=>void):Promise<HiggsfieldJobRecord>{validScope(scope);return this.mutate(data=>{const job=data.jobs.find(item=>item.id===id&&equalScope(item,scope));if(!job)throw new Error('This remote job does not belong to the current node and project.');change(job);job.updatedAt=this.now();validateRecord(job);return job})}
  private async read():Promise<{data:JobDocument;raw?:string}>{
    try{const directory=await lstat(this.directory);if(!directory.isDirectory()||directory.isSymbolicLink())throw new Error('Invalid private Higgsfield job directory.')}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
    const filename=join(this.directory,'higgsfield.json');let file
    try{file=await open(filename,constants.O_RDONLY|constants.O_NOFOLLOW)}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {data:{schemaVersion:1,revision:this.id(),jobs:[]}};throw new Error('Cannot safely read the Higgsfield job journal. Preserve it for recovery.')}
    try{const before=await file.stat();if(!before.isFile()||before.size<1||before.size>(this.protection?HIGGSFIELD_RESOURCE_LIMITS.journalFileBytes:HIGGSFIELD_RESOURCE_LIMITS.journalPayloadBytes))throw new Error('Invalid Higgsfield job journal size.');const limit=(this.protection?HIGGSFIELD_RESOURCE_LIMITS.journalFileBytes:HIGGSFIELD_RESOURCE_LIMITS.journalPayloadBytes),chunks:Buffer[]=[],buffer=Buffer.alloc(64*1024);let length=0
      while(true){const read=await file.read(buffer,0,buffer.length,null);if(!read.bytesRead)break;length+=read.bytesRead;if(length>limit)throw new Error('Higgsfield job journal exceeds its read bound.');chunks.push(Buffer.from(buffer.subarray(0,read.bytesRead)))}
      const raw=Buffer.concat(chunks,length).toString('utf8'),after=await file.stat();if(before.size!==after.size||before.ino!==after.ino||before.mtimeMs!==after.mtimeMs)throw new Error('Higgsfield job journal changed during reading.');let data:JobDocument;try{
        const outer=JSON.parse(raw)
        if(this.protection){
          if(outer?.schemaVersion===1)throw new Error('An unprotected legacy Higgsfield journal requires explicit repair; it was preserved.')
          if(outer?.schemaVersion!==2||typeof outer.sealedData!=='string'||Object.keys(outer).some(key=>!['schemaVersion','sealedData'].includes(key))||!/^[A-Za-z0-9+/]+={0,2}$/.test(outer.sealedData)||Buffer.from(outer.sealedData,'base64').toString('base64')!==outer.sealedData)throw new Error('Invalid protected Higgsfield journal.')
          const decoded=this.protection.decrypt(Buffer.from(outer.sealedData,'base64'))
          if(Buffer.byteLength(decoded)>HIGGSFIELD_RESOURCE_LIMITS.journalEnvelopeBytes)throw new Error('Protected journal exceeds its supported bound.')
          const sealed=JSON.parse(decoded)
          if(sealed?.schemaVersion!==1||typeof sealed.payload!=='string'||Buffer.byteLength(sealed.payload)>HIGGSFIELD_RESOURCE_LIMITS.journalPayloadBytes||!hash(sealed.digest)||digest(sealed.payload)!==sealed.digest||Object.keys(sealed).some(key=>!['schemaVersion','payload','digest'].includes(key)))throw new Error('Protected journal integrity changed.')
          data=JSON.parse(sealed.payload)
        }else{
          if(outer?.schemaVersion===2)throw new Error('The protected Higgsfield journal requires its original secure-storage adapter.')
          data=outer
        }
      }catch(error){
        if(error instanceof Error&&/unprotected legacy|requires its original secure-storage/.test(error.message))throw error
        throw new Error(this.protection?'Cannot open the protected Higgsfield journal. Preserve it for recovery.':'Higgsfield job journal is malformed. Preserve it for recovery.')
      }
      if(data?.schemaVersion!==1||!text(data.revision,128)||!Array.isArray(data.jobs)||data.jobs.length>512||Object.keys(data).some(key=>!['schemaVersion','revision','jobs'].includes(key)))throw new Error('Invalid Higgsfield job journal.');const ids=new Set<string>();for(const job of data.jobs){validateRecord(job);if(ids.has(job.id))throw new Error('Duplicate Higgsfield job identity.');ids.add(job.id)}return {data,raw}
    }finally{await file.close()}
  }
  private mutate(change:(data:JobDocument)=>HiggsfieldJobRecord):Promise<HiggsfieldJobRecord>{return this.exclusive(async()=>{
    const before=await this.read(),result=change(before.data);before.data.revision=this.id();const payload=JSON.stringify(before.data);if(Buffer.byteLength(payload)>HIGGSFIELD_RESOURCE_LIMITS.journalPayloadBytes)throw new Error('Higgsfield job journal exceeds its size bound.')
    const envelope=JSON.stringify({schemaVersion:1,payload,digest:digest(payload)})
    if(this.protection&&Buffer.byteLength(envelope)>HIGGSFIELD_RESOURCE_LIMITS.journalEnvelopeBytes)throw new Error('Higgsfield protected journal envelope exceeds its size bound.')
    const raw=this.protection?JSON.stringify({schemaVersion:2,sealedData:this.protection.encrypt(envelope).toString('base64')}):payload
    if(Buffer.byteLength(raw)>(this.protection?HIGGSFIELD_RESOURCE_LIMITS.journalFileBytes:HIGGSFIELD_RESOURCE_LIMITS.journalPayloadBytes))throw new Error('Higgsfield protected journal exceeds its size bound.')
    await mkdir(this.directory,{recursive:true,mode:0o700});const dir=await lstat(this.directory);if(!dir.isDirectory()||dir.isSymbolicLink())throw new Error('Invalid private Higgsfield job directory.')
    const filename=join(this.directory,'higgsfield.json'),temporary=join(this.directory,`.higgsfield-${this.id()}.tmp`);let candidate
    try{candidate=await open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL,0o600);await candidate.writeFile(raw);await candidate.sync();await candidate.close();candidate=undefined;const latest=await this.read();if((latest.raw===undefined)!==(before.raw===undefined)||latest.raw!==undefined&&digest(latest.raw)!==digest(before.raw!))throw new Error('Higgsfield job journal changed outside this operation. Preserve it for recovery.');await rename(temporary,filename);const handle=await open(this.directory,constants.O_RDONLY);try{await handle.sync()}finally{await handle.close()}return {...result}
    }finally{await candidate?.close();await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error})}
  })}
  private async exclusive<T>(operation:()=>Promise<T>):Promise<T>{const prior=this.tail;let release!:()=>void;this.tail=new Promise<void>(resolve=>{release=resolve});await prior;try{return await operation()}finally{release()}}
}
