import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { access, mkdir, mkdtemp, realpath, rm } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'

export type RpcRecord = Record<string, any>
export function nativeSubscriptionEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = {}
  for (const key of ['HOME','PATH','USER','LOGNAME','SHELL','LANG','LC_ALL','LC_CTYPE','TMPDIR']) if (source[key]) clean[key] = source[key]
  clean.PATH ||= '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin'
  return clean
}

/** Only recognized official install layouts; no arbitrary PATH shell wrappers. */
export async function subscriptionExecutable(vendor: 'codex' | 'gemini'): Promise<{file:string; prefix:string[]; env:NodeJS.ProcessEnv}> {
  const clean = nativeSubscriptionEnvironment(), home = homedir()
  const paths = [...(clean.PATH || '').split(delimiter).filter(isAbsolute).map(dir => join(dir,vendor)), join(home,'.npm-global/bin',vendor),join(home,'.local/bin',vendor)]
  if (vendor === 'codex') paths.unshift('/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex')
  for (const candidate of new Set(paths)) try {
    await access(candidate,constants.X_OK); const actual = await realpath(candidate)
    const approved = vendor === 'codex' ? actual === paths[0] || /\/node_modules\/@openai\/codex\/.*\/codex$/.test(actual) : /\/node_modules\/@google\/gemini-cli\/bundle\/gemini\.js$/.test(actual)
    if (!approved) continue
    if (actual.endsWith('.js')) return {file:process.execPath,prefix:[actual],env:{...clean,ELECTRON_RUN_AS_NODE:'1'}}
    return {file:actual,prefix:[],env:clean}
  } catch { /* next supported install location */ }
  throw new Error(`Install the official ${vendor === 'codex' ? 'Codex' : 'Gemini CLI'} client before connecting Subscription.`)
}

/** Main-only bounded stdio RPC. Credentials and raw vendor diagnostics never leave the child. */
export class SubscriptionRpc {
  private id=0
  private buffer=''
  private bytes=0
  private ended=false
  private readonly pending=new Map<number,{resolve:(v:RpcRecord)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>()
  private readonly listeners=new Set<(message:RpcRecord)=>void>()
  private readonly failures=new Set<(error:Error)=>void>()
  constructor(private readonly child:ChildProcessWithoutNullStreams, private readonly jsonrpc=false) {
    child.stdout.setEncoding('utf8')
    child.stdout.on('data',(chunk:string)=>{
      this.bytes+=Buffer.byteLength(chunk)
      if(this.bytes>8*1024*1024){this.fail(new Error('Subscription response exceeded its bounded limit.'));return}
      this.buffer+=chunk
      for(;;){const end=this.buffer.indexOf('\n');if(end<0)break;const line=this.buffer.slice(0,end);this.buffer=this.buffer.slice(end+1);if(!line.trim())continue
        try { const message=JSON.parse(line); if(!message||typeof message!=='object'||Array.isArray(message))throw new Error(); this.receive(message) }
        catch {this.fail(new Error('The native subscription client returned malformed RPC output.'));return}
      }
    })
    let diagnosticBytes=0
    child.stderr.on('data',(chunk:Buffer)=>{diagnosticBytes+=chunk.length;if(diagnosticBytes>512*1024)this.fail(new Error('Native subscription diagnostics exceeded the bounded limit.'))})
    child.stdin.on('error',()=>this.fail(new Error('The subscription client input closed.')))
    child.on('error',()=>this.fail(new Error('The official subscription client could not start.')))
    child.on('close',()=>this.fail(new Error('The subscription client closed before completion.')))
  }
  static start(file:string,args:string[],cwd:string,env:NodeJS.ProcessEnv,jsonrpc=false):SubscriptionRpc {
    return new SubscriptionRpc(spawn(file,args,{cwd,env,shell:false,stdio:'pipe',detached:true}),jsonrpc)
  }
  private receive(message:RpcRecord) {
    if (message.id !== undefined && !message.method) {
      const item=this.pending.get(message.id);if(!item)return
      this.pending.delete(message.id);clearTimeout(item.timer)
      if(message.error)item.reject(Object.assign(new Error(`The subscription client rejected the request (${Number(message.error.code)||'provider error'}). No API fallback was used.`),{code:message.error.code}))
      else if(message.result&&typeof message.result==='object')item.resolve(message.result)
      else item.resolve({})
    } else if(message.id !== undefined) {
      // Never approve native file/tool/terminal/permission requests from a rewrite.
      this.send({id:message.id,error:{code:-32601,message:'Prism Revamp does not provide tools or file access.'}})
      this.fail(new Error('The subscription rewrite requested tools or permissions; no output was applied.'))
    } else {
      try {for(const listener of this.listeners)listener(message)}catch(error){this.fail(error instanceof Error?error:new Error('Unsupported native subscription event.'))}
    }
  }
  private send(value:RpcRecord) {if(!this.ended)this.child.stdin.write(JSON.stringify(this.jsonrpc?{jsonrpc:'2.0',...value}:value)+'\n')}
  notify(method:string,params?:RpcRecord) {this.send({method,...(params?{params}:{})})}
  request(method:string,params?:RpcRecord,timeoutMs=30_000):Promise<RpcRecord> {
    if(this.ended)return Promise.reject(new Error('The subscription client has closed.'))
    const id=++this.id
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.fail(new Error('The subscription client timed out. No fallback was attempted.')),timeoutMs);this.pending.set(id,{resolve,reject,timer});this.send({id,method,...(params?{params}:{})})})
  }
  subscribe(listener:(message:RpcRecord)=>void):()=>void {this.listeners.add(listener);return()=>this.listeners.delete(listener)}
  waitFor(predicate:(message:RpcRecord)=>boolean,timeoutMs=120_000):Promise<RpcRecord>{
    if(this.ended)return Promise.reject(new Error('The subscription client has closed.'))
    return new Promise((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);this.listeners.delete(listener);this.failures.delete(failure)}
      const failure=(error:Error)=>{cleanup();reject(error)}
      const listener=(message:RpcRecord)=>{if(predicate(message)){cleanup();resolve(message)}}
      const timer=setTimeout(()=>this.fail(new Error('Subscription completion timed out.')),timeoutMs)
      this.listeners.add(listener);this.failures.add(failure)
    })
  }
  fail(error:Error) {if(this.ended)return;this.ended=true;for(const item of this.pending.values()){clearTimeout(item.timer);item.reject(error)}this.pending.clear();for(const failure of [...this.failures])failure(error);this.failures.clear();this.listeners.clear();this.child.stdin.end();try{if(this.child.pid)process.kill(-this.child.pid,'SIGTERM');else this.child.kill()}catch{this.child.kill()}}
  close(){this.fail(new Error('Subscription operation finished.'))}
}

export async function subscriptionJob<T>(root:string,vendor:'codex'|'gemini',work:(cwd:string,client:{file:string;prefix:string[];env:NodeJS.ProcessEnv})=>Promise<T>):Promise<T>{
  await mkdir(root,{recursive:true,mode:0o700})
  const cwd=await mkdtemp(join(tmpdir(),`prism-${vendor}-rewrite-`))
  try{return await work(cwd,await subscriptionExecutable(vendor))}finally{await rm(cwd,{recursive:true,force:true})}
}
