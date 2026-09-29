import * as THREE from 'three'
import { evaluateStructuredObject, type EvaluatedStructuredObject, type StructuredObject } from './structuredObject'
import { groupSceneNodes, migrateSceneTree, nodeWorldTransform, ungroupSceneNode } from './sceneTree'

export type Vec3 = [number, number, number]
export type Ease = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
export type EntityKind = 'human' | 'block' | 'sphere' | 'column' | 'camera'
export type LegacyEntityKind = 'box' | 'chair' | 'table' | 'room' | 'wall' | 'cylinder' | 'plane'
export type Transform = { position: Vec3; rotation: Vec3; scale: Vec3; anchor?: Vec3 }
export type TargetMode = { mode: 'free'; position?: Vec3 } | { mode: 'point'; position: Vec3 } | { mode: 'object'; entityId: string; lastPosition?: Vec3 } | { mode: 'locked'; entityId: string; lastPosition?: Vec3 }
export type KeyframeProperty = `position.${'x' | 'y' | 'z'}` | `rotation.${'x' | 'y' | 'z'}` | `scale.${'x' | 'y' | 'z'}` | `anchor.${'x' | 'y' | 'z'}` | `dimensions.${'x' | 'y' | 'z'}` | 'radius' | 'height' | 'position' | 'rotation' | 'scale' | 'anchor' | 'camera.focalLength' | 'camera.target' | 'camera.movement'
export type TransformKeyframe = { id?: string; entityId?: string; property?: KeyframeProperty; frame: number; transform: Transform; dimensions?: Vec3; ease: Ease }
export type CameraKeyframe = TransformKeyframe & { id: string; focalLength: number; focusDistance: number; aperture: number; near: number; far: number; target: TargetMode; movement?: string }
export type CameraMetadata = { frame: number; target: TargetMode; focalLength: number; focusDistance: number; aperture: number; near: number; far: number; ease: Ease; duration?: number; movement?: string }
export type EntityLocks = { all?: boolean; transform?: boolean; rotation?: boolean; settings?: boolean }
export type SceneEntity = {
  id: string
  name: string
  kind: EntityKind
  color: string
  transform: Transform
  dimensions: Vec3
  keyframes: TransformKeyframe[]
  resizeLocked?: boolean
  locks?: EntityLocks
  /** Legacy input-only field. sanitizeCameraDocument migrates it to locks.transform. */
  locationLocked?: boolean
  allowBelowCanvas?: boolean
  scaleLinked?: boolean
  baseFrame?: number
  camera?: CameraMetadata
}
export type ShapeGroup = { id: string; name: string; childIds: string[]; pivot: Vec3; rotation: Vec3; shapeLocked: boolean }
export const SHOT_CLIP_COLOR_IDS = ['clear', 'orange', 'apricot', 'yellow', 'lime', 'olive', 'green', 'teal', 'navy', 'blue', 'purple', 'violet', 'pink', 'tan', 'beige', 'brown', 'chocolate'] as const
export type ShotClipColor = typeof SHOT_CLIP_COLOR_IDS[number]
export const CAMERA3D_PALETTE_HEX: Record<Exclude<ShotClipColor, 'clear'>, string> = { orange: '#fd6000', apricot: '#ffa300', yellow: '#dcac00', lime: '#96c900', olive: '#499d00', green: '#109360', teal: '#009d9b', navy: '#00537c', blue: '#2c79a7', purple: '#a270a5', violet: '#e24591', pink: '#f885b9', tan: '#bcb095', beige: '#cc9f78', brown: '#a36200', chocolate: '#965537' }
const sanitizeShotClipColor = (value: unknown): ShotClipColor => typeof value === 'string' && (SHOT_CLIP_COLOR_IDS as readonly string[]).includes(value) ? value as ShotClipColor : 'clear'
export type Shot = {
  id: string; name: string; startFrame: number; endFrame: number; boundary: 'continue' | 'cut'
  clipColor?: ShotClipColor
  entityOrder: string[]; entityStarts: Record<string, { mode: 'inherited' | 'independent'; label: string }>
  shotSize: string; duration: number; cameraMovement: string
  camera: { name: string; activeCameraId?: string; keyframes: CameraKeyframe[]; transform?: Transform; dimensions?: Vec3; metadata?: CameraMetadata; allowBelowCanvas?: boolean; locks?: EntityLocks; locationLocked?: boolean; scaleLinked?: boolean }
}
export type SceneClipboard = { type: 'prism-camera-scene-entities'; entities: SceneEntity[]; group?: ShapeGroup }
export type ShotClipboard = { type: 'prism-camera-shots'; shot: Shot; camera?: SceneEntity }
export type CameraDocument = {
  id: string; name: string; aspect: '16:9' | '9:16' | '1:1' | '4:3' | '3:4'; resolution: '720p' | '1080p'; fps: 24 | 25 | 30
  scope: 'full' | 'shot'; timelineEditLocked?: boolean; entities: SceneEntity[]; groups: ShapeGroup[]; shots: Shot[]; sceneTree?: string[]; objects?: StructuredObject[]
}
export type EvaluatedEntity = Pick<SceneEntity, 'id' | 'name' | 'kind' | 'color' | 'dimensions' | 'camera'> & { transform: Transform }
export type EvaluatedFrame = { absoluteFrame: number; shotId: string; entities: EvaluatedEntity[]; objects: EvaluatedStructuredObject[]; camera: CameraKeyframe }

function keyframePropertyAllowed(kind: EntityKind, property: KeyframeProperty) {
  if (kind === 'camera') return property === 'camera.focalLength' || property === 'camera.target' || property === 'camera.movement' || property === 'position' || property === 'rotation' || property === 'scale' || property === 'anchor' || property.startsWith('position.') || property.startsWith('rotation.') || property.startsWith('scale.') || property.startsWith('anchor.')
  if (property === 'position' || property === 'rotation' || property === 'scale' || property === 'anchor' || property.startsWith('position.') || property.startsWith('rotation.') || property.startsWith('scale.') || property.startsWith('anchor.')) return true
  if (kind === 'block') return property.startsWith('dimensions.')
  if (kind === 'sphere') return property === 'radius'
  if (kind === 'column') return property === 'radius' || property === 'height'
  return false
}

let sequence = 0
export const CAMERA_FOCAL_LENGTHS = [12, 16, 18, 20, 25, 35, 50, 85, 100, 135, 200] as const
function id(prefix: string, reserved: ReadonlySet<string> = new Set()): string {
  let candidate = ''
  do { sequence += 1; candidate = `${prefix}-${sequence.toString(36)}` } while (reserved.has(candidate))
  return candidate
}
function documentIds(document: CameraDocument): Set<string> {
  return new Set([
    document.id,
    ...document.entities.flatMap((entity) => [entity.id, ...entity.keyframes.flatMap((keyframe) => keyframe.id ? [keyframe.id] : [])]),
    ...document.groups.map((group) => group.id),
    ...(document.objects || []).flatMap((object) => [object.id, ...object.parts.map((part) => part.id), ...object.keyframes.map((keyframe) => keyframe.id)]),
    ...document.shots.flatMap((shot) => [shot.id, ...shot.camera.keyframes.map((keyframe) => keyframe.id)]),
  ])
}
const transform = (position: Vec3 = [0, .5, 0]): Transform => ({ position: [...position], rotation: [0, 0, 0], scale: [1, 1, 1], anchor: [0, 0, 0] })
function clone<T>(value: T): T { return structuredClone(value) }
export function normalizeRotationDegrees(value: number): number {
  if (!Number.isFinite(value)) return 0
  const rounded = Math.round(value)
  const wrapped = ((rounded + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 && rounded > 0 && rounded <= 180 ? 180 : wrapped
}
export function formatTransformNumeric(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const precise = Number(value.toPrecision(4))
  return Object.is(precise, -0) ? '0' : String(precise)
}
const sceneTargetKinds = ['human', 'block', 'sphere', 'column'] as const
const finiteVec3 = (value: unknown): value is Vec3 => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)
export const transformAnchor = (value: Transform): Vec3 => finiteVec3(value.anchor) ? clone(value.anchor) : [0, 0, 0]
const transformEuler = (value: Transform) => new THREE.Euler(...value.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
export function transformPointWorld(value: Transform, point: Vec3): Vec3 {
  return new THREE.Vector3(...point).sub(new THREE.Vector3(...transformAnchor(value))).multiply(new THREE.Vector3(...value.scale)).applyEuler(transformEuler(value)).add(new THREE.Vector3(...value.position)).toArray() as Vec3
}
export function entityWorldBounds(entity: Pick<SceneEntity, 'dimensions' | 'transform'>): { min: Vec3; max: Vec3 } {
  const bounds = new THREE.Box3()
  const half = entity.dimensions.map((value) => value / 2) as Vec3
  for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) bounds.expandByPoint(new THREE.Vector3(...transformPointWorld(entity.transform, [x, y, z])))
  return { min: bounds.min.toArray() as Vec3, max: bounds.max.toArray() as Vec3 }
}
export function snapTransformToCanvas(entity: Pick<SceneEntity, 'dimensions' | 'transform'>, authored: Transform): Transform {
  const next = clone(authored)
  const minimum = entityWorldBounds({ ...entity, transform: next }).min[1]
  if (minimum < 0) next.position[1] -= minimum
  return next
}
export function reanchorTransform(value: Transform, anchor: Vec3): Transform {
  const current = transformAnchor(value)
  const compensation = new THREE.Vector3(...anchor).sub(new THREE.Vector3(...current)).multiply(new THREE.Vector3(...value.scale)).applyEuler(transformEuler(value))
  return { ...clone(value), position: new THREE.Vector3(...value.position).add(compensation).toArray() as Vec3, anchor: clone(anchor) }
}
export function scaleTransformAxis(value: Transform, axis: number, nextValue: number, linked: boolean): Transform {
  const next = clone(value); const accepted = Math.max(.001, Number.isFinite(nextValue) ? nextValue : value.scale[axis])
  if (linked) { const origin = Math.abs(value.scale[axis]) < 1e-9 ? 1 : value.scale[axis]; const ratio = accepted / origin; next.scale = value.scale.map((item) => Math.max(.001, item * ratio)) as Vec3 }
  else next.scale[axis] = accepted
  next.anchor = transformAnchor(value)
  return next
}
function canonicalTarget(value: TargetMode | undefined, fallback: Vec3 = [0, 1, 0]): TargetMode {
  if (!value || value.mode === 'free') return { mode: 'free' }
  if (value.mode === 'point') return { mode: 'point', position: finiteVec3(value.position) ? clone(value.position) : clone(fallback) }
  return { mode: 'object', entityId: value.entityId, ...(finiteVec3(value.lastPosition) ? { lastPosition: clone(value.lastPosition) } : {}) }
}

function cameraKeyframe(frame: number, position: Vec3 = [0, 3, 8], reserved: ReadonlySet<string> = new Set()): CameraKeyframe {
  return { id: id('camera-keyframe', reserved), frame, transform: transform(position), focalLength: 35, focusDistance: 8, aperture: 4, near: .1, far: 100, target: { mode: 'free' }, ease: 'linear' }
}
function cameraMetadata(frame: number): CameraMetadata {
  return { frame, target: { mode: 'free' }, focalLength: 35, focusDistance: 8, aperture: 4, near: .1, far: 100, ease: 'linear', movement: 'static' }
}
function firstShot(): Shot {
  const keys = [cameraKeyframe(0), cameraKeyframe(48)]
  return { id: id('shot'), name: 'Shot 01', startFrame: 0, endFrame: 48, boundary: 'continue', clipColor: 'clear', entityOrder: [], entityStarts: {}, shotSize: 'wide', duration: 2, cameraMovement: 'static', camera: { name: 'Camera', keyframes: keys, transform: clone(keys[0].transform), dimensions: dimensionsFor('camera'), metadata: cameraMetadata(0), allowBelowCanvas: false, scaleLinked: true } }
}
export function createCameraDocument(nodeId: string): CameraDocument {
  return { id: nodeId, name: '3D Camera', aspect: '16:9', resolution: '1080p', fps: 24, scope: 'full', entities: [], groups: [], objects: [], shots: [], sceneTree: [] }
}

export function toggleTimelineEditLock(document: CameraDocument): CameraDocument {
  return { ...document, timelineEditLocked: !document.timelineEditLocked }
}

const dimensionsFor = (kind: EntityKind | LegacyEntityKind): Vec3 => kind === 'human' ? [1, 2, .75] : kind === 'sphere' || kind === 'column' ? [1, 1, 1] : kind === 'camera' ? [1.55, 1.28, 1.4] : [1, 1, 1]
const defaultColorFor = (kind: EntityKind) => kind === 'column' ? '#4f4a61' : '#8d78d6'
export function addEntity(document: CameraDocument, kind: EntityKind | LegacyEntityKind, name: string): CameraDocument {
  const next = clone(document)
  const dimensions = dimensionsFor(kind)
  const entity: SceneEntity = {
    id: id('entity', documentIds(next)), name, kind: kind as EntityKind, color: defaultColorFor((kind === 'box' ? 'block' : kind) as EntityKind), resizeLocked: false,
    transform: transform([0, dimensions[1] / 2, 0]), dimensions, keyframes: [], locks: {},
    ...(kind === 'camera' ? { camera: cameraMetadata(next.entities.filter((item) => item.kind === 'camera').length * 24) } : {}),
    allowBelowCanvas: false,
    scaleLinked: true,
  }
  next.entities.push(entity)
  next.sceneTree = [...(next.sceneTree || next.shots.map((shot) => shot.id)), entity.id]
  if (kind === 'camera') {
    const start = next.shots.at(-1)?.endFrame || 0
    const end = start + 48
    const shotId = id('shot', documentIds(next))
    const first = { ...cameraKeyframe(start, entity.transform.position, documentIds(next)), transform: clone(entity.transform) }
    const last = { ...cameraKeyframe(end, entity.transform.position, documentIds(next)), transform: clone(entity.transform) }
    entity.keyframes = [clone(first)]
    const shot: Shot = { id: shotId, name: `Shot ${String(next.shots.length + 1).padStart(2, '0')}`, startFrame: start, endFrame: end, boundary: 'continue', clipColor: 'clear', entityOrder: next.entities.filter((item) => item.kind !== 'camera').map((item) => item.id), entityStarts: {}, shotSize: 'wide', duration: (end - start) / next.fps, cameraMovement: 'static', camera: { name: entity.name, activeCameraId: entity.id, keyframes: [first, last], transform: clone(entity.transform), dimensions: clone(entity.dimensions), metadata: clone(entity.camera || cameraMetadata(start)), allowBelowCanvas: false, locks: {}, scaleLinked: true } }
    for (const item of next.entities.filter((candidate) => candidate.kind !== 'camera')) shot.entityStarts[item.id] = { mode: start === 0 ? 'independent' : 'inherited', label: start === 0 ? 'Independent Start' : `Inherited from ${previousShotName(next, shot.id)}` }
    next.shots.push(shot)
    next.sceneTree = [...new Set([...(next.sceneTree || []), shot.id])]
  }
  for (const shot of next.shots) {
    if (entity.kind !== 'camera') {
      shot.entityOrder.push(entity.id)
      shot.entityStarts[entity.id] = { mode: shot.startFrame === 0 ? 'independent' : 'inherited', label: shot.startFrame === 0 ? 'Independent Start' : `Inherited from ${previousShotName(next, shot.id)}` }
    }
  }
  return next
}
export function addEntityAt(document: CameraDocument, kind: EntityKind | LegacyEntityKind, name: string, ground: Vec3): CameraDocument {
  const next = addEntity(document, kind, name)
  const entity = next.entities[next.entities.length - 1]
  entity.transform.position = [ground[0], entity.transform.position[1], ground[2]]
  entity.transform = snapTransformToCanvas(entity, entity.transform)
  if (kind === 'camera') {
    const shot = next.shots.find((candidate) => candidate.camera.activeCameraId === entity.id)
    if (shot) {
      shot.camera.transform = clone(entity.transform)
      shot.camera.keyframes = shot.camera.keyframes.map((keyframe) => { const nextKeyframe = clone(keyframe); nextKeyframe.transform = clone(entity.transform); return nextKeyframe })
    }
  }
  return next
}

export function deleteEntities(document: CameraDocument, entityIds: string[]): CameraDocument {
  const next = clone(document)
  const cameraReferences = new Map<string, number>()
  for (const shot of next.shots) if (shot.camera.activeCameraId) cameraReferences.set(shot.camera.activeCameraId, (cameraReferences.get(shot.camera.activeCameraId) || 0) + 1)
  const deleted = new Set(entityIds.filter((entityId) => !(next.entities.find((entity) => entity.id === entityId)?.kind === 'camera' && (cameraReferences.get(entityId) || 0) > 1)))

  const unlock = (target: TargetMode): TargetMode => (target.mode === 'locked' || target.mode === 'object') && deleted.has(target.entityId)
    ? { mode: 'free' }
    : target
  for (const camera of next.entities.filter((entity) => entity.kind === 'camera' && !deleted.has(entity.id))) {
    if (camera.camera) camera.camera.target = unlock(camera.camera.target)
  }
  for (const shot of next.shots) {
    shot.entityOrder = shot.entityOrder.filter((entityId) => !deleted.has(entityId))
    for (const entityId of entityIds) delete shot.entityStarts[entityId]
    for (const keyframe of shot.camera.keyframes) keyframe.target = unlock(keyframe.target)
  }
  next.shots = next.shots.filter((shot) => !shot.camera.activeCameraId || !deleted.has(shot.camera.activeCameraId))
  next.entities = next.entities.filter((entity) => !deleted.has(entity.id))
  next.groups = next.groups.map((group) => ({ ...group, childIds: group.childIds.filter((entityId) => !deleted.has(entityId)) })).filter((group) => group.childIds.length > 1)
  const removedShotIds = new Set(document.shots.filter((shot) => shot.camera.activeCameraId && deleted.has(shot.camera.activeCameraId)).map((shot) => shot.id))
  next.sceneTree = (next.sceneTree || []).filter((id) => !deleted.has(id) && !removedShotIds.has(id))
  return next
}

const SUPPORTED_KINDS = new Set<EntityKind>(['human', 'block', 'sphere', 'column', 'camera'])
const RETIRED_KINDS = new Set(['chair', 'table', 'room', 'cylinder', 'plane', 'wall', 'ambient-light', 'directional-light', 'point-light', 'three-point-lights'])
export function snapShotDurationSeconds(seconds: number): number {
  return Math.max(.5, Math.round((Number.isFinite(seconds) ? seconds : .5) * 2) / 2)
}
export function framesForShotDuration(seconds: number, fps: number): number {
  return Math.max(1, Math.round(snapShotDurationSeconds(seconds) * Math.max(1, fps)))
}
export function sanitizeCameraDocument(input: CameraDocument): CameraDocument {
  const next = clone(input)
  next.objects = Array.isArray(next.objects) ? next.objects.filter((object) => object && typeof object.id === 'string' && Array.isArray(object.parts) && object.parts.length > 0) : []
  const usedIds = new Set<string>()
  const generationReserved = documentIds(next)
  const replacements = new Map<string, string[]>()
  const sourceIdById = new Map<string, string>()
  const uniqueOccurrenceId = (sourceId: string) => {
    if (!usedIds.has(sourceId)) { usedIds.add(sourceId); return sourceId }
    let occurrence = 2
    let candidate = `${sourceId}-${occurrence}`
    while (usedIds.has(candidate) || generationReserved.has(candidate)) { occurrence += 1; candidate = `${sourceId}-${occurrence}` }
    usedIds.add(candidate); generationReserved.add(candidate)
    return candidate
  }
  next.entities = next.entities.flatMap((sourceEntity) => {
    const sourceKind = sourceEntity.kind as string
    if (RETIRED_KINDS.has(sourceKind) || sourceKind !== 'box' && !SUPPORTED_KINDS.has(sourceKind as EntityKind)) return []
    const { light: _legacyLight, partColors: _legacyPartColors, faceColors: _legacyFaceColors, materials: _legacyMaterials, ...raw } = sourceEntity as SceneEntity & { light?: unknown; partColors?: unknown; faceColors?: unknown; materials?: unknown }
    const clean = raw as SceneEntity
    const sourceId = clean.id
    clean.id = uniqueOccurrenceId(sourceId)
    replacements.set(sourceId, [...(replacements.get(sourceId) || []), clean.id])
    sourceIdById.set(clean.id, sourceId)
    if (sourceKind === 'box') {
      clean.kind = 'block'
      if (!clean.name.trim() || /^box(?:\s|$)/i.test(clean.name)) clean.name = clean.name.replace(/^box/i, 'Block')
    }
    if (clean.kind === 'camera') clean.color = '#8d78d6'
    else try { clean.color = normalizeHex(clean.color) } catch { clean.color = defaultColorFor(clean.kind) }
    clean.dimensions = clean.dimensions.map((value) => Math.max(.25, Number.isFinite(value) ? value : 1)) as Vec3
    clean.transform.anchor = finiteVec3(clean.transform.anchor) ? clone(clean.transform.anchor) : [0, 0, 0]
    clean.resizeLocked = Boolean(clean.resizeLocked)
    const legacyTransformLocked = clean.locationLocked === true
    const rawLocks = clean.locks || {}
    clean.locks = { ...(legacyTransformLocked || rawLocks.transform === true ? { transform: true } : {}), ...(rawLocks.all === true ? { all: true } : {}), ...(rawLocks.rotation === true ? { rotation: true } : {}), ...(rawLocks.settings === true ? { settings: true } : {}) }
    delete clean.locationLocked
    clean.keyframes = (Array.isArray(clean.keyframes) ? clean.keyframes : []).filter((keyframe) => !keyframe.property || keyframePropertyAllowed(clean.kind, keyframe.property))
    for (const keyframe of clean.keyframes) keyframe.transform.anchor = finiteVec3(keyframe.transform.anchor) ? clone(keyframe.transform.anchor) : clone(clean.transform.anchor)
    if (clean.kind === 'camera') {
      clean.transform.scale = [1, 1, 1]
      for (const keyframe of clean.keyframes) keyframe.transform.scale = [1, 1, 1]
      clean.camera = {
        ...cameraMetadata(clean.keyframes[0]?.frame || 0),
        ...clean.camera,
        target: clean.camera?.target || { mode: 'free' },
      }
      delete clean.camera.duration
    } else delete clean.camera
    return [clean]
  })
  const firstReplacement = (sourceId: string) => replacements.get(sourceId)?.[0]
  const reconcileOccurrences = (ids: string[]) => {
    const cursors = new Map<string, number>()
    return ids.flatMap((sourceId) => {
      const cursor = cursors.get(sourceId) || 0
      cursors.set(sourceId, cursor + 1)
      const replacement = replacements.get(sourceId)?.[cursor]
      return replacement ? [replacement] : []
    })
  }
  const claimId = (sourceId: string, prefix: string) => {
    if (!usedIds.has(sourceId)) { usedIds.add(sourceId); return sourceId }
    const cleanId = id(prefix, new Set([...generationReserved, ...usedIds])); usedIds.add(cleanId); generationReserved.add(cleanId); return cleanId
  }
  for (const entity of next.entities) for (const keyframe of entity.keyframes) if (keyframe.id) keyframe.id = claimId(keyframe.id, 'entity-keyframe')
  for (const camera of next.entities.filter((entity) => entity.kind === 'camera')) {
    camera.camera!.target = canonicalTarget(camera.camera?.target)
    if (camera.camera?.target.mode === 'object') {
      const targetId = firstReplacement(camera.camera.target.entityId)
      camera.camera.target = targetId ? { ...camera.camera.target, entityId: targetId } : { mode: 'free' }
    }
  }
  let shotCursor = 0
  const cameraIds = new Set(next.entities.filter((entity) => entity.kind === 'camera').map((entity) => entity.id))
  const claimedCameraIds = new Set<string>()
  const sanitizedShots: Shot[] = []
  for (const shot of next.shots) {
    let linkedCameraId = shot.camera.activeCameraId ? firstReplacement(shot.camera.activeCameraId) : undefined
    if (!linkedCameraId || !cameraIds.has(linkedCameraId)) {
      const authoredTransform = finiteVec3(shot.camera.transform?.position)
        ? clone(shot.camera.transform!)
        : clone(shot.camera.keyframes[0]?.transform || transform([0, 3, 8]))
      const authoredDimensions = finiteVec3(shot.camera.dimensions) ? clone(shot.camera.dimensions) : dimensionsFor('camera')
      const authoredMetadata = { ...cameraMetadata(Number.isFinite(shot.startFrame) ? shot.startFrame : 0), ...clone(shot.camera.metadata || {}) }
      const reserved = new Set([...generationReserved, ...usedIds])
      const materialized: SceneEntity = {
        id: id('entity', reserved),
        name: shot.camera.name || 'Camera',
        kind: 'camera',
        color: '#8d78d6',
        transform: authoredTransform,
        dimensions: authoredDimensions,
        keyframes: shot.camera.keyframes
          .filter((keyframe) => keyframe.property !== 'camera.target' && keyframe.property !== 'camera.movement')
          .map((keyframe) => ({ id: id('entity-keyframe', reserved), frame: keyframe.frame, transform: clone(keyframe.transform), ease: keyframe.ease })),
        resizeLocked: false,
        locks: shot.camera.locks || (shot.camera.locationLocked === true ? { transform: true } : {}),
        allowBelowCanvas: shot.camera.allowBelowCanvas === true,
        scaleLinked: shot.camera.scaleLinked !== false,
        camera: authoredMetadata,
      }
      usedIds.add(materialized.id)
      generationReserved.add(materialized.id)
      next.entities.push(materialized)
      cameraIds.add(materialized.id)
      linkedCameraId = materialized.id
    }
    if (!linkedCameraId || !cameraIds.has(linkedCameraId) || claimedCameraIds.has(linkedCameraId)) continue
    shot.camera.activeCameraId = linkedCameraId
    claimedCameraIds.add(linkedCameraId)
    shot.id = claimId(shot.id, 'shot')
    shot.clipColor = sanitizeShotClipColor(shot.clipColor)
    const oldStart = Number.isFinite(shot.startFrame) ? shot.startFrame : shotCursor
    const oldEnd = Number.isFinite(shot.endFrame) ? shot.endFrame : oldStart
    const legacySeconds = Math.max(1, oldEnd - oldStart) / Math.max(1, next.fps)
    shot.duration = snapShotDurationSeconds(Number.isFinite(shot.duration) ? shot.duration : legacySeconds)
    const durationFrames = framesForShotDuration(shot.duration, next.fps)
    const oldSpan = Math.max(1, oldEnd - oldStart)
    for (const keyframe of shot.camera.keyframes) {
      const progress = Math.max(0, Math.min(1, (keyframe.frame - oldStart) / oldSpan))
      keyframe.frame = shotCursor + Math.round(progress * durationFrames)
    }
    shot.startFrame = shotCursor
    shot.endFrame = shotCursor + durationFrames
    shotCursor = shot.endFrame
    const priorStarts = shot.entityStarts
    shot.entityOrder = reconcileOccurrences(shot.entityOrder).filter((entityId) => next.entities.find((entity) => entity.id === entityId)?.kind !== 'camera')
    const unlisted = next.entities.filter((entity) => entity.kind !== 'camera').map((entity) => entity.id).filter((entityId) => !shot.entityOrder.includes(entityId))
    shot.entityOrder.push(...unlisted)
    shot.entityStarts = {}
    for (const entityId of shot.entityOrder) {
      const sourceStart = priorStarts[sourceIdById.get(entityId) || entityId]
      shot.entityStarts[entityId] = sourceStart || { mode: shot.startFrame === 0 ? 'independent' : 'inherited', label: shot.startFrame === 0 ? 'Independent Start' : `Inherited from ${previousShotName(next, shot.id)}` }
    }
    const referenced = shot.camera.activeCameraId ? next.entities.find((entity) => entity.id === shot.camera.activeCameraId && entity.kind === 'camera') : undefined
    if (referenced) {
      const priorCameraKeys = clone(shot.camera.keyframes)
      const baseFrame = Number.isFinite(referenced.camera?.frame) ? referenced.camera!.frame : 0
      const evaluatedLooseCamera = (frame: number) => entityAt({
        ...referenced,
        keyframes: [{ frame: baseFrame, transform: clone(referenced.transform), ease: referenced.camera?.ease || 'linear' }, ...referenced.keyframes],
      }, frame).transform
      const geometryFrames = [...new Set([
        shot.startFrame,
        ...priorCameraKeys.filter((keyframe) => keyframe.property !== 'camera.target' && keyframe.property !== 'camera.movement').map((keyframe) => keyframe.frame),
        ...referenced.keyframes.filter((keyframe) => keyframe.frame > shot.startFrame && keyframe.frame < shot.endFrame).map((keyframe) => keyframe.frame),
        shot.endFrame,
      ])].sort((left, right) => left - right)
      const atomicKeys = priorCameraKeys.filter((keyframe) => keyframe.property === 'camera.target' || keyframe.property === 'camera.movement')
      shot.camera.keyframes = [
        ...geometryFrames.map((frame) => {
          const sample = priorCameraKeys.length ? cameraAt({ ...shot, camera: { ...shot.camera, keyframes: priorCameraKeys } }, frame) : cameraKeyframe(frame)
          const existing = priorCameraKeys.find((keyframe) => keyframe.frame === frame && keyframe.property !== 'camera.target' && keyframe.property !== 'camera.movement')
          return { ...sample, id: existing?.id || id('camera-keyframe', new Set([...generationReserved, ...usedIds])), frame, transform: evaluatedLooseCamera(frame) }
        }),
        ...atomicKeys,
      ]
      shot.camera.name = referenced.name
      shot.camera.transform = evaluatedLooseCamera(shot.startFrame)
      shot.camera.dimensions = clone(referenced.dimensions)
      shot.camera.metadata = clone(referenced.camera || cameraMetadata(shot.startFrame))
      shot.camera.locks = clone(referenced.locks || {})
    }
    shot.camera.transform = finiteVec3(shot.camera.transform?.position) ? clone(shot.camera.transform!) : clone(shot.camera.keyframes[0]?.transform || transform([0, 3, 8]))
    shot.camera.dimensions = finiteVec3(shot.camera.dimensions) ? clone(shot.camera.dimensions) : dimensionsFor('camera')
    shot.camera.metadata = { ...cameraMetadata(shot.startFrame), ...shot.camera.metadata }
    shot.camera.allowBelowCanvas = shot.camera.allowBelowCanvas === true
    shot.camera.locks = { ...(shot.camera.locks || {}), ...(shot.camera.locationLocked === true ? { transform: true } : {}) }
    delete shot.camera.locationLocked
    shot.camera.scaleLinked = shot.camera.scaleLinked !== false

    if (!shot.camera.keyframes.length) {
      const state = shot.camera.metadata
      const makeBoundary = (frame: number): CameraKeyframe => ({
        id: id('camera-keyframe', new Set([...generationReserved, ...usedIds])), frame,
        transform: clone(shot.camera.transform!), focalLength: state.focalLength,
        focusDistance: state.focusDistance, aperture: state.aperture, near: state.near, far: state.far,
        target: canonicalTarget(state.target), movement: normalizeCameraMovement(state.movement), ease: state.ease,
      })
      shot.camera.keyframes = [makeBoundary(shot.startFrame), makeBoundary(shot.endFrame)]
    }
    for (const keyframe of shot.camera.keyframes) {
      keyframe.id = claimId(keyframe.id, 'camera-keyframe')
      keyframe.transform.scale = [1, 1, 1]
      keyframe.near = Number.isFinite(keyframe.near) ? keyframe.near : .1
      keyframe.far = Number.isFinite(keyframe.far) ? keyframe.far : 100
      keyframe.target = canonicalTarget(keyframe.target)
      if (keyframe.target.mode === 'object') {
        const targetId = firstReplacement(keyframe.target.entityId)
        keyframe.target = targetId ? { ...keyframe.target, entityId: targetId } : { mode: 'free' }
      }
    }
    sanitizedShots.push(shot)
  }
  next.shots = sanitizedShots
  next.entities = next.entities.filter((entity) => entity.kind !== 'camera' || claimedCameraIds.has(entity.id))
  const sourceGroups = Array.isArray(next.groups) ? next.groups : []
  const groupIdBySource = new Map<string, string>()
  for (const source of sourceGroups) groupIdBySource.set(source.id, claimId(source.id, 'group'))
  const objectIds = new Set((next.objects || []).map((object) => object.id))
  const leafIds = new Set([...next.entities.map((entity) => entity.id), ...objectIds])
  const owned = new Set<string>()
  next.groups = sourceGroups.flatMap((source, groupIndex) => {
    const groupId = groupIdBySource.get(source.id)!
    const childIds = (Array.isArray(source.childIds) ? source.childIds : []).flatMap((sourceId) => {
      const childId = firstReplacement(sourceId) || (leafIds.has(sourceId) ? sourceId : groupIdBySource.get(sourceId))
      return childId && childId !== groupId && !owned.has(childId) ? [childId] : []
    }).filter((childId, index, all) => all.indexOf(childId) === index)
    if (!childIds.length) return []
    childIds.forEach((childId) => owned.add(childId))
    const pivot = validVec3(source.pivot) ? clone(source.pivot) : groupPivot(next.entities.filter((entity) => childIds.includes(entity.id)))
    const rotation = validVec3(source.rotation) ? clone(source.rotation) : [0, 0, 0] as Vec3
    return [{ ...source, id: groupId, name: String(source.name || `Group ${groupIndex + 1}`), childIds, pivot, rotation, shapeLocked: source.shapeLocked === true }]
  })
  const survivingGroupIds = new Set(next.groups.map((group) => group.id))
  next.groups = next.groups.map((group) => ({ ...group, childIds: group.childIds.filter((id) => leafIds.has(id) || survivingGroupIds.has(id)) })).filter((group) => group.childIds.length > 0)
  const entityIds = new Set(next.entities.map((entity) => entity.id))
  for (const shot of next.shots) {
    shot.entityOrder = shot.entityOrder.filter((entityId) => entityIds.has(entityId))
    shot.entityStarts = Object.fromEntries(Object.entries(shot.entityStarts).filter(([entityId]) => entityIds.has(entityId)))
  }
  const rootIds = new Set([...next.entities.map((entity) => entity.id), ...(next.objects || []).map((object) => object.id), ...next.groups.map((group) => group.id)])
  const owningGroup = new Map(next.groups.flatMap((group) => group.childIds.map((childId) => [childId, group.id] as const)))
  const canonicalRoot = (sourceId: string) => {
    let candidate = rootIds.has(sourceId) ? sourceId : firstReplacement(sourceId)
    const seen = new Set<string>()
    while (candidate && owningGroup.has(candidate) && !seen.has(candidate)) { seen.add(candidate); candidate = owningGroup.get(candidate) }
    return candidate
  }
  const explicitRoots = (Array.isArray(input.sceneTree) ? input.sceneTree : []).flatMap((sourceId) => {
    const root = canonicalRoot(sourceId)
    return root && rootIds.has(root) ? [root] : []
  })
  const legacyRoots = next.shots.flatMap((shot) => shot.entityOrder).flatMap((entityId) => {
    const root = canonicalRoot(entityId)
    return root && rootIds.has(root) ? [root] : []
  })
  const remainingRoots = [...next.entities.map((entity) => canonicalRoot(entity.id) || entity.id), ...(next.objects || []).map((object) => canonicalRoot(object.id) || object.id), ...next.groups.map((group) => canonicalRoot(group.id) || group.id)]
  next.sceneTree = [...new Set([...explicitRoots, ...legacyRoots, ...remainingRoots])]
  return next
}

function previousShotName(document: CameraDocument, shotId: string): string { const at = document.shots.findIndex((s) => s.id === shotId); return at > 0 ? document.shots[at - 1].name : 'Sequence Start' }
export function addShot(document: CameraDocument, name = `Shot ${String(document.shots.length + 1).padStart(2, '0')}`): CameraDocument {
  const next = addEntity(document, 'camera', 'Camera')
  const shot = next.shots.at(-1)
  if (shot) shot.name = name
  return next
}

export function cameraEntityForShot(document: CameraDocument, shotOrId: Shot | string): SceneEntity | undefined {
  const shot = typeof shotOrId === 'string' ? document.shots.find((item) => item.id === shotOrId) : shotOrId
  const cameraId = shot?.camera.activeCameraId
  return cameraId ? document.entities.find((entity) => entity.id === cameraId && entity.kind === 'camera') : undefined
}
export function updateShotCameraEntity(document: CameraDocument, shotId: string, entity: SceneEntity): CameraDocument {
  const next = clone(document)
  const shot = next.shots.find((item) => item.id === shotId)
  const cameraId = shot?.camera.activeCameraId
  const camera = cameraId ? next.entities.find((item) => item.id === cameraId && item.kind === 'camera') : undefined
  if (!shot || !camera) return next
  const updated = { ...clone(entity), id: camera.id, kind: 'camera' as const }
  const locks = effectiveEntityLocks(camera)
  const transformChanged = JSON.stringify(updated.transform) !== JSON.stringify(camera.transform)
  const rotationChanged = JSON.stringify(updated.transform.rotation) !== JSON.stringify(camera.transform.rotation)
  const settingsChanged = JSON.stringify(updated.camera) !== JSON.stringify(camera.camera)
  if (locks.transform && transformChanged && !rotationChanged || locks.rotation && rotationChanged || locks.settings && settingsChanged) return next
  next.entities = next.entities.map((item) => item.id === camera.id ? updated : item)
  shot.camera = { ...shot.camera, name: updated.name, activeCameraId: camera.id, transform: clone(updated.transform), dimensions: clone(updated.dimensions), metadata: clone(updated.camera || cameraMetadata(shot.startFrame)), allowBelowCanvas: Boolean(updated.allowBelowCanvas), locks: clone(updated.locks || {}), scaleLinked: updated.scaleLinked !== false }
  return next
}
export function deployCameraShot(document: CameraDocument, ground: Vec3): CameraDocument {
  return addEntityAt(document, 'camera', 'Camera', ground)
}
export function toggleShotCameraPropertyKeyframe(document: CameraDocument, shotId: string, property: KeyframeProperty, frame: number) {
  const shot = document.shots.find((item) => item.id === shotId)
  if (!shot) return { document, action: 'removed' as const, keyframeId: undefined }
  const camera = cameraEntityForShot(document, shot)
  if (!camera) return { document, action: 'removed' as const, keyframeId: undefined }
  if (property === 'camera.focalLength') {
    const existing = shot.camera.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === property)
    if (existing) {
      const next = clone(document); const target = next.shots.find((item) => item.id === shotId)!
      target.camera.keyframes = target.camera.keyframes.filter((keyframe) => !(keyframe.frame === frame && keyframe.property === property))
      return { document: next, action: 'removed' as const, keyframeId: existing.id }
    }
    const next = authorCameraFocalLengthKeyframe(document, shotId, frame, camera.camera?.focalLength || 35)
    return { document: next, action: 'added' as const, keyframeId: next.shots.find((item) => item.id === shotId)?.camera.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === property)?.id }
  }
  if (property === 'camera.target' || property === 'camera.movement') {
    const existing = shot.camera.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === property)
    if (existing) {
      const next = clone(document); const target = next.shots.find((item) => item.id === shotId)!
      target.camera.keyframes = target.camera.keyframes.filter((keyframe) => !(keyframe.frame === frame && keyframe.property === property))
      return { document: next, action: 'removed' as const, keyframeId: existing.id }
    }
    const next = property === 'camera.target'
      ? authorCameraTargetKeyframe(document, shotId, frame, camera.camera?.target || { mode: 'free' })
      : authorCameraMovementKeyframe(document, shotId, frame, camera.camera?.movement || 'static')
    return { document: next, action: 'added' as const, keyframeId: next.shots.find((item) => item.id === shotId)?.camera.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === property)?.id }
  }
  const result = toggleEntityPropertyKeyframe(document, camera.id, property, frame)
  return { ...result, document: updateShotCameraEntity(result.document, shot.id, result.document.entities.find((entity) => entity.id === camera.id) || camera) }
}

export function toggleCameraSectionKeyframe(document: CameraDocument, shotId: string, frame: number) {
  const shot = document.shots.find((item) => item.id === shotId)
  const camera = shot && cameraEntityForShot(document, shot)
  if (!shot || !camera?.camera) return { document, action: 'removed' as const }
  const properties = ['camera.target', 'camera.movement', 'camera.focalLength'] as const
  const existing = properties.filter((property) => shot.camera.keyframes.some((keyframe) => keyframe.frame === frame && keyframe.property === property))
  if (existing.length === properties.length) {
    const next = clone(document)
    const target = next.shots.find((item) => item.id === shotId)!
    target.camera.keyframes = target.camera.keyframes.filter((keyframe) => !(keyframe.frame === frame && properties.includes(keyframe.property as typeof properties[number])))
    return { document: next, action: 'removed' as const }
  }
  let next = authorCameraTargetKeyframe(document, shotId, frame, camera.camera.target)
  next = authorCameraMovementKeyframe(next, shotId, frame, camera.camera.movement || 'static')
  next = authorCameraFocalLengthKeyframe(next, shotId, frame, camera.camera.focalLength)
  return { document: next, action: 'added' as const }
}

export function duplicateShot(document: CameraDocument, shotId: string): CameraDocument {
  const source = document.shots.find((shot) => shot.id === shotId); if (!source) return document
  const clipboard = copyShot(document, shotId); if (!clipboard) return document
  const result = pasteShot(document, clipboard, shotId); if (!result.insertedShotId) return document
  const duplicate = result.document.shots.find((shot) => shot.id === result.insertedShotId)!
  duplicate.name = `${source.name} Copy`
  return result.document
}
export function duplicateShotCameraUnit(document: CameraDocument, shotId: string): CameraDocument {
  const canonical = sanitizeCameraDocument(document)
  return duplicateShot(canonical, shotId)
}

export type CameraSelectionDomain =
  | { domain: 'none' }
  | { domain: 'scene'; entityIds: string[] }
  | { domain: 'timeline'; shotId: string }
export function resolveCameraSelectionDomain(input: { selectedEntityIds?: readonly string[]; selectedClipShotId?: string | null; playbackShotId?: string | null }): CameraSelectionDomain {
  if (input.selectedClipShotId) return { domain: 'timeline', shotId: input.selectedClipShotId }
  const entityIds = [...new Set(input.selectedEntityIds || [])]
  return entityIds.length ? { domain: 'scene', entityIds } : { domain: 'none' }
}

export function copyShot(document: CameraDocument, shotId: string): ShotClipboard | null {
  const source = document.shots.find((shot) => shot.id === shotId)
  if (!source) return null
  const sourceCamera = cameraEntityForShot(document, source)
  if (!sourceCamera) return null
  const shot = clone(source); const offset = shot.startFrame
  shot.startFrame = 0; shot.endFrame -= offset
  shot.camera.keyframes = shot.camera.keyframes.map((keyframe) => ({ ...keyframe, frame: keyframe.frame - offset }))
  if (shot.camera.metadata) shot.camera.metadata.frame -= offset
  const camera = clone(sourceCamera)
  camera.keyframes = camera.keyframes.map((keyframe) => ({ ...keyframe, frame: keyframe.frame - offset }))
  if (camera.baseFrame != null) camera.baseFrame -= offset
  if (camera.camera) camera.camera.frame -= offset
  return { type: 'prism-camera-shots', shot, camera }
}
function sanitizeShotTargets(shot: Shot, entities: SceneEntity[]) {
  const ids = new Set(entities.map((entity) => entity.id))
  if (shot.camera.activeCameraId && !entities.some((entity) => entity.id === shot.camera.activeCameraId && entity.kind === 'camera')) delete shot.camera.activeCameraId
  for (const keyframe of shot.camera.keyframes) {
    keyframe.target = canonicalTarget(keyframe.target)
    if (keyframe.target.mode === 'object' && !ids.has(keyframe.target.entityId)) keyframe.target = { mode: 'free' }
  }
}
function insertClipboardCamera(next: CameraDocument, shot: Shot, sourceCamera: SceneEntity, insertion: number, reserved: Set<string>) {
  const camera = clone(sourceCamera)
  camera.id = id('entity', reserved)
  reserved.add(camera.id)
  if (camera.baseFrame != null) camera.baseFrame = insertion + camera.baseFrame
  camera.keyframes = camera.keyframes.map((source) => { const keyframe = clone(source); keyframe.id = id('entity-keyframe', reserved); reserved.add(keyframe.id); keyframe.frame = insertion + source.frame; return keyframe })
  if (camera.camera) camera.camera.frame = insertion + camera.camera.frame
  shot.camera.activeCameraId = camera.id
  shot.camera.name = camera.name
  camera.transform = clone(shot.camera.transform || camera.transform)
  camera.dimensions = clone(shot.camera.dimensions || camera.dimensions)
  camera.camera = clone(shot.camera.metadata || camera.camera)
  if (camera.camera) camera.camera.frame = insertion
  next.entities.push(camera)
  return camera
}
export function pasteShot(document: CameraDocument, clipboard: ShotClipboard, afterShotId: string): { document: CameraDocument; insertedShotId: string | null } {
  if (clipboard.type !== 'prism-camera-shots') return { document, insertedShotId: null }
  const after = document.shots.findIndex((shot) => shot.id === afterShotId)
  if (after < 0) return { document, insertedShotId: null }
  const next = clone(document); const insertion = next.shots[after].endFrame; const span = Math.max(1, clipboard.shot.endFrame - clipboard.shot.startFrame)
  for (let index = after + 1; index < next.shots.length; index += 1) { next.shots[index].startFrame += span; next.shots[index].endFrame += span; for (const keyframe of next.shots[index].camera.keyframes) keyframe.frame += span }
  for (const entity of next.entities) for (const keyframe of entity.keyframes) if (keyframe.frame >= insertion) keyframe.frame += span
  const reserved = documentIds(next); const shot = clone(clipboard.shot)
  if (!clipboard.camera) return { document, insertedShotId: null }
  shot.id = id('shot', reserved); reserved.add(shot.id); shot.startFrame = insertion; shot.endFrame = insertion + span; shot.duration = span / next.fps
  shot.camera.keyframes = shot.camera.keyframes.map((source) => { const keyframe = clone(source); keyframe.id = id('camera-keyframe', reserved); reserved.add(keyframe.id); keyframe.frame = insertion + source.frame; return keyframe })
  const camera = insertClipboardCamera(next, shot, clipboard.camera, insertion, reserved)
  sanitizeShotTargets(shot, next.entities); next.shots.splice(after + 1, 0, shot); next.sceneTree = [...new Set([...(next.sceneTree || []), camera.id, shot.id])]
  return { document: next, insertedShotId: shot.id }
}
export function deleteShot(document: CameraDocument, shotId: string): { document: CameraDocument; changed: boolean; selectedShotId?: string; playhead?: number } {
  const index = document.shots.findIndex((shot) => shot.id === shotId)
  if (index < 0) return { document, changed: false }
  const next = clone(document); const [removed] = next.shots.splice(index, 1); const span = removed.endFrame - removed.startFrame
  for (let at = index; at < next.shots.length; at += 1) { next.shots[at].startFrame -= span; next.shots[at].endFrame -= span; for (const keyframe of next.shots[at].camera.keyframes) keyframe.frame -= span }
  for (const entity of next.entities) entity.keyframes = entity.keyframes.flatMap((keyframe) => keyframe.frame >= removed.startFrame && keyframe.frame < removed.endFrame ? [] : [{ ...keyframe, frame: keyframe.frame >= removed.endFrame ? keyframe.frame - span : keyframe.frame }])
  const removedCameraId = removed.camera.activeCameraId
  if (removedCameraId && !next.shots.some((shot) => shot.camera.activeCameraId === removedCameraId)) {
    next.entities = next.entities.filter((entity) => entity.id !== removedCameraId)
    next.groups = next.groups.map((group) => ({ ...group, childIds: group.childIds.filter((id) => id !== removedCameraId) })).filter((group) => group.childIds.length > 1)
    next.sceneTree = (next.sceneTree || []).filter((id) => id !== removedCameraId && id !== removed.id)
  }
  const selected = next.shots[Math.min(index, next.shots.length - 1)]
  return selected ? { document: next, changed: true, selectedShotId: selected.id, playhead: selected.startFrame } : { document: next, changed: true, selectedShotId: '', playhead: 0 }
}
export function cutShot(document: CameraDocument, shotId: string): { document: CameraDocument; clipboard: ShotClipboard | null; changed: boolean } {
  const clipboard = copyShot(document, shotId); const removed = deleteShot(document, shotId)
  return { document: removed.document, clipboard, changed: removed.changed }
}
export function duplicateShotAtBoundary(document: CameraDocument, shotId: string, insertionIndex: number, armedAtDragStart: boolean): { document: CameraDocument; changed: boolean; selectedShotId?: string; playhead?: number } {
  if (!armedAtDragStart) return { document, changed: false }
  const clipboard = copyShot(document, shotId)
  if (!clipboard) return { document, changed: false }
  const next = clone(document); const index = Math.max(0, Math.min(next.shots.length, insertionIndex)); const insertion = index === next.shots.length ? next.shots.at(-1)!.endFrame : next.shots[index].startFrame; const span = clipboard.shot.endFrame
  for (let at = index; at < next.shots.length; at += 1) { next.shots[at].startFrame += span; next.shots[at].endFrame += span; for (const keyframe of next.shots[at].camera.keyframes) keyframe.frame += span }
  for (const entity of next.entities) for (const keyframe of entity.keyframes) if (keyframe.frame >= insertion) keyframe.frame += span
  const reserved = documentIds(next); const shot = clone(clipboard.shot); shot.id = id('shot', reserved); reserved.add(shot.id); shot.startFrame = insertion; shot.endFrame = insertion + span; shot.duration = span / next.fps
  shot.camera.keyframes = shot.camera.keyframes.map((source) => { const keyframe = clone(source); keyframe.id = id('camera-keyframe', reserved); reserved.add(keyframe.id); keyframe.frame += insertion; return keyframe })
  if (!clipboard.camera) return { document, changed: false }
  const camera = insertClipboardCamera(next, shot, clipboard.camera, insertion, reserved)
  sanitizeShotTargets(shot, next.entities); next.shots.splice(index, 0, shot); next.sceneTree = [...new Set([...(next.sceneTree || []), camera.id, shot.id])]
  return { document: next, changed: true, selectedShotId: shot.id, playhead: shot.startFrame }
}
export function splitShotAtFrame(document: CameraDocument, shotId: string, frame: number): { document: CameraDocument; changed: boolean; selectedShotId?: string; playhead?: number } {
  const index = document.shots.findIndex((shot) => shot.id === shotId); const source = document.shots[index]
  if (!source || frame <= source.startFrame || frame >= source.endFrame) return { document, changed: false }
  const next = clone(document); const left = next.shots[index]; const originalEnd = left.endFrame; const evaluated = cameraAt(source, frame); const reserved = documentIds(next)
  const leftSample = clone(evaluated); leftSample.id = id('camera-keyframe', reserved); reserved.add(leftSample.id); leftSample.frame = frame
  const rightSample = clone(evaluated); rightSample.id = id('camera-keyframe', reserved); reserved.add(rightSample.id); rightSample.frame = frame
  const existingNames = new Set(next.shots.map((shot) => shot.name)); let suffix = 2; let rightName = `${source.name} 2`; while (existingNames.has(rightName)) { suffix += 1; rightName = `${source.name} ${suffix}` }
  const right = clone(source); right.id = id('shot', reserved); reserved.add(right.id); right.name = rightName; right.startFrame = frame; right.endFrame = originalEnd; right.duration = (originalEnd - frame) / next.fps; right.boundary = 'continue'; right.camera.transform = clone(evaluated.transform); right.camera.metadata = { frame, target: clone(evaluated.target), focalLength: evaluated.focalLength, focusDistance: evaluated.focusDistance, aperture: evaluated.aperture, near: evaluated.near, far: evaluated.far, ease: evaluated.ease, movement: evaluated.movement }
  const sourceCamera = source.camera.activeCameraId ? next.entities.find((entity) => entity.id === source.camera.activeCameraId && entity.kind === 'camera') : undefined
  if (!sourceCamera) return { document, changed: false }
  const rightCamera = clone(sourceCamera); rightCamera.id = id('entity', reserved); reserved.add(rightCamera.id); rightCamera.transform = clone(evaluated.transform); rightCamera.camera = clone(right.camera.metadata); rightCamera.keyframes = right.camera.keyframes.filter((keyframe) => keyframe.property !== 'camera.target' && keyframe.property !== 'camera.movement').map((keyframe) => { const copy = clone(keyframe); copy.id = id('entity-keyframe', reserved); reserved.add(copy.id); return copy }); right.camera.activeCameraId = rightCamera.id; next.entities.push(rightCamera)
  right.entityStarts = Object.fromEntries(right.entityOrder.map((entityId) => [entityId, { mode: 'inherited' as const, label: `Inherited from ${left.name}` }]))
  right.camera.keyframes = [rightSample, ...source.camera.keyframes.filter((keyframe) => keyframe.frame >= frame).map(clone)]
  left.endFrame = frame; left.duration = (frame - left.startFrame) / next.fps; left.camera.keyframes = [...left.camera.keyframes.filter((keyframe) => keyframe.frame < frame), leftSample]
  next.shots.splice(index + 1, 0, right); next.sceneTree = [...new Set([...(next.sceneTree || []), rightCamera.id, right.id])]
  return { document: next, changed: true, selectedShotId: right.id, playhead: frame }
}
export function setBoundary(document: CameraDocument, shotId: string, boundary: Shot['boundary']): CameraDocument { const next = clone(document); const shot = next.shots.find((s) => s.id === shotId); if (shot) shot.boundary = boundary; return next }
export function setShotClipColor(document: CameraDocument, shotId: string, color: ShotClipColor): CameraDocument { const next = clone(document); const shot = next.shots.find((item) => item.id === shotId); if (shot) shot.clipColor = sanitizeShotClipColor(color); return next }
export function setEntityPaletteColor(document: CameraDocument, entityId: string, color: ShotClipColor): CameraDocument {
  const next = clone(document); const entity = next.entities.find((item) => item.id === entityId)
  if (!entity || entity.kind === 'camera') return next
  const clean = sanitizeShotClipColor(color)
  entity.color = clean === 'clear' ? defaultColorFor(entity.kind) : CAMERA3D_PALETTE_HEX[clean]
  return next
}
export type LockScope = 'all' | 'transform' | 'rotation' | 'settings'
export function effectiveEntityLocks(entity: Pick<SceneEntity, 'locks'>) { return { transform: Boolean(entity.locks?.all || entity.locks?.transform), rotation: Boolean(entity.locks?.all || entity.locks?.rotation), settings: Boolean(entity.locks?.all || entity.locks?.settings) } }
export function setEntityLockScope(document: CameraDocument, entityId: string, scope: LockScope, value: boolean): CameraDocument {
  const next = clone(document); const entity = next.entities.find((item) => item.id === entityId); if (!entity) return next
  entity.locks = { ...(entity.locks || {}), [scope]: value }
  if (!value && scope === 'all') entity.locks.all = false
  syncCameraShot(next, entity)
  return next
}
export function toggleEntityLockScope(document: CameraDocument, entityId: string, scope: LockScope): CameraDocument {
  const entity = document.entities.find((item) => item.id === entityId)
  return setEntityLockScope(document, entityId, scope, !Boolean(entity?.locks?.[scope]))
}
export function setEntityStartInheritance(document: CameraDocument, shotId: string, entityId: string, mode: 'inherited' | 'independent'): CameraDocument {
  const next = clone(document); const shot = next.shots.find((s) => s.id === shotId); if (!shot) return next
  shot.entityStarts[entityId] = { mode, label: mode === 'inherited' ? `Inherited from ${previousShotName(next, shotId)}` : 'Independent Start · discontinuity inspectable' }; return next
}
export function easeValue(ease: Ease, raw: number): number { const t = Math.max(0, Math.min(1, raw)); if (ease === 'ease-in') return t * t; if (ease === 'ease-out') return t * (2 - t); if (ease === 'ease-in-out') return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; return t }
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const mixVec = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
export function interpolateTransform(a: Transform, b: Transform, progress: number, ease: Ease): Transform { const t = easeValue(ease, progress); return { position: mixVec(a.position, b.position, t), rotation: mixVec(a.rotation, b.rotation, t), scale: mixVec(a.scale, b.scale, t) } }
function interval<T extends { frame: number }>(items: T[], frame: number): [T, T] { const sorted = [...items].sort((a, b) => a.frame - b.frame); const before = [...sorted].reverse().find((item) => item.frame <= frame) || sorted[0]; const after = sorted.find((item) => item.frame >= frame) || sorted[sorted.length - 1]; return [before, after] }
function scalarAt(items: TransformKeyframe[], frame: number, read: (item: TransformKeyframe) => number, fallback: number) {
  if (!items.length) return fallback
  const [a, b] = interval(items, frame)
  if (a === b) return read(a)
  return mix(read(a), read(b), easeValue(a.ease, (frame - a.frame) / (b.frame - a.frame)))
}
function entityAt(entity: SceneEntity, frame: number): { transform: Transform; dimensions: Vec3 } {
  if (entity.baseFrame === frame || !entity.keyframes.length) return { transform: clone(entity.transform), dimensions: clone(entity.dimensions) }
  const legacy = entity.keyframes.filter((keyframe) => !keyframe.property)
  let evaluated = clone(entity.transform)
  if (legacy.length) {
    const [a, b] = interval(legacy, frame)
    evaluated = a === b ? clone(a.transform) : interpolateTransform(a.transform, b.transform, (frame - a.frame) / (b.frame - a.frame), a.ease)
  }
  const dimensions = clone(entity.dimensions)
  const channels = new Map<KeyframeProperty, TransformKeyframe[]>()
  for (const keyframe of entity.keyframes) if (keyframe.property) channels.set(keyframe.property, [...(channels.get(keyframe.property) || []), keyframe])
  const axes = ['x', 'y', 'z'] as const
  const evaluatedAnchor = transformAnchor(evaluated); evaluated.anchor = evaluatedAnchor
  axes.forEach((axis, index) => {
    evaluated.position[index] = scalarAt(channels.get(`position.${axis}`) || [], frame, (keyframe) => keyframe.transform.position[index], evaluated.position[index])
    evaluated.rotation[index] = scalarAt(channels.get(`rotation.${axis}`) || [], frame, (keyframe) => keyframe.transform.rotation[index], evaluated.rotation[index])
    evaluated.scale[index] = scalarAt(channels.get(`scale.${axis}`) || [], frame, (keyframe) => keyframe.transform.scale[index], evaluated.scale[index])
    evaluatedAnchor[index] = scalarAt(channels.get(`anchor.${axis}`) || [], frame, (keyframe) => transformAnchor(keyframe.transform)[index], evaluatedAnchor[index])
    dimensions[index] = scalarAt(channels.get(`dimensions.${axis}`) || [], frame, (keyframe) => keyframe.dimensions?.[index] ?? dimensions[index], dimensions[index])
  })
  const position = channels.get('position') || []
  if (position.length) for (let index = 0; index < 3; index += 1) evaluated.position[index] = scalarAt(position, frame, (keyframe) => keyframe.transform.position[index], evaluated.position[index])
  const rotation = channels.get('rotation') || []
  if (rotation.length) for (let index = 0; index < 3; index += 1) evaluated.rotation[index] = scalarAt(rotation, frame, (keyframe) => keyframe.transform.rotation[index], evaluated.rotation[index])
  const scale = channels.get('scale') || []
  if (scale.length) for (let index = 0; index < 3; index += 1) evaluated.scale[index] = scalarAt(scale, frame, (keyframe) => keyframe.transform.scale[index], evaluated.scale[index])
  const anchor = channels.get('anchor') || []
  if (anchor.length) for (let index = 0; index < 3; index += 1) evaluatedAnchor[index] = scalarAt(anchor, frame, (keyframe) => transformAnchor(keyframe.transform)[index], evaluatedAnchor[index])
  const radius = channels.get('radius') || []
  if (radius.length) dimensions[0] = dimensions[2] = scalarAt(radius, frame, (keyframe) => (keyframe.dimensions?.[0] ?? dimensions[0]) / 2, dimensions[0] / 2) * 2
  const height = channels.get('height') || []
  if (height.length) dimensions[1] = scalarAt(height, frame, (keyframe) => keyframe.dimensions?.[1] ?? dimensions[1], dimensions[1])
  return { transform: evaluated, dimensions }
}
function cameraAt(shot: Shot, frame: number): CameraKeyframe {
  const geometry = shot.camera.keyframes.filter((keyframe) => !['camera.focalLength', 'camera.target', 'camera.movement'].includes(keyframe.property || ''))
  const [a, b] = interval(geometry.length ? geometry : shot.camera.keyframes, frame)
  const t = a === b || shot.boundary === 'cut' && frame === shot.startFrame ? 0 : easeValue(a.ease, (frame - a.frame) / Math.max(1, b.frame - a.frame))
  const result: CameraKeyframe = a === b || t === 0 ? clone(a) : { ...clone(a), frame, transform: interpolateTransform(a.transform, b.transform, t, 'linear'), focalLength: mix(a.focalLength, b.focalLength, t), focusDistance: mix(a.focusDistance, b.focusDistance, t), aperture: mix(a.aperture, b.aperture, t), near: mix(a.near, b.near, t), far: mix(a.far, b.far, t), target: clone(a.target) }
  const targets = shot.camera.keyframes.filter((keyframe) => keyframe.property === 'camera.target').sort((left, right) => left.frame - right.frame)
  const previous = targets.filter((keyframe) => keyframe.frame <= frame).at(-1)
  const next = targets.find((keyframe) => keyframe.frame > frame)
  if (previous) {
    result.target = clone(previous.target)
    if (previous.target.mode === 'point' && next?.target.mode === 'point') {
      const progress = easeValue(previous.ease, (frame - previous.frame) / Math.max(1, next.frame - previous.frame))
      result.target = { mode: 'point', position: mixVec(previous.target.position, next.target.position, progress) }
    }
  } else result.target = canonicalTarget(a.target)
  const focal = shot.camera.keyframes.filter((keyframe) => keyframe.property === 'camera.focalLength').sort((left, right) => left.frame - right.frame)
  const focalPrevious = focal.filter((keyframe) => keyframe.frame <= frame).at(-1)
  const focalNext = focal.find((keyframe) => keyframe.frame > frame)
  if (focalPrevious) result.focalLength = focalNext
    ? mix(focalPrevious.focalLength, focalNext.focalLength, easeValue(focalPrevious.ease, (frame - focalPrevious.frame) / Math.max(1, focalNext.frame - focalPrevious.frame)))
    : focalPrevious.focalLength
  const movement = shot.camera.keyframes.filter((keyframe) => keyframe.property === 'camera.movement' && keyframe.frame <= frame).sort((left, right) => left.frame - right.frame).at(-1)
  result.movement = movement?.movement || a.movement || 'static'
  if (frame === shot.startFrame) {
    if (shot.camera.transform) result.transform = clone(shot.camera.transform)
    if (shot.camera.metadata) {
      result.focalLength = shot.camera.metadata.focalLength
      result.focusDistance = shot.camera.metadata.focusDistance
      result.aperture = shot.camera.metadata.aperture
      result.near = shot.camera.metadata.near
      result.far = shot.camera.metadata.far
      result.target = canonicalTarget(shot.camera.metadata.target)
      result.movement = normalizeCameraMovement(shot.camera.metadata.movement)
      result.ease = shot.camera.metadata.ease
    }
  }
  return result
}

export function authorCameraTargetKeyframe(document: CameraDocument, shotId: string, frame: number, target: TargetMode, ease: Ease = 'linear'): CameraDocument {
  const next = clone(document); const shot = next.shots.find((item) => item.id === shotId)
  if (!shot) return document
  const sample = cameraAt(shot, frame); const clean = canonicalTarget(target)
  const existing = shot.camera.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === 'camera.target')
  if (existing) { existing.target = clean; existing.ease = ease }
  else shot.camera.keyframes.push({ ...sample, id: id('camera-keyframe', documentIds(next)), property: 'camera.target', frame, target: clean, ease })
  shot.camera.keyframes.sort((left, right) => left.frame - right.frame || String(left.property).localeCompare(String(right.property)))
  return next
}

export function authorCameraFocalLengthKeyframe(document: CameraDocument, shotId: string, frame: number, focalLength: number, ease: Ease = 'linear'): CameraDocument {
  const next = clone(document); const shot = next.shots.find((item) => item.id === shotId)
  if (!shot) return document
  const sample = cameraAt(shot, frame); const value = CAMERA_FOCAL_LENGTHS.includes(focalLength as typeof CAMERA_FOCAL_LENGTHS[number]) ? focalLength : 35
  const existing = shot.camera.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === 'camera.focalLength')
  if (existing) { existing.focalLength = value; existing.ease = ease }
  else shot.camera.keyframes.push({ ...sample, id: id('camera-keyframe', documentIds(next)), property: 'camera.focalLength', frame, focalLength: value, ease })
  shot.camera.keyframes.sort((left, right) => left.frame - right.frame || String(left.property).localeCompare(String(right.property)))
  return next
}

export function resetShotCameraProperty(document: CameraDocument, shotId: string, property: 'camera.focalLength' | 'camera.movement' | 'camera.target', frame: number): CameraDocument {
  const next = clone(document); const shot = next.shots.find((item) => item.id === shotId)
  if (!shot) return document
  shot.camera.keyframes = shot.camera.keyframes.filter((keyframe) => !(keyframe.property === property && keyframe.frame === frame))
  if (property === 'camera.focalLength') return authorCameraFocalLengthKeyframe(next, shotId, frame, 35)
  if (property === 'camera.movement') return authorCameraMovementKeyframe(next, shotId, frame, 'static')
  return authorCameraTargetKeyframe(next, shotId, frame, { mode: 'free' })
}

export function resetCameraSection(document: CameraDocument, shotId: string): CameraDocument {
  const resized = resizeShotFrames(document, shotId, 2 * document.fps)
  if (!resized.ok) return document
  const next = clone(resized.document); const shot = next.shots.find((item) => item.id === shotId)
  if (!shot) return document
  shot.camera.keyframes = shot.camera.keyframes.filter((keyframe) => !['camera.focalLength', 'camera.target', 'camera.movement'].includes(keyframe.property || ''))
  shot.cameraMovement = 'static'
  shot.camera.metadata = { ...(shot.camera.metadata || cameraMetadata(shot.startFrame)), focalLength: 35, target: { mode: 'free' }, movement: 'static' }
  if (shot.camera.activeCameraId) {
    const camera = next.entities.find((entity) => entity.id === shot.camera.activeCameraId && entity.kind === 'camera')
    if (camera?.camera) camera.camera = { ...camera.camera, focalLength: 35, target: { mode: 'free' }, movement: 'static' }
  }
  return next
}

const MOVEMENT_ALIASES: Record<string, string> = {
  'slow-pan-left':'pan-left','whip-pan-left':'pan-left','slow-pan-right':'pan-right','whip-pan-right':'pan-right','slow-tilt-up':'tilt-up','whip-tilt-up':'tilt-up','slow-tilt-down':'tilt-down','whip-tilt-down':'tilt-down','slow-dolly-in':'dolly-in','fast-dolly-in':'dolly-in','slow-dolly-out':'dolly-out','fast-dolly-out':'dolly-out','dolly-down-slow':'dolly-down','snap-push-in':'dolly-in','push-in':'dolly-in','snap-pull-out':'dolly-out','pull-out':'dolly-out','slow-zoom-in':'zoom-in','crash-zoom-in':'zoom-in','slow-zoom-out':'zoom-out','crash-zoom-out':'zoom-out','crab-left':'truck-left','crab-right':'truck-right','dolly-circle-left':'orbit-left','dolly-circle-right':'orbit-right','dolly-arc-left':'arc-left','dolly-arc-right':'arc-right','vertigo-in':'dolly-zoom-in','vertigo-out':'dolly-zoom-out'
}
const MOVEMENT_IDS = ['static','reframe-left','reframe-right','reframe-up','reframe-down','pan-left','pan-right','tilt-up','tilt-down','dolly-in','dolly-out','dolly-left','dolly-right','dolly-up','dolly-down','dolly-forward-left','dolly-forward-right','dolly-back-left','dolly-back-right','dolly-follow','dolly-lead','dolly-parallel','dolly-pass-by','dolly-reveal','dolly-zoom-in','dolly-zoom-out','truck-left','truck-right','track-forward','track-backward','zoom-in','zoom-out','pedestal-up','pedestal-down','boom-up','boom-down','crane-up','crane-down','crane-forward','crane-backward','crane-swoop-in','crane-swoop-out','jib-up','jib-down','jib-left','jib-right','jib-arc-left','jib-arc-right','orbit-left','orbit-right','half-orbit-left','half-orbit-right','full-orbit-left','full-orbit-right','arc-left','arc-right','spiral-in','spiral-out','roll-clockwise','roll-counterclockwise','dutch-left','dutch-right','tracking','follow','lead','parallel-track','side-follow-left','side-follow-right','over-shoulder-follow','point-of-view','walk-and-talk','vehicle-mount','chase','handheld','handheld-subtle','handheld-intense','shoulder-rig','steadicam','steadicam-follow','gimbal-follow','gimbal-orbit','slider-left','slider-right','drone-forward','drone-backward','drone-left','drone-right','drone-rise','drone-descend','drone-orbit-left','drone-orbit-right','drone-reveal','drone-flyover','drone-dive','drone-pull-away','top-down-forward','top-down-orbit'] as const
const MOVEMENT_SET = new Set<string>(MOVEMENT_IDS)
export function normalizeCameraMovement(value: unknown): string { if (typeof value !== 'string' || /^(rack-focus-|focus-pull$|deep-to-shallow-focus$|shallow-to-deep-focus$|lens-breathing$|parallax-)/.test(value)) return 'static'; const normalized=MOVEMENT_ALIASES[value]||value; return MOVEMENT_SET.has(normalized)?normalized:'static' }
const movementLabel=(value:string)=>value==='chase'?'Chase Follow':value==='static'?'Static / Locked':value.split('-').map(word=>word==='pov'?'POV':word[0].toUpperCase()+word.slice(1)).join(' ')
export function cameraMovementOptions(){return MOVEMENT_IDS.map(id=>({id,label:movementLabel(id)}))}
export function authorCameraMovementKeyframe(document: CameraDocument, shotId: string, frame: number, movement: string, ease: Ease='linear'): CameraDocument { const next=clone(document),shot=next.shots.find(item=>item.id===shotId);if(!shot)return document;const sample=cameraAt(shot,frame),canonical=normalizeCameraMovement(movement),existing=shot.camera.keyframes.find(key=>key.frame===frame&&key.property==='camera.movement');if(existing){existing.movement=canonical;existing.ease=ease}else shot.camera.keyframes.push({...sample,id:id('camera-keyframe',documentIds(next)),property:'camera.movement',frame,movement:canonical,ease});shot.camera.keyframes.sort((a,b)=>a.frame-b.frame||String(a.property).localeCompare(String(b.property)));return next }

function movementSeed(documentId: string, shotId: string, cameraId: string, frame: number) {
  let hash = 2166136261
  for (const character of `${documentId}|${shotId}|${cameraId}|${frame}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  return ((hash >>> 0) / 0xffffffff) * 2 - 1
}
const movementTargetPosition = (target: TargetMode, entities: EvaluatedEntity[], fallback: Vec3): Vec3 => target.mode === 'point' ? clone(target.position) : target.mode === 'object' || target.mode === 'locked' ? clone(entities.find((entity) => entity.id === target.entityId)?.transform.position || target.lastPosition || fallback) : clone(fallback)
function applyCameraMovement(document: CameraDocument, shot: Shot, entity: EvaluatedEntity, camera: CameraKeyframe, frame: number): EvaluatedEntity {
  const next = clone(entity)
  if (!next.camera) return next
  const movement = normalizeCameraMovement(camera.movement || next.camera.movement)
  next.camera.movement = movement
  const movementKeys = shot.camera.keyframes.filter((keyframe) => keyframe.property === 'camera.movement').sort((a, b) => a.frame - b.frame)
  const owning = movementKeys.filter((keyframe) => keyframe.frame <= frame).at(-1)
  const segmentStart = owning?.frame ?? shot.startFrame
  const geometryFrames = shot.camera.keyframes.filter((keyframe) => keyframe.property !== 'camera.target' && keyframe.property !== 'camera.movement' && keyframe.frame > segmentStart).map((keyframe) => keyframe.frame)
  const segmentEnd = geometryFrames.length ? Math.min(...geometryFrames, shot.endFrame) : Number.NaN
  if (!Number.isFinite(segmentEnd) || segmentEnd <= segmentStart || frame <= segmentStart || movement === 'static') return next
  const progress = Math.max(0, Math.min(1, (frame - segmentStart) / (segmentEnd - segmentStart)))
  const eased = easeValue(owning?.ease || camera.ease, progress)
  const transform = clone(next.transform)
  const target = movementTargetPosition(camera.target, document.entities as EvaluatedEntity[], [transform.position[0], transform.position[1], transform.position[2] - 4])
  const toward = new THREE.Vector3(...target).sub(new THREE.Vector3(...transform.position)); if (toward.lengthSq() < 1e-12) toward.set(0, 0, -1); toward.normalize()
  const right = new THREE.Vector3().crossVectors(toward, new THREE.Vector3(0, 1, 0)); if (right.lengthSq() < 1e-12) right.set(1, 0, 0); right.normalize()
  const up = new THREE.Vector3().crossVectors(right, toward).normalize()
  const translate = (vector: THREE.Vector3, amount = 4) => { transform.position = new THREE.Vector3(...transform.position).addScaledVector(vector, amount * eased).toArray() as Vec3 }
  const signed = movement.endsWith('left') || movement.includes('counterclockwise') ? -1 : 1
  if (/^(pan-|reframe-)/.test(movement)) transform.rotation[1] += signed * 45 * eased
  else if (/^tilt-/.test(movement)) transform.rotation[0] += (movement.endsWith('up') ? -1 : 1) * 35 * eased
  else if (/^(roll-|dutch-)/.test(movement)) transform.rotation[2] += signed * 35 * eased
  else if (/^(zoom-)/.test(movement)) next.camera.focalLength = Math.max(1, next.camera.focalLength * (movement.endsWith('in') ? 1 + eased : 1 / (1 + eased)))
  else if (/^(orbit-|half-orbit-|full-orbit-|arc-|spiral-|gimbal-orbit|drone-orbit-)/.test(movement)) {
    const revolutions = movement.startsWith('full-') ? 2 : movement.startsWith('half-') ? 1 : .5
    const angle = signed * Math.PI * revolutions * eased; const relative = new THREE.Vector3(...transform.position).sub(new THREE.Vector3(...target)); if (relative.lengthSq() < 1e-12) relative.set(0, 0, 4)
    transform.position = relative.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(new THREE.Vector3(...target)).toArray() as Vec3
  } else if (/^(dolly-zoom-)/.test(movement)) { translate(toward, movement.endsWith('in') ? 3 : -3); next.camera.focalLength = Math.max(1, next.camera.focalLength * (movement.endsWith('in') ? 1 + eased : 1 / (1 + eased))) }
  else if (movement.includes('left') || movement.includes('right')) translate(right, signed * 4)
  else if (movement.includes('up') || movement.includes('rise')) translate(up, 4)
  else if (movement.includes('down') || movement.includes('descend') || movement.includes('dive')) translate(up, -4)
  else if (movement.includes('out') || movement.includes('backward') || movement.includes('pull-away') || movement === 'lead') translate(toward, -4)
  else if (movement !== 'static') translate(toward, 4)
  if (/^(tracking|follow|lead|parallel-track|side-follow-|over-shoulder-follow|walk-and-talk|vehicle-mount|chase|dolly-follow|dolly-lead|dolly-parallel|steadicam-follow|gimbal-follow)/.test(movement) && camera.target.mode === 'free') return next
  if (/^handheld/.test(movement) || movement === 'shoulder-rig') {
    const intensity = movement === 'handheld-subtle' ? .15 : movement === 'handheld-intense' ? .65 : movement === 'shoulder-rig' ? .22 : .35
    const frequency = movement === 'handheld-subtle' ? 1 : movement === 'handheld-intense' ? 3 : 2
    transform.rotation = transform.rotation.map((value, axis) => value + movementSeed(document.id, shot.id, entity.id, frame * frequency + axis) * intensity) as Vec3
  }
  next.transform = { ...transform, position: transform.position.map((value) => Number.isFinite(value) ? value : 0) as Vec3, rotation: transform.rotation.map((value) => Number.isFinite(value) ? value : 0) as Vec3 }
  return next
}

function orderedCameras(entities: SceneEntity[]): SceneEntity[] { return entities.filter((entity) => entity.kind === 'camera') }
export function evaluateCameraPath(entities: SceneEntity[], progress: number) {
  const cameras = orderedCameras(entities)
  const cameraIds = cameras.map((camera) => camera.id)
  if (!cameras.length) return { cameraIds, position: [0, 1, 0] as Vec3, tangent: [0, 0, -1] as Vec3, segmentIndex: 0, localProgress: 0 }
  if (cameras.length === 1) return { cameraIds, position: clone(cameras[0].transform.position), tangent: [0, 0, -1] as Vec3, segmentIndex: 0, localProgress: 0 }
  const clamped = Math.max(0, Math.min(1, progress))
  const scaled = clamped * (cameras.length - 1)
  const segmentIndex = Math.min(cameras.length - 2, Math.floor(scaled))
  const rawLocal = clamped === 1 ? 1 : scaled - segmentIndex
  const localProgress = easeValue(cameras[segmentIndex].camera?.ease || 'linear', rawLocal)
  const curveProgress = (segmentIndex + localProgress) / (cameras.length - 1)
  const curve = new THREE.CatmullRomCurve3(cameras.map((camera) => new THREE.Vector3(...camera.transform.position)), false, 'centripetal')
  const point = curve.getPoint(curveProgress)
  const tangent = curve.getTangent(curveProgress)
  return { cameraIds, position: point.toArray() as Vec3, tangent: tangent.toArray() as Vec3, segmentIndex, localProgress }
}

export function evaluateFrame(document: CameraDocument, absoluteFrame: number): EvaluatedFrame {
  const shot = document.shots.find((s) => absoluteFrame >= s.startFrame && absoluteFrame < s.endFrame) || document.shots[document.shots.length - 1]
  let evaluatedEntities: EvaluatedEntity[] = document.entities.map((entity) => { const evaluated = entityAt(entity, absoluteFrame); return { id: entity.id, name: entity.name, kind: entity.kind, color: entity.color, dimensions: evaluated.dimensions, camera: clone(entity.camera), transform: evaluated.transform } })
  if (!shot) return { absoluteFrame, shotId: '', entities: evaluatedEntities, objects: (document.objects || []).map((object) => evaluateStructuredObject(object, absoluteFrame)), camera: cameraKeyframe(absoluteFrame, [0, 1, 0]) }
  const camera = cameraAt(shot, absoluteFrame)
  const activeId = shot.camera.activeCameraId || evaluatedEntities.find(entity => entity.kind === 'camera')?.id
  evaluatedEntities = evaluatedEntities.map(entity => entity.id === activeId && entity.kind === 'camera' ? applyCameraMovement(document, shot, entity, camera, absoluteFrame) : entity)
  const cameras = orderedCameras(document.entities)
  if (cameras.length > 1) {
    const sequenceEnd = Math.max(1, (document.shots.at(-1)?.endFrame || 1) - 1)
    const path = evaluateCameraPath(document.entities, absoluteFrame / sequenceEnd)
    camera.transform.position = path.position
    camera.transform.rotation = resolvedCameraRotation(cameras[Math.min(path.segmentIndex, cameras.length - 1)], document.entities)
  }
  return { absoluteFrame, shotId: shot.id, entities: evaluatedEntities, objects: (document.objects || []).map((object) => evaluateStructuredObject(object, absoluteFrame)), camera }
}
export function cleanFrameDescription(document: CameraDocument, frame: number) { return { frame: evaluateFrame(document, frame), clean: true as const } }
export function snapFrame(value: number): number { return Math.floor(value + .5) }
export function frameForSeconds(seconds: number, fps: number): number { return snapFrame(seconds * fps) }
export function validateKeyframeInsertion(existing: number[], candidate: number) { const frame = snapFrame(candidate); return existing.includes(frame) ? { ok: false as const, frame, code: 'KEYFRAME_FRAME_CONFLICT' as const } : { ok: true as const, frame } }
export function selectedShotRange(document: CameraDocument, shotId: string) { const shot = document.shots.find((s) => s.id === shotId); if (!shot) throw new Error('SHOT_NOT_FOUND'); return { start: shot.startFrame, end: shot.endFrame } }
export function shotDurationFrames(document: CameraDocument, shotId: string): number { const shot = document.shots.find((item) => item.id === shotId); return shot ? Math.max(1, shot.endFrame - shot.startFrame) : 0 }
export function cameraFov(focalLength: number, aspect: CameraDocument['aspect'], near: number, far: number) { const [w, h] = aspect.split(':').map(Number); const horizontal = 2 * Math.atan(36 / (2 * focalLength)); const vertical = 2 * Math.atan((36 * h / w) / (2 * focalLength)); return { horizontalDegrees: horizontal * 180 / Math.PI, verticalDegrees: vertical * 180 / Math.PI, near, far } }
function cameraAimPosition(camera: SceneEntity, entities: SceneEntity[]): Vec3 {
  const target = camera.camera?.target
  if (target?.mode === 'locked' || target?.mode === 'object') return [...(entities.find((entity) => entity.id === target.entityId)?.transform.position || target.lastPosition || [0, 1, 0])] as Vec3
  if (target?.mode === 'point') return clone(target.position)
  const origin = new THREE.Vector3(...camera.transform.position)
  return origin.add(new THREE.Vector3(0, 0, -4).applyEuler(new THREE.Euler(...camera.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ'))).toArray() as Vec3
}
export function setCameraAimMode(camera: SceneEntity, mode: 'free' | 'point' | 'object' | 'locked', entities: SceneEntity[]): SceneEntity {
  const next = clone(camera); if (!next.camera) return next
  const position = cameraAimPosition(camera, entities)
  if (mode === 'free') next.camera.target = { mode: 'free' }
  else if (mode === 'point') next.camera.target = { mode: 'point', position }
  else {
    const target = entities.find((entity) => entity.id !== camera.id && sceneTargetKinds.includes(entity.kind as typeof sceneTargetKinds[number]))
    if (target) next.camera.target = { mode: 'object', entityId: target.id, lastPosition: position }
  }
  return next
}
export function setCameraPointTarget(camera: SceneEntity, position: Vec3): SceneEntity { const next = clone(camera); if (next.camera) next.camera.target = { mode: 'point', position: finiteVec3(position) ? clone(position) : cameraAimPosition(camera, []) }; return next }
export function setCameraLockTarget(camera: SceneEntity, entityId: string, entities: SceneEntity[]): SceneEntity {
  const next = clone(camera); if (!next.camera) return next
  const target = entities.find((entity) => entity.id === entityId && sceneTargetKinds.includes(entity.kind as typeof sceneTargetKinds[number]))
  if (target) {
    next.camera.target = { mode: 'object', entityId, lastPosition: [...target.transform.position] as Vec3 }
    next.transform.rotation = resolvedCameraRotation(next, entities)
  }
  return next
}
export function resetCameraTarget(document: CameraDocument, entityId: string): CameraDocument {
  const next = clone(document); const camera = next.entities.find((entity) => entity.id === entityId && entity.kind === 'camera')
  if (camera?.camera) camera.camera.target = { mode: 'free' }
  return next
}
export function setKeyframeTarget(document: CameraDocument, shotId: string, keyframeId: string, target: TargetMode): CameraDocument { const next = clone(document); const keyframe = next.shots.find((s) => s.id === shotId)?.camera.keyframes.find((k) => k.id === keyframeId); if (keyframe) keyframe.target = clone(target); return next }
export function deleteTargetLock(document: CameraDocument, shotId: string, keyframeId: string): CameraDocument { return setKeyframeTarget(document, shotId, keyframeId, { mode: 'free' }) }
export function normalizeHex(input: string): string { const value = input.trim().toLowerCase(); const withHash = value.startsWith('#') ? value : `#${value}`; if (/^#[0-9a-f]{3}$/.test(withHash)) return `#${withHash.slice(1).split('').map((c) => c + c).join('')}`; if (!/^#[0-9a-f]{6}$/.test(withHash)) throw new Error('INVALID_HEX_COLOR'); return withHash }
function overlaps(a: SceneEntity, b: SceneEntity, transformA = a.transform, dimensionsA = a.dimensions): boolean { return [0, 1, 2].every((axis) => Math.abs(transformA.position[axis] - b.transform.position[axis]) < (dimensionsA[axis] * transformA.scale[axis] + b.dimensions[axis] * b.transform.scale[axis]) / 2) }

function commitEntityKeyframe(entity: SceneEntity, frame: number, reserved: ReadonlySet<string> = new Set()) {
  const existing = entity.keyframes.find((keyframe) => keyframe.frame === frame)
  if (existing) { existing.id ||= id('entity-keyframe', reserved); existing.transform = clone(entity.transform) }
  else entity.keyframes.push({ id: id('entity-keyframe', reserved), frame, transform: clone(entity.transform), ease: entity.camera?.ease || 'linear' })
  entity.keyframes.sort((a, b) => a.frame - b.frame)
  if (entity.camera) entity.camera.frame = frame
}
export function authorEntityKeyframe(document: CameraDocument, entityId: string, frame: number, property?: KeyframeProperty): CameraDocument {
  const next = clone(document)
  const entity = next.entities.find((item) => item.id === entityId)
  if (!entity) return document
  if (property) {
    if (!keyframePropertyAllowed(entity.kind, property)) return document
    const existing = entity.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === property)
    if (existing) { existing.transform = clone(entity.transform); existing.dimensions = clone(entity.dimensions); existing.entityId = entityId }
    else entity.keyframes.push({ id: id('entity-keyframe', documentIds(next)), entityId, property, frame, transform: clone(entity.transform), dimensions: clone(entity.dimensions), ease: entity.camera?.ease || 'linear' })
    entity.keyframes.sort((a, b) => a.frame - b.frame || String(a.property).localeCompare(String(b.property)))
  } else commitEntityKeyframe(entity, frame, documentIds(next))
  delete entity.baseFrame
  return next
}

export function toggleEntityPropertyKeyframe(document: CameraDocument, entityId: string, property: KeyframeProperty, frame: number): { document: CameraDocument; keyframeId?: string; action: 'added' | 'removed' } {
  const entity = document.entities.find((item) => item.id === entityId)
  if (!entity) return { document, action: 'removed' }
  if (!keyframePropertyAllowed(entity.kind, property)) return { document, action: 'removed' }
  const existing = entity.keyframes.find((keyframe) => keyframe.frame === frame && keyframe.property === property)
  if (existing) {
    const next = clone(document)
    const target = next.entities.find((item) => item.id === entityId)!
    target.keyframes = target.keyframes.filter((keyframe) => !(keyframe.frame === frame && keyframe.property === property))
    return { document: next, keyframeId: existing.id, action: 'removed' }
  }
  const next = authorEntityKeyframe(document, entityId, frame, property)
  const keyframe = next.entities.find((item) => item.id === entityId)?.keyframes.find((item) => item.frame === frame && item.property === property)
  return { document: next, keyframeId: keyframe?.id, action: 'added' }
}

export function setEntityPropertyKeyframeEase(document: CameraDocument, entityId: string, keyframeId: string, ease: Ease): CameraDocument {
  const next = clone(document)
  const keyframe = next.entities.find((entity) => entity.id === entityId)?.keyframes.find((item) => item.id === keyframeId)
  if (keyframe) keyframe.ease = ease
  return next
}
export function resetEntityTransform(document: CameraDocument, entityId: string): CameraDocument {
  const entity = document.entities.find((item) => item.id === entityId)
  if (!entity) return document
  const next = clone(document); const target = next.entities.find((item) => item.id === entityId)!
  target.transform = { ...target.transform, position: [0, 0, 0], rotation: [0, 0, 0], scale: clone(target.transform.scale), anchor: transformAnchor(target.transform) }
  return next
}
export function resetEntityRotation(document: CameraDocument, entityId: string): CameraDocument {
  const entity = document.entities.find((item) => item.id === entityId)
  if (!entity) return document
  const next = clone(document); const target = next.entities.find((item) => item.id === entityId)!
  const linked = target.kind === 'camera' && target.camera?.target.mode !== 'free'
  const resolved = linked ? resolvedCameraRotation(target, next.entities) : [0, 0, 0] as Vec3
  target.transform = { ...target.transform, rotation: [normalizeRotationDegrees(resolved[0]), normalizeRotationDegrees(resolved[1]), 0] }
  syncCameraShot(next, target)
  return next
}

export function previewCameraDocument(document: CameraDocument, cameraId: string, preview: { position?: Vec3; rotation?: Vec3; focalLength?: number; target?: TargetMode }): CameraDocument {
  const next = clone(document)
  const camera = next.entities.find((entity) => entity.id === cameraId && entity.kind === 'camera')
  if (!camera?.camera) return document
  if (preview.position) camera.transform.position = clone(preview.position)
  if (preview.rotation) camera.transform.rotation = clone(preview.rotation)
  if (Number.isFinite(preview.focalLength)) camera.camera.focalLength = Math.max(1, preview.focalLength!)
  if (preview.target) camera.camera.target = clone(preview.target)
  for (const shot of next.shots.filter((item) => item.camera.activeCameraId === cameraId)) {
    shot.camera.transform = clone(camera.transform)
    shot.camera.metadata = clone(camera.camera)
  }
  return next
}

function syncCameraShot(next: CameraDocument, entity: SceneEntity) {
  if (entity.kind !== 'camera') return
  for (const shot of next.shots.filter((item) => item.camera.activeCameraId === entity.id)) {
    shot.camera.transform = clone(entity.transform)
    shot.camera.dimensions = clone(entity.dimensions)
    shot.camera.metadata = clone(entity.camera || cameraMetadata(shot.startFrame))
    shot.camera.keyframes = shot.camera.keyframes.map((keyframe) => { const copy = clone(keyframe); copy.transform = clone(entity.transform); return copy })
  }
}

export function applyTransformCommit(document: CameraDocument, entityId: string, authored: Transform, aids: { gridSnap: boolean; collision: boolean; groundSnap: boolean; optionBypass: boolean; explicitAxis?: 'X' | 'Y' | 'Z' | 'XYZ' | null; frame?: number }): { ok: boolean; code?: string; document: CameraDocument } {
  const next = clone(document); const entity = next.entities.find((item) => item.id === entityId)
  if (!entity) return { ok: false, code: 'ENTITY_NOT_FOUND', document }
  const proposed = clone(authored)
  const positionChanged = proposed.position.some((value, axis) => value !== entity.transform.position[axis])
  const rotationChanged = proposed.rotation.some((value, axis) => value !== entity.transform.rotation[axis])
  const nonRotationTransformChanged = positionChanged || proposed.scale.some((value, axis) => value !== entity.transform.scale[axis]) || transformAnchor(proposed).some((value, axis) => value !== transformAnchor(entity.transform)[axis])
  const locks = effectiveEntityLocks(entity)
  if (locks.transform && nonRotationTransformChanged || locks.rotation && rotationChanged) return { ok: false, code: locks.rotation && rotationChanged ? 'ROTATION_LOCKED' : 'TRANSFORM_LOCKED', document }
  const scaleChanged = proposed.scale.some((value, axis) => value !== entity.transform.scale[axis])
  if (entity.resizeLocked && ['block', 'sphere', 'column'].includes(entity.kind) && scaleChanged) return { ok: false, code: 'RESIZE_LOCKED', document }
  proposed.anchor = transformAnchor(proposed)
  if (entity.kind === 'camera') proposed.scale = [1, 1, 1]
  if (aids.gridSnap && !aids.optionBypass) {
    proposed.position = proposed.position.map((value) => Math.round(value / .25) * .25) as Vec3
    proposed.rotation = proposed.rotation.map((value) => Math.round(value / 15) * 15) as Vec3
    proposed.scale = proposed.scale.map((value) => Math.max(.25, Math.round(value / .25) * .25)) as Vec3
  }
  if (aids.groundSnap && !aids.optionBypass && !entity.allowBelowCanvas) Object.assign(proposed, snapTransformToCanvas(entity, proposed))
  if (aids.collision && next.entities.some((other) => other.id !== entity.id && overlaps(entity, other, proposed))) return { ok: false, code: 'COLLISION_PREVENTED', document }
  proposed.rotation = proposed.rotation.map(normalizeRotationDegrees) as Vec3
  if (entity.kind === 'camera' && entity.camera?.target.mode !== 'free') {
    const resolved = resolvedCameraRotation({ ...entity, transform: proposed }, next.entities)
    proposed.rotation[0] = normalizeRotationDegrees(resolved[0])
    proposed.rotation[1] = normalizeRotationDegrees(resolved[1])
  }
  entity.transform = proposed
  entity.baseFrame = aids.frame ?? entity.camera?.frame ?? 0
  syncCameraShot(next, entity)

  return { ok: true, document: next }
}

const rotateLocalDelta = (delta: Vec3, rotation: Vec3): Vec3 => {
  const vector = new THREE.Vector3(...delta)
  const euler = new THREE.Euler(...rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
  vector.applyEuler(euler)
  return vector.toArray() as Vec3
}
export function applyDimensionResize(document: CameraDocument, entityId: string, input: { axes: Vec3; delta: Vec3; gridSnap: boolean; optionBypass: boolean; frame: number; collision?: boolean }): { ok: boolean; code?: string; document: CameraDocument } {
  const next = clone(document); const entity = next.entities.find((item) => item.id === entityId)
  if (!entity || entity.kind !== 'block') return { ok: false, code: 'BLOCK_NOT_FOUND', document }
  if (entity.resizeLocked) return { ok: false, code: 'RESIZE_LOCKED', document }
  const dimensions = [...entity.dimensions] as Vec3
  const localCenterShift: Vec3 = [0, 0, 0]
  for (let axis = 0; axis < 3; axis += 1) {
    if (!input.axes[axis]) continue
    let signedDelta = input.delta[axis] * input.axes[axis]
    if (input.gridSnap && !input.optionBypass) signedDelta = Math.round(signedDelta / .25) * .25
    const accepted = Math.max(.25, dimensions[axis] + signedDelta)
    const acceptedDelta = accepted - dimensions[axis]
    dimensions[axis] = accepted
    localCenterShift[axis] = acceptedDelta * Math.sign(input.axes[axis]) / 2
  }
  const shift = rotateLocalDelta(localCenterShift, entity.transform.rotation)
  const proposed = clone(entity.transform)
  proposed.position = proposed.position.map((value, axis) => value + shift[axis]) as Vec3
  if (input.collision && next.entities.some((other) => other.id !== entity.id && overlaps(entity, other, proposed, dimensions))) return { ok: false, code: 'COLLISION_PREVENTED', document }
  entity.dimensions = dimensions
  entity.transform = proposed
  entity.baseFrame = input.frame
  return { ok: true, document: next }
}
export function applySphereRadiusResize(document: CameraDocument, entityId: string, input: { delta: number; gridSnap: boolean; optionBypass: boolean; frame: number; collision?: boolean }): { ok: boolean; code?: string; document: CameraDocument } {
  const next = clone(document); const entity = next.entities.find((item) => item.id === entityId)
  if (!entity || entity.kind !== 'sphere') return { ok: false, code: 'SPHERE_NOT_FOUND', document }
  if (entity.resizeLocked) return { ok: false, code: 'RESIZE_LOCKED', document }
  const oldRadius = entity.dimensions[0] / 2
  let radius = oldRadius + input.delta
  if (input.gridSnap && !input.optionBypass) radius = Math.round(radius / .25) * .25
  radius = Math.max(.25, radius)
  const dimensions: Vec3 = [radius * 2, radius * 2, radius * 2]
  if (input.collision && next.entities.some((other) => other.id !== entity.id && overlaps(entity, other, entity.transform, dimensions))) return { ok: false, code: 'COLLISION_PREVENTED', document }
  entity.dimensions = dimensions
  return { ok: true, document: next }
}

export function toggleEntityResizeLock(document: CameraDocument, entityId: string): CameraDocument {
  const next = clone(document)
  const entity = next.entities.find((item) => item.id === entityId)
  if (!entity || !['block', 'sphere', 'column'].includes(entity.kind)) return document
  entity.resizeLocked = !entity.resizeLocked
  return next
}

export function applyColumnResize(document: CameraDocument, entityId: string, input: { target: 'radius' | 'height'; delta: number; direction: 1 | -1; gridSnap: boolean; optionBypass: boolean; frame: number; collision?: boolean }): { ok: boolean; code?: string; document: CameraDocument } {
  const next = clone(document); const entity = next.entities.find((item) => item.id === entityId)
  if (!entity || entity.kind !== 'column') return { ok: false, code: 'COLUMN_NOT_FOUND', document }
  if (entity.resizeLocked) return { ok: false, code: 'RESIZE_LOCKED', document }
  let delta = input.delta
  if (input.gridSnap && !input.optionBypass) delta = Math.round(delta / .25) * .25
  const dimensions = [...entity.dimensions] as Vec3
  const proposed = clone(entity.transform)
  if (input.target === 'radius') {
    const radius = Math.max(.25, dimensions[0] / 2 + delta)
    dimensions[0] = dimensions[2] = radius * 2
  } else {
    const accepted = Math.max(.25, dimensions[1] + delta)
    const acceptedDelta = accepted - dimensions[1]
    dimensions[1] = accepted
    const shift = rotateLocalDelta([0, acceptedDelta * input.direction / 2, 0], entity.transform.rotation)
    proposed.position = proposed.position.map((value, axis) => value + shift[axis]) as Vec3
  }
  if (input.collision && next.entities.some((other) => other.id !== entity.id && overlaps(entity, other, proposed, dimensions))) return { ok: false, code: 'COLLISION_PREVENTED', document }
  entity.dimensions = dimensions; entity.transform = proposed; entity.baseFrame = input.frame
  return { ok: true, document: next }
}

export function cameraIdentityRows(document: CameraDocument) {
  const cameras = orderedCameras(document.entities)
  const shot = document.shots[0]
  return cameras.map((entity, order) => ({
    id: entity.id,
    order,
    index: String(order + 1).padStart(2, '0'),
    label: entity.name,
    shot: shot?.name || 'Shot',
    shotSize: shot?.shotSize || 'wide',
    focal: `${entity.camera?.focalLength || 50}mm`,
    outgoing: order === cameras.length - 1 ? 'End' : entity.camera?.ease || 'linear',
  }))
}
export function reorderCameraEntity(document: CameraDocument, cameraId: string, beforeCameraId: string | null): CameraDocument {
  const next = clone(document)
  const cameras = next.entities.filter((entity) => entity.kind === 'camera')
  const moving = cameras.find((entity) => entity.id === cameraId)
  if (!moving) return document
  const reordered = cameras.filter((entity) => entity.id !== cameraId)
  const index = beforeCameraId ? reordered.findIndex((entity) => entity.id === beforeCameraId) : reordered.length
  reordered.splice(index < 0 ? reordered.length : index, 0, moving)
  const queue = [...reordered]
  next.entities = next.entities.map((entity) => entity.kind === 'camera' ? queue.shift()! : entity)
  const cameraIds = new Set(reordered.map((entity) => entity.id))
  for (const shot of next.shots) {
    const queueIds = reordered.map((entity) => entity.id)
    shot.entityOrder = shot.entityOrder.map((entityId) => cameraIds.has(entityId) ? queueIds.shift()! : entityId)
  }
  return next
}

export function reorderShots(document: CameraDocument, shotId: string, beforeShotId: string | null): CameraDocument {
  const next = clone(document)
  const from = next.shots.findIndex((shot) => shot.id === shotId)
  if (from < 0) return document
  const [moving] = next.shots.splice(from, 1)
  const target = beforeShotId ? next.shots.findIndex((shot) => shot.id === beforeShotId) : next.shots.length
  next.shots.splice(target < 0 ? next.shots.length : target, 0, moving)
  let cursor = 0
  for (const shot of next.shots) {
    const priorStart = shot.startFrame
    const frames = Math.max(1, shot.endFrame - shot.startFrame)
    const delta = cursor - priorStart
    shot.startFrame = cursor
    shot.endFrame = cursor + frames
    shot.duration = frames / next.fps
    for (const keyframe of shot.camera.keyframes) keyframe.frame += delta
    cursor = shot.endFrame
  }
  return next
}

export type ResizeShotResult = { ok: true; document: CameraDocument } | { ok: false; document: CameraDocument; overflow: { count: number; minFrame: number; maxFrame: number } }
export function resizeShotSeconds(document: CameraDocument, shotId: string, seconds: number): CameraDocument {
  const snapped = Math.max(.5, Math.round(seconds / .5) * .5)
  const result = resizeShotFrames(document, shotId, Math.round(snapped * document.fps))
  return result.ok ? result.document : document
}
export function setAllowBelowCanvas(document: CameraDocument, target: { type: 'entity' | 'object' | 'shot-camera'; id: string }, allowed: boolean): CameraDocument {
  const next = clone(document)
  if (target.type === 'entity') { const entity = next.entities.find((item) => item.id === target.id); if (entity) entity.allowBelowCanvas = allowed }
  else if (target.type === 'object') { const object = next.objects?.find((item) => item.id === target.id); if (object) object.allowBelowCanvas = allowed }
  else { const shot = next.shots.find((item) => item.id === target.id); if (shot) shot.camera.allowBelowCanvas = allowed }
  return next
}
export function resizeShotFrames(document: CameraDocument, shotId: string, frames: number): ResizeShotResult {
  const shot = document.shots.find((item) => item.id === shotId)
  if (!shot) return { ok: true, document }
  const acceptedFrames = Math.max(1, Math.round(frames))
  const oldEnd = shot.endFrame
  const proposedEnd = shot.startFrame + acceptedFrames
  if (proposedEnd < oldEnd) {
    const owned = [
      ...document.entities.flatMap((entity) => entity.keyframes.map((keyframe) => keyframe.frame)),
      ...shot.camera.keyframes.map((keyframe) => keyframe.frame),
    ].filter((frame) => frame > proposedEnd && frame < oldEnd)
    if (owned.length) return { ok: false, document, overflow: { count: owned.length, minFrame: Math.min(...owned), maxFrame: Math.max(...owned) } }
  }
  const next = clone(document)
  const index = next.shots.findIndex((item) => item.id === shotId)
  const delta = proposedEnd - oldEnd
  next.shots[index].endFrame = proposedEnd
  next.shots[index].duration = acceptedFrames / next.fps
  for (let at = index + 1; at < next.shots.length; at += 1) {
    next.shots[at].startFrame += delta
    next.shots[at].endFrame += delta
    for (const keyframe of next.shots[at].camera.keyframes) keyframe.frame += delta
  }
  for (const entity of next.entities) for (const keyframe of entity.keyframes) if (keyframe.frame >= oldEnd) keyframe.frame += delta
  return { ok: true, document: next }
}

export function copySceneEntities(document: CameraDocument, entityIds: string[], groupId?: string): { document: CameraDocument; clipboard: SceneClipboard } {
  const selected = new Set(entityIds)
  const group = groupId
    ? document.groups.find((item) => item.id === groupId && item.childIds.every((entityId) => selected.has(entityId)))
    : document.groups.find((item) => item.childIds.length === selected.size && item.childIds.every((entityId) => selected.has(entityId)))
  return { document, clipboard: { type: 'prism-camera-scene-entities', entities: clone(document.entities.filter((entity) => selected.has(entity.id))), ...(group ? { group: clone(group) } : {}) } }
}
export function cutSceneEntities(document: CameraDocument, entityIds: string[]): { document: CameraDocument; clipboard: SceneClipboard } {
  const copied = copySceneEntities(document, entityIds)
  return { clipboard: copied.clipboard, document: deleteEntities(document, entityIds) }
}
export function pasteSceneEntities(document: CameraDocument, clipboard: SceneClipboard, offset: Vec3 = [1, 0, 1]): { document: CameraDocument; entityIds: string[]; groupId?: string } {
  if (clipboard.type !== 'prism-camera-scene-entities') return { document, entityIds: [] }
  const next = clone(document)
  const reserved = documentIds(next)
  const sourceToFresh = new Map<string, string>()
  const entities = clipboard.entities.map((source) => {
    const entity = clone(source)
    const freshId = id('entity', reserved); reserved.add(freshId); sourceToFresh.set(source.id, freshId); entity.id = freshId
    entity.transform.position = entity.transform.position.map((value, axis) => value + offset[axis]) as Vec3
    if (entity.kind === 'camera') entity.transform.scale = [1, 1, 1]
    entity.keyframes = entity.keyframes.map((sourceKeyframe) => {
      const keyframe = clone(sourceKeyframe)
      keyframe.id = id('entity-keyframe', reserved); reserved.add(keyframe.id)
      keyframe.transform.position = keyframe.transform.position.map((value, axis) => value + offset[axis]) as Vec3
      if (entity.kind === 'camera') keyframe.transform.scale = [1, 1, 1]
      return keyframe
    })
    return entity
  })
  for (const entity of entities) {
    if (entity.camera?.target.mode === 'locked' || entity.camera?.target.mode === 'object') {
      const replacement = sourceToFresh.get(entity.camera.target.entityId)
      entity.camera.target = replacement ? { ...entity.camera.target, entityId: replacement } : { mode: 'free' }
    }
    next.entities.push(entity)
    if (entity.kind !== 'camera') for (const shot of next.shots) {
      shot.entityOrder.push(entity.id)
      shot.entityStarts[entity.id] = { mode: shot.startFrame === 0 ? 'independent' : 'inherited', label: shot.startFrame === 0 ? 'Independent Start' : `Inherited from ${previousShotName(next, shot.id)}` }
    }
  }
  for (const camera of entities.filter((entity) => entity.kind === 'camera')) {
    const start = next.shots.at(-1)?.endFrame || 0
    const end = start + 48
    const reservedForShot = documentIds(next)
    const first = { ...cameraKeyframe(start, camera.transform.position, reservedForShot), transform: clone(camera.transform) }
    reservedForShot.add(first.id)
    const last = { ...cameraKeyframe(end, camera.transform.position, reservedForShot), transform: clone(camera.transform) }
    camera.keyframes = [clone(first)]
    camera.camera = { ...cameraMetadata(start), ...camera.camera, frame: start }
    const shot: Shot = { id: id('shot', reservedForShot), name: `Shot ${String(next.shots.length + 1).padStart(2, '0')}`, startFrame: start, endFrame: end, boundary: 'continue', clipColor: 'clear', entityOrder: next.entities.filter((item) => item.kind !== 'camera').map((item) => item.id), entityStarts: {}, shotSize: 'wide', duration: 48 / next.fps, cameraMovement: 'static', camera: { name: camera.name, activeCameraId: camera.id, keyframes: [first, last], transform: clone(camera.transform), dimensions: clone(camera.dimensions), metadata: clone(camera.camera), allowBelowCanvas: Boolean(camera.allowBelowCanvas), locationLocked: Boolean(camera.locationLocked), scaleLinked: camera.scaleLinked !== false } }
    for (const item of next.entities.filter((candidate) => candidate.kind !== 'camera')) shot.entityStarts[item.id] = { mode: start === 0 ? 'independent' : 'inherited', label: start === 0 ? 'Independent Start' : `Inherited from ${previousShotName(next, shot.id)}` }
    next.shots.push(shot)
    next.sceneTree = [...new Set([...(next.sceneTree || []), shot.id])]
  }
  let groupId: string | undefined
  if (clipboard.group && clipboard.group.childIds.every((sourceId) => sourceToFresh.has(sourceId))) {
    groupId = id('group', reserved); reserved.add(groupId)
    next.groups.push({ ...clone(clipboard.group), id: groupId, childIds: clipboard.group.childIds.map((sourceId) => sourceToFresh.get(sourceId)!), pivot: clipboard.group.pivot.map((value, axis) => value + offset[axis]) as Vec3 })
  }
  return { document: sanitizeCameraDocument(next), entityIds: entities.map((entity) => entity.id), groupId }
}
export function resolvedCameraRotation(camera: SceneEntity, entities: SceneEntity[]): Vec3 {
  const target = camera.camera?.target
  if (!target || target.mode === 'free') return clone(camera.transform.rotation)
  const from = new THREE.Vector3(...camera.transform.position)
  const position = target.mode === 'point' ? target.position : entities.find((entity) => entity.id === target.entityId)?.transform.position || target.lastPosition
  if (!position) return clone(camera.transform.rotation)
  const to = new THREE.Vector3(...position)
  const matrix = new THREE.Matrix4().lookAt(from, to, new THREE.Vector3(0, 1, 0))
  const euler = new THREE.Euler().setFromRotationMatrix(matrix)
  return [THREE.MathUtils.radToDeg(euler.x), THREE.MathUtils.radToDeg(euler.y), camera.transform.rotation[2]]
}
export function resolvedCameraView(camera: SceneEntity, entities: SceneEntity[]) {
  const rotation = resolvedCameraRotation(camera, entities)
  const target = camera.camera?.target
  const position = target?.mode === 'point'
    ? target.position
    : target && target.mode !== 'free'
      ? entities.find((entity) => entity.id === target.entityId)?.transform.position || target.lastPosition
      : undefined
  const from = new THREE.Vector3(...camera.transform.position)
  const viewTarget = position ? new THREE.Vector3(...position) : from.clone().add(new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(...rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')))
  return { position: clone(camera.transform.position), rotation, target: viewTarget.toArray() as Vec3 }
}
const validVec3 = (value: unknown): value is Vec3 => Array.isArray(value) && value.length === 3 && value.every((item) => Number.isFinite(item))
function groupPivot(entities: SceneEntity[]): Vec3 {
  const bounds = new THREE.Box3()
  for (const entity of entities) {
    const half = new THREE.Vector3(...entity.dimensions).multiply(new THREE.Vector3(...entity.transform.scale)).multiplyScalar(.5)
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...entity.transform.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')), new THREE.Vector3(1, 1, 1))
    for (const x of [-half.x, half.x]) for (const y of [-half.y, half.y]) for (const z of [-half.z, half.z]) bounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(matrix))
  }
  return bounds.isEmpty() ? [0, 0, 0] : bounds.getCenter(new THREE.Vector3()).toArray() as Vec3
}
export function canGroupEntities(document: CameraDocument, childIds: string[]): { ok: true } | { ok: false; code: string } {
  const unique = [...new Set(childIds)]
  if (unique.length < 2) return { ok: false, code: 'GROUP_REQUIRES_TWO_ITEMS' }
  const known = new Set([...document.entities.map((entity) => entity.id), ...document.groups.map((group) => group.id), ...(document.objects || []).map((object) => object.id)])
  if (unique.some((entityId) => !known.has(entityId))) return { ok: false, code: 'ENTITY_NOT_FOUND' }
  if (unique.some((entityId) => document.entities.find((entity) => entity.id === entityId)?.kind === 'camera')) return { ok: false, code: 'CAMERA_CANNOT_BE_GROUPED' }
  try { const tree = migrateSceneTree(document); groupSceneNodes(tree, unique, { id: '__validation__', name: 'Group' }) } catch (error) {
    if (error instanceof Error && error.message === 'SCENE_TREE_GROUP_REQUIRES_SIBLINGS') return { ok: false, code: 'GROUP_REQUIRES_SIBLINGS' }
    return { ok: false, code: error instanceof Error ? error.message : 'GROUP_INVALID' }
  }
  return { ok: true }
}
export function groupEntities(document: CameraDocument, childIds: string[], _frame = 0): CameraDocument {
  if (!canGroupEntities(document, childIds).ok) return document
  const next = clone(document); const valid = [...new Set(childIds)]; const groupId = id('group', documentIds(next))
  const tree = groupSceneNodes(migrateSceneTree(next), valid, { id: groupId, name: `Group ${next.groups.length + 1}` })
  const groups = Object.values(tree.groups).map((group) => { const world = nodeWorldTransform(tree, group.id); return { id: group.id, name: group.name, childIds: [...group.childIds], pivot: world.position, rotation: world.rotation, shapeLocked: next.groups.find((item) => item.id === group.id)?.shapeLocked === true } })
  next.groups = groups
  next.sceneTree = tree.rootIds
  return next
}
export function toggleShapeLock(document: CameraDocument, groupId: string): CameraDocument { const next = clone(document); const group = next.groups.find((item) => item.id === groupId); if (!group) return document; group.shapeLocked = !group.shapeLocked; return next }
export function ungroupEntities(document: CameraDocument, groupId: string): CameraDocument {
  const group = document.groups.find((item) => item.id === groupId); if (!group || group.shapeLocked) return document
  const tree = ungroupSceneNode(migrateSceneTree(document), groupId); const next = clone(document)
  next.groups = Object.values(tree.groups).map((item) => { const world = nodeWorldTransform(tree, item.id); return { id: item.id, name: item.name, childIds: [...item.childIds], pivot: world.position, rotation: world.rotation, shapeLocked: next.groups.find((candidate) => candidate.id === item.id)?.shapeLocked === true } })
  next.sceneTree = tree.rootIds
  return next
}
export function deleteGroup(document: CameraDocument, groupId: string): CameraDocument { const group = document.groups.find((item) => item.id === groupId); return group ? deleteEntities(document, group.childIds) : document }
export function transformShapeGroup(document: CameraDocument, groupId: string, input: { translation?: Vec3; rotation?: Vec3 }): CameraDocument {
  const next = clone(document); const group = next.groups.find((item) => item.id === groupId); if (!group) return document
  const translation = input.translation || [0, 0, 0]; const deltaEuler = new THREE.Euler(...(input.rotation || [0, 0, 0]).map(THREE.MathUtils.degToRad) as Vec3, 'XYZ'); const deltaQ = new THREE.Quaternion().setFromEuler(deltaEuler); const pivot = new THREE.Vector3(...group.pivot)
  for (const entity of next.entities.filter((item) => group.childIds.includes(item.id))) {
    const position = new THREE.Vector3(...entity.transform.position).sub(pivot).applyQuaternion(deltaQ).add(pivot).add(new THREE.Vector3(...translation))
    const currentQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ'))
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().copy(deltaQ).multiply(currentQ), 'XYZ')
    entity.transform.position = position.toArray() as Vec3; entity.transform.rotation = [rotation.x, rotation.y, rotation.z].map(THREE.MathUtils.radToDeg) as Vec3
  }
  group.pivot = group.pivot.map((value, axis) => value + translation[axis]) as Vec3
  const groupQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...group.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')); const composed = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromEuler(deltaEuler).multiply(groupQ), 'XYZ')
  group.rotation = [composed.x, composed.y, composed.z].map(THREE.MathUtils.radToDeg) as Vec3
  return next
}
