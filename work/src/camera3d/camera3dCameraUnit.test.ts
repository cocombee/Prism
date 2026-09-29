import { describe, expect, it } from 'vitest'
import type { CameraDocument } from './model'
import {
  addEntity,
  cameraEntityForShot,
  createCameraDocument,
  deleteEntities,
  deleteShot,
  deployCameraShot,
  sanitizeCameraDocument,
} from './model'
import { applyTimelineCommand, cameraDeploymentSelection, cameraSelectionAfterEntityDeletion } from './Prism3DCameraNode'
import { shotContextMenuItems } from './exactCanvasCamera'

describe('3D Camera/Shot authored-unit contract', () => {
  it('starts with no Camera, Shot, or timeline unit', () => {
    const document = createCameraDocument('camera-unit-empty')
    expect(document.shots).toHaveLength(0)
    expect(document.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(0)
  })

  it('deploys one real Camera and one linked Shot, and sanitize round-trips the link and authored state', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-deploy'), [4, 0, -3])
    const camera = deployed.entities.find((entity) => entity.kind === 'camera')
    const shot = deployed.shots[0]
    expect(camera).toBeDefined()
    expect(deployed.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(1)
    expect(deployed.shots).toHaveLength(1)
    expect(shot.camera.activeCameraId).toBe(camera!.id)
    expect(shot.startFrame).toBe(0)
    expect(shot.endFrame - shot.startFrame).toBe(48)

    const authored = structuredClone(deployed)
    authored.shots[0].boundary = 'cut'
    authored.shots[0].duration = 3.5
    authored.shots[0].clipColor = 'violet'
    authored.entities.find((entity) => entity.id === camera!.id)!.camera!.focalLength = 85
    const clean = sanitizeCameraDocument(authored)
    const cleanCamera = clean.entities.find((entity) => entity.kind === 'camera')
    expect(clean.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(1)
    expect(clean.shots).toHaveLength(1)
    expect(clean.shots[0].camera.activeCameraId).toBe(cleanCamera!.id)
    expect(clean.shots[0]).toMatchObject({ boundary: 'cut', duration: 3.5, clipColor: 'violet' })
    expect(clean.shots[0].shotSize).toBe(authored.shots[0].shotSize)
    expect(cleanCamera!.camera?.focalLength).toBe(85)
  })

  it('materializes one concrete Camera for each existing linked Camera-less Shot without duplicating authored units', () => {
    const source = createCameraDocument('camera-unit-camera-less-shots')
    const first = structuredClone({
      id: 'shot-01', name: 'Shot 01', startFrame: 0, endFrame: 48, boundary: 'continue' as const, clipColor: 'violet' as const,
      entityOrder: [], entityStarts: {}, shotSize: 'wide', duration: 2, cameraMovement: 'static',
      camera: {
        name: 'Camera 01', keyframes: [{ id: 'shot-01-key-0', frame: 0, transform: { position: [1, 3, 8], rotation: [0, 0, 0], scale: [1, 1, 1], anchor: [0, 0, 0] }, focalLength: 50, focusDistance: 8, aperture: 4, near: .1, far: 100, target: { mode: 'free' as const }, ease: 'linear' as const }],
        transform: { position: [1, 3, 8], rotation: [0, 0, 0], scale: [1, 1, 1], anchor: [0, 0, 0] }, dimensions: [1.55, 1.28, 1.4], metadata: { frame: 0, target: { mode: 'free' as const }, focalLength: 50, focusDistance: 8, aperture: 4, near: .1, far: 100, ease: 'linear' as const, movement: 'static' }, scaleLinked: true,
      },
    }) as unknown as CameraDocument['shots'][number]
    const second = structuredClone({ ...first, id: 'shot-02', name: 'Side Shot', startFrame: 48, endFrame: 96, clipColor: 'teal' as const, camera: { ...first.camera, name: 'Side Camera', transform: { ...first.camera.transform, position: [-2, 2, 6] }, keyframes: first.camera.keyframes.map((keyframe) => ({ ...keyframe, id: 'shot-02-key-0', frame: 48, transform: { ...keyframe.transform, position: [-2, 2, 6] } })) } }) as unknown as CameraDocument['shots'][number]
    const authored = { ...source, shots: [first, second] } as CameraDocument

    expect(authored.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(0)
    const clean = sanitizeCameraDocument(authored)
    const cameras = clean.entities.filter((entity) => entity.kind === 'camera')

    expect(cameras).toHaveLength(2)
    expect(clean.shots.map((shot) => shot.id)).toEqual(['shot-01', 'shot-02'])
    expect(clean.shots.map((shot) => shot.name)).toEqual(['Shot 01', 'Side Shot'])
    expect(clean.shots.map((shot) => shot.clipColor)).toEqual(['violet', 'teal'])
    expect(clean.shots.every((shot) => shot.camera.activeCameraId)).toBe(true)
    expect(clean.shots.every((shot) => cameraEntityForShot(clean, shot))).toBe(true)
    expect(new Set(clean.shots.map((shot) => shot.camera.activeCameraId)).size).toBe(2)
    expect(clean.shots.map((shot) => shot.camera.keyframes[0].focalLength)).toEqual([50, 50])

    const repairedAgain = sanitizeCameraDocument(clean)
    expect(repairedAgain.entities.filter((entity) => entity.kind === 'camera').map((entity) => entity.id)).toEqual(cameras.map((entity) => entity.id))
    expect(repairedAgain.shots.map((shot) => shot.camera.activeCameraId)).toEqual(clean.shots.map((shot) => shot.camera.activeCameraId))
  })

  it('drops an orphan Shot and an orphan Camera instead of manufacturing a unit', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-corrupt'), [0, 0, 0])
    const corrupt = structuredClone(deployed)
    corrupt.shots[0].camera.activeCameraId = 'missing-camera'
    const clean = sanitizeCameraDocument(corrupt)
    expect(clean.shots).toHaveLength(1)
    expect(clean.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(1)
    expect(clean.sceneTree).toEqual(expect.any(Array))
  })

  it('preserves the Camera when a corrupt shared reference still has another remaining Shot', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-shared'), [0, 0, 0])
    const shared = structuredClone(deployed.shots[0])
    shared.id = 'shared-shot'
    shared.name = 'Shot 02'
    deployed.shots.push(shared)
    const clean = sanitizeCameraDocument(deployed)
    expect(clean.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(1)
    expect(clean.shots).toHaveLength(1)
    expect(clean.shots[0].camera.activeCameraId).toBe(clean.entities.find((entity) => entity.kind === 'camera')!.id)
  })

  it('deleting a real Camera removes its linked Shot and leaves ordinary assets', () => {
    const deployed = addEntity(deployCameraShot(createCameraDocument('camera-unit-delete-camera'), [0, 0, 0]), 'block', 'Block')
    const camera = deployed.entities.find((entity) => entity.kind === 'camera')!
    const next = deleteEntities(deployed, [camera.id])
    expect(next.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(0)
    expect(next.shots).toHaveLength(0)
    expect(next.entities.map((entity) => entity.name)).toEqual(['Block'])
  })

  it('clears active Shot, frame, and clip selection after deleting its Camera', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-delete-state'), [0, 0, 0])
    const camera = deployed.entities.find((entity) => entity.kind === 'camera')!
    const next = deleteEntities(deployed, [camera.id])
    expect(cameraSelectionAfterEntityDeletion(next, deployed.shots[0].id)).toEqual({ activeShotId: '', frame: 0 })
  })

  it('deleting the only Shot removes its Camera and returns no selected Shot', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-delete-shot'), [0, 0, 0])
    const result = deleteShot(deployed, deployed.shots[0].id)
    expect(result.changed).toBe(true)
    expect(result.document.shots).toHaveLength(0)
    expect(result.document.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(0)
    expect(result.selectedShotId).toBe('')
    expect(result.playhead).toBe(0)
  })

  it('selects the real Camera and its linked Shot after Add Camera deployment', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-select'), [0, 0, 0])
    const selection = cameraDeploymentSelection(deployed)
    const camera = deployed.entities.find((entity) => entity.kind === 'camera')!
    expect(selection).toEqual({
      activeShotId: deployed.shots[0].id,
      frame: deployed.shots[0].startFrame,
      selectedIds: [camera.id],
    })
    expect(selection?.selectedIds).not.toEqual([])
  })

  it('does not delete a Camera that is shared by another remaining Shot', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-shared-delete'), [0, 0, 0])
    const shared = structuredClone(deployed.shots[0])
    shared.id = 'shared-shot-delete'
    deployed.shots.push(shared)
    const cameraId = deployed.entities.find((entity) => entity.kind === 'camera')!.id
    const next = deleteEntities(deployed, [cameraId])
    expect(next.entities.find((entity) => entity.id === cameraId)?.kind).toBe('camera')
    expect(next.shots).toHaveLength(2)
  })

  it('enables timeline Delete for the only Shot and reaches the empty authored state', () => {
    const deployed = deployCameraShot(createCameraDocument('camera-unit-timeline-delete'), [0, 0, 0])
    const deleteItem = shotContextMenuItems(false, false).find((item) => item.command === 'delete')
    expect(deleteItem?.disabled).toBe(false)
    const result = applyTimelineCommand({
      document: deployed,
      command: 'delete',
      selectedShotId: deployed.shots[0].id,
      frame: 12,
      clipboard: null,
    })
    expect(result.historyTransactions).toBe(1)
    expect(result.document.shots).toHaveLength(0)
    expect(result.document.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(0)
    expect(result.selectedShotId).toBe('')
    expect(result.playhead).toBe(0)
  })
})
