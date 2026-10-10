import {describe,it,expect,vi} from 'vitest'
import {HIGGSFIELD_CONTRACT_REVISION,planHiggsfieldInput,materializeHiggsfieldInput,isHiggsfieldRemoteUncertainty,type HiggsfieldNativeRequest} from './higgsfieldNative'
import {executeHiggsfieldGeneration} from '../main/higgsfieldGeneration'
import {HiggsfieldApi} from '../main/higgsfieldApi'
import {assertGenerationRequirements} from './generationReadiness'
import {generationServiceProvider,generationExecutionIdentity} from './generationServiceProvider'
const id='higgsfield/genjutsu/motion-transfer/v1.0',preset='11111111-1111-1111-1111-111111111111'
const request=(images=1,endpointId=id):HiggsfieldNativeRequest=>({endpointId,contractRevision:HIGGSFIELD_CONTRACT_REVISION,values:{prompt:'  Exact\r\nauthored master  '},media:{video_url:[{path:'/managed/source.mp4',mediaType:'video'}],image_urls:Array.from({length:images},(_,i)=>({path:`/managed/${i}.png`,mediaType:'image'}))}})
function dependencies(info={duration:8,width:1280,height:720}){
 const api={presets:vi.fn(async()=>[{id:preset,name:'Style'}]),upload:vi.fn(async(_bytes,type)=>`https://media.example/${type==='video/mp4'?'source.mp4':`image${api.upload.mock.calls.length}.png`}`),generate:vi.fn(async(_endpointId:string,_input:Record<string,unknown>,_signal?:AbortSignal)=>({requestId:'fixture',url:'https://media.example/output.mp4'}))}
 return {apiClient:api,assertCurrent:vi.fn(),prepare:vi.fn(async source=>({source:{...source},bytes:new Uint8Array([1]),contentType:source.mediaType==='video'?'video/mp4':'image/png',...(source.mediaType==='video'?{videoInfo:info}:{})})),api:vi.fn(async()=>api as unknown as HiggsfieldApi),persist:vi.fn(async()=>({path:'/managed/output.mp4',url:'prism://output'}))}
}
describe('independent native Genjutsu request fidelity',()=>{
 it('preserves empty and authored prompts exactly, including defaults only for absent controls',()=>{
  for(const prompt of ['', '  Exact\r\nauthored master  ']){const input=request();input.values.prompt=prompt;const before=JSON.stringify(input),plan=planHiggsfieldInput(input),body=materializeHiggsfieldInput(plan,'https://media.example/source.mp4',['https://media.example/a.png']);expect(body).toEqual({prompt,resolution:'720p',video_url:'https://media.example/source.mp4',image_urls:['https://media.example/a.png']});expect(JSON.stringify(input)).toBe(before)}
  const input=request();input.values={resolution:'1080p'};expect(planHiggsfieldInput(input).values).toEqual({prompt:'',resolution:'1080p'})
 })
 it('enforces motion/object1–8 and restyle0–5 images with no silent dropping or fallback',()=>{
  for(const endpoint of [id,'higgsfield/genjutsu/object-swap/v1.0']){expect(planHiggsfieldInput(request(8,endpoint)).images).toHaveLength(8);for(const count of [0,9])expect(()=>planHiggsfieldInput(request(count,endpoint))).toThrow(/image references/)}
  for(const count of [0,5]){const input=request(count,'higgsfield/genjutsu/restyle/v1.0');input.values.preset_id=preset;expect(planHiggsfieldInput(input).images).toHaveLength(count)}
  const overloaded=request(6,'higgsfield/genjutsu/restyle/v1.0');overloaded.values.preset_id=preset;expect(()=>planHiggsfieldInput(overloaded)).toThrow(/image references/)
 })
 it('rejects unsupported route/control/null/mode/saved revision without changing input',()=>{
  for(const update of [{endpointId:'higgsfield/cinema-studio/4.0'},{contractRevision:'old'},{values:{prompt:null}},{values:{seed:0}},{values:{resolution:'4k'}},{values:{preset_id:preset}}]){const input={...request(),...update} as HiggsfieldNativeRequest,before=JSON.stringify(input);expect(()=>planHiggsfieldInput(input)).toThrow();expect(JSON.stringify(input)).toBe(before)}
 })
 it('rejects wrong media type, ambiguous transport/private URI and missing source before a client or file preparation',async()=>{
  for(const source of [{path:'/managed/image.png',mediaType:'image'},{path:'/managed/source.mp4',url:'https://media.example/source.mp4',mediaType:'video'},{url:'https://127.0.0.1/source.mp4',mediaType:'video'}]){const input=request();input.media.video_url=[source as never];const d=dependencies();await expect(executeHiggsfieldGeneration(input,d)).rejects.toThrow();expect(d.prepare).not.toHaveBeenCalled();expect(d.api).not.toHaveBeenCalled()}
 })
 it('uses its own provider identity and accepts an intentionally empty prompt, without a fal fallback',()=>{
  const input=request();input.values.prompt='';const outer={nodeId:'n',kind:'video-generator' as const,prompt:'',higgsfieldNative:input}
  expect(generationServiceProvider(outer)).toBe('higgsfield');expect(generationExecutionIdentity(outer)).toEqual({executionProvider:'higgsfield',modelVendor:'higgsfield'});expect(()=>assertGenerationRequirements(outer)).not.toThrow()
  expect(()=>assertGenerationRequirements({...outer,kind:'voiceover'})).toThrow(/one Higgsfield video route/)
  expect(()=>assertGenerationRequirements({...outer,storyboardShots:[{prompt:'Beat',duration:5,shotSize:'wide',camera:'static'}]})).toThrow(/source video/)
 })
 it('submits the stable full8-reference order and excludes all local transport/intention metadata',async()=>{
  const input=request(8),before=JSON.stringify(input),d=dependencies();expect(await executeHiggsfieldGeneration(input,d)).toMatchObject({modelId:id,outputType:'video',outputPath:'/managed/output.mp4'})
  const body=d.apiClient.generate.mock.calls[0][1];expect(body.image_urls).toHaveLength(8);expect(body.image_urls).toEqual(Array.from({length:8},(_,i)=>`https://media.example/image${i+2}.png`));expect(body.prompt).toBe(input.values.prompt);expect(Object.keys(body).sort()).toEqual(['image_urls','prompt','resolution','video_url']);expect(d.persist).toHaveBeenCalledOnce();expect(JSON.stringify(input)).toBe(before)
 })
 it('counts repeated reference slots while uploading each identical canonical path only once',async()=>{
  const input=request(2);input.media.image_urls[1].path=input.media.image_urls[0].path;const d=dependencies();await executeHiggsfieldGeneration(input,d);expect(d.apiClient.upload).toHaveBeenCalledTimes(2);expect(d.apiClient.generate.mock.calls[0][1].image_urls).toEqual(['https://media.example/image2.png','https://media.example/image2.png'])
 })
 it.each([{duration:3,width:1280,height:720},{duration:31,width:1280,height:720}])('validates source timing before credentials/upload (%j)',async info=>{
  const d=dependencies(info);await expect(executeHiggsfieldGeneration(request(),d)).rejects.toThrow();expect(d.api).not.toHaveBeenCalled();expect(d.apiClient.upload).not.toHaveBeenCalled()
 })
 it('enforces the owned Object Swap pixel floor and permits explicit source trimming without a provider field',async()=>{
  const low=dependencies({duration:8,width:640,height:480});await expect(executeHiggsfieldGeneration(request(1,'higgsfield/genjutsu/object-swap/v1.0'),low)).rejects.toThrow(/409600/);expect(low.api).not.toHaveBeenCalled()
  const input=request();input.allowSourceTrimming=true;const d=dependencies({duration:31,width:1280,height:720});await executeHiggsfieldGeneration(input,d);expect(d.apiClient.generate.mock.calls[0][1].allowSourceTrimming).toBeUndefined()
 })
 it('retains an unavailable preset and blocks before upload, including retirement during preparation',async()=>{
  const input=request(0,'higgsfield/genjutsu/restyle/v1.0');input.values.preset_id=preset;const before=JSON.stringify(input),d=dependencies();d.apiClient.presets.mockResolvedValue([]);await expect(executeHiggsfieldGeneration(input,d)).rejects.toThrow(/no longer available/);expect(d.apiClient.upload).not.toHaveBeenCalled();expect(d.apiClient.generate).not.toHaveBeenCalled();expect(JSON.stringify(input)).toBe(before)
  const changed=dependencies();changed.apiClient.presets.mockResolvedValueOnce([{id:preset,name:'Style'}]).mockResolvedValueOnce([]);await expect(executeHiggsfieldGeneration(input,changed)).rejects.toThrow(/changed during preparation/);expect(changed.apiClient.generate).not.toHaveBeenCalled()
 })
 it('permits Restyle with no character images and sends only the exact five inputs',async()=>{
  const input=request(0,'higgsfield/genjutsu/restyle/v1.0');input.values={prompt:'',preset_id:preset};const d=dependencies();await executeHiggsfieldGeneration(input,d);expect(d.apiClient.generate.mock.calls[0][1]).toEqual({prompt:'',preset_id:preset,resolution:'720p',video_url:'https://media.example/source.mp4',image_urls:[]});expect(d.apiClient.presets).toHaveBeenCalledTimes(2)
 })
 it('preserves remote URL order without fetching media or trusting supplied metadata',async()=>{
  const input=request();input.allowSourceTrimming=true;input.media={video_url:[{url:'https://media.example/source.mp4',mediaType:'video'}],image_urls:[{url:'https://media.example/a.png',mediaType:'image'}]};const d=dependencies();d.prepare.mockImplementation(async source=>({source:{...source}} as never));await executeHiggsfieldGeneration(input,d);expect(d.apiClient.upload).not.toHaveBeenCalled();expect(d.apiClient.generate.mock.calls[0][1].image_urls).toEqual(['https://media.example/a.png'])
 })
 it('never reduces remote uncertainty to a harmless local Stopped result after IPC serialization',()=>{
  expect(isHiggsfieldRemoteUncertainty('Stopped local waiting for Higgsfield request123; remote work may continue.')).toBe(true);expect(isHiggsfieldRemoteUncertainty('Higgsfield submission status is unknown.')).toBe(true);expect(isHiggsfieldRemoteUncertainty('Higgsfield queued request123 was canceled.')).toBe(false)
 })
})
