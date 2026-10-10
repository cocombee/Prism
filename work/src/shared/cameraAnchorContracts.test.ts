import { describe, expect, it } from 'vitest'
import type { GenerationRequest, StoryboardPanel } from './types'
import { visibleProviderPromptBody } from './referenceInstructions'
import { storyboardRewriteInstruction } from './storyboardRewrite'
import { quantifiedCameraRecipe, shotRecipeDetails } from './shotRecipes'

function request(shots: StoryboardPanel[]): GenerationRequest {
  return { nodeId: 'video', kind: 'video-generator', prompt: '', authoredPrompt: '', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: shots.reduce((sum, shot) => sum + Number(shot.duration), 0), storyboardShots: shots as NonNullable<GenerationRequest['storyboardShots']>, references: [], connectionRules: [] }
}

function camera(body: string): string { return body.split('\nCAMERA\n')[1]?.split('\n\nLENS AND OPTICS')[0] || '' }

describe('camera path and support anchor contracts', () => {
  it('defines Dolly Down Slow as one deliberate straight vertical descent with no invented quantities or side migration', () => {
    const exact = 'The camera makes a markedly slow, deliberate dolly straight downward, preserving the authored subject framing and viewing side throughout the descent.'
    expect(shotRecipeDetails('camera', 'dolly-down-slow').text).toBe('Dolly Down Slow')
    expect(quantifiedCameraRecipe('dolly-down-slow')).toBe(exact)
    expect(exact).not.toMatch(/\d|arc|orbit|circl|wrap|lateral|horizontal|drift|roll|yaw|parallax|around|past|across|crane/i)
  })

  it('compiles Dolly Down Slow once as the sole path and lets support settle only at its arrived endpoint', () => {
    const shots: StoryboardPanel[] = [
      { id: 'a', prompt: 'Mara lowers the parcel.', duration: 2, shotSize: 'medium', camera: 'dolly-down-slow', transitionToNext: 'continue' },
      { id: 'b', prompt: 'She sets it down.', duration: 2, shotSize: 'medium', camera: 'handheld-subtle' },
    ]
    const compiled = camera(visibleProviderPromptBody(request(shots)))
    const positive = 'The camera makes a markedly slow, deliberate dolly straight downward, preserving the authored subject framing and viewing side throughout the descent.'
    expect(compiled.match(new RegExp(positive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    expect(compiled).toContain('Support rides only the explicit authored path while preserving authored pace and endpoint state; settle only where authored.')
    expect(compiled).not.toMatch(/return(?:s|ing)? to (?:the )?start|starting composition|speed ramp|push-in|pull-out|new camera side/i)
  })

  it('keeps non-spatial Continue anchored and Cut resets support without carrying prior momentum', () => {
    const continued = camera(visibleProviderPromptBody(request([
      { id: 'a', prompt: 'Mara listens.', duration: 2, shotSize: 'medium', camera: 'handheld', transitionToNext: 'continue' },
      { id: 'b', prompt: 'She answers.', duration: 2, shotSize: 'medium', camera: 'shoulder-rig' },
    ])))
    expect(continued).toContain('Non-spatial Continue preserves the current authored anchor; it does not imply travel.')
    expect(continued).not.toMatch(/Continue physically from the prior camera endpoint/)
    const cut = camera(visibleProviderPromptBody(request([
      { id: 'a', prompt: 'Mara listens.', duration: 2, shotSize: 'medium', camera: 'handheld', transitionToNext: 'hard-cut' },
      { id: 'b', prompt: 'A new angle finds Jo.', duration: 2, shotSize: 'wide', camera: 'handheld-intense' },
    ])))
    expect(cut).toContain("Cut resets the support anchor to the new shot's authored viewpoint, framing, angle, and camera side; no prior momentum, path, or recovery carries across.")
  })

  it('gives Revamp one Dolly Down Slow policy with exact path precedence and no expansion language', () => {
    const instruction = storyboardRewriteInstruction([{ id: 'a', prompt: 'Mara lowers the parcel.', duration: 3, shotSize: 'medium', camera: 'dolly-down-slow' }], 'a')
    expect(instruction.match(/DOLLY DOWN SLOW POLICY \(HIDDEN\)/g)).toHaveLength(1)
    expect(instruction).toContain('The camera makes a markedly slow, deliberate dolly straight downward, preserving the authored subject framing and viewing side throughout the descent.')
    expect(instruction).toContain('Do not expand it with around, past, across, wrapping, crane-around, speed ramps, new subject movement, push/pull/lateral reframing, or a new camera side.')
  })
})
