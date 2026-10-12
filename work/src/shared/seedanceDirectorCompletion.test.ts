import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { providerPromptPreviewCompilation, providerSeedancePayloadCompilation } from './referenceInstructions'
import { validateSeedanceDirectorPrompt } from './seedanceDirectorValidation'

const base = (overrides: Partial<GenerationRequest> = {}): GenerationRequest => ({
  nodeId: 'director-video',
  kind: 'video-generator',
  prompt: '',
  authoredPrompt: '',
  videoEngine: 'bytedance/seedance-2.5/reference-to-video',
  generateAudio: true,
  references: [
    { role: 'character', tag: '@maya', path: '/maya.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'identity-body-with-layers' },
    { role: 'wardrobe', tag: '@maya-coat', boundCharacterTag: '@maya', path: '/coat.png', mediaType: 'image', slot: 'reference', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement' },
    { role: 'location', tag: '@station', path: '/station.png', mediaType: 'image', slot: 'reference' },
    { role: 'element', tag: '@case', path: '/case.png', mediaType: 'image', slot: 'reference' },
  ],
  ...overrides,
})

describe('local deterministic Seedance Director completion', () => {
  it('completes a never-revamped raw edited Storyboard into per-shot semantic blocks without changing authored panel bytes', () => {
    const first = '@maya wearing @maya-coat enters @station.\nShe sets @case on the bench.'
    const second = '@maya watches @case. Dialogue: “Stay here.”\nRoom tone continues.'
    const request = base({
      storyboardShots: [
        { prompt: first, duration: 3, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' },
        { prompt: second, duration: 2, shotSize: 'medium', camera: 'dolly-in' },
      ],
    })
    const body = providerPromptPreviewCompilation(request).text
    expect(body).toContain('TWO SHOTS, ONE HARD CUT, 5s TOTAL')
    expect(body).toContain(`SHOT 1 · 0.0–3.0s\nPURPOSE / ACTION · ${first}`)
    expect(body).toContain('REFERENCES · @maya; @station; @case; Use @maya as maya.; Use @maya-coat for @maya\'s wardrobe.')
    expect(body).toContain(`SHOT 2 · 3.0–5.0s\nPURPOSE / ACTION · ${second}`)
    expect(body.match(/^HARD CUT\.$/gm)).toHaveLength(1)
    expect(body.trim().endsWith('excessive motion smear')).toBe(true)
    expect(body.indexOf('REFERENCE ROLES')).toBeLessThan(body.indexOf('NEGATIVE PROMPT'))
    expect(body.split('REFERENCE ROLES\n')[1]).toContain('@maya')
    expect(validateSeedanceDirectorPrompt(body, request)).toEqual({ ok: true, knowledgeIds: expect.any(Array) })
  })

  it('keeps a partial authored master once and adds only missing domains with NEGATIVE PROMPT final', () => {
    const authored = 'FORMAT AND CUTS\nTWO SHOTS, ONE HARD CUT, 4s total.\nSHOT 1 — WIDE, 3s\nAuthored first line.\nAuthored second line. HARD CUT.\nSHOT 2 — MEDIUM, 1s\nAuthored ending.'
    const body = providerPromptPreviewCompilation(base({
      prompt: authored,
      authoredPrompt: authored,
      storyboardShots: [
        { prompt: 'Authored first line.\nAuthored second line.', duration: 3, shotSize: 'wide', camera: 'static' },
        { prompt: 'Authored ending.', duration: 1, shotSize: 'medium', camera: 'static' },
      ],
    })).text
    expect(body.match(/FORMAT AND CUTS/g)).toHaveLength(1)
    expect(body.match(/Authored first line\.\nAuthored second line\./g)).toHaveLength(1)
    expect(body.match(/^NEGATIVE PROMPT$/gm)).toHaveLength(1)
    expect(body.indexOf('NEGATIVE PROMPT')).toBeGreaterThan(body.indexOf('FINAL-FRAME AND OUTPUT HARD GATE'))
  })

  it('keeps complete structured and Manual/User masters byte-exact', () => {
    const complete = 'FORMAT MODE\nTWO SHOTS.\nSCENE CONTEXT\nStation.\nACTIVE REFERENCES\n@maya.\nCAMERA\nStatic.\nWORLD AND LIGHTING\nAuthored.\nSTYLE\nAuthored.\nCONTINUITY\nLocked.\nCHARACTER ACTING\nAuthored.\nPHYSICS\nAuthored.\nAUDIO\nAuthored.\nQUALITY\nAuthored.\nSHOT 1\nOne.\nHARD CUT.\nSHOT 2\nTwo.\nNEGATIVE PROMPT\nDrift.'
    expect(providerPromptPreviewCompilation(base({ prompt: complete, authoredPrompt: complete })).text).toBe(complete)
    const manual = 'User bytes\r\n  stay exact.\nNEGATIVE PROMPT\nUser exclusion.'
    expect(providerPromptPreviewCompilation(base({ providerPromptOverride: manual })).text).toBe(manual)
  })

  it('does not evaluate or leak filmic defaults into complete structured or User bodies', () => {
    const complete = 'FORMAT MODE\nTWO SHOTS.\nSCENE CONTEXT\nStation.\nACTIVE REFERENCES\n@maya.\nCAMERA\nStatic.\nWORLD AND LIGHTING\nAuthored.\nSTYLE\nAuthored.\nCONTINUITY\nLocked.\nCHARACTER ACTING\nAuthored.\nPHYSICS\nAuthored.\nAUDIO\nAuthored.\nQUALITY\nAuthored.\nSHOT 1\nOne.\nHARD CUT.\nSHOT 2\nTwo.\nNEGATIVE PROMPT\nLiteral no motion blur remains user-owned.'
    expect(providerPromptPreviewCompilation(base({ prompt: complete, authoredPrompt: complete, shutterAngle: 180 })).text).toBe(complete)
    const user = 'Literal no motion blur remains User-owned.\r\nNo generated defaults.'
    expect(providerPromptPreviewCompilation(base({ providerPromptOverride: user, shutterAngle: 180 })).text).toBe(user)
  })

  it('renders all-Continue as one shot with contiguous beats, references once, and no invented camera magnitudes or universal look', () => {
    const request = base({
      references: [{ role: 'character', tag: '@maya', path: '/maya.png', mediaType: 'image', slot: 'reference' }],
      storyboardShots: [
        { prompt: '@maya opens the door.', duration: 2, shotSize: 'wide', camera: 'dolly-in', transitionToNext: 'continue' },
        { prompt: '@maya crosses the room.', duration: 3, shotSize: 'medium', camera: 'pan-right' },
      ],
    })
    const body = providerPromptPreviewCompilation(request).text
    expect(body).toContain('CONTINUOUS WAYPOINT TAKE, ONE UNBROKEN SHOT, 5s TOTAL')
    expect(body).toContain('BEAT 1 · 0.0–2.0s')
    expect(body).toContain('BEAT 2 · 2.0–5.0s')
    expect(body).not.toMatch(/^SHOT\s+\d+/gm)
    expect(body).not.toContain('HARD CUT.')
    expect(body.match(/REFERENCES · @maya/g)).toHaveLength(1)
    expect(body).toContain('Shot size describes subject framing independently of focal length and lens projection.')
    expect(body).not.toMatch(/6 m\/s|12°\/s|10%\/s|settle for 0\.5 s|Photoreal live-action capture/)
  })

  it('preserves authored sad/crying performance bytes and adds only neutral observable reaction guidance', () => {
    const authored = '@maya is sad and crying quietly, gaze lowered; tears remain visible as she steadies her breath.'
    const body = providerPromptPreviewCompilation(base({
      references: [{ role: 'character', tag: '@maya', path: '/maya.png', mediaType: 'image', slot: 'reference' }],
      storyboardShots: [{ prompt: authored, duration: 4, shotSize: 'close-up', camera: 'static' }],
    })).text
    expect(body.match(/@maya is sad and crying quietly, gaze lowered; tears remain visible as she steadies her breath\./g)).toHaveLength(1)
    expect(body).toContain('ENDPOINT / REACTION · Keep the authored consequence and reaction readable within this interval; follow authored motion through its boundary, and settle or hold only where authored.')
    expect(body).not.toContain('CONTINUITY · Preserve authored incoming state')
    expect(body).not.toContain('BOUNDARY ')
    expect(body).not.toMatch(/more sad|less sad|intensify|\btranslate\b|weep|sobbing|6 m\/s|12°\/s|10%\/s|settle for 0\.5 s/i)
  })

  it('keeps semantic tags visible while translating only submitted adapter attachments in order', () => {
    const request = base({ storyboardShots: [{ prompt: '@maya carries @case through @station.', duration: 4, shotSize: 'wide', camera: 'static' }] })
    const visible = providerPromptPreviewCompilation(request).text
    expect(visible).toContain('@maya')
    expect(visible).toContain('@case')
    expect(visible).not.toMatch(/\[(?:Image|Video|Audio)\d+\]/)
    const payload = providerSeedancePayloadCompilation(request).text
    expect(payload).toContain('@Image1')
    expect(payload).toContain('@Image4')
    expect(payload).not.toContain('@maya')
    expect(payload).not.toContain('@case')
  })
})
