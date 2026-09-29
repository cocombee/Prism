import type { Edge } from '@xyflow/react'
import type { GenerationRequest, StoryboardPanel, StudioNode } from './types'
import { normalizedMotionCadence, resolvedVideoRatio, resolveVideoModel } from './videoModels'
import { inputCardinalityError, nodeConnectionError } from './nodeConnections'
import { nodeInputPorts } from './nodePorts'
import { connectedInputRule, resolveAutoConnectedInputRule, workflowTag } from './inputRules'
import type { InputFidelity } from './inputRules'
import { normalizedElevenV3LanguageCode } from './voiceLanguages'
import { shotRecipe, shotRecipeDetails } from './shotRecipes'
import { resolveBuiltInStylePreset } from './stylePresets'
import { activeGeneratedResult, activeMediaName } from './generatedMedia'
import { groupStoryboardSequence, normalizedStoryboardTransition } from './storyboardSequence'
import { selectedStoryboardPrompt } from './storyboardPromptVersions'
import { storyboardDurationReadinessError } from './storyboardDurationBudget'
import { planStoryboardCameraBridges, storyboardCameraBridgeReadiness, type StoryboardCameraBridgePlan } from './storyboardCameraBridge'
import { activeVideoPromptMode } from './videoPromptMode'
import { cameraSupportConflict } from './cameraSupportSemantics'
import { applyResolvedAssetRequest, semanticModelCapability } from './resolvedAssetRequest'
import { isSemanticAssetKind, semanticAssetAvailability } from './semanticAssetAvailability'
import { semanticAssetAuthorityText } from './semanticAssetPromptBoundary'

export interface ResolvedStoryboardShot {
  panelId: string
  prompt: string
  duration: number
  shotSize: string
  camera: string
  audioCue?: string
  transitionToNext?: StoryboardPanel['transitionToNext']
  boundaryState?: StoryboardPanel['boundaryState']
  startSeconds: number
  endSeconds: number
  incomingBridge?: StoryboardCameraBridgePlan
  panelNumber: number
  continuityGroupId?: StoryboardPanel['continuityGroupId']
  activeCharacterTags?: StoryboardPanel['activeCharacterTags']
  excludedCharacterTags?: StoryboardPanel['excludedCharacterTags']
  characterStates?: StoryboardPanel['characterStates']
  characterStateDeltas?: StoryboardPanel['characterStateDeltas']
  stateAuthorities?: StoryboardPanel['stateAuthorities']
  dialogueSpans?: StoryboardPanel['dialogueSpans']
}

export interface ResolvedWorkflowInput {
  prompt?: string
  authoredPrompt?: string
  stylePrompt?: string
  builtInStylePrompts?: string[]
  storyboardShots?: ResolvedStoryboardShot[]
  storyboardIncompletePanels?: number[]
  storyboardPreamble?: string
  storyboardRawPrompt?: string
  storyboardDuration?: number
  storyboardContext?: string

  inputPath?: string
  inputUrl?: string
  inputName?: string
  inputTag?: string
  inputRole?: GenerationRequest['inputRole']
  connectionRules: NonNullable<GenerationRequest['connectionRules']>
  references: NonNullable<GenerationRequest['references']>
  offlineSemanticSources: NonNullable<GenerationRequest['offlineSemanticSources']>
}

function joinPrompt(...parts: Array<string | undefined>): string | undefined {
  // Deduplicate at block level, not part level. One Style or Location asset feeding
  // both a Storyboard and the end node arrives as two separate accumulations, so
  // comparing whole parts would let the same block through twice.
  const blocks = parts
    .flatMap((part) => (part || '').split('\n\n'))
    .map((block) => block.trim())
    .filter(Boolean)
  const unique = [...new Set(blocks)]
  return unique.length ? unique.join('\n\n') : undefined
}

function mediaTypeFor(node: StudioNode): 'image' | 'video' | 'audio' {
  const activeResult = activeGeneratedResult(node.data)
  const path = activeResult?.path || node.data.outputPath || node.data.assetPath || ''
  return activeResult?.type || node.data.outputType || (path.match(/\.(mp4|mov|webm)$/i) ? 'video' : path.match(/\.(mp3|wav|m4a|aac|ogg)$/i) ? 'audio' : 'image')
}

function formattedStoryboard(panels: StoryboardPanel[], duration: number): { preamble: string; rawPrompt: string; shots: ResolvedStoryboardShot[]; incompletePanels: number[] } {
  const activePanels = panels.map((panel) => ({ ...panel, prompt: selectedStoryboardPrompt(panel) }))
  const durationError = storyboardDurationReadinessError(activePanels, duration)
  if (durationError) throw new Error(durationError)
  for (const panel of activePanels) {
    const supportConflict = cameraSupportConflict(panel.camera, panel.prompt)
    if (supportConflict) throw new Error(supportConflict)
  }
  const automatic = Math.max(1, Math.floor(duration / Math.max(1, activePanels.length)))
  const incompletePanels = activePanels.flatMap((panel, index) => panel.prompt.trim() ? [] : [index + 1])
  const normalizedPanels = activePanels.map((panel) => ({ ...panel, duration: panel.duration === 'auto' ? automatic : panel.duration }))
  const bridges = planStoryboardCameraBridges(normalizedPanels)
  const bridgeError = storyboardCameraBridgeReadiness(bridges)
  if (bridgeError) throw new Error(bridgeError)
  let elapsed = 0
  const shots = normalizedPanels.map((panel, index) => {
    const startSeconds = elapsed
    elapsed += Number(panel.duration)
    return {
    panelId: panel.id,
    prompt: panel.prompt.trim(),
    duration: Number(panel.duration),
    shotSize: panel.shotSize || 'auto',
    camera: panel.camera || 'auto',
    audioCue: panel.audioCue?.trim() || undefined,
    transitionToNext: normalizedStoryboardTransition(panel.transitionToNext, index, activePanels.length),
    boundaryState: panel.boundaryState,
    startSeconds,
    endSeconds: elapsed,
    incomingBridge: index > 0 ? bridges[index - 1] : undefined,
    panelNumber: index + 1,
    continuityGroupId: panel.continuityGroupId,
    activeCharacterTags: panel.activeCharacterTags,
    excludedCharacterTags: panel.excludedCharacterTags,
    characterStates: panel.characterStates,
    characterStateDeltas: panel.characterStateDeltas,
    stateAuthorities: panel.stateAuthorities,
    dialogueSpans: panel.dialogueSpans,
  }})
  const grouped = groupStoryboardSequence(shots)
  const preamble = `Storyboard plan: ${activePanels.length} panels grouped into ${grouped.shots.length} shot${grouped.shots.length === 1 ? '' : 's'} by authored Cut/Continue boundaries, target duration ${duration}s. Preserve character, wardrobe, location, prop, lighting, screen-direction, and action continuity within every continuous shot.`
  const rawPrompt = [preamble, ...shots.map((shot, index) => `Shot ${index + 1} — Duration: ${shot.duration}s; Shot Size: ${shot.shotSize}; Camera Movement: ${shot.camera}${shot.audioCue ? `; Audio Cue: ${shot.audioCue}` : ''}.${shot.prompt ? ` ${shot.prompt}` : ` [STORYBOARD PANEL ${shot.panelNumber} INCOMPLETE — no action authored.]`}`)].join('\n')
  return { preamble, rawPrompt, shots, incompletePanels }
}

function withoutPromptBlock(prompt: string | undefined, block: string | undefined): string | undefined {
  if (!prompt || !block) return prompt
  const remaining = prompt.split('\n\n').filter((candidate) => candidate.trim() !== block.trim())
  return remaining.length ? remaining.join('\n\n') : undefined
}

function withoutStyleBlocks(prompt: string | undefined, stylePrompt: string | undefined): string | undefined {
  if (!prompt || !stylePrompt) return prompt
  const authoredStyles = new Set(stylePrompt.split('\n\n').map((style) => style.trim()).filter(Boolean))
  const remaining = prompt.split('\n\n').filter((candidate) => {
    const [heading, ...body] = candidate.trim().split('\n')
    return !/^Style Direction(?: [^:]+)?:$/.test(heading) || !authoredStyles.has(body.join('\n').trim())
  })
  return remaining.length ? remaining.join('\n\n') : undefined
}

function compiledStoryboardPrompt(preamble: string | undefined, shots: ResolvedStoryboardShot[] | undefined, family: string): string | undefined {
  if (!preamble || !shots) return undefined
  const sequence = groupStoryboardSequence(shots)
  const lines: string[] = [preamble]
  sequence.shots.forEach((group, shotIndex) => {
    const groupStart = group.beats[0].startSeconds
    const groupEnd = group.beats[group.beats.length - 1].endSeconds
    lines.push(`SHOT ${shotIndex + 1} · ${groupStart.toFixed(1)}–${groupEnd.toFixed(1)}s`)
    group.beats.forEach((beat, beatIndex) => {
      const label = group.beats.length > 1 ? `BEAT ${beatIndex + 1} · ${beat.startSeconds.toFixed(1)}–${beat.endSeconds.toFixed(1)}s` : `ACTION · ${beat.startSeconds.toFixed(1)}–${beat.endSeconds.toFixed(1)}s`
      const bridge = beat.incomingBridge
      if (bridge?.reservedSeconds && bridge.bridgeText) {
        const bridgeEnd = beat.startSeconds + bridge.reservedSeconds
        const reactionStart = beat.endSeconds - bridge.reactionReserveSeconds
        lines.push(label)
        lines.push(`CAMERA BRIDGE · ${beat.startSeconds.toFixed(1)}–${bridgeEnd.toFixed(1)}s: ${bridge.bridgeText}`)
        lines.push(`MAIN ACTION · ${bridgeEnd.toFixed(1)}–${reactionStart.toFixed(1)}s: ${beat.prompt || `[STORYBOARD PANEL ${beat.panelNumber} INCOMPLETE — no action authored.]`}`)
        lines.push(`REACTION / SETTLE · ${reactionStart.toFixed(1)}–${beat.endSeconds.toFixed(1)}s`)
      } else {
        lines.push(`${label}: ${beat.prompt || `[STORYBOARD PANEL ${beat.panelNumber} INCOMPLETE — no action authored.]`}`)
      }
      lines.push(`FRAMING: ${shotRecipe('shot-size', beat.shotSize, family)}.`)
      lines.push(`CAMERA: ${shotRecipe('camera', beat.camera, family)}${beat.audioCue ? `; Audio Cue: ${beat.audioCue}` : ''}.`)
    })
    if (shotIndex < sequence.shots.length - 1) lines.push('HARD CUT.')
  })
  return lines.join('\n')
}

export function resolveWorkflowInput(nodeId: string, nodes: StudioNode[], edges: Edge[], ignoredRootTargetHandles = new Set<string>()): ResolvedWorkflowInput {
  const byId = new Map(nodes.map((node) => [node.id, node]))

  const walk = (targetId: string, ancestors = new Set<string>(), ignoredTargetHandles = new Set<string>()): ResolvedWorkflowInput => {
    if (ancestors.has(targetId)) return { references: [], connectionRules: [], offlineSemanticSources: [] }
    const path = new Set(ancestors)
    path.add(targetId)
    const result: ResolvedWorkflowInput = { references: [], connectionRules: [], offlineSemanticSources: [] }
    const incoming = edges.filter((edge) => edge.target === targetId && !ignoredTargetHandles.has(edge.targetHandle || ''))

    for (const edge of incoming) {
      const source = byId.get(edge.source)
      if (!source) continue
      const target = byId.get(targetId)
      const semanticAvailability = semanticAssetAvailability(source.data)
      if (isSemanticAssetKind(source.data.kind) && semanticAvailability.state === 'offline') {
        result.offlineSemanticSources.push({
          nodeId: source.id,
          kind: source.data.kind,
          role: source.data.kind === 'style-reference' ? 'style' : source.data.kind,
          title: source.data.title,
          assetIds: semanticAvailability.unavailableAssetIds,
        })
        continue
      }
      const inputFidelity = ((edge.data as { inputFidelity?: InputFidelity } | undefined)?.inputFidelity || 'auto')
      if (target) result.connectionRules.push(connectedInputRule(source.data, target.data, edge.targetHandle, inputFidelity))

      if (source.data.kind === 'router') {
        const nested = walk(source.id, path)
        // Router is a typed pass-through. Preserve the outer consumer's exact
        // role instead of degrading required media into a generic reference.
        const expectedType = edge.targetHandle === 'video-in' ? 'video' : edge.targetHandle === 'image-in' ? 'image' : undefined
        const requiresStartingImage = target?.data.kind === 'video-generator'
          && ['image', 'first-last'].includes(resolveVideoModel(target.data.videoEngine).mode)
        const isPrimaryRoutedImage = expectedType === 'image'
          && (inputFidelity === 'lock' || requiresStartingImage || target?.data.kind === 'upscaler' || target?.data.kind === 'image-editor')
        const isPrimaryRoutedVideo = expectedType === 'video'
          && (inputFidelity === 'lock' || target?.data.kind === 'video-generator' || target?.data.kind === 'upscaler')
        if ((isPrimaryRoutedImage || isPrimaryRoutedVideo) && !result.inputPath) {
          const routedMedia = nested.references.find((reference) => (reference.mediaType || 'image') === expectedType && (reference.path || reference.url))
          if (routedMedia) {
            const inputRole = target?.data.kind === 'video-generator' && edge.targetHandle === 'image-in'
              ? 'start-frame'
              : expectedType === 'video'
                ? 'source-video'
                : 'source-image'
            result.inputPath = routedMedia.path
            result.inputUrl = routedMedia.url
            result.inputName = routedMedia.name || source.data.title
            result.inputTag = workflowTag(source.data, inputRole)
            result.inputRole = inputRole
          }
        }
        result.prompt = joinPrompt(result.prompt, nested.prompt)
        result.authoredPrompt = joinPrompt(result.authoredPrompt, nested.authoredPrompt)
        result.stylePrompt = joinPrompt(result.stylePrompt, nested.stylePrompt)
        result.builtInStylePrompts = [...(result.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])]
        result.inputPath ||= nested.inputPath
        result.inputUrl ||= nested.inputUrl
        result.references.push(...nested.references)
        result.offlineSemanticSources.push(...nested.offlineSemanticSources)
        result.connectionRules.push(...nested.connectionRules)
        result.storyboardShots ||= nested.storyboardShots
        result.storyboardIncompletePanels ||= nested.storyboardIncompletePanels
        result.storyboardPreamble ||= nested.storyboardPreamble
        result.storyboardRawPrompt ||= nested.storyboardRawPrompt
        result.storyboardDuration ||= nested.storyboardDuration
        result.storyboardContext ||= nested.storyboardContext

        continue
      }

      if (source.data.kind === 'prompt' || source.data.kind === 'assistant') {
        // A legacy Assistant keeps its rewritten text in assistantOutput until the
        // canvas migration folds it into a Prompt node. Read both so the end node
        // never loses authored text mid-migration.
        result.prompt = joinPrompt(result.prompt, source.data.assistantOutput || source.data.prompt)
        result.authoredPrompt = joinPrompt(result.authoredPrompt, source.data.assistantOutput || source.data.prompt)
        continue
      }

      if (source.data.kind === 'list') {
        const items = (source.data.listItems || []).filter((item) => item.type !== 'text')
        for (const listEdge of edges.filter((candidate) => candidate.target === source.id)) {
          const listSource = byId.get(listEdge.source)
          if (!listSource) continue
          const listSourceType = mediaTypeFor(listSource)
          if (listSource.data.kind === 'router') {
            const routed = walk(listSource.id, new Set([...path, source.id]))
            result.references.push(...routed.references)
            result.offlineSemanticSources.push(...routed.offlineSemanticSources)
            result.connectionRules.push(...routed.connectionRules)
          }
          else if (listSource.data.kind === 'list') {
            const nestedList = walk(listSource.id, new Set([...path, source.id]))
            result.references.push(...nestedList.references)
            result.offlineSemanticSources.push(...nestedList.offlineSemanticSources)
            result.connectionRules.push(...nestedList.connectionRules)
            result.storyboardShots ||= nestedList.storyboardShots
            result.storyboardIncompletePanels ||= nestedList.storyboardIncompletePanels
            result.storyboardPreamble ||= nestedList.storyboardPreamble
            result.storyboardRawPrompt ||= nestedList.storyboardRawPrompt
            result.storyboardDuration ||= nestedList.storyboardDuration
            result.storyboardContext ||= nestedList.storyboardContext

          }
          else if ((listSource.data.generatedResults || []).length && !items.some((item) => item.sourceNodeId === listSource.id)) {
            for (const [index, generated] of listSource.data.generatedResults!.entries()) items.push({
              id: `${listEdge.id}:${index}`,
              type: generated.type,
              sourceNodeId: listSource.id,
              sourceResultIndex: index,
              status: 'complete',
              asset: {
                id: `${listEdge.id}:${index}`,
                name: `${listSource.data.title} ${index + 1}`,
                path: generated.path,
                url: generated.url,
                mimeType: generated.type === 'image' ? 'image/png' : generated.type === 'video' ? 'video/mp4' : 'audio/mpeg',
                createdAt: 'workflow',
              },
            })
          }
          else if (listSource.data.outputPath || listSource.data.assetPath) items.push({
            id: listEdge.id,
            type: listSourceType,
            asset: {
              id: listEdge.id,
              name: listSource.data.title,
              path: listSource.data.outputPath || listSource.data.assetPath || '',
              url: listSource.data.outputUrl || listSource.data.assetUrl,
              mimeType: `${listSourceType}/${listSourceType === 'image' ? 'png' : listSourceType === 'video' ? 'mp4' : 'mpeg'}`,
              createdAt: 'workflow',
            },
          })
        }
        for (const [index, item] of items.filter((candidate) => candidate.asset).entries()) result.references.push({
          role: 'reference', path: item.asset?.path, url: item.asset?.url, name: item.asset?.name, tag: `@list-${index + 1}`,
          mediaType: item.type as 'image' | 'video' | 'audio', slot: 'reference',
          authority: item.type === 'video' && edge.targetHandle === 'video-reference-in'
            ? 'motion-camera'
            : item.type === 'audio' && edge.targetHandle === 'audio-reference-in'
              ? 'audio-timing'
              : 'appearance',
        })
        continue
      }

      if (target?.data.kind === 'storyboard-asset' && edge.targetHandle === 'storyboard-in' && ['storyboard', 'storyboard-asset'].includes(source.data.kind)) {
        const hasDirectStyle = incoming.some((candidate) => candidate.targetHandle === 'style-in')
        const lineage = walk(source.id, path, hasDirectStyle ? new Set(['style-in']) : new Set())
        result.prompt = joinPrompt(result.prompt, lineage.prompt)
        result.references.push(...lineage.references)
        result.offlineSemanticSources.push(...lineage.offlineSemanticSources)
        result.connectionRules.push(...lineage.connectionRules)
        continue
      }

      if (source.data.kind === 'storyboard' || source.data.kind === 'storyboard-asset') {
        const duration = target?.data.kind === 'video-generator' && edge.targetHandle === 'storyboard-in'
          ? Math.max(0.5, target.data.duration || 5)
          : Math.max(0.5, source.data.storyboardPanels?.reduce((sum, panel) => sum + (panel.duration === 'auto' ? 1 : Number(panel.duration) || 0), 0) || 15)
        const panels = source.data.storyboardPanels || []
        const storyboard = formattedStoryboard(panels, duration)
        const nested = walk(source.id, path)
        const hasConnectedStyle = edges.some((candidate) => candidate.target === source.id && candidate.targetHandle === 'style-in')
        const legacyStyleFallback = !hasConnectedStyle && source.data.stylePrompt ? `Style Direction:\n${source.data.stylePrompt}` : undefined
        result.prompt = joinPrompt(result.prompt, storyboard.rawPrompt, legacyStyleFallback, nested.prompt)
        result.stylePrompt = joinPrompt(result.stylePrompt, legacyStyleFallback ? source.data.stylePrompt : undefined, nested.stylePrompt)
        result.builtInStylePrompts = [...(result.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])]
        result.storyboardShots = storyboard.shots
        result.storyboardIncompletePanels = storyboard.incompletePanels
        result.storyboardPreamble = storyboard.preamble
        result.storyboardRawPrompt = storyboard.rawPrompt
        result.storyboardDuration = duration

        result.storyboardContext = joinPrompt(result.storyboardContext, legacyStyleFallback, nested.prompt)
        result.references.push(...nested.references)
        result.offlineSemanticSources.push(...nested.offlineSemanticSources)
        result.connectionRules.push(...nested.connectionRules)
        if ((source.data.kind === 'storyboard' || source.data.kind === 'storyboard-asset') && !source.data.storyboardNeedsCompile && (source.data.outputPath || source.data.outputUrl)) result.references.push({
          role: 'storyboard',
          path: source.data.outputPath,
          url: source.data.outputUrl,
          name: source.data.title,
          tag: workflowTag(source.data, 'storyboard'),
          mediaType: 'image',
          slot: 'reference',
          authority: 'storyboard-map',
        })
        continue
      }

      if (['character', 'wardrobe', 'location', 'element', 'style-reference'].includes(source.data.kind)) {
        const role = source.data.kind === 'style-reference' ? 'style' : source.data.kind as 'character' | 'wardrobe' | 'location' | 'element'
        const nested = walk(source.id, path)
        const semanticLabel = source.data.referenceTag || `@${source.data.title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}`
        const builtInPreset = role === 'style' && !source.data.styleSavedAt ? resolveBuiltInStylePreset(source.data) : undefined
        const sourcePrompt = (builtInPreset?.prompt || semanticAssetAuthorityText(source.data)).trim()
        if (role === 'style') result.stylePrompt = joinPrompt(result.stylePrompt, sourcePrompt)
        if (builtInPreset && sourcePrompt) result.builtInStylePrompts = [...(result.builtInStylePrompts || []), sourcePrompt]
        const semanticPrompt = sourcePrompt
          ? role === 'style'
            ? `Style Direction ${semanticLabel}:\n${sourcePrompt}`
            : `${role.charAt(0).toUpperCase() + role.slice(1)} ${semanticLabel}: ${sourcePrompt}`
          : undefined
        result.prompt = joinPrompt(result.prompt, semanticPrompt, nested.prompt)
        result.stylePrompt = joinPrompt(result.stylePrompt, nested.stylePrompt)
        result.builtInStylePrompts = [...(result.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])]
        result.references.push(...nested.references)
        result.offlineSemanticSources.push(...nested.offlineSemanticSources)
        result.connectionRules.push(...nested.connectionRules)
        const characterSheetMetadata = role === 'character'
          ? (source.data.referenceAssets || []).find((asset) => asset.metadata?.characterSheetPath)?.metadata
          : undefined
        const characterSheetPath = source.data.characterSheetPath || characterSheetMetadata?.characterSheetPath
        const characterSheetUrl = source.data.characterSheetUrl || characterSheetMetadata?.characterSheetUrl
        const characterSheetViews = source.data.characterSheetViews || characterSheetMetadata?.characterSheetViews
        const singleCharacterFace = role === 'character' && source.data.characterInputMode === 'single'
          ? (source.data.referenceAssets || []).find((asset) => asset.metadata?.characterView === 'front')
          : undefined
        if (singleCharacterFace) {
          result.references.push({
            role,
            path: singleCharacterFace.path,
            url: singleCharacterFace.url,
            name: source.data.title,
            tag: source.data.referenceTag,
            characterAuthorityMode: source.data.characterAuthorityMode,
            approvedIdentityDescription: singleCharacterFace.metadata?.identityDescription,
            description: sourcePrompt || undefined,
            mediaType: 'image',
            slot: 'reference',
          })
        } else if (role === 'character' && source.data.characterInputMode !== 'single' && characterSheetPath) {
          result.references.push({
            role,
            path: characterSheetPath,
            url: characterSheetUrl,
            name: `${source.data.title}-character-reference-sheet.jpg`,
            tag: source.data.referenceTag,
            characterAuthorityMode: source.data.characterAuthorityMode,
            approvedIdentityDescription: (source.data.referenceAssets || []).map((asset) => asset.metadata?.identityDescription).find(Boolean),
            description: sourcePrompt || undefined,
            sourceViews: characterSheetViews || (source.data.referenceAssets || []).map((asset) => asset.metadata?.characterView).filter((view): view is NonNullable<typeof view> => Boolean(view)),
            mediaType: 'image',
            slot: 'reference',
          })
        } else for (const asset of source.data.referenceAssets || []) result.references.push({
            role, path: asset.path, url: asset.url, name: role === 'character' ? source.data.title : asset.name, tag: source.data.referenceTag,
            boundCharacterTag: source.data.appearanceOwnerCharacterTag || (role === 'wardrobe' && target?.data.kind === 'character' ? workflowTag(target.data, 'character') : undefined),
            characterAuthorityMode: role === 'character' ? source.data.characterAuthorityMode : undefined,
            approvedIdentityDescription: role === 'character' ? asset.metadata?.identityDescription : undefined,
            appearanceScope: source.data.appearanceScope,
            appearanceSelection: source.data.appearanceSelection,
            appearanceElementTag: source.data.appearanceElementTag,
            appearanceShotIds: source.data.appearanceShotIds,
            propScaleAuthority: source.data.propScaleAuthority,
            description: sourcePrompt || undefined,
            view: source.data.kind === 'character' ? asset.metadata?.characterView : source.data.kind === 'element' ? asset.metadata?.elementView : undefined,
            mediaType: asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image', slot: 'reference',
          })
        continue
      }

      const activeResult = activeGeneratedResult(source.data)
      if (activeResult?.path || source.data.outputPath || source.data.assetPath) {
        const mediaType = mediaTypeFor(source)
        const target = byId.get(targetId)
        const slot = edge.targetHandle === 'end-image' && inputFidelity !== 'guide'
          ? 'end'
          : edge.targetHandle === 'element'
            ? 'element'
            : ['reference', 'reference-in', 'video-reference-in', 'audio-reference-in', 'audio-in', 'video-in'].includes(edge.targetHandle || '')
              ? 'reference'
              : target?.data.kind === 'video-generator' && edge.targetHandle === 'image-in' && inputFidelity !== 'guide'
                ? 'start'
                : 'reference'
        const path = activeResult?.path || source.data.outputPath || source.data.assetPath
        const url = activeResult?.url || source.data.outputUrl || source.data.assetUrl
        const selectedName = activeMediaName(source.data)
        const isPrimaryImage = mediaType === 'image'
          && edge.targetHandle === 'image-in'
          && (inputFidelity === 'lock' || target?.data.kind === 'upscaler' || target?.data.kind === 'image-editor')
          && !result.inputPath
        const isPrimaryVideo = mediaType === 'video' && edge.targetHandle === 'video-in' && (inputFidelity === 'lock' || target?.data.kind === 'upscaler') && !result.inputPath
        if (isPrimaryImage || isPrimaryVideo) {
          result.inputPath = path
          result.inputUrl = url
          result.inputName = selectedName
          result.inputTag = workflowTag(source.data, slot === 'start' ? 'start-frame' : isPrimaryVideo ? 'source-video' : 'source-image')
          result.inputRole = slot === 'start' ? 'start-frame' : isPrimaryVideo ? 'source-video' : 'source-image'
          if (isPrimaryVideo) result.references.push({ role: 'reference', path, url, name: source.data.title, tag: result.inputTag, description: source.data.prompt, mediaType, slot: 'reference' })
        } else result.references.push({
          role: 'reference', path, url, name: selectedName,
          description: source.data.prompt,
          tag: workflowTag(source.data, edge.targetHandle === 'end-image' ? 'end-frame' : slot === 'start' ? 'start-frame' : `${slot}-${result.references.length + 1}`),
          mediaType, slot, fidelity: inputFidelity,
          authority: mediaType === 'video' && edge.targetHandle === 'video-reference-in'
            ? 'motion-camera'
            : mediaType === 'audio' && ['audio-in', 'audio-reference-in'].includes(edge.targetHandle || '')
              ? 'audio-timing'
              : 'appearance',
        })
      }
    }

    const seen = new Set<string>()
    result.references = result.references.filter((reference) => {
      const key = `${reference.role}|${reference.path || reference.url}|${reference.tag}|${reference.slot}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const seenRules = new Set<string>()
    result.connectionRules = result.connectionRules.filter((rule) => {
      const key = `${rule.tag}|${rule.label}|${rule.rule}`
      if (seenRules.has(key)) return false
      seenRules.add(key)
      return true
    })
    result.builtInStylePrompts = [...new Set(result.builtInStylePrompts || [])]
    result.offlineSemanticSources = [...new Map(result.offlineSemanticSources.map((source) => [source.nodeId, source])).values()]
    return result
  }

  return walk(nodeId, new Set<string>(), ignoredRootTargetHandles)
}

export function buildGenerationRequest(node: StudioNode, nodes: StudioNode[], edges: Edge[]): GenerationRequest {
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]))
  const validated = new Set<string>()
  const validateUpstream = (targetId: string) => {
    if (validated.has(targetId)) return
    validated.add(targetId)
    const target = byId.get(targetId)
    if (!target) return
    for (const port of nodeInputPorts(target.data)) {
      const cardinalityError = inputCardinalityError(edges, targetId, target.data, port.id)
      if (cardinalityError) throw new Error(cardinalityError)
    }
    const declaredPorts = new Set(nodeInputPorts(target.data).map((port) => port.id))
    for (const edge of edges.filter((candidate) => candidate.target === targetId)) {
      const source = byId.get(edge.source)
      if (!source) continue
      if (declaredPorts.size && (!edge.targetHandle || !declaredPorts.has(edge.targetHandle))) throw new Error(`${target.data.title || target.data.kind} does not have a compatible ${edge.targetHandle || 'input'} socket.`)
      const compatibilityError = nodeConnectionError(source.id, target.id, source.data, target.data, edge.sourceHandle, edge.targetHandle)
      if (compatibilityError) throw new Error(compatibilityError)
      validateUpstream(source.id)
    }
  }
  validateUpstream(node.id)
  const storyboardConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'storyboard-in')
  const promptMode = node.data.kind === 'video-generator' ? activeVideoPromptMode(node.data, storyboardConnected) : 'manual'
  if (node.data.kind === 'video-generator' && promptMode === 'manual' && !(node.data.manualPromptDraft ?? node.data.prompt ?? '').trim()) throw new Error('Write a User prompt before running.')
  const upstream = resolveWorkflowInput(node.id, nodes, edges, promptMode === 'manual' ? new Set(['storyboard-in']) : new Set())
  if (node.data.kind === 'video-generator' && promptMode === 'manual') {
    for (const storyboardEdge of edges.filter((edge) => edge.target === node.id && edge.targetHandle === 'storyboard-in')) {
      const nested = resolveWorkflowInput(storyboardEdge.source, nodes, edges)
      upstream.references.push(...nested.references)
      upstream.connectionRules.push(...nested.connectionRules.filter((rule) => !/^(?:Storyboard|Prompt|Text List)$/i.test(rule.label)))
      upstream.stylePrompt = joinPrompt(upstream.stylePrompt, nested.stylePrompt)
      upstream.builtInStylePrompts = [...(upstream.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])]
    }
  }
  const semanticAssetKind = ['character', 'element', 'location', 'wardrobe'].includes(node.data.kind) ? node.data.kind as 'character' | 'element' | 'location' | 'wardrobe' : undefined
  const isElementAsset = semanticAssetKind === 'element'
  const requestedVideoModel = resolveVideoModel(node.data.videoEngine)
  const hasIndependentVisualReferences = upstream.references.some((reference) => reference.slot === 'reference' && (!reference.mediaType || reference.mediaType === 'image' || reference.mediaType === 'video'))
  const hasEndFrame = upstream.references.some((reference) => reference.slot === 'end')
  const needsCombinedFrameReferenceRoute = node.data.kind === 'video-generator'
    && hasIndependentVisualReferences
    && (requestedVideoModel.mode === 'first-last' || (requestedVideoModel.mode === 'image' && hasEndFrame))
  const effectiveVideoEngine = needsCombinedFrameReferenceRoute ? 'fal-ai/kling-video/o3/standard/reference-to-video' : node.data.videoEngine
  const videoModel = resolveVideoModel(effectiveVideoEngine)
  const motionCadence = node.data.kind === 'video-generator' ? normalizedMotionCadence(videoModel, node.data.frameRate, node.data.motionCadence) : undefined
  const cadenceInstruction = motionCadence
    ? `MOTION CADENCE: Depict motion with a deliberate ${motionCadence} fps animation cadence—approximately ${motionCadence} distinct motion updates per second, using held poses or repeated frames as needed. Preserve the provider-native encoded output frame rate and playback duration; do not speed up playback.`
    : undefined
  const compiledStoryboard = compiledStoryboardPrompt(upstream.storyboardPreamble, upstream.storyboardShots, videoModel.family)
  const upstreamPrompt = withoutStyleBlocks(withoutPromptBlock(upstream.prompt, upstream.storyboardRawPrompt), upstream.stylePrompt)
  const activeLocalPrompt = node.data.kind === 'video-generator'
    ? promptMode === 'manual' ? node.data.manualPromptDraft ?? node.data.prompt : undefined
    : semanticAssetKind ? node.data.assetGenerationPrompt ?? node.data.prompt
    : node.data.prompt
  const prompt = joinPrompt(activeLocalPrompt, compiledStoryboard, upstreamPrompt, cadenceInstruction)
  const authoredPrompt = joinPrompt(activeLocalPrompt, upstream.authoredPrompt)
  const storyboardDuration = upstream.storyboardDuration

  const multiPrompt = videoModel.family === 'kling' && upstream.storyboardShots?.length
    ? upstream.storyboardShots.map((shot) => ({ prompt: joinPrompt(`Shot Size: ${shotRecipe('shot-size', shot.shotSize, videoModel.family)}; Camera Movement: ${shotRecipe('camera', shot.camera, videoModel.family)}${shot.audioCue ? `; Audio Cue: ${shot.audioCue}` : ''}. ${shot.prompt}`, cadenceInstruction) || '', duration: String(shot.duration) }))
    : undefined

  const resolvedConnectionRules = upstream.connectionRules.map((rule) => resolveAutoConnectedInputRule(rule, authoredPrompt))
  const exactArtworkTags = new Set(resolvedConnectionRules
    .filter((rule) => rule.rule.startsWith('LOCK RULE') || rule.rule.startsWith('AUTO → PRESERVE RULE'))
    .map((rule) => rule.tag))
  const request: GenerationRequest = {
    nodeId: node.id,
    kind: semanticAssetKind ? 'image-generator' : node.data.kind,
    prompt,
    providerPromptOverride: node.data.kind === 'video-generator' && node.data.promptMode === 'manual' && node.data.manualPromptSeeded ? activeLocalPrompt : undefined,
    authoredPrompt,
    stylePrompt: upstream.stylePrompt,
    builtInStylePrompts: upstream.builtInStylePrompts,
    multiPrompt,
    storyboardContext: withoutStyleBlocks(upstream.storyboardContext, upstream.stylePrompt),
    storyboardShotCount: upstream.storyboardShots?.length,
    storyboardShots: upstream.storyboardShots,
    storyboardIncompletePanels: upstream.storyboardIncompletePanels,

    shotRecipeVersions: upstream.storyboardShots?.flatMap((shot) => [shotRecipeDetails('shot-size', shot.shotSize, videoModel.family).version, shotRecipeDetails('camera', shot.camera, videoModel.family).version]),
    directionLayer: node.data.directionLayer,
    shotLocks: node.data.shotLocks,
    inputPath: node.data.assetPath || upstream.inputPath,
    inputUrl: upstream.inputUrl,
    inputName: upstream.inputName,
    inputTag: upstream.inputTag,
    inputRole: upstream.inputRole,
    connectionRules: resolvedConnectionRules,
    aspectRatio: semanticAssetKind === 'character' ? node.data.aspectRatio || '2:3' : semanticAssetKind === 'location' || semanticAssetKind === 'wardrobe' ? node.data.aspectRatio || '16:9' : isElementAsset ? node.data.aspectRatio || '1:1' : node.data.kind === 'video-generator' ? resolvedVideoRatio(videoModel, node.data.aspectRatio) : node.data.aspectRatio,
    quantity: node.data.quantity,
    scale: node.data.scale,
    upscalerModel: node.data.upscalerModel,
    creativity: node.data.creativity,
    resemblance: node.data.resemblance,
    videoEngine: effectiveVideoEngine,
    duration: storyboardDuration || node.data.duration,
    editControlDuration: node.data.kind === 'video-generator' ? node.data.duration : undefined,
    autoDuration: node.data.kind === 'video-generator' ? false : storyboardDuration ? false : node.data.autoDuration,
    frameRate: node.data.frameRate,
    motionCadence,
    shutterMode: node.data.shutterMode === 'speed' ? 'speed' : 'angle',
    shutterAngle: typeof node.data.shutterAngle === 'number' ? node.data.shutterAngle : 180,
    generateAudio: node.data.generateAudio,
    loop: node.data.loop,
    forceInstrumental: node.data.forceInstrumental,
    negativePrompt: node.data.negativePrompt,
    seed: node.data.seed,
    outputFormat: node.data.outputFormat,
    imageResolution: node.data.imageResolution,
    imageProvider: node.data.imageProvider,
    imageModelId: node.data.imageModelId,
    safetyTolerance: node.data.safetyTolerance,
    enableWebSearch: node.data.enableWebSearch,
    autoFix: node.data.autoFix,
    inferenceSteps: node.data.inferenceSteps,
    guidanceScale: node.data.guidanceScale,
    acceleration: node.data.acceleration,
    resolution: node.data.resolution,
    bitrateMode: node.data.bitrateMode,
    videoQuality: node.data.videoQuality,
    videoWriteMode: node.data.videoWriteMode,
    interpolatorModel: node.data.interpolatorModel,
    numInterpolatedFrames: node.data.numInterpolatedFrames,
    adjustFpsForInterpolation: node.data.adjustFpsForInterpolation,
    enablePromptExpansion: node.data.enablePromptExpansion,
    enableInputSafety: node.data.enableInputSafety,
    enableOutputSafety: node.data.enableOutputSafety,
    shift: node.data.shift,
    voice: node.data.voice,
    voiceEngine: node.data.voiceEngine,
    fishModel: node.data.fishModel,
    fishReferenceId: node.data.fishReferenceId,
    fishTemperature: node.data.fishTemperature,
    fishTopP: node.data.fishTopP,
    fishVolume: node.data.fishVolume,
    fishNormalizeLoudness: node.data.fishNormalizeLoudness,
    fishNormalize: node.data.fishNormalize,
    fishChunkLength: node.data.fishChunkLength,
    fishFormat: node.data.fishFormat,
    fishSampleRate: node.data.fishSampleRate,
    fishMp3Bitrate: node.data.fishMp3Bitrate,
    fishOpusBitrate: node.data.fishOpusBitrate,
    fishLatency: node.data.fishLatency,
    stability: node.data.stability,
    similarityBoost: node.data.similarityBoost,
    speed: node.data.speed,
    languageCode: node.data.voiceEngine === 'fish-audio' ? undefined : normalizedElevenV3LanguageCode(node.data.languageCode) || 'eng',
    textNormalization: node.data.textNormalization,
    audioOutputFormat: node.data.audioOutputFormat,
    previousText: node.data.previousText,
    nextText: node.data.nextText,
    voiceSeed: node.data.voiceSeed,
    voiceTimestamps: node.data.voiceTimestamps,
    promptInfluence: node.data.promptInfluence,
    references: upstream.references.map((reference) => exactArtworkTags.has(reference.tag || '') ? { ...reference, fidelity: 'lock' as const } : reference),
    offlineSemanticSources: upstream.offlineSemanticSources,
  }
  if (!semanticAssetKind) return request
  const imageProvider = node.data.imageProvider || 'fal'
  const imageModelId = node.data.imageModelId || (imageProvider === 'openai' ? 'gpt-image-2' : imageProvider === 'google' ? 'gemini-3.1-flash-image' : 'fal-ai/flux/schnell')
  const applied = applyResolvedAssetRequest({ ...request, imageProvider, imageModelId }, {
    assetType: semanticAssetKind,
    originalText: prompt || '',
    detectedLanguage: node.data.promptLanguageTag,
    styleText: upstream.stylePrompt,
    wideGeometry: semanticAssetKind === 'location',
    model: semanticModelCapability(imageProvider, imageModelId),
  })
  if (!applied.request) throw new Error(applied.resolved.preflight.reasons.join(' '))
  return applied.request
}

export interface GenerationRequestInspection {
  request: GenerationRequest | null
  error: string | null
}

/**
 * Read-only projection for the prompt-tag UI. Keep this traversal independent
 * from request compilation: readiness failures (for example an over-budget
 * Storyboard) belong to Run, and must never escape through React render.
 */
export function recursiveUpstreamSemanticTags(nodeId: string, nodes: StudioNode[], edges: Edge[]): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const semanticLabels = /^(?:Character|Wardrobe|Location|Element|Style)/i
  const tags = new Set<string>()
  const visited = new Set<string>()

  const visit = (targetId: string): void => {
    if (visited.has(targetId)) return
    visited.add(targetId)
    const target = byId.get(targetId)
    if (!target) return

    for (const edge of edges.filter((candidate) => candidate.target === targetId)) {
      const source = byId.get(edge.source)
      if (!source) continue
      const inputFidelity = ((edge.data as { inputFidelity?: InputFidelity } | undefined)?.inputFidelity || 'auto')
      const rule = connectedInputRule(source.data, target.data, edge.targetHandle, inputFidelity)
      if (semanticLabels.test(rule.label)) {
        if (rule.tag) tags.add(rule.tag)
        for (const alias of rule.aliases || []) tags.add(alias)
      }
      visit(source.id)
    }
  }

  visit(nodeId)
  return [...tags]
}

export function inspectGenerationRequest(node: StudioNode, nodes: StudioNode[], edges: Edge[]): GenerationRequestInspection {
  try {
    return { request: buildGenerationRequest(node, nodes, edges), error: null }
  } catch (error) {
    return { request: null, error: error instanceof Error ? error.message : String(error) }
  }
}
