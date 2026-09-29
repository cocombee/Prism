import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const main = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
const preload = readFileSync(new URL('../preload/index.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../shared/types.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../renderer/src/AppNext.tsx', import.meta.url), 'utf8')

describe('Character image validation boundary', () => {
  it('keeps image decoding in main behind one typed managed-asset IPC capability', () => {
    expect(types).toContain("validateCharacterImage: (id: string, mode: CharacterInputMode) => Promise<CharacterImageValidationResult>")
    expect(preload).toContain("validateCharacterImage: (id, mode) => ipcRenderer.invoke('assets:validate-character-image', id, mode)")
    expect(main).toContain("ipcMain.handle('assets:validate-character-image'")
    expect(main).toContain('validateCharacterImageFile(source, rawMode as CharacterInputMode)')
  })

  it('validates before mutating Character metadata or replacing the active view', () => {
    const assignment = app.slice(app.indexOf('const assignCharacterViewAsset'), app.indexOf('const importCanvasAssetIntoView'))
    expect(assignment).toContain('window.prism.assets.validateCharacterImage(source.id, characterInputMode)')
    expect(assignment.indexOf('validateCharacterImage')).toBeLessThan(assignment.indexOf('updateMetadata'))
    expect(assignment).toContain('updateNode(target.id, { error: validation.message })')
  })
})