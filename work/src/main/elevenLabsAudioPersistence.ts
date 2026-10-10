import { writeFile, rm } from 'node:fs/promises'
import type { GenerationRequest, GenerationResult, ImportedAsset } from '../shared/types'
import type { ElevenAudioResponse } from './elevenLabsApi'
import { playableElevenAudio } from './elevenLabsAudioFile'

export interface ElevenAudioStorage {
  outputStem: string
  fallbackRequestId: string
  assertCommit(): void
  register(path: string, metadata: ImportedAsset['metadata'], onIndexed: () => void): Promise<unknown>
  history(path: string, modelId: string): Promise<void>
  localUrl(path: string): string
}

/** Only remove an unindexed file that this exact request successfully created. */
export async function persistElevenAudio(request: GenerationRequest, response: ElevenAudioResponse, storage: ElevenAudioStorage): Promise<GenerationResult> {
  const output = playableElevenAudio(response.bytes, response.outputFormat)
  const outputPath = storage.outputStem + output.extension
  const modelId = `elevenlabs/${response.modelId}`
  let written = false, indexed = false
  try {
    storage.assertCommit()
    await writeFile(outputPath, output.bytes, { flag: 'wx' })
    written = true
    storage.assertCommit()
    await storage.register(outputPath, { provider: 'ElevenLabs', modelId, prompt: request.prompt, audioOutputFormat: response.outputFormat, ...(request.elevenSpeechMode === 'dialogue' ? { elevenDialogueInputs: request.elevenDialogueTurns?.map(turn => ({ text: turn.text, voiceId: turn.voiceId.trim() })) } : {}),
      ...(response.alignment || response.normalizedAlignment || response.voiceSegments ? { audioTiming: { alignment: response.alignment, normalizedAlignment: response.normalizedAlignment, ...(response.voiceSegments ? { voiceSegments: response.voiceSegments } : {}) } } : {}) }, () => { indexed = true })
    indexed = true
    storage.assertCommit()
    await storage.history(outputPath, modelId)
    return { requestId: response.requestId || storage.fallbackRequestId, modelId, outputPath, outputUrl: storage.localUrl(outputPath), outputType: 'audio' }
  } catch (error) {
    if (written && !indexed) await rm(outputPath, { force: true })
    throw error
  }
}
