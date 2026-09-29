import { describe, expect, it } from 'vitest'
import {
  filterAndRankSelectorOptions,
  selectorSearchKeyAction,
  type SelectorSearchOption,
} from './selectorSearch'

const options: SelectorSearchOption[] = [
  { value: 'seedance_2/fast', label: 'Seedance 2 Fast', group: 'BytePlus · Video', aliases: ['quick motion'] },
  { value: 'seedance-2-standard', label: 'Seedance 2 Standard', group: 'fal.ai · Video' },
  { value: 'cafe-model', label: 'Café Portrait', group: 'Image' },
  { value: 'disabled-model', label: 'Portrait Disabled', group: 'Image', disabled: true },
]

describe('shared selector type-to-search', () => {
  it('normalizes case, whitespace, punctuation boundaries, and optional diacritics with query-word AND', () => {
    expect(filterAndRankSelectorOptions(options, '  SEEDANCE__FAST ').map((item) => item.value)).toEqual(['seedance_2/fast'])
    expect(filterAndRankSelectorOptions(options, 'cafe portrait').map((item) => item.value)).toEqual(['cafe-model'])
    expect(filterAndRankSelectorOptions(options, 'video seedance').map((item) => item.value)).toEqual(['seedance_2/fast', 'seedance-2-standard'])
    expect(filterAndRankSelectorOptions(options, 'image')).toEqual([])
  })

  it('ranks exact label, phrase prefix, ordered word-prefix, ordered contains, group/alias, then value with stable authored ties', () => {
    const ranked: SelectorSearchOption[] = [
      { value: 'v0', label: 'Alpha Beta' },
      { value: 'v1', label: 'Alpha Beta Plus' },
      { value: 'v2', label: 'Alpha Bright Beta' },
      { value: 'v3', label: 'X Alpha Y Beta' },
      { value: 'v4', label: 'Other', aliases: ['Alpha Beta'] },
      { value: 'alpha-beta', label: 'Underlying Only' },
    ]
    expect(filterAndRankSelectorOptions(ranked, 'alpha beta').map((item) => item.value)).toEqual(['v0', 'v1', 'v2', 'v3', 'v4', 'alpha-beta'])
  })

  it('keeps matching disabled options visible and returns zero, one, and many deterministically', () => {
    expect(filterAndRankSelectorOptions(options, 'missing')).toEqual([])
    expect(filterAndRankSelectorOptions(options, 'disabled')).toEqual([options[3]])
    expect(filterAndRankSelectorOptions(options, 'portrait')).toEqual([options[3], options[2]])
  })

  it('activates only on printable non-modifier non-whitespace characters and preserves established Space before search', () => {
    expect(selectorSearchKeyAction({ key: 'S' })).toEqual({ activate: true, firstCharacter: 'S' })
    for (const input of [{ key: ' ' }, { key: 'Tab' }, { key: 'x', metaKey: true }, { key: 'x', ctrlKey: true }, { key: 'x', altKey: true }]) {
      expect(selectorSearchKeyAction(input)).toEqual({ activate: false, firstCharacter: '' })
    }
  })
})
