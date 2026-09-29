import { basename, extname } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import sharp from 'sharp'
import type { AssetBatchInspection } from '../shared/assetBatch'
import { analyzeCharacterImageLayout } from '../shared/characterImageValidation'

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
}

function bitsToHex(bits: number[]): string {
  let result = ''
  for (let index = 0; index < bits.length; index += 4) {
    result += Number.parseInt(bits.slice(index, index + 4).join(''), 2).toString(16)
  }
  return result
}

function fingerprintDistance(left: string, right: string): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY
  let distance = 0
  for (let index = 0; index < left.length; index += 1) {
    let delta = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16)
    while (delta) { distance += delta & 1; delta >>= 1 }
  }
  return distance
}

function viewGrid(viewCount: number, width: number, height: number): { columns: number; rows: number } {
  if (viewCount >= 7) return { columns: 3, rows: 3 }
  if (viewCount >= 5) return width >= height ? { columns: 3, rows: 2 } : { columns: 2, rows: 3 }
  if (viewCount === 4) return { columns: 2, rows: 2 }
  if (viewCount === 3) return width >= height ? { columns: 3, rows: 1 } : { columns: 1, rows: 3 }
  return width >= height ? { columns: 2, rows: 1 } : { columns: 1, rows: 2 }
}

async function distinctPanelCount(data: Buffer, width: number, height: number, channels: 1 | 2 | 3 | 4, viewCount: number): Promise<number> {
  if (viewCount < 2) return viewCount
  const { columns, rows } = viewGrid(viewCount, width, height)
  const fingerprints: string[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = Math.floor(width * column / columns)
      const top = Math.floor(height * row / rows)
      const right = Math.floor(width * (column + 1) / columns)
      const bottom = Math.floor(height * (row + 1) / rows)
      const panel = await sharp(data, { raw: { width, height, channels } }).extract({ left, top, width: right - left, height: bottom - top }).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer()
      const bits: number[] = []
      for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) bits.push(panel[y * 9 + x] > panel[y * 9 + x + 1] ? 1 : 0)
      const fingerprint = bitsToHex(bits)
      if (!fingerprints.some((existing) => fingerprintDistance(existing, fingerprint) <= 4)) fingerprints.push(fingerprint)
    }
  }
  return Math.min(viewCount, fingerprints.length)
}

async function perceptualFingerprint(path: string): Promise<string> {
  const { data } = await sharp(path).rotate().resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  const bits: number[] = []
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) bits.push(data[y * 9 + x] > data[y * 9 + x + 1] ? 1 : 0)
  }
  return bitsToHex(bits)
}

export async function inspectAssetBatchFiles(paths: string[]): Promise<AssetBatchInspection[]> {
  const inspected: AssetBatchInspection[] = []
  for (const path of paths) {
    const mimeType = MIME_BY_EXTENSION[extname(path).toLowerCase()]
    if (!mimeType) continue
    const sourceStat = await stat(path).catch(() => null)
    if (!sourceStat?.isFile() || sourceStat.size <= 0 || sourceStat.size > 50 * 1024 * 1024) continue
    try {
      const decoded = await sharp(path).rotate().resize({ width: 192, height: 192, fit: 'inside', withoutEnlargement: false }).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const analysis = analyzeCharacterImageLayout({
        data: new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength),
        width: decoded.info.width,
        height: decoded.info.height,
        channels: decoded.info.channels,
      })
      const viewCount = await distinctPanelCount(decoded.data, decoded.info.width, decoded.info.height, decoded.info.channels, analysis.viewCount)
      const preview = await sharp(path).rotate().resize({ width: 240, height: 160, fit: 'cover' }).png().toBuffer()
      inspected.push({
        id: randomUUID(),
        path,
        fileName: basename(path),
        mimeType,
        previewDataUrl: `data:image/png;base64,${preview.toString('base64')}`,
        perceptualFingerprint: await perceptualFingerprint(path),
        contentFingerprint: createHash('sha256')
          .update(`${decoded.info.width}x${decoded.info.height}x${decoded.info.channels}:`)
          .update(decoded.data)
          .digest('hex'),
        viewCount,
      })
    } catch {
      // Invalid image data is intentionally ignored by Batch intake.
    }
  }
  return inspected
}
