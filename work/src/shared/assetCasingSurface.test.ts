import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mainSource = readFileSync(new URL('../main/index.ts', import.meta.url), 'utf8')

describe('ordinary media casing routes', () => {
  it('reconciles registered and relisted assets through one managed transaction', () => {
    expect(mainSource).toContain('async function normalizeManagedOrdinaryMediaAssets()')
    expect(mainSource).toMatch(/if \(registered\) \{[\s\S]*normalizeManagedOrdinaryMediaAssets\(\)/)
    expect(mainSource).toMatch(/ipcMain\.handle\('assets:list'[\s\S]*normalizeManagedOrdinaryMediaAssets\(\)/)
    expect(mainSource).toContain('assetJsonMutations.run(assetsIndexPath(), normalizeManagedOrdinaryMediaAssetsUnlocked)')
  })

  it('normalizes relink and package-import identities without transcoding', () => {
    expect(mainSource).toContain('const ordinaryIdentity = normalizedOrdinaryMediaIdentity(asset)')
    expect(mainSource).toContain('destination: join(destinationFolder, uniqueAssetName(originalName))')
    expect(mainSource).toContain('name: normalizeImportedMediaName(originalName)')
    expect(mainSource).not.toMatch(/transcod|sharp\(|ffmpeg/i)
  })

  it('rewrites indexes, workflow, history, and portable state with rollback', () => {
    expect(mainSource).toContain('await atomicJson(assetsIndexPath(), updatedAssets)')
    expect(mainSource).toContain('await atomicJson(workflowPath(), rewritePaths(originalWorkflow, pathMapping))')
    expect(mainSource).toContain('await atomicJson(historyPath(), rewritePaths(originalHistory, pathMapping))')
    expect(mainSource).toContain('for (const move of moves.slice(0, movedCount).reverse())')
    expect(mainSource).toContain('await writeProjectDocument()')
    expect(mainSource).toContain('for (const copiedPath of copiedPaths.reverse()) await unlink(copiedPath)')
    expect(mainSource).toContain('assetJsonMutations.run(globalStylesIndexPath(), () => relinkFromCandidatesUnlocked(scanRoot, forced))')
  })

  it('renames files case-safely while preserving the encoded extension', () => {
    expect(mainSource).toContain('const extension = extname(source).toLocaleLowerCase')
    expect(mainSource).toContain('renameManagedFileCaseSafely(source, destination)')
    expect(mainSource).toContain('rewritePaths(originalWorkflow, mapping)')
    expect(mainSource).toContain('rewritePaths(originalHistory, mapping)')
    expect(mainSource).toContain('return assetJsonMutations.run(managed.indexPath, () => renameManagedAsset(id, rawName))')
  })
})
