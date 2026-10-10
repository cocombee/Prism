import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, unlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { commitProjectProfileTransaction, recoverProjectProfileTransactions, ProjectProfileRecoveryRequiredError, ProjectProfileRecoveryState } from './projectProfileTransaction'
import { ProjectCommandQueue } from './projectCommandQueue'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'prism-profile-transaction-')); roots.push(root)
  const dataRoot = join(root, 'data'); const rootPath = join(root, 'project'); const documentPath = join(rootPath, 'Project.prismflow')
  await mkdir(dataRoot); await mkdir(rootPath)
  const paths = [join(rootPath, 'Prism Foundry Project.json'), documentPath, join(dataRoot, 'current-project.json'), join(dataRoot, 'recent-projects.json')]
  for (const [index, path] of paths.entries()) await writeFile(path, JSON.stringify({ before: index }))
  const before = await Promise.all(paths.map((path) => readFile(path)))
  const writes = paths.map((path, index) => ({ path, value: { after: index } }))
  return { dataRoot, rootPath, documentPath, paths, before, writes }
}
const bytes = (paths: string[]) => Promise.all(paths.map((path) => readFile(path)))

describe('four-record project profile transaction', () => {
  it('commits all projections and removes the completed journal', async () => {
    const f = await fixture(); await commitProjectProfileTransaction(f)
    expect(await bytes(f.paths)).toEqual(f.writes.map((write) => Buffer.from(JSON.stringify(write.value, null, 2))))
    expect(await readdir(join(f.dataRoot, 'project-profile-transactions'))).toEqual([])
  })

  it.each([0, 1, 2, 3])('restores exact prior bytes after failure at metadata write %i', async (failedIndex) => {
    const f = await fixture()
    await expect(commitProjectProfileTransaction({ ...f, checkpoint: async (phase, index) => { if (phase === 'write' && index === failedIndex) throw new Error('write failed') } })).rejects.toThrow('write failed')
    expect(await bytes(f.paths)).toEqual(f.before)
    expect(await readdir(join(f.dataRoot, 'project-profile-transactions'))).toEqual([])
  })

  it.each([0, 1, 2, 3])('recovers interrupted prepared work after write %i before reopening', async (interruptedIndex) => {
    const f = await fixture()
    await expect(commitProjectProfileTransaction({ ...f, simulateInterruption: true, checkpoint: async (phase, index) => { if (phase === 'write' && index === interruptedIndex) throw new Error('process stopped') } })).rejects.toThrow('process stopped')
    expect(await readdir(join(f.dataRoot, 'project-profile-transactions'))).toHaveLength(1)
    await recoverProjectProfileTransactions(f.dataRoot)
    expect(await bytes(f.paths)).toEqual(f.before)
  })

  it('retains an interrupted committed transaction instead of reverting the saved account', async () => {
    const f = await fixture()
    await expect(commitProjectProfileTransaction({ ...f, simulateInterruption: true, checkpoint: async (phase) => { if (phase === 'committed') throw new Error('process stopped') } })).rejects.toThrow('process stopped')
    await recoverProjectProfileTransactions(f.dataRoot)
    expect(await bytes(f.paths)).toEqual(f.writes.map((write) => Buffer.from(JSON.stringify(write.value, null, 2))))
  })

  it('preserves an external edit and the journal without partially recovering other records', async () => {
    const f = await fixture()
    await expect(commitProjectProfileTransaction({ ...f, simulateInterruption: true, checkpoint: async (phase, index) => { if (phase === 'write' && index === 1) throw new Error('process stopped') } })).rejects.toThrow('process stopped')
    await writeFile(f.documentPath, 'external edit')
    const beforeRecovery = await bytes(f.paths)
    await expect(recoverProjectProfileTransactions(f.dataRoot)).rejects.toThrow('changed outside')
    expect(await bytes(f.paths)).toEqual(beforeRecovery)
    expect(await readdir(join(f.dataRoot, 'project-profile-transactions'))).toHaveLength(1)
  })

  it('restores the portable modification time so recovery cannot make an old canvas look newest', async () => {
    const f = await fixture(); const originalTime = Date.parse('2026-08-01T00:00:00Z')
    await utimes(f.documentPath, originalTime / 1000, originalTime / 1000)
    await expect(commitProjectProfileTransaction({ ...f, simulateInterruption: true, checkpoint: async (phase, index) => { if (phase === 'write' && index === 1) throw new Error('process stopped') } })).rejects.toThrow('process stopped')
    await recoverProjectProfileTransactions(f.dataRoot)
    expect(Math.abs((await stat(f.documentPath)).mtimeMs - originalTime)).toBeLessThan(1)
  })

  it('recovers a document that was initially absent without requiring its parent to exist', async () => {
    const f = await fixture(); await unlink(f.documentPath)
    await expect(commitProjectProfileTransaction({ ...f, checkpoint: async (phase) => { if (phase === 'prepared') throw new Error('write failed') } })).rejects.toThrow('write failed')
    await expect(readFile(f.documentPath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects unexpected or duplicate targets before changing any metadata', async () => {
    const f = await fixture()
    for (const wrongPath of [join(f.dataRoot, 'unrelated.json'), f.paths[0]]) {
      await expect(commitProjectProfileTransaction({ ...f, writes: f.writes.map((write, index) => index === 3 ? { ...write, path: wrongPath } : write) })).rejects.toThrow('unexpected')
      expect(await bytes(f.paths)).toEqual(f.before)
    }
  })

  it('does not let a malformed recovery journal write an unrelated file', async () => {
    const f = await fixture()
    await expect(commitProjectProfileTransaction({ ...f, simulateInterruption: true, checkpoint: async (phase) => { if (phase === 'prepared') throw new Error('process stopped') } })).rejects.toThrow('process stopped')
    const folder = join(f.dataRoot, 'project-profile-transactions'); const [name] = await readdir(folder)
    const journal = JSON.parse(await readFile(join(folder, name), 'utf8'))
    const unrelated = join(f.dataRoot, 'unrelated.json'); await writeFile(unrelated, 'protected')
    journal.files[0].path = unrelated; await writeFile(join(folder, name), JSON.stringify(journal))
    await expect(recoverProjectProfileTransactions(f.dataRoot)).rejects.toThrow('unexpected')
    expect(await readFile(unrelated, 'utf8')).toBe('protected')
    expect(await bytes(f.paths)).toEqual(f.before)
  })

  it('does not let a newly opened project pointer be replaced by a late save/rollback', async () => {
    const f = await fixture(); const queue = new ProjectCommandQueue(); let current = 'A'
    let continueSave!: () => void; let enteredSave!: () => void
    const gate = new Promise<void>((yes) => { continueSave = yes }); const entered = new Promise<void>((yes) => { enteredSave = yes })
    const save = queue.runForOwner('A', () => current, async () => {
      await commitProjectProfileTransaction({ ...f, checkpoint: async (phase, index) => { if (phase === 'write' && index === 1) { enteredSave(); await gate; throw new Error('save failed') } } })
    })
    const failed = expect(save).rejects.toThrow('save failed'); await entered
    const opened = queue.run(async () => { current = 'B'; await writeFile(f.paths[2], 'Project B pointer') })
    continueSave(); await failed; await opened
    expect(current).toBe('B'); expect(await readFile(f.paths[2], 'utf8')).toBe('Project B pointer')
    expect(await readFile(f.documentPath)).toEqual(f.before[1])
  })
  it('blocks another account save after failed recovery and resumes only after successful reconciliation', async () => {
    const f = await fixture(); const state = new ProjectProfileRecoveryState()
    await expect(state.commit({ ...f, checkpoint: async (phase, index) => {
      if (phase === 'write' && index === 1) { await writeFile(f.documentPath, 'external edit'); throw new Error('save failed') }
    } })).rejects.toBeInstanceOf(ProjectProfileRecoveryRequiredError)
    expect(() => state.assertReady()).toThrow('needs recovery')
    const uncertain = await bytes(f.paths)
    await expect(state.commit(f)).rejects.toBeInstanceOf(ProjectProfileRecoveryRequiredError)
    expect(await bytes(f.paths)).toEqual(uncertain)
    await expect(state.recover(f.dataRoot)).rejects.toBeInstanceOf(ProjectProfileRecoveryRequiredError)
    expect(await readFile(f.documentPath, 'utf8')).toBe('external edit')
    // The external conflict is explicitly resolved; ordinary recovery owns the rest.
    await writeFile(f.documentPath, f.before[1])
    await state.recover(f.dataRoot)
    expect(() => state.assertReady()).not.toThrow()
    expect(await bytes(f.paths)).toEqual(f.before)
    await state.commit(f)
    expect(await bytes(f.paths)).toEqual(f.writes.map((write) => Buffer.from(JSON.stringify(write.value, null, 2))))
  })

  it('does not block a cleanly rolled-back failure', async () => {
    const f = await fixture(); const state = new ProjectProfileRecoveryState()
    await expect(state.commit({ ...f, checkpoint: async (phase) => { if (phase === 'prepared') throw new Error('temporary failure') } })).rejects.toThrow('temporary failure')
    expect(() => state.assertReady()).not.toThrow()
    await state.commit(f)
  })

  it('retires a committed undo record while preserving subsequent canvas and project changes', async () => {
    const f = await fixture()
    await expect(commitProjectProfileTransaction({ ...f, simulateInterruption: true, checkpoint: async (phase) => { if (phase === 'committed') throw new Error('process stopped') } })).rejects.toThrow('process stopped')
    await writeFile(f.documentPath, 'newer canvas')
    await writeFile(f.paths[2], 'new project pointer')
    const current = await bytes(f.paths)
    await recoverProjectProfileTransactions(f.dataRoot)
    expect(await bytes(f.paths)).toEqual(current)
    expect(await readdir(join(f.dataRoot, 'project-profile-transactions'))).toEqual([])
  })

})
