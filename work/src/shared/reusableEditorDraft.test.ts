import { describe, expect, it } from 'vitest'
import type { StudioNodeData } from './types'
import { reusableEditorDraft, reusableDraftGenerationAuthority, reusableSaveMustCopyReference } from './reusableEditorDraft'
import { resolveWorkflowInput } from './workflowResolver'

const saved = (kind: StudioNodeData['kind']): StudioNodeData => ({
  kind,
  title: `Saved ${kind}`,
  referenceTag: `@saved-${kind}`,
  referenceAssets: [{ id: `saved-${kind}`, name: `${kind}.png`, path: `/managed/${kind}.png`, url: `${kind}.png`, mimeType: 'image/png', createdAt: '2026-08-26T01:00:00Z', metadata: kind === 'character' ? { characterView: 'front' } : undefined }],
  assetPath: `/managed/${kind}.png`, assetUrl: `${kind}.png`,
  outputPath: `/managed/result-${kind}.png`, outputUrl: `result-${kind}.png`, outputType: 'image',
  generatedResults: [{ id: `result-${kind}`, path: `/managed/result-${kind}.png`, url: `result-${kind}.png`, type: 'image', modelId: 'saved-model' }],
  activeResultIndex: 0,
  prompt: `saved prompt ${kind}`,
  stylePrompt: `saved prompt ${kind}`,
  styleDescription: 'saved style',
  stylePresetId: 'saved-style', styleSavedAt: '2026-08-26T01:00:00Z',
  characterInputMode: 'single',
  characterSheetPath: `/managed/sheet-${kind}.jpg`, characterSheetUrl: `sheet-${kind}.jpg`, characterSheetViews: ['front'],
  imageProvider: 'google', imageModelId: 'saved-model', outputFormat: 'jpeg', imageResolution: '2K',
  semanticAssetLifecycle: { version: 1, status: 'SAVED_VIEW', references: [{ id: `saved-${kind}`, path: `/managed/${kind}.png`, url: `${kind}.png`, source: 'saved', createdAt: '2026-08-26T01:00:00Z' }], selectedId: `saved-${kind}` },
})

const compiledRequestReferences = (data: StudioNodeData) => resolveWorkflowInput('target', [
  { id: 'source', type: 'studio', position: { x: 0, y: 0 }, data },
  { id: 'target', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'image-generator', title: 'Target', prompt: 'Render.' } },
], [{ id: 'source-to-target', source: 'source', sourceHandle: 'media-out', target: 'target', targetHandle: 'reference-in-1' }]).references.map((reference) => reference.path)

describe('reusable semantic Create/Edit draft and request boundary', () => {
  it('makes Create identity-free and Edit the sole protected selected-asset authority for every reusable kind', () => {
    for (const kind of ['character', 'wardrobe', 'element', 'style-reference', 'location'] as const) {
      const create = reusableEditorDraft({ ...saved(kind), semanticReplacementAuthority: { targetAssetId: `saved-${kind}`, token: 'stale-token' } }, 'create')
      expect(create.referenceAssets, kind).toEqual([])
      expect(create.referenceTag, kind).toBeUndefined()
      expect(create.assetPath, kind).toBeUndefined()
      expect(create.assetUrl, kind).toBeUndefined()
      expect(create.outputPath, kind).toBeUndefined()
      expect(create.outputUrl, kind).toBeUndefined()
      expect(create.generatedResults, kind).toBeUndefined()
      expect(create.activeResultIndex, kind).toBeUndefined()
      expect(create.semanticAssetLifecycle, kind).toBeUndefined()
      expect(create.semanticReplacementAuthority, `${kind} Create authority`).toBeUndefined()
      expect(reusableSaveMustCopyReference(create, `saved-${kind}`), `${kind} Create manual source`).toBe(true)
      expect(create.prompt, kind).toBe('')
      expect(create.imageProvider, `${kind} Create provider`).toBeUndefined()
      expect(create.imageModelId, `${kind} Create model`).toBeUndefined()
      expect(create.outputFormat, `${kind} Create format`).toBeUndefined()
      expect(create.imageResolution, `${kind} Create resolution`).toBeUndefined()
      expect(create.characterInputMode, `${kind} Create character mode`).toBeUndefined()
      expect(create.elementInputMode, `${kind} Create element mode`).toBeUndefined()
      expect(reusableDraftGenerationAuthority(create), kind).toEqual({ inputPath: undefined, inputUrl: undefined, references: [] })
      expect(compiledRequestReferences(create), `${kind} Create request`).toEqual([])

      const edit = reusableEditorDraft(saved(kind), 'edit', `token-${kind}`)
      expect(edit.semanticReplacementAuthority, `${kind} Edit authority`).toEqual({ targetAssetId: `saved-${kind}`, token: `token-${kind}` })
      expect(reusableSaveMustCopyReference(edit, `saved-${kind}`), `${kind} Edit target`).toBe(false)
      expect(reusableSaveMustCopyReference(edit, 'different-asset'), `${kind} non-target reference`).toBe(true)
      expect(edit.prompt, kind).toBe(`saved prompt ${kind}`)
      expect(edit.imageProvider, kind).toBe('google')
      expect(edit.imageModelId, kind).toBe('saved-model')
      expect(reusableDraftGenerationAuthority(edit), kind).toEqual({
        inputPath: `/managed/${kind}.png`, inputUrl: `${kind}.png`,
        references: [{ id: `saved-${kind}`, path: `/managed/${kind}.png`, url: `${kind}.png`, protected: true }],
      })
      expect(compiledRequestReferences(edit), `${kind} Edit request`).toContain(`/managed/${kind}.png`)

      const createAgain = reusableEditorDraft(edit, 'create')
      expect(createAgain.semanticReplacementAuthority, `${kind} Create→Edit→Create authority`).toBeUndefined()
      expect(createAgain.referenceAssets, `${kind} Create→Edit→Create references`).toEqual([])
    }
  })
})
