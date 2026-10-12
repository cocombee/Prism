import { describe, expect, it } from 'vitest'
import { createVideoDraftReceipt, selectedVideoDraft, videoDraftCompletionRequest, videoDraftProvider, videoDraftResolutionLabel, videoDraftModelTransition } from './videoDraft'
import { buildGenerationRequest } from './workflowResolver'
import type { StudioNode } from './types'

describe('Draft ownership at the existing Video Generator', () => {
  it('a normal 480p clip and an Omni360p clip are never treated as linked Seedance drafts', () => {
    expect(videoDraftResolutionLabel('google/gemini-omni-flash/v1.1/text-to-video', '360p')).toBe('Draft · 360p')
    expect(videoDraftResolutionLabel('google/gemini-omni-flash/v1.1/text-to-video', '1080p')).toBeUndefined()
    expect(videoDraftProvider({ falNative: { endpointId: 'google/gemini-omni-flash/v1.1/text-to-video' } } as never)).toBeUndefined()
    expect(selectedVideoDraft({ kind: 'video-generator', title: 'Video Generator', generatedResults: [{ path: '/normal480.mp4', url: 'v', type: 'video', modelId: 'bytedance/seedance-2.5/text-to-video' }] })).toBeUndefined()
  })
  it('save/reopen retains the selected take and completion never reads new graph inputs', () => {
    const node: StudioNode = { id: 'video', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'video-generator', title: 'Video Generator', videoEngine: 'byteplus/seedance-2.5/text-to-video', quantity: 4 } }
    const receipt = createVideoDraftReceipt('byteplus', 'dreamina-seedance-2-5-260628', 'fixture-draft-1', 'video', 'a'.repeat(64), new Date().toISOString())
    // Use an actual registered current BytePlus route rather than a fabricated alias.
    const route = videoDraftProvider(node.data)
    expect(route).toBe('byteplus')
    node.data.generatedResults = [{ path: '/draft.mp4', url: 'v', type: 'video', modelId: node.data.videoEngine!, videoDraft: receipt }]
    node.data.draftCompletionPath = '/draft.mp4'
    const reopened = JSON.parse(JSON.stringify(node)) as StudioNode
    expect(buildGenerationRequest(reopened, [reopened], [])).toEqual({ nodeId: 'video', kind: 'video-generator', quantity: 1, draftCompletion: { provider: 'byteplus', outputPath: '/draft.mp4' } })
    reopened.data.generatedResults!.push({ path: '/final.mp4', url: 'final', type: 'video', modelId: node.data.videoEngine!, videoDraft: { ...receipt, status: 'final', sourcePath: '/draft.mp4' } })
    reopened.data.activeResultIndex = 1
    expect(videoDraftCompletionRequest('video', reopened.data).draftCompletion?.outputPath).toBe('/draft.mp4')
    reopened.data.activeResultIndex = 2
    reopened.data.generatedResults!.push({ path: '/other.mp4', url: 'o', type: 'video', modelId: 'other' })
    expect(() => videoDraftCompletionRequest('video', reopened.data)).toThrow('original draft')
  })
})

 describe('draft-final locks belong only to the selected model', () => {
  const original={kind:'video-generator',title:'Video',draftCompletionPath:'/draft.mp4',falNative:{endpointId:'bytedance/seedance-2.5/text-to-video',values:{}},generatedResults:[{path:'/final.mp4',url:'',type:'video'}]} as StudioNode['data']
  it.each(['alibaba/wan-3.0-prime/text-to-video','fal-ai/wan/v2.2-a14b/text-to-video','fal-ai/kling-video/v3/standard/text-to-video','google/gemini-omni-flash/v1.1/text-to-video'])('clears completion intent when selecting %s, retaining outputs', endpointId => {
    const patch=videoDraftModelTransition(original,{falNative:{...original.falNative!,endpointId}})
    expect(patch).toHaveProperty('draftCompletionPath',undefined)
    expect({...original,...patch}.generatedResults).toBe(original.generatedResults)
  })
  it('clears serving-provider changes, legacy selection and explicit generation edits',()=>{
    expect(videoDraftModelTransition(original,{falNative:undefined,higgsfieldNative:{endpointId:'higgsfield/wan-3.0',values:{}} as never})).toHaveProperty('draftCompletionPath',undefined)
    expect(videoDraftModelTransition(original,{falNative:undefined,videoEngine:'wan-controlled'})).toHaveProperty('draftCompletionPath',undefined)
    const patch={falNative:{...original.falNative!,values:{duration:'8'}}}
    expect(videoDraftModelTransition(original,patch)).toHaveProperty('draftCompletionPath',undefined)
    for(const patch of [{quantity:2},{motionCadence:12},{motionCadenceMode:'native' as const},{aspectRatio:'9:16'},{manualPromptDraft:'New action.'}]) expect(videoDraftModelTransition(original,patch)).toHaveProperty('draftCompletionPath',undefined)
    const unchanged={falNative:{...original.falNative!,label:'Refreshed label',values:{}}}
    expect(videoDraftModelTransition(original,unchanged)).toBe(unchanged)
    const completion={falNative:{...original.falNative!,values:{resolution:'1080p'}},draftCompletionPath:'/draft.mp4'}
    expect(videoDraftModelTransition(original,completion)).toBe(completion)
  })
 })
