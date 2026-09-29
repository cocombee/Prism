import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const main = readFileSync(new URL('../main/index.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../renderer/src/AppNext.tsx', import.meta.url), 'utf8')

describe('BytePlus activation integration surface', () => {
  it('returns only live authenticated models and clears stale activation failure after success', () => {
    expect(main).toContain('const models = bytePlusLiveModels(body.data || [])')
    expect(main).not.toContain('for (const supported of BYTEPLUS_SEEDANCE_MODELS)')
    expect(main).toContain("runtimeServiceFailures.delete('byteplus')")
    expect(main.indexOf("runtimeServiceFailures.delete('byteplus')")).toBeLessThan(main.indexOf("return { provider, verified: true, models }"))
  })

  it('refreshes unknown availability once and blocks verified missing activation before generation IPC', () => {
    expect(app).toContain("await window.prism.services.models('byteplus')")
    expect(app).toContain('bytePlusActivationMessage(videoModel, availability)')
    expect(app).toContain("openProviderConnections('byteplus', videoModel.label)")
    const activation = app.indexOf('bytePlusActivationMessage(videoModel, availability)')
    expect(activation).toBeLessThan(app.indexOf('window.prism.generation.run', activation))
  })

  it('uses canonical provider names for Connections and run warnings', () => {
    expect(app).toContain('const providerName = providerDisplayName(provider)')
    expect(app).toContain('const providerName = providerDisplayName(generationProvider)')
  })
})
