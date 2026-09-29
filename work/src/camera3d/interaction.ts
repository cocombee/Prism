import * as THREE from 'three'
import { applyOrderedAssetSelection, type AssetSelectionModifiers } from '../shared/assetInteraction'
import type { CameraDocument, EntityKind, SceneEntity, Transform, Vec3 } from './model'
import { normalizeRotationDegrees } from './model'

export type SceneShortcutCommand = 'undo' | 'redo' | 'copy' | 'paste' | 'select-all'
export function sceneShortcutForEvent(event: Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>, scope: { sceneOwned: boolean; textEntry: boolean; numericScrub: boolean; menuOrDialogOpen: boolean; timelineOwned: boolean }): SceneShortcutCommand | null {
  if (!scope.sceneOwned || scope.textEntry || scope.numericScrub || scope.menuOrDialogOpen || scope.timelineOwned || event.altKey || !(event.metaKey || event.ctrlKey)) return null
  if (event.code === 'KeyZ') return event.shiftKey ? 'redo' : 'undo'
  if (event.shiftKey) return null
  if (event.code === 'KeyC') return 'copy'
  if (event.code === 'KeyV') return 'paste'
  if (event.code === 'KeyA') return 'select-all'
  return null
}

export function selectAllSceneEntities(document: CameraDocument, visibleHierarchyOrder: readonly string[]): string[] {
  const eligible = new Set(document.entities.map((entity) => entity.id))
  const ordered = [...new Set(visibleHierarchyOrder)].filter((id) => eligible.has(id))
  for (const entity of document.entities) if (!ordered.includes(entity.id)) ordered.push(entity.id)
  return ordered
}
import { applyColumnResize, applyDimensionResize, applySphereRadiusResize, evaluateCameraPath, resolvedCameraRotation, transformShapeGroup } from './model'

export type AddCatalogItem = { kind: EntityKind; name: string; icon: 'human' | 'block' | 'sphere' | 'column' | 'camera' }
export function cameraOrthoGroundLine(mode: 'perspective' | 'front' | 'top' | 'left' | 'right' | 'side', pan: Vec3, zoom: number) {
  if (mode === 'perspective' || mode === 'top') return null
  const half = 32 / Math.max(.1, zoom)
  return mode === 'front' ? { from: [pan[0] - half, 0, 0] as Vec3, to: [pan[0] + half, 0, 0] as Vec3 } : { from: [0, 0, pan[2] - half] as Vec3, to: [0, 0, pan[2] + half] as Vec3 }
}
export function cameraHierarchySelection(order: string[], selected: string[], anchor: string | null, key: string, modifiers: AssetSelectionModifiers, groups: Array<{ childIds: string[]; shapeLocked: boolean }>, memberEditGroupIndex: number | null) {
  const next = applyOrderedAssetSelection(order, selected, anchor, key, modifiers)
  const expanded = new Set(next.selected)
  groups.forEach((group, index) => {
    const authoritativeMemberEdit = index === memberEditGroupIndex && !group.shapeLocked
    if (!authoritativeMemberEdit && group.childIds.some((id) => expanded.has(id))) group.childIds.forEach((id) => expanded.add(id))
  })
  return { selected: order.filter((id) => expanded.has(id)), anchor: next.anchor }
}
export type AddCatalogGroup = { label: 'Scene'; items: readonly AddCatalogItem[] }
export const CAMERA3D_ADD_CATALOG: readonly AddCatalogGroup[] = [{
  label: 'Scene',
  items: [
    { kind: 'human', name: 'Human', icon: 'human' },
    { kind: 'block', name: 'Block', icon: 'block' },
    { kind: 'sphere', name: 'Sphere', icon: 'sphere' },
    { kind: 'column', name: 'Column', icon: 'column' },
    { kind: 'camera', name: 'Camera', icon: 'camera' },
  ],
}] as const

export type VoxelPart = { role: string; size: Vec3; center: Vec3; color?: string }
export const humanVoxelParts = (): VoxelPart[] => [
  { role: 'head', size: [.58, .58, .58], center: [0, 1.71, 0] },
  { role: 'torso', size: [.72, .72, .42], center: [0, 1.06, 0] },
  { role: 'left-arm', size: [.22, .72, .3], center: [-.51, 1.05, 0] },
  { role: 'right-arm', size: [.22, .72, .3], center: [.51, 1.05, 0] },
  { role: 'left-leg', size: [.28, .72, .34], center: [-.2, .36, 0] },
  { role: 'right-leg', size: [.28, .72, .34], center: [.2, .36, 0] },
]
export const cameraVoxelParts = (): VoxelPart[] => [
  { role: 'body', size: [1, .67, .8], center: [0, 0, .95] },
  { role: 'lens-collar', size: [.62, .62, .14], center: [0, 0, .07] },
  { role: 'lens', size: [.59, .59, .55], center: [0, 0, .415], color: '#25232a' },
  { role: 'aperture', size: [.38, .38, .03], center: [0, 0, .015], color: '#09090c' },
  { role: 'viewfinder', size: [.46, .22, .36], center: [-.16, .445, 1.02] },
  { role: 'grip', size: [.16, .5, .24], center: [.58, -.02, .98] },
]
export const voxelPartsFor = (kind: EntityKind): VoxelPart[] | null => kind === 'human' ? humanVoxelParts() : kind === 'camera' ? cameraVoxelParts() : null
export function resolveShapeSelection(document: CameraDocument, entityId: string, memberEdit: boolean): { type: 'entity' | 'group'; id: string; reason?: string } {
  const group = document.groups.find((item) => item.childIds.includes(entityId))
  if (!group) return { type: 'entity', id: entityId }
  if (memberEdit && !group.shapeLocked) return { type: 'entity', id: entityId }
  return { type: 'group', id: group.id, ...(memberEdit && group.shapeLocked ? { reason: 'Unlock Shape to edit members.' } : {}) }
}

export function viewAlignedPointerDelta(right: Vec3, up: Vec3, pixels: [number, number], worldPerPixel: number): Vec3 {
  const scale = Number.isFinite(worldPerPixel) ? Math.max(0, Math.min(.1, worldPerPixel)) : 0
  return [0, 1, 2].map((axis) => (right[axis] * pixels[0] - up[axis] * pixels[1]) * scale) as Vec3
}

export function cameraLensOrigin(transform: Transform): Vec3 {
  return [...transform.position]
}

export type FrustumInput = { focalLength: number; aspect: CameraDocument['aspect']; near: number; far: number }
export type FrustumGeometry = { cornerRays: Array<[Vec3, Vec3]>; nearFrame: Vec3[]; farFrame: Vec3[] }
export function frustumGeometry({ focalLength, aspect, near, far }: FrustumInput): FrustumGeometry {
  const [widthRatio, heightRatio] = aspect.split(':').map(Number)
  const halfWidthAt = (distance: number) => distance * 36 / (2 * focalLength)
  const frame = (distance: number): Vec3[] => {
    const x = halfWidthAt(distance); const y = x * heightRatio / widthRatio
    return [[-x, y, -distance], [x, y, -distance], [x, -y, -distance], [-x, -y, -distance]]
  }
  const nearFrame = frame(Math.max(.01, near)); const farFrame = frame(Math.max(near, far))
  return { nearFrame, farFrame, cornerRays: farFrame.map((corner) => [[0, 0, 0], corner]) }
}

export type PointerGestureState = { button: number | null; start: [number, number] | null; point: [number, number] | null; dragged: boolean; preview: { kind: EntityKind; position: Vec3 } | null }
const pointerInitial = (): PointerGestureState => ({ button: null, start: null, point: null, dragged: false, preview: null })
export const pointerGesture = {
  initial: pointerInitial,
  down: (state: PointerGestureState, button: number, x: number, y: number): PointerGestureState => ({ ...state, button, start: [x, y], point: [x, y], dragged: false }),
  move: (state: PointerGestureState, x: number, y: number): PointerGestureState => ({ ...state, point: [x, y], dragged: state.dragged || Boolean(state.start && Math.hypot(x - state.start[0], y - state.start[1]) > 5) }),
  up: (state: PointerGestureState, button: number, x: number, y: number): { state: PointerGestureState; action: 'context-menu' | 'orbit-end' | 'none'; point: [number, number] } => ({ state: pointerInitial(), action: button === 2 ? state.dragged ? 'orbit-end' : 'context-menu' : 'none', point: [x, y] }),
  preview: (state: PointerGestureState, kind: EntityKind, position: Vec3): PointerGestureState => ({ ...state, preview: { kind, position } }),
  cancel: (_state: PointerGestureState): PointerGestureState => pointerInitial(),
}
export const gridState = (focus: Vec3) => ({ center: [Math.round(focus[0] / 5) * 5, 0, Math.round(focus[2] / 5) * 5] as Vec3, size: 280, minorStep: 1, majorStep: 5, fadeStart: 120, fadeEnd: 140 })
export type GizmoDelta = { mode: 'move' | 'scale'; axis: 'x' | 'y' | 'z' | 'uniform'; amount: number }
export function applyGizmoDelta(transform: Transform, delta: GizmoDelta): Transform {
  const next: Transform = structuredClone(transform)
  const axis: 0 | 1 | 2 | null = delta.axis === 'x' ? 0 : delta.axis === 'y' ? 1 : delta.axis === 'z' ? 2 : null
  if (delta.mode === 'move' && axis !== null) next.position[axis] += delta.amount
  if (delta.mode === 'scale') for (const index of (axis !== null ? [axis] : [0, 1, 2]) as Array<0 | 1 | 2>) next.scale[index] = Math.max(.25, next.scale[index] + delta.amount)
  return next
}

const clampDistance = (distance: number) => Math.max(.5, Math.min(120, distance))
export function dollyCameraState(position: Vec3, target: Vec3, factor: number) {
  const offset = new THREE.Vector3(...position).sub(new THREE.Vector3(...target))
  const distance = clampDistance(offset.length() * factor)
  if (!offset.lengthSq()) offset.set(0, 0, 1)
  offset.setLength(distance)
  return { position: new THREE.Vector3(...target).add(offset).toArray() as Vec3, target: [...target] as Vec3, distance, duration: 180 }
}
export function entityVisualBounds(entity: SceneEntity) {
  const local = new THREE.Box3()
  const parts = voxelPartsFor(entity.kind)
  if (parts) {
    for (const part of parts) {
      const half = new THREE.Vector3(...part.size).multiplyScalar(.5)
      const center = new THREE.Vector3(...part.center)
      local.expandByPoint(center.clone().sub(half)); local.expandByPoint(center.clone().add(half))
    }
  } else {
    const half = new THREE.Vector3(...entity.dimensions).multiplyScalar(.5)
    local.expandByPoint(half.clone().multiplyScalar(-1)); local.expandByPoint(half)
  }
  const position = new THREE.Vector3(...entity.transform.position)
  if (entity.kind === 'human') position.y -= entity.dimensions[1] / 2
  const matrix = new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')), new THREE.Vector3(...entity.transform.scale))
  return local.applyMatrix4(matrix)
}

const boundsFor = (entities: SceneEntity[]) => {
  if (!entities.length) return null
  const bounds = new THREE.Box3()
  for (const entity of entities) bounds.union(entityVisualBounds(entity))
  return bounds
}

const boxCorners = (bounds: THREE.Box3) => {
  const corners: THREE.Vector3[] = []
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z))
  return corners
}

export type FocusSelectionFrameInput = { entities: SceneEntity[]; selectedIds: string[]; projection: ProjectionView; position: Vec3; target: Vec3; verticalFovDegrees: number; aspect: number; orthographicHalfHeight: number; orthographicZoom: number }
export function focusSelectionFrameState(input: FocusSelectionFrameInput) {
  const selected = input.entities.filter((entity) => input.selectedIds.includes(entity.id)); const bounds = boundsFor(selected)
  const currentDistance = new THREE.Vector3(...input.position).distanceTo(new THREE.Vector3(...input.target))
  if (!bounds) return { changed: false as const, projection: input.projection, position: [...input.position] as Vec3, target: [...input.target] as Vec3, distance: currentDistance, orthographicZoom: input.orthographicZoom, coverage: 0 }
  const center = bounds.getCenter(new THREE.Vector3()); const corners = boxCorners(bounds)
  const viewForward = new THREE.Vector3(...input.target).sub(new THREE.Vector3(...input.position))
  if (!viewForward.lengthSq() || !Number.isFinite(viewForward.lengthSq())) viewForward.set(-9, -6, -12)
  viewForward.normalize()
  const worldUp = input.projection === 'top' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0)
  let right = new THREE.Vector3().crossVectors(viewForward, worldUp)
  if (!right.lengthSq()) right = new THREE.Vector3(1, 0, 0); else right.normalize()
  const up = new THREE.Vector3().crossVectors(right, viewForward).normalize()
  let halfWidth = 0; let halfHeight = 0; let halfDepth = 0
  for (const corner of corners) { const relative = corner.clone().sub(center); halfWidth = Math.max(halfWidth, Math.abs(relative.dot(right))); halfHeight = Math.max(halfHeight, Math.abs(relative.dot(up))); halfDepth = Math.max(halfDepth, Math.abs(relative.dot(viewForward))) }
  if (input.projection === 'perspective') {
    const verticalTan = Math.tan(THREE.MathUtils.degToRad(Math.max(1, input.verticalFovDegrees) / 2)); const horizontalTan = verticalTan * Math.max(.01, input.aspect)
    const distance = Math.max(.01, halfDepth + Math.max(halfWidth / (horizontalTan * .8), halfHeight / (verticalTan * .8)))
    const position = center.clone().addScaledVector(viewForward, -distance).toArray() as Vec3
    const nearestDistance = Math.max(.001, distance - halfDepth)
    const coverage = Math.max(halfWidth / (nearestDistance * horizontalTan), halfHeight / (nearestDistance * verticalTan))
    return { changed: true as const, projection: input.projection, position, target: center.toArray() as Vec3, distance, orthographicZoom: input.orthographicZoom, coverage }
  }
  const halfViewportHeight = Math.max(.01, input.orthographicHalfHeight); const halfViewportWidth = halfViewportHeight * Math.max(.01, input.aspect)
  const orthographicZoom = Math.max(.000001, Math.min(halfViewportWidth * .8 / Math.max(.000001, halfWidth), halfViewportHeight * .8 / Math.max(.000001, halfHeight)))
  const distance = Math.max(.5, currentDistance, halfDepth + .5); const position = center.clone().addScaledVector(viewForward, -distance).toArray() as Vec3
  const coverage = Math.max(halfWidth / (halfViewportWidth / orthographicZoom), halfHeight / (halfViewportHeight / orthographicZoom))
  return { changed: true as const, projection: input.projection, position, target: center.toArray() as Vec3, distance, orthographicZoom, coverage }
}

export function fitCameraState(entities: SceneEntity[]) {
  const bounds = boundsFor(entities)
  if (!bounds) return { position: [9, 7, 12] as Vec3, target: [0, 1, 0] as Vec3, distance: Math.hypot(9, 6, 12), padding: .22 }
  const target = bounds.getCenter(new THREE.Vector3())
  const radius = Math.max(.5, bounds.getSize(new THREE.Vector3()).length() / 2)
  const direction = new THREE.Vector3(9, 6, 12).normalize()
  const distance = clampDistance(radius / Math.tan(THREE.MathUtils.degToRad(42 / 2)) * 1.22)
  return { position: target.clone().addScaledVector(direction, distance).toArray() as Vec3, target: target.toArray() as Vec3, distance, padding: .22 }
}
export function focusCameraState(entities: SceneEntity[], selectedIds: string[], position: Vec3, currentTarget: Vec3) {
  const selected = entities.filter((entity) => selectedIds.includes(entity.id)); const bounds = boundsFor(selected)
  if (!bounds) return { position: [...position] as Vec3, target: [...currentTarget] as Vec3, distance: new THREE.Vector3(...position).distanceTo(new THREE.Vector3(...currentTarget)) }
  const target = bounds.getCenter(new THREE.Vector3())
  const offset = new THREE.Vector3(...position).sub(new THREE.Vector3(...currentTarget))
  const distance = clampDistance(offset.length())
  if (!offset.lengthSq()) offset.set(9, 6, 12)
  return { position: target.clone().add(offset.setLength(distance)).toArray() as Vec3, target: target.toArray() as Vec3, distance }
}
export type ProjectionView = 'perspective' | 'front' | 'top' | 'side'
export type PerspectiveViewState = { position: Vec3; target: Vec3; up: Vec3 }
export function projectionCameraState(view: ProjectionView, target: Vec3, lastPerspective?: PerspectiveViewState) {
  if (view === 'front') return { projection: 'orthographic' as const, position: [target[0], target[1], target[2] + 12] as Vec3, target: [...target] as Vec3, up: [0, 1, 0] as Vec3 }
  if (view === 'top') return { projection: 'orthographic' as const, position: [target[0], target[1] + 12, target[2]] as Vec3, target: [...target] as Vec3, up: [0, 0, -1] as Vec3 }
  if (view === 'side') return { projection: 'orthographic' as const, position: [target[0] + 12, target[1], target[2]] as Vec3, target: [...target] as Vec3, up: [0, 1, 0] as Vec3 }
  return lastPerspective
    ? { projection: 'perspective' as const, position: [...lastPerspective.position] as Vec3, target: [...lastPerspective.target] as Vec3, up: [...lastPerspective.up] as Vec3 }
    : { projection: 'perspective' as const, position: [target[0] + 9, target[1] + 6, target[2] + 12] as Vec3, target: [...target] as Vec3, up: [0, 1, 0] as Vec3 }
}

export function orthographicZoomForFactor(zoom: number, factor: number) {
  return Math.max(.05, Math.min(20, zoom / Math.max(.01, factor)))
}

export type ZoomMotionState = {
  mode: 'perspective' | 'orthographic'
  currentLog: number
  targetLog: number
  active: boolean
}

export function normalizeViewportWheelDelta(deltaY: number, deltaMode: number, viewportHeight: number) {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? Math.max(1, viewportHeight) : 1)
  return Math.max(-240, Math.min(240, pixels))
}

export function retargetZoomMotion(state: ZoomMotionState, normalizedDelta: number): ZoomMotionState {
  const minimum = state.mode === 'perspective' ? .5 : .05
  const maximum = state.mode === 'perspective' ? 120 : 20
  const direction = state.mode === 'perspective' ? 1 : -1
  const targetLog = Math.max(Math.log(minimum), Math.min(Math.log(maximum), state.targetLog + normalizedDelta * .0015 * direction))
  return { ...state, targetLog, active: Math.abs(targetLog - state.currentLog) > .0001 }
}

export function stepZoomMotion(state: ZoomMotionState, elapsedMs: number): ZoomMotionState {
  if (!state.active) return state
  const alpha = 1 - Math.exp(-Math.max(0, elapsedMs) / 90)
  const next = state.currentLog + (state.targetLog - state.currentLog) * alpha
  if (Math.abs(state.targetLog - next) < .0001) return { ...state, currentLog: state.targetLog, active: false }
  return { ...state, currentLog: next }
}

export type ViewportPointerSequence = { pointerId: number; button: number; startedOnRenderer: true; hit: 'blank' | 'object' | 'gizmo' }
export function beginViewportPointer(pointerId: number, button: number, rendererOwned: boolean, hit: ViewportPointerSequence['hit']): ViewportPointerSequence | null {
  return rendererOwned ? { pointerId, button, startedOnRenderer: true, hit } : null
}
export function finishViewportPointer(sequence: ViewportPointerSequence, pointerId: number, rendererOwnedEnd: boolean, dragged: boolean, blankEnd: boolean): 'clear' | 'preserve' | 'ignore' {
  if (sequence.pointerId !== pointerId || !rendererOwnedEnd) return 'ignore'
  return sequence.button === 0 && sequence.hit === 'blank' && !dragged && blankEnd ? 'clear' : 'preserve'
}

export function panCameraForMinimapTarget(position: Vec3, target: Vec3, nextTarget: Vec3) {
  return {
    position: position.map((value, index) => value - target[index] + nextTarget[index]) as Vec3,
    target: [...nextTarget] as Vec3,
  }
}

export const DIRECT_EDIT_HOVER_GRACE_MS = 120
export type DirectEditTarget =
  | { kind: 'block-face'; entityId: string; axes: readonly [number, number, number] }
  | { kind: 'sphere-radius'; entityId: string; radial: readonly [number, number, number] }
  | { kind: 'column-radius'; entityId: string; radial: readonly [number, number, number] }
  | { kind: 'column-height'; entityId: string; direction: 1 | -1 }
export type DirectEditAffordanceState = {
  target: DirectEditTarget | null
  visible: boolean
  hoverSurface: boolean
  hoverAffordance: boolean
  focused: boolean
  dragging: boolean
  hideAt: number | null
}
export type DirectEditAffordanceEvent =
  | { type: 'surface-enter'; target: DirectEditTarget }
  | { type: 'surface-leave'; now: number }
  | { type: 'affordance-enter' }
  | { type: 'affordance-leave'; now: number }
  | { type: 'focus'; target: DirectEditTarget }
  | { type: 'blur'; now: number }
  | { type: 'drag-start' }
  | { type: 'drag-end'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'clear' }
export const initialDirectEditAffordance = (): DirectEditAffordanceState => ({ target: null, visible: false, hoverSurface: false, hoverAffordance: false, focused: false, dragging: false, hideAt: null })
const scheduleDirectEditHide = (state: DirectEditAffordanceState, now: number): DirectEditAffordanceState => state.hoverSurface || state.hoverAffordance || state.focused || state.dragging ? { ...state, hideAt: null } : { ...state, hideAt: now + DIRECT_EDIT_HOVER_GRACE_MS }
export function directEditAffordance(state: DirectEditAffordanceState, event: DirectEditAffordanceEvent): DirectEditAffordanceState {
  if (event.type === 'clear') return initialDirectEditAffordance()
  if (event.type === 'surface-enter') return { ...state, target: event.target, visible: true, hoverSurface: true, hideAt: null }
  if (event.type === 'surface-leave') return scheduleDirectEditHide({ ...state, hoverSurface: false }, event.now)
  if (event.type === 'affordance-enter') return { ...state, visible: Boolean(state.target), hoverAffordance: true, hideAt: null }
  if (event.type === 'affordance-leave') return scheduleDirectEditHide({ ...state, hoverAffordance: false }, event.now)
  if (event.type === 'focus') return { ...state, target: event.target, visible: true, focused: true, hideAt: null }
  if (event.type === 'blur') return scheduleDirectEditHide({ ...state, focused: false }, event.now)
  if (event.type === 'drag-start') return { ...state, visible: Boolean(state.target), dragging: true, hideAt: null }
  if (event.type === 'drag-end') return scheduleDirectEditHide({ ...state, dragging: false }, event.now)
  return state.hideAt !== null && event.now >= state.hideAt ? initialDirectEditAffordance() : state
}

export function directEditPreviewEntity(entity: SceneEntity, target: DirectEditTarget, amount: number): SceneEntity {
  const preview = structuredClone(entity)
  if (target.entityId !== entity.id) return preview
  if (target.kind === 'sphere-radius' && entity.kind === 'sphere') {
    const radius = Math.max(.25, entity.dimensions[0] / 2 + amount)
    preview.dimensions = [radius * 2, radius * 2, radius * 2]
    return preview
  }
  if (target.kind === 'column-radius' && entity.kind === 'column') {
    const radius = Math.max(.25, entity.dimensions[0] / 2 + amount)
    preview.dimensions = [radius * 2, entity.dimensions[1], radius * 2]
    return preview
  }
  if (target.kind === 'column-height' && entity.kind === 'column') {
    const height = Math.max(.25, entity.dimensions[1] + amount)
    const delta = height - entity.dimensions[1]
    preview.dimensions[1] = height
    const shift = new THREE.Vector3(0, delta * target.direction / 2, 0).applyEuler(new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ'))
    preview.transform.position = new THREE.Vector3(...entity.transform.position).add(shift).toArray() as Vec3
    return preview
  }
  if (target.kind === 'block-face' && entity.kind === 'block') {
    const centerShift = new THREE.Vector3()
    for (let axis = 0; axis < 3; axis += 1) {
      if (!target.axes[axis]) continue
      const accepted = Math.max(.25, entity.dimensions[axis] + amount)
      const delta = accepted - entity.dimensions[axis]
      preview.dimensions[axis] = accepted
      centerShift.setComponent(axis, delta * Math.sign(target.axes[axis]) / 2)
    }
    centerShift.applyEuler(new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ'))
    preview.transform.position = new THREE.Vector3(...entity.transform.position).add(centerShift).toArray() as Vec3
  }
  return preview
}

export type DirectResizeTransaction = { source: CameraDocument; preview: CameraDocument; target: DirectEditTarget; amount: number; invalid: boolean; code?: string }
export function beginDirectResizeTransaction(document: CameraDocument, target: DirectEditTarget): DirectResizeTransaction {
  const source = structuredClone(document)
  return { source, preview: structuredClone(source), target, amount: 0, invalid: false }
}
export function previewDirectResizeTransaction(transaction: DirectResizeTransaction, amount: number, aids: { gridSnap: boolean; collision: boolean; frame: number; geometrySnapped?: boolean }): DirectResizeTransaction {
  const result = transaction.target.kind === 'sphere-radius'
    ? applySphereRadiusResize(transaction.source, transaction.target.entityId, { delta: amount, gridSnap: aids.gridSnap, optionBypass: Boolean(aids.geometrySnapped), collision: aids.collision, frame: aids.frame })
    : transaction.target.kind === 'column-radius'
      ? applyColumnResize(transaction.source, transaction.target.entityId, { target: 'radius', delta: amount, direction: 1, gridSnap: aids.gridSnap, optionBypass: Boolean(aids.geometrySnapped), collision: aids.collision, frame: aids.frame })
      : transaction.target.kind === 'column-height'
        ? applyColumnResize(transaction.source, transaction.target.entityId, { target: 'height', delta: amount, direction: transaction.target.direction, gridSnap: aids.gridSnap, optionBypass: Boolean(aids.geometrySnapped), collision: aids.collision, frame: aids.frame })
        : applyDimensionResize(transaction.source, transaction.target.entityId, { axes: [...transaction.target.axes] as Vec3, delta: transaction.target.axes.map((axis) => axis ? amount * axis : 0) as Vec3, gridSnap: aids.gridSnap, optionBypass: Boolean(aids.geometrySnapped), collision: aids.collision, frame: aids.frame })
  return result.ok ? { ...transaction, preview: result.document, amount, invalid: false, code: undefined } : { ...transaction, amount, invalid: true, code: result.code }
}

const blockFaceAxes: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
export function directEditKeyboardTargets(entity: SceneEntity, camera: THREE.Camera) {
  if (entity.resizeLocked) return []
  if (entity.kind === 'block') return blockFaceAxes.map((axes) => {
    const axisIndex = axes.findIndex(Boolean)
    const local = new THREE.Vector3(...axes)
    const rotation = new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
    const worldAxis = local.clone().applyEuler(rotation).normalize()
    const origin = new THREE.Vector3(...entity.transform.position).add(local.multiplyScalar(entity.dimensions[axisIndex] * entity.transform.scale[axisIndex] / 2).applyEuler(rotation))
    const axisName = ['X', 'Y', 'Z'][axisIndex]
    return { target: { kind: 'block-face' as const, entityId: entity.id, axes }, origin: origin.toArray() as Vec3, axis: worldAxis.toArray() as Vec3, accessibleLabel: `Resize Block ${axes[axisIndex] > 0 ? '+' : '-'}${axisName} face` }
  })
  if (entity.kind === 'sphere') {
    const radial = camera.position.clone().sub(new THREE.Vector3(...entity.transform.position)).normalize()
    const origin = new THREE.Vector3(...entity.transform.position).addScaledVector(radial, entity.dimensions[0] * entity.transform.scale[0] / 2)
    return [{ target: { kind: 'sphere-radius' as const, entityId: entity.id, radial: radial.toArray() as Vec3 }, origin: origin.toArray() as Vec3, axis: radial.toArray() as Vec3, accessibleLabel: 'Resize Sphere radius' }]
  }
  if (entity.kind === 'column') {
    const rotation = new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
    const center = new THREE.Vector3(...entity.transform.position)
    const localRadial = camera.position.clone().sub(center); localRadial.y = 0; if (!localRadial.lengthSq()) localRadial.set(0, 0, 1); localRadial.normalize()
    const radial = localRadial.applyEuler(rotation)
    const up = new THREE.Vector3(0, 1, 0).applyEuler(rotation).normalize()
    const halfHeight = entity.dimensions[1] * entity.transform.scale[1] / 2
    return [
      { target: { kind: 'column-radius' as const, entityId: entity.id, radial: radial.toArray() as Vec3 }, origin: center.clone().addScaledVector(radial, entity.dimensions[0] * entity.transform.scale[0] / 2).toArray() as Vec3, axis: radial.toArray() as Vec3, accessibleLabel: 'Resize Column radius' },
      { target: { kind: 'column-height' as const, entityId: entity.id, direction: 1 as const }, origin: center.clone().addScaledVector(up, halfHeight).toArray() as Vec3, axis: up.toArray() as Vec3, accessibleLabel: 'Resize Column height from top cap' },
      { target: { kind: 'column-height' as const, entityId: entity.id, direction: -1 as const }, origin: center.clone().addScaledVector(up, -halfHeight).toArray() as Vec3, axis: up.clone().negate().toArray() as Vec3, accessibleLabel: 'Resize Column height from bottom cap' },
    ]
  }
  return []
}

function blockSnapPoints(entity: SceneEntity): THREE.Vector3[] {
  if (entity.kind !== 'block') return []
  const rotation = new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
  const half = entity.dimensions.map((value, axis) => value * entity.transform.scale[axis] / 2) as Vec3
  const local: Vec3[] = [...blockFaceAxes.map((axis) => axis.map((value, index) => value * half[index]) as Vec3), ...[-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x * half[0], y * half[1], z * half[2]] as Vec3)))]
  return local.map((point) => new THREE.Vector3(...point).applyEuler(rotation).add(new THREE.Vector3(...entity.transform.position)))
}
export function geometrySnapDirectResize(entities: SceneEntity[], entityId: string, origin: Vec3, worldAxis: Vec3, rawAmount: number) {
  const start = new THREE.Vector3(...origin); const axis = new THREE.Vector3(...worldAxis).normalize()
  if (!axis.lengthSq() || !Number.isFinite(rawAmount) || Math.abs(rawAmount) > 100) return { snapped: false as const, amount: rawAmount }
  const candidates = entities.filter((entity) => entity.id !== entityId && entity.kind === 'block').flatMap(blockSnapPoints).map((point) => {
    const delta = point.clone().sub(start); const amount = delta.dot(axis); const perpendicular = delta.clone().addScaledVector(axis, -amount).length()
    return { point, amount, perpendicular, distance: Math.abs(amount - rawAmount) }
  }).filter((candidate) => candidate.perpendicular <= .35 && candidate.distance <= .75)
  candidates.sort((a, b) => a.distance - b.distance || a.perpendicular - b.perpendicular)
  const best = candidates[0]
  return best ? { snapped: true as const, amount: Number(best.amount.toFixed(6)), connection: { from: [...origin] as Vec3, to: best.point.toArray() as Vec3, dashed: true as const, color: '#54d6d0' as const } } : { snapped: false as const, amount: rawAmount }
}

export const DIRECT_EDIT_MIN_AXIS_CSS_PX = 8
export function projectedCameraAxisMetric(camera: THREE.Camera, origin: Vec3, worldAxis: Vec3, viewport: readonly [number, number]) {
  const axis = new THREE.Vector3(...worldAxis)
  if (!axis.lengthSq()) return { cssPixelsPerWorldUnit: 0, draggable: false, screenAxis: [0, 0] as const }
  axis.normalize()
  const base = new THREE.Vector3(...origin).project(camera)
  const tip = new THREE.Vector3(...origin).add(axis).project(camera)
  const screenAxis = new THREE.Vector2((tip.x - base.x) * viewport[0] / 2, -(tip.y - base.y) * viewport[1] / 2)
  const cssPixelsPerWorldUnit = screenAxis.length()
  return { cssPixelsPerWorldUnit, draggable: Number.isFinite(cssPixelsPerWorldUnit) && cssPixelsPerWorldUnit >= DIRECT_EDIT_MIN_AXIS_CSS_PX, screenAxis: screenAxis.toArray() as [number, number] }
}

export function projectCameraAxisDrag(camera: THREE.Camera, origin: Vec3, worldAxis: Vec3, start: readonly [number, number], current: readonly [number, number], viewport: readonly [number, number]): number | null {
  const metric = projectedCameraAxisMetric(camera, origin, worldAxis, viewport)
  if (!metric.draggable) return null
  const screenAxis = new THREE.Vector2(...metric.screenAxis)
  return new THREE.Vector2(current[0] - start[0], current[1] - start[1]).dot(screenAxis) / screenAxis.lengthSq()
}

export function universalGizmoContract(entity: SceneEntity) {
  const lockedCamera = entity.kind === 'camera' && entity.camera?.target.mode === 'locked'
  return {
    translationAxes: ['X', 'Y', 'Z'] as const,
    rotationAxes: ['X', 'Y', 'Z'] as const,
    sizing: entity.kind === 'block' ? 'face-move' as const : entity.kind === 'sphere' ? 'radial-offset' as const : entity.kind === 'human' ? 'inspector-only' as const : 'prohibited' as const,
    rotationEnabled: !lockedCamera,
    rotationDisabledReason: lockedCamera ? 'Unlock target to rotate camera' : undefined,
    colors: { X: '#ff719a', Y: '#70dda7', Z: '#54d6d0', uniform: '#f2eff9' } as const,
  }
}

export function orthographicFrameState(view: Exclude<ProjectionView, 'perspective'>, entities: SceneEntity[], aspect: number) {
  const bounds = boundsFor(entities)
  const center = bounds?.getCenter(new THREE.Vector3()) || new THREE.Vector3(0, 1, 0)
  const size = bounds?.getSize(new THREE.Vector3()) || new THREE.Vector3(2, 2, 2)
  const target = center.toArray() as Vec3
  const halfWidth = Math.max(.5, (view === 'side' ? size.z : size.x) / 2 + 1)
  const halfHeight = Math.max(.5, (view === 'top' ? size.z : size.y) / 2 + 1)
  const zoom = Math.max(.05, Math.min(20, Math.min(8 / halfHeight, 8 * Math.max(.01, aspect) / halfWidth)))
  const projection = projectionCameraState(view, target)
  return { position: projection.position, target, up: projection.up, zoom }
}

export type SceneMinimapBounds = { minX: number; maxX: number; minZ: number; maxZ: number }
export function sceneMinimapGeometry(entities: SceneEntity[], target: Vec3, width: number, height: number) {
  const points = [...entities.map((entity) => entity.transform.position), target]
  const minX = Math.min(...points.map((point) => point[0])) - 2; const maxX = Math.max(...points.map((point) => point[0])) + 2
  const minZ = Math.min(...points.map((point) => point[2])) - 2; const maxZ = Math.max(...points.map((point) => point[2])) + 2
  const bounds = { minX, maxX, minZ, maxZ }
  const project = (world: Vec3) => ({ x: (world[0] - minX) / Math.max(.001, maxX - minX) * width, y: (world[2] - minZ) / Math.max(.001, maxZ - minZ) * height })
  return {
    bounds,
    items: entities.map((entity) => ({ id: entity.id, kind: entity.kind, color: entity.color, world: [...entity.transform.position] as Vec3, ...project(entity.transform.position) })),
    target: { world: [...target] as Vec3, ...project(target) },
  }
}
export function sceneMinimapWorldPoint(bounds: SceneMinimapBounds, x: number, y: number, width: number, height: number): Vec3 {
  return [bounds.minX + Math.max(0, Math.min(1, x / Math.max(1, width))) * (bounds.maxX - bounds.minX), 0, bounds.minZ + Math.max(0, Math.min(1, y / Math.max(1, height))) * (bounds.maxZ - bounds.minZ)]
}
export function clampCameraSidebarWidth(width: number) { return Math.max(300, Math.min(480, Math.round(width))) }
export function cameraSidebarWidthForWorkspace(width: number, workspaceWidth: number) {
  return Math.min(clampCameraSidebarWidth(width), Math.max(300, Math.min(480, Math.round(workspaceWidth) - 600)))
}
export function cameraSidebarWidthForKey(width: number, key: string) {
  return clampCameraSidebarWidth(width + (key === 'ArrowLeft' ? 16 : key === 'ArrowRight' ? -16 : 0))
}
export function clampCameraInspectorHeight(height: number, totalHeight: number) { return Math.max(160, Math.min(totalHeight - 167, Math.round(height))) }
export function cameraInspectorHeightForKey(height: number, key: string, totalHeight: number) {
  return clampCameraInspectorHeight(height + (key === 'ArrowUp' ? 16 : key === 'ArrowDown' ? -16 : 0), totalHeight)
}
export function cameraInspectorSplitForPointer(totalHeight: number, pointerY: number) { return clampCameraInspectorHeight(totalHeight - 7 - pointerY, totalHeight) }
export const clampCameraTimelineHeight = (height:number, available=800) => Math.max(124,Math.min(Math.max(124,available-220),Math.round(height)))
export function cameraTimelineHeightForKey(current:number,key:string,available=800) { const maximum=Math.max(124,available-220); if (key==='Home') return 124; if (key==='End') return maximum; if (key==='ArrowUp') return clampCameraTimelineHeight(current+16,available); if (key==='ArrowDown') return clampCameraTimelineHeight(current-16,available); return clampCameraTimelineHeight(current,available) }
export const cameraTimelineHeightForPointer = (startHeight:number,startY:number,currentY:number,available=800) => clampCameraTimelineHeight(startHeight+startY-currentY,available)

export function cameraPathState(entities: SceneEntity[], progress: number) {
  const cameras = entities.filter((entity) => entity.kind === 'camera')
  const sampleCount = Math.max(1, (cameras.length - 1) * 24)
  const points = cameras.length < 2 ? [] : Array.from({ length: sampleCount + 1 }, (_, index) => evaluateCameraPath(entities, index / sampleCount).position)
  const arrows = cameras.slice(0, -1).map((_camera, index) => {
    const sample = evaluateCameraPath(entities, (index + .5) / (cameras.length - 1))
    return { position: sample.position, direction: sample.tangent, segmentIndex: index }
  })
  const evaluated = evaluateCameraPath(entities, progress)
  return {
    cameraIds: evaluated.cameraIds,
    points,
    arrows,
    cues: cameras.map((camera, order) => ({ id: camera.id, order, position: [...camera.transform.position] as Vec3 })),
    marker: { name: 'camera-play-marker', position: evaluated.position, authored: false as const, selectable: false as const, persisted: false as const },
  }
}

export function selectedCameraPathState(document: CameraDocument, cameraId: string, frame: number) {
  const camera = document.entities.find((entity) => entity.id === cameraId && entity.kind === 'camera')
  const positionKeys = camera?.keyframes.filter((keyframe) => keyframe.property === 'position' || keyframe.property?.startsWith('position.')).sort((a, b) => a.frame - b.frame) || []
  const authored = [...new Map(positionKeys.map((keyframe) => [keyframe.frame, keyframe])).values()]
  if (!camera || authored.length < 2) return { cameraId, points: [] as Vec3[], arrows: [] as Array<{ position: Vec3; direction: Vec3 }>, cues: authored.map((keyframe) => ({ id: keyframe.id, position: keyframe.transform.position })), marker: { name: 'camera-play-marker', position: [...(camera?.transform.position || [0, 1, 0])] as Vec3 } }
  const points: Vec3[] = []
  for (let index = 0; index < authored.length - 1; index += 1) {
    const a = authored[index].transform.position; const b = authored[index + 1].transform.position
    for (let step = 0; step < 24; step += 1) { const t = step / 24; points.push(a.map((value, axis) => value + (b[axis] - value) * t) as Vec3) }
  }
  points.push([...authored.at(-1)!.transform.position] as Vec3)
  const arrows = authored.slice(0, -1).map((keyframe, index) => { const a = keyframe.transform.position; const b = authored[index + 1].transform.position; return { position: a.map((value, axis) => (value + b[axis]) / 2) as Vec3, direction: new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize().toArray() as Vec3 } })
  const before = [...authored].reverse().find((keyframe) => keyframe.frame <= frame) || authored[0]; const after = authored.find((keyframe) => keyframe.frame >= frame) || authored.at(-1)!
  const t = before === after ? 0 : Math.max(0, Math.min(1, (frame - before.frame) / (after.frame - before.frame)))
  const marker = before.transform.position.map((value, axis) => value + (after.transform.position[axis] - value) * t) as Vec3
  return { cameraId, points, arrows, cues: authored.map((keyframe) => ({ id: keyframe.id, position: keyframe.transform.position })), marker: { name: 'camera-play-marker', position: marker } }
}

export type ViewportFinalizerReason = 'pointerup' | 'pointercancel' | 'lostpointercapture' | 'blur' | 'escape' | 'projection' | 'pilot-exit' | 'selection-change' | 'unmount'
export type ViewportInteractionState = { active: boolean; pointerId: number | null; captured: boolean; moved: boolean; committed: boolean; orbitEnabled: boolean; transformEnabled: boolean[] }
export function finalizeViewportInteractionState(state: ViewportInteractionState, _reason: ViewportFinalizerReason, allowCommit: boolean) {
  const commit = state.active && state.moved && !state.committed && allowCommit
  return { ...state, active: false, pointerId: null, captured: false, committed: state.committed || commit, commit, restoreOrbit: state.active, restoreTransforms: state.active, clearCursor: true, clearGuides: true, clearStatus: true }
}

export type SelectedEntityArrowEvent = Pick<KeyboardEvent, 'key' | 'altKey' | 'metaKey' | 'ctrlKey' | 'shiftKey'>
export type SelectedEntityArrowScope = { selectedKind?: EntityKind; selectedCount: number; textEntry: boolean; menuOpen: boolean; timelineRuler: boolean; toolbar: boolean; numericScrub: boolean }
export type CameraPanArrowScope = { textEntry: boolean; menuOpen: boolean; ruler: boolean; toolbar: boolean }
const arrowKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
export function cameraPanOwnsArrow(event: SelectedEntityArrowEvent, scope: CameraPanArrowScope, selectedEntityOwns = false) {
  return !selectedEntityOwns && event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !scope.textEntry && !scope.menuOpen && !scope.ruler && !scope.toolbar
}
export type SelectedArrowMotion = 'position' | 'vertical' | 'pitch' | 'yaw' | 'roll'
export function selectedArrowMotion(event: SelectedEntityArrowEvent): SelectedArrowMotion | null {
  if (!arrowKeys.has(event.key) || event.shiftKey || event.metaKey && event.ctrlKey) return null
  if (event.altKey && !event.metaKey && !event.ctrlKey) return event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'roll' : 'vertical'
  if (event.metaKey || event.ctrlKey) return event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'yaw' : 'pitch'
  return 'position'
}
export function panViewerScreenRight(position: Vec3, target: Vec3, direction: -1 | 1, distance = .25): { position: Vec3; target: Vec3 } {
  const from = new THREE.Vector3(...position); const to = new THREE.Vector3(...target); const forward = to.clone().sub(from)
  if (!from.toArray().every(Number.isFinite) || !to.toArray().every(Number.isFinite) || !forward.lengthSq() || !Number.isFinite(distance)) return { position: [...position] as Vec3, target: [...target] as Vec3 }
  forward.normalize()
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0))
  if (!right.lengthSq()) right.set(1, 0, 0)
  const delta = right.normalize().multiplyScalar(direction * Math.abs(distance))
  return { position: from.add(delta).toArray() as Vec3, target: to.add(delta).toArray() as Vec3 }
}
export function selectedEntityOwnsArrow(event: SelectedEntityArrowEvent, scope: SelectedEntityArrowScope) {
  return selectedArrowMotion(event) !== null && scope.selectedCount === 1 && Boolean(scope.selectedKind && ['camera', 'human', 'block', 'sphere', 'column'].includes(scope.selectedKind)) && !scope.textEntry && !scope.menuOpen && !scope.timelineRuler && !scope.toolbar && !scope.numericScrub
}
export function preciseSignedRotationDegrees(value: number): number {
  if (!Number.isFinite(value)) return 0
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 && value > 0 && value <= 180 ? 180 : wrapped
}
export function selectedEntityArrowTransform(document: CameraDocument, entityId: string, event: SelectedEntityArrowEvent): { handled: boolean; blocked: boolean; transform?: Transform; authoredKeyframes: 0 } {
  const entity = document.entities.find((item) => item.id === entityId)
  if (!entity || !arrowKeys.has(event.key) || event.shiftKey || event.metaKey && event.ctrlKey) return { handled: false, blocked: false, authoredKeyframes: 0 }
  const locked = entity.kind === 'camera' && entity.camera?.target.mode !== 'free'
  const rotationCommand = event.metaKey || event.ctrlKey || event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
  if ((entity.locks?.all || entity.locks?.transform) && !rotationCommand) return { handled: true, blocked: true, authoredKeyframes: 0 }
  if ((entity.locks?.all || entity.locks?.rotation) && rotationCommand) return { handled: true, blocked: true, authoredKeyframes: 0 }
  if (locked && rotationCommand && !event.altKey) return { handled: true, blocked: true, authoredKeyframes: 0 }
  const transform = structuredClone(entity.transform)
  if (rotationCommand) {
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) transform.rotation[2] = normalizeRotationDegrees(transform.rotation[2] + (event.key === 'ArrowRight' ? 1 : -1))
    else if (event.key === 'ArrowLeft') transform.rotation[1] = normalizeRotationDegrees(transform.rotation[1] - 1)
    else if (event.key === 'ArrowRight') transform.rotation[1] = normalizeRotationDegrees(transform.rotation[1] + 1)
    else if (event.key === 'ArrowUp') transform.rotation[0] = normalizeRotationDegrees(transform.rotation[0] + 1)
    else transform.rotation[0] = normalizeRotationDegrees(transform.rotation[0] - 1)
    if (locked && !event.altKey) return { handled: true, blocked: true, authoredKeyframes: 0 }
    return { handled: true, blocked: false, transform, authoredKeyframes: 0 }
  }
  if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    transform.position[1] = Number((transform.position[1] + (event.key === 'ArrowUp' ? .1 : -.1)).toFixed(8))
  } else {
    const euler = new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
    let axis: THREE.Vector3
    if (locked && entity.camera?.target.mode === 'locked') {
      const lockedTarget = entity.camera.target
      const target = document.entities.find((item) => item.id === lockedTarget.entityId)?.transform.position || lockedTarget.lastPosition || [0, 1, 0]
      axis = new THREE.Vector3(...target).sub(new THREE.Vector3(...entity.transform.position)).normalize()
    } else axis = new THREE.Vector3(event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 1 : 0, 0, event.key === 'ArrowUp' || event.key === 'ArrowDown' ? -1 : 0).applyEuler(euler)
    axis.y = locked ? axis.y : 0
    if (!axis.lengthSq()) axis.set(0, 0, -1)
    axis.normalize().multiplyScalar(event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? -.1 : .1)
    transform.position = new THREE.Vector3(...transform.position).add(axis).toArray().map((value) => Number(value.toFixed(8))) as Vec3
  }
  if (locked) {
    const preview = structuredClone(entity); preview.transform = structuredClone(transform)
    transform.rotation = resolvedCameraRotation(preview, document.entities.map((item) => item.id === entity.id ? preview : item))
  }
  return { handled: true, blocked: false, transform, authoredKeyframes: 0 }
}
export function selectedEntityArrowTransformAtElapsed(document: CameraDocument, entityId: string, event: SelectedEntityArrowEvent, elapsedMs: number) {
  const totalSteps = Math.max(0, elapsedMs / 50)
  const whole = Math.floor(totalSteps)
  let current = document
  let result = selectedEntityArrowTransform(current, entityId, event)
  if (result.blocked || !result.transform) return result
  for (let index = 1; index < whole; index += 1) {
    current = { ...current, entities: current.entities.map((item) => item.id === entityId ? { ...item, transform: result.transform! } : item) }
    result = selectedEntityArrowTransform(current, entityId, event)
    if (result.blocked || !result.transform) return result
  }
  const fraction = totalSteps - whole
  if (fraction > 0 && result.transform) {
    const base = current.entities.find((item) => item.id === entityId)!.transform
    const transform = structuredClone(result.transform)
    transform.position = transform.position.map((value, axis) => base.position[axis] + (value - base.position[axis]) * fraction) as Vec3
    transform.rotation = transform.rotation.map((value, axis) => base.rotation[axis] + (value - base.rotation[axis]) * fraction) as Vec3
    result = { ...result, transform }
  }
  return result
}

export type HeldArrowScheduler = {
  requestFrame(callback: (now: number) => void): number
  cancelFrame(handle: number): void
}
export type HeldArrowController = {
  start(event: SelectedEntityArrowEvent): void
  modifier(event: SelectedEntityArrowEvent): boolean
  keyup(key: string): boolean
  tick(now: number): void
  cancel(): void
  dispose(): void
}
export function createHeldArrowController(options: {
  document: CameraDocument
  entityId: string
  preview(transform: Transform): void
  commit(transform: Transform): void
  restore(): void
  scheduler: HeldArrowScheduler
  now(): number
  maxDeltaMs?: number
}): HeldArrowController {
  const pressed = new Map<string, SelectedEntityArrowEvent>()
  const base = options.document
  let authored = structuredClone(base.entities.find((entity) => entity.id === options.entityId)?.transform)
  let frame: number | null = null
  let lastNow: number | null = null
  let committed = false
  const baseTransform = structuredClone(authored)
  const differsFromBase = () => JSON.stringify(authored) !== JSON.stringify(baseTransform)
  const applyImmediateStep = (event: SelectedEntityArrowEvent) => {
    if (!authored) return
    const current = { ...base, entities: base.entities.map((entity) => entity.id === options.entityId ? { ...entity, transform: structuredClone(authored!) } : entity) }
    const result = selectedEntityArrowTransform(current, options.entityId, event)
    if (!result.blocked && result.transform) {
      authored = structuredClone(result.transform)
      options.preview(structuredClone(authored))
    }
  }
  const schedule = () => { if (frame === null) frame = options.scheduler.requestFrame((now) => { frame = null; tick(now); schedule() }) }
  const tick = (now: number) => {
    if (!pressed.size || !authored) return;
    const dt = Math.min(options.maxDeltaMs ?? 75, Math.max(0, lastNow === null ? 0 : now - lastNow))
    lastNow = now
    if (!dt) return
    const current = { ...base, entities: base.entities.map((entity) => entity.id === options.entityId ? { ...entity, transform: structuredClone(authored!) } : entity) }
    const deltas = { position: [0, 0, 0] as Vec3, rotation: [0, 0, 0] as Vec3 }
    for (const event of pressed.values()) {
      const result = selectedEntityArrowTransformAtElapsed(current, options.entityId, event, dt)
      if (result.blocked || !result.transform) continue
      result.transform.position.forEach((value, axis) => { deltas.position[axis] += value - authored!.position[axis] })
      result.transform.rotation.forEach((value, axis) => {
        const delta = value - authored!.rotation[axis]
        deltas.rotation[axis] += Math.abs(delta) > 180 ? (delta > 0 ? delta - 360 : delta + 360) : delta
      })
    }
    authored.position = authored.position.map((value, axis) => Number((value + deltas.position[axis]).toFixed(8))) as Vec3
    authored.rotation = authored.rotation.map((value, axis) => Number(preciseSignedRotationDegrees(value + deltas.rotation[axis]).toFixed(8))) as Vec3
    options.preview(structuredClone(authored))
  }
  const stop = (commit: boolean) => {
    if (frame !== null) options.scheduler.cancelFrame(frame)
    frame = null; pressed.clear(); lastNow = null
    if (commit && authored && !committed && differsFromBase()) { committed = true; options.commit(structuredClone(authored)) } else options.restore()
  }
  const controller: HeldArrowController = {
    start(event) {
      if (!authored) return
      if (!pressed.has(event.key)) applyImmediateStep(event)
      pressed.set(event.key, { key: event.key, altKey: event.altKey, metaKey: event.metaKey, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey })
      if (lastNow === null) lastNow = options.now()
      schedule()
    },
    modifier(event) {
      const released = [...pressed.values()].some((current) =>
        event.key === 'Alt' && current.altKey && !event.altKey ||
        event.key === 'Meta' && current.metaKey && !event.metaKey ||
        event.key === 'Control' && current.ctrlKey && !event.ctrlKey,
      )
      if (released) {
        stop(true)
        return true
      }
      for (const [key, current] of pressed) {
        const next = { ...current, altKey: event.altKey, metaKey: event.metaKey, ctrlKey: event.ctrlKey, shiftKey: current.shiftKey }
        pressed.set(key, next)
        if ((!current.altKey && next.altKey) || (!current.metaKey && next.metaKey) || (!current.ctrlKey && next.ctrlKey)) applyImmediateStep({ ...next, key })
      }
      return false
    },
    keyup(key) { pressed.delete(key); if (!pressed.size) { stop(true); return true } return false },
    tick,
    cancel() { if (pressed.size || frame !== null) stop(false) },
    dispose() { stop(false) },
  }
  return controller
}

export function selectedShapeGroupArrowTransform(document: CameraDocument, groupId: string, event: SelectedEntityArrowEvent): { handled: boolean; document: CameraDocument; authoredKeyframes: 0 } {
  const group = document.groups.find((item) => item.id === groupId)
  if (!group || !arrowKeys.has(event.key) || event.shiftKey || event.metaKey && event.ctrlKey) return { handled: false, document, authoredKeyframes: 0 }
  const rotationCommand = event.metaKey || event.ctrlKey
  if (rotationCommand) {
    const rotation: Vec3 = [0, 0, 0]
    if (event.key === 'ArrowLeft') rotation[1] = -1
    else if (event.key === 'ArrowRight') rotation[1] = 1
    else if (event.key === 'ArrowUp') rotation[2] = 1
    else rotation[2] = -1
    return { handled: true, document: transformShapeGroup(document, groupId, { rotation }), authoredKeyframes: 0 }
  }
  let delta = new THREE.Vector3()
  if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) delta.y = event.key === 'ArrowUp' ? .1 : -.1
  else {
    const euler = new THREE.Euler(...group.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
    delta = new THREE.Vector3(event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 1 : 0, 0, event.key === 'ArrowUp' || event.key === 'ArrowDown' ? -1 : 0).applyEuler(euler)
    delta.y = 0; if (!delta.lengthSq()) delta.set(0, 0, -1); delta.normalize().multiplyScalar(event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? -.1 : .1)
  }
  return { handled: true, document: transformShapeGroup(document, groupId, { translation: delta.toArray().map((value) => Number(value.toFixed(8))) as Vec3 }), authoredKeyframes: 0 }
}

export const shouldRenderPilotedEntityGuide = (entityId: string, pilotCameraId: string | null | undefined) => entityId !== pilotCameraId

export type CameraPilotEditorView = { projection: string; position: number[]; target: number[]; up: number[]; fov: number; selectedIds?: string[] }
export type CameraPilotState = { source: CameraDocument; document: CameraDocument; cameraId: string; editor: CameraPilotEditorView }
export function beginCameraPilot(document: CameraDocument, cameraId: string, editor: CameraPilotEditorView): CameraPilotState {
  if (!document.entities.some((entity) => entity.id === cameraId && entity.kind === 'camera')) throw new Error('CAMERA_NOT_FOUND')
  return { source: structuredClone(document), document: structuredClone(document), cameraId, editor: structuredClone(editor) }
}
export function updateCameraPilot(state: CameraPilotState, input: { orbit?: [number, number]; pan?: [number, number]; dolly?: number }): CameraPilotState {
  const next = structuredClone(state); const camera = next.document.entities.find((entity) => entity.id === state.cameraId)!
  const locked = camera.kind === 'camera' && camera.camera?.target.mode !== 'free'
  if (!locked) { camera.transform.rotation[1] += (input.orbit?.[0] || 0) * .15; camera.transform.rotation[0] += (input.orbit?.[1] || 0) * .15 }
  const euler = new THREE.Euler(...camera.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
  const lockedTarget = camera.camera?.target && camera.camera.target.mode !== 'free' ? camera.camera.target : null
  const right = new THREE.Vector3(1, 0, 0).applyEuler(euler); const up = new THREE.Vector3(0, 1, 0).applyEuler(euler); const forward = lockedTarget
    ? new THREE.Vector3(...(lockedTarget.mode === 'point' ? lockedTarget.position : next.document.entities.find((entity) => entity.id === lockedTarget.entityId)?.transform.position || lockedTarget.lastPosition || [0, 1, 0])).sub(new THREE.Vector3(...camera.transform.position)).normalize()
    : new THREE.Vector3(0, 0, -1).applyEuler(euler)
  const delta = locked
    ? new THREE.Vector3(0, -(input.pan?.[1] || 0) * .01, 0).add(forward.multiplyScalar((input.dolly || 0) * .015))
    : right.multiplyScalar((input.pan?.[0] || 0) * .01).add(up.multiplyScalar(-(input.pan?.[1] || 0) * .01)).add(forward.multiplyScalar((input.dolly || 0) * .015))
  camera.transform.position = new THREE.Vector3(...camera.transform.position).add(delta).toArray() as Vec3
  if (locked) camera.transform.rotation = resolvedCameraRotation(camera, next.document.entities)
  camera.baseFrame = undefined
  return next
}
export function finishCameraPilot(state: CameraPilotState) { return { document: state.document, restore: structuredClone(state.editor), undoTransactions: JSON.stringify(state.source) === JSON.stringify(state.document) ? 0 : 1 } }
