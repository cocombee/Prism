import * as THREE from 'three'
import type { CameraDocument, Transform, Vec3 } from './model'

export type SceneTreeGroup = { id: string; name: string; childIds: string[] }
export type SceneTree = {
  rootIds: string[]
  groups: Record<string, SceneTreeGroup>
  /** Local transforms. Migrated legacy entity transforms remain world-equivalent at roots. */
  localTransforms: Record<string, Transform>
}

const clone = <T>(value: T): T => structuredClone(value)
const identityTransform = (): Transform => ({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], anchor: [0, 0, 0] })
const groupTransform = (pivot: Vec3, rotation: Vec3): Transform => ({ position: clone(pivot), rotation: clone(rotation), scale: [1, 1, 1], anchor: [0, 0, 0] })
const radians = (value: Vec3) => new THREE.Euler(...value.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
const matrixFor = (value: Transform): THREE.Matrix4 => {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...value.position),
    new THREE.Quaternion().setFromEuler(radians(value.rotation)),
    new THREE.Vector3(...value.scale),
  )
  const anchor = value.anchor || [0, 0, 0]
  return matrix.multiply(new THREE.Matrix4().makeTranslation(-anchor[0], -anchor[1], -anchor[2]))
}
const cleanNumber = (value: number) => {
  if (Math.abs(value) < 1e-12) return 0
  const rounded = Math.round(value)
  return Math.abs(value - rounded) < 1e-12 ? rounded : value
}
const transformFor = (matrix: THREE.Matrix4): Transform => {
  const position = new THREE.Vector3(); const quaternion = new THREE.Quaternion(); const scale = new THREE.Vector3()
  matrix.decompose(position, quaternion, scale)
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')
  return {
    position: position.toArray().map(cleanNumber) as Vec3,
    rotation: [rotation.x, rotation.y, rotation.z].map((value) => cleanNumber(THREE.MathUtils.radToDeg(value))) as Vec3,
    scale: scale.toArray().map(cleanNumber) as Vec3,
    anchor: [0, 0, 0],
  }
}

function parentMap(tree: SceneTree): Map<string, string | null> {
  const result = new Map<string, string | null>(tree.rootIds.map((id) => [id, null]))
  for (const group of Object.values(tree.groups)) for (const childId of group.childIds) result.set(childId, group.id)
  return result
}

function worldMatrix(tree: SceneTree, nodeId: string): THREE.Matrix4 {
  const parents = parentMap(tree)
  const chain: string[] = []
  let cursor: string | null | undefined = nodeId
  while (cursor) { chain.unshift(cursor); cursor = parents.get(cursor) }
  return chain.reduce((matrix, id) => matrix.multiply(matrixFor(tree.localTransforms[id] || identityTransform())), new THREE.Matrix4())
}

export function nodeWorldTransform(tree: SceneTree, nodeId: string): Transform {
  if (!tree.localTransforms[nodeId]) throw new Error(`SCENE_TREE_UNKNOWN_NODE:${nodeId}`)
  return transformFor(worldMatrix(tree, nodeId))
}

export function validateSceneTree(tree: SceneTree, leafIds: readonly string[]): true {
  const leaves = new Set(leafIds)
  const groups = new Set(Object.keys(tree.groups))
  const known = new Set([...leaves, ...groups])
  const owned = new Set<string>()
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const cycleVisiting = new Set<string>()
  const cycleVisited = new Set<string>()
  const rejectCycle = (groupId: string) => {
    if (cycleVisiting.has(groupId)) throw new Error(`SCENE_TREE_CYCLE:${groupId}`)
    if (cycleVisited.has(groupId)) return
    cycleVisiting.add(groupId)
    for (const childId of tree.groups[groupId].childIds) {
      if (!known.has(childId)) throw new Error(`SCENE_TREE_UNKNOWN_NODE:${childId}`)
      if (tree.groups[childId]) rejectCycle(childId)
    }
    cycleVisiting.delete(groupId)
    cycleVisited.add(groupId)
  }
  for (const groupId of groups) rejectCycle(groupId)

  const visit = (nodeId: string) => {
    if (!known.has(nodeId)) throw new Error(`SCENE_TREE_UNKNOWN_NODE:${nodeId}`)
    if (visiting.has(nodeId)) throw new Error(`SCENE_TREE_CYCLE:${nodeId}`)
    if (visited.has(nodeId)) return
    visiting.add(nodeId)
    const group = tree.groups[nodeId]
    if (group) {
      if (group.childIds.length < 1) throw new Error(`SCENE_TREE_EMPTY_GROUP:${nodeId}`)
      for (const childId of group.childIds) {
        if (visiting.has(childId)) throw new Error(`SCENE_TREE_CYCLE:${childId}`)
        if (owned.has(childId)) throw new Error(`SCENE_TREE_DUPLICATE_OWNERSHIP:${childId}`)
        owned.add(childId)
        visit(childId)
      }
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
  }

  for (const rootId of tree.rootIds) {
    if (owned.has(rootId)) throw new Error(`SCENE_TREE_DUPLICATE_OWNERSHIP:${rootId}`)
    owned.add(rootId)
    visit(rootId)
  }
  for (const nodeId of known) if (!visited.has(nodeId)) throw new Error(`SCENE_TREE_ORPHAN:${nodeId}`)
  return true
}

export function migrateSceneTree(document: Pick<CameraDocument, 'entities' | 'groups' | 'shots' | 'sceneTree' | 'objects'>): SceneTree {
  const groups = Object.fromEntries(document.groups.map((group) => [group.id, { id: group.id, name: group.name, childIds: [...group.childIds] }]))
  const localTransforms: Record<string, Transform> = Object.fromEntries(document.entities.map((entity) => [entity.id, clone(entity.transform)]))
  for (const object of document.objects || []) localTransforms[object.id] = clone(object.transform)
  for (const group of document.groups) localTransforms[group.id] = groupTransform(group.pivot, group.rotation)

  const childIds = new Set(document.groups.flatMap((group) => group.childIds))
  const rootCandidates = [
    ...(document.sceneTree || []),
    ...document.groups.map((group) => group.id),
    ...document.shots.flatMap((shot) => shot.entityOrder),
    ...document.entities.map((entity) => entity.id),
    ...(document.objects || []).map((object) => object.id),
  ]
  const known = new Set([...document.entities.map((entity) => entity.id), ...(document.objects || []).map((object) => object.id), ...document.groups.map((group) => group.id)])
  const rootIds = [...new Set(rootCandidates)].filter((id) => known.has(id) && !childIds.has(id))
  const tree = { rootIds, groups, localTransforms }
  validateSceneTree(tree, [...document.entities.map((entity) => entity.id), ...(document.objects || []).map((object) => object.id)])
  const parents = parentMap(tree)
  const authoredWorld = Object.fromEntries(Object.entries(localTransforms).map(([id, value]) => [id, matrixFor(value)]))
  for (const [nodeId, parentId] of parents) if (parentId) {
    tree.localTransforms[nodeId] = transformFor(authoredWorld[parentId].clone().invert().multiply(authoredWorld[nodeId]))
  }
  return tree
}

function container(tree: SceneTree, parentId: string | null): string[] {
  return parentId ? tree.groups[parentId]?.childIds || [] : tree.rootIds
}

export function reparentSceneNode(tree: SceneTree, nodeId: string, parentId: string | null, index: number): SceneTree {
  const next = clone(tree)
  if (!next.localTransforms[nodeId] || parentId === nodeId || parentId && !next.groups[parentId]) throw new Error('SCENE_TREE_INVALID_REPARENT')
  let cursor: string | null = parentId
  const parents = parentMap(next)
  while (cursor) { if (cursor === nodeId) throw new Error('SCENE_TREE_CYCLE'); cursor = parents.get(cursor) ?? null }
  const world = worldMatrix(next, nodeId)
  const oldParent = parents.get(nodeId) ?? null
  const old = container(next, oldParent); old.splice(old.indexOf(nodeId), 1)
  const target = container(next, parentId); target.splice(Math.max(0, Math.min(index, target.length)), 0, nodeId)
  const parentWorld = parentId ? worldMatrix(next, parentId) : new THREE.Matrix4()
  next.localTransforms[nodeId] = transformFor(parentWorld.clone().invert().multiply(world))
  return next
}

export function groupSceneNodes(tree: SceneTree, nodeIds: readonly string[], group: { id: string; name: string }): SceneTree {
  const selected = new Set(nodeIds)
  if (selected.size < 2 || tree.localTransforms[group.id]) throw new Error('SCENE_TREE_INVALID_GROUP')
  const parents = parentMap(tree); const parentIds = [...selected].map((id) => parents.get(id))
  if (parentIds.some((id) => id === undefined) || new Set(parentIds).size !== 1) throw new Error('SCENE_TREE_GROUP_REQUIRES_SIBLINGS')
  const parentId = parentIds[0] ?? null; const siblings = container(tree, parentId)
  const childIds = siblings.filter((id) => selected.has(id))
  if (childIds.length !== selected.size) throw new Error('SCENE_TREE_UNKNOWN_NODE')
  const insertion = siblings.findIndex((id) => selected.has(id))
  const worlds = Object.fromEntries(childIds.map((id) => [id, worldMatrix(tree, id)]))
  const points = childIds.map((id) => new THREE.Vector3().setFromMatrixPosition(worlds[id]))
  const pivot = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3())
  const groupWorld = new THREE.Matrix4().makeTranslation(...pivot.toArray())
  const next = clone(tree)
  next.groups[group.id] = { id: group.id, name: group.name, childIds }
  next.localTransforms[group.id] = transformFor((parentId ? worldMatrix(tree, parentId) : new THREE.Matrix4()).clone().invert().multiply(groupWorld))
  const target = container(next, parentId); target.splice(insertion, target.length - insertion, ...target.slice(insertion).filter((id) => !selected.has(id)))
  target.splice(insertion, 0, group.id)
  for (const id of childIds) next.localTransforms[id] = transformFor(groupWorld.clone().invert().multiply(worlds[id]))
  return next
}

export function ungroupSceneNode(tree: SceneTree, groupId: string): SceneTree {
  const group = tree.groups[groupId]
  if (!group) return tree
  const parents = parentMap(tree); const parentId = parents.get(groupId) ?? null; const siblings = container(tree, parentId)
  const insertion = siblings.indexOf(groupId); const worlds = Object.fromEntries(group.childIds.map((id) => [id, worldMatrix(tree, id)]))
  const parentWorld = parentId ? worldMatrix(tree, parentId) : new THREE.Matrix4()
  const next = clone(tree); const target = container(next, parentId)
  target.splice(insertion, 1, ...group.childIds)
  for (const id of group.childIds) next.localTransforms[id] = transformFor(parentWorld.clone().invert().multiply(worlds[id]))
  delete next.groups[groupId]; delete next.localTransforms[groupId]
  return next
}

export type TransformLockLeaf = { id: string; locks?: { transform?: boolean; all?: boolean } }

export function descendantLeafIds(tree: SceneTree, nodeId: string): string[] {
  const group = tree.groups[nodeId]
  return group ? group.childIds.flatMap((childId) => descendantLeafIds(tree, childId)) : [nodeId]
}

export function groupTransformLocked(tree: SceneTree, groupId: string, leaves: readonly TransformLockLeaf[]): boolean {
  if (!tree.groups[groupId]) throw new Error(`SCENE_TREE_GROUP_NOT_FOUND:${groupId}`)
  const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]))
  const descendants = descendantLeafIds(tree, groupId)
  return descendants.length > 0 && descendants.every((id) => {
    const leaf = byId.get(id)
    if (!leaf) throw new Error(`SCENE_TREE_LEAF_NOT_FOUND:${id}`)
    return Boolean(leaf.locks?.all || leaf.locks?.transform)
  })
}

export function setGroupTransformLocked<T extends TransformLockLeaf>(tree: SceneTree, groupId: string, leaves: readonly T[], locked: boolean): T[] {
  if (!tree.groups[groupId]) throw new Error(`SCENE_TREE_GROUP_NOT_FOUND:${groupId}`)
  const descendants = new Set(descendantLeafIds(tree, groupId))
  return leaves.map((leaf) => descendants.has(leaf.id) ? { ...clone(leaf), locks: { ...(leaf.locks || {}), transform: locked } } : clone(leaf))
}

export function toggleGroupTransformLock<T extends TransformLockLeaf>(tree: SceneTree, groupId: string, leaves: readonly T[]): T[] {
  return setGroupTransformLocked(tree, groupId, leaves, !groupTransformLocked(tree, groupId, leaves))
}

export type TransformLeaf = TransformLockLeaf & { transform: Transform; dimensions?: Vec3; allowBelowCanvas?: boolean }

export function evaluatedAggregatePivot(tree: SceneTree, groupId: string, leaves: readonly TransformLeaf[]): Vec3 {
  if (!tree.groups[groupId]) throw new Error(`SCENE_TREE_GROUP_NOT_FOUND:${groupId}`)
  const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]))
  const bounds = new THREE.Box3()
  for (const id of descendantLeafIds(tree, groupId)) {
    const leaf = byId.get(id)
    if (!leaf) throw new Error(`SCENE_TREE_LEAF_NOT_FOUND:${id}`)
    const matrix = worldMatrix(tree, id)
    if (leaf.dimensions) {
      const half = leaf.dimensions.map((value) => value / 2) as Vec3
      for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) {
        bounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(matrix))
      }
    } else bounds.expandByPoint(new THREE.Vector3().setFromMatrixPosition(matrix))
  }
  return bounds.getCenter(new THREE.Vector3()).toArray().map(cleanNumber) as Vec3
}

export type GroupTransformDelta = { translation?: Vec3; rotation?: Vec3; scale?: Vec3 }
export type GroupTransformResult<T extends TransformLeaf> = { tree: SceneTree; leaves: T[]; changed: boolean }

export function applyGroupTransform<T extends TransformLeaf>(tree: SceneTree, groupId: string, leaves: readonly T[], delta: GroupTransformDelta): GroupTransformResult<T> {
  if (!tree.groups[groupId]) throw new Error(`SCENE_TREE_GROUP_NOT_FOUND:${groupId}`)
  const descendantIds = descendantLeafIds(tree, groupId)
  const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]))
  const unlocked = descendantIds.filter((id) => {
    const leaf = byId.get(id)
    if (!leaf) throw new Error(`SCENE_TREE_LEAF_NOT_FOUND:${id}`)
    return !(leaf.locks?.all || leaf.locks?.transform)
  })
  const translation = delta.translation || [0, 0, 0]
  const rotation = delta.rotation || [0, 0, 0]
  const scale = delta.scale || [1, 1, 1]
  const isIdentity = translation.every((value) => value === 0) && rotation.every((value) => value === 0) && scale.every((value) => value === 1)
  if (!unlocked.length || isIdentity) return { tree, leaves: leaves as T[], changed: false }

  const pivot = evaluatedAggregatePivot(tree, groupId, leaves)
  const deltaMatrix = new THREE.Matrix4().makeTranslation(...translation)
    .multiply(new THREE.Matrix4().makeTranslation(...pivot))
    .multiply(new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromEuler(radians(rotation)), new THREE.Vector3(...scale)))
    .multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]))
  let groundCorrection = 0
  for (const id of unlocked) {
    const leaf = byId.get(id)!
    if (leaf.allowBelowCanvas || !leaf.dimensions) continue
    const proposed = deltaMatrix.clone().multiply(worldMatrix(tree, id))
    const half = leaf.dimensions.map((value) => value / 2) as Vec3
    let minimum = Infinity
    for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) minimum = Math.min(minimum, new THREE.Vector3(x, y, z).applyMatrix4(proposed).y)
    groundCorrection = Math.max(groundCorrection, -minimum)
  }
  if (groundCorrection > 0) deltaMatrix.premultiply(new THREE.Matrix4().makeTranslation(0, groundCorrection, 0))
  const next = clone(tree)
  const parents = parentMap(tree)
  for (const id of unlocked) {
    const transformedWorld = deltaMatrix.clone().multiply(worldMatrix(tree, id))
    const parentId = parents.get(id) ?? null
    const parentWorld = parentId ? worldMatrix(tree, parentId) : new THREE.Matrix4()
    next.localTransforms[id] = transformFor(parentWorld.clone().invert().multiply(transformedWorld))
  }
  const unlockedSet = new Set(unlocked)
  const nextLeaves = leaves.map((leaf) => unlockedSet.has(leaf.id)
    ? { ...clone(leaf), transform: nodeWorldTransform(next, leaf.id) }
    : clone(leaf)) as T[]
  return { tree: next, leaves: nextLeaves, changed: true }
}

export function resetGroupTransform<T extends TransformLeaf>(tree: SceneTree, groupId: string, leaves: readonly T[], baseline: readonly TransformLeaf[]): GroupTransformResult<T> {
  if (!tree.groups[groupId]) throw new Error(`SCENE_TREE_GROUP_NOT_FOUND:${groupId}`)
  const currentById = new Map(leaves.map((leaf) => [leaf.id, leaf]))
  const baselineById = new Map(baseline.map((leaf) => [leaf.id, leaf]))
  const unlocked = descendantLeafIds(tree, groupId).filter((id) => {
    const leaf = currentById.get(id)
    if (!leaf) throw new Error(`SCENE_TREE_LEAF_NOT_FOUND:${id}`)
    if (!baselineById.has(id)) throw new Error(`SCENE_TREE_RESET_BASELINE_NOT_FOUND:${id}`)
    return !(leaf.locks?.all || leaf.locks?.transform)
  })
  if (!unlocked.length) return { tree, leaves: leaves as T[], changed: false }

  const next = clone(tree)
  const parents = parentMap(tree)
  for (const id of unlocked) {
    const parentId = parents.get(id) ?? null
    const parentWorld = parentId ? worldMatrix(tree, parentId) : new THREE.Matrix4()
    next.localTransforms[id] = transformFor(parentWorld.clone().invert().multiply(matrixFor(baselineById.get(id)!.transform)))
  }
  const unlockedSet = new Set(unlocked)
  const nextLeaves = leaves.map((leaf) => unlockedSet.has(leaf.id)
    ? { ...clone(leaf), transform: nodeWorldTransform(next, leaf.id) }
    : clone(leaf)) as T[]
  return { tree: next, leaves: nextLeaves, changed: true }
}

export const sceneTreeIdentityTransform = identityTransform
