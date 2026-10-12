import { describe, expect, it } from 'vitest'
import { seedanceFinalSectionErrors } from './seedanceFinalSection'

const negative = 'NEGATIVE PROMPT\nidentity blending, invented text, watermarks'

describe('Seedance final section boundaries without text rewriting', () => {
  it.each([
    negative,
    'CAMERA\nStatic.\n' + negative,
    'AUDIO: dry dialogue\nnegative prompt: unwanted music',
    '  Camera — keep the authored side.\r\n  NEGATIVE PROMPT : drift\r\n  watermarks  ',
    'SHOT 1 · 0.0–2.0s\nAct.\nHARD CUT.\nSHOT 2 — 2.0–5.0s\nReact.\n' + negative,
    'SHOT 1 / BEAT 2 · 2.0–5.0s\nContinue.\n' + negative,
  ])('accepts the existing plain, case, colon and numbered forms (%s)', body => {
    const before = body
    expect(seedanceFinalSectionErrors(body)).toEqual([])
    expect(body).toBe(before)
  })

  it.each([
    'ASSISTANT TASK', 'EDIT CONTROL', 'REFERENCE AUTHORITY', 'ACTIVE REFERENCES',
    'REFERENCE MAP', 'REFERENCE ROLES', 'REFERENCE INTRODUCTIONS', 'EDITABLE VARIABLE REGISTRY', 'SUBJECT AND PERFORMANCE',
    'CAMERA', 'CAMERA AND LENS', 'CAMERA POSITION AND OPTICS', 'CAMERA, FRAMING, AND OPTICAL HARD GATE',
    'LENS AND OPTICS', 'OPTICS', 'LIGHTING', 'LIGHTING AND LOOK', 'LIGHTING & INTEGRATION',
    'WORLD AND LIGHTING', 'LOOK AND CAPTURE CHARACTER', 'STYLE', 'STYLE PREFIX',
    'FORMAT', 'FORMAT MODE', 'FORMAT AND CUTS', 'SCENE CONTEXT', 'LOCATION MAP', 'FIRST FRAME',
    'TIMELINE AND CONTINUOUS ACTION', 'OPENING-FRAME HARD LOCK', 'IDENTITY AND ANATOMY CONTINUITY',
    'WARDROBE, ACCESSORY, AND PROP CONTINUITY', 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY',
    'STATE LEDGER', 'CONTINUITY', 'AUTHORED CONTINUITY', 'PERFORMANCE', 'PHYSICS',
    'AUDIO', 'CHARACTER ACTING', 'VOICES', 'SCRIPTED DIALOGUE', 'LINE ATTRIBUTION',
    'QUALITY', 'POSITIVE CONSTRAINTS', 'POSITIVE LOCKS', 'NATURAL SKIN TEXTURE',
    'FILMIC MOTION RENDERING', 'FINAL-FRAME AND OUTPUT HARD GATE', 'HARD AVOID',
  ])('rejects the existing %s section after the negative', heading => {
    const body = negative + '\n  ' + heading.toLowerCase() + ': later content'
    expect(seedanceFinalSectionErrors(body)).toEqual([expect.stringContaining('must be the final section')])
  })

  it.each(['SHOT 2', 'SHOT 2 / BEAT 1 · 5.0–7.0s', 'BEAT 3 — Continue.', 'CUT 1: setup', 'PANEL 4 - action', 'CAMERA — Static.'])('rejects a later %s boundary', heading => {
    expect(seedanceFinalSectionErrors(negative + '\n' + heading)).toEqual([expect.stringContaining('follows at line 3')])
  })

  it('counts real headers rather than the last prose mention', () => {
    const body = negative + '\nCAMERA\nDo not render the words NEGATIVE PROMPT.'
    expect(seedanceFinalSectionErrors(body)).toEqual([expect.stringContaining('CAMERA follows at line 3')])
    expect(seedanceFinalSectionErrors('The text mentions NEGATIVE PROMPT as an example.')).toEqual([expect.stringContaining('exact section heading')])
  })

  it('rejects duplicate real headers without reporting a prose mention as a duplicate', () => {
    const body = negative + '\nNEGATIVE PROMPT: unrelated exclusion'
    expect(seedanceFinalSectionErrors(body)).toEqual([expect.stringContaining('headings at lines 1, 3')])
    expect(seedanceFinalSectionErrors(negative + '\nDo not print the heading NEGATIVE PROMPT.')).toEqual([])
  })

  it.each(['NEGATIVE PROMPTS', 'NEGATIVE  PROMPT', 'NEGATIVE\tPROMPT', 'NEGATIVE PROMPT.', '## NEGATIVE PROMPT', '[NEGATIVE PROMPT]', '**NEGATIVE PROMPT**', '__NEGATIVE PROMPT__', '`NEGATIVE PROMPT`', '## **NEGATIVE PROMPTS**'])('rejects malformed negative heading %s without treating it as a valid header', heading => {
    expect(seedanceFinalSectionErrors(heading + '\nDrift.')).toEqual([
      expect.stringContaining('exact section heading'), expect.stringContaining('Unsupported section-heading syntax at line 1'),
    ])
  })

  it.each(['## AUDIO', '[CAMERA]', '## SHOT 2', '**AUDIO**', '`AUDIO`', '__QUALITY__', '*STATE LEDGER*', '_FORMAT_', '## **CAMERA**', 'STATE  LEDGER', 'CAMERA\tAND LENS'])('does not let unsupported later heading markup hide %s', heading => {
    expect(seedanceFinalSectionErrors(negative + '\n' + heading)).toEqual([expect.stringContaining('Unsupported section-heading syntax at line 3')])
  })

  it('leaves arbitrary uppercase exclusions, bullets, quoted mentions and prose alone', () => {
    const body = negative + '\nNO WATERMARKS\n**WATERMARKS**\n`IDENTITY BLENDING`\n__UNWANTED MUSIC__\nIDENTITY BLENDING\nSHOT BLUR\n- CAMERA SHAKE\n"NEGATIVE PROMPT"\nAUDIO distortion is undesirable.\nSHOT 2 should not reset identity.'
    expect(seedanceFinalSectionErrors(body)).toEqual([])
  })

  it('does not require a new layout for legacy bodies on its own; callers select ownership policy', () => {
    expect(seedanceFinalSectionErrors('HARD AVOID\nKeep approved legacy exclusions.')).toEqual([expect.stringContaining('NEGATIVE PROMPT is required')])
  })

  it('does not introduce an empty-content gate or invent exclusion terms', () => {
    expect(seedanceFinalSectionErrors('NEGATIVE PROMPT\n')).toEqual([])
  })

  it('keeps authored multilingual content and whitespace byte-exact', () => {
    const body = '  AUDIO: "欢迎。\r\n慢慢来。"\r\nNEGATIVE PROMPT:\r\n  水印、字幕  \r\n'
    const bytes = Buffer.from(body)
    expect(seedanceFinalSectionErrors(body)).toEqual([])
    expect(Buffer.from(body).equals(bytes)).toBe(true)
  })
})
