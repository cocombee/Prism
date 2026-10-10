import { describe, expect, it } from 'vitest'
import { createOwnedFalClient, subscribeOwnedFalClient } from './falClientOwner'
import { ProviderRequestState } from './providerRequestState'

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes }); return { promise, resolve } }
const accepted = (id: string) => new Response(JSON.stringify({ request_id: id, status: 'IN_QUEUE', response_url: `https://queue.fal.run/fal-ai/flux/requests/${id}`, status_url: `https://queue.fal.run/fal-ai/flux/requests/${id}/status`, cancel_url: `https://queue.fal.run/fal-ai/flux/requests/${id}/cancel` }), { headers: { 'Content-Type': 'application/json' } })
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })

describe('real SDK request client ownership', () => {
  it('retains separate credentials through concurrent requests from two account clients', async () => {
    const old = deferred<Response>(), entered = deferred<void>(), calls: Array<{ method: string; authorization: string | null }> = []
    const transport: typeof fetch = async (_input, init) => {
      const authorization = new Headers(init?.headers).get('authorization')
      calls.push({ method: init?.method || '', authorization })
      if (authorization === 'Key fixture-fal-profile-A') { entered.resolve(); return old.promise }
      return accepted('new-request')
    }
    const a = createOwnedFalClient('fixture-fal-profile-A', transport, () => undefined)
    const requestA = a.queue.submit('fal-ai/flux/schnell', { input: { prompt: 'A' } })
    await entered.promise
    const b = createOwnedFalClient('fixture-fal-profile-B', transport, () => undefined)
    expect((await b.queue.submit('fal-ai/flux/schnell', { input: { prompt: 'B' } })).request_id).toBe('new-request')
    old.resolve(accepted('old-request')); expect((await requestA).request_id).toBe('old-request')
    expect(calls.map((call) => call.authorization)).toEqual(['Key fixture-fal-profile-A', 'Key fixture-fal-profile-B'])
  })

  it('rejects obsolete submission at transport without a paid request, while preserving original cancellation credentials', async () => {
    let current = true; const calls: Array<{ method: string; authorization: string | null; url: string }> = []
    const transport: typeof fetch = async (input, init) => { calls.push({ method: init?.method || '', authorization: new Headers(init?.headers).get('authorization'), url: String(input) }); return accepted('owned') }
    const client = createOwnedFalClient('fixture-fal-original-profile', transport, () => { if (!current) throw new DOMException('profile changed', 'AbortError') })
    await client.queue.submit('fal-ai/flux/schnell', { input: { prompt: 'Owned' } })
    current = false
    await expect(client.queue.submit('fal-ai/flux/schnell', { input: { prompt: 'Obsolete' } })).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toHaveLength(1)
    await client.queue.cancel('fal-ai/flux/schnell', { requestId: 'owned' })
    expect(calls).toHaveLength(2)
    expect(calls[1].method.toUpperCase()).toBe('PUT')
    expect(calls[1].url).toContain('/requests/owned/cancel')
    expect(calls[1].authorization).toBe('Key fixture-fal-original-profile')
  })

  it('rejects missing credentials instead of falling back to a process-level account', () => {
    expect(() => createOwnedFalClient('', async () => accepted('unused'), () => undefined)).toThrow('Connect a fal account')
  })

  it('keeps concurrent storage initiation and signed upload URLs with their original accounts', async () => {
    const first = deferred<Response>(), entered = deferred<void>(), calls: Array<{ url: string; auth: string | null }> = []
    const transport: typeof fetch = async (input, init) => {
      const url = String(input), auth = new Headers(init?.headers).get('authorization')
      calls.push({ url, auth })
      if (url.includes('/storage/upload/initiate')) {
        if (auth === 'Key fixture-A') { entered.resolve(); return first.promise }
        return json({ upload_url: 'https://upload.example/B', file_url: 'https://media.example/B' })
      }
      return new Response('')
    }
    const a = createOwnedFalClient('fixture-A', transport, () => undefined)
    const b = createOwnedFalClient('fixture-B', transport, () => undefined)
    const uploadA = a.storage.upload(new Blob(['A'], { type: 'image/png' }))
    await entered.promise
    expect(await b.storage.upload(new Blob(['B'], { type: 'image/png' }))).toBe('https://media.example/B')
    first.resolve(json({ upload_url: 'https://upload.example/A', file_url: 'https://media.example/A' }))
    expect(await uploadA).toBe('https://media.example/A')
    expect(calls.map((c) => c.auth)).toEqual(['Key fixture-A', 'Key fixture-B', null, null])
    expect(calls.slice(2).map((c) => c.url)).toEqual(['https://upload.example/B', 'https://upload.example/A'])
  })

  it('blocks a paid submit after the real request owner changes during automatic Blob preparation', async () => {
    const state = new ProviderRequestState<unknown>(), upload = deferred<Response>(), entered = deferred<void>()
    const calls: string[] = []
    const transport: typeof fetch = async (input) => {
      const url = String(input); calls.push(url)
      if (url.includes('/storage/upload/initiate')) return json({ upload_url: 'https://upload.example/owned', file_url: 'https://media.example/owned' })
      if (url === 'https://upload.example/owned') { entered.resolve(); return upload.promise }
      return accepted('must-not-submit')
    }
    state.activateProject('fixture-project-A')
    const request = state.run('fal', async () => {
      const client = createOwnedFalClient('fixture-A', transport, () => state.assertCurrent('fal'))
      const endpoint: string = 'fal-ai/flux/dev/image-to-image'
      return client.queue.submit(endpoint, { input: { prompt: 'Owned', image_url: new Blob(['owned reference']) } })
    }, { validateResult: false })
    await entered.promise
    await state.change('fal', async () => undefined)
    upload.resolve(new Response(''))
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toHaveLength(2)
    expect(calls.some((url) => url.startsWith('https://queue.fal.run/'))).toBe(false)
  })

  it('keeps owned polling/results on the original account and releases the abort listener on completion', async () => {
    let current = true; const controller = new AbortController(), calls: Array<{ method: string; auth: string | null }> = []
    const transport: typeof fetch = async (input, init) => {
      calls.push({ method: init?.method || '', auth: new Headers(init?.headers).get('authorization') })
      if (init?.method?.toUpperCase() === 'POST') return accepted('owned')
      return json(String(input).includes('/status') ? { status: 'COMPLETED' } : { images: [{ url: 'https://media.example/result' }] })
    }
    const client = createOwnedFalClient('fixture-original', transport, () => { if (!current) throw new DOMException('changed', 'AbortError') })
    const result = await subscribeOwnedFalClient(client, 'fal-ai/flux/schnell', { input: { prompt: 'Owned' }, abortSignal: controller.signal, onEnqueue: () => { current = false } })
    expect(result.data).toEqual({ images: [{ url: 'https://media.example/result' }] })
    controller.abort()
    expect(calls.map((c) => c.method.toUpperCase())).toEqual(['POST', 'GET', 'GET'])
    expect(calls.every((c) => c.auth === 'Key fixture-original')).toBe(true)
  })

  it.each(['polling', 'enqueue'] as const)('cancels once with original credentials when aborted during %s', async (phase) => {
    const controller = new AbortController(), calls: Array<{ method: string; url: string; auth: string | null }> = []
    let current = true
    const transport: typeof fetch = async (input, init) => {
      const method = init?.method?.toUpperCase() || '', url = String(input)
      if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      calls.push({ method, url, auth: new Headers(init?.headers).get('authorization') })
      if (method === 'POST') {
        if (phase === 'enqueue') { current = false; controller.abort() }
        return accepted('owned')
      }
      if (method === 'PUT') return json({ status: 'CANCELLATION_REQUESTED' })
      return json({ status: 'IN_QUEUE' })
    }
    const client = createOwnedFalClient('fixture-original', transport, () => { if (!current) throw new DOMException('changed', 'AbortError') })
    await expect(subscribeOwnedFalClient(client, 'fal-ai/flux/schnell', {
      input: { prompt: 'Owned' }, abortSignal: controller.signal, pollInterval: 1,
      onQueueUpdate: () => { current = false; controller.abort() },
    })).rejects.toMatchObject({ name: 'AbortError' })
    const cancellations = calls.filter((call) => call.method === 'PUT')
    expect(cancellations).toHaveLength(1)
    expect(cancellations[0].url).toContain('/requests/owned/cancel')
    expect(cancellations[0].auth).toBe('Key fixture-original')
  })

  it.each(['provider rejection', 'empty transport rejection'])('reports an unconfirmed remote cancellation after %s', async (failure) => {
    const controller = new AbortController()
    const transport: typeof fetch = async (_input, init) => {
      if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      if (init?.method?.toUpperCase() === 'POST') return accepted('owned')
      if (init?.method?.toUpperCase() === 'PUT') {
        if (failure === 'empty transport rejection') throw undefined
        return new Response(JSON.stringify({ message: 'Cannot cancel' }), { status: 422, headers: { 'Content-Type': 'application/json' } })
      }
      return json({ status: 'IN_QUEUE' })
    }
    const client = createOwnedFalClient('fixture-original', transport, () => undefined)
    await expect(subscribeOwnedFalClient(client, 'fal-ai/flux/schnell', { input: { prompt: 'Owned' }, abortSignal: controller.signal, pollInterval: 1, onQueueUpdate: () => controller.abort() })).rejects.toThrow('could not confirm that the remote job ended')
  })
})
