import { describe, expect, it } from 'vitest'
import {
  addEntity,
  authorCameraFocalLengthKeyframe,
  authorCameraMovementKeyframe,
  authorCameraTargetKeyframe,
  cameraMovementOptions,
  createCameraDocument,
  evaluateFrame,
  resetCameraSection,
  resetShotCameraProperty,
  resizeShotSeconds,
  setCameraAimMode,
  toggleCameraSectionKeyframe,
  toggleShotCameraPropertyKeyframe,
} from './model'
import { cameraShotClipSecondaryCopy } from './exactCanvasCamera'

describe('settled Camera Inspector model contract', () => {
  it('keeps Camera timeline secondary copy truthful without legacy Shot Size text', () => {
    expect(cameraShotClipSecondaryCopy({ duration: 2, shotSize: 'wide' })).toBe('2s')
    expect(cameraShotClipSecondaryCopy({ duration: 3, shotSize: 'medium' })).not.toMatch(/wide|medium|close-up|detail/i)
  })
  const fixture = () => {
    let document = addEntity(createCameraDocument('camera-inspector'), 'camera', 'Camera')
    document = addEntity(document, 'human', 'Human')
    const shot = document.shots[0]
    const camera = document.entities.find((entity) => entity.kind === 'camera')!
    return { document, shot, camera }
  }

  it('persists focal length through an explicit camera.focalLength keyframe authority', () => {
    const { document, shot } = fixture()
    const authored = authorCameraFocalLengthKeyframe(document, shot.id, 12, 85)
    expect(authored.shots[0].camera.keyframes.find((key) => key.property === 'camera.focalLength' && key.frame === 12)?.focalLength).toBe(85)
    expect(evaluateFrame(authored, 12).camera.focalLength).toBe(85)
    const toggled = toggleShotCameraPropertyKeyframe(authored, shot.id, 'camera.focalLength', 12)
    expect(toggled.action).toBe('removed')
    expect(toggled.document.shots[0].camera.keyframes.some((key) => key.property === 'camera.focalLength' && key.frame === 12)).toBe(false)
  })

  it('offers only canonical movement IDs and resets movement at the authored frame', () => {
    const { document, shot } = fixture()
    const ids = cameraMovementOptions().map((option) => option.id)
    expect(ids).not.toContain('slow-pan-left')
    expect(ids).not.toContain('rack-focus-near')
    const authored = authorCameraMovementKeyframe(document, shot.id, 12, 'pan-left')
    expect(authored.shots[0].camera.keyframes.find((key) => key.property === 'camera.movement' && key.frame === 12)?.movement).toBe('pan-left')
    const reset = resetShotCameraProperty(authored, shot.id, 'camera.movement', 12)
    expect(evaluateFrame(reset, 12).camera.movement).toBe('static')
    expect(reset.shots[0].camera.keyframes.some((key) => key.property === 'camera.movement' && key.frame === 12 && key.movement === 'pan-left')).toBe(false)
  })

  it('keeps Point compatible internally while the inspector aim contract is Free or Target', () => {
    const { document, shot, camera } = fixture()
    const point = setCameraAimMode(camera, 'point', document.entities)
    expect(point.camera?.target.mode).toBe('point')
    const target = setCameraAimMode(camera, 'object', document.entities)
    const authored = authorCameraTargetKeyframe(document, shot.id, 12, target.camera!.target)
    expect(authored.shots[0].camera.keyframes.find((key) => key.property === 'camera.target' && key.frame === 12)?.target.mode).toBe('object')
    const reset = resetShotCameraProperty(authored, shot.id, 'camera.target', 12)
    expect(evaluateFrame(reset, 12).camera.target.mode).toBe('free')
  })

  it('snaps duration to 0.5 seconds through the Shot authority and keeps timeline frames aligned', () => {
    const { document, shot } = fixture()
    const resized = resizeShotSeconds(document, shot.id, 2.25)
    expect(resized.shots[0].duration).toBe(2.5)
    expect(resized.shots[0].endFrame - resized.shots[0].startFrame).toBe(60)
  })

  it('master reset is one pure transaction that preserves transforms and unrelated keys', () => {
    const { document, shot, camera } = fixture()
    let changed = authorCameraFocalLengthKeyframe(document, shot.id, 12, 100)
    changed = authorCameraMovementKeyframe(changed, shot.id, 12, 'pan-left')
    changed = authorCameraTargetKeyframe(changed, shot.id, 12, { mode: 'object', entityId: document.entities.find((entity) => entity.kind === 'human')!.id })
    changed = resizeShotSeconds(changed, shot.id, 3)
    const beforeTransform = changed.entities.find((entity) => entity.id === camera.id)!.transform
    const reset = resetCameraSection(changed, shot.id)
    expect(reset.shots[0].duration).toBe(2)
    expect(reset.shots[0].camera.keyframes.some((key) => ['camera.focalLength', 'camera.movement', 'camera.target'].includes(key.property || ''))).toBe(false)
    expect(reset.shots[0].camera.metadata?.focalLength).toBe(35)
    expect(reset.shots[0].camera.metadata?.target.mode).toBe('free')
    expect(reset.shots[0].camera.metadata?.movement).toBe('static')
    expect(reset.entities.find((entity) => entity.id === camera.id)!.transform).toEqual(beforeTransform)
  })

  it('toggles the Camera section Target, Movement, and Focal Length atomically at one frame', () => {
    const { document, shot } = fixture()
    const added = toggleCameraSectionKeyframe(document, shot.id, 12)
    expect(added.action).toBe('added')
    expect(added.document.shots[0].camera.keyframes.filter((key) => key.frame === 12).map((key) => key.property).sort()).toEqual(['camera.focalLength', 'camera.movement', 'camera.target'])
    const removed = toggleCameraSectionKeyframe(added.document, shot.id, 12)
    expect(removed.action).toBe('removed')
    expect(removed.document.shots[0].camera.keyframes.some((key) => key.frame === 12 && ['camera.target', 'camera.movement', 'camera.focalLength'].includes(key.property || ''))).toBe(false)
  })
})
