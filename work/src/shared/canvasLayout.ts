import type { XYPosition } from '@xyflow/react'
import type { NodeKind, StudioNode } from './types'

export type NodeLayoutSize = { width: number; height: number }
export type NodeAlignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'gap-horizontal' | 'gap-vertical'
export const STANDARD_NODE_WIDTH = 315

const ADAPTIVE_WIDTH_KINDS = new Set<NodeKind>(['image-generator', 'video-generator', 'router'])
const FREEFORM_WIDTH_KINDS = new Set<NodeKind>(['frame', 'sticky-note', 'comment', 'sticker', 'drawing'])

const DEFAULT_SIZES: Partial<Record<NodeKind, NodeLayoutSize>> = {
  frame: { width: 580, height: 430 },
  // Storyboard opens in its compact browse state. Using the former expanded
  // editor height here made collision placement skip an otherwise clean
  // adjacent pane and deploy the node hundreds of pixels away.
  storyboard: { width: STANDARD_NODE_WIDTH, height: 180 },
  'storyboard-asset': { width: STANDARD_NODE_WIDTH, height: 380 },
  'style-reference': { width: STANDARD_NODE_WIDTH, height: 390 },
  list: { width: STANDARD_NODE_WIDTH, height: 420 },
  router: { width: 150, height: 58 },
  assistant: { width: STANDARD_NODE_WIDTH, height: 360 },
  'video-generator': { width: STANDARD_NODE_WIDTH, height: 590 },
  'image-generator': { width: 360, height: 520 },
  'image-editor': { width: STANDARD_NODE_WIDTH, height: 520 },
  upscaler: { width: STANDARD_NODE_WIDTH, height: 500 },
  character: { width: STANDARD_NODE_WIDTH, height: 540 },
  element: { width: STANDARD_NODE_WIDTH, height: 500 },
  location: { width: STANDARD_NODE_WIDTH, height: 500 },
  upload: { width: STANDARD_NODE_WIDTH, height: 430 },
  gallery: { width: STANDARD_NODE_WIDTH, height: 430 },
  output: { width: STANDARD_NODE_WIDTH, height: 430 },
  prompt: { width: STANDARD_NODE_WIDTH, height: 310 },
  voiceover: { width: STANDARD_NODE_WIDTH, height: 430 },
  'sound-effects': { width: STANDARD_NODE_WIDTH, height: 330 },
  'music-generator': { width: STANDARD_NODE_WIDTH, height: 350 },
}

const numericDimension = (value: unknown, fallback: number) => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value || ''))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

export function nodeLayoutSize(kind: NodeKind, node?: StudioNode): NodeLayoutSize {
  const fallback = DEFAULT_SIZES[kind] || { width: 360, height: 360 }
  return {
    width: numericDimension(node?.measured?.width ?? node?.style?.width, fallback.width),
    height: numericDimension(node?.measured?.height ?? node?.style?.height, fallback.height),
  }
}

export function normalizeStandardNodeWidths(nodes: StudioNode[]): StudioNode[] {
  return nodes.map((node) => {
    if (ADAPTIVE_WIDTH_KINDS.has(node.data.kind) || FREEFORM_WIDTH_KINDS.has(node.data.kind)) return node
    const currentWidth = numericDimension(node.style?.width, STANDARD_NODE_WIDTH)
    if (currentWidth === STANDARD_NODE_WIDTH && (!node.measured?.width || node.measured.width === STANDARD_NODE_WIDTH)) return node
    const { measured: _measured, ...unmeasured } = node
    return { ...unmeasured, style: { ...node.style, width: STANDARD_NODE_WIDTH } }
  })
}

/** Place a new node around the current visible flow-space center, not fixed world coordinates. */
export function centeredNodePosition(center: XYPosition, kind: NodeKind): XYPosition {
  const size = nodeLayoutSize(kind)
  return { x: center.x - size.width / 2, y: center.y - size.height / 2 }
}

/** Center the complete automatically-linked Style + Storyboard pair as one visible unit. */
export function centeredStoryboardPairPositions(center: XYPosition): { style: XYPosition; storyboard: XYPosition } {
  const styleSize = nodeLayoutSize('style-reference')
  const storyboardSize = nodeLayoutSize('storyboard')
  const gap = 45
  const pairWidth = styleSize.width + gap + storyboardSize.width
  const top = center.y - Math.max(styleSize.height, storyboardSize.height) / 2
  return {
    style: { x: center.x - pairWidth / 2, y: top + 28 },
    storyboard: { x: center.x - pairWidth / 2 + styleSize.width + gap, y: top },
  }
}

/** Illustrator-style alignment while preserving the selection's outer bounds. */
export function alignedNodePositions(nodes: StudioNode[], alignment: NodeAlignment): Map<string, XYPosition> {
  const positions = new Map(nodes.map((node) => [node.id, { ...node.position }]))
  if (nodes.length < 2 || (alignment.startsWith('gap-') && nodes.length < 3)) return positions

  const measured = nodes.map((node) => ({ node, size: nodeLayoutSize(node.data.kind, node) }))
  const left = Math.min(...measured.map(({ node }) => node.position.x))
  const right = Math.max(...measured.map(({ node, size }) => node.position.x + size.width))
  const top = Math.min(...measured.map(({ node }) => node.position.y))
  const bottom = Math.max(...measured.map(({ node, size }) => node.position.y + size.height))
  const horizontalCenter = (left + right) / 2
  const verticalCenter = (top + bottom) / 2

  if (alignment === 'gap-horizontal') {
    const ordered = [...measured].sort((a, b) => a.node.position.x - b.node.position.x)
    const totalWidth = ordered.reduce((sum, item) => sum + item.size.width, 0)
    const gap = (right - left - totalWidth) / (ordered.length - 1)
    let cursor = left
    ordered.forEach(({ node, size }) => {
      positions.set(node.id, { ...node.position, x: cursor })
      cursor += size.width + gap
    })
    return positions
  }

  if (alignment === 'gap-vertical') {
    const ordered = [...measured].sort((a, b) => a.node.position.y - b.node.position.y)
    const totalHeight = ordered.reduce((sum, item) => sum + item.size.height, 0)
    const gap = (bottom - top - totalHeight) / (ordered.length - 1)
    let cursor = top
    ordered.forEach(({ node, size }) => {
      positions.set(node.id, { ...node.position, y: cursor })
      cursor += size.height + gap
    })
    return positions
  }

  measured.forEach(({ node, size }) => {
    const position = { ...node.position }
    if (alignment === 'left') position.x = left
    if (alignment === 'center') position.x = horizontalCenter - size.width / 2
    if (alignment === 'right') position.x = right - size.width
    if (alignment === 'top') position.y = top
    if (alignment === 'middle') position.y = verticalCenter - size.height / 2
    if (alignment === 'bottom') position.y = bottom - size.height
    positions.set(node.id, position)
  })
  return positions
}

const intersects = (position: XYPosition, size: NodeLayoutSize, node: StudioNode, gap: number) => {
  if (node.data.kind === 'frame') return false
  const other = nodeLayoutSize(node.data.kind, node)
  return position.x < node.position.x + other.width + gap
    && position.x + size.width + gap > node.position.x
    && position.y < node.position.y + other.height + gap
    && position.y + size.height + gap > node.position.y
}

export interface DuplicateNodePlacement {
  position: XYPosition
  duplicateRootId: string
  duplicateStackIndex: number
}

/** Stack duplicates from the latest unmoved first duplicate; moving that anchor resets the chain. */
export function duplicateNodePosition(source: StudioNode, nodes: StudioNode[], gap = 40): DuplicateNodePlacement {
  const size = nodeLayoutSize(source.data.kind, source)
  const duplicateRootId = typeof source.data.duplicateRootId === 'string' ? source.data.duplicateRootId : source.id
  const firstPosition = { x: source.position.x + size.width + gap, y: source.position.y }
  const duplicates = nodes.filter((node) => node.data.duplicateRootId === duplicateRootId)
  const firstDuplicates = duplicates.filter((node) => node.data.duplicateStackIndex === 1)
  const activeFirst = firstDuplicates.at(-1)
  if (!activeFirst) return { position: firstPosition, duplicateRootId, duplicateStackIndex: 1 }
  const expectedFirst = activeFirst.data.duplicateExpectedPosition as XYPosition | undefined
  if (!expectedFirst || activeFirst.position.x !== expectedFirst.x || activeFirst.position.y !== expectedFirst.y) {
    return { position: firstPosition, duplicateRootId, duplicateStackIndex: 1 }
  }
  const activeStart = duplicates.lastIndexOf(activeFirst)
  const activeChain = duplicates.slice(activeStart)
  const previous = activeChain.at(-1)!
  const previousExpected = previous.data.duplicateExpectedPosition as XYPosition | undefined || previous.position
  const duplicateStackIndex = typeof previous.data.duplicateStackIndex === 'number' ? previous.data.duplicateStackIndex + 1 : activeChain.length + 1
  return {
    position: { x: previousExpected.x + gap, y: previousExpected.y + gap },
    duplicateRootId,
    duplicateStackIndex,
  }
}

/** Find the closest deterministic empty slot around a requested canvas position. */
export function findOpenNodePosition(desired: XYPosition, kind: NodeKind, nodes: StudioNode[], gap = 32): XYPosition {
  const size = nodeLayoutSize(kind)
  const open = (candidate: XYPosition) => !nodes.some((node) => intersects(candidate, size, node, gap))
  if (open(desired)) return desired

  const stepX = size.width + gap
  const stepY = Math.min(size.height, 520) + gap
  for (let radius = 1; radius <= 14; radius += 1) {
    const candidates: XYPosition[] = []
    for (let x = -radius; x <= radius; x += 1) {
      candidates.push({ x: desired.x + x * stepX, y: desired.y - radius * stepY })
      candidates.push({ x: desired.x + x * stepX, y: desired.y + radius * stepY })
    }
    for (let y = -radius + 1; y < radius; y += 1) {
      candidates.push({ x: desired.x - radius * stepX, y: desired.y + y * stepY })
      candidates.push({ x: desired.x + radius * stepX, y: desired.y + y * stepY })
    }
    candidates.sort((a, b) => {
      const aDistance = (a.x - desired.x) ** 2 + (a.y - desired.y) ** 2
      const bDistance = (b.x - desired.x) ** 2 + (b.y - desired.y) ** 2
      if (aDistance !== bDistance) return aDistance - bDistance
      // Equal-distance upstream slots prefer above, then the least horizontal
      // displacement, keeping generated dependency columns visually aligned.
      if (a.y !== b.y) return a.y - b.y
      return Math.abs(a.x - desired.x) - Math.abs(b.x - desired.x)
    })
    const match = candidates.find(open)
    if (match) return match
  }
  return { x: desired.x + (nodes.length + 1) * stepX, y: desired.y }
}

/**
 * Place an automatically-created linked node in a clean pane around its
 * anchor. Direction is a strong workflow weight, while graph expansion and
 * distance can still overrule it when that side is genuinely unsuitable.
 */
export function findClosestOpenPanePosition(target: StudioNode, kind: NodeKind, nodes: StudioNode[], direction: 'upstream' | 'downstream' = 'upstream', gap = 45): XYPosition {
  const sourceSize = nodeLayoutSize(kind)
  const targetSize = nodeLayoutSize(target.data.kind, target)
  const left = target.position.x - sourceSize.width - gap
  const right = target.position.x + targetSize.width + gap
  const above = target.position.y - sourceSize.height - gap
  const below = target.position.y + targetSize.height + gap
  const obstacles = nodes.filter((node) => node.data.kind !== 'frame')
  const directionalPeers = obstacles
    .filter((node) => node.id !== target.id)
    .filter((node) => {
      const size = nodeLayoutSize(node.data.kind, node)
      return direction === 'upstream'
        ? node.position.x + size.width <= target.position.x
        : node.position.x >= target.position.x + targetSize.width
    })
    .sort((a, b) => {
      const distance = (node: StudioNode) => {
        const size = nodeLayoutSize(node.data.kind, node)
        const dx = node.position.x + size.width / 2 - (target.position.x + targetSize.width / 2)
        const dy = node.position.y + size.height / 2 - (target.position.y + targetSize.height / 2)
        return dx ** 2 + dy ** 2
      }
      return distance(a) - distance(b)
    })
  const nearestPeer = directionalPeers[0]
  const alignedCandidates = nearestPeer ? (() => {
    const peerSize = nodeLayoutSize(nearestPeer.data.kind, nearestPeer)
    const side = direction === 'upstream' ? 'left' : 'right'
    return [
      { position: { x: nearestPeer.position.x, y: nearestPeer.position.y - sourceSize.height - gap }, pane: `aligned-${side}-above`, priority: -2, aligned: true },
      { position: { x: nearestPeer.position.x, y: nearestPeer.position.y + peerSize.height + gap }, pane: `aligned-${side}-below`, priority: -1, aligned: true },
    ].filter(({ position }) => Math.abs(position.y + sourceSize.height / 2 - (target.position.y + targetSize.height / 2)) <= targetSize.height + sourceSize.height + gap)
  })() : []
  const candidates = [
    ...alignedCandidates,
    { position: { x: left, y: target.position.y }, pane: 'left', priority: 0, aligned: false },
    { position: { x: target.position.x, y: above }, pane: 'above', priority: 1, aligned: false },
    { position: { x: right, y: target.position.y }, pane: 'right', priority: 2, aligned: false },
    { position: { x: target.position.x, y: below }, pane: 'below', priority: 3, aligned: false },
    { position: { x: left, y: above }, pane: 'upper-left', priority: 4, aligned: false },
    { position: { x: right, y: above }, pane: 'upper-right', priority: 5, aligned: false },
    { position: { x: left, y: below }, pane: 'lower-left', priority: 6, aligned: false },
    { position: { x: right, y: below }, pane: 'lower-right', priority: 7, aligned: false },
  ]
  const open = candidates.filter(({ position }) => !obstacles.some((node) => intersects(position, sourceSize, node, gap)))
  if (!open.length) return findOpenNodePosition({ x: left, y: target.position.y }, kind, nodes, gap)

  const graphLeft = Math.min(...obstacles.map((node) => node.position.x))
  const graphTop = Math.min(...obstacles.map((node) => node.position.y))
  const graphRight = Math.max(...obstacles.map((node) => node.position.x + nodeLayoutSize(node.data.kind, node).width))
  const graphBottom = Math.max(...obstacles.map((node) => node.position.y + nodeLayoutSize(node.data.kind, node).height))
  const graphArea = Math.max(1, graphRight - graphLeft) * Math.max(1, graphBottom - graphTop)
  const targetCenter = { x: target.position.x + targetSize.width / 2, y: target.position.y + targetSize.height / 2 }
  const distanceScale = Math.max(1, (sourceSize.width + sourceSize.height + targetSize.width + targetSize.height + gap) ** 2)
  const directionWeight = (pane: string) => {
    const upstreamWeights: Record<string, number> = {
      'aligned-left-above': 0, 'aligned-left-below': 0.2,
      left: 0, 'upper-left': 0.08, 'lower-left': 0.1, above: 0.42, below: 0.48,
      right: 0.78, 'upper-right': 0.86, 'lower-right': 0.9,
    }
    const downstreamWeights: Record<string, number> = {
      'aligned-right-above': 0, 'aligned-right-below': 0.2,
      right: 0, 'upper-right': 0.08, 'lower-right': 0.1, above: 0.42, below: 0.48,
      left: 0.78, 'upper-left': 0.86, 'lower-left': 0.9,
    }
    return (direction === 'upstream' ? upstreamWeights : downstreamWeights)[pane] ?? 1
  }

  return open.sort((a, b) => {
    const score = ({ position, pane, priority, aligned }: (typeof open)[number]) => {
      const expandedLeft = Math.min(graphLeft, position.x)
      const expandedTop = Math.min(graphTop, position.y)
      const expandedRight = Math.max(graphRight, position.x + sourceSize.width)
      const expandedBottom = Math.max(graphBottom, position.y + sourceSize.height)
      const expansion = (expandedRight - expandedLeft) * (expandedBottom - expandedTop) - graphArea
      const sourceCenter = { x: position.x + sourceSize.width / 2, y: position.y + sourceSize.height / 2 }
      const distance = (sourceCenter.x - targetCenter.x) ** 2 + (sourceCenter.y - targetCenter.y) ** 2
      const weighted = directionWeight(pane) + (expansion / graphArea) * 0.35 + (distance / distanceScale) * 0.12 - (aligned ? 0.24 : 0)
      return [weighted, expansion, distance, priority] as const
    }
    const aScore = score(a)
    const bScore = score(b)
    return aScore[0] - bScore[0] || aScore[1] - bScore[1] || aScore[2] - bScore[2] || aScore[3] - bScore[3]
  })[0].position
}

/** Repair only the former auto-layout bug; ordinary user-positioned linked pairs are preserved. */
export function normalizeLinkedNodeSpacing(nodes: StudioNode[]): StudioNode[] {
  let normalized = nodes
  for (const style of nodes.filter((node) => node.data.kind === 'style-reference' && node.data.linkedStoryboardId)) {
    const storyboard = normalized.find((node) => node.id === style.data.linkedStoryboardId && node.data.kind === 'storyboard')
    if (!storyboard) continue
    const horizontalDistance = storyboard.position.x - style.position.x
    const verticalDistance = Math.abs(storyboard.position.y - style.position.y)
    if (horizontalDistance <= 720 && verticalDistance <= 520) continue
    const desired = { x: storyboard.position.x - 360, y: storyboard.position.y + 28 }
    const others = normalized.filter((node) => node.id !== style.id && node.id !== storyboard.id)
    const open = findOpenNodePosition(desired, 'style-reference', others)
    if (open.x !== desired.x || open.y !== desired.y) continue
    normalized = normalized.map((node) => node.id === style.id ? { ...node, position: desired } : node)
  }
  return normalized
}
