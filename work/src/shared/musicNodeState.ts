/** Exact Music authored data -> main-validated request; no provider or credential access. */
import type { StudioNodeData } from './types'
import { compileMusicRequest, MUSIC_OUTPUT_FORMATS, type MusicRequest, type MusicModel, type MusicOutputFormat } from './musicRequest'
import { initialMusicPlanDrafts, musicRequestFromPlanDrafts } from './musicPlanDrafts'

export const MUSIC_ENCODED_OUTPUT_FORMATS = MUSIC_OUTPUT_FORMATS.filter(value => value === 'auto' || value.startsWith('mp3_') || value.startsWith('opus_'))
export function isDirectMusicNode(data:StudioNodeData):boolean { return data.kind==='music-generator' && data.musicVersion===1 && data.audioProvider==='elevenlabs' && !data.falNative && !data.higgsfieldNative }
export function musicPromptDurationMs(raw:string):number {
 if(typeof raw!=='string' || !/^\d+(?:\.\d+)?$/.test(raw))throw Error('Enter Music seconds as a decimal number.')
 const value=Number(raw)*1000,rounded=Math.round(value)
 if(!Number.isFinite(value)||Math.abs(value-rounded)>1e-7||rounded<3000||rounded>600000)throw Error('Music needs 3–600 seconds in whole milliseconds.')
 return rounded
}
export function buildMusicRequestFromData(data:StudioNodeData,prompt=data.prompt??''):MusicRequest {
 if(!isDirectMusicNode(data))throw Error('Choose a current direct ElevenLabs Music node.')
 const modelId=data.musicModelId as MusicModel
 const outputFormat=(data.audioOutputFormat??'auto') as MusicOutputFormat
 if(!(MUSIC_ENCODED_OUTPUT_FORMATS as readonly string[]).includes(outputFormat))throw Error('Choose an encoded Music output format; raw audio delivery is unavailable.')
 const mode=data.musicGenerationMode??'prompt'
 let request:MusicRequest
 if(mode==='plan') request={...musicRequestFromPlanDrafts(modelId,data.musicPlanDrafts??initialMusicPlanDrafts()),outputFormat,...data.seed===undefined?{}:{seed:data.seed}}
 else if(mode==='prompt') request={mode:'prompt',modelId,outputFormat,prompt,durationMs:musicPromptDurationMs(data.musicSeconds??String(data.duration??3)),forceInstrumental:data.forceInstrumental??false}
 else throw Error('Choose Prompt or Custom lyrics for Music.')
 compileMusicRequest(request)
 return request
}
export function musicDraftIssue(data:StudioNodeData,prompt?:string):string|undefined { try { buildMusicRequestFromData(data,prompt);return undefined } catch(error) { return error instanceof Error?error.message:'Check the Music fields.' } }
