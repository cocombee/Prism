import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, readdir, rename, unlink, utimes } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

interface MetadataFile { path: string; before: string | null; after: string; mode: number; modifiedAt: number | null }
interface Journal {
  version: 1
  phase: 'prepared' | 'committed'
  rootPath: string
  documentPath: string
  files: MetadataFile[]
}
interface TransactionOptions {
  dataRoot: string
  rootPath: string
  documentPath: string
  writes: Array<{ path: string; value: unknown }>
  checkpoint?: (phase: 'prepared' | 'write' | 'committed', index?: number) => Promise<void>
  /** Fault-injection only: leave the journal/files as an interrupted process would. */
  simulateInterruption?: boolean
}
export class ProjectProfileRecoveryRequiredError extends Error {
  constructor(cause?: unknown) {
    super('The project account save needs recovery. Reopen the project before generating or saving its document.', { cause })
    this.name = 'ProjectProfileRecoveryRequiredError'
  }
}

/** Keeps uncertain metadata out of new generation and document commits. */
export class ProjectProfileRecoveryState {
  private failure: ProjectProfileRecoveryRequiredError | undefined

  assertReady(): void { if (this.failure) throw this.failure }

  async recover(dataRoot: string): Promise<void> {
    try {
      await recoverProjectProfileTransactions(dataRoot)
      this.failure = undefined
    } catch (error) {
      this.failure = new ProjectProfileRecoveryRequiredError(error)
      throw this.failure
    }
  }

  async commit(options: TransactionOptions): Promise<void> {
    this.assertReady()
    try { await commitProjectProfileTransaction(options) } catch (error) {
      if (error instanceof ProjectProfileRecoveryRequiredError) this.failure = error
      else {
        const pending = await lstat(join(journalFolder(options.dataRoot), journalName(options.rootPath)))
          .then(() => true, (checkError: NodeJS.ErrnoException) => checkError.code !== 'ENOENT')
        if (pending) this.failure = new ProjectProfileRecoveryRequiredError(error)
      }
      if (this.failure) throw this.failure
      throw error
    }
  }
}

const maximumBytes = 64 * 1024 * 1024
const maximumJournalBytes = 256 * 1024 * 1024
const journalFolder = (dataRoot: string) => join(dataRoot, 'project-profile-transactions')
const journalName = (rootPath: string) => `${createHash('sha256').update(resolve(rootPath)).digest('hex')}.json`

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, 'r')
  try { await handle.sync() } finally { await handle.close() }
}

async function atomicBytes(path: string, bytes: Buffer, mode: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    const handle = await open(temporary, 'wx', mode)
    try { await handle.writeFile(bytes); await handle.sync() } finally { await handle.close() }
    await rename(temporary, path)
    await syncDirectory(dirname(path))
  } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error }) }
}

async function existingFile(path: string, maximum = maximumBytes): Promise<{ bytes: Buffer; mode: number; modifiedAt: number } | null> {
  try {
    const info = await lstat(path)
    if (!info.isFile() || info.size > maximum) throw new Error('Project metadata is not a supported regular file.')
    return { bytes: await readFile(path), mode: info.mode & 0o777, modifiedAt: info.mtimeMs }
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}

function decode(value: unknown): Buffer {
  if (typeof value !== 'string' || value.length > Math.ceil(maximumBytes / 3) * 4) throw new Error('Invalid project transaction bytes.')
  const bytes = Buffer.from(value, 'base64')
  if (bytes.toString('base64') !== value) throw new Error('Invalid project transaction encoding.')
  return bytes
}

function validateJournal(value: unknown, dataRoot: string, filename: string): Journal {
  const journal = value as Journal | null
  if (!journal || journal.version !== 1 || !['prepared', 'committed'].includes(journal.phase)
    || typeof journal.rootPath !== 'string' || typeof journal.documentPath !== 'string'
    || !Array.isArray(journal.files) || journal.files.length !== 4) throw new Error('Invalid project profile transaction journal.')
  const root = resolve(journal.rootPath)
  const document = resolve(journal.documentPath)
  const child = relative(root, document)
  if (!child || child === '..' || child.startsWith(`..${sep}`) || extname(document).toLowerCase() !== '.prismflow'
    || journalName(root) !== filename) throw new Error('Project transaction paths do not match their owner.')
  const expected = new Set([join(root, 'Prism Foundry Project.json'), document, join(dataRoot, 'current-project.json'), join(dataRoot, 'recent-projects.json')].map((path) => resolve(path)))
  for (const file of journal.files) {
    if (!file || typeof file.path !== 'string' || !expected.delete(resolve(file.path)) || !Number.isInteger(file.mode) || file.mode < 0 || file.mode > 0o777) throw new Error('Project transaction contains an unexpected metadata target.')
    if (file.before !== null) {
      decode(file.before)
      if (typeof file.modifiedAt !== 'number' || !Number.isFinite(file.modifiedAt) || file.modifiedAt < 0) throw new Error('Invalid project transaction modification time.')
    }
    decode(file.after)
  }
  if (expected.size) throw new Error('Project transaction is missing an owned metadata target.')
  return journal
}

async function cleanJournal(path: string): Promise<void> {
  await unlink(path)
  await syncDirectory(dirname(path))
}

async function reconcileJournal(journal: Journal, path: string): Promise<void> {
  // Durable commit retires the undo record. Later canvas saves or a project
  // switch may legitimately change these files; never undo or reject them.
  if (journal.phase === 'committed') { await cleanJournal(path); return }
  // Preflight every target before changing anything, preserving external edits.
  for (const file of journal.files) {
    const actual = await existingFile(file.path)
    const bytes = actual?.bytes.toString('base64') ?? null
    if (bytes !== file.before && bytes !== file.after) {
      throw new Error('Project metadata changed outside its transaction. The recovery journal was preserved.')
    }
  }
  if (journal.phase === 'prepared') for (const file of journal.files) {
    if (file.before === null) {
      const removed = await unlink(file.path).then(() => true, (error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; return false })
      if (removed) await syncDirectory(dirname(file.path))
    } else {
      await atomicBytes(file.path, decode(file.before), file.mode)
      await utimes(file.path, Date.now() / 1000, file.modifiedAt! / 1000)
      const handle = await open(file.path, 'r')
      try { await handle.sync() } finally { await handle.close() }
    }
  }
  await cleanJournal(path)
}

/** Run under the main project/document owners; commit exactly four projections. */
export async function commitProjectProfileTransaction(options: TransactionOptions): Promise<void> {
  const folder = journalFolder(options.dataRoot)
  await mkdir(folder, { recursive: true })
  const filename = journalName(options.rootPath)
  const path = join(folder, filename)
  if (await existingFile(path, maximumJournalBytes)) throw new ProjectProfileRecoveryRequiredError()
  const files: MetadataFile[] = []
  for (const write of options.writes) {
    const after = Buffer.from(JSON.stringify(write.value, null, 2))
    if (after.byteLength > maximumBytes) throw new Error('Project metadata exceeds the supported transaction size.')
    files.push({ path: resolve(write.path), before: null, after: after.toString('base64'), mode: 0o644, modifiedAt: null })
  }
  const journal = validateJournal({ version: 1, phase: 'prepared', rootPath: resolve(options.rootPath), documentPath: resolve(options.documentPath), files }, options.dataRoot, filename)
  for (const file of journal.files) {
    const existing = await existingFile(file.path)
    file.before = existing?.bytes.toString('base64') ?? null
    file.mode = existing?.mode ?? 0o644
    file.modifiedAt = existing?.modifiedAt ?? null
  }
  const journalBytes = Buffer.from(JSON.stringify(journal))
  if (journalBytes.byteLength > maximumJournalBytes) throw new Error('Project transaction journal exceeds its supported size.')
  await atomicBytes(path, journalBytes, 0o600)
  try {
    await options.checkpoint?.('prepared')
    for (const [index, file] of journal.files.entries()) {
      await atomicBytes(file.path, decode(file.after), file.mode)
      await options.checkpoint?.('write', index)
    }
    const committed: Journal = { ...journal, phase: 'committed' }
    await atomicBytes(path, Buffer.from(JSON.stringify(committed)), 0o600)
    journal.phase = 'committed'
    await options.checkpoint?.('committed')
  } catch (error) {
    if (options.simulateInterruption) throw error
    if (journal.phase === 'committed') { await cleanJournal(path).catch(() => undefined); return }
    try {
      await atomicBytes(path, Buffer.from(JSON.stringify(journal)), 0o600)
      await reconcileJournal(journal, path)
    } catch (recoveryError) {
      throw new ProjectProfileRecoveryRequiredError(recoveryError)
    }
    throw error
  }
  // A cleanup failure does not turn an already durable commit into a failed command.
  await cleanJournal(path).catch(() => undefined)
}

export async function recoverProjectProfileTransactions(dataRoot: string): Promise<void> {
  const folder = journalFolder(dataRoot)
  let names: string[]
  try { names = await readdir(folder) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error }
  for (const filename of names.filter((name) => name.endsWith('.json')).sort()) {
    const path = join(folder, filename)
    const file = await existingFile(path, maximumJournalBytes)
    if (!file) continue
    const journal = validateJournal(JSON.parse(file.bytes.toString('utf8')), dataRoot, filename)
    await reconcileJournal(journal, path)
  }
}
