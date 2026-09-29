import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { compileProviderPrompt, visibleProviderPromptBody } from './referenceInstructions'
import { inspectGenerationRequest } from './workflowResolver'
import type { StudioNode } from './types'
import { cameraSupportNativeFields } from './cameraSupportSemantics'

function request(camera: string, prompt: string, authoredPrompt = prompt): GenerationRequest {
  return {
    nodeId: 'video', kind: 'video-generator', prompt, authoredPrompt,
    videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 4, motionCadence: 24,
    storyboardShots: [{ prompt, duration: 4, shotSize: 'medium', camera }],
    references: [], connectionRules: [], negativePrompt: 'NO RANDOM JITTER; preserve authored grain',
  }
}

function section(body: string, heading: string): string {
  return body.split(`\n${heading}\n`)[1]?.split('\n\n')[0] || ''
}

describe('camera support provider compilation', () => {
  it('adds the selected support qualifier around authored camera prose without changing authored action/path bytes', () => {
    const authoredPath = 'Track left beside @hero on the authored rail; she opens the red door at 2.0s.'
    const body = visibleProviderPromptBody(request('handheld-intense', authoredPath, `CAMERA\n${authoredPath}`))
    const camera = section(body, 'CAMERA')
    expect(camera).toContain('Strong reactive handheld shake may disturb the framing locally, but remains anchored to the current authored viewpoint and recovers into that composition.')
    expect(camera).toContain(authoredPath)
    expect(body.match(new RegExp(authoredPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(2)
    expect(camera).not.toMatch(/fight mode|choreography|impact response|reportage|\bENG\b/)
  })

  it('emits support texture alone without inventing path, target, action, event, timing, lens, focus, zoom, light, composition, endpoint, or Style', () => {
    const body = visibleProviderPromptBody(request('handheld-subtle', 'A woman waits.'))
    const camera = section(body, 'CAMERA')
    expect(camera).toBe('SHOT 1: Near-locked gentle handheld micro-sway remains local to the current authored viewpoint and framing, then settles calmly at that anchor.')
    for (const invented of ['track', 'pan', 'tilt', 'push', 'pull', 'orbit', 'arc', 'target', 'event', 'lens', 'focus', 'zoom', 'lighting', 'composition', 'endpoint', 'Style']) expect(camera).not.toContain(invented)
  })

  it('merges exact selected exclusions into the final negative prompt with authored exceptions and byte-preserving dedupe', () => {
    const authored = 'The collision explicitly triggers one camera shudder; rack focus hunts once; crash zoom corrects framing; operator overshoot is authored.'
    const body = visibleProviderPromptBody(request('shoulder-rig', authored))
    const negative = section(body, 'NEGATIVE PROMPT')
    expect(negative).toContain('NO RANDOM JITTER; preserve authored grain')
    expect(negative.match(/random jitter/gi)).toHaveLength(1)
    for (const exact of ['no support-generated invented camera path', 'no support-generated orbit', 'no support-generated lateral travel', 'no support-generated parallax sweep', 'no support-generated viewing-side change', 'no support-generated invented reframing']) expect(negative).toContain(exact)
  })

  it('keeps static, Steadicam, and gimbal outside support semantics and surfaces a deterministic locked-static readiness conflict', () => {
    for (const value of ['static', 'steadicam', 'gimbal-follow']) {
      const body = visibleProviderPromptBody(request(value, 'A woman waits.'))
      expect(body).not.toContain('support texture')
      expect(body).not.toContain('no frame-to-frame cadence jitter')
    }
    const storyboard: StudioNode = { id: 'board', type: 'default', position: { x: 0, y: 0 }, data: { kind: 'storyboard', title: 'Storyboard', duration: 4, storyboardPanels: [{ id: 'p1', prompt: 'Use a locked static camera with zero camera movement.', duration: 4, shotSize: 'wide', camera: 'handheld' }] } as StudioNode['data'] }
    const video: StudioNode = { id: 'video', type: 'default', position: { x: 0, y: 0 }, data: { kind: 'video-generator', title: 'Video', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 4 } as StudioNode['data'] }
    const inspected = inspectGenerationRequest(video, [storyboard, video], [{ id: 'e', source: 'board', target: 'video', targetHandle: 'storyboard-in' }])
    expect(inspected.request).toBeNull()
    expect(inspected.error).toBe('Camera support conflict: handheld cannot be combined with an explicitly locked static camera with zero camera movement.')
    expect(() => visibleProviderPromptBody(request('handheld', 'Use a locked static camera with zero camera movement.'))).toThrow('Camera support conflict: handheld cannot be combined with an explicitly locked static camera with zero camera movement.')
    expect(() => visibleProviderPromptBody(request('handheld', 'Hold the static endpoint, then track left.'))).not.toThrow()
  })

  it('keeps one final generic-provider negative block while preserving Filmic Motion bytes', () => {
    const genericRequest = { ...request('handheld', 'Track left exactly as authored.'), videoEngine: 'fal-ai/kling-video/o3/standard/text-to-video' }
    const body = visibleProviderPromptBody(genericRequest)
    expect(body.match(/^NEGATIVE PROMPT$/gm)).toHaveLength(1)
    expect(section(body, 'NEGATIVE PROMPT')).toContain('no support-generated continuous directional drift')
    expect(section(body, 'NEGATIVE PROMPT')).toContain('hard photographic cadence')
  })

  it('preserves all four stored values as themselves without load mutation or Static fallback', () => {
    for (const camera of ['handheld', 'handheld-subtle', 'handheld-intense', 'shoulder-rig']) {
      const storedPanel = { id: 'p1', prompt: 'Mara waits.', duration: 4 as const, shotSize: 'wide', camera }
      const storyboard: StudioNode = { id: 'board', type: 'default', position: { x: 0, y: 0 }, data: { kind: 'storyboard', title: 'Storyboard', duration: 4, storyboardPanels: [storedPanel] } as StudioNode['data'] }
      const video: StudioNode = { id: 'video', type: 'default', position: { x: 0, y: 0 }, data: { kind: 'video-generator', title: 'Video', videoEngine: 'bytedance/seedance-2.5/reference-to-video', duration: 4 } as StudioNode['data'] }
      const inspected = inspectGenerationRequest(video, [storyboard, video], [{ id: 'e', source: 'board', target: 'video', targetHandle: 'storyboard-in' }])
      expect(inspected.error).toBeNull()
      expect(inspected.request?.storyboardShots?.[0].camera).toBe(camera)
      expect(storyboard.data.storyboardPanels?.[0].camera).toBe(camera)
    }
  })

  it('keeps User bytes and visible Locked output free of hidden Revamp policy', () => {
    const selected = request('shoulder-rig', 'Mara waits.')
    const locked = visibleProviderPromptBody(selected)
    expect(locked).not.toContain('SELECTED CAMERA SUPPORT POLICY')
    expect(locked).not.toContain('Preserve the already-authored camera path and action exactly; clarify only')
    const user = 'USER BYTE 01\n@optional-tag remains wholly editable.'
    expect(visibleProviderPromptBody({ ...selected, providerPromptOverride: user })).toBe(user)
  })

  it('changes only CAMERA and NEGATIVE PROMPT sections in exact comparison fixtures', () => {
    const withoutOwnedSections = (body: string) => body
      .replace(/\nCAMERA\n[\s\S]*?\n\nLENS AND OPTICS/, '\nCAMERA\n<camera-support-owned>\n\nLENS AND OPTICS')
      .replace(/\nNEGATIVE PROMPT\n[\s\S]*$/, '\nNEGATIVE PROMPT\n<camera-support-owned>')
    const baseline = withoutOwnedSections(visibleProviderPromptBody(request('static', 'Mara crosses the hall at 2.0s.')))
    for (const camera of ['handheld', 'handheld-subtle', 'handheld-intense', 'shoulder-rig']) {
      expect(withoutOwnedSections(visibleProviderPromptBody(request(camera, 'Mara crosses the hall at 2.0s.')))).toBe(baseline)
    }
  })

  it('reports semantic-prompt-only/native-unverified support and adds no native payload fields', () => {
    const compilation = compileProviderPrompt(request('handheld', 'A woman waits.'))
    expect(compilation.controlDiagnostics).toContainEqual(expect.objectContaining({
      code: 'camera-support-provider-support', blocking: false, status: 'semantic-prompt-only', nativeSupport: 'native-unverified', selectedValues: ['handheld'],
    }))
    expect(cameraSupportNativeFields()).toEqual({})
  })
})
