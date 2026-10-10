import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServiceProfileStore } from './serviceProfileStore'
import { ProviderRequestState } from './providerRequestState'
import { ProjectCommandBusyError, ProjectCommandQueue } from './projectCommandQueue'
import { generationServiceProvider } from '../shared/generationServiceProvider'
import { filterProviderModelGroups, SERVICE_PROVIDER_IDS } from '../shared/providerAvailability'
import type { ServiceProvider } from '../shared/types'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'prism-connection-retirement-'))
  roots.push(root)
  let id = 0
  const decrypt = vi.fn((value: Buffer) => value.toString().replace(/^fixture:/, ''))
  const store = new ServiceProfileStore({ dataRoot: root, encryptString: value => Buffer.from(`fixture:${value}`), decryptString: decrypt, createId: () => `fixture-${++id}`, now: () => '2026-10-10T00:00:00Z' })
  return { root, store, decrypt }
}

const mainText = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8')
const mainAst = ts.createSourceFile('index.ts', mainText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const handlers = new Map<string, string>()
function inspect(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(mainAst) === 'ipcMain.handle' && ts.isStringLiteral(node.arguments[0])) handlers.set(node.arguments[0].text, node.arguments[1].getText(mainAst))
  ts.forEachChild(node, inspect)
}
inspect(mainAst)
const functions = ['activateProviderRequestProject', 'withProviderRequest', 'serviceConnected', 'loadServiceCredential'].map(name => {
  const declaration = mainAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  if (!declaration) throw new Error(`Missing production owner ${name}`)
  return declaration.getText(mainAst)
}).join('\n')

function productionBoundary(store: ServiceProfileStore) {
  const runtime = new ProviderRequestState()
  const calls = { provider: vi.fn(), obsolete: vi.fn(() => { throw new Error('Retired preferences must not be consulted') }), completed: vi.fn() }
  const context: Record<string, unknown> = {
    DOMException, Promise,
    SERVICE_PROVIDERS: SERVICE_PROVIDER_IDS,
    currentProject: { id: 'fixture-project', rootPath: '/fictional/project', serviceProfileOverrides: undefined },
    currentProjectOwner: () => 'fictional-project-owner',
    runtimeServiceFailures: runtime,
    projectProfileRecovery: { assertReady: vi.fn() }, projectCommands: new ProjectCommandQueue(),
    serviceProfileStore: () => store,
    providerPreferenceStore: () => ({ assertEnabled: calls.obsolete }),
    isAssistantProvider: (provider: string) => ['openai', 'anthropic', 'google', 'deepseek', 'moonshot', 'omniroute'].includes(provider),
    generationServiceProvider,
    assertGenerationRequirements: vi.fn(), assertVideoProviderPromptPreflight: vi.fn(),
    higgsfieldJobActions: { assertIdle: vi.fn() }, higgsfieldJobScope: (value: unknown) => value,
    generationLifecycle: { begin: () => ({ identity: {}, controller: new AbortController() }), assertActive: vi.fn(), complete: calls.completed },
    generationContext: { run: (_identity: unknown, work: () => unknown) => work() },
    readJson: async () => [], historyPath: () => '/fictional/history', atomicJson: vi.fn(),
  }
  const compile = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  runInNewContext(compile(functions), context)
  const loadCredential = context.loadServiceCredential as (provider: ServiceProvider) => Promise<string>
  context.rewriteWithAssistant = async (provider: ServiceProvider, text: unknown, instruction: unknown, model: unknown) => {
    await loadCredential(provider)
    calls.provider(provider, text, instruction, model)
    return 'fictional rewritten text'
  }
  context.runGeneration = async (request: Parameters<typeof generationServiceProvider>[0]) => {
    const provider = generationServiceProvider(request)
    await loadCredential(provider)
    calls.provider(provider, request)
    return { outputPath: '/fictional/output' }
  }
  for (const [channel, code] of handlers) {
    if (['services:list', 'assistant:rewrite', 'generation:run'].includes(channel)) context[channel] = runInNewContext(compile(`(${code})`), context)
  }
  return {
    calls, runtime, context,
    services: context['services:list'] as () => Promise<Array<{ id: ServiceProvider; connected: boolean }>>,
    rewrite: context['assistant:rewrite'] as (_event: unknown, provider: ServiceProvider, text: string, instruction: string, model: string) => Promise<string>,
    generate: context['generation:run'] as (_event: unknown, request: Record<string, unknown>) => Promise<unknown>,
  }
}

describe('connection-only availability after retiring preferences', () => {
  it.each(SERVICE_PROVIDER_IDS)('%s ignores obsolete disabled flags across disconnect, reconnect and sign-out', async provider => {
    const { root, store, decrypt } = await fixture()
    await store.addProfile(provider, 'FICTIONAL-QA-CREDENTIAL-ONLY-1234567890')
    const settings = JSON.stringify({ schemaVersion: 1, disabledProviders: SERVICE_PROVIDER_IDS })
    await writeFile(join(root, 'provider-settings.json'), settings)
    const groups = [{ label: provider, service: provider, options: [{ value: `${provider}::fictional-model` }] }]
    const visible = async () => filterProviderModelGroups(groups, { [provider]: await store.isConnectedForProject(provider) })
    expect(await visible()).toHaveLength(1)
    expect(decrypt).not.toHaveBeenCalled()
    await store.transitionProfile('fixture-1', 'disconnect')
    expect(await visible()).toEqual([])
    await expect(store.loadCredentialForProject(provider)).rejects.toThrow('disconnected')
    expect(await readFile(join(root, 'service-profiles', provider, 'fixture-1.enc'), 'utf8')).toContain('fixture:')
    await store.transitionProfile('fixture-1', 'reconnect')
    expect(await visible()).toHaveLength(1)
    await store.transitionProfile('fixture-1', 'sign-out')
    expect(await visible()).toEqual([])
    await expect(store.loadCredentialForProject(provider)).rejects.toThrow('signed out')
    await expect(readFile(join(root, 'service-profiles', provider, 'fixture-1.enc'))).rejects.toThrow()
    expect(await readFile(join(root, 'provider-settings.json'), 'utf8')).toBe(settings)
  })
  it('actual request callbacks ignore corrupt obsolete settings and preserve serving-service routing', async () => {
    const { root, store } = await fixture()
    await store.addProfile('fal', 'FICTIONAL-QA-FAL-CREDENTIAL-1234567890')
    await store.addProfile('anthropic', 'FICTIONAL-QA-CLAUDE-CREDENTIAL-1234567890')
    await writeFile(join(root, 'provider-settings.json'), 'corrupt obsolete settings')
    const boundary = productionBoundary(store)
    await expect(boundary.rewrite(null, 'anthropic', 'Exact authored text', 'Exact instruction', 'exact-model')).resolves.toBe('fictional rewritten text')
    await boundary.generate(null, { nodeId: 'audio', kind: 'voiceover', voiceEngine: 'elevenlabs' })
    expect(boundary.calls.provider.mock.calls.map(call => call[0])).toEqual(['anthropic', 'fal'])
    expect(boundary.calls.provider.mock.calls[0].slice(1)).toEqual(['Exact authored text', 'Exact instruction', 'exact-model'])
    expect(boundary.calls.obsolete).not.toHaveBeenCalled()
    expect(await readFile(join(root, 'provider-settings.json'), 'utf8')).toBe('corrupt obsolete settings')
  })
  it('rejects an explicitly disconnected account instead of using another connected account', async () => {
    const { store } = await fixture()
    await store.addProfile('anthropic', 'FICTIONAL-QA-DEFAULT-ACCOUNT-1234567890')
    await store.addProfile('anthropic', 'FICTIONAL-QA-PROJECT-ACCOUNT-1234567890')
    await store.transitionProfile('fixture-2', 'disconnect')
    const boundary = productionBoundary(store)
    boundary.context.currentProject = { serviceProfileOverrides: { anthropic: 'fixture-2' } }
    await expect(boundary.rewrite(null, 'anthropic', 'Text', 'Instruction', 'model')).rejects.toThrow('disconnected')
    expect(boundary.calls.provider).not.toHaveBeenCalled()
    expect(await store.isConnectedForProject('anthropic')).toBe(true)
    expect(await store.isConnectedForProject('anthropic', { anthropic: 'fixture-2' })).toBe(false)
  })
  it('rejects direct media generation after Sign Out and does not use a connected fal account', async () => {
    const { store } = await fixture()
    await store.addProfile('fal', 'FICTIONAL-QA-FAL-ACCOUNT-1234567890')
    await store.addProfile('elevenlabs', 'FICTIONAL-QA-ELEVEN-ACCOUNT-1234567890')
    await store.transitionProfile('fixture-2', 'sign-out')
    const boundary = productionBoundary(store)
    await expect(boundary.generate(null, { nodeId: 'audio', kind: 'voiceover', voiceEngine: 'elevenlabs-direct' })).rejects.toThrow('signed out')
    expect(boundary.calls.provider).not.toHaveBeenCalled()
    expect(boundary.calls.completed).toHaveBeenCalledOnce()
  })
  it('retains busy-project and recovery gates before any credential or fake provider work', async () => {
    const { store, decrypt } = await fixture()
    await store.addProfile('anthropic', 'FICTIONAL-QA-CLAUDE-CREDENTIAL-1234567890')
    const boundary = productionBoundary(store)
    let release!: () => void
    const pending = (boundary.context.projectCommands as ProjectCommandQueue).run(() => new Promise<void>(yes => { release = yes }))
    await expect(boundary.rewrite(null, 'anthropic', 'Text', 'Instruction', 'model')).rejects.toThrow('project is being saved or opened')
    release(); await pending
    ;(boundary.context.projectProfileRecovery as { assertReady: () => void }).assertReady = () => { throw new Error('Fictional recovery unresolved') }
    await expect(boundary.rewrite(null, 'anthropic', 'Text', 'Instruction', 'model')).rejects.toThrow('recovery unresolved')
    expect(decrypt).not.toHaveBeenCalled()
    expect(boundary.calls.provider).not.toHaveBeenCalled()
  })
  it('fails readiness when the selected credential is missing, despite a connected registry row', async () => {
    const { root, store, decrypt } = await fixture()
    await store.addProfile('anthropic', 'FICTIONAL-QA-CLAUDE-CREDENTIAL-1234567890')
    await unlink(join(root, 'service-profiles', 'anthropic', 'fixture-1.enc'))
    expect((await store.listProfiles('anthropic', false)).profiles[0].status).toBe('connected')
    expect(await store.isConnectedForProject('anthropic')).toBe(false)
    const connections = await productionBoundary(store).services()
    expect(connections.find(connection => connection.id === 'anthropic')?.connected).toBe(false)
    await expect(productionBoundary(store).rewrite(null, 'anthropic', 'Text', 'Instruction', 'model')).rejects.toThrow('Sign in')
    expect(decrypt).not.toHaveBeenCalled()
  })
  it('removes retired mutation/read capabilities while keeping normal account operations', () => {
    expect(handlers.has('services:preferences')).toBe(false)
    expect(handlers.has('services:set-enabled')).toBe(false)
    for (const channel of ['services:profiles', 'services:add-profile', 'services:transition-profile', 'services:set-default-profile', 'services:select-project-profile']) expect(handlers.has(channel)).toBe(true)
  })

  it('actual service enumeration waits for an account change while project hydration succeeds', async () => {
    const { store } = await fixture()
    await store.addProfile('fal', 'FICTIONAL-FAL-ACCOUNT-1234567890')
    const boundary = productionBoundary(store)
    let release!: () => void
    const changing = boundary.runtime.change('fal', async () => {
      await new Promise<void>(resolve => { release = resolve })
      await store.transitionProfile('fixture-1', 'disconnect')
    })
    const { loadProjectActivationState } = await import('../renderer/src/projectActivationState')
    const activation = loadProjectActivationState({ isCurrent: () => true, loadWorkflow: async () => null, readEntries: async () => [], readAssets: async () => [], readLegacyStatus: async () => ({}), readConnections: boundary.services })
    await Promise.resolve(); await Promise.resolve()
    release(); await changing
    expect((await activation)?.connections.find(connection => connection.id === 'fal')?.connected).toBe(false)
    expect(boundary.calls.provider).not.toHaveBeenCalled()
  })

  it('retries a short project command that finishes while a profile-wait busy abort propagates', async () => {
    const { store } = await fixture(), boundary = productionBoundary(store)
    await store.addProfile('fal', 'FICTIONAL-FAL-ACCOUNT-1234567890')
    let releaseProfile!: () => void, releaseWrite!: () => void
    const changing = boundary.runtime.change('fal', () => new Promise<void>(resolve => { releaseProfile = resolve }))
    const queue = boundary.context.projectCommands as ProjectCommandQueue
    let write: Promise<void> = Promise.resolve(), busyAborts = 0
    const readWhenIdle = boundary.runtime.readWhenIdle.bind(boundary.runtime)
    boundary.runtime.readWhenIdle = (provider, read) => readWhenIdle(provider, read).catch(async error => {
      if (error instanceof ProjectCommandBusyError) { busyAborts++; releaseWrite(); await write }
      throw error
    })
    const status = boundary.services()
    await Promise.resolve(); await Promise.resolve()
    write = queue.run(() => new Promise<void>(resolve => { releaseWrite = resolve }))
    await Promise.resolve(); await Promise.resolve(); releaseProfile(); await changing
    expect((await status).find(connection => connection.id === 'fal')?.connected).toBe(true)
    expect(busyAborts).toBeGreaterThan(0); expect(queue.busy).toBe(false)
  })
})
