import type { GenerationRequest, VisualAuthorityMode } from './types'

export type VisualReference = NonNullable<GenerationRequest['references']>[number]

const EXACT_VISUAL_ROLES = new Set<VisualReference['role']>(['character', 'wardrobe', 'element', 'location'])

export function visualAuthorityMode(reference: VisualReference): VisualAuthorityMode {
  if (reference.visualAuthorityMode) return reference.visualAuthorityMode
  return EXACT_VISUAL_ROLES.has(reference.role) && Boolean(reference.path || reference.url)
    ? 'reference-exclusive'
    : 'text-described'
}

export function isReferenceExclusive(reference: VisualReference): boolean {
  return visualAuthorityMode(reference) !== 'text-described'
}

export function authoredAppearanceDeltaLine(reference: VisualReference): string | undefined {
  if (visualAuthorityMode(reference) !== 'reference-plus-authored-delta') return undefined
  const property = reference.authoredAppearanceDelta?.property
  const value = reference.authoredAppearanceDelta?.value
  if (!property?.trim() || !value?.trim() || !reference.tag) return undefined
  return `Authored appearance delta · ${reference.tag} · ${property}=${value}`
}

export function soleVisualAuthorityLine(reference: VisualReference): string | undefined {
  if (!reference.tag || !isReferenceExclusive(reference)) return undefined
  const ownership = reference.boundCharacterTag
    ? reference.role === 'wardrobe'
      ? ` worn by ${reference.boundCharacterTag}`
      : reference.role === 'element'
        ? ` used by ${reference.boundCharacterTag}`
        : ''
    : ''
  return `${reference.tag} is the sole visual authority for ${reference.role}${ownership}; colour, material, construction, pattern, shape, fit, markings, and accessory design come only from the connected reference.`
}
