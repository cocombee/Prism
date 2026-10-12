import { projectFolderPath } from './projectFolders'
import { constants as fsConstants } from 'node:fs'
import { access, copyFile, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export interface SemanticAssetFileIdentity { id: string; path: string }
export type SemanticAssetSaveIntent =
  | { mode: 'create-new' }
  | { mode: 'replace-existing'; targetAssetId: string; token: string }
export interface SemanticAssetSaveRequest {
  transactionId: string
  intent: SemanticAssetSaveIntent
  managedRoot: string
  assetRoot: string
  assetId: string
  selected: SemanticAssetFileIdentity
  priorSaved?: SemanticAssetFileIdentity
  generated: SemanticAssetFileIdentity[]
  externalReferencePaths: string[]
  /** Immutable manual/reference inputs. Create must never quarantine or delete these paths. */
  referenceSourcePaths?: string[]
  canonicalPath: string
  /** Legacy single-document form retained for older callers/tests. */
  metadataPath?: string
  nextMetadata?: unknown
  /** Every canonical index/workflow/project document committed atomically as one journaled unit. */
  metadataWrites?: Array<{ path: string; value: unknown }>
}
export interface SemanticAssetSaveOptions {
  failAt?: 'stage-copy' | 'quarantine' | 'promote' | 'metadata-promote' | `metadata-write-${number}` | 'verification' | 'physical-cleanup' | 'rollback-cleanup' | 'crash-before-promote' | 'crash-after-promote' | 'crash-after-verified'
  simulateCrash?: boolean
}

type JournalPhase = 'prepared' | 'quarantined' | 'promoted' | 'metadata-committed' | 'verified' | 'committed'
interface SemanticAssetSaveJournal {
  version: 2
  transactionId: string
  phase: JournalPhase
  request: SemanticAssetSaveRequest
  transactionRoot: string
  stagedCanonical: string
  metadataBackups: Array<{ path: string; backupPath: string }>
  quarantined: Array<{ id: string; originalPath: string; quarantinedPath: string }>
}

async function exists(path: string): Promise<boolean> { try { await access(path); return true } catch { return false } }
function contained(path: string, root: string): boolean {
  const rel = relative(resolve(root), resolve(path))
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}
async function existingAncestor(path: string): Promise<string> {
  let candidate = resolve(path)
  while (!await exists(candidate)) {
    const parent = dirname(candidate)
    if (parent === candidate) throw new Error('No existing ancestor for managed path.')
    candidate = parent
  }
  return realpath(candidate)
}
async function assertContained(path: string, root: string, message: string, mustExist = true): Promise<string> {
  if (!contained(path, root)) throw new Error(message)
  const realRoot = await realpath(root)
  const existing = mustExist ? await realpath(path) : await existingAncestor(dirname(path))
  if (!contained(existing, realRoot)) throw new Error(message)
  return resolve(path)
}
async function atomicWrite(path: string, bytes: Uint8Array | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`)
  await writeFile(temporary, bytes, { flag: 'wx' })
  await rename(temporary, path)
}
async function writeJournal(path: string, journal: SemanticAssetSaveJournal): Promise<void> {
  await atomicWrite(path, JSON.stringify(journal, null, 2))
}

function requestedMetadataWrites(request: SemanticAssetSaveRequest): Array<{ path: string; value: unknown }> {
  if (request.metadataWrites?.length) return request.metadataWrites
  if (request.metadataPath) return [{ path: request.metadataPath, value: request.nextMetadata }]
  throw new Error('At least one semantic asset metadata write is required.')
}

async function validateRequest(request: SemanticAssetSaveRequest) {
  const managedRoot = await realpath(request.managedRoot)
  const assetRoot = await realpath(request.assetRoot)
  if (!contained(assetRoot, managedRoot)) throw new Error('The semantic asset root is outside the managed root.')
  if (!request.transactionId || !request.assetId) throw new Error('The semantic asset transaction identity is required.')
  if (request.intent?.mode !== 'create-new' && request.intent?.mode !== 'replace-existing') throw new Error('The semantic asset save intent is required.')
  if (request.intent.mode === 'replace-existing' && (!request.intent.targetAssetId || !request.intent.token || request.priorSaved?.id !== request.intent.targetAssetId)) throw new Error('Explicit Edit replacement authority is invalid.')
  if (request.intent.mode === 'create-new' && request.priorSaved) throw new Error('Create-new cannot carry a prior saved replacement target.')
  const protectedReferences = new Set((request.referenceSourcePaths || []).map((path) => resolve(path)))
  const ids = new Set<string>()
  for (const item of request.generated) {
    if (ids.has(item.id)) throw new Error('Generated reference identities must be unique.')
    ids.add(item.id)
    const protectedCreateInput = request.intent.mode === 'create-new' && protectedReferences.has(resolve(item.path))
    if (!protectedCreateInput && !contained(item.path, request.managedRoot)) throw new Error('A generated reference is outside the managed root.')
    if (!protectedCreateInput && !contained(item.path, request.assetRoot)) throw new Error('A generated reference is outside this semantic asset.')
    if (!protectedCreateInput) {
      await assertContained(item.path, request.managedRoot, 'A generated reference is outside the managed root.')
      await assertContained(item.path, request.assetRoot, 'A generated reference is outside this semantic asset.')
    }
  }
  if (!request.generated.some((item) => item.id === request.selected.id && resolve(item.path) === resolve(request.selected.path))) throw new Error('The selected result is not an active generated reference.')
  if (request.priorSaved) {
    await assertContained(request.priorSaved.path, request.managedRoot, 'The prior saved asset is outside the managed root.')
    await assertContained(request.priorSaved.path, request.assetRoot, 'The prior saved asset is outside this semantic asset.')
  }
  await assertContained(request.canonicalPath, request.managedRoot, 'The canonical path is outside the managed root.', false)
  await assertContained(request.canonicalPath, request.assetRoot, 'The canonical path is outside this semantic asset.', false)
  for (const metadata of requestedMetadataWrites(request)) await assertContained(metadata.path, request.managedRoot, 'A metadata path is outside the managed root.')
  for (const external of request.externalReferencePaths) {
    if (!await exists(external)) throw new Error('An imported external reference is missing before save.')
  }
  for (const source of request.referenceSourcePaths || []) {
    if (!await exists(source)) throw new Error('A protected reference source is missing before save.')
  }
  const selectedStat = await stat(request.selected.path)
  if (!selectedStat.isFile() || selectedStat.size === 0) throw new Error('The selected result is incomplete or unreadable.')
  const rootDevice = (await stat(managedRoot)).dev
  for (const item of [...request.generated, ...(request.priorSaved ? [request.priorSaved] : [])]) {
    if (request.intent.mode === 'create-new' && protectedReferences.has(resolve(item.path)) && !contained(item.path, request.managedRoot)) continue
    if ((await stat(item.path)).dev !== rootDevice) throw new Error('Managed rollback protection must remain on the same volume.')
  }
}

function injectedFailure(point: NonNullable<SemanticAssetSaveOptions['failAt']>): never {
  throw new Error(point.startsWith('crash-') ? `Simulated crash at ${point}` : `Injected semantic save failure at ${point}`)
}

async function rollbackJournal(journal: SemanticAssetSaveJournal, journalPath: string, failCleanup = false): Promise<void> {
  for (const metadata of journal.metadataBackups) if (await exists(metadata.backupPath)) await atomicWrite(metadata.path, await readFile(metadata.backupPath))
  if (await exists(journal.request.canonicalPath) && !journal.quarantined.some((item) => resolve(item.originalPath) === resolve(journal.request.canonicalPath))) await rm(journal.request.canonicalPath, { force: true })
  for (const item of [...journal.quarantined].reverse()) {
    if (!await exists(item.quarantinedPath)) continue
    if (await exists(item.originalPath)) await rm(item.originalPath, { force: true })
    await mkdir(dirname(item.originalPath), { recursive: true })
    await rename(item.quarantinedPath, item.originalPath)
  }
  if (failCleanup) injectedFailure('rollback-cleanup')
  await rm(journal.transactionRoot, { recursive: true, force: true })
  await removeEmptyJournalRoot(dirname(journal.transactionRoot))
  if (await exists(journalPath)) await rm(journalPath, { force: true })
}

async function removeEmptyJournalRoot(root: string) {
  try { if ((await readdir(root)).length === 0) await rm(root, { recursive: true, force: true }) } catch { /* already gone */ }
}

export async function commitSemanticAssetSave(request: SemanticAssetSaveRequest, options: SemanticAssetSaveOptions = {}) {
  await validateRequest(request)
  const journalRoot = projectFolderPath(resolve(request.managedRoot), 'Canvas', '.prism-semantic-save')
  const transactionRoot = join(journalRoot, request.transactionId)
  if (await exists(transactionRoot)) throw new Error('A semantic asset transaction with this identity already exists.')
  const quarantineRoot = join(transactionRoot, 'quarantine')
  const stagedCanonical = join(transactionRoot, 'selected.stage')
  const metadataWrites = requestedMetadataWrites(request)
  const metadataBackups = metadataWrites.map((metadata, index) => ({ path: metadata.path, backupPath: join(transactionRoot, `metadata-${index}.before`) }))
  const journalPath = join(transactionRoot, 'journal.json')
  if (options.failAt === 'stage-copy') injectedFailure('stage-copy')
  await mkdir(quarantineRoot, { recursive: true })
  await copyFile(request.selected.path, stagedCanonical, fsConstants.COPYFILE_EXCL)
  for (const metadata of metadataBackups) await copyFile(metadata.path, metadata.backupPath, fsConstants.COPYFILE_EXCL)
  const protectedReferencePaths = new Set((request.referenceSourcePaths || []).map((path) => resolve(path)))
  const deletion = [
    ...(request.priorSaved ? [request.priorSaved] : []),
    ...request.generated.filter((item) => item.id !== request.selected.id),
    request.selected,
  ].filter((item) => request.intent.mode === 'replace-existing' && item.id === request.intent.targetAssetId || !protectedReferencePaths.has(resolve(item.path)))
    .filter((item, index, all) => all.findIndex((candidate) => resolve(candidate.path) === resolve(item.path)) === index)
  let journal: SemanticAssetSaveJournal = { version: 2, transactionId: request.transactionId, phase: 'prepared', request: structuredClone(request), transactionRoot, stagedCanonical, metadataBackups, quarantined: [] }
  await writeJournal(journalPath, journal)
  try {
    for (const item of deletion) {
      if (!await exists(item.path)) throw new Error(`Managed semantic asset file disappeared before commit: ${item.id}`)
      const quarantinedPath = join(quarantineRoot, `${String(journal.quarantined.length).padStart(3, '0')}-${basename(item.path)}`)
      await rename(item.path, quarantinedPath)
      journal.quarantined.push({ id: item.id, originalPath: item.path, quarantinedPath })
      await writeJournal(journalPath, journal)
      if (options.failAt === 'quarantine') injectedFailure('quarantine')
    }
    journal.phase = 'quarantined'; await writeJournal(journalPath, journal)
    if (options.failAt === 'crash-before-promote') injectedFailure('crash-before-promote')
    await mkdir(dirname(request.canonicalPath), { recursive: true })
    await rename(stagedCanonical, request.canonicalPath)
    journal.phase = 'promoted'; await writeJournal(journalPath, journal)
    if (options.failAt === 'promote') injectedFailure('promote')
    if (options.failAt === 'rollback-cleanup') injectedFailure('promote')
    if (options.failAt === 'crash-after-promote') injectedFailure('crash-after-promote')
    if (options.failAt === 'metadata-promote') injectedFailure('metadata-promote')
    for (const [index, metadata] of metadataWrites.entries()) {
      if (options.failAt === `metadata-write-${index}`) injectedFailure(`metadata-write-${index}`)
      await atomicWrite(metadata.path, JSON.stringify(metadata.value, null, 2))
    }
    journal.phase = 'metadata-committed'; await writeJournal(journalPath, journal)
    if (options.failAt === 'verification') injectedFailure('verification')
    if ((await stat(request.canonicalPath)).size === 0) throw new Error('The promoted canonical asset failed verification.')
    for (const metadata of metadataWrites) {
      const persisted = JSON.parse(await readFile(metadata.path, 'utf8'))
      if (JSON.stringify(persisted) !== JSON.stringify(metadata.value)) throw new Error('Canonical semantic asset metadata failed verification.')
    }
    for (const external of request.externalReferencePaths) if (!await exists(external)) throw new Error('An external reference changed during save.')
    for (const source of request.referenceSourcePaths || []) if (!await exists(source)) throw new Error('A protected reference source changed during save.')
    journal.phase = 'verified'; await writeJournal(journalPath, journal)
    if (options.failAt === 'crash-after-verified') injectedFailure('crash-after-verified')
    if (options.failAt === 'physical-cleanup') injectedFailure('physical-cleanup')
    await rm(quarantineRoot, { recursive: true, force: true })
    journal.phase = 'committed'; await writeJournal(journalPath, journal)
    await rm(transactionRoot, { recursive: true, force: true })
    await removeEmptyJournalRoot(journalRoot)
    return {
      assetId: request.assetId,
      selectedResultId: request.selected.id,
      canonicalPath: request.canonicalPath,
      deletedIds: deletion.filter((item) => item.id !== request.selected.id).map((item) => item.id),
    }
  } catch (error) {
    if (options.simulateCrash || options.failAt?.startsWith('crash-')) throw error
    await rollbackJournal(journal, journalPath, options.failAt === 'rollback-cleanup')
    throw error
  }
}

async function validateRecoveryJournal(journal: SemanticAssetSaveJournal, journalRoot: string, name: string, managedRoot: string): Promise<void> {
  const expectedTransactionRoot = join(journalRoot, name)
  const validHeader = journal.version === 2
    && journal.transactionId === name
    && journal.request.transactionId === name
    && resolve(journal.request.managedRoot) === resolve(managedRoot)
    && resolve(journal.transactionRoot) === resolve(expectedTransactionRoot)
  if (!validHeader) throw new Error('Invalid semantic asset recovery journal.')
  const realManagedRoot = await realpath(managedRoot)
  const realTransactionRoot = await realpath(expectedTransactionRoot)
  if (!contained(realTransactionRoot, realManagedRoot)
    || !contained(journal.request.assetRoot, managedRoot)
    || !contained(journal.request.canonicalPath, journal.request.assetRoot)
    || !contained(journal.stagedCanonical, expectedTransactionRoot)) throw new Error('Invalid semantic asset recovery journal.')
  const allowedDeletionPaths = new Set([
    ...journal.request.generated.map((item) => resolve(item.path)),
    ...(journal.request.priorSaved ? [resolve(journal.request.priorSaved.path)] : []),
  ])
  const protectedReferencePaths = new Set((journal.request.referenceSourcePaths || []).map((path) => resolve(path)))
  if (journal.metadataBackups.some((metadata) => !contained(metadata.path, managedRoot) || !contained(metadata.backupPath, expectedTransactionRoot))
    || journal.quarantined.some((item) => !allowedDeletionPaths.has(resolve(item.originalPath))
      || protectedReferencePaths.has(resolve(item.originalPath)) && !(journal.request.intent.mode === 'replace-existing' && item.id === journal.request.intent.targetAssetId)
      || !contained(item.originalPath, journal.request.assetRoot)
      || !contained(item.quarantinedPath, join(expectedTransactionRoot, 'quarantine')))) {
    throw new Error('Invalid semantic asset recovery journal.')
  }
}

export async function recoverSemanticAssetTransactions(managedRoot: string): Promise<Array<{ transactionId: string; outcome: 'rolled-back' | 'completed' }>> {
  const journalRoot = projectFolderPath(resolve(managedRoot), 'Canvas', '.prism-semantic-save')
  if (!await exists(journalRoot)) return []
  const recovered: Array<{ transactionId: string; outcome: 'rolled-back' | 'completed' }> = []
  for (const name of (await readdir(journalRoot)).sort()) {
    const journalPath = join(journalRoot, name, 'journal.json')
    if (!await exists(journalPath)) { await rm(join(journalRoot, name), { recursive: true, force: true }); continue }
    const journal = JSON.parse(await readFile(journalPath, 'utf8')) as SemanticAssetSaveJournal
    await validateRecoveryJournal(journal, journalRoot, name, managedRoot)
    if (journal.phase === 'committed') {
      await rm(journal.transactionRoot, { recursive: true, force: true })
      recovered.push({ transactionId: name, outcome: 'completed' })
    } else {
      await rollbackJournal(journal, journalPath)
      recovered.push({ transactionId: name, outcome: 'rolled-back' })
    }
  }
  await removeEmptyJournalRoot(journalRoot)
  return recovered
}
