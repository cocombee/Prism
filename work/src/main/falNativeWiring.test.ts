import { requiresGeneratedDialogueAudio, VideoDialogueAudioConflictError } from '../shared/videoDialogueAudio'
import { SeedancePromptIntegrityError } from '../shared/seedancePromptIntegrity'
import { assertVideoProviderPromptPreflight } from '../shared/providerPromptPreflight'
import { effectiveProviderPromptOwnership } from '../shared/providerPromptOwnership'
import { authoredTimelineSeconds } from '../shared/videoTiming'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { executeFalNativeGeneration } from './falNativeGeneration'
import { assertGenerationRequirements } from '../shared/generationReadiness'
import { compileFalSchemaContract } from '../shared/falSchemaBinding'
import { describeFalRuntimeInputs, falRuntimeFingerprintMaterial } from '../shared/falRuntimeInputs'
import type { GenerationRequest } from '../shared/types'

const source = ts.createSourceFile('index.ts', readFileSync(new URL('index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
function actualFunction(name: string, bindings: Record<string, unknown>) {
  const node = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name)
  if (!node) throw new Error(`Missing actual main function ${name}`)
  const text = ts.transpileModule(node.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  return new Function(...Object.keys(bindings), `${text}\nreturn ${name};`)(...Object.values(bindings)) as (request: GenerationRequest, signal?: AbortSignal) => Promise<unknown>
}
const fixtures = JSON.parse(readFileSync(new URL('../shared/falSchemaMedia.fixtures.json', import.meta.url), 'utf8'))
function setup() {
  const captured = fixtures.models[1]
  const compiled = { ...compileFalSchemaContract(captured.endpoint_id, captured.openapi), category: captured.metadata.category }
  const runtime = describeFalRuntimeInputs(compiled)
  const contract = { ...compiled, runtime: { ...runtime, fingerprint: createHash('sha256').update(falRuntimeFingerprintMaterial(compiled, runtime)).digest('hex') } }
  const request: GenerationRequest = { nodeId: 'fixture-video', kind: 'video-generator', videoEngine: 'fixture/new-model',
    prompt: 'Raw editable prompt', providerPromptOverride: '  Visible final prompt.\n\nSHOT 2 — Hold.  ',
    references: [{ path: '/fixture/image.png', mediaType: 'image', role: 'reference' }],
    falNative: { endpointId: contract.endpointId, fingerprint: contract.runtime.fingerprint, flow: 'video', promptField: 'prompt', values: { prompt: '  Visible final prompt.\n\nSHOT 2 — Hold.  ' }, media: { image_urls: [{ path: '/fixture/image.png', mediaType: 'image' }] } },
  }
  const client = { owned: true }
  const bindings = { assertVideoProviderPromptPreflight, effectiveProviderPromptOwnership, requiresGeneratedDialogueAudio, VideoDialogueAudioConflictError, SeedancePromptIntegrityError,
    executeFalNativeGeneration, authoredTimelineSeconds,
    readOwnedFalSchema: vi.fn(async () => contract),
    runtimeServiceFailures: { assertCurrent: vi.fn(), delete: vi.fn() }, assertGenerationCommit: vi.fn(),
    assertManagedMediaPath: vi.fn(async path => path), mimeFor: vi.fn(() => 'image/png'), stat: vi.fn(async () => ({ size: 1 })),
    createOwnedFalClient: vi.fn(() => client), loadCredential: vi.fn(async () => 'fictional-credential'), falElectronFetch: vi.fn(),
    uploadLocalAsset: vi.fn(async (path, ownedClient) => {
      expect(path).toBe('/fixture/image.png'); expect(ownedClient).toBe(client)
      return 'https://files.example/upload.png'
    }),
    subscribeOwnedFalClient: vi.fn(async (ownedClient, endpointId, options) => {
      expect(ownedClient).toBe(client); expect(endpointId).toBe(contract.endpointId)
      expect(options.input.prompt).toBe(request.providerPromptOverride)
      return { requestId: 'fixture-request', data: { seed: 0, video: { url: 'https://files.example/result.mp4', content_type: 'video/mp4' } } }
    }),
    mainWindow: { webContents: { send: vi.fn() } }, queueMessage: vi.fn(), extname,
    downloadResult: vi.fn(async (_url, _contentType, _metadata, _signal, expected) => { expect(expected).toBe('video'); return '/fixture/result.mp4' }),
    enforceLockedArtwork: vi.fn(), localAssetUrl: (path: string) => `prism://${path}`, appendHistory: vi.fn(async () => undefined), randomUUID: () => 'fixture-history', rememberServiceFailure: vi.fn(),
  }
  const native = actualFunction('runNativeFalGeneration', bindings)
  const run = actualFunction('runGeneration', { assertGenerationRequirements, assertVideoProviderPromptPreflight, currentProject: { rootPath: '/fixture' }, runNativeFalGeneration: native })
  return { request, bindings, run, client }
}

describe('actual main native fal dispatch composition', () => {
  it('dispatches the exact schema before the static model fallback with the original owned client and visible prompt', async () => {
    const { request, bindings, run } = setup(), signal = new AbortController().signal
    const result = await run(request, signal)
    expect(result).toMatchObject({ modelId: request.falNative!.endpointId, outputPath: '/fixture/result.mp4', outputType: 'video', outputs: [{ path: '/fixture/result.mp4', type: 'video' }] })
    expect(bindings.readOwnedFalSchema).toHaveBeenCalledTimes(2)
    expect(bindings.uploadLocalAsset).toHaveBeenCalledTimes(1)
    expect(bindings.downloadResult.mock.calls[0][3]).toBe(signal)
    expect(bindings.appendHistory).toHaveBeenCalledTimes(1)
  })
  it.each(['prompt', 'reference'])('rejects lost visible %s before schema lookup, upload or submission', async defect => {
    const { request, bindings, run } = setup()
    if (defect === 'prompt') request.falNative!.values.prompt = 'Hidden different text'
    else request.falNative!.media.image_urls = [{ path: '/fixture/different.png', mediaType: 'image' }]
    await expect(run(request)).rejects.toThrow(defect === 'prompt' ? 'visible final prompt' : 'connected reference')
    expect(bindings.readOwnedFalSchema).not.toHaveBeenCalled(); expect(bindings.uploadLocalAsset).not.toHaveBeenCalled(); expect(bindings.subscribeOwnedFalClient).not.toHaveBeenCalled()
  })
  it('checks the actual managed media type before creating the owned client', async () => {
    const { request, bindings, run } = setup()
    bindings.mimeFor.mockReturnValue('audio/wav')
    await expect(run(request)).rejects.toThrow('must be image')
    expect(bindings.createOwnedFalClient).not.toHaveBeenCalled(); expect(bindings.subscribeOwnedFalClient).not.toHaveBeenCalled()
  })
})


it('actual main reconstructs typed timing instead of trusting a renderer-supplied total, before credential/client/upload', async () => {
  const { request, run, bindings } = setup()
  request.storyboardShots = [{ prompt: 'Approach.', duration: 7, shotSize: 'medium', camera: 'static' }, { prompt: 'Stop.', duration: 7, shotSize: 'medium', camera: 'static' }]
  request.falNative!.timelineSeconds = 5; request.falNative!.values.duration = '5'
  await expect(run(request)).rejects.toThrow(/must match.*14s/)
  expect(bindings.readOwnedFalSchema).toHaveBeenCalledOnce()
  expect(bindings.loadCredential).not.toHaveBeenCalled(); expect(bindings.createOwnedFalClient).not.toHaveBeenCalled(); expect(bindings.uploadLocalAsset).not.toHaveBeenCalled(); expect(bindings.subscribeOwnedFalClient).not.toHaveBeenCalled()
})
it('actual main submits exact authored duration and excludes local timing intent from provider fields', async () => {
  const { request, run, bindings } = setup()
  request.storyboardShots = [{ prompt: 'Approach.', duration: 7, shotSize: 'medium', camera: 'static' }, { prompt: 'Stop.', duration: 7, shotSize: 'medium', camera: 'static' }]
  request.falNative!.values.duration = '14'
  await run(request)
  const input = bindings.subscribeOwnedFalClient.mock.calls[0][2].input
  expect(input.duration).toBe('14'); expect(input).not.toHaveProperty('timelineSeconds'); expect(input.prompt).toBe(request.providerPromptOverride)
})
