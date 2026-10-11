import { stat } from 'node:fs/promises'

/** Caller must authorize/canonicalize the managed path before this read. */
export async function assertFalMediaFileLimit(path: string | undefined, maximumBytes?: number): Promise<void> {
  if (maximumBytes === undefined) return
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) throw new Error('Invalid model file-size limit.')
  if (!path) throw new Error(`Import this remote input locally to verify the model's ${maximumBytes / 1_000_000} MB file limit before uploading.`)
  const file = await stat(path)
  if (!file.isFile()) throw new Error('The connected media is not a file.')
  if (file.size > maximumBytes) throw new Error(`The connected file exceeds the model's ${maximumBytes / 1_000_000} MB limit. Choose a smaller file.`)
}
