import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { compileElevenAudioRequest, elevenSpeechModelsByVersion, directElevenLanguage, ELEVEN_DIRECT_OUTPUT_FORMATS, isDirectElevenAudio } from './elevenLabsAudio'

const speech: GenerationRequest = { nodeId: 'speech', kind: 'voiceover', voiceEngine: 'elevenlabs-direct', voice: 'voice/id', voiceModelId: 'eleven_v4', prompt: '  [whispers] Salam.  ', voiceTimestamps: true }

describe('direct ElevenLabs request contracts', () => {
  it('retains fal and Fish route identity unless direct ElevenLabs is explicitly selected', () => {
    expect(isDirectElevenAudio({ kind: 'voiceover', voiceEngine: 'elevenlabs' })).toBe(false)
    expect(isDirectElevenAudio({ kind: 'voiceover', voiceEngine: 'fish-audio' })).toBe(false)
    expect(isDirectElevenAudio({ kind: 'sound-effects' })).toBe(false)
    expect(isDirectElevenAudio(speech)).toBe(true)
    expect(isDirectElevenAudio({ kind: 'sound-effects', audioProvider: 'elevenlabs' })).toBe(true)
  })

  it('sends v4 text exactly, encodes the actual voice ID and omits unsupported speed/style', () => {
    const compiled = compileElevenAudioRequest({ ...speech, speed: 1.2, voiceStyle: 0.8, similarityBoost: 0.65, stability: 0.4, languageCode: 'msa', voiceSeed: 7, previousText: 'Before', nextText: 'After', textNormalization: 'off', audioOutputFormat: 'wav_44100' }, { id: 'eleven_v4', label: 'Eleven v4', languages: [{ id: 'ms', label: 'Malay' }], supportsStyle: true })
    expect(compiled.url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice%2Fid/with-timestamps?output_format=wav_44100')
    expect(compiled.body).toEqual({ text: speech.prompt, model_id: 'eleven_v4', voice_settings: { stability: 0.4, similarity_boost: 0.65 }, language_code: 'ms', apply_text_normalization: 'off', seed: 7, previous_text: 'Before', next_text: 'After' })
    expect(compileElevenAudioRequest({ ...speech, voiceModelId: 'eleven_v4_turbo', speed: 1.2 }).body.voice_settings).not.toHaveProperty('speed')
  })

  it('uses ordinary binary speech when timestamps are disabled and preserves supported older controls', () => {
    const compiled = compileElevenAudioRequest({ ...speech, voiceTimestamps: false, voiceModelId: 'eleven_multilingual_v2', speed: 1.1, voiceStyle: 0.3 }, { id: 'eleven_multilingual_v2', label: 'Multilingual v2', supportsStyle: true })
    expect(compiled.url).not.toContain('with-timestamps')
    expect(compiled.body.voice_settings).toEqual({ stability: 0.5, similarity_boost: 0.75, speed: 1.1, style: 0.3 })
    expect(compiled.body).not.toHaveProperty('language_code')
  })

  it('preserves the selected native query format for every supported direct format', () => {
    expect(ELEVEN_DIRECT_OUTPUT_FORMATS).toHaveLength(28)
    for (const format of ELEVEN_DIRECT_OUTPUT_FORMATS) expect(new URL(compileElevenAudioRequest({ ...speech, audioOutputFormat: format }).url).searchParams.get('output_format')).toBe(format)
  })

  it('uses the native 30-second effect limit without silently changing authored duration', () => {
    const compiled = compileElevenAudioRequest({ nodeId: 'fx', kind: 'sound-effects', audioProvider: 'elevenlabs', prompt: 'Wind', duration: 30, promptInfluence: 0.7, loop: true })
    expect(compiled.url).toContain('/v1/sound-generation?')
    expect(compiled.body).toEqual({ text: 'Wind', model_id: 'eleven_text_to_sound_v2', duration_seconds: 30, prompt_influence: 0.7, loop: true })
    expect(() => compileElevenAudioRequest({ nodeId: 'fx', kind: 'sound-effects', audioProvider: 'elevenlabs', prompt: 'Wind', duration: 31 })).toThrow(/duration/i)
  })

  it.each([
    { voice: '' }, { voiceModelId: '' }, { voiceSeed: -1 }, { voiceSeed: 0.4 }, { stability: 2 }, { audioOutputFormat: 'fake' },
  ])('rejects invalid direct controls before dispatch: $', (patch) => {
    expect(() => compileElevenAudioRequest({ ...speech, ...patch })).toThrow()
  })

  it('enforces live model text and language limits without truncating Unicode text', () => {
    expect(() => compileElevenAudioRequest({ ...speech, prompt: 'AB' }, { id: 'eleven_v4', label: 'v4', maxTextLength: 1 })).toThrow(/at most 1/)
    expect(compileElevenAudioRequest({ ...speech, prompt: '😊' }, { id: 'eleven_v4', label: 'v4', maxTextLength: 1 }).body.text).toBe('😊')
    expect(() => compileElevenAudioRequest({ ...speech, languageCode: 'ms' }, { id: 'eleven_v4', label: 'v4', languages: [{ id: 'en', label: 'English' }] })).toThrow(/language/)
    expect(directElevenLanguage('eng')).toBe('en')
  })

  it('sorts its own speech catalog newest first without hiding older releases or inventing saved IDs', () => {
    const models = [{ id: 'eleven_flash_v2_5', label: 'Flash v2.5' }, { id: 'eleven_v3', label: 'v3' }, { id: 'eleven_v4_turbo', label: 'v4 Turbo' }, { id: 'eleven_v4', label: 'v4' }]
    expect(elevenSpeechModelsByVersion(models).map((model) => model.id)).toEqual(['eleven_v4', 'eleven_v4_turbo', 'eleven_v3', 'eleven_flash_v2_5'])
    expect(elevenSpeechModelsByVersion(models, 'eleven_flash_v2_5').at(-1)?.id).toBe('eleven_flash_v2_5')
    expect(elevenSpeechModelsByVersion(models, 'unknown').map((model) => model.id)).not.toContain('unknown')
  })
})
