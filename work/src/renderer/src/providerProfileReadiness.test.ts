import { describe, expect, it, vi } from 'vitest'
import { createProviderProfileReadiness } from './providerProfileReadiness'

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

describe('authoritative selected-account readiness', () => {
  it('commits missing-key false regardless of connected registry metadata', async () => {
    const readiness = createProviderProfileReadiness(), commit = vi.fn()
    await readiness.refresh(() => true, async () => ({ anthropic: false }), commit)
    expect(commit).toHaveBeenCalledWith({ anthropic: false })
  })
  it.each(['add', 'disconnect', 'reconnect', 'sign-out', 'default', 'rename', 'project selection'])('%s discards an older connection read', async () => {
    const readiness = createProviderProfileReadiness(), old = deferred<object>(), commit = vi.fn()
    const previous = readiness.refresh(() => true, () => old.promise, commit)
    readiness.invalidate()
    await readiness.refresh(() => true, async () => ({ fal: false }), commit)
    old.resolve({ fal: true }); expect(await previous).toBe(false)
    expect(commit.mock.calls).toEqual([[{ fal: false }]])
  })
  it('does not commit or report a delayed response after project activation changes', async () => {
    const readiness = createProviderProfileReadiness(), pending = deferred<object>(), commit = vi.fn(); let active = true
    const read = readiness.refresh(() => active, () => pending.promise, commit)
    active = false; pending.reject(Error('old project'))
    expect(await read).toBe(false); expect(commit).not.toHaveBeenCalled()
  })
  it('retains an actual current read failure without inventing availability', async () => {
    const readiness = createProviderProfileReadiness(), commit = vi.fn()
    await expect(readiness.refresh(() => true, async () => { throw Error('Store unavailable') }, commit)).rejects.toThrow('Store unavailable')
    expect(commit).not.toHaveBeenCalled()
  })
})
