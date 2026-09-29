import type { Edge } from '@xyflow/react'
import { ELEMENT_ANCHOR_VIEW } from './elementViews'
import type { StudioNode, StudioNodeData } from './types'

export function incompleteSemanticReason(data: StudioNodeData): string | null {
  const name = data.referenceTag || `@${(data.title || data.kind).replace(/^@+/, '').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`
  if (data.kind === 'character') {
    const readyFace = (data.referenceAssets || []).some((asset) => asset.metadata?.characterView === 'front')
    if (!readyFace) return `${name} needs the required Face`
  }
  if (data.kind === 'element' && !(data.referenceAssets || []).some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)) return `${name} needs the required Three-Quarter view`
  if (data.kind === 'location' && !(data.referenceAssets || []).length) return `${name} needs at least one Location image`
  if (data.kind === 'wardrobe' && !(data.referenceAssets || []).length) return `${name} needs at least one Wardrobe image`
  if (data.kind === 'style-reference') {
    const prompt = (data.stylePrompt || data.prompt || '').trim()
    const finalized = Boolean(data.stylePresetId || data.styleSavedAt || data.runState === 'complete' && prompt)
    if (!finalized) return `${name} needs a finalized reusable Style prompt`
  }
  return null
}

/** Exact production presentation for an existing semantic connection whose
 * source is Not Ready. Keep every Not Ready cause on this one owner. */
export function notReadyEdgePresentation(edge: Edge): Edge {
  return { ...edge, animated: false, style: { ...edge.style, stroke: '#ff596d', strokeWidth: 2 } }
}

export function semanticWarning(data: StudioNodeData): string | null {
  if (data.kind !== 'storyboard' || !data.storyboardNeedsCompile || !(data.outputPath || data.outputUrl)) return null
  const name = data.referenceTag || `@${(data.title || 'storyboard').replace(/^@+/, '').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}`
  return `${name} has unsaved panel edits — recompile to include the current shot map`
}

export function upstreamIncompleteSemanticReasons(targetId: string, nodes: StudioNode[], edges: Edge[]): string[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const sourcesByTarget = new Map<string, string[]>()
  edges.forEach((edge) => sourcesByTarget.set(edge.target, [...(sourcesByTarget.get(edge.target) || []), edge.source]))
  const pending = [...(sourcesByTarget.get(targetId) || [])]
  const visited = new Set<string>()
  const failures: string[] = []
  while (pending.length) {
    const sourceId = pending.shift()!
    if (visited.has(sourceId)) continue
    visited.add(sourceId)
    const source = nodeById.get(sourceId)
    if (!source) continue
    const reason = incompleteSemanticReason(source.data)
    if (reason) failures.push(reason)
    pending.push(...(sourcesByTarget.get(sourceId) || []))
  }
  return [...new Set(failures)]
}

export function upstreamSemanticWarnings(targetId: string, nodes: StudioNode[], edges: Edge[]): string[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const sourcesByTarget = new Map<string, string[]>()
  edges.forEach((edge) => sourcesByTarget.set(edge.target, [...(sourcesByTarget.get(edge.target) || []), edge.source]))
  const pending = [...(sourcesByTarget.get(targetId) || [])]
  const visited = new Set<string>()
  const warnings: string[] = []
  while (pending.length) {
    const sourceId = pending.shift()!
    if (visited.has(sourceId)) continue
    visited.add(sourceId)
    const source = nodeById.get(sourceId)
    if (!source) continue
    const warning = semanticWarning(source.data)
    if (warning) warnings.push(warning)
    pending.push(...(sourcesByTarget.get(sourceId) || []))
  }
  return [...new Set(warnings)]
}
