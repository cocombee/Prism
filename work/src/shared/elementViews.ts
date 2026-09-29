import type { ElementView, ImportedAsset } from './types'

export const ELEMENT_ANCHOR_VIEW: ElementView = 'three-quarter'

export const ELEMENT_VIEWS: ReadonlyArray<{ id: ElementView; label: string; framing: string }> = [
  { id: 'three-quarter', label: 'Three-Quarter', framing: 'three-quarter view showing front and one side' },
  { id: 'front', label: 'Front', framing: 'straight-on front view' },
  { id: 'side', label: 'Side', framing: 'true side profile view' },
  { id: 'back', label: 'Back', framing: 'straight-on back view' },
]

export function elementViewAssets(assets: ImportedAsset[]): ImportedAsset[] {
  const seenViews = new Set<ElementView>()
  const seenSources = new Set<string>()
  return assets.filter((asset) => {
    const view = asset.metadata?.elementView
    const source = asset.path || asset.id
    if (!view || seenViews.has(view) || seenSources.has(source)) return false
    seenViews.add(view)
    seenSources.add(source)
    return true
  })
}

export function assignElementView(assets: ImportedAsset[], asset: ImportedAsset, view: ElementView): ImportedAsset[] {
  const source = asset.path || asset.id
  const retained = assets.filter((candidate) => candidate.metadata?.elementView !== view && (candidate.path || candidate.id) !== source)
  return elementViewAssets([...retained, { ...asset, metadata: { ...asset.metadata, elementView: view } }])
}

export function missingElementViews(assets: ImportedAsset[]): typeof ELEMENT_VIEWS {
  const present = new Set(elementViewAssets(assets).map((asset) => asset.metadata!.elementView))
  return ELEMENT_VIEWS.filter((view) => !present.has(view.id))
}

export function elementCompletionPrompt(target: (typeof ELEMENT_VIEWS)[number], supplied: ElementView[], guidance = ''): string {
  return [
    'HARD REUSABLE ELEMENT IDENTITY RULE.',
    'Treat every supplied image as the same physical object. Preserve its exact silhouette, proportions, materials, construction, colors, markings, wear, and small identifying details.',
    `Generate exactly one missing angle: ${target.label} (${target.framing}).`,
    `Already supplied angles: ${supplied.length ? supplied.join(', ') : 'none'}. Do not recreate, replace, mirror, or reinterpret any supplied angle.`,
    'Show no additional angles, alternate designs, exploded parts, labels, hands, people, props, or environment. Use a clean neutral background, consistent scale, neutral lighting, and an unobstructed complete object.',
    guidance.trim() ? `User element guidance: ${guidance.trim()}` : '',
  ].filter(Boolean).join(' ')
}
