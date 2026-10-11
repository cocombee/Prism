import type { ServiceModelAvailability } from './types'
import type { ModelMenuOption } from './modelCatalogMenu'

export type FalProductionFlow = 'image' | 'video' | 'voice' | 'effects'
export type FalAvailableModel = ServiceModelAvailability['models'][number]

function videoOptionLabel(model: FalAvailableModel): string {
  if (!model.catalog?.mode) return model.label
  let release = model.catalog.release.replace(/^ltx\b/i, 'LTX').replace(/^Veo(?=\d)/i, 'Veo ').replace(/\s+FLF$/i, '')
    .replace(/^Kling Video\s+v?(\d+(?:\.\d+)*)/i, (_, version: string) => `Kling ${version.includes('.') ? version : `${version}.0`}`)
    .replace(/\[([^\]]+)\]/g, '$1')
  if (model.catalog.company === 'MiniMax' && /^H3\b/.test(release)) release = `MiniMax ${release}`
  return `${release} · ${model.catalog.mode}`
}

/** Published display names need not identify a unique route. Keep all exact IDs
 * and append the shortest endpoint suffix needed to distinguish collisions. */
function distinguishVideoOptions(options: ModelMenuOption[]): void {
  const labels = new Map<string, ModelMenuOption[]>()
  for (const option of options) {
    const siblings = labels.get(option.label) || []
    siblings.push(option)
    labels.set(option.label, siblings)
  }
  for (const siblings of labels.values()) {
    if (siblings.length < 2) continue
    let depth = 1
    while (new Set(siblings.map(option => option.value.split('/').slice(-depth).join('/'))).size < siblings.length) depth++
    for (const option of siblings) {
      const suffix = option.value.split('/').slice(-depth).map(part => part.toLowerCase() === 'lora' ? 'LoRA' : part.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())).join(' · ')
      option.label = `${option.label} · ${suffix}`
    }
  }
}

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
    options.push({ value: model.id, label: flow === 'video' ? videoOptionLabel(model) : model.label, catalog: model.catalog, aliases: [model.label, model.id, model.description || '', model.catalog?.company || '', model.catalog?.release || '', model.catalog?.mode || ''] })
  }
  // A saved unavailable route remains inspectable instead of becoming Wan or
  // another first option. Only a complete verified catalog proves absence.
  if (saved && !seen.has(saved.id)) options.push({ value: saved.id, label: saved.label || saved.id,
    disabled: availability?.provider === 'fal' && availability.verified && !availability.catalogStale,
    catalog: { service: 'fal.ai', company: 'Saved selection', release: saved.label || saved.id } })
  if (flow === 'video') distinguishVideoOptions(options)
  return options
}
