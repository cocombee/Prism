import { describe, expect, it } from 'vitest'
import { modelDisplayName } from './modelNames'

describe('model display names', () => {
  it('title-cases provider IDs without changing their technical meaning', () => {
    expect(modelDisplayName('gpt-image-1')).toBe('GPT Image 1')
    expect(modelDisplayName('gpt-image-1-mini')).toBe('GPT Image 1 Mini')
    expect(modelDisplayName('gpt-image-1.5')).toBe('GPT Image 1.5')
    expect(modelDisplayName('gpt-image-2-2026-04-21')).toBe('GPT Image 2 · 2026-04-21')
    expect(modelDisplayName('kling-v3-4k')).toBe('Kling V3 4K')
  })

  it('normalizes supplied labels while leaving IDs available to callers', () => {
    expect(modelDisplayName('unchanged-id', 'wan 2.2 controlled fps')).toBe('Wan 2.2 Controlled FPS')
  })
})
