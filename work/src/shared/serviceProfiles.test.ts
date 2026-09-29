import { describe, expect, it } from 'vitest'
import {
  emptyServiceProfileRegistry,
  projectServiceProfileSelection,
  setDefaultServiceProfile,
  transitionServiceProfile,
  upsertServiceProfile,
  withProjectServiceProfileOverride,
} from './serviceProfiles'
import type { ProjectWorkspace, ServiceProfile } from './types'

const account = (overrides: Partial<ServiceProfile> = {}): ServiceProfile => ({
  id: 'fal-a',
  provider: 'fal',
  accountIdentifier: 'studio-a',
  status: 'connected',
  createdAt: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
  ...overrides,
})

const project = (overrides: Partial<ProjectWorkspace> = {}): ProjectWorkspace => ({
  schemaVersion: 1,
  id: 'project-a',
  name: 'Project A',
  rootPath: '/tmp/project-a',
  createdAt: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
  ...overrides,
})

describe('service profile selection', () => {
  it('keeps BytePlus defaults and project overrides independent from legacy fal selections', () => {
    let registry = upsertServiceProfile(emptyServiceProfileRegistry(), account())
    registry = upsertServiceProfile(registry, account({ id: 'byteplus-a', provider: 'byteplus', accountIdentifier: 'byteplus-studio' }))
    registry = setDefaultServiceProfile(registry, 'fal', 'fal-a')
    registry = setDefaultServiceProfile(registry, 'byteplus', 'byteplus-a')
    const selected = withProjectServiceProfileOverride(project({ serviceProfileOverrides: { fal: 'fal-a' } }), 'byteplus', 'byteplus-a')

    expect(selected.serviceProfileOverrides).toEqual({ fal: 'fal-a', byteplus: 'byteplus-a' })
    expect(projectServiceProfileSelection(registry, selected, 'byteplus')).toMatchObject({ source: 'project', profile: { id: 'byteplus-a', provider: 'byteplus' }, available: true })
  })
  it('adds and clears a project override without changing unrelated project metadata', () => {
    const selected = withProjectServiceProfileOverride(project(), 'fal', 'fal-a')
    expect(selected.serviceProfileOverrides).toEqual({ fal: 'fal-a' })
    expect(selected.name).toBe('Project A')

    const followingDefault = withProjectServiceProfileOverride(selected, 'fal', undefined)
    expect(followingDefault.serviceProfileOverrides).toBeUndefined()
  })

  it('lets untouched projects follow the current global default', () => {
    const initial = upsertServiceProfile(emptyServiceProfileRegistry(), account())
    const withDefault = setDefaultServiceProfile(initial, 'fal', 'fal-a')
    const switchedDefault = setDefaultServiceProfile(
      upsertServiceProfile(withDefault, account({ id: 'fal-b', accountIdentifier: 'studio-b' })),
      'fal',
      'fal-b',
    )

    expect(projectServiceProfileSelection(switchedDefault, project(), 'fal')).toMatchObject({
      source: 'default',
      profile: { id: 'fal-b' },
    })
  })

  it('keeps an explicit project preference when the global default changes', () => {
    let registry = upsertServiceProfile(emptyServiceProfileRegistry(), account())
    registry = upsertServiceProfile(registry, account({ id: 'fal-b', accountIdentifier: 'studio-b' }))
    registry = setDefaultServiceProfile(registry, 'fal', 'fal-b')

    expect(projectServiceProfileSelection(registry, project({ serviceProfileOverrides: { fal: 'fal-a' } }), 'fal')).toMatchObject({
      source: 'project',
      profile: { id: 'fal-a' },
    })
  })

  it('lets the current default be toggled off without silently choosing another profile', () => {
    const registry = setDefaultServiceProfile(upsertServiceProfile(emptyServiceProfileRegistry(), account()), 'fal', 'fal-a')
    const cleared = setDefaultServiceProfile(registry, 'fal', undefined)

    expect(cleared.defaults.fal).toBeUndefined()
    expect(projectServiceProfileSelection(cleared, project(), 'fal').reason).toBe('missing')
  })

  it('does not silently fall back when a project-selected account is unavailable', () => {
    let registry = upsertServiceProfile(emptyServiceProfileRegistry(), account())
    registry = upsertServiceProfile(registry, account({ id: 'fal-b', accountIdentifier: 'studio-b' }))
    registry = setDefaultServiceProfile(registry, 'fal', 'fal-b')
    registry = transitionServiceProfile(registry, 'fal-a', 'disconnect', '2026-08-22T01:00:00.000Z')

    expect(projectServiceProfileSelection(registry, project({ serviceProfileOverrides: { fal: 'fal-a' } }), 'fal')).toEqual({
      source: 'project',
      profile: registry.profiles[0],
      available: false,
      reason: 'disconnected',
    })
  })
})

describe('service profile lifecycle', () => {
  it('deduplicates the same provider account identifier without exposing a key field', () => {
    const first = upsertServiceProfile(emptyServiceProfileRegistry(), account())
    const updated = upsertServiceProfile(first, account({ id: 'replacement-id', accountIdentifier: 'STUDIO-A', updatedAt: '2026-08-22T02:00:00.000Z' }))

    expect(updated.profiles).toHaveLength(1)
    expect(updated.profiles[0]).toMatchObject({ id: 'fal-a', accountIdentifier: 'STUDIO-A', status: 'connected' })
    expect(JSON.stringify(updated)).not.toMatch(/api.?key|credential/i)
  })

  it('keeps disconnect, sign out, and delete distinct', () => {
    const initial = setDefaultServiceProfile(upsertServiceProfile(emptyServiceProfileRegistry(), account()), 'fal', 'fal-a')
    const disconnected = transitionServiceProfile(initial, 'fal-a', 'disconnect', '2026-08-22T01:00:00.000Z')
    expect(disconnected.profiles[0].status).toBe('disconnected')

    const reconnected = transitionServiceProfile(disconnected, 'fal-a', 'reconnect', '2026-08-22T02:00:00.000Z')
    expect(reconnected.profiles[0].status).toBe('connected')

    const signedOut = transitionServiceProfile(reconnected, 'fal-a', 'sign-out', '2026-08-22T03:00:00.000Z')
    expect(signedOut.profiles[0].status).toBe('signed-out')

    const deleted = transitionServiceProfile(signedOut, 'fal-a', 'delete', '2026-08-22T04:00:00.000Z')
    expect(deleted.profiles).toEqual([])
    expect(deleted.defaults.fal).toBeUndefined()
  })

  it('refuses to set a disconnected or signed-out profile as default', () => {
    const disconnected = upsertServiceProfile(emptyServiceProfileRegistry(), account({ status: 'disconnected' }))
    expect(() => setDefaultServiceProfile(disconnected, 'fal', 'fal-a')).toThrow('Only a connected account can be the default.')
  })
})
