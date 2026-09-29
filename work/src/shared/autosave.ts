export const AUTOSAVE_INTERVAL_MS = 60_000

export function nextAutosaveDelay(lastAutosaveAt: number, now = Date.now()): number {
  return Math.max(0, AUTOSAVE_INTERVAL_MS - (now - lastAutosaveAt))
}
