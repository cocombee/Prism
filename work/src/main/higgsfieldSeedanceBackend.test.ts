import {describe,it,expect,vi} from 'vitest'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {HiggsfieldApi} from './higgsfieldApi'
import {HiggsfieldJobStore,higgsfieldCredentialIdentity} from './higgsfieldJobStore'
import {beginHiggsfieldJob,openHiggsfieldJobSnapshot,openHiggsfieldSubmission,higgsfieldJobSnapshot} from './higgsfieldJobLifecycle'
import {HIGGSFIELD_SEEDANCE_INPUT_REVISION} from '../shared/higgsfieldSeedanceInput'
import {planHiggsfieldNativeInput,type HiggsfieldNativeRequest} from '../shared/higgsfieldNative'

const id=(mode:string)=>`bytedance/seedance-2.5/${mode}`
const ref=(mediaType:'image'|'video'|'audio',n=0)=>({mediaType,url:`https://cdn.prism.example/${mediaType}-${n}`})
const request=(mode:string):HiggsfieldNativeRequest=>({endpointId:id(mode),contractRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,values:mode==='image-to-video'?{}:{prompt:'  Exact author bytes.\r\nAction.  '},media:mode==='text-to-video'?{}:mode==='image-to-video'?{image_url:[ref('image',0)],end_image_url:[ref('image',1)]}:mode==='reference-to-video'?{image_urls:Array.from({length:30},()=>ref('image')),video_urls:Array.from({length:10},()=>ref('video')),audio_urls:Array.from({length:10},()=>ref('audio'))}:{video_url:[ref('video')],audio_urls:[ref('audio')]}})
describe('actual Higgsfield Seedance registry/API/protected job composition (fake HTTP)',()=>{
  it.each(['text-to-video','image-to-video','reference-to-video','video-extend','video-edit'])('protects and reopens the exact %s wire body before fake submission',async mode=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-seed-backend-'))
    const scope={projectId:'fixture-project',rootPath:'/fixture/project',documentPath:'/fixture/project/Fixture.prismflow',nodeId:'fixture-node'},key='fixture:nonsecret',encrypt=(text:string)=>Buffer.from(text),decrypt=(bytes:Buffer)=>bytes.toString()
    try{
      const store=new HiggsfieldJobStore(directory),original=request(mode),snapshot=higgsfieldJobSnapshot(original),plan=planHiggsfieldNativeInput(original)
      expect(plan.kind).toBe('seedance')
      const lifecycle=await beginHiggsfieldJob(store,scope,'fixture-profile',original,encrypt)
      let storedBody=''
      const fetch=vi.fn(async(address:string,init?:RequestInit)=>{
        expect(address).toBe(`https://api.higgsfield.ai/${id(mode)}`)
        const durable=await store.get(scope,lifecycle.record.id)
        const receipt=openHiggsfieldSubmission(durable,decrypt)!
        storedBody=receipt.body
        expect(init?.body).toBe(receipt.body)
        expect(init?.headers).toMatchObject({'Idempotency-Key':receipt.idempotencyKey})
        expect(durable.state).toBe('submitting')
        return new Response(JSON.stringify({request_id:'fixture-job',status:'completed',video:{url:'https://cdn.prism.example/Output.mp4',content_type:'video/mp4'}}))
      })
      const api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{},observer:lifecycle.observer(higgsfieldCredentialIdentity(key))})
      await expect(api.generate(original.endpointId,plan.preview)).resolves.toMatchObject({requestId:'fixture-job',contentType:'video/mp4'})
      expect(fetch).toHaveBeenCalledOnce()
      const reopened=new HiggsfieldJobStore(directory),record=await reopened.get(scope,lifecycle.record.id)
      expect(openHiggsfieldJobSnapshot(record,decrypt)).toEqual(snapshot)
      expect(openHiggsfieldSubmission(record,decrypt)?.body).toBe(storedBody)
      const wire=JSON.parse(storedBody)
      if(mode==='reference-to-video'){expect(wire.image_urls).toHaveLength(30);expect(wire.video_urls).toHaveLength(10);expect(wire.audio_urls).toHaveLength(10)}
      if(mode==='image-to-video')expect(wire).not.toHaveProperty('prompt')
      if(mode==='video-edit')expect(wire).not.toHaveProperty('duration')
      expect(wire).not.toHaveProperty('preset_id');expect(wire).not.toHaveProperty('allowSourceTrimming')
    }finally{await rm(directory,{recursive:true,force:true})}
  })
  it('rejects cross-mode defaults, old revisions, wrong field types and Genjutsu consent before a private job',()=>{
    const before=request('video-edit')
    for(const bad of [{...before,allowSourceTrimming:true},{...before,contractRevision:'old'},{...before,values:{...before.values,duration:5}},{...before,media:{video_url:[ref('image')]}}])expect(()=>higgsfieldJobSnapshot(bad)).toThrow()
    expect(higgsfieldJobSnapshot(before)).not.toHaveProperty('allowSourceTrimming')
  })
  it('checks every native media URL, including optional end frames and audio, before protected submission/fetch',async()=>{
    const fetch=vi.fn(),before=vi.fn(),api=new HiggsfieldApi({key:'fixture:nonsecret',fetch,assertCurrent:()=>{},observer:{beforeSubmit:before,observed:vi.fn(),rejected:vi.fn(),canceled:vi.fn()}})
    for(const [mode,body] of [
      ['image-to-video',{image_url:'https://cdn.prism.example/start',end_image_url:'https://127.0.0.1/end'}],
      ['reference-to-video',{audio_urls:['https://127.0.0.1/audio']}],
      ['reference-to-video',{video_urls:['https://127.0.0.1/video']}],
    ] as const)await expect(api.generate(id(mode),body)).rejects.toThrow(/private/)
    expect(before).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps a requested MOV through generation and status recovery when both files are returned',async()=>{
    const complete={request_id:'fixture-job',status:'completed',video:{url:'https://cdn.prism.example/Output.mp4',content_type:'video/mp4'},mov:{url:'https://cdn.prism.example/Output.mov',content_type:'video/quicktime'}}
    const fetch=vi.fn(async()=>new Response(JSON.stringify(complete)))
    const api=new HiggsfieldApi({key:'fixture:nonsecret',fetch,assertCurrent:()=>{}})
    await expect(api.generate(id('text-to-video'),{prompt:'Exact action.',output_format:'mov'})).resolves.toMatchObject({url:complete.mov.url,contentType:'video/quicktime'})
    await expect(api.status('fixture-job',undefined,'mov')).resolves.toMatchObject({output:{url:complete.mov.url,contentType:'video/quicktime'}})
    await expect(api.status('fixture-job',undefined,'mp4')).resolves.toMatchObject({output:{url:complete.video.url,contentType:'video/mp4'}})
  })
  it('accepts a MOV-only completion and refuses a declared MP4 as the requested MOV',async()=>{
    const mov={request_id:'fixture-job',status:'completed',mov:{url:'https://cdn.prism.example/Output.mov',content_type:'video/quicktime'}}
    const api=new HiggsfieldApi({key:'fixture:nonsecret',fetch:async()=>new Response(JSON.stringify(mov)),assertCurrent:()=>{}})
    await expect(api.generate(id('text-to-video'),{prompt:'Exact action.',output_format:'mov'})).resolves.toMatchObject({url:mov.mov.url,contentType:'video/quicktime'})
    const wrong=new HiggsfieldApi({key:'fixture:nonsecret',fetch:async()=>new Response(JSON.stringify({request_id:'fixture-job',status:'completed',video:{url:'https://cdn.prism.example/Output.mp4',content_type:'video/mp4'}})),assertCurrent:()=>{}})
    await expect(wrong.status('fixture-job',undefined,'mov')).rejects.toThrow(/different requested output/)
  })
  it('keeps declared WAV upload headers and never sends the provider credential to storage',async()=>{
    const fetch=vi.fn(async(address:string,init?:RequestInit)=>address.includes('/files/')?new Response(JSON.stringify({public_url:'https://cdn.prism.example/audio.wav',upload_url:'https://storage.prism.example/audio.wav',content_type:'audio/wav',upload_headers:{'Content-Type':'audio/wav'}})):new Response(null,{status:200}))
    const api=new HiggsfieldApi({key:'fixture:nonsecret',fetch,assertCurrent:()=>{}})
    await expect(api.upload(new Uint8Array([1,2,3]),'audio/wav')).resolves.toBe('https://cdn.prism.example/audio.wav')
    expect(fetch.mock.calls[1][1]?.headers).toEqual({'Content-Type':'audio/wav'})
    expect(fetch.mock.calls[1][1]?.method).toBe('PUT')
  })
})
