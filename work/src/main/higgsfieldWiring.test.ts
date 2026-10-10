import { assertVideoProviderPromptPreflight } from '../shared/providerPromptPreflight'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {HiggsfieldJobStore,higgsfieldCredentialIdentity} from './higgsfieldJobStore'
import {beginHiggsfieldJob} from './higgsfieldJobLifecycle'
const directories:string[]=[];afterEach(()=>{for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true})})
import ts from 'typescript'
import {executeHiggsfieldGeneration} from './higgsfieldGeneration'
import {executeHiggsfieldSeedanceGeneration} from './higgsfieldSeedanceGeneration'
import {higgsfieldSeedanceManagedMedia} from './higgsfieldSeedanceManagedMedia'
import {requiresGeneratedDialogueAudio,VideoDialogueAudioConflictError} from '../shared/videoDialogueAudio'
import {HiggsfieldApi,HiggsfieldRemoteJobError} from './higgsfieldApi'
import {assertGenerationRequirements} from '../shared/generationReadiness'
import {HIGGSFIELD_API,HIGGSFIELD_CONTRACT_REVISION,planHiggsfieldNativeInput,higgsfieldSeedanceRequest,higgsfieldInputSchema} from '../shared/higgsfieldNative'
import { resolveHiggsfieldCurrentInput } from './higgsfieldCurrentInput'
import {readHiggsfieldInputContract} from './higgsfieldInputContract'
import {higgsfieldSeedanceSchema,HIGGSFIELD_SEEDANCE_INPUT_REVISION} from '../shared/higgsfieldSeedanceInput'
import {validateFalContractValue} from './falSchemaValidation'
import type {GenerationRequest} from '../shared/types'
const source=ts.createSourceFile('index.ts',readFileSync(new URL('index.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
function actual(name:string,bindings:Record<string,unknown>){
 const declaration=source.statements.find(statement=>ts.isFunctionDeclaration(statement)&&statement.name?.text===name)
 if(!declaration)throw new Error(`Missing actual main function ${name}`)
 const code=ts.transpileModule(declaration.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
 return new Function(...Object.keys(bindings),`${code}\nreturn ${name};`)(...Object.values(bindings)) as (request:GenerationRequest,signal?:AbortSignal)=>Promise<unknown>
}
function setup(prompt=''){
 const directory=mkdtempSync(join(tmpdir(),'prism-higgs-wiring-jobs-'));directories.push(directory);const store=new HiggsfieldJobStore(directory)
 const request:GenerationRequest={nodeId:'fixture',kind:'video-generator',prompt,providerPromptOverride:prompt,higgsfieldNative:{endpointId:'higgsfield/genjutsu/motion-transfer/v1.0',contractRevision:HIGGSFIELD_CONTRACT_REVISION,values:{prompt},media:{video_url:[{url:'https://media.example/source.mp4',mediaType:'video'}],image_urls:[{url:'https://media.example/ref.png',mediaType:'image'}]},allowSourceTrimming:true}}
 const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>new Response(JSON.stringify({status:'completed',request_id:'fixture-request',video:{url:'https://media.example/generated.mp4',content_type:'video/mp4'}}))),loadServiceCredential=vi.fn(async()=> 'fictional-key-id:fictional-secret'),runtimeServiceFailures={assertCurrent:vi.fn(),delete:vi.fn()}
 const apiFactory=actual('createCurrentHiggsfieldApi',{loadServiceCredential,runtimeServiceFailures,HiggsfieldApi,higgsfieldCredentialIdentity,net:{fetch}})
 const bindings={assertGenerationRequirements,assertVideoProviderPromptPreflight,higgsfieldJobScope:(nodeId:string)=>({projectId:'fixture',rootPath:'/fixture',documentPath:'/fixture/document.prismflow',nodeId}),currentHiggsfieldProfileId:async()=> 'fixture-profile',higgsfieldJobStore:()=>store,beginHiggsfieldJob,safeStorage:{isEncryptionAvailable:()=>true,encryptString:()=>Buffer.from('fictional opaque encrypted snapshot')},executeHiggsfieldGeneration,HiggsfieldRemoteJobError,runtimeServiceFailures,assertGenerationCommit:vi.fn(),prepareManagedHiggsfieldSource:vi.fn(async media=>({source:media})),createCurrentHiggsfieldApi:apiFactory,downloadResult:vi.fn(async(_url:string,_contentType:string|undefined,_metadata:Record<string,unknown>,_signal?:AbortSignal,_expected?:string)=>'/fixture/output.mp4'),localAssetUrl:()=> 'prism://fixture/output',appendHistory:vi.fn(async()=>undefined),randomUUID:()=> 'fixture-history',rememberServiceFailure:vi.fn(),mainWindow:{webContents:{send:vi.fn()}}}
 Object.assign(bindings,{persistCurrentHiggsfieldOutput:async(_scope:unknown,_id:string,output:{url:string;contentType?:string},signal?:AbortSignal)=>{const path=await bindings.downloadResult(output.url,output.contentType,{provider:'Higgsfield',modelId:request.higgsfieldNative!.endpointId,prompt:request.prompt},signal,'video');await bindings.appendHistory();return{outputPath:path,outputUrl:bindings.localAssetUrl()}}})
 const nativeBindings=Object.assign(bindings,{resolveHiggsfieldCurrentInput,planHiggsfieldNativeInput,higgsfieldSeedanceRequest,executeHiggsfieldSeedanceGeneration,higgsfieldSeedanceManagedMedia,requiresGeneratedDialogueAudio,VideoDialogueAudioConflictError,assertManagedMediaPath:vi.fn(async(path:string)=>path),mimeFor:()=> 'image/png',higgsfieldJobScope:vi.fn(bindings.higgsfieldJobScope),currentHiggsfieldProfileId:vi.fn(bindings.currentHiggsfieldProfileId),higgsfieldJobStore:vi.fn(bindings.higgsfieldJobStore),beginHiggsfieldJob:vi.fn(beginHiggsfieldJob),validateFalContractValue,higgsfieldPublicCatalog:{readContract:vi.fn(async(id:string,current:()=>void)=>{current();return higgsfieldInputSchema(id)})}})
 const native=actual('runNativeHiggsfieldGeneration',nativeBindings),fal=vi.fn(),run=actual('runGeneration',{assertGenerationRequirements,assertVideoProviderPromptPreflight,currentProject:{rootPath:'/fixture'},runNativeHiggsfieldGeneration:native,runNativeFalGeneration:fal})
 return {request,run,fetch,loadServiceCredential,bindings:nativeBindings,fal}
}
describe('actual main Higgsfield dispatcher composition',()=>{
 it('blocks a hidden current default prompt before private state or credential work',async()=>{
  const x=setup(''),endpointId='bytedance/seedance-2.5/image-to-video',schema=higgsfieldSeedanceSchema(endpointId)
  schema.properties!.prompt.default='Hidden provider direction.'
  x.bindings.higgsfieldPublicCatalog.readContract.mockImplementation(async()=>structuredClone(schema))
  const contract=await readHiggsfieldInputContract(endpointId,{assertCurrent:()=>{},readContract:async()=>structuredClone(schema)})
  x.request.higgsfieldNative={endpointId,contractRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,fingerprint:contract.fingerprint,values:{},media:{image_url:[{mediaType:'image',url:'https://cdn.prism.example/frame.png'}]}}
  const before=JSON.stringify(x.request)
  await expect(x.run(x.request)).rejects.toThrow('effective Higgsfield prompt must match the visible')
  expect(x.bindings.higgsfieldJobScope).not.toHaveBeenCalled();expect(x.bindings.currentHiggsfieldProfileId).not.toHaveBeenCalled();expect(x.bindings.beginHiggsfieldJob).not.toHaveBeenCalled()
  expect(x.loadServiceCredential).not.toHaveBeenCalled();expect(x.fetch).not.toHaveBeenCalled();expect(JSON.stringify(x.request)).toBe(before)
 })
 it.each(['','  Exact\r\nauthored text  '])('reaches the separate owned API and exact optional/manual prompt %j with real adapter composition',async prompt=>{
  const {request,run,fetch,loadServiceCredential,bindings,fal}=setup(prompt),signal=new AbortController().signal
  expect(await run(request,signal)).toMatchObject({modelId:request.higgsfieldNative!.endpointId,outputType:'video',outputPath:'/fixture/output.mp4'})
  expect(loadServiceCredential).toHaveBeenCalledWith('higgsfield');expect(fal).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][0]).toBe(`${HIGGSFIELD_API}/${request.higgsfieldNative!.endpointId}`)
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({prompt,resolution:'720p',video_url:'https://media.example/source.mp4',image_urls:['https://media.example/ref.png']})
  expect(bindings.downloadResult.mock.calls[0][2]).toMatchObject({provider:'Higgsfield',prompt});expect(bindings.appendHistory).toHaveBeenCalledOnce()
 })
 it.each(['prompt','capacity','control','mode','reference'])('blocks %s defect before a provider credential, upload or submission',async defect=>{
  const {request,run,fetch,loadServiceCredential,bindings}=setup('Exact')
  if(defect==='prompt')request.higgsfieldNative!.values.prompt='Hidden text'
  if(defect==='capacity')request.higgsfieldNative!.media.image_urls=Array.from({length:9},()=>({url:'https://media.example/reference.png',mediaType:'image'}))
  if(defect==='control')request.higgsfieldNative!.values.generate_audio=true
  if(defect==='mode')request.higgsfieldNative!.endpointId='higgsfield/cinema-studio/4.0'
  if(defect==='reference')request.references=[{url:'https://media.example/lost.png',mediaType:'image',role:'character'}]
  await expect(run(request)).rejects.toThrow();expect(loadServiceCredential).not.toHaveBeenCalled();expect(bindings.prepareManagedHiggsfieldSource).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(bindings.appendHistory).not.toHaveBeenCalled()
 })
 it.each(['narrowed-images','required-control','narrowed-default','inaccessible','condition'])('blocks current public schema %s before private journal, credentials, preparation or POST',async change=>{
  const {request,run,fetch,loadServiceCredential,bindings}=setup('Exact')
  const publicCatalog=(bindings as any).higgsfieldPublicCatalog
  publicCatalog.readContract.mockImplementation(async()=>{
   if(change==='inaccessible')throw Error('Public current schema inaccessible')
   if(change==='condition')throw Error('Unsupported conditional schema')
   const schema=higgsfieldInputSchema(request.higgsfieldNative!.endpointId)
   if(change==='narrowed-images')schema.properties!.image_urls.maxItems=0
   if(change==='required-control'){schema.properties!.new_control={type:'string'};schema.required!.push('new_control')}
   if(change==='narrowed-default')schema.properties!.resolution.enum=['480p']
   return schema
  })
  await expect(run(request)).rejects.toThrow()
  expect(loadServiceCredential).not.toHaveBeenCalled();expect(bindings.prepareManagedHiggsfieldSource).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled()
  expect(request.higgsfieldNative!.media.image_urls).toHaveLength(1);expect(request.higgsfieldNative!.values.prompt).toBe('Exact')
 })
 it('pins original authored values/media across the asynchronous current-schema read',async()=>{
  const {request,run,fetch,bindings}=setup('  Original master  ')
  ;(bindings as any).higgsfieldPublicCatalog.readContract.mockImplementation(async(id:string,current:()=>void)=>{
   request.higgsfieldNative!.values.prompt='Injected later text'
   request.higgsfieldNative!.media.image_urls[0].url='https://media.example/later.png'
   current();return higgsfieldInputSchema(id)
  })
  await run(request)
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({prompt:'  Original master  ',image_urls:['https://media.example/ref.png']})
 })
 it('does not persist after an owner change during accepted generation and exposes uncertain remote work',async()=>{
  const {request,run,fetch,bindings}=setup(),remote=new HiggsfieldRemoteJobError('Stopped local waiting; remote work may continue.')
  fetch.mockRejectedValueOnce(remote)
  await expect(run(request)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError)
  expect(bindings.downloadResult).not.toHaveBeenCalled();expect(bindings.appendHistory).not.toHaveBeenCalled();expect(bindings.rememberServiceFailure).not.toHaveBeenCalled();expect(bindings.mainWindow.webContents.send).toHaveBeenCalledWith('generation:progress',expect.objectContaining({nodeId:'fixture',status:'remote-unknown'}))
 })
 it('prevents a superseded owner from publishing uncertain-job progress into another project',async()=>{
  const {request,run,fetch,bindings}=setup();fetch.mockImplementationOnce(async()=>{bindings.runtimeServiceFailures.assertCurrent.mockImplementation(()=>{throw new Error('owner changed')});throw new Error('ambiguous network')})
  await expect(run(request)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError);expect(bindings.mainWindow.webContents.send).not.toHaveBeenCalled();expect(bindings.appendHistory).not.toHaveBeenCalled()
 })

})
