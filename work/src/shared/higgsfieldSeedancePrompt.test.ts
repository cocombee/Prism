import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { describeHiggsfieldInputContract } from './higgsfieldInputContract'
import { higgsfieldSeedanceSchema, HIGGSFIELD_SEEDANCE_INPUT_REVISION } from './higgsfieldSeedanceInput'
import { compileHiggsfieldSeedancePrompt, type HiggsfieldPromptSlot } from './higgsfieldSeedancePrompt'
import { completeStructuredSeedanceMaster } from './referenceInstructions'

const endpoint='bytedance/seedance-2.5/reference-to-video'
const contract=describeHiggsfieldInputContract(endpoint,higgsfieldSeedanceSchema(endpoint),'')
function input(authored='The performer continues the task.') {
  const slots:HiggsfieldPromptSlot[]=['image_urls','video_urls'].map(key=>{
    const binding=contract.media.find(item=>item.key===key)!
    return {binding,index:0,reference:{role:'reference',tag:'@list-1',mediaType:binding.type,url:`https://cdn.prism.example/${binding.type}`,authority:binding.type==='video'?'motion-camera':'appearance'}}
  })
  const request:GenerationRequest={kind:'video-generator',nodeId:'fixture',prompt:authored,authoredPrompt:authored,videoEngine:'stale-other-model',references:slots.map(slot=>slot.reference),duration:5,
    higgsfieldNative:{endpointId:endpoint,contractRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,values:{duration:5},media:{image_urls:[{mediaType:'image',url:slots[0].reference.url}],video_urls:[{mediaType:'video',url:slots[1].reference.url}]}}}
  return {request,slots}
}
describe('Higgsfield native semantic prompt ownership',()=>{
  it('replaces unauthored ambiguous batch aliases with ordinary input labels without mutating source records',()=>{
    const x=input(),before=JSON.stringify(x),compiled=compileHiggsfieldSeedancePrompt(x.request,x.slots)
    expect(compiled.text).not.toContain('@list-1');expect(compiled.text).toContain('Reference image 1: Reference image 1');expect(compiled.text).toContain('Reference video 1: Reference video 1')
    expect(JSON.stringify(x)).toBe(before)
  })
  it('rejects an authored ambiguous alias instead of guessing which attachment it means',()=>{
    const x=input('Follow @list-1 exactly.'),before=JSON.stringify(x)
    expect(()=>compileHiggsfieldSeedancePrompt(x.request,x.slots)).toThrow(/names different included media/)
    expect(JSON.stringify(x)).toBe(before)
  })
  it('does not confuse an exact longer anchor with an ambiguous prefix',()=>{
    const x=input('Use @list-11 as the visual reference.')
    const binding=contract.media.find(field=>field.key==='image_urls')!
    for(let index=1;index<11;index++) {
      const url=`https://cdn.prism.example/image-${index+1}`,reference={role:'reference' as const,tag:`@list-${index+1}`,mediaType:'image' as const,url}
      x.slots.push({binding,index,reference});x.request.higgsfieldNative!.media.image_urls.push({mediaType:'image',url})
    }
    expect(compileHiggsfieldSeedancePrompt(x.request,x.slots).text).toContain('@list-11')
  })
  it('preserves the exact bytes of a complete authored master and skips automatic mapping insertion',()=>{
    const x=input()
    const master='\r\n  '+['FORMAT MODE\nOne authored shot.','SHOT 1\nThe task continues.','SCENE CONTEXT\nThe authored scene.','ACTIVE REFERENCES\nUse the selected reference inputs.','CAMERA\nA locked camera.','LIGHTING\nThe authored lighting.','STYLE\nThe authored look.','CONTINUITY\nPreserve the established state.','CHARACTER ACTING\nContinue the authored performance.','PHYSICS\nMaintain physical contact.','AUDIO\nThe authored room tone.','QUALITY\nPreserve the source detail.','NEGATIVE PROMPT\nUnrequested changes.'].join('\n\n')+'\r\n  '
    expect(completeStructuredSeedanceMaster(master.trim())).toBe(true)
    const result=compileHiggsfieldSeedancePrompt({...x.request,prompt:master,authoredPrompt:master},x.slots)
    expect(result.text).toBe(master)
  })
  it('does not borrow a fallback model capability when the native route is absent from the legacy registry',()=>{
    const x=input('Replace the runner with the connected Character.')
    x.request.higgsfieldNative!.endpointId='bytedance/seedance-2.5/video-edit'
    const compiled=compileHiggsfieldSeedancePrompt(x.request,x.slots)
    expect(compiled.controlDiagnostics!.find(item=>item.code==='filmic-motion-provider-support')).toMatchObject({captureCadence:'native-unverified',shutter:'native-unverified',message:expect.stringContaining('selected Higgsfield model')})
    expect(compiled.text).not.toContain('face replacement, anatomy')
  })
  it('respects explicit camera prose without adding default camera or motion controls',()=>{
    const x=input('CAMERA\nA locked static camera holds the authored viewpoint.')
    const compiled=compileHiggsfieldSeedancePrompt(x.request,x.slots)
    expect(compiled.text).toContain('A locked static camera holds the authored viewpoint.')
    expect(compiled.text).not.toMatch(/Where no camera behavior is authored|180.degree shutter/i)
  })
})
