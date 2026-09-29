import { describe, expect, it } from 'vitest'
import { nodeCreationDefaults } from './nodeDefaults'

describe('new node defaults', () => {
  it('starts reusable semantic assets in truthful formats and counts', () => {
    expect(nodeCreationDefaults('character')).toEqual({ aspectRatio: '2:3', quantity: 1 })
    expect(nodeCreationDefaults('location')).toEqual({ aspectRatio: '16:9', quantity: 1 })
    expect(nodeCreationDefaults('element')).toEqual({ aspectRatio: '1:1', quantity: 4 })
  })
})
