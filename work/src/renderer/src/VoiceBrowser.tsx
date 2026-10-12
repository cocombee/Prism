import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownWideNarrow, ChevronDown, Mic2, Minus, Plus, Search, Trash2, X } from 'lucide-react'
import type { ServiceModelAvailability } from '../../shared/types'
import { canRemoveBrowserVoice, VOICE_USE_CASES, type BrowserVoice, type VoiceBrowserFacets, type VoiceBrowserPage, type VoiceBrowserProvider, type VoiceBrowserQuery } from '../../shared/voiceBrowser'
import { voiceLanguageFlag } from '../../shared/voiceLanguages'
import { ElevenVoiceSampleButton } from './ElevenVoiceSampleButton'
type Selector = ComponentType<{ ariaLabel: string; fillTrack?: boolean; value: string; options: Array<{value:string;label:string;disabled?:boolean;iconText?:string}>; onChange(value:string):void }>
interface Props { provider: VoiceBrowserProvider; availability?: ServiceModelAvailability; Selector: Selector; onSelect(voice: BrowserVoice):void; onClose():void; onRefresh?():Promise<void> }
export function VoiceBrowser({provider,availability,Selector,onSelect,onClose,onRefresh}: Props) {
  const [query,setQuery] = useState<VoiceBrowserQuery>({tab:provider==='fal'?'mine':'explore',sort:provider==='fal'?'latest':'trending'})
  const [page,setPage] = useState<VoiceBrowserPage>({voices:[],hasMore:false}), [facets,setFacets] = useState<VoiceBrowserFacets>({accents:[],collections:[]})
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(''), [error,setError] = useState(''), [facetsError,setFacetsError] = useState('')
  const [removal,setRemoval] = useState<BrowserVoice | null>(null)
  const removalRef = useRef(removal), removalBusy = useRef(new Set<string>())
  const [pendingRemovals,setPendingRemovals] = useState(new Set<string>())
  const [removedVoices,setRemovedVoices] = useState(new Set<string>())
  removalRef.current = removal
  const [added,setAdded] = useState<Record<string,string>>({})
  const pageIndex = useRef(0)
  const epoch = useRef(0), alive = useRef(true), modal = useRef<HTMLElement>(null), close = useRef(onClose)
  close.current = onClose
  const cancelRemoval = () => {
    setRemoval(null)
    window.requestAnimationFrame(() => modal.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus())
  }
  useLayoutEffect(() => {
    alive.current = true
    const prior = document.activeElement as HTMLElement | null
    modal.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (removalRef.current) cancelRemoval(); else close.current(); return }
      if (event.key !== 'Tab') return
      const focus = Array.from(document.querySelectorAll<HTMLElement>(removalRef.current ? '.voice-remove-confirm button:not(:disabled)' : '.voice-browser button:not(:disabled), .voice-browser input:not(:disabled), .grouped-menu-select-menu button:not(:disabled)')).filter(x => x.offsetParent !== null)
      if (!focus.length) return
      const first = focus[0], last = focus.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown',keys)
    return () => { alive.current = false; epoch.current++; document.removeEventListener('keydown',keys); prior?.focus() }
  },[])
  useEffect(() => { let current=true; void window.prism.services.voiceFacets(provider).then(value => { if (current) setFacets(value) },e => {if(current)setFacetsError(e instanceof Error ? e.message : 'Filters unavailable.')}); return()=>{current=false} },[provider])
  const signature = JSON.stringify(query)
  useEffect(() => {
    const token = ++epoch.current
    pageIndex.current = 0
    setLoading(true); setError(''); setPage({voices:[],hasMore:false})
    const timer = setTimeout(() => { void window.prism.services.browseVoices(provider,query).then(value => { if (alive.current && token === epoch.current) {setPage(value);setLoading(false)} }, e => {if(alive.current && token===epoch.current){setError(e instanceof Error?e.message:'Voices unavailable.');setLoading(false)}}) },250)
    return () => {clearTimeout(timer);epoch.current++}
  },[signature,provider])
  const patch = (value: Partial<VoiceBrowserQuery>) => setQuery(q => ({...q,...value,page:undefined,cursor:undefined}))
  const loadMore = () => {
    const token = ++epoch.current; setLoading(true)
    const next = {...query,page:pageIndex.current+1,cursor:page.cursor}
    void window.prism.services.browseVoices(provider,next).then(value => {if(alive.current && token===epoch.current){setPage(old=>({...value,voices:[...new Map([...old.voices,...value.voices].map(v=>[v.id,v])).values()]}));pageIndex.current=next.page;setLoading(false)}},e=>{if(alive.current&&token===epoch.current){setError(e instanceof Error?e.message:'Voices unavailable.');setLoading(false)}})
  }
  const perform = async (voice: BrowserVoice, use: boolean) => {
    if (busy) return
    setBusy(voice.id);setError('')
    try {
      let id = added[voice.id] || voice.id
      if (provider === 'elevenlabs' && query.tab === 'explore' && voice.ownerId && !voice.added && !added[voice.id]) {
        id = await window.prism.services.addSharedVoice({id:voice.id,ownerId:voice.ownerId,label:voice.label})
        if (!alive.current) return
        setAdded(old=>({...old,[voice.id]:id}))
        setRemovedVoices(old=>{const next=new Set(old);next.delete(voice.id);next.delete(id);return next})
      }
      if (use) {
        const selected = await window.prism.services.selectVoice(provider,id)
        if (!alive.current) return
        onSelect(selected);onClose()
      }
      if (onRefresh) await onRefresh()
    } catch(e) { if(alive.current)setError(e instanceof Error?e.message:'Voice selection failed.') }
    finally {if(alive.current)setBusy('')}
  }
  const remove = async (voice: BrowserVoice) => {
    if (busy || removalBusy.current.has(voice.id) || provider !== 'elevenlabs' || !canRemoveBrowserVoice(voice)) return
    removalBusy.current.add(voice.id); cancelRemoval()
    setPendingRemovals(old=>new Set(old).add(voice.id));setError('')
    let removed = false
    try {
      await window.prism.services.removeVoice(voice.id)
      if (!alive.current) return
      setPage(old=>({...old,voices:old.voices.filter(v=>v.id!==voice.id)}))
      setRemovedVoices(old=>new Set(old).add(voice.id))
      removed = true
    } catch(e) {if(alive.current)setError(e instanceof Error?e.message:'Voice removal failed. Refresh My voices before trying again.')}
    finally {
      removalBusy.current.delete(voice.id)
      if(alive.current)setPendingRemovals(old=>{const next=new Set(old);next.delete(voice.id);return next})
    }
    // Confirmed deletion is complete; catalogue refresh must not hold the browser busy.
    if (removed && onRefresh) {
      const token = epoch.current
      void Promise.resolve().then(onRefresh).catch(() => {
        if (alive.current && token === epoch.current) setError('Voice removed. Could not refresh the voice catalog.')
      })
    }
  }
  const visibleVoices = page.voices.filter(voice=>!pendingRemovals.has(voice.id)&&!removedVoices.has(voice.id))
  const languages = [...new Set(facets.accents.map(a=>a.language))]
  const names = new Intl.DisplayNames(['en'],{type:'language'})
  const languageLabel = (value:string) => {try{return names.of(value)||value}catch{return value}}
  const field = (label:string,key:keyof VoiceBrowserQuery,options:Array<{value:string;label:string}>,disabled=false) => <label className="voice-browser-filter"><span>{label}</span><Selector ariaLabel={`Voice ${label}`} fillTrack value={String(query[key] || '')} options={[{value:'',label:'Any',...(key==='language'?{iconText:voiceLanguageFlag('')}: {})},...options.map(o=>({...o,disabled,...(key==='language'?{iconText:voiceLanguageFlag(o.value)}:{})}))]} onChange={value=>patch({[key]:value || undefined,...(key==='language'?{accent:undefined}:{})})}/></label>
  const flag = (label:string,key:'excludeCustomRates'|'highQuality'|'excludeLiveModerated') => <label className="voice-browser-filter"><span>{label}</span><Selector ariaLabel={`Voice ${label}`} fillTrack value={query[key]?'yes':''} options={[{value:'',label:'Any'},{value:'yes',label:key==='highQuality'?'Studio':'Exclude',disabled:query.tab==='recent' || (provider==='fal'&&query.tab==='mine')}]} onChange={value=>patch({[key]:value==='yes'?true:undefined})}/></label>
  const own = query.tab !== 'explore', local = query.tab==='recent'||(provider==='fal'&&query.tab==='mine')
  return createPortal(<><div className="modal-backdrop voice-browser-backdrop nodrag" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section ref={modal} role="dialog" aria-modal={!removal} aria-hidden={removal ? true : undefined} aria-labelledby="voice-browser-title" className="settings-modal voice-browser" onMouseDown={event=>event.stopPropagation()}>
    <header><span><Mic2 size={18}/></span><div><strong id="voice-browser-title">Select a voice</strong><small>ElevenLabs{provider==='fal'?' · fal.ai voices':''}</small></div>{pendingRemovals.size>0&&<p role="status" className="voice-removal-status">Removing voice…</p>}<button aria-label="Close voice browser" onClick={onClose}><X size={18}/></button></header>
    <div className="voice-browser-body"><aside className="voice-browser-filters" aria-label="Voice filters">
      {field('Language','language',languages.map(value=>({value,label:languageLabel(value)})))}
      {query.language && field('Accent','accent',facets.accents.filter(a=>a.language===query.language).map(a=>({value:a.accent,label:a.label})))}
      {field('Categories','useCase',VOICE_USE_CASES)}
      {field('Gender','gender',[{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'neutral',label:'Neutral'}])}
      {field('Age','age',[{value:'young',label:'Young'},{value:'middle_aged',label:'Middle Aged'},{value:'old',label:'Old'}])}
      <label className="voice-browser-filter"><span>Notice period</span><Selector ariaLabel="Voice Notice period" fillTrack value={String(query.noticeDays||'')} options={[{value:'',label:'Any'},...[30,90,365,730,4015].map((value,i)=>({value:String(value),label:['30d','90d','1y','2y','∞'][i]}))]} onChange={value=>patch({noticeDays:value?Number(value):undefined})}/></label>
      {flag('Custom rates','excludeCustomRates')}{flag('Quality','highQuality')}{flag('Live moderation','excludeLiveModerated')}
      {own && field('Created by','createdBy',[{value:'personal',label:'Me'},{value:'community',label:'Community'},{value:'workspace',label:'Workspace'}],local)}
      {own && field('Type','category',[{value:'generated',label:'Voice Design'},{value:'cloned',label:'Instant Voice Clone'},{value:'professional',label:'Professional Voice Clone'},{value:'premade',label:'Default voices'}])}
      {facetsError && <p className="voice-browser-state" role="status">{facetsError}</p>}
    </aside><div className="voice-browser-results"><div className="voice-browser-toolbar">
      <div className="inspector-segmented voice-browser-tabs" role="tablist" aria-label="Voice collections">{(['explore','mine','recent'] as const).map((tab,i)=><button key={tab} role="tab" aria-selected={query.tab===tab} className={query.tab===tab?'is-active':''} onClick={()=>{setQuery({tab,sort:tab==='explore'?'trending':'latest'})}}>{['Explore','My voices','Recents'][i]}</button>)}</div>
      {query.tab==='mine' && <div className="voice-browser-collection"><Selector ariaLabel="Voice Collection" fillTrack value={query.collectionId||''} options={[{value:'',label:'All collections'},...facets.collections.map(c=>({value:c.id,label:c.label}))]} onChange={value=>patch({collectionId:value||undefined})}/></div>}
      <label className="voice-browser-search"><Search size={14}/><input type="search" aria-label="Search voices" value={query.search||''} placeholder="Search voices" onChange={event=>patch({search:event.target.value})}/></label>
      <div className="voice-browser-sort"><ArrowDownWideNarrow size={14}/><Selector ariaLabel="Sort voices" value={query.sort||'latest'} options={query.tab==='explore'?[{value:'trending',label:'Trending'},{value:'latest',label:'Latest'},{value:'users',label:'Most users'},{value:'usage',label:'Character usage'}]:[{value:'latest',label:'Latest'},{value:'alphabetical',label:'Alphabetical'}]} onChange={value=>patch({sort:value as VoiceBrowserQuery['sort']})}/></div>
    </div><div className="voice-browser-list" data-voice-tab={query.tab} role="tabpanel" aria-label={query.tab==='recent'?'Recently selected in this project':query.tab==='mine'?'My voices':'Explore voices'} aria-busy={loading}>
      {provider==='fal' && <p className="voice-browser-state">{query.tab==='explore' ? 'Public Explore is limited to three preview voices. Search, full browsing and adding voices require a direct ElevenLabs model and connection.' : 'My voices shows fal’s supported catalog.'}</p>}
      {query.tab==='mine'&&facets.collectionsError&&<p role="status" className="voice-browser-state">{facets.collectionsError}</p>}
      {error && <p role="alert" className="voice-browser-state">{error}</p>}
      {visibleVoices.map(voice=>{const canUse=provider==='elevenlabs'||Boolean(availability?.voices?.some(v=>v.id===voice.id));const canAdd=provider==='elevenlabs'&&query.tab==='explore'&&Boolean(voice.ownerId)&&!voice.added&&!added[voice.id];const accent=voice.accent?.trim();const metadataLabel=[voice.language?languageLabel(voice.language):'',accent&&!/^(standard|hard)$/i.test(accent)?accent:''].filter(Boolean).join(' · ');return <div className="voice-browser-result" key={voice.id}><ElevenVoiceSampleButton voice={voice} availability={availability}/><div className="voice-browser-identity"><strong>{voice.label}</strong>{voice.description&&<span>{voice.description}</span>}</div><div className="voice-browser-metadata"><span>{metadataLabel}</span>{voice.users!==undefined&&<small>{voice.users.toLocaleString()} users</small>}</div><button className="grouped-menu-select voice-browser-use" disabled={!canUse||Boolean(busy)} title={!canUse?'This voice is unavailable on the selected fal route':undefined} onClick={()=>void perform(voice,true)}>{busy===voice.id?'Working…':'Use'}</button>{query.tab==='explore'&&<button className="compact-settings compact-options" aria-label={`Add ${voice.label} to My voices`} disabled={!canAdd||Boolean(busy)} title={canAdd?'Add to My voices':provider==='fal'?'Add requires a direct ElevenLabs connection':'Already added'} onClick={()=>void perform(voice,false)}><Plus size={14}/></button>}{query.tab==='mine'&&<button className="compact-settings compact-options" aria-label={`Remove ${voice.label} from My voices`} disabled={provider!=='elevenlabs'||!canRemoveBrowserVoice(voice)||Boolean(busy)} title={provider==='fal'?'fal catalog voices cannot be removed':!canRemoveBrowserVoice(voice)?'Default and legacy voices cannot be removed':'Remove from My voices'} onClick={()=>setRemoval(voice)}><Minus size={14}/></button>}</div>})}
      {loading&&<p role="status" className="voice-browser-state">Loading voices…</p>}
      {!loading&&!error&&!pendingRemovals.size&&!visibleVoices.length&&<p className="voice-browser-state">No voices found.</p>}
      {page.hasMore&&<button className="grouped-menu-select voice-browser-more" disabled={loading||Boolean(busy)} onClick={loadMore}>Load more</button>}
    </div></div></div>
  </section></div>{removal && <div className="modal-backdrop voice-remove-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)cancelRemoval()}}>
    <section className="delete-confirm-modal voice-remove-confirm" role="alertdialog" aria-modal="true" aria-labelledby="voice-remove-title" onMouseDown={event=>event.stopPropagation()}>
      <header><span><Trash2 size={18}/></span><div><strong id="voice-remove-title">Remove voice?</strong><small title={removal.label}>{removal.label}</small></div><button aria-label="Cancel voice removal" onClick={cancelRemoval}><X size={16}/></button></header>
      <p>This removes the voice from your ElevenLabs library. {removal.category==='cloned'||removal.category==='generated' ? 'Custom voices cannot be recovered.' : 'Shared voices can be added again if still available.'}</p>
      <footer><button autoFocus onClick={cancelRemoval}>Cancel</button><button className="is-danger" onClick={()=>void remove(removal)}>Remove</button></footer>
    </section>
  </div>}</>,document.body)
}
export function VoicePicker({value,onChange,provider,availability,Selector,ariaLabel='Voice',valueType='id',onRefresh}: {value:string;onChange(voice:BrowserVoice):void;provider:VoiceBrowserProvider;availability?:ServiceModelAvailability;Selector:Selector;ariaLabel?:string;valueType?:'id'|'name';onRefresh?():Promise<void>}) {
  const [open,setOpen]=useState(false),[selected,setSelected]=useState<BrowserVoice>()
  useLayoutEffect(()=>{setOpen(false)},[provider,availability?.verified])
  useLayoutEffect(()=>{setSelected(undefined)},[provider,availability])
  const saved=availability?.voices?.find(v=>valueType==='id'?v.id===value:v.label.toLowerCase()===value.toLowerCase())
  const label=saved?.label||(selected&&(valueType==='id'?selected.id:selected.label)===value?selected.label:undefined)||value||'Choose a voice'
  return <><button type="button" className="grouped-menu-select voice-primary-voice voice-browser-trigger" aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><span>{label}</span><ChevronDown size={12}/></button>{open&&<VoiceBrowser provider={provider} availability={availability} Selector={Selector} onClose={()=>setOpen(false)} onRefresh={onRefresh} onSelect={voice=>{setSelected(voice);onChange(voice)}}/>}</>
}
