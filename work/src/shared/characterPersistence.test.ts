import { describe, expect, it } from 'vitest'
import type { ImportedAsset } from './types'
import { characterCollectionMembersForIntent, collisionSafeCollectionName, planCharacterCollectionCommit } from './characterPersistence'

const asset = (id: string, view: NonNullable<ImportedAsset['metadata']>['characterView'], extra: ImportedAsset['metadata'] = {}): ImportedAsset => ({
  id,
  name: `${id}.png`,
  path: `/project/${id}.png`,
  mimeType: 'image/png',
  category: 'character',
  createdAt: '2026-08-21T00:00:00.000Z',
  metadata: { assetName: 'nadia', characterView: view, ...extra },
})

describe('Character collection persistence planning', () => {
  it('allocates a collision-safe physical collection name without changing title intent', () => {
    expect(collisionSafeCollectionName('character-c', new Set())).toBe('character-c')
    expect(collisionSafeCollectionName('character-c', new Set(['character-c']))).toBe('character-c-2')
    expect(collisionSafeCollectionName('character-c', new Set(['character-c', 'character-c-2']))).toBe('character-c-3')
  })

  it('never enrolls a same-name source collection in Create and scopes replacement to the explicit Edit target', () => {
    const existing = [
      { ...asset('source-face', 'front', { assetName: 'Character C' }), path: '/managed/character-c/face.png' },
      { ...asset('source-profile', 'profile', { assetName: 'Character C' }), path: '/managed/character-c/profile.png' },
      { ...asset('new-face', 'front', { assetName: 'Character C' }), path: '/managed/character-c-2/face.png' },
    ]
    expect(characterCollectionMembersForIntent(existing, new Set(['new-face']), 'Character C', '', { mode: 'create-new' }).map((item) => item.id)).toEqual(['new-face'])
    expect(characterCollectionMembersForIntent(existing, new Set(['source-face']), 'Character C', 'Character C', { mode: 'replace-existing', targetAssetId: 'source-face', token: 'edit-token' }).map((item) => item.id)).toEqual(['source-face', 'source-profile'])
  })

  it('clears stale sheet pointers in Single and retires removed or replaced managed views', () => {
    const existing = [
      asset('face-new', 'front', { characterSheetPath: '/old-sheet.jpg', characterSheetUrl: 'prism-asset://old-sheet.jpg', characterSheetViews: ['front', 'profile'] }),
      asset('profile-kept', 'profile', { characterSheetPath: '/old-sheet.jpg' }),
      asset('face-old', 'front', { characterSheetPath: '/old-sheet.jpg' }),
    ]
    const plan = planCharacterCollectionCommit(existing, {
      mode: 'single',
      active: [
        { id: 'face-new', metadata: { ...existing[0].metadata, assetName: 'nadia', characterInputMode: 'single', characterAspectRatio: '9:16' } },
        { id: 'profile-kept', metadata: { ...existing[1].metadata, assetName: 'nadia', characterInputMode: 'single', characterAspectRatio: '9:16' } },
      ],
      retiredAt: '2026-08-21T01:00:00.000Z',
    })

    expect(plan.find((item) => item.id === 'face-new')?.metadata).not.toHaveProperty('characterSheetPath')
    expect(plan.find((item) => item.id === 'face-new')?.metadata).not.toHaveProperty('characterSheetUrl')
    expect(plan.find((item) => item.id === 'face-new')?.metadata).not.toHaveProperty('characterSheetViews')
    expect(plan.find((item) => item.id === 'face-old')?.trashedAt).toBe('2026-08-21T01:00:00.000Z')
  })

  it('attaches one current hidden sheet to every active Multi view', () => {
    const existing = [asset('face', 'front'), asset('profile', 'profile')]
    const plan = planCharacterCollectionCommit(existing, {
      mode: 'multi',
      active: existing.map((item) => ({ id: item.id, metadata: { ...item.metadata, characterInputMode: 'multi' } })),
      sheet: { path: '/new-sheet.jpg', url: 'prism-asset://new-sheet.jpg', views: ['front', 'profile'] },
      retiredAt: '2026-08-21T01:00:00.000Z',
    })

    for (const item of plan) {
      expect(item.metadata?.characterSheetPath).toBe('/new-sheet.jpg')
      expect(item.metadata?.characterSheetUrl).toBe('prism-asset://new-sheet.jpg')
      expect(item.metadata?.characterSheetViews).toEqual(['front', 'profile'])
      expect(item.trashedAt).toBeUndefined()
    }
  })
})
