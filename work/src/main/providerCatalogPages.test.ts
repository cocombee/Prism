import { describe, expect, it, vi } from 'vitest'
import { readProviderCatalogPages } from './providerCatalogPages'

const initialGoogle = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'
const initialClaude = 'https://api.anthropic.com/v1/models?limit=1000'
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('provider catalog pagination', () => {
  it('reads every Google page, retains first occurrence of each exact ID and encodes the cursor on the same endpoint', async () => {
    const request = vi.fn().mockResolvedValueOnce(response({ models: [{ name: 'models/gemini-old' }], nextPageToken: 'cursor/+=&https://evil.invalid' }))
      .mockResolvedValueOnce(response({ models: [{ name: 'models/gemini-new' }, { name: 'models/gemini-old' }] }))
    const body = await readProviderCatalogPages({ provider: 'google', initialUrl: initialGoogle, request })
    expect(body.models).toEqual([{ name: 'models/gemini-old' }, { name: 'models/gemini-new' }])
    const next = new URL(request.mock.calls[1][0])
    expect(next.origin + next.pathname).toBe('https://generativelanguage.googleapis.com/v1beta/models')
    expect(next.searchParams.get('pageSize')).toBe('1000')
    expect(next.searchParams.get('pageToken')).toBe('cursor/+=&https://evil.invalid')
  })

  it('reads Anthropic after_id pages without changing model records', async () => {
    const request = vi.fn().mockResolvedValueOnce(response({ data: [{ id: 'claude-current', display_name: 'Current' }], has_more: true, last_id: 'claude-current' }))
      .mockResolvedValueOnce(response({ data: [{ id: 'claude-saved', display_name: 'Saved' }], has_more: false, last_id: 'claude-saved' }))
    const body = await readProviderCatalogPages({ provider: 'anthropic', initialUrl: initialClaude, request })
    expect(body.data).toEqual([{ id: 'claude-current', display_name: 'Current' }, { id: 'claude-saved', display_name: 'Saved' }])
    expect(new URL(request.mock.calls[1][0]).searchParams.get('after_id')).toBe('claude-current')
    expect(new URL(request.mock.calls[1][0]).searchParams.get('limit')).toBe('1000')
  })

  it('preserves a genuinely empty catalog without inventing static models', async () => {
    const request = vi.fn().mockResolvedValue(response({ models: [] }))
    expect((await readProviderCatalogPages({ provider: 'google', initialUrl: initialGoogle, request })).models).toEqual([])
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('rejects second-page errors rather than returning a verified partial catalog', async () => {
    const request = vi.fn().mockResolvedValueOnce(response({ data: [{ id: 'claude-current' }], has_more: true, last_id: 'claude-current' }))
      .mockResolvedValueOnce(response({ error: { message: 'access unavailable' } }, 403))
    await expect(readProviderCatalogPages({ provider: 'anthropic', initialUrl: initialClaude, request })).rejects.toMatchObject({ message: 'access unavailable', status: 403 })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it.each([
    { provider: 'anthropic' as const, initialUrl: initialClaude, body: { data: [{ id: 'model' }], has_more: true } },
    { provider: 'google' as const, initialUrl: initialGoogle, body: { models: [], nextPageToken: 42 } },
    { provider: 'google' as const, initialUrl: initialGoogle, body: { models: null } },
  ])('rejects invalid catalog pagination $provider $body', async ({ provider, initialUrl, body }) => {
    await expect(readProviderCatalogPages({ provider, initialUrl, request: vi.fn().mockResolvedValue(response(body)) })).rejects.toThrow(/invalid|missing|malformed/i)
  })

  it('rejects a repeated cursor without looping or returning partial models', async () => {
    const request = vi.fn(async () => response({ models: [{ name: 'models/gemini' }], nextPageToken: 'same-token' }))
    await expect(readProviderCatalogPages({ provider: 'google', initialUrl: initialGoogle, request })).rejects.toThrow(/repeated|pagination/i)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('fails explicitly at the page bound rather than silently truncating', async () => {
    let page = 0
    const request = vi.fn(async () => response({ models: [{ name: `models/gemini-${++page}` }], nextPageToken: String(page) }))
    await expect(readProviderCatalogPages({ provider: 'google', initialUrl: initialGoogle, request, maxPages: 2 })).rejects.toThrow(/page limit/i)
    expect(request).toHaveBeenCalledTimes(2)
  })
})
