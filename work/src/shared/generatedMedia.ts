import { mediaRenameStem, normalizeLogicalAssetName } from './assetNaming'
import type { StudioNodeData } from './types'

export type GeneratedResult = NonNullable<StudioNodeData['generatedResults']>[number]

const RESULT_IDENTITY_KINDS = new Set<StudioNodeData['kind']>([
  'image-generator', 'image-editor', 'upscaler', 'video-generator', 'voiceover',
  'sound-effects', 'music-generator', 'output',
])

export function clampedGeneratedResultIndex(data: Pick<StudioNodeData, 'generatedResults' | 'activeResultIndex'>): number {
  const count = data.generatedResults?.length || 0
  return count ? Math.min(Math.max(data.activeResultIndex || 0, 0), count - 1) : 0
}

export function activeGeneratedResult(data: Pick<StudioNodeData, 'generatedResults' | 'activeResultIndex'>): GeneratedResult | undefined {
  return data.generatedResults?.[clampedGeneratedResultIndex(data)]
}

export function generatedResultName(result: GeneratedResult | undefined, fallback = 'asset'): string {
  if (!result) return mediaRenameStem(fallback) || 'asset'
  const pathName = decodeURIComponent(result.path.replace(/\\/g, '/').split('/').pop() || '')
  return mediaRenameStem(result.name || pathName || fallback) || mediaRenameStem(fallback) || 'asset'
}

export function usesGeneratedResultIdentity(data: Pick<StudioNodeData, 'generatedResults'> & Partial<Pick<StudioNodeData, 'kind'>>): boolean {
  return Boolean(data.generatedResults?.length && data.kind && RESULT_IDENTITY_KINDS.has(data.kind))
}

export function activeMediaName(data: Pick<StudioNodeData, 'title'> & Partial<Pick<StudioNodeData, 'kind' | 'generatedResults' | 'activeResultIndex'>>): string {
  return usesGeneratedResultIdentity(data)
    ? generatedResultName(activeGeneratedResult(data), data.title)
    : mediaRenameStem(data.title) || 'asset'
}

export function activeMediaTag(data: Pick<StudioNodeData, 'title'> & Partial<Pick<StudioNodeData, 'kind' | 'referenceTag' | 'generatedResults' | 'activeResultIndex'>>, fallback = 'asset'): string {
  if (!usesGeneratedResultIdentity(data) && data.referenceTag) return data.referenceTag
  const slug = normalizeLogicalAssetName(usesGeneratedResultIdentity(data) ? activeMediaName(data) : data.title || fallback)
  return `@${slug || fallback}`
}
