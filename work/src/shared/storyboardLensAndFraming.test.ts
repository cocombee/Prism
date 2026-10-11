import { describe, expect, it } from 'vitest'
import type { GenerationRequest, StoryboardPanel, StudioNode } from './types'
import { resolveWorkflowInput, buildGenerationRequest } from './workflowResolver'
import { shotFov, timedCameraRecipe } from './shotRecipes'
import { compileProviderPromptForSubmission, providerSeedancePayloadCompilation } from './referenceInstructions'
import { storyboardBatchTargets, storyboardRewriteInstruction, applyStoryboardRewrites } from './storyboardRewrite'
import { appendStoryboardPanel } from './storyboardPanels'

const panels: StoryboardPanel[] = [
  { id: 'a', prompt: 'The performer reads the message.', duration: 1, shotSize: 'close-up', camera: 'static', lensMm: 16, transitionToNext: 'hard-cut' },
  { id: 'b', prompt: 'The performer looks toward the doorway.', duration: 1.5, shotSize: 'extreme-wide', camera: 'dolly-out', lensMm: 85 },
]
const storyboard = (value = panels): StudioNode => ({ id: 'board', type: 'storyboard', position: { x: 0, y: 0 }, data: { kind: 'storyboard', title: 'Storyboard', storyboardPanels: value } })
const video = (): StudioNode => ({ id: 'video', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'video-generator', title: 'Video', videoEngine: 'bytedance/seedance-2.5/text-to-video', duration: 2.5 } })
const edge = { id: 'edge', source: 'board', sourceHandle: 'storyboard-out', target: 'video', targetHandle: 'storyboard-in' }

it('keeps framing independent of optics, including both extremes', () => {
  expect(shotFov('wide')).toMatch(/full.*surroundings/i)
  expect(shotFov('close-up')).toMatch(/face.*head and shoulders/i)
  expect(shotFov('extreme-wide')).toMatch(/environment dominates/i)
  expect(shotFov('extreme-close-up')).toMatch(/selected.*feature/i)
  for (const size of ['wide', 'medium', 'close-up', 'detail', 'extreme-wide', 'extreme-close-up']) expect(shotFov(size)).not.toMatch(/°|compression|mm|fisheye/i)
})

it('preserves optional mm through graph resolution, serialized reopen, rewrite, duplicate and append', () => {
  const saved = JSON.parse(JSON.stringify(storyboard())) as StudioNode
  const resolved = resolveWorkflowInput('video', [saved, video()], [edge])
  expect(resolved.storyboardShots?.map(shot => shot.lensMm)).toEqual([16, 85])
  expect(applyStoryboardRewrites(panels, new Map([['a', 'The performer reads the message carefully.']])).panels.map(p => p.lensMm)).toEqual([16, 85])
  const appended = appendStoryboardPanel(panels, () => 'new').panels
  expect(appended[0].lensMm).toBe(16)
  expect(appended.at(-1)?.lensMm).toBe(50)
  expect(storyboardBatchTargets(panels).context.map(p => p.lensMm)).toEqual([16, 85])
  expect(storyboardRewriteInstruction(panels, 'a')).toContain('16mm')
})

for (const [name, compile] of Object.entries({ visible: compileProviderPromptForSubmission, payload: providerSeedancePayloadCompilation })) {
  it(`${name} uses selected mm and framing separately in the final provider prompt`, () => {
    const v = video(), board = storyboard()
    const request = buildGenerationRequest(v, [board, v], [edge])
    const body = compile(request).text
    expect(request.storyboardShots?.map(shot => shot.lensMm)).toEqual([16, 85])
    expect(body).toContain('16mm')
    expect(body).toContain('85mm')
    expect(body).not.toMatch(/63° wide|29° portrait compression|8° detail compression/)
    for (const p of panels) expect(body).toContain(p.prompt)
  })
  it(`${name} does not invent a focal length for older projects`, () => {
    const request: GenerationRequest = { nodeId: 'v', kind: 'video-generator', prompt: '', duration: 1, storyboardShots: [{ prompt: 'Reads.', duration: 1, shotSize: 'close-up', camera: 'static' }] }
    expect(compile(request).text).not.toMatch(/Lens: \d+(?:\.\d+)?mm/)
  })
}

it('does not change manual generator transport when connected lens metadata changes', () => {
  const v = video(), raw = '  Lens authored manually.\r\nDo not append anything.  '
  v.data = { ...v.data, promptMode: 'manual', manualPromptDraft: raw, manualPromptSeeded: true }
  const request = buildGenerationRequest(v, [storyboard(), v], [edge])
  const withoutLens = storyboard(panels.map(({ lensMm, ...panel }) => panel))
  const baseline = buildGenerationRequest(v, [withoutLens, v], [edge])
  expect(request.prompt).toBe(baseline.prompt)
  expect(v.data.manualPromptDraft).toBe(raw)
  expect(request.prompt).not.toMatch(/Lens: (16|85)mm/)
})

it('keeps every field in a maximum twenty-panel extreme sequence in visible and submission prompts', () => {
  const sizes = ['extreme-wide', 'wide', 'medium', 'close-up', 'extreme-close-up', 'detail'] as const
  const lenses = [8,16,24,35,50,85,100]
  const movements = ['static','dolly-in','dolly-out','half-orbit-left','full-orbit-right','pedestal-up','crane-down','track-forward','handheld-intense','zoom-out']
  const extreme = Array.from({length:20},(_,index):StoryboardPanel=>({id:`stress-${index}`,prompt:`Unique authored action ${index}: the performer raises the numbered object ${index}.`,duration:index%2 ? 1.5 : 1,shotSize:sizes[(index*5)%sizes.length],lensMm:lenses[(index*3)%lenses.length],camera:movements[index%movements.length],transitionToNext:'hard-cut'}))
  const v=video();v.data.duration=25
  const request=buildGenerationRequest(v,[storyboard(extreme),v],[edge])
  expect(request.storyboardShots).toHaveLength(20)
  expect(request.storyboardShots?.at(-1)?.endSeconds).toBe(25)
  const visible=compileProviderPromptForSubmission(request).text
  const submission=providerSeedancePayloadCompilation(request).text
  for (const body of [visible,submission]) for (const panel of extreme) {
    expect(body).toContain(panel.prompt)
    expect(body).toContain(`${panel.lensMm}mm`)
  }
  expect(visible).not.toMatch(/63° wide|29° portrait|8° detail/)
  expect(submission).toContain('a half circuit')
  expect(submission).toContain('a full circuit')
})


it('routes selected focal length and timed movement through native Kling multi-shot entries', () => {
  const v=video();v.data.videoEngine='fal-ai/kling-video/v3/pro/text-to-video'
  const request=buildGenerationRequest(v,[storyboard(),v],[edge])
  expect(request.multiPrompt?.[0].prompt).toContain('16mm')
  expect(request.multiPrompt?.[1].prompt).toContain('85mm')
  expect(request.multiPrompt?.[1].prompt).toContain('selected 1.5s interval')
})


it('maps only camera pace to its duration and keeps subject speed independent', () => {
  expect(timedCameraRecipe('dolly-in',10,'Fast dolly in toward her face.')).toContain('do not slow or stretch')
  expect(timedCameraRecipe('fast-dolly-in',10)).toContain('do not slow or stretch')
  expect(timedCameraRecipe('dolly-in',10,'The performer slowly opens the door.')).toContain('over the selected 10.0s interval')
  expect(timedCameraRecipe('dolly-in',10,'The camera follows her as she slowly walks past the windows.')).toContain('over the selected 10.0s interval')
  expect(timedCameraRecipe('dolly-in',10,'The camera dollies in extremely fast.')).toContain('do not slow or stretch')
  for (const duration of [1,10]) expect(timedCameraRecipe('zoom-out',duration)).toContain(`over the selected ${duration.toFixed(1)}s interval`)
  expect(timedCameraRecipe('static',1)).toContain('no camera travel is added')
})


it('preserves saved fine decimal timing in timeline and camera instructions', () => {
  const fine=panels.map((p,i)=>({...p,duration:i?1.75:1.25}))
  const v=video();v.data.duration=3
  const request=buildGenerationRequest(v,[storyboard(fine),v],[edge])
  for (const body of [request.prompt,compileProviderPromptForSubmission(request).text,providerSeedancePayloadCompilation(request).text]) {
    expect(body).toContain('1.25')
    expect(body).toContain('1.75s')
    expect(body).not.toContain('1.3s')
    expect(body).not.toContain('1.8s')
  }
})
