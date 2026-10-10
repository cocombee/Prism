import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import { inspectHiggsfieldWav } from './higgsfieldAudioInspection'
import { prepareHiggsfieldSeedanceMedia, materializePreparedHiggsfieldSeedance } from './higgsfieldSeedancePreparation'
import { HIGGSFIELD_SEEDANCE_INPUT_REVISION } from '../shared/higgsfieldSeedanceInput'

function fixture(codec = 'pcm_s16le') {
  const folder=mkdtempSync(join(tmpdir(),'prism-wav-inspect-')),path=join(folder,'Fixture.wav')
  try {
    execFileSync(ffmpegPath!,['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=24000:cl=mono','-t','0.1','-c:a',codec,path],{timeout:10_000,maxBuffer:1024*1024})
    return readFileSync(path)
  } finally {rmSync(folder,{recursive:true,force:true})}
}
describe('actual Higgsfield WAV content inspection',()=>{
  it.each(['audio/wav','audio/x-wav'])('validates a real WAV with %s without changing its bytes',async type=>{
    const bytes=fixture(),before=Buffer.from(bytes)
    await expect(inspectHiggsfieldWav(bytes,type)).resolves.toBeUndefined()
    expect(bytes.equals(before)).toBe(true)
  })
  it('does not impose invented PCM bit-depth or sample-rate requirements',async()=>{
    await expect(inspectHiggsfieldWav(fixture('pcm_f32le'),'audio/wav')).resolves.toBeUndefined()
  })
  it('rejects mislabeled audio, malformed WAV chunks, missing audio and cancellation',async()=>{
    const bytes=fixture()
    await expect(inspectHiggsfieldWav(bytes,'audio/mpeg')).rejects.toThrow(/WAV/)
    await expect(inspectHiggsfieldWav(Buffer.from('disguised MP3'),'audio/wav')).rejects.toThrow(/WAV/)
    await expect(inspectHiggsfieldWav(bytes.subarray(0,40),'audio/wav')).rejects.toThrow(/decodable/)
    const controller=new AbortController();controller.abort(Error('Canceled'))
    await expect(inspectHiggsfieldWav(bytes,'audio/wav',controller.signal)).rejects.toThrow(/Canceled/)
  })
  it('prepares and materializes actual local audio through the multimodal input owner',async()=>{
    const bytes=fixture(),source={path:'/fixture/Audio.wav',mediaType:'audio' as const}
    const prepared=await prepareHiggsfieldSeedanceMedia({endpointId:'bytedance/seedance-2.5/reference-to-video',inputRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,values:{prompt:'Keep the authored action synchronized with the connected audio.'},media:{audio_urls:[source,source]}},{
      assertCurrent:()=>{},inspect:async source=>({source,byteLength:bytes.length,contentType:'audio/wav'}),read:async()=>bytes,
      validate:async media=>inspectHiggsfieldWav(media.bytes!,media.contentType!),
    })
    expect(prepared.media[0]).toBe(prepared.media[1])
    expect(materializePreparedHiggsfieldSeedance(prepared,['https://cdn.prism.example/audio.wav','https://cdn.prism.example/audio.wav']).audio_urls).toEqual(['https://cdn.prism.example/audio.wav','https://cdn.prism.example/audio.wav'])
    expect(bytes.equals(prepared.media[0].bytes!)).toBe(true)
  })
})
