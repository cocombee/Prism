/** Pure shared Music schema/compiler. No credentials, transport or live state access. */
export type MusicModel = 'music_v1' | 'music_v2' | 'music_v2_5'
export const MUSIC_OUTPUT_FORMATS = ['auto', 'mp3_48000_128', 'mp3_48000_192', 'mp3_48000_240', 'mp3_48000_320', 'mp3_22050_32', 'mp3_24000_48', 'mp3_44100_32', 'mp3_44100_64', 'mp3_44100_96', 'mp3_44100_128', 'mp3_44100_192', 'pcm_8000', 'pcm_16000', 'pcm_22050', 'pcm_24000', 'pcm_32000', 'pcm_44100', 'pcm_48000', 'ulaw_8000', 'alaw_8000', 'opus_48000_32', 'opus_48000_64', 'opus_48000_96', 'opus_48000_128', 'opus_48000_192'] as const
export type MusicOutputFormat = typeof MUSIC_OUTPUT_FORMATS[number]
type V1Section = { section_name: string; positive_local_styles: string[]; negative_local_styles: string[]; duration_ms: number; lines: string[] }
export type V1Plan = { positive_global_styles: string[]; negative_global_styles: string[]; sections: V1Section[] }
type V2Chunk = { text: string; duration_ms: number; positive_styles: string[]; negative_styles?: string[]; context_adherence?: 'low' | 'medium' | 'high' }
export type V2Plan = { chunks: V2Chunk[] }
type Common = { outputFormat?: MusicOutputFormat }
export type MusicRequest = Common & (
  | { mode: 'prompt'; modelId: MusicModel; prompt: string; durationMs?: number; forceInstrumental?: boolean }
  | { mode: 'plan'; modelId: 'music_v1'; plan: V1Plan; seed?: number; respectSectionsDurations?: boolean }
  | { mode: 'plan'; modelId: 'music_v2' | 'music_v2_5'; plan: V2Plan; seed?: number }
)
export interface MusicCompilation { url: string; body: Record<string, unknown>; modelId: MusicModel; outputFormat: MusicOutputFormat; durationMs: number }
const object = (value: unknown, allowed: string[], name: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.keys(value).some(key => !allowed.includes(key))) throw Error(`Check the ${name} fields.`)
  return value as Record<string, unknown>
}
const integer = (value: unknown, min: number, max: number, name: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw Error(`${name} must be an integer from ${min} to ${max}.`)
  return value
}
const text = (value: unknown, max: number, name: string, required = false): string => {
  if (typeof value !== 'string' || Array.from(value).length > max || required && !value.trim()) throw Error(`Check ${name}.`)
  return value
}
const styles = (value: unknown, name: string, maximum = Infinity): string[] => {
  if (!Array.isArray(value) || value.length > maximum) throw Error(`Check ${name}; this style list is too long.`)
  return value.map(item => text(item, Infinity, name, true))
}
const lyricLines = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length > 30) throw Error('Use at most 30 lyric lines per section.')
  return value.map(line => text(line, 200, 'each lyric line'))
}
const boolean = (value: unknown, name: string): boolean => {
  if (typeof value !== 'boolean') throw Error(`Check ${name}.`)
  return value
}
export function compileMusicRequest(raw: unknown): MusicCompilation {
  const request = object(raw, ['mode', 'modelId', 'outputFormat', 'prompt', 'durationMs', 'forceInstrumental', 'plan', 'seed', 'respectSectionsDurations'], 'Music request')
  if (!['music_v1', 'music_v2', 'music_v2_5'].includes(request.modelId as string)) throw Error('Choose a supported Music model.')
  const modelId = request.modelId as MusicModel
  const outputFormat = (request.outputFormat === undefined ? 'auto' : request.outputFormat) as MusicOutputFormat
  if (!(MUSIC_OUTPUT_FORMATS as readonly unknown[]).includes(outputFormat)) throw Error('Choose a supported Music output format.')
  const body: Record<string, unknown> = { model_id: modelId }
  let durationMs: number
  if (request.mode === 'prompt') {
    if (request.plan !== undefined || request.seed !== undefined || request.respectSectionsDurations !== undefined) throw Error('Prompt generation cannot use a composition plan, seed or section-duration setting.')
    body.prompt = text(request.prompt, 4100, 'the Music prompt', true)
    durationMs = integer(request.durationMs === undefined ? 3000 : request.durationMs, 3000, 600000, 'Music duration')
    body.music_length_ms = durationMs
    if (request.forceInstrumental !== undefined) body.force_instrumental = boolean(request.forceInstrumental, 'instrumental mode')
  } else if (request.mode === 'plan') {
    if (request.prompt !== undefined || request.durationMs !== undefined || request.forceInstrumental !== undefined) throw Error('A composition plan owns its duration and cannot also use prompt or instrumental mode.')
    if (request.seed !== undefined) body.seed = integer(request.seed, 0, 2147483647, 'Music seed')
    let lengths: number[]
    if (modelId === 'music_v1') {
      const plan = object(request.plan, ['positive_global_styles', 'negative_global_styles', 'sections'], 'v1 composition plan')
      if (!Array.isArray(plan.sections) || !plan.sections.length || plan.sections.length > 30) throw Error('Use 1–30 Music sections.')
      const sections = plan.sections.map(raw => {
        const section = object(raw, ['section_name', 'positive_local_styles', 'negative_local_styles', 'duration_ms', 'lines'], 'v1 section')
        return { section_name: text(section.section_name, 100, 'the section name', true), positive_local_styles: styles(section.positive_local_styles, 'positive section styles'), negative_local_styles: styles(section.negative_local_styles, 'negative section styles'), duration_ms: integer(section.duration_ms, 3000, 120000, 'Section duration'), lines: lyricLines(section.lines) }
      })
      lengths = sections.map(section => section.duration_ms)
      body.composition_plan = { positive_global_styles: styles(plan.positive_global_styles, 'positive global styles'), negative_global_styles: styles(plan.negative_global_styles, 'negative global styles'), sections }
      if (request.respectSectionsDurations !== undefined) body.respect_sections_durations = boolean(request.respectSectionsDurations, 'section-duration adherence')
    } else {
      if (request.respectSectionsDurations !== undefined) throw Error('This setting applies only to Music v1; v2 section durations are enforced.')
      const plan = object(request.plan, ['chunks'], 'v2 composition plan')
      if (!Array.isArray(plan.chunks) || !plan.chunks.length || plan.chunks.length > 30) throw Error('Use 1–30 Music chunks.')
      const chunks = plan.chunks.map(raw => {
        const chunk = object(raw, ['text', 'duration_ms', 'positive_styles', 'negative_styles', 'context_adherence'], 'v2 chunk')
        const lyrics = text(chunk.text, Infinity, 'the chunk text')
        lyricLines(lyrics.split(/\r\n|\n|\r/))
        const marker = lyrics.match(/^\s*\[([^\]]*)\]/u)
        if (marker) text(marker[1], 100, 'the section name', true)
        if (chunk.context_adherence !== undefined && !['low', 'medium', 'high'].includes(chunk.context_adherence as string)) throw Error('Choose low, medium or high context adherence.')
        return { text: lyrics, duration_ms: integer(chunk.duration_ms, 3000, 120000, 'Chunk duration'), positive_styles: styles(chunk.positive_styles, 'positive chunk styles', 50), ...(chunk.negative_styles === undefined ? {} : { negative_styles: styles(chunk.negative_styles, 'negative chunk styles', 50) }), ...(chunk.context_adherence === undefined ? {} : { context_adherence: chunk.context_adherence }) }
      })
      lengths = chunks.map(chunk => chunk.duration_ms)
      body.composition_plan = { chunks }
    }
    durationMs = integer(lengths.reduce((sum, length) => sum + length, 0), 3000, 600000, 'Total Music duration')
  } else throw Error('Choose prompt or composition-plan generation.')
  return { url: `https://api.elevenlabs.io/v1/music?output_format=${encodeURIComponent(outputFormat)}`, body, modelId, outputFormat, durationMs }
}

