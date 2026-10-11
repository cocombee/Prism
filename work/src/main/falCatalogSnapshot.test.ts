import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { falCatalogSnapshot, readFalCatalogSnapshot, writeFalCatalogSnapshot } from './falCatalogSnapshot'
const now = Date.parse('2026-10-11T12:00:00Z')
const model = {id:'fixture/video',label:'Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Fixture',release:'Video 2',mode:'Text to Video'}}
const snapshot = {version:1,checkedAt:'2026-10-10T00:00:00Z',models:[model]}
describe('complete public fal display snapshots',()=>{
 it('keeps advertised routes but never claims live verification, schemas or account readiness',()=>{
  const result=falCatalogSnapshot({...snapshot,credential:'never-retained',models:[{...model,secret:'never-retained',schema:{},catalog:{...model.catalog,secret:'never-retained'}}]},now)!
  expect(result).toMatchObject({provider:'fal',verified:false,catalogStale:true,catalogComplete:true,models:[model]})
  expect(JSON.stringify(result)).not.toContain('never-retained')
 })
 it('rejects old/future/incomplete/malformed metadata and preserves verified empty snapshots',()=>{
  expect(falCatalogSnapshot({...snapshot,checkedAt:'2026-09-01'},now)).toBeUndefined()
  expect(falCatalogSnapshot({...snapshot,checkedAt:'2026-10-12'},now)).toBeUndefined()
  expect(falCatalogSnapshot({...snapshot,version:2},now)).toBeUndefined()
  expect(falCatalogSnapshot({...snapshot,models:[model,model]},now)).toBeUndefined()
  expect(falCatalogSnapshot({...snapshot,models:[{...model,id:'../escape'}]},now)).toBeUndefined()
  expect(falCatalogSnapshot({...snapshot,models:[]},now)?.models).toEqual([])
 })
 it('writes only complete live catalogs atomically and recovers corrupt optional cache with the bounded public fallback',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'prism-fal-display-')),path=join(dir,'catalog.json')
  try{
   await writeFalCatalogSnapshot(path,{provider:'fal',verified:true,models:[model],catalogCheckedAt:new Date().toISOString()})
   expect((await readFalCatalogSnapshot(path))?.models).toEqual([model])
   const original=await readFile(path,'utf8')
   await writeFalCatalogSnapshot(path,{provider:'fal',verified:true,catalogStale:true,models:[]})
   expect(await readFile(path,'utf8')).toBe(original)
   await writeFile(path,'bad JSON')
   expect((await readFalCatalogSnapshot(path,now))?.models.length).toBeGreaterThan(1000)
   await writeFalCatalogSnapshot(path,{provider:'fal',verified:true,models:[]})
   expect((await readFalCatalogSnapshot(path))?.models).toEqual([])
  }finally{await rm(dir,{recursive:true,force:true})}
 })
})
