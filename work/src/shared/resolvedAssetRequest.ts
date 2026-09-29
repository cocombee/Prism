export type SemanticAssetType = 'character' | 'wardrobe' | 'element' | 'background' | 'location' | (string & {})
export type SemanticRatio = '1:1' | '4:3' | '16:9'

export type AgeControl =
  | { mode: 'unspecified' }
  | { mode: 'preset'; value: '0–3 years' | '4–12 years' | '13–17 years' | '18–29 years' | '30–44 years' | '45–64 years' | '65+ years' }
  | { mode: 'exact'; years?: number }

export type HeightControl =
  | { mode: 'unspecified' }
  | { mode: 'preset'; value: 'Shorter for age' | 'Typical for age' | 'Taller for age' }
  | { mode: 'exact'; unit: 'cm'; cm?: number }
  | { mode: 'exact'; unit: 'ft-in'; feet?: number; inches?: number }

export interface CharacterControlState {
  age: AgeControl
  height: HeightControl
  bodyFrame: 'unspecified' | 'narrow' | 'medium' | 'broad'
  softTissueFullness: 'unspecified' | 'low' | 'moderate' | 'high'
  muscularity: 'unspecified' | 'low' | 'moderate' | 'high'
  exactAgeYears?: number
  exactHeightUnit?: 'cm' | 'ft-in'
  exactHeightCm?: number
  exactHeightFeet?: number
  exactHeightInches?: number
}

export const CHARACTER_DEFAULT_NINE_VIEWS = [
  'Front face — neutral headshot',
  'Right three-quarter head — facing image-left',
  'Profile head',
  'Full body front',
  'Back upper body',
  'Front face — natural smile',
  'Left three-quarter head — facing image-right',
  'Side body',
  'Back body',
] as const

export interface SemanticModelCapability {
  provider: string
  modelId: string
  ratios: readonly SemanticRatio[]
  promptLanguages: 'all' | readonly string[]
}

export function semanticModelCapability(provider: string, modelId: string): SemanticModelCapability {
  const identity = `${provider}/${modelId}`.toLowerCase()
  const knownImageRoute = /flux|nano-banana|gemini|imagen|gpt-image|seedream/.test(identity)
  return {
    provider,
    modelId,
    ratios: knownImageRoute ? ['1:1', '4:3', '16:9'] : [],
    promptLanguages: /flux|black[- ]forest/.test(identity) ? ['en'] : 'all',
  }
}

export interface ResolvedAssetRequestInput {
  assetType: SemanticAssetType
  originalText: string
  detectedLanguage?: string
  controls?: CharacterControlState
  requestedViews?: readonly string[]
  explicitRatio?: SemanticRatio
  styleText?: string
  wardrobeDetails?: readonly string[]
  elementGeometry?: { asymmetricSide?: boolean; top?: boolean; bottom?: boolean; mechanism?: boolean; connection?: boolean; material?: boolean }
  wideGeometry?: boolean
  model: SemanticModelCapability
  compatibleModels?: readonly SemanticModelCapability[]
}

function characterViews(requested: readonly string[] | undefined): string[] {
  if (!requested?.length) return [...CHARACTER_DEFAULT_NINE_VIEWS]
  const views = [...requested]
  const joined = requested.join('\n')
  if (!/front[^\n]*(?:face|head)|(?:face|head)[^\n]*front/i.test(joined)) views.push('front face')
  if (!/(?:three[- ]quarter|3\s*\/\s*4)/i.test(joined)) views.push('three-quarter head')
  if (!/full[- ]body|head[- ]to[- ]feet|head to feet/i.test(joined)) views.push('full body front')
  return views
}

function elementViews(geometry: ResolvedAssetRequestInput['elementGeometry']): string[] {
  const views = ['front', 'three-quarter', 'back']
  if (geometry?.asymmetricSide) views.push('profile')
  if (geometry?.top) views.push('top')
  if (geometry?.bottom) views.push('bottom')
  if (geometry?.mechanism) views.push('mechanism')
  if (geometry?.connection) views.push('connection')
  if (geometry?.material) views.push('material')
  return views
}

const RATIO_CAPACITY: Record<SemanticRatio, number> = { '1:1': 3, '4:3': 6, '16:9': Number.POSITIVE_INFINITY }
const RATIO_ORDER: SemanticRatio[] = ['1:1', '4:3', '16:9']

function resolveRatio(input: ResolvedAssetRequestInput, viewCount: number): { aspectRatio?: SemanticRatio; reason?: string } {
  if (input.explicitRatio) return input.model.ratios.includes(input.explicitRatio)
    ? { aspectRatio: input.explicitRatio }
    : { reason: `${input.model.provider} / ${input.model.modelId} does not support the explicitly requested ${input.explicitRatio} ratio.` }
  const requiredViews = input.wideGeometry ? 7 : viewCount
  const desired = RATIO_ORDER.find((ratio) => RATIO_CAPACITY[ratio] >= requiredViews) || '16:9'
  const supported = RATIO_ORDER.find((ratio) => RATIO_ORDER.indexOf(ratio) >= RATIO_ORDER.indexOf(desired) && input.model.ratios.includes(ratio))
  if (supported) return { aspectRatio: supported }
  return { reason: `${input.model.provider} / ${input.model.modelId} cannot preserve readable coverage for ${requiredViews === 9 ? 'the default nine views' : `${requiredViews} views`} with its exact supported ratios.` }
}

function acceptsLanguage(model: SemanticModelCapability, language: string | undefined): boolean {
  if (!language || language === 'und' || model.promptLanguages === 'all') return true
  const base = language.toLowerCase().split('-')[0]
  return model.promptLanguages.some((candidate) => candidate.toLowerCase() === language.toLowerCase() || candidate.toLowerCase().split('-')[0] === base)
}

export function composeResolvedAssetRequest(input: ResolvedAssetRequestInput) {
  const isCharacter = input.assetType === 'character'
  const dimensions = { appliedDimensions: {}, omittedDimensions: [], suppressedDimensions: [] }
  const views = isCharacter ? characterViews(input.requestedViews) : input.assetType === 'element' ? elementViews(input.elementGeometry) : []
  const structuralRules = input.assetType === 'background' || input.assetType === 'location'
    ? ['The authored environment fills the frame; do not add a studio background.']
    : ['Use one uninterrupted seamless studio field of exact #D8D8D6.', 'Do not add cells, dividers, borders, gradients, texture, scenery, labels, or environmental context.']
  if (input.assetType === 'wardrobe') {
    structuralRules.push('Do not show a model wearing the wardrobe by default; include front and back where informative.')
    if (input.wardrobeDetails?.length) structuralRules.push(`Add only authored, relevant construction/detail coverage for: ${input.wardrobeDetails.join(', ')}.`)
  }
  if (input.assetType === 'element') structuralRules.push('Preserve authored geometry and function; do not duplicate symmetric sides without new information.')
  if (input.styleText) structuralRules.push('Style may affect rendering language only; it must not overwrite identity, authored detail, geometry, construction, coverage, or continuity.')
  const ratio = resolveRatio(input, views.length || (input.assetType === 'wardrobe' ? Math.max(2, (input.wardrobeDetails?.length || 0) + 2) : input.wideGeometry ? 7 : 1))
  const languageBlocked = !acceptsLanguage(input.model, input.detectedLanguage)
  const reasons: string[] = []
  if (languageBlocked) reasons.push(`${input.model.provider} / ${input.model.modelId} does not accept original-language input tagged ${input.detectedLanguage}.`)
  if (ratio.reason) reasons.push(ratio.reason)
  const compatibleModels = languageBlocked
    ? (input.compatibleModels || []).filter((model) => acceptsLanguage(model, input.detectedLanguage)).map(({ provider, modelId }) => ({ provider, modelId }))
    : undefined
  return {
    assetType: input.assetType,
    originalText: input.originalText,
    detectedLanguage: input.detectedLanguage,
    ...dimensions,
    views,
    aspectRatio: ratio.aspectRatio,
    structuralRules,
    style: input.styleText ? { text: input.styleText, scope: 'rendering-only' as const } : undefined,
    preflight: { blocked: reasons.length > 0, reasons, ...(compatibleModels ? { compatibleModels } : {}) },
  }
}

export function applyResolvedAssetRequest<T extends { prompt?: string; aspectRatio?: string }>(request: T, input: ResolvedAssetRequestInput, options: { includeViews?: boolean } = {}): { resolved: ReturnType<typeof composeResolvedAssetRequest>; request?: T & { prompt: string; aspectRatio: SemanticRatio } } {
  const resolved = composeResolvedAssetRequest(input)
  if (resolved.preflight.blocked || !resolved.aspectRatio) return { resolved }
  const viewRule = options.includeViews !== false && resolved.views.length ? [`Required view coverage, in order: ${resolved.views.join('; ')}.`] : []
  const constraints = [...viewRule, ...resolved.structuralRules]
  const prompt = [request.prompt ?? input.originalText, constraints.length ? `PRISM STRUCTURAL REQUIREMENTS:\n${constraints.join('\n')}` : ''].filter(Boolean).join('\n\n')
  return { resolved, request: { ...request, prompt, aspectRatio: resolved.aspectRatio } }
}

export function migrateCharacterControls<T extends Record<string, unknown>>(data: T): T {
  return data
}
