import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { assertFalMediaFileLimit } from './falMediaFileLimit'
describe('managed native media file limits',()=>{
 it('accepts the exact boundary, rejects larger/non-file inputs, and needs no read when no limit is declared',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'prism-file-limit-'));const path=join(directory,'audio.wav')
  try{await writeFile(path,Buffer.alloc(20));await expect(assertFalMediaFileLimit(path,20)).resolves.toBeUndefined();await expect(assertFalMediaFileLimit(path,19)).rejects.toThrow('exceeds');await expect(assertFalMediaFileLimit(directory,20)).rejects.toThrow('not a file');await expect(assertFalMediaFileLimit('/missing',undefined)).resolves.toBeUndefined()}finally{await rm(directory,{recursive:true,force:true})}
 })
 it('blocks unverifiable remote media and malformed limits without probing outside paths',async()=>{
  await expect(assertFalMediaFileLimit(undefined,60_000_000)).rejects.toThrow('Import this remote input locally')
  for(const limit of [0,-1,Infinity,0.5])await expect(assertFalMediaFileLimit('/missing',limit)).rejects.toThrow('Invalid model')
 })
})
