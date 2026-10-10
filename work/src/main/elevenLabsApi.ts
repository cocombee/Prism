import { isElevenDialogue, type ElevenVoiceSegment } from '../shared/elevenDialogue'
import { elevenVoicePreviewUrl } from '../shared/elevenVoicePreview'
import type { GenerationRequest, ServiceModelAvailability } from '../shared/types'
import { compileElevenAudioRequest, directElevenLanguage, ELEVENLABS_API, type ElevenSpeechModel } from '../shared/elevenLabsAudio'

export interface ElevenApiOptions { fetch: typeof fetch; key: string; signal?: AbortSignal; assertSubmission?: () => void }
export interface ElevenAlignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}
export interface ElevenAudioResponse {
  bytes: Buffer
  modelId: string
  outputFormat: string
  requestId?: string
  alignment?: ElevenAlignment
  normalizedAlignment?: ElevenAlignment
  voiceSegments?: ElevenVoiceSegment[]
}

function deadline(signal: AbortSignal | undefined, ms: number): AbortSignal {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms)
}

async function boundedBody(response: Response, maximum: number, signal?: AbortSignal): Promise<Buffer> {
  const length = Number(response.headers.get('content-length'))
  if (Number.isFinite(length) && length > maximum) {
    await response.body?.cancel()
    throw new Error('ElevenLabs response exceeds the supported size.')
  }
  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    for (;;) {
      signal?.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maximum) throw new Error('ElevenLabs response exceeds the supported size.')
      chunks.push(Buffer.from(value))
    }
    signal?.throwIfAborted()
    return Buffer.concat(chunks, total)
  } catch (error) { await reader.cancel().catch(() => undefined); throw error }
  finally { reader.releaseLock() }
}

async function boundedJson(response: Response, maximum: number, signal?: AbortSignal): Promise<unknown> {
  return JSON.parse((await boundedBody(response, maximum, signal)).toString('utf8')) as unknown
}

async function checkedResponse(options: ElevenApiOptions, url: string, init: RequestInit = {}, timeout = 10000): Promise<Response> {
  options.signal?.throwIfAborted()
  if (init.method === 'POST') options.assertSubmission?.()
  const response = await options.fetch(url, { ...init, redirect: 'error', headers: { ...init.headers, 'xi-api-key': options.key }, signal: deadline(options.signal, timeout) })
  if (!response.ok) {
    const body = await boundedJson(response, 8192, options.signal).catch(() => ({})) as { detail?: { message?: string } | string; error?: { message?: string } }
    const detail = typeof body.detail === 'string' ? body.detail : body.detail?.message || body.error?.message
    const safe = typeof detail === 'string' ? detail.replaceAll(options.key, '[redacted]').slice(0, 400) : ''
    const error = new Error(`ElevenLabs request failed (${response.status})${safe ? `: ${safe}` : ''}`)
    Object.assign(error, { status: response.status })
    throw error
  }
  options.signal?.throwIfAborted()
  return response
}

export async function readElevenSpeechModels(options: ElevenApiOptions): Promise<ElevenSpeechModel[]> {
  const response = await checkedResponse(options, `${ELEVENLABS_API}/v1/models`)
  const raw: unknown = await boundedJson(response, 2 * 1024 * 1024, options.signal)
  if (!Array.isArray(raw)) throw new Error('ElevenLabs returned an invalid model catalog.')
  const models: ElevenSpeechModel[] = []
  const seen = new Set<string>()
  for (const record of raw) {
    if (!record || typeof record !== 'object') throw new Error('ElevenLabs returned an invalid model record.')
    const model = record as Record<string, unknown>
    if (model.can_do_text_to_speech !== true) continue
    if (typeof model.model_id !== 'string' || !model.model_id.trim()) throw new Error('ElevenLabs returned a speech model without an ID.')
    if (seen.has(model.model_id)) continue
    seen.add(model.model_id)
    const languages = Array.isArray(model.languages) ? model.languages.flatMap((raw): Array<{ id: string; label: string }> => {
      const item = raw as { language_id?: unknown; name?: unknown } | null
      if (!item || typeof item.language_id !== 'string') return []
      const id = directElevenLanguage(item.language_id)
      return id ? [{ id, label: typeof item.name === 'string' ? item.name : id }] : []
    }) : undefined
    models.push({ id: model.model_id, label: typeof model.name === 'string' ? model.name : model.model_id,
      ...(languages ? { languages } : {}),
      ...(typeof model.maximum_text_length_per_request === 'number' && Number.isFinite(model.maximum_text_length_per_request) && model.maximum_text_length_per_request > 0 ? { maxTextLength: model.maximum_text_length_per_request } : {}),
      ...(typeof model.can_do_text_to_dialogue === 'boolean' ? { supportsDialogue: model.can_do_text_to_dialogue } : {}),
      supportsStyle: model.can_use_style === true, supportsSpeakerBoost: model.can_use_speaker_boost === true })
  }
  return models
}

export async function readElevenVoices(options: ElevenApiOptions): Promise<NonNullable<ServiceModelAvailability['voices']>> {
  const voices = new Map<string, NonNullable<ServiceModelAvailability['voices']>[number]>()
  const cursors = new Set<string>()
  const initialUrl = `${ELEVENLABS_API}/v2/voices?page_size=100&include_total_count=false`
  let url = initialUrl
  for (let page = 0; page < 100; page += 1) {
    const response = await checkedResponse(options, url)
    const body = await boundedJson(response, 2 * 1024 * 1024, options.signal) as { voices?: Array<{ voice_id?: unknown; name?: unknown; preview_url?: unknown }>; has_more?: unknown; next_page_token?: unknown }
    if (!body || !Array.isArray(body.voices) || typeof body.has_more !== 'boolean') throw new Error('ElevenLabs returned an invalid voice catalog.')
    for (const voice of body.voices) {
      if (!voice || typeof voice !== 'object' || typeof voice.voice_id !== 'string' || !voice.voice_id.trim()) throw new Error('ElevenLabs returned a voice without an ID.')
      const previewUrl = elevenVoicePreviewUrl(voice.preview_url)
      if (!voices.has(voice.voice_id)) voices.set(voice.voice_id, { id: voice.voice_id, label: typeof voice.name === 'string' ? voice.name : voice.voice_id, ...(previewUrl ? { previewUrl } : {}) })
    }
    if (!body.has_more) return [...voices.values()]
    if (typeof body.next_page_token !== 'string' || !body.next_page_token || cursors.has(body.next_page_token)) throw new Error('ElevenLabs returned an invalid or repeated voice-page cursor.')
    cursors.add(body.next_page_token)
    const next = new URL(initialUrl)
    next.searchParams.set('next_page_token', body.next_page_token)
    url = next.toString()
  }
  throw new Error('ElevenLabs voice catalog page limit reached; the catalog is incomplete.')
}

export async function readElevenAvailability(options: ElevenApiOptions): Promise<ServiceModelAvailability> {
  const [models, voices] = await Promise.all([
    readElevenSpeechModels(options),
    readElevenVoices(options).then((value) => ({ value })).catch((error) => ({ error: error instanceof Error ? error.message : 'Could not load ElevenLabs voices.' })),
  ])
  options.signal?.throwIfAborted()
  return { provider: 'elevenlabs', verified: true, models,
    ...('value' in voices ? { voices: voices.value } : { voiceCatalogError: voices.error }) }
}

function alignment(value: unknown): ElevenAlignment | undefined {
  if (value === undefined || value === null) return undefined
  const item = value as ElevenAlignment
  if (!Array.isArray(item.characters) || !Array.isArray(item.character_start_times_seconds) || !Array.isArray(item.character_end_times_seconds)
    || item.characters.length !== item.character_start_times_seconds.length || item.characters.length !== item.character_end_times_seconds.length
    || item.characters.some((character) => typeof character !== 'string')
    || item.character_start_times_seconds.some((time, i) => !Number.isFinite(time) || time < 0 || !Number.isFinite(item.character_end_times_seconds[i]) || item.character_end_times_seconds[i] < time)) {
    throw new Error('ElevenLabs returned invalid character timing data.')
  }
  return { characters: item.characters, character_start_times_seconds: item.character_start_times_seconds, character_end_times_seconds: item.character_end_times_seconds }
}

function dialogueSegments(value: unknown, request: GenerationRequest, characterCount?: number): ElevenVoiceSegment[] {
  if (!Array.isArray(value)) throw new Error('ElevenLabs returned invalid speaker timing data.')
  return value.map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('ElevenLabs returned invalid speaker timing data.')
    const segment = raw as ElevenVoiceSegment, turn = request.elevenDialogueTurns?.[segment.dialogue_input_index]
    if (typeof segment.voice_id !== 'string' || !Number.isInteger(segment.dialogue_input_index) || !turn || segment.voice_id !== turn.voiceId.trim()
      || !Number.isFinite(segment.start_time_seconds) || segment.start_time_seconds < 0 || !Number.isFinite(segment.end_time_seconds) || segment.end_time_seconds < segment.start_time_seconds
      || !Number.isInteger(segment.character_start_index) || segment.character_start_index < 0 || !Number.isInteger(segment.character_end_index) || segment.character_end_index < segment.character_start_index
      || characterCount !== undefined && segment.character_end_index > characterCount) throw new Error('ElevenLabs returned invalid speaker timing data.')
    const { voice_id, start_time_seconds, end_time_seconds, character_start_index, character_end_index, dialogue_input_index } = segment
    return { voice_id, start_time_seconds, end_time_seconds, character_start_index, character_end_index, dialogue_input_index }
  })
}

export async function generateElevenAudio(options: ElevenApiOptions, request: GenerationRequest): Promise<ElevenAudioResponse> {
  // Local validation runs before any provider call. A live model check precedes the single paid POST.
  compileElevenAudioRequest(request)
  const model = request.kind === 'voiceover' ? (await readElevenSpeechModels(options)).find((model) => model.id === request.voiceModelId) : undefined
  if (request.kind === 'voiceover' && !model) throw new Error('The selected ElevenLabs model is unavailable; choose another live model.')
  const compiled = compileElevenAudioRequest(request, model)
  const response = await checkedResponse(options, compiled.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(compiled.body) }, 120000)
  let bytes: Buffer, original: ElevenAlignment | undefined, normalized: ElevenAlignment | undefined, segments: ElevenVoiceSegment[] | undefined
  if (compiled.timestamps) {
    const body = await boundedJson(response, 128 * 1024 * 1024, options.signal) as { audio_base64?: unknown; alignment?: unknown; normalized_alignment?: unknown; voice_segments?: unknown }
    if (!body || typeof body.audio_base64 !== 'string' || !body.audio_base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio_base64) || body.audio_base64.length % 4 === 1) throw new Error('ElevenLabs returned invalid timestamped audio.')
    bytes = Buffer.from(body.audio_base64, 'base64')
    if (bytes.toString('base64').replace(/=+$/, '') !== body.audio_base64.replace(/=+$/, '')) throw new Error('ElevenLabs returned invalid timestamped audio.')
    original = alignment(body.alignment); normalized = alignment(body.normalized_alignment)
    if (isElevenDialogue(request)) segments = dialogueSegments(body.voice_segments, request, original?.characters.length ?? normalized?.characters.length)
  } else {
    const contentType = response.headers.get('content-type') || ''
    if (contentType && !/^audio\//i.test(contentType) && !/^application\/octet-stream/i.test(contentType)) throw new Error('ElevenLabs returned a non-audio response.')
    bytes = await boundedBody(response, 96 * 1024 * 1024, options.signal)
  }
  if (!bytes.length) throw new Error('ElevenLabs returned empty audio.')
  options.signal?.throwIfAborted()
  return { bytes, modelId: compiled.modelId, outputFormat: compiled.outputFormat,
    ...(response.headers.get('request-id') ? { requestId: response.headers.get('request-id')! } : {}),
    ...(segments ? { voiceSegments: segments } : {}),
    ...(original ? { alignment: original } : {}), ...(normalized ? { normalizedAlignment: normalized } : {}) }
}
