import { describe, expect, it } from 'vitest'
import { balancedSemanticPreview, characterAssetsForMode, characterSemanticPreview, filterAssetsByFinalOrigin, groupSemanticAssets, hydrateSemanticAssetViews, withoutPromotedSourceDuplicates } from './semanticAssetCollections'
import type { CharacterView, ImportedAsset } from './types'

function asset(id: string, patch: Partial<ImportedAsset> = {}): ImportedAsset {
  return {
    id,
    name: `${id}.png`,
    path: `/project/${id}.png`,
    mimeType: 'image/png',
    createdAt: `2026-08-11T00:00:0${id.length % 9}.000Z`,
    ...patch,
  }
}

describe('semantic asset collections', () => {
  it('keeps one logical Character across folders and orders all nine views', () => {
    const views = ['smile', 'front', 'back', 'profile', 'full-body', 'three-quarter', 'side-body', 'full-body-back', 'left-three-quarter'] as const
    const input = views.map((view, index) => asset(String(index), {
      category: 'character',
      path: index === 1 ? `/project/Custom Character/${view}.png` : `/project/yusuf-anaqi/${view}.png`,
      metadata: { assetName: 'yusuf-anaqi', characterView: view },
    }))

    const collections = groupSemanticAssets(input)

    expect(collections).toHaveLength(1)
    expect(collections[0].name).toBe('yusuf-anaqi')
    expect(collections[0].assets.map((item) => item.metadata?.characterView)).toEqual(['front', 'three-quarter', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter', 'side-body', 'full-body-back'])
    expect(collections[0].previewAssets).toHaveLength(8)
    expect(collections[0].previewAssets.map((item) => item.metadata?.characterView)).toEqual(['front', 'three-quarter', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter', 'side-body'])
    expect(input.map((item) => item.metadata?.characterView)).toEqual(views)
  })

  it('keeps same-named Locations as separately numbered single-image Library assets', () => {
    const collections = groupSemanticAssets([
      asset('office-a', { category: 'location', createdAt: '2026-08-11T00:00:00.000Z', metadata: { assetName: 'office' } }),
      asset('office-b', { category: 'location', createdAt: '2026-08-11T00:00:01.000Z', metadata: { assetName: 'office' } }),
      asset('office-c', { category: 'location', createdAt: '2026-08-11T00:00:02.000Z', metadata: { assetName: 'office' } }),
    ])

    expect(collections.map((collection) => collection.name)).toEqual(['office', 'office-01', 'office-02'])
    expect(collections.every((collection) => collection.assets.length === 1 && collection.previewAssets.length === 1)).toBe(true)
  })

  it('compacts around a missing Character view and never reserves an empty preview panel', () => {
    const available = ['front', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter'] as const
    const preview = balancedSemanticPreview(available.map((view) => asset(view, {
      category: 'character',
      url: 'file:///' + view + '.png',
      metadata: { assetName: 'hero', characterView: view },
    })), 'character')

    expect(preview).toHaveLength(6)
    expect(preview.map((item) => item.metadata?.characterView)).toEqual(available)
    expect(preview.some((item) => item.metadata?.characterView === 'three-quarter')).toBe(false)
  })

  it('deduplicates assigned angles before applying the original fluid preview counts', () => {
    const views = ['front', 'three-quarter', 'three-quarter', 'profile', 'full-body', 'back', 'smile'] as const
    const images = views.map((view, index) => asset(view + '-' + index, {
      category: 'character',
      url: 'file:///' + view + '-' + index + '.png',
      metadata: { assetName: 'hero', characterView: view },
    }))

    expect(balancedSemanticPreview(images, 'character').map((item) => item.metadata?.characterView)).toEqual([
      'front', 'three-quarter', 'profile', 'full-body', 'back', 'smile',
    ])
    expect(balancedSemanticPreview(images.slice(0, 4), 'character')).toHaveLength(2)
  })

  it('uses the same balanced global preview format for Single and Multi', () => {
    const images = ['front', 'three-quarter', 'profile', 'full-body'].map((view) => asset(view, {
      category: 'character',
      url: `file:///${view}.png`,
      metadata: { assetName: 'hero', characterView: view as CharacterView },
    }))

    expect(characterSemanticPreview(images, 'single').map((item) => item.metadata?.characterView)).toEqual(['front', 'three-quarter', 'profile', 'full-body'])
    expect(characterSemanticPreview(images, 'multi').map((item) => item.metadata?.characterView)).toEqual(['front', 'three-quarter', 'profile', 'full-body'])
    expect(characterSemanticPreview(images).map((item) => item.metadata?.characterView)).toEqual(['front', 'three-quarter', 'profile', 'full-body'])
  })

  it('isolates Single sheets from Multi panels while preserving both until Save chooses one mode', () => {
    const singleSheet = asset('single-sheet', { category: 'character', metadata: { assetName: 'hero', characterView: 'front', characterInputMode: 'single' } })
    const multiFace = asset('multi-face', { category: 'character', metadata: { assetName: 'hero', characterView: 'front', characterInputMode: 'multi' } })
    const legacyProfile = asset('legacy-profile', { category: 'character', metadata: { assetName: 'hero', characterView: 'profile' } })

    const hydrated = hydrateSemanticAssetViews([], [singleSheet, multiFace, legacyProfile], 'character')

    expect(hydrated.map((asset) => asset.id).sort()).toEqual(['legacy-profile', 'multi-face', 'single-sheet'])
    expect(characterAssetsForMode(hydrated, 'single').map((item) => item.id)).toEqual(['single-sheet'])
    expect(characterAssetsForMode(hydrated, 'multi').map((item) => item.id)).toEqual(['multi-face', 'legacy-profile'])
  })

  it('groups legacy Character fragments by their managed parent folder when assetName is missing', () => {
    const collections = groupSemanticAssets([
      asset('face', { name: '1786797654271-img-4438.png', path: '/project/01. Characters/haji-asri/1786797654271-img-4438.png', category: 'character', metadata: { characterView: 'front' } }),
      asset('profile', { name: '1786797655466-img-4439.png', path: '/project/01. Characters/haji-asri/1786797655466-img-4439.png', category: 'character', metadata: { characterView: 'profile' } }),
    ])
    expect(collections).toHaveLength(1)
    expect(collections[0].name).toBe('haji-asri')
    expect(collections[0].assets).toHaveLength(2)
    expect(collections[0].previewAssets.map((item) => item.metadata?.characterView)).toEqual(['front', 'profile'])
  })

  it('rehydrates an edited Character from all managed views and replaces stale view records', () => {
    const staleFace = asset('stale-face', { category: 'character', metadata: { assetName: 'haji-asri', characterView: 'front' } })
    const managedFace = asset('managed-face', { category: 'character', metadata: { assetName: 'haji-asri', characterView: 'front' } })
    const managedProfile = asset('managed-profile', { category: 'character', metadata: { assetName: 'haji-asri', characterView: 'profile' } })

    const hydrated = hydrateSemanticAssetViews([staleFace], [managedProfile, managedFace], 'character')

    expect(hydrated.map((item) => item.id)).toEqual(['managed-face', 'managed-profile'])
  })

  it('does not merge different logical names or semantic categories', () => {
    const collections = groupSemanticAssets([
      asset('character', { category: 'character', metadata: { assetName: 'hero' } }),
      asset('element', { category: 'element', metadata: { assetName: 'hero' } }),
      asset('other', { category: 'character', metadata: { assetName: 'villain' } }),
    ])
    expect(collections.map((item) => item.key).sort()).toEqual(['character:hero', 'character:villain', 'element:hero'])
  })

  it('hides only generated source images already promoted into a semantic collection', () => {
    const promoted = asset('semantic', { name: 'generated-123.png', category: 'character', origin: 'generated', metadata: { assetName: 'yusuf-anaqi', characterView: 'smile' } })
    const sourceDuplicate = asset('source', { name: 'generated-123.png', category: 'image', origin: 'generated' })
    const unrelated = asset('unrelated', { name: 'generated-456.png', category: 'image', origin: 'generated' })
    const importedSameName = asset('imported', { name: 'generated-123.png', category: 'image', origin: 'imported' })

    expect(withoutPromotedSourceDuplicates([promoted, sourceDuplicate, unrelated, importedSameName]).map((item) => item.id)).toEqual(['semantic', 'unrelated', 'imported'])
  })

  it('keeps the same persisted thumbnail identity and source after a reload projection', () => {
    const stored = asset('food-reference', {
      url: 'prism-asset:///project/food-reference.png',
      category: 'element',
      metadata: { assetName: 'images', elementView: 'three-quarter' },
    })
    const first = groupSemanticAssets([stored])[0].previewAssets[0]
    const reloaded = groupSemanticAssets(JSON.parse(JSON.stringify([stored])) as ImportedAsset[])[0].previewAssets[0]
    expect({ id: reloaded.id, url: reloaded.url }).toEqual({ id: first.id, url: first.url })
    expect(balancedSemanticPreview([reloaded], 'element')[0]).toMatchObject({ id: first.id, url: first.url })
  })

  it('finalizes a mixed imported and generated reusable set as one Generated asset', () => {
    const importedFace = asset('face', { category: 'character', origin: 'imported', metadata: { assetName: 'yusuf-anaqi', characterView: 'front' } })
    const generatedViews = (['three-quarter', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter', 'side-body', 'full-body-back'] as const).map((view) => asset(view, { category: 'character', origin: 'generated', metadata: { assetName: 'yusuf-anaqi', characterView: view } }))
    const unrelatedImported = asset('plate', { category: 'image', origin: 'imported' })
    const all = [importedFace, ...generatedViews, unrelatedImported]

    const collection = groupSemanticAssets(all)[0]
    expect(collection.origin).toBe('generated')
    expect(collection.assets).toHaveLength(9)
    expect(filterAssetsByFinalOrigin(all, 'generated').map((item) => item.id)).toEqual(['face', 'three-quarter', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter', 'side-body', 'full-body-back'])
    expect(filterAssetsByFinalOrigin(all, 'imported').map((item) => item.id)).toEqual(['plate'])
  })
})
