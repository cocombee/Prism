import { describe, expect, it } from 'vitest'
import type { StudioNodeData } from '../../shared/types'
import { canRenameNodeAsset, hasMaterializedAsset, IMAGE_RATIOS, NANO_IMAGE_RATIOS, reusableEditorFingerprint } from './NodeCardNext'

const node = (kind: StudioNodeData['kind'], patch: Partial<StudioNodeData> = {}): StudioNodeData => ({ kind, title: kind, ...patch })

describe('node asset identity', () => {
  it('does not label empty generators or empty semantic references as assets', () => {
    expect(hasMaterializedAsset(node('image-generator', { referenceTag: '@legacy-generator', outputPath: '/missing/output.png' }))).toBe(false)
    expect(hasMaterializedAsset(node('video-generator', { referenceTag: '@legacy-video' }))).toBe(false)
    expect(hasMaterializedAsset(node('character', { referenceTag: '@empty-character' }))).toBe(false)
    expect(hasMaterializedAsset(node('style-reference', { referenceTag: '@empty-style' }))).toBe(false)
  })

  it('labels uploaded, generated, referenced, and saved library assets', () => {
    expect(hasMaterializedAsset(node('upload', { assetUrl: 'prism-asset://local/image.png' }))).toBe(true)
    expect(hasMaterializedAsset(node('image-generator', { outputUrl: 'prism-asset://local/result.png' }))).toBe(true)
    expect(hasMaterializedAsset(node('character', { referenceAssets: [{ id: 'character-1', name: 'Hero', path: '/hero.png', url: 'prism-asset://local/hero.png', mimeType: 'image/png', category: 'character', createdAt: '' }] }))).toBe(true)
    expect(hasMaterializedAsset(node('style-reference', { referenceTag: '@cinematic', stylePrompt: 'Cinematic naturalism' }))).toBe(true)
    expect(hasMaterializedAsset(node('storyboard-asset', { storyboardSourceId: 'storyboard-1' }))).toBe(true)
  })

  it('does not treat planning and collection nodes as media assets', () => {
    expect(hasMaterializedAsset(node('prompt', { prompt: 'A city at dusk' }))).toBe(false)
    expect(hasMaterializedAsset(node('storyboard', { storyboardPanels: [] }))).toBe(false)
    expect(hasMaterializedAsset(node('gallery'))).toBe(false)
    expect(hasMaterializedAsset(node('list', { listItems: [] }))).toBe(false)
  })

  it('offers Rename only for user-owned materialized assets, never built-in Style presets', () => {
    expect(canRenameNodeAsset(node('image-generator', { outputUrl: 'prism-asset://local/result.png' }))).toBe(true)
    expect(canRenameNodeAsset(node('character', { referenceAssets: [{ id: 'character-1', name: 'Hero', path: '/hero.png', url: 'prism-asset://local/hero.png', mimeType: 'image/png', category: 'character', createdAt: '' }] }))).toBe(true)
    expect(canRenameNodeAsset(node('style-reference', { referenceTag: '@my-style', stylePrompt: 'My style', styleSavedAt: '2026-08-02' }))).toBe(true)
    expect(canRenameNodeAsset(node('style-reference', { referenceTag: '@cinematic-naturalism', stylePrompt: 'Private preset', stylePresetId: 'cinematic-naturalism' }))).toBe(false)
    expect(canRenameNodeAsset(node('image-generator'))).toBe(false)
    expect(canRenameNodeAsset(node('prompt', { prompt: 'A scene' }))).toBe(false)
  })
})

describe('image aspect-ratio capabilities', () => {
  it('offers both landscape and portrait forms of the 3:2 ratio', () => {
    expect(IMAGE_RATIOS).toContain('3:2')
    expect(IMAGE_RATIOS).toContain('2:3')
    expect(NANO_IMAGE_RATIOS).toContain('3:2')
    expect(NANO_IMAGE_RATIOS).toContain('2:3')
  })
})

describe('reusable editor dirty baseline', () => {
  const face = { id: 'face-1', name: 'Face', path: '/face.png', url: 'prism-asset://local/face.png', mimeType: 'image/png', category: 'character' as const, createdAt: '', metadata: { characterView: 'front' as const } }
  const saved = node('character', { title: 'haji-asri', referenceTag: '@haji-asri', referenceAssets: [face], prompt: 'Black shirt', imageProvider: 'fal', imageModelId: 'fal-ai/nano-banana-pro/edit' })

  it('ignores opening state and transient failures', () => {
    expect(reusableEditorFingerprint({ ...saved, characterEditorOpen: true, error: 'Previous error', progress: 'Hydrating' })).toBe(reusableEditorFingerprint(saved))
  })

  it('detects authored text, model, and assigned-view changes', () => {
    expect(reusableEditorFingerprint({ ...saved, prompt: 'Black shirt with gold trim' })).not.toBe(reusableEditorFingerprint(saved))
    expect(reusableEditorFingerprint({ ...saved, imageModelId: 'openai/gpt-image-2/edit' })).not.toBe(reusableEditorFingerprint(saved))
    expect(reusableEditorFingerprint({ ...saved, referenceAssets: [] })).not.toBe(reusableEditorFingerprint(saved))
  })

  it('persists Single mode and ratio while Multi views survive a round trip', () => {
    const profile = { ...face, id: 'profile-1', name: 'Profile', path: '/profile.png', url: 'prism-asset://local/profile.png', metadata: { characterView: 'profile' as const } }
    const multi = { ...saved, characterInputMode: 'multi' as const, characterAspectRatio: '1:1', referenceAssets: [face, profile] }
    const single = { ...multi, characterInputMode: 'single' as const, characterAspectRatio: '9:16' }
    const reopened = structuredClone(single)
    const restoredMulti = { ...reopened, characterInputMode: 'multi' as const }

    expect(reusableEditorFingerprint(reopened)).toBe(reusableEditorFingerprint(single))
    expect(reusableEditorFingerprint(single)).not.toBe(reusableEditorFingerprint(multi))
    expect(restoredMulti.referenceAssets).toEqual(multi.referenceAssets)
    expect(restoredMulti.referenceAssets.map((asset) => asset.metadata.characterView)).toEqual(['front', 'profile'])
  })

  it('does not treat favorite state or the visible logical name as editor content', () => {
    expect(reusableEditorFingerprint({ ...saved, title: 'Unsaved', referenceTag: '@Unsaved', referenceAssets: [{ ...face, favorite: true }] })).toBe(reusableEditorFingerprint(saved))
  })
})
