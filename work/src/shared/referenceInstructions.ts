import { cinematicDirection } from './cinematicDirection'
import { buildContinuityLedger, productionShotSpecSections, seedanceShotSpecSections, type ContinuityLedger } from './shotSpec'
import type { GenerationRequest } from './types'
import { resolveVideoModel } from './videoModels'
import { validateSeedanceDirectorPrompt } from './seedanceDirectorValidation'
import { providerMotionControlDiagnostic, type ProviderMotionControlDiagnostic } from './providerShutter'
import {
  compileNaturalSkinProviderPrompt,
  providerNaturalSkinSupportDiagnostic,
  type NaturalSkinProviderSupportDiagnostic,
} from './naturalSkinRendering'
import { cameraSupportProviderDiagnostic, type CameraSupportProviderDiagnostic } from './cameraSupportSemantics'
import { isReferenceExclusive } from './referenceVisualAuthority'
import { providerVisibleReferences, sameBodyAuthorityReadinessFailures } from './sameBodyAuthority'
import { propScaleReadinessFailures } from './propScaleAuthority'

type Reference = NonNullable<GenerationRequest['references']>[number]

export type PromptFamily = 'generic' | 'seedance' | 'kling' | 'veo' | 'wan'
export type PromptBlockId = 'authored' | 'style' | 'reference-legend' | 'authority' | 'direction' | 'gates' | `shot-spec-${string}`

export interface PromptBlock {
  id: PromptBlockId
  label: string
  priority: number
  text: string
  required?: boolean
}

export interface PromptCompilation {
  family: PromptFamily
  text: string
  blocks: PromptBlock[]
  droppedBlocks: string[]
  ceiling?: number
  controlDiagnostics?: Array<ProviderMotionControlDiagnostic | NaturalSkinProviderSupportDiagnostic | CameraSupportProviderDiagnostic>
  continuityLedger?: ContinuityLedger
  promptBudgetDiagnostic?: {
    modelId: string
    limit: number
    limitSource: string
    measuredCharacterCount: number
    compressedCharacterCount: number
    blocking: boolean
    blockingReason?: string
  }
}

export interface PromptLegend {
  heading: string
  body: string
  footer?: string
}

/** Character ceilings stay unset until an authoritative provider limit is documented. */
export const PROVIDER_PROMPT_CEILINGS: Partial<Record<PromptFamily, number>> = {}

function promptFamily(request: GenerationRequest): PromptFamily {
  if (request.kind !== 'video-generator') return 'generic'
  const family = resolveVideoModel(request.videoEngine).family
  return ['seedance', 'kling', 'veo', 'wan'].includes(family) ? family as PromptFamily : 'generic'
}

function genericBlockRenderer(blocks: PromptBlock[]): string {
  return blocks.map((block) => block.text).filter(Boolean).join('\n\n')
}

const FAMILY_RENDERERS: Record<PromptFamily, (blocks: PromptBlock[]) => string> = {
  generic: genericBlockRenderer,
  seedance: genericBlockRenderer,
  kling: genericBlockRenderer,
  veo: genericBlockRenderer,
  wan: genericBlockRenderer,
}

function safelyDeduplicateOptionalBlock(block: PromptBlock): PromptBlock {
  if (block.required) return block
  const seen = new Set<string>()
  const lines = block.text.split('\n').filter((line) => {
    if (!line.trim() || !seen.has(line)) {
      if (line.trim()) seen.add(line)
      return true
    }
    return false
  })
  return { ...block, text: lines.join('\n') }
}

export function referenceRoleInstructions(references: NonNullable<GenerationRequest['references']>): string {
  const characterReferences = references.filter((reference) => reference.role === 'character')
  const characterGroups = new Map<string, typeof characterReferences>()
  for (const reference of characterReferences) {
    const key = reference.tag || '@character'
    characterGroups.set(key, [...(characterGroups.get(key) || []), reference])
  }
  const characterInstructions = [...characterGroups.entries()].map(([tag, group]) => {
    const sourceViews = [...new Set(group.flatMap((reference) => reference.sourceViews || (reference.view ? [reference.view] : [])))]
    const views = sourceViews.length ? sourceViews.join(', ') : group.map((reference) => reference.name).filter(Boolean).join(', ')
    const facialViews = sourceViews.filter((view) => ['front', 'profile', 'three-quarter', 'left-three-quarter', 'smile', 'neutral'].includes(view))
    const bodyViews = sourceViews.filter((view) => ['full-body', 'side-body', 'full-body-back', 'back'].includes(view))
    const compiledSheet = group.length === 1 && sourceViews.length > 1
    const presentation = compiledSheet
      ? `one hidden compiled reference sheet containing ${sourceViews.length} coordinated views${views ? ` (${views})` : ''}`
      : `${group.length} coordinated reference image${group.length === 1 ? '' : 's'}${views ? ` (${views})` : ''}`
    const layoutGuard = compiledSheet ? ' Treat every panel as a view of the same person; never render the sheet layout, gutters, or multiple copies of the person in the output.' : ''
    return `${tag} is one character shown in ${presentation}.${layoutGuard} Character Identity: preserve this exact person independently of every other connected character. ${facialViews.length ? 'Use the front, profile, both three-quarter, smile, and neutral views as the sole face/head identity authority.' : 'Use the clearest visible face as the sole face/head identity authority.'} ${bodyViews.length ? 'Use front, side, and rear full-body plus back views for body proportions, wardrobe construction, accessories, and rear continuity only.' : ''} Preserve the same head shape, facial proportions, age, skin tone, visible hair or hijab/headwear, natural asymmetry, body proportions, wardrobe construction, accessories, and defining features in every shot and after every occlusion. Never blend identities, replace the face, redesign clothing, or reset the character between shots. Narrative prominence comes only from the written shot prompt, never from a permanent role stored on this asset.`
  })
  const otherInstructions = references.filter((reference) => reference.role !== 'character').map((reference, index) => {
    const label = reference.tag || `@reference-${index + 1}`
    if (reference.slot === 'end') return `${label} is the Ending Frame authority. The generated scene must conclude at this exact visual state, composition, subject placement, camera viewpoint, and action result. Build a coherent transition into it; do not treat it as a loose appearance reference.`
    if (reference.slot === 'start') return `${label} is the Starting Frame authority. The generated scene must begin at this exact visual state, composition, subject placement, camera viewpoint, and action state before motion develops.`
    if (reference.role === 'storyboard' || reference.authority === 'storyboard-map') return `${label} is the Storyboard Map authority. Read its panels in the authored order as an editorial, continuity, composition, and shot-design map—not as one literal frame. Each panel interior defines one separate full-screen shot. Reconstruct clean scene detail from the panel interior; never render the storyboard sheet, borders, gutters, panel numbers, timecodes, captions, or labels. Preserve the intended shot order, subject direction, causal state changes, motivated transitions, and distinct final composition.`
    if (reference.authority === 'motion-camera') return `${label} is the Motion and Camera authority only. Preserve its camera geometry, physical path, speed curve, stabilization, performance timing, motion cadence, and temporal rhythm. Do not copy subject identity, wardrobe, location, material, color, or general appearance unless the written prompt explicitly assigns that role.`
    if (reference.authority === 'audio-timing') return `${label} is the Sound and Timing authority only. Preserve its speech, sound event, rhythm, pacing, and synchronization cues. Never derive visual identity, appearance, camera, wardrobe, object design, or location from this audio.`
    if (reference.role === 'location') return `${label} is the location authority; preserve its environment, layout, atmosphere, perspective, lighting direction, and stable scene geometry.`
    if (reference.role === 'wardrobe') return `${label} is the wardrobe authority${reference.boundCharacterTag ? ` and governs the wardrobe of ${reference.boundCharacterTag}` : ''}; preserve garment identity, silhouette, construction, materials, colors, patterns, layering, fit, accessories, and worn state on that bound character across every shot. Never copy the depicted person's identity or apply this wardrobe to another character without its own explicit Wardrobe connection.`
    if (reference.role === 'element') return `${label} is the element authority; preserve the object's design, materials, proportions, markings, construction, and attachment state.`
    if (reference.role === 'style') return `${label} is the style authority; apply its visual language, palette, texture, and finish without copying its depicted subjects.`
    return `${label} is an ordered ${reference.mediaType || 'visual'} reference; preserve its sequence position and assigned ${reference.slot || 'reference'} role.`
  })
  return [...characterInstructions, ...otherInstructions].join('\n')
}

const VIDEO_OUTPUT_HARD_GATES = `VIDEO OUTPUT HARD GATES:
DOMAIN PRIORITY: Every connected reference controls only its explicitly assigned domain. Never blend identities or let motion, audio, style, storyboard, or appearance references silently overwrite one another.
CAUSAL AND DIRECTIONAL CONTINUITY: Show cause before effect. Preserve screen direction, world-space geometry, subject/object travel vectors, attachment state, and persistent scene changes across occlusion and cuts; never reverse or reset them without an authored reason.
CAMERA AND EDIT: Use physically motivated camera movement and motivated cuts on action, gaze, sound, reveal, or a deliberate contrast. No morphing, teleportation, impossible parallax, arbitrary reframing, or treating storyboard panels as camera waypoints.
IDENTITY AND STATE: Preserve exact identity, anatomy, wardrobe, props, materials, markings, environment layout, and accumulated state through every shot and occlusion.
FINAL ACCEPTANCE: The output must preserve the intended shot order, identity, geometry, action outcome, timing relationships, and a distinct final composition.
HARD AVOID: identity blending, face replacement, anatomy or geometry morphing, wardrobe or prop redesign, invented text, logos, subtitles, watermarks, contact sheets, visible storyboard labels, unmotivated camera resets, and continuity resets.`

function semanticPromptBlocks(request: GenerationRequest, legend?: PromptLegend): PromptBlock[] {
  const prompt = request.prompt?.trim()
  const connectedVideoAuthority = request.kind === 'video-generator' && Boolean(
    (request.references || []).length
    || (request.connectionRules || []).length
    || request.stylePrompt?.trim()
    || request.storyboardShots?.length
    || request.storyboardContext?.trim()
    || request.inputPath
    || request.inputUrl,
  )
  if (!prompt && !connectedVideoAuthority) throw new Error('Add a prompt before generating media.')
  if (request.kind === 'video-generator') {
    const providerLegend = legend?.body ? `${legend.heading}:\n${legend.body}${legend.footer ? `\n${legend.footer}` : ''}` : undefined
    const sections = resolveVideoModel(request.videoEngine).family === 'seedance'
      ? seedanceShotSpecSections(request, providerLegend)
      : productionShotSpecSections(request, providerLegend)
    return sections.map((section) => ({
      id: `shot-spec-${section.id}`,
      label: section.heading,
      priority: section.priority,
      required: section.required,
      text: `${section.heading}\n${section.text}`,
    }))
  }
  const fallbackInputInstruction = request.inputRole && !(request.connectionRules || []).some((rule) => rule.tag === request.inputTag)
    ? request.inputRole === 'start-frame'
      ? `${request.inputTag || '@start-frame'} is the Starting Frame authority. HARD RULE: Begin at this exact visual state before motion develops.`
      : request.inputRole === 'source-video'
        ? `${request.inputTag || '@source-video'} is the Video To Extend authority. HARD RULE: Continue from its exact final state without regenerating its beginning.`
        : `${request.inputTag || '@source-image'} is the Source Image authority. HARD RULE: Preserve it as the exact base image and change only what the instruction requests.`
    : ''
  const connectedRules = (request.connectionRules || []).map((item) => `${item.tag} — ${item.label}: ${item.rule}`).join('\n')
  const instructions = [connectedRules, fallbackInputInstruction, referenceRoleInstructions(request.references || [])].filter(Boolean).join('\n')
  const authority = instructions ? `REFERENCE AUTHORITY AND CONTINUITY:\n${instructions}` : ''
  const direction = cinematicDirection(request)
  const style = request.stylePrompt?.trim()
  const authoredPrompt = prompt || ''
  return [
    { id: 'authored', label: 'Authored prompt', priority: 100, text: authoredPrompt, required: true },
    ...(style && !authoredPrompt.includes(style) ? [{ id: 'style' as const, label: 'Style', priority: 98, text: `STYLE:\n${style}`, required: true }] : []),
    ...(legend?.body ? [{ id: 'reference-legend' as const, label: 'Provider reference map', priority: 95, text: `${legend.heading}:\n${legend.body}${legend.footer ? `\n${legend.footer}` : ''}`, required: true }] : []),
    ...(authority ? [{ id: 'authority' as const, label: 'Reference authority', priority: 90, text: authority }] : []),
    ...(direction ? [{ id: 'direction' as const, label: 'Direction Layer', priority: 30, text: direction }] : []),
  ]
}

export interface PromptCompileOptions {
  family?: PromptFamily
  legend?: PromptLegend
  ceiling?: number
  ceilingSource?: string
}

export function compileProviderPrompt(request: GenerationRequest, options: PromptCompileOptions = {}): PromptCompilation {
  const effectiveRequest = { ...request, references: providerVisibleReferences(request) }
  const family = options.family || promptFamily(effectiveRequest)
  const ceiling = options.ceiling ?? PROVIDER_PROMPT_CEILINGS[family]
  const rawBlocks = semanticPromptBlocks(effectiveRequest, options.legend)
  const measuredCharacterCount = FAMILY_RENDERERS[family](rawBlocks).length
  let blocks = rawBlocks
  const droppedBlocks: string[] = []
  if (ceiling && measuredCharacterCount > ceiling) {
    blocks = rawBlocks.map(safelyDeduplicateOptionalBlock)
    const original = blocks
    const kept = new Set(original.filter((block) => block.required))
    const ranked = original.filter((block) => !block.required).sort((a, b) => b.priority - a.priority)
    let stopped = false
    for (const block of ranked) {
      if (stopped) {
        droppedBlocks.push(block.label)
        continue
      }
      const candidate = original.filter((item) => kept.has(item) || item === block)
      if (FAMILY_RENDERERS[family](candidate).length <= ceiling) kept.add(block)
      else {
        droppedBlocks.push(block.label)
        stopped = true
      }
    }
    blocks = original.filter((block) => kept.has(block))
  }
  const controlDiagnostics: Array<ProviderMotionControlDiagnostic | NaturalSkinProviderSupportDiagnostic | CameraSupportProviderDiagnostic> = [providerNaturalSkinSupportDiagnostic(effectiveRequest)]
  if (effectiveRequest.kind === 'video-generator') controlDiagnostics.unshift(providerMotionControlDiagnostic(resolveVideoModel(effectiveRequest.videoEngine)))
  const cameraSupportDiagnostic = cameraSupportProviderDiagnostic((effectiveRequest.storyboardShots || []).map((shot) => shot.camera))
  if (cameraSupportDiagnostic) controlDiagnostics.push(cameraSupportDiagnostic)
  const text = FAMILY_RENDERERS[family](blocks)
  const blocking = Boolean(ceiling && text.length > ceiling)
  const promptBudgetDiagnostic = ceiling ? {
    modelId: request.videoEngine || family,
    limit: ceiling,
    limitSource: options.ceilingSource || `configured-${family}-prompt-ceiling`,
    measuredCharacterCount,
    compressedCharacterCount: text.length,
    blocking,
    blockingReason: blocking
      ? `Selected model prompt remains ${text.length} characters, above its configured ${ceiling}-character limit after safe deterministic deduplication; mandatory continuity state was preserved without truncation. Shorten authored prose or choose a model with a larger configured limit.`
      : undefined,
  } : undefined
  return { family, text, blocks, droppedBlocks, ceiling, controlDiagnostics, continuityLedger: effectiveRequest.kind === 'video-generator' ? buildContinuityLedger(effectiveRequest) : undefined, promptBudgetDiagnostic }
}

export function compileProviderPromptForSubmission(request: GenerationRequest, options: PromptCompileOptions = {}): PromptCompilation {
  const bodyAuthorityFailures = sameBodyAuthorityReadinessFailures(request)
  if (bodyAuthorityFailures.length) throw new Error(`Same-body authority blocks provider dispatch: ${bodyAuthorityFailures.join('; ')}`)
  const propScaleFailures = propScaleReadinessFailures(request)
  if (propScaleFailures.length) throw new Error(`Prop scale authority blocks provider dispatch: ${propScaleFailures.join('; ')}`)
  const compilation = compileProviderPrompt(request, options)
  if (compilation.promptBudgetDiagnostic?.blocking) throw new Error(`Prompt budget blocks provider dispatch: ${compilation.promptBudgetDiagnostic.blockingReason}`)
  const hidden = compileNaturalSkinProviderPrompt(request, compilation.text)
  return { ...compilation, text: hidden.text }
}

export function resolvedPromptWithReferences(request: GenerationRequest): string {
  return compileProviderPromptForSubmission(request).text
}

function providerImageReferenceKey(reference: Reference, index: number): string {
  return reference.path || reference.url || `${reference.tag || reference.name || 'reference'}:${reference.view || index}`
}

/** Mirrors the exact anonymous image order used by fal, OpenAI, and Google image requests. */
export function orderedProviderImageReferences(request: GenerationRequest): Reference[] {
  const ordered: Reference[] = []
  if (request.inputPath || request.inputUrl) ordered.push({
    role: 'reference', path: request.inputPath, url: request.inputUrl, name: request.inputName,
    tag: request.inputTag, mediaType: 'image', slot: request.inputRole === 'start-frame' ? 'start' : 'reference',
  })
  const authoredPrompt = request.prompt || ''
  const remaining = providerVisibleReferences(request)
    .filter((reference) => !reference.mediaType || reference.mediaType === 'image')
    .map((reference, stableIndex) => ({
      reference,
      stableIndex,
      promptIndex: reference.tag?.trim() ? authoredPrompt.indexOf(reference.tag.trim()) : -1,
    }))
    .sort((a, b) => {
      const aRank = a.promptIndex < 0 ? Number.MAX_SAFE_INTEGER : a.promptIndex
      const bRank = b.promptIndex < 0 ? Number.MAX_SAFE_INTEGER : b.promptIndex
      return aRank - bRank || a.stableIndex - b.stableIndex
    })
    .map(({ reference }) => reference)
  ordered.push(...remaining)
  const seen = new Set<string>()
  return ordered.filter((reference, index) => {
    const key = providerImageReferenceKey(reference, index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Exact artwork is placed deterministically after generation. Providers receive
 * only blank-carrier geometry so they cannot redraw or semantically substitute it.
 */
export function providerArtworkCarrierRequest(request: GenerationRequest): GenerationRequest {
  const locked = (request.references || []).filter((reference) => reference.fidelity === 'lock' && reference.role === 'reference' && reference.path && (!reference.mediaType || reference.mediaType === 'image'))
  if (!locked.length) return request
  let prompt = request.prompt || ''
  locked.forEach((reference, index) => {
    if (!reference.tag?.trim()) return
    const escaped = reference.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    prompt = prompt.replace(new RegExp(`${escaped}(?![\\p{L}\\p{N}_-])`, 'gu'), `Reserved Blank Carrier ${index + 1}`)
  })
  const carrierRule = `POST-COMPOSITE ARTWORK CARRIERS\nReserved Blank Carrier 1 through ${locked.length} are geometry instructions only. Build every requested carrier as a distinct, completely blank, clean, fully visible, unobstructed printable face with no text, logo, mark, emblem, symbol, decoration, placeholder, identifier, or guessed content. Preserve the authored spatial assignment. Keep horizontal carriers wide landscape, front-facing or nearly front-facing, separated from one another, and large enough for the supplied artwork with at least 8% clear paper margin on every side. No person, number, foreground object, plinth edge, shadow, or other carrier may cross, cover, crop, intersect, or sit in front of any printable face. When the authored composition uses stacked placards with a hero number or object, place every placard face entirely above and clear of that hero element; the lowest placard must never overlap it or sit behind it. Keep circular carriers round and equally unobstructed. Never render the words “Reserved”, “Blank”, or “Carrier”, and never infer topical or associated wording. Original artwork will be placed deterministically after this generation.`
  return {
    ...request,
    prompt: [prompt, carrierRule].filter(Boolean).join('\n\n'),
    references: (request.references || []).filter((reference) => !locked.includes(reference)),
  }
}

function providerImageLabel(indices: number[]): string {
  return indices.length === 1 ? `Reference Image ${indices[0]}` : `Reference Images ${indices.join(', ')}`
}

function translateImageReferenceTags(text: string, orderedReferences: Reference[]): string {
  const positions = new Map<string, number[]>()
  orderedReferences.forEach((reference, index) => {
    if (!reference.tag?.trim()) return
    positions.set(reference.tag, [...(positions.get(reference.tag) || []), index + 1])
  })
  if (!positions.size) return text
  let translated = text
  for (const [tag, indices] of [...positions.entries()].sort((a, b) => b[0].length - a[0].length)) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    translated = translated.replace(new RegExp(`${escaped}(?![\\p{L}\\p{N}_-])`, 'gu'), providerImageLabel(indices))
  }
  const leakedTag = [...positions.keys()].find((tag) => {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`${escaped}(?![\\p{L}\\p{N}_-])`, 'u').test(translated)
  })
  if (leakedTag) throw new Error(`The provider image prompt still contains an internal asset tag: ${leakedTag}`)
  const labels = orderedReferences.map((_reference, index) => `Reference Image ${index + 1}`).join(', ')
  return `PROVIDER IMAGE REFERENCE RULE\n${labels} identify attached inputs only. Every translated Reference Image occurrence in the user prompt is an exact placement assignment; preserve its number-to-source and source-to-location mapping without swapping, merging, duplicating, or cross-contaminating references. Never render, print, typeset, caption, or reproduce these identifiers or any internal @asset tag in the output. Do not output an at sign, username, handle, slug, node name, layer name, file name, placeholder, or variable label. Use only the visual content assigned to each identifier.\n\nREFERENCE-GROUNDED CONTENT RULE\nAttached artwork, logos, marks, and lettering are authoritative source pixels, not inspiration. Reproduce only the source content explicitly requested by the user. Never replace, redraw, reinterpret, supplement, or contextualize it with a related brand, campaign, government mark, slogan, emblem, label, or other text from learned knowledge. Never add any logo, word, or mark that is absent from both the authored prompt and the attached source pixels. Do not infer surrounding, associated, or topical text from a source image. If exact reproduction is uncertain, preserve the supplied source pixels rather than inventing or substituting content.\n\n${translated}`
}

export function providerNativeImagePrompt(request: GenerationRequest, orderedReferences = orderedProviderImageReferences(request)): string {
  const compilation = compileProviderPromptForSubmission({ ...request, references: orderedReferences })
  return translateImageReferenceTags(compilation.text, orderedReferences)
}

export function klingProviderReferenceGuide(request: GenerationRequest): string {
  const references = request.references || []
  const elements = references.filter((reference) => reference.slot !== 'start' && reference.slot !== 'end' && (reference.role === 'character' || reference.role === 'element' || reference.mediaType === 'video'))
  const appearances = references.filter((reference) => reference.slot !== 'start' && reference.slot !== 'end' && (!reference.mediaType || reference.mediaType === 'image') && !elements.includes(reference))
  const legend = klingReferenceLegend(elements, appearances)
  return legend ? `\n\nKLING REFERENCE MAP:\n${legend}\nUse the exact @Element and @Image labels above. Views grouped into one @Element are one identity or object, not separate subjects.` : ''
}

function klingLegendFromGuide(referenceGuide: string): PromptLegend | undefined {
  const trimmed = referenceGuide.trim()
  if (!trimmed) return undefined
  const [headingLine, ...bodyLines] = trimmed.split('\n')
  return { heading: headingLine.replace(/:$/, ''), body: bodyLines.join('\n') }
}

/** Builds the exact provider-native Kling shot prompts without dropping global Style or semantic context. */
export function klingStoryboardPrompts(request: GenerationRequest, referenceGuide = klingProviderReferenceGuide(request)): NonNullable<GenerationRequest['multiPrompt']> | undefined {
  return request.multiPrompt?.map((shot, index) => {
    const shotPrompt = [request.storyboardContext, shot.prompt].filter(Boolean).join('\n\n')
    const storyboardShots = request.storyboardShots?.[index] ? [request.storyboardShots[index]] : undefined
    const resolvedShotPrompt = compileProviderPromptForSubmission({ ...request, prompt: shotPrompt, authoredPrompt: storyboardShots?.[0]?.prompt || shot.prompt, storyboardShots, multiPrompt: undefined }, { family: 'kling', legend: klingLegendFromGuide(referenceGuide) }).text
    return { prompt: resolvedShotPrompt, duration: shot.duration }
  })
}

const characterViewPriority = ['front', 'three-quarter', 'profile', 'full-body', 'back', 'smile', 'left-three-quarter', 'side-body', 'full-body-back']

function characterViewRank(reference: Reference): number {
  const rank = characterViewPriority.indexOf(reference.view || '')
  return rank === -1 ? characterViewPriority.length : rank
}

/** Selects the exact model-valid set that Seedance will receive while retaining all source assets in the project library. */
export interface SeedanceReferenceLimits {
  images: number
  videos: number
  audios: number
  total: number
}

const DEFAULT_SEEDANCE_REFERENCE_LIMITS: SeedanceReferenceLimits = { images: 9, videos: 3, audios: 3, total: 12 }

export function selectSeedanceReferences<T extends Reference>(references: T[], limits: Readonly<SeedanceReferenceLimits> = DEFAULT_SEEDANCE_REFERENCE_LIMITS): { images: T[]; videos: T[]; audios: T[]; omitted: T[] } {
  const allImages = references.filter((reference) => !reference.mediaType || reference.mediaType === 'image')
  const videos = references.filter((reference) => reference.mediaType === 'video').slice(0, limits.videos)
  const audios = references.filter((reference) => reference.mediaType === 'audio').slice(0, limits.audios)
  const imageBudget = Math.max(0, Math.min(limits.images, limits.total - videos.length - audios.length))
  const selected: T[] = []
  const add = (reference?: T) => {
    if (reference && selected.length < imageBudget && !selected.includes(reference)) selected.push(reference)
  }

  // Preserve explicit timeline anchors first.
  allImages.filter((reference) => reference.slot === 'start' || reference.slot === 'end').forEach(add)
  // A compiled storyboard sheet is the central editorial map and must survive a crowded reference budget.
  allImages.filter((reference) => reference.role === 'storyboard' || reference.authority === 'storyboard-map').forEach(add)
  const groups = new Map<string, T[]>()
  for (const reference of allImages) {
    const key = `${reference.role}|${reference.tag || reference.name || 'reference'}`
    groups.set(key, [...(groups.get(key) || []), reference])
  }
  // Give every semantic asset one authoritative image before adding extra identity views.
  for (const group of groups.values()) {
    const ranked = group[0]?.role === 'character' ? [...group].sort((a, b) => characterViewRank(a) - characterViewRank(b)) : group
    add(ranked[0])
  }
  // Characters receive one body/wardrobe authority in addition to the strongest face view.
  for (const group of groups.values()) {
    if (group[0]?.role !== 'character') continue
    add(group.find((reference) => ['full-body', 'side-body', 'full-body-back', 'back'].includes(reference.view || '')))
  }
  // Fill the remaining budget by identity usefulness, then by original connection order.
  const remaining = allImages.filter((reference) => !selected.includes(reference)).sort((a, b) => {
    if (a.role === 'character' && b.role !== 'character') return -1
    if (a.role !== 'character' && b.role === 'character') return 1
    return a.role === 'character' ? characterViewRank(a) - characterViewRank(b) : 0
  })
  remaining.forEach(add)
  const images = selected
  const kept = new Set([...images, ...videos, ...audios])
  return { images, videos, audios, omitted: references.filter((reference) => !kept.has(reference)) }
}

type SeedanceProviderBindings = Map<string, string[]>

function plainSemanticLabel(tag: string): string {
  return tag.replace(/^@/, '')
}

function seedanceProviderBindings(images: Reference[], videos: Reference[], audios: Reference[], bracketTokens = false): SeedanceProviderBindings {
  const token = (kind: 'Image' | 'Video' | 'Audio', index: number) => bracketTokens ? `[${kind}${index + 1}]` : `@${kind}${index + 1}`
  const bindings: SeedanceProviderBindings = new Map()
  const add = (reference: Reference, token: string) => {
    if (!reference.tag?.trim()) return
    bindings.set(reference.tag, [...(bindings.get(reference.tag) || []), token])
  }
  images.forEach((reference, index) => add(reference, token('Image', index)))
  videos.forEach((reference, index) => add(reference, token('Video', index)))
  audios.forEach((reference, index) => add(reference, token('Audio', index)))
  return bindings
}

function seedanceProviderBinding(tag: string, bindings: SeedanceProviderBindings): string {
  return bindings.get(tag)?.join(' + ') || plainSemanticLabel(tag)
}

function seedanceReferenceMeaning(reference: Reference, boundCharacters = new Set<string>(), bindings: SeedanceProviderBindings = new Map()): string {
  const semanticTag = reference.tag || '@reference'
  const tag = plainSemanticLabel(semanticTag)
  if (reference.role === 'storyboard' || reference.authority === 'storyboard-map') return `${tag} storyboard map — ordered editorial, continuity, composition, and shot-design authority; use each panel interior as a separate full-screen shot and never render the sheet, borders, gutters, labels, numbers, timecodes, or captions`
  if (reference.authority === 'motion-camera') return `${tag} motion reference — camera geometry, physical path, speed curve, stabilization, performance timing, cadence, and temporal-rhythm authority only; do not copy appearance`
  if (reference.authority === 'audio-timing') return `${tag} audio reference — speech, sound-event, rhythm, pacing, and synchronization authority only; never derive visuals`
  if (reference.role === 'character') {
    const view = reference.view ? reference.view.replaceAll('-', ' ') : 'identity'
    const authority = ['front', 'profile', 'three-quarter', 'left-three-quarter', 'smile', 'neutral'].includes(reference.view || '')
      ? 'face/head identity authority'
      : boundCharacters.has(semanticTag)
        ? 'identity, anatomy, body proportions, and rear-continuity authority; bound Wardrobe owns garment and accessory design'
        : 'identity, anatomy, body proportions, reference wardrobe, accessories, and rear-continuity authority'
    return `${tag} character — ${view} view; ${authority}${isReferenceExclusive(reference) ? '; sole visual authority in its assigned role; metadata descriptions are not appearance instructions' : ''}`
  }
  if (reference.role === 'wardrobe') return `${tag} wardrobe — ${reference.boundCharacterTag ? `sole visual authority for wardrobe worn by ${seedanceProviderBinding(reference.boundCharacterTag, bindings)}; ` : ''}the connected reference owns every unnamed appearance property; person identity comes solely from the bound Character`
  if (reference.role === 'location') return `${tag} location — environment, layout, lighting, perspective, and scene-geometry authority`
  if (reference.role === 'element') return `${tag} element — ${reference.boundCharacterTag ? `sole visual authority for element used by ${seedanceProviderBinding(reference.boundCharacterTag, bindings)}; ` : ''}the connected reference owns every unnamed appearance property`
  if (reference.role === 'style') return `${tag} style — visual language, palette, texture, and finish only; do not copy depicted subjects`
  return `${tag} ordered ${reference.mediaType || 'visual'} reference — ${reference.slot || 'reference'} role`
}

export function seedanceReferenceLegend(images: Reference[], videos: Reference[], audios: Reference[], bracketTokens = false): string {
  const token = (kind: 'Image' | 'Video' | 'Audio', index: number) => bracketTokens ? `[${kind}${index + 1}]` : `@${kind}${index + 1}`
  const references = [...images, ...videos, ...audios]
  const boundCharacters = new Set(references.filter((reference) => reference.role === 'wardrobe' && reference.boundCharacterTag).map((reference) => reference.boundCharacterTag!))
  const bindings = seedanceProviderBindings(images, videos, audios, bracketTokens)
  return [
    ...images.map((reference, index) => `${token('Image', index)} = ${seedanceReferenceMeaning(reference, boundCharacters, bindings)}`),
    ...videos.map((reference, index) => `${token('Video', index)} = ${seedanceReferenceMeaning(reference, boundCharacters, bindings)}`),
    ...audios.map((reference, index) => `${token('Audio', index)} = ${seedanceReferenceMeaning(reference, boundCharacters, bindings)}`),
  ].join('\n')
}

function translateSeedanceSemanticTags(text: string, request: GenerationRequest, bindings: SeedanceProviderBindings): string {
  const tags = new Set<string>()
  for (const reference of request.references || []) if (reference.tag?.startsWith('@')) tags.add(reference.tag)
  for (const rule of request.connectionRules || []) if (rule.tag?.startsWith('@')) tags.add(rule.tag)
  if (request.inputTag?.startsWith('@')) tags.add(request.inputTag)
  let translated = text
  for (const tag of [...tags].sort((a, b) => b.length - a.length)) {
    if (/^@(Image|Video|Audio)\d+$/.test(tag)) continue
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    translated = translated.replace(new RegExp(`${escaped}(?![\\p{L}\\p{N}_-])`, 'gu'), seedanceProviderBinding(tag, bindings))
  }
  return translated
}

function translateSeedanceCompilation(compilation: PromptCompilation, request: GenerationRequest, bindings: SeedanceProviderBindings): PromptCompilation {
  if (!compilation.blocks.length) return { ...compilation, text: translateSeedanceSemanticTags(compilation.text, request, bindings) }
  const blocks = compilation.blocks.map((block) => ({ ...block, text: translateSeedanceSemanticTags(block.text, request, bindings) }))
  return { ...compilation, blocks, text: FAMILY_RENDERERS.seedance(blocks) }
}

function translateUnboundSeedanceTags(compilation: PromptCompilation, request: GenerationRequest): PromptCompilation {
  const attachedTags = new Set((request.references || []).map((reference) => reference.tag).filter((tag): tag is string => Boolean(tag)))
  if ((request.inputPath || request.inputUrl) && request.inputTag) attachedTags.add(request.inputTag)
  const unboundTags = new Set((request.connectionRules || []).map((rule) => rule.tag).filter((tag) => tag.startsWith('@') && !attachedTags.has(tag)))
  const translate = (text: string) => {
    let translated = text
    for (const tag of [...unboundTags].sort((a, b) => b.length - a.length)) {
      const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      translated = translated.replace(new RegExp(`${escaped}(?![\\p{L}\\p{N}_-])`, 'gu'), plainSemanticLabel(tag))
    }
    return translated
  }
  const blocks = compilation.blocks.map((block) => ({ ...block, text: translate(block.text) }))
  return { ...compilation, blocks, text: FAMILY_RENDERERS.seedance(blocks) }
}

function appendSeedanceBudgetNote(compilation: PromptCompilation, note: string): PromptCompilation {
  if (!note) return compilation
  const blocks = compilation.blocks.map((block) => block.label === 'REFERENCE AUTHORITY' ? { ...block, text: `${block.text}\n${note}` } : block)
  return { ...compilation, blocks, text: FAMILY_RENDERERS.seedance(blocks) }
}

function structuredSeedanceCoverage(authored: string) {
  const has = (pattern: RegExp) => pattern.test(authored)
  return {
    format: has(/^FORMAT(?: MODE| AND CUTS)?\b/im), shots: has(/^SHOT\s+\d+\b/im), scene: has(/^SCENE CONTEXT\b/im), references: has(/^ACTIVE REFERENCES\b/im),
    camera: has(/^CAMERA\b|^CAMERA\s+—|CAMERA POSITION AND OPTICS/im), optics: has(/\b(?:FOV|LENS|OPTICS)\b/i),
    lighting: has(/^(?:WORLD AND )?LIGHTING\b|^LIGHTING\s*&\s*INTEGRATION/im), style: has(/^STYLE(?: PREFIX)?\b/im),
    continuity: has(/^CONTINUITY\b|\bLOCK\b|^POSITIVE CONSTRAINTS\b/im), performance: has(/^CHARACTER ACTING\b|^VOICES\b|^SCRIPTED DIALOGUE\b|^LINE ATTRIBUTION\b/im),
    physics: has(/^PHYSICS\b/im), audio: has(/^AUDIO\b/im), quality: has(/^QUALITY\b|^POSITIVE CONSTRAINTS\b/im), negative: has(/^NEGATIVE PROMPT\b/im),
  }
}

function completeStructuredSeedanceMaster(authored: string): boolean {
  if (!authored) return false
  const coverage = structuredSeedanceCoverage(authored)
  return coverage.format && coverage.shots && coverage.scene && coverage.references && coverage.camera && coverage.lighting
    && coverage.style && coverage.continuity && coverage.performance && coverage.physics && coverage.audio && coverage.quality
}

function applyStructuredSeedanceCompletion(compilation: PromptCompilation, request: GenerationRequest): PromptCompilation {
  const authored = request.authoredPrompt?.trim() || ''
  if (!authored) return compilation
  const coverage = structuredSeedanceCoverage(authored)
  const structured = coverage.format || coverage.shots || coverage.references || coverage.scene
  if (!structured) return compilation
  const authoredBlock: PromptBlock = { id: 'authored', label: 'Authored master prompt', priority: 130, text: authored, required: true }
  if (completeStructuredSeedanceMaster(authored)) return { ...compilation, blocks: [authoredBlock], text: authored }

  const coveredLabels = new Set<string>()
  if (coverage.references) coveredLabels.add('REFERENCE AUTHORITY')
  if (coverage.performance) coveredLabels.add('SUBJECT AND PERFORMANCE')
  if (coverage.camera) { coveredLabels.add('CAMERA'); coveredLabels.add('CAMERA, FRAMING, AND OPTICAL HARD GATE') }
  if (coverage.optics) coveredLabels.add('LENS AND OPTICS')
  if (coverage.lighting) coveredLabels.add('LIGHTING')
  if (coverage.style) coveredLabels.add('LOOK AND CAPTURE CHARACTER')
  if (coverage.format) coveredLabels.add('FORMAT MODE')
  if (coverage.shots) coveredLabels.add('TIMELINE AND CONTINUOUS ACTION')
  if (coverage.continuity) {
    coveredLabels.add('IDENTITY AND ANATOMY CONTINUITY')
    coveredLabels.add('WARDROBE, ACCESSORY, AND PROP CONTINUITY')
    coveredLabels.add('SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY')
  }
  if (coverage.quality || coverage.continuity) coveredLabels.add('FINAL-FRAME AND OUTPUT HARD GATE')
  if (coverage.negative) coveredLabels.add('NEGATIVE PROMPT')
  const blocks = [authoredBlock, ...compilation.blocks.filter((block) => !coveredLabels.has(block.label))]
  return { ...compilation, blocks, text: FAMILY_RENDERERS.seedance(blocks) }
}

export function providerSeedancePayloadCompilation(request: GenerationRequest): PromptCompilation {
  const references = providerVisibleReferences(request)
  const model = resolveVideoModel(request.videoEngine)
  const limits = model.referenceLimits || DEFAULT_SEEDANCE_REFERENCE_LIMITS
  const { images, videos, audios } = selectSeedanceReferences(references, limits)
  const selectedRequest = { ...request, references: [...images, ...videos, ...audios] }
  const bracketTokens = model.id.includes('seedance-2.5')
  const bindings = seedanceProviderBindings(images, videos, audios, bracketTokens)
  const visibleBody = visibleProviderPromptBody(request)
  const providerBody = compileNaturalSkinProviderPrompt(selectedRequest, visibleBody).text
  return translateSeedanceCompilation({ family: 'seedance', text: providerBody, blocks: [], droppedBlocks: [], controlDiagnostics: compileProviderPrompt(selectedRequest, { family: 'seedance' }).controlDiagnostics }, selectedRequest, bindings)
}

export function providerPromptPreviewCompilation(request: GenerationRequest): PromptCompilation {
  if (request.providerPromptOverride !== undefined) return { family: resolveVideoModel(request.videoEngine).family, text: request.providerPromptOverride, blocks: [], droppedBlocks: [] }
  if (!request.prompt?.trim() && request.kind === 'upscaler') {
    return { family: 'generic', text: '[No text prompt — the provider receives the connected source image and upscale controls only.]', blocks: [], droppedBlocks: [] }
  }
  const references = request.videoEngine?.includes('seedance') ? providerVisibleReferences(request) : request.references || []
  if (request.videoEngine?.includes('kling-video')) {
    const elements = references.filter((reference) => reference.slot !== 'start' && reference.slot !== 'end' && (reference.role === 'character' || reference.role === 'element' || reference.mediaType === 'video'))
    const appearances = references.filter((reference) => reference.slot !== 'start' && reference.slot !== 'end' && (!reference.mediaType || reference.mediaType === 'image') && !elements.includes(reference))
    const legend = klingReferenceLegend(elements, appearances)
    return compileProviderPrompt(request, { family: 'kling', legend: legend ? { heading: 'KLING REFERENCE MAP', body: legend, footer: 'Use the exact @Element and @Image labels above. Views grouped into one @Element are one identity or object, not separate subjects.' } : undefined })
  }
  if (!request.videoEngine?.includes('seedance')) {
    const providerRequest = ['image-generator', 'image-editor'].includes(request.kind) ? providerArtworkCarrierRequest(request) : request
    const compilation = compileProviderPrompt(providerRequest)
    if (!['image-generator', 'image-editor'].includes(request.kind)) return compilation
    const orderedReferences = orderedProviderImageReferences(providerRequest)
    if (!orderedReferences.length) return compilation
    return { ...compilation, text: translateImageReferenceTags(compilation.text, orderedReferences) }
  }
  const model = resolveVideoModel(request.videoEngine)
  const limits = model.referenceLimits || DEFAULT_SEEDANCE_REFERENCE_LIMITS
  const { images, videos, audios, omitted } = selectSeedanceReferences(references, limits)
  const selectedRequest = { ...request, references: [...images, ...videos, ...audios] }
  const completeAuthored = selectedRequest.authoredPrompt?.trim() || ''
  if (completeStructuredSeedanceMaster(completeAuthored)) {
    const authoredBlock: PromptBlock = { id: 'authored', label: 'Authored master prompt', priority: 130, text: completeAuthored, required: true }
    const visible = translateUnboundSeedanceTags({ family: 'seedance', text: completeAuthored, blocks: [authoredBlock], droppedBlocks: [] }, selectedRequest)
    const validation = validateSeedanceDirectorPrompt(visible.text, selectedRequest)
    if (!validation.ok) throw new Error(`Seedance Director prompt validation failed: ${validation.errors?.join(' ')}`)
    return visible
  }
  const budgetNote = omitted.length ? `REFERENCE BUDGET: ${omitted.length} lower-priority source${omitted.length === 1 ? '' : 's'} omitted to satisfy ${model.shortLabel}'s ${limits.images}-image / ${limits.total}-total limit; originals remain in the project asset.` : ''
  const compilation = applyStructuredSeedanceCompletion(appendSeedanceBudgetNote(compileProviderPrompt(selectedRequest, { family: 'seedance' }), budgetNote), selectedRequest)
  const visible = translateUnboundSeedanceTags(compilation, selectedRequest)
  const validation = validateSeedanceDirectorPrompt(visible.text, selectedRequest)
  if (!validation.ok) throw new Error(`Seedance Director prompt validation failed: ${validation.errors?.join(' ')}`)
  return visible
}

export function visibleProviderPromptBody(request: GenerationRequest): string {
  return providerPromptPreviewCompilation(request).text
}

export function providerPromptPreview(request: GenerationRequest): string {
  return visibleProviderPromptBody(request)
}

export function klingReferenceLegend(elementReferences: Reference[], appearanceReferences: Reference[]): string {
  const imageElementTags = [...new Set(elementReferences.filter((reference) => reference.mediaType !== 'video').map((reference) => reference.tag || '@element'))]
  const videoElements = elementReferences.filter((reference) => reference.mediaType === 'video')
  return [
    ...imageElementTags.map((tag, index) => `@Element${index + 1} = ${tag} (${elementReferences.find((reference) => (reference.tag || '@element') === tag)?.role || 'element'} authority)`),
    ...videoElements.map((reference, index) => `@Element${imageElementTags.length + index + 1} = ${reference.tag || '@video-element'} (ordered video element)`),
    ...appearanceReferences.map((reference, index) => `@Image${index + 1} = ${reference.tag || '@appearance'} (${reference.role} appearance authority)`),
  ].join('\n')
}
