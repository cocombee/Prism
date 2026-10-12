export type VoiceBrowserProvider = 'elevenlabs' | 'fal'
export type VoiceBrowserTab = 'explore' | 'mine' | 'recent'
export interface BrowserVoice {
  id: string; label: string; previewUrl?: string; description?: string; ownerId?: string
  language?: string; accent?: string; gender?: string; age?: string; useCase?: string; category?: string
  noticeDays?: number; users?: number; added?: boolean
}
export interface VoiceBrowserQuery {
  tab: VoiceBrowserTab; search?: string; page?: number; cursor?: string
  language?: string; accent?: string; useCase?: string; gender?: string; age?: string
  noticeDays?: number; excludeCustomRates?: boolean; excludeLiveModerated?: boolean; highQuality?: boolean
  createdBy?: 'personal' | 'community' | 'workspace'; category?: 'generated' | 'cloned' | 'professional' | 'premade'
  collectionId?: string; sort?: 'trending' | 'latest' | 'users' | 'usage' | 'alphabetical'
}
export interface VoiceBrowserPage { voices: BrowserVoice[]; hasMore: boolean; cursor?: string }
export interface VoiceBrowserFacets { accents: Array<{ language: string; accent: string; label: string }>; collections: Array<{ id: string; label: string }>; collectionsError?: string }
/** Default/legacy and unknown categories must never expose a destructive library action. */
export function canRemoveBrowserVoice(voice: BrowserVoice): boolean {
  return ['generated', 'cloned', 'professional'].includes(voice.category || '')
}
export const VOICE_USE_CASES = [
  { value: 'conversational', label: 'Conversational' }, { value: 'narrative_story', label: 'Narration' },
  { value: 'characters_animation', label: 'Characters' }, { value: 'social_media', label: 'Social Media' },
  { value: 'informative_educational', label: 'Educational' }, { value: 'advertisement', label: 'Advertisement' }, { value: 'entertainment_tv', label: 'Entertainment' },
]
export function validateVoiceQuery(value: unknown): VoiceBrowserQuery {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid voice query.')
  const raw = value as Record<string, unknown>, out: Record<string, unknown> = {}
  const enums: Record<string, readonly string[]> = { tab: ['explore', 'mine', 'recent'], createdBy: ['personal','community','workspace'], category: ['generated','cloned','professional','premade'], sort: ['trending','latest','users','usage','alphabetical'], gender: ['male','female','neutral'], age: ['young','middle_aged','old'], useCase: VOICE_USE_CASES.map(x => x.value) }
  const text = ['search','cursor','language','accent','collectionId'], flags = ['excludeCustomRates','excludeLiveModerated','highQuality']
  for (const [key, v] of Object.entries(raw)) {
    if (v === undefined || v === '') continue
    if (enums[key]) { if (typeof v !== 'string' || !enums[key].includes(v)) throw new Error('Invalid voice filter.'); out[key] = v }
    else if (text.includes(key)) { if (typeof v !== 'string' || v.length > (key === 'cursor' ? 1024 : 256) || /[\x00-\x1f]/.test(v)) throw new Error('Invalid voice filter.'); out[key] = v }
    else if (flags.includes(key)) { if (typeof v !== 'boolean') throw new Error('Invalid voice filter.'); out[key] = v }
    else if (key === 'page') { if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 1000) throw new Error('Invalid voice page.'); out[key] = v }
    else if (key === 'noticeDays') { if (typeof v !== 'number' || ![30,90,365,730,4015].includes(v)) throw new Error('Invalid notice period.'); out[key] = v }
    else throw new Error('Unknown voice filter.')
  }
  if (!out.tab) throw new Error('Choose a voice tab.')
  return out as unknown as VoiceBrowserQuery
}
export function voicePathId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(value)) throw new Error('Invalid voice identity.')
  return value
}
export function filterBrowserVoices(voices: BrowserVoice[], query: VoiceBrowserQuery): BrowserVoice[] {
  const term = (query.search || '').toLocaleLowerCase()
  const result = voices.filter(v => (!term || `${v.label} ${v.description || ''} ${v.accent || ''}`.toLocaleLowerCase().includes(term)) &&
    (!query.language || v.language === query.language) && (!query.accent || v.accent === query.accent) &&
    (!query.gender || v.gender?.toLowerCase() === query.gender) && (!query.age || v.age === query.age) &&
    (!query.useCase || v.useCase === query.useCase) && (!query.category || v.category === query.category) &&
    (!query.noticeDays || (v.noticeDays ?? 0) >= query.noticeDays))
  return query.sort === 'alphabetical' ? result.sort((a,b) => a.label.localeCompare(b.label)) : result
}
