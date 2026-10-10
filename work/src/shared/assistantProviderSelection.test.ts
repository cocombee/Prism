import { describe, expect, it } from 'vitest'
import { assistantCatalogsWithSavedSelection, assistantModelGroups, resolveAssistantSelection } from './assistantProviderSelection'

const catalogs = {
  omniroute: [{ id: 'cc/claude-opus-5', label: 'Claude Opus 5' }],
  openai: [{ id: 'gpt-5.6-sol', label: 'GPT 5.6 Sol' }],
  anthropic: [{ id: 'claude-opus-5', label: 'Claude Opus 5' }],
  google: [{ id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' }],
}

describe('Storyboard assistant provider groups', () => {
  it('does not restore a saved model after a verified catalog confirms no models are available', () => {
    const verifiedEmpty = { google: [] }
    const selected = assistantCatalogsWithSavedSelection(verifiedEmpty, 'google', 'gemini-retired', true)
    expect(selected).toEqual(verifiedEmpty)
    expect(resolveAssistantSelection('google', 'gemini-retired', selected)).toBeUndefined()
    expect(assistantCatalogsWithSavedSelection(verifiedEmpty, 'google', 'gemini-retired', false)).toEqual({ google: [{ id: 'gemini-retired', label: 'Gemini Retired' }] })
  })

  it('keeps an eligible saved model outside the newest-three shortlist rather than switching a paid route', () => {
    const live = {
      openai: [{ id: 'gpt-5.6-sol', label: 'GPT 5.6 Sol' }],
      anthropic: [
        { id: 'claude-opus-5.5', label: 'Claude Opus 5.5' },
        { id: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5' },
        { id: 'claude-haiku-5.5', label: 'Claude Haiku 5.5' },
        { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      ],
    }
    expect(resolveAssistantSelection('anthropic', 'claude-sonnet-5', live)).toEqual({ provider: 'anthropic', model: 'claude-sonnet-5' })
    const group = assistantModelGroups(live, 'anthropic', 'claude-sonnet-5').find((entry) => entry.provider === 'anthropic')!
    expect(group.options.map((option) => option.value)).toEqual([
      'anthropic::claude-opus-5.5', 'anthropic::claude-sonnet-5.5', 'anthropic::claude-haiku-5.5', 'anthropic::claude-sonnet-5',
    ])
  })

  it('exposes older eligible models without requiring a saved selection or truncating snapshots', () => {
    const live = { openai: Array.from({ length: 9 }, (_, index) => ({ id: `gpt-5.${index}`, label: `GPT 5.${index}` })) }
    const group = assistantModelGroups(live)[0]
    expect(group.options).toHaveLength(9)
    expect(group.options.map((option) => option.value)).toContain('openai::gpt-5.0')
    expect(resolveAssistantSelection('openai', 'gpt-5.0', live)).toEqual({ provider: 'openai', model: 'gpt-5.0' })
  })

  it('blocks an unavailable saved model instead of falling through to another provider', () => {
    expect(resolveAssistantSelection('anthropic', 'claude-retired', catalogs)).toBeUndefined()
    expect(resolveAssistantSelection('google', 'gemini-unavailable', catalogs)).toBeUndefined()
  })
  it('keeps provider groups independent even when model labels match', () => {
    const groups = assistantModelGroups(catalogs)
    expect(groups.map((group) => group.label)).toEqual(['OmniRoute', 'OpenAI', 'Anthropic Claude', 'Google Gemini'])
    expect(groups[0].options[0]).toEqual({ value: 'omniroute::cc/claude-opus-5', label: 'Claude Opus 5', provider: 'omniroute' })
    expect(groups[2].options[0]).toEqual({ value: 'anthropic::claude-opus-5', label: 'Claude Opus 5', provider: 'anthropic' })
  })

  it('keeps a valid saved text selection visible while its provider catalog is missing', () => {
    const merged = assistantCatalogsWithSavedSelection({}, 'google', 'gemini-3.7-flash')
    expect(merged).toEqual({ google: [{ id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' }] })
    expect(assistantModelGroups(merged).map((group) => group.provider)).toEqual(['google'])
    expect(resolveAssistantSelection('google', 'gemini-3.7-flash', merged)).toEqual({ provider: 'google', model: 'gemini-3.7-flash' })
  })

  it('does not invent unselected providers, duplicate live models, or restore audio selections', () => {
    expect(assistantCatalogsWithSavedSelection({}, undefined, undefined)).toEqual({})
    expect(assistantCatalogsWithSavedSelection({}, 'openai', 'gpt-4o-realtime-preview')).toEqual({})
    const live = { google: [{ id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash Live' }] }
    expect(assistantCatalogsWithSavedSelection(live, 'google', 'gemini-3.7-flash')).toEqual(live)
    expect(assistantCatalogsWithSavedSelection(live, 'google', 'gemini-older')).toEqual(live)
  })

  it('preserves a valid direct selection and migrates stale fal text selection to the first available group', () => {
    expect(resolveAssistantSelection('anthropic', 'claude-opus-5', catalogs)).toEqual({ provider: 'anthropic', model: 'claude-opus-5' })
    expect(resolveAssistantSelection('fal', 'google/gemini-pro-1.5', catalogs)).toEqual({ provider: 'omniroute', model: 'cc/claude-opus-5' })
  })
})
