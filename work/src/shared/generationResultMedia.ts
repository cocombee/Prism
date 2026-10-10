import type { GenerationResult } from './types'

/** A provider-native count belongs to its one request, not the legacy repeat loop. */
export function generationCallCount(native: boolean, quantity: number | undefined, minimum = 1): number {
  return native ? 1 : Math.min(Math.max(quantity || minimum, minimum), 4)
}

/** Preserve order and every media item from a native response. */
export function generationResultMedia(result: GenerationResult): Array<{ path: string; url: string; type: 'image' | 'video' | 'audio' }> {
  if (result.outputs) {
    if (!result.outputs.length) throw new Error('The generation completed without returning media.')
    return result.outputs
  }
  return [{ path: result.outputPath, url: result.outputUrl, type: result.outputType }]
}
