import type { CharacterView, ImportedAsset } from '../../shared/types'
import { CHARACTER_COMPLETION_VIEWS } from '../../shared/characterViews'

export interface CompiledCharacterSheet {
  bytes: ArrayBuffer
  views: CharacterView[]
  width: number
  height: number
}

export type CharacterImageReader = (asset: ImportedAsset) => Promise<{ bytes: ArrayBuffer; mimeType: string }>

function drawContained(context: CanvasRenderingContext2D, image: ImageBitmap, x: number, y: number, width: number, height: number): void {
  const scale = Math.min(width / image.width, height / image.height)
  const drawnWidth = image.width * scale
  const drawnHeight = image.height * scale
  context.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight)
}

export async function compileCharacterSheet(references: readonly ImportedAsset[], readImage: CharacterImageReader): Promise<CompiledCharacterSheet> {
  const ordered = CHARACTER_COMPLETION_VIEWS
    .map(({ id }) => references.find((asset) => asset.metadata?.characterView === id))
    .filter((asset): asset is ImportedAsset => Boolean(asset?.url))
  if (!ordered.length) throw new Error('Character library: no readable Character views are available to compile.')

  const columns = Math.min(3, ordered.length)
  const rows = Math.ceil(ordered.length / columns)
  const cellWidth = 1024
  const cellHeight = 1365
  const gutter = 12
  const width = columns * cellWidth
  const height = rows * cellHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Character library: the hidden Character reference sheet could not be prepared.')
  context.fillStyle = '#eeeae2'
  context.fillRect(0, 0, width, height)

  const bitmaps: ImageBitmap[] = []
  try {
    for (const [index, asset] of ordered.entries()) {
      const source = await readImage(asset)
      const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mimeType }))
      bitmaps.push(bitmap)
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = column * cellWidth
      const y = row * cellHeight
      context.fillStyle = '#f5f2ec'
      context.fillRect(x + gutter, y + gutter, cellWidth - gutter * 2, cellHeight - gutter * 2)
      drawContained(context, bitmap, x + gutter, y + gutter, cellWidth - gutter * 2, cellHeight - gutter * 2)
    }
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Character library: the hidden Character reference sheet could not be encoded.')), 'image/jpeg', 0.94))
    return { bytes: await blob.arrayBuffer(), views: ordered.map((asset) => asset.metadata!.characterView!), width, height }
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close())
  }
}
