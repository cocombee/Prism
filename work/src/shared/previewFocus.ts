import type { ImportedAsset } from './types'

function boundedPercent(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value as number)) : fallback
}

/** One crop contract for compact cards, selectors, and expanded previews. */
export function previewFocalPosition(asset: ImportedAsset, prioritizeBeing = false): string {
  const x = boundedPercent(asset.metadata?.previewFocusX, 50)
  const y = boundedPercent(asset.metadata?.previewFocusY, prioritizeBeing ? 24 : 50)
  return `${x}% ${y}%`
}
