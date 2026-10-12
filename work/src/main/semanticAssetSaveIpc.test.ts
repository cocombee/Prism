import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { registerSemanticAssetSaveIpc } from './semanticAssetSaveIpc'
import { ProjectCommandQueue } from './projectCommandQueue'
import { JsonMutationQueue } from './mainSafety'

const roots: string[] = []
async function exists(path: string) { try { await stat(path); return true } catch { return false } }
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

async function fixture(readable = false) {
  const rootPath = await mkdtemp(join(tmpdir(), 'prism-semantic-ipc-')); roots.push(rootPath)
  const canvas = join(rootPath, readable ? 'Canvas' : '05. Canvas'); const character = join(rootPath, readable ? 'Characters' : '01. Characters', 'hero'); const generated = join(rootPath, 'Generated Assets')
  await Promise.all([mkdir(canvas, { recursive: true }), mkdir(character, { recursive: true }), mkdir(generated, { recursive: true })])
  const old = join(character, 'hero.png'); const one = join(generated, 'one.png'); const two = join(generated, 'two.png'); const external = join(rootPath, '..', `external-ipc-${Date.now()}.png`); roots.push(external)
  await Promise.all([writeFile(old, 'OLD'), writeFile(one, 'ONE'), writeFile(two, 'TWO'), writeFile(external, 'EXT')])
  const workflowPath = join(canvas, 'workflow.json'); const assetsPath = join(canvas, 'assets.json'); const projectDocumentPath = join(rootPath, readable ? 'Project' : '00. Project', 'project.prismflow')
  await mkdir(join(rootPath, readable ? 'Project' : '00. Project'), { recursive: true })
  const node = { id: 'character-node', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'character', title: 'hero', referenceTag: '@hero', semanticReplacementAuthority: { targetAssetId: 'saved', token: 'edit-token' }, referenceAssets: [{ id: 'saved', name: 'hero.png', path: old, mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', origin: 'generated' }, { id: 'external', name: 'external.png', path: external, mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', origin: 'imported' }], generatedResults: [{ id: 'one', path: one, url: 'one', type: 'image', modelId: 'm', createdAt: '2026-08-26T01:01:00Z' }, { id: 'two', path: two, url: 'two', type: 'image', modelId: 'm', createdAt: '2026-08-26T01:02:00Z' }], activeResultIndex: 0 } }
  const workflow = { schemaVersion: 1, id: 'w', name: 'w', createdAt: '', updatedAt: '', nodes: [node], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  const assets = node.data.referenceAssets
  await Promise.all([writeFile(workflowPath, JSON.stringify(workflow)), writeFile(assetsPath, JSON.stringify(assets)), writeFile(projectDocumentPath, JSON.stringify({ fileType: 'prism-foundry-project', schemaVersion: 1, project: {}, workflow, assets }))])
  return { rootPath, workflowPath, assetsPath, projectDocumentPath, old, one, two, external }
}

describe('actual semantic asset main/preload IPC boundary', () => {
  it('commits a new semantic asset to the readable layout and reopens the exact canonical and portable paths', async () => {
    const f = await fixture(true); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => f })
    const result = await handlers.get('assets:commit-semantic-result')!({}, { nodeId: 'character-node', selectedResultId: 'one', intent: { mode: 'create-new' } }) as { asset: { path: string; id: string } }
    expect(result.asset.path).toBe(join(f.rootPath, 'Characters', 'hero-2', 'hero.png'))
    expect(await readFile(result.asset.path, 'utf8')).toBe('ONE')
    expect(await readFile(f.old, 'utf8')).toBe('OLD')
    const canonical = JSON.parse(await readFile(f.workflowPath, 'utf8'))
    const portable = JSON.parse(await readFile(f.projectDocumentPath, 'utf8'))
    expect(canonical.nodes[0].data.outputPath).toBe(result.asset.path)
    expect(portable.workflow.nodes[0].data.outputPath).toBe(result.asset.path)
    expect(portable.assets.some((asset: { id: string }) => asset.id === result.asset.id)).toBe(true)
    expect(await exists(join(f.rootPath, '05. Canvas'))).toBe(false)
    expect(await exists(join(f.rootPath, '01. Characters'))).toBe(false)
  })

  it('reads portable metadata after a queued profile change rather than replacing its new override', async () => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const commands = new ProjectCommandQueue(); const documents = new JsonMutationQueue()
    let release!: () => void; let entered!: () => void
    const gate = new Promise<void>((yes) => { release = yes }); const started = new Promise<void>((yes) => { entered = yes })
    const profileChange = commands.run(() => documents.run(f.projectDocumentPath, async () => {
      entered(); await gate
      const project = JSON.parse(await readFile(f.projectDocumentPath, 'utf8'))
      project.project.serviceProfileOverrides = { fal: 'new-profile' }
      await writeFile(f.projectDocumentPath, JSON.stringify(project))
    }))
    await started
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, {
      currentProject: () => f,
      runWithDocumentOwner: (context, action) => commands.run(() => documents.run(context.projectDocumentPath!, action)),
    })
    const saved = handlers.get('assets:commit-semantic-result')!({}, { nodeId: 'character-node', selectedResultId: 'one', intent: { mode: 'replace-existing', targetAssetId: 'saved', token: 'edit-token' } })
    release(); await profileChange; await saved
    const portable = JSON.parse(await readFile(f.projectDocumentPath, 'utf8'))
    expect(portable.project.serviceProfileOverrides).toEqual({ fal: 'new-profile' })
    expect(portable.workflow.nodes[0].data.semanticAssetLifecycle.status).toBe('SAVED_VIEW')
  })

  it('rejects an obsolete semantic-save project owner before any generated files move', async () => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>(); let owner = 'B'
    const commands = new ProjectCommandQueue()
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, {
      currentProject: () => f,
      runWithDocumentOwner: (_context, action) => commands.runForOwner('A', () => owner, action),
    })
    await expect(handlers.get('assets:commit-semantic-result')!({}, { nodeId: 'character-node', selectedResultId: 'one', intent: { mode: 'replace-existing', targetAssetId: 'saved', token: 'edit-token' } })).rejects.toMatchObject({ name: 'AbortError' })
    expect(await readFile(f.one, 'utf8')).toBe('ONE')
    expect(await readFile(f.old, 'utf8')).toBe('OLD')
  })
  it('registers and invokes a main-derived transaction with exactly one canonical asset across index, workflow, and project document', async () => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => ({ rootPath: f.rootPath, workflowPath: f.workflowPath, assetsPath: f.assetsPath, projectDocumentPath: f.projectDocumentPath }) })
    const handler = handlers.get('assets:commit-semantic-result'); expect(handler).toBeTypeOf('function')
    const result = await handler!({}, { nodeId: 'character-node', selectedResultId: 'one', intent: { mode: 'replace-existing', targetAssetId: 'saved', token: 'edit-token' } }) as { asset: { path: string }; deletedGeneratedResultIds: string[] }
    expect(await readFile(result.asset.path, 'utf8')).toBe('ONE')
    expect(result.deletedGeneratedResultIds).toEqual(['two'])
    expect(await readFile(f.old, 'utf8')).toBe('ONE'); expect(await exists(f.one)).toBe(false); expect(await exists(f.two)).toBe(false)
    expect(await readFile(f.external, 'utf8')).toBe('EXT')
    const assets = JSON.parse(await readFile(f.assetsPath, 'utf8')); expect(assets).toHaveLength(2); expect(assets.some((asset: { path: string }) => asset.path === result.asset.path)).toBe(true)
    const workflow = JSON.parse(await readFile(f.workflowPath, 'utf8')); expect(workflow.nodes[0].data.generatedResults).toBeUndefined(); expect(workflow.nodes[0].data.semanticAssetLifecycle.status).toBe('SAVED_VIEW')
    const project = JSON.parse(await readFile(f.projectDocumentPath, 'utf8')); expect(project.workflow.nodes[0].data.referenceAssets).toHaveLength(1); expect(project.assets).toHaveLength(2)
  })

  it('rejects a generated path that is owned by another semantic asset before starting the physical transaction', async () => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const workflow = JSON.parse(await readFile(f.workflowPath, 'utf8'))
    workflow.nodes.push({ id: 'other-asset', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'element', title: 'other', referenceAssets: [{ id: 'other-saved', name: 'other.png', path: f.one, mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', origin: 'generated' }] } })
    await writeFile(f.workflowPath, JSON.stringify(workflow))
    const project = JSON.parse(await readFile(f.projectDocumentPath, 'utf8')); project.workflow = workflow; await writeFile(f.projectDocumentPath, JSON.stringify(project))
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => ({ rootPath: f.rootPath, workflowPath: f.workflowPath, assetsPath: f.assetsPath, projectDocumentPath: f.projectDocumentPath }) })
    await expect(handlers.get('assets:commit-semantic-result')!({}, { nodeId: 'character-node', selectedResultId: 'one', intent: { mode: 'replace-existing', targetAssetId: 'saved', token: 'edit-token' } })).rejects.toThrow('belongs to another semantic asset')
    expect(await readFile(f.one, 'utf8')).toBe('ONE')
  })

  it('rejects cross-node/inactive result identities without accepting renderer-controlled roots or paths', async () => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => ({ rootPath: f.rootPath, workflowPath: f.workflowPath, assetsPath: f.assetsPath, projectDocumentPath: f.projectDocumentPath }) })
    const handler = handlers.get('assets:commit-semantic-result')!
    await expect(handler({}, { nodeId: 'character-node', selectedResultId: 'foreign', intent: { mode: 'create-new' }, managedRoot: '/tmp/evil', metadataPath: '/tmp/evil.json' })).rejects.toThrow('not an active generated result')
    expect(await readFile(f.one, 'utf8')).toBe('ONE')
  })

  it('Create with the canonical managed source selected mints a distinct asset and collision-safe path without changing the source record or bytes', async () => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const workflow = JSON.parse(await readFile(f.workflowPath, 'utf8'))
    const source = workflow.nodes[0].data.referenceAssets[0]
    delete workflow.nodes[0].data.semanticReplacementAuthority
    workflow.nodes[0].data.generatedResults = [{ id: 'selected-original', path: f.old, url: 'original', type: 'image', modelId: 'manual-reference', createdAt: '2026-08-26T01:03:00Z' }]
    workflow.nodes[0].data.activeResultIndex = 0
    await writeFile(f.workflowPath, JSON.stringify(workflow))
    const project = JSON.parse(await readFile(f.projectDocumentPath, 'utf8')); project.workflow = workflow; await writeFile(f.projectDocumentPath, JSON.stringify(project))
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => ({ rootPath: f.rootPath, workflowPath: f.workflowPath, assetsPath: f.assetsPath, projectDocumentPath: f.projectDocumentPath }) })
    const result = await handlers.get('assets:commit-semantic-result')!({}, { nodeId: 'character-node', selectedResultId: 'selected-original', intent: { mode: 'create-new' } }) as { asset: { id: string; path: string } }
    expect(result.asset.id).not.toBe(source.id)
    expect(result.asset.path).not.toBe(f.old)
    expect(result.asset.path).toContain('hero-2')
    expect(await readFile(f.old, 'utf8')).toBe('OLD')
    expect(await readFile(result.asset.path, 'utf8')).toBe('OLD')
    const assets = JSON.parse(await readFile(f.assetsPath, 'utf8'))
    expect(assets.filter((asset: { id: string }) => [source.id, result.asset.id].includes(asset.id))).toHaveLength(2)
    expect(assets.find((asset: { id: string }) => asset.id === source.id)).toEqual(source)
  })

  it.each([
    ['character', 'character'], ['wardrobe', 'wardrobe'], ['element', 'element'], ['location', 'location'], ['style-reference', 'style'],
  ] as const)('keeps %s Create reference-only and emits a new %s record at the IPC boundary', async (kind, category) => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const workflow = JSON.parse(await readFile(f.workflowPath, 'utf8'))
    workflow.nodes[0].data.kind = kind
    workflow.nodes[0].data.title = 'same-title'
    workflow.nodes[0].data.referenceTag = '@same-title'
    delete workflow.nodes[0].data.semanticReplacementAuthority
    workflow.nodes[0].data.generatedResults = [{ id: `selected-${kind}`, path: f.old, url: 'same', type: 'image', modelId: 'manual-reference', createdAt: '2026-08-26T01:03:00Z' }]
    await writeFile(f.workflowPath, JSON.stringify(workflow))
    const project = JSON.parse(await readFile(f.projectDocumentPath, 'utf8')); project.workflow = workflow; await writeFile(f.projectDocumentPath, JSON.stringify(project))
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => ({ rootPath: f.rootPath, workflowPath: f.workflowPath, assetsPath: f.assetsPath, projectDocumentPath: f.projectDocumentPath }) })
    const result = await handlers.get('assets:commit-semantic-result')!({}, { nodeId: 'character-node', selectedResultId: `selected-${kind}`, intent: { mode: 'create-new' } }) as { asset: { id: string; category: string; path: string } }
    expect(result.asset.id).not.toBe('saved')
    expect(result.asset.category).toBe(category)
    expect(result.asset.path).not.toBe(f.old)
    expect(await readFile(f.old, 'utf8')).toBe('OLD')
  })

  it.each([
    'character', 'wardrobe', 'element', 'location', 'style-reference',
  ] as const)('requires and honors explicit Edit authority for %s replacement', async (kind) => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const workflow = JSON.parse(await readFile(f.workflowPath, 'utf8'))
    workflow.nodes[0].data.kind = kind
    workflow.nodes[0].data.semanticReplacementAuthority = { targetAssetId: 'saved', token: `token-${kind}` }
    await writeFile(f.workflowPath, JSON.stringify(workflow))
    const project = JSON.parse(await readFile(f.projectDocumentPath, 'utf8')); project.workflow = workflow; await writeFile(f.projectDocumentPath, JSON.stringify(project))
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => ({ rootPath: f.rootPath, workflowPath: f.workflowPath, assetsPath: f.assetsPath, projectDocumentPath: f.projectDocumentPath }) })
    const result = await handlers.get('assets:commit-semantic-result')!({}, { nodeId: 'character-node', selectedResultId: 'one', intent: { mode: 'replace-existing', targetAssetId: 'saved', token: `token-${kind}` } }) as { asset: { id: string; path: string } }
    expect(result.asset).toMatchObject({ id: 'saved', path: f.old })
    expect(await readFile(f.old, 'utf8')).toBe('ONE')
    const savedWorkflow = JSON.parse(await readFile(f.workflowPath, 'utf8'))
    expect(savedWorkflow.nodes[0].data.semanticReplacementAuthority).toBeUndefined()
  })

  it('rejects replace-existing without an exact renderer-to-main Edit target and token match', async () => {
    const f = await fixture(); const handlers = new Map<string, (...args: unknown[]) => unknown>()
    registerSemanticAssetSaveIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, { currentProject: () => ({ rootPath: f.rootPath, workflowPath: f.workflowPath, assetsPath: f.assetsPath, projectDocumentPath: f.projectDocumentPath }) })
    const handler = handlers.get('assets:commit-semantic-result')!
    await expect(handler({}, { nodeId: 'character-node', selectedResultId: 'one', intent: { mode: 'replace-existing', targetAssetId: 'saved', token: 'wrong-token' } })).rejects.toThrow('Edit replacement authority')
    expect(await readFile(f.old, 'utf8')).toBe('OLD')
  })
})
