import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  NODE_TRANSIENT_NOTICE_MS,
  NODE_ERROR_NOTICE_MS,
  nodeErrorNoticeKey,
  scheduleNodeErrorNoticeExpiry,
  cancelNodeProgressExpiry,
  nodeLifecycleTransition,
  nodeNotificationCategory,
  scheduleNodeProgressExpiry,
  type NodeProgressExpiryTimers,
} from './nodeNotificationCategory'

describe('node notification categories', () => {
  it('classifies running, transient completion, actionable error, readiness and helper independently', () => {
    expect(nodeNotificationCategory({ runState: 'running', progress: 'Generating' })).toBe('running')
    expect(nodeNotificationCategory({ runState: 'complete', progress: 'Copied' })).toBe('transient')
    expect(nodeNotificationCategory({ runState: 'error', progress: 'Old success', error: 'Reconnect provider' })).toBe('error')
    expect(nodeNotificationCategory({ readiness: true, progress: 'Ready' })).toBe('readiness')
    expect(nodeNotificationCategory({ helper: true, progress: 'Panel 3 has 0s' })).toBe('helper')
    expect(nodeNotificationCategory({ runState: 'complete', progress: 'Video ready', suppressTerminal: true })).toBe('none')
  })
})

describe('node terminal progress expiry', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps terminal progress before 5200ms and clears the exact unchanged progress at expiry', () => {
    vi.useFakeTimers()
    let state = { runState: 'complete', progress: 'Prompt enhanced', error: undefined as string | undefined, notificationVersion: 1 }
    const cleared: string[] = []
    const timers: NodeProgressExpiryTimers = new Map()
    scheduleNodeProgressExpiry('node', state.progress!, 1, timers, () => state, (_id, progress) => { cleared.push(progress); state = { ...state, progress: '' } })
    vi.advanceTimersByTime(NODE_TRANSIENT_NOTICE_MS - 1)
    expect(cleared).toEqual([])
    vi.advanceTimersByTime(1)
    expect(cleared).toEqual(['Prompt enhanced'])
    expect(timers.size).toBe(0)
  })

  it('restarts the full lifetime for a newly committed identical terminal emission', () => {
    vi.useFakeTimers()
    let state = { runState: 'complete', progress: 'Prompt enhanced', error: undefined as string | undefined, notificationVersion: 1 }
    const cleared: string[] = []
    const timers: NodeProgressExpiryTimers = new Map()
    const read = () => state
    scheduleNodeProgressExpiry('node', state.progress, state.notificationVersion, timers, read, (_id, progress) => cleared.push(progress))
    vi.advanceTimersByTime(4000)
    state = { ...state, notificationVersion: 2 }
    scheduleNodeProgressExpiry('node', state.progress, state.notificationVersion, timers, read, (_id, progress) => cleared.push(progress))
    vi.advanceTimersByTime(1200)
    expect(cleared).toEqual([])
    vi.advanceTimersByTime(3999)
    expect(cleared).toEqual([])
    vi.advanceTimersByTime(1)
    expect(cleared).toEqual(['Prompt enhanced'])
  })

  it('makes an actionable error supersede terminal progress and versions terminal emissions', () => {
    const complete = nodeLifecycleTransition({ runState: 'complete', progress: 'Prompt enhanced', notificationVersion: 4, error: undefined as string | undefined }, { progress: 'Prompt enhanced', runState: 'complete' })
    expect(complete).toMatchObject({ progress: 'Prompt enhanced', notificationVersion: 5 })
    const failed = nodeLifecycleTransition({ ...complete }, { error: 'Choose a provider.' })
    expect(failed).toMatchObject({ runState: 'error', error: 'Choose a provider.', progress: undefined })
    const corrected = nodeLifecycleTransition({ ...complete, ...failed }, { error: undefined })
    expect(corrected.progress).toBeUndefined()
  })

  it('cannot clear superseding progress, running state, error, or survive cleanup', () => {
    vi.useFakeTimers()
    let state = { runState: 'complete', progress: 'Old completion', error: undefined as string | undefined }
    const cleared: string[] = []
    const timers: NodeProgressExpiryTimers = new Map()
    scheduleNodeProgressExpiry('node', state.progress!, 1, timers, () => state, (_id, progress) => cleared.push(progress))
    state = { runState: 'running', progress: 'New run', error: undefined }
    vi.advanceTimersByTime(NODE_TRANSIENT_NOTICE_MS)
    expect(cleared).toEqual([])

    state = { runState: 'complete', progress: 'New completion', error: 'Action required' }
    scheduleNodeProgressExpiry('node', state.progress, 2, timers, () => state, (_id, progress) => cleared.push(progress))
    vi.advanceTimersByTime(NODE_TRANSIENT_NOTICE_MS)
    expect(cleared).toEqual([])

    state = { runState: 'complete', progress: 'Unmounted completion', error: undefined }
    scheduleNodeProgressExpiry('node', state.progress, 2, timers, () => state, (_id, progress) => cleared.push(progress))
    cancelNodeProgressExpiry('node', timers)
    vi.advanceTimersByTime(NODE_TRANSIENT_NOTICE_MS)
    expect(cleared).toEqual([])
  })
})

// Successful later attempts must not retain an earlier failure.
describe('node error lifecycle', () => {
  it('clears a stale failure on success while retaining a new explicit failure', () => {
    const old = { runState: 'error', error: 'Contract timeout', notificationVersion: 3 }
    expect({ ...old, ...nodeLifecycleTransition(old, { runState: 'complete' }) }).toMatchObject({ runState: 'complete', error: undefined })
    expect(nodeLifecycleTransition(old, { runState: 'complete', error: 'New failure' })).toMatchObject({ runState: 'error', error: 'New failure', notificationVersion: 4 })
  })
  it('versions repeated identical errors as separate occurrences', () => {
    const old = { runState: 'error', error: 'Contract timeout', notificationVersion: 3 }
    expect(nodeLifecycleTransition(old, { error: 'Contract timeout' })).toMatchObject({ notificationVersion: 4 })
  })
})

describe('failed-attempt feedback lifetime', () => {
  afterEach(() => vi.useRealTimers())
  it('expires exactly at ten seconds without altering the failure', () => {
    vi.useFakeTimers()
    const state={error:'Timeout',runState:'error',notificationVersion:1}
    const key=nodeErrorNoticeKey(state)!;const expire=vi.fn()
    scheduleNodeErrorNoticeExpiry(key,()=>nodeErrorNoticeKey(state),expire)
    vi.advanceTimersByTime(NODE_ERROR_NOTICE_MS-1);expect(expire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1);expect(expire).toHaveBeenCalledOnce();expect(state.error).toBe('Timeout')
  })
  it('cannot expire a superseding identical error, success, running state, or cancelled owner', () => {
    vi.useFakeTimers();let state={error:'Timeout',runState:'error',notificationVersion:1};const expire=vi.fn()
    scheduleNodeErrorNoticeExpiry(nodeErrorNoticeKey(state)!,()=>nodeErrorNoticeKey(state),expire)
    state={...state,notificationVersion:2};vi.advanceTimersByTime(10000);expect(expire).not.toHaveBeenCalled()
    const cancel=scheduleNodeErrorNoticeExpiry(nodeErrorNoticeKey(state)!,()=>nodeErrorNoticeKey(state),expire);cancel()
    vi.advanceTimersByTime(10000);expect(expire).not.toHaveBeenCalled()
    for (const runState of ['queued','running','complete']) expect(nodeErrorNoticeKey({...state,runState})).toBeUndefined()
  })
})
