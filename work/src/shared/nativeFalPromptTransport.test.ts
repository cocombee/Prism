import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import { nativeFalPromptTransport } from './nativeFalPromptTransport'
import { assertVideoProviderPromptPreflight } from './providerPromptPreflight'
import { visibleProviderPromptBody } from './referenceInstructions'

function request(): GenerationRequest {
  const semantic = 'REFERENCE AUTHORITY\n@door-closed is the closed state of the same doorway in @hallway. @camera owns motion only.\nNEGATIVE PROMPT\nextra doors'
  const value: GenerationRequest = { nodeId: 'qa', kind: 'video-generator', providerPromptOwnership: 'compiled', prompt: semantic, providerPromptOverride: semantic,
    references: [{ referenceDescription: 'Authored fixture reference purpose.', role: 'location', tag: '@hallway', path: '/fixture/hall.png' }, { referenceDescription: 'Authored fixture reference purpose.', role: 'location', tag: '@door-closed', path: '/fixture/door.png' }, { referenceDescription: 'Authored fixture reference purpose.', role: 'reference', tag: '@camera', path: '/fixture/camera.mp4', mediaType: 'video', authority: 'motion-camera' }],
    falNative: { endpointId: 'bytedance/seedance-2.5/reference-to-video', fingerprint: 'a'.repeat(64), flow: 'video', promptField: 'prompt', promptOwnership: 'compiled', values: {}, media: { image_urls: [{ path: '/fixture/hall.png', mediaType: 'image' }, { path: '/fixture/door.png', mediaType: 'image' }], video_urls: [{ path: '/fixture/camera.mp4', mediaType: 'video' }] } },
  }
  value.falNative!.values.prompt = nativeFalPromptTransport(value, semantic)
  return value
}

describe('semantic master and physically bound native transport', () => {
  it('retains names in the visible body and maps only the exact native payload', () => {
    const value = request(), before = JSON.stringify(value)
    expect(visibleProviderPromptBody(value)).toBe(value.prompt)
    expect(value.falNative!.values.prompt).toContain('@Image2 is the closed state of the same doorway in @Image1. @Video1 owns motion only.')
    expect(() => assertVideoProviderPromptPreflight(value)).not.toThrow()
    expect(JSON.stringify(value)).toBe(before)
  })
  it('rejects stale payload positions and reversed physical attachment order', () => {
    const stale = request(); stale.falNative!.values.prompt = (stale.falNative!.values.prompt as string).replace('@Image2', '@Image1')
    expect(() => assertVideoProviderPromptPreflight(stale)).toThrow(/match.*visible/)
    const reversed = request(); reversed.falNative!.media.image_urls.reverse()
    expect(() => assertVideoProviderPromptPreflight(reversed)).toThrow(/reference order/)
  })
  it('supports semantic User seed/reset text while retaining prose, CRLF and unrelated tags', () => {
    const value = request(), visible = '  Keep @door-closed closed.\r\n@door-closed-other stays literal.  '
    value.providerPromptOwnership = 'authored'; value.falNative!.promptOwnership = 'authored'
    value.prompt = visible; value.providerPromptOverride = visible; value.falNative!.values.prompt = nativeFalPromptTransport(value, visible)
    expect(visibleProviderPromptBody(value)).toBe(visible)
    expect(value.falNative!.values.prompt).toBe('  Keep @Image2 closed.\r\n@door-closed-other stays literal.  ')
    expect(() => assertVideoProviderPromptPreflight(value)).not.toThrow()
  })
  it('binds the original audio soundtrack to its explicit sole speaker without changing source order or semantic text', () => {
    const value = request(), visible = '@hallway is the sole audible speaker. Use the original recording from @speech as the dialogue soundtrack for @hallway. Preserve pitch, tempo and every syllable; keep the remainder silent.'
    value.references!.push({ role: 'reference', tag: '@speech', path: '/fixture/speech.mp3', mediaType: 'audio', referenceDescription: 'Original speech only.' })
    value.falNative!.media.audio_urls = [{ path: '/fixture/speech.mp3', mediaType: 'audio' }]
    const before = JSON.stringify(value)
    expect(nativeFalPromptTransport(value, visible)).toBe('@Image1 is the sole audible speaker. Use the original recording from @Audio1 as the dialogue soundtrack for @Image1. Preserve pitch, tempo and every syllable; keep the remainder silent.')
    expect(JSON.stringify(value)).toBe(before)
  })
  it('preserves a non-Seedance body exactly', () => {
    const value = request(); value.falNative!.endpointId = 'fal-ai/wan/v3/text-to-video'
    expect(nativeFalPromptTransport(value, value.prompt!)).toBe(value.prompt)
  })
  it('keeps semantic Storyboard/Style names visible and labels their non-attachment prose only in transport', () => {
    const value = request()
    value.connectionRules = [{ tag: '@cinematic-style', label: 'Style', rule: 'Finish only.' }]
    value.prompt = 'Apply @cinematic-style.\nNEGATIVE PROMPT\nextra doors'; value.providerPromptOverride = value.prompt
    value.falNative!.values.prompt = nativeFalPromptTransport(value, value.prompt)
    expect(visibleProviderPromptBody(value)).toContain('@cinematic-style')
    expect(value.falNative!.values.prompt).toBe('Apply cinematic-style.\nNEGATIVE PROMPT\nextra doors')
  })
})
