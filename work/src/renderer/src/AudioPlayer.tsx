import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FolderOpen, Play, Square } from 'lucide-react'
import { audioWaveformPeaks, readAudioWaveformBytes } from './audioWaveform'

export interface AudioPlayerProps {
  src: string
  activeIndex?: number
  total?: number
  onPrevious?: () => void
  onNext?: () => void
  onReveal?: () => void
}

export function AudioPlayer({ src, activeIndex = 0, total = 1, onPrevious, onNext, onReveal }: AudioPlayerProps) {
  const audio = useRef<HTMLAudioElement>(null), waveform = useRef<HTMLSpanElement>(null), attempt = useRef(0)
  const [playing, setPlaying] = useState(false), [progress, setProgress] = useState(0), [duration, setDuration] = useState(0)
  const [peaks, setPeaks] = useState<number[]>([]), [bars, setBars] = useState(32), [error, setError] = useState('')
  useLayoutEffect(() => {
    const element = audio.current; attempt.current++; setPlaying(false); setProgress(0); setDuration(0); setError('')
    return () => { attempt.current++; element?.pause() }
  }, [src])
  useLayoutEffect(() => {
    const element = waveform.current
    if (!element) return
    const observer = new ResizeObserver(() => setBars(Math.max(1, Math.min(52, Math.floor(element.clientWidth / 4)))))
    observer.observe(element); return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const controller = new AbortController(); setPeaks([])
    void (async () => {
      try {
        const bytes = await readAudioWaveformBytes(src, controller.signal)
        controller.signal.throwIfAborted()
        const decoded = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes)
        if (controller.signal.aborted) return
        // Bound decoded envelope traversal as well; playback still works when waveform cannot be inspected.
        if (decoded.length * decoded.numberOfChannels > 64 * 1024 * 1024) return
        const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i))
        setPeaks(audioWaveformPeaks(channels, 128))
      } catch { /* Native playback is independent of waveform inspection. */ }
    })()
    return () => controller.abort()
  }, [src])
  const stop = () => { attempt.current++; const element = audio.current; element?.pause(); if (element) element.currentTime = 0; setPlaying(false); setProgress(0) }
  const seek = (fraction: number) => {
    const element = audio.current
    if (!element || !Number.isFinite(element.duration) || element.duration <= 0) return
    element.currentTime = Math.max(0, Math.min(1, fraction)) * element.duration
    setProgress(element.currentTime / element.duration)
  }
  const play = async () => {
    const element = audio.current; if (!element) return
    const token = ++attempt.current; setError(''); setPlaying(true)
    if (element.ended) element.currentTime = 0
    try { await element.play(); if (attempt.current !== token) element.pause() }
    catch { if (attempt.current === token) { setPlaying(false); setError('Could not play audio. Try again.') } }
  }
  const visiblePeaks = peaks.length ? audioWaveformPeaks([Float32Array.from(peaks)], bars) : []
  return <div className={`node-audio-player node-audio-player-inline nodrag${total > 1 ? ' has-navigation' : ''}`} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    <audio key={src} ref={audio} src={src} preload="metadata" onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={event => { const element = event.currentTarget; setProgress(element.duration > 0 ? element.currentTime / element.duration : 0) }} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setError('Could not play audio. Check the source file.') }} />
    <button type="button" className="compact-settings compact-options" aria-label={playing ? 'Stop Audio' : 'Play Audio'} data-tooltip={playing ? 'Stop' : 'Play'} onClick={event => { event.stopPropagation(); if (playing) stop(); else void play() }}>{playing ? <Square size={14} /> : <Play size={14} />}</button>
    <span ref={waveform} className="node-audio-waveform" role="slider" tabIndex={0} aria-label="Seek Audio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-disabled={!duration} data-waveform-ready={peaks.length > 0} onClick={event => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); seek((event.clientX - rect.left) / rect.width) }} onKeyDown={event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); seek(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : progress + (event.key === 'ArrowRight' ? 1 : -1) * 5 / (duration || 1)) }
    }}>{visiblePeaks.map((peak, index) => <i key={index} aria-hidden="true" className={index / visiblePeaks.length < progress ? 'is-played' : undefined} style={{ height: `${Math.max(2, peak * 26)}px` }} />)}</span>
    {total > 1 && <div className="result-carousel audio-inline-navigation nodrag"><button type="button" data-tooltip="Previous Result" aria-label="Previous Result" disabled={activeIndex === 0} onClick={event => { event.stopPropagation(); stop(); onPrevious?.() }}><ChevronLeft size={11} /></button><span>{activeIndex + 1}/{total}</span><button type="button" data-tooltip="Next Result" aria-label="Next Result" disabled={activeIndex >= total - 1} onClick={event => { event.stopPropagation(); stop(); onNext?.() }}><ChevronRight size={11} /></button></div>}
    {onReveal && <div className="generated-media-actions audio-inline-folder nodrag"><button type="button" data-tooltip="Show In Finder" aria-label="Show Audio In Finder" onClick={event => { event.stopPropagation(); onReveal() }}><FolderOpen size={13} /></button></div>}
    {error && <span className="sr-only" role="status">{error}</span>}
  </div>
}
