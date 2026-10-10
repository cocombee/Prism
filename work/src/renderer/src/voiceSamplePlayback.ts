export interface VoiceSampleAudio {
  preload: string
  src: string
  onended: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  play(): Promise<void>
  pause(): void
  removeAttribute(name: string): void
  load(): void
}
export type VoiceSampleState = 'idle' | 'loading' | 'playing' | 'error'

/** Explicit-click preview only. Late play promises cannot revive an old voice. */
export class VoiceSamplePlayback {
  private audio?: VoiceSampleAudio
  constructor(private readonly createAudio: () => VoiceSampleAudio, private readonly changed: (state: VoiceSampleState) => void) {}
  stop(): void {
    const audio = this.audio
    this.audio = undefined
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    this.changed('idle')
  }
  async play(url: string): Promise<void> {
    this.stop()
    const audio = this.createAudio()
    this.audio = audio
    audio.preload = 'none'
    audio.src = url
    audio.onended = () => { if (this.audio === audio) this.stop() }
    audio.onerror = () => { if (this.audio === audio) { this.stop(); this.changed('error') } }
    this.changed('loading')
    try {
      await audio.play()
      if (this.audio === audio) this.changed('playing')
      else audio.pause()
    } catch {
      if (this.audio === audio) { this.stop(); this.changed('error') }
    }
  }
}
