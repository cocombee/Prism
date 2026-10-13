/** Main-owned main persistence; follows existing exclusive register/history ownership. */
import {constants} from 'node:fs'
import {open,lstat,unlink} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {isAbsolute,sep,basename} from 'node:path'
import type {MusicTransportResult} from './elevenMusicTransport'
import type {VoiceChangeTransportResult} from './elevenVoiceChangeTransport'

export type AudioDerivativeResult=({operation:'music'}&MusicTransportResult)|({operation:'voice-change'}&VoiceChangeTransportResult)
export interface AudioDerivativeMetadata {
  provider:'ElevenLabs';modelId:string;audioOperation:'music'|'voice-change';audioOutputFormat:string
  requestedOutputFormat:string;providerProfileId:string;submissionId:string;requestSnapshot:Record<string,unknown>
  encoded:{sha256:string;byteLength:number;codec:string;sampleRates:number[];channels:number[];durationSeconds:number}
  requestedDurationMs?:number
  originalAudio?:{assetId:string;revision:string;sha256:string;byteLength:number;durationSeconds:number;origin:'imported'|'generated'}
}
export interface AudioDerivativeStorage {
  outputStem:string;projectId:string;nodeId:string;providerProfileId:string;submissionId:string
  assertCommit():void
  assertOutputPath(path:string):Promise<string>
  register(path:string,metadata:AudioDerivativeMetadata,indexed:()=>void):Promise<void>
  history(entry:{projectId:string;nodeId:string;outputPath:string;modelId:string;requestId:string;metadata:AudioDerivativeMetadata}):Promise<void>
  localUrl(path:string):string
}
export class AudioDerivativeSaveFailure extends Error {
  constructor(message:string,public readonly state:'not-indexed'|'indexed-history-pending'|'indexed-history-saved',public readonly retainedOutputPath?:string){super(message);this.name='AudioDerivativeSaveFailure'}
}
export async function persistAudioDerivative(result:AudioDerivativeResult,storage:AudioDerivativeStorage):Promise<{requestId:string;modelId:string;outputPath:string;outputUrl:string;outputType:'audio'}>{
  let owned:{dev:number;ino:number}|undefined,indexed=false,historySaved=false,outputPath='',file:Awaited<ReturnType<typeof open>>|undefined
  try{
    storage.assertCommit()
    const owner={projectId:storage.projectId,nodeId:storage.nodeId,providerProfileId:storage.providerProfileId,submissionId:storage.submissionId}
    for(const value of Object.values(owner))if(typeof value!=='string'||!value.trim())throw Error('Missing original audio submission ownership.')
    if(!isAbsolute(storage.outputStem)||storage.outputStem.endsWith(sep))throw Error('Choose a main-owned absolute output stem.')
    if(!['music','voice-change'].includes(result.operation)||!['.mp3','.opus','.wav'].includes(result.encoded.extension))throw Error('Invalid verified audio derivative.')
    const bytes=Buffer.from(result.bytes),sha256=createHash('sha256').update(bytes).digest('hex')
    if(!bytes.length||sha256!==result.encoded.sha256)throw Error('Verified audio bytes changed before saving.')
    const modelId='elevenlabs/'+result.modelId,requestId=result.requestId||owner.submissionId
    const metadata:AudioDerivativeMetadata={provider:'ElevenLabs',modelId,audioOperation:result.operation,audioOutputFormat:result.outputFormat,
      requestedOutputFormat:result.operation==='music'?result.requestedOutputFormat:result.outputFormat,
      providerProfileId:owner.providerProfileId,submissionId:owner.submissionId,requestSnapshot:structuredClone(result.requestSnapshot),
      encoded:{sha256,byteLength:bytes.length,codec:result.encoded.codec,sampleRates:[...result.encoded.sampleRates],channels:[...result.encoded.channelCounts],durationSeconds:result.encoded.durationSeconds},
      ...result.operation==='music'?{requestedDurationMs:result.requestedDurationMs}:{originalAudio:{assetId:result.source.assetId,revision:result.source.revision,sha256:result.source.sha256,byteLength:result.source.byteLength,durationSeconds:result.source.durationSeconds,origin:result.sourceOrigin}}}
    const requestedPath=storage.outputStem+result.encoded.extension
    outputPath=await storage.assertOutputPath(requestedPath)
    if(!isAbsolute(outputPath)||basename(outputPath)!==basename(requestedPath))throw Error('The managed output filename changed before saving.')
    storage.assertCommit()
    file=await open(outputPath,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600)
    const created=await file.stat();owned={dev:created.dev,ino:created.ino}
    await file.writeFile(bytes);await file.sync();await file.close();file=undefined
    storage.assertCommit()
    if(await storage.assertOutputPath(outputPath)!==outputPath)throw Error('The managed output path changed before registration.')
    const verify=await open(outputPath,constants.O_RDONLY|constants.O_NOFOLLOW)
    try{
      const entry=await verify.stat()
      if(!entry.isFile()||entry.dev!==owned.dev||entry.ino!==owned.ino||entry.size!==bytes.length)throw Error('The created output changed before registration.')
      const hash=createHash('sha256'),chunk=Buffer.alloc(Math.min(256*1024,bytes.length));let count=0
      while(count<bytes.length){const read=await verify.read(chunk,0,Math.min(chunk.length,bytes.length-count),null);if(!read.bytesRead)throw Error('The created output was truncated.');count+=read.bytesRead;hash.update(chunk.subarray(0,read.bytesRead))}
      const extra=await verify.read(Buffer.alloc(1),0,1,null),after=await verify.stat()
      if(extra.bytesRead||entry.mtimeMs!==after.mtimeMs||entry.ctimeMs!==after.ctimeMs||hash.digest('hex')!==sha256)throw Error('The created output changed before registration.')
    }finally{await verify.close()}
    storage.assertCommit()
    await storage.register(outputPath,structuredClone(metadata),()=>{indexed=true})
    indexed=true
    storage.assertCommit()
    await storage.history({projectId:owner.projectId,nodeId:owner.nodeId,outputPath,modelId,requestId,metadata:structuredClone(metadata)})
    historySaved=true
    storage.assertCommit()
    return {requestId,modelId,outputPath,outputUrl:storage.localUrl(outputPath),outputType:'audio'}
  }catch(error){
    await file?.close().catch(()=>undefined)
    let retained=indexed?outputPath:undefined
    if(owned&&!indexed){
      try{const entry=await lstat(outputPath);if(entry.isFile()&&!entry.isSymbolicLink()&&entry.dev===owned.dev&&entry.ino===owned.ino)await unlink(outputPath);else retained=outputPath}catch(cleanup){if((cleanup as NodeJS.ErrnoException).code!=='ENOENT')retained=outputPath}
    }
    throw new AudioDerivativeSaveFailure(error instanceof Error?error.message:'Audio output could not be saved.',indexed?historySaved?'indexed-history-saved':'indexed-history-pending':'not-indexed',retained)
  }
}
