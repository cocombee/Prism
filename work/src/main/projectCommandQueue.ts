import { AsyncLocalStorage } from 'node:async_hooks'

export class ProjectCommandBusyError extends DOMException {
  constructor() { super('The project is being saved or opened. Try again when it is ready.', 'AbortError') }
}

/** Serializes project commands; nested calls belong to their still-active owner. */
export class ProjectCommandQueue {
  private pending: Promise<void> = Promise.resolve()
  private operations = 0

  get busy(): boolean { return this.operations > 0 }
  assertIdle(): void { if (this.busy) throw new ProjectCommandBusyError() }
  private readonly context = new AsyncLocalStorage<{ active: boolean }>()

  run<T>(command: () => T | Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return Promise.resolve().then(command)
    this.operations += 1
    const operation = this.pending.catch(() => undefined).then(() => {
      const owner = { active: true }
      return this.context.run(owner, async () => {
        try { return await command() } finally { owner.active = false }
      })
    })
    const completed = operation.finally(() => { this.operations -= 1 })
    this.pending = completed.then(() => undefined, () => undefined)
    return completed
  }

  runForOwner<T>(requestedOwner: string, currentOwner: () => string, command: () => T | Promise<T>): Promise<T> {
    return this.run(() => {
      if (currentOwner() !== requestedOwner) throw new DOMException('The project changed before the command could be saved.', 'AbortError')
      return command()
    })
  }

  /** Read outside the write queue, after it settles, without relaxing request guards. */
  async readWhenIdleForOwner<T>(requestedOwner: string, currentOwner: () => string, read: () => T | Promise<T>): Promise<T> {
    const assertOwner = () => {
      if (currentOwner() !== requestedOwner) throw new DOMException('The project changed before the read completed.', 'AbortError')
    }
    if (this.context.getStore()?.active) throw new Error('An idle read cannot wait inside a project command.')
    for (;;) {
      assertOwner()
      while (this.busy) { await this.pending; assertOwner() }
      try {
        const result = await read()
        assertOwner()
        if (this.busy) continue
        return result
      } catch (error) {
        assertOwner()
        if (error instanceof ProjectCommandBusyError || this.busy && error instanceof Error && error.name === 'AbortError') continue
        throw error
      }
    }
  }
}
