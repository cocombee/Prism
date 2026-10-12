import { projectFolderPath, projectScaffoldPaths, type ProjectFolder } from './projectFolders'
import { browseElevenVoices, readVoiceFacets, addElevenSharedVoice, removeElevenVoice, getElevenBrowserVoice, readFalBrowserVoices } from './elevenVoiceBrowser'
import { VoiceRecentStore } from './voiceRecentStore'
import { validateVoiceQuery, voicePathId, filterBrowserVoices, type VoiceBrowserProvider } from '../shared/voiceBrowser'
import { isLockedArtworkReference } from '../shared/inputRules'
import { linkBytePlusPortrait, resolveBytePlusPortrait, preserveBytePlusPortraitMetadata, revokeBytePlusPortrait, portraitMediaType } from './byteplusPortrait'
import type { BytePlusPortraitLinkRequest } from '../shared/types'
import { executeFalDraftRecovery } from './falDraftRecovery'
import type { BytePlusCreatePayload } from '../shared/byteplusSeedance'
import { executeVideoDraftCompletion } from './videoDraftCompletion'
import { createVideoDraftReceipt, supportsFalSeedanceDraft, FAL_SEEDANCE_DRAFT_COMPLETE, type VideoDraftReceipt } from '../shared/videoDraft'
import { assistantThinkingSelection, OPENAI_API_REASONING_EFFORTS, openAiThinkingRequest } from '../shared/assistantThinking'
import { PromptBillingStore } from './promptBillingStore'
import { PromptRewriteRouter, type PromptRequestOwner } from './promptRewriteRouter'
import { ClaudeSubscriptionRuntime } from './claudeSubscription'
import { CodexSubscriptionRuntime } from './codexSubscription'
import { GeminiSubscriptionRuntime } from './geminiSubscription'
import type { PromptRewriteOptions, PromptBillingMode } from '../shared/promptConnection'
import { assertVideoProviderPromptPreflight } from '../shared/providerPromptPreflight'
import { effectiveProviderPromptOwnership } from '../shared/providerPromptOwnership'
import { SeedancePromptIntegrityError } from '../shared/seedancePromptIntegrity'
import { nativeFalPromptTransport } from '../shared/nativeFalPromptTransport'
import { requiresGeneratedDialogueAudio, VideoDialogueAudioConflictError } from '../shared/videoDialogueAudio'
import { persistHiggsfieldOutput } from './higgsfieldOutput'
import { performHiggsfieldJobAction, higgsfieldRecoveryView, higgsfieldJobCommand, HiggsfieldJobActions } from './higgsfieldJobRecovery'
import { HiggsfieldJobStore, higgsfieldCredentialIdentity, higgsfieldJobView } from './higgsfieldJobStore'
import { beginHiggsfieldJob } from './higgsfieldJobLifecycle'
import type { HiggsfieldJobScope, HiggsfieldJobView } from '../shared/higgsfieldJobs'
import type { HiggsfieldJobObserver } from './higgsfieldApi'
import { projectServiceProfileSelection } from '../shared/serviceProfiles'
import { inspectHiggsfieldImage } from './higgsfieldImageInspection'
import { executeHiggsfieldSeedanceGeneration } from './higgsfieldSeedanceGeneration'
import { executeHiggsfieldTextVideoGeneration } from './higgsfieldTextVideoGeneration'
import { executeHiggsfieldReferenceVideoGeneration } from './higgsfieldReferenceVideoGeneration'
import { higgsfieldSeedanceManagedMedia } from './higgsfieldSeedanceManagedMedia'
import { executeHiggsfieldGeneration } from './higgsfieldGeneration'
import { HiggsfieldApi, HiggsfieldRemoteJobError } from './higgsfieldApi'
import { probeManagedMp4 } from './managedVideoProbe'
import { HIGGSFIELD_BUNDLED_CATALOG_REVISION, higgsfieldBundledCatalogModels, planHiggsfieldNativeInput, higgsfieldSeedanceRequest, type HiggsfieldMediaSource, type HiggsfieldPreset } from '../shared/higgsfieldNative'
import { legacyVideoDurationPlan, authoredTimelineSeconds } from '../shared/videoTiming'
import { prepareDirectImageInputs } from './directImageInputs'
import { directImageControls } from '../shared/directImageControls'
import { validateFalContractValue } from './falSchemaValidation'
import { readFishAdvertisedCatalog } from './fishCatalogDiscovery'
import { HiggsfieldPublicCatalog } from './higgsfieldCatalogDiscovery'
import { readHiggsfieldInputContract } from './higgsfieldInputContract'
import { resolveHiggsfieldCurrentInput } from './higgsfieldCurrentInput'
import { loadOwnedWorkflow, saveOwnedWorkflow } from './workflowPersistence'
import type { WorkflowSaveOwner } from '../shared/workflowSaveOwnership'
import { compileFishAudioRequest, FISH_CATALOG_TTL } from '../shared/fishAudio'
import { generateFishAudio } from './fishAudioApi'
import { persistFishAudio } from './fishAudioPersistence'
import { ScopedCatalogCache } from './scopedCatalogCache'
import { readFalModelCatalog } from './falCatalogDiscovery'
import { readFalCatalogSnapshot, writeFalCatalogSnapshot } from './falCatalogSnapshot'
import { FalModelSchemaCache, readFalModelSchema } from './falSchemaDiscovery'
import { executeFalNativeGeneration } from './falNativeGeneration'
import { assetPromotionOrigin } from './assetPromotionOrigin'
import { assertFalMediaFileLimit } from './falMediaFileLimit'
import type { FalSchemaContract } from '../shared/falSchemaBinding'
import { falEndpointId } from '../shared/falModelCatalog'
import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, net, protocol, safeStorage, session, shell } from 'electron'
import { copyFile, mkdir, readFile, readdir, rename, rm, rmdir, stat, unlink, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import type { Dirent } from 'node:fs'
import { AsyncLocalStorage } from 'node:async_hooks'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { FalClient } from '@fal-ai/client'
import { createOwnedFalClient, subscribeOwnedFalClient } from './falClientOwner'
import { resolveVideoModel, type VideoModelDefinition } from '../shared/videoModels'
import { BYTEPLUS_BASE_URL } from '../shared/byteplusSeedance'
import { bytePlusLiveModels, isBytePlusActivationFailure } from '../shared/byteplusAvailability'
import { compileBytePlusGenerationRequest } from './byteplusGeneration'
import { runBytePlusTask, runBytePlusTaskAndDownload } from './byteplusTaskRunner'
import { clarityUpscalerInput } from '../shared/clarityUpscaler'
import { realEsrganVideoUpscalerInput } from '../shared/videoUpscaler'
import { effectiveFalImageModel, falImageEditInput, FAL_IMAGE_MODELS, imageReferenceLimit } from '../shared/imageModels'
import { publishedFalEstimate } from '../shared/generationPricing'
import { fluxKontextInput, nanoBananaInput } from '../shared/falImageInputs'
import { providerDisplayName, providerErrorDetail } from '../shared/providerErrors'
import { ProjectCommandQueue } from './projectCommandQueue'
import { ProjectProfileRecoveryState } from './projectProfileTransaction'
import { ProviderRequestState } from './providerRequestState'
import { generationServiceProvider } from '../shared/generationServiceProvider'
import { readProviderCatalogPages } from './providerCatalogPages'
import { generateElevenAudio, readElevenAvailability, readPublicElevenVoices } from './elevenLabsApi'
import { persistElevenAudio } from './elevenLabsAudioPersistence'
import { isDirectElevenAudio } from '../shared/elevenLabsAudio'
import { mediaRenameStem, normalizeImportedMediaName, normalizeLogicalAssetName, normalizedOrdinaryMediaIdentity } from '../shared/assetNaming'
import { isExactRelinkCandidate, mediaFamily } from '../shared/assetInteraction'
import { isFalBillingScopeDenial, shouldRecheckFalBillingFailure } from '../shared/falAccountStatus'
import type {
  GenerationRequest,
  GenerationResult,
  HistoryEntry,
  ImportedAsset,
  AssetLinkStatus,
  AssetRelinkResult,
  CharacterCollectionCommitRequest,
  CharacterCollectionCommitResult,
  CharacterInputMode,
  NodeKind,
  ProjectDocument,
  ProjectWorkspace,
  ServiceConnection,
  ServiceModelAvailability,
  ServiceAccountStatus,
  ServiceProvider,
  WorkflowDocument,
} from '../shared/types'

import { compileProviderPromptForSubmission, klingReferenceLegend, klingStoryboardPrompts, orderedProviderImageReferences, providerArtworkCarrierRequest, providerNativeImagePrompt, providerSeedancePayloadCompilation, resolvedPromptWithReferences, selectSeedanceReferences } from '../shared/referenceInstructions'
import { modelDisplayName } from '../shared/modelNames'
import { generationTimingKey } from '../shared/generationTiming'
import { providerNativeShutterFields } from '../shared/providerShutter'
import { assertGenerationRequirements } from '../shared/generationReadiness'
import { seedanceReferenceCandidates } from '../shared/referenceCapacity'
import { pruneMissingGeneratedResults, recoverCompletedGenerationNodes } from '../shared/workflowRunRecovery'
import { characterCollectionMembersForIntent, collisionSafeCollectionName, planCharacterCollectionCommit } from '../shared/characterPersistence'
import { compositeLockedArtwork } from './artworkComposite'
import { validateCharacterImageFile } from './characterImageValidation'
import { inspectAssetBatchFiles } from './assetBatchInspection'
import { restoreRecoverableAssetFile, stageRecoverableAssetFile } from './assetRecovery'
import { renameImportedAssetCollectionFiles, restoreImportedAssetCollectionFiles } from './assetCollectionRename'
import { workflowMediaAssets } from './workflowMediaAssets'
import { registerSemanticAssetSaveIpc } from './semanticAssetSaveIpc'
import { recoverSemanticAssetTransactions } from './semanticAssetSaveTransaction'
import type { AssistantProvider } from '../shared/assistantModels'
import { omniRouteChatRequest, omniRouteModelOptions, omniRouteRewriteOutput, type OmniRouteModelRecord } from '../shared/omniRouteModels'

import { ServiceProfileStore } from './serviceProfileStore'
import { withProjectServiceProfileOverride } from '../shared/serviceProfiles'
import {
  GenerationLifecycle,
  JsonMutationQueue,
  assertManagedPathAllowMissingLeaf,
  assertRealpathContained,
  boundedPromise,
  createStoredZip,
  mediaFileResponse,
  mimeFor,
  portableMayReplaceCanonical,
  readStoredZip,
  revealDirectory,
  safeFolderName,
  type ProjectGenerationIdentity,
} from './mainSafety'

const execFileAsync = promisify(execFile)


const falElectronFetch: typeof fetch = (input, init) => net.fetch(input instanceof URL ? input.toString() : input, init)

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'prism-asset',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true },
  },
])

const MODEL_IDS: Partial<Record<NodeKind, string>> = {
  'image-generator': 'fal-ai/flux/schnell',
  'image-editor': 'fal-ai/flux-pro/kontext',
  upscaler: 'fal-ai/clarity-upscaler',
  'video-generator': 'fal-ai/kling-video/v3/standard/text-to-video',
  voiceover: 'fal-ai/elevenlabs/tts/eleven-v3',
  'sound-effects': 'fal-ai/elevenlabs/sound-effects/v2',
  'music-generator': 'fal-ai/elevenlabs/music',
}

let mainWindow: BrowserWindow | null = null
let currentProject: ProjectWorkspace | null = null
let currentProjectDocumentPath: string | null = null
let pendingProjectDocumentPath: string | null = null
const runtimeServiceFailures = new ProviderRequestState<ServiceAccountStatus & { expiresAt?: number }>()
const generationLifecycle = new GenerationLifecycle()
const generationContext = new AsyncLocalStorage<ProjectGenerationIdentity>()
const assetJsonMutations = new JsonMutationQueue()
const historyJsonMutations = new JsonMutationQueue()
const projectJsonMutations = new JsonMutationQueue()
const projectCommands = new ProjectCommandQueue()
const projectProfileRecovery = new ProjectProfileRecoveryState()
const falCatalogCache = new ScopedCatalogCache<ServiceModelAvailability>(5 * 60_000)
const fishCatalogCache = new ScopedCatalogCache<ServiceModelAvailability>(FISH_CATALOG_TTL - 60_000)
const higgsfieldCatalogCache = new ScopedCatalogCache<ServiceModelAvailability>(8 * 60_000)
const higgsfieldPublicCatalog = new HiggsfieldPublicCatalog((url, init) => session.fromPartition('prism-public-higgsfield-documents').fetch(url, init))
let fishPublicRead: Promise<ServiceModelAvailability> | undefined
const falSchemaCache = new FalModelSchemaCache()
const higgsfieldPresetCache = new ScopedCatalogCache<HiggsfieldPreset[]>(9 * 60_000)
let serviceProfileStoreInstance: ServiceProfileStore | null = null

type StoredProjectWorkspace = ProjectWorkspace & { documentPath?: string }

const dataRoot = () => join(app.getPath('userData'), 'studio-data')
const workspacePointerPath = () => join(dataRoot(), 'current-project.json')
const recentProjectsPath = () => join(dataRoot(), 'recent-projects.json')
const projectManifestPath = (root: string) => join(root, 'Prism Foundry Project.json')
const projectDocumentFolder = (root: string) => projectFolderPath(root, 'Project')
const defaultProjectDocumentPath = (root: string) => join(projectDocumentFolder(root), `${safeFolderName(basename(root), 'Untitled Project')}.prismflow`)
const projectPath = (...parts: string[]) => {
  const generation = generationContext.getStore()
  const rootPath = generation?.rootPath || currentProject?.rootPath
  if (!rootPath) throw new Error('Choose or open a project folder first.')
  return join(rootPath, ...parts)
}

const projectFolder = (name: ProjectFolder, ...parts: string[]) => projectFolderPath(projectPath(), name, ...parts)

function assertGenerationCommit(): void {
  const identity = generationContext.getStore()
  if (identity) generationLifecycle.assertActive(identity)
}

function currentProjectOwner(): string {
  return currentProject && currentProjectDocumentPath
    ? JSON.stringify([currentProject.id, resolve(currentProject.rootPath), resolve(currentProjectDocumentPath)]) : ''
}

function activateProviderRequestProject(): void {
  runtimeServiceFailures.activateProject(currentProjectOwner() || null)
}

function withProviderRequest<T>(provider: ServiceProvider, work: () => Promise<T>, validateResult = true): Promise<T> {
  projectProfileRecovery.assertReady()
  projectCommands.assertIdle()
  activateProviderRequestProject()
  return runtimeServiceFailures.run(provider, work, { overrides: currentProject?.serviceProfileOverrides, validateResult })
}

function activateCurrentProject(): void {
  activateProviderRequestProject()
  if (!currentProject || !currentProjectDocumentPath) {
    generationLifecycle.activate(null)
    return
  }
  generationLifecycle.activate({
    projectId: currentProject.id,
    rootPath: resolve(currentProject.rootPath),
    documentPath: resolve(currentProjectDocumentPath),
  })
}
const canvasRoot = () => projectFolder('Canvas')
const workflowPath = () => join(canvasRoot(), 'workflow.json')
const assetsIndexPath = () => join(canvasRoot(), 'assets.json')
const globalStylesRoot = () => join(dataRoot(), 'styles')
const globalStylesIndexPath = () => join(globalStylesRoot(), 'styles.json')
const historyPath = () => join(canvasRoot(), 'history.json')

const credentialPath = () => join(dataRoot(), 'credential.enc')
const fishCredentialPath = () => join(dataRoot(), 'fish-credential.enc')
const serviceCredentialPath = (provider: ServiceProvider) => provider === 'fal' ? credentialPath()
  : provider === 'fish' ? fishCredentialPath()
    : join(dataRoot(), `${provider}-credential.enc`)
const OMNIROUTE_BASE_URL = 'http://127.0.0.1:20128/v1'
const SERVICE_PROVIDERS: ServiceProvider[] = ['higgsfield', 'elevenlabs', 'fal', 'byteplus', 'fish', 'omniroute', 'openai', 'anthropic', 'google', 'deepseek', 'moonshot']
const ASSISTANT_PROVIDERS = new Set<AssistantProvider>(['omniroute', 'openai', 'anthropic', 'google', 'deepseek', 'moonshot'])

function isAssistantProvider(provider: unknown): provider is AssistantProvider {
  return typeof provider === 'string' && ASSISTANT_PROVIDERS.has(provider as AssistantProvider)
}

async function inspectFalAccount(key: string): Promise<{ accountIdentifier: string; balance?: number; currency?: string }> {
  const response = await falElectronFetch('https://api.fal.ai/v1/account/billing?expand=credits', {
    headers: { Authorization: `Key ${key}` },
  })
  const body = await response.json().catch(() => ({})) as { username?: string; credits?: { current_balance?: number; currency?: string }; detail?: string; error?: { message?: string } }
  if (!response.ok) {
    const message = body.error?.message || body.detail || 'Could not validate this fal.ai account.'
    if (isFalBillingScopeDenial(response.status, message)) {
      const error = new Error('fal.ai did not reveal account identity for this API-scoped key.') as Error & { code?: string }
      error.code = 'FAL_IDENTITY_UNAVAILABLE'
      throw error
    }
    throw new Error(message)
  }
  if (!body.username?.trim()) throw new Error('fal.ai validated the key but did not return an account username.')
  return {
    accountIdentifier: body.username.trim(),
    balance: body.credits?.current_balance,
    currency: body.credits?.currency,
  }
}

function serviceProfileStore(): ServiceProfileStore {
  if (!serviceProfileStoreInstance) {
    serviceProfileStoreInstance = new ServiceProfileStore({
      dataRoot: dataRoot(),
      encryptString: (value) => {
        if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable.')
        return safeStorage.encryptString(value)
      },
      decryptString: (value) => {
        if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable.')
        return safeStorage.decryptString(value)
      },
      createId: randomUUID,
    })
  }
  return serviceProfileStoreInstance
}

async function ensureDataFolders(): Promise<void> {
  await mkdir(dataRoot(), { recursive: true })
  await mkdir(globalStylesRoot(), { recursive: true })
}

async function serviceConnected(provider: ServiceProvider): Promise<boolean> {
  if (provider === 'omniroute') {
    try {
      const response = await fetch(`${OMNIROUTE_BASE_URL}/models`, { signal: AbortSignal.timeout(3_000) })
      return response.ok
    } catch {
      return false
    }
  }
  return serviceProfileStore().isConnectedForProject(provider, runtimeServiceFailures.overrides(provider, currentProject?.serviceProfileOverrides))
}

async function saveServiceCredential(provider: ServiceProvider, raw: unknown): Promise<void> {
  if (provider === 'omniroute') throw new Error('OmniRoute is a local gateway and does not use a Prism-stored API key.')
  const key = typeof raw === 'string' ? raw.trim() : ''
  if (key.length < 20) throw new Error('That API key does not look complete.')
  await runtimeServiceFailures.change(provider, () => serviceProfileStore().addProfile(provider, key))
}

async function removeServiceCredential(provider: ServiceProvider): Promise<void> {
  if (provider === 'omniroute') return
  await runtimeServiceFailures.change(provider, async () => {
    try { await unlink(serviceCredentialPath(provider)) } catch { /* Already absent. */ }
  })
}

async function loadServiceCredential(provider: ServiceProvider): Promise<string> {
  if (provider === 'omniroute') throw new Error('OmniRoute local requests do not load a Prism credential.')
  runtimeServiceFailures.assertCurrent(provider)
  const key = await serviceProfileStore().loadCredentialForProject(provider, runtimeServiceFailures.overrides(provider, currentProject?.serviceProfileOverrides))
  runtimeServiceFailures.assertCurrent(provider)
  return key
}

let promptRewriteRouterInstance: PromptRewriteRouter | undefined
function promptRewriteRouter(): PromptRewriteRouter {
  return promptRewriteRouterInstance ||= new PromptRewriteRouter({store:new PromptBillingStore(app.getPath('userData')),subscriptions:{
    openai:new CodexSubscriptionRuntime(join(app.getPath('userData'),'subscription-clients','codex'),url=>shell.openExternal(url)),
    anthropic:new ClaudeSubscriptionRuntime({configurationDirectory:join(app.getPath('userData'),'subscription-clients','claude')}),google:new GeminiSubscriptionRuntime(join(app.getPath('userData'),'subscription-clients','google')),
  }})
}
async function promptRequestOwner(provider:AssistantProvider):Promise<PromptRequestOwner>{
  const assertCurrent=()=>runtimeServiceFailures.assertCurrent(provider)
  const registry=await serviceProfileStore().listProfiles(provider,false);assertCurrent()
  const overrides=runtimeServiceFailures.overrides(provider,currentProject?.serviceProfileOverrides)
  const selection=projectServiceProfileSelection(registry,{serviceProfileOverrides:overrides},provider)
  const apiReady=await serviceProfileStore().isConnectedForProject(provider,overrides);assertCurrent()
  return{provider,projectScope:currentProjectOwner(),apiProfileId:selection.profile?.id,apiReady,assertCurrent}
}

async function rewriteWithAssistant(provider: AssistantProvider, text: unknown, instruction: unknown, requestedModel?: unknown, signal?: AbortSignal, assertCurrent: () => void = () => undefined): Promise<string> {
  const source = typeof text === 'string' ? text.trim() : ''
  if (!source) throw new Error('Write a panel prompt first.')
  const direction = typeof instruction === 'string' && instruction.trim() ? instruction.trim() : 'Clarify only visible action and the selected camera movement. Preserve every other prompt detail.'
  const prompt = `${direction}\n\nPreserve named characters, locations, actions, continuity facts, and duration. Return only the rewritten prompt.\n\nOriginal prompt:\n${source}`
  const model = typeof requestedModel === 'string' && requestedModel.trim() ? requestedModel.trim() : provider === 'omniroute' ? 'auto/best-chat' : provider === 'openai' ? 'gpt-5-mini' : provider === 'anthropic' ? 'claude-sonnet-4-20250514' : provider === 'deepseek' ? 'deepseek-v4-flash' : provider === 'moonshot' ? 'kimi-k3' : 'gemini-3.5-flash'
  if (provider === 'omniroute') {
    try {
      assertCurrent()
      const response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(omniRouteChatRequest(model, prompt)), signal: signal || AbortSignal.timeout(120_000) })
      const body = await response.json() as Record<string, unknown>
      if (!response.ok) {
        const error = new Error((body.error as { message?: string } | undefined)?.message || 'The local OmniRoute rewrite request failed.')
        Object.assign(error, { status: response.status })
        throw error
      }
      const rewritten = omniRouteRewriteOutput(body)
      if (!rewritten) throw new Error('OmniRoute returned no rewritten prompt.')
      assertCurrent()
      runtimeServiceFailures.delete(provider)
      return rewritten
    } catch (error) {
      rememberServiceFailure(provider, error)
      throw error
    }
  }
  assertCurrent()
  const key = await loadServiceCredential(provider)
  assertCurrent()
  let response: Response
  if (provider === 'openai') {
    response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal, body: JSON.stringify(openAiThinkingRequest(model, prompt)) })
  } else if (provider === 'anthropic') {
    response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }) })
  } else if (provider === 'google') {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) })
  } else {
    const endpoint = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.moonshot.ai/v1/chat/completions'
    response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }) })
  }
  const body = await response.json() as Record<string, unknown>
  if (!response.ok) {
    const message = (body.error as { message?: string } | undefined)?.message
    const error = new Error(message || `The ${provider} rewrite request failed.`)
    Object.assign(error, { status: response.status })
    rememberServiceFailure(provider, error)
    throw error
  }
  assertCurrent()
  runtimeServiceFailures.delete(provider)
  const rewritten = provider === 'openai'
    ? (body.output_text as string | undefined) || ((body.output as Array<{ content?: Array<{ text?: string }> }> | undefined)?.flatMap((item) => item.content || []).map((item) => item.text).find(Boolean))
    : provider === 'anthropic'
      ? (body.content as Array<{ text?: string }> | undefined)?.map((item) => item.text).find(Boolean)
      : provider === 'google'
        ? (body.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.flatMap((item) => item.content?.parts || []).map((item) => item.text).find(Boolean)
        : (body.choices as Array<{ message?: { content?: string } }> | undefined)?.map((item) => item.message?.content).find(Boolean)
  if (!rewritten?.trim()) throw new Error('The assistant returned no rewritten prompt.')
  return rewritten.trim()
}

async function fetchProviderModelCatalog(provider: ServiceProvider, input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(10_000) })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not load ${providerDisplayName(provider)} model catalog: ${detail}`)
  }
}

async function readOwnedFishCatalog(): Promise<ServiceModelAvailability> {
  const scope = runtimeServiceFailures.catalogScope('fish')
  const assertCurrent = () => runtimeServiceFailures.assertCurrent('fish')
  return fishCatalogCache.read(scope, () => {
    // Public schema contains no account data. One read may serve independently
    // owned callers; each scoped cache still rejects its own late response.
    if (!fishPublicRead) {
      const pending = readFishAdvertisedCatalog(fetch).finally(() => { if (fishPublicRead === pending) fishPublicRead = undefined })
      fishPublicRead = pending
    }
    return fishPublicRead
  }, assertCurrent)
}

async function listServiceModels(provider: ServiceProvider): Promise<ServiceModelAvailability> {
  if (provider === 'higgsfield') {
    const scope = runtimeServiceFailures.catalogScope(provider), assertCurrent = () => runtimeServiceFailures.assertCurrent(provider)
    try { return await higgsfieldCatalogCache.read(scope, async () => (await higgsfieldPublicCatalog.read()).availability, assertCurrent) }
    catch (error) {
      assertCurrent()
      const previous = higgsfieldCatalogCache.snapshot(scope)
      const message = error instanceof Error ? error.message : 'Could not refresh public Higgsfield models.'
      if (previous) return { ...previous, catalogStale: true, catalogError: message }
      return { provider, verified: false, catalogStale: true, catalogComplete: false, catalogError: message, catalogSource: 'Retained native Higgsfield contracts; public discovery unavailable', catalogFingerprint: HIGGSFIELD_BUNDLED_CATALOG_REVISION, models: higgsfieldBundledCatalogModels() }
    }
  }

  if (provider === 'elevenlabs') {
    const key = await loadServiceCredential(provider)
    const availability = await readElevenAvailability({ fetch, key })
    runtimeServiceFailures.delete(provider)
    return availability
  }
  if (provider === 'fal') {
    const scope = runtimeServiceFailures.catalogScope(provider)
    const assertCurrent = () => runtimeServiceFailures.assertCurrent(provider)
    try {
      return await falCatalogCache.read(scope, async () => {
        const key = await loadServiceCredential(provider)
        const models = await readFalModelCatalog({ request: (url) => fetchProviderModelCatalog(provider, url, { headers: { Authorization: `Key ${key}` } }), assertCurrent })
        const publicVoices = await readPublicElevenVoices(fetch).then(voices => ({ voices })).catch(() => ({ voiceCatalogError: 'Public voice previews are unavailable.' }))
        assertCurrent()
        const availability: ServiceModelAvailability = { provider, verified: true, models, catalogCheckedAt: new Date().toISOString(), ...publicVoices }
        await writeFalCatalogSnapshot(join(app.getPath('userData'), 'fal-public-model-catalog.json'), availability).catch(() => undefined)
        assertCurrent()
        return availability
      }, assertCurrent)
    } catch (error) {
      assertCurrent()
      const previous = falCatalogCache.snapshot(scope)
      if (previous) return { ...previous, catalogStale: true, catalogError: error instanceof Error ? error.message : 'Could not refresh fal models.' }
      throw error
    }
  }
  if (provider === 'byteplus') {
    const key = await loadServiceCredential(provider)
    const response = await fetchProviderModelCatalog(provider, `${BYTEPLUS_BASE_URL}/models`, { headers: { Authorization: 'Bearer ' + key } })
    const body = await response.json().catch(() => ({})) as { data?: Array<{ id?: string; name?: string }>; error?: { message?: string }; message?: string }
    if (!response.ok) {
      const error = new Error(body.error?.message || body.message || 'Could not load BytePlus ModelArk models.')
      Object.assign(error, { status: response.status })
      throw error
    }
    const models = bytePlusLiveModels(body.data || [])
    runtimeServiceFailures.delete('byteplus')
    return { provider, verified: true, models }
  }
  if (provider === 'omniroute') {
    const response = await fetchProviderModelCatalog(provider, `${OMNIROUTE_BASE_URL}/models`, { signal: AbortSignal.timeout(10_000) })
    const body = await response.json() as { data?: OmniRouteModelRecord[]; error?: { message?: string } }
    if (!response.ok) throw new Error(body.error?.message || 'Could not load the live OmniRoute model catalog.')
    return { provider, verified: true, models: omniRouteModelOptions(body.data || []) }
  }
  if (provider === 'fish') {
    const scope = runtimeServiceFailures.catalogScope(provider)
    try { return await readOwnedFishCatalog() }
    catch (error) {
      runtimeServiceFailures.assertCurrent(provider)
      const previous = fishCatalogCache.snapshot(scope)
      if (previous) return { ...previous, catalogStale: true, catalogError: error instanceof Error ? error.message : 'Could not refresh the official Fish Audio contract.' }
      throw error
    }
  }
  const key = await loadServiceCredential(provider)
  let body: Record<string, unknown>
  if (provider === 'anthropic' || provider === 'google') {
    const initialUrl = provider === 'anthropic'
      ? 'https://api.anthropic.com/v1/models?limit=1000'
      : 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'
    const headers: Record<string, string> = provider === 'anthropic'
      ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
      : { 'x-goog-api-key': key }
    body = await readProviderCatalogPages({ provider, initialUrl, request: (url) => fetchProviderModelCatalog(provider, url, { headers }) })
  } else {
    const response = await fetchProviderModelCatalog(provider, provider === 'openai' ? 'https://api.openai.com/v1/models'
      : provider === 'deepseek' ? 'https://api.deepseek.com/models' : 'https://api.moonshot.ai/v1/models', { headers: { Authorization: 'Bearer ' + key } })
    body = await response.json() as Record<string, unknown>
    if (!response.ok) throw new Error((body.error as { message?: string } | undefined)?.message || `Could not load ${provider} models.`)
  }
  let models = provider === 'openai'
    ? (body.data as Array<{ id: string }> | undefined || []).filter((item) => /^(gpt|o\d)/i.test(item.id)).map((item) => ({ id: item.id, label: modelDisplayName(item.id) }))
    : provider === 'anthropic'
      ? (body.data as Array<{ id: string; display_name?: string }> | undefined || []).map((item) => ({ id: item.id, label: modelDisplayName(item.id, item.display_name) }))
      : provider === 'google'
        ? (body.models as Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> | undefined || []).filter((item) => item.supportedGenerationMethods?.includes('generateContent')).map((item) => ({ id: item.name.replace(/^models\//, ''), label: modelDisplayName(item.name.replace(/^models\//, ''), item.displayName) }))
        : (body.data as Array<{ id: string; display_name?: string }> | undefined || []).map((item) => ({ id: item.id, label: modelDisplayName(item.id, item.display_name) }))
  if (provider === 'openai') {
    // Discover capabilities from the official installed client; API admission still requires an exact live API model ID.
    try {
      const capabilities = await new CodexSubscriptionRuntime(join(app.getPath('userData'), 'subscription-clients', 'codex'), async () => { throw new Error('Catalog discovery never signs in.') }).models()
      models = models.flatMap(model => [model, ...capabilities.models.filter(option => {
        const choice = assistantThinkingSelection(option.id)
        return choice.model === model.id && choice.effort && OPENAI_API_REASONING_EFFORTS.has(choice.effort)
      }).map(option => ({ id: option.id, label: `${model.label} · ${assistantThinkingSelection(option.id).effort}` }))])
    } catch { /* No verified effort metadata: retain discovered base API options only. */ }
  }
  return { provider, verified: true, models }
}

function classifyServiceFailure(provider: ServiceProvider, status: number, message: string): ServiceAccountStatus {
  const lowered = message.toLowerCase()
  const state = provider === 'byteplus' && isBytePlusActivationFailure(message) ? 'unavailable'
    : status === 429 ? 'temporarily-limited'
    : status === 402 || /credit|balance|billing|quota|insufficient/.test(lowered) ? 'credit-required'
      : status === 401 || status === 403 ? 'unavailable' : 'unknown'
  return { provider, state, message, checkedAt: new Date().toISOString() }
}

function rememberServiceFailure(provider: ServiceProvider, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  const status = Number((error as { status?: number; statusCode?: number } | null)?.status || (error as { statusCode?: number } | null)?.statusCode || (/429|rate.?limit|too many|cooldown/i.test(message) ? 429 : /402|credit|balance|billing|quota|account.+lock/i.test(message) ? 402 : /401|403|unauthorized|forbidden|invalid.+key/i.test(message) ? 403 : 0))
  const classified = classifyServiceFailure(provider, status, message)
  runtimeServiceFailures.set(provider, {
    ...classified,
    expiresAt: classified.state === 'credit-required' || classified.state === 'unavailable' ? undefined : Date.now() + 5 * 60_000,
  })
}

async function serviceAccountStatus(provider: ServiceProvider): Promise<ServiceAccountStatus> {
  if (!await serviceConnected(provider)) return { provider, state: 'unavailable', message: 'Connect this service to check access.', checkedAt: new Date().toISOString() }
  const remembered = runtimeServiceFailures.get(provider)
  if (remembered && (!remembered.expiresAt || remembered.expiresAt > Date.now()) && (provider !== 'fal' || !shouldRecheckFalBillingFailure(remembered.state))) return remembered
  if (remembered) runtimeServiceFailures.delete(provider)
  if (provider !== 'fal') {
    const message = provider === 'elevenlabs'
      ? 'ElevenLabs credential connected. View remaining usage and plan access in the ElevenLabs dashboard.'
      : provider === 'byteplus'
      ? 'Connected to BytePlus ModelArk. Remaining quota and balance are not exposed by this provider API.'
      : provider === 'omniroute'
      ? 'Local OmniRoute gateway connected. Its live model catalog is available; upstream access remains owned by OmniRoute.'
      : provider === 'google'
        ? 'Connected. Google does not expose remaining Gemini API-key quota; rate-limit errors will appear here.'
      : provider === 'openai'
        ? 'Connected. OpenAI does not expose remaining API quota through the model API; billing limits stay in the OpenAI dashboard.'
        : provider === 'anthropic'
          ? 'Connected. Anthropic does not expose remaining API quota through the model API; billing limits stay in the Anthropic Console.'
          : 'Connected. Remaining usage is not exposed by this provider API.'
    return { provider, state: 'ready', message, checkedAt: new Date().toISOString() }
  }
  const key = await loadServiceCredential('fal')
  const response = await fetch('https://api.fal.ai/v1/account/billing?expand=credits', { headers: { Authorization: `Key ${key}` } })
  const body = await response.json().catch(() => ({})) as { username?: string; credits?: { current_balance?: number; currency?: string }; detail?: string; error?: { message?: string } }
  if (!response.ok) {
    const message = body.error?.message || body.detail || 'Could not read fal.ai billing status.'
    if (isFalBillingScopeDenial(response.status, message)) {
      runtimeServiceFailures.delete(provider)
      return {
        provider,
        state: 'ready',
        message: 'Connected. This API-scoped key does not expose billing credits; generation access is verified when a node runs.',
        checkedAt: new Date().toISOString(),
      }
    }
    return classifyServiceFailure(provider, response.status, message)
  }
  if (typeof body.credits?.current_balance === 'number' && body.credits.current_balance > 0) runtimeServiceFailures.delete(provider)
  const positiveBalance = typeof body.credits?.current_balance === 'number' && body.credits.current_balance > 0
  return {
    provider,
    state: typeof body.credits?.current_balance === 'number' && body.credits.current_balance <= 0 ? 'credit-required' : 'ready',
    message: positiveBalance && remembered?.state === 'credit-required'
      ? 'Live prepaid credit is available; the last selected model route returned its own billing-limit error.'
      : typeof body.credits?.current_balance === 'number' ? 'Live prepaid credit balance' : 'Connected; this key does not expose credits.',
    balance: body.credits?.current_balance,
    currency: body.credits?.currency || 'USD',
    username: body.username,
    checkedAt: new Date().toISOString(),
  }
}

function estimateModelId(request: GenerationRequest): string | undefined {
  if (request.kind === 'voiceover' && request.voiceEngine === 'fish-audio' || isDirectElevenAudio(request)) return undefined
  if ((request.kind === 'image-generator' || request.kind === 'image-editor') && request.imageProvider && request.imageProvider !== 'fal') return request.imageModelId
  if (request.kind === 'video-generator') {
    const model = resolveVideoModel(request.videoEngine)
    return model.id === 'wan-controlled' ? 'fal-ai/wan/v2.2-5b/text-to-video/distill' : model.id
  }
  if (request.kind === 'image-generator' || request.kind === 'image-editor') return effectiveFalImageModel(request)
  return MODEL_IDS[request.kind]
}

async function estimateGenerationCost(request: GenerationRequest) {
  if ((request.kind === 'image-generator' || request.kind === 'image-editor') && request.imageProvider && request.imageProvider !== 'fal') return null
  if (request.kind === 'video-generator' && resolveVideoModel(request.videoEngine).provider === 'byteplus') return null
  const modelId = estimateModelId(request)
  if (!modelId) return null
  // Estimates render automatically on every visible runnable node. They must stay
  // local so merely opening a project never decrypts Keychain credentials or makes
  // one provider request per node. The audited catalog calculator is request-shaped
  // (model, duration, size, quality, and quantity), unlike the route's unit-price API.
  return publishedFalEstimate(request, modelId)
}

async function scaffoldProject(root: string, existing?: ProjectWorkspace, documentPath?: string): Promise<ProjectWorkspace> {
  return projectCommands.run(() => scaffoldProjectUnlocked(root, existing, documentPath))
}

async function scaffoldProjectUnlocked(root: string, existing?: ProjectWorkspace, documentPath?: string): Promise<ProjectWorkspace> {
  await projectProfileRecovery.recover(dataRoot())
  generationLifecycle.activate(null)
  const resolvedRoot = resolve(root)
  for (const folder of projectScaffoldPaths(resolvedRoot)) await mkdir(folder, { recursive: true })
  try { await rmdir(join(resolvedRoot, '04. Styles')) } catch { /* Preserve a non-empty legacy folder for explicit migration. */ }
  const now = new Date().toISOString()
  const project: ProjectWorkspace = existing || {
    schemaVersion: 1,
    id: randomUUID(),
    name: basename(resolvedRoot),
    rootPath: resolvedRoot,
    createdAt: now,
    updatedAt: now,
  }
  const updated = { ...project, name: basename(resolvedRoot), rootPath: resolvedRoot, updatedAt: now }
  currentProject = updated
  currentProjectDocumentPath = documentPath ? resolve(documentPath) : defaultProjectDocumentPath(resolvedRoot)
  activateProviderRequestProject()
  await recoverSemanticAssetTransactions(currentProject.rootPath)
  activateCurrentProject()
  const stored: StoredProjectWorkspace = { ...updated, documentPath: currentProjectDocumentPath }
  await atomicJson(projectManifestPath(resolvedRoot), updated)
  await atomicJson(workspacePointerPath(), stored)
  await projectJsonMutations.mutateArray<StoredProjectWorkspace>(recentProjectsPath(), (recentProjects) => [
    stored,
    ...recentProjects.filter((item) => resolve(item.rootPath) !== updated.rootPath),
  ].slice(0, 30))
  if (existing) await removeLegacyImport()
  return { ...updated, documentPath: currentProjectDocumentPath }
}

async function restoreCurrentProject(): Promise<void> {
  return projectCommands.run(() => restoreCurrentProjectUnlocked())
}

async function restoreCurrentProjectUnlocked(): Promise<void> {
  await projectProfileRecovery.recover(dataRoot())
  const stored = await readJson<StoredProjectWorkspace | null>(workspacePointerPath(), null)
  if (!stored?.rootPath) return
  const manifest = await readJson<ProjectWorkspace | null>(projectManifestPath(stored.rootPath), null)
  if (manifest?.schemaVersion === 1) {
    currentProject = { ...manifest, rootPath: resolve(stored.rootPath) }
    currentProjectDocumentPath = stored.documentPath ? resolve(stored.documentPath) : defaultProjectDocumentPath(currentProject.rootPath)
    activateProviderRequestProject()
    await recoverSemanticAssetTransactions(currentProject.rootPath)
    activateCurrentProject()
    try { await rmdir(join(currentProject.rootPath, '04. Styles')) } catch { /* Preserve a non-empty legacy folder for explicit migration. */ }
    await removeLegacyImport()
  }
}

async function selectCurrentProjectServiceProfile(provider: ServiceProvider, profileId?: string): Promise<ProjectWorkspace> {
  if (!currentProject || !currentProjectDocumentPath) throw new Error('Choose or open a project folder first.')
  const requestedOwner = currentProjectOwner()
  return projectCommands.runForOwner(requestedOwner, currentProjectOwner, () => runtimeServiceFailures.change(provider, async () => {
    await projectProfileRecovery.recover(dataRoot())
    if (profileId) {
      const registry = await serviceProfileStore().listProfiles(provider, false)
      const profile = registry.profiles.find((candidate) => candidate.id === profileId && candidate.provider === provider)
      if (!profile) throw new Error('That account profile no longer exists.')
      if (profile.status !== 'connected') throw new Error('Reconnect or sign in to that account before selecting it.')
    }
    const original = currentProject!
    const documentPath = resolve(currentProjectDocumentPath!)
    return projectJsonMutations.run(documentPath, async () => {
      const updated: ProjectWorkspace = { ...withProjectServiceProfileOverride(original, provider, profileId), updatedAt: new Date().toISOString() }
      const stored: StoredProjectWorkspace = { ...updated, documentPath }
      const recent = await readStrictJsonOr<StoredProjectWorkspace[]>(recentProjectsPath(), [], 'The recent projects index')
      const document = await buildProjectDocument(updated)
      await projectProfileRecovery.commit({ dataRoot: dataRoot(), rootPath: updated.rootPath, documentPath, writes: [
        { path: projectManifestPath(updated.rootPath), value: updated },
        { path: documentPath, value: document },
        { path: workspacePointerPath(), value: stored },
        { path: recentProjectsPath(), value: [stored, ...recent.filter((item) => resolve(item.rootPath) !== resolve(updated.rootPath))].slice(0, 30) },
      ] })
      currentProject = updated
      return { ...updated, documentPath }
    })
  }))
}

function isDocumentsPath(path: string): boolean {
  const resolvedPath = resolve(path)
  return resolvedPath.includes(`${sep}Documents${sep}`) || resolvedPath.endsWith(`${sep}Documents`)
}

function assertInsideProject(path: string): string {
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  const resolvedPath = resolve(path)
  const root = `${resolve(currentProject.rootPath)}${sep}`
  if (!resolvedPath.startsWith(root)) throw new Error('The asset is outside the active project folder.')
  return resolvedPath
}

function rewritePaths(value: unknown, mapping: Map<string, string>): unknown {
  if (typeof value === 'string') {
    if (mapping.has(value)) return mapping.get(value)
    if (value.startsWith('prism-asset://local/')) {
      const source = decodeURIComponent(value.slice('prism-asset://local/'.length))
      const replacement = mapping.get(source) || mapping.get(resolve(source))
      return replacement ? localAssetUrl(replacement) : value
    }
    if (value.startsWith('prism-asset://media/')) {
      const oldName = decodeURIComponent(value.split('/').at(-1) || '')
      const replacement = [...mapping.entries()].find(([source]) => basename(source) === oldName)?.[1]
      return replacement ? localAssetUrl(replacement) : value
    }
    return value
  }
  if (Array.isArray(value)) return value.map((item) => rewritePaths(item, mapping))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewritePaths(item, mapping)]))
  return value
}

async function migrateLegacyLibrary(): Promise<void> {
  const legacyWorkflow = join(dataRoot(), 'workflow.json')
  try { await stat(legacyWorkflow) } catch { return }
  try { await stat(workflowPath()); return } catch { /* New project has no workflow yet. */ }
  const legacyAssetsRoot = join(dataRoot(), 'assets')
  const mapping = new Map<string, string>()
  const migratedAssets: ImportedAsset[] = []
  let legacyFiles: string[] = []
  try { legacyFiles = await readdir(legacyAssetsRoot) } catch { /* No legacy media. */ }
  const indexedAssets = await readJson<ImportedAsset[]>(join(dataRoot(), 'assets.json'), [])
  for (const filename of legacyFiles) {
    const source = join(legacyAssetsRoot, filename)
    try { if (!(await stat(source)).isFile()) continue } catch { continue }
    const category = mediaCategory(source)
    const generated = /generated|fish-audio/i.test(filename)
    const destinationFolder = categoryFolder(category, generated)
    let destination = join(destinationFolder, filename)
    try { await copyFile(source, destination, fsConstants.COPYFILE_EXCL) } catch {
      destination = join(destinationFolder, uniqueAssetName(filename))
      try { await copyFile(source, destination, fsConstants.COPYFILE_EXCL) } catch { continue }
    }
    mapping.set(resolve(source), destination)
    const indexed = indexedAssets.find((asset) => resolve(asset.path) === resolve(source))
    migratedAssets.push({
      id: indexed?.id || randomUUID(),
      name: indexed?.name || filename,
      path: destination,
      url: localAssetUrl(destination),
      mimeType: indexed?.mimeType || mimeFor(destination),
      category,
      origin: generated ? 'generated' : 'imported',
      createdAt: indexed?.createdAt || new Date().toISOString(),
    })
  }
  const legacyDocument = await readJson<WorkflowDocument | null>(legacyWorkflow, null)
  if (legacyDocument) await atomicJson(workflowPath(), rewritePaths(legacyDocument, mapping))
  if (migratedAssets.length) await atomicJson(assetsIndexPath(), migratedAssets)
  const legacyHistory = await readJson<HistoryEntry[]>(join(dataRoot(), 'history.json'), [])
  if (legacyHistory.length) await atomicJson(historyPath(), rewritePaths(legacyHistory, mapping))
}

async function legacyImportMatches(): Promise<{ assetIds: Set<string>; nodeIds: Set<string> }> {
  if (!currentProject) return { assetIds: new Set(), nodeIds: new Set() }
  const [legacyAssets, projectAssets, legacyWorkflow, projectWorkflow] = await Promise.all([
    readJson<ImportedAsset[]>(join(dataRoot(), 'assets.json'), []),
    readJson<ImportedAsset[]>(assetsIndexPath(), []),
    readJson<WorkflowDocument | null>(join(dataRoot(), 'workflow.json'), null),
    readJson<WorkflowDocument | null>(workflowPath(), null),
  ])
  const legacyAssetIds = new Set(legacyAssets.map((asset) => asset.id))
  const legacyNodeIds = new Set(legacyWorkflow?.nodes.map((node) => node.id) || [])
  return {
    assetIds: new Set(projectAssets.filter((asset) => legacyAssetIds.has(asset.id)).map((asset) => asset.id)),
    nodeIds: new Set((projectWorkflow?.nodes || []).filter((node) => legacyNodeIds.has(node.id)).map((node) => node.id)),
  }
}

async function removeLegacyImport(): Promise<{ removedAssets: number; removedNodes: number }> {
  if (!currentProject) throw new Error('Open a project first.')
  const matches = await legacyImportMatches()
  if (!matches.assetIds.size && !matches.nodeIds.size) return { removedAssets: 0, removedNodes: 0 }
  const [assets, workflow] = await Promise.all([
    readStrictJsonOr<ImportedAsset[]>(assetsIndexPath(), [], 'The saved asset index'),
    readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas'),
  ])
  const backupFolder = projectFolder('Project', 'Legacy Import Backup')
  await mkdir(backupFolder, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await atomicJson(join(backupFolder, `${stamp}-assets.json`), assets)
  if (workflow) await atomicJson(join(backupFolder, `${stamp}-workflow.json`), workflow)
  await assetJsonMutations.mutateArray<ImportedAsset>(assetsIndexPath(), (latest) => latest.filter((asset) => !matches.assetIds.has(asset.id)))
  if (workflow) {
    const cleanEdges = (edges: WorkflowDocument['edges']) => edges.filter((edge) => !matches.nodeIds.has(edge.source) && !matches.nodeIds.has(edge.target))
    await atomicJson(workflowPath(), {
      ...workflow,
      nodes: workflow.nodes.filter((node) => !matches.nodeIds.has(node.id)),
      edges: cleanEdges(workflow.edges),
      pages: workflow.pages?.map((page) => ({ ...page, nodes: page.nodes.filter((node) => !matches.nodeIds.has(node.id)), edges: cleanEdges(page.edges) })),
      updatedAt: new Date().toISOString(),
    } satisfies WorkflowDocument)
  }
  await writeProjectDocument()
  return { removedAssets: matches.assetIds.size, removedNodes: matches.nodeIds.size }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT'
}

async function readStrictJson<T>(path: string, label: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch (error) {
    if (isMissingFileError(error)) throw error
    throw new Error(`${label} could not be read. Prism Foundry did not replace it with an empty project. ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function readStrictJsonOr<T>(path: string, fallback: T, label: string): Promise<T> {
  try { return await readStrictJson<T>(path, label) }
  catch (error) {
    if (isMissingFileError(error)) return fallback
    throw error
  }
}

async function portableProjectDocument(): Promise<ProjectDocument | null> {
  if (!currentProject) return null
  const path = currentProjectDocumentPath || defaultProjectDocumentPath(currentProject.rootPath)
  try {
    const document = await readStrictJson<ProjectDocument>(path, 'The portable project document')
    return document.fileType === 'prism-foundry-project' && document.schemaVersion === 1 ? document : null
  } catch (error) {
    if (isMissingFileError(error)) return null
    throw error
  }
}

async function loadWorkflowDocument(): Promise<WorkflowDocument | null> {
  if (!currentProject) return null
  try {
    const document = await readStrictJson<WorkflowDocument>(workflowPath(), 'The saved canvas')
    const projectRoot = resolve(currentProject.rootPath)
    const history = await readJson<HistoryEntry[]>(historyPath(), [])
    const allSavedNodes = [
      ...document.nodes,
      ...(document.pages || []).flatMap((page) => page.nodes),
      ...(document.canvases || []).flatMap((canvas) => canvas.pages.flatMap((page) => page.nodes)),
    ]
    const generatedPaths = [...new Set(allSavedNodes.flatMap((node) => (node.data.generatedResults || []).map((result) => result.path)))]
    const availableGeneratedPaths = new Set<string>()
    await Promise.all(generatedPaths.map(async (generatedPath) => {
      const outputPath = resolve(generatedPath)
      const isManaged = outputPath === projectRoot || outputPath.startsWith(`${projectRoot}${sep}`)
      if (!isManaged) {
        availableGeneratedPaths.add(generatedPath)
        return
      }
      try {
        if ((await stat(outputPath)).isFile()) availableGeneratedPaths.add(generatedPath)
      } catch { /* A deleted managed result must not survive project hydration. */ }
    }))
    const durableCompletions = (await Promise.all(history.map(async (entry) => {
      if (entry.status !== 'complete' || !entry.outputPath || !entry.outputUrl) return null
      const outputPath = resolve(entry.outputPath)
      if (outputPath !== projectRoot && !outputPath.startsWith(`${projectRoot}${sep}`)) return null
      try { return (await stat(outputPath)).isFile() ? entry : null } catch { return null }
    }))).filter((entry): entry is HistoryEntry => Boolean(entry))
    const recoverNodes = (nodes: WorkflowDocument['nodes']) => recoverCompletedGenerationNodes(pruneMissingGeneratedResults(nodes, availableGeneratedPaths), durableCompletions)
    const recoveredNodes = recoverNodes(document.nodes)
    const recoveredPages = document.pages?.map((page) => {
      const nodes = recoverNodes(page.nodes)
      return nodes === page.nodes ? page : { ...page, nodes }
    })
    const recoveredCanvases = document.canvases?.map((canvas) => {
      let canvasChanged = false
      const pages = canvas.pages.map((page) => {
        const nodes = recoverNodes(page.nodes)
        if (nodes === page.nodes) return page
        canvasChanged = true
        return { ...page, nodes }
      })
      return canvasChanged ? { ...canvas, pages } : canvas
    })
    const repaired = recoveredNodes !== document.nodes
      || recoveredPages?.some((page, index) => page !== document.pages?.[index])
      || recoveredCanvases?.some((canvas, index) => canvas !== document.canvases?.[index])
    if (!repaired) return document
    const recovered: WorkflowDocument = {
      ...document,
      nodes: recoveredNodes,
      ...(recoveredPages ? { pages: recoveredPages } : {}),
      ...(recoveredCanvases ? { canvases: recoveredCanvases } : {}),
      updatedAt: new Date().toISOString(),
    }
    await atomicJson(workflowPath(), recovered)
    await writeProjectDocument()
    return recovered
  } catch (error) {
    if (!isMissingFileError(error)) throw error
    return (await portableProjectDocument())?.workflow || null
  }
}


async function loadProjectAssets(): Promise<ImportedAsset[]> {
  if (!currentProject) return []
  try {
    return await readStrictJson<ImportedAsset[]>(assetsIndexPath(), 'The saved asset index')
  } catch (error) {
    if (!isMissingFileError(error)) throw error
    const document = await portableProjectDocument()
    return (document?.assets || []).map((asset) => {
      const candidate = asset.relativePath ? resolve(currentProject!.rootPath, asset.relativePath) : resolve(asset.path)
      return { ...asset, path: candidate, url: localAssetUrl(candidate) }
    })
  }
}

async function loadWorkflowMediaAssets(indexedAssets: ImportedAsset[]): Promise<ImportedAsset[]> {
  if (!currentProject) return []
  const document = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
  return workflowMediaAssets(document, indexedAssets, mimeFor)
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  const candidate = `${path}.${randomUUID()}.tmp`
  await writeFile(candidate, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' })
  await rename(candidate, path)
}

async function buildProjectDocument(activeProject: ProjectWorkspace): Promise<ProjectDocument> {
  const workflow = await readStrictJsonOr<WorkflowDocument | null>(projectFolderPath(activeProject.rootPath, 'Canvas', 'workflow.json'), null, 'The saved canvas')
  const assets = await readStrictJsonOr<ImportedAsset[]>(projectFolderPath(activeProject.rootPath, 'Canvas', 'assets.json'), [], 'The saved asset index')
  const portableAssets = assets.map((asset) => {
    const portablePath = relative(activeProject.rootPath, resolve(asset.path))
    return {
      ...asset,
      url: undefined,
      relativePath: portablePath && !portablePath.startsWith('..') && !isAbsolute(portablePath) ? portablePath : undefined,
    }
  })
  const project: ProjectDocument['project'] = {
    schemaVersion: 1,
    id: activeProject.id,
    name: activeProject.name,
    createdAt: activeProject.createdAt,
    updatedAt: new Date().toISOString(),
    serviceProfileOverrides: activeProject.serviceProfileOverrides,
  }
  return { fileType: 'prism-foundry-project', schemaVersion: 1, project, workflow, assets: portableAssets }
}

async function writeProjectDocument(): Promise<void> {
  if (!currentProject) return
  projectProfileRecovery.assertReady()
  assertGenerationCommit()
  const requestedOwner = currentProjectOwner()
  const identity = generationContext.getStore()
  const documentPath = resolve(identity?.documentPath || currentProjectDocumentPath || defaultProjectDocumentPath(currentProject.rootPath))
  await projectJsonMutations.run(documentPath, async () => {
    if (!currentProject || currentProjectOwner() !== requestedOwner) throw new DOMException('The project changed before its document could be saved.', 'AbortError')
    const document = await buildProjectDocument(currentProject)
    assertGenerationCommit()
    if (currentProjectOwner() !== requestedOwner) throw new DOMException('The project changed before its document could be saved.', 'AbortError')
    await mkdir(dirname(documentPath), { recursive: true })
    await atomicJson(documentPath, document)
  })
}

async function openProjectDocument(path: string): Promise<ProjectWorkspace> {
  return projectCommands.run(() => openProjectDocumentUnlocked(path))
}

async function openProjectDocumentUnlocked(path: string): Promise<ProjectWorkspace> {
  await projectProfileRecovery.recover(dataRoot())
  const documentPath = resolve(path)
  if (isDocumentsPath(documentPath)) throw new Error('Project documents under Documents are not supported. Move the project folder elsewhere first.')
  const document = await readStrictJson<ProjectDocument>(documentPath, 'The portable project document')
  if (!document || document.fileType !== 'prism-foundry-project' || document.schemaVersion !== 1) throw new Error('That is not a valid Prism Foundry .prismflow project.')
  generationLifecycle.activate(null)
  const root = ['Project', '00. Project'].includes(basename(dirname(documentPath))) ? dirname(dirname(documentPath)) : dirname(documentPath)
  const canonicalWorkflow = projectFolderPath(root, 'Canvas', 'workflow.json')
  const canonicalAssets = projectFolderPath(root, 'Canvas', 'assets.json')
  const portableMtime = (await stat(documentPath)).mtimeMs
  const canonicalMtime = async (candidate: string): Promise<number | undefined> => {
    try { return (await stat(candidate)).mtimeMs } catch (error) { if (isMissingFileError(error)) return undefined; throw error }
  }
  const [workflowMtime, assetsMtime] = await Promise.all([canonicalMtime(canonicalWorkflow), canonicalMtime(canonicalAssets)])
  const existing: ProjectWorkspace = { ...document.project, rootPath: root }
  const project = await scaffoldProject(root, existing, documentPath)
  const mapping = new Map<string, string>()
  const assets = (document.assets || []).map((asset) => {
    const candidate = asset.relativePath ? resolve(root, asset.relativePath) : resolve(asset.path)
    mapping.set(resolve(asset.path), candidate)
    return { ...asset, path: candidate, url: localAssetUrl(candidate) }
  })
  const workflow = document.workflow ? rewritePaths(document.workflow, mapping) as WorkflowDocument : null
  if (portableMayReplaceCanonical(portableMtime, assetsMtime)) await atomicJson(assetsIndexPath(), assets)
  if (workflow && portableMayReplaceCanonical(portableMtime, workflowMtime)) await atomicJson(workflowPath(), workflow)
  await writeProjectDocument()
  return project
}

async function findProjectDocument(root: string): Promise<string | null> {
  const resolvedRoot = resolve(root)
  const recent = await readStrictJsonOr<StoredProjectWorkspace[]>(recentProjectsPath(), [], 'The recent projects index')
  const remembered = recent.find((project) => resolve(project.rootPath) === resolvedRoot)?.documentPath
  if (remembered && extname(remembered).toLowerCase() === '.prismflow') {
    try {
      if ((await stat(remembered)).isFile()) return resolve(remembered)
    } catch (error) {
      if (!isMissingFileError(error)) throw error
    }
  }
  const folder = projectDocumentFolder(resolvedRoot)
  try {
    const names = (await readdir(folder)).filter((candidate) => candidate.toLowerCase().endsWith('.prismflow')).sort()
    return names[0] ? join(folder, names[0]) : null
  } catch { return null }
}

function uniqueAssetName(original: string): string {
  const normalized = normalizeImportedMediaName(original)
  const ext = extname(normalized)
  const stem = basename(normalized, ext).replace(/[^\p{L}\p{N}_]+/gu, '-').slice(0, 60) || 'asset'
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${stem}${ext}`
}

function localAssetUrl(path: string): string {
  return `prism-asset://local/${encodeURIComponent(resolve(path))}`
}

function mediaCategory(path: string): 'image' | 'video' | 'audio' {
  const mime = mimeFor(path)
  return mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'image'
}

function categoryFolder(category: 'image' | 'video' | 'audio', generated: boolean): string {
  const leaf = category === 'image' ? 'Images' : category === 'video' ? 'Videos' : 'Audio'
  return projectFolder(generated ? 'Generated Assets' : 'Imported Assets', leaf)
}

const CANVAS_CLIPBOARD_FORMAT = 'application/x-prism-foundry-canvas-nodes'
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function clipboardImageFilePaths(): string[] {
  const values = ['public.file-url', 'text/uri-list']
    .flatMap((format) => clipboard.read(format).split(/\r?\n/))
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith('#'))
  const paths: string[] = []
  for (const value of values) {
    try {
      const path = value.startsWith('file:') ? fileURLToPath(value) : value
      if (SUPPORTED_IMAGE_MIME_TYPES.has(mimeFor(path)) && !paths.includes(path)) paths.push(path)
    } catch { /* Ignore malformed clipboard URLs and inspect the bitmap fallback. */ }
  }
  return paths
}

function importFolder(kind: NodeKind | undefined, source: string, collectionName?: string): { folder: string; category: ImportedAsset['category'] } {
  if (kind === 'character') return { folder: projectFolder('Characters', safeFolderName(collectionName, 'Character')), category: 'character' }
  if (kind === 'element') return { folder: projectFolder('Elements', safeFolderName(collectionName, 'Element')), category: 'element' }
  if (kind === 'location') return { folder: projectFolder('Locations', safeFolderName(collectionName, 'Location')), category: 'location' }
  if (kind === 'wardrobe') return { folder: projectFolder('Wardrobes', safeFolderName(collectionName, 'Wardrobe')), category: 'wardrobe' }
  if (kind === 'style-reference') return { folder: join(globalStylesRoot(), safeFolderName(collectionName, 'Style')), category: 'style' }
  if (kind === 'storyboard') return { folder: projectFolder('Storyboards', safeFolderName(collectionName, 'Storyboard')), category: 'storyboard' }
  const category = mediaCategory(source)
  return { folder: categoryFolder(category, false), category }
}

async function renameManagedFileCaseSafely(source: string, destination: string): Promise<void> {
  if (source === destination) return
  if (source.toLocaleLowerCase('en-US') !== destination.toLocaleLowerCase('en-US')) {
    await rename(source, destination)
    return
  }
  const temporary = join(dirname(source), `.prism-case-${randomUUID()}.tmp`)
  await rename(source, temporary)
  try { await rename(temporary, destination) }
  catch (error) {
    try { await rename(temporary, source) } catch { /* Preserve the original failure after best-effort rollback. */ }
    throw error
  }
}

async function normalizeManagedOrdinaryMediaAssetsUnlocked(): Promise<ImportedAsset[]> {
  if (!currentProject) return []
  const originalAssets = await loadProjectAssets()
  const originalWorkflow = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
  const originalHistory = await readStrictJsonOr<HistoryEntry[]>(historyPath(), [], 'The generation history')
  const occupied = new Set(originalAssets.map((asset) => resolve(asset.path).toLocaleLowerCase('en-US')))
  const pathMapping = new Map<string, string>()
  const moves: Array<{ source: string; destination: string }> = []
  const updatedAssets: ImportedAsset[] = []

  for (const asset of originalAssets) {
    const identity = normalizedOrdinaryMediaIdentity(asset)
    if (!identity) {
      updatedAssets.push(asset)
      continue
    }
    const source = resolve(asset.path)
    let destination = join(dirname(source), identity.managedBasename)
    const sourceKey = source.toLocaleLowerCase('en-US')
    occupied.delete(sourceKey)
    if (destination !== source) {
      const extension = extname(destination)
      const stem = basename(destination, extension)
      let suffix = 2
      while (occupied.has(resolve(destination).toLocaleLowerCase('en-US'))) destination = join(dirname(source), `${stem}-${suffix++}${extension}`)
    }
    occupied.add(resolve(destination).toLocaleLowerCase('en-US'))
    let nextPath = source
    if (destination !== source && await pathExists(source)) {
      await assertManagedAssetPath(asset)
      nextPath = destination
      moves.push({ source, destination })
      pathMapping.set(source, destination)
    }
    updatedAssets.push({ ...asset, name: identity.name, path: nextPath, url: localAssetUrl(nextPath) })
  }

  const changed = updatedAssets.some((asset, index) => asset.name !== originalAssets[index].name || asset.path !== originalAssets[index].path)
  if (!changed) return originalAssets
  let movedCount = 0
  try {
    for (const move of moves) {
      await renameManagedFileCaseSafely(move.source, move.destination)
      movedCount += 1
    }
    await atomicJson(assetsIndexPath(), updatedAssets)
    if (originalWorkflow) await atomicJson(workflowPath(), rewritePaths(originalWorkflow, pathMapping))
    await atomicJson(historyPath(), rewritePaths(originalHistory, pathMapping))
    await writeProjectDocument()
  } catch (error) {
    await atomicJson(assetsIndexPath(), originalAssets).catch(() => undefined)
    if (originalWorkflow) await atomicJson(workflowPath(), originalWorkflow).catch(() => undefined)
    await atomicJson(historyPath(), originalHistory).catch(() => undefined)
    for (const move of moves.slice(0, movedCount).reverse()) await renameManagedFileCaseSafely(move.destination, move.source).catch(() => undefined)
    await writeProjectDocument().catch(() => undefined)
    throw error
  }
  return updatedAssets
}

async function normalizeManagedOrdinaryMediaAssets(): Promise<ImportedAsset[]> {
  if (!currentProject) return []
  return assetJsonMutations.run(assetsIndexPath(), normalizeManagedOrdinaryMediaAssetsUnlocked)
}

async function registerAssets(newAssets: ImportedAsset[], onIndexed?: () => void): Promise<ImportedAsset[]> {
  if (!newAssets.length) return []
  assertGenerationCommit()
  const indexPath = newAssets[0].category === 'style' ? globalStylesIndexPath() : assetsIndexPath()
  if (newAssets.some((asset) => (asset.category === 'style' ? globalStylesIndexPath() : assetsIndexPath()) !== indexPath)) throw new Error('Asset batches must target one managed index.')
  await assetJsonMutations.mutateArray<ImportedAsset>(indexPath, (assets) => {
    assertGenerationCommit()
    return [
      ...newAssets,
      ...assets.filter((candidate) => !newAssets.some((asset) => candidate.id === asset.id || candidate.path === asset.path)),
    ]
  })
  onIndexed?.()
  if (newAssets[0].category !== 'style') await writeProjectDocument()
  return newAssets.map((asset) => ({ ...asset, url: localAssetUrl(asset.path) }))
}

async function registerAsset(asset: ImportedAsset, onIndexed?: () => void): Promise<ImportedAsset> {
  return (await registerAssets([asset], onIndexed))[0]
}

async function managedAssetStores() {
  return {
    project: await loadProjectAssets(),
    styles: await readStrictJsonOr<ImportedAsset[]>(globalStylesIndexPath(), [], 'The Style Library index'),
  }
}

async function managedAssetById(id: string): Promise<{ asset: ImportedAsset; indexPath: string; assets: ImportedAsset[] } | null> {
  const stores = await managedAssetStores()
  const style = stores.styles.find((asset) => asset.id === id)
  if (style) return { asset: style, indexPath: globalStylesIndexPath(), assets: stores.styles }
  const project = stores.project.find((asset) => asset.id === id)
  return project ? { asset: project, indexPath: assetsIndexPath(), assets: stores.project } : null
}

/** Keep the canonical index and portable projection together for local link edits. */
async function commitBytePlusPortraitMetadata(managed: { asset: ImportedAsset; indexPath: string }, update: (asset: ImportedAsset) => ImportedAsset): Promise<ImportedAsset> {
  return assetJsonMutations.run(managed.indexPath, async () => {
    const previous = await readStrictJson<ImportedAsset[]>(managed.indexPath, 'The saved asset index')
    if (!Array.isArray(previous)) throw new Error('The saved asset index is invalid.')
    const asset = previous.find(item => item.id === managed.asset.id)
    if (!asset || asset.trashedAt || resolve(asset.path) !== resolve(managed.asset.path)) throw new Error('The asset changed before its link could be saved.')
    const updated = update(asset)
    await atomicJson(managed.indexPath, previous.map(item => item.id === asset.id ? updated : item))
    try {
      if (updated.category !== 'style') await writeProjectDocument()
    } catch (error) {
      try { await atomicJson(managed.indexPath, previous) }
      catch { throw new Error('The trusted asset projection could not be saved or rolled back. Reopen the project to review the canonical asset link.') }
      throw error
    }
    return { ...updated, url: localAssetUrl(updated.path) }
  })
}

async function assertManagedAssetPath(asset: ImportedAsset): Promise<string> {
  const roots = asset.category === 'style'
    ? [globalStylesRoot()]
    : currentProject ? [currentProject.rootPath] : []
  if (!roots.length) throw new Error('Choose or open a project folder first.')
  return assertRealpathContained(asset.path, roots)
}

async function assertManagedMediaPath(path: string): Promise<string> {
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  const source = await assertRealpathContained(path, [currentProject.rootPath, globalStylesRoot()])
  const mimeType = mimeFor(source)
  if (!/^(image|video|audio)\//.test(mimeType)) throw new Error('Only managed image, video, or audio files can be previewed or uploaded.')
  return source
}

async function registerGeneratedAsset(path: string, metadata?: ImportedAsset['metadata'], onIndexed?: () => void): Promise<ImportedAsset> {
  const category = mediaCategory(path)
  const fileSize = (await stat(path)).size
  return registerAsset({
    id: randomUUID(),
    name: basename(path),
    path,
    url: localAssetUrl(path),
    mimeType: mimeFor(path),
    category,
    origin: 'generated',
    fileSize,
    createdAt: new Date().toISOString(),
    metadata,
  }, onIndexed)
}

interface PrismAssetManifest {
  fileType: 'prism-foundry-asset'
  schemaVersion: 1
  name: string
  category: ImportedAsset['category']
  createdAt: string
  assets: Array<Omit<ImportedAsset, 'path' | 'url'> & { mediaEntry: string }>
}

const PORTABLE_ASSET_CATEGORIES = new Set<NonNullable<ImportedAsset['category']>>([
  'character', 'element', 'location', 'wardrobe', 'style', 'storyboard', 'image', 'video', 'audio',
])

function portableEntryMatchesCategory(category: NonNullable<ImportedAsset['category']>, name: string): boolean {
  const mimeType = mimeFor(name)
  if (category === 'video') return mimeType.startsWith('video/')
  if (category === 'audio') return mimeType.startsWith('audio/')
  if (category === 'style') return mimeType.startsWith('image/') || extname(name).toLowerCase() === '.prismstyle'
  return mimeType.startsWith('image/')
}

async function importMediaPath(source: string, kind?: NodeKind, collectionName?: string): Promise<ImportedAsset> {
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  if (isDocumentsPath(source)) throw new Error('Documents paths are not supported. Move the media to another folder, then drop it again.')
  const registered = (await readJson<ImportedAsset[]>(assetsIndexPath(), [])).find((asset) => resolve(asset.path) === resolve(source))
  if (registered) {
    const normalized = await normalizeManagedOrdinaryMediaAssets()
    const refreshed = normalized.find((asset) => asset.id === registered.id) || registered
    return { ...refreshed, url: localAssetUrl(refreshed.path) }
  }
  const mimeType = mimeFor(source)
  if (!/^(image|video|audio)\//.test(mimeType)) throw new Error(`${basename(source)} is not a supported image, video, or audio file.`)
  const destinationFolder = importFolder(kind, source, collectionName)
  await mkdir(destinationFolder.folder, { recursive: true })
  const destination = join(destinationFolder.folder, uniqueAssetName(source))
  await copyFile(source, destination, fsConstants.COPYFILE_EXCL)
  return registerAsset({
    id: randomUUID(),
    name: normalizeImportedMediaName(source),
    path: destination,
    mimeType: mimeFor(destination),
    category: destinationFolder.category,
    origin: 'imported',
    fileSize: (await stat(destination)).size,
    createdAt: new Date().toISOString(),
  })
}

async function importPrismAssetSource(source: string): Promise<ImportedAsset[]> {
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  if (isDocumentsPath(source)) throw new Error('Documents paths are not supported. Move the portable asset to another folder, then drop it again.')
  const archiveStat = await stat(source)
  if (!archiveStat.isFile() || archiveStat.size > 512 * 1024 * 1024) throw new Error('This .prismasset archive is too large.')
  const entries = readStoredZip(await readFile(source))
  const manifestBytes = entries.get('manifest.json')
  if (!manifestBytes) throw new Error('This .prismasset has no manifest.')
  let manifest: PrismAssetManifest
  try { manifest = JSON.parse(manifestBytes.toString('utf8')) as PrismAssetManifest }
  catch { throw new Error('This .prismasset manifest is malformed.') }
  if (manifest.fileType !== 'prism-foundry-asset' || manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) throw new Error('This is not a supported Prism Foundry asset.')
  if (!PORTABLE_ASSET_CATEGORIES.has(manifest.category as NonNullable<ImportedAsset['category']>)) throw new Error('This .prismasset declares an unsupported asset category.')
  if (!manifest.assets.length || manifest.assets.length > 1_000) throw new Error('This .prismasset contains no readable media or too many asset records.')

  const category = manifest.category as NonNullable<ImportedAsset['category']>
  const prepared: Array<{ portable: PrismAssetManifest['assets'][number]; bytes: Buffer; originalName: string; destination: string }> = []
  const referencedEntries = new Set<string>()
  const destinationFolder = portableAssetFolder(category, typeof manifest.name === 'string' ? manifest.name : 'Imported Asset')
  for (const portable of manifest.assets) {
    if (!portable || typeof portable !== 'object' || typeof portable.mediaEntry !== 'string') throw new Error('This .prismasset has an invalid asset record.')
    const entryName = portable.mediaEntry.replaceAll('\\', '/')
    const segments = entryName.split('/')
    if (!entryName || entryName.startsWith('/') || segments.some((segment) => !segment || segment === '..')) throw new Error('This .prismasset manifest contains an unsafe media path.')
    const normalizedEntry = entryName.normalize('NFC').toLowerCase()
    if (referencedEntries.has(normalizedEntry)) throw new Error('This .prismasset manifest references duplicate media entries.')
    referencedEntries.add(normalizedEntry)
    const bytes = entries.get(entryName)
    if (!bytes) throw new Error(`This .prismasset is missing ${entryName}.`)
    const originalName = basename(typeof portable.name === 'string' && portable.name ? portable.name : entryName)
    if (!portableEntryMatchesCategory(manifest.category as NonNullable<ImportedAsset['category']>, originalName)) throw new Error(`${originalName} is unrelated to the ${manifest.category} asset declared by this .prismasset.`)
    prepared.push({ portable, bytes, originalName, destination: join(destinationFolder, uniqueAssetName(originalName)) })
  }

  await mkdir(destinationFolder, { recursive: true })
  const stagingFolder = join(destinationFolder, `.prism-import-${randomUUID()}.tmp`)
  const committedPaths: string[] = []
  await mkdir(stagingFolder, { recursive: false })
  try {
    for (let index = 0; index < prepared.length; index += 1) {
      const item = prepared[index]
      const staged = join(stagingFolder, `${index}-${basename(item.destination)}`)
      await writeFile(staged, item.bytes, { flag: 'wx' })
      await rename(staged, item.destination)
      committedPaths.push(item.destination)
    }
    const imported = prepared.map(({ portable, bytes, originalName, destination }) => {
      const { mediaEntry: _mediaEntry, ...record } = portable
      return {
        ...record,
        id: randomUUID(),
        name: normalizeImportedMediaName(originalName),
        path: destination,
        url: localAssetUrl(destination),
        mimeType: mimeFor(destination),
        category,
        origin: 'imported' as const,
        fileSize: bytes.length,
        createdAt: new Date().toISOString(),
      } satisfies ImportedAsset
    })
    await registerAssets(imported)
    return imported.map((asset) => ({ ...asset, url: localAssetUrl(asset.path) }))
  } catch (error) {
    await Promise.all(committedPaths.map((path) => rm(path, { force: true })))
    throw error
  } finally {
    await rm(stagingFolder, { recursive: true, force: true })
  }
}

function portableAssetFolder(category: ImportedAsset['category'], collectionName: string): string {
  if (category === 'character') return projectFolder('Characters', safeFolderName(collectionName, 'Character'))
  if (category === 'element') return projectFolder('Elements', safeFolderName(collectionName, 'Element'))
  if (category === 'location') return projectFolder('Locations', safeFolderName(collectionName, 'Location'))
  if (category === 'wardrobe') return projectFolder('Wardrobes', safeFolderName(collectionName, 'Wardrobe'))
  if (category === 'style') return join(globalStylesRoot(), safeFolderName(collectionName, 'Style'))
  if (category === 'storyboard') return projectFolder('Storyboards', safeFolderName(collectionName, 'Storyboard'))
  return categoryFolder(category === 'video' ? 'video' : category === 'audio' ? 'audio' : 'image', false)
}

async function pathExists(path: string): Promise<boolean> {
  try { return (await stat(path)).isFile() } catch { return false }
}

async function scanMediaFiles(root: string, limit = 20000): Promise<string[]> {
  if (isDocumentsPath(root)) throw new Error('Relinking from Documents is not supported.')
  const found: string[] = []
  const queue = [resolve(root)]
  while (queue.length && found.length < limit) {
    const folder = queue.shift()!
    let entries: Dirent[]
    try { entries = await readdir(folder, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const candidate = join(folder, entry.name)
      if (entry.isDirectory()) queue.push(candidate)
      else if (entry.isFile() && mimeFor(candidate) !== 'application/octet-stream') found.push(candidate)
      if (found.length >= limit) break
    }
  }
  return found
}

function relinkDestination(asset: ImportedAsset): string {
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  const root = `${resolve(currentProject.rootPath)}${sep}`
  const oldPath = resolve(asset.path)
  if (oldPath.startsWith(root)) return oldPath
  const folder = asset.category === 'character' ? projectFolder('Characters', safeFolderName(asset.name, 'Character'))
    : asset.category === 'element' ? projectFolder('Elements', safeFolderName(asset.name, 'Element'))
      : asset.category === 'location' ? projectFolder('Locations', safeFolderName(asset.name, 'Location'))
        : asset.category === 'wardrobe' ? projectFolder('Wardrobes', safeFolderName(asset.name, 'Wardrobe'))
        : asset.category === 'style' ? join(globalStylesRoot(), safeFolderName(asset.name, 'Style'))
          : asset.category === 'storyboard' ? projectFolder('Storyboards', safeFolderName(asset.name, 'Storyboard'))
          : categoryFolder(asset.category === 'video' ? 'video' : asset.category === 'audio' ? 'audio' : 'image', asset.origin === 'generated')
  return join(folder, basename(asset.path) || asset.name)
}

async function relinkFromCandidatesUnlocked(scanRoot: string, forced?: { assetId: string; source: string }): Promise<AssetRelinkResult> {
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  const projectAssets = await readStrictJsonOr<ImportedAsset[]>(assetsIndexPath(), [], 'The saved asset index')
  const styleAssets = await readStrictJsonOr<ImportedAsset[]>(globalStylesIndexPath(), [], 'The saved style asset index')
  const originalWorkflow = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
  const orphanWorkflowAssets = workflowMediaAssets(originalWorkflow, [...projectAssets, ...styleAssets], mimeFor)
  const assets = [...projectAssets, ...styleAssets, ...orphanWorkflowAssets].filter((asset) => !asset.trashedAt)
  const originalHistory = await readStrictJsonOr<HistoryEntry[]>(historyPath(), [], 'The generation history')
  const missingAssets = (await Promise.all(assets.map(async (asset) => ({ asset, missing: !(await pathExists(asset.path)) })))).filter((item) => item.missing).map((item) => item.asset)
  const targetAssets = [...missingAssets]
  if (forced && !targetAssets.some((asset) => asset.id === forced.assetId)) {
    const forcedAsset = assets.find((asset) => asset.id === forced.assetId)
    if (forcedAsset) targetAssets.push(forcedAsset)
  }
  const files = await scanMediaFiles(scanRoot)
  if (forced && !files.includes(resolve(forced.source))) files.unshift(resolve(forced.source))
  const byName = new Map<string, string[]>()
  for (const file of files) {
    const key = basename(file).toLowerCase()
    byName.set(key, [...(byName.get(key) || []), file])
  }
  const replacements: AssetRelinkResult['replacements'] = []
  const updatedById = new Map<string, ImportedAsset>()
  const copiedPaths: string[] = []
  try {
    for (const asset of targetAssets) {
      let source: string | undefined
      if (forced?.assetId === asset.id) {
        const candidate = resolve(forced.source)
        if (!isExactRelinkCandidate(basename(asset.path), asset.mimeType, basename(candidate), mimeFor(candidate))) {
          throw new Error(`Could not find “${basename(asset.path)}”. Choose a ${mediaFamily(asset.mimeType) || 'matching media'} file with the exact same name.`)
        }
        source = candidate
      }
      else {
        const candidates = [...new Set([...(byName.get(basename(asset.path).toLowerCase()) || []), ...(byName.get(asset.name.toLowerCase()) || [])])]
          .filter((candidate) => isExactRelinkCandidate(basename(asset.path), asset.mimeType, basename(candidate), mimeFor(candidate)))
        if (candidates.length === 1) source = candidates[0]
        else if (asset.fileSize) {
          const sized: string[] = []
          for (const candidate of candidates) if ((await stat(candidate)).size === asset.fileSize) sized.push(candidate)
          if (sized.length === 1) source = sized[0]
        }
      }
      if (!source || isDocumentsPath(source) || !(await pathExists(source))) continue
      let destination = relinkDestination(asset)
      const ordinaryIdentity = normalizedOrdinaryMediaIdentity(asset)
      if (ordinaryIdentity) destination = join(dirname(destination), ordinaryIdentity.managedBasename)
      await mkdir(dirname(destination), { recursive: true })
      if (resolve(source) !== resolve(destination)) {
        if (await pathExists(destination)) {
          const extension = extname(destination)
          const stem = basename(destination, extension)
          let suffix = 2
          while (await pathExists(destination)) destination = join(dirname(destination), `${stem}-${suffix++}${extension}`)
        }
        await copyFile(source, destination, fsConstants.COPYFILE_EXCL)
        copiedPaths.push(destination)
      }
      const updated: ImportedAsset = { ...asset, ...(ordinaryIdentity ? { name: ordinaryIdentity.name } : {}), path: destination, url: localAssetUrl(destination), mimeType: mimeFor(destination), fileSize: (await stat(destination)).size }
      updatedById.set(asset.id, updated)
      replacements.push({ from: asset.path, to: destination, asset: updated })
    }
    const updatedAssets = assets.map((asset) => updatedById.get(asset.id) || asset)
    const recoveredWorkflowAssets = orphanWorkflowAssets.filter((asset) => updatedById.has(asset.id)).map((asset) => updatedById.get(asset.id)!)
    const updatedProjectAssets = [...projectAssets.map((asset) => updatedById.get(asset.id) || asset), ...recoveredWorkflowAssets]
    const updatedStyleAssets = styleAssets.map((asset) => updatedById.get(asset.id) || asset)
    const mapping = new Map(replacements.map((item) => [item.from, item.to]))
    if (replacements.length) {
      await atomicJson(assetsIndexPath(), updatedProjectAssets)
      await atomicJson(globalStylesIndexPath(), updatedStyleAssets)
      if (originalWorkflow) await atomicJson(workflowPath(), rewritePaths(originalWorkflow, mapping))
      await atomicJson(historyPath(), rewritePaths(originalHistory, mapping))
      await writeProjectDocument()
    }
    const missing = (await Promise.all(updatedAssets.map(async (asset) => !(await pathExists(asset.path))))).filter(Boolean).length
    return { assets: updatedAssets.map((asset) => ({ ...asset, url: localAssetUrl(asset.path) })), replacements, relinked: replacements.length, missing }
  } catch (error) {
    await atomicJson(assetsIndexPath(), projectAssets).catch(() => undefined)
    await atomicJson(globalStylesIndexPath(), styleAssets).catch(() => undefined)
    if (originalWorkflow) await atomicJson(workflowPath(), originalWorkflow).catch(() => undefined)
    await atomicJson(historyPath(), originalHistory).catch(() => undefined)
    for (const copiedPath of copiedPaths.reverse()) await unlink(copiedPath).catch(() => undefined)
    await writeProjectDocument().catch(() => undefined)
    throw error
  }
}

async function relinkFromCandidates(scanRoot: string, forced?: { assetId: string; source: string }): Promise<AssetRelinkResult> {
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  return assetJsonMutations.run(assetsIndexPath(), () => assetJsonMutations.run(globalStylesIndexPath(), () => relinkFromCandidatesUnlocked(scanRoot, forced)))
}

async function loadCredential(): Promise<string> {
  return loadServiceCredential('fal')
}

async function runFishAudio(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  signal?.throwIfAborted()
  compileFishAudioRequest(request)
  const availability = await readOwnedFishCatalog()
  const compiled = compileFishAudioRequest(request, availability)
  if (!availability.nativeInputSchema) throw new Error('Load the current Fish Audio native input contract before generating.')
  await validateFalContractValue(availability.nativeInputSchema, compiled.body, 'Fish Audio input')
  const key = await loadServiceCredential('fish')
  mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: 'Submitting securely to Fish Audio…', status: 'queued' })
  try {
    const response = await generateFishAudio({ fetch: (url, init) => net.fetch(url, init), key, availability, signal, assertSubmission: () => runtimeServiceFailures.assertCurrent('fish') }, request)
    assertGenerationCommit()
    const result = await persistFishAudio(request, response, {
      outputStem: join(categoryFolder('audio', true), `${Date.now()}-${randomUUID().slice(0, 8)}-fish-audio`),
      fallbackRequestId: randomUUID(), assertCommit: assertGenerationCommit, register: registerGeneratedAsset, localUrl: localAssetUrl,
      history: (outputPath, modelId) => appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId, status: 'complete', createdAt: new Date().toISOString(), outputPath, outputUrl: localAssetUrl(outputPath) }),
    })
    runtimeServiceFailures.delete('fish')
    return result
  } catch (error) { rememberServiceFailure('fish', error); throw error }
}

async function runElevenLabsAudio(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  const key = await loadServiceCredential('elevenlabs')
  mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: 'Submitting securely to ElevenLabs…', status: 'queued' })
  try {
    const response = await generateElevenAudio({ fetch, key, signal, assertSubmission: () => runtimeServiceFailures.assertCurrent('elevenlabs') }, request)
    assertGenerationCommit()
    const result = await persistElevenAudio(request, response, {
      outputStem: join(categoryFolder('audio', true), `${Date.now()}-${randomUUID().slice(0, 8)}-elevenlabs`),
      fallbackRequestId: randomUUID(), assertCommit: assertGenerationCommit, register: registerGeneratedAsset, localUrl: localAssetUrl,
      history: (outputPath, modelId) => appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId, status: 'complete', createdAt: new Date().toISOString(), outputPath, outputUrl: localAssetUrl(outputPath) }),
    })
    runtimeServiceFailures.delete('elevenlabs')
    return result
  } catch (error) { rememberServiceFailure('elevenlabs', error); throw error }
}

async function uploadLocalAsset(path: string, client: FalClient): Promise<string> {
  const resolved = await assertManagedMediaPath(path)
  const contents = await readFile(resolved)
  const file = new File([contents], basename(resolved), { type: mimeFor(resolved) })
  runtimeServiceFailures.assertCurrent('fal')
  return client.storage.upload(file)
}

async function downloadResult(url: string, contentType: string | undefined, metadata?: ImportedAsset['metadata'], signal?: AbortSignal, expectedType?: 'image' | 'video' | 'audio'): Promise<string> {
  const response = await net.fetch(url, { signal })
  if (!response.ok) throw new Error(`Could not download generated media (${response.status}).`)
  if (expectedType) {
    const responseType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    contentType = responseType && responseType !== 'application/octet-stream' ? responseType : contentType
    if (!contentType?.toLowerCase().startsWith(`${expectedType}/`)) throw new Error('Generated media download does not match the selected model flow.')
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  assertGenerationCommit()
  const inferred = contentType?.includes('video') ? '.mp4'
    : contentType?.includes('wav') || contentType?.includes('pcm') ? '.wav'
      : contentType?.includes('ogg') || contentType?.includes('opus') ? '.ogg'
        : contentType?.includes('audio/mp4') ? '.m4a'
          : contentType?.includes('audio') ? '.mp3'
            : contentType?.includes('png') ? '.png'
              : contentType?.includes('webp') ? '.webp' : '.jpg'
  const category = inferred === '.mp4' ? 'video' : ['.wav', '.ogg', '.m4a', '.mp3'].includes(inferred) ? 'audio' : 'image'
  const target = join(categoryFolder(category, true), `${Date.now()}-${randomUUID().slice(0, 8)}-generated${inferred}`)
  try {
    await writeFile(target, bytes, { flag: 'wx' })
    assertGenerationCommit()
    await registerGeneratedAsset(target, metadata)
    return target
  } catch (error) {
    await rm(target, { force: true })
    throw error
  }
}

async function bytePlusMediaUrl(source: { path?: string; url?: string; mediaType?: 'image' | 'video' | 'audio' }): Promise<string> {
  if (source.path) {
    const stores = await managedAssetStores()
    const matches = [...stores.project, ...stores.styles].filter(asset => resolve(asset.path) === resolve(source.path!))
    const bound = matches.filter(asset => asset.metadata?.byteplusPortrait)
    if (bound.length) {
      if (bound.length !== 1 || bound[0].trashedAt) throw new Error('BytePlus trusted asset: the managed source is ambiguous or in Trash. Review the link before generation.')
      const asset = bound[0], registry = await serviceProfileStore().listProfiles('byteplus', false)
      runtimeServiceFailures.assertCurrent('byteplus')
      const selection = projectServiceProfileSelection(registry, { serviceProfileOverrides: runtimeServiceFailures.overrides('byteplus', currentProject?.serviceProfileOverrides) }, 'byteplus')
      if (!selection.profile || !selection.available) throw new Error('BytePlus trusted asset: select its connected BytePlus account before generation.')
      const path = await assertManagedAssetPath(asset), bytes = await readFile(path)
      runtimeServiceFailures.assertCurrent('byteplus')
      return resolveBytePlusPortrait(asset.metadata!.byteplusPortrait, selection.profile, asset.mimeType, bytes)
    }
  }
  if (source.url && /^asset:/i.test(source.url)) throw new Error('BytePlus trusted asset: link the console Asset ID to the managed source before generation.')
  if (source.url && /^(?:https?:|data:)/i.test(source.url)) return source.url
  if (!source.path) throw new Error('BytePlus requires a readable media reference.')
  const path = assertInsideProject(source.path)
  const bytes = await readFile(path)
  return `data:${mimeFor(path)};base64,${bytes.toString('base64')}`
}

async function runBytePlusGeneration(request: GenerationRequest, videoModel: VideoModelDefinition, signal?: AbortSignal): Promise<GenerationResult> {
  const modelId = videoModel.id
  try {
    const payload = await compileBytePlusGenerationRequest(request, bytePlusMediaUrl)
    runtimeServiceFailures.assertCurrent('byteplus')
    const key = await loadServiceCredential('byteplus')
    const draftCreatedAt = new Date().toISOString()
    let videoDraft: VideoDraftReceipt | undefined
    const result = await runBytePlusTaskAndDownload({
      fetch: (input, init) => { if (init?.method === 'POST') runtimeServiceFailures.assertCurrent('byteplus'); return net.fetch(input, init) },
      apiKey: key,
      payload,
      signal,
      onProgress: (message, status) => mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message, status }),
      download: (url, task) => {
        if (request.videoDraft) videoDraft = createVideoDraftReceipt('byteplus', payload.model, task.taskId, request.nodeId, videoDraftAccountFingerprint(key), draftCreatedAt, { duration: payload.duration, aspectRatio: payload.ratio, generateAudio: payload.generate_audio })
        return downloadResult(url, 'video/mp4', { provider: 'BytePlus Seedance', modelId, prompt: request.prompt, aspectRatio: request.aspectRatio, duration: request.duration, resolution: request.videoDraft ? '480p' : request.resolution, motionCadence: request.motionCadence, videoDraft }, signal)
      },
    })
    await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId, status: 'complete', createdAt: new Date().toISOString(), outputPath: result.outputPath, outputUrl: localAssetUrl(result.outputPath) })
    runtimeServiceFailures.delete('byteplus')
    return { requestId: result.taskId, modelId, outputPath: result.outputPath, outputUrl: localAssetUrl(result.outputPath), outputType: 'video', videoDraft }
  } catch (error) {
    if (signal?.aborted) throw error
    const message = providerErrorDetail(error, 'BytePlus ModelArk generation failed.')
    const surfacedError = new Error(message)
    Object.assign(surfacedError, { status: (error as { status?: number } | null)?.status })
    rememberServiceFailure('byteplus', surfacedError)
    await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId, status: 'error', createdAt: new Date().toISOString(), error: message })
    throw surfacedError
  }
}

async function saveGeneratedImage(bytes: Buffer, contentType: string, metadata: ImportedAsset['metadata']): Promise<string> {
  assertGenerationCommit()
  const extension = contentType.includes('webp') ? '.webp' : contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '.png'
  const target = join(categoryFolder('image', true), `${Date.now()}-${randomUUID().slice(0, 8)}-generated${extension}`)
  try {
    await writeFile(target, bytes, { flag: 'wx' })
    assertGenerationCommit()
    await registerGeneratedAsset(target, metadata)
    return target
  } catch (error) {
    await rm(target, { force: true })
    throw error
  }
}

async function directImageInputs(request: GenerationRequest, signal?: AbortSignal) {
  const provider = request.imageProvider === 'openai' ? 'openai' : 'google'
  const assertCurrent = () => {
    if (signal?.aborted) throw new Error('Image generation was cancelled.')
    runtimeServiceFailures.assertCurrent(provider)
  }
  return prepareDirectImageInputs(orderedProviderImageReferences(request), imageReferenceLimit(request), {
    managed: assertManagedMediaPath, size: async (path) => (await stat(path)).size, read: readFile, mime: mimeFor, assertCurrent,
  })
}

function directImagePrompt(request: GenerationRequest, inputs: Awaited<ReturnType<typeof directImageInputs>>): string {
  const orderedReferences = inputs.map((input) => input.reference)
  return providerNativeImagePrompt({ ...request, inputPath: undefined, inputUrl: undefined, references: orderedReferences }, orderedReferences)
}

async function finishDirectImage(request: GenerationRequest, provider: 'openai' | 'google', modelId: string, bytes: Buffer, contentType: string): Promise<GenerationResult> {
  const outputPath = await saveGeneratedImage(bytes, contentType, {
    provider: provider === 'openai' ? 'OpenAI' : 'Google Gemini', modelId, prompt: request.prompt,
    aspectRatio: request.aspectRatio, resolution: request.imageResolution,
  })
  await enforceLockedArtwork(request, outputPath)
  const result = { requestId: randomUUID(), modelId, outputPath, outputUrl: localAssetUrl(outputPath), outputType: 'image' as const }
  await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId, status: 'complete', createdAt: new Date().toISOString(), outputPath, outputUrl: result.outputUrl })
  runtimeServiceFailures.delete(provider)
  return result
}

async function enforceLockedArtwork(request: GenerationRequest, outputPath: string): Promise<void> {
  const exactArtwork = (request.references || []).filter(isLockedArtworkReference)
  if (!exactArtwork.length) return
  mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: 'Placing locked artwork…', status: 'running' })
  const result = await compositeLockedArtwork(request, outputPath)
  if (!result.applied || result.placements !== exactArtwork.length) throw new Error(`Lock could not verify all ${exactArtwork.length} artwork carrier${exactArtwork.length === 1 ? '' : 's'}. The provider result was retained, but Prism Foundry did not present it as exact.`)
}

async function directImageFailure(request: GenerationRequest, provider: 'openai' | 'google', modelId: string, response: Response): Promise<never> {
  const body = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string }
  const error = new Error(body.error?.message || body.message || `${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} image request failed (${response.status}).`)
  ;(error as Error & { status: number }).status = response.status
  rememberServiceFailure(provider, error)
  await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId, status: 'error', createdAt: new Date().toISOString(), error: error.message })
  throw error
}

async function runOpenAIImage(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  const controls = directImageControls(request)
  const modelId = controls.model as string
  const providerRequest = providerArtworkCarrierRequest(request)
  const inputs = await directImageInputs(providerRequest, signal)
  const prompt = directImagePrompt(providerRequest, inputs)
  mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: 'Submitting securely to OpenAI…', status: 'queued' })
  let requestBody: FormData | string
  let endpoint = 'https://api.openai.com/v1/images/generations'
  let json = true
  if (inputs.length && inputs.every((input) => input.path)) {
    const form = new FormData()
    for (const [field, value] of Object.entries(controls)) form.append(field, String(value))
    form.append('prompt', prompt)
    for (const input of inputs) form.append('image[]', new File([Buffer.from(input.bytes!)], basename(input.path!), { type: input.mimeType }))
    requestBody = form; json = false; endpoint = 'https://api.openai.com/v1/images/edits'
  } else {
    const images = inputs.map((input) => ({ image_url: input.url || `data:${input.mimeType};base64,${Buffer.from(input.bytes!).toString('base64')}` }))
    if (images.some((image) => image.image_url.length > 20 * 1024 * 1024)) throw new Error('The mixed inline image exceeds the native image URL limit; import a smaller image.')
    requestBody = JSON.stringify({ ...controls, prompt, ...(inputs.length ? { images } : {}) })
    if (inputs.length) endpoint = 'https://api.openai.com/v1/images/edits'
  }
  if (signal?.aborted) throw new Error('Image generation was cancelled.')
  runtimeServiceFailures.assertCurrent('openai')
  const key = await loadServiceCredential('openai')
  if (signal?.aborted) throw new Error('Image generation was cancelled.')
  runtimeServiceFailures.assertCurrent('openai')
  const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${key}`, ...(json ? { 'Content-Type': 'application/json' } : {}) }, body: requestBody, signal, redirect: 'error' })
  if (!response.ok) return directImageFailure(request, 'openai', modelId, response)
  const body = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> }
  const output = body.data?.[0]
  if (output?.b64_json) return finishDirectImage(request, 'openai', modelId, Buffer.from(output.b64_json, 'base64'), `image/${request.outputFormat || 'png'}`)
  if (output?.url) {
    const outputPath = await downloadResult(output.url, `image/${request.outputFormat || 'png'}`, { provider: 'OpenAI', modelId, prompt: request.prompt, aspectRatio: request.aspectRatio, resolution: request.imageResolution })
    await enforceLockedArtwork(request, outputPath)
    runtimeServiceFailures.delete('openai')
    await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId, status: 'complete', createdAt: new Date().toISOString(), outputPath, outputUrl: localAssetUrl(outputPath) })
    return { requestId: randomUUID(), modelId, outputPath, outputUrl: localAssetUrl(outputPath), outputType: 'image' }
  }
  throw new Error('OpenAI completed without returning an image.')
}

async function runGeminiImage(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  const controls = directImageControls(request)
  const modelId = controls.model as string
  const providerRequest = providerArtworkCarrierRequest(request)
  const inputs = await directImageInputs(providerRequest, signal)
  const prompt = directImagePrompt(providerRequest, inputs)
  const input: Array<Record<string, string>> = [{ type: 'text', text: prompt }]
  for (const source of inputs) input.push(source.bytes
    ? { type: 'image', mime_type: source.mimeType!, data: Buffer.from(source.bytes).toString('base64') }
    : { type: 'image', uri: source.url! })
  const requestBody = JSON.stringify({ ...controls, input })
  if (Buffer.byteLength(requestBody) > 20 * 1024 * 1024) throw new Error('Google inline image request exceeds Prism’s 20 MiB request limit; use smaller images or public image URLs.')
  if (signal?.aborted) throw new Error('Image generation was cancelled.')
  runtimeServiceFailures.assertCurrent('google')
  const key = await loadServiceCredential('google')
  if (signal?.aborted) throw new Error('Image generation was cancelled.')
  runtimeServiceFailures.assertCurrent('google')
  mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: 'Submitting securely to Google Gemini…', status: 'queued' })
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: requestBody, signal, redirect: 'error',
  })
  if (!response.ok) return directImageFailure(request, 'google', modelId, response)
  const body = await response.json() as Record<string, unknown>
  const candidates: unknown[] = [body.output_image, ...(Array.isArray(body.output) ? body.output : []), ...(Array.isArray(body.outputs) ? body.outputs : [])]
  let data = ''
  let contentType = `image/${request.outputFormat || 'png'}`
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const item = candidate as { data?: string; mime_type?: string; inlineData?: { data?: string; mimeType?: string } }
    if (item.data || item.inlineData?.data) {
      data = item.data || item.inlineData?.data || ''
      contentType = item.mime_type || item.inlineData?.mimeType || contentType
      break
    }
  }
  if (!data) throw new Error('Google Gemini completed without returning an image.')
  return finishDirectImage(request, 'google', modelId, Buffer.from(data, 'base64'), contentType)
}

function queueMessage(update: unknown): string {
  if (!update || typeof update !== 'object') return 'Working…'
  const candidate = update as { status?: string; logs?: Array<{ message?: string }>; queue_position?: number }
  const lastLog = candidate.logs?.filter((entry) => entry.message).at(-1)?.message
  if (lastLog) return lastLog
  if (typeof candidate.queue_position === 'number') return `Queue position ${candidate.queue_position}`
  return candidate.status === 'IN_QUEUE' ? 'Queued on fal.ai' : 'Generating…'
}

async function appendHistory(entry: HistoryEntry): Promise<void> {
  assertGenerationCommit()
  await historyJsonMutations.mutateArray<HistoryEntry>(historyPath(), (entries) => {
    assertGenerationCommit()
    return [entry, ...entries].slice(0, 200)
  })
}

function fluxImageSize(ratio?: string): string | { width: number; height: number } {
  const preset: Record<string, string> = {
    '1:1': 'square_hd', '16:9': 'landscape_16_9', '9:16': 'portrait_16_9', '3:4': 'portrait_4_3', '4:3': 'landscape_4_3',
    square_hd: 'square_hd', landscape_16_9: 'landscape_16_9', portrait_16_9: 'portrait_16_9', portrait_4_3: 'portrait_4_3', landscape_4_3: 'landscape_4_3',
  }
  if (preset[ratio || '']) return preset[ratio || '']
  const custom: Record<string, { width: number; height: number }> = {
    '2:3': { width: 768, height: 1152 }, '1:2': { width: 768, height: 1536 }, '2:1': { width: 1536, height: 768 },
    '4:5': { width: 1024, height: 1280 }, '3:2': { width: 1200, height: 800 }, '21:9': { width: 1536, height: 658 }, '5:4': { width: 1280, height: 1024 },
  }
  return custom[ratio || ''] || 'landscape_16_9'
}

async function readOwnedFalSchema(endpointId: string): Promise<FalSchemaContract> {
  const id = falEndpointId(endpointId)
  const scope = runtimeServiceFailures.catalogScope('fal')
  const assertCurrent = () => runtimeServiceFailures.assertCurrent('fal')
  return falSchemaCache.read(scope, id, async () => {
    const key = await loadServiceCredential('fal')
    return readFalModelSchema(id, { request: (url) => fetchProviderModelCatalog('fal', url, { headers: { Authorization: `Key ${key}` } }), assertCurrent })
  }, assertCurrent)
}

async function runNativeFalGeneration(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  assertVideoProviderPromptPreflight(request)
  const timelineSeconds = authoredTimelineSeconds(request)
  const promptOwnership = effectiveProviderPromptOwnership(request)
  const native = { ...request.falNative!, ...(promptOwnership !== undefined ? { promptOwnership } : {}), requiresGeneratedSpeech: requiresGeneratedDialogueAudio(request), ...(timelineSeconds !== undefined ? { timelineSeconds } : {}) }
  // The visible final prompt has one owner. No static adapter adds unseen instructions.
  const finalPrompt = request.providerPromptOverride ?? request.prompt
  if (finalPrompt !== undefined && (!native.promptField || native.values[native.promptField] !== nativeFalPromptTransport(request, finalPrompt))) throw new Error('The native model prompt must match the visible final prompt through its actual attachment mapping. Review its binding.')
  const supplied = Object.values(native.media).flat()
  const sources = [...(request.references || []), ...(request.inputPath || request.inputUrl ? [{ path: request.inputPath, url: request.inputUrl, mediaType: request.inputRole === 'source-video' ? 'video' as const : 'image' as const }] : [])]
  for (const source of sources) {
    if (!source.path && !source.url || source.path && extname(source.path).toLowerCase() === '.prismstyle') continue
    if (!supplied.some(item => (source.path ? item.path === source.path : item.url === source.url) && item.mediaType === (source.mediaType || 'image'))) throw new Error('A connected reference is missing from the native model inputs. Review its field binding.')
  }
  let videoDraft: VideoDraftReceipt | undefined
  let videoDraftWarning: string | undefined
  const draftCreatedAt = new Date().toISOString()
  const draftAccount = native.values.draft === true && supportsFalSeedanceDraft(native.endpointId) ? videoDraftAccountFingerprint(await loadServiceCredential('fal')) : undefined
  if (draftAccount) native.values = { ...native.values, resolution: '480p' }
  try {
    const result = await executeFalNativeGeneration(native, request.kind, {
      contract: readOwnedFalSchema,
      assertCurrent: () => { runtimeServiceFailures.assertCurrent('fal'); assertGenerationCommit() },
      prepareSource: async (source, expectedType, maximumBytes) => {
        if (!source.path) { await assertFalMediaFileLimit(undefined, maximumBytes); return source }
        const path = await assertManagedMediaPath(source.path)
        if (!mimeFor(path).startsWith(`${expectedType}/`)) throw new Error(`The connected file must be ${expectedType} media.`)
        await stat(path)
        await assertFalMediaFileLimit(path, maximumBytes)
        return { ...source, path }
      },
      client: async () => createOwnedFalClient(await loadCredential(), falElectronFetch, () => runtimeServiceFailures.assertCurrent('fal')),
      upload: (client, path) => uploadLocalAsset(path, client),
      submit: async (client, endpointId, input, abortSignal) => {
        mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: 'Submitting securely to fal.ai…', status: 'queued' })
        return subscribeOwnedFalClient(client, endpointId, { input, logs: true, abortSignal, onQueueUpdate: update => {
          mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: queueMessage(update), status: update.status === 'IN_QUEUE' ? 'queued' : 'running' })
        } })
      },
      persist: async (output, endpointId, abortSignal, response) => {
        if (draftAccount && output.type === 'video') {
          try { videoDraft = createVideoDraftReceipt('fal', endpointId, (response as { draft_id?: unknown }).draft_id, request.nodeId, draftAccount, draftCreatedAt, { duration: native.values.duration as string | number | undefined, aspectRatio: native.values.aspect_ratio as string | undefined, generateAudio: native.values.generate_audio as boolean | undefined }) }
          catch { videoDraftWarning = 'Draft video saved. The provider returned no usable completion ID; recover the original fal request in Node Settings before rendering a final.' }
        }
        const path = await downloadResult(output.url, output.contentType, { provider: 'fal.ai', modelId: endpointId, prompt: finalPrompt, ...(videoDraft ? { videoDraft, resolution: '480p' } : {}) }, abortSignal, output.type)
        if (output.type === 'image') await enforceLockedArtwork(request, path)
        const url = localAssetUrl(path)
        await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId: endpointId, status: 'complete', createdAt: new Date().toISOString(), outputPath: path, outputUrl: url })
        return { path, url }
      },
    }, signal)
    runtimeServiceFailures.delete('fal')
    const primary = result.outputs[result.primaryIndex]
    return { requestId: result.requestId, modelId: result.modelId, outputPath: primary.path, outputUrl: primary.url, outputType: primary.type, outputs: result.outputs, videoDraft, videoDraftWarning }
  } catch (error) {
    if (signal?.aborted || error instanceof VideoDialogueAudioConflictError || error instanceof SeedancePromptIntegrityError) throw error
    rememberServiceFailure('fal', error)
    throw error
  }
}

async function createCurrentHiggsfieldApi(observerFactory?: (identity: string) => HiggsfieldJobObserver): Promise<HiggsfieldApi> {
  const key = await loadServiceCredential('higgsfield')
  return new HiggsfieldApi({ fetch: (url, init) => net.fetch(url, init), key, observer: observerFactory?.(higgsfieldCredentialIdentity(key)), assertCurrent: () => runtimeServiceFailures.assertCurrent('higgsfield') })
}
async function readCurrentHiggsfieldPresets(refresh = false): Promise<HiggsfieldPreset[]> {
  const assertCurrent = () => runtimeServiceFailures.assertCurrent('higgsfield')
  const scope = runtimeServiceFailures.catalogScope('higgsfield')
  assertCurrent()
  if (refresh) higgsfieldPresetCache.invalidate(scope)
  return higgsfieldPresetCache.read(scope, async () => (await createCurrentHiggsfieldApi()).presets(), assertCurrent)
}
async function prepareManagedHiggsfieldSource(source: HiggsfieldMediaSource, signal?: AbortSignal) {
  signal?.throwIfAborted();runtimeServiceFailures.assertCurrent('higgsfield')
  if (!source.path) return { source: { ...source } }
  const path = await assertManagedMediaPath(source.path), contentType = mimeFor(path), maximum = source.mediaType === 'video' ? 200 * 1024 * 1024 : 64 * 1024 * 1024
  const before = await stat(path)
  if (!before.isFile() || before.size < 1 || before.size > maximum || (source.mediaType === 'video' ? contentType !== 'video/mp4' : !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType))) throw new Error('Choose supported managed Higgsfield media within its file-size limit.')
  const videoInfo = source.mediaType === 'video' ? await probeManagedMp4(path, signal) : undefined
  signal?.throwIfAborted();runtimeServiceFailures.assertCurrent('higgsfield')
  const bytes = await readFile(path), after = await stat(path)
  if (bytes.length !== before.size || before.size !== after.size || before.ino !== after.ino || before.mtimeMs !== after.mtimeMs) throw new Error('The source changed during Higgsfield preparation. Try again after saving it.')
  if (source.mediaType === 'image') await inspectHiggsfieldImage(bytes, contentType)
  signal?.throwIfAborted();runtimeServiceFailures.assertCurrent('higgsfield')
  return { source: { ...source, path }, contentType, bytes, videoInfo }
}
let higgsfieldJobStoreInstance: HiggsfieldJobStore | undefined
function higgsfieldJobStore(): HiggsfieldJobStore {
  return higgsfieldJobStoreInstance ||= new HiggsfieldJobStore(dataRoot(), undefined, undefined, {
    encrypt: value => { if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure recovery storage is unavailable.'); return safeStorage.encryptString(value) },
    decrypt: value => safeStorage.decryptString(value),
  })
}
function higgsfieldJobScope(nodeId: string): HiggsfieldJobScope {
  assertGenerationCommit()
  const owner = generationContext.getStore() || (currentProject && currentProjectDocumentPath ? { projectId: currentProject.id, rootPath: resolve(currentProject.rootPath), documentPath: resolve(currentProjectDocumentPath) } : undefined)
  if (!owner || typeof nodeId !== 'string' || !nodeId || nodeId.length > 160) throw new Error('Choose a current project and node for Higgsfield generation.')
  return { projectId: owner.projectId, rootPath: owner.rootPath, documentPath: owner.documentPath, nodeId }
}
async function currentHiggsfieldProfileId(): Promise<string> {
  runtimeServiceFailures.assertCurrent('higgsfield')
  const registry = await serviceProfileStore().listProfiles('higgsfield', false)
  runtimeServiceFailures.assertCurrent('higgsfield')
  const selection = projectServiceProfileSelection(registry, { serviceProfileOverrides: runtimeServiceFailures.overrides('higgsfield', currentProject?.serviceProfileOverrides) }, 'higgsfield')
  return selection.profile?.id || 'legacy'
}
const higgsfieldJobActions = new HiggsfieldJobActions()
async function persistCurrentHiggsfieldOutput(scope: HiggsfieldJobScope, id: string, output?: { requestId: string; url: string; contentType?: string }, signal?: AbortSignal): Promise<GenerationResult> {
  const assertCurrent = () => { signal?.throwIfAborted(); runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit() }
  return persistHiggsfieldOutput(scope, id, output, {
    store: higgsfieldJobStore(), assertCurrent, signal,
    decrypt: bytes => safeStorage.decryptString(bytes),
    encrypt: text => { if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure recovery storage is unavailable.'); return safeStorage.encryptString(text) },
    fetch: (url, init) => net.fetch(url, init),
    commit: async (record, original, receipt) => {
      assertCurrent()
      const id = `higgsfield-${record.id}`, path = receipt.path
      const assets = await readStrictJsonOr<ImportedAsset[]>(assetsIndexPath(), [], 'The generated asset index')
      assertCurrent()
      const existing = assets.find(asset => asset.id === id)
      if (existing && existing.path !== path) throw new Error('The existing Higgsfield asset identity points to another file. Preserve it for review.')
      if (!existing) await registerAsset({ id, name: basename(path), path, mimeType: receipt.contentType, category: 'video', origin: 'generated', fileSize: receipt.bytes, createdAt: record.createdAt, metadata: { provider: 'Higgsfield', modelId: record.endpointId, prompt: original.values.prompt as string } })
      assertCurrent()
      await historyJsonMutations.mutateArray<HistoryEntry>(historyPath(), entries => {
        assertCurrent()
        const existing = entries.find(entry => entry.id === id)
        if (existing) {
          if (existing.nodeId !== record.nodeId || existing.modelId !== record.endpointId || existing.outputPath !== path || existing.status !== 'complete') throw new Error('The existing Higgsfield history identity changed. Preserve it for review.')
          return entries
        }
        return [{ id, nodeId: record.nodeId, nodeTitle: 'video-generator', modelId: record.endpointId, status: 'complete' as const, createdAt: record.createdAt, outputPath: path, outputUrl: localAssetUrl(path) }, ...entries].slice(0, 200)
      })
      assertCurrent()
      // Repair a projection interrupted after its asset index committed.
      await writeProjectDocument()
    },
  })
}
async function listCurrentHiggsfieldJobs(): Promise<HiggsfieldJobView[]> {
  const scope = higgsfieldJobScope('read')
  runtimeServiceFailures.assertCurrent('higgsfield')
  const records = await higgsfieldJobStore().list(scope)
  runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit()
  return records.map(record => ({ ...higgsfieldRecoveryView(record, bytes => safeStorage.decryptString(bytes)), ownerMatches: record.rootPath === scope.rootPath && record.documentPath === scope.documentPath, canRelocate: record.rootPath === scope.rootPath }))
}
async function recoverCurrentHiggsfieldJob(value: unknown, signal?: AbortSignal): Promise<{ job: HiggsfieldJobView; result?: GenerationResult }> {
  const command = higgsfieldJobCommand(value), scope = higgsfieldJobScope(command.nodeId)
  return higgsfieldJobActions.run(scope, () => performHiggsfieldJobAction(scope, command, {
    store: higgsfieldJobStore(), signal,
    assertCurrent: () => { signal?.throwIfAborted(); runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit() },
    profileId: currentHiggsfieldProfileId,
    decrypt: bytes => safeStorage.decryptString(bytes),
    encrypt: value => { if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure recovery storage is unavailable.'); return safeStorage.encryptString(value) },
    createApi: async expected => {
      const key = await loadServiceCredential('higgsfield')
      runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit()
      if (higgsfieldCredentialIdentity(key) !== expected) throw new Error('Reconnect the original Higgsfield account; this key belongs to a different account.')
      return new HiggsfieldApi({ key, fetch: (url, init) => net.fetch(url, init), assertCurrent: () => { signal?.throwIfAborted(); runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit() } })
    },
    persist: (record, _original, output) => persistCurrentHiggsfieldOutput(scope, record.id, output, signal),
  }))
}
async function runNativeHiggsfieldGeneration(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  assertGenerationRequirements(request)
  assertVideoProviderPromptPreflight(request)
  const native = structuredClone(request.higgsfieldNative!), finalPrompt = request.providerPromptOverride ?? request.prompt ?? ''
  if ((Object.hasOwn(native.values,'prompt') ? native.values.prompt : '') !== finalPrompt) throw new Error('The Higgsfield body must match the visible authored prompt. Review its preserved text.')
  // Current declared schema is checked before private journal/key/media preparation.
  // Temporary public URI placeholders preserve exact media cardinality/order only.
  const assertCurrentContract = () => { signal?.throwIfAborted(); runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit() }
  const current = await resolveHiggsfieldCurrentInput(native, { assertCurrent: assertCurrentContract, readContract: (endpointId, owned) => higgsfieldPublicCatalog.readContract(endpointId, owned) })
  const inputPlan = current.plan
  if ((Object.hasOwn(inputPlan.values,'prompt') ? inputPlan.values.prompt : '') !== finalPrompt) throw new Error('The effective Higgsfield prompt must match the visible prompt. Review the current default or write explicit instructions; no hidden prompt was submitted.')
  const schemaInput = inputPlan.preview
  const currentInputSchema = current.schema
  const validateSemanticControls=(schema:typeof currentInputSchema,input:unknown)=>{
    if(inputPlan.kind==='genjutsu')return
    if(requiresGeneratedDialogueAudio(request)) {
      const controls=input as Record<string,unknown>,audio=schema.properties?.generate_audio,sound=schema.properties?.sound
      const enabled=audio?.type==='boolean'&&(controls.generate_audio ?? audio.default)===true || sound?.type==='string'&&sound.enum?.includes('on')&&(controls.sound ?? sound.default)==='on'
      if(!enabled)throw new VideoDialogueAudioConflictError()
    }
  }
  assertCurrentContract();validateSemanticControls(currentInputSchema,schemaInput)
  const boundMedia = Object.values(native.media).flat()
  const expectedMedia = [...(request.references || []).filter(reference => Boolean(reference.path || reference.url) && !(reference.role === 'style' && reference.path?.endsWith('.prismstyle'))), ...(request.inputPath || request.inputUrl ? [{ path: request.inputPath, url: request.inputUrl }] : [])]
  if (expectedMedia.some(reference => !boundMedia.some(source => reference.path ? source.path === reference.path : source.url === reference.url))) throw new Error('Connected media are not bound to the selected Higgsfield input. Review the preserved references.')
  const scope = higgsfieldJobScope(request.nodeId)
  const profileId = await currentHiggsfieldProfileId()
  runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit(); signal?.throwIfAborted()
  const lifecycle = await beginHiggsfieldJob(higgsfieldJobStore(), scope, profileId, native, value => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure recovery storage is unavailable; generation was not submitted.')
    return safeStorage.encryptString(value)
  }, native.fingerprint !== undefined && inputPlan.kind !== 'genjutsu' ? currentInputSchema : undefined)
  try {
    const generationDependencies = {
      assertCurrent: () => { runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit() },
      prepare: prepareManagedHiggsfieldSource,
      validateInput: async (input:unknown) => { const latest=await current.validateInput(input);assertCurrentContract();validateSemanticControls(latest,input) },
      api: () => createCurrentHiggsfieldApi(identity => lifecycle.observer(identity)),
      persist: async (output:{requestId:string;url:string;contentType?:string}, endpointId:string, abortSignal?:AbortSignal) => {
        abortSignal?.throwIfAborted()
        const result = await persistCurrentHiggsfieldOutput(scope, lifecycle.record.id, output, abortSignal)
        runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit(); abortSignal?.throwIfAborted()
        await lifecycle.persisted(result.outputPath)
        return { path: result.outputPath, url: result.outputUrl }
      },
    }
    const result = inputPlan.kind==='seedance'
      ? await executeHiggsfieldSeedanceGeneration(higgsfieldSeedanceRequest(native),{...generationDependencies,...higgsfieldSeedanceManagedMedia({assertCurrent:assertCurrentContract,assertManagedPath:assertManagedMediaPath,mimeFor}),...(native.fingerprint!==undefined?{inputSchema:currentInputSchema}:{})},signal)
      : inputPlan.kind==='text-video'
        ? await executeHiggsfieldTextVideoGeneration(native,{...generationDependencies,inputSchema:currentInputSchema},signal)
        : inputPlan.kind==='reference-video'
          ? await executeHiggsfieldReferenceVideoGeneration(native,{...generationDependencies,...higgsfieldSeedanceManagedMedia({assertCurrent:assertCurrentContract,assertManagedPath:assertManagedMediaPath,mimeFor}),inputSchema:currentInputSchema},signal)
          : await executeHiggsfieldGeneration(native,generationDependencies,signal)
    runtimeServiceFailures.delete('higgsfield');return result
  } catch (error) {
    try { await lifecycle.failed(error) } catch {
      throw new HiggsfieldRemoteJobError('Higgsfield recovery status could not be recorded; remote work may continue. The original attempt remains protected. Check the provider dashboard before retrying.')
    }
    if (error instanceof HiggsfieldRemoteJobError) {
      try { runtimeServiceFailures.assertCurrent('higgsfield'); assertGenerationCommit(); mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: error.message, status: 'remote-unknown' }) } catch { /* A superseded owner cannot update another project's node. */ }
    }
    if (!signal?.aborted && !(error instanceof HiggsfieldRemoteJobError)) rememberServiceFailure('higgsfield', error)
    throw error
  }
}

function videoDraftAccountFingerprint(key: string): string {
  return createHash('sha256').update('Prism Video Draft Account\0').update(key).digest('hex')
}
async function runRecoveredFalDraft(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  const result = await executeFalDraftRecovery(request, {
    assertCurrent: () => { assertGenerationCommit(); runtimeServiceFailures.assertCurrent('fal') },
    accountFingerprint: async () => videoDraftAccountFingerprint(await loadServiceCredential('fal')),
    result: async (endpointId, requestId, abortSignal) => {
      const contract = await readOwnedFalSchema(endpointId)
      assertGenerationCommit(); runtimeServiceFailures.assertCurrent('fal')
      const client = createOwnedFalClient(await loadServiceCredential('fal'), falElectronFetch, () => { assertGenerationCommit(); runtimeServiceFailures.assertCurrent('fal') })
      const recovered = await client.queue.result(endpointId, { requestId, abortSignal })
      assertGenerationCommit(); runtimeServiceFailures.assertCurrent('fal')
      await validateFalContractValue(contract.output, recovered.data, 'Output')
      return recovered
    },
    persist: async (url, receipt, abortSignal) => {
      const path = await downloadResult(url, 'video/mp4', { provider: 'fal.ai', modelId: receipt.modelId, resolution: '480p', videoDraft: receipt }, abortSignal, 'video')
      const outputUrl = localAssetUrl(path)
      await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId: receipt.modelId, status: 'complete', createdAt: new Date().toISOString(), outputPath: path, outputUrl })
      return { path, url: outputUrl }
    },
  }, signal)
  runtimeServiceFailures.delete('fal')
  return result
}
async function runLinkedVideoDraftCompletion(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  const result = await executeVideoDraftCompletion(request, {
    assertCurrent: () => { assertGenerationCommit(); runtimeServiceFailures.assertCurrent(request.draftCompletion!.provider) },
    receipt: async source => {
      const path = await assertManagedMediaPath(source)
      const assets = await readJson<ImportedAsset[]>(assetsIndexPath(), [])
      const asset = assets.find(item => resolve(item.path) === resolve(path) && !item.trashedAt && item.mimeType.startsWith('video/'))
      if (!asset?.metadata?.videoDraft) throw new Error('The selected managed video has no original draft receipt.')
      return asset.metadata.videoDraft
    },
    accountFingerprint: async provider => videoDraftAccountFingerprint(await loadServiceCredential(provider)),
    submit: async (receipt, input, abortSignal) => {
      if (receipt.provider === 'byteplus') {
        const key = await loadServiceCredential('byteplus')
        const task = await runBytePlusTask({ fetch: (url, init) => { if (init?.method === 'POST') { runtimeServiceFailures.assertCurrent('byteplus'); assertGenerationCommit(); abortSignal?.throwIfAborted() } return net.fetch(url, init) }, apiKey: key, payload: input as BytePlusCreatePayload, signal: abortSignal,
          onProgress: (message, status) => mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message, status }) })
        return { requestId: task.taskId, url: task.outputUrl, contentType: 'video/mp4' }
      }
      const contract = await readOwnedFalSchema(FAL_SEEDANCE_DRAFT_COMPLETE)
      await validateFalContractValue(contract.input, input)
      runtimeServiceFailures.assertCurrent('fal'); assertGenerationCommit(); abortSignal?.throwIfAborted()
      const client = createOwnedFalClient(await loadServiceCredential('fal'), falElectronFetch, () => { runtimeServiceFailures.assertCurrent('fal'); assertGenerationCommit() })
      const submitted = await subscribeOwnedFalClient(client, FAL_SEEDANCE_DRAFT_COMPLETE, { input, logs: true, abortSignal,
        onQueueUpdate: update => mainWindow?.webContents.send('generation:progress', { nodeId: request.nodeId, message: queueMessage(update), status: update.status === 'IN_QUEUE' ? 'queued' : 'running' }) })
      await validateFalContractValue(contract.output, submitted.data, 'Output')
      const video = (submitted.data as { video: { url: string; content_type?: string } }).video
      return { requestId: submitted.requestId, url: video.url, contentType: video.content_type || 'video/mp4' }
    },
    persist: async (output, receipt, abortSignal) => {
      const path = await downloadResult(output.url, output.contentType, { provider: receipt.provider, modelId: receipt.modelId, resolution: '1080p', videoDraft: receipt }, abortSignal, 'video')
      const url = localAssetUrl(path)
      await appendHistory({ id: randomUUID(), nodeId: request.nodeId, nodeTitle: request.kind, modelId: receipt.modelId, status: 'complete', createdAt: new Date().toISOString(), outputPath: path, outputUrl: url })
      return { path, url }
    },
  }, signal)
  runtimeServiceFailures.delete(request.draftCompletion!.provider)
  return result
}

async function runGeneration(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult> {
  if (request.falDraftRecovery) return runRecoveredFalDraft(request, signal)
  if (request.draftCompletion) return runLinkedVideoDraftCompletion(request, signal)
  assertGenerationRequirements(request)
  assertVideoProviderPromptPreflight(request)
  if (!currentProject) throw new Error('Choose or open a project folder first.')
  if (request.higgsfieldNative) return runNativeHiggsfieldGeneration(request, signal)
  if (request.falNative) return runNativeFalGeneration(request, signal)
  if (request.kind === 'voiceover' && request.voiceEngine === 'fish-audio') return runFishAudio(request, signal)
  if (isDirectElevenAudio(request)) return runElevenLabsAudio(request, signal)
  if ((request.kind === 'image-generator' || request.kind === 'image-editor') && request.imageProvider === 'openai') return runOpenAIImage(request, signal)
  if ((request.kind === 'image-generator' || request.kind === 'image-editor') && request.imageProvider === 'google') return runGeminiImage(request, signal)
  if (request.kind === 'video-generator') {
    const videoModel = resolveVideoModel(request.videoEngine)
    if (videoModel.provider === 'byteplus') return runBytePlusGeneration(request, videoModel, signal)
  }
  let modelId = MODEL_IDS[request.kind]
  if (!modelId) throw new Error('This node does not run a fal.ai model.')
  const key = await loadCredential()
  const client = createOwnedFalClient(key, falElectronFetch, () => runtimeServiceFailures.assertCurrent('fal'))

  const referenceModel = request.kind === 'video-generator' ? resolveVideoModel(request.videoEngine) : undefined
  const seedanceReferenceMode = referenceModel?.family === 'seedance' && referenceModel.mode === 'reference'
  // Reference mode resolves its one shared physical set; direct input is already represented there.
  let inputUrl = !seedanceReferenceMode && (request.inputUrl?.startsWith('http://') || request.inputUrl?.startsWith('https://'))
    ? request.inputUrl
    : undefined
  if (!seedanceReferenceMode && !inputUrl && request.inputPath) inputUrl = await uploadLocalAsset(request.inputPath, client)

  const uploadReferences = seedanceReferenceMode ? seedanceReferenceCandidates(request) : request.references || []
  const references = await Promise.all(uploadReferences.map(async (reference) => {
    const remoteUrl = reference.url?.startsWith('http://') || reference.url?.startsWith('https://')
      ? reference.url
      : reference.path && !(reference.role === 'style' && extname(reference.path).toLowerCase() === '.prismstyle')
        ? await uploadLocalAsset(reference.path, client)
        : undefined
    return { ...reference, remoteUrl }
  }))
  const validReferences = references.filter((reference): reference is typeof reference & { remoteUrl: string } => Boolean(reference.remoteUrl))
  const imageReferences = validReferences.filter((reference) => !reference.mediaType || reference.mediaType === 'image')
  if (request.kind === 'image-generator' && inputUrl && !imageReferences.some((reference) => reference.remoteUrl === inputUrl)) imageReferences.unshift({ role: 'reference', remoteUrl: inputUrl, name: request.inputName, tag: request.inputTag, mediaType: 'image', slot: 'start' })
  const prompt = request.prompt?.trim()
  const semanticPrompt = prompt ? resolvedPromptWithReferences({ ...request, references: validReferences }) : prompt
  let input: Record<string, unknown> = {}
  switch (request.kind) {
    case 'image-generator':
      if (!prompt) throw new Error('Add a prompt before generating an image.')
      if (validReferences.some((reference) => reference.mediaType && reference.mediaType !== 'image')) throw new Error('Image generation can consume image List items only.')
      modelId = effectiveFalImageModel({ ...request, inputUrl, references: validReferences }) || FAL_IMAGE_MODELS.fluxSchnell
      {
        const providerRequest = providerArtworkCarrierRequest({ ...request, references: validReferences })
        const providerReferences = (providerRequest.references || []).filter((reference) => !reference.mediaType || reference.mediaType === 'image')
        const maximum = imageReferenceLimit({ ...request, inputUrl, references: validReferences })
        if (providerReferences.length > maximum) throw new Error(`The selected fal.ai image model accepts up to ${maximum} semantic reference images.`)
      }
      {
        const providerRequest = providerArtworkCarrierRequest({ ...request, references: imageReferences })
        const orderedPromptReferences = orderedProviderImageReferences({
          ...providerRequest,
          inputPath: undefined,
          inputUrl: undefined,
          references: (providerRequest.references || []).map((reference) => {
            const matching = imageReferences.find((candidate) => candidate.path === reference.path && candidate.tag === reference.tag)
            return { ...reference, url: matching?.remoteUrl || reference.url }
          }),
        })
        const allImageUrls = orderedPromptReferences.map((reference) => reference.url).filter((url): url is string => Boolean(url))
        const imagePrompt = providerNativeImagePrompt({ ...providerRequest, inputPath: undefined, inputUrl: undefined, references: orderedPromptReferences }, orderedPromptReferences)
        const providerNativeInput = falImageEditInput(modelId, request, imagePrompt, allImageUrls)
        if (providerNativeInput) input = providerNativeInput
        else if (modelId === FAL_IMAGE_MODELS.nanoBananaEdit) {
        const ratios: Record<string, string> = {
          square_hd: '1:1', portrait_4_3: '3:4', portrait_16_9: '9:16', landscape_4_3: '4:3', landscape_16_9: '16:9',
        }
          input = nanoBananaInput({ ...request, aspectRatio: ratios[request.aspectRatio || ''] || request.aspectRatio || 'auto' }, imagePrompt, allImageUrls)
        } else if (modelId === FAL_IMAGE_MODELS.nanoBanana) {
          input = nanoBananaInput(request, imagePrompt)
        } else if (modelId === FAL_IMAGE_MODELS.fluxKontext && allImageUrls.length) {
          input = fluxKontextInput(request, imagePrompt, allImageUrls[0])
        } else {
          input = {
            prompt: semanticPrompt,
            image_size: fluxImageSize(request.aspectRatio),
            num_inference_steps: Math.min(Math.max(request.inferenceSteps || 4, 1), 12),
            guidance_scale: Math.min(Math.max(request.guidanceScale || 3.5, 1), 20),
            ...(Number.isFinite(request.seed) ? { seed: request.seed } : {}),
            num_images: 1,
            enable_safety_checker: true,
            output_format: request.outputFormat || 'png',
            acceleration: request.acceleration || 'none',
          }
        }
      }
      break
    case 'image-editor':
      if (!prompt || (!inputUrl && !imageReferences.length)) throw new Error('Image editing needs a prompt and at least one image input.')
      modelId = effectiveFalImageModel({ ...request, inputUrl, references: validReferences }) || FAL_IMAGE_MODELS.fluxKontext
      {
        const orderedPromptReferences = orderedProviderImageReferences({
          ...request,
          inputPath: undefined,
          inputUrl,
          references: imageReferences.map(({ remoteUrl, ...reference }) => ({ ...reference, url: remoteUrl })),
        })
        const allImageUrls = orderedPromptReferences.map((reference) => reference.url).filter((url): url is string => Boolean(url))
        const imagePrompt = providerNativeImagePrompt({ ...request, inputPath: undefined, inputUrl: undefined, references: orderedPromptReferences }, orderedPromptReferences)
        const providerNativeInput = falImageEditInput(modelId, request, imagePrompt, allImageUrls)
        if (providerNativeInput) input = providerNativeInput
        else if (modelId === FAL_IMAGE_MODELS.nanoBananaEdit) input = nanoBananaInput(request, imagePrompt, allImageUrls)
        else input = fluxKontextInput(request, imagePrompt, inputUrl || allImageUrls[0])
      }
      break
    case 'upscaler':
      if (!inputUrl) throw new Error(`Upscaling needs a ${request.upscalerModel === 'realesrgan-video' ? 'video' : 'image'} input.`)
      if (request.upscalerModel === 'realesrgan-video') {
        modelId = 'fal-ai/video-upscaler'
        input = realEsrganVideoUpscalerInput(request, inputUrl)
      } else {
        modelId = 'fal-ai/clarity-upscaler'
        input = clarityUpscalerInput(request, inputUrl)
      }
      break
    case 'video-generator':
      {
        const videoModel = resolveVideoModel(request.videoEngine)
        if (!prompt && !request.multiPrompt?.length && !(videoModel.family === 'seedance' && videoModel.mode === 'reference' && validReferences.length)) throw new Error('Add a prompt or connect a text List in As list mode before generating a video.')
        modelId = videoModel.id === 'wan-controlled' ? 'fal-ai/wan/v2.2-5b/text-to-video/distill' : videoModel.id
        const endReference = validReferences.find((reference) => reference.slot === 'end' && (!reference.mediaType || reference.mediaType === 'image'))
        const startReference = validReferences.find((reference) => reference.slot === 'start' && (!reference.mediaType || reference.mediaType === 'image'))
          || validReferences.find((reference) => reference.role === 'reference' && reference.slot !== 'end' && (!reference.mediaType || reference.mediaType === 'image'))
        if (!inputUrl && startReference) inputUrl = startReference.remoteUrl

        if (videoModel.family === 'seedance') {
          const seedanceDuration = legacyVideoDurationPlan(request, videoModel).wire
          const common = {
            prompt: semanticPrompt,
            resolution: videoModel.resolutions.includes(request.resolution || '') ? request.resolution : '720p',
            duration: seedanceDuration,
            aspect_ratio: videoModel.ratios.includes(request.aspectRatio || '') ? request.aspectRatio : (videoModel.ratios[0] || 'auto'),
            generate_audio: Boolean(request.generateAudio),
            ...(videoModel.supportsBitrateMode ? { bitrate_mode: request.bitrateMode || 'standard' } : {}),
            ...(videoModel.supportsSeed && Number.isFinite(request.seed) ? { seed: request.seed } : {}),
            ...providerNativeShutterFields(videoModel, request),
          }
          if (videoModel.mode === 'text') {
            if (inputUrl || validReferences.length) throw new Error('This Seedance endpoint is text-to-video. Choose Image or References for connected media.')
            input = common
            break
          }
          if (videoModel.mode === 'image') {
            if (!inputUrl) throw new Error('Seedance image-to-video needs a connected start image.')
            input = { ...common, image_url: inputUrl, end_image_url: endReference?.remoteUrl }
            break
          }
        const seedanceCandidates = [...validReferences]
        if (inputUrl && !seedanceCandidates.some((reference) => reference.remoteUrl === inputUrl)) seedanceCandidates.unshift({ role: 'reference', remoteUrl: inputUrl, mediaType: 'image', slot: 'start' })
        const { images: seedanceImages, videos: seedanceVideos, audios: seedanceAudios } = selectSeedanceReferences(seedanceCandidates, videoModel.referenceLimits)
        const seedanceTotal = seedanceImages.length + seedanceVideos.length + seedanceAudios.length
        if (seedanceAudios.length && !seedanceImages.length && !seedanceVideos.length) throw new Error('Seedance audio references require at least one image or video reference.')
        if (!seedanceTotal) throw new Error('Seedance reference mode needs a connected List or semantic reference node.')
        const selectedSemanticPrompt = providerSeedancePayloadCompilation({ ...request, references: [...seedanceImages, ...seedanceVideos, ...seedanceAudios] }).text
        input = {
          ...common,
          prompt: selectedSemanticPrompt,
          image_urls: seedanceImages.map((reference) => reference.remoteUrl),
          video_urls: seedanceVideos.map((reference) => reference.remoteUrl),
          audio_urls: seedanceAudios.map((reference) => reference.remoteUrl),
        }
        break
        }

        if (videoModel.family === 'kling') {
        if (validReferences.some((reference) => reference.mediaType === 'audio')) throw new Error('Kling 3 generation accepts start/end images and image/video elements, but not an audio reference. Use native audio or Seedance 2 for audio references.')
        const elementReferences = validReferences.filter((reference) => reference !== startReference && reference !== endReference && reference.slot !== 'end' && (reference.role === 'character' || reference.role === 'element' || reference.mediaType === 'video'))
        const appearanceReferences = imageReferences.filter((reference) => reference !== startReference && reference !== endReference && !elementReferences.includes(reference))
        const groupedImageElements = new Map<string, string[]>()
        const videoElements: Array<{ video_url: string }> = []
        for (const reference of elementReferences) {
          if (reference.mediaType === 'video') videoElements.push({ video_url: reference.remoteUrl })
          else {
            const key = reference.tag || `@Element${groupedImageElements.size + 1}`
            groupedImageElements.set(key, [...(groupedImageElements.get(key) || []), reference.remoteUrl])
          }
        }
        const elements = [
          ...[...groupedImageElements.values()].map((urls) => ({ frontal_image_url: urls[0], reference_image_urls: urls.slice(1) })),
          ...videoElements,
        ]
        const elementMap = klingReferenceLegend(elementReferences, appearanceReferences)
        const klingReferenceGuide = elementMap ? `\n\nKLING REFERENCE MAP:\n${elementMap}\nUse the exact @Element and @Image labels above. Views grouped into one @Element are one identity or object, not separate subjects.` : ''
        const providerRequest = { ...request, references: validReferences }
        const klingMultiPrompt = klingStoryboardPrompts(providerRequest, klingReferenceGuide)
        const referenceCount = elements.length + appearanceReferences.length
        if (referenceCount > (videoModel.referenceLimit || referenceCount)) throw new Error(`${videoModel.label} accepts up to ${videoModel.referenceLimit} combined elements and appearance references.`)
        const duration = legacyVideoDurationPlan(request, videoModel).wire
        if (videoModel.mode === 'image' && !inputUrl) throw new Error(`${videoModel.label} needs a connected start image.`)
        if (videoModel.mode === 'text' && inputUrl) throw new Error(`${videoModel.label} is text-to-video. Choose its Image variant for a start frame.`)
        const imageKey = videoModel.id.includes('/o3/') ? 'image_url' : 'start_image_url'
        input = {
          prompt: klingMultiPrompt?.length ? undefined : compileProviderPromptForSubmission(providerRequest, {
            family: 'kling',
            legend: elementMap ? {
              heading: 'KLING REFERENCE MAP',
              body: elementMap,
              footer: 'Use the exact @Element and @Image labels above. Views grouped into one @Element are one identity or object, not separate subjects.',
            } : undefined,
          }).text,
          multi_prompt: klingMultiPrompt?.length ? klingMultiPrompt : undefined,
          ...(videoModel.mode === 'image' ? { [imageKey]: inputUrl, end_image_url: endReference?.remoteUrl } : {}),
          ...(videoModel.mode === 'reference' ? { start_image_url: inputUrl, end_image_url: endReference?.remoteUrl, image_urls: appearanceReferences.map((reference) => reference.remoteUrl) } : {}),
          elements: elements.length ? elements : undefined,
          duration,
          aspect_ratio: videoModel.mode === 'image' ? undefined : request.aspectRatio || '16:9',
          generate_audio: Boolean(request.generateAudio),
          shot_type: 'customize',
          negative_prompt: request.negativePrompt || undefined,
          cfg_scale: request.guidanceScale ?? 0.5,
          ...providerNativeShutterFields(videoModel, request),
        }
        break
        }

        if (videoModel.family === 'veo') {
          const veoDuration = legacyVideoDurationPlan(request, videoModel).wire
          const common = { prompt: semanticPrompt, aspect_ratio: request.aspectRatio || 'auto', duration: veoDuration, resolution: videoModel.resolutions.includes(request.resolution || '') ? request.resolution : '720p', generate_audio: Boolean(request.generateAudio), negative_prompt: request.negativePrompt || undefined, ...(Number.isFinite(request.seed) ? { seed: request.seed } : {}), auto_fix: Boolean(request.autoFix), safety_tolerance: String(request.safetyTolerance || 4), ...providerNativeShutterFields(videoModel, request) }
          if (videoModel.mode === 'text') {
            if (inputUrl || validReferences.length) throw new Error(`${videoModel.label} is text-to-video. Choose an input-aware Veo mode.`)
            input = common
          } else if (videoModel.mode === 'image') {
            if (!inputUrl) throw new Error(`${videoModel.label} needs a connected image.`)
            input = { ...common, image_url: inputUrl }
          } else if (videoModel.mode === 'first-last') {
            if (!inputUrl || !endReference?.remoteUrl) throw new Error(`${videoModel.label} needs both start and end images.`)
            input = { ...common, first_frame_url: inputUrl, last_frame_url: endReference.remoteUrl }
          } else if (videoModel.mode === 'extend') {
            const videoReference = validReferences.find((reference) => reference.mediaType === 'video')
            if (!videoReference) throw new Error(`${videoModel.label} needs a connected video.`)
            input = { ...common, video_url: videoReference.remoteUrl }
          } else {
            const veoImages = imageReferences.map((reference) => reference.remoteUrl).slice(0, 3)
            if (inputUrl && !veoImages.includes(inputUrl)) veoImages.unshift(inputUrl)
            if (!veoImages.length) throw new Error(`${videoModel.label} needs at least one reference image.`)
            input = { ...common, image_urls: veoImages.slice(0, 3) }
          }
          break
        }

        if (videoModel.family === 'wan') {
        if (inputUrl || validReferences.length) throw new Error('Controlled FPS mode is text-to-video. Choose Kling 3 or Seedance 2 when using media references.')
        const timing = legacyVideoDurationPlan(request, videoModel)
        const framesPerSecond = timing.framesPerSecond!
        const numFrames = timing.numFrames!
        modelId = 'fal-ai/wan/v2.2-5b/text-to-video/distill'
        input = {
          prompt: semanticPrompt,
          num_frames: numFrames,
          frames_per_second: framesPerSecond,
          resolution: request.resolution === '580p' ? '580p' : '720p',
          aspect_ratio: request.aspectRatio || '16:9',
          ...(Number.isFinite(request.seed) ? { seed: request.seed } : {}),
          num_inference_steps: Math.min(Math.max(Math.round(request.inferenceSteps || 40), 1), 100),
          guidance_scale: Math.min(Math.max(request.guidanceScale ?? 1, 0), 20),
          shift: Math.min(Math.max(request.shift ?? 5, 1), 10),
          acceleration: request.acceleration === 'none' ? 'none' : 'regular',
          enable_prompt_expansion: Boolean(request.enablePromptExpansion),
          interpolator_model: request.interpolatorModel || 'film',
          num_interpolated_frames: Math.min(Math.max(Math.round(request.numInterpolatedFrames ?? 0), 0), 4),
          adjust_fps_for_interpolation: request.adjustFpsForInterpolation !== false,
          video_quality: request.videoQuality || 'high',
          video_write_mode: request.videoWriteMode || 'balanced',
          enable_safety_checker: request.enableInputSafety !== false,
          enable_output_safety_checker: request.enableOutputSafety !== false,
        }
        }
      }
      break
    case 'voiceover':
      if (!prompt) throw new Error('Add voiceover text before generating audio.')
      input = {
        text: prompt,
        voice: request.voice || 'Rachel',
        stability: Math.min(Math.max(request.stability ?? 0.5, 0), 1),
        similarity_boost: Math.min(Math.max(request.similarityBoost ?? 0.75, 0), 1),
        speed: Math.min(Math.max(request.speed ?? 1, 0.7), 1.2),
        language_code: request.languageCode || undefined,
        apply_text_normalization: request.textNormalization || 'auto',
        previous_text: request.previousText || undefined,
        next_text: request.nextText || undefined,
        ...(Number.isFinite(request.voiceSeed) ? { seed: request.voiceSeed } : {}),
        timestamps: request.voiceTimestamps !== false,
        output_format: request.audioOutputFormat || 'mp3_44100_128',
      }
      break
    case 'sound-effects':
      if (!prompt) throw new Error('Describe the sound effect before generating audio.')
      input = {
        text: prompt,
        duration_seconds: Math.min(Math.max(request.duration || 5, 0.5), 22),
        prompt_influence: Math.min(Math.max(request.promptInfluence ?? 0.3, 0), 1),
        loop: Boolean(request.loop),
        output_format: request.audioOutputFormat || 'mp3_44100_128',
      }
      break
    case 'music-generator':
      if (!prompt) throw new Error('Describe the music before generating audio.')
      input = {
        prompt,
        music_length_ms: Math.min(Math.max((request.duration || 30) * 1000, 3000), 600000),
        force_instrumental: Boolean(request.forceInstrumental),
        output_format: request.audioOutputFormat || 'mp3_44100_128',
      }
      break
    default:
      throw new Error('Unsupported generation node.')
  }

  mainWindow?.webContents.send('generation:progress', {
    nodeId: request.nodeId,
    message: 'Submitting securely to fal.ai…',
    status: 'queued',
  })

  try {
    runtimeServiceFailures.assertCurrent('fal')
    const result = await subscribeOwnedFalClient(client, modelId, {
      input,
      logs: true,
      abortSignal: signal,
      onQueueUpdate: (update) => {
        mainWindow?.webContents.send('generation:progress', {
          nodeId: request.nodeId,
          message: queueMessage(update),
          status: update.status === 'IN_QUEUE' ? 'queued' : 'running',
        })
      },
    })

    const payload = result.data as {
      images?: Array<{ url: string; content_type?: string }>
      image?: { url: string; content_type?: string }
      video?: { url: string; content_type?: string }
      audio?: { url: string; content_type?: string }
    }
    const remote = payload.images?.[0] ?? payload.image ?? payload.video ?? payload.audio
    if (!remote?.url) throw new Error('fal.ai completed without returning media.')
    const outputType = payload.video ? 'video' : payload.audio ? 'audio' : 'image'
    const outputPath = await downloadResult(remote.url, remote.content_type, {
      provider: 'fal.ai',
      modelId,
      prompt: request.prompt,
      aspectRatio: request.aspectRatio,
      duration: request.duration,
      resolution: request.resolution || request.imageResolution,
      frameRate: request.frameRate,
      motionCadence: request.motionCadence,
    })
    if (outputType === 'image') await enforceLockedArtwork(request, outputPath)
    await appendHistory({
      id: randomUUID(),
      nodeId: request.nodeId,
      nodeTitle: request.kind,
      modelId,
      status: 'complete',
      createdAt: new Date().toISOString(),
      outputPath,
      outputUrl: localAssetUrl(outputPath),
    })
    runtimeServiceFailures.delete('fal')
    return {
      requestId: result.requestId,
      modelId,
      outputPath,
      outputUrl: localAssetUrl(outputPath),
      outputType,
    }
  } catch (error) {
    if (signal?.aborted) throw error
    const message = providerErrorDetail(error)
    const surfacedError = new Error(message)
    Object.assign(surfacedError, { status: (error as { status?: number } | null)?.status })
    rememberServiceFailure('fal', surfacedError)
    await appendHistory({
      id: randomUUID(),
      nodeId: request.nodeId,
      nodeTitle: request.kind,
      modelId,
      status: 'error',
      createdAt: new Date().toISOString(),
      error: message,
    })
    throw surfacedError
  }
}

function registerIpc(): void {
  registerSemanticAssetSaveIpc(ipcMain, {
    currentProject: () => currentProject ? { projectId: currentProject.id, rootPath: currentProject.rootPath, workflowPath: workflowPath(), assetsPath: assetsIndexPath(), projectDocumentPath: currentProjectDocumentPath || defaultProjectDocumentPath(currentProject.rootPath) } : null,
    runWithDocumentOwner: (context, action) => projectCommands.runForOwner(JSON.stringify([context.projectId, resolve(context.rootPath), resolve(context.projectDocumentPath!)]), currentProjectOwner,
      () => { projectProfileRecovery.assertReady(); return projectJsonMutations.run(resolve(context.projectDocumentPath!), action) }),
  })
  ipcMain.handle('services:list', () => projectCommands.readWhenIdleForOwner(currentProjectOwner(), currentProjectOwner, () => {
    activateProviderRequestProject()
    return Promise.all(SERVICE_PROVIDERS.map(async (id): Promise<ServiceConnection> => ({ id, connected: await runtimeServiceFailures.readWhenIdle(id, () => withProviderRequest(id, () => serviceConnected(id))) })))
  }))
  ipcMain.handle('services:save', async (_event, provider: unknown, raw: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    await saveServiceCredential(provider as ServiceProvider, raw)
  })
  ipcMain.handle('services:remove', async (_event, provider: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    await removeServiceCredential(provider as ServiceProvider)
  })
  ipcMain.handle('services:higgsfield-presets', (_event, refresh?: boolean) => {
    if (refresh !== undefined && typeof refresh !== 'boolean') throw new Error('Invalid Higgsfield preset refresh request.')
    return withProviderRequest('higgsfield', () => readCurrentHiggsfieldPresets(refresh))
  })
  ipcMain.handle('services:model-snapshot', async (_event, provider: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    if (provider !== 'fal') return undefined
    return withProviderRequest('fal', async () => {
      if (!await serviceConnected('fal')) return undefined
      const snapshot = await readFalCatalogSnapshot(join(app.getPath('userData'), 'fal-public-model-catalog.json'))
      runtimeServiceFailures.assertCurrent('fal')
      return snapshot
    })
  })
  const voiceRecents = new VoiceRecentStore(join(dataRoot(), 'voice-browser-recents'))
  const voiceProvider = (value: unknown): VoiceBrowserProvider => {
    if (value !== 'elevenlabs' && value !== 'fal') throw new Error('Unsupported voice service.')
    return value
  }
  const voiceReadContext = async (provider: VoiceBrowserProvider) => {
    const key = await loadServiceCredential(provider)
    const assertCurrent = () => runtimeServiceFailures.assertCurrent(provider)
    assertCurrent()
    return { options: { fetch: falElectronFetch, key: provider === 'elevenlabs' ? key : '', assertSubmission: assertCurrent }, assertCurrent,
      historyPath: voiceRecents.path(currentProjectOwner(), provider, key) }
  }
  ipcMain.handle('services:browse-voices', (_event, input: unknown, query: unknown) => {
    const provider = voiceProvider(input), q = validateVoiceQuery(query)
    return withProviderRequest(provider, async () => {
      const ctx = await voiceReadContext(provider)
      if (q.tab === 'recent') return { voices: filterBrowserVoices(await voiceRecents.read(ctx.historyPath),q), hasMore:false }
      if (provider === 'fal' && q.tab === 'mine') return { voices: filterBrowserVoices(await readFalBrowserVoices(ctx.options),q), hasMore:false }
      return browseElevenVoices(ctx.options,q)
    })
  })
  ipcMain.handle('services:voice-facets', (_event, input: unknown) => {
    const provider = voiceProvider(input)
    return withProviderRequest(provider, async () => readVoiceFacets((await voiceReadContext(provider)).options,provider === 'elevenlabs'))
  })
  ipcMain.handle('services:add-shared-voice', (_event, input: unknown) => withProviderRequest('elevenlabs',async () => {
    const ctx = await voiceReadContext('elevenlabs')
    return addElevenSharedVoice(ctx.options,input)
  }))
  ipcMain.handle('services:remove-voice', (_event, id: unknown) => withProviderRequest('elevenlabs',async () => {
    const ctx = await voiceReadContext('elevenlabs')
    return removeElevenVoice(ctx.options,id)
  }))
  ipcMain.handle('services:select-voice', (_event, input: unknown, selected: unknown) => {
    const provider = voiceProvider(input), id = voicePathId(selected)
    return withProviderRequest(provider,async () => {
      const ctx = await voiceReadContext(provider)
      const voice = provider === 'elevenlabs' ? await getElevenBrowserVoice(ctx.options,id) : (await readFalBrowserVoices(ctx.options)).find(v => v.id === id)
      if (!voice) throw new Error('This voice is unavailable for the selected service.')
      ctx.assertCurrent()
      await voiceRecents.remember(ctx.historyPath,voice,ctx.assertCurrent)
      return voice
    })
  })
  ipcMain.handle('services:models', async (_event, provider: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    return withProviderRequest(provider as ServiceProvider, () => listServiceModels(provider as ServiceProvider))
  })
  ipcMain.handle('services:fal-schema', async (_event, endpointId: unknown) => {
    const id = falEndpointId(endpointId)
    return withProviderRequest('fal', () => readOwnedFalSchema(id))
  })
  ipcMain.handle('services:higgsfield-schema', (_event, endpointId: unknown) => withProviderRequest('higgsfield', () => readHiggsfieldInputContract(endpointId, {
    assertCurrent: () => runtimeServiceFailures.assertCurrent('higgsfield'),
    readContract: (id, assertCurrent) => higgsfieldPublicCatalog.readContract(id, assertCurrent),
  })))
  ipcMain.handle('services:account', async (_event, provider: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    return withProviderRequest(provider as ServiceProvider, () => serviceAccountStatus(provider as ServiceProvider))
  })
  ipcMain.handle('services:profiles', async (_event, provider: unknown, refresh: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    if (refresh !== undefined && typeof refresh !== 'boolean') throw new Error('Invalid profile refresh request.')
    if (refresh === true) {
      const registry = await serviceProfileStore().listProfiles(provider as ServiceProvider, false)
      if (!registry.profiles.some((profile) => profile.provider === provider) && !registry.profileManagedProviders?.includes(provider as ServiceProvider)) {
        return runtimeServiceFailures.change(provider as ServiceProvider, () => serviceProfileStore().listProfiles(provider as ServiceProvider, true))
      }
    }
    return serviceProfileStore().listProfiles(provider as ServiceProvider, refresh === true)
  })
  ipcMain.handle('services:add-profile', async (_event, provider: unknown, raw: unknown, expectedProfileId: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    if (typeof raw !== 'string') throw new Error('Invalid API key.')
    if (expectedProfileId !== undefined && typeof expectedProfileId !== 'string') throw new Error('Invalid signed-out account.')
    return runtimeServiceFailures.change(provider as ServiceProvider, () => serviceProfileStore().addProfile(provider as ServiceProvider, raw, expectedProfileId as string | undefined))
  })
  ipcMain.handle('services:transition-profile', async (_event, profileId: unknown, transition: unknown) => {
    if (typeof profileId !== 'string' || !['disconnect', 'reconnect', 'sign-out', 'delete'].includes(String(transition))) throw new Error('Invalid account action.')
    const registry = await serviceProfileStore().listProfiles('fal', false)
    const profile = registry.profiles.find((item) => item.id === profileId)
    if (!profile) throw new Error('That account profile no longer exists.')
    return runtimeServiceFailures.change(profile.provider, () => serviceProfileStore().transitionProfile(profileId, transition as 'disconnect' | 'reconnect' | 'sign-out' | 'delete'))
  })
  ipcMain.handle('services:set-default-profile', async (_event, provider: unknown, profileId: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider) || (profileId !== undefined && typeof profileId !== 'string')) throw new Error('Invalid default account selection.')
    return runtimeServiceFailures.change(provider as ServiceProvider, () => serviceProfileStore().setDefault(provider as ServiceProvider, profileId as string | undefined))
  })
  ipcMain.handle('services:rename-profile', async (_event, profileId: unknown, displayName: unknown) => {
    if (typeof profileId !== 'string' || typeof displayName !== 'string') throw new Error('Invalid account profile name.')
    return serviceProfileStore().renameProfile(profileId, displayName)
  })
  ipcMain.handle('services:select-project-profile', async (_event, provider: unknown, profileId: unknown) => {
    if (typeof provider !== 'string' || !SERVICE_PROVIDERS.includes(provider as ServiceProvider)) throw new Error('Unknown AI service.')
    if (profileId !== undefined && typeof profileId !== 'string') throw new Error('Invalid project account selection.')
    return selectCurrentProjectServiceProfile(provider as ServiceProvider, profileId as string | undefined)
  })
  ipcMain.handle('assistant:connection',async(_event,provider:unknown)=>{
    if(!isAssistantProvider(provider))throw new Error('Choose a supported assistant service.')
    return withProviderRequest(provider,async()=>promptRewriteRouter().view(await promptRequestOwner(provider)))
  })
  ipcMain.handle('assistant:configure',async(_event,provider:unknown,mode:unknown,signIn:unknown)=>{
    if(!isAssistantProvider(provider)||!['api','subscription'].includes(String(mode))||typeof signIn!=='boolean')throw new Error('Invalid Revamp connection choice.')
    return withProviderRequest(provider,async()=>promptRewriteRouter().configure(await promptRequestOwner(provider),mode as PromptBillingMode,signIn))
  })
  ipcMain.handle('assistant:cancel',async(_event,requestId:unknown)=>{
    if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('Invalid Revamp request identifier.')
    return promptRewriteRouter().cancel(requestId)
  })
  ipcMain.handle('assistant:rewrite',async(_event,provider:unknown,text:unknown,instruction?:unknown,model?:unknown,options?:PromptRewriteOptions)=>{
    if(!isAssistantProvider(provider))throw new Error('Choose a supported assistant service.')
    return withProviderRequest(provider,async()=>{
      const owner=await promptRequestOwner(provider)
      if(!options){const view=await promptRewriteRouter().view(owner);if(view.mode!=='api')throw new Error('Refresh the subscription connection before revamping.');options={requestId:randomUUID(),connectionLease:view.lease}}
      return promptRewriteRouter().rewrite(owner,text,instruction,model,options,(_prompt,selected,signal,assertCurrent)=>rewriteWithAssistant(provider,text,instruction,selected,signal,assertCurrent))
    })
  })
  ipcMain.handle('credentials:status', async () => {
    try {
      await stat(credentialPath())
      return true
    } catch {
      return false
    }
  })
  ipcMain.handle('credentials:save', async (_event, raw: unknown) => {
    const key = typeof raw === 'string' ? raw.trim() : ''
    if (key.length < 20) throw new Error('That API key does not look complete.')
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable.')
    await ensureDataFolders()
    await writeFile(credentialPath(), safeStorage.encryptString(key), { flag: 'w', mode: 0o600 })
  })
  ipcMain.handle('credentials:remove', async () => {
    try {
      await unlink(credentialPath())
    } catch {
      // Already absent.
    }
  })
  ipcMain.handle('credentials:fish-status', async () => {
    try {
      await stat(fishCredentialPath())
      return true
    } catch {
      return false
    }
  })
  ipcMain.handle('credentials:save-fish', async (_event, raw: unknown) => {
    const key = typeof raw === 'string' ? raw.trim() : ''
    if (key.length < 20) throw new Error('That Fish Audio API key does not look complete.')
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable.')
    await ensureDataFolders()
    await writeFile(fishCredentialPath(), safeStorage.encryptString(key), { flag: 'w', mode: 0o600 })
  })
  ipcMain.handle('credentials:remove-fish', async () => {
    try {
      await unlink(fishCredentialPath())
    } catch {
      // Already absent.
    }
  })
  ipcMain.handle('projects:current', () => currentProject ? { ...currentProject, documentPath: currentProjectDocumentPath || defaultProjectDocumentPath(currentProject.rootPath) } : null)
  ipcMain.handle('projects:recent', async () => {
    const recentProjects = await readJson<StoredProjectWorkspace[]>(recentProjectsPath(), [])
    const probed = await Promise.all(recentProjects.map(async (project) => {
      const manifest = await boundedPromise(readJson<ProjectWorkspace | null>(projectManifestPath(project.rootPath), null), 5_000, null)
      return manifest?.schemaVersion === 1 ? { ...manifest, rootPath: resolve(project.rootPath), documentPath: project.documentPath } : null
    }))
    return probed.filter(Boolean) as ProjectWorkspace[]
  })
  ipcMain.handle('projects:rename-document', async (_event, rawRootPath: unknown, rawName: unknown): Promise<ProjectWorkspace> => {
    return projectCommands.run(async () => {
      if (typeof rawRootPath !== 'string' || typeof rawName !== 'string') throw new Error('Invalid project document rename.')
      const rootPath = resolve(rawRootPath)
      const recent = await readStrictJsonOr<StoredProjectWorkspace[]>(recentProjectsPath(), [], 'The recent projects index')
      const item = recent.find((project) => resolve(project.rootPath) === rootPath)
      if (!item) throw new Error('This project is no longer in Prism’s project library.')
      const currentPath = item.documentPath || defaultProjectDocumentPath(rootPath)
      if (extname(currentPath).toLocaleLowerCase('en-US') !== '.prismflow') throw new Error('Only a .prismflow project document can be renamed here.')
      const name = safeFolderName(normalizeLogicalAssetName(rawName.replace(/\.prismflow$/i, '')), 'Untitled Project')
      const nextPath = join(dirname(currentPath), `${name}.prismflow`)
      return projectJsonMutations.run(resolve(currentPath), async () => {
        if (resolve(nextPath) !== resolve(currentPath)) {
          if (await pathExists(nextPath)) throw new Error(`A project document named “${name}.prismflow” already exists.`)
          await rename(currentPath, nextPath)
        }
        const updatedRecent = recent.map((project) => resolve(project.rootPath) === rootPath ? { ...project, documentPath: nextPath } : project)
        await atomicJson(recentProjectsPath(), updatedRecent)
        if (currentProject && resolve(currentProject.rootPath) === rootPath) {
          currentProjectDocumentPath = nextPath
          activateProviderRequestProject()
          await atomicJson(workspacePointerPath(), { ...currentProject, documentPath: nextPath })
        }
        return { ...item, documentPath: nextPath }
      })
    })
  })
  ipcMain.handle('projects:forget', async (_event, rawRootPath: unknown): Promise<void> => {
    return projectCommands.run(async () => {
      if (typeof rawRootPath !== 'string') throw new Error('Invalid project removal.')
      const rootPath = resolve(rawRootPath)
      await projectJsonMutations.mutateArray<StoredProjectWorkspace>(recentProjectsPath(), (recent) => recent.filter((project) => resolve(project.rootPath) !== rootPath))
      const pointer = await readJson<StoredProjectWorkspace | null>(workspacePointerPath(), null)
      if (pointer && resolve(pointer.rootPath) === rootPath) await unlink(workspacePointerPath()).catch(() => undefined)
    })
  })
  ipcMain.handle('projects:legacy-import-status', async () => {
    const matches = await legacyImportMatches()
    return { detected: matches.assetIds.size > 0 || matches.nodeIds.size > 0, assets: matches.assetIds.size, nodes: matches.nodeIds.size }
  })
  ipcMain.handle('projects:remove-legacy-import', () => removeLegacyImport())
  ipcMain.handle('projects:create', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose a working folder for the new Prism Foundry project',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Create Project Here',
    })
    if (result.canceled || !result.filePaths[0]) return null
    return projectCommands.run(async () => {
      const root = resolve(result.filePaths[0])
      if (isDocumentsPath(root)) throw new Error('Choose a working folder outside Documents.')
      const project = await scaffoldProject(root)
      await writeProjectDocument()
      return project
    })
  })
  ipcMain.handle('projects:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Open a Prism Foundry project folder',
      properties: ['openDirectory'],
      buttonLabel: 'Open Project',
    })
    if (result.canceled || !result.filePaths[0]) return null
    return projectCommands.run(async () => {
      const root = resolve(result.filePaths[0])
      if (isDocumentsPath(root)) throw new Error('Choose a project folder outside Documents.')
      await projectProfileRecovery.recover(dataRoot())
      const portableDocument = await findProjectDocument(root)
      if (portableDocument) return openProjectDocument(portableDocument)
      const manifest = await readJson<ProjectWorkspace | null>(projectManifestPath(root), null)
      if (!manifest || manifest.schemaVersion !== 1) throw new Error('That folder is not a Prism Foundry project. Use New Project to prepare it first.')
      const project = await scaffoldProject(root, manifest)
      await writeProjectDocument()
      return project
    })
  })
  ipcMain.handle('projects:open-document', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Open a Prism Foundry project',
      properties: ['openFile'],
      buttonLabel: 'Open Project',
      filters: [{ name: 'Prism Foundry Project', extensions: ['prismflow'] }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    return openProjectDocument(result.filePaths[0])
  })
  ipcMain.handle('projects:open-recent', async (_event, rootPath: string) => {
    return projectCommands.run(async () => {
      const root = resolve(rootPath)
      if (isDocumentsPath(root)) throw new Error('Projects inside Documents are not supported.')
      await projectProfileRecovery.recover(dataRoot())
      const portableDocument = await findProjectDocument(root)
      if (portableDocument) return openProjectDocument(portableDocument)
      const manifest = await readStrictJsonOr<ProjectWorkspace | null>(projectManifestPath(root), null, 'The project manifest')
      if (!manifest || manifest.schemaVersion !== 1) throw new Error('This project is missing. Import its folder to relink it.')
      const project = await scaffoldProject(root, manifest)
      await writeProjectDocument()
      return project
    })
  })
  ipcMain.handle('projects:close', async () => {
    return projectCommands.run(async () => {
      generationLifecycle.activate(null)
      currentProject = null
      currentProjectDocumentPath = null
      activateProviderRequestProject()
      try { await unlink(workspacePointerPath()) } catch { /* Already disconnected. */ }
    })
  })
  ipcMain.handle('workflows:load', (_event, owner: WorkflowSaveOwner) => loadOwnedWorkflow(owner, {
    currentOwner: () => currentProject && currentProjectDocumentPath ? { projectId: currentProject.id, rootPath: currentProject.rootPath, documentPath: currentProjectDocumentPath } : null,
    runForOwner: (key, action) => projectCommands.runForOwner(key, currentProjectOwner, action),
    load: loadWorkflowDocument,
  }))
  ipcMain.handle('workflows:save', (_event, document: WorkflowDocument, owner: WorkflowSaveOwner) => saveOwnedWorkflow(document, owner, {
    currentOwner: () => currentProject && currentProjectDocumentPath ? { projectId: currentProject.id, rootPath: currentProject.rootPath, documentPath: currentProjectDocumentPath } : null,
    runForOwner: (key, action) => projectCommands.runForOwner(key, currentProjectOwner, action),
    saveCanonical: saved => atomicJson(workflowPath(), saved),
    savePortable: writeProjectDocument,
  }))

  ipcMain.handle('assets:list', async () => {
    await normalizeManagedOrdinaryMediaAssets()
    const stores = await managedAssetStores()
    const indexed = [...stores.project, ...stores.styles]
    const workflowAssets = await loadWorkflowMediaAssets(indexed)
    return [...stores.styles, ...stores.project.filter((asset) => asset.category !== 'style'), ...workflowAssets].map((asset) => ({ ...asset, url: localAssetUrl(asset.path) }))
  })
  ipcMain.handle('assets:import', async (_event, kind?: NodeKind, collectionName?: string) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import media into Prism Foundry',
      properties: ['openFile'],
      filters: [{ name: 'Images, video, and audio', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'aac'] }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    return importMediaPath(result.filePaths[0], kind, collectionName)
  })
  ipcMain.handle('assets:inspect-batch', async (_event, rawPaths: unknown, rawKind: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!Array.isArray(rawPaths) || !['character', 'element', 'location', 'wardrobe'].includes(String(rawKind))) return []
    const paths = rawPaths.filter((path): path is string => typeof path === 'string' && Boolean(path.trim())).map((path) => resolve(path))
    return inspectAssetBatchFiles(paths)
  })
  ipcMain.handle('assets:choose-batch', async (_event, rawKind: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!['character', 'element', 'location', 'wardrobe'].includes(String(rawKind))) return []
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: `Choose ${String(rawKind)} sheets for Batch`,
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'avif', 'bmp', 'tif', 'tiff'] }],
    })
    if (result.canceled) return []
    return inspectAssetBatchFiles(result.filePaths)
  })
  ipcMain.handle('assets:import-paths', async (_event, rawPaths: unknown, kind?: NodeKind, collectionName?: string) => {
    if (!Array.isArray(rawPaths)) throw new Error('No dropped files were received.')
    const imported: ImportedAsset[] = []
    for (const rawPath of rawPaths) {
      if (typeof rawPath !== 'string' || !rawPath.trim()) continue
      const source = resolve(rawPath)
      if (extname(source).toLowerCase() === '.prismasset') imported.push(...await importPrismAssetSource(source))
      else imported.push(await importMediaPath(source, kind, collectionName))
    }
    return imported
  })
  ipcMain.handle('assets:import-buffer', async (_event, rawBytes: unknown, rawMimeType: unknown, rawName: unknown, metadata?: ImportedAsset['metadata']) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!(rawBytes instanceof Uint8Array) && !(rawBytes instanceof ArrayBuffer)) throw new Error('No media buffer was received.')
    const mimeType = typeof rawMimeType === 'string' ? rawMimeType : ''
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) throw new Error('Sequence frames must be PNG, JPEG, or WebP images.')
    const sourceMetadata = preserveBytePlusPortraitMetadata(metadata, undefined)
    const bytes = Buffer.from(rawBytes instanceof ArrayBuffer ? new Uint8Array(rawBytes) : rawBytes)
    if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error('Sequence frame data is empty or too large.')
    const extension = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/webp' ? '.webp' : '.png'
    const stem = (typeof rawName === 'string' ? rawName : 'sequence-final-frame').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().slice(0, 80) || 'sequence-final-frame'
    const target = join(categoryFolder('image', true), `${Date.now()}-${randomUUID().slice(0, 8)}-${stem}${extension}`)
    await writeFile(target, bytes, { flag: 'wx' })
    return registerGeneratedAsset(target, sourceMetadata)
  })
  ipcMain.handle('assets:mark-canvas-copy', () => {
    clipboard.writeBuffer(CANVAS_CLIPBOARD_FORMAT, Buffer.from('prism-foundry-canvas-nodes-v1'))
  })
  ipcMain.handle('assets:paste-images', async () => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    const formats = clipboard.availableFormats()
    if (formats.includes(CANVAS_CLIPBOARD_FORMAT)) return []

    const filePaths = clipboardImageFilePaths()
    if (filePaths.length) {
      const imported: ImportedAsset[] = []
      for (const path of filePaths) imported.push(await importMediaPath(path))
      return imported
    }

    const image = clipboard.readImage()
    if (image.isEmpty()) return null
    // PNG is intentional for clipboard bitmap fallback: Electron's native PNG
    // encoder preserves source alpha and never paints a white or black matte.
    const bytes = image.toPNG()
    if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error('The clipboard image is empty or too large.')
    const folder = categoryFolder('image', false)
    await mkdir(folder, { recursive: true })
    const target = join(folder, `${Date.now()}-${randomUUID().slice(0, 8)}-clipboard-image.png`)
    await writeFile(target, bytes, { flag: 'wx' })
    const asset = await registerAsset({
      id: randomUUID(),
      name: basename(target),
      path: target,
      mimeType: 'image/png',
      category: 'image',
      origin: 'imported',
      fileSize: bytes.length,
      createdAt: new Date().toISOString(),
    })
    return [asset]
  })
  ipcMain.handle('assets:read-character-image', async (_event, id: unknown) => {
    if (!currentProject || typeof id !== 'string') throw new Error('Character library: invalid source image request.')
    const managed = await managedAssetById(id)
    if (!managed || !managed.asset.mimeType.startsWith('image/')) throw new Error('Character library: source image is not a managed image asset.')
    const source = await assertManagedAssetPath(managed.asset)
    const bytes = await readFile(source)
    if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error(`Character library: ${managed.asset.name} is empty or too large to compile.`)
    return { bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), mimeType: managed.asset.mimeType }
  })
  ipcMain.handle('assets:validate-character-image', async (_event, id: unknown, rawMode: unknown) => {
    if (!currentProject || typeof id !== 'string' || !['multi', 'single'].includes(String(rawMode))) {
      throw new Error('Character image validation: invalid request.')
    }
    const managed = await managedAssetById(id)
    if (!managed || !managed.asset.mimeType.startsWith('image/')) throw new Error('Character image validation: source is not a managed image asset.')
    const source = await assertManagedAssetPath(managed.asset)
    return validateCharacterImageFile(source, rawMode as CharacterInputMode)
  })
  ipcMain.handle('assets:save-character-sheet', async (_event, rawBytes: unknown, rawName: unknown, rawPreviousPath?: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!(rawBytes instanceof Uint8Array) && !(rawBytes instanceof ArrayBuffer)) throw new Error('Character library: no compiled reference-sheet data was received.')
    if (typeof rawName !== 'string' || !rawName.trim()) throw new Error('Character library: enter a Character name before saving.')
    const bytes = Buffer.from(rawBytes instanceof ArrayBuffer ? new Uint8Array(rawBytes) : rawBytes)
    if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error('Character library: the compiled reference sheet is empty or too large.')
    const internalFolder = join(projectFolder('Characters', safeFolderName(rawName, 'Character')), '.prism-internal')
    await mkdir(internalFolder, { recursive: true })
    const target = join(internalFolder, 'character-reference-sheet.jpg')
    await writeFile(target, bytes)
    if (typeof rawPreviousPath === 'string' && rawPreviousPath && resolve(rawPreviousPath) !== resolve(target)) {
      const previous = resolve(rawPreviousPath)
      if (basename(previous) === 'character-reference-sheet.jpg' && basename(dirname(previous)) === '.prism-internal') {
        const guarded = assertInsideProject(previous)
        try { await unlink(guarded) } catch { /* The previous hidden derivative is already absent. */ }
      }
    }
    return { path: target, url: localAssetUrl(target) }
  })
  ipcMain.handle('assets:commit-character-collection', async (_event, rawRequest: unknown): Promise<CharacterCollectionCommitResult> => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!rawRequest || typeof rawRequest !== 'object') throw new Error('Character library: invalid collection commit.')
    const request = rawRequest as CharacterCollectionCommitRequest
    const name = normalizeLogicalAssetName(request.name)
    const previousName = normalizeLogicalAssetName(request.previousName || '')
    if (!name || !['multi', 'single'].includes(request.mode) || !Array.isArray(request.active) || !request.active.length || typeof request.retiredAt !== 'string' || (request.intent?.mode !== 'create-new' && request.intent?.mode !== 'replace-existing')) {
      throw new Error('Character library: invalid collection commit.')
    }
    if (request.active.some((item) => !item || typeof item.id !== 'string' || !item.metadata || typeof item.metadata !== 'object')) {
      throw new Error('Character library: invalid active Character views.')
    }
    return assetJsonMutations.run(assetsIndexPath(), async () => {
    const originalAssets = await loadProjectAssets()
    const activeIds = new Set(request.active.map((item) => item.id))
    const collectionAssets = characterCollectionMembersForIntent(
      originalAssets.filter((asset) => asset.category === 'character'),
      activeIds,
      name,
      previousName,
      request.intent,
    )
    if (request.active.some((item) => !collectionAssets.some((asset) => asset.id === item.id))) {
      throw new Error('Character library: an active view is not a managed Character asset.')
    }

    let sheet: CharacterCollectionCommitResult['sheet']
    let sheetTarget: string | undefined
    let sheetTemp: string | undefined
    let originalSheet: Buffer | undefined
    let targetExisted = false
    if (request.mode === 'multi') {
      const rawSheet = request.sheet
      if (!rawSheet || (!(rawSheet.bytes instanceof Uint8Array) && !(rawSheet.bytes instanceof ArrayBuffer)) || !Array.isArray(rawSheet.views)) {
        throw new Error('Character library: the Multi reference sheet is missing.')
      }
      const bytes = Buffer.from(rawSheet.bytes instanceof ArrayBuffer ? new Uint8Array(rawSheet.bytes) : rawSheet.bytes)
      if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error('Character library: the compiled reference sheet is empty or too large.')
      const defaultCollectionName = safeFolderName(name, 'Character')
      const occupiedCollectionNames = new Set(originalAssets.filter((asset) => asset.category === 'character' && !activeIds.has(asset.id)).map((asset) => basename(dirname(asset.path))))
      const editTargetAssetId = request.intent.mode === 'replace-existing' ? request.intent.targetAssetId : undefined
      const editTarget = editTargetAssetId ? originalAssets.find((asset) => asset.id === editTargetAssetId) : undefined
      const physicalCollectionName = editTarget ? basename(dirname(editTarget.path)) : collisionSafeCollectionName(defaultCollectionName, occupiedCollectionNames)
      const internalFolder = join(projectFolder('Characters', physicalCollectionName), '.prism-internal')
      await mkdir(internalFolder, { recursive: true })
      sheetTarget = join(internalFolder, 'character-reference-sheet.jpg')
      targetExisted = await pathExists(sheetTarget)
      if (targetExisted) originalSheet = await readFile(sheetTarget)
      sheetTemp = `${sheetTarget}.${randomUUID()}.tmp`
      await writeFile(sheetTemp, bytes)
      sheet = { path: sheetTarget, url: localAssetUrl(sheetTarget), views: rawSheet.views }
    }

      try {
        if (sheetTemp && sheetTarget) await rename(sheetTemp, sheetTarget)
        const plannedCollection = planCharacterCollectionCommit(collectionAssets, {
          mode: request.mode,
          active: request.active,
          sheet,
          retiredAt: request.retiredAt,
        })
        const plannedById = new Map(plannedCollection.map((asset) => [asset.id, asset]))
        const nextAssets = originalAssets.map((asset) => plannedById.get(asset.id) || asset)
        await atomicJson(assetsIndexPath(), nextAssets)
        await writeProjectDocument()
        const previousPath = request.sheet?.previousPath
        if (request.intent.mode === 'replace-existing' && sheetTarget && typeof previousPath === 'string' && previousPath && resolve(previousPath) !== resolve(sheetTarget)) {
          const previous = assertInsideProject(previousPath)
          if (basename(previous) === 'character-reference-sheet.jpg' && basename(dirname(previous)) === '.prism-internal') await unlink(previous).catch(() => undefined)
        }
        return {
          assets: plannedCollection.filter((asset) => activeIds.has(asset.id)).map((asset) => ({ ...asset, url: localAssetUrl(asset.path) })),
          sheet,
        }
      } catch (error) {
        await atomicJson(assetsIndexPath(), originalAssets).catch(() => undefined)
        if (sheetTarget) {
          if (targetExisted && originalSheet) await writeFile(sheetTarget, originalSheet).catch(() => undefined)
          else await unlink(sheetTarget).catch(() => undefined)
        }
        if (sheetTemp) await unlink(sheetTemp).catch(() => undefined)
        await writeProjectDocument().catch(() => undefined)
        throw error
      }
    })
  })
  const renameManagedAsset = async (id: string, rawName: string) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    const managed = await managedAssetById(id)
    if (!managed) throw new Error('Asset not found.')
    const requestedStem = mediaRenameStem(rawName).replace(/[/:\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100).toLocaleLowerCase('en-US')
    if (!requestedStem) throw new Error('Enter an asset name.')
    const source = await assertManagedAssetPath(managed.asset)
    const extension = extname(source).toLocaleLowerCase('en-US')
    let destination = join(dirname(source), `${requestedStem}${extension}`)
    let suffix = 2
    while (destination.toLocaleLowerCase('en-US') !== source.toLocaleLowerCase('en-US') && await pathExists(destination)) destination = join(dirname(source), `${requestedStem}-${suffix++}${extension}`)
    const renamedAsset: ImportedAsset = { ...managed.asset, name: basename(destination), path: destination, url: localAssetUrl(destination) }
    const updatedAssets = managed.assets.map((candidate) => candidate.id === id ? renamedAsset : candidate)
    const originalWorkflow = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
    const originalHistory = await readStrictJsonOr<HistoryEntry[]>(historyPath(), [], 'The generation history')
    const mapping = new Map([[source, destination]])
    let moved = false
    try {
      if (destination !== source) {
        await renameManagedFileCaseSafely(source, destination)
        moved = true
      }
      await atomicJson(managed.indexPath, updatedAssets)
      if (originalWorkflow) await atomicJson(workflowPath(), rewritePaths(originalWorkflow, mapping))
      await atomicJson(historyPath(), rewritePaths(originalHistory, mapping))
      await writeProjectDocument()
    } catch (error) {
      await atomicJson(managed.indexPath, managed.assets).catch(() => undefined)
      if (originalWorkflow) await atomicJson(workflowPath(), originalWorkflow).catch(() => undefined)
      await atomicJson(historyPath(), originalHistory).catch(() => undefined)
      if (moved) await renameManagedFileCaseSafely(destination, source).catch(() => undefined)
      await writeProjectDocument().catch(() => undefined)
      throw error
    }
    return renamedAsset
  }
  ipcMain.handle('assets:rename', async (_event, id: unknown, rawName: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (typeof id !== 'string' || typeof rawName !== 'string') throw new Error('Invalid asset rename request.')
    const managed = await managedAssetById(id)
    if (!managed) throw new Error('Asset not found.')
    return assetJsonMutations.run(managed.indexPath, () => renameManagedAsset(id, rawName))
  })
  ipcMain.handle('assets:update-metadata', async (_event, id: unknown, metadata: ImportedAsset['metadata']) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (typeof id !== 'string' || !metadata || typeof metadata !== 'object') throw new Error('Invalid asset details.')
    const managed = await managedAssetById(id)
    if (!managed) throw new Error('Asset not found.')
    let updated: ImportedAsset | undefined
    await assetJsonMutations.mutateArray<ImportedAsset>(managed.indexPath, (assets) => {
      const asset = assets.find((candidate) => candidate.id === id)
      if (!asset) throw new Error('Asset not found.')
      updated = { ...asset, metadata: preserveBytePlusPortraitMetadata(metadata, asset.metadata) }
      return assets.map((candidate) => candidate.id === id ? updated! : candidate)
    })
    if (!updated) throw new Error('Asset not found.')
    if (updated.category !== 'style') await writeProjectDocument()
    return { ...updated, url: localAssetUrl(updated.path) }
  })
  ipcMain.handle('assets:byteplus-portrait-context', async (_event, id: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (typeof id !== 'string' || !id || id.length > 200) throw new Error('Invalid asset ID.')
    const requestedOwner = currentProjectOwner()
    return projectCommands.runForOwner(requestedOwner, currentProjectOwner, async () => {
      const managed = await managedAssetById(id)
      if (!managed || managed.asset.trashedAt) throw new Error('Asset not found or in Trash.')
      const registry = await serviceProfileStore().listProfiles('byteplus', false)
      const selection = projectServiceProfileSelection(registry, currentProject, 'byteplus')
      return { assetId: id, mediaType: portraitMediaType(managed.asset.mimeType), available: selection.available, profile: selection.profile, binding: managed.asset.metadata?.byteplusPortrait }
    })
  })
  ipcMain.handle('assets:link-byteplus-portrait', async (_event, raw: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !['assetId', 'profileId', 'consoleAssetId', 'consoleActiveConfirmed', 'expiresAt'].includes(key))) throw new Error('Invalid trusted asset link.')
    const request = raw as BytePlusPortraitLinkRequest
    if (typeof request.assetId !== 'string' || !request.assetId || request.assetId.length > 200 || typeof request.profileId !== 'string' || !request.profileId || request.profileId.length > 200) throw new Error('Invalid trusted asset owner.')
    const requestedOwner = currentProjectOwner()
    return projectCommands.runForOwner(requestedOwner, currentProjectOwner, async () => {
      const managed = await managedAssetById(request.assetId)
      if (!managed || managed.asset.trashedAt) throw new Error('Asset not found or in Trash.')
      const registry = await serviceProfileStore().listProfiles('byteplus', false)
      const selection = projectServiceProfileSelection(registry, currentProject, 'byteplus')
      if (!selection.available || !selection.profile || selection.profile.id !== request.profileId) throw new Error('The selected BytePlus account changed or is disconnected. Review the account before linking.')
      const sourcePath = await assertManagedAssetPath(managed.asset), bytes = await readFile(sourcePath)
      const latestRegistry = await serviceProfileStore().listProfiles('byteplus', false)
      const latestSelection = projectServiceProfileSelection(latestRegistry, currentProject, 'byteplus')
      if (!latestSelection.available || latestSelection.profile?.id !== selection.profile.id || latestSelection.profile.accountIdentifier !== selection.profile.accountIdentifier) throw new Error('The selected BytePlus account changed while the source was read. Review the account before linking.')
      const binding = linkBytePlusPortrait(request, selection.profile, managed.asset.mimeType, bytes)
      return commitBytePlusPortraitMetadata(managed, asset => ({ ...asset, metadata: { ...asset.metadata, byteplusPortrait: binding } }))
    })
  })
  ipcMain.handle('assets:revoke-byteplus-portrait', async (_event, id: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (typeof id !== 'string' || !id || id.length > 200) throw new Error('Invalid asset ID.')
    const requestedOwner = currentProjectOwner()
    return projectCommands.runForOwner(requestedOwner, currentProjectOwner, async () => {
      const managed = await managedAssetById(id)
      if (!managed) throw new Error('Asset not found.')
      return commitBytePlusPortraitMetadata(managed, asset => {
        if (!asset.metadata?.byteplusPortrait) throw new Error('This asset has no local BytePlus link.')
        return { ...asset, metadata: { ...asset.metadata, byteplusPortrait: revokeBytePlusPortrait(asset.metadata.byteplusPortrait) } }
      })
    })
  })
  ipcMain.handle('assets:update-state', async (_event, id: unknown, patch: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (typeof id !== 'string' || !patch || typeof patch !== 'object') throw new Error('Invalid asset state.')
    const managed = await managedAssetById(id)
    if (!managed) throw new Error('Asset not found.')
    const requested = patch as { favorite?: unknown; trashedAt?: unknown }
    let updated: ImportedAsset | undefined
    await assetJsonMutations.mutateArray<ImportedAsset>(managed.indexPath, (assets) => {
      const asset = assets.find((candidate) => candidate.id === id)
      if (!asset) throw new Error('Asset not found.')
      updated = {
        ...asset,
        ...(typeof requested.favorite === 'boolean' ? { favorite: requested.favorite } : {}),
        ...(requested.trashedAt === null ? { trashedAt: undefined } : typeof requested.trashedAt === 'string' ? { trashedAt: requested.trashedAt } : {}),
      }
      return assets.map((candidate) => candidate.id === id ? updated! : candidate)
    })
    if (!updated) throw new Error('Asset not found.')
    if (updated.category !== 'style') await writeProjectDocument()
    return { ...updated, url: localAssetUrl(updated.path) }
  })
  ipcMain.handle('assets:update-collection', async (_event, rawIds: unknown, rawPatch: unknown): Promise<ImportedAsset[]> => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!Array.isArray(rawIds) || !rawIds.length || rawIds.some((id) => typeof id !== 'string') || !rawPatch || typeof rawPatch !== 'object') {
      throw new Error('Invalid reusable asset collection update.')
    }
    const ids = new Set(rawIds as string[])
    const requested = rawPatch as { assetName?: unknown; favorite?: unknown; trashedAt?: unknown }
    const assetName = typeof requested.assetName === 'string' ? normalizeLogicalAssetName(requested.assetName) : undefined
    return assetJsonMutations.run(assetsIndexPath(), () => assetJsonMutations.run(globalStylesIndexPath(), () => projectJsonMutations.run(workflowPath(), () => historyJsonMutations.run(historyPath(), async () => {
      const originalAssets = await loadProjectAssets()
      const originalStyles = await readJson<ImportedAsset[]>(globalStylesIndexPath(), [])
      const originalWorkflow = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
      const originalHistory = await readStrictJsonOr<HistoryEntry[]>(historyPath(), [], 'The generation history')
      const selectedProject = originalAssets.filter((asset) => ids.has(asset.id))
      const selectedStyles = originalStyles.filter((asset) => ids.has(asset.id))
      const selected = selectedProject.length ? selectedProject : selectedStyles
      if (selectedProject.length && selectedStyles.length || selected.length !== ids.size || selected.some((asset) => !['character', 'element', 'location', 'style'].includes(asset.category || ''))) {
        throw new Error('Reusable asset collection is incomplete or invalid.')
      }
      const physicallyRenamed = assetName ? await renameImportedAssetCollectionFiles(selected, assetName) : selected
      const renamedById = new Map(physicallyRenamed.map((asset) => [asset.id, asset]))
      const update = (source: ImportedAsset[]) => source.map((asset) => {
        if (!ids.has(asset.id)) return asset
        return {
          ...(renamedById.get(asset.id) || asset),
          ...(typeof requested.favorite === 'boolean' ? { favorite: requested.favorite } : {}),
          ...(requested.trashedAt === null ? { trashedAt: undefined } : typeof requested.trashedAt === 'string' ? { trashedAt: requested.trashedAt } : {}),
          ...(assetName ? { metadata: { ...asset.metadata, assetName } } : {}),
        }
      })
      const updatedAssets = update(originalAssets)
      const updatedStyles = update(originalStyles)
      const pathMapping = new Map(selected.map((asset) => [asset.path, renamedById.get(asset.id)?.path || asset.path]))
      const updatedWorkflow = originalWorkflow ? rewritePaths(originalWorkflow, pathMapping) : null
      const updatedHistory = rewritePaths(originalHistory, pathMapping)
      try {
        await atomicJson(assetsIndexPath(), updatedAssets)
        await atomicJson(globalStylesIndexPath(), updatedStyles)
        if (updatedWorkflow) await atomicJson(workflowPath(), updatedWorkflow)
        await atomicJson(historyPath(), updatedHistory)
        await writeProjectDocument()
      } catch (error) {
        if (assetName) await restoreImportedAssetCollectionFiles(physicallyRenamed, selected).catch(() => undefined)
        await atomicJson(assetsIndexPath(), originalAssets).catch(() => undefined)
        await atomicJson(globalStylesIndexPath(), originalStyles).catch(() => undefined)
        if (originalWorkflow) await atomicJson(workflowPath(), originalWorkflow).catch(() => undefined)
        await atomicJson(historyPath(), originalHistory).catch(() => undefined)
        await writeProjectDocument().catch(() => undefined)
        throw error
      }
      return [...updatedAssets, ...updatedStyles].filter((asset) => ids.has(asset.id)).map((asset) => ({ ...asset, url: localAssetUrl(asset.path) }))
    }))))
  })
  ipcMain.handle('assets:trash-collection', async (_event, rawIds: unknown, rawWorkflow: unknown): Promise<ImportedAsset[]> => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    const projectRoot = currentProject.rootPath
    if (!Array.isArray(rawIds) || !rawIds.length || rawIds.some((id) => typeof id !== 'string') || !rawWorkflow || typeof rawWorkflow !== 'object') throw new Error('Invalid recoverable asset deletion.')
    const ids = new Set(rawIds as string[])
    const nextWorkflow = rawWorkflow as WorkflowDocument
    return assetJsonMutations.run(assetsIndexPath(), () => assetJsonMutations.run(globalStylesIndexPath(), () => projectJsonMutations.run(workflowPath(), async () => {
      const originalProjectAssets = await loadProjectAssets()
      const originalStyles = await readJson<ImportedAsset[]>(globalStylesIndexPath(), [])
      const originalWorkflow = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
      const orphanWorkflowAssets = workflowMediaAssets(originalWorkflow, [...originalProjectAssets, ...originalStyles], mimeFor)
      const selected = [...originalProjectAssets, ...originalStyles, ...orphanWorkflowAssets].filter((asset) => ids.has(asset.id))
      if (selected.length !== ids.size) throw new Error('Asset collection is incomplete or invalid.')
      if (selected.some((asset) => asset.trashedAt)) throw new Error('One or more selected assets are already in Trash.')
      const transactionId = randomUUID()
      const stagingRoots = new Set<string>()
      const moved: Array<{ source: string; stagedPath: string }> = []
      try {
        const trashedAt = new Date().toISOString()
        const replacements = new Map<string, ImportedAsset>()
        for (const asset of selected) {
          const roots = asset.category === 'style' ? [globalStylesRoot()] : [projectRoot]
          const source = await assertManagedPathAllowMissingLeaf(asset.path, roots)
          const stagingRoot = asset.category === 'style' ? join(globalStylesRoot(), '.prism-trash', transactionId) : projectFolder('Canvas', '.prism-trash', transactionId)
          stagingRoots.add(stagingRoot)
          const staged = await stageRecoverableAssetFile(source, stagingRoot, `${asset.id}${extname(source).toLocaleLowerCase('en-US')}`)
          const stagedPath = staged.stagedPath
          if (staged.moved) moved.push({ source, stagedPath })
          replacements.set(asset.id, { ...asset, path: stagedPath, url: localAssetUrl(stagedPath), trashedAt, trashOriginalPath: source, trashTransactionId: transactionId })
        }
        const update = (assets: ImportedAsset[]) => assets.map((asset) => replacements.get(asset.id) || asset)
        const trashedWorkflowAssets = orphanWorkflowAssets.filter((asset) => ids.has(asset.id)).map((asset) => replacements.get(asset.id) as ImportedAsset)
        await atomicJson(assetsIndexPath(), [...update(originalProjectAssets), ...trashedWorkflowAssets])
        await atomicJson(globalStylesIndexPath(), update(originalStyles))
        await atomicJson(workflowPath(), nextWorkflow)
        await writeProjectDocument()
        return selected.map((asset) => replacements.get(asset.id) as ImportedAsset)
      } catch (error) {
        await atomicJson(assetsIndexPath(), originalProjectAssets).catch(() => undefined)
        await atomicJson(globalStylesIndexPath(), originalStyles).catch(() => undefined)
        if (originalWorkflow) await atomicJson(workflowPath(), originalWorkflow).catch(() => undefined)
        for (const item of moved.reverse()) {
          await mkdir(dirname(item.source), { recursive: true }).catch(() => undefined)
          if (await pathExists(item.stagedPath)) await rename(item.stagedPath, item.source).catch(() => undefined)
        }
        for (const stagingRoot of stagingRoots) await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined)
        await writeProjectDocument().catch(() => undefined)
        throw error
      }
    })))
  })
  ipcMain.handle('assets:restore-collection', async (_event, rawIds: unknown, rawWorkflow: unknown): Promise<ImportedAsset[]> => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    const projectRoot = currentProject.rootPath
    if (!Array.isArray(rawIds) || !rawIds.length || rawIds.some((id) => typeof id !== 'string') || !rawWorkflow || typeof rawWorkflow !== 'object') throw new Error('Invalid asset restoration.')
    const ids = new Set(rawIds as string[])
    const restoredWorkflow = rawWorkflow as WorkflowDocument
    return assetJsonMutations.run(assetsIndexPath(), () => assetJsonMutations.run(globalStylesIndexPath(), () => projectJsonMutations.run(workflowPath(), async () => {
      const originalProjectAssets = await loadProjectAssets()
      const originalStyles = await readJson<ImportedAsset[]>(globalStylesIndexPath(), [])
      const originalWorkflow = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
      const selected = [...originalProjectAssets, ...originalStyles].filter((asset) => ids.has(asset.id))
      if (selected.length !== ids.size || selected.some((asset) => !asset.trashedAt || !asset.trashOriginalPath)) throw new Error('Recoverable asset collection is incomplete or invalid.')
      const moved: Array<{ stagedPath: string; originalPath: string }> = []
      try {
        const replacements = new Map<string, ImportedAsset>()
        for (const asset of selected) {
          const roots = asset.category === 'style' ? [globalStylesRoot()] : [projectRoot]
          const stagedPath = await assertManagedPathAllowMissingLeaf(asset.path, roots)
          const originalPath = asset.trashOriginalPath as string
          try {
            if (await restoreRecoverableAssetFile(stagedPath, originalPath)) moved.push({ stagedPath, originalPath })
          } catch (error) {
            throw new Error(`Cannot restore “${asset.name}”: ${error instanceof Error ? error.message : String(error)}`)
          }
          const { trashedAt: _trashedAt, trashOriginalPath: _trashOriginalPath, trashTransactionId: _trashTransactionId, ...active } = asset
          replacements.set(asset.id, { ...active, path: originalPath, url: localAssetUrl(originalPath) })
        }
        const update = (assets: ImportedAsset[]) => assets.map((asset) => replacements.get(asset.id) || asset)
        await atomicJson(assetsIndexPath(), update(originalProjectAssets))
        await atomicJson(globalStylesIndexPath(), update(originalStyles))
        await atomicJson(workflowPath(), restoredWorkflow)
        await writeProjectDocument()
        return selected.map((asset) => replacements.get(asset.id) as ImportedAsset)
      } catch (error) {
        await atomicJson(assetsIndexPath(), originalProjectAssets).catch(() => undefined)
        await atomicJson(globalStylesIndexPath(), originalStyles).catch(() => undefined)
        if (originalWorkflow) await atomicJson(workflowPath(), originalWorkflow).catch(() => undefined)
        for (const item of moved.reverse()) {
          await mkdir(dirname(item.stagedPath), { recursive: true }).catch(() => undefined)
          if (await pathExists(item.originalPath)) await rename(item.originalPath, item.stagedPath).catch(() => undefined)
        }
        await writeProjectDocument().catch(() => undefined)
        throw error
      }
    })))
  })
  ipcMain.handle('assets:delete-collection', async (_event, rawIds: unknown, rawWorkflow: unknown): Promise<Array<{ id: string; path: string }>> => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!Array.isArray(rawIds) || !rawIds.length || rawIds.some((id) => typeof id !== 'string') || !rawWorkflow || typeof rawWorkflow !== 'object') {
      throw new Error('Invalid reusable asset collection deletion.')
    }
    const ids = new Set(rawIds as string[])
    const nextWorkflow = rawWorkflow as WorkflowDocument
    return assetJsonMutations.run(assetsIndexPath(), () => projectJsonMutations.run(workflowPath(), () => historyJsonMutations.run(historyPath(), async () => {
      const originalAssets = await loadProjectAssets()
      const originalWorkflow = await readStrictJsonOr<WorkflowDocument | null>(workflowPath(), null, 'The saved canvas')
      const originalHistory = await readStrictJsonOr<HistoryEntry[]>(historyPath(), [], 'The generation history')
      const selected = originalAssets.filter((asset) => ids.has(asset.id))
      if (selected.length !== ids.size) throw new Error('Project asset collection is incomplete or invalid.')
      const stagingRoot = projectFolder('Canvas', '.prism-delete-staging', randomUUID())
      const staged: Array<{ source: string; stagedPath: string }> = []
      try {
        await mkdir(stagingRoot, { recursive: true })
        for (const asset of selected) {
          const source = await assertManagedAssetPath(asset)
          if (!await pathExists(source)) continue
          const stagedPath = join(stagingRoot, `${asset.id}${extname(source).toLocaleLowerCase('en-US')}`)
          await rename(source, stagedPath)
          staged.push({ source, stagedPath })
        }
        await atomicJson(assetsIndexPath(), originalAssets.filter((asset) => !ids.has(asset.id)))
        await atomicJson(workflowPath(), nextWorkflow)
        const deletedPaths = new Set(selected.map((asset) => asset.path))
        await atomicJson(historyPath(), originalHistory.filter((entry) => !entry.outputPath || !deletedPaths.has(entry.outputPath)))
        await writeProjectDocument()
        await shell.trashItem(stagingRoot)
        return selected.map((asset) => ({ id: asset.id, path: asset.path }))
      } catch (error) {
        await atomicJson(assetsIndexPath(), originalAssets).catch(() => undefined)
        if (originalWorkflow) await atomicJson(workflowPath(), originalWorkflow).catch(() => undefined)
        await atomicJson(historyPath(), originalHistory).catch(() => undefined)
        for (const moved of staged.reverse()) {
          await mkdir(dirname(moved.source), { recursive: true }).catch(() => undefined)
          if (await pathExists(moved.stagedPath)) await rename(moved.stagedPath, moved.source).catch(() => undefined)
        }
        await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined)
        await writeProjectDocument().catch(() => undefined)
        throw error
      }
    })))
  })
  ipcMain.handle('assets:delete', async (_event, id: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (typeof id !== 'string') throw new Error('Invalid asset deletion request.')
    const managed = await managedAssetById(id)
    if (!managed) throw new Error('Asset not found.')
    let deleted: ImportedAsset | undefined
    let source = ''
    await assetJsonMutations.mutateArray<ImportedAsset>(managed.indexPath, async (assets) => {
      const asset = assets.find((candidate) => candidate.id === id)
      if (!asset) throw new Error('Asset not found.')
      source = await assertManagedAssetPath(asset)
      if (await pathExists(source)) await shell.trashItem(source)
      deleted = asset
      return assets.filter((candidate) => candidate.id !== id)
    })
    if (!deleted) throw new Error('Asset not found.')
    if (deleted.category !== 'style') {
      await historyJsonMutations.mutateArray<HistoryEntry>(historyPath(), (entries) => entries.filter((entry) => entry.outputPath !== source))
      await writeProjectDocument()
    }
    return { id, path: source }
  })
  ipcMain.handle('assets:reveal', async (_event, id: unknown) => {
    if (!currentProject || typeof id !== 'string') return
    const asset = (await managedAssetById(id))?.asset
    if (asset && await pathExists(asset.path)) shell.showItemInFolder(asset.path)
  })
  ipcMain.handle('assets:reveal-collection', async (_event, id: unknown) => {
    if (!currentProject || typeof id !== 'string') return false
    const asset = (await managedAssetById(id))?.asset
    if (!asset || !['character', 'element', 'location'].includes(asset.category || '')) return false
    const source = await assertManagedAssetPath(asset)
    return revealDirectory(dirname(source), (path) => shell.openPath(path))
  })
  ipcMain.handle('assets:reveal-path', async (_event, path: unknown) => {
    if (!currentProject || typeof path !== 'string') return
    const source = assertInsideProject(path)
    if (await pathExists(source)) shell.showItemInFolder(source)
  })
  ipcMain.handle('assets:copy-media', async (_event, path: unknown, type: unknown) => {
    if (!currentProject || typeof path !== 'string' || !['image', 'video', 'audio'].includes(String(type))) throw new Error('Invalid media copy request.')
    const source = assertInsideProject(path)
    if (!await pathExists(source)) throw new Error('Media file not found.')
    if (type === 'image') {
      const image = nativeImage.createFromPath(source)
      if (image.isEmpty()) throw new Error('Could not read this image.')
      clipboard.writeImage(image)
      return
    }
    const escaped = source.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
    await execFileAsync('/usr/bin/osascript', ['-e', `set the clipboard to (POSIX file "${escaped}" as alias)`])
  })
  ipcMain.handle('assets:export-metadata', async (_event, id: unknown) => {
    if (!currentProject || typeof id !== 'string') return null
    const asset = (await managedAssetById(id))?.asset
    if (!asset) throw new Error('Asset not found.')
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Asset Metadata',
      defaultPath: `${basename(asset.name, extname(asset.name))}-metadata.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, `${JSON.stringify(asset, null, 2)}\n`, 'utf8')
    return result.filePath
  })
  ipcMain.handle('assets:export-package', async (_event, id: unknown) => {
    if (!currentProject || typeof id !== 'string') return null
    const stores = await managedAssetStores()
    const assets = [...stores.styles, ...stores.project]
    const selected = assets.find((candidate) => candidate.id === id)
    if (!selected) throw new Error('Asset not found.')
    const semantic = ['character', 'element', 'location', 'style'].includes(selected.category || '')
    const selectedFolder = dirname(selected.path)
    const collection = semantic
      ? assets.filter((candidate) => candidate.category === selected.category && dirname(candidate.path) === selectedFolder)
      : [selected]
    const available: ImportedAsset[] = []
    for (const asset of collection) if (await pathExists(asset.path)) available.push(asset)
    if (!available.length) throw new Error('The asset media is missing. Relink it before exporting.')
    const collectionName = semantic
      ? normalizeLogicalAssetName(selected.metadata?.assetName || basename(selectedFolder)) || 'prism-asset'
      : basename(selected.name, extname(selected.name))
    const usedNames = new Set<string>()
    const manifestAssets: PrismAssetManifest['assets'] = []
    const zipEntries: Array<{ name: string; data: Buffer }> = []
    for (const asset of available) {
      let mediaName = asset.name
      let suffix = 2
      while (usedNames.has(mediaName.toLowerCase())) mediaName = `${basename(asset.name, extname(asset.name))}-${suffix++}${extname(asset.name)}`
      usedNames.add(mediaName.toLowerCase())
      const mediaEntry = `media/${mediaName}`
      zipEntries.push({ name: mediaEntry, data: await readFile(asset.path) })
      const { path: _path, url: _url, ...portable } = asset
      manifestAssets.push({ ...portable, mediaEntry })
    }
    const manifest: PrismAssetManifest = { fileType: 'prism-foundry-asset', schemaVersion: 1, name: collectionName, category: selected.category, createdAt: new Date().toISOString(), assets: manifestAssets }
    zipEntries.unshift({ name: 'manifest.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8') })
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Portable Asset',
      defaultPath: `${safeFolderName(collectionName, 'Prism Asset')}.prismasset`,
      filters: [{ name: 'Prism Foundry Asset', extensions: ['prismasset'] }],
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, createStoredZip(zipEntries), { flag: 'w' })
    return result.filePath
  })
  ipcMain.handle('assets:import-package', async () => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import Assets Into Prism Foundry',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Prism Foundry assets and media', extensions: ['prismasset', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'aac'] }],
    })
    if (result.canceled || !result.filePaths.length) return []
    const imported: ImportedAsset[] = []
    for (const source of result.filePaths) {
      if (extname(source).toLowerCase() === '.prismasset') imported.push(...await importPrismAssetSource(source))
      else imported.push(await importMediaPath(source))
    }
    return imported
  })
  ipcMain.handle('assets:promote', async (_event, rawPaths: unknown, kind: unknown, collectionName: unknown) => {
    if (!currentProject) throw new Error('Choose or open a project folder first.')
    if (!Array.isArray(rawPaths) || !['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(String(kind))) throw new Error('Invalid asset promotion request.')
    const name = safeFolderName(typeof collectionName === 'string' ? collectionName : undefined, kind === 'style-reference' ? 'Style' : String(kind))
    const promoted: ImportedAsset[] = []
    const indexed = await readStrictJsonOr<ImportedAsset[]>(assetsIndexPath(), [], 'The saved asset index')
    for (const rawPath of rawPaths) {
      if (typeof rawPath !== 'string') continue
      const source = assertInsideProject(rawPath)
      if (!await pathExists(source)) continue
      const destinationInfo = importFolder(kind as NodeKind, source, name)
      await mkdir(destinationInfo.folder, { recursive: true })
      const destination = join(destinationInfo.folder, uniqueAssetName(source))
      await copyFile(source, destination, fsConstants.COPYFILE_EXCL)
      promoted.push(await registerAsset({ id: randomUUID(), name: basename(source), path: destination, url: localAssetUrl(destination), mimeType: mimeFor(destination), category: destinationInfo.category, origin: assetPromotionOrigin(source, indexed), fileSize: (await stat(destination)).size, createdAt: new Date().toISOString() }))
    }
    return promoted
  })
  ipcMain.handle('assets:save-style-prompt', async (_event, rawName: unknown, rawPrompt: unknown, rawModelId: unknown, rawIntent: unknown) => {
    const name = safeFolderName(typeof rawName === 'string' ? rawName : undefined, 'Preset Style')
    const prompt = typeof rawPrompt === 'string' ? rawPrompt.trim() : ''
    const modelId = typeof rawModelId === 'string' && rawModelId.trim() ? rawModelId.trim() : 'google/gemini-pro-1.5'
    const intent = rawIntent as import('../shared/types').SemanticAssetSaveIntent
    if (intent?.mode !== 'create-new' && intent?.mode !== 'replace-existing') throw new Error('Invalid Style save intent.')
    if (!prompt) throw new Error('Build or write a Style prompt before saving.')
    await ensureDataFolders()
    const styleAssets = await readStrictJsonOr<ImportedAsset[]>(globalStylesIndexPath(), [], 'The Style Library index')
    const editTarget = intent.mode === 'replace-existing'
      ? styleAssets.find((asset) => asset.id === intent.targetAssetId && intent.token && extname(asset.path).toLowerCase() === '.prismstyle')
      : undefined
    if (intent.mode === 'replace-existing' && !editTarget) throw new Error('Style Edit replacement authority is invalid.')
    const occupied = new Set(styleAssets.map((asset) => basename(dirname(asset.path))))
    const physicalName = editTarget ? basename(dirname(editTarget.path)) : collisionSafeCollectionName(name, occupied)
    const folder = join(globalStylesRoot(), physicalName)
    await mkdir(folder, { recursive: true })
    const path = editTarget?.path || join(folder, `${safeFolderName(name, 'Preset Style')}.prismstyle`)
    await atomicJson(path, { fileType: 'prism-foundry-style', schemaVersion: 1, name, prompt, modelId, createdAt: new Date().toISOString() })
    return registerAsset({ id: editTarget?.id || randomUUID(), name, path, mimeType: 'application/vnd.prism-foundry.style+json', category: 'style', origin: 'generated', createdAt: editTarget?.createdAt || new Date().toISOString(), fileSize: (await stat(path)).size, metadata: { prompt, provider: 'fal.ai', modelId } })
  })
  ipcMain.handle('assets:status', async (): Promise<AssetLinkStatus[]> => {
    if (!currentProject) return []
    const stores = await managedAssetStores()
    const indexed = [...stores.project, ...stores.styles]
    const assets = [...indexed, ...await loadWorkflowMediaAssets(indexed)]
    return Promise.all(assets.map(async (asset) => ({ asset: { ...asset, url: localAssetUrl(asset.path) }, missing: !(await pathExists(asset.path)) })))
  })
  ipcMain.handle('assets:relink', async (_event, id: unknown, mode: unknown) => {
    if (typeof id !== 'string') throw new Error('Invalid asset relink request.')
    if (mode !== 'file' && mode !== 'folder') throw new Error('Choose whether to link a file or find in a folder.')
    let asset = (await managedAssetById(id))?.asset
    if (!asset) {
      const stores = await managedAssetStores()
      const indexed = [...stores.project, ...stores.styles]
      asset = (await loadWorkflowMediaAssets(indexed)).find((candidate) => candidate.id === id)
    }
    if (!asset) throw new Error('Asset not found.')
    const family = mediaFamily(asset.mimeType)
    const extensions = family === 'video'
      ? ['mp4', 'mov', 'm4v', 'webm', 'mkv']
      : family === 'audio'
        ? ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']
        : ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'avif', 'bmp', 'tif', 'tiff']
    const chooseFile = mode === 'file'
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: chooseFile ? `Link ${basename(asset.path)}` : `Find ${basename(asset.path)} in Folder`,
      properties: chooseFile ? ['openFile'] : ['openDirectory'],
      buttonLabel: chooseFile ? 'Link' : 'Find',
      ...(chooseFile ? { filters: [{ name: family === 'video' ? 'Video' : family === 'audio' ? 'Audio' : 'Images', extensions }] } : {}),
    })
    if (result.canceled || !result.filePaths[0]) return null
    if (isDocumentsPath(result.filePaths[0])) throw new Error('Relinking from Documents is not supported.')
    const selected = resolve(result.filePaths[0])
    return chooseFile
      ? relinkFromCandidates(dirname(selected), { assetId: id, source: selected })
      : relinkFromCandidates(selected)
  })
  ipcMain.handle('assets:relink-missing', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose a folder to find missing assets',
      properties: ['openDirectory'],
      buttonLabel: 'Find and Relink',
    })
    if (result.canceled || !result.filePaths[0]) return null
    if (isDocumentsPath(result.filePaths[0])) throw new Error('Relinking from Documents is not supported.')
    return relinkFromCandidates(result.filePaths[0])
  })
  ipcMain.handle('history:list', async () => currentProject
    ? (await readJson<HistoryEntry[]>(historyPath(), [])).map((entry) => entry.outputPath ? { ...entry, outputUrl: localAssetUrl(entry.outputPath) } : entry)
    : [])
  ipcMain.handle('generation:higgsfield-jobs', () => withProviderRequest('higgsfield', listCurrentHiggsfieldJobs))
  ipcMain.handle('generation:higgsfield-action', async (_event, value: unknown) => {
    const command = higgsfieldJobCommand(value)
    if (generationLifecycle.isRunning(command.nodeId)) throw new Error('Stop the current local run before operating its remote job.')
    const { identity, controller } = generationLifecycle.begin(command.nodeId)
    try {
      return await generationContext.run(identity, () => withProviderRequest('higgsfield', () => recoverCurrentHiggsfieldJob(command, controller.signal)))
    } finally { generationLifecycle.complete(command.nodeId, controller) }
  })
  ipcMain.handle('generation:run', async (_event, request: GenerationRequest) => {
    assertGenerationRequirements(request)
    assertVideoProviderPromptPreflight(request)
    higgsfieldJobActions.assertIdle(higgsfieldJobScope(request.nodeId))
    const { identity, controller } = generationLifecycle.begin(request.nodeId)
    const startedAt = Date.now()
    try {
      return await generationContext.run(identity, async () => {
        const result = await withProviderRequest(generationServiceProvider(request), () => runGeneration(request, controller.signal), false)
        generationLifecycle.assertActive(identity)
        const entries = await readJson<HistoryEntry[]>(historyPath(), [])
        const match = entries.findIndex((entry) => entry.outputPath === result.outputPath)
        if (match >= 0) {
          const visibleStartedAt = request.timingStartedAt ? Date.parse(request.timingStartedAt) : Number.NaN
          const recordsVisibleRun = request.timingSampleComplete !== false
          entries[match] = {
            ...entries[match],
            durationMs: recordsVisibleRun && Number.isFinite(visibleStartedAt) ? Date.now() - visibleStartedAt : Date.now() - startedAt,
            estimatedDurationMs: recordsVisibleRun ? request.estimatedDurationMs : undefined,
            timingScale: recordsVisibleRun ? request.timingScale : undefined,
            timingKey: recordsVisibleRun ? request.timingKey || generationTimingKey(request) : undefined,
          }
          await atomicJson(historyPath(), entries)
        }
        return result
      })
    }
    finally { generationLifecycle.complete(request.nodeId, controller) }
  })
  ipcMain.handle('generation:cancel', (_event, nodeId: unknown) => {
    if (typeof nodeId !== 'string') return false
    return generationLifecycle.cancel(nodeId)
  })
  ipcMain.handle('generation:estimate', (_event, request: GenerationRequest) => estimateGenerationCost(request))
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 440,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 17 },
    backgroundColor: '#0c0b12',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.webContents.setZoomFactor(1)
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  // The window has no browser chrome, so any top-level navigation is a one-way
  // trip: dropping or opening an asset URL replaces the whole app with that file
  // and leaves no way back. Only the app's own document may occupy this frame.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL()
    if (current && url !== current) event.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(new URL('index-next.html', `${process.env.ELECTRON_RENDERER_URL.replace(/\/$/, '')}/`).toString())
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index-next.html'))
  }
}

app.on('open-file', (event, path) => {
  event.preventDefault()
  pendingProjectDocumentPath = path
  if (app.isReady()) {
    void openProjectDocument(path).then((project) => {
      mainWindow?.webContents.send('projects:opened', project)
      mainWindow?.show()
      mainWindow?.focus()
    }).catch((error) => dialog.showErrorBox('Unable to open project', error instanceof Error ? error.message : String(error)))
  }
})

app.whenReady().then(async () => {
  await ensureDataFolders()
  await restoreCurrentProject()
  if (pendingProjectDocumentPath) await openProjectDocument(pendingProjectDocumentPath)
  protocol.handle('prism-asset', async (request) => {
    const url = new URL(request.url)
    const encodedPath = url.pathname.replace(/^\//, '')
    if (!encodedPath || !currentProject) return new Response('No active project', { status: 403 })
    let target: string
    try { target = assertInsideProject(decodeURIComponent(encodedPath)) } catch { return new Response('Forbidden', { status: 403 }) }
    try {
      const bytes = await readFile(target)
      const extension = extname(target).toLowerCase()
      const contentType: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
        '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
      }
      const range = request.headers.get('range')
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range)
        if (!match) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } })
        const start = Number(match[1])
        const end = Math.min(match[2] ? Number(match[2]) : bytes.length - 1, bytes.length - 1)
        if (start > end || start >= bytes.length) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } })
        return new Response(bytes.subarray(start, end + 1), {
          status: 206,
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
            'Content-Type': contentType[extension] || 'application/octet-stream',
          },
        })
      }
      return new Response(bytes, { headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(bytes.length), 'Content-Type': contentType[extension] || 'application/octet-stream' } })
    } catch {
      return new Response('Asset not found', { status: 404 })
    }
  })
  registerIpc()
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
