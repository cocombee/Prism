import type { StudioNode, StudioNodeData } from './types'

export type ListMediaType = 'image' | 'video' | 'audio'

export function generatorBatchType(data: Pick<StudioNodeData, 'kind' | 'outputType'>): ListMediaType | null {
  if (data.kind === 'video-generator') return 'video'
  if (['voiceover', 'sound-effects', 'music-generator'].includes(data.kind)) return 'audio'
  if (['image-generator', 'image-editor', 'upscaler'].includes(data.kind)) return 'image'
  return null
}

export function isBatchGenerator(node: StudioNode): boolean {
  return generatorBatchType(node.data) !== null
}

export function synchronizeListBatchItems(
  existing: NonNullable<StudioNodeData['listItems']>,
  sources: StudioNode[],
): NonNullable<StudioNodeData['listItems']> {
  const manualMedia = existing.filter((item) => !item.sourceNodeId && item.type !== 'text')
  const linked = sources.flatMap((source) => {
    const type = generatorBatchType(source.data)
    if (!type) return []
    const requested = Math.min(4, Math.max(1, source.data.quantity || 1))
    const results = source.data.generatedResults || []
    const count = Math.max(requested, results.length)
    return Array.from({ length: count }, (_, index) => {
      const result = results[index]
      const status = result
        ? 'complete' as const
        : source.data.runState === 'error'
          ? 'failed' as const
          : source.data.runState === 'running' || source.data.runState === 'queued'
            ? 'generating' as const
            : 'pending' as const
      return {
        id: `batch:${source.id}:${index}`,
        type,
        sourceNodeId: source.id,
        sourceResultIndex: index,
        status,
        ...(result ? {
          asset: {
            id: `batch:${source.id}:${index}`,
            name: `${source.data.title || (type === 'image' ? 'Image' : type === 'video' ? 'Video' : 'Audio')} ${index + 1}`,
            path: result.path,
            url: result.url,
            mimeType: type === 'image' ? 'image/png' : type === 'video' ? 'video/mp4' : 'audio/mpeg',
            createdAt: 'workflow',
            category: type,
            origin: 'generated' as const,
            metadata: { modelId: result.modelId },
          },
        } : {}),
      }
    })
  })
  return [...linked, ...manualMedia]
}

export function listItemsSignature(items: NonNullable<StudioNodeData['listItems']>): string {
  return items.map((item) => [item.id, item.type, item.status, item.sourceNodeId, item.sourceResultIndex, item.asset?.path, item.asset?.url].join('|')).join('\n')
}
