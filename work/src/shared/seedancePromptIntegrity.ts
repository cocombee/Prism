import type { GenerationRequest } from './types'
import type { FalNativeRequest } from './falNativeExecution'
import { effectiveProviderPromptOwnership, effectiveVideoEndpoint, hasExactAuthoredProviderBody, providerPromptOwnershipErrors } from './providerPromptOwnership'
import { ownsExactSeedanceMaster } from './seedanceAuthoredMaster'
import { seedanceFinalSectionErrors } from './seedanceFinalSection'

export function falNativeCompiledPromptErrors(request: FalNativeRequest): string[] {
  if (request.promptOwnership !== undefined && request.promptOwnership !== 'authored' && request.promptOwnership !== 'compiled') return ['Review the native final prompt owner before generating.']
  if (request.promptOwnership !== 'compiled' || !request.endpointId.includes('seedance')) return []
  if (typeof request.promptField !== 'string' || !request.promptField.trim()) return ['The compiled Seedance prompt needs an explicit native prompt field binding before submission.']
  const body = request.values && Object.hasOwn(request.values, request.promptField) ? request.values[request.promptField] : undefined
  if (typeof body !== 'string') return ['The compiled Seedance prompt field needs its final text before submission.']
  return seedanceFinalSectionErrors(body)
}

/** Inspect a known final body; this leaf never invokes a compiler or rewrites it. */
export function seedancePromptIntegrityFailures(request: GenerationRequest): string[] {
  if (request.kind !== 'video-generator') return []
  const ownerErrors = providerPromptOwnershipErrors(request)
  if (ownerErrors.length) return ownerErrors
  const owner = effectiveProviderPromptOwnership(request)
  if (request.falNative) {
    const native = request.falNative, visible = request.providerPromptOverride ?? request.prompt
    if (owner === 'compiled' || visible !== undefined) {
      if (typeof native.promptField !== 'string' || !native.promptField.trim()) return ['The native model prompt needs an explicit prompt field binding before submission.']
      const body = native.values && Object.hasOwn(native.values, native.promptField) ? native.values[native.promptField] : undefined
      if (typeof body !== 'string') return ['The native model prompt field needs its final text before submission.']
      if (visible !== undefined && body !== visible) return ['The native model prompt must match the visible final prompt. Review its binding.']
    }
    if (owner === 'compiled') return falNativeCompiledPromptErrors({ ...native, promptOwnership: owner })
  }
  if (hasExactAuthoredProviderBody(request) || !effectiveVideoEndpoint(request)?.includes('seedance')) return []
  const body = owner === 'compiled' ? request.providerPromptOverride : ownsExactSeedanceMaster(request) ? request.authoredPrompt : undefined
  return body === undefined ? [] : seedanceFinalSectionErrors(body)
}

export class SeedancePromptIntegrityError extends Error {
  constructor(errors: string[]) { super(`Seedance final prompt needs review: ${errors.join(' ')}`); this.name = 'SeedancePromptIntegrityError' }
}
