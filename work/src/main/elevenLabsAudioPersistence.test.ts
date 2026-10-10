import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { persistElevenAudio, type ElevenAudioStorage } from './elevenLabsAudioPersistence'
import type { GenerationRequest } from '../shared/types'

const request: GenerationRequest = { kind: 'voiceover', nodeId: 'voice', voiceEngine: 'elevenlabs-direct', voiceModelId: 'eleven_v4', voice: 'real-id', prompt: 'Words' }
const alignment = { characters: ['W'], character_start_times_seconds: [0], character_end_times_seconds: [0.2] }
const response = { bytes: Buffer.from([0, 0]), modelId: 'eleven_v4', outputFormat: 'pcm_16000', alignment }

async function fixture(run: (storage: ElevenAudioStorage) => Promise<void>) {
  const folder = await mkdtemp(join(tmpdir(), 'prism-eleven-storage-'))
  try {
    await run({ outputStem: join(folder, 'audio'), fallbackRequestId: 'local-request', assertCommit: vi.fn(), register: vi.fn(async (_path, _metadata, indexed) => { indexed() }), history: vi.fn(async () => {}), localUrl: (path) => `prism-asset://${path}` })
  } finally { await rm(folder, { recursive: true, force: true }) }
}

describe('managed direct audio persistence', () => {
  it('saves playable PCM with exact model, original format and portable timing metadata', () => fixture(async (storage) => {
    const output = await persistElevenAudio(request, response, storage)
    expect((await readFile(output.outputPath)).toString('ascii', 0, 4)).toBe('RIFF')
    expect(output.modelId).toBe('elevenlabs/eleven_v4')
    expect(output.requestId).toBe('local-request')
    const metadata = vi.mocked(storage.register).mock.calls[0][1]
    expect(metadata?.audioTiming?.alignment).toEqual(alignment)
    expect(JSON.parse(JSON.stringify(metadata)).audioTiming.alignment).toEqual(alignment)
    expect(metadata?.audioOutputFormat).toBe('pcm_16000')
    expect(storage.history).toHaveBeenCalledWith(output.outputPath, 'elevenlabs/eleven_v4')
  }))
  it('never replaces or deletes an existing file when exclusive creation fails', () => fixture(async (storage) => {
    await writeFile(storage.outputStem + '.wav', 'existing')
    await expect(persistElevenAudio(request, response, storage)).rejects.toMatchObject({ code: 'EEXIST' })
    expect((await readFile(storage.outputStem + '.wav')).toString()).toBe('existing')
    expect(storage.register).not.toHaveBeenCalled()
  }))
  it('removes only its own unindexed file when registration fails', () => fixture(async (storage) => {
    storage.register = vi.fn(async () => { throw new Error('index write failed') })
    await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('index write failed')
    await expect(readFile(storage.outputStem + '.wav')).rejects.toMatchObject({ code: 'ENOENT' })
  }))
  it('keeps an indexed audio result when the project document or history write fails', () => fixture(async (storage) => {
    storage.register = vi.fn(async (_path, _metadata, indexed) => { indexed(); throw new Error('portable document failed') })
    await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('portable document failed')
    expect((await readFile(storage.outputStem + '.wav')).toString('ascii', 0, 4)).toBe('RIFF')
    await rm(storage.outputStem + '.wav')
    storage.register = vi.fn(async (_path, _metadata, indexed) => { indexed() })
    storage.history = vi.fn(async () => { throw new Error('history failed') })
    await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('history failed')
    expect((await readFile(storage.outputStem + '.wav')).toString('ascii', 0, 4)).toBe('RIFF')
  }))
  it('rejects project ownership changes before creating or registering audio', () => fixture(async (storage) => {
    storage.assertCommit = vi.fn(() => { throw new Error('project changed') })
    await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('project changed')
    await expect(readFile(storage.outputStem + '.wav')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(storage.register).not.toHaveBeenCalled()
  }))
})
