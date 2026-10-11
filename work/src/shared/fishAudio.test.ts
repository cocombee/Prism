import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { compileFishAudioRequest, fishSampleRateOptions, FISH_S1_RETIREMENT } from './fishAudio'
import { buildGenerationRequest } from './workflowResolver'
import { providerAudioPromptText, providerEffectiveRequestControls } from './requestPreview'
import { generationRequirementFailures } from './generationReadiness'
import { generateFishAudio } from '../main/fishAudioApi'
import { persistFishAudio } from '../main/fishAudioPersistence'
import type { GenerationRequest, ServiceModelAvailability, StudioNode } from './types'
const text = '  [warm] Repeat this.\r\n\r\nRepeat this.\n\nRepeat this.  '
const request: GenerationRequest = { nodeId: 'voice', kind: 'voiceover', voiceEngine: 'fish-audio', fishModel: 's2.1-pro', fishReferenceId: 'voice-id', prompt: text, fishFormat: 'opus', fishOpusBitrate: 64, fishTemperature: 0, fishTopP: 0, fishNormalize: false, fishNormalizeLoudness: false, fishVolume: 0 }
const catalog = (): ServiceModelAvailability => ({ provider: 'fish', verified: true, nativeInputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }, catalogCheckedAt: new Date().toISOString(), models: [{ id: 's2.1-pro', label: 'Fish Audio S2.1 Pro' }] })
describe('Fish faithful native audio composition', () => {
  it('uses Fish-owned defaults without inventing a speaker or overriding saved controls', () => {
    const minimal: GenerationRequest = { kind: 'voiceover', nodeId: 'voice', voiceEngine: 'fish-audio', fishModel: 's2.1-pro', fishReferenceId: 'chosen-fish-voice', prompt: text }
    expect(compileFishAudioRequest(minimal).body).toMatchObject({ format: 'mp3', sample_rate: 44100, mp3_bitrate: 128, chunk_length: 300, prosody: { speed: 1, volume: 0 } })
    expect(compileFishAudioRequest({ ...minimal, fishFormat: 'opus' }).body).toMatchObject({ sample_rate: 48000, opus_bitrate: -1000 })
    expect(compileFishAudioRequest({ ...minimal, fishFormat: 'opus', fishOpusBitrate: 48, fishChunkLength: 200 }).body).toMatchObject({ opus_bitrate: 48000, chunk_length: 200, reference_id: 'chosen-fish-voice' })
    expect(() => compileFishAudioRequest({ ...minimal, fishReferenceId: undefined })).toThrow(/Reference ID/)
  })
  it('preserves repeated authored bytes through graph, preview and one exact HTTP request with correct Opus units', async () => {
    const node: StudioNode = { id: 'voice', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'voiceover', title: 'Voice', voiceEngine: 'fish-audio', fishModel: request.fishModel, fishReferenceId: request.fishReferenceId, prompt: text, fishFormat: 'opus', fishOpusBitrate: 64, fishTemperature: 0, fishTopP: 0, fishNormalize: false, fishNormalizeLoudness: false, fishVolume: 0 } }
    const graph = buildGenerationRequest(node, [node], []), compiled = compileFishAudioRequest(graph, catalog())
    expect(graph.prompt).toBe(text); expect(providerAudioPromptText(graph)).toBe(text); expect(generationRequirementFailures(graph)).toEqual([])
    expect(compiled.body).toMatchObject({ text, opus_bitrate: 64000, sample_rate: 48000, temperature: 0, top_p: 0, normalize: false, prosody: { volume: 0, normalize_loudness: false } })
    const { text: _text, ...controls } = compiled.body
    expect(providerEffectiveRequestControls(graph)).toEqual({ model: 's2.1-pro', ...controls })
    const fetch = vi.fn().mockResolvedValue(new Response('audio', { headers: { 'Content-Type': 'audio/ogg' } })), assertSubmission = vi.fn()
    const result = await generateFishAudio({ fetch, key: 'fictional', availability: catalog(), assertSubmission }, graph)
    expect(fetch).toHaveBeenCalledOnce(); expect(assertSubmission).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][1].headers.model).toBe('s2.1-pro'); expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(compiled.body); expect(result.format).toBe('opus')
  })
  it.each(['speed', 'zero-rate', 'mp3-rate', 'chunk-fraction', 'temperature', 'bad-opus', 'unknown-model', 'stale', 'expired', 'boolean'])('rejects %s before transport without clamping or changing the selected model', async failure => {
    const current = { ...request }, availability = catalog(), fetch = vi.fn(), submit = vi.fn()
    if (failure === 'speed') current.speed = 4
    if (failure === 'zero-rate') current.fishSampleRate = 0
    if (failure === 'mp3-rate') { current.fishFormat = 'mp3'; current.fishSampleRate = 48000 }
    if (failure === 'chunk-fraction') current.fishChunkLength = 220.5
    if (failure === 'temperature') current.fishTemperature = -1
    if (failure === 'bad-opus') current.fishOpusBitrate = 64000 as 64
    if (failure === 'unknown-model') current.fishModel = 'provider-would-fallback'
    if (failure === 'stale') availability.catalogStale = true
    if (failure === 'expired') availability.catalogCheckedAt = '2020-01-01T00:00:00Z'
    if (failure === 'boolean') current.fishNormalize = 1 as unknown as boolean
    await expect(generateFishAudio({ fetch, key: 'fictional', availability, assertSubmission: submit }, current)).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled()
  })
  it('rejects newly required provider inputs and narrowed enums before transport', async () => {
    const availability = catalog(), fetch = vi.fn(), submit = vi.fn()
    availability.nativeInputSchema = { type: 'object', properties: { brand_new_audio_refs: { type: 'array', items: { type: 'string' }, maxItems: 50 } }, required: ['brand_new_audio_refs'] }
    await expect(generateFishAudio({ fetch, key: 'fictional', availability, assertSubmission: submit }, request)).rejects.toThrow(/brand_new_audio_refs/)
    availability.nativeInputSchema = { type: 'object', properties: { opus_bitrate: { type: 'integer', enum: [24000] } } }
    await expect(generateFishAudio({ fetch, key: 'fictional', availability, assertSubmission: submit }, request)).rejects.toThrow(/opus_bitrate/)
    expect(fetch).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled()
  })
  it('preserves an invalid saved rate visibly while allowing an explicit format default; rejects S1 at the conservative retirement boundary', () => {
    expect(fishSampleRateOptions('opus', 44100)).toEqual([{ value: '@default', label: 'Default' }, { value: '48000', label: '48 kHz' }, { value: '44100', label: 'Unavailable (44100 Hz)', disabled: true }])
    expect(compileFishAudioRequest({ ...request, fishOpusBitrate: -1000 }).body.opus_bitrate).toBe(-1000)
    expect(() => compileFishAudioRequest({ ...request, fishModel: 's1' }, undefined, FISH_S1_RETIREMENT)).toThrow(/retired/)
    expect(compileFishAudioRequest({ ...request, fishModel: 's1' }, undefined, FISH_S1_RETIREMENT - 1).body.prosody).not.toHaveProperty('normalize_loudness')
  })
  it('stores playable mono PCM with the actual rate, retains indexed outputs after history failure and never deletes a colliding file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'prism-fish-persistence-')), stem = join(directory, 'voice'), registers = vi.fn(async (_path, _metadata, indexed) => indexed())
    const response = { bytes: Buffer.from([0, 0, 0, 0]), modelId: 's2.1-pro', format: 'pcm' as const, sampleRate: 16000 }, storage = { outputStem: stem, fallbackRequestId: 'fixture', assertCommit: () => undefined, register: registers, localUrl: (path: string) => path, history: async () => { throw Error('History unavailable') } }
    try {
      await expect(persistFishAudio(request, response, storage)).rejects.toThrow(/History/)
      const bytes = await readFile(stem + '.wav'); expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.readUInt32LE(24)).toBe(16000)
      expect(registers.mock.calls[0][1]).toMatchObject({ provider: 'Fish Audio', prompt: text, modelId: 'fish-audio/s2.1-pro', audioOutputFormat: 'pcm_16000' })
      await writeFile(stem + '.wav', 'protected fixture')
      await expect(persistFishAudio(request, response, { ...storage, history: async () => undefined })).rejects.toThrow()
      expect((await readFile(stem + '.wav')).toString()).toBe('protected fixture')
      await expect(persistFishAudio(request, { ...response, bytes: Buffer.from([0]) }, { ...storage, outputStem: join(directory, 'bad') })).rejects.toThrow(/incomplete PCM/)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('bounds response bytes and rejects non-audio and already cancelled requests', async () => {
    const cancelled = vi.fn(), big = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(96 * 1024 * 1024 + 1)) }, cancel: cancelled }))
    const options = { key: 'fictional', availability: catalog(), assertSubmission: () => undefined }
    await expect(generateFishAudio({ ...options, fetch: async () => big }, request)).rejects.toThrow(/supported size/); expect(cancelled).toHaveBeenCalledOnce()
    await expect(generateFishAudio({ ...options, fetch: async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }) }, request)).rejects.toThrow(/non-audio/)
    const controller = new AbortController(); controller.abort(); const fetch = vi.fn()
    await expect(generateFishAudio({ ...options, fetch, signal: controller.signal }, request)).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled()
  })
})
