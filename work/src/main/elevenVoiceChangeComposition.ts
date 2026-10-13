/** Main-owned main composition. No credential lookup, default fetch or provider fallback. */
import {readGraphOriginalAudio,type OriginalAudioGraphContext} from './elevenOriginalAudioGraph'
import {generateVoiceChange,type VoiceChangeTransportOptions} from './elevenVoiceChangeTransport'
import {persistAudioDerivative,AudioDerivativeSaveFailure,type AudioDerivativeStorage} from './elevenAudioDerivativePersistence'

export interface GraphVoiceChangeOptions {
 graph:OriginalAudioGraphContext
 transport:Omit<VoiceChangeTransportOptions,'sourceContext'|'prepareOriginalSource'>
 storage:AudioDerivativeStorage
}

export class GraphVoiceChangeOutputFailure extends Error {
 readonly providerCompletion='complete'
 constructor(message:string,public readonly requestId:string|undefined,public readonly saveState:AudioDerivativeSaveFailure['state'],public readonly retainedOutputPath?:string){super(message);this.name='GraphVoiceChangeOutputFailure'}
}

export async function runGraphVoiceChange(options:GraphVoiceChangeOptions,raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))throw Error('Invalid Voice Change draft.')
 if(Reflect.ownKeys(raw).some(key=>typeof key!=='string'||!['voiceId','modelId','settings','seed','removeBackgroundNoise','outputFormat'].includes(key)))throw Error('Original audio identity is owned by the connected graph, not the renderer draft.')
 const draft=structuredClone(raw),storage={...options.storage},transport={...options.transport},graph={...options.graph}
 const check=()=>{transport.signal?.throwIfAborted();transport.assertCurrent();graph.assertCurrent();storage.assertCommit()}
 check()
 if(storage.nodeId!==graph.getGraph().nodeId)throw Error('Voice Change storage does not own the connected node.')
 if(!transport.key)throw Error('Choose the connected ElevenLabs account before generating.')
 const original=await readGraphOriginalAudio(graph,transport.signal)
 const assertCurrent=()=>{check();original.assertGraphCurrent()}
 assertCurrent()
 const result=await generateVoiceChange({...transport,assertCurrent,sourceContext:graph,
  prepareOriginalSource:async(id,signal)=>{signal?.throwIfAborted();assertCurrent();if(id!==original.source.assetId)throw Error('Original audio identity changed.');await original.assertSourceCurrent();assertCurrent();return original}},
  {...draft,assetId:original.source.assetId})
 try{
  assertCurrent()
  return await persistAudioDerivative({operation:'voice-change',...result},{...storage,assertCommit:assertCurrent})
 }catch(error){
  const message=error instanceof Error?error.message:'Voice Change output could not be saved.'
  throw new GraphVoiceChangeOutputFailure('Voice Change completed at ElevenLabs, but local output saving failed. Check the saved assets before running again. '+(transport.key?message.replaceAll(transport.key,'[redacted]'):message),result.requestId,
   error instanceof AudioDerivativeSaveFailure?error.state:'not-indexed',error instanceof AudioDerivativeSaveFailure?error.retainedOutputPath:undefined)
 }
}
