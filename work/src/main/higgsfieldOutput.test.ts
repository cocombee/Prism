import { createHiggsfieldSubmission } from './higgsfieldSubmission'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {mkdtemp,readFile,rm,writeFile,symlink,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {HiggsfieldJobStore,higgsfieldCredentialIdentity} from './higgsfieldJobStore'
import {beginHiggsfieldJob} from './higgsfieldJobLifecycle'
import {HIGGSFIELD_CONTRACT_REVISION,type HiggsfieldNativeRequest} from '../shared/higgsfieldNative'
import {persistHiggsfieldOutput} from './higgsfieldOutput'
const directories:string[]=[]
afterEach(async()=>{await Promise.all(directories.splice(0).map(path=>rm(path,{recursive:true,force:true})))})
async function setup(format:'mp4'|'mov'='mp4'){
 const root=await mkdtemp(join(tmpdir(),'prism-higgs-output-'));directories.push(root)
 const scope={projectId:'project',rootPath:root,documentPath:join(root,'project.prismflow'),nodeId:'node'},store=new HiggsfieldJobStore(join(root,'private'))
 const native:HiggsfieldNativeRequest={endpointId:'higgsfield/genjutsu/motion-transfer/v1.0',contractRevision:HIGGSFIELD_CONTRACT_REVISION,values:{prompt:'  Original prompt\n'},media:{video_url:[{url:'https://media.example/source.mp4',mediaType:'video'}],image_urls:[{url:'https://media.example/ref.png',mediaType:'image'}]},allowSourceTrimming:true}
 const lifecycle=await beginHiggsfieldJob(store,scope,'profile',native,text=>Buffer.from(text)),observer=lifecycle.observer(higgsfieldCredentialIdentity('original-id:fictional-secret'))
 await observer.beforeSubmit(createHiggsfieldSubmission(native.endpointId,{prompt:native.values.prompt,video_url:native.media.video_url[0].url,image_urls:[native.media.image_urls[0].url],resolution:'720p'}));await observer.observed({requestId:'provider-id',state:'unknown',statusUrl:'https://api.higgsfield.ai/requests/provider-id/status',cancelUrl:'https://api.higgsfield.ai/requests/provider-id/cancel'},'completed')
 const bytes=Buffer.from([0,0,0,24,102,116,121,112,...(format==='mov'?[113,116,32,32]:[105,115,111,109]),0,0,0,0,...(format==='mov'?[113,116,32,32]:[105,115,111,109]),109,112,52,50])
 const contentType=format==='mov'?'video/quicktime':'video/mp4'
 const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(bytes,{headers:{'content-type':contentType}})),commit=vi.fn(async(..._args:unknown[])=>undefined),assertCurrent=vi.fn()
 const dependencies={store,fetch,commit,assertCurrent,decrypt:(value:Buffer)=>value.toString(),encrypt:(value:string)=>Buffer.from(value)}
 const output={requestId:'provider-id',url:'https://media.example/result.mp4',contentType}
 return{root,scope,store,lifecycle,bytes,fetch,commit,dependencies,output,target:join(root,'06. Generated Assets','02. Videos',`higgsfield-${lifecycle.record.id}.${format}`)}
}
describe('protected deterministic Higgsfield output recovery',()=>{
 it('writes and verifies one bounded file and commits the original prompt',async()=>{const x=await setup();const result=await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies);expect(result).toMatchObject({requestId:'provider-id',modelId:'higgsfield/genjutsu/motion-transfer/v1.0',outputPath:x.target,outputType:'video'});expect(await readFile(x.target)).toEqual(x.bytes);expect(x.fetch).toHaveBeenCalledOnce();expect(x.fetch.mock.calls[0][1]).toMatchObject({redirect:'error'});expect(x.commit).toHaveBeenCalledWith(expect.objectContaining({requestId:'provider-id'}),expect.objectContaining({values:expect.objectContaining({prompt:'  Original prompt\n'})}),expect.objectContaining({path:x.target,bytes:x.bytes.length,contentType:'video/mp4'}));const record=await x.store.get(x.scope,x.lifecycle.record.id);expect(record.outputDigest).toMatch(/^[a-f0-9]{64}$/);expect(record.state).toBe('completed')})
 it('reconstructs a ready .part after interruption without another download',async()=>{const x=await setup();const ready=x.store.outputReady.bind(x.store);vi.spyOn(x.store,'outputReady').mockImplementation(async(...args)=>{await ready(...args);throw new Error('Interrupted after receipt')});await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow('Interrupted after receipt');expect(await readFile(x.target+'.part')).toEqual(x.bytes);x.dependencies.store=new HiggsfieldJobStore(join(x.root,'private'));x.fetch.mockClear();const result=await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,undefined,x.dependencies);expect(result.outputPath).toBe(x.target);expect(x.fetch).not.toHaveBeenCalled();expect(await readFile(x.target)).toEqual(x.bytes)})
 it('reconciles final-file/history failures and persisted restoration with no second download',async()=>{const x=await setup();x.commit.mockRejectedValueOnce(new Error('history unavailable'));await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow('history unavailable');x.dependencies.store=new HiggsfieldJobStore(join(x.root,'private'));x.fetch.mockClear();await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,undefined,x.dependencies);expect(x.fetch).not.toHaveBeenCalled();await x.dependencies.store.persisted(x.scope,x.lifecycle.record.id,x.target);await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,undefined,x.dependencies);expect(x.fetch).not.toHaveBeenCalled();expect(x.commit).toHaveBeenCalledTimes(3)})
 it('refuses a tampered private receipt before touching provider or managed outputs',async()=>{const x=await setup();await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies);const file=join(x.root,'private','provider-jobs','higgsfield.json'),journal=JSON.parse(await readFile(file,'utf8'));journal.jobs[0].outputDigest='a'.repeat(64);await writeFile(file,JSON.stringify(journal));x.fetch.mockClear();x.commit.mockClear();await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow(/protected.*receipt/i);expect(x.fetch).not.toHaveBeenCalled();expect(x.commit).not.toHaveBeenCalled();expect(await readFile(x.target)).toEqual(x.bytes)})
 it('preserves changed completed bytes instead of silently replacing or accepting them',async()=>{const x=await setup();await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies);const altered=Buffer.from(x.bytes);altered[altered.length-1]^=1;await writeFile(x.target,altered);x.fetch.mockClear();x.commit.mockClear();await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow(/receipt/i);expect(x.fetch).not.toHaveBeenCalled();expect(x.commit).not.toHaveBeenCalled();expect(await readFile(x.target)).toEqual(altered)})
 it('never overwrites an existing unrelated target or follows a symbolic-link folder/file',async()=>{const x=await setup();await mkdir(join(x.root,'06. Generated Assets','02. Videos'),{recursive:true});await writeFile(x.target,'unrelated');await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow(/existing|receipt/i);expect(await readFile(x.target,'utf8')).toBe('unrelated');expect(x.fetch).not.toHaveBeenCalled();await rm(x.target);const outside=await mkdtemp(join(tmpdir(),'prism-higgs-outside-'));directories.push(outside);await symlink(join(outside,'foreign'),x.target);await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow();expect(x.fetch).not.toHaveBeenCalled();await rm(x.target);await rm(join(x.root,'06. Generated Assets','02. Videos'),{recursive:true});await symlink(outside,join(x.root,'06. Generated Assets','02. Videos'));await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow();expect(x.fetch).not.toHaveBeenCalled()})
 it.each<{headers:Record<string,string>;bytes:Buffer}>([{headers:{'content-type':'image/png'},bytes:Buffer.from('not a video')},{headers:{'content-type':'video/mp4','content-length':String(200*1024*1024+1)},bytes:Buffer.from('small')},{headers:{'content-type':'video/mp4'},bytes:Buffer.from('not an MP4 container')}])('rejects incompatible/bounded output and never commits it',async value=>{const x=await setup();x.fetch.mockImplementation(async()=>new Response(new Uint8Array(value.bytes),{headers:value.headers}));await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow();expect(x.commit).not.toHaveBeenCalled();expect((await x.store.get(x.scope,x.lifecycle.record.id)).outputDigest).toBeUndefined()})
 it('validates accepted identity and public URL before download',async()=>{const x=await setup();for(const output of [{...x.output,requestId:'foreign'},{...x.output,url:'https://127.0.0.1/private'}])await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,output,x.dependencies)).rejects.toThrow();expect(x.fetch).not.toHaveBeenCalled();expect(x.commit).not.toHaveBeenCalled()})
})

describe('native MOV truth and interruption recovery',()=>{
 it('retains actual QuickTime bytes and extension instead of relabeling them MP4',async()=>{
  const x=await setup('mov'),result=await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)
  expect(result.outputPath).toBe(x.target);expect(result.outputPath.endsWith('.mov')).toBe(true)
  expect(await readFile(x.target)).toEqual(x.bytes)
  expect((await x.store.get(x.scope,x.lifecycle.record.id))).toMatchObject({outputContentType:'video/quicktime',outputBytes:x.bytes.length})
  expect((x.commit.mock.calls[0][2] as {contentType:string}).contentType).toBe('video/quicktime')
 })
 it('reconstructs a protected MOV ready part after interruption with no repeat download',async()=>{
  const x=await setup('mov'),ready=x.store.outputReady.bind(x.store)
  vi.spyOn(x.store,'outputReady').mockImplementation(async(...args)=>{await ready(...args);throw new Error('Interrupted MOV ready receipt')})
  await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow('Interrupted MOV')
  expect(await readFile(x.target+'.part')).toEqual(x.bytes)
  x.dependencies.store=new HiggsfieldJobStore(join(x.root,'private'));x.fetch.mockClear()
  expect((await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,undefined,x.dependencies)).outputPath).toBe(x.target)
  expect(x.fetch).not.toHaveBeenCalled();expect(await readFile(x.target)).toEqual(x.bytes)
 })
 it('retains MOV final bytes across history failure and persisted restore',async()=>{
  const x=await setup('mov');x.commit.mockRejectedValueOnce(new Error('History unavailable'))
  await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow('History unavailable')
  x.dependencies.store=new HiggsfieldJobStore(join(x.root,'private'));x.fetch.mockClear()
  await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,undefined,x.dependencies)
  await x.dependencies.store.persisted(x.scope,x.lifecycle.record.id,x.target)
  await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,undefined,x.dependencies)
  expect(x.fetch).not.toHaveBeenCalled();expect(await readFile(x.target)).toEqual(x.bytes)
 })
 it('uses header bytes when the CDN omits format metadata, without trusting its URL suffix',async()=>{
  const x=await setup('mov');x.fetch.mockImplementation(async()=>new Response(x.bytes,{headers:{'content-type':'application/octet-stream'}}))
  const result=await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,{requestId:'provider-id',url:'https://media.example/misleading.mp4'},x.dependencies)
  expect(result.outputPath.endsWith('.mov')).toBe(true)
 })
 it('rejects a MOV/MP4 MIME conflict before reserving or writing a falsely labeled part',async()=>{
  const x=await setup('mov');x.fetch.mockImplementation(async()=>new Response(x.bytes,{headers:{'content-type':'video/mp4'}}))
  await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow(/MIME/)
  expect((await x.store.get(x.scope,x.lifecycle.record.id)).outputPath).toBeUndefined();expect(x.commit).not.toHaveBeenCalled()
 })
 it('preserves an alternate existing output and an unknown part instead of hiding it with another extension',async()=>{
  const x=await setup('mov');await mkdir(join(x.root,'06. Generated Assets','02. Videos'),{recursive:true})
  const alternate=x.target.slice(0,-4)+'.mp4';await writeFile(alternate,'unrelated original')
  await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow(/receipt/)
  expect(await readFile(alternate,'utf8')).toBe('unrelated original');expect(x.fetch).not.toHaveBeenCalled()
  await rm(alternate);await writeFile(x.target+'.part','unknown unowned part')
  await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow(/unowned/)
  expect(await readFile(x.target+'.part','utf8')).toBe('unknown unowned part');expect(x.commit).not.toHaveBeenCalled()
 })
 it('refuses switching the format of a reserved incomplete intent after restart',async()=>{
  const x=await setup('mov'),prior=x.target.slice(0,-4)+'.mp4'
  await x.store.reserveOutput(x.scope,x.lifecycle.record.id,prior)
  await mkdir(join(x.root,'06. Generated Assets','02. Videos'),{recursive:true});await writeFile(prior+'.part','prior incomplete MP4')
  x.dependencies.store=new HiggsfieldJobStore(join(x.root,'private'))
  await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow(/different receipt/)
  expect(await readFile(prior+'.part','utf8')).toBe('prior incomplete MP4')
 })
 it('makes reservation durable before writing any received MOV byte',async()=>{
  const x=await setup('mov');vi.spyOn(x.store,'reserveOutput').mockRejectedValue(new Error('Reservation unavailable'))
  await expect(persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)).rejects.toThrow('Reservation unavailable')
  await expect(readFile(x.target+'.part')).rejects.toMatchObject({code:'ENOENT'});expect(x.commit).not.toHaveBeenCalled()
 })
})

it('reads a split bounded MOV ftyp box before opening the owned part file',async()=>{
 const x=await setup('mov'),chunks=[x.bytes.subarray(0,2),x.bytes.subarray(2,10),x.bytes.subarray(10,17),x.bytes.subarray(17)]
 x.fetch.mockImplementation(async()=>new Response(new ReadableStream({pull(controller){const next=chunks.shift();if(next)controller.enqueue(next);else controller.close()}}),{headers:{'content-type':'video/quicktime'}}))
 const result=await persistHiggsfieldOutput(x.scope,x.lifecycle.record.id,x.output,x.dependencies)
 expect(result.outputPath).toBe(x.target);expect(await readFile(x.target)).toEqual(x.bytes)
})
