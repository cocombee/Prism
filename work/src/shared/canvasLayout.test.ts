import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { alignedNodePositions, centeredNodePosition, centeredStoryboardPairPositions, duplicateNodePosition, findClosestOpenPanePosition, findOpenNodePosition, nodeLayoutSize, normalizeLinkedNodeSpacing, normalizeStandardNodeWidths, STANDARD_NODE_WIDTH } from './canvasLayout'

const node = (id: string, x: number, y: number): StudioNode => ({
  id,
  type: 'studio',
  position: { x, y },
  data: { kind: 'image-generator', title: id },
})

describe('collision-aware node placement', () => {
  it('uses the standard 315px width for Video Generator layout', () => {
    expect(nodeLayoutSize('video-generator').width).toBe(315)
  })
  it('keeps an open requested position unchanged', () => {
    expect(findOpenNodePosition({ x: 900, y: 100 }, 'video-generator', [node('a', 0, 0)])).toEqual({ x: 900, y: 100 })
  })

  it('moves an automatically-created node away from an occupied position', () => {
    const desired = { x: 0, y: 0 }
    const placed = findOpenNodePosition(desired, 'image-generator', [node('a', 0, 0)])
    expect(placed).not.toEqual(desired)
    const size = nodeLayoutSize('image-generator')
    expect(Math.abs(placed.x) >= size.width || Math.abs(placed.y) >= size.height).toBe(true)
  })

  it('ignores visual frames as placement obstacles', () => {
    const frame: StudioNode = { id: 'frame', type: 'frame', position: { x: 0, y: 0 }, data: { kind: 'frame', title: 'Frame' }, style: { width: 900, height: 900 } }
    expect(findOpenNodePosition({ x: 100, y: 100 }, 'prompt', [frame])).toEqual({ x: 100, y: 100 })
  })

  it('keeps the intended Style and Storyboard pair at a natural nearby gap', () => {
    const style: StudioNode = { id: 'style', type: 'studio', position: { x: 160, y: 198 }, data: { kind: 'style-reference', title: 'Style' }, style: { width: 315, height: 390 } }
    expect(findOpenNodePosition({ x: 520, y: 170 }, 'storyboard', [style])).toEqual({ x: 520, y: 170 })
  })

  it('inherits the nearest upstream column left edge when its adjacent slot is open', () => {
    const target: StudioNode = { id: 'video', type: 'studio', position: { x: 390, y: 200 }, data: { kind: 'video-generator', title: 'Video' } }
    const occupiedLeftPane: StudioNode = { id: 'character', type: 'studio', position: { x: 0, y: 200 }, data: { kind: 'character', title: 'Character' }, style: { width: 315, height: 540 } }
    const occupiedRightPane: StudioNode = { id: 'list', type: 'list', position: { x: 795, y: 200 }, data: { kind: 'list', title: 'List' }, style: { width: 315, height: 420 } }

    expect(nodeLayoutSize('storyboard')).toEqual({ width: STANDARD_NODE_WIDTH, height: 180 })
    expect(findClosestOpenPanePosition(target, 'storyboard', [target, occupiedLeftPane, occupiedRightPane])).toEqual({ x: 0, y: -25 })
  })

  it('uses another open pane when every left-weighted upstream slot is blocked', () => {
    const target: StudioNode = { id: 'video', type: 'studio', position: { x: 390, y: 200 }, data: { kind: 'video-generator', title: 'Video' } }
    const leftBand: StudioNode = { id: 'left-band', type: 'studio', position: { x: 30, y: -250 }, data: { kind: 'character', title: 'Character' }, style: { width: 315, height: 1500 } }
    const above: StudioNode = { id: 'above', type: 'studio', position: { x: 390, y: -250 }, data: { kind: 'prompt', title: 'Prompt' }, style: { width: 315, height: 405 } }
    const below: StudioNode = { id: 'below', type: 'studio', position: { x: 390, y: 835 }, data: { kind: 'gallery', title: 'Gallery' }, style: { width: 315, height: 430 } }
    expect(findClosestOpenPanePosition(target, 'storyboard', [target, leftBand, above, below])).toEqual({ x: 750, y: 200 })
  })

  it('mirrors placement weighting toward the right for downstream nodes', () => {
    const source: StudioNode = { id: 'video', type: 'studio', position: { x: 390, y: 200 }, data: { kind: 'video-generator', title: 'Video' } }
    expect(findClosestOpenPanePosition(source, 'list', [source], 'downstream')).toEqual({ x: 750, y: 200 })
  })

  it('inherits the nearest downstream column left edge when direct-right is occupied', () => {
    const source: StudioNode = { id: 'video', type: 'studio', position: { x: 390, y: 200 }, data: { kind: 'video-generator', title: 'Video' } }
    const rightPeer: StudioNode = { id: 'list', type: 'list', position: { x: 795, y: 200 }, data: { kind: 'list', title: 'List' }, style: { width: 315, height: 420 } }
    expect(findClosestOpenPanePosition(source, 'gallery', [source, rightPeer], 'downstream')).toEqual({ x: 795, y: -275 })
  })

  it('centers new nodes and linked Storyboard pairs around the live viewport', () => {
    expect(centeredNodePosition({ x: 1000, y: 700 }, 'video-generator')).toEqual({ x: 842.5, y: 405 })
    const pair = centeredStoryboardPairPositions({ x: 1000, y: 700 })
    expect(pair.storyboard.x - pair.style.x).toBe(360)
    expect((pair.style.x + pair.storyboard.x + nodeLayoutSize('storyboard').width) / 2).toBe(1000)
  })

  it('uses Storyboard width globally while preserving adaptive and freeform exceptions', () => {
    for (const kind of ['storyboard', 'list', 'gallery', 'element', 'location', 'character', 'prompt', 'image-editor', 'upscaler'] as const) {
      expect(nodeLayoutSize(kind).width).toBe(STANDARD_NODE_WIDTH)
    }
    expect(nodeLayoutSize('router').width).toBe(150)
    expect(nodeLayoutSize('image-generator').width).toBe(360)
    expect(nodeLayoutSize('video-generator').width).toBe(315)

    const normalized = normalizeStandardNodeWidths([
      { ...node('list', 0, 0), data: { kind: 'list', title: 'List' }, style: { width: 420 }, measured: { width: 420, height: 400 } },
      { ...node('video', 0, 0), data: { kind: 'video-generator', title: 'Video' }, style: { width: 410 } },
      { ...node('frame', 0, 0), data: { kind: 'frame', title: 'Frame' }, style: { width: 700 } },
    ])
    expect(normalized[0].style?.width).toBe(STANDARD_NODE_WIDTH)
    expect(normalized[0].measured).toBeUndefined()
    expect(normalized[1].style?.width).toBe(410)
    expect(normalized[2].style?.width).toBe(700)
  })

  it('repairs only an implausibly distant auto-linked Style and Storyboard pair', () => {
    const style: StudioNode = { id: 'style', type: 'studio', position: { x: 0, y: 100 }, data: { kind: 'style-reference', title: 'Style', linkedStoryboardId: 'board' } }
    const board: StudioNode = { id: 'board', type: 'storyboard', position: { x: 1200, y: 100 }, data: { kind: 'storyboard', title: 'Storyboard' } }
    const repaired = normalizeLinkedNodeSpacing([style, board])
    expect(repaired.find((item) => item.id === 'style')?.position).toEqual({ x: 840, y: 128 })

    const alreadyNatural = normalizeLinkedNodeSpacing([{ ...style, position: { x: 840, y: 128 } }, board])
    expect(alreadyNatural.find((item) => item.id === 'style')?.position).toEqual({ x: 840, y: 128 })
  })

  it('aligns mixed-size selections and distributes equal visible gaps', () => {
    const first = { ...node('a', 10, 30), measured: { width: 100, height: 80 } }
    const middle = { ...node('b', 190, 90), measured: { width: 60, height: 40 } }
    const last = { ...node('c', 380, 10), measured: { width: 120, height: 100 } }

    expect(alignedNodePositions([first, middle, last], 'right').get('a')?.x).toBe(400)
    expect(alignedNodePositions([first, middle, last], 'top').get('b')?.y).toBe(10)
    expect(alignedNodePositions([first, middle, last], 'center').get('b')?.x).toBe(225)
    expect(alignedNodePositions([first, middle, last], 'center').get('a')?.y).toBe(30)
    expect(alignedNodePositions([first, middle, last], 'center').get('b')?.y).toBe(90)
    expect(alignedNodePositions([first, middle, last], 'center').get('c')?.y).toBe(10)
    expect(alignedNodePositions([first, middle, last], 'middle').get('a')?.x).toBe(10)
    expect(alignedNodePositions([first, middle, last], 'middle').get('b')?.x).toBe(190)
    expect(alignedNodePositions([first, middle, last], 'middle').get('c')?.x).toBe(380)
    expect(alignedNodePositions([first, middle, last], 'middle').get('b')?.y).toBe(50)

    const spaced = alignedNodePositions([first, middle, last], 'gap-horizontal')
    expect(spaced.get('a')?.x).toBe(10)
    expect(spaced.get('b')?.x).toBe(215)
    expect(spaced.get('c')?.x).toBe(380)

    const upper = { ...node('upper', 80, 10), measured: { width: 100, height: 40 } }
    const verticalMiddle = { ...node('vertical-middle', 20, 150), measured: { width: 60, height: 60 } }
    const lower = { ...node('lower', 140, 350), measured: { width: 120, height: 50 } }
    const verticallySpaced = alignedNodePositions([upper, verticalMiddle, lower], 'gap-vertical')
    expect(verticallySpaced.get('upper')?.y).toBe(10)
    expect(verticallySpaced.get('vertical-middle')?.y).toBe(170)
    expect(verticallySpaced.get('lower')?.y).toBe(350)
  })

  it('stacks unmoved duplicates by 40px right and down, then resets after the first duplicate moves', () => {
    const source = node('source', 100, 200)
    const width = nodeLayoutSize(source.data.kind, source).width
    const firstPlacement = duplicateNodePosition(source, [source])
    expect(firstPlacement).toEqual({ position: { x: 100 + width + 40, y: 200 }, duplicateRootId: 'source', duplicateStackIndex: 1 })

    const firstDuplicate = { ...node('copy-1', firstPlacement.position.x, firstPlacement.position.y), data: { ...node('copy-1', 0, 0).data, duplicateRootId: 'source', duplicateStackIndex: 1, duplicateExpectedPosition: firstPlacement.position } }
    const secondPlacement = duplicateNodePosition(source, [source, firstDuplicate])
    expect(secondPlacement).toEqual({ position: { x: firstPlacement.position.x + 40, y: firstPlacement.position.y + 40 }, duplicateRootId: 'source', duplicateStackIndex: 2 })

    const secondDuplicate = { ...node('copy-2', secondPlacement.position.x, secondPlacement.position.y), data: { ...node('copy-2', 0, 0).data, duplicateRootId: 'source', duplicateStackIndex: 2, duplicateExpectedPosition: secondPlacement.position } }
    expect(duplicateNodePosition(source, [source, firstDuplicate, secondDuplicate])).toEqual({ position: { x: secondPlacement.position.x + 40, y: secondPlacement.position.y + 40 }, duplicateRootId: 'source', duplicateStackIndex: 3 })

    const movedFirst = { ...firstDuplicate, position: { x: firstDuplicate.position.x + 200, y: firstDuplicate.position.y + 100 } }
    expect(duplicateNodePosition(source, [source, movedFirst, secondDuplicate])).toEqual({ position: firstPlacement.position, duplicateRootId: 'source', duplicateStackIndex: 1 })
  })
})
