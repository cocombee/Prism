/** Main-owned contract. Files, profile authorization and graph resolution stay in main. */
export const VOICE_CHANGE_OUTPUT_FORMATS = [
  'alaw_8000', 'mp3_22050_32', 'mp3_24000_48', 'mp3_44100_128', 'mp3_44100_192',
  'mp3_44100_32', 'mp3_44100_64', 'mp3_44100_96', 'opus_48000_128', 'opus_48000_192',
  'opus_48000_32', 'opus_48000_64', 'opus_48000_96', 'pcm_16000', 'pcm_22050',
  'pcm_24000', 'pcm_32000', 'pcm_44100', 'pcm_48000', 'pcm_8000', 'ulaw_8000',
  'wav_16000', 'wav_22050', 'wav_24000', 'wav_32000', 'wav_44100', 'wav_48000', 'wav_8000',
] as const

export interface ConversionModel {
  id: string; label: string; supportsStyle: boolean; supportsSpeakerBoost: boolean
}
export interface OriginalAudioSnapshot {
  assetId: string; revision: string; path: string; sha256: string; byteLength: number
  durationSeconds: number; fileName: string; mimeType: string
}
export interface VoiceChangeCompilation {
  url: string; modelId: string; outputFormat: string; source: OriginalAudioSnapshot
  fields: Record<string, string>
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`Invalid ${label}.`)
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Reflect.ownKeys(value)) if (typeof key !== 'string' || !allowed.includes(key)) throw new Error(`Unsupported ${label} field.`)
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`Invalid ${label}.`)
  return value
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid ${label}.`)
  return value
}
function unit(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be between 0 and 1.`)
  return value
}

/** Separate capability filter; a TTS label/ID never establishes conversion support. */
export function readConversionModels(raw: unknown): ConversionModel[] {
  if (!Array.isArray(raw)) throw new Error('Invalid model catalog.')
  const result: ConversionModel[] = [], seen = new Set<string>()
  for (const entry of raw) {
    const model = record(entry, 'model record')
    if (model.can_do_voice_conversion !== true) continue
    const id = text(model.model_id, 'model ID')
    if (seen.has(id)) continue
    seen.add(id)
    result.push({ id, label: typeof model.name === 'string' && model.name.trim() ? model.name : id,
      supportsStyle: model.can_use_style === true, supportsSpeakerBoost: model.can_use_speaker_boost === true })
  }
  return result
}

export function compileVoiceChangeRequest(raw: unknown, models: readonly ConversionModel[]): VoiceChangeCompilation {
  const request = record(raw, 'Voice Change request')
  keys(request, ['voiceId', 'modelId', 'source', 'outputFormat', 'settings', 'seed', 'removeBackgroundNoise'], 'request')
  const voiceId = text(request.voiceId, 'target voice ID'), modelId = text(request.modelId, 'conversion model ID')
  if (voiceId.trim() !== voiceId || modelId.trim() !== modelId || ['.', '..'].includes(voiceId)) throw new Error('Invalid provider ID.')
  const model = models.find(item => item.id === modelId)
  if (!model) throw new Error('Choose an available Voice Change model.')
  const input = record(request.source, 'original audio')
  keys(input, ['assetId', 'revision', 'path', 'sha256', 'byteLength', 'durationSeconds', 'fileName', 'mimeType'], 'source')
  const source: OriginalAudioSnapshot = {
    assetId: text(input.assetId, 'asset identity'), revision: text(input.revision, 'asset revision'),
    path: text(input.path, 'source path'), sha256: text(input.sha256, 'source checksum'),
    fileName: text(input.fileName, 'source filename'), mimeType: text(input.mimeType, 'source media type'),
    byteLength: input.byteLength as number, durationSeconds: input.durationSeconds as number,
  }
  if (!/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error('Invalid original audio checksum.')
  if (!Number.isSafeInteger(source.byteLength) || source.byteLength <= 0) throw new Error('Original audio is empty or invalid.')
  if (!Number.isFinite(source.durationSeconds) || source.durationSeconds <= 0) throw new Error('Original audio duration is unavailable.')
  if (!/^audio\/[a-z0-9.+-]+$/i.test(source.mimeType)) throw new Error('This operation needs verified encoded audio; video extraction is not implemented.')
  if (/[\\/]/.test(source.fileName) || source.fileName === '.' || source.fileName === '..') throw new Error('Use a filename, not a path, for the upload.')
  const outputFormat = request.outputFormat === undefined ? 'mp3_44100_128' : request.outputFormat
  if (typeof outputFormat !== 'string' || !(VOICE_CHANGE_OUTPUT_FORMATS as readonly string[]).includes(outputFormat)) throw new Error('Unsupported Voice Change output format.')
  const fields: Record<string, string> = { model_id: modelId, file_format: 'other' }
  if (request.settings !== undefined) {
    const settings = record(request.settings, 'voice settings')
    keys(settings, ['stability', 'similarityBoost', 'style', 'speakerBoost'], 'voice settings')
    const wire: Record<string, number | boolean> = {}
    if (settings.stability !== undefined) wire.stability = unit(settings.stability, 'Stability')
    if (settings.similarityBoost !== undefined) wire.similarity_boost = unit(settings.similarityBoost, 'Similarity')
    if (settings.style !== undefined) {
      if (!model.supportsStyle) throw new Error('The selected model does not support Style.')
      wire.style = unit(settings.style, 'Style')
    }
    if (settings.speakerBoost !== undefined) {
      if (!model.supportsSpeakerBoost) throw new Error('The selected model does not support Speaker Boost.')
      wire.use_speaker_boost = bool(settings.speakerBoost, 'Speaker Boost')
    }
    if (Object.keys(wire).length) fields.voice_settings = JSON.stringify(wire)
  }
  if (request.seed !== undefined) {
    if (typeof request.seed !== 'number' || !Number.isInteger(request.seed) || request.seed < 0 || request.seed > 4294967295) throw new Error('Seed must be an integer from 0 to 4294967295.')
    fields.seed = String(request.seed)
  }
  if (request.removeBackgroundNoise !== undefined) fields.remove_background_noise = String(bool(request.removeBackgroundNoise, 'Background noise removal'))
  return { url: `https://api.elevenlabs.io/v1/speech-to-speech/${encodeURIComponent(voiceId)}?${new URLSearchParams({output_format: outputFormat})}`,
    modelId, outputFormat, source, fields }
}

/** No network/file access. Main must resolve a contained, authorized source before calling. */
export async function prepareVoiceChangeMultipart(compiled: VoiceChangeCompilation, encodedBytes: Uint8Array,
  maxUploadBytes: number): Promise<FormData> {
  const source = {...compiled.source}, fields = {...compiled.fields}
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes <= 0) throw new Error('Invalid main upload bound.')
  if (encodedBytes.length !== source.byteLength || encodedBytes.length > maxUploadBytes) throw new Error('Original audio size changed or exceeds the upload bound.')
  // Copy before awaiting: caller mutations cannot change the verified upload.
  const snapshot = new Uint8Array(encodedBytes.length)
  snapshot.set(encodedBytes)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', snapshot))
  const sha256 = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('')
  if (sha256 !== source.sha256) throw new Error('Original audio changed; resolve the current asset before generating.')
  const form = new FormData()
  form.append('audio', new Blob([snapshot], {type: source.mimeType}), source.fileName)
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  return form
}
