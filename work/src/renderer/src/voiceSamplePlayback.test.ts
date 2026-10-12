import { describe, expect, it, vi } from 'vitest'
import { VoiceSamplePlayback, type VoiceSampleAudio, type VoiceSampleState } from './voiceSamplePlayback'
function fixture() {
  const states: VoiceSampleState[] = [], samples: VoiceSampleAudio[] = []
  const pending: Array<{ resolve(): void; reject(error: Error): void }> = []
  const create = vi.fn(() => {
    const audio: VoiceSampleAudio = { preload: '', src: '', onended: null, onerror: null,
      play: vi.fn(() => new Promise<void>((resolve, reject) => pending.push({ resolve, reject }))),
      pause: vi.fn(), removeAttribute: vi.fn(), load: vi.fn() }
    samples.push(audio); return audio
  })
  return { player: new VoiceSamplePlayback(create, (state) => states.push(state)), create, states, samples, pending }
}
describe('explicit catalog voice sample playback', () => {
  it('constructs no media until Play; sends only a sample URL and releases finished media', async () => {
    const f = fixture()
    expect(f.create).not.toHaveBeenCalled()
    const play = f.player.play('https://cdn.example.com/voice.mp3')
    expect(f.samples[0].src).toBe('https://cdn.example.com/voice.mp3')
    expect(f.samples[0].preload).toBe('none')
    expect(f.samples[0].play).toHaveBeenCalledOnce()
    f.pending[0].resolve(); await play
    expect(f.states.at(-1)).toBe('playing')
    f.samples[0].onended!(new Event('ended'))
    expect(f.states.at(-1)).toBe('idle')
    expect(f.samples[0].removeAttribute).toHaveBeenCalledWith('src')
  })
  it('detaches the old voice; late resolution cannot replace the new sample', async () => {
    const f = fixture(), first = f.player.play('https://cdn.example.com/first.mp3')
    const second = f.player.play('https://cdn.example.com/second.mp3')
    expect(f.samples[0].onended).toBeNull(); expect(f.samples[0].onerror).toBeNull()
    f.pending[1].resolve(); await second
    const current = f.states.length
    f.pending[0].resolve(); await first
    expect(f.states).toHaveLength(current)
    expect(f.states.at(-1)).toBe('playing')
    expect(f.samples[0].pause).toHaveBeenCalledTimes(2)
    f.player.stop()
    expect(f.samples[1].pause).toHaveBeenCalledOnce()
    expect(f.states.at(-1)).toBe('idle')
  })
  it('ignores old play rejection after cancellation, unmount, account or voice change', async () => {
    const f = fixture(), play = f.player.play('https://cdn.example.com/voice.mp3')
    f.player.stop(); const current = f.states.length
    f.pending[0].reject(new Error('cancelled')); await play
    expect(f.states).toHaveLength(current)
    expect(f.states.at(-1)).toBe('idle')
  })
  it('reports failure, releases media and allows explicit retry', async () => {
    const f = fixture(), play = f.player.play('https://cdn.example.com/voice.mp3')
    f.pending[0].reject(new Error('offline')); await play
    expect(f.states.at(-1)).toBe('error'); expect(f.samples[0].load).toHaveBeenCalledOnce()
    const retry = f.player.play('https://cdn.example.com/voice.mp3')
    f.pending[1].resolve(); await retry
    f.samples[1].onerror!(new Event('error'))
    expect(f.states.at(-1)).toBe('error')
  })
})

it('stops another voice preview across footer and browser owners before playing, including late promises', async () => {
 const first=fixture(),second=fixture();const one=first.player.play('https://cdn.example.com/one.mp3');const two=second.player.play('https://cdn.example.com/two.mp3')
 expect(first.samples[0].pause).toHaveBeenCalledOnce();expect(first.states.at(-1)).toBe('idle')
 second.pending[0].resolve();await two;first.pending[0].resolve();await one
 expect(second.states.at(-1)).toBe('playing');expect(first.states.at(-1)).toBe('idle');second.player.stop()
})
