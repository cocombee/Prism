import { describe, expect, it } from 'vitest'
import { CHARACTER_COMPLETION_VIEWS, characterCompletionPrompt, singleCharacterSheetPrompt } from './characterViews'

describe('Character completion views', () => {
  it('names and constrains the paired three-quarter views by side', () => {
    const threeQuarter = CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'three-quarter')
    const profile = CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'profile')

    expect(threeQuarter?.framing).toContain('exactly 45 degrees toward camera-right')
    expect(threeQuarter?.framing).toContain('far cheek visibly foreshortened')
    expect(threeQuarter?.framing).toContain('not frontal and not near-profile')
    expect(threeQuarter?.label).toBe('Right Three-Quarter')
    expect(profile?.framing).toContain('exactly 90-degree yaw facing left')
    expect(profile?.framing).toContain('only the near eye visible')
    expect(profile?.framing).toContain('no far eye visible')
    expect(CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'left-three-quarter')?.label).toBe('Left Three-Quarter')
  })

  it('adds the opposite three-quarter and the two full-body evidence views last', () => {
    expect(CHARACTER_COMPLETION_VIEWS.map((view) => view.id)).toEqual([
      'front', 'three-quarter', 'profile', 'full-body', 'back', 'smile',
      'left-three-quarter', 'side-body', 'full-body-back',
    ])
    expect(CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'left-three-quarter')?.framing).toContain('camera-left')
    expect(CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'side-body')?.framing).toContain('full body true side profile')
    expect(CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'full-body-back')?.framing).toContain('full body straight rear view')
  })

  it('makes every completion compare its assigned panel with all supplied views', () => {
    const profile = CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'profile')!
    const prompt = characterCompletionPrompt(profile, ['front', 'three-quarter'], 'Keep the black jersey unchanged.')

    expect(prompt).toContain('Generate exactly one missing assigned panel: Profile.')
    expect(prompt).toContain('exactly 90-degree yaw facing left')
    expect(prompt).toContain('Panels already supplied or completed: Face, Right Three-Quarter.')
    expect(prompt).toContain('Do not recreate, replace, copy, or mirror any supplied panel.')
    expect(prompt).toContain('If it resembles another assigned panel, correct the yaw, expression, or framing.')
    expect(prompt).toContain('User character guidance: Keep the black jersey unchanged.')
  })

  it('preserves the intentional front-axis Smile while requiring a distinct expression', () => {
    const smile = CHARACTER_COMPLETION_VIEWS.find((view) => view.id === 'smile')!
    const prompt = characterCompletionPrompt(smile, ['front'])

    expect(prompt).toContain('Smile intentionally shares the Face panel camera axis')
    expect(prompt).toContain('natural smile and visible teeth')
    expect(prompt).not.toContain('target camera angle and crop must be unmistakably different')
  })

  it('gives every orientation a measurable yaw or view-specific distinction', () => {
    const framing = Object.fromEntries(CHARACTER_COMPLETION_VIEWS.map((view) => [view.id, view.framing]))
    expect(framing.front).toContain('0-degree yaw')
    expect(framing['three-quarter']).toContain('45 degrees toward camera-right')
    expect(framing.profile).toContain('90-degree yaw')
    expect(framing.back).toContain('180-degree yaw')
    expect(framing['left-three-quarter']).toContain('45 degrees toward camera-left')
    expect(framing['side-body']).toContain('90-degree yaw')
    expect(framing['full-body-back']).toContain('180-degree yaw')
    expect(framing.smile).toContain('different expression from the neutral Face panel')
  })

  it('builds one ordered nine-angle composite instruction for Single mode', () => {
    const prompt = singleCharacterSheetPrompt('Keep the navy shirt and beige trousers unchanged.')

    expect(prompt).toContain('Generate exactly one image containing a 3-by-3 Character reference sheet')
    expect(prompt).toContain('Face, Right Three-Quarter, Profile, Full Body Front, Back Face, Smiling, Left Three-Quarter, Side Body, Back Body')
    expect(prompt).toContain('all nine panels belong to the exact same person')
    expect(prompt).toContain('Return one composite image only')
    expect(prompt).toContain('User character guidance: Keep the navy shirt and beige trousers unchanged.')
  })
})
