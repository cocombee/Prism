/** Main-only, application source reader. No renderer path/URL grants file authority. */
import {constants,type Stats} from 'node:fs'
import {open} from 'node:fs/promises'
import {basename} from 'node:path'
import {createHash} from 'node:crypto'
import {inspectEncodedAudio} from './elevenEncodedAudioInspection'
import type {OriginalAudioSnapshot} from './elevenVoiceChangeContract'

export interface MainAudioAsset {
  id:string; path:string; category:string; origin:string; mimeType:string; trashedAt?:string
}
export interface MainAudioSourceContext {
  assertCurrent():void
  resolveAsset(id:string):Promise<MainAudioAsset|undefined>
  assertManagedPath(path:string):Promise<string>
  /** Trusted application binding only. Never a renderer command field. */
  decoderBinary:string
  maximumBytes:number
}
const fingerprint=(entry:Stats)=>[entry.dev,entry.ino,entry.size,entry.mtimeMs,entry.ctimeMs].join(':')
const same=(a:Stats,b:Stats)=>b.isFile()&&fingerprint(a)===fingerprint(b)
const assetFingerprint=(asset:MainAudioAsset)=>JSON.stringify([asset.id,asset.path,asset.category,asset.origin,asset.mimeType,asset.trashedAt??null])
function validateAsset(asset:MainAudioAsset|undefined,id:string):MainAudioAsset {
  if(!asset||asset.id!==id||asset.trashedAt)throw Error('Original audio is unavailable. Reconnect a current asset.')
  if(asset.category!=='audio'||!['imported','generated'].includes(asset.origin))throw Error('Choose an imported or generated audio asset.')
  if(!['audio/wav','audio/x-wav','audio/mpeg'].includes(asset.mimeType))throw Error('This source reader currently inspects encoded WAV or MP3 audio.')
  return {...asset}
}

/** Source duration comes from decoded samples; original encoded bytes are retained. */
export async function inspectEncodedOriginalAudio(bytes:Uint8Array,mimeType:string,binary:string,signal?:AbortSignal):Promise<number>{
  if(!['audio/wav','audio/x-wav','audio/mpeg'].includes(mimeType))throw Error('The original source reader currently inspects WAV or MP3.')
  return (await inspectEncodedAudio(bytes,mimeType,binary,signal)).durationSeconds
}

export async function readOriginalAudioSource(context:MainAudioSourceContext,assetId:string,signal?:AbortSignal):Promise<{source:OriginalAudioSnapshot;bytes:Uint8Array;origin:'imported'|'generated';assertSourceCurrent():Promise<void>}> {
  const check=()=>{signal?.throwIfAborted();context.assertCurrent()}
  check()
  if(typeof assetId!=='string'||!assetId.trim())throw Error('Connect original audio before generating.')
  if(!Number.isSafeInteger(context.maximumBytes)||context.maximumBytes<=0)throw Error('Invalid main-owned audio-size bound.')
  const asset=validateAsset(await context.resolveAsset(assetId),assetId),assetRevision=assetFingerprint(asset)
  check()
  const path=await context.assertManagedPath(asset.path)
  check()
  const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
  try{
    const before=await file.stat();check()
    if(!before.isFile()||before.size<1||before.size>context.maximumBytes)throw Error('Original audio is empty, unavailable or exceeds the local upload bound.')
    const bytes=Buffer.alloc(before.size);let offset=0
    while(offset<bytes.length){const result=await file.read(bytes,offset,Math.min(256*1024,bytes.length-offset),null);check();if(!result.bytesRead)throw Error('Original audio changed while reading.');offset+=result.bytesRead}
    const extra=await file.read(Buffer.alloc(1),0,1,null);check()
    if(extra.bytesRead||!same(before,await file.stat()))throw Error('Original audio changed while reading.')
    const sha256=createHash('sha256').update(bytes).digest('hex')
    const durationSeconds=await inspectEncodedOriginalAudio(bytes,asset.mimeType,context.decoderBinary,signal)
    check()
    const current=validateAsset(await context.resolveAsset(assetId),assetId)
    if(assetFingerprint(current)!==assetRevision||await context.assertManagedPath(asset.path)!==path||!same(before,await file.stat()))throw Error('Original audio changed during inspection. Resolve its current version before generating.')
    // A same-path replacement is invisible to the old descriptor's fstat.
    const fresh=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
    try{if(!same(before,await fresh.stat()))throw Error('Original audio was replaced during inspection.')}finally{await fresh.close()}
    check()
    const revision=createHash('sha256').update(assetRevision+fingerprint(before)+sha256).digest('hex')
    const assertSourceCurrent=async()=>{
      check()
      const latest=validateAsset(await context.resolveAsset(assetId),assetId)
      if(assetFingerprint(latest)!==assetRevision||await context.assertManagedPath(asset.path)!==path)throw Error('Original audio binding changed before submission.')
      const currentFile=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
      try{if(!same(before,await currentFile.stat()))throw Error('Original audio changed before submission.')}finally{await currentFile.close()}
      check()
    }
    return {source:{assetId:asset.id,revision,path:asset.path,sha256,byteLength:bytes.length,durationSeconds,fileName:basename(asset.path),mimeType:asset.mimeType},bytes,origin:asset.origin as 'imported'|'generated',assertSourceCurrent}
  }finally{await file.close()}
}
