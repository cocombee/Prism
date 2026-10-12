import { assertFalMediaUrl } from '../shared/falNativeExecution'
import { videoDraftCompletionInput, type VideoDraftReceipt } from '../shared/videoDraft'
import type { GenerationRequest, GenerationResult } from '../shared/types'

export interface VideoDraftCompletionDependencies {
  assertCurrent(): void
  receipt(path: string): Promise<VideoDraftReceipt>
  accountFingerprint(provider: VideoDraftReceipt['provider']): Promise<string>
  submit(receipt: VideoDraftReceipt, input: ReturnType<typeof videoDraftCompletionInput>, signal?: AbortSignal): Promise<{ requestId: string; url: string; contentType?: string }>
  persist(output: { url: string; contentType?: string }, receipt: VideoDraftReceipt, signal?: AbortSignal): Promise<{ path: string; url: string }>
}

/** A source clip is looked up in the current managed asset index, never trusted from renderer metadata. */
export async function executeVideoDraftCompletion(request: GenerationRequest, dependencies: VideoDraftCompletionDependencies, signal?: AbortSignal): Promise<GenerationResult> {
  const assertCurrent = () => { signal?.throwIfAborted(); dependencies.assertCurrent() }
  assertCurrent()
  if (request.kind !== 'video-generator' || request.quantity !== 1 || !request.draftCompletion || typeof request.draftCompletion.outputPath !== 'string' || !request.draftCompletion.outputPath) throw new Error('Select one linked draft result.')
  const receipt = await dependencies.receipt(request.draftCompletion.outputPath)
  assertCurrent()
  if (receipt.provider !== request.draftCompletion.provider) throw new Error('The draft belongs to another provider.')
  const account = await dependencies.accountFingerprint(receipt.provider)
  assertCurrent()
  const input = videoDraftCompletionInput(receipt, account)
  const output = await dependencies.submit(receipt, input, signal)
  assertCurrent()
  assertFalMediaUrl(output.url)
  const finalReceipt: VideoDraftReceipt = { ...receipt, status: 'final', sourcePath: request.draftCompletion.outputPath }
  const saved = await dependencies.persist(output, finalReceipt, signal)
  assertCurrent()
  return { requestId: output.requestId, modelId: receipt.modelId, outputPath: saved.path, outputUrl: saved.url, outputType: 'video', videoDraft: finalReceipt }
}
