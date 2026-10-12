import { BytePlusPortraitDialog } from './BytePlusPortraitDialog'
import { mediaReferenceConnectionType } from '../../shared/mediaReferenceModes'
import { videoDraftModelTransition } from '../../shared/videoDraft'
import { supportsFalSeedanceDraft } from '../../shared/videoDraft'
import { directStoryboardStyles, detachStoryboardStyleNodes } from '../../shared/storyboardStyleRouting'
import { PromptRewriteScope } from './promptRewriteScope'
import { sharedPromptContext, sharedPromptRewriteInstruction, validateSharedPromptRewrite } from '../../shared/promptConnectedContext'
import { SUBSCRIPTION_PROVIDERS, type PromptConnectionView, type PromptBillingMode } from '../../shared/promptConnection'
import { createStoryboardPanel } from '../../shared/storyboardPanels'
import { ProviderAvailabilityContext } from './ProviderAvailabilityContext'
import { higgsfieldJobReadinessFailures, type HiggsfieldJobsView, type HiggsfieldJobCommand } from '../../shared/higgsfieldJobs'
import { selectHiggsfieldBinding, preserveHiggsfieldSelection, higgsfieldPresetReadinessFailures, higgsfieldInputReadinessFailures, reconcileHiggsfieldNodeBinding, resetHiggsfieldBinding } from '../../shared/higgsfieldNodeBinding'
import type { HiggsfieldPreset } from '../../shared/higgsfieldNative'
import { isHiggsfieldRemoteUncertainty, higgsfieldModel, higgsfieldPromptFamily, higgsfieldSourceOwnsTimeline } from '../../shared/higgsfieldNative'
import type { HiggsfieldContractView } from '../../shared/higgsfieldInputContract'
import { HiggsfieldContractStore } from './higgsfieldContractStore'
import { workflowSaveOwner } from '../../shared/workflowSaveOwnership'
import { createWorkflowSaveCoordinator, type WorkflowSaveSnapshot } from './workflowSaveCoordinator'
import { loadProjectActivationState } from './projectActivationState'
import { FISH_DEFAULT_MODEL, fishAvailabilityError, fishSampleRateOptions, fishBitrateOptions } from '../../shared/fishAudio'
import { isElevenDialogue } from '../../shared/elevenDialogue'
import { generationCallCount, generationResultMedia, nativeVideoQuantityAvailable, runNativeVideoBatch } from '../../shared/generationResultMedia'
import { FalContractStore } from './falContractStore'
import { reconcileFalNodeBinding, preserveFalNativeSelection, type FalNativeNodeState } from '../../shared/falNodeBinding'
import { falNativeFlowForKind } from '../../shared/falNativeExecution'
import { falProductionFlow } from '../../shared/falModelFlow'
import type { FalSchemaContract } from '../../shared/falSchemaBinding'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,

  MiniMap,
  ReactFlow,
  SelectionMode,
  ViewportPortal,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  useViewport,
  type Connection,
  type Edge,
  type NodeChange,
  type OnConnectEnd,
  type OnConnectStart,
  type Viewport,
  type XYPosition,
} from '@xyflow/react'
import {
  ArrowLeft,
  ArrowUpRight,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  Clapperboard,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  Copy,
  Crosshair,
  GripVertical,
  Ellipsis,
  FolderOpen,
  Frame,
  Group,
  GalleryHorizontalEnd,
  Hand,
  Heart,
  Image as ImageIcon,
  Images,
  KeyRound,
  LogIn,
  LogOut,
  ListPlus,
  Lock,
  Magnet,

  MessageSquareText,

  MousePointer2,
  Mountain,
  Link2,
  Mic2,
  Music2,
  AudioLines,
  PanelLeftClose,
  Palette,
  PencilLine,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Route,
  Search,
  Shirt,
  Scissors,
  Settings,
  Sparkles,
  Trash2,
  Unlink,
  Undo2,
  Ungroup,
  Upload,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import type {
  GenerationRequest,
  HistoryEntry,
  CanvasPage,
  WorkspaceCanvas,
  NodeKind,
  StudioNode,
  StudioNodeData,
  WorkflowDocument,
  ImportedAsset,
  BytePlusPortraitContext,
  BytePlusPortraitLinkRequest,
  AssetRelinkResult,
  AssetRelinkMode,
  ProjectWorkspace,
  ServiceProvider,
  StoryboardPanel,
  ServiceModelAvailability,
  ServiceAccountStatus,
  ServiceProfileRegistry,
  GenerationCostEstimate,
  CharacterView,
  ElementView,
} from '../../shared/types'
import type { AssetBatchInspection, AssetBatchKind } from '../../shared/assetBatch'
import { HiggsfieldRecoveryControls, HiggsfieldFields, videoModelGroups, type HiggsfieldPresetView, FalNativeFields, liveFalModelGroups, CompanyIcon, GeneratorInputIcon, generatorInputLabel, GroupedMenuSelect, hasMaterializedAsset, IMAGE_RATIOS, modelCompanyFor, NANO_IMAGE_RATIOS, NodeCard, NodeRuntimeContext, normalizedImageRatio, normalizedVideoDuration, PlayTooltip, RerunIcon, SimpleMenuSelect, StopIcon, videoDurationOptions, videoDurationMenuOptions, VIDEO_MODEL_MENU_GROUPS, VoiceModelSelect, SoundModelSelect, DirectElevenVoiceSelect, DirectElevenLanguageSelect, directAudioFormatLabel } from './NodeCardNext'
import { PortRouteContext } from './NodePort'
import { ProviderPromptPreview } from './ProviderPromptPreview'
import { TaggedPromptTextarea } from './TaggedPromptTextarea'
import { ShutterSettings } from './ShutterSettings'
import { DrawingNode, FrameNode, ListNode, RouterNode, StoryboardAssetNode, StoryboardNode } from './UtilityNodes'
import { generationActionState, useGenerationTimeLeft } from './runPresentation'
import { estimatedGenerationSeconds } from './runPresentation'
import { generationTimingKey, learnedGenerationSeconds } from '../../shared/generationTiming'
import { defaultVideoRatio, knownOutputFrameRate, motionCadenceOptions, normalizedMotionCadence, referenceCapableVideoEngine, resolvedVideoRatio, resolveVideoModel, VIDEO_MODELS } from '../../shared/videoModels'
import { generationServiceProvider } from '../../shared/generationServiceProvider'
import { modelDisplayName } from '../../shared/modelNames'
import type { AssistantProvider } from '../../shared/assistantModels'
import { ASSISTANT_PROVIDER_GROUPS, assistantCatalogsWithSavedSelection, resolveAssistantSelection, type AssistantCatalogs } from '../../shared/assistantProviderSelection'
import { CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM, canvasPanButtons, EDGE_ACTION_HOVER_DELAY_MS, isMiddleMouseButton, isMiddleMousePressed, isTextEntryTarget, optionWheelZoomViewport, shouldEndMiddleMousePan, shouldZoomCanvasFromWheel, type CanvasInteractionTool } from '../../shared/canvasInteractions'
import { nativeTextHistoryAction } from '../../shared/textEditorSelection'
import { canvasKeyboardAction } from '../../shared/keyboard'
import { canvasHistoryEdges, recordCanvasHistorySnapshot, switchCanvasHistoryOwner, sanitizeCanvasHistoryNodes, type CanvasHistoryState } from '../../shared/canvasHistoryRuntime'
import { cancelNodeProgressExpiry, nodeLifecycleTransition, nodeNotificationCategory, scheduleNodeProgressExpiry, type NodeProgressExpiryTimers } from '../../shared/nodeNotificationCategory'
import { appShortcutsSuppressed } from '../../shared/selectorSearch'
import { connectedStoryboardVideo as resolveConnectedStoryboardVideo } from '../../shared/storyboardVideoSync'
import { STYLE_PRESETS } from '../../shared/stylePresets'
import { previewFocalPosition } from '../../shared/previewFocus'
import { CHARACTER_COMPLETION_VIEWS, characterCompletionPrompt, singleCharacterSheetPrompt } from '../../shared/characterViews'
import { compileCharacterSheet } from './characterSheet'
import { buildGenerationPromptPreviewRequest, buildGenerationRequest, inspectGenerationRequest, recursiveUpstreamSemanticTags, resolveWorkflowInput } from '../../shared/workflowResolver'
import { visibleProviderPromptBody } from '../../shared/referenceInstructions'
import { formatRequirementList, generationRequirementFailures } from '../../shared/generationReadiness'
import { nodeCreationDefaults } from '../../shared/nodeDefaults'
import { applyResolvedAssetRequest, semanticModelCapability } from '../../shared/resolvedAssetRequest'
import { migrateSemanticAssetLifecycleMetadata, semanticAssetGenerationPatch, semanticAssetGenerationStartedPatch, semanticAssetGenerationStoppedPatch } from '../../shared/semanticAssetLifecycleMigration'
import { reusableSaveMustCopyReference } from '../../shared/reusableEditorDraft'
import { ELEVEN_V3_LANGUAGES, normalizedElevenV3LanguageCode } from '../../shared/voiceLanguages'
import { magneticNodePosition, placeEqualGapLabels, type MagneticGuide } from '../../shared/magneticGuides'
import { ELEVEN_AUDIO_OUTPUT_FORMATS, ELEVEN_TEXT_NORMALIZATION_OPTIONS, ELEVEN_V3_BUILT_IN_VOICES, FISH_AUDIO_FORMATS, FISH_LATENCY_OPTIONS } from '../../shared/providerOptions'
import { compatibleNodeSources, compatibleNodeTargets, compatibleSourceHandle, compatibleTargetHandle, connectionCompatibilityError, inputCardinalityError, nodeConnectionError, outputCardinalityError, outputSignalFor, pruneSurplusInputEdges, recommendedVideoEngineForSource, reconcileDynamicInputEdges, sourceConnectionDataForInput } from '../../shared/nodeConnections'
import { connectedInputRule, workflowTag } from '../../shared/inputRules'
import type { InputFidelity } from '../../shared/inputRules'
import { nodeInputPorts } from '../../shared/nodePorts'
import { promptTagTokens, sourcePromptTags, uniquePromptTags } from '../../shared/promptTags'
import { migrateUnifiedStoryboards } from '../../shared/storyboardMigration'
import { applyStoryboardBatchResponse, applyStoryboardRewrites, buildStoryboardConnectedContextManifest, parseStoryboardBatchResponse, storyboardBatchRewriteInstruction, storyboardRewriteInstruction, storyboardRewriteTargets, validateStoryboardRewrite } from '../../shared/storyboardRewrite'
import { applySuccessfulStoryboardRevamps, migrateStoryboardPromptVersions, selectedStoryboardPrompt } from '../../shared/storyboardPromptVersions'
import { applyGeneratorLocalDurationPatch } from '../../shared/storyboardDurationMutation'
import { providerDisplayName } from '../../shared/providerErrors'
import { audioGenerationLabel, directElevenAvailabilityError, elevenSupportsSpeed, ELEVEN_DIRECT_OUTPUT_FORMATS, isDirectElevenAudio } from '../../shared/elevenLabsAudio'
import { bytePlusActivationMessage } from '../../shared/byteplusAvailability'
import { mergeLiveGeneratedResults, recoverInterruptedGenerationNodes } from '../../shared/workflowRunRecovery'
import { effectiveFalImageModel, FAL_REFERENCE_IMAGE_MODELS, generationMediaInputCount, semanticImageRequestControls } from '../../shared/imageModels'
import { NODE_PALETTE as palette, ORDERED_NODE_PALETTE, POPULAR_NODE_KINDS } from './nodePalette'
import { APP_ICONS, ASSET_TYPE_ICONS } from './iconSystem'
import { importedAssetDestination, semanticKindForCategory, shouldRerouteSemanticAsset } from '../../shared/assetClassification'
import { commitGraphToOrigin, duplicateNodeSnapshot, generatedMediaDeletionPatch, generationEstimateFingerprint, isRunnableNodeKind, normalizedDiscreteDuration, reusableSelectorSourceNodes, runAfterSuccessfulFlush, sequenceCompletionPatch, styleAssetPreviewUrl, type GraphOrigin } from './rendererBehavior'
import { applyLogicalAssetRenameToNode, assetDisplayName, isReusableAsset, mediaRenameStem, normalizeLogicalAssetName } from '../../shared/assetNaming'
import { activeGeneratedResult, generatedResultName } from '../../shared/generatedMedia'
import { pruneAssetDeployments } from '../../shared/assetDeployment'
import { characterAssetsForMode, filterAssetsByFinalOrigin, groupSemanticAssets, hydrateSemanticAssetViews, semanticAssetCollectionKey, withoutPromotedSourceDuplicates, type SemanticAssetCollection } from '../../shared/semanticAssetCollections'
import { alignedNodePositions, centeredNodePosition, duplicateNodePosition, nodeLayoutSize, normalizeStandardNodeWidths, STANDARD_NODE_WIDTH, type NodeAlignment } from '../../shared/canvasLayout'
import { expandGroupedPositionChanges, remapCopiedNodeGroups, toggleNodeGroup } from '../../shared/canvasGrouping'
import { assignElementView, ELEMENT_ANCHOR_VIEW, ELEMENT_VIEWS, elementCompletionPrompt, elementViewAssets, missingElementViews } from '../../shared/elementViews'
import { generatorBatchType, isBatchGenerator, listItemsSignature, synchronizeListBatchItems } from '../../shared/listBatch'
import { incompleteSemanticReason, notReadyEdgePresentation, semanticWarning, upstreamIncompleteSemanticReasons, upstreamSemanticWarnings } from '../../shared/semanticReadiness'
import { assetReferenceDescription, localAssetGenerationPrompt, mediaAssetDescriptionPatch, reusableAssetHydrationPatch } from '../../shared/semanticAssetPromptBoundary'
import { assetDescriptionPlaceholderForNode, assetDescriptionKnownTags, automaticAssetDescriptionPatch, mediaDescriptionConnectedToGenerator, resolvedAssetReferenceDescription, assetDescriptionRevampContext, assetDescriptionRevampInstruction, validateAssetDescriptionRevamp } from '../../shared/assetReferenceDescriptions'
import { projectSemanticAssetNodes, semanticAssetAvailability, semanticEdgePresentation } from '../../shared/semanticAssetAvailability'
import { minimapCornerRadiusForZoom, responsiveMinimapSize, roundedMinimapMaskPath } from '../../shared/minimapGeometry'
import { continuityVideoEngine, extractFinalVideoFrame, orderedSequenceNodes } from './sequenceContinuity'
import { nextAutosaveDelay } from '../../shared/autosave'
import { createSavePresentationLifecycle, type WorkflowSavePresentationState } from '../../shared/footerSaveLifecycle'
import { CanvasManualSaveControl } from './SaveToolbarControl'
import { CanvasNavigationControls } from './CanvasNavigationControls'
import { applyOrderedAssetSelection, canvasMediaDragMime, isPlaceholderMediaDropAllowed, librarySelectAllKeys, managedAssetDeletionSelection, mediaFamily, mediaFamilyForFile, selectionDismissalIntent, shouldRequestSelectedAssetDelete, type AssetMediaFamily } from '../../shared/assetInteraction'
import { MediaOfflineState, type MediaOfflineVisualState } from './MediaOfflineState'
import { ProjectLibraryCard } from './ProjectLibraryCard'

import { projectServiceProfileSelection } from '../../shared/serviceProfiles'
import { recoverCharacterSemanticConnectionAtEnd } from './characterSemanticConnectEnd'
import { activeVideoPromptMode, migrateVideoUserSeed, resetManualPrompt as resetManualPromptState, switchVideoPromptMode, videoPromptCompileFingerprint, videoPromptInputsConnected, type VideoPromptMode } from '../../shared/videoPromptMode'
import { startStartupHydration } from './startupHydration'
import { startServiceAvailabilityRefresh } from './serviceAvailabilityRefresh'
import { createServiceResponseScope } from './serviceResponseScope'
import { createProviderProfileReadiness } from './providerProfileReadiness'

const EQUAL_GAP_ARROW_EDGE_GAP_PX = 2
const EQUAL_GAP_ARROW_SIZE_PX = 4
const CANVAS_ASSET_DRAG_MIME = 'application/x-prism-foundry-canvas-asset'

type CanvasAssetDragPayload =
  | { kind: 'semantic'; key: string }
  | { kind: 'media'; assetId: string; mediaFamily: AssetMediaFamily }
  | { kind: 'built-in-style'; presetId: string }
  | { kind: 'style-asset'; assetId: string }
  | { kind: 'project-node'; nodeId: string; pageId: string }

function createCanvasAssetDragPreview(source: HTMLElement, label: string, subtitle: string) {
  const preview = document.createElement('div')
  preview.className = 'canvas-asset-drag-preview'
  const sourceThumb = source.querySelector<HTMLElement>('.canvas-asset-thumb')
  if (sourceThumb) {
    const thumb = sourceThumb.cloneNode(true) as HTMLElement
    thumb.removeAttribute('title')
    thumb.removeAttribute('disabled')
    thumb.removeAttribute('draggable')
    preview.appendChild(thumb)
  }
  const copy = document.createElement('span')
  copy.className = 'canvas-asset-drag-copy'
  const name = document.createElement('strong')
  name.textContent = label
  name.title = label
  const detail = document.createElement('small')
  detail.textContent = subtitle
  detail.title = subtitle
  copy.append(name, detail)
  preview.appendChild(copy)
  document.body.appendChild(preview)
  return preview
}

function beginCanvasAssetDrag(event: ReactDragEvent<HTMLElement>, payload: CanvasAssetDragPayload, label: string, subtitle: string) {
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData(CANVAS_ASSET_DRAG_MIME, JSON.stringify(payload))
  if (payload.kind === 'media') event.dataTransfer.setData(canvasMediaDragMime(payload.mediaFamily), JSON.stringify(payload))
  event.dataTransfer.setData('text/plain', label)
  const preview = createCanvasAssetDragPreview(event.currentTarget, label, subtitle)
  event.dataTransfer.setDragImage(preview, 28, 36)
  window.setTimeout(() => preview.remove(), 0)
}

const nodeTypes = {
  studio: NodeCard,
  frame: FrameNode,
  drawing: DrawingNode,
  list: ListNode,
  router: RouterNode,
  storyboard: StoryboardNode,
  'storyboard-asset': StoryboardAssetNode,
}

type CanvasTool = CanvasInteractionTool
type CanvasSnapshot = { nodes: StudioNode[]; edges: Edge[]; assetRestore?: { ids: string[]; workflow: WorkflowDocument } }

export function canvasNodeDirtySnapshot(node: StudioNode): StudioNode {
  const { characterEditorOpen: _characterEditorOpen, styleEditorOpen: _styleEditorOpen, semanticEditorOpen: _semanticEditorOpen, ...data } = node.data
  const { selected: _selected, dragging: _dragging, measured: _measured, ...persistentNode } = node
  return sanitizeCanvasHistoryNodes([{ ...persistentNode, data } as StudioNode])[0]
}

const serializeCanvasHistorySnapshot = (nodes: StudioNode[], edges: Edge[]) => JSON.stringify({ nodes: nodes.map(canvasNodeDirtySnapshot), edges: canvasHistoryEdges(edges) })

type ForwardQuickConnectState = {
  direction: 'forward'
  sourceNodeId: string
  sourceHandleId?: string | null
  clientX: number
  clientY: number
  position: XYPosition
  autoPlacement?: boolean
  insertEdge?: Edge
}
type BackwardQuickConnectState = {
  direction: 'backward'
  targetNodeId: string
  targetHandleId: string
  clientX: number
  clientY: number
  position: XYPosition
}
type QuickConnectState = ForwardQuickConnectState | BackwardQuickConnectState
type PortInspectorState = { nodeId: string; handleId: string; label: string; clientX: number; clientY: number }
type EdgeMenuState = { edge: Edge; clientX: number; clientY: number }
type CanvasClipboard = { nodes: StudioNode[]; edges: Edge[] }

// Embedded identity-sheet instruction. The selected provider/model renders this instruction;
// changing the renderer must never replace, weaken, or expose the Character identity rules.
const SOL_XHIGH_CHARACTER_SHEET_PROMPT_V1 = [
  'HARD CHARACTER IDENTITY SHEET RULE.',
  'Treat @front-face as the canonical identity anchor.',
  'Preserve the exact person: facial geometry, apparent age, skin tone, hairline, hair texture, eye shape, nose, mouth, ears, body proportions, wardrobe, accessories, and distinguishing details.',
  'Produce one clean reference-sheet view of the same person only.',
  'Use neutral, consistent studio lighting and a plain unobtrusive background suitable for downstream identity reference.',
  'Do not redesign, beautify, age-shift, change ethnicity, change clothing, add props, add text, add a second person, or combine multiple views in one image.',
].join(' ')

const videoInputSummary = (model: ReturnType<typeof resolveVideoModel>) => {
  if (model.mode === 'first-last') return 'Start Frame + End Frame + optional references'
  if (model.mode === 'image') return ['seedance', 'kling'].includes(model.family)
    ? 'Start Frame + optional End Frame + references'
    : 'Start Frame + references'
  if (model.mode === 'extend') return 'Source Video to extend'
  if (model.mode === 'reference') return model.family === 'seedance'
    ? 'Image, Video, and Audio references'
    : model.family === 'kling'
      ? 'Image and Video elements'
      : 'Image references'
  return model.family === 'kling' ? 'Text + optional reusable elements' : 'Text only'
}
const providerModelDisplayName = (id: string) => VIDEO_MODELS.find((model) => model.id === id)?.label || modelDisplayName(id)
type ContextMenuState =
  | { kind: 'canvas'; clientX: number; clientY: number; position: XYPosition }
  | { kind: 'node'; clientX: number; clientY: number; nodeId: string; nodeIds: string[] }
  | { kind: 'edge'; clientX: number; clientY: number; edge: Edge }
  | { kind: 'asset'; clientX: number; clientY: number; assetId: string }
  | { kind: 'selection'; clientX: number; clientY: number; nodeIds: string[] }
type AppView = 'canvas' | 'space'
type GeneratedMediaViewerState =
  | { kind: 'node'; nodeId: string; index: number }
  | { kind: 'assets'; assetIds: string[]; index: number }
type HomeSection = 'assets' | 'spaces' | 'favorites' | 'trash'
type AssetTypeFilter = 'all' | 'character' | 'element' | 'location' | 'wardrobe' | 'style' | 'storyboard' | 'image' | 'video' | 'audio'
type LauncherSection = 'home' | 'projects' | 'recent'
type AssetIntakeState = {
  nodeId: string
  asset: ImportedAsset
  kind: 'character' | 'element' | 'location' | 'wardrobe'
  name: string
  first: string
  second: string
  characterView?: NonNullable<ImportedAsset['metadata']>['characterView']
}
type SemanticCreateKind = 'character' | 'element' | 'location' | 'wardrobe'
type StarterCreateKind = 'image' | 'video'
type DeleteCategory = 'canvas' | 'page' | 'asset' | 'project'
type DeleteRequest = {
  category: DeleteCategory
  title: string
  message: string
  confirmLabel: string
  action: () => void
}

const staticEdges = (items: Edge[]) => items.map((edge) => edge.animated ? { ...edge, animated: false } : edge)

function mergeAssistantIntoPrompt(node: StudioNode): StudioNode {
  if (node.data.kind !== 'assistant') return node
  return { ...node, type: 'studio', data: { ...node.data, kind: 'prompt', title: 'Prompt', prompt: node.data.assistantOutput || node.data.prompt || '', assistantOutput: undefined, progress: undefined, error: undefined } }
}

function migrateLegacyShotNode(node: StudioNode): StudioNode {
  if ((node.data.kind as string) !== 'shot') return node
  const panels = node.data.storyboardPanels || []
  return {
    ...node,
    type: 'storyboard-asset',
    data: {
      ...node.data,
      kind: 'storyboard-asset',
      title: node.data.title?.trim() || 'Storyboard Asset',
      storyboardPanelCount: undefined,
      storyboardPanels: panels,
    },
  }
}

function normalizeLegacyImageRatio(value?: string): string {
  const ratios: Record<string, string> = {
    square_hd: '1:1', portrait_4_3: '3:4', portrait_16_9: '9:16', landscape_4_3: '4:3', landscape_16_9: '16:9',
  }
  return ratios[value || ''] || value || 'auto'
}

function migrateRetiredProductNode(node: StudioNode): StudioNode {
  if (node.data.kind === 'video-generator' && node.style?.width !== 315) return { ...node, style: { ...node.style, width: 315 } }
  if (node.data.kind === 'storyboard' && (!node.data.title?.trim() || /^(Storyboard|Storyboard Creator)$/.test(node.data.title.trim()))) {
    return { ...node, data: { ...node.data, title: 'Storyboard' } }
  }
  if (node.data.kind === 'image-editor') {
    return {
      ...node,
      type: 'studio',
      style: { ...node.style, width: 360 },
      data: {
        ...node.data,
        kind: 'image-generator',
        title: 'Image Generator',
        aspectRatio: normalizeLegacyImageRatio(node.data.aspectRatio),
        safetyTolerance: node.data.imageModelId?.includes('nano-banana') && node.data.safetyTolerance === 2 ? 4 : node.data.safetyTolerance,
      },
    }
  }
  if (node.data.kind === 'image-generator') {
    const aspectRatio = normalizeLegacyImageRatio(node.data.aspectRatio)
    const inheritedEditorSafety = node.data.aspectRatio !== aspectRatio && node.data.imageModelId?.includes('nano-banana') && node.data.safetyTolerance === 2
    if (aspectRatio !== node.data.aspectRatio || inheritedEditorSafety) return {
      ...node,
      data: { ...node.data, aspectRatio, safetyTolerance: inheritedEditorSafety ? 4 : node.data.safetyTolerance },
    }
  }
  if (node.data.kind === 'music-generator') {
    const hasGeneratedAudio = Boolean(node.data.outputPath || node.data.outputUrl || node.data.generatedResults?.length)
    return {
      ...node,
      type: 'studio',
      style: { ...node.style, width: 315 },
      data: {
        ...node.data,
        kind: hasGeneratedAudio ? 'output' : 'prompt',
        title: hasGeneratedAudio ? node.data.title?.trim() || 'Audio' : 'Prompt',
        outputType: hasGeneratedAudio ? 'audio' : undefined,
      },
    }
  }
  return node
}

function migrateGeneratableAssetNode(node: StudioNode): StudioNode {
  const data = migrateSemanticAssetLifecycleMetadata(node.data, { clearReplacementAuthority: true })
  return data === node.data ? node : { ...node, data }
}

function friendlyProviderError(provider: 'fal' | AssistantProvider, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const name = providerDisplayName(provider)
  const retry = raw.match(/retry in\s+([\d.]+)s/i)?.[1]
  if (/quota exceeded|exceeded your current quota|rate.?limit/i.test(raw)) return `${name} quota reached${retry ? ` · retry in ${Math.ceil(Number(retry))}s` : ''}. Check billing or try another connected service.`
  if (/not permitted|permission|forbidden|403/i.test(raw)) return `${name} access is not permitted for this model. Choose another model or check the API key.`
  if (/unauthorized|invalid.+key|401/i.test(raw)) return `${name} rejected this API key. Reconnect it in Connections.`
  return `${name} could not enhance this prompt. Open Connections for details.`
}

function replaceAssetInNode(node: StudioNode, previousPath: string, asset: ImportedAsset): StudioNode {
  const patch: Partial<StudioNodeData> = {}
  if (node.data.assetPath === previousPath) Object.assign(patch, { assetPath: asset.path, assetUrl: asset.url })
  if (node.data.outputPath === previousPath) Object.assign(patch, { outputPath: asset.path, outputUrl: asset.url })
  if (node.data.generatedResults?.some((item) => item.path === previousPath)) {
    patch.generatedResults = node.data.generatedResults.map((item) => item.path === previousPath ? { ...item, path: asset.path, url: asset.url || item.url, name: mediaRenameStem(asset.name) } : item)
  }
  if (node.data.referenceAssets?.some((item) => item.path === previousPath)) {
    patch.referenceAssets = node.data.referenceAssets.map((item) => item.path === previousPath ? asset : item)
    if (['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(node.data.kind)) {
      const displayName = assetDisplayName(asset)
      patch.title = displayName
      patch.referenceTag = `@${displayName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`
    }
  }
  if (node.data.listItems?.some((item) => item.asset?.path === previousPath)) {
    patch.listItems = node.data.listItems.map((item) => item.asset?.path === previousPath ? { ...item, asset } : item)
  }
  return Object.keys(patch).length ? { ...node, data: { ...node.data, ...patch } } : node
}

function replaceRenamedAssetInNode(node: StudioNode, previousPath: string, asset: ImportedAsset, identityName: string): StudioNode {
  const ownsRenamedAsset = node.data.assetPath === previousPath
    || node.data.outputPath === previousPath
    || node.data.generatedResults?.[node.data.activeResultIndex || 0]?.path === previousPath
  const replaced = replaceAssetInNode(node, previousPath, asset)
  if (!ownsRenamedAsset) return replaced
  if (node.data.generatedResults?.length) return replaced
  return { ...replaced, data: { ...replaced.data, title: identityName, referenceTag: workflowTag({ kind: replaced.data.kind, title: identityName }, 'asset') } }
}

const SERVICE_CATALOG: Array<{ id: ServiceProvider; name: string; company: string; description: string; capabilities: string[]; placeholder: string }> = [
  { id: 'higgsfield', name: 'Higgsfield', company: 'Direct visual generation', description: 'Native Genjutsu source-video transformation with ordered image references and current style presets.', capabilities: ['Video', 'Genjutsu', 'References'], placeholder: 'Paste KEY_ID:KEY_SECRET' },
  { id: 'fal', name: 'fal.ai', company: 'Generative media', description: 'Image, video and audio generation models used by canvas generator nodes.', capabilities: ['Image', 'Video', 'Audio'], placeholder: 'Paste fal.ai API key' },
  { id: 'byteplus', name: 'ByteDance Seedance · BytePlus', company: 'Direct video generation', description: 'Direct Seedance video generation through the international BytePlus ModelArk API.', capabilities: ['Video', 'Seedance', 'Multimodal'], placeholder: 'Paste BytePlus API key' },
  { id: 'omniroute', name: 'OmniRoute', company: 'Local AI gateway', description: 'Local live text-model catalog for Storyboard and prompt enhancement. Provider credentials remain inside OmniRoute.', capabilities: ['Prompt rewrite', 'Live models'], placeholder: '' },
  { id: 'openai', name: 'OpenAI', company: 'Images and intelligence', description: 'GPT Image generation and editing, plus GPT prompt enhancement without routing through fal.ai.', capabilities: ['GPT Image', 'Image edit', 'Prompt enhance'], placeholder: 'Paste OpenAI API key' },
  { id: 'anthropic', name: 'Anthropic Claude', company: 'Assistant intelligence', description: 'Claude models for long-form prompt refinement and connected-context reasoning.', capabilities: ['Prompt rewrite', 'Long context'], placeholder: 'Paste Anthropic API key' },
  { id: 'google', name: 'Google Gemini', company: 'Images and intelligence', description: 'Gemini image generation and editing, plus multimodal prompt enhancement without routing through fal.ai.', capabilities: ['Gemini Image', 'Image edit', 'Multimodal'], placeholder: 'Paste Google AI API key' },
  { id: 'deepseek', name: 'DeepSeek', company: 'Prompt intelligence', description: 'Live DeepSeek API models for prompt enhancement and storyboard rewriting.', capabilities: ['Prompt rewrite', 'Reasoning'], placeholder: 'Paste DeepSeek API key' },
  { id: 'moonshot', name: 'Kimi', company: 'Moonshot AI intelligence', description: 'Live Kimi API models for prompt enhancement and storyboard rewriting.', capabilities: ['Prompt rewrite', 'Long context'], placeholder: 'Paste Moonshot API key' },
  { id: 'elevenlabs', name: 'ElevenLabs', company: 'Direct voice and sound', description: 'Live speech models and voice IDs, plus direct Sound Effects v2 generation.', capabilities: ['Voice', 'Sound effects', 'Live models'], placeholder: 'Paste ElevenLabs API key' },
  { id: 'fish', name: 'Fish Audio', company: 'Voice and speech', description: 'Voice cloning and expressive S1/S2 Pro text-to-speech for Voiceover nodes.', capabilities: ['Voice clone', 'TTS'], placeholder: 'Paste Fish Audio API key' },
]

function ServiceBrandLogo({ provider }: { provider: ServiceProvider }) {
  return <CompanyIcon provider={provider} />
}

const HomeIcon = APP_ICONS.home
const ProjectsIcon = APP_ICONS.projects
const RecentProjectsIcon = APP_ICONS.recentProjects
const ImportProjectIcon = APP_ICONS.importProject
const ProjectDocumentIcon = APP_ICONS.projectDocument
const ProjectFolderIcon = APP_ICONS.project
const CanvasIcon = APP_ICONS.canvas
const AssetLibraryIcon = APP_ICONS.assets

function AssetTypeGlyph({ type, size = 18 }: { type: AssetTypeFilter; size?: number }) {
  const Icon = ASSET_TYPE_ICONS[type]
  return <Icon size={size} />
}

const emptyServiceStatus: Record<ServiceProvider, boolean> = { higgsfield: false, fal: false, byteplus: false, fish: false, omniroute: false, openai: false, anthropic: false, google: false, deepseek: false, moonshot: false, elevenlabs: false }
const emptyServiceDrafts: Record<ServiceProvider, string> = { higgsfield: '', fal: '', byteplus: '', fish: '', omniroute: '', openai: '', anthropic: '', google: '', deepseek: '', moonshot: '', elevenlabs: '' }

const AUDIO_OUTPUT_FORMATS = ELEVEN_AUDIO_OUTPUT_FORMATS

const makeStoryboardPanels = (count: number): StoryboardPanel[] => Array.from({ length: count }, () => createStoryboardPanel(crypto.randomUUID()))

function initialData(kind: NodeKind): StudioNodeData {
  const item = palette.find((entry) => entry.kind === kind)
  const fallback = kind === 'output' ? 'Generated media' : kind.replaceAll('-', ' ')
  const creationDefaults = nodeCreationDefaults(kind)
  return {
    kind,
    title: item?.label || fallback,
    runState: 'idle',
    aspectRatio: kind === 'storyboard' ? '16:9' : creationDefaults.aspectRatio,
    quantity: creationDefaults.quantity,
    scale: 2,
    upscalerModel: kind === 'upscaler' ? 'clarity-image' : undefined,
    creativity: kind === 'upscaler' ? 0.35 : undefined,
    resemblance: kind === 'upscaler' ? 0.6 : undefined,
    videoEngine: kind === 'video-generator' ? 'wan-controlled' : undefined,
    duration: kind === 'video-generator' ? 1 : kind === 'sound-effects' ? 5 : kind === 'music-generator' ? 30 : undefined,
    frameRate: kind === 'video-generator' ? 24 : undefined,
    generateAudio: false,
    outputFormat: 'png',
    imageResolution: kind === 'storyboard' ? '2K' : '1K',
    imageProvider: ['image-generator', 'image-editor', 'character', 'element', 'location', 'wardrobe', 'style-reference'].includes(kind) ? 'fal' : undefined,
    imageModelId: kind === 'image-editor' ? 'fal-ai/flux-pro/kontext' : ['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(kind) ? 'fal-ai/nano-banana-pro/edit' : kind === 'image-generator' ? 'fal-ai/flux/schnell' : undefined,
    characterRole: undefined,
    characterEditorOpen: kind === 'character' ? false : undefined,
    safetyTolerance: kind === 'image-editor' ? 2 : 4,
    enableWebSearch: false,
    inferenceSteps: kind === 'video-generator' ? 40 : kind === 'upscaler' ? 18 : 4,
    guidanceScale: kind === 'image-generator' ? 3.5 : kind === 'video-generator' ? 1 : kind === 'upscaler' ? 4 : undefined,
    acceleration: kind === 'video-generator' ? 'regular' : 'none',
    resolution: kind === 'video-generator' ? '720p' : undefined,
    bitrateMode: 'standard',
    videoQuality: 'high',
    voice: undefined,
    voiceEngine: kind === 'voiceover' ? 'elevenlabs-direct' : undefined,
    audioProvider: kind === 'sound-effects' ? 'elevenlabs' : undefined,
    languageCode: undefined,
    fishModel: kind === 'voiceover' ? FISH_DEFAULT_MODEL : undefined,
    fishTemperature: kind === 'voiceover' ? 0.7 : undefined,
    fishTopP: kind === 'voiceover' ? 0.7 : undefined,
    fishVolume: kind === 'voiceover' ? 0 : undefined,
    fishNormalizeLoudness: kind === 'voiceover' ? true : undefined,
    fishNormalize: kind === 'voiceover' ? true : undefined,
    fishChunkLength: kind === 'voiceover' ? 300 : undefined,
    fishFormat: kind === 'voiceover' ? 'mp3' : undefined,
    fishSampleRate: kind === 'voiceover' ? 44100 : undefined,
    fishMp3Bitrate: kind === 'voiceover' ? 128 : undefined,
    fishOpusBitrate: kind === 'voiceover' ? -1000 : undefined,
    fishLatency: kind === 'voiceover' ? 'normal' : undefined,
    stability: kind === 'voiceover' ? 0.5 : undefined,
    similarityBoost: kind === 'voiceover' ? 0.75 : undefined,
    speed: kind === 'voiceover' ? 1 : undefined,
    voiceTimestamps: kind === 'voiceover' ? true : undefined,
    textNormalization: kind === 'voiceover' ? 'auto' : undefined,
    audioOutputFormat: ['voiceover', 'sound-effects', 'music-generator'].includes(kind) ? 'mp3_44100_128' : undefined,
    promptInfluence: kind === 'sound-effects' ? 0.3 : undefined,
    sticker: kind === 'sticker' ? '✦' : undefined,
    storyboardPanelCount: kind === 'storyboard' || kind === 'storyboard-asset' ? 2 : undefined,
    storyboardPanels: kind === 'storyboard' || kind === 'storyboard-asset' ? makeStoryboardPanels(2) : undefined,
    storyboardEditorOpen: undefined,
    assistantProvider: kind === 'storyboard' ? 'omniroute' : undefined,
    assistantModelId: kind === 'assistant' ? '' : undefined,
  }
}

const RESETTABLE_NODE_SETTING_KEYS = [
  'aspectRatio', 'quantity', 'scale', 'creativity', 'resemblance', 'duration', 'autoDuration',
  'frameRate', 'motionCadence', 'generateAudio', 'loop', 'forceInstrumental', 'negativePrompt',
  'seed', 'outputFormat', 'imageResolution', 'safetyTolerance', 'enableWebSearch', 'autoFix',
  'inferenceSteps', 'guidanceScale', 'acceleration', 'resolution', 'bitrateMode', 'videoQuality',
  'videoWriteMode', 'interpolatorModel', 'numInterpolatedFrames', 'adjustFpsForInterpolation',
  'enablePromptExpansion', 'enableInputSafety', 'enableOutputSafety', 'shift', 'fishTemperature',
  'fishTopP', 'fishVolume', 'fishNormalizeLoudness', 'fishNormalize', 'fishChunkLength', 'fishFormat',
  'fishSampleRate', 'fishMp3Bitrate', 'fishOpusBitrate', 'fishLatency', 'stability',
  'similarityBoost', 'voiceStyle', 'speed', 'languageCode', 'textNormalization', 'audioOutputFormat',
  'previousText', 'nextText', 'voiceSeed', 'voiceTimestamps', 'promptInfluence',
  'directionLayer',
] as const satisfies readonly (keyof StudioNodeData)[]

function resetNodeSettingsPatch(data: StudioNodeData): Partial<StudioNodeData> {
  if (data.higgsfieldNative) return { higgsfieldNative: resetHiggsfieldBinding(data.higgsfieldNative), runState: 'idle', progress: undefined, error: undefined }
  const defaults = initialData(data.kind)
  const patch: Partial<StudioNodeData> = { runState: 'idle', progress: undefined, error: undefined }
  for (const key of RESETTABLE_NODE_SETTING_KEYS) patch[key] = defaults[key] as never
  if (data.kind === 'video-generator') {
    const model = resolveVideoModel(data.videoEngine)
    const frameRate = model.frameRates[0]
    patch.aspectRatio = defaultVideoRatio(model)
    patch.frameRate = frameRate
    patch.duration = videoDurationOptions(model.id, frameRate).find((value): value is number => typeof value === 'number')
    patch.resolution = model.resolutions[0] as StudioNodeData['resolution']
    patch.generateAudio = false
    patch.inferenceSteps = model.family === 'wan' ? 40 : undefined
    patch.guidanceScale = model.family === 'wan' ? 1 : model.family === 'kling' ? 0.5 : undefined
    patch.acceleration = model.family === 'wan' ? 'regular' : undefined
  }
  return patch
}

function freshWorkflow(): WorkflowDocument {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Untitled workflow',
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

function withCollapsedCharacterEditors(nodes: StudioNode[]): StudioNode[] {
  return nodes.map((node) => node.data.kind === 'character' && node.data.characterEditorOpen
    ? { ...node, data: { ...node.data, characterEditorOpen: false } }
    : node)
}

function RoundedCanvasMiniMap() {
  const { zoom } = useViewport()
  const [size, setSize] = useState({ width: 195, height: 114 })

  useEffect(() => {
    const flow = document.querySelector<HTMLElement>('.studio-flow')
    if (!flow) return
    const applySize = () => {
      const next = responsiveMinimapSize(flow.clientWidth, flow.clientHeight)
      setSize((current) => current.width === next.width && current.height === next.height ? current : next)
      flow.style.setProperty('--canvas-minimap-width', `${next.width}px`)
      flow.style.setProperty('--canvas-minimap-height', `${next.height}px`)
    }
    const observer = new ResizeObserver(applySize)
    observer.observe(flow)
    applySize()
    return () => {
      observer.disconnect()
      flow.style.removeProperty('--canvas-minimap-width')
      flow.style.removeProperty('--canvas-minimap-height')
    }
  }, [])

  useEffect(() => {
    const minimap = document.querySelector<HTMLElement>('.prism-rounded-minimap')
    const svg = minimap?.querySelector<SVGSVGElement>('.react-flow__minimap-svg')
    const mask = minimap?.querySelector<SVGPathElement>('.react-flow__minimap-mask')
    if (!svg || !mask) return

    const applyRoundedViewport = () => {
      const currentPath = mask.getAttribute('d')
      if (!currentPath || currentPath.includes('Q')) return
      const renderedWidth = svg.getBoundingClientRect().width || 195
      const cssRadius = minimapCornerRadiusForZoom(zoom)
      const viewBoxRadius = (svg.viewBox.baseVal.width / renderedWidth) * cssRadius
      const roundedPath = roundedMinimapMaskPath(currentPath, viewBoxRadius)
      if (roundedPath !== currentPath) mask.setAttribute('d', roundedPath)
    }

    const observer = new MutationObserver(applyRoundedViewport)
    observer.observe(mask, { attributes: true, attributeFilter: ['d'] })
    applyRoundedViewport()
    return () => observer.disconnect()
  }, [size.height, size.width, zoom])

  return (
    <MiniMap
      className="prism-rounded-minimap"
      position="bottom-right"
      style={{ width: size.width, height: size.height }}
      pannable
      zoomable
      nodeColor="#7464a8"
      maskColor="rgba(9,8,14,.74)"
      maskStrokeColor="#a68cff"
      maskStrokeWidth={0.45}
    />
  )
}

export function App() {
  const [project, setProject] = useState<ProjectWorkspace | null>(null)
  const [recentProjects, setRecentProjects] = useState<ProjectWorkspace[]>([])
  const [launcherSection, setLauncherSection] = useState<LauncherSection>('home')
  const [projectReady, setProjectReady] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [projectNotice, setProjectNotice] = useState('')
  const [connectionNotice, setConnectionNotice] = useState('')
  const [connectionErrorNotice, setConnectionErrorNotice] = useState('')
  const pendingPruneNoticeRef = useRef('')
  const [legacyImport, setLegacyImport] = useState<{ detected: boolean; assets: number; nodes: number }>({ detected: false, assets: 0, nodes: 0 })
  const [workflow, setWorkflow] = useState<WorkflowDocument>(freshWorkflow)
  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const renderedNodes = useMemo(() => nodes.map((node) => {
    const generating = node.data.runState === 'queued' || node.data.runState === 'running'
    const classNames = [node.className, generating ? 'is-generating-node' : ''].filter(Boolean).join(' ')
    return classNames === (node.className || '') ? node : { ...node, className: classNames }
  }), [nodes])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inspectorNodeId, setInspectorNodeId] = useState<string | null>(null)
  const [assetBrowserOpen, setAssetBrowserOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [assets, setAssets] = useState<ImportedAsset[]>([])
  const [missingAssetIds, setMissingAssetIds] = useState<string[]>([])
  const [assetRelinkStates, setAssetRelinkStates] = useState<Record<string, MediaOfflineVisualState>>({})
  const [relinkChoiceAssetId, setRelinkChoiceAssetId] = useState<string | null>(null)
  const [findingDots, setFindingDots] = useState(1)
  const [assetErrorNotice, setAssetErrorNotice] = useState('')
  const semanticGraphNodes = useMemo(() => projectSemanticAssetNodes(nodes, missingAssetIds), [missingAssetIds, nodes])
  const semanticAvailabilityForData = useCallback((data: StudioNodeData) => semanticAssetAvailability(data, missingAssetIds), [missingAssetIds])
  const [renamingAssetId, setRenamingAssetId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [assetMenuId, setAssetMenuId] = useState<string | null>(null)
  const [portraitDialog, setPortraitDialog] = useState<{ asset: ImportedAsset; assets: ImportedAsset[]; context?: BytePlusPortraitContext; loading: boolean; busy: boolean; error: string } | null>(null)
  const portraitDialogRevision = useRef(0)
  const [selectedCanvasAssetKey, setSelectedCanvasAssetKey] = useState<string | null>(null)
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<string[]>([])
  const [assetSelectionAnchor, setAssetSelectionAnchor] = useState<string | null>(null)
  const [assetMediaInfo, setAssetMediaInfo] = useState<Record<string, { aspectRatio?: string; duration?: number }>>({})
  const [generatedMediaViewer, setGeneratedMediaViewer] = useState<GeneratedMediaViewerState | null>(null)
  const [viewerMediaContextMenu, setViewerMediaContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [viewerMediaInfo, setViewerMediaInfo] = useState<{ width?: number; height?: number; duration?: number }>({})
  const [viewerViewport, setViewerViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [viewerRenameDraft, setViewerRenameDraft] = useState<string | null>(null)

  const [hasCredential, setHasCredential] = useState(false)
  const [hasFishCredential, setHasFishCredential] = useState(false)
  const [serviceConnections, setServiceConnections] = useState<Record<ServiceProvider, boolean>>(emptyServiceStatus)
  const mediaProviderAvailable = useCallback((provider: ServiceProvider) => serviceConnections[provider], [serviceConnections])
  const serviceAvailabilityStop = useRef<(() => void) | undefined>(undefined)
  const serviceReadiness = useRef(createProviderProfileReadiness())
  const serviceBusyOperations = useRef({ count: 0 })
  const serviceResponseScope = useRef<ReturnType<typeof createServiceResponseScope> | null>(null)
  if (!serviceResponseScope.current) serviceResponseScope.current = createServiceResponseScope()
  const [serviceModels, setServiceModels] = useState<Partial<Record<ServiceProvider, ServiceModelAvailability>>>({})
  const falContractStore = useRef<FalContractStore | null>(null)
  if (!falContractStore.current) falContractStore.current = new FalContractStore()
  const higgsfieldContractStore = useRef<HiggsfieldContractStore | null>(null)
  if (!higgsfieldContractStore.current) higgsfieldContractStore.current = new HiggsfieldContractStore()
  const higgsfieldContractRevisions = useRef(new Map<string, number>())
  const [higgsfieldContracts, setHiggsfieldContracts] = useState<Record<string, HiggsfieldContractView & { current: () => boolean }>>({})
  const [higgsfieldJobState, setHiggsfieldJobState] = useState<HiggsfieldJobsView & { current?: () => boolean }>({})
  const higgsfieldJobRevision = useRef(0)
  const higgsfieldJobOwner = useRef('')
  const [higgsfieldPresetState, setHiggsfieldPresetState] = useState<HiggsfieldPresetView & { current?: () => boolean }>({})
  const [falContracts, setFalContracts] = useState<Record<string, { contract?: FalSchemaContract; error?: string; loading?: boolean; current: () => boolean }>>({})
  const [promptConnections,setPromptConnections]=useState<Partial<Record<AssistantProvider,PromptConnectionView>>>({})
  const [promptConnectionRevision,setPromptConnectionRevision]=useState(0)
  const promptRefreshRevision=useRef(0)
  const [serviceAccounts, setServiceAccounts] = useState<Partial<Record<ServiceProvider, ServiceAccountStatus>>>({})
  const [serviceProfiles, setServiceProfiles] = useState<ServiceProfileRegistry>({ schemaVersion: 1, profiles: [], defaults: {} })
  const [serviceDrafts, setServiceDrafts] = useState<Record<ServiceProvider, string>>(emptyServiceDrafts)
  const [activeService, setActiveService] = useState<ServiceProvider | null>(null)
  const [signInProfileId, setSignInProfileId] = useState<string | null>(null)
  const [profileConfirmation, setProfileConfirmation] = useState<{ profileId: string; action: 'sign-out' | 'delete' | 'make-default' | 'cancel-default' | 'select-project' | 'cancel-project' } | null>(null)
  const [serviceBusy, setServiceBusy] = useState(false)
  const [connectionWarning, setConnectionWarning] = useState<{ provider: ServiceProvider; providerName: string; modelLabel: string } | null>(null)
  const [serviceError, setServiceError] = useState('')
  const [serviceActionError, setServiceActionError] = useState('')
  const [renamingProfileId, setRenamingProfileId] = useState<string | null>(null)
  const [profileNameDraft, setProfileNameDraft] = useState('')
  const [saveState, setSaveState] = useState<WorkflowSavePresentationState>('saved')
  const saveLifecycle = useRef<ReturnType<typeof createSavePresentationLifecycle> | null>(null)
  if (!saveLifecycle.current) saveLifecycle.current = createSavePresentationLifecycle(setSaveState, window)
  const [compactAlignmentOpen, setCompactAlignmentOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  const [appView, setAppView] = useState<AppView>('canvas')
  const [homeSection, setHomeSection] = useState<HomeSection>('spaces')
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>('all')
  const [assetSearch, setAssetSearch] = useState('')
  const [assetOriginFilter, setAssetOriginFilter] = useState<'all' | 'imported' | 'generated'>('all')
  const [pages, setPages] = useState<CanvasPage[]>([])
  const [activePageId, setActivePageId] = useState('')
  const [canvases, setCanvases] = useState<WorkspaceCanvas[]>([])
  const [activeCanvasId, setActiveCanvasId] = useState('')

  const promptGraphRef=useRef({project:'',canvas:'',page:'',nodes:[] as StudioNode[],edges:[] as Edge[]})
  promptGraphRef.current={project:project?.rootPath || '',canvas:activeCanvasId,page:activePageId,nodes,edges}
  const promptRewriteScope=useRef<PromptRewriteScope | null>(null)
  if(!promptRewriteScope.current)promptRewriteScope.current=new PromptRewriteScope(()=>promptGraphRef.current,id=>window.prism.assistant.cancel(id),()=>crypto.randomUUID())
  useEffect(()=>{promptRewriteScope.current!.invalidate();return()=>{promptRewriteScope.current!.invalidate()}},[project?.rootPath,activeCanvasId,activePageId])
  useEffect(()=>{
    const revision=++promptRefreshRevision.current;let active=true
    for(const {id:provider}of ASSISTANT_PROVIDER_GROUPS)void window.prism.assistant.connection(provider).then(connection=>{
      if(active&&promptRefreshRevision.current===revision)setPromptConnections(previous=>({...previous,[provider]:connection}))
    }).catch(()=>undefined)
    return()=>{active=false}
  },[project?.id,project?.rootPath,serviceProfiles,serviceConnections,promptConnectionRevision,settingsOpen])
  const availablePromptModels=useCallback((provider:AssistantProvider)=>{
    const connection=promptConnections[provider]
    if(!connection)return []
    return connection?.mode==='subscription' ? connection.catalog?.models || [] : serviceConnections[provider] ? serviceModels[provider]?.models || [] : []
  },[promptConnections,serviceConnections,serviceModels])
  const promptProviderAccount=useCallback((provider:ServiceProvider):ServiceAccountStatus | undefined=>{
    const connection=promptConnections[provider as AssistantProvider]
    return connection?.mode==='subscription'?{provider,state:connection.ready?'ready':'unavailable',message:connection.error || connection.label,checkedAt:new Date().toISOString()}:serviceAccounts[provider]
  },[promptConnections,serviceAccounts])
  const configurePromptConnection=useCallback(async(provider:AssistantProvider,mode:PromptBillingMode,signIn=false)=>{
    if(serviceBusy)return;setServiceBusy(true);setServiceError('')
    const cancelled=new Set(promptRewriteScope.current!.invalidate(provider))
    if(cancelled.size)setNodes(current=>current.map(node=>cancelled.has(node.id)?{...node,data:{...node.data,runState:'idle',progress:undefined}}:node))
    const owned=serviceResponseScope.current!.capture(provider)
    try{const connection=await window.prism.assistant.configure(provider,mode,signIn);if(owned()){setPromptConnections(previous=>({...previous,[provider]:connection}));setPromptConnectionRevision(value=>value+1)}}catch(error){if(owned())setServiceError(error instanceof Error?error.message:'Could not change Revamp connection.')}finally{setServiceBusy(false)}
  },[serviceBusy,setNodes])
  const requestPromptRewrite=useCallback(async(nodeId:string,provider:AssistantProvider,text:string,instruction:string,model:string)=>{
    const request=promptRewriteScope.current!.begin(nodeId,provider)
    try{const connection=await window.prism.assistant.connection(provider);request.assertCurrent();if(!connection.ready)throw new Error(connection.error || 'Connect this Revamp provider first.');const output=await window.prism.assistant.rewrite(provider,text,instruction,model,{requestId:request.requestId,connectionLease:connection.lease});request.assertCurrent();return{output,canApply:request.canApply}}catch(error){
      try{request.assertCurrent()}catch(stale){setNodes(current=>!request.canReset()?current:current.map(node=>node.id===nodeId?{...node,data:{...node.data,runState:'idle',progress:undefined}}:node));throw stale}
      throw error
    }finally{request.finish()}
  },[setNodes])

  const refreshServiceAccount = useCallback(async (provider: ServiceProvider, ownsOperation: () => boolean) => {
    if (!ownsOperation()) return
    const acceptsAccount = serviceResponseScope.current!.begin(provider, 'account')
    try {
      const account = await window.prism.services.account(provider)
      if (ownsOperation() && acceptsAccount()) setServiceAccounts((current) => ({ ...current, [provider]: account }))
    } catch { /* Read-only diagnostics must not create an unhandled rejection. */ }
  }, [])

  useEffect(() => () => { serviceResponseScope.current!.invalidate(); serviceAvailabilityStop.current?.() }, [])

  const refreshServiceConnections = useCallback(async (ownsOperation: () => boolean = () => true) => {
    const activation = projectActivation.current
    return serviceReadiness.current.refresh(
      () => projectActivation.current === activation && ownsOperation(),
      () => window.prism.services.list(),
      (connections) => {
        const status = { ...emptyServiceStatus }
        connections.forEach((connection) => { status[connection.id] = connection.connected })
        setServiceConnections(status)
        setHasCredential(status.fal)
        setHasFishCredential(status.fish)
      },
    )
  }, [])

  const beginServiceBusyOperation = useCallback(() => {
    const owner = serviceBusyOperations.current
    owner.count += 1
    setServiceBusy(true)
    let complete = false
    return () => {
      if (complete) return
      complete = true
      owner.count -= 1
      if (serviceBusyOperations.current === owner) setServiceBusy(owner.count > 0)
    }
  }, [])

  const restoreServiceConnectionsAfterFailure = useCallback(async (ownsOperation: () => boolean) => {
    // Keep the original action error if a current read also fails.
    try { await refreshServiceConnections(ownsOperation) } catch { /* Last verified fail-closed readiness remains. */ }
  }, [refreshServiceConnections])

  const beginServiceProfileOperation = useCallback((provider: ServiceProvider) => {
    serviceReadiness.current.invalidate()
    serviceResponseScope.current!.invalidate(provider)
    serviceAvailabilityStop.current?.()
    setServiceConnections((current) => ({ ...current, [provider]: false }))
    if (provider === 'fal') setHasCredential(false)
    if (provider === 'fish') setHasFishCredential(false)
    setServiceModels((current) => ({ ...current, [provider]: undefined }))
    setServiceAccounts((current) => ({ ...current, [provider]: undefined }))
    return serviceResponseScope.current!.capture(provider)
  }, [])

  const applyServiceProfiles = useCallback(async (registry: ServiceProfileRegistry, provider: ServiceProvider, ownsOperation: () => boolean) => {
    if (!ownsOperation()) return false
    setServiceProfiles((current) => ({
      ...current,
      profiles: [...current.profiles.filter((profile) => profile.provider !== provider), ...registry.profiles.filter((profile) => profile.provider === provider)],
      defaults: { ...current.defaults, [provider]: registry.defaults[provider] },
    }))
    return refreshServiceConnections(ownsOperation)
  }, [refreshServiceConnections])

  useEffect(() => {
    if (!Object.values(assetRelinkStates).includes('finding')) return
    const timer = window.setInterval(() => setFindingDots((dots) => dots % 3 + 1), 420)
    return () => window.clearInterval(timer)
  }, [assetRelinkStates])

  useEffect(() => {
    if (!project) return
    let active = true
    const refreshMissing = async () => {
      try {
        const statuses = await window.prism.assets.status()
        if (active) setMissingAssetIds(statuses.filter((status) => status.missing).map((status) => status.asset.id))
      } catch {
        // Keep the last verified status; transient filesystem checks must not erase an offline warning.
      }
    }
    const timer = window.setInterval(() => { void refreshMissing() }, 3000)
    return () => { active = false; window.clearInterval(timer) }
  }, [project])

  useEffect(() => {
    setNodes((current) => {
      let changed = false
      const next = current.map((node) => {
        if (node.data.kind !== 'list' && node.data.kind !== 'router') return node
        const incomingSignals = edges.filter((edge) => edge.target === node.id).flatMap((edge) => {
          const source = current.find((candidate) => candidate.id === edge.source)
          return source ? [outputSignalFor(source.data, edge.sourceHandle)] : []
        })
        const localSignals = node.data.kind === 'list' ? (node.data.listItems || []).map((item) => item.type) : []
        const signals = [...new Set([...incomingSignals, ...localSignals])]
        const derived = signals.length === 1 ? signals[0] : 'mixed'
        const key = node.data.kind === 'list' ? 'listSignal' : 'routeSignal'
        if (node.data[key] === derived) return node
        changed = true
        return { ...node, data: { ...node.data, [key]: derived } }
      })
      return changed ? next : current
    })
  }, [edges, setNodes])

  useEffect(() => {
    setNodes((current) => {
      let changed = false
      const next = current.map((node) => {
        if (node.data.kind !== 'list') return node
        const sources = edges
          .filter((edge) => edge.target === node.id && edge.targetHandle === 'input')
          .map((edge) => current.find((candidate) => candidate.id === edge.source))
          .filter((source): source is StudioNode => Boolean(source && isBatchGenerator(source)))
        const synchronized = synchronizeListBatchItems(node.data.listItems || [], sources)
        if (listItemsSignature(node.data.listItems || []) === listItemsSignature(synchronized)) return node
        changed = true
        return { ...node, data: { ...node.data, listItems: synchronized } }
      })
      return changed ? next : current
    })
  }, [edges, nodes, setNodes])

  useEffect(() => {
    setNodes((current) => {
      let changed = false
      const next = current.map((node) => {
        if (node.data.kind !== 'gallery') return node
        const items = edges.filter((edge) => edge.target === node.id).flatMap((edge) => {
          const source = current.find((candidate) => candidate.id === edge.source)
          if (!source) return []
          if (source.data.kind === 'list') return (source.data.listItems || []).filter((item) => item.asset)
          const path = source.data.outputPath || source.data.assetPath
          const url = source.data.outputUrl || source.data.assetUrl
          if (!path && !url) return []
          const type = outputSignalFor(source.data, edge.sourceHandle)
          if (!['image', 'video', 'audio'].includes(type)) return []
          return [{
            id: edge.id,
            type: type as 'image' | 'video' | 'audio',
            asset: {
              id: edge.id,
              name: source.data.title || 'Connected Media',
              path: path || '',
              url,
              mimeType: type === 'image' ? 'image/png' : type === 'video' ? 'video/mp4' : 'audio/mpeg',
              createdAt: 'workflow',
            },
          }]
        })
        const previousSignature = (node.data.listItems || []).map((item) => `${item.id}|${item.type}|${item.asset?.path}|${item.asset?.url}`).join('\n')
        const nextSignature = items.map((item) => `${item.id}|${item.type}|${item.asset?.path}|${item.asset?.url}`).join('\n')
        if (previousSignature === nextSignature) return node
        changed = true
        return { ...node, data: { ...node.data, listItems: items } }
      })
      return changed ? next : current
    })
  }, [edges, nodes, setNodes])

  useEffect(() => {
    setStyleChooserNodeId(null)
  }, [appView, activeCanvasId, activePageId])

  useEffect(() => {
    if (!connectionNotice) return
    const timer = window.setTimeout(() => setConnectionNotice(''), 5200)
    return () => window.clearTimeout(timer)
  }, [connectionNotice])

  useEffect(() => {
    if (!projectNotice) return
    const timer = window.setTimeout(() => setProjectNotice(''), 5200)
    return () => window.clearTimeout(timer)
  }, [projectNotice])

  useEffect(() => {
    notificationNodesRef.current = nodes
    const present = new Set(nodes.map((node) => node.id))
    for (const node of nodes) {
      const category = nodeNotificationCategory(node.data)
      if (category !== 'transient' || !node.data.progress) {
        cancelNodeProgressExpiry(node.id, nodeProgressExpiryTimers.current)
        continue
      }
      scheduleNodeProgressExpiry(
        node.id,
        node.data.progress,
        node.data.notificationVersion || 0,
        nodeProgressExpiryTimers.current,
        (nodeId) => notificationNodesRef.current.find((candidate) => candidate.id === nodeId)?.data,
        (nodeId, expectedProgress, expectedVersion) => setNodes((currentNodes) => currentNodes.map((current) => current.id === nodeId
          && current.data.progress === expectedProgress
          && (current.data.notificationVersion || 0) === expectedVersion
          && current.data.runState !== 'queued' && current.data.runState !== 'running'
          && !current.data.error
          ? { ...current, data: { ...current.data, progress: undefined } }
          : current)),
      )
    }
    for (const nodeId of nodeProgressExpiryTimers.current.keys()) if (!present.has(nodeId)) cancelNodeProgressExpiry(nodeId, nodeProgressExpiryTimers.current)
  }, [nodes, setNodes])

  useEffect(() => () => {
    for (const nodeId of nodeProgressExpiryTimers.current.keys()) cancelNodeProgressExpiry(nodeId, nodeProgressExpiryTimers.current)
  }, [])

  useEffect(() => {
    setEdges((current) => {
      let changed = false
      const normalized = current.map((edge) => {
        const source = nodes.find((node) => node.id === edge.source)
        const target = nodes.find((node) => node.id === edge.target)
        if (!source || !target) return edge
        // A live/native contract owns its sockets. Never remap or discard an unavailable saved binding.
        if (target.data.falNative || target.data.higgsfieldNative) return edge

        const signal = outputSignalFor(source.data, edge.sourceHandle)
        const expectedSourceHandle = compatibleSourceHandle(source.data.kind, signal)
        const availableTargetHandles = new Set(nodeInputPorts(target.data).map((port) => port.id))
        const preferredTargetHandle = compatibleTargetHandle(source.data, target.data.kind, expectedSourceHandle)
        const preserveLocationFrame = source.data.kind === 'location' && target.data.kind === 'video-generator' && ['image-in', 'end-image'].includes(edge.targetHandle || '')
        const semanticSource = ['style-reference', 'storyboard', 'storyboard-asset', 'character', 'wardrobe', 'element', 'location'].includes(source.data.kind)
        const currentHandleValid = Boolean(edge.targetHandle && availableTargetHandles.has(edge.targetHandle) && !connectionCompatibilityError(source.data, target.data, expectedSourceHandle, edge.targetHandle))
        const preferredHandleValid = availableTargetHandles.has(preferredTargetHandle) && !connectionCompatibilityError(source.data, target.data, expectedSourceHandle, preferredTargetHandle)
        const expectedTargetHandle = preserveLocationFrame && currentHandleValid
          ? edge.targetHandle!
          : semanticSource && preferredHandleValid
            ? preferredTargetHandle
            : currentHandleValid
              ? edge.targetHandle!
              : preferredHandleValid
                ? preferredTargetHandle
                : null
        if (!expectedTargetHandle) {
          changed = true
          return null
        }
        const expectedStroke = signal === 'storyboard' ? '#a68cff' : edge.style?.stroke

        if (edge.sourceHandle === expectedSourceHandle && edge.targetHandle === expectedTargetHandle && edge.style?.stroke === expectedStroke) return edge
        changed = true
        return {
          ...edge,
          sourceHandle: expectedSourceHandle,
          targetHandle: expectedTargetHandle,
          style: { ...edge.style, ...(expectedStroke ? { stroke: expectedStroke } : {}) },
        }
      }).filter((edge): edge is (typeof current)[number] => Boolean(edge))
      const pruned = pruneSurplusInputEdges(normalized, nodes)
      if (pruned.removed.length) {
        changed = true
        const names = pruned.removed.map(({ edge }) => nodes.find((node) => node.id === edge.source)?.data.title || 'surplus source').join(', ')
        pendingPruneNoticeRef.current = `Disconnected ${names} while updating this saved canvas. ${pruned.removed[0].message}`
      }
      return changed ? pruned.edges : current
    })
  }, [nodes, setEdges])
  useEffect(() => {
    const message = pendingPruneNoticeRef.current
    if (!message) return
    pendingPruneNoticeRef.current = ''
    setConnectionNotice(message)
  }, [edges])
  const displayEdges = useMemo(() => edges.map((edge) => {
    const source = nodes.find((node) => node.id === edge.source)
    if (!source) return edge
    const projectedSource = { ...source.data, semanticAssetAvailability: semanticAssetAvailability(source.data, missingAssetIds) }
    if (projectedSource.semanticAssetAvailability.state === 'offline') return semanticEdgePresentation(edge, projectedSource)
    if (incompleteSemanticReason(source.data)) return notReadyEdgePresentation(edge)
    if (semanticWarning(source.data)) return { ...edge, animated: false, style: { ...edge.style, stroke: '#e7a84b', strokeWidth: 2 } }
    return edge
  }), [edges, missingAssetIds, nodes])
  const [draggedCanvasId, setDraggedCanvasId] = useState<string | null>(null)
  const [renamingCanvasId, setRenamingCanvasId] = useState<string | null>(null)
  const [canvasNameDraft, setCanvasNameDraft] = useState('')
  const [draggedTabPageId, setDraggedTabPageId] = useState<string | null>(null)
  const [renamingTabPageId, setRenamingTabPageId] = useState<string | null>(null)
  const [tabPageNameDraft, setTabPageNameDraft] = useState('')
  const pageTabRefs = useRef(new Map<string, HTMLElement>())
  const pageTabOrderBeforeDrag = useRef<string[]>([])
  const pageTabDropCommitted = useRef(false)
  const pageTabSwapLock = useRef('')
  const pageCardRefs = useRef(new Map<string, HTMLElement>())
  const pageOrderBeforeDrag = useRef<string[]>([])
  const pageDropCommitted = useRef(false)
  const suppressPageClick = useRef(false)
  const pageSwapLock = useRef('')
  const pageLastSwapAt = useRef(0)
  const pageDragGhost = useRef<HTMLElement | null>(null)
  const compactAlignmentRef = useRef<HTMLDivElement | null>(null)
  const [quickConnect, setQuickConnect] = useState<QuickConnectState | null>(null)
  const [quickQuery, setQuickQuery] = useState('')
  const [portInspector, setPortInspector] = useState<PortInspectorState | null>(null)
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [palettePosition, setPalettePosition] = useState<XYPosition | null>(null)
  const [styleChooserNodeId, setStyleChooserNodeId] = useState<string | null>(null)
  const [styleChooserPosition, setStyleChooserPosition] = useState({ x: 76, y: 84 })
  const styleChooserDrag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const styleChooserRailRef = useRef<HTMLDivElement | null>(null)
  const styleChooserRailDrag = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null)
  const assetTypeRailDrag = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null)
  const assetTypeRailDidDrag = useRef(false)
  const styleChooserRailDidDrag = useRef(false)
  const styleChooserRailLastDragAt = useRef(0)
  const keyboardSelectionScope = useRef<'canvas' | 'library'>('canvas')
  const [assetIntake, setAssetIntake] = useState<AssetIntakeState | null>(null)
  const [semanticCreateKind, setSemanticCreateKind] = useState<SemanticCreateKind | null>(null)
  const [starterCreateKind, setStarterCreateKind] = useState<StarterCreateKind | null>(null)
  const [spacePanning, setSpacePanning] = useState(false)
  const [middlePanning, setMiddlePanning] = useState(false)
  const [magneticGuidesEnabled, setMagneticGuidesEnabled] = useState(() => localStorage.getItem('prism-magnetic-guides') !== 'off')
  const [magneticGuides, setMagneticGuides] = useState<MagneticGuide[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null)
  const [skipDeleteReminder, setSkipDeleteReminder] = useState(false)
  const skippedDeleteCategories = useRef(new Set<DeleteCategory>())
  const loaded = useRef(false)
  const projectActivation = useRef(0)
  const saveTimer = useRef<number | null>(null)
  const lastAutosaveAt = useRef(Date.now())
  const saveSnapshot = useRef<(() => WorkflowSaveSnapshot | null) | null>(null)
  const saveCoordinator = useRef<ReturnType<typeof createWorkflowSaveCoordinator> | null>(null)
  const mutationVersion = useRef(0)
  const lastPersistedMutationVersion = useRef(0)
  const suppressNextDirtyMark = useRef(false)
  const lastObservedViewport = useRef<Viewport | null>(null)
  const userMutationArmed = useRef(false)
  const historyTimer = useRef<number | null>(null)
  const undoStack = useRef<CanvasSnapshot[]>([])
  const redoStack = useRef<CanvasSnapshot[]>([])
  const lastSnapshot = useRef('')
  const restoringHistory = useRef(false)
  const canvasHistoryOwnerRef = useRef('')
  const canvasHistoryActivationRef = useRef(-1)
  const canvasHistoryByOwner = useRef(new Map<string, CanvasHistoryState>())
  const liveHistorySnapshot = useRef('')
  const connectionStart = useRef<Parameters<OnConnectStart>[1] | null>(null)
  const canvasClipboard = useRef<CanvasClipboard | null>(null)
  const lastCanvasPointer = useRef<{ x: number; y: number } | null>(null)
  const edgeHoverTimer = useRef<number | null>(null)
  const edgeCloseTimer = useRef<number | null>(null)
  const pendingEdgeHover = useRef<EdgeMenuState | null>(null)
  const nodeLayoutRef = useRef<StudioNode[]>([])
  const nativeVideoBatchTokens = useRef(new Map<string, { cancelled: boolean }>())
  const nodeProgressExpiryTimers = useRef<NodeProgressExpiryTimers>(new Map())
  const notificationNodesRef = useRef<StudioNode[]>([])
  const graphStateRef = useRef<{ canvases: WorkspaceCanvas[]; pages: CanvasPage[]; edges: Edge[]; activeCanvasId: string; activePageId: string }>({ canvases: [], pages: [], edges: [], activeCanvasId: '', activePageId: '' })
  const serviceConnectionsRef = useRef(serviceConnections)
  const dragConstraint = useRef<{ nodeId: string; start: XYPosition; axis: 'x' | 'y' | null } | null>(null)
  const dragReleaseFrame = useRef<number | null>(null)
  const shiftPressed = useRef(false)
  const { getNodes, getViewport, fitView, setCenter, setViewport, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow<StudioNode, Edge>()
  const updateNodeInternals = useUpdateNodeInternals()
  const handleCanvasWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (!shouldZoomCanvasFromWheel(event.altKey)) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = event.currentTarget.getBoundingClientRect()
    const viewport = getViewport()
    const next = optionWheelZoomViewport(
      viewport,
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      event.deltaY,
      event.deltaMode,
      bounds.height,
    )
    if (next === viewport) return
    userMutationArmed.current = true
    mutationVersion.current += 1
    saveLifecycle.current?.markDirty()
    void setViewport(next, { duration: 0 })
  }, [getViewport, setViewport])
  const focusRenderedNode = useCallback((target: StudioNode) => {
    const size = nodeLayoutSize(target.data.kind)
    const availableWidth = Math.max(360, window.innerWidth - 360)
    const availableHeight = Math.max(320, window.innerHeight - 170)
    const zoom = Math.min(1.6, Math.max(0.45, Math.min((availableWidth / size.width) * 0.78, (availableHeight / size.height) * 0.78)))
    void setCenter(target.position.x + size.width / 2, target.position.y + size.height / 2, { zoom, duration: 350 })
  }, [setCenter])

  useEffect(() => {
    nodeLayoutRef.current = nodes
    graphStateRef.current = { canvases, pages, edges, activeCanvasId, activePageId }
  }, [activeCanvasId, activePageId, canvases, edges, nodes, pages])

  const graphAtOrigin = useCallback((origin: GraphOrigin): { nodes: StudioNode[]; edges: Edge[] } => {
    const current = graphStateRef.current
    if (current.activeCanvasId === origin.canvasId && current.activePageId === origin.pageId) {
      return { nodes: nodeLayoutRef.current, edges: current.edges }
    }
    if (current.activeCanvasId === origin.canvasId) {
      const page = current.pages.find((candidate) => candidate.id === origin.pageId)
      if (page) return { nodes: page.nodes, edges: page.edges }
    }
    const page = current.canvases.find((canvas) => canvas.id === origin.canvasId)?.pages.find((candidate) => candidate.id === origin.pageId)
    return page ? { nodes: page.nodes, edges: page.edges } : { nodes: [], edges: [] }
  }, [])

  const commitOriginGraph = useCallback((origin: GraphOrigin, nextNodes: StudioNode[], nextEdges: Edge[]) => {
    const updatedAt = new Date().toISOString()
    const current = graphStateRef.current
    const nextCanvases = commitGraphToOrigin(current.canvases, origin, nextNodes, nextEdges, updatedAt)
    graphStateRef.current = { ...current, canvases: nextCanvases }
    setCanvases((existing) => commitGraphToOrigin(existing, origin, nextNodes, nextEdges, updatedAt))
    if (current.activeCanvasId !== origin.canvasId) return
    const nextPages = current.pages.map((page) => page.id === origin.pageId ? { ...page, nodes: nextNodes, edges: nextEdges, updatedAt } : page)
    graphStateRef.current = { ...graphStateRef.current, pages: nextPages }
    setPages((existing) => existing.map((page) => page.id === origin.pageId ? { ...page, nodes: nextNodes, edges: nextEdges, updatedAt } : page))
    if (current.activePageId !== origin.pageId) return
    nodeLayoutRef.current = nextNodes
    graphStateRef.current = { ...graphStateRef.current, edges: nextEdges }
    setNodes(nextNodes)
    setEdges(nextEdges)
  }, [setEdges, setNodes])

  const patchOriginNode = useCallback((origin: GraphOrigin, nodeId: string, patch: Partial<StudioNodeData>) => {
    const graph = graphAtOrigin(origin)
    commitOriginGraph(origin, graph.nodes.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...nodeLifecycleTransition(node.data, patch) } } : node), graph.edges)
  }, [commitOriginGraph, graphAtOrigin])

  useEffect(() => {
    if (!compactAlignmentOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (!compactAlignmentRef.current?.contains(event.target as Node)) setCompactAlignmentOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (appShortcutsSuppressed()) return
      if (event.key === 'Escape') setCompactAlignmentOpen(false)
    }
    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [compactAlignmentOpen])

  useEffect(() => {
    if (!assetMenuId) return
    const closeAssetMenuOutside = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.asset-more-menu, [data-asset-menu-trigger]')) return
      setAssetMenuId(null)
    }
    const closeAssetMenuOnEscape = (event: KeyboardEvent) => {
      if (appShortcutsSuppressed()) return
      if (event.key === 'Escape') setAssetMenuId(null)
    }
    window.addEventListener('pointerdown', closeAssetMenuOutside)
    window.addEventListener('keydown', closeAssetMenuOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeAssetMenuOutside)
      window.removeEventListener('keydown', closeAssetMenuOnEscape)
    }
  }, [assetMenuId])

  useEffect(() => {
    localStorage.setItem('prism-magnetic-guides', magneticGuidesEnabled ? 'on' : 'off')
    if (!magneticGuidesEnabled) setMagneticGuides([])
  }, [magneticGuidesEnabled])

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => { if (event.key === 'Shift') shiftPressed.current = true }
    const keyUp = (event: KeyboardEvent) => { if (event.key === 'Shift') shiftPressed.current = false }
    const release = () => { shiftPressed.current = false }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', release)
    }
  }, [])

  const finishMagneticDrag = useCallback(() => {
    if (!dragConstraint.current) return
    if (dragReleaseFrame.current !== null) cancelAnimationFrame(dragReleaseFrame.current)
    dragReleaseFrame.current = requestAnimationFrame(() => {
      dragReleaseFrame.current = null
      dragConstraint.current = null
      setMagneticGuides([])
    })
  }, [])

  useEffect(() => {
    const releaseDrag = () => finishMagneticDrag()
    window.addEventListener('pointerup', releaseDrag)
    window.addEventListener('mouseup', releaseDrag)
    window.addEventListener('blur', releaseDrag)
    return () => {
      window.removeEventListener('pointerup', releaseDrag)
      window.removeEventListener('mouseup', releaseDrag)
      window.removeEventListener('blur', releaseDrag)
      if (dragReleaseFrame.current !== null) cancelAnimationFrame(dragReleaseFrame.current)
    }
  }, [finishMagneticDrag])

  const requestDelete = useCallback((request: DeleteRequest) => {
    if (skippedDeleteCategories.current.has(request.category)) {
      request.action()
      return
    }
    setSkipDeleteReminder(false)
    setDeleteRequest(request)
  }, [])

  const materializedProjectCanvases = useCallback(() => {
    const currentPages = pages.map((page) => page.id === activePageId
      ? { ...page, nodes, edges, viewport: getViewport(), updatedAt: new Date().toISOString() }
      : page)
    return canvases.map((canvas) => canvas.id === activeCanvasId
      ? { ...canvas, pages: currentPages, activePageId, updatedAt: new Date().toISOString() }
      : canvas)
  }, [activeCanvasId, activePageId, canvases, edges, getViewport, nodes, pages])

  const deleteManagedAssetsEverywhere = useCallback(async (targetAssets: ImportedAsset[]) => {
    if (!targetAssets.length) return
    setProjectError('')
    setProjectNotice('')
    try {
      const deletedIds = new Set(targetAssets.map((asset) => asset.id))
      const originalCanvases = materializedProjectCanvases()
      const originalCanvas = originalCanvases.find((canvas) => canvas.id === activeCanvasId)
      const originalPage = originalCanvas?.pages.find((page) => page.id === activePageId)
      if (!originalCanvas || !originalPage) throw new Error('The active Canvas could not be preserved for asset recovery.')
      const originalWorkflow: WorkflowDocument = { ...workflow, nodes: originalPage.nodes, edges: staticEdges(originalPage.edges), viewport: originalPage.viewport, pages: originalCanvas.pages, activePageId, canvases: originalCanvases, activeCanvasId, updatedAt: new Date().toISOString() }
      const pruned = pruneAssetDeployments(originalCanvases, targetAssets)
      const activeCanvas = pruned.canvases.find((canvas) => canvas.id === activeCanvasId)
      const activePage = activeCanvas?.pages.find((page) => page.id === activePageId)
      if (!activeCanvas || !activePage) throw new Error('The active Canvas could not be preserved during asset deletion.')
      const updatedWorkflow: WorkflowDocument = {
        ...workflow,
        nodes: activePage.nodes,
        edges: staticEdges(activePage.edges),
        viewport: activePage.viewport,
        pages: activeCanvas.pages,
        activePageId,
        canvases: pruned.canvases,
        activeCanvasId,
        updatedAt: new Date().toISOString(),
      }
      await window.prism.assets.trashCollection([...deletedIds], updatedWorkflow)
      undoStack.current = [...undoStack.current.slice(-49), { nodes: sanitizeCanvasHistoryNodes(structuredClone(originalPage.nodes)), edges: canvasHistoryEdges(structuredClone(originalPage.edges)), assetRestore: { ids: [...deletedIds], workflow: structuredClone(originalWorkflow) } }]
      redoStack.current = []
      setCanUndo(true)
      setCanRedo(false)
      restoringHistory.current = true
      setWorkflow(updatedWorkflow)
      setCanvases(pruned.canvases)
      setPages(activeCanvas.pages)
      setNodes(activePage.nodes)
      setEdges(staticEdges(activePage.edges))
      lastSnapshot.current = serializeCanvasHistorySnapshot(activePage.nodes, staticEdges(activePage.edges))
      setAssets(await window.prism.assets.list())
      setMissingAssetIds((current) => current.filter((id) => !deletedIds.has(id)))
      setGeneratedMediaViewer((current) => current?.kind === 'assets' && current.assetIds.some((id) => deletedIds.has(id)) ? null : current)
      setInspectorNodeId((current) => current && !activePage?.nodes.some((node) => node.id === current) ? null : current)
      setAssetMenuId(null)
      setSelectedAssetKeys([])
      setAssetSelectionAnchor(null)
      setHistory(await window.prism.history.list())
      userMutationArmed.current = false
      saveLifecycle.current?.replaceClean()
      setProjectNotice(pruned.affectedNodeCount
        ? `Moved the asset to Prism Trash and cleared its media from ${pruned.affectedNodeCount} Canvas instance${pruned.affectedNodeCount === 1 ? '' : 's'}. Undo restores the asset, files, and Canvas references.`
        : 'Moved the asset to Prism Trash. Undo restores its managed file to the original folder.')
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [activeCanvasId, activePageId, materializedProjectCanvases, setEdges, setNodes, workflow])

  const requestManagedAssetDelete = useCallback((targetAssets: ImportedAsset[], displayName: string, options?: { title?: string; messagePrefix?: string; confirmLabel?: string; onDeleted?: () => void }) => {
    if (!targetAssets.length) return
    const impact = pruneAssetDeployments(materializedProjectCanvases(), targetAssets)
    const collection = targetAssets.length > 1
    const physicalConsequence = collection
      ? `move all ${targetAssets.length} managed files to recoverable Prism Trash`
      : 'move its managed file to recoverable Prism Trash'
    const consequence = impact.affectedNodeCount
      ? `“${displayName}” is used in ${impact.affectedNodeCount} Canvas instance${impact.affectedNodeCount === 1 ? '' : 's'} across ${impact.affectedPageCount} Page${impact.affectedPageCount === 1 ? '' : 's'}. Deleting it will remove its media from every instance while preserving reusable node shells, and ${physicalConsequence}.`
      : `Delete “${displayName}” and ${physicalConsequence}?`
    const message = options?.messagePrefix ? `${options.messagePrefix} ${consequence}` : consequence
    requestDelete({
      category: 'asset',
      title: options?.title || (impact.affectedNodeCount ? 'Delete Asset Everywhere?' : 'Delete Asset?'),
      message,
      confirmLabel: options?.confirmLabel || (impact.affectedNodeCount ? 'Delete Everywhere' : 'Delete Asset'),
      action: () => { void deleteManagedAssetsEverywhere(targetAssets).then(() => options?.onDeleted?.()) },
    })
  }, [deleteManagedAssetsEverywhere, materializedProjectCanvases, requestDelete])

  const confirmDelete = useCallback(() => {
    if (!deleteRequest) return
    if (skipDeleteReminder) skippedDeleteCategories.current.add(deleteRequest.category)
    const action = deleteRequest.action
    setDeleteRequest(null)
    setSkipDeleteReminder(false)
    action()
  }, [deleteRequest, skipDeleteReminder])

  const closePortraitDialog = useCallback(() => {
    portraitDialogRevision.current += 1
    setPortraitDialog(null)
  }, [])

  const openPortraitDialog = useCallback(async (asset: ImportedAsset, collection: ImportedAsset[] = [asset]) => {
    const revision = ++portraitDialogRevision.current, activation = projectActivation.current
    const owns = () => portraitDialogRevision.current === revision && projectActivation.current === activation
    const candidates = collection.filter(item => !item.trashedAt && /^(image|video)\//.test(item.mimeType))
    setAssetMenuId(null)
    setContextMenu(null)
    setPortraitDialog({ asset, assets: candidates, loading: true, busy: false, error: '' })
    try {
      const context = await window.prism.assets.byteplusPortraitContext(asset.id)
      if (owns()) setPortraitDialog({ asset, assets: candidates, context, loading: false, busy: false, error: '' })
    } catch (error) {
      if (owns()) setPortraitDialog({ asset, assets: candidates, loading: false, busy: false, error: error instanceof Error ? error.message : String(error) })
    }
  }, [])

  const savePortraitLink = useCallback(async (request?: BytePlusPortraitLinkRequest) => {
    if (!portraitDialog || portraitDialog.busy || portraitDialog.loading) return
    const revision = portraitDialogRevision.current, activation = projectActivation.current, assetId = portraitDialog.asset.id
    if (request && request.assetId !== assetId) return
    const owns = () => portraitDialogRevision.current === revision && projectActivation.current === activation
    setPortraitDialog(current => current ? { ...current, busy: true, error: '' } : current)
    try {
      const updated = request ? await window.prism.assets.linkByteplusPortrait(request) : await window.prism.assets.revokeByteplusPortrait(assetId)
      if (!owns()) return
      setAssets(current => current.map(asset => asset.id === updated.id ? updated : asset))
      closePortraitDialog()
    } catch (error) {
      if (owns()) setPortraitDialog(current => current ? { ...current, busy: false, error: error instanceof Error ? error.message : String(error) } : current)
    }
  }, [closePortraitDialog, portraitDialog])

  const activateProject = useCallback(async (selectedProject: ProjectWorkspace, refreshRecentProjects = true) => {
        const activation = ++projectActivation.current
        closePortraitDialog()
        serviceReadiness.current.invalidate()
        serviceBusyOperations.current = { count: 0 }
        setServiceBusy(false)
        const ownsConnections = serviceReadiness.current.capture()
        try {
        serviceResponseScope.current!.invalidate()
        serviceAvailabilityStop.current?.()
        setPromptConnections({})
        setServiceModels({})
        setServiceAccounts({})
        loaded.current = false
        const activationState = await loadProjectActivationState({
          isCurrent: () => projectActivation.current === activation,
          loadWorkflow: () => window.prism.workflows.load(workflowSaveOwner(selectedProject)),
          readEntries: () => window.prism.history.list(),
          readAssets: () => window.prism.assets.status(),
          readLegacyStatus: () => window.prism.projects.legacyImportStatus(),
          readConnections: () => window.prism.services.list(),
        })
        if (!activationState) return
        const { stored, entries, assetStatus, legacyStatus, connections } = activationState
        if (projectActivation.current !== activation) return
        const status = { ...emptyServiceStatus }
        connections.forEach((connection) => { status[connection.id] = connection.connected })
        if (ownsConnections()) {
          setServiceConnections(status)
          setHasCredential(status.fal)
          setHasFishCredential(status.fish)
        }
        const document = stored || freshWorkflow()
        const sourcePages: CanvasPage[] = document.pages?.length ? document.pages : [{
          id: crypto.randomUUID(),
          name: 'Page 1',
          nodes: document.nodes,
          edges: document.edges,
          viewport: document.viewport,
          updatedAt: document.updatedAt,
        }]
        const sourceCanvases: WorkspaceCanvas[] = document.canvases?.length ? document.canvases : [{
          id: crypto.randomUUID(),
          name: 'Canvas 1',
          pages: sourcePages,
          activePageId: document.activePageId || sourcePages[0].id,
          updatedAt: document.updatedAt,
        }]
        let migratedCanvases = sourceCanvases.map((canvas) => ({ ...canvas, pages: canvas.pages.map((page) => ({ ...page, nodes: recoverInterruptedGenerationNodes(normalizeStandardNodeWidths(detachStoryboardStyleNodes(page.nodes.map(migrateLegacyShotNode).map(mergeAssistantIntoPrompt).map(migrateRetiredProductNode).map(migrateGeneratableAssetNode)))) })) }))
        const migratedAssetRecords = new Map<string, ImportedAsset>()
        for (const { asset } of assetStatus) {
          if (!isReusableAsset(asset)) continue
          const canonicalName = normalizeLogicalAssetName(asset.metadata?.assetName || asset.name)
          if (!canonicalName || asset.metadata?.assetName === canonicalName) continue
          migratedAssetRecords.set(asset.id, await window.prism.assets.updateMetadata(asset.id, { ...asset.metadata, assetName: canonicalName }))
          if (projectActivation.current !== activation) return
        }
        const legacyLogicalAssetMigrations = new Map<string, { name: string; assetIds: Set<string> }>()
        const slug = normalizeLogicalAssetName
        migratedCanvases.forEach((canvas) => canvas.pages.forEach((page) => page.nodes.forEach((node) => {
          if (!['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(node.data.kind) || !node.data.referenceAssets?.length || !node.data.referenceTag) return
          const tagName = normalizeLogicalAssetName(node.data.referenceTag)
          const titleName = normalizeLogicalAssetName(node.data.title || '')
          const matchingRecords = node.data.referenceAssets.map((reference) => migratedAssetRecords.get(reference.id) || assetStatus.find((item) => item.asset.id === reference.id || item.asset.path === reference.path)?.asset).filter((record): record is ImportedAsset => Boolean(record && isReusableAsset(record)))
          if (!tagName || !matchingRecords.length) return
          const identityAlreadyCanonical = tagName === titleName && matchingRecords.every((record) => assetDisplayName(record) === tagName)
          if (!identityAlreadyCanonical) legacyLogicalAssetMigrations.set(node.id, { name: tagName, assetIds: new Set(matchingRecords.map((record) => record.id)) })
        })))
        for (const migration of legacyLogicalAssetMigrations.values()) {
          for (const assetId of migration.assetIds) {
            const record = migratedAssetRecords.get(assetId) || assetStatus.find((item) => item.asset.id === assetId)?.asset
            if (!record || record.metadata?.assetName === migration.name) continue
            migratedAssetRecords.set(assetId, await window.prism.assets.updateMetadata(assetId, { ...record.metadata, assetName: migration.name }))
            if (projectActivation.current !== activation) return
          }
        }
        const migrateLegacyNode = (node: StudioNode): StudioNode => {
          const migration = legacyLogicalAssetMigrations.get(node.id)
          if (!migration) return node
          return {
            ...node,
            data: {
              ...node.data,
              title: migration.name,
              referenceTag: `@${slug(migration.name)}`,
              referenceAssets: (node.data.referenceAssets || []).map((asset) => migratedAssetRecords.get(asset.id) || asset),
            },
          }
        }
        if (legacyLogicalAssetMigrations.size) {
          migratedCanvases = migratedCanvases.map((canvas) => ({ ...canvas, pages: canvas.pages.map((page) => ({ ...page, nodes: page.nodes.map(migrateLegacyNode) })) }))
        }
        migratedCanvases = migratedCanvases.map((canvas) => ({ ...canvas, pages: canvas.pages.map((page) => ({ ...page, nodes: page.nodes.map((node) => {
          const referenceAssets = (node.data.referenceAssets || []).map((asset) => migratedAssetRecords.get(asset.id) || asset)
          const reusableNode = ['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(node.data.kind) && referenceAssets.some(isReusableAsset)
          if (!reusableNode) return referenceAssets.some((asset, index) => asset !== node.data.referenceAssets?.[index]) ? { ...node, data: { ...node.data, referenceAssets } } : node
          const canonicalName = normalizeLogicalAssetName(node.data.referenceTag || node.data.title || assetDisplayName(referenceAssets[0]))
          return canonicalName ? { ...node, data: { ...node.data, title: canonicalName, referenceTag: `@${canonicalName}`, referenceAssets } } : node
        }) })) }))
        migratedCanvases = migratedCanvases.map((canvas) => ({
          ...canvas,
          pages: canvas.pages.map((page) => {
            const migrated = migrateUnifiedStoryboards(page.nodes, page.edges)
            return { ...page, nodes: migrated.nodes, edges: migrated.edges }
          }),
        }))
        const selectedCanvas = migratedCanvases.find((canvas) => canvas.id === document.activeCanvasId) || migratedCanvases[0]
        const migratedPages = selectedCanvas.pages
        const selectedPage = migratedPages.find((page) => page.id === selectedCanvas.activePageId) || migratedPages[0]
        suppressNextDirtyMark.current = true
        mutationVersion.current = 0
        userMutationArmed.current = false
        lastObservedViewport.current = selectedPage.viewport
        setWorkflow(document)
        setProject(selectedProject)
        if (refreshRecentProjects) void window.prism.projects.recent().then((projects) => { if (projectActivation.current === activation) setRecentProjects(projects) }).catch(() => undefined)
        setPages(migratedPages)
        setCanvases(migratedCanvases)
        setActiveCanvasId(selectedCanvas.id)
        setActivePageId(selectedPage.id)
        setNodes(withCollapsedCharacterEditors(selectedPage.nodes))
        const selectedEdges = staticEdges(selectedPage.edges)
        setEdges(selectedEdges)
        lastSnapshot.current = serializeCanvasHistorySnapshot(selectedPage.nodes, selectedEdges)
        setHistory(entries)
        setAssets(assetStatus.map((item) => migratedAssetRecords.get(item.asset.id) || item.asset))
        setMissingAssetIds(assetStatus.filter((item) => item.missing).map((item) => item.asset.id))
        setLegacyImport(legacyStatus)
        setHomeSection('spaces')
        setAppView('space')
        setProjectError('')
        saveLifecycle.current?.replaceClean()
        lastAutosaveAt.current = Date.now()
        loaded.current = true
        window.setTimeout(() => { if (projectActivation.current === activation) void setViewport(selectedPage.viewport, { duration: 0 }) }, 50)
        } catch (error) {
          if (projectActivation.current !== activation) return
          throw error
        }
  }, [closePortraitDialog, setEdges, setNodes, setViewport])

  useEffect(() => {
    let active = true
    let startupActivation = projectActivation.current
    const isCurrent = () => active && projectActivation.current === startupActivation
    const stopProgress = window.prism.generation.onProgress(({ nodeId, message, status }) => {
      setNodes((current) => current.map((node) => node.id === nodeId
        ? { ...node, data: { ...node.data, progress: status === 'remote-unknown' ? undefined : message, ...(status === 'remote-unknown' ? { error: message } : {}), runState: status === 'remote-unknown' ? 'error' : status === 'queued' ? 'queued' : 'running' } }
        : node))
    })
    void startStartupHydration({
      isCurrent,
      currentProject: () => window.prism.projects.current(),
      recentProjects: () => window.prism.projects.recent(),
      services: () => window.prism.services.list(),
      profileRegistries: () => Promise.all(SERVICE_CATALOG.map((service) => window.prism.services.profiles(service.id, false))),
      onRecentProjects: (projects) => setRecentProjects([...projects]),
      onEssentialState: async ({ currentProject: storedProject, profileRegistries }) => {
        setServiceProfiles(profileRegistries[profileRegistries.length - 1] || { schemaVersion: 1 as const, profiles: [], defaults: {} })
        if (storedProject) {
          const activation = activateProject(storedProject, false)
          startupActivation = projectActivation.current
          await activation
        } else {
          await refreshServiceConnections(isCurrent)
        }
        if (isCurrent()) setProjectReady(true)
      },
    }).catch((error) => {
      if (!isCurrent()) return
      setProjectError(error instanceof Error ? error.message : String(error))
      setProjectReady(true)
    })
    return () => { active = false; stopProgress() }
  }, [activateProject, refreshServiceConnections, setNodes])

  useEffect(() => window.prism.projects.onOpened((openedProject) => { void activateProject(openedProject) }), [activateProject])

  useEffect(() => {
    if (appView === 'canvas') return
    setAssetBrowserOpen(false)
    setStyleChooserNodeId(null)
    setPaletteOpen(false)
    setQuickConnect(null)
    setPortInspector(null)
    setEdgeMenu(null)
    setContextMenu(null)
    setInspectorNodeId(null)
  }, [appView, homeSection, assetTypeFilter])

  useEffect(() => { setSelectedCanvasAssetKey(null) }, [assetTypeFilter])

  useEffect(() => {
    if (!settingsOpen) return
    let active = true
    const activation = projectActivation.current
    const ownsReadiness = serviceReadiness.current.capture()
    let refreshStarted = false
    const isCurrent = () => active && projectActivation.current === activation && ownsReadiness()
    void (async () => {
      try {
        let registry = serviceProfiles
        for (const service of SERVICE_CATALOG) {
          if (!isCurrent()) return
          registry = await window.prism.services.profiles(service.id, true)
        }
        if (!isCurrent()) return
        setServiceProfiles(registry)
        // The refresh owns a new revision and suppresses any superseded failure.
        refreshStarted = true
        await refreshServiceConnections(() => active && projectActivation.current === activation)
      } catch (error) { if (active && projectActivation.current === activation && (refreshStarted || ownsReadiness())) setServiceError(error instanceof Error ? error.message : String(error)) }
    })()
    return () => { active = false }
  }, [refreshServiceConnections, settingsOpen, project?.id, project?.rootPath])

  useEffect(() => {
    const connected = (Object.keys(serviceConnections) as ServiceProvider[])
      .filter((provider) => serviceConnections[provider])
    const stop = startServiceAvailabilityRefresh({
      connected,
      publicCatalogs: ['fish', 'higgsfield'],
      snapshot: (provider) => window.prism.services.modelSnapshot(provider),
      models: (provider) => window.prism.services.models(provider),
      account: (provider) => window.prism.services.account(provider),
      requestGuard: (provider, channel) => serviceResponseScope.current!.begin(provider, channel),
      onModelsError: (provider, error) => {
        if (error instanceof Error && error.name === 'AbortError') return
        if (provider === 'higgsfield') setServiceModels((current) => ({ ...current, [provider]: { ...current[provider], provider, verified: current[provider]?.verified || false, models: current[provider]?.models || [], catalogStale: true, catalogComplete: false, catalogError: error instanceof Error ? error.message : 'Could not load the official Higgsfield model documents.' } }))
        if (provider === 'fish') setServiceModels((current) => ({ ...current, [provider]: { ...current[provider], provider, verified: current[provider]?.verified || false, models: current[provider]?.models || [], catalogStale: true, catalogError: error instanceof Error ? error.message : 'Could not load the official Fish Audio contract.' } }))
        if (provider === 'fal') setServiceModels((current) => ({ ...current, [provider]: { ...current[provider], provider, verified: current[provider]?.verified || false, models: current[provider]?.models || [], catalogStale: true, catalogError: error instanceof Error ? error.message : 'Could not load fal models.' } }))
        if (provider === 'elevenlabs') setServiceModels((current) => ({ ...current, [provider]: { provider, verified: false, models: [], catalogError: error instanceof Error ? error.message : 'Could not load ElevenLabs models.' } }))
      },
      onModels: (provider, availability) => setServiceModels((current) => ({ ...current, [provider]: availability })),
      onAccount: (provider, account) => setServiceAccounts((current) => ({ ...current, [provider]: account })),
    })
    serviceAvailabilityStop.current = stop
    return stop
  }, [serviceConnections, project?.id, project?.rootPath])

  const canvasHistoryOwner = JSON.stringify([projectActivation.current, project?.id, project?.rootPath, activeCanvasId, activePageId])
  const serializedCanvasHistory = serializeCanvasHistorySnapshot(nodes, edges)
  if (canvasHistoryOwnerRef.current === canvasHistoryOwner) liveHistorySnapshot.current = serializedCanvasHistory
  const currentCanvasHistoryState = (): CanvasHistoryState => ({ undo: undoStack.current.map(snapshot => JSON.stringify(snapshot)), redo: redoStack.current.map(snapshot => JSON.stringify(snapshot)), baseline: lastSnapshot.current })
  const applyCanvasHistoryState = (state: CanvasHistoryState) => {
    undoStack.current = state.undo.map(snapshot => JSON.parse(snapshot) as CanvasSnapshot)
    redoStack.current = state.redo.map(snapshot => JSON.parse(snapshot) as CanvasSnapshot)
    lastSnapshot.current = state.baseline
    setCanUndo(state.undo.length > 0)
    setCanRedo(state.redo.length > 0)
  }
  useEffect(() => {
    if (!loaded.current || !project || canvasHistoryOwnerRef.current === canvasHistoryOwner) return
    if (historyTimer.current) window.clearTimeout(historyTimer.current)
    const sameActivation = canvasHistoryActivationRef.current === projectActivation.current
    if (!sameActivation) canvasHistoryByOwner.current.clear()
    const next = switchCanvasHistoryOwner(canvasHistoryByOwner.current, sameActivation ? canvasHistoryOwnerRef.current : '', canvasHistoryOwner, currentCanvasHistoryState(), liveHistorySnapshot.current, serializedCanvasHistory, restoringHistory.current)
    canvasHistoryOwnerRef.current = canvasHistoryOwner
    canvasHistoryActivationRef.current = projectActivation.current
    liveHistorySnapshot.current = serializedCanvasHistory
    restoringHistory.current = false
    applyCanvasHistoryState(next)
  }, [canvasHistoryOwner, nodes, edges])

  useEffect(() => {
    if (!loaded.current || !project) return
    if (historyTimer.current) window.clearTimeout(historyTimer.current)
    const owner = canvasHistoryOwner
    historyTimer.current = window.setTimeout(() => {
      if (canvasHistoryOwnerRef.current !== owner) return
      applyCanvasHistoryState(recordCanvasHistorySnapshot(currentCanvasHistoryState(), serializedCanvasHistory, restoringHistory.current))
      restoringHistory.current = false
    }, 350)
    return () => { if (historyTimer.current) window.clearTimeout(historyTimer.current) }
  }, [nodes, edges, canvasHistoryOwner])

  const persistedCanvasFingerprint = useMemo(() => JSON.stringify({
    nodes: nodes.map(canvasNodeDirtySnapshot),
    edges: edges.map(({ selected: _selected, ...edge }) => edge),
    pages,
    activePageId,
    canvases,
    activeCanvasId,
  }), [activeCanvasId, activePageId, canvases, edges, nodes, pages])

  useEffect(() => {
    const armUserMutation = () => {
      if (loaded.current) userMutationArmed.current = true
    }
    window.addEventListener('pointerdown', armUserMutation, true)
    window.addEventListener('keydown', armUserMutation, true)
    window.addEventListener('input', armUserMutation, true)
    return () => {
      window.removeEventListener('pointerdown', armUserMutation, true)
      window.removeEventListener('keydown', armUserMutation, true)
      window.removeEventListener('input', armUserMutation, true)
    }
  }, [])

  useEffect(() => {
    if (!saveLifecycle.current) saveLifecycle.current = createSavePresentationLifecycle(setSaveState, window)
    return () => {
      saveLifecycle.current?.dispose()
      saveLifecycle.current = null
    }
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    if (suppressNextDirtyMark.current) {
      suppressNextDirtyMark.current = false
      return
    }
    if (!userMutationArmed.current) return
    mutationVersion.current += 1
    saveLifecycle.current?.markDirty()
  }, [persistedCanvasFingerprint])

  const renderedActivation = projectActivation.current
  saveSnapshot.current = () => {
    if (!loaded.current || projectActivation.current !== renderedActivation || !project || !project.documentPath) return null
    const savedAt = new Date().toISOString(), viewport = getViewport()
    const materializedPages = pages.map((page) => page.id === activePageId
      ? { ...page, nodes, edges, viewport, updatedAt: savedAt }
      : page)
    const materializedCanvases = canvases.map((canvas) => canvas.id === activeCanvasId
      ? { ...canvas, pages: materializedPages, activePageId, updatedAt: savedAt }
      : canvas)
    return {
      owner: workflowSaveOwner(project), activation: renderedActivation, version: mutationVersion.current,
      fingerprint: JSON.stringify([persistedCanvasFingerprint, viewport]),
      document: { ...workflow, nodes, edges, viewport, pages: materializedPages, activePageId, canvases: materializedCanvases, activeCanvasId, updatedAt: savedAt },
    }
  }
  if (!saveCoordinator.current) saveCoordinator.current = createWorkflowSaveCoordinator({
    snapshot: () => saveSnapshot.current?.() || null,
    save: snapshot => window.prism.workflows.save(snapshot.document, snapshot.owner),
    begin: snapshot => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      lastAutosaveAt.current = Date.now()
      lastObservedViewport.current = snapshot.document.viewport
      saveLifecycle.current?.beginSaving()
    },
    saved: (snapshot, upToDate) => {
      if (upToDate) { setWorkflow(snapshot.document); userMutationArmed.current = false }
      saveLifecycle.current?.resolve(!upToDate)
    },
    failed: (_snapshot, error) => {
      saveLifecycle.current?.reject()
      setProjectError(error instanceof Error ? error.message : String(error))
    },
  })
  useEffect(() => () => { saveSnapshot.current = null }, [])
  const persistWorkflow = useCallback((): Promise<boolean> => saveCoordinator.current!.flush(), [])

  useEffect(() => {
    if (!loaded.current || saveState !== 'unsaved') return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    const autosaveDelay = nextAutosaveDelay(lastAutosaveAt.current)
    saveTimer.current = window.setTimeout(() => { void persistWorkflow() }, autosaveDelay)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [activeCanvasId, activePageId, canvases, edges, nodes, pages, persistWorkflow, project, saveState])

  const undoCanvas = useCallback(async () => {
    if (canvasHistoryOwnerRef.current !== canvasHistoryOwner) return
    if (historyTimer.current) window.clearTimeout(historyTimer.current)
    applyCanvasHistoryState(recordCanvasHistorySnapshot(currentCanvasHistoryState(), serializeCanvasHistorySnapshot(nodes, edges), restoringHistory.current))
    restoringHistory.current = false
    const previous = undoStack.current.at(-1)
    if (!previous) return
    undoStack.current = undoStack.current.slice(0, -1)
    if (previous.assetRestore) {
      const owner = canvasHistoryOwnerRef.current
      try {
        await window.prism.assets.restoreCollection(previous.assetRestore.ids, previous.assetRestore.workflow)
        if (canvasHistoryOwnerRef.current !== owner) return
        const restoredWorkflow = previous.assetRestore.workflow
        const restoredCanvases = restoredWorkflow.canvases || []
        const restoredCanvas = restoredCanvases.find((canvas) => canvas.id === restoredWorkflow.activeCanvasId) || restoredCanvases[0]
        const restoredPages = restoredCanvas?.pages || restoredWorkflow.pages || []
        const restoredPage = restoredPages.find((page) => page.id === restoredCanvas?.activePageId) || restoredPages[0]
        if (!restoredCanvas || !restoredPage) throw new Error('The restored asset references could not be placed back on the Canvas.')
        restoringHistory.current = true
        setWorkflow(restoredWorkflow)
        setCanvases(restoredCanvases)
        setActiveCanvasId(restoredCanvas.id)
        setPages(restoredPages)
        setActivePageId(restoredPage.id)
        const restoredNodes = sanitizeCanvasHistoryNodes(restoredPage.nodes)
        setNodes(restoredNodes)
        setEdges(staticEdges(restoredPage.edges))
        lastSnapshot.current = serializeCanvasHistorySnapshot(restoredNodes, staticEdges(restoredPage.edges))
        setAssets(await window.prism.assets.list())
        setHistory(await window.prism.history.list())
        redoStack.current = []
        setCanUndo(undoStack.current.length > 0)
        setCanRedo(false)
        setProjectNotice('Undo restored the asset, its managed files, and every affected Canvas reference.')
      } catch (error) {
        if (canvasHistoryOwnerRef.current !== owner) return
        undoStack.current = [...undoStack.current, previous]
        setCanUndo(true)
        setProjectError(error instanceof Error ? error.message : String(error))
      }
      return
    }
    const previousNodes = sanitizeCanvasHistoryNodes(previous.nodes)
    redoStack.current = [...redoStack.current, { nodes: sanitizeCanvasHistoryNodes(structuredClone(nodes)), edges: canvasHistoryEdges(structuredClone(edges)) }]
    restoringHistory.current = true
    lastSnapshot.current = serializeCanvasHistorySnapshot(previousNodes, staticEdges(previous.edges))
    setNodes(previousNodes)
    setEdges(staticEdges(previous.edges))
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [canvasHistoryOwner, edges, nodes, setEdges, setNodes])

  const redoCanvas = useCallback(() => {
    if (canvasHistoryOwnerRef.current !== canvasHistoryOwner) return
    if (historyTimer.current) window.clearTimeout(historyTimer.current)
    applyCanvasHistoryState(recordCanvasHistorySnapshot(currentCanvasHistoryState(), serializeCanvasHistorySnapshot(nodes, edges), restoringHistory.current))
    restoringHistory.current = false
    const next = redoStack.current.at(-1)
    if (!next) return
    redoStack.current = redoStack.current.slice(0, -1)
    const nextNodes = sanitizeCanvasHistoryNodes(next.nodes)
    undoStack.current = [...undoStack.current, { nodes: sanitizeCanvasHistoryNodes(structuredClone(nodes)), edges: canvasHistoryEdges(structuredClone(edges)) }]
    restoringHistory.current = true
    lastSnapshot.current = serializeCanvasHistorySnapshot(nextNodes, staticEdges(next.edges))
    setNodes(withCollapsedCharacterEditors(nextNodes))
    setEdges(staticEdges(next.edges))
    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [canvasHistoryOwner, edges, nodes, setEdges, setNodes])

  const toggleSelectedGroup = useCallback((nodeIds?: string[]) => {
    setNodes((current) => {
      const ids = nodeIds?.length ? nodeIds : current.filter((node) => node.selected).map((node) => node.id)
      return toggleNodeGroup(current, ids)
    })
  }, [setNodes])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (appShortcutsSuppressed()) return
      const typing = isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement)
      const historyAction = nativeTextHistoryAction(event)
      const canvasAction = canvasKeyboardAction({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        textEntryActive: typing,
        canvasScope: appView === 'canvas' && keyboardSelectionScope.current === 'canvas',
      })
      if (canvasAction === 'select-all') {
        event.preventDefault()
        setNodes((current) => current.map((node) => ({ ...node, selected: true })))
        setEdges((current) => current.map((edge) => ({ ...edge, selected: false })))
        return
      }
      if (canvasAction === 'delete-selection') {
        event.preventDefault()
        const selectedNodeIds = new Set(getNodes().filter((node) => node.selected).map((node) => node.id))
        if (selectedNodeIds.size) {
          setNodes((current) => current.filter((node) => !selectedNodeIds.has(node.id)))
          setEdges((current) => current.filter((edge) => !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)))
          setInspectorNodeId((current) => current && selectedNodeIds.has(current) ? null : current)
        } else {
          setEdges((current) => current.filter((edge) => !edge.selected))
        }
        return
      }
      if (typing && event.key === 'Escape') {
        event.preventDefault()
        ;(event.target as HTMLElement).blur()
        return
      }
      if (!typing && event.code === 'Space') {
        event.preventDefault()
        if (event.repeat) return
        document.documentElement.classList.add('is-canvas-space-panning')
        setSpacePanning(true)
      }
      if (!typing && (event.key === 'n' || (event.metaKey && event.key.toLowerCase() === 'k'))) {
        event.preventDefault()
        setPalettePosition(null)
        setPaletteOpen(true)
      }
      if (!typing && event.metaKey && event.key === ',') {
        event.preventDefault()
        setSettingsOpen(true)
      }
      if (!typing && historyAction) {
        event.preventDefault()
        if (historyAction === 'redo') redoCanvas()
        else undoCanvas()
      }
      if (!typing && event.altKey && (event.key === '+' || event.key === '=')) {
        event.preventDefault()
        void zoomIn({ duration: 180 })
      }
      if (!typing && event.altKey && event.key === '-') {
        event.preventDefault()
        void zoomOut({ duration: 180 })
      }
      if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.shiftKey && event.key.toLowerCase() === 'f') {
          const selectedNodes = getNodes().filter((node) => node.selected)
          if (selectedNodes.length === 1) {
            event.preventDefault()
            focusRenderedNode(selectedNodes[0])
            return
          }
        }
        const shortcuts: Partial<Record<string, CanvasTool>> = {
          v: 'select', x: 'cut', l: 'connection', f: 'frame',
        }
        const tool = shortcuts[event.key.toLowerCase()]
        if (tool) {
          event.preventDefault()
          setActiveTool(tool)
        }
        if (event.key.toLowerCase() === 'z') {
          event.preventDefault()
          void fitView({ duration: 300, padding: 0.22 })
        }
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false)
        setQuickConnect(null)
        setPortInspector(null)
        setEdgeMenu(null)
        setContextMenu(null)
        setActiveTool('select')
      }
    }
    const releaseSpacePanning = (releaseReactFlow = false) => {
      document.documentElement.classList.remove('is-canvas-space-panning')
      setSpacePanning(false)
      if (releaseReactFlow) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }))
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      releaseSpacePanning()
    }
    const stopMiddlePanning = () => {
      document.documentElement.classList.remove('is-canvas-middle-panning')
      setMiddlePanning(false)
    }
    const middlePanIsActive = () => document.documentElement.classList.contains('is-canvas-middle-panning')
    const onMouseUp = (event: MouseEvent) => {
      if (middlePanIsActive() && shouldEndMiddleMousePan(event.button, event.buttons)) stopMiddlePanning()
    }
    const onPointerUp = (event: PointerEvent) => {
      if (middlePanIsActive() && shouldEndMiddleMousePan(event.button, event.buttons)) stopMiddlePanning()
    }
    const onPointerCancel = () => { if (middlePanIsActive()) stopMiddlePanning() }
    const onMouseMove = (event: MouseEvent) => {
      if (middlePanIsActive() && !isMiddleMousePressed(event.buttons)) stopMiddlePanning()
    }
    const onVisibilityChange = () => { if (document.hidden) { releaseSpacePanning(true); stopMiddlePanning() } }
    const onBlur = () => {
      releaseSpacePanning(true)
      stopMiddlePanning()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mouseup', onMouseUp, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('pointercancel', onPointerCancel, true)
    window.addEventListener('mousemove', onMouseMove, true)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mouseup', onMouseUp, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerCancel, true)
      window.removeEventListener('mousemove', onMouseMove, true)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.documentElement.classList.remove('is-canvas-space-panning')
      document.documentElement.classList.remove('is-canvas-middle-panning')
    }
  }, [appView, fitView, focusRenderedNode, getNodes, redoCanvas, setEdges, setNodes, undoCanvas, zoomIn, zoomOut])

  const updateNode = useCallback((id: string, patch: Partial<StudioNodeData>, canApply: (current: StudioNode[]) => boolean = () => true) => {
    if(!canApply(promptGraphRef.current.nodes))return
    const sourceBeforePatch = nodes.find((node) => node.id === id)
    const durationOnly = sourceBeforePatch?.data.kind === 'video-generator'
      && Object.keys(patch).every((key) => key === 'duration' || key === 'autoDuration')
      && patch.duration !== undefined
    if (durationOnly) {
      setNodes((current) => applyGeneratorLocalDurationPatch(current, id, {
        duration: patch.duration,
        autoDuration: patch.autoDuration ?? sourceBeforePatch.data.autoDuration,
      }))
      return
    }
    const effectivePatch = sourceBeforePatch ? nodeLifecycleTransition(sourceBeforePatch.data, videoDraftModelTransition(sourceBeforePatch.data, patch)) : patch
    const nextSourceData = sourceBeforePatch ? { ...sourceBeforePatch.data, ...effectivePatch } : undefined
    const dynamicPortChange = Boolean(sourceBeforePatch && (
      sourceBeforePatch.data.kind === 'video-generator' && Object.prototype.hasOwnProperty.call(effectivePatch, 'videoEngine')
      || ['image-generator', 'image-editor'].includes(sourceBeforePatch.data.kind) && (Object.prototype.hasOwnProperty.call(effectivePatch, 'imageProvider') || Object.prototype.hasOwnProperty.call(effectivePatch, 'imageModelId'))
      || sourceBeforePatch.data.kind === 'upscaler' && Object.prototype.hasOwnProperty.call(effectivePatch, 'upscalerModel')
    ))
    if (dynamicPortChange && nextSourceData) {
      const sources = Object.fromEntries(nodes.map((node) => [node.id, node.data]))
      const reconciliation = reconcileDynamicInputEdges(edges, id, nextSourceData, sources)
      setEdges(reconciliation.edges)
      if (reconciliation.removed.length) setConnectionNotice(reconciliation.removed.map(({ message }) => message).join(' '))
      window.requestAnimationFrame(() => updateNodeInternals(id))
    }
    setNodes((current) => {
      if(!canApply(current))return current
      const source = current.find((node) => node.id === id)
      const updatedSourceData = source ? { ...source.data, ...effectivePatch } : undefined
      const styleTargets = source?.data.kind === 'style-reference'
        ? new Set(edges.filter((edge) => edge.source === id && edge.targetHandle === 'style-in').map((edge) => edge.target))
        : new Set<string>()
      return current.map((node) => {
        if (node.id === id) return { ...node, data: updatedSourceData! }
        if (styleTargets.has(node.id) && node.data.kind === 'storyboard') return { ...node, data: { ...node.data, stylePrompt: updatedSourceData?.stylePrompt || updatedSourceData?.prompt, referenceTag: updatedSourceData?.referenceTag, error: undefined } }
        return node
      })
    })
  }, [edges, nodes, setEdges, setNodes, updateNodeInternals])

  const loadFalContract = useCallback(async (endpointId: string) => {
    const current = serviceResponseScope.current!.capture('fal')
    const scope = serviceResponseScope.current!.identity('fal')
    setFalContracts(previous => ({ ...previous, [endpointId]: { ...(previous[endpointId]?.current() ? previous[endpointId] : {}), loading: true, current } }))
    try {
      const contract = await falContractStore.current!.read(scope, endpointId, () => window.prism.services.falSchema(endpointId), current)
      if (!current()) return
      setFalContracts(previous => ({ ...previous, [endpointId]: { contract, current } }))
      for (const node of nodeLayoutRef.current) if (node.data.falNative?.endpointId === endpointId) {
        const before = node.data.falNative
        if (falProductionFlow(contract.category) !== before.flow) { updateNode(node.id, { error: 'The selected model changed its production flow. Review the saved selection.' }); continue }
        const next = reconcileFalNodeBinding(before, contract)
        if (JSON.stringify(next) !== JSON.stringify(before)) updateNode(node.id, { falNative: next })
        window.requestAnimationFrame(() => updateNodeInternals(node.id))
      }
    } catch (error) {
      if (!current()) return
      setFalContracts(previous => ({ ...previous, [endpointId]: { error: error instanceof Error ? error.message : String(error), current } }))
    }
  }, [updateNode, updateNodeInternals])

  const loadHiggsfieldContract = useCallback(async (endpointId: string, refresh = false) => {
    if (!mediaProviderAvailable('higgsfield')) return
    try { if (higgsfieldModel(endpointId).kind === 'genjutsu') return } catch { return }
    const owned = serviceResponseScope.current!.capture('higgsfield'), scope = serviceResponseScope.current!.identity('higgsfield')
    const key = endpointId, revision = (higgsfieldContractRevisions.current.get(key) || 0) + 1
    higgsfieldContractRevisions.current.set(key, revision)
    const current = () => owned() && higgsfieldContractRevisions.current.get(key) === revision
    if (refresh) higgsfieldContractStore.current!.invalidate(scope, endpointId)
    setHiggsfieldContracts(previous => ({ ...previous, [endpointId]: { ...(previous[endpointId]?.current() ? previous[endpointId] : {}), loading: true, error: undefined, current: owned } }))
    try {
      const contract = await higgsfieldContractStore.current!.read(scope, endpointId, () => window.prism.services.higgsfieldSchema(endpointId), owned)
      if (!current()) return
      setHiggsfieldContracts(previous => ({ ...previous, [endpointId]: { contract, current: owned } }))
      for (const node of nodeLayoutRef.current) if (node.data.higgsfieldNative?.endpointId === endpointId) {
        const before = node.data.higgsfieldNative
        try {
          const next = reconcileHiggsfieldNodeBinding(before, contract)
          if (JSON.stringify(next) !== JSON.stringify(before)) updateNode(node.id, { higgsfieldNative: next })
          window.requestAnimationFrame(() => updateNodeInternals(node.id))
        } catch (error) { updateNode(node.id, { error: error instanceof Error ? error.message : String(error) }) }
      }
    } catch (error) {
      if (current()) setHiggsfieldContracts(previous => ({ ...previous, [endpointId]: { error: error instanceof Error ? error.message : String(error), current: owned } }))
    }
  }, [mediaProviderAvailable, updateNode, updateNodeInternals])

  const higgsfieldSchema = useCallback((endpointId: string): HiggsfieldContractView => {
    if (!mediaProviderAvailable('higgsfield')) return { error: 'Enable and connect Higgsfield to load current model inputs.' }
    const entry = higgsfieldContracts[endpointId]
    return entry?.current() ? entry : { loading: true }
  }, [higgsfieldContracts, mediaProviderAvailable])

  const selectFalModel = useCallback((nodeId: string, endpointId: string) => {
    const node = nodeLayoutRef.current.find(candidate => candidate.id === nodeId)
    const model = serviceModels.fal?.models.find(candidate => candidate.id === endpointId)
    const flow = node && falNativeFlowForKind(node.data.kind)
    if (!node || !model || !flow || falProductionFlow(model.category) !== flow) return
    const connectedHandles = new Set(edges.filter(edge => edge.target === nodeId).map(edge => edge.targetHandle))
    const presets = { ...(node.data.falNativePresets || {}), ...(node.data.falNative ? { [node.data.falNative.endpointId]: node.data.falNative } : {}) }
    const state: FalNativeNodeState = node.data.falNative?.endpointId === endpointId ? node.data.falNative : { ...(presets[endpointId] || { endpointId, label: model.label, flow, values: {}, media: [] }), retiredPorts: nodeInputPorts(node.data).filter(port => connectedHandles.has(port.id)).map(({ id, label, signal }) => ({ id, label, signal })) }
    updateNode(nodeId, { ...preserveHiggsfieldSelection(node.data), falNative: state, falNativePresets: presets, error: undefined })
    void loadFalContract(endpointId)
  }, [edges, loadFalContract, serviceModels.fal, updateNode])

  const refreshHiggsfieldPresets = useCallback(async (refresh = false) => {
    if (!serviceConnections.higgsfield) return
    const current = serviceResponseScope.current!.capture('higgsfield')
    setHiggsfieldPresetState(previous => ({ ...(previous.current?.() ? previous : {}), loading: true, current }))
    try {
      const presets: HiggsfieldPreset[] = await window.prism.services.higgsfieldPresets(refresh)
      if (current()) setHiggsfieldPresetState({ presets, current })
    } catch (error) {
      if (current()) setHiggsfieldPresetState(previous => ({ ...(previous.current?.() ? previous : {}), loading: false, error: error instanceof Error ? error.message : String(error), current }))
    }
  }, [serviceConnections.higgsfield])
  const higgsfieldPresets = useCallback((): HiggsfieldPresetView => higgsfieldPresetState.current?.() ? higgsfieldPresetState : { loading: serviceConnections.higgsfield, error: serviceConnections.higgsfield ? undefined : 'Connect Higgsfield to load current presets.' }, [higgsfieldPresetState, serviceConnections.higgsfield])
  higgsfieldJobOwner.current = JSON.stringify([project?.id, project?.rootPath, activeCanvasId, activePageId])
  const refreshHiggsfieldJobs = useCallback(async () => {
    if (!project) return
    const owner = higgsfieldJobOwner.current, owned = serviceResponseScope.current!.capture('higgsfield'), revision = ++higgsfieldJobRevision.current
    const current = () => owned() && higgsfieldJobOwner.current === owner
    setHiggsfieldJobState(previous => ({ ...(previous.current?.() ? previous : {}), loading: true, error: undefined, current }))
    try {
      const jobs = await window.prism.generation.higgsfieldJobs()
      if (current() && revision === higgsfieldJobRevision.current) setHiggsfieldJobState(previous => ({ jobs, loading: false, busy: previous.current?.() ? previous.busy : undefined, current }))
    } catch (error) {
      if (current() && revision === higgsfieldJobRevision.current) setHiggsfieldJobState(previous => ({ ...(previous.current?.() ? previous : {}), loading: false, error: error instanceof Error ? error.message : String(error), current }))
    }
  }, [project])
  const higgsfieldJobs = useCallback((): HiggsfieldJobsView => higgsfieldJobState.current?.() ? higgsfieldJobState : { loading: Boolean(project) }, [higgsfieldJobState, project])
  const applyHiggsfieldJobAction = useCallback(async (command: HiggsfieldJobCommand) => {
    const owner = higgsfieldJobOwner.current, owned = serviceResponseScope.current!.capture('higgsfield')
    const current = () => owned() && higgsfieldJobOwner.current === owner
    setHiggsfieldJobState(previous => ({ ...(previous.current?.() ? previous : {}), busy: command.nodeId, error: undefined, current }))
    try {
      const { result } = await window.prism.generation.higgsfieldAction(command)
      if (!current()) return
      if (result && nodeLayoutRef.current.some(node => node.id === command.nodeId)) {
        const generatedResults = mergeLiveGeneratedResults(nodeLayoutRef.current.find(node => node.id === command.nodeId)?.data.generatedResults || [], [{ path: result.outputPath, url: result.outputUrl, type: result.outputType, modelId: result.modelId, createdAt: new Date().toISOString() }])
        updateNode(command.nodeId, { runState: 'complete', progress: 'Recovered original Higgsfield result', error: undefined, modelId: result.modelId, outputPath: result.outputPath, outputUrl: result.outputUrl, outputType: result.outputType, generatedResults, activeResultIndex: Math.max(0, generatedResults.findIndex(item => item.path === result.outputPath)), runStartedAt: undefined })
        userMutationArmed.current = true; mutationVersion.current += 1; saveLifecycle.current?.markDirty()
        const [history, assets] = await Promise.all([window.prism.history.list(), window.prism.assets.list()])
        if (current()) { setHistory(history); setAssets(assets) }
      }
      if (current()) await refreshHiggsfieldJobs()
    } catch (error) {
      if (current()) setHiggsfieldJobState(previous => ({ ...(previous.current?.() ? previous : {}), error: error instanceof Error ? error.message : String(error), current }))
    } finally {
      if (current()) setHiggsfieldJobState(previous => ({ ...previous, busy: undefined }))
    }
  }, [refreshHiggsfieldJobs, updateNode])
  useEffect(() => { if (project && projectReady) void refreshHiggsfieldJobs() }, [project?.id, project?.rootPath, projectReady, activeCanvasId, activePageId, serviceProfiles, refreshHiggsfieldJobs])

  const selectHiggsfieldModel = useCallback((nodeId: string, endpointId: string) => {
    const node = nodeLayoutRef.current.find(candidate => candidate.id === nodeId)
    if (!node || node.data.kind !== 'video-generator') return
    try {
      const connected = new Set(edges.filter(edge => edge.target === nodeId).map(edge => edge.targetHandle))
      const patch = selectHiggsfieldBinding(node.data, endpointId, nodeInputPorts(node.data).filter(port => connected.has(port.id)))
      updateNode(nodeId, { ...preserveFalNativeSelection(node.data), ...patch, ...(higgsfieldModel(endpointId).kind === 'genjutsu' ? { promptMode: 'manual' as const } : {}), error: undefined })
      void loadHiggsfieldContract(endpointId)
      window.requestAnimationFrame(() => updateNodeInternals(nodeId))
    } catch (error) { updateNode(nodeId, { error: error instanceof Error ? error.message : String(error) }) }
  }, [edges, loadHiggsfieldContract, updateNode, updateNodeInternals])
  const selectedHiggsfieldEndpoints = [...new Set(nodes.flatMap(node => {
    const state = node.data.higgsfieldNative
    if (!state) return []
    try { return higgsfieldModel(state.endpointId).kind !== 'genjutsu' ? [state.endpointId] : [] } catch { return [] /* preserve unavailable saved routes */ }
  }))].sort().join('\n')
  useEffect(() => {
    if (!mediaProviderAvailable('higgsfield') || !selectedHiggsfieldEndpoints) return
    const refresh = () => { for (const endpointId of selectedHiggsfieldEndpoints.split('\n')) void loadHiggsfieldContract(endpointId) }
    refresh()
    const timer = window.setInterval(refresh, 10 * 60_000)
    return () => window.clearInterval(timer)
  }, [loadHiggsfieldContract, mediaProviderAvailable, selectedHiggsfieldEndpoints, serviceModels.higgsfield, serviceProfiles, project?.id, project?.rootPath])
  const hasHiggsfieldRestyle = nodes.some(node => node.data.higgsfieldNative?.endpointId === 'higgsfield/genjutsu/restyle/v1.0')
  useEffect(() => {
    if (!hasHiggsfieldRestyle || !serviceConnections.higgsfield) return
    void refreshHiggsfieldPresets()
    const timer = window.setInterval(() => { void refreshHiggsfieldPresets() }, 10 * 60_000)
    return () => window.clearInterval(timer)
  }, [hasHiggsfieldRestyle, refreshHiggsfieldPresets, serviceConnections.higgsfield, serviceModels.higgsfield, serviceProfiles, project?.id, project?.rootPath])

  const falSchema = useCallback((endpointId: string) => {
    const entry = falContracts[endpointId]
    return entry?.current() ? entry : { loading: true, contract: undefined, error: undefined }
  }, [falContracts])

  const selectedFalEndpoints = [...new Set(nodes.flatMap(node => node.data.falNative ? [node.data.falNative.endpointId] : []))].sort().join('\n')
  useEffect(() => {
    if (!serviceConnections.fal) return
    for (const endpointId of selectedFalEndpoints.split('\n').filter(Boolean)) void loadFalContract(endpointId)
  }, [loadFalContract, selectedFalEndpoints, serviceConnections.fal, serviceModels.fal, serviceProfiles, project?.id, project?.rootPath])

  const resetNodeSettings = useCallback((id: string) => {
    setNodes((current) => current.map((node) => {
      if (node.id !== id) return node
      const state = node.data.higgsfieldNative, view = state ? higgsfieldSchema(state.endpointId) : undefined
      let schemaNative = false
      try { schemaNative = Boolean(state && higgsfieldModel(state.endpointId).kind !== 'genjutsu') } catch { schemaNative = Boolean(state) }
      if (schemaNative && (!view?.contract || view.loading || view.error)) return { ...node, data: { ...node.data, error: 'Load current Higgsfield model inputs before resetting; saved values are preserved.' } }
      return { ...node, data: { ...node.data, ...resetNodeSettingsPatch(node.data), ...(state && view?.contract ? { higgsfieldNative: resetHiggsfieldBinding(state, view.contract) } : {}) } }
    }))
  }, [setNodes, higgsfieldSchema])

  useEffect(() => {
    setEdges(current => directStoryboardStyles(nodes, current))
  }, [nodes, setEdges])

  const deleteNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id))
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id))
    setInspectorNodeId((current) => current === id ? null : current)
  }, [setEdges, setNodes])

  useEffect(() => {
    setNodes((current) => current.some((node) => node.data.kind === 'assistant') ? current.map(mergeAssistantIntoPrompt) : current)
    setPages((current) => current.some((page) => page.nodes.some((node) => node.data.kind === 'assistant')) ? current.map((page) => page.nodes.some((node) => node.data.kind === 'assistant') ? { ...page, nodes: page.nodes.map(mergeAssistantIntoPrompt) } : page) : current)
  }, [nodes, pages, setNodes])

  const duplicateNode = useCallback((id: string) => {
    setNodes((current) => {
      const source = current.find((node) => node.id === id)
      if (!source) return current
      const placement = duplicateNodePosition(source, current)
      const duplicate = duplicateNodeSnapshot(
        source,
        crypto.randomUUID(),
        placement.position,
      )
      duplicate.data.duplicateRootId = placement.duplicateRootId
      duplicate.data.duplicateStackIndex = placement.duplicateStackIndex
      duplicate.data.duplicateExpectedPosition = placement.position
      if (['character', 'element', 'location', 'wardrobe', 'style-reference', 'storyboard'].includes(source.data.kind)) duplicate.data.selectorDeployment = true
      nodeLayoutRef.current = [...current, duplicate]
      return [...current, duplicate]
    })
  }, [setNodes])

  const copyNodes = useCallback((nodeIds: string[]) => {
    const idSet = new Set(nodeIds)
    canvasClipboard.current = {
      nodes: structuredClone(nodes.filter((node) => idSet.has(node.id))),
      edges: structuredClone(edges.filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))),
    }
    void window.prism.assets.markCanvasCopy()
  }, [edges, nodes])

  const pasteNodes = useCallback((position: XYPosition) => {
    const copied = canvasClipboard.current
    if (!copied?.nodes.length) return
    const minX = Math.min(...copied.nodes.map((node) => node.position.x))
    const minY = Math.min(...copied.nodes.map((node) => node.position.y))
    const ids = new Map(copied.nodes.map((node) => [node.id, crypto.randomUUID()]))
    const pastedNodes = remapCopiedNodeGroups(copied.nodes.map((node) => ({
      ...structuredClone(node),
      id: ids.get(node.id)!,
      selected: true,
      position: { x: position.x + node.position.x - minX, y: position.y + node.position.y - minY },
      data: { ...structuredClone(node.data), title: `${node.data.title} copy`, runState: 'idle' as const, progress: undefined, error: undefined },
    })))
    const pastedEdges = copied.edges.map((edge) => ({
      ...structuredClone(edge),
      id: crypto.randomUUID(),
      source: ids.get(edge.source)!,
      target: ids.get(edge.target)!,
      selected: false,
    }))
    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), ...pastedNodes])
    setEdges((current) => [...current, ...pastedEdges])
  }, [setEdges, setNodes])

  const deleteNodes = useCallback((nodeIds: string[]) => {
    const idSet = new Set(nodeIds)
    setNodes((current) => current.filter((node) => !idSet.has(node.id)))
    setEdges((current) => current.filter((edge) => !idSet.has(edge.source) && !idSet.has(edge.target)))
    setInspectorNodeId((current) => current && idSet.has(current) ? null : current)
  }, [setEdges, setNodes])

  const frameNodes = useCallback((nodeIds: string[]) => {
    const selected = nodes.filter((node) => nodeIds.includes(node.id) && node.data.kind !== 'frame')
    if (!selected.length) return
    const left = Math.min(...selected.map((node) => node.position.x))
    const top = Math.min(...selected.map((node) => node.position.y))
    const right = Math.max(...selected.map((node) => node.position.x + Number(node.measured?.width || node.style?.width || 320)))
    const bottom = Math.max(...selected.map((node) => node.position.y + Number(node.measured?.height || node.style?.height || 260)))
    const frame: StudioNode = {
      id: crypto.randomUUID(),
      type: 'frame',
      position: { x: left - 46, y: top - 58 },
      data: { ...initialData('frame'), title: `Scene ${nodes.filter((node) => node.data.kind === 'frame').length + 1}` },
      style: { width: right - left + 92, height: bottom - top + 104 },
      zIndex: -1,
    }
    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), { ...frame, selected: true }])
  }, [nodes, setNodes])

  const toggleNodesLocked = useCallback((nodeIds: string[]) => {
    const idSet = new Set(nodeIds)
    const shouldLock = nodes.filter((node) => idSet.has(node.id)).some((node) => !node.data.locked)
    setNodes((current) => current.map((node) => idSet.has(node.id) ? { ...node, data: { ...node.data, locked: shouldLock } } : node))
  }, [nodes, setNodes])

  const alignNodes = useCallback((nodeIds: string[], alignment: NodeAlignment) => {
    const idSet = new Set(nodeIds)
    setNodes((current) => {
      const movable = current.filter((node) => idSet.has(node.id) && !node.data.locked)
      const positions = alignedNodePositions(movable, alignment)
      return current.map((node) => positions.has(node.id) ? { ...node, position: positions.get(node.id)! } : node)
    })
  }, [setNodes])

  const setNodeRole = useCallback(async (nodeId: string, role: 'character' | 'element' | 'location' | 'wardrobe' | 'style-reference') => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return
    const label = role === 'style-reference' ? 'Style' : role[0].toUpperCase() + role.slice(1)
    const paths = [...new Set([node.data.outputPath, node.data.assetPath, ...(node.data.generatedResults || []).map((item) => item.path)].filter((path): path is string => Boolean(path)))]
    try {
      const logicalName = normalizeLogicalAssetName(node.data.referenceTag || node.data.title || label)
      const promoted = paths.length ? await window.prism.assets.promote(paths, role, logicalName) : []
      const finalized = await Promise.all(promoted.map((asset) => window.prism.assets.updateMetadata(asset.id, { ...asset.metadata, assetName: logicalName })))
      updateNode(nodeId, { kind: role, title: logicalName, referenceTag: `@${logicalName}`, referenceAssets: finalized.length ? finalized : node.data.referenceAssets, outputPath: undefined, outputUrl: undefined, generatedResults: undefined })
      if (finalized.length) setAssets((current) => [...finalized, ...current.filter((asset) => !finalized.some((item) => item.id === asset.id))])
    } catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [nodes, updateNode])

  const focusNode = useCallback((id: string) => {
    const target = getNodes().find((node) => node.id === id)
    if (target) focusRenderedNode(target)
  }, [focusRenderedNode, getNodes])

  const copyNodeLink = useCallback(async (id: string) => {
    await navigator.clipboard.writeText(`prism-foundry://workflow/${workflow.id}/node/${id}`)
    updateNode(id, { progress: 'Node link copied' })
  }, [updateNode, workflow.id])

  const chooseProject = useCallback(async (mode: 'create' | 'open') => {
    setProjectError('')
    try {
      const selected = mode === 'create' ? await window.prism.projects.create() : await window.prism.projects.open()
      if (selected) await activateProject(selected)
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [activateProject])

  const openProjectDocument = useCallback(async () => {
    setProjectError('')
    try {
      const opened = await window.prism.projects.openDocument()
      if (opened) await activateProject(opened)
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [activateProject])

  const openRecentProject = useCallback(async (rootPath: string) => {
    setProjectError('')
    try { await activateProject(await window.prism.projects.openRecent(rootPath)) }
    catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [activateProject])

  const applyRelinkResult = useCallback(async (result: AssetRelinkResult | null) => {
    if (!result) return null
    const replaceAll = (node: StudioNode) => result.replacements.reduce((current, replacement) => replaceAssetInNode(current, replacement.from, replacement.asset), node)
    setNodes((current) => current.map(replaceAll))
    setPages((current) => current.map((page) => ({ ...page, nodes: page.nodes.map(replaceAll) })))
    setAssets(result.assets)
    setMissingAssetIds((await window.prism.assets.status()).filter((item) => item.missing).map((item) => item.asset.id))
    setHistory(await window.prism.history.list())
    setProjectNotice(result.missing ? `${result.relinked} asset${result.relinked === 1 ? '' : 's'} relinked · ${result.missing} still missing` : `${result.relinked} asset${result.relinked === 1 ? '' : 's'} relinked`)
    return result
  }, [setNodes])

  const relinkAsset = useCallback((assetId: string) => {
    setAssetErrorNotice('')
    setRelinkChoiceAssetId(assetId)
  }, [])

  const performRelinkAsset = useCallback(async (assetId: string, mode: AssetRelinkMode) => {
    setRelinkChoiceAssetId(null)
    setAssetErrorNotice('')
    setProjectError('')
    setProjectNotice('')
    setAssetRelinkStates((current) => ({ ...current, [assetId]: 'finding' }))
    try {
      const result = await applyRelinkResult(await window.prism.assets.relink(assetId, mode))
      if (!result) {
        setAssetRelinkStates((current) => { const next = { ...current }; delete next[assetId]; return next })
        return
      }
      const foundIds = result.replacements.map((replacement) => replacement.asset.id)
      if (!foundIds.includes(assetId)) throw new Error('No exact-name media match was found in the selected location.')
      setAssetRelinkStates((current) => ({ ...current, ...Object.fromEntries(foundIds.map((id) => [id, 'found' as const])) }))
      const collections = groupSemanticAssets(result.assets)
      const foundKeys = foundIds.map((id) => {
        const asset = result.assets.find((candidate) => candidate.id === id)
        const collection = collections.find((candidate) => candidate.assets.some((item) => item.id === id))
        return collection ? `semantic:${collection.key}` : asset?.category === 'style' ? `style-asset:${id}` : `media:${id}`
      })
      setSelectedAssetKeys((current) => [...new Set([...current, ...foundKeys])])
      if (foundKeys.length) setSelectedCanvasAssetKey(foundKeys.at(-1) || null)
      window.setTimeout(() => setAssetRelinkStates((current) => {
        const next = { ...current }
        foundIds.forEach((id) => delete next[id])
        return next
      }), 2000)
    } catch (error) {
      setAssetRelinkStates((current) => ({ ...current, [assetId]: 'offline' }))
      setAssetErrorNotice(error instanceof Error ? error.message : String(error))
    }
  }, [applyRelinkResult, assets])

  const relinkAllMissing = useCallback(async () => {
    try { await applyRelinkResult(await window.prism.assets.relinkMissing()) }
    catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [applyRelinkResult])

  const assetVisualState = useCallback((assetId: string): MediaOfflineVisualState | undefined => {
    return assetRelinkStates[assetId] || (missingAssetIds.includes(assetId) ? 'offline' : undefined)
  }, [assetRelinkStates, missingAssetIds])

  const disconnectProject = useCallback(async () => {
    try {
      await runAfterSuccessfulFlush(
        async () => saveState === 'saved' || saveState === 'success' ? true : persistWorkflow(),
        async () => {
          setProjectError('')
          setLauncherSection('home')
          serviceResponseScope.current!.invalidate()
          serviceAvailabilityStop.current?.()
          setServiceModels({})
          setServiceAccounts({})
          projectActivation.current += 1
          closePortraitDialog()
          serviceReadiness.current.invalidate()
          serviceBusyOperations.current = { count: 0 }
          setServiceBusy(false)
          loaded.current = false
          await window.prism.projects.close()
          const availableProjects = await window.prism.projects.recent()
          loaded.current = false
          setRecentProjects(availableProjects)
          setProject(null)
          setAssets([])
          setMissingAssetIds([])
          setHistory([])
          setPages([])
          setNodes([])
          setEdges([])
        },
      )
    } catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [persistWorkflow, saveState, setEdges, setNodes])

  const cleanInheritedTestData = useCallback(async () => {
    if (!project) return
    try {
      const result = await window.prism.projects.removeLegacyImport()
      setProjectNotice(`Removed ${result.removedAssets} inherited asset${result.removedAssets === 1 ? '' : 's'} and ${result.removedNodes} inherited node${result.removedNodes === 1 ? '' : 's'}. Backup JSON is in the project’s Legacy Import Backup folder.`)
      await activateProject(project)
    } catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [activateProject, project])

  const renameAssetTo = useCallback(async (assetId: string, rawName: string) => {
    const previous = assets.find((asset) => asset.id === assetId)
    if (!previous || !rawName.trim()) return
    try {
      const reusable = isReusableAsset(previous)
      const nextName = reusable ? normalizeLogicalAssetName(rawName) : mediaRenameStem(rawName)
      if (!nextName) return
      if (reusable) {
        const previousLogicalName = assetDisplayName(previous)
        const collectionAssets = assets.filter((asset) => isReusableAsset(asset) && asset.category === previous.category && assetDisplayName(asset) === previousLogicalName)
        const renamedAssets = await window.prism.assets.updateCollection(collectionAssets.map((asset) => asset.id), { assetName: nextName })
        const replacements = new Map(renamedAssets.map((asset) => [asset.id, asset]))
        const replaceLogicalAsset = (node: StudioNode): StudioNode => applyLogicalAssetRenameToNode(node, replacements, nextName)
        setAssets((current) => current.map((asset) => replacements.get(asset.id) || asset))
        setNodes((current) => current.map(replaceLogicalAsset))
        setPages((current) => current.map((page) => ({ ...page, nodes: page.nodes.map(replaceLogicalAsset) })))
      } else {
        const renamed = await window.prism.assets.rename(assetId, nextName)
        const replaceRenamedAsset = (node: StudioNode) => replaceRenamedAssetInNode(node, previous.path, renamed, nextName)
        setAssets((current) => current.map((asset) => asset.id === assetId ? renamed : asset))
        setNodes((current) => current.map(replaceRenamedAsset))
        setPages((current) => current.map((page) => ({ ...page, nodes: page.nodes.map(replaceRenamedAsset) })))
      }
      setHistory(await window.prism.history.list())
      setRenamingAssetId(null)
      setRenameDraft('')
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [assets, setNodes])

  const renameAsset = useCallback(async (assetId: string) => {
    await renameAssetTo(assetId, renameDraft)
  }, [renameAssetTo, renameDraft])

  const renameSemanticAssetCollection = useCallback(async (collectionAssets: ImportedAsset[]) => {
    const name = normalizeLogicalAssetName(renameDraft)
    if (!collectionAssets.length || !name) return
    try {
      const renamedAssets = await window.prism.assets.updateCollection(collectionAssets.map((asset) => asset.id), { assetName: name })
      const replacements = new Map(renamedAssets.map((asset) => [asset.id, asset]))
      const replaceLogicalAsset = (node: StudioNode): StudioNode => applyLogicalAssetRenameToNode(node, replacements, name)
      setAssets((current) => current.map((asset) => replacements.get(asset.id) || asset))
      setNodes((current) => current.map(replaceLogicalAsset))
      setPages((current) => current.map((page) => ({ ...page, nodes: page.nodes.map(replaceLogicalAsset) })))
      setRenamingAssetId(null)
      setRenameDraft('')
      setProjectNotice(`Renamed reusable asset to “${name}” across Assets and Canvas.`)
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [renameDraft, setNodes])

  const favoriteSemanticAssetCollection = useCallback(async (collectionAssets: ImportedAsset[], favorite: boolean) => {
    try {
      const updatedAssets = await window.prism.assets.updateCollection(collectionAssets.map((asset) => asset.id), { favorite })
      const replacements = new Map(updatedAssets.map((asset) => [asset.id, asset]))
      setAssets((current) => current.map((asset) => replacements.get(asset.id) || asset))
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  const renameNodeAsset = useCallback(async (nodeId: string, rawName: string) => {
    const source = nodes.find((node) => node.id === nodeId)
    if (!source || !hasMaterializedAsset(source.data)) return
    const semanticReferences = (source.data.referenceAssets || []).filter((asset) => isReusableAsset(asset))
    const name = semanticReferences.length ? normalizeLogicalAssetName(rawName) : mediaRenameStem(rawName)
    if (!name) return
    try {
      if (semanticReferences.length) {
        const renamedAssets = await window.prism.assets.updateCollection(semanticReferences.map((asset) => asset.id), { assetName: name })
        const replacements = new Map(renamedAssets.map((asset) => [asset.id, asset]))
        const replaceLogicalAsset = (node: StudioNode): StudioNode => applyLogicalAssetRenameToNode(node, replacements, name)
        setAssets((current) => current.map((asset) => replacements.get(asset.id) || asset))
        setNodes((current) => current.map(replaceLogicalAsset))
        setPages((current) => current.map((page) => ({ ...page, nodes: page.nodes.map(replaceLogicalAsset) })))
      } else {
        const path = activeGeneratedResult(source.data)?.path || source.data.assetPath || source.data.outputPath
        const previous = assets.find((asset) => asset.path === path)
        if (previous) {
          const renamed = await window.prism.assets.rename(previous.id, name)
          const replaceRenamedAsset = (node: StudioNode) => node.id === nodeId
            ? replaceRenamedAssetInNode(node, previous.path, renamed, name)
            : replaceAssetInNode(node, previous.path, renamed)
          setAssets((current) => current.map((asset) => asset.id === previous.id ? renamed : asset))
          setNodes((current) => current.map(replaceRenamedAsset))
          setPages((current) => current.map((page) => ({ ...page, nodes: page.nodes.map(replaceRenamedAsset) })))
        } else {
          updateNode(nodeId, { title: name, referenceTag: workflowTag({ kind: source.data.kind, title: name }, 'asset') })
        }
      }
      setProjectNotice(`Renamed asset to “${name}”.`)
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [assets, nodes, setNodes, updateNode])

  const createNode = useCallback((kind: NodeKind, position?: XYPosition) => {
    const existingNodes = nodeLayoutRef.current
    const count = existingNodes.length
    const referenceIndex = existingNodes.filter((node) => node.data.kind === kind).length + 1
    const desiredPosition = position || { x: 180 + (count % 3) * 350, y: 150 + Math.floor(count / 3) * 390 }
    const node: StudioNode = {
      id: crypto.randomUUID(),
      type: kind === 'frame' ? 'frame'
        : kind === 'comment' ? 'comment'
          : kind === 'sticky-note' ? 'sticky'
            : kind === 'sticker' ? 'sticker'
              : kind === 'drawing' ? 'drawing'
                : kind === 'list' ? 'list'
                  : kind === 'router' ? 'router'
                    : kind === 'storyboard' ? 'storyboard'
                      : kind === 'storyboard-asset' ? 'storyboard-asset'
                          : kind === 'assistant' ? 'assistant'
                : 'studio',
      position: desiredPosition,
      data: {
        ...initialData(kind),
        title: ['character', 'location', 'element', 'style-reference'].includes(kind)
          ? `${palette.find((item) => item.kind === kind)?.label || 'Reference'} ${referenceIndex}`
          : initialData(kind).title,
        referenceTag: undefined,
      },
      style: kind === 'frame' ? { width: 580, height: 430 }
        : kind === 'comment' || kind === 'sticky-note' ? { width: 240 }
          : kind === 'sticker' ? { width: 92, height: 92 }
            : kind === 'image-generator' || kind === 'video-generator' || kind === 'router' ? undefined
              : { width: STANDARD_NODE_WIDTH },
      zIndex: kind === 'frame' ? -1 : undefined,
    }
    nodeLayoutRef.current = [...existingNodes, node]
    setNodes((current) => [...current, node])
    return node.id
  }, [setNodes])

  const adjustVoiceoverQuantity = useCallback((nodeId: string, delta: -1 | 1) => {
    const source = nodes.find((node) => node.id === nodeId && node.data.kind === 'voiceover')
    if (!source) return
    const quantity = Math.min(4, Math.max(1, (source.data.quantity || 1) + delta))
    updateNode(nodeId, { quantity })
    if (quantity <= 1 || edges.some((edge) => edge.source === nodeId && nodes.find((node) => node.id === edge.target)?.data.kind === 'list')) return
    const listId = createNode('list', { x: source.position.x + 360, y: source.position.y })
    updateNode(listId, { title: 'Voiceover List' })
    setEdges((current) => addEdge({ id: crypto.randomUUID(), source: nodeId, sourceHandle: 'media-out', target: listId, targetHandle: 'input', animated: false, style: { stroke: '#ff83a8', strokeWidth: 2 } }, current))
  }, [createNode, edges, nodes, setEdges, updateNode])

  const addNode = useCallback((kind: NodeKind) => {
    const visibleCanvasWidth = window.innerWidth - (assetBrowserOpen && appView === 'canvas' ? 378 : 0)
    const visibleCenter = screenToFlowPosition({ x: visibleCanvasWidth / 2, y: 64 + (window.innerHeight - 64) / 2 })
    const position = palettePosition || centeredNodePosition(visibleCenter, kind)
    createNode(kind, position)
    setPaletteOpen(false)
    setPaletteQuery('')
    setPalettePosition(null)
  }, [appView, assetBrowserOpen, createNode, palettePosition, screenToFlowPosition, setEdges, updateNode])

  const createUploadAt = useCallback(async (position: XYPosition) => {
    const id = createNode('upload', position)
    const asset = await window.prism.assets.import('upload', 'Media')
    if (!asset) return undefined
    const url = asset.url || `prism-asset://local/${encodeURIComponent(asset.path)}`
    setAssets((current) => [asset, ...current.filter((candidate) => candidate.id !== asset.id)])
    updateNode(id, {
      ...mediaAssetDescriptionPatch(asset),
      assetPath: asset.path,
      assetUrl: url,
      outputType: asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image',
      title: asset.name,
    })
    return { id, asset }
  }, [createNode, updateNode])

  const placeImportedAssets = useCallback((imported: ImportedAsset[], position: XYPosition) => {
    if (!imported.length) return
    setAssets((current) => [...imported, ...current.filter((candidate) => !imported.some((asset) => asset.id === candidate.id))])
    const category = imported[0].category
    const semanticKind = category === 'character' ? 'character' : category === 'element' ? 'element' : category === 'location' ? 'location' : category === 'wardrobe' ? 'wardrobe' : category === 'style' ? 'style-reference' : undefined
    if (semanticKind && imported.every((asset) => asset.category === category)) {
      const nodeId = createNode(semanticKind, position)
      const displayName = imported[0].name.replace(/\.[^.]+$/, '')
      updateNode(nodeId, {
        title: displayName,
        referenceTag: `@${displayName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`,
        referenceAssets: imported,
        assetPath: imported[0].path,
        assetUrl: imported[0].url,
        outputType: 'image',
      })
      return
    }
    imported.forEach((asset, index) => {
      const nodeId = createNode('upload', { x: position.x + (index % 3) * 330, y: position.y + Math.floor(index / 3) * 310 })
      updateNode(nodeId, {
        title: asset.name,
        ...mediaAssetDescriptionPatch(asset),
      assetPath: asset.path,
        assetUrl: asset.url,
        outputType: asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image',
      })
    })
  }, [createNode, updateNode])

  const pasteClipboardImages = useCallback(async () => {
    const imported = await window.prism.assets.pasteImages()
    if (imported === null) return false
    const visibleCanvasWidth = window.innerWidth - (assetBrowserOpen && appView === 'canvas' ? 378 : 0)
    const point = lastCanvasPointer.current || { x: visibleCanvasWidth / 2, y: 64 + (window.innerHeight - 64) / 2 }
    const position = screenToFlowPosition(point)
    if (imported.length) placeImportedAssets(imported, position)
    else pasteNodes(position)
    return true
  }, [appView, assetBrowserOpen, pasteNodes, placeImportedAssets, screenToFlowPosition])

  const handleCanvasDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('.canvas-assets-panel')) return
    if (!event.dataTransfer.types.includes('Files') && !event.dataTransfer.types.includes(CANVAS_ASSET_DRAG_MIME)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleCanvasDrop = useCallback(async (event: ReactDragEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('.canvas-assets-panel')) return
    const internalPayload = event.dataTransfer.getData(CANVAS_ASSET_DRAG_MIME)
    if (!internalPayload && !event.dataTransfer.files.length) return
    event.preventDefault()
    event.stopPropagation()
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    if (internalPayload) {
      try {
        const payload = JSON.parse(internalPayload) as CanvasAssetDragPayload
        let nodeId: string | undefined
        if (payload.kind === 'semantic') {
          const collection = groupSemanticAssets(assets.filter((asset) => !asset.trashedAt)).find((candidate) => candidate.key === payload.key)
          if (!collection) throw new Error('This reusable asset is no longer available.')
          nodeId = createNode(collection.category, position)
          const prompt = collection.assets.find((asset) => asset.metadata?.prompt)?.metadata?.prompt || ''
          updateNode(nodeId, {
            title: collection.name,
            referenceTag: `@${collection.name}`,
            referenceAssets: collection.assets,
            ...reusableAssetHydrationPatch(collection.category, collection.assets),
            prompt,
            ...(collection.category === 'character' ? { characterRole: undefined, characterEditorOpen: false } : { semanticEditorOpen: false }),
            progress: `${collection.assets.length} ${collection.category} view${collection.assets.length === 1 ? '' : 's'} ready`,
            error: undefined,
          })
        } else if (payload.kind === 'media') {
          const asset = assets.find((candidate) => candidate.id === payload.assetId && !candidate.trashedAt)
          if (!asset) throw new Error('This media asset is no longer available.')
          if (missingAssetIds.includes(asset.id)) throw new Error('Relink this asset before adding it to Canvas.')
          nodeId = createNode('upload', position)
          updateNode(nodeId, {
            title: asset.name,
            ...mediaAssetDescriptionPatch(asset),
            assetPath: asset.path,
            assetUrl: asset.url || `prism-asset://local/${encodeURIComponent(asset.path)}`,
            outputType: asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image',
            progress: 'Added from your local library',
            error: undefined,
          })
        } else if (payload.kind === 'built-in-style') {
          const preset = STYLE_PRESETS.find((candidate) => candidate.id === payload.presetId)
          if (!preset) throw new Error('This built-in Style is no longer available.')
          nodeId = createNode('style-reference', position)
          updateNode(nodeId, { title: preset.title, referenceTag: `@${preset.id}`, prompt: preset.prompt, stylePrompt: preset.prompt, styleDescription: preset.description, stylePresetId: preset.id, styleSavedAt: undefined, styleEditorOpen: false })
        } else if (payload.kind === 'style-asset') {
          const asset = assets.find((candidate) => candidate.id === payload.assetId && !candidate.trashedAt)
          if (!asset) throw new Error('This Style asset is no longer available.')
          const title = assetDisplayName(asset) || 'Preset Style'
          const prompt = asset.metadata?.prompt || ''
          nodeId = createNode('style-reference', position)
          updateNode(nodeId, { title, referenceTag: `@${title}`, prompt, stylePrompt: prompt, styleDescription: asset.metadata?.styleDescription, referenceAssets: [asset], styleSavedAt: asset.createdAt, styleEditorOpen: false })
        } else {
          const sourcePage = payload.pageId === activePageId ? { nodes, edges } : pages.find((page) => page.id === payload.pageId)
          const source = sourcePage?.nodes.find((node) => node.id === payload.nodeId)
          if (!source) throw new Error('This reusable Canvas asset is no longer available.')
          nodeId = createNode(source.data.kind, position)
          updateNode(nodeId, { ...structuredClone(source.data), groupId: undefined, error: undefined })
          if (source.data.kind === 'storyboard') {
            const upstreamKinds = new Set<NodeKind>(['character', 'wardrobe', 'element', 'location'])
            const incoming = (sourcePage?.edges || []).filter((edge) => edge.target === source.id)
            const clonedSources = new Map<string, string>()
            for (const incomingEdge of incoming) {
              const dependency = sourcePage?.nodes.find((candidate) => candidate.id === incomingEdge.source && upstreamKinds.has(candidate.data.kind))
              if (!dependency || clonedSources.has(dependency.id)) continue
              const dependencyId = createNode(dependency.data.kind, {
                x: position.x + dependency.position.x - source.position.x,
                y: position.y + dependency.position.y - source.position.y,
              })
              clonedSources.set(dependency.id, dependencyId)
              updateNode(dependencyId, {
                ...structuredClone(dependency.data),
                groupId: undefined,
                linkedStoryboardId: undefined,
                error: undefined,
              })
            }
            const clonedEdges = incoming.flatMap((incomingEdge) => {
              const sourceId = clonedSources.get(incomingEdge.source)
              if (!sourceId) return []
              return [{ ...structuredClone(incomingEdge), id: crypto.randomUUID(), source: sourceId, target: nodeId! }]
            })
            if (clonedEdges.length) setEdges((current) => [...current, ...clonedEdges])
          }
        }
        setAssetBrowserOpen(false)
        if (nodeId) window.setTimeout(() => focusNode(nodeId!), 40)
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : String(error))
      }
      return
    }
    const paths = Array.from(event.dataTransfer.files).map((file) => window.prism.assets.pathForFile(file)).filter(Boolean)
    if (!paths.length) return
    try {
      const imported = await window.prism.assets.importPaths(paths)
      placeImportedAssets(imported, position)
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [activePageId, assets, createNode, edges, focusNode, missingAssetIds, nodes, pages, placeImportedAssets, screenToFlowPosition, setEdges, updateNode])

  const sendNodeToList = useCallback((sourceId: string) => {
    const source = nodes.find((node) => node.id === sourceId)
    if (!source) return
    const listId = createNode('list', { x: source.position.x + 440, y: source.position.y })
    const outputType = source.data.outputType || (source.data.kind === 'prompt' ? 'text' : 'image')
    setEdges((current) => addEdge({
      id: crypto.randomUUID(),
      source: sourceId,
      sourceHandle: outputType === 'text' ? 'text-out' : 'media-out',
      target: listId,
      targetHandle: `${outputType}-in`,
      animated: false,
      style: { stroke: outputType === 'text' ? '#a68cff' : outputType === 'video' ? '#ff719a' : outputType === 'audio' ? '#f1b85b' : '#58d3cc', strokeWidth: 2 },
    }, current))
  }, [createNode, nodes, setEdges])

  useEffect(() => {
    const onCanvasShortcut = (event: KeyboardEvent) => {
      if (appShortcutsSuppressed()) return
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      const key = event.key.toLowerCase()
      const commandKey = event.metaKey || (key === 'v' && event.ctrlKey)
      if (!commandKey) return
      const selectedIds = nodes.filter((node) => node.selected).map((node) => node.id)
      if (key === 'a') {
        event.preventDefault()
        setNodes((current) => current.map((node) => ({ ...node, selected: true })))
      } else if (key === 'c' && selectedIds.length) {
        event.preventDefault()
        copyNodes(selectedIds)
      } else if (key === 'v' && appView === 'canvas') {
        event.preventDefault()
        void pasteClipboardImages().catch((error) => setProjectError(error instanceof Error ? error.message : String(error)))
      } else if (key === 'd' && selectedIds.length) {
        event.preventDefault()
        selectedIds.forEach(duplicateNode)
      } else if (key === 'g' && selectedIds.length) {
        event.preventDefault()
        toggleSelectedGroup(selectedIds)
      }
    }
    window.addEventListener('keydown', onCanvasShortcut)
    return () => window.removeEventListener('keydown', onCanvasShortcut)
  }, [appView, copyNodes, duplicateNode, nodes, pasteClipboardImages, setNodes, toggleSelectedGroup])

  useEffect(() => {
    if (nodes.length) return
    const onStarterShortcut = (event: KeyboardEvent) => {
      if (appShortcutsSuppressed()) return
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]') || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === '1') setStarterCreateKind('image')
      else if (event.key === '2') setStarterCreateKind('video')
      else if (event.key === '3') setSemanticCreateKind('character')
      else if (event.key === '4') setSemanticCreateKind('location')
      else if (event.key === '5') setSemanticCreateKind('element')
      else if (event.key === '6') addNode('storyboard')
    }
    window.addEventListener('keydown', onStarterShortcut)
    return () => window.removeEventListener('keydown', onStarterShortcut)
  }, [addNode, nodes.length])

  useEffect(() => {
    setNodes((current) => {
      let changed = false
      const next = current.map((node) => {
        if (node.data.kind !== 'storyboard') return node
        const panels = node.data.storyboardPanels || []
        const isUntouchedLegacyTemplate = (panels.length === 4 || panels.length === 2) && panels.every((panel, index) => !panel.prompt.trim() && panel.duration === 2 && (panel.shotSize === (index === 0 && panels.length === 4 ? 'wide' : 'medium')) && (!panel.camera || panel.camera === 'static' || panel.camera === 'auto') && !panel.asset)
        if (!isUntouchedLegacyTemplate) return node
        changed = true
        return { ...node, data: { ...node.data, storyboardPanelCount: 2 as const, storyboardPanels: panels.slice(0, 2).map((panel) => ({ ...panel, duration: 1, shotSize: 'wide' as const, camera: 'static' })) } }
      })
      const normalized = next.map((node) => {
        if (!['storyboard', 'storyboard-asset'].includes(node.data.kind) || !node.data.storyboardPanels?.length) return node
        const needsDefaults = node.data.storyboardPanels.some((panel) => panel.duration === 'auto' || !panel.shotSize || panel.shotSize === 'auto' || !panel.camera || panel.camera === 'auto')
        const migratedPanels = node.data.storyboardPanels.map(migrateStoryboardPromptVersions)
        const needsPromptMigration = migratedPanels.some((panel, index) => panel !== node.data.storyboardPanels![index])
        if (!needsDefaults && !needsPromptMigration) return node
        changed = true
        return { ...node, data: { ...node.data, storyboardPanels: migratedPanels.map((panel) => ({ ...panel, duration: panel.duration === 'auto' ? 1 : panel.duration, shotSize: !panel.shotSize || panel.shotSize === 'auto' ? 'wide' as const : panel.shotSize, camera: !panel.camera || panel.camera === 'auto' ? 'static' : panel.camera })) } }
      })
      return changed ? normalized : current
    })
  }, [nodes, setNodes])

  const attachGeneratorReference = useCallback((target: StudioNode, asset: ImportedAsset) => {
    const linked = { ...asset, url: asset.url || `prism-asset://local/${encodeURIComponent(asset.path)}` }
    const outputType: NonNullable<StudioNodeData['outputType']> = asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image'
    const isStyle = asset.category === 'style'
    const sourceKind: NodeKind = isStyle ? 'style-reference' : 'upload'
    const sourceData: Pick<StudioNodeData, 'kind' | 'outputType'> = { kind: sourceKind, outputType }
    const targetHandle = compatibleTargetHandle(sourceData, target.data, 'media-out')
    const error = targetHandle
      ? connectionCompatibilityError(sourceData, target.data, 'media-out', targetHandle) || inputCardinalityError(edges, target.id, target.data, targetHandle, true)
      : `This node has no compatible ${isStyle ? 'Style' : outputType} reference input.`
    if (error) {
      setConnectionErrorNotice(error)
      return false
    }
    const sourceId = createNode(sourceKind, { x: target.position.x - 380, y: target.position.y + 42 })
    updateNode(sourceId, isStyle ? {
      title: assetDisplayName(asset),
      referenceAssets: [linked],
      referenceTag: `@${assetDisplayName(asset).replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`,
      stylePrompt: asset.metadata?.prompt || '',
      prompt: asset.metadata?.prompt || '',
    } : {
      title: asset.name,
      assetPath: asset.path,
      assetUrl: linked.url,
      outputType,
      progress: 'Connected from your local library',
    })
    setEdges((current) => addEdge({
      id: crypto.randomUUID(), source: sourceId, sourceHandle: 'media-out', target: target.id, targetHandle, animated: false,
      style: { stroke: isStyle ? '#d38cff' : outputType === 'audio' ? '#ff719a' : outputType === 'video' ? '#67d59a' : '#58d3cc', strokeWidth: 2 },
    }, current))
    return true
  }, [createNode, edges, setEdges, updateNode])

  const assignCharacterViewAsset = useCallback(async (target: StudioNode, source: ImportedAsset, view: CharacterView) => {
    if (!source.mimeType.startsWith('image/')) {
      updateNode(target.id, { error: 'Character view boxes accept images only.' })
      return false
    }
    const characterInputMode = target.data.characterInputMode === 'single' ? 'single' : 'multi'
    const currentModeAssets = characterAssetsForMode(target.data.referenceAssets || [], characterInputMode)
    if (view !== 'front' && !currentModeAssets.some((asset) => asset.metadata?.characterView === 'front')) {
      updateNode(target.id, { error: 'Add Face first to unlock the other Character views.' })
      return false
    }
    try {
      const validation = await window.prism.assets.validateCharacterImage(source.id, characterInputMode)
      if (!validation.valid) {
        updateNode(target.id, { error: validation.message })
        return false
      }
    } catch (error) {
      updateNode(target.id, { error: error instanceof Error ? error.message : String(error) })
      return false
    }
    const logicalName = characterInputMode === 'single'
      ? normalizeLogicalAssetName(mediaRenameStem(source.name)) || 'character'
      : normalizeLogicalAssetName(target.data.referenceTag || target.data.title || 'character') || 'character'
    const tagged = await window.prism.assets.updateMetadata(source.id, {
      ...source.metadata,
      assetName: logicalName,
      characterView: view,
      characterInputMode: target.data.characterInputMode === 'single' ? 'single' : 'multi',
    })
    const linked = { ...tagged, url: tagged.url || source.url || `prism-asset://local/${encodeURIComponent(tagged.path)}` }
    setAssets((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)])
    const next = [linked, ...(target.data.referenceAssets || []).filter((asset) => asset.id !== linked.id && !(asset.metadata?.characterView === view && (asset.metadata?.characterInputMode === 'single' ? 'single' : 'multi') === characterInputMode))]
    const ready = new Set(characterAssetsForMode(next, characterInputMode).map((asset) => asset.metadata?.characterView).filter(Boolean)).size
    updateNode(target.id, {
      referenceAssets: next,
      ...(characterInputMode === 'single' ? { title: logicalName, referenceTag: `@${logicalName}` } : {}),
      progress: characterInputMode === 'single' ? 'Character Sheets ready' : `${ready}/9 Character views ready`,
      characterEditorOpen: true,
      error: undefined,
    })
    return true
  }, [updateNode])

  const importCanvasAssetIntoView = useCallback(async (id: string, serializedPayload: string, assetView?: CharacterView | ElementView) => {
    const target = nodes.find((node) => node.id === id)
    if (!target) return
    try {
      const payload = JSON.parse(serializedPayload) as CanvasAssetDragPayload
      if (payload.kind !== 'media') throw new Error('Drop an ordinary Image asset into this view box.')
      const source = assets.find((asset) => asset.id === payload.assetId && !asset.trashedAt)
      if (!source) throw new Error('This Image asset is no longer available.')
      if (!isPlaceholderMediaDropAllowed('image', source)) throw new Error('This placeholder accepts ordinary Image assets only. Saved collections and special assets cannot be placed here.')
      if (missingAssetIds.includes(source.id)) throw new Error('Relink this Image before adding it to a Character.')
      if (target.data.kind === 'character') await assignCharacterViewAsset(target, source, (assetView as CharacterView | undefined) || 'front')
      else if (target.data.kind === 'element') {
        if (!source.mimeType.startsWith('image/')) throw new Error('Element view boxes accept images only.')
        const view = (assetView as ElementView | undefined) || ELEMENT_ANCHOR_VIEW
        const elementInputMode = target.data.elementInputMode === 'single' ? 'single' : 'multi'
        const logicalName = normalizeLogicalAssetName(target.data.referenceTag || target.data.title || 'element') || 'element'
        const tagged = await window.prism.assets.updateMetadata(source.id, { ...source.metadata, assetName: logicalName, elementView: view, elementInputMode })
        const linked = { ...tagged, url: tagged.url || source.url }
        setAssets((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)])
        const inactive = (target.data.referenceAssets || []).filter((asset) => (asset.metadata?.elementInputMode === 'single' ? 'single' : 'multi') !== elementInputMode)
        const next = [...inactive, ...assignElementView([], linked, view)]
        updateNode(id, { referenceAssets: next, ...(elementInputMode === 'single' ? { title: mediaRenameStem(source.name), referenceTag: `@${normalizeLogicalAssetName(mediaRenameStem(source.name))}` } : {}), progress: elementInputMode === 'single' ? 'Element Sheets ready' : '1/4 Element views ready', error: undefined })
      } else if (target.data.kind === 'location' || target.data.kind === 'style-reference') {
        const linked = { ...source, url: source.url || `prism-asset://local/${encodeURIComponent(source.path)}` }
        updateNode(id, { referenceAssets: [linked], styleSavedAt: target.data.kind === 'style-reference' ? undefined : target.data.styleSavedAt, progress: 'Reference ready', error: undefined })
      } else throw new Error('Drop this asset into a reusable asset input.')
    } catch (error) {
      updateNode(id, { error: error instanceof Error ? error.message : String(error) })
    }
  }, [assignCharacterViewAsset, assets, missingAssetIds, nodes, updateNode])

  const importAsset = useCallback(async (id: string, assetView?: CharacterView | ElementView) => {
    const target = nodes.find((node) => node.id === id)
    if (target?.data.kind === 'character' && assetView && assetView !== 'front' && !(target.data.referenceAssets || []).some((asset) => asset.metadata?.characterView === 'front')) {
      updateNode(id, { error: 'Add Face first to unlock the other Character views.' })
      return
    }
    if (target?.data.kind === 'element' && assetView && assetView !== ELEMENT_ANCHOR_VIEW && !(target.data.referenceAssets || []).some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)) {
      updateNode(id, { error: 'Add Three-Quarter first to unlock the other Element views.' })
      return
    }
    const asset = await window.prism.assets.import(target?.data.kind, target?.data.title)
    if (!asset) return
    const url = asset.url || `prism-asset://local/${encodeURIComponent(asset.path)}`
    setAssets((current) => [asset, ...current.filter((candidate) => candidate.id !== asset.id)])
    if (target && ['image-generator', 'image-editor', 'video-generator', 'upscaler'].includes(target.data.kind)) {
      attachGeneratorReference(target, { ...asset, url })
      return asset
    }
    const canonicalKind = semanticKindForCategory(asset.category)
    if (target && canonicalKind && shouldRerouteSemanticAsset(asset.category, target.data.kind)) {
      placeImportedAssets([{ ...asset, url }], { x: target.position.x + 340, y: target.position.y })
      setProjectNotice(`${asset.name} is typed as ${asset.category}. It was routed to ${asset.category === 'style' ? 'Styles' : `${asset.category}s`} instead of ${target.data.kind === 'style-reference' ? 'Styles' : `${target.data.kind}s`}.`)
      return asset
    }
    if (target && target.data.kind === 'character') {
      if (target.data.characterInputMode === 'single') {
        await assignCharacterViewAsset(target, { ...asset, url }, (assetView as CharacterView | undefined) || 'front')
        return asset
      }
      setAssetIntake({ nodeId: id, asset: { ...asset, url }, kind: 'character', name: target.data.title && !/^Character \d+$/.test(target.data.title) ? target.data.title : assetDisplayName(asset), first: '', second: '', characterView: (assetView as CharacterView | undefined) || 'front' })
      return asset
    }
    if (target && target.data.kind === 'element') {
      const view = (assetView as ElementView | undefined) || missingElementViews(target.data.referenceAssets || [])[0]?.id || ELEMENT_ANCHOR_VIEW
      const elementInputMode = target.data.elementInputMode === 'single' ? 'single' : 'multi'
      const tagged = await window.prism.assets.updateMetadata(asset.id, { ...asset.metadata, elementView: view, elementInputMode })
      const linked = { ...tagged, url: tagged.url || url }
      setAssets((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)])
      const inactive = (target.data.referenceAssets || []).filter((item) => (item.metadata?.elementInputMode === 'single' ? 'single' : 'multi') !== elementInputMode)
      const next = [...inactive, ...assignElementView([], linked, view)]
      updateNode(id, { referenceAssets: next, ...(elementInputMode === 'single' ? { title: mediaRenameStem(asset.name), referenceTag: `@${normalizeLogicalAssetName(mediaRenameStem(asset.name))}` } : {}), progress: elementInputMode === 'single' ? 'Element Sheets ready' : '1/4 Element views ready', error: undefined })
      return linked
    }
    if (target && (target.data.kind === 'location' || target.data.kind === 'wardrobe')) {
      const inputModeMetadata = target.data.kind === 'location' ? { locationInputMode: 'single' as const } : { wardrobeInputMode: 'single' as const }
      const tagged = await window.prism.assets.updateMetadata(asset.id, { ...asset.metadata, ...inputModeMetadata })
      const linked = { ...tagged, url: tagged.url || url }
      setAssets((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)])
      updateNode(id, {
        referenceAssets: [linked],
        title: mediaRenameStem(asset.name),
        referenceTag: `@${normalizeLogicalAssetName(mediaRenameStem(asset.name))}`,
        progress: 'Reference ready',
        error: undefined,
      })
      return linked
    }
    if (target?.data.kind === 'style-reference') {
      updateNode(id, {
        referenceAssets: [...(target.data.referenceAssets || []), { ...asset, url }],
        styleSavedAt: undefined,
        progress: `${(target.data.referenceAssets?.length || 0) + 1} semantic reference${target.data.referenceAssets?.length ? 's' : ''}`,
      })
      return asset
    }
    if (target?.data.kind === 'list') {
      updateNode(id, {
        listItems: [...(target.data.listItems || []), {
          id: crypto.randomUUID(),
          type: asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image',
          asset: { ...asset, url },
        }],
      })
      return asset
    }
    updateNode(id, {
      assetPath: asset.path,
      assetUrl: url,
      outputType: asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image',
      progress: 'Stored safely in your local library',
    })
    return asset
  }, [attachGeneratorReference, nodes, placeImportedAssets, updateNode])

  const importDroppedAssets = useCallback(async (id: string, files: File[], assetView?: CharacterView | ElementView) => {
    const target = nodes.find((node) => node.id === id)
    if (!target || !files.length) return
    if (target.data.kind === 'character' && assetView && assetView !== 'front' && !(target.data.referenceAssets || []).some((asset) => asset.metadata?.characterView === 'front')) {
      updateNode(id, { error: 'Add Face first to unlock the other Character views.' })
      return
    }
    if (target.data.kind === 'element' && assetView && assetView !== ELEMENT_ANCHOR_VIEW && !(target.data.referenceAssets || []).some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)) {
      updateNode(id, { error: 'Add Three-Quarter first to unlock the other Element views.' })
      return
    }
    if (['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(target.data.kind)) {
      const incompatibleFile = files.find((file) => mediaFamilyForFile(file.type, file.name) !== 'image')
      if (incompatibleFile) {
        const label = target.data.kind === 'style-reference' ? 'Style' : target.data.kind[0].toUpperCase() + target.data.kind.slice(1)
        updateNode(id, { error: `${label} placeholders accept image files only.` })
        return
      }
    }
    const paths = files.map((file) => window.prism.assets.pathForFile(file)).filter(Boolean)
    if (!paths.length) return
    const semanticDropKind = ['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(target.data.kind) ? target.data.kind : undefined
    const imported = await window.prism.assets.importPaths(paths, semanticDropKind, target.data.title)
    setAssets((current) => [...imported, ...current.filter((candidate) => !imported.some((asset) => asset.id === candidate.id))])
    const linkedAssets = imported.map((asset) => ({ ...asset, url: asset.url || `prism-asset://local/${encodeURIComponent(asset.path)}` }))
    if (target.data.kind === 'character') {
      const source = linkedAssets[0]
      if (source) await assignCharacterViewAsset(target, source, (assetView as CharacterView | undefined) || 'front')
      return
    }
    if (target.data.kind === 'style-reference') {
      const linked = linkedAssets[0]
      if (linked) updateNode(id, { referenceAssets: [linked], styleSavedAt: undefined, progress: 'Reference connected' })
      return
    }
    if (target.data.kind === 'element') {
      const view = (assetView as ElementView | undefined) || missingElementViews(target.data.referenceAssets || [])[0]?.id || ELEMENT_ANCHOR_VIEW
      const source = linkedAssets[0]
      if (!source) return
      const elementInputMode = target.data.elementInputMode === 'single' ? 'single' : 'multi'
      const tagged = await window.prism.assets.updateMetadata(source.id, { ...source.metadata, elementView: view, elementInputMode })
      const linked = { ...tagged, url: tagged.url || source.url }
      setAssets((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)])
      const inactive = (target.data.referenceAssets || []).filter((item) => (item.metadata?.elementInputMode === 'single' ? 'single' : 'multi') !== elementInputMode)
      const next = [...inactive, ...assignElementView([], linked, view)]
      updateNode(id, { referenceAssets: next, ...(elementInputMode === 'single' ? { title: mediaRenameStem(source.name), referenceTag: `@${normalizeLogicalAssetName(mediaRenameStem(source.name))}` } : {}), progress: elementInputMode === 'single' ? 'Element Sheets ready' : '1/4 Element views ready', error: undefined })
      return
    }
    if (target.data.kind === 'location' || target.data.kind === 'wardrobe') {
      const source = linkedAssets[0]
      if (!source) return
      const inputModeMetadata = target.data.kind === 'location' ? { locationInputMode: 'single' as const } : { wardrobeInputMode: 'single' as const }
      const tagged = await window.prism.assets.updateMetadata(source.id, { ...source.metadata, ...inputModeMetadata })
      const linked = { ...tagged, url: tagged.url || source.url }
      setAssets((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)])
      updateNode(id, { referenceAssets: [linked], title: mediaRenameStem(source.name), referenceTag: `@${normalizeLogicalAssetName(mediaRenameStem(source.name))}`, progress: 'Reference ready', error: undefined })
      return
    }
    for (const linked of linkedAssets) {
      if (['image-generator', 'image-editor', 'video-generator', 'upscaler'].includes(target.data.kind)) attachGeneratorReference(target, linked)
      else if (target.data.kind === 'upload') updateNode(id, { assetPath: linked.path, assetUrl: linked.url, outputType: linked.mimeType.startsWith('video/') ? 'video' : linked.mimeType.startsWith('audio/') ? 'audio' : 'image', title: linked.name })
    }
  }, [assignCharacterViewAsset, attachGeneratorReference, nodes, updateNode])

  const saveAssetIntake = useCallback(async () => {
    if (!assetIntake || !assetIntake.name.trim()) return
    try {
      const logicalName = normalizeLogicalAssetName(assetIntake.name)
      if (!logicalName) return
      const target = nodes.find((node) => node.id === assetIntake.nodeId)
      const characterInputMode = target?.data.characterInputMode === 'single' ? 'single' : 'multi'
      if (assetIntake.kind === 'character') {
        const validation = await window.prism.assets.validateCharacterImage(assetIntake.asset.id, characterInputMode)
        if (!validation.valid) {
          updateNode(assetIntake.nodeId, { error: validation.message })
          return
        }
      }
      const metadata: ImportedAsset['metadata'] = assetIntake.kind === 'character'
        ? { assetName: logicalName, identityDescription: assetIntake.first.trim(), defaultWardrobe: assetIntake.second.trim(), characterView: assetIntake.characterView || 'front', characterInputMode }
        : assetIntake.kind === 'element'
          ? { assetName: logicalName, elementType: assetIntake.first.trim(), variant: assetIntake.second.trim() }
          : { assetName: logicalName, locationType: assetIntake.first as 'interior' | 'exterior', timeOfDay: assetIntake.second as 'day' | 'night' }
      const updated = await window.prism.assets.updateMetadata(assetIntake.asset.id, metadata)
      const context = assetIntake.kind === 'character'
        ? [metadata.identityDescription, metadata.defaultWardrobe && `default wardrobe: ${metadata.defaultWardrobe}`].filter(Boolean).join(', ')
        : assetIntake.kind === 'element'
          ? [metadata.elementType, metadata.variant].filter(Boolean).join(', ')
          : `${metadata.locationType}, ${metadata.timeOfDay}`
      setAssets((current) => [updated, ...current.filter((candidate) => candidate.id !== updated.id)])
      updateNode(assetIntake.nodeId, {
        title: logicalName,
        referenceTag: `@${logicalName}`,
        referenceAssets: [updated, ...(target?.data.referenceAssets || []).filter((item) => item.id !== updated.id && !(item.metadata?.characterView === updated.metadata?.characterView && (item.metadata?.characterInputMode === 'single' ? 'single' : 'multi') === characterInputMode))],
        prompt: context,
        progress: 'Reference ready',
      })
      setAssetIntake(null)
    } catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [assetIntake, nodes, updateNode])

  const completeCharacterSet = useCallback(async (nodeId: string) => {
    const source = nodes.find((node) => node.id === nodeId)
    if (!source || source.data.kind !== 'character') return
    const characterInputMode = source.data.characterInputMode === 'single' ? 'single' : 'multi'
    const allReferences = source.data.referenceAssets || []
    const existing = characterAssetsForMode(allReferences, characterInputMode)
    const activeIds = new Set(existing.map((asset) => asset.id))
    const inactiveModeAssets = allReferences.filter((asset) => !activeIds.has(asset.id))
    const logicalName = normalizeLogicalAssetName(source.data.referenceTag || source.data.title || 'Character')
    const frontFace = existing.find((asset) => asset.metadata?.characterView === 'front')
    const provider = source.data.imageProvider || 'fal'
    if (!serviceConnections[provider]) {
      setSettingsOpen(true)
      updateNode(nodeId, { error: `Connect ${provider === 'openai' ? 'OpenAI' : provider === 'google' ? 'Google Gemini' : 'fal.ai'} before completing this Character.` })
      return
    }
    const account = serviceAccounts[provider]
    if (account && ['credit-required', 'temporarily-limited', 'unavailable'].includes(account.state)) {
      updateNode(nodeId, { error: account.message })
      return
    }
    const falModelIds = [...FAL_REFERENCE_IMAGE_MODELS]
    const requestedModelId = source.data.imageModelId || (provider === 'openai' ? 'gpt-image-2' : provider === 'google' ? 'gemini-3.1-flash-image' : falModelIds[0])
    const modelId = provider === 'fal' && !(falModelIds as readonly string[]).includes(requestedModelId) ? falModelIds[0] : requestedModelId
    const upstreamFailures = upstreamIncompleteSemanticReasons(nodeId, nodes, edges)
    if (upstreamFailures.length) {
      updateNode(nodeId, { error: `Cannot generate Character: ${formatRequirementList(upstreamFailures)}.` })
      return
    }

    if (characterInputMode === 'single') {
      if (!(localAssetGenerationPrompt(source.data)).trim()) {
        updateNode(nodeId, { error: 'Describe the Character before generating the complete Single sheet.' })
        return
      }
      const upstream = resolveWorkflowInput(nodeId, nodes, edges)
      let request: GenerationRequest
      if (frontFace) {
        request = {
          nodeId,
          kind: 'image-editor',
          prompt: singleCharacterSheetPrompt(localAssetGenerationPrompt(source.data)),
          inputPath: frontFace.path,
          inputUrl: frontFace.url,
          inputName: frontFace.name,
          inputTag: '@character-identity',
          inputRole: 'source-image',
          references: upstream.references,
        }
      } else {
        try {
          request = {
            ...buildGenerationRequest(source, nodes, edges),
            kind: 'image-generator',
            prompt: singleCharacterSheetPrompt(localAssetGenerationPrompt(source.data)),
          }
        } catch (error) {
          updateNode(nodeId, { error: error instanceof Error ? error.message : String(error) })
          return
        }
      }
      const resolvedRequest = applyResolvedAssetRequest(request, {
        assetType: 'character',
        originalText: localAssetGenerationPrompt(source.data),
        detectedLanguage: source.data.promptLanguageTag,
        styleText: upstream.stylePrompt,
        model: semanticModelCapability(provider, modelId),
      })
      if (!resolvedRequest.request) {
        updateNode(nodeId, { error: `Cannot generate Character: ${formatRequirementList(resolvedRequest.resolved.preflight.reasons)}.` })
        return
      }
      request = resolvedRequest.request
      const failures = generationRequirementFailures(request)
      if (failures.length) {
        updateNode(nodeId, { error: `Cannot generate Single Character sheet: ${formatRequirementList(failures)}.` })
        return
      }
      updateNode(nodeId, { runState: 'running', progress: 'Generating all nine Character views in one image…', error: undefined })
      try {
        const result = await window.prism.generation.run({
          ...request,
          quantity: 1,
          aspectRatio: request.aspectRatio,
          ...semanticImageRequestControls({ ...source.data, imageProvider: provider, imageModelId: modelId }),
          safetyTolerance: source.data.safetyTolerance || 4,
        })
        const promoted = await window.prism.assets.promote([result.outputPath], 'character', source.data.title || 'Character')
        if (!promoted[0]) throw new Error('The generated Single Character sheet could not be saved.')
        const sheet = await window.prism.assets.updateMetadata(promoted[0].id, {
          ...promoted[0].metadata,
          assetName: logicalName,
          characterView: 'front',
          characterInputMode: 'single',
          characterSheetViews: CHARACTER_COMPLETION_VIEWS.map((view) => view.id),
          assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'),
          prompt: undefined,
          provider: provider === 'google' ? 'Google Gemini' : provider === 'openai' ? 'OpenAI' : 'fal.ai',
          modelId,
          aspectRatio: request.aspectRatio,
        })
        updateNode(nodeId, {
          referenceAssets: [sheet, ...inactiveModeAssets],
          outputPath: result.outputPath,
          outputUrl: result.outputUrl,
          outputType: result.outputType,
          modelId: result.modelId,
          generatedResults: [{ path: result.outputPath, url: result.outputUrl, type: result.outputType, modelId: result.modelId }],
          activeResultIndex: 0,
          runState: 'complete',
          progress: 'Single Character complete · 9 views in 1 image',
          characterEditorOpen: true,
          error: undefined,
        })
        setHistory(await window.prism.history.list())
        setAssets(await window.prism.assets.list())
      } catch (error) {
        updateNode(nodeId, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
      }
      return
    }

    if (!frontFace) {
      updateNode(nodeId, { error: 'Add the required Face before completing missing Multi panels.' })
      return
    }
    const upstream = resolveWorkflowInput(nodeId, nodes, edges)
    const missing = CHARACTER_COMPLETION_VIEWS.filter((view) => !existing.some((asset) => asset.metadata?.characterView === view.id))
    if (!missing.length) {
      updateNode(nodeId, { characterEditorOpen: true, error: undefined, progress: 'Character already has all nine views.' })
      return
    }
    updateNode(nodeId, { runState: 'queued', progress: 'Preparing missing Character views…', error: undefined })
    try {
      const generated: ImportedAsset[] = []
      for (let index = 0; index < missing.length; index += 1) {
        const view = missing[index]
        const currentAssets = [...existing, ...generated]
        const suppliedViews = currentAssets.map((asset) => asset.metadata?.characterView).filter((characterView): characterView is CharacterView => Boolean(characterView))
        updateNode(nodeId, { runState: 'running', progress: `Completing ${view.label} · ${index + 1} of ${missing.length}` })
        const prompt = `${SOL_XHIGH_CHARACTER_SHEET_PROMPT_V1} ${characterCompletionPrompt(view, suppliedViews, upstream.prompt || '')}`.trim()
        const completionRequest = applyResolvedAssetRequest<GenerationRequest>({
          nodeId,
          kind: 'image-editor',
          prompt,
          inputPath: frontFace.path,
          inputUrl: frontFace.url,
          inputName: frontFace.name,
          inputTag: '@front-face',
          inputRole: 'source-image',
          references: [...currentAssets.map((asset) => ({ role: 'character' as const, path: asset.path, url: asset.url, name: asset.name, tag: `@${asset.metadata?.characterView || 'character'}`, view: asset.metadata?.characterView, mediaType: 'image' as const })), ...upstream.references],
        }, {
          assetType: 'character',
          originalText: localAssetGenerationPrompt(source.data),
          detectedLanguage: source.data.promptLanguageTag,
          requestedViews: [view.id],
            styleText: upstream.stylePrompt,
          model: semanticModelCapability(provider, modelId),
        }, { includeViews: false })
        if (!completionRequest.request) throw new Error(`Cannot complete Character: ${formatRequirementList(completionRequest.resolved.preflight.reasons)}.`)
        const result = await window.prism.generation.run({ ...completionRequest.request, quantity: 1, ...semanticImageRequestControls({ ...source.data, imageProvider: provider, imageModelId: modelId }), safetyTolerance: source.data.safetyTolerance || 4 })
        const promoted = await window.prism.assets.promote([result.outputPath], 'character', source.data.title || 'Character')
        if (!promoted[0]) throw new Error(`${view.label} could not be saved to the Character.`)
        generated.push(await window.prism.assets.updateMetadata(promoted[0].id, {
          ...promoted[0].metadata,
          assetName: logicalName,
          characterView: view.id,
          characterInputMode: 'multi',
          provider: provider === 'google' ? 'Google Gemini' : provider === 'openai' ? 'OpenAI' : 'fal.ai',
          modelId,
          aspectRatio: completionRequest.request.aspectRatio,
        }))
      }
      updateNode(nodeId, {
        referenceAssets: [...inactiveModeAssets, ...existing, ...generated],
        runState: 'complete',
        progress: 'Character complete · 9/9 views',
        characterEditorOpen: true,
        error: undefined,
      })
      setHistory(await window.prism.history.list())
      setAssets(await window.prism.assets.list())
    } catch (error) {
      updateNode(nodeId, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
    }
  }, [edges, nodes, serviceAccounts, serviceConnections, updateNode])

  const completeElementSet = useCallback(async (nodeId: string) => {
    const source = nodes.find((node) => node.id === nodeId)
    if (!source || source.data.kind !== 'element') return
    const elementInputMode = source.data.elementInputMode === 'single' ? 'single' : 'multi'
    const allReferences = source.data.referenceAssets || []
    const existing = elementViewAssets(allReferences).filter((asset) => (asset.metadata?.elementInputMode === 'single' ? 'single' : 'multi') === elementInputMode)
    const inactiveModeAssets = allReferences.filter((asset) => !existing.some((active) => active.id === asset.id))
    const logicalName = normalizeLogicalAssetName(source.data.referenceTag || source.data.title || 'Element')
    const anchor = existing.find((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)
    const provider = source.data.imageProvider || 'fal'
    if (!serviceConnections[provider]) {
      setSettingsOpen(true)
      updateNode(nodeId, { error: `Connect ${provider === 'openai' ? 'OpenAI' : provider === 'google' ? 'Google Gemini' : 'fal.ai'} before completing this Element.` })
      return
    }
    const account = serviceAccounts[provider]
    if (account && ['credit-required', 'temporarily-limited', 'unavailable'].includes(account.state)) {
      updateNode(nodeId, { error: account.message })
      return
    }
    const falModelIds = [...FAL_REFERENCE_IMAGE_MODELS]
    const requestedModelId = source.data.imageModelId || (provider === 'openai' ? 'gpt-image-2' : provider === 'google' ? 'gemini-3.1-flash-image' : falModelIds[0])
    const modelId = provider === 'fal' && !(falModelIds as readonly string[]).includes(requestedModelId) ? falModelIds[0] : requestedModelId
    const upstreamFailures = upstreamIncompleteSemanticReasons(nodeId, nodes, edges)
    if (upstreamFailures.length) {
      updateNode(nodeId, { error: `Cannot generate Element: ${formatRequirementList(upstreamFailures)}.` })
      return
    }
    if (elementInputMode === 'single') {
      if (!(localAssetGenerationPrompt(source.data)).trim()) {
        updateNode(nodeId, { error: 'Describe the Element before generating Element Sheets.' })
        return
      }
      const sheetPrompt = `Create one clean square Element reference sheet containing four clearly separated views of the exact same object: Three-Quarter, Front, Side, and Back. Preserve identical silhouette, proportions, materials, colors, markings, construction, and wear in every panel. Use a plain neutral background and do not add unrelated objects. ${localAssetGenerationPrompt(source.data)}`.trim()
      let request: GenerationRequest
      try {
        request = anchor ? { nodeId, kind: 'image-editor', prompt: sheetPrompt, inputPath: anchor.path, inputUrl: anchor.url, inputName: anchor.name, inputTag: '@element-identity', inputRole: 'source-image', references: resolveWorkflowInput(nodeId, nodes, edges).references }
          : { ...buildGenerationRequest(source, nodes, edges), kind: 'image-generator', prompt: sheetPrompt }
      } catch (error) {
        updateNode(nodeId, { error: error instanceof Error ? error.message : String(error) })
        return
      }
      const resolvedRequest = applyResolvedAssetRequest(request, {
        assetType: 'element',
        originalText: localAssetGenerationPrompt(source.data),
        detectedLanguage: source.data.promptLanguageTag,
        styleText: resolveWorkflowInput(nodeId, nodes, edges).stylePrompt,
        model: semanticModelCapability(provider, modelId),
      })
      if (!resolvedRequest.request) {
        updateNode(nodeId, { error: `Cannot generate Element Sheets: ${formatRequirementList(resolvedRequest.resolved.preflight.reasons)}.` })
        return
      }
      request = resolvedRequest.request
      const failures = generationRequirementFailures(request)
      if (failures.length) {
        updateNode(nodeId, { error: `Cannot generate Element Sheets: ${formatRequirementList(failures)}.` })
        return
      }
      updateNode(nodeId, { runState: 'running', progress: 'Generating Multiple Element Views in one image…', error: undefined })
      try {
        const result = await window.prism.generation.run({ ...request, quantity: 1, aspectRatio: request.aspectRatio, ...semanticImageRequestControls({ ...source.data, imageProvider: provider, imageModelId: modelId }) })
        const promoted = await window.prism.assets.promote([result.outputPath], 'element', source.data.title || 'Element')
        if (!promoted[0]) throw new Error('The generated Element Sheets image could not be saved.')
        const sheet = await window.prism.assets.updateMetadata(promoted[0].id, { ...promoted[0].metadata, assetName: logicalName, elementView: ELEMENT_ANCHOR_VIEW, elementInputMode: 'single', assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'), prompt: undefined, provider: provider === 'google' ? 'Google Gemini' : provider === 'openai' ? 'OpenAI' : 'fal.ai', modelId, aspectRatio: request.aspectRatio })
        updateNode(nodeId, { referenceAssets: [sheet, ...inactiveModeAssets], outputPath: result.outputPath, outputUrl: result.outputUrl, outputType: result.outputType, modelId: result.modelId, generatedResults: [{ path: result.outputPath, url: result.outputUrl, type: result.outputType, modelId: result.modelId }], activeResultIndex: 0, runState: 'complete', progress: 'Element Sheets complete · Multiple Element Views', semanticEditorOpen: true, error: undefined })
        setHistory(await window.prism.history.list())
        setAssets(await window.prism.assets.list())
      } catch (error) {
        updateNode(nodeId, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
      }
      return
    }
    if (!anchor) {
      let request: GenerationRequest
      try { request = buildGenerationRequest(source, nodes, edges) }
      catch (error) {
        updateNode(nodeId, { error: error instanceof Error ? error.message : String(error) })
        return
      }
      const failures = generationRequirementFailures(request)
      if (failures.length) {
        updateNode(nodeId, { error: `Cannot create Element Three-Quarter: ${formatRequirementList(failures)}.` })
        return
      }
      updateNode(nodeId, { runState: 'running', progress: 'Creating required Element Three-Quarter…', error: undefined })
      try {
        const result = await window.prism.generation.run({ ...request, quantity: 1, aspectRatio: '1:1', imageProvider: provider, imageModelId: modelId })
        const promoted = await window.prism.assets.promote([result.outputPath], 'element', source.data.title || 'Element')
        if (!promoted[0]) throw new Error('The generated Three-Quarter view could not be saved to the Element.')
        const generatedAnchor = await window.prism.assets.updateMetadata(promoted[0].id, {
          ...promoted[0].metadata,
          assetName: logicalName,
          elementView: ELEMENT_ANCHOR_VIEW,
          elementInputMode: 'multi',
          assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'),
          prompt: undefined,
          provider: provider === 'google' ? 'Google Gemini' : provider === 'openai' ? 'OpenAI' : 'fal.ai',
          modelId,
          aspectRatio: '1:1',
        })
        updateNode(nodeId, { referenceAssets: [...inactiveModeAssets, ...existing, generatedAnchor], outputPath: result.outputPath, outputUrl: result.outputUrl, outputType: result.outputType, modelId: result.modelId, generatedResults: [{ path: result.outputPath, url: result.outputUrl, type: result.outputType, modelId: result.modelId }], activeResultIndex: 0, runState: 'complete', progress: 'Three-Quarter ready · remaining views unlocked', semanticEditorOpen: true, error: undefined })
        setHistory(await window.prism.history.list())
        setAssets(await window.prism.assets.list())
      } catch (error) {
        updateNode(nodeId, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
      }
      return
    }
    const upstream = resolveWorkflowInput(nodeId, nodes, edges)
    const missing = missingElementViews(existing)
    if (!missing.length) {
      updateNode(nodeId, { semanticEditorOpen: false, error: undefined, progress: 'Element already has all four views.' })
      return
    }
    updateNode(nodeId, { runState: 'queued', progress: 'Preparing missing Element views…', error: undefined })
    try {
      const generated: ImportedAsset[] = []
      for (let index = 0; index < missing.length; index += 1) {
        const targetView = missing[index]
        const currentAssets = [...existing, ...generated]
        const suppliedViews = currentAssets.map((asset) => asset.metadata?.elementView).filter((view): view is ElementView => Boolean(view))
        updateNode(nodeId, { runState: 'running', progress: `Completing ${targetView.label} · ${index + 1} of ${missing.length}` })
        const primary = anchor
        const completionRequest = applyResolvedAssetRequest<GenerationRequest>({
          nodeId,
          kind: 'image-editor',
          prompt: elementCompletionPrompt(targetView, suppliedViews, [source.data.prompt, upstream.prompt].filter(Boolean).join('\n\n')),
          inputPath: primary.path,
          inputUrl: primary.url,
          inputName: primary.name,
          inputTag: `@${primary.metadata?.elementView || 'element'}`,
          inputRole: 'source-image',
          references: [...currentAssets.map((asset) => ({ role: 'element' as const, path: asset.path, url: asset.url, name: asset.name, tag: `@${asset.metadata?.elementView || 'element'}`, view: asset.metadata?.elementView, mediaType: 'image' as const })), ...upstream.references],
        }, {
          assetType: 'element',
          originalText: localAssetGenerationPrompt(source.data),
          detectedLanguage: source.data.promptLanguageTag,
          requestedViews: [targetView.id],
          styleText: upstream.stylePrompt,
          model: semanticModelCapability(provider, modelId),
        }, { includeViews: false })
        if (!completionRequest.request) throw new Error(`Cannot complete Element: ${formatRequirementList(completionRequest.resolved.preflight.reasons)}.`)
        const result = await window.prism.generation.run({ ...completionRequest.request, quantity: 1, ...semanticImageRequestControls({ ...source.data, imageProvider: provider, imageModelId: modelId }), safetyTolerance: source.data.safetyTolerance || 4 })
        const promoted = await window.prism.assets.promote([result.outputPath], 'element', source.data.title || 'Element')
        if (!promoted[0]) throw new Error(`${targetView.label} could not be saved to the Element.`)
        generated.push(await window.prism.assets.updateMetadata(promoted[0].id, {
          ...promoted[0].metadata,
          assetName: logicalName,
          elementView: targetView.id,
          elementInputMode: 'multi',
          assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'),
          prompt: undefined,
          provider: provider === 'google' ? 'Google Gemini' : provider === 'openai' ? 'OpenAI' : 'fal.ai',
          modelId,
          aspectRatio: completionRequest.request.aspectRatio,
        }))
      }
      updateNode(nodeId, { referenceAssets: [...inactiveModeAssets, ...existing, ...generated], runState: 'complete', progress: `Element complete · ${existing.length + generated.length}/4 views`, semanticEditorOpen: false, error: undefined })
      setHistory(await window.prism.history.list())
      setAssets(await window.prism.assets.list())
    } catch (error) {
      updateNode(nodeId, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
    }
  }, [edges, nodes, serviceAccounts, serviceConnections, updateNode])

  const saveCharacterAsset = useCallback(async (nodeId: string, rawName: string) => {
    const source = nodes.find((node) => node.id === nodeId && node.data.kind === 'character')
    const name = normalizeLogicalAssetName(rawName)
    const characterInputMode = source?.data.characterInputMode === 'single' ? 'single' : 'multi'
    const references = characterAssetsForMode(source?.data.referenceAssets || [], characterInputMode)
    const frontFace = references.find((asset) => asset.metadata?.characterView === 'front')
    if (!source || !name || !frontFace) {
      if (source) updateNode(nodeId, { error: 'Add the required Face before saving this Character.' })
      return
    }
    const promotedForRollback: string[] = []
    if (!resolvedAssetReferenceDescription(source, nodes, edges).trim()) { updateNode(nodeId, { error: 'Fill the Description before saving this asset.' }); return }
    try {
      const currentAssets = await window.prism.assets.list()
      const currentById = new Map(currentAssets.map((asset) => [asset.id, asset]))
      const existingCollection = groupSemanticAssets(currentAssets.filter((asset) => !asset.trashedAt && asset.mimeType.startsWith('image/')))
        .find((collection) => collection.category === 'character' && collection.key === semanticAssetCollectionKey('character', name))
      const sourceIdentity = normalizeLogicalAssetName(source.data.referenceTag || source.data.title)
      const editingExisting = sourceIdentity === name && Boolean(existingCollection?.assets.some((asset) => references.some((reference) => reference.id === asset.id)))
      const authority = source.data.semanticReplacementAuthority
      const intent = authority ? { mode: 'replace-existing' as const, ...authority } : { mode: 'create-new' as const }
      const compiledSheet = characterInputMode === 'multi'
        ? await compileCharacterSheet(references, (asset) => window.prism.assets.readCharacterImage(asset.id))
        : undefined
      const managedAssets: ImportedAsset[] = []
      for (const reference of references) {
        const registered = reference.category === 'character' && !reusableSaveMustCopyReference(source.data, reference.id) ? currentById.get(reference.id) : undefined
        const managed = registered || (await window.prism.assets.promote([reference.path], 'character', name))[0]
        if (!managed) throw new Error(`Character library: ${reference.name} is missing and could not be recovered into this Character.`)
        if (!registered) promotedForRollback.push(managed.id)
        managedAssets.push({ ...managed, metadata: { ...managed.metadata, ...reference.metadata, assetName: name, characterInputMode, characterAspectRatio: source.data.characterAspectRatio || '1:1', assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'), prompt: undefined, provider: source.data.imageProvider || 'fal.ai', modelId: source.data.imageModelId } })
      }
      const committed = await window.prism.assets.commitCharacterCollection({
        name,
        previousName: sourceIdentity,
        mode: characterInputMode,
        active: managedAssets.map((asset) => ({ id: asset.id, metadata: asset.metadata })),
        retiredAt: new Date().toISOString(),
        intent,
        sheet: compiledSheet ? { bytes: compiledSheet.bytes, views: compiledSheet.views, previousPath: source.data.characterSheetPath } : undefined,
      })
      promotedForRollback.length = 0
      const saved = committed.assets
      let savedPatch: Partial<StudioNodeData>
      if (characterInputMode === 'single') {
        savedPatch = {
          title: name,
          referenceTag: `@${name}`,
          characterInputMode: 'single',
          characterAspectRatio: source.data.characterAspectRatio || '1:1',
          referenceAssets: saved,
          referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'),
          characterSheetPath: undefined,
          characterSheetUrl: undefined,
          characterSheetViews: undefined,
          characterEditorOpen: false,
          runState: 'complete',
          progress: undefined,
          error: undefined,
        }
      } else {
        if (!committed.sheet) throw new Error('Character library: the hidden Multi reference sheet was not committed.')
        savedPatch = {
          title: name,
          referenceTag: `@${name}`,
          characterInputMode: 'multi',
          characterAspectRatio: source.data.characterAspectRatio || '1:1',
          referenceAssets: saved,
          referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'),
          characterSheetPath: committed.sheet.path,
          characterSheetUrl: committed.sheet.url,
          characterSheetViews: committed.sheet.views,
          characterEditorOpen: false,
          runState: 'complete',
          progress: undefined,
          error: undefined,
        }
      }
      if (intent.mode === 'replace-existing' && existingCollection && !editingExisting) {
        const replaceCharacterReferences = (node: StudioNode): StudioNode => node.data.kind === 'character' && normalizeLogicalAssetName(node.data.referenceTag || node.data.title) === name
          ? { ...node, data: { ...node.data, ...savedPatch } }
          : node
        setNodes((current) => current.map(replaceCharacterReferences))
        setPages((current) => current.map((page) => ({ ...page, nodes: page.nodes.map(replaceCharacterReferences) })))
      }
      setAssets(await window.prism.assets.list())
      updateNode(nodeId, { ...savedPatch, semanticReplacementAuthority: undefined })
    } catch (error) {
      for (const id of promotedForRollback.reverse()) await window.prism.assets.delete(id).catch(() => undefined)
      const detail = error instanceof Error ? error.message : String(error)
      updateNode(nodeId, { error: /^Character library:/i.test(detail) ? detail : `Character library: ${detail}` })
    }
  }, [edges, nodes, setNodes, updateNode])

  const saveSemanticAsset = useCallback(async (nodeId: string, rawName: string) => {
    const source = nodes.find((node) => node.id === nodeId && (node.data.kind === 'element' || node.data.kind === 'location' || node.data.kind === 'wardrobe'))
    const name = normalizeLogicalAssetName(rawName)
    const elementInputMode = source?.data.elementInputMode === 'single' ? 'single' : 'multi'
    const references = source?.data.kind === 'element'
      ? (source.data.referenceAssets || []).filter((asset) => (asset.metadata?.elementInputMode === 'single' ? 'single' : 'multi') === elementInputMode)
      : source?.data.referenceAssets || []
    const missingRequiredElementAnchor = source?.data.kind === 'element' && !references.some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)
    if (!source || !name || !references.length || missingRequiredElementAnchor) {
      if (source) updateNode(nodeId, { error: `Generate or add a ${source.data.kind === 'location' ? 'Location' : source.data.kind === 'wardrobe' ? 'Wardrobe' : 'Element'} reference before saving.` })
      return
    }
    if (!resolvedAssetReferenceDescription(source, nodes, edges).trim()) { updateNode(nodeId, { error: 'Fill the Description before saving this asset.' }); return }
    try {
      const semanticKind = source.data.kind as 'element' | 'location' | 'wardrobe'
      const currentAssets = await window.prism.assets.list()
      const currentById = new Map(currentAssets.map((asset) => [asset.id, asset]))
      const saved: ImportedAsset[] = []
      for (const reference of references) {
        const registered = reference.category === semanticKind && !reusableSaveMustCopyReference(source.data, reference.id) ? currentById.get(reference.id) : undefined
        const managed = registered || (await window.prism.assets.promote([reference.path], semanticKind, name))[0]
        if (!managed) throw new Error(`${name} contains a missing reference that could not be saved.`)
        saved.push(await window.prism.assets.updateMetadata(managed.id, { ...managed.metadata, ...reference.metadata, assetName: name, assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'), prompt: undefined, ...(semanticKind === 'element' ? { elementInputMode } : {}) }))
      }
      setAssets(await window.prism.assets.list())
      updateNode(nodeId, { title: name, referenceTag: `@${name}`, referenceAssets: saved, semanticReplacementAuthority: undefined, semanticEditorOpen: false, runState: 'complete', progress: undefined, error: undefined })
    } catch (error) {
      updateNode(nodeId, { error: error instanceof Error ? error.message : String(error) })
    }
  }, [edges, nodes, updateNode])

  const commitSemanticAssetResult = useCallback(async (nodeId: string, selectedResultId: string) => {
    const source = nodes.find((node) => node.id === nodeId && ['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(node.data.kind))
    if (!source) return
    if (!resolvedAssetReferenceDescription(source, nodes, edges).trim()) { updateNode(nodeId, { error: 'Fill the Description before saving this asset.' }); return }
    try {
      const authority = source.data.semanticReplacementAuthority
      const intent = authority ? { mode: 'replace-existing' as const, ...authority } : { mode: 'create-new' as const }
      const committed = await window.prism.assets.commitSemanticResult({ nodeId, selectedResultId, intent })
      committed.asset = await window.prism.assets.updateMetadata(committed.asset.id, { ...committed.asset.metadata, referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto') })
      const savedReference = { id: committed.asset.id, path: committed.asset.path, url: committed.asset.url, source: 'saved' as const, createdAt: committed.asset.createdAt }
      updateNode(nodeId, {
        referenceAssets: [committed.asset], outputPath: committed.asset.path, outputUrl: committed.asset.url, outputType: 'image',
        generatedResults: undefined, activeResultIndex: undefined,
        semanticAssetLifecycle: { version: 1, status: 'SAVE_COMPLETE', references: [savedReference], selectedId: savedReference.id },
        semanticReplacementAuthority: undefined,
        characterEditorOpen: false, semanticEditorOpen: false, runState: 'complete', progress: 'Result saved.', error: undefined,
      })
      setAssets(await window.prism.assets.list())
    } catch (error) {
      const migrated = migrateSemanticAssetLifecycleMetadata(source.data).semanticAssetLifecycle
      updateNode(nodeId, { semanticAssetLifecycle: migrated ? { ...migrated, status: 'SAVE_FAILED' } : migrated, error: error instanceof Error ? error.message : String(error), progress: undefined })
    }
  }, [edges, nodes, updateNode])

  const inspectAssetBatch = useCallback((kind: AssetBatchKind, paths: string[]) => window.prism.assets.inspectBatch(paths, kind), [])
  const chooseAssetBatch = useCallback((kind: AssetBatchKind) => window.prism.assets.chooseBatch(kind), [])
  const saveAssetBatchRow = useCallback(async (kind: AssetBatchKind, row: AssetBatchInspection, rawName: string) => {
    const name = normalizeLogicalAssetName(rawName)
    if (!name) throw new Error('Name this asset before saving it.')
    if (!row.referenceDescription?.trim()) throw new Error('Fill this asset’s Description before saving it.')
    const imported = await window.prism.assets.importPaths([row.path], kind, name)
    const source = imported[0]
    if (!source) throw new Error(`Could not import ${row.fileName}.`)
    await window.prism.assets.updateMetadata(source.id, {
      ...source.metadata,
      assetName: name, referenceDescription: row.referenceDescription, referenceDescriptionMode: 'authored',
      ...(kind === 'character' ? { characterInputMode: 'single', characterView: 'front' } : {}),
      ...(kind === 'element' ? { elementInputMode: 'single', elementView: ELEMENT_ANCHOR_VIEW } : {}),
      ...(kind === 'location' ? { locationInputMode: 'single' } : {}),
      ...(kind === 'wardrobe' ? { wardrobeInputMode: 'single' } : {}),
    })
    setAssets(await window.prism.assets.list())
  }, [])

  const availableDescriptionTags = useCallback(() => assetDescriptionKnownTags(nodes), [nodes])

  const mediaReferenceType = useCallback((nodeId: string) => mediaReferenceConnectionType(nodeId, nodes, edges), [nodes, edges])

  const mediaDescriptionConnected = useCallback((nodeId: string) => mediaDescriptionConnectedToGenerator(nodeId, nodes, edges), [nodes, edges])

  useEffect(() => {
    setNodes(current => {
      let changed = false
      const next = current.map(node => {
        const patch = automaticAssetDescriptionPatch(node, current, edges)
        if (!patch) return node
        changed = true
        return { ...node, data: { ...node.data, ...patch } }
      })
      return changed ? next : current
    })
  }, [nodes, edges, setNodes])

  const assetDescriptionHint = useCallback((nodeId: string) => {
    const node = nodes.find(item => item.id === nodeId)
    return node ? assetDescriptionPlaceholderForNode(node, nodes, edges) : ''
  }, [nodes, edges])

  const assetDescriptionValue = useCallback((nodeId: string) => {
    const node = nodes.find(item => item.id === nodeId)
    return node ? resolvedAssetReferenceDescription(node, nodes, edges) : ''
  }, [nodes, edges])

  const revampAssetDescription = useCallback(async (nodeId: string) => {
    const source = nodes.find(node => node.id === nodeId)
    if (!source || !['character', 'wardrobe', 'element', 'location', 'style-reference', 'upload', 'image-generator', 'image-editor', 'upscaler', 'video-generator', 'output', 'voiceover', 'sound-effects', 'music-generator'].includes(source.data.kind)) return
    if (source.data.runState === 'running' || source.data.runState === 'queued') return
    const origin = promptGraphRef.current
    const context = assetDescriptionRevampContext(source, nodes, edges)
    if (!context.description.trim()) { updateNode(nodeId, { error: 'Write what this asset represents before revamping its Description.' }); return }
    const catalogs = Object.fromEntries(ASSISTANT_PROVIDER_GROUPS.map(({ id: provider }) => [provider, availablePromptModels(provider)])) as AssistantCatalogs
    const selection = resolveAssistantSelection(source.data.assistantProvider, source.data.assistantModelId, catalogs)
    if (!selection) { updateNode(nodeId, { error: 'Choose an available Revamp model for this Description.' }); return }
    const { provider, model } = selection
    updateNode(nodeId, { runState: 'running', progress: 'Revamping Description…', error: undefined })
    try {
      const rewrite = await requestPromptRewrite(nodeId, provider, context.description, assetDescriptionRevampInstruction(context), model)
      const currentGraph = promptGraphRef.current, current = currentGraph.nodes.find(node => node.id === nodeId)
      if (!current || !rewrite.canApply(currentGraph.nodes) || assetDescriptionRevampContext(current, currentGraph.nodes, currentGraph.edges).fingerprint !== context.fingerprint) throw new DOMException('The asset Description context changed.', 'AbortError')
      const referenceDescription = validateAssetDescriptionRevamp(context.description, rewrite.output, context.allowedTags)
      updateNode(nodeId, { referenceDescription, referenceDescriptionMode: 'authored', assistantProvider: provider, assistantModelId: model, runState: source.data.runState || 'idle', progress: referenceDescription === context.description ? 'Description unchanged' : 'Description revamped', error: undefined }, rewrite.canApply)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (promptGraphRef.current.project === origin.project && promptGraphRef.current.canvas === origin.canvas && promptGraphRef.current.page === origin.page) setNodes(current => current.map(node => node.id === nodeId && node.data.progress === 'Revamping Description…' ? { ...node, data: { ...node.data, runState: source.data.runState || 'idle', progress: undefined } } : node))
        return
      }
      updateNode(nodeId, { runState: source.data.runState || 'idle', progress: undefined, error: error instanceof Error ? error.message : String(error) })
    }
  }, [nodes, edges, availablePromptModels, requestPromptRewrite, updateNode, setNodes])

  const buildStylePrompt = useCallback(async (nodeId: string) => {
    const source = nodes.find((node) => node.id === nodeId && node.data.kind === 'style-reference')
    if (!source) return
    const text = localAssetGenerationPrompt(source.data).trim()
    if (!text) { updateNode(nodeId, { error: 'Describe the visual style first.' }); return }
    const assistantCatalogs = Object.fromEntries(ASSISTANT_PROVIDER_GROUPS.map(({ id: provider }) => [provider, availablePromptModels(provider)])) as AssistantCatalogs
    const selection = resolveAssistantSelection(source.data.assistantProvider, source.data.stylePromptModelId, assistantCatalogs)
    if (!selection) { setSettingsOpen(true); updateNode(nodeId, { error: 'Connect OmniRoute or a direct text provider before building a Style prompt.' }); return }
    const { provider, model } = selection
    const ownsServiceOperation = serviceResponseScope.current!.capture(provider)
    updateNode(nodeId, { runState: 'running', progress: `Building private Style prompt with ${providerDisplayName(provider)}…`, error: undefined })
    try {
      const rewrite = await requestPromptRewrite(nodeId, provider, text, 'Convert the input into one reusable visual-style instruction for image and video generation. Describe only medium, rendering, palette, lighting, texture, lens or finish where relevant. Never add characters, subjects, locations, actions, story events, camera movement, or copyrighted artist and franchise names. Preserve the user intent. Return only the final style instruction.', model)
      const output = rewrite.output
      if (!rewrite.canApply(promptGraphRef.current.nodes)) throw new DOMException('The prompt context changed.','AbortError')
      updateNode(nodeId,{prompt:undefined,stylePrompt:output,assistantProvider:provider,stylePromptModelId:model,runState:'complete',progress:'Style prompt ready',styleSavedAt:undefined,error:undefined},rewrite.canApply)
    } catch (error) {
      if(error instanceof DOMException && error.name==='AbortError')return
      updateNode(nodeId, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
      void refreshServiceAccount(provider, ownsServiceOperation)
    }
  }, [nodes, refreshServiceAccount, serviceModels, availablePromptModels, requestPromptRewrite, updateNode])

  const saveStylePreset = useCallback(async (nodeId: string, rawName: string) => {
    const source = nodes.find((node) => node.id === nodeId && node.data.kind === 'style-reference')
    if (!source) return
    const prompt = (source.data.stylePrompt || '').trim()
    const description = (source.data.styleDescription || '').trim()
    const name = normalizeLogicalAssetName(rawName)
    const referencePaths = (source.data.referenceAssets || []).map((asset) => asset.path).filter(Boolean)
    if (!description || !prompt || !name || source.data.runState !== 'complete') {
      updateNode(nodeId, { error: !description ? 'Add the required short Style description before saving.' : 'Build the finalized reusable Style prompt before saving.' })
      return
    }
    if (!resolvedAssetReferenceDescription(source, nodes, edges).trim()) { updateNode(nodeId, { error: 'Fill the Description before saving this asset.' }); return }
    try {
      const authority = source.data.semanticReplacementAuthority
      const intent = authority ? { mode: 'replace-existing' as const, ...authority } : { mode: 'create-new' as const }
      const promoted = referencePaths.length
        ? await window.prism.assets.promote(referencePaths, 'style-reference', name)
        : [await window.prism.assets.saveStylePrompt(name, prompt, source.data.stylePromptModelId || 'google/gemini-pro-1.5', intent)]
      if (!promoted.length) throw new Error('The Style reference could not be saved.')
      const saved = await Promise.all(promoted.map((asset) => window.prism.assets.updateMetadata(asset.id, {
        ...asset.metadata,
        assetName: name,
        assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'),
        prompt,
        styleDescription: description,
        provider: 'Prism Foundry',
        modelId: 'Custom Preset Style',
      })))
      setAssets((current) => [...saved, ...current.filter((asset) => !saved.some((item) => item.id === asset.id))])
      updateNode(nodeId, { title: name, referenceTag: `@${name}`, styleDescription: description, styleSavedAt: new Date().toISOString(), semanticReplacementAuthority: undefined, styleEditorOpen: false, progress: undefined, error: undefined })
    } catch (error) {
      updateNode(nodeId, { error: error instanceof Error ? error.message : String(error) })
    }
  }, [edges, nodes, updateNode])

  const importStoryboardPanel = useCallback(async (nodeId: string, panelId: string) => {
    const asset = await window.prism.assets.import(undefined, 'Storyboard')
    if (!asset || !asset.mimeType.startsWith('image/')) return
    const linked = { ...asset, url: asset.url || `prism-asset://local/${encodeURIComponent(asset.path)}` }
    setAssets((current) => [linked, ...current.filter((candidate) => candidate.id !== linked.id)])
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, storyboardPanels: (node.data.storyboardPanels || []).map((panel) => panel.id === panelId ? { ...panel, asset: linked } : panel), storyboardNeedsCompile: Boolean(node.data.outputPath || node.data.outputUrl) } } : node))
  }, [setNodes])

  const storyboardRewriteInFlight = useRef(new Set<string>())
  const rewriteStoryboardPanel = useCallback(async (nodeId: string, panelId?: string) => {
    if (storyboardRewriteInFlight.current.has(nodeId)) return
    const source = nodes.find((node) => node.id === nodeId)
    if (!source) return
    const panels = (source.data.storyboardPanels || []).map(migrateStoryboardPromptVersions)
    const activePanels = panels.map((panel) => ({ ...panel, prompt: selectedStoryboardPrompt(panel) }))
    const eligibleTargets = activePanels.filter((panel) => !panel.locked && (!panelId || panel.id === panelId) && panel.prompt.trim())
    const targets = storyboardRewriteTargets(activePanels, panelId)
    if (!eligibleTargets.length) { updateNode(nodeId, { error: 'Write a prompt or unlock a panel first.' }); return }
    if (!targets.length) {
      updateNode(nodeId, { runState: 'complete', error: undefined, progress: 'Storyboard already complete.' })
      return
    }
    const rawAssistantCatalogs = Object.fromEntries(ASSISTANT_PROVIDER_GROUPS.map(({ id: provider }) => [provider, availablePromptModels(provider)])) as AssistantCatalogs
    const assistantCatalogs = assistantCatalogsWithSavedSelection(rawAssistantCatalogs, source.data.assistantProvider, source.data.assistantModelId, Boolean(source.data.assistantProvider && serviceModels[source.data.assistantProvider]?.verified))
    const selection = resolveAssistantSelection(source.data.assistantProvider, source.data.assistantModelId, assistantCatalogs)
    if (!selection) { updateNode(nodeId, { runState: 'error', progress: undefined, error: 'Could not revamp, check connection.' }); return }
    const { provider, model } = selection
    storyboardRewriteInFlight.current.add(nodeId)
    try {
      updateNode(nodeId, { runState: 'running', progress: `Revamping ${targets.length} panel${targets.length === 1 ? '' : 's'}`, error: undefined })
      const connectedContexts = new Map(activePanels.map((panel) => [panel.id, buildStoryboardConnectedContextManifest(nodeId, nodes, edges, panel.prompt, panel)]))
      let canApply:(current:StudioNode[])=>boolean=()=>false
      let rewritten: Map<string, string>
      if (panelId) {
        const target = targets[0]
        const connectedContext = connectedContexts.get(target.id)!
        const rewrite = await requestPromptRewrite(nodeId, provider, target.prompt, storyboardRewriteInstruction(activePanels, target.id, connectedContext.text), model)
        canApply=rewrite.canApply
        const result = rewrite.output
        if (!rewrite.canApply(promptGraphRef.current.nodes)) throw new DOMException('The prompt context changed.','AbortError')
        rewritten = new Map([[target.id, validateStoryboardRewrite(target.prompt, result, connectedContext, target, activePanels)]])
      } else {
        const rewrite = await requestPromptRewrite(nodeId, provider, activePanels.map((panel) => panel.prompt).join('\n\n'), storyboardBatchRewriteInstruction(activePanels, connectedContexts), model)
        canApply=rewrite.canApply
        const result = rewrite.output
        if (!rewrite.canApply(promptGraphRef.current.nodes)) throw new DOMException('The prompt context changed.','AbortError')
        rewritten = parseStoryboardBatchResponse(result, targets.map((panel) => panel.id))
      }
      const outcome = panelId
        ? applyStoryboardRewrites(activePanels, rewritten)
        : applyStoryboardBatchResponse(activePanels, rewritten, connectedContexts)
      const successful = applySuccessfulStoryboardRevamps(panels, new Map(outcome.panels
        .filter((panel, index) => panel.prompt !== activePanels[index].prompt)
        .map((panel) => [panel.id, panel.prompt])))
      setNodes((current) => !canApply(current) ? current : current.map((node) => node.id !== nodeId ? node : ({
        ...node,
        data: {
          ...node.data,
          ...nodeLifecycleTransition(node.data, {
            storyboardPanels: successful.panels,
            assistantProvider: provider,
            assistantModelId: model,
            storyboardNeedsCompile: successful.changed ? Boolean(node.data.outputPath || node.data.outputUrl) : node.data.storyboardNeedsCompile,
            runState: 'complete',
            error: undefined,
            progress: successful.changed ? 'Storyboard revamped.' : 'Storyboard unchanged.',
          }),
        },
      })))
    } catch (error) {
      if(error instanceof DOMException && error.name==='AbortError')return
      updateNode(nodeId, { runState: 'error', progress: undefined, error: 'Could not revamp, check connection.' })
    } finally {
      storyboardRewriteInFlight.current.delete(nodeId)
    }
  }, [edges, nodes, serviceModels, availablePromptModels, requestPromptRewrite, setNodes, updateNode])

  const connectStyleNode = useCallback((targetId: string, styleNodeId: string) => {
    const target = nodes.find(node => node.id === targetId)
    if (target?.data.kind !== 'video-generator') return
    const styleEdge: Edge = { id: crypto.randomUUID(), source: styleNodeId, sourceHandle: 'media-out', target: targetId, targetHandle: 'style-in', animated: false, style: { stroke: '#d38cff', strokeWidth: 2 } }
    setEdges(current => [...current.filter(edge => !(edge.target === targetId && edge.targetHandle === 'style-in')), styleEdge])
    updateNode(targetId, { error: undefined })
    setStyleChooserNodeId(null)
  }, [nodes, setEdges, updateNode])

  const styleNodeForGenerator = useCallback((storyboardId: string) => {
    const storyboard = nodes.find((node) => node.id === storyboardId)
    if (storyboard?.data.kind !== 'video-generator') return null
    const existingEdge = edges.find((edge) => edge.target === storyboardId && edge.targetHandle === 'style-in')
    const existingStyle = nodes.find((node) => node.id === existingEdge?.source && node.data.kind === 'style-reference')
    const styleId = existingStyle?.id || createNode('style-reference', { x: storyboard.position.x - 370, y: storyboard.position.y + 50 })
    if (!existingStyle) connectStyleNode(storyboardId, styleId)
    return styleId
  }, [connectStyleNode, createNode, edges, nodes])

  const openCustomStyleForGenerator = useCallback((storyboardId: string) => {
    const styleId = styleNodeForGenerator(storyboardId)
    if (!styleId) return
    updateNode(styleId, { styleEditorOpen: true })
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === styleId })))
    setStyleChooserNodeId(null)
  }, [setNodes, styleNodeForGenerator, updateNode])

  const applyPresetStyleToGenerator = useCallback((storyboardId: string, preset: (typeof STYLE_PRESETS)[number]) => {
    const styleId = styleNodeForGenerator(storyboardId)
    if (!styleId) return
    updateNode(styleId, {
      title: preset.title,
      referenceTag: `@${preset.id}`,
      prompt: preset.prompt,
      stylePrompt: preset.prompt,
      styleDescription: preset.description,
      stylePresetId: preset.id,
      styleSavedAt: undefined,
      styleEditorOpen: false,
    })
    connectStyleNode(storyboardId, styleId)
  }, [connectStyleNode, styleNodeForGenerator, updateNode])

  const addPresetStyleToCanvas = useCallback((preset: (typeof STYLE_PRESETS)[number]) => {
    const styleId = createNode('style-reference')
    updateNode(styleId, {
      title: preset.title,
      referenceTag: `@${preset.id}`,
      prompt: preset.prompt,
      stylePrompt: preset.prompt,
      styleDescription: preset.description,
      stylePresetId: preset.id,
      styleSavedAt: undefined,
      styleEditorOpen: false,
    })
    setAppView('canvas')
    setHomeSection('spaces')
    setAssetBrowserOpen(false)
    window.setTimeout(() => focusNode(styleId), 40)
  }, [createNode, focusNode, updateNode])

  const addLibraryStyleToCanvas = useCallback((asset: ImportedAsset) => {
    const styleId = createNode('style-reference')
    const title = assetDisplayName(asset) || 'Preset Style'
    const prompt = asset.metadata?.prompt || ''
    updateNode(styleId, {
      title,
      referenceTag: `@${title.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`,
      prompt,
      stylePrompt: prompt,
      styleDescription: asset.metadata?.styleDescription,
      referenceAssets: [asset],
      styleSavedAt: asset.createdAt,
      styleEditorOpen: false,
    })
    setAppView('canvas')
    setHomeSection('spaces')
    setAssetBrowserOpen(false)
    window.setTimeout(() => focusNode(styleId), 40)
  }, [createNode, focusNode, updateNode])

  const addSemanticCollectionToCanvas = useCallback((collection: SemanticAssetCollection) => {
    const nodeId = createNode(collection.category)
    updateNode(nodeId, {
      title: collection.name,
      referenceTag: `@${collection.name}`,
      referenceAssets: collection.assets,
      ...reusableAssetHydrationPatch(collection.category, collection.assets),
      ...(collection.category === 'character'
        ? { characterRole: undefined, characterEditorOpen: false }
        : { semanticEditorOpen: false }),
      progress: `${collection.assets.length} ${collection.category === 'character' ? 'Character' : collection.category === 'element' ? 'Element' : 'Location'} view${collection.assets.length === 1 ? '' : 's'} ready`,
      error: undefined,
    })
    setAssetBrowserOpen(false)
    window.setTimeout(() => focusNode(nodeId), 40)
  }, [createNode, focusNode, updateNode])

  const addMediaAssetToCanvas = useCallback((asset: ImportedAsset) => {
    const nodeId = createNode('upload')
    const outputType: NonNullable<StudioNodeData['outputType']> = asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image'
    updateNode(nodeId, {
      title: asset.name,
      assetPath: asset.path,
      assetUrl: asset.url || `prism-asset://local/${encodeURIComponent(asset.path)}`,
      outputType,
      progress: 'Added from your local library',
      error: undefined,
    })
    setAssetBrowserOpen(false)
    window.setTimeout(() => focusNode(nodeId), 40)
  }, [createNode, focusNode, updateNode])

  const addInspectorReference = useCallback(async (targetId: string, kind: 'prompt' | 'storyboard' | 'character' | 'wardrobe' | 'element' | 'location' | 'style-reference' | 'upload', targetHandle = 'image-in') => {
    const target = nodes.find((node) => node.id === targetId)
    if (!target) return
    const reusable = ['character', 'wardrobe', 'element', 'location'].includes(kind)
      ? nodes.find((node) => node.data.kind === kind && hasMaterializedAsset(node.data))
      : kind === 'style-reference'
        ? nodes.find((node) => node.data.kind === 'style-reference' && (hasMaterializedAsset(node.data) || node.data.stylePresetId))
        : kind === 'storyboard'
          ? nodes.find((node) => node.data.kind === 'storyboard')
        : undefined
    const sourceId = reusable?.id || createNode(kind, { x: target.position.x - 380, y: target.position.y + (kind === 'style-reference' ? 190 : 0) })
    const resolvedTargetHandle = kind === 'style-reference' ? 'style-in' : targetHandle
    const sourceHandle = kind === 'prompt' ? 'text-out' : kind === 'storyboard' ? 'storyboard-out' : 'media-out'
    if (kind === 'upload') {
      const asset = await importAsset(sourceId)
      if (!asset) return
      const outputType = asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image'
      const error = connectionCompatibilityError({ kind: 'upload', outputType }, target.data, 'media-out', resolvedTargetHandle)
      if (error) {
        setConnectionErrorNotice(error)
        return
      }
    }
    if (target.data.kind === 'video-generator' && ['storyboard-in', 'character-in', 'wardrobe-in', 'element-in', 'location-in', 'style-in', 'reference-in'].includes(resolvedTargetHandle)) {
      const model = resolveVideoModel(target.data.videoEngine)
      if (model.mode !== 'reference') updateNode(target.id, { videoEngine: referenceCapableVideoEngine(model.id), progress: 'Reference-capable model selected.' })
    }
    setEdges((current) => addEdge({
      id: crypto.randomUUID(), source: sourceId, sourceHandle, target: targetId, targetHandle: resolvedTargetHandle, animated: false,
      style: { stroke: ['character', 'wardrobe', 'element', 'location'].includes(kind) ? '#a68cff' : kind === 'style-reference' ? '#d38cff' : '#58d3cc', strokeWidth: 2 },
    }, current))
  }, [createNode, importAsset, nodes, setEdges, updateNode])

  const reusableSemanticCollections = useMemo(() => groupSemanticAssets(assets.filter((asset) => !asset.trashedAt && asset.mimeType.startsWith('image/'))), [assets])

  const characterLibrary = useMemo(() => {
    const nodeEntries = reusableSelectorSourceNodes(nodes)
      .filter((node) => node.data.kind === 'character' && hasMaterializedAsset(node.data) && !node.data.reusableDeletedAt && (node.data.referenceAssets || []).some((asset) => asset.metadata?.characterView === 'front'))
      .map((node) => {
        const name = normalizeLogicalAssetName(node.data.referenceTag || node.data.title)
        const managedCollection = reusableSemanticCollections.find((collection) => collection.category === 'character' && collection.key === semanticAssetCollectionKey('character', name))
        return {
          nodeId: node.id,
          title: node.data.title,
          referenceTag: node.data.referenceTag,
          referenceAssets: hydrateSemanticAssetViews(node.data.referenceAssets || [], managedCollection?.assets || [], 'character'),
          characterInputMode: node.data.characterInputMode === 'single' ? 'single' as const : 'multi' as const,
          characterAspectRatio: node.data.characterAspectRatio || '1:1',
          prompt: localAssetGenerationPrompt(node.data) || managedCollection?.assets.find((asset) => asset.metadata?.assetGenerationPrompt || asset.metadata?.prompt)?.metadata?.assetGenerationPrompt || managedCollection?.assets.find((asset) => asset.metadata?.prompt)?.metadata?.prompt,
        }
      })
    const representedKeys = new Set(nodeEntries.flatMap((entry) => entry.referenceAssets
      .filter((asset) => asset.category === 'character')
      .map((asset) => semanticAssetCollectionKey('character', assetDisplayName(asset)))))
    const assetEntries = reusableSemanticCollections
      .filter((collection) => collection.category === 'character' && !representedKeys.has(collection.key))
      .map((collection) => {
        const title = collection.name || 'Character'
        const referenceTag = `@${title.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`
        const characterInputMode = collection.assets.some((asset) => asset.metadata?.characterInputMode === 'single') ? 'single' as const : 'multi' as const
        return { nodeId: `asset-collection:${collection.key}`, title, referenceTag, referenceAssets: collection.assets, characterInputMode, characterAspectRatio: collection.assets.find((asset) => asset.metadata?.characterAspectRatio)?.metadata?.characterAspectRatio || '1:1', prompt: collection.assets.find((asset) => asset.metadata?.assetGenerationPrompt || asset.metadata?.prompt)?.metadata?.assetGenerationPrompt || collection.assets.find((asset) => asset.metadata?.prompt)?.metadata?.prompt }
      })
    return [...nodeEntries, ...assetEntries]
  }, [nodes, reusableSemanticCollections])

  const semanticLibraries = useMemo(() => {
    const build = (kind: 'element' | 'location' | 'wardrobe' | 'style-reference', category: 'element' | 'location' | 'wardrobe' | 'style') => {
      const nodeEntries = reusableSelectorSourceNodes(nodes)
        .filter((node) => node.data.kind === kind && hasMaterializedAsset(node.data) && !node.data.reusableDeletedAt)
        .map((node) => ({ nodeId: node.id, title: node.data.title, referenceTag: node.data.referenceTag, referenceAssets: node.data.referenceAssets || [], prompt: node.data.stylePrompt || node.data.prompt, description: node.data.styleDescription }))
      const representedAssetIds = new Set(nodeEntries.flatMap((entry) => entry.referenceAssets.map((asset) => asset.id)))
      const semanticCategory = category === 'style' ? undefined : category
      const representedKeys = new Set(semanticCategory ? nodeEntries.flatMap((entry) => entry.referenceAssets
        .filter((asset) => asset.category === semanticCategory)
        .map((asset) => semanticAssetCollectionKey(semanticCategory, assetDisplayName(asset)))) : [])
      const assetEntries = semanticCategory
        ? reusableSemanticCollections.filter((collection) => collection.category === semanticCategory && !representedKeys.has(collection.key)).map((collection) => {
          const title = collection.name || (kind === 'location' ? 'Location' : kind === 'wardrobe' ? 'Wardrobe' : 'Element')
          return { nodeId: `asset-collection:${collection.key}`, title, referenceTag: `@${title.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`, referenceAssets: collection.assets, prompt: collection.assets.find((asset) => asset.metadata?.prompt)?.metadata?.prompt, description: collection.assets.find((asset) => asset.metadata?.styleDescription)?.metadata?.styleDescription }
        })
        : assets.filter((asset) => asset.category === category && asset.mimeType.startsWith('image/') && !asset.trashedAt && !representedAssetIds.has(asset.id)).map((asset) => {
          const title = assetDisplayName(asset) || 'Style'
          return { nodeId: `asset:${asset.id}`, title, referenceTag: `@${title.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`, referenceAssets: [asset], prompt: asset.metadata?.prompt, description: asset.metadata?.styleDescription }
        })
      return [...nodeEntries, ...assetEntries]
    }
    return {
      element: build('element', 'element'),
      location: build('location', 'location'),
      wardrobe: build('wardrobe', 'wardrobe'),
      'style-reference': build('style-reference', 'style'),
    }
  }, [assets, nodes, reusableSemanticCollections])

  const selectCharacter = useCallback((targetId: string, sourceId: string) => {
    if (sourceId.startsWith('asset-collection:')) {
      const collection = reusableSemanticCollections.find((candidate) => candidate.category === 'character' && sourceId === `asset-collection:${candidate.key}`)
      if (!collection) return
      const characterInputMode = collection.assets.some((asset) => asset.metadata?.characterInputMode === 'single') ? 'single' : 'multi'
      updateNode(targetId, {
        title: collection.name,
        referenceTag: `@${collection.name}`,
        referenceAssets: collection.assets,
        characterInputMode,
        characterAspectRatio: collection.assets.find((asset) => asset.metadata?.characterAspectRatio)?.metadata?.characterAspectRatio || '1:1',
        characterSheetPath: collection.assets.find((asset) => asset.metadata?.characterSheetPath)?.metadata?.characterSheetPath,
        characterSheetUrl: collection.assets.find((asset) => asset.metadata?.characterSheetUrl)?.metadata?.characterSheetUrl,
        characterSheetViews: collection.assets.find((asset) => asset.metadata?.characterSheetViews)?.metadata?.characterSheetViews,
        ...reusableAssetHydrationPatch('character', collection.assets),
        characterRole: undefined,
        characterEditorOpen: false,
        selectorDeployment: true,
      })
      return
    }
    if (sourceId.startsWith('asset:')) {
      const asset = assets.find((candidate) => candidate.id === sourceId.slice('asset:'.length))
      if (!asset) return
      const title = assetDisplayName(asset) || 'Character'
      updateNode(targetId, {
        title,
        referenceTag: `@${title.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`,
        referenceAssets: [{ ...asset, metadata: { ...asset.metadata, characterView: asset.metadata?.characterView || 'front' } }],
        characterInputMode: asset.metadata?.characterInputMode === 'single' ? 'single' : 'multi',
        characterAspectRatio: asset.metadata?.characterAspectRatio || '1:1',
        characterSheetPath: asset.metadata?.characterSheetPath,
        characterSheetUrl: asset.metadata?.characterSheetUrl,
        characterSheetViews: asset.metadata?.characterSheetViews,
        ...reusableAssetHydrationPatch('character', [asset]),
        characterRole: undefined,
        characterEditorOpen: false,
        selectorDeployment: true,
      })
      return
    }
    const source = nodes.find((node) => node.id === sourceId && node.data.kind === 'character')
    if (!source) return
    updateNode(targetId, {
      title: source.data.title,
      referenceTag: source.data.referenceTag,
      referenceAssets: source.data.referenceAssets || [],
      characterInputMode: source.data.characterInputMode === 'single' ? 'single' : 'multi',
      characterAspectRatio: source.data.characterAspectRatio || '1:1',
      characterSheetPath: source.data.characterSheetPath,
      characterSheetUrl: source.data.characterSheetUrl,
      characterSheetViews: source.data.characterSheetViews,
      assetGenerationPrompt: localAssetGenerationPrompt(source.data), referenceDescription: resolvedAssetReferenceDescription(source, nodes, edges), referenceDescriptionMode: source.data.referenceDescriptionMode || (assetReferenceDescription(source.data).trim() ? 'authored' : 'auto'),
      prompt: undefined,
      characterRole: undefined,
      characterEditorOpen: false,
      selectorDeployment: true,
    })
  }, [assets, nodes, reusableSemanticCollections, updateNode])

  const selectSemanticAsset = useCallback((targetId: string, sourceId: string) => {
    const target = nodes.find((node) => node.id === targetId)
    if (!target || !['element', 'location', 'wardrobe', 'style-reference'].includes(target.data.kind)) return
    const sourceCollection = sourceId.startsWith('asset-collection:') ? reusableSemanticCollections.find((candidate) => sourceId === `asset-collection:${candidate.key}`) : undefined
    const sourceAsset = sourceId.startsWith('asset:') ? assets.find((asset) => asset.id === sourceId.slice('asset:'.length)) : undefined
    const sourceNode = sourceAsset || sourceCollection ? undefined : nodes.find((node) => node.id === sourceId && node.data.kind === target.data.kind)
    if (!sourceAsset && !sourceCollection && !sourceNode) return
    const title = sourceCollection?.name || (sourceAsset ? assetDisplayName(sourceAsset) : sourceNode!.data.title)
    const hydration = reusableAssetHydrationPatch(target.data.kind as 'element' | 'location' | 'wardrobe' | 'style-reference', sourceCollection?.assets || (sourceAsset ? [sourceAsset] : sourceNode?.data.referenceAssets || []))
    const prompt = target.data.kind === 'style-reference' ? sourceCollection?.assets.find((asset) => asset.metadata?.prompt)?.metadata?.prompt || sourceAsset?.metadata?.prompt || sourceNode?.data.stylePrompt || '' : ''
    const description = sourceCollection?.assets.find((asset) => asset.metadata?.styleDescription)?.metadata?.styleDescription || sourceAsset?.metadata?.styleDescription || sourceNode?.data.styleDescription
    const rawReferences = sourceCollection?.assets || (sourceAsset ? [sourceAsset] : sourceNode?.data.referenceAssets || [])
    const references = target.data.kind === 'element'
      ? rawReferences.slice(0, 4).map((asset, index) => ({ ...asset, metadata: { ...asset.metadata, elementView: asset.metadata?.elementView || ELEMENT_VIEWS[index].id } }))
      : rawReferences
    const selectedSheetsMode = rawReferences.some((asset) => target.data.kind === 'element'
      ? asset.metadata?.elementInputMode === 'single'
      : target.data.kind === 'location' && asset.metadata?.locationInputMode === 'single')
    updateNode(targetId, {
      title,
      referenceTag: sourceNode?.data.referenceTag || `@${title.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`,
      referenceAssets: references,
      ...(target.data.kind === 'element' ? { elementInputMode: selectedSheetsMode ? 'single' as const : 'multi' as const } : {}),
      ...(target.data.kind === 'location' ? { locationInputMode: 'single' as const } : {}),
      ...(target.data.kind === 'wardrobe' ? { wardrobeInputMode: 'single' as const } : {}),
      ...hydration,
      assetGenerationPrompt: sourceNode ? localAssetGenerationPrompt(sourceNode.data) : hydration.assetGenerationPrompt,
      referenceDescription: sourceNode ? assetReferenceDescription(sourceNode.data) : hydration.referenceDescription,
      referenceDescriptionMode: sourceNode?.data.referenceDescriptionMode ?? hydration.referenceDescriptionMode,
      prompt: undefined,
      ...(target.data.kind === 'style-reference' ? { stylePrompt: prompt, styleDescription: description, stylePresetId: undefined, styleSavedAt: sourceAsset?.createdAt || sourceNode?.data.styleSavedAt || new Date().toISOString(), styleEditorOpen: false, runState: 'complete' as const } : { semanticEditorOpen: false }),
      progress: undefined,
      error: undefined,
      selectorDeployment: true,
    })
  }, [assets, nodes, reusableSemanticCollections, updateNode])

  const setReusableFavorite = useCallback((nodeId: string, favorite: boolean) => {
    const source = nodes.find((node) => node.id === nodeId)
    if (!source) return
    void Promise.all((source.data.referenceAssets || []).map((asset) => window.prism.assets.updateState(asset.id, { favorite }))).then((updated) => {
      setAssets((current) => current.map((asset) => updated.find((item) => item.id === asset.id) || asset))
      updateNode(nodeId, { referenceAssets: (source.data.referenceAssets || []).map((asset) => updated.find((item) => item.id === asset.id) || asset) })
    })
  }, [nodes, updateNode])

  const exportReusableAsset = useCallback((nodeId: string) => {
    const source = nodes.find((node) => node.id === nodeId)
    const asset = source?.data.referenceAssets?.[0]
    if (asset) void window.prism.assets.exportPackage(asset.id)
    else if (source?.data.kind === 'style-reference' && (source.data.stylePrompt || '').trim()) void window.prism.assets.saveStylePrompt(source.data.title || 'style', source.data.stylePrompt!.trim(), source.data.stylePromptModelId || 'Prism Foundry', { mode: 'create-new' }).then((saved) => window.prism.assets.exportPackage(saved.id))
    else if (source) updateNode(nodeId, { error: 'Add or generate media before exporting this reusable asset.' })
  }, [nodes, updateNode])

  const deleteReusableAsset = useCallback((nodeId: string, deletionSource: 'preview' | 'sheet' = 'preview') => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return
    requestManagedAssetDelete(node.data.referenceAssets || [], node.data.title, {
      ...(deletionSource === 'sheet' ? {
        title: 'Delete Image?',
        messagePrefix: 'Deleting this image will also delete the saved Sheets asset from the Assets Library and Canvas side library.',
        confirmLabel: 'Delete',
      } : {}),
      onDeleted: () => updateNode(nodeId, {
        referenceAssets: [], generatedResults: undefined, outputPath: undefined, outputUrl: undefined, activeResultIndex: undefined,
        semanticAssetLifecycle: { version: 1, status: 'EMPTY', references: [] },
        characterEditorOpen: node.data.kind === 'character', semanticEditorOpen: ['element', 'location', 'wardrobe'].includes(node.data.kind),
        reusableDeletedAt: undefined, progress: undefined, error: undefined,
      }),
    })
  }, [nodes, requestManagedAssetDelete, updateNode])

  const saveStoryboard = useCallback((nodeId: string) => {
    const source = nodes.find((node) => node.id === nodeId && node.data.kind === 'storyboard')
    if (!source) return
    const name = normalizeLogicalAssetName(source.data.title || 'storyboard') || 'storyboard'
    updateNode(nodeId, { title: name, referenceTag: `@${name}`, storyboardNeedsCompile: !source.data.outputPath && !source.data.outputUrl, storyboardDeletedAt: undefined, runState: 'complete', progress: source.data.outputPath || source.data.outputUrl ? 'Storyboard saved' : 'Storyboard draft saved · compile before deployment', error: undefined })
  }, [nodes, updateNode])


  const incomingValue = useCallback((nodeId: string) => {
    return resolveWorkflowInput(nodeId, semanticGraphNodes, edges)
  }, [edges, semanticGraphNodes])

  const listBatchState = useCallback((listId: string) => {
    const sources = edges
      .filter((edge) => edge.target === listId && edge.targetHandle === 'input')
      .map((edge) => nodes.find((candidate) => candidate.id === edge.source))
      .filter((source): source is StudioNode => Boolean(source && isBatchGenerator(source)))
    const source = sources.length === 1 ? sources[0] : undefined
    const signal = source ? generatorBatchType(source.data) : null
    return {
      sourceCount: sources.length,
      sourceId: source?.id,
      sourceTitle: source?.data.title,
      signal: signal || undefined,
      quantity: source ? Math.min(4, Math.max(1, source.data.quantity || 1)) : undefined,
      maxQuantity: source ? 4 : undefined,
      adjustable: Boolean(source),
    }
  }, [edges, nodes])

  const adjustListBatchQuantity = useCallback((listId: string, delta: -1 | 1) => {
    const state = listBatchState(listId)
    if (!state.adjustable || !state.sourceId || state.quantity === undefined || state.maxQuantity === undefined) return
    const quantity = Math.min(state.maxQuantity, Math.max(1, state.quantity + delta))
    if (quantity !== state.quantity) updateNode(state.sourceId, { quantity })
  }, [listBatchState, updateNode])

  const closeConnections = useCallback(() => {
    setSettingsOpen(false)
    setActiveService(null)
    setSignInProfileId(null)
    setServiceDrafts((current) => Object.fromEntries(Object.keys(current).map((provider) => [provider, ''])) as typeof current)
  }, [])

  const openProviderConnections = useCallback((provider: ServiceProvider, modelLabel = 'this model') => {
    const providerName = providerDisplayName(provider)
    setActiveService(provider)
    setSignInProfileId(null)
    setServiceDrafts((current) => ({ ...current, [provider]: '' }))
    setSettingsOpen(true)
    setConnectionWarning({ provider, providerName, modelLabel })
  }, [])

  const runNode = useCallback(async (id: string) => {
    const node = nodes.find((candidate) => candidate.id === id)
    if (!node) return
    const jobFailures = higgsfieldJobReadinessFailures(id, higgsfieldJobs(), Boolean(node.data.higgsfieldNative || Object.keys(node.data.higgsfieldNativePresets || {}).length))
    if (jobFailures.length) { updateNode(id, { error: jobFailures.join('; ') }); return }
    const semanticAssetKind = ['character', 'element', 'location', 'wardrobe'].includes(node.data.kind) ? node.data.kind as 'character' | 'element' | 'location' | 'wardrobe' : undefined
    const isElementAsset = semanticAssetKind === 'element'
    const generationProvider = generationServiceProvider(node.data)
    const ownsServiceOperation = serviceResponseScope.current!.capture(generationProvider)
    if (!mediaProviderAvailable(generationProvider)) {
      const providerName = providerDisplayName(generationProvider)
      openProviderConnections(generationProvider, node.data.kind === 'video-generator' ? resolveVideoModel(node.data.videoEngine).label : audioGenerationLabel(node.data, serviceModels.elevenlabs) || modelDisplayName(node.data.imageModelId || node.data.videoEngine || node.data.kind))
      updateNode(id, { error: `Connect ${providerName} to run this node.` })
      return
    }
    if (generationProvider === 'byteplus' && node.data.kind === 'video-generator') {
      const videoModel = resolveVideoModel(node.data.videoEngine)
      let availability = serviceModels.byteplus
      if (!availability) {
        try {
          const acceptsModels = serviceResponseScope.current!.begin('byteplus', 'models')
          const refreshed = await window.prism.services.models('byteplus')
          if (!ownsServiceOperation()) return
          availability = refreshed
          if (acceptsModels()) setServiceModels((current) => ({ ...current, byteplus: refreshed }))
        } catch (error) {
          if (!ownsServiceOperation()) return
          openProviderConnections('byteplus', videoModel.label)
          updateNode(id, { error: `${providerDisplayName('byteplus')}: ${error instanceof Error ? error.message : String(error)}` })
          return
        }
      }
      const activationError = bytePlusActivationMessage(videoModel, availability)
      if (activationError) {
        openProviderConnections('byteplus', videoModel.label)
        updateNode(id, { error: activationError })
        return
      }
    }
    let request: GenerationRequest
    try {
      request = buildGenerationRequest(node, semanticGraphNodes, edges)
    }
    catch (error) {
      updateNode(id, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
      return
    }
    const account = serviceAccounts[generationProvider]
    const requirementFailures = generationRequirementFailures(request)
    if (node.data.higgsfieldNative) {
      requirementFailures.push(...higgsfieldPresetReadinessFailures(node.data.higgsfieldNative, higgsfieldPresets()), ...higgsfieldInputReadinessFailures(node.data.higgsfieldNative, higgsfieldSchema(node.data.higgsfieldNative.endpointId)))
    }
    const fishError = fishAvailabilityError(request, serviceModels.fish)
    if (fishError) requirementFailures.push(fishError)
    if (node.data.falNative && !request.draftCompletion) {
      const view = falSchema(node.data.falNative.endpointId)
      if (view.error) requirementFailures.push(view.error)
      else if (view.loading || !view.contract) requirementFailures.push('load the selected model contract')
      else if (view.contract.runtime?.fingerprint !== node.data.falNative.fingerprint) requirementFailures.push('review the refreshed model inputs')
      if (serviceModels.fal?.verified && !serviceModels.fal.catalogStale && !serviceModels.fal.models.some(model => model.id === node.data.falNative!.endpointId)) requirementFailures.push('choose an available model; the saved endpoint is no longer in this catalog')
    }
    if (account && ['credit-required', 'temporarily-limited', 'unavailable'].includes(account.state)) requirementFailures.unshift(account.message)
    if (requirementFailures.length) {
      updateNode(id, { runState: 'error', progress: undefined, error: `Cannot run: ${formatRequirementList(requirementFailures)}.` })
      return
    }
    const nativeVideoFields = request.falNative ? falSchema(request.falNative.endpointId).contract?.runtime?.fields
      : request.higgsfieldNative ? higgsfieldSchema(request.higgsfieldNative.endpointId).contract?.fields : undefined
    const repeatNativeVideo = request.kind === 'video-generator' && Boolean(request.falNative || request.higgsfieldNative)
      && (!request.higgsfieldNative || !higgsfieldSourceOwnsTimeline(request.higgsfieldNative.endpointId))
      && nativeVideoQuantityAvailable(nativeVideoFields)
    const batchToken = repeatNativeVideo ? { cancelled: false } : undefined
    const batchOrigin: GraphOrigin = { canvasId: activeCanvasId, pageId: activePageId }
    const patchGenerationNode = (patch: Partial<StudioNodeData>) => {
      if (repeatNativeVideo) { if (ownsServiceOperation() && graphAtOrigin(batchOrigin).nodes.some(candidate => candidate.id === id)) patchOriginNode(batchOrigin, id, patch) }
      else updateNode(id, patch)
    }
    if (batchToken) nativeVideoBatchTokens.current.set(id, batchToken)
    const timingKey = generationTimingKey(request)
    const coldStartSeconds = estimatedGenerationSeconds({ ...node.data, learnedGenerationSeconds: undefined })
    const learnedSeconds = learnedGenerationSeconds(history, timingKey, coldStartSeconds)
    const runStartedAt = new Date().toISOString()
    patchGenerationNode({ runState: 'queued', progress: 'Preparing request…', error: undefined, runStartedAt, learnedGenerationSeconds: learnedSeconds, ...(semanticAssetKind ? semanticAssetGenerationStartedPatch(node.data) : {}) })
    try {
      const batchSize = request.draftCompletion ? 1 : generationCallCount(Boolean(request.falNative || request.higgsfieldNative), node.data.quantity, isElementAsset ? 2 : 1, repeatNativeVideo)
      const keepsGenerationHistory = ['image-generator', 'image-editor', 'upscaler', 'video-generator', 'voiceover', 'sound-effects', 'music-generator', 'output'].includes(node.data.kind)
      const batchGeneratedResults: NonNullable<StudioNodeData['generatedResults']> = []
      const sourceLabels = [...new Set([
        request.inputTag,
        request.inputName,
        ...(request.references || []).map((reference) => reference.tag || reference.name),
      ].filter((label): label is string => Boolean(label?.trim())).map((label) => label.trim()))]
      let lastResult: Awaited<ReturnType<typeof window.prism.generation.run>> | undefined

      const runBatchIteration = async (index: number) => {
        patchGenerationNode({
          runState: 'running',
          progress: batchSize > 1 ? `Generating ${index + 1} of ${batchSize}…` : 'Generating…',
        })
        const elementAngles = ['front three-quarter view', 'rear three-quarter view', 'clean side profile', 'top or construction-detail view']
        const result = await window.prism.generation.run({
          ...request,
          quantity: 1,
          timingKey: index === batchSize - 1 ? timingKey : undefined,
          timingStartedAt: runStartedAt,
          timingSampleComplete: index === batchSize - 1,
          estimatedDurationMs: index === batchSize - 1 ? Math.max(1000, Math.round(learnedSeconds * 1000)) : undefined,
          prompt: isElementAsset ? `Create the same reusable element consistently from a ${elementAngles[index]}. ${request.prompt || ''} Isolated readable presentation, identical design, materials, proportions, markings, and color across every angle. No unrelated objects.`.trim() : request.prompt,
        })
        lastResult = result
        for (const media of generationResultMedia(result)) batchGeneratedResults.push({ id: crypto.randomUUID(), ...media, videoDraft: result.videoDraft, modelId: result.modelId, name: `${result.videoDraft ? result.videoDraft.status === 'draft' ? 'Draft 480p · ' : 'Final 1080p · ' : ''}${generatedResultName({ ...media, modelId: result.modelId }, node.data.title)}`, createdAt: new Date().toISOString(), sourceLabels })
        if (repeatNativeVideo && ownsServiceOperation()) {
          const liveData = graphAtOrigin(batchOrigin).nodes.find(candidate => candidate.id === id)?.data || node.data
          const generatedResults = mergeLiveGeneratedResults(liveData.generatedResults || [], batchGeneratedResults)
          patchGenerationNode({ outputPath: result.outputPath, outputUrl: result.outputUrl, outputType: result.outputType,
            modelId: result.modelId, generatedResults, activeResultIndex: Math.max(0, generatedResults.findIndex(item => item.path === result.outputPath)) })
          userMutationArmed.current = true; mutationVersion.current += 1; saveLifecycle.current?.markDirty()
        }
      }
      if (repeatNativeVideo) await runNativeVideoBatch(batchSize, runBatchIteration, () => Boolean(batchToken?.cancelled) || !ownsServiceOperation() || !graphAtOrigin(batchOrigin).nodes.some(candidate => candidate.id === id))
      else for (let index = 0; index < batchSize; index += 1) await runBatchIteration(index)

      if (!lastResult) throw new Error('The generation completed without returning media.')
      const liveNodeData = (repeatNativeVideo ? graphAtOrigin(batchOrigin).nodes : nodeLayoutRef.current).find((candidate) => candidate.id === id)?.data || node.data
      const liveGeneratedResults = keepsGenerationHistory
        ? [...(liveNodeData.generatedResults || [])]
        : []
      const semanticGenerationPatch = semanticAssetKind ? semanticAssetGenerationPatch(liveNodeData, batchGeneratedResults) : undefined
      const generatedResults = semanticGenerationPatch?.generatedResults || mergeLiveGeneratedResults(liveGeneratedResults, batchGeneratedResults)
      patchGenerationNode({
        runState: 'complete',
        draftCompletionPath: request.draftCompletion?.outputPath,
        videoDraftWarning: lastResult.videoDraftWarning,
        progress: lastResult.videoDraftWarning || `${batchGeneratedResults.length > 1 ? `${batchGeneratedResults.length} results complete` : 'Complete'} · ${providerModelDisplayName(lastResult.modelId)}`,
        outputPath: lastResult.outputPath,
        outputUrl: lastResult.outputUrl,
        outputType: lastResult.outputType,
        modelId: lastResult.modelId,
        ...(semanticGenerationPatch || { generatedResults, activeResultIndex: Math.max(0, generatedResults.findIndex(item => item.path === lastResult!.outputPath)) }),
        ...(semanticAssetKind ? { referenceTag: node.data.referenceTag || `@${(node.data.title || semanticAssetKind).replace(/^@+/, '').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}` } : {}),
        runStartedAt: undefined,
      })
      userMutationArmed.current = true
      mutationVersion.current += 1
      saveLifecycle.current?.markDirty()
      setHistory(await window.prism.history.list())
      setAssets(await window.prism.assets.list())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const stopped = !isHiggsfieldRemoteUncertainty(message) && (error instanceof DOMException && error.name === 'AbortError' || /abort|cancel|stopped/i.test(message))
      const liveData = (repeatNativeVideo ? graphAtOrigin(batchOrigin).nodes : nodeLayoutRef.current).find((candidate) => candidate.id === id)?.data || node.data
      const semanticStopped = semanticAssetKind ? semanticAssetGenerationStoppedPatch(liveData) : {}
      patchGenerationNode(stopped ? { runState: 'idle', progress: 'Stopped', error: undefined, runStartedAt: undefined, ...semanticStopped } : { runState: 'error', progress: undefined, error: message, runStartedAt: undefined, ...semanticStopped })
      userMutationArmed.current = true
      mutationVersion.current += 1
      saveLifecycle.current?.markDirty()
      setHistory(await window.prism.history.list())
      if (!stopped) {
        void refreshServiceAccount(generationProvider, ownsServiceOperation)
        if (request.falNative && ownsServiceOperation()) {
          falContractStore.current!.invalidate(serviceResponseScope.current!.identity('fal'), request.falNative.endpointId)
          void loadFalContract(request.falNative.endpointId)
        }
      }
    } finally {
      if (batchToken && nativeVideoBatchTokens.current.get(id) === batchToken) nativeVideoBatchTokens.current.delete(id)
      if (request.higgsfieldNative && ownsServiceOperation()) void refreshHiggsfieldJobs()
    }
  }, [activeCanvasId, activePageId, graphAtOrigin, patchOriginNode, higgsfieldJobs, refreshHiggsfieldJobs, falSchema, higgsfieldSchema, loadFalContract, history, incomingValue, nodes, openProviderConnections, refreshServiceAccount, semanticGraphNodes, serviceAccounts, serviceConnections, mediaProviderAvailable, serviceModels, setEdges, setNodes, updateNode, higgsfieldPresets])

  const recoverFalDraft = useCallback(async (node: StudioNode) => {
    const endpointId = node.data.falNative?.endpointId
    if (!endpointId || !supportsFalSeedanceDraft(endpointId)) return
    const origin: GraphOrigin = { canvasId: activeCanvasId, pageId: activePageId }
    patchOriginNode(origin, node.id, { runState: 'running', progress: 'Recovering existing fal draft…', error: undefined })
    try {
      const result = await window.prism.generation.run({ nodeId: node.id, kind: 'video-generator', quantity: 1,
        falDraftRecovery: { endpointId, requestId: node.data.falDraftRecoveryRequestId?.trim() || '' } })
      const live = graphAtOrigin(origin).nodes.find(candidate => candidate.id === node.id)
      if (!live) return
      const recovered = { id: crypto.randomUUID(), path: result.outputPath, url: result.outputUrl, type: result.outputType, modelId: result.modelId, videoDraft: result.videoDraft, name: 'Draft 480p · Recovered', createdAt: new Date().toISOString() }
      const generatedResults = mergeLiveGeneratedResults(live.data.generatedResults || [], [recovered])
      patchOriginNode(origin, node.id, { runState: 'complete', progress: 'Draft recovered · no new generation', error: undefined,
        outputPath: result.outputPath, outputUrl: result.outputUrl, outputType: result.outputType, modelId: result.modelId,
        generatedResults, activeResultIndex: Math.max(0, generatedResults.findIndex(item => item.path === result.outputPath)),
        falDraftRecoveryRequestId: undefined, videoDraftWarning: undefined })
      userMutationArmed.current = true; mutationVersion.current += 1; saveLifecycle.current?.markDirty()
      setHistory(await window.prism.history.list()); setAssets(await window.prism.assets.list())
    } catch (error) {
      patchOriginNode(origin, node.id, { runState: 'error', progress: undefined, error: error instanceof Error ? error.message : String(error) })
    }
  }, [activeCanvasId, activePageId, graphAtOrigin, patchOriginNode])

  const runSequence = useCallback(async () => {
    const origin: GraphOrigin = { canvasId: activeCanvasId, pageId: activePageId }
    const originGraph = graphAtOrigin(origin)
    const sequence = orderedSequenceNodes(originGraph.nodes.filter(node => !node.data.higgsfieldNative))
    if (sequence.length < 2) {
      setConnectionErrorNotice('Opt in at least two Video Generators and assign their sequence order first.')
      return
    }
    for (const target of sequence.slice(1)) {
      try { continuityVideoEngine(target.data.videoEngine) }
      catch (error) { patchOriginNode(origin, target.id, { sequenceStatus: 'failed', error: error instanceof Error ? error.message : String(error) }); return }
      const existingStart = originGraph.edges.find((edge) => edge.target === target.id && edge.targetHandle === 'image-in' && !(edge.data as { machineGenerated?: boolean } | undefined)?.machineGenerated)
      if (existingStart && !window.confirm(`“${target.data.title}” already has a Starting Image. Replace it with the preceding shot’s generated final frame?`)) {
        setConnectionNotice(`Sequence cancelled before generation; “${target.data.title}” kept its existing Starting Image.`)
        return
      }
    }

    let workingNodes = originGraph.nodes.map((node) => ({ ...node, data: { ...node.data } }))
    let workingEdges = [...originGraph.edges]
    for (const item of sequence) patchOriginNode(origin, item.id, { sequenceStatus: 'idle', error: undefined })

    for (let index = 0; index < sequence.length; index += 1) {
      const sequenceId = sequence[index].id
      const current = workingNodes.find((node) => node.id === sequenceId)!
      patchOriginNode(origin, sequenceId, { sequenceStatus: 'running', runState: 'running', progress: `Sequence shot ${index + 1} of ${sequence.length}…`, error: undefined })
      try {
        const request = buildGenerationRequest(current, projectSemanticAssetNodes(workingNodes, missingAssetIds), workingEdges)
        const failures = generationRequirementFailures(request)
        if (failures.length) throw new Error(`Cannot run sequence shot ${index + 1}: ${formatRequirementList(failures)}.`)
        const result = await window.prism.generation.run({ ...request, quantity: 1 })
        const liveGraph = graphAtOrigin(origin)
        const liveCurrent = liveGraph.nodes.find((node) => node.id === sequenceId) || current
        const completedPatch = sequenceCompletionPatch(liveCurrent.data, {
          path: result.outputPath,
          url: result.outputUrl,
          type: result.outputType,
          modelId: result.modelId,
          createdAt: new Date().toISOString(),
        }, `Sequence shot ${index + 1} complete · ${providerModelDisplayName(result.modelId)}`)
        workingNodes = liveGraph.nodes.map((node) => node.id === sequenceId ? { ...node, data: { ...node.data, ...completedPatch } } : node)
        workingEdges = [...liveGraph.edges]
        commitOriginGraph(origin, workingNodes, workingEdges)
        if (index === sequence.length - 1) continue

        const nextId = sequence[index + 1].id
        const next = workingNodes.find((node) => node.id === nextId)!
        const frame = await extractFinalVideoFrame(result.outputUrl)
        const asset = await window.prism.assets.importBuffer(await frame.arrayBuffer(), frame.type || 'image/png', `shot-${index + 1}-final-frame`, {
          provider: 'Prism Foundry Sequence', modelId: result.modelId, prompt: `Locked continuity frame from ${current.data.title}`,
        })
        const latestGraph = graphAtOrigin(origin)
        workingNodes = latestGraph.nodes
        workingEdges = latestGraph.edges
        const frameNodeId = crypto.randomUUID()
        const frameNode: StudioNode = {
          id: frameNodeId, type: 'studio', position: { x: (current.position.x + next.position.x) / 2, y: Math.min(current.position.y, next.position.y) - 170 },
          data: { ...initialData('upload'), title: `Shot ${index + 1} Final Frame`, assetPath: asset.path, assetUrl: asset.url, outputPath: asset.path, outputUrl: asset.url, outputType: 'image', locked: true, sequenceFrame: true, runState: 'complete' },
        }
        const nextEngine = continuityVideoEngine(next.data.videoEngine)
        workingEdges = workingEdges.filter((edge) => !(edge.target === nextId && edge.targetHandle === 'image-in'))
        const continuityEdge: Edge = {
          id: crypto.randomUUID(), source: frameNodeId, sourceHandle: 'media-out', target: nextId, targetHandle: 'image-in', animated: false,
          className: 'sequence-continuity-edge', style: { stroke: '#5fd7c7', strokeWidth: 2.4, strokeDasharray: '7 4' },
          data: { machineGenerated: true, sequenceFrame: true, inputFidelity: 'lock' },
        }
        workingEdges.push(continuityEdge)
        workingNodes = [...workingNodes.filter((node) => node.id !== frameNodeId).map((node) => node.id === nextId ? { ...node, data: { ...node.data, videoEngine: nextEngine } } : node), frameNode]
        commitOriginGraph(origin, workingNodes, workingEdges)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        patchOriginNode(origin, sequenceId, { sequenceStatus: 'failed', runState: 'error', progress: undefined, error: `Sequence stopped at shot ${index + 1}: ${message}` })
        setConnectionNotice(`Sequence stopped at shot ${index + 1}. Downstream shots were left untouched.`)
        break
      }
    }
    setHistory(await window.prism.history.list())
    setAssets(await window.prism.assets.list())
  }, [activeCanvasId, activePageId, commitOriginGraph, graphAtOrigin, patchOriginNode])

  const stopNode = useCallback(async (id: string) => {
    if(promptRewriteScope.current!.cancel(id)){updateNode(id,{runState:'idle',progress:undefined,error:undefined});return}
    const token = nativeVideoBatchTokens.current.get(id)
    if (token) token.cancelled = true
    await window.prism.generation.cancel(id)
    updateNode(id, { runState: 'idle', progress: 'Stopped', error: undefined })
  }, [updateNode])

  const onConnect = useCallback((connection: Connection) => {
    const source = nodes.find((node) => node.id === connection.source)
    const target = nodes.find((node) => node.id === connection.target)
    const compatibilityError = target && inputCardinalityError(edges, connection.target, target.data, connection.targetHandle, true)
      || (source && target ? outputCardinalityError(edges, source.id, source.data, target.data, connection.targetHandle, true) : null)
      || (source && target ? nodeConnectionError(source.id, target.id, source.data, target.data, connection.sourceHandle, connection.targetHandle) : 'These nodes cannot be connected.')
    if (compatibilityError) {
      setConnectionErrorNotice(compatibilityError)
      return
    }
    if (target?.data.kind === 'video-generator' && ['reference-in', 'character-in', 'wardrobe-in', 'element-in', 'location-in', 'style-in', 'storyboard-in'].includes(connection.targetHandle || '')) {
      const model = resolveVideoModel(target.data.videoEngine)
      if (model.mode !== 'reference') {
        updateNode(target.id, { videoEngine: referenceCapableVideoEngine(model.id), progress: 'Reference-capable model selected.' })
      }
    }
    // A typed reference socket only exists on some engines. Accepting the drop and
    // then silently dropping the edge during handle normalization reads as the app
    // losing the connection, so adopt an engine that actually exposes the port.
    if (target?.data.kind === 'video-generator' && ['audio-reference-in', 'video-reference-in'].includes(connection.targetHandle || '')) {
      const exposed = nodeInputPorts(target.data).some((port) => port.id === connection.targetHandle)
      if (!exposed) updateNode(target.id, {
        videoEngine: 'bytedance/seedance-2.0/reference-to-video',
        progress: connection.targetHandle === 'audio-reference-in' ? 'Audio-reference model selected.' : 'Video-reference model selected.',
      })
    }
    setEdges((current) => addEdge({ ...connection, animated: false, style: { stroke: '#a68cff', strokeWidth: 2 } }, current))
  }, [edges, nodes, setEdges, updateNode])

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const source = nodes.find((node) => node.id === connection.source)
    const target = nodes.find((node) => node.id === connection.target)
    return Boolean(source && target
      && !inputCardinalityError(edges, connection.target, target.data, connection.targetHandle, true)
      && !outputCardinalityError(edges, source.id, source.data, target.data, connection.targetHandle, true)
      && !nodeConnectionError(source.id, target.id, source.data, target.data, connection.sourceHandle, connection.targetHandle))
  }, [edges, nodes])

  const openQuickConnect = useCallback((sourceNodeId: string, clientX: number, clientY: number, sourceHandleId = 'media-out', insertEdge?: Edge) => {
    setQuickQuery('')
    setPortInspector(null)
    setEdgeMenu(null)
    setQuickConnect({
      direction: 'forward',
      sourceNodeId,
      sourceHandleId,
      clientX,
      clientY,
      position: screenToFlowPosition({ x: clientX, y: clientY }),
      autoPlacement: false,
      insertEdge,
    })
  }, [screenToFlowPosition])

  const deployBackwardQuickConnect = useCallback(async (target: StudioNode, targetHandleId: string, kind: NodeKind, position: XYPosition) => {
    const cardinalityError = inputCardinalityError(edges, target.id, target.data, targetHandleId, true)
    if (cardinalityError) {
      setConnectionErrorNotice(cardinalityError)
      return false
    }
    let sourceId: string
    let sourceData = sourceConnectionDataForInput(kind, target.data, targetHandleId)
    if (kind === 'upload') {
      const created = await createUploadAt(position)
      if (!created) return false
      sourceId = created.id
      sourceData = { kind: 'upload', outputType: created.asset.mimeType.startsWith('video/') ? 'video' : created.asset.mimeType.startsWith('audio/') ? 'audio' : 'image' }
    } else {
      sourceId = createNode(kind, position)
      if (kind === 'list') updateNode(sourceId, { listSignal: sourceData.listSignal })
      if (kind === 'router') updateNode(sourceId, { routeSignal: sourceData.routeSignal })
    }
    const sourceHandle = compatibleSourceHandle(kind, outputSignalFor(sourceData))
    const error = connectionCompatibilityError(sourceData, target.data, sourceHandle, targetHandleId)
    if (error) {
      setConnectionErrorNotice(error)
      return false
    }
    setEdges((current) => addEdge({
      id: crypto.randomUUID(), source: sourceId, sourceHandle, target: target.id, targetHandle: targetHandleId,
      animated: false, style: { stroke: ['prompt', 'storyboard', 'storyboard-asset'].includes(kind) ? '#a68cff' : '#58d3cc', strokeWidth: 2 },
    }, current))
    setActiveTool('select')
    return true
  }, [createNode, createUploadAt, edges, setEdges, updateNode])

  const openInputQuickConnect = useCallback((targetNodeId: string, targetHandleId: string, clientX: number, clientY: number) => {
    const target = nodes.find((node) => node.id === targetNodeId)
    if (!target) return
    setQuickQuery('')
    setPortInspector(null)
    setEdgeMenu(null)
    if (target.data.kind === 'character' && targetHandleId === 'wardrobe-in') {
      const savedWardrobe = nodes.find((node) => node.data.kind === 'wardrobe' && hasMaterializedAsset(node.data) && !node.data.reusableDeletedAt)
      if (savedWardrobe) {
        const error = inputCardinalityError(edges, target.id, target.data, targetHandleId, true)
          || nodeConnectionError(savedWardrobe.id, target.id, savedWardrobe.data, target.data, 'media-out', targetHandleId)
        if (error) setConnectionErrorNotice(error)
        else setEdges((current) => addEdge({ id: crypto.randomUUID(), source: savedWardrobe.id, sourceHandle: 'media-out', target: target.id, targetHandle: 'wardrobe-in', animated: false, style: { stroke: '#a68cff', strokeWidth: 2 } }, current))
        return
      }
    }
    const compatibleChoices = palette.filter((item) => compatibleNodeSources(target.data, targetHandleId).includes(item.kind))
    if (compatibleChoices.length === 1) {
      const kind = compatibleChoices[0].kind
      void deployBackwardQuickConnect(target, targetHandleId, kind, screenToFlowPosition({ x: clientX, y: clientY }))
      return
    }
    setQuickConnect({
      direction: 'backward',
      targetNodeId,
      targetHandleId,
      clientX,
      clientY,
      position: screenToFlowPosition({ x: clientX, y: clientY }),
    })
  }, [deployBackwardQuickConnect, edges, nodes, screenToFlowPosition, setEdges])

  const inspectPort = useCallback((nodeId: string, handleId: string, label: string, clientX: number, clientY: number) => {
    setQuickConnect(null)
    setEdgeMenu(null)
    setPortInspector({ nodeId, handleId, label, clientX, clientY })
  }, [])

  const handleConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectionStart.current = params
  }, [])

  const handleConnectEnd: OnConnectEnd = useCallback((event, connectionState) => {
    const startedConnection = connectionStart.current
    if (connectionState.isValid || !startedConnection?.nodeId) {
      connectionStart.current = null
      return
    }
    const point = 'changedTouches' in event ? event.changedTouches[0] : event
    if (point && recoverCharacterSemanticConnectionAtEnd({
      connectionState,
      connectionStart: { nodeId: startedConnection.nodeId, handleId: startedConnection.handleId },
      point: { clientX: point.clientX, clientY: point.clientY },
      nodes,
      edges,
      elementsFromPoint: (clientX, clientY) => document.elementsFromPoint(clientX, clientY),
      commit: (connection) => setEdges((current) => addEdge({ id: crypto.randomUUID(), ...connection, animated: false, style: { stroke: '#a68cff', strokeWidth: 2 } }, current)),
      notice: setConnectionNotice,
    })) {
      connectionStart.current = null
      return
    }
    const releasedTargetHandle = point
      ? document.elementsFromPoint(point.clientX, point.clientY)
        .map((element) => element.closest<HTMLElement>('.react-flow__handle'))
        .find((handle): handle is HTMLElement => Boolean(handle?.classList.contains('react-flow__handle-target')))
      : undefined
    const recoveredTargetNodeId = connectionState.toNode?.id || releasedTargetHandle?.getAttribute('data-nodeid') || undefined
    const reportedTargetHandle = connectionState.toHandle?.id || releasedTargetHandle?.getAttribute('data-handleid') || undefined
    if (recoveredTargetNodeId) {
      const source = nodes.find((node) => node.id === startedConnection.nodeId)
      const target = nodes.find((node) => node.id === recoveredTargetNodeId)
      const error = source && target ? nodeConnectionError(source.id, target.id, source.data, target.data, startedConnection.handleId, reportedTargetHandle) : null
      if (error) setConnectionErrorNotice(error)
      connectionStart.current = null
      return
    }
    if (!point) return
    setQuickQuery('')
    setQuickConnect({
      direction: 'forward',
      sourceNodeId: startedConnection.nodeId,
      sourceHandleId: startedConnection.handleId,
      clientX: point.clientX,
      clientY: point.clientY,
      position: screenToFlowPosition({ x: point.clientX, y: point.clientY }),
      autoPlacement: false,
    })
    connectionStart.current = null
  }, [edges, nodes, screenToFlowPosition, setEdges])

  const quickItems = useMemo(() => {
    if (!quickConnect) return []
    const kinds = quickConnect.direction === 'forward'
      ? (() => {
          const source = nodes.find((node) => node.id === quickConnect.sourceNodeId)
          return source ? compatibleNodeTargets(source.data, quickConnect.sourceHandleId) : []
        })()
      : (() => {
          const target = nodes.find((node) => node.id === quickConnect.targetNodeId)
          return target ? compatibleNodeSources(target.data, quickConnect.targetHandleId) : []
        })()
    const query = quickQuery.trim().toLowerCase()
    return palette.filter((item) => kinds.includes(item.kind) && (!query || `${item.label} ${item.detail}`.toLowerCase().includes(query)))
  }, [nodes, quickConnect, quickQuery])

  const completeQuickConnect = useCallback(async (kind: NodeKind) => {
    if (!quickConnect) return
    if (quickConnect.direction === 'backward') {
      const target = nodes.find((node) => node.id === quickConnect.targetNodeId)
      if (!target) return
      const pending = quickConnect
      setQuickConnect(null)
      setQuickQuery('')
      await deployBackwardQuickConnect(target, pending.targetHandleId, kind, pending.position)
      return
    }
    const source = nodes.find((node) => node.id === quickConnect.sourceNodeId)
    if (!source) return
    const targetPosition = quickConnect.position
    const targetId = createNode(kind, targetPosition)
    const sourceSignal = outputSignalFor(source.data, quickConnect.sourceHandleId)
    if (kind === 'video-generator') {
      const recommendedEngine = recommendedVideoEngineForSource(source.data, quickConnect.sourceHandleId)
      if (recommendedEngine) updateNode(targetId, { videoEngine: recommendedEngine, progress: source.data.kind === 'list' ? 'Typed List reference model selected.' : ['character', 'wardrobe', 'location', 'element', 'style-reference'].includes(source.data.kind) ? 'Reference-ready model selected.' : sourceSignal === 'audio' ? 'Audio-reference model selected.' : undefined })
    }
    const targetHandle = compatibleTargetHandle(source.data, kind, quickConnect.sourceHandleId)
    setEdges((current) => addEdge({
      id: crypto.randomUUID(),
      source: quickConnect.sourceNodeId,
      sourceHandle: quickConnect.sourceHandleId,
      target: targetId,
      targetHandle,
      animated: false,
      style: { stroke: ['prompt', 'assistant', 'storyboard', 'storyboard-asset'].includes(source.data.kind) ? '#a68cff' : '#58d3cc', strokeWidth: 2 },
    }, quickConnect.insertEdge
      ? addEdge({
        id: crypto.randomUUID(),
        source: targetId,
        sourceHandle: compatibleSourceHandle(kind, outputSignalFor(source.data, quickConnect.sourceHandleId)),
        target: quickConnect.insertEdge.target,
        targetHandle: quickConnect.insertEdge.targetHandle,
        animated: false,
        style: { stroke: '#58d3cc', strokeWidth: 2 },
      }, current.filter((edge) => edge.id !== quickConnect.insertEdge?.id))
      : current))
    setQuickConnect(null)
    setQuickQuery('')
    setActiveTool('select')
  }, [createNode, deployBackwardQuickConnect, nodes, quickConnect, setEdges, updateNode])

  const handlePaneClick = useCallback((event: ReactMouseEvent) => {
    setQuickConnect(null)
    setPortInspector(null)
    setEdgeMenu(null)
    setContextMenu(null)
    if (activeTool !== 'frame') return
    const id = createNode(activeTool as NodeKind, screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    setActiveTool('select')
  }, [activeTool, createNode, screenToFlowPosition])

  const handlePaneContextMenu = useCallback((event: MouseEvent | ReactMouseEvent) => {
    event.preventDefault()
    setEdgeMenu(null)
    setPortInspector(null)
    setContextMenu({
      kind: 'canvas',
      clientX: event.clientX,
      clientY: event.clientY,
      position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    })
  }, [screenToFlowPosition])

  const handleNodeContextMenu = useCallback((event: ReactMouseEvent, node: StudioNode) => {
    event.preventDefault()
    event.stopPropagation()
    const selectedIds = nodes.filter((candidate) => candidate.selected).map((candidate) => candidate.id)
    const nodeIds = node.selected && selectedIds.length > 1 ? selectedIds : [node.id]
    if (!node.selected) setNodes((current) => current.map((candidate) => ({ ...candidate, selected: candidate.id === node.id })))
    setEdgeMenu(null)
    setContextMenu(nodeIds.length > 1
      ? { kind: 'selection', clientX: event.clientX, clientY: event.clientY, nodeIds }
      : { kind: 'node', clientX: event.clientX, clientY: event.clientY, nodeId: node.id, nodeIds })
  }, [nodes, setNodes])

  const handleSelectionContextMenu = useCallback((event: ReactMouseEvent, selectedNodes: StudioNode[]) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ kind: 'selection', clientX: event.clientX, clientY: event.clientY, nodeIds: selectedNodes.map((node) => node.id) })
  }, [])

  const handleEdgeContextMenu = useCallback((event: ReactMouseEvent, edge: Edge) => {
    event.preventDefault()
    event.stopPropagation()
    setEdgeMenu(null)
    setContextMenu({ kind: 'edge', clientX: event.clientX, clientY: event.clientY, edge })
  }, [])

  const getEdgeScreenPoint = useCallback((event: ReactMouseEvent, followPointer = false) => {
    const edgeRoot = event.currentTarget as SVGElement
    const path = edgeRoot.matches('path') ? edgeRoot as SVGPathElement : edgeRoot.querySelector<SVGPathElement>('.react-flow__edge-path')
    if (!path || typeof path.getTotalLength !== 'function') return null
    const screenMatrix = path.getScreenCTM()
    if (!screenMatrix) return null
    const length = path.getTotalLength()
    let point = path.getPointAtLength(length / 2)
    if (followPointer) {
      let closestDistance = Number.POSITIVE_INFINITY
      for (let index = 0; index <= 64; index += 1) {
        const candidate = path.getPointAtLength((length * index) / 64)
        const screenCandidate = new DOMPoint(candidate.x, candidate.y).matrixTransform(screenMatrix)
        const distance = Math.hypot(screenCandidate.x - event.clientX, screenCandidate.y - event.clientY)
        if (distance < closestDistance) { closestDistance = distance; point = candidate }
      }
    }
    const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(screenMatrix)
    return { clientX: screenPoint.x, clientY: screenPoint.y }
  }, [])

  const handleEdgeClick = useCallback((event: ReactMouseEvent, edge: Edge) => {
    event.stopPropagation()
    if (activeTool === 'cut') {
      setEdges((current) => current.filter((candidate) => candidate.id !== edge.id))
      setActiveTool('select')
      return
    }
    setPortInspector(null)
    setContextMenu(null)
    const midpoint = getEdgeScreenPoint(event, true)
    if (midpoint) setEdgeMenu({ edge, ...midpoint })
  }, [activeTool, getEdgeScreenPoint, setEdges])

  const showEdgeActions = useCallback((event: ReactMouseEvent, edge: Edge) => {
    if (edgeHoverTimer.current) window.clearTimeout(edgeHoverTimer.current)
    if (edgeCloseTimer.current) window.clearTimeout(edgeCloseTimer.current)
    setPortInspector(null)
    setContextMenu(null)
    const midpoint = getEdgeScreenPoint(event, true)
    if (!midpoint) return
    pendingEdgeHover.current = { edge, ...midpoint }
    setEdgeMenu((current) => current?.edge.id === edge.id ? { edge, ...midpoint } : null)
    edgeHoverTimer.current = window.setTimeout(() => {
      if (pendingEdgeHover.current?.edge.id === edge.id) setEdgeMenu(pendingEdgeHover.current)
      edgeHoverTimer.current = null
    }, EDGE_ACTION_HOVER_DELAY_MS)
  }, [getEdgeScreenPoint])

  const moveEdgeActions = useCallback((event: ReactMouseEvent, edge: Edge) => {
    const point = getEdgeScreenPoint(event, true)
    if (point) {
      pendingEdgeHover.current = { edge, ...point }
      setEdgeMenu((current) => current?.edge.id === edge.id ? { edge, ...point } : current)
    }
  }, [getEdgeScreenPoint])

  const scheduleEdgeActionsClose = useCallback(() => {
    if (edgeHoverTimer.current) window.clearTimeout(edgeHoverTimer.current)
    pendingEdgeHover.current = null
    if (edgeCloseTimer.current) window.clearTimeout(edgeCloseTimer.current)
    edgeCloseTimer.current = window.setTimeout(() => setEdgeMenu(null), 180)
  }, [])

  const keepEdgeActionsOpen = useCallback(() => {
    if (edgeCloseTimer.current) window.clearTimeout(edgeCloseTimer.current)
  }, [])

  const handleNodeChanges = useCallback((changes: NodeChange<StudioNode>[]) => {
    const drag = dragConstraint.current
    const dragNode = drag ? nodes.find((node) => node.id === drag.nodeId) : undefined
    if (dragNode?.data.locked) {
      dragConstraint.current = null
      setMagneticGuides([])
      onNodesChange(expandGroupedPositionChanges(nodes, changes))
      return
    }
    const positionChanges = changes.filter((change): change is Extract<NodeChange<StudioNode>, { type: 'position' }> => change.type === 'position' && Boolean(change.position))
    const anchorChange = drag ? positionChanges.find((change) => change.id === drag.nodeId) : undefined
    let adjustedChanges = changes

    if (drag && anchorChange?.position) {
      const rawPosition = anchorChange.position
      const constrainedPosition = { ...rawPosition }
      if (shiftPressed.current) {
        const deltaX = rawPosition.x - drag.start.x
        const deltaY = rawPosition.y - drag.start.y
        if (!drag.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 2) drag.axis = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y'
        if (drag.axis === 'x') constrainedPosition.y = drag.start.y
        if (drag.axis === 'y') constrainedPosition.x = drag.start.x
      } else {
        drag.axis = null
      }

      let finalPosition = constrainedPosition
      let visibleGuides: MagneticGuide[] = []
      if (magneticGuidesEnabled) {
        const movingNode = nodes.find((node) => node.id === drag.nodeId)
        if (movingNode) {
          const movingFallback = nodeLayoutSize(movingNode.data.kind)
          const movingIds = new Set(positionChanges.map((change) => change.id))
          const zoom = Math.max(0.1, getViewport().zoom)
          const result = magneticNodePosition({
            id: movingNode.id,
            x: constrainedPosition.x,
            y: constrainedPosition.y,
            width: movingNode.measured?.width || movingFallback.width,
            height: movingNode.measured?.height || movingFallback.height,
          }, nodes.filter((node) => !movingIds.has(node.id)).map((node) => {
            const fallback = nodeLayoutSize(node.data.kind)
            return {
              id: node.id,
              x: node.position.x,
              y: node.position.y,
              width: node.measured?.width || fallback.width,
              height: node.measured?.height || fallback.height,
            }
          }), 35 / zoom, 10 / zoom, 80 / zoom, 300)
          finalPosition = result.position
          const flowBounds = document.querySelector<HTMLElement>('.studio-flow')?.getBoundingClientRect()
          const viewport = getViewport()
          const visibleTop = -viewport.y / zoom
          const visibleLeft = -viewport.x / zoom
          const visibleBottom = visibleTop + (flowBounds?.height || window.innerHeight) / zoom
          const visibleRight = visibleLeft + (flowBounds?.width || window.innerWidth) / zoom
          const boundedGuides = result.guides.map((guide) => guide.kind !== 'alignment' ? guide : guide.orientation === 'vertical'
            ? { ...guide, from: visibleTop, to: visibleBottom }
            : { ...guide, from: visibleLeft, to: visibleRight })
          const toolbarBounds = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(movingNode.id)}"] .node-hover-toolbar`)?.getBoundingClientRect()
          visibleGuides = placeEqualGapLabels(boundedGuides, {
            zoom,
            viewportX: viewport.x,
            viewportY: viewport.y,
            canvasLeft: flowBounds?.left || 0,
            canvasTop: flowBounds?.top || 0,
            viewportWidth: window.innerWidth,
            toolbar: toolbarBounds ? { left: toolbarBounds.left, top: toolbarBounds.top, right: toolbarBounds.right, bottom: toolbarBounds.bottom } : undefined,
          })
        }
      }
      setMagneticGuides(visibleGuides)

      const correction = { x: finalPosition.x - rawPosition.x, y: finalPosition.y - rawPosition.y }
      const movingIds = new Set(positionChanges.map((change) => change.id))
      adjustedChanges = changes.map((change) => change.type === 'position' && change.position && movingIds.has(change.id)
        ? { ...change, position: { x: change.position.x + correction.x, y: change.position.y + correction.y } }
        : change)
    }

    onNodesChange(expandGroupedPositionChanges(nodes, adjustedChanges))
  }, [getViewport, magneticGuidesEnabled, nodes, onNodesChange])

  const saveService = async (provider: ServiceProvider, footer?: HTMLElement | null) => {
    if (signInProfileId && signInProfileId !== 'new' && !serviceProfiles.profiles.some((profile) => profile.id === signInProfileId && profile.provider === provider)) {
      setServiceError('Select an account belonging to this provider before saving.')
      return
    }
    const card = footer?.closest?.('.service-card')
    let saved = false
    setServiceError('')
    const finishBusy = beginServiceBusyOperation()
    const ownsOperation = beginServiceProfileOperation(provider)
    try {
      const registry = await window.prism.services.addProfile(provider, serviceDrafts[provider], signInProfileId && signInProfileId !== 'new' ? signInProfileId : undefined)
      if (!ownsOperation()) return
      await applyServiceProfiles(registry, provider, ownsOperation)
      if (!ownsOperation()) return
      setServiceDrafts((current) => ({ ...current, [provider]: '' }))
      setSignInProfileId(null)
      saved = true
    } catch (error) {
      if (!ownsOperation()) return
      setServiceError(error instanceof Error ? error.message : String(error))
      await restoreServiceConnectionsAfterFailure(ownsOperation)
    } finally {
      finishBusy()
      if (footer && ownsOperation()) requestAnimationFrame(() => {
        if (!ownsOperation() || (card && !card.isConnected)) return
        const currentFooter = card ? card.querySelector<HTMLElement>(':scope > footer') : footer
        if (!currentFooter?.isConnected) return
        const focused = document.activeElement
        if (focused !== document.body && focused && !currentFooter.contains(focused)) return
        currentFooter.querySelector<HTMLElement>(saved ? '.fal-add-account' : '.service-key-input')?.focus()
      })
    }
  }

  const refreshOmniRoute = async () => {
    const ownsRefresh = serviceResponseScope.current!.begin('omniroute', 'manual')
    const acceptsModels = serviceResponseScope.current!.begin('omniroute', 'models')
    const acceptsAccount = serviceResponseScope.current!.begin('omniroute', 'account')
    setServiceError('')
    const finishBusy = beginServiceBusyOperation()
    try {
      const [availability, account] = await Promise.all([window.prism.services.models('omniroute'), window.prism.services.account('omniroute')])
      if (!ownsRefresh() || !acceptsModels() || !acceptsAccount()) return
      setServiceModels((current) => ({ ...current, omniroute: availability }))
      setServiceAccounts((current) => ({ ...current, omniroute: account }))
      setServiceConnections((current) => ({ ...current, omniroute: true }))
    } catch (error) {
      if (!ownsRefresh()) return
      setServiceConnections((current) => ({ ...current, omniroute: false }))
      setServiceError(error instanceof Error ? error.message : String(error))
    } finally {
      finishBusy()
    }
  }

  const removeService = async (provider: ServiceProvider) => {
    const ownsOperation = beginServiceProfileOperation(provider)
    await window.prism.services.remove(provider)
    if (!ownsOperation()) return
    setServiceConnections((current) => ({ ...current, [provider]: false }))
    setServiceModels((current) => ({ ...current, [provider]: undefined }))
    setServiceAccounts((current) => ({ ...current, [provider]: undefined }))
    if (provider === 'fal') setHasCredential(false)
    if (provider === 'fish') setHasFishCredential(false)
  }

  const transitionServiceProfileState = async (profileId: string, transition: 'disconnect' | 'reconnect' | 'sign-out' | 'delete') => {
    setServiceError('')
    const finishBusy = beginServiceBusyOperation()
    let ownsOperation = () => true
    try {
      const provider = serviceProfiles.profiles.find((profile) => profile.id === profileId)?.provider
      if (!provider) throw new Error('That account profile no longer exists.')
      ownsOperation = beginServiceProfileOperation(provider)
      const registry = await window.prism.services.transitionProfile(profileId, transition)
      if (!ownsOperation()) return
      await applyServiceProfiles(registry, provider, ownsOperation)
      if (!ownsOperation()) return
      setProfileConfirmation(null)
      if (signInProfileId === profileId) setSignInProfileId(null)
    } catch (error) {
      if (!ownsOperation()) return
      setServiceActionError((error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error:\s*/i, ''))
      await restoreServiceConnectionsAfterFailure(ownsOperation)
    } finally {
      finishBusy()
    }
  }

  const setDefaultServiceProfileState = async (provider: ServiceProvider, profileId?: string) => {
    setServiceError('')
    const ownsOperation = beginServiceProfileOperation(provider)
    try { await applyServiceProfiles(await window.prism.services.setDefaultProfile(provider, profileId), provider, ownsOperation) }
    catch (error) { if (!ownsOperation()) return; setServiceActionError((error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error:\s*/i, '')); await restoreServiceConnectionsAfterFailure(ownsOperation) }
  }

  const commitServiceProfileRename = async (profileId: string) => {
    const name = profileNameDraft.trim()
    if (!name) return
    let ownsOperation = () => true
    try {
      const provider = serviceProfiles.profiles.find((profile) => profile.id === profileId)?.provider
      if (!provider) throw new Error('That account profile no longer exists.')
      ownsOperation = beginServiceProfileOperation(provider)
      await applyServiceProfiles(await window.prism.services.renameProfile(profileId, name), provider, ownsOperation)
      if (!ownsOperation()) return
      setRenamingProfileId(null)
      setProfileNameDraft('')
    } catch (error) {
      if (!ownsOperation()) return
      setServiceActionError((error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error:\s*/i, ''))
      await restoreServiceConnectionsAfterFailure(ownsOperation)
    }
  }

  const selectProjectServiceProfile = async (provider: ServiceProvider, profileId?: string) => {
    setServiceError('')
    const ownsOperation = beginServiceProfileOperation(provider)
    try {
      const selectedProject = await window.prism.services.selectProjectProfile(provider, profileId)
      if (!ownsOperation()) return
      setProject(selectedProject)
      await applyServiceProfiles(serviceProfiles, provider, ownsOperation)
    } catch (error) {
      if (!ownsOperation()) return
      setServiceActionError((error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error:\s*/i, ''))
      await restoreServiceConnectionsAfterFailure(ownsOperation)
    }
  }

  const filteredPalette = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase()
    return query ? ORDERED_NODE_PALETTE.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query)) : ORDERED_NODE_PALETTE
  }, [paletteQuery])

  const connectedReferenceTags = useCallback((nodeId: string) => uniquePromptTags([...recursiveUpstreamSemanticTags(nodeId, nodes, edges), ...sharedPromptContext(nodeId, nodes, edges).tags]), [edges, nodes])

  const connectedInputRules = useCallback((nodeId: string) => {
    const target = nodes.find((node) => node.id === nodeId)
    if (!target) return []
    return edges.filter((edge) => edge.target === nodeId).flatMap((edge) => {
      const source = nodes.find((node) => node.id === edge.source)?.data
      if (!source) return []
      const rule = connectedInputRule(source, target.data, edge.targetHandle, ((edge.data as { inputFidelity?: InputFidelity } | undefined)?.inputFidelity || 'auto'))
      return [{ ...rule, aliases: sourcePromptTags(source).filter((tag) => tag.toLocaleLowerCase() !== rule.tag.toLocaleLowerCase()), edgeId: edge.id }]
    })
  }, [edges, nodes])

  const promptTagConnectionPlan = useCallback((source: StudioNode, target: StudioNode, currentEdges: Edge[]) => {
    const sourceHandle = compatibleSourceHandle(source.data.kind, outputSignalFor(source.data))
    const recommendedEngine = target.data.kind === 'video-generator'
      ? recommendedVideoEngineForSource(source.data, sourceHandle)
      : undefined
    const targetData = recommendedEngine ? { ...target.data, videoEngine: recommendedEngine } : target.data
    const preferredHandle = compatibleTargetHandle(source.data, target.data.kind, sourceHandle)
    const ports = nodeInputPorts(targetData)
    const orderedPorts = [...ports].sort((a, b) => Number(b.id === preferredHandle) - Number(a.id === preferredHandle))
    const targetHandle = orderedPorts.find((port) =>
      !inputCardinalityError(currentEdges, target.id, targetData, port.id, true)
      && !nodeConnectionError(source.id, target.id, source.data, targetData, sourceHandle, port.id))?.id
    return targetHandle ? { sourceHandle, targetHandle, recommendedEngine } : null
  }, [])

  const availablePromptTags = useCallback((nodeId: string) => {
    const target = nodes.find((node) => node.id === nodeId)
    if (!target) return []
    return uniquePromptTags([...sharedPromptContext(nodeId, nodes, edges).tags, ...nodes.flatMap((source) => {
      if (source.id === target.id) return []
      const alreadyConnected = edges.some((edge) => edge.source === source.id && edge.target === target.id)
      return alreadyConnected || promptTagConnectionPlan(source, target, edges)
        ? [workflowTag(source.data, 'asset')]
        : []
    })])
  }, [edges, nodes, promptTagConnectionPlan])

  const connectPromptTags = useCallback((nodeId: string, prompt: string, previousPrompt = '') => {
    const target = nodes.find((node) => node.id === nodeId)
    if (!target) return
    const previousTags = new Set(promptTagTokens(previousPrompt).map((tag) => tag.toLocaleLowerCase()))
    const newlyAuthoredTags = promptTagTokens(prompt).filter((tag) => !previousTags.has(tag.toLocaleLowerCase()))
    if (!newlyAuthoredTags.length) return
    const sharedTags = new Set(sharedPromptContext(nodeId, nodes, edges).tags.map(tag => tag.toLocaleLowerCase()))
    let workingEdges = edges
    let nextVideoEngine: string | undefined
    for (const tag of newlyAuthoredTags) {
      // Already bound at the shared destination; a mention must not create a reverse wire.
      if (sharedTags.has(tag.toLocaleLowerCase())) continue
      const matches = nodes.filter((source) => source.id !== target.id && sourcePromptTags(source.data).some((candidate) => candidate.toLocaleLowerCase() === tag.toLocaleLowerCase()))
      if (matches.length > 1) {
        setConnectionErrorNotice(`${tag} matches more than one Canvas asset. Rename one before connecting by tag.`)
        continue
      }
      const source = matches[0]
      if (!source || workingEdges.some((edge) => edge.source === source.id && edge.target === target.id)) continue
      const plan = promptTagConnectionPlan(source, target, workingEdges)
      if (!plan) {
        setConnectionErrorNotice(`${tag} has no available compatible input on ${target.data.title || 'this node'}.`)
        continue
      }
      workingEdges = addEdge({
        source: source.id,
        sourceHandle: plan.sourceHandle,
        target: target.id,
        targetHandle: plan.targetHandle,
        animated: false,
        style: { stroke: '#a68cff', strokeWidth: 2 },
      }, workingEdges)
      nextVideoEngine = plan.recommendedEngine || nextVideoEngine
    }
    if (workingEdges !== edges) setEdges(workingEdges)
    if (!target.data.higgsfieldNative && nextVideoEngine && target.data.videoEngine !== nextVideoEngine) {
      updateNode(target.id, { videoEngine: nextVideoEngine, progress: 'Compatible reference model selected.' })
    }
  }, [edges, nodes, promptTagConnectionPlan, setEdges, updateNode])

  const updatePrompt = useCallback((nodeId: string, prompt: string) => {
    const current = nodes.find((node) => node.id === nodeId)
    const storyboardConnected = edges.some((edge) => edge.target === nodeId && edge.targetHandle === 'storyboard-in')
    const manualVideo = current?.data.kind === 'video-generator' && activeVideoPromptMode(current.data, storyboardConnected) === 'manual'
    const previousPrompt = manualVideo ? current?.data.manualPromptDraft ?? current?.data.prompt ?? '' : current?.data.prompt || ''
    if (manualVideo) updateNode(nodeId, { promptMode: 'manual', manualPromptDraft: prompt, manualPromptSeeded: true, manualPromptSeedVersion: 2, error: undefined })
    else updateNode(nodeId, { prompt, error: undefined })
    connectPromptTags(nodeId, prompt, previousPrompt)
  }, [connectPromptTags, edges, nodes, updateNode])

  const connectedInputMedia = useCallback((nodeId: string, handleId: string) => {
    const edge = edges.find((candidate) => candidate.target === nodeId && candidate.targetHandle === handleId)
    const source = edge ? nodes.find((node) => node.id === edge.source) : undefined
    if (!source) return undefined
    const results = source.data.generatedResults || []
    const activeResult = results[Math.min(Math.max(source.data.activeResultIndex || 0, 0), Math.max(results.length - 1, 0))]
    return {
      url: activeResult?.url || source.data.outputUrl || source.data.assetUrl || source.data.referenceAssets?.[0]?.url,
      path: activeResult?.path || source.data.outputPath || source.data.assetPath || source.data.referenceAssets?.[0]?.path,
      title: source.data.title,
      type: activeResult?.type || source.data.outputType || (source.data.referenceAssets?.[0]?.mimeType?.startsWith('video/') ? 'video' : 'image'),
    }
  }, [edges, nodes])

  const setInputFidelity = useCallback((edgeId: string, inputFidelity: InputFidelity) => {
    setEdges((current) => current.map((edge) => edge.id === edgeId ? { ...edge, data: { ...(edge.data || {}), inputFidelity } } : edge))
  }, [])

  const openAssets = useCallback(() => {
    if (assetBrowserOpen) {
      setAssetBrowserOpen(false)
      return
    }
    setHomeSection('assets')
    setAssetTypeFilter('all')
    setAssetBrowserOpen(true)
  }, [assetBrowserOpen])

  const openNodeInspector = useCallback((id: string) => {
    setAssetBrowserOpen(false)
    setInspectorNodeId((current) => current === id ? null : id)
  }, [])

  const createFromAssetSection = useCallback(() => {
    if (assetTypeFilter === 'character' || assetTypeFilter === 'element' || assetTypeFilter === 'location' || assetTypeFilter === 'wardrobe') {
      setSemanticCreateKind(assetTypeFilter)
      return
    }
    const kind: NodeKind | null = assetTypeFilter === 'style' ? 'style-reference'
            : assetTypeFilter === 'storyboard' ? 'storyboard'
            : assetTypeFilter === 'image' ? 'image-generator'
              : assetTypeFilter === 'video' ? 'video-generator'
                : assetTypeFilter === 'audio' ? 'voiceover' : null
    setAppView('canvas')
    if (kind) addNode(kind)
    else setPaletteOpen(true)
  }, [addNode, assetTypeFilter, createUploadAt, homeSection])

  const createSemanticTemplate = useCallback((mode: 'prompt' | 'reference') => {
    if (!semanticCreateKind) return
    const label = semanticCreateKind === 'character' ? 'Character' : semanticCreateKind === 'location' ? 'Location' : semanticCreateKind === 'wardrobe' ? 'Wardrobe' : 'Element'
    const rightEdge = nodes.reduce((maximum, node) => Math.max(maximum, node.position.x + (node.measured?.width || node.width || 420)), 0)
    const templateY = nodes.length ? Math.max(120, Math.min(...nodes.map((node) => node.position.y))) : 180
    const targetId = createNode(semanticCreateKind, { x: rightEdge + 160, y: templateY })
    updateNode(targetId, {
      title: `New ${label}`,
      quantity: semanticCreateKind === 'element' ? 2 : 1,
      ...(semanticCreateKind === 'character' ? { characterEditorOpen: true } : { semanticEditorOpen: true }),
      progress: mode === 'reference' ? 'Drop a reference into the required view box.' : undefined,
    })
    setSemanticCreateKind(null)
    setAppView('canvas')
    window.setTimeout(() => fitView({ nodes: [{ id: targetId }], padding: 0.24, duration: 400 }), 50)
  }, [createNode, fitView, nodes, semanticCreateKind, updateNode])

  const createStarterRoute = useCallback((route: 'prompt' | 'reference' | 'references' | 'start-end') => {
    if (!starterCreateKind) return
    const origin = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    // Image editing and multi-reference composition are capabilities of the
    // consolidated Image Generator, never a reason to recreate Image Editor.
    const targetKind: NodeKind = starterCreateKind === 'image' ? 'image-generator' : 'video-generator'
    const targetId = createNode(targetKind, { x: origin.x + 80, y: origin.y - 170 })
    const sourceIds: string[] = []
    const routeEdges: Edge[] = []
    const addSource = (kind: 'prompt' | 'upload', position: XYPosition, title: string, targetHandle: string) => {
      const sourceId = createNode(kind, position)
      sourceIds.push(sourceId)
      updateNode(sourceId, { title, ...(kind === 'upload' ? { outputType: 'image' as const } : {}) })
      routeEdges.push({
        id: crypto.randomUUID(),
        source: sourceId,
        sourceHandle: kind === 'prompt' ? 'text-out' : 'media-out',
        target: targetId,
        targetHandle,
        animated: false,
        style: { stroke: kind === 'prompt' ? '#a68cff' : '#58d3cc', strokeWidth: 2 },
      })
    }

    if (route === 'prompt') {
      addSource('prompt', { x: origin.x - 390, y: origin.y - 120 }, `${starterCreateKind === 'image' ? 'Image' : 'Video'} Prompt`, 'text-in')
    } else if (route === 'reference') {
      addSource('upload', { x: origin.x - 390, y: origin.y - 120 }, starterCreateKind === 'video' ? 'Starting Image' : 'Image Reference', 'image-in')
    } else if (route === 'references') {
      addSource('upload', { x: origin.x - 410, y: origin.y - 245 }, 'Primary Reference', 'image-in')
      addSource('upload', { x: origin.x - 410, y: origin.y + 35 }, 'Additional Reference', 'reference-in')
    } else {
      addSource('upload', { x: origin.x - 410, y: origin.y - 245 }, 'Starting Image', 'image-in')
      addSource('upload', { x: origin.x - 410, y: origin.y + 35 }, 'Ending Image', 'end-image')
    }

    updateNode(targetId, { title: starterCreateKind === 'image' ? 'Image Generator' : 'Video Generator' })
    setEdges((current) => [...current, ...routeEdges])
    setStarterCreateKind(null)
    window.setTimeout(() => fitView({ nodes: [...sourceIds.map((id) => ({ id })), { id: targetId }], padding: 0.24, duration: 400 }), 50)
    if (route !== 'prompt') window.setTimeout(() => { void (async () => { for (const id of sourceIds) await importAsset(id) })() }, 100)
  }, [createNode, fitView, importAsset, screenToFlowPosition, setEdges, starterCreateKind, updateNode])

  useEffect(() => {
    if (!edges.length) return
    setNodes((current) => {
      let changed = false
      const byId = new Map(current.map((node) => [node.id, node]))
      const next = current.map((target) => {
        if (target.data.kind !== 'character') return target
        const incoming = edges.filter((edge) => edge.target === target.id)
        const promptEdge = incoming.find((edge) => edge.targetHandle === 'text-in')
        const imageEdge = incoming.find((edge) => edge.targetHandle === 'image-in')
        const promptSource = promptEdge ? byId.get(promptEdge.source) : undefined
        const imageSource = imageEdge ? byId.get(imageEdge.source) : undefined
        const linkedAsset = imageSource ? assets.find((asset) => asset.path === imageSource.data.assetPath || asset.path === imageSource.data.outputPath) : undefined
        const patch: Partial<StudioNodeData> = {}
        if (promptSource?.data.prompt !== undefined && target.data.prompt !== promptSource.data.prompt) patch.prompt = promptSource.data.prompt
        if (linkedAsset && !(target.data.referenceAssets || []).some((asset) => asset.path === linkedAsset.path)) {
          patch.referenceAssets = [{ ...linkedAsset, metadata: target.data.kind === 'character' ? { ...linkedAsset.metadata, characterView: 'front' } : linkedAsset.metadata }, ...(target.data.referenceAssets || [])]
        }
        if (!Object.keys(patch).length) return target
        changed = true
        return { ...target, data: { ...target.data, ...patch } }
      })
      return changed ? next : current
    })
  }, [assets, edges, nodes, setNodes])

  const updateAssetState = useCallback(async (assetId: string, patch: { favorite?: boolean; trashedAt?: string | null }) => {
    try {
      const updated = await window.prism.assets.updateState(assetId, patch)
      setAssets((current) => current.map((asset) => asset.id === assetId ? updated : asset))
      setAssetMenuId(null)
    } catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [])

  const deletePhysicalAsset = useCallback(async (assetId: string) => {
    try {
      await window.prism.assets.delete(assetId)
      setAssets((current) => current.filter((asset) => asset.id !== assetId))
      setMissingAssetIds((current) => current.filter((id) => id !== assetId))
      setAssetMenuId(null)
    } catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [])

  const generatedResultAt = useCallback((nodeId: string, index: number) => nodes.find((node) => node.id === nodeId)?.data.generatedResults?.[index], [nodes])
  const generatedAssetAt = useCallback((nodeId: string, index: number) => {
    const result = generatedResultAt(nodeId, index)
    return result ? assets.find((asset) => asset.path === result.path) : undefined
  }, [assets, generatedResultAt])
  const openGeneratedMedia = useCallback((nodeId: string, index: number) => setGeneratedMediaViewer({ kind: 'node', nodeId, index }), [])
  const openAssetMedia = useCallback((assetIds: string[], index = 0) => {
    const viewableIds = assetIds.filter((assetId) => {
      const asset = assets.find((candidate) => candidate.id === assetId)
      return Boolean(asset?.path && asset.url && /^(image|video|audio)\//.test(asset.mimeType) && !missingAssetIds.includes(asset.id))
    })
    if (viewableIds.length) setGeneratedMediaViewer({ kind: 'assets', assetIds: viewableIds, index: Math.min(Math.max(index, 0), viewableIds.length - 1) })
  }, [assets, missingAssetIds])
  const renameGeneratedMedia = useCallback(async (nodeId: string, index: number, name: string, expectedPath: string) => {
    const asset = generatedAssetAt(nodeId, index)
    // A deleted/replaced batch result must not rename a different row at this index.
    if (asset?.path === expectedPath) await renameAssetTo(asset.id, name)
  }, [generatedAssetAt, renameAssetTo])
  const revealGeneratedMedia = useCallback((nodeId: string, index: number) => {
    const result = generatedResultAt(nodeId, index)
    if (result) void window.prism.assets.revealPath(result.path)
  }, [generatedResultAt])
  const copyGeneratedMedia = useCallback((nodeId: string, index: number) => {
    const result = generatedResultAt(nodeId, index)
    if (!result) return
    void window.prism.assets.copyMedia(result.path, result.type).then(() => setProjectNotice(`${result.type[0].toUpperCase()}${result.type.slice(1)} copied.`)).catch((error) => setProjectError(error instanceof Error ? error.message : String(error)))
  }, [generatedResultAt])
  const generatedMediaFavorite = useCallback((nodeId: string, index: number) => Boolean(generatedAssetAt(nodeId, index)?.favorite), [generatedAssetAt])
  const setGeneratedMediaFavorite = useCallback((nodeId: string, index: number, favorite: boolean) => {
    const asset = generatedAssetAt(nodeId, index)
    if (asset) void updateAssetState(asset.id, { favorite })
  }, [generatedAssetAt, updateAssetState])
  const trashGeneratedMedia = useCallback((nodeId: string, index: number) => {
    const source = nodes.find((node) => node.id === nodeId)
    const result = source?.data.generatedResults?.[index]
    if (!source || !result) return
    const asset = assets.find((candidate) => candidate.path === result.path)
    requestDelete({ category: 'asset', title: 'Delete Generated Media?', message: `Delete this generated ${result.type} and move its physical file to the macOS Trash?`, confirmLabel: 'Delete Media', action: () => {
      if (asset) void deletePhysicalAsset(asset.id)
      const remaining = (source.data.generatedResults || []).filter((_, candidateIndex) => candidateIndex !== index)
      const nextIndex = Math.min(index, Math.max(remaining.length - 1, 0))
      const next = remaining[nextIndex]
      const removedResultId = result.id || `legacy-generated:${encodeURIComponent(result.path)}`
      const migratedLifecycle = migrateSemanticAssetLifecycleMetadata(source.data, { recoverTransient: false }).semanticAssetLifecycle
      const semanticLifecycle = migratedLifecycle ? (() => {
        const references = migratedLifecycle.references.filter((reference) => reference.id !== removedResultId && reference.path !== result.path)
        const selectedId = migratedLifecycle.selectedId === removedResultId
          ? (next ? next.id || `legacy-generated:${encodeURIComponent(next.path)}` : references[0]?.id)
          : migratedLifecycle.selectedId
        const status = references.some((reference) => reference.source === 'generated')
          ? 'RESULTS_READY' as const
          : references.length === 1 && references[0].source === 'saved'
            ? 'SAVED_VIEW' as const
            : references.length ? 'REFERENCE_READY' as const : 'EMPTY' as const
        return { ...migratedLifecycle, references, selectedId, status, pendingSave: undefined }
      })() : undefined
      updateNode(nodeId, { generatedResults: remaining, activeResultIndex: nextIndex, outputPath: next?.path, outputUrl: next?.url, outputType: next?.type, modelId: next?.modelId, ...(semanticLifecycle ? { semanticAssetLifecycle: semanticLifecycle } : {}) })
      setGeneratedMediaViewer((current) => current?.kind === 'node' && current.nodeId === nodeId ? null : current)
    } })
  }, [assets, deletePhysicalAsset, nodes, requestDelete, updateNode])

  const importAssetPackage = useCallback(async () => {
    try {
      const imported = await window.prism.assets.importPackage()
      if (!imported.length) return
      setAssets((current) => [...imported, ...current.filter((asset) => !imported.some((item) => item.id === asset.id))])
      const destination = importedAssetDestination(imported.map((asset) => asset.category))
      setAssetTypeFilter(destination)
      const destinationLabel = destination === 'all' ? 'their matching asset categories' : destination === 'audio' ? 'Audio' : destination === 'storyboard' ? 'Storyboards' : `${destination[0].toUpperCase()}${destination.slice(1)}s`
      setProjectNotice(`Imported ${imported.length} asset file${imported.length === 1 ? '' : 's'} into ${destinationLabel} based on ${imported.length === 1 ? 'its' : 'their'} actual type.`)
    } catch (error) { setProjectError(error instanceof Error ? error.message : String(error)) }
  }, [])

  const captureMediaInfo = useCallback((assetId: string, width: number, height: number, duration?: number) => {
    const divisor = (a: number, b: number): number => b ? divisor(b, a % b) : a
    const common = width > 0 && height > 0 ? divisor(Math.round(width), Math.round(height)) : 0
    setAssetMediaInfo((current) => ({ ...current, [assetId]: {
      ...(common ? { aspectRatio: `${Math.round(width) / common}:${Math.round(height) / common}` } : {}),
      ...(Number.isFinite(duration) && duration! > 0 ? { duration } : {}),
    } }))
  }, [])

  const visibleProjectAssets = useMemo(() => withoutPromotedSourceDuplicates(assets), [assets])
  const homeAssets = useMemo(() => {
    const candidates = visibleProjectAssets.filter((asset) => {
      const enriched = asset as ImportedAsset & { favorite?: boolean; trashedAt?: string }
      if (homeSection === 'favorites') return Boolean(enriched.favorite) && !enriched.trashedAt
      if (homeSection === 'trash') return Boolean(enriched.trashedAt)
      if (enriched.trashedAt) return false
      if (homeSection === 'assets' && assetTypeFilter !== 'all' && asset.category !== assetTypeFilter) return false
      const query = assetSearch.trim().toLowerCase()
      if (query && !`${assetDisplayName(asset)} ${asset.name} ${asset.category || ''} ${asset.metadata?.modelId || ''} ${asset.metadata?.provider || ''} ${asset.metadata?.prompt || ''}`.toLowerCase().includes(query)) return false
      return true
    })
    return homeSection === 'assets' ? filterAssetsByFinalOrigin(candidates, assetOriginFilter) : candidates
  }, [assetOriginFilter, assetSearch, assetTypeFilter, homeSection, visibleProjectAssets])

  const semanticAssetCollections = useMemo(() => groupSemanticAssets(homeAssets), [homeAssets])
  const semanticAssetIds = useMemo(() => new Set(semanticAssetCollections.flatMap((collection) => collection.assets.map((asset) => asset.id))), [semanticAssetCollections])
  const ungroupedHomeAssets = useMemo(() => homeAssets.filter((asset) => !semanticAssetIds.has(asset.id)), [homeAssets, semanticAssetIds])
  const assetTypeLabel = assetTypeFilter === 'all' ? 'All Assets' : assetTypeFilter === 'audio' ? 'Audio' : `${assetTypeFilter[0].toUpperCase()}${assetTypeFilter.slice(1)}s`
  const canvasAssetCreateLabel = assetTypeFilter === 'all' ? 'Create' : `Create ${assetTypeFilter === 'storyboard' ? 'Storyboard' : assetTypeFilter === 'audio' ? 'Audio' : assetTypeFilter[0].toUpperCase() + assetTypeFilter.slice(1)}`
  const assetSectionTitle = assetTypeFilter === 'character' ? 'Character Reference Sets And Identity Views'
    : assetTypeFilter === 'element' ? 'Props, Products, Vehicles And Reusable Objects'
      : assetTypeFilter === 'location' ? 'Interior And Exterior Locations By Time Of Day'
        : assetTypeFilter === 'wardrobe' ? 'Reusable Wardrobe References'
        : assetTypeFilter === 'style' ? 'Reusable Visual Prompt Styles'
          : assetTypeFilter === 'storyboard' ? 'Storyboards'
            : assetTypeFilter === 'image' ? 'Imported Images And Generated Stills'
            : assetTypeFilter === 'video' ? 'Imported Clips And Generated Videos'
              : assetTypeFilter === 'audio' ? 'Voice, Music And Sound Assets'
                : 'All Project Assets'
  const launcherProjects = launcherSection === 'recent' ? [...recentProjects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8) : recentProjects
  const updateLauncherProject = useCallback((updated: ProjectWorkspace) => setRecentProjects((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)), [])
  const requestForgetProject = useCallback((item: ProjectWorkspace) => requestDelete({
    category: 'project',
    title: 'Remove Project From Prism?',
    message: `Remove “${item.name}” from this project list? Its folder and every physical file will remain untouched.`,
    confirmLabel: 'Remove From List',
    action: async () => {
      await window.prism.projects.forget(item.rootPath)
      setRecentProjects((current) => current.filter((project) => project.id !== item.id))
    },
  }), [requestDelete])
  const styleLibraryItems = useMemo(() => {
    const items = new Map<string, { node: StudioNode; pageId: string; pageNodes: StudioNode[]; pageEdges: Edge[] }>()
    pages.forEach((page) => page.nodes.filter((node) => node.data.kind === 'style-reference').forEach((node) => items.set(node.id, { node, pageId: page.id, pageNodes: page.nodes, pageEdges: page.edges })))
    nodes.filter((node) => node.data.kind === 'style-reference').forEach((node) => items.set(node.id, { node, pageId: activePageId, pageNodes: nodes, pageEdges: edges }))
    return [...items.values()]
  }, [activePageId, edges, nodes, pages])
  const savedStyleLibraryItems = useMemo(() => styleLibraryItems
    .filter(({ node }) => Boolean(node.data.styleSavedAt && !node.data.stylePresetId && node.data.referenceAssets?.length && (node.data.stylePrompt || node.data.prompt || '').trim()))
    .map((item) => {
      const connectedStoryboardIds = item.pageEdges.filter((edge) => edge.source === item.node.id).map((edge) => edge.target)
      const connectedStoryboards = item.pageNodes.filter((node) => connectedStoryboardIds.includes(node.id) && node.data.kind === 'storyboard')
      const previewAsset = connectedStoryboards.flatMap((node) => node.data.storyboardPanels || []).map((panel) => panel.asset).find(Boolean)
      const downstreamIds = new Set(item.pageEdges.filter((edge) => connectedStoryboardIds.includes(edge.source)).map((edge) => edge.target))
      const mediaNode = item.pageNodes.find((node) => downstreamIds.has(node.id) && node.data.outputUrl)
      const fallbackAsset = item.node.data.referenceAssets?.[0]
      const previewUrl = connectedStoryboards.find((node) => node.data.outputUrl && !node.data.storyboardNeedsCompile)?.data.outputUrl || previewAsset?.url || mediaNode?.data.outputUrl || fallbackAsset?.url
      const previewMimeType = previewAsset?.mimeType || (mediaNode?.data.outputType ? `${mediaNode.data.outputType}/preview` : undefined) || fallbackAsset?.mimeType
      return { ...item, previewAsset: previewAsset || fallbackAsset, previewUrl, previewMimeType }
    }), [styleLibraryItems])
  const visibleBuiltInStyles = useMemo(() => {
    if (assetTypeFilter !== 'style' || assetOriginFilter !== 'all') return []
    const query = assetSearch.trim().toLowerCase()
    return STYLE_PRESETS.filter((preset) => !query || `${preset.title} built-in included style preset`.toLowerCase().includes(query))
  }, [assetOriginFilter, assetSearch, assetTypeFilter])
  const visibleSavedStyleLibraryItems = useMemo(() => {
    // Workflow Style nodes stay in their Canvas; only private, app-global Style assets appear in the library.
    return savedStyleLibraryItems.filter(() => false)
  }, [savedStyleLibraryItems])
  const visibleGlobalStyleAssets = useMemo(() => assetTypeFilter === 'style' ? homeAssets.filter((asset) => asset.category === 'style') : [], [assetTypeFilter, homeAssets])

  const deleteSavedStylePreset = useCallback((nodeId: string, pageId: string) => {
    setPages((current) => current.map((page) => page.id === pageId ? { ...page, nodes: page.nodes.filter((node) => node.id !== nodeId), edges: page.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId), updatedAt: new Date().toISOString() } : page))
    if (pageId === activePageId) {
      setNodes((current) => current.filter((node) => node.id !== nodeId))
      setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    }
  }, [activePageId, setEdges, setNodes])

  const exportSavedStylePreset = useCallback(async (item: (typeof savedStyleLibraryItems)[number]) => {
    const source = item.previewAsset
    if (!source?.path) {
      setProjectNotice('Run the connected Storyboard first so this preset has a transferable preview.')
      return
    }
    try {
      const promoted = await window.prism.assets.promote([source.path], 'style-reference', item.node.data.title || 'Preset Style')
      if (!promoted[0]) throw new Error('The style preview could not be prepared for export.')
      const updated = await window.prism.assets.updateMetadata(promoted[0].id, {
        ...promoted[0].metadata,
        prompt: item.node.data.stylePrompt || item.node.data.prompt || '',
        provider: 'Prism Foundry',
        modelId: 'Custom Preset Style',
      })
      setAssets((current) => [updated, ...current.filter((asset) => asset.id !== updated.id)])
      await window.prism.assets.exportPackage(updated.id)
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error))
    }
  }, [savedStyleLibraryItems])
  const storyboardLibraryItems = useMemo(() => {
    const items = new Map<string, { node: StudioNode; pageId: string }>()
    pages.forEach((page) => page.nodes.filter((node) => node.data.kind === 'storyboard' && hasMaterializedAsset(node.data)).forEach((node) => items.set(node.id, { node, pageId: page.id })))
    nodes.filter((node) => node.data.kind === 'storyboard' && hasMaterializedAsset(node.data)).forEach((node) => items.set(node.id, { node, pageId: activePageId }))
    return [...items.values()]
  }, [activePageId, nodes, pages])
  const visibleAssetCount = homeSection === 'assets' && assetTypeFilter === 'style' ? visibleBuiltInStyles.length + visibleSavedStyleLibraryItems.length + visibleGlobalStyleAssets.length
    : homeSection === 'assets' && assetTypeFilter === 'storyboard' ? storyboardLibraryItems.length
      : semanticAssetCollections.length + ungroupedHomeAssets.length
  const visibleSelectableAssetKeys = useMemo(() => assetTypeFilter === 'style' ? [
    ...visibleBuiltInStyles.map((preset) => `built-in-style:${preset.id}`),
    ...visibleSavedStyleLibraryItems.map((item) => `project-node:${item.pageId}:${item.node.id}`),
    ...visibleGlobalStyleAssets.map((asset) => `style-asset:${asset.id}`),
  ] : assetTypeFilter === 'storyboard' ? storyboardLibraryItems.map(({ node, pageId }) => `project-node:${pageId}:${node.id}`) : [
    ...semanticAssetCollections.map((collection) => `semantic:${collection.key}`),
    ...ungroupedHomeAssets.map((asset) => `media:${asset.id}`),
  ], [assetTypeFilter, semanticAssetCollections, storyboardLibraryItems, ungroupedHomeAssets, visibleBuiltInStyles, visibleGlobalStyleAssets, visibleSavedStyleLibraryItems])
  const selectedManagedAssetDeletion = useMemo(() => managedAssetDeletionSelection(selectedAssetKeys, [
    ...semanticAssetCollections.map((collection) => ({ key: `semantic:${collection.key}`, assets: collection.assets })),
    ...ungroupedHomeAssets.map((asset) => ({ key: `media:${asset.id}`, assets: [asset] })),
    ...visibleGlobalStyleAssets.map((asset) => ({ key: `style-asset:${asset.id}`, assets: [asset] })),
  ]), [selectedAssetKeys, semanticAssetCollections, ungroupedHomeAssets, visibleGlobalStyleAssets])
  const requestSelectedManagedAssetDelete = useCallback(() => {
    if (!selectedManagedAssetDeletion.selectionCount) return
    requestManagedAssetDelete(selectedManagedAssetDeletion.assets, `${selectedManagedAssetDeletion.selectionCount} selected assets`, {
      title: `Delete ${selectedManagedAssetDeletion.selectionCount} Assets?`,
      messagePrefix: `Delete ${selectedManagedAssetDeletion.selectionCount} selected assets.`,
      confirmLabel: `Delete ${selectedManagedAssetDeletion.selectionCount} Assets`,
    })
  }, [requestManagedAssetDelete, selectedManagedAssetDeletion])
  useEffect(() => {
    const libraryActive = appView === 'space' && ['assets', 'favorites'].includes(homeSection) || appView === 'canvas' && assetBrowserOpen && keyboardSelectionScope.current === 'library'
    const deleteSelectedAssets = (event: KeyboardEvent) => {
      if (appShortcutsSuppressed()) return
      const selectAllKeys = librarySelectAllKeys({ key: event.key, meta: event.metaKey, libraryActive, textEntryActive: isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement) }, visibleSelectableAssetKeys)
      if (selectAllKeys) {
        event.preventDefault()
        event.stopPropagation()
        setSelectedAssetKeys(selectAllKeys)
        setAssetSelectionAnchor(selectAllKeys[0] || null)
        setSelectedCanvasAssetKey(selectAllKeys.at(-1) || null)
        return
      }
      if (!shouldRequestSelectedAssetDelete({ key: event.key, selectedCount: selectedManagedAssetDeletion.selectionCount, assetsSurfaceVisible: libraryActive, textEntryActive: isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement), confirmationOpen: Boolean(deleteRequest) })) return
      event.preventDefault()
      event.stopPropagation()
      requestSelectedManagedAssetDelete()
    }
    window.addEventListener('keydown', deleteSelectedAssets, true)
    return () => window.removeEventListener('keydown', deleteSelectedAssets, true)
  }, [appView, assetBrowserOpen, deleteRequest, homeSection, requestSelectedManagedAssetDelete, selectedManagedAssetDeletion.selectionCount, visibleSelectableAssetKeys])
  const clearLibrarySelection = useCallback(() => {
    setSelectedAssetKeys([])
    setAssetSelectionAnchor(null)
    setSelectedCanvasAssetKey(null)
  }, [])
  const clearCanvasSelection = useCallback(() => {
    setNodes((current) => current.some((node) => node.selected) ? current.map((node) => node.selected ? { ...node, selected: false } : node) : current)
    setEdges((current) => current.some((edge) => edge.selected) ? current.map((edge) => edge.selected ? { ...edge, selected: false } : edge) : current)
  }, [setEdges, setNodes])
  useEffect(() => {
    const dismissSelections = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return
      const canvasControl = Boolean(target.closest('.topbar, .tool-rail, .page-strip, .node-inspector-panel, .side-panel > header > button'))
      const insideCanvas = appView === 'canvas' && Boolean(target.closest('.react-flow'))
      const insideSideLibrary = appView === 'canvas' && assetBrowserOpen && Boolean(target.closest('.canvas-assets-panel')) && !canvasControl
      const insideOutsideLibrary = appView === 'space' && ['assets', 'favorites'].includes(homeSection) && Boolean(target.closest('.asset-card, .style-library-card'))
      const insideLibrary = insideSideLibrary || insideOutsideLibrary
      const intent = selectionDismissalIntent({ insideLibrary, insideCanvas, canvasControl })
      if (intent.clearLibrary) clearLibrarySelection()
      if (intent.clearCanvas) clearCanvasSelection()
    }
    window.addEventListener('pointerdown', dismissSelections, true)
    return () => window.removeEventListener('pointerdown', dismissSelections, true)
  }, [appView, assetBrowserOpen, clearCanvasSelection, clearLibrarySelection, homeSection])
  const selectVisibleAsset = useCallback((event: ReactMouseEvent, key: string) => {
    const next = applyOrderedAssetSelection(visibleSelectableAssetKeys, selectedAssetKeys, assetSelectionAnchor, key, { shift: event.shiftKey, meta: event.metaKey })
    setSelectedAssetKeys(next.selected)
    setAssetSelectionAnchor(next.anchor)
    setSelectedCanvasAssetKey(next.selected.at(-1) || null)
  }, [assetSelectionAnchor, selectedAssetKeys, visibleSelectableAssetKeys])

  const switchPage = useCallback((pageId: string) => {
    setStyleChooserNodeId(null)
    const next = pages.find((page) => page.id === pageId)
    if (!next || pageId === activePageId) return
    setPages((current) => current.map((page) => page.id === activePageId
      ? { ...page, nodes, edges, viewport: getViewport(), updatedAt: new Date().toISOString() }
      : page))
    const collapsedNodes = withCollapsedCharacterEditors(next.nodes)
    setActivePageId(next.id)
    setNodes(collapsedNodes)
    const nextEdges = staticEdges(next.edges)
    setEdges(nextEdges)
    window.setTimeout(() => fitView({ duration: 350, padding: 0.25 }), 30)
  }, [activePageId, edges, fitView, getViewport, nodes, pages, setEdges, setNodes])

  const addPage = useCallback(() => {
    const page: CanvasPage = {
      id: crypto.randomUUID(),
      name: `Page ${pages.length + 1}`,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: new Date().toISOString(),
    }
    setPages((current) => [...current.map((item) => item.id === activePageId
      ? { ...item, nodes, edges, viewport: getViewport(), updatedAt: new Date().toISOString() }
      : item), page])
    setActivePageId(page.id)
    setNodes([])
    setEdges([])
    setAppView('canvas')
  }, [activePageId, edges, getViewport, nodes, pages.length, setEdges, setNodes])

  const deletePage = useCallback((pageId: string) => {
    if (pages.length <= 1) return
    const materialized = pages.map((page) => page.id === activePageId ? { ...page, nodes, edges, viewport: getViewport(), updatedAt: new Date().toISOString() } : page)
    const removedIndex = materialized.findIndex((page) => page.id === pageId)
    if (removedIndex < 0) return
    const remaining = materialized.filter((page) => page.id !== pageId)
    setPages(remaining)
    if (pageId === activePageId) {
      const nextPage = remaining[Math.min(removedIndex, remaining.length - 1)]
      setActivePageId(nextPage.id)
      setNodes(withCollapsedCharacterEditors(nextPage.nodes))
      setEdges(staticEdges(nextPage.edges))
    }
  }, [activePageId, edges, getViewport, nodes, pages, setEdges, setNodes])

  const switchCanvas = useCallback((canvasId: string) => {
    const nextCanvas = canvases.find((canvas) => canvas.id === canvasId)
    if (!nextCanvas) return
    if (canvasId !== activeCanvasId) {
      const materializedPages = pages.map((page) => page.id === activePageId
        ? { ...page, nodes, edges, viewport: getViewport(), updatedAt: new Date().toISOString() }
        : page)
      setCanvases((current) => current.map((canvas) => canvas.id === activeCanvasId ? { ...canvas, pages: materializedPages, activePageId, updatedAt: new Date().toISOString() } : canvas))
      const nextPage = nextCanvas.pages.find((page) => page.id === nextCanvas.activePageId) || nextCanvas.pages[0]
      setActiveCanvasId(nextCanvas.id)
      setPages(nextCanvas.pages)
      setActivePageId(nextPage.id)
      setNodes(withCollapsedCharacterEditors(nextPage.nodes))
      setEdges(staticEdges(nextPage.edges))
      window.setTimeout(() => fitView({ duration: 350, padding: 0.25 }), 30)
    }
    setAppView('canvas')
  }, [activeCanvasId, activePageId, canvases, edges, fitView, getViewport, nodes, pages, setEdges, setNodes])

  const addCanvas = useCallback(() => {
    const now = new Date().toISOString()
    const page: CanvasPage = { id: crypto.randomUUID(), name: 'Page 1', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: now }
    const canvas: WorkspaceCanvas = { id: crypto.randomUUID(), name: `Canvas ${canvases.length + 1}`, pages: [page], activePageId: page.id, updatedAt: now }
    const materializedPages = pages.map((item) => item.id === activePageId ? { ...item, nodes, edges, viewport: getViewport(), updatedAt: now } : item)
    setCanvases((current) => [...current.map((item) => item.id === activeCanvasId ? { ...item, pages: materializedPages, activePageId, updatedAt: now } : item), canvas])
    setActiveCanvasId(canvas.id)
    setPages([page])
    setActivePageId(page.id)
    setNodes([])
    setEdges([])
    setAppView('canvas')
  }, [activeCanvasId, activePageId, canvases.length, edges, getViewport, nodes, pages, setEdges, setNodes])

  const commitCanvasRename = useCallback((canvasId: string) => {
    const nextName = canvasNameDraft.trim()
    if (nextName) setCanvases((current) => current.map((canvas) => canvas.id === canvasId ? { ...canvas, name: nextName, updatedAt: new Date().toISOString() } : canvas))
    setRenamingCanvasId(null)
    setCanvasNameDraft('')
  }, [canvasNameDraft])

  const duplicateCanvas = useCallback((canvasId: string) => {
    const materializedPages = pages.map((page) => page.id === activePageId
      ? { ...page, nodes, edges, viewport: getViewport(), updatedAt: new Date().toISOString() }
      : page)
    const materialized = canvases.map((canvas) => canvas.id === activeCanvasId ? { ...canvas, pages: materializedPages, activePageId } : canvas)
    const sourceIndex = materialized.findIndex((canvas) => canvas.id === canvasId)
    const source = materialized[sourceIndex]
    if (!source) return
    const duplicatePages = source.pages.map((sourcePage) => {
      const nodeIds = new Map(sourcePage.nodes.map((node) => [node.id, crypto.randomUUID()]))
      return {
        ...structuredClone(sourcePage), id: crypto.randomUUID(), updatedAt: new Date().toISOString(),
        nodes: remapCopiedNodeGroups(sourcePage.nodes.map((node) => ({ ...structuredClone(node), id: nodeIds.get(node.id)!, selected: false, data: { ...structuredClone(node.data), storyboardSourceId: node.data.storyboardSourceId ? nodeIds.get(node.data.storyboardSourceId) || node.data.storyboardSourceId : undefined } }))),
        edges: sourcePage.edges.map((edge) => ({ ...structuredClone(edge), id: crypto.randomUUID(), source: nodeIds.get(edge.source) || edge.source, target: nodeIds.get(edge.target) || edge.target, selected: false })),
      }
    })
    const duplicate: WorkspaceCanvas = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: `${source.name} Copy`,
      updatedAt: new Date().toISOString(),
      pages: duplicatePages,
      activePageId: duplicatePages[Math.max(0, source.pages.findIndex((page) => page.id === source.activePageId))]?.id || duplicatePages[0].id,
    }
    materialized.splice(sourceIndex + 1, 0, duplicate)
    setCanvases(materialized)
  }, [activeCanvasId, activePageId, canvases, edges, getViewport, nodes, pages])

  const deleteCanvas = useCallback((canvasId: string) => {
    if (canvases.length <= 1) return
    const materializedPages = pages.map((page) => page.id === activePageId ? { ...page, nodes, edges, viewport: getViewport(), updatedAt: new Date().toISOString() } : page)
    const materialized = canvases.map((canvas) => canvas.id === activeCanvasId ? { ...canvas, pages: materializedPages, activePageId } : canvas)
    const removedIndex = materialized.findIndex((canvas) => canvas.id === canvasId)
    if (removedIndex < 0) return
    const remaining = materialized.filter((canvas) => canvas.id !== canvasId)
    setCanvases(remaining)
    if (canvasId === activeCanvasId) {
      const nextCanvas = remaining[Math.min(removedIndex, remaining.length - 1)]
      const nextPage = nextCanvas.pages.find((page) => page.id === nextCanvas.activePageId) || nextCanvas.pages[0]
      setActiveCanvasId(nextCanvas.id)
      setPages(nextCanvas.pages)
      setActivePageId(nextPage.id)
      setNodes(withCollapsedCharacterEditors(nextPage.nodes))
      setEdges(staticEdges(nextPage.edges))
    }
  }, [activeCanvasId, activePageId, canvases, edges, getViewport, nodes, pages, setEdges, setNodes])

  const previewCanvasReorder = useCallback((targetCanvasId: string, clientX: number, clientY: number, targetElement: HTMLElement) => {
    if (!draggedCanvasId || draggedCanvasId === targetCanvasId) return
    const fromIndex = canvases.findIndex((canvas) => canvas.id === draggedCanvasId)
    const targetIndex = canvases.findIndex((canvas) => canvas.id === targetCanvasId)
    if (fromIndex < 0 || targetIndex < 0) return
    const rect = targetElement.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const verticalIntent = Math.abs(clientY - centerY) > rect.height * .34
    const distanceFromCenter = verticalIntent ? Math.abs(clientY - centerY) : Math.abs(clientX - centerX)
    const threshold = verticalIntent ? rect.height * .12 : rect.width * .12
    if (distanceFromCenter < threshold) return
    const insertAfter = verticalIntent ? clientY > centerY : clientX > centerX
    let destinationIndex = targetIndex + (insertAfter ? 1 : 0)
    if (destinationIndex > fromIndex) destinationIndex -= 1
    destinationIndex = Math.max(0, Math.min(canvases.length - 1, destinationIndex))
    if (destinationIndex === fromIndex) return
    const swapKey = `${draggedCanvasId}:${destinationIndex}`
    const now = performance.now()
    if (pageSwapLock.current === swapKey || now - pageLastSwapAt.current < 140) return
    pageSwapLock.current = swapKey
    pageLastSwapAt.current = now
    const firstRects = new Map([...pageCardRefs.current].map(([id, element]) => [id, element.getBoundingClientRect()]))
    const preview = [...canvases]
    const [moving] = preview.splice(fromIndex, 1)
    preview.splice(destinationIndex, 0, moving)
    setCanvases(preview)
    requestAnimationFrame(() => pageCardRefs.current.forEach((element, id) => {
      const first = firstRects.get(id)
      const last = element.getBoundingClientRect()
      if (!first || (first.left === last.left && first.top === last.top)) return
      element.animate([
        { transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` },
        { transform: 'translate(0, 0)' },
      ], { duration: 190, easing: 'cubic-bezier(.2,.75,.25,1)' })
    }))
  }, [canvases, draggedCanvasId])

  const finishCanvasReorder = useCallback(() => {
    setDraggedCanvasId(null)
    pageDragGhost.current?.remove()
    pageDragGhost.current = null
    suppressPageClick.current = true
    window.setTimeout(() => { suppressPageClick.current = false }, 80)
  }, [])

  const cancelCanvasReorder = useCallback(() => {
    if (!pageDropCommitted.current && pageOrderBeforeDrag.current.length) {
      setCanvases((current) => [...current].sort((a, b) => pageOrderBeforeDrag.current.indexOf(a.id) - pageOrderBeforeDrag.current.indexOf(b.id)))
    }
    pageDropCommitted.current = false
    pageOrderBeforeDrag.current = []
    pageSwapLock.current = ''
    setDraggedCanvasId(null)
    pageDragGhost.current?.remove()
    pageDragGhost.current = null
  }, [])

  const commitTabPageRename = useCallback((pageId: string) => {
    const nextName = tabPageNameDraft.trim()
    if (nextName) setPages((current) => current.map((page) => page.id === pageId ? { ...page, name: nextName, updatedAt: new Date().toISOString() } : page))
    setRenamingTabPageId(null)
    setTabPageNameDraft('')
  }, [tabPageNameDraft])

  const previewTabPageReorder = useCallback((targetPageId: string, clientX: number, targetElement: HTMLElement) => {
    if (!draggedTabPageId || draggedTabPageId === targetPageId) return
    const fromIndex = pages.findIndex((page) => page.id === draggedTabPageId)
    const targetIndex = pages.findIndex((page) => page.id === targetPageId)
    if (fromIndex < 0 || targetIndex < 0) return
    const rect = targetElement.getBoundingClientRect()
    const insertAfter = clientX > rect.left + rect.width / 2
    let destinationIndex = targetIndex + (insertAfter ? 1 : 0)
    if (destinationIndex > fromIndex) destinationIndex -= 1
    destinationIndex = Math.max(0, Math.min(pages.length - 1, destinationIndex))
    if (destinationIndex === fromIndex) return
    const swapKey = `${draggedTabPageId}:${destinationIndex}`
    if (pageTabSwapLock.current === swapKey) return
    pageTabSwapLock.current = swapKey
    const firstRects = new Map([...pageTabRefs.current].map(([id, element]) => [id, element.getBoundingClientRect()]))
    const preview = [...pages]
    const [moving] = preview.splice(fromIndex, 1)
    preview.splice(destinationIndex, 0, moving)
    setPages(preview)
    requestAnimationFrame(() => pageTabRefs.current.forEach((element, id) => {
      const first = firstRects.get(id)
      const last = element.getBoundingClientRect()
      if (!first || first.left === last.left) return
      element.animate([{ transform: `translateX(${first.left - last.left}px)` }, { transform: 'translateX(0)' }], { duration: 170, easing: 'cubic-bezier(.2,.75,.25,1)' })
    }))
  }, [draggedTabPageId, pages])

  const finishTabPageReorder = useCallback(() => {
    pageTabDropCommitted.current = true
    pageTabOrderBeforeDrag.current = []
    pageTabSwapLock.current = ''
    setDraggedTabPageId(null)
  }, [])

  const cancelTabPageReorder = useCallback(() => {
    if (!pageTabDropCommitted.current && pageTabOrderBeforeDrag.current.length) setPages((current) => [...current].sort((a, b) => pageTabOrderBeforeDrag.current.indexOf(a.id) - pageTabOrderBeforeDrag.current.indexOf(b.id)))
    pageTabDropCommitted.current = false
    pageTabOrderBeforeDrag.current = []
    pageTabSwapLock.current = ''
    setDraggedTabPageId(null)
  }, [])

  const runFromNode = useCallback((sourceId: string) => {
    const directlyConnected = [...new Set(edges.filter((edge) => edge.source === sourceId).map((edge) => edge.target))]
    directlyConnected.forEach((targetId) => {
      const target = nodes.find((node) => node.id === targetId)
      if (target && isRunnableNodeKind(target.data.kind)) void runNode(targetId)
    })
  }, [edges, nodes, runNode])

  const availableModels = useCallback((provider: ServiceProvider) => mediaProviderAvailable(provider) ? serviceModels[provider]?.models || [] : [], [serviceModels, mediaProviderAvailable])
  const serviceAvailability = useCallback((provider: ServiceProvider) => serviceModels[provider], [serviceModels])
  const refreshVoiceAvailability = useCallback(async (provider: 'elevenlabs' | 'fal') => {
    const accepts = serviceResponseScope.current!.begin(provider, 'models')
    const availability = await window.prism.services.models(provider)
    if (accepts()) setServiceModels(current => ({...current,[provider]:availability}))
  },[])
  const modelAvailabilityVerified = useCallback((provider: ServiceProvider) => Boolean(serviceModels[provider]?.verified), [serviceModels])
  const providerAccount = useCallback((provider: ServiceProvider) => serviceAccounts[provider], [serviceAccounts])
  const connectedStoryboardVideoFamily = useCallback((storyboardId: string) => {
    const families = new Set(edges
      .filter((edge) => edge.source === storyboardId && edge.targetHandle === 'storyboard-in')
      .map((edge) => nodes.find((node) => node.id === edge.target))
      .filter((node): node is StudioNode => node?.data.kind === 'video-generator')
      .map((node) => {
        if (!node.data.higgsfieldNative) return resolveVideoModel(node.data.videoEngine).family
        try { return higgsfieldPromptFamily(node.data.higgsfieldNative.endpointId) } catch { return 'generic' }
      }))
    return families.size === 1 ? [...families][0] : undefined
  }, [edges, nodes])
  const connectedStoryboardVideo = useCallback((storyboardId: string) => resolveConnectedStoryboardVideo(nodes, edges, storyboardId, endpointId => falSchema(endpointId).contract, endpointId => higgsfieldSchema(endpointId).contract), [edges, nodes, falSchema, higgsfieldSchema])

  const videoPromptState = useCallback((nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    const storyboardConnected = edges.some((edge) => edge.target === nodeId && edge.targetHandle === 'storyboard-in')
    const connected = Boolean(node && videoPromptInputsConnected(node, nodes, edges))
    if (!node || node.data.kind !== 'video-generator') return null
    if (node.data.higgsfieldNative && higgsfieldSourceOwnsTimeline(node.data.higgsfieldNative.endpointId)) {
      const prompt = node.data.manualPromptDraft ?? node.data.prompt ?? ''
      return { connected: false, mode: 'manual' as const, autoPrompt: '', manualPrompt: prompt, activePrompt: prompt, fingerprint: '', resetDisabled: true }
    }
    const mode = activeVideoPromptMode(node.data, storyboardConnected)
    let autoPrompt = ''
    let autoError: string | undefined
    if (connected) {
      try {
        const autoNode = { ...node, data: { ...node.data, promptMode: 'auto' as const } }
        const autoNodes = semanticGraphNodes.map((candidate) => candidate.id === node.id ? autoNode : candidate)
        autoPrompt = visibleProviderPromptBody(buildGenerationPromptPreviewRequest(autoNode, autoNodes, edges))
        // Readiness is separate from the immediately updated visible text.
        try { buildGenerationRequest(autoNode, autoNodes, edges) }
        catch (error) { autoError = error instanceof Error ? error.message : String(error) }
      } catch (error) { autoError = error instanceof Error ? error.message : String(error) }
    }
    const migratedManual = migrateVideoUserSeed(node, autoPrompt)
    const manualPrompt = migratedManual.manualPromptDraft ?? node.data.manualPromptDraft ?? node.data.prompt ?? ''
    return {
      connected, mode, autoPrompt, autoError, manualPrompt,
      activePrompt: mode === 'auto' ? autoPrompt : manualPrompt,
      fingerprint: videoPromptCompileFingerprint(node, nodes, edges),
      resetDisabled: !connected || !autoPrompt || manualPrompt === autoPrompt,
    }
  }, [edges, nodes, semanticGraphNodes])

  const setVideoPromptMode = useCallback((nodeId: string, mode: VideoPromptMode) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node || node.data.kind !== 'video-generator') return
    const state = videoPromptState(nodeId)
    if (mode === 'auto' && !state?.connected) return
    updateNode(nodeId, { ...switchVideoPromptMode(node, mode, state?.autoPrompt), error: mode === 'auto' ? state?.autoError : undefined })
  }, [nodes, updateNode, videoPromptState])

  const resetManualPrompt = useCallback((nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    const state = videoPromptState(nodeId)
    if (!node || !state?.autoPrompt || state.resetDisabled) return
    updateNode(nodeId, { ...resetManualPromptState(node, state.autoPrompt), error: undefined })
  }, [nodes, updateNode, videoPromptState])

  const runReadiness = useCallback((nodeId: string): { disabled: boolean; tooltip: string } => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return { disabled: true, tooltip: 'Cannot run: this node is no longer available.' }
    if (node.data.runState === 'queued' || node.data.runState === 'running') return { disabled: false, tooltip: 'Stop — this node is currently running.' }
    const generationProvider = generationServiceProvider(node.data)
    const providerName = providerDisplayName(generationProvider)
    const failures: string[] = []
    failures.push(...higgsfieldJobReadinessFailures(nodeId, higgsfieldJobs(), Boolean(node.data.higgsfieldNative || Object.keys(node.data.higgsfieldNativePresets || {}).length)))
    if (!node.data.draftCompletionPath) failures.push(...upstreamIncompleteSemanticReasons(nodeId, semanticGraphNodes, edges))
    const warnings = upstreamSemanticWarnings(nodeId, semanticGraphNodes, edges)
    if (!serviceConnections[generationProvider]) failures.push(`connect ${providerName} in Connections`)
    if (node.data.higgsfieldNative) {
      failures.push(...higgsfieldPresetReadinessFailures(node.data.higgsfieldNative, higgsfieldPresets()), ...higgsfieldInputReadinessFailures(node.data.higgsfieldNative, higgsfieldSchema(node.data.higgsfieldNative.endpointId)))
    }
    if (node.data.falNative && !node.data.draftCompletionPath) {
      const view = falSchema(node.data.falNative.endpointId)
      if (view.error) failures.push(view.error)
      else if (view.loading || !view.contract) failures.push('load the selected model contract')
      else if (view.contract.runtime?.fingerprint !== node.data.falNative.fingerprint) failures.push('review the refreshed model inputs')
      if (serviceModels.fal?.verified && !serviceModels.fal.catalogStale && !serviceModels.fal.models.some(model => model.id === node.data.falNative!.endpointId)) failures.push('choose an available model; the saved endpoint is no longer in this catalog')
    }
    const account = serviceAccounts[generationProvider]
    if (account && ['credit-required', 'temporarily-limited', 'unavailable'].includes(account.state)) failures.push(account.message)
    const hasSemanticAnchor = node.data.kind === 'character'
      ? (node.data.referenceAssets || []).some((asset) => asset.metadata?.characterView === 'front')
      : node.data.kind === 'element'
        ? (node.data.referenceAssets || []).some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)
        : false
    if (!hasSemanticAnchor) {
      const inspection = inspectGenerationRequest(node, semanticGraphNodes, edges)
      if (inspection.error) failures.push(inspection.error)
      else if (inspection.request) {
        failures.push(...generationRequirementFailures(inspection.request))
        const elevenError = directElevenAvailabilityError(inspection.request, serviceModels.elevenlabs)
        if (elevenError) failures.push(elevenError)
        const fishError = fishAvailabilityError(inspection.request, serviceModels.fish)
        if (fishError) failures.push(fishError)
      }
    }
    if (failures.length) return { disabled: true, tooltip: `Cannot run: ${formatRequirementList(failures)}.` }
    const warningSuffix = warnings.length ? ` Warning: ${formatRequirementList(warnings)}.` : ''
    if (node.data.draftCompletionPath) return { disabled: false, tooltip: 'Render the selected draft at 1080p using its original take and account.' }
    return generationActionState(node.data) === 'rerun'
      ? { disabled: false, tooltip: `Rerun — generate again with the same inputs and settings.${warningSuffix}` }
      : { disabled: false, tooltip: `Run — all required inputs, settings, and provider access are ready.${warningSuffix}` }
  }, [higgsfieldJobs, falSchema, higgsfieldSchema, edges, nodes, semanticGraphNodes, serviceAccounts, serviceConnections, serviceModels, higgsfieldPresets])

  const estimateNode = useCallback(async (nodeId: string): Promise<GenerationCostEstimate | null> => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node || (node.data.kind === 'voiceover' && node.data.voiceEngine === 'fish-audio') || isDirectElevenAudio(node.data)) return null
    const imageProvider = ['image-generator', 'image-editor', 'character', 'element', 'location', 'wardrobe'].includes(node.data.kind) ? node.data.imageProvider || 'fal' : 'fal'
    if (!serviceConnections[imageProvider]) return null
    const upstream = incomingValue(nodeId)
    return window.prism.generation.estimate({
      nodeId,
      kind: ['character', 'element', 'location'].includes(node.data.kind) ? 'image-generator' : node.data.kind,
      inputPath: node.data.assetPath || upstream.inputPath,
      inputUrl: upstream.inputUrl,
      references: upstream.references,
      quantity: node.data.kind === 'element' ? Math.min(Math.max(node.data.quantity || 2, 2), 4) : node.data.quantity,
      duration: node.data.duration,
      videoEngine: node.data.videoEngine,
      resolution: node.data.resolution,
      imageResolution: node.data.imageResolution,
      enableWebSearch: node.data.enableWebSearch,
      imageProvider: node.data.imageProvider,
      imageModelId: node.data.imageModelId,
      scale: node.data.scale,
      voiceEngine: node.data.voiceEngine,
    })
  }, [incomingValue, nodes, serviceConnections])

  const runAssistantNode = useCallback(async (nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return
    const incoming = edges.find((edge) => edge.target === nodeId && (edge.targetHandle === 'prompt' || edge.targetHandle === 'text-in'))
    const source = nodes.find((candidate) => candidate.id === incoming?.source)
    const assetPrompt = ['character', 'wardrobe', 'element', 'location', 'style-reference'].includes(node.data.kind)
    if (node.data.runState === 'running' || node.data.runState === 'queued') return
    const text = assetPrompt ? localAssetGenerationPrompt(node.data) : node.data.prompt || source?.data.assistantOutput || source?.data.prompt || ''
    if (!text.trim()) { updateNode(nodeId, { error: 'Write a Prompt before revamping it.' }); return }
    const assistantCatalogs = Object.fromEntries(ASSISTANT_PROVIDER_GROUPS.map(({ id: provider }) => [provider, availablePromptModels(provider)])) as AssistantCatalogs
    const selection = resolveAssistantSelection(node.data.assistantProvider, node.data.assistantModelId, assistantCatalogs)
    if (!selection) { updateNode(nodeId, { error: 'Connect OmniRoute or a direct text provider and refresh its available models first.' }); return }
    const { provider, model } = selection
    updateNode(nodeId, { runState: 'running', progress: `Rewriting with ${model}…`, error: undefined })
    try {
      const rewrite = await requestPromptRewrite(nodeId, provider, text, assetPrompt ? `Improve only the supplied generation Prompt for this ${node.data.kind} asset. Preserve its authored intent, exact semantic @tags, subjects, actions and constraints. Do not infer unseen appearance or introduce an additional person, wardrobe owner, prop, location or camera action. The asset Description is reference-purpose context, not a request to change it. Return only the improved Prompt. Read-only asset context: ${JSON.stringify(assetDescriptionRevampContext(node, nodes, edges).definitions)}` : sharedPromptRewriteInstruction(sharedPromptContext(nodeId, nodes, edges)), model)
      const output = rewrite.output
      if (!rewrite.canApply(promptGraphRef.current.nodes)) throw new DOMException('The prompt context changed.','AbortError')
      if (assetPrompt) validateAssetDescriptionRevamp(text, output, [...availablePromptTags(nodeId), ...assetDescriptionRevampContext(node, nodes, edges).allowedTags])
      else validateSharedPromptRewrite(text, output, availablePromptTags(nodeId))
      const patch:Partial<StudioNode['data']> = assetPrompt
        ? { assetGenerationPrompt: output, prompt: undefined, runState: node.data.runState || 'idle', progress: 'Prompt revamped', assistantProvider: provider, assistantModelId: model }
        : node.data.kind === 'prompt'
        ? { prompt: output, assistantOutput: undefined, runState: 'complete', progress: 'Prompt enhanced', assistantProvider: provider, assistantModelId: model }
        : { assistantOutput: output, runState: 'complete', progress: 'Prompt enhanced', assistantProvider: provider, assistantModelId: model }
      updateNode(nodeId,patch,rewrite.canApply)
    } catch (error) {
      if(error instanceof DOMException && error.name==='AbortError')return
      updateNode(nodeId, { runState: 'error', error: error instanceof Error ? error.message : String(error) })
    }
  }, [availablePromptModels, availablePromptTags, requestPromptRewrite, edges, nodes, updateNode])

  const nodeMediaLinkState = useCallback((nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return undefined
    const paths = [activeGeneratedResult(node.data)?.path, node.data.assetPath, node.data.outputPath].filter((path): path is string => Boolean(path))
    const candidates = [
      ...(node.data.referenceAssets || []),
      ...assets.filter((asset) => paths.includes(asset.path)),
    ]
    const asset = candidates.find((candidate) => missingAssetIds.includes(candidate.id) || assetRelinkStates[candidate.id] === 'found' || assetRelinkStates[candidate.id] === 'finding')
    if (!asset) return undefined
    return {
      assetId: asset.id,
      mediaFamily: (mediaFamily(asset.mimeType) || 'image') as AssetMediaFamily,
      state: assetVisualState(asset.id) || 'offline' as MediaOfflineVisualState,
      findingDots,
    }
  }, [assetRelinkStates, assetVisualState, assets, findingDots, missingAssetIds, nodes])

  const runtime = useMemo(() => ({
    falSchema,
    selectFalModel,
    selectHiggsfieldModel,
    higgsfieldSchema,
    refreshHiggsfieldInputs: (endpointId: string) => { void loadHiggsfieldContract(endpointId, true) },
    higgsfieldPresets,
    refreshHiggsfieldPresets: () => { void refreshHiggsfieldPresets(true) },
    updateNode,
    updatePrompt,
    videoPromptState,
    setVideoPromptMode,
    resetManualPrompt,
    connectPromptTags,
    availablePromptTags,
    adjustVoiceoverQuantity,
    runNode,
    stopNode,
    runFromNode,
    importAsset,
    importDroppedAssets,
    saveStylePreset,
    saveCharacterAsset,
    saveSemanticAsset,
    commitSemanticAssetResult,
    inspectAssetBatch,
    chooseAssetBatch,
    saveAssetBatchRow,
    renameNodeAsset,
    nodeMediaLinkState,
    semanticAssetAvailability: semanticAvailabilityForData,
    findOfflineAsset: relinkAsset,
    openGeneratedMedia,
    renameGeneratedMedia,
    revealGeneratedMedia,
    copyGeneratedMedia,
    setGeneratedMediaFavorite,
    generatedMediaFavorite,
    trashGeneratedMedia,
    buildStylePrompt,
    revampAssetDescription,
    assetDescriptionValue,
    assetDescriptionHint,
    mediaDescriptionConnected,
    mediaReferenceType,
    availableDescriptionTags,
    completeCharacterSet,
    importCanvasAssetIntoView,
    completeElementSet,
    openQuickConnect,
    openInputQuickConnect,
    inspectPort,
    connectedReferenceTags,
    connectedInputRules,
    connectedInputMedia,
    connectedStoryboardVideoFamily,
    connectedStoryboardVideo,
    setInputFidelity,
    openInspector: openNodeInspector,
    resetNodeSettings,
    duplicateNode,
    deleteNode,
    focusNode,
    copyNodeLink,
    importStoryboardPanel,
    openStyleChooser: setStyleChooserNodeId,
    rewriteStoryboardPanel,
    availableModels,
    availablePromptModels,
    promptProviderAccount,
    serviceAvailability,
    refreshVoiceAvailability,
    modelAvailabilityVerified,
    runAssistantNode,
    estimateNode,
    providerAccount,
    providerConnected: (provider: ServiceProvider) => mediaProviderAvailable(provider),
    runReadiness,
    openConnections: openProviderConnections,
    characterLibrary,
    selectCharacter,
    semanticLibraries,
    selectSemanticAsset,
    setReusableFavorite,
    exportReusableAsset,
    deleteReusableAsset,

    saveStoryboard,
    listBatchState,
    adjustListBatchQuantity,
  }), [falSchema, higgsfieldSchema, loadHiggsfieldContract, selectFalModel, selectHiggsfieldModel, higgsfieldPresets, refreshHiggsfieldPresets, adjustListBatchQuantity, adjustVoiceoverQuantity, availableModels, availablePromptModels, promptProviderAccount, availablePromptTags, buildStylePrompt, revampAssetDescription, assetDescriptionValue, assetDescriptionHint, mediaDescriptionConnected, mediaReferenceType, availableDescriptionTags, characterLibrary, chooseAssetBatch, commitSemanticAssetResult, completeCharacterSet, completeElementSet, connectPromptTags, connectedInputMedia, connectedInputRules, connectedReferenceTags, connectedStoryboardVideo, connectedStoryboardVideoFamily, copyGeneratedMedia, copyNodeLink, deleteNode, deleteReusableAsset, duplicateNode, estimateNode, exportReusableAsset, focusNode, generatedMediaFavorite, importAsset, importCanvasAssetIntoView, importDroppedAssets, importStoryboardPanel, inspectAssetBatch, inspectPort, listBatchState, modelAvailabilityVerified, nodeMediaLinkState, openGeneratedMedia, renameGeneratedMedia, openInputQuickConnect, openProviderConnections, openQuickConnect, providerAccount, relinkAsset, renameNodeAsset, resetManualPrompt, revealGeneratedMedia, rewriteStoryboardPanel, runAssistantNode, runFromNode, runNode, runReadiness, serviceAvailability, refreshVoiceAvailability, mediaProviderAvailable, saveAssetBatchRow, saveCharacterAsset, saveSemanticAsset, saveStoryboard, saveStylePreset, selectCharacter, selectSemanticAsset, semanticAvailabilityForData, semanticLibraries, serviceConnections, setGeneratedMediaFavorite, setInputFidelity, setReusableFavorite, setVideoPromptMode, stopNode, trashGeneratedMedia, updateNode, updatePrompt, videoPromptState])
  const inspectorNode = inspectorNodeId ? nodes.find((node) => node.id === inspectorNodeId) : undefined
  const inspectorPromptTags = inspectorNode ? uniquePromptTags([...connectedReferenceTags(inspectorNode.id), ...connectedInputRules(inspectorNode.id).flatMap((rule) => [rule.tag, ...(rule.aliases || [])])]) : []
  const inspectorAvailablePromptTags = inspectorNode ? availablePromptTags(inspectorNode.id) : inspectorPromptTags
  const inspectorVideoModel = inspectorNode?.data.kind === 'video-generator' && !inspectorNode.data.higgsfieldNative ? resolveVideoModel(inspectorNode.data.videoEngine) : undefined
  const inspectorVideoGroups = inspectorNode?.data.kind === 'video-generator' ? videoModelGroups(serviceModels.fal, serviceModels.higgsfield, inspectorNode.data) : []
  const inspectorVideoValue = inspectorNode?.data.kind === 'video-generator'
    ? inspectorNode.data.higgsfieldNative ? `higgsfield-native::${inspectorNode.data.higgsfieldNative.endpointId}` : inspectorNode.data.falNative ? `fal-native::${inspectorNode.data.falNative.endpointId}` : resolveVideoModel(inspectorNode.data.videoEngine).id
    : ''
  const selectInspectorVideoModel = (engine: string) => {
    if (!inspectorNode || inspectorNode.data.kind !== 'video-generator') return
    if (engine.startsWith('higgsfield-native::')) { selectHiggsfieldModel(inspectorNode.id, engine.slice('higgsfield-native::'.length)); return }
    if (engine.startsWith('fal-native::')) { selectFalModel(inspectorNode.id, engine.slice(12)); return }
    const model = resolveVideoModel(engine)
    const frameRate = model.frameRates.length ? (model.frameRates.includes(inspectorNode.data.frameRate || 24) ? inspectorNode.data.frameRate || 24 : model.frameRates[0]) : undefined
    const duration = videoDurationOptions(engine, frameRate).filter((value): value is number => typeof value === 'number')[0]
    updateNode(inspectorNode.id, { ...preserveFalNativeSelection(inspectorNode.data), videoEngine: engine,
      aspectRatio: defaultVideoRatio(model) || inspectorNode.data.aspectRatio, duration, autoDuration: false,
      generateAudio: model.nativeAudio ? inspectorNode.data.generateAudio : false,
      resolution: model.resolutions.length ? (model.resolutions.includes(inspectorNode.data.resolution || '') ? inspectorNode.data.resolution : model.resolutions[0] as StudioNodeData['resolution']) : model.fourK ? '4k' : undefined,
      frameRate, motionCadence: normalizedMotionCadence(model, frameRate, inspectorNode.data.motionCadence), inferenceSteps: model.family === 'wan' ? 40 : inspectorNode.data.inferenceSteps,
      guidanceScale: model.family === 'wan' ? 1 : model.family === 'kling' ? 0.5 : inspectorNode.data.guidanceScale,
      acceleration: model.family === 'wan' ? 'regular' : inspectorNode.data.acceleration })
  }
  const inspectorRunnable = inspectorNode && isRunnableNodeKind(inspectorNode.data.kind)
  const inspectorInspection = inspectorNode && inspectorRunnable
    ? inspectGenerationRequest(inspectorNode, semanticGraphNodes, edges)
    : { request: null, error: null }
  const inspectorRequest = inspectorInspection.request
  const inspectorReferenceCount = inspectorRequest ? generationMediaInputCount(inspectorRequest) : 0
  const inspectorHiggsfieldInputSummary = inspectorNode?.data.higgsfieldNative ? (() => {
    const state = inspectorNode.data.higgsfieldNative!
    try { if (higgsfieldModel(state.endpointId).kind === 'genjutsu') return 'One source video · image references across all image sockets · source supplies cuts and audio' } catch { /* preserve the saved bindings below */ }
    const view = higgsfieldSchema(state.endpointId)
    const media = view.contract?.endpointId === state.endpointId ? view.contract.media : state.media || []
    const summary = media.filter(binding => !('retired' in binding && binding.retired)).map(binding => {
      const count = binding.maximum !== undefined ? `up to ${binding.maximum}` : binding.multiple ? 'multiple' : 'one'
      return `${binding.label} · ${binding.type} · ${count}`
    }).join(' · ')
    return summary || (view.loading ? 'Loading native media inputs' : 'No native media inputs declared')
  })() : undefined
  const inspectorImageModelId = inspectorNode && inspectorRequest && ['image-generator', 'image-editor', 'element', 'location'].includes(inspectorNode.data.kind)
    ? inspectorNode.data.imageProvider === 'openai' || inspectorNode.data.imageProvider === 'google'
      ? inspectorRequest.imageModelId || ''
      : effectiveFalImageModel(inspectorRequest) || ''
    : ''
  const inspectorImageModelLabel = inspectorNode?.data.falNative?.label || (/nano-banana/i.test(inspectorImageModelId) ? 'Nano Banana Pro' : /kontext/i.test(inspectorImageModelId) ? 'FLUX Kontext Pro' : /gpt-image-2/i.test(inspectorImageModelId) ? 'GPT Image 2' : /gemini/i.test(inspectorImageModelId) ? 'Gemini Image' : 'FLUX Schnell')
  const inspectorUsesNanoImage = inspectorImageModelId.includes('nano-banana')
  const inspectorElevenDirect = inspectorNode?.data.voiceEngine === 'elevenlabs-direct'
  const inspectorElevenModel = serviceModels.elevenlabs?.models.find((model) => model.id === inspectorNode?.data.voiceModelId)
  const inspectorRunReadiness = inspectorNode && inspectorRunnable ? runReadiness(inspectorNode.id) : undefined
  const inspectorRunning = inspectorNode?.data.runState === 'queued' || inspectorNode?.data.runState === 'running'
  const inspectorGenerationAction = inspectorNode ? generationActionState(inspectorNode.data) : 'run'
  const inspectorRerun = inspectorGenerationAction === 'rerun'
  const inspectorGenerationTimeLeft = useGenerationTimeLeft(inspectorNode?.data, inspectorRunning, inspectorNode?.id || '')
  const [inspectorCostEstimate, setInspectorCostEstimate] = useState<GenerationCostEstimate | null>(null)
  useEffect(() => {
    if (!inspectorNode || !inspectorRunnable) { setInspectorCostEstimate(null); return }
    let active = true
    void estimateNode(inspectorNode.id).then((estimate) => { if (active) setInspectorCostEstimate(estimate) }).catch(() => { if (active) setInspectorCostEstimate(null) })
    return () => { active = false }
  }, [estimateNode, inspectorNode?.id, inspectorNode?.data.duration, inspectorNode?.data.imageResolution, inspectorNode?.data.quantity, inspectorNode?.data.resolution, inspectorNode?.data.scale, inspectorNode?.data.videoEngine, inspectorNode?.data.voiceEngine, inspectorRunnable])
  const inspectorRunTooltip = inspectorRunning
    ? inspectorGenerationTimeLeft || 'Estimating time left…'
    : inspectorRunReadiness?.disabled
      ? inspectorRunReadiness.tooltip
      : inspectorCostEstimate
        ? `Estimated cost: ${inspectorCostEstimate.totalCost.toLocaleString(undefined, { style: 'currency', currency: inspectorCostEstimate.currency })}`
        : 'Estimated cost unavailable'
  const sequenceNodes = orderedSequenceNodes(nodes.filter(node => !node.data.higgsfieldNative))
  const sequenceRunning = sequenceNodes.some((node) => node.data.sequenceStatus === 'running')
  const inspectedConnections = portInspector
    ? edges.filter((edge) => edge.source === portInspector.nodeId && edge.sourceHandle === portInspector.handleId)
    : []
  const connectedServiceCount = SERVICE_CATALOG.filter(service=>serviceConnections[service.id] || promptConnections[service.id as AssistantProvider]?.mode==='subscription' && promptConnections[service.id as AssistantProvider]?.ready).length
  const contextNode = contextMenu?.kind === 'node' ? nodes.find((node) => node.id === contextMenu.nodeId) : undefined
  const contextAsset = contextMenu?.kind === 'asset' ? assets.find((asset) => asset.id === contextMenu.assetId) : contextNode ? assets.find((asset) => {
    const paths = [contextNode.data.assetPath, contextNode.data.outputPath, ...(contextNode.data.referenceAssets || []).map((item) => item.path), ...(contextNode.data.listItems || []).map((item) => item.asset?.path)]
    return paths.includes(asset.path)
  }) : undefined
  const contextNodeIds = contextMenu?.kind === 'node' || contextMenu?.kind === 'selection' ? contextMenu.nodeIds : []
  const contextHasRunnable = contextNodeIds.some((id) => {
    const node = nodes.find((candidate) => candidate.id === id)
    return Boolean(node && isRunnableNodeKind(node.data.kind))
  })
  const availableStyleNodes = savedStyleLibraryItems.map(({ node }) => node)
  const selectedAlignableNodeIds = nodes.filter((node) => node.selected && !node.data.locked).map((node) => node.id)
  const viewerNode = generatedMediaViewer?.kind === 'node' ? nodes.find((node) => node.id === generatedMediaViewer.nodeId) : undefined
  const viewerAssetSequence = generatedMediaViewer?.kind === 'assets' ? generatedMediaViewer.assetIds.map((id) => assets.find((asset) => asset.id === id)).filter((asset): asset is ImportedAsset => Boolean(asset)) : []
  const viewerResults = viewerNode?.data.generatedResults || viewerAssetSequence.map((asset) => ({
    path: asset.path,
    url: asset.url || '',
    type: asset.mimeType.startsWith('video/') ? 'video' as const : asset.mimeType.startsWith('audio/') ? 'audio' as const : 'image' as const,
    modelId: asset.metadata?.modelId || asset.metadata?.provider || (asset.origin === 'generated' ? 'Generated' : 'Imported'),
    createdAt: asset.createdAt,
    sourceLabels: [asset.category === 'location' ? 'Background' : asset.category || asset.origin || 'Asset'],
  }))
  const viewerIndex = generatedMediaViewer ? Math.min(Math.max(generatedMediaViewer.index, 0), Math.max(viewerResults.length - 1, 0)) : 0
  const viewerResult = viewerResults[viewerIndex]
  const viewerAsset = viewerResult ? assets.find((asset) => asset.path === viewerResult.path) : undefined
  const viewerHistory = viewerResult ? history.find((entry) => entry.outputPath === viewerResult.path) : undefined
  const viewerCreatedAt = viewerResult?.createdAt || viewerAsset?.createdAt || viewerHistory?.createdAt
  const viewerSourceLabels = viewerResult?.sourceLabels?.length ? viewerResult.sourceLabels : viewerNode ? connectedInputRules(viewerNode.id).map((rule) => rule.tag) : []
  const viewerTitle = viewerNode ? generatedResultName(viewerResult, viewerNode.data.title) : viewerAsset ? assetDisplayName(viewerAsset) : 'Media'
  const selectViewedResult = useCallback((index: number) => {
    if (!generatedMediaViewer || index < 0 || index >= viewerResults.length) return
    setGeneratedMediaViewer({ ...generatedMediaViewer, index })
    if (generatedMediaViewer.kind === 'node') {
      const result = viewerResults[index]
      if (result) updateNode(generatedMediaViewer.nodeId, { activeResultIndex: index, outputPath: result.path, outputUrl: result.url, outputType: result.type, modelId: result.modelId })
    }
  }, [generatedMediaViewer, updateNode, viewerResults])
  useEffect(() => { setViewerMediaInfo({}); setViewerMediaContextMenu(null) }, [viewerResult?.path])
  const copyViewedMedia = useCallback(() => {
    if (!viewerResult) return
    void window.prism.assets.copyMedia(viewerResult.path, viewerResult.type)
      .then(() => setProjectNotice(`${viewerResult.type[0].toUpperCase()}${viewerResult.type.slice(1)} copied.`))
      .catch((error) => setProjectError(error instanceof Error ? error.message : String(error)))
    setViewerMediaContextMenu(null)
  }, [viewerResult])
  useEffect(() => {
    if (!generatedMediaViewer) return
    const measure = () => setViewerViewport({ width: window.innerWidth, height: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [generatedMediaViewer])
  useEffect(() => {
    if (!generatedMediaViewer) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (appShortcutsSuppressed()) return
      if (event.key === 'Escape') setGeneratedMediaViewer(null)
      if (event.key === 'ArrowLeft' && viewerIndex > 0) selectViewedResult(viewerIndex - 1)
      if (event.key === 'ArrowRight' && viewerIndex < viewerResults.length - 1) selectViewedResult(viewerIndex + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [generatedMediaViewer, selectViewedResult, viewerIndex, viewerResults.length])

  if (!projectReady) return <div className="project-gate"><div className="project-gate-card"><Sparkles size={22} /><h1>Prism Foundry</h1><p>Opening your local studio…</p></div></div>

  if (!project) return (
    <div className="project-launcher">
      <aside className="launcher-sidebar">
        <div className="launcher-brand"><Sparkles size={17} /><span><strong>Prism Foundry</strong><small>Project library</small></span></div>
        <nav><button className={launcherSection === 'home' ? 'is-active' : ''} onClick={() => setLauncherSection('home')}><HomeIcon size={17} />Home</button><button className={launcherSection === 'projects' ? 'is-active' : ''} onClick={() => setLauncherSection('projects')}><ProjectsIcon size={17} />Projects</button><button className={launcherSection === 'recent' ? 'is-active' : ''} onClick={() => setLauncherSection('recent')}><RecentProjectsIcon size={17} />Recent Projects</button><button onClick={() => void chooseProject('open')}><ImportProjectIcon size={17} />Import Project</button><button onClick={() => void openProjectDocument()}><ProjectDocumentIcon size={17} />Open .prismflow</button></nav>
        <small>Projects remain in folders you control.</small>
      </aside>
      <main className="launcher-main">
        {launcherSection === 'home' ? <><header><div><p>HOME</p><h1>Project Library</h1><span>Continue recent work or choose any project in your library.</span></div><button className="primary creation-action" onClick={() => void chooseProject('create')}><Plus size={16} />New Project</button></header>
        {recentProjects.length > 0 && <section className="launcher-project-section"><div className="launcher-section-title"><div><p>RECENT PROJECTS</p><h2>Continue Working</h2></div><button onClick={() => setLauncherSection('recent')}>View All</button></div><div className="project-library-grid home-recent-grid">{[...recentProjects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4).map((item) => <ProjectLibraryCard key={`recent-${item.id}`} item={item} icon={<ProjectFolderIcon size={34} />} onOpen={() => void openRecentProject(item.rootPath)} onRenamed={updateLauncherProject} onRequestForget={() => requestForgetProject(item)} onError={setProjectError} />)}</div></section>}
        <section className="launcher-project-section"><div className="launcher-section-title"><div><p>PROJECTS</p><h2>All Projects</h2></div><button onClick={() => setLauncherSection('projects')}>View All</button></div>{recentProjects.length ? <div className="project-library-grid">{recentProjects.map((item) => <ProjectLibraryCard key={`all-${item.id}`} item={item} icon={<ProjectFolderIcon size={34} />} onOpen={() => void openRecentProject(item.rootPath)} onRenamed={updateLauncherProject} onRequestForget={() => requestForgetProject(item)} onError={setProjectError} />)}</div> : <div className="project-library-empty"><ProjectsIcon size={28} /><h2>No Projects Yet</h2><p>Create a new project or import an existing project folder.</p><div><button className="primary creation-action" onClick={() => void chooseProject('create')}><Plus size={15} />New Project</button><button className="creation-action" onClick={() => void chooseProject('open')}><ImportProjectIcon size={15} />Import Project</button></div></div>}</section></> : <>
        <header><div><p>PROJECT MANAGER</p><h1>{launcherSection === 'recent' ? 'Recent Projects' : 'Projects'}</h1><span>{launcherSection === 'recent' ? 'Continue your latest local productions.' : 'Create, import, arrange, and reopen local productions.'}</span></div><button className="primary creation-action" onClick={() => void chooseProject('create')}><Plus size={16} />New Project</button></header>
        {launcherProjects.length ? <div className="project-library-grid">{launcherProjects.map((item) => <ProjectLibraryCard key={item.id} item={item} icon={<ProjectFolderIcon size={34} />} onOpen={() => void openRecentProject(item.rootPath)} onRenamed={updateLauncherProject} onRequestForget={() => requestForgetProject(item)} onError={setProjectError} />)}</div> : <div className="project-library-empty">{launcherSection === 'recent' ? <RecentProjectsIcon size={28} /> : <ProjectsIcon size={28} />}<h2>{launcherSection === 'recent' ? 'No Recent Projects' : 'No Projects Yet'}</h2><p>{launcherSection === 'recent' ? 'Projects you open will appear here.' : 'Create a working folder or import an existing Prism Foundry project.'}</p><div><button className="primary creation-action" onClick={() => void chooseProject('create')}><Plus size={15} />New Project</button><button className="creation-action" onClick={() => void chooseProject('open')}><ImportProjectIcon size={15} />Import Project</button></div></div>}</>}
        {projectError && <div className="project-gate-error">{projectError}</div>}
      </main>
      {deleteRequest && <div className="modal-backdrop delete-confirm-backdrop" onMouseDown={() => setDeleteRequest(null)}><section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="launcher-delete-confirm-title" onMouseDown={(event) => event.stopPropagation()}><header><span><Trash2 size={18} /></span><div><strong id="launcher-delete-confirm-title">{deleteRequest.title}</strong><small>Project Library Entry</small></div><button title="Cancel" aria-label="Cancel Delete" onClick={() => setDeleteRequest(null)}><X size={16} /></button></header><p>{deleteRequest.message}</p><label><input type="checkbox" checked={skipDeleteReminder} onChange={(event) => setSkipDeleteReminder(event.target.checked)} /><span>Don’t ask again for project removal this session</span></label><footer><button onClick={() => setDeleteRequest(null)}>Cancel</button><button className="is-danger" onClick={confirmDelete}>{deleteRequest.confirmLabel}</button></footer></section></div>}
    </div>
  )

  return (
    <ProviderAvailabilityContext.Provider value={{ mediaConnected: serviceConnections, promptConnected: {...serviceConnections,...Object.fromEntries(SUBSCRIPTION_PROVIDERS.filter(provider=>promptConnections[provider]?.mode==='subscription').map(provider=>[provider,Boolean(promptConnections[provider]?.ready)]))} }}>
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <div><strong>Prism Foundry</strong><small>Visual AI studio</small></div>
        </div>
        <div className="workflow-title">
          <button className="space-breadcrumb" onClick={() => { setHomeSection('spaces'); setAppView('space') }} data-tooltip={`Project: ${project.name}`} aria-label={`Open project ${project.name}`}><ProjectFolderIcon size={16} /><span>{project.name}</span></button>
        </div>
        <div className="top-actions">
          {appView === 'canvas' && <>
            <button
              className={`top-align-action magnetic-guides-toggle${magneticGuidesEnabled ? ' is-active' : ''}`}
              onClick={() => setMagneticGuidesEnabled((enabled) => !enabled)}
              data-tooltip="Magnetic Tools"
              aria-label="Toggle Magnetic Guides"
              aria-pressed={magneticGuidesEnabled}
            ><Magnet size={14} /></button>
            <span className="top-align-separator desktop-alignment-action" />
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 2} onClick={() => alignNodes(selectedAlignableNodeIds, 'middle')} data-tooltip="Center Y · Horizontal Row" aria-label="Center Y"><AlignCenterHorizontal size={14} /></button>
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 2} onClick={() => alignNodes(selectedAlignableNodeIds, 'center')} data-tooltip="Center X · Vertical Column" aria-label="Center X"><AlignCenterVertical size={14} /></button>
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 2} onClick={() => alignNodes(selectedAlignableNodeIds, 'top')} data-tooltip="Align Top" aria-label="Align Top"><AlignVerticalJustifyStart size={14} /></button>
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 2} onClick={() => alignNodes(selectedAlignableNodeIds, 'bottom')} data-tooltip="Align Bottom" aria-label="Align Bottom"><AlignVerticalJustifyEnd size={14} /></button>
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 2} onClick={() => alignNodes(selectedAlignableNodeIds, 'left')} data-tooltip="Align Left" aria-label="Align Left"><AlignHorizontalJustifyStart size={14} /></button>
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 2} onClick={() => alignNodes(selectedAlignableNodeIds, 'right')} data-tooltip="Align Right" aria-label="Align Right"><AlignHorizontalJustifyEnd size={14} /></button>
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 3} onClick={() => alignNodes(selectedAlignableNodeIds, 'gap-horizontal')} data-tooltip="Distribute Equal Horizontal Gaps" aria-label="Distribute Equal Horizontal Gaps"><AlignHorizontalSpaceBetween size={14} /></button>
            <button className="top-align-action desktop-alignment-action" disabled={selectedAlignableNodeIds.length < 3} onClick={() => alignNodes(selectedAlignableNodeIds, 'gap-vertical')} data-tooltip="Distribute Equal Vertical Gaps" aria-label="Distribute Equal Vertical Gaps"><AlignVerticalSpaceBetween size={14} /></button>
            <div className="compact-alignment" ref={compactAlignmentRef}>
              <button className={`top-align-action compact-alignment-launcher${compactAlignmentOpen ? ' is-active' : ''}`} onClick={() => setCompactAlignmentOpen((open) => !open)} data-tooltip="Alignment Tools" aria-label="Open Alignment Tools" aria-expanded={compactAlignmentOpen}><AlignCenterHorizontal size={14} /></button>
              {compactAlignmentOpen && <div className="compact-alignment-palette" role="toolbar" aria-label="Alignment Tools">
                <button disabled={selectedAlignableNodeIds.length < 2} onClick={() => { alignNodes(selectedAlignableNodeIds, 'middle'); setCompactAlignmentOpen(false) }} data-tooltip="Center Y · Horizontal Row" aria-label="Center Y"><AlignCenterHorizontal size={15} /></button>
                <button disabled={selectedAlignableNodeIds.length < 2} onClick={() => { alignNodes(selectedAlignableNodeIds, 'center'); setCompactAlignmentOpen(false) }} data-tooltip="Center X · Vertical Column" aria-label="Center X"><AlignCenterVertical size={15} /></button>
                <button disabled={selectedAlignableNodeIds.length < 2} onClick={() => { alignNodes(selectedAlignableNodeIds, 'top'); setCompactAlignmentOpen(false) }} data-tooltip="Align Top" aria-label="Align Top"><AlignVerticalJustifyStart size={15} /></button>
                <button disabled={selectedAlignableNodeIds.length < 2} onClick={() => { alignNodes(selectedAlignableNodeIds, 'bottom'); setCompactAlignmentOpen(false) }} data-tooltip="Align Bottom" aria-label="Align Bottom"><AlignVerticalJustifyEnd size={15} /></button>
                <button disabled={selectedAlignableNodeIds.length < 2} onClick={() => { alignNodes(selectedAlignableNodeIds, 'left'); setCompactAlignmentOpen(false) }} data-tooltip="Align Left" aria-label="Align Left"><AlignHorizontalJustifyStart size={15} /></button>
                <button disabled={selectedAlignableNodeIds.length < 2} onClick={() => { alignNodes(selectedAlignableNodeIds, 'right'); setCompactAlignmentOpen(false) }} data-tooltip="Align Right" aria-label="Align Right"><AlignHorizontalJustifyEnd size={15} /></button>
                <button disabled={selectedAlignableNodeIds.length < 3} onClick={() => { alignNodes(selectedAlignableNodeIds, 'gap-horizontal'); setCompactAlignmentOpen(false) }} data-tooltip="Distribute Equal Horizontal Gaps" aria-label="Distribute Equal Horizontal Gaps"><AlignHorizontalSpaceBetween size={15} /></button>
                <button disabled={selectedAlignableNodeIds.length < 3} onClick={() => { alignNodes(selectedAlignableNodeIds, 'gap-vertical'); setCompactAlignmentOpen(false) }} data-tooltip="Distribute Equal Vertical Gaps" aria-label="Distribute Equal Vertical Gaps"><AlignVerticalSpaceBetween size={15} /></button>
              </div>}
            </div>

            <CanvasManualSaveControl surface="canvas-editor" state={saveState} onSave={() => { void persistWorkflow() }} />
            <button className="responsive-action" onClick={openAssets} data-tooltip="Assets" aria-label="Assets"><AssetLibraryIcon size={15} /><span>Assets</span></button>
          </>}
          {appView === 'canvas' && <button className="delete-current-page" disabled={pages.length <= 1} onClick={() => { const page = pages.find((item) => item.id === activePageId); requestDelete({ category: 'page', title: 'Delete Page?', message: `Delete “${page?.name || 'this page'}” and every node on it? This cannot be undone after the project is saved.`, confirmLabel: 'Delete Page', action: () => deletePage(activePageId) }) }} title={pages.length <= 1 ? 'A Canvas Needs One Page' : 'Delete Current Page'} aria-label="Delete Current Page"><Trash2 size={15} /></button>}
          <button className="responsive-action connections-gear" onClick={() => setSettingsOpen(true)} data-tooltip={`Connections · ${connectedServiceCount}/${SERVICE_CATALOG.length}`} aria-label="Connections"><Settings size={15} /></button>
        </div>
      </header>

      <main className={`canvas-shell ${assetBrowserOpen && appView === 'canvas' ? 'has-assets-panel' : ''}`} onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop} onPointerMove={(event) => { if ((event.target as HTMLElement).closest('.react-flow')) lastCanvasPointer.current = { x: event.clientX, y: event.clientY } }}>
        <aside className="tool-rail">
          <button onClick={() => { setPalettePosition(null); setPaletteOpen(true) }} data-tooltip="Add Node [N]" aria-label="Add Node" aria-keyshortcuts="N"><Plus size={19} /></button>
          <span className="tool-rail-spacer" />
          <button className={activeTool === 'select' ? 'is-active' : ''} onClick={() => setActiveTool('select')} data-tooltip="Select [V]" aria-label="Select" aria-keyshortcuts="V"><MousePointer2 size={18} /></button>
          <button className={activeTool === 'hand' || spacePanning ? 'is-active' : ''} onClick={() => setActiveTool('hand')} data-tooltip="Hand" aria-label="Hand"><Hand size={18} /></button>
          <span className="tool-rail-spacer" />
          <button className={activeTool === 'cut' ? 'is-active' : ''} onClick={() => setActiveTool('cut')} data-tooltip="Cut Connection [X]" aria-label="Cut Connection" aria-keyshortcuts="X"><Scissors size={17} /></button>
          <button className={activeTool === 'connection' ? 'is-active' : ''} onClick={() => setActiveTool('connection')} data-tooltip="Connect [L]" aria-label="Connect" aria-keyshortcuts="L"><Link2 size={17} /></button>
          <button className={activeTool === 'frame' ? 'is-active' : ''} onClick={() => setActiveTool('frame')} data-tooltip="Frame [F]" aria-label="Frame" aria-keyshortcuts="F"><Frame size={17} /></button>
          <span className="tool-rail-spacer" />
          <button onClick={undoCanvas} disabled={!canUndo} data-tooltip="Undo [⌘Z]" aria-label="Undo" aria-keyshortcuts="Meta+Z"><Undo2 size={18} /></button>
          <button onClick={redoCanvas} disabled={!canRedo} data-tooltip="Redo [⇧⌘Z]" aria-label="Redo" aria-keyshortcuts="Meta+Shift+Z"><Redo2 size={18} /></button>
          <span className="tool-rail-spacer" />
          <button onClick={() => setSettingsOpen(true)} data-tooltip="Connections & Settings [⌘,]" aria-label="Connections and Settings" aria-keyshortcuts="Meta+,"><Settings size={18} /></button>
        </aside>

        <NodeRuntimeContext.Provider value={runtime}>
          <PortRouteContext.Provider value={quickConnect}>
          <ReactFlow
            onPointerDownCapture={() => { keyboardSelectionScope.current = 'canvas' }}
            nodes={renderedNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodeChanges}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
            onPaneClick={handlePaneClick}
            onPaneContextMenu={handlePaneContextMenu}
            onNodeContextMenu={handleNodeContextMenu}
            onNodeDoubleClick={(event, node) => {
              if ((event.target as HTMLElement).closest('input, textarea, select, button, [contenteditable="true"], .node-asset-tag, .node-hover-toolbar')) return
              focusNode(node.id)
            }}
            onMoveEnd={(event, viewport) => {
              const previous = lastObservedViewport.current
              lastObservedViewport.current = viewport
              const changed = previous && (Math.abs(previous.x - viewport.x) > 0.01 || Math.abs(previous.y - viewport.y) > 0.01 || Math.abs(previous.zoom - viewport.zoom) > 0.001)
              if (!loaded.current || !event || !changed || !userMutationArmed.current) return
              mutationVersion.current += 1
              saveLifecycle.current?.markDirty()
            }}
            onNodeDragStart={(event, node) => {
              if (dragReleaseFrame.current !== null) {
                cancelAnimationFrame(dragReleaseFrame.current)
                dragReleaseFrame.current = null
              }
              if (node.data.locked) {
                dragConstraint.current = null
                setMagneticGuides([])
                return
              }
              shiftPressed.current = 'shiftKey' in event ? event.shiftKey : false
              dragConstraint.current = { nodeId: node.id, start: { ...node.position }, axis: null }
            }}
            onNodeDrag={(event) => { shiftPressed.current = 'shiftKey' in event ? event.shiftKey : false }}
            onNodeDragStop={finishMagneticDrag}
            onSelectionContextMenu={handleSelectionContextMenu}
            onEdgeClick={handleEdgeClick}
            onEdgeMouseEnter={showEdgeActions}
            onEdgeMouseMove={moveEdgeActions}
            onEdgeMouseLeave={scheduleEdgeActionsClose}
            onEdgeContextMenu={handleEdgeContextMenu}
            fitViewOptions={{ padding: 0.25 }}
            minZoom={CANVAS_MIN_ZOOM}
            maxZoom={CANVAS_MAX_ZOOM}
            zoomOnScroll={false}
            zoomOnPinch={false}
            preventScrolling={false}
            onWheelCapture={handleCanvasWheel}
            defaultViewport={workflow.viewport}
            defaultEdgeOptions={{ interactionWidth: 28 }}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={null}
            panActivationKeyCode="Space"
            nodesDraggable={activeTool === 'select' && !spacePanning}
            connectOnClick={false}
            connectionDragThreshold={3}
            elementsSelectable={activeTool !== 'hand'}
            panOnDrag={canvasPanButtons(activeTool, spacePanning)}
            selectionOnDrag={activeTool === 'select' && !spacePanning}
            selectionMode={SelectionMode.Partial}
            className={`studio-flow tool-${activeTool}${spacePanning ? ' is-space-panning' : ''}${middlePanning ? ' is-middle-panning' : ''}`}
            onMouseDownCapture={(event) => {
              if (!isMiddleMouseButton(event.button)) return
              if (isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement)) {
                event.preventDefault()
                event.stopPropagation()
                return
              }
              event.preventDefault()
              document.documentElement.classList.add('is-canvas-middle-panning')
              setMiddlePanning(true)
            }}
            onAuxClick={(event) => {
              if (isMiddleMouseButton(event.button)) event.preventDefault()
            }}
            onlyRenderVisibleElements
          >
            <ViewportPortal>
              {magneticGuides.map((guide, index) => {
                const guideZoom = Math.max(0.1, getViewport().zoom)
                const arrowTipProjection = EQUAL_GAP_ARROW_SIZE_PX / Math.SQRT2
                const endpointInset = guide.kind === 'equal-gap' ? (EQUAL_GAP_ARROW_EDGE_GAP_PX + arrowTipProjection) / guideZoom : 0
                const guideLength = Math.max(1, guide.to - guide.from - endpointInset * 2)
                const guideVariables = {
                  '--magnetic-guide-stroke': `${0.5 / guideZoom}px`,
                  '--magnetic-guide-equal-stroke': `${0.5 / guideZoom}px`,
                  '--magnetic-guide-dash': `${4 / guideZoom}px`,
                  '--magnetic-guide-gap': `${6 / guideZoom}px`,
                  '--magnetic-guide-arrow-stroke': `${0.5 / guideZoom}px`,
                  '--magnetic-guide-arrow-size': `${EQUAL_GAP_ARROW_SIZE_PX / guideZoom}px`,
                } as CSSProperties
                return (
                  <div
                    key={`${guide.orientation}-${guide.kind}-${index}`}
                    className={`magnetic-guide is-${guide.orientation} is-${guide.kind}`}
                    style={guide.orientation === 'vertical'
                      ? { ...guideVariables, left: guide.position, top: guide.from + endpointInset, height: guideLength }
                      : { ...guideVariables, left: guide.from + endpointInset, top: guide.position, width: guideLength }}
                  >{guide.label && <span
                    className={guide.labelPlacement ? `is-${guide.labelPlacement}` : undefined}
                    style={guide.labelOffset == null ? undefined : { '--magnetic-guide-label-offset': `${guide.labelOffset}px` } as CSSProperties}
                  >{guide.label}</span>}</div>
                )
              })}
            </ViewportPortal>
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.1} color="#393547" />
            {nodes.length > 0 && <CanvasNavigationControls
              onZoomIn={() => { mutationVersion.current += 1; saveLifecycle.current?.markDirty(); void zoomIn({ duration: 180 }) }}
              onZoomOut={() => { mutationVersion.current += 1; saveLifecycle.current?.markDirty(); void zoomOut({ duration: 180 }) }}
              onFitView={() => { mutationVersion.current += 1; saveLifecycle.current?.markDirty(); void fitView({ duration: 300, padding: 0.22 }) }}
            />}
            {nodes.length > 0 && nodes.length < 80 && <RoundedCanvasMiniMap />}
          </ReactFlow>
          </PortRouteContext.Provider>
        </NodeRuntimeContext.Provider>

        {connectionNotice && <div className="connection-notice-toast" role="status" aria-live="polite" aria-atomic="true"><Link2 size={15} /><span>{connectionNotice}</span><button aria-label="Dismiss Connection Notice" onClick={() => setConnectionNotice('')}><X size={13} /></button></div>}
        {connectionErrorNotice && <div className="connection-error-toast" role="alert"><Link2 size={15} /><span>{connectionErrorNotice}</span><button aria-label="Dismiss Connection Error" onClick={() => setConnectionErrorNotice('')}><X size={13} /></button></div>}

        {nodes.length === 0 && (
          <section className="empty-state">
            <span className="empty-orbit"><Sparkles size={28} /></span>
            <p className="eyebrow">New Canvas</p>
            <h1>What do you want to create?</h1>
            <p>Start with generated media or build a reusable project asset.</p>
            <div className="starter-cards">
              <button className="starter-primary" onClick={() => setStarterCreateKind('image')}><ImageIcon size={19} /><span>Image</span><small>Generate, edit, or combine references</small><kbd>1</kbd></button>
              <button className="starter-primary" onClick={() => setStarterCreateKind('video')}><Video size={19} /><span>Video</span><small>Text, image, or start-and-end frames</small><kbd>2</kbd></button>
              <button onClick={() => setSemanticCreateKind('character')}><UserRound size={18} /><span>Character</span><small>Create a reusable identity</small><kbd>3</kbd></button>
              <button onClick={() => setSemanticCreateKind('location')}><Mountain size={18} /><span>Location</span><small>Create a reusable environment</small><kbd>4</kbd></button>
              <button onClick={() => setSemanticCreateKind('wardrobe')}><Shirt size={18} /><span>Wardrobe</span><small>Create reusable wardrobe</small></button>
              <button onClick={() => setSemanticCreateKind('element')}><Box size={18} /><span>Element</span><small>Create 2–4 consistent angles</small><kbd>5</kbd></button>
              <button onClick={() => addNode('storyboard')}><Clapperboard size={18} /><span>Storyboard</span><small>Plan shots and timing</small><kbd>6</kbd></button>
            </div>
            <button className="primary-action" onClick={() => setPaletteOpen(true)}><Plus size={16} /> Add Node <kbd>N</kbd></button>
          </section>
        )}

        {quickConnect && (
          <section
            className={`quick-connect-menu ${quickConnect.direction === 'backward' ? 'is-backward' : ''}`}
            style={{
              left: quickConnect.direction === 'backward'
                ? Math.max(12, Math.min(quickConnect.clientX - 326, window.innerWidth - 326))
                : Math.max(76, Math.min(quickConnect.clientX, window.innerWidth - 326)),
              top: Math.max(76, Math.min(quickConnect.clientY - 64, window.innerHeight - 410)),
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="quick-search">
              <Search size={17} />
              <input autoFocus value={quickQuery} onChange={(event) => setQuickQuery(event.target.value)} placeholder={quickConnect.direction === 'backward' ? 'Search input source…' : 'Search next node…'} />
              <button title="Close Node Search" aria-label="Close Node Search" onClick={() => setQuickConnect(null)}><X size={14} /></button>
            </div>
            <div className="quick-list">
              {quickItems.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.kind} onClick={() => completeQuickConnect(item.kind)}>
                    <span><Icon size={16} /></span>
                    <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                    <Plus size={14} />
                  </button>
                )
              })}
            </div>
            <footer><span>{quickConnect.direction === 'backward' ? 'Add and connect input source' : 'Drop-to-create connection'}</span><kbd>esc</kbd></footer>
          </section>
        )}

        {portInspector && (
          <section className="port-inspector" style={{ left: Math.min(portInspector.clientX + 15, window.innerWidth - 295), top: Math.min(portInspector.clientY - 55, window.innerHeight - 300) }}>
            <header><span className="port-kind-icon"><ArrowUpRight size={15} /></span><div><strong>{portInspector.label}</strong><small>{inspectedConnections.length} connection{inspectedConnections.length === 1 ? '' : 's'}</small></div><button title="Close Connections" aria-label="Close Connections" onClick={() => setPortInspector(null)}><X size={14} /></button></header>
            <div className="port-inspector-body">
              {inspectedConnections.length === 0 ? <><Link2 size={28} /><strong>No connections</strong></> : inspectedConnections.map((edge) => <div className="connected-node" key={edge.id}><Link2 size={13} /><span>{nodes.find((node) => node.id === edge.target)?.data.title || 'Connected node'}</span></div>)}
              <button className="port-add" onClick={() => openQuickConnect(portInspector.nodeId, portInspector.clientX + 18, portInspector.clientY + 80, portInspector.handleId)}>Add</button>
            </div>
          </section>
        )}

        {edgeMenu && (
          <section className="edge-actions" style={{ left: edgeMenu.clientX - 42, top: edgeMenu.clientY - 22 }} onMouseEnter={keepEdgeActionsOpen} onMouseLeave={scheduleEdgeActionsClose}>
            <button data-tooltip="Add Node" aria-label="Add Node to Connection" onClick={() => openQuickConnect(edgeMenu.edge.source, edgeMenu.clientX, edgeMenu.clientY + 46, edgeMenu.edge.sourceHandle || 'media-out', edgeMenu.edge)}><Plus size={15} /></button>
            <button data-tooltip="Cut Connection" aria-label="Cut Connection" onClick={() => { setEdges((current) => current.filter((edge) => edge.id !== edgeMenu.edge.id)); setEdgeMenu(null) }}><Scissors size={15} /></button>
          </section>
        )}

        {contextMenu && (
          <section
            className="canvas-context-menu"
            style={{
              left: Math.max(72, Math.min(contextMenu.clientX, window.innerWidth - 258)),
              top: Math.max(70, Math.min(contextMenu.clientY, window.innerHeight - 430)),
            }}
            onContextMenu={(event) => event.preventDefault()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <span>{contextMenu.kind === 'canvas' ? 'CANVAS' : contextMenu.kind === 'edge' ? 'CONNECTION' : contextMenu.kind === 'asset' ? 'ASSET' : contextMenu.kind === 'selection' ? `${contextMenu.nodeIds.length} NODES` : contextNode?.data.kind === 'frame' ? 'FRAME' : 'NODE'}</span>
              <kbd>esc</kbd>
            </header>

            {contextMenu.kind === 'canvas' && <>
              <button onClick={() => { setPalettePosition(contextMenu.position); setPaletteOpen(true); setContextMenu(null) }}><Plus size={14} /><span>Add node</span><kbd>⌘K</kbd></button>
              <button onClick={() => { void createUploadAt(contextMenu.position); setContextMenu(null) }}><Upload size={14} /><span>Upload asset</span></button>
              <button onClick={() => { createNode('frame', contextMenu.position); setContextMenu(null) }}><Frame size={14} /><span>Create frame</span></button>
              <div className="context-divider" />
              <button disabled={!canvasClipboard.current?.nodes.length} onClick={() => { pasteNodes(contextMenu.position); setContextMenu(null) }}><Copy size={14} /><span>Paste</span><kbd>⌘V</kbd></button>
              <button onClick={() => { setNodes((current) => current.map((node) => ({ ...node, selected: true }))); setContextMenu(null) }}><Check size={14} /><span>Select all</span><kbd>⌘A</kbd></button>
              <button onClick={() => { void fitView({ duration: 350, padding: 0.22 }); setContextMenu(null) }}><Crosshair size={14} /><span>Fit everything</span></button>
              {missingAssetIds.length > 0 && <><div className="context-divider" /><button onClick={() => { void relinkAllMissing(); setContextMenu(null) }}><FolderOpen size={14} /><span>Relink missing assets</span><em>{missingAssetIds.length}</em></button></>}
            </>}

            {contextMenu.kind === 'node' && contextNode && <>
              {isRunnableNodeKind(contextNode.data.kind) && <button className="context-primary" onClick={() => { void runNode(contextNode.id); setContextMenu(null) }}><Play size={14} /><span>Run</span><kbd>⌘↵</kbd></button>}
              <button onClick={() => { runFromNode(contextNode.id); setContextMenu(null) }}><Play size={14} /><span>Run from here</span></button>
              <button onClick={() => { setInspectorNodeId(contextNode.id); setContextMenu(null) }}><PencilLine size={14} /><span>Rename and settings</span></button>
              <button onClick={() => { resetNodeSettings(contextNode.id); setContextMenu(null) }}><RotateCcw size={14} /><span>Reset Node</span></button>
              <div className="context-divider" />
              <button onClick={() => { duplicateNode(contextNode.id); setContextMenu(null) }}><Copy size={14} /><span>Duplicate</span><kbd>⌘D</kbd></button>
              <button onClick={() => { copyNodes([contextNode.id]); setContextMenu(null) }}><Copy size={14} /><span>Copy</span><kbd>⌘C</kbd></button>
              <button disabled={!contextNode.data.groupId && contextNodeIds.length < 2} onClick={() => { toggleSelectedGroup(contextNode.data.groupId ? [contextNode.id] : contextNodeIds); setContextMenu(null) }}>{contextNode.data.groupId ? <Ungroup size={14} /> : <Group size={14} />}<span>{contextNode.data.groupId ? 'Ungroup' : 'Group selected nodes'}</span><kbd>⌘G</kbd></button>
              {!['frame', 'comment', 'sticky-note', 'sticker', 'drawing', 'list', 'router'].includes(contextNode.data.kind) && <button onClick={() => { sendNodeToList(contextNode.id); setContextMenu(null) }}><ListPlus size={14} /><span>Send output to List</span></button>}
              {contextAsset && <button onClick={() => { void relinkAsset(contextAsset.id); setContextMenu(null) }}><FolderOpen size={14} /><span>{missingAssetIds.includes(contextAsset.id) ? 'Find / relink missing asset' : 'Replace linked asset'}</span></button>}
              {contextAsset && <button onClick={() => { setAppView('space'); setRenamingAssetId(contextAsset.id); setRenameDraft(mediaRenameStem(assetDisplayName(contextAsset))); setContextMenu(null) }}><PencilLine size={14} /><span>Rename linked asset</span></button>}
              {missingAssetIds.length > 1 && <button onClick={() => { void relinkAllMissing(); setContextMenu(null) }}><Search size={14} /><span>Relink all missing assets</span><em>{missingAssetIds.length}</em></button>}
              {['upload', 'output', 'gallery', 'character', 'wardrobe', 'element', 'location', 'style-reference'].includes(contextNode.data.kind) && <div className="context-role-block"><small>USE OUTPUT AS</small><div>{(['character', 'wardrobe', 'element', 'location', 'style-reference'] as const).map((role) => <button key={role} title={role} onClick={() => { void setNodeRole(contextNode.id, role); setContextMenu(null) }}>{role === 'style-reference' ? 'Style' : role === 'character' ? 'Character' : role === 'wardrobe' ? 'Wardrobe' : role[0].toUpperCase()}</button>)}</div></div>}
              <div className="context-divider" />
              <button onClick={() => { toggleNodesLocked([contextNode.id]); setContextMenu(null) }}><Lock size={14} /><span>{contextNode.data.locked ? 'Unlock' : 'Lock'}</span></button>
              <button onClick={() => { focusNode(contextNode.id); setContextMenu(null) }}><Crosshair size={14} /><span>Focus node</span><kbd>⇧F</kbd></button>
              <button className="is-danger" onClick={() => { deleteNode(contextNode.id); setContextMenu(null) }}><Trash2 size={14} /><span>Delete</span><kbd>⌫</kbd></button>
            </>}

            {contextMenu.kind === 'selection' && <>
              {contextHasRunnable && <button className="context-primary" onClick={() => { contextMenu.nodeIds.forEach((id) => { const node = nodes.find((candidate) => candidate.id === id); if (node && isRunnableNodeKind(node.data.kind)) void runNode(id) }); setContextMenu(null) }}><Play size={14} /><span>Run selection</span></button>}
              <button onClick={() => { toggleSelectedGroup(contextMenu.nodeIds); setContextMenu(null) }}>{contextMenu.nodeIds.every((id) => nodes.find((node) => node.id === id)?.data.groupId && nodes.find((node) => node.id === id)?.data.groupId === nodes.find((node) => node.id === contextMenu.nodeIds[0])?.data.groupId) ? <Ungroup size={14} /> : <Group size={14} />}<span>{contextMenu.nodeIds.every((id) => nodes.find((node) => node.id === id)?.data.groupId && nodes.find((node) => node.id === id)?.data.groupId === nodes.find((node) => node.id === contextMenu.nodeIds[0])?.data.groupId) ? 'Ungroup selection' : 'Group selection'}</span><kbd>⌘G</kbd></button>
              <button onClick={() => { frameNodes(contextMenu.nodeIds); setContextMenu(null) }}><Frame size={14} /><span>Create frame</span></button>
              <button onClick={() => { copyNodes(contextMenu.nodeIds); setContextMenu(null) }}><Copy size={14} /><span>Copy selection</span><kbd>⌘C</kbd></button>
              <div className="context-divider" />
              <button onClick={() => { alignNodes(contextMenu.nodeIds, 'left'); setContextMenu(null) }}><PanelLeftClose size={14} /><span>Align left</span></button>
              <button disabled={contextMenu.nodeIds.length < 3} onClick={() => { alignNodes(contextMenu.nodeIds, 'gap-horizontal'); setContextMenu(null) }}><GalleryHorizontalEnd size={14} /><span>Distribute horizontally</span></button>
              <button disabled={contextMenu.nodeIds.length < 3} onClick={() => { alignNodes(contextMenu.nodeIds, 'gap-vertical'); setContextMenu(null) }}><AlignVerticalSpaceBetween size={14} /><span>Distribute vertically</span></button>
              <button onClick={() => { toggleNodesLocked(contextMenu.nodeIds); setContextMenu(null) }}><Lock size={14} /><span>Lock / unlock selection</span></button>
              <button className="is-danger" onClick={() => { deleteNodes(contextMenu.nodeIds); setContextMenu(null) }}><Trash2 size={14} /><span>Delete selection</span><kbd>⌫</kbd></button>
            </>}

            {contextMenu.kind === 'edge' && <>
              <button className="context-primary" onClick={() => { openQuickConnect(contextMenu.edge.source, contextMenu.clientX, contextMenu.clientY + 36, contextMenu.edge.sourceHandle || 'media-out', contextMenu.edge); setContextMenu(null) }}><Plus size={14} /><span>Insert node</span></button>
              <button onClick={() => { focusNode(contextMenu.edge.source); setContextMenu(null) }}><Crosshair size={14} /><span>Inspect source</span></button>
              <button onClick={() => { focusNode(contextMenu.edge.target); setContextMenu(null) }}><Crosshair size={14} /><span>Inspect destination</span></button>
              <div className="context-divider" />
              <button className="is-danger" onClick={() => { setEdges((current) => current.filter((edge) => edge.id !== contextMenu.edge.id)); setContextMenu(null) }}><Scissors size={14} /><span>Cut connection</span><kbd>K</kbd></button>
            </>}

            {contextMenu.kind === 'asset' && contextAsset && <>
              <div className="context-asset-name"><strong>{assetDisplayName(contextAsset)}</strong><small>{missingAssetIds.includes(contextAsset.id) ? 'File is missing' : contextAsset.category || 'Media asset'}</small></div>
              <button className={missingAssetIds.includes(contextAsset.id) ? 'context-primary' : ''} onClick={() => { void relinkAsset(contextAsset.id); setContextMenu(null) }}><FolderOpen size={14} /><span>{missingAssetIds.includes(contextAsset.id) ? 'Find / relink asset' : 'Replace linked asset'}</span></button>
              {/^(image|video)\//.test(contextAsset.mimeType) && <button onClick={() => void openPortraitDialog(contextAsset)}><Link2 size={14} /><span>Link BytePlus Asset</span></button>}
              {missingAssetIds.length > 0 && <button onClick={() => { void relinkAllMissing(); setContextMenu(null) }}><Search size={14} /><span>Search folder for all missing</span><em>{missingAssetIds.length}</em></button>}
            </>}
          </section>
        )}

        {styleChooserNodeId && (
          <section className="style-source-popover" style={{ left: styleChooserPosition.x, top: styleChooserPosition.y }} onMouseDown={(event) => event.stopPropagation()}>
            <header
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest('button')) return
                const rect = event.currentTarget.parentElement?.getBoundingClientRect()
                if (!rect) return
                styleChooserDrag.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                const drag = styleChooserDrag.current
                if (!drag || drag.pointerId !== event.pointerId) return
                setStyleChooserPosition({ x: Math.max(8, Math.min(window.innerWidth - 318, event.clientX - drag.offsetX)), y: Math.max(72, Math.min(window.innerHeight - 64, event.clientY - drag.offsetY)) })
              }}
              onPointerUp={(event) => {
                if (styleChooserDrag.current?.pointerId !== event.pointerId) return
                styleChooserDrag.current = null
                event.currentTarget.releasePointerCapture(event.pointerId)
              }}
            ><span><Palette size={14} /></span><div><strong>Style Asset</strong><small>Look and feel connected to this generator</small></div><button aria-label="Close Style Asset" onClick={() => setStyleChooserNodeId(null)}><X size={14} /></button></header>
            <div className="style-source-library-head"><strong>Style Library</strong><small>Swipe to choose</small></div>
            <div ref={styleChooserRailRef} className="style-source-library nowheel" aria-label="Style Library" onWheel={(event) => { event.stopPropagation(); event.currentTarget.scrollBy({ left: Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY, behavior: 'smooth' }) }} onPointerDown={(event) => { styleChooserRailDidDrag.current = false; styleChooserRailDrag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft } }} onPointerMove={(event) => { const drag = styleChooserRailDrag.current; if (!drag || drag.pointerId !== event.pointerId) return; const distance = event.clientX - drag.startX; if (Math.abs(distance) > 3) { styleChooserRailDidDrag.current = true; styleChooserRailLastDragAt.current = Date.now(); if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId) }; event.currentTarget.scrollLeft = drag.scrollLeft - distance }} onPointerUp={(event) => { styleChooserRailDrag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={() => { styleChooserRailDrag.current = null }}>
              {availableStyleNodes.map((node) => {
                const thumbnail = node.data.referenceAssets?.[0]?.url || node.data.assetUrl || node.data.outputUrl
                return <button key={node.id} title={`Connect ${node.data.title}`} onClick={() => { if (Date.now() - styleChooserRailLastDragAt.current < 250) return; connectStyleNode(styleChooserNodeId, node.id) }}>{thumbnail ? <img src={thumbnail} alt="" loading="lazy" decoding="async" /> : <span><Palette size={17} /></span>}<strong>{node.data.title || 'Untitled Style'}</strong><small>{node.data.referenceTag || node.data.stylePrompt || node.data.prompt || 'Prompt Style'}</small></button>
              })}
              {STYLE_PRESETS.map((preset) => <button key={preset.id} title={`Use ${preset.title}`} onClick={() => { if (Date.now() - styleChooserRailLastDragAt.current < 250) return; applyPresetStyleToGenerator(styleChooserNodeId, preset) }}><span style={{ backgroundImage: `url(${preset.thumbnail})`, backgroundPosition: preset.focalPosition, backgroundSize: 'cover' }} /><strong>{preset.title}</strong><small>Built-in Style</small></button>)}
            </div>
            <button className="style-source-create" onClick={() => openCustomStyleForGenerator(styleChooserNodeId)}><Plus size={13} />Create Style</button>
          </section>
        )}

        {portraitDialog && <BytePlusPortraitDialog key={`${portraitDialog.asset.id}:${portraitDialog.loading ? 'loading' : 'ready'}`} {...portraitDialog} onAssetChange={asset => void openPortraitDialog(asset, portraitDialog.assets)} onLink={request => void savePortraitLink(request)} onRevoke={() => void savePortraitLink()} onClose={closePortraitDialog} />}

        {assetIntake && (
          <div className="modal-backdrop asset-intake-backdrop" onMouseDown={() => setAssetIntake(null)}>
            <section className="asset-intake-modal" onMouseDown={(event) => event.stopPropagation()}>
              <header><span>{assetIntake.kind === 'character' ? <UserRound size={17} /> : assetIntake.kind === 'element' ? <Box size={17} /> : <Mountain size={17} />}</span><div><strong>Prepare {assetIntake.kind[0].toUpperCase() + assetIntake.kind.slice(1)}</strong><small>Only the details generators need</small></div><button title="Close Asset Setup" aria-label="Close Asset Setup" onClick={() => setAssetIntake(null)}><X size={15} /></button></header>
              <div className="asset-intake-preview">{assetIntake.asset.mimeType.startsWith('image/') ? <img src={assetIntake.asset.url} alt={assetIntake.asset.name} /> : <ImageIcon size={24} />}<span>{assetIntake.asset.name}</span></div>
              <label><span>Name</span><input autoFocus value={assetIntake.name} onChange={(event) => setAssetIntake((current) => current ? { ...current, name: event.target.value } : current)} /></label>
              {assetIntake.kind === 'character' && <><label><span>Reference View</span><SimpleMenuSelect ariaLabel="Reference View" value={assetIntake.characterView || 'front'} options={[['front', 'Face'], ['three-quarter', 'Right Three-Quarter'], ['profile', 'Profile'], ['full-body', 'Full Body'], ['back', 'Back'], ['smile', 'Smile'], ['left-three-quarter', 'Left Three-Quarter'], ['side-body', 'Side Body'], ['full-body-back', 'Back Body']].map(([value, label]) => ({ value, label }))} onChange={(value) => setAssetIntake((current) => current ? { ...current, characterView: value as NonNullable<ImportedAsset['metadata']>['characterView'] } : current)} /></label><label><span>Identity Description</span><input value={assetIntake.first} placeholder="Distinct appearance or identity cue" onChange={(event) => setAssetIntake((current) => current ? { ...current, first: event.target.value } : current)} /></label><label><span>Default Wardrobe</span><input value={assetIntake.second} placeholder="Default outfit" onChange={(event) => setAssetIntake((current) => current ? { ...current, second: event.target.value } : current)} /></label></>}
              {assetIntake.kind === 'element' && <><label><span>Type</span><input value={assetIntake.first} placeholder="Prop, product, vehicle…" onChange={(event) => setAssetIntake((current) => current ? { ...current, first: event.target.value } : current)} /></label><label><span>Variant</span><input value={assetIntake.second} placeholder="Optional version or color" onChange={(event) => setAssetIntake((current) => current ? { ...current, second: event.target.value } : current)} /></label></>}
              {assetIntake.kind === 'location' && <div className="asset-intake-grid"><label><span>Setting</span><SimpleMenuSelect ariaLabel="Setting" value={assetIntake.first} options={[{ value: 'interior', label: 'Interior' }, { value: 'exterior', label: 'Exterior' }]} onChange={(value) => setAssetIntake((current) => current ? { ...current, first: value } : current)} /></label><label><span>Time</span><SimpleMenuSelect ariaLabel="Time" value={assetIntake.second} options={[{ value: 'day', label: 'Day' }, { value: 'night', label: 'Night' }]} onChange={(value) => setAssetIntake((current) => current ? { ...current, second: value } : current)} /></label></div>}
              <footer><button onClick={() => setAssetIntake(null)}>Cancel</button><button className="primary" disabled={!assetIntake.name.trim()} onClick={() => void saveAssetIntake()}>Save Asset</button></footer>
            </section>
          </div>
        )}

        {semanticCreateKind && (
          <div className="modal-backdrop semantic-create-backdrop" onMouseDown={() => setSemanticCreateKind(null)}>
            <section className="semantic-create-modal" onMouseDown={(event) => event.stopPropagation()}>
              <header><span>{semanticCreateKind === 'character' ? <UserRound size={18} /> : semanticCreateKind === 'location' ? <Mountain size={18} /> : semanticCreateKind === 'wardrobe' ? <Shirt size={18} /> : <Box size={18} />}</span><div><strong>Create {semanticCreateKind[0].toUpperCase() + semanticCreateKind.slice(1)}</strong><small>Choose the starting material</small></div><button title="Close Creation Options" aria-label="Close Creation Options" onClick={() => setSemanticCreateKind(null)}><X size={15} /></button></header>
              <div className="semantic-create-options">
                <button onClick={() => createSemanticTemplate('prompt')}><MessageSquareText size={22} /><span><strong>Create Using Prompt</strong><small>Prompt → {semanticCreateKind}</small></span><Plus size={15} /></button>
                <button onClick={() => createSemanticTemplate('reference')}><ImageIcon size={22} /><span><strong>Create Using Reference</strong><small>Image Reference → {semanticCreateKind}</small></span><Plus size={15} /></button>
              </div>
              {semanticCreateKind === 'element' && <p>Element uses four named slots: Front, Three-Quarter, Side, and Back. Add at least one; Complete With AI fills only the missing views.</p>}
            </section>
          </div>
        )}

        {starterCreateKind && (
          <div className="modal-backdrop asset-intake-backdrop" onMouseDown={() => setStarterCreateKind(null)}>
            <section className="semantic-create-modal starter-route-modal" onMouseDown={(event) => event.stopPropagation()}>
              <header><span>{starterCreateKind === 'image' ? <ImageIcon size={18} /> : <Video size={18} />}</span><div><strong>Create {starterCreateKind === 'image' ? 'Image' : 'Video'}</strong><small>Choose how this workflow begins</small></div><button title="Close Creation Options" aria-label="Close Creation Options" onClick={() => setStarterCreateKind(null)}><X size={15} /></button></header>
              <div className="semantic-create-options">
                <button onClick={() => createStarterRoute('prompt')}><MessageSquareText size={22} /><span><strong>Create From Prompt</strong><small>Prompt → {starterCreateKind === 'image' ? 'Image Generator' : 'Video Generator'}</small></span><Plus size={15} /></button>
                <button onClick={() => createStarterRoute('reference')}><ImageIcon size={22} /><span><strong>{starterCreateKind === 'image' ? 'Edit a Reference' : 'Animate an Image'}</strong><small>Image Reference → {starterCreateKind === 'image' ? 'Image Generator' : 'Video Generator'}</small></span><Plus size={15} /></button>
                <button onClick={() => createStarterRoute(starterCreateKind === 'image' ? 'references' : 'start-end')}><GalleryHorizontalEnd size={22} /><span><strong>{starterCreateKind === 'image' ? 'Combine References' : 'Start & End Frames'}</strong><small>{starterCreateKind === 'image' ? 'Multiple References → Image Generator' : 'Start + End → Video Generator'}</small></span><Plus size={15} /></button>
              </div>
              <p>Only compatible model inputs will be available in the generated node.</p>
            </section>
          </div>
        )}

        {appView === 'canvas' && (
          <nav className="page-strip" aria-label="Canvas pages">
            <button className="pages-home" onClick={() => setAppView('space')} title="Canvas Overview"><CanvasIcon size={14} /></button>
            {pages.map((page) => (
              <div ref={(element) => { if (element) pageTabRefs.current.set(page.id, element); else pageTabRefs.current.delete(page.id) }} draggable={renamingTabPageId !== page.id} key={page.id} className={`page-tab ${draggedTabPageId === page.id ? 'is-dragging' : ''}`} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', page.id); pageTabOrderBeforeDrag.current = pages.map((candidate) => candidate.id); pageTabDropCommitted.current = false; pageTabSwapLock.current = ''; setDraggedTabPageId(page.id) }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; previewTabPageReorder(page.id, event.clientX, event.currentTarget) }} onDrop={(event) => { event.preventDefault(); finishTabPageReorder() }} onDragEnd={cancelTabPageReorder}>
              {renamingTabPageId === page.id ? <input autoFocus value={tabPageNameDraft} aria-label={`Rename ${page.name}`} onChange={(event) => setTabPageNameDraft(event.target.value)} onBlur={() => commitTabPageRename(page.id)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitTabPageRename(page.id) } else if (event.key === 'Escape') { setRenamingTabPageId(null); setTabPageNameDraft('') } }} /> : <><button className={page.id === activePageId ? 'is-active' : ''} onClick={() => switchPage(page.id)} onDoubleClick={(event) => { event.preventDefault(); setRenamingTabPageId(page.id); setTabPageNameDraft(page.name) }} title="Double-click to rename; drag to reorder">{page.name}</button><button draggable={false} className="page-tab-delete" disabled={pages.length <= 1} title={pages.length <= 1 ? 'A Canvas Needs One Page' : `Delete ${page.name}`} aria-label={`Delete ${page.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); requestDelete({ category: 'page', title: 'Delete Page?', message: `Delete “${page.name}” and every node on it? This cannot be undone after the project is saved.`, confirmLabel: 'Delete Page', action: () => deletePage(page.id) }) }}><X size={9} /></button></>}
              </div>
            ))}
            <button className="add-page" onClick={addPage} title="Add page"><Plus size={14} /></button>
          </nav>
        )}

        {appView === 'space' && (
          <section className="space-overview">
            <aside className="home-sidebar">
              <button className="back-to-projects" onClick={() => void disconnectProject()}><ArrowLeft size={15} />Projects Home</button>
              <strong>{project.name}</strong>
              <nav>
                <button className={homeSection === 'spaces' ? 'is-active' : ''} onClick={() => setHomeSection('spaces')}><CanvasIcon size={17} />Canvas</button>

                <button className={homeSection === 'assets' ? 'is-active' : ''} onClick={() => { setHomeSection('assets'); setAssetTypeFilter('all') }}><AssetLibraryIcon size={17} />Assets</button>
                <div className="asset-type-submenu" aria-label="Asset Types">
                  {([
                    { type: 'all', label: 'All', icon: ASSET_TYPE_ICONS.all },
                    { type: 'character', label: 'Characters', icon: ASSET_TYPE_ICONS.character },
                    { type: 'wardrobe', label: 'Wardrobes', icon: ASSET_TYPE_ICONS.wardrobe },
                    { type: 'element', label: 'Elements', icon: ASSET_TYPE_ICONS.element },
                    { type: 'location', label: 'Locations', icon: ASSET_TYPE_ICONS.location },
                    { type: 'style', label: 'Styles', icon: ASSET_TYPE_ICONS.style },
                    { type: 'storyboard', label: 'Storyboards', icon: ASSET_TYPE_ICONS.storyboard },
                    { type: 'image', label: 'Images', icon: ASSET_TYPE_ICONS.image },
                    { type: 'video', label: 'Videos', icon: ASSET_TYPE_ICONS.video },
                    { type: 'audio', label: 'Audio', icon: ASSET_TYPE_ICONS.audio },
                  ] as Array<{ type: AssetTypeFilter; label: string; icon: typeof Images }>).map(({ type, label, icon: AssetIcon }) => <button key={type} className={homeSection === 'assets' && assetTypeFilter === type ? 'is-active' : ''} onClick={() => { setHomeSection('assets'); setAssetTypeFilter(type) }}><AssetIcon size={14} />{label}</button>)}
                  <button className={homeSection === 'favorites' ? 'is-active' : ''} onClick={() => setHomeSection('favorites')}><Heart size={14} />Favorites</button>
                </div>
                <button className={homeSection === 'trash' ? 'is-active' : ''} onClick={() => setHomeSection('trash')}><Trash2 size={17} />Trash</button>
              </nav>
              <button className="switch-project-sidebar" onClick={() => void disconnectProject()}><ProjectsIcon size={15} />Switch Project</button>
            </aside>
            <div className="space-home-content">
              <header>
                <div><p>{homeSection === 'spaces' ? 'CANVAS' : homeSection.toUpperCase()}</p><h1>{homeSection === 'spaces' ? 'Canvas' : homeSection === 'assets' ? assetTypeLabel : homeSection[0].toUpperCase() + homeSection.slice(1)}</h1><span><strong className="space-project-name">{project.name}</strong> · {canvases.length} canvas{canvases.length === 1 ? '' : 'es'} · {visibleAssetCount} asset{visibleAssetCount === 1 ? '' : 's'}</span></div>
                <div className="space-header-actions">{legacyImport.detected && <button className="legacy-cleanup" onClick={() => void cleanInheritedTestData()}><Trash2 size={16} /> Remove Inherited Test Data</button>}{homeSection === 'spaces' ? <button className="creation-action" onClick={addCanvas}><Plus size={16} /> New Canvas</button> : homeSection !== 'trash' && <>{homeSection === 'assets' && <button className="creation-action" onClick={() => void importAssetPackage()}><Upload size={16} /> Import Asset</button>}<button className="creation-action" onClick={createFromAssetSection}><Plus size={16} /> Create</button></>}</div>
              </header>
              {homeSection === 'spaces' && <div className="page-card-grid home-page-grid">
                {canvases.map((canvas, index) => { const canvasPages = canvas.id === activeCanvasId ? pages.map((page) => page.id === activePageId ? { ...page, nodes, edges } : page) : canvas.pages; const previewPage = canvasPages.find((page) => page.id === canvas.activePageId) || canvasPages[0]; const totalNodes = canvasPages.reduce((total, page) => total + page.nodes.length, 0); return (
                  <article ref={(element) => { if (element) pageCardRefs.current.set(canvas.id, element); else pageCardRefs.current.delete(canvas.id) }} draggable className={`page-card ${draggedCanvasId === canvas.id ? 'is-dragging' : ''}`} key={canvas.id} role="button" tabIndex={0} onClick={() => { if (suppressPageClick.current) return; switchCanvas(canvas.id) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); switchCanvas(canvas.id) } }} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', canvas.id); const source = event.currentTarget; const rect = source.getBoundingClientRect(); const ghost = source.cloneNode(true) as HTMLElement; ghost.classList.remove('is-dragging'); ghost.classList.add('page-card-drag-ghost'); ghost.style.width = `${rect.width}px`; ghost.style.height = `${rect.height}px`; document.body.appendChild(ghost); event.dataTransfer.setDragImage(ghost, Math.max(0, event.clientX - rect.left), Math.max(0, event.clientY - rect.top)); pageDragGhost.current?.remove(); pageDragGhost.current = ghost; pageOrderBeforeDrag.current = canvases.map((candidate) => candidate.id); pageDropCommitted.current = false; pageSwapLock.current = ''; pageLastSwapAt.current = 0; setDraggedCanvasId(canvas.id) }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; previewCanvasReorder(canvas.id, event.clientX, event.clientY, event.currentTarget) }} onDrop={(event) => { event.preventDefault(); pageDropCommitted.current = true; finishCanvasReorder() }} onDragEnd={cancelCanvasReorder}>
                    <span className="page-drag-handle" onClick={(event) => event.stopPropagation()} data-tooltip="Drag Canvas to Reorder" aria-label="Drag Canvas to Reorder"><GripVertical size={15} /></span>
                    <div className="page-card-actions">
                      <button onClick={(event) => { event.stopPropagation(); duplicateCanvas(canvas.id) }} data-tooltip="Duplicate Canvas" aria-label={`Duplicate ${canvas.name}`}><Copy size={14} /></button>
                      <button disabled={canvases.length <= 1} onClick={(event) => { event.stopPropagation(); requestDelete({ category: 'canvas', title: 'Delete Canvas?', message: `Delete “${canvas.name}”, its pages, and every node inside it? This cannot be undone after the project is saved.`, confirmLabel: 'Delete Canvas', action: () => deleteCanvas(canvas.id) }) }} data-tooltip={canvases.length <= 1 ? 'A Project Needs One Canvas' : 'Delete Canvas'} aria-label={`Delete ${canvas.name}`}><Trash2 size={14} /></button>
                    </div>
                    <div className="page-preview"><span className="preview-orbit" />{previewPage?.nodes.slice(0, 7).map((node, nodeIndex) => <i key={node.id} style={{ left: `${16 + (nodeIndex % 3) * 29}%`, top: `${32 + Math.floor(nodeIndex / 3) * 22}%` }} />)}{!totalNodes && <CanvasIcon size={24} />}</div>
                    <div className="page-card-title-row">{renamingCanvasId === canvas.id ? <input draggable={false} autoFocus aria-label={`Rename ${canvas.name}`} value={canvasNameDraft} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setCanvasNameDraft(event.target.value)} onBlur={() => commitCanvasRename(canvas.id)} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); commitCanvasRename(canvas.id) } else if (event.key === 'Escape') { setRenamingCanvasId(null); setCanvasNameDraft('') } }} /> : <><strong>{canvas.name}</strong><button draggable={false} type="button" title="Rename Canvas" aria-label={`Rename ${canvas.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setRenamingCanvasId(canvas.id); setCanvasNameDraft(canvas.name) }}><PencilLine size={11} /></button></>}</div>
                    <small>{canvasPages.length} page{canvasPages.length === 1 ? '' : 's'} · {totalNodes} node{totalNodes === 1 ? '' : 's'} · updated {new Date(canvas.updatedAt).toLocaleDateString()}</small>
                    <span className="page-index">{String(index + 1).padStart(2, '0')}</span>
                  </article>
                )})}
                <button type="button" className="page-card page-card-add" onClick={addCanvas} aria-label="Add Canvas"><span><Plus size={24} /><strong>Add Canvas</strong></span></button>
              </div>}
              {homeSection !== 'spaces' && <><div id="project-assets" className="asset-section-header"><div><p>PROJECT ASSETS</p><h2>{homeSection === 'favorites' ? 'Favorite Project Assets' : homeSection === 'trash' ? 'Recoverable Removed Assets' : assetSectionTitle}</h2></div><span>{visibleAssetCount}</span></div>
              {homeSection === 'assets' && <div className="asset-library-toolbar"><label><Search size={15} /><input value={assetSearch} placeholder="Search assets, prompts, or models" onChange={(event) => setAssetSearch(event.target.value)} />{assetSearch && <button title="Clear Search" onClick={() => setAssetSearch('')}><X size={13} /></button>}</label><div><button className={assetOriginFilter === 'all' ? 'is-active' : ''} onClick={() => setAssetOriginFilter('all')}>All</button><button className={assetOriginFilter === 'imported' ? 'is-active' : ''} onClick={() => setAssetOriginFilter('imported')}>Imported</button><button className={assetOriginFilter === 'generated' ? 'is-active' : ''} onClick={() => setAssetOriginFilter('generated')}>Generated</button></div>{selectedManagedAssetDeletion.selectionCount > 0 && <button className="asset-delete-selected" onClick={requestSelectedManagedAssetDelete}><Trash2 size={14} />Delete {selectedManagedAssetDeletion.selectionCount}</button>}</div>}
              {homeSection === 'assets' && assetTypeFilter === 'style' && visibleBuiltInStyles.length > 0 && <section className="built-in-styles"><div className="style-library-heading"><div><p>STYLE LIBRARY</p><h3>Included Styles</h3></div><span>{visibleBuiltInStyles.length}</span></div><div className="style-library-grid">{visibleBuiltInStyles.map((preset) => { const key = `built-in-style:${preset.id}`; return <button key={preset.id} className={`style-library-card ${selectedAssetKeys.includes(key) ? 'is-selected' : ''}`} title={`Select ${preset.title} · double-click to add to Canvas`} onClick={(event) => selectVisibleAsset(event, key)} onDoubleClick={() => addPresetStyleToCanvas(preset)}><div style={{ backgroundImage: `url(${preset.thumbnail})`, backgroundPosition: preset.focalPosition, backgroundSize: 'cover' }} /><strong>{preset.title}</strong><p>{preset.description}</p><small>@{preset.id}</small></button>})}</div></section>}
              {homeSection === 'assets' && assetTypeFilter === 'style' && visibleSavedStyleLibraryItems.length > 0 && <section className="my-own-styles"><div className="style-library-heading"><div><p>MY PRESET STYLES</p><h3>Created In This Project</h3></div><span>{visibleSavedStyleLibraryItems.length}</span></div><div className="style-library-grid">{visibleSavedStyleLibraryItems.map((item) => <article key={item.node.id} className="style-library-card custom-style-library-card"><button className="style-library-open" onClick={() => { if (item.pageId !== activePageId) switchPage(item.pageId); setAppView('canvas') }}><div>{item.previewUrl ? item.previewMimeType?.startsWith('video/') ? <video src={item.previewUrl} muted preload="metadata" /> : <img src={item.previewUrl} alt={item.node.data.title} /> : <Palette size={24} />}</div><strong>{item.node.data.title}</strong><p>{item.node.data.styleDescription || 'Custom reusable visual style.'}</p><small>{item.node.data.referenceTag || '@style'}</small></button><div className="style-library-actions"><button disabled={!item.previewAsset?.path} title={item.previewAsset?.path ? 'Export Preset Style' : 'Run The Connected Storyboard To Create A Preview'} onClick={() => void exportSavedStylePreset(item)}><Upload size={13} />Export</button><button className="is-danger" title="Delete Preset Style" onClick={() => requestDelete({ category: 'asset', title: 'Delete Preset Style?', message: `Delete “${item.node.data.title}” from this project’s preset library? Built-in styles are not affected.`, confirmLabel: 'Delete Preset', action: () => deleteSavedStylePreset(item.node.id, item.pageId) })}><Trash2 size={13} />Delete</button></div></article>)}</div></section>}

              {homeSection === 'assets' && assetTypeFilter === 'style' && visibleGlobalStyleAssets.length > 0 && <section className="my-own-styles"><div className="style-library-heading"><div><p>MY PRESET STYLES</p><h3>Available In Every Project</h3></div><span>{visibleGlobalStyleAssets.length}</span></div><div className="style-library-grid">{visibleGlobalStyleAssets.map((asset) => { const key = `style-asset:${asset.id}`; return <article key={asset.id} className={`style-library-card custom-style-library-card ${selectedAssetKeys.includes(key) ? 'is-selected' : ''}`} onClick={(event) => { if (!(event.target as HTMLElement).closest('.style-library-actions, input')) selectVisibleAsset(event, key) }}><div className="style-library-open"><div onDoubleClick={() => addLibraryStyleToCanvas(asset)}>{asset.url ? <img src={asset.url} alt={assetDisplayName(asset)} /> : <Palette size={24} />}</div>{renamingAssetId === asset.id ? <input autoFocus value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => void renameSemanticAssetCollection([asset])} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); else if (event.key === 'Escape') { setRenamingAssetId(null); setRenameDraft('') } }} /> : <strong onDoubleClick={(event) => { event.stopPropagation(); setRenamingAssetId(asset.id); setRenameDraft(assetDisplayName(asset)) }}>{assetDisplayName(asset)}</strong>}<p>Private application preset · cross-project</p><small>{asset.metadata?.modelId ? providerModelDisplayName(asset.metadata.modelId) : 'My Preset Style'}</small></div><div className="style-library-actions"><button title="Rename Preset Style" onClick={() => { setRenamingAssetId(asset.id); setRenameDraft(assetDisplayName(asset)) }}><PencilLine size={13} />Rename</button><button title="Export Preset Style" onClick={() => void window.prism.assets.exportPackage(asset.id)}><Upload size={13} />Export</button><button className="is-danger" title="Delete Preset Style" onClick={() => requestManagedAssetDelete([asset], assetDisplayName(asset))}><Trash2 size={13} />Delete</button></div></article>})}</div></section>}
              {homeSection === 'assets' && assetTypeFilter === 'storyboard' && storyboardLibraryItems.length > 0 && <div className="style-library-grid storyboard-library-grid">{storyboardLibraryItems.map(({ node, pageId }) => { const key = `project-node:${pageId}:${node.id}`; return <button key={node.id} className={`style-library-card storyboard-library-card ${selectedAssetKeys.includes(key) ? 'is-selected' : ''}`} onClick={(event) => selectVisibleAsset(event, key)} onDoubleClick={() => { if (pageId !== activePageId) switchPage(pageId); setAppView('canvas') }}><div>{(node.data.storyboardPanels || []).slice(0, 4).map((panel, index) => <span key={panel.id}>{index + 1}</span>)}</div><strong>{node.data.title}</strong><p>{node.data.storyboardPanels?.length || 0} panels · {node.data.storyboardDuration || 0}s · {resolveVideoModel(node.data.storyboardModelId).shortLabel}</p><small>{node.data.referenceTag || 'Connected Style asset'}</small></button>})}</div>}
              {semanticAssetCollections.length ? <div className="asset-card-grid semantic-collection-grid">{semanticAssetCollections.map((collection) => { const key = `semantic:${collection.key}`; const missingAsset = collection.assets.find((asset) => missingAssetIds.includes(asset.id)); const linkState = missingAsset ? assetVisualState(missingAsset.id) : collection.assets.map((asset) => assetVisualState(asset.id)).find((state) => state === 'found'); return <article className={`asset-card semantic-collection-card ${selectedAssetKeys.includes(key) ? 'is-selected' : ''} ${linkState === 'offline' || linkState === 'finding' ? 'is-offline' : linkState === 'found' ? 'is-found' : ''}`} key={collection.key} onClick={(event) => { if (!(event.target as HTMLElement).closest('button, input')) selectVisibleAsset(event, key) }} onDoubleClick={(event) => { if ((event.target as HTMLElement).closest('.asset-card-actions, input') || !['character', 'location'].includes(collection.category) || missingAsset) return; openAssetMedia(collection.previewAssets.map((asset) => asset.id)) }}>
                <div className="asset-preview semantic-collection-preview" data-preview-count={collection.previewAssets.length} data-asset-category={collection.category}>
                  {collection.previewAssets.map((asset) => asset.mimeType.startsWith('image/') && asset.url ? <img key={asset.id} src={asset.url} alt={asset.metadata?.characterView || asset.metadata?.elementView || asset.name} loading="lazy" decoding="async" data-character-view={collection.category === 'character' ? asset.metadata?.characterView : undefined} style={{ objectPosition: previewFocalPosition(asset, collection.category === 'character') }} /> : <span key={asset.id}><AssetTypeGlyph type={collection.category} size={18} /></span>)}
                  <i>{collection.assets.length} file{collection.assets.length === 1 ? '' : 's'}</i>
                  <div className="asset-hover-actions">
                    <button title={collection.assets.every((asset) => asset.favorite) ? 'Remove From Favorites' : 'Add To Favorites'} className={collection.assets.every((asset) => asset.favorite) ? 'is-active' : ''} onClick={() => void favoriteSemanticAssetCollection(collection.assets, !collection.assets.every((asset) => asset.favorite))}><Heart size={15} fill={collection.assets.every((asset) => asset.favorite) ? 'currentColor' : 'none'} /></button>
                    <button title={missingAsset ? 'Find Missing Asset' : 'Show Asset In Finder'} onClick={() => missingAsset ? void relinkAsset(missingAsset.id) : void window.prism.assets.revealCollection(collection.assets[0].id)}>{missingAsset ? <Unlink size={15} /> : <FolderOpen size={15} />}</button>
                    <button title="Delete Reusable Asset" onClick={() => requestManagedAssetDelete(collection.assets, collection.name)}><Trash2 size={15} /></button>
                    <button data-asset-menu-trigger title="More" onClick={() => setAssetMenuId((current) => current === collection.assets[0].id ? null : collection.assets[0].id)}><Ellipsis size={16} /></button>
                  </div>
                  {assetMenuId === collection.assets[0].id && <div className="asset-more-menu" onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => { void window.prism.assets.exportPackage(collection.assets[0].id); setAssetMenuId(null) }}><Upload size={14} />Export</button>
                    <button onClick={() => { setRenamingAssetId(collection.assets[0].id); setRenameDraft(collection.name); setAssetMenuId(null) }}><PencilLine size={14} />Rename</button>
                    <button onClick={() => { void relinkAsset(collection.assets[0].id); setAssetMenuId(null) }}><Link2 size={14} />Relink</button>
                    {/^(image|video)\//.test(collection.assets[0].mimeType) && <button onClick={() => void openPortraitDialog(collection.assets[0], collection.assets)}><Link2 size={14} />Link BytePlus Asset</button>}
                  </div>}
                </div>
                <div className="asset-card-meta">{renamingAssetId === collection.assets[0].id ? <div className="asset-rename"><input autoFocus aria-label={`Rename ${collection.name}`} value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => void renameSemanticAssetCollection(collection.assets)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); else if (event.key === 'Escape') { setRenamingAssetId(null); setRenameDraft('') } }} /></div> : <strong title="Double-click to rename this reusable asset" onDoubleClick={(event) => { event.stopPropagation(); setRenamingAssetId(collection.assets[0].id); setRenameDraft(collection.name) }}>{collection.name}</strong>}<small className="asset-source">{linkState === 'finding' ? `Finding${'.'.repeat(findingDots)}` : linkState === 'found' ? 'Found' : linkState === 'offline' ? 'Media Offline' : `${collection.origin === 'generated' ? 'Generated' : 'Imported'} ${collection.category[0].toUpperCase() + collection.category.slice(1)} Set`}</small><div className="asset-facts"><span>{collection.assets.length} view{collection.assets.length === 1 ? '' : 's'}</span><time>{new Date(collection.assets[0].createdAt).toLocaleDateString()}</time></div></div>
              </article>})}</div> : null}
              {assetTypeFilter !== 'style' && ungroupedHomeAssets.length ? <div className="asset-card-grid">
              {ungroupedHomeAssets.map((asset) => {
                const mediaInfo = assetMediaInfo[asset.id] || {}
                const ratio = asset.metadata?.aspectRatio || mediaInfo.aspectRatio
                const duration = asset.metadata?.duration || mediaInfo.duration
                const source = asset.metadata?.modelId || (asset.origin === 'generated' ? asset.metadata?.provider || 'Generated' : 'Imported')
                const linkState = assetVisualState(asset.id)
                const key = `media:${asset.id}`
                return <article className={`asset-card ${selectedAssetKeys.includes(key) ? 'is-selected' : ''} ${linkState === 'offline' || linkState === 'finding' ? 'is-offline' : linkState === 'found' ? 'is-found' : ''}`} key={asset.id} onClick={(event) => { if (!(event.target as HTMLElement).closest('button, input')) selectVisibleAsset(event, key) }} onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest('button') && !missingAssetIds.includes(asset.id)) openAssetMedia([asset.id]) }} onContextMenu={(event) => { event.preventDefault(); setContextMenu({ kind: 'asset', assetId: asset.id, clientX: event.clientX, clientY: event.clientY }) }}>
                <div className="asset-preview">
                  {missingAssetIds.includes(asset.id) ? <MediaOfflineState mediaFamily={(mediaFamily(asset.mimeType) || 'image') as AssetMediaFamily} state={linkState || 'offline'} findingDots={findingDots} onFind={() => void relinkAsset(asset.id)} /> : asset.mimeType.startsWith('image/') ? <img src={asset.url} alt={asset.name} loading="lazy" decoding="async" onLoad={(event) => captureMediaInfo(asset.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
                    : asset.mimeType.startsWith('video/') ? <video src={asset.url} preload="metadata" muted playsInline onLoadedMetadata={(event) => captureMediaInfo(asset.id, event.currentTarget.videoWidth, event.currentTarget.videoHeight, event.currentTarget.duration)} />
                      : <><AudioLines size={24} /><audio src={asset.url} preload="metadata" onLoadedMetadata={(event) => captureMediaInfo(asset.id, 0, 0, event.currentTarget.duration)} /></>}
                  <span>{asset.category || (asset.mimeType.startsWith('video/') ? 'video' : asset.mimeType.startsWith('audio/') ? 'audio' : 'image')}</span>
                  <div className="asset-hover-actions">
                    <button title={asset.favorite ? 'Remove From Favorites' : 'Add To Favorites'} className={asset.favorite ? 'is-active' : ''} onClick={() => void updateAssetState(asset.id, { favorite: !asset.favorite })}><Heart size={15} fill={asset.favorite ? 'currentColor' : 'none'} /></button>
                    <button title={missingAssetIds.includes(asset.id) ? 'Find Missing Asset' : 'Show In Finder'} onClick={() => missingAssetIds.includes(asset.id) ? void relinkAsset(asset.id) : void window.prism.assets.reveal(asset.id)}>{missingAssetIds.includes(asset.id) ? <Unlink size={15} /> : <FolderOpen size={15} />}</button>
                    <button title="Delete Asset" onClick={() => requestManagedAssetDelete([asset], assetDisplayName(asset))}><Trash2 size={15} /></button>
                    <button data-asset-menu-trigger title="More" onClick={() => setAssetMenuId((current) => current === asset.id ? null : asset.id)}><Ellipsis size={16} /></button>
                  </div>
                  {assetMenuId === asset.id && <div className="asset-more-menu" onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => { void window.prism.assets.exportPackage(asset.id); setAssetMenuId(null) }}><Upload size={14} />Export</button>
                    <button onClick={() => { setRenamingAssetId(asset.id); setRenameDraft(mediaRenameStem(assetDisplayName(asset))); setAssetMenuId(null) }}><PencilLine size={14} />Rename</button>
                    <button onClick={() => { void relinkAsset(asset.id); setAssetMenuId(null) }}><Link2 size={14} />Relink</button>
                    {/^(image|video)\//.test(asset.mimeType) && <button onClick={() => void openPortraitDialog(asset)}><Link2 size={14} />Link BytePlus Asset</button>}
                  </div>}
                </div>
                <div className="asset-card-meta">
                  {renamingAssetId === asset.id ? <div className="asset-rename"><input autoFocus value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void renameAsset(asset.id); if (event.key === 'Escape') setRenamingAssetId(null) }} /><button onClick={() => void renameAsset(asset.id)}>Save</button></div>
                    : <><strong title={assetDisplayName(asset)}>{assetDisplayName(asset)}</strong><button title="Rename asset" onClick={() => { setRenamingAssetId(asset.id); setRenameDraft(mediaRenameStem(assetDisplayName(asset))) }}><PencilLine size={13} /></button></>}
                  <small className="asset-source" title={source}>{linkState === 'finding' ? `Finding${'.'.repeat(findingDots)}` : linkState === 'found' ? 'Found' : linkState === 'offline' ? 'Media Offline' : source}</small>
                  <div className="asset-facts">{ratio && <span>{ratio}</span>}{duration && <span>{Math.round(duration * 10) / 10}s</span>}{asset.metadata?.resolution && <span>{asset.metadata.resolution}</span>}{asset.metadata?.frameRate && <span>{asset.metadata.frameRate} fps</span>}<time>{new Date(asset.createdAt).toLocaleDateString()}</time></div>
                </div>
              </article>})}
              </div> : !(semanticAssetCollections.length || ungroupedHomeAssets.length || (homeSection === 'assets' && ((assetTypeFilter === 'style' && (visibleBuiltInStyles.length || visibleSavedStyleLibraryItems.length)) || (assetTypeFilter === 'storyboard' && storyboardLibraryItems.length)))) && <div className="asset-empty is-workflow-empty"><AssetTypeGlyph type={assetTypeFilter} size={22} /><strong>{homeSection === 'assets' && assetTypeFilter === 'character' ? 'No Character Assets Yet' : homeSection === 'assets' && assetTypeFilter === 'element' ? 'No Element Assets Yet' : homeSection === 'assets' && assetTypeFilter === 'location' ? 'No Location Assets Yet' : homeSection === 'assets' && assetTypeFilter === 'wardrobe' ? 'No Wardrobe Assets Yet' : homeSection === 'assets' && assetTypeFilter === 'style' ? 'No Matching Styles' : homeSection === 'assets' && assetTypeFilter === 'storyboard' ? 'No Storyboards Yet' : homeSection === 'favorites' ? 'No Favorite Assets Yet' : homeSection === 'trash' ? 'Trash Is Empty' : assetTypeFilter === 'video' ? 'No Video Assets Yet' : assetTypeFilter === 'image' ? 'No Image Assets Yet' : assetTypeFilter === 'audio' ? 'No Audio Assets Yet' : 'No Assets Yet'}</strong><span>{homeSection === 'favorites' ? 'Favorite assets will appear here.' : homeSection === 'trash' ? 'Trash is empty.' : homeSection === 'assets' && assetTypeFilter === 'character' ? 'Create starts a Prompt or Reference workflow. Completed identity views will appear here as one transferable asset set.' : homeSection === 'assets' && assetTypeFilter === 'element' ? 'Create starts a Prompt or Reference workflow with 2–4 consistent output angles.' : homeSection === 'assets' && assetTypeFilter === 'location' ? 'Create starts a Prompt or Reference workflow for a reusable environment.' : homeSection === 'assets' && assetTypeFilter === 'wardrobe' ? 'Create starts a Prompt or Reference workflow for reusable wardrobe.' : homeSection === 'assets' && assetTypeFilter === 'style' ? 'Clear the search or switch the source filter to All.' : homeSection === 'assets' && assetTypeFilter === 'storyboard' ? 'Create and compile a Storyboard to reuse it from the same node.' : 'Assets added to nodes and generated outputs will appear here.'}</span></div>}</>}
              {projectError && <div className="project-inline-error"><span>{projectError}</span><button aria-label="Dismiss Project Error" onClick={() => setProjectError('')}><X size={13} /></button></div>}
              {projectNotice && <div className="project-inline-notice"><span>{projectNotice}</span><button aria-label="Dismiss Project Notice" onClick={() => setProjectNotice('')}><X size={13} /></button></div>}
            </div>
          </section>
        )}

      </main>

      {appView === 'canvas' && !assetBrowserOpen && inspectorNode && inspectorRunnable && (
        <aside className="node-inspector-panel">
          <header><div><input className="inspector-title-input" aria-label="Node Name" value={inspectorNode.data.title} onChange={(event) => updateNode(inspectorNode.id, { title: event.target.value })} /><small>{palette.find((item) => item.kind === inspectorNode.data.kind)?.label || inspectorNode.data.kind}</small></div><button title="Close Node Settings" aria-label="Close Node Settings" onClick={() => setInspectorNodeId(null)}><X size={17} /></button></header>
          <div className="inspector-scroll">
            {inspectorNode.data.falNative && supportsFalSeedanceDraft(inspectorNode.data.falNative.endpointId) && (inspectorNode.data.runState === 'error' || inspectorNode.data.videoDraftWarning) && <section className="inspector-section inspector-grid">
              <label className="inspector-wide"><span>Fal Draft Request ID</span><input aria-label="Fal Draft Request ID" placeholder="Original request ID from fal history" value={inspectorNode.data.falDraftRecoveryRequestId || ''} onChange={event => updateNode(inspectorNode.id, { falDraftRecoveryRequestId: event.target.value })} /></label>
              <button className="inspector-wide" disabled={!inspectorNode.data.falDraftRecoveryRequestId?.trim() || inspectorNode.data.runState === 'running'} onClick={() => { void recoverFalDraft(inspectorNode) }}>Recover Draft</button>
              <p className="inspector-wide">Reads the existing result from this project's fal account. No new generation.</p>
            </section>}

            <section className="inspector-section inspector-routine-model">
              <label>MODEL</label>
              {['image-generator', 'element', 'location', 'wardrobe'].includes(inspectorNode.data.kind)
                ? <div className="inspector-model">{modelCompanyFor(inspectorImageModelId, inspectorImageModelLabel) && <CompanyIcon provider={modelCompanyFor(inspectorImageModelId, inspectorImageModelLabel)!} />}<span>{inspectorImageModelLabel}{inspectorReferenceCount ? ' · references' : ' · text to image'}</span></div>
                : inspectorNode.data.kind === 'video-generator'
                  ? <>
                    <GroupedMenuSelect catalog className="inspector-model-select" menuClassName="video-model-menu" ariaLabel="Video model" displayLabel={inspectorNode.data.higgsfieldNative?.label || inspectorNode.data.falNative?.label} value={inspectorVideoValue} groups={inspectorVideoGroups} onChange={engine => selectInspectorVideoModel(engine)} />
                    <p className="inspector-model-capability"><strong>INPUTS</strong>{inspectorNode.data.higgsfieldNative ? inspectorHiggsfieldInputSummary : inspectorNode.data.falNative ? inspectorNode.data.falNative.media.filter(field => !field.retired).map(field => `${field.label}${field.maximum === undefined ? '' : ` (up to ${field.maximum})`}`).join(' · ') || 'No media inputs declared' : videoInputSummary(resolveVideoModel(inspectorNode.data.videoEngine))}</p>
                  </>
                  : inspectorNode.data.kind === 'voiceover'
                    ? <VoiceModelSelect className="inspector-model-select" data={inspectorNode.data} falAvailability={serviceModels.fal} fishAvailability={serviceModels.fish} onFalSelect={(endpointId) => selectFalModel(inspectorNode.id, endpointId)} models={serviceModels.elevenlabs?.models || []} onChange={(patch) => updateNode(inspectorNode.id, patch)} />
                    : inspectorNode.data.kind === 'sound-effects' ? <SoundModelSelect className="inspector-model-select" data={inspectorNode.data} falAvailability={serviceModels.fal} onFalSelect={(endpointId) => selectFalModel(inspectorNode.id, endpointId)} onChange={(patch) => updateNode(inspectorNode.id, patch)} />
                    : <div className="inspector-model">{inspectorNode.data.kind === 'image-editor' ? <CompanyIcon provider={modelCompanyFor(inspectorImageModelId, inspectorImageModelLabel)!} /> : inspectorNode.data.kind === 'music-generator' ? <CompanyIcon provider="elevenlabs" /> : <span className="model-company-wordmark" aria-hidden="true">{inspectorNode.data.upscalerModel === 'realesrgan-video' ? 'RE' : 'CL'}</span>}<span>{inspectorNode.data.kind === 'image-editor' ? `${inspectorImageModelLabel} · image editing` : inspectorNode.data.kind === 'upscaler' ? inspectorNode.data.upscalerModel === 'realesrgan-video' ? 'RealESRGAN Video Upscaler' : 'Clarity Image Upscaler' : 'ElevenLabs Music'}</span></div>}
            </section>

            {['image-generator', 'upscaler', 'video-generator', 'element', 'location', 'wardrobe'].includes(inspectorNode.data.kind) && <section className="inspector-section inspector-routine-references">
              <div className="inspector-label-row"><label>REFERENCES</label><span>{inspectorReferenceCount} connected</span></div>
              {inspectorNode.data.kind === 'image-generator' ? <div className="inspector-reference-grid">
                <button onClick={() => addInspectorReference(inspectorNode.id, 'style-reference')}><Palette size={17} /><span>Style</span><small>Connect node</small></button>
                <button onClick={() => addInspectorReference(inspectorNode.id, 'character')}><UserRound size={17} /><span>Character</span><small>Connect node</small></button>
                <button onClick={() => addInspectorReference(inspectorNode.id, 'upload')}><Plus size={17} /><span>Add</span><small>Local media</small></button>
              </div> : ['element', 'location', 'wardrobe'].includes(inspectorNode.data.kind) ? <div className="inspector-reference-grid"><button onClick={() => addInspectorReference(inspectorNode.id, 'upload', 'image-in')}><ImageIcon size={17} /><span>{inspectorNode.data.kind === 'element' ? 'Object guide' : inspectorNode.data.kind === 'wardrobe' ? 'Wardrobe guide' : 'Location guide'}</span><small>Optional image</small></button></div> : inspectorNode.data.kind === 'video-generator' && (inspectorVideoModel || inspectorNode.data.higgsfieldNative) ? <><div className="inspector-reference-grid video-reference-grid">
                {nodeInputPorts(inspectorNode.data).map((port) => {
                  const sourceKind = port.id === 'text-in' ? 'prompt' : port.id === 'storyboard-in' ? 'storyboard' : port.id === 'character-in' ? 'character' : port.id === 'wardrobe-in' ? 'wardrobe' : port.id === 'element-in' ? 'element' : port.id === 'location-in' ? 'location' : port.id === 'style-in' ? 'style-reference' : 'upload'
                  return <button key={port.id} disabled={port.maxConnections === 0} onClick={() => addInspectorReference(inspectorNode.id, sourceKind, port.id)}><GeneratorInputIcon id={port.id} signal={port.signal} kind="video-generator" /><span>{generatorInputLabel(port.id, port.label).replace(/^Add /, '')}</span><small>{port.maxConnections === 1 ? 'Single input' : port.maxConnections ? `Up to ${port.maxConnections}` : 'Connect node'}</small></button>
                })}
              </div><p className="reference-budget">{inspectorNode.data.higgsfieldNative?.label || inspectorVideoModel?.label} · {inspectorNode.data.higgsfieldNative ? 'connected media use this exact model’s declared inputs and limits.' : inspectorNode.data.falNative ? 'connected media use this exact model’s declared inputs.' : 'semantic inputs automatically select a legal reference-capable route.'}</p></> : <div className="inspector-reference-grid"><button onClick={() => addInspectorReference(inspectorNode.id, 'upload')}>{inspectorNode.data.kind === 'upscaler' && inspectorNode.data.upscalerModel === 'realesrgan-video' ? <Video size={17} /> : <ImageIcon size={17} />}<span>{inspectorNode.data.kind === 'upscaler' && inspectorNode.data.upscalerModel === 'realesrgan-video' ? 'Input video' : 'Input image'}</span><small>One {inspectorNode.data.kind === 'upscaler' && inspectorNode.data.upscalerModel === 'realesrgan-video' ? 'video' : inspectorNode.data.kind === 'upscaler' ? 'image' : 'or more images'}</small></button></div>}
            </section>}

            {inspectorNode.data.kind !== 'upscaler' && !(isElevenDialogue(inspectorNode.data) && !inspectorNode.data.falNative) && <section className="inspector-section inspector-routine-prompt">
              <label>PROMPT</label>
              <TaggedPromptTextarea value={inspectorNode.data.higgsfieldNative ? inspectorNode.data.manualPromptDraft ?? inspectorNode.data.prompt ?? '' : inspectorNode.data.prompt || ''} connectedTags={inspectorPromptTags} availableTags={inspectorAvailablePromptTags} placeholder={['image-generator', 'element', 'location', 'wardrobe'].includes(inspectorNode.data.kind) ? inspectorNode.data.kind === 'element' ? 'Describe the reusable object to create…' : inspectorNode.data.kind === 'location' ? 'Describe the reusable environment to create…' : inspectorNode.data.kind === 'wardrobe' ? 'Describe the reusable wardrobe to create…' : 'Describe the image you want to generate…' : inspectorNode.data.kind === 'voiceover' ? 'Enter the words to speak…' : inspectorNode.data.kind === 'sound-effects' ? 'Describe the sound effect…' : inspectorNode.data.kind === 'music-generator' ? 'Describe the music…' : 'Reference connected media using its @ tag…'} onValueChange={(prompt) => updatePrompt(inspectorNode.id, prompt)} />
            </section>}

            {(inspectorNode.data.higgsfieldNative || higgsfieldJobs().jobs?.some(job => job.nodeId === inspectorNode.id)) && <HiggsfieldRecoveryControls nodeId={inspectorNode.id} view={higgsfieldJobs()} onRefresh={() => { void refreshHiggsfieldJobs() }} onAction={command => { void applyHiggsfieldJobAction(command) }} />}
            {inspectorNode.data.higgsfieldNative ? <HiggsfieldFields state={inspectorNode.data.higgsfieldNative} view={higgsfieldPresets()} inputView={higgsfieldSchema(inspectorNode.data.higgsfieldNative.endpointId)} placement="advanced" onRefreshInputs={() => { void loadHiggsfieldContract(inspectorNode.data.higgsfieldNative!.endpointId, true) }} onRefresh={() => { void refreshHiggsfieldPresets(true) }} onChange={higgsfieldNative => updateNode(inspectorNode.id, { higgsfieldNative })} /> : inspectorNode.data.falNative ? <FalNativeFields state={inspectorNode.data.falNative} contract={falSchema(inspectorNode.data.falNative.endpointId).contract} placement="advanced" onChange={(falNative) => updateNode(inspectorNode.id, { falNative })} /> : ['image-generator', 'element', 'location', 'wardrobe'].includes(inspectorNode.data.kind) ? <section className="inspector-grid">
              <label><span>Aspect ratio</span><SimpleMenuSelect ariaLabel="Aspect ratio" value={normalizedImageRatio(inspectorNode.data.aspectRatio)} options={(inspectorUsesNanoImage ? NANO_IMAGE_RATIOS : IMAGE_RATIOS).map((ratio) => ({ value: ratio, label: ratio === 'auto' ? 'Auto' : ratio }))} onChange={(value) => updateNode(inspectorNode.id, { aspectRatio: value })} /></label>
              <label><span>Format</span><SimpleMenuSelect ariaLabel="Image format" value={inspectorNode.data.outputFormat || 'png'} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, ...(inspectorUsesNanoImage ? [{ value: 'webp', label: 'WebP' }] : [])]} onChange={(value) => updateNode(inspectorNode.id, { outputFormat: value as 'jpeg' | 'png' | 'webp' })} /></label>
              {inspectorUsesNanoImage ? <><label><span>Resolution</span><SimpleMenuSelect ariaLabel="Image resolution" value={inspectorNode.data.imageResolution || '1K'} options={['1K', '2K', '4K'].map((value) => ({ value, label: value }))} onChange={(value) => updateNode(inspectorNode.id, { imageResolution: value as StudioNodeData['imageResolution'] })} /></label><label><span>Safety tolerance</span><SimpleMenuSelect ariaLabel="Safety tolerance" value={String(inspectorNode.data.safetyTolerance || 4)} options={[1,2,3,4,5,6].map((value) => ({ value: String(value), label: String(value) }))} onChange={(value) => updateNode(inspectorNode.id, { safetyTolerance: Number(value) as StudioNodeData['safetyTolerance'] })} /></label><label className="inspector-wide inspector-switch"><input type="checkbox" checked={Boolean(inspectorNode.data.enableWebSearch)} onChange={(event) => updateNode(inspectorNode.id, { enableWebSearch: event.target.checked })} /><span>Enable web search</span></label></> : <><label><span>Steps</span><SimpleMenuSelect ariaLabel="Inference steps" value={String(inspectorNode.data.inferenceSteps || 4)} options={[1,2,4,6,8,12].map((value) => ({ value: String(value), label: String(value) }))} onChange={(value) => updateNode(inspectorNode.id, { inferenceSteps: Number(value) })} /></label><label><span>Acceleration</span><SimpleMenuSelect ariaLabel="Acceleration" value={inspectorNode.data.acceleration || 'none'} options={[{ value: 'none', label: 'None' }, { value: 'regular', label: 'Regular' }, { value: 'high', label: 'High' }]} onChange={(value) => updateNode(inspectorNode.id, { acceleration: value as StudioNodeData['acceleration'] })} /></label><label className="inspector-wide"><span>Guidance · {(inspectorNode.data.guidanceScale || 3.5).toFixed(1)}</span><input type="range" min="1" max="10" step="0.5" value={inspectorNode.data.guidanceScale || 3.5} onChange={(event) => updateNode(inspectorNode.id, { guidanceScale: Number(event.target.value) })} /></label></>}
              <label className="inspector-wide"><span>Seed</span><input type="number" placeholder="Random" value={inspectorNode.data.seed ?? ''} onChange={(event) => updateNode(inspectorNode.id, { seed: event.target.value ? Number(event.target.value) : undefined })} /></label>
            </section> : inspectorNode.data.kind === 'video-generator' ? <section className="inspector-grid">
              <label><span>Aspect ratio</span><SimpleMenuSelect ariaLabel="Video aspect ratio" disabled={!inspectorVideoModel?.ratios.length} value={inspectorVideoModel?.ratios.length ? resolvedVideoRatio(inspectorVideoModel, inspectorNode.data.aspectRatio) : 'fixed'} options={inspectorVideoModel?.ratios.length ? inspectorVideoModel.ratios.filter((ratio) => ratio !== 'auto').map((ratio) => ({ value: ratio, label: ratio })) : [{ value: 'fixed', label: inspectorVideoModel?.fixedAspectRatioLabel || 'Native' }]} onChange={(value) => updateNode(inspectorNode.id, { aspectRatio: value })} /></label>
              <label><span>Duration</span><SimpleMenuSelect ariaLabel="Video duration" value={String(normalizedVideoDuration(inspectorNode.data))} options={videoDurationMenuOptions(inspectorNode.data)} onChange={(value) => updateNode(inspectorNode.id, { duration: Number(value), autoDuration: false })} /></label>
              <label><span>Motion FPS</span><GroupedMenuSelect ariaLabel="Motion FPS" title="Motion FPS controls visible movement cadence without changing encoded provider Native FPS or playback speed." displayLabel={`${normalizedMotionCadence(inspectorVideoModel || resolveVideoModel(inspectorNode.data.videoEngine), inspectorNode.data.frameRate, inspectorNode.data.motionCadence)} fps`} value={String(normalizedMotionCadence(inspectorVideoModel || resolveVideoModel(inspectorNode.data.videoEngine), inspectorNode.data.frameRate, inspectorNode.data.motionCadence))} groups={[
                { label: 'Motion FPS', options: motionCadenceOptions(inspectorVideoModel || resolveVideoModel(inspectorNode.data.videoEngine), inspectorNode.data.frameRate).map((fps) => ({ value: String(fps), label: `${fps} fps` })) },
              ]} onChange={(value) => updateNode(inspectorNode.id, { motionCadence: Number(value) })} /></label>
              <ShutterSettings
                mode={inspectorNode.data.shutterMode === 'speed' ? 'speed' : 'angle'}
                angle={typeof inspectorNode.data.shutterAngle === 'number' ? inspectorNode.data.shutterAngle : 180}
                fps={knownOutputFrameRate(inspectorVideoModel || resolveVideoModel(inspectorNode.data.videoEngine), inspectorNode.data.frameRate) || inspectorNode.data.frameRate || 24}
                onChange={(patch) => updateNode(inspectorNode.id, patch)}
              />
              {inspectorVideoModel?.family === 'wan' && <><label><span>Native FPS</span><SimpleMenuSelect ariaLabel="Native FPS" title="The actual encoded frame rate supported by this provider endpoint." value={String(inspectorNode.data.frameRate || 24)} options={inspectorVideoModel.frameRates.map((fps) => ({ value: String(fps), label: `${fps} fps` }))} onChange={(value) => {
                const frameRate = Number(value)
                const options = videoDurationOptions('wan-controlled', frameRate).filter((value): value is number => typeof value === 'number')
                const current = inspectorNode.data.duration || 5
                const duration = options.reduce((nearest, value) => Math.abs(value - current) < Math.abs(nearest - current) ? value : nearest, options[0])
                updateNode(inspectorNode.id, { frameRate, duration, motionCadence: normalizedMotionCadence(inspectorVideoModel, frameRate, inspectorNode.data.motionCadence) })
              }} /></label><label><span>Resolution</span><SimpleMenuSelect ariaLabel="Resolution" value={inspectorNode.data.resolution || inspectorVideoModel.resolutions[0]} options={inspectorVideoModel.resolutions.map((resolution) => ({ value: resolution, label: resolution }))} onChange={(value) => updateNode(inspectorNode.id, { resolution: value as StudioNodeData['resolution'] })} /></label><label><span>Quality</span><SimpleMenuSelect ariaLabel="Quality" value={inspectorNode.data.videoQuality || 'high'} options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['maximum', 'Maximum']].map(([value, label]) => ({ value, label }))} onChange={(value) => updateNode(inspectorNode.id, { videoQuality: value as StudioNodeData['videoQuality'] })} /></label><label><span>Write mode</span><SimpleMenuSelect ariaLabel="Write mode" value={inspectorNode.data.videoWriteMode || 'balanced'} options={[['fast', 'Fast'], ['balanced', 'Balanced'], ['small', 'Small file']].map(([value, label]) => ({ value, label }))} onChange={(value) => updateNode(inspectorNode.id, { videoWriteMode: value as StudioNodeData['videoWriteMode'] })} /></label><label><span>Sampling steps</span><input type="number" min="1" max="100" value={inspectorNode.data.inferenceSteps || 40} onChange={(event) => updateNode(inspectorNode.id, { inferenceSteps: Number(event.target.value) })} /></label><label><span>Guidance</span><input type="number" min="0" max="20" step="0.1" value={inspectorNode.data.guidanceScale ?? 1} onChange={(event) => updateNode(inspectorNode.id, { guidanceScale: Number(event.target.value) })} /></label><label><span>Shift</span><input type="number" min="1" max="10" step="0.1" value={inspectorNode.data.shift ?? 5} onChange={(event) => updateNode(inspectorNode.id, { shift: Number(event.target.value) })} /></label><label><span>Acceleration</span><SimpleMenuSelect ariaLabel="Acceleration" value={inspectorNode.data.acceleration || 'regular'} options={[{ value: 'none', label: 'None' }, { value: 'regular', label: 'Regular' }]} onChange={(value) => updateNode(inspectorNode.id, { acceleration: value as StudioNodeData['acceleration'] })} /></label><label><span>Interpolation</span><SimpleMenuSelect ariaLabel="Interpolation" value={inspectorNode.data.interpolatorModel || 'film'} options={[{ value: 'none', label: 'None' }, { value: 'film', label: 'FILM' }, { value: 'rife', label: 'RIFE' }]} onChange={(value) => updateNode(inspectorNode.id, { interpolatorModel: value as StudioNodeData['interpolatorModel'] })} /></label><label><span>Extra frames</span><SimpleMenuSelect ariaLabel="Extra frames" value={String(inspectorNode.data.numInterpolatedFrames ?? 0)} options={[0,1,2,3,4].map((value) => ({ value: String(value), label: String(value) }))} onChange={(value) => updateNode(inspectorNode.id, { numInterpolatedFrames: Number(value) })} /></label><label><span>Seed</span><input type="number" placeholder="Random" value={inspectorNode.data.seed ?? ''} onChange={(event) => updateNode(inspectorNode.id, { seed: event.target.value ? Number(event.target.value) : undefined })} /></label><label className="inspector-switch"><input type="checkbox" checked={inspectorNode.data.adjustFpsForInterpolation !== false} onChange={(event) => updateNode(inspectorNode.id, { adjustFpsForInterpolation: event.target.checked })} /><span>Multiply FPS after interpolation</span></label><label className="inspector-switch"><input type="checkbox" checked={Boolean(inspectorNode.data.enablePromptExpansion)} onChange={(event) => updateNode(inspectorNode.id, { enablePromptExpansion: event.target.checked })} /><span>Prompt expansion</span></label><label className="inspector-switch"><input type="checkbox" checked={inspectorNode.data.enableInputSafety !== false} onChange={(event) => updateNode(inspectorNode.id, { enableInputSafety: event.target.checked })} /><span>Input safety</span></label><label className="inspector-switch"><input type="checkbox" checked={inspectorNode.data.enableOutputSafety !== false} onChange={(event) => updateNode(inspectorNode.id, { enableOutputSafety: event.target.checked })} /><span>Output safety</span></label></>}
              {inspectorVideoModel && inspectorVideoModel.family !== 'wan' && <><label><span>Resolution</span><SimpleMenuSelect ariaLabel="Video resolution" disabled={!inspectorVideoModel.resolutions.length} value={inspectorVideoModel.resolutions.length ? (inspectorNode.data.resolution || inspectorVideoModel.resolutions[0]) : 'fixed'} options={inspectorVideoModel.resolutions.length ? inspectorVideoModel.resolutions.map((resolution) => ({ value: resolution, label: resolution })) : [{ value: 'fixed', label: inspectorVideoModel.fixedResolutionLabel || 'Native' }]} onChange={(value) => updateNode(inspectorNode.id, { resolution: value as StudioNodeData['resolution'] })} /></label><label><span>Seed</span><input type="number" placeholder="Random" value={inspectorNode.data.seed ?? ''} onChange={(event) => updateNode(inspectorNode.id, { seed: event.target.value ? Number(event.target.value) : undefined })} /></label></>}
              {inspectorVideoModel?.supportsBitrateMode && <label><span>Bitrate</span><SimpleMenuSelect ariaLabel="Bitrate" value={inspectorNode.data.bitrateMode || 'standard'} options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High' }]} onChange={(value) => updateNode(inspectorNode.id, { bitrateMode: value as StudioNodeData['bitrateMode'] })} /></label>}
              {inspectorVideoModel?.family === 'kling' && <><label className="inspector-wide"><span>Negative prompt</span><input value={inspectorNode.data.negativePrompt || ''} onChange={(event) => updateNode(inspectorNode.id, { negativePrompt: event.target.value })} placeholder="Optional exclusions…" /></label><label className="inspector-wide"><span>Prompt guidance · {(inspectorNode.data.guidanceScale ?? 0.5).toFixed(1)}</span><input type="range" min="0" max="1" step="0.1" value={inspectorNode.data.guidanceScale ?? 0.5} onChange={(event) => updateNode(inspectorNode.id, { guidanceScale: Number(event.target.value) })} /></label></>}
              {inspectorVideoModel?.family === 'veo' && <><label className="inspector-wide"><span>Negative prompt</span><input value={inspectorNode.data.negativePrompt || ''} onChange={(event) => updateNode(inspectorNode.id, { negativePrompt: event.target.value })} placeholder="Optional exclusions…" /></label><label><span>Safety tolerance</span><SimpleMenuSelect ariaLabel="Safety tolerance" value={String(inspectorNode.data.safetyTolerance || 4)} options={[1,2,3,4,5,6].map((value) => ({ value: String(value), label: String(value) }))} onChange={(value) => updateNode(inspectorNode.id, { safetyTolerance: Number(value) as StudioNodeData['safetyTolerance'] })} /></label><label className="inspector-switch"><input type="checkbox" checked={Boolean(inspectorNode.data.autoFix)} onChange={(event) => updateNode(inspectorNode.id, { autoFix: event.target.checked })} /><span>Auto-fix rejected prompts</span></label></>}
              <label className="inspector-wide inspector-switch"><input aria-label="Primary native audio" type="checkbox" disabled={!inspectorVideoModel?.nativeAudio} checked={Boolean(inspectorNode.data.generateAudio)} onChange={(event) => updateNode(inspectorNode.id, { generateAudio: event.target.checked })} /><span>Generate native audio</span></label>
            </section> : inspectorNode.data.kind === 'image-editor' ? <section className="inspector-grid">
              <label><span>Format</span><SimpleMenuSelect ariaLabel="Image format" value={inspectorNode.data.outputFormat || 'png'} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, ...(inspectorUsesNanoImage ? [{ value: 'webp', label: 'WebP' }] : [])]} onChange={(value) => updateNode(inspectorNode.id, { outputFormat: value as 'jpeg' | 'png' | 'webp' })} /></label>
              {inspectorUsesNanoImage ? <><label><span>Resolution</span><SimpleMenuSelect ariaLabel="Image resolution" value={inspectorNode.data.imageResolution || '1K'} options={['1K', '2K', '4K'].map((value) => ({ value, label: value }))} onChange={(value) => updateNode(inspectorNode.id, { imageResolution: value as StudioNodeData['imageResolution'] })} /></label><label><span>Safety tolerance</span><SimpleMenuSelect ariaLabel="Safety tolerance" value={String(inspectorNode.data.safetyTolerance || 4)} options={[1,2,3,4,5,6].map((value) => ({ value: String(value), label: String(value) }))} onChange={(value) => updateNode(inspectorNode.id, { safetyTolerance: Number(value) as StudioNodeData['safetyTolerance'] })} /></label><label className="inspector-wide inspector-switch"><input type="checkbox" checked={Boolean(inspectorNode.data.enableWebSearch)} onChange={(event) => updateNode(inspectorNode.id, { enableWebSearch: event.target.checked })} /><span>Enable web search</span></label></> : <><label><span>Safety tolerance</span><SimpleMenuSelect ariaLabel="Safety tolerance" value={String(inspectorNode.data.safetyTolerance || 2)} options={[1,2,3,4,5,6].map((value) => ({ value: String(value), label: String(value) }))} onChange={(value) => updateNode(inspectorNode.id, { safetyTolerance: Number(value) as StudioNodeData['safetyTolerance'] })} /></label><label className="inspector-wide"><span>Guidance · {(inspectorNode.data.guidanceScale || 3.5).toFixed(1)}</span><input type="range" min="1" max="20" step="0.5" value={inspectorNode.data.guidanceScale || 3.5} onChange={(event) => updateNode(inspectorNode.id, { guidanceScale: Number(event.target.value) })} /></label></>}
              <label className="inspector-wide"><span>Seed</span><input type="number" placeholder="Random" value={inspectorNode.data.seed ?? ''} onChange={(event) => updateNode(inspectorNode.id, { seed: event.target.value ? Number(event.target.value) : undefined })} /></label>
              <p className="reference-budget inspector-wide">The source image remains primary. Independent references use Nano Banana Pro editing.</p>
            </section> : inspectorNode.data.kind === 'upscaler' ? <section className="inspector-grid">
              <label className="inspector-wide"><span>Model</span><SimpleMenuSelect service="fal" ariaLabel="Inspector upscaler model" value={inspectorNode.data.upscalerModel || 'clarity-image'} options={[{ value: 'clarity-image', label: 'Clarity Image Upscaler' }, { value: 'realesrgan-video', label: 'RealESRGAN Video Upscaler' }]} onChange={(value) => updateNode(inspectorNode.id, { upscalerModel: value as StudioNodeData['upscalerModel'], outputPath: undefined, outputUrl: undefined, outputType: undefined, generatedResults: undefined, error: undefined })} /></label>
              <label><span>Scale</span><SimpleMenuSelect ariaLabel="Upscale amount" value={String(inspectorNode.data.scale || 2)} options={[2, 3, 4].map((value) => ({ value: String(value), label: `${value}×` }))} onChange={(value) => updateNode(inspectorNode.id, { scale: Number(value) })} /></label>
              {inspectorNode.data.upscalerModel !== 'realesrgan-video' && <><label className="inspector-wide"><span>Creativity · {(inspectorNode.data.creativity ?? 0.35).toFixed(2)}</span><input aria-label="Primary upscaler creativity" type="range" min="0" max="1" step="0.05" value={inspectorNode.data.creativity ?? 0.35} onChange={(event) => updateNode(inspectorNode.id, { creativity: Number(event.target.value) })} /></label><label className="inspector-wide"><span>Resemblance · {(inspectorNode.data.resemblance ?? 0.6).toFixed(2)}</span><input aria-label="Primary upscaler resemblance" type="range" min="0" max="1" step="0.05" value={inspectorNode.data.resemblance ?? 0.6} onChange={(event) => updateNode(inspectorNode.id, { resemblance: Number(event.target.value) })} /></label><label><span>Sampling steps</span><input type="number" min="1" max="100" value={inspectorNode.data.inferenceSteps ?? 18} onChange={(event) => updateNode(inspectorNode.id, { inferenceSteps: Number(event.target.value) })} /></label><label><span>Seed</span><input type="number" placeholder="Random" value={inspectorNode.data.seed ?? ''} onChange={(event) => updateNode(inspectorNode.id, { seed: event.target.value ? Number(event.target.value) : undefined })} /></label></>}
              <p className="reference-budget inspector-wide">Input budget · 1 {inspectorNode.data.upscalerModel === 'realesrgan-video' ? 'video' : 'image'} · output preserves source aspect ratio</p>
            </section> : inspectorNode.data.kind === 'voiceover' && inspectorNode.data.voiceEngine === 'fish-audio' ? <section className="inspector-grid">
              <label><span>Model</span><GroupedMenuSelect catalog className="inspector-field-model-select" ariaLabel="Fish Audio model" value={inspectorNode.data.fishModel || 's2-pro'} groups={[{ label: 'Fish Audio', service: 'fish', options: [...(serviceModels.fish?.models || []).map(model => ({ value: model.id, label: model.label, provider: 'fish' as const, disabled: Boolean(serviceModels.fish?.catalogStale) })), ...(!serviceModels.fish?.models.some(model => model.id === (inspectorNode.data.fishModel || 's2-pro')) ? [{ value: inspectorNode.data.fishModel || 's2-pro', label: `Unavailable (${inspectorNode.data.fishModel || 's2-pro'})`, provider: 'fish' as const, disabled: true }] : [])] }]} onChange={(model) => { if (!serviceModels.fish?.catalogStale && serviceModels.fish?.models.some(item => item.id === model)) updateNode(inspectorNode.id, { fishModel: model }) }} /></label>
              <label><span>Voice reference ID</span><input aria-label="Fish primary voice ID" value={inspectorNode.data.fishReferenceId || ''} onChange={(event) => updateNode(inspectorNode.id, { fishReferenceId: event.target.value })} placeholder="Fish voice model ID" /></label>
              <label className="inspector-wide"><span>Expressiveness · {(inspectorNode.data.fishTemperature ?? 0.7).toFixed(2)}</span><input type="range" min="0" max="1" step="0.05" value={inspectorNode.data.fishTemperature ?? 0.7} onChange={(event) => updateNode(inspectorNode.id, { fishTemperature: Number(event.target.value) })} /></label>
              <label className="inspector-wide"><span>Diversity · {(inspectorNode.data.fishTopP ?? 0.7).toFixed(2)}</span><input type="range" min="0" max="1" step="0.05" value={inspectorNode.data.fishTopP ?? 0.7} onChange={(event) => updateNode(inspectorNode.id, { fishTopP: Number(event.target.value) })} /></label>
              <label className="inspector-wide"><span>Speed · {(inspectorNode.data.speed ?? 1).toFixed(2)}×</span><input aria-label="Fish primary speed" type="range" min="0.5" max="2" step="0.05" value={inspectorNode.data.speed ?? 1} onChange={(event) => updateNode(inspectorNode.id, { speed: Number(event.target.value) })} /></label>
              <label><span>Volume · {inspectorNode.data.fishVolume ?? 0} dB</span><input aria-label="Fish primary volume" type="range" min="-20" max="20" step="1" value={inspectorNode.data.fishVolume ?? 0} onChange={(event) => updateNode(inspectorNode.id, { fishVolume: Number(event.target.value) })} /></label>
              <label><span>Format</span><SimpleMenuSelect ariaLabel="Fish audio format" value={inspectorNode.data.fishFormat || 'mp3'} options={FISH_AUDIO_FORMATS.map((value) => ({ value, label: value.toUpperCase() }))} onChange={(value) => updateNode(inspectorNode.id, { fishFormat: value as StudioNodeData['fishFormat'] })} /></label>
              <label><span>Sample rate</span><SimpleMenuSelect ariaLabel="Fish sample rate" value={inspectorNode.data.fishSampleRate === undefined ? '@default' : String(inspectorNode.data.fishSampleRate)} options={fishSampleRateOptions(inspectorNode.data.fishFormat, inspectorNode.data.fishSampleRate)} onChange={(value) => updateNode(inspectorNode.id, { fishSampleRate: value === '@default' ? undefined : Number(value) })} /></label>
              {(inspectorNode.data.fishFormat || 'mp3') === 'mp3' && <label><span>MP3 bitrate</span><SimpleMenuSelect ariaLabel="Fish MP3 bitrate" value={String(inspectorNode.data.fishMp3Bitrate ?? 128)} options={fishBitrateOptions('mp3', inspectorNode.data.fishMp3Bitrate ?? 128)} onChange={(value) => updateNode(inspectorNode.id, { fishMp3Bitrate: Number(value) as StudioNodeData['fishMp3Bitrate'] })} /></label>}
              {inspectorNode.data.fishFormat === 'opus' && <label><span>Opus bitrate</span><SimpleMenuSelect ariaLabel="Fish Opus bitrate" value={String(inspectorNode.data.fishOpusBitrate ?? -1000)} options={fishBitrateOptions('opus', inspectorNode.data.fishOpusBitrate ?? -1000)} onChange={(value) => updateNode(inspectorNode.id, { fishOpusBitrate: Number(value) as StudioNodeData['fishOpusBitrate'] })} /></label>}
              <label><span>Chunk length</span><input type="number" min="100" max="300" value={inspectorNode.data.fishChunkLength ?? 300} onChange={(event) => updateNode(inspectorNode.id, { fishChunkLength: Number(event.target.value) })} /></label>
              <label><span>Latency</span><SimpleMenuSelect ariaLabel="Latency" value={inspectorNode.data.fishLatency || 'normal'} options={[...FISH_LATENCY_OPTIONS]} onChange={(value) => updateNode(inspectorNode.id, { fishLatency: value as StudioNodeData['fishLatency'] })} /></label>
              <label className="inspector-wide inspector-switch"><input type="checkbox" checked={inspectorNode.data.fishNormalize !== false} onChange={(event) => updateNode(inspectorNode.id, { fishNormalize: event.target.checked })} /><span>Normalize text</span></label>
              {inspectorNode.data.fishModel !== 's1' && <label className="inspector-wide inspector-switch"><input type="checkbox" checked={inspectorNode.data.fishNormalizeLoudness !== false} onChange={(event) => updateNode(inspectorNode.id, { fishNormalizeLoudness: event.target.checked })} /><span>Normalize loudness</span></label>}
              <p className="reference-budget inspector-wide">Fish Audio uses its own API key and dynamic voice Reference ID. Only controls supported by Fish are shown.</p>
            </section> : inspectorNode.data.kind === 'voiceover' ? <section className={`inspector-grid ${inspectorElevenDirect ? 'direct-eleven-settings' : ''}`}>
              {inspectorElevenDirect ? <>
                <label><span>Language</span><DirectElevenLanguageSelect data={inspectorNode.data} availability={serviceModels.elevenlabs} onChange={(patch) => updateNode(inspectorNode.id, patch)} /></label>
              </> : <>
              <label><span>Voice</span><SimpleMenuSelect ariaLabel="ElevenLabs voice" value={(ELEVEN_V3_BUILT_IN_VOICES as readonly string[]).includes(inspectorNode.data.voice === undefined ? 'Rachel' : inspectorNode.data.voice) ? inspectorNode.data.voice === undefined ? 'Rachel' : inspectorNode.data.voice : '__custom'} options={[...ELEVEN_V3_BUILT_IN_VOICES.map((voice) => ({ value: voice, label: voice })), { value: '__custom', label: 'Custom voice name / ID' }]} onChange={(voice) => updateNode(inspectorNode.id, { voice: voice === '__custom' ? '' : voice })} /></label>
              {!(ELEVEN_V3_BUILT_IN_VOICES as readonly string[]).includes(inspectorNode.data.voice === undefined ? 'Rachel' : inspectorNode.data.voice) && <label><span>Custom voice</span><input aria-label="Custom ElevenLabs voice" value={inspectorNode.data.voice || ''} onChange={(event) => updateNode(inspectorNode.id, { voice: event.target.value })} placeholder="ElevenLabs voice name or ID" /></label>}
              <label><span>Language</span><SimpleMenuSelect className="inspector-field-model-select inspector-language-select" menuClassName="voice-language-menu" ariaLabel="Voice language" value={normalizedElevenV3LanguageCode(inspectorNode.data.languageCode) || 'eng'} options={[...ELEVEN_V3_LANGUAGES]} onChange={(languageCode) => updateNode(inspectorNode.id, { languageCode })} /></label>
              </>}
              {!inspectorElevenDirect && <label className="inspector-wide"><span>Stability · {(inspectorNode.data.stability ?? 0.5).toFixed(2)}</span><input type="range" min="0" max="1" step="0.05" value={inspectorNode.data.stability ?? 0.5} onChange={(event) => updateNode(inspectorNode.id, { stability: Number(event.target.value) })} /></label>}
              {!inspectorElevenDirect && <label className="inspector-wide"><span>Similarity · {(inspectorNode.data.similarityBoost ?? 0.75).toFixed(2)}</span><input type="range" min="0" max="1" step="0.05" value={inspectorNode.data.similarityBoost ?? 0.75} onChange={(event) => updateNode(inspectorNode.id, { similarityBoost: Number(event.target.value) })} /></label>}
              {(!inspectorElevenDirect || !isElevenDialogue(inspectorNode.data) && elevenSupportsSpeed(inspectorNode.data.voiceModelId)) && <label className="inspector-wide"><span>Speed · {(inspectorNode.data.speed ?? 1).toFixed(2)}×</span><input aria-label="Eleven primary speed" type="range" min={inspectorElevenDirect ? '0.25' : '0.7'} max={inspectorElevenDirect ? '4' : '1.2'} step="0.05" value={inspectorNode.data.speed ?? 1} onChange={(event) => updateNode(inspectorNode.id, { speed: Number(event.target.value) })} /></label>}
              {inspectorElevenDirect && elevenSupportsSpeed(inspectorNode.data.voiceModelId) && !isElevenDialogue(inspectorNode.data) && inspectorElevenModel?.supportsStyle && <label className="inspector-wide"><span>Voice style · {(inspectorNode.data.voiceStyle ?? 0).toFixed(2)}</span><input aria-label="ElevenLabs voice style" type="range" min="0" max="1" step="0.05" value={inspectorNode.data.voiceStyle ?? 0} onChange={(event) => updateNode(inspectorNode.id, { voiceStyle: Number(event.target.value) })} /></label>}
              <label><span>Text normalization</span><SimpleMenuSelect ariaLabel="Text normalization" value={inspectorNode.data.textNormalization || 'auto'} options={[...ELEVEN_TEXT_NORMALIZATION_OPTIONS]} onChange={(value) => updateNode(inspectorNode.id, { textNormalization: value as StudioNodeData['textNormalization'] })} /></label>
              <label><span>Output</span><SimpleMenuSelect ariaLabel="Output format" value={inspectorNode.data.audioOutputFormat || 'mp3_44100_128'} options={(inspectorElevenDirect ? ELEVEN_DIRECT_OUTPUT_FORMATS : AUDIO_OUTPUT_FORMATS).map((format) => ({ value: format, label: inspectorElevenDirect ? directAudioFormatLabel(format) : format }))} onChange={(value) => updateNode(inspectorNode.id, { audioOutputFormat: value })} /></label>
              <label><span>Seed</span><input type="number" placeholder="Random" value={inspectorNode.data.voiceSeed ?? ''} onChange={(event) => updateNode(inspectorNode.id, { voiceSeed: event.target.value ? Number(event.target.value) : undefined })} /></label>
              <label className="inspector-switch"><input type="checkbox" checked={inspectorNode.data.voiceTimestamps !== false} onChange={(event) => updateNode(inspectorNode.id, { voiceTimestamps: event.target.checked })} /><span>Return timestamps</span></label>
              <label className="inspector-wide"><span>Previous text · continuity context</span><textarea value={inspectorNode.data.previousText || ''} onChange={(event) => updateNode(inspectorNode.id, { previousText: event.target.value })} /></label>
              <label className="inspector-wide"><span>Next text · continuity context</span><textarea value={inspectorNode.data.nextText || ''} onChange={(event) => updateNode(inspectorNode.id, { nextText: event.target.value })} /></label>
            </section> : inspectorNode.data.kind === 'sound-effects' ? <section className="inspector-grid">
              <label><span>Duration</span><SimpleMenuSelect ariaLabel="Sound effect duration" value={String(inspectorNode.data.duration || 5)} options={(inspectorNode.data.audioProvider === 'elevenlabs' ? [0.5,1,2,3,5,8,10,15,22,30] : [0.5,1,2,3,5,8,10,15,22]).map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))} onChange={(value) => updateNode(inspectorNode.id, { duration: Number(value) })} /></label>
              <label className="inspector-switch"><input aria-label="Sound primary loop" type="checkbox" checked={Boolean(inspectorNode.data.loop)} onChange={(event) => updateNode(inspectorNode.id, { loop: event.target.checked })} /><span>Seamless loop</span></label>
              <label className="inspector-wide"><span>Prompt influence · {(inspectorNode.data.promptInfluence ?? 0.3).toFixed(2)}</span><input type="range" min="0" max="1" step="0.05" value={inspectorNode.data.promptInfluence ?? 0.3} onChange={(event) => updateNode(inspectorNode.id, { promptInfluence: Number(event.target.value) })} /></label>
              <label className="inspector-wide"><span>Output format</span><SimpleMenuSelect ariaLabel="Sound effect output format" value={inspectorNode.data.audioOutputFormat || 'mp3_44100_128'} options={(inspectorNode.data.audioProvider === 'elevenlabs' ? ELEVEN_DIRECT_OUTPUT_FORMATS : AUDIO_OUTPUT_FORMATS).map((format) => ({ value: format, label: inspectorNode.data.audioProvider === 'elevenlabs' ? directAudioFormatLabel(format) : format }))} onChange={(value) => updateNode(inspectorNode.id, { audioOutputFormat: value })} /></label>
            </section> : <section className="inspector-grid">
              <label><span>Duration</span><SimpleMenuSelect ariaLabel="Music duration" value={String(inspectorNode.data.duration || 30)} options={[10,15,30,45,60,90,120,180,300,600].map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))} onChange={(value) => updateNode(inspectorNode.id, { duration: Number(value) })} /></label>
              <label className="inspector-switch"><input type="checkbox" checked={Boolean(inspectorNode.data.forceInstrumental)} onChange={(event) => updateNode(inspectorNode.id, { forceInstrumental: event.target.checked })} /><span>Instrumental only</span></label>
              <label className="inspector-wide"><span>Output format</span><SimpleMenuSelect ariaLabel="Music output format" value={inspectorNode.data.audioOutputFormat || 'mp3_44100_128'} options={AUDIO_OUTPUT_FORMATS.map((format) => ({ value: format, label: format }))} onChange={(value) => updateNode(inspectorNode.id, { audioOutputFormat: value })} /></label>
            </section>}
            {inspectorRequest && !inspectorRequest.higgsfieldNative && ['image-generator', 'video-generator'].includes(inspectorRequest.kind) && <section className="inspector-section inspector-direction-layer">
              <label className="inspector-direction-layer-toggle">
                <span><strong>Direction Layer</strong><small>Adds cinematography and story-beat guidance where your prompt and connected assets are silent.</small></span>
                <input type="checkbox" checked={inspectorNode.data.directionLayer !== false} onChange={(event) => updateNode(inspectorNode.id, { directionLayer: event.target.checked })} />
              </label>
            </section>}
            {inspectorNode.data.kind === 'video-generator' && !inspectorNode.data.higgsfieldNative && <section className="inspector-section inspector-shot-locks">
              <label>SHOT LOCKS</label>
              <textarea value={inspectorNode.data.shotLocks || ''} placeholder="hero stays frame-left; only the helmsman touches the wheel; door closed until cut 4" onChange={(event) => updateNode(inspectorNode.id, { shotLocks: event.target.value })} />
              <small>Appended verbatim to POSITIVE LOCKS and never removed by prompt budgeting.</small>
            </section>}
            {inspectorNode.data.kind === 'video-generator' && !inspectorNode.data.higgsfieldNative && <section className="inspector-section inspector-sequence-runner">
              <label className="inspector-direction-layer-toggle">
                <span><strong>Shot Sequence</strong><small>Render opted-in Video Generators in order and lock each final frame into the next shot.</small></span>
                <input type="checkbox" checked={Boolean(inspectorNode.data.sequenceEnabled)} onChange={(event) => updateNode(inspectorNode.id, { sequenceEnabled: event.target.checked, sequenceOrder: inspectorNode.data.sequenceOrder || sequenceNodes.length + 1, sequenceStatus: 'idle' })} />
              </label>
              {inspectorNode.data.sequenceEnabled && <div className="inspector-sequence-actions"><label><span>Order</span><input aria-label="Sequence shot order" type="number" min="1" step="1" value={inspectorNode.data.sequenceOrder || 1} onChange={(event) => updateNode(inspectorNode.id, { sequenceOrder: Math.max(1, Number(event.target.value) || 1) })} /></label><button type="button" disabled={sequenceNodes.length < 2 || sequenceRunning} onClick={() => void runSequence()}>{sequenceRunning ? 'Running Sequence…' : `Run ${sequenceNodes.length} Shot Sequence`}</button></div>}
              {inspectorNode.data.sequenceStatus === 'failed' && <p className="reference-budget">This shot failed. Downstream shots and their inputs were not changed.</p>}
            </section>}
            <ProviderPromptPreview request={inspectorRequest} inspectionError={inspectorInspection.error} />
            {inspectorInspection.error && <section className="inspector-validation-error" role="alert">
              <strong>Connection Needs Attention</strong>
              <p>{inspectorInspection.error}</p>
              <small>Options remain available. Repair or remove the incompatible connection before running.</small>
            </section>}
          </div>
          <footer><button className="footer-reset" onClick={() => resetNodeSettings(inspectorNode.id)}><RotateCcw size={12} /><span>Reset All</span></button><PlayTooltip tooltip={inspectorRunTooltip} persistent={inspectorRunning} disabled={!inspectorRunning && Boolean(inspectorRunReadiness?.disabled)}><button type="button" className={`footer-run ${inspectorRunning ? 'is-running' : inspectorRerun ? 'is-rerun' : 'is-ready'} ${inspectorRunReadiness?.disabled ? 'is-access-blocked' : ''}`} aria-label={inspectorRunning ? 'Stop' : inspectorRerun ? 'Rerun' : 'Run'} onClick={() => inspectorRunning ? stopNode(inspectorNode.id) : runNode(inspectorNode.id)} disabled={!inspectorRunning && Boolean(inspectorRunReadiness?.disabled)}>{inspectorRunning ? <><StopIcon /><span>Stop</span></> : inspectorRerun ? <><RerunIcon size={12} /><span>Rerun</span></> : <><Play size={12} fill="currentColor" /><span>Run</span></>}</button></PlayTooltip></footer>
        </aside>
      )}

      {paletteOpen && (
        <div className="palette-backdrop" onMouseDown={() => setPaletteOpen(false)}>
          <section className="command-palette" onMouseDown={(event) => event.stopPropagation()}>
            <div className="palette-search"><Search size={17} /><input autoFocus value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} placeholder="Search nodes and models…" /><kbd>esc</kbd></div>
            <div className="palette-label"><span>CREATE</span><span>{filteredPalette.length} nodes</span></div>
            <div className="palette-list">
              {filteredPalette.map((item, index) => {
                const Icon = item.icon
                return <Fragment key={item.kind}>
                  {!paletteQuery.trim() && index === POPULAR_NODE_KINDS.length && <div className="palette-fine-separator" role="separator" />}
                  <button onClick={() => addNode(item.kind)}><span className="palette-icon"><Icon size={17} /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><Plus size={15} /></button>
                </Fragment>
              })}
            </div>
            <footer><span><kbd>N</kbd> open</span><span><kbd>⌘K</kbd> command</span><span><Command size={12} /> Local-first</span></footer>
          </section>
        </div>
      )}

      {appView === 'canvas' && (
        <aside className={`side-panel canvas-assets-panel ${assetBrowserOpen ? 'is-open' : ''}`} aria-hidden={!assetBrowserOpen} inert={!assetBrowserOpen} onPointerDownCapture={() => { keyboardSelectionScope.current = 'library' }}>
          <header><div><AssetLibraryIcon size={17} /><span><small>CANVAS</small><strong>Assets</strong></span></div><button title="Close Assets" aria-label="Close Assets" onClick={() => setAssetBrowserOpen(false)}><PanelLeftClose size={17} /></button></header>
          <nav className="canvas-asset-types" aria-label="Asset Types" onWheel={(event) => {
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
            event.currentTarget.scrollLeft += event.deltaY
            event.preventDefault()
          }} onPointerDown={(event) => { if (event.button !== 0) return; assetTypeRailDidDrag.current = false; assetTypeRailDrag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft } }} onPointerMove={(event) => { const drag = assetTypeRailDrag.current; if (!drag || drag.pointerId !== event.pointerId) return; const distance = event.clientX - drag.startX; if (!assetTypeRailDidDrag.current && Math.abs(distance) <= 8) return; if (!assetTypeRailDidDrag.current) { assetTypeRailDidDrag.current = true; event.currentTarget.setPointerCapture(event.pointerId) }; event.preventDefault(); event.currentTarget.scrollLeft = drag.scrollLeft - distance }} onPointerUp={(event) => { assetTypeRailDrag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={() => { assetTypeRailDrag.current = null; assetTypeRailDidDrag.current = false }}>
            {([
              { type: 'all', label: 'All', icon: ASSET_TYPE_ICONS.all }, { type: 'character', label: 'Characters', icon: ASSET_TYPE_ICONS.character }, { type: 'wardrobe', label: 'Wardrobes', icon: ASSET_TYPE_ICONS.wardrobe }, { type: 'element', label: 'Elements', icon: ASSET_TYPE_ICONS.element }, { type: 'location', label: 'Locations', icon: ASSET_TYPE_ICONS.location }, { type: 'style', label: 'Styles', icon: ASSET_TYPE_ICONS.style }, { type: 'storyboard', label: 'Storyboards', icon: ASSET_TYPE_ICONS.storyboard }, { type: 'image', label: 'Images', icon: ASSET_TYPE_ICONS.image }, { type: 'video', label: 'Videos', icon: ASSET_TYPE_ICONS.video }, { type: 'audio', label: 'Audio', icon: ASSET_TYPE_ICONS.audio },
            ] as Array<{ type: AssetTypeFilter; label: string; icon: typeof Images }>).map(({ type, label, icon: AssetIcon }) => <button key={type} className={assetTypeFilter === type ? 'is-active' : ''} onClick={() => { if (!assetTypeRailDidDrag.current) setAssetTypeFilter(type); assetTypeRailDidDrag.current = false }}><AssetIcon size={13} />{label}</button>)}
          </nav>
          <div className="canvas-asset-filters">
            <label><Search size={13} /><input value={assetSearch} placeholder="Search Assets" onChange={(event) => setAssetSearch(event.target.value)} />{assetSearch && <button title="Clear Search" onClick={() => setAssetSearch('')}><X size={11} /></button>}</label>
            <div><button className={assetOriginFilter === 'all' ? 'is-active' : ''} onClick={() => setAssetOriginFilter('all')}>All</button><button className={assetOriginFilter === 'imported' ? 'is-active' : ''} onClick={() => setAssetOriginFilter('imported')}>Imported</button><button className={assetOriginFilter === 'generated' ? 'is-active' : ''} onClick={() => setAssetOriginFilter('generated')}>Generated</button></div>
          </div>
          <div className={`canvas-asset-sticky-actions ${selectedManagedAssetDeletion.selectionCount > 0 ? 'has-delete' : ''}`}><button className="creation-action" onClick={() => void importAssetPackage()}><Upload size={13} />Import Asset</button><button className="is-primary creation-action" onClick={createFromAssetSection}><Plus size={13} />{canvasAssetCreateLabel}</button>{selectedManagedAssetDeletion.selectionCount > 0 && <button className="canvas-asset-delete-selected" onClick={requestSelectedManagedAssetDelete}><Trash2 size={13} />Delete {selectedManagedAssetDeletion.selectionCount}</button>}</div>
          <div className="canvas-asset-list">
            {assetTypeFilter === 'style' && visibleBuiltInStyles.map((preset) => <article key={preset.id} className={`canvas-style-preset ${selectedAssetKeys.includes(`built-in-style:${preset.id}`) ? 'is-selected' : ''}`} onDragStart={(event) => beginCanvasAssetDrag(event, { kind: 'built-in-style', presetId: preset.id }, preset.title, 'Built-in Style')}>
              <button className="canvas-asset-thumb" draggable aria-pressed={selectedAssetKeys.includes(`built-in-style:${preset.id}`)} data-tooltip={`Select ${preset.title} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, `built-in-style:${preset.id}`)}><img src={preset.thumbnail} alt={preset.title} loading="lazy" decoding="async" style={{ objectPosition: preset.focalPosition }} /></button>
              <button className="canvas-asset-info" draggable aria-pressed={selectedAssetKeys.includes(`built-in-style:${preset.id}`)} data-tooltip={`Select ${preset.title} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, `built-in-style:${preset.id}`)}><strong>{preset.title}</strong><small>Built-in Style</small></button>
            </article>)}
            {assetTypeFilter === 'style' && visibleSavedStyleLibraryItems.map((item) => { const key = `project-node:${item.pageId}:${item.node.id}`; return <article key={item.node.id} className={`canvas-style-preset ${selectedAssetKeys.includes(key) ? 'is-selected' : ''}`} onDragStart={(event) => beginCanvasAssetDrag(event, { kind: 'project-node', nodeId: item.node.id, pageId: item.pageId }, item.node.data.title, item.node.data.styleDescription || 'My Preset Style')}>
              <button className="canvas-asset-thumb" draggable aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={`Select ${item.node.data.title} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, key)}>{item.previewUrl ? item.previewMimeType?.startsWith('video/') ? <video src={item.previewUrl} muted preload="metadata" /> : <img src={item.previewUrl} alt={item.node.data.title} loading="lazy" decoding="async" /> : <Palette size={20} />}</button>
              <button className="canvas-asset-info" draggable aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={`Select ${item.node.data.title} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, key)}><strong>{item.node.data.title}</strong><small title={item.node.data.styleDescription}>{item.node.data.styleDescription || 'My Preset Style'}</small></button>
              <div className="canvas-asset-actions"><button disabled={!item.previewAsset} title="Show Preset Style In Finder" onClick={() => item.previewAsset && void window.prism.assets.reveal(item.previewAsset.id)}><FolderOpen size={12} /></button><button disabled={!item.previewAsset?.path} title="Export Preset Style" onClick={() => void exportSavedStylePreset(item)}><Upload size={12} /></button><button className="is-danger" title="Delete Preset Style" onClick={() => requestDelete({ category: 'asset', title: 'Delete Preset Style?', message: `Delete “${item.node.data.title}” from this project's preset library?`, confirmLabel: 'Delete Preset', action: () => deleteSavedStylePreset(item.node.id, item.pageId) })}><Trash2 size={12} /></button></div>
            </article>})}
            {assetTypeFilter === 'style' && visibleGlobalStyleAssets.map((asset) => <article key={asset.id} className={`canvas-style-preset ${selectedAssetKeys.includes(`style-asset:${asset.id}`) ? 'is-selected' : ''}`} onDragStart={(event) => beginCanvasAssetDrag(event, { kind: 'style-asset', assetId: asset.id }, assetDisplayName(asset), 'My Preset Style')}>
              <button className="canvas-asset-thumb" draggable aria-pressed={selectedAssetKeys.includes(`style-asset:${asset.id}`)} data-tooltip={`Select ${assetDisplayName(asset)} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, `style-asset:${asset.id}`)}>{asset.url ? <img src={asset.url} alt={asset.name} loading="lazy" decoding="async" /> : <Palette size={20} />}</button>
              {renamingAssetId === asset.id ? <div className="canvas-asset-info"><input autoFocus value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => void renameSemanticAssetCollection([asset])} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); else if (event.key === 'Escape') { setRenamingAssetId(null); setRenameDraft('') } }} /></div> : <button className="canvas-asset-info" draggable aria-pressed={selectedAssetKeys.includes(`style-asset:${asset.id}`)} data-tooltip={`Select ${assetDisplayName(asset)} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, `style-asset:${asset.id}`)} onDoubleClick={(event) => { event.stopPropagation(); setRenamingAssetId(asset.id); setRenameDraft(assetDisplayName(asset)) }}><strong>{assetDisplayName(asset)}</strong><small>My Preset Style</small></button>}
              <div className="canvas-asset-actions"><button title="Show Preset Style In Finder" onClick={() => void window.prism.assets.reveal(asset.id)}><FolderOpen size={12} /></button><button title="Rename Preset Style" onClick={() => { setRenamingAssetId(asset.id); setRenameDraft(assetDisplayName(asset)) }}><PencilLine size={12} /></button><button title="Export Preset Style" onClick={() => void window.prism.assets.exportPackage(asset.id)}><Upload size={12} /></button><button className="is-danger" title="Delete Preset Style" onClick={() => requestManagedAssetDelete([asset], assetDisplayName(asset))}><Trash2 size={12} /></button></div>
            </article>)}
            {assetTypeFilter === 'storyboard' && storyboardLibraryItems.map(({ node, pageId }) => { const key = `project-node:${pageId}:${node.id}`; return <article key={node.id} className={`canvas-storyboard-asset ${selectedAssetKeys.includes(key) ? 'is-selected' : ''}`} onDragStart={(event) => beginCanvasAssetDrag(event, { kind: 'project-node', nodeId: node.id, pageId }, node.data.title, `${node.data.storyboardPanels?.length || 0} Panels · ${node.data.storyboardDuration || 0}s`)}>
              <button className="canvas-asset-thumb" draggable aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={`Select ${node.data.title} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, key)}><Clapperboard size={20} /></button>
              <button className="canvas-asset-info" draggable aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={`Select ${node.data.title} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, key)}><strong>{node.data.title}</strong><small>{node.data.storyboardPanels?.length || 0} Panels · {node.data.storyboardDuration || 0}s</small></button>
            </article>})}
            {assetTypeFilter !== 'style' && assetTypeFilter !== 'storyboard' && semanticAssetCollections.map((collection) => { const key = `semantic:${collection.key}`; const missingAsset = collection.assets.find((asset) => missingAssetIds.includes(asset.id)); const linkState = missingAsset ? assetVisualState(missingAsset.id) : collection.assets.map((asset) => assetVisualState(asset.id)).find((state) => state === 'found'); return <article key={collection.key} className={`${selectedAssetKeys.includes(key) ? 'is-selected' : ''} ${linkState === 'offline' || linkState === 'finding' ? 'is-offline' : linkState === 'found' ? 'is-found' : ''}`} onDoubleClick={(event) => { if ((event.target as HTMLElement).closest('.canvas-asset-actions, input') || !['character', 'location'].includes(collection.category) || missingAsset) return; event.preventDefault(); openAssetMedia(collection.previewAssets.map((asset) => asset.id)) }} onDragStart={(event) => { if (!missingAsset) beginCanvasAssetDrag(event, { kind: 'semantic', key: collection.key }, collection.name, `${collection.assets.length} ${collection.category[0].toUpperCase() + collection.category.slice(1)} View${collection.assets.length === 1 ? '' : 's'}`) }}>
              <button className="canvas-asset-thumb semantic-collection-preview" draggable={!missingAsset} aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={missingAsset ? 'Find missing media before deployment' : `Select ${collection.name} · drag to Canvas to deploy`} data-tooltip-delay="1500" data-preview-count={collection.previewAssets.length} data-asset-category={collection.category} onClick={(event) => missingAsset ? void relinkAsset(missingAsset.id) : selectVisibleAsset(event, key)}>{collection.previewAssets.map((asset) => missingAssetIds.includes(asset.id) ? <MediaOfflineState key={asset.id} compact showFind={false} mediaFamily={(mediaFamily(asset.mimeType) || 'image') as AssetMediaFamily} state={assetVisualState(asset.id) || 'offline'} findingDots={findingDots} onFind={() => void relinkAsset(asset.id)} /> : asset.url ? <img key={asset.id} src={asset.url} alt={asset.metadata?.characterView || asset.metadata?.elementView || asset.name} loading="lazy" decoding="async" data-character-view={collection.category === 'character' ? asset.metadata?.characterView : undefined} style={{ objectPosition: previewFocalPosition(asset, collection.category === 'character') }} /> : <span key={asset.id}><AssetTypeGlyph type={collection.category} size={12} /></span>)}</button>
              {renamingAssetId === collection.assets[0].id ? <div className="canvas-asset-info"><input autoFocus value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => void renameSemanticAssetCollection(collection.assets)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); else if (event.key === 'Escape') { setRenamingAssetId(null); setRenameDraft('') } }} /></div> : <button className="canvas-asset-info" draggable={!missingAsset} aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={missingAsset ? 'Find missing media before deployment' : `Select ${collection.name} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => selectVisibleAsset(event, key)} onDoubleClick={(event) => { event.stopPropagation(); setRenamingAssetId(collection.assets[0].id); setRenameDraft(collection.name) }}><strong>{collection.name}</strong><small>{linkState === 'finding' ? `Finding${'.'.repeat(findingDots)}` : linkState === 'found' ? 'Found' : linkState === 'offline' ? 'Media Offline' : `${collection.assets.length} ${collection.category} view${collection.assets.length === 1 ? '' : 's'}`}</small></button>}
              <div className="canvas-asset-actions"><button title={missingAsset ? 'Find Missing Asset' : 'Show Reusable Asset In Finder'} onClick={() => missingAsset ? void relinkAsset(missingAsset.id) : void window.prism.assets.revealCollection(collection.assets[0].id)}>{missingAsset ? <Unlink size={12} /> : <FolderOpen size={12} />}</button><button title="Rename Reusable Asset" onClick={() => { setRenamingAssetId(collection.assets[0].id); setRenameDraft(collection.name) }}><PencilLine size={12} /></button><button title={collection.assets.every((asset) => asset.favorite) ? 'Remove From Favorites' : 'Add To Favorites'} className={collection.assets.every((asset) => asset.favorite) ? 'is-active' : ''} onClick={() => void favoriteSemanticAssetCollection(collection.assets, !collection.assets.every((asset) => asset.favorite))}><Heart size={12} fill={collection.assets.every((asset) => asset.favorite) ? 'currentColor' : 'none'} /></button><button className="is-danger" title="Delete Reusable Asset" onClick={() => requestManagedAssetDelete(collection.assets, collection.name)}><Trash2 size={12} /></button></div>
            </article>})}
            {assetTypeFilter !== 'style' && assetTypeFilter !== 'storyboard' && ungroupedHomeAssets.map((asset) => { const key = `media:${asset.id}`; const linkState = assetVisualState(asset.id); const offline = missingAssetIds.includes(asset.id); return <article key={asset.id} className={`${selectedAssetKeys.includes(key) ? 'is-selected' : ''} ${linkState === 'offline' || linkState === 'finding' ? 'is-offline' : linkState === 'found' ? 'is-found' : ''}`} onDoubleClick={(event) => { if ((event.target as HTMLElement).closest('.canvas-asset-actions, input') || offline) return; event.preventDefault(); openAssetMedia([asset.id]) }} onDragStart={(event) => { if (!offline) beginCanvasAssetDrag(event, { kind: 'media', assetId: asset.id, mediaFamily: (mediaFamily(asset.mimeType) || 'image') as AssetMediaFamily }, assetDisplayName(asset), asset.category || asset.origin || 'Media') }}>
              <button className="canvas-asset-thumb" draggable={!offline} aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={offline ? 'Find missing media before deployment' : `Select ${assetDisplayName(asset)} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => offline ? void relinkAsset(asset.id) : selectVisibleAsset(event, key)}>{offline ? <MediaOfflineState compact showFind={false} mediaFamily={(mediaFamily(asset.mimeType) || 'image') as AssetMediaFamily} state={linkState || 'offline'} findingDots={findingDots} onFind={() => void relinkAsset(asset.id)} /> : asset.mimeType.startsWith('image/') ? <img src={asset.url} alt={asset.name} loading="lazy" decoding="async" /> : asset.mimeType.startsWith('video/') ? <video src={asset.url} muted preload="metadata" /> : <AudioLines size={20} />}</button>
              {renamingAssetId === asset.id ? <div className="canvas-asset-info"><input autoFocus value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => void renameAsset(asset.id)} onKeyDown={(event) => { if (event.key === 'Enter') void renameAsset(asset.id); else if (event.key === 'Escape') { setRenamingAssetId(null); setRenameDraft('') } }} /></div> : <button className="canvas-asset-info" draggable={!offline} aria-pressed={selectedAssetKeys.includes(key)} data-tooltip={offline ? 'Find missing media before deployment' : `Select ${assetDisplayName(asset)} · drag to Canvas to deploy`} data-tooltip-delay="1500" onClick={(event) => offline ? void relinkAsset(asset.id) : selectVisibleAsset(event, key)}><strong>{assetDisplayName(asset)}</strong><small>{linkState === 'finding' ? `Finding${'.'.repeat(findingDots)}` : linkState === 'found' ? 'Found' : linkState === 'offline' ? 'Media Offline' : asset.category || asset.origin}</small></button>}
              <div className="canvas-asset-actions"><button title={offline ? 'Find Missing Asset' : 'Show Asset In Finder'} onClick={() => offline ? void relinkAsset(asset.id) : void window.prism.assets.reveal(asset.id)}>{offline ? <Unlink size={12} /> : <FolderOpen size={12} />}</button><button title="Rename Asset" onClick={() => { setRenamingAssetId(asset.id); setRenameDraft(mediaRenameStem(assetDisplayName(asset))) }}><PencilLine size={12} /></button><button title={asset.favorite ? 'Remove From Favorites' : 'Add To Favorites'} className={asset.favorite ? 'is-active' : ''} onClick={() => void updateAssetState(asset.id, { favorite: !asset.favorite })}><Heart size={12} fill={asset.favorite ? 'currentColor' : 'none'} /></button><button className="is-danger" title="Delete Asset" onClick={() => requestManagedAssetDelete([asset], assetDisplayName(asset))}><Trash2 size={12} /></button></div>
            </article>})}
            {assetTypeFilter === 'style' ? !visibleBuiltInStyles.length && !visibleSavedStyleLibraryItems.length && !visibleGlobalStyleAssets.length && <div className="panel-empty"><AssetTypeGlyph type="style" size={24} /><p>No matching styles.</p></div> : assetTypeFilter === 'storyboard' ? !storyboardLibraryItems.length && <div className="panel-empty"><AssetTypeGlyph type="storyboard" size={24} /><p>No Storyboards yet.</p></div> : !semanticAssetCollections.length && !ungroupedHomeAssets.length && <div className="panel-empty"><AssetTypeGlyph type={assetTypeFilter} size={24} /><p>No matching assets.</p></div>}
          </div>
        </aside>
      )}

      {generatedMediaViewer && viewerResult && (
        <div className="generated-media-viewer" role="dialog" aria-modal="true" aria-label={`Full resolution ${viewerResult.type} viewer`} onMouseDown={() => setGeneratedMediaViewer(null)}>
          <section style={viewerMediaInfo.width && viewerMediaInfo.height ? (() => {
            const ratio = viewerMediaInfo.width! / viewerMediaInfo.height!
            const maxWidth = Math.min(1420, viewerViewport.width * .96)
            const maxHeight = Math.min(920, viewerViewport.height * .92)
            const width = Math.min(maxWidth, maxHeight * ratio)
            return { width, height: width / ratio, aspectRatio: `${viewerMediaInfo.width} / ${viewerMediaInfo.height}` }
          })() : undefined} onMouseDown={(event) => event.stopPropagation()}>
            <div className="generated-media-viewer-stage">
              {viewerResult.type === 'image' ? <img src={viewerResult.url} alt={viewerTitle} draggable={false} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setViewerMediaContextMenu({ x: event.clientX, y: event.clientY }) }} onLoad={(event) => setViewerMediaInfo({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
                : viewerResult.type === 'video' ? <video src={viewerResult.url} controls autoPlay={false} preload="metadata" playsInline onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setViewerMediaContextMenu({ x: event.clientX, y: event.clientY }) }} onLoadedMetadata={(event) => setViewerMediaInfo({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight, duration: event.currentTarget.duration })} />
                  : <div className="generated-audio-viewer"><AudioLines size={44} /><strong>{viewerTitle}</strong><audio src={viewerResult.url} controls preload="metadata" onLoadedMetadata={(event) => setViewerMediaInfo({ duration: event.currentTarget.duration })} /></div>}
              <div className="generated-media-viewer-actions">
                <button data-tooltip="Show In Finder" aria-label="Show Viewed Media In Finder" onClick={() => generatedMediaViewer.kind === 'node' ? revealGeneratedMedia(generatedMediaViewer.nodeId, viewerIndex) : viewerAsset && void window.prism.assets.reveal(viewerAsset.id)}><FolderOpen size={16} /></button>
                <button data-tooltip="Rename" aria-label="Rename Viewed Media" onClick={() => setViewerRenameDraft(mediaRenameStem(viewerTitle))}><PencilLine size={16} /></button>
                <button data-tooltip={viewerAsset?.favorite ? 'Remove From Favorites' : 'Add To Favorites'} aria-label={viewerAsset?.favorite ? 'Remove Viewed Media From Favorites' : 'Add Viewed Media To Favorites'} className={viewerAsset?.favorite ? 'is-active' : ''} onClick={() => generatedMediaViewer.kind === 'node' ? setGeneratedMediaFavorite(generatedMediaViewer.nodeId, viewerIndex, !viewerAsset?.favorite) : viewerAsset && void updateAssetState(viewerAsset.id, { favorite: !viewerAsset.favorite })}><Heart size={16} fill={viewerAsset?.favorite ? 'currentColor' : 'none'} /></button>
                <button className="is-danger" data-tooltip="Delete" aria-label="Delete Viewed Media" onClick={() => generatedMediaViewer.kind === 'node' ? trashGeneratedMedia(generatedMediaViewer.nodeId, viewerIndex) : viewerAsset && requestManagedAssetDelete([viewerAsset], assetDisplayName(viewerAsset))}><Trash2 size={16} /></button>
                <button data-tooltip="Close" aria-label="Close Full Resolution Media" onClick={() => setGeneratedMediaViewer(null)}><X size={17} /></button>
              </div>
              {viewerResults.length > 1 && <><button className="generated-media-viewer-nav is-previous" aria-label="Previous Generation" disabled={viewerIndex === 0} onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onClick={() => selectViewedResult(viewerIndex - 1)}><ChevronLeft size={24} /></button><button className="generated-media-viewer-nav is-next" aria-label="Next Generation" disabled={viewerIndex === viewerResults.length - 1} onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onClick={() => selectViewedResult(viewerIndex + 1)}><ChevronRight size={24} /></button></>}
              {viewerRenameDraft !== null && <form className="generated-media-viewer-rename" onSubmit={(event) => { event.preventDefault(); if (viewerRenameDraft.trim()) { if (generatedMediaViewer.kind === 'node') void renameNodeAsset(generatedMediaViewer.nodeId, viewerRenameDraft.trim()); else if (viewerAsset) void renameAssetTo(viewerAsset.id, viewerRenameDraft.trim()); setViewerRenameDraft(null) } }}><input autoFocus aria-label="Generated media name" value={viewerRenameDraft} onChange={(event) => setViewerRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setViewerRenameDraft(null) }} /><button type="submit" disabled={!viewerRenameDraft.trim()}><Check size={13} />Rename</button></form>}
            </div>
            <footer className="generated-media-viewer-details">
              <div><small>CREATED FROM</small><strong>{viewerSourceLabels.length ? viewerSourceLabels.join(' · ') : 'Prompt only'}</strong></div>
              <div><small>RESOLUTION</small><strong>{viewerMediaInfo.width && viewerMediaInfo.height ? `${viewerMediaInfo.width} × ${viewerMediaInfo.height}` : viewerResult.type === 'audio' ? 'Audio' : viewerAsset?.metadata?.resolution || 'Reading media…'}</strong></div>
              {viewerMediaInfo.duration !== undefined && <div><small>DURATION</small><strong>{Math.round(viewerMediaInfo.duration * 10) / 10}s</strong></div>}
              <div><small>MODEL</small><strong>{providerModelDisplayName(viewerResult.modelId)}</strong></div>
              <div><small>CREATED</small><strong>{viewerCreatedAt ? new Date(viewerCreatedAt).toLocaleString() : 'Unknown'}</strong></div>
              <span>{viewerIndex + 1} / {viewerResults.length}</span>
            </footer>
          </section>
          {viewerMediaContextMenu && <div className="generated-media-context-menu" style={{ left: Math.min(viewerMediaContextMenu.x, window.innerWidth - 190), top: Math.min(viewerMediaContextMenu.y, window.innerHeight - 54) }} onMouseDown={(event) => event.stopPropagation()} onMouseLeave={() => setViewerMediaContextMenu(null)}><button onClick={copyViewedMedia}><Copy size={13} />Copy {viewerResult.type === 'video' ? 'Video' : viewerResult.type === 'audio' ? 'Audio' : 'Image'}</button></div>}
        </div>
      )}

      {deleteRequest && (
        <div className="modal-backdrop delete-confirm-backdrop" onMouseDown={() => setDeleteRequest(null)}>
          <section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><span><Trash2 size={18} /></span><div><strong id="delete-confirm-title">{deleteRequest.title}</strong><small>{deleteRequest.category === 'asset' ? 'Project Asset' : deleteRequest.category === 'canvas' ? 'Project Canvas' : deleteRequest.category === 'project' ? 'Project Library Entry' : 'Canvas Page'}</small></div><button title="Cancel" aria-label="Cancel Delete" onClick={() => setDeleteRequest(null)}><X size={16} /></button></header>
            <p>{deleteRequest.message}</p>
            <label><input type="checkbox" checked={skipDeleteReminder} onChange={(event) => setSkipDeleteReminder(event.target.checked)} /><span>Don’t ask again for {deleteRequest.category} deletion this session</span></label>
            <footer><button onClick={() => setDeleteRequest(null)}>Cancel</button><button className="is-danger" onClick={confirmDelete}>{deleteRequest.confirmLabel}</button></footer>
          </section>
        </div>
      )}

      {relinkChoiceAssetId && (
        <div className="modal-backdrop delete-confirm-backdrop" onMouseDown={() => setRelinkChoiceAssetId(null)}>
          <section className="delete-confirm-modal relink-choice-modal" role="dialog" aria-modal="true" aria-labelledby="relink-choice-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><span><Unlink size={18} /></span><div><strong id="relink-choice-title">Relink Media</strong><small>Missing {mediaFamily(assets.find((asset) => asset.id === relinkChoiceAssetId)?.mimeType || 'image/png')}</small></div><button title="Cancel" aria-label="Cancel Relink" onClick={() => setRelinkChoiceAssetId(null)}><X size={16} /></button></header>
            <p>Link the exact missing media file, or choose a folder for Prism to search. Only the original media type is eligible.</p>
            <footer><button onClick={() => setRelinkChoiceAssetId(null)}>Cancel</button><button onClick={() => void performRelinkAsset(relinkChoiceAssetId, 'folder')}><Search size={13} />Find in Folder</button><button className="is-primary" onClick={() => void performRelinkAsset(relinkChoiceAssetId, 'file')}><Link2 size={13} />Link File</button></footer>
          </section>
        </div>
      )}

      {assetErrorNotice && <div className="connection-error-toast media-offline-error-toast" role="alert"><Unlink size={16} /><span><strong>Media Not Found</strong><small>{assetErrorNotice}</small></span><button aria-label="Dismiss media not found error" onClick={() => setAssetErrorNotice('')}><X size={14} /></button></div>}

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => closeConnections()}>
          <section className="settings-modal connections-hub" onMouseDown={(event) => event.stopPropagation()} onMouseDownCapture={(event) => {
            if (!activeService) return
            const card = (event.target as HTMLElement).closest<HTMLElement>('.service-card')
            if (card?.dataset.service === activeService) return
            setActiveService(null)
            setSignInProfileId(null)
          }}>
            <header><span><Settings size={18} /></span><div><strong>Connections</strong><small>Add AI services to Prism Foundry · {connectedServiceCount} connected</small></div><button title="Close Connections" aria-label="Close Connections" onClick={() => closeConnections()}><X size={17} /></button></header>
            <div className="connections-intro"><div><p>AI SERVICE DIRECTORY</p><h2>Choose the tools your studio can use.</h2><span>Generators route directly through the provider selected on each node.</span></div><div className="connection-security"><KeyRound size={14} /> macOS encrypted</div></div>
            <div className="service-grid">
              {SERVICE_CATALOG.map((service) => {
                const providerProfiles = serviceProfiles.profiles.filter((profile) => profile.provider === service.id)
                const providerSelection = projectServiceProfileSelection(serviceProfiles, project || undefined, service.id)
                const connected = serviceConnections[service.id]
                const hasAccounts = providerProfiles.length > 0 || connected
                const expanded = activeService === service.id
                const showAccountManager = expanded && providerProfiles.length > 0
                const editingKey = expanded && (signInProfileId === 'new' || providerProfiles.some((profile) => profile.id === signInProfileId))

                return <article data-service={service.id} className={`service-card ${connected ? 'is-connected' : ''} ${expanded ? 'is-expanded' : ''}`} key={service.id}>
                  <div className="service-card-head"><span className={`service-icon brand-${service.id}`}><ServiceBrandLogo provider={service.id} /></span><div><strong>{service.name}</strong><small>{service.company}</small></div>{connected && <span className="connection-badge"><i /> Connected</span>}{expanded && providerProfiles.length === 0 && <button className="fal-account-manager-collapse" aria-label={`Collapse ${service.name} Accounts`} onClick={() => { setActiveService(null); setSignInProfileId(null) }}><X size={14} /></button>}</div>
                  <p>{service.description}</p>
                  {serviceModels[service.id]?.catalogError && <p role="status" title={serviceModels[service.id]?.catalogError}>{serviceModels[service.id]?.catalogStale ? 'Model catalog unavailable' : 'Model catalog incomplete'} · saved choices preserved</p>}
                  <div className="service-capabilities">{service.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div>
                  {promptConnections[service.id as AssistantProvider]?.mode==='subscription' && <p role="status">{promptConnections[service.id as AssistantProvider]?.ready ? `${promptConnections[service.id as AssistantProvider]?.label} · Revamp connected` : promptConnections[service.id as AssistantProvider]?.error || 'Subscription connection unavailable'}</p>}
                  {service.id === 'omniroute' ? <footer><span className="service-connection-method" title="API connection"><KeyRound size={13} aria-hidden="true" /><span>API</span></span><button className="connect-service" disabled={serviceBusy} onClick={() => void refreshOmniRoute()}><Route size={13} />{connected ? 'Refresh Models' : 'Check Local Gateway'}</button></footer> : showAccountManager ? <div className="fal-account-manager">
                    <div className="fal-account-manager-head"><button aria-label={`Collapse ${service.name} Accounts`} onClick={() => { setActiveService(null); setSignInProfileId(null) }}><X size={14} /></button></div>
                    <div className="fal-account-list">
                      {providerProfiles.map((profile) => {
                        const isDefault = serviceProfiles.defaults[service.id] === profile.id
                        const isProject = providerSelection.profile?.id === profile.id
                        const isProjectOverride = project?.serviceProfileOverrides?.[service.id] === profile.id
                        const profileDisplayName = profile.displayName || profile.accountIdentifier
                        const signedOut = profile.status === 'signed-out'
                        const disconnected = profile.status === 'disconnected'
                        return <article className={`fal-account-row ${isProject ? 'is-project-account' : ''} state-${profile.status}`} key={profile.id}>
                          <div className="fal-account-select"><button className="fal-account-radio" disabled={profile.status !== 'connected'} onClick={() => setProfileConfirmation({ profileId: profile.id, action: isProjectOverride ? 'cancel-project' : 'select-project' })} aria-pressed={isProject} title={isProjectOverride ? 'This project uses this account. Click to return the project to its default account.' : 'Use this account for this project.'}><span className="fal-account-avatar">{profileDisplayName.slice(0, 1).toUpperCase()}</span></button><span className="fal-account-identity">{renamingProfileId === profile.id ? <input autoFocus value={profileNameDraft} onChange={(event) => setProfileNameDraft(event.target.value)} onBlur={() => void commitServiceProfileRename(profile.id)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); else if (event.key === 'Escape') { setRenamingProfileId(null); setProfileNameDraft('') } }} /> : <span className="fal-account-name"><strong onDoubleClick={() => { setRenamingProfileId(profile.id); setProfileNameDraft(profileDisplayName) }}>{profileDisplayName}</strong><button title="Rename Account Profile" aria-label={`Rename ${profileDisplayName}`} onClick={() => { setRenamingProfileId(profile.id); setProfileNameDraft(profileDisplayName) }}><PencilLine size={11} /></button></span>}<small>{profile.status === 'connected' ? 'Connected' : disconnected ? 'Disconnected · key retained' : 'Signed out · key removed'}</small></span></div>
                          <div className="fal-account-actions">
                            <button className={`fal-account-choice ${isDefault ? 'is-on' : ''}`} disabled={!isDefault && profile.status !== 'connected'} title={isDefault ? 'This is the default for projects without an account override. Click to cancel it.' : `Make this the default ${service.name} account.`} onClick={() => setProfileConfirmation({ profileId: profile.id, action: isDefault ? 'cancel-default' : 'make-default' })}><span className="choice-normal">{isDefault ? 'Default' : 'Make Default'}</span>{isDefault && <span className="choice-hover">Cancel Default</span>}</button>
                            <button className={`fal-account-choice ${isProjectOverride ? 'is-on' : ''}`} disabled={!isProjectOverride && profile.status !== 'connected'} title={isProjectOverride ? 'This project is pinned to this account. Click to return to the default account.' : 'Use this account only for this project.'} onClick={() => setProfileConfirmation({ profileId: profile.id, action: isProjectOverride ? 'cancel-project' : 'select-project' })}><span className="choice-normal">This Project</span>{isProjectOverride && <span className="choice-hover">Use Default</span>}</button>
                            {profile.status === 'connected' && <button onClick={() => void transitionServiceProfileState(profile.id, 'disconnect')}><Unlink size={13} />Disconnect</button>}
                            {disconnected && <button onClick={() => void transitionServiceProfileState(profile.id, 'reconnect')}><Link2 size={13} />Reconnect</button>}
                            {signedOut ? <button onClick={() => { setSignInProfileId(profile.id); setServiceDrafts((current) => ({ ...current, [service.id]: '' })) }}><LogIn size={13} />Sign In</button> : <button onClick={() => setProfileConfirmation({ profileId: profile.id, action: 'sign-out' })}><LogOut size={13} />Sign Out</button>}
                            <button className="fal-account-delete" aria-label={`Delete ${profileDisplayName}`} title="Delete Account" onClick={() => setProfileConfirmation({ profileId: profile.id, action: 'delete' })}><Trash2 size={13} /></button>
                          </div>
                        </article>
                      })}
                    </div>
                  </div> : null}
                  {service.id !== 'omniroute' && <footer>
                    {SUBSCRIPTION_PROVIDERS.includes(service.id as any) ? <SimpleMenuSelect className="service-connection-method" menuClassName="service-connection-menu" defaultLabel="Subscription" ariaLabel={`${service.name} Revamp connection`} title="Prompt Revamp billing. Media generation uses its API account." value={promptConnections[service.id as AssistantProvider]?.mode || 'api'} disabled={serviceBusy || !promptConnections[service.id as AssistantProvider]} options={[{value:'api',label:'API'},{value:'subscription',label:'Subscription'}]} onChange={mode=>void configurePromptConnection(service.id as AssistantProvider,mode as PromptBillingMode)} /> : <span className="service-connection-method" title="API connection"><KeyRound size={13} aria-hidden="true" /><span>API</span></span>}
                    {promptConnections[service.id as AssistantProvider]?.mode==='subscription' ? <button className="connect-service" disabled={serviceBusy} onClick={()=>void configurePromptConnection(service.id as AssistantProvider,'subscription',!promptConnections[service.id as AssistantProvider]?.ready)}><LogIn size={13} />{promptConnections[service.id as AssistantProvider]?.ready?'Reconnect':'Sign In'}</button> : editingKey ? <>
                      <input className="service-key-input" autoFocus disabled={serviceBusy} type="password" aria-label={`${service.name} API key`} value={serviceDrafts[service.id]} onChange={(event) => setServiceDrafts((current) => ({ ...current, [service.id]: event.target.value }))} placeholder={service.placeholder} autoComplete="off" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); const footer = event.currentTarget.closest('footer'); setSignInProfileId(null); setServiceDrafts((current) => ({ ...current, [service.id]: '' })); requestAnimationFrame(() => footer?.querySelector<HTMLButtonElement>('button')?.focus()) } else if (event.key === 'Enter' && !serviceBusy && serviceDrafts[service.id].trim().length >= 20) { event.preventDefault(); void saveService(service.id, event.currentTarget.closest('footer')) } }} />
                      <div className="service-key-actions"><button className="service-key-cancel" disabled={serviceBusy} onClick={(event) => { const footer = event.currentTarget.closest('footer'); setSignInProfileId(null); setServiceDrafts((current) => ({ ...current, [service.id]: '' })); requestAnimationFrame(() => footer?.querySelector<HTMLButtonElement>('button')?.focus()) }}>Cancel</button><button className="service-key-connect" disabled={serviceBusy || serviceDrafts[service.id].trim().length < 20} onClick={(event) => void saveService(service.id, event.currentTarget.closest('footer'))}>{signInProfileId === 'new' ? 'Connect' : 'Save'}</button></div>
                  </> : expanded ? <button className="fal-add-account" onClick={() => { setSignInProfileId('new'); setServiceDrafts((current) => ({ ...current, [service.id]: '' })) }}><Plus size={13} />Add Account</button> : <button className="connect-service" onClick={() => { setActiveService(service.id); setSignInProfileId(hasAccounts ? null : 'new'); setServiceDrafts((current) => ({ ...current, [service.id]: '' })); setServiceError('') }}>{hasAccounts ? <UserRound size={13} /> : <Plus size={13} />}{hasAccounts ? 'Manage Accounts' : 'Connect'}</button>}
                  </footer>}
                </article>
              })}
            </div>
            {serviceError && <div className="service-error">{serviceError}</div>}
            <div className="connections-footnote"><KeyRound size={14} /><span>Keys are encrypted by Electron’s macOS secure storage and decrypted only in the trusted main process. Canvas code never receives them.</span></div>
          </section>
        </div>
      )}
      {profileConfirmation && (() => {
        const profile = serviceProfiles.profiles.find((candidate) => candidate.id === profileConfirmation.profileId)
        const provider = profile?.provider || 'fal'
        const action = profileConfirmation.action
        const signingOut = action === 'sign-out'
        const deleting = action === 'delete'
        const makingDefault = action === 'make-default'
        const cancelingDefault = action === 'cancel-default'
        const selectingProject = action === 'select-project'
        const title = signingOut ? 'Sign out of this account?' : deleting ? 'Delete this account?' : makingDefault ? 'Make this the default account?' : cancelingDefault ? 'Cancel this default account?' : selectingProject ? 'Use this account for this project?' : 'Return this project to the default account?'
        const message = signingOut ? 'The encrypted API key will be removed, but the account row will remain so you can sign in again later.' : deleting ? 'The account row and its encrypted API key will be removed. Projects assigned to it will require another connection.' : makingDefault ? 'Projects that follow the default will use this account. Existing project-specific choices stay unchanged.' : cancelingDefault ? 'There will be no default account for this service until you choose another one.' : selectingProject ? `Only ${project?.name || 'this project'} will use this account.` : `${project?.name || 'This project'} will follow whichever account is marked Default.`
        const confirmLabel = signingOut ? 'Sign Out' : deleting ? 'Delete' : makingDefault ? 'Make Default' : cancelingDefault ? 'Cancel Default' : selectingProject ? 'Use for This Project' : 'Use Default'
        return <div className="modal-backdrop connection-warning-backdrop" onMouseDown={() => setProfileConfirmation(null)}>
          <section className="delete-confirm-modal service-profile-confirm" role="alertdialog" aria-modal="true" aria-labelledby="service-profile-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><span>{signingOut ? <LogOut size={18} /> : deleting ? <Trash2 size={18} /> : <UserRound size={18} />}</span><div><strong id="service-profile-confirm-title">{title}</strong><small>{profile?.displayName || profile?.accountIdentifier || 'Service account'}</small></div><button title="Cancel" aria-label="Cancel Account Action" onClick={() => setProfileConfirmation(null)}><X size={16} /></button></header>
            <p>{message}</p>
            <footer><button onClick={() => setProfileConfirmation(null)}>Cancel</button><button className={signingOut || deleting || cancelingDefault ? 'is-danger' : 'is-primary'} disabled={serviceBusy} onClick={() => { if (signingOut || deleting) void transitionServiceProfileState(profileConfirmation.profileId, action as 'sign-out' | 'delete'); else if (makingDefault) void setDefaultServiceProfileState(provider, profileConfirmation.profileId); else if (cancelingDefault) void setDefaultServiceProfileState(provider, undefined); else if (selectingProject) void selectProjectServiceProfile(provider, profileConfirmation.profileId); else void selectProjectServiceProfile(provider, undefined); setProfileConfirmation(null) }}>{confirmLabel}</button></footer>
          </section>
        </div>
      })()}
      {connectionWarning && <div className="modal-backdrop connection-warning-backdrop" onMouseDown={() => { setConnectionWarning(null); closeConnections() }}>
        <section className="delete-confirm-modal connection-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="connection-warning-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><span><KeyRound size={18} /></span><div><strong id="connection-warning-title">{connectionWarning.providerName} connection required</strong><small>{connectionWarning.modelLabel}</small></div><button title="Cancel" aria-label="Cancel Connection Warning" onClick={() => { setConnectionWarning(null); closeConnections() }}><X size={16} /></button></header>
          <p>Select a signed-in {connectionWarning.providerName} account or connect an API key before running {connectionWarning.modelLabel}.</p>
          <footer><button onClick={() => { setConnectionWarning(null); closeConnections() }}>Cancel</button><button className="is-primary" onClick={() => { setConnectionWarning(null); setActiveService(connectionWarning.provider) }}>Manage Connection</button></footer>
        </section>
      </div>}
      {serviceActionError && <div className="modal-backdrop connection-warning-backdrop" onMouseDown={() => setServiceActionError('')}>
        <section className="delete-confirm-modal connection-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="service-action-error-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><span><KeyRound size={18} /></span><div><strong id="service-action-error-title">Couldn’t update this account</strong><small>Service account profiles</small></div><button title="Close" aria-label="Close Account Error" onClick={() => setServiceActionError('')}><X size={16} /></button></header>
          <p>{serviceActionError}</p>
          <footer><button className="is-primary" onClick={() => setServiceActionError('')}>Close</button></footer>
        </section>
      </div>}
    </div>
    </ProviderAvailabilityContext.Provider>
  )
}
