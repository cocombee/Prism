/** Actual peak envelope; includes every channel and every sample, including the tail. */
export function audioWaveformPeaks(channels: readonly Float32Array[], count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > 256 || !channels.length) return []
  const length = channels[0].length
  if (!length || channels.some(channel => channel.length !== length)) return []
  const peaks = Array.from({ length: count }, () => 0)
  for (const channel of channels) for (let i = 0; i < length; i++) {
    const sample = Math.abs(channel[i])
    if (Number.isFinite(sample)) {
      const bin = Math.min(count - 1, Math.floor(i * count / length))
      peaks[bin] = Math.max(peaks[bin], sample)
    }
  }
  const maximum = Math.max(...peaks)
  return maximum ? peaks.map(peak => peak / maximum) : peaks
}

/** Renderer memory bound, not a provider format/duration limit. */
export const AUDIO_WAVEFORM_BYTE_LIMIT = 16 * 1024 * 1024
export async function readAudioWaveformBytes(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal, credentials: 'omit' })
  if (!response.ok || Number(response.headers.get('content-length')) > AUDIO_WAVEFORM_BYTE_LIMIT) throw Error('Waveform unavailable')
  const reader = response.body?.getReader()
  if (!reader) throw Error('Waveform unavailable')
  const chunks: Uint8Array[] = []; let length = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const next = await reader.read()
      if (next.done) break
      length += next.value.byteLength
      if (length > AUDIO_WAVEFORM_BYTE_LIMIT) throw Error('Waveform unavailable')
      chunks.push(next.value)
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error }
  finally { reader.releaseLock() }
  if (!length) throw Error('Waveform unavailable')
  const bytes = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes.buffer
}
