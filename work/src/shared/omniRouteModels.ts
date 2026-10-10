import { availableAssistantModels, isTextAssistantModelEligible, type AssistantModelOption } from './assistantModels'

export interface OmniRouteModelRecord {
  id?: string
  name?: string
  owned_by?: string
  parent?: string | null
  output_modalities?: string[]
}

const CURRENT_TEXT_UPSTREAMS = new Set(['claude', 'anthropic', 'codex', 'openai', 'gemini', 'google', 'deepseek', 'moonshot'])

function titleCaseModel(value: string): string {
  return value
    .replace(/^gemini-/i, 'Gemini ')
    .replace(/^gpt-/i, 'GPT ')
    .replace(/^claude-/i, 'Claude ')
    .replace(/-/g, ' ')
    .replace(/\bopus\b/gi, 'Opus')
    .replace(/\bsonnet\b/gi, 'Sonnet')
    .replace(/\bflash\b/gi, 'Flash')
    .replace(/\bsol\b/gi, 'Sol')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function omniRouteModelLabel(model: OmniRouteModelRecord & { id: string }): string {
  if (model.id.startsWith('auto/')) return `${titleCaseModel(model.id.slice(5))} (Auto)`
  const name = (model.name || model.id.split('/').at(-1) || model.id).replace(/^[^/]+\//, '')
  return titleCaseModel(name)
}

export function omniRouteModelOptions(models: OmniRouteModelRecord[]): AssistantModelOption[] {
  const byOwner = new Map<string, AssistantModelOption[]>()
  models
    .filter((model): model is OmniRouteModelRecord & { id: string; owned_by: string } => Boolean(
      model.id
      && model.owned_by
      && CURRENT_TEXT_UPSTREAMS.has(model.owned_by)
      && model.owned_by !== 'combo'
      && !model.parent
      && !model.id.startsWith('no-think/')
      && !model.id.startsWith('auto/')
      && (!model.output_modalities?.length || model.output_modalities.includes('text')),
    ))
    .filter((model) => !model.output_modalities?.some((modality) => modality.toLowerCase() === 'audio')
      && isTextAssistantModelEligible({ id: model.id, label: omniRouteModelLabel(model) }))
    .forEach((model) => byOwner.set(model.owned_by, [...(byOwner.get(model.owned_by) || []), { id: model.id, label: omniRouteModelLabel(model) }]))
  return [...byOwner.values()].flatMap((ownerModels) => availableAssistantModels(ownerModels))
}

export function omniRouteChatRequest(model: string, prompt: string) {
  return {
    model,
    messages: [{ role: 'user' as const, content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
    stream: false,
  }
}

export function omniRouteRewriteOutput(body: unknown): string | undefined {
  const choices = (body as { choices?: Array<{ message?: { content?: string } }> } | null)?.choices
  return choices?.map((choice) => choice.message?.content).find((content): content is string => Boolean(content?.trim()))?.trim()
}
