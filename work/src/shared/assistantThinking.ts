import type { AssistantModelOption } from './assistantModels'

const THINKING_SEPARATOR = '::thinking='
/** Saved choices carry the exact model and published effort without changing provider model IDs. */
export function assistantThinkingSelection(id: string): { model: string; effort?: string } {
  const index = id.lastIndexOf(THINKING_SEPARATOR)
  if (index < 0) return { model: id }
  const effort = id.slice(index + THINKING_SEPARATOR.length)
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(effort)) throw new Error('Invalid thinking selection.')
  return { model: id.slice(0, index), effort }
}
export function assistantThinkingOptions(model: AssistantModelOption, supported: unknown): AssistantModelOption[] {
  if (!Array.isArray(supported)) return [model]
  const efforts = [...new Set(supported.flatMap(value => typeof value?.reasoningEffort === 'string' && /^[a-z][a-z0-9_-]{0,31}$/.test(value.reasoningEffort) ? [value.reasoningEffort] : []))]
  return [model, ...efforts.map(effort => ({ id: `${model.id}${THINKING_SEPARATOR}${effort}`, label: `${model.label} · ${effort}` }))]
}
/** Public Responses API contract; Codex-only orchestration levels are not API efforts. */
export const OPENAI_API_REASONING_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])

export function openAiThinkingRequest(id: string, input: string) {
  const { model, effort } = assistantThinkingSelection(id)
  if (effort && !OPENAI_API_REASONING_EFFORTS.has(effort)) throw new Error('This thinking level is not supported by the OpenAI API route.')
  return { model, input, ...(effort ? { reasoning: { effort } } : {}) }
}
