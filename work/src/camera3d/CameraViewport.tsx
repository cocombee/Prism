import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { CanvasNavigationControls } from '../renderer/src/CanvasNavigationControls'
import { responsiveMinimapSize } from '../shared/minimapGeometry'
import { Camera, Circle, Crosshair, Cylinder, RotateCcw } from 'lucide-react'
import { SEMANTIC_ICONS } from '../renderer/src/iconSystem'
import type { CameraDocument, EntityKind, EvaluatedFrame, SceneEntity, ShotClipColor, Transform, Vec3 } from './model'
import { cameraFov, canGroupEntities, evaluateFrame, resolvedCameraRotation, resolvedCameraView, transformAnchor, transformPointWorld } from './model'
import { CAMERA3D_ADD_CATALOG, cameraOrthoGroundLine, cameraPanOwnsArrow, panViewerScreenRight, selectedEntityOwnsArrow, DIRECT_EDIT_HOVER_GRACE_MS, beginDirectResizeTransaction, beginViewportPointer, cameraLensOrigin, cameraPathState, selectedCameraPathState, directEditAffordance, directEditKeyboardTargets, finishViewportPointer, fitCameraState, focusSelectionFrameState, frustumGeometry, geometrySnapDirectResize, gridState, initialDirectEditAffordance, normalizeViewportWheelDelta, orthographicFrameState, pointerGesture, previewDirectResizeTransaction, projectCameraAxisDrag, projectedCameraAxisMetric, projectionCameraState, retargetZoomMotion, stepZoomMotion, viewAlignedPointerDelta, voxelPartsFor, type DirectEditTarget, type DirectResizeTransaction, type ProjectionView, type ViewportPointerSequence, type ZoomMotionState } from './interaction'
import { CameraContextMenu, ExactCanvasCameraMiniMap, type CameraViewerSnapshot, type SceneMenuCommand, type SceneMenuTarget } from './exactCanvasCamera'
import { rebuildSceneContent, sceneEntityObject } from './threeScene'

export type CameraViewportHandle = { captureCleanFrame(frame: number, width: number, height: number): Promise<string>; viewThroughCamera(entityId: string): void; exitCameraPilot(): void; cancelDirectResize(): void; panScreenRight(direction: -1 | 1): void; setInteractionMode(mode: 'select' | 'position' | 'rotate'): void; setProjection(view: ProjectionView | Capitalize<ProjectionView>): void; addAtViewportCenter(kind: EntityKind, name: string): void }
type Props = {
  document: CameraDocument; frame: number; selectedIds: string[]
  guides: { grid: boolean; cameraPath: boolean; fov: boolean; entityPaths: boolean }
  onSelect(ids: string[]): void

  onTransform(id: string, transform: Transform, explicitAxis?: 'X' | 'Y' | 'Z' | 'XYZ' | null, optionBypass?: boolean): void
  onTransformPreview?(id: string, transform: Transform): void
  onDocumentPreview?(document: CameraDocument): void
  onPreviewCancel?(): void
  onDimensionResize?(id: string, axes: Vec3, delta: Vec3, optionBypass: boolean): void
  onSphereResize?(id: string, delta: number, optionBypass: boolean): void
  resizeAids?: { gridSnap: boolean; collision: boolean }
  onDirectResizeCommit?(document: CameraDocument): void
  onDirectResizeError?(message: string): void
  onAddAt?(kind: EntityKind, name: string, ground: Vec3): void
  clipboardAvailable?: boolean
  activeCameraId?: string | null
  onContextCommand?(command: SceneMenuCommand, entityIds: string[], ground: Vec3): void
  onObjectColor?(entityId: string, color: ShotClipColor): void
  memberEditGroupId?: string | null
  onPilotPreview?(entityId: string, transform: Transform): void
  onPilotCommit?(entityId: string, transform: Transform): void
  playbackRunning?: boolean
}
type Runtime = {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; perspective: THREE.PerspectiveCamera; orthographic: THREE.OrthographicCamera
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; content: THREE.Group; editorGuides: THREE.Group; pathGuides: THREE.Group; directGuides: THREE.Group
  controls: OrbitControls; transforms: { translate: TransformControls; rotate: TransformControls }; minorGrid: THREE.GridHelper; majorGrid: THREE.GridHelper; axes: THREE.AxesHelper
  preview: THREE.Mesh; raf: number; lastGround: Vec3
}
export function gridDistanceOpacity(distance: number, fadeStart: number, fadeEnd: number) {
  if (!Number.isFinite(distance) || fadeEnd <= fadeStart) return 0
  const t = Math.max(0, Math.min(1, (distance - fadeStart) / (fadeEnd - fadeStart)))
  return 1 - t * t * (3 - 2 * t)
}
const SCENE_ICONS = { human: SEMANTIC_ICONS.character, block: SEMANTIC_ICONS.element, sphere: Circle, column: Cylinder, camera: Camera } as const
// Shared threeScene.ts preserves the accepted Column contract: new THREE.CylinderGeometry(dimensions[0] / 2, dimensions[0] / 2, dimensions[1], 32, 1, false)

const frameLine = (points: Vec3[], material: THREE.LineBasicMaterial) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([...points, points[0]].map((point) => new THREE.Vector3(...point))), material)

export function cameraGuideEntity(document: CameraDocument, frame: number, cameraId: string) {
  const evaluated = evaluateFrame(document, frame)
  const source = evaluated.entities.find((item) => item.id === cameraId && item.kind === 'camera') as SceneEntity | undefined
  if (!source) throw new Error('CAMERA_NOT_FOUND')
  const shot = document.shots.find((item) => frame >= item.startFrame && frame < item.endFrame) || document.shots.at(-1)
  const activeId = shot?.camera.activeCameraId || evaluated.entities.find((item) => item.kind === 'camera')?.id
  const entity = source.id === activeId && source.camera ? { ...source, camera: { ...source.camera, ...evaluated.camera } } : source
  const lensOrigin = cameraLensOrigin(entity.transform)
  return { entity, entities: evaluated.entities as SceneEntity[], lensOrigin, frustumApex: lensOrigin }
}

function cameraFrustum(entity: SceneEntity, aspect: CameraDocument['aspect'], selected: boolean, entities: SceneEntity[]) {
  const metadata = entity.camera!
  const geometry = frustumGeometry({ focalLength: metadata.focalLength, aspect, near: metadata.near, far: metadata.far })
  const group = new THREE.Group(); group.name = 'camera-frustum-guide'
  const material = new THREE.LineBasicMaterial({ color: '#54d6d0', transparent: true, opacity: selected ? .85 : .34, depthTest: false })
  for (const ray of geometry.cornerRays) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ray.map((point) => new THREE.Vector3(...point))), material))
  group.add(frameLine(geometry.nearFrame, material), frameLine(geometry.farFrame, material))
  group.position.set(...cameraLensOrigin(entity.transform)); group.rotation.set(...resolvedCameraRotation(entity, entities).map(THREE.MathUtils.degToRad) as Vec3); group.renderOrder = 20
  return group
}
export function directEditSurfacePaint(target: DirectEditTarget, entity: SceneEntity) {
  const center = new THREE.Vector3(...entity.transform.position)
  const entityRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ'))
  let geometry: THREE.BufferGeometry
  let anchor = center.clone()
  let quaternion = new THREE.Quaternion()
  if (target.kind === 'block-face') {
    const axisIndex = target.axes.findIndex(Boolean)
    const orthogonal = [0, 1, 2].filter((index) => index !== axisIndex)
    const localNormal = new THREE.Vector3(...target.axes).normalize()
    const worldNormal = localNormal.clone().applyQuaternion(entityRotation)
    anchor.add(worldNormal.clone().multiplyScalar(entity.dimensions[axisIndex] * entity.transform.scale[axisIndex] / 2))
    center.copy(anchor)
    geometry = new THREE.PlaneGeometry(entity.dimensions[orthogonal[0]] * entity.transform.scale[orthogonal[0]], entity.dimensions[orthogonal[1]] * entity.transform.scale[orthogonal[1]])
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), worldNormal)
  } else if (target.kind === 'sphere-radius') {
    const normal = new THREE.Vector3(...target.radial).normalize()
    const radius = entity.dimensions[0] * entity.transform.scale[0] / 2
    anchor.addScaledVector(normal, radius)
    geometry = new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 5)
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
  } else if (target.kind === 'column-radius') {
    const worldNormal = new THREE.Vector3(...target.radial).normalize()
    const localNormal = worldNormal.clone().applyQuaternion(entityRotation.clone().invert())
    const radius = entity.dimensions[0] * entity.transform.scale[0] / 2
    const height = entity.dimensions[1] * entity.transform.scale[1]
    const theta = Math.atan2(localNormal.x, localNormal.z)
    anchor.addScaledVector(worldNormal, radius)
    geometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true, theta - Math.PI / 8, Math.PI / 4)
    quaternion.copy(entityRotation)
  } else {
    const localNormal = new THREE.Vector3(0, target.direction, 0)
    const worldNormal = localNormal.clone().applyQuaternion(entityRotation)
    const radius = entity.dimensions[0] * entity.transform.scale[0] / 2
    anchor.addScaledVector(worldNormal, entity.dimensions[1] * entity.transform.scale[1] / 2)
    center.copy(anchor)
    geometry = new THREE.CircleGeometry(radius, 32)
    quaternion.copy(entityRotation).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal))
  }
  return { geometry, center: center.toArray() as Vec3, anchor: anchor.toArray() as Vec3, quaternion }
}
function directEditGuide(target: DirectEditTarget, entity: SceneEntity, origin: Vec3, worldAxis: Vec3, amount = 0, invalid = false, cssPixelsPerWorldUnit = 100) {
  const group = new THREE.Group(); group.name = `${target.kind}-affordance`
  const axis = new THREE.Vector3(...worldAxis).normalize()
  const paintColor = invalid ? '#ff719a' : '#a58be8'
  const surface = directEditSurfacePaint(target, entity)
  const paint = new THREE.Mesh(surface.geometry, new THREE.MeshBasicMaterial({ color: paintColor, transparent: true, opacity: .34, depthTest: false, side: THREE.DoubleSide }))
  paint.name = `direct-edit-${target.kind}-surface-paint`
  paint.position.set(...surface.center); paint.quaternion.copy(surface.quaternion)
  const anchor = new THREE.Vector3(...surface.anchor)
  const arrow = new THREE.ArrowHelper(axis, anchor, .72, '#54d6d0', .2, .11); arrow.name = 'direct-edit-outward-normal-arrow'
  const hitRadius = 6 / Math.max(1, cssPixelsPerWorldUnit)
  const hit = new THREE.Mesh(new THREE.CapsuleGeometry(hitRadius, .72, 4, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false }))
  hit.position.copy(anchor.clone().addScaledVector(axis, .36)); hit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis); hit.name = 'direct-edit-hit-target'; hit.userData.hitCapsuleCssPx = 12
  for (const object of [group, arrow, ...arrow.children, hit, paint]) { object.userData.invalidProposal = invalid; object.renderOrder = 42 }
  hit.userData.directEditTarget = target; hit.userData.directEditOrigin = surface.anchor; hit.userData.directEditAxis = worldAxis
  group.userData.amount = amount; group.add(paint, arrow, hit)
  return group
}
function gizmoAxisLabels(entity: SceneEntity) {
  const group = new THREE.Group(); group.name = 'universal-gizmo-axis-labels'; group.position.set(...entity.transform.position)
  const labels: Array<['X' | 'Y' | 'Z', string, Vec3]> = [['X', '#ff719a', [1.28, 0, 0]], ['Y', '#70dda7', [0, 1.28, 0]], ['Z', '#54d6d0', [0, 0, 1.28]]]
  for (const [label, color, position] of labels) { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const context = canvas.getContext('2d')!; context.font = '700 38px Inter, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = color; context.fillText(label, 32, 34); const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, depthWrite: false, transparent: true }); const sprite = new THREE.Sprite(material); sprite.name = `gizmo-axis-label-${label}`; sprite.position.set(...position); sprite.scale.set(.34, .34, .34); sprite.renderOrder = 40; group.add(sprite) }
  return group
}
export function gizmoVisualTreatment(family: 'translate' | 'rotate', axis: string, activeFamily: 'translate' | 'rotate' | null, activeAxis: string | null) {
  const active = family === activeFamily && Boolean(activeAxis) && axis === activeAxis
  return { opacity: active ? 1 : .5, linewidth: active ? 3 : 1 }
}
export function applyGizmoPalette(helper: THREE.Object3D, family: 'translate' | 'rotate', activeFamily: 'translate' | 'rotate' | null = null, activeAxis: string | null = null) {
  const visit = (object: THREE.Object3D, picker = false) => {
    const isPicker = picker || object.name.toLowerCase().includes('picker')
    const material = (object as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
    object.userData['data-picker-gizmo-scale'] = isPicker ? 1 : undefined
    if (material && !Array.isArray(material) && !isPicker) { const axis = object.name.toUpperCase(); if (axis.includes('X')) material.color?.set('#ff719a'); else if (axis.includes('Y')) material.color?.set('#70dda7'); else if (axis.includes('Z')) material.color?.set('#54d6d0'); const treatment = gizmoVisualTreatment(family, axis, activeFamily, activeAxis); material.depthTest = false; material.transparent = true; material.opacity = treatment.opacity; (material as unknown as THREE.LineBasicMaterial).linewidth = treatment.linewidth; if (!object.userData.seventeenthVisualScaled) { const geometry=(object as THREE.Mesh).geometry; const head=geometry?.type.includes('Cone') || geometry?.type.includes('Octahedron'); const visibleScale=head?.valueOf() ? .7 : .6; object.scale.multiplyScalar(visibleScale); object.userData.seventeenthVisualScaled=true; object.userData['data-visible-gizmo-scale']=visibleScale } }
    object.children.forEach((child) => visit(child, isPicker))
  }
  visit(helper)
}

export const shouldRenderCameraGuide = (cameraId: string, pilotCameraId: string | null | undefined) => cameraId !== pilotCameraId
export const editorFrameForPilot = (frame: EvaluatedFrame, pilotCameraId: string | null | undefined): EvaluatedFrame => pilotCameraId
  ? { ...frame, entities: frame.entities.filter((entity) => entity.id !== pilotCameraId) }
  : frame
export const cleanRenderFrameWithoutCameraEntities = (frame: EvaluatedFrame): EvaluatedFrame => ({ ...frame, entities: frame.entities.filter((entity) => entity.kind !== 'camera') })
export function syncPilotPerspectiveLens(perspective: THREE.PerspectiveCamera, document: CameraDocument, pilotCameraId: string | null | undefined) {
  const camera = document.entities.find((entity) => entity.id === pilotCameraId && entity.kind === 'camera')
  if (!camera?.camera) return false
  const lens = cameraFov(camera.camera.focalLength, document.aspect, camera.camera.near, camera.camera.far)
  perspective.fov = lens.verticalDegrees
  perspective.near = camera.camera.near
  perspective.far = camera.camera.far
  perspective.updateProjectionMatrix()
  return true
}
export function isPilotCameraOnlyTransformChange(previous: CameraDocument | null, next: CameraDocument, pilotCameraId: string | null | undefined) {
  if (!previous || !pilotCameraId) return false
  const withoutPilotTransform = (document: CameraDocument) => ({ ...document, entities: document.entities.map((entity) => entity.id === pilotCameraId ? { ...entity, transform: undefined } : entity) })
  return JSON.stringify(withoutPilotTransform(previous)) === JSON.stringify(withoutPilotTransform(next)) && JSON.stringify(previous.entities.find((entity) => entity.id === pilotCameraId)?.transform) !== JSON.stringify(next.entities.find((entity) => entity.id === pilotCameraId)?.transform)
}

export const CameraViewport = forwardRef<CameraViewportHandle, Props>(function CameraViewport(props, ref) {
  const host = useRef<HTMLDivElement>(null); const runtime = useRef<Runtime | null>(null); const gesture = useRef(pointerGesture.initial())
  const activePreviewObject = useRef<THREE.Object3D | null>(null)
  const viewportCenterGroundRef = useRef<() => Vec3>(() => [0,0,0])
  const explicitDropGroundRef = useRef<(x:number,y:number) => Vec3>(() => [0,0,0])
  const pointerOrigin = useRef<ViewportPointerSequence | null>(null)
  const lastPerspective = useRef({ position: [9, 7, 12] as Vec3, target: [0, 1, 0] as Vec3, up: [0, 1, 0] as Vec3 })
  const directState = useRef(initialDirectEditAffordance())
  const directDrag = useRef<{ target: DirectEditTarget; originPointer: [number, number]; origin: Vec3; axis: Vec3; amount: number; transaction: DirectResizeTransaction; orbitEnabled: boolean; transformEnabled: boolean[] } | null>(null)
  const entityDrag = useRef<{ entityId: string; originPointer: [number, number]; originTransform: Transform; right: Vec3; up: Vec3; worldPerPixel: number; orbitEnabled: boolean; moved: boolean; preview: Transform } | null>(null)
  const directKeyboard = useRef<{ stops: ReturnType<typeof directEditKeyboardTargets>; index: number; transaction: DirectResizeTransaction; amount: number } | null>(null)
  const cancelDirectResizeRef = useRef<() => boolean>(() => false)
  const finalizeInteractionRef = useRef<(reason: 'pointerup' | 'pointercancel' | 'lostpointercapture' | 'blur' | 'escape' | 'projection' | 'pilot-exit' | 'selection-change' | 'lock-change' | 'unmount', event?: PointerEvent) => boolean>(() => false)
  const selectionSignature = useRef(props.selectedIds.join('|'))
  const lockSignature = useRef('')
  const zoomMotion = useRef<ZoomMotionState | null>(null)
  const cameraAnimation = useRef<{ startPosition: THREE.Vector3; startTarget: THREE.Vector3; position: THREE.Vector3; target: THREE.Vector3; began: number; duration: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; ground: Vec3; target: SceneMenuTarget; entityIds: string[] } | null>(null)
  const contextReturnFocus = useRef<HTMLElement | null>(null)
  const restoreContextMenuFocus = () => { setContextMenu(null); requestAnimationFrame(() => contextReturnFocus.current?.focus()) }
  const [projection, setProjection] = useState<ProjectionView>('perspective')
  const projectionRef = useRef<ProjectionView>('perspective')
  const [viewerSnapshot, setViewerSnapshot] = useState<CameraViewerSnapshot>({ mode: 'perspective', position: [9, 7, 12], target: [0, 1, 0], verticalFovDegrees: 42, near: .1, far: 500, pilotCameraId: null })
  const [interactionMode, setInteractionMode] = useState<'select' | 'position' | 'rotate'>('select')
  const pilot = useRef<{ entityId: string; projection: ProjectionView; camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; position: Vec3; target: Vec3; up: Vec3; quaternion: [number, number, number, number]; projectionMatrix: number[]; projectionMatrixInverse: number[]; fov: number; zoom: number; transform: Transform; sourceTransform: Transform; selection: string[]; pointerButton: number | null; lastCameraPosition: Vec3; lastTarget: Vec3 } | null>(null)
  const [pilotCameraId, setPilotCameraId] = useState<string | null>(null)
  const [directEditStatus, setDirectEditStatus] = useState('')
  const [directEditLabel, setDirectEditLabel] = useState('')
  const [minimapSize, setMinimapSize] = useState({ width: 195, height: 114 })
  const previousDocument = useRef<CameraDocument | null>(null)
  const state = useRef(props); state.current = props
  const publishViewerSnapshot = () => { const value = runtime.current; if (!value) return; const mode = projectionRef.current; const camera = value.camera; const pilotId = pilot.current?.entityId || null; const authoredPath = pilotId ? state.current.document.entities.find((entity) => entity.id === pilotId)?.keyframes.filter((keyframe) => keyframe.property === 'position' || keyframe.property?.startsWith('position.')).map((keyframe) => keyframe.transform.position) : undefined; const next: CameraViewerSnapshot = mode === 'perspective' || pilotId ? { mode: 'perspective', position: camera.position.toArray() as Vec3, target: value.controls.target.toArray() as Vec3, verticalFovDegrees: value.perspective.fov, near: value.perspective.near, far: value.perspective.far, pilotCameraId: pilotId, authoredPath } : { mode, position: camera.position.toArray() as Vec3, target: value.controls.target.toArray() as Vec3, zoom: value.orthographic.zoom }; setViewerSnapshot((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next) }

  const animateCamera = (position: Vec3, target: Vec3, duration = 180) => {
    const value = runtime.current; if (!value) return
    zoomMotion.current = null
    cameraAnimation.current = { startPosition: value.camera.position.clone(), startTarget: value.controls.target.clone(), position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), began: performance.now(), duration }
  }
  const queueZoom = (normalizedDelta: number) => { const value = runtime.current; if (!value) return; cameraAnimation.current = null; const mode = value.camera instanceof THREE.OrthographicCamera ? 'orthographic' : 'perspective'; const current = mode === 'orthographic' ? value.camera.zoom : value.camera.position.distanceTo(value.controls.target); const base: ZoomMotionState = zoomMotion.current?.mode === mode ? zoomMotion.current : { mode, currentLog: Math.log(current), targetLog: Math.log(current), active: false }; zoomMotion.current = retargetZoomMotion(base, normalizedDelta) }
  const pilotTranslate = (delta: THREE.Vector3) => {
    const value = runtime.current; const current = pilot.current
    if (!value || !current) return false
    const authored = state.current.document.entities.find((entity) => entity.id === current.entityId && entity.kind === 'camera')
    if (!authored) return false
    current.transform.position = new THREE.Vector3(...current.transform.position).add(delta).toArray() as Vec3
    const entities = state.current.document.entities.map((entity) => entity.id === current.entityId ? { ...authored, transform: structuredClone(current.transform) } : entity)
    if (authored.camera?.target.mode !== 'free') current.transform.rotation = resolvedCameraRotation({ ...authored, transform: structuredClone(current.transform) }, entities)
    value.perspective.position.set(...current.transform.position); value.perspective.rotation.set(...current.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3)
    const view = resolvedCameraView({ ...authored, transform: structuredClone(current.transform) }, entities)
    value.controls.target.set(...view.target); current.lastCameraPosition = current.transform.position; current.lastTarget = view.target
    state.current.onPilotPreview?.(current.entityId, structuredClone(current.transform)); publishViewerSnapshot()
    return true
  }
  const dolly = (factor: number) => {
    const current = pilot.current; const value = runtime.current
    if (!current || !value) return queueZoom(Math.log(factor) / .0015)
    const authored = state.current.document.entities.find((entity) => entity.id === current.entityId && entity.kind === 'camera')
    if (!authored) return
    const target = resolvedCameraView(authored, state.current.document.entities).target
    const forward = new THREE.Vector3(...target).sub(value.perspective.position).normalize()
    pilotTranslate(forward.multiplyScalar(Math.log(factor) / .0015 * .015))
  }
  const fit = () => { const value = runtime.current; if (!value) return; if (projection !== 'perspective') { cameraAnimation.current = null; zoomMotion.current = null; const next = orthographicFrameState(projection, state.current.document.entities, value.perspective.aspect); value.orthographic.zoom = next.zoom; value.orthographic.up.set(...next.up); value.orthographic.position.set(...next.position); value.controls.target.set(...next.target); value.orthographic.lookAt(...next.target); value.orthographic.updateProjectionMatrix(); return } const next = fitCameraState(state.current.document.entities); animateCamera(next.position, next.target, 300) }
  const focus = () => {
    const value = runtime.current; if (!value || !state.current.selectedIds.length) return
    const next = focusSelectionFrameState({ entities: evaluateFrame(state.current.document, state.current.frame).entities as SceneEntity[], selectedIds: state.current.selectedIds, projection, position: value.camera.position.toArray() as Vec3, target: value.controls.target.toArray() as Vec3, verticalFovDegrees: value.perspective.fov, aspect: value.perspective.aspect, orthographicHalfHeight: Math.abs(value.orthographic.top - value.orthographic.bottom) / 2, orthographicZoom: value.orthographic.zoom })
    if (!next.changed) return
    if (projection !== 'perspective') { zoomMotion.current = null; value.orthographic.zoom = next.orthographicZoom; value.orthographic.updateProjectionMatrix() }
    animateCamera(next.position, next.target)
  }
  const switchProjection = (view: ProjectionView) => {
    const value = runtime.current; if (!value) return
    finalizeInteractionRef.current('projection')
    cameraAnimation.current = null; zoomMotion.current = null
    if (projection === 'perspective') lastPerspective.current = { position: value.perspective.position.toArray() as Vec3, target: value.controls.target.toArray() as Vec3, up: value.perspective.up.toArray() as Vec3 }
    const camera = view === 'perspective' ? value.perspective : value.orthographic; value.camera = camera; value.controls.object = camera
    for (const transform of Object.values(value.transforms)) (transform as unknown as { camera: THREE.Camera }).camera = camera
    value.controls.enableRotate = view === 'perspective'; value.controls.enablePan = true; value.controls.enableZoom = false
    if (view === 'perspective') {
      const next = projectionCameraState(view, value.controls.target.toArray() as Vec3, lastPerspective.current)
      camera.up.set(...next.up); camera.position.set(...next.position); value.controls.target.set(...next.target); camera.lookAt(...next.target)
    } else {
      const next = orthographicFrameState(view, state.current.document.entities, value.perspective.aspect)
      value.orthographic.zoom = next.zoom; camera.up.set(...next.up); camera.position.set(...next.position); value.controls.target.set(...next.target); camera.lookAt(...next.target)
    }
    camera.updateProjectionMatrix(); projectionRef.current = view; setProjection(view); requestAnimationFrame(publishViewerSnapshot)
  }
  const exitCameraPilot = () => {
    const value = runtime.current; const saved = pilot.current
    if (!value || !saved) return
    finalizeInteractionRef.current('pilot-exit')
    if (JSON.stringify(saved.transform) !== JSON.stringify(saved.sourceTransform)) state.current.onPilotCommit?.(saved.entityId, saved.transform)
    value.camera = saved.camera; value.controls.object = saved.camera; value.controls.target.set(...saved.target)
    saved.camera.position.set(...saved.position); saved.camera.up.set(...saved.up)
    if (saved.camera instanceof THREE.PerspectiveCamera) saved.camera.fov = saved.fov
    else saved.camera.zoom = saved.zoom
    saved.camera.quaternion.fromArray(saved.quaternion); saved.camera.updateMatrixWorld(true); saved.camera.updateProjectionMatrix(); saved.camera.projectionMatrix.fromArray(saved.projectionMatrix); saved.camera.projectionMatrixInverse.fromArray(saved.projectionMatrixInverse)
    for (const transform of Object.values(value.transforms)) (transform as unknown as { camera: THREE.Camera }).camera = saved.camera
    pilot.current = null; setPilotCameraId(null); projectionRef.current = saved.projection; setProjection(saved.projection); state.current.onSelect([...saved.selection]); requestAnimationFrame(publishViewerSnapshot)
  }
  const viewThroughCamera = (entityId: string) => {
    const value = runtime.current; const entity = state.current.document.entities.find((item) => item.id === entityId && item.kind === 'camera')
    if (!value || !entity?.camera) return
    if (pilot.current) exitCameraPilot()
    const active = value.camera
    const evaluatedFrame = evaluateFrame(state.current.document, state.current.frame)
    const evaluated = evaluatedFrame.entities.find((item) => item.id === entityId && item.kind === 'camera') as SceneEntity | undefined
    if (!evaluated) return
    const authored = structuredClone(evaluated.transform)
    const view = resolvedCameraView(evaluated, evaluatedFrame.entities as SceneEntity[])
    pilot.current = { entityId, projection, camera: active, position: active.position.toArray() as Vec3, target: value.controls.target.toArray() as Vec3, up: active.up.toArray() as Vec3, quaternion: active.quaternion.toArray() as [number, number, number, number], projectionMatrix: active.projectionMatrix.toArray(), projectionMatrixInverse: active.projectionMatrixInverse.toArray(), fov: active instanceof THREE.PerspectiveCamera ? active.fov : value.perspective.fov, zoom: active instanceof THREE.OrthographicCamera ? active.zoom : value.orthographic.zoom, transform: structuredClone(authored), sourceTransform: structuredClone(authored), selection: [entityId], pointerButton: null, lastCameraPosition: [...view.position], lastTarget: [...view.target] }
    state.current.onSelect([entityId])
    value.camera = value.perspective; value.controls.object = value.perspective
    value.perspective.position.set(...view.position); value.perspective.rotation.set(...view.rotation.map(THREE.MathUtils.degToRad) as Vec3)
    value.perspective.up.set(0, 1, 0); value.perspective.fov = cameraFov(entity.camera.focalLength, state.current.document.aspect, entity.camera.near, entity.camera.far).verticalDegrees; value.perspective.updateProjectionMatrix()
    value.controls.target.set(...view.target); projectionRef.current = 'perspective'; requestAnimationFrame(publishViewerSnapshot)
    value.controls.enableRotate = entity.camera.target.mode === 'free'; value.controls.enablePan = true
    for (const transform of Object.values(value.transforms)) (transform as unknown as { camera: THREE.Camera }).camera = value.perspective
    setProjection('perspective'); setPilotCameraId(entityId)
  }

  useEffect(() => {
    if (!host.current) return
    const initialGrid = gridState([0, 0, 0]); const scene = new THREE.Scene(); scene.background = new THREE.Color('#181720'); scene.fog = new THREE.Fog('#181720', initialGrid.fadeStart, initialGrid.fadeEnd)
    const perspective = new THREE.PerspectiveCamera(42, 1, .1, 500); perspective.position.set(9, 7, 12)
    const orthographic = new THREE.OrthographicCamera(-8, 8, 8, -8, .1, 500); orthographic.position.set(0, 1, 12)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.domElement.tabIndex = 0; host.current.append(renderer.domElement)
    const content = new THREE.Group(); scene.add(content); scene.add(new THREE.HemisphereLight('#dad7ff', '#29252f', 1.2)); const key = new THREE.DirectionalLight('#fff2dd', 2); key.position.set(7, 11, 5); key.castShadow = true; scene.add(key)
    const editorGuides = new THREE.Group(); const pathGuides = new THREE.Group(); const directGuides = new THREE.Group(); directGuides.name = 'hover-direct-edit-guides'; directGuides.userData.hoverGraceMs = DIRECT_EDIT_HOVER_GRACE_MS; editorGuides.add(pathGuides, directGuides); scene.add(editorGuides)
    const minorGrid = new THREE.GridHelper(initialGrid.size, initialGrid.size / initialGrid.minorStep, '#35313e', '#35313e'); const majorGrid = new THREE.GridHelper(initialGrid.size, initialGrid.size / initialGrid.majorStep, '#51495f', '#51495f'); majorGrid.position.y = .003; for (const grid of [minorGrid, majorGrid]) { const material = grid.material as THREE.LineBasicMaterial; material.transparent = true; material.opacity = 1 } editorGuides.add(minorGrid, majorGrid); const groundBaseline = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#b8b0c4', transparent: true, opacity: .22, depthTest: false })); groundBaseline.renderOrder = 3; editorGuides.add(groundBaseline)
    const axes = new THREE.AxesHelper(140); (axes.material as THREE.LineBasicMaterial).transparent = true; (axes.material as THREE.LineBasicMaterial).opacity = .5; axes.position.y = .006; editorGuides.add(axes)
    const preview = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#9b7bea', transparent: true, opacity: .28, wireframe: true, depthTest: false })); preview.visible = false; editorGuides.add(preview)
    const controls = new OrbitControls(perspective, renderer.domElement); controls.enableDamping = true; controls.enableZoom = false; controls.dampingFactor = .08; controls.mouseButtons = { LEFT: undefined, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE }; controls.target.set(0, 1, 0)
    const pilotControlsChange = () => {
      const current = pilot.current; if (!current || current.pointerButton === null) return
      const authoredCamera = state.current.document.entities.find((entity) => entity.id === current.entityId && entity.kind === 'camera')
      const authoredTarget = authoredCamera?.camera?.target
      const lockedTarget = authoredTarget && authoredTarget.mode !== 'free' ? authoredTarget : null
      const locked = Boolean(lockedTarget)
      if (lockedTarget && authoredCamera) {
        const target = lockedTarget.mode === 'point' ? lockedTarget.position : state.current.document.entities.find((entity) => entity.id === lockedTarget.entityId)?.transform.position || lockedTarget.lastPosition || [0, 1, 0]
        if (current.pointerButton === 1) current.transform.position[1] += perspective.position.y - current.lastCameraPosition[1]
        perspective.position.set(...current.transform.position); controls.target.set(...target)
        const preview = structuredClone(authoredCamera); preview.transform = structuredClone(current.transform); current.transform.rotation = resolvedCameraRotation(preview, state.current.document.entities.map((entity) => entity.id === preview.id ? preview : entity))
        perspective.rotation.set(...current.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3)
        current.lastCameraPosition = perspective.position.toArray() as Vec3; current.lastTarget = controls.target.toArray() as Vec3
        if (current.pointerButton === 1) state.current.onPilotPreview?.(current.entityId, structuredClone(current.transform))
        return
      }
      if (current.pointerButton === 1) {
        const delta = perspective.position.clone().sub(new THREE.Vector3(...current.lastCameraPosition)); current.transform.position = new THREE.Vector3(...current.transform.position).add(delta).toArray() as Vec3
      } else {
        const direction = controls.target.clone().sub(perspective.position).normalize(); perspective.position.set(...current.transform.position); controls.target.copy(perspective.position).add(direction)
        const matrix = new THREE.Matrix4().lookAt(perspective.position, controls.target, perspective.up); const rotation = new THREE.Euler().setFromRotationMatrix(matrix, 'XYZ'); current.transform.rotation = [rotation.x, rotation.y, rotation.z].map(THREE.MathUtils.radToDeg) as Vec3
      }
      current.lastCameraPosition = perspective.position.toArray() as Vec3; current.lastTarget = controls.target.toArray() as Vec3; state.current.onPilotPreview?.(current.entityId, structuredClone(current.transform))
    }
    controls.addEventListener('change', pilotControlsChange); controls.addEventListener('change', publishViewerSnapshot)
    const translate = new TransformControls(perspective, renderer.domElement); translate.setMode('translate'); translate.setSpace('local'); translate.setSize(.9); translate.setTranslationSnap(null)
    const rotate = new TransformControls(perspective, renderer.domElement); rotate.setMode('rotate'); rotate.setSpace('local'); rotate.setSize(1.08)
    const transforms = { translate, rotate }; for (const [family, control] of Object.entries(transforms) as Array<['translate' | 'rotate', TransformControls]>) { const helper = control.getHelper(); helper.userData.gizmoFamily = family; applyGizmoPalette(helper, family); helper.traverse((object) => { object.renderOrder = 30 }); helper.visible = false; scene.add(helper) }
    let activeTransform: TransformControls | null = null
    let activeGizmoFamily: 'translate' | 'rotate' | null = null; let activeGizmoAxis: string | null = null
    const restoreTransformAvailability = () => {
      const entity = state.current.document.entities.find((item) => item.id === state.current.selectedIds[0])
      const eligible = Boolean(entity && state.current.selectedIds.length === 1 && !pilot.current)
      const humanLocked = Boolean(entity?.locks?.all || entity?.locks?.transform)
      const cameraLocked = entity?.kind === 'camera' && entity.camera?.target.mode !== 'free'
      translate.showX = !cameraLocked; translate.showY = true; translate.showZ = true
      translate.enabled = eligible && !humanLocked
      rotate.enabled = eligible && !cameraLocked
      translate.getHelper().visible = translate.enabled
      rotate.getHelper().visible = rotate.enabled
    }
    const transformFromObject = (object: THREE.Object3D, entity?: SceneEntity): Transform => ({ position: object.position.toArray() as Vec3, rotation: [THREE.MathUtils.radToDeg(object.rotation.x), THREE.MathUtils.radToDeg(object.rotation.y), THREE.MathUtils.radToDeg(object.rotation.z)], scale: object.scale.toArray() as Vec3, anchor: entity ? transformAnchor(entity.transform) : [0, 0, 0] })
    for (const control of Object.values(transforms)) {
      control.addEventListener('dragging-changed', (event) => { const dragging = Boolean(event.value); activeTransform = dragging ? control : null; activePreviewObject.current = dragging ? control.object : null; controls.enabled = !dragging; if (dragging) { activeGizmoFamily = control === translate ? 'translate' : 'rotate'; activeGizmoAxis = control.axis; for (const sibling of Object.values(transforms)) if (sibling !== control) sibling.enabled = false } else restoreTransformAvailability() })
      control.addEventListener('objectChange', () => { const object = control.object; if (!object?.userData.entityId) return; const entity = state.current.document.entities.find((item) => item.id === object.userData.entityId); state.current.onTransformPreview?.(object.userData.entityId, transformFromObject(object, entity)) })
      control.addEventListener('mouseUp', (event) => { const object = control.object; if (!object?.userData.entityId) return; const axis = control.axis === 'X' || control.axis === 'Y' || control.axis === 'Z' || control.axis === 'XYZ' ? control.axis : null; const entity = state.current.document.entities.find((item) => item.id === object.userData.entityId); state.current.onTransform(object.userData.entityId, transformFromObject(object, entity), axis, (event as unknown as MouseEvent).altKey) })
    }
    const resize = () => { const rect = host.current!.getBoundingClientRect(); renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false); perspective.aspect = rect.width / Math.max(1, rect.height); perspective.updateProjectionMatrix(); const size = 8; orthographic.left = -size * perspective.aspect; orthographic.right = size * perspective.aspect; orthographic.top = size; orthographic.bottom = -size; orthographic.updateProjectionMatrix(); setMinimapSize(responsiveMinimapSize(rect.width, rect.height)); restoreContextMenuFocus() }
    const observer = new ResizeObserver(resize); observer.observe(host.current); resize()
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2()
    const pointerRay = (clientX: number, clientY: number) => { const rect = renderer.domElement.getBoundingClientRect(); pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, runtime.current!.camera); return raycaster }
    const groundAt = (x: number, y: number): Vec3 => { pointerRay(x, y); const hit = new THREE.Vector3(); if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return runtime.current!.lastGround; const ground = hit.toArray() as Vec3; runtime.current!.lastGround = ground; return ground }
    const viewportCenterGround = (): Vec3 => { const rect=renderer.domElement.getBoundingClientRect(); pointerRay(rect.left+rect.width/2,rect.top+rect.height/2); const hit=new THREE.Vector3(); if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit) && hit.toArray().every(Number.isFinite)) return hit.toArray() as Vec3; const target=controls.target; return [Number.isFinite(target.x)?target.x:0,0,Number.isFinite(target.z)?target.z:0] }
    viewportCenterGroundRef.current=viewportCenterGround
    explicitDropGroundRef.current=(x,y)=>groundAt(x,y)
    const intersectionAt = (x: number, y: number) => { pointerRay(x, y); return raycaster.intersectObjects([directGuides, content], true).find((hit) => hit.object.userData.directEditTarget || hit.object.userData.entityId) }
    const objectAt = (x: number, y: number) => intersectionAt(x, y)?.object
    const directLabelFor = (target: DirectEditTarget, amount: number) => {
      if (target.kind === 'sphere-radius' || target.kind === 'column-radius') return `Radius · ${amount.toFixed(2)}`
      if (target.kind === 'column-height') return `Height · ${amount.toFixed(2)}`
      const index = target.axes.findIndex(Boolean); return `${['X', 'Y', 'Z'][index]} · ${amount.toFixed(2)}`
    }
    const showDirectGuide = (target: DirectEditTarget, origin: Vec3, axis: Vec3, amount = 0, invalid = false) => {
      const rect = renderer.domElement.getBoundingClientRect(); const metric = projectedCameraAxisMetric(runtime.current!.camera, origin, axis, [rect.width, rect.height])
      const previewDocument = directDrag.current?.target.entityId === target.entityId ? directDrag.current.transaction.preview : directKeyboard.current?.transaction.target.entityId === target.entityId ? directKeyboard.current.transaction.preview : state.current.document
      const entity = previewDocument.entities.find((item) => item.id === target.entityId); if (!entity) return
      directGuides.clear(); directGuides.add(directEditGuide(target, entity, origin, axis, amount, invalid, metric.cssPixelsPerWorldUnit)); setDirectEditLabel(directLabelFor(target, amount))
    }
    const directSurfaceAt = (x: number, y: number) => {
      const hit = intersectionAt(x, y); const selectedId = state.current.selectedIds.length === 1 ? state.current.selectedIds[0] : null
      if (!hit || !selectedId || hit.object.userData.entityId !== selectedId) return null
      const entity = state.current.document.entities.find((item) => item.id === selectedId)
      if (entity?.resizeLocked) return null
      if (entity?.kind === 'block' && hit.face) {
        const local = hit.face.normal.clone(); const axes = local.toArray().map((value) => Math.abs(value) > .5 ? Math.sign(value) : 0) as Vec3
        const axis = local.transformDirection(hit.object.matrixWorld).normalize().toArray() as Vec3
        return { target: { kind: 'block-face', entityId: entity.id, axes } as DirectEditTarget, origin: hit.point.toArray() as Vec3, axis }
      }
      if (entity?.kind === 'sphere') {
        const center = new THREE.Vector3(...transformPointWorld(entity.transform, [0, 0, 0])); const origin = hit.point.toArray() as Vec3; const axis = hit.point.clone().sub(center).normalize().toArray() as Vec3
        return { target: { kind: 'sphere-radius', entityId: entity.id, radial: axis } as DirectEditTarget, origin, axis }
      }
      if (entity?.kind === 'column' && hit.face) {
        const local = hit.face.normal.clone()
        if (Math.abs(local.y) > .5) { const direction = Math.sign(local.y) as 1 | -1; const axis = local.transformDirection(hit.object.matrixWorld).normalize().toArray() as Vec3; return { target: { kind: 'column-height', entityId: entity.id, direction } as DirectEditTarget, origin: hit.point.toArray() as Vec3, axis } }
        const radial = hit.point.clone().sub(new THREE.Vector3(...transformPointWorld(entity.transform, [0, 0, 0]))); radial.y = 0; radial.normalize(); const axis = radial.toArray() as Vec3
        return { target: { kind: 'column-radius', entityId: entity.id, radial: axis } as DirectEditTarget, origin: hit.point.toArray() as Vec3, axis }
      }
      return null
    }
    const pointerDown = (event: PointerEvent) => {
      renderer.domElement.focus(); if (!renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.setPointerCapture(event.pointerId)
      if (pilot.current) { pilot.current.pointerButton = event.button; pilot.current.lastCameraPosition = perspective.position.toArray() as Vec3; pilot.current.lastTarget = controls.target.toArray() as Vec3; return }
      if (activeTransform?.dragging) return
      const object = objectAt(event.clientX, event.clientY)
      const fallback = !object && projectionRef.current === 'side' ? (() => {
        const cameraEntity = state.current.document.entities.find((item) => item.kind === 'camera')
        if (!cameraEntity) return undefined
        const projected = new THREE.Vector3(...cameraEntity.transform.position).project(runtime.current!.camera)
        const rect = renderer.domElement.getBoundingClientRect()
        const x = rect.left + (projected.x + 1) * rect.width / 2; const y = rect.top + (1 - projected.y) * rect.height / 2
        let found: THREE.Object3D | undefined
        content.traverse((item) => { if (!found && item.userData.entityId === cameraEntity.id) found = item })
        return found || ({ userData: { entityId: cameraEntity.id } } as unknown as THREE.Object3D)
      })() : undefined
      const resolvedObject = object || fallback
      const target = resolvedObject?.userData.directEditTarget as DirectEditTarget | undefined
      const hit = target ? 'gizmo' : resolvedObject?.userData.entityId ? 'object' : 'blank'
      pointerOrigin.current = beginViewportPointer(event.pointerId, event.button, event.composedPath().includes(renderer.domElement), hit)
      if (target && event.button === 0) {
        const targetGroup = state.current.document.groups.find((item) => item.childIds.includes(target.entityId))
        if (targetGroup && (targetGroup.shapeLocked || state.current.memberEditGroupId !== targetGroup.id)) { event.preventDefault(); event.stopPropagation(); state.current.onSelect(targetGroup.childIds); return }
        event.preventDefault(); event.stopPropagation()
        const rect = renderer.domElement.getBoundingClientRect()
        const metric = projectedCameraAxisMetric(runtime.current!.camera, resolvedObject!.userData.directEditOrigin as Vec3, resolvedObject!.userData.directEditAxis as Vec3, [rect.width, rect.height])
        if (!metric.draggable) { setDirectEditStatus('Orbit view to drag · keyboard and Inspector available'); return }
        setDirectEditStatus(''); renderer.domElement.style.cursor = 'grabbing'; directState.current = directEditAffordance(directState.current, { type: 'drag-start' })
        const transformEnabled = Object.values(transforms).map((control) => control.enabled)
        directDrag.current = { target, originPointer: [event.clientX, event.clientY], origin: resolvedObject!.userData.directEditOrigin as Vec3, axis: resolvedObject!.userData.directEditAxis as Vec3, amount: 0, transaction: beginDirectResizeTransaction(state.current.document, target), orbitEnabled: controls.enabled, transformEnabled }
        controls.enabled = false; Object.values(transforms).forEach((control) => { control.enabled = false }); return
      }
      gesture.current = pointerGesture.down(gesture.current, event.button, event.clientX, event.clientY); groundAt(event.clientX, event.clientY)
      if (event.button === 0 && resolvedObject?.userData.entityId) {
        event.preventDefault(); event.stopPropagation()
        const entityId = resolvedObject.userData.entityId as string
        const entity = state.current.document.entities.find((item) => item.id === entityId)
        const group = state.current.document.groups.find((item) => item.childIds.includes(entityId)); const groupOwned = Boolean(group && state.current.memberEditGroupId !== group.id)
        state.current.onSelect(groupOwned ? group!.childIds : event.shiftKey ? state.current.selectedIds.includes(entityId) ? state.current.selectedIds.filter((item) => item !== entityId) : [...state.current.selectedIds, entityId] : [entityId])
      }
      if (event.button === 1 && resolvedObject?.userData.entityId) {
        event.preventDefault(); event.stopPropagation()
        const entityId = resolvedObject.userData.entityId as string
        const entity = state.current.document.entities.find((item) => item.id === entityId)
        const group = state.current.document.groups.find((item) => item.childIds.includes(entityId)); const groupOwned = Boolean(group && state.current.memberEditGroupId !== group.id)
        state.current.onSelect(groupOwned ? group!.childIds : event.shiftKey ? state.current.selectedIds.includes(entityId) ? state.current.selectedIds.filter((item) => item !== entityId) : [...state.current.selectedIds, entityId] : [entityId])
        if (!event.shiftKey && entity && !groupOwned && !(entity.locks?.all || entity.locks?.transform)) {
          const camera = runtime.current!.camera
          camera.updateMatrixWorld()
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize().toArray() as Vec3
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize().toArray() as Vec3
          const rect = renderer.domElement.getBoundingClientRect()
          const distance = camera.position.distanceTo(new THREE.Vector3(...entity.transform.position))
          const worldPerPixel = camera instanceof THREE.OrthographicCamera ? (camera.top - camera.bottom) / Math.max(1, camera.zoom * rect.height) : 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.max(.25, distance) / Math.max(1, rect.height)
          entityDrag.current = { entityId, originPointer: [event.clientX, event.clientY], originTransform: structuredClone(entity.transform), right, up, worldPerPixel, orbitEnabled: controls.enabled, moved: false, preview: structuredClone(entity.transform) }
          controls.enabled = false
          renderer.domElement.style.cursor = 'grabbing'
        }
      } else if (event.button === 0 && !resolvedObject?.userData.entityId) {
        event.preventDefault(); event.stopPropagation(); state.current.onSelect([])
      }
    }
    const pointerMove = (event: PointerEvent) => {
      if (pilot.current) return
      gesture.current = pointerGesture.move(gesture.current, event.clientX, event.clientY); groundAt(event.clientX, event.clientY)
      const moving = entityDrag.current
      if (moving) {
        event.preventDefault(); event.stopPropagation()
        const pixels: [number, number] = [event.clientX - moving.originPointer[0], event.clientY - moving.originPointer[1]]
        if (Math.hypot(...pixels) < 3) return
        moving.moved = true
        const delta = viewAlignedPointerDelta(moving.right, moving.up, pixels, moving.worldPerPixel)
        moving.preview = structuredClone(moving.originTransform)
        moving.preview.position = moving.originTransform.position.map((value, axis) => value + delta[axis]) as Vec3
        const object = content.children.find((item) => item.userData.entityId === moving.entityId)
        const entity = state.current.document.entities.find((item) => item.id === moving.entityId)
        if (object && entity) object.position.set(...moving.preview.position)
        state.current.onTransformPreview?.(moving.entityId, moving.preview)

        return
      }
      const drag = directDrag.current
      if (drag) {
        event.preventDefault(); event.stopPropagation()
        const rect = renderer.domElement.getBoundingClientRect(); const projected = projectCameraAxisDrag(runtime.current!.camera, drag.origin, drag.axis, drag.originPointer, [event.clientX, event.clientY], [rect.width, rect.height]); if (projected === null) { setDirectEditStatus('Orbit view to drag · keyboard and Inspector available'); return }
        const snap = event.altKey ? geometrySnapDirectResize(state.current.document.entities, drag.target.entityId, drag.origin, drag.axis, projected) : { snapped: false as const, amount: projected }
        drag.amount = snap.amount; drag.transaction = previewDirectResizeTransaction(drag.transaction, drag.amount, { gridSnap: false, collision: state.current.resizeAids?.collision ?? false, frame: state.current.frame, geometrySnapped: snap.snapped })
        rebuildSceneContent(content, evaluateFrame(drag.transaction.preview, state.current.frame)); state.current.onDocumentPreview?.(drag.transaction.preview); showDirectGuide(drag.target, drag.origin, drag.axis, drag.amount, drag.transaction.invalid)
        if (snap.snapped && snap.connection) { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...snap.connection.from), new THREE.Vector3(...snap.connection.to)]), new THREE.LineDashedMaterial({ color: snap.connection.color, dashSize: .08, gapSize: .06, depthTest: false })); line.computeLineDistances(); line.name = 'direct-edit-geometry-snap-connection'; directGuides.add(line) }
        return
      }
      const directObject = objectAt(event.clientX, event.clientY)
      if (directObject?.userData.directEditTarget) { renderer.domElement.style.cursor = 'grab'; directState.current = directEditAffordance(directState.current, { type: 'surface-leave', now: performance.now() }); directState.current = directEditAffordance(directState.current, { type: 'affordance-enter' }); return }
      directState.current = directEditAffordance(directState.current, { type: 'affordance-leave', now: performance.now() })
      const surface = directSurfaceAt(event.clientX, event.clientY)
      if (surface) { renderer.domElement.style.cursor = 'grab'; directState.current = directEditAffordance(directState.current, { type: 'surface-enter', target: surface.target }); showDirectGuide(surface.target, surface.origin, surface.axis) }
      else { renderer.domElement.style.cursor = ''; setDirectEditStatus(''); directState.current = directEditAffordance(directState.current, { type: 'surface-leave', now: performance.now() }) }
    }
    const restoreDirectControls = (drag: NonNullable<typeof directDrag.current>) => { controls.enabled = drag.orbitEnabled; Object.values(transforms).forEach((control, index) => { control.enabled = drag.transformEnabled[index] }) }
    const finishDirectEdit = (event: PointerEvent) => {
      const drag = directDrag.current; if (!drag) return false
      event.preventDefault(); event.stopPropagation()
      if (state.current.resizeAids?.gridSnap) drag.transaction = previewDirectResizeTransaction(drag.transaction, drag.amount, { gridSnap: true, collision: state.current.resizeAids?.collision ?? false, frame: state.current.frame })
      if (drag.transaction.invalid) { state.current.onDirectResizeError?.('Collision prevented.'); state.current.onPreviewCancel?.(); rebuildSceneContent(content, evaluateFrame(drag.transaction.source, state.current.frame)) }
      else state.current.onDirectResizeCommit?.(drag.transaction.preview)
      restoreDirectControls(drag); directDrag.current = null; directState.current = directEditAffordance(directState.current, { type: 'drag-end', now: performance.now() }); directGuides.clear(); setDirectEditLabel(''); setDirectEditStatus(''); renderer.domElement.style.cursor = ''; pointerOrigin.current = null; return true
    }
    const pointerUp = (event: PointerEvent) => { if (pilot.current) { finalizeViewportInteraction('pointerup', event); return } const origin = pointerOrigin.current; if (!origin || origin.pointerId !== event.pointerId) return; const endedOnRenderer = event.composedPath().includes(renderer.domElement); if (entityDrag.current || directDrag.current) { event.preventDefault(); event.stopPropagation(); finalizeViewportInteraction('pointerup', event); return } const wasDragged = gesture.current.dragged; const hit = objectAt(event.clientX, event.clientY); const hitId = hit?.userData.entityId as string | undefined; const blankEnd = !hitId; const ownership = finishViewportPointer(origin, event.pointerId, endedOnRenderer, wasDragged, blankEnd); const result = pointerGesture.up(gesture.current, event.button, event.clientX, event.clientY); finalizeViewportInteraction('pointerup', event); if (ownership === 'ignore') return; if (result.action === 'context-menu') { contextReturnFocus.current = globalThis.document.activeElement instanceof HTMLElement ? globalThis.document.activeElement : host.current; const candidateGroup = hitId ? state.current.document.groups.find((item) => item.childIds.includes(hitId)) : undefined; const group = candidateGroup && state.current.memberEditGroupId !== candidateGroup.id ? candidateGroup : undefined; const selectedIds = group ? group.childIds : hitId && state.current.selectedIds.includes(hitId) && state.current.selectedIds.length > 1 ? state.current.selectedIds : hitId ? [hitId] : []; const entity = state.current.document.entities.find((item) => item.id === hitId); const target: SceneMenuTarget = !hitId ? 'empty' : group ? 'group' : selectedIds.length > 1 ? 'selection' : entity?.kind === 'camera' ? 'camera' : 'object'; if (hitId && (!state.current.selectedIds.includes(hitId) || group)) state.current.onSelect(selectedIds); setContextMenu({ x: event.clientX, y: event.clientY, ground: groundAt(event.clientX, event.clientY), target, entityIds: selectedIds }); return } if (ownership === 'clear') state.current.onSelect([]) }
    const finalizeViewportInteraction = (reason: 'pointerup' | 'pointercancel' | 'lostpointercapture' | 'blur' | 'escape' | 'projection' | 'pilot-exit' | 'selection-change' | 'lock-change' | 'unmount', event?: PointerEvent) => {
      const commit = reason === 'pointerup'
      const moving = entityDrag.current; const drag = directDrag.current; const keyboard = directKeyboard.current; const transformWasActive = Boolean(activeTransform)
      const pointerId = event?.pointerId ?? pointerOrigin.current?.pointerId
      if (pointerId !== undefined && pointerId !== null && renderer.domElement.hasPointerCapture(pointerId)) { try { renderer.domElement.releasePointerCapture(pointerId) } catch { /* capture can already be lost */ } }
      if (moving) {
        if (commit && moving.moved) state.current.onTransform(moving.entityId, moving.preview, 'XYZ', event?.altKey)
        else rebuildSceneContent(content, evaluateFrame(state.current.document, state.current.frame))
        entityDrag.current = null
      }
      if (drag) {
        if (commit && event) finishDirectEdit(event)
        else { restoreDirectControls(drag); rebuildSceneContent(content, evaluateFrame(drag.transaction.source, state.current.frame)); directDrag.current = null }
      }
      if (keyboard && !commit) { rebuildSceneContent(content, evaluateFrame(keyboard.transaction.source, state.current.frame)); directKeyboard.current = null }
      if (activeTransform) { (activeTransform as unknown as { dragging: boolean }).dragging = false; activeTransform = null; activePreviewObject.current=null; rebuildSceneContent(content, evaluateFrame(state.current.document, state.current.frame)) }
      controls.enabled = true; restoreTransformAvailability()
      if (pilot.current) pilot.current.pointerButton = null
      pointerOrigin.current = null; gesture.current = pointerGesture.initial()
      directState.current = directEditAffordance(directState.current, { type: 'clear' }); directGuides.clear(); setDirectEditLabel(''); setDirectEditStatus(''); renderer.domElement.style.cursor = ''
      if (reason !== 'pointerup') { activeGizmoFamily = null; activeGizmoAxis = null; if (moving || drag || keyboard || transformWasActive) state.current.onPreviewCancel?.() }
      return Boolean(moving || drag || keyboard || transformWasActive)
    }
    finalizeInteractionRef.current = finalizeViewportInteraction
    const cancelDirectEdit = () => finalizeViewportInteraction('escape')
    cancelDirectResizeRef.current = cancelDirectEdit
    const directKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const selectedEntity = state.current.document.entities.find((item) => item.id === state.current.selectedIds[0])
      const selectedOwnsArrow = selectedEntityOwnsArrow(event, { selectedKind: selectedEntity?.kind, selectedCount: state.current.selectedIds.length, textEntry: Boolean(target?.closest('input,textarea,select,[contenteditable=true]')), menuOpen: Boolean(globalThis.document.querySelector('.canvas-context-menu')), timelineRuler: Boolean(target?.closest('.camera3d-ruler,[data-timeline-ruler]')), toolbar: Boolean(target?.closest('[role=toolbar],.camera3d-local-toolbar')), numericScrub: Boolean(target?.closest('[data-numeric-scrubbing=true]')) })
      if (cameraPanOwnsArrow(event, { textEntry: Boolean(target?.closest('input,textarea,select,[contenteditable=true]')), menuOpen: Boolean(globalThis.document.querySelector('.canvas-context-menu')), ruler: Boolean(target?.closest('.camera3d-ruler,[data-timeline-ruler]')), toolbar: Boolean(target?.closest('[role=toolbar],.camera3d-local-toolbar')) }, selectedOwnsArrow)) { event.preventDefault(); event.stopPropagation(); const value = runtime.current!; const next = panViewerScreenRight(value.camera.position.toArray() as Vec3, value.controls.target.toArray() as Vec3, event.key === 'ArrowRight' ? 1 : -1); value.camera.position.set(...next.position); value.controls.target.set(...next.target); publishViewerSnapshot(); return }
      if (event.key === 'Escape' && pilot.current) { event.preventDefault(); event.stopPropagation(); exitCameraPilot(); return }
      if (event.key === 'Escape' && finalizeViewportInteraction('escape')) { event.preventDefault(); event.stopPropagation(); return }
      const entity = state.current.document.entities.find((item) => item.id === state.current.selectedIds[0])
      if (event.key === 'Tab' && entity && state.current.selectedIds.length === 1 && !entity.resizeLocked && (entity.kind === 'block' || entity.kind === 'sphere' || entity.kind === 'column')) {
        event.preventDefault(); event.stopPropagation(); const stops = directEditKeyboardTargets(entity, runtime.current!.camera); const index = directKeyboard.current ? (directKeyboard.current.index + 1) % stops.length : 0; const stop = stops[index]
        directKeyboard.current = { stops, index, transaction: beginDirectResizeTransaction(state.current.document, stop.target), amount: 0 }; directState.current = directEditAffordance(directState.current, { type: 'focus', target: stop.target }); showDirectGuide(stop.target, stop.origin, stop.axis); setDirectEditStatus(stop.accessibleLabel); return
      }
      const keyboard = directKeyboard.current
      if (event.key === 'Enter' && keyboard) { event.preventDefault(); event.stopPropagation(); if (keyboard.transaction.invalid) state.current.onDirectResizeError?.('Collision prevented.'); else state.current.onDirectResizeCommit?.(keyboard.transaction.preview); directKeyboard.current = null; directGuides.clear(); setDirectEditLabel(''); return }
      if (!keyboard || !['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
      event.preventDefault(); event.stopPropagation(); keyboard.amount += event.key === 'ArrowUp' || event.key === 'ArrowRight' ? .25 : -.25
      keyboard.transaction = previewDirectResizeTransaction(keyboard.transaction, keyboard.amount, { gridSnap: false, collision: state.current.resizeAids?.collision ?? false, frame: state.current.frame })
      const stop = keyboard.stops[keyboard.index]; rebuildSceneContent(content, evaluateFrame(keyboard.transaction.preview, state.current.frame)); state.current.onDocumentPreview?.(keyboard.transaction.preview); showDirectGuide(stop.target, stop.origin, stop.axis, keyboard.amount, keyboard.transaction.invalid)
    }
    const directFocus = () => {
      const entity = state.current.document.entities.find((item) => item.id === state.current.selectedIds[0]); if (!entity || entity.resizeLocked || state.current.selectedIds.length !== 1 || entity.kind !== 'block' && entity.kind !== 'sphere' && entity.kind !== 'column') return
      const stop = directEditKeyboardTargets(entity, runtime.current!.camera)[0]; directState.current = directEditAffordance(directState.current, { type: 'focus', target: stop.target }); showDirectGuide(stop.target, stop.origin, stop.axis); setDirectEditStatus(stop.accessibleLabel)
    }
    const directBlur = () => { directState.current = directEditAffordance(directState.current, { type: 'blur', now: performance.now() }) }
    const pointerCancel = (event?: Event) => finalizeViewportInteraction(event?.type === 'lostpointercapture' ? 'lostpointercapture' : 'pointercancel')
    const windowBlur = () => finalizeViewportInteraction('blur')
    const wheel = (event: WheelEvent) => { if (!event.composedPath().includes(renderer.domElement)) return; event.preventDefault(); event.stopPropagation(); const current = pilot.current; if (current) { const amount = Math.max(-.35, Math.min(.35, normalizeViewportWheelDelta(event.deltaY, event.deltaMode, renderer.domElement.clientHeight) * .02)); const authored = state.current.document.entities.find((entity) => entity.id === current.entityId && entity.kind === 'camera'); if (!authored) return; const view = resolvedCameraView(authored, state.current.document.entities); const forward = new THREE.Vector3(...view.target).sub(perspective.position).normalize(); pilotTranslate(forward.multiplyScalar(amount)); return } queueZoom(normalizeViewportWheelDelta(event.deltaY, event.deltaMode, renderer.domElement.clientHeight)) }
    const context = (event: MouseEvent) => event.preventDefault(); renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('lostpointercapture', pointerCancel); renderer.domElement.addEventListener('pointermove', pointerMove); window.addEventListener('pointerup', pointerUp); window.addEventListener('pointercancel', pointerCancel); window.addEventListener('blur', windowBlur); renderer.domElement.addEventListener('wheel', wheel, { passive: false }); renderer.domElement.addEventListener('contextmenu', context); renderer.domElement.addEventListener('keydown', directKeyDown); renderer.domElement.addEventListener('focus', directFocus); renderer.domElement.addEventListener('blur', directBlur)
    let previousFrame = performance.now()
    const animate = (now = performance.now()) => {
      const elapsed = Math.max(0, Math.min(100, now - previousFrame)); previousFrame = now
      const animation = cameraAnimation.current
      if (animation) { const t = Math.min(1, (now - animation.began) / animation.duration); const eased = 1 - Math.pow(1 - t, 3); runtime.current!.camera.position.lerpVectors(animation.startPosition, animation.position, eased); controls.target.lerpVectors(animation.startTarget, animation.target, eased); if (t >= 1) cameraAnimation.current = null }
      const motion = zoomMotion.current
      if (motion?.active) { const next = stepZoomMotion(motion, elapsed); zoomMotion.current = next; if (next.mode === 'orthographic') { orthographic.zoom = Math.exp(next.currentLog); orthographic.updateProjectionMatrix() } else { const offset = perspective.position.clone().sub(controls.target); if (!offset.lengthSq()) offset.set(0, 0, 1); perspective.position.copy(controls.target).add(offset.setLength(Math.exp(next.currentLog))) } publishViewerSnapshot() }
      directState.current = directEditAffordance(directState.current, { type: 'tick', now }); if (!directState.current.visible && directGuides.children.length) { directGuides.clear(); setDirectEditLabel(''); setDirectEditStatus(''); renderer.domElement.style.cursor = '' }
      controls.update(); for (const [family, control] of Object.entries(transforms) as Array<['translate' | 'rotate', TransformControls]>) applyGizmoPalette(control.getHelper(), family, activeGizmoFamily, activeGizmoAxis); const nextGrid = gridState(controls.target.toArray() as Vec3); minorGrid.position.x = majorGrid.position.x = nextGrid.center[0]; minorGrid.position.z = majorGrid.position.z = nextGrid.center[2]; const gridOpacity = gridDistanceOpacity(runtime.current!.camera.position.distanceTo(controls.target), nextGrid.fadeStart, nextGrid.fadeEnd); (minorGrid.material as THREE.LineBasicMaterial).opacity = gridOpacity * .72; (majorGrid.material as THREE.LineBasicMaterial).opacity = gridOpacity
      const baseline = cameraOrthoGroundLine(projectionRef.current, controls.target.toArray() as Vec3, orthographic.zoom); groundBaseline.visible = Boolean(baseline); if (baseline) groundBaseline.geometry.setFromPoints([new THREE.Vector3(...baseline.from), new THREE.Vector3(...baseline.to)])
      renderer.render(scene, runtime.current!.camera); runtime.current!.raf = requestAnimationFrame(animate)
    }
    runtime.current = { renderer, scene, perspective, orthographic, camera: perspective, content, editorGuides, pathGuides, directGuides, controls, transforms, minorGrid, majorGrid, axes, preview, raf: 0, lastGround: [0, 0, 0] }; animate()
    return () => { finalizeViewportInteraction('unmount'); finalizeInteractionRef.current = () => false; cancelDirectResizeRef.current = () => false; observer.disconnect(); cancelAnimationFrame(runtime.current?.raf || 0); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('lostpointercapture', pointerCancel); renderer.domElement.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerup', pointerUp); window.removeEventListener('pointercancel', pointerCancel); window.removeEventListener('blur', windowBlur); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('contextmenu', context); renderer.domElement.removeEventListener('keydown', directKeyDown); renderer.domElement.removeEventListener('focus', directFocus); renderer.domElement.removeEventListener('blur', directBlur); for (const control of Object.values(transforms)) control.dispose(); controls.removeEventListener('change', pilotControlsChange); controls.removeEventListener('change', publishViewerSnapshot); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); runtime.current = null }
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    const dismissContextMenu = (event: PointerEvent) => { if (!(event.target as Element)?.closest('.canvas-context-menu')) restoreContextMenuFocus() }
    const dismissContextMenuKey = (event: KeyboardEvent) => { if (event.key === 'Escape') restoreContextMenuFocus() }
    window.addEventListener('pointerdown', dismissContextMenu)
    window.addEventListener('keydown', dismissContextMenuKey)
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.canvas-context-menu [role="menuitem"]')?.focus())
    return () => { window.removeEventListener('pointerdown', dismissContextMenu); window.removeEventListener('keydown', dismissContextMenuKey) }
  }, [contextMenu])

  useEffect(() => {
    const value = runtime.current; if (!value) return
    const pilotCameraOnly = isPilotCameraOnlyTransformChange(previousDocument.current, props.document, pilot.current?.entityId)
    previousDocument.current = props.document
    const nextSelectionSignature = props.selectedIds.join('|')
    const selectedForLock = props.document.entities.find((entity) => entity.id === props.selectedIds[0])
    const nextLockSignature = selectedForLock ? `${selectedForLock.id}:${selectedForLock.locks?.all || selectedForLock.locks?.transform ? 'transform' : ''}:${selectedForLock.kind === 'camera' && selectedForLock.camera?.target.mode !== 'free' ? 'target' : ''}` : ''
    if (selectionSignature.current !== nextSelectionSignature) finalizeInteractionRef.current('selection-change')
    else if (lockSignature.current && lockSignature.current !== nextLockSignature) finalizeInteractionRef.current('lock-change')
    selectionSignature.current = nextSelectionSignature; lockSignature.current = nextLockSignature
    if (pilot.current && (!props.document.entities.some((entity) => entity.id === pilot.current?.entityId) || !props.selectedIds.includes(pilot.current.entityId))) exitCameraPilot()
    if (pilot.current) {
      const evaluated = evaluateFrame(props.document, props.frame)
      const camera = evaluated.entities.find((entity) => entity.id === pilot.current?.entityId && entity.kind === 'camera') as SceneEntity | undefined
      if (camera) {
        const view = resolvedCameraView(camera, evaluated.entities as SceneEntity[])
        value.perspective.position.set(...view.position); value.perspective.rotation.set(...view.rotation.map(THREE.MathUtils.degToRad) as Vec3); value.controls.target.set(...view.target); value.perspective.updateMatrixWorld(true)
        pilot.current.transform = structuredClone(camera.transform)
        pilot.current.lastCameraPosition = view.position; pilot.current.lastTarget = view.target
        publishViewerSnapshot()
      }
      syncPilotPerspectiveLens(value.perspective, props.document, pilot.current.entityId)
    }
    const evaluated = editorFrameForPilot(evaluateFrame(props.document, props.frame), pilot.current?.entityId)
    if (!pilotCameraOnly && !activePreviewObject.current && !entityDrag.current && !directDrag.current && !directKeyboard.current) rebuildSceneContent(value.content, evaluated)
    value.pathGuides.clear(); value.minorGrid.visible = props.guides.grid; value.majorGrid.visible = props.guides.grid
    const cameraGuides = evaluated.entities.filter((entity) => entity.kind === 'camera').map((camera) => cameraGuideEntity(props.document, props.frame, camera.id))
    const cameras = cameraGuides.map((guide) => guide.entity)
    for (const guide of cameraGuides) { const camera = guide.entity; if (shouldRenderCameraGuide(camera.id, pilot.current?.entityId) && (props.guides.fov || props.selectedIds.includes(camera.id))) value.pathGuides.add(cameraFrustum(camera, props.document.aspect, props.selectedIds.includes(camera.id), guide.entities)) }
    const selectedCamera = cameras.find((camera) => props.selectedIds.includes(camera.id))
    if (props.guides.cameraPath && cameras.length && (!pilot.current || selectedCamera?.id !== pilot.current.entityId)) {
      const progress = props.frame / Math.max(1, props.document.shots.at(-1)!.endFrame - 1)
      const path = selectedCamera ? selectedCameraPathState(props.document, selectedCamera.id, props.frame) : cameraPathState(props.document.entities, progress)
      if (path.points.length > 1) value.pathGuides.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.points.map((point) => new THREE.Vector3(...point))), new THREE.LineBasicMaterial({ color: '#a58be8', transparent: true, opacity: .88, linewidth: 2, depthTest: false })))
      for (const arrow of path.arrows) { const helper = new THREE.ArrowHelper(new THREE.Vector3(...arrow.direction).normalize(), new THREE.Vector3(...arrow.position), .55, '#54d6d0', .18, .1); helper.name = 'camera-path-direction'; value.pathGuides.add(helper) }
      for (const cue of path.cues) { const cueEntityId = selectedCamera?.id || cue.id; const contextual = Boolean(selectedCamera); const point = new THREE.Mesh(new THREE.SphereGeometry(contextual ? .12 : .075, 12, 8), new THREE.MeshBasicMaterial({ color: contextual ? '#f2eff9' : '#a58be8', depthTest: false })); point.position.set(...cue.position); point.name = 'camera-point-cue'; if (cueEntityId) point.userData.entityId = cueEntityId; value.pathGuides.add(point) }
      const marker = new THREE.Group(); marker.name = 'camera-play-marker'; const dot = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshBasicMaterial({ color: '#54d6d0', depthTest: false })); const ring = new THREE.Mesh(new THREE.TorusGeometry(.18, .025, 8, 24), new THREE.MeshBasicMaterial({ color: '#54d6d0', transparent: true, opacity: .8, depthTest: false })); marker.add(dot, ring); marker.position.set(...path.marker.position); value.pathGuides.add(marker)
    }
    const selectedEntity = evaluated.entities.find((entity) => entity.id === props.selectedIds[0]) as SceneEntity | undefined
    if (selectedEntity?.kind === 'human') { const humanHighlight=new THREE.Group(); const anchor=transformAnchor(selectedEntity.transform); humanHighlight.name='human-selected-parts-highlight'; humanHighlight.position.set(...selectedEntity.transform.position); humanHighlight.rotation.set(...selectedEntity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3); humanHighlight.scale.set(...selectedEntity.transform.scale); for (const part of voxelPartsFor('human') || []) { const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...part.size)),new THREE.LineBasicMaterial({color:'#a58be8',transparent:true,opacity:.72,depthTest:false})); edges.name=`human-selected-part-${part.role}`; edges.position.set(part.center[0]-anchor[0],part.center[1]-selectedEntity.dimensions[1]/2-anchor[1],part.center[2]-anchor[2]); humanHighlight.add(edges) } value.pathGuides.add(humanHighlight) }
    if (selectedEntity?.kind === 'camera' && shouldRenderCameraGuide(selectedEntity.id, pilot.current?.entityId)) { const silhouette = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...selectedEntity.dimensions)), new THREE.LineBasicMaterial({ color: '#a58be8', depthTest: false })); silhouette.name = 'camera-selected-2px-silhouette'; silhouette.position.set(...selectedEntity.transform.position); silhouette.rotation.set(...selectedEntity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3); const originRing = new THREE.Mesh(new THREE.TorusGeometry(.16, .018, 8, 24), new THREE.MeshBasicMaterial({ color: '#54d6d0', depthTest: false })); originRing.name = 'camera-optical-origin-ring'; originRing.position.set(...selectedEntity.transform.position); value.pathGuides.add(silhouette, originRing); if (selectedEntity.camera?.target.mode === 'point') { const target = new THREE.Group(); target.name = 'camera-target-point-helper'; target.userData.authoringOnly = true; target.position.set(...selectedEntity.camera.target.position); const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 8, 24), new THREE.MeshBasicMaterial({ color: '#54d6d0', depthTest: false })); ring.rotation.x = Math.PI / 2; const cross = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.28, 0, 0), new THREE.Vector3(.28, 0, 0), new THREE.Vector3(0, -.28, 0), new THREE.Vector3(0, .28, 0)]), new THREE.LineBasicMaterial({ color: '#54d6d0', depthTest: false })); target.add(ring, cross); value.pathGuides.add(target) } }
    if (activePreviewObject.current) return
    const selected = value.content.children.find((item) => item.userData.entityId === props.selectedIds[0])
    for (const control of Object.values(value.transforms)) { control.detach(); control.enabled = false; control.getHelper().visible = false }
    if (selected && props.selectedIds.length === 1 && !pilot.current) { const selectedEntity = props.document.entities.find((entity) => entity.id === props.selectedIds[0]); const cameraLocked = selectedEntity?.kind === 'camera' && selectedEntity.camera?.target.mode !== 'free'; value.transforms.translate.attach(selected); value.transforms.rotate.attach(selected); value.transforms.translate.showX = !cameraLocked; value.transforms.translate.showY = true; value.transforms.translate.showZ = true; value.transforms.translate.enabled = !selectedEntity?.locationLocked; value.transforms.rotate.enabled = !cameraLocked; value.transforms.translate.getHelper().visible = value.transforms.translate.enabled; value.transforms.rotate.getHelper().visible = value.transforms.rotate.enabled }
  }, [props.document, props.frame, props.selectedIds, props.guides, interactionMode, pilotCameraId])

  useImperativeHandle(ref, () => ({ cancelDirectResize() { cancelDirectResizeRef.current() }, setProjection(view) { switchProjection(view.toLowerCase() as ProjectionView) }, addAtViewportCenter(kind, name) { state.current.onAddAt?.(kind, name, viewportCenterGroundRef.current()) }, panScreenRight(direction) { const value = runtime.current; if (!value) return; if (pilot.current) { const forward = value.controls.target.clone().sub(value.perspective.position).normalize(); const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(); if (pilotTranslate(right.multiplyScalar(direction * .25))) return } const next = panViewerScreenRight(value.camera.position.toArray() as Vec3, value.controls.target.toArray() as Vec3, direction); value.camera.position.set(...next.position); value.controls.target.set(...next.target); publishViewerSnapshot() }, async captureCleanFrame(absoluteFrame, width, height) { const value = runtime.current; if (!value) throw new Error('VIEWPORT_NOT_READY'); const oldSize = new THREE.Vector2(); value.renderer.getSize(oldSize); const activeCamera = value.camera; const helpers = Object.values(value.transforms).map((control) => control.getHelper()); const helperVisibility = helpers.map((helper) => helper.visible); const guidesVisible = value.editorGuides.visible; value.editorGuides.visible = false; helpers.forEach((helper) => { helper.visible = false }); rebuildSceneContent(value.content, cleanRenderFrameWithoutCameraEntities(evaluateFrame(state.current.document, absoluteFrame))); const evaluated = evaluateFrame(state.current.document, absoluteFrame).camera; activeCamera.position.set(...evaluated.transform.position); activeCamera.rotation.set(...evaluated.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3); value.renderer.setSize(width, height, false); if (activeCamera instanceof THREE.PerspectiveCamera) { activeCamera.aspect = width / height; const sensorHeight = 36 / activeCamera.aspect; activeCamera.fov = 2 * Math.atan(sensorHeight / (2 * evaluated.focalLength)) * 180 / Math.PI } activeCamera.updateProjectionMatrix(); value.renderer.render(value.scene, activeCamera); const data = value.renderer.domElement.toDataURL('image/png'); value.renderer.setSize(oldSize.x, oldSize.y, false); value.editorGuides.visible = guidesVisible; helpers.forEach((helper, index) => { helper.visible = helperVisibility[index] }); rebuildSceneContent(value.content, evaluateFrame(state.current.document, state.current.frame)); return data }, viewThroughCamera, exitCameraPilot, setInteractionMode }), [projection])

  const add = (kind: EntityKind, name: string, ground: Vec3) => { state.current.onAddAt?.(kind, name, ground) }

  return <div className="camera3d-viewport-wrap" data-editor-zoom={viewerSnapshot.mode === 'top' || viewerSnapshot.mode === 'side' ? viewerSnapshot.zoom : undefined} style={{ '--canvas-minimap-width': `${minimapSize.width}px`, '--canvas-minimap-height': `${minimapSize.height}px` } as CSSProperties} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const item = CAMERA3D_ADD_CATALOG[0].items.find((entry) => entry.kind === event.dataTransfer.getData('application/x-prism-camera-add')); const explicitDropGround=explicitDropGroundRef.current(event.clientX,event.clientY); if (item) add(item.kind, item.name, explicitDropGround) }}>
    <div ref={host} className="camera3d-viewport-canvas" aria-label="3D Camera viewport" tabIndex={0} />
    <div className="tool-rail" role="toolbar" aria-label="Add scene item">{CAMERA3D_ADD_CATALOG[0].items.map((item) => { const Icon = SCENE_ICONS[item.kind]; return <button key={item.kind} type="button" draggable data-tooltip={`Add ${item.name}`} aria-label={`Add ${item.name}`} onClick={() => { const viewportCenterGround=viewportCenterGroundRef.current(); add(item.kind,item.name,viewportCenterGround) }} onDragStart={(event) => event.dataTransfer.setData('application/x-prism-camera-add', item.kind)}><Icon size={18} /></button> })}</div>
    {contextMenu && <CameraContextMenu target={contextMenu.target} clipboardAvailable={Boolean(props.clipboardAvailable)} activeCamera={contextMenu.entityIds[0] === props.activeCameraId} entityKind={props.document.entities.find((entity) => entity.id === contextMenu.entityIds[0])?.kind} entityColor={props.document.entities.find((entity) => entity.id === contextMenu.entityIds[0])?.color} allowBelowCanvas={Boolean(props.document.entities.find((entity)=>entity.id===contextMenu.entityIds[0])?.allowBelowCanvas)} resizeLocked={Boolean((() => { const entity = props.document.entities.find((item) => item.id === contextMenu.entityIds[0]); return entity?.locationLocked })())} selectionCount={contextMenu.entityIds.length} playbackRunning={props.playbackRunning} grouped={contextMenu.target === 'group' ? Boolean(props.document.groups.find((group) => group.childIds.length === contextMenu.entityIds.length && group.childIds.every((id) => contextMenu.entityIds.includes(id)))?.shapeLocked) : contextMenu.target === 'selection' ? !canGroupEntities(props.document, contextMenu.entityIds).ok : false} style={{ left: Math.max(72, Math.min(contextMenu.x, window.innerWidth - 258)), top: Math.max(70, Math.min(contextMenu.y, window.innerHeight - 430)) }} onColor={(color) => { const id = contextMenu.entityIds[0]; if (id) props.onObjectColor?.(id, color); restoreContextMenuFocus() }} onCommand={(command) => { if (command === 'human' || command === 'block' || command === 'sphere' || command === 'column' || command === 'camera') add(command, command === 'human' ? 'Human' : command === 'block' ? 'Block' : command === 'sphere' ? 'Sphere' : command === 'column' ? 'Column' : 'Camera', contextMenu.ground); else if (command === 'fit') fit(); else if (command === 'focus') focus(); else if (command === 'select-all') props.onSelect(props.document.entities.map((entity) => entity.id)); else if (command === 'view-camera') { const entity = props.document.entities.find((item) => item.id === contextMenu.entityIds[0]); if (entity) viewThroughCamera(entity.id) } else props.onContextCommand?.(command, contextMenu.entityIds, contextMenu.ground); restoreContextMenuFocus() }} />}
    <div className="camera3d-view-controls" role="toolbar" aria-label="Editor view"><div className="camera3d-view-segment"><button aria-pressed={projection === 'perspective'} onClick={() => switchProjection('perspective')}>Perspective</button><button aria-pressed={projection === 'front'} onClick={() => switchProjection('front')}>Front</button><button aria-pressed={projection === 'top'} onClick={() => switchProjection('top')}>Top</button><button aria-pressed={projection === 'side'} onClick={() => switchProjection('side')}>Side</button></div><button className="camera3d-focus-selected" disabled={!props.selectedIds.length} title="Focus Selected [⇧F]" onClick={focus}><Crosshair size={13} />Focus Selected</button><button className="camera3d-reset-view" aria-label="Reset View" title="Reset View" onClick={fit}><RotateCcw size={13} />Reset View</button></div>
    {pilotCameraId && <span className="camera3d-pilot-state header-readiness-pill is-ready" role="status">Viewing through Camera</span>}
    {props.document.entities.find((entity) => entity.id === props.selectedIds[0])?.kind === 'camera' && props.document.entities.find((entity) => entity.id === props.selectedIds[0])?.camera?.target.mode === 'locked' && <span className="camera3d-gizmo-status" role="status">Unlock target to rotate camera</span>}
    {props.document.entities.find((entity) => entity.id === props.selectedIds[0])?.resizeLocked ? <span className="camera3d-direct-edit-status" role="status">Resize locked</span> : directEditStatus && <span className="camera3d-direct-edit-status" role="status" aria-live="polite">{directEditStatus}</span>}
    {directEditLabel && <output className="camera3d-direct-edit-live-label" aria-live="polite">{directEditLabel}</output>}
    <CanvasNavigationControls standalone className="camera3d-navigation-controls" onZoomIn={() => dolly(1 / 1.2)} onZoomOut={() => dolly(1.2)} onFitView={fit} />
    <ExactCanvasCameraMiniMap document={props.document} frame={props.frame} selectedIds={props.selectedIds} viewer={viewerSnapshot} width={minimapSize.width} height={minimapSize.height} onSelect={props.onSelect} onViewportChange={(next) => { const value=runtime.current; if (!value || projectionRef.current!=='top' || !(value.camera instanceof THREE.OrthographicCamera)) return; const x=Number.isFinite(next.x)?Math.max(-100000,Math.min(100000,next.x)):value.controls.target.x; const z=Number.isFinite(next.y)?Math.max(-100000,Math.min(100000,next.y)):value.controls.target.z; const dx=x-value.controls.target.x,dz=z-value.controls.target.z; value.controls.target.set(x,0,z); value.camera.position.x+=dx; value.camera.position.z+=dz; value.camera.zoom=Math.max(.05,Math.min(64,Number.isFinite(next.zoom)?next.zoom:value.camera.zoom)); value.camera.updateProjectionMatrix(); publishViewerSnapshot() }} />
    <div className="camera3d-orbit-help">Orbit: drag · Pan: middle-drag · Zoom: wheel · Add: right-click</div>
  </div>
})
