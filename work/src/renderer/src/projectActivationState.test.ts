import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, it, expect, vi } from 'vitest'
import { ProjectCommandQueue } from '../../main/projectCommandQueue'
import { ProviderRequestState } from '../../main/providerRequestState'
import { loadOwnedWorkflow } from '../../main/workflowPersistence'
import { workflowSaveOwner, workflowSaveOwnerKey } from '../../shared/workflowSaveOwnership'
import { loadProjectActivationState } from './projectActivationState'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}

/** Exercise the actual main guard and IPC callback, not an always-successful services fake. */
function serviceHandler(queue: ProjectCommandQueue) {
  const source = ts.createSourceFile('index.ts', readFileSync(new URL('../../main/index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
  const guard = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'withProviderRequest')
  let callback: ts.Expression | undefined, providers: ts.VariableDeclaration | undefined
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'ipcMain.handle' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'services:list') callback = node.arguments[1]
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'SERVICE_PROVIDERS') providers = node
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!guard || !callback || !providers) throw Error('Actual guarded service enumeration is required')
  const code = ts.transpileModule(`${guard.getText(source)}\nconst ${providers.getText(source)};\nreturn ${callback.getText(source)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const connected = vi.fn(async () => false)
  const handler = new Function('projectProfileRecovery', 'projectCommands', 'activateProviderRequestProject', 'runtimeServiceFailures', 'currentProject', 'serviceConnected', 'currentProjectOwner', code)(
    { assertReady() {} }, queue, () => {}, new ProviderRequestState(), { serviceProfileOverrides: {} }, connected, () => 'fictional-owner',
  ) as () => Promise<Array<{ id: string; connected: boolean }>>
  return { handler, connected }
}

function fixture() {
  const queue = new ProjectCommandQueue(), services = serviceHandler(queue)
  const project = { schemaVersion: 1 as const, id: 'fixture-project', name: 'Fixture', rootPath: '/fictional/project', documentPath: '/fictional/project/Custom.prismflow', createdAt: 'fictional', updatedAt: 'fictional' }
  const owner = workflowSaveOwner(project), pending = deferred<null>(), started = deferred<void>()
  let activation = 1
  const load = vi.fn(() => loadOwnedWorkflow(owner, {
    currentOwner: () => owner,
    runForOwner: (key, action) => queue.runForOwner(key, () => workflowSaveOwnerKey(owner), action),
    load: async () => { started.resolve(); return pending.promise },
  }))
  const entries = vi.fn(async () => { expect(queue.busy).toBe(false); return ['history'] })
  const assets = vi.fn(async () => { expect(queue.busy).toBe(false); return ['asset'] })
  const legacy = vi.fn(async () => { expect(queue.busy).toBe(false); return { detected: false } })
  const connections = vi.fn(async () => { expect(queue.busy).toBe(false); return services.handler() })
  const readers = { isCurrent: () => activation === 1, loadWorkflow: load, readEntries: entries, readAssets: assets, readLegacyStatus: legacy, readConnections: connections }
  return { queue, services, pending, started, load, entries, assets, legacy, connections, readers, supersede: () => { activation += 1 } }
}

describe('project activation queue and provider ownership', () => {
  it.each([true, false])('actual recent-project callback applies only its current activation: %s', current => {
    const source = ts.createSourceFile('AppNext.tsx', readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
    let callback: ts.Expression | undefined
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'window.prism.projects.recent().then') callback = node.arguments[0]
      ts.forEachChild(node, visit)
    }
    visit(source)
    if (!callback) throw Error('Actual activation recent-project callback required')
    const code = ts.transpileModule('return ' + callback.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    const setRecentProjects = vi.fn(), apply = new Function('projectActivation', 'activation', 'setRecentProjects', code)({ current: current ? 1 : 2 }, 1, setRecentProjects)
    apply(['fictional-recent'])
    expect(setRecentProjects.mock.calls).toEqual(current ? [[['fictional-recent']]] : [])
  })

  it('waits for the actual workflow queue before service enumeration and then hydrates', async () => {
    const f = fixture(), hydrated = loadProjectActivationState(f.readers)
    await f.started.promise
    expect(f.queue.busy).toBe(true)
    const status = f.services.handler()
    await Promise.resolve()
    expect(f.services.connected).not.toHaveBeenCalled()
    for (const read of [f.entries, f.assets, f.legacy, f.connections]) expect(read).not.toHaveBeenCalled()
    f.pending.resolve(null)
    expect((await status).length).toBeGreaterThan(0)
    expect(await hydrated).toMatchObject({ stored: null, entries: ['history'], assetStatus: ['asset'], legacyStatus: { detected: false } })
    expect(f.queue.busy).toBe(false)
    expect(f.connections).toHaveBeenCalledOnce()
    expect(f.services.connected.mock.calls.length).toBeGreaterThan(0)
  })
  it('does not start readers after a superseded invocation of the same project finishes loading', async () => {
    const f = fixture(), hydrated = loadProjectActivationState(f.readers)
    await f.started.promise; f.supersede(); f.pending.resolve(null)
    expect(await hydrated).toBeNull()
    for (const read of [f.entries, f.assets, f.legacy, f.connections]) expect(read).not.toHaveBeenCalled()
  })
  it('discards a result superseded during auxiliary reads', async () => {
    const f = fixture(), pending = deferred<string[]>(), started = deferred<void>()
    f.entries.mockImplementation(async () => { started.resolve(); return pending.promise })
    const hydrated = loadProjectActivationState(f.readers)
    f.pending.resolve(null); await started.promise; f.supersede(); pending.resolve(['late'])
    expect(await hydrated).toBeNull()
  })
  it('does not start even the load for an already stale activation', async () => {
    const f = fixture(); f.supersede()
    expect(await loadProjectActivationState(f.readers)).toBeNull()
    expect(f.load).not.toHaveBeenCalled()
  })
  it('propagates a failed workflow load without starting any provider or auxiliary reads', async () => {
    const f = fixture(), error = new Error('Corrupt workflow')
    f.load.mockImplementation(async () => { throw error })
    await expect(loadProjectActivationState(f.readers)).rejects.toBe(error)
    for (const read of [f.entries, f.assets, f.legacy, f.connections]) expect(read).not.toHaveBeenCalled()
  })
  it('does not replace a real auxiliary failure with empty service state', async () => {
    const f = fixture(), error = new Error('Profiles unavailable')
    f.connections.mockImplementation(async () => { throw error })
    const hydrated = loadProjectActivationState(f.readers); f.pending.resolve(null)
    await expect(hydrated).rejects.toBe(error)
  })
})
