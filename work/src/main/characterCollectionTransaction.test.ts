import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Character collection transaction boundary', () => {
  it('compiles before promotion and commits active metadata through one IPC transaction', () => {
    const source = readFileSync(new URL('../renderer/src/AppNext.tsx', import.meta.url), 'utf8')
    const save = source.slice(source.indexOf('const saveCharacterAsset'), source.indexOf('const saveSemanticAsset'))
    expect(save.indexOf('compileCharacterSheet(references')).toBeGreaterThan(-1)
    expect(save.indexOf('compileCharacterSheet(references')).toBeLessThan(save.indexOf('window.prism.assets.promote'))
    expect(save).toContain('window.prism.assets.commitCharacterCollection')
    expect(save).not.toContain('window.prism.assets.updateMetadata')
    expect(save).toContain('window.prism.assets.delete(id).catch')
  })

  it('takes the registry snapshot inside the serialized commit and restores registry and sheet on failure', () => {
    const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
    const handler = source.slice(source.indexOf("ipcMain.handle('assets:commit-character-collection'"), source.indexOf('const renameManagedAsset'))
    expect(handler.indexOf('assetJsonMutations.run')).toBeLessThan(handler.indexOf('loadProjectAssets()'))
    expect(handler).toContain('await atomicJson(assetsIndexPath(), nextAssets)')
    expect(handler).toContain('await atomicJson(assetsIndexPath(), originalAssets).catch')
    expect(handler).toContain('await writeFile(sheetTarget, originalSheet).catch')
    expect(handler).toContain('else await unlink(sheetTarget).catch')
  })

  it('stages collection files and commits the pruned workflow before one physical trash operation', () => {
    const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
    const handler = source.slice(source.indexOf("ipcMain.handle('assets:delete-collection'"), source.indexOf("ipcMain.handle('assets:delete'"))
    expect(handler).toContain("projectFolder('Canvas', '.prism-delete-staging', randomUUID())")
    expect(handler).toContain('await atomicJson(workflowPath(), nextWorkflow)')
    expect(handler).toContain('await shell.trashItem(stagingRoot)')
    expect(handler).toContain('await atomicJson(assetsIndexPath(), originalAssets).catch')
    expect(handler).toContain('await rename(moved.stagedPath, moved.source).catch')
  })
})
