import { assistantThinkingOptions, assistantThinkingSelection } from '../shared/assistantThinking'
import { createHash } from 'node:crypto'
import type { SubscriptionRuntime, SubscriptionStatus, SubscriptionRewrite } from '../shared/promptConnection'
import type { ServiceModelAvailability } from '../shared/types'
import { SubscriptionRpc, subscriptionJob } from './subscriptionRpc'

/** Official Codex local-client RPC; no copied OAuth client IDs or direct/private backend calls. */
export class CodexSubscriptionRuntime implements SubscriptionRuntime {
  constructor(private readonly root:string,private readonly openLogin:(url:string)=>Promise<void>){}
  private async job<T>(work:(rpc:SubscriptionRpc,cwd:string)=>Promise<T>):Promise<T>{
    return subscriptionJob(this.root,'codex',async(cwd,client)=>{
      const args=[...client.prefix,'app-server','--listen','stdio://','-c','forced_login_method="chatgpt"','-c','cli_auth_credentials_store="keyring"','-c','model_provider="openai"','-c','mcp_servers={}','-c','web_search="disabled"','-c','tools.view_image=false','-c','features.shell_tool=false','-c','features.unified_exec=false','-c','features.apply_patch_freeform=false','-c','features.multi_agent=false','-c','features.code_mode=false','-c','features.image_generation=false','-c','analytics.enabled=false']
      const rpc=SubscriptionRpc.start(client.file,args,cwd,{...client.env,CODEX_HOME:this.root})
      try{await rpc.request('initialize',{clientInfo:{name:'prism_foundry',title:'Prism Foundry',version:'0.1.0'},capabilities:{}});rpc.notify('initialized');return await work(rpc,cwd)}finally{rpc.close()}
    })
  }
  private async account(rpc:SubscriptionRpc):Promise<SubscriptionStatus>{
    const {account}=await rpc.request('account/read',{refreshToken:false})
    if(account?.type!=='chatgpt'||typeof account.email!=='string'||!account.email.trim())return {connected:false,error:'Sign in with ChatGPT to connect your subscription. API credentials are not used.'}
    return {connected:true,accountId:createHash('sha256').update(JSON.stringify([this.root,account.email,account.planType])).digest('hex'),label:`ChatGPT ${account.planType || 'account'}`}
  }
  async status():Promise<SubscriptionStatus>{try{return await this.job(rpc=>this.account(rpc))}catch(error){return{connected:false,error:error instanceof Error?error.message:'Codex subscription status is unavailable.'}}}
  async login():Promise<SubscriptionStatus>{return this.job(async rpc=>{
    const complete=rpc.waitFor(message=>message.method==='account/login/completed',300_000);void complete.catch(()=>undefined)
    const login=await rpc.request('account/login/start',{type:'chatgpt'})
    const url=new URL(login.authUrl)
    if(!['auth.openai.com','chatgpt.com'].includes(url.hostname)||url.protocol!=='https:')throw new Error('The official Codex client returned an unexpected sign-in destination.')
    await this.openLogin(url.toString());const event=await complete
    if(event.params?.success!==true||event.params?.loginId!==login.loginId)throw new Error('ChatGPT sign-in did not complete.')
    return this.account(rpc)
  })}
  private async catalog(rpc:SubscriptionRpc):Promise<ServiceModelAvailability>{
    const models:ServiceModelAvailability['models']=[],seen=new Set<string>();let cursor:string|undefined
    for(let page=0;page<20;page++){
      const result=await rpc.request('model/list',{limit:100,...(cursor?{cursor}:{})})
      if(!Array.isArray(result.data))throw new Error('Codex returned an invalid model catalog.')
      for(const row of result.data){if(typeof row.model!=='string'||typeof row.displayName!=='string'||row.hidden||seen.has(row.model))continue;seen.add(row.model);models.push(...assistantThinkingOptions({id:row.model,label:row.displayName},row.supportedReasoningEfforts))}
      if(!result.nextCursor)return{provider:'openai',models,verified:false,catalogComplete:true,catalogSource:'Official Codex model/list; access checked on each subscription turn.'}
      if(typeof result.nextCursor!=='string'||result.nextCursor===cursor)throw new Error('Codex model pagination did not advance.');cursor=result.nextCursor
    }
    throw new Error('Codex model catalog exceeded the bounded pagination limit.')
  }
  models(){return this.job(rpc=>this.catalog(rpc))}
  async rewrite(request:SubscriptionRewrite):Promise<string>{return this.job(async(rpc,cwd)=>{
    const check=async()=>{request.assertCurrent();if(request.signal?.aborted)throw new DOMException('Subscription request cancelled.','AbortError');const status=await this.account(rpc);request.assertCurrent();if(!status.connected||status.accountId!==request.expectedAccountId)throw new Error('The connected ChatGPT account changed. Reconnect before revamping.')}
    const abort=()=>rpc.fail(new DOMException('Subscription request cancelled.','AbortError'));request.signal?.addEventListener('abort',abort,{once:true})
    try{
      const selection=assistantThinkingSelection(request.model);
      await check();const catalog=await this.catalog(rpc);if(!catalog.models.some(model=>model.id===request.model))throw new Error('The selected model is absent from the Codex catalog. No model fallback was used.')
      const thread=await rpc.request('thread/start',{model:selection.model,modelProvider:'openai',cwd,ephemeral:true,approvalPolicy:'never',sandbox:'read-only',baseInstructions:request.instruction+'\nReturn rewritten text only. Do not call tools, access files, browse, or delegate.',developerInstructions:''})
      if(thread.model!==selection.model||thread.modelProvider!=='openai'||thread.cwd!==cwd||thread.approvalPolicy!=='never'||thread.sandbox?.type!=='readOnly'||thread.thread?.ephemeral!==true||(thread.instructionSources?.length||0)>0)throw new Error('Codex changed the exact model or isolated rewrite contract.')
      let output='';const id=thread.thread.id
      const unsubscribe=rpc.subscribe(message=>{if(message.params?.threadId!==id)return;request.assertCurrent();if(message.method==='model/rerouted'||message.method==='error')throw new Error('Codex changed or failed the selected model contract. No partial output was applied.');const item=message.params?.item;if(item?.type&&!['agentMessage','reasoning','userMessage'].includes(item.type))throw new Error('Codex requested a tool or unsupported rewrite operation.');if(message.method==='item/completed'&&item?.type==='agentMessage'){if(typeof item.text!=='string')throw new Error('Invalid Codex rewrite text.');output+=item.text}})
      try{const completion=rpc.waitFor(message=>message.method==='turn/completed'&&message.params?.threadId===id);void completion.catch(()=>undefined);request.assertCurrent();await rpc.request('turn/start',{threadId:id,input:[{type:'text',text:request.text,text_elements:[]}],model:selection.model,...(selection.effort?{effort:selection.effort}:{}),approvalPolicy:'never',sandboxPolicy:{type:'readOnly',networkAccess:false}},120_000);const result=await completion;if(result.params?.turn?.status!=='completed'||!output.trim())throw new Error('Codex did not complete the selected subscription rewrite.');await check();return output.trim()}finally{unsubscribe()}
    }finally{request.signal?.removeEventListener('abort',abort)}
  })}
}
