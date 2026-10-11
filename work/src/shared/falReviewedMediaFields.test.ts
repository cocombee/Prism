import { describe, expect, it } from 'vitest'
import registry from './falReviewedMediaFields.json'
import fixtures from './falReviewedMediaFields.fixtures.json'
import { describeFalRuntimeInputs } from './falRuntimeInputs'
import { planFalNativeExecution } from './falNativeExecution'
import { falNodeMediaBindings } from './falNodeBinding'
import type { FalSchemaNode } from './falSchemaBinding'
const contract=(entry:typeof fixtures[number])=>({endpointId:entry.endpointId,schemaPath:'/fixture',category:entry.category,input:{type:'object' as const,properties:{[entry.field]:entry.schema as FalSchemaNode},required:entry.required?[entry.field]:[]},output:{type:'object' as const}})
describe('reviewed exact published native input fields',()=>{
 it.each(fixtures)('binds $endpointId / $field to its real typed input without changing requiredness or field keys',entry=>{
  const runtime=describeFalRuntimeInputs(contract(entry)),field=runtime.fields[0],rule=registry.models[entry.endpointId as keyof typeof registry.models][entry.field as never] as {type:string;role:string;multiple:boolean}
  expect(field.control).toBe('media');expect(field.required).toBe(entry.required)
  expect(field.media).toMatchObject({type:rule.type,role:rule.role,multiple:rule.multiple,provenance:'verified-adapter'})
  const bindings=falNodeMediaBindings(runtime);expect(bindings).toHaveLength(1);expect(bindings[0].key).toBe(entry.field);expect(bindings[0].required).toBe(entry.required)
 })
 it('restores actual frame roles and multimodal reference ports across popular video routes',()=>{
  const get=(endpointId:string,field:string)=>describeFalRuntimeInputs(contract(fixtures.find(x=>x.endpointId===endpointId&&x.field===field)!)).fields[0]
  expect(get('fal-ai/kling-video/v3/pro/image-to-video','start_image_url').media?.role).toBe('start-frame')
  expect(get('lightricks/ltx-2.5/image-to-video/pro','end_image_url').media?.role).toBe('end-frame')
  expect(get('google/gemini-omni-flash/v1.1/reference-to-video','reference_video_urls').media).toMatchObject({role:'reference-video',maximum:3})
  expect(get('openai/gpt-image-2.5/sunburst/edit','image_urls').media?.maximum).toBe(16)
  expect(get('bytedance/seedream/v5/pro/edit','image_urls').media?.maximum).toBe(10)
 })
 it('does not infer media from lookalike new endpoints, and blocks changed published shapes',()=>{
  const entry=fixtures.find(x=>x.endpointId==='openai/gpt-image-2.5/sunburst/edit'&&x.field==='image_urls')!
  const unknown=contract({...entry,endpointId:'fixture/unknown/edit'});expect(describeFalRuntimeInputs(unknown).fields[0].control).not.toBe('media')
  const changed=contract(entry);changed.input.properties[entry.field]={type:'string'}
  expect(describeFalRuntimeInputs(changed).fields[0].control).toBe('unsupported')
 })
 it('enforces the published shared multimodal budget without counting separate MiniMax frame inputs as references',()=>{
  const endpointId='minimax/h3-max/reference-to-video',properties=Object.fromEntries(fixtures.filter(x=>x.endpointId===endpointId).map(x=>[x.field,x.schema as FalSchemaNode]))
  const base={endpointId,schemaPath:'/fixture',category:'image-to-video',input:{type:'object' as const,properties:{...properties,prompt:{type:'string' as const}}},output:{type:'object' as const,properties:{video:{type:'object' as const,properties:{url:{type:'string' as const}}}}}}
  const runtime=describeFalRuntimeInputs(base),bound={...base,runtime:{...runtime,fingerprint:'a'.repeat(64)}}
  expect(runtime.capacity).toMatchObject({total:12,keys:['reference_image_urls','reference_video_urls','reference_audio_urls']})
  const sources=(type:'image'|'video'|'audio',count:number)=>Array.from({length:count},(_,i)=>({url:`https://files.example/${type}-${i}`,mediaType:type}))
  const request={endpointId,fingerprint:'a'.repeat(64),flow:'video' as const,values:{prompt:'Owned prompt'},media:{reference_image_urls:sources('image',9),reference_audio_urls:sources('audio',3),image_url:sources('image',1),end_image_url:sources('image',1)}}
  expect(()=>planFalNativeExecution(bound,request,'video-generator')).not.toThrow()
  expect(()=>planFalNativeExecution(bound,{...request,media:{...request.media,reference_video_urls:sources('video',1)}},'video-generator')).toThrow('12 total')
 })

})
