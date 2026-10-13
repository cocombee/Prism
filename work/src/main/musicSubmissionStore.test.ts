import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MusicSubmissionStore, musicSubmissionRequiresRecovery, type MusicSubmissionScope } from './musicSubmissionStore'
import type { MusicRequest } from './elevenMusicContract'
const origin={canvasId:'original-canvas',pageId:'original-page'}
const request:MusicRequest={mode:'prompt',modelId:'music_v2_5',prompt:'  Preserve\r\nmy exact words  ',durationMs:3500,forceInstrumental:false}
async function fixture(work:(root:string,store:MusicSubmissionStore,scope:MusicSubmissionScope)=>Promise<void>){const root=await mkdtemp(join(tmpdir(),'prism-music-receipts-'));try{await work(root,new MusicSubmissionStore(root),{projectId:'project',nodeId:'music',rootPath:root,documentPath:join(root,'Project','Original.prismflow')})}finally{await rm(root,{recursive:true,force:true})}}
describe('Music durable submission no-replay owner',()=>{
 it('persists only bounded owner metadata and atomically rejects concurrent same-node reservations across store instances',()=>fixture(async(root,store,scope)=>{
  const second=new MusicSubmissionStore(root),results=await Promise.allSettled([store.reserve(scope,request,origin),second.reserve(scope,{...request,prompt:'different draft'},origin)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1)
  const records=await second.list('project');expect(records).toHaveLength(1);expect(records[0].state).toBe('reserved');const raw=await readFile(store.filename,'utf8');expect(raw).not.toContain(request.prompt);expect(raw).not.toContain('xi-api-key');expect(raw).not.toContain('composition_plan')
 }))
 it.each(['reserved','submitting','unknown','complete']as const)('blocks another paid submission after restart in %s even when draft/profile/root changes',state=>fixture(async(root,store,scope)=>{
  const record=await store.reserve(scope,request,origin);if(state!=='reserved')await store.submitting(scope,record.submissionId,'original-profile');if(state==='unknown')await store.unknown(scope,record.submissionId);if(state==='complete')await store.completed(scope,record.submissionId,{saveState:'not-indexed',requestId:'provider-id'})
  const restarted=new MusicSubmissionStore(root);expect(musicSubmissionRequiresRecovery((await restarted.list('project'))[0])).toBe(true)
  await expect(restarted.reserve({...scope,rootPath:join(root,'Elsewhere'),documentPath:join(root,'Elsewhere','Other.prismflow')},{...request,modelId:'music_v1',prompt:'Changed'},origin)).rejects.toThrow(/previous Music/)
  await expect(restarted.reserve(scope,request,origin)).rejects.toThrow(/previous Music/)
 }))
 it('preserves original identity and rejects stale/mismatched review plus malformed evidence',()=>fixture(async(_root,store,scope)=>{
  const record=await store.reserve(scope,request,origin);await store.submitting(scope,record.submissionId,'profile');await store.unknown(scope,record.submissionId)
  for(const wrong of[{...scope,projectId:'other'},{...scope,nodeId:'other'},{...scope,documentPath:join(scope.rootPath,'Other.prismflow')}])await expect(store.review(wrong,record.submissionId,'provider-history-reviewed')).rejects.toThrow(/belong/)
  await expect(store.review(scope,record.submissionId,true)).rejects.toThrow(/explicitly/);expect((await store.get(scope,record.submissionId)).state).toBe('unknown')
  await store.review(scope,record.submissionId,'provider-history-reviewed');expect((await store.reserve(scope,request,origin)).submissionId).not.toBe(record.submissionId)
 }))
 it('retains indexed output and completed state until local recovery explicitly finishes, with no replay transition',()=>fixture(async(_root,store,scope)=>{
  const record=await store.reserve(scope,request,origin),path=join(scope.rootPath,'Generated Assets','Audio','saved.mp3');await store.submitting(scope,record.submissionId,'profile');await store.completed(scope,record.submissionId,{saveState:'indexed-history-pending',retainedOutputPath:path,requestId:'provider'})
  await expect(store.submitting(scope,record.submissionId,'other-profile')).rejects.toThrow(/again/);await expect(store.rejected(scope,record.submissionId)).rejects.toThrow(/discarded/)
  expect(await store.get(scope,record.submissionId)).toMatchObject({state:'complete',retainedOutputPath:path,profileId:'profile',requestId:'provider'});await store.saved(scope,record.submissionId,path);expect(musicSubmissionRequiresRecovery(await store.get(scope,record.submissionId))).toBe(false);await store.reserve(scope,request,origin)
 }))
 it.each(['reserved','submitting']as const)('allows a definitively unsubmitted/rejected %s attempt to retire without releasing unknown completion',state=>fixture(async(_root,store,scope)=>{
  const record=await store.reserve(scope,request,origin);if(state==='submitting')await store.submitting(scope,record.submissionId,'profile');await store.rejected(scope,record.submissionId);expect((await store.get(scope,record.submissionId)).state).toBe('rejected');await store.reserve(scope,request,origin)
 }))
 it('fails closed on malformed/truncated/unknown-version receipt data and preserves bytes',()=>fixture(async(_root,store,scope)=>{
  await store.reserve(scope,request,origin)
  for(const raw of['{','{"schemaVersion":2,"records":[]}','{"schemaVersion":1,"records":[{}]}']){await writeFile(store.filename,raw);await expect(store.reserve(scope,request,origin)).rejects.toThrow(/No new paid request/);expect(await readFile(store.filename,'utf8')).toBe(raw)}
 }))
 it('fails closed on symlink journals and retains foreign content',()=>fixture(async(root,store,scope)=>{
  await store.reserve(scope,request,origin);await rm(store.filename);const foreign=join(root,'foreign.json');await writeFile(foreign,'foreign');await symlink(foreign,store.filename);await expect(store.reserve(scope,request,origin)).rejects.toThrow(/safely read/);expect(await readFile(foreign,'utf8')).toBe('foreign')
 }))
 it('rejects invalid request, scope and output paths without overwriting the prior owner',()=>fixture(async(_root,store,scope)=>{
  await expect(store.reserve(scope,{...request,durationMs:0},origin)).rejects.toThrow(/duration/);await expect(store.reserve({...scope,documentPath:'/outside.prismflow'},request,origin)).rejects.toThrow(/outside/)
  const record=await store.reserve(scope,request,origin);await store.submitting(scope,record.submissionId,'profile');await expect(store.completed(scope,record.submissionId,{saveState:'indexed-history-pending',retainedOutputPath:'/foreign.mp3'})).rejects.toThrow(/Invalid/);expect((await store.get(scope,record.submissionId)).state).toBe('submitting')
 }))
})
