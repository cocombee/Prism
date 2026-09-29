import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { MiniMap, ReactFlow } from '@xyflow/react'
import * as THREE from 'three'
import { Box, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, CircleStop, Copy, Crosshair, Cylinder, Diamond, Eye, Group, Link2, Lock, Magnet, Maximize2, MousePointer2, Move3d, Palette, Pause, PencilLine, Play, Repeat2, RotateCcw, RotateCw, Scissors, SkipBack, SkipForward, Sparkles, Trash2, Ungroup, Unlink2, Unlock, UserRound, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CameraDocument, Ease, EntityKind, SceneEntity, ShotClipColor, Transform, Vec3 } from './model'
import { CAMERA_FOCAL_LENGTHS, authorCameraFocalLengthKeyframe, cameraFov, cameraMovementOptions, evaluateFrame, formatTransformNumeric, normalizeCameraMovement, normalizeRotationDegrees, reanchorTransform, scaleTransformAxis, setCameraAimMode, setCameraLockTarget, setCameraPointTarget } from './model'
import { cameraTimelineHeightForKey, cameraTimelineHeightForPointer, humanVoxelParts } from './interaction'
import { CAMERA_MOVEMENT_GROUPS, ShotBoundaryChoice, StoryboardCompactSelect } from '../renderer/src/StoryboardSharedControls'
import { FluidControlGroup, type FluidGroupControl } from '../renderer/src/FluidControlGroup'
export { ShotBoundaryChoice } from '../renderer/src/StoryboardSharedControls'
import { STORYBOARD_CAMERA_MOVEMENT_GROUPS, STORYBOARD_DURATION_OPTIONS, STORYBOARD_SHOT_SIZE_OPTIONS } from './storyboardCatalogs'
import { clearRenderMarks, deriveRenderRange, type RenderMarks } from './renderRange'
import { minimapCornerRadiusForZoom, roundedMinimapMaskPath } from '../shared/minimapGeometry'

export const cameraShotClipSecondaryCopy = (shot: Pick<CameraDocument['shots'][number], 'duration'> & { shotSize?: string }) => `${shot.duration}s`

export type CameraMapClip = 'inside' | 'outside' | 'straddling' | 'behind'
type MapPoint = { x: number; y: number }
type CameraMapShape = { kind: 'circle'; radius: number } | { kind: 'polygon' | 'directional-camera'; points: MapPoint[] } | { kind: 'compound-human'; parts: Array<{ role: string; points: MapPoint[] }> }
export type CameraViewerSnapshot =
  | { mode: 'perspective'; position: Vec3; target: Vec3; verticalFovDegrees: number; near: number; far: number; pilotCameraId: string | null; authoredPath?: Vec3[] }
  | { mode: 'top' | 'front' | 'side'; position: Vec3; target: Vec3; zoom: number; pilotCameraId?: null }
type CameraMapProjection = { kind: 'perspective' | 'orthographic'; fill: MapPoint[]; sideRays: Array<{ start: MapPoint; end: MapPoint }>; visibleClosingEdge: boolean; trajectory: MapPoint[]; groundCorners: Array<{ world: Vec3; map: MapPoint }>; roundedPath: string }
export type CameraMapGeometry = { state: 'ready'; apex: MapPoint; worldPerPixel: number; projection: CameraMapProjection; items: Array<{ id: string; name: string; kind: EntityKind; color: string; x: number; y: number; radius: number; local: [number, number]; clip: CameraMapClip; rotation: number; shape: CameraMapShape }> }

export const cameraMapEntityRadius = (entity: SceneEntity) => entity.kind === 'column' || entity.kind === 'sphere'
  ? entity.dimensions[0] / 2 * Math.max(entity.transform.scale[0], entity.transform.scale[2])
  : Math.max(.25, Math.hypot(entity.dimensions[0] * entity.transform.scale[0], entity.dimensions[2] * entity.transform.scale[2]) / 2)
const defaultViewer = (): CameraViewerSnapshot => ({ mode: 'perspective', position: [9, 7, 12], target: [0, 1, 0], verticalFovDegrees: 42, near: .1, far: 500, pilotCameraId: null })
export function cameraFollowerBasis(position: Vec3, target: Vec3, lastFinite: [number, number] = [0, -1]) {
  const dx = target[0] - position[0]; const dz = target[2] - position[2]
  const length = Math.hypot(dx, dz)
  const fallbackLength = Math.hypot(lastFinite[0], lastFinite[1]) || 1
  const forward: [number, number] = length > 1e-8 && Number.isFinite(length) ? [dx / length, dz / length] : [lastFinite[0] / fallbackLength, lastFinite[1] / fallbackLength]
  const clean = (value: number) => Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(12))
  const normalized: [number, number] = [clean(forward[0]), clean(forward[1])]
  return { forward: normalized, right: [clean(-normalized[1]), clean(normalized[0])] as [number, number] }
}
const legacyViewer = (document: CameraDocument, cameraId: string | null, frame: number): CameraViewerSnapshot => {
  const camera = evaluateFrame(document, frame).entities.find((entity) => entity.id === cameraId && entity.kind === 'camera') || document.entities.find((entity) => entity.kind === 'camera')
  if (!camera?.camera) return defaultViewer()
  const rotation = new THREE.Euler(...camera.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3, 'XYZ')
  const target = new THREE.Vector3(...camera.transform.position).add(new THREE.Vector3(0, 0, -1).applyEuler(rotation)).toArray() as Vec3
  return { mode: 'perspective', position: camera.transform.position, target, verticalFovDegrees: cameraFov(camera.camera.focalLength, document.aspect, camera.camera.near, camera.camera.far).verticalDegrees, near: camera.camera.near, far: camera.camera.far, pilotCameraId: camera.id }
}

export function cameraLocalMapGeometry(document: CameraDocument, viewerOrLegacy: CameraViewerSnapshot | string | null, width: number, height: number, frame = 0): CameraMapGeometry {
  const viewer = typeof viewerOrLegacy === 'object' && viewerOrLegacy ? viewerOrLegacy : legacyViewer(document, viewerOrLegacy, frame)
  const evaluated = document.entities.length ? evaluateFrame(document, frame).entities as unknown as SceneEntity[] : []
  const apex = { x: Number((width * .5).toFixed(6)), y: Number((height * .82).toFixed(6)) }
  const basis = cameraFollowerBasis(viewer.position, viewer.target)
  const groundForward = new THREE.Vector2(...basis.forward)
  const groundRight = new THREE.Vector2(...basis.right)
  const topFootprints = evaluated.map((entity) => ({ entity, radius: cameraMapEntityRadius(entity) }))
  const topMinX = Math.min(-6, ...topFootprints.map(({entity,radius}) => entity.transform.position[0] - radius))
  const topMaxX = Math.max(6, ...topFootprints.map(({entity,radius}) => entity.transform.position[0] + radius))
  const topMinZ = Math.min(-4, ...topFootprints.map(({entity,radius}) => entity.transform.position[2] - radius))
  const topMaxZ = Math.max(4, ...topFootprints.map(({entity,radius}) => entity.transform.position[2] + radius))
  const topCenter: [number,number] = [(topMinX + topMaxX) / 2, (topMinZ + topMaxZ) / 2]
  const topWorldPerPixel = Math.max((topMaxX-topMinX)*1.24/Math.max(1,width),(topMaxZ-topMinZ)*1.24/Math.max(1,height),.01)
  const project = (position: Vec3): [number, number] => {
    const relative = new THREE.Vector3(...position).sub(new THREE.Vector3(...viewer.position))
    if (viewer.mode === 'top') return [position[0]-topCenter[0], topCenter[1]-position[2]]
    const ground = new THREE.Vector2(relative.x, relative.z)
    return [ground.dot(groundRight), ground.dot(groundForward)]
  }
  const subjects = evaluated.filter((entity) => entity.id !== (viewer.mode === 'perspective' ? viewer.pilotCameraId : null)).map((entity) => ({ entity, local: project(entity.transform.position), radius: cameraMapEntityRadius(entity) }))
  const verticalFov = viewer.mode === 'perspective' ? viewer.verticalFovDegrees * Math.PI / 180 : 0
  const protectedWorldPerPixel = Math.max(24 / Math.max(1, width), 16 / Math.max(1, height))
  const trajectoryLocal = viewer.mode === 'perspective' ? (viewer.authoredPath || []).map(project) : []
  const expandable = [...subjects.filter(({ entity }) => entity.kind !== 'camera').map(({ local, radius }) => ({ local, radius })), ...trajectoryLocal.map((local) => ({ local, radius: 0 }))]
  const requiredWorldPerPixel = expandable.reduce((scale, { local, radius }) => Math.max(scale, (Math.abs(local[0]) + radius) / Math.max(1, width * .44), Math.max(0, local[1] + radius) / Math.max(1, height * .72), Math.max(0, -local[1] + radius) / Math.max(1, height * .16)), 0)
  const worldPerPixel = viewer.mode === 'top' ? topWorldPerPixel : Math.max(protectedWorldPerPixel, requiredWorldPerPixel)
  const horizontalFov = viewer.mode === 'perspective' ? 2 * Math.atan(Math.tan(verticalFov / 2) * width / Math.max(1, height)) : 0
  const rayEnd = (side: -1 | 1) => { const dx = side * Math.sin(horizontalFov / 2); const dy = -Math.cos(horizontalFov / 2); const tx = dx ? (side < 0 ? -apex.x / dx : (width - apex.x) / dx) : Infinity; const ty = dy ? -apex.y / dy : Infinity; const t = Math.max(0, Math.min(tx, ty)); return { x: apex.x + dx * t, y: apex.y + dy * t } }
  const left = rayEnd(-1); const right = rayEnd(1)
  const items = subjects.map(({ entity, local, radius }) => {
    const x = apex.x + local[0] / worldPerPixel; const y = apex.y - local[1] / worldPerPixel; const paintRadius = radius / worldPerPixel
    const intersects = x + paintRadius >= 0 && x - paintRadius <= width && y + paintRadius >= 0 && y - paintRadius <= height
    const contained = x - paintRadius >= 0 && x + paintRadius <= width && y - paintRadius >= 0 && y + paintRadius <= height
    const clip: CameraMapClip = viewer.mode === 'perspective' && local[1] + radius <= 0 ? 'behind' : !intersects ? 'outside' : contained ? 'inside' : 'straddling'
    const viewerYaw = Math.atan2(groundForward.x, -groundForward.y) * 180 / Math.PI
    const relativeRotation = entity.transform.rotation[1] - (viewer.mode === 'perspective' || viewer.mode === 'top' ? viewerYaw : 0)
    const angle = relativeRotation * Math.PI / 180; const halfWidth = entity.dimensions[0] * entity.transform.scale[0] / (2 * worldPerPixel); const halfDepth = entity.dimensions[2] * entity.transform.scale[2] / (2 * worldPerPixel)
    const rotatePoint = (px: number, py: number) => ({ x: x + px * Math.cos(angle) - py * Math.sin(angle), y: y + px * Math.sin(angle) + py * Math.cos(angle) })
    const polygon = (entity.kind === 'block' ? [[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [halfWidth, halfDepth], [-halfWidth, halfDepth]] : [[0, -Math.max(4, paintRadius)], [Math.max(3, paintRadius), Math.max(3, paintRadius)], [-Math.max(3, paintRadius), Math.max(3, paintRadius)]]).map(([px, py]) => rotatePoint(px, py))
    const humanParts = humanVoxelParts().map((part) => { const cx = part.center[0] * entity.transform.scale[0] / worldPerPixel; const cy = part.center[2] * entity.transform.scale[2] / worldPerPixel; const hw = part.size[0] * entity.transform.scale[0] / (2 * worldPerPixel); const hd = part.size[2] * entity.transform.scale[2] / (2 * worldPerPixel); return { role: part.role, points: [[cx - hw, cy - hd], [cx + hw, cy - hd], [cx + hw, cy + hd], [cx - hw, cy + hd]].map(([px, py]) => rotatePoint(px, py)) } })
    const shape: CameraMapShape = entity.kind === 'block' ? { kind: 'polygon', points: polygon } : entity.kind === 'camera' ? { kind: 'directional-camera', points: polygon } : entity.kind === 'human' ? { kind: 'compound-human', parts: humanParts } : { kind: 'circle', radius: paintRadius }
    return { id: entity.id, name: entity.name, kind: entity.kind, color: entity.color, x, y, radius: paintRadius, local, clip, rotation: relativeRotation, shape }
  })
  const trajectory = viewer.mode !== 'top' && viewer.mode === 'perspective' && viewer.pilotCameraId ? trajectoryLocal.map((local) => ({ x: apex.x + local[0] / worldPerPixel, y: apex.y - local[1] / worldPerPixel })) : []
  let groundCorners: Array<{ world: Vec3; map: MapPoint }> = []; let roundedPath = ''
  if (viewer.mode === 'top') {
    const halfHeight = 8 / Math.max(.05, viewer.zoom); const halfWidth = halfHeight * width / Math.max(1, height)
    groundCorners = [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [halfWidth, halfHeight], [-halfWidth, halfHeight]].map(([x, z]) => {
      const world = [viewer.target[0] + x, 0, viewer.target[2] + z] as Vec3; const local = project(world)
      return { world, map: { x: apex.x + local[0] / worldPerPixel, y: apex.y - local[1] / worldPerPixel } }
    })
    const xs = groundCorners.map((corner) => corner.map.x); const ys = groundCorners.map((corner) => corner.map.y)
    const x = Math.min(...xs); const y = Math.min(...ys); const w = Math.max(...xs) - x; const h = Math.max(...ys) - y
    const raw = `M0,0h${width}v${height}h${-width}z M${x},${y}h${w}v${h}h${-w}z`
    roundedPath = roundedMinimapMaskPath(raw, minimapCornerRadiusForZoom(viewer.zoom))
  }
  return { state: 'ready', apex, worldPerPixel, projection: { kind: viewer.mode === 'perspective' ? 'perspective' : 'orthographic', fill: viewer.mode === 'perspective' ? [apex, left, right] : [], sideRays: viewer.mode === 'perspective' ? [{ start: apex, end: left }, { start: apex, end: right }] : [], visibleClosingEdge: false, trajectory, groundCorners, roundedPath }, items }
}

export function ExactCanvasCameraMiniMap({ document, viewer = defaultViewer(), selectedIds = [], frame = 0, width, height, onSelect, onViewportChange }: { document: CameraDocument; viewer?: CameraViewerSnapshot; activeCameraId?: string | null; selectedIds?: string[]; frame?: number; width: number; height: number; onSelect?(ids: string[]): void; onViewportChange?(viewport: { x: number; y: number; zoom: number }): void }) {
  const map = useMemo(() => cameraLocalMapGeometry(document, viewer, width, height, frame), [document, frame, height, viewer, width])
  const pan = useRef<{pointerId:number;x:number;y:number;target:Vec3}|null>(null)
  return <div className="camera3d-map-owner" data-interactive="true" aria-label="Viewer scene map">
    <div className="react-flow__minimap prism-rounded-minimap camera3d-fixed-map" data-map-inset-owner="true" data-top-map-navigation={viewer.mode === 'top' ? 'true' : undefined} data-viewer-position={viewer.position.join(',')} data-viewer-target={viewer.target.join(',')} style={{ width, height }} onWheel={(event) => { if (viewer.mode !== 'top' || !onViewportChange) return; event.preventDefault(); event.stopPropagation(); onViewportChange({x:viewer.target[0],y:viewer.target[2],zoom:Math.max(.05,Math.min(64,viewer.zoom*Math.exp(-event.deltaY*.0015)))}) }} onPointerDown={(event) => { if (viewer.mode !== 'top' || event.button !== 0 || !onViewportChange) return; pan.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,target:[...viewer.target]}; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={(event) => { const drag=pan.current; if (!drag || drag.pointerId !== event.pointerId || viewer.mode !== 'top' || !onViewportChange) return; onViewportChange({x:drag.target[0]-(event.clientX-drag.x)*map.worldPerPixel,y:drag.target[2]+(event.clientY-drag.y)*map.worldPerPixel,zoom:viewer.zoom}) }} onPointerUp={(event) => { if (pan.current?.pointerId===event.pointerId) pan.current=null; if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={() => { pan.current=null }}>
      <svg className="camera3d-pov-overlay" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {viewer.mode === 'top' && map.projection.roundedPath && <g data-top-viewport-mask="true"><path d={map.projection.roundedPath} fill="rgba(9,8,14,.74)" fillRule="evenodd" /><path d={map.projection.roundedPath.slice(map.projection.roundedPath.lastIndexOf('M'))} fill="none" stroke="#a68cff" strokeWidth={.45} strokeLinecap="round" strokeLinejoin="round" /></g>}
        {map.projection.fill.length > 0 && <polygon className="camera3d-pov-wedge" points={map.projection.fill.map((point) => `${point.x},${point.y}`).join(' ')} />}{map.projection.sideRays.map((ray, index) => <line key={index} className="camera3d-pov-ray" x1={ray.start.x} y1={ray.start.y} x2={ray.end.x} y2={ray.end.y} />)}{map.projection.trajectory.length > 1 && <polyline className="camera3d-map-trajectory" points={map.projection.trajectory.map((point) => `${point.x},${point.y}`).join(' ')} />}
      </svg>
      {map.items.map((item) => { const paintRadius = Math.max(4, item.radius); const selected = selectedIds.includes(item.id); return <button key={item.id} type="button" className={`camera3d-map-entity is-${item.kind} is-${item.clip} ${selected ? 'is-selected' : ''}`} data-shape={item.shape.kind} aria-pressed={selected} aria-label={`Select ${item.name}, ${item.kind[0].toUpperCase()}${item.kind.slice(1)}, in scene map`} onClick={() => onSelect?.([item.id])} style={{ left: item.x - paintRadius, top: item.y - paintRadius, width: paintRadius * 2, height: paintRadius * 2, color: item.color, zIndex: selected ? map.items.length + 1 : undefined }}><svg viewBox={`${item.x - paintRadius} ${item.y - paintRadius} ${paintRadius * 2} ${paintRadius * 2}`} aria-hidden="true">{'points' in item.shape ? <polygon points={item.shape.points.map((point) => `${point.x},${point.y}`).join(' ')} /> : item.shape.kind === 'compound-human' ? item.shape.parts.map((part) => <polygon key={part.role} data-human-part={part.role} points={part.points.map((point) => `${point.x},${point.y}`).join(' ')} />) : <circle cx={item.x} cy={item.y} r={item.shape.radius} />}</svg>{item.kind === 'column' ? <Cylinder size={8} aria-hidden="true" /> : item.kind === 'camera' ? <Camera size={9} aria-hidden="true" /> : null}</button> })}
    </div>
  </div>
}

const AXES = ['X', 'Y', 'Z'] as const
const ROTATION = ['Pitch', 'Yaw', 'Roll'] as const
export function formatNumericDisplay(value: number | string) {
  const text = String(value)
  if (/^-?$|^\.?$|^-?\.$/.test(text)) return text
  const parsed = Number(text)
  return Number.isFinite(parsed) ? formatTransformNumeric(parsed) : text
}

export function numericScrubValue({ original, deltaPixels, step, min = -Infinity, max = Infinity, rotation = false }: { original: number; deltaPixels: number; step: number; min?: number; max?: number; rotation?: boolean }) {
  if (!Number.isFinite(original) || !Number.isFinite(deltaPixels) || !Number.isFinite(step) || step <= 0 || Math.abs(deltaPixels) < 3) return { dragging: false, value: original }
  const steps = Math.trunc(deltaPixels / 2)
  const precision = Math.max(0, (String(step).split('.')[1] || '').length)
  const raw = Number((original + steps * step).toFixed(Math.max(precision, 8)))
  const value = rotation ? normalizeRotationDegrees(raw) : Math.max(min, Math.min(max, raw))
  return { dragging: true, value }
}
function useLatestFrame<T>(publish: (value: T) => void) {
  const latest = useRef<T | null>(null); const frame = useRef<number | null>(null)
  const flush = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; const value = latest.current; latest.current = null; if (value !== null) publish(value) }
  const cancel = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; latest.current = null }
  const queue = (value: T) => { latest.current = value; if (frame.current === null) frame.current = requestAnimationFrame(() => flush()) }
  useEffect(() => cancel, [])
  return { queue, flush, cancel }
}

function PropertyActionRow({ label, disabled, readOnly = false, active, onKeyframe, onReset, onNavigate }: { label: string; disabled?: boolean; readOnly?: boolean; active?: boolean; onKeyframe(): void; onReset(): void; onNavigate?(direction: 'previous' | 'next'): void }) {
  const inert = disabled || readOnly;
  return <div className="camera3d-camera-action-row"> <button type="button" aria-label={`Previous ${label} keyframe`} disabled={inert || !onNavigate} onClick={() => !readOnly && onNavigate?.('previous')}><ChevronLeft size={13}/></button><button type="button" className={`camera3d-keyframe-button${active ? ' is-active' : ''}`} aria-label={`Keyframe ${label}`} aria-pressed={active} disabled={inert} onClick={onKeyframe}><Diamond size={13}/></button><button type="button" aria-label={`Next ${label} keyframe`} disabled={inert || !onNavigate} onClick={() => onNavigate?.('next')}><ChevronRight size={13}/></button><button type="button" className="camera3d-property-reset" aria-label={`Reset ${label}`} disabled={inert} onClick={onReset}><RotateCw size={13}/></button></div>
}
function PropertyRow({ label, value, range, disabled, readOnly = false, active = false, onDraft, onCommit, onCancel, onKeyframe, onReset, onNavigate, linked = false }: { label: string; value: number; range?: [number, number, number]; disabled?: boolean; readOnly?: boolean; active?: boolean; onDraft(value: number): void; onCommit(value: number): void; onCancel?(): void; onKeyframe(): void; onReset(): void; onNavigate?(direction: 'previous' | 'next'): void; linked?: boolean }) {
  const [draft, setDraft] = useState(formatNumericDisplay(String(value))); const skipBlurCommit = useRef(false); const wheel = useRef<HTMLDivElement>(null)
  const rotation = ROTATION.includes(label as typeof ROTATION[number]); const scrub = useRef<{ pointerId: number; startX: number; original: number; latest: number; dragging: boolean } | null>(null); const limits = range || [value - .5, value + .5, .01]; const bounded = (candidate: number) => rotation ? normalizeRotationDegrees(candidate) : Math.max(limits[0], Math.min(limits[1], candidate)); const preview = useLatestFrame(onDraft)
  const display = (text: string) => rotation && Number.isFinite(Number(text)) ? String(normalizeRotationDegrees(Number(text))) : formatNumericDisplay(text)
  useEffect(() => setDraft(display(String(value))), [value])
  const paint = (next: number, groove = 0) => { setDraft(display(String(next))); wheel.current?.style.setProperty('--groove-offset', `${groove}px`); preview.queue(next) }
  const commitDraft = (text = draft) => { if (readOnly) return; const parsed = Number(text); if (text.trim() && Number.isFinite(parsed)) { preview.flush(); onCommit(bounded(parsed)) } else setDraft(display(String(value))) }
  const cancelScrub = (element: HTMLElement) => { const current = scrub.current; if (!current) return; preview.cancel(); setDraft(display(String(current.original))); wheel.current?.style.setProperty('--groove-offset', '0px'); if (onCancel) onCancel(); else onDraft(current.original); if (element.hasPointerCapture?.(current.pointerId)) element.releasePointerCapture(current.pointerId); scrub.current = null }
  const nudge = (direction: -1 | 1) => { if (readOnly) return; const next = bounded((Number.isFinite(Number(draft)) ? Number(draft) : value) + direction * limits[2]); paint(next); preview.flush(); onCommit(next) }
  return <label className={`camera3d-transform-property inspector-wide${ROTATION.includes(label as typeof ROTATION[number]) ? ' camera3d-rotation-property' : ''}${linked ? ' is-linked' : ''}`}>{linked && <span className="camera3d-linked-status" aria-hidden="true"><Link2 size={12} /></span>}<span>{label}</span><div className="camera3d-transform-controls"><div ref={wheel} className={`camera3d-scrub-wheel${linked ? ' is-linked' : ''}`} role="slider" tabIndex={disabled || readOnly ? -1 : 0} aria-label={`${label} slider`} aria-valuemin={limits[0]} aria-valuemax={limits[1]} aria-valuenow={bounded(value)} aria-valuetext={String(bounded(value))} aria-disabled={disabled || readOnly} aria-readonly={readOnly || undefined} onWheel={(event) => { if (disabled || document.activeElement !== event.currentTarget) return; event.preventDefault(); nudge(event.deltaY > 0 ? -1 : 1) }} onKeyDown={(event) => { if (disabled) return; if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); nudge(-1) } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); nudge(1) } else if (event.key === 'Escape') { event.preventDefault(); cancelScrub(event.currentTarget) } }} onPointerDown={(event) => { if (disabled || readOnly || event.button !== 0) return; event.currentTarget.focus(); scrub.current = { pointerId: event.pointerId, startX: event.clientX, original: value, latest: value, dragging: false }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={(event) => { const current = scrub.current; if (!current || current.pointerId !== event.pointerId) return; const next = numericScrubValue({ original: current.original, deltaPixels: event.clientX - current.startX, step: limits[2], min: limits[0], max: limits[1], rotation }); if (!next.dragging) return; current.dragging = true; current.latest = next.value; paint(next.value, (event.clientX - current.startX) % 4) }} onPointerUp={(event) => { const current = scrub.current; if (!current || current.pointerId !== event.pointerId) return; preview.flush(); if (current.dragging) onCommit(current.latest); if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); scrub.current = null }} onPointerCancel={(event) => cancelScrub(event.currentTarget)} onLostPointerCapture={(event) => { if (scrub.current) cancelScrub(event.currentTarget) }}><i aria-hidden="true" /></div><input className={linked ? 'camera3d-linked-value' : undefined} aria-label={`${label} value`} type="text" inputMode="decimal" value={draft} readOnly={readOnly} disabled={disabled} aria-readonly={readOnly || undefined} aria-disabled={disabled || readOnly || undefined} onFocus={(event) => event.currentTarget.classList.add('is-editing')} onChange={(event) => setDraft(event.target.value)} onInput={(event) => setDraft(event.currentTarget.value)} onBlur={(event) => { event.currentTarget.classList.remove('is-editing'); commitDraft(event.currentTarget.value) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitDraft(event.currentTarget.value); event.currentTarget.blur() } else if (event.key === 'Escape') { event.preventDefault(); preview.cancel(); onCancel?.(); setDraft(formatNumericDisplay(String(value))); event.currentTarget.blur() } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); const base = Number.isFinite(Number(draft)) ? Number(draft) : value; setDraft(String(bounded(base + (event.key === 'ArrowUp' ? limits[2] : -limits[2])))) } }} /></div><PropertyActionRow label={label} disabled={disabled || readOnly} active={active} onKeyframe={readOnly ? () => undefined : onKeyframe} onReset={readOnly ? () => undefined : onReset} onNavigate={readOnly ? undefined : onNavigate}/></label>
}

function TransformNumber({ label, value, disabled, readOnly = false, linked = false, min, max = Infinity, step = .01, onPreview, onCancel, onCommit }: { label: string; value: number; disabled?: boolean; readOnly?: boolean; linked?: boolean; min?: number; max?: number; step?: number; onPreview?(value: number): void; onCancel?(): void; onCommit(value: number): void }) {
  const [draft, setDraft] = useState(formatNumericDisplay(String(value))); const wheelOrigin = useRef<number | null>(null); const wheelTimer = useRef<number | null>(null); const preview = useLatestFrame(onPreview || (() => {}))
  const scrub = useRef<{ pointerId: number; startX: number; original: number; latest: number; dragging: boolean } | null>(null)
  const skipBlurCommit = useRef(false)
  useEffect(() => { if (!scrub.current) setDraft(formatNumericDisplay(String(value))); wheelOrigin.current = null }, [value])
  useEffect(() => () => { if (wheelTimer.current !== null) clearTimeout(wheelTimer.current) }, [])
  const bounded = (candidate: number) => Math.max(min ?? -Infinity, Math.min(max, candidate))
  const commit = () => { if (readOnly) return; const parsed = Number(draft); if (draft.trim() && Number.isFinite(parsed) && (min === undefined || parsed >= min)) onCommit(bounded(parsed)); else setDraft(formatNumericDisplay(String(value))) }
  const nudge = (direction: -1 | 1) => { if (readOnly) return undefined; const base = Number.isFinite(Number(draft)) ? Number(draft) : value; const next = bounded(Number((base + direction * step).toFixed(8))); setDraft(formatNumericDisplay(String(next))); preview.queue(next); return next }
  const cancelScrub = (element: HTMLInputElement) => { const current = scrub.current; if (!current) return false; preview.cancel(); setDraft(formatNumericDisplay(String(current.original))); onCancel?.(); if (element.hasPointerCapture?.(current.pointerId)) element.releasePointerCapture(current.pointerId); scrub.current = null; skipBlurCommit.current = true; return true }
  return <input className={linked ? 'camera3d-linked-value' : undefined} aria-label={`${label} value`} type="text" inputMode="decimal" value={draft} readOnly={readOnly} disabled={disabled} aria-readonly={readOnly || undefined} aria-disabled={disabled || readOnly || undefined} onChange={(event) => setDraft(formatNumericDisplay(event.target.value))} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); cancelScrub(event.currentTarget) } }} onPointerDown={(event) => { if (disabled || readOnly || event.button !== 0) return; scrub.current = { pointerId: event.pointerId, startX: event.clientX, original: value, latest: value, dragging: false }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={(event) => { const current = scrub.current; if (!current || current.pointerId !== event.pointerId) return; const next = numericScrubValue({ original: current.original, deltaPixels: event.clientX - current.startX, step, min, max }); if (!next.dragging) return; event.preventDefault(); current.dragging = true; current.latest = next.value; setDraft(String(next.value)); onPreview?.(next.value) }} onPointerUp={(event) => { const current = scrub.current; if (!current || current.pointerId !== event.pointerId) return; if (current.dragging) onCommit(current.latest); if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); scrub.current = null }} onPointerCancel={(event) => { cancelScrub(event.currentTarget) }} onLostPointerCapture={(event) => { if (scrub.current) cancelScrub(event.currentTarget) }} onWheel={(event) => { if (disabled || !event.currentTarget.matches(':hover,:focus')) return; event.preventDefault(); wheelOrigin.current ??= value; const next = nudge(event.deltaY > 0 ? -1 : 1); if (next === undefined) return; if (wheelTimer.current !== null) clearTimeout(wheelTimer.current); wheelTimer.current = window.setTimeout(() => { preview.flush(); onCommit(next); wheelOrigin.current = null; wheelTimer.current = null }, 180) }} onBlur={() => { if (skipBlurCommit.current) { skipBlurCommit.current = false; return } if (wheelTimer.current !== null) { clearTimeout(wheelTimer.current); wheelTimer.current = null; preview.flush(); onCommit(Number(draft)); wheelOrigin.current = null } else commit() }} />
}

function AxisTransformRow({ label, values, disabled, active, link, onLink, onPreview, onCancel, onValue, onKeyframe, onReset, onNavigate }: { label: string; values: Vec3; disabled?: boolean; active: boolean; link?: boolean; onLink?(): void; onPreview?(index: number, value: number): void; onCancel?(): void; onValue(index: number, value: number): void; onKeyframe(): void; onReset(): void; onNavigate?(direction: 'previous' | 'next'): void }) {
  return <div className="camera3d-axis-row inspector-wide"><div className="camera3d-axis-label">{onLink && <button type="button" className="camera3d-scale-link" aria-label={link ? 'Unlink Scale axes' : 'Link Scale axes'} title={link ? 'Unlink Scale axes' : 'Link Scale axes'} aria-pressed={link} disabled={disabled} onClick={onLink}>{link ? <Link2 size={11} /> : <Unlink2 size={11} />}</button>}<span>{label}</span></div><div className="camera3d-axis-fields">{AXES.map((axis, index) => <label key={axis}><span>{axis}</span><TransformNumber label={`${label} ${axis}`} value={values[index]} min={label === 'Scale' ? .001 : undefined} disabled={disabled} onPreview={(value) => onPreview?.(index, value)} onCancel={onCancel} onCommit={(value) => onValue(index, value)} /></label>)}</div><PropertyActionRow label={label} disabled={disabled} active={active} onKeyframe={onKeyframe} onReset={onReset} onNavigate={onNavigate}/></div>
}

function DraftNumberInput({ label, value, min, step = 1, disabled, onCommit }: { label: string; value: number; min?: number; step?: number; disabled?: boolean; onCommit(value: number): void }) { return <TransformNumber label={label.replace(/ value$/, '')} value={value} min={min} disabled={disabled} onCommit={onCommit} /> }

export function CameraTransformInspector({ entity, frame, disabled, scaleLinked = true, onScaleLinkedChange, onTransformLock, onRotationLock, onDraft, onCommit, onDimensions, onRadius, onHeight, onKeyframe, onReset, onNavigateKeyframe, onResetTransform, onResetRotation, onCancelPreview }: { entity: SceneEntity; frame: number; disabled: boolean; scaleLinked?: boolean; onScaleLinkedChange?(linked: boolean): void; onTransformLock?(): void; onRotationLock?(): void; onDraft(transform: Transform): void; onCommit(transform: Transform): void; onDimensions?(dimensions: Vec3): void; onRadius?(radius: number): void; onHeight?(height: number): void; onKeyframe(property: string): void; onReset(property: string): void; onNavigateKeyframe?(property: string, direction: 'previous' | 'next'): void; onResetTransform?(): void; onResetRotation?(): void; onCancelPreview?(): void }) {
  const transformLocked = Boolean(entity.locks?.all || entity.locks?.transform); const rotationLocked = Boolean(entity.locks?.all || entity.locks?.rotation); const unavailable = disabled || transformLocked; const rotationUnavailable = disabled || rotationLocked; const keyed = (property: string) => entity.keyframes.some((keyframe) => keyframe.frame === frame && (keyframe.property === property || keyframe.property?.startsWith(`${property}.`))); const patchPart = (part: 'position' | 'rotation', index: number, value: number) => { const next = structuredClone(entity.transform); next[part][index] = value; return next }; const anchor = entity.transform.anchor || [0, 0, 0]; const targeted = entity.kind === 'camera' && entity.camera?.target.mode !== 'free'
 useLayoutEffect(() => {
   const frameId = requestAnimationFrame(() => {
     const axes = ['X', 'Y', 'Z']
     const positionInputs = axes.map((axis) => globalThis.document.querySelector<HTMLInputElement>(`[aria-label="Position ${axis} value"]`))
     const anchorInputs = axes.map((axis) => globalThis.document.querySelector<HTMLInputElement>(`[aria-label="Anchor Point ${axis} value"]`))
     const positionFields = positionInputs[0]?.closest<HTMLElement>('.camera3d-axis-fields')
     const anchorFields = anchorInputs[0]?.closest<HTMLElement>('.camera3d-axis-fields')
     if (positionFields && anchorFields && positionInputs.every(Boolean) && anchorInputs.every(Boolean)) {
       const positionRect = positionFields.getBoundingClientRect(); const anchorRect = anchorFields.getBoundingClientRect(); const positionStyle = getComputedStyle(positionFields)
       anchorFields.style.setProperty('width', `${positionRect.width}px`, 'important'); anchorFields.style.setProperty('min-width', `${positionRect.width}px`, 'important'); anchorFields.style.setProperty('max-width', `${positionRect.width}px`, 'important'); anchorFields.style.setProperty('grid-template-columns', positionStyle.gridTemplateColumns, 'important'); anchorFields.style.setProperty('column-gap', positionStyle.columnGap, 'important'); anchorFields.style.setProperty('position', 'relative', 'important'); anchorFields.style.setProperty('left', `${positionRect.left - anchorRect.left}px`, 'important')
       axes.forEach((_, index) => { const width = `${positionInputs[index]!.getBoundingClientRect().width}px`; anchorInputs[index]!.style.setProperty('width', width, 'important'); anchorInputs[index]!.style.setProperty('min-width', width, 'important'); anchorInputs[index]!.style.setProperty('max-width', width, 'important') })
     }
     const owner = globalThis.document.querySelector<HTMLInputElement>('[aria-label="Position Z value"]'); const rotations = ['Pitch', 'Yaw', 'Roll'].map((axis) => globalThis.document.querySelector<HTMLInputElement>(`[aria-label="${axis} value"]`)); const ownerStyle = owner && getComputedStyle(owner)
     if (owner && ownerStyle && rotations.every(Boolean)) {
       const properties = ['width','min-width','max-width','height','min-height','max-height','padding-left','padding-right','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-color','border-right-color','border-bottom-color','border-left-color','border-radius','background-color','box-shadow','color','font-family','font-size','font-weight','line-height','letter-spacing','text-align']
       for (const input of rotations) for (const property of properties) input!.style.setProperty(property, ownerStyle.getPropertyValue(property), 'important')
     }
     const positionX = globalThis.document.querySelector<HTMLInputElement>('[aria-label="Position X value"]'); const positionY = globalThis.document.querySelector<HTMLInputElement>('[aria-label="Position Y value"]'); const positionZ = globalThis.document.querySelector<HTMLInputElement>('[aria-label="Position Z value"]')
     const sliders = ['Pitch','Yaw','Roll'].map((axis) => globalThis.document.querySelector<HTMLElement>(`[aria-label="${axis} slider"]`))
     if (positionX && positionY && positionZ && sliders.every(Boolean)) {
       const xRect = positionX.getBoundingClientRect(); const yRight = positionY.getBoundingClientRect().right; const zRect = positionZ.getBoundingClientRect()
       for (const slider of sliders) {
         const row = slider!.closest<HTMLElement>('.camera3d-rotation-property'); const controls = slider!.closest<HTMLElement>('.camera3d-transform-controls'); const numeric = controls?.querySelector<HTMLInputElement>('input[type="text"]')
         if (!row || !controls || !numeric) continue
         const rowRect = row.getBoundingClientRect(); const linked = Boolean(row.querySelector('.camera3d-linked-status')); const sliderLeft = xRect.left - rowRect.left; const sliderWidth = Math.max(32, yRight - xRect.left); const numericLeft = zRect.left - rowRect.left; const numericWidth = zRect.width; const spacer = Math.max(0, numericLeft - sliderLeft - (linked ? sliderWidth + 18 : sliderWidth))
         controls.style.setProperty('display', 'grid', 'important'); controls.style.setProperty('position', 'absolute', 'important'); controls.style.setProperty('left', `${sliderLeft}px`, 'important'); controls.style.removeProperty('right'); controls.style.setProperty('top', '0px', 'important'); controls.style.setProperty('width', `${numericLeft + numericWidth - sliderLeft}px`, 'important'); controls.style.setProperty('min-width', `${numericLeft + numericWidth - sliderLeft}px`, 'important'); controls.style.setProperty('max-width', `${numericLeft + numericWidth - sliderLeft}px`, 'important'); controls.style.setProperty('grid-template-columns', `${linked ? sliderWidth + 18 : sliderWidth}px ${numericWidth}px`, 'important'); controls.style.setProperty('column-gap', `${spacer}px`, 'important'); controls.style.setProperty('grid-column', '1 / -1', 'important'); controls.style.setProperty('transform', 'none', 'important')
         if (linked) { const icon = row.querySelector<HTMLElement>('.camera3d-linked-status'); icon?.style.setProperty('left', `${sliderLeft}px`, 'important'); icon?.style.setProperty('top', '0px', 'important') }
         slider!.style.setProperty('position', 'static', 'important'); slider!.style.removeProperty('left'); slider!.style.setProperty('transform', 'none', 'important'); slider!.style.setProperty('width', `${sliderWidth}px`, 'important'); slider!.style.setProperty('min-width', `${sliderWidth}px`, 'important'); slider!.style.setProperty('max-width', `${sliderWidth}px`, 'important'); slider!.style.setProperty('margin-left', linked ? '18px' : '0px', 'important')
         numeric.style.setProperty('position', 'static', 'important'); numeric.style.removeProperty('left'); numeric.style.setProperty('transform', 'none', 'important'); numeric.style.setProperty('width', `${numericWidth}px`, 'important'); numeric.style.setProperty('min-width', `${numericWidth}px`, 'important'); numeric.style.setProperty('max-width', `${numericWidth}px`, 'important')
       }
     }
    })
   return () => cancelAnimationFrame(frameId)
 }, [entity.id])
 return <><section className={`inspector-section camera3d-transform-section${entity.kind === 'camera' ? ' camera3d-camera-transform-section' : ''}`}><div className="camera3d-transform-header"><label>Transform</label><button type="button" className="camera3d-location-lock-button" aria-label={transformLocked ? 'Unlock Transform' : 'Lock Transform'} title={transformLocked ? 'Unlock Transform' : 'Lock Transform'} aria-pressed={transformLocked} disabled={disabled || !onTransformLock} onClick={onTransformLock}>{transformLocked ? <Lock size={13}/> : <Unlock size={13}/>}</button><button type="button" className="camera3d-property-reset camera3d-reset-transform" aria-label="Reset Transform" disabled={unavailable} onClick={onResetTransform}><RotateCw size={13} /></button></div><div className="inspector-grid camera3d-transform-grid">
    <AxisTransformRow label="Position" values={entity.transform.position} active={keyed('position')} disabled={unavailable} onPreview={(index, value) => onDraft(patchPart('position', index, value))} onCancel={onCancelPreview} onValue={(index, value) => onCommit(patchPart('position', index, value))} onKeyframe={() => onKeyframe('position')} onNavigate={(direction) => onNavigateKeyframe?.('position', direction)} onReset={() => onCommit({ ...structuredClone(entity.transform), position: [0, 0, 0] })} />
    {entity.kind !== 'camera' && <AxisTransformRow label="Scale" values={entity.transform.scale} link={scaleLinked} onLink={() => onScaleLinkedChange?.(!scaleLinked)} disabled={unavailable} active={keyed('scale')} onPreview={(index, value) => onDraft(scaleTransformAxis(entity.transform, index, value, scaleLinked))} onCancel={onCancelPreview} onValue={(index, value) => onCommit(scaleTransformAxis(entity.transform, index, value, scaleLinked))} onKeyframe={() => onKeyframe('scale')} onNavigate={(direction) => onNavigateKeyframe?.('scale', direction)} onReset={() => onCommit({ ...structuredClone(entity.transform), scale: [1, 1, 1] })} />}
    <AxisTransformRow label="Anchor Point" values={anchor as Vec3} active={keyed('anchor')} disabled={unavailable} onPreview={(index, value) => { const next = [...anchor] as Vec3; next[index] = value; onDraft(reanchorTransform(entity.transform, next)) }} onCancel={onCancelPreview} onValue={(index, value) => { const next = [...anchor] as Vec3; next[index] = value; onCommit(reanchorTransform(entity.transform, next)) }} onKeyframe={() => onKeyframe('anchor')} onNavigate={(direction) => onNavigateKeyframe?.('anchor', direction)} onReset={() => onCommit(reanchorTransform(entity.transform, [0, 0, 0]))} />
    {entity.kind === 'block' && <><div className="inspector-wide camera3d-inspector-subhead">Dimensions</div>{AXES.map((axis, index) => <PropertyRow key={axis} label={`Dimension ${axis}`} value={entity.dimensions[index]} range={[.25, 100, .05]} active={keyed(`dimensions.${axis.toLowerCase()}`)} disabled={unavailable || entity.resizeLocked} onCancel={onCancelPreview} onDraft={() => {}} onCommit={(value) => { const dimensions = [...entity.dimensions] as Vec3; dimensions[index] = Math.max(.25, value); onDimensions?.(dimensions) }} onKeyframe={() => onKeyframe(`dimensions.${axis.toLowerCase()}`)} onReset={() => onReset(`dimensions.${axis.toLowerCase()}`)} />)}</>}
    {entity.kind === 'column' && <><div className="inspector-wide camera3d-inspector-subhead">Radius / Height</div><PropertyRow label="Radius" value={entity.dimensions[0] / 2} range={[.25, 50, .05]} active={keyed('radius')} disabled={unavailable || entity.resizeLocked} onCancel={onCancelPreview} onDraft={() => {}} onCommit={(value) => onRadius?.(Math.max(.25, value))} onKeyframe={() => onKeyframe('radius')} onReset={() => onReset('radius')} /><PropertyRow label="Height" value={entity.dimensions[1]} range={[.25, 100, .05]} active={keyed('height')} disabled={unavailable || entity.resizeLocked} onCancel={onCancelPreview} onDraft={() => {}} onCommit={(value) => onHeight?.(Math.max(.25, value))} onKeyframe={() => onKeyframe('height')} onReset={() => onReset('height')} /></>}
    {entity.kind === 'sphere' && <><div className="inspector-wide camera3d-inspector-subhead">Radius</div><PropertyRow label="Radius" value={entity.dimensions[0] / 2} range={[.25, 50, .05]} active={keyed('radius')} disabled={unavailable || entity.resizeLocked} onCancel={onCancelPreview} onDraft={() => {}} onCommit={(value) => onRadius?.(Math.max(.25, value))} onKeyframe={() => onKeyframe('radius')} onReset={() => onReset('radius')} /></>}
    {['block', 'sphere', 'column'].includes(entity.kind) && <small className="inspector-wide">Resize Lock: {entity.resizeLocked ? 'Locked' : 'Unlocked'}</small>}
  </div></section>
  <section className="inspector-section camera3d-rotation-section"><div className="inspector-wide camera3d-transform-divider" role="separator" /><div className="camera3d-transform-header"><label>Rotation</label><button type="button" className="camera3d-location-lock-button" aria-label={rotationLocked ? 'Unlock Rotation' : 'Lock Rotation'} title={rotationLocked ? 'Unlock Rotation' : 'Lock Rotation'} aria-pressed={rotationLocked} disabled={disabled || !onRotationLock} onClick={onRotationLock}>{rotationLocked ? <Lock size={13}/> : <Unlock size={13}/>}</button><button type="button" className="camera3d-property-reset camera3d-reset-transform" aria-label="Reset Rotation" disabled={rotationUnavailable || !onResetRotation} onClick={onResetRotation}><RotateCw size={13} /></button></div><div className="inspector-grid camera3d-rotation-grid">{ROTATION.map((label, index) => <PropertyRow key={label} label={label} value={entity.transform.rotation[index]} range={[-180, 180, 1]} active={keyed(`rotation.${AXES[index].toLowerCase()}`)} disabled={rotationUnavailable || targeted && index < 2} readOnly={targeted && index < 2} onCancel={onCancelPreview} onDraft={(value) => onDraft(patchPart('rotation', index, value))} onCommit={(value) => onCommit(patchPart('rotation', index, value))} onKeyframe={() => onKeyframe(`rotation.${AXES[index].toLowerCase()}`)} onNavigate={(direction) => onNavigateKeyframe?.(`rotation.${AXES[index].toLowerCase()}`, direction)} onReset={() => onReset(`rotation.${AXES[index].toLowerCase()}`)} linked={targeted && index < 2} />)}</div></section></>
}

export function CameraOpticsInspector({ entity, entities, disabled = false, frame = 0, durationSeconds, fps = 24, shotBoundary, onBoundaryChange, onDurationFrames, onChange, onTargetKeyframe, onMovementKeyframe, onFocalKeyframe, onDurationKeyframe, onResetProperty, onResetDuration, onMasterReset, onSectionKeyframe, onSettingsLock, onNavigateKeyframe }: { entity: SceneEntity; entities: SceneEntity[]; disabled?: boolean; frame?: number; durationSeconds?: number; fps?: number; shotBoundary?: 'cut' | 'continue'; onBoundaryChange?(boundary: 'cut' | 'continue'): void; onDurationFrames?(frames: number): void; onChange(entity: SceneEntity): void; onTargetKeyframe?(): void; onMovementKeyframe?(): void; onFocalKeyframe?(): void; onDurationKeyframe?(): void; onResetProperty?(property: 'camera.focalLength' | 'camera.movement' | 'camera.target'): void; onResetDuration?(): void; onMasterReset?(): void; onSectionKeyframe?(): void; onSettingsLock?(): void; onNavigateKeyframe?(property: 'camera.focalLength' | 'camera.movement' | 'camera.target', direction: 'previous' | 'next'): void }) {
  const metadata = entity.camera!
  useLayoutEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const positionX = globalThis.document.querySelector<HTMLInputElement>('[aria-label="Position X value"]'); const xCell = positionX?.closest<HTMLElement>('label')
      const controls = ['Focal Length','Camera Duration (seconds)','Camera Movement','Target'].map((label) => globalThis.document.querySelector<HTMLElement>(`[aria-label="${label}"]`))
      if (!xCell || controls.some((control) => !control)) return
      const targetLeft = xCell.getBoundingClientRect().left
      for (const control of controls) { const rect = control!.getBoundingClientRect(); const width = `${rect.right - targetLeft}px`; control!.style.setProperty('position','relative','important'); control!.style.setProperty('left',`${targetLeft - rect.left}px`,'important'); control!.style.setProperty('width',width,'important'); control!.style.setProperty('min-width',width,'important'); control!.style.setProperty('max-width',width,'important') }
      const duration = controls[1]; const continuity = globalThis.document.querySelector<HTMLElement>('[aria-label="Continuity"]'); const continuityLabel = continuity?.closest('.adaptive-control-label')?.querySelector<HTMLElement>('span')
      if (duration && continuity && continuityLabel) { const durationRect = duration.getBoundingClientRect(); const labelRect = continuityLabel.getBoundingClientRect(); const continuityRect = continuity.getBoundingClientRect(); const labelLeft = durationRect.right + 10; const controlLeft = labelLeft + labelRect.width + 10; const width = `${continuityRect.right - controlLeft}px`; continuityLabel.style.setProperty('position','relative','important'); continuityLabel.style.setProperty('left',`${labelLeft - labelRect.left}px`,'important'); continuity.style.setProperty('position','relative','important'); continuity.style.setProperty('left',`${controlLeft - continuityRect.left}px`,'important'); continuity.style.setProperty('width',width,'important'); continuity.style.setProperty('min-width',width,'important'); continuity.style.setProperty('max-width',width,'important') }
    })
    return () => cancelAnimationFrame(frameId)
  }, [entity.id, durationSeconds, shotBoundary])
  const lockables = entities.filter((item) => item.kind === 'human' || item.kind === 'block' || item.kind === 'sphere')
  const optical = cameraFov(metadata.focalLength, '16:9', metadata.near, metadata.far)
  const settingsLocked = Boolean(entity.locks?.all || entity.locks?.settings)
  const cameraDisabled = disabled || settingsLocked
  const patch = (apply: (next: SceneEntity) => void) => { if (cameraDisabled) return; const next = structuredClone(entity); apply(next); onChange(next) }
  const movementOptions = cameraMovementOptions().map((option) => { const owner = CAMERA_MOVEMENT_GROUPS.find((group) => group.options.some(([id]) => normalizeCameraMovement(id) === option.id)); const source = owner?.options.find(([id]) => normalizeCameraMovement(id) === option.id); return { value: option.id, label: option.label, group: owner?.label, title: source?.[1] } })
  const targetOptions = [{ value: 'none', label: 'None' }, ...lockables.map((item) => ({ value: item.id, label: item.name }))]
  return <section className="inspector-section camera3d-camera-settings camera3d-camera-section"><div className="inspector-wide camera3d-transform-divider camera3d-camera-pre-divider" role="separator" /><div className="camera3d-section-heading"><label>Camera</label>{onSettingsLock && <button type="button" className="camera3d-location-lock-button" aria-label={settingsLocked ? 'Unlock Camera Settings' : 'Lock Camera Settings'} title={settingsLocked ? 'Unlock Camera Settings' : 'Lock Camera Settings'} aria-pressed={settingsLocked} disabled={disabled} onClick={onSettingsLock}>{settingsLocked ? <Lock size={13}/> : <Unlock size={13}/>}</button>}{onMasterReset && <button type="button" className="camera3d-property-reset" aria-label="Reset Camera Settings" disabled={cameraDisabled} onClick={cameraDisabled ? undefined : onMasterReset}><RotateCw size={13} /></button>}</div><div className="inspector-grid">
    <div className="inspector-wide camera3d-keyframe-control primary-node-controls"><label className="adaptive-control-label"><span>Focal Length</span><StoryboardCompactSelect label="Focal Length" value={String(metadata.focalLength)} disabled={cameraDisabled} options={CAMERA_FOCAL_LENGTHS.map((value) => ({ value: formatNumericDisplay(String(value)), label: `${value} mm` }))} onChange={(value) => patch((next) => { next.camera!.focalLength = Number(value) })} /></label><PropertyActionRow label="Focal Length" disabled={cameraDisabled} onKeyframe={cameraDisabled ? () => undefined : onFocalKeyframe || (() => undefined)} onReset={cameraDisabled ? () => undefined : () => onResetProperty?.('camera.focalLength')} onNavigate={(direction) => onNavigateKeyframe?.('camera.focalLength', direction)}/></div>
    {(durationSeconds !== undefined || shotBoundary && onBoundaryChange) && <FluidControlGroup
      className="camera3d-balanced-row inspector-wide"
      ariaLabel="Camera Duration and Continuity"
      gap={6}
      recalculationKey={`${durationSeconds ?? ''}:${shotBoundary ?? ''}`}
      allocation={{ minRows: 1, maxRows: 1 }}
      controls={[
        ...(durationSeconds !== undefined ? [{ id: 'duration' as const, kind: 'selector' as const, intrinsicWidth: 96, minimumWidth: 88, preferredWidth: 112, defaultLabel: `${durationSeconds}s`, node: <label className="adaptive-control-label camera3d-keyframe-control primary-node-controls"><span>Duration</span><input aria-label="Camera Duration (seconds)" type="number" min={.5} step={.5} value={Number(durationSeconds).toFixed(1)} disabled={cameraDisabled} onChange={(event) => { if (!cameraDisabled) onDurationFrames?.(Math.max(.5, Number(event.target.value) || .5) * fps) }} /></label> }] : []),
        ...(shotBoundary && onBoundaryChange ? [{ id: 'continuity' as const, kind: 'selector' as const, intrinsicWidth: 112, minimumWidth: 96, preferredWidth: 128, defaultLabel: shotBoundary, node: <label className="adaptive-control-label camera3d-keyframe-control camera3d-boundary-control primary-node-controls"><span>Continuity</span><StoryboardCompactSelect label="Continuity" value={shotBoundary} disabled={cameraDisabled} options={[{ value: 'cut', label: 'Cut' }, { value: 'continue', label: 'Continue' }]} onChange={(value) => { if (!cameraDisabled) onBoundaryChange(value as 'cut' | 'continue') }} /></label> }] : []),
      ]}
    />}

    <div className="inspector-wide camera3d-keyframe-control primary-node-controls"><label className="adaptive-control-label"><span>Movement</span><StoryboardCompactSelect label="Camera Movement" value={normalizeCameraMovement(metadata.movement)} disabled={cameraDisabled} options={movementOptions} help="Timing controls speed; Movement Type controls path and rig character." onChange={(value) => patch((next) => { next.camera!.movement = normalizeCameraMovement(value) })} /></label><PropertyActionRow label="Camera Movement" disabled={cameraDisabled} onKeyframe={cameraDisabled ? () => undefined : onMovementKeyframe || (() => undefined)} onReset={cameraDisabled ? () => undefined : () => onResetProperty?.('camera.movement')} onNavigate={(direction) => onNavigateKeyframe?.('camera.movement', direction)}/></div>
    <div className={`inspector-wide camera3d-keyframe-control camera3d-target-control ${metadata.target.mode === 'free' ? 'is-single' : ''}`}><label className="adaptive-control-label"><span>Target</span><StoryboardCompactSelect label="Target" value={metadata.target.mode === 'free' || metadata.target.mode === 'point' ? 'none' : metadata.target.entityId} disabled={cameraDisabled} options={targetOptions} onChange={(value) => { if (cameraDisabled) return; onChange(value === 'none' ? setCameraAimMode(entity, 'free', entities) : setCameraLockTarget(entity, value, entities)) }} /></label><PropertyActionRow label="Target" disabled={cameraDisabled} onKeyframe={cameraDisabled ? () => undefined : onTargetKeyframe || (() => undefined)} onReset={cameraDisabled ? () => undefined : () => onResetProperty?.('camera.target')} onNavigate={(direction) => onNavigateKeyframe?.('camera.target', direction)}/></div>
    <div className="camera3d-lens-readouts"><label>Horizontal FOV<output><span>{optical.horizontalDegrees.toFixed(1)}°</span></output></label><label>Vertical FOV<output><span>{optical.verticalDegrees.toFixed(1)}°</span></output></label></div>
  </div></section>
}


export function CameraShotSettings({ document, shotId, disabled, overflow, includeDuration = true, includeBoundary = true, includeShotSize = true, onChange, onDurationFrames }: { document: CameraDocument; shotId: string; disabled: boolean; overflow?: { count: number; minFrame: number; maxFrame: number } | null; includeDuration?: boolean; includeBoundary?: boolean; includeShotSize?: boolean; onChange(document: CameraDocument): void; onDurationFrames(frames: number): void }) {
  const shot = document.shots.find((item) => item.id === shotId) || document.shots[0]
  const patchShot = (updates: Partial<typeof shot>) => onChange({ ...document, shots: document.shots.map((item) => item.id === shot.id ? { ...item, ...updates } : item) })
  const seconds = shot.duration || (shot.endFrame - shot.startFrame) / document.fps
  const controls: FluidGroupControl<'name'|'boundary'|'size'|'duration'>[] = [
    { id:'name' as const,kind:'selector',intrinsicWidth:128,minimumWidth:112,preferredWidth:180,maximumExtraWidth:80,defaultLabel:shot.name,node:<label className="camera3d-adaptive-field">Name<input value={shot.name} disabled={disabled} onChange={(event) => patchShot({ name: event.target.value })}/></label> },
    ...(includeBoundary ? [{ id:'boundary' as const,kind:'selector' as const,intrinsicWidth:128,minimumWidth:118,preferredWidth:138,maximumExtraWidth:30,defaultLabel:shot.boundary,node:<label className="camera3d-adaptive-field"><span>Cut / Continue</span><ShotBoundaryChoice shotId={shot.id} name={shot.name} value={shot.boundary} disabled={disabled} onChange={(boundary) => patchShot({boundary})}/></label> }] : []),
    ...(includeShotSize ? [{ id:'size' as const,kind:'selector' as const,intrinsicWidth:118,minimumWidth:104,preferredWidth:138,maximumExtraWidth:40,defaultLabel:shot.shotSize,node:<label className="camera3d-adaptive-field"><span>Shot Size</span><StoryboardCompactSelect label="Shot Size" value={shot.shotSize} disabled={disabled} options={STORYBOARD_SHOT_SIZE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} onChange={(value) => patchShot({ shotSize: value })}/></label> }] : []),
    ...(includeDuration ? [{ id:'duration' as const,kind:'selector' as const,intrinsicWidth:104,minimumWidth:94,preferredWidth:112,maximumExtraWidth:30,defaultLabel:`${seconds}s`,node:<label className="camera3d-adaptive-field"><span>Duration (s)</span><input aria-label="Duration (seconds)" type="number" min={.5} step={.5} value={seconds} disabled={disabled} onChange={(event)=>onDurationFrames(Math.max(.5,Number(event.target.value)||.5)*document.fps)}/></label> }] as FluidGroupControl<'name'|'boundary'|'size'|'duration'>[] : []),
  ]
  return <section className="inspector-section camera3d-shot-settings"><label>SHOT SETTINGS</label><FluidControlGroup controls={controls} recalculationKey={`${shot.id}:${shot.name}:${shot.boundary}:${shot.shotSize}:${seconds}`} className="camera3d-shot-fluid-controls" ariaLabel="Shot Camera Settings" gap={6}/>
    {overflow && <p className="camera3d-shot-overflow inspector-wide" role="alert">Cannot shorten: {overflow.count} keyframe{overflow.count === 1 ? '' : 's'} at frames {overflow.minFrame}–{overflow.maxFrame} would overflow.</p>}
  </section>
}

export type SceneMenuTarget = 'empty' | 'object' | 'selection' | 'camera' | 'group'
export type ShotMenuCommand = 'clip-color' | 'copy' | 'cut' | 'paste-after' | 'duplicate' | 'delete'
export const SHOT_CLIP_COLORS: Array<{ id: ShotClipColor; name: string; hex: string | null }> = [
  { id: 'clear', name: 'Clear Color', hex: null },
  { id: 'orange', name: 'Orange', hex: '#fd6000' }, { id: 'apricot', name: 'Apricot', hex: '#ffa300' }, { id: 'yellow', name: 'Yellow', hex: '#dcac00' }, { id: 'lime', name: 'Lime', hex: '#96c900' },
  { id: 'olive', name: 'Olive', hex: '#499d00' }, { id: 'green', name: 'Green', hex: '#109360' }, { id: 'teal', name: 'Teal', hex: '#009d9b' }, { id: 'navy', name: 'Navy', hex: '#00537c' },
  { id: 'blue', name: 'Blue', hex: '#2c79a7' }, { id: 'purple', name: 'Purple', hex: '#a270a5' }, { id: 'violet', name: 'Violet', hex: '#e24591' }, { id: 'pink', name: 'Pink', hex: '#f885b9' },
  { id: 'tan', name: 'Tan', hex: '#bcb095' }, { id: 'beige', name: 'Beige', hex: '#cc9f78' }, { id: 'brown', name: 'Brown', hex: '#a36200' }, { id: 'chocolate', name: 'Chocolate', hex: '#965537' },
]
export function shotContextMenuItems(clipboardAvailable: boolean, multipleShots: boolean) {
  return [
    { command: 'clip-color' as const, label: 'Clip Color', Icon: Palette, disabled: false, submenu: true },
    { command: 'copy' as const, label: 'Copy', Icon: Copy, shortcut: '⌘C', disabled: false, dividerBefore: true },
    { command: 'cut' as const, label: 'Cut', Icon: Scissors, shortcut: '⌘X', disabled: !multipleShots },
    { command: 'paste-after' as const, label: 'Paste After', Icon: Copy, shortcut: '⌘V', disabled: !clipboardAvailable },
    { command: 'duplicate' as const, label: 'Duplicate', Icon: Copy, shortcut: '⌘D', disabled: false },
    { command: 'delete' as const, label: 'Delete', Icon: Trash2, shortcut: '⌫', disabled: false, dividerBefore: true, danger: true },
  ]
}
export function contextMenuRovingKey(event: KeyboardEvent<HTMLElement>) {
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  if (!buttons.length) return
  const at = Math.max(0, buttons.indexOf(globalThis.document.activeElement as HTMLButtonElement))
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (at + (event.key === 'ArrowDown' || event.key === 'Tab' && !event.shiftKey ? 1 : -1) + buttons.length) % buttons.length
  if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key)) { event.preventDefault(); buttons[next]?.focus() }
}
export type SceneMenuCommand = 'human' | 'block' | 'sphere' | 'column' | 'camera' | 'prompt-reference' | 'prompt-describe' | 'prompt-ask' | 'prompt-similar' | 'prompt-tutorial' | 'reset-transform' | 'lock' | 'allow-below-canvas' | 'lock-shape' | 'object-color' | 'edit-members' | 'paste' | 'select-all' | 'fit' | 'focus' | 'cut' | 'copy' | 'duplicate' | 'delete' | 'group' | 'ungroup' | 'view-camera' | 'make-active'
export type CameraMenuRow = { command: SceneMenuCommand; label: string; Icon: LucideIcon; shortcut?: string; disabled?: boolean; disabledReason?: string; danger?: boolean; primary?: boolean; dividerBefore?: boolean; checked?: boolean; submenu?: boolean }
const MENU_ICONS: Record<SceneMenuCommand, LucideIcon> = { human: UserRound, block: Box, sphere: Circle, column: Cylinder, camera:Camera, 'prompt-reference':Sparkles, 'prompt-describe':Sparkles, 'prompt-ask':Sparkles, 'prompt-similar':Sparkles, 'prompt-tutorial':Sparkles, 'reset-transform': RotateCcw, focus: Crosshair, lock: Lock, 'allow-below-canvas': ChevronDown, 'lock-shape': Lock, 'object-color': Palette, 'edit-members': PencilLine, cut: Scissors, copy: Copy, duplicate: Copy, delete: Trash2, group: Group, ungroup: Ungroup, 'view-camera': Eye, 'make-active': Check, fit: Crosshair, paste: Copy, 'select-all': Check }
const sceneRows = (rows: Array<Omit<CameraMenuRow, 'Icon'>>): CameraMenuRow[] => rows.map((row) => ({ ...row, Icon: MENU_ICONS[row.command] }))
export function sceneContextMenuItems(target: SceneMenuTarget, grouped: boolean, entityKind?: EntityKind, resizeLocked = false): CameraMenuRow[] {
  if (target === 'empty') return sceneRows([
    { command: 'human', label: 'Human' }, { command: 'block', label: 'Block' }, { command: 'sphere', label: 'Sphere' }, { command: 'column', label: 'Column' }, { command: 'prompt-reference', label: 'Add from Prompt / Reference', dividerBefore: true },
    { command: 'paste', label: 'Paste', shortcut: '⌘V', dividerBefore: true }, { command: 'select-all', label: 'Select All', shortcut: '⌘A' }, { command: 'fit', label: 'Fit View' },
  ])
  if (target === 'camera') return sceneRows([
    { command: 'view-camera', label: 'View Through Camera', primary: true }, { command: 'make-active', label: 'Make Active Camera' }, { command: 'focus', label: 'Focus Selected', shortcut: '⇧F' }, { command: 'reset-transform', label: 'Reset Transform' },
    { command: 'duplicate', label: 'Duplicate Camera', shortcut: '⌘D', dividerBefore: true }, { command: 'copy', label: 'Copy', shortcut: '⌘C' }, { command: 'cut', label: 'Cut', shortcut: '⌘X' },
    { command: 'delete', label: 'Delete Camera', shortcut: '⌫', dividerBefore: true, danger: true },
  ])
  if (target === 'selection') return sceneRows([
    { command: 'group', label: 'Group Selection', shortcut: '⌘G', disabled: grouped, disabledReason: grouped ? 'Selection contains an ineligible Camera or grouped member.' : undefined }, { command: 'focus', label: 'Focus Selection', shortcut: '⇧F' },
    { command: 'duplicate', label: 'Duplicate Selection', shortcut: '⌘D', dividerBefore: true }, { command: 'copy', label: 'Copy Selection', shortcut: '⌘C' }, { command: 'cut', label: 'Cut Selection', shortcut: '⌘X' },
    { command: 'delete', label: 'Delete Selection', shortcut: '⌫', dividerBefore: true, danger: true },
  ])
  if (target === 'group') return sceneRows([
    { command: 'focus', label: 'Focus Selection', shortcut: '⇧F' }, { command: 'edit-members', label: 'Edit Members', disabled: grouped, disabledReason: grouped ? 'Unlock Shape to edit members.' : undefined }, { command: 'lock-shape', label: grouped ? 'Unlock Shape' : 'Lock Shape' }, { command: 'ungroup', label: 'Ungroup', shortcut: '⌘G', disabled: grouped, disabledReason: grouped ? 'Unlock Shape before ungrouping.' : undefined },
    { command: 'duplicate', label: 'Duplicate Group', shortcut: '⌘D', dividerBefore: true }, { command: 'copy', label: 'Copy Group', shortcut: '⌘C' }, { command: 'cut', label: 'Cut Group', shortcut: '⌘X' },
    { command: 'delete', label: 'Delete Group', shortcut: '⌫', dividerBefore: true, danger: true },
  ]).map((row) => row.command === 'lock-shape' && grouped ? { ...row, Icon: Unlock } : row)
  const lockLabel = `${resizeLocked ? 'Unlock' : 'Lock'} All`
  return sceneRows([
    { command: 'focus', label: 'Focus Selected', shortcut: '⇧F' }, { command: 'reset-transform', label: 'Reset Transform' }, { command: 'object-color', label: 'Object Color', submenu: true }, { command: 'lock', label: lockLabel },
    { command: 'prompt-describe', label: 'Describe This Object', dividerBefore: true }, { command: 'prompt-ask', label: 'Ask About Object' }, { command: 'prompt-similar', label: 'Create Similar Object' }, { command: 'prompt-reference', label: 'Use As Reference' }, { command: 'prompt-tutorial', label: 'Tutorial' },
    { command: 'duplicate', label: 'Duplicate', shortcut: '⌘D', dividerBefore: true }, { command: 'copy', label: 'Copy', shortcut: '⌘C' }, { command: 'cut', label: 'Cut', shortcut: '⌘X' },
    { command: 'delete', label: 'Delete', shortcut: '⌫', dividerBefore: true, danger: true },
  ]).map((row) => row.command === 'lock' && resizeLocked ? { ...row, Icon: Unlock } : row)
}
export function CameraContextMenu({ target, selectionCount = 0, clipboardAvailable, activeCamera, entityKind, entityColor, resizeLocked = false, allowBelowCanvas = false, grouped = false, playbackRunning = false, style, onCommand, onColor }: { target: SceneMenuTarget; selectionCount?: number; clipboardAvailable: boolean; activeCamera?: boolean; entityKind?: EntityKind; entityColor?: string; resizeLocked?: boolean; allowBelowCanvas?: boolean; grouped?: boolean; playbackRunning?: boolean; style?: CSSProperties; onCommand(command: SceneMenuCommand): void; onColor?(color: ShotClipColor): void }) {
  const menuRef = useRef<HTMLElement>(null); const [colorOpen, setColorOpen] = useState(false)
  const header = target === 'empty' ? 'ADD' : target === 'selection' ? `${selectionCount} ITEMS` : target === 'group' ? 'SHAPE GROUP' : target === 'camera' ? 'CAMERA' : (entityKind || 'OBJECT').toUpperCase()
  const baseItems = sceneContextMenuItems(target, grouped, entityKind, resizeLocked)
  if (target === 'object' || target === 'camera') baseItems.splice(Math.min(3, baseItems.length), 0, { command:'allow-below-canvas', label:'Allow Below Canvas', Icon:ChevronDown, checked:allowBelowCanvas })
  const items = baseItems.map((item) => ({ ...item, disabled: item.disabled || item.command === 'paste' && !clipboardAvailable || item.command === 'make-active' && activeCamera || item.command === 'view-camera' && playbackRunning, checked: item.command === 'make-active' ? Boolean(activeCamera) : item.checked, primary: item.command === 'view-camera' ? !playbackRunning : item.primary }))
  useEffect(() => { requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()) }, [])
  const rows = items.flatMap((item) => { const Icon = item.command === 'lock' && resizeLocked || item.command === 'lock-shape' && grouped ? Unlock : item.Icon; const checkable=item.command==='allow-below-canvas'; const button = <button key={item.command} role={checkable?'menuitemcheckbox':'menuitem'} title={item.disabledReason} className={`${item.primary ? 'context-primary' : ''} ${item.danger ? 'is-danger' : ''}`.trim()} disabled={item.disabled} aria-checked={checkable?Boolean(item.checked):item.checked} aria-haspopup={item.submenu ? 'menu' : undefined} aria-expanded={item.submenu ? colorOpen : undefined} onKeyDown={(event) => { if (item.command === 'object-color' && event.key === 'ArrowRight') { event.preventDefault(); setColorOpen(true); requestAnimationFrame(() => globalThis.document.querySelector<HTMLElement>('.camera3d-object-color-menu [aria-checked=true],.camera3d-object-color-menu button')?.focus()) } }} onClick={() => { if (item.command === 'object-color') { setColorOpen(true); requestAnimationFrame(() => globalThis.document.querySelector<HTMLElement>('.camera3d-object-color-menu [aria-checked=true],.camera3d-object-color-menu button')?.focus()) } else onCommand(item.command) }}>{Icon && <Icon size={14} />}<span>{item.label}</span>{item.checked && <Check size={14} />}{item.submenu && <ChevronRight size={14} />}{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>; return item.dividerBefore ? [<div key={`${item.command}-divider`} className="context-divider" />, button] : [button] })
  const defaultColor = entityKind === 'column' ? '#4f4a61' : '#8d78d6'; const selectedColor = entityColor?.toLowerCase() === defaultColor ? 'clear' : SHOT_CLIP_COLORS.find((color) => color.hex === entityColor?.toLowerCase())?.id
  return <><section ref={menuRef} className="canvas-context-menu" role="menu" aria-label={`${header} menu`} style={style} onKeyDown={contextMenuRovingKey} onContextMenu={(event) => event.preventDefault()}><header><span>{header}</span><kbd>esc</kbd></header>{rows}</section>{colorOpen && <section className="canvas-context-menu camera3d-color-menu camera3d-object-color-menu" role="menu" aria-label="Object Color" onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); setColorOpen(false); menuRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup=menu]')?.focus() } else contextMenuRovingKey(event) }} style={{ left: Math.min(Number(style?.left || 0) + 248, innerWidth - 250), top: Math.min(Number(style?.top || 0), innerHeight - 568) }}><header><span>OBJECT COLOR</span><kbd>esc</kbd></header>{SHOT_CLIP_COLORS.map((color) => { const checked = selectedColor === color.id; return <button key={color.id} role="menuitemradio" aria-checked={checked} onClick={() => onColor?.(color.id)}>{checked ? <Check size={14} /> : <i className="camera3d-color-check-space" />}<span>{color.name}</span>{color.hex ? <i className="camera3d-color-swatch" style={{ background: color.hex }} /> : <X size={14} />}</button> })}</section>}</>
}

export type TimelineEditTool = 'selection' | 'slice'
export function liveMidpointOrder(ids: string[], sourceId: string, targetId: string, ratio: number) {
  if (!ids.includes(sourceId) || !ids.includes(targetId) || sourceId === targetId) return [...ids]
  const next = ids.filter((id) => id !== sourceId); let target = next.indexOf(targetId); if (target < 0) return [...ids]
  if (ratio >= .5) target += 1
  next.splice(target, 0, sourceId)
  return next
}
export const SHOT_FLIP_OPTIONS = { duration: 170, easing: 'cubic-bezier(.2,.75,.25,1)' } as const
export function shotRectSnapshot(container: Element | null, selector: string) {
  return new Map([...container?.querySelectorAll<HTMLElement>(selector) || []].map((element) => [element.dataset.shotId || '', element.getBoundingClientRect()]))
}
export function animateShotFlip(container: Element | null, selector: string, before: Map<string, DOMRect>, axis: 'x' | 'y') {
  for (const element of [...container?.querySelectorAll<HTMLElement>(selector) || []]) {
    const previous = before.get(element.dataset.shotId || ''); if (!previous) continue
    const current = element.getBoundingClientRect(); const delta = axis === 'x' ? previous.left - current.left : previous.top - current.top
    if (Math.abs(delta) > .1) element.animate([{ transform: axis === 'x' ? `translateX(${delta}px)` : `translateY(${delta}px)` }, { transform: 'translate(0,0)' }], SHOT_FLIP_OPTIONS)
  }
}
export function keyboardReorderDestination(ids: string[], id: string, key: string) {
  const index = ids.indexOf(id); if (index < 0) return undefined
  if (key === 'ArrowUp' && index > 0) return ids[index - 1]
  if (key === 'ArrowDown' && index < ids.length - 1) return ids[index + 2] || null
  return undefined
}
export type TimelineShortcutCommand = 'undo' | 'redo' | 'copy' | 'cut' | 'paste-after' | 'delete' | 'mark-in' | 'mark-out' | TimelineEditTool
export function timelineShortcutForEvent(event: Pick<globalThis.KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>, scope: { withinTimeline: boolean; lastTimelineShotInteraction: boolean; entitySelected: boolean; textEntry: boolean; menuOpen: boolean; viewportOwned: boolean }): TimelineShortcutCommand | null {
  if (scope.textEntry || scope.menuOpen || scope.viewportOwned || scope.entitySelected || !(scope.withinTimeline || scope.lastTimelineShotInteraction)) return null
  const command = event.metaKey || event.ctrlKey
  if (command && event.code === 'KeyZ') return event.shiftKey ? 'redo' : 'undo'
  if (command && event.code === 'KeyC') return 'copy'
  if (command && event.code === 'KeyX') return 'cut'
  if (command && event.code === 'KeyV') return 'paste-after'
  if (!command && (event.key === 'Backspace' || event.key === 'Delete')) return 'delete'
  if (!command && !event.altKey && !event.shiftKey && event.code === 'KeyI') return 'mark-in'
  if (!command && !event.altKey && !event.shiftKey && event.code === 'KeyO') return 'mark-out'
  return timelineToolForKey(event)
}
export type DuplicateGesture = { id: string; insertionIndex: number; committed: boolean }
export function duplicateGestureTransition(state: DuplicateGesture | null, event: 'child-drop' | 'track-drop' | 'outside-drop' | 'escape' | 'blur' | 'pointercancel') {
  if (!state || event === 'child-drop') return { state, commit: false }
  if (event === 'track-drop' && !state.committed) return { state: null, commit: true }
  return { state: null, commit: false }
}
export function timelineToolForKey(event: Pick<globalThis.KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'>): TimelineEditTool | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key.toLowerCase() === 'v' || event.key === 'Escape') return 'selection'
  if (event.key.toLowerCase() === 'x') return 'slice'
  return null
}
const PROPERTY_ROWS = [
  { label: 'Position X', property: 'position.x' }, { label: 'Position Y', property: 'position.y' }, { label: 'Position Z', property: 'position.z' },
  { label: 'Pitch', property: 'rotation.x' }, { label: 'Yaw', property: 'rotation.y' }, { label: 'Roll', property: 'rotation.z' },
] as const

function TimelineDiamonds({ expanded }: { expanded: boolean }) {
  return <span className={`camera3d-stacked-diamonds ${expanded ? 'is-expanded' : ''}`} aria-hidden="true"><i /><i /><i /></span>
}

export const timelineTimecode = (frame: number, fps: number) => {
  const absolute = Math.max(0, Math.round(frame)); const ff = absolute % fps; const total = Math.floor(absolute / fps)
  const ss = total % 60; const mm = Math.floor(total / 60) % 60; const hh = Math.floor(total / 3600)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`
}

export type TimelineRulerLayoutInput = { fps: number; sequenceStart: number; sequenceEnd: number; pixelsPerFrame: number; viewportWidth: number }
export type TimelineRulerTick = { frame: number; left: number; label?: string; anchor?: 'first' | 'final' }
export function timelineVirtualHorizon(input: { authoredEnd: number; playhead: number; previous: number; scrollLeft: number; viewportWidth: number; pixelsPerFrame: number }) {
  const ppf = Math.max(.0001, input.pixelsPerFrame); const visibleRight = (Math.max(0, input.scrollLeft) + Math.max(0, input.viewportWidth)) / ppf
  const runway = Math.max(24, Math.ceil(Math.max(0, input.viewportWidth) / ppf))
  return Math.ceil(Math.max(1, input.previous, input.authoredEnd, input.playhead + runway, visibleRight + runway))
}
export function timelineAnchoredZoom(input: { scrollLeft: number; anchor: number; oldPixelsPerFrame: number; newPixelsPerFrame: number }) {
  const frame = (Math.max(0, input.scrollLeft) + Math.max(0, input.anchor)) / Math.max(.0001, input.oldPixelsPerFrame)
  return Math.max(0, frame * Math.max(.0001, input.newPixelsPerFrame) - Math.max(0, input.anchor))
}
export function timelineRulerLayout(input: TimelineRulerLayoutInput) {
  const fps = Math.max(1, Math.round(input.fps)); const pixelsPerFrame = Math.max(.0001, input.pixelsPerFrame)
  const sequenceStart = Math.max(0, Math.round(input.sequenceStart)); const sequenceEnd = Math.max(sequenceStart, Math.round(input.sequenceEnd))
  const minimumFrames = Math.ceil(96 / pixelsPerFrame)
  const candidates = new Set([1, 2, 3, 6, 12, fps, 2 * fps, 5 * fps, 10 * fps, 30 * fps, 60 * fps])
  for (let minutes = 2; minutes * 60 * fps < minimumFrames * 2; minutes += 1) candidates.add(minutes * 60 * fps)
  const ordered = [...candidates].filter(Number.isInteger).sort((a, b) => a - b)
  const majorInterval = ordered.find((candidate) => candidate >= minimumFrames) || Math.ceil(minimumFrames / (60 * fps)) * 60 * fps
  const major: TimelineRulerTick[] = [{ frame: 0, left: 0, label: timelineTimecode(0, fps), anchor: 'first' }]
  const firstAligned = Math.max(majorInterval, Math.ceil(sequenceStart / majorInterval) * majorInterval)
  for (let frame = firstAligned; frame <= sequenceEnd; frame += majorInterval) major.push({ frame, left: frame * pixelsPerFrame, label: timelineTimecode(frame, fps) })
  let endpoint: { frame: number; left: number; labelled: boolean } | undefined
  if (sequenceEnd > 0) {
    const existing = major.find((tick) => tick.frame === sequenceEnd)
    if (existing) existing.anchor = 'final'
    else if ((sequenceEnd - major.at(-1)!.frame) * pixelsPerFrame >= 96) major.push({ frame: sequenceEnd, left: sequenceEnd * pixelsPerFrame, label: timelineTimecode(sequenceEnd, fps), anchor: 'final' })
    else endpoint = { frame: sequenceEnd, left: sequenceEnd * pixelsPerFrame, labelled: false }
  }
  const subdivision = majorInterval % 4 === 0 ? 4 : majorInterval % 2 === 0 ? 2 : 1
  const minorStep = majorInterval / subdivision; const minor: TimelineRulerTick[] = []
  if (subdivision > 1 && minorStep * pixelsPerFrame >= 8) for (let frame = Math.max(minorStep, Math.ceil(sequenceStart / minorStep) * minorStep); frame < sequenceEnd; frame += minorStep) if (frame % majorInterval !== 0) minor.push({ frame, left: frame * pixelsPerFrame })
  return { fps, sequenceStart, sequenceEnd, pixelsPerFrame, viewportWidth: Math.max(0, input.viewportWidth), majorInterval, major, minor, endpoint }
}

export function CameraShotTimeline({ document, frame, selectedEntityId, selectedShotId, selectedKeyframeId, expanded: _expanded, timelineHeight = 260, onTimelineHeight, showKeyframes, playing = false, loop = false, activeEditTool = 'selection', shotClipboardAvailable = false, renderMarks = { inFrame: null, outMarkerFrame: null }, rangeStatus = '', timelineLocked = false, onToggleTimelineLock, onTimelinePropertyKeyframe, onTimelinePropertyReset, onRenderMarks, onPlay, onStop, onLoop, onFrame, onShot, onToggleExpanded: _onToggleExpanded, onToggleKeyframes, onReorder, onResizeShot, onEase, onDismissEase, onKeyframeSelect, onTool, onEditTool, onShotCommand, onShotColor, onSliceShot, onDuplicateShot, onClipSelect }: {
  document: CameraDocument; frame: number; selectedEntityId?: string; selectedShotId: string; selectedKeyframeId?: string; expanded: boolean; timelineHeight?: number; onTimelineHeight?(height:number):void; showKeyframes: boolean; playing?: boolean; loop?: boolean
  activeEditTool?: TimelineEditTool
  shotClipboardAvailable?: boolean
  renderMarks?: RenderMarks; rangeStatus?: string; timelineLocked?: boolean; onToggleTimelineLock?(): void; onRenderMarks?(marks: RenderMarks, announcement: string): void
  onPlay?(): void; onStop?(): void; onLoop?(): void; onFrame(frame: number): void; onShot(id: string): void; onToggleExpanded(): void; onToggleKeyframes(): void
  onTimelinePropertyKeyframe?(property: string): void; onTimelinePropertyReset?(property: string): void
  onReorder(id: string, beforeId: string | null): void; onResizeShot(id: string, frames: number): void; onEase(id: string, ease: Ease): void; onDismissEase?(): void; onKeyframeSelect?(id: string, frame: number): void; onClipSelect?(id: string): void
  onTool?(tool: 'select' | 'position' | 'rotate' | 'view-camera' | 'previous-camera' | 'next-camera' | 'previous-shot' | 'next-shot' | 'cut' | 'continue' | 'snap' | 'fit'): void
  onEditTool?(tool: TimelineEditTool): void
  onShotCommand?(command: ShotMenuCommand, shotId: string): void; onShotColor?(shotId: string, color: ShotClipColor): void; onSliceShot?(shotId: string): void; onDuplicateShot?(shotId: string, insertionIndex: number): void
}) {
  const authoredEnd = Math.max(1, document.shots.at(-1)?.endFrame || 1)
  const [dragged, setDragged] = useState<string | null>(null)
  const [previewIds, setPreviewIds] = useState<string[] | null>(null)
  const [duplicateDrag, setDuplicateDrag] = useState<{ id: string; insertionIndex: number } | null>(null)
  const [shotMenu, setShotMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [colorMenu, setColorMenu] = useState(false)
  const [rangeMenu, setRangeMenu] = useState<{ x: number; y: number } | null>(null)
  const shotMenuReturnFocus = useRef<HTMLElement | null>(null)
  const rulerReturnFocus = useRef<HTMLElement | null>(null)
  const [resizing, setResizing] = useState<{ id: string; startX: number; startFrames: number; pixelsPerFrame: number; previewFrames: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [timelineScrollLeft, setTimelineScrollLeft] = useState(0)
  const [rulerViewportWidth, setRulerViewportWidth] = useState(960)
  const rulerRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const horizonRef = useRef(0)
  const shotTrackRef = useRef<HTMLDivElement>(null)
  const [snap, setSnap] = useState(false)
  const [timelinePreviewHeight,setTimelinePreviewHeight]=useState<number|null>(null)
  const timelinePreviewHeightRef=useRef<number|null>(null)
  const timelineResize=useRef<{pointerId:number;startY:number;startHeight:number}|null>(null)
  const end = authoredEnd
  const selectedShotIndex = Math.max(0, document.shots.findIndex((shot) => shot.id === selectedShotId))
  const selectedShot = document.shots[selectedShotIndex] || document.shots[0]
  const entity = document.entities.find((item) => item.id === selectedEntityId)
  const cameraSelected = entity?.kind === 'camera'
  const orderedKeyframes = entity ? [...entity.keyframes, ...(entity.kind === 'camera' ? selectedShot.camera.keyframes.filter((keyframe) => keyframe.property === 'camera.target' || keyframe.property === 'camera.movement') : [])].sort((a, b) => a.frame - b.frame || String(a.property).localeCompare(String(b.property))) : []
  const propertyRows = [...PROPERTY_ROWS, ...(entity?.kind === 'block' ? AXES.map((axis) => ({ label: `Dimension ${axis}`, property: `dimensions.${axis.toLowerCase()}` })) : entity?.kind === 'sphere' ? [{ label: 'Radius', property: 'radius' }] : entity?.kind === 'column' ? [{ label: 'Radius', property: 'radius' }, { label: 'Height', property: 'height' }] : entity?.kind === 'camera' ? [{ label: 'Target', property: 'camera.target' }, { label: 'Movement Type', property: 'camera.movement' }] : [])]
  const pixelsPerFrame = 4 * zoom
  const applyTimelineZoom = (rawZoom: number, anchorPx = rulerViewportWidth / 2) => {
    const nextZoom = Math.max(.5, Math.min(4, rawZoom))
    const nextScroll = timelineAnchoredZoom({ scrollLeft: timelineScrollLeft, anchor: anchorPx, oldPixelsPerFrame: pixelsPerFrame, newPixelsPerFrame: 4 * nextZoom })
    setZoom(nextZoom)
    setTimelineScrollLeft(nextScroll)
  }
  const onTimelineWheel = (event: ReactWheelEvent) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); const rect = rulerRef.current?.getBoundingClientRect(); applyTimelineZoom(zoom * Math.exp(-event.deltaY * .0015), event.clientX - (rect?.left || 0)) }
  horizonRef.current = timelineVirtualHorizon({ authoredEnd, playhead: frame, previous: horizonRef.current, scrollLeft: timelineScrollLeft, viewportWidth: rulerViewportWidth, pixelsPerFrame })
  const virtualEnd = horizonRef.current
  const workspaceWidth = `max(100%, ${Math.ceil(virtualEnd * pixelsPerFrame)}px)`
  useLayoutEffect(() => { if (timelineScrollRef.current && Math.abs(timelineScrollRef.current.scrollLeft - timelineScrollLeft) > .5) timelineScrollRef.current.scrollLeft = timelineScrollLeft }, [timelineScrollLeft, zoom, workspaceWidth])
  const selectedIndex = selectedKeyframeId ? orderedKeyframes.findIndex((keyframe) => keyframe.id === selectedKeyframeId) : -1
  const selectedKeyframe = selectedIndex >= 0 ? orderedKeyframes[selectedIndex] : null
  const nonterminal = Boolean(selectedKeyframe && orderedKeyframes.some((keyframe) => keyframe.property === selectedKeyframe.property && keyframe.frame > selectedKeyframe.frame))
  const seek = (value: number) => onFrame(Math.max(0, Math.round(value)))
  const renderRange = deriveRenderRange(renderMarks, document.shots[0]?.startFrame || 0, end)
  const rangeLeft = renderRange.start * pixelsPerFrame
  const rangeRight = renderRange.end * pixelsPerFrame
  const previousKeyframe = orderedKeyframes.filter((keyframe) => keyframe.frame < frame).at(-1)
  const nextKeyframe = orderedKeyframes.find((keyframe) => keyframe.frame > frame)
  const activateShot = (index: number) => { const shot = document.shots[Math.max(0, Math.min(document.shots.length - 1, index))]; if (shot) onShot(shot.id) }
  const drop = (event: DragEvent, targetId: string) => { event.preventDefault(); event.stopPropagation(); if (duplicateDrag) onDuplicateShot?.(duplicateDrag.id, duplicateDrag.insertionIndex); else if (dragged && dragged !== targetId) onReorder(dragged, targetId); setDuplicateDrag(null); setDragged(null) }
  const scrub = (event: ReactPointerEvent<HTMLDivElement>) => { if (event.button !== 0) return; const lane = event.currentTarget; const rect = lane.getBoundingClientRect(); const laneLeft = rect.left + parseFloat(getComputedStyle(lane).paddingLeft || '0'); if (event.clientX < laneLeft) return; const local = event.clientX - laneLeft + timelineScrollLeft; seek(Math.max(0, Math.min(end, local / pixelsPerFrame))); event.preventDefault() }
  const ruler = timelineRulerLayout({ fps: document.fps, sequenceStart: document.shots[0]?.startFrame || 0, sequenceEnd: virtualEnd, pixelsPerFrame, viewportWidth: rulerViewportWidth })
  const tool = (id: Parameters<NonNullable<typeof onTool>>[0]) => onTool?.(id)
  const displayedShots = (previewIds || document.shots.map((shot) => shot.id)).map((id) => document.shots.find((shot) => shot.id === id)!).filter(Boolean)
  let previewCursor = 0; const previewLeft = new Map(displayedShots.map((shot) => { const left = previewCursor; previewCursor += shot.endFrame - shot.startFrame; return [shot.id, left] }))
  const easeMenu = useRef<HTMLDivElement>(null); const easeReturnFocus = useRef<HTMLElement | null>(null)
  const dismissEase = () => { onDismissEase?.(); requestAnimationFrame(() => easeReturnFocus.current?.focus()) }
  useEffect(() => {
    if (!nonterminal || !selectedKeyframeId) return
    easeReturnFocus.current = globalThis.document.activeElement instanceof HTMLElement ? globalThis.document.activeElement : null
    requestAnimationFrame(() => easeMenu.current?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus())
    const pointer = (event: PointerEvent) => { if (!easeMenu.current?.contains(event.target as Node)) dismissEase() }
    const key = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); dismissEase() } }
    window.addEventListener('pointerdown', pointer, true); window.addEventListener('keydown', key, true)
    return () => { window.removeEventListener('pointerdown', pointer, true); window.removeEventListener('keydown', key, true) }
  }, [nonterminal, selectedKeyframeId])
  useEffect(() => {
    if (!dragged && !duplicateDrag && !shotMenu && !rangeMenu) return
    const cancelDrag = () => { setDuplicateDrag(null); setDragged(null); setPreviewIds(null) }
    const restoreFocus = () => requestAnimationFrame(() => (rangeMenu ? rulerReturnFocus.current : shotMenuReturnFocus.current)?.focus())
    const key = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); cancelDrag(); setShotMenu(null); setColorMenu(false); setRangeMenu(null); restoreFocus() } }
    const pointer = (event: globalThis.PointerEvent) => { const target = event.target as Element; if (rangeMenu && !target?.closest?.('.camera3d-range-menu')) { setRangeMenu(null); restoreFocus() } if (shotMenu && !target?.closest?.('.camera3d-shot-menu,.camera3d-color-menu')) { setShotMenu(null); setColorMenu(false); restoreFocus() } }
    window.addEventListener('blur', cancelDrag); window.addEventListener('pointercancel', cancelDrag); window.addEventListener('keydown', key, true); window.addEventListener('pointerdown', pointer, true)
    return () => { window.removeEventListener('blur', cancelDrag); window.removeEventListener('pointercancel', cancelDrag); window.removeEventListener('keydown', key, true); window.removeEventListener('pointerdown', pointer, true) }
  }, [colorMenu, dragged, duplicateDrag, shotMenu, rangeMenu])
  const displayedTimelineHeight=_expanded ? timelinePreviewHeight ?? timelineHeight : 124
  const editLocked = Boolean(timelineLocked)
  return <section className="page-strip camera3d-timeline" aria-label="Camera timeline" style={{height:displayedTimelineHeight}}><div className="camera3d-timeline-height-resize" role="separator" aria-label="Resize timeline height" aria-orientation="horizontal" aria-valuemin={124} aria-valuemax={Math.max(124,(globalThis.innerHeight||800)-220)} aria-valuenow={displayedTimelineHeight} tabIndex={0} onPointerDown={(event)=>{ if (editLocked) return; if (!_expanded) _onToggleExpanded(); timelineResize.current={pointerId:event.pointerId,startY:event.clientY,startHeight:timelineHeight}; timelinePreviewHeightRef.current=null; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={(event)=>{ const drag=timelineResize.current; if (!drag || drag.pointerId!==event.pointerId) return; const next=cameraTimelineHeightForPointer(drag.startHeight,drag.startY,event.clientY,globalThis.innerHeight||800); timelinePreviewHeightRef.current=next; setTimelinePreviewHeight(next) }} onPointerUp={(event)=>{ const drag=timelineResize.current; if (!drag || drag.pointerId!==event.pointerId) return; const next=timelinePreviewHeightRef.current ?? drag.startHeight; timelineResize.current=null; timelinePreviewHeightRef.current=null; setTimelinePreviewHeight(null); onTimelineHeight?.(next); if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={()=>{timelineResize.current=null;timelinePreviewHeightRef.current=null;setTimelinePreviewHeight(null)}} onBlur={()=>{timelineResize.current=null;timelinePreviewHeightRef.current=null;setTimelinePreviewHeight(null)}} onKeyDown={(event)=>{ if (!['ArrowUp','ArrowDown','Home','End'].includes(event.key)) { if(event.key==='Escape'){timelineResize.current=null;timelinePreviewHeightRef.current=null;setTimelinePreviewHeight(null)} return } event.preventDefault(); if (!_expanded) _onToggleExpanded(); onTimelineHeight?.(cameraTimelineHeightForKey(timelineHeight,event.key,globalThis.innerHeight||800)) }} />
    <header className="camera3d-timeline-summary"><strong>Camera / {selectedShot?.name || 'Shot'}</strong><span>{cameraSelected ? entity?.name : selectedShot?.camera.activeCameraId ? document.entities.find((item) => item.id === selectedShot.camera.activeCameraId)?.name : 'No Camera'}</span>{onToggleTimelineLock && <button type="button" className="camera3d-timeline-lock" aria-label={editLocked ? 'Unlock Timeline' : 'Lock Timeline'} title={editLocked ? 'Unlock Timeline' : 'Lock Timeline'} aria-pressed={editLocked} onClick={onToggleTimelineLock}>{editLocked ? <Lock size={13}/> : <Unlock size={13}/>}</button>}<button type="button" aria-label={_expanded ? 'Collapse timeline' : 'Expand timeline'} aria-expanded={_expanded} onClick={_onToggleExpanded}>{_expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}</button></header>
    <div className="camera3d-transport" role="toolbar" aria-label="Sequence transport">
      <div className="camera3d-transport-cluster"><button aria-label="Go to sequence start" onClick={() => seek(0)}><SkipBack size={14} /></button><button aria-label="Previous frame" onClick={() => seek(frame - 1)}><ChevronLeft size={14} /></button><button aria-label="Stop" onClick={onStop}><CircleStop size={14} /></button><button aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} onClick={onPlay}>{playing ? <Pause size={14} /> : <Play size={14} />}</button><button aria-label="Next frame" onClick={() => seek(frame + 1)}><ChevronRight size={14} /></button><button aria-label="Go to sequence end" onClick={() => seek(end)}><SkipForward size={14} /></button><button aria-label="Loop sequence" aria-pressed={loop} className={loop ? 'is-active' : ''} onClick={onLoop}><Repeat2 size={14} /></button></div>
      <div className="camera3d-timeline-toolbar" aria-label="Camera and Shot tools">
        <div className="camera3d-tool-group camera3d-edit-tools" role="toolbar" aria-label="Timeline editing tools"><button aria-label="Selection tool (V)" data-tooltip="Selection [V]" aria-pressed={activeEditTool === 'selection'} className={activeEditTool === 'selection' ? 'is-active' : ''} onClick={() => onEditTool?.('selection')}><MousePointer2 size={14} /></button><button aria-label="Slice tool (X)" data-tooltip="Slice [X]" aria-pressed={activeEditTool === 'slice'} className={activeEditTool === 'slice' ? 'is-active' : ''} onClick={() => onEditTool?.('slice')}><Scissors size={14} /></button></div>
        {orderedKeyframes.length > 0 && <div className="camera3d-keyframe-navigation"><button aria-label="Previous keyframe" disabled={!previousKeyframe} onClick={() => previousKeyframe && seek(previousKeyframe.frame)}><ChevronLeft size={14} /><Diamond size={10} /></button><button aria-label="Next keyframe" disabled={!nextKeyframe} onClick={() => nextKeyframe && seek(nextKeyframe.frame)}><Diamond size={10} /><ChevronRight size={14} /></button></div>}
        <div className="camera3d-tool-group"><button aria-label="Previous Camera point" data-tooltip="Previous Camera point" onClick={() => tool('previous-camera')}><ChevronLeft size={14} /></button><button aria-label="Next Camera point" data-tooltip="Next Camera point" onClick={() => tool('next-camera')}><ChevronRight size={14} /></button></div>
        <div className="camera3d-tool-group"><button aria-label="Previous Shot" data-tooltip="Previous Shot" disabled={selectedShotIndex <= 0} onClick={() => { activateShot(selectedShotIndex - 1); tool('previous-shot') }}><SkipBack size={14} /></button><button aria-label="Next Shot" data-tooltip="Next Shot" disabled={selectedShotIndex >= document.shots.length - 1} onClick={() => { activateShot(selectedShotIndex + 1); tool('next-shot') }}><SkipForward size={14} /></button></div>
        <div className="camera3d-tool-group camera3d-timeline-view-tools"><button aria-label="Timeline Snap" data-tooltip="Timeline Snap" aria-pressed={snap} className={snap ? 'is-active' : ''} onClick={() => { setSnap((value) => !value); tool('snap') }}><Magnet size={14} /></button><button aria-label={showKeyframes ? 'Hide Keyframes' : 'Show Keyframes'} data-tooltip={showKeyframes ? 'Hide Keyframes' : 'Show Keyframes'} aria-expanded={showKeyframes} aria-pressed={showKeyframes} className={showKeyframes ? 'is-active' : ''} onClick={onToggleKeyframes}><TimelineDiamonds expanded={showKeyframes} /><span className="camera3d-visually-hidden">{showKeyframes ? 'Hide Keyframes' : 'Show Keyframes'}</span></button><button aria-label="Fit Timeline" data-tooltip="Fit Timeline" onClick={() => { applyTimelineZoom(1); tool('fit') }}><Maximize2 size={14} /></button><button aria-label="Timeline Zoom Out" data-tooltip="Timeline Zoom Out" onClick={() => applyTimelineZoom(zoom - .25)}><ZoomOut size={14} /></button><input aria-label="Timeline zoom" type="range" min={.5} max={4} step={.25} value={zoom} onChange={(event) => applyTimelineZoom(Number(event.target.value))} /><button aria-label="Timeline Zoom In" data-tooltip="Timeline Zoom In" onClick={() => applyTimelineZoom(zoom + .25)}><ZoomIn size={14} /></button></div>
      </div>
      <output aria-label="Current timecode">{timelineTimecode(frame, document.fps)}</output>
    </div>
    <div ref={rulerRef} className="camera3d-ruler" onWheel={onTimelineWheel} onPointerDown={scrub} onContextMenu={(event) => { event.preventDefault(); rulerReturnFocus.current = event.currentTarget; setRangeMenu({ x: event.clientX, y: event.clientY }) }} role="slider" aria-label="Timeline playhead" aria-valuemin={0} aria-valuemax={virtualEnd} aria-valuenow={frame} aria-valuetext={timelineTimecode(frame, document.fps)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowLeft') seek(frame - 1); if (event.key === 'ArrowRight') seek(frame + 1) }}>
      <div className="camera3d-ruler-scale" data-timeline-content-coordinates="true" style={{ width: workspaceWidth, transform: `translateX(${-timelineScrollLeft}px)` }}>{ruler.major.map((tick) => <span key={`major-${tick.frame}`} className={`camera3d-ruler-tick is-major ${tick.anchor === 'first' ? 'is-first' : tick.anchor === 'final' ? 'is-final' : ''}`} style={{ left: `${tick.left}px` }}><i />{tick.label}</span>)}{ruler.minor.map((tick) => <span key={`minor-${tick.frame}`} className="camera3d-ruler-tick is-minor" style={{ left: `${tick.left}px` }}><i /></span>)}{ruler.endpoint && <span className="camera3d-ruler-tick is-endpoint" style={{ left: `${ruler.endpoint.left}px` }}><i /></span>}</div>
    </div>
    <div className="camera3d-range-lane"><div className="camera3d-range-content" data-timeline-content-coordinates="true" style={{ width: workspaceWidth, transform: `translateX(${-timelineScrollLeft}px)` }}>{renderRange.scope !== 'full' && <><i className="camera3d-range-outside is-left" style={{ width: `${rangeLeft}px` }} /><i className="camera3d-range-outside is-right" style={{ left: `${rangeRight}px` }} /><i className="camera3d-range-active-bar" style={{ left: `${rangeLeft}px`, width: `${Math.max(0, rangeRight - rangeLeft)}px` }} />{renderMarks.inFrame !== null && <button type="button" className="camera3d-range-handle is-in" aria-label="Mark In" data-tooltip="Mark In" style={{ left: `${renderMarks.inFrame * pixelsPerFrame}px` }} />}{renderMarks.outMarkerFrame !== null && <button type="button" className="camera3d-range-handle is-out" aria-label="Mark Out" data-tooltip="Mark Out" style={{ left: `${renderMarks.outMarkerFrame * pixelsPerFrame}px` }} />}</>}</div></div>
    <output className="camera3d-visually-hidden" aria-live="polite" aria-atomic="true">{rangeStatus}</output>
    <div ref={timelineScrollRef} className="camera3d-timeline-scroll" onWheel={onTimelineWheel} onScroll={(event) => setTimelineScrollLeft(event.currentTarget.scrollLeft)}><div className="camera3d-timeline-content" data-timeline-content-coordinates="true" style={{ width: workspaceWidth }}>
      {renderRange.scope !== 'full' && <div className="camera3d-range-track-overlay" aria-hidden="true"><i className="camera3d-range-outside is-left" style={{ width: `${rangeLeft}px` }} /><i className="camera3d-range-outside is-right" style={{ left: `${rangeRight}px` }} /><i className="camera3d-range-tint" style={{ left: `${rangeLeft}px`, width: `${Math.max(0, rangeRight - rangeLeft)}px` }} /></div>}
      <div ref={shotTrackRef} className="camera3d-shot-track" aria-label="Shot track" onDrop={(event) => { event.preventDefault(); if (editLocked) { setDuplicateDrag(null); setDragged(null); setPreviewIds(null); return } if (duplicateDrag) onDuplicateShot?.(duplicateDrag.id, duplicateDrag.insertionIndex); else if (dragged && previewIds) { const at = previewIds.indexOf(dragged); onReorder(dragged, previewIds[at + 1] || null) } setDuplicateDrag(null); setDragged(null); setPreviewIds(null) }} onDragEnd={() => { setDuplicateDrag(null); setDragged(null); setPreviewIds(null) }} onPointerCancel={() => { setDuplicateDrag(null); setDragged(null); setPreviewIds(null) }}>
        {displayedShots.map((shot) => <div key={shot.id} data-shot-id={shot.id} className={`page-tab camera3d-shot-block ${shot.id === selectedShotId ? 'is-active' : ''} ${shot.id === dragged ? 'is-reorder-placeholder' : ''}`} data-clip-color={shot.clipColor || 'clear'} draggable={activeEditTool === 'selection'} tabIndex={0} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" title="Drag to reorder · Alt+ArrowUp/Down · Escape cancels" onDragStart={(event) => { if (editLocked || activeEditTool !== 'selection') { event.preventDefault(); return } setDragged(shot.id); setPreviewIds(document.shots.map((item) => item.id)); if (event.altKey) setDuplicateDrag({ id: shot.id, insertionIndex: document.shots.indexOf(shot) }) }} onDragOver={(event) => { event.preventDefault(); if (!dragged || duplicateDrag) return; const before = shotRectSnapshot(shotTrackRef.current, '.camera3d-shot-block[data-shot-id]'); const rect = event.currentTarget.getBoundingClientRect(); setPreviewIds((ids) => { const current = ids || document.shots.map((item) => item.id); const next = liveMidpointOrder(current, dragged, shot.id, (event.clientX - rect.left) / Math.max(1, rect.width)); if (next.join('|') !== current.join('|')) requestAnimationFrame(() => animateShotFlip(shotTrackRef.current, '.camera3d-shot-block[data-shot-id]', before, 'x')); return next }) }} onKeyDown={(event) => { if (editLocked) return; if (!event.altKey || event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return; const beforeId = keyboardReorderDestination(document.shots.map((item) => item.id), shot.id, event.key); if (beforeId === undefined) return; event.preventDefault(); event.stopPropagation(); onReorder(shot.id, beforeId) }} onContextMenu={(event) => { event.preventDefault(); shotMenuReturnFocus.current = event.currentTarget.querySelector('button'); onShot(shot.id); setColorMenu(false); setShotMenu({ id: shot.id, x: event.clientX, y: event.clientY }) }} style={{ left: `calc(var(--camera3d-parameter-column) + ${(previewLeft.get(shot.id) ?? shot.startFrame) * pixelsPerFrame}px)`, width: `${(resizing?.id === shot.id ? resizing.previewFrames : shot.endFrame - shot.startFrame) * pixelsPerFrame}px` }}><button onClick={() => { onClipSelect?.(shot.id); onShot(shot.id); if (!editLocked && activeEditTool === 'slice') onSliceShot?.(shot.id) }}><span className="camera3d-shot-copy"><strong>{shot.name}</strong><small>{cameraShotClipSecondaryCopy(shot)}</small></span><span role="separator" aria-label={`Resize ${shot.name} duration`} aria-orientation="vertical" tabIndex={0} onPointerDown={(event) => { if (editLocked) return; event.preventDefault(); event.stopPropagation(); const duration = shot.endFrame - shot.startFrame; setResizing({ id: shot.id, startX: event.clientX, startFrames: duration, pixelsPerFrame, previewFrames: duration }); event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={(event) => setResizing((current) => current?.id === shot.id ? { ...current, previewFrames: Math.max(1, Math.round(current.startFrames + (event.clientX - current.startX) / current.pixelsPerFrame)) } : current)} onPointerUp={(event) => { const current = resizing; if (current?.id === shot.id) onResizeShot(shot.id, current.previewFrames); setResizing(null); event.currentTarget.releasePointerCapture(event.pointerId) }} onKeyDown={(event) => { if (editLocked) return; if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return; event.preventDefault(); onResizeShot(shot.id, Math.max(1, shot.endFrame - shot.startFrame + (event.key === 'ArrowRight' ? 1 : -1))) }} /></button></div>)}
        {duplicateDrag && (() => { const source = document.shots.find((shot) => shot.id === duplicateDrag.id)!; const boundary = duplicateDrag.insertionIndex === document.shots.length ? end : document.shots[duplicateDrag.insertionIndex].startFrame; return <div className="camera3d-shot-block camera3d-shot-duplicate-preview" aria-hidden="true" style={{ left: `calc(var(--camera3d-parameter-column) + ${boundary * pixelsPerFrame}px)`, width: `${(source.endFrame - source.startFrame) * pixelsPerFrame}px` }}><span className="camera3d-shot-copy"><strong>{source.name}</strong><small>{cameraShotClipSecondaryCopy(source)}</small></span></div> })()}
      </div>
      {showKeyframes && <div className="camera3d-property-tracks">{propertyRows.map(({ label, property }) => <div className="camera3d-property-track" key={property}><div className="camera3d-property-label"><span>{label}</span></div><div>{orderedKeyframes.filter((keyframe) => keyframe.property === property).map((keyframe) => <button key={`${keyframe.id || keyframe.frame}-${property}`} aria-label={`${label} keyframe ${keyframe.frame}`} className={`camera3d-keyframe-button${keyframe.id === selectedKeyframeId ? ' is-active' : ''}`} style={{ left: `${keyframe.frame * pixelsPerFrame}px`, transform: keyframe.frame === 0 ? 'none' : undefined }} onClick={(event) => { event.stopPropagation(); if (!editLocked && keyframe.id) onKeyframeSelect?.(keyframe.id, keyframe.frame) }}><Diamond size={11} fill="currentColor" /></button>)}</div></div>)}</div>}
    </div></div>
    <b className="camera3d-playhead-overlay" aria-hidden="true" style={{ left: `calc(var(--camera3d-parameter-column) + ${frame * pixelsPerFrame - timelineScrollLeft}px)` }} />
    {shotMenu && <><section className="canvas-context-menu camera3d-shot-menu" role="menu" aria-label="Shot menu" onKeyDown={contextMenuRovingKey} style={{ left: Math.min(shotMenu.x, innerWidth - 250), top: Math.min(shotMenu.y, innerHeight - 224) }}><header><span>SHOT</span><kbd>esc</kbd></header>{shotContextMenuItems(shotClipboardAvailable, document.shots.length > 1).flatMap((item) => { const Icon = item.Icon; const button = <button key={item.command} role="menuitem" disabled={item.disabled || (editLocked && item.command !== 'copy')} className={item.danger ? 'is-danger' : ''} aria-haspopup={item.submenu ? 'menu' : undefined} aria-expanded={item.submenu ? colorMenu : undefined} onKeyDown={(event) => { if (item.command === 'clip-color' && event.key === 'ArrowRight') { event.preventDefault(); setColorMenu(true); requestAnimationFrame(() => globalThis.document.querySelector<HTMLElement>('.camera3d-color-menu [aria-checked=true]')?.focus()) } }} onClick={() => { if (item.command === 'clip-color') { setColorMenu(true); requestAnimationFrame(() => globalThis.document.querySelector<HTMLElement>('.camera3d-color-menu [aria-checked=true]')?.focus()); return } if (!editLocked || item.command === 'copy') onShotCommand?.(item.command, shotMenu.id); setShotMenu(null); requestAnimationFrame(() => shotMenuReturnFocus.current?.focus()) }}><Icon size={14} /><span>{item.label}</span>{item.submenu && <ChevronRight size={14} />}{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>; return item.dividerBefore ? [<div key={`${item.command}-divider`} className="context-divider" />, button] : [button] })}</section>{colorMenu && <section className="canvas-context-menu camera3d-color-menu" role="menu" aria-label="Clip Color" onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); setColorMenu(false); globalThis.document.querySelector<HTMLElement>('.camera3d-shot-menu [aria-haspopup=menu]')?.focus() } else contextMenuRovingKey(event) }} style={{ left: Math.min(shotMenu.x + 248, innerWidth - 250), top: Math.min(shotMenu.y, innerHeight - 568) }}><header><span>CLIP COLOR</span><kbd>esc</kbd></header>{SHOT_CLIP_COLORS.map((color) => { const checked = (document.shots.find((shot) => shot.id === shotMenu.id)?.clipColor || 'clear') === color.id; return <button key={color.id} role="menuitemradio" aria-checked={checked} onClick={() => { if (!editLocked) onShotColor?.(shotMenu.id, color.id); setColorMenu(false); setShotMenu(null); requestAnimationFrame(() => shotMenuReturnFocus.current?.focus()) }}>{checked ? <Check size={14} /> : <i className="camera3d-color-check-space" />}<span>{color.name}</span>{color.hex ? <i className="camera3d-color-swatch" style={{ background: color.hex }} /> : <X size={14} />}</button> })}</section>}</>}
    {rangeMenu && <section className="canvas-context-menu camera3d-range-menu" role="menu" aria-label="RANGE menu" style={{ left: rangeMenu.x, top: rangeMenu.y }}><header><span>RANGE</span><kbd>esc</kbd></header><button role="menuitem" disabled={renderRange.scope === 'full'} onClick={() => { const cleared = clearRenderMarks(); onRenderMarks?.(cleared.marks, cleared.announcement); setRangeMenu(null); requestAnimationFrame(() => rulerReturnFocus.current?.focus()) }}><span>Clear In and Out</span></button></section>}
    {nonterminal && selectedKeyframe && <div ref={easeMenu} className="camera3d-ease-menu canvas-context-menu" role="menu" aria-label="Ease"><header><span>EASE</span><button aria-label="Dismiss Ease" onClick={dismissEase}>×</button></header>{([['linear', 'Linear'], ['ease-in', 'Ease In'], ['ease-in-out', 'Ease In–Out'], ['ease-out', 'Ease Out']] as const).map(([ease, label]) => <button key={ease} role="menuitemradio" aria-checked={selectedKeyframe.ease === ease} className={selectedKeyframe.ease === ease ? 'context-primary' : ''} onClick={() => { onEase(selectedKeyframe.id!, ease); dismissEase() }}><span className={`camera3d-ease-curve is-${ease}`} aria-hidden="true" /><span>{label}</span>{selectedKeyframe.ease === ease && <Check size={13} />}</button>)}</div>}
  </section>
}
