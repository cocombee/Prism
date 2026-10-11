import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import * as transport from './subscriptionRpc'
import { CodexSubscriptionRuntime } from './codexSubscription'
import { GeminiSubscriptionRuntime } from './geminiSubscription'
import type { SubscriptionRewrite } from '../shared/promptConnection'

const roots:string[]=[]
afterEach(async()=>{vi.restoreAllMocks();await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})))})
async function fixture(vendor:'codex'|'gemini') {
  const root=await mkdtemp(join(tmpdir(),'prism-native-subscription-test-'));roots.push(root)
  const calls:Array<{method:string;params:any}>=[],launches:Array<{args:string[];cwd:string;env:NodeJS.ProcessEnv}>=[]
  const children:Array<{kill:ReturnType<typeof vi.fn>}>=[]
  let behavior:(method:string,params:any,emit:(message:any)=>void)=>Promise<any>|any=()=>({})
  vi.spyOn(transport,'subscriptionJob').mockImplementation(async(root,_vendor,work)=>{
    const cwd=await mkdtemp(join(root,'job-'))
    try{return await work(cwd,{file:'/official-client',prefix:[],env:{HOME:'/user',PATH:'/usr/bin'}})}finally{await rm(cwd,{recursive:true,force:true})}
  })
  vi.spyOn(transport.SubscriptionRpc,'start').mockImplementation((_file,args,cwd,env,jsonrpc)=>{
    launches.push({args,cwd,env})
    const child=Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:vi.fn()});children.push(child)
    let pending=''
    child.stdin.on('data',chunk=>{
      pending+=chunk.toString()
      for(;;){const end=pending.indexOf('\n');if(end<0)break;const request=JSON.parse(pending.slice(0,end));pending=pending.slice(end+1);if(!request.method)continue;calls.push(request)
        queueMicrotask(async()=>{try{const result=await behavior(request.method,request.params,message=>child.stdout.write(JSON.stringify(message)+'\n'));if(request.id!==undefined)child.stdout.write(JSON.stringify({id:request.id,result})+'\n')}catch{child.stdout.write(JSON.stringify({id:request.id,error:{code:-32000,message:'private vendor diagnostic'}})+'\n')}})
      }
    })
    return new transport.SubscriptionRpc(child as unknown as ChildProcessWithoutNullStreams,jsonrpc)
  })
  const account={type:'chatgpt',email:'fixture@example.invalid',planType:'plus'}
  let wrongModel=false,failedTurn=false,tool=false,changedAccount=false
  behavior=(method,params,emit)=>{
    if(method==='initialize')return vendor==='gemini'?{authMethods:[{id:'oauth-personal'}]}:{}
    if(method==='account/read')return{account:changedAccount?{...account,email:'changed@example.invalid'}:account}
    if(method==='model/list')return{data:[{model:'exact-model',displayName:'Exact model',supportedReasoningEfforts:[{reasoningEffort:'low'},{reasoningEffort:'high'}]},{model:'hidden-model',displayName:'Hidden',hidden:true}],nextCursor:null}
    if(method==='thread/start')return{thread:{id:'thread',ephemeral:true},model:wrongModel?'replacement-model':params.model,modelProvider:'openai',cwd:params.cwd,approvalPolicy:'never',sandbox:{type:'readOnly'},instructionSources:[]}
    if(method==='turn/start'){
      emit({method:'item/completed',params:{threadId:'thread',item:{type:tool?'commandExecution':'agentMessage',text:'Faithful rewritten @hero, 5 seconds.'}}})
      emit({method:'turn/completed',params:{threadId:'thread',turn:{status:failedTurn?'failed':'completed'}}});return{}
    }
    if(method==='session/new')return{sessionId:'session',models:{currentModelId:'auto',availableModels:[{modelId:'exact-model',name:'Exact model'},{modelId:'auto',name:'Auto'}]}}
    if(method==='session/prompt'){
      emit({method:'session/update',params:{sessionId:'session',update:{sessionUpdate:tool?'tool_call':'agent_message_chunk',content:{type:'text',text:'Faithful rewritten @hero, 5 seconds.'}}}})
      return{stopReason:failedTurn?'cancelled':'end_turn'}
    }
    return{}
  }
  if(vendor==='gemini'){
    await mkdir(join(root,'.gemini'))
    await writeFile(join(root,'.gemini','settings.json'),JSON.stringify({security:{auth:{selectedType:'oauth-personal'}}}))
    await writeFile(join(root,'.gemini','google_accounts.json'),JSON.stringify({active:'fixture@example.invalid'}))
  }
  const openLogin=vi.fn(async()=>undefined),runtime=vendor==='codex'?new CodexSubscriptionRuntime(root,openLogin):new GeminiSubscriptionRuntime(root)
  const request=async(extra:Partial<SubscriptionRewrite>={})=>({text:'Original prompt:\nAuthored @hero, 5 seconds.',instruction:'Preserve exact continuity.',model:'exact-model',expectedAccountId:(await runtime.status()).accountId,assertCurrent:()=>{},...extra})
  return{root,runtime,request,calls,launches,children,openLogin,setBehavior:(next:typeof behavior)=>{behavior=next},wrongModel:()=>{wrongModel=true},failedTurn:()=>{failedTurn=true},tool:()=>{tool=true},changedAccount:()=>{changedAccount=true}}
}

describe('Codex discovered thinking transport', () => {
  it('discovers choices and sends the selected effort to the same exact model', async () => {
    const x = await fixture('codex')
    expect((await x.runtime.models()).models.map(option=>option.id)).toEqual(['exact-model','exact-model::thinking=low','exact-model::thinking=high'])
    await x.runtime.rewrite(await x.request({model:'exact-model::thinking=high'}))
    expect(x.calls.find(call=>call.method==='thread/start')?.params.model).toBe('exact-model')
    expect(x.calls.find(call=>call.method==='turn/start')?.params).toMatchObject({model:'exact-model',effort:'high'})
  })
  it('rejects an effort missing from current discovery before inference', async () => {
    const x = await fixture('codex')
    await expect(x.runtime.rewrite(await x.request({model:'exact-model::thinking=ultra'}))).rejects.toThrow('absent')
    expect(x.calls.some(call=>call.method==='turn/start')).toBe(false)
  })
})

describe.each(['codex','gemini'] as const)('official %s subscription protocol boundary',vendor=>{
  it('uses the exact selected model and policy, temporary workspace, isolated native credentials and no tools',async()=>{
    const x=await fixture(vendor),request=await x.request()
    expect(await x.runtime.rewrite(request)).toContain('@hero, 5 seconds.')
    const inference=x.calls.find(call=>call.method===(vendor==='codex'?'turn/start':'session/prompt'))!
    if(vendor==='codex'){
      expect(inference.params).toMatchObject({model:'exact-model',approvalPolicy:'never',sandboxPolicy:{type:'readOnly',networkAccess:false}})
      expect(x.launches[0].args).toContain('tools.view_image=false');expect(x.launches[0].args).toContain('features.shell_tool=false')
      expect(x.calls.find(call=>call.method==='thread/start')?.params.baseInstructions).toContain(request.instruction)
      expect(x.launches[0].env.CODEX_HOME).toBe(x.root)
    }else{
      expect(x.calls.find(call=>call.method==='session/set_model')?.params).toEqual({sessionId:'session',modelId:'exact-model'})
      expect(inference.params.prompt[0].text).toContain(request.instruction);expect(x.launches[0].env.GEMINI_CLI_HOME).toBe(x.root)
    }
    expect(x.children.every(child=>child.kill.mock.calls.length===1)).toBe(true)
  })
  it('does not infer with a model missing from the official subscription catalog',async()=>{
    const x=await fixture(vendor)
    await expect(x.runtime.rewrite(await x.request({model:'missing-model'}))).rejects.toThrow(/unavailable|absent/)
    expect(x.calls.some(call=>call.method==='turn/start'||call.method==='session/prompt')).toBe(false)
  })
  it('discards partial output when the native turn is failed or cancelled',async()=>{
    const x=await fixture(vendor);x.failedTurn()
    await expect(x.runtime.rewrite(await x.request())).rejects.toThrow('did not complete')
  })
  it('discards output and kills the child when a tool operation appears',async()=>{
    const x=await fixture(vendor);x.tool()
    await expect(x.runtime.rewrite(await x.request())).rejects.toThrow(/tool|closed/)
    expect(x.children.every(child=>child.kill.mock.calls.length===1)).toBe(true)
  })
  it('cancels before inference when the captured request was aborted',async()=>{
    const x=await fixture(vendor),controller=new AbortController();controller.abort()
    await expect(x.runtime.rewrite(await x.request({signal:controller.signal}))).rejects.toMatchObject({name:'AbortError'})
    expect(x.calls.some(call=>call.method==='turn/start'||call.method==='session/prompt')).toBe(false)
  })
})
describe('official native subscription account and model ownership',()=>{
  it('rejects changed OpenAI account pins before inference',async()=>{
    const x=await fixture('codex'),request=await x.request();x.changedAccount()
    await expect(x.runtime.rewrite(request)).rejects.toThrow('account changed');expect(x.calls.some(call=>call.method==='turn/start')).toBe(false)
  })
  it('rejects a Codex model replacement before starting a turn',async()=>{
    const x=await fixture('codex');x.wrongModel()
    await expect(x.runtime.rewrite(await x.request())).rejects.toThrow('exact model');expect(x.calls.some(call=>call.method==='turn/start')).toBe(false)
  })
  it('keeps Google account pinning separate from paid-plan entitlement',async()=>{
    const x=await fixture('gemini'),request=await x.request()
    expect((await x.runtime.status()).label).toBe('Google account')
    await writeFile(join(x.root,'.gemini','google_accounts.json'),JSON.stringify({active:'changed@example.invalid'}))
    await expect(x.runtime.rewrite(request)).rejects.toThrow('account changed');expect(x.calls.some(call=>call.method==='session/prompt')).toBe(false)
  })
  it('writes a Google per-job model policy with only the requested model, no fallback or built-in tools',async()=>{
    const x=await fixture('gemini');let settings:any
    x.setBehavior(async(method,params,emit)=>{
      if(method==='initialize')return{authMethods:[{id:'oauth-personal'}]}
      if(method==='session/new'){settings=JSON.parse(await readFile(join(params.cwd,'.gemini','settings.json'),'utf8'));return{sessionId:'session',models:{availableModels:[{modelId:'exact-model',name:'Exact'}]}}}
      if(method==='session/prompt'){emit({method:'session/update',params:{sessionId:'session',update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'Rewritten'}}}});return{stopReason:'end_turn'}}
      return{}
    })
    await x.runtime.rewrite(await x.request())
    expect(settings.tools.core).toEqual([]);expect(settings.mcp.enabled).toBe(false);expect(settings.experimental.dynamicModelConfiguration).toBe(true)
    for(const chain of Object.values(settings.modelConfigs.modelChains) as any[])expect(chain.map((item:any)=>item.model)).toEqual(['exact-model'])
  })
})
