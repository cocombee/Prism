import { describe, it, expect } from 'vitest'
import { falVideoDurationLimits, generatorVideoDurationLimits, videoMaximumLabel } from './videoDurationLimits'
import type { FalSchemaContract, FalSchemaNode } from './falSchemaBinding'
import { describeFalRuntimeInputs } from './falRuntimeInputs'
import { VIDEO_MODELS } from './videoModels'
import { describeHiggsfieldInputContract } from './higgsfieldInputContract'
import { higgsfieldSeedanceSchema } from './higgsfieldSeedanceInput'
import { selectHiggsfieldBinding, reconcileHiggsfieldNodeBinding } from './higgsfieldNodeBinding'
import { connectedStoryboardVideo } from './storyboardVideoSync'
import type { StudioNode } from './types'
const seconds = (schema: FalSchemaNode, extras: Partial<FalSchemaNode> = {}): FalSchemaContract => {
  const contract: FalSchemaContract = { endpointId:'fixture/movie/text-to-video',schemaPath:'/fixture',category:'text-to-video',input:{type:'object',properties:{duration:{description:'Duration of generated video in seconds.',...schema}, resolution:{type:'string'}},...extras},output:{type:'object'} }
  contract.runtime={...describeFalRuntimeInputs(contract),fingerprint:'fixture'};return contract
}
describe('owned model duration observations', () => {
  it('never treats numeric constraints on wire strings as enforced seconds limits',()=>{
    const c=seconds({type:'string',minimum:4,maximum:30})
    expect(falVideoDurationLimits(c,{duration:'40'})).toMatchObject({maximum:undefined,selectedSeconds:40,error:undefined})
  })
  it('does not promise unattainable oneOf maxima or impossible stepped intervals',()=>{
    const c=seconds({oneOf:[{type:'number',minimum:1,maximum:10},{type:'number',minimum:5,maximum:10}]})
    expect(falVideoDurationLimits(c,{duration:2}).maximum).toBeUndefined()
    const impossible=seconds({type:'integer',minimum:1.1,maximum:1.9})
    const limits=falVideoDurationLimits(impossible,{duration:1});expect(limits.maximum).toBeUndefined();expect(limits.error).toContain('No supported')
  })
  it('uses actual request default duration, distinct from the smallest native menu choice',()=>{
    expect(generatorVideoDurationLimits({videoEngine:'fal-ai/veo3.1'}).selectedSeconds).toBe(8)
    expect(generatorVideoDurationLimits({videoEngine:'bytedance/seedance-2.5/text-to-video'}).selectedSeconds).toBe(5)
    expect(generatorVideoDurationLimits({videoEngine:'wan-controlled'}).selectedSeconds).toBe(5)
    expect(generatorVideoDurationLimits({videoEngine:'wan-controlled',autoDuration:true})).toMatchObject({selectedSeconds:undefined,error:expect.stringContaining('does not support automatic')})
  })
  it('reports native range and saved selection without substituting the stale legacy model', () => {
    const contract=seconds({type:'integer',minimum:4,maximum:30,default:5})
    const data={videoEngine:'wan-controlled' as const,duration:6,falNative:{endpointId:contract.endpointId,label:'Future',flow:'video' as const,values:{duration:30},fingerprint:'fixture',media:[]}}
    expect(generatorVideoDurationLimits(data,contract)).toMatchObject({minimum:4,maximum:30,selectedSeconds:30,error:undefined})
    expect(videoMaximumLabel(generatorVideoDurationLimits(data,contract))).toBe('Max 30s')
    const before=JSON.stringify(data);expect(generatorVideoDurationLimits({...data,falNative:{...data.falNative,values:{duration:31}}},contract).error).toContain('unsupported');expect(JSON.stringify(data)).toBe(before)
    expect(generatorVideoDurationLimits(data,{...contract,endpointId:'another/model'})).toEqual(expect.objectContaining({choices:[],error:expect.stringContaining('Refresh')}))
    expect(generatorVideoDurationLimits({...data,falNative:{...data.falNative,fingerprint:'old'}},contract).maximum).toBeUndefined()
  })
  it.each([['number',{type:'number',minimum:4,maximum:30},[4,30]],['nullable',{anyOf:[{type:'integer',minimum:4,maximum:30},{type:'null'}]},[4,30]],['numeric enum',{type:'integer',enum:[4,6,8]},[4,8]],['string enum',{type:'string',enum:['4','6','8','auto']},[4,8]],['suffix enum',{type:'string',enum:['4s','6s','8s','auto']},[4,8]],['exclusive integer',{type:'integer',exclusiveMinimum:3,exclusiveMaximum:9},[4,8]],['multiple',{type:'number',minimum:3,maximum:9,multipleOf:2},[4,8]]])('projects %s from explicit bounds rather than defaults',(_name,schema,bounds)=>{
    const limits=falVideoDurationLimits(seconds(schema as FalSchemaNode),{duration:4});expect([limits.minimum,limits.maximum]).toEqual(bounds)
  })
  it('treats automatic and unbounded timing as unverified, and provider defaults only as values',()=>{
    const c=seconds({type:'string',enum:['4s','8s','auto'],default:'auto'})
    expect(falVideoDurationLimits(c,{})).toMatchObject({maximum:8,error:expect.stringContaining('fixed')})
    const unbounded=seconds({type:'number',default:5});expect(falVideoDurationLimits(unbounded,{})).toMatchObject({selectedSeconds:5,maximum:undefined})
    expect(videoMaximumLabel(falVideoDurationLimits(unbounded,{}))).toBe('Maximum duration unverified')
  })
  it('respects conditional limits from authored resolution without guessing a default branch',()=>{
    const c=seconds({type:'integer',minimum:4,maximum:30},{allOf:[{if:{required:['resolution'],properties:{resolution:{const:'1080p'}}},then:{properties:{duration:{maximum:10}}}}]})
    expect(falVideoDurationLimits(c,{duration:12,resolution:'1080p'})).toMatchObject({maximum:10,error:expect.stringContaining('unsupported')})
    expect(falVideoDurationLimits(c,{duration:12,resolution:'720p'})).toMatchObject({maximum:30,error:undefined})
    expect(falVideoDurationLimits(c,{duration:12})).toMatchObject({maximum:30})
  })
  it('does not flatten unresolved root alternatives or duration-dependent conditions',()=>{
    const c=seconds({type:'number',minimum:1,maximum:30},{anyOf:[{properties:{resolution:{const:'720p'}}},{properties:{resolution:{const:'1080p'}}}]})
    expect(falVideoDurationLimits(c,{duration:5}).maximum).toBeUndefined()
    const self=seconds({type:'number',maximum:30},{if:{properties:{duration:{minimum:10}}},then:{properties:{duration:{maximum:20}}}})
    expect(falVideoDurationLimits(self,{duration:5}).maximum).toBeUndefined()
  })
  it('converts exact frame limits with the selected declared FPS and re-evaluates when FPS changes',()=>{
    const c:FalSchemaContract={endpointId:'fixture/frames/text-to-video',schemaPath:'/fixture',category:'text-to-video',input:{type:'object',properties:{frames:{type:'integer',minimum:17,maximum:161,description:'Number of generated video frames.'},fps:{type:'integer',minimum:4,maximum:60,description:'Frames per second.'}}},output:{type:'object'}}
    c.runtime={...describeFalRuntimeInputs(c),fingerprint:'frames'}
    expect(falVideoDurationLimits(c,{frames:120,fps:24})).toMatchObject({minimum:17/24,maximum:161/24,selectedSeconds:5})
    expect(falVideoDurationLimits(c,{frames:120,fps:60}).maximum).toBe(161/60)
    expect(falVideoDurationLimits(c,{frames:120,fps:61}).error).toContain('frame rate')
    expect(falVideoDurationLimits(c,{frames:120,fps:0}).maximum).toBeUndefined()
  })
  it('does not assign Wan limits to unknown model IDs and keeps all registered native choices covered',()=>{
    expect(generatorVideoDurationLimits({videoEngine:'not/a/registered/model' as never,duration:5}).maximum).toBeUndefined()
    for(const model of VIDEO_MODELS){
      const limits=generatorVideoDurationLimits({videoEngine:model.id as never,frameRate:24})
      expect(limits.maximum,model.id).toBeGreaterThan(0)
      expect(limits.minimum,model.id).toBeLessThanOrEqual(limits.maximum!)
    }
    expect(generatorVideoDurationLimits({videoEngine:'wan-controlled',duration:6.5,frameRate:24})).toMatchObject({maximum:161/24,selectedSeconds:6.5,error:undefined})
    expect(generatorVideoDurationLimits({videoEngine:'wan-controlled',duration:5,frameRate:24.5}).maximum).toBeUndefined()
  })
})


describe('current independent Higgsfield timing', () => {
  it('reads native bounds/defaults and selected seconds without legacy duration or rounding', () => {
    const endpoint = 'bytedance/seedance-2.5/text-to-video', schema = higgsfieldSeedanceSchema(endpoint)
    schema.properties!.duration.maximum = 40; schema.properties!.duration.default = 8
    const contract = describeHiggsfieldInputContract(endpoint, schema, 'a'.repeat(64))
    const state = reconcileHiggsfieldNodeBinding({ ...selectHiggsfieldBinding({}, endpoint, []).higgsfieldNative, values: {} }, contract)
    const data = { videoEngine: 'wan-controlled' as const, duration: 1, higgsfieldNative: state }, before = JSON.stringify(data)
    expect(generatorVideoDurationLimits(data, undefined, contract)).toMatchObject({ minimum: 4, maximum: 40, selectedSeconds: 4 })
    expect(generatorVideoDurationLimits(data, undefined, contract).error).toBeUndefined()
    expect(videoMaximumLabel(generatorVideoDurationLimits(data, undefined, contract))).toBe('Max 40s')
    expect(generatorVideoDurationLimits({ ...data, higgsfieldNative: { ...state, values: { duration: 4.5 } } }, undefined, contract)).toMatchObject({ selectedSeconds: 4.5, error: expect.stringContaining('unsupported') })
    expect(JSON.stringify(data)).toBe(before)
    expect(generatorVideoDurationLimits(data, undefined, { ...contract, fingerprint: 'b'.repeat(64) }).maximum).toBeUndefined()
    const generator = { id: 'video', data: { kind: 'video-generator', ...data }, position: { x: 0, y: 0 } } as StudioNode
    const connected = connectedStoryboardVideo([generator], [{ id: 'edge', source: 'storyboard', target: 'video', targetHandle: 'storyboard-in' }], 'storyboard', undefined, () => contract)
    expect(connected).toMatchObject({ modelId: endpoint, duration: 4, minimumSeconds: 4, maximumSeconds: 40 })
  })
  it('does not invent generated-clip bounds for source-timed Edit', () => {
    const endpoint = 'bytedance/seedance-2.5/video-edit'
    const contract = describeHiggsfieldInputContract(endpoint, higgsfieldSeedanceSchema(endpoint), 'a'.repeat(64))
    const state = reconcileHiggsfieldNodeBinding(selectHiggsfieldBinding({}, endpoint, []).higgsfieldNative, contract)
    const limits = generatorVideoDurationLimits({ higgsfieldNative: state }, undefined, contract)
    expect(limits.selectedSeconds).toBeUndefined(); expect(limits.maximum).toBeUndefined()
    expect(limits.error).toContain('source-video timing')
    expect(generatorVideoDurationLimits({ higgsfieldNative: { ...state, endpointId: 'retired/route' } }).error).toContain('saved Higgsfield route')
  })
})
