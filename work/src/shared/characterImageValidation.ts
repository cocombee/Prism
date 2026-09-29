import type { CharacterImageValidationResult, CharacterInputMode } from './types'

export type CharacterPixelSample = {
  data: Uint8Array
  width: number
  height: number
  channels: number
}

export type CharacterImageLayoutAnalysis = {
  classification: 'blank' | 'single-view' | 'multi-view'
  viewCount: number
  foregroundCoverage: number
}

type Component = { area: number; minX: number; minY: number; maxX: number; maxY: number }

function foregroundBandCoverage(foreground: Uint8Array, width: number, height: number, axis: 'x' | 'y', fraction: number): number {
  const axisSize = axis === 'x' ? width : height
  const center = Math.round(axisSize * fraction)
  const radius = Math.max(1, Math.floor(axisSize * 0.01))
  let active = 0
  let total = 0
  if (axis === 'x') {
    for (let x = Math.max(0, center - radius); x <= Math.min(width - 1, center + radius); x += 1) {
      for (let y = 0; y < height; y += 1) {
        active += foreground[y * width + x]
        total += 1
      }
    }
  } else {
    for (let y = Math.max(0, center - radius); y <= Math.min(height - 1, center + radius); y += 1) {
      for (let x = 0; x < width; x += 1) {
        active += foreground[y * width + x]
        total += 1
      }
    }
  }
  return active / Math.max(1, total)
}

function activeGridCells(foreground: Uint8Array, width: number, height: number, columns: number, rows: number, foregroundCoverage: number): number {
  let activeCells = 0
  const minimumCellCoverage = Math.max(0.012, foregroundCoverage * 0.08)
  for (let row = 0; row < rows; row += 1) {
    const top = Math.floor(height * row / rows)
    const bottom = Math.floor(height * (row + 1) / rows)
    for (let column = 0; column < columns; column += 1) {
      const left = Math.floor(width * column / columns)
      const right = Math.floor(width * (column + 1) / columns)
      let active = 0
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) active += foreground[y * width + x]
      }
      if (active / Math.max(1, (right - left) * (bottom - top)) >= minimumCellCoverage) activeCells += 1
    }
  }
  return activeCells
}

function detectedGridViewCount(foreground: Uint8Array, width: number, height: number, foregroundCoverage: number): number {
  if (!foregroundCoverage) return 0
  const separatorThreshold = Math.max(0.012, foregroundCoverage * 0.2)
  const separator = (axis: 'x' | 'y', fraction: number) => foregroundBandCoverage(foreground, width, height, axis, fraction) <= separatorThreshold
  const verticalThirds = [1 / 3, 2 / 3].every((fraction) => separator('x', fraction))
  const horizontalThirds = [1 / 3, 2 / 3].every((fraction) => separator('y', fraction))
  if (verticalThirds || horizontalThirds) {
    const columns = verticalThirds ? 3 : 1
    const rows = horizontalThirds ? 3 : 1
    const activeCells = activeGridCells(foreground, width, height, columns, rows, foregroundCoverage)
    if (activeCells >= 2) return activeCells
  }
  const verticalHalf = separator('x', 1 / 2)
  const horizontalHalf = separator('y', 1 / 2)
  if (verticalHalf || horizontalHalf) {
    const columns = verticalHalf ? 2 : 1
    const rows = horizontalHalf ? 2 : 1
    const activeCells = activeGridCells(foreground, width, height, columns, rows, foregroundCoverage)
    if (activeCells >= 2) return activeCells
  }
  return 0
}

function channelDistance(sample: CharacterPixelSample, pixel: number, background: number[]): number {
  const offset = pixel * sample.channels
  let squared = 0
  for (let channel = 0; channel < Math.min(3, sample.channels); channel += 1) {
    const delta = sample.data[offset + channel] - background[channel]
    squared += delta * delta
  }
  return Math.sqrt(squared)
}

function estimatedBackground(sample: CharacterPixelSample): { color: number[]; threshold: number } {
  const radius = Math.max(2, Math.floor(Math.min(sample.width, sample.height) * 0.06))
  const values: number[][] = []
  const corners = [
    [0, 0], [sample.width - radius, 0],
    [0, sample.height - radius], [sample.width - radius, sample.height - radius],
  ]
  for (const [left, top] of corners) {
    for (let y = top; y < top + radius; y += 1) {
      for (let x = left; x < left + radius; x += 1) {
        const offset = (y * sample.width + x) * sample.channels
        values.push([sample.data[offset], sample.data[offset + 1], sample.data[offset + 2]])
      }
    }
  }
  const color = [0, 1, 2].map((channel) => values.reduce((sum, value) => sum + value[channel], 0) / Math.max(1, values.length))
  const spread = values.reduce((sum, value) => {
    const distance = Math.sqrt(value.reduce((total, component, channel) => total + (component - color[channel]) ** 2, 0))
    return sum + distance
  }, 0) / Math.max(1, values.length)
  return { color, threshold: Math.min(96, Math.max(34, spread * 2.5 + 24)) }
}

export function analyzeCharacterImageLayout(sample: CharacterPixelSample): CharacterImageLayoutAnalysis {
  if (!sample.width || !sample.height || sample.channels < 3 || sample.data.length < sample.width * sample.height * sample.channels) {
    return { classification: 'blank', viewCount: 0, foregroundCoverage: 0 }
  }
  const pixelCount = sample.width * sample.height
  const { color, threshold } = estimatedBackground(sample)
  const foreground = new Uint8Array(pixelCount)
  let foregroundPixels = 0
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (channelDistance(sample, pixel, color) >= threshold) {
      foreground[pixel] = 1
      foregroundPixels += 1
    }
  }

  const visited = new Uint8Array(pixelCount)
  const components: Component[] = []
  const queue = new Int32Array(pixelCount)
  for (let start = 0; start < pixelCount; start += 1) {
    if (!foreground[start] || visited[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1
    const component: Component = { area: 0, minX: sample.width, minY: sample.height, maxX: 0, maxY: 0 }
    while (head < tail) {
      const pixel = queue[head++]
      const x = pixel % sample.width
      const y = Math.floor(pixel / sample.width)
      component.area += 1
      component.minX = Math.min(component.minX, x)
      component.minY = Math.min(component.minY, y)
      component.maxX = Math.max(component.maxX, x)
      component.maxY = Math.max(component.maxY, y)
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue
          const nextX = x + dx
          const nextY = y + dy
          if (nextX < 0 || nextY < 0 || nextX >= sample.width || nextY >= sample.height) continue
          const next = nextY * sample.width + nextX
          if (foreground[next] && !visited[next]) {
            visited[next] = 1
            queue[tail++] = next
          }
        }
      }
    }
    components.push(component)
  }

  const minimumArea = Math.max(24, pixelCount * 0.035)
  const minimumWidth = sample.width * 0.12
  const minimumHeight = sample.height * 0.12
  const componentViewCount = components.filter((component) => component.area >= minimumArea
    && component.maxX - component.minX + 1 >= minimumWidth
    && component.maxY - component.minY + 1 >= minimumHeight).length
  const foregroundCoverage = foregroundPixels / pixelCount
  const viewCount = Math.min(9, Math.max(componentViewCount, detectedGridViewCount(foreground, sample.width, sample.height, foregroundCoverage)))
  return {
    classification: viewCount === 0 ? 'blank' : viewCount === 1 ? 'single-view' : 'multi-view',
    viewCount,
    foregroundCoverage,
  }
}

export function validateCharacterImageLayout(sample: CharacterPixelSample, mode: CharacterInputMode): CharacterImageValidationResult {
  const analysis = analyzeCharacterImageLayout(sample)
  if (analysis.viewCount === 0) {
    return { valid: false, viewCount: 0, classification: analysis.classification, message: 'Choose an image with a clearly visible Character.' }
  }
  if (mode === 'single' && analysis.viewCount < 2) {
    return { valid: false, viewCount: analysis.viewCount, classification: analysis.classification, message: 'Single needs one sheet containing at least two clearly separated Character views.' }
  }
  if (mode === 'multi' && analysis.viewCount > 1) {
    return { valid: false, viewCount: analysis.viewCount, classification: analysis.classification, message: 'Multi panels accept one clear Character view at a time. Use a front-facing single view for Face, not a multi-view sheet.' }
  }
  return { valid: true, viewCount: analysis.viewCount, classification: analysis.classification }
}
