import { describe, expect, it } from 'vitest'
import { assetPromotionOrigin } from './assetPromotionOrigin'
import type { ImportedAsset } from '../shared/types'

const asset = (path: string, origin: ImportedAsset['origin']): ImportedAsset => ({ id: path, name: 'Haji.png', path, mimeType: 'image/png', origin, createdAt: 'fixture' })
describe('semantic copy provenance', () => {
  it('retains imported provenance through a normalized managed path without mutating the source record', () => {
    const source = asset('/project/characters/Haji.png', 'imported'), before = JSON.stringify(source)
    expect(assetPromotionOrigin('/project/characters/../characters/Haji.png', [source])).toBe('imported')
    expect(JSON.stringify(source)).toBe(before)
  })
  it('keeps generated origin and never matches a same-named image elsewhere', () => {
    expect(assetPromotionOrigin('/project/generated/Haji.png', [asset('/project/generated/Haji.png', 'generated')])).toBe('generated')
    expect(assetPromotionOrigin('/project/other/Haji.png', [asset('/project/characters/Haji.png', 'imported')])).toBe('generated')
    expect(assetPromotionOrigin('/project/unregistered.png', [])).toBe('generated')
  })
})
