import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import { moveProjectContainer, recoverProjectContainers, projectContainerName, materializePortableContainer, resolveProjectContainerSelection } from './projectContainer'
const temporary: string[] = []
afterEach(async () => { for (const folder of temporary.splice(0)) await rm(folder, { recursive: true, force: true }) })
async function fixture() {
  const parent = await mkdtemp(join(tmpdir(), 'prism-container-test-')); temporary.push(parent)
  const root = join(parent, 'Chosen Folder'), dataRoot = join(parent, 'App Data')
  for (const folder of ['Project', 'Canvas', 'Generated Assets/Audio', 'Imported Assets/Images']) await mkdir(join(root, folder), { recursive: true })
  await mkdir(dataRoot)
  const project = { schemaVersion: 1 as const, id: 'fixture-project', name: 'Foley', rootPath: root, createdAt: '2026-10-13', updatedAt: '2026-10-13' }
  const audioPath = join(root, 'Generated Assets/Audio/original.wav'), documentPath = join(root, 'Project/Old Document.prismflow')
  const workflow = { nodes: [{ id: 'original', data: { assetPath: audioPath, assetUrl: `prism-asset://local/${encodeURIComponent(audioPath)}`, prompt: 'Do not change this text.', referenceAssets: [] } }], edges: [], external: join(parent, 'external.wav') }
  await writeFile(audioPath, Buffer.from([0,1,2,255,17,28]))
  await writeFile(join(root, 'Canvas/workflow.json'), JSON.stringify(workflow))
  await writeFile(join(root, 'Canvas/assets.json'), JSON.stringify([{ id: 'original-id', path: audioPath, url: `prism-asset://local/${encodeURIComponent(audioPath)}`, origin: 'generated' }]))
  await writeFile(join(root, 'Canvas/history.json'), JSON.stringify([{ nodeId: 'original', outputPath: audioPath }]))
  await writeFile(join(root, 'Prism Foundry Project.json'), JSON.stringify(project))
  await writeFile(documentPath, JSON.stringify({ fileType: 'prism-foundry-project', project, workflow }))
  await writeFile(join(root, 'Unrelated.txt'), 'unrelated original')
  const recentPath = join(dataRoot, 'recent.json'), pointerPath = join(dataRoot, 'pointer.json')
  await writeFile(recentPath, JSON.stringify([{ ...project, documentPath }, { ...project, id: 'other', rootPath: join(parent, 'Other') }]))
  await writeFile(pointerPath, JSON.stringify({ ...project, documentPath }))
  return { dataRoot, rootPath: root, documentPath, project, recentPath, pointerPath, audioPath, workflow, parent }
}
const absent = async (path: string) => { try { await lstat(path); return false } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return true; throw e } }
describe('named Prism project containers', () => {
  it('keeps one Prism suffix and rejects path traversal names', () => {
    expect(projectContainerName('Night Foley')).toBe('Night Foley (Prism)')
    expect(projectContainerName('Night Foley (Prism)')).toBe('Night Foley (Prism)')
    for (const name of ['../Other', '.', '..', 'a/b', 'a\\b', '']) expect(() => projectContainerName(name)).toThrow()
  })
  it('preserves authored text even when it begins with an old managed path', async () => {
    const f = await fixture(), path = join(f.rootPath, 'Canvas/workflow.json')
    const workflow = JSON.parse(await readFile(path, 'utf8'))
    workflow.nodes[0].data.prompt = f.audioPath
    workflow.nodes[0].data.referenceDescription = f.audioPath + ' supplies the narration.'
    await writeFile(path, JSON.stringify(workflow))
    const next = await moveProjectContainer(f), saved = JSON.parse(await readFile(join(next.rootPath, 'Canvas/workflow.json'), 'utf8'))
    expect(saved.nodes[0].data.prompt).toBe(f.audioPath)
    expect(saved.nodes[0].data.referenceDescription).toBe(workflow.nodes[0].data.referenceDescription)
    expect(saved.nodes[0].data.assetPath).not.toBe(f.audioPath)
  })
  it('upgrades a scattered project without moving unrelated files, identities or original bytes', async () => {
    const f = await fixture(), bytes = await readFile(f.audioPath), next = await moveProjectContainer(f)
    expect(next.rootPath).toBe(join(f.rootPath, 'Foley (Prism)'))
    expect(next.documentPath).toBe(join(next.rootPath, 'Project/Foley.prismflow'))
    expect(next.id).toBe(f.project.id)
    expect(next.projectFolderVersion).toBe(1)
    expect(await readFile(join(f.rootPath, 'Unrelated.txt'), 'utf8')).toBe('unrelated original')
    expect(await readFile(join(next.rootPath, 'Generated Assets/Audio/original.wav'))).toEqual(bytes)
    const workflow = JSON.parse(await readFile(join(next.rootPath, 'Canvas/workflow.json'), 'utf8'))
    expect(workflow.nodes[0].data.prompt).toBe(f.workflow.nodes[0].data.prompt)
    expect(workflow.nodes[0].id).toBe('original')
    expect(workflow.nodes[0].data.assetPath).toBe(join(next.rootPath, 'Generated Assets/Audio/original.wav'))
    expect(decodeURIComponent(workflow.nodes[0].data.assetUrl)).toContain(next.rootPath)
    expect(workflow.external).toBe(f.workflow.external)
    expect(JSON.parse(await readFile(f.recentPath, 'utf8'))[1].id).toBe('other')
    expect(JSON.parse(await readFile(f.pointerPath, 'utf8')).rootPath).toBe(next.rootPath)
    expect(await absent(join(f.rootPath, 'Canvas'))).toBe(true)
    expect(await readdir(join(f.dataRoot, 'project-container-transactions'))).toEqual([])
  })
  it('renames the existing container and project document with the same identity and no extra layer', async () => {
    const f = await fixture(), first = await moveProjectContainer(f)
    const next = await moveProjectContainer({ ...f, rootPath: first.rootPath, documentPath: first.documentPath, project: first, name: 'Night Foley' })
    expect(next.rootPath).toBe(join(f.rootPath, 'Night Foley (Prism)'))
    expect(next.documentPath).toBe(join(next.rootPath, 'Project/Night Foley.prismflow'))
    expect(await absent(first.rootPath)).toBe(true)
    expect(next.id).toBe(first.id)
    expect(JSON.parse(await readFile(join(next.rootPath, 'Prism Foundry Project.json'), 'utf8')).name).toBe('Night Foley')
    expect(JSON.parse(await readFile(next.documentPath, 'utf8')).project.name).toBe('Night Foley')
    expect(JSON.parse(await readFile(f.recentPath, 'utf8'))[0].rootPath).toBe(next.rootPath)
  })
  it('does not add a wrapper on repeat open', async () => {
    const f = await fixture(), first = await moveProjectContainer(f)
    const next = await moveProjectContainer({ ...f, rootPath: first.rootPath, documentPath: first.documentPath, project: first })
    expect(next.rootPath).toBe(first.rootPath)
    expect(await absent(join(first.rootPath, 'Foley (Prism)'))).toBe(true)
  })
  it('preserves an existing collision and leaves the legacy tree untouched', async () => {
    const f = await fixture(), target = join(f.rootPath, 'Foley (Prism)')
    await mkdir(target); await writeFile(join(target, 'foreign.txt'), 'foreign')
    await expect(moveProjectContainer(f)).rejects.toThrow(/already exists/)
    expect(await readFile(join(target, 'foreign.txt'), 'utf8')).toBe('foreign')
    expect(await readFile(f.audioPath)).toEqual(Buffer.from([0,1,2,255,17,28]))
    expect(await absent(f.documentPath)).toBe(false)
  })
  it('rolls back a failed metadata commit to byte-exact documents and original paths', async () => {
    const f = await fixture(), before = await readFile(f.documentPath), recent = await readFile(f.recentPath)
    await expect(moveProjectContainer({ ...f, checkpoint: async (phase, index) => { if (phase === 'write' && index === 2) throw new Error('fixture disk failure') } })).rejects.toThrow('fixture disk failure')
    expect(await readFile(f.documentPath)).toEqual(before)
    expect(await readFile(f.recentPath)).toEqual(recent)
    expect(await readFile(f.audioPath)).toEqual(Buffer.from([0,1,2,255,17,28]))
    expect(await absent(join(f.rootPath, 'Foley (Prism)'))).toBe(true)
  })
  it('recovers interrupted folder moves and metadata writes after reopening', async () => {
    for (const phase of ['prepared', 'move', 'write'] as const) {
      const f = await fixture(), before = await readFile(f.documentPath)
      await expect(moveProjectContainer({ ...f, simulateInterruption: true, checkpoint: async (event, index) => { if (event === phase && (index === undefined || index === 0)) throw new Error('fixture interruption') } })).rejects.toThrow('fixture interruption')
      await recoverProjectContainers(f.dataRoot)
      expect(await readFile(f.documentPath)).toEqual(before)
      expect(await absent(join(f.rootPath, 'Foley (Prism)'))).toBe(true)
      expect(JSON.parse(await readFile(f.pointerPath, 'utf8')).rootPath).toBe(f.rootPath)
    }
  })
  it('keeps a committed move after interruption while clearing the completed recovery journal', async () => {
    const f = await fixture()
    await expect(moveProjectContainer({ ...f, simulateInterruption: true, checkpoint: async phase => { if (phase === 'committed') throw new Error('fixture exit') } })).rejects.toThrow('fixture exit')
    await recoverProjectContainers(f.dataRoot)
    expect(JSON.parse(await readFile(f.pointerPath, 'utf8')).rootPath).toBe(join(f.rootPath, 'Foley (Prism)'))
    expect(await readFile(join(f.rootPath, 'Foley (Prism)/Generated Assets/Audio/original.wav'))).toEqual(Buffer.from([0,1,2,255,17,28]))
    expect(await readdir(join(f.dataRoot, 'project-container-transactions'))).toEqual([])
  })
  it('refuses mixed project ownership and malformed metadata before moving files', async () => {
    const f = await fixture()
    await writeFile(join(f.rootPath, 'Project/Other.prismflow'), JSON.stringify({ fileType: 'prism-foundry-project', project: { id: 'different' } }))
    await expect(moveProjectContainer(f)).rejects.toThrow(/another project/)
    expect(await absent(join(f.rootPath, 'Foley (Prism)'))).toBe(true)
    expect(await absent(f.audioPath)).toBe(false)
  })
  it('finds the sole existing container when its chosen parent folder is reopened', async () => {
    const f = await fixture(), first = await moveProjectContainer(f)
    expect(await resolveProjectContainerSelection(f.rootPath)).toBe(first.rootPath)
    await mkdir(join(f.rootPath, 'Other (Prism)'))
    await writeFile(join(f.rootPath, 'Other (Prism)/Prism Foundry Project.json'), JSON.stringify({ schemaVersion: 1, projectFolderVersion: 1, id: 'other' }))
    await expect(resolveProjectContainerSelection(f.rootPath)).rejects.toThrow(/several Prism projects/)
  })
  it('copies a standalone portable workflow into one container without moving package originals or trusting its folder marker', async () => {
    const f = await fixture(), original = await readFile(f.audioPath)
    const document = JSON.parse(await readFile(f.documentPath, 'utf8'))
    document.project.projectFolderVersion = 1
    document.assets = [{ id: 'original-id', name: 'original.wav', path: f.audioPath, relativePath: 'Generated Assets/Audio/original.wav', mimeType: 'audio/wav', origin: 'generated' }]
    const importedPath = await materializePortableContainer(document, join(f.rootPath, 'Imported Flow.prismflow'), f.rootPath)
    const imported = JSON.parse(await readFile(importedPath, 'utf8'))
    expect(importedPath).toBe(join(f.rootPath, 'Imported Flow (Prism)/Project/Imported Flow.prismflow'))
    expect(imported.project.id).toBe(f.project.id)
    expect(await readFile(f.audioPath)).toEqual(original)
    expect(await readFile(imported.assets[0].path)).toEqual(original)
    expect(imported.workflow.nodes[0].data.assetPath).toBe(imported.assets[0].path)
    expect(await readFile(join(f.rootPath, 'Unrelated.txt'), 'utf8')).toBe('unrelated original')
  })
  it('rejects a portable path outside the selected package before creating a container', async () => {
    const f = await fixture(), document = JSON.parse(await readFile(f.documentPath, 'utf8'))
    document.assets = [{ id: 'outside', name: 'outside.wav', path: join(f.parent, 'outside.wav'), mimeType: 'audio/wav' }]
    await expect(materializePortableContainer(document, join(f.rootPath, 'Bad.prismflow'), f.rootPath)).rejects.toThrow(/outside its package/)
    expect(await absent(join(f.rootPath, 'Bad (Prism)'))).toBe(true)
    expect(await absent(f.audioPath)).toBe(false)
  })
})
