import { describe, expect, it } from 'vitest'
import { minimapCornerRadiusForZoom, responsiveMinimapSize, roundedMinimapMaskPath } from './minimapGeometry'

describe('roundedMinimapMaskPath', () => {
  it('replaces only the viewport rectangle with a true rounded path', () => {
    const source = 'M-20,-10h300v200h-300z\nM10,20h100v60h-100z'
    const result = roundedMinimapMaskPath(source, 8)

    expect(result).toContain('M-20,-10h300v200h-300z')
    expect(result).toContain('M18,20 H102 Q110,20 110,28')
    expect(result).toContain('Q10,20 18,20 Z')
    expect(result).not.toContain('M10,20h100v60h-100z')
  })

  it('leaves an unknown path unchanged', () => {
    expect(roundedMinimapMaskPath('M0,0L10,10', 8)).toBe('M0,0L10,10')
  })
})

describe('minimapCornerRadiusForZoom', () => {
  it('smoothly reduces the radius to one-third at maximum zoom', () => {
    expect(minimapCornerRadiusForZoom(0.2)).toBe(10)
    expect(minimapCornerRadiusForZoom(2.3)).toBeCloseTo(20 / 3)
    expect(minimapCornerRadiusForZoom(4.4)).toBeCloseTo(10 / 3)
  })

  it('clamps the radius outside the supported zoom range', () => {
    expect(minimapCornerRadiusForZoom(0)).toBe(10)
    expect(minimapCornerRadiusForZoom(5)).toBeCloseTo(10 / 3)
  })
})

describe('responsiveMinimapSize', () => {
  it('keeps height fixed while adapting width to the live canvas aspect ratio', () => {
    expect(responsiveMinimapSize(980, 720)).toEqual({ width: 155.2, height: 114 })
    expect(responsiveMinimapSize(1600, 900)).toEqual({ width: 202.7, height: 114 })
    expect(responsiveMinimapSize(440, 700)).toEqual({ width: 71.7, height: 114 })
    expect(responsiveMinimapSize(3000, 900)).toEqual({ width: 240, height: 114 })
  })

  it('falls back safely when layout has not measured yet', () => {
    expect(responsiveMinimapSize(0, 0)).toEqual({ width: 195, height: 114 })
  })
})
