import type { CharacterInputMode, CharacterView, ImportedAsset } from './types'

export interface CharacterCollectionCommitPlan {
  mode: CharacterInputMode
  active: Array<{ id: string; metadata: ImportedAsset['metadata'] }>
  sheet?: { path: string; url: string; views: CharacterView[] }
  retiredAt: string
}

export type CharacterCollectionSaveIntent =
  | { mode: 'create-new' }
  | { mode: 'replace-existing'; targetAssetId: string; token: string }

export function collisionSafeCollectionName(name: string, occupied: Set<string>): string {
  if (!occupied.has(name)) return name
  let suffix = 2
  while (occupied.has(`${name}-${suffix}`)) suffix += 1
  return `${name}-${suffix}`
}

export function characterCollectionMembersForIntent(
  assets: ImportedAsset[],
  activeIds: Set<string>,
  name: string,
  previousName: string,
  intent: CharacterCollectionSaveIntent,
): ImportedAsset[] {
  if (intent.mode === 'create-new') return assets.filter((asset) => activeIds.has(asset.id))
  const target = assets.find((asset) => asset.id === intent.targetAssetId)
  if (!target || !activeIds.has(target.id) || !intent.token) throw new Error('Character library: explicit Edit replacement authority is invalid.')
  const targetFolder = target.path.replace(/[/\\][^/\\]+$/, '')
  return assets.filter((asset) => activeIds.has(asset.id) || asset.path.replace(/[/\\][^/\\]+$/, '') === targetFolder)
}

function metadataForMode(
  metadata: ImportedAsset['metadata'],
  mode: CharacterInputMode,
  sheet?: CharacterCollectionCommitPlan['sheet'],
): ImportedAsset['metadata'] {
  const {
    characterSheetPath: _characterSheetPath,
    characterSheetUrl: _characterSheetUrl,
    characterSheetViews: _characterSheetViews,
    ...withoutDerivative
  } = metadata || {}
  return mode === 'multi' && sheet
    ? {
        ...withoutDerivative,
        characterSheetPath: sheet.path,
        characterSheetUrl: sheet.url,
        characterSheetViews: sheet.views,
      }
    : withoutDerivative
}

export function planCharacterCollectionCommit(
  collectionAssets: ImportedAsset[],
  request: CharacterCollectionCommitPlan,
): ImportedAsset[] {
  const active = new Map(request.active.map((item) => [item.id, item.metadata]))
  return collectionAssets.map((asset) => {
    const metadata = active.get(asset.id)
    if (!metadata) return { ...asset, trashedAt: request.retiredAt }
    return {
      ...asset,
      metadata: metadataForMode(metadata, request.mode, request.sheet),
      trashedAt: undefined,
    }
  })
}
