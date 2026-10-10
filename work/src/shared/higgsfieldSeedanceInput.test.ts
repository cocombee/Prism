import { describe, it, expect } from 'vitest'
import { HIGGSFIELD_SEEDANCE_INPUT_REVISION as revision, HIGGSFIELD_SEEDANCE25_ROUTES, higgsfieldSeedanceSchema, higgsfieldSeedanceFields, planHiggsfieldSeedanceInput, materializeHiggsfieldSeedanceInput, type HiggsfieldSeedanceInputRequest, type HiggsfieldSeedanceMediaType } from './higgsfieldSeedanceInput'
const id=(mode:string)=>'bytedance/seedance-2.5/'+mode
const source=(type:HiggsfieldSeedanceMediaType,n=0)=>({path:`/fixture/${type}-${n}`,mediaType:type})
const input=(mode:string,values:Record<string,any>={},media:Record<string,any>={}):HiggsfieldSeedanceInputRequest=>({endpointId:id(mode),inputRevision:revision,values,media})
const urls=(count:number)=>Array.from({length:count},(_,i)=>`https://cdn.prism.example/media-${i}`)
describe('independent Higgsfield Seedance native input foundation',()=>{
  it('retains every captured mode without admitting them as runnable Genjutsu',()=>{
    expect([...HIGGSFIELD_SEEDANCE25_ROUTES].sort()).toEqual(['image-to-video','reference-to-video','text-to-video','video-edit','video-extend'].map(id).sort())
    expect(()=>higgsfieldSeedanceSchema('higgsfield/genjutsu/restyle/v1.0')).toThrow('no verified')
    const first=higgsfieldSeedanceSchema(id('text-to-video'));first.properties!.duration.maximum=1
    expect(higgsfieldSeedanceSchema(id('text-to-video')).properties!.duration.maximum).toBe(30)
  })
  it('binds physical input fields with independent start/end/source/reference roles',()=>{
    const image=higgsfieldSeedanceFields(id('image-to-video'));expect(image.find(field=>field.key==='image_url')?.media).toMatchObject({type:'image',array:false,role:'start-frame'});expect(image.find(field=>field.key==='end_image_url')?.media?.role).toBe('end-frame')
    const reference=higgsfieldSeedanceFields(id('reference-to-video'));expect(reference.find(field=>field.key==='video_urls')?.media?.role).toBe('reference-video');expect(reference.find(field=>field.key==='audio_urls')?.media?.type).toBe('audio')
    expect(higgsfieldSeedanceFields(id('video-edit')).find(field=>field.key==='video_url')?.media?.role).toBe('source-video')
  })
  it('keeps text route controls and exact prompt, including its declared MOV option',()=>{
    const request=input('text-to-video',{prompt:'  Exact authored text.\r\n',duration:30,output_format:'mov',generate_audio:false}),before=JSON.stringify(request)
    const plan=planHiggsfieldSeedanceInput(request),wire=materializeHiggsfieldSeedanceInput(plan,[])
    expect(wire).toMatchObject({prompt:request.values.prompt,duration:30,output_format:'mov',generate_audio:false,resolution:'720p',aspect_ratio:'16:9',bitrate_mode:'high'})
    expect(JSON.stringify(request)).toBe(before)
    for(const duration of [0,3,3.5,30.5,31])expect(()=>planHiggsfieldSeedanceInput(input('text-to-video',{prompt:'Action.',duration}))).toThrow()
  })
  it('requires a start frame and permits an optional omitted end frame and prompt',()=>{
    const plan=planHiggsfieldSeedanceInput(input('image-to-video',{}, {image_url:[source('image')],end_image_url:[]}))
    expect(plan.preview).not.toHaveProperty('prompt');expect(plan.preview).not.toHaveProperty('end_image_url');expect(plan.preview.duration).toBe(5)
    const full=planHiggsfieldSeedanceInput(input('image-to-video',{prompt:'Exact motion.'},{image_url:[source('image',0)],end_image_url:[source('image',1)]}));expect(materializeHiggsfieldSeedanceInput(full,urls(2))).toMatchObject({image_url:urls(2)[0],end_image_url:urls(2)[1]})
    expect(()=>planHiggsfieldSeedanceInput(input('image-to-video'))).toThrow(/image_url/)
  })
  it('materializes all50 multimodal reference slots in order without deduplicating repeated assignments',()=>{
    const request=input('reference-to-video',{duration:30},{image_urls:Array.from({length:30},()=>source('image')),video_urls:Array.from({length:10},(_,i)=>source('video',i)),audio_urls:Array.from({length:10},(_,i)=>source('audio',i))}),before=JSON.stringify(request)
    const plan=planHiggsfieldSeedanceInput(request);expect(plan.slots).toHaveLength(50)
    expect(plan.slots.slice(0,30).every(slot=>slot.source.path==='/fixture/image-0')).toBe(true)
    const wire=materializeHiggsfieldSeedanceInput(plan,urls(50));expect(wire.image_urls).toEqual(urls(50).slice(0,30));expect(wire.video_urls).toEqual(urls(50).slice(30,40));expect(wire.audio_urls).toEqual(urls(50).slice(40,50));expect(wire).not.toHaveProperty('video_url');expect(JSON.stringify(request)).toBe(before)
    for(const [field,type,count]of [['image_urls','image',31],['video_urls','video',11],['audio_urls','audio',11]] as const)expect(()=>planHiggsfieldSeedanceInput(input('reference-to-video',{}, {[field]:Array.from({length:count},()=>source(type))}))).toThrow(/item count/)
  })
  it.each(['image','video','audio'] as const)('requires at least one nonempty reference kind and accepts %s by itself',type=>{
    const field=type==='image'?'image_urls':type==='video'?'video_urls':'audio_urls'
    expect(()=>planHiggsfieldSeedanceInput(input('reference-to-video'))).toThrow(/audio_urls/)
    const plan=planHiggsfieldSeedanceInput(input('reference-to-video',{}, {[field]:[source(type)],...(type!=='image'?{image_urls:[]}: {})}));expect(plan.slots).toHaveLength(1);expect(plan.preview).toHaveProperty(field)
  })
  it('distinguishes source-timed Edit from fixed-duration Extend without inherited Genjutsu trim consent',()=>{
    const edit=planHiggsfieldSeedanceInput(input('video-edit',{prompt:'Change only the jacket.'},{video_url:[source('video')],image_urls:[source('image')]}));expect(edit.preview).not.toHaveProperty('duration');expect(edit.preview).not.toHaveProperty('preset_id');expect(edit.preview).not.toHaveProperty('allowSourceTrimming')
    const extend=planHiggsfieldSeedanceInput(input('video-extend',{prompt:'Continue the authored action.',duration:4},{video_url:[source('video')]}));expect(extend.preview.duration).toBe(4)
    for(const mode of ['video-edit','video-extend'])expect(()=>planHiggsfieldSeedanceInput(input(mode,{prompt:'Exact action.'}))).toThrow(/video_url/)
  })
  it('blocks conflicting/missing-schema output controls, preserving saved state instead of substituting MP4',()=>{
    const request=input('reference-to-video',{output_format:'mov'},{image_urls:[source('image')]}),before=JSON.stringify(request)
    expect(()=>planHiggsfieldSeedanceInput(request)).toThrow(/saved control output_format/);expect(JSON.stringify(request)).toBe(before)
    expect(()=>planHiggsfieldSeedanceInput(input('video-edit',{prompt:'Exact edit.',duration:5},{video_url:[source('video')]}))).toThrow(/saved control duration/)
    expect(()=>planHiggsfieldSeedanceInput(input('text-to-video',{prompt:'Action.'},{video_urls:[source('video')]}))).toThrow(/does not accept media/)
  })
  it('uses schema controls only and rejects malformed transport/type/metadata before any preparation',()=>{
    for(const bad of [{path:'/fixture/video',mediaType:'video'},{path:'/fixture/a',url:'https://cdn.prism.example/a',mediaType:'image'},{url:'http://localhost/a',mediaType:'image'},{path:'/fixture/a',mediaType:'image',bytes:[1]}])expect(()=>planHiggsfieldSeedanceInput(input('image-to-video',{}, {image_url:[bad]}))).toThrow()
    expect(()=>planHiggsfieldSeedanceInput({...input('text-to-video',{prompt:'Action.'}),inputRevision:'old'})).toThrow(/revision/)
    expect(()=>planHiggsfieldSeedanceInput(input('text-to-video',{prompt:'Action.',image_urls:['https://cdn.prism.example/a']}))).toThrow(/saved control/)
    expect(()=>planHiggsfieldSeedanceInput(input('image-to-video',{}, {image_url:[source('image'),source('image',1)]}))).toThrow(/one source/)
  })
  it('rejects Genjutsu-only consent and locks the private planned snapshot against later edits',()=>{
    expect(()=>planHiggsfieldSeedanceInput({...input('video-edit',{prompt:'Edit jacket.'},{video_url:[source('video')]}),allowSourceTrimming:true} as any)).toThrow(/unsupported request/)
    const plan=planHiggsfieldSeedanceInput(input('image-to-video',{prompt:'Original action.'},{image_url:[source('image')]}))
    expect(Object.isFrozen(HIGGSFIELD_SEEDANCE25_ROUTES)).toBe(true)
    expect(()=>{plan.values.prompt='Changed.'}).toThrow()
    expect(()=>{plan.slots[0].source.path='/fixture/changed'}).toThrow()
    expect(()=>{plan.slots.push({...plan.slots[0]})}).toThrow()
    expect(()=>{plan.preview.prompt='Changed.'}).toThrow()
    expect(materializeHiggsfieldSeedanceInput(plan,urls(1)).prompt).toBe('Original action.')
  })
  it('keeps snapshots after caller edits and rejects changed materialized cardinality or private URLs',()=>{
    const request=input('image-to-video',{prompt:'Original action.'},{image_url:[source('image')]});const plan=planHiggsfieldSeedanceInput(request)
    request.values.prompt='Later edit.';request.media.image_url[0].path='/fixture/later';expect(plan.values.prompt).toBe('Original action.');expect(plan.slots[0].source.path).toBe('/fixture/image-0')
    expect(()=>materializeHiggsfieldSeedanceInput(plan,[])).toThrow(/cardinality/);expect(()=>materializeHiggsfieldSeedanceInput(plan,['https://127.0.0.1/a'])).toThrow(/private/)
    expect(materializeHiggsfieldSeedanceInput(plan,urls(1)).prompt).toBe('Original action.')
  })
})
