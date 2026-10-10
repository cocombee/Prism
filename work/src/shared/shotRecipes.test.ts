import { describe, expect, it } from 'vitest'
import { quantifiedCameraRecipe, shotRecipeDetails, shotFov, shotFovDegrees } from './shotRecipes'

describe('shot FOV executable metadata', () => {
  it('exposes exact numeric FOV while preserving display strings', () => {
    expect(shotFovDegrees('establishing')).toBe(84)
    expect(shotFovDegrees('wide')).toBe(63)
    expect(shotFovDegrees('medium')).toBe(47)
    expect(shotFovDegrees('close-up')).toBe(29)
    expect(shotFovDegrees('detail')).toBe(8)
    expect(shotFovDegrees('future-size')).toBeUndefined()
    expect(shotFov('wide')).toBe('63° wide')
    expect(shotFov('close-up')).toBe('29° portrait compression')
  })

})


describe('physical camera mechanisms from inspected multi-shot prompt patterns', () => {
  it('distinguishes fixed-station horizontal pan from translating orbit', () => {
    expect(quantifiedCameraRecipe('pan-left')).toContain('fixed camera station')
    expect(quantifiedCameraRecipe('pan-left')).toContain('Rotate horizontally left')
    expect(quantifiedCameraRecipe('orbit-left')).toContain('Translate left around')
    expect(quantifiedCameraRecipe('orbit-left')).toContain('perspective and occlusion change')
    expect(shotRecipeDetails('camera', 'pan-left').version).toBe('camera-pan-left-physical-v2')
  })

  it('distinguishes tilt from vertical travel and roll from both', () => {
    expect(quantifiedCameraRecipe('tilt-down')).toContain('retain camera position rather than lift or lower')
    expect(quantifiedCameraRecipe('pedestal-down')).toContain('Translate the camera straight down')
    expect(quantifiedCameraRecipe('roll-clockwise')).toContain('around the optical axis')
  })

  it('compiles the selected dolly-zoom with opposing optical and physical operations', () => {
    expect(quantifiedCameraRecipe('dolly-zoom-in')).toContain('Translate toward')
    expect(quantifiedCameraRecipe('dolly-zoom-in')).toContain('shortening focal length')
    expect(quantifiedCameraRecipe('dolly-zoom-out')).toContain('Translate away')
    expect(quantifiedCameraRecipe('dolly-zoom-out')).toContain('lengthening focal length')
    expect(quantifiedCameraRecipe('zoom-in')).toContain('fixed camera station')
    expect(quantifiedCameraRecipe('zoom-in')).toContain('parallax unchanged')
  })

  it('preserves selected half/full extent while leaving radius and timing unauthored', () => {
    expect(quantifiedCameraRecipe('half-orbit-right')).toContain('a half circuit')
    expect(quantifiedCameraRecipe('full-orbit-right')).toContain('a full circuit')
    expect(quantifiedCameraRecipe('orbit-right')).toContain('the authored arc')
    expect(quantifiedCameraRecipe('full-orbit-right')).not.toMatch(/\d+(?:m|mm|s|°)/)
  })

  it('gives tracking and POV their selected relationship without inventing travel for POV', () => {
    expect(quantifiedCameraRecipe('follow')).toContain('authored subject route')
    expect(quantifiedCameraRecipe('lead')).toContain('Retreat ahead of the advancing subject')
    expect(quantifiedCameraRecipe('point-of-view')).toContain('rather than inferred from the POV label')
  })
})
