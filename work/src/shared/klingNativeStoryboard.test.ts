import { describe, expect, it, vi } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { GenerationRequest, StoryboardPanel, StudioNode } from './types'
import { buildGenerationRequest } from './workflowResolver'
import { assertGenerationRequirements, generationRequirementFailures } from './generationReadiness'
import { klingStoryboardPrompts, visibleProviderPromptBody } from './referenceInstructions'
import { buildKlingNativeMultiPrompt, groupedKlingStoryboard, klingNativeStoryboardReadinessFailures } from './klingNativeStoryboard'

const model = 'fal-ai/kling-video/v3/standard/text-to-video'
const panels: StoryboardPanel[] = [
  { id: 'p1', prompt: 'Mara holds the cup at the counter.', duration: 2, shotSize: 'medium', camera: 'static', transitionToNext: 'continue', continuityGroupId: 'counter', activeCharacterTags: ['@mara'], characterStates: [{ characterTag: '@mara', worldPosition: 'counter-left', gazeTarget: 'visitor', currentAction: 'holds cup', performanceState: 'warm smile' }], dialogueSpans: [{ id: 'welcome', speakerTag: '@mara', text: '欢迎。\n慢慢来。', startPanelId: 'p1', endPanelId: 'p3', insertAudioPanelIds: ['p3'], delivery: 'warm', lipSync: 'continuous' }] },
  { id: 'p2', prompt: 'Mara turns the cup while speaking.', duration: 3, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut', continuityGroupId: 'counter', characterStateDeltas: [{ characterTag: '@mara', handState: 'right hand on cup handle' }], audioCue: 'one quiet ceramic tap' },
  { id: 'p3', prompt: 'Cut closer to the visitor receiving the cup.', duration: 3, shotSize: 'medium', camera: 'static', continuityGroupId: 'counter', characterStateDeltas: [{ characterTag: '@mara', currentAction: 'offers cup' }] },
]

function graph(sourcePanels = panels, videoDuration = 8): { nodes: StudioNode[]; edges: Edge[]; video: StudioNode } {
  const board: StudioNode = { id: 'board', type: 'storyboard', position: { x: 0, y: 0 }, data: { kind: 'storyboard', title: 'Counter', storyboardPanels: sourcePanels } }
  const video: StudioNode = { id: 'video', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'video-generator', title: 'Kling', videoEngine: model, duration: videoDuration, generateAudio: true, promptMode: 'auto' } }
  return { nodes: [board, video], edges: [{ id: 'story', source: 'board', target: 'video', sourceHandle: 'media-out', targetHandle: 'storyboard-in' }], video }
}

function resolved(sourcePanels = panels, duration = 8): GenerationRequest {
  const input = graph(sourcePanels, duration)
  return buildGenerationRequest(input.video, input.nodes, input.edges)
}

describe('verified Kling native storyboard grouping', () => {
  it('sends three Continue/Cut panels as two native shots without changing authored panels', () => {
    const input = graph()
    const frozen = JSON.stringify(input)
    const request = buildGenerationRequest(input.video, input.nodes, input.edges)
    expect(request.storyboardShots).toHaveLength(3)
    expect(request.storyboardShotCount).toBe(2)
    expect(request.multiPrompt?.map(shot => shot.duration)).toEqual(['5', '3'])
    expect(request.multiPrompt?.[0].prompt).toContain('BEAT 1 · 0–2s')
    expect(request.multiPrompt?.[0].prompt).toContain('BEAT 2 · 2–5s')
    expect(generationRequirementFailures(request)).toEqual([])
    const native = klingStoryboardPrompts(request)!
    expect(native.map(shot => shot.duration)).toEqual(['5', '3'])
    expect(native[0].prompt).toContain('NATIVE SHOT 1 · 5s · one unbroken shot')
    expect(native[0].prompt).toContain('Mara holds the cup at the counter.')
    expect(native[0].prompt).toContain('Mara turns the cup while speaking.')
    expect(native[0].prompt).not.toContain('Cut closer to the visitor receiving the cup.')
    expect(native[1].prompt).toContain('NATIVE SHOT 2 · 3s · one unbroken shot')
    expect(native[1].prompt).toContain('Cut closer to the visitor receiving the cup.')
    expect(native[1].prompt).not.toContain('Mara turns the cup while speaking.')
    expect(native[1].prompt).toContain('world=counter-left')
    expect(native[1].prompt).toContain('hand=right hand on cup handle')
    expect(native[1].prompt).toContain('action=offers cup')
    expect(native[0].prompt).toContain('DIALOGUE SPAN · welcome · shots 1–2')
    expect(native[0].prompt.match(/欢迎。\n慢慢来。/g)).toHaveLength(1)
    expect(native[1].prompt).not.toContain('欢迎。')
    expect(native[1].prompt).toContain('speaker=@mara')
    expect(native[1].prompt).toContain('do not restart or repeat the line')
    expect(native[0].prompt.match(/one quiet ceramic tap/g)).toHaveLength(1)
    expect(JSON.stringify(input)).toBe(frozen)
  })

  it('keeps full group ordinals and inherited state when the owning line starts in a later native shot', () => {
    const modified = panels.map(panel => ({ ...panel }))
    modified[0] = { ...modified[0], transitionToNext: 'hard-cut', dialogueSpans: [] }
    modified[1] = { ...modified[1], dialogueSpans: [{ id: 'later', speakerTag: '@mara', text: 'The line begins here.', startPanelId: 'p2', endPanelId: 'p3', insertAudioPanelIds: ['p3'] }] }
    const request = resolved(modified)
    const native = klingStoryboardPrompts(request)!
    expect(native).toHaveLength(3)
    expect(native[0].prompt).not.toContain('The line begins here.')
    expect(native[1].prompt).toContain('DIALOGUE SPAN · later · shots 2–3')
    expect(native[1].prompt.match(/The line begins here\./g)).toHaveLength(1)
    expect(native[2].prompt).toContain('speaker=@mara')
    expect(native[2].prompt).not.toContain('The line begins here.')
  })

  it('checks capacity after grouping: eight beats can remain one supported native shot', () => {
    const beats: StoryboardPanel[] = Array.from({ length: 8 }, (_, index) => ({ id: `b${index}`, prompt: `Living beat ${index}.`, duration: 1, shotSize: 'medium', camera: 'static', transitionToNext: 'continue' as const }))
    const request = resolved(beats)
    expect(request.storyboardShots).toHaveLength(8)
    expect(request.multiPrompt).toHaveLength(1)
    expect(request.multiPrompt![0].duration).toBe('8')
    expect(generationRequirementFailures(request)).toEqual([])
    expect(klingStoryboardPrompts(request)).toHaveLength(1)
  })

  it('blocks unrepresentable fractional native shots while accepting fractional beats whose group is integral', () => {
    const fraction: StoryboardPanel[] = [
      { id: 'a', prompt: 'First action.', duration: 1.5, shotSize: 'medium', camera: 'static', transitionToNext: 'continue' },
      { id: 'b', prompt: 'Second action.', duration: 1.5, shotSize: 'medium', camera: 'static' },
    ]
    const continuous = resolved(fraction, 3)
    expect(continuous.multiPrompt?.map(shot => shot.duration)).toEqual(['3'])
    expect(generationRequirementFailures(continuous)).toEqual([])
    const edited = resolved([{ ...fraction[0], transitionToNext: 'hard-cut' }, fraction[1]], 3)
    expect(edited.storyboardShots?.map(shot => shot.duration)).toEqual([1.5, 1.5])
    expect(edited.multiPrompt?.map(shot => shot.duration)).toEqual(['1.5', '1.5'])
    expect(generationRequirementFailures(edited)).toEqual(expect.arrayContaining([expect.stringContaining('No padding or rounding')]))
    expect(() => klingStoryboardPrompts(edited)).toThrow(/integer duration/)
  })

  it('blocks seven actual shots, unsupported totals, mismatched duration and stale per-panel arrays without paid preparation', () => {
    const seven = resolved(Array.from({ length: 7 }, (_, index) => ({ id: `s${index}`, prompt: `Shot ${index}`, duration: 1, shotSize: 'medium', camera: 'static', transitionToNext: 'hard-cut' })), 7)
    const valid = resolved()
    const examples = [seven, { ...valid, duration: 5 }, { ...valid, duration: 16, multiPrompt: [{ prompt: 'Long shot.', duration: '16' }], storyboardShots: undefined }, { ...valid, multiPrompt: valid.storyboardShots!.map(shot => ({ prompt: shot.prompt, duration: String(shot.duration) })) }]
    const paidPreparation = vi.fn()
    for (const request of examples) {
      const before = JSON.stringify(request)
      expect(() => { assertGenerationRequirements(request); paidPreparation() }).toThrow()
      expect(() => klingStoryboardPrompts(request)).toThrow()
      expect(JSON.stringify(request)).toBe(before)
    }
    expect(paidPreparation).not.toHaveBeenCalled()
    expect(seven.storyboardShots).toHaveLength(7)
    expect(seven.multiPrompt).toHaveLength(7)
  })

  it('keeps Manual bytes for a single prompt and blocks silently repeating that master across native shots', () => {
    const authored = '  已批准原文\nPreserve every space.  '
    const request = { ...resolved(), providerPromptOverride: authored }
    expect(visibleProviderPromptBody(request)).toBe(authored)
    expect(() => klingStoryboardPrompts(request)).toThrow(/Manual master cannot/)
    const single = { ...request, storyboardShots: undefined, multiPrompt: undefined }
    expect(visibleProviderPromptBody(single)).toBe(authored)
    expect(klingStoryboardPrompts(single)).toBeUndefined()
    expect(generationRequirementFailures(single)).toEqual([])
  })

  it('rejects unknown Kling routes and unsupported transition meanings instead of borrowing generic family support', () => {
    const request = resolved()
    expect(klingNativeStoryboardReadinessFailures({ ...request, videoEngine: 'fal-ai/kling-video/unknown/reference-to-video' })).toEqual(expect.arrayContaining([expect.stringContaining('unverified')]))
    expect(() => klingStoryboardPrompts({ ...request, videoEngine: 'new-kling-mode' })).toThrow(/unverified/)
    const unsupported = { ...request, storyboardShots: request.storyboardShots!.map((shot, index) => index === 0 ? { ...shot, transitionToNext: 'flash' as never } : shot) }
    expect(klingNativeStoryboardReadinessFailures(unsupported)).toEqual(expect.arrayContaining([expect.stringContaining('authored transition')]))
  })

  it('does not mutate direct group inputs or insert fake cuts and preserves caller-native arrays without a storyboard', () => {
    const request = resolved()
    const frozen = JSON.stringify(request.storyboardShots)
    const groups = groupedKlingStoryboard(request.storyboardShots!)
    expect(groups.map(group => group.shotIndices)).toEqual([[0, 1], [2]])
    expect(buildKlingNativeMultiPrompt(request.storyboardShots!)).toHaveLength(2)
    expect(JSON.stringify(request.storyboardShots)).toBe(frozen)
    const direct: GenerationRequest = { nodeId: 'direct', kind: 'video-generator', videoEngine: model, duration: 5, multiPrompt: [{ prompt: 'First exact action.', duration: '2' }, { prompt: 'Second exact action.', duration: '3' }] }
    expect(klingNativeStoryboardReadinessFailures(direct)).toEqual([])
    expect(klingStoryboardPrompts(direct)?.map(shot => shot.duration)).toEqual(['2', '3'])
    expect(klingNativeStoryboardReadinessFailures({ ...direct, multiPrompt: [{ prompt: 'Exact action.', duration: '5.0' }] })).toEqual(expect.arrayContaining([expect.stringContaining('not representable')]))
    expect(klingNativeStoryboardReadinessFailures({ ...direct, duration: 2, multiPrompt: [{ prompt: 'Exact action.', duration: '2' }] })).toEqual(expect.arrayContaining([expect.stringContaining('total integer duration from 3–15s')]))
  })

  it('applies clip endpoint references only to their owning native item without changing the shared media request', () => {
    const request: GenerationRequest = {
      ...resolved(), videoEngine: 'fal-ai/kling-video/v3/standard/image-to-video', inputRole: 'start-frame', inputTag: '@start', inputPath: '/fixture/start.png',
      references: [{ role: 'reference', tag: '@start', slot: 'start', path: '/fixture/start.png' }, { role: 'reference', tag: '@end', slot: 'end', path: '/fixture/end.png' }],
    }
    const frozen = JSON.stringify(request)
    const native = klingStoryboardPrompts(request)!
    expect(native[0].prompt).toContain('FIRST FRAME\n@start')
    expect(native[0].prompt).not.toContain('@end')
    expect(native[1].prompt).not.toContain('FIRST FRAME')
    expect(native[1].prompt).not.toContain('@start')
    expect(native[1].prompt).toContain('@end')
    expect(JSON.stringify(request)).toBe(frozen)
  })
})
