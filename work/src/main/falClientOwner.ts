import { createFalClient, type FalClient } from '@fal-ai/client'

/** A generation owns its SDK instance and original credentials, including cancellation. */
export function createOwnedFalClient(credentials: string, transport: typeof fetch, assertSubmission: () => void): FalClient {
  if (!credentials.trim()) throw new Error('Connect a fal account before submitting.')
  return createFalClient({ credentials, fetch: (input, init) => {
    const method = init?.method || (input instanceof Request ? input.method : 'GET')
    // SDK preparation can await uploads after the caller's preflight. Validate
    // again at the actual new POST, but allow polling/cancellation of owned work.
    if (method.toUpperCase() === 'POST') assertSubmission()
    return transport(input, init)
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
  } finally {
    signal?.removeEventListener('abort', cancel)
    await cancellation
    if (cancellationFailed) throw new Error('fal.ai could not confirm that the remote job ended. It may still be running.', { cause: cancellationError })
  }
}
