import { describe, expect, it } from 'vitest'
import { higgsfieldMovieContainer, higgsfieldMovieMime, higgsfieldMovieFormat, higgsfieldMovieHeaderBytes } from './higgsfieldMovieContainer'
const header=(brand:string,box=24)=>{const bytes=Buffer.alloc(24);bytes.writeUInt32BE(box,0);bytes.write('ftyp',4);bytes.write(brand,8);bytes.write(brand,16);return bytes}
describe('Higgsfield actual movie byte/MIME contract',()=>{
 it.each(['isom','iso2','iso6','mp41','mp42','avc1','dash','M4V '])('recognizes video ISO brand%s without inventing encoding/geometry/FPS',brand=>expect(higgsfieldMovieContainer(header(brand),24)).toEqual({extension:'mp4',contentType:'video/mp4'}))
 it('recognizes modern QuickTime separately from MP4',()=>expect(higgsfieldMovieContainer(header('qt  '),24)).toEqual({extension:'mov',contentType:'video/quicktime'}))
 it.each(['M4A ','avif','heic','jpeg','xxxx'])('rejects nonvideo/unknown brand%s',brand=>expect(()=>higgsfieldMovieContainer(header(brand),24)).toThrow(/brand/))
 it('rejects MIME/container disagreement and impossible/incomplete box sizes',()=>{
  expect(()=>higgsfieldMovieContainer(header('qt  '),24,'video/mp4')).toThrow(/disagree/)
  expect(()=>higgsfieldMovieContainer(header('isom'),24,'video/quicktime')).toThrow(/disagree/)
  for(const size of [0,1,8,65537])expect(()=>higgsfieldMovieContainer(header('qt  ',size),24)).toThrow(/header/)
  expect(()=>higgsfieldMovieContainer(header('qt  ',32),24)).toThrow(/header/)
  expect(()=>higgsfieldMovieContainer(new Uint8Array(12),24)).toThrow(/container/)
 })
 it('normalizes known MIME, treats absent/generic MIME as unspecified and refuses unrelated types',()=>{
  expect(higgsfieldMovieMime('Video/QuickTime; codecs="avc1"')).toBe('video/quicktime')
  expect(higgsfieldMovieMime('video/mp4')).toBe('video/mp4')
  for(const value of [undefined,null,'application/octet-stream'])expect(higgsfieldMovieMime(value)).toBeUndefined()
  for(const value of ['image/png','text/html','video/webm',false])expect(()=>higgsfieldMovieMime(value)).toThrow()
  expect(higgsfieldMovieFormat('video/quicktime').extension).toBe('mov')
 })
})

it('checks compatible brands and truthful explicit MIME, rather than treating the major brand alone as proof',()=>{
 const bytes=header('isom');bytes.write('qt  ',16)
 expect(higgsfieldMovieContainer(bytes,24,'video/quicktime').extension).toBe('mov')
 expect(higgsfieldMovieContainer(bytes,24,'video/mp4').extension).toBe('mp4')
 const falseQuickTime=header('qt  ');falseQuickTime.write('xxxx',16)
 expect(()=>higgsfieldMovieContainer(falseQuickTime,24,'video/quicktime')).toThrow(/disagree/)
 expect(()=>higgsfieldMovieContainer(bytes.subarray(0,16),24)).toThrow(/incomplete/)
 expect(higgsfieldMovieHeaderBytes(bytes.subarray(0,8))).toBe(24)
 expect(()=>higgsfieldMovieHeaderBytes(header('qt  ',19))).toThrow(/header/)
})
