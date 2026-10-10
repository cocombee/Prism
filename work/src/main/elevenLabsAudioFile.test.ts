import { describe, expect, it } from 'vitest'
import { playableElevenAudio } from './elevenLabsAudioFile'

describe('playable native ElevenLabs outputs', () => {
  it('frames PCM as mono 16-bit WAV without changing any sample', () => {
    const samples = Buffer.alloc(8)
    ;[-32768, -1, 0, 32767].forEach((sample, i) => samples.writeInt16LE(sample, i * 2))
    const output = playableElevenAudio(samples, 'pcm_44100')
    expect(output.extension).toBe('.wav')
    expect(output.bytes.toString('ascii', 0, 4)).toBe('RIFF')
    expect(output.bytes.toString('ascii', 8, 12)).toBe('WAVE')
    expect(output.bytes.readUInt16LE(22)).toBe(1)
    expect(output.bytes.readUInt32LE(24)).toBe(44100)
    expect(output.bytes.readUInt16LE(34)).toBe(16)
    expect(output.bytes.readUInt32LE(40)).toBe(8)
    expect(output.bytes.subarray(44)).toEqual(samples)
  })
  it('decodes known G.711 mu-law and A-law reference samples to PCM WAV', () => {
    const mu = playableElevenAudio(Buffer.from([255, 127, 0, 128]), 'ulaw_8000').bytes
    const a = playableElevenAudio(Buffer.from([213, 85, 170, 42]), 'alaw_8000').bytes
    expect([0, 1, 2, 3].map((i) => mu.readInt16LE(44 + i * 2))).toEqual([0, 0, -32124, 32124])
    expect([0, 1, 2, 3].map((i) => a.readInt16LE(44 + i * 2))).toEqual([8, -8, 32256, -32256])
    expect(mu.readUInt32LE(24)).toBe(8000)
  })
  it.each(['mp3_44100_128', 'opus_48000_96', 'wav_48000'])('keeps encoded %s output unchanged', (format) => {
    const bytes = Buffer.from('encoded fixture')
    const output = playableElevenAudio(bytes, format)
    expect(output.bytes).toBe(bytes)
    expect(output.extension).toBe(`.${format.split('_')[0]}`)
  })
  it('rejects empty, incomplete PCM or unknown format instead of saving unplayable raw data', () => {
    expect(() => playableElevenAudio(Buffer.alloc(0), 'pcm_8000')).toThrow(/empty/)
    expect(() => playableElevenAudio(Buffer.from([1]), 'pcm_8000')).toThrow(/incomplete/)
    expect(() => playableElevenAudio(Buffer.from([1]), 'raw_fake')).toThrow(/Unknown/)
  })
})
