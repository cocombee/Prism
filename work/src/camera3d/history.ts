export type History<T> = {
  present(): T
  push(next: T): void
  undo(): T
  redo(): T
  depth(): { undo: number; redo: number }
}
export function createHistory<T>(initial: T, limit = 128): History<T> {
  let present = structuredClone(initial); let past: T[] = []; let future: T[] = []
  return {
    present: () => structuredClone(present),
    push(next) { past.push(structuredClone(present)); if (past.length > limit) past = past.slice(-limit); present = structuredClone(next); future = [] },
    undo() { const previous = past.pop(); if (previous) { future.unshift(structuredClone(present)); present = previous } return structuredClone(present) },
    redo() { const next = future.shift(); if (next) { past.push(structuredClone(present)); present = next } return structuredClone(present) },
    depth: () => ({ undo: past.length, redo: future.length }),
  }
}
