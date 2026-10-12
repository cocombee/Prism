import { projectFolderPath } from './projectFolders'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { JsonMutationQueue, assertRealpathContained } from './mainSafety'
import { ProjectCommandQueue } from './projectCommandQueue'
import ts from 'typescript'
import { compileBytePlusGenerationRequest } from './byteplusGeneration'
import { projectServiceProfileSelection } from '../shared/serviceProfiles'
import { bytePlusPortraitAssetId, linkBytePlusPortrait, preserveBytePlusPortraitMetadata, resolveBytePlusPortrait, revokeBytePlusPortrait } from './byteplusPortrait'
import type { BytePlusPortraitLinkRequest, ImportedAsset, ServiceProfile } from '../shared/types'

const profile: ServiceProfile = { id: 'fictional-profile-A', provider: 'byteplus', accountIdentifier: 'fictional account A', status: 'connected', createdAt: '', updatedAt: '' }
const bytes = new Uint8Array([1, 2, 3]), now = '2026-10-12T00:00:00.000Z'
const linked = () => linkBytePlusPortrait({ consoleAssetId: 'asset-20261012000000-fictional', consoleActiveConfirmed: true }, profile, 'image/png', bytes, now)
describe('BytePlus console-link source and account ownership', () => {
  it('keeps local linking distinct from provider approval and resolves the unchanged owned file', () => {
    const binding = linked()
    expect(binding).toMatchObject({ state: 'linked', profileId: profile.id, accountIdentifier: profile.accountIdentifier, mediaType: 'image', consoleActiveConfirmed: true })
    expect(binding).not.toHaveProperty('approved')
    expect(binding).not.toHaveProperty('providerVerified')
    expect(resolveBytePlusPortrait(binding, profile, 'image/png', bytes, now)).toBe('asset://asset-20261012000000-fictional')
  })
  it('survives JSON reopen and byte-identical relocation without weakening account ownership', () => {
    const binding = JSON.parse(JSON.stringify(linked()))
    expect(resolveBytePlusPortrait(binding, profile, 'image/png', new Uint8Array(bytes), now)).toContain('asset://')
    expect(() => resolveBytePlusPortrait(binding, { ...profile, id: 'fictional-profile-B' }, 'image/png', bytes, now)).toThrow('different BytePlus account')
    expect(() => resolveBytePlusPortrait(binding, { ...profile, accountIdentifier: 'different account' }, 'image/png', bytes, now)).toThrow('different BytePlus account')
  })
  it('blocks an edited source, revoked link, expired asset and changed media type', () => {
    expect(() => resolveBytePlusPortrait(linked(), profile, 'image/png', new Uint8Array([1, 2, 4]), now)).toThrow('source file changed')
    expect(() => resolveBytePlusPortrait(revokeBytePlusPortrait(linked()), profile, 'image/png', bytes, now)).toThrow('revoked')
    expect(() => resolveBytePlusPortrait({ ...linked(), expiresAt: now }, profile, 'image/png', bytes, now)).toThrow('expired')
    expect(() => resolveBytePlusPortrait(linked(), profile, 'video/mp4', bytes, now)).toThrow('media type changed')
  })
  it('preserves a known future expiry but does not invent one for an unknown validity period', () => {
    expect(linked()).not.toHaveProperty('expiresAt')
    const binding = linkBytePlusPortrait({ consoleAssetId: 'asset-fixture', consoleActiveConfirmed: true, expiresAt: '2026-10-13T00:00:00Z' }, profile, 'video/mp4', bytes, now)
    expect(binding.expiresAt).toBe('2026-10-13T00:00:00.000Z')
    expect(resolveBytePlusPortrait(binding, profile, 'video/mp4', bytes, now)).toBe('asset://asset-fixture')
  })
  it.each(['https://example.com/asset', 'asset://asset-fixture?key=secret', 'asset://asset-fixture#fragment', '../asset', 'asset://', 'asset://asset/other', 'x'.repeat(129)])('rejects unsafe or ambiguous IDs: %s', id => {
    expect(() => bytePlusPortraitAssetId(id)).toThrow('Asset ID')
  })
  it('requires a connected BytePlus account, Active confirmation and actual image/video bytes', () => {
    expect(() => linkBytePlusPortrait({ consoleAssetId: 'asset-fixture', consoleActiveConfirmed: false }, profile, 'image/png', bytes, now)).toThrow('confirm')
    expect(() => resolveBytePlusPortrait(linked(), { ...profile, status: 'disconnected' }, 'image/png', bytes, now)).toThrow('connected BytePlus')
    expect(() => resolveBytePlusPortrait(linked(), { ...profile, provider: 'fal' }, 'image/png', bytes, now)).toThrow('connected BytePlus')
    expect(() => linkBytePlusPortrait({ consoleAssetId: 'asset-fixture', consoleActiveConfirmed: true }, profile, 'audio/wav', bytes, now)).toThrow('Image or Video')
    expect(() => linkBytePlusPortrait({ consoleAssetId: 'asset-fixture', consoleActiveConfirmed: true }, profile, 'image/png', new Uint8Array(), now)).toThrow('empty')
  })
  it.each([{ sourceSha256: 'fake' }, { provider: 'fal' }, { region: 'different' }, { consoleActiveConfirmed: false }, { state: 'Active' }, { linkedAt: 'invalid' }, { expiresAt: 'invalid' }, { linkedAt: '2026-10-13T00:00:00Z' }])('rejects invalid saved binding %j', patch => {
    expect(() => resolveBytePlusPortrait({ ...linked(), ...patch }, profile, 'image/png', bytes, now)).toThrow('BytePlus trusted asset')
  })
  it('ordinary metadata edits retain an existing link and cannot create or alter it', () => {
    const binding = linked(), current = { byteplusPortrait: binding, referenceDescription: 'Old role' }
    expect(preserveBytePlusPortraitMetadata({ referenceDescription: 'New role' }, current)).toEqual({ referenceDescription: 'New role', byteplusPortrait: binding })
    expect(preserveBytePlusPortraitMetadata({ ...current, referenceDescription: 'New role' }, current)?.byteplusPortrait).toBe(binding)
    expect(preserveBytePlusPortraitMetadata({ byteplusPortrait: Object.fromEntries(Object.entries(binding).reverse()) as typeof binding }, current)?.byteplusPortrait).toBe(binding)
    expect(() => preserveBytePlusPortraitMetadata({ byteplusPortrait: binding }, {})).toThrow('dedicated trusted asset action')
    expect(() => preserveBytePlusPortraitMetadata({ byteplusPortrait: { ...binding, assetId: 'other' } }, current)).toThrow('dedicated trusted asset action')
  })
})

/** Execute the actual main resolver with isolated owner/storage dependencies. */
function mainResolver(options: { binding?: unknown; selected?: ServiceProfile; editedBytes?: Uint8Array; duplicate?: boolean; trashed?: boolean } = {}) {
  const source = ts.createSourceFile('index.ts', readFileSync(new URL('index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'bytePlusMediaUrl')!
  const body = ts.transpileModule(declaration.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const selected = options.selected || profile
  const asset = { id: 'fictional-asset', path: '/fixture/portrait.png', mimeType: 'image/png', metadata: { byteplusPortrait: options.binding === undefined ? linked() : options.binding }, ...(options.trashed ? { trashedAt: now } : {}) }
  const rawFallback = vi.fn((path: string) => path), readFile = vi.fn(async () => options.editedBytes || bytes), assertCurrent = vi.fn()
  const bindings = {
    managedAssetStores: async () => ({ project: options.duplicate ? [asset, { ...asset, id: 'duplicate' }] : [asset], styles: [] }), resolve,
    serviceProfileStore: () => ({ listProfiles: async () => ({ schemaVersion: 1, profiles: [selected], defaults: { byteplus: selected.id } }) }),
    runtimeServiceFailures: { assertCurrent, overrides: () => undefined }, currentProject: null, projectServiceProfileSelection,
    assertManagedAssetPath: async () => asset.path, readFile, resolveBytePlusPortrait: (...args: Parameters<typeof resolveBytePlusPortrait>) => resolveBytePlusPortrait(...args.slice(0, 4) as [unknown, ServiceProfile, string, Uint8Array], now),
    assertInsideProject: rawFallback, mimeFor: () => 'image/png',
  }
  const run = new Function(...Object.keys(bindings), body + '\nreturn bytePlusMediaUrl;')(...Object.values(bindings)) as (source: { path?: string; url?: string }) => Promise<string>
  return { run, rawFallback, readFile, assertCurrent }
}

describe('actual BytePlus transport honors managed portrait binding', () => {
  it('uses the managed asset URI before considering an HTTP URL or local-byte fallback', async () => {
    const resolver = mainResolver()
    await expect(resolver.run({ path: '/fixture/portrait.png', url: 'https://example.com/raw-face.png' })).resolves.toBe('asset://asset-20261012000000-fictional')
    expect(resolver.rawFallback).not.toHaveBeenCalled()
    expect(resolver.assertCurrent).toHaveBeenCalledTimes(2)
  })
  it.each([
    { selected: { ...profile, id: 'other-profile' } }, { selected: { ...profile, accountIdentifier: 'other-account' } },
    { binding: { ...linked(), state: 'revoked' } }, { binding: { ...linked(), expiresAt: now } }, { editedBytes: new Uint8Array([9]) },
    { duplicate: true }, { trashed: true },
  ])('blocks binding failure without sending the raw URL or bytes: %j', async options => {
    const resolver = mainResolver(options)
    await expect(resolver.run({ path: '/fixture/portrait.png', url: 'https://example.com/raw-face.png' })).rejects.toThrow('BytePlus trusted asset')
    expect(resolver.rawFallback).not.toHaveBeenCalled()
  })
  it('rejects an arbitrary asset URI without an owned managed source', async () => {
    const resolver = mainResolver()
    await expect(resolver.run({ url: 'asset://unlinked' })).rejects.toThrow('link the console Asset ID')
  })
  it('keeps exact prompt attachment numbering and native 480p Draft values', async () => {
    const resolver = mainResolver()
    const payload = await compileBytePlusGenerationRequest({ nodeId: 'fixture', kind: 'video-generator', videoEngine: 'byteplus/seedance-2.5/reference-to-video', prompt: 'Use @portrait exactly.', providerPromptOverride: 'Use @portrait exactly.', duration: 4, resolution: '1080p', videoDraft: true, references: [{ role: 'reference', path: '/fixture/portrait.png', tag: '@portrait', mediaType: 'image', mediaReferenceMode: 'reference', referenceDescription: '@portrait is the sole supplied identity reference.' }] }, resolver.run)
    expect(payload).toMatchObject({ draft: true, resolution: '480p', duration: 4 })
    expect(payload.content).toEqual([{ type: 'text', text: 'Use [Image1] exactly.' }, { type: 'image_url', image_url: { url: 'asset://asset-20261012000000-fictional' }, role: 'reference_image' }])
    expect(resolver.rawFallback).not.toHaveBeenCalled()
  })
})


const ipcRoots: string[] = []
afterEach(async () => { await Promise.all(ipcRoots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
const mainSource = ts.createSourceFile('index.ts', readFileSync(new URL('index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
function execute<T>(code: string, bindings: Record<string, unknown>): T {
  return new Function(...Object.keys(bindings), ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)(...Object.values(bindings)) as T
}
function declarations(names: string[]): string {
  const found = mainSource.statements.filter(node => ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text))
  expect(found).toHaveLength(names.length)
  return found.map(node => node.getText(mainSource)).join('\n')
}
function ipcHandler<T>(channel: string, bindings: Record<string, unknown>): T {
  let callback: ts.Node | undefined
  function scan(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(mainSource) === 'ipcMain.handle' && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === channel) callback = node.arguments[1]
    ts.forEachChild(node, scan)
  }
  scan(mainSource)
  if (!callback) throw new Error('Missing actual main handler ' + channel)
  return execute<T>('return ' + callback.getText(mainSource), bindings)
}
async function ipcFixture() {
  const root = await mkdtemp(join(tmpdir(), 'prism-portrait-ipc-')); ipcRoots.push(root)
  await mkdir(join(root, '05. Canvas'), { recursive: true })
  const index = join(root, '05. Canvas', 'assets.json'), sourcePath = join(root, 'portrait.png'), portablePath = join(root, 'Project.prismflow')
  await writeFile(sourcePath, bytes)
  const asset: ImportedAsset = { id: 'fictional-portrait', name: 'Portrait.png', path: sourcePath, mimeType: 'image/png', createdAt: now, category: 'character', origin: 'imported', metadata: { referenceDescription: '@portrait is the sole supplied identity reference.', assetName: 'Fictional Portrait' } }
  await writeFile(index, JSON.stringify([asset]))
  const project = { id: 'fictional-project', name: 'Fictional Project', rootPath: root, createdAt: now, updatedAt: now }
  const io = execute<{ atomicJson(path: string, value: unknown): Promise<void>; readStrictJson<T>(path: string, label: string): Promise<T>; readStrictJsonOr<T>(path: string, fallback: T, label: string): Promise<T> }>(declarations(['atomicJson', 'readStrictJson', 'readStrictJsonOr', 'isMissingFileError']) + '\nreturn { atomicJson, readStrictJson, readStrictJsonOr };', { readFile, writeFile, rename, randomUUID })
  const build = execute<(activeProject: typeof project) => Promise<unknown>>(declarations(['buildProjectDocument']) + '\nreturn buildProjectDocument;', { ...io, join, relative, resolve, isAbsolute, projectFolderPath })
  const portableWrite = vi.fn(async () => io.atomicJson(portablePath, await build(project)))
  const mutations = new JsonMutationQueue(), commands = new ProjectCommandQueue()
  const commit = execute<(managed: { asset: ImportedAsset; indexPath: string }, update: (asset: ImportedAsset) => ImportedAsset) => Promise<ImportedAsset>>(declarations(['commitBytePlusPortraitMetadata']) + '\nreturn commitBytePlusPortraitMetadata;', { ...io, assetJsonMutations: mutations, resolve, writeProjectDocument: portableWrite, localAssetUrl: (path: string) => 'fixture:' + path })
  let owner = 'fictional-project-A', selected = profile
  const managed = vi.fn(async (id: string) => {
    const assets = await io.readStrictJson<ImportedAsset[]>(index, 'Fixture index'), current = assets.find(item => item.id === id)
    return current ? { asset: current, indexPath: index, assets } : null
  })
  const sourceRead = vi.fn(async (path: string) => readFile(path))
  const deps = { currentProject: project, currentProjectOwner: () => owner, projectCommands: commands, managedAssetById: managed,
    serviceProfileStore: () => ({ listProfiles: async () => ({ schemaVersion: 1, profiles: [selected], defaults: { byteplus: selected.id } }) }), projectServiceProfileSelection,
    portraitMediaType: (mime: string) => mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : (() => { throw new Error('Image or Video required') })(),
    assertManagedAssetPath: (asset: ImportedAsset) => assertRealpathContained(asset.path, [root]), readFile: sourceRead, linkBytePlusPortrait, revokeBytePlusPortrait, commitBytePlusPortraitMetadata: commit }
  const link = ipcHandler<(event: unknown, request: unknown) => Promise<ImportedAsset>>('assets:link-byteplus-portrait', deps)
  const context = ipcHandler<(event: unknown, id: unknown) => Promise<unknown>>('assets:byteplus-portrait-context', deps)
  const revoke = ipcHandler<(event: unknown, id: unknown) => Promise<ImportedAsset>>('assets:revoke-byteplus-portrait', deps)
  const request: BytePlusPortraitLinkRequest = { assetId: asset.id, profileId: profile.id, consoleAssetId: 'asset-fixture-existing', consoleActiveConfirmed: true }
  return { root, sourcePath, index, portablePath, io, asset, commands, mutations, managed, link, revoke, context, request, portableWrite, sourceRead, setOwner: (value: string) => { owner = value }, setProfile: (value: ServiceProfile) => { selected = value } }
}

describe('actual trusted-asset IPC with owned durable storage', () => {
  it('links only main-derived account/hash and retains Description through canonical and portable reopen', async () => {
    const f = await ipcFixture(), saved = await f.link({}, f.request)
    expect(saved.metadata?.byteplusPortrait).toMatchObject({ profileId: profile.id, accountIdentifier: profile.accountIdentifier, state: 'linked' })
    expect(saved.metadata?.referenceDescription).toBe(f.asset.metadata?.referenceDescription)
    const reopened = await f.io.readStrictJson<ImportedAsset[]>(f.index, 'Reopened index')
    const portable = await f.io.readStrictJson<{ assets: (ImportedAsset & { relativePath?: string })[] }>(f.portablePath, 'Reopened project')
    expect(portable.assets[0].metadata).toEqual(reopened[0].metadata)
    expect(portable.assets[0].relativePath).toBe(basename(f.sourcePath))
    expect(resolveBytePlusPortrait(portable.assets[0].metadata!.byteplusPortrait, profile, 'image/png', await readFile(f.sourcePath))).toBe('asset://asset-fixture-existing')
    expect(await f.context({}, f.asset.id)).toMatchObject({ available: true, profile: { id: profile.id }, binding: { state: 'linked' } })
    const disabled = await f.revoke({}, f.asset.id)
    expect(disabled.metadata?.byteplusPortrait?.state).toBe('revoked')
    expect((await f.io.readStrictJson<{ assets: (ImportedAsset & { relativePath?: string })[] }>(f.portablePath, 'Reopened project')).assets[0].metadata?.byteplusPortrait?.state).toBe('revoked')
  })
  it('rejects a queued obsolete project before reading or changing its asset', async () => {
    const f = await ipcFixture(); let release!: () => void, entered!: () => void
    const gate = new Promise<void>(yes => { release = yes }), started = new Promise<void>(yes => { entered = yes })
    const switching = f.commands.run(async () => { entered(); await gate; f.setOwner('fictional-project-B') })
    await started
    const linking = f.link({}, f.request)
    release(); await switching
    await expect(linking).rejects.toMatchObject({ name: 'AbortError' })
    expect(f.managed).not.toHaveBeenCalled()
    expect(f.portableWrite).not.toHaveBeenCalled()
  })
  it('uses the current selected profile after a queued account switch and rejects an old profile ID', async () => {
    const f = await ipcFixture(); let release!: () => void, entered!: () => void
    const gate = new Promise<void>(yes => { release = yes }), started = new Promise<void>(yes => { entered = yes })
    const switching = f.commands.run(async () => { entered(); await gate; f.setProfile({ ...profile, id: 'fictional-B' }) })
    await started
    const linking = f.link({}, f.request); release(); await switching
    await expect(linking).rejects.toThrow('account changed')
    expect(f.portableWrite).not.toHaveBeenCalled()
  })
  it('rechecks a global account switch that happens while reading the source bytes', async () => {
    const f = await ipcFixture(); let release!: () => void, entered!: () => void
    const gate = new Promise<void>(yes => { release = yes }), started = new Promise<void>(yes => { entered = yes })
    f.sourceRead.mockImplementationOnce(async path => { entered(); await gate; return readFile(path) })
    const linking = f.link({}, f.request)
    await started; f.setProfile({ ...profile, id: 'fictional-B' }); release()
    await expect(linking).rejects.toThrow('account changed while the source was read')
    expect(f.portableWrite).not.toHaveBeenCalled()
    expect((await f.io.readStrictJson<ImportedAsset[]>(f.index, 'Unchanged index'))[0].metadata?.byteplusPortrait).toBeUndefined()
  })
  it('retains a concurrently edited Description when the dedicated link commits', async () => {
    const f = await ipcFixture()
    let release!: () => void, entered!: () => void
    const gate = new Promise<void>(yes => { release = yes }), started = new Promise<void>(yes => { entered = yes })
    f.sourceRead.mockImplementationOnce(async path => { entered(); await gate; return readFile(path) })
    const linking = f.link({}, f.request)
    await started
    await f.mutations.mutateArray<ImportedAsset>(f.index, assets => assets.map(asset => ({ ...asset, metadata: { ...asset.metadata, referenceDescription: 'Latest authored description.' } })))
    release()
    const saved = await linking
    expect(saved.metadata?.referenceDescription).toBe('Latest authored description.')
  })
  it('rolls back the canonical binding if the portable projection cannot be written', async () => {
    const f = await ipcFixture(), before = await readFile(f.index, 'utf8')
    f.portableWrite.mockRejectedValueOnce(new Error('Fictional disk failure'))
    await expect(f.link({}, f.request)).rejects.toThrow('Fictional disk failure')
    expect(JSON.parse(await readFile(f.index, 'utf8'))).toEqual(JSON.parse(before))
    await expect(f.link({}, f.request)).resolves.toMatchObject({ metadata: { byteplusPortrait: { state: 'linked' } } })
  })
  it('rejects unknown authority fields and non-image/video media before a link is saved', async () => {
    const f = await ipcFixture()
    await expect(f.link({}, { ...f.request, approved: true })).rejects.toThrow('Invalid trusted asset link')
    await f.mutations.mutateArray<ImportedAsset>(f.index, assets => assets.map(asset => ({ ...asset, mimeType: 'audio/wav' })))
    await expect(f.link({}, f.request)).rejects.toThrow('Image or Video')
    expect(f.portableWrite).not.toHaveBeenCalled()
  })
  it('does not link a missing source file or an asset in Trash', async () => {
    const f = await ipcFixture()
    await rm(f.sourcePath)
    await expect(f.link({}, f.request)).rejects.toMatchObject({ code: 'ENOENT' })
    await f.mutations.mutateArray<ImportedAsset>(f.index, assets => assets.map(asset => ({ ...asset, trashedAt: now })))
    await expect(f.link({}, f.request)).rejects.toThrow('Trash')
    expect(f.portableWrite).not.toHaveBeenCalled()
  })
  it('ordinary sequence-frame intake cannot manufacture a portrait binding or write a file for it', async () => {
    const write = vi.fn(), register = vi.fn()
    const handler = ipcHandler<(event: unknown, bytes: Uint8Array, mime: string, name: string, metadata: ImportedAsset['metadata']) => Promise<unknown>>('assets:import-buffer', { currentProject: {}, Buffer, preserveBytePlusPortraitMetadata, writeFile: write, registerGeneratedAsset: register })
    await expect(handler({}, bytes, 'image/png', 'frame', { byteplusPortrait: linked() })).rejects.toThrow('dedicated trusted asset action')
    expect(write).not.toHaveBeenCalled(); expect(register).not.toHaveBeenCalled()
  })
})
