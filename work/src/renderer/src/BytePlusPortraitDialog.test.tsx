import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BytePlusPortraitDialog, type BytePlusPortraitDialogProps } from './BytePlusPortraitDialog'
import type { ImportedAsset, ServiceProfile } from '../../shared/types'

const asset: ImportedAsset = { id: 'fictional', name: 'Fictional Portrait.png', path: '/fixture/portrait.png', mimeType: 'image/png', url: '', createdAt: 'fixture' }
const profile: ServiceProfile = { id: 'fictional-A', provider: 'byteplus', accountIdentifier: 'Fictional account A', status: 'connected', createdAt: '', updatedAt: '' }
const base: BytePlusPortraitDialogProps = { asset, assets: [asset], context: { assetId: asset.id, mediaType: 'image', available: true, profile }, loading: false, busy: false, error: '', onAssetChange() {}, onClose() {}, onLink() {}, onRevoke() {} }
const render = (patch: Partial<BytePlusPortraitDialogProps> = {}) => renderToStaticMarkup(<BytePlusPortraitDialog {...base} {...patch} />)
const submitDisabled = (html: string) => /<button[^>]*type="submit"[^>]*disabled/.test(html)

describe('console-link dialog presents honest eligibility', () => {
  it('requires fresh explicit confirmation even when editing an existing linked asset', () => {
    const html = render({ context: { ...base.context!, binding: { version: 1, provider: 'byteplus', region: 'ap-southeast-1', profileId: profile.id, accountIdentifier: profile.accountIdentifier, assetId: 'asset-existing', mediaType: 'image', state: 'linked', linkedAt: '2026-10-12T00:00:00Z', sourceSha256: 'a'.repeat(64), consoleActiveConfirmed: true } } })
    expect(html).toContain('value="asset-existing"')
    expect(html).toContain('Not confirmed')
    expect(submitDisabled(html)).toBe(true)
    expect(html).toContain('BytePlus checks authorization when generating.')
    expect(html).not.toContain('Approved')
    expect(html).not.toContain('Verified')
    expect(html).toContain('Disable Link')
  })
  it('keeps an unavailable or loading profile non-submittable', () => {
    for (const patch of [{ context: { ...base.context!, available: false } }, { loading: true }, { context: undefined }]) {
      const html = render(patch)
      expect(submitDisabled(html)).toBe(true)
      expect(html).toMatch(/aria-label="Console Asset ID"[^>]*disabled/)
    }
    expect(render({ context: undefined })).toContain('Connect the intended BytePlus account')
  })
  it('does not invent an expiry and exposes provider failures as an alert', () => {
    const html = render({ error: 'This asset belongs to a different account.' })
    expect(html).toMatch(/aria-label="Known Expiry"[^>]*value=""/)
    expect(html).toContain('role="alert"')
    expect(html).toContain('different account')
  })
  it('does not allow dismissal or another save while the owned command is pending', () => {
    const html = render({ busy: true })
    expect(submitDisabled(html)).toBe(true)
    expect(html).toMatch(/aria-label="Close BytePlus Asset Link"[^>]*disabled/)
    expect(html).toContain('Saving…')
  })
})
