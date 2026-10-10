import type { GenerationRequest } from './types'
export function effectiveProviderPromptOwnership(request: GenerationRequest): 'authored' | 'compiled' | undefined {
  if (providerPromptOwnershipErrors(request).length) return undefined
  return request.providerPromptOwnership ?? request.falNative?.promptOwnership
}

/** The native endpoint, when present, is the route that will actually execute. */
export function effectiveVideoEndpoint(request: GenerationRequest): string | undefined {
  return request.higgsfieldNative?.endpointId || (request.falNative ? request.falNative.endpointId : request.videoEngine)
}
/** Legacy unclassified overrides preserve their established exact-authored behavior. */
export function hasExactAuthoredProviderBody(request: GenerationRequest): boolean {
  if (providerPromptOwnershipErrors(request).length) return false
  const owner = effectiveProviderPromptOwnership(request)
  return request.providerPromptOverride !== undefined && (owner === undefined || owner === 'authored')
}

export function providerPromptOwnershipErrors(request: GenerationRequest): string[] {
  const outer = request.providerPromptOwnership, inner = request.falNative?.promptOwnership
  if ([outer, inner].some(owner => owner !== undefined && owner !== 'authored' && owner !== 'compiled')) return ['Review the final prompt owner before generating: an explicit owner is malformed.']
  if (outer !== undefined && inner !== undefined && outer !== inner) return ['Review the final prompt owner before generating: outer and native owners conflict.']
  return []
}
