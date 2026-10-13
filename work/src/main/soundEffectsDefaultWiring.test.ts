import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {describe,it,expect,vi} from 'vitest'
import {assertGenerationRequirements} from '../shared/generationReadiness'
import {assertVideoProviderPromptPreflight} from '../shared/providerPromptPreflight'
import {isDirectElevenAudio} from '../shared/elevenLabsAudio'
import {validateSoundEffectDuration} from '../shared/soundEffectsDuration'
import {resolvedPromptWithReferences} from '../shared/referenceInstructions'
import type {GenerationRequest} from '../shared/types'

const source=ts.createSourceFile('index.ts',readFileSync(new URL('index.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
function setup(){
 const declaration=source.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='runGeneration');if(!declaration)throw Error('Missing main dispatcher')
 const text=ts.transpileModule(declaration.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
 const client={fictional:true},subscribe=vi.fn(async()=>({requestId:'fictional-request',data:{audio:{url:'https://fictional.invalid/result.mp3',content_type:'audio/mpeg'}}})),load=vi.fn(async()=>'fictional-key'),download=vi.fn(async()=>'/fictional/managed/result.mp3'),history=vi.fn(async()=>undefined)
 const bindings={assertGenerationRequirements,assertVideoProviderPromptPreflight,isDirectElevenAudio,validateSoundEffectDuration,resolvedPromptWithReferences,currentProject:{rootPath:'/fictional'},MODEL_IDS:{'sound-effects':'fal-ai/elevenlabs/sound-effects/v2'},loadCredential:load,createOwnedFalClient:()=>client,falElectronFetch:vi.fn(),runtimeServiceFailures:{assertCurrent:vi.fn(),delete:vi.fn()},mainWindow:{webContents:{send:vi.fn()}},subscribeOwnedFalClient:subscribe,downloadResult:download,appendHistory:history,randomUUID:()=> 'fictional-history',localAssetUrl:(path:string)=>'prism://'+path,providerErrorDetail:(e:Error)=>e.message,rememberServiceFailure:vi.fn()}
 const run=new Function(...Object.keys(bindings),text+';return runGeneration')(...Object.values(bindings)) as (request:GenerationRequest)=>Promise<unknown>
 return {run,subscribe,load,download,history}
}
describe('actual legacy fal Sound Effects dispatch timing',()=>{
 it.each([undefined,.5,3.75,5,22])('sends exact effective duration %s with the original provider and authored controls',async duration=>{
  const {run,subscribe,download,history}=setup(),request:GenerationRequest={nodeId:'effect',kind:'sound-effects',audioProvider:'fal',prompt:'  Footsteps.  ',duration,loop:true,promptInfluence:.7,audioOutputFormat:'mp3_44100_128'},original=structuredClone(request)
  expect(await run(request)).toMatchObject({modelId:'fal-ai/elevenlabs/sound-effects/v2',outputType:'audio',requestId:'fictional-request'})
  expect(subscribe).toHaveBeenCalledOnce();const args=subscribe.mock.calls[0] as unknown as [unknown,string,{input:unknown}]
  expect(args[1]).toBe('fal-ai/elevenlabs/sound-effects/v2');expect(args[2].input).toEqual({text:'Footsteps.',duration_seconds:duration??.5,prompt_influence:.7,loop:true,output_format:'mp3_44100_128'})
  expect(download).toHaveBeenCalledOnce();expect(history).toHaveBeenCalledOnce();expect(request).toEqual(original)
 })
 it.each([0,-1,.1,NaN,Infinity,22.1,30])('rejects invalid legacy duration %s before credential/client/submission work',async duration=>{
  const {run,subscribe,load,download,history}=setup()
  await expect(run({nodeId:'effect',kind:'sound-effects',audioProvider:'fal',prompt:'Footsteps',duration})).rejects.toThrow(/duration/i)
  expect(load).not.toHaveBeenCalled();expect(subscribe).not.toHaveBeenCalled();expect(download).not.toHaveBeenCalled();expect(history).not.toHaveBeenCalled()
 })
})
