import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HiggsfieldApi } from './higgsfieldApi'
import { HiggsfieldJobStore, higgsfieldCredentialIdentity } from './higgsfieldJobStore'
import { beginHiggsfieldJob, openHiggsfieldSubmission, openHiggsfieldRemoteJob } from './higgsfieldJobLifecycle'
import { performHiggsfieldJobAction, higgsfieldRecoveryView } from './higgsfieldJobRecovery'
import { persistHiggsfieldOutput } from './higgsfieldOutput'
import { HIGGSFIELD_API, HIGGSFIELD_CONTRACT_REVISION, type HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
const directories:string[]=[]
afterEach(async()=>{await Promise.all(directories.splice(0).map(path=>rm(path,{recursive:true,force:true})))})
const endpoint='higgsfield/genjutsu/motion-transfer/v1.0',key='original-public-id:fictional-secret'
const statusUrl=`${HIGGSFIELD_API}/requests/accepted-original/status?receipt=original-query`,cancelUrl=`${HIGGSFIELD_API}/requests/accepted-original/cancel?receipt=original-query`
async function setup(){
 const directory=await mkdtemp(join(tmpdir(),'prism-higgs-wire-recovery-'));directories.push(directory)
 const root=join(directory,'project');await mkdir(root)
 const scope={projectId:'project',rootPath:root,documentPath:join(root,'Canvas.prismflow'),nodeId:'video'}
 // Authenticated fictional protection exercises both journal/envelope adapters, not the OS keychain.
 const secret=randomBytes(32)
 const encrypt=(text:string)=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv),bytes=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes])}
 const decrypt=(bytes:Buffer)=>{const cipher=createDecipheriv('aes-256-gcm',secret,bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8')}
 const protection={encrypt,decrypt},newStore=()=>new HiggsfieldJobStore(join(directory,'private'),undefined,undefined,protection),store=newStore()
 const request:HiggsfieldNativeRequest={endpointId:endpoint,contractRevision:HIGGSFIELD_CONTRACT_REVISION,values:{prompt:'  Authored\r\nmaster must remain exact  '},media:{video_url:[{path:join(root,'source.mp4'),mediaType:'video'}],image_urls:[{path:join(root,'second.png'),mediaType:'image'},{path:join(root,'first.png'),mediaType:'image'}]},allowSourceTrimming:true}
 const input={resolution:'720p',prompt:request.values.prompt,video_url:'https://media.example/uploaded-source.mp4?signature=original',image_urls:['https://media.example/uploaded-second.png','https://media.example/uploaded-first.png']}
 const lifecycle=await beginHiggsfieldJob(store,scope,'original-profile',request,encrypt),identity=higgsfieldCredentialIdentity(key)
 const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>{throw new Error('Response lost')})
 const api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{},observer:lifecycle.observer(identity)})
 try{await api.generate(endpoint,input)}catch(error){await lifecycle.failed(error)}
 const record=await newStore().get(scope,lifecycle.record.id),submission=openHiggsfieldSubmission(record,decrypt)!
 expect(record.state).toBe('unknown');expect(record.requestId).toBeUndefined();expect(higgsfieldRecoveryView(record,decrypt).canReconcile).toBe(true);expect(submission.body).toBe(JSON.stringify(input))
 expect(fetch.mock.calls[0][1]).toMatchObject({body:submission.body,headers:{'Idempotency-Key':submission.idempotencyKey}})
 const outputBytes=Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109,109,112,52,50]),outputFetch=vi.fn(async()=>new Response(outputBytes,{headers:{'content-type':'video/mp4'}})),commit=vi.fn(async(..._args:unknown[])=>{})
 const assertCurrent=vi.fn(),profileId=vi.fn(async()=> 'original-profile'),replayFetch=vi.fn(async(url:string,init?:RequestInit)=>new Response(JSON.stringify(init?.method==='POST'?{request_id:'accepted-original',status:'queued',status_url:statusUrl,cancel_url:cancelUrl}:{request_id:'accepted-original',status:'completed',video:{url:'https://media.example/output.mp4',content_type:'video/mp4'}})))
 const createApi=vi.fn(async(expected:string)=>{expect(expected).toBe(identity);return new HiggsfieldApi({key,fetch:replayFetch,assertCurrent})})
 const reconstructed=newStore()
 const persist=vi.fn(async(record:Awaited<ReturnType<HiggsfieldJobStore['get']>>,_original:HiggsfieldNativeRequest,output?:{requestId:string;url:string;contentType?:string})=>persistHiggsfieldOutput(scope,record.id,output,{store:reconstructed,encrypt,decrypt,assertCurrent,fetch:outputFetch,commit}))
 const dependencies={store:reconstructed,encrypt,decrypt,assertCurrent,profileId,createApi,persist}
 return {directory,root,scope,request,input,record,submission,newStore,encrypt,decrypt,replayFetch,outputFetch,outputBytes,commit,dependencies,createApi,profileId,command:{id:record.id,nodeId:scope.nodeId,action:'check' as const}}
}
describe('real native transport/journal/recovery/output composition',()=>{
 it('reconstructs a lost-response job, preserves exact wire/key, stores acceptance before GET and restores one output',async()=>{
  const x=await setup()
  x.replayFetch.mockImplementation(async(url,init)=>{
   if(init?.method==='POST'){
    expect(url).toBe(`${HIGGSFIELD_API}/${endpoint}`);expect(init.body).toBe(x.submission.body);expect(init.headers).toMatchObject({'Idempotency-Key':x.submission.idempotencyKey})
    return new Response(JSON.stringify({request_id:'accepted-original',status:'queued',status_url:statusUrl,cancel_url:cancelUrl}))
   }
   const durable=await x.newStore().get(x.scope,x.record.id)
   expect(durable.requestId).toBe('accepted-original');expect(openHiggsfieldRemoteJob(durable,x.decrypt)?.statusUrl).toBe(statusUrl)
   expect(url).toBe(statusUrl)
   return new Response(JSON.stringify({request_id:'accepted-original',status:'completed',video:{url:'https://media.example/output.mp4',content_type:'video/mp4'}}))
  })
  const recovered=await performHiggsfieldJobAction(x.scope,{...x.command,action:'recover'},x.dependencies)
  expect(recovered.job.state).toBe('persisted');expect(recovered.result?.requestId).toBe('accepted-original');expect(x.replayFetch).toHaveBeenCalledTimes(2)
  expect(x.outputFetch).toHaveBeenCalledOnce();expect(await readFile(recovered.result!.outputPath)).toEqual(x.outputBytes)
  expect((x.commit.mock.calls[0][1] as HiggsfieldNativeRequest).values.prompt).toBe(x.request.values.prompt)
  const privateJournal=await readFile(join(x.directory,'private','provider-jobs','higgsfield.json'),'utf8')
  for(const text of ['Authored','original-public-id',x.submission.idempotencyKey,'uploaded-source',statusUrl])expect(privateJournal).not.toContain(text)
  expect(Object.keys(recovered.job)).not.toEqual(expect.arrayContaining(['submission','sealedRequest','idempotencyKey','statusUrl','cancelUrl']))
  x.dependencies.store=x.newStore();x.replayFetch.mockClear();x.outputFetch.mockClear()
  await performHiggsfieldJobAction(x.scope,{...x.command,action:'recover'},x.dependencies)
  expect(x.replayFetch).not.toHaveBeenCalled();expect(x.outputFetch).not.toHaveBeenCalled()
 })
 it('reopens returned query-bearing URLs for status and cancellation without another generation submission',async()=>{
  const x=await setup();await performHiggsfieldJobAction(x.scope,x.command,x.dependencies)
  // Re-open a fresh queued intent for cancellation with no body/key generation replay.
  const y=await setup();y.replayFetch.mockImplementation(async(_url,init)=>new Response(JSON.stringify(init?.method==='POST'?{request_id:'accepted-original',status:'queued',status_url:statusUrl,cancel_url:cancelUrl}:{request_id:'accepted-original',status:'in_progress'})))
  await performHiggsfieldJobAction(y.scope,y.command,y.dependencies);y.dependencies.store=y.newStore();y.replayFetch.mockClear();y.replayFetch.mockImplementation(async()=>new Response(null,{status:202}))
  const result=await performHiggsfieldJobAction(y.scope,{...y.command,action:'cancel'},y.dependencies)
  expect(result.job.state).toBe('canceled');expect(y.replayFetch).toHaveBeenCalledOnce();expect(y.replayFetch.mock.calls[0][0]).toBe(cancelUrl);expect(y.replayFetch.mock.calls[0][1]?.body).toBeUndefined()
 })
 it.each([403,408,422,500])('keeps original HTTP%s recovery unresolved, with the same key on a later explicit check',async status=>{
  const x=await setup();x.replayFetch.mockImplementation(async()=>new Response(null,{status}))
  for(let i=0;i<2;i++)await expect(performHiggsfieldJobAction(x.scope,x.command,x.dependencies)).rejects.toThrow(/identity is preserved/)
  expect(x.replayFetch).toHaveBeenCalledTimes(2)
  for(const call of x.replayFetch.mock.calls)expect(call[1]).toMatchObject({body:x.submission.body,headers:{'Idempotency-Key':x.submission.idempotencyKey}})
  expect((await x.newStore().get(x.scope,x.record.id)).state).toBe('unknown')
  await expect(beginHiggsfieldJob(x.newStore(),x.scope,'original-profile',x.request,x.encrypt)).rejects.toThrow(/prior Higgsfield/)
  expect(x.outputFetch).not.toHaveBeenCalled()
 })
 it('does not replay unknown work to cancel it or resolve it without dashboard confirmation',async()=>{
  const x=await setup();await expect(performHiggsfieldJobAction(x.scope,{...x.command,action:'cancel'},x.dependencies)).rejects.toThrow(/dashboard/)
  expect(x.createApi).not.toHaveBeenCalled();expect(x.replayFetch).not.toHaveBeenCalled()
  await expect(performHiggsfieldJobAction(x.scope,{...x.command,action:'review'},x.dependencies)).rejects.toThrow(/Confirm/)
 })
 it('rejects another profile before credential access or replay',async()=>{
  const x=await setup();x.profileId.mockResolvedValue('other-profile')
  await expect(performHiggsfieldJobAction(x.scope,x.command,x.dependencies)).rejects.toThrow(/original Higgsfield account/)
  expect(x.createApi).not.toHaveBeenCalled();expect(x.replayFetch).not.toHaveBeenCalled()
 })
 it('retains exact wire receipt when acceptance cannot be persisted; never polls an unowned ID',async()=>{
  const x=await setup();vi.spyOn(x.dependencies.store,'observed').mockRejectedValueOnce(new Error('disk full'))
  await expect(performHiggsfieldJobAction(x.scope,x.command,x.dependencies)).rejects.toThrow('disk full')
  expect(x.replayFetch).toHaveBeenCalledOnce();expect((await x.newStore().get(x.scope,x.record.id)).requestId).toBeUndefined()
  await performHiggsfieldJobAction(x.scope,x.command,x.dependencies)
  const posts=x.replayFetch.mock.calls.filter(call=>call[1]?.method==='POST');expect(posts).toHaveLength(2)
  for(const call of posts)expect(call[1]?.body).toBe(x.submission.body)
 })
 it('rejects corrupted wire or returned URL receipts before profile/credentials/network',async()=>{
  const x=await setup(),envelope=JSON.parse(x.decrypt(Buffer.from(x.record.sealedRequest,'base64')))
  envelope.submission.body='{"prompt":"tampered"}'
  vi.spyOn(x.dependencies.store,'get').mockResolvedValue({...x.record,sealedRequest:x.encrypt(JSON.stringify(envelope)).toString('base64')})
  await expect(performHiggsfieldJobAction(x.scope,x.command,x.dependencies)).rejects.toThrow(/receipt/)
  expect(x.profileId).not.toHaveBeenCalled();expect(x.createApi).not.toHaveBeenCalled();expect(x.replayFetch).not.toHaveBeenCalled()
 })
})
