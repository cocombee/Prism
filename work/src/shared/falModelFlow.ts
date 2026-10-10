import type { ServiceModelAvailability } from './types'
import type { ModelMenuOption } from './modelCatalogMenu'

export type FalProductionFlow = 'image' | 'video' | 'voice' | 'effects'
export type FalAvailableModel = ServiceModelAvailability['models'][number]

/** Discovery categories identify output flows; endpoint mode remains its own catalog metadata. */
export function falProductionFlow(category: string | undefined): FalProductionFlow | undefined {
  if (!category || /3d|mesh|training|fine-tun|music/i.test(category)) return undefined
  if (/(?:^|-)video$/.test(category)) return 'video'
  if (/(?:^|-)image$/.test(category)) return 'image'
  if (/(?:^|-)speech$/.test(category) || category === 'text-to-dialogue') return 'voice'
  if (/(?:^|-)audio$/.test(category) || category === 'sound-effects') return 'effects'
  return undefined
}

/** No release/mode truncation or ID substitution. Native services retain their own menu owner. */
export function falFlowMenuOptions(flow: FalProductionFlow, availability: ServiceModelAvailability | undefined, saved?: { id: string; label?: string }): ModelMenuOption[] {
  const models = availability?.provider === 'fal' ? availability.models : []
  const seen = new Set<string>()
  const options: ModelMenuOption[] = []
  for (const model of models) {
    if (falProductionFlow(model.category) !== flow || seen.has(model.id)) continue
    seen.add(model.id)
    options.push({ value: model.id, label: model.label, catalog: model.catalog, aliases: [model.id, model.description || '', model.catalog?.company || '', model.catalog?.release || '', model.catalog?.mode || ''] })
  }
  // A saved unavailable route remains inspectable instead of becoming Wan or
  // another first option. Only a complete verified catalog proves absence.
  if (saved && !seen.has(saved.id)) options.push({ value: saved.id, label: saved.label || saved.id,
    disabled: availability?.provider === 'fal' && availability.verified && !availability.catalogStale,
    catalog: { service: 'fal.ai', company: 'Saved selection', release: saved.label || saved.id } })
  return options
}
