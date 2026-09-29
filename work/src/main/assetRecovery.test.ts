import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { restoreRecoverableAssetFile, stageRecoverableAssetFile } from './assetRecovery'

const roots: string[] = []

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'prism-asset-recovery-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('recoverable asset file transactions', () => {
  it('stages a managed file and restores it byte-for-byte to its original folder', async () => {
    const root = await workspace()
    const original = join(root, 'Imported Assets', 'actor.png')
    const trash = join(root, '05. Canvas', '.prism-trash', 'transaction')
    await mkdir(join(root, 'Imported Assets'), { recursive: true })
    const bytes = Buffer.from([0, 1, 2, 250, 255])
    await writeFile(original, bytes)

    const staged = await stageRecoverableAssetFile(original, trash, 'asset-id.png')
    expect(staged.moved).toBe(true)
    await expect(readFile(original)).rejects.toThrow()
    expect(await readFile(staged.stagedPath)).toEqual(bytes)

    expect(await restoreRecoverableAssetFile(staged.stagedPath, original)).toBe(true)
    expect(await readFile(original)).toEqual(bytes)
    await expect(readFile(staged.stagedPath)).rejects.toThrow()
  })

  it('refuses to overwrite a new file that occupies the original path', async () => {
    const root = await workspace()
    const original = join(root, 'asset.png')
    const trash = join(root, '.prism-trash')
    await writeFile(original, 'original')
    const staged = await stageRecoverableAssetFile(original, trash, 'asset-id.png')
    await writeFile(original, 'replacement')

    await expect(restoreRecoverableAssetFile(staged.stagedPath, original)).rejects.toThrow('Another file now occupies')
    expect(await readFile(original, 'utf8')).toBe('replacement')
    expect(await readFile(staged.stagedPath, 'utf8')).toBe('original')
  })
})
