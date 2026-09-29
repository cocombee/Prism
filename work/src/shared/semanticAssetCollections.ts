import { assetDisplayName, normalizeLogicalAssetName } from './assetNaming'
import type { CharacterInputMode, ImportedAsset } from './types'

export type SemanticAssetCategory = 'character' | 'element' | 'location' | 'wardrobe'

export type SemanticAssetCollection = {
  key: string
  category: SemanticAssetCategory
  name: string
  origin: 'imported' | 'generated'
  assets: ImportedAsset[]
  previewAssets: ImportedAsset[]
}

const SEMANTIC_CATEGORIES = new Set<ImportedAsset['category']>(['character', 'element', 'location', 'wardrobe'])
const CHARACTER_VIEW_ORDER = ['front', 'three-quarter', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter', 'side-body', 'full-body-back']
const ELEMENT_VIEW_ORDER = ['three-quarter', 'front', 'side', 'back']

function semanticViewId(asset: ImportedAsset, category: SemanticAssetCategory): string {
  if (category === 'character') {
    const mode = asset.metadata?.characterInputMode === 'single' ? 'single' : 'multi'
    return asset.metadata?.characterView ? `${mode}:${asset.metadata.characterView}` : `asset:${asset.id}`
  }
  if (category === 'element') return asset.metadata?.elementView || `asset:${asset.id}`
  return `asset:${asset.id}`
}

/**
 * Rehydrates a Canvas semantic node from the current managed collection. The
 * registry copy wins for an assigned view so stale node IDs cannot hide the
 * remaining saved views or make a later metadata update fail.
 */
export function hydrateSemanticAssetViews(primary: readonly ImportedAsset[], managed: readonly ImportedAsset[], category: SemanticAssetCategory): ImportedAsset[] {
  const hydrated = new Map<string, ImportedAsset>()
  managed.forEach((asset) => hydrated.set(semanticViewId(asset, category), asset))
  primary.forEach((asset) => {
    const key = semanticViewId(asset, category)
    if (!hydrated.has(key)) hydrated.set(key, asset)
  })
  return [...hydrated.values()].sort((a, b) => viewRank(a) - viewRank(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export function semanticAssetCollectionKey(category: SemanticAssetCategory, name: string): string {
  return `${category}:${normalizeLogicalAssetName(name) || 'asset'}`
}

function viewRank(asset: ImportedAsset): number {
  if (asset.category === 'character') {
    const index = CHARACTER_VIEW_ORDER.indexOf(asset.metadata?.characterView || '')
    return index < 0 ? CHARACTER_VIEW_ORDER.length : index
  }
  if (asset.category === 'element') {
    const index = ELEMENT_VIEW_ORDER.indexOf(asset.metadata?.elementView || '')
    return index < 0 ? ELEMENT_VIEW_ORDER.length : index
  }
  return 0
}

export function balancedSemanticPreview(assets: readonly ImportedAsset[], category?: SemanticAssetCategory): ImportedAsset[] {
  const available = assets.filter((asset) => Boolean(asset.url || asset.path))
  const ordered = category
    ? [...available].sort((a, b) => viewRank(a) - viewRank(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    : available
  const seen = new Set<string>()
  const distinct = ordered.filter((asset) => {
    const assignedView = category === 'character'
      ? asset.metadata?.characterView
      : category === 'element'
        ? asset.metadata?.elementView
        : undefined
    const key = assignedView ? `view:${assignedView}` : `asset:${asset.path || asset.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const visibleCount = distinct.length === 1 ? 1 : Math.min(8, distinct.length - (distinct.length % 2))
  return distinct.slice(0, visibleCount)
}

export function characterAssetsForMode(assets: readonly ImportedAsset[], mode: CharacterInputMode): ImportedAsset[] {
  if (mode === 'single') {
    return assets.filter((asset) => asset.metadata?.characterInputMode === 'single' && asset.metadata?.characterView === 'front').slice(0, 1)
  }
  return assets.filter((asset) => asset.metadata?.characterInputMode !== 'single')
}

export function characterSemanticPreview(assets: readonly ImportedAsset[], _mode?: CharacterInputMode): ImportedAsset[] {
  return balancedSemanticPreview(assets, 'character')
}

export function groupSemanticAssets(assets: readonly ImportedAsset[]): SemanticAssetCollection[] {
  const grouped = new Map<string, { category: SemanticAssetCategory; name: string; assets: ImportedAsset[] }>()
  const singletonNames = new Map<string, string>()
  for (const singletonCategory of ['location', 'wardrobe'] as const) {
    const usedNames = new Set<string>()
    assets.filter((asset) => asset.category === singletonCategory)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .forEach((asset) => {
        const baseName = assetDisplayName(asset)
        let name = baseName
        let suffix = 1
        while (usedNames.has(name.toLocaleLowerCase())) name = `${baseName}-${String(suffix++).padStart(2, '0')}`
        usedNames.add(name.toLocaleLowerCase())
        singletonNames.set(asset.id, name)
      })
  }
  assets.forEach((asset) => {
    if (!SEMANTIC_CATEGORIES.has(asset.category)) return
    const category = asset.category as SemanticAssetCategory
    const name = category === 'location' || category === 'wardrobe' ? singletonNames.get(asset.id) || assetDisplayName(asset) : assetDisplayName(asset)
    const key = semanticAssetCollectionKey(category, name)
    const current = grouped.get(key)
    if (current) current.assets.push(asset)
    else grouped.set(key, { category, name, assets: [asset] })
  })

  return [...grouped.entries()].map(([key, collection]) => {
    const sorted = [...collection.assets].sort((a, b) => viewRank(a) - viewRank(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    const previewAssets = collection.category === 'character'
      ? characterSemanticPreview(sorted)
      : balancedSemanticPreview(sorted, collection.category)
    const origin = sorted.some((asset) => asset.origin === 'generated') ? 'generated' : 'imported'
    return { key, category: collection.category, name: collection.name, origin, assets: sorted, previewAssets }
  })
}

export function filterAssetsByFinalOrigin(assets: readonly ImportedAsset[], origin: 'all' | 'imported' | 'generated'): ImportedAsset[] {
  if (origin === 'all') return [...assets]
  const semanticOrigins = new Map(groupSemanticAssets(assets).flatMap((collection) => collection.assets.map((asset) => [asset.id, collection.origin] as const)))
  return assets.filter((asset) => {
    if (!SEMANTIC_CATEGORIES.has(asset.category)) return asset.origin === origin
    return semanticOrigins.get(asset.id) === origin
  })
}

/**
 * Promoting a generated image into a reusable semantic collection intentionally
 * creates a second asset record. Keep the source record for history/recovery,
 * but do not present it as another user-facing asset beside the collection.
 */
export function withoutPromotedSourceDuplicates(assets: readonly ImportedAsset[]): ImportedAsset[] {
  const promotedGeneratedNames = new Set(assets
    .filter((asset) => SEMANTIC_CATEGORIES.has(asset.category) && asset.origin === 'generated' && asset.mimeType.startsWith('image/'))
    .map((asset) => asset.name))
  return assets.filter((asset) => !(asset.category === 'image' && asset.origin === 'generated' && promotedGeneratedNames.has(asset.name)))
}
