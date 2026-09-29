import { describe, expect, it } from 'vitest'
import { magneticNodePosition, placeEqualGapLabels } from './magneticGuides'

describe('Illustrator-style magnetic guides', () => {
  it('previews within 35px but snaps only within 10px', () => {
    const target = { id: 'target', x: 200, y: 100, width: 100, height: 80 }
    const preview = magneticNodePosition({ id: 'moving', x: 165, y: 230, width: 100, height: 80 }, [target], 35, 10)
    expect(preview.position.x).toBe(165)
    expect(preview.guides.some((guide) => guide.orientation === 'vertical')).toBe(true)
    const snapped = magneticNodePosition({ id: 'moving', x: 193, y: 230, width: 100, height: 80 }, [target], 35, 10)
    expect(snapped.position.x).toBe(200)
  })

  it('snaps a node to equal horizontal and vertical gaps', () => {
    const horizontal = magneticNodePosition(
      { id: 'moving', x: 103, y: 0, width: 40, height: 40 },
      [{ id: 'left', x: 0, y: 0, width: 40, height: 40 }, { id: 'right', x: 200, y: 0, width: 40, height: 40 }],
      50, 10,
    )
    expect(horizontal.position.x).toBe(100)
    expect(horizontal.guides.filter((guide) => guide.kind === 'equal-gap')).toHaveLength(2)
    const vertical = magneticNodePosition(
      { id: 'moving', x: 0, y: 103, width: 40, height: 40 },
      [{ id: 'top', x: 0, y: 0, width: 40, height: 40 }, { id: 'bottom', x: 0, y: 200, width: 40, height: 40 }],
      50, 10,
    )
    expect(vertical.position.y).toBe(100)
  })

  it('continues an existing equal gap before or after a pair', () => {
    const after = magneticNodePosition(
      { id: 'moving', x: 208, y: 0, width: 40, height: 40 },
      [{ id: 'first', x: 0, y: 0, width: 40, height: 40 }, { id: 'second', x: 100, y: 0, width: 40, height: 40 }],
      50, 10,
    )
    expect(after.position.x).toBe(200)
    expect(after.guides.filter((guide) => guide.kind === 'equal-gap')).toHaveLength(2)
  })

  it('recommends the closest node before a distant node with a smaller anchor offset', () => {
    const result = magneticNodePosition(
      { id: 'moving', x: 100, y: 100, width: 100, height: 80 },
      [
        { id: 'near-video', x: 215, y: 105, width: 100, height: 80 },
        { id: 'far-list', x: 101, y: 900, width: 100, height: 80 },
      ],
      50, 10,
    )
    expect(result.position.x).toBe(100)
    expect(result.guides.find((guide) => guide.orientation === 'vertical')?.position).toBe(215)
  })

  it('never recommends a Storyboard top edge for a List bottom edge', () => {
    const result = magneticNodePosition(
      { id: 'list', x: 100, y: 300, width: 100, height: 100 },
      [
        { id: 'video', x: 225, y: 260, width: 100, height: 150 },
        { id: 'storyboard', x: 100, y: 400, width: 100, height: 500 },
      ],
      50, 10,
    )
    const horizontalGuide = result.guides.find((guide) => guide.orientation === 'horizontal' && guide.kind === 'alignment')
    expect(horizontalGuide?.position).toBe(410)
    expect(result.position.y).toBe(310)
  })

  it('reserves center guides exclusively for center-to-center alignment', () => {
    const result = magneticNodePosition(
      { id: 'moving', x: 100, y: 100, width: 100, height: 100 },
      [{ id: 'target', x: 145, y: 145, width: 100, height: 100 }],
      50, 10,
    )
    expect(result.position).toEqual({ x: 100, y: 100 })
    expect(result.guides.some((guide) => guide.position === 195)).toBe(false)

    const centered = magneticNodePosition(
      { id: 'moving', x: 104, y: 104, width: 100, height: 100 },
      [{ id: 'target', x: 100, y: 100, width: 100, height: 100 }],
      50, 10,
    )
    expect(centered.position).toEqual({ x: 100, y: 100 })
  })

  it('prefers a closer equal-gap correction and ignores unrelated rows', () => {
    const result = magneticNodePosition(
      { id: 'moving', x: 103, y: 0, width: 40, height: 40 },
      [
        { id: 'left', x: 0, y: 0, width: 40, height: 40 },
        { id: 'right', x: 200, y: 0, width: 40, height: 40 },
        { id: 'other-row', x: 123, y: 400, width: 40, height: 40 },
      ],
      35, 10,
    )
    expect(result.position.x).toBe(100)
    expect(result.guides.filter((guide) => guide.kind === 'equal-gap')).toHaveLength(2)
  })

  it('keeps equal-distribution preview at 80px when alignment preview is 35px', () => {
    const result = magneticNodePosition(
      { id: 'moving', x: 275, y: 0, width: 40, height: 40 },
      [{ id: 'left', x: 0, y: 0, width: 40, height: 40 }, { id: 'right', x: 400, y: 0, width: 40, height: 40 }],
      35, 10, 80,
    )
    expect(result.position.x).toBe(275)
    const gaps = result.guides.filter((guide) => guide.kind === 'equal-gap')
    expect(gaps).toHaveLength(2)
    expect(gaps.map((guide) => guide.label)).toEqual(['235px', '85px'])
  })

  it('shows equal live gap values once the node enters snap range', () => {
    const result = magneticNodePosition(
      { id: 'moving', x: 205, y: 0, width: 40, height: 40 },
      [{ id: 'left', x: 0, y: 0, width: 40, height: 40 }, { id: 'right', x: 400, y: 0, width: 40, height: 40 }],
      35, 10, 80,
    )
    expect(result.position.x).toBe(200)
    expect(result.guides.filter((guide) => guide.kind === 'equal-gap').map((guide) => guide.label)).toEqual(['160px', '160px'])
  })

  it('keeps the equal-gap meter visible when snapping ties an alignment correction', () => {
    const result = magneticNodePosition(
      { id: 'moving', x: 0, y: 100, width: 40, height: 40 },
      [
        { id: 'top', x: 0, y: 0, width: 40, height: 40 },
        { id: 'bottom', x: 0, y: 200, width: 40, height: 40 },
        { id: 'aligned-nearby', x: 60, y: 100, width: 40, height: 40 },
      ],
      35, 10, 80,
    )
    expect(result.position.y).toBe(100)
    expect(result.guides.filter((guide) => guide.kind === 'equal-gap')).toHaveLength(2)
  })

  it('returns equal-gap guides continuously before, through, and after the snap coordinate', () => {
    const positions = [88, 94, 99, 100, 101, 106, 112]
    const guideCounts = positions.map((y) => magneticNodePosition(
      { id: 'moving', x: 0, y, width: 40, height: 40 },
      [{ id: 'top', x: 0, y: 0, width: 40, height: 40 }, { id: 'bottom', x: 0, y: 200, width: 40, height: 40 }],
      35, 10, 80,
    ).guides.filter((guide) => guide.kind === 'equal-gap').length)
    expect(guideCounts).toEqual([2, 2, 2, 2, 2, 2, 2])
  })

  it('limits automatic equalization to a 300px actual gap', () => {
    const withinLimit = magneticNodePosition(
      { id: 'moving', x: 680, y: 0, width: 40, height: 40 },
      [{ id: 'first', x: 0, y: 0, width: 40, height: 40 }, { id: 'second', x: 340, y: 0, width: 40, height: 40 }],
      35, 10, 80, 300,
    )
    expect(withinLimit.guides.filter((guide) => guide.kind === 'equal-gap')).toHaveLength(2)

    const overLimit = magneticNodePosition(
      { id: 'moving', x: 721, y: 0, width: 40, height: 40 },
      [{ id: 'first', x: 0, y: 0, width: 40, height: 40 }, { id: 'second', x: 360, y: 0, width: 40, height: 40 }],
      35, 10, 80, 300,
    )
    expect(overLimit.guides.filter((guide) => guide.kind === 'equal-gap')).toHaveLength(0)

    const liveGapOverLimit = magneticNodePosition(
      { id: 'moving', x: 699, y: 0, width: 40, height: 40 },
      [{ id: 'first', x: 0, y: 0, width: 40, height: 40 }, { id: 'second', x: 340, y: 0, width: 40, height: 40 }],
      35, 10, 80, 300,
    )
    expect(liveGapOverLimit.guides.filter((guide) => guide.kind === 'equal-gap')).toHaveLength(0)
  })

  it('keeps Gallery equalization on its true Storyboard row instead of admitting Video above it', () => {
    const result = magneticNodePosition(
      { id: 'gallery', x: 620, y: 335, width: 185, height: 132 },
      [
        { id: 'style', x: 112, y: 335, width: 183, height: 132 },
        { id: 'storyboard', x: 364, y: 335, width: 183, height: 500 },
        { id: 'video', x: 355, y: 80, width: 206, height: 207 },
      ],
      35, 10, 80, 300,
    )
    const gaps = result.guides.filter((guide) => guide.kind === 'equal-gap')
    expect(gaps).toHaveLength(2)
    expect(gaps[0]).toMatchObject({ from: 295, to: 364 })
    expect(gaps[1]).toMatchObject({ from: 547, to: 616 })
    expect(result.position.x).toBe(616)
  })

  it('moves a vertical gap label beside an overlapping toolbar and restores its default when clear', () => {
    const guide = { orientation: 'vertical' as const, position: 100, from: 100, to: 150, kind: 'equal-gap' as const, label: '50px' }
    const beside = placeEqualGapLabels([guide], {
      zoom: 1, viewportX: 0, viewportY: 0, canvasLeft: 0, canvasTop: 0, viewportWidth: 800,
      toolbar: { left: 70, top: 110, right: 180, bottom: 140 },
    })
    expect(beside[0].labelPlacement).toBe('toolbar-right')
    expect(beside[0].labelOffset).toBe(86)

    const restored = placeEqualGapLabels([guide], {
      zoom: 1, viewportX: 0, viewportY: 0, canvasLeft: 0, canvasTop: 0, viewportWidth: 800,
      toolbar: { left: 70, top: 10, right: 180, bottom: 40 },
    })
    expect(restored[0].labelPlacement).toBeUndefined()
  })
})
