import {describe,it,expect} from 'vitest'
import {higgsfieldStoryboardTimingFailures} from './higgsfieldVideoTiming'
import {HIGGSFIELD_SEEDANCE_INPUT_REVISION} from './higgsfieldSeedanceInput'
import {generationRequirementFailures} from './generationReadiness'
import type {GenerationRequest} from './types'
const request=(durations:number[],nativeDuration=4):GenerationRequest=>({nodeId:'fixture-node',kind:'video-generator',videoEngine:'stale-legacy-route',prompt:'Exact compiled body.',providerPromptOwnership:'compiled',storyboardShots:durations.map(duration=>({prompt:'Action.',duration,shotSize:'medium',camera:'static'})),higgsfieldNative:{endpointId:'bytedance/seedance-2.5/text-to-video',contractRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,values:{prompt:'Exact compiled body.',duration:nativeDuration},media:{}}})
describe('mode-owned Higgsfield Storyboard timing',()=>{
  it('uses1s beat minimum independently of4s native clip minimum and permits half-second steps',()=>{
    expect(higgsfieldStoryboardTimingFailures(request([1,1.5,1.5]))).toEqual([])
    expect(higgsfieldStoryboardTimingFailures(request([1,1,1,1]))).toEqual([])
    expect(higgsfieldStoryboardTimingFailures(request([.5,3.5]))[0]).toMatch(/at least 1.0s/)
  })
  it('preserves mismatched totals, fractional native durations and maximum overflow for review',()=>{
    for(const original of [request([1,1],4),request([1,1.5,2],4.5),request([15,16],30)]){
      const before=JSON.stringify(original)
      expect(higgsfieldStoryboardTimingFailures(original)).not.toEqual([])
      expect(JSON.stringify(original)).toBe(before)
    }
    expect(higgsfieldStoryboardTimingFailures(request([1,1],4))[0]).toMatch(/must match/)
  })
  it('does not parse or retime exact Manual bodies using unused beat metadata',()=>{
    const manual={...request([.5,30],4),providerPromptOverride:'  Exact approved body.\r\n',providerPromptOwnership:'authored' as const}
    expect(higgsfieldStoryboardTimingFailures(manual)).toEqual([])
  })
  it('propagates timing failures through the production readiness owner before main work',()=>{
    expect(generationRequirementFailures(request([.5,3.5])).join(' ')).toMatch(/at least 1.0s/)
    expect(generationRequirementFailures(request([1,1],4)).join(' ')).toMatch(/must match/)
  })
})
