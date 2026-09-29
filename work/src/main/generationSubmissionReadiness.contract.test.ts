import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const main = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

describe('main-process generation readiness boundary', () => {
  it('rejects incomplete requests before project access, credentials, or provider submission', () => {
    expect(main).toContain("import { assertGenerationRequirements } from '../shared/generationReadiness'")
    const runStart = main.indexOf('async function runGeneration(request: GenerationRequest')
    const runEnd = main.indexOf('\n}', runStart)
    const runBody = main.slice(runStart, runEnd)
    const validation = runBody.indexOf('assertGenerationRequirements(request)')
    expect(validation).toBeGreaterThanOrEqual(0)
    expect(validation).toBeLessThan(runBody.indexOf("if (!currentProject)"))
    expect(validation).toBeLessThan(runBody.indexOf('loadCredential()'))
  })
})
