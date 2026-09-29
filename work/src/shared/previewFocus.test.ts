import { describe, expect, it } from 'vitest'
import type { ImportedAsset } from './types'
import { previewFocalPosition } from './previewFocus'

function asset(metadata: ImportedAsset['metadata'] = {}): ImportedAsset {
  return { id: 'asset', name: 'asset.jpg', path: '/asset.jpg', mimeType: 'image/jpeg', createdAt: '', metadata }
}

describe('previewFocalPosition', () => {
  it('prioritizes the head region for a being without explicit metadata', () => {
    expect(previewFocalPosition(asset(), true)).toBe('50% 24%')
  })

  it('keeps non-being media centered by default', () => {
    expect(previewFocalPosition(asset())).toBe('50% 50%')
  })

  it('honors and safely bounds explicit focal metadata', () => {
    expect(previewFocalPosition(asset({ previewFocusX: 112, previewFocusY: -8 }), true)).toBe('100% 0%')
  })
})
