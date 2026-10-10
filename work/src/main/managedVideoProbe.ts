import { execFile } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
/** Read only the metadata header; no decode, output file, remote URL or secret is passed. */
export async function probeManagedMp4(path: string, signal?: AbortSignal): Promise<{duration:number;width:number;height:number}> {
  if(!ffmpegPath)throw new Error('Source-video inspection is unavailable in this build.')
  const binary=ffmpegPath.replace(/app\.asar\//,'app.asar.unpacked/')
  signal?.throwIfAborted()
  const stderr=await new Promise<string>((resolve,reject)=>execFile(binary,['-hide_banner','-i',path],{timeout:10_000,maxBuffer:64*1024,signal},(error,_stdout,output)=>{
    if(signal?.aborted)return reject(signal.reason)
    // FFmpeg intentionally exits without an output; only a complete metadata header is accepted.
    if(error&&(error.killed || (error as NodeJS.ErrnoException).code==='ETIMEDOUT'))return reject(new Error('Source-video inspection timed out. Import a source with readable metadata.'))
    if(error&&(error as NodeJS.ErrnoException).code==='ENOENT')return reject(new Error('Source-video inspection is unavailable in this build.'))
    resolve(output)
  }))
  const time=/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(stderr),frame=/Video:[^\r\n]+?\b(\d{2,5})x(\d{2,5})\b/.exec(stderr)
  if(!time||!frame)throw new Error('Could not inspect this managed MP4. Import a decodable source video.')
  const duration=Number(time[1])*3600+Number(time[2])*60+Number(time[3]),width=Number(frame[1]),height=Number(frame[2])
  if(!Number.isFinite(duration)||duration<=0||!width||!height)throw new Error('The managed video has invalid metadata.')
  return {duration,width,height}
}
