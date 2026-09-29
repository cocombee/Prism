import { describe, expect, it } from 'vitest'
import { normalizeImportedMediaName, normalizedOrdinaryMediaIdentity } from './assetNaming'

describe('imported media naming', () => {
  it('lowercases the visible basename and the real extension without changing separators', () => {
    expect(normalizeImportedMediaName('ACTOR-C.PNG')).toBe('actor-c.png')
    expect(normalizeImportedMediaName('VIDEO-01-SCENE-01-Lelaki-Indian-D.JPEG')).toBe('video-01-scene-01-lelaki-indian-d.jpeg')
  })

  it('uses the final path component and normalizes Unicode before lowercasing', () => {
    expect(normalizeImportedMediaName('/incoming/ÉMILIE Portrait.WebP')).toBe('émilie portrait.webp')
  })

  it.each([
    ['ACTOR.PNG', '/managed/170-ACTOR.PNG', 'image', 'actor.png', '170-actor.png'],
    ['Plate.JPG', '/managed/171-Plate.JPG', 'image', 'plate.jpg', '171-plate.jpg'],
    ['TAKE.MOV', '/managed/172-TAKE.MOV', 'video', 'take.mov', '172-take.mov'],
  ] as const)('plans lowercase logical and managed identities for %s', (name, path, category, expectedName, expectedBasename) => {
    expect(normalizedOrdinaryMediaIdentity({ name, path, category })).toEqual({ name: expectedName, managedBasename: expectedBasename })
  })

  it('does not normalize reusable collection members as ordinary media', () => {
    expect(normalizedOrdinaryMediaIdentity({ name: 'Face.PNG', path: '/characters/Face.PNG', category: 'character' })).toBeNull()
  })
})
