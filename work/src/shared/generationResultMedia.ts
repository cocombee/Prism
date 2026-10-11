import type { GenerationResult } from './types'
import type { FalRuntimeField } from './falRuntimeInputs'

/** Keep native image/audio count fields to one call; video may repeat Prism quantity explicitly. */
export function generationCallCount(native: boolean, quantity: number | undefined, minimum = 1, repeatNative = false): number {
  if (native && !repeatNative) return 1
  const lowerBound = Number.isFinite(minimum) ? Math.min(4, Math.max(1, Math.trunc(minimum))) : 1
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity === 0) return lowerBound
  return Math.min(4, Math.max(lowerBound, Math.trunc(quantity)))
}

const PROVIDER_OUTPUT_COUNT_KEYS = new Set([
  'num_outputs', 'n_outputs', 'number_of_outputs', 'output_count', 'outputs_count',
  'num_videos', 'n_videos', 'number_of_videos', 'video_count', 'videos_count',
  'num_clips', 'clip_count', 'num_generations', 'generation_count', 'number_of_generations', 'batch_size',
])

function describesProviderOutputCount(field: Pick<FalRuntimeField, 'key' | 'label'>): boolean {
  const key = field.key.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (PROVIDER_OUTPUT_COUNT_KEYS.has(key)) return true
  const label = field.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  return /\b(?:number of|num(?:ber)? of|n of)\s+(?:generated )?(?:videos?|outputs?|clips?|generations?)\b/.test(label)
    || /\b(?:videos?|outputs?|clips?|generations?)\s+(?:output )?count\b/.test(label)
    || /\b(?:result|generated|output)\s+(?:videos?|clips?|generations?)\b/.test(label)
}

/** Missing current schema cannot establish ownership; a declared provider count owns repetition. */
export function nativeVideoQuantityAvailable(fields: readonly Pick<FalRuntimeField, 'key' | 'label'>[] | undefined): boolean {
  return fields !== undefined && !fields.some(describesProviderOutputCount)
}

function throwIfNativeVideoBatchCancelled(isCancelled: () => boolean): void {
  if (!isCancelled()) return
  const error = new Error('Native video generation was cancelled.')
  error.name = 'AbortError'
  throw error
}

/** Run explicit local video repeats sequentially. Failed calls propagate without retry. */
export async function runNativeVideoBatch(
  count: number,
  runIteration: (index: number) => Promise<void>,
  isCancelled: () => boolean,
): Promise<void> {
  const iterations = Number.isFinite(count) ? Math.min(4, Math.max(1, Math.trunc(count))) : 1
  for (let index = 0; index < iterations; index += 1) {
    throwIfNativeVideoBatchCancelled(isCancelled)
    await runIteration(index)
    throwIfNativeVideoBatchCancelled(isCancelled)
  }
}

/** Preserve order and every media item from a native response. */
export function generationResultMedia(result: GenerationResult): Array<{ path: string; url: string; type: 'image' | 'video' | 'audio' }> {
  if (result.outputs) {
    if (!result.outputs.length) throw new Error('The generation completed without returning media.')
    return result.outputs
  }
  return [{ path: result.outputPath, url: result.outputUrl, type: result.outputType }]
}
