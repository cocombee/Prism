import { describe, expect, it } from 'vitest'
import { addEntity, createCameraDocument, normalizeRotationDegrees, resetEntityRotation, resetCameraTarget, setCameraAimMode, setCameraLockTarget, formatTransformNumeric } from './model'
import { selectedEntityArrowTransform, selectedEntityOwnsArrow, cameraPanOwnsArrow } from './interaction'

describe('V13 targeted rotation and numeric contracts', () => {
  const fixture = () => {
    let document = addEntity(createCameraDocument('v13'), 'camera', 'Camera')
    document = addEntity(document, 'human', 'Human')
    document = addEntity(document, 'block', 'Block')
    const camera = document.entities.find((entity) => entity.kind === 'camera')!
    const human = document.entities.find((entity) => entity.kind === 'human')!
    const block = document.entities.find((entity) => entity.kind === 'block')!
    camera.transform = { ...camera.transform, position: [0, 1, 4], rotation: [23, 47, 12] }
    human.transform = { ...human.transform, position: [2, 2, 0] }
    return { document, camera, human, block }
  }

  it('targeted rotation reset preserves computed Pitch/Yaw and zeros only Roll', () => {
    const { document, camera, human } = fixture()
    const targeted = setCameraLockTarget(camera, human.id, document.entities)
    const withTarget = { ...document, entities: document.entities.map((entity) => entity.id === camera.id ? targeted : entity) }
    const reset = resetEntityRotation(withTarget, camera.id)
    const result = reset.entities.find((entity) => entity.id === camera.id)!
    expect(result.camera?.target).toMatchObject({ mode: 'object', entityId: human.id })
    expect(result.transform.rotation[2]).toBe(0)
    expect(result.transform.rotation.slice(0, 2)).toEqual(targeted.transform.rotation.slice(0, 2).map(Math.round))
  })

  it('free rotation reset clears all rotation while target reset preserves the current view', () => {
    const { document, camera, human } = fixture()
    const targeted = setCameraLockTarget(camera, human.id, document.entities)
    const targetedDocument = { ...document, entities: document.entities.map((entity) => entity.id === camera.id ? targeted : entity) }
    const unlocked = resetCameraTarget(targetedDocument, camera.id)
    const unlockedCamera = unlocked.entities.find((entity) => entity.id === camera.id)!
    expect(unlockedCamera.camera?.target.mode).toBe('free')
    expect(unlockedCamera.transform.rotation).toEqual(targeted.transform.rotation)
    expect(resetEntityRotation(unlocked, camera.id).entities.find((entity) => entity.id === camera.id)!.transform.rotation).toEqual([0, 0, 0])
  })

  it('wraps signed integer rotation in both directions without endpoint clamping', () => {
    expect(normalizeRotationDegrees(180)).toBe(180)
    expect(normalizeRotationDegrees(181)).toBe(-179)
    expect(normalizeRotationDegrees(-181)).toBe(179)
    expect(normalizeRotationDegrees(180 + 1)).toBe(-179)
  })

  it('formats Transform numbers to four significant digits and keeps editing intermediates', () => {
    expect(formatTransformNumeric(1.9994)).toBe('1.999')
    expect(formatTransformNumeric(12.994)).toBe('12.99')
    expect(formatTransformNumeric(123.94)).toBe('123.9')
    expect(formatTransformNumeric(1234)).toBe('1234')
    expect(formatTransformNumeric(-1.994)).toBe('-1.994')
    expect(formatTransformNumeric(0.0019994)).toBe('0.001999')
  })

  it('maps object modifier ownership to Pitch/Yaw/Roll and preserves plain Alt pan', () => {
    const { document, human, block } = fixture()
    const event = (key: string, metaKey = false, altKey = false) => ({ key, metaKey, ctrlKey: false, altKey, shiftKey: false })
    expect(selectedEntityArrowTransform(document, human.id, event('ArrowUp', true)).transform?.rotation[0]).toBe(1)
    expect(selectedEntityArrowTransform(document, human.id, event('ArrowLeft', true)).transform?.rotation[1]).toBe(-1)
    expect(selectedEntityArrowTransform(document, block.id, event('ArrowRight', true, true)).transform?.rotation[2]).toBe(1)
    expect(selectedEntityOwnsArrow(event('ArrowRight', true, true), { selectedKind: 'human', selectedCount: 1, textEntry: false, menuOpen: false, timelineRuler: false, toolbar: false, numericScrub: false })).toBe(true)
    expect(cameraPanOwnsArrow(event('ArrowRight', false, true), { textEntry: false, menuOpen: false, ruler: false, toolbar: false })).toBe(true)
  })
})
