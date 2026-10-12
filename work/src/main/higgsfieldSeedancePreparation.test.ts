import { describe, it, expect, vi } from 'vitest'
import { HIGGSFIELD_SEEDANCE_INPUT_REVISION, type HiggsfieldSeedanceInputRequest, type HiggsfieldSeedanceSource } from '../shared/higgsfieldSeedanceInput'
import { prepareHiggsfieldSeedanceMedia, materializePreparedHiggsfieldSeedance, HIGGSFIELD_SEEDANCE_LOCAL_BUDGET } from './higgsfieldSeedancePreparation'

const local = (mediaType: 'image'|'video'|'audio', index = 0) => ({ mediaType, path: `/fixture/${mediaType}-${index}` })
const request = (mode = 'reference-to-video', media: HiggsfieldSeedanceInputRequest['media'] = { image_urls: [local('image')] }, values: HiggsfieldSeedanceInputRequest['values'] = {}): HiggsfieldSeedanceInputRequest => ({ endpointId: `bytedance/seedance-2.5/${mode}`, inputRevision: HIGGSFIELD_SEEDANCE_INPUT_REVISION, values, media })
function dependencies() {
  const events: string[] = []
  const inspect = vi.fn(async (source: HiggsfieldSeedanceSource) => {
    events.push(`inspect:${source.path}`)
    return { source: {...source}, byteLength: 3, contentType: source.mediaType === 'image' ? 'image/png' : source.mediaType === 'video' ? 'video/mp4' : 'audio/wav' }
  })
  const read = vi.fn(async (inspection: Awaited<ReturnType<typeof inspect>>) => { events.push(`read:${inspection.source.path}`); return new Uint8Array([1,2,3]) })
  const validate = vi.fn(async () => { events.push('validate') })
  return { events, inspect, read, validate, assertCurrent: vi.fn() }
}

describe('main-owned Higgsfield Seedance media preparation', () => {
  it('requires a main audio preparer, bounds derivative peak, and converts repeated or multiple MP3s without an artificial count cap',async()=>{
    const deps=dependencies()
    deps.inspect.mockImplementation(async source=>({source,byteLength:3,contentType:'audio/mpeg'}))
    const prepareAudio=vi.fn(async()=>({bytes:new Uint8Array([4,5,6,7]),contentType:'audio/wav' as const}))
    const sources=[local('audio'),local('audio')]
    const prepared=await prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:sources}),{...deps,prepareAudio})
    expect(prepareAudio).toHaveBeenCalledOnce();expect(prepared.media[0]).toBe(prepared.media[1])
    expect(prepared.media[0]).toMatchObject({source:local('audio'),contentType:'audio/wav',bytes:new Uint8Array([4,5,6,7])})
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:Array.from({length:10},(_,i)=>local('audio',i))}),{...deps,prepareAudio})).resolves.toMatchObject({media:expect.any(Array)})
    expect(prepareAudio).toHaveBeenCalledTimes(11)
    const crowded=dependencies();crowded.inspect.mockImplementation(async source=>({source,byteLength:(source.mediaType==='video'?200:source.mediaType==='image'?64:48)*1024*1024,contentType:source.mediaType==='video'?'video/mp4':source.mediaType==='image'?'image/png':'audio/mpeg'}))
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{video_urls:[local('video',0),local('video',1)],image_urls:[local('image')],audio_urls:[local('audio')]}),{...crowded,prepareAudio})).rejects.toThrow(/aggregate local/)
    expect(crowded.read).not.toHaveBeenCalled();expect(crowded.validate).not.toHaveBeenCalled()
  })
  it('rejects malformed derivative, conversion failure, canceled or stale ownership before validation',async()=>{
    for(const derivative of [{bytes:new Uint8Array(),contentType:'audio/wav'},{bytes:new Uint8Array([4]),contentType:'audio/mpeg'},{bytes:new Uint8Array(65*1024*1024),contentType:'audio/wav'}]){
      const deps=dependencies();deps.inspect.mockImplementation(async source=>({source,byteLength:3,contentType:'audio/mpeg'}))
      await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:[local('audio')]}),{...deps,prepareAudio:async()=>derivative as any})).rejects.toThrow(/bounded actual WAV/)
      expect(deps.validate).not.toHaveBeenCalled()
    }
    const deps=dependencies();deps.inspect.mockImplementation(async source=>({source,byteLength:3,contentType:'audio/mpeg'}))
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:[local('audio')]}),{...deps,prepareAudio:async()=>{throw Error('Decoder failed')}})).rejects.toThrow(/Decoder failed/)
    expect(deps.validate).not.toHaveBeenCalled()
    const controller=new AbortController()
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:[local('audio')]}),{...deps,prepareAudio:async()=>{controller.abort(Error('Canceled conversion'));return {bytes:new Uint8Array([4]),contentType:'audio/wav'}}},controller.signal)).rejects.toThrow(/Canceled conversion/)
    expect(deps.validate).not.toHaveBeenCalled()
    let current=true
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:[local('audio')]}),{...deps,assertCurrent:()=>{if(!current)throw Error('Owner changed')},prepareAudio:async()=>{current=false;return {bytes:new Uint8Array([4]),contentType:'audio/wav'}}})).rejects.toThrow(/Owner changed/)
    expect(deps.validate).not.toHaveBeenCalled()
  })
  it('inspects the complete unique local set before reading; preserves all50 ordered assignments and duplicate slots', async () => {
    const deps = dependencies()
    const prepared = await prepareHiggsfieldSeedanceMedia(request('reference-to-video', {
      image_urls: Array.from({length:30},()=>local('image')), video_urls: Array.from({length:10},(_,i)=>local('video',i)), audio_urls: Array.from({length:10},(_,i)=>local('audio',i)),
    }), deps)
    expect(deps.inspect).toHaveBeenCalledTimes(21)
    expect(deps.read).toHaveBeenCalledTimes(21)
    expect(deps.events.slice(0,21).every(item=>item.startsWith('inspect:'))).toBe(true)
    expect(prepared.media).toHaveLength(50)
    expect(prepared.media[0]).toBe(prepared.media[29])
    const wire = materializePreparedHiggsfieldSeedance(prepared, prepared.media.map((_,i)=>`https://cdn.prism.example/slot-${i}`))
    expect(wire.image_urls).toHaveLength(30)
    expect(wire.video_urls).toHaveLength(10)
    expect(wire.audio_urls).toHaveLength(10)
  })
  it('rejects aggregate local size before reading the first byte', async () => {
    const deps=dependencies()
    deps.inspect.mockImplementation(async source=>({source,byteLength:200*1024*1024,contentType:'video/mp4'}))
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{video_urls:[local('video',0),local('video',1),local('video',2)]}),deps)).rejects.toThrow(/aggregate local/)
    expect(deps.read).not.toHaveBeenCalled()
    expect(deps.validate).not.toHaveBeenCalled()
    expect(HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.totalBytes).toBe(512*1024*1024)
  })
  it.each(['audio/mpeg','audio/ogg','audio/mp4','video/quicktime'])('rejects unverified local upload type %s without converting it',async contentType=>{
    const deps=dependencies(),type=contentType.startsWith('audio')?'audio':'video'
    deps.inspect.mockImplementation(async source=>({source,byteLength:3,contentType}))
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{[`${type}_urls`]:[local(type)]}),deps)).rejects.toThrow(/supported upload format/)
    expect(deps.read).not.toHaveBeenCalled()
  })
  it.each(['audio/wav','audio/x-wav'])('retains supported %s and requires content validation',async contentType=>{
    const deps=dependencies()
    deps.inspect.mockImplementation(async source=>({source,byteLength:3,contentType}))
    const prepared=await prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:[local('audio')]}),deps)
    expect(prepared.media[0].contentType).toBe(contentType)
    expect(deps.validate).toHaveBeenCalledTimes(1)
    deps.validate.mockRejectedValue(new Error('Not decodable WAV'))
    await expect(prepareHiggsfieldSeedanceMedia(request('reference-to-video',{audio_urls:[local('audio')]}),deps)).rejects.toThrow(/decodable/)
  })
  it('never inspects/downloads remote references, nor infers their duration or trimming consent',async()=>{
    const deps=dependencies(),source={mediaType:'video' as const,url:'https://cdn.prism.example/source.mp4?exact=1'}
    const prepared=await prepareHiggsfieldSeedanceMedia(request('video-edit',{video_url:[source]},{prompt:'Preserve exact action.'}),deps)
    expect(deps.inspect).not.toHaveBeenCalled();expect(deps.read).not.toHaveBeenCalled();expect(deps.validate).not.toHaveBeenCalled()
    expect(prepared.media[0]).toEqual({source})
    const wire=materializePreparedHiggsfieldSeedance(prepared,[source.url])
    expect(wire).not.toHaveProperty('duration');expect(wire).not.toHaveProperty('allowSourceTrimming');expect(wire).not.toHaveProperty('preset_id')
  })
  it('rejects changed prepared type/path, size and undecodable bytes before any transport',async()=>{
    for(const bad of [ {source:local('video'),byteLength:3,contentType:'video/mp4'}, {source:local('image',1),byteLength:3,contentType:'image/png'}, {source:local('image'),byteLength:NaN,contentType:'image/png'}, {source:local('image'),byteLength:0,contentType:'image/png'} ]){
      const deps=dependencies();deps.inspect.mockResolvedValue(bad)
      await expect(prepareHiggsfieldSeedanceMedia(request(),deps)).rejects.toThrow()
      expect(deps.read).not.toHaveBeenCalled()
    }
    const deps=dependencies();deps.read.mockResolvedValue(new Uint8Array([1]))
    await expect(prepareHiggsfieldSeedanceMedia(request(),deps)).rejects.toThrow(/changed during/)
    expect(deps.validate).not.toHaveBeenCalled()
  })
  it('cancels or loses its account/project owner before the next preparation step',async()=>{
    const deps=dependencies(),controller=new AbortController()
    deps.inspect.mockImplementation(async source=>{controller.abort(new Error('Canceled'));return {source,byteLength:3,contentType:'image/png'}})
    await expect(prepareHiggsfieldSeedanceMedia(request(),deps,controller.signal)).rejects.toThrow(/Canceled/)
    expect(deps.read).not.toHaveBeenCalled()
    const changed=dependencies();changed.assertCurrent.mockImplementationOnce(()=>{}).mockImplementation(()=>{throw Error('Owner changed')})
    await expect(prepareHiggsfieldSeedanceMedia(request(),changed)).rejects.toThrow(/Owner changed/)
    expect(changed.read).not.toHaveBeenCalled()
  })
  it('uses the snapshot despite caller changes during inspection',async()=>{
    const deps=dependencies(),original=request('image-to-video',{image_url:[local('image')]},{prompt:'Original action.'})
    deps.inspect.mockImplementation(async source=>{original.values.prompt='Later edit.';original.media.image_url[0].path='/fixture/changed';return {source,byteLength:3,contentType:'image/png'}})
    const prepared=await prepareHiggsfieldSeedanceMedia(original,deps)
    expect(prepared.media[0].source.path).toBe('/fixture/image-0')
    expect(materializePreparedHiggsfieldSeedance(prepared,['https://cdn.prism.example/image']).prompt).toBe('Original action.')
  })
})
