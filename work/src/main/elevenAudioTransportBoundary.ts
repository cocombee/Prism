/** Main-owned shared main response boundary; no provider call or credential access. */
export type ElevenAudioCompletion='not-submitted'|'rejected'|'unknown'
export function elevenAudioCompletion(attempted:boolean,postStatus?:number):ElevenAudioCompletion {
  return !attempted?'not-submitted':postStatus!==undefined&&postStatus>=400&&postStatus<500?'rejected':'unknown'
}
export async function readBoundedElevenAudioResponse(response:Response,maximum:number,signal:AbortSignal,assertCurrent:()=>void):Promise<Buffer>{
  const type=response.headers.get('content-type')??''
  if(type&&!/^(audio\/[a-z0-9.+-]+|application\/octet-stream)(?:\s*;|$)/i.test(type)){await response.body?.cancel();throw Error('ElevenLabs returned a non-audio response.')}
  const length=Number(response.headers.get('content-length'))
  if(Number.isFinite(length)&&length>maximum){await response.body?.cancel();throw Error('ElevenLabs audio exceeds the local response bound.')}
  if(!response.body)throw Error('ElevenLabs returned empty audio.')
  const reader=response.body.getReader(),chunks:Buffer[]=[];let total=0
  const abort=()=>{void reader.cancel(signal.reason).catch(()=>undefined)}
  signal.addEventListener('abort',abort,{once:true})
  try{
    for(;;){signal.throwIfAborted();assertCurrent();const {done,value}=await reader.read();signal.throwIfAborted();assertCurrent();if(done)break;total+=value.length;if(total>maximum)throw Error('ElevenLabs audio exceeds the local response bound.');chunks.push(Buffer.from(value))}
    if(!total)throw Error('ElevenLabs returned empty audio.')
    return Buffer.concat(chunks,total)
  }catch(error){await reader.cancel().catch(()=>undefined);throw error}
  finally{signal.removeEventListener('abort',abort);reader.releaseLock()}
}

