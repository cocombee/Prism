import { higgsfieldMovieMime, higgsfieldMovieFormat, higgsfieldMovieContainer, higgsfieldMovieHeaderBytes } from './higgsfieldMovieContainer'
import {createHash} from 'node:crypto'
import {constants} from 'node:fs'
import {mkdir,lstat,realpath,open,link,unlink} from 'node:fs/promises'
import {join} from 'node:path'
import {assertHiggsfieldPublicUrl,type HiggsfieldNativeRequest} from '../shared/higgsfieldNative'
import type {HiggsfieldJobScope} from '../shared/higgsfieldJobs'
import type {GenerationResult} from '../shared/types'
import {HiggsfieldJobStore,type HiggsfieldJobRecord} from './higgsfieldJobStore'
import {openHiggsfieldJobSnapshot,sealHiggsfieldOutputReceipt,type HiggsfieldOutputReceipt} from './higgsfieldJobLifecycle'
import type {HiggsfieldObservedJob} from './higgsfieldApi'
const maximum=200*1024*1024
export interface HiggsfieldOutputDependencies {
 store:HiggsfieldJobStore
 signal?:AbortSignal
 assertCurrent():void
 decrypt(value:Buffer):string
 encrypt(value:string):Buffer
 fetch(url:string,init?:RequestInit):Promise<Response>
 commit(record:HiggsfieldJobRecord,original:HiggsfieldNativeRequest,receipt:HiggsfieldOutputReceipt):Promise<void>
}
async function present(path:string):Promise<boolean>{try{await lstat(path);return true}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error}}
async function folder(root:string):Promise<string>{
 const owner=await lstat(root);if(!owner.isDirectory()||owner.isSymbolicLink())throw new Error('Invalid Higgsfield output project folder.')
 const canonicalRoot=await realpath(root);let current=root
 for(const part of ['06. Generated Assets','02. Videos']) {
   current=join(current,part)
   try{await mkdir(current)}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error}
   const entry=await lstat(current);if(!entry.isDirectory()||entry.isSymbolicLink()||!(await realpath(current)).startsWith(canonicalRoot+'/'))throw new Error('Higgsfield output folder is not safely inside its project.')
 }
 return current
}
async function verify(path:string,receipt:HiggsfieldOutputReceipt):Promise<void>{
 const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
 try {
   const before=await file.stat();if(!before.isFile()||before.size!==receipt.bytes||before.size>maximum)throw new Error('The saved Higgsfield output does not match its receipt. Preserve it for review.')
   const hash=createHash('sha256'),buffer=Buffer.alloc(64*1024);let count=0
   while(true){const read=await file.read(buffer,0,buffer.length,null);if(!read.bytesRead)break;count+=read.bytesRead;if(count>maximum||count>receipt.bytes)throw new Error('The saved Higgsfield output exceeds its receipt.');hash.update(buffer.subarray(0,read.bytesRead))}
   const after=await file.stat();if(count!==receipt.bytes||hash.digest('hex')!==receipt.digest||before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw new Error('The saved Higgsfield output does not match its receipt. Preserve it for review.')
 }finally{await file.close()}
}
async function synchronize(directory:string):Promise<void>{const handle=await open(directory,constants.O_RDONLY);try{await handle.sync()}finally{await handle.close()}}
async function promote(target:string,part:string,receipt:HiggsfieldOutputReceipt,directory:string,assertCurrent:()=>void):Promise<void>{
 if(await present(target)) { await verify(target,receipt);if(await present(part)){await verify(part,receipt);assertCurrent();await unlink(part);await synchronize(directory)};return }
 await verify(part,receipt);assertCurrent()
 // An exclusive hard link preserves both interruption evidence and any existing target.
 await link(part,target);await synchronize(directory);assertCurrent();await verify(target,receipt);await unlink(part);await synchronize(directory)
}
async function download(directory:string,record:HiggsfieldJobRecord,output:NonNullable<HiggsfieldObservedJob['output']>,dependencies:HiggsfieldOutputDependencies,requested?:ReturnType<typeof higgsfieldMovieMime>):Promise<{record:HiggsfieldJobRecord;receipt:HiggsfieldOutputReceipt}>{
 dependencies.assertCurrent()
 const response=await dependencies.fetch(output.url,{redirect:'error',signal:dependencies.signal?AbortSignal.any([dependencies.signal,AbortSignal.timeout(120_000)]):AbortSignal.timeout(120_000)})
 dependencies.assertCurrent()
 let expected:ReturnType<typeof higgsfieldMovieMime>
 try {
  const declaredType=higgsfieldMovieMime(output.contentType),responseType=higgsfieldMovieMime(response.headers.get('content-type'))
  if(declaredType&&responseType&&declaredType!==responseType)throw new Error('Higgsfield output MIME changed between its receipt and download.')
  expected=responseType??declaredType
  if(requested&&expected&&requested!==expected)throw new Error('Higgsfield output does not match the requested container; preserve the original request for review.')
  expected=expected??requested
  const declared=Number(response.headers.get('content-length'))
  if(!response.ok)throw new Error(`Higgsfield output download failed (${response.status}).`)
  if(Number.isFinite(declared)&&declared>maximum)throw new Error('Higgsfield output exceeds its supported size.')
  if(!response.body)throw new Error('Higgsfield completed without output bytes.')
 }catch(error){await response.body?.cancel().catch(()=>undefined);throw error}
 const reader=response.body!.getReader(),hash=createHash('sha256');let bytes=0,prefix=Buffer.alloc(0),headerBytes=8,file:Awaited<ReturnType<typeof open>>|undefined
 const buffered:Uint8Array[]=[]
 try {
  // Determine the real container before reserving a truthful extension. First chunks remain bounded by the output limit.
  while(prefix.length<headerBytes){
   dependencies.assertCurrent();const chunk=await reader.read();dependencies.assertCurrent();if(chunk.done)break
   bytes+=chunk.value.byteLength;if(bytes>maximum)throw new Error('Higgsfield output exceeds its supported size.')
   hash.update(chunk.value);buffered.push(chunk.value);prefix=Buffer.concat([prefix,Buffer.from(chunk.value.subarray(0,64*1024-prefix.length))]);if(prefix.length>=8)headerBytes=higgsfieldMovieHeaderBytes(prefix)
  }
  const format=higgsfieldMovieContainer(prefix,undefined,expected),target=join(directory,`higgsfield-${record.id}.${format.extension}`),part=target+'.part'
  if(record.outputPath&&record.outputPath!==target)throw new Error('The existing Higgsfield output uses a different receipt. Preserve it for explicit recovery.')
  // Unknown existing parts are not adopted just because they occupy a deterministic name.
  if(await present(part)){
   const entry=await lstat(part)
   if(record.outputPath!==target||!entry.isFile()||entry.isSymbolicLink()||entry.size>maximum)throw new Error('Unsafe or unowned incomplete Higgsfield output. Preserve it for review.')
   dependencies.assertCurrent();await unlink(part);await synchronize(directory)
  }
  dependencies.assertCurrent();record=await dependencies.store.reserveOutput(record,record.id,target);dependencies.assertCurrent()
  file=await open(part,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600)
  for(const chunk of buffered){dependencies.assertCurrent();await file.writeFile(chunk)}buffered.length=0
  while(true){
   dependencies.assertCurrent();const chunk=await reader.read();dependencies.assertCurrent();if(chunk.done)break
   bytes+=chunk.value.byteLength;if(bytes>maximum)throw new Error('Higgsfield output exceeds its supported size.')
   hash.update(chunk.value);await file.writeFile(chunk.value)
  }
  higgsfieldMovieContainer(prefix,bytes,format.contentType)
  await file.sync();dependencies.assertCurrent()
  return {record,receipt:{path:target,digest:hash.digest('hex'),bytes,contentType:format.contentType}}
 }catch(error){await reader.cancel().catch(()=>undefined);throw error}finally{reader.releaseLock();await file?.close()}
}
/** Durable ready bytes survive output-index/history failure without repeating download or generation. */
export async function persistHiggsfieldOutput(scope:HiggsfieldJobScope,id:string,output:HiggsfieldObservedJob['output']|undefined,dependencies:HiggsfieldOutputDependencies):Promise<GenerationResult>{
 dependencies.assertCurrent();let record=await dependencies.store.get(scope,id);dependencies.assertCurrent()
 const original=openHiggsfieldJobSnapshot(record,dependencies.decrypt)
 if(!record.requestId||!['completed','persisted'].includes(record.state))throw new Error('This Higgsfield output is not confirmed complete.')
 const requestId=record.requestId
 if(output){if(output.requestId!==record.requestId)throw new Error('Higgsfield output changed its accepted identity.');assertHiggsfieldPublicUrl(output.url);higgsfieldMovieMime(output.contentType)}
 const directory=await folder(scope.rootPath)
 dependencies.assertCurrent()
 const targets=['mp4','mov'].map(extension=>join(directory,`higgsfield-${record.id}.${extension}`))
 if(record.outputPath&&!targets.includes(record.outputPath))throw new Error('The existing Higgsfield output uses a different receipt. Preserve it for explicit recovery.')
 let receipt:HiggsfieldOutputReceipt
 if(record.outputDigest){
  const format=higgsfieldMovieFormat(record.outputContentType!),target=join(directory,`higgsfield-${record.id}.${format.extension}`)
  if(record.outputPath!==target)throw new Error('The existing Higgsfield output uses a different receipt. Preserve it for explicit recovery.')
  receipt={path:target,digest:record.outputDigest,bytes:record.outputBytes!,contentType:format.contentType}
  await promote(target,target+'.part',receipt,directory,dependencies.assertCurrent)
 }else{
  if(record.state==='persisted')throw new Error('The existing Higgsfield output has no protected receipt. Preserve it for explicit recovery.')
  for(const target of targets)if(await present(target))throw new Error('The existing Higgsfield output has no protected receipt. Preserve it for explicit recovery.')
  if(!output)throw new Error('Check the completed provider request to obtain its current output URL.')
  const downloaded=await download(directory,record,output,dependencies,original.values.output_format==='mov'?'video/quicktime':original.values.output_format==='mp4'?'video/mp4':undefined);record=downloaded.record;receipt=downloaded.receipt
  const sealed=sealHiggsfieldOutputReceipt(record,receipt,dependencies.decrypt,dependencies.encrypt)
  dependencies.assertCurrent();record=await dependencies.store.outputReady(scope,id,receipt,sealed)
  await promote(receipt.path,receipt.path+'.part',receipt,directory,dependencies.assertCurrent)
 }
 dependencies.assertCurrent();await dependencies.commit(record,original,receipt);dependencies.assertCurrent()
 return {requestId,modelId:record.endpointId,outputPath:receipt.path,outputUrl:`prism-asset://local/${encodeURIComponent(receipt.path)}`,outputType:'video'}
}
