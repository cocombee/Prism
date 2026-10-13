import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {describe,it,expect} from 'vitest'
import {nodeCreationDefaults} from './nodeDefaults'
import {initialMusicPlanDrafts} from './musicPlanDrafts'
import {buildMusicRequestFromData} from './musicNodeState'
import {compileMusicRequest} from './musicRequest'
import {normalizedStoryboardDurationOptions} from './storyboardDurationBudget'
import {formatDurationSeconds} from './videoModels'
import {musicPromptDurationMs} from './musicNodeState'
import {SOUND_EFFECT_MIN_SECONDS,defaultSoundEffectDuration,soundEffectDurationLabel,soundEffectDurationOptions,validateSoundEffectDuration} from './soundEffectsDuration'
import {compileElevenAudioRequest} from './elevenLabsAudio'
import {buildGenerationRequest} from './workflowResolver'
import {generationRequirementFailures} from './generationReadiness'
import type {StudioNode,GenerationRequest} from './types'

const source=ts.createSourceFile('AppNext.tsx',readFileSync(new URL('../renderer/src/AppNext.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
function actualFactory(name:string,bindings:Record<string,unknown>,ownerSource=source){
 const declaration=ownerSource.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text===name)
 if(!declaration)throw Error('Missing actual renderer owner '+name)
 if(!ts.isFunctionDeclaration(declaration))throw Error('Unexpected renderer owner '+name)
 const executable=ts.factory.updateFunctionDeclaration(declaration,declaration.modifiers?.filter(m=>m.kind!==ts.SyntaxKind.ExportKeyword&&m.kind!==ts.SyntaxKind.DefaultKeyword),declaration.asteriskToken,declaration.name,declaration.typeParameters,declaration.parameters,declaration.type,declaration.body)
 const text=ts.transpileModule(ts.createPrinter().printNode(ts.EmitHint.Unspecified,executable,ownerSource),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
 return new Function(...Object.keys(bindings),text+';return '+name)(...Object.values(bindings))
}
const initialData=actualFactory('initialData',{palette:[],nodeCreationDefaults,initialMusicPlanDrafts,SOUND_EFFECT_MIN_SECONDS,FISH_DEFAULT_MODEL:'unused-voice-model',makeStoryboardPanels:()=>[]})
const reset=actualFactory('resetNodeSettingsPatch',{initialData,RESETTABLE_NODE_SETTING_KEYS:['duration','loop','promptInfluence'],resolveVideoModel:()=>{throw Error('Unexpected video path')}})
const request=(duration?:number):GenerationRequest=>({nodeId:'fictional-effect',kind:'sound-effects',audioProvider:'elevenlabs',prompt:'  Footsteps.  ',duration,loop:false})

describe('Sound Effects minimum and authored duration ownership',()=>{
 it('actual renderer creation and explicit Reset start Sound Effects at the minimum',()=>{
  expect(initialData('sound-effects').duration).toBe(.5)
  expect(initialData('video-generator').duration).toBe(1)
  const music=initialData('music-generator')
  expect(music).toMatchObject({musicVersion:1,audioProvider:'elevenlabs',musicSeconds:'3',duration:3})
  expect(compileMusicRequest(buildMusicRequestFromData(music,'A short cue')).durationMs).toBe(3000)
  const saved={kind:'sound-effects',duration:5,prompt:'  Keep this.  ',loop:true};expect(reset(saved)).toMatchObject({duration:.5,runState:'idle'});expect(saved.duration).toBe(5)
 })
 it('the real request compiler defaults only absent direct duration and preserves authored values',()=>{
  expect(compileElevenAudioRequest(request()).body.duration_seconds).toBe(.5)
  for(const value of [.5,3.75,5,22,30])expect(compileElevenAudioRequest(request(value)).body.duration_seconds).toBe(value)
 })
 it.each(['elevenlabs','fal'] as const)('the real %s graph resolver materializes effective timing without editing saved nodes',provider=>{
  for(const duration of [undefined,.5,3.75,5,22]){
   const node:StudioNode={id:'effect',type:'studio',position:{x:0,y:0},data:{kind:'sound-effects',title:'Sound Effects',audioProvider:provider,prompt:'  Footsteps.  ',duration,loop:true,quantity:2}}
   const original=structuredClone(node),compiled=buildGenerationRequest(node,[node],[])
   expect(compiled.duration).toBe(duration??.5);expect(compiled.audioProvider).toBe(provider);expect(compiled.loop).toBe(true);expect(node).toEqual(original)
  }
 })
 it.each(['elevenlabs','fal'] as const)('%s rejects invalid authored timing before submission without substituting defaults',provider=>{
  for(const value of [0,-1,.1,NaN,Infinity,provider==='fal'?22.1:30.1]){
   expect(()=>validateSoundEffectDuration(value,provider)).toThrow(/Effect duration/)
   expect(generationRequirementFailures({...request(value),audioProvider:provider}).join(' ')).toMatch(/Effect duration/i)
  }
 })
 it('rendered labels keep units on a valid non-menu fractional value and retain invalid values for review',()=>{
  expect(defaultSoundEffectDuration(undefined)).toBe(.5);expect(defaultSoundEffectDuration(0)).toBe(0)
  expect(soundEffectDurationLabel(undefined)).toBe('0.5s');expect(soundEffectDurationLabel(3.75)).toBe('3.8s');expect(soundEffectDurationLabel(NaN)).toBe('NaN')
 })
 it('native fal schema fields keep their own timing owner instead of inheriting legacy effect limits',()=>{
  const native:GenerationRequest={...request(.1),audioProvider:'fal',falNative:{endpointId:'fictional-native-effects',flow:'effects',fingerprint:'a'.repeat(64),promptField:'text',values:{text:'Footsteps',duration_seconds:.1},media:{}}}
  expect(generationRequirementFailures(native)).toEqual([])
  expect(native.falNative!.values.duration_seconds).toBe(.1)
 })
})


describe('shared duration-token options preserve provider and authored ownership',()=>{
 it.each(['elevenlabs','fal'] as const)('%s includes the legal0.5 exception and every half-second choice through its own cap',provider=>{
  const maximum=provider==='elevenlabs'?30:22,options=soundEffectDurationOptions(undefined,provider)
  expect(options).toHaveLength(maximum*2)
  expect(options.slice(0,4)).toEqual([{value:'0.5',label:'0.5s'},{value:'1',label:'1.0s'},{value:'1.5',label:'1.5s'},{value:'2',label:'2.0s'}])
  expect(options.at(-1)).toEqual({value:String(maximum),label:maximum.toFixed(1)+'s'})
  for(let i=1;i<options.length;i++)expect(Number(options[i].value)-Number(options[i-1].value)).toBe(.5)
  expect(options.every(option=>!option.disabled)).toBe(true)
 })
 it.each(['elevenlabs','fal'] as const)('%s retains exact non-step seconds in numeric order without rounding the request',provider=>{
  const authored={duration:3.75},options=soundEffectDurationOptions(authored.duration,provider),index=options.findIndex(option=>option.value==='3.75')
  expect(options.slice(index-1,index+2)).toEqual([{value:'3.5',label:'3.5s'},{value:'3.75',label:'3.8s'},{value:'4',label:'4.0s'}])
  expect(authored).toEqual({duration:3.75});expect(validateSoundEffectDuration(authored.duration,provider)).toBe(3.75)
  expect(options.filter(option=>option.value==='3.75')).toHaveLength(1)
 })
 it.each(['elevenlabs','fal'] as const)('%s retains disabled invalid timing instead of substituting a default or changing limits',provider=>{
  for(const duration of [0,-1,NaN,Infinity,-Infinity,provider==='fal'?22.5:30.5]){
   const authored={duration},options=soundEffectDurationOptions(duration,provider),choice=options.find(option=>option.value===String(duration))
   expect(choice).toMatchObject({value:String(duration),disabled:true});expect(choice!.label).toContain(' · review');expect(Object.is(authored.duration,duration)).toBe(true)
   expect(()=>validateSoundEffectDuration(duration,provider)).toThrow(/Effect duration/)
  }
  expect(soundEffectDurationOptions(30,'fal').find(option=>option.value==='30')).toEqual({value:'30',label:'30.0s · review',disabled:true})
  expect(soundEffectDurationOptions(30,'elevenlabs').find(option=>option.value==='30')).toEqual({value:'30',label:'30.0s'})
 })
 const nodeSource=ts.createSourceFile('NodeCardNext.tsx',readFileSync(new URL('../renderer/src/NodeCardNext.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
 const musicControl=actualFactory('musicDurationControl',{normalizedStoryboardDurationOptions,formatDurationSeconds,musicPromptDurationMs},nodeSource)
 it('the extracted actual Music control preserves off-grid raw seconds, grid and provider validation independently',()=>{
  const authored={musicSeconds:'3.125',duration:3.125},control=musicControl(authored),index=control.options.findIndex((option:{value:string})=>option.value==='3.125')
  expect(control.value).toBe('3.125');expect(control.options).toHaveLength(1200)
  expect(control.options.slice(index-1,index+2)).toEqual([{value:'3',label:'3.0s'},{value:'3.125',label:'3.1s'},{value:'3.5',label:'3.5s'}])
  expect(control.options[0]).toEqual({value:'1',label:'1.0s'});expect(control.options.at(-1)).toEqual({value:'600',label:'600.0s'})
  expect(musicPromptDurationMs(control.value)).toBe(3125);expect(musicPromptDurationMs('3.5')).toBe(3500);expect(()=>musicPromptDurationMs('1')).toThrow(/3–600/)
  expect(authored).toEqual({musicSeconds:'3.125',duration:3.125})
 })
 it('the extracted Music control keeps explicit invalid/empty saved values and defaults only absent fields',()=>{
  for(const musicSeconds of ['', 'bogus', '0', '3.1254']){
   const control=musicControl({musicSeconds,duration:3.125});expect(control.value).toBe(musicSeconds);expect(control.options.find((option:{value:string})=>option.value===musicSeconds)).toMatchObject({value:musicSeconds,disabled:true})
  }
  expect(musicControl({}).value).toBe('3');expect(musicControl({duration:3.125}).value).toBe('3.125');expect(musicControl({musicSeconds:'',duration:3.125}).value).toBe('')
 })
})
