import { falBuiltInVoiceName } from '../shared/providerOptions'
import { elevenVoicePreviewUrl } from '../shared/elevenVoicePreview'
import { ELEVENLABS_API } from '../shared/elevenLabsAudio'
import { canRemoveBrowserVoice, voicePathId, validateVoiceQuery, type BrowserVoice, type VoiceBrowserPage, type VoiceBrowserQuery, type VoiceBrowserFacets } from '../shared/voiceBrowser'
import { boundedJson, checkedResponse, type ElevenApiOptions } from './elevenLabsApi'
const text = (value: unknown, max = 256): string | undefined => typeof value === 'string' && value.length <= max ? value : undefined
export function normalizeBrowserVoice(value: unknown): BrowserVoice {
  if (!value || typeof value !== 'object') throw new Error('Invalid ElevenLabs voice.')
  const raw = value as Record<string, unknown>, labels = (raw.labels || {}) as Record<string, unknown>
  const voice: BrowserVoice = { id: voicePathId(raw.voice_id), label: text(raw.name) || String(raw.voice_id) }
  const previewUrl = elevenVoicePreviewUrl(raw.preview_url)
  if (previewUrl) voice.previewUrl = previewUrl
  const mappings = { description: raw.description, ownerId: raw.public_owner_id, language: raw.language || labels.language, accent: raw.accent || labels.accent, gender: raw.gender || labels.gender, age: raw.age || labels.age, useCase: raw.use_case || labels.use_case, category: raw.category }
  for (const [k,v] of Object.entries(mappings)) { const safe = text(v, k === 'description' ? 2048 : 256); if (safe) Object.assign(voice,{[k]:safe}) }
  if (typeof raw.notice_period === 'number' && Number.isFinite(raw.notice_period) && raw.notice_period >= 0) voice.noticeDays = raw.notice_period
  const sharing = raw.sharing && typeof raw.sharing === 'object' && !Array.isArray(raw.sharing) ? raw.sharing as Record<string, unknown> : {}
  const users = [raw.cloned_by_count, sharing.cloned_by_count].find(value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  if (typeof users === 'number') voice.users = users
  if (typeof raw.is_added_by_user === 'boolean') voice.added = raw.is_added_by_user
  return voice
}
async function read(options: ElevenApiOptions, path: string): Promise<Record<string, unknown>> {
  const response = await checkedResponse(options, `${ELEVENLABS_API}${path}`)
  const body = await boundedJson(response, 2 * 1024 * 1024, options.signal)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid ElevenLabs voice response.')
  return body as Record<string, unknown>
}
export function voiceBrowserUrl(input: VoiceBrowserQuery, publicPreview = false): string {
  const q = validateVoiceQuery(input), explore = q.tab === 'explore'
  if (q.tab === 'recent') throw new Error('Recent selections are owned by Prism.')
  if (publicPreview && (!explore || q.page || q.cursor)) throw new Error('Full Explore requires a direct ElevenLabs connection.')
  const params = new URLSearchParams({ page_size: publicPreview ? '3' : '30' })
  const fields = { search:q.search, language:q.language, accent:q.accent, gender:q.gender, age:q.age, min_notice_period_days:q.noticeDays, include_custom_rates:q.excludeCustomRates === undefined ? undefined : !q.excludeCustomRates, include_live_moderated:q.excludeLiveModerated === undefined ? undefined : !q.excludeLiveModerated }
  for (const [k,v] of Object.entries(fields)) if (v !== undefined) params.set(k,String(v))
  if (q.useCase) params.append('use_cases', q.useCase)
  if (explore) {
    params.set('page', String(q.page || 0))
    params.set('sort', { trending:'trending',latest:'created_date',users:'cloned_by_count',usage:'usage_character_count_1y',alphabetical:'created_date' }[q.sort || 'trending'])
    if (q.highQuality) params.set('category','high_quality')
  } else {
    params.set('include_total_count','false'); params.set('voice_type',q.createdBy || 'saved'); params.set('sort', q.sort === 'alphabetical' ? 'name' : 'created_at_unix'); params.set('sort_direction', q.sort === 'alphabetical' ? 'asc' : 'desc')
    if (q.cursor) params.set('next_page_token',q.cursor)
    if (q.createdBy) params.set('voice_type',q.createdBy)
    if (q.category) params.set('category',q.category)
    if (q.collectionId) params.set('collection_id',q.collectionId)
    if (q.highQuality) params.set('high_quality','true')
  }
  return `${explore ? '/v1/shared-voices' : '/v2/voices'}?${params}`
}
export async function browseElevenVoices(options: ElevenApiOptions, query: VoiceBrowserQuery): Promise<VoiceBrowserPage> {
  if (!options.key && query.search) throw new Error('Voice-library search requires a direct ElevenLabs model and connection. My voices still searches the fal catalog.')
  const body = await read(options, voiceBrowserUrl(query, !options.key))
  if (!Array.isArray(body.voices) || body.voices.length > 100 || typeof body.has_more !== 'boolean') throw new Error('Invalid ElevenLabs voice page.')
  const cursor = text(body.next_page_token,1024)
  if (query.tab === 'mine' && body.has_more && (!cursor || cursor === query.cursor)) throw new Error('Invalid or repeated ElevenLabs voice cursor.')
  const voices = [...new Map(body.voices.map(v => { const voice = normalizeBrowserVoice(v); return [voice.id,voice] as const })).values()]
  return { voices, hasMore:options.key ? body.has_more : false, ...(cursor ? {cursor} : {}) }
}
export async function readVoiceFacets(options: ElevenApiOptions, collections: boolean): Promise<VoiceBrowserFacets> {
  const body = await read(options,'/v1/voices/accents')
  if (!Array.isArray(body.accents) || body.accents.length > 5000) throw new Error('Invalid ElevenLabs accent catalog.')
  const accents = body.accents.flatMap(value => { const v = value as Record<string,unknown>; const language = text(v.language), accent = text(v.accent), label = text(v.name); return language && accent && label ? [{language,accent,label}] : [] })
  const result: VoiceBrowserFacets = {accents,collections:[]}
  if (collections) {
    try { const own = await read(options,'/v1/voices/collections'); if (!Array.isArray(own.collections) || own.collections.length > 1000) throw new Error('Invalid voice collections.'); result.collections = own.collections.map(value => { const v = value as Record<string,unknown>; return {id:voicePathId(v.collection_id),label:text(v.title) || String(v.collection_id)} }) }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') throw error; result.collectionsError = error instanceof Error ? error.message : 'Collections unavailable.' }
  }
  return result
}
export async function addElevenSharedVoice(options: ElevenApiOptions, value: unknown): Promise<string> {
  const v = value as {id?:unknown; ownerId?:unknown; label?:unknown} | null
  if (!v || !text(v.label) || !(v.label as string).trim()) throw new Error('Invalid shared voice.')
  const id = voicePathId(v.id), owner = voicePathId(v.ownerId)
  const response = await checkedResponse(options, `${ELEVENLABS_API}/v1/voices/add/${owner}/${id}`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({new_name:v.label,bookmarked:true}) })
  const body = await boundedJson(response,8192,options.signal) as {voice_id?:unknown}
  options.assertSubmission?.()
  return voicePathId(body.voice_id)
}
export async function getElevenBrowserVoice(options: ElevenApiOptions, id: unknown): Promise<BrowserVoice> {
  const requested = voicePathId(id), voice = normalizeBrowserVoice(await read(options,`/v1/voices/${requested}`))
  if (voice.id !== requested) throw new Error('ElevenLabs returned a different voice identity.')
  return voice
}
export async function removeElevenVoice(options: ElevenApiOptions, id: unknown): Promise<void> {
  if (!options.key) throw new Error('Removing a voice requires a direct ElevenLabs connection.')
  const voice = await getElevenBrowserVoice(options, id)
  if (!canRemoveBrowserVoice(voice)) throw new Error('Default, legacy and unrecognized voices cannot be removed.')
  const response = await checkedResponse(options, `${ELEVENLABS_API}/v1/voices/${voice.id}`, { method:'DELETE' })
  const body = await boundedJson(response,8192,options.signal) as {status?:unknown} | null
  if (body?.status !== 'ok') throw new Error('ElevenLabs did not confirm removal. Refresh My voices before trying again.')
  options.assertSubmission?.()
}
export async function readFalBrowserVoices(options: ElevenApiOptions): Promise<BrowserVoice[]> {
  const body = await read({...options,key:''},'/v1/voices')
  if (!Array.isArray(body.voices) || body.voices.length > 1000) throw new Error('Invalid public voice catalog.')
  return body.voices.map(value => { const voice = normalizeBrowserVoice(value); const name = falBuiltInVoiceName(voice.label); if (name !== voice.label) { voice.description ||= voice.label.slice(name.length + 3); voice.label = name } return voice })
}
