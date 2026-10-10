import { describe, expect, it } from 'vitest'
import { groupStoryboardSequence, normalizedStoryboardTransition, STORYBOARD_OUTGOING_CONTINUATION, storyboardTransitionConflicts } from './storyboardSequence'
import { seedanceShotSpecSections, productionShotSpecSections } from './shotSpec'
import { compileProviderPrompt, providerSeedancePayloadCompilation } from './referenceInstructions'
import { storyboardRewriteInstruction, storyboardBatchTargets, storyboardBatchRewriteInstruction } from './storyboardRewrite'
import { buildGenerationRequest, resolveWorkflowInput } from './workflowResolver'
import { buildKlingNativeMultiPrompt } from './klingNativeStoryboard'
import type { GenerationRequest, StoryboardPanel, StudioNode } from './types'
const panels: StoryboardPanel[] = [
 { id:'a', prompt:'The courier approaches.', duration:2, shotSize:'wide', camera:'static', transitionToNext:'continue' },
 { id:'b', prompt:'The courier reaches the door.', duration:3, shotSize:'wide', camera:'static', transitionToNext:'hard-cut' },
 { id:'c', prompt:'The courier moves through the doorway.', duration:4, shotSize:'medium', camera:'static', transitionToNext:'continue', locked:true }
]
const request = (): GenerationRequest => ({nodeId:'video',kind:'video-generator',videoEngine:'bytedance/seedance-2.5/text-to-video',prompt:'Preserve the authored sequence.',authoredPrompt:'Preserve the authored sequence.',duration:9,storyboardShots:panels.map(p=>({panelId:p.id,prompt:p.prompt,duration:Number(p.duration),shotSize:p.shotSize!,camera:p.camera!,transitionToNext:p.transitionToNext}))})
const graph = (items=panels) => {
 const story:StudioNode={id:'story',type:'studio',position:{x:0,y:0},data:{kind:'storyboard',title:'Storyboard',storyboardPanels:items,storyboardDuration:9}}
 const video:StudioNode={id:'video',type:'studio',position:{x:0,y:0},data:{kind:'video-generator',title:'Video',videoEngine:'bytedance/seedance-2.5/text-to-video',duration:9,promptMode:'auto'}}
 return {story,video,nodes:[story,video],edges:[{id:'s',source:'story',sourceHandle:'storyboard-out',target:'video',targetHandle:'storyboard-in'}]}
}
describe('authored outgoing Storyboard continuation',()=>{
 it('keeps a final hook independently of mixed internal grouping and without an extra shot, cut or time',()=>{
  const before=JSON.stringify(panels),sequence=groupStoryboardSequence(request().storyboardShots!)
  expect(sequence.shots.map(s=>s.duration)).toEqual([5,4]);expect(sequence.hardCutCount).toBe(1);expect(sequence.totalDuration).toBe(9)
  expect(normalizedStoryboardTransition('continue',2,3)).toBe('continue');expect(normalizedStoryboardTransition('hard-cut',2,3)).toBeUndefined();expect(JSON.stringify(panels)).toBe(before)
 })
 it('retains the hook exactly once in the Seedance timeline and payload without inventing a final stop',()=>{
  const input=request(),sections=seedanceShotSpecSections(input),timeline=sections.find(s=>s.heading==='TIMELINE / SHOT PLAN')?.text || sections.find(s=>s.heading.includes('TIMELINE'))!.text
  expect(timeline.split(STORYBOARD_OUTGOING_CONTINUATION)).toHaveLength(2);expect(timeline.match(/^HARD CUT\.$/gm)).toHaveLength(1)
  expect(timeline).toContain('SHOT 2 · 5.0–9.0s');expect(timeline).not.toContain('SHOT 3');expect(timeline).toContain('no unauthored stop or next beat')
  const payload=providerSeedancePayloadCompilation(input).text;expect(payload).toContain(STORYBOARD_OUTGOING_CONTINUATION);expect(payload.match(/^HARD CUT\.$/gm)).toHaveLength(1)
 })
 it('keeps generic and Kling native group output at the authored shot count and duration with a required final hook',()=>{
  const input=request(),sections=productionShotSpecSections(input),last=sections.find(s=>s.id==='cut-3')!
  expect(last.required).toBe(true);expect(last.text).toContain(STORYBOARD_OUTGOING_CONTINUATION)
  const native=buildKlingNativeMultiPrompt(input.storyboardShots!)
  expect(native.map(s=>s.duration)).toEqual(['5','4']);expect(native[0].prompt).not.toContain(STORYBOARD_OUTGOING_CONTINUATION);expect(native[1].prompt).toContain(STORYBOARD_OUTGOING_CONTINUATION)
 })
 it('preserves the hook through the actual graph and upstream serialized plan',()=>{
  const g=graph(),output=buildGenerationRequest(g.video,g.nodes,g.edges),upstream=resolveWorkflowInput('video',g.nodes,g.edges)
  expect(output.storyboardShots?.at(-1)?.transitionToNext).toBe('continue');expect(output.storyboardShots?.map(s=>s.duration)).toEqual([2,3,4])
  expect(upstream.prompt).toContain(STORYBOARD_OUTGOING_CONTINUATION);expect(providerSeedancePayloadCompilation(output).text.split(STORYBOARD_OUTGOING_CONTINUATION)).toHaveLength(2)
 })
 it('preserves a locked final hook in single and batch rewrite context without inventing an editable panel',()=>{
  const before=JSON.stringify(panels),batch=storyboardBatchTargets(panels)
  expect(batch.context.at(-1)).toMatchObject({boundary:'final-continue',editable:false,locked:true});expect(batch.targets.map(p=>p.id)).toEqual(['a','b'])
  for(const text of [storyboardRewriteInstruction(panels,'a'),storyboardBatchRewriteInstruction(panels,new Map())])expect(text).toContain('FINAL PANEL · OUTGOING CONTINUE HOOK; DO NOT INVENT THE NEXT PANEL')
  expect(JSON.stringify(panels)).toBe(before)
 })
 it('keeps unsupported saved transitions intact and blocks actual graph/compilation/rewrite while UI normalization stays safe',()=>{
  for(const index of [0,2]){
   const invalid=panels.map((p,i)=>i===index?{...p,transitionToNext:'flash' as never}:p),before=JSON.stringify(invalid),g=graph(invalid)
   expect(normalizedStoryboardTransition('flash' as never,index,3)).toBeUndefined();expect(storyboardTransitionConflicts(invalid)[0]).toMatch(/unsupported saved transition/)
   for(const action of [()=>groupStoryboardSequence(invalid.map(p=>({...p,duration:Number(p.duration)}))),()=>buildGenerationRequest(g.video,g.nodes,g.edges),()=>storyboardBatchTargets(invalid),()=>storyboardRewriteInstruction(invalid,'a')])expect(action).toThrow(/unsupported saved transition/)
   const input=request();input.storyboardShots![index].transitionToNext='flash' as never
   expect(()=>seedanceShotSpecSections(input)).toThrow(/unsupported saved transition/);expect(()=>productionShotSpecSections(input)).toThrow(/unsupported saved transition/);expect(JSON.stringify(invalid)).toBe(before)
  }
 })
 it('rejects conflicting HARD CUT prose even on a final Continue but preserves approved Manual bytes',()=>{
  const input=request();input.storyboardShots!.at(-1)!.prompt='Keep moving. HARD CUT.'
  expect(()=>seedanceShotSpecSections(input)).toThrow(/Continue after Storyboard panel 3 conflicts/)
  const manual='  APPROVED MASTER\r\nContinue\r\n';expect(compileProviderPrompt({...input,providerPromptOverride:manual}).text).toBe(manual)
 })
})
