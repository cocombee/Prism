import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, stat, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PromptBillingStore } from './promptBillingStore'

const directories: string[] = [], account = 'a'.repeat(64)
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, {recursive:true,force:true}))) })
async function fixture() { const dir = await mkdtemp(join(tmpdir(),'prism-billing-qa-')); directories.push(dir); return {dir, store:new PromptBillingStore(dir)} }
describe('durable prompt billing ownership', () => {
  it('starts in API mode without touching legacy keys or making a settings file', async () => {
    const {dir,store}=await fixture();await writeFile(join(dir,'openai-credential.enc'),'fictional encrypted bytes')
    expect((await store.read('openai','account-1')).choice).toEqual({mode:'api'})
    expect(await readFile(join(dir,'openai-credential.enc'),'utf8')).toBe('fictional encrypted bytes')
    expect(await readdir(dir)).toEqual(['openai-credential.enc'])
  })
  it('retains the bound account across process reconstruction without credentials', async () => {
    const {dir,store}=await fixture();await store.set('anthropic',undefined,'subscription',account)
    const before=await store.read('anthropic'), reopened=await new PromptBillingStore(dir).read('anthropic')
    expect(reopened).toEqual(before);expect(reopened.choice.accountId).toBe(account)
    expect((await stat(join(dir,'prompt-connections.json'))).mode & 0o777).toBe(0o600)
    expect(await readdir(dir)).toEqual(['prompt-connections.json'])
  })
  it('retains explicit profile choices while new/migrated profiles inherit the provider billing choice', async () => {
    const {store}=await fixture();await store.set('anthropic','other-profile','api');await store.set('anthropic','project-profile','subscription',account)
    expect((await store.read('anthropic','project-profile')).choice.mode).toBe('subscription')
    expect((await store.read('anthropic','other-profile')).choice.mode).toBe('api')
    expect((await store.read('anthropic')).choice.mode).toBe('subscription')
    expect((await store.read('anthropic','migrated-profile')).choice.mode).toBe('subscription')
    expect((await store.read('openai','project-profile')).choice.mode).toBe('api')
  })
  it('serializes concurrent profile changes without losing either account', async () => {
    const {store}=await fixture();await Promise.all([store.set('anthropic','first','subscription',account),store.set('anthropic','second','subscription','b'.repeat(64))])
    expect((await store.read('anthropic','first')).choice.accountId).toBe(account)
    expect((await store.read('anthropic','second')).choice.accountId).toBe('b'.repeat(64))
  })
  it('keeps the previous choice if its owner becomes stale before atomic commit', async () => {
    const {dir,store}=await fixture();await store.set('anthropic','first','subscription',account)
    const before=await readFile(join(dir,'prompt-connections.json'),'utf8');let checks=0
    await expect(store.set('anthropic','first','api',undefined,()=>{if(++checks===2)throw Error('stale project')})).rejects.toThrow('stale project')
    expect(await readFile(join(dir,'prompt-connections.json'),'utf8')).toBe(before)
    expect(await readdir(dir)).toEqual(['prompt-connections.json'])
    await store.set('anthropic','first','api');expect((await store.read('anthropic','first')).choice.accountId).toBeUndefined()
  })
  it.each(['broken',JSON.stringify({schemaVersion:2,choices:{}}),JSON.stringify({schemaVersion:1,choices:[]}),JSON.stringify({schemaVersion:1,choices:{'["anthropic",null]':{mode:'subscription',accountId:'not-an-account'}}}),JSON.stringify({schemaVersion:1,choices:{'["deepseek",null]':{mode:'subscription',accountId:account}}})])('blocks corrupt/unsupported settings instead of silently billing API', async raw => {
    const {dir,store}=await fixture();await writeFile(join(dir,'prompt-connections.json'),raw)
    await expect(store.read('anthropic')).rejects.toThrow();await expect(store.set('anthropic',undefined,'api')).rejects.toThrow()
    expect(await readFile(join(dir,'prompt-connections.json'),'utf8')).toBe(raw)
  })
  it('rejects oversized settings and invalid account scopes', async () => {
    const {dir,store}=await fixture();await writeFile(join(dir,'prompt-connections.json'),' '.repeat(128*1024+1))
    await expect(store.read('anthropic')).rejects.toThrow('limit')
    await expect(store.read('anthropic','')).rejects.toThrow('scope')
  })
})
