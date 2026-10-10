import { describe, expect, it, vi } from 'vitest'
import type { StudioNode, StudioNodeData } from './types'
import { buildGenerationRequest } from './workflowResolver'
import { generationExecutionIdentity, generationServiceProvider } from './generationServiceProvider'
import { generationRequirementFailures } from './generationReadiness'
import { audioGenerationLabel, compileElevenAudioRequest, directElevenAvailabilityError, directElevenLanguageOptions, voiceModelSelectionPatch } from './elevenLabsAudio'
import { providerEffectiveRequestControls, providerRouteLabel } from './requestPreview'
import { generateElevenAudio } from '../main/elevenLabsApi'

const node = (kind: StudioNodeData['kind'], data: Partial<StudioNodeData>): StudioNode => ({ id: 'n', type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: 'Audio', ...data } })
const speech = node('voiceover', { voiceEngine: 'elevenlabs-direct', voiceModelId: 'eleven_v4', voice: 'live-voice-id', prompt: '  [whispers] Salam.\n  ', languageCode: 'msa', speed: 1.2, voiceStyle: 0.7, previousText: 'Before', nextText: 'After', voiceSeed: 11, voiceTimestamps: true, audioOutputFormat: 'wav_16000' })
const liveModel = { id: 'eleven_v4', label: 'v4', maxTextLength: 10000, languages: [{ id: 'ms', label: 'Malay' }] }

describe('graph to native audio request', () => {
  it('carries exact local text and all supported controls through the actual request compiler and HTTP adapter', async () => {
    const request = buildGenerationRequest(speech, [speech], [])
    expect(request.prompt).toBe(speech.data.prompt)
    expect(request.languageCode).toBe('ms')
    expect(generationServiceProvider(speech.data)).toBe('elevenlabs')
    expect(audioGenerationLabel(speech.data, { provider: 'elevenlabs', verified: true, models: [liveModel] })).toBe('v4')
    expect(generationRequirementFailures(request)).toEqual([])
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{ model_id: 'eleven_v4', name: 'v4', can_do_text_to_speech: true, languages: [{ language_id: 'ms', name: 'Malay' }] }]))).mockResolvedValueOnce(new Response(JSON.stringify({ audio_base64: 'YXVkaW8=' })))
    await generateElevenAudio({ fetch, key: 'test-placeholder' }, request)
    const posts = fetch.mock.calls.filter(([, options]) => options.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0][0]).toBe('https://api.elevenlabs.io/v1/text-to-speech/live-voice-id/with-timestamps?output_format=wav_16000')
    const body = JSON.parse(posts[0][1].body)
    expect(body).toEqual(compileElevenAudioRequest(request, liveModel).body)
    expect(body.voice_settings).not.toHaveProperty('speed')
    expect(body.voice_settings).not.toHaveProperty('style')
    expect(body.text).toBe(speech.data.prompt)
  })
  it('keeps fal, Fish and direct credentials independent while recording ElevenLabs as the fal model vendor', () => {
    expect(generationServiceProvider({ kind: 'voiceover', voiceEngine: 'elevenlabs' })).toBe('fal')
    expect(generationServiceProvider({ kind: 'voiceover' })).toBe('fal')
    expect(generationServiceProvider({ kind: 'voiceover', voiceEngine: 'fish-audio' })).toBe('fish')
    expect(generationServiceProvider({ kind: 'sound-effects' })).toBe('fal')
    expect(generationServiceProvider({ kind: 'sound-effects', audioProvider: 'elevenlabs' })).toBe('elevenlabs')
    expect(generationExecutionIdentity({ kind: 'voiceover', voiceEngine: 'elevenlabs' })).toEqual({ executionProvider: 'fal', modelVendor: 'elevenlabs' })
  })
  it('preserves self-contained effect inputs and routes exact text with 30-second controls', () => {
    const effect = node('sound-effects', { audioProvider: 'elevenlabs', prompt: '  Distant rain  ', duration: 30, loop: true, promptInfluence: 0.8 })
    const prompt: StudioNode = { id: 'p', type: 'prompt', position: { x: 0, y: 0 }, data: { kind: 'prompt', title: 'Prompt', prompt: 'Distant rain' } }
    expect(() => buildGenerationRequest(effect, [prompt, effect], [{ id: 'edge', source: 'p', target: 'n', sourceHandle: 'text-out', targetHandle: 'text-in' }])).toThrow(/self-contained/)
    const request = buildGenerationRequest(effect, [effect], [])
    expect(compileElevenAudioRequest(request).body).toMatchObject({ text: '  Distant rain  ', duration_seconds: 30, loop: true, prompt_influence: 0.8 })
  })
  it('blocks explicit missing models, IDs and metadata limits without changing saved route identity', () => {
    const request = buildGenerationRequest(speech, [speech], [])
    expect(generationRequirementFailures({ ...request, voice: '' }).join(' ')).toMatch(/voice ID/)
    expect(generationRequirementFailures({ ...request, voiceModelId: undefined }).join(' ')).toMatch(/live ElevenLabs speech model/)
    expect(directElevenAvailabilityError(request, { provider: 'elevenlabs', verified: true, models: [] })).toMatch(/unavailable/)
    expect(directElevenAvailabilityError(request, { provider: 'elevenlabs', verified: true, models: [{ ...liveModel, maxTextLength: 1 }] })).toMatch(/characters/)
    expect(request.voiceModelId).toBe('eleven_v4')
  })
  it('clears fal voice-name and language assumptions only on an explicit native-model switch', () => {
    expect(voiceModelSelectionPatch('elevenlabs-direct::eleven_v4', { voiceEngine: 'elevenlabs', voice: 'Rachel', languageCode: 'eng' }, [liveModel])).toMatchObject({ voiceEngine: 'elevenlabs-direct', voiceModelId: 'eleven_v4', voice: undefined, languageCode: undefined })
    expect(voiceModelSelectionPatch('elevenlabs-direct::unknown', speech.data, [liveModel])).toBeUndefined()
    expect(voiceModelSelectionPatch('elevenlabs-direct::eleven_v4', { ...speech.data, languageCode: 'ms' }, [liveModel])?.voice).toBe('live-voice-id')
    expect(directElevenLanguageOptions({ id: 'eleven_multilingual_v2', label: 'v2', languages: [{ id: 'ms', label: 'Malay' }] })).toEqual([{ value: '', label: 'Auto' }])
  })
  it('previews the actual native route and supported controls rather than stale fal or v4 speed fields', () => {
    const request = buildGenerationRequest(speech, [speech], [])
    expect(providerRouteLabel(request)).toBe('elevenlabs/eleven_v4')
    expect(providerRouteLabel({ ...request, voiceEngine: 'elevenlabs' })).toBe('fal-ai/elevenlabs/tts/eleven-v3')
    const { text: _text, ...body } = compileElevenAudioRequest(request, liveModel).body
    expect(providerEffectiveRequestControls(request, liveModel)).toEqual({ ...body, output_format: 'wav_16000' })
  })
})
