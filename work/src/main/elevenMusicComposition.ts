/** Main-only Music composition. No credential lookup, default fetch or automatic replay. */
import { isAbsolute, sep } from 'node:path'
import { compileMusicRequest } from './elevenMusicContract'
import { generateMusic, MusicFailure, type MusicTransportOptions, type MusicTransportResult } from './elevenMusicTransport'
import { persistAudioDerivative, AudioDerivativeSaveFailure, type AudioDerivativeStorage } from './elevenAudioDerivativePersistence'

export interface MusicCompositionOptions {
  transport: MusicTransportOptions
  storage: AudioDerivativeStorage
  submission?: { beforeSubmit(): Promise<void>; completed(result: MusicTransportResult): Promise<void> }
}

export class MusicCompositionOutputFailure extends Error {
  readonly providerCompletion = 'complete'

  constructor(
    message: string,
    public readonly requestId: string | undefined,
    public readonly submissionId: string,
    public readonly saveState: AudioDerivativeSaveFailure['state'],
    public readonly retainedOutputPath?: string,
  ) {
    super(message)
    this.name = 'MusicCompositionOutputFailure'
  }
}

const failureMessage = (error: unknown) => error instanceof Error ? error.message : 'Music composition failed.'
const redact = (message: string, key?: string) => key ? message.replaceAll(key, '[redacted]') : message

export async function runMusicComposition(options: MusicCompositionOptions, raw: unknown) {
  let key: string | undefined
  const prepared = (() => {
    try {
      // Validate the original shape before cloning (structuredClone flattens custom prototypes).
      // Invalid authored input must not inspect credentials or enter a service callback.
      compileMusicRequest(raw)
      const draft = structuredClone(raw)
      const storage = { ...options.storage }
      for (const value of [storage.projectId, storage.nodeId, storage.providerProfileId, storage.submissionId]) {
        if (typeof value !== 'string' || !value.trim()) throw new Error('Missing Music submission ownership.')
      }
      if (!isAbsolute(storage.outputStem) || storage.outputStem.endsWith(sep)) throw new Error('Choose a main-owned absolute Music output stem.')
      const transport = { ...options.transport }
      key = transport.key
      const check = () => {
        transport.signal?.throwIfAborted()
        transport.assertCurrent()
        storage.assertCommit()
      }
      check()
      return { draft, storage, transport, check }
    } catch (error) {
      throw new MusicFailure(redact(failureMessage(error), key), 'not-submitted')
    }
  })()

  const { draft, storage, transport, check } = prepared
  const submission = options.submission
  const result = await generateMusic({
    ...transport,
    fetch: async (url, init) => {
      if (init?.method === 'POST') await submission?.beforeSubmit()
      check()
      return transport.fetch(url, init)
    },
    assertCurrent: check,
    assertSubmission: () => { check(); transport.assertSubmission?.(); check() },
  }, draft)

  try {
    await submission?.completed(result)
    check()
    // Persistence captures verified bytes/metadata before its first async path operation.
    return await persistAudioDerivative({ operation: 'music', ...result }, { ...storage, assertCommit: check })
  } catch (error) {
    throw new MusicCompositionOutputFailure(
      'Music completed at ElevenLabs, but local output saving failed. Check the saved assets before running again. ' + redact(failureMessage(error), key),
      result.requestId,
      storage.submissionId,
      error instanceof AudioDerivativeSaveFailure ? error.state : 'not-indexed',
      error instanceof AudioDerivativeSaveFailure ? error.retainedOutputPath : undefined,
    )
  }
}
