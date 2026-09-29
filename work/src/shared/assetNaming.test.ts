import { describe, expect, it } from 'vitest'
import { applyLogicalAssetRenameToNode, assetDisplayName, firstPanelAssetName, mediaRenameStem, normalizeLogicalAssetName } from './assetNaming'
import type { ImportedAsset, StudioNode } from './types'

function asset(name: string, category: ImportedAsset['category'], assetName?: string): ImportedAsset {
  return { id: name, name, path: `/project/${name}`, mimeType: 'image/jpeg', category, createdAt: '2026-08-02T00:00:00.000Z', metadata: assetName ? { assetName } : undefined }
}

describe('logical asset naming', () => {
  it('never exposes media extensions for categorized reusable assets', () => {
    expect(assetDisplayName(asset('Yusuf.jpg', 'character', 'Yusuf Anaqi'))).toBe('yusuf-anaqi')
    expect(assetDisplayName(asset('Element Front.webp', 'element'))).toBe('element-front')
    expect(assetDisplayName(asset('Village.png', 'location'))).toBe('village')
  })

  it('keeps real filenames for ordinary media', () => {
    expect(assetDisplayName(asset('Frame 01.jpg', 'image'))).toBe('Frame 01.jpg')
    expect(assetDisplayName(asset('Take 03.mov', 'video'))).toBe('Take 03.mov')
    expect(assetDisplayName(asset('Voice.wav', 'audio'))).toBe('Voice.wav')
  })

  it('hides only real media extensions in rename fields', () => {
    expect(mediaRenameStem('Frame 01.jpeg')).toBe('Frame 01')
    expect(mediaRenameStem('Take 03.MOV')).toBe('Take 03')
    expect(mediaRenameStem('Voice final.wav')).toBe('Voice final')
    expect(mediaRenameStem('Campaign v1.2')).toBe('Campaign v1.2')
    expect(mediaRenameStem('archive.tar.gz')).toBe('archive.tar.gz')
  })

  it('uses the managed reusable parent folder for legacy timestamp members', () => {
    const legacy = asset('1786797654271-img-4438.png', 'character')
    legacy.path = '/project/01. Characters/haji-asri/1786797654271-img-4438.png'
    expect(assetDisplayName(legacy)).toBe('haji-asri')
  })

  it('normalizes every reusable name to the lowercase dashed node format', () => {
    expect(normalizeLogicalAssetName('@Yusuf Anaqi.jpg')).toBe('yusuf-anaqi')
    expect(normalizeLogicalAssetName('  Hero__Vehicle / Red  ')).toBe('hero-vehicle-red')
  })

  it('uses the first panel filename when Multi or Sheets saves directly', () => {
    expect(firstPanelAssetName([asset('ACTOR-A.PNG', 'character'), asset('profile.png', 'character')])).toBe('actor-a')
    expect(firstPanelAssetName([asset('Three Quarter.webp', 'element')])).toBe('three-quarter')
    expect(firstPanelAssetName([])).toBe('')
  })

  it('renames the logical multi-view asset and every member reference together', () => {
    const face = asset('Yusuf-face.png', 'character', 'Yusuf')
    const profile = { ...asset('Yusuf-profile.webp', 'character', 'Yusuf'), mimeType: 'image/webp' }
    const renamedFace = { ...face, metadata: { ...face.metadata, assetName: 'yusuf-anaqi' } }
    const renamedProfile = { ...profile, metadata: { ...profile.metadata, assetName: 'yusuf-anaqi' } }
    const node = { id: 'character', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'character', title: 'Yusuf', referenceTag: '@yusuf', referenceAssets: [face, profile] } } as StudioNode
    const renamed = applyLogicalAssetRenameToNode(node, new Map([[face.id, renamedFace], [profile.id, renamedProfile]]), 'Yusuf Anaqi')
    expect(renamed.data.title).toBe('yusuf-anaqi')
    expect(renamed.data.referenceTag).toBe('@yusuf-anaqi')
    expect(renamed.data.referenceAssets?.map((item) => item.metadata?.assetName)).toEqual(['yusuf-anaqi', 'yusuf-anaqi'])
    expect(renamed.data.referenceAssets?.map((item) => item.name)).toEqual(['Yusuf-face.png', 'Yusuf-profile.webp'])
  })
})
