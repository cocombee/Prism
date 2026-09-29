import { describe, expect, it, vi } from 'vitest'
import { runBytePlusTask, runBytePlusTaskAndDownload } from './byteplusTaskRunner'
import type { BytePlusCreatePayload } from '../shared/byteplusSeedance'

const payload: BytePlusCreatePayload = {
  model: 'dreamina-seedance-2-5-260628',
  content: [{ type: 'text', text: 'Exact prompt' }],
  duration: 4,
  watermark: false,
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('runBytePlusTask', () => {
  it('downloads the successful output through the caller managed-media boundary', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ id: 'task-managed' }))
      .mockResolvedValueOnce(response({ id: 'task-managed', status: 'succeeded', content: { video_url: 'https://output/video.mp4' } }))
    const download = vi.fn().mockResolvedValue('/project/06. Generated Assets/02. Videos/generated.mp4')
    const result = await runBytePlusTaskAndDownload({ fetch, apiKey: 'safe-placeholder', payload, pollIntervalMs: 0, download })
    expect(download).toHaveBeenCalledWith('https://output/video.mp4')
    expect(result).toMatchObject({ taskId: 'task-managed', outputPath: '/project/06. Generated Assets/02. Videos/generated.mp4' })
  })

  it('POSTs exactly once then polls queued to running to succeeded', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ id: 'task-1' }))
      .mockResolvedValueOnce(response({ id: 'task-1', status: 'queued' }))
      .mockResolvedValueOnce(response({ id: 'task-1', status: 'running' }))
      .mockResolvedValueOnce(response({ id: 'task-1', status: 'succeeded', content: { video_url: 'https://output/video.mp4', last_frame_url: 'https://output/last.png' }, usage: { output_tokens: 10 } }))
    const progress: string[] = []

    const result = await runBytePlusTask({
      fetch,
      apiKey: 'secret-value-that-must-not-leak',
      payload,
      pollIntervalMs: 0,
      onProgress: (message) => progress.push(message),
    })

    expect(result).toMatchObject({ taskId: 'task-1', outputUrl: 'https://output/video.mp4', lastFrameUrl: 'https://output/last.png', usage: { output_tokens: 10 } })
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
    expect(fetch.mock.calls[0][0]).toBe('https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks')
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(payload) })
    expect(progress).toEqual(['Submitting securely to BytePlus ModelArk…', 'Queued at BytePlus ModelArk…', 'Generating with BytePlus ModelArk…'])
    expect(JSON.stringify(result)).not.toContain('secret-value-that-must-not-leak')
  })

  it('never retries an ambiguous create transport failure', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed'))
    await expect(runBytePlusTask({ fetch, apiKey: 'secret-value-that-must-not-leak', payload, pollIntervalMs: 0 })).rejects.toThrow('fetch failed')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    [401, { error: { message: 'invalid api key' } }, 'invalid api key'],
    [403, { error: { message: 'model forbidden' } }, 'model forbidden'],
    [429, { error: { message: 'quota exceeded' } }, 'quota exceeded'],
    [402, { error: { message: 'insufficient balance' } }, 'insufficient balance'],
    [400, { error: { code: 'Moderation', message: 'content rejected' } }, 'content rejected'],
  ])('surfaces HTTP %i without secrets', async (status, body, message) => {
    const fetch = vi.fn().mockResolvedValue(response(body, status))
    const caught = await runBytePlusTask({ fetch, apiKey: 'secret-value-that-must-not-leak', payload, pollIntervalMs: 0 }).catch((error) => error as Error & { status?: number })
    expect(caught).toBeInstanceOf(Error)
    if (!(caught instanceof Error)) throw new Error('Expected BytePlus task failure.')
    expect(caught.message).toContain(message)
    expect((caught as Error & { status?: number }).status).toBe(status)
    expect(JSON.stringify(caught)).not.toContain('secret-value-that-must-not-leak')
  })

  it.each([
    [{ id: 'task-1', status: 'failed', error: { code: 'Moderation', message: 'Rejected by policy' } }, 'Rejected by policy'],
    [{ id: 'task-1', status: 'succeeded', content: {} }, 'video output URL'],
    [{ id: 'task-1', status: 'expired' }, 'expired'],
    [{ id: 'task-1', status: 'cancelled' }, 'cancelled'],
  ])('surfaces terminal task failure %#', async (terminal, message) => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ id: 'task-1' })).mockResolvedValueOnce(response(terminal))
    await expect(runBytePlusTask({ fetch, apiKey: 'safe-placeholder', payload, pollIntervalMs: 0 })).rejects.toThrow(message)
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  })

  it('times out bounded polling without another POST', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ id: 'task-1' })).mockImplementation(async () => response({ id: 'task-1', status: 'running' }))
    await expect(runBytePlusTask({ fetch, apiKey: 'safe-placeholder', payload, pollIntervalMs: 0, maxPolls: 2 })).rejects.toThrow(/timed out/i)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  })

  it('aborts local polling and never attempts remote cancellation', async () => {
    const controller = new AbortController()
    const fetch = vi.fn().mockResolvedValueOnce(response({ id: 'task-1' })).mockImplementationOnce(async () => {
      controller.abort()
      return response({ id: 'task-1', status: 'queued' })
    })
    await expect(runBytePlusTask({ fetch, apiKey: 'safe-placeholder', payload, signal: controller.signal, pollIntervalMs: 0 })).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.every(([, init]) => init?.method !== 'DELETE' && init?.method !== 'POST' || init?.method === 'POST')).toBe(true)
  })
})
