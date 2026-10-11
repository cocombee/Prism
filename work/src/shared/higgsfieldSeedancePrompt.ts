import type { GenerationRequest } from './types'
import type { HiggsfieldMediaBinding } from './higgsfieldInputContract'
import { compileProviderPrompt, completeStructuredSeedanceMaster, type PromptFamily, type PromptCompilation } from './referenceInstructions'

type Reference = NonNullable<GenerationRequest['references']>[number]
export interface HiggsfieldPromptSlot { binding: HiggsfieldMediaBinding; index: number; reference: Reference }

/** Ordinary prose identifies actual native inputs. No reserved API token dialect is assumed. */
export function higgsfieldSeedanceReferenceMap(slots: readonly HiggsfieldPromptSlot[]): string {
  return slots.map(({ binding, index, reference }) => {
    const label = binding.role === 'start-frame' ? 'Starting image' : binding.role === 'end-frame' ? 'Ending image'
      : binding.role === 'source-video' ? 'Source video' : `Reference ${binding.type} ${index + 1}`
    const role = reference.role === 'reference' ? binding.role === 'reference-video' ? 'motion and camera reference'
      : binding.role === 'reference-audio' ? 'audio reference' : binding.role === 'start-frame' ? 'opening frame'
      : binding.role === 'end-frame' ? 'ending frame' : binding.role === 'source-video' ? 'existing source shot' : 'visual reference'
      : reference.role === 'storyboard' ? 'Storyboard shot map' : reference.role[0].toUpperCase() + reference.role.slice(1)
    return `${label}: ${reference.tag || reference.name || role}${reference.view ? ` (${reference.view})` : ''} — ${role}.`
  }).join('\n')
}

/** Source Edit consumes an existing shot, not a freshly invented shot list or camera setup. */
export function compileHiggsfieldSeedancePrompt(request: GenerationRequest, slots: readonly HiggsfieldPromptSlot[], family:PromptFamily='seedance'): PromptCompilation {
  const authored = request.authoredPrompt ?? request.prompt ?? ''
  if (family==='seedance' && completeStructuredSeedanceMaster(authored.trim())) return compileProviderPrompt({ ...request, providerPromptOverride: authored, providerPromptOwnership: 'compiled' }, { family })
  const groups = new Map<string, Set<string>>()
  for (const {reference} of slots) if (reference.role === 'reference' && reference.tag) {
    const sources = groups.get(reference.tag) || new Set<string>()
    sources.add(JSON.stringify([reference.mediaType || 'image',reference.path || reference.url])); groups.set(reference.tag,sources)
  }
  const ambiguous = new Set([...groups].filter(([,sources]) => sources.size > 1).map(([tag]) => tag))
  const mentions = (tag: string) => {
    let start = authored.indexOf(tag)
    while (start >= 0) {
      if (!/^[\p{L}\p{N}_.-]/u.test(authored.slice(start + tag.length))) return true
      start = authored.indexOf(tag,start + tag.length)
    }
    return false
  }
  for (const tag of ambiguous) if (mentions(tag)) throw new Error(`The authored reference ${tag} names different included media. Identify the intended input before generating; no reference was chosen automatically.`)
  // Generic List aliases can repeat across batches. Unauthored aliases become ordinary input labels,
  // while exact authored semantic anchors and typed Character/view groups remain untouched.
  const mapped = slots.map(slot => ambiguous.has(slot.reference.tag || '') ? {...slot,reference:{...slot.reference,tag:`Reference ${slot.binding.type} ${slot.index + 1}`}} : slot)
  const selected = {...request,references:mapped.map(slot => slot.reference)}
  const map = higgsfieldSeedanceReferenceMap(mapped)
  if (request.higgsfieldNative?.endpointId.endsWith('/video-edit')) {
    if (!authored.trim() && !request.stylePrompt?.trim()) throw new Error('Write the edit instruction before generating from a source video.')
    const body = [
      `REFERENCE AUTHORITY\n${map}\nApply the written edits to the source video. Preserve its existing shot structure, timing and content outside those edits.`,
      authored.trim() ? `EDIT CONTROL\n${authored}` : '',
      request.stylePrompt?.trim() ? `STYLE\n${request.stylePrompt}` : '',
      `NEGATIVE PROMPT\n${request.negativePrompt || 'Unrequested changes to the source shot.'}`,
    ].filter(Boolean).join('\n\n')
    return compileProviderPrompt({ ...selected, providerPromptOverride: body, providerPromptOwnership: 'compiled' }, { family })
  }
  return compileProviderPrompt(selected, { family, ...(map ? { legend: { heading: 'CONNECTED INPUTS', body: map } } : {}) })
}
