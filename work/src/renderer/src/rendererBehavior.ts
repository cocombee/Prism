import type { Edge } from '@xyflow/react'
import type { ImportedAsset, NodeKind, StudioNode, StudioNodeData, WorkspaceCanvas } from '../../shared/types'
import { mergeLiveGeneratedResults } from '../../shared/workflowRunRecovery'

export type GraphOrigin = { canvasId: string; pageId: string }

const RUNNABLE_NODE_KINDS = new Set<NodeKind>([
  'image-generator', 'image-editor', 'upscaler', 'video-generator', 'voiceover',
  'sound-effects', 'music-generator', 'element', 'location', 'wardrobe',
])

export function isRunnableNodeKind(kind: NodeKind): boolean {
  return RUNNABLE_NODE_KINDS.has(kind)
}

export function duplicateNodeSnapshot(source: StudioNode, id: string, position: StudioNode['position']): StudioNode {
  const duplicate = structuredClone(source)
  return {
    ...duplicate,
    id,
    selected: false,
    position,
    data: {
      ...duplicate.data,
      groupId: undefined,
      runState: 'idle',
      progress: undefined,
      error: undefined,
    },
  }
}

type ReusableSelectorItem = {
  referenceTag?: string
  referenceAssets?: ImportedAsset[]
  outputUrl?: string
}

export function reusableSelectorItemIsActive(data: StudioNodeData, item: ReusableSelectorItem): boolean {
  if (data.outputUrl && item.outputUrl) return data.outputUrl === item.outputUrl
  const activeAssetIds = Array.from(new Set((data.referenceAssets || []).map((asset) => asset.id))).sort()
  const itemAssetIds = Array.from(new Set((item.referenceAssets || []).map((asset) => asset.id))).sort()
  if (activeAssetIds.length || itemAssetIds.length) {
    return activeAssetIds.length === itemAssetIds.length && activeAssetIds.every((assetId, index) => assetId === itemAssetIds[index])
  }
  return Boolean(data.referenceTag && data.referenceTag === item.referenceTag)
}

function reusableSelectorIdentity(node: StudioNode): string {
  const kind = node.data.kind
  const referenceIds = Array.from(new Set((node.data.referenceAssets || []).map((asset) => asset.id))).sort()
  if (referenceIds.length) return `${kind}:references:${referenceIds.join('|')}`
  if (node.data.stylePresetId) return `${kind}:style-preset:${node.data.stylePresetId}`
  if (node.data.assetPath) return `${kind}:asset-path:${node.data.assetPath}`
  if (node.data.outputPath) return `${kind}:output-path:${node.data.outputPath}`
  return `node:${node.id}`
}

export function uniqueReusableSelectorNodes(nodes: StudioNode[]): StudioNode[] {
  const represented = new Set<string>()
  const unique = nodes.filter((node) => {
    const identity = reusableSelectorIdentity(node)
    if (represented.has(identity)) return false
    represented.add(identity)
    return true
  })
  return new Set(nodes.map((node) => node.data.kind)).size === 1
    ? unique.sort((left, right) => reusableSelectorIdentity(left).localeCompare(reusableSelectorIdentity(right)))
    : unique
}

export function reusableSelectorSourceNodes(nodes: StudioNode[]): StudioNode[] {
  return uniqueReusableSelectorNodes(nodes.filter((node) => node.data.selectorDeployment !== true))
}

export function commitGraphToOrigin(
  canvases: WorkspaceCanvas[],
  origin: GraphOrigin,
  nodes: StudioNode[],
  edges: Edge[],
  updatedAt = new Date().toISOString(),
): WorkspaceCanvas[] {
  return canvases.map((canvas) => {
    if (canvas.id !== origin.canvasId) return canvas
    let found = false
    const pages = canvas.pages.map((page) => {
      if (page.id !== origin.pageId) return page
      found = true
      return { ...page, nodes, edges, updatedAt }
    })
    return found ? { ...canvas, pages, updatedAt } : canvas
  })
}

export function sequenceCompletionPatch(
  liveData: StudioNodeData,
  result: NonNullable<StudioNodeData['generatedResults']>[number],
  progress: string,
): Partial<StudioNodeData> {
  const generatedResults = mergeLiveGeneratedResults(liveData.generatedResults || [], [result])
  return {
    sequenceStatus: 'complete',
    runState: 'complete',
    progress,
    outputPath: result.path,
    outputUrl: result.url,
    outputType: result.type,
    modelId: result.modelId,
    generatedResults,
    activeResultIndex: generatedResults.length - 1,
  }
}

export function generatedMediaDeletionPatch(
  liveData: StudioNodeData,
  deletedPath: string,
): Partial<StudioNodeData> {
  const liveResults = liveData.generatedResults || []
  const activeIndex = Math.min(Math.max(liveData.activeResultIndex || 0, 0), Math.max(liveResults.length - 1, 0))
  const activePath = liveResults[activeIndex]?.path
  const generatedResults = liveResults.filter((result) => result.path !== deletedPath)
  const survivingActiveIndex = activePath && activePath !== deletedPath
    ? generatedResults.findIndex((result) => result.path === activePath)
    : -1
  const nextIndex = survivingActiveIndex >= 0
    ? survivingActiveIndex
    : Math.min(activeIndex, Math.max(generatedResults.length - 1, 0))
  const next = generatedResults[nextIndex]
  return {
    generatedResults,
    activeResultIndex: nextIndex,
    outputPath: next?.path,
    outputUrl: next?.url,
    outputType: next?.type,
    modelId: next?.modelId,
  }
}

export function normalizedDiscreteDuration(current: number | undefined, options: readonly number[]): number | undefined {
  if (!options.length) return current
  const duration = current ?? options[0]
  return options.reduce((nearest, option) => Math.abs(option - duration) < Math.abs(nearest - duration) ? option : nearest, options[0])
}

export function generationEstimateFingerprint(data: StudioNodeData, upstream?: unknown): string {
  return JSON.stringify({
    kind: data.kind,
    assetPath: data.assetPath,
    quantity: data.quantity,
    duration: data.duration,
    videoEngine: data.videoEngine,
    resolution: data.resolution,
    imageResolution: data.imageResolution,
    enableWebSearch: data.enableWebSearch,
    imageProvider: data.imageProvider,
    imageModelId: data.imageModelId,
    scale: data.scale,
    voiceEngine: data.voiceEngine,
    upstream,
  })
}

export function styleAssetPreviewUrl(asset: Pick<ImportedAsset, 'mimeType' | 'url'>): string | undefined {
  return asset.mimeType.startsWith('image/') ? asset.url : undefined
}

export async function runAfterSuccessfulFlush(
  flush: () => Promise<boolean>,
  navigate: () => Promise<void>,
): Promise<boolean> {
  if (!await flush()) return false
  await navigate()
  return true
}
