import type { ServiceModelAvailability } from './types'
import type { VideoModelDefinition } from './videoModels'
import { modelDisplayName } from './modelNames'

export function bytePlusLiveModels(items: Array<{ id?: string; name?: string }>): Array<{ id: string; label: string }> {
  const seen = new Set<string>()
  return items.flatMap((item) => {
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id.startsWith('dreamina-seedance-') || seen.has(id)) return []
    seen.add(id)
    return [{ id, label: item.name?.trim() || modelDisplayName(id) }]
  })
}

export function bytePlusActivationMessage(route: VideoModelDefinition, availability: ServiceModelAvailability | undefined): string | undefined {
  if (route.provider !== 'byteplus' || !availability?.verified) return undefined
  if (availability.models.some((model) => model.id === route.apiModelId)) return undefined
  return `BytePlus Seedance: Activate ${route.apiModelId} in the Ark Console, then refresh Connections.`
}

export function isBytePlusActivationFailure(message: string): boolean {
  return /has\s+not\s+activated|(?:model|endpoint).*(?:not\s+activated)|activate\s+(?:the\s+)?model(?:\s+service)?|ark\s+console/i.test(message)
}
