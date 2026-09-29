import { describe, expect, it } from 'vitest'
import {
  addEntity, applyTransformCommit, createCameraDocument, duplicateShot, sanitizeCameraDocument,
  setEntityLockScope, toggleEntityLockScope, updateShotCameraEntity,
} from './model'

describe('scoped camera/entity locks', () => {
  it('migrates legacy locationLocked input to Transform without retaining legacy authority', () => {
    const raw = addEntity(createCameraDocument('legacy'), 'human', 'Human') as any
    raw.entities[0].locationLocked = true
    const migrated = sanitizeCameraDocument(raw)
    expect(migrated.entities[0].locks).toEqual({ transform: true })
    expect(migrated.entities[0]).not.toHaveProperty('locationLocked')
  })

  it('round-trips, duplicates, materializes, and mirrors all scopes', () => {
    let doc = addEntity(addEntity(createCameraDocument('locks'), 'camera', 'Camera'), 'human', 'Human')
    const camera = doc.entities.find((item) => item.kind === 'camera')!
    doc = setEntityLockScope(doc, camera.id, 'all', true)
    doc = setEntityLockScope(doc, camera.id, 'transform', true)
    doc = setEntityLockScope(doc, camera.id, 'settings', true)
    const roundTrip = sanitizeCameraDocument(structuredClone(doc))
    const restored = roundTrip.entities.find((item) => item.id === camera.id)!
    expect(restored.locks).toEqual({ all: true, transform: true, settings: true })
    expect(roundTrip.shots[0].camera.locks).toEqual(restored.locks)
    const copied = duplicateShot(roundTrip, roundTrip.shots[0].id)
    const copy = copied.entities.find((item) => item.kind === 'camera' && item.id !== camera.id)!
    expect(copy.locks).toEqual(restored.locks)
    const mirrored = updateShotCameraEntity(roundTrip, roundTrip.shots[0].id, restored)
    expect(mirrored.shots[0].camera.locks).toEqual(restored.locks)
  })

  it('restores explicit local locks after unlocking All and guards only locked scope', () => {
    let doc = addEntity(addEntity(createCameraDocument('guards'), 'camera', 'Camera'), 'human', 'Human')
    const camera = doc.entities.find((item) => item.kind === 'camera')!
    doc = setEntityLockScope(doc, camera.id, 'transform', true)
    doc = setEntityLockScope(doc, camera.id, 'settings', false)
    doc = setEntityLockScope(doc, camera.id, 'all', true)
    expect(doc.entities.find((item) => item.id === camera.id)!.locks).toMatchObject({ all: true, transform: true, settings: false })
    doc = toggleEntityLockScope(doc, camera.id, 'all')
    const unlocked = doc.entities.find((item) => item.id === camera.id)!
    expect(unlocked.locks).toMatchObject({ all: false, transform: true, settings: false })
    const blocked = applyTransformCommit(doc, camera.id, { ...unlocked.transform, position: [1, 2, 3] }, { gridSnap: false, collision: false, groundSnap: false, optionBypass: true })
    expect(blocked).toMatchObject({ ok: false, code: 'TRANSFORM_LOCKED' })
  })

  it('keeps Rotation lock independent from Transform and resets only Euler rotation', () => {
    let doc = addEntity(createCameraDocument('rotation-scope'), 'camera', 'Camera')
    const camera = doc.entities.find((item) => item.kind === 'camera')!
    doc = setEntityLockScope(doc, camera.id, 'rotation', true)
    const locked = doc.entities.find((item) => item.id === camera.id)!
    expect(locked.locks).toEqual({ rotation: true })
    const rotationAttempt = applyTransformCommit(doc, camera.id, { ...locked.transform, rotation: [10, 20, 30] }, { gridSnap: false, collision: false, groundSnap: false, optionBypass: true })
    expect(rotationAttempt).toMatchObject({ ok: false, code: 'ROTATION_LOCKED' })
    const positionAttempt = applyTransformCommit(doc, camera.id, { ...locked.transform, position: [1, 2, 3] }, { gridSnap: false, collision: false, groundSnap: false, optionBypass: true })
    expect(positionAttempt.ok).toBe(true)
  })
})
