import { expect, it, vi } from 'vitest'
import { executeFalDraftRecovery } from './falDraftRecovery'
import { falDraftRequestCreatedAt, createVideoDraftReceipt, assertVideoDraftReceipt } from '../shared/videoDraft'
const endpointId = 'bytedance/seedance-2.5/text-to-video'
const submitted = Date.now() - 600000
const hex = submitted.toString(16).padStart(12, '0')
const requestId = `${hex.slice(0,8)}-${hex.slice(8)}-7000-8000-000000000001`
const request = { nodeId: 'video', kind: 'video-generator' as const, quantity: 1, falDraftRecovery: { endpointId, requestId } }
const setup = () => ({
  assertCurrent: vi.fn(), accountFingerprint: vi.fn(async () => 'a'.repeat(64)),
  result: vi.fn(async () => ({ requestId, data: { video: { url: 'https://v3b.fal.media/recovered.mp4' }, draft_id: 'draft_' + 'a'.repeat(484) } })),
  persist: vi.fn(async () => ({ path: '/managed/draft.mp4', url: 'prism://draft.mp4' })),
})
it('recovers a long opaque draft token using an existing request, preserving its original deadline', async () => {
  const deps = setup(), result = await executeFalDraftRecovery(request, deps)
  expect(deps.result).toHaveBeenCalledOnce(); expect(deps.persist).toHaveBeenCalledOnce()
  expect(result.videoDraft?.draftId).toHaveLength(490)
  expect(result.videoDraft?.createdAt).toBe(new Date(submitted).toISOString())
  expect(result.videoDraft?.expiresAt).toBe(new Date(submitted + 7*86400000).toISOString())
  expect(falDraftRequestCreatedAt(requestId)).toBe(new Date(submitted).toISOString())
})
it('uses the published 8192-character completion limit and rejects a larger token', () => {
  const receipt = createVideoDraftReceipt('fal', endpointId, 'a'.repeat(8192), 'video', 'a'.repeat(64), new Date().toISOString())
  expect(() => assertVideoDraftReceipt(receipt)).not.toThrow()
  expect(() => assertVideoDraftReceipt({ ...receipt, draftId: 'a'.repeat(8193) })).toThrow('valid linked draft')
})
it.each(['00000000-0000-4000-8000-000000000001', '00000000-0000-7000-8000-000000000001'])('rejects invalid or expired IDs before any account/result read', async id => {
  const deps = setup()
  await expect(executeFalDraftRecovery({ ...request, falDraftRecovery: { endpointId, requestId: id } }, deps)).rejects.toThrow()
  expect(deps.result).not.toHaveBeenCalled(); expect(deps.accountFingerprint).not.toHaveBeenCalled()
})
it('rejects a different returned request identity before persisting', async () => {
  const deps = setup(); deps.result.mockResolvedValue({ requestId: 'different', data: { video: { url: 'https://v3b.fal.media/recovered.mp4' }, draft_id: 'draft' } })
  await expect(executeFalDraftRecovery(request, deps)).rejects.toThrow('identity changed')
  expect(deps.persist).not.toHaveBeenCalled()
})
it('does not persist a malformed token or local media URL', async () => {
  const deps = setup(); deps.result.mockResolvedValue({ requestId, data: { video: { url: 'file:///private/result.mp4' }, draft_id: 'draft' } })
  await expect(executeFalDraftRecovery(request, deps)).rejects.toThrow('HTTP')
  expect(deps.persist).not.toHaveBeenCalled()
})
it('does not persist after cancellation during an existing result read', async () => {
  const deps = setup(), controller = new AbortController()
  const original = deps.result.getMockImplementation()!
  deps.result.mockImplementation(async () => { const result = await original(); controller.abort(); return result })
  await expect(executeFalDraftRecovery(request, deps, controller.signal)).rejects.toThrow()
  expect(deps.persist).not.toHaveBeenCalled()
})
