import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { assertGenerationRequirements, formatRequirementList, generationRequirementFailures, generationReadinessTooltip } from './generationReadiness'

const request = (kind: GenerationRequest['kind'], patch: Partial<GenerationRequest> = {}): GenerationRequest => ({ nodeId: 'test', kind, ...patch })

describe('node-specific Play readiness', () => {
  it('blocks an unsupported saved video model before main can dispatch a different route', () => {
    const unsupported = request('video-generator', { prompt: 'Follow this motion.', videoEngine: 'higgsfield/genjutsu/motion-transfer/v1.0' })
    expect(generationReadinessTooltip(unsupported).disabled).toBe(true)
    expect(() => assertGenerationRequirements(unsupported)).toThrow(/supported video model/i)
  })

  it('lists every missing Image Editor requirement instead of a generic failure', () => {
    expect(generationRequirementFailures(request('image-editor'))).toEqual([
      'add an edit instruction',
      'connect or import at least one source image',
    ])
  })

  it('distinguishes start and end requirements for a first-last video model', () => {
    const readiness = generationReadinessTooltip(request('video-generator', { prompt: 'Transition coherently.', videoEngine: 'fal-ai/veo3.1/first-last-frame-to-video' }))
    expect(readiness.disabled).toBe(true)
    expect(readiness.tooltip).toContain('starting image')
    expect(readiness.tooltip).toContain('ending image')
  })

  it('explains that an audio-only Seedance reference graph still needs a visual reference', () => {
    expect(generationRequirementFailures(request('video-generator', {
      prompt: 'Match the dialogue timing.',
      videoEngine: 'bytedance/seedance-2.0/reference-to-video',
      references: [{ role: 'reference', path: '/project/dialogue.wav', mediaType: 'audio', slot: 'reference' }],
    }))).toContain('connect at least one image or video alongside the audio reference')
  })

  it('requires both text and a voice identity for Fish Audio', () => {
    expect(generationRequirementFailures(request('voiceover', { voiceEngine: 'fish-audio' }))).toEqual([
      'add voiceover text',
      'add a Fish Audio voice Reference ID',
    ])
  })

  it('marks a fully configured image generation ready', () => {
    expect(generationReadinessTooltip(request('image-generator', { prompt: 'A quiet coastal workshop.' }))).toEqual({
      disabled: false,
      tooltip: 'Run — all required inputs and settings are ready.',
    })
  })

  it('blocks provider submission for every blank Storyboard panel with exact readiness', () => {
    const draft = request('video-generator', {
      prompt: 'Structured draft remains previewable.',
      videoEngine: 'bytedance/seedance-2.0/text-to-video',
      storyboardIncompletePanels: [1, 3],
    })
    expect(generationRequirementFailures(draft)).toEqual([
      'Storyboard panel 1 is blank — describe its action',
      'Storyboard panel 3 is blank — describe its action',
    ])
    expect(() => assertGenerationRequirements(draft)).toThrow(
      'Cannot run: Storyboard panel 1 is blank — describe its action; Storyboard panel 3 is blank — describe its action.',
    )
  })

  it('uses the selected image model reference budget instead of a universal cap', () => {
    const references = Array.from({ length: 15 }, (_, index) => ({ role: 'reference' as const, path: `/project/view-${index}.png`, mediaType: 'image' as const }))
    expect(generationRequirementFailures(request('image-generator', { prompt: 'Preserve the character.', imageProvider: 'openai', imageModelId: 'gpt-image-2', references }))).toEqual([])
    expect(generationRequirementFailures(request('image-generator', { prompt: 'Preserve the character.', imageProvider: 'google', imageModelId: 'gemini-3.1-flash-image', references }))).toContain('remove 1 image reference (maximum 14 for the selected model)')
    expect(generationRequirementFailures(request('image-generator', { prompt: 'Preserve the character.', imageProvider: 'openai', imageModelId: 'gpt-image-2', references: [...references, { role: 'reference', path: '/project/view-15.png', mediaType: 'image' }, { role: 'reference', path: '/project/view-16.png', mediaType: 'image' }] }))).toContain('remove 1 image reference (maximum 16 for the selected model)')
  })

  it('normalizes provider punctuation when several missing requirements are combined', () => {
    expect(formatRequirementList(['API key is not permitted.', 'add a prompt', 'add a prompt'])).toBe('API key is not permitted; add a prompt')
  })
})
