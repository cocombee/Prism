import { describe, expect, it } from 'vitest'
import { connectionGuidanceAppearance, shouldAnchorNodePort, shouldDeployNodePort } from './NodePort'

describe('occupied port visibility during typed connection guidance', () => {
  it('keeps an occupied port deployed at rest without requiring node selection', () => {
    expect(shouldDeployNodePort(true, 'idle')).toBe(true)
    expect(shouldDeployNodePort(false, 'idle')).toBe(false)
  })

  it('temporarily retracts an occupied incompatible endpoint during a live drag', () => {
    expect(shouldDeployNodePort(true, 'hidden')).toBe(false)
  })

  it('keeps every wire anchor pre-positioned at the deployed icon centre', () => {
    expect(shouldAnchorNodePort(true, 'idle')).toBe(true)
    expect(shouldAnchorNodePort(true, 'hidden')).toBe(true)
    expect(shouldAnchorNodePort(false, 'idle')).toBe(true)
    expect(shouldAnchorNodePort(false, 'hidden')).toBe(true)
  })

  it('keeps the origin and validator-approved endpoints deployed', () => {
    expect(shouldDeployNodePort(false, 'origin')).toBe(true)
    expect(shouldDeployNodePort(false, 'compatible')).toBe(true)
    expect(shouldDeployNodePort(false, 'accepting')).toBe(true)
  })

  it('restores the occupied endpoint when a rejected drag is cancelled', () => {
    expect(shouldDeployNodePort(true, 'hidden')).toBe(false)
    expect(shouldDeployNodePort(true, 'idle')).toBe(true)
  })

  it('does not classify same-direction output ports as incompatible candidates', () => {
    expect(connectionGuidanceAppearance('source', 'source', false, false, false)).toBe('idle')
    expect(connectionGuidanceAppearance('target', 'target', false, false, false)).toBe('idle')
  })

  it('hides only an incompatible opposite-direction endpoint', () => {
    expect(connectionGuidanceAppearance('target', 'source', false, false, false)).toBe('hidden')
    expect(connectionGuidanceAppearance('source', 'target', false, false, false)).toBe('hidden')
  })

  it('keeps the origin and compatible opposite-direction endpoints available', () => {
    expect(connectionGuidanceAppearance('source', 'source', true, false, false)).toBe('origin')
    expect(connectionGuidanceAppearance('target', 'source', false, true, false)).toBe('compatible')
    expect(connectionGuidanceAppearance('target', 'source', false, true, true)).toBe('accepting')
  })
})
