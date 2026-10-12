import { useEffect, useState } from 'react'
import { Image as ImageIcon, Link2, X } from 'lucide-react'
import type { BytePlusPortraitContext, BytePlusPortraitLinkRequest, ImportedAsset } from '../../shared/types'
import { appShortcutsSuppressed } from '../../shared/selectorSearch'
import { SimpleMenuSelect } from './NodeCardNext'

export interface BytePlusPortraitDialogProps {
  asset: ImportedAsset
  assets: ImportedAsset[]
  context?: BytePlusPortraitContext
  loading: boolean
  busy: boolean
  error: string
  onAssetChange: (asset: ImportedAsset) => void
  onLink: (request: BytePlusPortraitLinkRequest) => void
  onRevoke: () => void
  onClose: () => void
}

/** Records an existing console asset; provider authorization remains external. */
export function BytePlusPortraitDialog({ asset, assets, context, loading, busy, error, onAssetChange, onLink, onRevoke, onClose }: BytePlusPortraitDialogProps) {
  const [consoleAssetId, setConsoleAssetId] = useState(context?.binding?.assetId || '')
  const [expiresAt, setExpiresAt] = useState(context?.binding?.expiresAt || '')
  const [confirmed, setConfirmed] = useState(false)
  const profile = context?.profile
  const connected = context?.available && profile?.provider === 'byteplus' && profile.status === 'connected'
  const canLink = !loading && !busy && connected && confirmed && !!consoleAssetId.trim()
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !appShortcutsSuppressed()) { event.preventDefault(); event.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', close, true)
    return () => document.removeEventListener('keydown', close, true)
  }, [busy, onClose])
  return <div className="modal-backdrop asset-intake-backdrop" onMouseDown={() => { if (!busy) onClose() }}>
    <form className="asset-intake-modal" role="dialog" aria-modal="true" aria-labelledby="byteplus-portrait-title" onMouseDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onSubmit={event => {
      event.preventDefault()
      if (canLink && profile) onLink({ assetId: asset.id, profileId: profile.id, consoleAssetId, consoleActiveConfirmed: confirmed, ...(expiresAt.trim() ? { expiresAt: expiresAt.trim() } : {}) })
    }}>
      <header><span><Link2 size={17} /></span><div><strong id="byteplus-portrait-title">Link BytePlus Asset</strong><small>Existing console asset, exact source file</small></div><button type="button" aria-label="Close BytePlus Asset Link" disabled={busy} onClick={onClose}><X size={15} /></button></header>
      <div className="asset-intake-preview">{asset.mimeType.startsWith('image/') && asset.url ? <img src={asset.url} alt={asset.name} /> : <ImageIcon size={24} />}<span>{asset.name}</span></div>
      {assets.length > 1 && <label><span>Source File</span><SimpleMenuSelect fillTrack ariaLabel="Source File" value={asset.id} disabled={busy || loading} options={assets.map(item => ({ value: item.id, label: item.name }))} onChange={id => { const selected = assets.find(item => item.id === id); if (selected) onAssetChange(selected) }} /></label>}
      <label><span>BytePlus Account</span><input aria-label="BytePlus Account" readOnly value={loading ? 'Loading…' : profile?.accountIdentifier || 'No selected BytePlus account'} /></label>
      <label><span>Console Asset ID</span><input aria-label="Console Asset ID" autoFocus disabled={busy || loading || !connected} value={consoleAssetId} placeholder="asset-… or asset://…" onChange={event => { setConsoleAssetId(event.target.value); setConfirmed(false) }} /></label>
      <label><span>Known Expiry (Optional)</span><input aria-label="Known Expiry" disabled={busy || loading || !connected} value={expiresAt} placeholder="ISO date and time, if shown in the console" onChange={event => setExpiresAt(event.target.value)} /></label>
      <label><span>Console Confirmation</span><SimpleMenuSelect fillTrack ariaLabel="Console Confirmation" value={confirmed ? 'active' : 'unconfirmed'} disabled={busy || loading || !connected} options={[{ value: 'unconfirmed', label: 'Not confirmed' }, { value: 'active', label: 'This exact asset is Active in this account' }]} onChange={value => setConfirmed(value === 'active')} /></label>
      <label><span>{context?.binding?.state === 'revoked' ? 'Local link disabled. Review an eligible console asset before linking again.' : 'This saves a local link. BytePlus checks authorization when generating.'}</span></label>
      {!loading && !connected && <label><span>Connect the intended BytePlus account in Connections first.</span></label>}
      {error && <label role="alert"><span>{error}</span></label>}
      <footer>{context?.binding?.state === 'linked' && <button type="button" disabled={busy || loading} onClick={onRevoke}>Disable Link</button>}<button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={!canLink}>{busy ? 'Saving…' : 'Link Asset'}</button></footer>
    </form>
  </div>
}
