import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const main = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
const types = readFileSync(join(root, 'src/shared/types.ts'), 'utf8')
const app = readFileSync(join(root, 'src/renderer/src/AppNext.tsx'), 'utf8')

describe('service profile IPC boundary', () => {
  it('registers BytePlus exhaustively without exposing credentials to the renderer', () => {
    expect(types).toContain("'byteplus'")
    expect(main).toContain("'byteplus'")
    expect(app).toContain("id: 'byteplus'")
    expect(app).toContain('ByteDance Seedance · BytePlus')
    expect(app).toContain("capabilities: ['Video', 'Seedance', 'Multimodal']")
    expect(preload).not.toMatch(/byteplus.*(?:api.?key|credential)/i)
  })
  it('exposes one typed preload method for every profile lifecycle operation', () => {
    for (const method of ['profiles', 'addProfile', 'transitionProfile', 'setDefaultProfile', 'selectProjectProfile']) {
      expect(types).toContain(`${method}:`)
      expect(preload).toContain(`${method}:`)
    }
    for (const channel of [
      'services:profiles',
      'services:add-profile',
      'services:transition-profile',
      'services:set-default-profile',
      'services:select-project-profile',
    ]) expect(main).toContain(`ipcMain.handle('${channel}'`)
  })

  it('keeps profile credentials in main and resolves fal generation from the active project selection', () => {
    expect(main).toContain('new ServiceProfileStore')
    expect(main).toContain("return loadServiceCredential('fal')")
    expect(main).toContain("const key = await loadServiceCredential('fish')")
    expect(main).toContain('serviceProfileStore().isConnectedForProject(provider, runtimeServiceFailures.overrides(provider, currentProject?.serviceProfileOverrides))')
    expect(main).not.toContain('async function loadFishCredential()')
    expect(preload).not.toMatch(/decrypt|safeStorage|credentialPath/)
    expect(types).not.toMatch(/interface ServiceProfile[\s\S]*apiKey/)
  })

  it('persists the optional project profile override into project and portable metadata', () => {
    expect(main).toContain('withProjectServiceProfileOverride')
    expect(main).toContain('serviceProfileOverrides: activeProject.serviceProfileOverrides')
    expect(main).toContain("ipcMain.handle('services:select-project-profile'")
  })
})
