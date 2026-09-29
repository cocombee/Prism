import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { GenerationRequest, StudioNode } from './types'
import { compileProviderPrompt, compileProviderPromptForSubmission, providerPromptPreviewCompilation, providerSeedancePayloadCompilation, visibleProviderPromptBody } from './referenceInstructions'
import { generationRequirementFailures } from './generationReadiness'
import { buildGenerationRequest } from './workflowResolver'
import { buildStoryboardConnectedContextManifest, storyboardRewriteInstruction, validateStoryboardRewrite } from './storyboardRewrite'

const request = (reference: Record<string, unknown>, prompt = '@case is held closed.'): GenerationRequest => ({
  nodeId: 'prop-scale-video', kind: 'video-generator', prompt, authoredPrompt: '',
  videoEngine: 'bytedance/seedance-2.5/reference-to-video',
  references: [{ role: 'element', tag: '@case', path: '/case.png', mediaType: 'image', slot: 'reference', ...reference } as NonNullable<GenerationRequest['references']>[number]],
  storyboardShots: [{ panelId: 'scale-shot', prompt, duration: 2, shotSize: 'detail', camera: 'static' }],
})

describe('typed referenced-prop scale authority', () => {
  it('emits one shot-local exact-scale and grip-adapts instruction only for an explicit typed lock', () => {
    const compiled = compileProviderPrompt(request({
      propScaleAuthority: {
        preserveReferenceScale: true,
        proportions: 'exact-reference',
        authoredScaleStatement: 'The case is exactly 32 cm wide.',
        approvedScaleExclusions: ['case enlargement', 'case scale drift'],
        shotIds: ['scale-shot'],
      },
    } as unknown as NonNullable<GenerationRequest['references']>[number])).text
    expect(compiled.match(/@case retains exact reference proportions and physical size throughout this shot; hands and grip adapt to the existing prop, not the prop to the grip\./g)).toHaveLength(1)
    expect(compiled).toContain('Authored prop scale: The case is exactly 32 cm wide.')
    expect(compiled).toContain('case enlargement, case scale drift')
  })

  it('does not synthesize scale from a prop reference or state-only authority', () => {
    const stateOnly = request({})
    stateOnly.storyboardShots![0].stateAuthorities = [{ authorityTag: '@case', scope: 'before', state: 'closed', requiredState: 'closed', availableStates: ['closed'] }]
    const compiled = compileProviderPrompt(stateOnly).text
    expect(compiled).not.toMatch(/physical size|exact reference proportions|scale drift|enlargement|dimensions?|\b\d+\s*cm\b/i)
  })

  it('blocks conflicting explicit overlapping prop-scale owners before dispatch without choosing a winner', () => {
    const conflicting = request({ propScaleAuthority: { preserveReferenceScale: true, proportions: 'exact-reference', authoredScaleStatement: 'The case is 32 cm wide.' } })
    conflicting.references!.push({
      ...conflicting.references![0], path: '/case-conflict.png',
      propScaleAuthority: { preserveReferenceScale: true, proportions: 'exact-reference', authoredScaleStatement: 'The case is 48 cm wide.' },
    })
    expect(generationRequirementFailures(conflicting)).toContain('resolve @case prop scale authority: conflicting explicit scale locks overlap; select one approved shot-local scale owner')
    expect(() => compileProviderPromptForSubmission(conflicting)).toThrow('Prop scale authority blocks provider dispatch')
    expect(compileProviderPrompt(conflicting).text).not.toMatch(/32 cm|48 cm|hands and grip adapt/)
  })

  it('keeps the lock shot-local and deduplicated across Composed, provider, filler, and Revamp surfaces', () => {
    const lock = {
      preserveReferenceScale: true as const, proportions: 'exact-reference' as const,
      authoredScaleStatement: 'The case is exactly 32 cm wide.', approvedScaleExclusions: ['case scale drift'], shotIds: ['s1'],
    }
    const element: StudioNode = { id: 'case', type: 'studio', position: { x: 0, y: 0 }, data: {
      kind: 'element', title: 'Case', referenceTag: '@case', propScaleAuthority: lock,
      referenceAssets: [{ id: 'case-ref', name: 'case.png', path: '/case.png', mimeType: 'image/png', createdAt: '' }],
    } }
    const storyboard: StudioNode = { id: 'storyboard', type: 'storyboard', position: { x: 0, y: 0 }, data: {
      kind: 'storyboard', title: 'Storyboard', storyboardDuration: 4,
      storyboardPanels: [
        { id: 's1', prompt: '@case is held.', duration: 2, shotSize: 'detail', camera: 'static', transitionToNext: 'hard-cut' },
        { id: 's2', prompt: '@case rests closed.', duration: 2, shotSize: 'detail', camera: 'static' },
      ],
    } }
    const video: StudioNode = { id: 'video', type: 'studio', position: { x: 0, y: 0 }, data: {
      kind: 'video-generator', title: 'Video', promptMode: 'auto', duration: 4, videoEngine: 'bytedance/seedance-2.5/reference-to-video',
    } }
    const edges: Edge[] = [
      { id: 'case-storyboard', source: 'case', sourceHandle: 'media-out', target: 'storyboard', targetHandle: 'element-in' },
      { id: 'storyboard-video', source: 'storyboard', sourceHandle: 'media-out', target: 'video', targetHandle: 'storyboard-in' },
    ]
    const resolved = buildGenerationRequest(video, [element, storyboard, video], edges)
    expect(resolved.references).toEqual(expect.arrayContaining([expect.objectContaining({ tag: '@case', propScaleAuthority: lock })]))
    const composed = compileProviderPrompt(resolved).text
    const normalize = (value: string) => value.replaceAll('@storyboard', 'storyboard')
    expect(normalize(providerPromptPreviewCompilation(resolved).text)).toBe(normalize(composed))
    expect(normalize(visibleProviderPromptBody(resolved))).toBe(normalize(composed))
    expect(normalize(providerSeedancePayloadCompilation(resolved).text.replaceAll('[Image1]', '@case'))).toBe(normalize(composed))
    expect(composed.match(/hands and grip adapt/g)).toHaveLength(1)
    expect(composed.slice(composed.indexOf('SHOT 2 ·'))).not.toMatch(/hands and grip adapt|32 cm/)

    const manifest = buildStoryboardConnectedContextManifest('storyboard', [element, storyboard, video], edges, '@case is held.', storyboard.data.storyboardPanels![0])
    expect(manifest.text).toContain('prop-scale=exact-reference')
    expect(manifest.text).toContain('authored-scale=The case is exactly 32 cm wide.')
    expect(storyboardRewriteInstruction(storyboard.data.storyboardPanels!, 's1', manifest.text)).toContain('Preserve explicit typed prop-scale authority without inventing scale for any other prop.')
    expect(() => validateStoryboardRewrite('@case is held.', '@case becomes twice as large and is held.', manifest)).toThrow('Revamp contradicted explicit prop-scale authority.')
  })
})