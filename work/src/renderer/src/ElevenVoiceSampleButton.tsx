import { useLayoutEffect, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import type { ServiceModelAvailability } from '../../shared/types'
import { elevenVoicePreviewUrl } from '../../shared/elevenVoicePreview'
import { VoiceSamplePlayback, type VoiceSampleState } from './voiceSamplePlayback'

export function ElevenVoiceSampleButton({ voice, availability }: {
  voice?: NonNullable<ServiceModelAvailability['voices']>[number]
  availability?: ServiceModelAvailability
}) {
  const [state, setState] = useState<VoiceSampleState>('idle')
  const player = useRef<VoiceSamplePlayback | undefined>(undefined)
  const previewUrl = elevenVoicePreviewUrl(voice?.previewUrl)
  useLayoutEffect(() => {
    // Availability is owned by the active service profile; invalidation or
    // replacement also stops a sample whose ID is shared with another profile.
    const current = new VoiceSamplePlayback(() => new Audio(), setState)
    player.current = current
    setState('idle')
    return () => { current.stop(); if (player.current === current) player.current = undefined }
  }, [availability, voice?.id, previewUrl])
  const active = state === 'loading' || state === 'playing'
  return <>
    <button type="button" className="compact-settings compact-options" aria-label={active ? 'Stop voice sample' : 'Play voice sample'} disabled={!previewUrl} title={state === 'error' ? 'Could not play sample · try again' : previewUrl ? `Preview ${voice?.label || 'voice'}` : 'This voice has no catalog sample'} onClick={() => { if (active) player.current?.stop(); else if (previewUrl) void player.current?.play(previewUrl) }}>
      {active ? <Square size={14} /> : <Play size={14} />}
    </button>
    {state === 'error' && <span className="sr-only" role="status">Could not play sample · try again</span>}
  </>
}
