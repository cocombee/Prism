import { assertVideoProviderPromptPreflight } from '../shared/providerPromptPreflight'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import ts from 'typescript'
import { generateFishAudio } from './fishAudioApi'
import { persistFishAudio } from './fishAudioPersistence'
import { validateFalContractValue } from './falSchemaValidation'
import { compileFishAudioRequest } from '../shared/fishAudio'
import { assertGenerationRequirements } from '../shared/generationReadiness'
import type { GenerationRequest, ServiceModelAvailability } from '../shared/types'
const source = ts.createSourceFile('index.ts', readFileSync(new URL('index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
function actualFunction(name: string, bindings: Record<string, unknown>) {
  const node = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name)
  if (!node) throw new Error(`Missing actual main function ${name}`)
  const text = ts.transpileModule(node.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  return new Function(...Object.keys(bindings), `${text}\nreturn ${name};`)(...Object.values(bindings)) as (request: GenerationRequest, signal?: AbortSignal) => Promise<any>
}
const request: GenerationRequest = { nodeId: 'fixture-voice', kind: 'voiceover', voiceEngine: 'fish-audio', fishModel: 's2.1-pro', fishReferenceId: 'fictional-voice', prompt: '  Repeat.\n\nRepeat.  ', fishFormat: 'pcm', fishSampleRate: 16000 }
function setup(directory: string) {
  const availability: ServiceModelAvailability = { provider: 'fish', verified: true, catalogCheckedAt: new Date().toISOString(), models: [{ id: 's2.1-pro', label: 'Fish Audio S2.1 Pro' }], nativeInputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }
  const post = vi.fn(async (_url: string, _init: RequestInit) => new Response(Buffer.from([0, 0, 0, 0]), { headers: { 'Content-Type': 'application/octet-stream' } }))
  const bindings = { compileFishAudioRequest, validateFalContractValue, generateFishAudio, persistFishAudio, readOwnedFishCatalog: vi.fn(async () => availability), loadServiceCredential: vi.fn(async () => 'fictional-key'), net: { fetch: post }, mainWindow: { webContents: { send: vi.fn() } }, assertGenerationCommit: vi.fn(), categoryFolder: () => directory, join, randomUUID: () => 'fixture-audio', registerGeneratedAsset: vi.fn(async (_path, _metadata, indexed) => indexed()), appendHistory: vi.fn(async () => undefined), localAssetUrl: (path: string) => path, rememberServiceFailure: vi.fn(), runtimeServiceFailures: { assertCurrent: vi.fn(), delete: vi.fn() } }
  const native = actualFunction('runFishAudio', bindings), run = actualFunction('runGeneration', { assertGenerationRequirements, assertVideoProviderPromptPreflight, currentProject: { rootPath: directory }, runFishAudio: native })
  return { availability, bindings, run, post }
}
describe('actual main Fish dispatch composition', () => {
  it('uses the selected native model and exact speech through full validation, one HTTP call and managed WAV persistence', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'prism-fish-main-'))
    try {
      const { run, post, bindings } = setup(directory), result = await run(request)
      expect(post).toHaveBeenCalledOnce(); const options = post.mock.calls[0][1] as any
      expect(options.headers.model).toBe('s2.1-pro'); expect(JSON.parse(options.body).text).toBe(request.prompt)
      expect(bindings.loadServiceCredential.mock.calls).toEqual([['fish']]); expect(bindings.appendHistory).toHaveBeenCalledOnce()
      expect(result).toMatchObject({ modelId: 'fish-audio/s2.1-pro', outputType: 'audio' }); const bytes = await readFile(result.outputPath)
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.readUInt32LE(24)).toBe(16000)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('rejects a provider’s newly required input before credential loading, upload or POST', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'prism-fish-main-invalid-'))
    try {
      const { availability, run, post, bindings } = setup(directory)
      availability.nativeInputSchema = { type: 'object', properties: { new_audio_refs: { type: 'array', maxItems: 50 } }, required: ['new_audio_refs'] }
      await expect(run(request)).rejects.toThrow(/new_audio_refs/); expect(bindings.readOwnedFishCatalog).toHaveBeenCalledOnce(); expect(bindings.loadServiceCredential).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled(); expect(bindings.registerGeneratedAsset).not.toHaveBeenCalled()
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('rechecks provider ownership immediately before the POST and never writes an output after rejection', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'prism-fish-main-owner-'))
    try {
      const { run, post, bindings } = setup(directory); bindings.runtimeServiceFailures.assertCurrent.mockImplementation(() => { throw new Error('Owner changed') })
      await expect(run(request)).rejects.toThrow(/Owner changed/); expect(post).not.toHaveBeenCalled(); expect(bindings.registerGeneratedAsset).not.toHaveBeenCalled(); expect(bindings.appendHistory).not.toHaveBeenCalled()
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
