import type { GenerationRequest, PropScaleAuthority } from './types'

type Reference = NonNullable<GenerationRequest['references']>[number]

function applies(authority: PropScaleAuthority, panelId?: string): boolean {
  return !authority.shotIds?.length || !panelId || authority.shotIds.includes(panelId)
}

function overlaps(left: PropScaleAuthority, right: PropScaleAuthority): boolean {
  if (!left.shotIds?.length || !right.shotIds?.length) return true
  return left.shotIds.some((panelId) => right.shotIds!.includes(panelId))
}

function signature(authority: PropScaleAuthority): string {
  return JSON.stringify({
    preserveReferenceScale: authority.preserveReferenceScale,
    proportions: authority.proportions,
    authoredScaleStatement: authority.authoredScaleStatement?.trim() || '',
    approvedScaleExclusions: [...new Set((authority.approvedScaleExclusions || []).map((value) => value.trim()).filter(Boolean))].sort(),
  })
}

export function propScaleReadinessFailures(request: GenerationRequest): string[] {
  const byTag = new Map<string, Array<{ reference: Reference; authority: PropScaleAuthority }>>()
  for (const reference of request.references || []) {
    if (reference.role !== 'element' || !reference.tag || !reference.propScaleAuthority) continue
    byTag.set(reference.tag, [...(byTag.get(reference.tag) || []), { reference, authority: reference.propScaleAuthority }])
  }
  const failures: string[] = []
  for (const [tag, entries] of byTag) {
    const conflict = entries.some((entry, index) => entries.slice(index + 1).some((other) => (
      overlaps(entry.authority, other.authority) && signature(entry.authority) !== signature(other.authority)
    )))
    if (conflict) failures.push(`resolve ${tag} prop scale authority: conflicting explicit scale locks overlap; select one approved shot-local scale owner`)
  }
  return failures
}

function matchingAuthorities(request: GenerationRequest, tag: string, panelId?: string): PropScaleAuthority[] {
  return (request.references || []).flatMap((reference) => (
    reference.role === 'element' && reference.tag === tag && reference.propScaleAuthority && applies(reference.propScaleAuthority, panelId)
      ? [reference.propScaleAuthority]
      : []
  ))
}

export function propScaleInstruction(request: GenerationRequest, tag: string, panelId?: string): string[] {
  const authorities = matchingAuthorities(request, tag, panelId)
  if (!authorities.length || new Set(authorities.map(signature)).size > 1) return []
  const authority = authorities[0]
  return [
    `${tag} retains exact reference proportions and physical size throughout this shot; hands and grip adapt to the existing prop, not the prop to the grip.`,
    authority.authoredScaleStatement?.trim() ? `Authored prop scale: ${authority.authoredScaleStatement.trim()}` : '',
  ].filter(Boolean)
}

export function propScaleNegativeTerms(request: GenerationRequest): string[] {
  const terms: string[] = []
  for (const shot of request.storyboardShots || []) {
    const tags = new Set(shot.prompt.match(/@[A-Za-z0-9][A-Za-z0-9-_]*/g) || [])
    for (const tag of tags) {
      const authorities = matchingAuthorities(request, tag, shot.panelId)
      if (!authorities.length || new Set(authorities.map(signature)).size > 1) continue
      terms.push(...(authorities[0].approvedScaleExclusions || []).map((value) => value.trim()).filter(Boolean))
    }
  }
  return [...new Set(terms)]
}