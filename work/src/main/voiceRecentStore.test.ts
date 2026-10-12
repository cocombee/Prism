import {describe,it,expect} from 'vitest'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {VoiceRecentStore} from './voiceRecentStore'
describe('durable account/project-owned voice selections',()=>{
 it('survives reopening, isolates projects/accounts and serializes concurrent selections',async()=>{
  const root=await mkdtemp(join(tmpdir(),'prism-voice-recent-'))
  try {const store=new VoiceRecentStore(root),path=store.path('project-one','elevenlabs','fictional-one');expect(path).not.toContain('fictional')
   await Promise.all([store.remember(path,{id:'one',label:'One'},()=>{}),store.remember(path,{id:'two',label:'Two'},()=>{})])
   const reopened=new VoiceRecentStore(root);expect((await reopened.read(path)).map(v=>v.id)).toEqual(['two','one']);expect(await reopened.read(store.path('project-two','elevenlabs','fictional-one'))).toEqual([]);expect(await reopened.read(store.path('project-one','elevenlabs','fictional-two'))).toEqual([])
   await expect(store.remember(path,{id:'three',label:'Three'},()=>{throw new DOMException('Changed','AbortError')})).rejects.toMatchObject({name:'AbortError'});expect((await reopened.read(path)).map(v=>v.id)).toEqual(['two','one'])
  }finally{await rm(root,{recursive:true,force:true})}
 })
})
