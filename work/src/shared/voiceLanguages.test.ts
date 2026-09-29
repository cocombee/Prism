import { describe, expect, it } from 'vitest'
import { ELEVEN_V3_LANGUAGES, normalizedElevenV3LanguageCode } from './voiceLanguages'

describe('Eleven v3 language catalog', () => {
  it('contains all 74 advertised languages exactly once in alphabetical display order', () => {
    expect(ELEVEN_V3_LANGUAGES).toHaveLength(74)
    expect(new Set(ELEVEN_V3_LANGUAGES.map((language) => language.value)).size).toBe(74)
    expect(new Set(ELEVEN_V3_LANGUAGES.map((language) => language.label)).size).toBe(74)
    expect(ELEVEN_V3_LANGUAGES.map((language) => language.label)).toEqual(
      [...ELEVEN_V3_LANGUAGES].map((language) => language.label).sort((a, b) => a.localeCompare(b)),
    )
  })

  it('migrates the five legacy selector codes without changing current model codes', () => {
    expect(['en', 'ms', 'id', 'zh', 'ja'].map(normalizedElevenV3LanguageCode)).toEqual(['eng', 'msa', 'ind', 'cmn', 'jpn'])
    expect(normalizedElevenV3LanguageCode('fra')).toBe('fra')
    expect(normalizedElevenV3LanguageCode()).toBe('')
    expect(ELEVEN_V3_LANGUAGES.find((language) => language.value === 'eng')?.label).toBe('English')
  })
})
