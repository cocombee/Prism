import { describe, expect, it, vi } from 'vitest'
import { prepareDirectImageInputs, assertDirectImageUrl } from './directImageInputs'
const dependencies = () => ({ managed: vi.fn(async (path: string) => path), size: vi.fn(async () => 3), read: vi.fn(async () => new Uint8Array([1, 2, 3])), mime: () => 'image/png', assertCurrent: vi.fn() })
describe('bounded direct-image physical input preparation', () => {
  it('preserves remote/local input identity and order without any remote media read', async () => {
    const deps = dependencies(), references = [{ role: 'reference' as const, url: 'https://images.example/a.png?signature=keep' }, { role: 'character' as const, path: '/managed/b.png', url: 'prism-asset://opaque' }]
    const inputs = await prepareDirectImageInputs(references, 16, deps)
    expect(inputs.map(input => input.reference)).toEqual(references); expect(inputs[0].url).toBe(references[0].url); expect(deps.read).toHaveBeenCalledExactlyOnceWith('/managed/b.png'); expect(inputs[1].path).toBe('/managed/b.png')
  })
  it.each(['http://images.example/a.png', 'https://localhost/a', 'https://127.0.0.1/a', 'https://10.2.3.4/a', 'https://169.254.169.254/a', 'https://172.18.0.1/a', 'https://user:password@images.example/a', 'file:///tmp/a.png', 'https://[::1]/a', ' https://images.example/a'])('rejects unsupported/private URI %s', value => expect(() => assertDirectImageUrl(value)).toThrow())
  it('checks all URL/type/count entries before any file read', async () => {
    for (const refs of [Array.from({ length: 17 }, () => ({ role: 'reference' as const, path: '/managed/a.png' })), [{ role: 'reference' as const, path: '/managed/a.png' }, { role: 'reference' as const, url: 'https://localhost/a' }], [{ role: 'reference' as const, path: '/managed/a.png', mediaType: 'video' as const }]]) {
      const deps = dependencies(); await expect(prepareDirectImageInputs(refs, 16, deps)).rejects.toThrow(); expect(deps.read).not.toHaveBeenCalled()
    }
  })
  it('retains inline image bytes and never accepts malformed/canonicalization-changing base64', async () => {
    const deps = dependencies(), url = 'data:image/png;base64,AQID'
    const [input] = await prepareDirectImageInputs([{ role: 'reference', url }], 16, deps)
    expect(input.url).toBe(url); expect([...input.bytes!]).toEqual([1, 2, 3]); expect(input.mimeType).toBe('image/png'); expect(deps.read).not.toHaveBeenCalled()
    for (const invalid of ['data:image/png;base64,AQI', 'data:image/png;base64,AB==', 'data:image/svg+xml;base64,AQID', 'data:image/png;base64,']) await expect(prepareDirectImageInputs([{ role: 'reference', url: invalid }], 16, deps)).rejects.toThrow()
  })
  it('rejects unavailable managed images, wrong file types, oversized/changing files and obsolete owners', async () => {
    const ref = [{ role: 'reference' as const, path: '/managed/a.png' }]
    let deps = dependencies(); deps.managed.mockRejectedValue(new Error('Relink managed image')); await expect(prepareDirectImageInputs(ref, 16, deps)).rejects.toThrow(/Relink/); expect(deps.read).not.toHaveBeenCalled()
    deps = dependencies(); deps.mime = () => 'video/mp4'; await expect(prepareDirectImageInputs(ref, 16, deps)).rejects.toThrow(/PNG/); expect(deps.read).not.toHaveBeenCalled()
    deps = dependencies(); deps.size.mockResolvedValue(51 * 1024 * 1024); await expect(prepareDirectImageInputs(ref, 16, deps)).rejects.toThrow(/size/); expect(deps.read).not.toHaveBeenCalled()
    deps = dependencies(); deps.read.mockResolvedValue(new Uint8Array([1])); await expect(prepareDirectImageInputs(ref, 16, deps)).rejects.toThrow(/changed/)
    deps = dependencies(); deps.assertCurrent.mockImplementation(() => { throw new Error('Obsolete owner') }); await expect(prepareDirectImageInputs(ref, 16, deps)).rejects.toThrow(/owner/); expect(deps.read).not.toHaveBeenCalled()
  })
})
