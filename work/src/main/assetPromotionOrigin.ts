import { resolve } from 'node:path'
import type { ImportedAsset } from '../shared/types'

/** Provenance comes from the main-owned index, never the renderer's claimed kind. */
export function assetPromotionOrigin(source: string, indexed: ImportedAsset[]): ImportedAsset['origin'] {
  return indexed.find(asset => resolve(asset.path) === resolve(source))?.origin || 'generated'
}
