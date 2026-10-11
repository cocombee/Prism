import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StoryboardPanel, StudioNode } from './types'
import {
  applyStoryboardBatchResponse,
  applyStoryboardRewrites,
  buildStoryboardConnectedContextManifest,
  parseStoryboardBatchResponse,
  storyboardBatchRewriteInstruction,
  storyboardBatchTargets,
  storyboardDirectorBaselinePolicy,
  storyboardShotDevelopmentPolicy,
  STORYBOARD_DIRECTOR_BASELINE_IDS,
  storyboardRewriteInstruction,
  storyboardSemanticTaggingPolicy,
  storyboardSequenceMentionPolicy,
  storyboardRewriteProgress,
  storyboardRewriteTargets,
  validateStoryboardBatchPromptTransport,
  validateStoryboardRewrite,
} from './storyboardRewrite'

function testNode(id: string, data: Record<string, unknown>): StudioNode {
  return { id, type: 'default', position: { x: 0, y: 0 }, data } as StudioNode
}

const panels: StoryboardPanel[] = [
  { id: 'one', prompt: '@actor-c waits at the door.', duration: 3, shotSize: 'wide', camera: 'static', transitionToNext: 'continue' },
  { id: 'two', prompt: `SHOT PRIORITY\n@actor-c stays sharp.\nBEAT 1 — HOLD\nThe camera waits.`, duration: 4, shotSize: 'medium', camera: 'pan-right', transitionToNext: 'hard-cut' },
  { id: 'three', prompt: '@actor-c turns back.', duration: 1, shotSize: 'close-up', camera: 'static', locked: true },
]

describe('Style is look/feel context, not shot reference tagging', () => {
  it('excludes obsolete Style connections from Storyboard context and asset tagging', () => {
    const board = testNode('board-style', {kind:'storyboard'})
    const style = testNode('style', {kind:'style-reference',title:'cinematic-naturalism',referenceTag:'@cinematic-naturalism',stylePrompt:'Subtle grain and restrained naturalism.'})
    const source = 'I walk in the desert, thinking.'
    const manifest = buildStoryboardConnectedContextManifest(board.id,[board,style],[{id:'style-edge',source:style.id,target:board.id} as Edge],source)
    expect(manifest.entries).toEqual([])
    expect(manifest.text).not.toContain('Subtle grain')
    expect(manifest.text).not.toContain('@cinematic-naturalism')
    expect(validateStoryboardRewrite(source,source,manifest)).toBe(source)
    expect(() => validateStoryboardRewrite(source,source+' @cinematic-naturalism',manifest)).toThrow('unconnected tag')
  })
})

describe('Storyboard connected context manifest', () => {
  it('excludes unrelated connected Characters from a typed continuity-group Revamp target', () => {
    const nodes = [
      testNode('board', { kind: 'storyboard', title: 'Storyboard' }),
      testNode('owner', { kind: 'character', title: 'owner', referenceTag: '@owner' }),
      testNode('outsider', { kind: 'character', title: 'living-room-person', referenceTag: '@outsider' }),
      testNode('kitchen', { kind: 'location', title: 'kitchen', referenceTag: '@kitchen' }),
    ]
    const edges = ['owner', 'outsider', 'kitchen'].map((source) => ({ id: `${source}-edge`, source, target: 'board' } as Edge))
    const panel: StoryboardPanel = {
      id: 'restaurant', prompt: '@owner works in @kitchen.', duration: 2,
      continuityGroupId: 'restaurant', activeCharacterTags: ['@owner'], excludedCharacterTags: ['@outsider'],
    }
    const manifest = buildStoryboardConnectedContextManifest('board', nodes, edges, panel.prompt, panel)
    expect(manifest.text).toContain('@owner')
    expect(manifest.text).toContain('@kitchen')
    expect(manifest.text).not.toContain('@outsider')
    expect(storyboardRewriteInstruction([panel], panel.id, manifest.text)).not.toContain('@outsider')
  })

  it('keeps tagged text-only semantic nodes text-described until real visual media is connected', () => {
    const board = testNode('board-text-only', { kind: 'storyboard', title: 'Storyboard' })
    const textOnly = testNode('text-only-character', {
      kind: 'character', title: 'Text Only Hero', referenceTag: '@text-only-hero', styleDescription: 'authored text description',
    })
    const manifest = buildStoryboardConnectedContextManifest(board.id, [board, textOnly], [
      { id: 'text-only-edge', source: textOnly.id, target: board.id } as Edge,
    ], '@text-only-hero enters.')
    expect(manifest.entries[0]).toMatchObject({ tag: '@text-only-hero', visualAuthorityMode: 'text-described', caption: 'authored text description' })
    expect(manifest.text).not.toContain('sole visual authority')
  })

  it('keeps connected visual captions out of Revamp context and rejects invented appearance before mutation', () => {
    const board = testNode('board-exclusive', { kind: 'storyboard', title: 'Storyboard' })
    const helmet = testNode('helmet', {
      kind: 'element', title: 'helmet', referenceTag: '@image4',
      referenceAssets: [{ mimeType: 'image/png', metadata: { identityDescription: 'cyan blue plastic helmet' }, name: 'helmet.png' }],
    })
    const glasses = testNode('glasses', {
      kind: 'element', title: 'glasses', referenceTag: '@image5',
      referenceAssets: [{ mimeType: 'image/png', metadata: { identityDescription: 'black frame blue lenses' }, name: 'glasses.png' }],
    })
    const edges = [helmet, glasses].map((node) => ({ id: `${node.id}-edge`, source: node.id, target: board.id } as Edge))
    const manifest = buildStoryboardConnectedContextManifest(board.id, [board, helmet, glasses], edges, '@image4 and @image5 remain with the character.')
    expect(manifest.text).toContain('sole visual authority')
    expect(manifest.text).not.toMatch(/caption=|cyan|blue|plastic|black frame|lenses/)
    expect(() => validateStoryboardRewrite('@image4 remains with the character.', 'A cyan helmet @image4 remains with the character.', manifest)).toThrow(/appearance/i)
    expect(() => validateStoryboardRewrite('@image5 remains with the character.', 'Round blue-lensed glasses @image5 remain with the character.', manifest)).toThrow(/appearance/i)

    const sourcePanels: StoryboardPanel[] = [
      { id: 'a', prompt: '@image4 remains with the character.', duration: 2 },
      { id: 'b', prompt: '@image5 remains with the character.', duration: 2 },
    ]
    const contexts = new Map(sourcePanels.map((panel) => [panel.id, manifest]))
    const rewrites = new Map([['a', 'A cyan helmet @image4 remains with the character.'], ['b', 'Leopard sweater and @image5 remain with the character.']])
    expect(() => applyStoryboardBatchResponse(sourcePanels, rewrites, contexts)).toThrow(/appearance/i)
    expect(sourcePanels.map((panel) => panel.prompt)).toEqual(['@image4 remains with the character.', '@image5 remains with the character.'])
  })

  it('grounds Revamp in every connected authority with safe metadata and independent Location plus phone hints', () => {
    const nodes = [
      testNode('board', { kind: 'storyboard', title: 'Storyboard' }),
      testNode('character', { kind: 'character', title: 'Mara', referenceTag: '@mara', prompt: 'A person in a red coat.' }),
      testNode('location', { kind: 'location', title: 'Rainy Station', referenceTag: '@rainy-station', prompt: 'A covered station platform.' }),
      testNode('element', { kind: 'element', title: 'Brass Compass', referenceTag: '@brass-compass', prompt: 'A worn brass compass.' }),
      testNode('style', { kind: 'style-reference', title: 'Noir Film', referenceTag: '@noir-film', styleDescription: 'High-contrast 35mm noir.' }),
      testNode('phone', { kind: 'upload', title: 'iphone-15-pro-front.png', outputType: 'image', assetPath: '/Users/private/secret/iphone-15-pro-front.png' }),
    ]
    const edges = [
      { id: 'character-edge', source: 'character', target: 'board', targetHandle: 'character-in' },
      { id: 'location-edge', source: 'location', target: 'board', targetHandle: 'location-in' },
      { id: 'element-edge', source: 'element', target: 'board', targetHandle: 'element-in' },
      { id: 'style-edge', source: 'style', target: 'board', targetHandle: 'style-in' },
      { id: 'phone-edge', source: 'phone', target: 'board', targetHandle: 'reference-in' },
    ] as Edge[]

    const manifest = buildStoryboardConnectedContextManifest('board', nodes, edges, 'The phone waits on the desk while @mara enters.')

    expect(manifest.entries.map((entry) => entry.role)).toEqual(['Character', 'Location', 'Element/Prop', 'Image Reference'])
    expect(manifest.text).toContain('CONNECTED CONTEXT MANIFEST')
    expect(manifest.text).toContain('anchor=@mara')
    expect(manifest.text).toContain('role=Image Reference')
    expect(manifest.text).toContain('aliases=')
    expect(manifest.entries.find((entry) => entry.tag === '@mara')?.insertionHint).toBeUndefined()
    expect(manifest.entries.find((entry) => entry.role === 'Location')?.insertionHint).toContain('@rainy-station')
    expect(manifest.entries.find((entry) => entry.role === 'Image Reference')?.insertionHint).toContain('@iphone-15-pro-front')
    expect(manifest.text).not.toContain('/Users/private/secret')
    expect(manifest.text).not.toContain('@Image1')
    expect(manifest.text).not.toContain('@Video1')
    expect(manifest.text).not.toContain('@Audio1')
  })

  it('derives existing Canvas anchors for untagged Location and Element authorities without inventing a role', () => {
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const location = testNode('location', { kind: 'location', title: 'Rainy Station' })
    const element = testNode('element', { kind: 'element', title: 'Brass Compass' })

    const locationManifest = buildStoryboardConnectedContextManifest('board', [board, location], [
      { id: 'location-edge', source: 'location', target: 'board', targetHandle: 'location-in' } as Edge,
    ], 'The scene unfolds at the rainy station.')
    const elementManifest = buildStoryboardConnectedContextManifest('board', [board, element], [
      { id: 'element-edge', source: 'element', target: 'board', targetHandle: 'element-in' } as Edge,
    ], 'She checks the brass compass.')

    expect(locationManifest.entries[0]).toMatchObject({ role: 'Location', tag: '@rainy-station' })
    expect(locationManifest.entries[0].insertionHint).toContain('@rainy-station')
    expect(elementManifest.entries[0]).toMatchObject({ role: 'Element/Prop', tag: '@brass-compass' })
    expect(elementManifest.entries[0].insertionHint).toContain('@brass-compass')

    const authored = buildStoryboardConnectedContextManifest('board', [board, location], [
      { id: 'location-edge', source: 'location', target: 'board', targetHandle: 'location-in' } as Edge,
    ], 'Hold at @rainy-station.')
    expect(authored.entries[0].insertionHint).toBeUndefined()
  })

  it('hints one authoritative missing Location without forcing ambiguous Locations, Elements, or Images', () => {
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const station = testNode('station', { kind: 'location', title: 'Rainy Station', referenceTag: '@rainy-station' })
    const hangar = testNode('hangar', { kind: 'location', title: 'North Hangar', referenceTag: '@north-hangar' })
    const compass = testNode('compass', { kind: 'element', title: 'Brass Compass', referenceTag: '@brass-compass' })
    const phone = testNode('phone', { kind: 'upload', title: 'iphone-15-pro-front.png', outputType: 'image' })
    const edge = (source: string, targetHandle: string): Edge => ({ id: `${source}-edge`, source, target: 'board', targetHandle } as Edge)

    const singleLocation = buildStoryboardConnectedContextManifest('board', [board, station, compass, phone], [
      edge('station', 'location-in'), edge('compass', 'element-in'), edge('phone', 'reference-in'),
    ], 'Mara waits for the signal.')
    expect(singleLocation.entries.find((entry) => entry.role === 'Location')?.insertionHint).toContain('@rainy-station')
    expect(singleLocation.entries.find((entry) => entry.role === 'Element/Prop')?.insertionHint).toBeUndefined()
    expect(singleLocation.entries.find((entry) => entry.role === 'Image Reference')?.insertionHint).toBeUndefined()

    const mentionedAuthorities = buildStoryboardConnectedContextManifest('board', [board, station, compass, phone], [
      edge('station', 'location-in'), edge('compass', 'element-in'), edge('phone', 'reference-in'),
    ], 'The phone rests beside the brass compass.')
    expect(mentionedAuthorities.entries.find((entry) => entry.role === 'Location')?.insertionHint).toContain('@rainy-station')
    expect(mentionedAuthorities.entries.find((entry) => entry.role === 'Element/Prop')?.insertionHint).toContain('@brass-compass')
    expect(mentionedAuthorities.entries.find((entry) => entry.role === 'Image Reference')?.insertionHint).toContain('@iphone-15-pro-front')

    const authoredLocation = buildStoryboardConnectedContextManifest('board', [board, station], [edge('station', 'location-in')], 'Mara waits at @rainy-station.')
    expect(authoredLocation.entries[0].insertionHint).toBeUndefined()

    const ambiguousLocations = buildStoryboardConnectedContextManifest('board', [board, station, hangar], [
      edge('station', 'location-in'), edge('hangar', 'location-in'),
    ], 'Mara waits for the signal.')
    expect(ambiguousLocations.entries.every((entry) => entry.insertionHint === undefined)).toBe(true)
  })

  it('exposes the real Malay Element to provider semantic resolution without a fon dictionary', () => {
    const board = testNode('board-fon', { kind: 'storyboard', title: 'Storyboard' })
    const phone = testNode('da452f50-904c-4b44-b3de-f65b8f8704b3', {
      kind: 'element',
      title: 'video-01-scene-01-telefon-pintar-customer',
      referenceTag: '@video-01-scene-01-telefon-pintar-customer',
    })
    const prompt = 'The customer checks his fon beside the counter.'
    const manifest = buildStoryboardConnectedContextManifest(board.id, [phone, board], [
      { id: 'phone-fon-edge', source: phone.id, target: board.id, targetHandle: 'element-in' },
    ], prompt)
    const phoneEntry = manifest.entries.find((entry) => entry.tag === '@video-01-scene-01-telefon-pintar-customer')
    expect(phoneEntry).toMatchObject({ role: 'Element/Prop', semanticTagCandidate: true })
    expect(phoneEntry?.matchedAlias).toBeUndefined()
    expect(phoneEntry?.requiredInsertion).toBeUndefined()
    expect(phoneEntry?.aliases).not.toContain('fon')
    expect(validateStoryboardRewrite(prompt, 'The customer raises his @video-01-scene-01-telefon-pintar-customer beside the counter.', manifest)).toBe('The customer raises his @video-01-scene-01-telefon-pintar-customer beside the counter.')
  })

  it('keeps realistic Malay Element metadata available without translating it in source', () => {
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const phone = testNode('da452f50-904c-4b44-b3de-f65b8f8704b3', {
      kind: 'element',
      title: 'video-01-scene-01-telefon-pintar-customer',
      referenceTag: '@video-01-scene-01-telefon-pintar-customer',
    })
    const manifest = buildStoryboardConnectedContextManifest('board', [board, phone], [
      { id: 'phone-element-edge', source: phone.id, target: 'board', targetHandle: 'element-in' } as Edge,
    ], 'The customer lifts the phone from the counter.')
    expect(manifest.entries[0]).toMatchObject({
      role: 'Element/Prop',
      tag: '@video-01-scene-01-telefon-pintar-customer',
      semanticTagCandidate: true,
    })
    expect(manifest.entries[0].matchedAlias).toBeUndefined()
    expect(manifest.entries[0].requiredInsertion).toBeUndefined()
    expect(manifest.entries[0].name).toBe('video-01-scene-01-telefon-pintar-customer')
    expect(manifest.entries[0].aliases).toEqual(expect.arrayContaining(['telefon', 'pintar']))
    expect(manifest.entries[0].aliases).not.toEqual(expect.arrayContaining(['phone', 'fon']))
    expect(manifest.text).toContain('semantic-anchor-candidate=@video-01-scene-01-telefon-pintar-customer')
  })

  it('keeps filename inference generic, omits unsafe metadata, and makes ambiguous matches no-guess', () => {
    const nodes = [
      testNode('board', { kind: 'storyboard', title: 'Storyboard' }),
      testNode('phone-a', { kind: 'upload', title: 'iphone-15-pro-front.png', outputType: 'image', referenceTag: '@Image1', prompt: 'https://example.com/a.png token=secret-value' }),
      testNode('phone-b', { kind: 'image-generator', title: 'smartphone-side.png', outputType: 'image', referenceTag: '@phone-b', assetPath: '/Users/private/smartphone-side.png' }),
      testNode('unsafe', { kind: 'upload', title: 'api-key-sk-live-123.png', outputType: 'image', assetUrl: 'https://example.com/private.png' }),
    ]
    const edges = ['phone-a', 'phone-b', 'unsafe'].map((source) => ({ id: `${source}-edge`, source, target: 'board', targetHandle: 'reference-in' } as Edge))

    const manifest = buildStoryboardConnectedContextManifest('board', nodes, edges, 'The phone rings beside the desk.')

    expect(manifest.entries.every((entry) => entry.role === 'Image Reference')).toBe(true)
    expect(manifest.entries.every((entry) => entry.insertionHint === undefined)).toBe(true)
    expect(manifest.text).not.toMatch(/https?:|\/Users\/|sk-live|secret-value|api-key|@Image1/i)
  })
})

describe('Storyboard coherent Revamp All batch contract', () => {
  const complete = `FORMAT MODE: TWO SHOTS / ONE HARD CUT\nTIMELINE:\nSHOT 1 · 0.0–2.0s: Mara waits.\nHARD CUT.\nSHOT 2 · 2.0–4.0s: Mara exits.\nCAMERA: Static.`
  const mixed: StoryboardPanel[] = [
    { id: 'editable-one', prompt: '@mara opens the door.', duration: 3, shotSize: 'wide', camera: 'static', transitionToNext: 'continue' },
    { id: 'panel-readonly-locked-02', prompt: '@mara remains at the threshold.', duration: 2, shotSize: 'medium', camera: 'pan-right', locked: true, transitionToNext: 'hard-cut' },
    { id: 'empty', prompt: '', duration: 1, shotSize: 'detail', camera: 'static' },
    { id: 'complete', prompt: complete, duration: 4, shotSize: 'wide', camera: 'static' },
    { id: 'editable-two', prompt: '@mara crosses the room.', duration: 2, shotSize: 'close-up', camera: 'dolly-in' },
  ]

  it('classifies editable targets while retaining every panel as ordered read-only or editable context', () => {
    const batch = storyboardBatchTargets(mixed)
    expect(batch.targets.map((panel) => panel.id)).toEqual(['editable-one', 'editable-two'])
    expect(batch.context.map(({ id, editable, boundary }) => ({ id, editable, boundary }))).toEqual([
      { id: 'editable-one', editable: true, boundary: 'continue' },
      { id: 'panel-readonly-locked-02', editable: false, boundary: 'hard-cut' },
      { id: 'empty', editable: false, boundary: 'hard-cut' },
      { id: 'complete', editable: false, boundary: 'hard-cut' },
      { id: 'editable-two', editable: true, boundary: 'final' },
    ])
    expect(batch.context[1]).toMatchObject({ prompt: mixed[1].prompt, duration: 2, shotSize: 'medium', camera: 'pan-right', locked: true })
    expect(batch.context[3].prompt).toBe(complete)
  })

  it('builds one ordered full-context instruction and strict JSON response contract', () => {
    const contexts = new Map(mixed.map((panel) => [panel.id, { entries: [], text: `CONTEXT FOR ${panel.id}` }]))
    const instruction = storyboardBatchRewriteInstruction(mixed, contexts)
    expect(instruction).toContain('REVAMP ALL TARGET ORDER: editable-one, editable-two')
    expect(instruction).toContain('PANEL ID: panel-readonly-locked-02 · READ-ONLY · 2s · medium · pan-right · LOCKED · TRANSITION AFTER: HARD CUT')
    expect(instruction).toContain('PANEL ID: complete · READ-ONLY')
    expect(instruction).toContain('PANEL ID: editable-two · EDITABLE · 2s · close-up · dolly-in · FINAL PANEL')
    expect(instruction).toContain('CONTEXT FOR editable-one')
    expect(instruction).toContain('CONTEXT FOR panel-readonly-locked-02')
    expect(instruction).toContain('{ "panels": [{ "id": "editable-one", "prompt": "..." }, { "id": "editable-two", "prompt": "..." }] }')
    expect(instruction).toContain('Return strict JSON only. No markdown fence, commentary, diff, fragment, or extra key.')
  })

  it('parses only exact ordered complete target transport', () => {
    const valid = '{"panels":[{"id":"editable-one","prompt":"@mara opens the locked door."},{"id":"editable-two","prompt":"@mara crosses the quiet room."}]}'
    expect([...parseStoryboardBatchResponse(valid, ['editable-one', 'editable-two'])]).toEqual([
      ['editable-one', '@mara opens the locked door.'],
      ['editable-two', '@mara crosses the quiet room.'],
    ])

    const invalid = [
      '{"panels":[{"id":"editable-one","prompt":"one"}]}',
      '{"panels":[{"id":"editable-one","prompt":"one"},{"id":"editable-two","prompt":"two"},{"id":"extra","prompt":"extra"}]}',
      '{"panels":[{"id":"editable-one","prompt":"one"},{"id":"editable-one","prompt":"again"}]}',
      '{"panels":[{"id":"editable-two","prompt":"two"},{"id":"editable-one","prompt":"one"}]}',
      '{"panels":[{"id":"editable-one","prompt":""},{"id":"editable-two","prompt":"two"}]}',
      '```json\n{"panels":[{"id":"editable-one","prompt":"one"},{"id":"editable-two","prompt":"two"}]}\n```',
      'Here is the result: {"panels":[{"id":"editable-one","prompt":"one"},{"id":"editable-two","prompt":"two"}]}',
      '{"panels":[{"id":"editable-one","prompt":"one"},{"id":"editable-two","prompt":"two"}],"commentary":"done"}',
    ]
    for (const response of invalid) expect(() => parseStoryboardBatchResponse(response, ['editable-one', 'editable-two'])).toThrow(/batch response/i)
  })

  it('rejects transport-shaped leakage and exact stable panel IDs without false positives on ordinary prose', () => {
    const internalIds = ['panel-a3f19c20-8b4e-4f0f-a142-0c36b9e49211', 'panel-59b0d225-78fd-458b-8b65-7eb83eb8f2ca']
    const invalid = [
      '{"id":"panel-a3f19c20-8b4e-4f0f-a142-0c36b9e49211","prompt":"Mara waits."}',
      '[{"prompt":"Mara waits."}]',
      '```json\n{"panels":[]}\n```',
      'Transport context: { editable: true, boundary: "final" }',
      'Revise panel-a3f19c20-8b4e-4f0f-a142-0c36b9e49211 before the cut.',
      'Parser batch response includes hidden connected-context labels.',
    ]
    for (const prompt of invalid) expect(() => validateStoryboardBatchPromptTransport(prompt, internalIds)).toThrow(/transport/i)
    expect(validateStoryboardBatchPromptTransport('Mara checks the prompt card, finds her boundary, and crosses into the next room.', internalIds)).toBe('Mara checks the prompt card, finds her boundary, and crosses into the next room.')
  })

  it('rejects one leaked inner transport record before any atomic batch apply', () => {
    const batchPanels: StoryboardPanel[] = [
      { id: 'panel-a3f19c20-8b4e-4f0f-a142-0c36b9e49211', prompt: '@mara opens the door.', duration: 2 },
      { id: 'panel-59b0d225-78fd-458b-8b65-7eb83eb8f2ca', prompt: '@mara crosses the room.', duration: 2 },
    ]
    const original = structuredClone(batchPanels)
    const contexts = new Map(batchPanels.map((panel) => [panel.id, { entries: [], text: '' }]))
    const escapedTransportResponse = '{"panels":[{"id":"panel-a3f19c20-8b4e-4f0f-a142-0c36b9e49211","prompt":"@mara opens the locked door."},{"id":"panel-59b0d225-78fd-458b-8b65-7eb83eb8f2ca","prompt":"{\\"id\\":\\"panel-59b0d225-78fd-458b-8b65-7eb83eb8f2ca\\",\\"prompt\\":\\"@mara crosses the room.\\"}"}]}'
    const parsedLeak = parseStoryboardBatchResponse(escapedTransportResponse, batchPanels.map((panel) => panel.id))
    expect(() => applyStoryboardBatchResponse(batchPanels, parsedLeak, contexts)).toThrow(/transport/i)
    expect(batchPanels).toEqual(original)
  })

  it('validates every panel with its own context and applies atomically only after all pass', () => {
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const mara = testNode('mara', { kind: 'character', title: 'Mara', referenceTag: '@mara' })
    const phone = testNode('phone', { kind: 'upload', title: 'iphone-15-pro-front.png', outputType: 'image' })
    const edges = [
      { id: 'mara-edge', source: 'mara', target: 'board', targetHandle: 'character-in' } as Edge,
      { id: 'phone-edge', source: 'phone', target: 'board', targetHandle: 'reference-in' } as Edge,
    ]
    const contexts = new Map(mixed.map((panel) => [panel.id, buildStoryboardConnectedContextManifest('board', [board, mara, phone], edges, panel.prompt)]))
    const original = structuredClone(mixed)
    const oneInvalid = new Map([
      ['editable-one', '@mara opens the locked door.'],
      ['editable-two', '@mara crosses beside @unconnected.'],
    ])
    expect(() => applyStoryboardBatchResponse(mixed, oneInvalid, contexts)).toThrow(/unconnected/i)
    expect(() => applyStoryboardBatchResponse(mixed, new Map([
      ['editable-one', '@mara opens the door.'],
      ['editable-two', 'PANEL ID: editable-two {"panels":[]}'],
    ]), contexts)).toThrow(/transport/i)
    expect(mixed).toEqual(original)

    const valid = new Map([
      ['editable-one', '@mara opens the locked door.'],
      ['editable-two', '@mara crosses the quiet room.'],
    ])
    const outcome = applyStoryboardBatchResponse(mixed, valid, contexts)
    expect(outcome).toMatchObject({ changed: 2, unchanged: 0 })
    expect(outcome.panels.map((panel) => panel.id)).toEqual(mixed.map((panel) => panel.id))
    expect(outcome.panels[1]).toEqual(mixed[1])
    expect(outcome.panels[2]).toEqual(mixed[2])
    expect(outcome.panels[3]).toEqual(mixed[3])
    expect(outcome.panels[0].prompt).not.toMatch(/panels|editable-one|CONNECTED CONTEXT MANIFEST/)
  })
})

  it('defines provider-side semantic tagging across languages without dictionary equality', () => {
    const policy = storyboardSemanticTaggingPolicy()
    for (const phrase of ['any language', 'dialect', 'slang', 'transliteration', 'colloquial spelling', 'minor misspelling', 'typed role', 'full ordered sequence', 'exactly one connected authority', 'do not guess']) expect(policy).toContain(phrase)
    expect(policy).toContain('first natural-language mention')
    expect(policy).toContain('exact canonical Canvas tag')
    expect(policy).toContain('Never create an unconnected tag')
  })

  it('accepts provider-resolved Malay and Arabic connected tags without language dictionaries', () => {
    const board = testNode('semantic-board', { kind: 'storyboard', title: 'Storyboard' })
    const phone = testNode('semantic-phone', { kind: 'element', title: 'video-01-scene-01-telefon-pintar-customer', referenceTag: '@video-01-scene-01-telefon-pintar-customer' })
    const lantern = testNode('semantic-lantern', { kind: 'element', title: 'فانوس-نحاسي', referenceTag: '@arabic-brass-lantern' })
    const edges = [
      { id: 'semantic-phone-edge', source: phone.id, target: board.id, targetHandle: 'element-in' },
      { id: 'semantic-lantern-edge', source: lantern.id, target: board.id, targetHandle: 'element-in' },
    ]
    const malay = buildStoryboardConnectedContextManifest(board.id, [board, phone], [edges[0]], 'He checks his fon.')
    const arabic = buildStoryboardConnectedContextManifest(board.id, [board, lantern], [edges[1]], 'يرفع الزبون الفانوس بجانب الباب.')
    expect(malay.entries[0]).toMatchObject({ semanticTagCandidate: true })
    expect(malay.entries[0].matchedAlias).toBeUndefined()
    expect(malay.entries[0].requiredInsertion).toBeUndefined()
    expect(arabic.entries[0]).toMatchObject({ semanticTagCandidate: true })
    expect(validateStoryboardRewrite('He checks his fon.', 'He checks @video-01-scene-01-telefon-pintar-customer.', malay)).toContain('@video-01-scene-01-telefon-pintar-customer')
    expect(validateStoryboardRewrite('يرفع الزبون الفانوس بجانب الباب.', 'يرفع الزبون @arabic-brass-lantern بجانب الباب.', arabic)).toContain('@arabic-brass-lantern')
  })

  it('keeps semantic ambiguity no-guess and rejects unconnected, duplicate, or wrong-case tags atomically', () => {
    const board = testNode('semantic-ambiguous-board', { kind: 'storyboard', title: 'Storyboard' })
    const first = testNode('first-phone', { kind: 'element', title: 'phone-one', referenceTag: '@phone-one' })
    const second = testNode('second-phone', { kind: 'element', title: 'phone-two', referenceTag: '@phone-two' })
    const manifest = buildStoryboardConnectedContextManifest(board.id, [board, first, second], [
      { id: 'first-edge', source: first.id, target: board.id, targetHandle: 'element-in' },
      { id: 'second-edge', source: second.id, target: board.id, targetHandle: 'element-in' },
    ], 'He checks the device.')
    expect(storyboardSemanticTaggingPolicy()).toContain('If multiple connected authorities are plausible, do not guess or tag')
    expect(validateStoryboardRewrite('He checks the device.', 'He carefully checks the device.', manifest)).toBe('He carefully checks the device.')
    expect(() => validateStoryboardRewrite('He checks the device.', 'He checks @unconnected.', manifest)).toThrow(/unconnected/i)
    expect(() => validateStoryboardRewrite('He checks the device.', 'He checks @Phone-One.', manifest)).toThrow(/canonical|unconnected/i)
    expect(() => validateStoryboardRewrite('He checks the device.', 'He checks @phone-one and @phone-one.', manifest)).toThrow(/duplicate/i)
    const panelsForBatch: StoryboardPanel[] = [{ id: 'semantic-a', prompt: 'He checks the device.', duration: 2, shotSize: 'medium', camera: 'static' }, { id: 'semantic-b', prompt: 'She waits nearby.', duration: 2, shotSize: 'wide', camera: 'static' }]
    expect(() => applyStoryboardBatchResponse(panelsForBatch, new Map([['semantic-a', 'He checks the device.'], ['semantic-b', 'She waits beside @unconnected.']]), new Map([['semantic-a', manifest], ['semantic-b', { entries: [], text: '' }]]))).toThrow(/unconnected/i)
    expect(panelsForBatch[0].prompt).toBe('He checks the device.')
    expect(panelsForBatch[1].prompt).toBe('She waits nearby.')
  })

describe('Storyboard whole-sequence mention planning', () => {
  it('uses one shared policy for point-of-use anchors without repetitive descriptive reintroduction', () => {
    const policy = storyboardSequenceMentionPolicy()
    expect(policy).toContain('Inspect every filled earlier and later sibling panel before deciding mentions')
    expect(policy).toContain('Empty sibling prompts provide no narrative evidence')
    expect(policy).toContain('Repeat each exact connected semantic tag at point of use in every relevant shot')
    expect(policy).toContain('character and wardrobe anchors repeat together')
    expect(policy).toContain('Repeated tags do not authorize repeating the full identity, Location, wardrobe, or prop description')
    expect(policy).toContain('First use, a new Location, re-entry after intervening context, ambiguity, or a material state or ownership change')
    expect(policy).toContain('Same-scene adjacent panels inherit already-established descriptive context')
    expect(policy).toContain('CONTINUE inherits setting and state without reintroduction')
    expect(policy).toContain('HARD CUT alone does not require restating the same Location')
    expect(policy).toContain('Do not steal, change, or move neighbouring panel prose')
  })

  it('gives Revamp Shot and Revamp All the same policy while only the selected shot mutates', () => {
    const contexts = new Map(panels.map((panel) => [panel.id, { entries: [], text: '' }]))
    expect(storyboardRewriteInstruction(panels, 'two')).toContain(storyboardSequenceMentionPolicy())
    expect(storyboardBatchRewriteInstruction(panels, contexts)).toContain(storyboardSequenceMentionPolicy())
    const original = structuredClone(panels)
    const outcome = applyStoryboardRewrites(panels, new Map([['two', `${panels[1].prompt}\nThe camera settles.`]]))
    expect(outcome.panels[0]).toEqual(original[0])
    expect(outcome.panels[2]).toEqual(original[2])
    expect(outcome.panels[1].prompt).toContain('The camera settles.')
  })
})

describe('Storyboard canonical Director baseline policy', () => {
  it('keeps the complete canonical SD baseline allowlist separate from provisional CK findings', () => {
    expect(STORYBOARD_DIRECTOR_BASELINE_IDS).toHaveLength(37)
    expect(STORYBOARD_DIRECTOR_BASELINE_IDS.slice(0, 12)).toEqual(Array.from({ length: 12 }, (_, index) => `SD-PS-${String(index + 1).padStart(3, '0')}`))
    expect(STORYBOARD_DIRECTOR_BASELINE_IDS.slice(12)).toEqual(Array.from({ length: 25 }, (_, index) => `SD-AB-${String(index + 1).padStart(3, '0')}`))
    expect(STORYBOARD_DIRECTOR_BASELINE_IDS.join(' ')).not.toMatch(/CK-(?:R|I)/)
  })

  it('uses one hidden missing-only directing policy for Revamp Shot and Revamp All', () => {
    const policy = storyboardDirectorBaselinePolicy()
    const contexts = new Map(panels.map((panel) => [panel.id, { entries: [], text: '' }]))
    expect(policy).toContain('CANONICAL DIRECTOR BASELINE POLICY (HIDDEN)')
    expect(policy).toContain('Seedance 1.1.14')
    expect(policy).toContain('1885768f1efa5fe35a3ff4b3f17d37afe846ce05e6bafa9c1f377b566cb98eb1')
    expect(policy).toContain('SD-PS-001–SD-PS-012')
    expect(policy).toContain('SD-AB-001–SD-AB-025')
    expect(policy).toContain('Refine only authored action, camera, performance, physical-lighting, focus, and explicit connected/approved Style wording')
    expect(policy).toContain('Never invent measurements, lens values, lighting, audio, dialogue, identity, wardrobe, props, setting, transitions, or continuity state')
    expect(policy).toContain('Protect authored establishment, decisive action, consequence, reaction, endpoint, and hold timing')
    expect(policy).toContain('discrete state change')
    expect(policy).toContain('fully concealed or out of frame')
    expect(policy).not.toMatch(/CK-(?:R|I)/)
    expect(storyboardRewriteInstruction(panels, 'two')).toContain(policy)
    expect(storyboardBatchRewriteInstruction(panels, contexts)).toContain(policy)
  })
})

describe('Shot development and already-revamped batch targeting', () => {
  const draft: StoryboardPanel = { id: 'panel-draft-02', prompt: 'i walk on the desert thinking', duration: 5, shotSize: 'close-up', lensMm: 50, camera: 'static' }
  const developed: StoryboardPanel = { ...draft, id: 'panel-developed-01', prompt: 'Original scene.', originalPrompt: 'Original scene.', revampedPrompt: 'A developed take.', selectedPromptVersion: 'original' }
  const contexts = new Map([[draft.id, { entries: [], text: '' }], [developed.id, { entries: [], text: '' }]])

  it('supplies full development and preservation rules to both transports', () => {
    const policy = storyboardShotDevelopmentPolicy()
    for (const instruction of [storyboardRewriteInstruction([draft], draft.id), storyboardBatchRewriteInstruction([draft], contexts)]) {
      expect(instruction).toContain(policy)
      expect(instruction).toContain('Translate an authored feeling such as thinking into observable gaze')
      expect(instruction).toContain('A short sentence that merely names an action, feeling, or camera label is a draft')
      expect(instruction).toContain('Preserve every existing semantic @tag exactly')
      expect(instruction).toContain('Do not otherwise add or alter Character identity, wardrobe, props, Location')
      expect(instruction).toContain('50mm')
    }
    expect(storyboardRewriteTargets([draft])).toEqual([draft])
  })

  it('accepts the selected lens without allowing invented lenses or prop measurements', () => {
    const output = 'I walk through the desert, my gaze lowered in thought, held in a static close-up through a 50mm lens.'
    expect(validateStoryboardRewrite(draft.prompt, output, contexts.get(draft.id), draft, [draft])).toBe(output)
    expect(() => validateStoryboardRewrite(draft.prompt, output.replace('50mm', '85mm'), contexts.get(draft.id), draft, [draft])).toThrow('Revamp invented prop scale')
    expect(() => validateStoryboardRewrite(draft.prompt, output + ' A 50mm stone rests nearby.', contexts.get(draft.id), draft, [draft])).toThrow('Revamp invented prop scale')
    expect(() => validateStoryboardRewrite(draft.prompt, output, contexts.get(draft.id), { ...draft, lensMm: undefined })).toThrow('Revamp invented prop scale')
  })

  it('skips saved results in All even with Original selected, but permits explicit Shot', () => {
    const sequence = [developed, draft]
    expect(storyboardRewriteTargets(sequence)).toEqual([draft])
    expect(storyboardRewriteTargets(sequence, developed.id)).toEqual([developed])
    expect(storyboardRewriteTargets([developed])).toEqual([])
    expect(storyboardRewriteTargets([{ ...draft, revampedPrompt: '  ' }])).toHaveLength(1)
    expect(storyboardBatchTargets(sequence).context.map(panel => [panel.id, panel.editable])).toEqual([['panel-developed-01', false], ['panel-draft-02', true]])
    const instruction = storyboardBatchRewriteInstruction(sequence, contexts)
    expect(instruction).toContain('PANEL ID: panel-developed-01 · READ-ONLY')
    expect(instruction).toContain('REVAMP ALL TARGET ORDER: panel-draft-02')
    expect(applyStoryboardBatchResponse(sequence, new Map([['panel-draft-02', 'I walk through the desert, my gaze lowered in thought.']]), contexts).panels[0]).toBe(developed)
    expect(() => applyStoryboardBatchResponse(sequence, new Map([['panel-developed-01', 'Replacement.'], ['panel-draft-02', 'New take.']]), contexts)).toThrow('Invalid Storyboard batch response.')
  })
})

describe('Storyboard assistant rewrite contract', () => {
  it('rejects a Revamp All panel that drops one authored typed continuity value and applies zero mutations', () => {
    const typedPanels: StoryboardPanel[] = [{
      id: 'cook', duration: 2, prompt: '@cook-one remains at exact burner with same shallow pan, same utensil, right hand on pan handle, woman directly opposite owner across island.',
      continuityGroupId: 'restaurant', activeCharacterTags: ['@cook-one'],
      characterStates: [{ characterTag: '@cook-one', workstation: 'exact burner', propOwnership: ['same shallow pan', 'same utensil'], contacts: ['right hand on pan handle'], worldPosition: 'woman directly opposite owner across island' }],
    }]
    const before = structuredClone(typedPanels)
    expect(() => applyStoryboardBatchResponse(typedPanels, new Map([
      ['cook', '@cook-one remains at exact burner with same shallow pan, same utensil, woman directly opposite owner across island.'],
    ]), new Map([['cook', { entries: [], text: '' }]]))).toThrow(/typed continuity value/i)
    expect(typedPanels).toEqual(before)
  })

  it('gives Revamp Shot whole-sequence immutable typed context and preserves exact state through atomic Revamp All', () => {
    const typedPanels: StoryboardPanel[] = [
      { ...panels[0], continuityGroupId: 'restaurant', activeCharacterTags: ['@owner', '@cook-one'], excludedCharacterTags: ['@outsider'], characterStates: [{ characterTag: '@owner', worldPosition: 'chef-side' }], stateAuthorities: [{ authorityTag: '@meal', scope: 'before', state: 'full meal' }] },
      { ...panels[1], continuityGroupId: 'restaurant', activeCharacterTags: ['@owner', '@cook-one'], characterStateDeltas: [{ characterTag: '@cook-one', visibility: 'blurred-background' }], dialogueSpans: [{ id: 'line', speakerTag: '@owner', text: 'Order up.', startPanelId: 'one', endPanelId: 'two' }] },
    ]
    const instruction = storyboardRewriteInstruction(typedPanels, 'two')
    expect(instruction).toContain('IMMUTABLE TYPED CONTINUITY MANIFEST (HIDDEN)')
    expect(instruction).toContain('"continuityGroupId":"restaurant"')
    expect(instruction).toContain('"worldPosition":"chef-side"')
    expect(instruction).toContain('"visibility":"blurred-background"')
    expect(instruction).toContain('"text":"Order up."')

    const contexts = new Map(typedPanels.map((panel) => [panel.id, { entries: [], text: '' }]))
    const before = typedPanels.map(({ prompt: _prompt, ...typed }) => structuredClone(typed))
    const outcome = applyStoryboardBatchResponse(typedPanels, new Map([
      ['one', '@actor-c waits beside the door.'],
      ['two', `${typedPanels[1].prompt}\nThe camera settles.`],
    ]), contexts)
    expect(outcome.panels.map(({ prompt: _prompt, ...typed }) => typed)).toEqual(before)
  })

  it('keeps future typed state in hidden sequence context but rejects early Revamp anticipation atomically', () => {
    const futurePanels: StoryboardPanel[] = [
      { id: 's1', prompt: '@chef works at the front station.', duration: 2, continuityGroupId: 'service', activeCharacterTags: ['@chef'], characterStates: [{ characterTag: '@chef', worldPosition: 'front station', currentAction: 'current task' }] },
      { id: 's2', prompt: '@chef turns.', duration: 2, continuityGroupId: 'service', activeCharacterTags: ['@chef'], characterStateDeltas: [{ characterTag: '@chef', worldPosition: 'later screen-right', bodyOrientation: 'reverse-view front relation' }] },
      { id: 's3', prompt: '@chef serves.', duration: 2, continuityGroupId: 'service', activeCharacterTags: ['@chef'], characterStateDeltas: [{ characterTag: '@chef', currentAction: 'future action raises the plated dish' }] },
    ]
    const instruction = storyboardRewriteInstruction(futurePanels, 's1')
    expect(instruction).toContain('"worldPosition":"later screen-right"')
    expect(instruction).toContain('"bodyOrientation":"reverse-view front relation"')
    expect(instruction).toContain('"currentAction":"future action raises the plated dish"')
    const original = structuredClone(futurePanels)
    const contexts = new Map(futurePanels.map((panel) => [panel.id, { entries: [], text: '' }]))
    const rewrites = new Map([
      ['s1', '@chef works at the front station, already later screen-right in the reverse-view front relation.'],
      ['s2', futurePanels[1].prompt],
      ['s3', futurePanels[2].prompt],
    ])
    expect(() => applyStoryboardBatchResponse(futurePanels, rewrites, contexts)).toThrow(/future-only|anticipation/i)
    expect(futurePanels).toEqual(original)
  })

  it('gives per-slot Improve and Revamp All the same sequence-aware preservation rules', () => {
    const instruction = storyboardRewriteInstruction(panels, 'two')
    expect(instruction).toContain('CURRENT PANEL: SHOT 2 OF 3')
    expect(instruction).toContain('SHOT 1 · 3s · wide · static')
    expect(instruction).toContain('SHOT 2 · 4s · medium · pan-right')
    expect(instruction).toContain('SHOT 3 · 1s · close-up · static · LOCKED')
    expect(instruction).toContain('SHOT 1 · 3s · wide · static · TRANSITION AFTER: CONTINUE IN SAME UNBROKEN TAKE')
    expect(instruction).toContain('SHOT 2 · 4s · medium · pan-right · TRANSITION AFTER: HARD CUT')
    expect(instruction).toContain('SHOT 3 · 1s · close-up · static · LOCKED · FINAL PANEL')
    expect(instruction).toContain('Preserve every existing semantic @tag exactly')
    expect(instruction).toContain('Preserve headings, SHOT/BEAT structure, HARD CUT placement, exact quoted dialogue')
    expect(instruction).toContain('PERMITTED EDITS ONLY')
    expect(instruction).toContain('Visible action: clarify choreography, timing, contact, physical causality, and readable action order')
    expect(instruction).toContain('Camera movement: clarify only the selected camera move')
    expect(instruction).toContain('Blend permitted camera/action edits into the existing prose')
    expect(instruction).toContain('Never add a new Continuity:, Transition:, SHOT, CUT, or BEAT label')
    expect(instruction).toContain('Everything outside visible action, camera movement, and those already-owned domains plus exact manifest-hinted connected anchors is frozen byte-for-byte')
    expect(instruction).toContain('The only semantic-insertion exception is each exact connected required-anchor marked by hidden manifest metadata')
    expect(instruction).toContain('Every required anchor must appear exactly once; replace its surviving matched safe alias with the canonical tag')
    expect(instruction).toContain('Do not otherwise add or alter Character identity, wardrobe, props, Location, environment, period, style, lighting, dialogue, voice, audio, music, continuity locks, negative constraints, duration, shot size, or transition metadata')
    expect(instruction).not.toContain('Everything outside visible action and camera movement is frozen byte-for-byte')
    expect(instruction).not.toContain('subject, action, environment, composition, lighting, camera, audio, continuity, and constraints')
    expect(instruction).toContain('Return it byte-for-byte unchanged only when that detail is already present')
    expect(instruction).toContain('Return only the revised current panel prompt')
    expect(instruction).toContain('Transition metadata is immutable and compiler-owned')
  })

  it('distinguishes a real text replacement from an unchanged AI response', () => {
    const outcome = applyStoryboardRewrites(panels, new Map([
      ['one', '@actor-c waits beside the locked door.'],
      ['two', panels[1].prompt],
    ]))
    expect(outcome.changed).toBe(1)
    expect(outcome.unchanged).toBe(1)
    expect(outcome.panels[0].prompt).toBe('@actor-c waits beside the locked door.')
    expect(storyboardRewriteProgress(outcome, 'OmniRoute · Claude Opus 5')).toBe('1 panel improved with OmniRoute · Claude Opus 5 · 1 already complete')

    const noChange = applyStoryboardRewrites(panels, new Map([['one', panels[0].prompt]]))
    expect(storyboardRewriteProgress(noChange, 'OmniRoute · Claude Opus 5')).toBe('No text changed — OmniRoute · Claude Opus 5 returned the existing prompt')
  })

  it('rejects newly added continuity or transition meta commentary instead of saving it', () => {
    const source = '@actor-c and @actor-d remain seated while the camera pans right.'
    expect(() => validateStoryboardRewrite(source, `${source}\nContinuity: both characters remain seated and in position, ready for the hard cut to SHOT 2.`)).toThrow('Revamp returned transition or continuity meta commentary instead of smooth camera/action prose.')
    expect(validateStoryboardRewrite(source, '@actor-c and @actor-d remain seated as the camera pans right and settles on their reactions.')).toContain('camera pans right and settles')
  })

  it('sends hidden connected context with the rewrite instruction without changing the visible source prompt', () => {
    const source = 'The phone waits on the desk.'
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const phone = testNode('phone', { kind: 'upload', title: 'iphone-15-pro-front.png', outputType: 'image' })
    const manifest = buildStoryboardConnectedContextManifest('board', [board, phone], [
      { id: 'phone-edge', source: 'phone', target: 'board', targetHandle: 'reference-in' } as Edge,
    ], source)

    const instruction = storyboardRewriteInstruction([{ ...panels[0], prompt: source }], 'one', manifest.text)

    expect(instruction).toContain('CONNECTED CONTEXT MANIFEST')
    expect(instruction).toContain('anchor=@iphone-15-pro-front')
    expect(source).toBe('The phone waits on the desk.')
  })

  it('rejects provider attempts to introduce compiler-owned metadata while allowing ordinary action timing', () => {
    const source = 'Mara lifts the phone after a brief pause.'
    for (const leaked of [
      'Duration: 4s. Mara lifts the phone.',
      'Range: 0.0–4.0s. Mara lifts the phone.',
      'CAMERA BRIDGE · 0.0–1.0s: dolly in.',
      'FOV: 29°. Mara lifts the phone.',
      'bridge-kind=merged | bridge-reserve=1.0s',
      'HARD CUT. Mara lifts the phone.',
      'SHOT 2 / BEAT 1: Mara lifts the phone.',
      'Dolly in at 6 m/s. Mara lifts the phone.',
    ]) expect(() => validateStoryboardRewrite(source, leaked)).toThrow(/compiler metadata/i)
    expect(validateStoryboardRewrite(source, 'Mara waits two seconds, then lifts the phone.')).toBe('Mara waits two seconds, then lifts the phone.')
  })

  it('keeps complete structured prompts byte-for-byte unchanged', () => {
    const complete = `FORMAT MODE: TWO SHOTS / ONE HARD CUT\nTIMELINE:\nSHOT 1 · 0.0–2.0s: Mara waits.\nHARD CUT.\nSHOT 2 · 2.0–4.0s: Mara exits.\nCAMERA: Static.`
    const structuredPanels: StoryboardPanel[] = [{ ...panels[0], id: 'structured', prompt: complete }]

    const outcome = applyStoryboardRewrites(structuredPanels, new Map([['structured', 'A completely different prompt.']]))

    expect(outcome.panels[0].prompt).toBe(complete)
    expect(outcome).toMatchObject({ changed: 0, unchanged: 1 })
    expect(validateStoryboardRewrite(complete, 'A completely different prompt.')).toBe(complete)
    expect(storyboardRewriteTargets([
      structuredPanels[0],
      { ...panels[0], id: 'simple', prompt: 'Mara waits.' },
    ]).map((panel) => panel.id)).toEqual(['simple'])
  })

  it('deterministically replaces a surviving phone alias with the exact required Element tag', () => {
    const source = 'The customer lifts the phone from the counter.'
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const phone = testNode('da452f50-904c-4b44-b3de-f65b8f8704b3', { kind: 'element', title: 'smartphone-customer', referenceTag: '@video-01-scene-01-telefon-pintar-customer' })
    const context = buildStoryboardConnectedContextManifest('board', [board, phone], [
      { id: 'phone-edge', source: phone.id, target: 'board', targetHandle: 'element-in' } as Edge,
    ], source)
    expect(validateStoryboardRewrite(source, 'The customer carefully lifts the phone from the counter.', context)).toBe('The customer carefully lifts the @video-01-scene-01-telefon-pintar-customer from the counter.')
    expect(validateStoryboardRewrite(source, 'The customer carefully lifts the @video-01-scene-01-telefon-pintar-customer from the counter.', context)).toBe('The customer carefully lifts the @video-01-scene-01-telefon-pintar-customer from the counter.')
    expect(() => validateStoryboardRewrite(source, 'The customer carefully lifts the device from the counter.', context)).toThrow(/required connected tag/i)

    const authored = '@video-01-scene-01-telefon-pintar-customer rests on the counter.'
    const authoredContext = buildStoryboardConnectedContextManifest('board', [board, phone], [
      { id: 'phone-edge-authored', source: phone.id, target: 'board', targetHandle: 'element-in' } as Edge,
    ], authored)
    expect(authoredContext.entries[0].requiredInsertion).toBeUndefined()
    expect(validateStoryboardRewrite(authored, authored, authoredContext)).toBe(authored)
  })

  it('keeps ambiguous connected phones no-guess and makes batch insertion atomic', () => {
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const phoneA = testNode('phone-a', { kind: 'element', title: 'telefon-pintar-customer', referenceTag: '@customer-phone' })
    const phoneB = testNode('phone-b', { kind: 'element', title: 'smartphone-manager', referenceTag: '@manager-phone' })
    const edges = [
      { id: 'a', source: 'phone-a', target: 'board', targetHandle: 'element-in' } as Edge,
      { id: 'b', source: 'phone-b', target: 'board', targetHandle: 'element-in' } as Edge,
    ]
    const ambiguous = buildStoryboardConnectedContextManifest('board', [board, phoneA, phoneB], edges, 'The phone rings.')
    expect(ambiguous.entries.every((entry) => !entry.requiredInsertion)).toBe(true)
    expect(validateStoryboardRewrite('The phone rings.', 'The phone rings twice.', ambiguous)).toBe('The phone rings twice.')

    const panelsForBatch: StoryboardPanel[] = [
      { id: 'panel-one', prompt: 'The customer lifts the phone.', duration: 2 },
      { id: 'panel-two', prompt: 'Mara exits.', duration: 2 },
    ]
    const required = buildStoryboardConnectedContextManifest('board', [board, phoneA], [edges[0]], panelsForBatch[0].prompt)
    const contexts = new Map([
      ['panel-one', required],
      ['panel-two', buildStoryboardConnectedContextManifest('board', [board, phoneA], [edges[0]], panelsForBatch[1].prompt)],
    ])
    const original = structuredClone(panelsForBatch)
    expect(() => applyStoryboardBatchResponse(panelsForBatch, new Map([
      ['panel-one', 'The customer carefully lifts the phone.'],
      ['panel-two', 'Mara exits through @unconnected.'],
    ]), contexts)).toThrow(/unconnected/i)
    expect(panelsForBatch).toEqual(original)
  })

  it('accepts one hinted connected anchor and rejects removed, duplicated, unconnected, ordinal, or narrated hidden context', () => {
    const source = '@mara holds the phone.'
    const board = testNode('board', { kind: 'storyboard', title: 'Storyboard' })
    const mara = testNode('mara', { kind: 'character', title: 'Mara', referenceTag: '@mara' })
    const phone = testNode('phone', { kind: 'upload', title: 'iphone-15-pro-front.png', outputType: 'image' })
    const context = buildStoryboardConnectedContextManifest('board', [board, mara, phone], [
      { id: 'mara-edge', source: 'mara', target: 'board', targetHandle: 'character-in' } as Edge,
      { id: 'phone-edge', source: 'phone', target: 'board', targetHandle: 'reference-in' } as Edge,
    ], source)

    expect(validateStoryboardRewrite(source, '@mara holds @iphone-15-pro-front beside the desk.', context)).toContain('@iphone-15-pro-front')
    expect(() => validateStoryboardRewrite(source, 'Mara holds the phone.', context)).toThrow(/authored tag/i)
    expect(() => validateStoryboardRewrite(source, '@mara and @mara hold the phone.', context)).toThrow(/duplicate/i)
    expect(() => validateStoryboardRewrite(source, '@mara holds the phone beside @unconnected.', context)).toThrow(/unconnected/i)
    expect(() => validateStoryboardRewrite(source, '@mara holds the phone beside @Image1.', context)).toThrow(/ordinal/i)
    expect(() => validateStoryboardRewrite(source, '@mara holds the phone. CONNECTED CONTEXT MANIFEST: role=Image Reference.', context)).toThrow(/hidden context/i)
  })

  it('keeps lowercase canonical semantic-tag punctuation unchanged in Revamp without an OpenArt ordinal rule', () => {
    const board = testNode('lowercase-board', { kind: 'storyboard', title: 'Storyboard' })
    const first = testNode('lowercase-first', { kind: 'element', title: 'First', referenceTag: '@image2' })
    const second = testNode('lowercase-second', { kind: 'element', title: 'Second', referenceTag: '@image6' })
    const source = "@image2, remains beside @image6's handle."
    const context = buildStoryboardConnectedContextManifest(board.id, [board, first, second], [
      { id: 'first-edge', source: first.id, target: board.id } as Edge,
      { id: 'second-edge', source: second.id, target: board.id } as Edge,
    ], source)

    expect(validateStoryboardRewrite(source, "@image2, remains firmly beside @image6's handle.", context)).toBe("@image2, remains firmly beside @image6's handle.")
  })
})
