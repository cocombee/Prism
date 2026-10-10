import { describe, expect, it } from 'vitest'
import { omniRouteChatRequest, omniRouteModelOptions, omniRouteRewriteOutput } from './omniRouteModels'

describe('OmniRoute text model integration', () => {
  it('keeps every eligible root text release per upstream owner', () => {
    const models = omniRouteModelOptions([
      { id: 'cc/claude-opus-5', name: 'cc/Claude Opus 5', owned_by: 'claude', parent: null, output_modalities: ['text'] },
      { id: 'cc/claude-sonnet-5', name: 'cc/Claude Sonnet 5', owned_by: 'claude', parent: null, output_modalities: ['text'] },
      { id: 'cc/claude-fable-5', name: 'cc/Claude Fable 5', owned_by: 'claude', parent: null, output_modalities: ['text'] },
      { id: 'cc/claude-opus-4-8', name: 'cc/Claude Opus 4.8', owned_by: 'claude', parent: null, output_modalities: ['text'] },
      { id: 'claude/claude-opus-5', name: 'claude/Claude Opus 5', owned_by: 'claude', parent: 'cc/claude-opus-5', output_modalities: ['text'] },
      { id: 'cx/gpt-5.6-sol', name: 'cx/GPT 5.6 Sol', owned_by: 'codex', parent: null, output_modalities: ['text'] },
      { id: 'cx/gpt-5.6-terra', name: 'cx/GPT 5.6 Terra', owned_by: 'codex', parent: null, output_modalities: ['text'] },
      { id: 'cx/gpt-5.6-luna', name: 'cx/GPT 5.6 Luna', owned_by: 'codex', parent: null, output_modalities: ['text'] },
      { id: 'cx/gpt-5.5', name: 'cx/GPT 5.5', owned_by: 'codex', parent: null, output_modalities: ['text'] },
      { id: 'gemini/gemini-3.7-flash', name: 'gemini-3.7-flash', owned_by: 'gemini', parent: null, output_modalities: ['text'] },
      { id: 'gemini/gemini-3.6-pro', name: 'gemini-3.6-pro', owned_by: 'gemini', parent: null, output_modalities: ['text'] },
      { id: 'gemini/gemini-3.5-flash', name: 'gemini-3.5-flash', owned_by: 'gemini', parent: null, output_modalities: ['text'] },
      { id: 'gemini/gemini-2.5-flash', name: 'gemini-2.5-flash', owned_by: 'gemini', parent: null, output_modalities: ['text'] },
      { id: 'pepper/pepper-1', name: 'Pepper (chipotle AI)', owned_by: 'pepper', parent: null, output_modalities: ['text'] },
      { id: 'tllm/GPT_5_2', name: 'GPT 5.2 (the Old LLM)', owned_by: 'the-old-llm', parent: null, output_modalities: ['text'] },
      { id: 'codex/gpt-5.6-sol', name: 'codex/GPT 5.6 Sol', owned_by: 'codex', parent: null, output_modalities: ['image'] },
      { id: 'no-think/cc/claude-opus-5', name: 'no-think/Claude Opus 5', owned_by: 'claude', parent: null, output_modalities: ['text'] },
      { id: 'auto/best-chat', name: 'auto/best-chat', owned_by: 'combo', parent: null },
    ])
    expect(models.map((model) => model.id)).toEqual([
      'cc/claude-opus-5', 'cc/claude-sonnet-5', 'cc/claude-fable-5', 'cc/claude-opus-4-8',
      'cx/gpt-5.6-sol', 'cx/gpt-5.6-terra', 'cx/gpt-5.6-luna', 'cx/gpt-5.5',
      'gemini/gemini-3.7-flash', 'gemini/gemini-3.6-pro', 'gemini/gemini-3.5-flash', 'gemini/gemini-2.5-flash',
    ])
  })

  it('excludes audio-output and audio-semantic models while retaining text-output vision models', () => {
    const models = omniRouteModelOptions([
      { id: 'openai/gpt-5.6-sol', name: 'GPT 5.6 Sol', owned_by: 'openai', parent: null, output_modalities: ['text'] },
      { id: 'openai/gpt-5.5-vision', name: 'GPT 5.5 Vision', owned_by: 'openai', parent: null, output_modalities: ['text'] },
      { id: 'openai/gpt-5.6-audio', name: 'ChatGPT Audio', owned_by: 'openai', parent: null, output_modalities: ['text', 'audio'] },
      { id: 'openai/gpt-5.6-realtime', name: 'GPT Realtime', owned_by: 'openai', parent: null, output_modalities: ['text'] },
      { id: 'openai/whisper-2', name: 'Whisper Transcription', owned_by: 'openai', parent: null, output_modalities: ['text'] },
    ])
    expect(models.map((model) => model.id)).toEqual(['openai/gpt-5.6-sol', 'openai/gpt-5.5-vision'])
  })

  it('builds a local OpenAI-compatible rewrite request and reads its output', () => {
    expect(omniRouteChatRequest('cc/claude-opus-5', 'Rewrite only the camera move.')).toEqual({
      model: 'cc/claude-opus-5',
      messages: [{ role: 'user', content: 'Rewrite only the camera move.' }],
      temperature: 0.2,
      max_tokens: 2000,
      stream: false,
    })
    expect(omniRouteRewriteOutput({ choices: [{ message: { content: 'Camera pans right and settles.' } }] })).toBe('Camera pans right and settles.')
  })
})
