import { describe, expect, it } from 'vitest'
import type { CharacterView, StudioNodeData } from '../../shared/types'
import { estimatedGenerationSeconds, formatGenerationTimeLeft, generationActionState, hasGeneratedResult } from './runPresentation'

const node = (kind: StudioNodeData['kind'], overrides: Partial<StudioNodeData> = {}): StudioNodeData => ({ kind, title: kind, ...overrides })

describe('generation run presentation', () => {
  it('scales video estimates with duration, resolution, model family, and quantity', () => {
    expect(estimatedGenerationSeconds(node('video-generator', { videoEngine: 'fal-ai/bytedance/seedance/v1/pro', duration: 10, resolution: '1080p', quantity: 2 }))).toBe(598)
  })

  it('uses the slower video path for video upscaling', () => {
    expect(estimatedGenerationSeconds(node('upscaler', { upscalerModel: 'realesrgan-video' }))).toBe(180)
    expect(estimatedGenerationSeconds(node('upscaler', { upscalerModel: 'clarity-image' }))).toBe(75)
  })

  it('prefers learned matching-run evidence over a cold-start heuristic', () => {
    expect(estimatedGenerationSeconds(node('image-generator', { learnedGenerationSeconds: 43 }))).toBe(43)
  })

  it('estimates only missing reusable views', () => {
    const view = (characterView: CharacterView) => ({ id: characterView, name: characterView, path: `/${characterView}.png`, mimeType: 'image/png', origin: 'generated' as const, createdAt: '', metadata: { characterView } })
    expect(estimatedGenerationSeconds(node('character', { referenceAssets: [view('front')] }))).toBe(560)
    expect(estimatedGenerationSeconds(node('character', { referenceAssets: (['front', 'three-quarter', 'profile', 'full-body', 'back', 'smile'] as CharacterView[]).map(view) }))).toBe(210)
  })

  it('formats a live remaining-time label and an exceeded state', () => {
    expect(formatGenerationTimeLeft(130)).toBe('Estimated 2m 10s left')
    expect(formatGenerationTimeLeft(9)).toBe('Estimated 9s left')
    expect(formatGenerationTimeLeft(0)).toBe('Finishing… · estimate exceeded')
  })

  it('keeps Rerun whenever prior generated media survives an error, stop, or reload', () => {
    expect(generationActionState(node('image-generator', { runState: 'error', outputUrl: 'prism-asset://existing-image' }))).toBe('rerun')
    expect(generationActionState(node('image-generator', { runState: 'idle', outputPath: '/project/existing-image.png', progress: 'Generation stopped' }))).toBe('rerun')
    expect(generationActionState(node('video-generator', { runState: 'idle', generatedResults: [{ path: '/project/existing-video.mp4', url: '', type: 'video', modelId: 'test-video' }] }))).toBe('rerun')
    expect(hasGeneratedResult(node('image-generator', { runState: 'complete' }))).toBe(false)
    expect(generationActionState(node('image-generator', { runState: 'error' }))).toBe('run')
  })

  it('temporarily presents Stop over an existing result only while a rerun is active', () => {
    expect(generationActionState(node('image-generator', { runState: 'running', outputUrl: 'prism-asset://existing-image' }))).toBe('stop')
    expect(generationActionState(node('image-generator', { runState: 'queued', outputUrl: 'prism-asset://existing-image' }))).toBe('stop')
  })
})
