import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { inspectAssetBatchFiles } from './assetBatchInspection'

describe('local Batch image inspection', () => {
  it('detects sheet view count and produces stable perceptual fingerprints without an API', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-batch-inspection-'))
    const single = join(root, 'single.png')
    const sheet = join(root, 'sheet.png')
    const sheetCopy = join(root, 'sheet-copy.png')
    const repeatedViewSheet = join(root, 'repeated-view-sheet.png')
    const mostlyRepeatedSheet = join(root, 'mostly-repeated-sheet.png')
    const background = { create: { width: 300, height: 160, channels: 3 as const, background: '#ffffff' } }
    await sharp(background).composite([{ input: { create: { width: 80, height: 120, channels: 3 as const, background: '#111111' } }, left: 110, top: 20 }]).png().toFile(single)
    const sheetBytes = await sharp(background).composite([
      { input: { create: { width: 80, height: 120, channels: 3 as const, background: '#111111' } }, left: 35, top: 20 },
      { input: { create: { width: 48, height: 92, channels: 3 as const, background: '#555555' } }, left: 201, top: 42 },
    ]).png().toBuffer()
    await writeFile(sheet, sheetBytes)
    await writeFile(sheetCopy, sheetBytes)
    await sharp(background).composite([
      { input: { create: { width: 80, height: 120, channels: 3 as const, background: '#111111' } }, left: 35, top: 20 },
      { input: { create: { width: 80, height: 120, channels: 3 as const, background: '#111111' } }, left: 185, top: 20 },
    ]).png().toFile(repeatedViewSheet)
    const repeatedPanels = Array.from({ length: 12 }, (_, index) => ({
      input: { create: {
        width: index < 10 ? 112 : index === 10 ? 150 : 72,
        height: index < 10 ? 132 : index === 10 ? 54 : 154,
        channels: 3 as const,
        background: index === 11 ? '#555555' : '#111111',
      } },
      left: (index % 3) * 200 + (index < 10 ? 44 : index === 10 ? 25 : 64),
      top: Math.floor(index / 3) * 200 + (index < 10 ? 34 : index === 10 ? 73 : 23),
    }))
    await sharp({ create: { width: 600, height: 800, channels: 3, background: '#ffffff' } }).composite(repeatedPanels).png().toFile(mostlyRepeatedSheet)

    const inspected = await inspectAssetBatchFiles([single, sheet, sheetCopy, repeatedViewSheet, mostlyRepeatedSheet])
    expect(inspected).toHaveLength(5)
    expect(inspected[0]).toMatchObject({ fileName: 'single.png', mimeType: 'image/png', viewCount: 1 })
    expect(inspected[1].viewCount).toBeGreaterThanOrEqual(2)
    expect(inspected[1].perceptualFingerprint).toBe(inspected[2].perceptualFingerprint)
    expect(inspected[1].contentFingerprint).toBe(inspected[2].contentFingerprint)
    expect(inspected[1].previewDataUrl).toMatch(/^data:image\/png;base64,/)
    expect(inspected[3].viewCount).toBe(1)
    expect(inspected[4].viewCount).toBeGreaterThanOrEqual(2)
  })
})
