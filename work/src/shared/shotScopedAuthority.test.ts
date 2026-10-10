import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { buildContinuityLedger, seedanceShotSpecSections } from './shotSpec'
import { compileProviderPrompt, compileProviderPromptForSubmission, providerSeedancePayloadCompilation } from './referenceInstructions'
const make = (): GenerationRequest => ({ nodeId: 'fixture', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video', directionLayer: false, prompt: 'Use the authored two-shot sequence.', references: [{ role: 'character', tag: '@mara', path: '/fictional/mara.png', mediaType: 'image', slot: 'reference', characterAuthorityMode: 'complete-dressed-body' }], storyboardShots: [{ panelId: 'one', prompt: 'Hold the empty doorway.', duration: 3, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut', excludedCharacterTags: ['@mara'] }, { panelId: 'two', prompt: '@mara enters.', duration: 3, shotSize: 'medium', camera: 'static', activeCharacterTags: ['@mara'], characterStates: [{ characterTag: '@mara', visibility: 'sharp-foreground' }] }] })
describe('shot-local reference authority and mandatory authored prompt fields', () => {
  it.each(['hard-cut', 'continue'] as const)('retains identity and its adapter binding when a local exclusion precedes later presence (%s)', transition => {
    const request = make(); request.storyboardShots![0].transitionToNext = transition
    const ledger = buildContinuityLedger(request); expect(ledger.global.identities).toContain('@mara'); expect(ledger.shots[0].activeCharacterTags).not.toContain('@mara'); expect(ledger.shots[1].activeCharacterTags).toContain('@mara')
    const authority = seedanceShotSpecSections(request).find(section => section.heading === 'REFERENCE AUTHORITY')!.text
    expect(authority).toContain('@mara'); expect(authority).not.toContain('No external reference authority')
    const payload = providerSeedancePayloadCompilation(request).text; expect(payload).toContain('[Image1]'); expect(payload).not.toContain('@mara'); expect(request.references).toHaveLength(1)
  })
  it('keeps a prior identity when the final shot explicitly excludes its visual presence', () => {
    const request = make(); request.storyboardShots!.reverse()
    const ledger = buildContinuityLedger(request); expect(ledger.global.identities).toContain('@mara'); expect(ledger.shots[0].activeCharacterTags).toContain('@mara'); expect(ledger.shots[1].activeCharacterTags).not.toContain('@mara')
    expect(seedanceShotSpecSections(request).find(section => section.heading === 'REFERENCE AUTHORITY')!.text).toContain('@mara')
  })
  it('still removes an unrelated identity explicitly excluded from every shot', () => {
    const request = make(); for (const shot of request.storyboardShots!) { shot.excludedCharacterTags = ['@mara']; shot.activeCharacterTags = [] }
    expect(buildContinuityLedger(request).global.identities).not.toContain('@mara'); expect(seedanceShotSpecSections(request).find(section => section.heading === 'REFERENCE AUTHORITY')!.text).not.toContain('@mara')
  })
  it('retains an off-camera speaker’s identity while every shot excludes visible presence', () => {
    const request = make(); for (const shot of request.storyboardShots!) { shot.excludedCharacterTags = ['@mara']; shot.activeCharacterTags = []; shot.prompt = 'Hold the empty doorway.' }
    request.storyboardShots![0].dialogueSpans = [{ id: 'off-camera', speakerTag: '@mara', text: 'I am outside.', startPanelId: 'one', endPanelId: 'two', insertAudioPanelIds: ['two'] }]
    expect(buildContinuityLedger(request).global.identities).toContain('@mara'); expect(buildContinuityLedger(request).shots.every(shot => !shot.activeCharacterTags.includes('@mara'))).toBe(true)
    const sections = seedanceShotSpecSections(request); expect(sections.find(section => section.heading === 'REFERENCE AUTHORITY')!.text).toContain('@mara'); expect(sections.find(section => section.heading === 'TIMELINE AND CONTINUOUS ACTION')!.text).toContain('audio continues while mouth may be outside crop')
  })
  it('protects authored performance, optics, variable registry and opening lock without a connected Character/start frame', () => {
    const request: GenerationRequest = { nodeId: 'fixture', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/text-to-video', directionLayer: false, authoredPrompt: 'SUBJECT AND PERFORMANCE\nA courier stops and breathes twice.\nLENS AND OPTICS\n16mm at f/4; rack focus from latch to courier.\nEDITABLE VARIABLE REGISTRY\nRACK = latch to courier\nOPENING-FRAME HARD LOCK\nOpen with a shut door.', prompt: 'A courier arrives.' }
    const sections = seedanceShotSpecSections(request)
    for (const name of ['SUBJECT AND PERFORMANCE', 'LENS AND OPTICS', 'EDITABLE VARIABLE REGISTRY', 'OPENING-FRAME HARD LOCK']) expect(sections.find(section => section.heading === name)?.required).toBe(true)
    const full = compileProviderPrompt(request), required = full.blocks.filter(block => block.required), requiredSize = required.map(block => block.text).join('\n\n').length
    const constrained = compileProviderPrompt(request, { ceiling: Math.max(requiredSize, Math.floor(full.text.length * 0.75)) })
    expect(constrained.text).toContain('16mm at f/4; rack focus from latch to courier.'); expect(constrained.text).toContain('A courier stops and breathes twice.'); expect(constrained.text).toContain('RACK = latch to courier'); expect(constrained.text).toContain('Open with a shut door.')
    expect(constrained.droppedBlocks).not.toContain('LENS AND OPTICS'); expect(constrained.droppedBlocks).not.toContain('SUBJECT AND PERFORMANCE')
    expect(() => compileProviderPromptForSubmission(request, { ceiling: 100 })).toThrow(/budget blocks/)
  })
  it('keeps a Manual master byte-exact independently of shot exclusions', () => {
    const request = make(), master = '  LENS AND OPTICS\n16mm, f/4.\n  '; request.providerPromptOverride = master
    expect(compileProviderPromptForSubmission(request).text).toBe(master)
  })
})
