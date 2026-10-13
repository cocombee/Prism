import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const main = readFileSync(new URL('index.ts', import.meta.url), 'utf8')

describe('semantic save crash recovery project activation wiring', () => {
  it('runs deterministic journal recovery for both selected and restored projects before activation', () => {
    expect(main).toContain("import { recoverSemanticAssetTransactions } from './semanticAssetSaveTransaction'")
    const scaffold = main.slice(main.indexOf('async function scaffoldProjectUnlocked'), main.indexOf('async function restoreCurrentProject'))
    expect(scaffold.indexOf('await recoverSemanticAssetTransactions(currentProject.rootPath)')).toBeLessThan(scaffold.indexOf('activateCurrentProject()'))
    const restore = main.slice(main.indexOf('async function restoreCurrentProjectUnlocked'), main.indexOf('async function selectCurrentProjectServiceProfile'))
    expect(restore).toContain('await scaffoldProject(stored.rootPath, manifest,')
    expect(main).toContain('await recoverSemanticAssetTransactions(root)')
    // A legacy project with unresolved remote work stays accessible at its existing root.
    expect(main).toContain('&& !await projectHasUnresolvedRemoteJobs(existing,')
    const move = main.slice(main.indexOf('async function ensureProjectContainer'), main.indexOf('async function scaffoldProject('))
    expect(move.indexOf('projectHasUnresolvedRemoteJobs(project, documentPath)')).toBeLessThan(move.indexOf('await moveProjectContainer('))
  })
})
