import { basename, resolve } from 'node:path'
import type { ImportedAsset, StudioNode, WorkflowDocument } from '../shared/types'
import { mediaFamilyForFile } from '../shared/assetInteraction'

function workflowNodes(document: WorkflowDocument): StudioNode[] {
  return [
    ...document.nodes,
    ...(document.pages || []).flatMap((page) => page.nodes),
    ...(document.canvases || []).flatMap((canvas) => canvas.pages.flatMap((page) => page.nodes)),
  ]
}

function workflowMediaId(path: string): string {
  return `workflow-media:${Buffer.from(resolve(path)).toString('base64url')}`
}

export function workflowMediaAssets(
  document: WorkflowDocument | null,
  indexedAssets: ImportedAsset[],
  mimeForPath: (path: string) => string,
): ImportedAsset[] {
  if (!document) return []
  const indexedPaths = new Set(indexedAssets.map((asset) => resolve(asset.path)))
  const found = new Map<string, ImportedAsset>()

  for (const node of workflowNodes(document)) {
    if (node.data.kind !== 'upload' || !node.data.assetPath) continue
    const path = resolve(node.data.assetPath)
    if (indexedPaths.has(path) || found.has(path)) continue
    const name = basename(path)
    const mimeType = mimeForPath(path)
    const family = mediaFamilyForFile(mimeType, name)
    if (!family) continue
    found.set(path, {
      id: workflowMediaId(path),
      name,
      path,
      url: node.data.assetUrl,
      mimeType,
      category: family,
      origin: 'imported',
      createdAt: document.updatedAt,
    })
  }

  return Array.from(found.values())
}
