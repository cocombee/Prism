import { validateSoundEffectDuration } from './soundEffectsDuration'
import { isElevenDialogue, compileElevenDialogueInputs } from './elevenDialogue'
import type { GenerationRequest, ServiceModelAvailability, StudioNodeData } from './types'
import { ELEVEN_AUDIO_OUTPUT_FORMATS } from './providerOptions'

export const ELEVENLABS_API = 'https://api.elevenlabs.io'
export const ELEVEN_SOUND_MODEL = 'eleven_text_to_sound_v2'
export const ELEVEN_DIRECT_OUTPUT_FORMATS = [
  ...ELEVEN_AUDIO_OUTPUT_FORMATS, 'mp3_24000_48', 'pcm_32000',
  'wav_8000', 'wav_16000', 'wav_22050', 'wav_24000', 'wav_32000', 'wav_44100', 'wav_48000',
] as const
export type ElevenSpeechModel = ServiceModelAvailability['models'][number]

export function isDirectElevenAudio(request: Pick<GenerationRequest, 'kind' | 'voiceEngine' | 'audioProvider'>): boolean {
  return request.kind === 'voiceover' && request.voiceEngine === 'elevenlabs-direct'
    || request.kind === 'sound-effects' && request.audioProvider === 'elevenlabs'
}

export function directElevenLanguage(value?: string): string | undefined {
  if (!value) return undefined
  try { return new Intl.Locale(value).language }
  catch { throw new Error('Choose a valid ElevenLabs language code.') }
}

export function elevenSupportsSpeed(modelId?: string): boolean {
  return /_v[123](?:_|$)/i.test(modelId || '')
}

export function elevenSpeechModelsByVersion(models: ElevenSpeechModel[], savedId?: string): ElevenSpeechModel[] {
  const version = (id: string) => {
    const match = id.match(/_v(\d+)(?:_(\d+))?/i)
    return [Number(match?.[1] || 0), Number(match?.[2] || 0)]
  }
  const seen = new Set<string>()
  const sorted = models.filter(model => model.supportsTextToSpeech !== false).sort((a, b) => {
    const left = version(a.id), right = version(b.id)
    return right[0] - left[0] || right[1] - left[1] || a.id.localeCompare(b.id)
  }).filter((model) => { if (seen.has(model.id)) return false; seen.add(model.id); return true })
  // Featured shortcuts never hide the rest of this provider's live catalog.
  // The saved ID remains owned by the caller; refresh never rewrites it.
  void savedId
  return sorted
}

export function directElevenLanguageOptions(model?: ElevenSpeechModel): Array<{ value: string; label: string }> {
  return [{ value: '', label: 'Auto' }, ...(model?.id === 'eleven_multilingual_v2' ? [] : model?.languages || []).map((language) => ({ value: language.id, label: language.label }))]
}

/** Model changes are explicit; refreshing a catalog never invokes this patch. */
export function voiceModelSelectionPatch(selection: string, data: Pick<StudioNodeData, 'voiceEngine' | 'voice' | 'languageCode'>, models: ElevenSpeechModel[], fishModels: ServiceModelAvailability['models'] = []): Partial<StudioNodeData> | undefined {
  if (selection === 'elevenlabs') return { voiceEngine: 'elevenlabs', voice: data.voiceEngine === 'elevenlabs-direct' ? 'Rachel' : data.voice, languageCode: 'eng', error: undefined }
  if (selection.startsWith('fish-audio::')) {
    const model = selection.slice('fish-audio::'.length)
    if (fishModels.some(item => item.id === model)) return { voiceEngine: 'fish-audio', fishModel: model, error: undefined }
    return undefined
  }
  const id = selection.startsWith('elevenlabs-direct::') ? selection.slice('elevenlabs-direct::'.length) : ''
  const model = models.find((item) => item.id === id)
  if (!model) return undefined
  const language = data.voiceEngine === 'elevenlabs-direct' ? data.languageCode : undefined
  return { voiceEngine: 'elevenlabs-direct', voiceModelId: id, voice: data.voiceEngine === 'elevenlabs-direct' ? data.voice : undefined,
    languageCode: directElevenLanguageOptions(model).some((item) => item.value === language) ? language : undefined, error: undefined }
}

export function directElevenAvailabilityError(request: GenerationRequest, availability?: ServiceModelAvailability): string | undefined {
  if (request.kind !== 'voiceover' || request.voiceEngine !== 'elevenlabs-direct' || !availability?.verified) return undefined
  const model = availability.models.find((item) => item.id === request.voiceModelId)
  if (!model) return 'The selected ElevenLabs speech model is unavailable; choose another live model.'
  if (request.elevenSpeechMode === 'voice-change') return model.supportsVoiceConversion ? undefined : 'Choose an available Voice Change model.'
  try { compileElevenAudioRequest(request, model) }
  catch (error) { return error instanceof Error ? error.message : 'Check the ElevenLabs settings.' }
  return undefined
}

export function audioGenerationLabel(data: Pick<StudioNodeData, 'kind' | 'voiceEngine' | 'voiceModelId' | 'fishModel' | 'musicVersion' | 'musicModelId'>, availability?: ServiceModelAvailability): string | undefined {
  if (data.kind === 'music-generator' && data.musicVersion === 1) return ({ music_v1: 'ElevenLabs Music v1', music_v2: 'ElevenLabs Music v2', music_v2_5: 'ElevenLabs Music v2.5' } as const)[data.musicModelId!] || 'ElevenLabs Music'
  if (data.kind === 'sound-effects') return 'ElevenLabs Sound Effects v2'
  if (data.kind !== 'voiceover') return undefined
  if (data.voiceEngine === 'fish-audio') return (availability?.provider === 'fish' ? availability.models.find(model => model.id === data.fishModel)?.label : undefined) || `Fish Audio ${data.fishModel || 's2-pro'}`
  if (data.voiceEngine === 'elevenlabs-direct') return availability?.models.find((model) => model.id === data.voiceModelId)?.label || data.voiceModelId || 'ElevenLabs speech'
  return 'ElevenLabs Eleven v3'
}

function boundedNumber(value: number | undefined, fallback: number, min: number, max: number, name: string): number {
  const selected = value ?? fallback
  if (!Number.isFinite(selected) || selected < min || selected > max) throw new Error(`${name} must be between ${min} and ${max}.`)
  return selected
}

export interface ElevenAudioCompilation {
  url: string
  body: Record<string, unknown>
  modelId: string
  outputFormat: string
  timestamps: boolean
}

export function compileElevenAudioRequest(request: GenerationRequest, model?: ElevenSpeechModel): ElevenAudioCompilation {
  if (request.elevenSpeechMode !== undefined && !['speech', 'dialogue'].includes(request.elevenSpeechMode)) throw new Error('Choose a supported speech mode.')
  if (!isDirectElevenAudio(request)) throw new Error('This request does not select direct ElevenLabs audio.')
  if (!isElevenDialogue(request) && !request.prompt?.trim()) throw new Error('Add audio text before generating.')
  const outputFormat = request.audioOutputFormat || 'mp3_44100_128'
  if (!(ELEVEN_DIRECT_OUTPUT_FORMATS as readonly string[]).includes(outputFormat)) throw new Error('Choose a supported ElevenLabs output format.')
  const query = new URLSearchParams({ output_format: outputFormat }).toString()
  if (request.kind === 'sound-effects') {
    return {
      url: `${ELEVENLABS_API}/v1/sound-generation?${query}`, modelId: ELEVEN_SOUND_MODEL, outputFormat, timestamps: false,
      body: { text: request.prompt, model_id: ELEVEN_SOUND_MODEL, loop: Boolean(request.loop),
        duration_seconds: validateSoundEffectDuration(request.duration, 'elevenlabs'),
        prompt_influence: boundedNumber(request.promptInfluence, 0.3, 0, 1, 'Prompt influence') },
    }
  }
  if (isElevenDialogue(request)) {
    const inputs = compileElevenDialogueInputs(request, model)
    const language = directElevenLanguage(request.languageCode)
    if (language && model?.languages?.length && !model.languages.some(item => directElevenLanguage(item.id) === language)) throw new Error('The selected ElevenLabs model does not support this language.')
    const normalization = request.textNormalization || 'auto'
    if (!['auto', 'on', 'off'].includes(normalization)) throw new Error('Choose a valid text-normalization mode.')
    if (request.voiceSeed !== undefined && (!Number.isInteger(request.voiceSeed) || request.voiceSeed < 0 || request.voiceSeed > 4294967295)) throw new Error('Voice seed must be an integer from 0 to 4294967295.')
    for (const text of [request.previousText, request.nextText]) if (text !== undefined && Array.from(text).length > 100) throw new Error('Dialogue continuity text supports at most 100 characters.')
    const timestamps = request.voiceTimestamps !== false
    return { url: `${ELEVENLABS_API}/v1/text-to-dialogue${timestamps ? '/with-timestamps' : ''}?${query}`, modelId: request.voiceModelId!, outputFormat, timestamps,
      body: { inputs, model_id: request.voiceModelId,
        settings: { stability: boundedNumber(request.stability, 0.5, 0, 1, 'Stability'), similarity: boundedNumber(request.similarityBoost, 0.75, 0, 1, 'Similarity') },
        ...(language ? { language_code: language } : {}), apply_text_normalization: normalization,
        ...(request.previousText !== undefined ? { previous_text: request.previousText } : {}),
        ...(request.nextText !== undefined ? { future_text: request.nextText } : {}),
        ...(request.voiceSeed !== undefined ? { seed: request.voiceSeed } : {}) } }
  }
  if (!request.voice?.trim()) throw new Error('Choose an ElevenLabs voice or enter its voice ID.')
  if (!request.voiceModelId?.trim()) throw new Error('Choose a live ElevenLabs speech model.')
  if (model && model.id !== request.voiceModelId) throw new Error('The selected ElevenLabs model is unavailable; choose another live model.')
  const characterCount = Array.from(request.prompt!).length
  if (model?.maxTextLength && characterCount > model.maxTextLength) throw new Error(`The selected ElevenLabs model accepts at most ${model.maxTextLength} characters; your text has ${characterCount}.`)
  const language = directElevenLanguage(request.languageCode)
  if (language && model?.languages?.length && !model.languages.some((item) => directElevenLanguage(item.id) === language)) throw new Error('The selected ElevenLabs model does not support this language.')
  if (request.voiceModelId === 'eleven_multilingual_v2' && language) throw new Error('Multilingual v2 uses automatic language detection; choose Auto language.')
  const normalization = request.textNormalization || 'auto'
  if (!['auto', 'on', 'off'].includes(normalization)) throw new Error('Choose a valid text-normalization mode.')
  if (request.voiceSeed !== undefined && (!Number.isInteger(request.voiceSeed) || request.voiceSeed < 0 || request.voiceSeed > 4294967295)) throw new Error('Voice seed must be an integer from 0 to 4294967295.')
  const settings: Record<string, unknown> = {
    stability: boundedNumber(request.stability, 0.5, 0, 1, 'Stability'),
    similarity_boost: boundedNumber(request.similarityBoost, 0.75, 0, 1, 'Similarity'),
  }
  if (elevenSupportsSpeed(request.voiceModelId)) {
    settings.speed = boundedNumber(request.speed, 1, 0.25, 4, 'Speed')
    if (model?.supportsStyle && request.voiceStyle !== undefined) settings.style = boundedNumber(request.voiceStyle, 0, 0, 1, 'Style')
  }
  const timestamps = request.voiceTimestamps !== false
  return {
    url: `${ELEVENLABS_API}/v1/text-to-speech/${encodeURIComponent(request.voice.trim())}${timestamps ? '/with-timestamps' : ''}?${query}`,
    modelId: request.voiceModelId, outputFormat, timestamps,
    body: { text: request.prompt, model_id: request.voiceModelId, voice_settings: settings,
      ...(language ? { language_code: language } : {}), apply_text_normalization: normalization,
      ...(request.previousText ? { previous_text: request.previousText } : {}),
      ...(request.nextText ? { next_text: request.nextText } : {}),
      ...(request.voiceSeed !== undefined ? { seed: request.voiceSeed } : {}) },
  }
}
