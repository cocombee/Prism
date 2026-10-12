import { describe, expect, it } from 'vitest'
import routes from './higgsfieldCatalogCompletion.fixture.json'
import { higgsfieldModel, higgsfieldNativeFields, higgsfieldContractRevision, higgsfieldInputSchema, planHiggsfieldNativeInput, materializeHiggsfieldNativeInput } from './higgsfieldNative'
import { describeHiggsfieldInputContract } from './higgsfieldInputContract'
import type { HiggsfieldNativeRequest } from './higgsfieldNative'
import { HIGGSFIELD_REFERENCE_VIDEO_REVISION } from './higgsfieldReferenceVideo'
const source=(mediaType:'image'|'video'|'audio',name:string)=>({mediaType,path:'/fixture/'+name})
const req=(endpointId:string,media:Record<string,any>)=>({endpointId,contractRevision:HIGGSFIELD_REFERENCE_VIDEO_REVISION,values:{prompt:'Keep the supplied media in its assigned role.'},media,fingerprint:"a".repeat(64)})
describe('current published Higgsfield catalog completion',()=>{
 it.each(routes)('admits the exact reviewed $id identity',row=>{
  expect(higgsfieldModel(row.id).id).toBe(row.id)
 })
 it.each(routes)('plans every reviewed $id through its actual schema without inventing media fields', row=>{
  const schema=higgsfieldInputSchema(row.id), fields=higgsfieldNativeFields(row.id,schema)
  const media: HiggsfieldNativeRequest['media']={}
  for(const field of fields)if(field.media)media[field.key]=[source(field.media.type,field.key)]
  const duration=Number(schema.properties?.duration?.enum?.[0] ?? schema.properties?.duration?.default ?? 5)
  const request:HiggsfieldNativeRequest={endpointId:row.id,contractRevision:higgsfieldContractRevision(row.id),fingerprint:'b'.repeat(64),values:{prompt:'  Exact authored action.\r\nKeep it.  ',duration},media}
  const plan=planHiggsfieldNativeInput(request,schema)
  if(plan.kind==='genjutsu')throw Error('Unexpected workflow route')
  const urls=plan.slots.map((slot,index)=>`https://cdn.prism.example/${index}-${slot.source.mediaType}`)
  const wire=materializeHiggsfieldNativeInput(plan,urls)
  expect(wire.prompt).toBe(request.values.prompt)
  expect(wire.duration).toBe(duration)
  expect(plan.slots.length).toBe(Object.keys(media).length)
  const contract=describeHiggsfieldInputContract(row.id,schema,request.fingerprint!)
  expect(contract.unsupportedInputs).toEqual([])
  expect(contract.media.map(field=>field.key)).toEqual(fields.filter(field=>field.media).map(field=>field.key))
  for(const key of ['elements','multi_prompt','file_url','link_url'])expect(wire).not.toHaveProperty(key)
 })
 it('keeps document and web references outside image/video sockets and rejects authored or changed omissions',()=>{
  const id='alibaba/wan-3.0-prime/reference-to-video',schema=higgsfieldInputSchema(id)
  const fields=higgsfieldNativeFields(id,schema)
  expect(fields.some(field=>['file_url','link_url'].includes(field.key))).toBe(false)
  for(const key of ['file_url','link_url']){
   const authored={...req(id,{}),values:{prompt:'Exact.',[key]:'https://cdn.prism.example/document.pdf'}}
   expect(()=>planHiggsfieldNativeInput(authored,schema)).toThrow(/document\/web input/)
   expect(authored.values[key]).toBe('https://cdn.prism.example/document.pdf')
   const required=structuredClone(schema);required.required=[...(required.required||[]),key]
   expect(()=>planHiggsfieldNativeInput(req(id,{}),required)).toThrow(/requires unsupported/)
   const changed=structuredClone(schema);changed.properties![key]={type:'array',items:{type:'string',format:'uri'}}
   expect(()=>planHiggsfieldNativeInput(req(id,{}),changed)).toThrow(/changed shape/)
  }
  const unknown=structuredClone(schema);unknown.properties!.future_url={type:'string',format:'uri'}
  expect(()=>planHiggsfieldNativeInput(req(id,{}),unknown)).toThrow(/unbound media/)
 })
 it('enforces scalar speech kind, reference count and required first-frame bindings',()=>{
  const id='xai/grok-imagine-video/v1.5/reference-to-video',schema=higgsfieldInputSchema(id)
  expect(()=>planHiggsfieldNativeInput(req(id,{audio_url:[source('image','wrong.png')]}),schema)).toThrow(/bound audio/)
  expect(()=>planHiggsfieldNativeInput(req(id,{audio_url:[source('audio','a'),source('audio','b')]}),schema)).toThrow(/at most one source/)
  expect(()=>planHiggsfieldNativeInput(req(id,{image_urls:Array.from({length:8},()=>source('image','excess.png'))}),schema)).toThrow(/item count/)
  const frame='kling-video/omni/first-last-frame'
  expect(()=>planHiggsfieldNativeInput(req(frame,{last_frame_url:[source('image','end')]}),higgsfieldInputSchema(frame))).toThrow(/first_frame_url/)
 })
 it('retains established native identities',()=>{
  for(const id of ['kling-video/v3.0/std/image-to-video','minimax/h3/text-to-video','bytedance/seedance-2.5/reference-to-video'])expect(higgsfieldModel(id).id).toBe(id)
 })
 it('keeps Grok speech, first frame and additional references in their exact scalar/array slots',()=>{
  const request=req('xai/grok-imagine-video/v1.5/reference-to-video',{
   audio_url:[source('audio','speech.mp3')],image_url:[source('image','first.png')],image_urls:[source('image','reference.png')],
  })
  const plan=planHiggsfieldNativeInput(request,higgsfieldInputSchema(request.endpointId))
  if(plan.kind!=='reference-video')throw Error('Expected a reference-media planner')
  expect(plan.slots.map(slot=>[slot.field,slot.type,slot.role])).toEqual([
   ['audio_url','audio','reference-audio'],['image_url','image','start-frame'],['image_urls','image','reference-image'],
  ])
  const body=materializeHiggsfieldNativeInput(plan,['https://cdn.prism.example/speech.mp3','https://cdn.prism.example/first.png','https://cdn.prism.example/reference.png'])
  expect(body.audio_url).toBe('https://cdn.prism.example/speech.mp3')
  expect(body.image_url).toBe('https://cdn.prism.example/first.png')
  expect(body.image_urls).toEqual(['https://cdn.prism.example/reference.png'])
  expect(body).not.toHaveProperty('audio_urls')
 })
 it('binds O3 first and last frame names without substituting image_url',()=>{
  const request=req('kling-video/o3/first-last-frame',{
   last_frame_url:[source('image','last.png')],first_frame_url:[source('image','first.png')],
  })
  const plan=planHiggsfieldNativeInput(request,higgsfieldInputSchema(request.endpointId))
  if(plan.kind!=='reference-video')throw Error('Expected a reference-media planner')
  expect(plan.slots.map(slot=>[slot.field,slot.role])).toEqual([['last_frame_url','end-frame'],['first_frame_url','start-frame']])
  const body=materializeHiggsfieldNativeInput(plan,['https://cdn.prism.example/last.png','https://cdn.prism.example/first.png'])
  expect(body.first_frame_url).toBe('https://cdn.prism.example/first.png')
  expect(body.last_frame_url).toBe('https://cdn.prism.example/last.png')
  expect(body).not.toHaveProperty('image_url')
 })
 it('allows the documented Grok no-media prompt without inventing attachments',()=>{
  const request=req('xai/grok-imagine-video/v1.5/reference-to-video',{})
  const plan=planHiggsfieldNativeInput(request,higgsfieldInputSchema(request.endpointId))
  if(plan.kind!=='reference-video')throw Error('Expected a reference-media planner')
  expect(plan.slots).toEqual([])
  const body=materializeHiggsfieldNativeInput(plan,[])
  for(const key of ['audio_url','image_url','image_urls'])expect(body).not.toHaveProperty(key)
 })
})
