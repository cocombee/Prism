import { describe, expect, it } from 'vitest'
import { addEntity, createCameraDocument } from './model'
import { cameraPanOwnsArrow, createHeldArrowController, preciseSignedRotationDegrees, selectedArrowMotion, selectedEntityArrowTransform, selectedEntityOwnsArrow } from './interaction'

const event = (key: string, modifiers: Partial<{ altKey: boolean; metaKey: boolean; ctrlKey: boolean }> = {}) => ({ key, altKey: false, metaKey: false, ctrlKey: false, shiftKey: false, ...modifiers })

describe('V14 smooth held arrow ownership and motion', () => {
  it('gives eligible selection plain Alt left/right to Roll and removes viewer pan ownership', () => {
    const scope = { selectedKind: 'human' as const, selectedCount: 1, textEntry: false, menuOpen: false, timelineRuler: false, toolbar: false, numericScrub: false }
    expect(selectedArrowMotion(event('ArrowLeft', { altKey: true }))).toBe('roll')
    expect(selectedEntityOwnsArrow(event('ArrowRight', { altKey: true }), scope)).toBe(true)
    expect(cameraPanOwnsArrow(event('ArrowRight', { altKey: true }), { textEntry: false, menuOpen: false, ruler: false, toolbar: false }, true)).toBe(false)
  })

  it('keeps Alt vertical, Cmd pitch/yaw, and targeted Camera Roll legal while Pitch/Yaw stay blocked', () => {
    let document = addEntity(createCameraDocument('v14-ownership'), 'camera', 'Camera')
    const camera = document.entities[0]
    document = { ...document, entities: [{ ...camera, camera: { ...camera.camera!, target: { mode: 'object', entityId: 'missing', lastPosition: [0, 1, 0] } } }] }
    expect(selectedArrowMotion(event('ArrowUp', { altKey: true }))).toBe('vertical')
    expect(selectedArrowMotion(event('ArrowUp', { metaKey: true }))).toBe('pitch')
    expect(selectedArrowMotion(event('ArrowLeft', { metaKey: true }))).toBe('yaw')
    expect(selectedEntityArrowTransform(document, camera.id, event('ArrowRight', { altKey: true })).blocked).toBe(false)
    expect(selectedEntityArrowTransform(document, camera.id, event('ArrowUp', { metaKey: true })).blocked).toBe(true)
  })

  it('uses elapsed-time motion rather than key-repeat steps and wraps Roll at signed integer boundaries', () => {
    const document = addEntity(createCameraDocument('v14-motion'), 'human', 'Human')
    const id = document.entities[0].id
    const first = selectedEntityArrowTransform(document, id, event('ArrowRight', { altKey: true }))
    expect(first.transform?.rotation[2]).toBe(1)
    expect(selectedEntityArrowTransform(document, id, event('ArrowLeft', { altKey: true })).transform?.rotation[2]).toBe(-1)
  })

  it('previews one canonical rotation degree and commits it on a modifier-first quick tap', () => {
    const document = addEntity(createCameraDocument('v16-quick-tap'), 'human', 'Human')
    const id = document.entities[0].id
    const frames: any[] = []
    let commit: any = null
    const scheduler = { requestFrame: () => 1, cancelFrame: () => {} }
    const controller = createHeldArrowController({ document, entityId: id, preview: (transform) => frames.push(transform), commit: (transform) => { commit = transform }, restore: () => {}, scheduler, now: () => 100 })
    controller.start(event('ArrowRight', { altKey: true }))
    controller.keyup('ArrowRight')
    expect(frames.at(-1)?.rotation[2]).toBe(1)
    expect(commit?.rotation[2]).toBe(1)
  })

  it('applies exactly one canonical modifier-transition step before the next zero-elapsed frame', () => {
    const document = addEntity(createCameraDocument('v16-transition-step'), 'human', 'Human')
    const id = document.entities[0].id
    const frames: any[] = []
    const queued: Array<(now: number) => void> = []
    const controller = createHeldArrowController({ document, entityId: id, preview: (transform) => frames.push(transform), commit: () => {}, restore: () => {}, scheduler: { requestFrame: (callback) => { queued.push(callback); return 1 }, cancelFrame: () => {} }, now: () => 100 })
    controller.start(event('ArrowRight'))
    controller.modifier(event('Meta', { metaKey: true }))
    expect(frames.at(-1)?.rotation[1]).toBe(1)
    expect(frames).toHaveLength(2)
    queued[0]?.(100)
    expect(frames).toHaveLength(2)
    controller.keyup('ArrowRight')
  })

  it('ends and commits a modifier-owned gesture when its owning modifier is released first', () => {
    const document = addEntity(createCameraDocument('v17-release-order'), 'human', 'Human')
    const id = document.entities[0].id
    const queued: Array<(now: number) => void> = []
    let commits = 0
    let restored = 0
    const controller = createHeldArrowController({
      document,
      entityId: id,
      preview: () => {},
      commit: () => { commits += 1 },
      restore: () => { restored += 1 },
      scheduler: { requestFrame: (callback) => { queued.push(callback); return queued.length }, cancelFrame: () => {} },
      now: () => 0,
    })
    controller.start(event('ArrowRight', { altKey: true }))
    queued.shift()?.(16)
    expect(controller.modifier(event('Alt'))).toBe(true)
    expect(commits).toBe(1)
    expect(restored).toBe(0)
    expect(controller.keyup('ArrowRight')).toBe(true)
    expect(commits).toBe(1)
  })

  it('wraps precise authored degrees without rounding and preserves positive 180', () => {
    expect(preciseSignedRotationDegrees(179.75)).toBe(179.75)
    expect(preciseSignedRotationDegrees(180)).toBe(180)
    expect(preciseSignedRotationDegrees(180.25)).toBe(-179.75)
    expect(preciseSignedRotationDegrees(-180.25)).toBe(179.75)
  })

  it('accumulates precise rotation across ten 16ms continuation ticks without saving while held', () => {
    const document = addEntity(createCameraDocument('v17-controller-precise-rotation'), 'human', 'Human')
    const id = document.entities[0].id
    const frames: any[] = []
    let committed: any = null
    const queued: Array<(now: number) => void> = []
    const controller = createHeldArrowController({
      document,
      entityId: id,
      preview: (transform) => frames.push(structuredClone(transform)),
      commit: (transform) => { committed = structuredClone(transform) },
      restore: () => {},
      scheduler: { requestFrame: (callback) => { queued.push(callback); return queued.length }, cancelFrame: () => {} },
      now: () => 0,
    })
    controller.start(event('ArrowRight', { altKey: true }))
    for (let tick = 1; tick <= 12; tick += 1) queued.shift()?.(tick * 16)
    const rolls = frames.map((frame) => frame.rotation[2])
    expect(new Set(rolls).size).toBeGreaterThanOrEqual(4)
    expect(rolls.at(-1)).toBeGreaterThan(2)
    expect(committed).toBeNull()
    controller.keyup('ArrowRight')
    expect(committed?.rotation[2]).toBe(rolls.at(-1))
  })
})