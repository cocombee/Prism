import type { GenerationRequest } from './types'
import { effectiveProviderPromptOwnership } from './providerPromptOwnership'

/** Project-facing names stay semantic. Only the physically bound Seedance payload uses ordinals. */
export function nativeFalPromptTransport(request: GenerationRequest, visible: string): string {
  const native = request.falNative
  if (!native?.endpointId.includes('seedance')) return visible
  const references = request.references || []
  const supplied = Object.values(native.media).flat()
  const identity = (source: { path?: string; url?: string; mediaType?: string }) => JSON.stringify([source.mediaType || 'image', source.path || source.url])
  const bindings = new Map<string, string[]>()
  for (const type of ['image', 'video', 'audio'] as const) {
    const ordered = references.filter(reference => (reference.mediaType || 'image') === type && (reference.path || reference.url))
    const physical = supplied.filter(source => source.mediaType === type)
    if (ordered.length !== physical.length || ordered.some((reference, index) => identity(reference) !== identity(physical[index]))) {
      throw new Error('The Seedance reference order must match the actual native attachments. Review its field binding.')
    }
    ordered.forEach((reference, index) => {
      if (!reference.tag?.startsWith('@')) return
      const kind = type[0].toUpperCase() + type.slice(1)
      // fal's 2.0 and 2.5 schemas use @ ordinals for each physical media array.
      const token = `@${kind}${index + 1}`
      bindings.set(reference.tag, [...(bindings.get(reference.tag) || []), token])
    })
  }
  if (effectiveProviderPromptOwnership(request) === 'compiled') {
    for (const rule of request.connectionRules || []) if (rule.tag.startsWith('@') && !bindings.has(rule.tag)) bindings.set(rule.tag, [rule.tag.slice(1)])
  }
  let payload = visible
  for (const [tag, tokens] of [...bindings].sort((a, b) => b[0].length - a[0].length)) {
    if (/^@(Image|Video|Audio)\d+$/.test(tag)) continue
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    payload = payload.replace(new RegExp(`${escaped}(?![\\p{L}\\p{N}_-])`, 'gu'), tokens.join(' + '))
  }
  return payload
}
