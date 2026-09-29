import { describe, expect, it } from 'vitest'
import { ELEVEN_AUDIO_OUTPUT_FORMATS, ELEVEN_TEXT_NORMALIZATION_OPTIONS } from './providerOptions'

describe('provider option completeness', () => {
  it('keeps the complete Eleven v3 fal output-format enum', () => {
    expect(ELEVEN_AUDIO_OUTPUT_FORMATS).toHaveLength(19)
    expect(new Set(ELEVEN_AUDIO_OUTPUT_FORMATS).size).toBe(19)
    expect(ELEVEN_AUDIO_OUTPUT_FORMATS).toContain('mp3_22050_32')
    expect(ELEVEN_AUDIO_OUTPUT_FORMATS).toContain('pcm_48000')
    expect(ELEVEN_AUDIO_OUTPUT_FORMATS).toContain('opus_48000_192')
  })

  it('keeps every text-normalization enum value', () => {
    expect(ELEVEN_TEXT_NORMALIZATION_OPTIONS.map(({ value }) => value)).toEqual(['auto', 'on', 'off'])
  })
})
