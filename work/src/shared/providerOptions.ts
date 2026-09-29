export const ELEVEN_AUDIO_OUTPUT_FORMATS = [
  'mp3_22050_32', 'mp3_44100_32', 'mp3_44100_64', 'mp3_44100_96', 'mp3_44100_128', 'mp3_44100_192',
  'pcm_8000', 'pcm_16000', 'pcm_22050', 'pcm_24000', 'pcm_44100', 'pcm_48000',
  'ulaw_8000', 'alaw_8000',
  'opus_48000_32', 'opus_48000_64', 'opus_48000_96', 'opus_48000_128', 'opus_48000_192',
] as const

export const ELEVEN_TEXT_NORMALIZATION_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const

/** Complete built-in voice-name catalog documented by fal-ai/elevenlabs/tts/eleven-v3.
 * The endpoint also accepts a custom ElevenLabs voice name or ID, so the UI keeps
 * a separate Custom option instead of presenting this finite list as exhaustive.
 */
export const ELEVEN_V3_BUILT_IN_VOICES = [
  'Rachel', 'Aria', 'Roger', 'Sarah', 'Laura', 'Charlie', 'George', 'Callum',
  'River', 'Liam', 'Charlotte', 'Alice', 'Matilda', 'Will', 'Jessica', 'Eric',
  'Chris', 'Brian', 'Daniel', 'Lily', 'Bill',
] as const

export const FISH_TTS_MODELS = [
  { value: 's2-pro', label: 'S2 Pro' },
  { value: 's1', label: 'S1' },
] as const

export const FISH_AUDIO_FORMATS = ['mp3', 'wav', 'pcm', 'opus'] as const
export const FISH_SAMPLE_RATES = [8000, 16000, 22050, 24000, 32000, 44100, 48000] as const
export const FISH_MP3_BITRATES = [64, 128, 192] as const
export const FISH_OPUS_BITRATES = [-1000, 24, 32, 48, 64] as const
export const FISH_LATENCY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'balanced', label: 'Balanced' },
] as const
