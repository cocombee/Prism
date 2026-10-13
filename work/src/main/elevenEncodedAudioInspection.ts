import ffmpegBinary from 'ffmpeg-static'
export const originalAudioDecoder = ffmpegBinary || ''
/** Main-owned shared read-only decoder. No files, resampling or audio rewriting. */
import {spawn} from 'node:child_process'
export interface EncodedAudioInspection {durationSeconds:number;sampleRates:number[];channelCounts:number[];codec:string}
/** Decode for validation and measured duration only. The uploaded buffer stays encoded. */
export async function inspectEncodedAudio(bytes:Uint8Array,mimeType:string,binary:string,signal?:AbortSignal):Promise<EncodedAudioInspection> {
  signal?.throwIfAborted()
  if(!binary)throw Error('Original audio inspection is unavailable in this build.')
  const data=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  const wav=['audio/wav','audio/x-wav'].includes(mimeType)
  if(wav){if(data.length<12||!['RIFF','RF64','RIFX'].includes(data.toString('ascii',0,4))||data.toString('ascii',8,12)!=='WAVE')throw Error('The original audio does not match its WAV declaration.')}
  else if(!['audio/ogg','audio/opus'].includes(mimeType)&&(mimeType!=='audio/mpeg'||data.length<3||!(data.toString('ascii',0,3)==='ID3'||data[0]===255&&(data[1]&224)===224)))throw Error('The original audio does not match its MP3 declaration.')
  const opus=['audio/ogg','audio/opus'].includes(mimeType)
  if(opus&&(data.toString('ascii',0,4)!=='OggS'||!data.subarray(0,65536).includes(Buffer.from('OpusHead'))))throw Error('The audio does not match its Opus declaration.')
  return await new Promise<EncodedAudioInspection>((resolve,reject)=>{
    // ashowinfo observes decoded samples without changing audio. Progress gives
    // a last-frame timestamp, which can omit that frame's duration.
    const child=spawn(binary.replace(/app\.asar\//,'app.asar.unpacked/'),[
      '-hide_banner','-nostdin','-v','info','-xerror','-err_detect','explode','-nostats',
      '-protocol_whitelist','pipe','-f',wav?'wav':opus?'ogg':'mp3','-i','pipe:0',
      '-map','0:a:0','-af','ashowinfo','-f','null','-',
    ],{stdio:['pipe','pipe','pipe']})
    let line='',diagnostics=0,frames=0,duration=0,settled=false,failure:unknown,codec=''
    const sampleRates=new Set<number>(),channelCounts=new Set<number>()
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
    const fail=(reason:unknown)=>{if(failure!==undefined||settled)return;failure=reason;child.kill('SIGKILL')}
    const abort=()=>fail(signal?.reason??Error('Original audio inspection canceled.'))
    const timer=setTimeout(()=>fail(Error('Original audio inspection exceeded its local time bound.')),20_000)
    const parse=(text:string)=>{
      if(!codec){const match=/Stream #0:\d+[^\r\n]*Audio:\s*([a-zA-Z0-9_]+)/.exec(text);if(match)codec=match[1]}
      if(!text.includes('[Parsed_ashowinfo_'))return
      const frame=/\bn:(\d+)\b.*\brate:(\d+)\b.*\bnb_samples:(\d+)\b/.exec(text)
      if(!frame||Number(frame[1])!==frames||Number(frame[2])<=0||Number(frame[3])<=0)return fail(Error('Original audio sample timing could not be inspected.'))
      const channels=/\bchannels:(\d+)\b/.exec(text)
      if(!channels||Number(channels[1])<1)return fail(Error('Audio channel information could not be inspected.'))
      sampleRates.add(Number(frame[2]));channelCounts.add(Number(channels[1]))
      frames++;duration+=Number(frame[3])/Number(frame[2])
    }
    child.stderr.on('data',(chunk:Buffer)=>{
      if(failure!==undefined)return
      diagnostics+=chunk.length
      if(diagnostics>16*1024*1024)return fail(Error('Original audio inspection exceeded its local diagnostic bound.'))
      line+=chunk.toString('utf8')
      for(;;){const index=line.indexOf('\n');if(index<0)break;parse(line.slice(0,index));line=line.slice(index+1);if(failure!==undefined)return}
      if(line.length>8192)fail(Error('Original audio inspection returned an oversized diagnostic line.'))
    })
    child.stdout.on('data',()=>fail(Error('Original audio inspection unexpectedly returned output bytes.')))
    child.stdin.on('error',()=>{})
    child.on('error',()=>{if(settled)return;settled=true;cleanup();reject(signal?.aborted?signal.reason:Error('Original audio inspection is unavailable.'))})
    child.on('close',code=>{
      if(settled)return
      if(line)parse(line)
      settled=true;cleanup()
      if(signal?.aborted)return reject(signal.reason)
      if(failure!==undefined)return reject(failure)
      if(code!==0)return reject(Error('Choose decodable original audio; inspection failed.'))
      if(!frames||!Number.isFinite(duration)||duration<=0)return reject(Error('Choose original audio with a nonempty stream.'))
      if(!codec||opus&&codec!=='opus'||!wav&&!opus&&codec!=='mp3')return reject(Error('The decoded audio codec does not match its declaration.'))
      resolve({durationSeconds:duration,sampleRates:[...sampleRates],channelCounts:[...channelCounts],codec})
    })
    signal?.addEventListener('abort',abort,{once:true})
    if(signal?.aborted){abort();return}
    child.stdin.end(data)
  })
}

