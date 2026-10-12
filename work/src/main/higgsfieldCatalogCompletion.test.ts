import {createHash} from 'node:crypto'
import {describe,expect,it,vi} from 'vitest'
import documents from './higgsfieldCatalogCompletion.documents.fixture.json'
import {HiggsfieldPublicCatalog} from './higgsfieldCatalogDiscovery'
import {higgsfieldInputSchema} from '../shared/higgsfieldNative'
import {describeHiggsfieldInputContract} from '../shared/higgsfieldInputContract'
const rows=Object.entries(documents)
describe('selected Higgsfield catalog completion through production discovery',()=>{
 it.each(rows)('reads %s from its explicitly published document without unrelated traversal',async(id,row)=>{
  expect(createHash('sha256').update(row.text).digest('hex')).toBe(row.documentSha256)
  const fetch=vi.fn(async(url:string,init:RequestInit)=>{
   expect(url).toBe(row.sourceUrl);expect(init.credentials).toBe('omit');expect(new Headers(init.headers).has('Authorization')).toBe(false)
   return new Response(row.text,{headers:{'content-type':'text/plain'}})
  })
  const catalog=new HiggsfieldPublicCatalog(fetch)
  const schema=await catalog.readContract(id,()=>{})
  expect(schema).toEqual(higgsfieldInputSchema(id))
  expect(describeHiggsfieldInputContract(id,schema,'a'.repeat(64)).unsupportedInputs).toEqual([])
  expect(fetch).toHaveBeenCalledOnce()
 })
})
