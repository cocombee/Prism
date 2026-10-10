import { describe, expect, it } from 'vitest'
import type { GenerationRequest, StudioNode } from './types'
import { providerAudioPromptText } from './requestPreview'
import { providerPromptPreviewCompilation, visibleProviderPromptBody } from './referenceInstructions'
import { compileElevenAudioRequest } from './elevenLabsAudio'
import { buildGenerationRequest } from './workflowResolver'

const authored = '  [whispers] "Salam, @speaker."\n\n[pauses] Stay here.  '
const metadata = {
  stylePrompt: 'A photographic camera style.',
  connectionRules: [{ tag: '@script', label: 'Prompt', rule: 'Use this script exactly once.' }],
  references: [{ role: 'character' as const, tag: '@speaker', path: '/project/speaker.png', description: 'Camera-facing hero.' }],
  providerPromptOverride: 'This video-only override must never be spoken.',
}
const routes: Array<[string, GenerationRequest, string]> = [
  ['direct Eleven speech', { nodeId: 'audio', kind: 'voiceover', voiceEngine: 'elevenlabs-direct', voiceModelId: 'eleven_v3', voice: 'voice-id', prompt: authored }, authored],
  ['direct Eleven effects', { nodeId: 'audio', kind: 'sound-effects', audioProvider: 'elevenlabs', prompt: authored }, authored],
  ['Fish speech', { nodeId: 'audio', kind: 'voiceover', voiceEngine: 'fish-audio', fishReferenceId: 'voice-ref', prompt: authored }, authored],
  ['fal Eleven speech', { nodeId: 'audio', kind: 'voiceover', voiceEngine: 'elevenlabs', prompt: authored }, authored.trim()],
  ['legacy fal speech', { nodeId: 'audio', kind: 'voiceover', prompt: authored }, authored.trim()],
  ['fal effects', { nodeId: 'audio', kind: 'sound-effects', prompt: authored }, authored.trim()],
  ['fal music', { nodeId: 'audio', kind: 'music-generator', prompt: authored }, authored.trim()],
]

describe('audio prompt inspection matches current wire text', () => {
  it.each(routes)('%s preserves spoken text, pauses and tags without adding visual metadata', (_label, request, expected) => {
    const resolved = { ...request, ...metadata }
    expect(providerAudioPromptText(resolved)).toBe(expected)
    expect(providerPromptPreviewCompilation(resolved).text).toBe(expected)
    expect(visibleProviderPromptBody(resolved)).toBe(expected)
  })

  it.each(routes.slice(0, 2))('%s matches the actual shared native body compiler', (_label, request) => {
    const resolved = { ...request, ...metadata }
    expect(visibleProviderPromptBody(resolved)).toBe(compileElevenAudioRequest(resolved).body.text)
  })

  it.each(['auto', 'manual'] as const)('does not turn a saved %s video prompt mode into an audio override', (promptMode) => {
    const node: StudioNode = { id: 'speech', type: 'studio', position: { x: 0, y: 0 }, data: {
      kind: 'voiceover', title: 'Speech', voiceEngine: 'elevenlabs-direct', voiceModelId: 'eleven_v3', voice: 'voice-id',
      prompt: authored, promptMode, manualPromptSeeded: true, manualPromptDraft: 'Wrong draft.',
    } }
    const request = buildGenerationRequest(node, [node], [])
    expect(request.providerPromptOverride).toBeUndefined()
    expect(visibleProviderPromptBody(request)).toBe(compileElevenAudioRequest(request).body.text)
    expect(visibleProviderPromptBody(request)).toBe(authored)
  })

  it('blocks an empty audio body even when an inapplicable override is populated', () => {
    expect(() => visibleProviderPromptBody({ nodeId: 'audio', kind: 'voiceover', prompt: '  ', providerPromptOverride: 'Not sent.' })).toThrow('Add audio text')
  })

  it('leaves image and video compilation to their own paths', () => {
    expect(providerAudioPromptText({ nodeId: 'image', kind: 'image-generator', prompt: 'A lighthouse.' })).toBeUndefined()
    expect(visibleProviderPromptBody({ nodeId: 'video', kind: 'video-generator', providerPromptOverride: 'Exact video master.' })).toBe('Exact video master.')
  })
})
