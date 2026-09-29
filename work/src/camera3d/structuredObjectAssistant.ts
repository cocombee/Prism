import { createStructuredObjectFromRecipe, parseObjectRecipeV1, type ObjectRecipeV1, type StructuredObject } from './structuredObject'

export type ManagedObjectReference = { managedPath: string; mediaFamily: 'image' }
export type StructuredObjectAssistantRequest = {
  version: 1
  mode: 'create' | 'revamp'
  prompt: string
  reference?: ManagedObjectReference
  currentRecipe?: ObjectRecipeV1
}
export type StructuredObjectAssistantTransport = (request: StructuredObjectAssistantRequest) => Promise<unknown>
export type StructuredObjectPromptRevampRequest = { version: 1; mode: 'revamp-prompt'; prompt: string }
export type StructuredObjectPromptRevampTransport = (request: StructuredObjectPromptRevampRequest) => Promise<unknown>

export function createStructuredObjectRequest(input: { prompt: string; reference?: ManagedObjectReference; currentRecipe?: ObjectRecipeV1 }): StructuredObjectAssistantRequest {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : ''
  if (!prompt) throw new Error('OBJECT_PROMPT_REQUIRED')
  if (new TextEncoder().encode(prompt).byteLength > 16_000) throw new Error('OBJECT_PROMPT_TOO_LARGE')
  if (input.reference) {
    if (input.reference.mediaFamily !== 'image') throw new Error('OBJECT_REFERENCE_IMAGE_REQUIRED')
    if (!/^managed:\/\/[a-zA-Z0-9._/-]+$/.test(input.reference.managedPath) || input.reference.managedPath.includes('..')) throw new Error('OBJECT_REFERENCE_UNMANAGED')
  }
  return {
    version: 1,
    prompt,
    mode: input.currentRecipe ? 'revamp' : 'create',
    ...(input.reference ? { reference: { ...input.reference } } : {}),
    ...(input.currentRecipe ? { currentRecipe: structuredClone(input.currentRecipe) } : {}),
  }
}

export async function revampStructuredObjectPrompt(
  input: { prompt: string; reference?: ManagedObjectReference; currentRecipe?: ObjectRecipeV1 },
  transport: StructuredObjectPromptRevampTransport,
): Promise<string> {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : ''
  if (!prompt) throw new Error('OBJECT_PROMPT_REQUIRED')
  if (new TextEncoder().encode(prompt).byteLength > 16_000) throw new Error('OBJECT_PROMPT_TOO_LARGE')
  const output = await transport({ version: 1, mode: 'revamp-prompt', prompt })
  if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error('OBJECT_PROMPT_REVAMP_INVALID')
  const source = output as Record<string, unknown>
  if (Object.keys(source).some((key) => key !== 'version' && key !== 'prompt') || source.version !== 1 || typeof source.prompt !== 'string') throw new Error('OBJECT_PROMPT_REVAMP_INVALID')
  const revamped = source.prompt.trim()
  if (!revamped || new TextEncoder().encode(revamped).byteLength > 16_000) throw new Error('OBJECT_PROMPT_REVAMP_INVALID')
  return revamped
}

export async function runStructuredObjectRequest(request: StructuredObjectAssistantRequest, transport: StructuredObjectAssistantTransport): Promise<ObjectRecipeV1> {
  const output = await transport(structuredClone(request))
  return parseObjectRecipeV1(output)
}

export type LocalPromptToolMode = 'describe' | 'ask' | 'similar' | 'reference' | 'tutorial'
export type LocalPromptToolRequest = { mode: LocalPromptToolMode; prompt: string }
const TOOL_MODES: Record<string, LocalPromptToolMode> = {
  Describe: 'describe', Ask: 'ask', 'Create Similar Object': 'similar', Similar: 'similar', 'Use As Reference': 'reference', Reference: 'reference', Tutorial: 'tutorial',
}
export function localPromptToolRequest(tool: string, prompt: string): LocalPromptToolRequest {
  const mode = TOOL_MODES[tool]
  if (!mode) throw new Error('OBJECT_PROMPT_TOOL_UNKNOWN')
  const value = prompt.trim()
  if (!value) throw new Error('OBJECT_PROMPT_REQUIRED')
  return { mode, prompt: value }
}

export type LocalObjectLifecycleState = 'draft' | 'preview' | 'applied' | 'cancelled'
export type LocalObjectLifecycleSnapshot = { state: LocalObjectLifecycleState; prompt: string; recipe?: ObjectRecipeV1; object?: StructuredObject }
export type LocalObjectLifecycle = {
  snapshot: () => LocalObjectLifecycleSnapshot
  revamp: (prompt: string) => LocalObjectLifecycleSnapshot
  send: (recipe: unknown) => LocalObjectLifecycleSnapshot
  apply: () => LocalObjectLifecycleSnapshot
  cancel: () => LocalObjectLifecycleSnapshot
}

/** Pure local draft/preview/apply controller. It never calls a provider or mutates a document. */
export function createLocalObjectLifecycle(nextId: () => string, root = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number], anchor: [0, 0, 0] as [number, number, number] }): LocalObjectLifecycle {
  let current: LocalObjectLifecycleSnapshot = { state: 'draft', prompt: '' }
  const snapshot = () => structuredClone(current)
  return {
    snapshot,
    revamp(prompt) { if (current.state === 'applied') return snapshot(); current = { ...current, state: 'draft', prompt: prompt.trim() }; return snapshot() },
    send(input) { if (current.state === 'applied') return snapshot(); const recipe = parseObjectRecipeV1(input); const object = createStructuredObjectFromRecipe(recipe, nextId(), root); current = { ...current, state: 'preview', recipe, object }; return snapshot() },
    apply() { if (current.state === 'preview') current = { ...current, state: 'applied' }; return snapshot() },
    cancel() { if (current.state !== 'applied') current = { state: 'cancelled', prompt: '' }; return snapshot() },
  }
}
