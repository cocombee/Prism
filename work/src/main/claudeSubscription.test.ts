import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClaudeSubscriptionRuntime, type ClaudeSubscriptionDependencies, type ClaudeSubscriptionRewrite } from './claudeSubscription'

const model = 'claude-sonnet-4-6'
// Current vendor help hides --system-prompt-file, but documents the file form in --bare help.
const help = '--safe-mode --tools --disallowedTools --no-session-persistence --permission-mode --system-prompt --output-format'
const account = { loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', email: 'fake@example.invalid', orgId: 'fictional-org', subscriptionType: 'pro' }
const init = { type: 'system', subtype: 'init', model, apiKeySource: 'none', permissionMode: 'dontAsk', tools: [], mcp_servers: [] }
const result = { type: 'result', subtype: 'success', is_error: false, num_turns: 1, stop_reason: 'end_turn', result: '  Revised 中文 prompt.\r\n  ', modelUsage: { [model]: { inputTokens: 5 } }, permission_denials: [] }
const stream = (events: unknown[] = [init, { type: 'assistant', message: { model, content: [{ type: 'text', text: result.result }] } }, result]) => events.map(x => JSON.stringify(x)).join('\n') + '\n'
interface Reply { stdout?: string; stderr?: string; code?: number; hang?: boolean; chunks?: Buffer[] }
function setup(replies: Reply[] = [], version = '2.1.235') {
 const children: Array<EventEmitter & { stdin: PassThrough; stdout: PassThrough; stderr: PassThrough; input: string; kill: ReturnType<typeof vi.fn> }> = []
 const invoke = vi.fn((_file: string, args: string[]) => {
  const child = Object.assign(new EventEmitter(), { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), input: '', kill: vi.fn() })
  child.stdin.on('data', chunk => { child.input += chunk.toString() }); children.push(child)
  const reply = args[0] === '--version' ? { stdout: `${version} (Claude Code)\n` } : args[0] === '--help' ? { stdout: help } : replies.shift() ?? { stdout: JSON.stringify(account) }
  queueMicrotask(() => {
   if (reply.hang) return
   for (const chunk of reply.chunks ?? [Buffer.from(reply.stdout ?? '')]) child.stdout.write(chunk)
   if (reply.stderr) child.stderr.write(reply.stderr)
   child.stdout.end();child.stderr.end();child.emit('close', reply.code ?? 0)
  })
  return child
 })
 const remove = vi.fn(async()=>undefined), write = vi.fn(async()=>undefined), kill = vi.fn(child=>child.emit('close',null)), realpath = vi.fn(async()=>'/vendor/node_modules/@anthropic-ai/claude-code/bin/claude.exe')
 const deps: Partial<ClaudeSubscriptionDependencies> = { env: { HOME:'/fake/home',PATH:'/fake/bin:/usr/bin',LANG:'en_US.UTF-8',ANTHROPIC_API_KEY:'secret-api',ANTHROPIC_AUTH_TOKEN:'secret-auth',CLAUDE_CODE_OAUTH_TOKEN:'secret-oauth',ANTHROPIC_BASE_URL:'https://gateway.invalid',CLAUDE_CODE_USE_BEDROCK:'1',AWS_ACCESS_KEY_ID:'secret-aws',NODE_OPTIONS:'--require malicious.js',NODE_PATH:'/malicious',CLAUDE_CODE_DEBUG_LOGS_DIR:'/logs',OTEL_EXPORTER_OTLP_ENDPOINT:'https://logs.invalid',ELECTRON_RUN_AS_NODE:'1',CLAUDE_CONFIG_DIR:'/other-auth' }, executable:vi.fn(async()=>undefined),realpath,makeDirectory:vi.fn(async()=>'/isolated/job'),writePolicy:write,removeDirectory:remove,spawn:invoke,kill,temporaryRoot:'/temporary',home:'/fake/home',timeoutMs:50,loginTimeoutMs:50 }
 return { runtime:new ClaudeSubscriptionRuntime(deps),invoke,children,remove,write,kill,deps,realpath }
}
const rewrite = (extra:Partial<ClaudeSubscriptionRewrite>={}):ClaudeSubscriptionRewrite=>({text:'  原始 text\r\n$(`not a shell`)  ',instruction:'Exact shared instruction.\r\nDo not invent.',model,assertCurrent:vi.fn(),...extra})
afterEach(()=>vi.useRealTimers())

describe('native Claude subscription isolation and exact rewrite policy',()=>{
 it('rejects a pinned account mismatch before policy write or inference without exposing account values',async()=>{
  const expectedAccountId='a'.repeat(64),actualAccountId=createHash('sha256').update(JSON.stringify([account.email,account.orgId])).digest('hex'),x=setup([{stdout:JSON.stringify(account)}])
  const error=await x.runtime.rewrite(rewrite({expectedAccountId})).catch(error=>error as Error)
  expect(error).toBeInstanceOf(Error);expect((error as Error).message).toMatch(/pinned.*account changed.*no inference/i)
  expect((error as Error).message).not.toContain(expectedAccountId);expect((error as Error).message).not.toContain(actualAccountId);expect((error as Error).message).not.toContain(account.email);expect((error as Error).message).not.toContain(account.orgId)
  expect(x.write).not.toHaveBeenCalled();expect(x.invoke.mock.calls.map(([,args])=>args)).toEqual([['--version'],['--help'],['auth','status']]);expect(x.remove).toHaveBeenCalledOnce()
 })
 it('permits the captured matching account and keeps post-job account verification',async()=>{
  const expectedAccountId=createHash('sha256').update(JSON.stringify([account.email,account.orgId])).digest('hex'),x=setup([{stdout:JSON.stringify(account)},{stdout:stream()},{stdout:JSON.stringify(account)}])
  expect(await x.runtime.rewrite(rewrite({expectedAccountId}))).toBe(result.result);expect(x.write).toHaveBeenCalledOnce();expect(x.invoke.mock.calls.filter(([,args])=>args[0]==='auth'&&args[1]==='status')).toHaveLength(2)
 })
 it('captures the initial account pin rather than allowing it to be replaced during asynchronous work',async()=>{
  const actualAccountId=createHash('sha256').update(JSON.stringify([account.email,account.orgId])).digest('hex'),x=setup([{stdout:JSON.stringify(account)}]),request=rewrite({expectedAccountId:'a'.repeat(64)})
  request.assertCurrent=()=>{request.expectedAccountId=actualAccountId}
  await expect(x.runtime.rewrite(request)).rejects.toThrow(/pinned.*account changed/i);expect(x.write).not.toHaveBeenCalled();expect(x.invoke.mock.calls.some(([,args])=>args.includes('--print'))).toBe(false)
 })
 it.each(['','a'.repeat(63),'a'.repeat(65),'g'.repeat(64),'A'.repeat(64),null,123])('rejects invalid pinned hash %j before any process, policy file or directory',async expectedAccountId=>{
  const x=setup();await expect(x.runtime.rewrite(rewrite({expectedAccountId:expectedAccountId as string}))).rejects.toThrow(/pinned identity is invalid/i)
  expect(x.invoke).not.toHaveBeenCalled();expect(x.write).not.toHaveBeenCalled();expect(x.deps.makeDirectory).not.toHaveBeenCalled()
 })
 it.each([{selected:'claude-sonnet-5-5',minimum:284},{selected:'claude-opus-5-5',minimum:280},{selected:'claude-haiku-5-5',minimum:293},{selected:'claude-fable-5-1',minimum:257}])('blocks $selected on installed 2.1.235 and immediately below its official minimum, before auth/inference',async({selected,minimum})=>{
  for(const version of ['2.1.235',`2.1.${minimum-1}`]){
   const x=setup([],version)
   await expect(x.runtime.rewrite(rewrite({model:selected}))).rejects.toThrow(`requires Claude Code 2.1.${minimum} or later`)
   expect(x.invoke.mock.calls.map(([,args])=>args)).toEqual([['--version']]);expect(x.write).not.toHaveBeenCalled();expect(x.remove).toHaveBeenCalledOnce()
  }
 })
 it.each([{selected:'claude-sonnet-5-5',minimum:284},{selected:'claude-opus-5-5',minimum:280},{selected:'claude-haiku-5-5',minimum:293},{selected:'claude-fable-5-1',minimum:257}])('permits $selected version compatibility at and above its exact boundary, without inferring account entitlement',async({selected,minimum})=>{
  for(const patch of [minimum,minimum+1]){
   const x=setup([{stdout:JSON.stringify({loggedIn:false})}],`2.1.${patch}`)
   await expect(x.runtime.rewrite(rewrite({model:selected}))).rejects.toThrow(/sign in/i)
   expect(x.invoke.mock.calls.map(([,args])=>args)).toEqual([['--version'],['--help'],['auth','status']]);expect(x.invoke.mock.calls.some(([,args])=>args.includes('--print'))).toBe(false)
  }
 })
 it('cannot bypass a documented minimum with an explicit context-window suffix',async()=>{
  const x=setup();await expect(x.runtime.rewrite(rewrite({model:'claude-sonnet-5-5[1m]'}))).rejects.toThrow(/requires Claude Code 2.1.284/i)
  expect(x.invoke.mock.calls.map(([,args])=>args)).toEqual([['--version']])
 })
 it('passes original text only through stdin, original instruction only through disposable policy, and accepts exact successful output',async()=>{
  const x=setup([{stdout:JSON.stringify(account)},{stdout:stream()},{stdout:JSON.stringify(account)}]),request=rewrite(),before=JSON.stringify(request)
  expect(await x.runtime.rewrite(request)).toBe(result.result)
  expect(JSON.stringify(request)).toBe(before);expect(x.write).toHaveBeenCalledExactlyOnceWith('/isolated/job/rewrite-policy.txt',request.instruction)
  const call=x.invoke.mock.calls.find(([,args])=>args.includes('--print'))!
  expect(call[1]).toEqual(['--safe-mode','--print','--output-format','stream-json','--verbose','--model',model,'--tools','','--disallowedTools','mcp__*','--permission-mode','dontAsk','--no-session-persistence','--system-prompt-file','/isolated/job/rewrite-policy.txt','--max-turns','1'])
  expect(x.children[x.invoke.mock.calls.indexOf(call)].input).toBe(request.text)
  for(const [,args,options]of x.invoke.mock.calls as unknown as Array<[string,string[],{cwd:string;env:Record<string,string>;shell:boolean}]>){
   expect(args).not.toContain(request.text);expect(args).not.toContain(request.instruction);expect(args).not.toContain('--bare');expect(options).toMatchObject({cwd:'/isolated/job',shell:false})
   expect(options.env).toEqual({HOME:'/fake/home',PATH:'/fake/bin:/usr/bin',LANG:'en_US.UTF-8',CLAUDE_CODE_SAFE_MODE:'1',CLAUDE_CODE_SKIP_PROMPT_HISTORY:'1',DISABLE_TELEMETRY:'1',DISABLE_ERROR_REPORTING:'1'})
  }
  expect(x.remove).toHaveBeenCalledExactlyOnceWith('/isolated/job');expect(request.assertCurrent).toHaveBeenCalled()
 })
 it.each(['pro','max','team','enterprise'])('recognizes only verified native subscription plan %s',async subscriptionType=>{
  const x=setup([{stdout:JSON.stringify({...account,subscriptionType})}]);expect((await x.runtime.status()).connected).toBe(true)
 })
 it.each(['console','gateway','unknown'])('rejects conflicting administrator auth method %s before inference',async forcedLoginMethod=>{
  const x=setup([{stdout:JSON.stringify({...account,forcedLoginMethod})}]);await expect(x.runtime.rewrite(rewrite())).rejects.toThrow(/administrator.*policy/i)
  expect(x.invoke.mock.calls.some(([,args])=>args.includes('--print'))).toBe(false)
 })
 it('permits compatible administrator claudeai policy without changing that policy',async()=>{
  const x=setup([{stdout:JSON.stringify({...account,forcedLoginMethod:'claudeai'})}]);expect((await x.runtime.status()).connected).toBe(true)
 })
 it('does not echo malformed authentication output or diagnostic secrets in status errors',async()=>{
  const x=setup([{stdout:'private non-JSON credential output',stderr:'secret diagnostics',code:1}]),status=await x.runtime.status()
  expect(status.connected).toBe(false);expect(JSON.stringify(status)).not.toMatch(/private non-JSON|secret diagnostics/);expect(x.remove).toHaveBeenCalledOnce()
 })
 it('returns only a hashed native identity and plan label without copying native secrets or account metadata',async()=>{
  const x=setup([{stdout:JSON.stringify({...account,token:'never-return',orgName:'private-org'})}])
  expect(await x.runtime.status()).toEqual({connected:true,accountId:createHash('sha256').update(JSON.stringify([account.email,account.orgId])).digest('hex'),label:'Claude Pro'})
  expect(x.invoke.mock.calls.map(([,args])=>args)).toEqual([['--version'],['--help'],['auth','status']])
 })
 it.each(['api_key','api_key_helper','oauth_token','third_party','none'])('rejects native authMethod %s before inference',async authMethod=>{
  const x=setup([{stdout:JSON.stringify({...account,authMethod})}]);await expect(x.runtime.rewrite(rewrite())).rejects.toThrow(/not a verified native/i)
  expect(x.invoke.mock.calls.some(([,args])=>args.includes('--print'))).toBe(false);expect(x.remove).toHaveBeenCalledOnce()
 })
 it.each([{apiProvider:'bedrock'},{apiProvider:'gateway'},{apiKeySource:'apiKeyHelper'},{subscriptionType:null},{email:null},{orgId:null},{loggedIn:false}])('rejects unverifiable subscription status %j before inference',async patch=>{
  const x=setup([{stdout:JSON.stringify({...account,...patch})}]);await expect(x.runtime.rewrite(rewrite())).rejects.toThrow()
  expect(x.invoke.mock.calls.some(([,args])=>args.includes('--print'))).toBe(false)
 })
 it('uses original CLI browser login and returns only verified status, never login URLs/tokens',async()=>{
  const x=setup([{stdout:'secret authorization URL and tokens'},{stdout:JSON.stringify(account)}]),status=await x.runtime.login()
  expect(status.connected).toBe(true);expect(JSON.stringify(status)).not.toContain('secret');expect(x.invoke.mock.calls.map(([,args])=>args)).toEqual([['--version'],['--help'],['auth','login','--claudeai'],['auth','status']])
 })
 it('surfaces managed login-policy failure locally without stderr, tokens, retry or alternate auth',async()=>{
  const x=setup([{stdout:'authorization secret',stderr:'private secret policy details',code:1}]),status=await x.runtime.login()
  expect(status).toMatchObject({connected:false,error:expect.stringMatching(/administrator policy/i)});expect(JSON.stringify(status)).not.toMatch(/private secret|authorization secret/)
  expect(x.invoke.mock.calls.map(([,args])=>args).at(-1)).toEqual(['auth','login','--claudeai']);expect(x.remove).toHaveBeenCalledOnce()
 })
 it.each(['sonnet','default','opusplan','--model malicious','claude-sonnet-4-6\n--bare','claude-sonnet;curl',''])('rejects invalid or alias model %j before creating or spawning work',async selected=>{
  const x=setup();await expect(x.runtime.rewrite(rewrite({model:selected}))).rejects.toThrow(/exact Claude model/i);expect(x.invoke).not.toHaveBeenCalled();expect(x.deps.makeDirectory).not.toHaveBeenCalled()
 })
 it('rejects account switching after a complete successful result and discards the output',async()=>{
  const x=setup([{stdout:JSON.stringify(account)},{stdout:stream()},{stdout:JSON.stringify({...account,email:'changed@example.invalid'})}])
  await expect(x.runtime.rewrite(rewrite())).rejects.toThrow(/account changed/i);expect(x.remove).toHaveBeenCalledOnce()
 })
 it.each([
  [ {...init,model:'claude-haiku-4-5'},result ], [ {...init,apiKeySource:'ANTHROPIC_API_KEY'},result ], [ {...init,tools:['Bash']},result ], [ {...init,mcp_servers:[{name:'tool'}]},result ],
  [ {...init,permissionMode:'bypassPermissions'},result ], [init,{...result,subtype:'error_max_turns'}], [init,{...result,is_error:true}], [init,{...result,permission_denials:[{tool:'Bash'}]}],
  [init,{...result,modelUsage:{'claude-haiku-4-5':{}}}], [init,{...result,result:''}], [init,{type:'assistant',message:{model,content:[{type:'tool_use',name:'Bash'}]}},result],
  [init,{type:'assistant',message:{model:'other-model',content:[{type:'text',text:'response'}]}},result], [result], [init,result,result], [init,{...result,modelUsage:{}}], [init,{type:'unsupported'}], [init,{...result,stop_reason:'max_tokens'}], [init,{...result,num_turns:2}],
 ].map(events=>({events})))('rejects unsupported/error/fallback stream %# without accepting partial output',async ({events})=>{
  const x=setup([{stdout:JSON.stringify(account)},{stdout:stream(events)}]);await expect(x.runtime.rewrite(rewrite())).rejects.toThrow(/Claude Code/i)
  expect(x.kill).toHaveBeenCalledOnce();expect(x.remove).toHaveBeenCalledOnce()
 })
 it('rejects malformed NDJSON and nonzero exit even with apparent successful output; does not leak stderr',async()=>{
  for(const reply of [{stdout:'not JSON\n'},{stdout:stream(),code:1,stderr:'secret prompt contents'}]){
   const x=setup([{stdout:JSON.stringify(account)},reply]);await expect(x.runtime.rewrite(rewrite())).rejects.toThrow(/Claude Code/i);expect(x.remove).toHaveBeenCalledOnce()
  }
 })
 it('decodes split multibyte output correctly and returns CRLF/whitespace unchanged',async()=>{
  const bytes=Buffer.from(stream()),offset=bytes.indexOf(Buffer.from('中'))+1,x=setup([{stdout:JSON.stringify(account)},{chunks:[bytes.subarray(0,offset),bytes.subarray(offset)]},{stdout:JSON.stringify(account)}])
  expect(await x.runtime.rewrite(rewrite())).toBe(result.result)
 })
 it('rejects request-owner change at stream boundary, kills the child and does not read post-job status',async()=>{
  const x=setup([{stdout:JSON.stringify(account)},{stdout:stream()}]),guard=vi.fn(()=>{if(x.invoke.mock.calls.some(([,args])=>args.includes('--print')))throw new Error('Owner changed')})
  await expect(x.runtime.rewrite(rewrite({assertCurrent:guard}))).rejects.toThrow('Owner changed');expect(x.kill).toHaveBeenCalledOnce();expect(x.invoke.mock.calls.filter(([,args])=>args[0]==='auth')).toHaveLength(1)
 })
 it('bounds stdout and stderr, including discarded diagnostics',async()=>{
  for(const reply of [{stdout:'x'.repeat(513*1024)},{stderr:'secret'.repeat(6000)}]){
   const x=setup([{stdout:JSON.stringify(account)},reply]);await expect(x.runtime.rewrite(rewrite())).rejects.toThrow(/bounded|limit/i);expect(x.kill).toHaveBeenCalledOnce();expect(x.remove).toHaveBeenCalledOnce()
  }
 })
 it('cancels a running child, cleans disposable context and permits a later retry',async()=>{
  const x=setup([{stdout:JSON.stringify(account)},{hang:true}]),abort=new AbortController(),pending=x.runtime.rewrite(rewrite({signal:abort.signal}))
  await vi.waitFor(()=>expect(x.invoke.mock.calls.some(([,args])=>args.includes('--print'))).toBe(true))
  abort.abort();await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(x.kill).toHaveBeenCalledOnce();expect(x.remove).toHaveBeenCalledOnce()
  expect((await x.runtime.status()).connected).toBe(true)
 })
 it('rejects pre-cancelled requests without any process or temporary directory',async()=>{
  const x=setup(),abort=new AbortController();abort.abort();await expect(x.runtime.rewrite(rewrite({signal:abort.signal}))).rejects.toMatchObject({name:'AbortError'});expect(x.invoke).not.toHaveBeenCalled();expect(x.deps.makeDirectory).not.toHaveBeenCalled()
 })
 it('times out a stuck inference and kills its process without model/API fallback',async()=>{
  vi.useFakeTimers();const x=setup([{stdout:JSON.stringify(account)},{hang:true}]),pending=x.runtime.rewrite(rewrite()),failure=expect(pending).rejects.toThrow(/timed out.*fallback/i)
  await vi.advanceTimersByTimeAsync(51);await failure;expect(x.kill).toHaveBeenCalledOnce();expect(x.remove).toHaveBeenCalledOnce()
 })
 it('checks owner again after disposable cleanup before returning successful output',async()=>{
  const x=setup([{stdout:JSON.stringify(account)},{stdout:stream()},{stdout:JSON.stringify(account)}]),guard=vi.fn(()=>{if(x.remove.mock.calls.length)throw new Error('Owner changed during cleanup')})
  await expect(x.runtime.rewrite(rewrite({assertCurrent:guard}))).rejects.toThrow('Owner changed during cleanup');expect(x.remove).toHaveBeenCalledOnce()
 })
 it('refuses simultaneous login while rewrite is active',async()=>{
  const x=setup([{stdout:JSON.stringify(account)},{hang:true}]),abort=new AbortController(),pending=x.runtime.rewrite(rewrite({signal:abort.signal})),failure=expect(pending).rejects.toThrow(/cancelled/i)
  await vi.waitFor(()=>expect(x.invoke.mock.calls.some(([,args])=>args.includes('--print'))).toBe(true))
  expect(await x.runtime.login()).toMatchObject({connected:false,error:expect.stringMatching(/current.*operation/i)})
  abort.abort();await failure;expect(x.invoke.mock.calls.some(([,args])=>args[1]==='login')).toBe(false)
 })
 it('does not execute an arbitrary PATH wrapper; reports unsupported local installation',async()=>{
  const x=setup();x.realpath.mockResolvedValue('/untrusted/claude-wrapper.sh');expect((await x.runtime.status()).connected).toBe(false);expect(x.invoke).not.toHaveBeenCalled();expect(x.remove).toHaveBeenCalledOnce()
 })
 it('fails closed for old version or missing isolation flags before account status',async()=>{
  for(const reply of ['2.1.234 (Claude Code)\n','not an official CLI']){
   const x=setup();x.invoke.mockImplementationOnce(()=>{const child=Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:vi.fn(),input:''});queueMicrotask(()=>{child.stdout.write(reply);child.emit('close',0)});return child})
   expect((await x.runtime.status()).connected).toBe(false);expect(x.invoke).toHaveBeenCalledOnce();expect(x.remove).toHaveBeenCalledOnce()
  }
  const x=setup();x.invoke.mockImplementationOnce(()=>{const child=Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:vi.fn(),input:''});queueMicrotask(()=>{child.stdout.write('2.1.235 (Claude Code)\n');child.emit('close',0)});return child}).mockImplementationOnce(()=>{const child=Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:vi.fn(),input:''});queueMicrotask(()=>{child.stdout.write('--tools');child.emit('close',0)});return child})
  expect((await x.runtime.status()).connected).toBe(false);expect(x.invoke).toHaveBeenCalledTimes(2)
 })
})
