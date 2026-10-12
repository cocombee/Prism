import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { expandGroupedPositionChanges, remapCopiedNodeGroups, toggleNodeGroup } from './canvasGrouping'

const node = (id: string, x: number, groupId?: string, locked = false): StudioNode => ({
  id,
  type: 'studio',
  position: { x, y: 20 },
  data: { kind: 'prompt', title: id, groupId, locked },
})

describe('canvas grouping', () => {
  it('gives each copied group an independent ID while retaining membership and leaving originals unchanged', () => {
    const original = [node('a', 0, 'first'), node('b', 100, 'first'), node('c', 200, 'second'), node('d', 300, 'second'), node('e', 400)]
    let next = 0
    const copies = remapCopiedNodeGroups(original.map(item => ({ ...item, id: item.id + '-copy' })), () => `copy-${++next}`)
    expect(copies.map(item => item.data.groupId)).toEqual(['copy-1', 'copy-1', 'copy-2', 'copy-2', undefined])
    expect(original.map(item => item.data.groupId)).toEqual(['first', 'first', 'second', 'second', undefined])
    expect(next).toBe(2)
    expect(remapCopiedNodeGroups(original, () => `copy-${++next}`).map(item => item.data.groupId)).toEqual(['copy-3', 'copy-3', 'copy-4', 'copy-4', undefined])
  })

  it('clears a singleton partial-copy group and preserves a copied pair without tying it to the source group', () => {
    const original = [node('a', 0, 'source'), node('b', 100, 'source'), node('c', 200, 'source')]
    expect(remapCopiedNodeGroups([original[0]], () => 'unused')[0].data.groupId).toBeUndefined()
    expect(remapCopiedNodeGroups(original.slice(0, 2), () => 'pair').map(item => item.data.groupId)).toEqual(['pair', 'pair'])
    expect(original.every(item => item.data.groupId === 'source')).toBe(true)
  })

  it('ungroups the copies without ungrouping either original group', () => {
    const originals = [node('a', 0, 'source'), node('b', 100, 'source'), node('c', 200, 'other'), node('d', 300, 'other')]
    const copies = remapCopiedNodeGroups(originals.slice(0, 2).map(item => ({ ...item, id: item.id + '-copy' })), () => 'copied')
    const ungrouped = toggleNodeGroup([...originals, ...copies], ['a-copy'])
    expect(ungrouped.slice(0, 4).map(item => item.data.groupId)).toEqual(['source', 'source', 'other', 'other'])
    expect(ungrouped.slice(4).every(item => item.data.groupId === undefined)).toBe(true)
  })

  it('confines selection and movement to the copied group, retaining locked-member behavior', () => {
    const originals = [node('a', 0, 'source'), node('b', 100, 'source')]
    const copies = remapCopiedNodeGroups(originals.map(item => ({ ...item, id: item.id + '-copy' })), () => 'copied')
    const all = [...originals, ...copies]
    const selected = expandGroupedPositionChanges(all, [{ id: 'a-copy', type: 'select', selected: true }])
    expect(selected.map(change => 'id' in change && change.id)).toEqual(['a-copy', 'b-copy'])
    const moved = expandGroupedPositionChanges(all, [{ id: 'a-copy', type: 'position', position: { x: 40, y: 50 }, dragging: true }])
    expect(moved.map(change => 'id' in change && change.id)).toEqual(['a-copy', 'b-copy'])
    expect(expandGroupedPositionChanges([...originals, copies[0], { ...copies[1], data: { ...copies[1].data, locked: true } }], [{ id: 'a-copy', type: 'position', position: { x: 40, y: 50 }, dragging: true }])).toHaveLength(1)
  })

  it('changes only grouping metadata and retains authored bytes, media identity and settings', () => {
    const original: StudioNode = { ...node('a', 0, 'source'), data: { ...node('a', 0, 'source').data, prompt: '  literal @tag\r\nSecond line  ', manualPromptDraft: ' user\r\nbytes ', assetPath: '/fictional/asset.png', referenceTag: '@actor', duration: 7.5, frameRate: 24, motionCadence: 16 } }
    const [copy] = remapCopiedNodeGroups([original, node('b', 100, 'source')], () => 'new')
    expect({ ...copy, data: { ...copy.data, groupId: 'source' } }).toEqual(original)
    expect(original.data.groupId).toBe('source')
    expect(remapCopiedNodeGroups([node('solo', 0)])[0]).toEqual(node('solo', 0))
  })

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
