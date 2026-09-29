import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectHorizontalCarriers, detectRoundCarrier } from './artworkComposite'

function fixture(width = 512, height = 384): Buffer {
  const pixels = Buffer.alloc(width * height * 3, 42)
  const paint = (left: number, top: number, boxWidth: number, boxHeight: number, value: number) => {
    for (let y = top; y < top + boxHeight; y += 1) for (let x = left; x < left + boxWidth; x += 1) {
      const at = (y * width + x) * 3
      pixels[at] = value; pixels[at + 1] = value - 8; pixels[at + 2] = value - 18
    }
  }
  paint(282, 78, 184, 40, 210)
  paint(258, 124, 222, 47, 206)
  paint(232, 177, 258, 52, 202)
  for (let y = 20; y < 100; y += 1) for (let x = 334; x < 414; x += 1) {
    const dx = x - 374; const dy = y - 60
    if (dx * dx + dy * dy < 36 * 36) {
      const at = (y * width + x) * 3
      pixels[at] = 220; pixels[at + 1] = 205; pixels[at + 2] = 180
    }
  }
  return pixels
}

describe('deterministic artwork carrier detection', () => {
  it('finds and orders a right-hand three-card staircase without reading its text', () => {
    const boxes = detectHorizontalCarriers(fixture(), 512, 384, 3, true)
    expect(boxes).toHaveLength(3)
    expect(boxes.map((box) => box.y)).toEqual([...boxes.map((box) => box.y)].sort((a, b) => a - b))
    expect(boxes[2].width).toBeGreaterThan(boxes[0].width)
    expect(boxes.every((box) => box.x + box.width / 2 > 256)).toBe(true)
    const centreGaps = boxes.slice(1).map((box, index) => (box.y + box.height / 2) - (boxes[index].y + boxes[index].height / 2))
    expect(Math.max(...centreGaps) - Math.min(...centreGaps)).toBeLessThan(18)
  })

  it('finds the bright circular carrier independently of the cards', async () => {
    const circle = await detectRoundCarrier(fixture(), 512, 384, true)
    expect(circle).not.toBeNull()
    expect(circle!.x + circle!.width / 2).toBeGreaterThan(256)
    expect(Math.abs(circle!.width - circle!.height)).toBeLessThanOrEqual(1)
  })

  it('prints transparent artwork directly over the carrier without an opaque blur plate', () => {
    const source = readFileSync(new URL('./artworkComposite.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('hasCarrierInk')
    expect(source).not.toContain("blend: 'multiply'")
    expect(source).not.toContain("blend: 'dest-in'")
    expect(source).toContain("blend: 'over'")
  })
})
