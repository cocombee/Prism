import type { HiggsfieldJobView, HiggsfieldJobCommand } from './higgsfieldJobs'
import type { ElevenDialogueTurn, ElevenVoiceSegment } from './elevenDialogue'
import type { ModelMenuMetadata } from './modelCatalogMenu'
import type { FalSchemaContract } from './falSchemaBinding'
import type { HiggsfieldNativeRequest, HiggsfieldPreset } from './higgsfieldNative'
import type { HiggsfieldNodeState } from './higgsfieldNodeBinding'
import type { FalNativeRequest } from './falNativeExecution'
import type { FalNativeNodeState } from './falNodeBinding'
import type { Edge, Node, Viewport } from '@xyflow/react'
import type { StoryboardCameraBridgePlan } from './storyboardCameraBridge'
import type { CharacterControlState } from './resolvedAssetRequest'


export type NodeKind =
  | 'prompt'
  | 'upload'
  | 'image-generator'
  | 'image-editor'
  | 'upscaler'
  | 'video-generator'
  | 'gallery'
  | 'output'
  | 'frame'
  | 'sticky-note'
  | 'comment'
  | 'sticker'
  | 'drawing'
  | 'character'
  | 'location'
  | 'wardrobe'
  | 'element'
  | 'style-reference'
  | 'list'
  | 'voiceover'
  | 'sound-effects'
  | 'music-generator'
  | 'router'
  | 'storyboard'
  | 'storyboard-asset'
  | 'assistant'

export type RunState = 'idle' | 'queued' | 'running' | 'complete' | 'error'

export interface SemanticAssetAvailability {
  state: 'online' | 'offline'
  requiredAssetIds: string[]
  unavailableAssetIds: string[]
}

export type CharacterView = 'full-body' | 'full-body-back' | 'side-body' | 'front' | 'profile' | 'three-quarter' | 'left-three-quarter' | 'back' | 'smile' | 'neutral'
export type CharacterInputMode = 'multi' | 'single'
import type { AssetBatchInspection, AssetBatchKind } from './assetBatch'
export type CharacterImageValidationResult = {
  valid: boolean
  viewCount: number
  classification: 'blank' | 'single-view' | 'multi-view'
  message?: string
}
export type ElementView = 'front' | 'three-quarter' | 'side' | 'back'
export type StoryboardTransition = 'hard-cut' | 'continue'

/** Explicit state at a shot boundary; action prose is never inferred into these fields. */
export interface StoryboardBoundaryState {
  incoming?: string[]
  outgoing?: string[]
  held?: string[]
}

export type StoryboardCharacterVisibility = 'sharp-foreground' | 'sharp-background' | 'blurred-background' | 'partially-visible' | 'frame-edge-fragment' | 'reflection' | 'off-camera'

/** Prism-local authored state. Missing fields remain unknown and are never synthesized from prose. */
export interface StoryboardCharacterState {
  characterTag: string
  wardrobeTag?: string
  worldPosition?: string
  footState?: string
  bodyOrientation?: string
  gazeTarget?: string
  performanceState?: string
  currentAction?: string
  actionPhase?: string
  propOwnership?: string[]
  contacts?: string[]
  handState?: string
  gripContact?: string
  propOrientation?: string
  workstation?: string
  visibility?: StoryboardCharacterVisibility
}

export interface StoryboardStateAuthority {
  authorityTag: string
  scope: 'before' | 'post-cut' | 'final-transferred'
  state: string
  trajectory?: string
  /** Exact physical state required by this shot, when explicitly authored. */
  requiredState?: string
  /** Explicit inventory of physical states visible in the selected authority; absent means unknown. */
  availableStates?: string[]
  /** Optional view/angle inventory. Multiple views do not imply multiple physical states. */
  referenceViews?: string[]
}

export interface StoryboardDialogueSpan {
  id: string
  speakerTag: string
  targetTag?: string
  text: string
  startPanelId: string
  endPanelId: string
  insertAudioPanelIds?: string[]
  delivery?: string
  lipSync?: string
}

export interface StoryboardTypedContinuity {
  continuityGroupId?: string
  /** Physical cast, including off-camera identities; [] is empty, absence inherits within the same continuity group. */
  activeCharacterTags?: string[]
  excludedCharacterTags?: string[]
  /** Shot 1 may establish state; later records are explicit authored state replacements. */
  characterStates?: StoryboardCharacterState[]
  /** Sparse per-boundary/shot changes applied after inherited state. */
  characterStateDeltas?: Array<Partial<StoryboardCharacterState> & Pick<StoryboardCharacterState, 'characterTag'>>
  stateAuthorities?: StoryboardStateAuthority[]
  dialogueSpans?: StoryboardDialogueSpan[]
}

export type VisualAuthorityMode = 'reference-exclusive' | 'text-described' | 'reference-plus-authored-delta'

/** Explicit provider-neutral body ownership. Missing historical state is unresolved. */
export type CharacterAuthorityMode = 'complete-dressed-body' | 'identity-body-with-layers' | 'unresolved'
export type AppearanceScope = 'wardrobe' | 'helmet-headwear' | 'glasses-accessory' | 'connected-element'
export type AppearanceSelection = 'explicit-replacement' | 'explicit-delta' | 'redundant' | 'unresolved' | 'precomposed-fallback'

export interface AuthoredAppearanceDelta {
  /** The one appearance property intentionally changed from the connected reference. */
  property: string
  /** Byte-exact authored value for that named property. */
  value: string
}

/** Prism-local, explicitly authored prop-scale ownership. Nothing is inferred from media or prose. */
export interface PropScaleAuthority {
  preserveReferenceScale: true
  proportions: 'exact-reference'
  authoredScaleStatement?: string
  approvedScaleExclusions?: string[]
  shotIds?: string[]
}

export interface StoryboardPanel extends StoryboardTypedContinuity {
  id: string
  /** Byte-exact user-authored source. Legacy panels migrate from `prompt`. */
  originalPrompt?: string
  /** Latest successful AI rewrite; absent until a rewrite changes the text. */
  revampedPrompt?: string
  /** Persisted prompt authority used by display and compilation. */
  selectedPromptVersion?: 'original' | 'revamped'
  prompt: string
  duration: number | 'auto'
  shotSize?: 'auto' | 'extreme-wide' | 'wide' | 'medium' | 'close-up' | 'extreme-close-up' | 'detail'
  /** Independent selected focal length; missing on older projects means unspecified. */
  lensMm?: number
  camera?: string
  audioCue?: string
  locked?: boolean
  /** Editorial boundary after this panel. Ignored on the final panel. */
  transitionToNext?: StoryboardTransition
  /** Outgoing belongs to this panel's end; incoming belongs to the next panel's start. */
  boundaryState?: StoryboardBoundaryState
  /** Shared identifier for nodes that translate together on the canvas. */
  groupId?: string
  asset?: ImportedAsset
}

export interface StudioNodeData extends Record<string, unknown> {
  higgsfieldNative?: HiggsfieldNodeState
  higgsfieldNativePresets?: Record<string, HiggsfieldNodeState>
  /** Compact exact-model inputs; full schemas remain ephemeral and main-owned. */
  falNative?: FalNativeNodeState
  falNativePresets?: Record<string, FalNativeNodeState>
  kind: NodeKind
  title: string
  selectorDeployment?: boolean
  prompt?: string
  /** Reusable-asset Create/Edit/Rerun text. Local generation/history only; never downstream semantic authority. */
  assetGenerationPrompt?: string
  promptMode?: 'auto' | 'manual'
  manualPromptDraft?: string
  manualPromptSeeded?: boolean
  /** Version of compiler-seeded User text; 2 denotes the complete provider-body contract. */
  manualPromptSeedVersion?: number
  multiPrompt?: Array<{ prompt: string; duration: string }>
  /** Global upstream context applied once to each provider-native storyboard shot. */
  storyboardContext?: string
  /** Adds subordinate cinematography/story-beat guidance. Undefined preserves the default-on behavior. */
  directionLayer?: boolean
  /** User-authored constraints restated verbatim in the provider's POSITIVE LOCKS section. */
  shotLocks?: string
  assetPath?: string
  assetUrl?: string
  outputPath?: string
  outputUrl?: string
  outputType?: 'image' | 'video' | 'audio'
  generatedResults?: Array<{
    /** Stable provider/result identity. Legacy records migrate deterministically from path. */
    id?: string
    path: string
    url: string
    type: 'image' | 'video' | 'audio'
    modelId: string
    /** Independent user-facing identity for this result; its encoded extension remains path-owned. */
    name?: string
    createdAt?: string
    sourceLabels?: string[]
  }>
  activeResultIndex?: number
  /** Persisted stable identities and lifecycle selection for generatable semantic assets. */
  semanticAssetLifecycle?: {
    version: 1
    status: 'EMPTY' | 'REFERENCE_READY' | 'GENERATING' | 'RESULTS_READY' | 'SAVED_VIEW' | 'EDITING_SAVED' | 'SAVE_CONFIRMATION' | 'SAVE_COMMITTING' | 'SAVE_FAILED' | 'SAVE_COMPLETE'
    references: Array<{ id: string; path: string; url?: string; source: 'saved' | 'generated' | 'imported'; createdAt: string }>
    selectedId?: string
    pendingSave?: { selectedResultId: string; deleteGeneratedIds: string[]; deletionCount: number }
  }
  /** Ephemeral Edit-only replacement authority. Create and hydration clear it. */
  semanticReplacementAuthority?: { targetAssetId: string; token: string }
  aspectRatio?: string
  quantity?: number
  scale?: number
  upscalerModel?: 'clarity-image' | 'realesrgan-video'
  creativity?: number
  resemblance?: number
  modelId?: string
  runState?: RunState
  progress?: string
  notificationVersion?: number
  error?: string
  runStartedAt?: string
  learnedGenerationSeconds?: number
  note?: string
  sticker?: string
  drawingPath?: string
  referenceAssets?: ImportedAsset[]
  /** Ephemeral projection from the current asset-link inventory; never provider media authority. */
  semanticAssetAvailability?: SemanticAssetAvailability
  /** User-selected Character creation mode; legacy/missing values normalize to Multi. */
  characterInputMode?: CharacterInputMode
  /** Legacy transient candidate data retained for non-destructive compatibility; ignored by active UI and requests. */
  characterControls?: CharacterControlState
  /** Optional confidently detected BCP 47 tag for local prompt-language preflight. */
  promptLanguageTag?: string
  /** User-selected Element creation mode; legacy/missing values normalize to Multi. */
  elementInputMode?: CharacterInputMode
  /** User-selected Location creation mode; legacy/missing values normalize to Multi. */
  locationInputMode?: CharacterInputMode
  /** Wardrobe uses the same Single/Batch intake contract as Location. */
  wardrobeInputMode?: CharacterInputMode
  characterAspectRatio?: string
  /** Hidden provider derivative rebuilt from the editable Character view collection on every save. */
  characterSheetPath?: string
  characterSheetUrl?: string
  characterSheetViews?: CharacterView[]
  referenceTag?: string
  /** Persisted typed body/cast authority for Character projection. */
  characterAuthorityMode?: CharacterAuthorityMode
  /** Persisted same-body owner for appearance-capable Wardrobe/Element assets. */
  appearanceOwnerCharacterTag?: string
  appearanceScope?: AppearanceScope
  appearanceSelection?: AppearanceSelection
  appearanceElementTag?: string
  appearanceShotIds?: string[]
  /** Explicit prop scale lock; state/contact metadata never creates this value. */
  propScaleAuthority?: PropScaleAuthority
  /** Required public summary shown on reusable Style cards and selectors. */
  styleDescription?: string
  characterRole?: 'main' | 'supporting' | 'extra' | 'unspecified'
  listItems?: Array<{
    id: string
    type: 'text' | 'image' | 'video' | 'audio'
    text?: string
    asset?: ImportedAsset
    /** Direct generator whose requested/result slot this item mirrors. */
    sourceNodeId?: string
    sourceResultIndex?: number
    status?: 'pending' | 'generating' | 'complete' | 'failed'
  }>
  /** Derived from local and connected List items; never guessed from a connector color. */
  listSignal?: 'text' | 'image' | 'video' | 'audio' | 'storyboard' | 'style' | 'mixed'
  /** Derived from the Router's live inputs so pass-through keeps its exact type. */
  routeSignal?: 'text' | 'image' | 'video' | 'audio' | 'storyboard' | 'style' | 'mixed'
  videoEngine?: string
  duration?: number
  autoDuration?: boolean
  frameRate?: number
  /** Perceived animation/update cadence; does not change encoded output FPS. */
  motionCadence?: number
  /** Shutter UI presentation; canonical exposure selection remains shutterAngle. */
  shutterMode?: 'angle' | 'speed'
  /** Canonical persisted shutter angle. */
  shutterAngle?: number
  generateAudio?: boolean
  loop?: boolean
  forceInstrumental?: boolean
  negativePrompt?: string
  seed?: number
  outputFormat?: 'jpeg' | 'png' | 'webp'
  imageResolution?: '0.5K' | '1K' | '2K' | '4K'
  imageProvider?: 'fal' | 'openai' | 'google'
  imageModelId?: string
  safetyTolerance?: 1 | 2 | 3 | 4 | 5 | 6
  enableWebSearch?: boolean
  autoFix?: boolean
  inferenceSteps?: number
  guidanceScale?: number
  acceleration?: 'none' | 'regular' | 'high'
  resolution?: '480p' | '580p' | '720p' | '1080p' | '4k'
  bitrateMode?: 'standard' | 'high'
  videoQuality?: 'low' | 'medium' | 'high' | 'maximum'
  videoWriteMode?: 'fast' | 'balanced' | 'small'
  interpolatorModel?: 'none' | 'film' | 'rife'
  numInterpolatedFrames?: number
  adjustFpsForInterpolation?: boolean
  enablePromptExpansion?: boolean
  enableInputSafety?: boolean
  enableOutputSafety?: boolean
  shift?: number
  voice?: string
  voiceEngine?: 'elevenlabs' | 'elevenlabs-direct' | 'fish-audio'
  voiceModelId?: string
  elevenSpeechMode?: 'speech' | 'dialogue'
  elevenDialogueTurns?: ElevenDialogueTurn[]
  audioProvider?: 'fal' | 'elevenlabs'
  fishModel?: string
  fishReferenceId?: string
  fishTemperature?: number
  fishTopP?: number
  fishVolume?: number
  fishNormalizeLoudness?: boolean
  fishNormalize?: boolean
  fishChunkLength?: number
  fishFormat?: 'mp3' | 'wav' | 'pcm' | 'opus'
  fishSampleRate?: number
  fishMp3Bitrate?: 64 | 128 | 192
  fishOpusBitrate?: -1000 | 24 | 32 | 48 | 64
  fishLatency?: 'low' | 'normal' | 'balanced'
  stability?: number
  similarityBoost?: number
  voiceStyle?: number
  speed?: number
  languageCode?: string
  textNormalization?: 'auto' | 'on' | 'off'
  audioOutputFormat?: string
  previousText?: string
  nextText?: string
  voiceSeed?: number
  voiceTimestamps?: boolean
  promptInfluence?: number
  locked?: boolean
  headerHidden?: boolean
  storyboardPanels?: StoryboardPanel[]
  storyboardPanelCount?: number
  storyboardMode?: 'single' | 'separate'
  storyboardDuration?: number
  storyboardModelId?: string
  storyboardSourceId?: string
  storyboardEditorOpen?: boolean
  storyboardNeedsCompile?: boolean
  storyboardFavorite?: boolean
  storyboardDeletedAt?: string
  sequenceEnabled?: boolean
  sequenceOrder?: number
  sequenceStatus?: 'idle' | 'running' | 'complete' | 'failed'
  sequenceFrame?: boolean
  promptVariants?: string[]
  variantResults?: Array<{ id: string; prompt: string; path: string; url: string; type: 'image' | 'video' | 'audio'; modelId: string; recipeVersions: string[] }>
  variantWinnerId?: string
  /** `fal` is retained only to migrate older saved text-assistant selections. */
  assistantProvider?: 'fal' | 'omniroute' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot'
  stylePrompt?: string
  /** Text model used to build the reusable private Style prompt. */
  stylePromptModelId?: string
  stylePresetId?: string
  styleSavedAt?: string
  styleEditorOpen?: boolean
  characterEditorOpen?: boolean
  semanticEditorOpen?: boolean
  reusableDeletedAt?: string
  linkedStoryboardId?: string
  assistantModelId?: string
  assistantOutput?: string
}

export type StudioNode = Node<StudioNodeData>

export interface CanvasPage {
  id: string
  name: string
  nodes: StudioNode[]
  edges: Edge[]
  viewport: Viewport
  updatedAt: string
}

export interface WorkspaceCanvas {
  id: string
  name: string
  pages: CanvasPage[]
  activePageId: string
  updatedAt: string
}

export interface WorkflowDocument {
  schemaVersion: 1
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodes: StudioNode[]
  edges: Edge[]
  viewport: Viewport
  pages?: CanvasPage[]
  activePageId?: string
  canvases?: WorkspaceCanvas[]
  activeCanvasId?: string
}

export interface HistoryEntry {
  id: string
  nodeId: string
  nodeTitle: string
  modelId: string
  status: 'complete' | 'error'
  createdAt: string
  outputPath?: string
  outputUrl?: string
  error?: string
  durationMs?: number
  /** Estimate shown when this provider call began. */
  estimatedDurationMs?: number
  /** Legacy conversion for provider-call evidence recorded before batch wall time. */
  timingScale?: number
  timingKey?: string
}

export interface GenerationRequest {
  nodeId: string
  kind: NodeKind
  /** Explicit exact-endpoint schema execution. Never a static model alias or supplied schema. */
  higgsfieldNative?: HiggsfieldNativeRequest
  falNative?: FalNativeRequest
  /** Renderer-owned timing evidence; provider adapters must not forward it. */
  timingKey?: string
  estimatedDurationMs?: number
  timingScale?: number
  /** ISO start of the user-visible run, including every sequential batch call. */
  timingStartedAt?: string
  /** False for intermediate calls; only a complete visible run trains the countdown. */
  timingSampleComplete?: boolean
  prompt?: string
  multiPrompt?: Array<{ prompt: string; duration: string }>
  /** Global upstream context applied once to each provider-native storyboard shot. */
  storyboardContext?: string
  /** Authored upstream shot count. Survives per-shot prompt splitting so the Direction Layer never re-plans an authored storyboard. */
  storyboardShotCount?: number
  /** Traceable shot recipe versions used to compile Storyboard controls for this request. */
  shotRecipeVersions?: string[]
  /** Adds subordinate cinematography/story-beat guidance. Undefined preserves the default-on behavior. */
  directionLayer?: boolean
  /** The generator/Prompt-node prose before semantic references and Storyboard compilation are added. */
  authoredPrompt?: string
  /** Connected Style-node prose used by the production LIGHTING and STYLE sections. */
  stylePrompt?: string
  /** Private built-in Style instructions that production inspectors must redact. */
  builtInStylePrompts?: string[]
  /** Fully composed provider-effective User prompt; adapters may translate only semantic reference tokens. */
  providerPromptOverride?: string
  /** Exact authored text versus compiler output copied into a native provider field; local metadata only. */
  providerPromptOwnership?: 'authored' | 'compiled'
  /** Ephemeral output owner, so creation inputs are not mistaken for layers of an existing Character. */
  semanticAssetCreation?: { kind: 'character' | 'wardrobe' | 'location' | 'element'; tag: string }
  storyboardShots?: Array<({ panelId?: string; prompt: string; duration: number; shotSize: string; lensMm?: number; camera: string; audioCue?: string; transitionToNext?: StoryboardTransition; boundaryState?: StoryboardBoundaryState; startSeconds?: number; endSeconds?: number; incomingBridge?: StoryboardCameraBridgePlan; panelNumber?: number } & StoryboardTypedContinuity)>
  /** One-based authored Storyboard panels that are still missing action prose. */
  storyboardIncompletePanels?: number[]
  storyboardMode?: 'single' | 'separate'
  /** User-authored constraints restated verbatim in POSITIVE LOCKS. */
  shotLocks?: string
  inputPath?: string
  inputUrl?: string
  inputName?: string
  inputTag?: string
  inputRole?: 'start-frame' | 'source-image' | 'source-video'
  /** Offline graph sources excluded by the resolver. Main-process preflight rejects these before any provider call. */
  offlineSemanticSources?: Array<{
    nodeId: string
    kind: 'character' | 'wardrobe' | 'element' | 'location' | 'style-reference'
    role: 'character' | 'wardrobe' | 'element' | 'location' | 'style'
    title: string
    assetIds: string[]
  }>
  connectionRules?: Array<{ tag: string; aliases?: string[]; label: string; rule: string }>
  aspectRatio?: string
  quantity?: number
  scale?: number
  upscalerModel?: 'clarity-image' | 'realesrgan-video'
  creativity?: number
  resemblance?: number
  videoEngine?: string
  duration?: number
  /** Live Video-node duration shown in EDIT CONTROL even when Storyboard owns timeline duration. */
  editControlDuration?: number
  autoDuration?: boolean
  frameRate?: number
  motionCadence?: number
  shutterMode?: 'angle' | 'speed'
  shutterAngle?: number
  generateAudio?: boolean
  loop?: boolean
  forceInstrumental?: boolean
  negativePrompt?: string
  seed?: number
  outputFormat?: 'jpeg' | 'png' | 'webp'
  imageResolution?: '0.5K' | '1K' | '2K' | '4K'
  imageProvider?: 'fal' | 'openai' | 'google'
  imageModelId?: string
  safetyTolerance?: 1 | 2 | 3 | 4 | 5 | 6
  enableWebSearch?: boolean
  autoFix?: boolean
  inferenceSteps?: number
  guidanceScale?: number
  acceleration?: 'none' | 'regular' | 'high'
  resolution?: '480p' | '580p' | '720p' | '1080p' | '4k'
  bitrateMode?: 'standard' | 'high'
  videoQuality?: 'low' | 'medium' | 'high' | 'maximum'
  videoWriteMode?: 'fast' | 'balanced' | 'small'
  interpolatorModel?: 'none' | 'film' | 'rife'
  numInterpolatedFrames?: number
  adjustFpsForInterpolation?: boolean
  enablePromptExpansion?: boolean
  enableInputSafety?: boolean
  enableOutputSafety?: boolean
  shift?: number
  voice?: string
  voiceEngine?: 'elevenlabs' | 'elevenlabs-direct' | 'fish-audio'
  voiceModelId?: string
  elevenSpeechMode?: 'speech' | 'dialogue'
  elevenDialogueTurns?: ElevenDialogueTurn[]
  audioProvider?: 'fal' | 'elevenlabs'
  fishModel?: string
  fishReferenceId?: string
  fishTemperature?: number
  fishTopP?: number
  fishVolume?: number
  fishNormalizeLoudness?: boolean
  fishNormalize?: boolean
  fishChunkLength?: number
  fishFormat?: 'mp3' | 'wav' | 'pcm' | 'opus'
  fishSampleRate?: number
  fishMp3Bitrate?: 64 | 128 | 192
  fishOpusBitrate?: -1000 | 24 | 32 | 48 | 64
  fishLatency?: 'low' | 'normal' | 'balanced'
  stability?: number
  similarityBoost?: number
  voiceStyle?: number
  speed?: number
  languageCode?: string
  textNormalization?: 'auto' | 'on' | 'off'
  audioOutputFormat?: string
  previousText?: string
  nextText?: string
  voiceSeed?: number
  voiceTimestamps?: boolean
  promptInfluence?: number
  references?: Array<{
    role: 'character' | 'location' | 'wardrobe' | 'element' | 'style' | 'storyboard' | 'reference'
    path?: string
    url?: string
    name?: string
    tag?: string
    /** Character tag whose clothing this Wardrobe reference governs. */
    boundCharacterTag?: string
    /** Typed body/cast authority; never inferred from pixels, filenames, or captions. */
    characterAuthorityMode?: CharacterAuthorityMode
    /** Appearance-only domain on the bound Character; absent is not inferred from role or media. */
    appearanceScope?: AppearanceScope
    /** Explicit authored selection/delta or deterministic suppression reason. */
    appearanceSelection?: AppearanceSelection
    /** Optional exact connected Element scope when appearanceScope is connected-element. */
    appearanceElementTag?: string
    /** Exact Storyboard panel IDs where this layer applies; absent means all current shots. */
    appearanceShotIds?: string[]
    /** Explicit Prism-local prop-scale authority; never inferred from pixels, filenames, captions, or prompts. */
    propScaleAuthority?: PropScaleAuthority
    view?: CharacterView | ElementView
    /** Original view order represented inside one hidden compiled Character sheet. */
    sourceViews?: CharacterView[]
    characterRole?: 'main' | 'supporting' | 'extra' | 'unspecified'
    mediaType?: 'image' | 'video' | 'audio'
    slot?: 'start' | 'end' | 'element' | 'reference'
    authority?: 'storyboard-map' | 'motion-camera' | 'audio-timing' | 'appearance'
    /** Authored semantic description used only by text-described authority; connected reference metadata never becomes appearance prose. */
    description?: string
    /** Explicitly approved identity-only text; never populated by captions, AI descriptions, or asset generation prompts. */
    approvedIdentityDescription?: string
    /** Optional visual-authority representation; exact connected typed visuals default to reference-exclusive. */
    visualAuthorityMode?: VisualAuthorityMode
    /** Explicit authored scoped override; metadata descriptions never populate this field. */
    authoredAppearanceDelta?: AuthoredAppearanceDelta
    /** Effective per-edge fidelity after prompt-sensitive Auto resolution. */
    fidelity?: 'guide' | 'auto' | 'lock'
  }>
}

export interface GenerationResult {
  requestId: string
  modelId: string
  outputPath: string
  outputUrl: string
  outputType: 'image' | 'video' | 'audio'
  /** All media from one provider-native request; legacy adapters keep the primary fields. */
  outputs?: Array<{ path: string; url: string; type: 'image' | 'video' | 'audio' }>
}

export interface ImportedAsset {
  id: string
  name: string
  path: string
  url?: string
  mimeType: string
  createdAt: string
  category?: 'character' | 'element' | 'location' | 'wardrobe' | 'style' | 'storyboard' | 'image' | 'video' | 'audio'
  origin?: 'imported' | 'generated'
  favorite?: boolean
  trashedAt?: string
  trashOriginalPath?: string
  trashTransactionId?: string
  fileSize?: number
  metadata?: {
    assetName?: string
    identityDescription?: string
    defaultWardrobe?: string
    characterView?: CharacterView
    characterInputMode?: CharacterInputMode
    characterControls?: CharacterControlState
    elementInputMode?: CharacterInputMode
    locationInputMode?: CharacterInputMode
    wardrobeInputMode?: CharacterInputMode
    characterAspectRatio?: string
    /** Private derivative pointer; never rendered as a separate library asset. */
    characterSheetPath?: string
    characterSheetUrl?: string
    characterSheetViews?: CharacterView[]
    elementView?: ElementView
    elementType?: string
    variant?: string
    locationType?: 'interior' | 'exterior'
    timeOfDay?: 'day' | 'night'
    provider?: string
    modelId?: string
    /** Timing stays with managed audio through relocation and portable export. */
    audioTiming?: {
      voiceSegments?: ElevenVoiceSegment[]
      alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] }
      normalizedAlignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] }
    }
    elevenDialogueInputs?: Array<{ text: string; voiceId: string }>
    audioOutputFormat?: string
    /** Reusable-asset Create/Edit/Rerun history. Never downstream semantic authority. */
    assetGenerationPrompt?: string
    prompt?: string
    styleDescription?: string
    /** Optional author- or detector-supplied crop focus for preview surfaces. */
    previewFocusX?: number
    previewFocusY?: number
    aspectRatio?: string
    duration?: number
    resolution?: string
    frameRate?: number
    motionCadence?: number
    shutterMode?: 'angle' | 'speed'
    shutterAngle?: number
  }
}

export type SemanticAssetSaveIntent =
  | { mode: 'create-new' }
  | { mode: 'replace-existing'; targetAssetId: string; token: string }

export interface SemanticAssetCommitRequest {
  nodeId: string
  selectedResultId: string
  intent: SemanticAssetSaveIntent
}

export interface SemanticAssetCommitResult {
  asset: ImportedAsset
  deletedGeneratedResultIds: string[]
}

export interface CharacterCollectionCommitRequest {
  name: string
  previousName?: string
  mode: CharacterInputMode
  active: Array<{ id: string; metadata: ImportedAsset['metadata'] }>
  retiredAt: string
  intent: SemanticAssetSaveIntent
  sheet?: { bytes: ArrayBuffer; views: CharacterView[]; previousPath?: string }
}

export interface CharacterCollectionCommitResult {
  assets: ImportedAsset[]
  sheet?: { path: string; url: string; views: CharacterView[] }
}

export interface ProjectDocument {
  fileType: 'prism-foundry-project'
  schemaVersion: 1
  project: Omit<ProjectWorkspace, 'rootPath' | 'updatedAt'> & { updatedAt: string }
  workflow: WorkflowDocument | null
  assets: Array<ImportedAsset & { relativePath?: string }>
}

export interface AssetRelinkResult {
  assets: ImportedAsset[]
  replacements: Array<{ from: string; to: string; asset: ImportedAsset }>
  relinked: number
  missing: number
}

export type AssetRelinkMode = 'file' | 'folder'

export interface AssetLinkStatus {
  asset: ImportedAsset
  missing: boolean
}

export interface ProjectWorkspace {
  schemaVersion: 1
  id: string
  name: string
  rootPath: string
  createdAt: string
  updatedAt: string
  documentPath?: string
  /** Missing means this project follows the provider's current global default. */
  serviceProfileOverrides?: Partial<Record<ServiceProvider, string>>
}

export type ServiceProvider = 'higgsfield' | 'fal' | 'byteplus' | 'fish' | 'omniroute' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot' | 'elevenlabs'

export type ServiceProfileStatus = 'connected' | 'disconnected' | 'signed-out'

/** Non-secret account metadata. Encrypted credentials are stored separately by profile id. */
export interface ServiceProfile {
  id: string
  provider: ServiceProvider
  accountIdentifier: string
  displayName?: string
  status: ServiceProfileStatus
  createdAt: string
  updatedAt: string
  balance?: number
  currency?: string
  balanceCheckedAt?: string
}

export interface ServiceProfileRegistry {
  /** Explicit profile ownership survives deletion; old keys cannot reappear as defaults. */
  profileManagedProviders?: ServiceProvider[]
  schemaVersion: 1
  localNamingVersion?: 1
  profiles: ServiceProfile[]
  defaults: Partial<Record<ServiceProvider, string>>
}

export interface ServiceConnection {
  id: ServiceProvider
  connected: boolean
}

export interface ServiceModelAvailability {
  provider: ServiceProvider
  verified: boolean
  catalogCheckedAt?: string
  /** Public schema discovery is distinct from account access or executed-engine identity. */
  catalogSource?: string
  catalogFingerprint?: string
  /** Validated current native JSON input contract; public annotations contain no account secrets. */
  nativeInputSchema?: import('./falSchemaBinding').FalSchemaNode
  catalogStale?: boolean
  /** Bounded public document traversal is distinct from complete provider enumeration. */
  catalogComplete?: boolean
  models: Array<{
    id: string
    label: string
    category?: string
    description?: string
    updatedAt?: string
    catalog?: ModelMenuMetadata
    documentationUrl?: string
    nativeContractFingerprint?: string
    languages?: Array<{ id: string; label: string }>
    maxTextLength?: number
    supportsStyle?: boolean
    supportsDialogue?: boolean
    supportsSpeakerBoost?: boolean
  }>
  voices?: Array<{ id: string; label: string; previewUrl?: string }>
  voiceCatalogError?: string
  catalogError?: string
}

export interface ServiceAccountStatus {
  provider: ServiceProvider
  state: 'ready' | 'credit-required' | 'temporarily-limited' | 'unavailable' | 'unknown'
  message: string
  balance?: number
  currency?: string
  username?: string
  checkedAt: string
}

export interface GenerationCostEstimate {
  modelId: string
  totalCost: number
  currency: string
  basis: string
  estimated: true
}

export interface PrismAPI {
  projects: {
    current: () => Promise<ProjectWorkspace | null>
    recent: () => Promise<ProjectWorkspace[]>
    create: () => Promise<ProjectWorkspace | null>
    open: () => Promise<ProjectWorkspace | null>
    openRecent: (rootPath: string) => Promise<ProjectWorkspace>
    openDocument: () => Promise<ProjectWorkspace | null>
    renameDocument: (rootPath: string, name: string) => Promise<ProjectWorkspace>
    forget: (rootPath: string) => Promise<void>
    close: () => Promise<void>
    legacyImportStatus: () => Promise<{ detected: boolean; assets: number; nodes: number }>
    removeLegacyImport: () => Promise<{ removedAssets: number; removedNodes: number }>
    onOpened: (listener: (project: ProjectWorkspace) => void) => () => void
  }
  credentials: {
    status: () => Promise<boolean>
    save: (key: string) => Promise<void>
    remove: () => Promise<void>
    fishStatus: () => Promise<boolean>
    saveFish: (key: string) => Promise<void>
    removeFish: () => Promise<void>
  }
  services: {
    list: () => Promise<ServiceConnection[]>
    save: (provider: ServiceProvider, key: string) => Promise<void>
    remove: (provider: ServiceProvider) => Promise<void>
    models: (provider: ServiceProvider) => Promise<ServiceModelAvailability>
    modelSnapshot: (provider: ServiceProvider) => Promise<ServiceModelAvailability | undefined>
    higgsfieldPresets: (refresh?: boolean) => Promise<HiggsfieldPreset[]>
    higgsfieldSchema: (endpointId: string) => Promise<import('./higgsfieldInputContract').HiggsfieldInputContract>
    falSchema: (endpointId: string) => Promise<FalSchemaContract>
    account: (provider: ServiceProvider) => Promise<ServiceAccountStatus>
    profiles: (provider: ServiceProvider, refresh?: boolean) => Promise<ServiceProfileRegistry>
    addProfile: (provider: ServiceProvider, key: string, expectedProfileId?: string) => Promise<ServiceProfileRegistry>
    transitionProfile: (profileId: string, transition: 'disconnect' | 'reconnect' | 'sign-out' | 'delete') => Promise<ServiceProfileRegistry>
    setDefaultProfile: (provider: ServiceProvider, profileId?: string) => Promise<ServiceProfileRegistry>
    renameProfile: (profileId: string, displayName: string) => Promise<ServiceProfileRegistry>
    selectProjectProfile: (provider: ServiceProvider, profileId?: string) => Promise<ProjectWorkspace>
  }
  workflows: {
    load: (owner: import('./workflowSaveOwnership').WorkflowSaveOwner) => Promise<WorkflowDocument | null>
    save: (document: WorkflowDocument, owner: import('./workflowSaveOwnership').WorkflowSaveOwner) => Promise<void>
  }

  assets: {
    import: (kind?: NodeKind, collectionName?: string) => Promise<ImportedAsset | null>
    importPaths: (paths: string[], kind?: NodeKind, collectionName?: string) => Promise<ImportedAsset[]>
    inspectBatch: (paths: string[], kind: AssetBatchKind) => Promise<AssetBatchInspection[]>
    chooseBatch: (kind: AssetBatchKind) => Promise<AssetBatchInspection[]>
    importBuffer: (bytes: ArrayBuffer, mimeType: string, name: string, metadata?: ImportedAsset['metadata']) => Promise<ImportedAsset>
    markCanvasCopy: () => Promise<void>
    pasteImages: () => Promise<ImportedAsset[] | null>
    readCharacterImage: (id: string) => Promise<{ bytes: ArrayBuffer; mimeType: string }>
    validateCharacterImage: (id: string, mode: CharacterInputMode) => Promise<CharacterImageValidationResult>
    saveCharacterSheet: (bytes: ArrayBuffer, name: string, previousPath?: string) => Promise<{ path: string; url: string }>
    commitCharacterCollection: (request: CharacterCollectionCommitRequest) => Promise<CharacterCollectionCommitResult>
    commitSemanticResult: (request: SemanticAssetCommitRequest) => Promise<SemanticAssetCommitResult>
    pathForFile: (file: File) => string
    list: () => Promise<ImportedAsset[]>
    rename: (id: string, name: string) => Promise<ImportedAsset>
    updateMetadata: (id: string, metadata: ImportedAsset['metadata']) => Promise<ImportedAsset>
    updateState: (id: string, patch: { favorite?: boolean; trashedAt?: string | null }) => Promise<ImportedAsset>
    updateCollection: (ids: string[], patch: { assetName?: string; favorite?: boolean; trashedAt?: string | null }) => Promise<ImportedAsset[]>
    trashCollection: (ids: string[], workflow: WorkflowDocument) => Promise<ImportedAsset[]>
    restoreCollection: (ids: string[], workflow: WorkflowDocument) => Promise<ImportedAsset[]>
    deleteCollection: (ids: string[], workflow: WorkflowDocument) => Promise<Array<{ id: string; path: string }>>
    delete: (id: string) => Promise<{ id: string; path: string }>
    reveal: (id: string) => Promise<void>
    revealCollection: (id: string) => Promise<void>
    revealPath: (path: string) => Promise<void>
    copyMedia: (path: string, type: 'image' | 'video' | 'audio') => Promise<void>
    exportMetadata: (id: string) => Promise<string | null>
    exportPackage: (id: string) => Promise<string | null>
    importPackage: () => Promise<ImportedAsset[]>
    promote: (paths: string[], kind: 'character' | 'element' | 'location' | 'wardrobe' | 'style-reference' | 'storyboard', collectionName: string) => Promise<ImportedAsset[]>
    saveStylePrompt: (name: string, prompt: string, modelId: string, intent: SemanticAssetSaveIntent) => Promise<ImportedAsset>
    status: () => Promise<AssetLinkStatus[]>
    relink: (id: string, mode: AssetRelinkMode) => Promise<AssetRelinkResult | null>
    relinkMissing: () => Promise<AssetRelinkResult | null>
  }
  assistant: {
    rewrite: (provider: 'omniroute' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot', text: string, instruction?: string, model?: string) => Promise<string>
  }
  generation: {
    higgsfieldJobs: () => Promise<HiggsfieldJobView[]>
    higgsfieldAction: (command: HiggsfieldJobCommand) => Promise<{ job: HiggsfieldJobView; result?: GenerationResult }>
    run: (request: GenerationRequest) => Promise<GenerationResult>
    cancel: (nodeId: string) => Promise<boolean>
    estimate: (request: GenerationRequest) => Promise<GenerationCostEstimate | null>
    onProgress: (listener: (payload: { nodeId: string; message: string; status: string }) => void) => () => void
  }
  history: {
    list: () => Promise<HistoryEntry[]>
  }
  experiments: {
    recordWinner: (record: { nodeId: string; modelId: string; prompt: string; recipeVersions: string[]; outputPath: string; chosenAt: string }) => Promise<void>
  }
}
