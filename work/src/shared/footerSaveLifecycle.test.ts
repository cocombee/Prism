import { describe, expect, it, vi } from 'vitest'
import { SAVE_SUCCESS_TRANSIENT_MS, createSavePresentationLifecycle } from './footerSaveLifecycle'

describe('Canvas toolbar save presentation lifecycle', () => {
  it('moves dirty through saving and success for exactly the shared transient interval', () => {
    vi.useFakeTimers()
    const states: string[] = []
    const lifecycle = createSavePresentationLifecycle((state) => states.push(state))

    lifecycle.markDirty()
    expect(lifecycle.beginSaving()).toBe(true)
    expect(lifecycle.beginSaving()).toBe(false)
    lifecycle.resolve(false)
    expect(lifecycle.current()).toBe('success')
    vi.advanceTimersByTime(SAVE_SUCCESS_TRANSIENT_MS - 1)
    expect(lifecycle.current()).toBe('success')
    vi.advanceTimersByTime(1)
    expect(lifecycle.current()).toBe('saved')
    expect(states).toEqual(['unsaved', 'saving', 'success', 'saved'])
    vi.useRealTimers()
  })

  it('cancels success immediately for a new mutation and rejects stale or failed saves as dirty', () => {
    vi.useFakeTimers()
    const lifecycle = createSavePresentationLifecycle(() => undefined)

    lifecycle.markDirty()
    lifecycle.beginSaving()
    lifecycle.resolve(false)
    lifecycle.markDirty()
    expect(lifecycle.current()).toBe('unsaved')
    vi.advanceTimersByTime(SAVE_SUCCESS_TRANSIENT_MS)
    expect(lifecycle.current()).toBe('unsaved')

    lifecycle.beginSaving()
    lifecycle.resolve(true)
    expect(lifecycle.current()).toBe('unsaved')
    lifecycle.beginSaving()
    lifecycle.reject()
    expect(lifecycle.current()).toBe('unsaved')
    vi.useRealTimers()
  })

  it('clears pending success timers on replacement, retry, and disposal', () => {
    vi.useFakeTimers()
    const states: string[] = []
    const lifecycle = createSavePresentationLifecycle((state) => states.push(state))

    lifecycle.markDirty()
    lifecycle.beginSaving()
    lifecycle.resolve(false)
    lifecycle.replaceClean()
    vi.advanceTimersByTime(SAVE_SUCCESS_TRANSIENT_MS)
    expect(states.at(-1)).toBe('saved')

    lifecycle.markDirty()
    lifecycle.beginSaving()
    lifecycle.resolve(false)
    lifecycle.dispose()
    vi.advanceTimersByTime(SAVE_SUCCESS_TRANSIENT_MS)
    expect(states.at(-1)).toBe('success')
    vi.useRealTimers()
  })
})
