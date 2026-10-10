import { describe, expect, it } from 'vitest'
import { cinematicDirection, directionInputsFor, storySpine } from './cinematicDirection'
import { resolvedPromptWithReferences } from './referenceInstructions'
import type { GenerationRequest } from './types'

const base: GenerationRequest = { nodeId: 'n1', kind: 'video-generator', prompt: 'A courier crosses a flooded market.' }

describe('cinematic direction layer', () => {
  it('scales the story spine to the clip length instead of emitting one fixed template', () => {
    expect(storySpine(4, 0)).toHaveLength(1)
    expect(storySpine(10, 0)).toHaveLength(3)
    expect(storySpine(20, 0)).toHaveLength(5)
  })

  it('emits authored storyboard controls rather than re-planning them', () => {
    const authored = cinematicDirection({ ...base, storyboardShotCount: 1, storyboardMode: 'single', storyboardShots: [{ prompt: 'Cross the market.', duration: 4, shotSize: 'wide', camera: 'dolly-in' }] })
    expect(authored).toContain('FORMAT MODE')
    expect(authored).toContain('CUT 1')
    expect(authored).toContain('63° wide')
    expect(authored).not.toContain('BEAT 1')
    // Per-shot splitting drops multiPrompt, so the count must survive on its own.
    expect(directionInputsFor({ ...base, storyboardShotCount: 4, multiPrompt: undefined }).hasAuthoredShotPlan).toBe(true)
  })

  it('uses connected Style without inventing fixtures or a photographic medium', () => {
    const styled = cinematicDirection({ ...base, stylePrompt: 'Grounded tungsten interiors.' })
    expect(styled).not.toContain('LIGHTING')
    expect(styled).toContain('Grounded tungsten interiors.')
    expect(styled).not.toContain('5600K')
    expect(styled).toContain('STYLE')
    expect(cinematicDirection(base)).not.toContain('Photoreal live-action, fine film grain, 8K master.')
  })

  it('quantifies an authored camera recipe', () => {
    const directed = cinematicDirection({ ...base, storyboardShots: [{ prompt: 'Advance.', duration: 3, shotSize: 'medium', camera: 'dolly-in' }] })
    expect(directed).toContain('CAMERA')
    expect(directed).toContain('Dolly physically toward the subject on the viewing axis; preserve parallax and the authored pace through the selected endpoint; decelerate or hold only where authored. Speed and distance remain authored or unspecified.')
    expect(directed).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:m\/s|metres?|meters?)\b/i)
    expect(directed).not.toContain('Choose one motivated move')
  })

  it('surfaces an authored opening anchor without inventing an ending path', () => {
    const anchored = cinematicDirection({ ...base, references: [{ role: 'reference', tag: '@opening', description: 'courier centered beneath the awning', slot: 'start' }] })
    expect(anchored).toContain('FIRST FRAME')
    expect(anchored).toContain('@opening is the exact opening composition')
    expect(anchored).not.toContain('shortest physically coherent path')
  })

  it('adds still-frame direction to image generation and nothing to audio nodes', () => {
    const still = cinematicDirection({ ...base, kind: 'image-generator' })
    expect(still).toContain('LENS AND CAMERA')
    expect(still).not.toContain('MOTION QUALITY')
    expect(still).not.toContain('SINGLE BEAT')
    expect(still).not.toContain('opening frame at the end')
    expect(cinematicDirection({ ...base, kind: 'image-editor' })).toBe('')
    expect(cinematicDirection({ ...base, kind: 'voiceover' })).toBe('')
    expect(cinematicDirection({ ...base, kind: 'upscaler' })).toBe('')
  })

  it('ships inside the resolved provider prompt in production order', () => {
    const resolved = resolvedPromptWithReferences({ ...base, references: [{ role: 'character', tag: '@courier', description: 'red rain coat', slot: 'reference' }] })
    expect(resolved.indexOf('SCENE CONTEXT')).toBeLessThan(resolved.indexOf('ACTIVE REFERENCES'))
    expect(resolved.indexOf('ACTIVE REFERENCES')).toBeLessThan(resolved.indexOf('POSITIVE LOCKS'))
    expect(resolved).not.toContain('5600K')
    expect(resolved).toContain('@courier')
  })

  it('lets each node refuse the Direction Layer while keeping undefined and true default-on', () => {
    expect(cinematicDirection({ ...base, directionLayer: false })).toBe('')
    const refused = resolvedPromptWithReferences({ ...base, directionLayer: false })
    expect(refused).not.toContain('LIGHTING')
    expect(refused).toContain('POSITIVE LOCKS')
    expect(cinematicDirection({ ...base, directionLayer: undefined })).toBe(cinematicDirection(base))
    expect(cinematicDirection({ ...base, directionLayer: true })).toBe(cinematicDirection(base))
  })

  it('caps every composed Direction Layer at 600 characters', () => {
    const maximal = cinematicDirection({ ...base, storyboardShotCount: 4, aspectRatio: '21:9', references: [
      { role: 'style', slot: 'reference' },
      { role: 'character', slot: 'reference' },
      { role: 'element', slot: 'reference' },
      { role: 'reference', authority: 'motion-camera', mediaType: 'video', slot: 'reference' },
      { role: 'reference', authority: 'audio-timing', mediaType: 'audio', slot: 'reference' },
      { role: 'reference', slot: 'start' },
      { role: 'reference', slot: 'end' },
    ] })
    expect(maximal.length).toBeLessThanOrEqual(600)
  })
})
