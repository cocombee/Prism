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
    ['higgsfield-native::minimax/h3/text-to-video', 'MiniMax H3', 'minimax'],
    ['fal-native::fal-ai/minimax/video-01', 'MiniMax Video 01', 'minimax'],
    ['higgsfield-native::minimax/hailuo-2.3/standard/image-to-video', 'Hailuo 2.3', 'hailuo'],
    ['fal-native::fal-ai/ltx-2.3/image-to-video', 'LTX 2.3', 'lightricks'],
    ['higgsfield-native::ltx-2.5/pro/text-to-video', 'LTX 2.5', 'lightricks'],
    ['fal-native::fal-ai/pixverse/v6/text-to-video', 'PixVerse V6', 'pixverse'],
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
