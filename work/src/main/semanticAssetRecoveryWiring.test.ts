import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const main = readFileSync(new URL('index.ts', import.meta.url), 'utf8')

describe('semantic save crash recovery project activation wiring', () => {
  it('runs deterministic journal recovery for both selected and restored projects before activation', () => {
    expect(main).toContain("import { recoverSemanticAssetTransactions } from './semanticAssetSaveTransaction'")
    expect(main.match(/await recoverSemanticAssetTransactions\(currentProject\.rootPath\)/g)).toHaveLength(2)
  })
})
