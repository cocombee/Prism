/** Main-owned output preparation: preserve encoded bytes, inspect actual channels. */
import {createHash} from 'node:crypto'
import {constants} from 'node:fs'
import {access} from 'node:fs/promises'
import {inspectEncodedAudio,type EncodedAudioInspection} from './elevenEncodedAudioInspection'
import {MUSIC_OUTPUT_FORMATS} from './elevenMusicContract'
import {VOICE_CHANGE_OUTPUT_FORMATS} from './elevenVoiceChangeContract'

export interface EncodedOutputContext {
  decoderBinary:string;maximumBytes:number;assertCurrent():void;signal?:AbortSignal
}
export interface EncodedElevenOutput extends EncodedAudioInspection {
  bytes:Buffer;extension:'.mp3'|'.opus'|'.wav';sha256:string
}
export function assertEncodedElevenOutputFormat(operation:'music'|'voice-change',expectedOutputFormat:string):RegExpExecArray {
  const formats:readonly string[]=operation==='music'?MUSIC_OUTPUT_FORMATS:operation==='voice-change'?VOICE_CHANGE_OUTPUT_FORMATS:[]
  if(!formats.includes(expectedOutputFormat))throw Error('Choose a supported output format for this audio operation.')
  const format=/^(mp3|opus|wav)_(\d+)(?:_\d+)?$/.exec(expectedOutputFormat)
  if(!format)throw Error('Raw output playback needs verified channel metadata. Resolve Auto to the documented expected format before inspection.')
  return format
}
export async function assertEncodedOutputDecoder(context:EncodedOutputContext):Promise<void>{
  context.signal?.throwIfAborted();context.assertCurrent()
  if(!context.decoderBinary)throw Error('Encoded output inspection is unavailable in this build.')
  await access(context.decoderBinary.replace(/app\.asar\//,'app.asar.unpacked/'),constants.X_OK)
  context.signal?.throwIfAborted();context.assertCurrent()
}
export async function prepareEncodedElevenOutput(operation:'music'|'voice-change',bytes:Uint8Array,expectedOutputFormat:string,context:EncodedOutputContext):Promise<EncodedElevenOutput>{
  const check=()=>{context.signal?.throwIfAborted();context.assertCurrent()}
  check()
  const format=assertEncodedElevenOutputFormat(operation,expectedOutputFormat)
  if(!Number.isSafeInteger(context.maximumBytes)||context.maximumBytes<=0||!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>context.maximumBytes)throw Error('The encoded output is empty or exceeds its main-owned size bound.')
  const snapshot=Buffer.from(bytes),family=format[1],mime=family==='mp3'?'audio/mpeg':family==='opus'?'audio/ogg':'audio/wav'
  await assertEncodedOutputDecoder(context)
  const inspection=await inspectEncodedAudio(snapshot,mime,context.decoderBinary,context.signal)
  check()
  if(inspection.sampleRates.length!==1||inspection.sampleRates[0]!==Number(format[2])||inspection.channelCounts.length!==1)throw Error('The encoded output does not match the requested sample rate or has inconsistent channels.')
  return {...inspection,bytes:snapshot,extension:`.${family}` as EncodedElevenOutput['extension'],sha256:createHash('sha256').update(snapshot).digest('hex')}
}
