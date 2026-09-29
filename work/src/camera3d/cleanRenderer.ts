import * as THREE from 'three'
import { cameraFov, evaluateFrame, sanitizeCameraDocument, transformPointWorld, type CameraDocument, type EvaluatedEntity, type Vec3 } from './model'
import { rebuildSceneContent } from './threeScene'

export type CleanRenderDimensions = { width: number; height: number }
export type CleanRenderFrame = { bytes: Uint8Array; width: number; height: number; absoluteFrame: number; shotId: string; cameraId: string | null; clean: true }

const DIMENSIONS: Record<CameraDocument['resolution'], Record<CameraDocument['aspect'], CleanRenderDimensions>> = {
  '720p': { '16:9': { width: 1280, height: 720 }, '9:16': { width: 720, height: 1280 }, '1:1': { width: 720, height: 720 }, '4:3': { width: 960, height: 720 }, '3:4': { width: 720, height: 960 } },
  '1080p': { '16:9': { width: 1920, height: 1080 }, '9:16': { width: 1080, height: 1920 }, '1:1': { width: 1080, height: 1080 }, '4:3': { width: 1440, height: 1080 }, '3:4': { width: 1080, height: 1440 } },
}

export function renderDimensions(resolution: CameraDocument['resolution'], aspect: CameraDocument['aspect']): CleanRenderDimensions {
  return { ...DIMENSIONS[resolution][aspect] }
}

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
const parseColor = (value: string) => {
  const color = new THREE.Color(value)
  return [color.r * 255, color.g * 255, color.b * 255] as const
}
const fill = (bytes: Uint8Array, width: number, height: number) => {
  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1)
    const shade = 25 + t * 10
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4
      bytes[at] = clampByte(shade * .95); bytes[at + 1] = clampByte(shade * .92); bytes[at + 2] = clampByte(shade * 1.08); bytes[at + 3] = 255
    }
  }
}
const paintRect = (bytes: Uint8Array, width: number, height: number, left: number, top: number, right: number, bottom: number, rgb: readonly number[]) => {
  const x0 = Math.max(0, Math.floor(left)); const x1 = Math.min(width - 1, Math.ceil(right))
  const y0 = Math.max(0, Math.floor(top)); const y1 = Math.min(height - 1, Math.ceil(bottom))
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
    const at = (y * width + x) * 4
    bytes[at] = clampByte(rgb[0]); bytes[at + 1] = clampByte(rgb[1]); bytes[at + 2] = clampByte(rgb[2]); bytes[at + 3] = 255
  }
}

function activeCamera(document: CameraDocument, absoluteFrame: number, evaluated: ReturnType<typeof evaluateFrame>) {
  const shot = document.shots.find((item) => absoluteFrame >= item.startFrame && absoluteFrame < item.endFrame) || document.shots.at(-1)!
  const explicit = evaluated.entities.find((entity) => entity.kind === 'camera' && entity.id === shot.camera.activeCameraId)
  const fallback = evaluated.entities.find((entity) => entity.kind === 'camera')
  return { shot, entity: explicit || fallback || null, cameraId: explicit?.id || fallback?.id || shot.id }
}

function makeCamera(document: CameraDocument, evaluated: ReturnType<typeof evaluateFrame>, entity: EvaluatedEntity | null, width: number, height: number) {
  const metadata = entity?.camera || evaluated.camera
  const fov = cameraFov(metadata?.focalLength || 35, document.aspect, metadata?.near || .1, metadata?.far || 100)
  const camera = new THREE.PerspectiveCamera(fov.verticalDegrees, width / height, Math.max(.001, metadata?.near || .1), Math.max((metadata?.near || .1) + .001, metadata?.far || 100))
  const source = entity?.transform || evaluated.camera.transform
  camera.position.set(...source.position)
  camera.rotation.set(...source.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
  const target = metadata?.target
  if (target?.mode === 'locked' || target?.mode === 'object') {
    const locked = evaluated.entities.find((item) => item.id === target.entityId)
    const position = locked?.transform.position || target.lastPosition
    if (position) camera.lookAt(new THREE.Vector3(...position))
  } else if (target?.mode === 'point') camera.lookAt(new THREE.Vector3(...target.position))
  else if (target?.mode === 'free' && target.position) camera.lookAt(new THREE.Vector3(...target.position))
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}

function projectedBounds(entity: EvaluatedEntity, camera: THREE.PerspectiveCamera, width: number, height: number) {
  const points: THREE.Vector3[] = []
  for (const x of [-entity.dimensions[0] / 2, entity.dimensions[0] / 2]) for (const y of [-entity.dimensions[1] / 2, entity.dimensions[1] / 2]) for (const z of [-entity.dimensions[2] / 2, entity.dimensions[2] / 2]) {
    const point = new THREE.Vector3(...transformPointWorld(entity.transform, [x, y, z])).project(camera)
    if (point.z >= -1 && point.z <= 1) points.push(point)
  }
  if (!points.length) return null
  const xs = points.map((point) => (point.x + 1) * width / 2)
  const ys = points.map((point) => (1 - point.y) * height / 2)
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), depth: points.reduce((sum, point) => sum + point.z, 0) / points.length }
}

export class CleanThreeFrameRenderer {
  private readonly document: CameraDocument
  private readonly dimensions: CleanRenderDimensions
  private readonly renderer: THREE.WebGLRenderer
  private readonly target: THREE.WebGLRenderTarget
  private readonly scene = new THREE.Scene()
  private readonly content = new THREE.Group()

  constructor(input: CameraDocument, dimensions = renderDimensions(input.resolution, input.aspect)) {
    this.document = sanitizeCameraDocument(structuredClone(input))
    this.dimensions = { ...dimensions }
    const canvas = globalThis.document.createElement('canvas')
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: false })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setSize(dimensions.width, dimensions.height, false)
    this.renderer.setClearColor('#191821', 1)
    this.target = new THREE.WebGLRenderTarget(dimensions.width, dimensions.height, { depthBuffer: true, stencilBuffer: false, format: THREE.RGBAFormat, type: THREE.UnsignedByteType })
    this.scene.background = new THREE.Color('#191821')
    this.scene.add(this.content)
    this.scene.add(new THREE.HemisphereLight('#dad7ff', '#29252f', 1.2))
    const key = new THREE.DirectionalLight('#fff2dd', 2); key.position.set(7, 11, 5); key.castShadow = true; this.scene.add(key)
  }

  render(absoluteFrame: number): CleanRenderFrame {
    const evaluated = evaluateFrame(this.document, absoluteFrame)
    const selected = activeCamera(this.document, absoluteFrame, evaluated)
    rebuildSceneContent(this.content, evaluated, false)
    const camera = makeCamera(this.document, evaluated, selected.entity, this.dimensions.width, this.dimensions.height)
    this.renderer.setRenderTarget(this.target)
    this.renderer.render(this.scene, camera)
    const bottomUp = new Uint8Array(this.dimensions.width * this.dimensions.height * 4)
    this.renderer.readRenderTargetPixels(this.target, 0, 0, this.dimensions.width, this.dimensions.height, bottomUp)
    const bytes = new Uint8Array(bottomUp.length); const stride = this.dimensions.width * 4
    for (let y = 0; y < this.dimensions.height; y += 1) bytes.set(bottomUp.subarray((this.dimensions.height - 1 - y) * stride, (this.dimensions.height - y) * stride), y * stride)
    this.renderer.setRenderTarget(null)
    return { bytes, width: this.dimensions.width, height: this.dimensions.height, absoluteFrame, shotId: selected.shot.id, cameraId: selected.cameraId, clean: true }
  }

  dispose() {
    this.content.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()) } })
    this.target.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss()
  }
}

export function cleanRenderFrame(input: CameraDocument, absoluteFrame: number, dimensions = renderDimensions(input.resolution, input.aspect)): CleanRenderFrame {
  const document = sanitizeCameraDocument(structuredClone(input))
  const evaluated = evaluateFrame(document, absoluteFrame)
  const selected = activeCamera(document, absoluteFrame, evaluated)
  const camera = makeCamera(document, evaluated, selected.entity, dimensions.width, dimensions.height)
  const bytes = new Uint8Array(dimensions.width * dimensions.height * 4)
  fill(bytes, dimensions.width, dimensions.height)
  const drawable = evaluated.entities.filter((entity) => entity.kind !== 'camera').flatMap((entity) => {
    const bounds = projectedBounds(entity, camera, dimensions.width, dimensions.height)
    return bounds ? [{ entity, bounds }] : []
  }).sort((left, right) => right.bounds.depth - left.bounds.depth)
  const objectDrawable = evaluated.objects.flatMap((object) => object.parts.flatMap((part) => {
    const corners: THREE.Vector3[] = []
    const half = part.dimensions.map((value) => value / 2) as Vec3
    for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) {
      const point = new THREE.Vector3(x, y, z).applyMatrix4(part.worldMatrix).project(camera)
      if (point.z >= -1 && point.z <= 1) corners.push(point)
    }
    if (!corners.length) return []
    const xs = corners.map((point) => (point.x + 1) * dimensions.width / 2)
    const ys = corners.map((point) => (1 - point.y) * dimensions.height / 2)
    return [{ object, bounds: { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), depth: corners.reduce((sum, point) => sum + point.z, 0) / corners.length } }]
  }))
  const light = new THREE.Vector3(-.45, .8, .35).normalize()
  for (const { entity, bounds } of drawable) {
    const view = new THREE.Vector3(...entity.transform.position).sub(camera.position).normalize().negate()
    const shade = .58 + .34 * Math.max(0, view.dot(light))
    const color = parseColor(entity.color).map((value) => value * shade)
    paintRect(bytes, dimensions.width, dimensions.height, bounds.left, bounds.top, bounds.right, bounds.bottom, color)
  }
  for (const { object, bounds } of objectDrawable.sort((left, right) => right.bounds.depth - left.bounds.depth)) {
    paintRect(bytes, dimensions.width, dimensions.height, bounds.left, bounds.top, bounds.right, bounds.bottom, parseColor(object.color).map((value) => value * .78))
  }
  return { bytes, width: dimensions.width, height: dimensions.height, absoluteFrame, shotId: selected.shot.id, cameraId: selected.cameraId, clean: true }
}
