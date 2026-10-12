import { resolvedAssetReferenceDescription } from './assetReferenceDescriptions'
import { visualMotionCadenceInstruction } from './filmicMotion'
import { nativeFalPromptTransport } from './nativeFalPromptTransport'
import { videoDraftCompletionRequest } from './videoDraft'
import { directStoryboardStyles } from './storyboardStyleRouting'
import { normalizedNativeVideoMotionCadence } from './nativeVideoFooterControls'
import { requiresGeneratedDialogueAudio } from './videoDialogueAudio'
import { higgsfieldModel, planHiggsfieldInput, planHiggsfieldNativeInput, type HiggsfieldMediaSource } from './higgsfieldNative'
import { describeHiggsfieldInputContract, type HiggsfieldMediaBinding } from './higgsfieldInputContract'
import { higgsfieldInputSchema, higgsfieldPromptFamily } from './higgsfieldNative'
import { compileHiggsfieldSeedancePrompt, type HiggsfieldPromptSlot } from './higgsfieldSeedancePrompt'
import { higgsfieldStoryboardTimingFailures } from './higgsfieldVideoTiming'
import { assertStoryboardPhysicalCast } from './storyboardPhysicalCast'
import { falVideoSeconds, authoredTimelineSeconds, assertFalTimelineTiming } from './videoTiming'
import { isElevenDialogue, dialoguePromptText } from './elevenDialogue'
import type { Edge } from '@xyflow/react'
import { directElevenLanguage, isDirectElevenAudio } from './elevenLabsAudio'
import type { GenerationRequest, StoryboardPanel, StudioNode } from './types'
import { findVideoModel, normalizedMotionCadence, resolvedVideoRatio, resolveVideoModel } from './videoModels'
import { inputCardinalityError, nodeConnectionError, outputSignalFor } from './nodeConnections'
import { nodeInputPorts } from './nodePorts'
import { connectedInputRule, resolveAutoConnectedInputRule, workflowTag } from './inputRules'
import type { InputFidelity } from './inputRules'
import { normalizedElevenV3LanguageCode } from './voiceLanguages'
import { selectedLensInstruction, timedCameraRecipe, shotRecipe, shotRecipeDetails } from './shotRecipes'
import { storyboardTimecodes } from './storyboardTimecodes'
import { resolveBuiltInStylePreset } from './stylePresets'
import { activeGeneratedResult, activeMediaName } from './generatedMedia'
import { groupStoryboardSequence, normalizedStoryboardTransition, storyboardTransitionConflicts, STORYBOARD_OUTGOING_CONTINUATION } from './storyboardSequence'
import { selectedStoryboardPrompt } from './storyboardPromptVersions'
import { storyboardDurationReadinessError } from './storyboardDurationBudget'
import { planStoryboardCameraBridges, storyboardCameraBridgeReadiness, type StoryboardCameraBridgePlan } from './storyboardCameraBridge'
import { activeVideoPromptMode } from './videoPromptMode'
import { cameraSupportConflict } from './cameraSupportSemantics'
import { applyResolvedAssetRequest, semanticModelCapability } from './resolvedAssetRequest'
import { isSemanticAssetKind, semanticAssetAvailability } from './semanticAssetAvailability'
import { nativeVideoOutputFrameRate, userPromptWithCadence } from './videoCadenceSelection'
import { assetReferenceDescription, semanticAssetAuthorityText } from './semanticAssetPromptBoundary'
import { buildKlingNativeMultiPrompt } from './klingNativeStoryboard'
import { falNativeFlowForKind, type FalNativeMediaSource } from './falNativeExecution'
import { compileNativeProviderPrompt, type PromptFamily } from './referenceInstructions'
import { providerVisibleReferences, sameBodyAuthorityReadinessFailures } from './sameBodyAuthority'
import { propScaleReadinessFailures } from './propScaleAuthority'

/** Native capture metadata and optional visual cadence share the footer's FPS authority. */
function nativeVideoMotionRequest(data: StudioNode['data'], manual: boolean): Pick<GenerationRequest, 'motionCadence' | 'nativeOutputFrameRate'> {
  if (data.kind !== 'video-generator') return {}
  const state = data.falNative || data.higgsfieldNative
  if (!state) return {}
  // Retired preserved values are not current schema controls.
  const declaredFps = Object.hasOwn(state.fieldControls || {}, 'fps') ? state.values.fps : undefined
  const fps = nativeVideoOutputFrameRate(state.endpointId, declaredFps)
  const capture = { nativeOutputFrameRate: fps ?? null }
  if (data.motionCadenceMode === 'native' || manual && data.motionCadenceMode !== 'custom') return capture
  // Retain explicit saved intent for preview/review; readiness needs a known ceiling.
  if (fps === undefined && data.motionCadenceMode === 'custom') return { ...capture, motionCadence: data.motionCadence }
  return { ...capture, motionCadence: normalizedNativeVideoMotionCadence(state.endpointId, fps, data.motionCadence) }
}

// Only existing verified video adapters define duration in seconds. New endpoints
// keep their typed provider value without guessing its unit or coercing its payload.
function nativeVideoSeconds(data: StudioNode['data']): number | undefined {
  return data.falNative ? falVideoSeconds(data.falNative.timing, data.falNative.values) : undefined
}

export interface ResolvedStoryboardShot {
  panelId: string
  prompt: string
  duration: number
  shotSize: string
  lensMm?: number
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

function joinSpeech(...parts: Array<string | undefined>): string | undefined {
  return parts.filter((part): part is string => typeof part === 'string' && Boolean(part.trim())).join('\n\n') || undefined
}
function preservesSpeech(data: StudioNode['data']): boolean {
  return !data.falNative && (isDirectElevenAudio(data) || data.kind === 'voiceover' && data.voiceEngine === 'fish-audio')
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

function formattedStoryboard(panels: StoryboardPanel[], duration: number, previewOnly = false): { preamble: string; rawPrompt: string; shots: ResolvedStoryboardShot[]; incompletePanels: number[] } {
  const activePanels = panels.map((panel) => ({ ...panel, prompt: selectedStoryboardPrompt(panel) }))
  const transitionErrors = storyboardTransitionConflicts(activePanels)
  if (transitionErrors.length) throw new Error(transitionErrors[0])
  const durationError = storyboardDurationReadinessError(activePanels, duration)
  if (durationError && !previewOnly) throw new Error(durationError)
  for (const panel of activePanels) {
    const supportConflict = cameraSupportConflict(panel.camera, panel.prompt)
    if (supportConflict) throw new Error(supportConflict)
  }
  const automatic = Math.max(1, Math.floor(duration / Math.max(1, activePanels.length)))
  const incompletePanels = activePanels.flatMap((panel, index) => panel.prompt.trim() ? [] : [index + 1])
  const normalizedPanels = activePanels.map((panel) => ({ ...panel, duration: panel.duration === 'auto' ? automatic : panel.duration }))
  const bridges = planStoryboardCameraBridges(normalizedPanels)
  const bridgeError = storyboardCameraBridgeReadiness(bridges)
  if (bridgeError && !previewOnly) throw new Error(bridgeError)
  let elapsed = 0
  const shots = normalizedPanels.map((panel, index) => {
    const startSeconds = elapsed
    elapsed += Number(panel.duration)
    return {
    panelId: panel.id,
    prompt: panel.prompt.trim(),
    duration: Number(panel.duration),
    shotSize: panel.shotSize || 'auto',
    lensMm: panel.lensMm,
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
  const rawPrompt = [preamble, ...shots.map((shot, index) => `Shot ${index + 1} — Duration: ${shot.duration}s; Shot Size: ${shot.shotSize}; Camera Movement: ${shot.camera}${shot.audioCue ? `; Audio Cue: ${shot.audioCue}` : ''}.${shot.lensMm !== undefined ? ` ${selectedLensInstruction(shot.lensMm)}` : ''}${shot.prompt ? ` ${shot.prompt}` : ` [STORYBOARD PANEL ${shot.panelNumber} INCOMPLETE — no action authored.]`}`), ...(shots.at(-1)?.transitionToNext === 'continue' ? [STORYBOARD_OUTGOING_CONTINUATION] : [])].join('\n')
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
  const timecodes = storyboardTimecodes(shots.flatMap(shot => [shot.duration, shot.startSeconds, shot.endSeconds, shot.incomingBridge?.reservedSeconds || 0, shot.incomingBridge?.reactionReserveSeconds || 0]))
  const lines: string[] = [preamble]
  sequence.shots.forEach((group, shotIndex) => {
    const groupStart = group.beats[0].startSeconds
    const groupEnd = group.beats[group.beats.length - 1].endSeconds
    lines.push(`SHOT ${shotIndex + 1} · ${timecodes.format(groupStart)}–${timecodes.format(groupEnd)}s`)
    group.beats.forEach((beat, beatIndex) => {
      const label = group.beats.length > 1 ? `BEAT ${beatIndex + 1} · ${timecodes.format(beat.startSeconds)}–${timecodes.format(beat.endSeconds)}s` : `ACTION · ${timecodes.format(beat.startSeconds)}–${timecodes.format(beat.endSeconds)}s`
      const bridge = beat.incomingBridge
      if (bridge?.concurrent && bridge.bridgeText) {
        lines.push(`${label}: ${beat.prompt || `[STORYBOARD PANEL ${beat.panelNumber} INCOMPLETE — no action authored.]`}`)
        lines.push(`CAMERA THROUGH SAME INTERVAL: ${bridge.bridgeText}`)
      } else if (bridge?.reservedSeconds && bridge.bridgeText) {
        const bridgeEnd = beat.startSeconds + bridge.reservedSeconds
        const reactionStart = beat.endSeconds - bridge.reactionReserveSeconds
        lines.push(label)
        lines.push(`CAMERA BRIDGE · ${timecodes.format(beat.startSeconds)}–${timecodes.format(bridgeEnd)}s: ${bridge.bridgeText}`)
        lines.push(`MAIN ACTION · ${timecodes.format(bridgeEnd)}–${timecodes.format(reactionStart)}s: ${beat.prompt || `[STORYBOARD PANEL ${beat.panelNumber} INCOMPLETE — no action authored.]`}`)
        lines.push(`REACTION / SETTLE · ${timecodes.format(reactionStart)}–${timecodes.format(beat.endSeconds)}s`)
      } else {
        lines.push(`${label}: ${beat.prompt || `[STORYBOARD PANEL ${beat.panelNumber} INCOMPLETE — no action authored.]`}`)
      }
      lines.push(`FRAMING: ${shotRecipe('shot-size', beat.shotSize, family)}.`)
      if (beat.lensMm !== undefined) lines.push(selectedLensInstruction(beat.lensMm))
      lines.push(`CAMERA: ${timedCameraRecipe(beat.camera, beat.duration, beat.prompt, family).replace(/[.]+$/, '')}${beat.audioCue ? `; Audio Cue: ${beat.audioCue}` : ''}.`)
    })
    if (shotIndex < sequence.shots.length - 1) lines.push('HARD CUT.')
  })
  if (shots.at(-1)?.transitionToNext === 'continue') lines.push(STORYBOARD_OUTGOING_CONTINUATION)
  return lines.join('\n')
}

export function resolveWorkflowInput(nodeId: string, nodes: StudioNode[], edges: Edge[], ignoredRootTargetHandles = new Set<string>(), previewOnly = false): ResolvedWorkflowInput {
  edges = directStoryboardStyles(nodes, edges)
  const combinePrompt = preservesSpeech(nodes.find(node => node.id === nodeId)?.data || { kind: 'prompt', title: '' }) ? joinSpeech : joinPrompt
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
      const inputFidelity = target && ['image-generator', 'video-generator'].includes(target.data.kind) ? 'auto' : ((edge.data as { inputFidelity?: InputFidelity } | undefined)?.inputFidelity || 'auto')
      if (target) result.connectionRules.push({ ...connectedInputRule(source.data, target.data, edge.targetHandle, inputFidelity), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges, source.data.kind === 'wardrobe' && target.data.kind === 'character' ? workflowTag(target.data, 'character') : undefined) })

      if (source.data.kind === 'router') {
        const nested = walk(source.id, path)
        // Router is a typed pass-through. Preserve the outer consumer's exact
        // role instead of degrading required media into a generic reference.
        const expectedType = edge.targetHandle === 'video-in' ? 'video' : edge.targetHandle === 'image-in' ? 'image' : undefined
        const requiresStartingImage = target?.data.kind === 'video-generator'
          && (target.data.falNative ? target.data.falNative.media.some(binding => !binding.retired && binding.portId === edge.targetHandle && binding.role === 'start-frame') : ['image', 'first-last'].includes(resolveVideoModel(target.data.videoEngine).mode))
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
        result.prompt = combinePrompt(result.prompt, nested.prompt)
        result.authoredPrompt = combinePrompt(result.authoredPrompt, nested.authoredPrompt)
        result.stylePrompt = combinePrompt(result.stylePrompt, nested.stylePrompt)
        result.builtInStylePrompts = [...(result.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])]
        result.inputPath ||= nested.inputPath
        result.inputUrl ||= nested.inputUrl
        result.references.push(...nested.references.map((reference) => {
          if (reference.role !== 'reference') return reference
          if (edge.targetHandle === 'video-reference-in' && reference.mediaType === 'video') return { ...reference, authority: 'motion-camera' as const }
          if (['audio-reference-in', 'audio-in'].includes(edge.targetHandle || '') && reference.mediaType === 'audio') return { ...reference, authority: 'audio-timing' as const }
          return reference
        }))
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
        result.prompt = combinePrompt(result.prompt, source.data.assistantOutput || source.data.prompt)
        result.authoredPrompt = combinePrompt(result.authoredPrompt, source.data.assistantOutput || source.data.prompt)
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
                metadata: { referenceDescription: resolvedAssetReferenceDescription(listSource, nodes, edges) },
              },
            })
          }
          else if (listSource.data.outputPath || listSource.data.assetPath || listSource.data.outputUrl || listSource.data.assetUrl) items.push({
            id: listEdge.id,
            type: listSourceType,
            sourceNodeId: listSource.id,
            asset: {
              id: listEdge.id,
              name: listSource.data.title,
              path: listSource.data.outputPath || listSource.data.assetPath || '',
              url: listSource.data.outputUrl || listSource.data.assetUrl,
              mimeType: `${listSourceType}/${listSourceType === 'image' ? 'png' : listSourceType === 'video' ? 'mp4' : 'mpeg'}`,
              createdAt: 'workflow',
              metadata: { referenceDescription: resolvedAssetReferenceDescription(listSource, nodes, edges) },
            },
          })
        }
        for (const [index, item] of items.filter((candidate) => candidate.asset).entries()) {
          const origin = item.sourceNodeId ? byId.get(item.sourceNodeId) : undefined
          const selectedOrigin = origin && item.sourceResultIndex !== undefined ? { ...origin, data: { ...origin.data, activeResultIndex: item.sourceResultIndex } } : origin
          result.references.push({
          role: 'reference', path: item.asset?.path, url: item.asset?.url, name: item.asset?.name, tag: selectedOrigin ? workflowTag(selectedOrigin.data, 'reference') : `@list-${index + 1}`,
          referenceDescription: selectedOrigin ? resolvedAssetReferenceDescription(selectedOrigin, nodes, edges) : item.asset?.metadata?.referenceDescription ?? '',
          mediaReferenceMode: selectedOrigin?.data.mediaReferenceMode || (selectedOrigin && outputSignalFor(selectedOrigin.data) === 'audio' ? selectedOrigin.data.kind === 'voiceover' ? 'lip-sync' : 'sound' : undefined),
          mediaType: item.type as 'image' | 'video' | 'audio', slot: 'reference',
          authority: item.type === 'video' && edge.targetHandle === 'video-reference-in'
            ? 'motion-camera'
            : item.type === 'audio' && edge.targetHandle === 'audio-reference-in'
              ? 'audio-timing'
              : 'appearance',
          })
        }
        continue
      }

      if (target?.data.kind === 'storyboard-asset' && edge.targetHandle === 'storyboard-in' && ['storyboard', 'storyboard-asset'].includes(source.data.kind)) {
        const hasDirectStyle = incoming.some((candidate) => candidate.targetHandle === 'style-in')
        const lineage = walk(source.id, path, hasDirectStyle ? new Set(['style-in']) : new Set())
        result.prompt = combinePrompt(result.prompt, lineage.prompt)
        result.references.push(...lineage.references)
        result.offlineSemanticSources.push(...lineage.offlineSemanticSources)
        result.connectionRules.push(...lineage.connectionRules)
        continue
      }

      if (source.data.kind === 'storyboard' || source.data.kind === 'storyboard-asset') {
        const duration = target?.data.kind === 'video-generator' && edge.targetHandle === 'storyboard-in'
          ? Math.max(0.5, target.data.higgsfieldNative ? typeof target.data.higgsfieldNative.values.duration === 'number' ? target.data.higgsfieldNative.values.duration : source.data.storyboardDuration ?? 5 : target.data.falNative ? nativeVideoSeconds(target.data) ?? source.data.storyboardDuration ?? 5 : target.data.duration || 5)
          : Math.max(0.5, source.data.storyboardPanels?.reduce((sum, panel) => sum + (panel.duration === 'auto' ? 1 : Number(panel.duration) || 0), 0) || 15)
        const panels = source.data.storyboardPanels || []
        const storyboard = formattedStoryboard(panels, duration, previewOnly)
        const nested = walk(source.id, path)
        result.prompt = combinePrompt(result.prompt, storyboard.rawPrompt, nested.prompt)
        result.stylePrompt = combinePrompt(result.stylePrompt, nested.stylePrompt)
        result.builtInStylePrompts = [...(result.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])]
        result.storyboardShots = storyboard.shots
        result.storyboardIncompletePanels = storyboard.incompletePanels
        result.storyboardPreamble = storyboard.preamble
        result.storyboardRawPrompt = storyboard.rawPrompt
        result.storyboardDuration = duration

        result.storyboardContext = combinePrompt(result.storyboardContext, nested.prompt)
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
        if (role === 'style') result.stylePrompt = combinePrompt(result.stylePrompt, sourcePrompt)
        if (builtInPreset && sourcePrompt) result.builtInStylePrompts = [...(result.builtInStylePrompts || []), sourcePrompt]
        const semanticPrompt = sourcePrompt
          ? role === 'style'
            ? `Style Direction ${semanticLabel}:\n${sourcePrompt}`
            : `${role.charAt(0).toUpperCase() + role.slice(1)} ${semanticLabel}: ${sourcePrompt}`
          : undefined
        result.prompt = combinePrompt(result.prompt, semanticPrompt, nested.prompt)
        result.stylePrompt = combinePrompt(result.stylePrompt, nested.stylePrompt)
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
            referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges, source.data.kind === 'wardrobe' && target?.data.kind === 'character' ? workflowTag(target.data, 'character') : undefined),
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
            referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges, source.data.kind === 'wardrobe' && target?.data.kind === 'character' ? workflowTag(target.data, 'character') : undefined),
            sourceViews: characterSheetViews || (source.data.referenceAssets || []).map((asset) => asset.metadata?.characterView).filter((view): view is NonNullable<typeof view> => Boolean(view)),
            mediaType: 'image',
            slot: 'reference',
          })
        } else for (const asset of source.data.referenceAssets || []) result.references.push({
            role, path: asset.path, url: asset.url, name: role === 'character' ? source.data.title : asset.name, tag: source.data.referenceTag,
            boundCharacterTag: ['wardrobe', 'element'].includes(role) && target?.data.kind === 'character' ? workflowTag(target.data, 'character') : source.data.appearanceOwnerCharacterTag,
            characterAuthorityMode: role === 'character' ? source.data.characterAuthorityMode : undefined,
            approvedIdentityDescription: role === 'character' ? asset.metadata?.identityDescription : undefined,
            appearanceScope: source.data.appearanceScope,
            appearanceSelection: source.data.appearanceSelection,
            appearanceElementTag: source.data.appearanceElementTag,
            appearanceShotIds: source.data.appearanceShotIds,
            propScaleAuthority: source.data.propScaleAuthority,
            description: sourcePrompt || undefined,
            referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges, source.data.kind === 'wardrobe' && target?.data.kind === 'character' ? workflowTag(target.data, 'character') : undefined),
            view: source.data.kind === 'character' ? asset.metadata?.characterView : source.data.kind === 'element' ? asset.metadata?.elementView : undefined,
            mediaType: asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image', slot: 'reference',
          })
        continue
      }

      const activeResult = activeGeneratedResult(source.data)
      if (activeResult?.path || source.data.outputPath || source.data.assetPath || activeResult?.url || source.data.outputUrl || source.data.assetUrl) {
        const mediaType = mediaTypeFor(source)
        const target = byId.get(targetId)
        const nativeBinding = (target?.data.falNative || target?.data.higgsfieldNative)?.media?.find(binding => !binding.retired && binding.portId === edge.targetHandle)
        const slot = nativeBinding?.role === 'start-frame' ? 'start' : nativeBinding?.role === 'end-frame' ? 'end' : edge.targetHandle === 'end-image' && inputFidelity !== 'guide'
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
          && (nativeBinding?.role === 'start-frame' || edge.targetHandle === 'image-in')
          && (nativeBinding?.role === 'start-frame' || inputFidelity === 'lock' || target?.data.kind === 'video-generator' || target?.data.kind === 'upscaler' || target?.data.kind === 'image-editor')
          && !result.inputPath
        const isPrimaryVideo = mediaType === 'video' && (nativeBinding?.role === 'source-video' || edge.targetHandle === 'video-in') && (nativeBinding?.role === 'source-video' || inputFidelity === 'lock' || target?.data.kind === 'video-generator' || target?.data.kind === 'upscaler') && !result.inputPath
        if (isPrimaryImage || isPrimaryVideo) {
          result.inputPath = path
          result.inputUrl = url
          result.inputName = selectedName
          result.inputTag = workflowTag(source.data, slot === 'start' ? 'start-frame' : isPrimaryVideo ? 'source-video' : 'source-image')
          result.inputRole = slot === 'start' ? 'start-frame' : isPrimaryVideo ? 'source-video' : 'source-image'
          if (isPrimaryVideo) result.references.push({ role: 'reference', path, url, name: source.data.title, tag: result.inputTag, description: source.data.prompt, referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges, source.data.kind === 'wardrobe' && target?.data.kind === 'character' ? workflowTag(target.data, 'character') : undefined), mediaType, slot: 'reference' })
        } else result.references.push({
          role: 'reference', path, url, name: selectedName,
          description: source.data.prompt,
          mediaReferenceMode: source.data.mediaReferenceMode || (outputSignalFor(source.data) === 'audio' ? source.data.kind === 'voiceover' ? 'lip-sync' : 'sound' : undefined),
          referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges, source.data.kind === 'wardrobe' && target?.data.kind === 'character' ? workflowTag(target.data, 'character') : undefined),
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

  const resolved = walk(nodeId, new Set<string>(), ignoredRootTargetHandles)
  const consumer = nodes.find(node => node.id === nodeId)
  if (consumer && ['image-generator', 'video-generator', 'storyboard'].includes(consumer.data.kind)) {
    resolved.references = resolved.references.map(reference => reference.role === 'reference' && reference.slot === 'reference' && reference.tag !== resolved.inputTag && (reference.mediaType === 'image' || reference.mediaType === 'video' || reference.mediaType === 'audio')
      ? { ...reference, mediaReferenceMode: reference.mediaReferenceMode || 'reference', fidelity: undefined } : { ...reference, fidelity: undefined })
  }
  return resolved
}

function buildFalNativeGraphRequest(node: StudioNode, nodes: StudioNode[], edges: Edge[], previewOnly = false): GenerationRequest {
  edges = directStoryboardStyles(nodes, edges)
  const state = node.data.falNative!
  if (falNativeFlowForKind(node.data.kind) !== state.flow || !state.fingerprint) throw new Error('Load the selected model contract before generating.')
  if (Object.keys(state.drafts || {}).length) throw new Error('Complete the preserved numeric or JSON field edits before generating.')
  if (state.repairs?.length) throw new Error(state.repairs.join(' '))
  const manual = node.data.kind === 'video-generator' && activeVideoPromptMode(node.data, edges.some(edge => edge.target === node.id && edge.targetHandle === 'storyboard-in')) === 'manual'
  const upstream = resolveWorkflowInput(node.id, nodes, edges, manual ? new Set(['storyboard-in']) : new Set(), previewOnly)
  if (manual) for (const edge of edges.filter(candidate => candidate.target === node.id && candidate.targetHandle === 'storyboard-in')) {
    const nested = resolveWorkflowInput(edge.source, nodes, edges, new Set(), previewOnly)
    upstream.references.push(...nested.references)
    upstream.connectionRules.push(...nested.connectionRules.filter(rule => !/^(?:Storyboard|Prompt|Text List)$/i.test(rule.label)))
    upstream.offlineSemanticSources.push(...nested.offlineSemanticSources)
    upstream.stylePrompt = joinPrompt(upstream.stylePrompt, nested.stylePrompt)
    upstream.builtInStylePrompts = [...(upstream.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])]
  }
  const local = manual ? node.data.manualPromptDraft ?? node.data.prompt : node.data.prompt
  const family: PromptFamily = findVideoModel(state.endpointId)?.family || 'generic'
  const joinAuthored = (...parts: Array<string | undefined>) => parts.filter((part): part is string => Boolean(part?.trim())).join('\n\n') || undefined
  const raw = joinAuthored(local, compiledStoryboardPrompt(upstream.storyboardPreamble, upstream.storyboardShots, family), withoutStyleBlocks(withoutPromptBlock(upstream.prompt, upstream.storyboardRawPrompt), upstream.stylePrompt))
  const request: GenerationRequest = { ...(previewOnly ? { promptPreviewOnly: true as const } : {}), ...nativeVideoMotionRequest(node.data, manual), nodeId: node.id, kind: node.data.kind, prompt: raw, authoredPrompt: joinAuthored(local, upstream.authoredPrompt), stylePrompt: upstream.stylePrompt, builtInStylePrompts: upstream.builtInStylePrompts,
    videoEngine: node.data.kind === 'video-generator' ? state.endpointId : undefined,
    imageProvider: ['image-generator', 'image-editor'].includes(node.data.kind) ? 'fal' : undefined,
    imageModelId: ['image-generator', 'image-editor'].includes(node.data.kind) ? state.endpointId : undefined,
    storyboardShots: upstream.storyboardShots, storyboardShotCount: upstream.storyboardShots?.length, storyboardIncompletePanels: upstream.storyboardIncompletePanels,
    duration: upstream.storyboardDuration ?? nativeVideoSeconds(node.data), aspectRatio: typeof state.values.aspect_ratio === 'string' ? state.values.aspect_ratio : undefined, resolution: typeof state.values.resolution === 'string' ? state.values.resolution as GenerationRequest['resolution'] : undefined, generateAudio: typeof state.values.generate_audio === 'boolean' ? state.values.generate_audio : state.values.sound==='on'?true:state.values.sound==='off'?false:undefined, directionLayer: node.data.directionLayer, shotLocks: node.data.shotLocks,
    inputPath: upstream.inputPath, inputUrl: upstream.inputUrl, inputTag: upstream.inputTag, inputRole: upstream.inputRole,
    references: upstream.references, connectionRules: upstream.connectionRules, offlineSemanticSources: upstream.offlineSemanticSources }
  const physical = providerVisibleReferences(request).filter(reference => (reference.path || reference.url) && !(reference.path?.toLowerCase().endsWith('.prismstyle')))
  const identity = (source: { path?: string; url?: string; mediaType?: string }) => JSON.stringify([source.path || source.url, source.mediaType || 'image'])
  const unique = (references: NonNullable<GenerationRequest['references']>) => [...new Map(references.map(reference => [JSON.stringify([identity(reference), reference.tag, reference.role, reference.slot]), reference])).values()]
  const media: Record<string, FalNativeMediaSource[]> = {}
  const bound = new Set<string>()
  const orderedReferences: NonNullable<GenerationRequest['references']> = []
  for (const field of state.media.filter(binding => !binding.retired)) {
    const fieldEdges = edges.filter(edge => edge.target !== node.id || edge.targetHandle === field.portId)
    const fieldInput = resolveWorkflowInput(node.id, nodes, fieldEdges, new Set(), previewOnly)
    let references = providerVisibleReferences({ ...request, references: fieldInput.references })
    if ((fieldInput.inputPath || fieldInput.inputUrl) && !references.some(reference => identity(reference) === identity({ path: fieldInput.inputPath, url: fieldInput.inputUrl, mediaType: field.type }))) references.unshift({ path: fieldInput.inputPath, url: fieldInput.inputUrl, name: fieldInput.inputName, tag: fieldInput.inputTag, referenceDescription: fieldInput.connectionRules.find(rule => rule.tag === fieldInput.inputTag)?.referenceDescription, mediaType: field.type, role: 'reference', slot: field.role === 'start-frame' ? 'start' : field.role === 'end-frame' ? 'end' : undefined })
    if (field.role === 'reference-image') references = [...references, ...physical.filter(reference => (reference.mediaType || 'image') === 'image')]
    if (field.role === 'reference-video') references = [...references, ...physical.filter(reference => reference.mediaType === 'video')]
    if (field.role === 'reference-audio') references = [...references, ...physical.filter(reference => reference.mediaType === 'audio')]
    const selected = unique(references.filter(reference => (reference.path || reference.url) && !(reference.path?.toLowerCase().endsWith('.prismstyle'))))
    if (selected.some(reference => (reference.mediaType || 'image') !== field.type)) throw new Error(`${field.label} accepts ${field.type} media only.`)
    if (!field.multiple && selected.length > 1 || field.maximum !== undefined && selected.length > field.maximum) throw new Error(`${field.label} exceeds its declared media capacity.`)
    if (selected.length) media[field.key] = selected.map(reference => {
      bound.add(identity(reference))
      orderedReferences.push(reference)
      return { ...(reference.path ? { path: reference.path } : { url: reference.url! }), mediaType: field.type }
    })
  }
  const unbound = physical.filter(reference => !bound.has(identity(reference)))
  if (unbound.length) throw new Error('Connected media are not bound to an input of the selected model. Review the preserved connections.')
  request.references = orderedReferences
  const timelineSeconds = authoredTimelineSeconds(request)
  if (!previewOnly) assertFalTimelineTiming(state.timing, timelineSeconds, state.values)
  let finalPrompt: string | undefined
  if (state.promptField) {
    if (manual) finalPrompt = userPromptWithCadence(local ?? '', node.data.motionCadenceMode, request.motionCadence)
    else if (['voiceover', 'sound-effects'].includes(node.data.kind)) finalPrompt = local ?? (typeof state.values[state.promptField] === 'string' ? state.values[state.promptField] as string : '')
    else {
      const compiled = compileNativeProviderPrompt(request, family, true)
      if (compiled.promptBudgetDiagnostic?.blocking) throw new Error(compiled.promptBudgetDiagnostic.blockingReason)
      finalPrompt = compiled.text
    }
  } else if (raw?.trim()) throw new Error('Choose the model field that receives the final prompt.')
  request.prompt = finalPrompt
  request.providerPromptOverride = finalPrompt
  request.providerPromptOwnership = manual ? 'authored' : 'compiled'
  request.falNative = { promptOwnership: request.providerPromptOwnership, requiresGeneratedSpeech: requiresGeneratedDialogueAudio(request), ...(timelineSeconds !== undefined ? { timelineSeconds } : {}), endpointId: state.endpointId, flow: state.flow, fingerprint: state.fingerprint, promptField: state.promptField || undefined, values: { ...state.values, ...(state.promptField ? { [state.promptField]: finalPrompt! } : {}) }, media }
  if (state.promptField && finalPrompt !== undefined) request.falNative.values[state.promptField] = nativeFalPromptTransport(request, finalPrompt)
  return request
}

function buildHiggsfieldSeedanceGraphRequest(node: StudioNode, nodes: StudioNode[], edges: Edge[], previewOnly = false): GenerationRequest {
  edges = directStoryboardStyles(nodes, edges)
  const state = node.data.higgsfieldNative!
  if (Object.keys(state.drafts || {}).length) throw new Error('Complete the preserved numeric or JSON input edits before generating.')
  if (state.repairs?.length) throw new Error(state.repairs.join(' '))
  const contract = describeHiggsfieldInputContract(state.endpointId, higgsfieldInputSchema(state.endpointId), '')
  const bindings: Array<HiggsfieldMediaBinding & { retired?: boolean }> = state.media || contract.media
  const byId = new Map(nodes.map(source => [source.id, source])), visiting = new Set<string>(), visited = new Set<string>()
  const verifyGraph = (id: string) => {
    if (visiting.has(id)) throw new Error('The connected Higgsfield input graph has a cyclic route.')
    if (visited.has(id)) return
    if (!byId.has(id)) throw new Error('A connected Higgsfield source is missing. Preserve and relink its connection.')
    visiting.add(id)
    for (const edge of edges.filter(edge => edge.target === id)) verifyGraph(edge.source)
    visiting.delete(id); visited.add(id)
  }
  verifyGraph(node.id)
  const manual = activeVideoPromptMode(node.data, edges.some(edge => edge.target === node.id && edge.targetHandle === 'storyboard-in')) === 'manual'
  const upstream = resolveWorkflowInput(node.id, nodes, edges, manual ? new Set(['storyboard-in']) : new Set(), previewOnly)
  if (manual) for (const edge of edges.filter(edge => edge.target === node.id && edge.targetHandle === 'storyboard-in')) {
    const nested = resolveWorkflowInput(edge.source, nodes, edges, new Set(), previewOnly)
    upstream.references.push(...nested.references)
    upstream.connectionRules.push(...nested.connectionRules.filter(rule => !/^(?:Storyboard|Prompt|Text List)$/i.test(rule.label)))
    upstream.offlineSemanticSources.push(...nested.offlineSemanticSources)
    upstream.stylePrompt = joinPrompt(upstream.stylePrompt, nested.stylePrompt)
    upstream.builtInStylePrompts = [...new Set([...(upstream.builtInStylePrompts || []), ...(nested.builtInStylePrompts || [])])]
  }
  const local = manual ? node.data.manualPromptDraft ?? node.data.prompt ?? '' : node.data.prompt
  const raw = manual ? local : joinPrompt(local, compiledStoryboardPrompt(upstream.storyboardPreamble, upstream.storyboardShots, higgsfieldPromptFamily(state.endpointId)), withoutStyleBlocks(withoutPromptBlock(upstream.prompt, upstream.storyboardRawPrompt), upstream.stylePrompt))
  const request: GenerationRequest = { ...(previewOnly ? { promptPreviewOnly: true as const } : {}),
    ...nativeVideoMotionRequest(node.data, manual), nodeId: node.id, kind: 'video-generator', videoEngine: state.endpointId, prompt: raw,
    authoredPrompt: manual ? local : joinSpeech(local, upstream.authoredPrompt),
    stylePrompt: upstream.stylePrompt, builtInStylePrompts: upstream.builtInStylePrompts,
    storyboardShots: upstream.storyboardShots, storyboardShotCount: upstream.storyboardShots?.length, storyboardIncompletePanels: upstream.storyboardIncompletePanels,
    storyboardContext: withoutStyleBlocks(upstream.storyboardContext, upstream.stylePrompt),
    duration: typeof state.values.duration === 'number' ? state.values.duration : undefined,
    aspectRatio: typeof state.values.aspect_ratio === 'string' ? state.values.aspect_ratio : undefined,
    resolution: typeof state.values.resolution === 'string' ? state.values.resolution as GenerationRequest['resolution'] : undefined,
    generateAudio: typeof state.values.generate_audio === 'boolean' ? state.values.generate_audio : state.values.sound==='on'?true:state.values.sound==='off'?false:undefined,
    directionLayer: node.data.directionLayer, shotLocks: node.data.shotLocks,
    references: [], connectionRules: upstream.connectionRules, offlineSemanticSources: upstream.offlineSemanticSources,
  }
  const media: Record<string, HiggsfieldMediaSource[]> = {}, slots: HiggsfieldPromptSlot[] = []
  const referenceAuthorityFailures = [...sameBodyAuthorityReadinessFailures({...request,references:upstream.references}), ...propScaleReadinessFailures({...request,references:upstream.references})]
  if (referenceAuthorityFailures.length) throw new Error(referenceAuthorityFailures.join(' '))
  // Resolve each root edge separately so an intentional duplicate assignment remains a physical input slot.
  for (const edge of edges.filter(edge => edge.target === node.id && edge.targetHandle !== 'text-in')) {
    const direct = bindings.find(binding => !binding.retired && binding.portId === edge.targetHandle)
    const field = manual && edge.targetHandle === 'storyboard-in' ? resolveWorkflowInput(edge.source,nodes,edges,new Set(),previewOnly) : resolveWorkflowInput(node.id, nodes, edges.filter(candidate => candidate.target !== node.id || candidate.id === edge.id), new Set(), previewOnly)
    if (field.offlineSemanticSources.length) continue // Readiness reports exact offline assets; never substitute another input.
    const physical = providerVisibleReferences({ ...request, references: field.references }).filter(reference => (reference.path || reference.url) && !reference.path?.toLowerCase().endsWith('.prismstyle'))
    if ((field.inputPath || field.inputUrl) && !physical.some(reference => field.inputPath ? reference.path === field.inputPath : reference.url === field.inputUrl)) physical.unshift({ role: 'reference', path: field.inputPath, url: field.inputUrl, tag: field.inputTag, name: field.inputName, referenceDescription: field.connectionRules.find(rule => rule.tag === field.inputTag)?.referenceDescription, mediaType: direct?.type })
    if (direct && !physical.length) throw new Error(`The connected ${direct.label} has no available media. Preserve and relink its source.`)
    for (const reference of physical) {
      const binding = direct || bindings.find(binding => !binding.retired && binding.type === (reference.mediaType || 'image') && binding.role === `reference-${binding.type}`)
      if (!binding) throw new Error('Connected media are not accepted by this Higgsfield mode. Preserve them and choose a compatible input or model.')
      if ((reference.mediaType || 'image') !== binding.type) throw new Error(`${binding.label} accepts ${binding.type} media only.`)
      const entries = media[binding.key] ||= []
      if (!binding.multiple && entries.length || binding.maximum !== undefined && entries.length >= binding.maximum) throw new Error(`${binding.label} exceeds its declared media capacity across connected sources.`)
      const bound = { ...reference,
        slot: binding.role === 'start-frame' ? 'start' as const : binding.role === 'end-frame' ? 'end' as const : reference.slot,
        authority: binding.role === 'reference-video' ? 'motion-camera' as const : binding.role === 'reference-audio' ? 'audio-timing' as const : reference.authority,
      }
      slots.push({binding,index:entries.length,reference:bound})
      if (binding.role === 'source-video' && state.endpointId.endsWith('/video-extend')) {
        request.inputRole = 'source-video'; request.inputTag = bound.tag; request.inputName = bound.name
      }
      entries.push({ ...(reference.path ? {path:reference.path} : {url:reference.url!}), mediaType:binding.type })
      request.references!.push(bound)
    }
  }
  // Provider field order and per-field graph order agree with the input planner and the written map.
  slots.sort((left,right) => bindings.findIndex(binding => binding.key === left.binding.key) - bindings.findIndex(binding => binding.key === right.binding.key) || left.index - right.index)
  request.references = slots.map(slot => slot.reference)
  request.higgsfieldNative = {endpointId:state.endpointId,contractRevision:state.contractRevision,...(state.fingerprint!==undefined?{fingerprint:state.fingerprint}:{}),values:{...state.values},media:Object.fromEntries(bindings.filter(binding => Object.hasOwn(media,binding.key)).map(binding => [binding.key,media[binding.key]]))}
  if (upstream.offlineSemanticSources.length) throw new Error(upstream.offlineSemanticSources.map(source => `relink ${source.title} (Media Offline)`).join('; '))
  if (!manual) assertStoryboardPhysicalCast(request.storyboardShots || [])
  let finalPrompt: string
  if (manual) finalPrompt = userPromptWithCadence(local ?? '', node.data.motionCadenceMode, request.motionCadence)
  else {
    const compiled = compileHiggsfieldSeedancePrompt(request, slots, higgsfieldPromptFamily(state.endpointId))
    if (compiled.promptBudgetDiagnostic?.blocking) throw new Error(compiled.promptBudgetDiagnostic.blockingReason)
    finalPrompt = compiled.text
  }
  request.prompt = finalPrompt; request.providerPromptOverride = finalPrompt; request.providerPromptOwnership = manual ? 'authored' : 'compiled'
  if (finalPrompt !== '') request.higgsfieldNative.values.prompt = finalPrompt
  else delete request.higgsfieldNative.values.prompt // Optional empty prompt is omitted; required prompts fail their native schema.
  const timing = higgsfieldStoryboardTimingFailures(request)
  if (timing.length && !previewOnly) throw new Error(timing.join(' '))
  if (!upstream.offlineSemanticSources.length) planHiggsfieldNativeInput(request.higgsfieldNative)
  return request
}

function buildHiggsfieldGraphRequest(node: StudioNode, nodes: StudioNode[], edges: Edge[], previewOnly = false): GenerationRequest {
  edges = directStoryboardStyles(nodes, edges)
  const state = node.data.higgsfieldNative!
  if (node.data.kind !== 'video-generator' || node.data.falNative) throw new Error('Choose one Higgsfield video binding.')
  const model = higgsfieldModel(state.endpointId)
  if(model.kind!=='genjutsu')return buildHiggsfieldSeedanceGraphRequest(node,nodes,edges,previewOnly)
  const references: NonNullable<GenerationRequest['references']> = []
  const offline: NonNullable<GenerationRequest['offlineSemanticSources']> = []
  const videos: HiggsfieldMediaSource[] = [], images: HiggsfieldMediaSource[] = []
  // Each graph edge owns its position. Upload deduplication never removes reference slots.
  for (const edge of edges.filter(edge => edge.target === node.id && edge.targetHandle !== 'text-in')) {
    const field = resolveWorkflowInput(node.id, nodes, edges.filter(candidate => candidate.target !== node.id || candidate.id === edge.id), new Set(), previewOnly)
    offline.push(...field.offlineSemanticSources)
    const selected = [...field.references]
    if ((field.inputPath || field.inputUrl) && !selected.some(reference => field.inputPath ? reference.path === field.inputPath : reference.url === field.inputUrl)) selected.unshift({ role: 'reference', path: field.inputPath, url: field.inputUrl, mediaType: edge.targetHandle === 'video-in' ? 'video' : 'image' })
    if (!selected.length && !field.offlineSemanticSources.length) throw new Error('A connected Higgsfield source has no available media. Preserve it and relink the source.')
    const type = edge.targetHandle === 'video-in' ? 'video' : 'image'
    for (const reference of selected) {
      if (!reference.path && !reference.url || (reference.mediaType || 'image') !== type || reference.path?.toLowerCase().endsWith('.prismstyle')) throw new Error(`Genjutsu needs physical ${type} media in this socket.`)
      references.push(reference)
      ;(type === 'video' ? videos : images).push({ ...(reference.path ? { path: reference.path } : { url: reference.url! }), mediaType: type })
    }
  }
  const byId = new Map(nodes.map(source => [source.id, source]))
  const textFrom = (sourceId: string, ancestors = new Set<string>()): string[] => {
    if (ancestors.has(sourceId)) throw new Error('The connected prompt has a cyclic route.')
    const source = byId.get(sourceId)
    if (!source) throw new Error('The connected prompt source is unavailable.')
    if (source.data.kind === 'prompt' || source.data.kind === 'assistant') return [source.data.assistantOutput ?? source.data.prompt ?? '']
    if (source.data.kind === 'router') {
      const path = new Set(ancestors); path.add(sourceId)
      return edges.filter(edge => edge.target === sourceId).flatMap(edge => textFrom(edge.source, path))
    }
    throw new Error('Genjutsu needs an authored Prompt or typed text Router in its prompt socket.')
  }
  const connectedText = edges.filter(edge => edge.target === node.id && edge.targetHandle === 'text-in').flatMap(edge => textFrom(edge.source))
  const local = node.data.promptMode === 'manual' ? node.data.manualPromptDraft ?? node.data.prompt ?? '' : node.data.prompt ?? ''
  const prompt = [local, ...connectedText].filter((value): value is string => value !== undefined && value !== '').join('\n\n')
  const request: GenerationRequest = { ...(previewOnly ? { promptPreviewOnly: true as const } : {}), nodeId: node.id, kind: node.data.kind, videoEngine: state.endpointId, prompt, authoredPrompt: prompt, providerPromptOverride: prompt, references, offlineSemanticSources: offline,
    higgsfieldNative: { endpointId: state.endpointId, contractRevision: state.contractRevision, values: { ...state.values, prompt }, media: { video_url: videos, image_urls: images }, allowSourceTrimming: state.allowSourceTrimming } }
  // Provider contract owns aggregate capacity across all sockets and expanded List/Router media.
  if (!offline.length) planHiggsfieldInput(request.higgsfieldNative!)
  if (images.length > model.maxImages) throw new Error(`Genjutsu accepts at most ${model.maxImages} images across all reference sockets.`)
  return request
}

export function buildGenerationRequest(node: StudioNode, nodes: StudioNode[], edges: Edge[]): GenerationRequest {
  return buildGenerationRequestWithPreview(node, nodes, edges, false)
}

/** Same live compiler, preserving authored timing. A preview cannot be submitted. */
export function buildGenerationPromptPreviewRequest(node: StudioNode, nodes: StudioNode[], edges: Edge[]): GenerationRequest {
  if (node.data.kind !== 'video-generator') throw new Error('Video prompt preview needs a Video Generator.')
  return { ...buildGenerationRequestWithPreview(node, nodes, edges, true), promptPreviewOnly: true }
}

function buildGenerationRequestWithPreview(node: StudioNode, nodes: StudioNode[], edges: Edge[], previewOnly: boolean): GenerationRequest {
  if (node.data.draftCompletionPath) return videoDraftCompletionRequest(node.id, node.data)
  edges = directStoryboardStyles(nodes, edges)
  if (!node.data.falNative && !node.data.higgsfieldNative && node.data.kind === 'video-generator' && !findVideoModel(node.data.videoEngine)) {
    throw new Error(`Choose a supported video model; the saved selection “${node.data.videoEngine}” is unavailable.`)
  }
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
      if (target.data.kind === 'router' && target.data.routeSignal && target.data.routeSignal !== 'mixed') {
        const sourceSignal = outputSignalFor(source.data, edge.sourceHandle)
        if (sourceSignal !== target.data.routeSignal) throw new Error(`Router ${target.data.title || target.id} has a saved ${target.data.routeSignal} route incompatible with its ${sourceSignal} input. Refresh the connected route before generating.`)
      }
      const compatibilityError = nodeConnectionError(source.id, target.id, source.data, target.data, edge.sourceHandle, edge.targetHandle)
      if (compatibilityError) throw new Error(compatibilityError)
      validateUpstream(source.id)
    }
  }
  validateUpstream(node.id)
  if (node.data.higgsfieldNative) return buildHiggsfieldGraphRequest(node, nodes, edges, previewOnly)
  if (node.data.falNative) return buildFalNativeGraphRequest(node, nodes, edges, previewOnly)
  const storyboardConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'storyboard-in')
  const promptMode = node.data.kind === 'video-generator' ? activeVideoPromptMode(node.data, storyboardConnected) : 'manual'
  if (node.data.kind === 'video-generator' && promptMode === 'manual' && !(node.data.manualPromptDraft ?? node.data.prompt ?? '').trim()) throw new Error('Write a User prompt before running.')
  const upstream = resolveWorkflowInput(node.id, nodes, edges, promptMode === 'manual' ? new Set(['storyboard-in']) : new Set(), previewOnly)
  if (node.data.kind === 'video-generator' && promptMode === 'manual') {
    for (const storyboardEdge of edges.filter((edge) => edge.target === node.id && edge.targetHandle === 'storyboard-in')) {
      const nested = resolveWorkflowInput(storyboardEdge.source, nodes, edges, new Set(), previewOnly)
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
  const motionCadence = node.data.kind === 'video-generator' && node.data.motionCadenceMode !== 'native' ? normalizedMotionCadence(videoModel, node.data.frameRate, node.data.motionCadence) : undefined
  const cadenceInstruction = motionCadence
    ? `MOTION CADENCE: ${visualMotionCadenceInstruction(motionCadence)}`
    : undefined
  const compiledStoryboard = compiledStoryboardPrompt(upstream.storyboardPreamble, upstream.storyboardShots, videoModel.family)
  const upstreamPrompt = withoutStyleBlocks(withoutPromptBlock(upstream.prompt, upstream.storyboardRawPrompt), upstream.stylePrompt)
  const activeLocalPrompt = node.data.kind === 'video-generator'
    ? promptMode === 'manual' ? node.data.manualPromptDraft ?? node.data.prompt : undefined
    : semanticAssetKind ? node.data.assetGenerationPrompt ?? node.data.prompt
    : node.data.prompt
  const prompt = (preservesSpeech(node.data) ? joinSpeech : joinPrompt)(activeLocalPrompt, compiledStoryboard, upstreamPrompt, cadenceInstruction)
  const authoredPrompt = joinPrompt(activeLocalPrompt, upstream.authoredPrompt)
  const storyboardDuration = upstream.storyboardDuration

  const multiPrompt = videoModel.family === 'kling' && upstream.storyboardShots?.length
    ? buildKlingNativeMultiPrompt(upstream.storyboardShots, cadenceInstruction)
    : undefined

  const resolvedConnectionRules = upstream.connectionRules.map((rule) => resolveAutoConnectedInputRule(rule, authoredPrompt))
  const exactArtworkTags = new Set(resolvedConnectionRules
    .filter((rule) => rule.rule.startsWith('LOCK RULE') || rule.rule.startsWith('AUTO → PRESERVE RULE'))
    .map((rule) => rule.tag))
  const request: GenerationRequest = { ...(previewOnly ? { promptPreviewOnly: true as const } : {}),
    videoDraft: node.data.videoDraft,
    nodeId: node.id,
    kind: semanticAssetKind ? 'image-generator' : node.data.kind,
    semanticAssetCreation: semanticAssetKind ? { kind: semanticAssetKind, tag: workflowTag(node.data, semanticAssetKind) } : undefined,
    prompt: preservesSpeech(node.data) && !compiledStoryboard?.trim() && !upstreamPrompt?.trim() ? activeLocalPrompt : prompt,
    providerPromptOwnership: node.data.kind === 'video-generator' && node.data.promptMode === 'manual' && node.data.manualPromptSeeded ? 'authored' : undefined,
    providerPromptOverride: node.data.kind === 'video-generator' && node.data.promptMode === 'manual' && node.data.manualPromptSeeded ? userPromptWithCadence(activeLocalPrompt ?? '', node.data.motionCadenceMode, motionCadence) : undefined,
    authoredPrompt,
    stylePrompt: upstream.stylePrompt,
    builtInStylePrompts: upstream.builtInStylePrompts,
    multiPrompt,
    storyboardContext: withoutStyleBlocks(upstream.storyboardContext, upstream.stylePrompt),
    storyboardShotCount: videoModel.family === 'kling' && upstream.storyboardShots?.length ? groupStoryboardSequence(upstream.storyboardShots).shots.length : upstream.storyboardShots?.length,
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
    voiceModelId: node.data.voiceModelId,
    elevenSpeechMode: node.data.elevenSpeechMode,
    elevenDialogueTurns: node.data.elevenDialogueTurns,
    audioProvider: node.data.audioProvider,
    voiceStyle: node.data.voiceStyle,
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
    languageCode: node.data.voiceEngine === 'fish-audio' ? undefined : node.data.voiceEngine === 'elevenlabs-direct' ? directElevenLanguage(node.data.languageCode) : normalizedElevenV3LanguageCode(node.data.languageCode) || 'eng',
    textNormalization: node.data.textNormalization,
    audioOutputFormat: node.data.audioOutputFormat,
    previousText: node.data.previousText,
    nextText: node.data.nextText,
    voiceSeed: node.data.voiceSeed,
    voiceTimestamps: node.data.voiceTimestamps,
    promptInfluence: node.data.promptInfluence,
    references: upstream.references.map((reference) => reference.mediaReferenceMode ? { ...reference, fidelity: undefined } : exactArtworkTags.has(reference.tag || '') ? { ...reference, fidelity: 'lock' as const } : reference),
    offlineSemanticSources: upstream.offlineSemanticSources,
  }
  if (isElevenDialogue(request)) request.prompt = dialoguePromptText(request.elevenDialogueTurns)
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
      const inputFidelity = target && ['image-generator', 'video-generator'].includes(target.data.kind) ? 'auto' : ((edge.data as { inputFidelity?: InputFidelity } | undefined)?.inputFidelity || 'auto')
      const rule = connectedInputRule(source.data, target.data, edge.targetHandle, inputFidelity)
      if (rule.tag && source.data.kind !== 'prompt' && source.data.kind !== 'sticky-note') {
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
