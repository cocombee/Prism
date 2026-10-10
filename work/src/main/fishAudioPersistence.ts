import { writeFile, rm } from 'node:fs/promises'
import type { GenerationRequest, GenerationResult } from '../shared/types'
import type { ElevenAudioStorage } from './elevenLabsAudioPersistence'
import type { FishAudioResponse } from './fishAudioApi'

/** Fish documents raw PCM as signed16-bit mono. Retain its actual requested rate. */
function playable(response: FishAudioResponse): { bytes: Buffer; extension: string } {
  if (response.format !== 'pcm') return { bytes: response.bytes, extension: `.${response.format}` }
  const pcm = response.bytes
  if (pcm.length % 2) throw new Error('Fish Audio returned incomplete PCM audio.')
  const header = Buffer.alloc(44)
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8)
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22); header.writeUInt32LE(response.sampleRate, 24)
  header.writeUInt32LE(response.sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34)
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40)
  return { bytes: Buffer.concat([header, pcm]), extension: '.wav' }
}
export async function persistFishAudio(request: GenerationRequest, response: FishAudioResponse, storage: ElevenAudioStorage): Promise<GenerationResult> {
  const output = playable(response), outputPath = storage.outputStem + output.extension, modelId = `fish-audio/${response.modelId}`
  let written = false, indexed = false
  try {
    storage.assertCommit(); await writeFile(outputPath, output.bytes, { flag: 'wx' }); written = true
    storage.assertCommit(); await storage.register(outputPath, { provider: 'Fish Audio', modelId, prompt: request.prompt, audioOutputFormat: `${response.format}_${response.sampleRate}` }, () => { indexed = true }); indexed = true
    storage.assertCommit(); await storage.history(outputPath, modelId)
    return { requestId: storage.fallbackRequestId, modelId, outputPath, outputUrl: storage.localUrl(outputPath), outputType: 'audio' }
  } catch (error) { if (written && !indexed) await rm(outputPath, { force: true }); throw error }
}
