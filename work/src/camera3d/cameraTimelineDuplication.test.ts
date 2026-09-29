import { describe, expect, it } from 'vitest'
import { addEntity, createCameraDocument } from './model'
import { duplicateNodeShotAtBoundary } from './Prism3DCameraNode'

describe('Camera timeline complete-unit duplication', () => {
  it('duplicates one complete Camera/Shot unit in one history transaction while preserving the source and unrelated assets', () => {
    let document = addEntity(createCameraDocument('option-duplicate-unit'), 'camera', 'Camera')
    document = addEntity(document, 'block', 'Unrelated Block')
    const sourceShot = document.shots[0]
    const sourceCamera = document.entities.find((entity) => entity.id === sourceShot.camera.activeCameraId)!
    sourceShot.boundary = 'cut'
    sourceShot.duration = 2
    sourceShot.cameraMovement = 'dolly'
    sourceShot.camera.keyframes = [{ ...sourceShot.camera.keyframes[0], id: 'source-camera-key', frame: 0, property: 'camera.target', target: { mode: 'free' } }]
    sourceCamera.keyframes = [{ id: 'source-position-key', frame: 12, property: 'position', transform: { ...structuredClone(sourceCamera.transform), position: [1, 2, 3] }, ease: 'ease-in-out' }]
    const sourceShotBefore = structuredClone(sourceShot)
    const sourceCameraBefore = structuredClone(sourceCamera)
    const unrelatedBefore = structuredClone(document.entities.find((entity) => entity.name === 'Unrelated Block'))
    const history: Array<unknown> = []

    const next = duplicateNodeShotAtBoundary(
      { push: (value) => history.push(value) },
      { document, activeShotId: sourceShot.id, frame: 0, selectedIds: [sourceCamera.id] },
      sourceShot.id,
      1,
    )

    expect(history).toHaveLength(1)
    expect(next.document.shots).toHaveLength(2)
    expect(next.document.entities.filter((entity) => entity.kind === 'camera')).toHaveLength(2)
    expect(next.document.shots[0]).toEqual(sourceShotBefore)
    expect(next.document.entities.find((entity) => entity.id === sourceCamera.id)).toEqual(sourceCameraBefore)
    expect(next.document.entities.find((entity) => entity.name === 'Unrelated Block')).toEqual(unrelatedBefore)
    const duplicate = next.document.shots[1]
    expect(duplicate.id).not.toBe(sourceShot.id)
    expect(duplicate.camera.activeCameraId).not.toBe(sourceCamera.id)
    expect(duplicate.endFrame - duplicate.startFrame).toBe(sourceShot.endFrame - sourceShot.startFrame)
    expect(duplicate.boundary).toBe(sourceShot.boundary)
    expect(duplicate.cameraMovement).toBe(sourceShot.cameraMovement)
    expect(duplicate.camera.keyframes.map((keyframe) => ({ frame: keyframe.frame - duplicate.startFrame, property: keyframe.property, target: keyframe.target }))).toEqual(
      sourceShot.camera.keyframes.map((keyframe) => ({ frame: keyframe.frame - sourceShot.startFrame, property: keyframe.property, target: keyframe.target })),
    )
    expect(next.activeShotId).toBe(duplicate.id)
    expect(next.frame).toBe(duplicate.startFrame)
  })
})
