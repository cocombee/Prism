import { assertVideoProviderPromptPreflight } from '../shared/providerPromptPreflight'
import { effectiveProviderPromptOwnership } from '../shared/providerPromptOwnership'
import { nativeFalPromptTransport } from '../shared/nativeFalPromptTransport'
import { requiresGeneratedDialogueAudio, VideoDialogueAudioConflictError } from '../shared/videoDialogueAudio'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { assertGenerationRequirements } from '../shared/generationReadiness'
import type { GenerationRequest } from '../shared/types'
import { describe, expect, it, vi } from 'vitest'

const main = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

it('refuses unknown and above-native custom cadence through actual main entry before service work', async () => {
  const source = ts.createSourceFile('index.ts', main, ts.ScriptTarget.Latest, true)
  const fn = source.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === 'runGeneration')!
  const work = vi.fn()
  const bindings = { assertGenerationRequirements, currentProject: null, loadCredential: work, createOwnedFalClient: work, uploadLocalAsset: work, runNativeFalGeneration: work, runNativeHiggsfieldGeneration: work }
  const run = new Function(...Object.keys(bindings), ts.transpileModule(fn.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + '\nreturn runGeneration')(...Object.values(bindings)) as (request: GenerationRequest) => Promise<unknown>
  for (const [nativeOutputFrameRate, motionCadence, error] of [[null, 16, /verify native output FPS/], [24, 35, /exceeds native output FPS/]] as const) {
    const request: GenerationRequest = { nodeId: 'cadence-review', kind: 'video-generator', prompt: 'A bird turns.', nativeOutputFrameRate, motionCadence, falNative: { endpointId: 'fictional/native', flow: 'video', fingerprint: 'a'.repeat(64), promptField: 'prompt', values: { prompt: 'A bird turns.' }, media: {} } }
    const before = JSON.stringify(request)
    await expect(run(request)).rejects.toThrow(error)
    expect(JSON.stringify(request)).toBe(before)
  }
  expect(work).not.toHaveBeenCalled()
})

describe('main-process generation readiness boundary', () => {
  it('rejects incomplete requests before project access, credentials, or provider submission', () => {
    expect(main).toContain("import { assertGenerationRequirements } from '../shared/generationReadiness'")
    const runStart = main.indexOf('async function runGeneration(request: GenerationRequest')
    const runEnd = main.indexOf('\n}', runStart)
    const runBody = main.slice(runStart, runEnd)
    const validation = runBody.indexOf('assertGenerationRequirements(request)')
    expect(validation).toBeGreaterThanOrEqual(0)
    expect(validation).toBeLessThan(runBody.indexOf("if (!currentProject)"))
    expect(validation).toBeLessThan(runBody.indexOf('loadCredential()'))
  })
})


it('executes actual main entry and rejects orphan typed state before every service boundary', async () => {
  const source = ts.createSourceFile('index.ts', main, ts.ScriptTarget.Latest, true)
  const fn = source.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === 'runGeneration')!
  const calls = { loadCredential: vi.fn(), createOwnedFalClient: vi.fn(), uploadLocalAsset: vi.fn(), runBytePlusGeneration: vi.fn(), runNativeFalGeneration: vi.fn(), runNativeHiggsfieldGeneration: vi.fn(), runFishAudio: vi.fn(), runElevenLabsAudio: vi.fn(), runOpenAIImage: vi.fn(), runGeminiImage: vi.fn() }
  const bindings = { assertGenerationRequirements, currentProject: null, ...calls }
  const code = ts.transpileModule(fn.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const run = new Function(...Object.keys(bindings), code + '\nreturn runGeneration')(...Object.values(bindings)) as (request: GenerationRequest) => Promise<unknown>
  for (const videoEngine of ['bytedance/seedance-2.5/reference-to-video', 'byteplus/seedance-2.5/reference-to-video', 'fal-ai/kling-video/v3/pro/text-to-video']) {
    const request: GenerationRequest = { nodeId: 'cast-qa', kind: 'video-generator', videoEngine, prompt: 'Keep the cup.', duration: 5, references: [{role:'character',tag:'@maya',path:'/fictional/maya.png'}], storyboardShots: [{ prompt:'Keep the cup.', duration:5, camera:'static', shotSize:'medium', characterStateDeltas:[{characterTag:'@maya',propOwnership:['cup']}] }] }
    const before = JSON.stringify(request)
    await expect(run(request)).rejects.toThrow(/physical cast.*@maya/i)
    expect(JSON.stringify(request)).toBe(before)
  }
  for (const call of Object.values(calls)) expect(call).not.toHaveBeenCalled()
})


it('executes actual main entry and blocks typed speech with audio off before project or provider access', async () => {
  const source = ts.createSourceFile('index.ts', main, ts.ScriptTarget.Latest, true)
  const fn = source.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === 'runGeneration')!
  const credentials = vi.fn(), submit = vi.fn()
  const bindings = {assertGenerationRequirements,currentProject:null,loadCredential:credentials,runNativeFalGeneration:submit,runBytePlusGeneration:submit}
  const run = new Function(...Object.keys(bindings), ts.transpileModule(fn.getText(source), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nreturn runGeneration')(...Object.values(bindings)) as (request:GenerationRequest)=>Promise<unknown>
  const base:GenerationRequest = {nodeId:'audio-qa',kind:'video-generator',videoEngine:'bytedance/seedance-2.5/reference-to-video',prompt:'@maya speaks.',duration:5,generateAudio:false,references:[{role:'character',tag:'@maya',path:'/fictional/maya.png'}],storyboardShots:[{panelId:'one',prompt:'@maya speaks.',duration:5,shotSize:'medium',camera:'static',activeCharacterTags:['@maya'],dialogueSpans:[{id:'hello',speakerTag:'@maya',text:'Salam.',startPanelId:'one',endPanelId:'one'}]}]}
  for(const request of [base,{...base,videoEngine:'byteplus/seedance-2.5/reference-to-video'},{...base,providerPromptOverride:'Compiled final body',providerPromptOwnership:'compiled' as const,falNative:{endpointId:base.videoEngine!,flow:'video' as const,fingerprint:'a'.repeat(64),values:{generate_audio:false},media:{}}}]) {
    const before=JSON.stringify(request)
    await expect(run(request)).rejects.toThrow(/dialogue.*audio/i)
    expect(JSON.stringify(request)).toBe(before)
  }
  expect(credentials).not.toHaveBeenCalled();expect(submit).not.toHaveBeenCalled()
})

it('keeps a native typed-audio conflict local instead of poisoning provider failure state',async()=>{
  const source=ts.createSourceFile('index.ts',main,ts.ScriptTarget.Latest,true)
  const fn=source.statements.find((statement):statement is ts.FunctionDeclaration=>ts.isFunctionDeclaration(statement)&&statement.name?.text==='runNativeFalGeneration')!
  const remember=vi.fn(),credential=vi.fn(),upload=vi.fn(),contract=vi.fn()
  const bindings={assertVideoProviderPromptPreflight,effectiveProviderPromptOwnership,nativeFalPromptTransport,authoredTimelineSeconds:()=>undefined,requiresGeneratedDialogueAudio,VideoDialogueAudioConflictError,readOwnedFalSchema:contract,executeFalNativeGeneration:vi.fn(async()=>{throw new VideoDialogueAudioConflictError()}),rememberServiceFailure:remember,runtimeServiceFailures:{assertCurrent:vi.fn()},loadCredential:credential,uploadLocalAsset:upload}
  const run=new Function(...Object.keys(bindings),ts.transpileModule(fn.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nreturn runNativeFalGeneration')(...Object.values(bindings)) as(request:GenerationRequest)=>Promise<unknown>
  await expect(run({nodeId:'native-audio-qa',kind:'video-generator',prompt:'Exact body',falNative:{endpointId:'fixture/speech-video',flow:'video',fingerprint:'a'.repeat(64),promptField:'prompt',values:{prompt:'Exact body'},media:{}}})).rejects.toBeInstanceOf(VideoDialogueAudioConflictError)
  expect(remember).not.toHaveBeenCalled();expect(credential).not.toHaveBeenCalled();expect(upload).not.toHaveBeenCalled();expect(contract).not.toHaveBeenCalled()
})


it('rejects late final sections through actual main before credential, media and dispatch work',async()=>{
 const source=ts.createSourceFile('index.ts',main,ts.ScriptTarget.Latest,true),fn=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==='runGeneration')!
 const work=vi.fn(),bindings={assertGenerationRequirements,assertVideoProviderPromptPreflight,currentProject:{rootPath:'/fictional/project'},loadCredential:work,createOwnedFalClient:work,uploadLocalAsset:work,runBytePlusGeneration:work,runNativeFalGeneration:work}
 const run=new Function(...Object.keys(bindings),ts.transpileModule(fn.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nreturn runGeneration')(...Object.values(bindings)) as(request:GenerationRequest)=>Promise<unknown>
 const body=['FORMAT MODE','one shot','SHOT 1','Hold.','SCENE CONTEXT','Kitchen','ACTIVE REFERENCES','@maya','CAMERA','Static','LIGHTING','Window','STYLE','Natural','CONTINUITY','Same','CHARACTER ACTING','Quiet','PHYSICS','Grounded','AUDIO','Room tone','QUALITY','Clean','NEGATIVE PROMPT','drift','AUDIO','Late sound'].join('\n')
 for(const videoEngine of ['bytedance/seedance-2.5/reference-to-video','byteplus/seedance-2.5/reference-to-video']){
  const request:GenerationRequest={nodeId:'boundary-qa',kind:'video-generator',videoEngine,prompt:body,authoredPrompt:body,duration:5,references:[{role:'character',tag:'@maya',path:'/fictional/maya.png'}]},before=JSON.stringify(request)
  await expect(run(request)).rejects.toThrow(/final section/i);expect(JSON.stringify(request)).toBe(before)
 }
 expect(work).not.toHaveBeenCalled()
})


it('executes actual generation IPC preflight before starting or replacing any active lifecycle',async()=>{
 const source=ts.createSourceFile('index.ts',main,ts.ScriptTarget.Latest,true)
 let callback:ts.ArrowFunction|undefined
 const visit=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(source)==='ipcMain.handle'&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text==='generation:run'&&ts.isArrowFunction(n.arguments[1]))callback=n.arguments[1];ts.forEachChild(n,visit)};visit(source)
 expect(callback).toBeDefined()
 const work=vi.fn(),bindings={assertGenerationRequirements,assertVideoProviderPromptPreflight,higgsfieldJobActions:{assertIdle:work},higgsfieldJobScope:work,generationLifecycle:{begin:work,complete:work},generationContext:{run:work},withProviderRequest:work}
 const code=ts.transpileModule('const handler='+callback!.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
 const handler=new Function(...Object.keys(bindings),code+'\nreturn handler')(...Object.values(bindings)) as(event:unknown,request:GenerationRequest)=>Promise<unknown>
 const request:GenerationRequest={nodeId:'active-node',kind:'video-generator',videoEngine:'bytedance/seedance-2.5/reference-to-video',prompt:'Speak.',duration:5,generateAudio:false,references:[{role:'character',tag:'@maya',path:'/fictional/maya.png'}],storyboardShots:[{panelId:'one',prompt:'Speak.',duration:5,camera:'static',shotSize:'medium',activeCharacterTags:['@maya'],dialogueSpans:[{id:'one',speakerTag:'@maya',text:'Salam.',startPanelId:'one',endPanelId:'one'}]}]}
 const before=JSON.stringify(request)
 await expect(handler(null,request)).rejects.toThrow(/dialogue.*audio/i)
 expect(work).not.toHaveBeenCalled();expect(JSON.stringify(request)).toBe(before)
})

function nativeIntegrityCases():Array<{label:string;request:GenerationRequest;error:RegExp}>{
 const base=():GenerationRequest=>({nodeId:'active-integrity-node',kind:'video-generator',videoEngine:'fal-ai/kling-video/v3/pro/text-to-video',providerPromptOverride:'NEGATIVE PROMPT\ndrift',falNative:{endpointId:'bytedance/seedance-2.5/text-to-video',fingerprint:'a'.repeat(64),flow:'video',promptOwnership:'compiled',promptField:'prompt',values:{prompt:'NEGATIVE PROMPT\ndrift'},media:{}}})
 const late=base();late.providerPromptOverride='NEGATIVE PROMPT\ndrift\nAUDIO\nlate';late.falNative!.values.prompt=late.providerPromptOverride
 const conflict=base();conflict.providerPromptOwnership='authored'
 const invalid=base();invalid.falNative!.promptOwnership='invalid' as 'compiled'
 const missing=base();delete missing.falNative!.promptField
 const mismatch=base();mismatch.falNative!.values.prompt='NEGATIVE PROMPT\nHidden body'
 const speech=base();speech.storyboardShots=[{panelId:'one',prompt:'Speak.',duration:5,shotSize:'medium',camera:'static',activeCharacterTags:['@maya'],dialogueSpans:[{id:'line',speakerTag:'@maya',text:'Salam.',startPanelId:'one',endPanelId:'one'}]}];speech.falNative!.values.generate_audio=false
 const malformed=base();malformed.storyboardShots=[{panelId:'one',prompt:'Speak.',duration:5,shotSize:'medium',camera:'static',dialogueSpans:[null] as never}]
 return[{label:'stale engine and nested-only final section',request:late,error:/final section/i},{label:'conflicting explicit owners',request:conflict,error:/owners conflict/i},{label:'invalid nested owner',request:invalid,error:/owner.*malformed/i},{label:'missing native field',request:missing,error:/prompt field binding/i},{label:'visible/body mismatch',request:mismatch,error:/match.*visible/i},{label:'nested-only compiled speech with audio off',request:speech,error:/dialogue.*audio/i},{label:'malformed typed speech',request:malformed,error:/typed dialogue.*malformed/i}]
}

it('rejects every native integrity defect through actual main with zero service work',async()=>{
 const source=ts.createSourceFile('index.ts',main,ts.ScriptTarget.Latest,true),fn=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==='runGeneration')!
 const work=vi.fn(),bindings={assertGenerationRequirements,assertVideoProviderPromptPreflight,currentProject:{rootPath:'/fictional/project'},loadCredential:work,createOwnedFalClient:work,uploadLocalAsset:work,runNativeFalGeneration:work,runBytePlusGeneration:work}
 const run=new Function(...Object.keys(bindings),ts.transpileModule(fn.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nreturn runGeneration')(...Object.values(bindings)) as(request:GenerationRequest)=>Promise<unknown>
 for(const {request,error}of nativeIntegrityCases()){
  const before=JSON.stringify(request);await expect(run(request)).rejects.toThrow(error);expect(JSON.stringify(request)).toBe(before)
 }
 expect(work).not.toHaveBeenCalled()
 const valid=nativeIntegrityCases()[0].request;valid.providerPromptOverride='NEGATIVE PROMPT\ndrift';valid.falNative!.values.prompt=valid.providerPromptOverride
 await run(valid);expect(work).toHaveBeenCalledExactlyOnceWith(valid,undefined)
})

it('rejects every native integrity defect through actual IPC before touching active lifecycle or lease',async()=>{
 const source=ts.createSourceFile('index.ts',main,ts.ScriptTarget.Latest,true)
 let callback:ts.ArrowFunction|undefined
 const visit=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(source)==='ipcMain.handle'&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text==='generation:run'&&ts.isArrowFunction(n.arguments[1]))callback=n.arguments[1];ts.forEachChild(n,visit)};visit(source)
 const work=vi.fn(),bindings={assertGenerationRequirements,assertVideoProviderPromptPreflight,higgsfieldJobActions:{assertIdle:work},higgsfieldJobScope:work,generationLifecycle:{begin:work,complete:work},generationContext:{run:work},withProviderRequest:work}
 const code=ts.transpileModule('const handler='+callback!.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
 const handler=new Function(...Object.keys(bindings),code+'\nreturn handler')(...Object.values(bindings)) as(event:unknown,request:GenerationRequest)=>Promise<unknown>
 for(const {request,error}of nativeIntegrityCases()){
  const before=JSON.stringify(request);await expect(handler(null,request)).rejects.toThrow(error);expect(JSON.stringify(request)).toBe(before)
 }
 expect(work).not.toHaveBeenCalled()
})
