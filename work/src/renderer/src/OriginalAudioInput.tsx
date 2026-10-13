// Controlled presentation only. Main/graph owners establish availability and URL authority.
import React from 'react'
import {Plus} from 'lucide-react'
import {AudioPlayer} from './AudioPlayer'

export type OriginalAudioAvailability =
 | {status:'empty'}
 | {status:'unavailable';assetId:string;revision:string;fileName:string}
 | {status:'ready';assetId:string;revision:string;fileName:string;origin:'imported'|'generated';previewUrl:string}

export function OriginalAudioInput({source,onAdd}:{source:OriginalAudioAvailability;onAdd:()=>void}){
 const title=source.status==='empty'?'Original Audio':source.fileName
 return <section aria-label="Original Audio" data-original-state={source.status} style={{padding:'var(--node-body-inset)',minWidth:0,display:'grid',gap:'var(--selector-content-inset)'}}>
  <div className="voice-primary-controls" style={{padding:0,border:0}}>
  <label className="adaptive-control-label"><span title={title} style={{minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</span>
  {source.status==='ready'
   ? <div data-original-preview style={{borderRadius:'var(--node-shell-radius)',overflow:'hidden'}}><AudioPlayer src={source.previewUrl}/></div>
   : <button type="button" className="storyboard-add-panels nodrag" style={{width:'100%'}} onClick={onAdd}><Plus size={12} aria-hidden="true"/>Add Original Audio</button>}
  </label>
  </div>
 </section>
}
