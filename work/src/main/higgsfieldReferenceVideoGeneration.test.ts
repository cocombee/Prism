import { describe, expect, it, vi } from 'vitest'
import {
  executeHiggsfieldReferenceVideoGeneration,
  HIGGSFIELD_REFERENCE_VIDEO_LOCAL_BUDGET,
  type HiggsfieldReferenceVideoGenerationDependencies,
} from './higgsfieldReferenceVideoGeneration'
import { HIGGSFIELD_REFERENCE_VIDEO_REVISION, higgsfieldReferenceVideoSchema } from '../shared/higgsfieldReferenceVideo'
import type { HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import type { HiggsfieldReferenceVideoMediaType } from '../shared/higgsfieldReferenceVideo'
import type { FalSchemaNode } from '../shared/falSchemaBinding'

type RouteCase = { id: string; values: Record<string, any>; media: Record<string, any> }
const routes: RouteCase[] = [
  { id: 'kling-video/v3.0/std/image-to-video', values: { prompt: 'Kling 3 action.' }, media: { image_url: [{ mediaType: 'image', path: '/fixture/start.png' }] } },
  { id: 'kling-video/v2.6/pro/image-to-video', values: { prompt: 'Kling 2.6 action.' }, media: { image_url: [{ mediaType: 'image', path: '/fixture/start.png' }] } },
  { id: 'minimax/h3/reference-to-video', values: { prompt: 'H3 action.' }, media: { image_urls: [{ mediaType: 'image', path: '/fixture/ref.png' }] } },
  { id: 'minimax/hailuo-2.3/standard/image-to-video', values: { prompt: 'Hailuo action.' }, media: { image_url: [{ mediaType: 'image', path: '/fixture/start.png' }] } },
  { id: 'lightricks/ltx-2.5/image-to-video/pro', values: { prompt: 'LTX action.', duration: 6 }, media: { image_url: [{ mediaType: 'image', path: '/fixture/start.png' }] } },
  { id: 'pixverse/v6/image-to-video', values: { prompt: 'PixVerse action.' }, media: { image_url: [{ mediaType: 'image', path: '/fixture/start.png' }] } },
  { id: 'wan/v2.7/reference-to-video', values: { prompt: 'Wan 2.7 action.' }, media: { image_urls: [{ mediaType: 'image', path: '/fixture/ref.png' }] } },
  { id: 'alibaba/wan-3.0/image-to-video', values: { prompt: 'Wan 3 action.' }, media: { image_url: [{ mediaType: 'image', path: '/fixture/start.png' }] } },
]
const fingerprint = 'a'.repeat(64)
const native = (route: RouteCase, extra: Partial<HiggsfieldNativeRequest> = {}): HiggsfieldNativeRequest => ({
  endpointId: route.id,
  contractRevision: HIGGSFIELD_REFERENCE_VIDEO_REVISION,
  fingerprint,
  values: structuredClone(route.values),
  media: structuredClone(route.media),
  ...extra,
})

function depsFor(routeId = routes[0].id) {
  const events: string[] = []
  const upload = vi.fn(async (_bytes: Uint8Array, _contentType: string) => { events.push('upload'); return `https://cdn.prism.example/upload-${events.filter(event => event === 'upload').length}` })
  const generate = vi.fn(async (_endpointId: string, _input: Record<string, unknown>, _signal?: AbortSignal, _schema?: FalSchemaNode) => {
    events.push('generate')
    return { requestId: 'fixture-request', url: 'https://cdn.prism.example/output.mp4', contentType: 'video/mp4' }
  })
  const api = vi.fn(async () => { events.push('api'); return { upload, generate } })
  const validateInput = vi.fn(async (_input: unknown) => { events.push('contract') })
  const persist = vi.fn(async (_output: { requestId: string; url: string; contentType?: string }, _endpointId: string) => {
    events.push('persist'); return { path: '/fixture/output.mp4', url: 'prism-asset://fixture/output.mp4' }
  })
  const dependencies: HiggsfieldReferenceVideoGenerationDependencies = {
    inputSchema: higgsfieldReferenceVideoSchema(routeId),
    assertCurrent: vi.fn(),
    validateInput,
    api,
    persist,
    inspect: vi.fn(async (source: { mediaType: HiggsfieldReferenceVideoMediaType; path?: string; url?: string }) => {
      events.push('inspect')
      return { source, byteLength: 3, contentType: source.mediaType === 'image' ? 'image/png' : source.mediaType === 'video' ? 'video/mp4' : 'audio/wav' }
    }),
    read: vi.fn(async () => { events.push('read'); return new Uint8Array([1, 2, 3]) }),
    validate: vi.fn(async () => { events.push('content') }),
  }
  return { events, dependencies, upload, generate, api, validateInput, persist }
}

describe('Higgsfield Reference main executor boundary (mock-only, no provider calls)', () => {
  it.each(routes)('submits %s with its exact route, current body and persisted identity', async route => {
    const mock = depsFor(route.id)
    const result = await executeHiggsfieldReferenceVideoGeneration(native(route), mock.dependencies)
    expect(mock.generate).toHaveBeenCalledOnce()
    const [endpointId, input, , schema] = mock.generate.mock.calls[0]
    expect(endpointId).toBe(route.id)
    expect(schema).toEqual(higgsfieldReferenceVideoSchema(route.id))
    expect(input.prompt).toBe(route.values.prompt)
    expect(result).toMatchObject({ modelId: route.id, outputType: 'video', outputPath: '/fixture/output.mp4' })
    expect(mock.persist).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'fixture-request' }), route.id, undefined)
    expect(mock.events[0]).toBe('contract')
    expect(mock.events.indexOf('api')).toBeGreaterThan(mock.events.lastIndexOf('content'))
    expect(mock.events.indexOf('generate')).toBeGreaterThan(mock.events.lastIndexOf('contract'))
  })

  it('validates fresh identity before local inspection, client creation or upload', async () => {
    const route = routes[2], mock = depsFor(route.id)
    mock.validateInput.mockRejectedValueOnce(new Error('Current model fingerprint changed.'))
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), mock.dependencies)).rejects.toThrow(/fingerprint changed/)
    expect(mock.validateInput).toHaveBeenCalledOnce()
    expect(mock.dependencies.inspect).not.toHaveBeenCalled(); expect(mock.api).not.toHaveBeenCalled(); expect(mock.upload).not.toHaveBeenCalled(); expect(mock.generate).not.toHaveBeenCalled()
  })

  it('checks the exact materialized body after upload and before generation POST', async () => {
    const route = routes[2], mock = depsFor(route.id)
    mock.validateInput.mockImplementation(async input => {
      mock.events.push('contract')
      if ((input as any).image_urls?.[0]?.includes('/upload-')) throw new Error('Current exact body changed before POST.')
    })
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), mock.dependencies)).rejects.toThrow(/exact body changed/)
    expect(mock.validateInput).toHaveBeenCalledTimes(3)
    expect(mock.upload).toHaveBeenCalledOnce(); expect(mock.generate).not.toHaveBeenCalled(); expect(mock.persist).not.toHaveBeenCalled()
  })

  it('deduplicates identical physical media reads and uploads while preserving reference positions', async () => {
    const route: RouteCase = {
      id: 'minimax/h3/reference-to-video',
      values: { prompt: 'Keep the authored reference order.' },
      media: {
        image_urls: [
          { mediaType: 'image', path: '/fixture/a.png' },
          { mediaType: 'image', path: '/fixture/b.png' },
          { mediaType: 'image', path: '/fixture/a.png' },
        ],
        video_urls: [{ mediaType: 'video', path: '/fixture/motion.mp4' }, { mediaType: 'video', path: '/fixture/motion.mp4' }],
        audio_urls: [{ mediaType: 'audio', path: '/fixture/sound.wav' }],
      },
    }
    const mock = depsFor(route.id)
    await executeHiggsfieldReferenceVideoGeneration(native(route), mock.dependencies)
    expect(mock.dependencies.inspect).toHaveBeenCalledTimes(4)
    expect(mock.dependencies.read).toHaveBeenCalledTimes(4)
    expect(mock.dependencies.validate).toHaveBeenCalledTimes(4)
    expect(mock.upload).toHaveBeenCalledTimes(4)
    const body = mock.generate.mock.calls[0][1]
    expect(body.image_urls).toEqual([
      'https://cdn.prism.example/upload-1', 'https://cdn.prism.example/upload-2', 'https://cdn.prism.example/upload-1',
    ])
    expect(body.video_urls).toEqual(['https://cdn.prism.example/upload-3', 'https://cdn.prism.example/upload-3'])
    expect(body.audio_urls).toEqual(['https://cdn.prism.example/upload-4'])
  })

  it('forwards remote URLs exactly and never reads or uploads them', async () => {
    const route: RouteCase = {
      id: 'minimax/h3/reference-to-video', values: { prompt: 'Remote reference.' },
      media: { image_urls: [{ mediaType: 'image', url: 'https://cdn.prism.example/ref.png?Signature=Exact%2Fbytes' }] },
    }
    const mock = depsFor(route.id)
    await executeHiggsfieldReferenceVideoGeneration(native(route), mock.dependencies)
    expect(mock.dependencies.inspect).not.toHaveBeenCalled(); expect(mock.dependencies.read).not.toHaveBeenCalled(); expect(mock.dependencies.validate).not.toHaveBeenCalled(); expect(mock.upload).not.toHaveBeenCalled()
    expect(mock.generate.mock.calls[0][1].image_urls).toEqual(['https://cdn.prism.example/ref.png?Signature=Exact%2Fbytes'])
  })

  it('blocks malformed current schema, unknown values and conditional media before credentials', async () => {
    const route = routes[2], mock = depsFor(route.id)
    const unknown = native(route); unknown.values.new_control = 'unbound'
    await expect(executeHiggsfieldReferenceVideoGeneration(unknown, mock.dependencies)).rejects.toThrow(/does not accept saved control/)
    expect(mock.validateInput).not.toHaveBeenCalled(); expect(mock.dependencies.inspect).not.toHaveBeenCalled(); expect(mock.api).not.toHaveBeenCalled()

    const noReferences = native({ ...route, media: {} })
    await expect(executeHiggsfieldReferenceVideoGeneration(noReferences, mock.dependencies)).rejects.toThrow(/video_urls/)
    expect(mock.api).not.toHaveBeenCalled(); expect(mock.dependencies.inspect).not.toHaveBeenCalled()

    const drift = { ...mock.dependencies, inputSchema: higgsfieldReferenceVideoSchema(route.id) }
    drift.inputSchema.properties!.new_url = { type: 'string', format: 'uri' }
    const driftMock = depsFor(route.id)
    Object.assign(driftMock.dependencies, { inputSchema: drift.inputSchema })
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), driftMock.dependencies)).rejects.toThrow(/unbound media/)
    expect(driftMock.validateInput).not.toHaveBeenCalled(); expect(driftMock.api).not.toHaveBeenCalled(); expect(driftMock.dependencies.inspect).not.toHaveBeenCalled()
  })

  it('rejects saved Kling structured values and required/shape drift before contract checks or credentials', async () => {
    const route = routes[0]
    for (const key of ['elements', 'multi_prompt']) {
      const mock = depsFor(route.id), authored = native(route)
      ;(authored.values as any)[key] = [{ legacy: 'preserve this value' }]
      await expect(executeHiggsfieldReferenceVideoGeneration(authored, mock.dependencies)).rejects.toThrow(new RegExp(`structured control ${key}.*preserved`))
      expect(mock.validateInput).not.toHaveBeenCalled(); expect(mock.api).not.toHaveBeenCalled(); expect(mock.dependencies.inspect).not.toHaveBeenCalled(); expect(mock.generate).not.toHaveBeenCalled()
      expect((authored.values as any)[key]).toEqual([{ legacy: 'preserve this value' }])
    }

    const required = depsFor(route.id)
    required.dependencies.inputSchema.required = [...(required.dependencies.inputSchema.required || []), 'multi_prompt']
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), required.dependencies)).rejects.toThrow(/requires unsupported structured control multi_prompt/)
    expect(required.validateInput).not.toHaveBeenCalled(); expect(required.api).not.toHaveBeenCalled(); expect(required.dependencies.inspect).not.toHaveBeenCalled()

    const shape = depsFor(route.id)
    shape.dependencies.inputSchema.properties!.elements!.items = { type: 'object', properties: { name: { type: 'string' } } }
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), shape.dependencies)).rejects.toThrow(/structured control elements changed shape/)
    expect(shape.validateInput).not.toHaveBeenCalled(); expect(shape.api).not.toHaveBeenCalled(); expect(shape.dependencies.inspect).not.toHaveBeenCalled()

    const added = depsFor(route.id)
    added.dependencies.inputSchema.properties!.future_control = { type: 'object', properties: { prompt: { type: 'string' } } }
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), added.dependencies)).rejects.toThrow(/adds unsupported structured control future_control/)
    expect(added.validateInput).not.toHaveBeenCalled(); expect(added.api).not.toHaveBeenCalled(); expect(added.dependencies.inspect).not.toHaveBeenCalled()
  })

  it('requires main-owned current schema and fingerprint before client or managed-media access', async () => {
    const route = routes[0], noSchema = depsFor(route.id)
    ;(noSchema.dependencies as any).inputSchema = undefined
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), noSchema.dependencies)).rejects.toThrow(/current main-owned/)
    expect(noSchema.validateInput).not.toHaveBeenCalled(); expect(noSchema.api).not.toHaveBeenCalled(); expect(noSchema.dependencies.inspect).not.toHaveBeenCalled()

    const noFingerprint = depsFor(route.id)
    const requestWithoutFingerprint = native(route); delete requestWithoutFingerprint.fingerprint
    await expect(executeHiggsfieldReferenceVideoGeneration(requestWithoutFingerprint, noFingerprint.dependencies)).rejects.toThrow(/current Higgsfield Reference model inputs/)
    expect(noFingerprint.validateInput).not.toHaveBeenCalled(); expect(noFingerprint.api).not.toHaveBeenCalled()
  })

  it('rejects local media type, size and aggregate-budget errors before reads, credentials or uploads', async () => {
    const wrongTypeRoute = routes[2], wrongType = depsFor(wrongTypeRoute.id)
    wrongType.dependencies.inspect = vi.fn(async source => ({ source, byteLength: 3, contentType: 'video/mp4' }))
    await expect(executeHiggsfieldReferenceVideoGeneration(native(wrongTypeRoute), wrongType.dependencies)).rejects.toThrow(/supported upload format/)
    expect(wrongType.dependencies.read).not.toHaveBeenCalled(); expect(wrongType.api).not.toHaveBeenCalled()

    const large = depsFor(wrongTypeRoute.id)
    large.dependencies.inspect = vi.fn(async source => ({ source, byteLength: HIGGSFIELD_REFERENCE_VIDEO_LOCAL_BUDGET.imageBytes + 1, contentType: 'image/png' }))
    await expect(executeHiggsfieldReferenceVideoGeneration(native(wrongTypeRoute), large.dependencies)).rejects.toThrow(/local file-size bound/)
    expect(large.dependencies.read).not.toHaveBeenCalled(); expect(large.api).not.toHaveBeenCalled()

    const aggregateRoute: RouteCase = {
      id: 'minimax/h3/reference-to-video', values: { prompt: 'Aggregate bound.' },
      media: { image_urls: Array.from({ length: 9 }, (_, index) => ({ mediaType: 'image', path: `/fixture/${index}.png` })) },
    }
    const aggregate = depsFor(aggregateRoute.id)
    aggregate.dependencies.inspect = vi.fn(async source => ({ source, byteLength: 60 * 1024 * 1024, contentType: 'image/png' }))
    await expect(executeHiggsfieldReferenceVideoGeneration(native(aggregateRoute), aggregate.dependencies)).rejects.toThrow(/aggregate local-memory bound/)
    expect(aggregate.dependencies.read).not.toHaveBeenCalled(); expect(aggregate.api).not.toHaveBeenCalled()
  })

  it('stops at unsafe upload URLs and keeps the exact original request snapshot', async () => {
    const route: RouteCase = { id: 'alibaba/wan-3.0/image-to-video', values: { prompt: 'Original prompt.' }, media: { image_url: [{ mediaType: 'image', path: '/fixture/start.png' }] } }
    const unsafe = depsFor(route.id)
    unsafe.upload.mockResolvedValue('https://127.0.0.1/private.png')
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), unsafe.dependencies)).rejects.toThrow(/private/)
    expect(unsafe.upload).toHaveBeenCalledOnce(); expect(unsafe.generate).not.toHaveBeenCalled(); expect(unsafe.persist).not.toHaveBeenCalled()

    const snapshot = native(route), stable = depsFor(route.id)
    const inspectedSources: Array<{ mediaType: HiggsfieldReferenceVideoMediaType; path?: string; url?: string }> = []
    stable.dependencies.inspect = vi.fn(async source => {
      snapshot.values.prompt = 'Later edit.'
      snapshot.media.image_url[0].path = '/fixture/later.png'
      inspectedSources.push(source)
      return { source, byteLength: 3, contentType: 'image/png' }
    })
    await executeHiggsfieldReferenceVideoGeneration(snapshot, stable.dependencies)
    expect(stable.generate.mock.calls[0][1].prompt).toBe('Original prompt.')
    expect(inspectedSources[0].path).toBe('/fixture/start.png')
  })

  it('deduplicates source uploads without collapsing repeated remote slots', async () => {
    const route: RouteCase = {
      id: 'minimax/h3/reference-to-video', values: { prompt: 'Keep duplicate slots.' },
      media: { image_urls: [
        { mediaType: 'image', url: 'https://cdn.prism.example/repeated.png' },
        { mediaType: 'image', url: 'https://cdn.prism.example/repeated.png' },
      ] },
    }
    const mock = depsFor(route.id)
    await executeHiggsfieldReferenceVideoGeneration(native(route), mock.dependencies)
    expect(mock.upload).not.toHaveBeenCalled()
    expect(mock.generate.mock.calls[0][1].image_urls).toEqual([
      'https://cdn.prism.example/repeated.png', 'https://cdn.prism.example/repeated.png',
    ])
  })

  it('checks current ownership and abort state across upload, POST and persistence', async () => {
    const route = routes[0], controller = new AbortController(), canceled = depsFor(route.id)
    canceled.upload.mockImplementation(async () => { controller.abort(new Error('Canceled.')); return 'https://cdn.prism.example/upload' })
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), canceled.dependencies, controller.signal)).rejects.toThrow(/Canceled/)
    expect(canceled.generate).not.toHaveBeenCalled(); expect(canceled.persist).not.toHaveBeenCalled()

    const stale = depsFor(route.id)
    stale.dependencies.assertCurrent = vi.fn(() => { if (stale.generate.mock.calls.length) throw new Error('Owner changed after submit.') })
    stale.generate.mockImplementation(async () => { stale.events.push('generate'); return { requestId: 'fixture-request', url: 'https://cdn.prism.example/output.mp4', contentType: 'video/mp4' } })
    await expect(executeHiggsfieldReferenceVideoGeneration(native(route), stale.dependencies)).rejects.toThrow(/Owner changed/)
    expect(stale.persist).not.toHaveBeenCalled()
  })
})
