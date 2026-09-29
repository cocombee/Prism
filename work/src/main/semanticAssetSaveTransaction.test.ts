import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { commitSemanticAssetSave, recoverSemanticAssetTransactions, type SemanticAssetSaveRequest } from './semanticAssetSaveTransaction'

const roots: string[] = []
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'prism-semantic-save-'))
  roots.push(root)
  const assetRoot = join(root, '01. Characters', 'hero')
  await mkdir(assetRoot, { recursive: true })
  const paths = {
    saved: join(assetRoot, 'saved-old.png'),
    one: join(assetRoot, 'generated-one.png'),
    two: join(assetRoot, 'generated-two.png'),
    canonical: join(assetRoot, 'hero.png'),
    metadata: join(root, '05. Canvas', 'assets.json'),
    external: join(root, '..', `external-${Date.now()}.png`),
  }
  await mkdir(join(root, '05. Canvas'), { recursive: true })
  await Promise.all([
    writeFile(paths.saved, 'OLD'), writeFile(paths.one, 'ONE'), writeFile(paths.two, 'TWO'),
    writeFile(paths.metadata, JSON.stringify({ assets: [{ id: 'saved', path: paths.saved }] })),
    writeFile(paths.external, 'EXTERNAL'),
  ])
  roots.push(paths.external)
  const request: SemanticAssetSaveRequest = {
    transactionId: 'tx-1', intent: { mode: 'replace-existing', targetAssetId: 'saved', token: 'edit-token' }, managedRoot: root, assetRoot, assetId: 'character:hero',
    selected: { id: 'one', path: paths.one }, priorSaved: { id: 'saved', path: paths.saved },
    generated: [{ id: 'one', path: paths.one }, { id: 'two', path: paths.two }],
    externalReferencePaths: [paths.external], canonicalPath: paths.canonical, metadataPath: paths.metadata,
    nextMetadata: { assets: [{ id: 'one', path: paths.canonical, canonical: true }] },
  }
  return { root, paths, request }
}

async function exists(path: string) { try { await stat(path); return true } catch { return false } }
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('journaled semantic asset save transaction', () => {
  it('commits exactly the selected canonical asset and deletes exact prior/unselected managed files while preserving external references', async () => {
    const { root, paths, request } = await fixture()
    const result = await commitSemanticAssetSave(request)
    expect(result).toEqual({ assetId: 'character:hero', selectedResultId: 'one', canonicalPath: paths.canonical, deletedIds: ['saved', 'two'] })
    expect(await readFile(paths.canonical, 'utf8')).toBe('ONE')
    expect(await exists(paths.saved)).toBe(false)
    expect(await exists(paths.one)).toBe(false)
    expect(await exists(paths.two)).toBe(false)
    expect(await readFile(paths.external, 'utf8')).toBe('EXTERNAL')
    expect(JSON.parse(await readFile(paths.metadata, 'utf8'))).toEqual(request.nextMetadata)
    expect(await exists(join(root, '05. Canvas', '.prism-semantic-save'))).toBe(false)
  })

  it('create-new copies a selected managed reference to a new canonical identity without deleting or quarantining the source', async () => {
    const { root, paths, request } = await fixture()
    const createCanonical = join(root, '01. Characters', 'hero-2', 'hero.png')
    const createRequest = {
      ...request,
      transactionId: 'tx-create-reference',
      intent: { mode: 'create-new' as const },
      assetRoot: root,
      assetId: 'new-character-id',
      selected: { id: 'selected-copy', path: paths.saved },
      generated: [{ id: 'selected-copy', path: paths.saved }],
      priorSaved: undefined,
      referenceSourcePaths: [paths.saved],
      canonicalPath: createCanonical,
      nextMetadata: { assets: [{ id: 'saved', path: paths.saved }, { id: 'new-character-id', path: createCanonical }] },
    }
    const result = await commitSemanticAssetSave(createRequest)
    expect(result).toMatchObject({ assetId: 'new-character-id', canonicalPath: createCanonical, deletedIds: [] })
    expect(await readFile(paths.saved, 'utf8')).toBe('OLD')
    expect(await readFile(createCanonical, 'utf8')).toBe('OLD')
    expect(await readFile(paths.metadata, 'utf8')).toContain('new-character-id')
    expect(await exists(join(root, '05. Canvas', '.prism-semantic-save'))).toBe(false)
  })

  it('create-new can copy an external protected reference without enrolling it in managed cleanup', async () => {
    const { root, paths, request } = await fixture()
    const canonical = join(root, '01. Characters', 'external-copy', 'external-copy.png')
    const result = await commitSemanticAssetSave({
      ...request,
      transactionId: 'tx-create-external',
      intent: { mode: 'create-new' },
      assetRoot: root,
      assetId: 'external-copy-id',
      selected: { id: 'external-selected', path: paths.external },
      generated: [{ id: 'external-selected', path: paths.external }],
      priorSaved: undefined,
      referenceSourcePaths: [paths.external],
      canonicalPath: canonical,
      nextMetadata: { assets: [{ id: 'external-copy-id', path: canonical }] },
    })
    expect(result.deletedIds).toEqual([])
    expect(await readFile(paths.external, 'utf8')).toBe('EXTERNAL')
    expect(await readFile(canonical, 'utf8')).toBe('EXTERNAL')
  })

  it('restores every file and byte-exact metadata when an atomic metadata boundary fails', async () => {
    const { paths, request } = await fixture()
    const before = await readFile(paths.metadata)
    await expect(commitSemanticAssetSave(request, { failAt: 'metadata-promote' })).rejects.toThrow('Injected semantic save failure at metadata-promote')
    expect(await readFile(paths.saved, 'utf8')).toBe('OLD')
    expect(await readFile(paths.one, 'utf8')).toBe('ONE')
    expect(await readFile(paths.two, 'utf8')).toBe('TWO')
    expect(await readFile(paths.metadata)).toEqual(before)
    expect(await exists(paths.canonical)).toBe(false)
  })

  it('rejects traversal, cross-asset deletion, inactive generated references, and external deletion scope before journaling', async () => {
    const { root, paths, request } = await fixture()
    await expect(commitSemanticAssetSave({ ...request, canonicalPath: join(root, '..', 'escape.png') })).rejects.toThrow('outside the managed root')
    await expect(commitSemanticAssetSave({ ...request, generated: [...request.generated, { id: 'foreign', path: join(root, '02. Elements', 'foreign.png') }] })).rejects.toThrow('outside this semantic asset')
    await expect(commitSemanticAssetSave({ ...request, selected: { id: 'inactive', path: paths.one } })).rejects.toThrow('not an active generated reference')
    await expect(commitSemanticAssetSave({ ...request, generated: [...request.generated, { id: 'external', path: paths.external }] })).rejects.toThrow('outside the managed root')
    expect((await readdir(join(root, '05. Canvas'))).filter((name) => name.includes('semantic'))).toEqual([])
  })

  it.each(['stage-copy', 'quarantine', 'promote', 'verification', 'physical-cleanup'] as const)('restores all state at the %s failure boundary', async (failAt) => {
    const { root, paths, request } = await fixture()
    await expect(commitSemanticAssetSave(request, { failAt })).rejects.toThrow('semantic save failure')
    expect(await readFile(paths.saved, 'utf8')).toBe('OLD')
    expect(await readFile(paths.one, 'utf8')).toBe('ONE')
    expect(await readFile(paths.two, 'utf8')).toBe('TWO')
    expect(await exists(paths.canonical)).toBe(false)
    expect(await exists(join(root, '05. Canvas', '.prism-semantic-save'))).toBe(false)
  })

  it('rolls back each metadata document when a later metadata write fails', async () => {
    const { root, paths, request } = await fixture()
    const workflowPath = join(root, '05. Canvas', 'workflow.json')
    await writeFile(workflowPath, JSON.stringify({ nodes: ['before'] }))
    const assetsBefore = await readFile(paths.metadata)
    const workflowBefore = await readFile(workflowPath)
    const multi = { ...request, metadataPath: undefined, nextMetadata: undefined, metadataWrites: [{ path: paths.metadata, value: { assets: ['after'] } }, { path: workflowPath, value: { nodes: ['after'] } }] }
    await expect(commitSemanticAssetSave(multi, { failAt: 'metadata-write-1' })).rejects.toThrow('metadata-write-1')
    expect(await readFile(paths.metadata)).toEqual(assetsBefore)
    expect(await readFile(workflowPath)).toEqual(workflowBefore)
  })

  it.each(['crash-before-promote', 'crash-after-promote', 'crash-after-verified'] as const)('recovers deterministically after %s', async (failAt) => {
    const { root, paths, request } = await fixture()
    await expect(commitSemanticAssetSave(request, { failAt })).rejects.toThrow('Simulated crash')
    expect(await recoverSemanticAssetTransactions(root)).toEqual([{ transactionId: 'tx-1', outcome: 'rolled-back' }])
    expect(await readFile(paths.saved, 'utf8')).toBe('OLD')
    expect(await readFile(paths.one, 'utf8')).toBe('ONE')
    expect(await readFile(paths.two, 'utf8')).toBe('TWO')
    expect(await exists(paths.canonical)).toBe(false)
  })

  it('surfaces rollback cleanup failure but leaves deterministic recovery material that recovery removes', async () => {
    const { root, paths, request } = await fixture()
    await expect(commitSemanticAssetSave(request, { failAt: 'rollback-cleanup' })).rejects.toThrow('rollback-cleanup')
    expect(await readFile(paths.saved, 'utf8')).toBe('OLD')
    expect(await recoverSemanticAssetTransactions(root)).toEqual([{ transactionId: 'tx-1', outcome: 'rolled-back' }])
    expect(await exists(join(root, '05. Canvas', '.prism-semantic-save'))).toBe(false)
  })

  it('rejects Create recovery journals that attempt to quarantine a protected reference source', async () => {
    const { root, paths } = await fixture()
    const transactionId = 'tx-protected-source'
    const transactionRoot = join(root, '05. Canvas', '.prism-semantic-save', transactionId)
    const quarantineRoot = join(transactionRoot, 'quarantine')
    const quarantinedPath = join(quarantineRoot, '0-hero.png')
    await mkdir(quarantineRoot, { recursive: true })
    await writeFile(quarantinedPath, 'EVIL')
    await writeFile(join(transactionRoot, 'journal.json'), JSON.stringify({
      version: 2, transactionId, phase: 'quarantined', transactionRoot,
      stagedCanonical: join(transactionRoot, 'selected.stage'), metadataBackups: [],
      quarantined: [{ originalPath: paths.saved, quarantinedPath }],
      request: { transactionId, intent: { mode: 'create-new' }, managedRoot: root, assetRoot: root, assetId: 'new-character', selected: { id: 'source', path: paths.saved }, generated: [{ id: 'source', path: paths.saved }], externalReferencePaths: [], referenceSourcePaths: [paths.saved], canonicalPath: join(root, '01. Characters', 'hero-2', 'hero.png'), metadataWrites: [] },
    }))
    await expect(recoverSemanticAssetTransactions(root)).rejects.toThrow('Invalid semantic asset recovery journal')
    expect(await readFile(paths.saved, 'utf8')).toBe('OLD')
  })

  it('rejects a recovery journal that widens cleanup outside its immutable transaction directory', async () => {
    const { root } = await fixture()
    const externalRoot = await mkdtemp(join(tmpdir(), 'prism-semantic-recovery-sentinel-')); roots.push(externalRoot)
    const sentinel = join(externalRoot, 'keep.txt'); await writeFile(sentinel, 'KEEP')
    const transactionId = 'tx-evil'
    const transactionRoot = join(root, '05. Canvas', '.prism-semantic-save', transactionId)
    await mkdir(transactionRoot, { recursive: true })
    await writeFile(join(transactionRoot, 'journal.json'), JSON.stringify({
      version: 2, transactionId, phase: 'committed', transactionRoot: externalRoot,
      stagedCanonical: join(externalRoot, 'selected.stage'), metadataBackups: [], quarantined: [],
      request: { transactionId, intent: { mode: 'create-new' }, managedRoot: root, assetRoot: root, assetId: 'character:hero', selected: { id: 'one', path: join(root, 'one.png') }, generated: [], externalReferencePaths: [], canonicalPath: join(root, 'hero.png'), metadataWrites: [] },
    }))
    await expect(recoverSemanticAssetTransactions(root)).rejects.toThrow('Invalid semantic asset recovery journal')
    expect(await readFile(sentinel, 'utf8')).toBe('KEEP')
  })

  it('deterministically rolls back an interrupted immutable journal and removes all rollback material', async () => {
    const { root, paths, request } = await fixture()
    await expect(commitSemanticAssetSave(request, { failAt: 'crash-after-promote', simulateCrash: true })).rejects.toThrow('Simulated crash')
    expect(await exists(paths.canonical)).toBe(true)
    const recovered = await recoverSemanticAssetTransactions(root)
    expect(recovered).toEqual([{ transactionId: 'tx-1', outcome: 'rolled-back' }])
    expect(await readFile(paths.saved, 'utf8')).toBe('OLD')
    expect(await readFile(paths.one, 'utf8')).toBe('ONE')
    expect(await readFile(paths.two, 'utf8')).toBe('TWO')
    expect(await exists(paths.canonical)).toBe(false)
    expect(await exists(join(root, '05. Canvas', '.prism-semantic-save'))).toBe(false)
  })
})
