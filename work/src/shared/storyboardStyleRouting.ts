import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { nodeInputPorts } from './nodePorts'

/** Move retired Storyboard Style links to their actual rendering owner; never mutate source nodes. */
export function directStoryboardStyles(nodes: StudioNode[], edges: Edge[]): Edge[] {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const retired = edges.filter(edge => byId.get(edge.source)?.data.kind === 'style-reference' && byId.get(edge.target)?.data.kind === 'storyboard')
  if (!retired.length) return edges
  const retiredIds = new Set(retired.map(edge => edge.id))
  const next = edges.filter(edge => !retiredIds.has(edge.id))
  for (const edge of retired) {
    const visited = new Set<string>(), generators = new Set<string>()
    const visit = (id: string) => {
      if (visited.has(id)) return
      visited.add(id)
      for (const outgoing of edges.filter(candidate => candidate.source === id)) {
        const target = byId.get(outgoing.target)
        if (target?.data.kind === 'video-generator' && outgoing.targetHandle === 'storyboard-in') generators.add(target.id)
        else if (target?.data.kind === 'router' && (target.data.routeSignal === 'storyboard' || !target.data.routeSignal)) visit(target.id)
      }
    }
    visit(edge.target)
    for (const target of generators) {
      const generator = byId.get(target)!
      // An explicit Style already connected to the generator is authoritative (including identical links).
      if (next.some(candidate => candidate.target === target && candidate.targetHandle === 'style-in')) continue
      if (!nodeInputPorts(generator.data).some(port => port.id === 'style-in')) continue
      next.push({ ...edge, id: `${edge.id}::generator-style::${target}`, target, targetHandle: 'style-in' })
    }
  }
  return next
}

/** Retire only the old automatic sidecar ownership; preserve every Style and its position/content. */
export function detachStoryboardStyleNodes(nodes: StudioNode[]): StudioNode[] {
  return nodes.map(node => node.data.kind === 'style-reference' && node.data.linkedStoryboardId
    ? { ...node, data: { ...node.data, linkedStoryboardId: undefined } } : node)
}
