import { access, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, dirname, extname, join } from 'node:path'
import type { ImportedAsset } from '../shared/types'

function safePhysicalName(value: string) {
  const sanitized = value.normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '')
  if (!sanitized) throw new Error('Asset name cannot be empty.')
  return sanitized.slice(0, 120)
}

async function pathExists(path: string) {
  try { await access(path); return true } catch { return false }
}

const caseFoldedPath = (path: string) => path.normalize('NFC').toLocaleLowerCase('en-US')

async function renameCaseSafely(source: string, destination: string) {
  if (source === destination) return
  if (caseFoldedPath(source) !== caseFoldedPath(destination)) {
    await rename(source, destination)
    return
  }
  const intermediate = join(dirname(source), `.prism-rename-${randomUUID()}`)
  await rename(source, intermediate)
  try { await rename(intermediate, destination) }
  catch (error) { await rename(intermediate, source).catch(() => undefined); throw error }
}

async function rewritePrismStyleName(path: string, name: string): Promise<string | null> {
  if (extname(path).toLocaleLowerCase('en-US') !== '.prismstyle') return null
  const original = await readFile(path, 'utf8')
  const document = JSON.parse(original) as Record<string, unknown>
  const temporary = `${path}.tmp-${randomUUID()}`
  await writeFile(temporary, `${JSON.stringify({ ...document, name }, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
  return original
}

function memberToken(asset: ImportedAsset, index: number, total: number) {
  const view = asset.metadata?.characterView || asset.metadata?.elementView
  if (view) return `-${view}`
  return total > 1 ? `-${index + 1}` : ''
}

export async function renameImportedAssetCollectionFiles(assets: ImportedAsset[], requestedName: string): Promise<ImportedAsset[]> {
  if (!assets.length) return []
  const name = safePhysicalName(requestedName)
  const oldDirectory = dirname(assets[0].path)
  if (!assets.every((asset) => dirname(asset.path) === oldDirectory)) throw new Error('Reusable asset members must share one physical folder before rename.')
  if (!await pathExists(oldDirectory)) throw new Error('The reusable asset folder is missing. Relink it before renaming.')
  const newDirectory = join(dirname(oldDirectory), name)
  if (newDirectory !== oldDirectory && caseFoldedPath(newDirectory) !== caseFoldedPath(oldDirectory) && await pathExists(newDirectory)) throw new Error(`An asset folder named “${name}” already exists.`)
  const plans = assets.map((asset, index) => ({
    asset,
    oldPath: join(newDirectory, basename(asset.path)),
    newPath: join(newDirectory, `${name}${memberToken(asset, index, assets.length)}${extname(asset.path).toLowerCase()}`),
  }))
  if (new Set(plans.map((plan) => plan.newPath.toLocaleLowerCase())).size !== plans.length) throw new Error('The renamed asset would create duplicate physical filenames.')
  for (const plan of plans) {
    if (plan.newPath !== plan.oldPath && caseFoldedPath(plan.newPath) !== caseFoldedPath(plan.oldPath) && await pathExists(plan.newPath)) throw new Error(`A file named “${basename(plan.newPath)}” already exists.`)
  }

  const renamedMembers: Array<{ from: string; to: string }> = []
  const styleBackups: Array<{ path: string; content: string }> = []
  let directoryMoved = false
  try {
    if (newDirectory !== oldDirectory) {
      await renameCaseSafely(oldDirectory, newDirectory)
      directoryMoved = true
    }
    for (const plan of plans) {
      if (plan.oldPath === plan.newPath) continue
      await renameCaseSafely(plan.oldPath, plan.newPath)
      renamedMembers.push({ from: plan.oldPath, to: plan.newPath })
    }
    for (const plan of plans) {
      const original = await rewritePrismStyleName(plan.newPath, name)
      if (original !== null) styleBackups.push({ path: plan.newPath, content: original })
    }
  } catch (error) {
    for (const backup of styleBackups) await writeFile(backup.path, backup.content, 'utf8').catch(() => undefined)
    for (const member of renamedMembers.reverse()) {
      try { await renameCaseSafely(member.to, member.from) } catch { /* preserve the original failure */ }
    }
    if (directoryMoved) {
      try { await renameCaseSafely(newDirectory, oldDirectory) } catch { /* preserve the original failure */ }
    }
    throw error
  }

  return plans.map(({ asset, newPath }) => ({
    ...asset,
    name: basename(newPath),
    path: newPath,
    metadata: { ...asset.metadata, assetName: name },
  }))
}

export async function restoreImportedAssetCollectionFiles(current: ImportedAsset[], originals: ImportedAsset[]) {
  if (!current.length || current.length !== originals.length) return
  const originalById = new Map(originals.map((asset) => [asset.id, asset]))
  const currentDirectory = dirname(current[0].path)
  const originalDirectory = dirname(originals[0].path)
  for (const asset of current) {
    const original = originalById.get(asset.id)
    if (!original) continue
    const intermediate = join(currentDirectory, basename(original.path))
    if (asset.path !== intermediate && await pathExists(asset.path)) await renameCaseSafely(asset.path, intermediate)
  }
  if (currentDirectory !== originalDirectory && await pathExists(currentDirectory)) await renameCaseSafely(currentDirectory, originalDirectory)
  const originalName = originals[0].metadata?.assetName || basename(originalDirectory)
  for (const original of originals) await rewritePrismStyleName(original.path, originalName).catch(() => undefined)
}
