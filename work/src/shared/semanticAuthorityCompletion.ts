import type { GenerationRequest } from './types'
import { authoredAppearanceDeltaLine, isReferenceExclusive, soleVisualAuthorityLine } from './referenceVisualAuthority'
import { characterBodyAuthorityLine, isTypedAppearanceLayer, sameBodyAuthorityLines } from './sameBodyAuthority'

type SemanticRole = 'character' | 'wardrobe' | 'location' | 'style' | 'element'
type Reference = NonNullable<GenerationRequest['references']>[number]

export interface SemanticAuthorityRecord {
  tag: string
  role: SemanticRole
  boundCharacterTag?: string
  characterOwnsWardrobe?: boolean
  description?: string
  approvedIdentityDescription?: string
  reference?: Reference
}

export interface SemanticAuthorityCompletion {
  records: SemanticAuthorityRecord[]
  authorityLines: string[]
  characterContinuityLines: string[]
  wardrobeContinuityLines: string[]
  elementContinuityLines: string[]
  sceneContinuityLines: string[]
  styleContinuityLines: string[]
  pointOfUseLine: string
}

function roleFromLabel(label: string): SemanticRole | undefined {
  if (/wardrobe/i.test(label)) return 'wardrobe'
  if (/character/i.test(label)) return 'character'
  if (/location/i.test(label)) return 'location'
  if (/element/i.test(label)) return 'element'
  if (/style/i.test(label)) return 'style'
  return undefined
}

function semanticRole(role: Reference['role']): SemanticRole | undefined {
  return ['character', 'wardrobe', 'location', 'style', 'element'].includes(role) ? role as SemanticRole : undefined
}

function authoredScopes(authored: string, tag: string): string[] {
  const scopes: string[] = []
  for (const line of authored.split(/\r?\n/)) {
    let activeTags: string[] = []
    for (const rawScope of line.split(/(?<=[.!?;])\s+/)) {
      const scope = rawScope.trim()
      if (!scope) continue
      const tags = scope.match(/@[A-Za-z0-9][A-Za-z0-9-_]*/g) || []
      if (tags.length) activeTags = tags
      if (activeTags.includes(tag)) scopes.push(scope)
    }
  }
  return scopes
}

function covered(scopes: string[], pattern: RegExp): boolean {
  return scopes.some((scope) => pattern.test(scope))
}

function continuityCovered(scopes: string[]): boolean {
  return covered(scopes, /\b(?:consistent|consistency|continuity|unchanged|persistent|every appearance|across (?:every|all) (?:shot|cut)|through (?:motion|occlusion|every cut))\b/i)
}

export function semanticAuthorityRecords(request: GenerationRequest): SemanticAuthorityRecord[] {
  const records = new Map<string, SemanticAuthorityRecord>()
  const typedAppearanceTags = new Set<string>()
  for (const reference of request.references || []) {
    if (isTypedAppearanceLayer(reference)) {
      if (reference.tag) typedAppearanceTags.add(reference.tag)
      continue
    }
    const role = semanticRole(reference.role)
    if (!role || !reference.tag) continue
    const existing = records.get(reference.tag)
    records.set(reference.tag, {
      tag: reference.tag,
      role,
      boundCharacterTag: reference.boundCharacterTag || existing?.boundCharacterTag,
      description: isReferenceExclusive(reference) ? undefined : reference.description || existing?.description,
      approvedIdentityDescription: reference.approvedIdentityDescription || existing?.approvedIdentityDescription,
      reference,
    })
  }
  for (const rule of request.connectionRules || []) {
    const role = roleFromLabel(rule.label)
    if (!role || !rule.tag || records.has(rule.tag) || typedAppearanceTags.has(rule.tag)) continue
    records.set(rule.tag, { tag: rule.tag, role })
  }
  const boundCharacters = new Set([...records.values()].filter((record) => record.role === 'wardrobe' && record.boundCharacterTag).map((record) => record.boundCharacterTag!))
  return [...records.values()].map((record) => record.role === 'character' ? { ...record, characterOwnsWardrobe: !boundCharacters.has(record.tag) } : record)
}

export function semanticAuthorityCompletion(request: GenerationRequest): SemanticAuthorityCompletion {
  const authored = [request.authoredPrompt || '', ...(request.storyboardShots || []).map((shot) => shot.prompt), ...(request.multiPrompt || []).map((shot) => shot.prompt)].filter(Boolean).join('\n')
  const records = semanticAuthorityRecords(request)
  const authorityLines: string[] = []
  if (!request.storyboardShots?.length) authorityLines.push(...sameBodyAuthorityLines(request))
  const characterContinuityLines: string[] = []
  const wardrobeContinuityLines: string[] = []
  const elementContinuityLines: string[] = []
  const sceneContinuityLines: string[] = []
  const styleContinuityLines: string[] = []

  for (const record of records) {
    const scopes = authoredScopes(authored, record.tag)
    const missing: string[] = []

    if (record.reference && isReferenceExclusive(record.reference)) {
      const soleAuthority = characterBodyAuthorityLine(record.reference) || soleVisualAuthorityLine(record.reference)
      const delta = authoredAppearanceDeltaLine(record.reference)
      if (soleAuthority && !(record.role === 'character' && record.reference.characterAuthorityMode && request.storyboardShots?.length)) authorityLines.push(soleAuthority)
      if (delta) authorityLines.push(delta)
      if (record.role === 'character') {
        if (record.approvedIdentityDescription) characterContinuityLines.push(`${record.tag} approved identity: ${record.approvedIdentityDescription}`)
        characterContinuityLines.push(`${record.tag} retains the exact connected Character identity across every appearance.`)
      }
      if (record.role === 'wardrobe') wardrobeContinuityLines.push(`${record.tag}${record.boundCharacterTag ? ` remains worn only by ${record.boundCharacterTag}` : ''}; the connected reference remains sole visual authority.`)
      if (record.role === 'element') elementContinuityLines.push(`${record.tag}${record.boundCharacterTag ? ` remains used only by ${record.boundCharacterTag}` : ''}; the connected reference remains sole visual authority.`)
      if (record.role === 'location') sceneContinuityLines.push(`${record.tag} remains the sole connected visual authority for the Location.`)
      continue
    }

    if (record.role === 'character') {
      if (record.description) missing.push(`Identity constants: ${record.description}`)
      if (!covered(scopes, /\b(?:identity|face|facial|likeness)\b/i)) missing.push('Preserve exact identity, face, likeness, and natural asymmetry.')
      if (!covered(scopes, /\b(?:anatomy|body proportions?|physical proportions?)\b/i)) missing.push('Preserve anatomy and body proportions.')
      if (record.characterOwnsWardrobe && !covered(scopes, /\b(?:wardrobe|clothing|outfit|garment|accessories)\b/i)) missing.push('The Character reference owns its wardrobe and accessories because no Wardrobe authority is bound.')
      if (missing.length) authorityLines.push(`${record.tag} is the Character visual authority; ${missing.join(' ')}`)
      if (!continuityCovered(scopes)) characterContinuityLines.push(`${record.tag} retains exact identity, anatomy, body proportions, and natural asymmetry through motion, occlusion, and every cut; never blend, replace, or reinterpret it as another person.${record.characterOwnsWardrobe ? ' Its reference wardrobe and accessories remain consistent across every appearance.' : ''}`)
      continue
    }

    if (record.role === 'wardrobe') {
      const bound = record.boundCharacterTag
      const bindingCovered = Boolean(bound && scopes.some((scope) => scope.includes(bound) && /\b(?:governs|wardrobe of|worn by|belongs to|assigned to|bound to)\b/i.test(scope)))
      if (bound && !bindingCovered) missing.push(`${record.tag} governs the wardrobe of ${bound}.`)
      if (!covered(scopes, /\b(?:silhouette|construction|cut|layering)\b/i)) missing.push('Preserve garment silhouette, construction, cut, and layering.')
      if (!covered(scopes, /\b(?:materials?|colou?rs?|patterns?|texture)\b/i)) missing.push('Preserve materials, colors, patterns, and texture.')
      if (!covered(scopes, /\b(?:fit|accessories|worn state|fastening|drape)\b/i)) missing.push('Preserve fit, accessories, fastening, drape, and worn state.')
      if (!covered(scopes, /\b(?:never transfer|do not transfer|another character|inherit|cross-character|only (?:on|for))\b/i)) missing.push('Never transfer it to another Character or let another Character inherit it without an explicit Wardrobe connection.')
      if (missing.length) authorityLines.push(bindingCovered ? `${record.tag}: ${missing.join(' ')}` : missing.join(' '))
      if (!continuityCovered(scopes)) wardrobeContinuityLines.push(`${record.tag}${bound ? ` remains bound to ${bound} and` : ''} retains garment identity, design, materials, colors, fit, accessories, and accumulated worn state across every shot.`)
      continue
    }

    if (record.role === 'location') {
      if (!covered(scopes, /\b(?:layout|geometry|perspective|scale|spatial)\b/i)) missing.push('Preserve environment layout, scene geometry, perspective, scale, and spatial relationships.')
      if (!covered(scopes, /\b(?:atmosphere|lighting|weather|environment state)\b/i)) missing.push('Preserve atmosphere, lighting logic, weather, and environment state.')
      if (missing.length) authorityLines.push(`${record.tag} is the Location visual authority; ${missing.join(' ')}`)
      if (!continuityCovered(scopes)) sceneContinuityLines.push(`${record.tag} retains layout, perspective, scale, environment geometry, lighting logic, and persistent scene state across the full timeline.`)
      continue
    }

    if (record.role === 'style') {
      if (!covered(scopes, /\b(?:visual language|medium|rendering|style authority)\b/i)) missing.push('Preserve the visual language, medium, and rendering approach.')
      if (!covered(scopes, /\b(?:palette|texture|finish|lens|grain|contrast)\b/i)) missing.push('Preserve palette, texture, finish, lens character, grain, and contrast behavior.')
      if (!covered(scopes, /\b(?:without copying|do not copy|subject.*not inherited|depicted subjects?)\b/i)) missing.push('Do not inherit or copy depicted subjects from the Style reference.')
      if (missing.length) authorityLines.push(`${record.tag} is the Style visual authority; ${missing.join(' ')}`)
      if (!continuityCovered(scopes)) styleContinuityLines.push(`${record.tag} remains consistent across every shot and output.`)
      continue
    }

    if (record.role === 'element') {
      if (!covered(scopes, /\b(?:design|proportions?|construction|silhouette|shape)\b/i)) missing.push('Preserve object design, proportions, construction, silhouette, and shape.')
      if (!covered(scopes, /\b(?:materials?|colou?rs?|markings?|texture)\b/i)) missing.push('Preserve materials, colors, markings, and texture.')
      if (!covered(scopes, /\b(?:attachment|contact|held|carried|worn|physical state)\b/i)) missing.push('Preserve assigned attachment, contact, and physical state without inventing use or performance.')
      if (missing.length) authorityLines.push(`${record.tag} is the Element visual authority; ${missing.join(' ')}`)
      if (!continuityCovered(scopes)) elementContinuityLines.push(`${record.tag} retains object identity, design, materials, markings, attachment, contact, and accumulated physical state across the full timeline.`)
    }
  }

  const authoredTags = new Set((authored.match(/@[A-Za-z0-9][A-Za-z0-9-_]*/g) || []))
  const wardrobeByCharacter = new Map(records.filter((record) => record.role === 'wardrobe' && record.boundCharacterTag).map((record) => [record.boundCharacterTag!, record.tag]))
  const pointOfUse: string[] = []
  for (const character of records.filter((record) => record.role === 'character')) {
    const wardrobe = wardrobeByCharacter.get(character.tag)
    if (!authoredTags.has(character.tag) || wardrobe && !authoredTags.has(wardrobe)) pointOfUse.push(wardrobe ? `${character.tag} wearing ${wardrobe}` : character.tag)
  }
  for (const record of records.filter((candidate) => candidate.role === 'location' || candidate.role === 'element')) if (!authoredTags.has(record.tag)) pointOfUse.push(record.tag)

  return {
    records,
    authorityLines,
    characterContinuityLines,
    wardrobeContinuityLines,
    elementContinuityLines,
    sceneContinuityLines,
    styleContinuityLines,
    pointOfUseLine: pointOfUse.length ? `Connected visual authorities in this shot: ${pointOfUse.join('; ')}.` : '',
  }
}
