import type { ImportedAsset, StudioNodeData } from './types'

export type ReusableAssetKind = 'character' | 'wardrobe' | 'element' | 'location' | 'style-reference'

export function localAssetGenerationPrompt(data: Pick<StudioNodeData, 'assetGenerationPrompt' | 'prompt'>): string {
  return data.assetGenerationPrompt ?? data.prompt ?? ''
}

export function semanticAssetAuthorityText(data: Pick<StudioNodeData, 'kind' | 'stylePrompt' | 'stylePresetId' | 'referenceAssets'>): string {
  if (data.kind === 'style-reference') return (data.stylePrompt || '').trim()
  return (data.referenceAssets || [])
    .map((asset) => asset.metadata?.identityDescription?.trim())
    .find(Boolean) || ''
}

export function reusableAssetHydrationPatch(kind: ReusableAssetKind, assets: readonly ImportedAsset[]): Partial<StudioNodeData> {
  const metadata = assets.map((asset) => asset.metadata).find(Boolean)
  return {
    assetGenerationPrompt: metadata?.assetGenerationPrompt ?? metadata?.prompt,
    prompt: undefined,
    ...(kind === 'style-reference' ? { stylePrompt: metadata?.prompt } : {}),
  }
}