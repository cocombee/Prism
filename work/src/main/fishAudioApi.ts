import type { GenerationRequest, ServiceModelAvailability } from '../shared/types'
import { compileFishAudioRequest } from '../shared/fishAudio'
import { validateFalContractValue } from './falSchemaValidation'
export interface FishAudioResponse { bytes: Buffer; modelId: string; format: 'mp3' | 'opus' | 'wav' | 'pcm'; sampleRate: number }
async function bounded(response: Response, maximum: number, signal: AbortSignal): Promise<Buffer> {
  if (Number(response.headers.get('content-length')) > maximum) { await response.body?.cancel(); throw new Error('Fish Audio response exceeds the supported size.') }
  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let total = 0
  try {
    for (;;) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maximum) throw new Error('Fish Audio response exceeds the supported size.')
      chunks.push(value)
    }
    signal.throwIfAborted(); return Buffer.concat(chunks)
  } catch (error) { await reader.cancel().catch(() => undefined); throw error }
  finally { reader.releaseLock() }
}
export async function generateFishAudio(options: { fetch(url: string, init: RequestInit): Promise<Response>; key: string; availability: ServiceModelAvailability; signal?: AbortSignal; assertSubmission(): void }, request: GenerationRequest): Promise<FishAudioResponse> {
  const compiled = compileFishAudioRequest(request, options.availability)
  if (!options.availability.nativeInputSchema) throw new Error('Load the current Fish Audio native input contract before generating.')
  await validateFalContractValue(options.availability.nativeInputSchema, compiled.body, 'Fish Audio input')
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000)
  signal.throwIfAborted(); options.assertSubmission()
  const response = await options.fetch('https://api.fish.audio/v1/tts', { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${options.key}`, 'Content-Type': 'application/json', model: compiled.modelId }, body: JSON.stringify(compiled.body), signal })
  if (!response.ok) {
    const body = (await bounded(response, 8192, signal).catch(() => Buffer.alloc(0))).toString('utf8').replaceAll(options.key, '[redacted]').slice(0, 400)
    const error = new Error(`Fish Audio request failed (${response.status})${body ? `: ${body}` : ''}`)
    Object.assign(error, { status: response.status }); throw error
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType && !/^audio\//i.test(contentType) && !/^application\/octet-stream/i.test(contentType)) { await response.body?.cancel(); throw new Error('Fish Audio returned a non-audio response.') }
  const bytes = await bounded(response, 96 * 1024 * 1024, signal)
  if (!bytes.length) throw new Error('Fish Audio returned empty audio.')
  return { bytes, modelId: compiled.modelId, format: compiled.format, sampleRate: compiled.sampleRate }
}
