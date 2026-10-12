import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import type { GenerationRequest, StudioNode } from './types'
import type { FalSchemaContract, FalJson } from './falSchemaBinding'
import { describeFalRuntimeInputs, falRuntimeFingerprintMaterial } from './falRuntimeInputs'
import { reconcileFalNodeBinding } from './falNodeBinding'
import { authoredTimelineSeconds, assertFalTimelineTiming, inferFalVideoTiming, legacyVideoDurationPlan, videoTimingReadinessFailures } from './videoTiming'
import { planFalNativeExecution, type FalNativeRequest } from './falNativeExecution'
import { executeFalNativeGeneration } from '../main/falNativeGeneration'
import { compileBytePlusGenerationRequest } from '../main/byteplusGeneration'
import { buildGenerationRequest } from './workflowResolver'
import { assertGenerationRequirements } from './generationReadiness'
const request = (duration = 14): GenerationRequest => ({ nodeId: 'fixture', kind: 'video-generator', prompt: 'Keep both authored shots.', videoEngine: 'bytedance/seedance-2.5/text-to-video', duration, storyboardShots: [{ panelId: 'a', prompt: 'A courier approaches.', duration: 7, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut' }, { panelId: 'b', prompt: 'The courier stops.', duration: 7, shotSize: 'medium', camera: 'static' }] })
function contract(properties: FalSchemaContract['input']['properties'], id = 'fixture/future-3/text-to-video') {
  const raw: FalSchemaContract = { endpointId: id, schemaPath: '/fixture', category: 'text-to-video', input: { type: 'object', properties: { prompt: { type: 'string' }, ...properties } }, output: { type: 'object', properties: { video: { type: 'object', properties: { url: { type: 'string' }, content_type: { type: 'string' } } } } } }
  const runtime = describeFalRuntimeInputs(raw); return { ...raw, runtime: { ...runtime, fingerprint: createHash('sha256').update(falRuntimeFingerprintMaterial(raw, runtime)).digest('hex') } }
}
const secondsContract = (key = 'clip_length') => contract({ [key]: { type: 'number', title: 'Duration', description: 'Duration of the generated video in seconds.', minimum: 1, maximum: 50 } })
const boundRequest = (model: ReturnType<typeof contract>, values: Record<string, FalJson>, timelineSeconds = 14): FalNativeRequest => ({ endpointId: model.endpointId, flow: 'video' as const, fingerprint: model.runtime.fingerprint, promptField: 'prompt', timelineSeconds, values: { prompt: 'Exact authored master.', ...values }, media: {} })
describe('provider timing and authored timeline fidelity', () => {
  it('recognizes explicitly declared output seconds on an owned video route, retaining strict timeline and null checks', () => {
    const model = contract({ duration: { anyOf: [{ type: 'integer', minimum: 2, maximum: 30 }, { type: 'null' }], description: 'Output duration in seconds. Set to null for smart duration.', default: 5, minimum: 2, maximum: 30 } }, 'alibaba/wan-3.0/reference-to-video')
    expect(model.runtime.timing).toEqual({ kind: 'seconds', field: 'duration', source: 'provider-declaration' })
    expect(planFalNativeExecution(model, boundRequest(model, { duration: 5 }, 5), 'video-generator').preflightInput.duration).toBe(5)
    expect(() => planFalNativeExecution(model, boundRequest(model, { duration: 5 }, 4), 'video-generator')).toThrow(/must match/)
    expect(() => planFalNativeExecution(model, boundRequest(model, { duration: null }, 5), 'video-generator')).toThrow(/fixed native duration/)
  })
  it('does not infer generic output seconds without video ownership or for an audio-only field', () => {
    const model = contract({ duration: { type: 'integer', description: 'Output duration in seconds.', default: 5 } })
    expect(inferFalVideoTiming(model.runtime.fields)).toBeUndefined()
    expect(describeFalRuntimeInputs({ ...model, category: 'text-to-audio' }).timing).toBeUndefined()
    expect(contract({ duration: { type: 'integer', description: 'Output duration of audio in seconds.' } }).runtime.timing).toBeUndefined()
    expect(contract({ duration: { type: 'integer', description: 'Output duration in milliseconds.' } }).runtime.timing).toBeUndefined()
  })

  it('rejects generated beats below1s while preserving authored bytes and valid half-second timing',()=>{
    const below={...request(5),storyboardShots:[{prompt:'First.',duration:0.5,shotSize:'medium',camera:'static'},{prompt:'Second.',duration:4.5,shotSize:'medium',camera:'static'}]}
    const before=JSON.stringify(below);expect(()=>authoredTimelineSeconds(below)).toThrow('at least 1.0s');expect(JSON.stringify(below)).toBe(before)
    expect(authoredTimelineSeconds({...request(5),storyboardShots:[{prompt:'First.',duration:1.5,shotSize:'medium',camera:'static'},{prompt:'Second.',duration:3.5,shotSize:'medium',camera:'static'}]})).toBe(5)
  })
  it('rejects direct Seedance two7s/selected5s and under-total budgets without rewriting authored values', () => {
    for (const duration of [5, 15]) { const input = request(duration), before = JSON.stringify(input); expect(() => assertGenerationRequirements(input)).toThrow(/must match.*14s/); expect(JSON.stringify(input)).toBe(before) }
    expect(videoTimingReadinessFailures(request(14))).toEqual([]); expect(legacyVideoDurationPlan(request(14))).toEqual({ seconds: 14, wire: '14' })
  })
  it('blocks unsupported static duration and preserves explicit zero/fractional/overload instead of substituting a default', () => {
    for (const value of [0, 3.5, 31, NaN]) expect(() => legacyVideoDurationPlan({ ...request(value), storyboardShots: undefined })).toThrow(/unsupported/)
    expect(legacyVideoDurationPlan({ ...request(), duration: undefined, storyboardShots: undefined })).toEqual({ seconds: 5, wire: '5' })
    expect(()=>legacyVideoDurationPlan({...request(5),videoEngine:'wan-controlled',autoDuration:true})).toThrow('does not support automatic')
    expect(videoTimingReadinessFailures({ ...request(14), autoDuration: true })).toEqual(expect.arrayContaining([expect.stringContaining('auto must match')]))
  })
  it('uses exact Wan frame arithmetic and rejects saturation/rounding while keeping native FPS distinct from motion cadence', () => {
    expect(legacyVideoDurationPlan({ ...request(5), videoEngine: 'wan-controlled', frameRate: 24, motionCadence: 16 })).toMatchObject({ seconds: 5, numFrames: 120, framesPerSecond: 24 })
    for (const [duration, fps] of [[14, 24], [1.1, 24], [5, 24.5], [0, 24]]) expect(() => legacyVideoDurationPlan({ ...request(duration), videoEngine: 'wan-controlled', frameRate: fps })).toThrow(/not rounded or clamped/)
    expect(legacyVideoDurationPlan({ ...request(5), videoEngine: 'wan-controlled', frameRate: 18 })).toMatchObject({ numFrames: 90, framesPerSecond: 18 })
  })
  it('handles new declared seconds field names and preserves the provider wire value', () => {
    const model = secondsContract(), native = boundRequest(model, { clip_length: 14 }), before = JSON.stringify(native)
    expect(model.runtime.timing).toEqual({ kind: 'seconds', field: 'clip_length', source: 'provider-declaration' }); expect(planFalNativeExecution(model, native, 'video-generator').preflightInput.clip_length).toBe(14); expect(JSON.stringify(native)).toBe(before)
    expect(() => planFalNativeExecution(model, { ...native, values: { ...native.values, clip_length: 5 } }, 'video-generator')).toThrow(/must match.*14s/)
  })
  it('does not guess ambiguous/changed time units or turn automatic timing into a fixed promise', () => {
    const milliseconds = contract({ duration: { type: 'number', title: 'Duration', description: 'Duration of generated video in milliseconds.' } }), ambiguous = contract({ duration: { type: 'number', title: 'Duration', description: 'Duration of video in seconds.' }, length: { type: 'number', title: 'Length', description: 'Length of video in seconds.' } })
    expect(milliseconds.runtime.timing).toBeUndefined(); expect(ambiguous.runtime.timing).toBeUndefined()
    for (const model of [milliseconds, ambiguous]) expect(() => planFalNativeExecution(model, boundRequest(model, { duration: 14000 }), 'video-generator')).toThrow(/no unambiguous/)
    expect(() => assertFalTimelineTiming({ kind: 'seconds', field: 'duration', source: 'provider-declaration' }, 14, { duration: 'auto' })).toThrow(/fixed native duration/)
    expect(() => assertFalTimelineTiming({ kind: 'seconds', field: 'duration', source: 'provider-declaration' }, 8, { duration: '8s' })).not.toThrow()
  })
  it('retains an explicitly declared seconds suffix without guessing milliseconds or rewriting wire strings', () => {
    const model = contract({ duration: { type: 'string', title: 'Duration', description: 'The duration of the generated video.', default: '8s' } })
    expect(model.runtime.timing).toMatchObject({ kind: 'seconds', field: 'duration', suffix: 's' })
    const valid = boundRequest(model, { duration: '8s' }, 8); expect(() => planFalNativeExecution(model, valid, 'video-generator')).not.toThrow(); expect(valid.values.duration).toBe('8s')
    expect(() => planFalNativeExecution(model, boundRequest(model, { duration: '8' }, 8), 'video-generator')).toThrow(/fixed native duration/)
  })
  it('binds documented frame-count/fps fields and checks exact authored seconds', () => {
    const model = contract({ picture_count: { type: 'integer', title: 'Frame count', description: 'Number of video frames to generate.' }, native_rate: { type: 'integer', title: 'FPS', description: 'Frames per second of the generated video.' } })
    expect(model.runtime.timing).toMatchObject({ kind: 'frames', framesField: 'picture_count', fpsField: 'native_rate' }); expect(() => planFalNativeExecution(model, boundRequest(model, { picture_count: 120, native_rate: 24 }, 5), 'video-generator')).not.toThrow(); expect(() => planFalNativeExecution(model, boundRequest(model, { picture_count: 161, native_rate: 24 }, 14), 'video-generator')).toThrow(/must match.*14s/)
  })
  it('accepts declared string frame/rate inputs for timing comparison while retaining their exact native types', () => {
    const model = contract({ picture_count: { type: 'string', description: 'Number of video frames to generate.' }, native_rate: { type: 'string', description: 'Frames per second of the generated video.' } })
    const input = boundRequest(model, { picture_count: '120', native_rate: '24' }, 5), plan = planFalNativeExecution(model, input, 'video-generator')
    expect(plan.preflightInput).toMatchObject({ picture_count:'120', native_rate:'24' }); expect(input.values).toMatchObject({ picture_count:'120', native_rate:'24' })
  })
  it('rejects native mismatches before media preparation, credential/client/upload and submit', async () => {
    const model = secondsContract(), dependencies = { contract: vi.fn(async () => model), assertCurrent: vi.fn(), prepareSource: vi.fn(), client: vi.fn(), upload: vi.fn(), submit: vi.fn(), persist: vi.fn() }
    await expect(executeFalNativeGeneration(boundRequest(model, { clip_length: 5 }), 'video-generator', dependencies)).rejects.toThrow(/must match/)
    for (const fn of [dependencies.prepareSource, dependencies.client, dependencies.upload, dependencies.submit, dependencies.persist]) expect(fn).not.toHaveBeenCalled()
  })
  it('refreshes a changed timing field with exact saved values retained for review', () => {
    const old = secondsContract('duration'), next = secondsContract('clip_length'), state = reconcileFalNodeBinding({ endpointId: old.endpointId, label: 'Future', flow: 'video', values: { duration: 14 }, media: [] }, old), refreshed = reconcileFalNodeBinding(state, next)
    expect(refreshed.values.duration).toBe(14); expect(refreshed.timing).toMatchObject({ field: 'clip_length' }); expect(refreshed.repairs).toEqual(expect.arrayContaining([expect.stringContaining('timing field or unit changed')])); expect(refreshed.fingerprint).not.toBe(state.fingerprint)
    expect(JSON.parse(JSON.stringify(refreshed))).toMatchObject({ values: { duration: 14 }, timing: { field: 'clip_length' } })
  })
  it('consumes the same declared timing binding through the actual Storyboard graph, without replacing native fields', () => {
    const model = secondsContract(), generation: StudioNode = { id: 'target', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'video-generator', title: 'Video', promptMode: 'auto', falNative: reconcileFalNodeBinding({ endpointId: model.endpointId, label: 'Future', flow: 'video', values: { clip_length: 14 }, media: [] }, model) } }, story: StudioNode = { id: 'story', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'storyboard', title: 'Storyboard', storyboardDuration: 14, storyboardPanels: [{ id: 'a', prompt: 'Approach.', duration: 7 }, { id: 'b', prompt: 'Stop.', duration: 7 }] } }, edges = [{ id: 's', source: 'story', sourceHandle: 'storyboard-out', target: 'target', targetHandle: 'storyboard-in' }]
    const output = buildGenerationRequest(generation, [story, generation], edges); expect(output.falNative).toMatchObject({ timelineSeconds: 14, values: { clip_length: 14 } }); generation.data.falNative!.values.clip_length = 15
    expect(() => buildGenerationRequest(generation, [story, generation], edges)).toThrow(/must match/); expect(generation.data.falNative!.values.clip_length).toBe(15)
  })
  it('validates BytePlus before resolving/uploading references and never substitutes unsupported duration', async () => {
    const resolve = vi.fn(async () => 'https://files.example/source.png'), input = { ...request(5), videoEngine: 'byteplus/seedance-2.5/text-to-video' }
    await expect(compileBytePlusGenerationRequest(input, resolve)).rejects.toThrow(/must match/); expect(resolve).not.toHaveBeenCalled()
    await expect(compileBytePlusGenerationRequest({ ...input, duration: 31 }, resolve)).rejects.toThrow(/unsupported/)
    const compiled = await compileBytePlusGenerationRequest({ ...input, duration: 14 }, resolve); expect(compiled.duration).toBe(14)
  })
  it('does not infer typed timing from a Manual master or an audio duration', () => {
    expect(authoredTimelineSeconds({ kind: 'video-generator' })).toBeUndefined(); expect(authoredTimelineSeconds({ kind: 'sound-effects', multiPrompt: [{ prompt: 'Sound.', duration: '5' }] })).toBeUndefined()
    expect(inferFalVideoTiming([])).toBeUndefined()
  })
})
