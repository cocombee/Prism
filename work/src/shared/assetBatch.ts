export type AssetBatchKind = 'character' | 'element' | 'location' | 'wardrobe'

export interface AssetBatchInspection {
  id: string
  path: string
  fileName: string
  mimeType: string
  previewDataUrl: string
  perceptualFingerprint: string
  contentFingerprint: string
  viewCount: number
  referenceDescription?: string
}

export interface AcceptedAssetBatch {
  rows: AssetBatchInspection[]
  canInsert: boolean
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff'])

export function acceptedAssetBatch(kind: AssetBatchKind, candidates: AssetBatchInspection[]): AcceptedAssetBatch {
  const rows: AssetBatchInspection[] = []
  for (const candidate of candidates) {
    if (!SUPPORTED_IMAGE_TYPES.has(candidate.mimeType)) continue
    if (kind === 'character' && candidate.viewCount < 2) continue
    if (kind !== 'character' && candidate.viewCount < 1) continue
    if (rows.some((row) => row.contentFingerprint === candidate.contentFingerprint)) continue
    rows.push(candidate)
  }
  return { rows, canInsert: rows.length >= 2 }
}

export function assetBatchDisplayName(fileName: string): string {
  const normalized = fileName.trim()
  if (!normalized || /^\.[^.]+$/.test(normalized)) return ''
  return normalized.replace(/\.[^.]+$/, '').trim()
}

export function removeSavedBatchRow<T extends { id: string }>(rows: T[], id: string): T[] {
  return rows.filter((row) => row.id !== id)
}
