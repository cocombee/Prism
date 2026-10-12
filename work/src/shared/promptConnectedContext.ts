import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { reachableAssetConsumers } from './assetReferenceDescriptions'
import { nodeConnectionError } from './nodeConnections'
import { workflowTag } from './inputRules'
import { promptTagRanges } from './promptTags'
import { buildStoryboardConnectedContextManifest, connectedContextManifest, safeMetadataText, type StoryboardConnectedContextEntry } from './storyboardRewrite'

const AUTHORING_KINDS = new Set(['prompt', 'assistant'])
const TRANSPARENT_INPUT_KINDS = new Set(['router', 'list', 'storyboard', 'character', 'wardrobe', 'element', 'location'])

/** Read sibling references through a shared destination; never reverse or create edges. */
export function sharedPromptContext(nodeId: string, nodes: StudioNode[], edges: Edge[]) {
  const empty = { tags: [] as string[], assetIds: [] as string[], consumerIds: [] as string[], contextNodeIds: [] as string[], contextEdges: [] as Edge[], manifest: '' }
  const byId = new Map(nodes.map(node => [node.id, node]))
  if (!AUTHORING_KINDS.has(byId.get(nodeId)?.data.kind || '')) return empty
  const validEdges = edges.filter(edge => {
    const source = byId.get(edge.source), target = byId.get(edge.target)
    return source && target && !nodeConnectionError(source.id, target.id, source.data, target.data, edge.sourceHandle, edge.targetHandle)
  })
  const consumers = [...new Set(reachableAssetConsumers(nodeId, nodes, validEdges, true).map(edge => edge.target))]
  const contextNodeIds = new Set<string>(), visited = new Set<string>(), contextEdges = new Map<string, Edge>()
  const collect = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    contextNodeIds.add(id)
    for (const edge of validEdges.filter(edge => edge.target === id)) {
      contextEdges.set(edge.id, edge)
      contextNodeIds.add(edge.source)
      const source = byId.get(edge.source)!
      if (TRANSPARENT_INPUT_KINDS.has(source.data.kind)) collect(edge.source)
    }
  }
  consumers.forEach(collect)
  const entriesById = new Map<string, StoryboardConnectedContextEntry>()
  for (const consumerId of consumers) {
    for (const entry of buildStoryboardConnectedContextManifest(consumerId, nodes, validEdges, '').entries) {
      const source = entry.sourceNodeId && byId.get(entry.sourceNodeId)
      if (!source || source.id === nodeId || ['router', 'list'].includes(source.data.kind)) continue
      const tag = workflowTag(source.data, 'asset')
      if (!/^@[\p{L}\p{N}_-]+$/u.test(tag) || /@(?:Image|Video|Audio)\d+\b/i.test(tag)) continue
      entriesById.set(source.id, {
        ...entry, tag,
        referenceDescription: safeMetadataText(entry.referenceDescription, 800),
        appearanceOwnerCharacterTag: safeMetadataText(entry.appearanceOwnerCharacterTag, 96),
        appearanceShotIds: undefined,
        propScaleAuthority: entry.propScaleAuthority ? {
          ...entry.propScaleAuthority,
          authoredScaleStatement: safeMetadataText(entry.propScaleAuthority.authoredScaleStatement, 300),
          approvedScaleExclusions: entry.propScaleAuthority.approvedScaleExclusions?.flatMap(value => { const safe = safeMetadataText(value); return safe ? [safe] : [] }),
        } : undefined,
        // Aggregate all destinations before semantic matching; no per-consumer forced anchor.
        matchedAlias: undefined, requiredInsertion: false, insertionHint: undefined,
      })
    }
  }
  const counts = new Map<string, number>()
  for (const entry of entriesById.values()) counts.set(entry.tag!.toLocaleLowerCase(), (counts.get(entry.tag!.toLocaleLowerCase()) || 0) + 1)
  const entries = [...entriesById.values()].filter(entry => counts.get(entry.tag!.toLocaleLowerCase()) === 1)
  return { tags: entries.map(entry => entry.tag!), assetIds: entries.map(entry => entry.sourceNodeId!), consumerIds: consumers, contextNodeIds: [...contextNodeIds], contextEdges: [...contextEdges.values()], manifest: connectedContextManifest(entries).text }
}

export function sharedPromptRewriteInstruction(context: ReturnType<typeof sharedPromptContext>): string {
  const base = 'Rewrite this creative prompt to be clearer, more visual, production-ready, and faithful to the original intent. Return only the improved Prompt.'
  if (!context.manifest) return base
  return `${base}
The following read-only references actually feed the same downstream node as this Prompt. Resolve natural-language mentions in any language, dialect or minor misspelling from their typed role, safe name and authored Description. When exactly one connected reference is relevant and unambiguous, replace its first natural-language mention with its exact canonical @tag. If multiple references are plausible, do not guess; leave the mention untagged. Connection alone never adds a subject, action, dialogue, appearance, camera move or timing. Preserve every authored @tag occurrence and its exact case; insert a new canonical tag at most once. Typed wardrobe/body ownership stays immutable. Images own their visual appearance; names/captions are identification only. Audio supplies only its explicitly assigned sound/timing and never visual identity. Style does not become cast or action. Never invent an unconnected tag, copy hidden context, or emit provider ordinal tokens.
${context.manifest}`
}

/** Validate only semantic anchors, leaving storyboard shot/timing policy with its owner. */
export function validateSharedPromptRewrite(original: string, output: string, allowedTags: readonly string[]): string {
  if (!output.trim()) throw new Error('Prompt Revamp returned no text.')
  if (/@(?:Image|Video|Audio)\d+\b|\[(?:Image|Video|Audio)\d+\]/i.test(output)) throw new Error('Prompt Revamp returned provider ordinals instead of semantic asset tags.')
  if (/CONNECTED CONTEXT MANIFEST|HIDDEN PROVIDER CONTEXT|(?:semantic-anchor-candidate|authored-reference-description|required-anchor|visual-authority|body-authority)=/i.test(output)) throw new Error('Prompt Revamp returned hidden reference context.')
  const counts = (text: string) => {
    const result = new Map<string, number>()
    for (const { text: tag } of promptTagRanges(text, [])) result.set(tag, (result.get(tag) || 0) + 1)
    return result
  }
  const before = counts(original), after = counts(output), allowed = new Set([...allowedTags, ...before.keys()])
  for (const [tag, count] of before) if ((after.get(tag) || 0) < count) throw new Error(`Prompt Revamp removed the authored asset tag ${tag}.`)
  for (const [tag, count] of after) {
    if (!allowed.has(tag)) throw new Error(`Prompt Revamp introduced an unrelated asset tag ${tag}.`)
    if (count > Math.max(1, before.get(tag) || 0)) throw new Error(`Prompt Revamp duplicated the asset tag ${tag}.`)
  }
  return output
}
