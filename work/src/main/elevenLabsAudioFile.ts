import { ELEVEN_DIRECT_OUTPUT_FORMATS } from '../shared/elevenLabsAudio'

export interface PlayableElevenAudio { bytes: Buffer; extension: '.mp3' | '.opus' | '.wav' }

/** ElevenLabs raw outputs are mono; PCM is signed 16-bit little endian. */
function wav(pcm: Buffer, sampleRate: number): Buffer {
  if (pcm.length % 2) throw new Error('ElevenLabs returned incomplete PCM audio.')
  const header = Buffer.alloc(44)
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8)
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34)
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

function compandedSample(byte: number, codec: 'ulaw' | 'alaw'): number {
  if (codec === 'ulaw') {
    const value = (~byte) & 255
    const sample = (((value & 15) << 3) + 132) << ((value >> 4) & 7)
    return value & 128 ? 132 - sample : sample - 132
  }
  const value = byte ^ 85
  const segment = (value >> 4) & 7
  let sample = ((value & 15) << 4) + 8
  if (segment) sample = (sample + 256) << (segment - 1)
  return value & 128 ? sample : -sample
}

export function playableElevenAudio(bytes: Buffer, outputFormat: string): PlayableElevenAudio {
  if (!bytes.length) throw new Error('ElevenLabs returned empty audio.')
  if (!(ELEVEN_DIRECT_OUTPUT_FORMATS as readonly string[]).includes(outputFormat)) throw new Error('Unknown ElevenLabs audio format.')
  const [codec, rate] = outputFormat.split('_')
  if (codec === 'mp3' || codec === 'opus' || codec === 'wav') return { bytes, extension: `.${codec}` }
  let pcm = bytes
  if (codec === 'ulaw' || codec === 'alaw') {
    pcm = Buffer.alloc(bytes.length * 2)
    bytes.forEach((byte, index) => pcm.writeInt16LE(compandedSample(byte, codec), index * 2))
  }
  return { bytes: wav(pcm, Number(rate)), extension: '.wav' }
}
