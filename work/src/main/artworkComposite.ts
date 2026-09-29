import { dirname, extname, join } from 'node:path'
import { rename, unlink } from 'node:fs/promises'
import sharp, { type OverlayOptions } from 'sharp'
import type { GenerationRequest } from '../shared/types'

interface Box { x: number; y: number; width: number; height: number; score: number }
interface Integral { width: number; height: number; values: Float64Array }

function integral(values: Float64Array, width: number, height: number): Integral {
  const stride = width + 1
  const sums = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y += 1) {
    let row = 0
    for (let x = 0; x < width; x += 1) {
      row += values[y * width + x]
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row
    }
  }
  return { width, height, values: sums }
}

function mean(map: Integral, x: number, y: number, width: number, height: number): number {
  const x0 = Math.max(0, Math.min(map.width, Math.round(x)))
  const y0 = Math.max(0, Math.min(map.height, Math.round(y)))
  const x1 = Math.max(x0 + 1, Math.min(map.width, Math.round(x + width)))
  const y1 = Math.max(y0 + 1, Math.min(map.height, Math.round(y + height)))
  const stride = map.width + 1
  const sum = map.values[y1 * stride + x1] - map.values[y0 * stride + x1] - map.values[y1 * stride + x0] + map.values[y0 * stride + x0]
  return sum / ((x1 - x0) * (y1 - y0))
}

function overlap(a: Box, b: Box): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return width * height / Math.min(a.width * a.height, b.width * b.height)
}

export function detectHorizontalCarriers(rgb: Buffer, width: number, height: number, count: number, preferRight = false): Box[] {
  const luma = new Float64Array(width * height)
  const gx = new Float64Array(width * height)
  const gy = new Float64Array(width * height)
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const at = (y * width + x) * 3
    luma[y * width + x] = (.2126 * rgb[at] + .7152 * rgb[at + 1] + .0722 * rgb[at + 2]) / 255
  }
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    gx[y * width + x] = Math.abs(luma[y * width + x + 1] - luma[y * width + x - 1])
    gy[y * width + x] = Math.abs(luma[(y + 1) * width + x] - luma[(y - 1) * width + x])
  }
  const lum = integral(luma, width, height)
  const ix = integral(gx, width, height)
  const iy = integral(gy, width, height)
  const candidates: Box[] = []
  const minWidth = Math.max(96, Math.round(width * .36))
  const maxWidth = Math.round(width * .6)
  for (let w = minWidth; w <= maxWidth; w += 6) {
    for (const ratio of [3.4, 4, 4.7, 5.4, 6.2]) {
      const h = Math.max(32, Math.round(w / ratio))
      for (let y = 4; y + h < height - 4; y += 4) for (let x = 4; x + w < width - 4; x += 4) {
        if (preferRight && x + w / 2 < width * .48) continue
        const top = mean(iy, x, y - 2, w, 4)
        const bottom = mean(iy, x, y + h - 2, w, 4)
        const left = mean(ix, x - 2, y, 4, h)
        const right = mean(ix, x + w - 2, y, 4, h)
        const inside = mean(lum, x + 3, y + 3, w - 6, h - 6)
        const outside = mean(lum, x - 4, y - 4, w + 8, h + 8)
        const edge = (top + bottom) * .38 + (left + right) * .12
        const score = edge + Math.max(0, inside - outside) * .65 + inside * .08 + (w / width) * .18
        if (score > .16) candidates.push({ x, y, width: w, height: h, score })
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  const shortlist: Box[] = []
  for (const candidate of candidates) {
    if (shortlist.some((picked) => overlap(candidate, picked) > .7)) continue
    shortlist.push(candidate)
    if (shortlist.length >= 80) break
  }
  let best: Box[] = []
  let bestScore = -Infinity
  const visit = (start: number, picked: Box[], score: number) => {
    if (picked.length === count) {
      const sorted = [...picked].sort((a, b) => a.y - b.y)
      let geometryPenalty = 0
      const shared = sorted.slice(1).reduce((sum, box, index) => {
        const previous = sorted[index]
        const horizontal = Math.max(0, Math.min(previous.x + previous.width, box.x + box.width) - Math.max(previous.x, box.x)) / Math.min(previous.width, box.width)
        const growth = box.width / previous.width
        if (growth < 1.03) geometryPenalty += (1.03 - growth) * 8
        if (box.x > previous.x + previous.width * .08) geometryPenalty += .35
        if (box.x < previous.x - previous.width * .3) geometryPenalty += .8
        if (box.height / previous.height > 1.5) geometryPenalty += (box.height / previous.height - 1.5) * 1.5
        const centreGap = (box.y + box.height / 2) - (previous.y + previous.height / 2)
        const expectedGap = (previous.height + box.height) * .5
        const gapRatio = centreGap / expectedGap
        geometryPenalty += Math.abs(gapRatio - 1) * 1.35
        return sum + horizontal
      }, 0)
      const total = score + shared * .22 - geometryPenalty
      if (total > bestScore) { bestScore = total; best = sorted }
      return
    }
    for (let index = start; index < shortlist.length; index += 1) {
      const candidate = shortlist[index]
      if (picked.some((other) => overlap(candidate, other) > .18)) continue
      visit(index + 1, [...picked, candidate], score + candidate.score)
    }
  }
  visit(0, [], 0)
  if (best.length === 3 && best[2].score < .28) {
    const [top, middle] = best
    const projectedWidth = Math.min(maxWidth, Math.round(middle.width + Math.max(0, middle.width - top.width)))
    const projectedHeight = Math.round(Math.max(middle.height, projectedWidth / 5.2))
    best[2] = {
      x: Math.max(0, Math.round(middle.x - (projectedWidth - middle.width) / 2)),
      y: Math.min(height - projectedHeight, Math.round(middle.y + (middle.y - top.y) * 1.08)),
      width: projectedWidth,
      height: projectedHeight,
      score: Math.min(top.score, middle.score) * .85,
    }
  }
  return best.map((box) => {
    const searchLeft = Math.max(0, Math.round(box.x - box.width * .38))
    const searchRight = Math.min(width - 1, Math.round(box.x + box.width * 1.28))
    const rows = [.16, .28, .4, .6, .72, .84].map((fraction) => Math.max(0, Math.min(height - 1, Math.round(box.y + box.height * fraction))))
    const activity = new Float64Array(width)
    for (let x = searchLeft; x <= searchRight; x += 1) {
      let brightest = 0
      for (const y of rows) {
        let total = 0
        let samples = 0
        for (let dx = -5; dx <= 5; dx += 1) {
          const sampleX = Math.max(0, Math.min(width - 1, x + dx))
          total += luma[y * width + sampleX]
          samples += 1
        }
        brightest = Math.max(brightest, total / samples)
      }
      activity[x] = brightest
    }
    const threshold = Math.max(.3, Math.min(.52, mean(lum, box.x, box.y, box.width, box.height) * .68))
    const centre = box.x + box.width / 2
    const runs: Array<{ left: number; right: number }> = []
    let runLeft = -1
    let lastBright = -1
    for (let x = searchLeft; x <= searchRight; x += 1) {
      if (activity[x] >= threshold) {
        if (runLeft < 0) runLeft = x
        lastBright = x
      } else if (runLeft >= 0 && x - lastBright > 18) {
        runs.push({ left: runLeft, right: lastBright })
        runLeft = -1
        lastBright = -1
      }
    }
    if (runLeft >= 0 && lastBright >= runLeft) runs.push({ left: runLeft, right: lastBright })
    const carrier = runs
      .filter((run) => run.right - run.left >= box.width * .58)
      .sort((a, b) => Math.abs((a.left + a.right) / 2 - centre) - Math.abs((b.left + b.right) / 2 - centre))[0]
    if (!carrier) return box
    const refinedWidth = carrier.right - carrier.left + 1
    if (refinedWidth < box.width * .58 || refinedWidth > box.width * 1.75) return box
    const refinedLeft = Math.round((box.x + carrier.left) / 2)
    const refinedRight = Math.min(carrier.right, Math.round(box.x + box.width * 1.15))
    return refinedRight - refinedLeft >= box.width * .58 ? { ...box, x: refinedLeft, width: refinedRight - refinedLeft + 1 } : box
  })
}

function localPrompt(prompt: string, tag: string): string {
  const at = prompt.indexOf(tag)
  if (at < 0) return ''
  const previousSentence = Math.max(prompt.lastIndexOf('.', at), prompt.lastIndexOf('\n', at))
  const nextPeriod = prompt.indexOf('.', at)
  const nextNewline = prompt.indexOf('\n', at)
  const endings = [nextPeriod, nextNewline].filter((value) => value >= 0)
  const end = endings.length ? Math.min(...endings) : prompt.length
  return prompt.slice(previousSentence + 1, end)
}

function isRoundCarrier(prompt: string, tag: string): boolean {
  return /\b(?:disc|disk|circle|circular|round|medallion|rosette)\b/i.test(localPrompt(prompt, tag))
}

export async function detectRoundCarrier(rgb: Buffer, width: number, height: number, preferRight: boolean): Promise<Box | null> {
  const luma = (x: number, y: number) => {
    const at = (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 3
    return (.2126 * rgb[at] + .7152 * rgb[at + 1] + .0722 * rgb[at + 2]) / 255
  }
  let best: Box | null = null
  for (let radius = Math.max(12, Math.round(width * .025)); radius <= Math.round(width * .12); radius += 3) {
    for (let cy = radius + 2; cy < height - radius - 2; cy += 4) for (let cx = radius + 2; cx < width - radius - 2; cx += 4) {
      if (preferRight && cx < width * .48) continue
      let inside = 0; let ring = 0; let insideCount = 0; let ringCount = 0
      for (let angle = 0; angle < 32; angle += 1) {
        const theta = angle / 32 * Math.PI * 2
        inside += luma(Math.round(cx + Math.cos(theta) * radius * .55), Math.round(cy + Math.sin(theta) * radius * .55)); insideCount += 1
        ring += luma(Math.round(cx + Math.cos(theta) * radius * 1.05), Math.round(cy + Math.sin(theta) * radius * 1.05)); ringCount += 1
      }
      const centre = luma(cx, cy)
      const inner = (inside / insideCount + centre) / 2
      const outer = ring / ringCount
      const score = inner * .3 + Math.max(0, inner - outer) * 1.15
      if (!best || score > best.score) best = { x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2, score }
    }
  }
  return best && best.score >= .28 ? best : null
}

export async function compositeLockedArtwork(request: GenerationRequest, outputPath: string): Promise<{ applied: boolean; placements: number; confidence: number }> {
  const prompt = request.prompt || ''
  const artwork = (request.references || []).filter((reference) => reference.fidelity === 'lock' && reference.role === 'reference' && reference.path && (!reference.mediaType || reference.mediaType === 'image'))
  if (!artwork.length) return { applied: false, placements: 0, confidence: 1 }
  const analysisWidth = 512
  const analysis = await sharp(outputPath).rotate().resize({ width: analysisWidth, withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = analysis.info
  const rectangular = artwork.filter((reference) => !isRoundCarrier(prompt, reference.tag || ''))
  const rounded = artwork.filter((reference) => isRoundCarrier(prompt, reference.tag || ''))
  const preferRight = /\b(?:right|right-hand|upper right|lower right)\b/i.test(prompt)
  const rectangles = rectangular.length ? detectHorizontalCarriers(analysis.data, width, height, rectangular.length, preferRight) : []
  const circle = rounded.length ? await detectRoundCarrier(analysis.data, width, height, preferRight) : null
  if (rectangles.length !== rectangular.length || (rounded.length && !circle) || rounded.length > 1) return { applied: false, placements: 0, confidence: 0 }
  const metadata = await sharp(outputPath).metadata()
  if (!metadata.width || !metadata.height) return { applied: false, placements: 0, confidence: 0 }
  const sx = metadata.width / width
  const sy = metadata.height / height
  const overlays: OverlayOptions[] = []
  for (const [index, reference] of rectangular.entries()) {
    const box = rectangles.slice().sort((a, b) => b.y - a.y)[index]
    const targetWidth = Math.max(1, Math.round(box.width * sx * .82))
    const targetHeight = Math.max(1, Math.round(box.height * sy * .62))
    const artworkLeft = Math.round((box.x + box.width * .09) * sx)
    const artworkTop = Math.round((box.y + box.height * .19) * sy)
    const input = await sharp(reference.path!).trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } }).resize({ width: targetWidth, height: targetHeight, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    overlays.push({ input, left: artworkLeft, top: artworkTop, blend: 'over' })
  }
  if (circle && rounded[0]) {
    const size = Math.max(1, Math.round(Math.min(circle.width * sx, circle.height * sy) * .68))
    const input = await sharp(rounded[0].path!).trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } }).resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    overlays.push({ input, left: Math.round((circle.x * sx) + (circle.width * sx - size) / 2), top: Math.round((circle.y * sy) + (circle.height * sy - size) / 2), blend: 'over' })
  }
  const extension = extname(outputPath) || '.png'
  const temporary = join(dirname(outputPath), `.prism-lock-${Date.now()}${extension}`)
  try {
    await sharp(outputPath).composite(overlays).toFile(temporary)
    await rename(temporary, outputPath)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw error
  }
  const scores = [...rectangles.map((box) => box.score), ...(circle ? [circle.score] : [])]
  return { applied: true, placements: artwork.length, confidence: Math.min(...scores) }
}
