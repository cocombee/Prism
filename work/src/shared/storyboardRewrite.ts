import { selectedLensInstruction } from './shotRecipes'
import { assertStoryboardPhysicalCast } from './storyboardPhysicalCast'
import type { Edge } from '@xyflow/react'
import type { StoryboardPanel, StudioNode } from './types'
import { normalizedStoryboardTransition, storyboardTransitionConflicts } from './storyboardSequence'
import { planStoryboardCameraBridges } from './storyboardCameraBridge'
import { activeMediaName } from './generatedMedia'
import { normalizeLogicalAssetName } from './assetNaming'
import { promptTagTokens } from './promptTags'
import { workflowTag } from './inputRules'
import { resolvedAssetReferenceDescription } from './assetReferenceDescriptions'
import {
  SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS,
  SEEDANCE_DIRECTOR_SOURCE_HASH,
  SEEDANCE_DIRECTOR_SOURCE_VERSION,
  SEEDANCE_PROMPT_STRUCTURE_IDS,
  SEEDANCE_REFERENCE_EXCLUSIVE_IDS,
  directorProvenance,
} from './seedanceDirectorContract'
import { cameraSupportSemantics } from './cameraSupportSemantics'
import { futureOnlyTypedContinuityValues } from './shotSpec'

function panelSetting(value: StoryboardPanel['duration'] | StoryboardPanel['shotSize'] | StoryboardPanel['camera'], fallback: string): string {
  return value === undefined || value === 'auto' ? fallback : String(value)
}

export type StoryboardConnectedContextRole = 'Character' | 'Appearance' | 'Location' | 'Element/Prop' | 'Style' | 'Image Reference' | 'Video Reference' | 'Audio Reference'

export interface StoryboardConnectedContextEntry {
  /** Internal graph identity, never serialized into provider context. */
  sourceNodeId?: string
  role: StoryboardConnectedContextRole
  tag?: string
  name: string
  caption?: string
  referenceDescription?: string
  aliases: string[]
  insertionHint?: string
  matchedAlias?: string
  requiredInsertion?: boolean
  semanticTagCandidate?: boolean
  visualAuthorityMode?: 'reference-exclusive' | 'text-described'
  characterAuthorityMode?: StudioNode['data']['characterAuthorityMode']
  appearanceOwnerCharacterTag?: string
  appearanceScope?: StudioNode['data']['appearanceScope']
  appearanceSelection?: StudioNode['data']['appearanceSelection']
  appearanceShotIds?: string[]
  propScaleAuthority?: StudioNode['data']['propScaleAuthority']
}

export interface StoryboardConnectedContextManifest {
  entries: StoryboardConnectedContextEntry[]
  text: string
}

const ORDINAL_REFERENCE_TOKEN = /@(?:Image|Video|Audio)\d+\b/
const UNSAFE_METADATA = /(?:\b(?:https?|file|data|prism-asset):|(?:^|[\s(])(?:~\/|\/(?:Users|Volumes|private|tmp)\/|[A-Za-z]:[\\/])|\b(?:api[-_ ]?key|access[-_ ]?token|secret|credential|password|authorization|bearer)\b)/i
const MEDIA_EXTENSION = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i
const GENERIC_ALIAS_WORDS = new Set(['asset', 'image', 'photo', 'picture', 'reference', 'front', 'back', 'left', 'right', 'view', 'final', 'copy', 'version', 'customer'])
const WEAK_FILENAME_ALIASES: Record<string, string[]> = {
  iphone: ['phone'],
  smartphone: ['phone', 'cellphone'],
  mobile: ['phone', 'cellphone'],
  handset: ['phone', 'telephone'],
  telephone: ['phone'],
  cellphone: ['phone', 'smartphone'],
  automobile: ['car', 'vehicle'],
  car: ['vehicle'],
}

export function safeMetadataText(value: unknown, maxLength = 140): string | undefined {
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (!raw || UNSAFE_METADATA.test(raw) || ORDINAL_REFERENCE_TOKEN.test(raw)) return undefined
  const compact = raw.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  return compact ? compact.slice(0, maxLength).trim() : undefined
}

function safeDisplayName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const leaf = value.trim().replaceAll('\\', '/').split('/').at(-1)
  const safe = safeMetadataText(leaf, 96)
  return safe?.replace(MEDIA_EXTENSION, '').trim() || undefined
}

function safeCanvasTag(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^@[\p{L}\p{N}_-]+$/u.test(value) || ORDINAL_REFERENCE_TOKEN.test(value)) return undefined
  return value
}

function connectedContextRole(node: StudioNode): StoryboardConnectedContextRole | undefined {
  if (node.data.kind === 'character') return 'Character'
  if (node.data.kind === 'wardrobe' || node.data.kind === 'element' && node.data.appearanceScope) return 'Appearance'
  if (node.data.kind === 'location') return 'Location'
  if (node.data.kind === 'element') return 'Element/Prop'
  if (node.data.kind === 'style-reference') return 'Style'

  const activeResult = node.data.generatedResults?.[Math.min(Math.max(node.data.activeResultIndex || 0, 0), Math.max(0, (node.data.generatedResults?.length || 1) - 1))]
  const mediaType = activeResult?.type || node.data.outputType
  if (mediaType === 'video' || (node.data.referenceAssets || []).some(asset => asset.mimeType.startsWith('video/')) || /\.(mp4|mov|webm|m4v)$/i.test(node.data.assetPath || node.data.outputPath || '') || node.data.kind === 'router' && node.data.routeSignal === 'video' || node.data.kind === 'list' && node.data.listSignal === 'video') return 'Video Reference'
  if (mediaType === 'audio' || (node.data.referenceAssets || []).some(asset => asset.mimeType.startsWith('audio/')) || /\.(wav|mp3|m4a|aac|ogg|flac)$/i.test(node.data.assetPath || node.data.outputPath || '') || node.data.kind === 'router' && node.data.routeSignal === 'audio' || node.data.kind === 'list' && node.data.listSignal === 'audio') return 'Audio Reference'
  const hasImageAsset = (node.data.referenceAssets || []).some((asset) => asset.mimeType.startsWith('image/') || asset.category === 'image')
  const hasImagePath = Boolean((node.data.assetPath || node.data.outputPath || '').match(MEDIA_EXTENSION))
  const ordinaryImage = node.data.outputType === 'image'
    || activeResult?.type === 'image'
    || hasImageAsset
    || hasImagePath
    || ['image-generator', 'image-editor'].includes(node.data.kind)
    || node.data.kind === 'upscaler' && node.data.upscalerModel !== 'realesrgan-video'
    || node.data.kind === 'list' && node.data.listSignal === 'image'
    || node.data.kind === 'router' && node.data.routeSignal === 'image'
  return ordinaryImage ? 'Image Reference' : undefined
}

function hasConnectedVisualMedia(node: StudioNode): boolean {
  const activeResult = node.data.generatedResults?.[Math.min(Math.max(node.data.activeResultIndex || 0, 0), Math.max(0, (node.data.generatedResults?.length || 1) - 1))]
  if (activeResult?.type === 'image') return true
  if ((node.data.referenceAssets || []).some((asset) => asset.mimeType.startsWith('image/') || asset.category === 'image')) return true
  const mediaPath = node.data.assetPath || node.data.outputPath
  return Boolean(mediaPath && MEDIA_EXTENSION.test(mediaPath))
}

function connectedContextAliases(node: StudioNode, name: string, tag?: string): string[] {
  const aliases = new Set<string>()
  const add = (value: unknown) => {
    const safe = safeDisplayName(value)
    if (!safe) return
    const phrase = normalizeLogicalAssetName(safe).replace(/-/g, ' ').trim()
    if (phrase.length >= 3) aliases.add(phrase)
    for (const [concept, weakAliases] of Object.entries(WEAK_FILENAME_ALIASES)) {
      if (!phrase.includes(concept)) continue
      aliases.add(concept)
      for (const weakAlias of weakAliases) aliases.add(weakAlias)
    }
    for (const word of phrase.split(/\s+/)) {
      if (word.length < 3 || /^\d+$/.test(word) || GENERIC_ALIAS_WORDS.has(word)) continue
      aliases.add(word)
      for (const weakAlias of WEAK_FILENAME_ALIASES[word] || []) aliases.add(weakAlias)
    }
  }
  add(name)
  add(node.data.title)
  if (tag) add(tag.slice(1))
  for (const asset of node.data.referenceAssets || []) {
    add(asset.metadata?.assetName)
    add(asset.name)
  }
  return [...aliases].slice(0, 8)
}

function connectedContextCaption(node: StudioNode): string | undefined {
  const assetMetadata = (node.data.referenceAssets || []).map((asset) => asset.metadata).find(Boolean)
  const candidates = node.data.kind === 'style-reference'
    ? [node.data.styleDescription, assetMetadata?.styleDescription, node.data.stylePrompt]
    : ['character', 'wardrobe', 'element', 'location'].includes(node.data.kind)
      ? [assetMetadata?.identityDescription, node.data.styleDescription]
      : [assetMetadata?.prompt, node.data.prompt, node.data.styleDescription]
  return candidates.map((value) => safeMetadataText(value)).find((value): value is string => Boolean(value))
}

function promptContainsAlias(prompt: string, alias: string): boolean {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(prompt)
}

export function buildStoryboardConnectedContextManifest(storyboardId: string, nodes: StudioNode[], edges: Edge[], authoredPrompt: string, scope?: Pick<StoryboardPanel, 'id'> & Partial<StoryboardPanel>): StoryboardConnectedContextManifest {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const seenSources = new Set<string>()
  const sourcePanels = byId.get(storyboardId)?.data.storyboardPanels || []
  const scopedPanels = scope ? sourcePanels.some(panel => panel.id === scope.id) ? sourcePanels.map(panel => panel.id === scope.id ? { ...panel, ...scope } : panel) : [scope] : []
  const resolvedCast = assertStoryboardPhysicalCast(scopedPanels)
  const effectiveCast = scope ? resolvedCast[scopedPanels.findIndex(panel => panel.id === scope.id)] : undefined
  const activeCharacterTags = new Set(effectiveCast?.tags || [])
  const excludedCharacterTags = new Set(scope?.excludedCharacterTags || [])
  const contextEdges: Edge[] = []
  const visited = new Set<string>()
  const collect = (targetId: string) => {
    if (visited.has(targetId)) return
    visited.add(targetId)
    for (const edge of edges.filter(edge => edge.target === targetId)) {
      const source = byId.get(edge.source)
      if (!source || source.data.kind === 'style-reference') continue
      contextEdges.push(edge)
      if (['character', 'wardrobe', 'element', 'location', 'router', 'list'].includes(source.data.kind)) collect(source.id)
    }
  }
  collect(storyboardId)
  const entries: StoryboardConnectedContextEntry[] = contextEdges.flatMap((edge) => {
    if (seenSources.has(edge.source)) return []
    seenSources.add(edge.source)
    const source = byId.get(edge.source)
    if (!source) return []
    const role = connectedContextRole(source)
    if (!role || role === 'Style') return []
    const safeName = safeDisplayName(['Image Reference', 'Video Reference', 'Audio Reference'].includes(role) ? activeMediaName(source.data) : source.data.title)
    const name = safeName || role
    const explicitTag = safeCanvasTag(source.data.referenceTag)
    const derivedTag = safeName ? safeCanvasTag(workflowTag({
      kind: source.data.kind,
      title: safeName,
      referenceTag: undefined,
      generatedResults: undefined,
      activeResultIndex: undefined,
    }, 'asset')) : undefined
    const tag = explicitTag || derivedTag
    if (role === 'Character' && (tag && excludedCharacterTags.has(tag) || effectiveCast?.known && (!tag || !activeCharacterTags.has(tag)))) return []
    const connectedOwner = role === 'Appearance' && byId.get(edge.target)?.data.kind === 'character' ? (() => { const target = byId.get(edge.target); const name = target && safeDisplayName(target.data.title); return safeCanvasTag(target?.data.referenceTag) || (target && name ? safeCanvasTag(workflowTag({ kind: target.data.kind, title: name }, 'asset')) : undefined) })() : undefined
    const owner = connectedOwner || source.data.appearanceOwnerCharacterTag
    if (role === 'Appearance' && scope?.id && source.data.appearanceShotIds?.length && !source.data.appearanceShotIds.includes(scope.id)) return []
    if (role === 'Appearance' && owner && (excludedCharacterTags.has(owner) || effectiveCast?.known && !activeCharacterTags.has(owner))) return []
    const referenceExclusive = Boolean(tag && hasConnectedVisualMedia(source))
    return [{
      sourceNodeId: source.id,
      role,
      tag,
      name,
      caption: referenceExclusive ? undefined : connectedContextCaption(source),
      referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges, connectedOwner).trim() || undefined,
      aliases: connectedContextAliases(source, name, tag),
      semanticTagCandidate: Boolean(tag),
      visualAuthorityMode: referenceExclusive ? 'reference-exclusive' : 'text-described',
      characterAuthorityMode: source.data.characterAuthorityMode,
      appearanceOwnerCharacterTag: owner,
      appearanceScope: source.data.appearanceScope,
      appearanceSelection: source.data.appearanceSelection,
      appearanceShotIds: source.data.appearanceShotIds,
      propScaleAuthority: source.data.propScaleAuthority && (!source.data.propScaleAuthority.shotIds?.length || !scope?.id || source.data.propScaleAuthority.shotIds.includes(scope.id))
        ? source.data.propScaleAuthority
        : undefined,
    } satisfies StoryboardConnectedContextEntry]
  })

  const authoredTags = new Set(promptTagTokens(authoredPrompt).map((tag) => tag.toLocaleLowerCase()))
  const prose = authoredPrompt.replace(/@[\p{L}\p{N}_-]+/gu, ' ')
  const aliasMatches = new Map<string, Array<{ index: number; alias: string }>>()
  entries.forEach((entry, index) => {
    if (entry.role === 'Style' || entry.tag && authoredTags.has(entry.tag.toLocaleLowerCase())) return
    for (const alias of entry.aliases.filter((candidate) => promptContainsAlias(prose, candidate))) {
      const key = alias.toLocaleLowerCase()
      aliasMatches.set(key, [...(aliasMatches.get(key) || []), { index, alias }])
    }
  })
  const independentlyHinted = new Map<number, string>()
  for (const matches of aliasMatches.values()) {
    if (matches.length !== 1) continue
    const match = matches[0]
    const previous = independentlyHinted.get(match.index)
    if (!previous || match.alias.length > previous.length) independentlyHinted.set(match.index, match.alias)
  }
  for (const [index, alias] of independentlyHinted) {
    const entry = entries[index]
    entry.matchedAlias = alias
    entry.requiredInsertion = Boolean(entry.tag)
    entry.insertionHint = entry.tag
      ? `Unambiguous prose match "${alias}": the final prompt must contain ${entry.tag} exactly once; replace the matched alias with this canonical anchor.`
      : `Unambiguous prose match "${alias}": the final prompt must preserve the connected name when relevant; never invent a tag.`
  }

  const locations = entries.filter((entry) => entry.role === 'Location')
  const missingLocations = locations.filter((entry) => !entry.tag || !authoredTags.has(entry.tag.toLocaleLowerCase()))
  if (locations.length === 1 && missingLocations.length === 1) {
    const entry = missingLocations[0]
    entry.requiredInsertion = Boolean(entry.tag)
    entry.insertionHint = entry.tag
      ? `Authoritative missing setting: the final prompt must contain ${entry.tag} exactly once; preserve its identity and add no unhinted context.`
      : 'Authoritative missing setting: the final prompt must preserve the connected Location name; never invent a tag.'
  }

  const characters = entries.filter(entry => entry.role === 'Character')
  // The typed cast wins. A sole connected character is unambiguous only when no contradictory cast is declared.
  for (const entry of characters.filter(entry => effectiveCast?.known || characters.length === 1)) {
    if (!entry.tag || authoredTags.has(entry.tag.toLocaleLowerCase())) continue
    entry.requiredInsertion = true
    entry.insertionHint = `Active connected Character: mention ${entry.tag} at its existing performance point; never add a person, action, or appearance description.`
  }
  for (const entry of entries.filter(entry => entry.role === 'Appearance' && entry.appearanceScope === 'wardrobe' && ['explicit-replacement', 'explicit-delta'].includes(entry.appearanceSelection || ''))) {
    const owner = characters.find(character => character.tag === entry.appearanceOwnerCharacterTag)
    if (!owner?.tag || owner.characterAuthorityMode !== 'identity-body-with-layers' || !entry.tag || authoredTags.has(entry.tag.toLocaleLowerCase())) continue
    entry.requiredInsertion = true
    entry.insertionHint = `Assigned wardrobe: ${entry.tag} is worn by ${owner.tag} only; preserve the typed assignment and do not infer identity from the wardrobe.`
  }

  return connectedContextManifest(entries)
}

/** Existing bounded typed manifest shared by Storyboard and standalone Prompt Revamp. */
export function connectedContextManifest(entries: StoryboardConnectedContextEntry[]): StoryboardConnectedContextManifest {
  if (!entries.length) return { entries, text: '' }
  const lines = entries.map((entry) => [
    `anchor=${entry.tag || 'none'}`,
    `role=${entry.role}`,
    entry.characterAuthorityMode ? `body-authority=${entry.characterAuthorityMode}` : '',
    entry.appearanceOwnerCharacterTag ? `owner=${entry.appearanceOwnerCharacterTag}` : '',
    entry.appearanceScope ? `scope=${entry.appearanceScope}` : '',
    entry.appearanceSelection ? `selection=${entry.appearanceSelection}` : '',
    entry.appearanceShotIds?.length ? `shots=${entry.appearanceShotIds.join(',')}` : '',
    entry.propScaleAuthority ? 'prop-scale=exact-reference' : '',
    entry.propScaleAuthority?.authoredScaleStatement ? `authored-scale=${entry.propScaleAuthority.authoredScaleStatement}` : '',
    entry.propScaleAuthority?.approvedScaleExclusions?.length ? `approved-scale-exclusions=${entry.propScaleAuthority.approvedScaleExclusions.join(', ')}` : '',
    `name=${entry.name}`,
    entry.caption ? `caption=${entry.caption}` : '',
    entry.referenceDescription ? `authored-reference-description=${entry.referenceDescription}` : '',
    entry.aliases.length ? `aliases=${entry.aliases.join(', ')}` : '',
    entry.matchedAlias ? `matched-alias=${entry.matchedAlias}` : '',
    entry.requiredInsertion && entry.tag ? `required-anchor=${entry.tag}` : '',
    entry.semanticTagCandidate && entry.tag ? `semantic-anchor-candidate=${entry.tag}` : '',
    entry.visualAuthorityMode === 'reference-exclusive' ? 'visual-authority=sole visual authority; reference owns every unnamed appearance property; captions and metadata are non-authoritative' : '',
    entry.insertionHint ? `hint=${entry.insertionHint}` : '',
  ].filter(Boolean).join(' | '))
  return {
    entries,
    text: `CONNECTED CONTEXT MANIFEST (HIDDEN PROVIDER CONTEXT — NEVER NARRATE OR COPY)\n${lines.map((line) => `- ${line}`).join('\n')}\nUse only these connected authorities. Typed roles outrank names and filenames. Filename aliases are weak match evidence only and never change a role. Every required-anchor must appear exactly once in the final panel prompt; replace its matched safe alias with the canonical anchor. Never add an unhinted anchor. Resolve each authority independently; ambiguity suppresses only its competing alias set.`,
  }
}

export function storyboardBridgeConstraintManifest(panels: StoryboardPanel[], mode: 'single' | 'separate' = 'single'): string {
  const plans = planStoryboardCameraBridges(panels, mode)
  const lines = plans.filter((plan) => plan.transition === 'continue').map((plan) => [
    `boundary=${plan.boundaryIndex + 1}->${plan.boundaryIndex + 2}`,
    'incoming-transition=continue',
    plan.source ? `source-framing=${plan.source.shotSize}` : '',
    plan.target ? `target-framing=${plan.target.shotSize}` : '',
    `bridge-kind=${plan.kind}`,
    `bridge-reserve=${plan.reservedSeconds}s`,
    plan.concurrent ? 'camera-and-action=concurrent' : '',
    plan.source?.lensMm !== undefined ? `source-lens=${plan.source.lensMm}mm` : '',
    plan.target?.lensMm !== undefined ? `target-lens=${plan.target.lensMm}mm` : '',
    plan.bridgeText ? `compiler-bridge=${plan.bridgeText}` : '',
  ].filter(Boolean).join(' | '))
  return lines.length ? `IMMUTABLE COMPILER BRIDGE CONSTRAINTS (HIDDEN):\n${lines.map((line) => `- ${line}`).join('\n')}\nProvider may phrase action naturally but must not alter timing, framing, selected focal length, transition, bridge kind/reserve, panel order, or compiler metadata.` : ''
}

export function storyboardTypedContinuityManifest(panels: StoryboardPanel[]): string {
  const physicalCast = assertStoryboardPhysicalCast(panels)
  const records = panels.map((panel, index) => {
    const active = new Set(physicalCast[index].tags)
    const excluded = new Set(panel.excludedCharacterTags || [])
    const inScope = (characterTag: string) => !excluded.has(characterTag) && active.has(characterTag)
    return {
      panelId: panel.id, order: index + 1, continuityGroupId: panel.continuityGroupId,
      activeCharacterTags: panel.activeCharacterTags,
      effectivePhysicalCast: physicalCast[index].known ? physicalCast[index].tags : undefined,
      exclusionPolicy: panel.excludedCharacterTags?.length ? 'Characters outside the active cast are excluded from this target.' : undefined,
      characterStates: panel.characterStates?.filter((state) => inScope(state.characterTag)),
      characterStateDeltas: panel.characterStateDeltas?.filter((state) => inScope(state.characterTag)),
      stateAuthorities: panel.stateAuthorities, dialogueSpans: panel.dialogueSpans,
    }
  })
  const hasTypedState = records.some((record) => Object.entries(record).some(([key, value]) => !['panelId', 'order'].includes(key) && value !== undefined))
  return hasTypedState
    ? `IMMUTABLE TYPED CONTINUITY MANIFEST (HIDDEN):\n${records.map((record) => JSON.stringify(record)).join('\n')}\nThis whole-sequence Prism-local manifest is read-only. Preserve every field and unknown omission exactly; returned prose cannot add, drop, reinterpret, or mutate typed state.`
    : ''
}

export function storyboardSemanticTaggingPolicy(): string {
  directorProvenance('revamp-hidden-policy', SEEDANCE_REFERENCE_EXCLUSIVE_IDS)
  return `PROVIDER-SEMANTIC TAGGING POLICY:
- Resolve meaning in any language, dialect, slang, transliteration, colloquial spelling, or minor misspelling. Reason from typed role, safe connected name and weak aliases, the full panel prose, and the full ordered sequence context; exact token equality alone is insufficient. Connected visual captions and metadata are identification/search data only and never appearance authority.
- An authored-reference-description is the user's explicit asset purpose, part/state and semantic relationship. Use it to identify which reference the action means; retain its named @asset relationships and typed domain. It cannot override actual Wardrobe ownership, change a Location reference into an end-frame, add cast, or invent new action or appearance.
- Video Reference controls only its assigned camera/motion/performance timing; Audio Reference controls only assigned sound/speech/timing. Mention their existing semantic tags only when the authored shot assigns their use; never infer identity, wardrobe, location, events or dialogue from metadata. Actual media pass downstream to model-owned sockets and limits.
- Style is look/feel context only: never insert a Style tag into shot prose or treat Style as Character, Appearance, Location, Element/Prop or Image Reference. The generator receives Style through its dedicated look/feel routing.
- Automatically mention the unambiguous active connected Character, its explicitly assigned Wardrobe, and sole connected Location. Preserve typed cast, exclusions, wardrobe owner and shot scope. Elements/Props, ordinary image references, audio and video require an authored tag or an explicit natural-language use/mention; connection alone never adds them to the action.
- If exactly one connected authority is semantically unambiguous and relevant at point of use, replace the first natural-language mention with its exact canonical Canvas tag.
- If multiple connected authorities are plausible, do not guess or tag. Leave ambiguous natural-language prose untagged.
- Never create an unconnected tag, alter canonical spelling or case, expose manifest syntax, or translate or rewrite surrounding prose merely for tagging. Never change identity, design, action, or ownership.
- Never split one Character body or promote an appearance layer to a person, cast member, tableau, or independent state entry. Typed body/owner/scope/selection assignments are read-only; reject conflicts rather than choosing.
- Preserve explicit typed prop-scale authority without inventing scale for any other prop. State, contact, grip, filenames, captions, pixels, and generation prose never imply physical size.
- Exact tags repeat at every relevant Seedance shot point-of-use. Descriptive setup follows the whole-sequence mention policy and is not redundantly repeated.`
}

export function storyboardSequenceMentionPolicy(): string {
  return `WHOLE-SEQUENCE MENTION POLICY:
- Inspect every filled earlier and later sibling panel before deciding mentions for an editable panel. Empty sibling prompts provide no narrative evidence.
- Repeat each exact connected semantic tag at point of use in every relevant shot, as required by the Seedance master-sequence contract. Where a character has connected wardrobe authority, character and wardrobe anchors repeat together in every shot where that person appears.
- Repeated tags do not authorize repeating the full identity, Location, wardrobe, or prop description. Tags preserve authority; descriptive prose should remain economical.
- First use, a new Location, re-entry after intervening context, ambiguity, or a material state or ownership change may re-establish only the detail needed for clarity.
- Same-scene adjacent panels inherit already-established descriptive context. CONTINUE inherits setting and state without reintroduction. HARD CUT alone does not require restating the same Location.
- Carry continuity state between shots. Do not steal, change, or move neighbouring panel prose or move an introduction from one panel to another.
- Provider-visible target prose contains only current exact bindings, current visible or physically continuing state, endpoint-required state, and the current authored action/camera/dialogue. Future reverse/front-view projection, later screen side, future camera relation, and later action remain read-only typed context until their owning shot becomes current. Off-camera work continuing now remains current and must not be suppressed.
- This economy rule never suppresses a required connected tag or weakens exact point-of-use tag validation.`
}

/**
 * Canonical Seedance v1.1.14 Director baseline only.
 * Source SHA-256: 1885768f1efa5fe35a3ff4b3f17d37afe846ce05e6bafa9c1f377b566cb98eb1
 * Provisional CK-R/CK-I sample findings are intentionally excluded.
 */
export const STORYBOARD_DIRECTOR_BASELINE_IDS = [...SEEDANCE_PROMPT_STRUCTURE_IDS, ...SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS] as const

export function storyboardDirectorBaselinePolicy(): string {
  directorProvenance('revamp-hidden-policy', STORYBOARD_DIRECTOR_BASELINE_IDS)
  return `CANONICAL DIRECTOR BASELINE POLICY (HIDDEN):
- Provenance: Director profile SOUL; Seedance ${SEEDANCE_DIRECTOR_SOURCE_VERSION}; SHA-256 ${SEEDANCE_DIRECTOR_SOURCE_HASH}; Cinematography selection contract source 171c726835e8afe106ed5f98a3496095c118de4b32f643d94c26c095f26059f4; explicit-only Style router and Kodak visual-art LOOK. Prompt Structure SD-PS-001–SD-PS-012; Attribute Breakdown SD-AB-001–SD-AB-025. The 158-record library and provisional/future options remain retrieval-only and non-executable.
- Refine only authored action, camera, performance, physical-lighting, focus, and explicit connected/approved Style wording inside the existing PERMITTED EDITS. Preserve the authored prompt as the authority; sparse prose needs the shot-specific development below, while a fully developed executable take may remain unchanged.
- Never invent measurements, lens values, lighting, audio, dialogue, identity, wardrobe, props, setting, transitions, or continuity state. Timing of the existing action may be developed within the selected duration as permitted below. Quantify only an authored measurable intent or a selected camera control whose physical meaning is already fixed by the panel metadata.
- Express a moving camera as coherent physical behavior: path and viewing axis, subject relation, pace or curve, stabilization, endpoint composition, and readable settle. Keep static camera static and never substitute zoom-like scale change for translation.
- Keep action world-space, causal, and physically legible. Preserve contact, attachment, incoming/outgoing state, screen direction, pose, eyeline, object position, and accumulated consequence wherever the authored action depends on them.
- Protect authored establishment, decisive action, consequence, reaction, endpoint, and hold timing inside the fixed panel duration. Do not move the decisive event onto the final frame. When developing sparse prose, stage the existing action within the selected panel duration without changing any authored timing.
- If the authored action requires a discrete state change that cannot remain visibly continuous, clarify the existing transition only through a motivated fully concealed or out of frame moment; never create a cut, change Cut/Continue metadata, or expose a replacement in view.
- Exact connected semantic anchors remain the canonical authority at point of use. Provider ordinal tokens, hidden metadata, universal style defaults, unsupported platform claims, and diagnostic batch behavior never belong in returned panel prose.`
}

function storyboardCameraSupportPolicy(camera: string | undefined, panelId?: string): string {
  const support = cameraSupportSemantics(camera)
  if (!support) return ''
  const heading = panelId ? `PANEL ${panelId} SELECTED CAMERA SUPPORT POLICY (HIDDEN):` : 'SELECTED CAMERA SUPPORT POLICY (HIDDEN):'
  return `${heading}\n${support.revampInstruction}\nThis selected value is a support texture, not a camera path. It may qualify only already-authored camera/action prose; it must not create travel, a target, an endpoint, or any other support option.`
}

function storyboardCameraMovementPolicy(camera: string | undefined): string {
  if (camera !== 'dolly-down-slow') return ''
  return `DOLLY DOWN SLOW POLICY (HIDDEN):
The camera makes a markedly slow, deliberate dolly straight downward, preserving the authored subject framing and viewing side throughout the descent.
This is the sole camera path. Do not expand it with around, past, across, wrapping, crane-around, speed ramps, new subject movement, push/pull/lateral reframing, or a new camera side. Do not invent numeric speed, distance, duration, height, acceleration, or timing. Preserve its arrived endpoint; never return to the starting composition.`
}

/** Shared by Shot and All so both receive the actual editing rules. */
export function storyboardShotDevelopmentPolicy(): string {
  return `SHOT-SPECIFIC DEVELOPMENT (HIDDEN):
- Turn sparse prose into a directed take, not just a grammar correction. Preserve the user's intended action and emotional meaning; make them visible through restrained, coherent performance rather than inventing a new story beat.
- Describe the selected shot size as an executable crop: identify the face, gesture, contact or environment visible within it. Use the selected lens only when supplied; if naming it in prose, use the explicit form '50mm lens' with the actual selected value. Do not change the selected framing or choose a new lens, camera body, aperture or visual style.
- Elaborate the existing action's pace, weight, balance, contact, anticipation, follow-through and readable endpoint where relevant. Translate an authored feeling such as thinking into observable gaze, expression, breathing or posture. These are execution details of the same action, not new events, identities, props or locations.
- Develop the selected camera's physical relationship to that action. Keep static camera fixed; for a moving camera clarify its existing path, viewing axis and endpoint without adding another move or inventing measurements.
- Shape the same action across the selected panel duration with a readable opening, progression and ending state. Use compact timing in natural prose when useful, contained within that duration; do not add shot/beat headings, cuts, dialogue, or actions belonging to another panel. Continuous action may continue at the endpoint rather than being forced to stop.
- Keep details specific to this panel and compatible with connected references and neighbouring state. Do not pad with generic cinematic adjectives, impose lighting/grade/audio defaults, invent weather or costume, or repeat hidden metadata.

PERMITTED EDITS ONLY:
- Visible action: clarify choreography, timing, contact, physical causality, and readable action order without changing who does what or inventing a new event.
- Camera movement: clarify only the selected camera move, its physical path, axis, target, pace, endpoint, and hold. If the selected camera is static, keep it static.
- Blend permitted camera/action edits into the existing prose so the result reads as one smooth cinematic prompt, not disconnected production notes.

PRESERVATION RULES:
- Preserve every existing semantic @tag exactly; never rename, remove, invent, or ordinally translate a tag.
- Preserve headings, SHOT/BEAT structure, HARD CUT placement, exact quoted dialogue, speaker attribution, voice wording, locks, period, geography, physical state, British spelling, negative/positive constraints, FPS, and authored shutter angle/speed.
- Revise performance, physical lighting, focus, or Style wording only when that exact domain is already authored, selected, or connected; never create a new domain, emotion, event, intensity, light, focus action, or Style. An authored action or feeling permits its restrained observable performance details under SHOT-SPECIFIC DEVELOPMENT.
- Everything outside visible action, camera movement, and those already-owned domains plus exact manifest-hinted connected anchors is frozen byte-for-byte.
- The only semantic-insertion exception is each exact connected required-anchor marked by hidden manifest metadata. Every required anchor must appear exactly once; replace its surviving matched safe alias with the canonical tag. Never alter those authorities’ identities or designs, and never add unhinted context.
- Do not otherwise add or alter Character identity, wardrobe, props, Location, environment, period, style, lighting, dialogue, voice, audio, music, continuity locks, negative constraints, duration, shot size, or transition metadata.
- Preserve this panel's duration, shot size, and camera metadata; use the sequence context only to prevent contradictions or continuity drift.
- Transition metadata is immutable and compiler-owned. Never add, remove, rename, or contradict the listed transition.
- A CONTINUE boundary stays inside the same unbroken shot: do not add a SHOT heading, HARD CUT, dissolve, reset, or viewpoint teleport.
- A HARD CUT boundary is emitted once by the compiler: do not duplicate it inside returned panel prose.
- Never add a new Continuity:, Transition:, SHOT, CUT, or BEAT label, and never narrate that subjects are ready for a cut or the next shot. Existing authored headings remain unchanged.
- Do not merge this panel with another panel, rewrite a neighbouring panel, add a new shot, or change the number/order of shots.
- A short sentence that merely names an action, feeling, or camera label is a draft, not a complete directed take. Develop it with useful shot-specific execution detail. Return it byte-for-byte unchanged only when that detail is already present and no permitted improvement remains.`
}

export function storyboardRewriteInstruction(panels: StoryboardPanel[], panelId: string, connectedContext = ''): string {
  const conflicts = storyboardTransitionConflicts(panels)
  if (conflicts.length) throw new Error(conflicts[0])
  const panelIndex = panels.findIndex((panel) => panel.id === panelId)
  const currentNumber = panelIndex >= 0 ? panelIndex + 1 : 1
  const sequence = panels.map((panel, index) => {
    const duration = panelSetting(panel.duration, '1')
    const shotSize = panelSetting(panel.shotSize, 'wide')
    const camera = panelSetting(panel.camera, 'static')
    const transition = normalizedStoryboardTransition(panel.transitionToNext, index, panels.length)
    const transitionLabel = transition === 'continue' ? index === panels.length - 1 ? 'FINAL PANEL · OUTGOING CONTINUE HOOK; DO NOT INVENT THE NEXT PANEL' : 'TRANSITION AFTER: CONTINUE IN SAME UNBROKEN TAKE' : transition === 'hard-cut' ? 'TRANSITION AFTER: HARD CUT' : 'FINAL PANEL'
    return `SHOT ${index + 1} · ${duration}s · ${shotSize}${panel.lensMm !== undefined ? ` · ${selectedLensInstruction(panel.lensMm)}` : ''} · ${camera}${panel.locked ? ' · LOCKED' : ''} · ${transitionLabel}\n${panel.prompt.trim() || '[empty]'}`
  }).join('\n\n')
  const connectedContextBlock = connectedContext.trim() ? `\n\n${connectedContext.trim()}` : ''

  return `Revise only the current Storyboard panel's visible action and camera movement using the selected AI model.

CURRENT PANEL: SHOT ${currentNumber} OF ${panels.length}

SEQUENCE CONTEXT — preserve order, timing, continuity, and hard-cut relationships:
${sequence}${connectedContextBlock}

${storyboardBridgeConstraintManifest(panels)}

${storyboardTypedContinuityManifest(panels)}

${storyboardDirectorBaselinePolicy()}

${storyboardCameraSupportPolicy(panels[panelIndex]?.camera)}

${storyboardCameraMovementPolicy(panels[panelIndex]?.camera)}

${storyboardSemanticTaggingPolicy()}

${storyboardSequenceMentionPolicy()}

${storyboardShotDevelopmentPolicy()}
- Return only the revised current panel prompt with its internal line breaks intact; no analysis, preface, markdown fence, or summary.`
}

export interface StoryboardRewriteOutcome {
  panels: StoryboardPanel[]
  changed: number
  unchanged: number
}

const DISALLOWED_REWRITE_META = [
  /^\s*(?:Continuity|Transition)\s*:/gim,
  /\bready for (?:the )?(?:hard )?cut\b/gi,
  /\b(?:hard )?cut to SHOT\s*\d+\b/gi,
  /\b(?:continue|transition(?:ing)?) (?:to|into) SHOT\s*\d+\b/gi,
]
const COMPILER_METADATA_PATTERNS = [
  /^\s*(?:Duration|Range|FOV|CAMERA BRIDGE|MAIN ACTION|REACTION \/ SETTLE)\s*[:·]/gim,
  /\bbridge-(?:kind|reserve)\s*=/gi,
  /^\s*(?:HARD CUT\.|SHOT\s+\d+|BEAT\s+\d+)/gim,
  /\b(?:dolly|push|pull|pan|tilt|jib|crane|zoom|orbit|truck)\b[^.\n]*\b\d+(?:\.\d+)?\s*(?:m\/s|°\/s|degrees?\/s)/gi,
]
const HIDDEN_CONTEXT_NARRATION = /(?:CONNECTED CONTEXT MANIFEST|HIDDEN PROVIDER CONTEXT|hidden connected context|manifest insertion hint|anchor\s*=.+role\s*=|\bPANEL ID\s*:|["']panels["']\s*:)/i
const TAG_OCCURRENCE = /@[\p{L}\p{N}_-]+/gu
const APPEARANCE_ATTRIBUTE = /\b(?:black|white|gr[ae]y|red|orange|yellow|green|blue|cyan|purple|violet|pink|brown|beige|mustard|gold(?:en)?|silver|metallic|transparent|translucent|matte|glossy|plastic|leather|denim|silk|satin|cotton|wool(?:len)?|knit(?:ted)?|wood(?:en)?|glass|chrome|brass|leopard|striped|checked|plaid|polka[- ]dot|floral|patterned|round|square|oval|angular|oversized|fitted|loose|slim|thick|thin|frame|lens(?:es)?)\b/giu
const PROP_SCALE_CHANGE = /\b(?:(?:twice|half)\s+as\s+(?:large|wide|tall|long|big|small)|larger|smaller|enlarg(?:e|ed|es|ing|ement)|shrink(?:s|ing|age)?|resize[ds]?|scale(?:s|d)?\s+(?:up|down)|grow(?:s|ing|n)?|\d+(?:\.\d+)?\s*(?:mm|cm|m(?!\/s)|inches?|feet|ft))\b/giu

export function isCompleteStructuredStoryboardPrompt(value: string): boolean {
  return /^\s*FORMAT MODE\s*:/im.test(value)
    && /^\s*TIMELINE(?: AND CONTINUOUS ACTION)?\s*:/im.test(value)
    && [...value.matchAll(/^\s*SHOT\s+\d+\b/gim)].length >= 2
    && /^\s*(?:HARD CUT\.|BEAT\s+\d+)/im.test(value)
    && /^\s*CAMERA\s*:/im.test(value)
}

export function storyboardRewriteTargets(panels: StoryboardPanel[], panelId?: string): StoryboardPanel[] {
  return panels.filter((panel) => !panel.locked
    && (!panelId || panel.id === panelId)
    && (Boolean(panelId) || !panel.revampedPrompt?.trim())
    && panel.prompt.trim()
    && !isCompleteStructuredStoryboardPrompt(panel.prompt))
}

export interface StoryboardBatchContextPanel {
  id: string
  prompt: string
  duration: number
  shotSize: string
  lensMm?: number
  camera: string
  locked: boolean
  editable: boolean
  boundary: 'continue' | 'hard-cut' | 'final' | 'final-continue'
}

export interface StoryboardBatchTargets {
  targets: StoryboardPanel[]
  context: StoryboardBatchContextPanel[]
}

export function storyboardBatchTargets(panels: StoryboardPanel[]): StoryboardBatchTargets {
  const conflicts = storyboardTransitionConflicts(panels)
  if (conflicts.length) throw new Error(conflicts[0])
  const targetIds = new Set(storyboardRewriteTargets(panels).map((panel) => panel.id))
  return {
    targets: panels.filter((panel) => targetIds.has(panel.id)),
    context: panels.map((panel, index) => ({
      id: panel.id,
      prompt: panel.prompt,
      duration: Number(panelSetting(panel.duration, '1')),
      shotSize: panelSetting(panel.shotSize, 'wide'),
      lensMm: panel.lensMm,
      camera: panelSetting(panel.camera, 'static'),
      locked: Boolean(panel.locked),
      editable: targetIds.has(panel.id),
      boundary: index === panels.length - 1 ? normalizedStoryboardTransition(panel.transitionToNext, index, panels.length) === 'continue' ? 'final-continue' : 'final' : normalizedStoryboardTransition(panel.transitionToNext, index, panels.length) || 'hard-cut',
    })),
  }
}

export function storyboardBatchRewriteInstruction(panels: StoryboardPanel[], contexts: ReadonlyMap<string, StoryboardConnectedContextManifest>): string {
  const batch = storyboardBatchTargets(panels)
  const targetOrder = batch.targets.map((panel) => panel.id)
  const responseExample = `{ "panels": [${targetOrder.map((id) => `{ "id": "${id}", "prompt": "..." }`).join(', ')}] }`
  const sequence = batch.context.map((panel) => {
    const transition = panel.boundary === 'final-continue' ? 'FINAL PANEL · OUTGOING CONTINUE HOOK; DO NOT INVENT THE NEXT PANEL' : panel.boundary === 'continue' ? 'TRANSITION AFTER: CONTINUE IN SAME UNBROKEN TAKE' : panel.boundary === 'hard-cut' ? 'TRANSITION AFTER: HARD CUT' : 'FINAL PANEL'
    const context = contexts.get(panel.id)?.text.trim()
    return `PANEL ID: ${panel.id} · ${panel.editable ? 'EDITABLE' : 'READ-ONLY'} · ${panel.duration}s · ${panel.shotSize}${panel.lensMm !== undefined ? ` · ${selectedLensInstruction(panel.lensMm)}` : ''} · ${panel.camera}${panel.locked ? ' · LOCKED' : ''} · ${transition}\n${panel.prompt.trim() || '[empty]'}${context ? `\n${context}` : ''}`
  }).join('\n\n')

  return `Revise the editable Storyboard panels as one coherent ordered sequence using one response.

REVAMP ALL TARGET ORDER: ${targetOrder.join(', ')}

FULL ORDERED SEQUENCE CONTEXT — every panel is authoritative context; READ-ONLY panels must remain unchanged:
${sequence}

${storyboardBridgeConstraintManifest(panels)}

${storyboardTypedContinuityManifest(panels)}

${storyboardDirectorBaselinePolicy()}

${batch.targets.map((panel) => [storyboardCameraSupportPolicy(panel.camera, panel.id), storyboardCameraMovementPolicy(panel.camera)].filter(Boolean).join('\n')).filter(Boolean).join('\n\n')}

${storyboardSemanticTaggingPolicy()}

${storyboardSequenceMentionPolicy()}

${storyboardShotDevelopmentPolicy()}

Apply the same PERMITTED EDITS and PRESERVATION RULES as single-panel Revamp to each editable panel independently. Preserve panel IDs, order, timing, duration, shot size, camera, lock state, Cut/Continue/final boundaries, exact authored tags, dialogue, SHOT/BEAT/HARD CUT structure, connected authority, and continuity. Validate each panel only against its own connected-context manifest. Never copy internal IDs, JSON keys, manifest syntax, or metadata into prompt prose.

Return one complete prompt for every editable target in exact target order using exactly this transport:
${responseExample}
Return strict JSON only. No markdown fence, commentary, diff, fragment, or extra key.`
}

function batchResponseError(): Error {
  return new Error('Invalid Storyboard batch response.')
}

function escapedPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const BATCH_TRANSPORT_TERMINOLOGY = /\b(?:batch\s+(?:response|transport|parser|manifest)|manifest\s+(?:syntax|insertion hint)|hidden connected-context|hidden provider context|connected context manifest|parser\s+(?:output|error|result)|PANEL ID\s*:)/i
const BATCH_TRANSPORT_FIELD = /(?:\\?["'](?:id|prompt|panels|context|editable|boundary)\\?["']\s*:)/i
const BATCH_TRANSPORT_OBJECT = /(?:\[\s*\{|\{\s*(?:\\?["']?[\w-]+\\?["']?)\s*:)/i
const BATCH_TRANSPORT_FIELD_PAIR = /\b(?:id|prompt|panels|context|editable|boundary)\s*:\s*[^\n]{0,240}\b(?:id|prompt|panels|context|editable|boundary)\s*:/i

export function validateStoryboardBatchPromptTransport(prompt: string, internalPanelIds: readonly string[]): string {
  const leaksTransportShape = /```/.test(prompt)
    || BATCH_TRANSPORT_TERMINOLOGY.test(prompt)
    || BATCH_TRANSPORT_FIELD.test(prompt)
    || BATCH_TRANSPORT_OBJECT.test(prompt)
    || BATCH_TRANSPORT_FIELD_PAIR.test(prompt)
  const leaksInternalId = internalPanelIds.some((id) => {
    if (!id) return false
    return new RegExp(`(^|[^\\p{L}\\p{N}_-])${escapedPattern(id)}(?=$|[^\\p{L}\\p{N}_-])`, 'u').test(prompt)
  })
  if (leaksTransportShape || leaksInternalId) throw new Error('Revamp returned internal batch transport content instead of panel prose.')
  return prompt
}

export function parseStoryboardBatchResponse(response: string, expectedIds: readonly string[]): Map<string, string> {
  if (response.trim() !== response || response.startsWith('```') || response.includes('```')) throw batchResponseError()
  let parsed: unknown
  try { parsed = JSON.parse(response) } catch { throw batchResponseError() }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw batchResponseError()
  const object = parsed as Record<string, unknown>
  if (Object.keys(object).length !== 1 || !Array.isArray(object.panels) || object.panels.length !== expectedIds.length) throw batchResponseError()
  const result = new Map<string, string>()
  object.panels.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw batchResponseError()
    const record = entry as Record<string, unknown>
    if (Object.keys(record).length !== 2 || typeof record.id !== 'string' || typeof record.prompt !== 'string') throw batchResponseError()
    if (record.id !== expectedIds[index] || result.has(record.id) || !record.prompt.trim()) throw batchResponseError()
    result.set(record.id, record.prompt)
  })
  return result
}

function matchCount(value: string, pattern: RegExp): number {
  return [...value.matchAll(new RegExp(pattern.source, pattern.flags))].length
}

function tagOccurrences(value: string): string[] {
  return [...value.matchAll(TAG_OCCURRENCE)].map((match) => match[0])
}

function exactTagCount(tags: string[], tag: string): number {
  return tags.filter((candidate) => candidate === tag).length
}

function exactAliasPattern(alias: string): RegExp {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}@])(${escaped})(?=$|[^\\p{L}\\p{N}])`, 'iu')
}

function enforceRequiredConnectedAnchors(rewritten: string, context?: StoryboardConnectedContextManifest): string {
  let result = rewritten
  for (const entry of context?.entries || []) {
    if (!entry.requiredInsertion || !entry.tag) continue
    if (tagOccurrences(result).includes(entry.tag)) continue
    const aliases = [...new Set([entry.matchedAlias, ...entry.aliases].filter((alias): alias is string => Boolean(alias)))]
      .sort((left, right) => right.length - left.length)
    const alias = aliases.find((candidate) => exactAliasPattern(candidate).test(result))
    if (!alias) throw new Error(`Revamp omitted required connected tag ${entry.tag} and its matched alias.`)
    result = result.replace(exactAliasPattern(alias), (_match, prefix: string) => `${prefix}${entry.tag}`)
  }
  return result
}

function typedContinuityAuthoredValues(panel?: StoryboardPanel): string[] {
  if (!panel) return []
  const values: string[] = []
  const collect = (value: unknown) => {
    if (typeof value === 'string') {
      if (value.trim()) values.push(value)
      return
    }
    if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(collect)
  }
  collect(panel.characterStates)
  collect(panel.characterStateDeltas)
  collect(panel.stateAuthorities)
  collect(panel.dialogueSpans)
  return [...new Set(values)].sort((left, right) => right.length - left.length)
}

export function validateStoryboardRewrite(source: string, rewritten: string, context?: StoryboardConnectedContextManifest, typedContinuity?: StoryboardPanel, sequencePanels: StoryboardPanel[] = typedContinuity ? [typedContinuity] : []): string {
  if (isCompleteStructuredStoryboardPrompt(source)) return source
  const groundedRewrite = enforceRequiredConnectedAnchors(rewritten, context)
  const appearanceTags = (context?.entries || []).filter((entry) => entry.role === 'Appearance' && entry.tag).map((entry) => entry.tag!)
  if (appearanceTags.some((tag) => {
    const escaped = escapedPattern(tag)
    return new RegExp(`${escaped}[^.\\n]{0,120}\\b(?:person|cast member|tableau|independent (?:body|state)|mannequin|donor body|torso|limbs?)\\b`, 'iu').test(groundedRewrite)
  })) throw new Error('Revamp split one Character body or promoted an appearance layer into cast/tableau state.')
  if ((context?.entries || []).some((entry) => entry.visualAuthorityMode === 'reference-exclusive')) {
    const sourceAppearance = new Set((source.replace(TAG_OCCURRENCE, ' ').match(APPEARANCE_ATTRIBUTE) || []).map((value) => value.toLocaleLowerCase()))
    const introducedAppearance = (groundedRewrite.replace(TAG_OCCURRENCE, ' ').match(APPEARANCE_ATTRIBUTE) || []).find((value) => !sourceAppearance.has(value.toLocaleLowerCase()))
    if (introducedAppearance) throw new Error(`Revamp introduced unapproved appearance attribute: ${introducedAppearance}`)
  }
  const scaleEntries = (context?.entries || []).filter((entry) => entry.propScaleAuthority)
  // A selected focal length describes camera optics, not the size of a prop.
  // Exempt only lens-qualified uses of that exact selected value; other measurements stay guarded.
  const selectedLens = typedContinuity?.lensMm
  const lensPattern = selectedLens !== undefined && Number.isFinite(selectedLens) && selectedLens > 0
    ? new RegExp(`\\b${escapedPattern(String(selectedLens))}\\s*mm(?=\\s+(?:lens|focal length)\\b)|(?<=\\blens[: ]{1,3})${escapedPattern(String(selectedLens))}\\s*mm\\b`, 'gi')
    : undefined
  const withoutSelectedLens = (text: string) => lensPattern ? text.replace(lensPattern, '') : text
  const sourceScaleChanges = matchCount(withoutSelectedLens(source), PROP_SCALE_CHANGE)
  const rewrittenScaleChanges = matchCount(withoutSelectedLens(groundedRewrite), PROP_SCALE_CHANGE)
  if (scaleEntries.length && rewrittenScaleChanges > sourceScaleChanges) throw new Error('Revamp contradicted explicit prop-scale authority.')
  if (!scaleEntries.length && rewrittenScaleChanges > sourceScaleChanges) throw new Error('Revamp invented prop scale without typed approved authority.')
  for (const value of typedContinuityAuthoredValues(typedContinuity)) {
    if (source.includes(value) && !groundedRewrite.includes(value)) throw new Error(`Revamp dropped or changed authored typed continuity value: ${value}`)
  }
  const currentIndex = typedContinuity ? sequencePanels.findIndex((panel) => panel.id === typedContinuity.id) : -1
  if (currentIndex >= 0) {
    const request = {
      nodeId: 'storyboard-revamp-validation', kind: 'video-generator' as const,
      storyboardShots: sequencePanels.map((panel) => ({
        ...panel,
        panelId: panel.id,
        duration: typeof panel.duration === 'number' && panel.duration > 0 ? panel.duration : 1,
        shotSize: panel.shotSize || 'auto', camera: panel.camera || 'auto',
      })),
    }
    const anticipated = futureOnlyTypedContinuityValues(request, currentIndex).find((value) => groundedRewrite.includes(value) && !source.includes(value))
    if (anticipated) throw new Error(`Revamp introduced future-only provider anticipation before its owning shot: ${anticipated}`)
  }
  if (HIDDEN_CONTEXT_NARRATION.test(groundedRewrite)) throw new Error('Revamp narrated hidden context instead of returning only smooth panel prose.')
  if (ORDINAL_REFERENCE_TOKEN.test(groundedRewrite)) throw new Error('Revamp emitted a raw ordinal provider reference token.')
  const introducedMeta = DISALLOWED_REWRITE_META.some((pattern) => matchCount(groundedRewrite, pattern) > matchCount(source, pattern))
  if (introducedMeta) throw new Error('Revamp returned transition or continuity meta commentary instead of smooth camera/action prose.')
  const introducedCompilerMetadata = COMPILER_METADATA_PATTERNS.some((pattern) => matchCount(groundedRewrite, pattern) > matchCount(source, pattern))
  if (introducedCompilerMetadata) throw new Error('Revamp introduced or altered compiler metadata instead of returning panel prose only.')

  const sourceTags = tagOccurrences(source)
  const rewrittenTags = tagOccurrences(groundedRewrite)
  const canonicalTags = new Map<string, string>()
  for (const tag of [...sourceTags, ...(context?.entries.flatMap((entry) => entry.tag ? [entry.tag] : []) || [])]) canonicalTags.set(tag.toLocaleLowerCase(), tag)
  const allowedProviderSemanticTags = new Set((context?.entries || []).filter((entry) => entry.role !== 'Style' && entry.tag && entry.semanticTagCandidate).map((entry) => entry.tag!.toLocaleLowerCase()))
  const sourceTagKeys = new Set(sourceTags.map((tag) => tag.toLocaleLowerCase()))

  for (const sourceTag of new Set(sourceTags)) {
    const sourceCount = exactTagCount(sourceTags, sourceTag)
    const rewrittenCount = exactTagCount(rewrittenTags, sourceTag)
    if (rewrittenCount < sourceCount) throw new Error(`Revamp removed or changed authored tag ${sourceTag}.`)
    if (rewrittenCount > sourceCount) throw new Error(`Revamp duplicated authored tag ${sourceTag}.`)
  }
  for (const tag of rewrittenTags) {
    const key = tag.toLocaleLowerCase()
    const canonical = canonicalTags.get(key)
    if (!canonical || canonical !== tag) throw new Error(`Revamp introduced unconnected tag ${tag}.`)
    if (!sourceTagKeys.has(key) && !allowedProviderSemanticTags.has(key)) throw new Error(`Revamp introduced unconnected or unavailable semantic tag ${tag}.`)
    if (!sourceTagKeys.has(key) && exactTagCount(rewrittenTags, tag) > 1) throw new Error(`Revamp duplicated connected tag ${tag}.`)
  }
  return groundedRewrite
}

export function applyStoryboardRewrites(panels: StoryboardPanel[], rewrites: ReadonlyMap<string, string>): StoryboardRewriteOutcome {
  let changed = 0
  let unchanged = 0
  const nextPanels = panels.map((panel) => {
    const rewrite = rewrites.get(panel.id)
    if (rewrite === undefined) return panel
    if (rewrite === panel.prompt || isCompleteStructuredStoryboardPrompt(panel.prompt)) {
      unchanged += 1
      return panel
    }
    changed += 1
    return { ...panel, prompt: rewrite }
  })
  return { panels: nextPanels, changed, unchanged }
}

export function applyStoryboardBatchResponse(
  panels: StoryboardPanel[],
  rewrites: ReadonlyMap<string, string>,
  contexts: ReadonlyMap<string, StoryboardConnectedContextManifest>,
): StoryboardRewriteOutcome {
  const expectedTargets = storyboardRewriteTargets(panels)
  const expectedIds = expectedTargets.map((panel) => panel.id)
  if (rewrites.size !== expectedIds.length || expectedIds.some((id) => !rewrites.has(id)) || [...rewrites.keys()].some((id, index) => id !== expectedIds[index])) throw batchResponseError()
  const validated = new Map<string, string>()
  const internalPanelIds = panels.map((panel) => panel.id)
  for (const panel of expectedTargets) {
    const rewrite = rewrites.get(panel.id)
    if (rewrite === undefined) throw batchResponseError()
    const proseOnly = validateStoryboardBatchPromptTransport(rewrite, internalPanelIds)
    validated.set(panel.id, validateStoryboardRewrite(panel.prompt, proseOnly, contexts.get(panel.id), panel, panels))
  }
  return applyStoryboardRewrites(panels, validated)
}

export function storyboardRewriteProgress(outcome: Pick<StoryboardRewriteOutcome, 'changed' | 'unchanged'>, modelLabel: string): string {
  if (!outcome.changed) return `No text changed — ${modelLabel} returned the existing prompt`
  const changed = `${outcome.changed} panel${outcome.changed === 1 ? '' : 's'} improved with ${modelLabel}`
  return outcome.unchanged ? `${changed} · ${outcome.unchanged} already complete` : changed
}
