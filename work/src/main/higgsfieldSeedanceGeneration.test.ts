import { describe,it,expect,vi } from 'vitest'
import { executeHiggsfieldSeedanceGeneration } from './higgsfieldSeedanceGeneration'
import { HIGGSFIELD_SEEDANCE_INPUT_REVISION, type HiggsfieldSeedanceInputRequest } from '../shared/higgsfieldSeedanceInput'
import { type HiggsfieldSeedanceSource } from '../shared/higgsfieldSeedanceInput'

const source=(mediaType:HiggsfieldSeedanceSource['mediaType'],index=0):HiggsfieldSeedanceSource=>({mediaType,path:`/fixture/${mediaType}-${index}`})
const request=(mode='reference-to-video',values:HiggsfieldSeedanceInputRequest['values']={},media:HiggsfieldSeedanceInputRequest['media']={image_urls:[source('image')]}):HiggsfieldSeedanceInputRequest=>({endpointId:`bytedance/seedance-2.5/${mode}`,inputRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,values,media})
function dependencies() {
  const events:string[]=[]
  const upload=vi.fn(async(_bytes:Uint8Array,_type:string)=>{events.push('upload');return `https://cdn.prism.example/upload-${events.length}`})
  const generate=vi.fn(async(endpointId:string,input:Record<string,unknown>)=>{events.push('generate');return {requestId:'fixture-job',url:'https://cdn.prism.example/Output.mp4',contentType:'video/mp4'}})
  const api=vi.fn(async()=>{events.push('api');return {upload,generate}})
  const validateInput=vi.fn(async()=>{events.push('contract')})
  const persist=vi.fn(async()=>{events.push('persist');return {path:'/fixture/Output.mp4',url:'prism-asset://fixture/Output.mp4'}})
  return {events,upload,generate,api,validateInput,persist,assertCurrent:vi.fn(),
    inspect:vi.fn(async(source:HiggsfieldSeedanceSource)=>{events.push('inspect');return {source,byteLength:3,contentType:source.mediaType==='image'?'image/png':source.mediaType==='video'?'video/mp4':'audio/wav'}}),
    read:vi.fn(async()=>{events.push('read');return new Uint8Array([1,2,3])}),validate:vi.fn(async()=>{events.push('content')}),
  }
}
describe('Higgsfield Seedance mode-owned execution composition (mock transport)',()=>{
  it.each(['text-to-video','image-to-video','reference-to-video','video-extend','video-edit'])('uses only %s input fields and its exact authored body',async mode=>{
    const deps=dependencies();const media:HiggsfieldSeedanceInputRequest['media']=mode==='text-to-video'?{}:mode==='image-to-video'?{image_url:[source('image')]}:mode==='reference-to-video'?{audio_urls:[source('audio')]}:{video_url:[source('video')]}
    const values={prompt:'  Exact author text\r\nAction.  ',...(mode==='video-edit'?{}:{duration:4}),generate_audio:false}
    const result=await executeHiggsfieldSeedanceGeneration(request(mode,values,media),deps)
    expect(deps.generate).toHaveBeenCalledTimes(1)
    const [route,wire]=deps.generate.mock.calls[0]
    expect(route).toBe(`bytedance/seedance-2.5/${mode}`)
    expect(wire.prompt).toBe(values.prompt);expect(wire.generate_audio).toBe(false)
    expect(wire).not.toHaveProperty('preset_id');expect(wire).not.toHaveProperty('allowSourceTrimming')
    if(mode==='video-edit')expect(wire).not.toHaveProperty('duration')
    expect(result).toMatchObject({modelId:route,outputType:'video',outputPath:'/fixture/Output.mp4'})
    expect(deps.events[0]).toBe('contract')
    expect(deps.events.indexOf('api')).toBeGreaterThan(deps.events.lastIndexOf('content'))
    expect(deps.events[deps.events.indexOf('generate')-1]).toBe('contract')
    expect(deps.persist).toHaveBeenCalledOnce()
  })
  it('rejects excessive authored input before metadata/client and excessive materialized input before submission',async()=>{
    const deps=dependencies()
    await expect(executeHiggsfieldSeedanceGeneration(request('text-to-video',{prompt:'x'.repeat(1024*1024+1)},{}),deps)).rejects.toThrow(/protected request capacity/)
    expect(deps.inspect).not.toHaveBeenCalled();expect(deps.api).not.toHaveBeenCalled()
    const uploaded=dependencies();uploaded.upload.mockResolvedValue('https://cdn.prism.example/'+'x'.repeat(8000))
    await expect(executeHiggsfieldSeedanceGeneration(request('reference-to-video',{prompt:'x'.repeat(750000)},{image_urls:Array.from({length:30},()=>source('image')),video_urls:Array.from({length:10},()=>source('video')),audio_urls:Array.from({length:10},()=>source('audio'))}),uploaded)).rejects.toThrow(/materialized inputs exceed/)
    expect(uploaded.upload).toHaveBeenCalledTimes(3);expect(uploaded.generate).not.toHaveBeenCalled();expect(uploaded.persist).not.toHaveBeenCalled()
  })
  it('rejects removed current controls before metadata, client creation or upload',async()=>{
    const deps=dependencies();deps.validateInput.mockRejectedValue(Error('Current contract removed input'))
    await expect(executeHiggsfieldSeedanceGeneration(request(),deps)).rejects.toThrow(/Current contract/)
    expect(deps.inspect).not.toHaveBeenCalled();expect(deps.api).not.toHaveBeenCalled();expect(deps.upload).not.toHaveBeenCalled()
  })
  it('revalidates the current input after materialization and never submits if it changed',async()=>{
    const deps=dependencies();deps.validateInput.mockImplementation(async()=>{if(deps.upload.mock.calls.length)throw Error('Contract changed during upload')})
    await expect(executeHiggsfieldSeedanceGeneration(request(),deps)).rejects.toThrow(/Contract changed/)
    expect(deps.upload).toHaveBeenCalledOnce();expect(deps.generate).not.toHaveBeenCalled();expect(deps.persist).not.toHaveBeenCalled()
  })
  it('retains50slots but uploads each repeated managed source only once',async()=>{
    const deps=dependencies()
    await executeHiggsfieldSeedanceGeneration(request('reference-to-video',{prompt:'Original.'},{image_urls:Array.from({length:30},()=>source('image')),video_urls:Array.from({length:10},()=>source('video')),audio_urls:Array.from({length:10},()=>source('audio'))}),deps)
    expect(deps.upload).toHaveBeenCalledTimes(3)
    const wire=deps.generate.mock.calls[0][1]
    expect(wire.image_urls).toHaveLength(30);expect(new Set(wire.image_urls as string[]).size).toBe(1)
    expect(wire.video_urls).toHaveLength(10);expect(wire.audio_urls).toHaveLength(10)
  })
  it('retains remote URLs exactly with no media fetch/upload or inferred source trimming',async()=>{
    const deps=dependencies(),url='https://cdn.prism.example/Original.mp4?Signature=Exact%2Fbytes'
    await executeHiggsfieldSeedanceGeneration(request('video-edit',{prompt:'Change only wardrobe.'},{video_url:[{mediaType:'video',url}]}),deps)
    expect(deps.inspect).not.toHaveBeenCalled();expect(deps.upload).not.toHaveBeenCalled()
    expect(deps.generate.mock.calls[0][1].video_url).toBe(url)
  })
  it('rejects an unsafe first upload URL before uploading further inputs',async()=>{
    const deps=dependencies();deps.upload.mockResolvedValue('https://127.0.0.1/unsafe')
    await expect(executeHiggsfieldSeedanceGeneration(request('reference-to-video',{}, {image_urls:[source('image',0),source('image',1)]}),deps)).rejects.toThrow(/private/)
    expect(deps.upload).toHaveBeenCalledOnce();expect(deps.generate).not.toHaveBeenCalled()
  })
  it('preserves the original private snapshot when caller fields change during preparation',async()=>{
    const deps=dependencies(),original=request('image-to-video',{prompt:'Original.'},{image_url:[source('image')]})
    deps.inspect.mockImplementation(async item=>{original.values.prompt='Later edit';return {source:item,byteLength:3,contentType:'image/png'}})
    await executeHiggsfieldSeedanceGeneration(original,deps)
    expect(deps.generate.mock.calls[0][1].prompt).toBe('Original.')
  })
  it('stops before client creation on content failure and during upload on owner/cancellation changes',async()=>{
    const invalid=dependencies();invalid.validate.mockRejectedValue(Error('Undecodable WAV'))
    await expect(executeHiggsfieldSeedanceGeneration(request('reference-to-video',{}, {audio_urls:[source('audio')]}),invalid)).rejects.toThrow(/Undecodable/)
    expect(invalid.api).not.toHaveBeenCalled()
    const deps=dependencies(),controller=new AbortController();deps.upload.mockImplementation(async()=>{controller.abort(Error('Canceled'));return 'https://cdn.prism.example/upload'})
    await expect(executeHiggsfieldSeedanceGeneration(request(),deps,controller.signal)).rejects.toThrow(/Canceled/)
    expect(deps.generate).not.toHaveBeenCalled();expect(deps.persist).not.toHaveBeenCalled()
  })
})
