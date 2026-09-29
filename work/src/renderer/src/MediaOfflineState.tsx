import { FileAudio, FileVideo, ImageOff, Unlink } from 'lucide-react'
import type { AssetMediaFamily } from '../../shared/assetInteraction'

export type MediaOfflineVisualState = 'offline' | 'finding' | 'found'

interface MediaOfflineStateProps {
  mediaFamily: AssetMediaFamily
  state: MediaOfflineVisualState
  findingDots?: number
  compact?: boolean
  showFind?: boolean
  onFind: () => void
}

export function MediaOfflineState({ mediaFamily, state, findingDots, compact = false, showFind = true, onFind }: MediaOfflineStateProps) {
  const Icon = mediaFamily === 'video' ? FileVideo : mediaFamily === 'audio' ? FileAudio : ImageOff
  const dots = Math.min(3, Math.max(1, findingDots || 1))
  const status = state === 'finding' ? `Finding${'.'.repeat(dots)}` : state === 'found' ? 'Found' : 'Media Offline'
  const label = state === 'finding' ? status : 'Relink'
  return (
    <div className={`media-offline-state is-${state}${compact ? ' is-compact' : ''}`} role="status" aria-live="polite">
      <Icon aria-label={mediaFamily === 'image' ? 'Broken image' : mediaFamily === 'video' ? 'Broken video' : 'Broken audio'} />
      <strong>{status}</strong>
      {showFind && !compact && <button type="button" aria-label="Relink missing media" disabled={state === 'finding'} onClick={onFind}><Unlink size={13} />{label}</button>}
    </div>
  )
}
