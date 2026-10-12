import type { MediaReferenceMode } from '../../shared/types'
import { mediaReferenceModes, type ReferenceMediaType } from '../../shared/mediaReferenceModes'

export function MediaReferenceModes({ type, value = 'reference', onChange }: { type: ReferenceMediaType; value?: MediaReferenceMode; onChange: (mode: MediaReferenceMode) => void }) {
  return <div className="media-reference-modes nodrag">
    <div className="storyboard-transition-choice" role="radiogroup" aria-label={`${type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'Image'} reference mode`}>
      {mediaReferenceModes(type).map(mode => <button key={mode.value} type="button" role="radio" aria-checked={value === mode.value} className={`storyboard-transition-option ${value === mode.value ? 'is-active' : ''}`} data-tooltip={mode.tooltip} onClick={() => onChange(mode.value)}>{mode.label}</button>)}
    </div>
  </div>
}
