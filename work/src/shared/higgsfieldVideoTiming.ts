import type {GenerationRequest} from './types'
import {planHiggsfieldNativeInput,higgsfieldSourceOwnsTimeline} from './higgsfieldNative'
import {authoredTimelineSeconds} from './videoTiming'
import {hasExactAuthoredProviderBody} from './providerPromptOwnership'
import {ownsExactSeedanceMaster} from './seedanceAuthoredMaster'

/** Native clip timing is separate from individual authored beat timing. Never
 * parse a Manual master or coerce/pad saved native values into matching it. */
export function higgsfieldStoryboardTimingFailures(request:GenerationRequest):string[] {
  if(!request.higgsfieldNative || request.kind!=='video-generator' || higgsfieldSourceOwnsTimeline(request.higgsfieldNative.endpointId))return []
  if(hasExactAuthoredProviderBody(request)||ownsExactSeedanceMaster(request))return []
  try{
    const plan=planHiggsfieldNativeInput(request.higgsfieldNative)
    if(plan.kind!=='seedance')return []
    if(request.multiPrompt?.length)return ['The selected native Seedance route takes one final prompt, not a provider multi_prompt array. Preserve and compile the authored Storyboard before generating.']
    const total=authoredTimelineSeconds(request)
    if(total===undefined)return []
    const actual=plan.values.duration
    if(typeof actual!=='number'||Math.abs(actual-total)>0.000001)return [`Native duration ${String(actual)}s must match the authored ${total}s timeline. Match the duration or explicitly revise panel timing; no padding, rounding or trimming was applied.`]
    return []
  }catch(error){return [error instanceof Error?error.message:'Review the preserved native timeline.']}
}
