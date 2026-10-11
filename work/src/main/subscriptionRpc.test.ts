import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { nativeSubscriptionEnvironment, SubscriptionRpc } from './subscriptionRpc'

function fixture(){const child=Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:vi.fn()});return{child,rpc:new SubscriptionRpc(child as unknown as ChildProcessWithoutNullStreams,true)}}
describe('main-only native subscription process boundary',()=>{
  it('drops API, cloud, proxy, custom-loader, gateway and logging overrides from native subscription jobs',()=>{
    expect(nativeSubscriptionEnvironment({HOME:'/home/user',PATH:'/usr/bin',ANTHROPIC_API_KEY:'secret',OPENAI_API_KEY:'secret',CODEX_API_KEY:'secret',GEMINI_API_KEY:'secret',GOOGLE_GEMINI_BASE_URL:'https://wrong',NODE_OPTIONS:'--require malicious',CLAUDE_CODE_OAUTH_TOKEN:'secret',GEMINI_CLI_HOME:'/other',CODEX_HOME:'/other',HTTP_PROXY:'https://wrong'})).toEqual({HOME:'/home/user',PATH:'/usr/bin'})
  })
  it('accepts fragmented JSON-RPC responses without exposing vendor diagnostics',async()=>{
    const x=fixture(),pending=x.rpc.request('model/list');x.child.stderr.write('secret diagnostic');x.child.stdout.write('{"jsonrpc":"2.0","id":1,"res');x.child.stdout.write('ult":{"data":[]}}\n');expect(await pending).toEqual({data:[]});x.rpc.close()
  })
  it('rejects native tool/file/permission requests and discards partial completion',async()=>{
    const x=fixture(),complete=x.rpc.waitFor(message=>message.method==='done'),failed=expect(complete).rejects.toThrow('tools or permissions')
    x.child.stdout.write('{"id":9,"method":"fs/read_text_file","params":{"path":"private"}}\n');await failed;expect(x.child.kill).toHaveBeenCalled()
  })
  it('fails malformed or provider-error responses without copying secrets into app errors',async()=>{
    const x=fixture(),pending=x.rpc.request('session/new'),failed=expect(pending).rejects.toThrow('(-32000)')
    x.child.stdout.write('{"id":1,"error":{"code":-32000,"message":"secret"}}\n');await failed;x.rpc.close()
    const y=fixture(),malformed=y.rpc.request('account/read'),rejected=expect(malformed).rejects.toThrow('malformed');y.child.stdout.write('private malformed output\n');await rejected
  })
})
