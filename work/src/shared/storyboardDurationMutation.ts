import type { StudioNode, StudioNodeData } from './types'

export function applyGeneratorLocalDurationPatch(
  nodes: StudioNode[],
  nodeId: string,
  patch: Pick<StudioNodeData, 'duration' | 'autoDuration'>,
): StudioNode[] {
  if (!Number.isFinite(patch.duration) || Number(patch.duration) <= 0) return nodes
  const index = nodes.findIndex((node) => node.id === nodeId && node.data.kind === 'video-generator')
  if (index < 0) return nodes
  const node = nodes[index]
  const next = [...nodes]
  next[index] = { ...node, data: { ...node.data, duration: patch.duration, autoDuration: patch.autoDuration } }
  return next
}