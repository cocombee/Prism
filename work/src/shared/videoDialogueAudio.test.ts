import { describe, expect, it, vi } from 'vitest'
import { generationRequirementFailures } from './generationReadiness'
import { compileBytePlusGenerationRequest } from '../main/byteplusGeneration'
import type { GenerationRequest } from './types'
const request = (extra: Partial<GenerationRequest> = {}): GenerationRequest => ({ nodeId:'speech-qa', kind:'video-generator', videoEngine:'bytedance/seedance-2.5/reference-to-video', prompt:'@maya speaks.', duration:5, references:[{referenceDescription: 'Authored fixture reference purpose.', role: 'character',tag:'@maya',path:'/fictional/maya.png',characterAuthorityMode:'complete-dressed-body'}], storyboardShots:[{panelId:'one',prompt:'@maya speaks.',duration:5,shotSize:'medium',camera:'static',activeCharacterTags:['@maya'],dialogueSpans:[{id:'line',speakerTag:'@maya',text:'Selamat pagi.',startPanelId:'one',endPanelId:'one'}]}], ...extra })
const audioErrors = (input: GenerationRequest) => generationRequirementFailures(input).filter(error=>/dialogue.*audio|audio.*dialogue|generated speech/i.test(error))
describe('typed dialogue versus effective video audio',()=>{
  it.each([false,undefined])('rejects spoken dialogue when legacy audio is %s without changing selection or text', generateAudio=>{
    const input=request({generateAudio}),before=JSON.stringify(input)
    expect(audioErrors(input)).toEqual(expect.arrayContaining([expect.stringMatching(/audio/i)]))
    expect(JSON.stringify(input)).toBe(before)
  })
  it('permits supported explicit audio and rejects routes without native speech audio',()=>{
    expect(audioErrors(request({generateAudio:true}))).toEqual([])
    expect(audioErrors(request({videoEngine:'wan-controlled',generateAudio:true}))).not.toEqual([])
  })
  it('does not mistake native Auto final text for Manual ownership',()=>{
    const input=request({generateAudio:false,providerPromptOverride:'Compiled final body',providerPromptOwnership:'compiled',falNative:{endpointId:'bytedance/seedance-2.5/reference-to-video',fingerprint:'a'.repeat(64),flow:'video',values:{generate_audio:false},media:{}}})
    expect(audioErrors(input)).not.toEqual([])
    input.providerPromptOwnership='authored'
    expect(audioErrors(input)).toEqual([])
  })
  it('uses the native wire selection rather than a contradictory top-level flag',()=>{
    const input=request({generateAudio:true,providerPromptOwnership:'compiled',falNative:{endpointId:'bytedance/seedance-2.5/reference-to-video',fingerprint:'a'.repeat(64),flow:'video',values:{generate_audio:false},media:{}}})
    expect(audioErrors(input)).not.toEqual([])
  })
  it('blocks direct BytePlus media resolution before silent speech submission',async()=>{
    const resolve=vi.fn(async()=> 'https://files.example/maya.png')
    const input=request({videoEngine:'byteplus/seedance-2.5/reference-to-video',generateAudio:false}),before=JSON.stringify(input)
    await expect(compileBytePlusGenerationRequest(input,resolve)).rejects.toThrow(/audio/i)
    expect(resolve).not.toHaveBeenCalled();expect(JSON.stringify(input)).toBe(before)
  })
  it('preserves legacy exact Manual bodies and untyped silent acting',()=>{
    expect(audioErrors(request({providerPromptOverride:'  唇语练习\nSilent acting only.  ',generateAudio:false}))).toEqual([])
    const input=request({generateAudio:false});input.storyboardShots![0].dialogueSpans=[]
    expect(audioErrors(input)).toEqual([])
  })
})

describe('malformed typed dialogue and nested final owner',()=>{
 it.each([null,[null],[{}],[{id:'line',speakerTag:'@maya',text:123,startPanelId:'one',endPanelId:'one'}],[{id:'line',speakerTag:'@maya',text:'Hello.',startPanelId:'one',endPanelId:'one',insertAudioPanelIds:[null]}]])('rejects malformed declared spans %j as malformed without mutation',spans=>{
  const input=request({generateAudio:true});input.storyboardShots![0].dialogueSpans=spans as never
  const before=JSON.stringify(input)
  expect(generationRequirementFailures(input)).toEqual(expect.arrayContaining([expect.stringMatching(/typed dialogue.*malformed/i)]))
  expect(JSON.stringify(input)).toBe(before)
 })
 it('uses nested-only compiled intent and rejects audio off instead of legacy Manual classification',()=>{
  const input=request({providerPromptOverride:'NEGATIVE PROMPT\ndrift',falNative:{endpointId:'bytedance/seedance-2.5/text-to-video',fingerprint:'a'.repeat(64),flow:'video',promptField:'prompt',promptOwnership:'compiled',values:{prompt:'NEGATIVE PROMPT\ndrift',generate_audio:false},media:{}}})
  expect(audioErrors(input)).not.toEqual([])
 })
 it('keeps declared [] and valid empty text silent, while exact authored unused malformed metadata is exempt',()=>{
  const input=request({generateAudio:false});input.storyboardShots![0].dialogueSpans=[]
  expect(generationRequirementFailures(input)).toEqual([])
  input.storyboardShots![0].dialogueSpans=[{id:'empty',speakerTag:'@maya',text:' ',startPanelId:'one',endPanelId:'one'}]
  expect(audioErrors(input)).toEqual([])
  input.storyboardShots![0].dialogueSpans=[null] as never;input.providerPromptOverride='  Approved HARD AVOID\r\n  '
  expect(generationRequirementFailures(input)).toEqual([])
 })
 it('blocks malformed typed dialogue before direct BytePlus media preparation',async()=>{
  const input=request({videoEngine:'byteplus/seedance-2.5/reference-to-video',generateAudio:true});input.storyboardShots![0].dialogueSpans=[null] as never
  const resolve=vi.fn(async()=> 'https://files.example/maya.png')
  await expect(compileBytePlusGenerationRequest(input,resolve)).rejects.toThrow(/typed dialogue.*malformed/i)
  expect(resolve).not.toHaveBeenCalled()
 })
})
