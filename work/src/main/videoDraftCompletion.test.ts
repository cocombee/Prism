import { describe, expect, it, vi } from 'vitest'
import { executeVideoDraftCompletion } from './videoDraftCompletion'
import { createVideoDraftReceipt } from '../shared/videoDraft'

const account = 'a'.repeat(64)
function fixture(provider: 'fal' | 'byteplus' = 'fal') {
  const receipt = createVideoDraftReceipt(provider, provider === 'fal' ? 'bytedance/seedance-2.5/text-to-video' : 'dreamina-seedance-2-5-260628', 'fixture-draft-1', 'video', account, new Date().toISOString())
  const dependencies = {
    assertCurrent: vi.fn(), receipt: vi.fn(async () => receipt), accountFingerprint: vi.fn(async () => account),
    submit: vi.fn(async () => ({ requestId: 'final-1', url: 'https://fal.media/final.mp4', contentType: 'video/mp4' })),
    persist: vi.fn(async () => ({ path: '/managed/final.mp4', url: 'prism://final.mp4' })),
  }
  const request = { nodeId: 'video', kind: 'video-generator' as const, quantity: 1, draftCompletion: { provider, outputPath: '/managed/draft.mp4' }, prompt: 'Changed text must never create a different take', duration: 30, seed: 999, resolution: '720p' as const }
  return { receipt, dependencies, request }
}
describe('selected-take draft completion', () => {
  it('uses the owned fal ID only despite changed prompt, timing, seed and resolution', async () => {
    const { receipt, dependencies, request } = fixture()
    const result = await executeVideoDraftCompletion(request, dependencies)
    expect(dependencies.receipt).toHaveBeenCalledWith('/managed/draft.mp4')
    expect(dependencies.submit).toHaveBeenCalledWith(receipt, { draft_id: 'fixture-draft-1', resolution: '1080p', codec: 'auto' }, undefined)
    expect(result.videoDraft).toEqual({ ...receipt, status: 'final', sourcePath: '/managed/draft.mp4' })
    expect(receipt.status).toBe('draft')
    expect(result.outputPath).not.toBe(request.draftCompletion.outputPath)
  })
  it('BytePlus sends a draft_task and omits every automatically reused parameter', async () => {
    const { receipt, dependencies, request } = fixture('byteplus')
    await executeVideoDraftCompletion(request, dependencies)
    expect(dependencies.submit).toHaveBeenCalledWith(receipt, { model: 'dreamina-seedance-2-5-260628', content: [{ type: 'draft_task', draft_task: { id: 'fixture-draft-1' } }], resolution: '1080p', watermark: false }, undefined)
  })
  it.each(['account', 'expired', 'provider', 'quantity', 'final'] as const)('blocks %s mismatches before a paid submission', async failure => {
    const { receipt, dependencies, request } = fixture()
    if (failure === 'account') dependencies.accountFingerprint.mockResolvedValue('b'.repeat(64))
    if (failure === 'expired') { receipt.createdAt = new Date(Date.now() - 8 * 86400_000).toISOString(); receipt.expiresAt = new Date(Date.parse(receipt.createdAt) + 7 * 86400_000).toISOString() }
    if (failure === 'provider') request.draftCompletion.provider = 'byteplus'
    if (failure === 'quantity') request.quantity = 2
    if (failure === 'final') receipt.status = 'final'
    await expect(executeVideoDraftCompletion(request, dependencies)).rejects.toThrow()
    expect(dependencies.submit).not.toHaveBeenCalled()
    expect(dependencies.persist).not.toHaveBeenCalled()
  })
  it('a managed draft can be finalized from another generator without inventing a same-node restriction', async () => {
    const { dependencies, request } = fixture(); request.nodeId = 'another-video'
    await expect(executeVideoDraftCompletion(request, dependencies)).resolves.toMatchObject({ outputType: 'video' })
    expect(dependencies.submit).toHaveBeenCalledTimes(1)
  })
  it('does not download a provider response with a local or invalid media URL', async () => {
    const { receipt, dependencies, request } = fixture()
    dependencies.submit.mockResolvedValue({ requestId: 'final-1', url: 'file:///private/local.mp4', contentType: 'video/mp4' })
    await expect(executeVideoDraftCompletion(request, dependencies)).rejects.toThrow()
    expect(dependencies.persist).not.toHaveBeenCalled(); expect(receipt.status).toBe('draft')
  })
  it('a failure or cancellation retains the draft and never retries or persists a final', async () => {
    const { receipt, dependencies, request } = fixture()
    dependencies.submit.mockRejectedValue(new Error('provider failed'))
    await expect(executeVideoDraftCompletion(request, dependencies)).rejects.toThrow('provider failed')
    expect(dependencies.submit).toHaveBeenCalledTimes(1)
    expect(dependencies.persist).not.toHaveBeenCalled()
    expect(receipt.status).toBe('draft')
    const controller = new AbortController(); controller.abort()
    await expect(executeVideoDraftCompletion(request, dependencies, controller.signal)).rejects.toThrow()
    expect(dependencies.submit).toHaveBeenCalledTimes(1)
  })
})
