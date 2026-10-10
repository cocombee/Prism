import type { GenerationRequest } from './types'

type Reference = NonNullable<GenerationRequest['references']>[number]

export function characterBodyAuthorityLine(reference: Reference): string | undefined {
  if (reference.role !== 'character' || !reference.tag || reference.characterAuthorityMode !== 'complete-dressed-body') return undefined
  const label = reference.name?.trim() || reference.tag.replace(/^@/, '')
  return `Use ${reference.tag} as ${label}.`
}

export function appearanceLayerRoleLine(reference: Reference): string | undefined {
  if (!reference.tag || !reference.boundCharacterTag || !reference.appearanceScope) return undefined
  const scope = reference.appearanceScope === 'helmet-headwear' ? 'helmet or headwear'
    : reference.appearanceScope === 'glasses-accessory' ? 'glasses or accessory'
      : reference.appearanceScope === 'connected-element' ? 'assigned item' : 'wardrobe'
  return `Use ${reference.tag} for ${reference.boundCharacterTag}'s ${scope}.`
}

export function isTypedAppearanceLayer(reference: Reference): boolean {
  return Boolean(reference.appearanceScope || reference.appearanceSelection)
}

export function appearanceAppliesToShot(reference: Reference, panelId?: string): boolean {
  return !reference.appearanceShotIds?.length || !panelId || reference.appearanceShotIds.includes(panelId)
}

export function emittedAppearanceLayers(request: GenerationRequest, panelId?: string): Reference[] {
  const characters = new Map((request.references || []).filter((reference) => reference.role === 'character' && reference.tag).map((reference) => [reference.tag!, reference]))
  return (request.references || []).filter((reference) => {
    if (!isTypedAppearanceLayer(reference) || !reference.boundCharacterTag || !reference.appearanceScope) return false
    const character = characters.get(reference.boundCharacterTag)
    if (!character || character.characterAuthorityMode !== 'identity-body-with-layers') return false
    if (!['explicit-replacement', 'explicit-delta'].includes(reference.appearanceSelection || '')) return false
    return appearanceAppliesToShot(reference, panelId)
  })
}

export function providerVisibleReferences(request: GenerationRequest): Reference[] {
  const shots = request.storyboardShots || []
  const hasExecutableCharacter = (request.references || []).some((reference) => reference.role === 'character' && (reference.path || reference.url))
  const emitted = new Set(shots.length
    ? shots.flatMap((shot) => emittedAppearanceLayers(request, shot.panelId))
    : emittedAppearanceLayers(request))
  return (request.references || []).filter((reference) => {
    if (request.kind === 'image-generator' && request.semanticAssetCreation?.kind === 'character'
      && reference.boundCharacterTag === request.semanticAssetCreation.tag) return true
    if (hasExecutableCharacter && reference.role === 'wardrobe' && (reference.path || reference.url) && !isTypedAppearanceLayer(reference)) return false
    return !isTypedAppearanceLayer(reference) || emitted.has(reference)
  })
}

const PRECOMPOSED_DIAGNOSTIC = (tag: string) => `resolve ${tag} body authority: use/select a precomposed complete dressed-body Character authority and suppress separate Wardrobe, or explicitly assign same-body appearance owner and scope`

export function sameBodyAuthorityReadinessFailures(request: GenerationRequest): string[] {
  const references = request.references || []
  const characters = new Map(references.filter((reference) => reference.role === 'character' && reference.tag).map((reference) => [reference.tag!, reference]))
  const appearances = references.filter((reference) => reference.role === 'wardrobe' || isTypedAppearanceLayer(reference))
  if (!characters.size || !appearances.length) return []
  const failures: string[] = []
  for (const character of characters.values()) {
    const owned = appearances.filter((appearance) => appearance.boundCharacterTag === character.tag)
    if (owned.length && (!character.characterAuthorityMode || character.characterAuthorityMode === 'unresolved')) failures.push(PRECOMPOSED_DIAGNOSTIC(character.tag!))
  }
  for (const appearance of appearances) {
    const owner = appearance.boundCharacterTag
    if (!owner || !characters.has(owner)) {
      failures.push(`resolve ${appearance.tag || 'appearance layer'} owner: select one connected Character body`)
      continue
    }
    if (!appearance.appearanceScope || appearance.appearanceScope === 'connected-element' && appearance.appearanceElementTag !== appearance.tag) failures.push(`resolve ${appearance.tag || 'appearance layer'} scope: select Wardrobe, helmet/headwear, glasses/accessory, or its exact connected Element scope`)
    if (!appearance.appearanceSelection || appearance.appearanceSelection === 'unresolved') failures.push(PRECOMPOSED_DIAGNOSTIC(owner))
    const character = characters.get(owner)!
    if (character.characterAuthorityMode === 'complete-dressed-body' && ['explicit-replacement', 'explicit-delta'].includes(appearance.appearanceSelection || '')) failures.push(`suppress ${appearance.tag || 'appearance layer'} because ${owner} owns the complete dressed-body appearance`)
  }
  const groups = new Map<string, Reference[]>()
  for (const appearance of appearances.filter((candidate) => candidate.boundCharacterTag && candidate.appearanceScope)) {
    const key = `${appearance.boundCharacterTag}:${appearance.appearanceScope}:${appearance.appearanceElementTag || ''}`
    groups.set(key, [...(groups.get(key) || []), appearance])
  }
  const overlaps = (left: Reference, right: Reference) => {
    if (!left.appearanceShotIds?.length || !right.appearanceShotIds?.length) return true
    return left.appearanceShotIds.some((panelId) => right.appearanceShotIds!.includes(panelId))
  }
  for (const group of groups.values()) {
    const selected = group.filter((appearance) => ['explicit-replacement', 'explicit-delta'].includes(appearance.appearanceSelection || ''))
    const unresolved = group.filter((appearance) => !appearance.appearanceSelection || appearance.appearanceSelection === 'unresolved')
    const selectedConflict = selected.some((appearance, index) => selected.slice(index + 1).some((other) => overlaps(appearance, other)))
    const unresolvedConflict = unresolved.some((appearance) => group.some((other) => other !== appearance && overlaps(appearance, other)))
    if (selectedConflict || unresolvedConflict) failures.push(`select exactly one ${group[0].appearanceScope} appearance layer for ${group[0].boundCharacterTag}; conflicting same-scope layers cannot be chosen automatically`)
  }
  return [...new Set(failures)]
}

export function sameBodyAuthorityLines(request: GenerationRequest): string[] {
  const references = request.references || []
  const layers = emittedAppearanceLayers(request)
  return [...new Set(references.filter((reference) => reference.role === 'character' && reference.tag).flatMap((character) => {
    const complete = characterBodyAuthorityLine(character)
    if (complete) return [complete]
    if (character.characterAuthorityMode !== 'identity-body-with-layers') return []
    const label = character.name?.trim() || character.tag!.replace(/^@/, '')
    return [`Use ${character.tag} as ${label}.`, ...layers.filter((layer) => layer.boundCharacterTag === character.tag).map(appearanceLayerRoleLine).filter((line): line is string => Boolean(line))]
  }))]
}
