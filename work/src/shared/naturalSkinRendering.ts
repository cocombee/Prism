import type { GenerationRequest } from './types'

export type NaturalSkinQualificationReason =
  | 'qualified-explicit-photographed-organic-human'
  | 'omitted-human-not-explicitly-established'
  | 'omitted-photographed-intent-not-explicitly-established'
  | 'omitted-explicit-incompatible-treatment'

export interface NaturalSkinQualification {
  qualified: boolean
  reason: NaturalSkinQualificationReason
  humanEvidence: 'none' | 'authored' | 'character-reference' | 'authored-and-character-reference'
  photographedEvidence: 'none' | 'authored' | 'selected-style' | 'authored-and-selected-style'
  incompatibleEvidence?: string
}

const ORGANIC_HUMAN = /\b(?:organic\s+human|human\s+(?:subject|person|woman|man|girl|boy)|woman|man|girl|boy|person|people|actor|actress)\b/i
const VISIBLE_SUBJECT = /\b(?:visible|visibly|shown|appears?|on[ -]screen|in[ -]frame)\b/i
const PHOTOGRAPHED = /\b(?:photo-?real(?:istic)?|photograph(?:ed|ic|y)?|physically\s+photographed|live[ -]action)\b/i
const INCOMPATIBLE = /\b(?:non[ -]human|robot|android|mannequin|doll|plastic\s+skin|rubber\s+skin|synthetic\s+skin|porcelain(?:\s+skin|\s+treatment)?|cartoon|anime|illustration|clay(?:mation)?|stop[ -]motion)\b/i

function positiveAuthoredText(request: GenerationRequest): string {
  const authored = request.authoredPrompt ?? request.prompt ?? ''
  return authored.replace(/(?:^|\n)\s*(?:NEGATIVE PROMPT|HARD AVOID)\s*:?[\s\S]*$/i, '')
}

function evidenceKind<T extends 'character-reference' | 'selected-style'>(
  authored: boolean,
  connected: boolean,
  connectedLabel: T,
): 'none' | 'authored' | T | `authored-and-${T}` {
  if (authored && connected) return `authored-and-${connectedLabel}` as `authored-and-${T}`
  if (authored) return 'authored'
  if (connected) return connectedLabel
  return 'none'
}

export const NATURAL_SKIN_POSITIVE_CLAUSES = [
  'Render natural photographed human skin with visible pore-level texture, fine vellus hair, subtle capillary variation and pore shadowing consistent with the established physical light.',
  'Skin texture responds consistently to the established physical-light direction, preserving natural pore shadows, soft highlight roll-off and realistic variation across visible facial regions.',
  'Preserve each actor’s approved identity, age, complexion and distinctive facial features without beautification, artificial smoothing or material substitution.',
] as const

export const NATURAL_SKIN_NEGATIVE_TERMS = [
  'plastic skin',
  'waxy skin',
  'rubber skin',
  'synthetic skin',
  'porcelain skin',
  'airbrushed skin',
  'beauty-filter skin',
  'excessive skin smoothing',
  'uniform poreless skin',
  'CGI facial texture',
  'oily plastic highlights',
  'facial texture flicker',
] as const

function includesCaseInsensitive(text: string, value: string): boolean {
  return text.toLocaleLowerCase().includes(value.toLocaleLowerCase())
}

export interface NaturalSkinProviderSupportDiagnostic {
  code: 'natural-skin-provider-support'
  severity: 'info'
  blocking: false
  status: 'semantic-prompt-only'
  nativeSupport: 'native-unverified'
  qualification: NaturalSkinQualificationReason
  message: string
}

export function providerNaturalSkinSupportDiagnostic(request: GenerationRequest): NaturalSkinProviderSupportDiagnostic {
  const qualification = naturalSkinQualification(request)
  return {
    code: 'natural-skin-provider-support',
    severity: 'info',
    blocking: false,
    status: 'semantic-prompt-only',
    nativeSupport: 'native-unverified',
    qualification: qualification.reason,
    message: qualification.qualified
      ? 'Natural skin rendering is semantic prompt intent only; native pore or skin-material controls are unverified and generated behavior is not guaranteed.'
      : `Natural skin rendering was ${qualification.reason}; native pore or skin-material controls are unverified.`,
  }
}

export function providerNativeNaturalSkinFields(): Record<string, never> {
  return {}
}

export interface NaturalSkinProviderPromptCompilation {
  text: string
  qualification: NaturalSkinQualification
  addedPositiveClauses: readonly string[]
  addedNegativeTerms: readonly string[]
}

export function compileNaturalSkinProviderPrompt(request: GenerationRequest, providerOwnedText: string): NaturalSkinProviderPromptCompilation {
  const qualification = naturalSkinQualification(request)
  if (!qualification.qualified) return { text: providerOwnedText, qualification, addedPositiveClauses: [], addedNegativeTerms: [] }

  const addedPositiveClauses = NATURAL_SKIN_POSITIVE_CLAUSES.filter((clause) => !includesCaseInsensitive(providerOwnedText, clause))
  const addedNegativeTerms = NATURAL_SKIN_NEGATIVE_TERMS.filter((term) => !includesCaseInsensitive(providerOwnedText, term))
  const additions = [
    addedPositiveClauses.length ? `NATURAL SKIN TEXTURE\n${addedPositiveClauses.join('\n\n')}` : '',
    addedNegativeTerms.length ? `NEGATIVE PROMPT\n${addedNegativeTerms.join(', ')}` : '',
  ].filter(Boolean)
  return {
    text: additions.length ? `${providerOwnedText}\n\n${additions.join('\n\n')}` : providerOwnedText,
    qualification,
    addedPositiveClauses,
    addedNegativeTerms,
  }
}

export function naturalSkinQualification(request: GenerationRequest): NaturalSkinQualification {
  const authored = positiveAuthoredText(request)
  const characterText = (request.references || [])
    .filter((reference) => reference.role === 'character')
    .map((reference) => reference.description || '')
    .join('\n')
  const selectedStyle = request.stylePrompt || ''
  const humanInAuthored = ORGANIC_HUMAN.test(authored) && VISIBLE_SUBJECT.test(authored)
  const humanInReference = ORGANIC_HUMAN.test(characterText) && VISIBLE_SUBJECT.test(characterText)
  const photographedInAuthored = PHOTOGRAPHED.test(authored)
  const photographedInStyle = PHOTOGRAPHED.test(selectedStyle)
  const humanEvidence = evidenceKind(humanInAuthored, humanInReference, 'character-reference')
  const photographedEvidence = evidenceKind(photographedInAuthored, photographedInStyle, 'selected-style')
  const incompatible = INCOMPATIBLE.exec([authored, characterText, selectedStyle].filter(Boolean).join('\n'))?.[0]

  if (incompatible) return {
    qualified: false,
    reason: 'omitted-explicit-incompatible-treatment',
    humanEvidence,
    photographedEvidence,
    incompatibleEvidence: incompatible,
  }
  if (!humanInAuthored && !humanInReference) return {
    qualified: false,
    reason: 'omitted-human-not-explicitly-established',
    humanEvidence,
    photographedEvidence,
  }
  if (!photographedInAuthored && !photographedInStyle) return {
    qualified: false,
    reason: 'omitted-photographed-intent-not-explicitly-established',
    humanEvidence,
    photographedEvidence,
  }
  return {
    qualified: true,
    reason: 'qualified-explicit-photographed-organic-human',
    humanEvidence,
    photographedEvidence,
  }
}
