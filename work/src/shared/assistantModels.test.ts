import { describe, expect, it } from 'vitest'
import { curatedAssistantModels } from './assistantModels'

describe('latest direct prompt-model catalogs', () => {
  it('keeps only the newest three OpenAI models from the live catalog', () => {
    const live = [
      { id: 'gpt-5.4', label: 'GPT 5.4' },
      { id: 'gpt-5.5', label: 'GPT 5.5' },
      { id: 'gpt-5.6-luna', label: 'GPT 5.6 Luna' },
      { id: 'gpt-5.6-terra', label: 'GPT 5.6 Terra' },
      { id: 'gpt-5.6-sol', label: 'GPT 5.6 Sol' },
    ]
    expect(curatedAssistantModels('openai', live).map((model) => model.id)).toEqual(['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'])
  })

  it('keeps only the newest three Claude and Gemini models and drops older generations', () => {
    const claude = [
      { id: 'claude-opus-4.8', label: 'Claude Opus 4.8' },
      { id: 'claude-haiku-5', label: 'Claude Haiku 5' },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'claude-opus-5', label: 'Claude Opus 5' },
    ]
    const gemini = [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { id: 'gemini-3.6-pro', label: 'Gemini 3.6 Pro' },
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
    ]
    expect(curatedAssistantModels('anthropic', claude).map((model) => model.id)).toEqual(['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-5'])
    expect(curatedAssistantModels('google', gemini).map((model) => model.id)).toEqual(['gemini-3.7-flash', 'gemini-3.6-pro', 'gemini-3.5-flash'])
  })

  it('never fabricates a third model when a provider exposes only two', () => {
    const live = [{ id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' }, { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' }]
    expect(curatedAssistantModels('deepseek', live)).toHaveLength(2)
  })

  it('filters audio, realtime, speech, voice, TTS, transcription, whisper, sound, and music models before newest-three ranking', () => {
    const live = [
      { id: 'gpt-5.6-sol', label: 'GPT 5.6 Sol' },
      { id: 'gpt-5.6-realtime', label: 'GPT 5.6 Realtime' },
      { id: 'gpt-audio-2', label: 'ChatGPT Audio' },
      { id: 'gpt-5.5-speech', label: 'GPT Speech' },
      { id: 'voice-1', label: 'Voice' },
      { id: 'tts-1', label: 'Text To Speech' },
      { id: 'transcribe-1', label: 'Transcription' },
      { id: 'whisper-1', label: 'Whisper' },
      { id: 'sound-model', label: 'Sound' },
      { id: 'music-model', label: 'Music' },
      { id: 'gpt-5.5-vision', label: 'GPT 5.5 Vision' },
      { id: 'gpt-5.4-multimodal', label: 'GPT 5.4 Multimodal' },
    ]
    expect(curatedAssistantModels('openai', live).map((model) => model.id)).toEqual(['gpt-5.6-sol', 'gpt-5.5-vision', 'gpt-5.4-multimodal'])
  })
})
