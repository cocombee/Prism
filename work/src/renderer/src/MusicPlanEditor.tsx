// Controlled Music composition editor; transport and persistence remain outside the renderer.
import React from 'react'
import {FluidControlGroup,SimpleMenuSelect} from './NodeCardNext'
import {TaggedPromptTextarea} from './TaggedPromptTextarea'
import {ArrowUp,ArrowDown,Trash2,Plus} from 'lucide-react'
import type {MusicModel} from '../../shared/musicRequest'
import {compileMusicPlanDrafts,moveMusicSection,type MusicPlanDrafts,type LyricSectionDraft} from '../../shared/musicPlanDrafts'

export function MusicPlanEditor({modelId,drafts,onChange,newSectionId}:{modelId:MusicModel;drafts:MusicPlanDrafts;onChange:(drafts:MusicPlanDrafts)=>void;newSectionId:()=>string}){
 const editorId=React.useId()
 const family=modelId==='music_v1'?'v1':'v2'
 if(!drafts?.[family]||!Array.isArray(drafts[family].sections)||drafts[family].sections.some(section=>!section||typeof section!=='object'||['id','name','seconds','lyrics','positiveStyles','negativeStyles'].some(key=>typeof section[key as keyof LyricSectionDraft]!=='string')||!['low','medium','high'].includes(section.context))||(family==='v1'&&(typeof drafts.v1.positiveStyles!=='string'||typeof drafts.v1.negativeStyles!=='string')))return <div className="music-plan-editor"><p role="alert">Check the saved Music section drafts.</p></div>
 const sections=drafts[family].sections
 const changeSections=(next:LyricSectionDraft[])=>onChange({...drafts,[family]:{...drafts[family],sections:next}})
 const patch=(id:string,field:keyof LyricSectionDraft,value:string)=>changeSections(sections.map(section=>section.id===id?{...section,[field]:value}:section))
 let error=''
 try{compileMusicPlanDrafts(modelId,drafts)}catch(e){error=(e as Error).message}
 // Match the existing AssetDescriptionField anatomy without its asset-only required semantics.
 const area=(label:string,value:string,set:(value:string)=>void,visibleLabel=label)=>{
  const fieldId=editorId+'-'+label.replaceAll(' ','-')
  return <section className="asset-reference-description nodrag" aria-label={visibleLabel+' field'}>
   <div className="asset-reference-description-header"><label className="adaptive-control-label" htmlFor={fieldId}><span>{visibleLabel}</span></label></div>
   <TaggedPromptTextarea id={fieldId} className="style-prompt-inline asset-reference-description-field" autoSize={false} aria-label={label} connectedTags={[]} value={value} placeholder={visibleLabel==='Lyrics'?'Enter lyrics…':visibleLabel==='Avoid styles'?'Add styles to avoid…':'Add musical styles…'} onValueChange={set}/>
  </section>
 }
 const scalarFields=(section:LyricSectionDraft)=>{
  const controls=[
   ...(family==='v1'?[{id:'name',kind:'selector' as const,intrinsicWidth:112,minimumWidth:72,node:<label className="adaptive-control-label"><span>Name</span><input className="voice-primary-input" aria-label={'Name '+section.id} value={section.name} onChange={event=>patch(section.id,'name',event.target.value)}/></label>}]:[]),
   {id:'seconds',kind:'selector' as const,intrinsicWidth:112,minimumWidth:72,node:<label className="adaptive-control-label"><span>Seconds</span><input className="voice-primary-input" aria-label={'Seconds '+section.id} inputMode="decimal" value={section.seconds} onChange={event=>patch(section.id,'seconds',event.target.value)}/></label>},
   ...(family==='v2'?[{id:'context',kind:'selector' as const,intrinsicWidth:112,minimumWidth:72,node:<label className="adaptive-control-label"><span>Context</span><SimpleMenuSelect ariaLabel={'Context '+section.id} fillTrack value={section.context} options={['low','medium','high'].map(value=>({value,label:value}))} onChange={value=>patch(section.id,'context',value)}/></label>}]:[]),
  ]
  return <div className="voice-primary-controls equalized-control-group nodrag"><FluidControlGroup className="voice-primary-row" ariaLabel={'Music section fields '+section.id} gap={7} allocation={{minRows:1,maxRows:2}} controls={controls} recalculationKey={JSON.stringify(section)}/></div>
 }
 return <div className="music-plan-editor">
  {family==='v1'&&<div className="music-plan-section-fields">{area('Song styles',drafts.v1.positiveStyles,positiveStyles=>onChange({...drafts,v1:{...drafts.v1,positiveStyles}}))}{area('Avoid styles',drafts.v1.negativeStyles,negativeStyles=>onChange({...drafts,v1:{...drafts.v1,negativeStyles}}))}</div>}
  {sections.map((section,index)=><section className="storyboard-panel" data-section-id={section.id} key={section.id}>
   <div className="storyboard-panel-head" style={{padding:0}}><b>Section {index+1}</b><div>
    <button aria-label={'Move '+section.id+' up'} title="Move section up" disabled={index===0} onClick={()=>changeSections(moveMusicSection(sections,section.id,-1))}><ArrowUp size={10}/></button>
    <button aria-label={'Move '+section.id+' down'} title="Move section down" disabled={index===sections.length-1} onClick={()=>changeSections(moveMusicSection(sections,section.id,1))}><ArrowDown size={10}/></button>
    <button aria-label={'Remove '+section.id} title="Remove section" disabled={sections.length===1} onClick={()=>changeSections(sections.filter(candidate=>candidate.id!==section.id))}><Trash2 size={10}/></button>
   </div></div>
   <div className="music-plan-section-fields">
    {scalarFields(section)}
    {area('Lyrics '+section.id,section.lyrics,value=>patch(section.id,'lyrics',value),'Lyrics')}
    {area('Styles '+section.id,section.positiveStyles,value=>patch(section.id,'positiveStyles',value),'Styles')}
    {area('Avoid '+section.id,section.negativeStyles,value=>patch(section.id,'negativeStyles',value),'Avoid styles')}
   </div>
  </section>)}
  <button className="storyboard-add-panels" aria-label="Add Music Section" disabled={sections.length>=30} onClick={()=>changeSections([...sections,{id:newSectionId(),name:'Section '+(sections.length+1),seconds:'3',lyrics:'',positiveStyles:'',negativeStyles:'',context:'high'}])}><Plus size={13}/>Add Section</button>
  {error&&<p role="alert" style={{margin:0,color:'var(--muted)'}}>{error}</p>}
 </div>
}
