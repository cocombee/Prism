import type { GenerationRequest, ServiceModelAvailability } from './types'
export const FISH_CATALOG_TTL = 10 * 60_000
export const FISH_LEGACY_DEFAULT_MODEL = 's2-pro'
// Fish gives a date without a timezone. Stop at the earliest global start of
//31 December rather than risking its documented S1→S2.1 server substitution.
export const FISH_S1_RETIREMENT = Date.parse('2026-12-30T10:00:00Z')
export const fishSampleRates = (format: string = 'mp3'): readonly number[] => format === 'opus' ? [48000] : format === 'mp3' ? [32000, 44100] : ['wav', 'pcm'].includes(format) ? [8000, 16000, 24000, 32000, 44100] : []
export function fishSampleRateOptions(format: string | undefined, saved: number | undefined): Array<{ value: string; label: string; disabled?: boolean }> {
  const rates = fishSampleRates(format)
  return [{ value: '@default', label: 'Default' }, ...rates.map(value => ({ value: String(value), label: `${value / 1000} kHz` })), ...(saved !== undefined && !rates.includes(saved) ? [{ value: String(saved), label: `Unavailable (${saved} Hz)`, disabled: true }] : [])]
}
export function fishNumberOptions(values: readonly number[], saved: number, suffix: string, minimum: number, maximum: number): Array<{ value: string; label: string; disabled?: boolean }> {
  const options: Array<{ value: string; label: string; disabled?: boolean }> = values.map(value => ({ value: String(value), label: `${value}${suffix}` }))
  if (!values.includes(saved)) options.push({ value: String(saved), label: `${saved}${suffix}`, disabled: !Number.isFinite(saved) || saved < minimum || saved > maximum })
  return options
}
export function fishBitrateOptions(format: 'mp3' | 'opus', saved: number): Array<{ value: string; label: string; disabled?: boolean }> {
  const values = format === 'mp3' ? [64, 128, 192] : [-1000, 24, 32, 48, 64]
  return [...values.map(value => ({ value: String(value), label: value === -1000 ? 'Auto' : `${value} kbps` })), ...(!values.includes(saved) ? [{ value: String(saved), label: `Unavailable (${saved} kbps)`, disabled: true }] : [])]
}
function number(value: unknown, fallback: number, minimum: number, maximum: number, name: string, integer = false): number {
  const selected = value === undefined ? fallback : value
  if (typeof selected !== 'number' || !Number.isFinite(selected) || selected < minimum || selected > maximum || integer && !Number.isInteger(selected)) throw new Error(`${name} must be ${integer ? 'an integer ' : ''}between ${minimum} and ${maximum}.`)
  return selected
}
function boolean(value: unknown, fallback: boolean, name: string): boolean {
  if (value !== undefined && typeof value !== 'boolean') throw new Error(`Choose a valid ${name} setting.`)
  return value === undefined ? fallback : value as boolean
}
export function compileFishAudioRequest(request: GenerationRequest, availability?: ServiceModelAvailability, now = Date.now()): { modelId: string; format: 'mp3' | 'opus' | 'wav' | 'pcm'; sampleRate: number; body: Record<string, unknown> } {
  if (request.kind !== 'voiceover' || request.voiceEngine !== 'fish-audio' || request.falNative) throw new Error('This request does not select native Fish Audio.')
  if (typeof request.prompt !== 'string' || !request.prompt.trim()) throw new Error('Add voiceover text before generating audio.')
  if (request.prompt.length * 6 > 1024 * 1024) throw new Error('The Fish Audio text exceeds the supported request size.')
  if (typeof request.fishReferenceId !== 'string' || !request.fishReferenceId.trim() || request.fishReferenceId.length > 1024) throw new Error('Choose a Fish Audio voice Reference ID.')
  const modelId = request.fishModel ?? FISH_LEGACY_DEFAULT_MODEL
  if (typeof modelId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(modelId)) throw new Error('Choose an advertised Fish Audio model.')
  if (modelId === 's1' && now >= FISH_S1_RETIREMENT) throw new Error('Fish Audio S1 is retired; choose another model explicitly to review its speech cues.')
  if (availability) {
    const fetchedAt = Date.parse(availability.catalogCheckedAt || '')
    if (availability.provider !== 'fish' || !availability.verified || availability.catalogStale || !Number.isFinite(fetchedAt) || now - fetchedAt < 0 || now - fetchedAt >= FISH_CATALOG_TTL) throw new Error('Refresh the official Fish Audio model contract before generating.')
    if (!availability.models.some(model => model.id === modelId)) throw new Error('The saved Fish Audio model is no longer advertised; choose another model explicitly.')
  }
  const format = request.fishFormat ?? 'mp3'
  if (!['mp3', 'opus', 'wav', 'pcm'].includes(format)) throw new Error('Choose a supported Fish Audio format.')
  const sampleRate = request.fishSampleRate ?? (format === 'opus' ? 48000 : 44100)
  if (!fishSampleRates(format).includes(sampleRate)) throw new Error(`Choose a supported ${format.toUpperCase()} sample rate.`)
  const mp3 = request.fishMp3Bitrate ?? 128, opus = request.fishOpusBitrate ?? 48
  if (format === 'mp3' && ![64, 128, 192].includes(mp3)) throw new Error('Choose a supported Fish Audio MP3 bitrate.')
  if (format === 'opus' && ![-1000, 24, 32, 48, 64].includes(opus)) throw new Error('Choose a supported Fish Audio Opus bitrate.')
  const latency = request.fishLatency ?? 'normal'
  if (!['normal', 'balanced', 'low'].includes(latency)) throw new Error('Choose a supported Fish Audio latency.')
  return { modelId, format, sampleRate, body: {
    text: request.prompt, reference_id: request.fishReferenceId.trim(),
    temperature: number(request.fishTemperature, 0.7, 0, 1, 'Expressiveness'), top_p: number(request.fishTopP, 0.7, 0, 1, 'Diversity'),
    prosody: { speed: number(request.speed, 1, 0.5, 2, 'Speed'), volume: number(request.fishVolume, 0, -20, 20, 'Volume'), ...(modelId !== 's1' ? { normalize_loudness: boolean(request.fishNormalizeLoudness, true, 'loudness normalization') } : {}) },
    normalize: boolean(request.fishNormalize, true, 'text normalization'), chunk_length: number(request.fishChunkLength, 200, 100, 300, 'Chunk length', true),
    format, sample_rate: sampleRate, ...(format === 'mp3' ? { mp3_bitrate: mp3 } : {}), ...(format === 'opus' ? { opus_bitrate: opus === -1000 ? opus : opus * 1000 } : {}), latency,
  } }
}
export function fishAvailabilityError(request: GenerationRequest, availability?: ServiceModelAvailability): string | undefined {
  if (request.kind !== 'voiceover' || request.voiceEngine !== 'fish-audio' || request.falNative) return undefined
  if (!availability) return 'Load the official Fish Audio model contract before generating.'
  try { compileFishAudioRequest(request, availability); return undefined }
  catch (error) { return error instanceof Error ? error.message : 'Check the Fish Audio settings.' }
}
