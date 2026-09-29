import { describe, expect, it } from 'vitest'
import { compileProviderPrompt, compileProviderPromptForSubmission, providerPromptPreviewCompilation, providerSeedancePayloadCompilation, visibleProviderPromptBody } from './referenceInstructions'
import { buildContinuityLedger, productionShotSpecSections, renderShotSpecSections, seedanceAuthoredFields, seedanceShotSpecSections } from './shotSpec'
import type { GenerationRequest } from './types'

const base: GenerationRequest = {
  nodeId: 'video',
  kind: 'video-generator',
  prompt: 'Two pilots cross the hangar.',
  authoredPrompt: 'Two pilots cross the hangar.',
}

describe('production shot specification', () => {
  it('uses the fixed production order and omits sections without data', () => {
    const headings = productionShotSpecSections({
      ...base,
      storyboardMode: 'separate',
      storyboardShots: [
        { prompt: 'Open on the pilot.', duration: 2, shotSize: 'detail', camera: 'static' },
        { prompt: 'Reveal the hangar.', duration: 3, shotSize: 'wide', camera: 'dolly-out' },
      ],
    }).map((section) => section.heading)
    expect(headings).toEqual([
      'SCENE CONTEXT', 'FORMAT MODE', 'CUT 1', 'CUT 2', 'OPTICS', 'CAMERA', 'ACTION',
      'LIGHTING', 'STYLE', 'FILMIC MOTION RENDERING', 'NEGATIVE PROMPT', 'POSITIVE LOCKS',
    ])
    expect(headings).not.toContain('PERFORMANCE')
    expect(headings).not.toContain('PHYSICS')
  })

  it('rejects zero-duration Storyboard shots before provider compilation without mutating the request', () => {
    const request: GenerationRequest = {
      ...base,
      storyboardMode: 'single',
      storyboardShots: [
        { prompt: 'First authored panel.', duration: 5, shotSize: 'wide', camera: 'static' },
        { prompt: 'Second authored panel.', duration: 0, shotSize: 'medium', camera: 'static' },
      ],
    }
    const expected = 'Storyboard panel 2 is below the minimum 0.5s duration.'
    expect(() => productionShotSpecSections(request)).toThrow(expected)
    expect(() => seedanceShotSpecSections(request)).toThrow(expected)
    expect(request.storyboardShots?.map((shot) => shot.prompt)).toEqual(['First authored panel.', 'Second authored panel.'])
  })

  it('rejects a zero-duration multiPrompt shot without changing prompt order', () => {
    const request: GenerationRequest = {
      ...base,
      multiPrompt: [
        { prompt: 'First multi prompt.', duration: '5' },
        { prompt: 'Second multi prompt.', duration: '0' },
      ],
    }
    const expected = 'Storyboard panel 2 is below the minimum 0.5s duration.'
    expect(() => productionShotSpecSections(request)).toThrow(expected)
    expect(request.multiPrompt?.map((shot) => shot.prompt)).toEqual(['First multi prompt.', 'Second multi prompt.'])
  })

  it('quantifies optics and preserves the unknown fallback without throwing', () => {
    const text = renderShotSpecSections(productionShotSpecSections({
      ...base,
      storyboardShots: [
        { prompt: 'Detail.', duration: 1, shotSize: 'detail', camera: 'static' },
        { prompt: 'Wide.', duration: 1, shotSize: 'wide', camera: 'static' },
        { prompt: 'Unknown.', duration: 1, shotSize: 'future-size', camera: 'future-move' },
      ],
    }))
    expect(text).toContain('8°')
    expect(text).toContain('63°')
    expect(text).toContain('Future Size')
    expect(text.match(/No drift mid-segment\./g)).toHaveLength(1)
  })

  it('derives character headcount, fidelity, sheet exclusions and manual locks', () => {
    const sections = productionShotSpecSections({
      ...base,
      shotLocks: 'hero stays frame-left; door closed until cut 4',
      references: [
        { role: 'character', tag: '@hero', description: 'scar over left brow', slot: 'reference' },
        { role: 'character', tag: '@pilot', description: 'silver flight suit', slot: 'reference' },
      ],
    })
    const active = sections.find((section) => section.heading === 'ACTIVE REFERENCES')!.text
    const locks = sections.find((section) => section.heading === 'POSITIVE LOCKS')!.text
    expect(active.match(/Studio sheet background and layout NOT inherited\./g)).toHaveLength(2)
    expect(locks).toContain('Only 2 people appear.')
    expect(locks).toContain('scar over left brow')
    expect(locks).toContain('hero stays frame-left; door closed until cut 4')
  })

  it('uses authored source descriptions, strips rule markers and isolates the required reference map', () => {
    const sections = productionShotSpecSections({
      ...base,
      stylePrompt: 'Restrained cyan night texture.',
      references: [
        { role: 'character', tag: '@hero', description: 'Scar over left brow.', slot: 'reference' },
        { role: 'style', tag: '@look', description: 'Stale style description.', slot: 'reference' },
      ],
      connectionRules: [
        { tag: '@hero', label: 'Character Identity', rule: 'HARD RULE · overwrite authored identity' },
        { tag: '@element', label: 'Element', rule: 'AUTO RULE · overwrite authored element description' },
      ],
    }, 'SEEDANCE REFERENCE MAP:\n@Image1 = @hero identity')
    const headings = sections.map((section) => section.heading)
    const active = sections.find((section) => section.heading === 'ACTIVE REFERENCES')!.text
    const map = sections.find((section) => section.heading === 'REFERENCE MAP')!
    const locks = sections.find((section) => section.heading === 'POSITIVE LOCKS')!.text
    expect(headings.indexOf('ACTIVE REFERENCES')).toBeLessThan(headings.indexOf('REFERENCE MAP'))
    expect(headings.indexOf('REFERENCE MAP')).toBeLessThan(headings.indexOf('LOCATION MAP') === -1 ? Infinity : headings.indexOf('LOCATION MAP'))
    expect(map.required).toBe(true)
    expect(map.text).toContain('SEEDANCE REFERENCE MAP')
    expect(active).toContain('@hero — Scar over left brow. 100%')
    expect(active).toContain('@look — Style authority. 100%')
    expect(active).not.toContain('Restrained cyan night texture')
    expect(sections.find((section) => section.heading === 'STYLE')!.text).toBe('Restrained cyan night texture.')
    expect(active).not.toMatch(/HARD RULE|AUTO RULE|GUIDE RULE|LOCK RULE/)
    expect(locks).not.toMatch(/HARD RULE|AUTO RULE|GUIDE RULE|LOCK RULE/)
    expect(active).not.toContain('..')
  })

  it('adds video physics after camera and required character performance without adding either to still requests', () => {
    const video = productionShotSpecSections({
      ...base,
      references: [
        { role: 'character', tag: '@hero', description: 'Weathered pilot', slot: 'reference' },
        { role: 'element', tag: '@case', description: 'Brass flight case', slot: 'reference' },
      ],
      storyboardShots: [{ prompt: 'Hero lifts the case.', duration: 2, shotSize: 'medium', camera: 'pull-out' }],
    })
    const headings = video.map((section) => section.heading)
    expect(headings.indexOf('PHYSICS')).toBe(headings.indexOf('CAMERA') + 1)
    expect(video.find((section) => section.heading === 'PHYSICS')!.text).toMatch(/Character:.*Element:/s)
    expect(video.find((section) => section.heading === 'PERFORMANCE')!.required).toBe(true)

    const still = productionShotSpecSections({
      ...base,
      kind: 'image-generator',
      references: [{ role: 'element', tag: '@case', description: 'Brass flight case', slot: 'reference' }],
      storyboardShots: [{ prompt: 'Case on table.', duration: 1, shotSize: 'detail', camera: 'static' }],
    })
    expect(still.map((section) => section.heading)).not.toContain('PHYSICS')
  })

  it('keeps LIGHTING quantified without echoing STYLE verbatim', () => {
    const sections = productionShotSpecSections({ ...base, stylePrompt: 'Copper halation with violet moon haze.' })
    const lighting = sections.find((section) => section.heading === 'LIGHTING')!.text
    const style = sections.find((section) => section.heading === 'STYLE')!.text
    expect(lighting).not.toContain('Copper halation with violet moon haze')
    expect(lighting).toMatch(/5600K.*3200K.*2 stops.*3% haze/)
    expect(style).toBe('Copper halation with violet moon haze.')
  })

  it('gives exact Style wording one owning section for every provider family', () => {
    const stylePrompt = 'Silver-blue halation, restrained contrast, and fine 35mm grain.'
    const families = [
      ['seedance', 'bytedance/seedance-2.0/reference-to-video'],
      ['kling', 'fal-ai/kling-video/o3/standard/reference-to-video'],
      ['veo', 'fal-ai/veo3.1/reference-to-video'],
      ['wan', 'wan-controlled'],
      ['generic', 'wan-controlled'],
    ] as const
    for (const [family, videoEngine] of families) {
      const compiled = compileProviderPrompt({
        ...base,
        videoEngine,
        stylePrompt,
        references: [{ role: 'style', tag: '@look', description: stylePrompt, slot: 'reference' }],
      }, { family })
      expect(compiled.text.match(/Silver-blue halation, restrained contrast, and fine 35mm grain\./g), family).toHaveLength(1)
      expect(compiled.text, family).toContain(family === 'seedance' ? '@look is the Style visual authority' : '@look — Style authority.')
      expect(compiled.text, family).toContain(family === 'seedance' ? 'LOOK AND CAPTURE CHARACTER' : 'STYLE')
    }
  })

  it('never trims POSITIVE LOCKS even beneath a tiny provider ceiling', () => {
    const compiled = compileProviderPrompt({ ...base, shotLocks: 'door closed until cut 4' }, { family: 'wan', ceiling: 1 })
    expect(compiled.text).toContain('POSITIVE LOCKS')
    expect(compiled.text).toContain('door closed until cut 4')
  })

  it('uses the canonical Seedance structure once and keeps its hard gates under trimming', () => {
    const compiled = compileProviderPrompt({
      ...base,
      videoEngine: 'bytedance/seedance-2.0/reference-to-video',
      references: [
        { role: 'character', tag: '@hero', description: 'Scar over left brow', slot: 'reference', view: 'front' },
        { role: 'character', tag: '@hero', description: 'Scar over left brow', slot: 'reference', view: 'three-quarter' },
      ],
      storyboardShots: [{ prompt: 'Hero crosses the hangar.', duration: 4, shotSize: 'wide', camera: 'dolly-in' }],
    }, { legend: { heading: 'SEEDANCE REFERENCE MAP', body: '@Image1 = @hero identity' }, ceiling: 1 })
    expect(compiled.blocks.filter((block) => block.required).map((block) => block.label)).toEqual([
      'ASSISTANT TASK', 'EDIT CONTROL', 'REFERENCE AUTHORITY', 'SUBJECT AND PERFORMANCE', 'CAMERA',
      'TIMELINE AND CONTINUOUS ACTION', 'IDENTITY AND ANATOMY CONTINUITY',
      'CAMERA, FRAMING, AND OPTICAL HARD GATE', 'FINAL-FRAME AND OUTPUT HARD GATE', 'NEGATIVE PROMPT',
    ])
    expect(compiled.text.match(/Scar over left brow/g)).toHaveLength(1)
    expect(compiled.text.match(/@hero is the Character visual authority/g)).toHaveLength(1)
    expect(compiled.text).not.toMatch(/HARD RULE|AUTO RULE|GUIDE RULE|LOCK RULE/)
  })

  it('timecodes connected Storyboard panels cumulatively and does not treat a bare tag as action', () => {
    const compiled = compileProviderPrompt({
      ...base,
      prompt: '@actor-c',
      authoredPrompt: '@actor-c',
      duration: 4,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [{ role: 'character', tag: '@actor-c', slot: 'reference' }],
      storyboardShots: [
        { prompt: 'asdfadfadfa', duration: 3, shotSize: 'wide', camera: 'static' },
        { prompt: 'adsfasdfadsfsadfsdaf', duration: 1, shotSize: 'wide', camera: 'static' },
      ],
    })
    const format = compiled.blocks.find((block) => block.label === 'FORMAT MODE')!.text
    expect(format).toContain('TWO SHOTS, ONE HARD CUT, 4s TOTAL')
    expect(format).toContain('SHOT 1 3s, SHOT 2 1s')
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(timeline).toContain('SHOT 1 · 0.0–3.0s\nPURPOSE / ACTION · asdfadfadfa')
    expect(timeline).toMatch(/SHOT 1 · 0\.0–3\.0s[\s\S]*HARD CUT\.\nSHOT 2 · 3\.0–4\.0s/)
    expect(timeline).toContain('SHOT 2 · 3.0–4.0s\nPURPOSE / ACTION · adsfasdfadsfsadfsdaf')
    expect(timeline).not.toContain('Overall action: @actor-c')
    expect(compiled.text).toContain('SHOT 1: Locked camera; 0 m/s translation.')
    expect(compiled.text).toContain('SHOT 2: Locked camera; 0 m/s translation.')
    expect(compiled.text).toContain('SHOT 1: 63° wide.')
    expect(compiled.text).toContain('SHOT 2: 63° wide.')
    expect(compiled.text).not.toMatch(/\b(?:Segment|CUT) [12]:/)
  })

  it('renders deterministic bridge phases from compiler metadata without provider inference', () => {
    const compiled = compileProviderPrompt({
      ...base,
      duration: 9,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardShots: [
        { prompt: 'The crew faces the enforcers.', duration: 4, shotSize: 'wide', camera: 'static', transitionToNext: 'continue', startSeconds: 0, endSeconds: 4 },
        { prompt: 'Roko rolls into the alley.', duration: 5, shotSize: 'medium', camera: 'dolly-in', startSeconds: 4, endSeconds: 9, incomingBridge: { boundaryIndex: 0, transition: 'continue', kind: 'merged', source: { panelId: 'one', shotSize: 'wide', fovDegrees: 63, camera: 'static', axis: 'locked' }, target: { panelId: 'two', shotSize: 'medium', fovDegrees: 47, camera: 'dolly-in', axis: 'forward' }, fovDeltaDegrees: 16, direction: 'tighter', requiredSeconds: 0.7, reservedSeconds: 0.7, actionReserveSeconds: 2.3, reactionReserveSeconds: 1, authoredMoveCompatible: true, bridgeText: 'Use the authored dolly in once from 63° wide to 47° neutral; settle at target.' } },
      ],
    })
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(timeline).toContain('CAMERA BRIDGE · 4.0–4.7s')
    expect(timeline).toContain('Use the authored dolly in once')
    expect(timeline).toContain('MAIN ACTION · 4.7–8.0s: Roko rolls into the alley.')
    expect(timeline).toContain('ENDPOINT / REACTION · 8.0–9.0s')
  })

  it('compiles Continue as one unbroken waypoint take with timecoded beats and no hard cut', () => {
    const compiled = compileProviderPrompt({
      ...base,
      duration: 15,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardShots: [
        { prompt: 'Oli spots the news camera while the trolley moves.', duration: 3.5, shotSize: 'wide', camera: 'handheld', transitionToNext: 'continue' },
        { prompt: 'The camera pans continuously to the reporter sign-off.', duration: 11.5, shotSize: 'medium', camera: 'pan-right' },
      ],
    })
    const format = compiled.blocks.find((block) => block.label === 'FORMAT MODE')!.text
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    const camera = compiled.blocks.find((block) => block.label === 'CAMERA')!.text

    expect(format).toContain('CONTINUOUS WAYPOINT TAKE, ONE UNBROKEN SHOT, 15s TOTAL')
    expect(timeline).toContain('BEAT 1 · 0.0–3.5s\nPURPOSE / ACTION · Oli spots the news camera')
    expect(timeline).toContain('BEAT 2 · 3.5–15.0s\nPURPOSE / ACTION · CONTINUE IN THE SAME UNBROKEN TAKE.')
    expect(timeline).not.toContain('HARD CUT')
    expect(timeline).not.toContain('SHOT 2')
    expect(camera).toContain('BEAT 1:')
    expect(camera).toContain('BEAT 2:')
    expect(camera).toContain('Continue physically from the prior camera endpoint')
  })

  it('compiles a five-shot continuity ledger with global, point-of-use, and boundary-local contributions', () => {
    const request = {
      ...base,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardMode: 'separate' as const,
      references: [
        { role: 'character' as const, tag: '@misi', description: 'Misi identity', slot: 'reference' as const },
        { role: 'wardrobe' as const, tag: '@misi-red-jacket', boundCharacterTag: '@misi', description: 'Red jacket', slot: 'reference' as const },
        { role: 'location' as const, tag: '@market', description: 'Flooded market', slot: 'reference' as const },
        { role: 'element' as const, tag: '@phone', description: 'Black phone', slot: 'reference' as const },
      ],
      storyboardShots: [
        { prompt: '@misi wearing @misi-red-jacket enters @market.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' as const },
        { prompt: '@misi wearing @misi-red-jacket checks @phone at @market.', duration: 2, shotSize: 'medium', camera: 'dolly-in', transitionToNext: 'hard-cut' as const },
        { prompt: '@misi wearing @misi-red-jacket holds @phone and looks screen-left.', duration: 2, shotSize: 'close-up', camera: 'static', transitionToNext: 'hard-cut' as const },
        { prompt: '@misi wearing @misi-red-jacket turns toward the exit at @market.', duration: 2, shotSize: 'medium', camera: 'pan-right', transitionToNext: 'hard-cut' as const },
        { prompt: '@misi wearing @misi-red-jacket leaves @phone on the crate.', duration: 2, shotSize: 'wide', camera: 'dolly-out' },
      ],
    }
    const compiled = compileProviderPrompt(request)
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(compiled.continuityLedger).toMatchObject({
      mode: 'separate',
      global: { identities: ['@misi'], wardrobe: ['@misi-red-jacket'], locations: ['@market'], props: ['@phone'] },
    })
    expect(compiled.continuityLedger?.shots.map((shot) => shot.tags)).toEqual([
      ['@misi', '@misi-red-jacket', '@market'],
      ['@misi', '@misi-red-jacket', '@market', '@phone'],
      ['@misi', '@misi-red-jacket', '@phone'],
      ['@misi', '@misi-red-jacket', '@market'],
      ['@misi', '@misi-red-jacket', '@phone'],
    ])
    expect(compiled.continuityLedger?.boundaries.map(({ incomingTags, outgoingTags, heldTags }) => ({ incomingTags, outgoingTags, heldTags }))).toEqual([
      {
        outgoingTags: ['@misi', '@misi-red-jacket', '@market'],
        incomingTags: ['@misi', '@misi-red-jacket', '@market', '@phone'],
        heldTags: ['@misi', '@misi-red-jacket', '@market'],
      },
      {
        outgoingTags: ['@misi', '@misi-red-jacket', '@market', '@phone'],
        incomingTags: ['@misi', '@misi-red-jacket', '@phone'],
        heldTags: ['@misi', '@misi-red-jacket', '@phone'],
      },
      {
        outgoingTags: ['@misi', '@misi-red-jacket', '@phone'],
        incomingTags: ['@misi', '@misi-red-jacket', '@market'],
        heldTags: ['@misi', '@misi-red-jacket'],
      },
      {
        outgoingTags: ['@misi', '@misi-red-jacket', '@market'],
        incomingTags: ['@misi', '@misi-red-jacket', '@phone'],
        heldTags: ['@misi', '@misi-red-jacket'],
      },
    ])
    expect(compiled.text.match(/@misi retains exact identity, anatomy, body proportions, and natural asymmetry/g)).toHaveLength(1)
    expect(compiled.text.match(/@misi-red-jacket remains bound to @misi/g)).toHaveLength(1)
    expect(compiled.text.match(/@market retains layout, perspective, scale, environment geometry/g)).toHaveLength(1)
    expect(compiled.text.match(/@phone retains object identity, design, materials, markings/g)).toHaveLength(1)
    expect(timeline).toContain('REFERENCES · @misi wearing @misi-red-jacket; @market')
    expect(timeline).toContain('REFERENCES · @misi wearing @misi-red-jacket; @market; @phone')
    expect(timeline).toContain('REFERENCES · @misi wearing @misi-red-jacket; @phone')
    expect(compiled.continuityLedger?.boundaries).toHaveLength(4)
    expect(timeline).not.toContain('CONTINUITY · Preserve authored incoming state')
    expect(timeline.match(/ENDPOINT \/ REACTION · Complete the authored consequence, keep the reaction readable, decelerate when moving, and hold the selected final composition\./g)).toHaveLength(5)
    expect(timeline).not.toContain('BOUNDARY ')
    expect(compiled.text).not.toMatch(/@Image\d+|@Video\d+|@Audio\d+/)
    expect(compiled.text).toBe(compileProviderPrompt(request).text)
  })

  it('does not invent boundary prose or duplicate full action when boundary metadata is absent', () => {
    const actions = [
      'Mara enters through the flooded market.',
      'Mara checks the black phone.',
      'Mara holds the phone screen-left.',
      'Mara turns toward the exit.',
      'Mara leaves the phone on the crate.',
    ]
    const compiled = compileProviderPrompt({
      ...base,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardMode: 'separate',
      storyboardShots: actions.map((prompt) => ({ prompt, duration: 2, shotSize: 'medium', camera: 'static' })),
    })
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(timeline).not.toContain('BOUNDARY ')
    for (const action of actions) expect(timeline.match(new RegExp(action, 'g'))).toHaveLength(1)
    expect(compiled.continuityLedger?.boundaries.every((boundary) => (
      boundary.incomingState.length === 0 && boundary.outgoingState.length === 0 && boundary.heldState.length === 0
    ))).toBe(true)
  })

  it('serializes explicit typed boundary state in N→N+1 direction and deduplicates it', () => {
    const request = {
      ...base,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardMode: 'separate' as const,
      storyboardShots: [
        { prompt: 'SHOT ONE ACTION MUST STAY ONCE.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' as const, boundaryState: { outgoing: ['Mara ends frame-right', 'Mara ends frame-right'], held: ['@misi-red-jacket', '@misi-red-jacket'] } },
        { prompt: 'SHOT TWO ACTION MUST STAY ONCE.', duration: 2, shotSize: 'medium', camera: 'static', boundaryState: { incoming: ['Mara starts at the phone'], held: ['@misi-red-jacket'] } },
        { prompt: 'SHOT THREE ACTION MUST STAY ONCE.', duration: 2, shotSize: 'close-up', camera: 'static' },
      ],
    } as unknown as GenerationRequest
    const compiled = compileProviderPrompt(request)
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(timeline).toContain('BOUNDARY 1→2 · HARD-CUT · outgoing state: Mara ends frame-right; incoming state: Mara starts at the phone; held: @misi-red-jacket.')
    expect(timeline).not.toContain('outgoing state: SHOT ONE ACTION MUST STAY ONCE.')
    expect(timeline).not.toContain('incoming state: SHOT TWO ACTION MUST STAY ONCE.')
    expect(compiled.continuityLedger?.boundaries[0]).toMatchObject({
      outgoingState: ['Mara ends frame-right'],
      incomingState: ['Mara starts at the phone'],
      heldState: ['@misi-red-jacket'],
    })
    for (const action of ['SHOT ONE ACTION MUST STAY ONCE.', 'SHOT TWO ACTION MUST STAY ONCE.', 'SHOT THREE ACTION MUST STAY ONCE.']) {
      expect(timeline.match(new RegExp(action.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'))).toHaveLength(1)
    }
  })

  it('states semantic references once for a continuous one-shot and does not fabricate per-shot repetition', () => {
    const compiled = compileProviderPrompt({
      ...base,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardMode: 'single',
      references: [{ role: 'character', tag: '@misi', slot: 'reference' }],
      storyboardShots: [
        { prompt: '@misi enters.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'continue' },
        { prompt: '@misi crosses.', duration: 2, shotSize: 'medium', camera: 'dolly-in' },
      ],
    })
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(compiled.continuityLedger?.mode).toBe('continuous')
    expect(timeline.match(/REFERENCES ·/g)).toHaveLength(1)
    expect(timeline).not.toContain('BOUNDARY 1→2 ·')
  })

  it('groups mixed Continue and Cut panels into the correct shot arithmetic', () => {
    const compiled = compileProviderPrompt({
      ...base,
      duration: 9,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardShots: [
        { prompt: 'Follow Oli.', duration: 2, shotSize: 'wide', camera: 'handheld', transitionToNext: 'continue' },
        { prompt: 'Pan to the reporter.', duration: 3, shotSize: 'medium', camera: 'pan-right', transitionToNext: 'hard-cut' },
        { prompt: 'Hold the final sign-off.', duration: 4, shotSize: 'close-up', camera: 'static' },
      ],
    })
    const format = compiled.blocks.find((block) => block.label === 'FORMAT MODE')!.text
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text

    expect(format).toContain('TWO SHOTS, ONE HARD CUT, 9s TOTAL (SHOT 1 5s, SHOT 2 4s)')
    expect(timeline).toContain('SHOT 1 · 0.0–5.0s')
    expect(timeline).toContain('SHOT 1 / BEAT 1 · 0.0–2.0s\nPURPOSE / ACTION · Follow Oli.')
    expect(timeline).toContain('SHOT 1 / BEAT 2 · 2.0–5.0s\nPURPOSE / ACTION · CONTINUE IN THE SAME UNBROKEN TAKE.')
    expect(timeline.match(/HARD CUT\./g)).toHaveLength(1)
    expect(timeline).toContain('SHOT 2 · 5.0–9.0s\nPURPOSE / ACTION · Hold the final sign-off.')
  })

  it('rejects Continue when authored panel prose explicitly demands a hard cut', () => {
    expect(() => compileProviderPrompt({
      ...base,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardShots: [
        { prompt: 'Oli turns to camera. HARD CUT.', duration: 3.5, shotSize: 'wide', camera: 'handheld', transitionToNext: 'continue' },
        { prompt: 'The reporter takes frame.', duration: 11.5, shotSize: 'medium', camera: 'static' },
      ],
    })).toThrow('Continue after Storyboard panel 1 conflicts with its authored HARD CUT.')
  })

  it('emits a selected Cut exactly once when panel prose already ends in HARD CUT', () => {
    const compiled = compileProviderPrompt({
      ...base,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardShots: [
        { prompt: 'Oli finishes the line. HARD CUT.', duration: 3.5, shotSize: 'wide', camera: 'handheld', transitionToNext: 'hard-cut' },
        { prompt: 'The reporter takes frame.', duration: 11.5, shotSize: 'medium', camera: 'static' },
      ],
    })
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(timeline.match(/HARD CUT\./g)).toHaveLength(1)
  })

  it('emits every canonical Seedance heading in exact order for a normal provider request', () => {
    const compiled = compileProviderPrompt({
      ...base,
      videoEngine: 'bytedance/seedance-2.0/text-to-video',
    })
    expect(compiled.blocks.map((block) => block.label)).toEqual([
      'ASSISTANT TASK', 'EDIT CONTROL', 'REFERENCE AUTHORITY', 'EDITABLE VARIABLE REGISTRY',
      'SUBJECT AND PERFORMANCE', 'CAMERA', 'LENS AND OPTICS', 'LIGHTING',
      'LOOK AND CAPTURE CHARACTER', 'TIMELINE AND CONTINUOUS ACTION', 'OPENING-FRAME HARD LOCK',
      'CAMERA, FRAMING, AND OPTICAL HARD GATE',
      'FINAL-FRAME AND OUTPUT HARD GATE', 'NEGATIVE PROMPT',
    ])
  })

  it('uses output FPS as the shutter basis while keeping selected Motion FPS separate', () => {
    const standard = compileProviderPrompt({
      ...base,
      videoEngine: 'bytedance/seedance-2.0/text-to-video',
      frameRate: 24,
      motionCadence: 16,
    }).text
    expect(standard).toContain('Visual Motion FPS intent: 16fps; capture and playback remain 24fps at normal speed.')
    expect(standard).toContain('Capture at 24fps and play back at 24fps at normal speed.')
    expect(standard).toContain('Use a 180-degree shutter angle, equivalent to 1/48-second exposure for every captured frame.')
    expect(standard).not.toContain('1/32-second')
    expect(standard.match(/180-degree shutter angle/g)).toHaveLength(1)
    const twentyFour = compileProviderPrompt({ ...base, videoEngine: 'bytedance/seedance-2.5/reference-to-video', motionCadence: 24 }).text
    expect(twentyFour).toContain('Capture at 24fps and play back at 24fps at normal speed.')
    expect(twentyFour).toContain('Use a 180-degree shutter angle, equivalent to 1/48-second exposure for every captured frame.')

    const angleOverride = compileProviderPrompt({
      ...base,
      prompt: 'Two pilots cross the hangar with a 90° shutter angle.',
      authoredPrompt: 'Two pilots cross the hangar with a 90° shutter angle.',
      videoEngine: 'bytedance/seedance-2.0/text-to-video',
      motionCadence: 24,
    }).text
    expect(angleOverride).toContain('Visual Motion FPS intent: 24fps; capture and playback remain 24fps at normal speed.')
    expect(angleOverride).not.toContain('use the explicitly authored shutter angle or shutter speed')
    expect(angleOverride).not.toContain('180-degree shutter angle')
    expect(angleOverride).toContain('Use the authored 90-degree shutter angle, equivalent to 1/96-second exposure for every captured frame.')

    const speedOverride = compileProviderPrompt({
      ...base,
      prompt: 'Two pilots cross the hangar at shutter speed 1/120 second.',
      authoredPrompt: 'Two pilots cross the hangar at shutter speed 1/120 second.',
      videoEngine: 'bytedance/seedance-2.0/text-to-video',
    }).text
    expect(speedOverride).not.toContain('180-degree shutter angle')
    expect(speedOverride).toContain('Use the authored 72-degree shutter angle, equivalent to 1/120-second exposure for every captured frame.')
    expect(() => compileProviderPrompt({
      ...base,
      authoredPrompt: 'Use a 180° shutter angle and shutter speed 1/120 second.',
      videoEngine: 'bytedance/seedance-2.0/text-to-video',
      frameRate: 24,
    })).toThrow('Authored shutter angle 180° conflicts with authored shutter speed 1/120s at 24fps.')
  })

  it('adds only the approved temporal rendering clauses and exact temporal exclusions', () => {
    const compilation = compileProviderPrompt({ ...base, videoEngine: 'bytedance/seedance-2.0/text-to-video', frameRate: 24 })
    const text = compilation.text
    expect(compilation.controlDiagnostics).toContainEqual(expect.objectContaining({ code: 'filmic-motion-provider-support', blocking: false, status: 'semantic-prompt-only', shutter: 'native-unverified' }))
    expect(text).toContain('Render motion with an even 24fps cinematic cadence and natural directional exposure blur across each frame’s exposure interval.')
    expect(text).toContain('Preserve coherent temporal progression between successive frames, with stable motion phase, consistent object boundaries and continuous spatial identity.')
    expect(text).toContain('Motion blur follows the direction and velocity present during the exposure, remaining naturally integrated into the photographed image rather than appearing as frame blending or artificial smoothing.')
    expect(text).toContain('Preserve clear leading edges, naturally softened trailing motion and stable detail whenever movement slows or stops.')
    for (const term of ['hard photographic cadence', 'disconnected still frames', 'slideshow motion', 'stop-motion cadence', 'cadence jitter', 'frame skipping', 'frame duplication', 'frame blending', 'optical-flow artifacts', 'temporal ghosting', 'repeated contours', 'detached motion trails', 'double images', 'excessive motion smear']) expect(text).toContain(term)
    for (const term of ['physical camera translation', 'camera rotation', 'grounded contact', 'weight transfer', 'foot skating', 'digital scale pumping']) expect(text).not.toContain(term)
    expect(text).not.toMatch(/no motion blur/i)
  })

  it('compiles the same owned filmic-motion blocks for non-Seedance video families without changing unrelated sections', () => {
    const sections = productionShotSpecSections({ ...base, videoEngine: 'fal-ai/kling-video/v3/standard/text-to-video', frameRate: 24, shutterAngle: 180, stylePrompt: 'Authored copper finish.' })
    expect(sections.find((section) => section.heading === 'FILMIC MOTION RENDERING')?.text).toContain('Capture at 24fps and play back at 24fps at normal speed.')
    expect(sections.find((section) => section.heading === 'FILMIC MOTION RENDERING')?.text).toContain('1/48-second exposure')
    expect(sections.find((section) => section.heading === 'NEGATIVE PROMPT')?.text.split(', ')).toEqual(['hard photographic cadence', 'disconnected still frames', 'slideshow motion', 'stop-motion cadence', 'cadence jitter', 'frame skipping', 'frame duplication', 'frame blending', 'optical-flow artifacts', 'temporal ghosting', 'repeated contours', 'detached motion trails', 'double images', 'excessive motion smear'])
    expect(sections.find((section) => section.heading === 'LIGHTING')?.text).toBe('5600K daylight key from screen-left; 3200K practicals 2 stops under key; 3% haze. Adapt these quantified fixtures to the STYLE authority without repeating its wording.')
    expect(sections.find((section) => section.heading === 'STYLE')?.text).toBe('Authored copper finish.')
    expect(sections.find((section) => section.heading === 'SCENE CONTEXT')?.text).toBe('Two pilots cross the hangar.')
  })

  it('leaves camera, actor movement, blocking, Style, lighting, timing, and reactions byte-exact outside owned motion blocks', () => {
    const sections = seedanceShotSpecSections({
      ...base,
      authoredPrompt: 'CAMERA\nPan right.\nSUBJECT AND PERFORMANCE\nMara crosses frame-left and stops beside Ivo.\nLIGHTING\nWindow key only.\nLOOK AND CAPTURE CHARACTER\nAuthored copper finish.\nTIMELINE AND CONTINUOUS ACTION\nAt 2s Mara looks back; Ivo reacts at 3s.',
      videoEngine: 'bytedance/seedance-2.0/text-to-video',
      frameRate: 24,
    })
    const byHeading = (heading: string) => sections.find((section) => section.heading === heading)?.text
    expect(byHeading('CAMERA')).toBe('Pan right.')
    expect(byHeading('SUBJECT AND PERFORMANCE')).toBe('Mara crosses frame-left and stops beside Ivo.')
    expect(byHeading('LIGHTING')).toBe('Window key only.')
    expect(byHeading('LOOK AND CAPTURE CHARACTER')).toBe('Authored copper finish.')
    expect(byHeading('TIMELINE AND CONTINUOUS ACTION')).toBe('At 2s Mara looks back; Ivo reacts at 3s.')
  })


  it('removes direction sections while retaining correctness locks', () => {
    const text = renderShotSpecSections(productionShotSpecSections({
      ...base,
      directionLayer: false,
      storyboardShots: [{ prompt: 'Walk.', duration: 2, shotSize: 'wide', camera: 'dolly-in' }],
    }))
    expect(text).not.toContain('FORMAT MODE')
    expect(text).not.toContain('CUT 1')
    expect(text).not.toContain('OPTICS')
    expect(text).not.toContain('CAMERA')
    expect(text).not.toContain('LIGHTING')
    expect(text).not.toContain('STYLE')
    expect(text).toContain('POSITIVE LOCKS')
  })

  it('parses every canonical Seedance heading with or without a colon', () => {
    const headings = [
      'ASSISTANT TASK', 'EDIT CONTROL', 'REFERENCE AUTHORITY', 'EDITABLE VARIABLE REGISTRY', 'SUBJECT AND PERFORMANCE', 'CAMERA', 'LENS AND OPTICS', 'LIGHTING',
      'LOOK AND CAPTURE CHARACTER', 'TIMELINE AND CONTINUOUS ACTION', 'OPENING-FRAME HARD LOCK', 'IDENTITY AND ANATOMY CONTINUITY',
      'WARDROBE, ACCESSORY, AND PROP CONTINUITY', 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY', 'CAMERA, FRAMING, AND OPTICAL HARD GATE',
      'FINAL-FRAME AND OUTPUT HARD GATE', 'NEGATIVE PROMPT',
    ]
    const authored = headings.map((heading, index) => index % 2 ? `${heading}: marker-${index}` : `${heading}\nmarker-${index}`).join('\n')
    const fields = seedanceAuthoredFields(authored)
    for (const [index] of headings.entries()) expect(Object.values(fields)).toContain(`marker-${index}`)
  })

  it('keeps connected semantics out of performance and assigns continuity to its owning authority', () => {
    const sections = seedanceShotSpecSections({
      ...base,
      prompt: 'The scene holds for inspection.',
      authoredPrompt: 'The scene holds for inspection.',
      references: [
        { role: 'character', tag: '@actor-c', slot: 'reference' },
        { role: 'wardrobe', tag: '@wardrobe-c', boundCharacterTag: '@actor-c', slot: 'reference' },
        { role: 'location', tag: '@room', slot: 'reference' },
        { role: 'element', tag: '@phone', slot: 'reference' },
      ],
      connectionRules: [{ tag: '@look', label: 'Style', rule: 'HARD RULE · style' }],
    }, 'SEEDANCE REFERENCE MAP:\n@Image1 = @actor-c')
    const performance = sections.find((section) => section.heading === 'SUBJECT AND PERFORMANCE')!.text
    expect(performance).not.toMatch(/@actor-c|breath|gaze|micro-hesitation/i)
    const wardrobe = sections.find((section) => section.heading === 'WARDROBE, ACCESSORY, AND PROP CONTINUITY')!.text
    expect(wardrobe).toContain('@wardrobe-c')
    expect(wardrobe).toContain('@phone')
    const scene = sections.find((section) => section.heading === 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY')!.text
    expect(scene).toContain('@room')
    expect(scene).not.toContain('@phone')
    const timeline = sections.find((section) => section.heading === 'TIMELINE AND CONTINUOUS ACTION')!.text
    expect(timeline).toContain('@actor-c wearing @wardrobe-c')
    expect(timeline).toContain('@room')
    expect(timeline).toContain('@phone')
  })

  it('suppresses equivalent secret domains that are already fully authored', () => {
    const authored = '@actor-c exact identity, face, anatomy and body proportions remain consistent through motion, occlusion and every cut.\n@wardrobe-c governs the wardrobe of @actor-c; garment silhouette, construction, materials, colors, patterns, layering, fit, accessories and worn state remain unchanged across every shot; never transfer it to another character.'
    const sections = seedanceShotSpecSections({
      ...base,
      prompt: authored,
      authoredPrompt: authored,
      references: [
        { role: 'character', tag: '@actor-c', slot: 'reference' },
        { role: 'wardrobe', tag: '@wardrobe-c', boundCharacterTag: '@actor-c', slot: 'reference' },
      ],
    }, 'SEEDANCE REFERENCE MAP:\n@Image1 = @actor-c\n@Image2 = @wardrobe-c')
    expect(sections.find((section) => section.heading === 'REFERENCE AUTHORITY')!.text).not.toContain('@actor-c is the Character visual authority')
    expect(sections.find((section) => section.heading === 'REFERENCE AUTHORITY')!.text).not.toContain('@wardrobe-c governs the wardrobe')
    expect(sections.some((section) => section.heading === 'IDENTITY AND ANATOMY CONTINUITY')).toBe(false)
    expect(sections.some((section) => section.heading === 'WARDROBE, ACCESSORY, AND PROP CONTINUITY')).toBe(false)
  })

  it('compiles the seven-shot restaurant typed ledger into exact compact active-cast state', () => {
    const initialStates = [
      { characterTag: '@owner', wardrobeTag: '@owner-wardrobe', worldPosition: 'chef-side', bodyOrientation: 'toward woman across island', gazeTarget: 'food task', currentAction: 'continues food task', actionPhase: 'ongoing', visibility: 'sharp-foreground' as const },
      { characterTag: '@woman', wardrobeTag: '@woman-wardrobe', worldPosition: 'directly opposite owner; island separates them', gazeTarget: '@owner', visibility: 'off-camera' as const },
      { characterTag: '@cook-one', wardrobeTag: '@cook-one-wardrobe', worldPosition: 'exact burner', currentAction: 'cooking', actionPhase: 'ongoing', propOwnership: ['same shallow pan', 'same utensil'], contacts: ['pan hand contact', 'utensil hand contact'], workstation: 'exact burner', visibility: 'off-camera' as const },
    ]
    const active = ['@owner', '@woman', '@cook-one']
    const visibility = [
      ['sharp-foreground', 'off-camera', 'off-camera'], ['off-camera', 'off-camera', 'off-camera'], ['sharp-foreground', 'sharp-foreground', 'sharp-background'],
      ['sharp-foreground', 'sharp-foreground', 'blurred-background'], ['partially-visible', 'off-camera', 'off-camera'], ['sharp-foreground', 'sharp-foreground', 'blurred-background'], ['sharp-background', 'sharp-background', 'sharp-background'],
    ] as const
    const prompts = ['Owner chest-up orbit.', 'Reduced-food close-up.', 'Wide match-action arrival.', 'OTS from woman.', 'Food and pointing insert.', 'Return OTS.', 'Camera departs; only camera moves.']
    const dialogue = { id: 'order-line', speakerTag: '@owner', targetTag: '@woman', text: 'Your order is ready.', startPanelId: 's4', endPanelId: 's6', insertAudioPanelIds: ['s5'], delivery: 'focused', lipSync: 'continuous' }
    const request = {
      ...base,
      videoEngine: 'bytedance/seedance-2.5/reference-to-video', storyboardMode: 'separate' as const,
      references: [
        ...['@owner', '@woman', '@cook-one', '@outsider'].map((tag) => ({ role: 'character' as const, tag, slot: 'reference' as const })),
        ...['@owner-wardrobe', '@woman-wardrobe', '@cook-one-wardrobe'].map((tag, index) => ({ role: 'wardrobe' as const, tag, boundCharacterTag: active[index], slot: 'reference' as const })),
        { role: 'location' as const, tag: '@kitchen', slot: 'reference' as const }, { role: 'element' as const, tag: '@reduced-meal', slot: 'reference' as const },
      ],
      storyboardShots: prompts.map((prompt, index) => ({
        panelId: `s${index + 1}`, prompt, duration: 2, shotSize: 'medium', camera: 'static', transitionToNext: index < 6 ? 'hard-cut' as const : undefined,
        continuityGroupId: 'restaurant', activeCharacterTags: active, excludedCharacterTags: ['@outsider'],
        characterStates: index === 0 ? initialStates : undefined,
        characterStateDeltas: active.map((characterTag, stateIndex) => ({ characterTag, visibility: visibility[index][stateIndex] })),
        stateAuthorities: index === 0
          ? [{ authorityTag: '@reduced-meal', scope: 'before' as const, state: 'original/full meal' }]
          : index === 1 ? [{ authorityTag: '@reduced-meal', scope: 'post-cut' as const, state: 'reduced meal directly before owner', trajectory: 'straight away from owner across island toward woman' }] : undefined,
        dialogueSpans: index === 3 ? [dialogue] : undefined,
      })),
    } as unknown as GenerationRequest
    const compiled = compileProviderPrompt(request)
    const ledger = buildContinuityLedger(request)
    const timeline = compiled.blocks.find((block) => block.label === 'TIMELINE AND CONTINUOUS ACTION')!.text

    expect(ledger.shots).toHaveLength(7)
    for (const shot of ledger.shots) expect(shot.characterStates.map((state) => state.characterTag)).toEqual(active)
    for (const tag of active) expect(timeline.match(new RegExp(`CHARACTER STATE · ${tag.replace('@', '\\@')} \\|`, 'g'))).toHaveLength(7)
    expect(timeline.match(/world=chef-side/g)).toHaveLength(7)
    expect(timeline.match(/world=directly opposite owner; island separates them/g)).toHaveLength(7)
    expect(timeline.match(/world=exact burner/g)).toHaveLength(7)
    expect(timeline.match(/same shallow pan/g)).toHaveLength(7)
    expect(timeline.match(/same utensil/g)).toHaveLength(7)
    expect(timeline).not.toMatch(/@outsider|idle|empty-handed|screen-left|screen-right/)
    expect(ledger.global.identities).not.toContain('@outsider')
    expect(ledger.shots.flatMap((shot) => [...shot.tags, ...shot.characterStates.map((state) => state.characterTag)])).not.toContain('@outsider')
    expect(timeline).toContain('STATE AUTHORITY · post-cut · @reduced-meal | reduced meal directly before owner | trajectory=straight away from owner across island toward woman')
    const shotTwo = timeline.slice(timeline.indexOf('SHOT 2 ·'), timeline.indexOf('SHOT 3 ·'))
    expect(shotTwo).toContain('@reduced-meal | reduced meal directly before owner')
    expect(shotTwo).not.toContain('original/full meal')
    expect(timeline.match(/Your order is ready\./g)).toHaveLength(1)
    expect(timeline).toContain('DIALOGUE CONTINUATION · order-line · audio continues while mouth may be outside crop')
    expect(timeline.match(/^HARD CUT\.$/gm)).toHaveLength(6)
    expect(compiled.blocks.at(-1)?.label).toBe('NEGATIVE PROMPT')
    expect(compiled.text).not.toMatch(/@Image\d+|@Video\d+|@Audio\d+|\[(?:Image|Video|Audio)\d+\]/)
    expect(providerPromptPreviewCompilation(request).text).toBe(compiled.text)
    expect(visibleProviderPromptBody(request)).toBe(compiled.text)
    const providerPayload = providerSeedancePayloadCompilation(request).text
    expect(providerPayload).not.toContain('@owner')
    expect(providerPayload).not.toContain('@outsider')
    expect(providerPayload).toMatch(/\[(?:Image|Video|Audio)\d+\]/)
    expect(providerPayload.split('\n\n').at(-1)).toMatch(/^NEGATIVE PROMPT\n/)
  })

  it('projects future-only typed continuity only when its owning shot becomes current', () => {
    const request: GenerationRequest = {
      ...base,
      prompt: '', authoredPrompt: '', videoEngine: 'bytedance/seedance-2.5/reference-to-video', storyboardMode: 'separate',
      references: [
        { role: 'character', tag: '@chef', path: '/chef.png', mediaType: 'image', slot: 'reference', description: 'metadata mustard jacket', characterAuthorityMode: 'identity-body-with-layers' },
        { role: 'wardrobe', tag: '@chef-apron', boundCharacterTag: '@chef', path: '/apron.png', mediaType: 'image', slot: 'reference', description: 'metadata blue apron', appearanceScope: 'wardrobe', appearanceSelection: 'explicit-replacement' },
        { role: 'character', tag: '@cook', path: '/cook.png', mediaType: 'image', slot: 'reference', description: 'metadata round glasses', characterAuthorityMode: 'complete-dressed-body' },
        { role: 'location', tag: '@kitchen', path: '/kitchen.png', mediaType: 'image', slot: 'reference', description: 'metadata chrome counters' },
      ],
      storyboardShots: [
        {
          panelId: 's1', prompt: '@chef wearing @chef-apron works at @kitchen. Authored opening stays exact.', duration: 2, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut',
          continuityGroupId: 'service', activeCharacterTags: ['@chef', '@cook'],
          characterStates: [
            { characterTag: '@chef', worldPosition: 'front station', bodyOrientation: 'front task relation', currentAction: 'plates the current dish', visibility: 'sharp-foreground' },
            { characterTag: '@cook', worldPosition: 'exact rear burner', currentAction: 'active off-camera cooking continues now', actionPhase: 'ongoing', workstation: 'exact rear burner', visibility: 'off-camera' },
          ],
        },
        {
          panelId: 's2', prompt: '@chef checks the pass.', duration: 2, shotSize: 'medium', camera: 'pan-right', transitionToNext: 'hard-cut',
          continuityGroupId: 'service', activeCharacterTags: ['@chef', '@cook'],
          characterStateDeltas: [{ characterTag: '@chef', worldPosition: 'later screen-right', bodyOrientation: 'reverse-view front relation' }],
        },
        {
          panelId: 's3', prompt: '@chef serves.', duration: 2, shotSize: 'medium', camera: 'static',
          continuityGroupId: 'service', activeCharacterTags: ['@chef', '@cook'],
          characterStateDeltas: [{ characterTag: '@chef', currentAction: 'future action raises the plated dish' }],
        },
      ],
    }
    const compiled = compileProviderPrompt(request)
    const shotOne = compiled.text.slice(compiled.text.indexOf('SHOT 1 ·'), compiled.text.indexOf('SHOT 2 ·'))
    const shotTwo = compiled.text.slice(compiled.text.indexOf('SHOT 2 ·'), compiled.text.indexOf('SHOT 3 ·'))
    const shotThree = compiled.text.slice(compiled.text.indexOf('SHOT 3 ·'))

    expect(shotOne).toContain('REFERENCES · @chef; @kitchen; @chef is the sole authority for chef as one complete physical body and one cast member, wearing the appearance governed by @chef-apron on that same body.')
    expect(shotOne).toContain('active off-camera cooking continues now')
    expect(shotOne).not.toMatch(/later screen-right|reverse-view front relation|future action raises the plated dish/)
    expect(shotTwo).toMatch(/world=later screen-right.*orientation=reverse-view front relation/)
    expect(shotTwo).not.toContain('future action raises the plated dish')
    expect(shotThree).toContain('action=future action raises the plated dish')
    expect(compiled.text.match(/later screen-right/g)).toHaveLength(2)
    expect(compiled.text.match(/future action raises the plated dish/g)).toHaveLength(1)
    expect(compiled.continuityLedger?.shots.map((shot) => shot.characterStates.find((state) => state.characterTag === '@chef'))).toMatchObject([
      { worldPosition: 'front station', bodyOrientation: 'front task relation', currentAction: 'plates the current dish' },
      { worldPosition: 'later screen-right', bodyOrientation: 'reverse-view front relation', currentAction: 'plates the current dish' },
      { worldPosition: 'later screen-right', bodyOrientation: 'reverse-view front relation', currentAction: 'future action raises the plated dish' },
    ])
    for (const metadata of ['metadata mustard jacket', 'metadata blue apron', 'metadata round glasses', 'metadata chrome counters']) expect(compiled.text).not.toContain(metadata)
    expect(providerPromptPreviewCompilation(request).text).toBe(compiled.text)
    expect(visibleProviderPromptBody(request)).toBe(compiled.text)
    expect(providerSeedancePayloadCompilation(request).text).toBe(compiled.text
      .replaceAll('@chef-apron', '[Image2]').replaceAll('@chef', '[Image1]').replaceAll('@cook', '[Image3]').replaceAll('@kitchen', '[Image4]'))
  })

  it('blocks provider submission when an exact required state has only a known conflicting multi-state authority', () => {
    const request: GenerationRequest = {
      ...base,
      prompt: '', authoredPrompt: '', videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [{ role: 'element', tag: '@case', path: '/case.png', mediaType: 'image', slot: 'reference' }],
      storyboardShots: [{
        panelId: 'closed-case', prompt: '@case remains closed.', duration: 2, shotSize: 'detail', camera: 'static',
        stateAuthorities: [{ authorityTag: '@case', scope: 'before', state: 'closed', requiredState: 'closed', availableStates: ['closed', 'open'] }],
      }],
    }

    expect(() => compileProviderPromptForSubmission(request)).toThrow('State authority @case must use a single-state reference for exact required state "closed"; known available states are: closed, open.')
  })

  it('accepts one exact state across multiple views, leaves unknown inventories unspecified, and keeps post-cut authority at the cut', () => {
    const request: GenerationRequest = {
      ...base,
      prompt: '', authoredPrompt: '', videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [
        { role: 'element', tag: '@case', path: '/case.png', mediaType: 'image', slot: 'reference' },
        { role: 'element', tag: '@parcel', path: '/parcel.png', mediaType: 'image', slot: 'reference' },
      ],
      storyboardShots: [
        {
          panelId: 'before', prompt: '@case remains closed beside @parcel.', duration: 2, shotSize: 'detail', camera: 'static', transitionToNext: 'hard-cut',
          stateAuthorities: [
            { authorityTag: '@case', scope: 'before', state: 'closed', requiredState: 'closed', availableStates: ['closed'], referenceViews: ['front', 'back', 'side'] },
            { authorityTag: '@parcel', scope: 'before', state: 'sealed' },
          ],
        },
        {
          panelId: 'after', prompt: '@case remains closed after the cut.', duration: 2, shotSize: 'detail', camera: 'static',
          stateAuthorities: [{ authorityTag: '@case', scope: 'post-cut', state: 'closed', requiredState: 'closed', availableStates: ['closed'], referenceViews: ['three-quarter', 'rear'] }],
        },
      ],
    }

    const compiled = compileProviderPromptForSubmission(request)
    const shotOne = compiled.text.slice(compiled.text.indexOf('SHOT 1 ·'), compiled.text.indexOf('SHOT 2 ·'))
    const shotTwo = compiled.text.slice(compiled.text.indexOf('SHOT 2 ·'))
    expect(shotOne).toContain('STATE AUTHORITY · before · @case | closed')
    expect(shotOne).toContain('STATE AUTHORITY · before · @parcel | sealed')
    expect(shotOne).not.toContain('post-cut')
    expect(shotTwo).toContain('STATE AUTHORITY · post-cut · @case | closed')
    expect(compiled.text).not.toMatch(/front, back, side|three-quarter, rear|availableStates|requiredState|referenceViews/)
  })

  it('preserves lowercase canonical semantic-tag punctuation and request-local adapter translation without an OpenArt ordinal validator', () => {
    const request: GenerationRequest = {
      ...base,
      prompt: '', authoredPrompt: '', videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [
        { role: 'element', tag: '@image2', path: '/first.png', mediaType: 'image', slot: 'reference' },
        { role: 'element', tag: '@image6', path: '/second.png', mediaType: 'image', slot: 'reference' },
      ],
      storyboardShots: [{ prompt: "@image2, remains beside @image6's handle.", duration: 2, shotSize: 'detail', camera: 'static' }],
    }

    const visible = providerPromptPreviewCompilation(request).text
    expect(visible).toContain("@image2, remains beside @image6's handle.")
    expect(visible).not.toMatch(/\[(?:Image|Video|Audio)\d+\]/)
    const payload = providerSeedancePayloadCompilation(request).text
    expect(payload).toContain("[Image1], remains beside [Image2]'s handle.")
    expect(providerPromptPreviewCompilation(request).text).toBe(visible)
  })
})
