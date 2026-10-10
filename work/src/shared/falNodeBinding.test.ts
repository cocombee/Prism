import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { describeFalRuntimeInputs, falRuntimeFingerprintMaterial } from './falRuntimeInputs'
import { editFalNodeValue, falFieldPortId, reconcileFalNodeBinding, type FalNativeNodeState } from './falNodeBinding'
import type { FalSchemaContract } from './falSchemaBinding'
import { nodeInputPorts } from './nodePorts'
import { connectionCompatibilityError } from './nodeConnections'

function contract(properties: FalSchemaContract['input']['properties']) {
  const value: FalSchemaContract = { endpointId: 'fixture/future/reference-to-video', category: 'image-to-video', schemaPath: '/native', input: { type: 'object', properties }, output: { type: 'object' } }
  const runtime = describeFalRuntimeInputs(value)
  return { ...value, runtime: { ...runtime, fingerprint: createHash('sha256').update(falRuntimeFingerprintMaterial(value, runtime)).digest('hex') } }
}
const empty = (): FalNativeNodeState => ({ endpointId: 'fixture/future/reference-to-video', label: 'Future', flow: 'video', values: {}, media: [] })

describe('saved native model bindings', () => {
  it('retains zero, false, null and multiline values across defaults and JSON save/reopen', () => {
    const model = contract({ seed: { type: 'integer', default: 7 }, enabled: { type: 'boolean', default: true }, nullable: { anyOf: [{ type: 'string' }, { type: 'null' }], default: 'fallback' }, prompt: { type: 'string' } })
    const state = { ...empty(), values: { seed: 0, enabled: false, nullable: null, prompt: '  Malay\n\n[spoken] Salam.  ' } }
    const next = reconcileFalNodeBinding(JSON.parse(JSON.stringify(state)), model)
    expect(next.values).toEqual(state.values); expect(next.promptField).toBe('prompt'); expect(next.repairs).toEqual([])
  })
  it('creates a real typed fifty-image port from its declaration and never guesses camera authority', () => {
    const model = contract({ 'new refs".[]😀': { type: 'array', maxItems: 50, items: { type: 'string', uiField: 'image' } }, source_audio: { type: 'string', uiField: 'audio' } })
    const state = reconcileFalNodeBinding(empty(), model), ports = nodeInputPorts({ kind: 'video-generator', falNative: state })
    expect(state.media[0]).toMatchObject({ key: 'new refs".[]😀', type: 'image', role: 'native-input', multiple: true, maximum: 50 })
    expect(state.media[0].portId).toMatch(/^fal-input-[0-9a-f]+$/)
    expect(new Set(['A', 'a', '😀', '\ud800', '', 'quote"'].map(falFieldPortId)).size).toBe(6)
    expect(ports.find(port => port.id === state.media[0].portId)?.signal).toBe('image')
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'audio' }, { kind: 'video-generator', falNative: state }, 'media-out', state.media[0].portId)).toBeTruthy()
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'audio' }, { kind: 'video-generator', falNative: state }, 'media-out', state.media[1].portId)).toBeNull()
  })
  it('keeps removed values and old sockets visible and blocks their reuse', () => {
    const first = contract({ removed: { type: 'string' }, old_images: { type: 'array', items: { type: 'string', uiField: 'image' } } })
    const state = reconcileFalNodeBinding({ ...empty(), values: { removed: 'keep' } }, first)
    const next = reconcileFalNodeBinding(state, contract({ new_images: { type: 'array', items: { type: 'string', uiField: 'image' } } }))
    expect(next.values.removed).toBe('keep')
    expect(next.media.find(field => field.key === 'old_images')?.retired).toBe(true)
    expect(nodeInputPorts({ kind: 'video-generator', falNative: next }).some(port => port.id === state.media[0].portId)).toBe(true)
    expect(connectionCompatibilityError({ kind: 'upload', outputType: 'image' }, { kind: 'video-generator', falNative: next }, 'media-out', state.media[0].portId)).toContain('no longer')
  })
  it('preserves drafts rather than turning empty or invalid input into zero or dropping it', () => {
    let state = editFalNodeValue(empty(), 'seed', '0', 'number')
    expect(state.values.seed).toBe(0)
    state = editFalNodeValue(state, 'seed', '-', 'number')
    expect(state.values.seed).toBe(0); expect(state.drafts?.seed).toBe('-')
    state = editFalNodeValue(state, 'seed', '', 'number')
    expect(state.values).not.toHaveProperty('seed')
    state = editFalNodeValue(state, 'complex', '{', 'json')
    expect(JSON.parse(JSON.stringify(state)).drafts.complex).toBe('{')
  })
  it('does not turn optional unsupported or empty media defaults into authored inputs', () => {
    const next = reconcileFalNodeBinding(empty(), contract({ optional_pose: { type: 'array', uiField: 'pose-sequence', default: [], items: { type: 'object' } }, refs: { type: 'array', default: [], items: { type: 'string', uiField: 'image' } } }))
    expect(next.values).not.toHaveProperty('optional_pose'); expect(next.values).not.toHaveProperty('refs')
  })
})
