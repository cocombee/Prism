import { availableAssistantModels, latestAssistantMenuModels, isTextAssistantModelEligible, type AssistantModelOption, type AssistantProvider } from './assistantModels'
import { modelDisplayName } from './modelNames'

export type AssistantCatalogs = Partial<Record<AssistantProvider, AssistantModelOption[]>>

const PROVIDERS: Array<{ id: AssistantProvider; label: string }> = [
  { id: 'omniroute', label: 'OmniRoute' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'google', label: 'Google Gemini' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'moonshot', label: 'Kimi' },
]

export function assistantCatalogsWithSavedSelection(
  catalogs: AssistantCatalogs,
  savedProvider: string | undefined,
  savedModel: string | undefined,
  savedProviderCatalogVerified = false,
): AssistantCatalogs {
  if (!savedProvider || !savedModel || !PROVIDERS.some(({ id }) => id === savedProvider)) return catalogs
  const provider = savedProvider as AssistantProvider
  if (savedProviderCatalogVerified || (catalogs[provider] || []).length) return catalogs
  const fallback = { id: savedModel, label: modelDisplayName(savedModel) }
  if (!isTextAssistantModelEligible(fallback)) return catalogs
  return { ...catalogs, [provider]: [fallback] }
}

export function assistantModelGroups(catalogs: AssistantCatalogs, savedProvider?: string, savedModel?: string) {
  return PROVIDERS.flatMap(({ id, label }) => {
    const models = availableAssistantModels(catalogs[id] || [])
    const saved = id === savedProvider ? catalogs[id]?.find((model) => model.id === savedModel && isTextAssistantModelEligible(model)) : undefined
    if (saved && !models.some((model) => model.id === saved.id)) models.push({ id: saved.id, label: modelDisplayName(saved.id, saved.label) })
    return models.length ? [{
      provider: id,
      label,
      options: models.map((model) => ({ value: `${id}::${model.id}`, label: model.label, provider: id })),
    }] : []
  })
}

export function resolveAssistantSelection(
  savedProvider: string | undefined,
  savedModel: string | undefined,
  catalogs: AssistantCatalogs,
): { provider: AssistantProvider; model: string } | undefined {
  const groups = assistantModelGroups(catalogs, savedProvider, savedModel)
  const savedGroup = groups.find((group) => group.provider === savedProvider)
  const savedOption = savedGroup?.options.find((option) => option.value === `${savedProvider}::${savedModel}`)
  if (savedGroup && savedOption && savedModel) return { provider: savedGroup.provider, model: savedModel }
  if (savedModel && PROVIDERS.some(({ id }) => id === savedProvider)) return undefined
  const first = groups[0]?.options[0]
  return first ? { provider: groups[0].provider, model: first.value.slice(first.value.indexOf('::') + 2) } : undefined
}

export function latestAssistantModelGroups(catalogs: AssistantCatalogs) {
  return PROVIDERS.flatMap(({ id, label }) => {
    const models = latestAssistantMenuModels(catalogs[id] || [])
    return models.length ? [{ provider: id, label, options: models.map(model => ({ value: `${id}::${model.id}`, label: model.label, provider: id })) }] : []
  })
}

export const ASSISTANT_PROVIDER_GROUPS = PROVIDERS
