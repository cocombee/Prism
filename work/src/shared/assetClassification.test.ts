import { describe, expect, it } from 'vitest'
import { importedAssetDestination, semanticKindForCategory, shouldRerouteSemanticAsset } from './assetClassification'

describe('canonical asset classification', () => {
  it('maps managed semantic categories to their compatible node kind', () => {
    expect(semanticKindForCategory('character')).toBe('character')
    expect(semanticKindForCategory('element')).toBe('element')
    expect(semanticKindForCategory('location')).toBe('location')
    expect(semanticKindForCategory('style')).toBe('style-reference')
  })

  it('does not invent semantic roles for untyped media', () => {
    expect(semanticKindForCategory('image')).toBeUndefined()
    expect(semanticKindForCategory('video')).toBeUndefined()
    expect(semanticKindForCategory('audio')).toBeUndefined()
  })

  it('reroutes a managed asset selected from the wrong semantic node', () => {
    expect(shouldRerouteSemanticAsset('style', 'character')).toBe(true)
    expect(shouldRerouteSemanticAsset('character', 'character')).toBe(false)
    expect(shouldRerouteSemanticAsset('style', 'upload')).toBe(false)
  })

  it('routes imports to their actual library type instead of the active filter', () => {
    expect(importedAssetDestination(['audio'])).toBe('audio')
    expect(importedAssetDestination(['image', 'image'])).toBe('image')
    expect(importedAssetDestination(['character'])).toBe('character')
    expect(importedAssetDestination(['image', 'video'])).toBe('all')
    expect(importedAssetDestination([undefined])).toBe('all')
  })
})
