import {describe,it,expect,vi} from 'vitest'
import {execFileSync,type spawn} from 'node:child_process'
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import ffmpegPath from 'ffmpeg-static'
import {convertHiggsfieldMp3} from './higgsfieldAudioConversion'
import {inspectHiggsfieldWav} from './higgsfieldAudioInspection'
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {higgsfieldSeedanceManagedMedia} from './higgsfieldSeedanceManagedMedia'
import {executeHiggsfieldSeedanceGeneration} from './higgsfieldSeedanceGeneration'
import {executeHiggsfieldReferenceVideoGeneration} from './higgsfieldReferenceVideoGeneration'
import {HIGGSFIELD_SEEDANCE_INPUT_REVISION,higgsfieldSeedanceSchema} from '../shared/higgsfieldSeedanceInput'
import {HIGGSFIELD_REFERENCE_VIDEO_REVISION,higgsfieldReferenceVideoSchema} from '../shared/higgsfieldReferenceVideo'

function mp3(){return execFileSync(ffmpegPath!,['-hide_banner','-v','error','-f','lavfi','-i','sine=frequency=440:sample_rate=44100:duration=0.15','-ac','2','-c:a','libmp3lame','-f','mp3','pipe:1'],{timeout:10_000,maxBuffer:1024*1024})}
function decode(bytes:Uint8Array,format:string){return execFileSync(ffmpegPath!,['-hide_banner','-v','error','-xerror','-protocol_whitelist','pipe','-f',format,'-i','pipe:0','-map','0:a:0','-c:a','pcm_s16le','-f','s16le','pipe:1'],{input:bytes,timeout:10_000,maxBuffer:1024*1024})}
function fake(){
  const child=Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:vi.fn()})
  child.kill.mockImplementation(()=>{child.emit('close',null);return true})
  const start=vi.fn(()=>child) as unknown as typeof spawn
  return {child,start}
}

describe('bounded main-owned MP3 to actual WAV preparation',()=>{
  it('preserves decoded PCM samples,44100Hz stereo, complete duration and original MP3 bytes',async()=>{
    const source=mp3(),before=Buffer.from(source),wav=Buffer.from(await convertHiggsfieldMp3(source))
    expect(source).toEqual(before)
    expect(wav.toString('ascii',0,4)).toBe('RIFF');expect(wav.readUInt32LE(4)).toBe(wav.length-8)
    expect(wav.toString('ascii',12,16)).toBe('fmt ')
    expect(wav.readUInt16LE(22)).toBe(2);expect(wav.readUInt32LE(24)).toBe(44100)
    const originalPcm=decode(source,'mp3'),convertedPcm=decode(wav,'wav')
    expect(originalPcm.length).toBeGreaterThan(0);expect(convertedPcm).toEqual(originalPcm)
    await expect(inspectHiggsfieldWav(wav,'audio/wav')).resolves.toBeUndefined()
  })
  it('rejects empty, corrupt or WAV-disguised MP3 rather than accepting its label',async()=>{
    await expect(convertHiggsfieldMp3(new Uint8Array())).rejects.toThrow(/nonempty/)
    await expect(convertHiggsfieldMp3(Buffer.from('fictional invalid MP3'))).rejects.toThrow(/decodable/)
    const wav=await convertHiggsfieldMp3(mp3())
    await expect(convertHiggsfieldMp3(wav)).rejects.toThrow(/decodable/)
  })
  it('bounds the actual derivative and preserves the source when it cannot fit',async()=>{
    const source=mp3(),before=Buffer.from(source)
    await expect(convertHiggsfieldMp3(source,undefined,{maximumBytes:100})).rejects.toThrow(/size bound/)
    expect(source).toEqual(before)
  })
  it('uses fixed pipe-only decoder arguments with no path/filter/trimming/rate or channel change',async()=>{
    const {child,start}=fake(),promise=convertHiggsfieldMp3(Buffer.from([1]),undefined,{spawn:start,binary:'/fictional/ffmpeg'})
    const call=vi.mocked(start).mock.calls[0],args=call[1] as string[]
    expect(args).toEqual(expect.arrayContaining(['-protocol_whitelist','pipe','-f','mp3','pipe:0','pcm_s16le','wav','pipe:1']))
    for(const forbidden of ['-t','-to','-ss','-ar','-ac','-af'])expect(args).not.toContain(forbidden)
    child.emit('close',1)
    await expect(promise).rejects.toThrow(/decodable/)
  })
  it('kills an overflowed child and rejects all partial output',async()=>{
    const {child,start}=fake(),promise=convertHiggsfieldMp3(Buffer.from([1]),undefined,{spawn:start,binary:'/fictional/ffmpeg',maximumBytes:44})
    const assertion=expect(promise).rejects.toThrow(/size bound/)
    child.stdout.write(Buffer.alloc(45));await assertion
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
  })
  it('bounds stderr, handles EPIPE and never resolves after decoder failure',async()=>{
    const {child,start}=fake(),promise=convertHiggsfieldMp3(Buffer.from([1]),undefined,{spawn:start,binary:'/fictional/ffmpeg'})
    const assertion=expect(promise).rejects.toThrow(/diagnostics/)
    expect(()=>child.stdin.emit('error',Object.assign(Error('closed'),{code:'EPIPE'}))).not.toThrow()
    child.stderr.write(Buffer.alloc(64*1024+1));await assertion
    child.emit('close',0);expect(child.kill).toHaveBeenCalledOnce()
  })
  it('kills on cancellation and never starts for an already canceled request',async()=>{
    const {child,start}=fake(),controller=new AbortController()
    const promise=convertHiggsfieldMp3(Buffer.from([1]),controller.signal,{spawn:start,binary:'/fictional/ffmpeg'})
    const assertion=expect(promise).rejects.toThrow('User stopped')
    controller.abort(Error('User stopped'));await assertion;expect(child.kill).toHaveBeenCalledWith('SIGKILL')
    const before=vi.mocked(start).mock.calls.length
    await expect(convertHiggsfieldMp3(Buffer.from([1]),controller.signal,{spawn:start})).rejects.toThrow('User stopped')
    expect(vi.mocked(start).mock.calls).toHaveLength(before)
  })
  it('kills and settles on timeout rather than leaving an owned decoder running',async()=>{
    vi.useFakeTimers()
    try{
      const {child,start}=fake(),promise=convertHiggsfieldMp3(Buffer.from([1]),undefined,{spawn:start,binary:'/fictional/ffmpeg',timeoutMs:10})
      const assertion=expect(promise).rejects.toThrow(/time bound/)
      await vi.advanceTimersByTimeAsync(10);await assertion;expect(child.kill).toHaveBeenCalledWith('SIGKILL')
    }finally{vi.useRealTimers()}
  })
  it('reports missing binary/start failure and rejects invalid bounds before spawn',async()=>{
    await expect(convertHiggsfieldMp3(Buffer.from([1]),undefined,{binary:null})).rejects.toThrow(/unavailable/)
    const {child,start}=fake()
    await expect(convertHiggsfieldMp3(Buffer.from([1]),undefined,{spawn:start,maximumBytes:65*1024*1024})).rejects.toThrow(/bounds/)
    expect(start).not.toHaveBeenCalled()
    const promise=convertHiggsfieldMp3(Buffer.from([1]),undefined,{spawn:start,binary:'/fictional/ffmpeg'})
    child.emit('error',Error('ENOENT'));child.emit('close',-2)
    await expect(promise).rejects.toThrow(/could not run/)
  })
})

describe('actual codec and managed-file composition through both Higgsfield executors (isolated transports)',()=>{
  it.each(['seedance','reference'] as const)('%s uploads actual WAV once for repeated MP3 slots, preserves source and exact authored wire',async kind=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-mp3-executor-'))
    try{
      const path=join(directory,'Speech.mp3'),source=mp3();await writeFile(path,source)
      const endpointId=kind==='seedance'?'bytedance/seedance-2.5/reference-to-video':'minimax/h3/reference-to-video'
      const managed=higgsfieldSeedanceManagedMedia({assertCurrent:()=>{},assertManagedPath:async p=>p,mimeFor:()=> 'audio/mpeg'})
      const prepareAudio=vi.fn(managed.prepareAudio!),upload=vi.fn(async(bytes:Uint8Array,mime:string)=>{
        expect(mime).toBe('audio/wav');await inspectHiggsfieldWav(bytes,mime)
        expect(decode(bytes,'wav')).toEqual(decode(source,'mp3'))
        return 'https://cdn.prism.example/Converted.wav'
      })
      const generate=vi.fn(async()=>({requestId:'fictional-request',url:'https://cdn.prism.example/Output.mp4',contentType:'video/mp4'}))
      const dependencies={...managed,prepareAudio,inputSchema:kind==='seedance'?higgsfieldSeedanceSchema(endpointId):higgsfieldReferenceVideoSchema(endpointId),validateInput:vi.fn(async()=>{}),api:vi.fn(async()=>({upload,generate})),persist:vi.fn(async()=>({path:'/fixture/Output.mp4',url:'prism-asset://fixture/Output.mp4'}))}
      const prompt='  Exact recorded dialogue.\r\nKeep pauses and timing.  ',media={...(kind==='reference'?{image_urls:[{mediaType:'image' as const,url:'https://cdn.prism.example/Image.png'}],video_urls:[{mediaType:'video' as const,url:'https://cdn.prism.example/Video.mp4'}]}:{}),audio_urls:[{mediaType:'audio' as const,path},{mediaType:'audio' as const,path}]},fingerprint='a'.repeat(64)
      if(kind==='seedance')await executeHiggsfieldSeedanceGeneration({endpointId,inputRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,fingerprint,values:{prompt,generate_audio:true},media},dependencies)
      else await executeHiggsfieldReferenceVideoGeneration({endpointId,contractRevision:HIGGSFIELD_REFERENCE_VIDEO_REVISION,fingerprint,values:{prompt},media},dependencies)
      expect(prepareAudio).toHaveBeenCalledOnce();expect(upload).toHaveBeenCalledOnce()
      expect(generate).toHaveBeenCalledWith(endpointId,expect.objectContaining({prompt,audio_urls:['https://cdn.prism.example/Converted.wav','https://cdn.prism.example/Converted.wav']}),undefined,dependencies.inputSchema)
      expect(dependencies.persist).toHaveBeenCalledOnce()
      expect(await readFile(path)).toEqual(source);expect(await readdir(directory)).toEqual(['Speech.mp3'])
    }finally{await rm(directory,{recursive:true,force:true})}
  })
  it.each(['seedance','reference'] as const)('%s refuses corrupt MP3 before client, upload, journal transport or result persistence',async kind=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-mp3-invalid-'))
    try{
      const path=join(directory,'Speech.mp3');await writeFile(path,'fictional invalid MP3')
      const endpointId=kind==='seedance'?'bytedance/seedance-2.5/reference-to-video':'minimax/h3/reference-to-video'
      const upload=vi.fn(),generate=vi.fn(),api=vi.fn(async()=>({upload,generate})),persist=vi.fn()
      const dependencies={...higgsfieldSeedanceManagedMedia({assertCurrent:()=>{},assertManagedPath:async p=>p,mimeFor:()=> 'audio/mpeg'}),inputSchema:kind==='seedance'?higgsfieldSeedanceSchema(endpointId):higgsfieldReferenceVideoSchema(endpointId),validateInput:vi.fn(async()=>{}),api,persist}
      const media={...(kind==='reference'?{image_urls:[{mediaType:'image' as const,url:'https://cdn.prism.example/Image.png'}],video_urls:[{mediaType:'video' as const,url:'https://cdn.prism.example/Video.mp4'}]}:{}),audio_urls:[{mediaType:'audio' as const,path}]},fingerprint='a'.repeat(64),values={prompt:'Exact authored request.'}
      const result=kind==='seedance'?executeHiggsfieldSeedanceGeneration({endpointId,inputRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,fingerprint,values,media},dependencies):executeHiggsfieldReferenceVideoGeneration({endpointId,contractRevision:HIGGSFIELD_REFERENCE_VIDEO_REVISION,fingerprint,values,media},dependencies)
      await expect(result).rejects.toThrow(/decodable/)
      expect(api).not.toHaveBeenCalled();expect(upload).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();expect(persist).not.toHaveBeenCalled()
      expect(await readFile(path,'utf8')).toBe('fictional invalid MP3');expect(await readdir(directory)).toEqual(['Speech.mp3'])
    }finally{await rm(directory,{recursive:true,force:true})}
  })
})
