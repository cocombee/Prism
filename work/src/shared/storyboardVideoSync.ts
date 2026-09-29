import type { Edge } from '@xyflow/react'
import type { StudioNode, StudioNodeData } from './types'
import { resolveVideoModel, videoModelDurationInventory } from './videoModels'

export interface ConnectedStoryboardVideo {
  nodeId: string
  modelId: string
  duration: number
  durationOptions: number[]
}

export function clampToLegalDuration(value: number, allowed: readonly number[]): number {
  const legal = [...new Set(allowed)].sort((a, b) => a - b)
  if (!legal.length) return value
  if (value <= legal[0]) return legal[0]
  if (value >= legal[legal.length - 1]) return legal[legal.length - 1]
  return legal.reduce((best, candidate) => {
    const candidateDistance = Math.abs(candidate - value)
    const bestDistance = Math.abs(best - value)
    return candidateDistance < bestDistance || candidateDistance === bestDistance && candidate < best ? candidate : best
  }, legal[0])
}

export function normalizedGeneratorDurationPatch(data: Pick<StudioNodeData, 'videoEngine' | 'duration' | 'frameRate'>): Pick<StudioNodeData, 'duration' | 'autoDuration'> {
  const options = videoModelDurationInventory(data.videoEngine, data.frameRate).filter((value): value is number => typeof value === 'number')
  if (!options.length) return { duration: data.duration, autoDuration: false }
  return { duration: clampToLegalDuration(Number.isFinite(data.duration) ? data.duration! : options[0], options), autoDuration: false }
}

export function connectedStoryboardVideo(nodes: StudioNode[], edges: Edge[], storyboardId: string): ConnectedStoryboardVideo | undefined {
  const edge = edges.find((candidate) => candidate.source === storyboardId && candidate.targetHandle === 'storyboard-in')
  const generator = edge && nodes.find((node) => node.id === edge.target && node.data.kind === 'video-generator')
  if (!generator) return undefined
  const model = resolveVideoModel(generator.data.videoEngine)
  const durationOptions = videoModelDurationInventory(model.id, generator.data.frameRate).filter((value): value is number => typeof value === 'number')
  const duration = clampToLegalDuration(Number.isFinite(generator.data.duration) ? generator.data.duration! : durationOptions[0], durationOptions)
  return { nodeId: generator.id, modelId: model.id, duration, durationOptions }
}
