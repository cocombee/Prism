import { describe, expect, it } from 'vitest'
import { seedanceAuthoredFields, seedanceShotSpecSections } from './shotSpec'
import { compileProviderPrompt, compileProviderPromptForSubmission, providerPromptPreviewCompilation } from './referenceInstructions'
import type { GenerationRequest } from './types'

const base: GenerationRequest = { nodeId: 'authored-bytes', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/text-to-video', prompt: '', authoredPrompt: '' }

describe('authored field bytes inside incomplete Seedance Auto masters', () => {
  it('retains internal line endings, indentation and repeated spaces inside authored locks and dialogue', () => {
    const identity = '@maya  keeps her approved identity.\r\n  Never swap the speaker.\r\n\r\nKeep natural asymmetry.'
    const wardrobe = '@maya retains the reference wardrobe.\n  Hands  stay on the cup.'
    const action = '0.0–2.0s — @maya says "欢迎，慢慢来。"\n\n2.0–4.0s — "Stay  here."'
    const fields = seedanceAuthoredFields(`IDENTITY AND ANATOMY CONTINUITY\r\n${identity}\r\nWARDROBE, ACCESSORY, AND PROP CONTINUITY\n${wardrobe}\nTIMELINE AND CONTINUOUS ACTION\n${action}`)
    expect(fields.identityContinuity).toBe(identity)
    expect(fields.wardrobeContinuity).toBe(wardrobe)
    expect(fields.timeline).toBe(action)
    const sections = seedanceShotSpecSections({ ...base, authoredPrompt: `IDENTITY AND ANATOMY CONTINUITY\r\n${identity}\r\nWARDROBE, ACCESSORY, AND PROP CONTINUITY\n${wardrobe}\nTIMELINE AND CONTINUOUS ACTION\n${action}` })
    expect(sections.find(section => section.heading === 'IDENTITY AND ANATOMY CONTINUITY')?.text).toBe(identity)
    expect(sections.find(section => section.heading === 'WARDROBE, ACCESSORY, AND PROP CONTINUITY')?.text).toBe(wardrobe)
    expect(sections.find(section => section.heading === 'TIMELINE AND CONTINUOUS ACTION')?.text).toBe(action)
  })

  it('retains multiline inline-heading content and normalizes only structural edges', () => {
    const look = 'Copper finish.\r\n  Violet shadows.\r\n\r\nUneven  paper texture.'
    const fields = seedanceAuthoredFields(`  LOOK AND CAPTURE CHARACTER:  ${look}\r\n\r\nCAMERA: Pan right.\r\n  Keep the same station.\r\n`)
    expect(fields.look).toBe(look)
    expect(fields.camera).toBe('Pan right.\r\n  Keep the same station.')
    expect(seedanceShotSpecSections({ ...base, authoredPrompt: `LOOK AND CAPTURE CHARACTER\n${look}` }).find(section => section.heading === 'LOOK AND CAPTURE CHARACTER')?.text).toBe(look)
  })

  it('does not relabel or normalize Manual and complete structured masters', () => {
    const manual = '  @maya\r\n  says "Stay  here."\r\n'
    expect(providerPromptPreviewCompilation({ ...base, providerPromptOverride: manual }).text).toBe(manual)
    const complete = 'FORMAT MODE\nTWO SHOTS.\nSCENE CONTEXT\nStation.\nACTIVE REFERENCES\n@maya.\nCAMERA\nStatic.\nWORLD AND LIGHTING\nAuthored.\nSTYLE\nInk.\n  Uneven  paper.\nCONTINUITY\nLocked.\nCHARACTER ACTING\nAuthored.\nPHYSICS\nAuthored.\nAUDIO\nAuthored.\nQUALITY\nAuthored.\nSHOT 1\nOne.\nHARD CUT.\nSHOT 2\nTwo.\nNEGATIVE PROMPT\nDrift.'
    expect(providerPromptPreviewCompilation({ ...base, prompt: complete, authoredPrompt: complete }).text).toBe(complete)
  })

  it('preserves selected multiline Style and every authored lock under an irreducible documented budget', () => {
    const style = 'Ink finish.\r\n  Uneven  paper texture.'
    const identity = '@maya keeps her approved identity.\n  Preserve natural asymmetry.'
    const wardrobe = '@maya retains the reference wardrobe.\n  Cup remains in left hand.'
    const scene = 'Window remains closed.\n  Rain rate remains constant.'
    const lighting = 'Red moonlight only.\n  Never add a face fill.'
    const state = 'Cup full before the sip.\nCup remains half-full afterward.'
    const request = { ...base, stylePrompt: style, shotLocks: 'The window latch stays shut.', authoredPrompt: `IDENTITY AND ANATOMY CONTINUITY\n${identity}\nWARDROBE, ACCESSORY, AND PROP CONTINUITY\n${wardrobe}\nSCENE, VEHICLE, AND ENVIRONMENT CONTINUITY\n${scene}\nSTATE LEDGER\n${state}\nLIGHTING\n${lighting}\nTIMELINE AND CONTINUOUS ACTION\n0.0–4.0s — @maya says "欢迎。"` }
    const options = { family: 'seedance' as const, ceiling: 1, ceilingSource: 'documented-test-provider-contract' }
    const bounded = compileProviderPrompt(request, options)
    for (const text of [style, identity, wardrobe, scene, state, lighting, 'The window latch stays shut.', '"欢迎。"']) expect(bounded.text).toContain(text)
    for (const label of ['LIGHTING', 'LOOK AND CAPTURE CHARACTER', 'IDENTITY AND ANATOMY CONTINUITY', 'WARDROBE, ACCESSORY, AND PROP CONTINUITY', 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY']) expect(bounded.droppedBlocks).not.toContain(label)
    expect(bounded.promptBudgetDiagnostic?.blocking).toBe(true)
    expect(() => compileProviderPromptForSubmission(request, options)).toThrow('Prompt budget blocks provider dispatch')
  })

  it('leaves unauthored lighting and look guidance optional', () => {
    const sections = seedanceShotSpecSections(base)
    for (const heading of ['LIGHTING', 'LOOK AND CAPTURE CHARACTER', 'WARDROBE, ACCESSORY, AND PROP CONTINUITY', 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY']) expect(Boolean(sections.find(section => section.heading === heading)?.required)).toBe(false)
  })
})
