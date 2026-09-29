import { describe, expect, it } from 'vitest'
import { addEntity, authorEntityKeyframe, createCameraDocument, evaluateFrame } from './model'
import { cameraGuideEntity } from './CameraViewport'

function fixture() {
  let document = addEntity(createCameraDocument('camera-guide-alignment'), 'camera', 'Camera')
  const camera = document.entities.find((entity) => entity.kind === 'camera')!
  camera.transform.position = [1, 2, 3]
  camera.transform.rotation = [0, 0, 0]
  document = authorEntityKeyframe(document, camera.id, 0)
  const changed = structuredClone(document)
  const authored = changed.entities.find((entity) => entity.id === camera.id)!
  authored.transform.position = [20, 8, -4]
  authored.transform.rotation = [0, 35, 0]
  document = authorEntityKeyframe(changed, camera.id, 12)
  document.entities.find((entity) => entity.id === camera.id)!.transform = { ...document.entities.find((entity) => entity.id === camera.id)!.transform, position: [1, 2, 3], rotation: [0, 0, 0] }
  return { document, cameraId: camera.id }
}

describe('mounted Camera guide authority', () => {
  it('uses the evaluated Camera transform for body, lens origin, and frustum apex at a nonzero frame', () => {
    const { document, cameraId } = fixture()
    const raw = document.entities.find((entity) => entity.id === cameraId)!
    const evaluated = evaluateFrame(document, 12).entities.find((entity) => entity.id === cameraId)!
    expect(evaluated.transform.position).not.toEqual(raw.transform.position)
    const guide = cameraGuideEntity(document, 12, cameraId)
    expect(guide.entity.transform.position).toEqual(evaluated.transform.position)
    expect(guide.entity.transform.rotation).toEqual(evaluated.transform.rotation)
    expect(guide.lensOrigin).toEqual(evaluated.transform.position)
    expect(guide.frustumApex).toEqual(evaluated.transform.position)
  })
})
