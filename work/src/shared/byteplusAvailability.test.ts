import { describe, expect, it } from 'vitest'
import { bytePlusActivationMessage, bytePlusLiveModels, isBytePlusActivationFailure } from './byteplusAvailability'
import { resolveVideoModel } from './videoModels'

const route = resolveVideoModel('byteplus/seedance-2.5/text-to-video')

describe('BytePlus activation availability', () => {
  it('keeps only live dreamina Seedance models and never merges absent static IDs', () => {
    expect(bytePlusLiveModels([
      { id: 'dreamina-seedance-2-0-260128', name: 'Activated Standard' },
      { id: 'other-model', name: 'Other' },
      { id: 'dreamina-seedance-2-0-260128', name: 'Duplicate' },
    ])).toEqual([{ id: 'dreamina-seedance-2-0-260128', label: 'Activated Standard' }])
  })

  it('returns an exact activation requirement only for verified absence', () => {
    expect(bytePlusActivationMessage(route, undefined)).toBeUndefined()
    expect(bytePlusActivationMessage(route, { provider: 'byteplus', verified: true, models: [] })).toBe('BytePlus Seedance: Activate dreamina-seedance-2-5-260628 in the Ark Console, then refresh Connections.')
    expect(bytePlusActivationMessage(route, { provider: 'byteplus', verified: true, models: [{ id: route.apiModelId, label: 'Seedance 2.5' }] })).toBeUndefined()
  })

  it.each([
    'The account has not activated dreamina-seedance-2-5-260628.',
    'Please activate model service in the Ark Console.',
    'Model is not activated for this account.',
  ])('recognizes activation failure: %s', (message) => expect(isBytePlusActivationFailure(message)).toBe(true))

  it('does not classify ordinary fal failures as BytePlus activation', () => {
    expect(isBytePlusActivationFailure('fal.ai rate limit exceeded')).toBe(false)
  })
})
