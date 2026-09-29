import { describe, expect, it } from 'vitest'
import {
  createCameraDocument,
  addEntity,
  sanitizeCameraDocument,
  snapShotDurationSeconds,
  framesForShotDuration,
  duplicateShotCameraUnit,
  evaluateFrame,
  resolveCameraSelectionDomain,
} from './model'

describe('3D Camera Eighteenth Shot-owned Camera canonical model', () => {
  it('evaluates the Shot-owned transform and optics as the only runtime Camera authority', () => {
    const document = createCameraDocument('shot-camera-runtime')
    const shot = document.shots[0]
    shot.camera.transform!.position = [8, 7, 6]
    shot.camera.metadata!.focalLength = 85
    const evaluated = evaluateFrame(document, shot.startFrame)
    expect(evaluated.camera.transform.position).toEqual([8, 7, 6])
    expect(evaluated.camera.focalLength).toBe(85)
    expect(evaluated.entities.some((entity) => entity.kind === 'camera')).toBe(false)
  })

  it('migrates one shared loose Camera into independent Shot-owned states and removes every loose Camera', () => {
    let legacy = addEntity(addEntity(createCameraDocument('shared-camera'), 'camera', 'Shared'), 'camera', 'Unused')
    const shared = legacy.entities[0]
    shared.transform.position = [4, 5, 6]
    shared.camera!.focalLength = 85
    shared.camera!.target = { mode: 'point', position: [1, 2, 3] }
    shared.camera!.movement = 'orbit-left'
    shared.keyframes = [{ id: 'legacy-transform-key', frame: 12, transform: { ...structuredClone(shared.transform), position: [7, 8, 9] }, ease: 'ease-in' }]
    const second = structuredClone(legacy.shots[0])
    second.id = 'shot-two'
    second.name = 'Shot 02'
    second.startFrame = 48
    second.endFrame = 96
    second.camera.keyframes = second.camera.keyframes.map((key) => ({ ...key, id: `${key.id}-two`, frame: key.frame + 48 }))
    legacy.shots.push(second)
    for (const shot of legacy.shots) shot.camera.activeCameraId = shared.id

    const migrated = sanitizeCameraDocument(legacy)

    expect(migrated.entities.some((entity) => entity.kind === 'camera')).toBe(false)
    expect(migrated.shots.map((shot) => shot.camera.activeCameraId)).toEqual([undefined, undefined])
    expect(migrated.shots.map((shot) => shot.camera.transform?.position)).toEqual([[4, 5, 6], [7, 8, 9]])
    expect(migrated.shots[0].camera.keyframes.some((key) => key.frame === 12 && key.transform.position[0] === 7)).toBe(true)
    expect(migrated.shots.map((shot) => shot.camera.metadata?.focalLength)).toEqual([85, 85])
    expect(migrated.shots.map((shot) => shot.camera.metadata?.target)).toEqual([
      { mode: 'point', position: [1, 2, 3] },
      { mode: 'point', position: [1, 2, 3] },
    ])
    expect(migrated.shots.map((shot) => shot.camera.metadata?.movement)).toEqual(['orbit-left', 'orbit-left'])
    expect(migrated.shots[0].camera).not.toBe(migrated.shots[1].camera)
    expect(migrated.shots[0].camera.metadata).not.toBe(migrated.shots[1].camera.metadata)
    migrated.shots[0].camera.transform!.position[0] = 999
    migrated.shots[0].camera.keyframes[0].transform.position[0] = 998
    expect(migrated.shots[1].camera.transform!.position).toEqual([7, 8, 9])
    expect(migrated.shots[1].camera.keyframes[0].transform.position[0]).not.toBe(998)
  })

  it('synthesizes a default Shot Camera for a missing legacy reference and strips migration-only authority', () => {
    const legacy = createCameraDocument('missing-camera')
    legacy.shots[0].camera.activeCameraId = 'missing'
    legacy.shots[0].camera.keyframes = []
    legacy.shots[0].camera.transform = undefined
    legacy.shots[0].camera.metadata = undefined

    const migrated = sanitizeCameraDocument(legacy)

    expect(migrated.shots[0].camera.activeCameraId).toBeUndefined()
    expect(migrated.shots[0].camera.transform?.position).toEqual([0, 3, 8])
    expect(migrated.shots[0].camera.metadata).toMatchObject({ focalLength: 35, target: { mode: 'free' }, movement: 'static' })
    expect(migrated.shots[0].camera.keyframes).toHaveLength(2)
  })

  it('uses snapped half-second duration as canonical timing and derives stable 24/30 fps boundaries', () => {
    expect(snapShotDurationSeconds(2.74)).toBe(2.5)
    expect(snapShotDurationSeconds(Number.NaN)).toBe(.5)
    expect(framesForShotDuration(2.5, 24)).toBe(60)
    expect(framesForShotDuration(2.5, 30)).toBe(75)

    for (const fps of [24, 30] as const) {
      const legacy = createCameraDocument(`seconds-${fps}`)
      legacy.fps = fps
      const second = structuredClone(legacy.shots[0])
      second.id = `second-${fps}`
      second.duration = 1.26
      second.startFrame = 900
      second.endFrame = 901
      second.camera.keyframes.forEach((key) => { key.frame += 900 })
      legacy.shots[0].duration = 2.74
      legacy.shots[0].startFrame = 100
      legacy.shots[0].endFrame = 101
      legacy.shots.push(second)

      const migrated = sanitizeCameraDocument(legacy)

      expect(migrated.shots.map(({ duration }) => duration)).toEqual([2.5, 1.5])
      expect(migrated.shots.map(({ startFrame, endFrame }) => [startFrame, endFrame])).toEqual([
        [0, fps * 2.5],
        [fps * 2.5, fps * 4],
      ])
      expect(migrated.shots[1].camera.keyframes[0].frame).toBeGreaterThanOrEqual(migrated.shots[1].startFrame)
    }
  })

  it('persists root assets as global siblings using explicit order then a stable legacy-order union', () => {
    let legacy = addEntity(addEntity(addEntity(createCameraDocument('root-order'), 'block', 'A'), 'sphere', 'B'), 'column', 'C')
    const [a, b, c] = legacy.entities.map(({ id }) => id)
    legacy.sceneTree = [legacy.shots[0].id, b, 'missing']
    legacy.shots[0].entityOrder = [c, a, b]
    const second = structuredClone(legacy.shots[0])
    second.id = 'root-shot-two'
    second.entityOrder = [a, c]
    legacy.shots.push(second)

    const migrated = sanitizeCameraDocument(legacy)

    expect(migrated.sceneTree).toEqual([b, c, a])
    expect(migrated.shots[0].entityOrder).toEqual([c, a, b])
    expect(migrated.shots[1].entityOrder).toEqual([a, c, b])
  })

  it('duplicates the complete Shot/Camera timeline unit with fresh identity and no shared mutable state', () => {
    const sourceDocument = createCameraDocument('duplicate-unit')
    const source = sourceDocument.shots[0]
    source.clipColor = 'violet'
    source.duration = 2.5
    source.camera.transform!.position = [9, 8, 7]
    source.camera.metadata!.focalLength = 100
    source.camera.keyframes[0].target = { mode: 'point', position: [3, 2, 1] }

    const duplicated = duplicateShotCameraUnit(sourceDocument, source.id)
    const copy = duplicated.shots[1]

    expect(copy).toMatchObject({ name: 'Shot 01 Copy', clipColor: 'violet', duration: 2.5 })
    expect(copy.id).not.toBe(source.id)
    expect(copy.camera.transform?.position).toEqual([9, 8, 7])
    expect(copy.camera.metadata?.focalLength).toBe(100)
    expect(copy.camera.keyframes.map(({ id }) => id)).not.toEqual(source.camera.keyframes.map(({ id }) => id))
    copy.camera.transform!.position[0] = 999
    copy.camera.keyframes[0].target = { mode: 'free' }
    expect(source.camera.transform!.position).toEqual([9, 8, 7])
    expect(source.camera.keyframes[0].target).toEqual({ mode: 'point', position: [3, 2, 1] })
  })

  it('keeps playback Shot identity outside the explicit clip/scene selection domain', () => {
    expect(resolveCameraSelectionDomain({ playbackShotId: 'playing' })).toEqual({ domain: 'none' })
    expect(resolveCameraSelectionDomain({ playbackShotId: 'playing', selectedClipShotId: 'selected' })).toEqual({ domain: 'timeline', shotId: 'selected' })
    expect(resolveCameraSelectionDomain({ playbackShotId: 'playing', selectedEntityIds: ['asset'] })).toEqual({ domain: 'scene', entityIds: ['asset'] })
  })
})
