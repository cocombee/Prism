import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compileFalSchemaContract } from './falSchemaBinding'
import { projectFalNativeVideoFooterControls, projectNativeVideoFooterFields } from './nativeVideoFooterControls'
import { describeFalRuntimeInputs } from './falRuntimeInputs'

const fixture = JSON.parse(readFileSync(new URL('falSchemaMedia.fixtures.json', import.meta.url), 'utf8')) as {
  models: Array<{ endpoint_id: string; openapi: unknown }>
}
const seedanceReference = fixture.models.find(model => model.endpoint_id === 'bytedance/seedance-2.5/reference-to-video')!
const contract = compileFalSchemaContract(seedanceReference.endpoint_id, seedanceReference.openapi)

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(child => deepFreeze(child))
  }
  return value
}

describe('native video footer schema projection', () => {
  it('does not treat boolean fields named FPS or Duration as cinematic scalar controls', () => {
    const fields = describeFalRuntimeInputs({ ...contract, input: { type: 'object', properties: { fps: { type: 'boolean', default: true }, duration: { enum: [false, true] } } } }).fields
    expect(projectNativeVideoFooterFields(fields, { values: { fps: true, duration: false } })).toEqual([])
  })
  it('projects Seedance 2.5 declared controls and exact choices without fabricating FPS or quantity', () => {
    const controls = projectFalNativeVideoFooterControls(contract, { values: {} })
    expect(controls.map(control => control.key)).toEqual(['aspect_ratio', 'duration', 'resolution', 'generate_audio'])
    expect(controls.map(control => control.label)).toEqual(['Aspect Ratio', 'Duration', 'Resolution', 'Sound'])

    const ratio = controls.find(control => control.key === 'aspect_ratio')!
    const duration = controls.find(control => control.key === 'duration')!
    const resolution = controls.find(control => control.key === 'resolution')!
    const audio = controls.find(control => control.key === 'generate_audio')!
    expect(ratio.options.filter(option => option.kind === 'value').map(option => option.value)).toEqual(contract.input.properties?.aspect_ratio.enum)
    expect(duration.defaultValue).toBe(contract.input.properties?.duration.default)
    expect(duration.options.filter(option => option.kind === 'value').map(option => [option.value, option.label])).toEqual(
      contract.input.properties?.duration.enum?.map(value => [value, value === 'auto' ? 'Auto' : `${value}s`]),
    )
    expect(resolution.options.filter(option => option.kind === 'value').map(option => option.value)).toEqual(contract.input.properties?.resolution.enum)
    expect(audio).toMatchObject({ control: 'boolean', hasDefault: true, defaultValue: contract.input.properties?.generate_audio.default })
    expect(audio.options.filter(option => option.kind === 'value').map(option => [option.value, option.label])).toEqual([[false, 'Off'], [true, 'On']])
    expect(controls.some(control => ['fps', 'quantity', 'num_outputs'].includes(control.key))).toBe(false)
  })

  it('keeps an absent value distinct from its schema default and does not materialize it', () => {
    const state = { values: {} }
    const before = structuredClone(state)
    const controls = projectFalNativeVideoFooterControls(contract, state)
    const duration = controls.find(control => control.key === 'duration')!
    expect(duration).toMatchObject({ hasValue: false, hasDefault: true, defaultValue: 'auto', selectedToken: '@default' })
    expect(duration.options[0]).toMatchObject({ kind: 'default', token: '@default', label: 'Default (Auto)' })
    expect(state).toEqual(before)
  })

  it('preserves authored values and drafts, marking an out-of-schema choice instead of clamping it', () => {
    const state = {
      values: { duration: '31', aspect_ratio: '16:9', resolution: '1080p', generate_audio: false, fps: 60, legacy: { keep: true } },
      drafts: { duration: '3.', removed_field: 'draft stays' },
    }
    const before = structuredClone(state)
    const controls = projectFalNativeVideoFooterControls(contract, state)
    const duration = controls.find(control => control.key === 'duration')!
    expect(duration).toMatchObject({ hasValue: true, value: '31', hasDraft: true, draft: '3.' })
    expect(duration.options.at(-1)).toMatchObject({ kind: 'unavailable', value: '31', disabled: true, label: 'Unavailable (31s)' })
    expect(duration.selectedToken).toBe('unavailable:"31"')
    expect(controls.find(control => control.key === 'generate_audio')?.selectedToken).toBe('value:false')
    expect(controls.some(control => control.key === 'fps')).toBe(false)
    expect(state).toEqual(before)
  })

  it('omits absent and non-scalar schema fields and returns a detached schema snapshot', () => {
    const current = structuredClone(contract)
    delete current.input.properties?.aspect_ratio
    delete current.input.properties?.duration
    current.input.properties!.resolution = { type: 'object', properties: { width: { type: 'integer' } } }
    const controls = projectFalNativeVideoFooterControls(current, { values: { resolution: { width: 1280 } } })
    expect(controls.map(control => control.key)).toEqual(['generate_audio'])

    const unchanged = structuredClone(contract)
    const projected = projectFalNativeVideoFooterControls(unchanged, { values: { resolution: '720p' } })
    projected.find(control => control.key === 'resolution')!.schema.enum?.push('fake')
    expect(unchanged.input.properties?.resolution.enum).not.toContain('fake')
  })

  it('shares the same exact field projection for another provider runtime without adding undeclared sound choices', () => {
    const runtime = describeFalRuntimeInputs(contract)
    const withSound = [...runtime.fields, {
      key: 'sound', label: 'Sound mode', schema: { type: 'string' as const, enum: ['on', 'off'] },
      required: false, nullable: false, control: 'choice' as const, placement: 'primary' as const, choices: ['on', 'off'],
    }]
    const controls = projectNativeVideoFooterFields(withSound, { values: { sound: 'on' } })
    expect(controls.find(control => control.key === 'sound')).toMatchObject({
      label: 'Sound', value: 'on', selectedToken: 'value:"on"',
      options: expect.arrayContaining([{ token: 'value:"on"', kind: 'value', value: 'on', label: 'On' }]),
    })

    const unsupportedSound = withSound.map(field => field.key === 'sound' ? { ...field, choices: ['on', 'off', 'auto'] } : field)
    expect(projectNativeVideoFooterFields(unsupportedSound, { values: { sound: 'auto' } }).some(control => control.key === 'sound')).toBe(false)
  })

  it('turns only finite, bounded numeric schema ranges into exact selector values', () => {
    const rangedContract = {
      endpointId: 'fixture/native-video', schemaPath: '/fixture/native-video', category: 'video-to-video',
      input: { type: 'object' as const, properties: {
        duration: { type: 'integer' as const, minimum: 3, maximum: 10, default: 8 },
        fps: { type: 'number' as const, minimum: 24, maximum: 30, multipleOf: 3 },
        resolution: { type: 'integer' as const, minimum: 0, maximum: 256 },
        aspect_ratio: { type: 'number' as const, minimum: 0, maximum: 1 },
      } },
      output: { type: 'object' as const },
    }
    const controls = projectNativeVideoFooterFields(describeFalRuntimeInputs(rangedContract).fields, {
      values: { duration: 8, fps: 27, resolution: 120, aspect_ratio: 0.5 },
    })
    const duration = controls.find(control => control.key === 'duration')!
    const fps = controls.find(control => control.key === 'fps')!
    expect(duration.control).toBe('choice')
    expect(duration.options.filter(option => option.kind === 'value').map(option => [option.value, option.label])).toEqual([
      [3, '3s'], [4, '4s'], [5, '5s'], [6, '6s'], [7, '7s'], [8, '8s'], [9, '9s'], [10, '10s'],
    ])
    expect(duration.selectedToken).toBe('value:8')
    expect(duration.defaultValue).toBe(8)
    expect(fps.options.filter(option => option.kind === 'value').map(option => [option.value, option.label])).toEqual([
      [24, '24 fps'], [27, '27 fps'], [30, '30 fps'],
    ])
    expect(controls.some(control => control.key === 'resolution' || control.key === 'aspect_ratio')).toBe(false)
  })

  it('respects exclusive bounds and omits ranges with no exact step or over 256 choices', () => {
    const fields = [
      { key: 'duration', label: 'duration', schema: { type: 'integer' as const, minimum: 0, exclusiveMinimum: true, maximum: 4, exclusiveMaximum: true }, required: false, nullable: false, control: 'number' as const, placement: 'primary' as const },
      { key: 'fps', label: 'fps', schema: { type: 'number' as const, minimum: 0, maximum: 1 }, required: false, nullable: false, control: 'number' as const, placement: 'primary' as const },
      { key: 'resolution', label: 'resolution', schema: { type: 'integer' as const, minimum: 0, maximum: 256 }, required: false, nullable: false, control: 'number' as const, placement: 'primary' as const },
    ]
    const controls = projectNativeVideoFooterFields(fields, { values: { duration: 2, fps: 0.5, resolution: 100 } })
    expect(controls.find(control => control.key === 'duration')?.options.filter(option => option.kind === 'value').map(option => option.value)).toEqual([1, 2, 3])
    expect(controls.some(control => control.key === 'fps')).toBe(false)
    expect(controls.some(control => control.key === 'resolution')).toBe(false)
  })

  it('is safe to call with an immutable current contract and state', () => {
    const immutableContract = deepFreeze(structuredClone(contract))
    const immutableState = deepFreeze({ values: { duration: '8', generate_audio: true }, drafts: { duration: '8' } })
    expect(projectFalNativeVideoFooterControls(immutableContract, immutableState).map(control => control.key)).toEqual([
      'aspect_ratio', 'duration', 'resolution', 'generate_audio',
    ])
  })

  it('keeps Wan nullable integer duration in the footer with exact seconds and separate Auto/default states', () => {
    const nullableContract = {
      ...contract,
      input: { type: 'object' as const, properties: {
        duration: { default: 5, anyOf: [{ type: 'integer' as const, minimum: 2, maximum: 30 }, { type: 'null' as const }] },
      } },
    }
    const absent = projectFalNativeVideoFooterControls(nullableContract, { values: {} })[0]
    expect(absent).toMatchObject({ key: 'duration', control: 'choice', nullable: true, hasValue: false, defaultValue: 5, selectedToken: '@default' })
    expect(absent.options.filter(option => option.kind === 'value').map(option => option.value)).toEqual([null, ...Array.from({ length: 29 }, (_, index) => index + 2)])
    expect(absent.options.find(option => option.value === null)).toMatchObject({ token: 'value:null', label: 'Auto' })
    expect(absent.options.find(option => option.value === 30)?.label).toBe('30s')
    const explicit = projectFalNativeVideoFooterControls(nullableContract, { values: { duration: 12 } })[0]
    expect(explicit).toMatchObject({ value: 12, selectedToken: 'value:12' })
    const auto = projectFalNativeVideoFooterControls(nullableContract, { values: { duration: null } })[0]
    expect(auto).toMatchObject({ value: null, selectedToken: 'value:null' })
    expect(projectFalNativeVideoFooterControls(nullableContract, { values: { duration: 31 } })[0].options.at(-1)).toMatchObject({ kind: 'unavailable', value: 31, disabled: true })
  })

  it('does not flatten ambiguous numeric alternatives into invented footer choices', () => {
    const ambiguous = { ...contract, input: { type: 'object' as const, properties: {
      duration: { anyOf: [{ type: 'integer' as const, minimum: 2, maximum: 5 }, { type: 'integer' as const, minimum: 10, maximum: 30 }, { type: 'null' as const }] },
    } } }
    expect(projectFalNativeVideoFooterControls(ambiguous, { values: { duration: 12 } })).toEqual([])
  })
})
