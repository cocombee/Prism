import { describe, expect, it, vi } from 'vitest'
import { AUDIO_WAVEFORM_BYTE_LIMIT, audioWaveformPeaks, readAudioWaveformBytes } from './audioWaveform'

describe('actual audio waveform envelope', () => {
  it('retains a stereo-only transient and final sample with bounded normalized bins', () => {
    expect(audioWaveformPeaks([new Float32Array([0,0,0,0,0]), new Float32Array([0,-.5,0,0,1])], 2)).toEqual([.5,1])
    expect(audioWaveformPeaks([new Float32Array([0,0,0])], 2)).toEqual([0,0])
    expect(audioWaveformPeaks([new Float32Array([NaN,Infinity,-1])], 2)).toEqual([0,1])
  })
  it('rejects malformed counts and unequal channel lengths', () => {
    for (const count of [0,257,1.5,NaN]) expect(audioWaveformPeaks([new Float32Array([1])], count)).toEqual([])
    expect(audioWaveformPeaks([new Float32Array([1]),new Float32Array([1,2])],2)).toEqual([])
  })
  it('reads actual bytes without ambient credentials', async () => {
    const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array([1,2,3])))
    try { expect(new Uint8Array(await readAudioWaveformBytes('https://media.example/audio.mp3',new AbortController().signal))).toEqual(new Uint8Array([1,2,3])); expect(fetcher.mock.calls[0][1]?.credentials).toBe('omit') }
    finally {fetcher.mockRestore()}
  })
  it('rejects oversized declared and streaming bodies and cancels the latter', async () => {
    const canceled=vi.fn(),fetcher=vi.spyOn(globalThis,'fetch')
    try {
      fetcher.mockResolvedValueOnce(new Response(new Uint8Array([1]),{headers:{'content-length':String(AUDIO_WAVEFORM_BYTE_LIMIT+1)}}))
      await expect(readAudioWaveformBytes('https://media.example/audio.mp3',new AbortController().signal)).rejects.toThrow()
      const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(AUDIO_WAVEFORM_BYTE_LIMIT+1))},cancel:canceled})
      fetcher.mockResolvedValueOnce(new Response(stream))
      await expect(readAudioWaveformBytes('https://media.example/audio.mp3',new AbortController().signal)).rejects.toThrow()
      expect(canceled).toHaveBeenCalledOnce()
    } finally {fetcher.mockRestore()}
  })
})
