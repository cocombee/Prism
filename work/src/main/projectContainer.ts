import { createHash, randomUUID } from 'node:crypto'
import { copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, rmdir, unlink } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import type { ProjectDocument, ProjectWorkspace } from '../shared/types'
import { PROJECT_FOLDER_ALIASES } from './projectFolders'

interface Move { from: string; to: string; directory: boolean; dev: number; ino: number; checksum?: string }
interface Metadata { path: string; before: string; after: string; mode: number }
interface Journal { version: 1; phase: 'prepared' | 'committed'; oldRoot: string; newRoot: string; reservation?: { dev: number; ino: number }; moves: Move[]; files: Metadata[] }
interface Options {
  dataRoot: string; rootPath: string; documentPath: string; project: ProjectWorkspace
  recentPath: string; pointerPath: string; name?: string
  checkpoint?: (phase: 'prepared' | 'move' | 'write' | 'committed', index?: number) => Promise<void>
  simulateInterruption?: boolean
}
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const journalDirectory = (dataRoot: string) => join(dataRoot, 'project-container-transactions')
const exists = async (path: string) => { try { return await lstat(path) } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw e } }
async function syncFolder(path: string) { const file = await open(path, 'r'); try { await file.sync() } finally { await file.close() } }
async function writeDurable(path: string, bytes: string, mode = 0o600) {
  const part = path + '.prism-container-' + randomUUID()
  const file = await open(part, 'wx', mode)
  try { await file.writeFile(bytes); await file.sync() } finally { await file.close() }
  try { await rename(part, path); await syncFolder(dirname(path)) } catch (e) { await unlink(part).catch(() => undefined); throw e }
}
export function projectContainerName(name: string): string {
  const stem = name.trim().replace(/\s*\(Prism\)\s*$/i, '').trim()
  if (!stem || stem === '.' || stem === '..' || /[\x00-\x1f\x7f/\\:]/.test(stem) || stem.length > 180) throw new Error('Choose a valid project name.')
  return `${stem} (Prism)`
}
/** Remap only moved path owners; prose and unrelated external references remain unchanged. */
export function rewriteContainerReferences(value: unknown, moves: Array<{ from: string; to: string }>, oldRoot: string, newRoot: string, property?: string): unknown {
  if (typeof value === 'string') {
    if (property && !/(?:paths?|urls?|root|folder)$/i.test(property) && !['from', 'to', 'destination'].includes(property)) return value
    if (value.startsWith('prism-asset://local/')) {
      try { const path = decodeURIComponent(value.slice('prism-asset://local/'.length)); const next = rewriteContainerReferences(path, moves, oldRoot, newRoot); return next === path ? value : `prism-asset://local/${encodeURIComponent(next as string)}` } catch { return value }
    }
    let mapped = value === oldRoot ? newRoot : value
    for (const move of moves) if (mapped === move.from || mapped.startsWith(move.from + sep)) mapped = move.to + mapped.slice(move.from.length)
    return mapped
  }
  if (Array.isArray(value)) return value.map(item => rewriteContainerReferences(item, moves, oldRoot, newRoot, property))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteContainerReferences(item, moves, oldRoot, newRoot, key)]))
  return value
}
async function jsonFiles(path: string): Promise<string[]> {
  const st = await lstat(path)
  if (st.isSymbolicLink()) throw new Error('Project folder links need explicit review before relocation.')
  if (st.isDirectory()) {
    const result: string[] = []
    for (const entry of await readdir(path)) result.push(...await jsonFiles(join(path, entry)))
    return result
  }
  return ['.json', '.prismflow'].includes(extname(path).toLowerCase()) ? [path] : []
}
async function verifiedMove(move: Move, reverse = false) {
  const from = reverse ? move.to : move.from, to = reverse ? move.from : move.to
  const source = await exists(from), target = await exists(to)
  if (!source && target) {
    if (move.directory && (target.dev !== move.dev || target.ino !== move.ino)) throw new Error('A project move destination changed; preserve it for recovery.')
    if (!move.directory && hash(await readFile(to)) !== move.checksum) throw new Error('A project document changed during move recovery.')
    return
  }
  if (!source || target || source.isSymbolicLink()) throw new Error('The project relocation path changed; no existing destination was overwritten.')
  if (move.directory && (source.dev !== move.dev || source.ino !== move.ino)) throw new Error('The original project folder changed during relocation.')
  if (!move.directory && hash(await readFile(from)) !== move.checksum) throw new Error('The original project document changed during relocation.')
  await rename(from, to); await syncFolder(dirname(from)); if (dirname(to) !== dirname(from)) await syncFolder(dirname(to))
}
async function rollback(journal: Journal) {
  // Restore byte-exact metadata before moving the owning directories back.
  for (const file of [...journal.files].reverse()) {
    const current = await exists(file.path)
    if (!current) continue
    if (current.isSymbolicLink() || !current.isFile()) throw new Error('Project recovery encountered a replaced metadata file.')
    const bytes = await readFile(file.path, 'utf8')
    if (bytes !== file.after && bytes !== file.before) throw new Error('Project metadata was edited after interruption; preserve the recovery journal.')
    if (bytes !== file.before) await writeDurable(file.path, file.before, file.mode)
  }
  for (const move of [...journal.moves].reverse()) {
    // A later document rename may not have started yet. Locate it only after its containing move.
    if (!await exists(move.to) && !await exists(move.from)) continue
    await verifiedMove(move, true)
  }
  if (journal.reservation) {
    const st = await exists(journal.newRoot)
    if (st) { if (st.dev !== journal.reservation.dev || st.ino !== journal.reservation.ino) throw new Error('The reserved project container changed.'); await rmdir(journal.newRoot); await syncFolder(dirname(journal.newRoot)) }
  }
}
export async function recoverProjectContainers(dataRoot: string): Promise<void> {
  const folder = journalDirectory(dataRoot)
  if (!await exists(folder)) return
  for (const name of await readdir(folder)) {
    if (!name.endsWith('.json')) continue
    const file = join(folder, name), journal = JSON.parse(await readFile(file, 'utf8')) as Journal
    if (journal.version !== 1 || !Array.isArray(journal.moves) || !Array.isArray(journal.files)) throw new Error('Invalid project-container recovery journal.')
    if (journal.phase === 'prepared') await rollback(journal)
    else if (journal.phase === 'committed') {
      for (const entry of journal.files) if (await readFile(entry.path, 'utf8') !== entry.after) throw new Error('Committed project metadata changed before recovery completed.')
    } else throw new Error('Invalid project-container recovery phase.')
    await unlink(file); await syncFolder(folder)
  }
}
export async function resolveProjectContainerSelection(selected: string): Promise<string> {
  if (await exists(join(selected, 'Prism Foundry Project.json'))) return selected
  const matches: string[] = []
  for (const name of await readdir(selected)) {
    if (!name.endsWith(' (Prism)')) continue
    const path = join(selected, name), st = await lstat(path)
    if (!st.isDirectory() || st.isSymbolicLink() || !await exists(join(path, 'Prism Foundry Project.json'))) continue
    const manifest = JSON.parse(await readFile(join(path, 'Prism Foundry Project.json'), 'utf8'))
    if (manifest.schemaVersion === 1 && manifest.projectFolderVersion === 1) matches.push(path)
  }
  if (matches.length > 1) throw new Error('This folder contains several Prism projects. Choose the project’s (Prism) folder.')
  return matches[0] || selected
}
export async function moveProjectContainer(options: Options): Promise<ProjectWorkspace & { documentPath: string }> {
  await recoverProjectContainers(options.dataRoot)
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(options.project.id)) throw new Error('Invalid project identity.')
  const oldRoot = resolve(options.rootPath), rootStat = await lstat(oldRoot)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Choose a real project folder.')
  const name = (options.name || options.project.name).trim().replace(/\s*\(Prism\)\s*$/i, '').trim(), folderName = projectContainerName(name)
  const ownedContainer = options.project.projectFolderVersion === 1
  const newRoot = ownedContainer ? join(dirname(oldRoot), folderName) : join(oldRoot, folderName)
  const originalDocument = resolve(options.documentPath)
  if (originalDocument !== oldRoot && !originalDocument.startsWith(oldRoot + sep)) throw new Error('The project document is outside its managed root; review it before relocation.')
  const manifest = JSON.parse(await readFile(join(oldRoot, 'Prism Foundry Project.json'), 'utf8'))
  if (manifest.id !== options.project.id || manifest.schemaVersion !== 1) throw new Error('The verified project manifest does not own this folder.')
  const physical: Array<{ from: string; to: string }> = []
  if (newRoot !== oldRoot) {
    if (await exists(newRoot)) throw new Error(`“${folderName}” already exists. Prism did not merge or overwrite it.`)
    if (ownedContainer) physical.push({ from: oldRoot, to: newRoot })
    else {
      const candidates = [...new Set([...Object.keys(PROJECT_FOLDER_ALIASES), ...Object.values(PROJECT_FOLDER_ALIASES).flat(), 'Prism Foundry Project.json'])]
      for (const child of candidates) if (await exists(join(oldRoot, child))) physical.push({ from: join(oldRoot, child), to: join(newRoot, child) })
      if (!physical.some(move => originalDocument === move.from || originalDocument.startsWith(move.from + sep))) physical.push({ from: originalDocument, to: join(newRoot, basename(originalDocument)) })
      if (!physical.some(move => basename(move.from) === 'Prism Foundry Project.json')) throw new Error('A verified Prism project manifest is required before upgrading a scattered folder.')
    }
  }
  const movedDocument = rewriteContainerReferences(originalDocument, physical, oldRoot, newRoot) as string
  const documentPath = join(dirname(movedDocument), `${name}.prismflow`)
  const renameDocument = movedDocument !== documentPath ? { from: movedDocument, to: documentPath } : undefined
  if (renameDocument && await exists(documentPath)) throw new Error('A project document with that name already exists.')
  const pathMoves = [...physical, ...(renameDocument ? [renameDocument] : [])]
  const project = { ...options.project, name, rootPath: newRoot, projectFolderVersion: 1 as const, chosenFolder: ownedContainer ? options.project.chosenFolder || dirname(oldRoot) : oldRoot, updatedAt: new Date().toISOString() }
  const files: Metadata[] = []
  const sourceFiles = new Set<string>()
  for (const move of physical) for (const file of await jsonFiles(move.from)) sourceFiles.add(file)
  if (!physical.length) for (const file of await jsonFiles(oldRoot)) sourceFiles.add(file)
  sourceFiles.add(originalDocument)
  for (const sourcePath of sourceFiles) {
    const st = await lstat(sourcePath)
    if (!st.isFile() || st.isSymbolicLink() || st.size > 64 * 1024 * 1024) throw new Error('A project metadata file cannot be safely relocated.')
    const before = await readFile(sourcePath, 'utf8'), data = JSON.parse(before)
    if (extname(sourcePath).toLowerCase() === '.prismflow' && data.project?.id !== project.id) throw new Error('This folder contains a document owned by another project. Separate the shared roots before upgrade.')
    let after = rewriteContainerReferences(data, pathMoves, oldRoot, newRoot) as Record<string, unknown>
    if (basename(sourcePath) === 'Prism Foundry Project.json') { if (data.id !== project.id) throw new Error('The project manifest identity changed.'); after = { ...data, ...project } }
    if (after.fileType === 'prism-foundry-project') after = { ...after, project: { ...(after.project as object), name, projectFolderVersion: 1, chosenFolder: project.chosenFolder } }
    files.push({ path: rewriteContainerReferences(sourcePath, pathMoves, oldRoot, newRoot) as string, before, after: JSON.stringify(after, null, 2)+'\n', mode: st.mode & 0o777 })
  }
  for (const globalPath of [options.recentPath, options.pointerPath]) {
    const st = await exists(globalPath); if (!st) continue
    const before = await readFile(globalPath, 'utf8'), data = JSON.parse(before)
    const update = (entry: ProjectWorkspace & { documentPath?: string }) => entry?.id === project.id && resolve(entry.rootPath) === oldRoot ? { ...entry, ...project, documentPath } : entry
    const after = Array.isArray(data) ? data.map(update) : update(data)
    files.push({ path: globalPath, before, after: JSON.stringify(after, null, 2)+'\n', mode: st.mode & 0o777 })
  }
  const moves: Move[] = []
  for (const move of physical) { const st = await lstat(move.from); moves.push({ ...move, directory: st.isDirectory(), dev: st.dev, ino: st.ino, ...!st.isDirectory() ? { checksum: hash(await readFile(move.from)) } : {} }) }
  if (renameDocument) { const st = await lstat(originalDocument); moves.push({ ...renameDocument, directory: false, dev: st.dev, ino: st.ino, checksum: hash(await readFile(originalDocument)) }) }
  await mkdir(journalDirectory(options.dataRoot), { recursive: true })
  const journalPath = join(journalDirectory(options.dataRoot), `${project.id}-${randomUUID()}.json`)
  const journal: Journal = { version: 1, phase: 'prepared', oldRoot, newRoot, moves, files }
  // The reservation is created only after every metadata file has parsed and collisions have been checked.
  if (!ownedContainer && newRoot !== oldRoot) { await mkdir(newRoot); const st = await lstat(newRoot); journal.reservation = { dev: st.dev, ino: st.ino }; await syncFolder(dirname(newRoot)) }
  try {
    await writeDurable(journalPath, JSON.stringify(journal)); await options.checkpoint?.('prepared')
    for (const [index, move] of moves.entries()) { await verifiedMove(move); await options.checkpoint?.('move', index) }
    for (const [index, file] of files.entries()) { if (await readFile(file.path, 'utf8') !== file.before) throw new Error('Project metadata changed during relocation.'); await writeDurable(file.path, file.after, file.mode); await options.checkpoint?.('write', index) }
    for (const file of files) if (await readFile(file.path, 'utf8') !== file.after) throw new Error('The moved project failed metadata verification.')
    journal.phase = 'committed'; await writeDurable(journalPath, JSON.stringify(journal)); await options.checkpoint?.('committed')
    await unlink(journalPath); await syncFolder(dirname(journalPath))
    return { ...project, documentPath }
  } catch (error) {
    if (options.simulateInterruption) throw error
    if (journal.phase === 'prepared') { await rollback(journal); await unlink(journalPath).catch(() => undefined); await syncFolder(dirname(journalPath)) }
    throw error
  }
}

/** A standalone portable document grants copy access to its package media, never ownership of its parent folder. */
export async function materializePortableContainer(document: ProjectDocument, documentPath: string, sourceRoot: string): Promise<string> {
  const name = basename(documentPath, '.prismflow'), folderName = projectContainerName(name), root = join(sourceRoot, folderName)
  if (!document.project || !/^[a-zA-Z0-9_-]{1,128}$/.test(document.project.id)) throw new Error('Invalid portable project identity.')
  if (await exists(root)) throw new Error('A project container with this name already exists. Open it instead of replacing it.')
  const sourceBase = await realpath(sourceRoot)
  const sources: Array<{ asset: ProjectDocument['assets'][number]; source: string; destination: string; available: boolean }> = []
  const destinations = new Set<string>()
  for (const asset of document.assets || []) {
    if (!asset || typeof asset.path !== 'string' || typeof asset.mimeType !== 'string') throw new Error('Invalid portable media record.')
    const source = asset.relativePath ? resolve(sourceRoot, asset.relativePath) : resolve(asset.path)
    if (!source.startsWith(resolve(sourceRoot) + sep)) throw new Error('Portable media outside its package folder needs explicit import; Prism did not read it.')
    const st = await exists(source)
    if (st && (!st.isFile() || !(await realpath(source)).startsWith(sourceBase + sep))) throw new Error('A portable media link escapes its package folder.')
    const family = asset.mimeType.startsWith('video/') ? 'Videos' : asset.mimeType.startsWith('audio/') ? 'Audio' : asset.mimeType.startsWith('image/') ? 'Images' : undefined
    if (!family || !/\.(png|jpe?g|webp|gif|avif|heic|mp4|mov|webm|mkv|mp3|wav|m4a|aac|ogg|opus)$/i.test(source)) throw new Error('Choose a supported portable media file.')
    const category = asset.origin === 'generated' ? 'Generated Assets' : 'Imported Assets'
    const originalName = basename(source), extension = extname(originalName), stem = basename(originalName, extension)
    let filename = originalName, index = 2
    while (destinations.has(join(category, family, filename))) filename = `${stem} (${index++})${extension}`
    destinations.add(join(category, family, filename))
    sources.push({ asset, source, destination: join(root, category, family, filename), available: Boolean(st) })
  }
  const temporary = join(sourceRoot, `.prism-project-import-${randomUUID()}`)
  await mkdir(temporary)
  try {
    for (const folder of ['Project', 'Canvas', 'Characters', 'Elements', 'Locations', 'Storyboards', ...['Imported Assets', 'Generated Assets'].flatMap(kind => ['Images', 'Videos', 'Audio'].map(family => join(kind, family)))]) await mkdir(join(temporary, folder), { recursive: true })
    const moves = sources.flatMap(({ asset, source, destination }) => [{ from: asset.path, to: destination }, { from: source, to: destination }])
    const assets: ProjectDocument['assets'] = []
    for (const entry of sources) {
      if (entry.available) await copyFile(entry.source, join(temporary, relative(root, entry.destination)), constants.COPYFILE_EXCL)
      assets.push({ ...entry.asset, path: entry.destination, url: `prism-asset://local/${encodeURIComponent(entry.destination)}`, relativePath: relative(root, entry.destination) })
    }
    const updatedAt = new Date().toISOString(), project: ProjectWorkspace = { ...document.project, schemaVersion: 1, name, rootPath: root, projectFolderVersion: 1, chosenFolder: sourceRoot, updatedAt }
    const workflow = rewriteContainerReferences(document.workflow, moves, sourceRoot, root) as ProjectDocument['workflow']
    const { rootPath: _privateRoot, ...portableProject } = project
    const nextDocument = join(root, 'Project', `${name}.prismflow`)
    await writeDurable(join(temporary, 'Prism Foundry Project.json'), JSON.stringify(project, null, 2)+'\n')
    await writeDurable(join(temporary, 'Canvas/assets.json'), JSON.stringify(assets, null, 2)+'\n')
    if (workflow) await writeDurable(join(temporary, 'Canvas/workflow.json'), JSON.stringify(workflow, null, 2)+'\n')
    await writeDurable(join(temporary, 'Project', `${name}.prismflow`), JSON.stringify({ ...document, project: portableProject, assets, workflow }, null, 2)+'\n')
    if (await exists(root)) throw new Error('The destination appeared during import; Prism did not replace it.')
    await rename(temporary, root); await syncFolder(sourceRoot)
    return nextDocument
  } catch (error) { await rm(temporary, { recursive: true, force: true }); throw error }
}
