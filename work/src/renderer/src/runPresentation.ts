import { useEffect, useState } from 'react'
import type { StudioNodeData } from '../../shared/types'

export type GenerationActionState = 'run' | 'stop' | 'rerun'

export function hasGeneratedResult(data: StudioNodeData): boolean {
  return Boolean(
    data.outputUrl
    || data.outputPath
    || data.generatedResults?.some((result) => result.url || result.path),
  )
}

export function generationActionState(data: StudioNodeData): GenerationActionState {
  if (data.runState === 'queued' || data.runState === 'running') return 'stop'
  return hasGeneratedResult(data) ? 'rerun' : 'run'
}

export function estimatedGenerationSeconds(data: StudioNodeData): number {
  if (Number.isFinite(data.learnedGenerationSeconds) && (data.learnedGenerationSeconds || 0) > 0) return Math.round(data.learnedGenerationSeconds!)
  const quantity = Math.max(1, data.quantity || 1)
  if (data.kind === 'video-generator') {
    const engine = data.videoEngine || ''
    const modelBase = /kling/i.test(engine) ? 180 : /seedance/i.test(engine) ? 150 : 120
    const durationCost = Math.max(1, Number(data.duration) || 5) * 8
    const resolutionFactor = /1080|4k/i.test(data.resolution || '') ? 1.3 : 1
    return Math.round((modelBase + durationCost) * resolutionFactor * quantity)
  }
  if (data.kind === 'upscaler') return (data.upscalerModel === 'realesrgan-video' ? 180 : 75) * quantity
  if (data.kind === 'voiceover') return Math.max(35, Math.round((data.prompt?.length || 120) / 8)) * quantity
  if (data.kind === 'sound-effects' || data.kind === 'music-generator') return 55 * quantity
  if (data.kind === 'character') return Math.max(1, 9 - new Set((data.referenceAssets || []).map((asset) => asset.metadata?.characterView).filter(Boolean)).size) * 70
  if (data.kind === 'element') return Math.max(1, 4 - (data.referenceAssets?.length || 0)) * 65
  if (data.kind === 'storyboard') return Math.max(1, data.storyboardPanels?.length || 1) * 55
  return 60 * quantity
}

export function formatGenerationTimeLeft(seconds: number): string {
  if (seconds <= 0) return 'Finishing… · estimate exceeded'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `Estimated ${minutes ? `${minutes}m ` : ''}${remainder}s left`
}

export function useGenerationTimeLeft(data: StudioNodeData | undefined, running: boolean, runKey = ''): string | null {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) {
      setStartedAt(null)
      return
    }
    const parsedStart = data?.runStartedAt ? Date.parse(data.runStartedAt) : Number.NaN
    const start = Number.isFinite(parsedStart) ? parsedStart : Date.now()
    setStartedAt(start)
    setNow(start)
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [data?.runStartedAt, runKey, running])

  if (!running || !data) return null
  const elapsed = startedAt === null ? 0 : Math.floor((now - startedAt) / 1000)
  return formatGenerationTimeLeft(Math.max(0, estimatedGenerationSeconds(data) - elapsed))
}
