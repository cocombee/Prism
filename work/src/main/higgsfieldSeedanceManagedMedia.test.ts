import {describe,it,expect,vi} from 'vitest'
import {mkdtemp,writeFile,rm,symlink,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import {higgsfieldSeedanceManagedMedia} from './higgsfieldSeedanceManagedMedia'
import {prepareHiggsfieldSeedanceMedia} from './higgsfieldSeedancePreparation'
import {HIGGSFIELD_SEEDANCE_INPUT_REVISION} from '../shared/higgsfieldSeedanceInput'

describe('actual managed Seedance multimodal preparation',()=>{
  it('retains original source naming when main resolves its authorized path alias and rejects cloned buffers or forged metadata',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-seed-owned-'))
    try{
      const audio=join(directory,'Speech.mp3'),alias='/fictional/managed-alias/Speech.mp3'
      execFileSync(ffmpegPath!,['-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=24000:duration=0.1','-c:a','libmp3lame',audio],{timeout:10_000})
      const deps=higgsfieldSeedanceManagedMedia({assertCurrent:()=>{},assertManagedPath:async path=>path===alias?audio:path,mimeFor:()=> 'audio/mpeg'})
      const inspection=await deps.inspect({path:alias,mediaType:'audio'}),bytes=await deps.read(inspection)
      await expect(deps.read({...inspection,source:{path:'/fictional/foreign.mp3',mediaType:'audio'}})).rejects.toThrow(/managed owner/)
      await expect(deps.read({...inspection,contentType:'audio/wav'})).rejects.toThrow(/managed owner/)
      const original={source:inspection.source,bytes,contentType:'audio/mpeg'}
      await expect(deps.prepareAudio!({...original,bytes:Buffer.from(bytes)},64*1024*1024)).rejects.toThrow(/main-owned/)
      const derivative=await deps.prepareAudio!(original,64*1024*1024)
      await expect(deps.validate({source:inspection.source,...derivative})).resolves.toBeUndefined()
      await expect(deps.validate({source:{path:'/fictional/foreign.mp3',mediaType:'audio'},...derivative})).rejects.toThrow(/main-owned/)
      await expect(deps.validate({source:inspection.source,...derivative,bytes:Buffer.from(derivative.bytes)})).rejects.toThrow(/main-owned/)
      expect(inspection.source.path).toBe(alias)
    }finally{await rm(directory,{recursive:true,force:true})}
  })
  it('refuses source replacement or a symlink introduced while audio conversion is running',async()=>{
    for(const symlinkInstead of [false,true]){
      const directory=await mkdtemp(join(tmpdir(),'prism-seed-race-'))
      try{
        const audio=join(directory,'Speech.mp3'),backup=join(directory,'Retained.mp3')
        execFileSync(ffmpegPath!,['-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=24000:duration=0.1','-c:a','libmp3lame',audio],{timeout:10_000})
        const original=await readFile(audio);await writeFile(backup,original)
        let checks=0
        const deps=higgsfieldSeedanceManagedMedia({assertCurrent:()=>{},mimeFor:()=> 'audio/mpeg',assertManagedPath:async path=>{
          checks++
          if(checks===4){if(symlinkInstead){await rm(audio);await symlink(backup,audio)}else await writeFile(audio,'changed during conversion')}
          return path
        }})
        const inspection=await deps.inspect({path:audio,mediaType:'audio'}),bytes=await deps.read(inspection)
        await expect(deps.prepareAudio!({source:inspection.source,bytes,contentType:'audio/mpeg'},64*1024*1024)).rejects.toThrow()
        expect(await readFile(backup)).toEqual(original)
      }finally{await rm(directory,{recursive:true,force:true})}
    }
  })
  it('prepares generated MP3 as real WAV, reuses repeated assignments and retains original file bytes',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-seed-mp3-'))
    try{
      const audio=join(directory,'Generated Speech.mp3')
      execFileSync(ffmpegPath!,['-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=44100:duration=0.15','-ac','2','-c:a','libmp3lame',audio],{timeout:10_000})
      const original=await readFile(audio)
      const deps=higgsfieldSeedanceManagedMedia({assertCurrent:()=>{},assertManagedPath:async path=>path,mimeFor:()=> 'audio/mpeg'})
      const source={path:audio,mediaType:'audio' as const}
      const prepared=await prepareHiggsfieldSeedanceMedia({endpointId:'bytedance/seedance-2.5/reference-to-video',inputRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,values:{prompt:'Exact recorded speech and pauses.'},media:{audio_urls:[source,source]}},deps)
      expect(prepared.media[0]).toBe(prepared.media[1])
      expect(prepared.media[0].source).toEqual(source)
      expect(prepared.media[0].contentType).toBe('audio/wav')
      const wav=Buffer.from(prepared.media[0].bytes!)
      expect(wav.toString('ascii',0,4)).toBe('RIFF');expect(wav.toString('ascii',8,12)).toBe('WAVE')
      expect(wav.equals(original)).toBe(false)
      expect(await readFile(audio)).toEqual(original)
    }finally{await rm(directory,{recursive:true,force:true})}
  })
  it('reads/validates actual image, short video and WAV bytes without imposing Genjutsu timing or changing files',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-seed-managed-'))
    try{
      const image=join(directory,'Image.png'),video=join(directory,'Video.mp4'),audio=join(directory,'Audio.wav')
      await writeFile(image,await sharp({create:{width:4,height:4,channels:3,background:'#222222'}}).png().toBuffer())
      execFileSync(ffmpegPath!,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=black:s=32x32:r=1:d=1','-c:v','mpeg4',video],{timeout:10_000})
      execFileSync(ffmpegPath!,['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=24000:cl=mono','-t','0.1',audio],{timeout:10_000})
      const deps=higgsfieldSeedanceManagedMedia({assertCurrent:()=>{},assertManagedPath:async path=>path,mimeFor:path=>path.endsWith('.png')?'image/png':path.endsWith('.mp4')?'video/mp4':'audio/wav'})
      const original=await Promise.all([image,video,audio].map(path=>readFile(path)))
      const prepared=await prepareHiggsfieldSeedanceMedia({endpointId:'bytedance/seedance-2.5/reference-to-video',inputRevision:HIGGSFIELD_SEEDANCE_INPUT_REVISION,values:{prompt:'Exact action.'},media:{image_urls:[{path:image,mediaType:'image'}],video_urls:[{path:video,mediaType:'video'}],audio_urls:[{path:audio,mediaType:'audio'}]}},deps)
      expect(prepared.media).toHaveLength(3)
      expect(prepared.media.map(media=>media.contentType)).toEqual(['image/png','video/mp4','audio/wav'])
      for(let i=0;i<3;i++)expect(Buffer.from(prepared.media[i].bytes!).equals(original[i])).toBe(true)
      expect(await Promise.all([image,video,audio].map(path=>readFile(path)))).toEqual(original)
    }finally{await rm(directory,{recursive:true,force:true})}
  })
  it('refuses symlinks, files replaced after inspection, disguise and unsupported audio before uploads',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-seed-managed-'))
    try{
      const image=join(directory,'Image.png'),alias=join(directory,'Alias.png'),mp3=join(directory,'Audio.mp3')
      const bytes=await sharp({create:{width:4,height:4,channels:3,background:'#222222'}}).png().toBuffer()
      await writeFile(image,bytes);await symlink(image,alias);await writeFile(mp3,'fictional MP3')
      const deps=higgsfieldSeedanceManagedMedia({assertCurrent:()=>{},assertManagedPath:async path=>path,mimeFor:path=>path.endsWith('.mp3')?'audio/mpeg':'image/png'})
      await expect(deps.inspect({path:alias,mediaType:'image'})).rejects.toThrow()
      const inspected=await deps.inspect({path:image,mediaType:'image'});await writeFile(image,'different content')
      await expect(deps.read(inspected)).rejects.toThrow(/changed/)
      const mp3Inspection=await deps.inspect({path:mp3,mediaType:'audio'}),mp3Read=await deps.read(mp3Inspection)
      await expect(deps.prepareAudio!({source:mp3Inspection.source,bytes:mp3Read,contentType:mp3Inspection.contentType},64*1024*1024)).rejects.toThrow(/decodable/)
      await writeFile(image,'fictional invalid image');const invalid=await deps.inspect({path:image,mediaType:'image'}),data=await deps.read(invalid)
      await expect(deps.validate({source:invalid.source,bytes:data,contentType:invalid.contentType})).rejects.toThrow(/decodable/)
    }finally{await rm(directory,{recursive:true,force:true})}
  })
  it('keeps managed identity checks inside main and rejects stale owners/cancellation',async()=>{
    const assertManagedPath=vi.fn(async path=>path),assertCurrent=vi.fn(()=>{throw Error('Owner changed')})
    const deps=higgsfieldSeedanceManagedMedia({assertCurrent,assertManagedPath,mimeFor:()=> 'image/png'})
    await expect(deps.inspect({path:'/fixture/image',mediaType:'image'})).rejects.toThrow(/Owner changed/)
    expect(assertManagedPath).not.toHaveBeenCalled()
    const controller=new AbortController();controller.abort(Error('Canceled'))
    await expect(deps.inspect({path:'/fixture/image',mediaType:'image'},controller.signal)).rejects.toThrow(/Canceled/)
  })
})
