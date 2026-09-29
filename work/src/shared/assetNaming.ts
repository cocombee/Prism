import type { ImportedAsset, StudioNode } from './types'

const REUSABLE_CATEGORIES = new Set<ImportedAsset['category']>(['character', 'element', 'location', 'wardrobe', 'style'])
const GENERIC_REUSABLE_FOLDERS = new Set(['01-characters', '02-elements', '03-locations', '04-wardrobes', 'characters', 'elements', 'locations', 'wardrobes'])
const MEDIA_EXTENSION = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp|avi|m4v|mkv|mov|mp4|webm|aac|flac|m4a|mp3|ogg|opus|wav)$/i

/** A Rename field edits media identity, never its encoded container/codec. */
export function mediaRenameStem(value: string): string {
  return value.trim().replace(MEDIA_EXTENSION, '').trim()
}

/** Managed imports use one deterministic lowercase identity without altering encoded bytes. */
export function normalizeImportedMediaName(value: string): string {
  const leaf = value.replaceAll('\\', '/').split('/').at(-1) || 'asset'
  return leaf.normalize('NFC').toLocaleLowerCase('en-US')
}

export function normalizedOrdinaryMediaIdentity(asset: Pick<ImportedAsset, 'name' | 'path' | 'category'>): { name: string; managedBasename: string } | null {
  if (!['image', 'video', 'audio'].includes(asset.category || '')) return null
  return {
    name: normalizeImportedMediaName(asset.name),
    managedBasename: normalizeImportedMediaName(asset.path),
  }
}

export function normalizeLogicalAssetName(value: string): string {
  return value
    .replace(/^@+/, '')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '')
}

export function firstPanelAssetName(assets: Array<Pick<ImportedAsset, 'name'>>): string {
  return normalizeLogicalAssetName(mediaRenameStem(assets[0]?.name || ''))
}

export function assetDisplayName(asset: ImportedAsset): string {
  if (!REUSABLE_CATEGORIES.has(asset.category)) return asset.name
  const pathParts = asset.path.replace(/\\/g, '/').split('/').filter(Boolean)
  const parentFolder = normalizeLogicalAssetName(pathParts.at(-2) || '')
  const semanticRoot = normalizeLogicalAssetName(pathParts.at(-3) || '')
  const folderName = GENERIC_REUSABLE_FOLDERS.has(semanticRoot) && parentFolder && !GENERIC_REUSABLE_FOLDERS.has(parentFolder) ? parentFolder : ''
  return normalizeLogicalAssetName(asset.metadata?.assetName || folderName || asset.name) || 'asset'
}

export function isReusableAsset(asset: ImportedAsset): boolean {
  return REUSABLE_CATEGORIES.has(asset.category)
}

export function applyLogicalAssetRenameToNode(node: StudioNode, replacements: ReadonlyMap<string, ImportedAsset>, name: string): StudioNode {
  if (!node.data.referenceAssets?.some((asset) => replacements.has(asset.id))) return node
  const canonicalName = normalizeLogicalAssetName(name)
  return { ...node, data: { ...node.data, title: canonicalName, referenceTag: `@${canonicalName}`, referenceAssets: node.data.referenceAssets.map((asset) => replacements.get(asset.id) || asset) } }
}
