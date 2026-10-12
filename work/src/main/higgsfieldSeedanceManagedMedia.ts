import {constants} from 'node:fs'
import {open} from 'node:fs/promises'
import type {Stats} from 'node:fs'
import type {HiggsfieldSeedanceSource} from '../shared/higgsfieldSeedanceInput'
import {inspectHiggsfieldImage} from './higgsfieldImageInspection'
import {inspectHiggsfieldWav} from './higgsfieldAudioInspection'
import {convertHiggsfieldMp3} from './higgsfieldAudioConversion'
import {probeManagedMp4} from './managedVideoProbe'
import {higgsfieldMovieContainer} from './higgsfieldMovieContainer'
import {HIGGSFIELD_SEEDANCE_LOCAL_BUDGET,type HiggsfieldSeedanceInspection,type HiggsfieldSeedancePreparationDependencies} from './higgsfieldSeedancePreparation'

interface ManagedContext {assertCurrent():void;assertManagedPath(path:string):Promise<string>;mimeFor(path:string):string}
interface FileIdentity {path:string;size:number;ino:number;dev:number;mtimeMs:number;ctimeMs:number}
interface OwnedRead {file:FileIdentity;sourcePath:string;mediaType:HiggsfieldSeedanceSource['mediaType'];contentType:string}
const supported={image:['image/jpeg','image/png','image/webp','image/gif'],video:['video/mp4'],audio:['audio/wav','audio/x-wav','audio/mpeg']}
const identity=(path:string,entry:Stats):FileIdentity=>({path,size:entry.size,ino:entry.ino,dev:entry.dev,mtimeMs:entry.mtimeMs,ctimeMs:entry.ctimeMs})
const same=(expected:FileIdentity,actual:Stats)=>actual.isFile()&&['size','ino','dev','mtimeMs','ctimeMs'].every(key=>expected[key as keyof FileIdentity]===actual[key as keyof Stats])

/** Main-only file authority. Opaque inspection tokens and read-buffer identity
 * never enter renderer DTOs, prompts, provider JSON or the protected snapshot. */
export function higgsfieldSeedanceManagedMedia(context:ManagedContext):HiggsfieldSeedancePreparationDependencies {
  const inspections=new WeakMap<object,OwnedRead>(),reads=new WeakMap<Uint8Array,OwnedRead>()
  const check=(signal?:AbortSignal)=>{signal?.throwIfAborted();context.assertCurrent()}
  const unchanged=async(expected:FileIdentity,signal?:AbortSignal)=>{
    check(signal)
    const path=await context.assertManagedPath(expected.path);check(signal)
    if(path!==expected.path)throw Error('The managed source changed during Seedance preparation.')
    const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
    try{if(!same(expected,await file.stat()))throw Error('The managed source changed during Seedance preparation.');check(signal)}finally{await file.close()}
  }
  return {
    assertCurrent:context.assertCurrent,
    async inspect(source:HiggsfieldSeedanceSource,signal?:AbortSignal) {
      check(signal)
      if(!source.path||source.url)throw new Error('Choose a managed local source for Seedance inspection.')
      const path=await context.assertManagedPath(source.path);check(signal)
      const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
      try {
        const entry=await file.stat();check(signal)
        const contentType=context.mimeFor(path),maximum=HIGGSFIELD_SEEDANCE_LOCAL_BUDGET[`${source.mediaType}Bytes`]
        if(!entry.isFile()||entry.size<1||entry.size>maximum||!supported[source.mediaType].includes(contentType))throw new Error('Choose supported managed Seedance media within Prism’s local file-size bound.')
        const token=Object.freeze({})
        inspections.set(token,{file:identity(path,entry),sourcePath:source.path,mediaType:source.mediaType,contentType})
        return {...{source:{...source},byteLength:entry.size,contentType},managedToken:token}
      } finally {await file.close()}
    },
    async read(inspection:HiggsfieldSeedanceInspection,signal?:AbortSignal) {
      check(signal)
      const token=(inspection as HiggsfieldSeedanceInspection&{managedToken?:object}).managedToken
      const owned=token&&inspections.get(token),expected=owned?.file
      if(!owned||!expected||inspection.source.path!==owned.sourcePath||inspection.byteLength!==expected.size||inspection.contentType!==owned.contentType||inspection.source.mediaType!==owned.mediaType)throw new Error('Seedance media inspection changed or lost its managed owner.')
      const path=await context.assertManagedPath(inspection.source.path);check(signal)
      if(path!==expected.path)throw new Error('The managed source changed after Seedance inspection.')
      const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
      try {
        if(!same(expected,await file.stat()))throw new Error('The source changed after Seedance inspection.')
        const bytes=Buffer.alloc(expected.size);let offset=0
        while(offset<bytes.length) {
          const result=await file.read(bytes,offset,Math.min(256*1024,bytes.length-offset),null)
          check(signal)
          if(!result.bytesRead)throw new Error('The source changed during Seedance reading.')
          offset+=result.bytesRead
        }
        const extra=await file.read(Buffer.alloc(1),0,1,null);check(signal)
        if(extra.bytesRead||!same(expected,await file.stat()))throw new Error('The source changed during Seedance reading.')
        reads.set(bytes,owned)
        return bytes
      } finally {await file.close()}
    },
    async prepareAudio(media,maximumBytes,signal){
      check(signal)
      const owned=media.bytes&&reads.get(media.bytes)
      if(!owned||owned.mediaType!=='audio'||owned.contentType!=='audio/mpeg'||media.contentType!=='audio/mpeg'||media.source.mediaType!=='audio'||media.source.path!==owned.sourcePath||media.source.url)throw Error('MP3 preparation requires the original main-owned audio read buffer.')
      await unchanged(owned.file,signal)
      const bytes=await convertHiggsfieldMp3(media.bytes!,signal,{maximumBytes})
      await unchanged(owned.file,signal)
      reads.set(bytes,{...owned,contentType:'audio/wav'})
      return {bytes,contentType:'audio/wav'}
    },
    async validate(media,signal) {
      check(signal)
      const owned=media.bytes&&reads.get(media.bytes),expected=owned?.file
      if(!owned||!expected||media.contentType!==owned.contentType||media.source.mediaType!==owned.mediaType||media.source.path!==owned.sourcePath||media.source.url)throw new Error('Seedance content validation needs a main-owned read buffer and matching source.')
      await unchanged(expected,signal)
      if(media.source.mediaType==='image')await inspectHiggsfieldImage(media.bytes!,media.contentType)
      else if(media.source.mediaType==='audio')await inspectHiggsfieldWav(media.bytes!,media.contentType,signal)
      else {
        higgsfieldMovieContainer(media.bytes!.subarray(0,64*1024),media.bytes!.length,'video/mp4')
        await probeManagedMp4(expected.path,signal)
      }
      await unchanged(expected,signal)
      check(signal)
    },
  }
}
