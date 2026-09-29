import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { expandGroupedPositionChanges, toggleNodeGroup } from './canvasGrouping'

const node = (id: string, x: number, groupId?: string, locked = false): StudioNode => ({
  id,
  type: 'studio',
  position: { x, y: 20 },
  data: { kind: 'prompt', title: id, groupId, locked },
})

describe('canvas grouping', () => {
  it('groups a multi-node selection and ungroups the whole group from one member', () => {
    const grouped = toggleNodeGroup([node('a', 0), node('b', 100), node('c', 200)], ['a', 'b'], 'group-1')
    expect(grouped[0].data.groupId).toBe('group-1')
    expect(grouped[1].data.groupId).toBe('group-1')
    expect(grouped[2].data.groupId).toBeUndefined()
    const ungrouped = toggleNodeGroup(grouped, ['a'])
    expect(ungrouped[0].data.groupId).toBeUndefined()
    expect(ungrouped[1].data.groupId).toBeUndefined()
  })

  it('moves every unlocked group member by the dragged node delta', () => {
    const changes = expandGroupedPositionChanges(
      [node('a', 0, 'group-1'), node('b', 100, 'group-1'), node('c', 200)],
      [{ id: 'a', type: 'position', position: { x: 40, y: 50 }, dragging: true }],
    )
    expect(changes).toContainEqual({ id: 'b', type: 'position', position: { x: 140, y: 50 }, dragging: true })
    expect(changes.some((change) => 'id' in change && change.id === 'c')).toBe(false)
  })

  it('does not move locked group members', () => {
    const changes = expandGroupedPositionChanges(
      [node('a', 0, 'group-1'), node('b', 100, 'group-1', true)],
      [{ id: 'a', type: 'position', position: { x: 40, y: 50 }, dragging: true }],
    )
    expect(changes.some((change) => 'id' in change && change.id === 'b')).toBe(false)
  })

  it('selects and deselects every member as one visual group', () => {
    const nodes = [node('a', 0, 'group-1'), node('b', 100, 'group-1'), node('c', 200)]
    const selected = expandGroupedPositionChanges(nodes, [{ id: 'a', type: 'select', selected: true }])
    expect(selected).toContainEqual({ id: 'a', type: 'select', selected: true })
    expect(selected).toContainEqual({ id: 'b', type: 'select', selected: true })
    const deselected = expandGroupedPositionChanges(nodes, [{ id: 'b', type: 'select', selected: false }])
    expect(deselected).toContainEqual({ id: 'a', type: 'select', selected: false })
    expect(deselected).toContainEqual({ id: 'b', type: 'select', selected: false })
  })

  it('cleanly detaches members left behind when regrouping', () => {
    const regrouped = toggleNodeGroup([node('a', 0, 'old'), node('b', 100, 'old'), node('c', 200)], ['a', 'c'], 'new')
    expect(regrouped.find((item) => item.id === 'a')?.data.groupId).toBe('new')
    expect(regrouped.find((item) => item.id === 'c')?.data.groupId).toBe('new')
    expect(regrouped.find((item) => item.id === 'b')?.data.groupId).toBeUndefined()
  })
})
