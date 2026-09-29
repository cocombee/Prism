import type { HistoryEntry, StudioNode } from './types'

type GeneratedResult = NonNullable<StudioNode['data']['generatedResults']>[number]

export const INTERRUPTED_GENERATION_MESSAGE = 'Previous generation was interrupted when Prism Foundry closed. No active provider request is attached. Your previous result is preserved.'

/**
 * Provider subscriptions and abort controllers live only for the lifetime of the
 * Electron process. A persisted transient state therefore cannot be resumed after
 * project hydration and must never be presented as a live generation.
 */
export function recoverInterruptedGenerationNodes(nodes: StudioNode[]): StudioNode[] {
  return nodes.map((node) => {
    if (node.data.runState !== 'queued' && node.data.runState !== 'running') return node
    return {
      ...node,
      data: {
        ...node.data,
        runState: 'error',
        progress: undefined,
        error: INTERRUPTED_GENERATION_MESSAGE,
        ...(node.data.sequenceStatus === 'running' ? { sequenceStatus: 'failed' as const } : {}),
      },
    }
  })
}

const outputTypeFromPath = (path: string): 'image' | 'video' | 'audio' => {
  const extension = `.${path.split('.').at(-1)?.toLowerCase() || ''}`
  if (['.mp4', '.mov', '.m4v', '.webm'].includes(extension)) return 'video'
  if (['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'].includes(extension)) return 'audio'
  return 'image'
}

/**
 * A provider result and its History entry are persisted before the renderer can
 * checkpoint the completed node. Recover only entries belonging to the exact
 * still-marked run so intentionally deleted older results are never resurrected.
 */
export function recoverCompletedGenerationNodes(nodes: StudioNode[], history: HistoryEntry[]): StudioNode[] {
  const completionsByNode = new Map<string, HistoryEntry[]>()
  history.forEach((entry) => {
    if (entry.status !== 'complete' || !entry.outputPath || !entry.outputUrl) return
    const entries = completionsByNode.get(entry.nodeId) || []
    entries.push(entry)
    completionsByNode.set(entry.nodeId, entries)
  })

  let changed = false
  const recovered = nodes.map((node) => {
    const runStartedAt = node.data.runStartedAt
    if (!runStartedAt) return node
    const runStartedTime = Date.parse(runStartedAt)
    if (!Number.isFinite(runStartedTime)) return node
    const completions = (completionsByNode.get(node.id) || [])
      .filter((entry) => Date.parse(entry.createdAt) >= runStartedTime)
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
    if (!completions.length) return node

    const generatedResults = [...(node.data.generatedResults || [])]
    const knownPaths = new Set(generatedResults.map((result) => result.path))
    completions.forEach((entry) => {
      if (!entry.outputPath || !entry.outputUrl || knownPaths.has(entry.outputPath)) return
      generatedResults.push({
        path: entry.outputPath,
        url: entry.outputUrl,
        type: outputTypeFromPath(entry.outputPath),
        modelId: entry.modelId,
        createdAt: entry.createdAt,
      })
      knownPaths.add(entry.outputPath)
    })
    const latest = completions.at(-1)!
    const activeResultIndex = generatedResults.findIndex((result) => result.path === latest.outputPath)
    changed = true
    return {
      ...node,
      data: {
        ...node.data,
        runState: 'complete' as const,
        progress: 'Complete',
        error: undefined,
        runStartedAt: undefined,
        outputPath: latest.outputPath!,
        outputUrl: latest.outputUrl!,
        outputType: outputTypeFromPath(latest.outputPath!),
        modelId: latest.modelId,
        generatedResults,
        activeResultIndex: activeResultIndex >= 0 ? activeResultIndex : Math.max(0, generatedResults.length - 1),
      },
    }
  })
  return changed ? recovered : nodes
}

/** Remove only generated-result records whose managed files were verified absent. */
export function pruneMissingGeneratedResults(nodes: StudioNode[], availablePaths: ReadonlySet<string>): StudioNode[] {
  let changed = false
  const pruned = nodes.map((node) => {
    const results = node.data.generatedResults
    if (!results?.length) return node
    const retained = results.filter((result) => availablePaths.has(result.path))
    if (retained.length === results.length) return node
    const requestedIndex = Math.min(Math.max(node.data.activeResultIndex || 0, 0), results.length - 1)
    const requestedPath = results[requestedIndex]?.path
    let activeResultIndex = retained.findIndex((result) => result.path === requestedPath)
    if (activeResultIndex < 0) {
      const retainedPaths = new Set(retained.map((result) => result.path))
      const previousPath = results.slice(0, requestedIndex).reverse().find((result) => retainedPaths.has(result.path))?.path
      activeResultIndex = previousPath ? retained.findIndex((result) => result.path === previousPath) : Math.min(requestedIndex, retained.length - 1)
    }
    activeResultIndex = Math.max(0, activeResultIndex)
    const active = retained[activeResultIndex]
    changed = true
    return {
      ...node,
      data: {
        ...node.data,
        generatedResults: retained,
        activeResultIndex,
        outputPath: active?.path,
        outputUrl: active?.url,
        outputType: active?.type,
        modelId: active?.modelId || node.data.modelId,
        ...(retained.length || node.data.runState !== 'complete' ? {} : { runState: 'idle' as const, progress: undefined }),
      },
    }
  })
  return changed ? pruned : nodes
}

/**
 * Provider calls can outlive renderer edits. Merge their new batch into the
 * current live result list so a result deleted during the wait is not restored
 * from the stale list captured when the run began.
 */
export function mergeLiveGeneratedResults(liveResults: GeneratedResult[], batchResults: GeneratedResult[]): GeneratedResult[] {
  const merged = [...liveResults]
  const knownPaths = new Set(liveResults.map((result) => result.path))
  batchResults.forEach((result) => {
    if (knownPaths.has(result.path)) return
    merged.push(result)
    knownPaths.add(result.path)
  })
  return merged
}
