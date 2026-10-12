import { reconcileFalNodeBinding, type FalNativeNodeState } from './falNodeBinding'
import { describe, expect, it } from 'vitest'
import { describeFalRuntimeInputs } from './falRuntimeInputs'
import { nativeVideoDefaults } from './nativeVideoDefaults'
import type { FalSchemaContract } from './falSchemaBinding'
const fields = (properties: NonNullable<FalSchemaContract['input']['properties']>) => describeFalRuntimeInputs({endpointId:'fixture/video', schemaPath:'/fixture', input:{type:'object',properties},output:{type:'object'}}).fields
describe('new native video defaults', () => {
  it('chooses the smallest duration and explicit declared landscape ratio', () => {
    const f=fields({duration:{type:'string',enum:['auto','6','4','12'],default:'auto'},aspect_ratio:{type:'string',enum:['auto','9:16','16:9'],default:'auto'}})
    expect(nativeVideoDefaults(f,{values:{}},{duration:'auto',aspect_ratio:'auto'})).toEqual({duration:'4',aspect_ratio:'16:9'})
  })
  it('uses the declared numeric minimum and seconds aliases', () => {
    const f=fields({clip_length:{type:'integer',minimum:2,maximum:8,default:5},aspect_ratio:{type:'string',enum:['auto','1:1'],default:'auto'}})
    expect(nativeVideoDefaults(f,{values:{}},{clip_length:5,aspect_ratio:'auto'},{duration:'clip_length'})).toEqual({clip_length:2,aspect_ratio:'1:1'})
  })
  it('preserves authored values, partial drafts, and source-owned timelines', () => {
    const f=fields({duration:{type:'integer',minimum:2,maximum:8},aspect_ratio:{type:'string',enum:['auto','16:9']}})
    const a={values:{duration:7,aspect_ratio:'auto'},drafts:{duration:'unfinished'}}
    expect(nativeVideoDefaults(f,a,{duration:7,aspect_ratio:'auto'})).toEqual({duration:7,aspect_ratio:'auto'})
    expect(nativeVideoDefaults(f,{values:{},drafts:{duration:'unfinished'}},{duration:5,aspect_ratio:'auto'})).toEqual({duration:5,aspect_ratio:'16:9'})
    expect(nativeVideoDefaults(f,{values:{}},{duration:5,aspect_ratio:'auto'},{},true)).toEqual({duration:5,aspect_ratio:'auto'})
  })
  it('does not invent a minimum or ratio without actual choices', () => {
    expect(nativeVideoDefaults(fields({duration:{type:'number'},aspect_ratio:{type:'string'}}),{values:{}},{})).toEqual({})
  })
})

describe('Fal binding owns video-only initial values', () => {
  const input={type:'object' as const,properties:{duration:{type:'string' as const,enum:['auto','4','8'],default:'auto'},aspect_ratio:{type:'string' as const,enum:['auto','16:9'],default:'auto'}}}
  const c:FalSchemaContract={endpointId:'fixture/video',schemaPath:'/fixture',input,output:{type:'object'}}
  const contract={...c,runtime:{...describeFalRuntimeInputs(c),fingerprint:'current'}}
  const state:FalNativeNodeState={endpointId:c.endpointId,label:'Fictional Video',flow:'video',values:{},media:[]}
  it('materializes model minimum and ratio on first hydration and retains them through save/reopen', () => {
    const next=reconcileFalNodeBinding(state,contract);expect(next.values).toEqual({duration:'4',aspect_ratio:'16:9'})
    const edited={...next,values:{duration:'8',aspect_ratio:'auto'}}
    expect(reconcileFalNodeBinding(JSON.parse(JSON.stringify(edited)),contract).values).toEqual(edited.values)
  })
  it('does not change provider defaults for nonvideo flows', () => {
    expect(reconcileFalNodeBinding({...state,flow:'voice'},contract).values).toEqual({duration:'auto',aspect_ratio:'auto'})
  })
})
