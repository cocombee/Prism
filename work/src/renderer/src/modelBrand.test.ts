import { describe, expect, it } from 'vitest'
import { modelCompanyFor, VIDEO_MODEL_MENU_GROUPS } from './NodeCardNext'

describe('modelCompanyFor', () => {
  it.each([
    ['fal::fal-ai/flux/schnell', 'FLUX Schnell', 'black-forest-labs'],
    ['fal::fal-ai/nano-banana-pro/edit', 'Nano Banana Pro', 'google'],
    ['openai::gpt-image-2', 'GPT Image 2', 'openai'],
    ['anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'anthropic'],
    ['meta-llama/llama-3.2-3b-instruct', 'Llama 3.2 3B', 'meta'],
    ['bytedance/seedance-2.0/text-to-video', 'Seedance 2', 'bytedance'],
    ['byteplus/seedance-2.5/text', 'BytePlus Seedance 2.5', 'bytedance'],
    ['fal::bytedance/seedream/v5/pro/edit', 'Seedream 5.0 Pro', 'bytedance'],
    ['fal::openai/gpt-image-2/edit', 'GPT Image 2', 'openai'],
    ['fal-ai/kling-video/v3/pro/text-to-video', 'Kling V3 Pro', 'kuaishou'],
    ['wan-controlled', 'Wan 2.2', 'alibaba'],
    ['elevenlabs', 'ElevenLabs Eleven v3', 'elevenlabs'],
    ['fish-audio', 'Fish Audio S2 Pro', 'fish'],
  ])('maps %s to the actual model maker', (value, label, expected) => {
    expect(modelCompanyFor(value, label)).toBe(expected)
  })

  it('keeps direct BytePlus Seedance sections distinct from fal.ai', () => {
    expect(VIDEO_MODEL_MENU_GROUPS.filter((group) => group.label.startsWith('BytePlus')).map((group) => group.label)).toEqual([
      'BytePlus · Seedance 2.5',
      'BytePlus · Seedance 2',
    ])
  })
})
