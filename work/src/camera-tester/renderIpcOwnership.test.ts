import { describe, expect, it, vi } from 'vitest'
import { RenderIpcCoordinator } from './renderIpc'

const request = { jobId: 'job-a', nodeId: 'node-a', artifactId: 'artifact-a', width: 1920, height: 1080, fps: 24, startFrame: 0, endFrame: 2 }

describe('camera render IPC sender ownership', () => {
  it('permits only the submitting sender and cancels all owned jobs on destruction', async () => {
    const engine = { start: vi.fn(async () => ({ jobId: 'job-a', total: 2 })), submit: vi.fn(async () => ({ jobId: 'job-a', completed: 1, total: 2 })), finish: vi.fn(async () => ({ locator: 'node-a/artifact-a.mp4' })), cancel: vi.fn(async () => undefined), cancelAll: vi.fn(async () => undefined) }
    const coordinator = new RenderIpcCoordinator(engine as never)
    await coordinator.start(7, request)
    await expect(coordinator.submit(8, 'job-a', 0, new Uint8Array(1920 * 1080 * 4))).rejects.toThrow('RENDER_SENDER_MISMATCH')
    await coordinator.cancelSender(7)
    expect(engine.cancel).toHaveBeenCalledWith('job-a')
  })

  it('rejects test-only dimensions at the IPC boundary while the engine retains its internal test seam', async () => {
    const engine = { start: vi.fn(), submit: vi.fn(), finish: vi.fn(), cancel: vi.fn(), cancelAll: vi.fn() }
    const coordinator = new RenderIpcCoordinator(engine as never)
    await expect(coordinator.start(1, { ...request, width: 64, height: 36 })).rejects.toThrow('INVALID_PRODUCTION_DIMENSIONS')
    expect(engine.start).not.toHaveBeenCalled()
  })
})
