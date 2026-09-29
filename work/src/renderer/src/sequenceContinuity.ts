import type { StudioNode } from '../../shared/types'
import { resolveVideoModel } from '../../shared/videoModels'

export function orderedSequenceNodes(nodes: StudioNode[]): StudioNode[] {
  return nodes.filter((node) => node.data.kind === 'video-generator' && node.data.sequenceEnabled)
    .sort((a, b) => (a.data.sequenceOrder ?? Number.MAX_SAFE_INTEGER) - (b.data.sequenceOrder ?? Number.MAX_SAFE_INTEGER) || a.position.x - b.position.x || a.position.y - b.position.y)
}

export function continuityVideoEngine(engine?: string): string {
  const model = resolveVideoModel(engine)
  if (model.mode !== 'text') return model.id
  if (model.family === 'wan') throw new Error('Wan controlled-FPS has no Starting Image endpoint. Choose Seedance, Kling, or Veo for sequence continuity.')
  const imageId = model.id.replace('/text-to-video', '/image-to-video')
  if (imageId === model.id && model.family === 'veo') return `${model.id}/image-to-video`
  return imageId
}

/** Seeking to exactly `duration` lands past the last decoded frame on most encoders and yields black. */
export function finalFrameSeekTime(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  return Math.max(0, duration - Math.min(.08, duration / 20))
}

/**
 * A sequence run blocks on this, so every wait is bounded. Without a timeout a
 * video that never fires `loadedmetadata` or `seeked` strands the whole chain
 * with no way back.
 */
function videoEvent(video: HTMLVideoElement, event: string, failure: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error(`${failure} (timed out after ${Math.round(timeoutMs / 1000)}s)`))
    }, timeoutMs)
    const done = () => { cleanup(); resolve() }
    const failed = () => { cleanup(); reject(new Error(failure)) }
    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener(event, done)
      video.removeEventListener('error', failed)
    }
    video.addEventListener(event, done, { once: true })
    video.addEventListener('error', failed, { once: true })
  })
}

export async function extractFinalVideoFrame(source: string, timeoutMs = 20000): Promise<Blob> {
  if (!source) throw new Error('That shot has no video output to read a final frame from.')
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  video.src = source
  try {
    await videoEvent(video, 'loadedmetadata', 'The completed video could not be loaded for final-frame extraction.', timeoutMs)
    // A fragmented MP4 reports Infinity until it is forced to scan to the end.
    if (!Number.isFinite(video.duration)) {
      video.currentTime = Number.MAX_SAFE_INTEGER
      await videoEvent(video, 'durationchange', 'The completed video has no readable duration.', timeoutMs)
    }
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('The completed video has no readable duration.')
    video.currentTime = finalFrameSeekTime(video.duration)
    await videoEvent(video, 'seeked', 'The completed video could not seek to its final frame.', timeoutMs)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context || !canvas.width || !canvas.height) throw new Error('The completed video has no drawable final frame.')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('The final continuity frame could not be encoded.')
    return blob
  } finally {
    // Release the decoder even when a load, seek or draw threw — a long sequence
    // with failures would otherwise hold one open per attempt.
    video.removeAttribute('src')
    video.load()
  }
}
