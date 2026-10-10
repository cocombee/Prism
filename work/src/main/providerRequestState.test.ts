import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ServiceProfileStore } from './serviceProfileStore'
import { describe, expect, it } from 'vitest'
import { ProviderRequestState } from './providerRequestState'

function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('provider request ownership', () => {
  it('waits for overlapping account mutations before an authoritative status read, including a failed mutation', async () => {
    const state = new ProviderRequestState<string>(), first = deferred(), second = deferred(); let status = false, reads = 0
    const a = state.change('fal', async () => { await first.promise; status = true })
    const b = state.change('fal', async () => { await second.promise; throw Error('Rejected rename') })
    const rejected = expect(b).rejects.toThrow('Rejected rename')
    const read = state.readWhenIdle('fal', () => state.run('fal', async () => { reads++; return status }))
    first.resolve(); await a; expect(reads).toBe(0)
    second.resolve(); await rejected; expect(await read).toBe(true); expect(reads).toBe(1)
  })

  it('retries a status invalidated during a read after the new profile mutation settles', async () => {
    const state = new ProviderRequestState<string>(), gate = deferred(); let reads = 0
    const result = state.readWhenIdle('fal', () => state.run('fal', async () => { if (++reads === 1) await gate.promise; return reads }))
    await state.change('fal', async () => undefined); gate.resolve()
    expect(await result).toBe(2)
    await expect(state.readWhenIdle('fal', async () => { throw Error('Unreadable store') })).rejects.toThrow('Unreadable store')
  })

  it('rejects a waiting status for a superseded project', async () => {
    const state = new ProviderRequestState<string>(), gate = deferred(); state.activateProject('A')
    const changing = state.change('fal', () => gate.promise)
    const read = state.readWhenIdle('fal', async () => 'old')
    const rejected = expect(read).rejects.toMatchObject({ name: 'AbortError' })
    state.activateProject('B'); gate.resolve(); await changing; await rejected
  })
  it('reproduces old failure and success contamination with the former provider-only Map', async () => {
    const baseline = new Map<string, string>()
    const oldFailure = deferred()
    const failure = (async () => { await oldFailure.promise; baseline.set('fal', 'old quota') })()
    baseline.clear() // Clearing on switch alone does not prevent a late write.
    oldFailure.resolve(); await failure
    expect(baseline.get('fal')).toBe('old quota')
    const oldSuccess = deferred()
    const success = (async () => { await oldSuccess.promise; baseline.delete('fal') })()
    baseline.set('fal', 'new account forbidden')
    oldSuccess.resolve(); await success
    expect(baseline.has('fal')).toBe(false)
  })

  it('ignores a late old-profile failure after switching, without blocking the new account', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred()
    const old = state.run('fal', async () => { await gate.promise; state.set('fal', 'old quota') }, { validateResult: false })
    await state.change('fal', async () => undefined)
    state.set('fal', 'new account state'); gate.resolve(); await old
    expect(state.get('fal')).toBe('new account state')
  })

  it('ignores a late old-profile success that would clear a new account error', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred()
    const old = state.run('fal', async () => { await gate.promise; state.delete('fal') }, { validateResult: false })
    await state.change('fal', async () => undefined)
    state.set('fal', 'new forbidden'); gate.resolve(); await old
    expect(state.get('fal')).toBe('new forbidden')
  })

  it('rejects stale catalog/account/rewrite results after a project switch', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred()
    state.activateProject('project A')
    const old = state.run('openai', async () => { await gate.promise; return 'old catalog' })
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
    state.set('openai', 'old unavailable'); state.activateProject('project B')
    gate.resolve(); await rejected
    expect(state.get('openai')).toBeUndefined()
  })

  it('preserves memo on failed mutation but rejects requests while the account is changing', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred()
    state.set('fish', 'existing quota')
    const changing = state.change('fish', async () => { await gate.promise; throw new Error('write failed') })
    const rejected = expect(changing).rejects.toThrow('write failed')
    await expect(state.run('fish', async () => 'must not request')).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(); await rejected
    expect(state.get('fish')).toBe('existing quota')
  })

  it('returns cancellation for an obsolete account error instead of surfacing its access failure', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred()
    const request = state.run('openai', async () => { await gate.promise; throw new Error('Old account forbidden') })
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await state.change('openai', async () => undefined); gate.resolve(); await rejected
  })

  it('blocks credential acquisition when ownership changes during an awaited read', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred<string>(); let submitted = false
    const old = state.run('elevenlabs', async () => {
      state.assertCurrent('elevenlabs'); const key = await gate.promise
      state.assertCurrent('elevenlabs'); submitted = true; return key
    })
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
    await state.change('elevenlabs', async () => undefined)
    gate.resolve('fixture only'); await rejected; expect(submitted).toBe(false)
  })

  it('rejects queued old credential acquisition from the actual file-backed profile store', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-owner-'))
    try {
      let sequence = 0
      const store = new ServiceProfileStore({ dataRoot: root, encryptString: (value) => Buffer.from(value), decryptString: (value) => value.toString(), createId: () => `profile-${++sequence}` })
      await store.addProfile('fish', 'fixture-fish-old-key-1234567890')
      await store.addProfile('fish', 'fixture-fish-new-key-1234567890')
      const state = new ProviderRequestState<string>(); const ready = deferred(); let submitted = false
      const old = state.run('fish', async () => {
        await ready.promise
        state.assertCurrent('fish')
        const key = await store.loadCredentialForProject('fish', state.overrides('fish'))
        state.assertCurrent('fish'); submitted = true; return key
      })
      const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
      await state.change('fish', () => store.setDefault('fish', 'profile-2'))
      ready.resolve(); await rejected; expect(submitted).toBe(false)
      await expect(state.run('fish', () => store.loadCredentialForProject('fish', state.overrides('fish')))).resolves.toBe('fixture-fish-new-key-1234567890')
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('captures overrides across awaits rather than following mutable project metadata', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred()
    const overrides = { fish: 'profile A' }
    const request = state.run('fish', async () => { await gate.promise; return state.overrides('fish') }, { overrides })
    overrides.fish = 'profile B'; gate.resolve()
    expect(await request).toEqual({ fish: 'profile A' })
  })

  it('keeps a different provider request and failure state independent', async () => {
    const state = new ProviderRequestState<string>(); const gate = deferred()
    state.set('google', 'Google quota')
    const request = state.run('google', async () => { await gate.promise; return state.get('google') })
    await state.change('fal', async () => undefined); gate.resolve()
    expect(await request).toBe('Google quota')
  })

  it('suspends overlapping account mutations until both settle', async () => {
    const state = new ProviderRequestState<string>(); const first = deferred(); const second = deferred()
    const a = state.change('fal', () => first.promise); const b = state.change('fal', () => second.promise)
    first.resolve(); await a
    expect(() => state.assertCurrent('fal')).toThrow('selection')
    second.resolve(); await b
    await expect(state.run('fal', async () => 'current')).resolves.toBe('current')
  })

  it('preserves current ownership across same-project activation and normal awaits', async () => {
    const state = new ProviderRequestState<string>(); state.activateProject('same project')
    const result = await state.run('byteplus', async () => {
      await Promise.resolve(); state.activateProject('same project'); state.set('byteplus', 'ready')
      return state.get('byteplus')
    })
    expect(result).toBe('ready'); expect(state.delete('byteplus')).toBe(true)
  })

  it('does not permit a scoped request to mutate a different provider', async () => {
    const state = new ProviderRequestState<string>(); state.set('fish', 'protected')
    await state.run('fal', async () => { state.set('fish', 'wrong'); state.delete('fish') })
    expect(state.get('fish')).toBe('protected')
  })
  it('changes catalog scope across project and account transitions without embedding credentials', async () => {
    const state = new ProviderRequestState<string>()
    state.activateProject('private project path')
    const first = await state.run('fal', async () => state.catalogScope('fal'))
    expect(first).not.toContain('private project path')
    await state.change('fal', async () => undefined)
    const second = await state.run('fal', async () => state.catalogScope('fal'))
    expect(second).not.toBe(first)
    state.activateProject('other project')
    const third = await state.run('fal', async () => state.catalogScope('fal'))
    expect(third).not.toBe(second)
  })

})
