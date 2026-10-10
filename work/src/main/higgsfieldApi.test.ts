import {describe,it,expect,vi} from 'vitest'
import {HiggsfieldApi,HiggsfieldRemoteJobError,type HiggsfieldRemoteJob} from './higgsfieldApi'
import {HIGGSFIELD_API} from '../shared/higgsfieldNative'
const model='higgsfield/genjutsu/motion-transfer/v1.0',key='fictional-key-id:fictional-secret'
const input={prompt:'  Authored\r\ntext  ',video_url:'https://media.example/source.mp4',image_urls:['https://media.example/one.png'],resolution:'720p'}
const queued={status:'queued',request_id:'fixture-request',status_url:`${HIGGSFIELD_API}/requests/fixture-request/status`,cancel_url:`${HIGGSFIELD_API}/requests/fixture-request/cancel`}
const complete={status:'completed',request_id:'fixture-request',video:{url:'https://media.example/output.mp4',content_type:'video/mp4'}}
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})
const job:HiggsfieldRemoteJob={requestId:'fixture-request',state:'queued',statusUrl:queued.status_url,cancelUrl:queued.cancel_url}
describe('native Higgsfield HTTP ownership and lifecycle',()=>{
 it('submits one exact direct body and polls the same account without an SDK retry or prompt injection',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response(queued)).mockResolvedValueOnce(response(complete)),wait=vi.fn(async()=>undefined),assertCurrent=vi.fn(),api=new HiggsfieldApi({fetch,key,wait,assertCurrent})
  expect(await api.generate(model,input)).toMatchObject({requestId:'fixture-request',url:complete.video.url})
  expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[0][0]).toBe(`${HIGGSFIELD_API}/${model}`);expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(input)
  expect(fetch.mock.calls[1][0]).toBe(queued.status_url);for(const call of fetch.mock.calls){expect(call[1].headers.Authorization).toBe(`Key ${key}`);expect(call[1].redirect).toBe('error')}
 })
 it('validates direct transport calls before the first fetch and never forwards unknown controls',async()=>{
  const fetch=vi.fn(),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()})
  for(const body of [{...input,seed:0},{...input,video_url:'http://localhost/video'},{...input,image_urls:[]},{...input,resolution:720}])await expect(api.generate(model,body)).rejects.toThrow()
  await expect(api.generate('higgsfield/cinema-studio/4.0',input)).rejects.toThrow(/no verified/);expect(fetch).not.toHaveBeenCalled()
 })
 it('uploads with all returned storage headers and publishes the public URL only after a successful PUT',async()=>{
  const instructions={public_url:'https://media.example/ready.png',upload_url:'https://storage.example/signed?signature=fixture',content_type:'image/png',upload_headers:{'Content-Type':'image/png','x-amz-tagging':'retention=temporary','x-amz-security-token':'fictional-storage-token'}}
  const fetch=vi.fn().mockResolvedValueOnce(response(instructions)).mockResolvedValueOnce(new Response(null,{status:200})),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()})
  expect(await api.upload(new Uint8Array([1,2]),'image/png')).toBe(instructions.public_url)
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({content_type:'image/png'});expect(fetch.mock.calls[1][1]).toMatchObject({method:'PUT',headers:instructions.upload_headers,redirect:'error'});expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined()
  const failure=new HiggsfieldApi({fetch:vi.fn().mockResolvedValueOnce(response(instructions)).mockResolvedValueOnce(new Response(null,{status:403})),key,assertCurrent:vi.fn()});await expect(failure.upload(new Uint8Array([1]),'image/png')).rejects.toThrow(/storage upload failed/)
 })
 it('rejects foreign/private upload destinations and credential-bearing returned headers before PUT',async()=>{
  for(const change of [{upload_url:'https://127.0.0.1/upload'},{upload_headers:{'Content-Type':'image/png',Authorization:`Key ${key}`}},{content_type:'image/jpeg'}]){
   const fetch=vi.fn().mockResolvedValueOnce(response({public_url:'https://media.example/ready.png',upload_url:'https://storage.example/upload',content_type:'image/png',upload_headers:{'Content-Type':'image/png'},...change})),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()})
   await expect(api.upload(new Uint8Array([1]),'image/png')).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1)
  }
 })
 it('parses only the exact model preset catalog and keeps UUID identity/name/preview separate',async()=>{
  const item={id:'11111111-1111-1111-1111-111111111111',name:'Authored Style',preview_url:'https://media.example/style.png'}
  const fetch=vi.fn().mockResolvedValueOnce(response({model:'higgsfield/genjutsu/restyle/v1.0',items:[item]})),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()})
  expect(await api.presets()).toEqual([{id:item.id,name:item.name,previewUrl:item.preview_url}]);expect(fetch.mock.calls[0][0]).toBe(`${HIGGSFIELD_API}/models/higgsfield/genjutsu/restyle/v1.0/presets`)
  for(const value of [{model:'another-model',items:[item]},{model:'higgsfield/genjutsu/restyle/v1.0',items:[item,item]}])await expect(new HiggsfieldApi({fetch:vi.fn(async()=>response(value)),key,assertCurrent:vi.fn()}).presets()).rejects.toThrow()
 })
 it('returns no inferred presets from an empty current catalog',async()=>{
  const api=new HiggsfieldApi({fetch:vi.fn(async()=>response({model:'higgsfield/genjutsu/restyle/v1.0',items:[]})),key,assertCurrent:vi.fn()});expect(await api.presets()).toEqual([])
 })
 it('retains uncertainty after ambiguous submission and never repeats the POST',async()=>{
  const fetch=vi.fn(async()=>{throw new Error(`network failed ${key}`)}),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()})
  let error:unknown;try{await api.generate(model,input)}catch(value){error=value}
  expect(error).toBeInstanceOf(HiggsfieldRemoteJobError);expect(String(error)).toMatch(/status is unknown/);expect(String(error)).not.toContain(key);expect(fetch).toHaveBeenCalledTimes(1)
 })
 it.each([408,500,503])('preserves ambiguous HTTP%s submission as uncertain without a duplicate POST',async status=>{
  const fetch=vi.fn(async()=>new Response(null,{status})),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});await expect(api.generate(model,input)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError);expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('keeps a clear access rejection distinct and never echoes a credential-bearing server body',async()=>{
  const fetch=vi.fn(async()=>new Response(key,{status:403})),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});let error:unknown;try{await api.generate(model,input)}catch(value){error=value}expect(error).not.toBeInstanceOf(HiggsfieldRemoteJobError);expect(String(error)).not.toContain(key);expect(fetch).toHaveBeenCalledTimes(1)
 })
 it.each(['failed','nsfw','canceled'])('stops on terminal %s without more polling',async status=>{
  const fetch=vi.fn(async()=>response({...queued,status})),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});await expect(api.generate(model,input)).rejects.toThrow(`ended ${status}`);expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('rejects foreign status URLs, changed request IDs and malformed completed output without leaking credentials',async()=>{
  for(const bad of [{...queued,status_url:'https://foreign.example/status'},{...complete,request_id:'different'},{...complete,video:{url:'https://127.0.0.1/private'}},{...complete,video:{url:complete.video.url,content_type:'image/png'}}]){
   const fetch=vi.fn().mockResolvedValueOnce(response(queued)).mockResolvedValueOnce(response(bad)),api=new HiggsfieldApi({fetch,key,wait:vi.fn(async()=>undefined),assertCurrent:vi.fn()});await expect(api.generate(model,input)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError);expect(fetch).toHaveBeenCalledTimes(2)
  }
 })
 it.each([202,400])('distinguishes queued cancellation202 from processing400 (%s)',async status=>{
  const controller=new AbortController(),fetch=vi.fn().mockResolvedValueOnce(response(queued)).mockResolvedValueOnce(new Response(null,{status})),api=new HiggsfieldApi({fetch,key,wait:vi.fn(async()=>{controller.abort();throw controller.signal.reason}),assertCurrent:vi.fn()})
  try{await api.generate(model,input,controller.signal);throw new Error('Expected cancellation')}catch(error){expect(String(error)).toMatch(status===202?/was canceled/:/remote work may continue/);expect(error instanceof HiggsfieldRemoteJobError).toBe(status!==202)}
  expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[1][0]).toBe(job.cancelUrl);expect(fetch.mock.calls[1][1].method).toBe('POST')
 })
 it('will not cancel an arbitrary caller URL or use a changed account for cleanup',async()=>{
  const fetch=vi.fn(),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});await expect(api.cancel({...job,cancelUrl:'https://foreign.example/cancel'})).rejects.toThrow(/foreign/);expect(fetch).not.toHaveBeenCalled()
  const blocked=new HiggsfieldApi({fetch,key,assertCurrent:()=>{throw new Error('owner changed')}});await expect(blocked.cancel(job)).rejects.toThrow(/owner changed/);expect(fetch).not.toHaveBeenCalled()
 })
 it('retains a remotely uncertain job after a bounded local timeout',async()=>{
  const fetch=vi.fn(async()=>response(queued)),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn(),maxPollMs:0});await expect(api.generate(model,input)).rejects.toMatchObject({remoteJob:job});expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('rejects malformed/big responses and treats accepted but unreadable submission as uncertain',async()=>{
  for(const result of [new Response('{'),new Response('[]'),new Response('{}',{headers:{'content-length':String(2*1024*1024+1)}})]){
   const fetch=vi.fn(async()=>result),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});await expect(api.generate(model,input)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError);expect(fetch).toHaveBeenCalledTimes(1)
  }
 })
})


describe('fixed native Higgsfield recovery status transport',()=>{
 it('rejects URL/path injection before fetch',async()=>{const fetch=vi.fn(),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});for(const id of ['../foreign','https://foreign.example','request?key=secret','', 'a'.repeat(129)])await expect(api.status(id)).rejects.toThrow(/identity/);expect(fetch).not.toHaveBeenCalled()})
 it('uses a fixed owned GET with no request body or generation replay',async()=>{const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>response(complete)),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});expect(await api.status('fixture-request')).toMatchObject({state:'completed',output:{requestId:'fixture-request',url:complete.video.url}});expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0]).toEqual([`${HIGGSFIELD_API}/requests/fixture-request/status`,expect.objectContaining({method:'GET',redirect:'error',headers:{Authorization:`Key ${key}`}})]);expect(fetch.mock.calls[0][1]?.body).toBeUndefined()})
 it('refuses changed identity, foreign URLs and invalid output types',async()=>{for(const invalid of [{...complete,request_id:'foreign'},{...complete,status_url:'https://foreign.example/status'},{...complete,video:{url:'https://127.0.0.1/private'}},{...complete,video:{url:complete.video.url,content_type:'image/png'}}]){const fetch=vi.fn(async()=>response(invalid)),api=new HiggsfieldApi({fetch,key,assertCurrent:vi.fn()});await expect(api.status('fixture-request')).rejects.toThrow();expect(fetch).toHaveBeenCalledOnce()}})
})
