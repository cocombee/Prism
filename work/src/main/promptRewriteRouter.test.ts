import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PromptBillingStore } from './promptBillingStore'
import { PromptRewriteRouter, type PromptRequestOwner } from './promptRewriteRouter'
import type { SubscriptionProvider } from '../shared/promptConnection'

const roots:string[]=[],account='a'.repeat(64)
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})))})
async function fixture(provider:SubscriptionProvider){
  const root=await mkdtemp(join(tmpdir(),'prism-subscription-router-'));roots.push(root)
  const store=new PromptBillingStore(root),runtime={status:vi.fn(async()=>({connected:true,accountId:account,label:'Subscription'})),login:vi.fn(async()=>({connected:true,accountId:account})),models:vi.fn(async()=>({provider,verified:false,models:[{id:'exact-model',label:'Exact model'}]})),rewrite:vi.fn(async()=> 'Rewritten @hero, unchanged duration.')}
  const router=new PromptRewriteRouter({store,subscriptions:{[provider]:runtime}}),owner:PromptRequestOwner={provider,apiReady:true,projectScope:'project-1',apiProfileId:'api-profile-1',assertCurrent:()=>{}}
  const api=vi.fn(async()=> 'API result')
  await router.configure(owner,'subscription');return{router,store,runtime,owner,api}
}
describe.each(['openai','anthropic','google'] as const)('explicit %s subscription ownership',provider=>{
  it('uses the selected native runtime, complete shared prompt policy and one exact request without API fallback',async()=>{
    const x=await fixture(provider),view=await x.router.view(x.owner)
    const result=await x.router.rewrite(x.owner,'Owned @hero, 5 seconds.','Preserve locks.','exact-model',{requestId:'request-0000000001',connectionLease:view.lease},x.api)
    expect(result).toContain('@hero');expect(x.api).not.toHaveBeenCalled();expect(x.runtime.rewrite).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({text:'Original prompt:\nOwned @hero, 5 seconds.',instruction:expect.stringContaining('Preserve locks.'),model:'exact-model',expectedAccountId:account}))
  })
  it('retains failed subscription billing across reopen and never retries through an available API account',async()=>{
    const x=await fixture(provider),view=await x.router.view(x.owner);x.runtime.rewrite.mockRejectedValueOnce(new Error('subscription quota'))
    await expect(x.router.rewrite(x.owner,'text','policy','exact-model',{requestId:'request-0000000002',connectionLease:view.lease},x.api)).rejects.toThrow('quota')
    expect((await x.store.read(provider,'api-profile-1')).choice.mode).toBe('subscription');expect(x.api).not.toHaveBeenCalled()
  })
  it('keeps a disconnected selected subscription pending rather than silently restoring API mode',async()=>{
    const x=await fixture(provider);x.runtime.status.mockResolvedValueOnce({connected:false,accountId:undefined as any,label:'Disconnected'})
    const view=await x.router.configure(x.owner,'subscription');expect(view).toMatchObject({mode:'subscription',ready:false})
    await expect(x.router.rewrite(x.owner,'text','policy','exact-model',{requestId:'request-0000000003',connectionLease:view.lease},x.api)).rejects.toThrow('Connect your subscription');expect(x.api).not.toHaveBeenCalled()
  })
  it('rejects changed native accounts before inference and rejects old leases after a billing change',async()=>{
    const x=await fixture(provider),view=await x.router.view(x.owner);x.runtime.status.mockResolvedValueOnce({connected:true,accountId:'b'.repeat(64),label:'changed'})
    await expect(x.router.rewrite(x.owner,'text','policy','exact-model',{requestId:'request-0000000004',connectionLease:view.lease},x.api)).rejects.toThrow('account changed')
    expect(x.runtime.rewrite).not.toHaveBeenCalled();await x.router.configure(x.owner,'api')
    await expect(x.router.rewrite(x.owner,'text','policy','exact-model',{requestId:'request-0000000005',connectionLease:view.lease},x.api)).rejects.toMatchObject({name:'AbortError'});expect(x.api).not.toHaveBeenCalled()
  })
  it('cancels a running native request when billing changes, discarding its late response',async()=>{
    const x=await fixture(provider),view=await x.router.view(x.owner);let resolve!:(value:string)=>void
    x.runtime.rewrite.mockImplementationOnce(()=>new Promise<string>(done=>{resolve=done}))
    const pending=x.router.rewrite(x.owner,'text','policy','exact-model',{requestId:'request-0000000006',connectionLease:view.lease},x.api),failed=expect(pending).rejects.toMatchObject({name:'AbortError'})
    await vi.waitFor(()=>expect(x.runtime.rewrite).toHaveBeenCalled());await x.router.configure(x.owner,'api');resolve('late result');await failed;expect(x.api).not.toHaveBeenCalled()
  })
})
