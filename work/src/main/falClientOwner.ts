import { createFalClient, type FalClient } from '@fal-ai/client'

/** A generation owns its SDK instance and original credentials, including cancellation. */
export function createOwnedFalClient(credentials: string, transport: typeof fetch, assertSubmission: () => void): FalClient {
  if (!credentials.trim()) throw new Error('Connect a fal account before submitting.')
  return createFalClient({ credentials, fetch: async (input, init) => {
    const method = init?.method || (input instanceof Request ? input.method : 'GET')
    // SDK preparation can await uploads after the caller's preflight. Validate
    // again at the actual new POST, but allow polling/cancellation of owned work.
    if (method.toUpperCase() === 'POST') assertSubmission()
    const response = await transport(input, init)
    if (response.status !== 422) return response
    // Preserve actionable validation text; never send provider input/body dumps to UI.
    try {
      const body = await response.clone().json() as { detail?: unknown }
      const redact = (text: string) => text.replaceAll(credentials, '[redacted]').replace(/https?:\/\/\S+/g, '[reference URL]').replace(/\b(?:Bearer|Key)\s+\S+/gi, '[redacted]').slice(0, 400)
      const raw = typeof body.detail === 'string' ? [{ loc: ['body'], msg: body.detail }] : Array.isArray(body.detail) ? body.detail : []
      const detail = raw.slice(0, 5).flatMap(entry => {
        if (!entry || typeof entry !== 'object' || typeof entry.msg !== 'string') return []
        const loc = Array.isArray(entry.loc) ? entry.loc.filter((part: unknown) => typeof part === 'number' || typeof part === 'string' && /^[a-zA-Z_][\w-]{0,50}$/.test(part)) : ['body']
        return [{ loc, msg: redact(entry.msg), type: 'value_error' }]
      })
      const summary = detail.map(entry => `${entry.loc.join('.')}: ${entry.msg}`).join('; ') || 'Review the model inputs.'
      return new Response(JSON.stringify({ message: `fal.ai HTTP 422: ${summary}`, detail }), { status: response.status, statusText: response.statusText, headers: response.headers })
    } catch { return response }
  } })
}

/** Stop the remote owned job as well as local polling when a generation is aborted. */
export async function subscribeOwnedFalClient(client: FalClient, endpointId: string, options: Parameters<FalClient['subscribe']>[1]) {
  const signal = options.abortSignal
  let requestId: string | undefined
  let cancellation: Promise<void> | undefined
  let cancellationError: unknown
  let cancellationFailed = false
  const cancel = () => {
    if (!requestId || cancellation) return
    // Cancellation must use the original client even after a profile/project switch.
    cancellation = client.queue.cancel(endpointId, { requestId, abortSignal: AbortSignal.timeout(15000) })
      .catch((error: unknown) => { cancellationFailed = true; cancellationError = error })
  }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    return await client.subscribe(endpointId, {
      ...options,
      onEnqueue: (id) => {
        requestId = id
        // An abort may occur while enqueue is returning the remote request ID.
        if (signal?.aborted) cancel()
        options.onEnqueue?.(id)
      },
    })
  } catch (error) {
    const owned = error as { status?: number; requestId?: string; message?: string }
    const id = owned.requestId || requestId
    if (owned.status === 422 && typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id) && error instanceof Error) {
      error.message += ` · Request ${id}`
    }
    throw error
  } finally {
    signal?.removeEventListener('abort', cancel)
    await cancellation
    if (cancellationFailed) throw new Error('fal.ai could not confirm that the remote job ended. It may still be running.', { cause: cancellationError })
  }
}
