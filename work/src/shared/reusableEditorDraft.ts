import type { StudioNodeData } from './types'

export type ReusableEditorSessionMode = 'create' | 'edit'

const cleanResultState: Partial<StudioNodeData> = {
  referenceTag: undefined,
  referenceAssets: [],
  assetPath: undefined,
  assetUrl: undefined,
  outputPath: undefined,
  outputUrl: undefined,
  outputType: undefined,
  generatedResults: undefined,
  activeResultIndex: undefined,
  semanticAssetLifecycle: undefined,
  semanticReplacementAuthority: undefined,
  characterSheetPath: undefined,
  characterSheetUrl: undefined,
  characterSheetViews: undefined,
  modelId: undefined,
  imageProvider: undefined,
  imageModelId: undefined,
  outputFormat: undefined,
  imageResolution: undefined,
  characterInputMode: undefined,
  elementInputMode: undefined,
  runState: 'idle',
  progress: undefined,
  error: undefined,
}

export function reusableEditorDraft(data: StudioNodeData, mode: ReusableEditorSessionMode, replacementToken?: string): StudioNodeData {
  if (mode === 'edit') {
    const selectedId = data.semanticAssetLifecycle?.selectedId
    const selectedSaved = data.semanticAssetLifecycle?.references.find((reference) => reference.id === selectedId && reference.source === 'saved')
    const targetAsset = selectedSaved
      ? data.referenceAssets?.find((asset) => asset.id === selectedSaved.id || asset.path === selectedSaved.path)
      : data.referenceAssets?.[0]
    return {
    ...data,
    semanticReplacementAuthority: targetAsset && replacementToken ? { targetAssetId: targetAsset.id, token: replacementToken } : undefined,
    semanticAssetLifecycle: data.semanticAssetLifecycle
      ? { ...data.semanticAssetLifecycle, status: 'EDITING_SAVED', pendingSave: undefined }
      : data.semanticAssetLifecycle,
    characterEditorOpen: data.kind === 'character' ? true : data.characterEditorOpen,
    styleEditorOpen: data.kind === 'style-reference' ? true : data.styleEditorOpen,
    semanticEditorOpen: ['element', 'location', 'wardrobe'].includes(data.kind) ? true : data.semanticEditorOpen,
    error: undefined,
  }
  }

  const title = data.kind === 'character' ? 'Custom Character'
    : data.kind === 'style-reference' ? 'Custom Style'
      : data.kind === 'location' ? 'Custom Location'
        : data.kind === 'wardrobe' ? 'Custom Wardrobe'
          : 'Custom Element'
  return {
    ...data,
    ...cleanResultState,
    title,
    prompt: '',
    stylePrompt: data.kind === 'style-reference' ? '' : undefined,
    styleDescription: data.kind === 'style-reference' ? '' : data.styleDescription,
    stylePresetId: undefined,
    styleSavedAt: undefined,
    characterRole: undefined,
    characterEditorOpen: data.kind === 'character' ? true : false,
    styleEditorOpen: data.kind === 'style-reference' ? true : false,
    semanticEditorOpen: ['element', 'location', 'wardrobe'].includes(data.kind) ? true : false,
  }
}

export function reusableDraftGenerationAuthority(data: StudioNodeData): {
  inputPath: string | undefined
  inputUrl: string | undefined
  references: Array<{ id: string; path: string; url?: string; protected: true }>
} {
  const selectedId = data.semanticAssetLifecycle?.selectedId
  const selectedLifecycle = data.semanticAssetLifecycle?.references.find((reference) => reference.id === selectedId && reference.source === 'saved')
  const selectedAsset = selectedLifecycle
    ? data.referenceAssets?.find((asset) => asset.path === selectedLifecycle.path) || data.referenceAssets?.[0]
    : data.referenceAssets?.[0]
  if (!selectedAsset) return { inputPath: undefined, inputUrl: undefined, references: [] }
  return {
    inputPath: selectedAsset.path,
    inputUrl: selectedAsset.url,
    references: [{ id: selectedAsset.id, path: selectedAsset.path, url: selectedAsset.url, protected: true }],
  }
}

/** Create and non-target references are copy-only; only the exact active Edit target may be reused. */
export function reusableSaveMustCopyReference(data: StudioNodeData, assetId: string): boolean {
  const authority = data.semanticReplacementAuthority
  return !authority || authority.targetAssetId !== assetId || !authority.token
}
