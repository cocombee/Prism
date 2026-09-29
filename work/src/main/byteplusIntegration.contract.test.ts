import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const main = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
const appNext = readFileSync(join(root, 'src/renderer/src/AppNext.tsx'), 'utf8')
const nodeNext = readFileSync(join(root, 'src/renderer/src/NodeCardNext.tsx'), 'utf8')
const legacyApp = readFileSync(join(root, 'src/renderer/src/App.tsx'), 'utf8')
const legacyNode = readFileSync(join(root, 'src/renderer/src/NodeCard.tsx'), 'utf8')

describe('BytePlus completed integration contracts', () => {
  it('keeps legacy renderer files free of BytePlus edits', () => {
    expect(legacyApp.toLowerCase()).not.toContain('byteplus')
    expect(legacyNode.toLowerCase()).not.toContain('byteplus')
  })

  it('dispatches explicit BytePlus video routes without changing the fal subscription branch', () => {
    expect(main).toContain("import { compileBytePlusGenerationRequest }")
    expect(main).toContain("import { runBytePlusTaskAndDownload }")
    expect(main).toContain("if (videoModel.provider === 'byteplus') return runBytePlusGeneration(request, videoModel, signal)")
    expect(main).toContain("loadServiceCredential('byteplus'")
    expect(main).toContain('fetch: (input, init) => net.fetch(input, init)')
    expect(main).toContain("downloadResult(url, 'video/mp4'")
    expect(main).toContain("rememberServiceFailure('byteplus'")
    expect(main).toContain('const result = await fal.subscribe(modelId, {')
    expect(main).toContain("message: 'Submitting securely to fal.ai…'")
  })

  it('routes next renderer readiness and account actions through the selected model provider', () => {
    expect(appNext).toContain("import { generationServiceProvider }")
    expect(appNext).toContain('const generationProvider = generationServiceProvider(node.data)')
    expect(nodeNext).toContain("import { generationServiceProvider }")
    expect(nodeNext).toContain('const billingProvider: ServiceProvider = generationServiceProvider(data)')
    expect(appNext).toContain('const providerName = providerDisplayName(provider)')
    expect(appNext).toContain('const providerName = providerDisplayName(generationProvider)')
    expect(nodeNext).toContain("billingProvider === 'byteplus' ? 'BytePlus Seedance'")
  })

  it('keeps BytePlus cost unavailable and direct menu groups distinct', () => {
    expect(main).toContain("resolveVideoModel(request.videoEngine).provider === 'byteplus'")
    expect(nodeNext).toContain("'BytePlus · Seedance 2.5'")
    expect(nodeNext).toContain("'BytePlus · Seedance 2'")
  })
})
