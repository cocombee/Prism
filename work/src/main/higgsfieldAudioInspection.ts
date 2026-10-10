import { execFile } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import { HIGGSFIELD_SEEDANCE_LOCAL_BUDGET } from './higgsfieldSeedancePreparation'

/** Validate the actual WAV stream; no transcoding, output file, path or remote
 * URL is passed to FFmpeg. This is a local decoder check, not provider efficacy. */
export async function inspectHiggsfieldWav(bytes:Uint8Array,contentType:string,signal?:AbortSignal):Promise<void> {
  signal?.throwIfAborted()
  if (!['audio/wav','audio/x-wav'].includes(contentType) || !(bytes instanceof Uint8Array) || bytes.length < 12 || bytes.length > HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.audioBytes)
    throw new Error('Higgsfield audio references need supported, bounded WAV input; no conversion was performed.')
  const data=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  if (!['RIFF','RF64','RIFX'].includes(data.toString('ascii',0,4)) || data.toString('ascii',8,12)!=='WAVE')
    throw new Error('Higgsfield audio content does not match its declared WAV format.')
  if (!ffmpegPath) throw new Error('WAV content inspection is unavailable in this build.')
  const binary=ffmpegPath.replace(/app\.asar\//,'app.asar.unpacked/')
  await new Promise<void>((resolve,reject)=>{
    const child=execFile(binary,[
      '-hide_banner','-nostdin','-v','error','-xerror','-err_detect','explode',
      '-progress','pipe:1','-stats_period','1000','-nostats',
      '-protocol_whitelist','pipe','-f','wav','-i','pipe:0','-map','0:a:0','-f','null','-',
    ],{timeout:20_000,maxBuffer:64*1024,signal},(error,stdout)=>{
      if(signal?.aborted)return reject(signal.reason)
      if(error)return reject(new Error('Choose a decodable WAV audio reference; inspection failed or exceeded its local bound.'))
      const progress=[...stdout.matchAll(/^out_time_us=(\d+)$/gm)]
      if(!progress.some(match=>Number(match[1])>0))return reject(new Error('Choose a decodable, nonempty WAV audio reference.'))
      resolve()
    })
    // Invalid headers can close the pipe before all bytes are consumed. The
    // bounded decoder callback above owns that failure, never an unhandled EPIPE.
    child.stdin?.on('error',()=>{})
    child.stdin?.end(data)
  })
  signal?.throwIfAborted()
}
