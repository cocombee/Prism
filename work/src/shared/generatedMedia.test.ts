import { describe, expect, it } from 'vitest'
import { activeGeneratedResult, activeMediaName, activeMediaTag, clampedGeneratedResultIndex } from './generatedMedia'

const results = [
  { path: '/project/First Frame.jpeg', url: 'file:///first', type: 'image' as const, modelId: 'model', name: 'Opening Portrait' },
  { path: '/project/Second Frame.png', url: 'file:///second', type: 'image' as const, modelId: 'model' },
]

describe('selected generated media identity', () => {
  it('clamps selection without wrapping and derives identity from only the current result', () => {
    const first = { kind: 'image-generator' as const, title: 'Image Generator', generatedResults: results, activeResultIndex: -10 }
    const last = { ...first, activeResultIndex: 99 }
    expect(clampedGeneratedResultIndex(first)).toBe(0)
    expect(clampedGeneratedResultIndex(last)).toBe(1)
    expect(activeGeneratedResult(last)?.path).toBe('/project/Second Frame.png')
    expect(activeMediaName(first)).toBe('Opening Portrait')
    expect(activeMediaTag(first)).toBe('@opening-portrait')
    expect(activeMediaTag(last)).toBe('@second-frame')
  })

  it('keeps reusable Style identity independent from generated-result selection', () => {
    expect(activeMediaTag({ kind: 'style-reference', title: 'Style', referenceTag: '@paper-world', generatedResults: results, activeResultIndex: 1 })).toBe('@paper-world')
  })
})
