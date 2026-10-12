import {higgsfieldSourceOwnsTimeline} from './higgsfieldNative'
import type { GenerationRequest } from './types'
import { referenceDescriptionReadinessFailures } from './assetReferenceDescriptions'
import { hasExactAuthoredProviderBody, providerPromptOwnershipErrors } from './providerPromptOwnership'
import { videoDialogueAudioReadinessFailures } from './videoDialogueAudio'
import { providerPromptPreviewCompilation, compileProviderPromptForSubmission } from './referenceInstructions'
import { seedancePromptIntegrityFailures, SeedancePromptIntegrityError } from './seedancePromptIntegrity'
import { seedanceFinalSectionErrors } from './seedanceFinalSection'

/** Pure final-body inspection before project, credential, media or provider work. */
export function assertVideoProviderPromptPreflight(request: GenerationRequest): void {
  if (request.promptPreviewOnly) throw new Error('A display-only provider prompt preview cannot be generated. Review the live controls before running.')
  if (request.falDraftRecovery || request.draftCompletion || request.kind !== 'video-generator' || request.higgsfieldNative && higgsfieldSourceOwnsTimeline(request.higgsfieldNative.endpointId)) return
  const readinessErrors = [...providerPromptOwnershipErrors(request), ...referenceDescriptionReadinessFailures(request), ...videoDialogueAudioReadinessFailures(request), ...seedancePromptIntegrityFailures(request)]
  if (readinessErrors.length) throw new SeedancePromptIntegrityError(readinessErrors)
  if (request.falNative || request.higgsfieldNative) {
    return
  }
  if (hasExactAuthoredProviderBody(request)) { compileProviderPromptForSubmission(request); return }
  const compilation = request.providerPromptOverride === undefined ? providerPromptPreviewCompilation(request) : compileProviderPromptForSubmission(request)
  if (compilation.promptBudgetDiagnostic?.blocking) throw new Error(`Prompt budget blocks provider dispatch: ${compilation.promptBudgetDiagnostic.blockingReason}`)
  if (compilation.family === 'seedance') {
    const errors = seedanceFinalSectionErrors(compilation.text)
    if (errors.length) throw new SeedancePromptIntegrityError(errors)
  }
}
