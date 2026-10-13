import { mkdtemp, open, readFile, readlink, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
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
  it('preserves a foreign file replacing its unindexed output during registration failure', () => fixture(async (storage) => {
    const path = storage.outputStem + '.wav'
    storage.register = vi.fn(async () => {
      await rename(path, path + '.original')
      await writeFile(path, 'foreign replacement')
      throw new Error('registration failed after replacement')
    })
    await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('registration failed after replacement')
    expect((await readFile(path)).toString()).toBe('foreign replacement')
    expect((await readFile(path + '.original')).toString('ascii', 0, 4)).toBe('RIFF')
    expect(storage.history).not.toHaveBeenCalled()
  }))
  it('preserves a replacement symlink and its target when registration fails', () => fixture(async (storage) => {
    const path = storage.outputStem + '.wav', target = storage.outputStem + '.foreign'
    await writeFile(target, 'foreign target')
    storage.register = vi.fn(async () => {
      await rename(path, path + '.original')
      await symlink(target, path)
      throw new Error('registration failed after symlink replacement')
    })
    await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('registration failed after symlink replacement')
    expect(await readlink(path)).toBe(target)
    expect((await readFile(target)).toString()).toBe('foreign target')
    expect(storage.history).not.toHaveBeenCalled()
  }))
  it('rejects modified output before registration', () => fixture(async (storage) => {
    const originalGuard = storage.assertCommit
    storage.assertCommit = vi.fn(() => {
      originalGuard()
      if (vi.mocked(storage.assertCommit).mock.calls.length === 2) {
        // Synchronous mutation at the real pre-registration owner guard.
        writeFileSync(storage.outputStem + '.wav', 'tampered audio')
      }
    })
    await expect(persistElevenAudio(request, response, storage)).rejects.toThrow(/changed|truncated/)
    expect(storage.register).not.toHaveBeenCalled()
    expect(storage.history).not.toHaveBeenCalled()
  }))
  it('captures original timing and dialogue metadata before asynchronous writes', () => fixture(async (storage) => {
    const originalRequest = { ...request, elevenSpeechMode: 'dialogue' as const, elevenDialogueTurns: [{ id: 'fictional-turn', text: '  Original words  ', voiceId: ' original-voice ' }] }
    const originalResponse = { ...response, alignment: structuredClone(alignment) }
    storage.assertCommit = vi.fn(() => {
      if (vi.mocked(storage.assertCommit).mock.calls.length === 2) {
        originalRequest.prompt = 'later edit'
        originalRequest.elevenDialogueTurns[0].text = 'later words'
        originalRequest.elevenDialogueTurns[0].voiceId = 'later-voice'
        originalResponse.alignment.characters[0] = 'X'
      }
    })
    await persistElevenAudio(originalRequest, originalResponse, storage)
    const metadata = vi.mocked(storage.register).mock.calls[0][1]
    expect(metadata?.prompt).toBe('Words')
    expect(metadata?.elevenDialogueInputs).toEqual([{ text: '  Original words  ', voiceId: 'original-voice' }])
    expect(metadata?.audioTiming?.alignment).toEqual(alignment)
  }))
  it('removes its exact unindexed partial when descriptor writing fails', () => fixture(async (storage) => {
    const probe = await open(storage.outputStem + '.probe', 'wx')
    const prototype = Object.getPrototypeOf(probe)
    await probe.close()
    const write = vi.spyOn(prototype, 'writeFile').mockImplementationOnce(async function (this: typeof probe) {
      await this.write(Buffer.from('partial'))
      throw new Error('fictional disk write failure')
    })
    try {
      await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('fictional disk write failure')
      await expect(readFile(storage.outputStem + '.wav')).rejects.toMatchObject({ code: 'ENOENT' })
      expect(storage.register).not.toHaveBeenCalled()
      expect(storage.history).not.toHaveBeenCalled()
    } finally { write.mockRestore() }
  }))
  it('does not register or retain an unindexed output whose flush fails', () => fixture(async (storage) => {
    const probe = await open(storage.outputStem + '.probe', 'wx')
    const prototype = Object.getPrototypeOf(probe)
    await probe.close()
    const flush = vi.spyOn(prototype, 'sync').mockRejectedValueOnce(new Error('fictional flush failure'))
    try {
      await expect(persistElevenAudio(request, response, storage)).rejects.toThrow('fictional flush failure')
      await expect(readFile(storage.outputStem + '.wav')).rejects.toMatchObject({ code: 'ENOENT' })
      expect(storage.register).not.toHaveBeenCalled()
      expect(storage.history).not.toHaveBeenCalled()
    } finally { flush.mockRestore() }
  }))
  it('detaches encoded bytes and request identity before owner callbacks can change them', () => fixture(async (storage) => {
    const encoded = { bytes: Buffer.from('encoded fixture bytes'), modelId: 'eleven_v4', outputFormat: 'mp3_44100_128', requestId: 'original-request' }
    const before = Buffer.from(encoded.bytes)
    storage.assertCommit = vi.fn(() => {
      encoded.bytes.fill(0)
      encoded.requestId = 'later-request'
      encoded.modelId = 'later-model'
    })
    const result = await persistElevenAudio(request, encoded, storage)
    expect(await readFile(result.outputPath)).toEqual(before)
    expect(result.requestId).toBe('original-request')
    expect(result.modelId).toBe('elevenlabs/eleven_v4')
  }))
})
