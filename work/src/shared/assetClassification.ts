import type { ImportedAsset, NodeKind } from './types'

export type SemanticAssetKind = 'character' | 'element' | 'location' | 'wardrobe' | 'style-reference'

export function semanticKindForCategory(category: ImportedAsset['category']): SemanticAssetKind | undefined {
  if (category === 'character' || category === 'element' || category === 'location' || category === 'wardrobe') return category
  if (category === 'style') return 'style-reference'
  return undefined
}

export function shouldRerouteSemanticAsset(category: ImportedAsset['category'], targetKind: NodeKind | undefined): boolean {
  const canonicalKind = semanticKindForCategory(category)
  return Boolean(canonicalKind && targetKind && ['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(targetKind) && canonicalKind !== targetKind)
}

const ASSET_LIBRARY_CATEGORIES = new Set<NonNullable<ImportedAsset['category']>>([
  'character', 'element', 'location', 'wardrobe', 'style', 'storyboard', 'image', 'video', 'audio',
])

export function importedAssetDestination(categories: ImportedAsset['category'][]): NonNullable<ImportedAsset['category']> | 'all' {
  const destinations = Array.from(new Set(categories.filter((category): category is NonNullable<ImportedAsset['category']> => Boolean(category && ASSET_LIBRARY_CATEGORIES.has(category)))))
  return destinations.length === 1 ? destinations[0] : 'all'
}
