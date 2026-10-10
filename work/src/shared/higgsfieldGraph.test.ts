import { describe, expect, it, vi } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode, StudioNodeData, NodeKind } from './types'
import { selectHiggsfieldBinding } from './higgsfieldNodeBinding'
import { preserveFalNativeSelection } from './falNodeBinding'
import { pruneSurplusInputEdges } from './nodeConnections'
import { nodeInputPorts } from './nodePorts'
import { buildGenerationRequest } from './workflowResolver'
import { generationServiceProvider } from './generationServiceProvider'
import { composedProviderPromptEntries } from '../renderer/src/ProviderPromptPreview'
import { executeHiggsfieldGeneration } from '../main/higgsfieldGeneration'
import type { HiggsfieldApi } from '../main/higgsfieldApi'
const motion = 'higgsfield/genjutsu/motion-transfer/v1.0', restyle = 'higgsfield/genjutsu/restyle/v1.0'
const preset = '11111111-1111-1111-1111-111111111111'
function node(id: string, kind: NodeKind, data: Partial<StudioNodeData> = {}): StudioNode { return { id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...data } } }
function target(endpoint = motion) { const result = node('generator', 'video-generator', { videoEngine: 'old-unavailable', promptMode: 'manual', manualPromptDraft: '  Follow the source.\r\nKeep the existing cuts.  ' }); Object.assign(result.data, selectHiggsfieldBinding(result.data, endpoint, [])); if(endpoint===restyle) result.data.higgsfieldNative!.values.preset_id = preset; return result }
function media(id: string, type: 'image' | 'video', url = false) { return node(id, 'upload', { outputType: type, ...(url ? { assetUrl: `https://media.example/${id}.${type === 'video' ? 'mp4' : 'png'}` } : { assetPath: `/managed/${id}.${type === 'video' ? 'mp4' : 'png'}` }) }) }
function edge(source: StudioNode, handle = source.data.outputType === 'video' ? 'video-in' : 'reference-in'): Edge { return { id: source.id + '-' + handle, source: source.id, sourceHandle: 'media-out', target: 'generator', targetHandle: handle } }
function deps() {
 const client = { presets: vi.fn(async () => [{id:preset,name:'Current'}]), upload: vi.fn(async (_bytes: Uint8Array, mime: string) => `https://media.example/${mime.startsWith('video')?'source.mp4':`ref-${client.upload.mock.calls.length}.png`}`), generate: vi.fn(async (_endpoint: string, _input: Record<string, unknown>) => ({requestId:'fictional',url:'https://media.example/output.mp4'})) }
 return { client, assertCurrent: vi.fn(), prepare: vi.fn(async source => ({ source, bytes: new Uint8Array([1]), contentType: source.mediaType==='video'?'video/mp4':'image/png', ...(source.mediaType==='video'?{videoInfo:{duration:10,width:1280,height:720}}:{}) })), api: vi.fn(async () => client as unknown as HiggsfieldApi), persist: vi.fn(async () => ({path:'/managed/result.mp4',url:'prism://result'})) }
}
describe('Higgsfield persisted selection, actual graph and executor composition', () => {
 it.each([1,8])('sends %i ordered images and exact visible prompt through the separate executor', async count => {
  const end=target(), video=media('source','video'), images=Array.from({length:count},(_,i)=>media('image-'+i,'image')), links=[edge(video),...images.map(source=>edge(source))]
  const request=buildGenerationRequest(end,[end,video,...images],links), dependencies=deps()
  expect(generationServiceProvider(end.data)).toBe('higgsfield'); expect(request.falNative).toBeUndefined(); expect(request.duration).toBeUndefined(); expect(request.frameRate).toBeUndefined(); expect(request.generateAudio).toBeUndefined()
  expect(request.higgsfieldNative!.media.image_urls.map(source=>source.path)).toEqual(images.map(source=>source.data.assetPath))
  expect(composedProviderPromptEntries(request,null)[0].body).toBe(end.data.manualPromptDraft)
  await executeHiggsfieldGeneration(request.higgsfieldNative!,dependencies)
  expect(dependencies.client.generate).toHaveBeenCalledOnce(); expect(dependencies.client.generate.mock.calls[0][1]).toMatchObject({prompt:end.data.manualPromptDraft,resolution:'720p'})
 })
 it.each([0,5])('Restyle accepts %i images while retaining the preset UUID', count => {
  const end=target(restyle),video=media('source','video'),images=Array.from({length:count},(_,i)=>media('ref-'+i,'image'))
  const request=buildGenerationRequest(end,[end,video,...images],[edge(video),...images.map(source=>edge(source))]); expect(request.higgsfieldNative!.values.preset_id).toBe(preset); expect(request.higgsfieldNative!.media.image_urls).toHaveLength(count)
 })
 it('accepts an empty optional authored prompt with no default provider prose', () => { const end=target(restyle), video=media('source','video'); end.data.manualPromptDraft=''; const request=buildGenerationRequest(end,[end,video],[edge(video)]); expect(request.prompt).toBe(''); expect(request.providerPromptOverride).toBe(''); expect(composedProviderPromptEntries(request,null)[0].body).toBe('') })
 it('fails overload expanded through List and Router before any executor exists', () => {
  const end=target(),video=media('source','video'),list=node('images','list',{listSignal:'image',listItems:Array.from({length:9},(_,i)=>({id:String(i),type:'image',asset:{id:String(i),path:`/managed/${i}.png`,name:String(i),mimeType:'image/png',createdAt:'2026-10-09'}}))}),router=node('route','router',{routeSignal:'image'})
  const links:Edge[]=[edge(video),{id:'list-route',source:list.id,sourceHandle:'mixed-out',target:router.id,targetHandle:'input'},{...edge(router,'reference-in'),sourceHandle:'output'}]
  expect(()=>buildGenerationRequest(end,[end,video,list,router],links)).toThrow(/image references|at most/)
 })
 it('checks aggregate capacity across Character, Element and Image sockets', () => {
  const end=target(restyle),video=media('source','video'),props=node('props','element',{referenceAssets:Array.from({length:5},(_,i)=>({id:String(i),path:`/managed/prop${i}.png`,name:String(i),mimeType:'image/png',createdAt:'2026-10-09'}))}),other=media('other','image')
  expect(()=>buildGenerationRequest(end,[end,video,props,other],[edge(video),edge(props,'element-in'),edge(other)])).toThrow(/image references|at most/)
 })
 it('keeps intentional duplicate graph slots while uploads deduplicate identical paths', async () => {
  const end=target(),video=media('source','video'),a=media('a','image'),b=media('b','image');b.data.assetPath=a.data.assetPath
  const request=buildGenerationRequest(end,[end,video,a,b],[edge(video),edge(a),edge(b)]), dependencies=deps(); expect(request.higgsfieldNative!.media.image_urls).toHaveLength(2)
  await executeHiggsfieldGeneration(request.higgsfieldNative!,dependencies);expect(dependencies.client.upload).toHaveBeenCalledTimes(2); const input=dependencies.client.generate.mock.calls[0][1];expect(input.image_urls).toHaveLength(2);expect((input.image_urls as string[])[0]).toBe((input.image_urls as string[])[1])
 })
 it('retains connected unsupported Storyboard sockets and blocks instead of ignoring them', () => {
  const end=target(),story=node('story','storyboard',{storyboardPanels:[]}),video=media('source','video'),image=media('ref','image')
  const selected=selectHiggsfieldBinding(end.data,motion,[{id:'storyboard-in',signal:'storyboard',label:'Storyboard'}]); Object.assign(end.data,selected)
  expect(nodeInputPorts(end.data).find(port=>port.id==='storyboard-in')).toMatchObject({maxConnections:0,label:'Unavailable · Storyboard'})
  expect(()=>buildGenerationRequest(end,[end,story,video,image],[edge(story,'storyboard-in'),edge(video),edge(image)])).toThrow(/no longer declares/)
 })
 it('preserves mode-specific preset/resolution/consent on switches and JSON reopen', () => {
  const end=target(restyle);end.data.higgsfieldNative!.allowSourceTrimming=true;end.data.higgsfieldNative!.values.resolution='1080p'
  Object.assign(end.data,selectHiggsfieldBinding(end.data,motion,[]));end.data.higgsfieldNative!.values.resolution='480p'
  Object.assign(end.data,selectHiggsfieldBinding(end.data,restyle,[]));const reopened=JSON.parse(JSON.stringify(end.data));expect(reopened.higgsfieldNative.values).toEqual({preset_id:preset,resolution:'1080p'});expect(reopened.higgsfieldNative.allowSourceTrimming).toBe(true)
  const direct={...reopened,...preserveFalNativeSelection(reopened),videoEngine:'wan-controlled'};expect(direct.higgsfieldNative).toBeUndefined();expect(direct.higgsfieldNativePresets[restyle].values.preset_id).toBe(preset);expect(generationServiceProvider(direct)).toBe('fal')
 })
 it('preserves unavailable routes and changed revisions but fails before execution', () => {
  const end=target(),video=media('source','video'),image=media('ref','image'), links=[edge(video),edge(image)]
  end.data.higgsfieldNative!.contractRevision='old';expect(()=>buildGenerationRequest(end,[end,video,image],links)).toThrow(/contract changed/)
  end.data.higgsfieldNative!.endpointId='higgsfield/future/unknown';expect(nodeInputPorts(end.data).find(port=>port.id==='video-in')).toBeDefined();expect(()=>buildGenerationRequest(end,[end,video,image],links)).toThrow(/no verified/)
 })
 it('binds public URL sources without fetching or claiming their duration', () => {
  const end=target(),video=media('source','video',true),image=media('ref','image',true),links=[edge(video),edge(image)]
  expect(()=>buildGenerationRequest(end,[end,video,image],links)).toThrow(/duration is unverified/);end.data.higgsfieldNative!.allowSourceTrimming=true
  const request=buildGenerationRequest(end,[end,video,image],links);expect(request.higgsfieldNative!.media.video_url).toEqual([{mediaType:'video',url:video.data.assetUrl}]);expect(request.higgsfieldNative!.media.image_urls).toEqual([{mediaType:'image',url:image.data.assetUrl}])
 })
 it('keeps typed source media and connected text bytes; no automatic cinematic boilerplate', () => {
  const end=target(),video=media('source','video'),image=media('ref','image'),text=node('text','prompt',{prompt:'  Camera follows source only.  '})
  const request=buildGenerationRequest(end,[end,video,image,text],[edge(video),edge(image),{...edge(text,'text-in'),sourceHandle:'text-out'}]);expect(request.prompt).toBe(end.data.manualPromptDraft+'\n\n'+text.data.prompt)
  image.data.outputType='audio';expect(()=>buildGenerationRequest(end,[end,video,image],[edge(video),edge(image,'reference-in')])).toThrow(/Audio/)
 })
 it('does not permit both independent native provider bindings to coexist', () => { const end=target(),video=media('source','video');end.data.falNative={endpointId:'fal-ai/fake',label:'Fake',flow:'video',values:{},media:[]};expect(()=>buildGenerationRequest(end,[end,video],[edge(video)])).toThrow(/one Higgsfield/) })
})

import { higgsfieldPresetReadinessFailures } from './higgsfieldNodeBinding'
it('blocks missing/stale presets without substituting their saved UUID', () => {
 const state=target(restyle).data.higgsfieldNative!, before=JSON.stringify(state)
 expect(higgsfieldPresetReadinessFailures(state,{presets:[{id:preset}]})).toEqual([])
 expect(higgsfieldPresetReadinessFailures(state,{presets:[]})).toEqual([expect.stringContaining('saved UUID')])
 expect(higgsfieldPresetReadinessFailures(state,{presets:[{id:preset}],loading:true})).toEqual([expect.stringContaining('load current')])
 expect(higgsfieldPresetReadinessFailures(state,{presets:[{id:preset}],error:'Unavailable'})).toEqual(['Unavailable'])
 expect(JSON.stringify(state)).toBe(before)
})

it('native reconciliation retains overloaded and retired edges for visible repair rather than deleting them', () => {
 const end=target(restyle), source=media('ref','image'), links=Array.from({length:7},(_,i)=>({...edge(source),id:'edge'+i}));const result=pruneSurplusInputEdges(links,[end,source]);expect(result.edges).toEqual(links);expect(result.removed).toEqual([])
 end.data.higgsfieldNative!.retiredPorts=[{id:'old-input',signal:'image',label:'Old'}];const retired={...edge(source,'old-input'),id:'retired'};expect(pruneSurplusInputEdges([...links,retired],[end,source]).edges).toHaveLength(8)
})

import { connectedInputRule } from './inputRules'
import { resetHiggsfieldBinding } from './higgsfieldNodeBinding'
it('shows native source labels without promising ignored Guide/Auto/Lock controls', () => {
 const end=target(), source=media('source','video');const rule=connectedInputRule(source.data,end.data,'video-in','lock');expect(rule.label).toBe('Source Video');expect(rule.toggleable).toBeUndefined();expect(rule.mode).toBeUndefined()
 end.data.higgsfieldNative!.retiredPorts=[{id:'end-image',label:'Ending Image',signal:'image'}];expect(connectedInputRule(source.data,end.data,'end-image').label).toBe('Unavailable · Ending Image')
})
it('explicit reset restores native defaults without deleting sockets or altering authored prompt', () => {
 const end=target(restyle);end.data.higgsfieldNative!.allowSourceTrimming=true;end.data.higgsfieldNative!.values.resolution='1080p';end.data.higgsfieldNative!.retiredPorts=[{id:'old',label:'Old',signal:'image'}]
 const reset=resetHiggsfieldBinding(end.data.higgsfieldNative!);expect(reset.values).toEqual({resolution:'720p'});expect(reset.allowSourceTrimming).toBe(false);expect(reset.retiredPorts).toEqual(end.data.higgsfieldNative!.retiredPorts);expect(end.data.manualPromptDraft).toBe('  Follow the source.\r\nKeep the existing cuts.  ')
})
