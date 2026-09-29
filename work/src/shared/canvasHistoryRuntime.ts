import type { StudioNode } from './types'

export function sanitizeCanvasHistoryNodes(nodes: StudioNode[]): StudioNode[] {
  return nodes.map((node) => {
    const activeRun = node.data.runState === 'queued' || node.data.runState === 'running'
    const activeSequence = node.data.sequenceStatus === 'running'
    if (!activeRun && !activeSequence) return node
    const { progress: _progress, runStartedAt: _runStartedAt, ...data } = node.data
    return {
      ...node,
      data: {
        ...data,
        ...(activeRun ? { runState: 'idle' as const } : {}),
        ...(activeSequence ? { sequenceStatus: 'idle' as const } : {}),
      },
    }
  })
}
