import { describe, expect, it } from 'vitest'
import { addEntity, applyTransformCommit, createCameraDocument, deleteEntities, deployCameraShot, groupEntities, setAllowBelowCanvas } from './model'
import { groupSceneNodes, migrateSceneTree, nodeWorldTransform, reparentSceneNode } from './sceneTree'
import { createStructuredObjectFromRecipe, evaluateStructuredObject, generateProjectedSurfaceAnchors, rankProjectedSurfaceAnchors, snapStructuredObjectToAnchor } from './structuredObject'
import { createLocalObjectLifecycle, localPromptToolRequest } from './structuredObjectAssistant'

describe('3D Camera merged correction contract', () => {
  it('starts without a Shot and creates exactly one linked Shot when a Camera is deployed', () => {
    const empty = createCameraDocument('merged-empty')
    expect(empty.shots).toHaveLength(0)
    const deployed = addEntity(empty, 'camera', 'Camera')
    expect(deployed.shots).toHaveLength(1)
    expect(deployed.shots[0].camera.activeCameraId).toBe(deployed.entities.find((entity) => entity.kind === 'camera')!.id)
    expect(deployed.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(1)
  })

  it('deleting a Camera removes its authored Shot and clip but preserves ordinary scene assets', () => {
    const deployed = addEntity(addEntity(createCameraDocument('merged-delete'), 'camera', 'Camera'), 'block', 'Block')
    const camera = deployed.entities.find((entity) => entity.kind === 'camera')!
    const next = deleteEntities(deployed, [camera.id])
    expect(next.entities.some((entity) => entity.kind === 'camera')).toBe(false)
    expect(next.shots).toHaveLength(0)
    expect(next.entities.map((entity) => entity.name)).toEqual(['Block'])
  })

  it('deployCameraShot creates a Camera/Shot unit rather than a Camera-less Shot', () => {
    const next = deployCameraShot(createCameraDocument('merged-deploy'), [4, 0, -3])
    const camera = next.entities.find((entity) => entity.kind === 'camera')
    expect(camera).toBeDefined()
    expect(next.shots).toHaveLength(1)
    expect(next.shots[0].camera.activeCameraId).toBe(camera!.id)
  })

  it('groups root siblings, then groups the group with another root while preserving world transforms on reparent', () => {
    let document = addEntity(addEntity(addEntity(createCameraDocument('groups'), 'block', 'A'), 'block', 'B'), 'block', 'C')
    const entityIds = document.entities.map((entity) => entity.id)
    document = groupEntities(document, entityIds.slice(0, 2))
    const tree = migrateSceneTree(document)
    const groupId = document.groups[0].id
    const nested = groupSceneNodes(tree, [groupId, entityIds[2]], { id: 'nested', name: 'Nested' })
    expect(nested.rootIds).toEqual(['nested'])
    const before = nodeWorldTransform(nested, entityIds[0])
    const moved = reparentSceneNode(nested, entityIds[0], null, 0)
    expect(nodeWorldTransform(moved, entityIds[0]).position).toEqual(before.position)
    expect(moved.rootIds).toContain(entityIds[0])
  })

  it('grounds actual evaluated geometry only when enabled and allows one object below ground without authorizing others', () => {
    let document = addEntity(addEntity(createCameraDocument('ground'), 'human', 'Human'), 'block', 'Block')
    const human = document.entities[0]
    const authored = { ...human.transform, position: [0, -.5, 0] as [number, number, number] }
    const grounded = applyTransformCommit(document, human.id, authored, { gridSnap: false, collision: false, groundSnap: true, optionBypass: false })
    expect(grounded.document.entities[0].transform.position[1]).toBeGreaterThanOrEqual(1)
    const bypassed = applyTransformCommit(document, human.id, authored, { gridSnap: false, collision: false, groundSnap: false, optionBypass: false })
    expect(bypassed.document.entities[0].transform.position[1]).toBe(-.5)
    const allowed = setAllowBelowCanvas(document, { type: 'entity', id: human.id }, true)
    expect(allowed.entities[0].allowBelowCanvas).toBe(true)
    expect(allowed.entities[1].allowBelowCanvas).toBe(false)
  })

  it('evaluates structured object geometry and exposes per-object below-ground permission', () => {
    const recipe = { schema: 'prism.object-recipe' as const, version: 1 as const, id: 'table', name: 'Table', parts: [{ id: 'top', kind: 'block' as const, dimensions: [2, 1, 2] as [number, number, number], transform: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number], anchor: [0, 0, 0] as [number, number, number] } }] }
    const object = createStructuredObjectFromRecipe(recipe, 'object-table', { position: [0, -.25, 0], rotation: [0, 0, 0], scale: [1, 1, 1], anchor: [0, 0, 0] })
    expect(evaluateStructuredObject(object).worldBounds.min.y).toBe(-.75)
    expect(object.allowBelowCanvas).toBe(false)
  })

  it('snaps a structured object root to the ranked projected surface anchor without changing its authored rotation', () => {
    const recipe = { schema: 'prism.object-recipe' as const, version: 1 as const, id: 'snap', name: 'Snap', parts: [{ id: 'p', kind: 'block' as const, dimensions: [1, 1, 1] as [number, number, number], transform: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number], anchor: [0, 0, 0] as [number, number, number] } }] }
    const object = createStructuredObjectFromRecipe(recipe, 'snap-object', { position: [0, 0, 0], rotation: [0, 10, 0], scale: [1, 1, 1], anchor: [0, 0, 0] })
    const anchors = generateProjectedSurfaceAnchors({ partId: 'p', kind: 'block', dimensions: [1, 1, 1], worldMatrix: evaluateStructuredObject(object).parts[0].worldMatrix, project: (world) => ({ x: world[0], y: world[1] }) })
    const ranked = rankProjectedSurfaceAnchors(anchors, { x: 0, y: .5 }).snap!
    const snapped = snapStructuredObjectToAnchor(object, ranked, [0, 2, 0])
    expect(snapped.transform.position[1]).toBeGreaterThan(0)
    expect(snapped.transform.rotation).toEqual(object.transform.rotation)
  })
  it('keeps Prompt Tools distinct and applies a local recipe exactly once with deterministic IDs', () => {
    expect(localPromptToolRequest('Describe', 'chair')).toMatchObject({ mode: 'describe', prompt: 'chair' })
    expect(localPromptToolRequest('Reference', 'chair')).toMatchObject({ mode: 'reference', prompt: 'chair' })
    const lifecycle = createLocalObjectLifecycle(() => 'object-fixed')
    const recipe = { schema: 'prism.object-recipe' as const, version: 1 as const, id: 'chair', name: 'Chair', parts: [{ id: 'seat', kind: 'block' as const, dimensions: [1, 1, 1] as [number, number, number], transform: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number], anchor: [0, 0, 0] as [number, number, number] } }] }
    const preview = lifecycle.send(recipe)
    expect(preview.state).toBe('preview')
    expect(preview.object?.id).toBe('object-fixed')
    expect(lifecycle.cancel().state).toBe('cancelled')
  })
})
