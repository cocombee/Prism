import {constants} from 'node:fs'
import {open,stat} from 'node:fs/promises'
import type {Stats} from 'node:fs'
import type {HiggsfieldSeedanceSource} from '../shared/higgsfieldSeedanceInput'
import {inspectHiggsfieldImage} from './higgsfieldImageInspection'
import {inspectHiggsfieldWav} from './higgsfieldAudioInspection'
import {probeManagedMp4} from './managedVideoProbe'
import {higgsfieldMovieContainer} from './higgsfieldMovieContainer'
import {HIGGSFIELD_SEEDANCE_LOCAL_BUDGET,type HiggsfieldSeedanceInspection,type HiggsfieldSeedancePreparationDependencies} from './higgsfieldSeedancePreparation'

interface ManagedContext {assertCurrent():void;assertManagedPath(path:string):Promise<string>;mimeFor(path:string):string}
interface FileIdentity {path:string;size:number;ino:number;dev:number;mtimeMs:number;ctimeMs:number}
const supported={image:['image/jpeg','image/png','image/webp','image/gif'],video:['video/mp4'],audio:['audio/wav','audio/x-wav']}
const identity=(path:string,entry:Stats):FileIdentity=>({path,size:entry.size,ino:entry.ino,dev:entry.dev,mtimeMs:entry.mtimeMs,ctimeMs:entry.ctimeMs})
const same=(expected:FileIdentity,actual:Stats)=>actual.isFile()&&['size','ino','dev','mtimeMs','ctimeMs'].every(key=>expected[key as keyof FileIdentity]===actual[key as keyof Stats])

/** Main-only file authority. Opaque inspection tokens and read-buffer identity
 * never enter renderer DTOs, prompts, provider JSON or the protected snapshot. */
export function higgsfieldSeedanceManagedMedia(context:ManagedContext):HiggsfieldSeedancePreparationDependencies {
  const inspections=new WeakMap<object,FileIdentity>(),reads=new WeakMap<Uint8Array,FileIdentity>()
  const check=(signal?:AbortSignal)=>{signal?.throwIfAborted();context.assertCurrent()}
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
        inspections.set(token,identity(path,entry))
        return {...{source:{...source},byteLength:entry.size,contentType},managedToken:token}
      } finally {await file.close()}
    },
    async read(inspection:HiggsfieldSeedanceInspection,signal?:AbortSignal) {
      check(signal)
      const token=(inspection as HiggsfieldSeedanceInspection&{managedToken?:object}).managedToken
      const expected=token&&inspections.get(token)
      if(!expected||!inspection.source.path||inspection.byteLength!==expected.size)throw new Error('Seedance media inspection changed or lost its managed owner.')
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
        reads.set(bytes,expected)
        return bytes
      } finally {await file.close()}
    },
    async validate(media,signal) {
      check(signal)
      const expected=media.bytes&&reads.get(media.bytes)
      if(!expected||!media.contentType)throw new Error('Seedance content validation needs the original main-owned read buffer.')
      if(media.source.mediaType==='image')await inspectHiggsfieldImage(media.bytes!,media.contentType)
      else if(media.source.mediaType==='audio')await inspectHiggsfieldWav(media.bytes!,media.contentType,signal)
      else {
        higgsfieldMovieContainer(media.bytes!.subarray(0,64*1024),media.bytes!.length,'video/mp4')
        await probeManagedMp4(expected.path,signal)
        if(!same(expected,await stat(expected.path)))throw new Error('The managed video changed during Seedance inspection.')
      }
      check(signal)
    },
  }
}
