import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renameImportedAssetCollectionFiles, restoreImportedAssetCollectionFiles } from './assetCollectionRename'
import type { ImportedAsset } from '../shared/types'

function asset(id: string, path: string, view?: string): ImportedAsset {
  return { id, name: path.split('/').at(-1)!, path, url: `asset://${id}`, mimeType: 'image/png', fileSize: 1, createdAt: new Date().toISOString(), origin: 'imported', category: 'character', metadata: { assetName: 'Old Name', characterView: view as NonNullable<ImportedAsset['metadata']>['characterView'] } }
}

describe('renameImportedAssetCollectionFiles', () => {
  it('renames the collection folder and each physical member without changing view identity', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-rename-'))
    const oldDir = join(root, 'Old Name')
    await mkdir(oldDir)
    await writeFile(join(oldDir, 'face.png'), 'face')
    await writeFile(join(oldDir, 'side.png'), 'side')
    const renamed = await renameImportedAssetCollectionFiles([
      asset('a', join(oldDir, 'face.png'), 'front'),
      asset('b', join(oldDir, 'side.png'), 'profile'),
    ], 'New Name')
    expect(renamed.map((item) => item.path)).toEqual([
      join(root, 'New Name', 'New Name-front.png'),
      join(root, 'New Name', 'New Name-profile.png'),
    ])
    expect(await readFile(renamed[0].path, 'utf8')).toBe('face')
    expect(renamed.every((item) => item.metadata?.assetName === 'New Name')).toBe(true)
  })

  it('renames case-only paths and keeps embedded Prism Style identity transactional', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-style-rename-'))
    const oldDir = join(root, 'Warm Style')
    const oldPath = join(oldDir, 'Warm Style.prismstyle')
    await mkdir(oldDir)
    await writeFile(oldPath, JSON.stringify({ name: 'Warm Style', prompt: 'soft light' }))
    const original: ImportedAsset = { ...asset('style-a', oldPath), name: 'Warm Style.prismstyle', mimeType: 'application/json', category: 'style', metadata: { assetName: 'Warm Style' } }
    const renamed = await renameImportedAssetCollectionFiles([original], 'warm style')
    expect(renamed[0].path).toBe(join(root, 'warm style', 'warm style.prismstyle'))
    expect(JSON.parse(await readFile(renamed[0].path, 'utf8'))).toMatchObject({ name: 'warm style', prompt: 'soft light' })
    await restoreImportedAssetCollectionFiles(renamed, [original])
    expect(JSON.parse(await readFile(oldPath, 'utf8'))).toMatchObject({ name: 'Warm Style', prompt: 'soft light' })
  })
})
