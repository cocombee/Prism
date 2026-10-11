import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { compileFalSchemaContract, type FalSchemaContract } from '../shared/falSchemaBinding'
import { describeFalRuntimeInputs, falRuntimeFingerprintMaterial } from '../shared/falRuntimeInputs'
import type { FalNativeRequest } from '../shared/falNativeExecution'
import { executeFalNativeGeneration, type FalNativeGenerationDependencies } from './falNativeGeneration'
import { ProviderRequestState } from './providerRequestState'

const captured = JSON.parse(readFileSync(new URL('../shared/falSchemaMedia.fixtures.json', import.meta.url), 'utf8'))
function bind(contract: FalSchemaContract): FalSchemaContract {
  const runtime = describeFalRuntimeInputs(contract)
  return { ...contract, runtime: { ...runtime, fingerprint: createHash('sha256').update(falRuntimeFingerprintMaterial(contract, runtime)).digest('hex') } }
}
const reference = () => bind({ ...compileFalSchemaContract(captured.models[1].endpoint_id, captured.models[1].openapi), category: captured.models[1].metadata.category })
const future = (maximum = 50, extra: FalSchemaContract['input']['properties'] = {}) => bind({ endpointId: 'fixture/seedance-3/reference-to-video', category: 'image-to-video', schemaPath: '/native', input: {
  type: 'object', additionalProperties: false, required: ['new_references', 'prompt'], properties: {
    new_references: { type: 'array', minItems: 1, maxItems: maximum, uniqueItems: true, items: { type: 'string', uiField: 'image', pattern: '^https://files[.]example/' } },
    prompt: { type: 'string' }, seed: { type: 'integer', default: 9 }, enabled: { type: 'boolean', default: true },
    nullable: { anyOf: [{ type: 'string' }, { type: 'null' }], default: 'default' }, ...extra,
  },
}, output: { type: 'object', required: ['video'], properties: { video: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, content_type: { type: 'string' } } } } } })
const sources = (count: number, mediaType: 'image' | 'video' | 'audio' = 'image', local = false) => Array.from({ length: count }, (_, i) => local ? { path: `/fixture/${mediaType}-${i}.file`, mediaType } : { url: `https://files.example/${mediaType}-${i}`, mediaType })
const requestFor = (contract: FalSchemaContract, media: FalNativeRequest['media']): FalNativeRequest => ({ endpointId: contract.endpointId, fingerprint: contract.runtime!.fingerprint, flow: 'video', values: { prompt: '  [warm] Salam.\n\nSHOT 2 — Hold.  ' }, media })
function dependencies(contract: FalSchemaContract, changes: Partial<FalNativeGenerationDependencies<object>> = {}) {
  const events: string[] = []
  const deps = {
    contract: vi.fn(async () => { events.push('contract'); return contract }),
    assertCurrent: vi.fn(),
    prepareSource: vi.fn(async (source) => { events.push('prepare'); return source }),
    client: vi.fn(async () => { events.push('client'); return {} }),
    upload: vi.fn(async (_client, path) => { events.push('upload'); return `https://files.example/upload-${encodeURIComponent(path)}` }),
    submit: vi.fn(async (_client, _id, _input) => { events.push('submit'); return { requestId: 'fixture-request', data: { seed: 1, video: { url: 'https://files.example/result.mp4', content_type: 'video/mp4' } } } }),
    persist: vi.fn(async (output) => { events.push('persist'); return { path: '/fixture/result.mp4', url: output.url } }),
    ...changes,
  } satisfies FalNativeGenerationDependencies<object>
  return { deps, events }
}

describe('fresh schema-bound native fal execution', () => {
  it('passes exact current file-byte limits into authorized preparation and rejects oversized media before client/upload/submit', async () => {
    const contract = future(50, { audio_url: {type:'string',uiField:'audio',maxFileSize:60_000_000} })
    const request = requestFor(contract,{new_references:sources(1,'image',true),audio_url:sources(1,'audio',true)})
    const {deps}=dependencies(contract,{prepareSource:vi.fn(async(source,type,maximumBytes)=>{if(type==='audio'){expect(maximumBytes).toBe(60_000_000);throw Error('File exceeds 60 MB')}return source})})
    const before=JSON.stringify(request)
    await expect(executeFalNativeGeneration(request,'video-generator',deps)).rejects.toThrow('60 MB')
    expect(deps.client).not.toHaveBeenCalled();expect(deps.upload).not.toHaveBeenCalled();expect(deps.submit).not.toHaveBeenCalled();expect(JSON.stringify(request)).toBe(before)
  })
  it.each([20, 30])('uses the actual captured reference contract with %i images', async count => {
    const contract = reference(), request = requestFor(contract, { image_urls: sources(count) }), { deps } = dependencies(contract)
    const result = await executeFalNativeGeneration(request, 'video-generator', deps)
    expect(result.modelId).toBe(contract.endpointId)
    expect(vi.mocked(deps.submit).mock.calls[0][1]).toBe(contract.endpointId)
    expect(vi.mocked(deps.submit).mock.calls[0][2]).toMatchObject({ prompt: request.values.prompt, image_urls: sources(count).map(source => source.url) })
    expect(deps.upload).not.toHaveBeenCalled()
  })

  it('keeps all 50 mixed references in their exact fields and checks every source before any upload', async () => {
    const contract = reference(), request = requestFor(contract, { image_urls: sources(30, 'image', true), video_urls: sources(10, 'video', true), audio_urls: sources(10, 'audio', true) })
    const { deps, events } = dependencies(contract)
    await executeFalNativeGeneration(request, 'video-generator', deps)
    const input = vi.mocked(deps.submit).mock.calls[0][2]
    expect(input.image_urls).toHaveLength(30); expect(input.video_urls).toHaveLength(10); expect(input.audio_urls).toHaveLength(10)
    expect(events.indexOf('client')).toBe(51)
    expect(events.filter(value => value === 'prepare')).toHaveLength(50)
    expect(deps.upload).toHaveBeenCalledTimes(50)
  })

  it.each([
    { image_urls: sources(31) }, { image_urls: sources(1), video_urls: sources(11, 'video') },
    { image_urls: sources(1), audio_urls: sources(11, 'audio') }, { audio_urls: sources(1, 'audio') },
    { image_urls: sources(1, 'video') }, { unknown_refs: sources(1) },
  ] as FalNativeRequest['media'][])('fails captured capacity, type, routing and audio-only cases before a client or upload', async media => {
    const contract = reference(), { deps } = dependencies(contract)
    await expect(executeFalNativeGeneration(requestFor(contract, media), 'video-generator', deps)).rejects.toThrow()
    expect(deps.client).not.toHaveBeenCalled(); expect(deps.upload).not.toHaveBeenCalled(); expect(deps.submit).not.toHaveBeenCalled()
  })

  it('accepts a hypothetical new fifty-image field from its declaration with no static endpoint mapping', async () => {
    const contract = future(), request = requestFor(contract, { new_references: sources(50, 'image', true) }), { deps } = dependencies(contract)
    request.values = { ...request.values, seed: 0, enabled: false, nullable: null }
    await executeFalNativeGeneration(request, 'video-generator', deps)
    const input = vi.mocked(deps.submit).mock.calls[0][2]
    expect(Object.keys(input)).toEqual(['prompt', 'seed', 'enabled', 'nullable', 'new_references'])
    expect(input).toMatchObject({ seed: 0, enabled: false, nullable: null, prompt: request.values.prompt })
    expect(input.new_references).toHaveLength(50)
  })

  it('rejects changed contracts, endpoint/flow mismatch, removed fields and native overload before IO', async () => {
    const contract = future(), base = requestFor(contract, { new_references: sources(1) })
    for (const request of [
      { ...base, fingerprint: 'a'.repeat(64) }, { ...base, endpointId: 'fixture/different' }, { ...base, flow: 'image' as const },
      { ...base, values: { ...base.values, removed: 'keep' } }, { ...base, media: { new_references: sources(51) } },
      { ...base, media: { new_references: [] } }, { ...base, values: { ...base.values, new_references: ['https://files.example/a'] } },
    ]) {
      const { deps } = dependencies(contract)
      await expect(executeFalNativeGeneration(request, 'video-generator', deps)).rejects.toThrow()
      expect(deps.client).not.toHaveBeenCalled(); expect(deps.submit).not.toHaveBeenCalled()
    }
  })

  it('rejects an unknown required transport while retaining supported optional absence', async () => {
    const optional = future(50, { pose: { type: 'array', uiField: 'pose-sequence', items: { type: 'object' } } })
    const { deps } = dependencies(optional)
    await executeFalNativeGeneration(requestFor(optional, { new_references: sources(1) }), 'video-generator', deps)
    expect(vi.mocked(deps.submit).mock.calls[0][2]).not.toHaveProperty('pose')
    const required = bind({ ...optional, runtime: undefined, input: { ...optional.input, required: [...optional.input.required!, 'pose'] } })
    const blocked = dependencies(required).deps
    await expect(executeFalNativeGeneration(requestFor(required, { new_references: sources(1) }), 'video-generator', blocked)).rejects.toThrow('pose-sequence')
    expect(blocked.client).not.toHaveBeenCalled()
  })

  it('checks all managed paths first, deduplicates uploads only, and retains each field occurrence', async () => {
    const contract = future(50, { second_image: { type: 'string', uiField: 'image' } }), source = sources(1, 'image', true)[0]
    const { deps } = dependencies(contract)
    await executeFalNativeGeneration(requestFor(contract, { new_references: [source], second_image: [source] }), 'video-generator', deps)
    expect(deps.upload).toHaveBeenCalledTimes(1)
    const input = vi.mocked(deps.submit).mock.calls[0][2]
    expect((input.new_references as string[])[0]).toBe(input.second_image)
    const failed = dependencies(contract, { prepareSource: async () => { throw new Error('Media Offline') } }).deps
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: [source] }), 'video-generator', failed)).rejects.toThrow('Media Offline')
    expect(failed.client).not.toHaveBeenCalled()
  })

  it('rejects duplicate native array values before upload where the schema requires uniqueness', async () => {
    const contract = future(), source = sources(1, 'image', true)[0], { deps } = dependencies(contract)
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: [source, source] }), 'video-generator', deps)).rejects.toThrow('unique')
    expect(deps.client).not.toHaveBeenCalled()
  })
  it('detects managed-path aliases before client creation without deleting either reference', async () => {
    const contract = future(), { deps } = dependencies(contract, { prepareSource: async source => ({ ...source, path: '/fixture/one-canonical-image' }) })
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: sources(2, 'image', true) }), 'video-generator', deps)).rejects.toThrow('unique')
    expect(deps.client).not.toHaveBeenCalled(); expect(deps.upload).not.toHaveBeenCalled()
  })

  it('validates remote syntax in a mixed field before upload, then validates actual upload URLs before submit', async () => {
    const contract = future(), source = sources(1, 'image', true)[0]
    const mixed = dependencies(contract).deps
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: [source, { url: 'https://wrong.example/image', mediaType: 'image' }] }), 'video-generator', mixed)).rejects.toThrow('pattern')
    expect(mixed.client).not.toHaveBeenCalled()
    const wrongUpload = dependencies(contract, { upload: async () => 'https://wrong.example/upload' }).deps
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: [source] }), 'video-generator', wrongUpload)).rejects.toThrow('pattern')
    expect(wrongUpload.submit).not.toHaveBeenCalled()
  })

  it('preserves all declared outputs, and checks extraction capability before a paid call', async () => {
    const contract = bind({ ...future(), output: { type: 'object', required: ['videos'], properties: { videos: { type: 'array', minItems: 1, items: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, content_type: { type: 'string' } } } } } } })
    const videos = [1, 2, 3].map(i => ({ url: `https://files.example/result-${i}.mp4`, content_type: 'video/mp4' }))
    const { deps } = dependencies(contract, { submit: vi.fn(async () => ({ requestId: 'batch', data: { videos } })) })
    const result = await executeFalNativeGeneration(requestFor(contract, { new_references: sources(1) }), 'video-generator', deps)
    expect(result.outputs).toHaveLength(3); expect(deps.persist).toHaveBeenCalledTimes(3)
    const unsupported = bind({ ...contract, output: { type: 'object', properties: { mesh: { type: 'object' } } } })
    const blocked = dependencies(unsupported).deps
    await expect(executeFalNativeGeneration(requestFor(unsupported, { new_references: sources(1) }), 'video-generator', blocked)).rejects.toThrow('output')
    expect(blocked.client).not.toHaveBeenCalled()
  })

  it.each([{ video: { url: 'file:///secret' } }, { video: { url: 'https://files.example/a', content_type: 'audio/wav' } }, { video: {} }])('rejects invalid results before download/persistence', async data => {
    const contract = future(), { deps } = dependencies(contract, { submit: vi.fn(async () => ({ requestId: 'bad', data })) })
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: sources(1) }), 'video-generator', deps)).rejects.toThrow()
    expect(deps.persist).not.toHaveBeenCalled()
  })

  it.each(['contract', 'prepareSource', 'client', 'upload', 'submit'])('stops obsolete account/project requests immediately after %s', async stage => {
    const contract = future(), state = new ProviderRequestState<unknown>()
    state.activateProject('fictional-project')
    const { deps } = dependencies(contract)
    deps.assertCurrent = () => state.assertCurrent('fal')
    const original = deps[stage as keyof typeof deps] as (...args: unknown[]) => Promise<unknown>
    Object.assign(deps, { [stage]: async (...args: unknown[]) => { const value = await original(...args); await state.change('fal', async () => undefined); return value } })
    await expect(state.run('fal', () => executeFalNativeGeneration(requestFor(contract, { new_references: sources(1, 'image', true) }), 'video-generator', deps))).rejects.toMatchObject({ name: 'AbortError' })
    if (stage !== 'submit') expect(deps.submit).not.toHaveBeenCalled()
    expect(deps.persist).not.toHaveBeenCalled()
  })

  it('does not fetch a contract for an already cancelled run', async () => {
    const contract = future(), { deps } = dependencies(contract), controller = new AbortController()
    controller.abort()
    await expect(executeFalNativeGeneration(requestFor(contract, {}), 'video-generator', deps, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(deps.contract).not.toHaveBeenCalled()
  })
  it('blocks a contract updated during uploads before paid submission', async () => {
    const contract = future(), changed = future(20), { deps } = dependencies(contract)
    vi.mocked(deps.contract).mockResolvedValueOnce(contract).mockResolvedValueOnce(changed)
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: sources(30, 'image', true) }), 'video-generator', deps)).rejects.toThrow('changed during preparation')
    expect(deps.submit).not.toHaveBeenCalled(); expect(deps.persist).not.toHaveBeenCalled()
  })
  it('retains secondary declared audio while keeping video as the primary flow output', async () => {
    const base = future()
    const contract = bind({ ...base, output: { ...base.output, properties: { ...base.output.properties, audio: base.output.properties!.video } } })
    const { deps } = dependencies(contract, { submit: vi.fn(async () => ({ requestId: 'mixed', data: { video: { url: 'https://files.example/a.mp4', content_type: 'video/mp4' }, audio: { url: 'https://files.example/a.wav', content_type: 'audio/wav' } } })) })
    const result = await executeFalNativeGeneration(requestFor(contract, { new_references: sources(1) }), 'video-generator', deps)
    expect(result.outputs.map(item => item.type)).toEqual(['video', 'audio'])
    expect(result.primaryIndex).toBe(0)
  })
  it('rejects an explicitly unknown file transport before client creation', async () => {
    const base = future()
    const contract = bind({ ...base, output: { ...base.output, properties: { video: { ...base.output.properties!.video, uiField: 'pose-sequence' } } } })
    const { deps } = dependencies(contract)
    await expect(executeFalNativeGeneration(requestFor(contract, { new_references: sources(1) }), 'video-generator', deps)).rejects.toThrow('output transport')
    expect(deps.client).not.toHaveBeenCalled()
  })
  it.each([false, undefined])('rejects typed speech when the owned schema has audio default %s before media/client/upload', async defaultValue => {
    const contract = future(50, defaultValue === undefined ? {} : { generate_audio: { type:'boolean', default:defaultValue } })
    const request = { ...requestFor(contract, {new_references:sources(1,'image',true)}), requiresGeneratedSpeech:true }
    const before = JSON.stringify(request), {deps} = dependencies(contract)
    await expect(executeFalNativeGeneration(request,'video-generator',deps)).rejects.toThrow(/spoken dialogue.*generated audio/i)
    expect(deps.prepareSource).not.toHaveBeenCalled();expect(deps.client).not.toHaveBeenCalled();expect(deps.upload).not.toHaveBeenCalled();expect(deps.submit).not.toHaveBeenCalled();expect(JSON.stringify(request)).toBe(before)
  })
  it('uses the owned audio default and never sends the local speech requirement as a provider field', async () => {
    const contract = future(50, {generate_audio:{type:'boolean',default:true}}), {deps} = dependencies(contract)
    const request = { ...requestFor(contract,{new_references:sources(1)}), requiresGeneratedSpeech:true }, before = JSON.stringify(request)
    await executeFalNativeGeneration(request,'video-generator',deps)
    const wire = vi.mocked(deps.submit).mock.calls[0][2]
    expect(wire.generate_audio).toBe(true);expect(wire).not.toHaveProperty('requiresGeneratedSpeech');expect(JSON.stringify(request)).toBe(before)
  })

})
