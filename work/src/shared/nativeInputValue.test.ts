import { describe, expect, it } from 'vitest'
import { editNativeInputValue } from './nativeInputValue'

describe('provider-neutral field edit ownership', () => {
  it('retains incomplete edits, prior values and unrelated provider/connection state', () => {
    const state = { endpointId: 'fictional', values: { duration: 5 }, media: [{ key: 'source' }] }, before = JSON.stringify(state)
    const draft = editNativeInputValue(state, 'duration', '-', 'number')
    expect(draft).toMatchObject({ values: { duration: 5 }, drafts: { duration: '-' }, media: state.media })
    expect(JSON.stringify(state)).toBe(before)
    expect(editNativeInputValue(draft, 'duration', '1.5', 'number')).toMatchObject({ values: { duration: 1.5 }, drafts: {} })
  })
  it('keeps invalid JSON until explicitly corrected and clears an optional value only on an empty edit', () => {
    const state = { values: { options: ['original'], duration: 5 } }
    const draft = editNativeInputValue(state, 'options', '[', 'json')
    expect(draft.values.options).toEqual(['original']); expect(draft.drafts).toEqual({ options: '[' })
    expect(editNativeInputValue(draft, 'options', '["new"]', 'json').values.options).toEqual(['new'])
    expect(editNativeInputValue(draft, 'options', '', 'json')).toMatchObject({ values: { duration: 5 }, drafts: {} })
  })
  it('preserves authored text whitespace byte-exactly', () => {
    const text = '  Authored.\r\n '
    expect(editNativeInputValue({ values: {} }, 'instruction', text, 'text').values.instruction).toBe(text)
  })
})
