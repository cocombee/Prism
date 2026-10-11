import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HiggsfieldApi } from './higgsfieldApi'
import { beginHiggsfieldJob, openHiggsfieldJobSnapshot, openHiggsfieldRemoteJob, openHiggsfieldSubmission } from './higgsfieldJobLifecycle'
import { readHiggsfieldInputContract } from './higgsfieldInputContract'
import { resolveHiggsfieldCurrentInput } from './higgsfieldCurrentInput'
import { executeHiggsfieldReferenceVideoGeneration } from './higgsfieldReferenceVideoGeneration'
import { executeHiggsfieldTextVideoGeneration } from './higgsfieldTextVideoGeneration'
import { higgsfieldCredentialIdentity, HiggsfieldJobStore } from './higgsfieldJobStore'
import { HIGGSFIELD_API, higgsfieldInputSchema, higgsfieldModel, higgsfieldPromptFamily } from '../shared/higgsfieldNative'
import type { HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import { higgsfieldFieldPortId } from '../shared/higgsfieldInputContract'
import { reconcileHiggsfieldNodeBinding, selectHiggsfieldBinding } from '../shared/higgsfieldNodeBinding'
import { nodeInputPorts } from '../shared/nodePorts'
import { planHiggsfieldTextVideoInput } from '../shared/higgsfieldTextVideo'
import { higgsfieldReferenceVideoSchema, planHiggsfieldReferenceVideoInput } from '../shared/higgsfieldReferenceVideo'
import { buildGenerationRequest } from '../shared/workflowResolver'
import { compileProviderPrompt } from '../shared/referenceInstructions'
import type { NodeKind, StudioNode, StudioNodeData, StoryboardPanel } from '../shared/types'
import type { Edge } from '@xyflow/react'
import type { FalSchemaNode } from '../shared/falSchemaBinding'

const PROFILE_ID = 'fixture-profile'
const API_KEY = 'fixture-id:fixture-secret'
const PROMPT = '  Keep every authored byte.\r\nPreserve this second line.\t'
const OUTPUT_URL = 'https://cdn.prism.example/result.mp4'
const OUTPUT_PATH = '/fixture/project/result.mp4'
const decrypt = (bytes: Buffer) => bytes.toString('utf8')
const encrypt = (value: string) => Buffer.from(value, 'utf8')

type SourceSpec = { id: string; field: string; type: 'image' | 'video' | 'audio'; url: string }
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

function node(key: string, kind: NodeKind, data: Partial<StudioNodeData> = {}): StudioNode {
  return { id: key, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: key, ...data } as StudioNodeData }
}

function source(spec: SourceSpec): StudioNode {
  const extension = spec.type === 'image' ? 'png' : spec.type === 'video' ? 'mp4' : 'wav'
  return node(spec.id, 'upload', { outputType: spec.type, assetUrl: spec.url || `https://cdn.prism.example/${spec.id}.${extension}`, referenceTag: `@${spec.id}` })
}

function graphEdge(from: StudioNode, field: string, index: number): Edge {
  return { id: `${from.id}-${field}-${index}`, source: from.id, sourceHandle: 'media-out', target: 'generator', targetHandle: higgsfieldFieldPortId(field) }
}

function makeOwner(endpointId: string) {
  let currentSchema = higgsfieldInputSchema(endpointId)
  const readContract = vi.fn(async (requested: string, assertCurrent: () => void) => {
    assertCurrent()
    if (requested !== endpointId) throw new Error(`Unexpected current-schema route ${requested}.`)
    return structuredClone(currentSchema)
  })
  return {
    owner: { assertCurrent: vi.fn(), readContract },
    get schema() { return structuredClone(currentSchema) },
    set schema(value: FalSchemaNode) { currentSchema = structuredClone(value) },
  }
}

async function prepareGraph(endpointId: string, specs: SourceSpec[] = [], prompt = PROMPT) {
  const owner = makeOwner(endpointId)
  const selection = selectHiggsfieldBinding({}, endpointId, [])
  const initial = selection.higgsfieldNative!
  const contract = await readHiggsfieldInputContract(endpointId, owner.owner)
  const current = reconcileHiggsfieldNodeBinding(initial, contract)
  current.reviewedFingerprint = contract.fingerprint
  const end = node('generator', 'video-generator', {
    promptMode: 'manual', manualPromptDraft: prompt, prompt: 'stale local prompt must not replace Manual bytes.',
    ...selection, higgsfieldNative: current,
  })
  const sources = specs.map(source)
  const nodes = [end, ...sources]
  const edges = specs.map((spec, index) => graphEdge(sources[index], spec.field, index))
  const request = buildGenerationRequest(end, nodes, edges)
  const native = request.higgsfieldNative!
  const owned = await resolveHiggsfieldCurrentInput(native, owner.owner)
  return { owner, contract, end, nodes, edges, request, native, owned }
}

async function compiledGraphParts(endpointId: string, durations: [number, number] = [2, 3]) {
  const owner = makeOwner(endpointId)
  const selection = selectHiggsfieldBinding({}, endpointId, [])
  const initial = selection.higgsfieldNative!
  const contract = await readHiggsfieldInputContract(endpointId, owner.owner)
  const current = reconcileHiggsfieldNodeBinding(initial, contract)
  current.reviewedFingerprint = contract.fingerprint
  current.values.duration = 5
  const end = node('generator', 'video-generator', {
    promptMode: 'auto',
    prompt: 'LOCAL USER PROMPT: A courier carries an amber lantern through a rain-soaked arcade.',
    ...selection,
    higgsfieldNative: current,
  })
  const panels: StoryboardPanel[] = [
    { id: 'shot-one', prompt: 'The courier pauses beneath the tiled arch.', duration: durations[0], shotSize: 'close-up', camera: 'static', transitionToNext: 'hard-cut' },
    { id: 'shot-two', prompt: 'The courier continues forward as the lantern catches the rain.', duration: durations[1], shotSize: 'wide', camera: 'dolly-in' },
  ]
  const story = node('story', 'storyboard', { storyboardPanels: panels, storyboardDuration: 5 })
  const style = node('style', 'style-reference', {
    styleSavedAt: 'fixture', stylePrompt: 'UNIQUE USER STYLE: amber-gold documentary grain and soft halation', referenceTag: '@Look',
    referenceAssets: [{ id: 'look', name: 'Amber grain', path: '/fixture/look.prismstyle', mimeType: 'application/prismstyle', createdAt: 'fixture' }],
  })
  const prompt = node('upstream-prompt', 'prompt', { prompt: 'UPSTREAM USER PROMPT: Keep the lantern in the courier’s right hand.' })
  const nodes = [end, story, style, prompt]
  const edges: Edge[] = [
    { id: 'story-to-generator', source: story.id, sourceHandle: 'storyboard-out', target: end.id, targetHandle: 'storyboard-in' },
    { id: 'style-to-generator', source: style.id, sourceHandle: 'style-out', target: end.id, targetHandle: 'style-in' },
    { id: 'prompt-to-generator', source: prompt.id, sourceHandle: 'text-out', target: end.id, targetHandle: 'text-in' },
  ]
  return { owner, contract, end, nodes, edges }
}

type PreparedGraph = Awaited<ReturnType<typeof prepareGraph>>

async function prepareCompiledGraph(endpointId: string, durations: [number, number] = [2, 3]): Promise<PreparedGraph> {
  const parts = await compiledGraphParts(endpointId, durations)
  const request = buildGenerationRequest(parts.end, parts.nodes, parts.edges)
  const native = request.higgsfieldNative!
  const owned = await resolveHiggsfieldCurrentInput(native, parts.owner.owner)
  return { ...parts, request, native, owned }
}

function scope(nodeId: string) {
  return { projectId: 'fixture-project', rootPath: '/fixture/project', documentPath: '/fixture/project/Scene.prismflow', nodeId }
}

async function runThroughProtectedApi(endpointId: string, specs: SourceSpec[] = [], preparedGraph?: PreparedGraph) {
  const graph = preparedGraph ?? await prepareGraph(endpointId, specs)
  const directory = await mkdtemp(join(tmpdir(), 'prism-higgsfield-primary-'))
  temporaryDirectories.push(directory)
  const jobScope = scope(`generator-${endpointId.replaceAll('/', '-')}`)
  try {
    const store = new HiggsfieldJobStore(directory)
    const lifecycle = await beginHiggsfieldJob(store, jobScope, PROFILE_ID, graph.native, encrypt, graph.owned.schema)
    const fetch = vi.fn(async (address: string, init?: RequestInit) => {
      expect(address).toBe(`${HIGGSFIELD_API}/${endpointId}`)
      expect(init?.method).toBe('POST')
      const beforePost = await store.get(jobScope, lifecycle.record.id)
      expect(beforePost.state).toBe('submitting')
      expect(beforePost.profileId).toBe(PROFILE_ID)
      expect(beforePost.endpointId).toBe(endpointId)
      const receipt = openHiggsfieldSubmission(beforePost, decrypt)
      expect(receipt?.endpointId).toBe(endpointId)
      expect(receipt?.body).toBe(init?.body)
      expect(JSON.parse(receipt!.body)).toEqual(graph.owned.plan.preview)
      expect(JSON.parse(receipt!.body).prompt).toBe(graph.request.prompt)
      return new Response(JSON.stringify({
        request_id: 'fixture-job', status: 'completed',
        video: { url: OUTPUT_URL, content_type: 'video/mp4' },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const api = new HiggsfieldApi({
      key: API_KEY, fetch, assertCurrent: graph.owner.owner.assertCurrent,
      observer: lifecycle.observer(higgsfieldCredentialIdentity(API_KEY)),
    })
    const validateInput = vi.fn(async (input: unknown) => { await graph.owned.validateInput(input) })
    const persist = vi.fn(async (output: { requestId: string; url: string; contentType?: string }, route: string) => {
      expect(route).toBe(endpointId)
      expect(output).toEqual({ requestId: 'fixture-job', url: OUTPUT_URL, contentType: 'video/mp4' })
      await lifecycle.persisted(OUTPUT_PATH)
      return { path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }
    })
    let result: Awaited<ReturnType<typeof executeHiggsfieldTextVideoGeneration>> | Awaited<ReturnType<typeof executeHiggsfieldReferenceVideoGeneration>>
    if (higgsfieldModel(endpointId).kind === 'text-video') {
      result = await executeHiggsfieldTextVideoGeneration(graph.native, {
        inputSchema: graph.owned.schema, assertCurrent: graph.owner.owner.assertCurrent,
        validateInput, api: async () => api, persist,
      })
    } else {
      result = await executeHiggsfieldReferenceVideoGeneration(graph.native, {
        inputSchema: graph.owned.schema, assertCurrent: graph.owner.owner.assertCurrent,
        validateInput, api: async () => api, persist,
        inspect: vi.fn(async () => { throw new Error('Remote fixture URLs must not be inspected.') }),
        read: vi.fn(async () => { throw new Error('Remote fixture URLs must not be read.') }),
        validate: vi.fn(async () => { throw new Error('Remote fixture URLs must not be prepared.') }),
      })
    }
    expect(fetch).toHaveBeenCalledOnce()
    expect(validateInput).toHaveBeenCalledTimes(higgsfieldModel(endpointId).kind === 'reference-video' ? 3 : 2)
    expect(persist).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ requestId: 'fixture-job', modelId: endpointId, outputPath: OUTPUT_PATH, outputType: 'video' })
    const completed = await store.get(jobScope, lifecycle.record.id)
    expect(completed.state).toBe('persisted')
    expect(completed.outputPath).toBe(OUTPUT_PATH)
    expect(openHiggsfieldJobSnapshot(completed, decrypt)).toEqual(graph.native)
    expect(openHiggsfieldRemoteJob(completed, decrypt)?.requestId).toBe('fixture-job')
    expect(openHiggsfieldSubmission(completed, decrypt)?.body).toBe(fetch.mock.calls[0][1]?.body)
    return { ...graph, store, jobScope, lifecycle, completed, fetch, validateInput }
  } finally { /* afterEach keeps the real temporary journal available to post-run recovery checks. */ }
}

describe('Higgsfield primary text and reference model integration (mock-only)', () => {
  it.each([
    'kling-video/v3.0/std/text-to-video',
    'wan/v2.7/text-to-video',
    'minimax/h3/text-to-video',
    'lightricks/ltx-2.5/text-to-video/pro',
  ])('composes graph, current contract, protected journal and real API for %s', async endpointId => {
    const run = await runThroughProtectedApi(endpointId)
    expect(higgsfieldModel(endpointId).kind).toBe('text-video')
    expect(run.request.videoEngine).toBe(endpointId)
    expect(run.request.prompt).toBe(PROMPT)
    expect(run.request.providerPromptOverride).toBe(PROMPT)
    expect(run.request.providerPromptOwnership).toBe('authored')
    expect(run.native.endpointId).toBe(endpointId)
    expect(run.native.fingerprint).toBe(run.contract.fingerprint)
    expect(run.native.media).toEqual({})
    expect(run.request.falNative).toBeUndefined()
    expect(run.request).not.toHaveProperty('frameRate')
    expect(run.request).not.toHaveProperty('shutterAngle')
    const wire = JSON.parse(openHiggsfieldSubmission(run.completed, decrypt)!.body)
    expect(wire.prompt).toBe(PROMPT)
    expect(wire).not.toHaveProperty('image_url')
    expect(wire).not.toHaveProperty('video_url')
    expect(wire).not.toHaveProperty('output_format')
    if (endpointId === 'kling-video/v3.0/std/text-to-video') {
      expect(wire).not.toHaveProperty('elements')
      expect(wire).not.toHaveProperty('multi_prompt')
    }
    expect(nodeInputPorts({ kind: 'video-generator', higgsfieldNative: run.end.data.higgsfieldNative })
      .filter(port => port.id.startsWith('higgsfield-input::'))).toEqual([])
  })

  it.each([
    ['kling-video/v3.0/std/text-to-video', 'kling'],
    ['wan/v2.7/text-to-video', 'wan'],
  ] as const)('compiles %s Storyboard, user prompt and Style through its own family before protected submission', async (endpointId, expectedFamily) => {
    const graph = await prepareCompiledGraph(endpointId)
    const request = graph.request
    const family = higgsfieldPromptFamily(endpointId)
    expect(family).toBe(expectedFamily)
    expect(request.videoEngine).toBe(endpointId)
    expect(request.providerPromptOwnership).toBe('compiled')
    expect(request.providerPromptOverride).toBe(request.prompt)
    expect(request.authoredPrompt).toContain('LOCAL USER PROMPT: A courier carries an amber lantern')
    expect(request.authoredPrompt).toContain('UPSTREAM USER PROMPT: Keep the lantern in the courier’s right hand.')
    expect(request.stylePrompt).toContain('UNIQUE USER STYLE: amber-gold documentary grain and soft halation')
    expect(request.storyboardShots?.map(shot => [shot.startSeconds, shot.endSeconds, shot.duration])).toEqual([[0, 2, 2], [2, 5, 3]])
    expect(request.duration).toBe(graph.native.values.duration)
    expect(request.prompt).toContain('LOCAL USER PROMPT: A courier carries an amber lantern')
    expect(request.prompt).toContain('UPSTREAM USER PROMPT: Keep the lantern in the courier’s right hand.')
    expect(request.prompt).toContain('UNIQUE USER STYLE: amber-gold documentary grain and soft halation')
    expect(request.prompt).toContain('FORMAT MODE')
    expect(request.prompt).toContain('CUT 1')
    expect(request.prompt).toContain('CUT 2')
    expect(request.prompt).toContain('authored shot groups separated by hard cuts')
    expect(request.prompt).toContain('Cuts only at the specified points.')
    expect(request.storyboardShots?.[0].transitionToNext).toBe('hard-cut')
    expect(request.prompt).toContain('Maintain the selected view for 2.0s')
    expect(request.prompt).toContain('selected 3.0s interval')
    expect(request.prompt).not.toMatch(/LOOK AND CAPTURE CHARACTER|SEEDANCE MASTER/i)
    expect(graph.native.values.prompt).toBe(request.prompt)

    // Recompile the unowned graph payload with the route's family and prove the
    // visible request is that Kling/Wan production prompt, not a Seedance master.
    const familyCompilation = compileProviderPrompt({
      ...request,
      providerPromptOverride: undefined,
      providerPromptOwnership: undefined,
    }, { family })
    expect(familyCompilation.family).toBe(expectedFamily)
    expect(familyCompilation.text).toBe(request.prompt)

    const run = await runThroughProtectedApi(endpointId, [], graph)
    const wire = JSON.parse(openHiggsfieldSubmission(run.completed, decrypt)!.body)
    expect(wire.prompt).toBe(request.prompt)
    expect(wire.duration).toBe(5)
    expect(wire).not.toHaveProperty('image_url')
    expect(wire).not.toHaveProperty('reference_urls')
    expect(run.fetch).toHaveBeenCalledOnce()
    expect(run.completed.state).toBe('persisted')
  })

  it.each(['kling-video/v3.0/std/text-to-video', 'wan/v2.7/text-to-video'])(
    'blocks a %s authored timeline that differs from native duration before current-schema dispatch', async endpointId => {
      const graph = await compiledGraphParts(endpointId, [2, 2])
      const schemaReadsBefore = graph.owner.owner.readContract.mock.calls.length
      const api = vi.fn(async () => { throw new Error('Credentials must not open.') })
      const validateInput = vi.fn(async () => undefined)
      const submit = async () => {
        const request = buildGenerationRequest(graph.end, graph.nodes, graph.edges)
        const native = request.higgsfieldNative!
        const owned = await resolveHiggsfieldCurrentInput(native, graph.owner.owner)
        return executeHiggsfieldTextVideoGeneration(native, {
          inputSchema: owned.schema, assertCurrent: graph.owner.owner.assertCurrent, validateInput, api,
          persist: async () => ({ path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }),
        })
      }
      await expect(submit()).rejects.toThrow(/duration|must match/i)
      expect(graph.owner.owner.readContract).toHaveBeenCalledTimes(schemaReadsBefore)
      expect(validateInput).not.toHaveBeenCalled()
      expect(api).not.toHaveBeenCalled()
    },
  )

  it('omits Wan 2.7 optional audio URI in its planner and rejects authored audio without fallback', async () => {
    const route = 'wan/v2.7/text-to-video'
    const run = await runThroughProtectedApi(route)
    expect(run.contract.fields.some(field => field.key === 'audio_url')).toBe(false)
    const planned = planHiggsfieldTextVideoInput(run.native, run.owned.schema)
    const wire = JSON.parse(openHiggsfieldSubmission(run.completed, decrypt)!.body)
    expect(wire.prompt).toBe(PROMPT)
    expect(planned.preview).not.toHaveProperty('audio_url')
    expect(wire).not.toHaveProperty('audio_url')
    const api = vi.fn(async () => { throw new Error('Credentials must not open.') })
    const validateInput = vi.fn(async () => undefined)
    const authored = structuredClone(run.native)
    authored.values.audio_url = 'https://cdn.prism.example/sound.wav'
    await expect(executeHiggsfieldTextVideoGeneration(authored, {
      inputSchema: run.owned.schema, assertCurrent: () => undefined, validateInput, api,
      persist: async () => ({ path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }),
    })).rejects.toThrow(/does not support audio_url/)
    expect(validateInput).not.toHaveBeenCalled()
    expect(api).not.toHaveBeenCalled()

    await expect(executeHiggsfieldTextVideoGeneration(run.native, {
      inputSchema: undefined as never, assertCurrent: () => undefined, validateInput, api,
      persist: async () => ({ path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }),
    })).rejects.toThrow(/main-owned.*schema/)
    expect(api).not.toHaveBeenCalled()
  })

  it.each([
    'kling-video/v3.0/std/text-to-video',
    'wan/v2.7/text-to-video',
    'kling-video/v3.0/std/image-to-video',
  ])('permits unchanged open root metadata but rejects schema drift for %s before the current owner', async endpointId => {
    const graph = await prepareGraph(endpointId, endpointId.includes('image-to-video')
      ? [{ id: 'start', field: 'image_url', type: 'image', url: 'https://cdn.prism.example/start.png' }]
      : [])
    const open = graph.owner.schema
    open.additionalProperties = true
    graph.owner.schema = open
    const changedContract = await readHiggsfieldInputContract(endpointId, graph.owner.owner)
    const rebound = { ...graph.native, fingerprint: changedContract.fingerprint }
    await expect(resolveHiggsfieldCurrentInput(rebound, graph.owner.owner)).rejects.toThrow(/reviewed Higgsfield adapter/)
    const validateInput = vi.fn(async (input: unknown) => {
      const current = await resolveHiggsfieldCurrentInput(rebound, graph.owner.owner)
      await current.validateInput(input)
    })
    const api = vi.fn(async () => { throw new Error('Credentials must not open.') })
    if (higgsfieldModel(endpointId).kind === 'text-video') {
      await expect(executeHiggsfieldTextVideoGeneration(rebound, {
        inputSchema: open, assertCurrent: () => undefined, validateInput, api,
        persist: async () => ({ path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }),
      })).rejects.toThrow(/accepts undeclared keys/)
    } else {
      await expect(executeHiggsfieldReferenceVideoGeneration(rebound, {
        inputSchema: open, assertCurrent: () => undefined, validateInput, api,
        inspect: vi.fn(), read: vi.fn(), validate: vi.fn(),
        persist: async () => ({ path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }),
      })).rejects.toThrow(/reviewed Higgsfield adapter/)
    }
    expect(api).not.toHaveBeenCalled()
  })

  it('composes MiniMax H3 ordered image, video and audio arrays using typed graph media', async () => {
    const endpointId = 'minimax/h3/reference-to-video'
    const specs: SourceSpec[] = [
      { id: 'video-second', field: 'video_urls', type: 'video', url: 'https://cdn.prism.example/video-second.mp4' },
      { id: 'image-second', field: 'image_urls', type: 'image', url: 'https://cdn.prism.example/image-second.png' },
      { id: 'audio-one', field: 'audio_urls', type: 'audio', url: 'https://cdn.prism.example/audio-one.wav' },
      { id: 'image-first', field: 'image_urls', type: 'image', url: 'https://cdn.prism.example/image-first.png' },
      { id: 'video-first', field: 'video_urls', type: 'video', url: 'https://cdn.prism.example/video-first.mp4' },
    ]
    const run = await runThroughProtectedApi(endpointId, specs)
    expect(higgsfieldModel(endpointId).kind).toBe('reference-video')
    expect(run.request.videoEngine).toBe(endpointId)
    expect(run.request.prompt).toBe(PROMPT)
    expect(run.request.providerPromptOverride).toBe(PROMPT)
    expect(Object.keys(run.native.media)).toEqual(['audio_urls', 'image_urls', 'video_urls'])
    expect(run.native.media.audio_urls.map(item => item.mediaType)).toEqual(['audio'])
    expect(run.native.media.image_urls.map(item => item.mediaType)).toEqual(['image', 'image'])
    expect(run.native.media.video_urls.map(item => item.mediaType)).toEqual(['video', 'video'])
    const wireText = openHiggsfieldSubmission(run.completed, decrypt)!.body
    const wire = JSON.parse(wireText)
    expect(wire.prompt).toBe(PROMPT)
    expect(wire.image_urls).toEqual(['https://cdn.prism.example/image-second.png', 'https://cdn.prism.example/image-first.png'])
    expect(wire.video_urls).toEqual(['https://cdn.prism.example/video-second.mp4', 'https://cdn.prism.example/video-first.mp4'])
    expect(wire.audio_urls).toEqual(['https://cdn.prism.example/audio-one.wav'])
    expect(Object.keys(wire).slice(-3)).toEqual(['image_urls', 'video_urls', 'audio_urls'])
    expect(run.contract.media.find(binding => binding.key === 'image_urls')?.maximum).toBe(9)
    expect(run.contract.media.find(binding => binding.key === 'video_urls')?.maximum).toBe(3)
    expect(run.contract.media.find(binding => binding.key === 'audio_urls')?.maximum).toBe(3)
    const ports = nodeInputPorts({ kind: 'video-generator', higgsfieldNative: run.end.data.higgsfieldNative })
    expect(ports.find(port => port.id === higgsfieldFieldPortId('image_urls'))).toMatchObject({ signal: 'image', maxConnections: 9 })
    expect(ports.find(port => port.id === higgsfieldFieldPortId('video_urls'))).toMatchObject({ signal: 'video', maxConnections: 3 })
    expect(ports.find(port => port.id === higgsfieldFieldPortId('audio_urls'))).toMatchObject({ signal: 'audio', maxConnections: 3 })
  })

  it('composes Kling 3 start and end frames as separate typed body fields', async () => {
    const endpointId = 'kling-video/v3.0/std/image-to-video'
    const run = await runThroughProtectedApi(endpointId, [
      { id: 'end-frame', field: 'last_image_url', type: 'image', url: 'https://cdn.prism.example/end.png' },
      { id: 'start-frame', field: 'image_url', type: 'image', url: 'https://cdn.prism.example/start.png' },
    ])
    expect(higgsfieldModel(endpointId).kind).toBe('reference-video')
    const wireText = openHiggsfieldSubmission(run.completed, decrypt)!.body
    const wire = JSON.parse(wireText)
    expect(wire.prompt).toBe(PROMPT)
    expect(wire.image_url).toBe('https://cdn.prism.example/start.png')
    expect(wire.last_image_url).toBe('https://cdn.prism.example/end.png')
    expect(Object.keys(wire).slice(-2)).toEqual(['image_url', 'last_image_url'])
    expect(wire).not.toHaveProperty('elements')
    expect(wire).not.toHaveProperty('multi_prompt')
    const ports = nodeInputPorts({ kind: 'video-generator', higgsfieldNative: run.end.data.higgsfieldNative })
    expect(ports.find(port => port.id === higgsfieldFieldPortId('image_url'))).toMatchObject({ signal: 'image', maxConnections: 1, icon: 'start-frame' })
    expect(ports.find(port => port.id === higgsfieldFieldPortId('last_image_url'))).toMatchObject({ signal: 'image', maxConnections: 1, icon: 'end-frame' })
  })

  it('retains state and retired connections while switching the Kling family between Text and Reference', async () => {
    const textId = 'kling-video/v3.0/std/text-to-video'
    const referenceId = 'kling-video/v3.0/std/image-to-video'
    const text = selectHiggsfieldBinding({}, textId, []).higgsfieldNative!
    text.values.duration = 11
    text.drafts = { duration: '1e' }
    const referencePort = { id: higgsfieldFieldPortId('image_url'), label: 'Start frame', signal: 'image' as const }
    const reference = selectHiggsfieldBinding({ higgsfieldNative: text }, referenceId, [referencePort])
    reference.higgsfieldNative!.values.duration = 9
    reference.higgsfieldNative!.values.aspect_ratio = '9:16'
    const switchedToText = selectHiggsfieldBinding({ ...reference, higgsfieldNative: reference.higgsfieldNative }, textId, [referencePort])
    expect(switchedToText.higgsfieldNativePresets?.[referenceId].values).toMatchObject({ duration: 9, aspect_ratio: '9:16' })
    expect(switchedToText.higgsfieldNative!.retiredPorts).toContainEqual(referencePort)
    const switchedBack = selectHiggsfieldBinding(switchedToText, referenceId, [])
    expect(switchedBack.higgsfieldNative!.values).toMatchObject({ duration: 9, aspect_ratio: '9:16' })
    expect(switchedBack.higgsfieldNative!.media?.some(binding => binding.key === 'image_url' && !binding.retired)).toBe(true)
    const restoredText = selectHiggsfieldBinding(switchedBack, textId, [])
    expect(restoredText.higgsfieldNative!.values.duration).toBe(11)
    expect(restoredText.higgsfieldNative!.drafts).toEqual({ duration: '1e' })
  })

  it('rejects optional Kling structured values and added unbound URI schema before validation or API', async () => {
    const endpointId = 'kling-video/v3.0/std/image-to-video'
    const selected = selectHiggsfieldBinding({}, endpointId, []).higgsfieldNative!
    const native: HiggsfieldNativeRequest = {
      endpointId, contractRevision: selected.contractRevision, fingerprint: 'a'.repeat(64),
      values: { prompt: PROMPT },
      media: {
        image_url: [{ mediaType: 'image' as const, url: 'https://cdn.prism.example/start.png' }],
        last_image_url: [{ mediaType: 'image' as const, url: 'https://cdn.prism.example/end.png' }],
      },
    }
    const schema = higgsfieldReferenceVideoSchema(endpointId)
    const initialPlan = planHiggsfieldReferenceVideoInput(native, schema)
    expect(initialPlan.preview.prompt).toBe(PROMPT)
    expect(initialPlan.preview.image_url).toBe('https://cdn.prism.example/start.png')
    expect(initialPlan.preview.last_image_url).toBe('https://cdn.prism.example/end.png')
    expect(Object.keys(initialPlan.preview).slice(-2)).toEqual(['image_url', 'last_image_url'])
    const ports = nodeInputPorts({ kind: 'video-generator', higgsfieldNative: selectHiggsfieldBinding({}, endpointId, []).higgsfieldNative })
    expect(ports.find(port => port.id === higgsfieldFieldPortId('image_url'))).toMatchObject({ signal: 'image', maxConnections: 1, icon: 'start-frame' })
    expect(ports.find(port => port.id === higgsfieldFieldPortId('last_image_url'))).toMatchObject({ signal: 'image', maxConnections: 1, icon: 'end-frame' })
    for (const key of ['elements', 'multi_prompt']) {
      const authored = structuredClone(native)
      authored.values[key] = []
      const validateInput = vi.fn(async () => undefined), api = vi.fn(async () => { throw new Error('Credentials must not open.') })
      await expect(executeHiggsfieldReferenceVideoGeneration(authored, {
        inputSchema: schema, assertCurrent: () => undefined, validateInput, api,
        inspect: vi.fn(async () => { throw new Error('No managed media expected.') }),
        read: vi.fn(async () => { throw new Error('No managed media expected.') }),
        validate: vi.fn(async () => { throw new Error('No managed media expected.') }),
        persist: async () => ({ path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }),
      })).rejects.toThrow(new RegExp(`structured control ${key}`))
      expect(validateInput).not.toHaveBeenCalled()
      expect(api).not.toHaveBeenCalled()
    }

    const drifted = structuredClone(schema)
    drifted.properties!.future_reference = { type: 'string', format: 'uri' }
    const validateInput = vi.fn(async () => undefined), api = vi.fn(async () => { throw new Error('Credentials must not open.') })
    await expect(executeHiggsfieldReferenceVideoGeneration(native, {
      inputSchema: drifted, assertCurrent: () => undefined, validateInput, api,
      inspect: vi.fn(async () => { throw new Error('No managed media expected.') }),
      read: vi.fn(async () => { throw new Error('No managed media expected.') }),
      validate: vi.fn(async () => { throw new Error('No managed media expected.') }),
      persist: async () => ({ path: OUTPUT_PATH, url: 'prism-asset://fixture/result.mp4' }),
    })).rejects.toThrow(/adds an unbound media URI/)
    expect(validateInput).not.toHaveBeenCalled()
    expect(api).not.toHaveBeenCalled()
  })

  it('keeps persisted job recovery independent from later current-schema drift', async () => {
    const run = await runThroughProtectedApi('minimax/h3/text-to-video')
    const changed = run.owner.schema
    changed.properties!.duration.maximum = Number(changed.properties!.duration.maximum) + 1
    run.owner.schema = changed
    await expect(resolveHiggsfieldCurrentInput(run.native, run.owner.owner)).rejects.toThrow(/inputs changed/)
    const recovered = await run.store.get(run.jobScope, run.lifecycle.record.id)
    expect(recovered.state).toBe('persisted')
    expect(recovered.outputPath).toBe(OUTPUT_PATH)
    expect(openHiggsfieldJobSnapshot(recovered, decrypt)).toEqual(run.native)
    expect(openHiggsfieldSubmission(recovered, decrypt)?.endpointId).toBe('minimax/h3/text-to-video')
  })
})
