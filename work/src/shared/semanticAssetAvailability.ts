import type { SemanticAssetAvailability, StudioNode, StudioNodeData } from './types'
import type { Edge } from '@xyflow/react'
import { notReadyEdgePresentation } from './semanticReadiness'

export const SEMANTIC_ASSET_KINDS = ['character', 'wardrobe', 'element', 'location', 'style-reference'] as const
export type SemanticAssetKind = typeof SEMANTIC_ASSET_KINDS[number]

export function isSemanticAssetKind(kind: StudioNodeData['kind']): kind is SemanticAssetKind {
  return (SEMANTIC_ASSET_KINDS as readonly string[]).includes(kind)
}

/**
 * The sole semantic-media availability predicate. Callers may project a live
 * missing-ID inventory, or consume the already-projected node state.
 */
export function semanticAssetAvailability(
  data: Pick<StudioNodeData, 'kind' | 'referenceAssets' | 'semanticAssetAvailability'>,
  unavailableAssetIds?: Iterable<string>,
): SemanticAssetAvailability {
  const requiredAssetIds = isSemanticAssetKind(data.kind) ? (data.referenceAssets || []).map((asset) => asset.id) : []
  const unavailable = new Set(unavailableAssetIds === undefined
    ? data.semanticAssetAvailability?.unavailableAssetIds || []
    : unavailableAssetIds)
  const unavailableRequiredIds = requiredAssetIds.filter((id) => unavailable.has(id))
  const projectedOffline = unavailableAssetIds === undefined && data.semanticAssetAvailability?.state === 'offline'
  return {
    state: unavailableRequiredIds.length || projectedOffline ? 'offline' : 'online',
    requiredAssetIds,
    unavailableAssetIds: unavailableRequiredIds.length ? unavailableRequiredIds : projectedOffline ? [...unavailable] : [],
  }
}

export function projectSemanticAssetData(data: StudioNodeData, unavailableAssetIds: Iterable<string>): StudioNodeData {
  if (!isSemanticAssetKind(data.kind)) return data
  return { ...data, semanticAssetAvailability: semanticAssetAvailability(data, unavailableAssetIds) }
}

export function projectSemanticAssetNodes(nodes: StudioNode[], unavailableAssetIds: Iterable<string>): StudioNode[] {
  return nodes.map((node) => {
    const data = projectSemanticAssetData(node.data, unavailableAssetIds)
    return data === node.data ? node : { ...node, data }
  })
}

export function semanticAssetOutputAvailable(data: Pick<StudioNodeData, 'kind' | 'referenceAssets' | 'semanticAssetAvailability'>): boolean {
  return !isSemanticAssetKind(data.kind) || semanticAssetAvailability(data).state === 'online'
}

export function semanticEdgePresentation(edge: Edge, source: Pick<StudioNodeData, 'kind' | 'referenceAssets' | 'semanticAssetAvailability'>): Edge {
  if (semanticAssetAvailability(source).state !== 'offline') return edge
  return notReadyEdgePresentation({ ...edge, data: { ...edge.data, semanticOffline: true } })
}