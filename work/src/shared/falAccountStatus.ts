export function isFalBillingScopeDenial(status: number, message: string): boolean {
  return status === 403 && /api key is not permitted to perform this action/i.test(message)
}

export function shouldRecheckFalBillingFailure(state: string | undefined): boolean {
  return state === 'credit-required'
}
