const NUMBER = '[-+]?(?:\\d*\\.?\\d+(?:e[-+]?\\d+)?)'
const RECT_PATH = new RegExp(`M(${NUMBER}),(${NUMBER})h(${NUMBER})v(${NUMBER})h(${NUMBER})z`, 'gi')

export function minimapCornerRadiusForZoom(
  zoom: number,
  minZoom = 0.2,
  maxZoom = 4.4,
  baseRadius = 10,
): number {
  const zoomRange = Math.max(Number.EPSILON, maxZoom - minZoom)
  const progress = Math.min(1, Math.max(0, (zoom - minZoom) / zoomRange))
  return baseRadius * (1 - progress * (2 / 3))
}

export function responsiveMinimapSize(
  canvasWidth: number,
  canvasHeight: number,
  fixedHeight = 114,
  maxWidth = 240,
): { width: number; height: number } {
  if (![canvasWidth, canvasHeight, fixedHeight, maxWidth].every(Number.isFinite) || canvasWidth <= 0 || canvasHeight <= 0 || fixedHeight <= 0 || maxWidth <= 0) {
    return { width: 195, height: 114 }
  }
  return {
    width: Math.round(Math.min(maxWidth, fixedHeight * (canvasWidth / canvasHeight)) * 10) / 10,
    height: fixedHeight,
  }
}

export function roundedMinimapMaskPath(path: string, requestedRadius: number): string {
  const matches = [...path.matchAll(RECT_PATH)]
  const viewport = matches.at(-1)
  if (!viewport || matches.length < 2) return path

  const [segment, xValue, yValue, widthValue, heightValue] = viewport
  const x = Number(xValue)
  const y = Number(yValue)
  const width = Number(widthValue)
  const height = Number(heightValue)
  if (![x, y, width, height, requestedRadius].every(Number.isFinite) || width <= 0 || height <= 0) return path

  const radius = Math.max(0, Math.min(requestedRadius, width / 2, height / 2))
  const right = x + width
  const bottom = y + height
  const rounded = [
    `M${x + radius},${y}`,
    `H${right - radius}`,
    `Q${right},${y} ${right},${y + radius}`,
    `V${bottom - radius}`,
    `Q${right},${bottom} ${right - radius},${bottom}`,
    `H${x + radius}`,
    `Q${x},${bottom} ${x},${bottom - radius}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    'Z',
  ].join(' ')

  const start = viewport.index ?? 0
  return `${path.slice(0, start)}${rounded}${path.slice(start + segment.length)}`
}
