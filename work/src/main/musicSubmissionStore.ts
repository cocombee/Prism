import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, rename, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { JsonMutationQueue } from './mainSafety'
import { compileMusicRequest, type MusicRequest } from './elevenMusicContract'
import type { AudioDerivativeSaveFailure } from './elevenAudioDerivativePersistence'

export type MusicSubmissionState = 'reserved' | 'submitting' | 'unknown' | 'complete' | 'saved' | 'rejected' | 'reviewed'
export interface MusicSubmissionScope { projectId: string; nodeId: string; rootPath: string; documentPath: string }
export interface MusicSubmissionRecord extends MusicSubmissionScope {
  canvasId: string; pageId: string; submissionId: string; state: MusicSubmissionState; fingerprint: string; modelId: string
  profileId?: string; requestId?: string; saveState?: AudioDerivativeSaveFailure['state']; retainedOutputPath?: string
  createdAt: string; updatedAt: string
}
interface Document { schemaVersion: 1; records: MusicSubmissionRecord[] }
const queue = new JsonMutationQueue()
const unresolved = new Set<MusicSubmissionState>(['reserved', 'submitting', 'unknown', 'complete'])
export const musicSubmissionRequiresRecovery = (record: MusicSubmissionRecord) => unresolved.has(record.state)
export function musicRequestFingerprint(raw: MusicRequest): string {
  const compiled = compileMusicRequest(raw)
  return createHash('sha256').update(JSON.stringify({ modelId: compiled.modelId, outputFormat: compiled.outputFormat, body: compiled.body })).digest('hex')
}
const text = (value: unknown, maximum = 512): value is string => typeof value === 'string' && value.length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value)
function validScope(scope: MusicSubmissionScope): void {
  if (!scope || !text(scope.projectId) || !text(scope.nodeId) || !isAbsolute(scope.rootPath) || !isAbsolute(scope.documentPath)) throw Error('Invalid original Music project or node owner.')
  const child = relative(scope.rootPath, scope.documentPath)
  if (!child || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) throw Error('The Music document is outside its original project.')
}
function validate(record: MusicSubmissionRecord): void {
  validScope(record)
  const allowed = ['canvasId','pageId','projectId','nodeId','rootPath','documentPath','submissionId','state','fingerprint','modelId','profileId','requestId','saveState','retainedOutputPath','createdAt','updatedAt']
  if (Object.keys(record).some(key => !allowed.includes(key)) || !text(record.canvasId) || !text(record.pageId) || !text(record.submissionId) || !['reserved','submitting','unknown','complete','saved','rejected','reviewed'].includes(record.state)
    || !/^[a-f0-9]{64}$/.test(record.fingerprint) || !['music_v1','music_v2','music_v2_5'].includes(record.modelId)
    || !Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))
    || record.profileId !== undefined && !text(record.profileId) || record.requestId !== undefined && !text(record.requestId, 256)
    || record.saveState !== undefined && !['not-indexed','indexed-history-pending','indexed-history-saved'].includes(record.saveState)
    || record.retainedOutputPath !== undefined && (!isAbsolute(record.retainedOutputPath) || !relative(record.rootPath, record.retainedOutputPath) || relative(record.rootPath, record.retainedOutputPath).startsWith('..'))
    || ['submitting','unknown','complete','saved'].includes(record.state) && !record.profileId) throw Error('Invalid Music submission receipt. Preserve it for review.')
}
function sameOwner(record: MusicSubmissionRecord, scope: MusicSubmissionScope) {
  return record.projectId === scope.projectId && record.nodeId === scope.nodeId && record.rootPath === scope.rootPath && record.documentPath === scope.documentPath
}

/** One private atomic owner. Only restart blocking is promised; no automatic paid replay. */
export class MusicSubmissionStore {
  readonly filename: string
  constructor(dataRoot: string, private readonly now = () => new Date().toISOString(), private readonly id = randomUUID) { this.filename = join(resolve(dataRoot), 'provider-jobs', 'music.json') }
  private async read(): Promise<Document> {
    try { const folder = await lstat(dirname(this.filename)); if (!folder.isDirectory() || folder.isSymbolicLink()) throw Error('Invalid private Music receipt directory.') }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    let handle
    try { handle = await open(this.filename, constants.O_RDONLY | constants.O_NOFOLLOW) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, records: [] }; throw Error('Cannot safely read the Music submission receipts. Preserve them for review.') }
    try {
      const info = await handle.stat(); if (!info.isFile() || info.size > 2 * 1024 * 1024) throw Error('Music submission receipts exceed their supported bound.')
      const parsed = JSON.parse(await handle.readFile('utf8')) as Document
      if (!parsed || parsed.schemaVersion !== 1 || Object.keys(parsed).some(key => !['schemaVersion','records'].includes(key)) || !Array.isArray(parsed.records) || parsed.records.length > 1024) throw Error('Invalid Music submission receipt document.')
      parsed.records.forEach(validate)
      if (new Set(parsed.records.map(record => record.submissionId)).size !== parsed.records.length) throw Error('Duplicate Music submission identities require review.')
      return parsed
    } catch (error) { throw Error('Music submission receipts could not be read. No new paid request was allowed. ' + (error instanceof Error ? error.message : String(error))) }
    finally { await handle.close() }
  }
  private async write(document: Document) {
    await mkdir(dirname(this.filename), { recursive: true }); const info = await lstat(dirname(this.filename)); if (!info.isDirectory() || info.isSymbolicLink()) throw Error('Invalid private Music receipt directory.')
    const candidate = this.filename + '.' + randomUUID() + '.tmp'
    let handle
    try {
      handle = await open(candidate, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
      await handle.writeFile(JSON.stringify(document)); await handle.sync(); await handle.close(); handle = undefined
      await rename(candidate, this.filename)
      const folder = await open(dirname(this.filename), constants.O_RDONLY); try { await folder.sync() } finally { await folder.close() }
    } finally { await handle?.close().catch(() => undefined); await unlink(candidate).catch(() => undefined) }
  }
  private mutate<T>(change: (document: Document) => T): Promise<T> {
    return queue.run(this.filename, async () => { const document = await this.read(), result = change(document); document.records.forEach(validate); await this.write(document); return structuredClone(result) })
  }
  list(projectId: string): Promise<MusicSubmissionRecord[]> {
    if (!text(projectId)) return Promise.reject(Error('Choose a Music project first.'))
    return queue.run(this.filename, async () => (await this.read()).records.filter(record => record.projectId === projectId).map(record => ({ ...record })))
  }
  get(scope: MusicSubmissionScope, submissionId: string): Promise<MusicSubmissionRecord> {
    validScope(scope)
    return queue.run(this.filename, async () => { const record = (await this.read()).records.find(record => record.submissionId === submissionId && sameOwner(record, scope)); if (!record) throw Error('This Music submission does not belong to the current project and node.'); return { ...record } })
  }
  async reserve(scope: MusicSubmissionScope, request: MusicRequest, origin: { canvasId: string; pageId: string }): Promise<MusicSubmissionRecord> {
    validScope(scope); if (!origin || !text(origin.canvasId) || !text(origin.pageId)) throw Error('Choose the original Music Canvas and page.'); const fingerprint = musicRequestFingerprint(request), modelId = compileMusicRequest(request).modelId
    return this.mutate(document => {
      if (document.records.some(record => record.projectId === scope.projectId && record.nodeId === scope.nodeId && musicSubmissionRequiresRecovery(record))) throw Error('A previous Music submission needs review or local recovery before another paid Run.')
      const pending = document.records.filter(musicSubmissionRequiresRecovery), recent = document.records.filter(record => !musicSubmissionRequiresRecovery(record)).slice(-64)
      if (pending.length >= 512) throw Error('Review existing Music submissions before adding another.')
      const stamp = this.now(), record: MusicSubmissionRecord = { ...scope, canvasId: origin.canvasId, pageId: origin.pageId, submissionId: this.id(), modelId, fingerprint, state: 'reserved', createdAt: stamp, updatedAt: stamp }
      document.records = [...pending, ...recent, record]; return record
    })
  }
  private update(scope: MusicSubmissionScope, id: string, change: (record: MusicSubmissionRecord) => void) {
    validScope(scope)
    return this.mutate(document => { const record = document.records.find(record => record.submissionId === id && sameOwner(record, scope)); if (!record) throw Error('This Music submission does not belong to the current project and node.'); change(record); record.updatedAt = this.now(); return record })
  }
  submitting(scope: MusicSubmissionScope, id: string, profileId: string) { return this.update(scope, id, record => { if (record.state !== 'reserved' || !text(profileId)) throw Error('This Music submission cannot be paid for again.'); record.profileId = profileId; record.state = 'submitting' }) }
  unknown(scope: MusicSubmissionScope, id: string) { return this.update(scope, id, record => { if (record.state !== 'submitting' && record.state !== 'unknown') throw Error('Music submission state changed before uncertainty was recorded.'); record.state = 'unknown' }) }
  completed(scope: MusicSubmissionScope, id: string, input: { requestId?: string; saveState: AudioDerivativeSaveFailure['state']; retainedOutputPath?: string }) { return this.update(scope, id, record => { if (!['submitting','unknown','complete','saved'].includes(record.state)) throw Error('Music completion does not match its original submission.'); record.state = 'complete'; record.requestId = input.requestId; record.saveState = input.saveState; record.retainedOutputPath = input.retainedOutputPath }) }
  saved(scope: MusicSubmissionScope, id: string, outputPath: string) { return this.update(scope, id, record => { if (!['submitting','complete'].includes(record.state)) throw Error('Music saving does not match its original submission.'); record.state = 'saved'; record.saveState = 'indexed-history-saved'; record.retainedOutputPath = outputPath }) }
  rejected(scope: MusicSubmissionScope, id: string) { return this.update(scope, id, record => { if (record.state !== 'reserved' && record.state !== 'submitting') throw Error('An uncertain or completed Music submission cannot be discarded automatically.'); record.state = 'rejected' }) }
  review(scope: MusicSubmissionScope, id: string, evidence: unknown) { return this.update(scope, id, record => { if (evidence !== 'provider-history-reviewed' || !musicSubmissionRequiresRecovery(record)) throw Error('Review the original ElevenLabs history explicitly before releasing this Music submission.'); record.state = 'reviewed' }) }
}
