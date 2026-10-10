import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from '../../shared/types'
import { composedProviderPromptEntries, promptWeight, ProviderPromptPreview } from './ProviderPromptPreview'
import { STYLE_PRESETS } from '../../shared/stylePresets'

const validRequest: GenerationRequest = {
  nodeId: 'preview-image',
  kind: 'image-generator',
  prompt: 'A lighthouse above a winter sea.',
}

describe('composed provider prompt inspector', () => {
  it('renders a valid provider prompt in the expanded read-only preview', () => {
    const html = renderToStaticMarkup(<ProviderPromptPreview request={validRequest} inspectionError={null} defaultExpanded />)
    expect(html).toContain('Composed Provider Prompt')
    expect(html).toContain('A lighthouse above a winter sea.')
    expect(html).toContain('DIRECTION LAYER')
    expect(html).toContain('<pre>')
    expect(html).toContain('Copy composed provider prompt')
    expect(html).toContain('chars · ~')
    expect(html).toContain('tokens')
  })

  it('reports exact characters and a conservative four-characters-per-token estimate', () => {
    expect(promptWeight([{ label: 'One', body: '12345' }, { label: 'Two', body: '6789' }])).toEqual({ characters: 9, estimatedTokens: 3 })
  })

  it('renders the prompt assembly error instead of throwing for an empty prompt', () => {
    const entries = composedProviderPromptEntries({ ...validRequest, prompt: '' }, null)
    expect(entries).toEqual([{ label: 'Preview unavailable', body: 'Add a prompt before generating media.' }])
  })

  it('renders a blank Video prompt when connected semantic authorities can supply the provider specification', () => {
    const request: GenerationRequest = {
      nodeId: 'blank-semantic-video',
      kind: 'video-generator',
      prompt: '',
      authoredPrompt: '',
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      references: [{ role: 'character', tag: '@actor-c', path: '/project/actor-c.png', mediaType: 'image', slot: 'reference' }],
      connectionRules: [{ tag: '@actor-c', label: 'Character Identity', rule: 'HARD RULE · preserve identity' }],
    }
    const entries = composedProviderPromptEntries(request, null)
    expect(entries[0].label).not.toBe('Preview unavailable')
    expect(entries[0].body).toContain('REFERENCE AUTHORITY')
    expect(entries[0].body).toContain('Use @actor-c as actor-c.')
    expect(entries[0].body).not.toMatch(/@Image\d+/)
    expect(entries[0].body).toContain('No action or Character performance is inferred from connected references')
    expect(entries[0].body).toContain('FINAL-FRAME AND OUTPUT HARD GATE')
    expect(entries[0].body).toContain('NEGATIVE PROMPT')
  })

  it('renders the inspection error instead of attempting a request preview', () => {
    const html = renderToStaticMarkup(<ProviderPromptPreview request={null} inspectionError="Audio cannot connect to this image socket." defaultExpanded />)
    expect(html).toContain('Request issue')
    expect(html).toContain('Audio cannot connect to this image socket.')
  })

  it('confirms a built-in Style without exposing its private provider instruction', () => {
    const preset = STYLE_PRESETS.find((candidate) => candidate.id === 'dimensional-comic')!
    const entries = composedProviderPromptEntries({ ...validRequest, stylePrompt: preset.prompt, builtInStylePrompts: [preset.prompt] }, null)
    expect(entries[0].body).toContain('[Dimensional Comic built-in Style instructions applied]')
    expect(entries[0].body).not.toContain(preset.prompt)
  })

  it('renders one truthful provider entry per Kling storyboard shot', () => {
    const request: GenerationRequest = {
      nodeId: 'preview-kling',
      kind: 'video-generator',
      duration: 9,
      prompt: 'Global direction.',
      videoEngine: 'fal-ai/kling-video/o3/standard/reference-to-video',
      storyboardContext: 'Maintain the same character and location.',
      multiPrompt: [
        { prompt: 'Wide establishing shot.', duration: '3' },
        { prompt: 'Close detail of the hand.', duration: '2' },
        { prompt: 'Final reaction shot.', duration: '4' },
      ],
    }
    const entries = composedProviderPromptEntries(request, null)
    const html = renderToStaticMarkup(<ProviderPromptPreview request={request} inspectionError={null} defaultExpanded />)
    expect(entries).toHaveLength(3)
    expect(html).toContain('3 shots')
    expect(html).toContain('Shot 1')
    expect(html).toContain('Shot 2')
    expect(html).toContain('Shot 3')
    expect(html).not.toContain('Global direction.')
  })
})
