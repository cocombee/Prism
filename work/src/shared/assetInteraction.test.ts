import { describe, expect, it } from 'vitest'
import { applyOrderedAssetSelection, isExactRelinkCandidate, isPlaceholderMediaDropAllowed, librarySelectAllKeys, managedAssetDeletionSelection, mediaFamily, mediaFamilyForFile, selectionDismissalIntent, shouldRequestSelectedAssetDelete, shouldUseIntrinsicAssetRatio } from './assetInteraction'

describe('ordered asset selection', () => {
  const order = ['a', 'b', 'c', 'd', 'e']

  it('selects a contiguous range from the previous anchor with Shift', () => {
    const first = applyOrderedAssetSelection(order, [], null, 'b', {})
    expect(first).toEqual({ selected: ['b'], anchor: 'b' })
    expect(applyOrderedAssetSelection(order, first.selected, first.anchor, 'e', { shift: true })).toEqual({
      selected: ['b', 'c', 'd', 'e'],
      anchor: 'b',
    })
  })

  it('toggles independent items with Command and preserves the anchor', () => {
    const first = applyOrderedAssetSelection(order, [], null, 'b', {})
    const added = applyOrderedAssetSelection(order, first.selected, first.anchor, 'd', { meta: true })
    expect(added).toEqual({ selected: ['b', 'd'], anchor: 'b' })
    expect(applyOrderedAssetSelection(order, added.selected, added.anchor, 'b', { meta: true })).toEqual({ selected: ['d'], anchor: 'd' })
  })

  it('replaces selection and anchor on an ordinary click', () => {
    expect(applyOrderedAssetSelection(order, ['a', 'c'], 'a', 'e', {})).toEqual({ selected: ['e'], anchor: 'e' })
  })
})

describe('managed asset deletion selection', () => {
  it('counts selected cards separately from managed files inside semantic collections', () => {
    const characterFiles = [{ id: 'face' }, { id: 'profile' }, { id: 'back' }]
    const ordinaryImage = { id: 'image' }
    const result = managedAssetDeletionSelection(
      ['semantic:actor', 'media:image', 'built-in-style:cinema'],
      [{ key: 'semantic:actor', assets: characterFiles }, { key: 'media:image', assets: [ordinaryImage] }],
    )
    expect(result.selectionCount).toBe(2)
    expect(result.assets.map((asset) => asset.id)).toEqual(['face', 'profile', 'back', 'image'])
  })

  it('deduplicates managed files shared by selected cards', () => {
    const shared = { id: 'same-file' }
    expect(managedAssetDeletionSelection(['one', 'two'], [{ key: 'one', assets: [shared] }, { key: 'two', assets: [shared] }])).toEqual({ selectionCount: 2, assets: [shared] })
  })
})

describe('Library keyboard deletion', () => {
  const base = { selectedCount: 2, assetsSurfaceVisible: true, textEntryActive: false, confirmationOpen: false }

  it('accepts both macOS Delete/Backspace and forward Delete', () => {
    expect(shouldRequestSelectedAssetDelete({ ...base, key: 'Backspace' })).toBe(true)
    expect(shouldRequestSelectedAssetDelete({ ...base, key: 'Delete' })).toBe(true)
  })
})

describe('Library Command+A', () => {
  it('selects exactly the visible filtered keys when Library owns the shortcut', () => {
    expect(librarySelectAllKeys({ key: 'a', meta: true, libraryActive: true, textEntryActive: false }, ['visible-a', 'visible-b'])).toEqual(['visible-a', 'visible-b'])
  })

  it('does not capture typing or shortcuts outside Library', () => {
    expect(librarySelectAllKeys({ key: 'a', meta: true, libraryActive: true, textEntryActive: true }, ['visible'])).toBeNull()
    expect(librarySelectAllKeys({ key: 'a', meta: true, libraryActive: false, textEntryActive: false }, ['visible'])).toBeNull()
    expect(librarySelectAllKeys({ key: 'a', meta: false, libraryActive: true, textEntryActive: false }, ['visible'])).toBeNull()
  })
})

describe('Canvas and Library selection ownership', () => {
  it('clears Canvas selection when Library is clicked but preserves Library selection', () => {
    expect(selectionDismissalIntent({ insideLibrary: true, insideCanvas: false, canvasControl: false })).toEqual({ clearLibrary: false, clearCanvas: true })
  })

  it('clears Library selection when Canvas is clicked and lets React Flow own Canvas selection', () => {
    expect(selectionDismissalIntent({ insideLibrary: false, insideCanvas: true, canvasControl: false })).toEqual({ clearLibrary: true, clearCanvas: false })
  })

  it('clears Library selection but preserves Canvas nodes for approved Canvas controls', () => {
    expect(selectionDismissalIntent({ insideLibrary: false, insideCanvas: false, canvasControl: true })).toEqual({ clearLibrary: true, clearCanvas: false })
  })

  it('clears both selections on unrelated outside surfaces', () => {
    expect(selectionDismissalIntent({ insideLibrary: false, insideCanvas: false, canvasControl: false })).toEqual({ clearLibrary: true, clearCanvas: true })
  })
})

describe('offline relink matching', () => {
  it('matches exact basenames case-insensitively within the same media family', () => {
    expect(isExactRelinkCandidate('Actor-C.PNG', 'image/png', 'actor-c.png', 'image/jpeg')).toBe(true)
    expect(isExactRelinkCandidate('actor-c.png', 'image/png', 'actor-c-2.png', 'image/png')).toBe(false)
    expect(isExactRelinkCandidate('actor-c.png', 'image/png', 'actor-c.png', 'video/mp4')).toBe(false)
  })

  it('classifies image, video, and audio MIME families', () => {
    expect(mediaFamily('image/webp')).toBe('image')
    expect(mediaFamily('video/quicktime')).toBe('video')
    expect(mediaFamily('audio/mpeg')).toBe('audio')
  })
})

describe('typed placeholder drops', () => {
  it('accepts ordinary media only when its family matches the placeholder', () => {
    expect(isPlaceholderMediaDropAllowed('image', { mimeType: 'image/heif', name: 'location.heif', category: 'image' })).toBe(true)
    expect(isPlaceholderMediaDropAllowed('image', { mimeType: 'video/mp4', name: 'clip.mp4', category: 'video' })).toBe(false)
    expect(isPlaceholderMediaDropAllowed('video', { mimeType: 'video/quicktime', name: 'clip.mov', category: 'video' })).toBe(true)
    expect(isPlaceholderMediaDropAllowed('audio', { mimeType: 'audio/mpeg', name: 'voice.mp3', category: 'audio' })).toBe(true)
  })

  it('rejects saved collections and special assets even when their file is an image', () => {
    for (const category of ['character', 'element', 'location', 'style', 'storyboard'] as const) {
      expect(isPlaceholderMediaDropAllowed('image', { mimeType: 'image/png', name: 'preview.png', category })).toBe(false)
    }
  })

  it('infers supported media families from filenames when a Finder drop has no MIME type', () => {
    expect(mediaFamilyForFile('', 'still.JPEG')).toBe('image')
    expect(mediaFamilyForFile('', 'reference.heic')).toBe('image')
    expect(mediaFamilyForFile('', 'take.MOV')).toBe('video')
    expect(mediaFamilyForFile('', 'dialogue.WAV')).toBe('audio')
    expect(mediaFamilyForFile('', 'notes.txt')).toBe(null)
  })
})

describe('single-image intrinsic ratio', () => {
  it('preserves intrinsic ratio outside Character and Element Multi', () => {
    expect(shouldUseIntrinsicAssetRatio('upload')).toBe(true)
    expect(shouldUseIntrinsicAssetRatio('location')).toBe(true)
    expect(shouldUseIntrinsicAssetRatio('character', 'single')).toBe(true)
    expect(shouldUseIntrinsicAssetRatio('element', 'single')).toBe(true)
    expect(shouldUseIntrinsicAssetRatio('character', 'multi')).toBe(false)
    expect(shouldUseIntrinsicAssetRatio('element', 'multi')).toBe(false)
  })
})
