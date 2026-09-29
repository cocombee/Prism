import {
  BYTEPLUS_BASE_URL,
  BYTEPLUS_CREATE_PATH,
  BYTEPLUS_RETRIEVE_PATH,
  parseBytePlusCreateResponse,
  parseBytePlusTaskResponse,
  type BytePlusCreatePayload,
  type BytePlusTaskResult,
} from '../shared/byteplusSeedance'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface RunBytePlusTaskOptions {
  fetch: FetchLike
  apiKey: string
  payload: BytePlusCreatePayload
  signal?: AbortSignal
  pollIntervalMs?: number
  maxPolls?: number
  onProgress?: (message: string, status: 'queued' | 'running') => void
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
}

export interface RunBytePlusTaskAndDownloadOptions extends RunBytePlusTaskOptions {
  download: (url: string) => Promise<string>
}

function abortError(): DOMException { return new DOMException('This operation was aborted', 'AbortError') }

async function abortableSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw abortError()
  if (milliseconds <= 0) return
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds)
    const abort = () => { clearTimeout(timer); reject(abortError()) }
    signal?.addEventListener('abort', abort, { once: true })
  })
  if (signal?.aborted) throw abortError()
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {} }
function errorMessage(value: unknown, fallback: string): string {
  const body = record(value)
  const error = record(body.error)
  return typeof error.message === 'string' && error.message.trim() ? error.message.trim()
    : typeof body.message === 'string' && body.message.trim() ? body.message.trim()
      : fallback
}

async function jsonResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

function httpError(status: number, body: unknown): Error & { status: number } {
  const error = new Error(errorMessage(body, `BytePlus ModelArk request failed (${status}).`)) as Error & { status: number }
  error.status = status
  return error
}

function terminalError(result: BytePlusTaskResult): Error {
  if (result.error) return new Error(result.error.message)
  return new Error(`BytePlus ModelArk task ${result.status}.`)
}

export async function runBytePlusTask(options: RunBytePlusTaskOptions): Promise<BytePlusTaskResult & { outputUrl: string }> {
  const signal = options.signal
  if (signal?.aborted) throw abortError()
  options.onProgress?.('Submitting securely to BytePlus ModelArk…', 'queued')

  // Create is deliberately attempted once. An ambiguous transport failure is never retried.
  const createResponse = await options.fetch(`${BYTEPLUS_BASE_URL}${BYTEPLUS_CREATE_PATH}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(options.payload),
    signal,
  })
  const createBody = await jsonResponse(createResponse)
  if (!createResponse.ok) throw httpError(createResponse.status, createBody)
  const { taskId } = parseBytePlusCreateResponse(createBody)
  const maxPolls = Math.max(1, options.maxPolls ?? 240)
  const sleep = options.sleep || abortableSleep

  for (let poll = 0; poll < maxPolls; poll += 1) {
    if (signal?.aborted) throw abortError()
    const retrieveResponse = await options.fetch(`${BYTEPLUS_BASE_URL}${BYTEPLUS_RETRIEVE_PATH(taskId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${options.apiKey}` },
      signal,
    })
    const retrieveBody = await jsonResponse(retrieveResponse)
    if (!retrieveResponse.ok) throw httpError(retrieveResponse.status, retrieveBody)
    const result = parseBytePlusTaskResponse(retrieveBody)
    if (result.status === 'queued') options.onProgress?.('Queued at BytePlus ModelArk…', 'queued')
    else if (result.status === 'running') options.onProgress?.('Generating with BytePlus ModelArk…', 'running')
    if (result.status === 'succeeded' && result.outputUrl) return result as BytePlusTaskResult & { outputUrl: string }
    if (result.terminal) throw terminalError(result)
    await sleep(options.pollIntervalMs ?? 1_500, signal)
  }
  const error = new Error('BytePlus ModelArk generation timed out while polling.') as Error & { status?: number }
  error.status = 408
  throw error
}

export async function runBytePlusTaskAndDownload(options: RunBytePlusTaskAndDownloadOptions): Promise<BytePlusTaskResult & { outputUrl: string; outputPath: string }> {
  const result = await runBytePlusTask(options)
  const outputPath = await options.download(result.outputUrl)
  return { ...result, outputPath }
}
