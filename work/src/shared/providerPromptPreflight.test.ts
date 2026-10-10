import {describe,expect,it,vi} from 'vitest'
import {assertVideoProviderPromptPreflight} from './providerPromptPreflight'
import {generationRequirementFailures} from './generationReadiness'
import {compileNativeProviderPrompt,compileProviderPromptForSubmission,providerPromptPreviewCompilation} from './referenceInstructions'
import {compileBytePlusGenerationRequest} from '../main/byteplusGeneration'
import {executeFalNativeGeneration} from '../main/falNativeGeneration'
import type {GenerationRequest} from './types'
const master = ['FORMAT MODE','one shot','SHOT 1','@maya holds the cup.','SCENE CONTEXT','Kitchen','ACTIVE REFERENCES','@maya','CAMERA','Static','LIGHTING','Window','STYLE','Natural','CONTINUITY','Same cup','CHARACTER ACTING','Quiet','PHYSICS','Grounded','AUDIO','Room tone','QUALITY','Clean','NEGATIVE PROMPT','identity drift'].join('\n')
const request=(extra:Partial<GenerationRequest>={}):GenerationRequest=>({nodeId:'boundary-qa',kind:'video-generator',videoEngine:'bytedance/seedance-2.5/reference-to-video',prompt:master,authoredPrompt:master,duration:5,references:[{role:'character',tag:'@maya',path:'/fictional/maya.png',characterAuthorityMode:'complete-dressed-body'}],...extra})
describe('final-body integrity before service work',()=>{
 it.each(['AUDIO\nnew speech','QUALITY\nnew target','SHOT 2\nnew scene','**CAMERA**\nnew move','NEGATIVE PROMPT\nduplicate'])('rejects appended %s across visible, submission and native compilers without rewriting',tail=>{
  const input=request({prompt:master+'\n'+tail,authoredPrompt:master+'\n'+tail}),before=JSON.stringify(input)
  expect(generationRequirementFailures(input)).toEqual(expect.arrayContaining([expect.stringMatching(/final section|once|syntax/i)]))
  expect(()=>providerPromptPreviewCompilation(input)).toThrow(/final section|once|syntax/i)
  expect(()=>compileProviderPromptForSubmission(input,{family:'seedance'})).toThrow(/final section|once|syntax/i)
  expect(()=>compileNativeProviderPrompt(input,'seedance')).toThrow(/final section|once|syntax/i)
  expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/final section|once|syntax/i)
  expect(JSON.stringify(input)).toBe(before)
 })
 it('rejects direct BytePlus malformed Auto master before its first resolver call',async()=>{
  const input=request({videoEngine:'byteplus/seedance-2.5/reference-to-video',authoredPrompt:master+'\nAUDIO\nNew sound'}),resolve=vi.fn(async()=> 'https://files.example/maya.png')
  await expect(compileBytePlusGenerationRequest(input,resolve)).rejects.toThrow(/final section/i)
  expect(resolve).not.toHaveBeenCalled()
 })
 it('checks the actual native compiled field before schema lookup or any other dependency',async()=>{
  const input=request({providerPromptOverride:master+'\nCAMERA\nChanged',providerPromptOwnership:'compiled',falNative:{endpointId:'bytedance/seedance-2.5/reference-to-video',fingerprint:'a'.repeat(64),flow:'video',promptField:'prompt',promptOwnership:'compiled',values:{prompt:master+'\nCAMERA\nChanged'},media:{}}})
  const work=vi.fn(),before=JSON.stringify(input)
  expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/final section/i)
  expect(()=>compileProviderPromptForSubmission(input)).toThrow(/final section/i)
  expect(()=>providerPromptPreviewCompilation(input)).toThrow(/final section/i)
  await expect(executeFalNativeGeneration(input.falNative!,input.kind,{contract:work,assertCurrent:work,prepareSource:work,client:work,upload:work,submit:work,persist:work})).rejects.toThrow(/final section/i)
  expect(work).not.toHaveBeenCalled();expect(JSON.stringify(input)).toBe(before)
 })
 it('preserves exact Manual and legacy HARD AVOID bodies, including unused typed metadata',()=>{
  const text='  HARD AVOID\nKeep this approved older layout.\r\n  ',input=request({providerPromptOverride:text,providerPromptOwnership:'authored',storyboardShots:[{prompt:'Unused',duration:5,camera:'static',shotSize:'wide',characterStates:[{characterTag:'@maya',visibility:'off-camera'}]}]})
  expect(()=>assertVideoProviderPromptPreflight(input)).not.toThrow()
  expect(providerPromptPreviewCompilation(input).text).toBe(text)
  expect(compileNativeProviderPrompt(input,'seedance').text).toBe(text)
 })
 it('keeps complete valid Auto master text and only applies native adapter tag mapping',()=>{
  const input=request(),before=JSON.stringify(input)
  expect(()=>assertVideoProviderPromptPreflight(input)).not.toThrow()
  expect(providerPromptPreviewCompilation(input).text).toBe(master)
  expect(compileNativeProviderPrompt(input,'seedance').text).toBe(master.replaceAll('@maya','[Image1]'))
  expect(JSON.stringify(input)).toBe(before)
 })
})

describe('effective native ownership, route and visible binding',()=>{
 const nativeRequest=(extra:Partial<GenerationRequest>={}):GenerationRequest=>({nodeId:'native-boundary',kind:'video-generator',videoEngine:'fal-ai/kling-video/v3/pro/text-to-video',providerPromptOverride:'NEGATIVE PROMPT\ndrift',falNative:{endpointId:'bytedance/seedance-2.5/text-to-video',fingerprint:'a'.repeat(64),flow:'video',promptOwnership:'compiled',promptField:'prompt',values:{prompt:'NEGATIVE PROMPT\ndrift'},media:{}},...extra})
 it('honors nested-only compiled ownership and actual native routing over a stale engine',()=>{
  const input=nativeRequest();input.falNative!.values.prompt='NEGATIVE PROMPT\ndrift\nAUDIO\nlate';input.providerPromptOverride=input.falNative!.values.prompt as string
  expect(generationRequirementFailures(input)).toEqual(expect.arrayContaining([expect.stringMatching(/final section/i)]))
  expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/final section/i)
 })
 it.each(['authored','invalid',null])('rejects conflicting or invalid outer owner %s',owner=>{
  const input=nativeRequest({providerPromptOwnership:owner as GenerationRequest['providerPromptOwnership']})
  expect(generationRequirementFailures(input)).toEqual(expect.arrayContaining([expect.stringMatching(/owner/i)]))
  expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/owner/i)
 })
 it.each(['invalid',null])('rejects invalid nested owner %s rather than treating it as legacy',owner=>{
  const input=nativeRequest();input.falNative!.promptOwnership=owner as 'compiled'
  expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/owner/i)
 })
 it.each(['missing','empty','nonstring','mismatch'])('blocks native %s binding without mutation',mode=>{
  const input=nativeRequest(),beforeBody=input.providerPromptOverride
  if(mode==='missing')delete input.falNative!.promptField
  if(mode==='empty')input.falNative!.promptField=''
  if(mode==='nonstring')input.falNative!.values.prompt=123
  if(mode==='mismatch')input.falNative!.values.prompt='Other exact body'
  const before=JSON.stringify(input)
  expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/prompt.*field|prompt.*binding|match.*visible/i)
  expect(JSON.stringify(input)).toBe(before);expect(input.providerPromptOverride).toBe(beforeBody)
 })
 it('preserves byte-exact truly unclassified legacy native Manual while still enforcing visible parity',()=>{
  const input=nativeRequest();delete input.falNative!.promptOwnership
  input.providerPromptOverride='  HARD AVOID\r\nApproved older text.  ';input.falNative!.values.prompt=input.providerPromptOverride
  expect(()=>assertVideoProviderPromptPreflight(input)).not.toThrow()
  expect(compileProviderPromptForSubmission(input).text).toBe(input.providerPromptOverride)
  input.falNative!.values.prompt='different';expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/match.*visible/i)
 })
 it('uses actual native routing for complete-master unused metadata exemptions in both directions',()=>{
  const input=request({videoEngine:'fal-ai/kling-video/v3/pro/text-to-video',falNative:{endpointId:'bytedance/seedance-2.5/text-to-video',fingerprint:'a'.repeat(64),flow:'video',promptOwnership:'compiled',promptField:'prompt',values:{prompt:master},media:{}},storyboardShots:[{prompt:'unused',camera:'static',shotSize:'wide',duration:5,dialogueSpans:[null] as never}]})
  expect(()=>assertVideoProviderPromptPreflight(input)).not.toThrow()
  input.videoEngine='bytedance/seedance-2.5/text-to-video';input.falNative!.endpointId='fal-ai/kling-video/v3/pro/text-to-video'
  expect(()=>assertVideoProviderPromptPreflight(input)).toThrow(/malformed/i)
 })
 it('reports the actual native family for a valid compiled body without changing its bytes',()=>{
  const input=nativeRequest(),before=JSON.stringify(input)
  expect(providerPromptPreviewCompilation(input)).toMatchObject({family:'seedance',text:input.providerPromptOverride})
  expect(compileProviderPromptForSubmission(input)).toMatchObject({family:'seedance',text:input.providerPromptOverride})
  expect(JSON.stringify(input)).toBe(before)
 })
 it('rejects direct compiled Seedance with missing binding before schema or key lookup',async()=>{
  const input=nativeRequest();delete input.falNative!.promptField
  const work=vi.fn()
  await expect(executeFalNativeGeneration(input.falNative!,input.kind,{contract:work,assertCurrent:work,prepareSource:work,client:work,upload:work,submit:work,persist:work})).rejects.toThrow(/binding/i)
  expect(work).not.toHaveBeenCalled()
 })
})
