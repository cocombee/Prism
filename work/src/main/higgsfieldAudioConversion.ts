import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import { HIGGSFIELD_SEEDANCE_LOCAL_BUDGET } from './higgsfieldSeedancePreparation'

interface ConversionOptions {
  /** Main/test-only dependencies. None is accepted from a renderer DTO. */
  spawn?: typeof spawn
  binary?: string | null
  maximumBytes?: number
  timeoutMs?: number
}

/** FFmpeg cannot seek a pipe, so its WAV lengths are placeholders. Finalize
 * only our bounded new PCM buffer; strict WAV inspection stays unchanged. */
function finalizePipedWav(wav:Buffer):void {
  if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('MP3 preparation did not produce PCM WAV audio.')
  let offset=12,alignment=0
  while(offset+8<=wav.length){
    const kind=wav.toString('ascii',offset,offset+4),length=wav.readUInt32LE(offset+4)
    if(kind==='data'){
      const samples=wav.length-offset-8
      if(!alignment||samples<alignment||samples%alignment!==0||(length!==0xffffffff&&length!==samples))throw Error('MP3 preparation produced incomplete PCM WAV audio.')
      wav.writeUInt32LE(samples,offset+4);wav.writeUInt32LE(wav.length-8,4);return
    }
    if(length>wav.length-offset-8)throw Error('MP3 preparation produced an invalid WAV chunk.')
    if(kind==='fmt '){
      if(length<16||wav.readUInt16LE(offset+8)!==1||wav.readUInt16LE(offset+22)!==16)throw Error('MP3 preparation did not produce16-bit PCM WAV audio.')
      const channels=wav.readUInt16LE(offset+10),rate=wav.readUInt32LE(offset+12)
      alignment=wav.readUInt16LE(offset+20)
      if(!channels||!rate||alignment!==channels*2||wav.readUInt32LE(offset+16)!==rate*alignment)throw Error('MP3 preparation produced invalid PCM WAV geometry.')
    }
    offset+=8+length+(length%2)
  }
  throw Error('MP3 preparation produced no PCM audio.')
}

/** Decode the original MP3 stream into PCM WAV. Pipe-only, bounded and no
 * filters, trimming, channel/rate changes, persistent files or source writes. */
export async function convertHiggsfieldMp3(bytes:Uint8Array,signal?:AbortSignal,options:ConversionOptions={}):Promise<Uint8Array> {
  signal?.throwIfAborted()
  const maximum=options.maximumBytes??HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.audioBytes
  const timeout=options.timeoutMs??20_000
  if(!Number.isSafeInteger(maximum)||maximum<44||maximum>HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.audioBytes||!Number.isInteger(timeout)||timeout<1||timeout>20_000)
    throw Error('Audio conversion bounds are invalid.')
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>HIGGSFIELD_SEEDANCE_LOCAL_BUDGET.audioBytes)
    throw Error('Choose a bounded, nonempty MP3 audio reference; the original was preserved.')
  const binary=(options.binary===undefined?ffmpegPath:options.binary)?.replace(/app\.asar\//,'app.asar.unpacked/')
  if(!binary)throw Error('MP3 audio preparation is unavailable in this build.')
  const input=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  return await new Promise<Uint8Array>((resolve,reject)=>{
    let child:ChildProcessWithoutNullStreams
    try {
      child=(options.spawn??spawn)(binary,[
        '-hide_banner','-nostdin','-v','error','-xerror','-err_detect','explode',
        '-protocol_whitelist','pipe','-f','mp3','-i','pipe:0',
        '-map','0:a:0','-vn','-c:a','pcm_s16le','-f','wav','pipe:1',
      ],{stdio:['pipe','pipe','pipe']}) as ChildProcessWithoutNullStreams
    }catch{reject(Error('MP3 audio preparation could not start; the original was preserved.'));return}
    let chunks:Buffer[]=[],size=0,diagnostics=0,settled=false,failure:unknown
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);chunks=[]}
    const fail=(reason:unknown)=>{if(settled||failure!==undefined)return;failure=reason;chunks=[];child.kill('SIGKILL')}
    const abort=()=>fail(signal?.reason??Error('Audio preparation canceled.'))
    const timer=setTimeout(()=>fail(Error('MP3 audio preparation exceeded its local time bound; the original was preserved.')),timeout)
    child.stdout.on('data',(chunk:Buffer)=>{
      if(failure!==undefined)return
      if(size+chunk.byteLength>maximum){fail(Error('The decoded WAV exceeds Prism’s audio-size bound; no clipped input was uploaded.'));return}
      size+=chunk.byteLength;chunks.push(chunk)
    })
    child.stderr.on('data',(chunk:Buffer)=>{
      diagnostics+=chunk.byteLength
      if(diagnostics>64*1024)fail(Error('MP3 decoder diagnostics exceeded the local bound; the original was preserved.'))
    })
    // Broken decoder pipes belong to the process result, never an unhandled EPIPE.
    child.stdin.on('error',()=>{})
    child.on('error',()=>{
      if(settled)return
      settled=true;cleanup();reject(signal?.aborted?signal.reason:Error('MP3 audio preparation could not run; the original was preserved.'))
    })
    child.on('close',(code)=>{
      if(settled)return
      settled=true
      const error=failure??(code!==0?Error('Choose a decodable MP3 audio reference; preparation failed.'):undefined)
      if(error!==undefined){cleanup();reject(error);return}
      try {
        const wav=Buffer.concat(chunks,size)
        finalizePipedWav(wav)
        cleanup();signal?.throwIfAborted();resolve(wav)
      }catch(error){cleanup();reject(error)}
    })
    signal?.addEventListener('abort',abort,{once:true})
    if(signal?.aborted){abort();return}
    child.stdin.end(input)
  })
}
