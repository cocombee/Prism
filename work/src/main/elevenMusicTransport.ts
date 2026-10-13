/** Main-owned main Music adapter; fetch/credential/current-owner bindings are explicit. */
import {checkedResponse,type ElevenApiOptions} from './elevenLabsApi'
import {compileMusicRequest,type MusicModel} from './elevenMusicContract'
import {readBoundedElevenAudioResponse,elevenAudioCompletion,type ElevenAudioCompletion} from './elevenAudioTransportBoundary'
import {assertEncodedElevenOutputFormat,assertEncodedOutputDecoder,prepareEncodedElevenOutput,type EncodedElevenOutput} from './elevenEncodedOutput'

export class MusicFailure extends Error {
  constructor(message:string,public readonly completion:ElevenAudioCompletion){super(message);this.name='MusicFailure'}
}
export interface MusicTransportOptions extends ElevenApiOptions {
  assertCurrent():void
  maximumResponseBytes:number
  decoderBinary:string
}
export interface MusicTransportResult {
  bytes:Buffer;modelId:MusicModel;requestedOutputFormat:string;outputFormat:string
  requestedDurationMs:number;requestId?:string
  encoded:EncodedElevenOutput;requestSnapshot:Record<string,unknown>
}
export async function generateMusic(options:MusicTransportOptions,raw:unknown):Promise<MusicTransportResult>{
  let attempted=false,postStatus:number|undefined
  try{
    const compiled=compileMusicRequest(raw)
    // Serialize before awaiting. Caller edits cannot rewrite the request in flight.
    const body=JSON.stringify(compiled.body)
    const check=()=>{options.signal?.throwIfAborted();options.assertCurrent()}
    check()
    if(!options.key)throw Error('Choose the connected ElevenLabs account before generating Music.')
    if(!Number.isSafeInteger(options.maximumResponseBytes)||options.maximumResponseBytes<=0)throw Error('Invalid main-owned Music response bound.')
    const outputFormat=compiled.outputFormat==='auto'?compiled.modelId==='music_v1'?'mp3_44100_128':'mp3_48000_192':compiled.outputFormat
    assertEncodedElevenOutputFormat('music',outputFormat)
    await assertEncodedOutputDecoder({decoderBinary:options.decoderBinary,maximumBytes:options.maximumResponseBytes,assertCurrent:check,signal:options.signal})
    const responseSignal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(120_000)]):AbortSignal.timeout(120_000)
    const response=await checkedResponse({...options,signal:responseSignal,
      assertSubmission:()=>{check();options.assertSubmission?.()},
      fetch:async(url,init)=>{if(init?.method==='POST')attempted=true;const response=await options.fetch(url,init);if(init?.method==='POST')postStatus=response.status;return response},
    },compiled.url,{method:'POST',headers:{'Content-Type':'application/json'},body},120_000)
    const bytes=await readBoundedElevenAudioResponse(response,options.maximumResponseBytes,responseSignal,check)
    const encoded=await prepareEncodedElevenOutput('music',bytes,outputFormat,{decoderBinary:options.decoderBinary,maximumBytes:options.maximumResponseBytes,assertCurrent:check,signal:responseSignal})
    check()
    const requestId=response.headers.get('request-id')||undefined
    if(requestId&&(requestId.length>256||/[\u0000-\u001f\u007f]/.test(requestId)))throw Error('ElevenLabs returned an invalid Music request identity.')
    return {bytes:encoded.bytes,encoded,requestSnapshot:JSON.parse(body),modelId:compiled.modelId,requestedOutputFormat:compiled.outputFormat,outputFormat,requestedDurationMs:compiled.durationMs,...requestId?{requestId}:{}}
  }catch(error){
    const message=error instanceof Error?error.message:'Music generation failed.'
    throw new MusicFailure(options.key?message.replaceAll(options.key,'[redacted]'):message,elevenAudioCompletion(attempted,postStatus))
  }
}
