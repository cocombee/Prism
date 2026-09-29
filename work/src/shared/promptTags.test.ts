import { describe, expect, it } from 'vitest'
import { completePromptTag, promptTagQueryAtCaret, promptTagRanges, promptTagSuggestions, promptTagTokens, sourcePromptTags, uniquePromptTags } from './promptTags'

describe('connected prompt tags', () => {
  it('filters canonical Canvas tags and completes the active query', () => {
    const text = 'Yusuf enters @yu'
    expect(promptTagQueryAtCaret(text, text.length)).toEqual({ start: 13, end: 16, query: '@yu' })
    expect(promptTagSuggestions(text, text.length, ['@yusuf-anaqi', '@market', '@yusuf-anaqi'])).toEqual(['@yusuf-anaqi'])
    expect(completePromptTag(text, text.length, '@yusuf-anaqi')).toEqual({ text: 'Yusuf enters @yusuf-anaqi ', caret: 26 })
  })

  it('extracts exact unique authored tags for connection changes', () => {
    expect(promptTagTokens('Use @bursa with @Haji-Asri, then @bursa again.')).toEqual(['@bursa', '@Haji-Asri'])
  })

  it('keeps canonical, title, and reusable-metadata identities active for connected legacy assets', () => {
    expect(sourcePromptTags({
      title: 'Haji Mohd Asri',
      referenceTag: '@haji-asri',
      referenceAssets: [{ metadata: { assetName: 'Dato Haji Mohd Asri' } } as never],
    })).toEqual(['@haji-asri', '@haji-mohd-asri', '@dato-haji-mohd-asri'])
  })

  it('keeps exact manually authored tags active only while their semantic authority is wired', () => {
    const text = '@yusuf-anaqi crosses @night-market while @invented-token remains editable.'
    expect(promptTagRanges(text, [])).toEqual([
      { start: 0, end: 12, text: '@yusuf-anaqi', active: false },
      { start: 21, end: 34, text: '@night-market', active: false },
      { start: 41, end: 56, text: '@invented-token', active: false },
    ])
    expect(promptTagRanges(text, ['@YUSUF-ANAQI']).map((range) => range.active)).toEqual([true, false, false])
    expect(promptTagRanges(text, ['@night-market']).map((range) => range.active)).toEqual([false, true, false])
    expect(promptTagRanges(text, []).map((range) => range.text)).toEqual(['@yusuf-anaqi', '@night-market', '@invented-token'])
  })

  it('exposes only the selected generated result tag so old result text becomes inactive', () => {
    const data = {
      kind: 'image-generator' as const,
      title: 'Image Generator',
      referenceAssets: [],
      generatedResults: [
        { path: '/project/first.jpg', url: 'file:///first', type: 'image' as const, modelId: 'model', name: 'First Portrait' },
        { path: '/project/second.jpg', url: 'file:///second', type: 'image' as const, modelId: 'model', name: 'Second Portrait' },
      ],
      activeResultIndex: 1,
    }
    expect(sourcePromptTags(data)).toEqual(['@second-portrait'])
    expect(promptTagRanges('@first-portrait @second-portrait', sourcePromptTags(data)).map((range) => range.active)).toEqual([false, true])
  })

  it('supports Unicode asset names and removes invalid or duplicate suggestions', () => {
    expect(uniquePromptTags(['yūsuf-anaqi', '@夜市', '@夜市', '@'])).toEqual(['@yūsuf-anaqi', '@夜市'])
  })
})
