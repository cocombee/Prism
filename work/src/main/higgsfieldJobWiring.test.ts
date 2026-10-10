import {assertGenerationRequirements} from '../shared/generationReadiness'
import {assertVideoProviderPromptPreflight} from '../shared/providerPromptPreflight'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {basename,join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import ts from 'typescript'
import {HiggsfieldApi,HiggsfieldRemoteJobError} from './higgsfieldApi'
import {HiggsfieldJobStore,higgsfieldCredentialIdentity,higgsfieldJobView} from './higgsfieldJobStore'
import {beginHiggsfieldJob} from './higgsfieldJobLifecycle'
import {resolveHiggsfieldCurrentInput} from './higgsfieldCurrentInput'
import {persistHiggsfieldOutput} from './higgsfieldOutput'
import {performHiggsfieldJobAction,higgsfieldRecoveryView,higgsfieldJobCommand,HiggsfieldJobActions} from './higgsfieldJobRecovery'
import {JsonMutationQueue} from './mainSafety'
import {executeHiggsfieldGeneration} from './higgsfieldGeneration'
import {projectServiceProfileSelection} from '../shared/serviceProfiles'
import {HIGGSFIELD_CONTRACT_REVISION,planHiggsfieldNativeInput,higgsfieldSeedanceRequest,higgsfieldInputSchema} from '../shared/higgsfieldNative'
import {validateFalContractValue} from './falSchemaValidation'
import type {ImportedAsset,HistoryEntry} from '../shared/types'
const directories:string[]=[];afterEach(async()=>{for(const directory of directories.splice(0))await rm(directory,{recursive:true,force:true})})
const file=readFileSync(new URL('./index.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('index.ts',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
const names=new Set(['higgsfieldJobScope','currentHiggsfieldProfileId','createCurrentHiggsfieldApi','runNativeHiggsfieldGeneration','persistCurrentHiggsfieldOutput','recoverCurrentHiggsfieldJob','listCurrentHiggsfieldJobs'])
const code=ast.statements.filter(statement=>ts.isFunctionDeclaration(statement)&&statement.name&&names.has(statement.name.text)).map(statement=>statement.getText(ast)).join('\n')
const program=ts.transpile(code,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS})
async function setup(mode:'complete'|'ambiguous'|'output-failure'|'preparation-failure'|'history-failure'|'mov-complete'='complete'){
 const directory=await mkdtemp(join(tmpdir(),'prism-higgs-main-job-'));directories.push(directory);const root=join(directory,'project');await mkdir(root)
 const scope={projectId:'project',rootPath:root,documentPath:join(root,'Canvas.prismflow'),nodeId:'video'},store=new HiggsfieldJobStore(directory),calls={credentials:0,post:0,download:0,history:0,profiles:0},key='fictional-key-id:fictional-secret',progress:unknown[]=[],native={endpointId:'higgsfield/genjutsu/motion-transfer/v1.0',contractRevision:HIGGSFIELD_CONTRACT_REVISION,values:{prompt:'  Original\r\nmaster  '},media:{video_url:[{url:'https://media.example/source.mp4',mediaType:'video' as const}],image_urls:[{url:'https://media.example/ref.png',mediaType:'image' as const}]},allowSourceTrimming:true},request={nodeId:scope.nodeId,kind:'video-generator',prompt:native.values.prompt,providerPromptOverride:native.values.prompt,higgsfieldNative:native}
 const outputMime=mode==='mov-complete'?'video/quicktime':'video/mp4'
 const bytes=Buffer.from([0,0,0,24,102,116,121,112,...(mode==='mov-complete'?[113,116,32,32]:[105,115,111,109]),0,0,0,0,...(mode==='mov-complete'?[113,116,32,32]:[105,115,111,109]),109,112,52,50]),assetIndex=join(root,'assets.json'),historyIndex=join(root,'history.json');let body:Record<string,unknown>|undefined,selectedKey=key,profile='profile-original',historyFailed=false
 const apiFetch=vi.fn(async(url:string,init?:RequestInit)=>{
   if(url==='https://media.example/result.mp4'){calls.download++;expect(init?.redirect).toBe('error');expect((init?.headers as Record<string,string>|undefined)?.Authorization).toBeUndefined();if(mode==='output-failure')throw Error('output storage unavailable');return new Response(bytes,{headers:{'content-type':outputMime}})}
   expect((init?.headers as Record<string,string>).Authorization).toBe('Key '+key)
   if(url.endsWith('/status')){expect(init?.method).toBe('GET');return new Response(JSON.stringify({status:'completed',request_id:'provider-id',video:{url:'https://media.example/result.mp4',content_type:outputMime}}))}
   expect(url).toBe('https://api.higgsfield.ai/'+native.endpointId);expect(init?.method).toBe('POST');calls.post++;const records=await new HiggsfieldJobStore(directory).list(scope);expect(records[0]).toMatchObject({state:calls.post===1?'submitting':'unknown',profileId:'profile-original',credentialId:higgsfieldCredentialIdentity(key)});body=JSON.parse(init?.body as string);if(mode==='ambiguous'&&calls.post===1)throw Error('lost response');return new Response(JSON.stringify({status:'completed',request_id:'provider-id',video:{url:'https://media.example/result.mp4',content_type:outputMime}}))
 })
 const assetQueue=new JsonMutationQueue(),historyQueue=new JsonMutationQueue(),read=async<T>(path:string,fallback:T)=>{try{return JSON.parse(await readFile(path,'utf8')) as T}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return fallback;throw error}}
 const dependencies={assertGenerationRequirements,assertVideoProviderPromptPreflight,HiggsfieldApi,HiggsfieldRemoteJobError,higgsfieldCredentialIdentity,higgsfieldJobView,higgsfieldJobCommand,HiggsfieldJobActions,higgsfieldJobActions:new HiggsfieldJobActions(),performHiggsfieldJobAction,higgsfieldRecoveryView,persistHiggsfieldOutput,beginHiggsfieldJob,executeHiggsfieldGeneration,projectServiceProfileSelection,resolve,basename,higgsfieldJobStore:()=>store,generationContext:{getStore:()=>scope},currentProject:{id:scope.projectId,rootPath:scope.rootPath},currentProjectDocumentPath:scope.documentPath,runtimeServiceFailures:{assertCurrent:vi.fn(),delete:vi.fn(),overrides:()=>({higgsfield:profile})},serviceProfileStore:()=>({listProfiles:async()=>{calls.profiles++;return {schemaVersion:1,profiles:[{id:profile,provider:'higgsfield',status:'connected'}],defaults:{higgsfield:'wrong-default'}}}}),loadServiceCredential:async(provider:string)=>{expect(provider).toBe('higgsfield');calls.credentials++;return selectedKey},safeStorage:{isEncryptionAvailable:()=>true,encryptString:(value:string)=>Buffer.from(value),decryptString:(value:Buffer)=>value.toString()},net:{fetch:apiFetch},assertGenerationCommit:vi.fn(),prepareManagedHiggsfieldSource:async(source:unknown)=>{if(mode==='preparation-failure')throw Error('invalid source');return {source}},readStrictJsonOr:read,assetsIndexPath:()=>assetIndex,historyPath:()=>historyIndex,historyJsonMutations:{mutateArray:async<T>(path:string,change:(items:T[])=>T[])=>{if(mode==='history-failure'&&!historyFailed){historyFailed=true;throw new Error('history interrupted')}calls.history++;return historyQueue.mutateArray(path,change)}},registerAsset:async(asset:ImportedAsset)=>{expect(asset.metadata?.prompt).toBe(request.prompt);await assetQueue.mutateArray<ImportedAsset>(assetIndex,assets=>[asset,...assets.filter(item=>item.id!==asset.id)]);return asset},writeProjectDocument:async()=>{await writeFile(scope.documentPath,JSON.stringify({assets:await read(assetIndex,[])}))},localAssetUrl:(path:string)=> 'prism-asset://local/'+encodeURIComponent(path),rememberServiceFailure:vi.fn(),mainWindow:{webContents:{send:(_channel:unknown,data:unknown)=>progress.push(data)}}}
 Object.assign(dependencies,{resolveHiggsfieldCurrentInput,planHiggsfieldNativeInput,higgsfieldSeedanceRequest,validateFalContractValue,higgsfieldPublicCatalog:{readContract:async(id:string,current:()=>void)=>{current();return higgsfieldInputSchema(id)}}})
 const helpers=new Function(...Object.keys(dependencies),program+'\nreturn {run:runNativeHiggsfieldGeneration,recover:recoverCurrentHiggsfieldJob,list:listCurrentHiggsfieldJobs};')(...Object.values(dependencies))
 return {...helpers,request,calls,store,scope,directory,progress,body:()=>body,fetch:apiFetch,dependencies,readAssets:()=>read<ImportedAsset[]>(assetIndex,[]),readHistory:()=>read<HistoryEntry[]>(historyIndex,[]),setKey:(key:string)=>{selectedKey=key},setProfile:(value:string)=>{profile=value}}
}
describe('actual main generation/recovery→private journal→native API→receipt/index/history',()=>{
 it('uses selected profile and protected pre-POST intent, then commits exact output/history receipt',async()=>{const x=await setup(),output=await x.run(x.request),jobs=await new HiggsfieldJobStore(x.directory).list(x.scope);expect(output.outputType).toBe('video');expect(x.body()?.prompt).toBe(x.request.prompt);expect(x.calls).toEqual({credentials:1,post:1,download:1,history:1,profiles:1});expect((await x.readHistory())[0]).toMatchObject({id:'higgsfield-'+jobs[0].id});expect(jobs[0]).toMatchObject({state:'persisted',requestId:'provider-id',outputPath:output.outputPath,outputBytes:24});expect(await readFile(output.outputPath)).toHaveLength(24)})
 it('ambiguous response survives reconstructed storage and prevents another paid POST',async()=>{const x=await setup('ambiguous');await expect(x.run(x.request)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError);expect((await new HiggsfieldJobStore(x.directory).list(x.scope))[0]).toMatchObject({state:'unknown'});await expect(x.run(x.request)).rejects.toThrow(/prior Higgsfield job/);expect(x.calls.post).toBe(1);expect(x.calls.credentials).toBe(1);expect(x.calls.download).toBe(0);expect(x.progress[0]).toMatchObject({status:'remote-unknown',nodeId:'video'})})
 it('completed provider job and failed output storage cannot cause another paid generation',async()=>{const x=await setup('output-failure');await expect(x.run(x.request)).rejects.toThrow(/output storage/);expect((await x.store.list(x.scope))[0]).toMatchObject({state:'completed',requestId:'provider-id'});await expect(x.run(x.request)).rejects.toThrow(/prior/);expect(x.calls.post).toBe(1);expect(x.calls.credentials).toBe(1);expect(x.calls.history).toBe(0)})
 it('failed media preparation resolves only its own unsubmitted intent with no credential or transport call',async()=>{const x=await setup('preparation-failure');await expect(x.run(x.request)).rejects.toThrow(/invalid source/);expect((await x.store.list(x.scope))[0].state).toBe('failed');expect(x.calls.credentials).toBe(0);expect(x.calls.post).toBe(0);expect(x.calls.download).toBe(0)})
 it('restores original output after history interruption with one POST/one download/one index and history entry',async()=>{const x=await setup('history-failure');await expect(x.run(x.request)).rejects.toThrow('history interrupted');const job=(await x.list())[0];expect(job.state).toBe('completed');x.request.higgsfieldNative.values.prompt='Edited after crash';const restored=await x.recover({id:job.id,nodeId:x.scope.nodeId,action:'recover'});expect(restored.job.state).toBe('persisted');expect(x.calls.post).toBe(1);expect(x.calls.download).toBe(1);expect((await x.readAssets())).toHaveLength(1);expect((await x.readAssets())[0].metadata?.prompt).toBe('  Original\r\nmaster  ');expect(await x.readHistory()).toHaveLength(1);const calls=x.fetch.mock.calls.length;await x.recover({id:job.id,nodeId:x.scope.nodeId,action:'recover'});expect(x.fetch).toHaveBeenCalledTimes(calls);expect(await x.readAssets()).toHaveLength(1);expect(await x.readHistory()).toHaveLength(1)})
 it('refuses a replacement public key under the same account profile before status/download',async()=>{const x=await setup('history-failure');await expect(x.run(x.request)).rejects.toThrow();const job=(await x.list())[0],calls=x.fetch.mock.calls.length;x.setKey('different-id:fictional-secret');await expect(x.recover({id:job.id,nodeId:x.scope.nodeId,action:'recover'})).rejects.toThrow(/different account/);expect(x.fetch).toHaveBeenCalledTimes(calls);expect((await x.list())[0].state).toBe('completed')})
 it('refuses an original-profile mismatch before credential loading',async()=>{const x=await setup('history-failure');await expect(x.run(x.request)).rejects.toThrow();const job=(await x.list())[0],credentials=x.calls.credentials;x.setProfile('different-profile');await expect(x.recover({id:job.id,nodeId:x.scope.nodeId,action:'recover'})).rejects.toThrow(/original.*account/i);expect(x.calls.credentials).toBe(credentials)})
})

it('actual main exposes and reconciles a protected lost submission without adopting later prompt edits or another intent',async()=>{
 const x=await setup('ambiguous');await expect(x.run(x.request)).rejects.toBeInstanceOf(HiggsfieldRemoteJobError)
 const job=(await x.list())[0];expect(job.canReconcile).toBe(true);expect(job.requestId).toBeUndefined()
 x.request.higgsfieldNative.values.prompt='Edited after disconnect'
 const result=await x.recover({id:job.id,nodeId:x.scope.nodeId,action:'recover'})
 expect(result.job.state).toBe('persisted');expect(result.result.requestId).toBe('provider-id')
 const posts=x.fetch.mock.calls.filter((call:[string,RequestInit?])=>call[1]?.method==='POST')
 expect(posts).toHaveLength(2);expect(posts[1][1]?.body).toBe(posts[0][1]?.body)
 expect((posts[1][1]?.headers as Record<string,string>)['Idempotency-Key']).toBe((posts[0][1]?.headers as Record<string,string>)['Idempotency-Key'])
 expect(x.calls.download).toBe(1);expect(await x.readAssets()).toHaveLength(1);expect(await x.readHistory()).toHaveLength(1)
 expect((await x.readAssets())[0].metadata?.prompt).toBe('  Original\r\nmaster  ')
})

it('actual API/main/journal/index/history retains a QuickTime output as MOV with its original prompt',async()=>{
 const x=await setup('mov-complete'),result=await x.run(x.request),job=(await x.list())[0]
 expect(result.outputPath.endsWith('.mov')).toBe(true);expect(job.state).toBe('persisted')
 const assets=await x.readAssets();expect(assets).toHaveLength(1);expect(assets[0].mimeType).toBe('video/quicktime');expect(assets[0].path).toBe(result.outputPath)
 expect(await x.readHistory()).toHaveLength(1);const previous=x.calls.download
 await x.recover({id:job.id,nodeId:x.scope.nodeId,action:'recover'})
 expect(x.calls.post).toBe(1);expect(x.calls.download).toBe(previous);expect(await x.readAssets()).toHaveLength(1)
})
