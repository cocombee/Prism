export const NODE_TRANSIENT_NOTICE_MS = 5200

export type NodeNotificationCategory = 'running' | 'transient' | 'error' | 'readiness' | 'helper' | 'none'

export interface NodeNotificationState {
  runState?: string
  progress?: string
  error?: string
  readiness?: boolean
  helper?: boolean
  suppressTerminal?: boolean
}

export function nodeNotificationCategory(state: NodeNotificationState): NodeNotificationCategory {
  if (state.helper) return 'helper'
  if (state.readiness) return 'readiness'
  if (state.error) return 'error'
  if (state.runState === 'queued' || state.runState === 'running') return 'running'
  if (state.progress && !state.suppressTerminal) return 'transient'
  return 'none'
}

export function nodeLifecycleTransition<T extends NodeNotificationState & { notificationVersion?: number }>(current: T, patch: Partial<T>): Partial<T> {
  const next: Partial<T> = { ...patch }
  const nextRunState = patch.runState ?? current.runState
  if (patch.error) {
    next.progress = undefined
    if (!patch.runState || patch.runState === 'complete') next.runState = 'error' as T['runState']
  } else if (patch.progress && nextRunState !== 'queued' && nextRunState !== 'running') {
    next.notificationVersion = ((current.notificationVersion || 0) + 1) as T['notificationVersion']
  }
  return next
}

export interface NodeProgressExpiryState { runState?: string; progress?: string; error?: string; notificationVersion?: number }
export type NodeProgressExpiryTimers = Map<string, { progress: string; version: number; handle: ReturnType<typeof setTimeout> }>

export function cancelNodeProgressExpiry(nodeId: string, timers: NodeProgressExpiryTimers): void {
  const timer = timers.get(nodeId)
  if (timer) clearTimeout(timer.handle)
  timers.delete(nodeId)
}

export function scheduleNodeProgressExpiry(
  nodeId: string,
  progress: string,
  version: number,
  timers: NodeProgressExpiryTimers,
  read: (nodeId: string) => NodeProgressExpiryState | undefined,
  clear: (nodeId: string, progress: string, version: number) => void,
): void {
  const existing = timers.get(nodeId)
  if (existing?.progress === progress && existing.version === version) return
  cancelNodeProgressExpiry(nodeId, timers)
  const handle = setTimeout(() => {
    const current = read(nodeId)
    timers.delete(nodeId)
    if (!current || current.progress !== progress || current.notificationVersion !== version || current.error || current.runState === 'queued' || current.runState === 'running') return
    clear(nodeId, progress, version)
  }, NODE_TRANSIENT_NOTICE_MS)
  timers.set(nodeId, { progress, version, handle })
}
