import {describe,it,expect} from 'vitest'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import {probeManagedMp4} from './managedVideoProbe'
import {inspectHiggsfieldImage} from './higgsfieldImageInspection'
describe('real managed Genjutsu media preparation',()=>{
 it('reads actual MP4 header duration/dimensions with the existing local utility and creates no output during probing',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'prism-higgs-media-'))
  try{
   const video=join(directory,'Fixture.mp4');execFileSync(ffmpegPath!,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=black:s=800x600:r=1:d=4','-c:v','mpeg4',video],{timeout:10_000})
   expect(await probeManagedMp4(video)).toEqual({duration:4,width:800,height:600})
   const controller=new AbortController();controller.abort();await expect(probeManagedMp4(video,controller.signal)).rejects.toThrow()
   const invalid=join(directory,'Invalid.mp4');writeFileSync(invalid,'fictional invalid video');await expect(probeManagedMp4(invalid)).rejects.toThrow(/Could not inspect/)
  }finally{rmSync(directory,{recursive:true,force:true})}
 })
 it('checks actual image format without rewriting bytes and rejects disguised/undecodable references',async()=>{
  const bytes=await sharp({create:{width:2,height:2,channels:3,background:'#101010'}}).png().toBuffer(),before=Buffer.from(bytes)
  await expect(inspectHiggsfieldImage(bytes,'image/png')).resolves.toBeUndefined();expect(bytes.equals(before)).toBe(true)
  await expect(inspectHiggsfieldImage(bytes,'image/jpeg')).rejects.toThrow(/match their managed file format/)
  await expect(inspectHiggsfieldImage(new Uint8Array([1,2,3]),'image/png')).rejects.toThrow(/decodable/)
 })
})
