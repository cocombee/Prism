import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'
import { describe, expect, it, vi } from 'vitest'
import { createHiggsfieldSubmission, validateHiggsfieldSubmission, higgsfieldRequestUrl, type HiggsfieldSubmission } from './higgsfieldSubmission'
import { HiggsfieldApi, HiggsfieldRemoteJobError } from './higgsfieldApi'
import { HIGGSFIELD_API } from '../shared/higgsfieldNative'
const endpoint='higgsfield/genjutsu/motion-transfer/v1.0',key='fictional-id:fictional-secret'
const body={prompt:'  exact\r\n master  ',video_url:'https://media.example/video.mp4?signature=original',image_urls:['https://media.example/b.png','https://media.example/a.png'],resolution:'720p'}
const queued={request_id:'original-id',status:'queued',status_url:`${HIGGSFIELD_API}/requests/original-id/status?receipt=original`,cancel_url:`${HIGGSFIELD_API}/requests/original-id/cancel?receipt=original`}
const complete={request_id:'original-id',status:'completed',video:{url:'https://media.example/output.mp4'}}
const response=(value:unknown)=>new Response(JSON.stringify(value))
describe('native Higgsfield immutable submission and returned URLs',()=>{
 it('serializes once and preserves prompt, array order, null, false, zero and omission',()=>{
  const input={prompt:'  exact\r\n  ',refs:['second','first'],zero:0,enabled:false,nullable:null}
  const receipt=createHiggsfieldSubmission(endpoint,input)
  expect(receipt.body).toBe(JSON.stringify(input));expect(JSON.parse(receipt.body)).toEqual(input)
  expect(receipt.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/)
  expect(createHiggsfieldSubmission(endpoint,input).idempotencyKey).not.toBe(receipt.idempotencyKey)
  expect(validateHiggsfieldSubmission(receipt)).toEqual(receipt)
 })
 it.each(['body','endpointId','idempotencyKey','digest'])('rejects a changed %s in a protected receipt',field=>{
  const receipt=createHiggsfieldSubmission(endpoint,body)
  expect(()=>validateHiggsfieldSubmission({...receipt,[field]:'changed'})).toThrow(/receipt/i)
 })
 it.each(['../route','one','https://foreign.example/path','route/../path','route/part?key=value'])('rejects unsafe endpoint %s',endpointId=>expect(()=>createHiggsfieldSubmission(endpointId,body)).toThrow())
 it('bounds serialized payload before creating a transport intent',()=>expect(()=>createHiggsfieldSubmission(endpoint,{prompt:'x'.repeat(HIGGSFIELD_RESOURCE_LIMITS.wireBytes+1)})).toThrow())
 it('sends one immutable body/key after durable observer, despite mutation of caller input',async()=>{
  const original={...body,image_urls:[...body.image_urls]},expected=JSON.stringify(original)
  const observer={beforeSubmit:vi.fn(async(_receipt:HiggsfieldSubmission)=>{original.prompt='MUTATED';original.image_urls.reverse()}),observed:vi.fn(async()=>{}),rejected:vi.fn(async()=>{}),canceled:vi.fn(async()=>{})}
  const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>response(complete)),api=new HiggsfieldApi({key,fetch,observer,assertCurrent:()=>{}})
  await api.generate(endpoint,original)
  const receipt=observer.beforeSubmit.mock.calls[0][0]
  expect(fetch.mock.calls[0][1]?.body).toBe(expected)
  expect(fetch.mock.calls[0][1]?.headers).toMatchObject({'Idempotency-Key':receipt.idempotencyKey})
 })
 it('retains returned query bytes for polling and status responses that omit URLs',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response(queued)).mockResolvedValueOnce(response(complete)),api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{},wait:async()=>{}})
  await api.generate(endpoint,body);expect(fetch.mock.calls[1][0]).toBe(queued.status_url)
  expect(fetch.mock.calls[1][1].headers['Idempotency-Key']).toBeUndefined()
 })
 it('replays only the exact protected POST once, returning acceptance for durable recovery to own',async()=>{
  const receipt=createHiggsfieldSubmission(endpoint,body),fetch=vi.fn(async(_url:string,_init?:RequestInit)=>response(queued)),api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{}})
  expect(await api.recoverSubmission(receipt)).toMatchObject({requestId:'original-id',statusUrl:queued.status_url,cancelUrl:queued.cancel_url})
  expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][0]).toBe(`${HIGGSFIELD_API}/${endpoint}`)
  expect(fetch.mock.calls[0][1]).toMatchObject({method:'POST',body:receipt.body,headers:{'Idempotency-Key':receipt.idempotencyKey}})
 })
 it.each([403,408,422,500])('preserves ambiguous original intent after recovery HTTP%s without changing its key',async status=>{
  const receipt=createHiggsfieldSubmission(endpoint,body),fetch=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(null,{status})),api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{}})
  await expect(api.recoverSubmission(receipt)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError)
  expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][1]?.headers).toMatchObject({'Idempotency-Key':receipt.idempotencyKey})
 })
 it('does not resolve a422 mismatch as an unaccepted new intent',async()=>{
  const rejected=vi.fn(async()=>{}),fetch=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(null,{status:422})),api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{},observer:{beforeSubmit:async()=>{},observed:async()=>{},canceled:async()=>{},rejected}})
  await expect(api.generate(endpoint,body)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError);expect(rejected).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledOnce()
 })
 it.each(['https://foreign.example/requests/original-id/status','https://api.higgsfield.ai/requests/other/status','https://api.higgsfield.ai/requests/original-id/status#secret','https://user:pass@api.higgsfield.ai/requests/original-id/status','https://api.higgsfield.ai/requests/original-id/../original-id/status','https://api.higgsfield.ai/requests/original-id/status\n'])('rejects foreign or ambiguous request URL %s',url=>expect(()=>higgsfieldRequestUrl(url,'original-id','status')).toThrow())
 it('will not accept changed returned query capabilities during an owned status check',async()=>{
  const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>response({...complete,status_url:queued.status_url+'-changed'})),api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{}})
  await expect(api.status({requestId:'original-id',state:'queued',statusUrl:queued.status_url,cancelUrl:queued.cancel_url})).rejects.toThrow(/changed request URL/)
 })
 it('uses the protected query-bearing cancel URL without a generation body or idempotency header',async()=>{
  const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(null,{status:202})),api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{}})
  expect(await api.cancel({requestId:'original-id',state:'queued',statusUrl:queued.status_url,cancelUrl:queued.cancel_url})).toBe(true)
  expect(fetch.mock.calls[0][0]).toBe(queued.cancel_url);expect(fetch.mock.calls[0][1]?.body).toBeUndefined()
 })
})
