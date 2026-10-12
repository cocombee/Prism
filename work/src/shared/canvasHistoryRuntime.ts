import type { StudioNode } from './types'
import type { Edge } from '@xyflow/react'

export type CanvasHistoryState = { undo: string[]; redo: string[]; baseline: string }

/** Selection is presentation, not a graph edit or an Undo step. */
export function canvasHistoryEdges(edges: Edge[]): Edge[] {
  return edges.map(({ selected: _selected, ...edge }) => edge)
}

export function recordCanvasHistorySnapshot(state: CanvasHistoryState, snapshot: string, restoring = false): CanvasHistoryState {
  if (snapshot === state.baseline) return state
  if (restoring || !state.baseline) return { ...state, baseline: snapshot }
  return { undo: [...state.undo.slice(-49), state.baseline], redo: [], baseline: snapshot }
}

export function switchCanvasHistoryOwner(histories: Map<string, CanvasHistoryState>, previousOwner: string, nextOwner: string, current: CanvasHistoryState, outgoingSnapshot: string, incomingSnapshot: string, restoring = false): CanvasHistoryState {
  if (previousOwner && previousOwner !== nextOwner) histories.set(previousOwner, recordCanvasHistorySnapshot(current, outgoingSnapshot, restoring))
  const next = histories.get(nextOwner)
  return next ? { ...next, baseline: incomingSnapshot } : { undo: [], redo: [], baseline: incomingSnapshot }
}

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
