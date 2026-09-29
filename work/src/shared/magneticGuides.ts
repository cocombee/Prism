import type { XYPosition } from '@xyflow/react'

export type MagneticRect = { id: string; x: number; y: number; width: number; height: number }
export type MagneticGuide = {
  orientation: 'vertical' | 'horizontal'
  position: number
  from: number
  to: number
  kind: 'alignment' | 'equal-gap'
  label?: string
  labelPlacement?: 'toolbar-left' | 'toolbar-right'
  labelOffset?: number
}

type AxisCandidate = { delta: number; proximity: number; guides: MagneticGuide[] }

const horizontalAnchors = (rect: MagneticRect) => [rect.x, rect.x + rect.width / 2, rect.x + rect.width]
const verticalAnchors = (rect: MagneticRect) => [rect.y, rect.y + rect.height / 2, rect.y + rect.height]

function rectDistance(first: MagneticRect, second: MagneticRect): number {
  const firstCenter = { x: first.x + first.width / 2, y: first.y + first.height / 2 }
  const secondCenter = { x: second.x + second.width / 2, y: second.y + second.height / 2 }
  return Math.hypot(secondCenter.x - firstCenter.x, secondCenter.y - firstCenter.y)
}

function closestAlignment(moving: MagneticRect, others: MagneticRect[], axis: 'x' | 'y', preview: number): AxisCandidate | undefined {
  const movingAnchors = axis === 'x' ? horizontalAnchors(moving) : verticalAnchors(moving)
  let best: { delta: number; proximity: number; target: MagneticRect; line: number } | undefined
  for (const target of others) {
    const targetAnchors = axis === 'x' ? horizontalAnchors(target) : verticalAnchors(target)
    const proximity = rectDistance(moving, target)
    for (let movingIndex = 0; movingIndex < movingAnchors.length; movingIndex += 1) for (let targetIndex = 0; targetIndex < targetAnchors.length; targetIndex += 1) {
      if ((movingIndex === 1) !== (targetIndex === 1)) continue
      const movingAnchor = movingAnchors[movingIndex]
      const targetAnchor = targetAnchors[targetIndex]
      const delta = targetAnchor - movingAnchor
      if (Math.abs(delta) > preview || best && (best.proximity < proximity || best.proximity === proximity && Math.abs(best.delta) <= Math.abs(delta))) continue
      best = { delta, proximity, target, line: targetAnchor }
    }
  }
  if (!best) return undefined
  return {
    delta: best.delta,
    proximity: best.proximity,
    guides: axis === 'x'
      ? [{ orientation: 'vertical', position: best.line, from: Math.min(moving.y, best.target.y) - 24, to: Math.max(moving.y + moving.height, best.target.y + best.target.height) + 24, kind: 'alignment' }]
      : [{ orientation: 'horizontal', position: best.line, from: Math.min(moving.x, best.target.x) - 24, to: Math.max(moving.x + moving.width, best.target.x + best.target.width) + 24, kind: 'alignment' }],
  }
}

function closestEqualGap(moving: MagneticRect, others: MagneticRect[], axis: 'x' | 'y', preview: number, snap: number, maxGap: number): AxisCandidate | undefined {
  if (axis === 'x') {
    const candidates: AxisCandidate[] = []
    const y = moving.y + moving.height / 2
    const peers = others.filter((rect) => rect.y < moving.y + moving.height && rect.y + rect.height > moving.y)
    const left = peers.filter((rect) => rect.x + rect.width <= moving.x + moving.width / 2).sort((a, b) => b.x + b.width - (a.x + a.width))[0]
    const right = peers.filter((rect) => rect.x >= moving.x + moving.width / 2).sort((a, b) => a.x - b.x)[0]
    if (left && right) {
      const targetX = (left.x + left.width + right.x - moving.width) / 2
      const targetGap = targetX - (left.x + left.width)
      const delta = targetX - moving.x
      const displayX = Math.abs(delta) <= snap ? targetX : moving.x
      const leftGap = Math.max(0, displayX - (left.x + left.width))
      const rightGap = Math.max(0, right.x - (displayX + moving.width))
      if (targetGap >= 0 && targetGap <= maxGap && leftGap <= maxGap && rightGap <= maxGap && Math.abs(delta) <= preview) candidates.push({ delta, proximity: Math.max(rectDistance(moving, left), rectDistance(moving, right)), guides: [
        { orientation: 'horizontal', position: y, from: left.x + left.width, to: displayX, kind: 'equal-gap', label: `${Math.round(leftGap)}px` },
        { orientation: 'horizontal', position: y, from: displayX + moving.width, to: right.x, kind: 'equal-gap', label: `${Math.round(rightGap)}px` },
      ] })
    }
    const sorted = [...peers].sort((a, b) => a.x - b.x)
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const first = sorted[index]
      const second = sorted[index + 1]
      const gap = second.x - (first.x + first.width)
      if (gap < 0 || gap > maxGap) continue
      const afterX = second.x + second.width + gap
      const afterDelta = afterX - moving.x
      const afterDisplayX = Math.abs(afterDelta) <= snap ? afterX : moving.x
      const afterCurrentGap = Math.max(0, afterDisplayX - (second.x + second.width))
      if (afterCurrentGap <= maxGap && Math.abs(afterDelta) <= preview) candidates.push({ delta: afterDelta, proximity: Math.max(rectDistance(moving, first), rectDistance(moving, second)), guides: [
        { orientation: 'horizontal', position: y, from: first.x + first.width, to: second.x, kind: 'equal-gap', label: `${Math.round(gap)}px` },
        { orientation: 'horizontal', position: y, from: second.x + second.width, to: afterDisplayX, kind: 'equal-gap', label: `${Math.round(afterCurrentGap)}px` },
      ] })
      const beforeX = first.x - gap - moving.width
      const beforeDelta = beforeX - moving.x
      const beforeDisplayX = Math.abs(beforeDelta) <= snap ? beforeX : moving.x
      const beforeCurrentGap = Math.max(0, first.x - (beforeDisplayX + moving.width))
      if (beforeCurrentGap <= maxGap && Math.abs(beforeDelta) <= preview) candidates.push({ delta: beforeDelta, proximity: Math.max(rectDistance(moving, first), rectDistance(moving, second)), guides: [
        { orientation: 'horizontal', position: y, from: beforeDisplayX + moving.width, to: first.x, kind: 'equal-gap', label: `${Math.round(beforeCurrentGap)}px` },
        { orientation: 'horizontal', position: y, from: first.x + first.width, to: second.x, kind: 'equal-gap', label: `${Math.round(gap)}px` },
      ] })
    }
    return nearest(...candidates)
  }
  const candidates: AxisCandidate[] = []
  const x = moving.x + moving.width / 2
  const peers = others.filter((rect) => rect.x < moving.x + moving.width && rect.x + rect.width > moving.x)
  const above = peers.filter((rect) => rect.y + rect.height <= moving.y + moving.height / 2).sort((a, b) => b.y + b.height - (a.y + a.height))[0]
  const below = peers.filter((rect) => rect.y >= moving.y + moving.height / 2).sort((a, b) => a.y - b.y)[0]
  if (above && below) {
    const targetY = (above.y + above.height + below.y - moving.height) / 2
    const targetGap = targetY - (above.y + above.height)
    const delta = targetY - moving.y
    const displayY = Math.abs(delta) <= snap ? targetY : moving.y
    const aboveGap = Math.max(0, displayY - (above.y + above.height))
    const belowGap = Math.max(0, below.y - (displayY + moving.height))
    if (targetGap >= 0 && targetGap <= maxGap && aboveGap <= maxGap && belowGap <= maxGap && Math.abs(delta) <= preview) candidates.push({ delta, proximity: Math.max(rectDistance(moving, above), rectDistance(moving, below)), guides: [
      { orientation: 'vertical', position: x, from: above.y + above.height, to: displayY, kind: 'equal-gap', label: `${Math.round(aboveGap)}px` },
      { orientation: 'vertical', position: x, from: displayY + moving.height, to: below.y, kind: 'equal-gap', label: `${Math.round(belowGap)}px` },
    ] })
  }
  const sorted = [...peers].sort((a, b) => a.y - b.y)
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const first = sorted[index]
    const second = sorted[index + 1]
    const gap = second.y - (first.y + first.height)
    if (gap < 0 || gap > maxGap) continue
    const afterY = second.y + second.height + gap
    const afterDelta = afterY - moving.y
    const afterDisplayY = Math.abs(afterDelta) <= snap ? afterY : moving.y
    const afterCurrentGap = Math.max(0, afterDisplayY - (second.y + second.height))
    if (afterCurrentGap <= maxGap && Math.abs(afterDelta) <= preview) candidates.push({ delta: afterDelta, proximity: Math.max(rectDistance(moving, first), rectDistance(moving, second)), guides: [
      { orientation: 'vertical', position: x, from: first.y + first.height, to: second.y, kind: 'equal-gap', label: `${Math.round(gap)}px` },
      { orientation: 'vertical', position: x, from: second.y + second.height, to: afterDisplayY, kind: 'equal-gap', label: `${Math.round(afterCurrentGap)}px` },
    ] })
    const beforeY = first.y - gap - moving.height
    const beforeDelta = beforeY - moving.y
    const beforeDisplayY = Math.abs(beforeDelta) <= snap ? beforeY : moving.y
    const beforeCurrentGap = Math.max(0, first.y - (beforeDisplayY + moving.height))
    if (beforeCurrentGap <= maxGap && Math.abs(beforeDelta) <= preview) candidates.push({ delta: beforeDelta, proximity: Math.max(rectDistance(moving, first), rectDistance(moving, second)), guides: [
      { orientation: 'vertical', position: x, from: beforeDisplayY + moving.height, to: first.y, kind: 'equal-gap', label: `${Math.round(beforeCurrentGap)}px` },
      { orientation: 'vertical', position: x, from: first.y + first.height, to: second.y, kind: 'equal-gap', label: `${Math.round(gap)}px` },
    ] })
  }
  return nearest(...candidates)
}

function nearest(...candidates: Array<AxisCandidate | undefined>): AxisCandidate | undefined {
  return candidates.filter((candidate): candidate is AxisCandidate => Boolean(candidate)).sort((a, b) => a.proximity - b.proximity || Math.abs(a.delta) - Math.abs(b.delta))[0]
}

function smallestCorrection(...candidates: Array<AxisCandidate | undefined>): AxisCandidate | undefined {
  const isEqualGap = (candidate: AxisCandidate) => candidate.guides.some((guide) => guide.kind === 'equal-gap')
  return candidates.filter((candidate): candidate is AxisCandidate => Boolean(candidate)).sort((a, b) => {
    const correctionDifference = Math.abs(a.delta) - Math.abs(b.delta)
    if (correctionDifference) return correctionDifference
    if (isEqualGap(a) !== isEqualGap(b)) return isEqualGap(a) ? -1 : 1
    return a.proximity - b.proximity
  })[0]
}

type ScreenRect = { left: number; top: number; right: number; bottom: number }
type EqualGapLabelContext = {
  zoom: number
  viewportX: number
  viewportY: number
  canvasLeft: number
  canvasTop: number
  viewportWidth: number
  toolbar?: ScreenRect
}

export function placeEqualGapLabels(guides: MagneticGuide[], context: EqualGapLabelContext): MagneticGuide[] {
  const toolbar = context.toolbar
  if (!toolbar) return guides
  const zoom = Math.max(0.1, context.zoom)
  const clearance = 6
  return guides.map((guide) => {
    if (guide.kind !== 'equal-gap' || guide.orientation !== 'vertical' || !guide.label) return guide
    const screenX = context.canvasLeft + context.viewportX + guide.position * zoom
    const screenY = context.canvasTop + context.viewportY + ((guide.from + guide.to) / 2) * zoom
    const labelWidth = Math.max(28, guide.label.length * 5.5 + 10) * zoom
    const labelHeight = 13 * zoom
    const defaultLeft = screenX + 5 * zoom
    const defaultRect = { left: defaultLeft, right: defaultLeft + labelWidth, top: screenY - labelHeight / 2, bottom: screenY + labelHeight / 2 }
    const overlaps = defaultRect.right >= toolbar.left - clearance && defaultRect.left <= toolbar.right + clearance
      && defaultRect.bottom >= toolbar.top - clearance && defaultRect.top <= toolbar.bottom + clearance
    if (!overlaps) return guide
    const rightSpace = context.viewportWidth - toolbar.right - clearance
    const leftSpace = toolbar.left - clearance
    if (rightSpace >= labelWidth || rightSpace >= leftSpace) {
      return { ...guide, labelPlacement: 'toolbar-right', labelOffset: (toolbar.right + clearance - screenX) / zoom }
    }
    return { ...guide, labelPlacement: 'toolbar-left', labelOffset: (screenX - (toolbar.left - clearance)) / zoom }
  })
}

export function magneticNodePosition(
  moving: MagneticRect,
  others: MagneticRect[],
  previewTolerance: number,
  snapTolerance: number,
  equalGapPreviewTolerance = previewTolerance,
  equalGapMax = Number.POSITIVE_INFINITY,
): { position: XYPosition; guides: MagneticGuide[] } {
  const xCandidate = smallestCorrection(closestAlignment(moving, others, 'x', previewTolerance), closestEqualGap(moving, others, 'x', equalGapPreviewTolerance, snapTolerance, equalGapMax))
  const yCandidate = smallestCorrection(closestAlignment(moving, others, 'y', previewTolerance), closestEqualGap(moving, others, 'y', equalGapPreviewTolerance, snapTolerance, equalGapMax))
  return {
    position: {
      x: moving.x + (xCandidate && Math.abs(xCandidate.delta) <= snapTolerance ? xCandidate.delta : 0),
      y: moving.y + (yCandidate && Math.abs(yCandidate.delta) <= snapTolerance ? yCandidate.delta : 0),
    },
    guides: [...(xCandidate?.guides || []), ...(yCandidate?.guides || [])],
  }
}
