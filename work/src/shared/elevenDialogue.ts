import type { GenerationRequest, ServiceModelAvailability, StudioNodeData } from './types'
export interface ElevenDialogueTurn { id: string; voiceId: string; text: string }
export interface ElevenVoiceSegment { voice_id: string; start_time_seconds: number; end_time_seconds: number; character_start_index: number; character_end_index: number; dialogue_input_index: number }
export const ELEVEN_DIALOGUE_MAX_CHARACTERS = 2000
export const ELEVEN_DIALOGUE_MAX_VOICES = 10
/** A provider declaration takes precedence; unknown future versions are not guessed. */
export function elevenSupportsDialogue(id?: string, model?: ServiceModelAvailability['models'][number]): boolean {
  return model?.supportsDialogue ?? ['eleven_v3', 'eleven_v4'].includes(id || '')
}
export function isElevenDialogue(request: Pick<GenerationRequest, 'kind' | 'voiceEngine' | 'elevenSpeechMode'>): boolean {
  return request.kind === 'voiceover' && request.voiceEngine === 'elevenlabs-direct' && request.elevenSpeechMode === 'dialogue'
}
export function dialoguePromptText(turns: ElevenDialogueTurn[] | undefined): string {
  return (turns || []).map(turn => turn.text).join('\n\n')
}
/** Switching modes preserves both documents and seeds the dialogue exactly once. */
export function elevenSpeechModePatch(data: StudioNodeData, mode: 'speech' | 'dialogue', id: () => string): Partial<StudioNodeData> {
  return { elevenSpeechMode: mode, ...(mode === 'dialogue' && data.elevenDialogueTurns === undefined ? { elevenDialogueTurns: [{ id: id(), voiceId: data.voice || '', text: data.prompt || '' }] } : {}), error: undefined }
}
export function compileElevenDialogueInputs(request: GenerationRequest, model?: ServiceModelAvailability['models'][number]): Array<{ text: string; voice_id: string }> {
  if (!request.voiceModelId?.trim()) throw new Error('Choose a live ElevenLabs speech model.')
  if (model && model.id !== request.voiceModelId) throw new Error('The selected ElevenLabs model is unavailable; choose another live model.')
  if (model && !elevenSupportsDialogue(request.voiceModelId, model)) throw new Error('This model does not have verified Dialogue support. Choose a supported model or Speech mode.')
  const turns = request.elevenDialogueTurns
  if (!Array.isArray(turns) || !turns.length) throw new Error('Add a dialogue turn before generating.')
  if (turns.length > ELEVEN_DIALOGUE_MAX_CHARACTERS) throw new Error('Too many dialogue turns for one request.')
  const ids = new Set<string>(), voices = new Set<string>(); let characters = 0, wireBudget = 0
  const inputs = turns.map((turn, index) => {
    if (!turn || typeof turn.id !== 'string' || !turn.id || turn.id.length > 1024 || ids.has(turn.id)) throw new Error('Dialogue turns need distinct saved identities.')
    ids.add(turn.id)
    if (typeof turn.text !== 'string' || !turn.text.trim()) throw new Error(`Add speech text to turn ${index + 1}.`)
    if (typeof turn.voiceId !== 'string' || !turn.voiceId.trim()) throw new Error(`Choose a voice for turn ${index + 1}.`)
    const voice_id = turn.voiceId.trim()
    if (voice_id.length > 1024) throw new Error('The voice ID is too long.')
    wireBudget += (turn.text.length + voice_id.length) * 6 + 32
    if (wireBudget > 1024 * 1024) throw new Error('The dialogue request is too large.')
    voices.add(voice_id)
    characters += Array.from(turn.text).length
    return { text: turn.text, voice_id }
  })
  if (voices.size > ELEVEN_DIALOGUE_MAX_VOICES) throw new Error(`One dialogue request supports at most ${ELEVEN_DIALOGUE_MAX_VOICES} unique voices.`)
  if (characters > ELEVEN_DIALOGUE_MAX_CHARACTERS || model?.maxTextLength && characters > model.maxTextLength) throw new Error(`Keep one dialogue request within ${Math.min(ELEVEN_DIALOGUE_MAX_CHARACTERS, model?.maxTextLength || ELEVEN_DIALOGUE_MAX_CHARACTERS)} text characters; split it explicitly before generating.`)
  return inputs
}
