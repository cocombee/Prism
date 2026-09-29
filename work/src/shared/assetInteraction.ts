import type { ImportedAsset, NodeKind } from './types'

export type AssetMediaFamily = 'image' | 'video' | 'audio'

export const canvasMediaDragMime = (family: AssetMediaFamily) => `application/x-prism-media-${family}`

export interface AssetSelectionModifiers {
  shift?: boolean
  meta?: boolean
}

export function applyOrderedAssetSelection(
  order: string[],
  selected: string[],
  anchor: string | null,
  key: string,
  modifiers: AssetSelectionModifiers,
): { selected: string[]; anchor: string | null } {
  if (!order.includes(key)) return { selected, anchor }
  if (modifiers.shift && anchor && order.includes(anchor)) {
    const start = order.indexOf(anchor)
    const end = order.indexOf(key)
    const range = order.slice(Math.min(start, end), Math.max(start, end) + 1)
    return { selected: range, anchor }
  }
  if (modifiers.meta) {
    const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]
    return { selected: order.filter((item) => next.includes(item)), anchor: next.includes(anchor || '') ? anchor : next[0] || null }
  }
  return { selected: [key], anchor: key }
}

export function managedAssetDeletionSelection<T extends { id: string }>(
  selectedKeys: string[],
  groups: Array<{ key: string; assets: T[] }>,
): { selectionCount: number; assets: T[] } {
  const selected = new Set(selectedKeys)
  const selectedGroups = groups.filter((group) => selected.has(group.key))
  const assets = new Map<string, T>()
  selectedGroups.forEach((group) => group.assets.forEach((asset) => assets.set(asset.id, asset)))
  return { selectionCount: selectedGroups.length, assets: Array.from(assets.values()) }
}

export function shouldRequestSelectedAssetDelete(input: {
  key: string
  selectedCount: number
  assetsSurfaceVisible: boolean
  textEntryActive: boolean
  confirmationOpen: boolean
}): boolean {
  return (input.key === 'Delete' || input.key === 'Backspace')
    && input.selectedCount > 0
    && input.assetsSurfaceVisible
    && !input.textEntryActive
    && !input.confirmationOpen
}

export function librarySelectAllKeys(
  input: { key: string; meta: boolean; libraryActive: boolean; textEntryActive: boolean },
  visibleKeys: string[],
): string[] | null {
  return input.meta && input.key.toLocaleLowerCase('en-US') === 'a' && input.libraryActive && !input.textEntryActive
    ? [...visibleKeys]
    : null
}

export function selectionDismissalIntent(input: {
  insideLibrary: boolean
  insideCanvas: boolean
  canvasControl: boolean
}): { clearLibrary: boolean; clearCanvas: boolean } {
  return {
    clearLibrary: !input.insideLibrary,
    clearCanvas: input.insideLibrary || (!input.insideCanvas && !input.canvasControl),
  }
}

export function mediaFamily(mimeType: string): AssetMediaFamily | null {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return null
}

const IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'heic', 'heif', 'jpeg', 'jpg', 'png', 'tif', 'tiff', 'webp'])
const VIDEO_EXTENSIONS = new Set(['avi', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'webm'])
const AUDIO_EXTENSIONS = new Set(['aac', 'aiff', 'flac', 'm4a', 'mp3', 'ogg', 'wav'])
const SPECIAL_ASSET_CATEGORIES = new Set<ImportedAsset['category']>(['character', 'element', 'location', 'wardrobe', 'style', 'storyboard'])

export function mediaFamilyForFile(mimeType: string, name: string): AssetMediaFamily | null {
  const family = mediaFamily(mimeType)
  if (family) return family
  const extension = name.split('.').pop()?.toLowerCase() || ''
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio'
  return null
}

export function isPlaceholderMediaDropAllowed(
  expected: AssetMediaFamily,
  asset: Pick<ImportedAsset, 'mimeType' | 'name' | 'category'>,
): boolean {
  return !SPECIAL_ASSET_CATEGORIES.has(asset.category)
    && mediaFamilyForFile(asset.mimeType, asset.name) === expected
}

export function isExactRelinkCandidate(
  expectedName: string,
  expectedMimeType: string,
  candidateName: string,
  candidateMimeType: string,
): boolean {
  return expectedName.normalize('NFC').toLocaleLowerCase('en-US') === candidateName.normalize('NFC').toLocaleLowerCase('en-US')
    && mediaFamily(expectedMimeType) !== null
    && mediaFamily(expectedMimeType) === mediaFamily(candidateMimeType)
}

export function shouldUseIntrinsicAssetRatio(kind: NodeKind, mode?: 'multi' | 'single'): boolean {
  return !((kind === 'character' || kind === 'element') && mode === 'multi')
}
