import { describe, expect, it, vi } from 'vitest'
import { ScopedCatalogCache } from './scopedCatalogCache'

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes }); return { promise, resolve } }

describe('scoped catalog cache', () => {
  it('coalesces current discovery, caches verified empty and refreshes at expiry', async () => {
    let now = 0; const cache = new ScopedCatalogCache<string[]>(100, () => now); const gate = deferred<string[]>(); const load = vi.fn(() => gate.promise)
    const first = cache.read('A', load, () => undefined); const second = cache.read('A', load, () => undefined)
    gate.resolve([]); expect(await first).toEqual([]); expect(await second).toEqual([]); expect(load).toHaveBeenCalledTimes(1)
    expect(await cache.read('A', async () => ['wrong fallback'], () => undefined)).toEqual([])
    now = 100; expect(await cache.read('A', async () => ['latest'], () => undefined)).toEqual(['latest'])
  })

  it('does not let a late old-profile result overwrite the current account catalog', async () => {
    const cache = new ScopedCatalogCache<string>(100); const old = deferred<string>(); let current = 'A'
    const assertA = () => { if (current !== 'A') throw new DOMException('old owner', 'AbortError') }
    const first = cache.read('A', () => old.promise, assertA); const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    current = 'B'; expect(await cache.read('B', async () => 'new account', () => undefined)).toBe('new account')
    old.resolve('old account'); await rejected; expect(cache.snapshot('B')).toBe('new account'); expect(cache.snapshot('A')).toBeUndefined()
  })

  it('preserves a previous verified snapshot for an owned error and retries the next call', async () => {
    let now = 0; const cache = new ScopedCatalogCache<string>(100, () => now)
    await cache.read('A', async () => 'known catalog', () => undefined)
    now = 100; await expect(cache.read('A', async () => { throw new Error('rate limited') }, () => undefined)).rejects.toThrow('rate limited')
    expect(cache.snapshot('A')).toBe('known catalog')
    expect(await cache.read('A', async () => 'new catalog', () => undefined)).toBe('new catalog')
  })

  it('validates a cached caller after its awaited boundary and does not share other projects', async () => {
    const cache = new ScopedCatalogCache<string>(100); let current = true
    await cache.read('A', async () => 'old project', () => undefined)
    const pending = cache.read('A', async () => 'unused', () => { if (!current) throw new DOMException('changed', 'AbortError') })
    current = false; await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(await cache.read('B', async () => 'new project', () => undefined)).toBe('new project')
  })
})

it('explicit scoped refresh expires only the current owner and coalesces its pending read', async () => {
  const cache = new ScopedCatalogCache<string[]>(60_000), current = () => {}, load = vi.fn(async () => ['old'])
  await cache.read('a',load,current); cache.invalidate('b'); await cache.read('a',load,current); expect(load).toHaveBeenCalledTimes(1)
  cache.invalidate('a'); const fresh = vi.fn(async () => ['new']); await Promise.all([cache.read('a',fresh,current),cache.read('a',fresh,current)]);expect(fresh).toHaveBeenCalledTimes(1);expect(cache.snapshot('a')).toEqual(['new'])
})
