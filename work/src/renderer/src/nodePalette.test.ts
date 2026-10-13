import { describe, expect, it } from 'vitest'
import { NODE_PALETTE, ORDERED_NODE_PALETTE, POPULAR_NODE_KINDS } from './nodePalette'

describe('Add Node palette', () => {
  it('pins Prompt, Image Generator, and Video Generator before an alphabetical remainder', () => {
    expect(ORDERED_NODE_PALETTE.slice(0, 3).map((item) => item.kind)).toEqual(POPULAR_NODE_KINDS)
    const remainingLabels = ORDERED_NODE_PALETTE.slice(3).map((item) => item.label)
    expect(remainingLabels).toEqual([...remainingLabels].sort((left, right) => left.localeCompare(right, 'en')))
  })

  it('gives every node kind a unique icon and reuses its voice icon for Voice Change', () => {
    expect(NODE_PALETTE.find(item => item.variant === 'voice-change')?.icon).toBe(NODE_PALETTE.find(item => item.kind === 'voiceover' && !item.variant)?.icon)
    expect(new Set(NODE_PALETTE.map((item) => item.icon)).size).toBe(new Set(NODE_PALETTE.map(item => item.kind)).size)
  })
})
