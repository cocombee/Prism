import type { FalJson } from './falSchemaBinding'

/** Shared field editing only; never provider routing, roles or request defaults. */
export function editNativeInputValue<T extends { values: Record<string, FalJson>; drafts?: Record<string, string> }>(state: T, key: string, text: string, kind: 'text' | 'number' | 'json'): T & { values: Record<string, FalJson>; drafts: Record<string, string> } {
  const values = { ...state.values }, drafts = { ...state.drafts }
  if (kind === 'text') { values[key] = text; delete drafts[key] }
  else if (!text.trim()) { delete values[key]; delete drafts[key] }
  else {
    try {
      const value: FalJson = kind === 'number' ? Number(text) : JSON.parse(text)
      if (kind === 'number' && !Number.isFinite(value)) throw new Error('Invalid number')
      values[key] = value; delete drafts[key]
    } catch { drafts[key] = text }
  }
  return { ...state, values, drafts }
}
