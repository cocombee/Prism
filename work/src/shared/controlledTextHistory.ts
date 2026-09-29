export interface ControlledTextSnapshot { value: string; start: number; end: number; direction: 'forward' | 'backward' | 'none'; scrollTop: number; scrollLeft: number }
export interface ControlledTextHistory { past: ControlledTextSnapshot[]; current: ControlledTextSnapshot; future: ControlledTextSnapshot[] }
export const createControlledTextHistory = (current: ControlledTextSnapshot): ControlledTextHistory => ({ past: [], current, future: [] })
export function recordControlledText(history: ControlledTextHistory, next: ControlledTextSnapshot): ControlledTextHistory {
  if (next.value === history.current.value) return { ...history, current: next }
  return { past: [...history.past.slice(-99), history.current], current: next, future: [] }
}
export function undoControlledText(history: ControlledTextHistory): ControlledTextHistory {
  const previous = history.past.at(-1); if (!previous) return history
  return { past: history.past.slice(0, -1), current: previous, future: [history.current, ...history.future] }
}
export function redoControlledText(history: ControlledTextHistory): ControlledTextHistory {
  const next = history.future[0]; if (!next) return history
  return { past: [...history.past, history.current], current: next, future: history.future.slice(1) }
}
