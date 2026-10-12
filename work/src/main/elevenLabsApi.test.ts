import { describe, expect, it, vi } from 'vitest'
import type { GenerationRequest } from '../shared/types'
import { generateElevenAudio, readElevenAvailability, readPublicElevenVoices, readElevenSpeechModels, readElevenVoices } from './elevenLabsApi'

const key = 'safe-placeholder-not-a-real-key'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const model = { model_id: 'eleven_v4', name: 'Eleven v4', can_do_text_to_speech: true, maximum_text_length_per_request: 10000, languages: [{ language_id: 'ms', name: 'Malay' }] }
const speech: GenerationRequest = { nodeId: 'n', kind: 'voiceover', voiceEngine: 'elevenlabs-direct', voice: 'voice-id', voiceModelId: 'eleven_v4', prompt: 'Salam.' }
const timing = { characters: ['S'], character_start_times_seconds: [0], character_end_times_seconds: [0.1] }

describe('direct ElevenLabs transport', () => {
  it('strips provider model metadata and never pads a verified empty speech catalog', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json([model, { model_id: 'scribe_v2', can_do_text_to_speech: false, owner_email: 'private' }])).mockResolvedValueOnce(json([]))
    expect(await readElevenSpeechModels({ fetch, key })).toEqual([{ id: 'eleven_v4', label: 'Eleven v4', maxTextLength: 10000, languages: [{ id: 'ms', label: 'Malay' }], supportsStyle: false, supportsSpeakerBoost: false }])
    expect(await readElevenSpeechModels({ fetch, key })).toEqual([])
    expect(fetch.mock.calls[0][1].headers).toEqual({ 'xi-api-key': key })
  })

  it('returns only approved preview metadata, omits unsafe/missing samples and never fetches a sample', async () => {
    const previews = ['https://storage.googleapis.com/eleven-public-prod/voice.mp3', null, 'file:///private.wav', 'http://cdn.example.com/sample.mp3', 'https://user:secret@cdn.example.com/sample.mp3', 'https://127.0.0.1/sample.mp3', 'https://[::1]/sample.mp3', 'https://localhost.local/sample.mp3', 'https://cdn.example.com:8443/sample.mp3']
    const fetch = vi.fn().mockResolvedValue(json({ has_more: false, voices: previews.map((preview_url, index) => ({ voice_id: String(index), name: `Voice ${index}`, preview_url, samples: ['private'], settings: { stability: 0.1 }, sharing: { whitelisted_emails: ['private'] } })) }))
    const voices = await readElevenVoices({ fetch, key })
    expect(voices[0]).toEqual({ id: '0', label: 'Voice 0', previewUrl: previews[0] })
    expect(voices.slice(1)).toEqual(previews.slice(1).map((_, index) => ({ id: String(index + 1), label: `Voice ${index + 1}` })))
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toContain('/v2/voices')
  })

  it('reads all voice pages on the same API, encodes opaque cursors and returns only IDs/names', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ voices: [{ voice_id: 'one', name: 'One', sharing: { whitelisted_emails: ['private'] } }], has_more: true, next_page_token: '/+=&https://evil.invalid' }))
      .mockResolvedValueOnce(json({ voices: [{ voice_id: 'one', name: 'Duplicate' }, { voice_id: 'two', name: 'Two' }], has_more: false }))
    expect(await readElevenVoices({ fetch, key })).toEqual([{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }])
    const next = new URL(fetch.mock.calls[1][0])
    expect(next.origin).toBe('https://api.elevenlabs.io')
    expect(next.searchParams.get('next_page_token')).toBe('/+=&https://evil.invalid')
    expect(next.searchParams.get('page_size')).toBe('100')
  })

  it('retains models and an honest voice-list notice when voice-read access fails', async () => {
    const fetch = vi.fn(async (url) => String(url).includes('/v1/models') ? json([model]) : json({ detail: { message: 'voices not permitted' } }, 403))
    const result = await readElevenAvailability({ fetch, key })
    expect(result.models.map((item) => item.id)).toEqual(['eleven_v4'])
    expect(result.voiceCatalogError).toContain('403')
    expect(result.voices).toBeUndefined()
  })

  it('makes one paid POST, keeps timing arrays and sends auth only in the header', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json([model])).mockResolvedValueOnce(json({ audio_base64: Buffer.from('audio').toString('base64'), alignment: timing, normalized_alignment: timing }))
    const result = await generateElevenAudio({ fetch, key }, speech)
    expect(result.bytes.toString()).toBe('audio')
    expect(result.alignment).toEqual(timing)
    expect(result.normalizedAlignment).toEqual(timing)
    const posts = fetch.mock.calls.filter(([, init]) => init.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0][0]).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice-id/with-timestamps?output_format=mp3_44100_128')
    expect(posts[0][1].headers['xi-api-key']).toBe(key)
    expect(posts[0][1].body).not.toContain(key)
    expect(JSON.parse(posts[0][1].body).model_id).toBe('eleven_v4')
  })

  it('checks account ownership again after live preflight and before the paid POST', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json([model]))
    const assertSubmission = vi.fn(() => { throw new DOMException('Account changed', 'AbortError') })
    await expect(generateElevenAudio({ fetch, key, assertSubmission }, speech)).rejects.toMatchObject({ name: 'AbortError' })
    expect(assertSubmission).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toContain('/v1/models')
  })

  it('blocks a missing or over-limit live model before the paid POST', async () => {
    for (const catalog of [[], [{ ...model, maximum_text_length_per_request: 1 }]]) {
      const fetch = vi.fn().mockResolvedValue(json(catalog))
      await expect(generateElevenAudio({ fetch, key }, speech)).rejects.toThrow(/unavailable|characters/)
      expect(fetch.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false)
    }
  })

  it('accepts binary effects without a speech catalog or a timestamp response', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('mp3', { headers: { 'Content-Type': 'audio/mpeg' } }))
    const result = await generateElevenAudio({ fetch, key }, { nodeId: 'fx', kind: 'sound-effects', audioProvider: 'elevenlabs', prompt: 'Rain', duration: 30 })
    expect(result.modelId).toBe('eleven_text_to_sound_v2')
    expect(result.bytes.toString()).toBe('mp3')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('redacts echoed credentials, retains HTTP status and never retries a paid error', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ detail: { message: `invalid ${key}` } }, 403))
    const error = await generateElevenAudio({ fetch, key }, { nodeId: 'fx', kind: 'sound-effects', audioProvider: 'elevenlabs', prompt: 'Rain' }).catch((error) => error)
    expect(error.status).toBe(403)
    expect(error.message).toContain('[redacted]')
    expect(error.message).not.toContain(key)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not launch discovery or generation when already cancelled', async () => {
    const controller = new AbortController(); controller.abort()
    const fetch = vi.fn()
    await expect(generateElevenAudio({ fetch, key, signal: controller.signal }, speech)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([{ audio_base64: '' }, { audio_base64: '@bad' }, { audio_base64: 'YQ==', alignment: { ...timing, character_end_times_seconds: [-1] } }])('rejects missing/malformed audio or timing: $', async (body) => {
    const fetch = vi.fn().mockResolvedValueOnce(json([model])).mockResolvedValueOnce(json(body))
    await expect(generateElevenAudio({ fetch, key }, speech)).rejects.toThrow(/invalid|empty/)
  })

  it('stops repeated voice cursors without publishing a partial catalog', async () => {
    const fetch = vi.fn(async () => json({ voices: [{ voice_id: 'one', name: 'One' }], has_more: true, next_page_token: 'same' }))
    await expect(readElevenVoices({ fetch, key })).rejects.toThrow(/repeated/)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('bounds catalog body size before decoding and forbids credential redirects', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('[]', { headers: { 'content-length': String(3 * 1024 * 1024) } }))
    await expect(readElevenSpeechModels({ fetch, key })).rejects.toThrow(/size/)
    expect(fetch.mock.calls[0][1].redirect).toBe('error')
  })

  it('rejects malformed voice records without publishing a partial voice catalog', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ voices: [{ voice_id: 'good', name: 'Good' }, null], has_more: false })))
    await expect(readElevenVoices({ fetch, key })).rejects.toThrow(/voice without an ID/)
  })

})


describe('public built-in voice previews', () => {
  it('uses an unauthenticated bounded catalog read and strips all unrelated metadata without fetching samples', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ voices: [{ voice_id: 'voice', name: 'George', preview_url: 'https://storage.example.com/voice.mp3', samples: ['private'], settings: { stability: 0.4 } }, { voice_id: 'no-sample', name: 'No sample', preview_url: 'http://localhost/sample' }] }))
    expect(await readPublicElevenVoices(fetch)).toEqual([{ id: 'voice', label: 'George', previewUrl: 'https://storage.example.com/voice.mp3' }, { id: 'no-sample', label: 'No sample' }])
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('https://api.elevenlabs.io/v1/voices')
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' })
    expect(fetch.mock.calls[0][1].headers).toBeUndefined()
  })
  it('rejects malformed/oversized catalogs and HTTP errors rather than guessing a sample', async () => {
    for (const response of [json({ voices: [{ name: 'Missing ID' }] }), json({ voices: Array.from({ length: 1001 }, () => ({})) }), json({}, 401), new Response('too big', { headers: { 'Content-Length': String(3 * 1024 * 1024) } })]) await expect(readPublicElevenVoices(vi.fn().mockResolvedValue(response))).rejects.toThrow()
  })
})
