import { constants } from 'node:fs'
import { lstat, open, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
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
  const bytes = Buffer.from(output.bytes)
  const digest = createHash('sha256').update(bytes).digest('hex')
  const outputPath = storage.outputStem + output.extension
  const modelId = `elevenlabs/${response.modelId}`
  const requestId = response.requestId || storage.fallbackRequestId
  const metadata: ImportedAsset['metadata'] = structuredClone({ provider: 'ElevenLabs', modelId, prompt: request.prompt, audioOutputFormat: response.outputFormat, ...(request.elevenSpeechMode === 'dialogue' ? { elevenDialogueInputs: request.elevenDialogueTurns?.map(turn => ({ text: turn.text, voiceId: turn.voiceId.trim() })) } : {}),
    ...(response.alignment || response.normalizedAlignment || response.voiceSegments ? { audioTiming: { alignment: response.alignment, normalizedAlignment: response.normalizedAlignment, ...(response.voiceSegments ? { voiceSegments: response.voiceSegments } : {}) } } : {}) })
  let owned: { dev: number; ino: number } | undefined, indexed = false
  let file: Awaited<ReturnType<typeof open>> | undefined
  try {
    storage.assertCommit()
    file = await open(outputPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
    const created = await file.stat()
    owned = { dev: created.dev, ino: created.ino }
    await file.writeFile(bytes)
    await file.sync()
    await file.close()
    file = undefined
    storage.assertCommit()
    const verify = await open(outputPath, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const before = await verify.stat()
      if (!before.isFile() || before.dev !== owned.dev || before.ino !== owned.ino || before.size !== bytes.length) throw new Error('The created ElevenLabs output changed before registration.')
      const hash = createHash('sha256'), chunk = Buffer.alloc(Math.min(256 * 1024, bytes.length))
      let count = 0
      while (count < bytes.length) {
        const read = await verify.read(chunk, 0, Math.min(chunk.length, bytes.length - count), null)
        if (!read.bytesRead) throw new Error('The created ElevenLabs output was truncated.')
        count += read.bytesRead
        hash.update(chunk.subarray(0, read.bytesRead))
      }
      const extra = await verify.read(Buffer.alloc(1), 0, 1, null), after = await verify.stat()
      const current = await lstat(outputPath)
      if (extra.bytesRead || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || hash.digest('hex') !== digest || !current.isFile() || current.isSymbolicLink() || current.dev !== owned.dev || current.ino !== owned.ino) throw new Error('The created ElevenLabs output changed before registration.')
    } finally { await verify.close() }
    storage.assertCommit()
    await storage.register(outputPath, metadata, () => { indexed = true })
    indexed = true
    storage.assertCommit()
    await storage.history(outputPath, modelId)
    return { requestId, modelId, outputPath, outputUrl: storage.localUrl(outputPath), outputType: 'audio' }
  } catch (error) {
    await file?.close().catch(() => undefined)
    if (owned && !indexed) {
      try {
        const current = await lstat(outputPath)
        if (current.isFile() && !current.isSymbolicLink() && current.dev === owned.dev && current.ino === owned.ino) await unlink(outputPath)
      } catch (cleanup) {
        if ((cleanup as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw new AggregateError([error, cleanup], 'ElevenLabs output saving failed and its unindexed file requires recovery.')
        }
      }
    }
    throw error
  }
}
