import type { StudioNodeData } from './types'

const SEMANTIC_KINDS = new Set(['character', 'element', 'location', 'wardrobe', 'style-reference'])

function legacyId(prefix: string, path: string): string {
  return `${prefix}:${encodeURIComponent(path)}`
}

type GeneratedResult = NonNullable<StudioNodeData['generatedResults']>[number]

function validGeneratedImages(results: StudioNodeData['generatedResults']): GeneratedResult[] {
  return (results || []).filter((result) => Boolean(result.id && result.path && result.url && result.type === 'image'))
}

function lifecycleSteadyStatus(data: StudioNodeData): NonNullable<StudioNodeData['semanticAssetLifecycle']>['status'] {
  const references = migrateSemanticAssetLifecycleMetadata(data).semanticAssetLifecycle?.references || []
  return references.some((reference) => reference.source === 'generated')
    ? 'RESULTS_READY'
    : references.length === 1 && references[0].source === 'saved'
      ? 'SAVED_VIEW'
      : references.length ? 'REFERENCE_READY' : 'EMPTY'
}

export function semanticAssetGenerationStartedPatch(data: StudioNodeData): Partial<StudioNodeData> {
  const migrated = migrateSemanticAssetLifecycleMetadata(data)
  return { semanticAssetLifecycle: migrated.semanticAssetLifecycle ? { ...migrated.semanticAssetLifecycle, status: 'GENERATING', pendingSave: undefined } : undefined }
}

export function semanticAssetGenerationStoppedPatch(data: StudioNodeData): Partial<StudioNodeData> {
  const migrated = migrateSemanticAssetLifecycleMetadata(data)
  return { semanticAssetLifecycle: migrated.semanticAssetLifecycle ? { ...migrated.semanticAssetLifecycle, status: lifecycleSteadyStatus(migrated), pendingSave: undefined } : undefined }
}

export function semanticAssetGenerationPatch(data: StudioNodeData, completed: StudioNodeData['generatedResults']): Partial<StudioNodeData> {
  const previous = validGeneratedImages(data.generatedResults)
  const incoming = validGeneratedImages(completed)
  const generatedResults = [...previous]
  for (const result of incoming) {
    const index = generatedResults.findIndex((candidate) => candidate.id === result.id || candidate.path === result.path)
    if (index >= 0) generatedResults[index] = result
    else generatedResults.push(result)
  }
  const migrated = migrateSemanticAssetLifecycleMetadata({ ...data, generatedResults })
  const selectedId = incoming.at(-1)?.id || migrated.semanticAssetLifecycle?.selectedId
  return {
    generatedResults,
    activeResultIndex: Math.max(0, generatedResults.findIndex((result) => result.id === selectedId)),
    semanticAssetLifecycle: migrated.semanticAssetLifecycle ? { ...migrated.semanticAssetLifecycle, status: generatedResults.length ? 'RESULTS_READY' : lifecycleSteadyStatus(migrated), selectedId, pendingSave: undefined } : undefined,
  }
}

export function migrateSemanticAssetLifecycleMetadata(data: StudioNodeData, options: { recoverTransient?: boolean; clearReplacementAuthority?: boolean } = {}): StudioNodeData {
  const recoveredData = options.clearReplacementAuthority && data.semanticReplacementAuthority
    ? { ...data, semanticReplacementAuthority: undefined }
    : data
  if (!SEMANTIC_KINDS.has(recoveredData.kind)) return recoveredData
  data = recoveredData
  if (data.semanticAssetLifecycle?.version === 1) {
    const persistedReferences = data.semanticAssetLifecycle.references.filter((reference) => reference.source !== 'generated' || Boolean(reference.path && reference.url))
    const generatedReferences = (data.generatedResults || []).filter((result) => result.path && result.url && result.type === 'image').map((result) => ({ id: result.id || legacyId('legacy-generated', result.path), path: result.path, url: result.url, source: 'generated' as const, createdAt: result.createdAt || '' }))
    const references = [...persistedReferences, ...generatedReferences.filter((generated) => !persistedReferences.some((reference) => reference.id === generated.id || reference.path === generated.path))]
    const hasGenerated = references.some((reference) => reference.source === 'generated')
    const addedGenerated = references.length > persistedReferences.length
    const steadyStatus = hasGenerated ? 'RESULTS_READY' : references.length === 1 && references[0].source === 'saved' ? 'SAVED_VIEW' : references.length ? 'REFERENCE_READY' : 'EMPTY'
    const transient = options.recoverTransient !== false && ['GENERATING', 'SAVE_CONFIRMATION', 'SAVE_COMMITTING'].includes(data.semanticAssetLifecycle.status)
    const selectedId = references.some((reference) => reference.id === data.semanticAssetLifecycle?.selectedId) ? data.semanticAssetLifecycle.selectedId : references[0]?.id
    if (!transient && references.length === data.semanticAssetLifecycle.references.length && selectedId === data.semanticAssetLifecycle.selectedId) return data
    return { ...data, semanticAssetLifecycle: { ...data.semanticAssetLifecycle, status: transient || addedGenerated ? steadyStatus : data.semanticAssetLifecycle.status, references, selectedId: addedGenerated ? generatedReferences.at(-1)?.id : selectedId, pendingSave: transient ? undefined : data.semanticAssetLifecycle.pendingSave } }
  }
  const references: NonNullable<StudioNodeData['semanticAssetLifecycle']>['references'] = []
  for (const asset of data.referenceAssets || []) {
    references.push({
      id: asset.id || legacyId('legacy-reference', asset.path),
      path: asset.path,
      url: asset.url,
      source: asset.origin === 'generated' ? 'saved' : 'imported',
      createdAt: asset.createdAt,
    })
  }
  for (const result of (data.generatedResults || []).filter((candidate) => Boolean(candidate.path && candidate.url && candidate.type === 'image'))) {
    references.push({
      id: result.id || legacyId('legacy-generated', result.path),
      path: result.path,
      url: result.url,
      source: 'generated',
      createdAt: result.createdAt || '',
    })
  }
  const generated = references.filter((reference) => reference.source === 'generated')
  const selectedId = generated[data.activeResultIndex || 0]?.id || references[0]?.id
  const status = generated.length ? 'RESULTS_READY' : references.length === 1 && references[0].source === 'saved' ? 'SAVED_VIEW' : references.length ? 'REFERENCE_READY' : 'EMPTY'
  return {
    ...data,
    semanticAssetLifecycle: { version: 1, status, references, selectedId },
  }
}
