import { describe, expect, it } from 'vitest'
import { filterProviderModelGroups, modelChoiceService, SERVICE_PROVIDER_IDS } from './providerAvailability'

describe('selected-connection provider model choices', () => {
  it('requires a current connection and removes empty provider groups without mutating input', () => {
    const groups = [{ label: 'OpenAI', options: [{ value: 'openai::gpt-model' }] }, { label: 'Claude', options: [{ value: 'anthropic::claude-model' }] }]
    const original = structuredClone(groups)
    expect(filterProviderModelGroups(groups, { openai: true }).map(group => group.label)).toEqual(['OpenAI'])
    expect(filterProviderModelGroups(groups, {})).toEqual([])
    expect(filterProviderModelGroups(groups, { openai: false, anthropic: true }).map(group => group.label)).toEqual(['Claude'])
    expect(groups).toEqual(original)
  })
  it.each(SERVICE_PROVIDER_IDS)('filters %s from its selected connection independently', service => {
    const groups = SERVICE_PROVIDER_IDS.map(provider => ({ label: provider, service: provider, options: [{ value: `${provider}::model` }] }))
    expect(filterProviderModelGroups(groups, { [service]: true }).map(group => group.service)).toEqual([service])
    expect(filterProviderModelGroups(groups, { [service]: false })).toEqual([])
  })
  it('keeps prompt readiness independent of media readiness', () => {
    const groups = [{ label: 'OpenAI', service: 'openai' as const, options: [{ value: 'openai::gpt-model' }] }]
    const availability = { promptConnected: { openai: true }, mediaConnected: {} }
    expect(filterProviderModelGroups(groups, availability.promptConnected)).toHaveLength(1)
    expect(filterProviderModelGroups(groups, availability.mediaConnected)).toEqual([])
  })
  it('retains the same model company served through another connected service', () => {
    const groups = [{ label: 'fal.ai', service: 'fal' as const, options: [{ value: 'fal-native::bytedance/seedance', provider: 'bytedance' }] }, { label: 'Higgsfield', service: 'higgsfield' as const, options: [{ value: 'higgsfield-native::bytedance/seedance', provider: 'bytedance' }] }]
    expect(filterProviderModelGroups(groups, { fal: false, higgsfield: true }).map(group => group.label)).toEqual(['Higgsfield'])
    expect(filterProviderModelGroups(groups, { fal: true, higgsfield: false }).map(group => group.label)).toEqual(['fal.ai'])
  })
  it('uses catalog service rather than brand and retains ordinary field values', () => {
    const groups = [{ label: 'Mixed', options: [{ value: 'elevenlabs', provider: 'elevenlabs', catalog: { service: 'fal.ai' } }, { value: 'elevenlabs-direct::model', provider: 'elevenlabs' }, { value: '16:9' }] }]
    expect(filterProviderModelGroups(groups, { elevenlabs: true })[0].options.map(option => option.value)).toEqual(['elevenlabs-direct::model', '16:9'])
    expect(filterProviderModelGroups(groups, { fal: true })[0].options.map(option => option.value)).toEqual(['elevenlabs', '16:9'])
  })
  it.each([['fal-native::model', 'fal'], ['higgsfield-native::model', 'higgsfield'], ['elevenlabs-direct::model', 'elevenlabs'], ['fish-audio::model', 'fish'], ['openai::model', 'openai'], ['anthropic::model', 'anthropic'], ['omniroute::model', 'omniroute'], ['byteplus::model', 'byteplus']])('owns %s independently', (value, expected) => expect(modelChoiceService({ value })).toBe(expected))
  it('keeps an unavailable saved selection intact while hiding its disconnected route', () => {
    const selection = { provider: 'anthropic', model: 'saved-retired-model' }
    const groups = [{ label: 'Claude', options: [{ value: `anthropic::${selection.model}`, disabled: true }] }]
    expect(filterProviderModelGroups(groups, { anthropic: false })).toEqual([])
    expect(filterProviderModelGroups(groups, { anthropic: true })[0].options[0]).toMatchObject({ disabled: true })
    expect(selection).toEqual({ provider: 'anthropic', model: 'saved-retired-model' })
  })
})
