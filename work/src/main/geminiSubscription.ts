import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SubscriptionRuntime, SubscriptionStatus, SubscriptionRewrite } from '../shared/promptConnection'
import type { ServiceModelAvailability } from '../shared/types'
import { SubscriptionRpc, subscriptionJob, type RpcRecord } from './subscriptionRpc'

/** Official Gemini ACP owns OAuth. Prism reads only its non-secret account/settings metadata. */
export class GeminiSubscriptionRuntime implements SubscriptionRuntime {
  constructor(private readonly root:string){}
  private async metadata(file:string):Promise<RpcRecord>{const info=await stat(file);if(!info.isFile()||info.size>64*1024)throw new Error('Invalid Google account metadata.');return JSON.parse(await readFile(file,'utf8'))}
  async status():Promise<SubscriptionStatus>{
    try{const folder=join(this.root,'.gemini'),settings=await this.metadata(join(folder,'settings.json')),account=await this.metadata(join(folder,'google_accounts.json'));if(settings.security?.auth?.selectedType!=='oauth-personal'||typeof account.active!=='string'||!account.active.trim())return{connected:false,error:'Sign in with Google through Gemini CLI to connect Subscription.'};return{connected:true,accountId:createHash('sha256').update(JSON.stringify([this.root,account.active])).digest('hex'),label:'Google account'}}catch{return{connected:false,error:'Connect your Google account through the official Gemini CLI. API credentials remain separate.'}}
  }
  private async job<T>(work:(rpc:SubscriptionRpc,cwd:string)=>Promise<T>, exactModel?:string):Promise<T>{
    return subscriptionJob(this.root,'gemini',async(cwd,client)=>{
      const folder=join(cwd,'.gemini');await mkdir(folder,{mode:0o700})
      // Per-job controls only; account OAuth settings stay under the official client-owned home.
      const exactPolicy=exactModel?{experimental:{dynamicModelConfiguration:true},modelConfigs:{modelIdResolutions:{[exactModel]:{default:exactModel,contexts:[]}},modelChains:Object.fromEntries(['preview','auto-preview','default','auto-default','lite'].map(key=>[key,[{model:exactModel,actions:{terminal:'prompt',transient:'prompt',not_found:'prompt',unknown:'prompt'},stateTransitions:{terminal:'terminal',transient:'terminal',not_found:'terminal',unknown:'terminal'}}]]))}}:{}
      await writeFile(join(folder,'settings.json'),JSON.stringify({tools:{core:[],exclude:['*']},mcpServers:{},mcp:{enabled:false},extensions:{enabled:false},hooksConfig:{enabled:false},context:{fileName:[],discoveryMaxDirs:0},general:{enableAutoUpdate:false},telemetry:{enabled:false},security:{auth:{enforcedType:'oauth-personal'}},...exactPolicy}),{mode:0o600})
      const rpc=SubscriptionRpc.start(client.file,[...client.prefix,'--acp','--approval-mode','default','--extensions',''],cwd,{...client.env,GEMINI_CLI_HOME:this.root},true)
      try{const init=await rpc.request('initialize',{protocolVersion:1,clientCapabilities:{fs:{readTextFile:false,writeTextFile:false},terminal:false},clientInfo:{name:'prism-foundry',version:'0.1.0'}});if(!Array.isArray(init.authMethods)||!init.authMethods.some((method:RpcRecord)=>method.id==='oauth-personal'))throw new Error('This Gemini CLI does not expose the supported Google OAuth method.');return await work(rpc,cwd)}finally{rpc.close()}
    })
  }
  async login():Promise<SubscriptionStatus>{return this.job(async rpc=>{await rpc.request('authenticate',{methodId:'oauth-personal'},300_000);const status=await this.status();if(!status.connected)throw new Error(status.error);return status})}
  private async session(rpc:SubscriptionRpc,cwd:string):Promise<RpcRecord>{
    const status=await this.status();if(!status.connected)throw new Error(status.error)
    return rpc.request('session/new',{cwd,mcpServers:[]},60_000)
  }
  private catalog(session:RpcRecord):ServiceModelAvailability{
    const rows=session.models?.availableModels
    if(!Array.isArray(rows))throw new Error('Gemini CLI did not report a supported model catalog.')
    const models=rows.filter((row:RpcRecord)=>typeof row.modelId==='string'&&typeof row.name==='string'&&!/^auto/.test(row.modelId)).map((row:RpcRecord)=>({id:row.modelId,label:row.name}))
    return{provider:'google',models,verified:false,catalogComplete:true,catalogSource:'Official Gemini ACP session model catalog; Google plan/access checked by the native client.'}
  }
  async models():Promise<ServiceModelAvailability>{return this.job(async(rpc,cwd)=>this.catalog(await this.session(rpc,cwd)))}
  async rewrite(request:SubscriptionRewrite):Promise<string>{return this.job(async(rpc,cwd)=>{
    const check=async()=>{request.assertCurrent();if(request.signal?.aborted)throw new DOMException('Subscription request cancelled.','AbortError');const status=await this.status();request.assertCurrent();if(!status.connected||status.accountId!==request.expectedAccountId)throw new Error('The connected Google account changed. Reconnect before revamping.')}
    const abort=()=>rpc.fail(new DOMException('Subscription request cancelled.','AbortError'));request.signal?.addEventListener('abort',abort,{once:true})
    try{await check();const session=await this.session(rpc,cwd),catalog=this.catalog(session);if(!catalog.models.some(model=>model.id===request.model))throw new Error('The selected model is unavailable through Google Subscription. No fallback was used.');await rpc.request('session/set_model',{sessionId:session.sessionId,modelId:request.model});request.assertCurrent();let output=''
      const unsubscribe=rpc.subscribe(message=>{if(message.method!=='session/update'||message.params?.sessionId!==session.sessionId)return;request.assertCurrent();const update=message.params.update;if(['tool_call','tool_call_update','current_mode_update','current_model_update','config_option_update'].includes(update?.sessionUpdate))throw new Error('Gemini requested a tool or changed the selected rewrite contract.');if(update?.sessionUpdate==='agent_message_chunk'){if(update.content?.type!=='text'||typeof update.content.text!=='string')throw new Error('Gemini returned unsupported rewrite output.');output+=update.content.text}})
      try{const result=await rpc.request('session/prompt',{sessionId:session.sessionId,prompt:[{type:'text',text:request.instruction+'\nReturn rewritten text only; do not call tools or access files.\n\n'+request.text}]},120_000);if(result.stopReason!=='end_turn'||!output.trim())throw new Error('Gemini did not complete the selected subscription rewrite.');await check();return output.trim()}finally{unsubscribe()}
    }finally{request.signal?.removeEventListener('abort',abort)}
  },request.model)}
}
