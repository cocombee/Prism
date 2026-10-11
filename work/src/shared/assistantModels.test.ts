import { describe, expect, it } from 'vitest'
import { curatedAssistantModels, isTextAssistantModelEligible, latestModelReleases, latestAssistantMenuModels } from './assistantModels'
import { latestAssistantModelGroups, resolveAssistantSelection } from './assistantProviderSelection'

describe('latest-only text Revamp menus', () => {
  const models = (...ids: string[]) => ids.map(id => ({ id, label: id }))
  it('keeps the latest generation and its available tiers without older releases or snapshots', () => {
    const menu = latestAssistantMenuModels(models('gpt-6.1-sol', 'gpt-6.1-luna', 'gpt-6.1-sol-2026-10-08', 'gpt-6-astra', 'gpt-4o', 'gpt-4o-2024-11-20'))
    expect(menu.map(model => model.id)).toEqual(['gpt-6.1-sol-2026-10-08', 'gpt-6.1-luna', 'gpt-6-astra'])
  })
  it('keeps the latest release of each named Claude family', () => {
    expect(latestAssistantMenuModels(models('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-sonnet-5', 'claude-3-5-sonnet')).map(model => model.id)).toEqual(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'])
  })
  it('removes non-text engines and keeps only the latest Gemini generation', () => {
    const menu = latestAssistantMenuModels(models('gemini-3.8-pro', 'gemini-3.8-flash', 'gemini-3.7-pro', 'gemini-3.8-nano-banana', 'lyria-3', 'imagen-5', 'gpt-live-1'))
    expect(menu.map(model => model.id)).toEqual(['gemini-3.8-pro', 'gemini-3.8-flash'])
  })
  it('retains exact provider routes and existing saved selections outside the reduced menu', () => {
    const catalogs = { openai: models('gpt-6.1-sol', 'gpt-6-astra'), omniroute: models('openai/gpt-6.1-sol', 'openai/gpt-6-astra') }
    expect(latestAssistantModelGroups(catalogs).flatMap(group => group.options.map(option => option.value))).toEqual(['omniroute::openai/gpt-6.1-sol', 'omniroute::openai/gpt-6-astra', 'openai::gpt-6.1-sol', 'openai::gpt-6-astra'])
    expect(resolveAssistantSelection('openai', 'gpt-6-astra', catalogs)).toEqual({ provider: 'openai', model: 'gpt-6-astra' })
  })
  it('does not invent generations for independently named unversioned models', () => {
    expect(latestAssistantMenuModels(models('custom-model', 'another-model')).map(model => model.id)).toEqual(['another-model', 'custom-model'])
  })
})

describe('latest direct prompt-model catalogs', () => {
  it('does not offer image-output GPT Image models as text assistants while retaining vision language models', () => {
    expect(isTextAssistantModelEligible({ id: 'gpt-image-2', label: 'GPT Image 2' })).toBe(false)
    expect(isTextAssistantModelEligible({ id: 'openai/gpt-image-2.5-sunburst', label: 'GPT Image 2.5 Sunburst' })).toBe(false)
    expect(isTextAssistantModelEligible({ id: 'gpt-5.5-vision', label: 'GPT 5.5 Vision' })).toBe(true)
  })

  it('deduplicates ISO-dated snapshots and ranks the newest snapshot without changing model IDs', () => {
    const models = [
      { id: 'gpt-5.5-2026-04-01', label: 'GPT 5.5' },
      { id: 'gpt-5.5-2026-05-01', label: 'GPT 5.5' },
      { id: 'gpt-5.5', label: 'GPT 5.5' },
      { id: 'gpt-5.4', label: 'GPT 5.4' },
      { id: 'gpt-5.3', label: 'GPT 5.3' },
    ]
    expect(latestModelReleases(models).map((model) => model.id)).toEqual(['gpt-5.5-2026-05-01', 'gpt-5.4', 'gpt-5.3'])
  })
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
