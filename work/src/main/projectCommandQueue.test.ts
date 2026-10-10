import { describe, expect, it } from 'vitest'
import { ProjectCommandQueue } from './projectCommandQueue'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => { resolve = yes })
  return { promise, resolve }
}

describe('project command ownership', () => {
  it('makes project switching wait for a pending profile save', async () => {
    const queue = new ProjectCommandQueue(); const gate = deferred(); const events: string[] = []
    const save = queue.run(async () => { events.push('save begins'); await gate.promise; events.push('saved A') })
    const open = queue.run(async () => { events.push('opened B') })
    await Promise.resolve(); await Promise.resolve()
    expect(events).toEqual(['save begins'])
    gate.resolve(); await Promise.all([save, open])
    expect(events).toEqual(['save begins', 'saved A', 'opened B'])
  })

  it('rejects a queued account selection if its requested project was replaced first', async () => {
    const queue = new ProjectCommandQueue(); const gate = deferred(); let project = 'A'; let selected = false
    const open = queue.run(async () => { await gate.promise; project = 'B' })
    const select = queue.runForOwner('A', () => project, async () => { selected = true })
    const rejected = expect(select).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(); await open; await rejected
    expect(selected).toBe(false)
  })

  it('supports awaited internal calls without deadlocking', async () => {
    const queue = new ProjectCommandQueue(); const events: number[] = []
    await queue.run(async () => { events.push(1); await queue.run(async () => events.push(2)); events.push(3) })
    expect(events).toEqual([1, 2, 3])
  })

  it('recovers the queue after a failed command', async () => {
    const queue = new ProjectCommandQueue()
    await expect(queue.run(async () => { throw new Error('write failed') })).rejects.toThrow('write failed')
    await expect(queue.run(async () => 'next command')).resolves.toBe('next command')
  })

  it('does not grant a detached old async child reentrant ownership after completion', async () => {
    const queue = new ProjectCommandQueue(); const childGate = deferred(); const ownerGate = deferred(); const events: string[] = []
    let child!: Promise<void>
    await queue.run(async () => { child = (async () => { await childGate.promise; await queue.run(async () => { events.push('child') }) })() })
    const current = queue.run(async () => { events.push('current'); await ownerGate.promise })
    await Promise.resolve(); await Promise.resolve(); childGate.resolve(); await Promise.resolve()
    expect(events).toEqual(['current'])
    ownerGate.resolve(); await Promise.all([current, child]); expect(events).toEqual(['current', 'child'])
  })
  it('reports pending project transitions from enqueue through success or failure', async () => {
    const queue = new ProjectCommandQueue()
    let release!: () => void
    const gate = new Promise<void>((yes) => { release = yes })
    expect(queue.busy).toBe(false)
    const first = queue.run(() => gate)
    const second = queue.run(async () => { expect(queue.busy).toBe(true); throw new Error('failed transition') })
    const rejected = expect(second).rejects.toThrow('failed transition')
    expect(queue.busy).toBe(true)
    release(); await first
    expect(queue.busy).toBe(true)
    await rejected
    expect(queue.busy).toBe(false)
  })

  it('waits outside the command queue before reading without blocking later commands', async () => {
    const queue = new ProjectCommandQueue(), gate = deferred(), events: string[] = []
    const write = queue.run(async () => { await gate.promise; events.push('saved') })
    const read = queue.readWhenIdleForOwner('A', () => 'A', () => { expect(queue.busy).toBe(false); events.push('read'); return 'ready' })
    const later = queue.run(() => { events.push('later command') })
    gate.resolve()
    await Promise.all([write, later])
    expect(await read).toBe('ready')
    expect(events).toEqual(['saved', 'later command', 'read'])
  })

  it('rejects an idle read when its project is replaced while waiting', async () => {
    const queue = new ProjectCommandQueue(), gate = deferred(); let owner = 'A', reads = 0
    const write = queue.run(async () => { await gate.promise; owner = 'B' })
    const read = queue.readWhenIdleForOwner('A', () => owner, () => ++reads)
    const rejected = expect(read).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(); await write; await rejected; expect(reads).toBe(0)
  })

  it('rejects a read superseded during its result without retrying it for another project', async () => {
    const queue = new ProjectCommandQueue(), gate = deferred(); let owner = 'A'
    const read = queue.readWhenIdleForOwner('A', () => owner, async () => { await gate.promise; return 'old' })
    const rejected = expect(read).rejects.toMatchObject({ name: 'AbortError' })
    await queue.run(() => { owner = 'B' }); gate.resolve(); await rejected
  })

  it('retries only a busy-transition abort for the same owner', async () => {
    const queue = new ProjectCommandQueue(), gate = deferred(); let reads = 0; let write!: Promise<void>
    const read = queue.readWhenIdleForOwner('A', () => 'A', async () => {
      if (++reads === 1) { write = queue.run(() => gate.promise); throw new DOMException('Busy', 'AbortError') }
      return 'current'
    })
    gate.resolve(); expect(await read).toBe('current'); await write; expect(reads).toBe(2)
    await expect(queue.readWhenIdleForOwner('A', () => 'A', () => { throw new DOMException('Account revision changed', 'AbortError') })).rejects.toThrow('Account revision changed')
    await expect(queue.readWhenIdleForOwner('A', () => 'A', () => { throw Error('Recovery unresolved') })).rejects.toThrow('Recovery unresolved')
  })

  it('rejects self-waiting reads instead of deadlocking an internal project command', async () => {
    const queue = new ProjectCommandQueue()
    await expect(queue.run(() => queue.readWhenIdleForOwner('A', () => 'A', () => 'read'))).rejects.toThrow('cannot wait inside')
  })

  it('retries a typed busy rejection even when its short command has finished before catch', async () => {
    const queue = new ProjectCommandQueue(); let reads = 0
    const result = queue.readWhenIdleForOwner('A', () => 'A', async () => {
      if (++reads > 1) return 'current'
      let busyError: unknown
      await queue.run(async () => { try { queue.assertIdle() } catch (error) { busyError = error } })
      expect(queue.busy).toBe(false)
      throw busyError
    })
    expect(await result).toBe('current'); expect(reads).toBe(2)
  })

})
