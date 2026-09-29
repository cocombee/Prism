import type { ImportedAsset, StudioNode, WorkspaceCanvas } from './types'

export type AssetDeletionTarget = Pick<ImportedAsset, 'id' | 'path' | 'category'>

type AssetDeletionLookup = {
  ids: Set<string>
  paths: Set<string>
}

export type AssetDeploymentPruneResult = {
  canvases: WorkspaceCanvas[]
  affectedNodeCount: number
  affectedPageCount: number
  affectedCanvasCount: number
}

const directlyDeployedReusableKinds = new Set(['character', 'element', 'location', 'wardrobe', 'style-reference'])

function deletionLookup(targets: AssetDeletionTarget[]): AssetDeletionLookup {
  return {
    ids: new Set(targets.map((asset) => asset.id).filter(Boolean)),
    paths: new Set(targets.map((asset) => asset.path).filter(Boolean)),
  }
}

function assetMatches(asset: Pick<ImportedAsset, 'id' | 'path'> | undefined, lookup: AssetDeletionLookup): boolean {
  return Boolean(asset && (lookup.ids.has(asset.id) || lookup.paths.has(asset.path)))
}

function pathMatches(path: string | undefined, lookup: AssetDeletionLookup): boolean {
  return Boolean(path && lookup.paths.has(path))
}

export function nodeDirectlyDeploysAsset(node: StudioNode, targets: AssetDeletionTarget[]): boolean {
  const lookup = deletionLookup(targets)
  if (node.data.kind === 'upload' && pathMatches(node.data.assetPath, lookup)) return true
  if (directlyDeployedReusableKinds.has(node.data.kind) && node.data.referenceAssets?.some((asset) => assetMatches(asset, lookup))) return true
  if (node.data.kind === 'storyboard' && node.data.referenceAssets?.some((asset) => asset.category === 'storyboard' && assetMatches(asset, lookup))) return true
  return false
}

function pruneEmbeddedAssetUses(node: StudioNode, lookup: AssetDeletionLookup): StudioNode {
  let changed = false
  const data = { ...node.data }

  const remainingResults = (data.generatedResults || []).filter((result) => !pathMatches(result.path, lookup))
  if (remainingResults.length !== (data.generatedResults || []).length) {
    changed = true
    const nextIndex = Math.min(data.activeResultIndex || 0, Math.max(remainingResults.length - 1, 0))
    const nextResult = remainingResults[nextIndex]
    data.generatedResults = remainingResults
    data.activeResultIndex = nextIndex
    if (pathMatches(data.outputPath, lookup)) {
      data.outputPath = nextResult?.path
      data.outputUrl = nextResult?.url
      data.outputType = nextResult?.type
      data.modelId = nextResult?.modelId
    }
  } else if (pathMatches(data.outputPath, lookup)) {
    changed = true
    data.outputPath = undefined
    data.outputUrl = undefined
    data.outputType = undefined
  }

  if (pathMatches(data.assetPath, lookup)) {
    changed = true
    data.assetPath = undefined
    data.assetUrl = undefined
  }

  const remainingReferences = (data.referenceAssets || []).filter((asset) => !assetMatches(asset, lookup))
  if (remainingReferences.length !== (data.referenceAssets || []).length) {
    changed = true
    data.referenceAssets = remainingReferences
    if (directlyDeployedReusableKinds.has(data.kind) && remainingReferences.length === 0) {
      data.referenceTag = undefined
      data.characterSheetPath = undefined
      data.characterSheetUrl = undefined
      data.characterSheetViews = undefined
      data.stylePresetId = undefined
      data.styleSavedAt = undefined
      data.progress = undefined
      data.error = undefined
      data.runState = 'idle'
    }
  }

  const remainingListItems = (data.listItems || []).filter((item) => !assetMatches(item.asset, lookup))
  if (remainingListItems.length !== (data.listItems || []).length) {
    changed = true
    data.listItems = remainingListItems
  }

  if (data.storyboardPanels?.some((panel) => assetMatches(panel.asset, lookup))) {
    changed = true
    data.storyboardPanels = data.storyboardPanels.map((panel) => assetMatches(panel.asset, lookup) ? { ...panel, asset: undefined } : panel)
    data.storyboardNeedsCompile = true
  }

  return changed ? { ...node, data } : node
}

export function pruneAssetDeployments(canvases: WorkspaceCanvas[], targets: AssetDeletionTarget[]): AssetDeploymentPruneResult {
  const lookup = deletionLookup(targets)
  let affectedNodeCount = 0
  let affectedPageCount = 0
  let affectedCanvasCount = 0

  const nextCanvases = canvases.map((canvas) => {
    let canvasChanged = false
    const pages = canvas.pages.map((page) => {
      const removedNodeIds = new Set(page.nodes
        .filter((node) => nodeDirectlyDeploysAsset(node, targets) && !directlyDeployedReusableKinds.has(node.data.kind))
        .map((node) => node.id))
      let pageChanged = removedNodeIds.size > 0
      let nodes = page.nodes.filter((node) => !removedNodeIds.has(node.id)).map((node) => {
        const next = pruneEmbeddedAssetUses(node, lookup)
        if (next !== node) {
          pageChanged = true
          affectedNodeCount += 1
        }
        return next
      })
      affectedNodeCount += removedNodeIds.size
      if (!pageChanged) return page
      canvasChanged = true
      affectedPageCount += 1
      const edges = page.edges.filter((edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target))
      nodes = nodes.map((node) => node.selected ? { ...node, selected: false } : node)
      return { ...page, nodes, edges, updatedAt: new Date().toISOString() }
    })
    if (!canvasChanged) return canvas
    affectedCanvasCount += 1
    return { ...canvas, pages, updatedAt: new Date().toISOString() }
  })

  return { canvases: nextCanvases, affectedNodeCount, affectedPageCount, affectedCanvasCount }
}
