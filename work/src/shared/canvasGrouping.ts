import type { NodeChange } from '@xyflow/react'
import type { StudioNode } from './types'

export function toggleNodeGroup(nodes: StudioNode[], nodeIds: string[], groupId: string = crypto.randomUUID()): StudioNode[] {
  const selected = new Set(nodeIds)
  const selectedNodes = nodes.filter((node) => selected.has(node.id))
  if (!selectedNodes.length) return nodes

  const existingGroups = new Set(selectedNodes.map((node) => node.data.groupId).filter((value): value is string => typeof value === 'string' && Boolean(value)))
  const ungroupId = existingGroups.size === 1 ? [...existingGroups][0] : undefined
  if (ungroupId && selectedNodes.every((node) => node.data.groupId === ungroupId)) {
    return nodes.map((node) => node.data.groupId === ungroupId
      ? { ...node, data: { ...node.data, groupId: undefined } }
      : node)
  }
  if (selectedNodes.length < 2) return nodes
  return nodes.map((node) => {
    if (selected.has(node.id)) return { ...node, data: { ...node.data, groupId } }
    if (typeof node.data.groupId === 'string' && existingGroups.has(node.data.groupId)) return { ...node, data: { ...node.data, groupId: undefined } }
    return node
  })
}

type PositionChange = Extract<NodeChange<StudioNode>, { type: 'position' }>

/** React Flow moves the dragged node; this mirrors its delta to every unlocked group member. */
export function expandGroupedPositionChanges(nodes: StudioNode[], changes: NodeChange<StudioNode>[]): NodeChange<StudioNode>[] {
  const locked = new Set(nodes.filter((node) => node.data.locked).map((node) => node.id))
  let filtered = changes.filter((change) => !(change.type === 'position' && locked.has(change.id)))
  const affectedGroups = new Set<string>()
  const requestedSelection = new Map<string, boolean>()
  for (const change of filtered) {
    if (change.type !== 'select') continue
    const groupId = nodes.find((node) => node.id === change.id)?.data.groupId as string | undefined
    if (!groupId) continue
    affectedGroups.add(groupId)
    requestedSelection.set(change.id, change.selected)
  }
  const selectionIntent = new Map([...affectedGroups].map((groupId) => [groupId, nodes
    .filter((node) => node.data.groupId === groupId)
    .some((node) => requestedSelection.has(node.id) ? requestedSelection.get(node.id) : Boolean(node.selected))]))
  if (selectionIntent.size) {
    const groupedIds = new Set(nodes.filter((node) => typeof node.data.groupId === 'string' && selectionIntent.has(node.data.groupId)).map((node) => node.id))
    filtered = filtered.filter((change) => change.type !== 'select' || !groupedIds.has(change.id))
    for (const node of nodes) {
      const groupId = node.data.groupId as string | undefined
      if (!groupId || !selectionIntent.has(groupId)) continue
      filtered.push({ id: node.id, type: 'select', selected: selectionIntent.get(groupId)! })
    }
  }
  const changedIds = new Set(filtered.flatMap((change) => 'id' in change ? [change.id] : []))
  const additions: PositionChange[] = []
  const handledGroups = new Set<string>()

  for (const change of filtered) {
    if (change.type !== 'position' || !change.position) continue
    const anchor = nodes.find((node) => node.id === change.id)
    const groupId = anchor?.data.groupId as string | undefined
    if (!anchor || !groupId || handledGroups.has(groupId)) continue
    handledGroups.add(groupId)
    const dx = change.position.x - anchor.position.x
    const dy = change.position.y - anchor.position.y
    for (const member of nodes) {
      if (member.id === anchor.id || member.data.groupId !== groupId || locked.has(member.id) || changedIds.has(member.id)) continue
      additions.push({
        id: member.id,
        type: 'position',
        position: { x: member.position.x + dx, y: member.position.y + dy },
        dragging: change.dragging,
      })
      changedIds.add(member.id)
    }
  }
  return [...filtered, ...additions]
}
