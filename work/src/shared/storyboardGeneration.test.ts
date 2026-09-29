import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import * as storyboardGeneration from './storyboardGeneration'

describe('Storyboard image generation', () => {
  it('builds one compiled sheet containing every panel and resolved context exactly once', () => {
    const storyboard = { id: 'storyboard', data: { kind: 'storyboard', title: 'Sequence' } } as StudioNode
    const request = storyboardGeneration.buildStoryboardSheetImageRequest(storyboard, [{
      id: 'panel-1', prompt: 'A runner crosses the rain-soaked street.', duration: 1, shotSize: 'wide', camera: 'slow-dolly-in', audioCue: 'distant traffic',
    }, {
      id: 'panel-2', prompt: 'The runner reaches the station.', duration: 1, shotSize: 'detail', camera: 'static',
    }], {
      prompt: 'Style Direction @noir: restrained monochrome film grain.',
      references: [{ role: 'character', path: '/project/runner.png', tag: '@runner', mediaType: 'image', slot: 'reference' }],
      connectionRules: [{ tag: '@runner', label: 'Character', rule: 'Preserve identity.' }],
      offlineSemanticSources: [],
    })

    expect(storyboardGeneration).not.toHaveProperty('buildStoryboardPanelImageRequest')
    expect(request).not.toHaveProperty('storyboardImageMode')
    expect(request).toMatchObject({ kind: 'image-generator', imageProvider: 'fal', aspectRatio: '16:9', imageResolution: '2K', quantity: 1 })
    expect(request.prompt).toContain('exactly 2 clearly separated numbered panels')
    expect(request.prompt).toContain('Panel 1 · Duration: 1s · Shot Size: wide · Camera: slow-dolly-in · Audio Cue: distant traffic · A runner crosses the rain-soaked street.')
    expect(request.prompt).toContain('Panel 2 · Duration: 1s · Shot Size: detail · Camera: static · The runner reaches the station.')
    expect(request.prompt?.match(/restrained monochrome film grain/g)).toHaveLength(1)
    expect(request.references).toHaveLength(1)
    expect(request.connectionRules).toHaveLength(1)
  })

  it('fingerprints every authored compile input while ignoring transient panel media', () => {
    const base = {
      kind: 'storyboard' as const,
      title: 'Sequence',
      storyboardModelId: 'fal-ai/nano-banana-pro',
      storyboardMode: 'single' as const,
      storyboardDuration: 6,
      storyboardPanels: [{ id: 'panel-1', prompt: 'Opening shot', duration: 6, asset: { id: 'transient', name: 'Transient', path: '/transient.png', mimeType: 'image/png', createdAt: '2026-08-21T00:00:00.000Z' } }],
    }
    const fingerprint = storyboardGeneration.storyboardCompileFingerprint(base)

    expect(storyboardGeneration.storyboardCompileFingerprint({ ...base, storyboardPanels: [{ ...base.storyboardPanels[0], asset: undefined }] })).toBe(fingerprint)
    expect(storyboardGeneration.storyboardCompileFingerprint({ ...base, storyboardPanels: [{ ...base.storyboardPanels[0], prompt: 'Edited shot' }] })).not.toBe(fingerprint)
    expect(storyboardGeneration.storyboardCompileFingerprint({ ...base, storyboardDuration: 8 })).not.toBe(fingerprint)
    expect(storyboardGeneration.storyboardCompileFingerprint({ ...base, storyboardModelId: 'fal-ai/seedream-v4' })).not.toBe(fingerprint)
  })
})
