import { describe, expect, it, vi } from 'vitest'
import type { Edge } from '@xyflow/react'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { StudioNode, StudioNodeData, NodeKind, StoryboardPanel } from './types'
import { selectHiggsfieldBinding, reconcileHiggsfieldNodeBinding } from './higgsfieldNodeBinding'
import { higgsfieldFieldPortId } from './higgsfieldInputContract'
import { readHiggsfieldInputContract } from '../main/higgsfieldInputContract'
import { resolveHiggsfieldCurrentInput } from '../main/higgsfieldCurrentInput'
import { buildGenerationRequest } from './workflowResolver'
import { generationServiceProvider } from './generationServiceProvider'
import { assertGenerationRequirements } from './generationReadiness'
import { assertVideoProviderPromptPreflight } from './providerPromptPreflight'
import { higgsfieldSeedanceRequest, planHiggsfieldNativeInput } from './higgsfieldNative'
import { composedProviderPromptEntries } from '../renderer/src/ProviderPromptPreview'
import { HiggsfieldApi } from '../main/higgsfieldApi'
import { executeHiggsfieldSeedanceGeneration } from '../main/higgsfieldSeedanceGeneration'
import { HiggsfieldJobStore, higgsfieldCredentialIdentity } from '../main/higgsfieldJobStore'
import { beginHiggsfieldJob, openHiggsfieldSubmission } from '../main/higgsfieldJobLifecycle'
import { validateFalContractValue } from '../main/falSchemaValidation'
import { higgsfieldSeedanceSchema } from './higgsfieldSeedanceInput'

const modes = ['text-to-video','image-to-video','reference-to-video','video-extend','video-edit']
const id = (mode: string) => `bytedance/seedance-2.5/${mode}`
const node = (key: string, kind: NodeKind, data: Partial<StudioNodeData> = {}): StudioNode => ({id:key,type:'studio',position:{x:0,y:0},data:{kind,title:key,...data}})
function generator(mode: string, manual = true) {
  const end = node('generator','video-generator',{promptMode:manual?'manual':'auto',manualPromptDraft:'  Keep the authored action.\r\n',prompt:'Keep the authored action.',videoEngine:'old-unavailable',duration:3,frameRate:60,shutterAngle:90})
  Object.assign(end.data,selectHiggsfieldBinding(end.data,id(mode),[]))
  // Historical fixtures own a saved 5s selection; fresh/current defaults are tested separately.
  if (mode !== 'video-edit') end.data.higgsfieldNative!.values.duration = 5
  return end
}
const media = (key: string, type: 'image'|'video'|'audio') => node(key,'upload',{referenceDescription:`Authored ${type} reference purpose.`,outputType:type,assetUrl:`https://cdn.prism.example/${key}.${type==='image'?'png':type==='video'?'mp4':'wav'}`,referenceTag:`@${key}`})
const edge = (source: StudioNode, field: string, target = 'generator'): Edge => ({id:`${source.id}-${field}-${target}`,source:source.id,sourceHandle:'media-out',target,targetHandle:higgsfieldFieldPortId(field)})

it('honors an explicit User cadence once with original authored text preserved, then restores Native',()=>{
 const end=generator('text-to-video'),authored=end.data.manualPromptDraft
 end.data.motionCadence=16;end.data.motionCadenceMode='custom'
 const request=buildGenerationRequest(end,[end],[])
 expect(request.prompt).toContain(`${authored}\n\nMOTION CADENCE:`)
 expect(request.prompt?.match(/MOTION CADENCE:/g)).toHaveLength(1)
 expect(request.higgsfieldNative!.values).not.toHaveProperty('fps')
 expect(end.data.manualPromptDraft).toBe(authored)
 end.data.motionCadenceMode='native'
 expect(buildGenerationRequest(end,[end],[]).prompt).toBe(authored)
})
function fixture(mode: string, manual = true) {
  const end=generator(mode,manual), sources:StudioNode[]=[], edges:Edge[]=[]
  const fields: Array<[string,'image'|'video'|'audio']> = mode==='text-to-video'?[]:mode==='image-to-video'?[['image_url','image'],['end_image_url','image']]:mode==='reference-to-video'?[['image_urls','image'],['video_urls','video'],['audio_urls','audio']]:[['video_url','video']]
  for(const [field,type] of fields) {
    const source=media(field,type);sources.push(source);edges.push(edge(source,field))
  }
  return {end,nodes:[end,...sources],edges}
}
const panels = (count: number, duration = 1): StoryboardPanel[] => Array.from({length:count},(_,i)=>({id:`panel-${i}`,prompt:`Action beat ${i+1}: the performer continues the authored task.`,duration,shotSize:i%2?'wide':'close-up',camera:'static',transitionToNext:'hard-cut'}))

describe('actual Higgsfield Seedance graph, compiler and native request composition',()=>{
  it.each(['imported', 'generated'] as const)('routes mixed %s image/video/audio Storyboard references into their declared native fields', origin=>{
    const end=generator('reference-to-video',false),board=node('board','storyboard')
    const sources=(['image','video','audio'] as const).map(type=>{
      const source=media(type,type)
      if(origin==='generated') {
        source.data.kind=type==='image'?'image-generator':type==='video'?'video-generator':'voiceover'
        source.data.generatedResults=[{path:'',url:source.data.assetUrl!,type,modelId:'fixture'}]
        delete source.data.assetUrl
      }
      return source
    })
    const links:Edge[]=sources.map(source=>({id:`${source.id}-board`,source:source.id,target:board.id,targetHandle:source.data.outputType==='image'?'reference-in':`${source.data.outputType}-reference-in`}))
    links.push({id:'board-end',source:board.id,target:end.id,targetHandle:'storyboard-in'})
    const request=buildGenerationRequest(end,[...sources,board,end],links)
    for(const type of ['image','video','audio'] as const)expect(request.higgsfieldNative!.media[`${type}_urls`]).toEqual([{url:`https://cdn.prism.example/${type}.${type==='image'?'png':type==='video'?'mp4':'wav'}`,mediaType:type}])
    expect(request.prompt).toContain('Reference image 1: @image')
    expect(request.prompt).toContain('Reference video 1: @video')
    expect(request.prompt).toContain('Reference audio 1: @audio')
    expect(request.references?.map(reference=>reference.tag).sort()).toEqual(['@audio','@image','@video'])
  })
  it('binds the native footer Motion FPS as compiled intent without altering Manual or API fields',()=>{
    const x=fixture('text-to-video',false);x.end.data.motionCadence=16
    const auto=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(auto.motionCadence).toBe(16);expect(auto.prompt).toMatch(/16fps/);expect(auto.prompt).toContain('uniform 1/16-second intervals');expect(auto.prompt).not.toContain('stop-motion cadence');expect(auto.prompt).not.toContain('natural directional exposure blur')
    expect(auto.higgsfieldNative!.values).not.toHaveProperty('fps')
    expect(auto.higgsfieldNative!.values).not.toHaveProperty('motionCadence')
    x.end.data.promptMode='manual'
    const manual=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(manual.motionCadence).toBeUndefined();expect(manual.prompt).toBe(x.end.data.manualPromptDraft)
    expect(manual.higgsfieldNative!.values.prompt).toBe(x.end.data.manualPromptDraft)
  })
  it('carries actual current controls/digest and increased reference capacity from graph to main',async()=>{
    const end=generator('reference-to-video'),schema=higgsfieldSeedanceSchema(end.data.higgsfieldNative!.endpointId)
    schema.properties!.duration.maximum=40;schema.properties!.image_urls.maxItems=40;schema.properties!.seed={type:'integer',default:12}
    const owner={assertCurrent:()=>{},readContract:async()=>structuredClone(schema)}
    const contract=await readHiggsfieldInputContract(end.data.higgsfieldNative!.endpointId,owner)
    end.data.higgsfieldNative=reconcileHiggsfieldNodeBinding({...end.data.higgsfieldNative!,values:{duration:35}},contract)
    const list=node('reference-list','list',{listSignal:'image',listItems:Array.from({length:35},(_,i)=>({id:`image-${i}`,type:'image',asset:{id:`image-${i}`,name:`image-${i}`,path:'',url:`https://cdn.prism.example/image-${i}.png`,mimeType:'image/png',createdAt:'fictional',metadata:{referenceDescription:'Authored fixture reference purpose.'}}}))})
    const request=buildGenerationRequest(end,[end,list],[{...edge(list,'image_urls'),sourceHandle:'mixed-out'}]),before=JSON.stringify(request)
    expect(request.higgsfieldNative!.fingerprint).toBe(contract.fingerprint);expect(request.higgsfieldNative!.values.seed).toBe(12)
    expect(()=>assertGenerationRequirements(request)).not.toThrow()
    const owned=await resolveHiggsfieldCurrentInput(request.higgsfieldNative!,owner)
    expect(owned.plan.preview.image_urls).toHaveLength(35);expect(owned.plan.preview.duration).toBe(35)
    expect(JSON.stringify(request)).toBe(before)
  })
  it.each(modes)('keeps Manual %s bytes and exact media fields without legacy controls or another transport',mode=>{
    const x=fixture(mode), request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.prompt).toBe(x.end.data.manualPromptDraft);expect(request.providerPromptOverride).toBe(request.prompt)
    expect(request.higgsfieldNative!.values.prompt).toBe(request.prompt)
    expect(request.providerPromptOwnership).toBe('authored');expect(request.falNative).toBeUndefined()
    expect(generationServiceProvider(request)).toBe('higgsfield')
    expect(request.frameRate).toBeUndefined();expect(request.shutterAngle).toBeUndefined();expect(request.duration).not.toBe(3)
    expect(request.higgsfieldNative).not.toHaveProperty('allowSourceTrimming')
    expect(()=>assertGenerationRequirements(request)).not.toThrow();expect(()=>assertVideoProviderPromptPreflight(request)).not.toThrow()
    expect(composedProviderPromptEntries(request,null)[0].body).toBe(request.higgsfieldNative!.values.prompt)
  })
  it.each(modes)('compiles Auto %s once with final negative section and no borrowed ordinal dialect',mode=>{
    const x=fixture(mode,false), request=buildGenerationRequest(x.end,x.nodes,x.edges), text=request.prompt!
    expect(text).toMatch(/NEGATIVE PROMPT\n/);expect(text).not.toMatch(/\[(?:Image|Video|Audio)\d+\]|@(?:Image|Video|Audio)\d+/)
    expect(text).not.toMatch(/180.degree shutter|60 fps|90.degree shutter/i)
    expect(request.providerPromptOwnership).toBe('compiled');expect(request.higgsfieldNative!.values.prompt).toBe(text)
    expect(composedProviderPromptEntries(request,null)[0].body).toBe(text)
    expect(()=>assertGenerationRequirements(request)).not.toThrow();expect(()=>assertVideoProviderPromptPreflight(request)).not.toThrow()
    if(mode==='video-edit') {expect(text).toContain('EDIT CONTROL');expect(text).toContain('existing shot structure');expect(request.duration).toBeUndefined();expect(text).not.toMatch(/SHOT 1|0\.0–5\.0s/)}
  })
  it.each(modes)('sends exactly the visible %s graph body through the real API and protected journal (fake HTTP)',async mode=>{
    const x=fixture(mode,false), request=buildGenerationRequest(x.end,x.nodes,x.edges), native=request.higgsfieldNative!
    const directory=await mkdtemp(join(tmpdir(),'prism-seed-graph-')),scope={projectId:'fictional',rootPath:'/fixture',documentPath:'/fixture/Example.prismflow',nodeId:'generator'},key='fixture:nonsecret'
    try {
      const store=new HiggsfieldJobStore(directory),lifecycle=await beginHiggsfieldJob(store,scope,'fixture-profile',native,text=>Buffer.from(text))
      let wire:Record<string,unknown>|undefined
      const fetch=vi.fn(async (address:string,init?:RequestInit)=>{
        expect(address).toBe(`https://api.higgsfield.ai/${native.endpointId}`)
        const receipt=openHiggsfieldSubmission(await store.get(scope,lifecycle.record.id),bytes=>bytes.toString())!
        expect(init?.body).toBe(receipt.body);wire=JSON.parse(receipt.body)
        expect(wire!.prompt).toBe(composedProviderPromptEntries(request,null)[0].body)
        return new Response(JSON.stringify({request_id:'fixture-job',status:'completed',video:{url:'https://cdn.prism.example/result.mp4',content_type:'video/mp4'}}))
      })
      const api=new HiggsfieldApi({key,fetch,assertCurrent:()=>{},observer:lifecycle.observer(higgsfieldCredentialIdentity(key))})
      const result=await executeHiggsfieldSeedanceGeneration(higgsfieldSeedanceRequest(native),{
        assertCurrent:()=>{},inspect:vi.fn(),read:vi.fn(),validate:vi.fn(),
        validateInput:input=>validateFalContractValue(higgsfieldSeedanceSchema(native.endpointId),input),api:async()=>api,persist:async()=>({path:'/fixture/result.mp4',url:'prism://fixture/result'}),
      })
      expect(result.outputType).toBe('video');expect(fetch).toHaveBeenCalledOnce()
      expect(wire).not.toHaveProperty('frameRate');expect(wire).not.toHaveProperty('shutterAngle')
      if(mode==='video-edit')expect(wire).not.toHaveProperty('duration')
    } finally {await rm(directory,{recursive:true,force:true})}
  })
  it('keeps fifty typed assignments, intentional duplicates and input-map order after List/Router expansion',()=>{
    const end=generator('reference-to-video',false), lists:StudioNode[]=[],links:Edge[]=[]
    for(const [type,count,field] of [['audio',10,'audio_urls'],['video',10,'video_urls'],['image',30,'image_urls']] as const){
      const list=node(type+'-list','list',{listSignal:type,listItems:Array.from({length:count},(_,i)=>({id:`${type}-${i}`,type,asset:{id:`${type}-${i}`,name:`${type}-${i}`,path:'',url:`https://cdn.prism.example/${type}-${i===1?0:i}`,mimeType:type==='image'?'image/png':type==='video'?'video/mp4':'audio/wav',createdAt:'fictional',metadata:{referenceDescription:'Authored fixture reference purpose.'}}}))})
      const router=node(type+'-route','router',{routeSignal:type});lists.push(list,router)
      links.push({id:type+'-upstream',source:list.id,sourceHandle:'mixed-out',target:router.id,targetHandle:'input'},{...edge(router,field),sourceHandle:'output'})
    }
    const request=buildGenerationRequest(end,[end,...lists],links), plan=planHiggsfieldNativeInput(request.higgsfieldNative!)
    expect(plan.kind).toBe('seedance');if(plan.kind!=='seedance')throw Error('Wrong owner')
    expect(plan.slots).toHaveLength(50);expect(Object.keys(request.higgsfieldNative!.media)).toEqual(end.data.higgsfieldNative!.media!.map(binding=>binding.key))
    expect(request.higgsfieldNative!.media.image_urls[0].url).toBe(request.higgsfieldNative!.media.image_urls[1].url)
    expect(request.prompt).toContain('Reference image 30:');expect(request.prompt).toContain('Reference video 10:');expect(request.prompt).toContain('Reference audio 10:')
    expect(request.references!.map(reference=>reference.mediaType)).toEqual(plan.slots.map(slot=>slot.source.mediaType))
    expect(request.prompt).not.toMatch(/@list-1(?=$|[^\d])/)
    expect(request.prompt).toContain('paths are not combined or averaged')
    expect(request.prompt).not.toMatch(/follow Reference video 1, Reference video 2/)
  })
  it('binds independent start/end images without folding them into reference-image arrays',()=>{
    const x=fixture('image-to-video',false), request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.references!.map(reference=>reference.slot)).toEqual(['start','end'])
    expect(request.higgsfieldNative!.media).not.toHaveProperty('image_urls')
    expect(request.prompt).toContain('Starting image: @image_url');expect(request.prompt).toContain('Ending image: @end_image_url')
  })
  it('does not grant camera authority from a native video socket with an editable Reference assignment',()=>{
    const x=fixture('reference-to-video',false), request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.references!.find(reference=>reference.mediaType==='video')!.authority).toBe('motion-camera')
    expect(request.prompt).not.toMatch(/follow @video_urls for camera geometry, path and speed curve/)
    expect(request.prompt).toContain('camera assignments explicitly stated in REFERENCE INTRODUCTIONS')
    expect(request.prompt).toContain('Reference video 1: @video_urls — video reference.')
    expect(request.prompt).not.toContain('— motion and camera reference.')
  })
  it('allows explicitly authored performance guidance without making the video an appearance or audio source',()=>{
    const x=fixture('reference-to-video',false);x.end.data.prompt='Copy the walking performance from @video_urls while using the selected image for the subject.'
    const request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.prompt).toContain('Copy the walking performance from @video_urls')
    expect(request.prompt).toContain('Apply only that authored assignment; other references retain their own assigned domains.')
    expect(request.references!.find(reference => reference.tag === '@video_urls')!.mediaReferenceMode).toBe('reference')
    expect(request.prompt).not.toContain('Camera geometry, path and speed curve only; appearance not inherited.')
  })
  it('extends the source final state without applying source-edit timing or restarting the source clip',()=>{
    const x=fixture('video-extend',false), request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.inputRole).toBe('source-video');expect(request.inputTag).toBe('@video_url')
    expect(request.prompt).toContain('continue rather than regenerate its beginning')
    expect(request.higgsfieldNative!.media.video_url).toHaveLength(1);expect(request.duration).toBe(5)
  })
  it.each([20,30])('retains %i authored Storyboard panels at the selected native duration',count=>{
    const end=generator('text-to-video',false),story=node('story','storyboard',{storyboardPanels:panels(count),storyboardDuration:5})
    end.data.higgsfieldNative!.values.duration=count
    const request=buildGenerationRequest(end,[end,story],[{id:'story',source:story.id,sourceHandle:'storyboard-out',target:end.id,targetHandle:'storyboard-in'}])
    expect(request.storyboardShots).toHaveLength(count);expect(request.duration).toBe(count)
    expect(request.prompt!.match(/^HARD CUT\.$/gm)).toHaveLength(count-1)
    expect(request.storyboardShots!.at(-1)!.endSeconds).toBe(count)
    expect(()=>assertGenerationRequirements(request)).not.toThrow()
  })
  it('keeps Continue beats inside one shot and preserves exact half-second timing',()=>{
    const end=generator('text-to-video',false),beats=panels(3,1.5);beats[0].transitionToNext='continue';beats[1].transitionToNext='continue';beats.forEach(panel=>panel.shotSize='medium')
    const story=node('story','storyboard',{storyboardPanels:beats});end.data.higgsfieldNative!.values.duration=5
    expect(()=>buildGenerationRequest(end,[end,story],[{id:'story',source:story.id,sourceHandle:'storyboard-out',target:end.id,targetHandle:'storyboard-in'}])).toThrow(/must match|underflow|duration/i)
    beats[2].duration=2
    const request=buildGenerationRequest(end,[end,story],[{id:'story',source:story.id,sourceHandle:'storyboard-out',target:end.id,targetHandle:'storyboard-in'}])
    expect(request.prompt).not.toContain('HARD CUT.');expect(request.storyboardShots!.map(shot=>[shot.startSeconds,shot.endSeconds])).toEqual([[0,1.5],[1.5,3],[3,5]])
  })
  it('Manual ignores unused Storyboard edits while retaining its connected physical references',()=>{
    const x=fixture('reference-to-video'),story=node('story','storyboard',{storyboardPanels:panels(30,100),storyboardDuration:3000}),character=node('character','character',{referenceTag:'@Hero',characterInputMode:'single',referenceAssets:[{id:'front',name:'Front',path:'/fixture/front.png',mimeType:'image/png',createdAt:'fictional',metadata:{referenceDescription:'Authored fixture reference purpose.',characterView:'front'}}]})
    x.nodes.push(story,character);x.edges.push({id:'story',source:story.id,sourceHandle:'storyboard-out',target:x.end.id,targetHandle:'storyboard-in'},{id:'hero',source:character.id,sourceHandle:'media-out',target:story.id,targetHandle:'character-in'})
    const request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.prompt).toBe(x.end.data.manualPromptDraft);expect(request.storyboardShots).toBeUndefined()
    expect(request.references!.some(reference=>reference.tag==='@Hero')).toBe(true)
  })
  it('applies a text Style exactly once when connected directly and through the Storyboard',()=>{
    const end=generator('text-to-video',false),story=node('story','storyboard',{storyboardPanels:panels(2,2.5)}),style=node('style','style-reference',{styleSavedAt:'fictional',stylePrompt:'UNIQUE GRAIN LOOK',referenceTag:'@Look',referenceAssets:[{id:'style',name:'Look',path:'/fixture/look.prismstyle',mimeType:'application/prismstyle',createdAt:'fictional',metadata:{referenceDescription:'Authored fixture reference purpose.'}}]})
    const links:Edge[]=[{id:'story',source:story.id,sourceHandle:'storyboard-out',target:end.id,targetHandle:'storyboard-in'},{id:'direct-style',source:style.id,sourceHandle:'style-out',target:end.id,targetHandle:'style-in'},{id:'story-style',source:style.id,sourceHandle:'style-out',target:story.id,targetHandle:'style-in'}]
    const request=buildGenerationRequest(end,[end,story,style],links)
    expect(request.prompt!.match(/UNIQUE GRAIN LOOK/g)).toHaveLength(1);expect(request.higgsfieldNative!.media).toEqual({})
  })
  it('blocks wrong types, removed sockets, missing sources and cycles before any request can dispatch',()=>{
    const x=fixture('reference-to-video'),video=x.nodes.find(source=>source.id==='video_urls')!
    video.data.outputType='audio';expect(()=>buildGenerationRequest(x.end,x.nodes,x.edges)).toThrow(/Audio can connect only/i)
    const missing=fixture('image-to-video');missing.nodes=missing.nodes.filter(source=>source.id!=='image_url');expect(()=>buildGenerationRequest(missing.end,missing.nodes,missing.edges)).toThrow(/source is missing/)
    const retired=fixture('text-to-video');retired.end.data.higgsfieldNative!.retiredPorts=[{id:'old-port',signal:'image',label:'Old'}];const image=media('old','image');retired.nodes.push(image);retired.edges.push({...edge(image,'old'),targetHandle:'old-port'});expect(()=>buildGenerationRequest(retired.end,retired.nodes,retired.edges)).toThrow(/no longer declares/)
    const a=node('a','router',{routeSignal:'video'}),b=node('b','router',{routeSignal:'video'}),end=generator('video-edit')
    const links:Edge[]=[{...edge(a,'video_url'),sourceHandle:'output'},{id:'a-b',source:a.id,sourceHandle:'output',target:b.id,targetHandle:'input'},{id:'b-a',source:b.id,sourceHandle:'output',target:a.id,targetHandle:'input'}]
    expect(()=>buildGenerationRequest(end,[end,a,b],links)).toThrow(/cyclic/)
  })
  it('blocks excessive aggregate references and incomplete native field drafts without dropping saved input',()=>{
    const x=fixture('reference-to-video');x.end.data.higgsfieldNative!.drafts={duration:'1e'}
    expect(()=>buildGenerationRequest(x.end,x.nodes,x.edges)).toThrow(/Complete.*edits/)
    delete x.end.data.higgsfieldNative!.drafts
    const list=node('too-many','list',{listSignal:'image',listItems:Array.from({length:31},(_,i)=>({id:String(i),type:'image',asset:{id:String(i),name:String(i),path:`/fixture/${i}.png`,mimeType:'image/png',createdAt:'fictional',metadata:{referenceDescription:'Authored fixture reference purpose.'}}}))})
    x.nodes.push(list);x.edges=x.edges.filter(link=>link.targetHandle!==higgsfieldFieldPortId('image_urls'));x.edges.push({...edge(list,'image_urls'),sourceHandle:'mixed-out'})
    expect(()=>buildGenerationRequest(x.end,x.nodes,x.edges)).toThrow(/capacity/)
  })
  it.each(['image-to-video','reference-to-video'])('omits an empty optional Manual prompt for %s',mode=>{
    const x=fixture(mode);x.end.data.manualPromptDraft=''
    const request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.prompt).toBe('');expect(request.higgsfieldNative!.values).not.toHaveProperty('prompt')
    expect(()=>assertGenerationRequirements(request)).not.toThrow()
  })
  it.each(['text-to-video','video-extend','video-edit'])('rejects an empty required Manual prompt for %s without inventing prose',mode=>{
    const x=fixture(mode);x.end.data.manualPromptDraft=''
    expect(()=>buildGenerationRequest(x.end,x.nodes,x.edges)).toThrow(/prompt/i)
    expect(x.end.data.manualPromptDraft).toBe('')
  })
  it('retains Location as the permitted semantic start-frame input while rejecting Character in that role',()=>{
    const x=fixture('image-to-video',false),location=node('place','location',{referenceTag:'@Place',referenceAssets:[{id:'place',name:'Place',path:'/fixture/place.png',mimeType:'image/png',createdAt:'fictional',metadata:{referenceDescription:'Authored fixture reference purpose.'}}]})
    x.nodes.push(location);x.edges=x.edges.filter(link=>link.targetHandle!==higgsfieldFieldPortId('image_url'));x.edges.push(edge(location,'image_url'))
    const request=buildGenerationRequest(x.end,x.nodes,x.edges)
    expect(request.references!.find(reference=>reference.slot==='start')!.tag).toBe('@Place')
    location.data.kind='character';expect(()=>buildGenerationRequest(x.end,x.nodes,x.edges)).toThrow(/semantic Reference/)
  })
})


describe('native Higgsfield selected reference role fidelity', () => {
  it.each(['guide', 'auto', 'lock'] as const)('preserves %s through native slot remapping without appearance takeover', mode => {
    const x = fixture('reference-to-video', false)
    const source = x.nodes.find(n => n.data.outputType === 'video')!
    source.data.mediaReferenceMode = 'blocking'
    source.data.referenceDescription = '@video_urls supplies loose camera guidance and travel paths only.'
    const link = x.edges.find(e => e.source === source.id)!
    link.data = { inputFidelity: mode }
    const result = buildGenerationRequest(x.end, x.nodes, x.edges)
    const reference = result.references!.find(r => r.url === source.data.assetUrl)!
    expect(reference).toMatchObject({ mediaReferenceMode: 'blocking', fidelity: undefined })
    expect(result.prompt).toContain(source.data.referenceDescription)
    expect(result.prompt).not.toMatch(/100% matches the reference;.*reference introduction|Match this video reference exactly/)
    expect(result.prompt).not.toMatch(/LOCK RULE|GUIDE RULE|AUTO RULE/)
    expect(link.data).toEqual({ inputFidelity: mode })
  })
})
