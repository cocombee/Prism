import type { GenerationRequest, StudioNode, StudioNodeData } from './types'
import type { Edge } from '@xyflow/react'
import { workflowTag } from './inputRules'
import { semanticAssetAvailability } from './semanticAssetAvailability'
import { assetReferenceDescription } from './semanticAssetPromptBoundary'
import { effectiveProviderPromptOwnership, hasExactAuthoredProviderBody } from './providerPromptOwnership'
import { compatibleMediaGeneratorConnection, mediaReferenceConnectionType, mediaReferenceDescriptionTemplate, effectiveMediaReferenceMode } from './mediaReferenceModes'

/** Description mentions identify existing assets, independent of creation-input compatibility. */
export function assetDescriptionKnownTags(nodes: StudioNode[]): string[] {
  const kinds = ['character', 'wardrobe', 'element', 'location', 'style-reference', 'upload', 'image-generator', 'image-editor', 'upscaler', 'video-generator', 'voiceover', 'sound-effects', 'music-generator', 'output', 'storyboard']
  return [...new Set(nodes.filter(node => kinds.includes(node.data.kind)).map(node => workflowTag(node.data, 'asset')))]
}

/** Follow actual downstream connections; disconnected media keep their saved description hidden. */
export function mediaDescriptionConnectedToGenerator(sourceId: string, nodes: StudioNode[], edges: Edge[]): boolean {
  return compatibleMediaGeneratorConnection(sourceId, nodes, edges)
}

export function reachableAssetConsumers(startId: string, nodes: StudioNode[], edges: Edge[], passThroughOnly = false): Edge[] {
  const pending = [startId], seen = new Set<string>(), consumers: Edge[] = []
  while (pending.length) {
    const id = pending.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const edge of edges.filter(item => item.source === id)) {
      const target = nodes.find(node => node.id === edge.target)
      if (target && (['router', 'list'].includes(target.data.kind) || !passThroughOnly && ['character', 'storyboard'].includes(target.data.kind) && edges.some(item => item.source === target.id))) pending.push(target.id)
      else consumers.push(edge)
    }
  }
  return consumers
}

function hasDescriptionMedia(data: StudioNodeData): boolean {
  return Boolean(data.referenceAssets?.length || data.assetPath || data.assetUrl || data.outputPath || data.outputUrl || data.generatedResults?.length)
}

/** Canvas order identifies the first Location within its connected scene. */
function locationDescriptionPeers(source: StudioNode, nodes: StudioNode[], edges: Edge[]): StudioNode[] {
  const consumers = new Set(reachableAssetConsumers(source.id, nodes, edges).map(edge => edge.target))
  return nodes.filter(node => node.data.kind === 'location' && hasDescriptionMedia(node.data) && (!consumers.size || node.id === source.id || reachableAssetConsumers(node.id, nodes, edges).some(edge => consumers.has(edge.target))))
}

export function assetDescriptionPlaceholderForNode(source: StudioNode, nodes: StudioNode[], edges: Edge[]): string {
  const primaryLocation = source.data.kind === 'location' && locationDescriptionPeers(source, nodes, edges)[0]?.id === source.id
  return assetDescriptionPlaceholder(source.data.kind, workflowTag(source.data, 'asset'), primaryLocation)
}

/** Editable defaults come only from typed nodes and actual graph relationships. */
export function resolvedAssetReferenceDescription(source: StudioNode, nodes: StudioNode[], edges: Edge[], boundCharacterTag?: string): string {
  const text = assetReferenceDescription(source.data)
  const mode = source.data.referenceDescriptionMode ?? source.data.referenceAssets?.find(asset => asset.metadata?.referenceDescriptionMode)?.metadata?.referenceDescriptionMode
  if (mode === 'authored' || mode !== 'auto' && text.trim()) return text
  if (mode === 'auto' && text.trim() && !edges.some(edge => edge.source === source.id || edge.target === source.id)) return text
  const tag = workflowTag(source.data, 'asset')
  if (source.data.kind === 'wardrobe') {
    const owners = boundCharacterTag ? [boundCharacterTag] : edges.filter(edge => edge.source === source.id && edge.targetHandle === 'wardrobe-in').flatMap(edge => {
      const character = nodes.find(node => node.id === edge.target && node.data.kind === 'character')
      return character ? [workflowTag(character.data, 'character')] : []
    })
    return owners.length ? `${tag} is the sole wardrobe and worn-accessory reference for ${[...new Set(owners)].join(', ')}. It supplies appearance on those same Characters, never another person or body.` : ''
  }
  if (source.data.kind === 'character') {
    const wardrobes = edges.filter(edge => edge.target === source.id && edge.targetHandle === 'wardrobe-in').flatMap(edge => {
      const wardrobe = nodes.find(node => node.id === edge.source && node.data.kind === 'wardrobe')
      return wardrobe && semanticAssetAvailability(wardrobe.data).state !== 'offline' ? [workflowTag(wardrobe.data, 'wardrobe')] : []
    })
    return `${tag} is the sole Character identity and body reference for this person.${wardrobes.length ? ` The same Character wears the wardrobe from ${[...new Set(wardrobes)].join(', ')}; those layers supply no additional identity or body.` : ' Keep this identity independent of every other Character.'}`
  }
  if (source.data.kind === 'location') {
    const peerLocations = locationDescriptionPeers(source, nodes, edges)
    return peerLocations.length === 1 ? `${tag} is the sole Location reference for the connected scene's environment, layout and stable physical geometry.` : ''
  }
  if (source.data.kind === 'style-reference') return `${tag} supplies look and finish only: visual language, palette, texture and rendering. It supplies no Character, wardrobe, prop or Location identity.`
  const referenceType = mediaReferenceConnectionType(source.id, nodes, edges)
  if (referenceType) {
    const mode = effectiveMediaReferenceMode(source.data, referenceType)
    return mediaReferenceDescriptionTemplate(source.data, mode, referenceType)
  }
  const purposes = new Set(reachableAssetConsumers(source.id, nodes, edges, true).map(edge => edge.targetHandle))
  if (purposes.size !== 1) return ''
  if (purposes.has('end-image')) return `${tag} is the Ending Frame reference: the exact final composition and physical state.`
  return ''
}

/** Store proven defaults in the workflow so hiding the field never discards them. */
export function automaticAssetDescriptionPatch(source: StudioNode, nodes: StudioNode[], edges: Edge[]): Partial<StudioNodeData> | undefined {
  const data = source.data
  if (!hasDescriptionMedia(data)) return undefined
  const text = assetReferenceDescription(data), mode = data.referenceDescriptionMode ?? data.referenceAssets?.find(asset => asset.metadata?.referenceDescriptionMode)?.metadata?.referenceDescriptionMode
  if (mode === 'authored' || mode !== 'auto' && text.trim()) return undefined
  const description = resolvedAssetReferenceDescription(source, nodes, edges)
  if (description === text) return undefined
  return { referenceDescription: description, referenceDescriptionMode: 'auto' }
}

export function assetDescriptionPlaceholder(kind: StudioNode['data']['kind'], tag: string, primaryLocation = false): string {
  return kind === 'location' ? primaryLocation ? `${tag} is the sole representation of [the location and its environment]…` : `${tag} is the sole reference for [this part or state of the location]…`
    : kind === 'element' ? `${tag} is the sole reference for [this prop and its role in the scene]…`
    : `${tag} represents [what this media shows and what it controls]…`
}

/** Exact unresolved sample fields are not completed asset-role assignments. */
function pendingDescription(description: string | undefined): boolean {
  return description !== undefined && (!description.trim() || /\[(?:original (?:object|subject(?: or object)?)|replacement reference|target location reference|speaker reference)\]/i.test(description))
}

/** A pending Description cannot yet assign provider-visible reference authority. */
export function completedReferenceAuthorityRequest(request: GenerationRequest): GenerationRequest {
  const pending = (request.references || []).filter(reference => pendingDescription(reference.referenceDescription))
  const pendingRules = (request.connectionRules || []).filter(rule => pendingDescription(rule.referenceDescription) && /^(?:Character|Wardrobe|Location|Element|Media Reference|Image Reference|Video Reference|Audio Reference|Source Image|Video To Extend)/i.test(rule.label))
  if (!pending.length && !pendingRules.length) return request
  const pendingTags = new Set([...pending.map(reference => reference.tag), ...pendingRules.map(rule => rule.tag)].filter(Boolean))
  return {
    ...request,
    references: request.references?.filter(reference => !pending.includes(reference)),
    connectionRules: request.connectionRules?.filter(rule => !pendingTags.has(rule.tag)),
    ...(request.inputTag && pendingTags.has(request.inputTag) ? { inputTag: undefined, inputName: undefined } : {}),
  }
}

export function referenceIntroductionLine(reference: { tag?: string; name?: string; referenceDescription?: string }): string | undefined {
  const description = reference.referenceDescription?.trim()
  if (!description || pendingDescription(description)) return undefined
  const label = reference.tag || reference.name || '@reference'
  return description === label || description.startsWith(`${label} `) || description.startsWith(`${label}:`) ? description : `${label} — ${description}`
}

export function referenceDescriptionLines(request: GenerationRequest): string[] {
  return [...new Set([...(request.references || []), ...(request.connectionRules || []).filter(rule => rule.tag === request.inputTag || rule.label === 'Style' && Boolean(request.stylePrompt?.trim()) || request.references?.some(reference => reference.tag === rule.tag))].flatMap(reference => {
    const line = referenceIntroductionLine(reference)
    return line ? [line] : []
  }))]
}

export function referenceDescriptionReadinessFailures(request: GenerationRequest): string[] {
  const missing = (request.references || []).filter(reference => (reference.path || reference.url) && (!reference.referenceDescription?.trim() || pendingDescription(reference.referenceDescription))).map(reference => `Fill the Description for ${reference.tag || reference.name || 'this reference'} before generation.`)
  if (hasExactAuthoredProviderBody(request) || effectiveProviderPromptOwnership(request) === 'authored') return missing
  const known = new Set([
    ...(request.references || []).map(reference => reference.tag),
    ...(request.connectionRules || []).map(rule => rule.tag), request.inputTag,
  ].filter((tag): tag is string => Boolean(tag)))
  return [...new Set([...missing, ...[...(request.references || []), ...(request.connectionRules || [])].flatMap(reference => {
    const tags = reference.referenceDescription?.match(/@[\p{L}\p{N}_-]+/gu) || []
    return tags.filter(tag => !known.has(tag)).map(tag => `The Description of ${reference.tag || ('name' in reference && reference.name) || 'this asset'} refers to ${tag}, which is not connected to this generation. Connect its correct asset before running.`)
  })])]
}

export function assetDescriptionRevampContext(source: StudioNode, nodes: StudioNode[], edges: Edge[]) {
  const tagFor = (node: StudioNode) => workflowTag(node.data, 'asset')
  const description = resolvedAssetReferenceDescription(source, nodes, edges)
  const mentioned = new Set((description.match(/@[\p{L}\p{N}_-]+/gu) || []).map(tag => tag.toLocaleLowerCase()))
  const included = new Set([source.id])
  for (const edge of edges) if (edge.target === source.id || edge.source === source.id && nodes.find(node => node.id === edge.target)?.data.kind === 'character') { included.add(edge.source); included.add(edge.target) }
  for (const node of nodes) if (mentioned.has(tagFor(node).toLocaleLowerCase())) included.add(node.id)
  const definitions = nodes.filter(node => included.has(node.id)).map(node => ({
    tag: tagFor(node), type: node.data.kind, description: resolvedAssetReferenceDescription(node, nodes, edges),
    wardrobeFor: node.data.kind === 'wardrobe' ? edges.filter(edge => edge.source === node.id && edge.targetHandle === 'wardrobe-in').flatMap(edge => {
      const owner = nodes.find(candidate => candidate.id === edge.target && candidate.data.kind === 'character')
      return owner ? [tagFor(owner)] : []
    }) : undefined,
  }))
  return { description, targetTag: tagFor(source), definitions, allowedTags: definitions.map(definition => definition.tag), fingerprint: JSON.stringify(definitions) }
}

export function assetDescriptionRevampInstruction(context: ReturnType<typeof assetDescriptionRevampContext>): string {
  return `Improve only this asset's Description for downstream reference introductions. Target: ${context.targetTag}.
State exactly what the supplied asset represents, which reference domain it controls, and any explicitly authored part, state or relationship (for example, the same doorway open versus closed). Retain every authored semantic @tag. Where a connected Wardrobe owner is explicitly supplied, preserve that exact Character ownership. Do not guess ownership from names, image order, clothing in a sheet, or prose similarity.
Use these read-only typed definitions as context: ${JSON.stringify(context.definitions)}
These are authored descriptions and graph definitions, not inspected image contents. Do not invent unseen appearance, people, wardrobe, props, location parts, actions, camera moves, timing, state changes or provider capabilities. Do not convert a location-state reference into a Starting/Ending Frame unless its actual connection says so. For an explicitly authored replacement, retain the exact base reference, named replacement target, replacement reference and change-only scope. Retain every authored preservation constraint on other subjects, people count, environment, lighting, props, motion, camera behaviour, timing and original audio; do not infer a replacement or new constraint when none is authored. Preserve uncertainty and every existing role assignment. Never write a generation prompt, ordinal attachment tokens, or an explanation. Return only the improved Description.`
}

export function validateAssetDescriptionRevamp(original: string, output: string, allowedTags: readonly string[]): string {
  if (!output.trim()) throw new Error('Description Revamp returned no text.')
  if (/@(?:Image|Video|Audio)\d+\b|\[(?:Image|Video|Audio)\d+\]/i.test(output)) throw new Error('Description Revamp returned provider ordinals instead of semantic asset tags.')
  const before = new Set(original.match(/@[\p{L}\p{N}_-]+/gu) || [])
  const after = new Set(output.match(/@[\p{L}\p{N}_-]+/gu) || [])
  const available = new Set([...allowedTags, ...before])
  for (const tag of before) if (!after.has(tag)) throw new Error(`Description Revamp removed the authored asset tag ${tag}.`)
  for (const tag of after) if (!available.has(tag)) throw new Error(`Description Revamp introduced an unrelated asset tag ${tag}.`)
  return output
}
