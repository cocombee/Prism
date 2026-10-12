import { describe, expect, it } from 'vitest'
import { buildGenerationRequest, buildGenerationPromptPreviewRequest } from './workflowResolver'
import { visibleProviderPromptBody } from './referenceInstructions'
import { assertVideoProviderPromptPreflight } from './providerPromptPreflight'
import { generationRequirementFailures } from './generationReadiness'
import type { StudioNode } from './types'

function graph(secondDuration = 1) {
  const story: StudioNode = { id: 'story', type: 'storyboard', position: { x: 0, y: 0 }, data: { kind: 'storyboard', title: 'Story', storyboardPanels: [
    { id: 'one', prompt: 'Haji walks across the entrance.', duration: 4, shotSize: 'wide', camera: 'dolly-down', transitionToNext: 'continue' },
    { id: 'two', prompt: 'Haji crosses the destination threshold.', duration: secondDuration, shotSize: 'wide', camera: 'dolly-up' },
  ] } }
  const video: StudioNode = { id: 'video', type: 'studio', position: { x: 500, y: 0 }, data: { kind: 'video-generator', title: 'Video', promptMode: 'auto', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 5 } }
  return { story, video, nodes: [story, video], edges: [{ id: 'connection', source: 'story', target: 'video', sourceHandle: 'storyboard-out', targetHandle: 'storyboard-in' }] }
}

describe('immediate connected provider preview', () => {
  it.each(['image-generator', 'video-generator'] as const)('updates the %s final reference introduction synchronously as ordinary media Description is typed', kind => {
    const { story, video, nodes, edges } = graph()
    const media: StudioNode = { id: 'reference', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'upload', title: 'Door Reference', referenceTag: '@door-reference', assetPath: '/fixture/door.png', assetUrl: 'asset://door', outputType: 'image', referenceDescription: '@door-reference is the sole reference for Door A closed.', referenceDescriptionMode: 'authored' } }
    const generator: StudioNode = kind === 'video-generator' ? video : { id: 'image', type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: 'Image', prompt: 'Show the doorway.' } }
    const graphNodes = kind === 'video-generator' ? [...nodes, media] : [generator, media]
    const graphEdges = [...(kind === 'video-generator' ? edges : []), { id: 'media-generator', source: media.id, sourceHandle: 'media-out', target: generator.id, targetHandle: 'reference-in' }]
    const render = () => visibleProviderPromptBody(kind === 'video-generator' ? buildGenerationPromptPreviewRequest(generator, graphNodes, graphEdges) : buildGenerationRequest(generator, graphNodes, graphEdges))
    const providerDescription = () => kind === 'image-generator' ? media.data.referenceDescription!.replaceAll('@door-reference', 'Reference Image 1') : media.data.referenceDescription!
    const first = render()
    expect(first).toContain(providerDescription())
    if (kind === 'video-generator') expect(first).toContain('REFERENCE INTRODUCTIONS\n')
    media.data.referenceDescription = '@door-reference is the sole reference for Door A open; preserve the door leaves and their hinge positions.'
    const second = render()
    expect(second).toContain(providerDescription())
    expect(second).not.toContain('sole reference for Door A closed.')
    expect(second.split(providerDescription())).toHaveLength(2)
    expect(story.data.storyboardPanels![0].prompt).toBe('Haji walks across the entrance.')
    expect(generator.data.prompt).toBe(kind === 'image-generator' ? 'Show the doorway.' : undefined)
  })
  it('compiles estimated Continue beats while keeping strict generation available', () => {
    const { video, nodes, edges } = graph()
    const strict = buildGenerationRequest(video, nodes, edges)
    expect(strict.promptPreviewOnly).toBeUndefined()
    const text = visibleProviderPromptBody(strict)
    expect(text).toContain('4.0–5.0s')
    expect(text).toContain('Dolly Up')
    expect(text).not.toContain('HARD CUT.')
  })
  it('previews a too-short native beat immediately while preserving the one-second Run minimum', () => {
    const { video, nodes, edges } = graph(0.5)
    video.data.falNative = { endpointId: 'bytedance/seedance-2.5/reference-to-video', label: 'Seedance', flow: 'video', fingerprint: 'a'.repeat(64), promptField: 'prompt', values: { duration: '5' }, media: [], timing: { kind: 'seconds', field: 'duration', source: 'provider-declaration' } }
    expect(() => buildGenerationRequest(video, nodes, edges)).toThrow(/minimum 1.0s/)
    const preview = buildGenerationPromptPreviewRequest(video, nodes, edges)
    expect(visibleProviderPromptBody(preview)).toContain('Haji crosses the destination threshold.')
    expect(preview.storyboardShots?.[1].duration).toBe(0.5)
    expect(() => assertVideoProviderPromptPreflight(preview)).toThrow(/display-only/)
  })
  it('shows the current edited text even while timing is invalid, and refuses to submit a preview', () => {
    const { story, video, nodes, edges } = graph(2)
    const before = JSON.stringify(nodes)
    expect(() => buildGenerationRequest(video, nodes, edges)).toThrow(/exceeds/)
    const first = buildGenerationPromptPreviewRequest(video, nodes, edges)
    expect(visibleProviderPromptBody(first)).toContain('Haji crosses the destination threshold.')
    expect(() => assertVideoProviderPromptPreflight(first)).toThrow(/display-only/)
    expect(generationRequirementFailures(first)).toEqual([expect.stringContaining('display-only')])
    expect(JSON.stringify(nodes)).toBe(before)
    story.data.storyboardPanels![1].prompt = 'Haji raises his right hand at the destination.'
    const updated = visibleProviderPromptBody(buildGenerationPromptPreviewRequest(video, nodes, edges))
    expect(updated).toContain('Haji raises his right hand at the destination.')
    expect(updated).not.toContain('Haji crosses the destination threshold.')
  })
})
