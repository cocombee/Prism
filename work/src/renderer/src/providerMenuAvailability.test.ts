import { describe, expect, it } from 'vitest'
import { videoModelGroups, voiceModelMenuGroups, liveFalModelGroups } from './NodeCardNext'
import { filterProviderModelGroups, modelChoiceService } from '../../shared/providerAvailability'
import type { ServiceModelAvailability } from '../../shared/types'

const fish: ServiceModelAvailability = { provider: 'fish', verified: true, models: [{ id: 's2-pro', label: 'Fish S2 Pro' }] }

describe('actual provider menu service ownership', () => {
  it('hides signed-out direct ElevenLabs and Fish while retaining ElevenLabs served by fal', () => {
    const groups = voiceModelMenuGroups([{ id: 'eleven_v3', label: 'Eleven v3' }], fish)
    const visible = filterProviderModelGroups(groups, { fal: true })
    expect(visible.map(group => group.label)).toEqual(['fal.ai'])
    expect(visible[0].options.map(option => option.value)).toEqual(['elevenlabs'])
    expect(modelChoiceService(visible[0].options[0], visible[0].service)).toBe('fal')
  })
  it('disconnecting fal does not hide a signed-in direct ElevenLabs route', () => {
    const groups = voiceModelMenuGroups([{ id: 'eleven_v3', label: 'Eleven v3' }], fish)
    expect(filterProviderModelGroups(groups, { fal: false, elevenlabs: true }).map(group => group.label)).toEqual(['ElevenLabs · Direct'])
  })
  it('removes compiled fallback and saved unavailable routes from disconnected video services', () => {
    const saved = { higgsfieldNative: { endpointId: 'retired/model', label: 'Saved label', contractRevision: 'original', values: { prompt: 'Exact draft' } } }
    const original = structuredClone(saved)
    const groups = videoModelGroups(undefined, undefined, saved)
    expect(groups.flatMap(group => group.options).every(option => Boolean(modelChoiceService(option, groups.find(group => group.options.includes(option))?.service)))).toBe(true)
    expect(filterProviderModelGroups(groups, {})).toEqual([])
    expect(filterProviderModelGroups(groups, { byteplus: true }).flatMap(group => group.options).every(option => modelChoiceService(option) === 'byteplus')).toBe(true)
    expect(saved).toEqual(original)
  })
  it('uses the native serving service for new model-company catalog entries', () => {
    const availability: ServiceModelAvailability = { provider: 'fal', verified: true, models: [{ id: 'fal-ai/elevenlabs/sound', label: 'ElevenLabs Sound', category: 'sound-effects' }] }
    const groups = liveFalModelGroups('effects', availability)
    expect(groups[0].service).toBe('fal')
    expect(filterProviderModelGroups(groups, { elevenlabs: true })).toEqual([])
    expect(filterProviderModelGroups(groups, { fal: true })[0].options).toHaveLength(1)
  })
})
