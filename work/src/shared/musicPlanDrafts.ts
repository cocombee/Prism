/** Raw author drafts survive model/mode changes; compilation never rewrites them. */
import {compileMusicRequest,type MusicModel,type MusicCompilation,type MusicRequest} from './musicRequest'
export interface LyricSectionDraft {id:string;name:string;seconds:string;lyrics:string;positiveStyles:string;negativeStyles:string;context:'low'|'medium'|'high'}
export interface MusicPlanDrafts {
  v1:{positiveStyles:string;negativeStyles:string;sections:LyricSectionDraft[];respectDurations:boolean}
  v2:{sections:LyricSectionDraft[]}
}
export function musicSectionDurationMs(raw:string):number {
  if(typeof raw!=='string'||!/^\d+(?:\.\d+)?$/.test(raw))throw Error('Enter section seconds as a decimal number.')
  const value=Number(raw)*1000,rounded=Math.round(value)
  if(!Number.isFinite(value)||Math.abs(value-rounded)>1e-7||rounded<3000||rounded>120000)throw Error('Each section needs 3–120 seconds in whole milliseconds.')
  return rounded
}
const styles=(raw:string)=>raw===''?[]:raw.split(/\r\n|\r|\n/)
export function musicRequestFromPlanDrafts(modelId:MusicModel,drafts:MusicPlanDrafts):MusicRequest {
  const family=modelId==='music_v1'?'v1':'v2',sections=drafts[family].sections
  if(new Set(sections.map(section=>section.id)).size!==sections.length||sections.some(section=>!section.id))throw Error('Music section identities must be unique.')
  if(modelId==='music_v1')return {mode:'plan',modelId,respectSectionsDurations:drafts.v1.respectDurations,plan:{positive_global_styles:styles(drafts.v1.positiveStyles),negative_global_styles:styles(drafts.v1.negativeStyles),sections:sections.map(section=>({section_name:section.name,positive_local_styles:styles(section.positiveStyles),negative_local_styles:styles(section.negativeStyles),duration_ms:musicSectionDurationMs(section.seconds),lines:section.lyrics===''?[]:section.lyrics.split(/\r\n|\r|\n/)}))}}
  return {mode:'plan',modelId,plan:{chunks:sections.map(section=>({text:section.lyrics,duration_ms:musicSectionDurationMs(section.seconds),positive_styles:styles(section.positiveStyles),negative_styles:styles(section.negativeStyles),context_adherence:section.context}))}}
}
export function moveMusicSection(sections:LyricSectionDraft[],id:string,direction:-1|1):LyricSectionDraft[]{
  const index=sections.findIndex(section=>section.id===id),next=index+direction
  if(index<0||next<0||next>=sections.length)return sections
  const result=[...sections];[result[index],result[next]]=[result[next],result[index]];return result
}

export function compileMusicPlanDrafts(modelId:MusicModel,drafts:MusicPlanDrafts):MusicCompilation {
 return compileMusicRequest(musicRequestFromPlanDrafts(modelId,drafts))
}
export function initialMusicPlanDrafts():MusicPlanDrafts {
 const section=(id:string):LyricSectionDraft=>({id,name:'Verse',seconds:'3',lyrics:'',positiveStyles:'',negativeStyles:'',context:'high'})
 return {v1:{positiveStyles:'',negativeStyles:'',respectDurations:true,sections:[section('v1-first')]},v2:{sections:[section('v2-first')]}}
}
