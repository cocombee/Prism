import { describe, expect, it } from 'vitest'
import type { StudioNodeData } from './types'
import { localAssetGenerationPrompt, reusableAssetHydrationPatch, semanticAssetAuthorityText } from './semanticAssetPromptBoundary'

const sentinel = 'ASSET_GENERATION_ONLY_SENTINEL'
const asset = (patch: Record<string, unknown> = {}) => ({
  id: 'asset', name: 'asset.png', path: '/managed/asset.png', url: 'asset://asset', mimeType: 'image/png', createdAt: 'fixture',
  metadata: { assetName: 'Approved Asset', assetGenerationPrompt: sentinel, prompt: sentinel, ...patch },
})

function data(kind: StudioNodeData['kind'], patch: Partial<StudioNodeData> = {}): StudioNodeData {
  return { kind, title: 'Approved Asset', assetGenerationPrompt: sentinel, prompt: sentinel, referenceAssets: [asset()], ...patch }
}

describe('reusable asset generation prompt ownership', () => {
  it('keeps the local generation instruction available for all reusable kinds', () => {
    for (const kind of ['character', 'wardrobe', 'element', 'location', 'style-reference'] as const) {
      expect(localAssetGenerationPrompt(data(kind)), kind).toBe(sentinel)
    }
  })

  it('never treats local or legacy generation text as downstream semantic authority', () => {
    for (const kind of ['character', 'wardrobe', 'element', 'location'] as const) {
      expect(semanticAssetAuthorityText(data(kind)), kind).toBe('')
      expect(semanticAssetAuthorityText(data(kind, { referenceAssets: [asset({ identityDescription: `Approved ${kind}` })] })), kind).toBe(`Approved ${kind}`)
    }
    expect(semanticAssetAuthorityText(data('style-reference', { stylePrompt: 'Approved style', styleDescription: 'Approved description' }))).toBe('Approved style')
  })

  it('hydrates generation history into the local field without restoring downstream prompt authority', () => {
    for (const kind of ['character', 'wardrobe', 'element', 'location', 'style-reference'] as const) {
      const patch = reusableAssetHydrationPatch(kind, [asset()])
      expect(patch.assetGenerationPrompt, kind).toBe(sentinel)
      expect(patch.prompt, kind).toBeUndefined()
      expect(JSON.stringify(patch), kind).not.toContain('"prompt":"ASSET_GENERATION_ONLY_SENTINEL"')
    }
  })
})
