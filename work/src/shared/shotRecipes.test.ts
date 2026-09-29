import { describe, expect, it } from 'vitest'
import { shotFov, shotFovDegrees } from './shotRecipes'

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
