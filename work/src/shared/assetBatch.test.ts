import { describe, expect, it } from 'vitest'
import {
  acceptedAssetBatch,
  assetBatchDisplayName,
  removeSavedBatchRow,
  type AssetBatchInspection,
} from './assetBatch'

const candidate = (id: string, overrides: Partial<AssetBatchInspection> = {}): AssetBatchInspection => ({
  id,
  path: `/tmp/${id}.png`,
  fileName: `${id}.png`,
  mimeType: 'image/png',
  previewDataUrl: 'data:image/png;base64,preview',
  perceptualFingerprint: id.padEnd(64, '0').slice(0, 64),
  contentFingerprint: id.padEnd(64, '0').slice(0, 64),
  viewCount: 1,
  ...overrides,
})

describe('special asset Batch staging', () => {
  it('requires two valid rows and silently excludes unsupported files', () => {
    const result = acceptedAssetBatch('element', [
      candidate('element-a'),
      candidate('video', { mimeType: 'video/mp4' }),
      candidate('element-b'),
    ])
    expect(result.rows.map((row) => row.id)).toEqual(['element-a', 'element-b'])
    expect(result.canInsert).toBe(true)
    expect(acceptedAssetBatch('location', [candidate('only-location')])).toMatchObject({ rows: [expect.objectContaining({ id: 'only-location' })], canInsert: false })
  })

  it('requires at least two distinct local views inside every Character sheet', () => {
    const result = acceptedAssetBatch('character', [
      candidate('alice', { viewCount: 3 }),
      candidate('single-view', { viewCount: 1 }),
      candidate('bob', { viewCount: 2 }),
    ])
    expect(result.rows.map((row) => row.id)).toEqual(['alice', 'bob'])
    expect(result.canInsert).toBe(true)
  })

  it('removes exact duplicate sheets without collapsing different actors that share the same grid layout', () => {
    const fingerprint = '0'.repeat(64)
    const nearFingerprint = `${'0'.repeat(62)}11`
    const result = acceptedAssetBatch('element', [
      candidate('first', { perceptualFingerprint: fingerprint, contentFingerprint: fingerprint }),
      candidate('exact-copy', { perceptualFingerprint: fingerprint, contentFingerprint: fingerprint }),
      candidate('near-copy', { perceptualFingerprint: nearFingerprint, contentFingerprint: nearFingerprint }),
      candidate('different', { perceptualFingerprint: '1'.repeat(64), contentFingerprint: '1'.repeat(64) }),
    ])
    expect(result.rows.map((row) => row.id)).toEqual(['first', 'near-copy', 'different'])
  })

  it('uses the original filename without prompting and reserves Rename asset for unnamed files', () => {
    expect(assetBatchDisplayName('Alice Character Sheet.png')).toBe('Alice Character Sheet')
    expect(assetBatchDisplayName('')).toBe('')
    expect(assetBatchDisplayName('.png')).toBe('')
  })

  it('removes an individually saved row and returns to empty after all rows save', () => {
    const rows = [candidate('a'), candidate('b'), candidate('c')]
    expect(removeSavedBatchRow(rows, 'b').map((row) => row.id)).toEqual(['a', 'c'])
    expect(removeSavedBatchRow([candidate('a')], 'a')).toEqual([])
  })
})
