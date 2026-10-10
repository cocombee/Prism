import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { createServiceResponseScope } from './serviceResponseScope'
import { createProviderProfileReadiness } from './providerProfileReadiness'

const source = ts.createSourceFile('AppNext.tsx', readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
const names = ['refreshServiceConnections', 'beginServiceBusyOperation', 'restoreServiceConnectionsAfterFailure', 'beginServiceProfileOperation', 'applyServiceProfiles', 'saveService', 'transitionServiceProfileState', 'setDefaultServiceProfileState', 'commitServiceProfileRename', 'selectProjectServiceProfile']
const declarations = new Map<string, string>()
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.set(node.name.getText(source), `const ${node.getText(source)};`)
  ts.forEachChild(node, visit)
}
visit(source)
if (declarations.size !== names.length) throw Error('Actual account action owners are required')
const code = ts.transpileModule([...declarations.values()].join('\n') + `\nreturn {${names.join(',')}}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }

function fixture(overrides: Record<string, any> = {}) {
  const profile = { id: 'selected', provider: 'fal', name: 'Fictional selected account', status: 'connected' }
  const registry = { schemaVersion: 1, profiles: [profile], defaults: { fal: 'selected' } }
  const state: Record<string, any> = { ServiceProfiles: registry, ServiceConnections: { fal: true }, HasCredential: true, HasFishCredential: false, ServiceModels: {}, ServiceAccounts: {}, ServiceError: '', ServiceActionError: '', ServiceBusy: false }
  const context: Record<string, any> = {
    useCallback: (fn: unknown) => fn,
    serviceReadiness: { current: createProviderProfileReadiness() }, serviceBusyOperations: { current: { count: 0 } }, serviceResponseScope: { current: createServiceResponseScope() }, projectActivation: { current: 0 },
    serviceAvailabilityStop: { current: vi.fn() }, emptyServiceStatus: { fal: false, fish: false },
    serviceProfiles: registry, serviceDrafts: { fal: 'FICTIONAL-KEY-ONLY' }, signInProfileId: null, profileNameDraft: 'Renamed',
    window: { prism: { services: {
      list: vi.fn(async () => [{ id: 'fal', connected: false }, { id: 'fish', connected: false }]),
      addProfile: vi.fn(async () => registry), transitionProfile: vi.fn(async () => registry), setDefaultProfile: vi.fn(async () => registry), renameProfile: vi.fn(async () => registry), selectProjectProfile: vi.fn(async () => ({ id: 'A', serviceProfileOverrides: { fal: 'selected' } })),
    } } },
  }
  for (const name of ['ServiceProfiles', 'ServiceConnections', 'HasCredential', 'HasFishCredential', 'ServiceModels', 'ServiceAccounts', 'ServiceError', 'ServiceActionError', 'ServiceBusy', 'ServiceDrafts', 'SignInProfileId', 'ProfileConfirmation', 'RenamingProfileId', 'ProfileNameDraft', 'Project']) {
    context[`set${name}`] = vi.fn((value: any) => { state[name] = typeof value === 'function' ? value(state[name] || {}) : value })
  }
  Object.assign(context, overrides)
  const actions = new Function(...Object.keys(context), code)(...Object.values(context))
  return { state, context, actions, services: context.window.prism.services }
}

describe('actual renderer account actions and main readiness', () => {
  it('rejects an existing account from another provider before any credential request', async () => {
    const f = fixture({ signInProfileId: 'selected' })
    await f.actions.saveService('fish')
    expect(f.services.addProfile).not.toHaveBeenCalled()
    expect(f.services.list).not.toHaveBeenCalled()
    expect(f.state.ServiceBusy).toBe(false)
    expect(f.state.ServiceError).toContain('belonging to this provider')
  })

  it.each([true, false])('restores footer focus after a current save (success=%s)', async success => {
    const focus = vi.fn(), body = {}, callbacks: Array<() => void> = []
    const f = fixture({ document: { body, activeElement: body }, requestAnimationFrame: (callback: () => void) => callbacks.push(callback) })
    const footer = { isConnected: true, contains: vi.fn(() => false), querySelector: vi.fn(() => ({ focus })) }
    if (!success) f.services.addProfile.mockRejectedValueOnce(Error('Fictional rejected key'))
    await f.actions.saveService('fal', footer)
    callbacks.forEach(callback => callback())
    expect(footer.querySelector).toHaveBeenCalledWith(success ? '.fal-add-account' : '.service-key-input')
    expect(focus).toHaveBeenCalledOnce()
  })

  it('finds the surviving footer when saving replaces its original element', async () => {
    const focus = vi.fn(), body = {}, callbacks: Array<() => void> = []
    const f = fixture({ document: { body, activeElement: body }, requestAnimationFrame: (callback: () => void) => callbacks.push(callback) })
    const surviving = { isConnected: true, contains: () => false, querySelector: vi.fn(() => ({ focus })) }
    const card = { isConnected: true, querySelector: vi.fn(() => surviving) }
    await f.actions.saveService('fal', { isConnected: false, closest: () => card })
    callbacks.forEach(callback => callback())
    expect(card.querySelector).toHaveBeenCalledWith(':scope > footer')
    expect(focus).toHaveBeenCalledOnce()
  })

  it.each(['other focus', 'detached footer', 'obsolete operation'])('does not steal focus after %s', async change => {
    const focus = vi.fn(), body = {}, document = { body, activeElement: body }, callbacks: Array<() => void> = []
    const f = fixture({ document, requestAnimationFrame: (callback: () => void) => callbacks.push(callback) })
    const footer = { isConnected: true, contains: vi.fn(() => false), querySelector: vi.fn(() => ({ focus })) }
    await f.actions.saveService('fal', footer)
    if (change === 'other focus') document.activeElement = {}
    if (change === 'detached footer') footer.isConnected = false
    if (change === 'obsolete operation') f.context.serviceResponseScope.current.invalidate()
    callbacks.forEach(callback => callback())
    expect(focus).not.toHaveBeenCalled()
  })

  it.each(['add', 'disconnect', 'reconnect', 'sign-out', 'default', 'rename', 'project selection'])('%s keeps a missing selected key unavailable despite connected metadata', async action => {
    const f = fixture()
    switch (action) {
      case 'add': await f.actions.saveService('fal'); break
      case 'disconnect': case 'reconnect': case 'sign-out': await f.actions.transitionServiceProfileState('selected', action); break
      case 'default': await f.actions.setDefaultServiceProfileState('fal', 'selected'); break
      case 'rename': await f.actions.commitServiceProfileRename('selected'); break
      case 'project selection': await f.actions.selectProjectServiceProfile('fal', 'selected'); break
    }
    expect(f.services.list).toHaveBeenCalledOnce()
    expect(f.state.ServiceProfiles.profiles[0].status).toBe('connected')
    expect(f.state.ServiceConnections.fal).toBe(false); expect(f.state.HasCredential).toBe(false)
  })

  it('does not apply an old project account reply, clear its current draft, or report its error', async () => {
    const f = fixture(), pending = deferred<any>()
    f.services.addProfile.mockImplementation(() => pending.promise)
    const save = f.actions.saveService('fal')
    f.context.projectActivation.current++; f.context.serviceResponseScope.current.invalidate()
    const before = { ...f.state }
    pending.resolve({ schemaVersion: 1, profiles: [], defaults: {} }); await save
    expect(f.state).toEqual({ ...before, ServiceBusy: false }); expect(f.services.list).not.toHaveBeenCalled()
  })

  it('discards old Connected after a newer disconnect refresh commits', async () => {
    const f = fixture(), first = deferred<any>()
    f.services.list.mockImplementationOnce(() => first.promise)
    const initial = f.actions.setDefaultServiceProfileState('fal', 'selected')
    await Promise.resolve(); await Promise.resolve()
    await f.actions.transitionServiceProfileState('selected', 'disconnect')
    first.resolve([{ id: 'fal', connected: true }]); await initial
    expect(f.state.ServiceConnections.fal).toBe(false); expect(f.state.HasCredential).toBe(false)
  })

  it('keeps unrelated provider registry rows when an action returns a provider snapshot', async () => {
    const f = fixture()
    f.state.ServiceProfiles = { ...f.state.ServiceProfiles, profiles: [...f.state.ServiceProfiles.profiles, { id: 'other', provider: 'fish', status: 'connected' }], defaults: { fish: 'other' } }
    await f.actions.saveService('fal')
    expect(f.state.ServiceProfiles.profiles.some((profile: any) => profile.id === 'other')).toBe(true)
    expect(f.state.ServiceProfiles.defaults).toEqual({ fal: 'selected', fish: 'other' })
  })

  it('restores a current connected account after a failed rename without losing the original error', async () => {
    const f = fixture()
    f.services.renameProfile.mockRejectedValueOnce(Error('Rename was rejected'))
    f.services.list.mockResolvedValueOnce([{ id: 'fal', connected: true }])
    await f.actions.commitServiceProfileRename('selected')
    expect(f.state.ServiceConnections.fal).toBe(true)
    expect(f.state.ServiceActionError).toBe('Rename was rejected')
  })

  it('releases a busy add superseded by a rename without reviving the obsolete response', async () => {
    const f = fixture(), pending = deferred<any>()
    f.services.addProfile.mockImplementationOnce(() => pending.promise)
    const saving = f.actions.saveService('fal'); expect(f.state.ServiceBusy).toBe(true)
    await f.actions.commitServiceProfileRename('selected'); expect(f.state.ServiceBusy).toBe(true)
    pending.resolve({ schemaVersion: 1, profiles: [], defaults: {} }); await saving
    expect(f.state.ServiceBusy).toBe(false)
    expect(f.state.ServiceProfiles.profiles).toHaveLength(1)
  })
})
