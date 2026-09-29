import * as THREE from 'three'
import type { Transform, Vec3 } from './model'

export type StructuredPrimitiveKind = 'block' | 'sphere' | 'column'
export type ObjectRecipePartV1 = {
  id: string
  name?: string
  kind: StructuredPrimitiveKind
  dimensions: Vec3
  transform: Transform
}
export type ObjectRecipeV1 = {
  schema: 'prism.object-recipe'
  version: 1
  id: string
  name: string
  parts: ObjectRecipePartV1[]
}
export type StructuredObjectPart = ObjectRecipePartV1 & { localMatrix?: readonly number[] }
export type StructuredObjectProvenance = {
  source: 'recipe' | 'manual' | 'duplicate'
  recipeIdentity?: string
}
export type StructuredObject = {
  id: string
  name: string
  version: 1
  color: string
  transform: Transform
  locks?: { transform?: boolean; all?: boolean }
  allowBelowCanvas: boolean
  scaleLinked?: boolean
  keyframes: Array<{ id: string; frame: number; transform: Transform }>
  partOrder: string[]
  parts: StructuredObjectPart[]
  provenance: StructuredObjectProvenance
}
export type EvaluatedStructuredPart = StructuredObjectPart & {
  worldMatrix: THREE.Matrix4
  worldBounds: THREE.Box3
}
export type EvaluatedStructuredObject = Omit<StructuredObject, 'parts'> & {
  parts: EvaluatedStructuredPart[]
  worldBounds: THREE.Box3
}

export const OBJECT_ANCHOR_PREVIEW_PX = 35
export const OBJECT_ANCHOR_SNAP_PX = 10

const KINDS = new Set<StructuredPrimitiveKind>(['block', 'sphere', 'column'])
const clone = <T>(value: T): T => structuredClone(value)
const invalid = (path: string): never => { throw new Error(`OBJECT_RECIPE_INVALID:${path}`) }
const record = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path)
  return value as Record<string, unknown>
}
const exactKeys = (value: Record<string, unknown>, allowed: readonly string[], path: string) => {
  const accepted = new Set(allowed)
  const unknown = Object.keys(value).find((key) => !accepted.has(key))
  if (unknown) invalid(`${path}.${unknown}`)
}
const boundedString = (value: unknown, path: string, maximum: number): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) invalid(path)
  return (value as string).trim()
}
const boundedVec3 = (value: unknown, path: string, minimum: number, maximum: number, absolute = false): Vec3 => {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) invalid(path)
  const vector = value as number[]
  if (vector.some((item) => absolute ? Math.abs(item) < minimum || Math.abs(item) > maximum : item < minimum || item > maximum)) invalid(path)
  return [...vector] as Vec3
}

export function normalizeObjectLocalId(value: string): string {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-')
  if (!normalized) invalid('id')
  return normalized.slice(0, 80).replace(/-+$/g, '')
}

function parseTransform(value: unknown, path: string): Transform {
  const source = record(value, path)
  exactKeys(source, ['position', 'rotation', 'scale', 'anchor'], path)
  if (!('position' in source) || !('rotation' in source) || !('scale' in source)) invalid(path)
  return {
    position: boundedVec3(source.position, `${path}.position`, 0, 100_000, true),
    rotation: boundedVec3(source.rotation, `${path}.rotation`, 0, 100_000, true),
    scale: boundedVec3(source.scale, `${path}.scale`, .0001, 1_000),
    anchor: source.anchor === undefined ? [0, 0, 0] : boundedVec3(source.anchor, `${path}.anchor`, 0, 100_000, true),
  }
}

export function parseObjectRecipeV1(value: unknown): ObjectRecipeV1 {
  const source = record(value, '$')
  exactKeys(source, ['schema', 'version', 'id', 'name', 'parts'], '$')
  if (source.schema !== 'prism.object-recipe' || source.version !== 1) invalid('$.schema')
  const id = normalizeObjectLocalId(boundedString(source.id, '$.id', 80))
  const name = boundedString(source.name, '$.name', 120)
  if (!Array.isArray(source.parts) || source.parts.length < 1 || source.parts.length > 256) invalid('$.parts')
  const sourceParts = source.parts as unknown[]
  const ids = new Set<string>()
  const parts = sourceParts.map((input, index): ObjectRecipePartV1 => {
    const path = `$.parts[${index}]`
    const part = record(input, path)
    exactKeys(part, ['id', 'name', 'kind', 'dimensions', 'transform'], path)
    const partId = normalizeObjectLocalId(boundedString(part.id, `${path}.id`, 80))
    if (ids.has(partId)) invalid(`${path}.id`)
    ids.add(partId)
    if (!KINDS.has(part.kind as StructuredPrimitiveKind)) invalid(`${path}.kind`)
    return {
      id: partId,
      ...(part.name === undefined ? {} : { name: boundedString(part.name, `${path}.name`, 120) }),
      kind: part.kind as StructuredPrimitiveKind,
      dimensions: boundedVec3(part.dimensions, `${path}.dimensions`, .0001, 10_000),
      transform: parseTransform(part.transform, `${path}.transform`),
    }
  })
  return { schema: 'prism.object-recipe', version: 1, id, name, parts }
}

export function createStructuredObjectFromRecipe(recipe: ObjectRecipeV1, id: string, root: Transform): StructuredObject {
  const parsed = parseObjectRecipeV1(recipe)
  return {
    id: normalizeObjectLocalId(id),
    name: parsed.name,
    version: 1,
    color: '#8d78d6',
    transform: clone(root),
    locks: {},
    allowBelowCanvas: false,
    scaleLinked: true,
    keyframes: [],
    partOrder: parsed.parts.map((part) => part.id),
    parts: clone(parsed.parts),
    provenance: { source: 'recipe', recipeIdentity: `${parsed.schema}:${parsed.version}:${parsed.id}` },
  }
}

const radians = (rotation: Vec3): Vec3 => rotation.map(THREE.MathUtils.degToRad) as Vec3
function transformMatrix(value: Transform): THREE.Matrix4 {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...value.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...radians(value.rotation), 'XYZ')),
    new THREE.Vector3(...value.scale),
  )
  const anchor = value.anchor || [0, 0, 0]
  if (anchor.some((item) => item !== 0)) matrix.multiply(new THREE.Matrix4().makeTranslation(-anchor[0], -anchor[1], -anchor[2]))
  return matrix
}
const matrixFrom = (part: StructuredObjectPart): THREE.Matrix4 => part.localMatrix
  ? new THREE.Matrix4().fromArray([...part.localMatrix])
  : transformMatrix(part.transform)
const matrixTransform = (matrix: THREE.Matrix4): Transform => {
  const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3()
  matrix.decompose(position, quaternion, scale)
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')
  return {
    position: position.toArray() as Vec3,
    rotation: [rotation.x, rotation.y, rotation.z].map(THREE.MathUtils.radToDeg) as Vec3,
    scale: scale.toArray() as Vec3,
    anchor: [0, 0, 0],
  }
}
const matrixValues = (matrix: THREE.Matrix4): number[] => [...matrix.elements]

export function structuredPartWorldMatrix(object: StructuredObject, partId: string): THREE.Matrix4 {
  const part = object.parts.find((candidate) => candidate.id === partId)
  if (!part) throw new Error('STRUCTURED_PART_NOT_FOUND')
  return transformMatrix(object.transform).multiply(matrixFrom(part))
}

function boundsFor(part: StructuredObjectPart, matrix: THREE.Matrix4): THREE.Box3 {
  const half = new THREE.Vector3(...part.dimensions).multiplyScalar(.5)
  const bounds = new THREE.Box3()
  for (const x of [-half.x, half.x]) for (const y of [-half.y, half.y]) for (const z of [-half.z, half.z]) {
    bounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(matrix))
  }
  return bounds
}

function interpolateRootTransform(object: StructuredObject, frame?: number): Transform {
  if (frame == null || object.keyframes.length === 0) return clone(object.transform)
  const keys = [...object.keyframes].sort((left, right) => left.frame - right.frame)
  const before = [...keys].reverse().find((key) => key.frame <= frame) || keys[0]
  const after = keys.find((key) => key.frame >= frame) || keys[keys.length - 1]
  if (before === after) return clone(before.transform)
  const progress = Math.max(0, Math.min(1, (frame - before.frame) / Math.max(1, after.frame - before.frame)))
  const mix = (left: Vec3, right: Vec3): Vec3 => left.map((value, index) => value + (right[index] - value) * progress) as Vec3
  return { position: mix(before.transform.position, after.transform.position), rotation: mix(before.transform.rotation, after.transform.rotation), scale: mix(before.transform.scale, after.transform.scale), anchor: mix(before.transform.anchor || [0, 0, 0], after.transform.anchor || [0, 0, 0]) }
}

export function evaluateStructuredObject(object: StructuredObject, frame?: number): EvaluatedStructuredObject {
  const evaluatedObject = { ...clone(object), transform: interpolateRootTransform(object, frame) }
  const byId = new Map(object.parts.map((part) => [part.id, part]))
  const ordered = [...object.partOrder.map((id) => byId.get(id)).filter(Boolean), ...object.parts.filter((part) => !object.partOrder.includes(part.id))] as StructuredObjectPart[]
  const parts = ordered.map((part) => {
    const worldMatrix = structuredPartWorldMatrix(evaluatedObject, part.id)
    return { ...clone(part), worldMatrix, worldBounds: boundsFor(part, worldMatrix) }
  })
  const worldBounds = parts.reduce((result, part) => result.union(part.worldBounds), new THREE.Box3())
  return { ...evaluatedObject, scaleLinked: object.scaleLinked !== false, parts, worldBounds }
}

function worldPartToLocal(root: Transform, part: StructuredObjectPart): StructuredObjectPart {
  const world = matrixFrom(part)
  const local = transformMatrix(root).invert().multiply(world)
  return { ...clone(part), transform: matrixTransform(local), localMatrix: matrixValues(local) }
}
function localPartToWorld(object: StructuredObject, part: StructuredObjectPart): StructuredObjectPart {
  const world = transformMatrix(object.transform).multiply(matrixFrom(part))
  return { ...clone(part), transform: matrixTransform(world), localMatrix: matrixValues(world) }
}
function uniquePartId(parts: readonly StructuredObjectPart[], requested: string): string {
  const base = normalizeObjectLocalId(requested)
  const used = new Set(parts.map((part) => part.id))
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function manualCreateStructuredObject(id: string, name: string, root: Transform, worldParts: readonly StructuredObjectPart[]): StructuredObject {
  if (worldParts.length < 2) throw new Error('STRUCTURED_OBJECT_REQUIRES_TWO_PARTS')
  const parts: StructuredObjectPart[] = []
  for (const source of worldParts) {
    const part = clone(source)
    part.id = uniquePartId(parts, part.id)
    parts.push(worldPartToLocal(root, part))
  }
  return { id: normalizeObjectLocalId(id), name, version: 1, color: '#8d78d6', transform: clone(root), locks: {}, allowBelowCanvas: false, scaleLinked: true, keyframes: [], partOrder: parts.map((part) => part.id), parts, provenance: { source: 'manual' } }
}

export function addToStructuredObject(object: StructuredObject, worldPart: StructuredObjectPart): StructuredObject {
  const next = clone(object)
  const part = clone(worldPart)
  part.id = uniquePartId(next.parts, part.id)
  next.parts.push(worldPartToLocal(next.transform, part))
  next.partOrder = next.parts.map((candidate) => candidate.id)
  return next
}

export function detachStructuredPart(object: StructuredObject, partId: string): { object: StructuredObject; part: StructuredObjectPart } {
  const index = object.parts.findIndex((part) => part.id === partId)
  if (index < 0) throw new Error('STRUCTURED_PART_NOT_FOUND')
  const next = clone(object)
  const [part] = next.parts.splice(index, 1)
  next.partOrder = next.parts.map((candidate) => candidate.id)
  return { object: next, part: localPartToWorld(object, part) }
}

export function detachStructuredPartAndDissolve(object: StructuredObject, partId: string): { object: StructuredObject | null; parts: StructuredObjectPart[] } {
  const detached = detachStructuredPart(object, partId)
  if (detached.object.parts.length === 1) return { object: null, parts: detachStructuredObject(object) }
  return { object: detached.object, parts: [detached.part] }
}

export function detachStructuredObject(object: StructuredObject): StructuredObjectPart[] {
  return object.parts.map((part) => localPartToWorld(object, part))
}

export function copyStructuredObject(object: StructuredObject): StructuredObject { return clone(object) }
export function duplicateStructuredObject(object: StructuredObject, id: string, idForPart: (part: StructuredObjectPart, index: number) => string): StructuredObject {
  const next = clone(object)
  next.id = normalizeObjectLocalId(id)
  const used = new Set<string>()
  next.parts = next.parts.map((part, index) => {
    const requested = normalizeObjectLocalId(idForPart(clone(part), index))
    if (used.has(requested)) throw new Error('STRUCTURED_PART_DUPLICATE_ID')
    used.add(requested)
    return { ...part, id: requested }
  })
  next.partOrder = next.parts.map((part) => part.id)
  next.provenance = { ...next.provenance, source: 'duplicate' }
  return next
}

export type SurfaceAnchorFeature = 'face-center' | 'corner' | 'cardinal' | 'closest' | 'cap-center' | 'rim' | 'curved-side'
export type ProjectedSurfaceAnchor = {
  id: string
  partId: string
  feature: SurfaceAnchorFeature
  localPoint: Vec3
  worldPoint: Vec3
  screen: { x: number; y: number; depth: number }
  priority: number
  partOrder: number
  anchorOrder: number
}
export type SurfaceAnchorProjectionInput = {
  partId: string
  kind: StructuredPrimitiveKind
  dimensions: Vec3
  worldMatrix: THREE.Matrix4
  project: (world: Vec3) => { x: number; y: number; depth?: number; visible?: boolean }
  closestSurfacePoint?: Vec3
  partOrder?: number
}

const FEATURE_PRIORITY: Record<SurfaceAnchorFeature, number> = {
  closest: 0, 'curved-side': 0, 'face-center': 1, 'cap-center': 1, cardinal: 2, rim: 3, corner: 4,
}
export function generateProjectedSurfaceAnchors(input: SurfaceAnchorProjectionInput): ProjectedSurfaceAnchor[] {
  const candidates: Array<{ suffix: string; feature: SurfaceAnchorFeature; point: Vec3 }> = []
  const half = input.dimensions.map((value) => value / 2) as Vec3
  if (input.kind === 'block') {
    const faces: Array<[string, Vec3]> = [
      ['face-left', [-half[0], 0, 0]], ['face-right', [half[0], 0, 0]],
      ['face-bottom', [0, -half[1], 0]], ['face-top', [0, half[1], 0]],
      ['face-back', [0, 0, -half[2]]], ['face-front', [0, 0, half[2]]],
    ]
    faces.forEach(([suffix, point]) => candidates.push({ suffix, feature: 'face-center', point }))
    let index = 0
    for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) candidates.push({ suffix: `corner-${index++}`, feature: 'corner', point: [x, y, z] })
  } else if (input.kind === 'sphere') {
    const cardinals: Vec3[] = [[-half[0], 0, 0], [half[0], 0, 0], [0, -half[1], 0], [0, half[1], 0], [0, 0, -half[2]], [0, 0, half[2]]]
    cardinals.forEach((point, index) => candidates.push({ suffix: `cardinal-${index}`, feature: 'cardinal', point }))
    if (input.closestSurfacePoint) {
      const direction = new THREE.Vector3(...input.closestSurfacePoint)
      if (direction.lengthSq() > 0) direction.normalize()
      candidates.push({ suffix: 'closest', feature: 'closest', point: [direction.x * half[0], direction.y * half[1], direction.z * half[2]] })
    }
  } else {
    candidates.push({ suffix: 'cap-bottom', feature: 'cap-center', point: [0, -half[1], 0] })
    candidates.push({ suffix: 'cap-top', feature: 'cap-center', point: [0, half[1], 0] })
    for (const y of [-half[1], half[1]]) for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4
      candidates.push({ suffix: `rim-${y < 0 ? 'bottom' : 'top'}-${index}`, feature: 'rim', point: [Math.cos(angle) * half[0], y, Math.sin(angle) * half[2]] })
    }
    const cardinals: Vec3[] = [[-half[0], 0, 0], [half[0], 0, 0], [0, 0, -half[2]], [0, 0, half[2]]]
    cardinals.forEach((point, index) => candidates.push({ suffix: `cardinal-${index}`, feature: 'cardinal', point }))
    if (input.closestSurfacePoint) {
      const direction = new THREE.Vector2(input.closestSurfacePoint[0], input.closestSurfacePoint[2])
      if (direction.lengthSq() > 0) direction.normalize()
      const y = Math.max(-half[1], Math.min(half[1], input.closestSurfacePoint[1]))
      candidates.push({ suffix: 'curved-side', feature: 'curved-side', point: [direction.x * half[0], y, direction.y * half[2]] })
    }
  }
  const anchors: ProjectedSurfaceAnchor[] = []
  candidates.forEach((candidate, anchorOrder) => {
    const worldPoint = new THREE.Vector3(...candidate.point).applyMatrix4(input.worldMatrix).toArray() as Vec3
    const projected = input.project(worldPoint)
    if (projected.visible === false || !Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return
    anchors.push({
      id: `${input.partId}:${candidate.suffix}`, partId: input.partId, feature: candidate.feature,
      localPoint: candidate.point, worldPoint,
      screen: { x: projected.x, y: projected.y, depth: Number.isFinite(projected.depth) ? projected.depth! : 0 },
      priority: FEATURE_PRIORITY[candidate.feature], partOrder: input.partOrder || 0, anchorOrder,
    })
  })
  return anchors
}

export function snapStructuredObjectToAnchor(object: StructuredObject, anchor: ProjectedSurfaceAnchor, target: Vec3): StructuredObject {
  if (!object.parts.some((part) => part.id === anchor.partId)) throw new Error('STRUCTURED_PART_NOT_FOUND')
  const next = clone(object)
  const delta = new THREE.Vector3(...target).sub(new THREE.Vector3(...anchor.worldPoint))
  next.transform.position = new THREE.Vector3(...next.transform.position).add(delta).toArray() as Vec3
  return next
}

export function rankProjectedSurfaceAnchors(anchors: readonly ProjectedSurfaceAnchor[], pointer: { x: number; y: number }): { preview: ProjectedSurfaceAnchor[]; snap: ProjectedSurfaceAnchor | null } {
  const distance = (anchor: ProjectedSurfaceAnchor) => Math.hypot(anchor.screen.x - pointer.x, anchor.screen.y - pointer.y)
  const compare = (left: ProjectedSurfaceAnchor, right: ProjectedSurfaceAnchor) => distance(left) - distance(right)
    || left.priority - right.priority
    || left.partOrder - right.partOrder
    || left.anchorOrder - right.anchorOrder
    || left.id.localeCompare(right.id)
  const preview = anchors.filter((anchor) => distance(anchor) <= OBJECT_ANCHOR_PREVIEW_PX).map(clone).sort(compare)
  return { preview, snap: preview.length && distance(preview[0]) <= OBJECT_ANCHOR_SNAP_PX ? preview[0] : null }
}
