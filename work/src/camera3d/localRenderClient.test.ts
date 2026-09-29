import { describe, expect, it, vi } from 'vitest'
import { addEntity, createCameraDocument } from './model'
import { ArtifactStore } from './artifacts'
import { runCameraRender } from './localRenderClient'

describe('3D Camera node production Render path', () => {
  it('freezes range/document, submits one clean frame at a time, promotes, resolves, and persists success', async () => {
    const document = addEntity(createCameraDocument('node-render'), 'camera', 'Camera')
    const store = new ArtifactStore()
    const calls: string[] = []
    const api = {
      startRender: vi.fn(async () => ({ jobId: 'job-render-1', total: 2 })),
      writeRenderFrame: vi.fn(async (_job: string, index: number) => { calls.push(`frame-${index}`); return { jobId: 'job-render-1', completed: index + 1, total: 2 } }),
      finishRender: vi.fn(async () => ({ mediaHash: 'a'.repeat(64), width: 1280, height: 720, fps: 24, frameCount: 2, codec: 'h264' as const, container: 'mp4' as const, durationSeconds: 2 / 24, locator: 'node-render/render-1.mp4' })),
      cancelRender: vi.fn(async () => undefined),
      mediaUrl: vi.fn(async () => ({ ok: true as const, url: 'camera-media://local/node-render/render-1.mp4' })),
    }
    const renderer = { render: vi.fn((frame: number) => ({ bytes: new Uint8Array(1280 * 720 * 4), absoluteFrame: frame })), dispose: vi.fn() }
    const progress: number[] = []
    const result = await runCameraRender({ nodeId: 'node-render', document, range: { start: 3, end: 5, frameCount: 2, scope: 'marked-range', name: 'Marked Range [3, 5)' }, store, api: api as never, rendererFactory: () => renderer as never, onProgress: (completed) => progress.push(completed) })
    expect(calls).toEqual(['frame-0', 'frame-1'])
    expect(renderer.render.mock.calls.map(([frame]) => frame)).toEqual([3, 4])
    expect(progress).toEqual([0, 1, 2])
    expect(result.artifact.absoluteFrameRange).toEqual({ start: 3, end: 5 })
    expect(store.readiness(document).pill).toBe('Ready')
    expect(renderer.dispose).toHaveBeenCalledOnce()
  })
})
