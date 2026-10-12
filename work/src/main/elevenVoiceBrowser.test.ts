import {describe,it,expect,vi} from 'vitest'
import {browseElevenVoices,voiceBrowserUrl,readVoiceFacets,addElevenSharedVoice,removeElevenVoice,normalizeBrowserVoice,readFalBrowserVoices} from './elevenVoiceBrowser'
import {validateVoiceQuery} from '../shared/voiceBrowser'
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}})
const key='fictional-key'
describe('provider-owned voice browser',()=>{
 it('bounds queries, rejects injection fields and preserves encoded search/cursor',()=>{
  for(const q of [{tab:'wrong'},{tab:'mine',url:'https://evil.test'},{tab:'explore',page:-1},{tab:'mine',search:'a'.repeat(257)},{tab:'mine',highQuality:'yes'}])expect(()=>validateVoiceQuery(q)).toThrow()
  const url=new URL(voiceBrowserUrl({tab:'mine',search:'hello&voice_type=workspace',cursor:'/+=',collectionId:'collection-one',gender:'female',sort:'alphabetical'}),'https://api.elevenlabs.io')
  expect(url.pathname).toBe('/v2/voices');expect(url.searchParams.get('search')).toBe('hello&voice_type=workspace');expect(url.searchParams.get('next_page_token')).toBe('/+=');expect(url.searchParams.get('voice_type')).toBe('saved');expect(url.searchParams.get('sort')).toBe('name')
 })
 it('uses the observed infinity and saved-library bindings without borrowing accounts',()=>{
  const url=new URL(voiceBrowserUrl({tab:'mine',noticeDays:4015}),'https://api.elevenlabs.io');expect(url.searchParams.get('min_notice_period_days')).toBe('4015');expect(url.searchParams.get('voice_type')).toBe('saved')
  expect(()=>validateVoiceQuery({tab:'mine',noticeDays:100000})).toThrow()
 })
 it('normalizes only safe display metadata and validates ID and URL',()=>{
  expect(normalizeBrowserVoice({voice_id:'one',name:'One',labels:{language:'en',accent:'american'},preview_url:'http://localhost/private',samples:['private'],sharing:{email:'private'}})).toEqual({id:'one',label:'One',language:'en',accent:'american'})
  expect(()=>normalizeBrowserVoice({voice_id:'../one'})).toThrow()
 })
 it('keeps the documented saved-voice user count without forwarding private sharing fields',async()=>{
  const fetch=vi.fn().mockResolvedValue(response({voices:[{voice_id:'saved',name:'Saved',category:'professional',sharing:{cloned_by_count:427078,email:'private',original_voice_id:'original'}},{voice_id:'zero',name:'Zero',sharing:{cloned_by_count:0}}],has_more:false}))
  const result=await browseElevenVoices({fetch,key},{tab:'mine'})
  expect(result.voices).toEqual([{id:'saved',label:'Saved',category:'professional',users:427078},{id:'zero',label:'Zero',users:0}]);expect(fetch).toHaveBeenCalledOnce();expect(new URL(fetch.mock.calls[0][0]).pathname).toBe('/v2/voices')
 })
 it('preserves valid public-count precedence and rejects malformed nested counts',()=>{
  expect(normalizeBrowserVoice({voice_id:'one',name:'One',cloned_by_count:0,sharing:{cloned_by_count:50}}).users).toBe(0)
  for(const sharing of [null,'private',[],{cloned_by_count:'50'},{cloned_by_count:-1},{cloned_by_count:1.5},{cloned_by_count:Number.MAX_SAFE_INTEGER+1}])expect(normalizeBrowserVoice({voice_id:'one',name:'One',sharing}).users).toBeUndefined()
 })
 it('pages public Explore without an auth header, applies actual filter parameters and never downloads previews',async()=>{
  const fetch=vi.fn().mockResolvedValue(response({voices:[{voice_id:'one',name:'One',public_owner_id:'owner',preview_url:'https://cdn.example.com/one.mp3'}],has_more:true}))
  const result=await browseElevenVoices({fetch,key:''},{tab:'explore',page:0,gender:'female',useCase:'characters_animation',highQuality:true,excludeCustomRates:true,sort:'users'})
  const url=new URL(fetch.mock.calls[0][0]);expect(url.searchParams.get('page')).toBe('0');expect(url.searchParams.get('category')).toBe('high_quality');expect(url.searchParams.get('include_custom_rates')).toBe('false');expect(url.searchParams.get('sort')).toBe('cloned_by_count')
  expect(fetch.mock.calls[0][1].headers).toEqual({});expect(fetch).toHaveBeenCalledOnce();expect(url.searchParams.get('page_size')).toBe('3');expect(result.hasMore).toBe(false)
 })
 it('retains authenticated full browsing and rejects unauthenticated pagination before a request',async()=>{
  const fetch=vi.fn().mockResolvedValue(response({voices:[],has_more:true}))
  const page=await browseElevenVoices({fetch,key},{tab:'explore',page:1})
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get('page_size')).toBe('30');expect(page.hasMore).toBe(true)
  await expect(browseElevenVoices({fetch,key:''},{tab:'explore',page:1})).rejects.toThrow(/direct ElevenLabs/)
  expect(fetch).toHaveBeenCalledOnce()
 })
 it('rejects missing/repeated account cursors and oversize bodies',async()=>{
  for(const body of [{voices:[],has_more:true},{voices:[],has_more:true,next_page_token:'repeat'}])await expect(browseElevenVoices({fetch:vi.fn().mockResolvedValue(response(body)),key},{tab:'mine',cursor:'repeat'})).rejects.toThrow(/cursor/)
  const fetch=vi.fn().mockResolvedValue(new Response('x',{headers:{'content-length':String(3*1024*1024)}}));await expect(browseElevenVoices({fetch,key},{tab:'mine'})).rejects.toThrow(/size/)
 })
 it('loads language-dependent facets from the official accent owner, preserves partial collection failures',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response({accents:[{language:'ms',accent:'standard',name:'Standard',private_field:'hidden'}]})).mockResolvedValueOnce(response({detail:{message:'not allowed'}},403))
  const facets=await readVoiceFacets({fetch,key},true);expect(facets.accents).toEqual([{language:'ms',accent:'standard',label:'Standard'}]);expect(facets.collectionsError).toContain('403');expect(facets.collections).toEqual([])
 })
 it('adds only on explicit submission with new_name, returned identity, no retry and renewed ownership checks',async()=>{
  const fetch=vi.fn().mockResolvedValue(response({voice_id:'new-id'})),assertSubmission=vi.fn()
  expect(await addElevenSharedVoice({fetch,key,assertSubmission},{id:'old-id',ownerId:'owner',label:'New Name'})).toBe('new-id')
  expect(fetch).toHaveBeenCalledOnce();expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({new_name:'New Name',bookmarked:true});expect(assertSubmission).toHaveBeenCalledTimes(2)
  const blocked=vi.fn(()=>{throw new DOMException('Changed','AbortError')});await expect(addElevenSharedVoice({fetch,key,assertSubmission:blocked},{id:'old',ownerId:'owner',label:'One'})).rejects.toMatchObject({name:'AbortError'});expect(fetch).toHaveBeenCalledOnce()
 })
 it('uses documented fal built-in names rather than descriptive ElevenLabs titles',async()=>{
  const fetch=vi.fn().mockResolvedValue(response({voices:[{voice_id:'roger',name:'Roger - Laid-Back, Casual, Resonant'}]}))
  expect(await readFalBrowserVoices({fetch,key:''})).toEqual([{id:'roger',label:'Roger',description:'Laid-Back, Casual, Resonant'}])
 })
 it('never forwards a fal credential to public ElevenLabs',async()=>{
  const fetch=vi.fn().mockResolvedValue(response({voices:[{voice_id:'voice',name:'Voice'}]}));await readFalBrowserVoices({fetch,key:'fal-fiction'});expect(fetch.mock.calls[0][1].headers).toEqual({})
 })
 it('rejects public search locally rather than implying full unauthenticated search',async()=>{
  const fetch=vi.fn();await expect(browseElevenVoices({fetch,key:''},{tab:'explore',search:'mizan'})).rejects.toThrow(/direct ElevenLabs model/);expect(fetch).not.toHaveBeenCalled()
 })
 it('revalidates removal category and account before a single DELETE and checks confirmation',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response({voice_id:'one',name:'One',category:'cloned'})).mockResolvedValueOnce(response({status:'ok'})),assertSubmission=vi.fn()
  await removeElevenVoice({fetch,key,assertSubmission},'one');expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[1][0]).toBe('https://api.elevenlabs.io/v1/voices/one');expect(fetch.mock.calls[1][1]).toMatchObject({method:'DELETE',headers:{'xi-api-key':key}});expect(assertSubmission).toHaveBeenCalledTimes(2)
  for(const category of ['premade','legacy','unknown',undefined]){const blocked=vi.fn().mockResolvedValue(response({voice_id:'one',name:'One',category}));await expect(removeElevenVoice({fetch:blocked,key},'one')).rejects.toThrow(/cannot be removed/);expect(blocked).toHaveBeenCalledOnce()}
  const unused=vi.fn();await expect(removeElevenVoice({fetch:unused,key:''},'one')).rejects.toThrow(/connection/);expect(unused).not.toHaveBeenCalled()
 })
 it('never retries removal on server failure or sends after an account change',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response({voice_id:'one',name:'One',category:'professional'})).mockResolvedValueOnce(response({detail:'unavailable'},503))
  await expect(removeElevenVoice({fetch,key},'one')).rejects.toThrow(/503/);expect(fetch).toHaveBeenCalledTimes(2)
  const stale=vi.fn().mockResolvedValue(response({voice_id:'one',name:'One',category:'generated'}));await expect(removeElevenVoice({fetch:stale,key,assertSubmission:()=>{throw new DOMException('Changed','AbortError')}},'one')).rejects.toMatchObject({name:'AbortError'});expect(stale).toHaveBeenCalledOnce()
  const incomplete=vi.fn().mockResolvedValueOnce(response({voice_id:'one',name:'One',category:'cloned'})).mockResolvedValueOnce(response({status:'pending'}));await expect(removeElevenVoice({fetch:incomplete,key},'one')).rejects.toThrow(/did not confirm/);expect(incomplete).toHaveBeenCalledTimes(2)
 })
})
