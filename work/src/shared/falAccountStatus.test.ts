import { describe, expect, it } from 'vitest'
import { isFalBillingScopeDenial, shouldRecheckFalBillingFailure } from './falAccountStatus'

describe('fal.ai account status', () => {
  it('recognizes the billing-only denial returned to inference-scoped API keys', () => {
    expect(isFalBillingScopeDenial(403, 'API key is not permitted to perform this action.')).toBe(true)
  })

  it('does not turn invalid credentials or unrelated forbidden responses into ready status', () => {
    expect(isFalBillingScopeDenial(401, 'Invalid API key.')).toBe(false)
    expect(isFalBillingScopeDenial(403, 'This model is forbidden for the account.')).toBe(false)
  })

  it('rechecks a cached billing failure against the authenticated fal account balance', () => {
    expect(shouldRecheckFalBillingFailure('credit-required')).toBe(true)
    expect(shouldRecheckFalBillingFailure('temporarily-limited')).toBe(false)
    expect(shouldRecheckFalBillingFailure('unavailable')).toBe(false)
  })
})
