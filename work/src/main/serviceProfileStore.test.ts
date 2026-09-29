import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { ServiceProfileStore } from './serviceProfileStore'

const encryption = {
  encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
  decryptString: (value: Buffer) => value.toString().replace(/^encrypted:/, ''),
}

async function fixtureStore() {
  const root = await mkdtemp(join(tmpdir(), 'prism-service-profile-'))
  let id = 0
  return {
    root,
    store: new ServiceProfileStore({
      dataRoot: root,
      ...encryption,
      now: () => '2026-08-22T00:00:00.000Z',
      createId: () => `profile-${++id}`,
    }),
  }
}

describe('ServiceProfileStore', () => {
  it('does not migrate legacy credentials during launch-only status listing', async () => {
    const { root, store } = await fixtureStore()
    await writeFile(join(root, 'credential.enc'), encryption.encryptString('fixture-credential-value-1234567890'))
    expect(await store.listProfiles('fal', false)).toEqual({ schemaVersion: 1, localNamingVersion: 1, profiles: [], defaults: {} })
    expect(await stat(join(root, 'credential.enc'))).toBeTruthy()
  })

  it('migrates fal and other provider legacy keys into encrypted default profiles without identity lookup', async () => {
    const { root, store } = await fixtureStore()
    await writeFile(join(root, 'credential.enc'), encryption.encryptString('fixture-fal-credential-value-1234567890'))
    await writeFile(join(root, 'service-credentials', 'openai.enc'), encryption.encryptString('fixture-openai-credential-value-1234567890'), { flag: 'w' }).catch(async () => {
      const { mkdir } = await import('node:fs/promises')
      await mkdir(join(root, 'service-credentials'), { recursive: true })
      await writeFile(join(root, 'service-credentials', 'openai.enc'), encryption.encryptString('fixture-openai-credential-value-1234567890'))
    })

    let registry = await store.listProfiles('fal', true)
    registry = await store.listProfiles('openai', true)
    expect(registry.profiles.map(({ provider, displayName, status }) => ({ provider, displayName, status }))).toEqual([
      { provider: 'fal', displayName: 'Account 01', status: 'connected' },
      { provider: 'openai', displayName: 'Account 01', status: 'connected' },
    ])
    expect(registry.defaults).toEqual({ fal: 'profile-1', openai: 'profile-2' })
    expect(await store.loadCredentialForProject('openai')).toBe('fixture-openai-credential-value-1234567890')
    const metadata = await readFile(join(root, 'service-profiles.json'), 'utf8')
    expect(metadata).not.toContain('fixture-openai-credential-value-1234567890')
    expect(metadata).not.toMatch(/api.?key|credential/i)
  })

  it('migrates a legacy BytePlus key without changing existing fal profile metadata', async () => {
    const { root, store } = await fixtureStore()
    await store.addProfile('fal', 'fixture-fal-credential-value-1234567890')
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(root, 'service-credentials'), { recursive: true })
    await writeFile(join(root, 'service-credentials', 'byteplus.enc'), encryption.encryptString('fixture-byteplus-value-1234567890'))

    const registry = await store.listProfiles('byteplus', true)
    expect(registry.profiles.map(({ provider, displayName }) => ({ provider, displayName }))).toEqual([
      { provider: 'fal', displayName: 'Account 01' },
      { provider: 'byteplus', displayName: 'Account 01' },
    ])
    expect(registry.defaults).toEqual({ fal: 'profile-1', byteplus: 'profile-2' })
    await expect(store.loadCredentialForProject('byteplus')).resolves.toBe('fixture-byteplus-value-1234567890')
    expect(await readFile(join(root, 'service-profiles.json'), 'utf8')).not.toContain('fixture-byteplus-value-1234567890')
  })

  it('adds sequential local account names and supports inline rename', async () => {
    const { store } = await fixtureStore()
    let registry = await store.addProfile('google', 'fixture-credential-value-1234567890')
    registry = await store.addProfile('google', 'another-fixture-credential-1234567890')
    expect(registry.profiles.map((profile) => profile.displayName)).toEqual(['Account 01', 'Account 02'])
    registry = await store.renameProfile(registry.profiles[1].id, 'Client B')
    expect(registry.profiles[1].displayName).toBe('Client B')
  })

  it('retains the encrypted key on disconnect, reconnects without provider lookup, and removes it on sign out', async () => {
    const { store } = await fixtureStore()
    await store.addProfile('fal', 'fixture-credential-value-1234567890')
    await store.transitionProfile('profile-1', 'disconnect')
    await expect(store.loadCredentialForProject('fal')).rejects.toThrow('disconnected')
    await store.transitionProfile('profile-1', 'reconnect')
    await expect(store.loadCredentialForProject('fal')).resolves.toBe('fixture-credential-value-1234567890')
    await store.transitionProfile('profile-1', 'sign-out')
    await expect(store.loadCredentialForProject('fal')).rejects.toThrow('signed out')
  })

  it('signs back into the same retained row without revealing identity', async () => {
    const { store } = await fixtureStore()
    await store.addProfile('deepseek', 'fixture-credential-value-1234567890')
    await store.transitionProfile('profile-1', 'sign-out')
    const registry = await store.addProfile('deepseek', 'replacement-fixture-credential-1234567890', 'profile-1')
    expect(registry.profiles).toEqual([expect.objectContaining({ id: 'profile-1', displayName: 'Account 01', status: 'connected' })])
  })

  it('deletes the default without selecting a replacement and leaves project overrides blocked', async () => {
    const { store } = await fixtureStore()
    await store.addProfile('moonshot', 'fixture-credential-value-1234567890')
    await store.transitionProfile('profile-1', 'delete')
    const registry = await store.listProfiles('moonshot', false)
    expect(registry.defaults.moonshot).toBeUndefined()
    await expect(store.loadCredentialForProject('moonshot', { moonshot: 'profile-1' })).rejects.toThrow('no longer exists')
  })
})
