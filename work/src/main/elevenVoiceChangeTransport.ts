/** Main-owned main composition. No default credential, account or live fetch. */
import {readBoundedElevenAudioResponse,elevenAudioCompletion} from './elevenAudioTransportBoundary'
import {checkedResponse,boundedJson,type ElevenApiOptions} from './elevenLabsApi'
import {readOriginalAudioSource,type MainAudioSourceContext} from './elevenOriginalAudioSource'
import {compileVoiceChangeRequest,prepareVoiceChangeMultipart,readConversionModels,type OriginalAudioSnapshot} from './elevenVoiceChangeContract'
import {assertEncodedElevenOutputFormat,assertEncodedOutputDecoder,prepareEncodedElevenOutput,type EncodedElevenOutput} from './elevenEncodedOutput'

export type VoiceChangeCompletion='not-submitted'|'rejected'|'unknown'
export class VoiceChangeFailure extends Error {
  constructor(message:string,public readonly completion:VoiceChangeCompletion){super(message);this.name='VoiceChangeFailure'}
}
export interface VoiceChangeTransportOptions extends ElevenApiOptions {
  assertCurrent():void
  sourceContext:MainAudioSourceContext
  maximumResponseBytes:number
  /** Main-owned prepared source only; never a renderer command field. */
  prepareOriginalSource?:(assetId:string,signal?:AbortSignal)=>Promise<Awaited<ReturnType<typeof readOriginalAudioSource>>>
}
export interface VoiceChangeTransportResult {
  bytes:Buffer;modelId:string;outputFormat:string;requestId?:string
  source:OriginalAudioSnapshot;sourceOrigin:'imported'|'generated'
  encoded:EncodedElevenOutput;requestSnapshot:Record<string,unknown>
}
function captureDraft(raw:unknown):Record<string,unknown>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))throw Error('Invalid Voice Change draft.')
  const allowed=['assetId','voiceId','modelId','settings','seed','removeBackgroundNoise','outputFormat']
  if(Reflect.ownKeys(raw).some(key=>typeof key!=='string'||!allowed.includes(key)))throw Error('Unsupported Voice Change draft field.')
  return structuredClone(raw) as Record<string,unknown>
}

export async function generateVoiceChange(options:VoiceChangeTransportOptions,raw:unknown):Promise<VoiceChangeTransportResult>{
  let attempted=false,postStatus:number|undefined
  try{
    const draft=captureDraft(raw),check=()=>{options.signal?.throwIfAborted();options.assertCurrent()}
    check()
    if(!options.key)throw Error('Choose the connected ElevenLabs account before generating.')
    if(!Number.isSafeInteger(options.maximumResponseBytes)||options.maximumResponseBytes<=0)throw Error('Invalid main-owned response bound.')
    if(typeof draft.assetId!=='string'||!draft.assetId.trim())throw Error('Connect original audio before generating.')
    const original=await (options.prepareOriginalSource??((id,signal)=>readOriginalAudioSource(options.sourceContext,id,signal)))(draft.assetId,options.signal)
    if(original.source.assetId!==draft.assetId)throw Error('Prepared original audio does not match the selected asset identity.')
    check()
    const {assetId,...fields}=draft
    // Schema check only; conversion support is established by the catalog below.
    const locallyValidated=compileVoiceChangeRequest({...fields,source:original.source},[{id:String(draft.modelId),label:'Local schema validation',supportsStyle:true,supportsSpeakerBoost:true}])
    assertEncodedElevenOutputFormat('voice-change',locallyValidated.outputFormat)
    await assertEncodedOutputDecoder({decoderBinary:options.sourceContext.decoderBinary,maximumBytes:options.maximumResponseBytes,assertCurrent:check,signal:options.signal})
    const catalogResponse=await checkedResponse(options,'https://api.elevenlabs.io/v1/models')
    const models=readConversionModels(await boundedJson(catalogResponse,2*1024*1024,options.signal))
    check()
    const compiled=compileVoiceChangeRequest({...fields,source:original.source},models)
    const form=await prepareVoiceChangeMultipart(compiled,original.bytes,options.sourceContext.maximumBytes)
    await original.assertSourceCurrent();check()
    const responseSignal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(120_000)]):AbortSignal.timeout(120_000)
    const response=await checkedResponse({...options,signal:responseSignal,
      assertSubmission:()=>{check();options.sourceContext.assertCurrent();options.assertSubmission?.()},
      fetch:async(url,init)=>{if(init?.method==='POST')attempted=true;const response=await options.fetch(url,init);if(init?.method==='POST')postStatus=response.status;return response}},compiled.url,{method:'POST',body:form},120_000)
    const bytes=await readBoundedElevenAudioResponse(response,options.maximumResponseBytes,responseSignal,check)
    const encoded=await prepareEncodedElevenOutput('voice-change',bytes,compiled.outputFormat,{decoderBinary:options.sourceContext.decoderBinary,maximumBytes:options.maximumResponseBytes,assertCurrent:check,signal:responseSignal})
    check()
    const requestId=response.headers.get('request-id')||undefined
    if(requestId&&(requestId.length>256||/[\u0000-\u001f\u007f]/.test(requestId)))throw Error('ElevenLabs returned an invalid request identity.')
    return {bytes:encoded.bytes,encoded,requestSnapshot:{voiceId:draft.voiceId,modelId:compiled.modelId,outputFormat:compiled.outputFormat,fields:{...compiled.fields}},modelId:compiled.modelId,outputFormat:compiled.outputFormat,source:{...compiled.source},sourceOrigin:original.origin,...requestId?{requestId}:{}}
  }catch(error){
    const completion=elevenAudioCompletion(attempted,postStatus)
    const message=error instanceof Error?error.message:'Voice Change failed.'
    const safe = options.key ? message.replaceAll(options.key, '[redacted]') : message
    throw new VoiceChangeFailure(completion === 'unknown' ? 'Submission status is unknown. Check ElevenLabs history before running again. '+safe : safe, completion)
  }
}
