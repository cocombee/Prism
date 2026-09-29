import { mkdir, rename, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function stageRecoverableAssetFile(source: string, stagingRoot: string, stagedFilename: string): Promise<{ stagedPath: string; moved: boolean }> {
  const stagedPath = join(stagingRoot, stagedFilename)
  await mkdir(stagingRoot, { recursive: true })
  if (!await exists(source)) return { stagedPath, moved: false }
  await rename(source, stagedPath)
  return { stagedPath, moved: true }
}

export async function restoreRecoverableAssetFile(stagedPath: string, originalPath: string): Promise<boolean> {
  if (await exists(originalPath)) throw new Error('Another file now occupies the original asset path.')
  if (!await exists(stagedPath)) return false
  await mkdir(dirname(originalPath), { recursive: true })
  await rename(stagedPath, originalPath)
  return true
}
