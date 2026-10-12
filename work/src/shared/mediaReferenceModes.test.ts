import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { mediaReferenceConnectionType, mediaReferenceModePatch, mediaReferenceModes, mediaReferenceDescriptionTemplate } from './mediaReferenceModes'
import { buildGenerationRequest } from './workflowResolver'
import { referenceDescriptionReadinessFailures } from './assetReferenceDescriptions'
import { compileProviderPrompt, providerArtworkCarrierRequest, providerSeedancePayloadCompilation } from './referenceInstructions'
import { connectionCompatibilityError } from './nodeConnections'
import { mediaDescriptionConnectedToGenerator, resolvedAssetReferenceDescription } from './assetReferenceDescriptions'
const node = (id: string, kind: StudioNode['data']['kind'], patch: Partial<StudioNode['data']> = {}): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...patch } })
const media = node('guide', 'upload', { assetPath: '/guide.mp4', outputType: 'video', referenceTag: '@guide' })
const video = node('gen', 'video-generator', { videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: 'A person walks.' })
const edge = (source: string, target: string, targetHandle: string) => ({ id: `${source}-${target}`, source, target, targetHandle })
describe('Media reference mode intent', () => {
  it('exposes the distinct image/video modes', () => {
    expect(mediaReferenceModes('video').map(item => item.value)).toEqual(['reference', 'blocking', 'object', 'background'])
    expect(mediaReferenceModes('image').map(item => item.value)).toEqual(['reference', 'composition', 'object', 'background'])
  })
  it('appears only on actual reference paths, including Storyboard and pass-through, never start/end/extension', () => {
    const board = node('board', 'storyboard'), router = node('router', 'router')
    const nodes = [media, board, router, video]
    expect(mediaReferenceConnectionType(media.id, nodes, [edge(media.id, video.id, 'video-reference-in')])).toBe('video')
    const routed = [edge(media.id, router.id, 'input'), edge(router.id, board.id, 'video-reference-in'), edge(board.id, video.id, 'storyboard-in')]
    expect(mediaReferenceConnectionType(media.id, nodes, routed)).toBe('video')
    expect(mediaReferenceConnectionType(media.id, nodes, routed.slice(0, 2))).toBeUndefined()
    for (const handle of ['video-in', 'image-in', 'end-image']) expect(mediaReferenceConnectionType(media.id, nodes, [edge(media.id, video.id, handle)])).toBeUndefined()
    expect(mediaReferenceConnectionType(media.id, nodes, [])).toBeUndefined()
  })
  it('uses declared native reference sockets without exposing modes on native source sockets', () => {
    const gen = node('native', 'video-generator', { falNative: { endpointId: 'bytedance/seedance-2.5/reference-to-video', label: 'Seedance', flow: 'video', values: {}, media: [{ key: 'reference_video_urls', portId: 'fal-ref-video', label: 'Video Reference', type: 'video', role: 'reference-video', multiple: true, required: false }, { key: 'video_url', portId: 'fal-source', label: 'Source Video', type: 'video', role: 'source-video', multiple: false, required: false }] } })
    expect(mediaReferenceConnectionType(media.id, [media, gen], [edge(media.id, gen.id, 'fal-ref-video')])).toBe('video')
    expect(mediaReferenceConnectionType(media.id, [media, gen], [edge(media.id, gen.id, 'fal-source')])).toBeUndefined()
  })
  it('resets on changed mode, allows typing to override, and leaves current selection untouched', () => {
    const blocking = { ...media.data, ...mediaReferenceModePatch(media.data, 'blocking', 'video') }
    expect(blocking.referenceDescription).toContain('timecoded action')
    const typed = { ...blocking, referenceDescription: '@guide controls event timing only; use the authored camera.' }
    expect(mediaReferenceModePatch(typed, 'blocking', 'video')).toBeUndefined()
    const next = mediaReferenceModePatch(typed, 'reference', 'video')!
    expect(next.referenceDescription).not.toContain('event timing only')
    expect(next.referenceDescriptionMode).toBe('authored')
    expect(mediaReferenceModePatch(typed, 'composition', 'video')).toBeUndefined()
  })
  it.each(['image', 'video'] as const)('uses provider-ready %s templates without software-node instructions', type => {
    for (const mode of mediaReferenceModes(type)) {
      const text = mediaReferenceDescriptionTemplate(media.data, mode.value, type)
      expect(text).toContain('@guide')
      expect(text).not.toMatch(/Storyboard|connected|editable Description|provider|node|panel/i)
    }
    if (type === 'video') expect(mediaReferenceDescriptionTemplate(media.data, 'blocking', type)).toContain('Strict camera and blocking reference')
  })
  it.each(['object', 'background'] as const)('requires actual %s targets before a replacement sample becomes provider authority', mode => {
    const sample = mediaReferenceDescriptionTemplate(media.data, mode, 'video')
    const request = { nodeId: 'gen', kind: 'video-generator' as const, videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: 'Keep the scene continuous.', duration: 4, references: [{ role: 'reference' as const, path: '/source.mp4', mediaType: 'video' as const, tag: '@guide', mediaReferenceMode: mode, referenceDescription: sample }] }
    expect(referenceDescriptionReadinessFailures(request)).toContain('Fill the Description for @guide before generation.')
    expect(compileProviderPrompt(request).text).not.toContain(sample)
    request.references[0].referenceDescription = '@guide is the source video. Replace only the named foreground object with the supplied target; preserve all other content.'
    expect(referenceDescriptionReadinessFailures(request)).toEqual([])
  })
  it('routes a typed mode override into the final provider prompt without contradictory performance or appearance scope', () => {
    const source = { ...media, data: { ...media.data, ...mediaReferenceModePatch(media.data, 'blocking', 'video'), referenceDescription: '@guide supplies camera path and blocking only. The Storyboard supplies articulated walking; connected assets supply appearance.' } }
    const request = buildGenerationRequest(video, [source, video], [edge(source.id, video.id, 'video-reference-in')])
    expect(request.references?.[0].mediaReferenceMode).toBe('blocking')
    expect(request.connectionRules?.[0]).not.toHaveProperty('toggleable')
    expect(request.connectionRules?.[0]).not.toHaveProperty('mode')
    const compiled = compileProviderPrompt(request).text
    expect(compiled).toContain(source.data.referenceDescription)
    expect(compiled).not.toContain('stabilization, performance timing, motion cadence')
    expect(compiled).not.toContain('Match this video reference exactly in temporal order, motion, performance, appearance')
    expect(compiled).toContain('REFERENCE INTRODUCTIONS')
  })
})

describe('materialized generated media share imported reference behavior', () => {
  it.each(['image', 'video', 'audio'] as const)('retains URL-only imported %s through a List with its exact tag and authored role', type => {
    const source = node('remote', 'upload', { assetUrl: `https://cdn.prism.example/remote.${type === 'image' ? 'png' : type === 'video' ? 'mp4' : 'wav'}`, outputType: type, referenceTag: '@remote', mediaReferenceMode: 'reference', referenceDescription: '@remote supplies the explicitly assigned reference role.', referenceDescriptionMode: 'authored' })
    const list = node('batch', 'list', { listSignal: type }), nodes = [source, list, video]
    const handle = type === 'image' ? 'reference-in' : `${type}-reference-in`
    const links = [edge(source.id, list.id, 'input'), edge(list.id, video.id, handle)]
    expect(mediaReferenceConnectionType(source.id, nodes, links)).toBe(type)
    const request = buildGenerationRequest(video, nodes, links)
    expect(request.references).toHaveLength(1)
    expect(request.references?.[0]).toMatchObject({ url: source.data.assetUrl, tag: '@remote', mediaType: type, mediaReferenceMode: 'reference', referenceDescription: source.data.referenceDescription })
    expect(compileProviderPrompt(request).text).toContain(source.data.referenceDescription)
  })
  it('maps generated speech and sound to their exact physical audio attachment ordinals', () => {
    const speaker = node('speaker', 'character', { referenceTag: '@speaker', referenceAssets: [{ id: 'speaker', name: 'Speaker', path: '/speaker.png', mimeType: 'image/png', createdAt: 'fixture' }], referenceDescription: '@speaker is the sole identity and dressed-body reference.' })
    const speech = node('speech', 'voiceover', { outputPath: '/speech.wav', outputType: 'audio', mediaReferenceMode: 'lip-sync', referenceTag: '@speech', referenceDescription: '@speech is the original speech for @speaker. Match the recorded syllables and pauses exactly.' })
    const sound = node('sound', 'sound-effects', { outputPath: '/sound.wav', outputType: 'audio', mediaReferenceMode: 'sound', referenceTag: '@sound', referenceDescription: '@sound supplies background ambience only; it supplies no speaker or speech.' })
    const nodes = [speaker, speech, sound, video], links = [edge(speaker.id, video.id, 'reference-in'), edge(speech.id, video.id, 'audio-reference-in'), edge(sound.id, video.id, 'audio-reference-in')]
    const request = buildGenerationRequest(video, nodes, links)
    expect(referenceDescriptionReadinessFailures(request)).toEqual([])
    const visible = compileProviderPrompt(request).text
    expect(visible).toContain(speech.data.referenceDescription)
    expect(visible).toContain(sound.data.referenceDescription)
    const payload = providerSeedancePayloadCompilation(request).text
    expect(payload).toContain('@Audio1 is the original speech for @Image1')
    expect(payload).toContain('@Audio2 supplies background ambience only')
    expect(payload).not.toMatch(/@speech|@speaker|@sound/)
  })
  it('retains origin tags and authored audio intent through a generated-media List', () => {
    const speech = node('speech', 'voiceover', { outputPath: '/speech.wav', outputType: 'audio', referenceTag: '@speech', mediaReferenceMode: 'sound', referenceDescription: '@speech is the original ambient recording, with no speech assignment.' })
    const list = node('batch', 'list', { listSignal: 'audio' }), nodes = [speech, list, video]
    const links = [edge(speech.id, list.id, 'input'), edge(list.id, video.id, 'audio-reference-in')]
    expect(mediaReferenceConnectionType(speech.id, nodes, links)).toBe('audio')
    const request = buildGenerationRequest(video, nodes, links)
    expect(request.references?.[0]).toMatchObject({ tag: '@speech', mediaReferenceMode: 'sound', referenceDescription: speech.data.referenceDescription })
  })
  it.each(['image-generator', 'image-editor'] as const)('rejects audio to %s even when a native schema advertises an audio socket', kind => {
    const speech = node('speech', 'voiceover', { outputPath: '/speech.wav', outputType: 'audio' })
    const target = node('image', kind, { falNative: { endpointId: 'fixture', label: 'Image', flow: 'image', values: {}, media: [{ key: 'audio', portId: 'native-audio', label: 'Audio', type: 'audio', role: 'reference-audio', multiple: true, required: false }] } })
    const links = [edge(speech.id, target.id, 'native-audio')]
    expect(connectionCompatibilityError(speech.data, target.data, 'media-out', 'native-audio')).toMatch(/Audio cannot connect/)
    expect(mediaDescriptionConnectedToGenerator(speech.id, [speech, target], links)).toBe(false)
    expect(mediaReferenceConnectionType(speech.id, [speech, target], links)).toBeUndefined()
  })
  it.each([
    ['image-generator', 'image', 'reference-in'], ['image-editor', 'image', 'reference-in'],
    ['upscaler', 'image', 'reference-in'], ['video-generator', 'video', 'video-reference-in'],
    ['voiceover', 'audio', 'audio-reference-in'], ['sound-effects', 'audio', 'audio-reference-in'],
  ] as const)('%s exposes modes only after it has a result and a compatible reference connection', (kind, type, handle) => {
    const source = node('made', kind)
    const links = [edge(source.id, video.id, handle)]
    expect(mediaReferenceConnectionType(source.id, [source, video], links)).toBeUndefined()
    source.data.generatedResults = [{ path: `/made.${type}`, url: '', type, modelId: 'fixture' }]
    expect(mediaReferenceConnectionType(source.id, [source, video], links)).toBe(type)
    expect(mediaReferenceConnectionType(source.id, [source, video], [])).toBeUndefined()
  })
  it('routes generated speech through a typed Router and Storyboard, retaining overrides after reopen', () => {
    const source = node('speech', 'voiceover', { outputPath: '/speech.wav', outputType: 'audio', referenceTag: '@speech', ...mediaReferenceModePatch({ kind: 'voiceover', title: 'speech' }, 'lip-sync', 'audio'), referenceDescription: '@speech is the original speech for @speaker. Match recorded syllables and pauses exactly.' })
    const router = node('route', 'router', { routeSignal: 'audio' }), board = node('board', 'storyboard')
    const nodes = [source, router, board, video], links = [edge(source.id, router.id, 'input'), edge(router.id, board.id, 'audio-reference-in'), edge(board.id, video.id, 'storyboard-in')]
    const reopened = JSON.parse(JSON.stringify({ nodes, links }))
    expect(mediaReferenceConnectionType(source.id, reopened.nodes, reopened.links)).toBe('audio')
    const request = buildGenerationRequest(video, reopened.nodes, reopened.links)
    expect(request.references?.[0]).toMatchObject({ mediaReferenceMode: 'lip-sync', referenceDescription: source.data.referenceDescription })
    expect(compileProviderPrompt(request).text).toContain(source.data.referenceDescription)
    expect(mediaReferenceModePatch(source.data, 'lip-sync', 'audio')).toBeUndefined()
    expect(mediaReferenceModePatch(source.data, 'sound', 'audio')?.referenceDescription).not.toBe(source.data.referenceDescription)
  })
  it('does not infer blocking or speech from a reference socket', () => {
    expect(mediaReferenceModes('audio').map(item => item.value)).toEqual(['lip-sync', 'sound'])
    const sample = mediaReferenceDescriptionTemplate({ kind: 'upload', title: 'audio' }, 'lip-sync', 'audio')
    const request = { nodeId: 'gen', kind: 'video-generator' as const, prompt: 'A speaker talks.', references: [{ role: 'reference' as const, path: '/speech.wav', mediaType: 'audio' as const, tag: '@audio', referenceDescription: sample }] }
    expect(referenceDescriptionReadinessFailures(request)).toContain('Fill the Description for @audio before generation.')
    expect(mediaReferenceDescriptionTemplate(media.data, 'reference', 'video')).not.toContain('blocking')
    expect(resolvedAssetReferenceDescription(media, [media, video], [edge(media.id, video.id, 'video-reference-in')])).not.toContain('motion, camera path and choreography only')
  })
})


describe('new reference modes replace the legacy mechanism', () => {
  it.each(['image-generator', 'video-generator'] as const)('%s ignores saved old fidelity and uses the exact editable Description', kind => {
    const target = node('target', kind, { videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: 'A person moves through the scene.' })
    for (const mode of (kind === 'image-generator' ? ['reference', 'composition', 'object', 'background'] : ['reference', 'blocking', 'object', 'background']) as NonNullable<StudioNode['data']['mediaReferenceMode']>[]) {
      const source = node('guide', 'upload', { outputType: kind === 'image-generator' ? 'image' : 'video', assetPath: kind === 'image-generator' ? '/guide.png' : '/guide.mp4', referenceTag: '@guide', mediaReferenceMode: mode, referenceDescription: '@guide supplies composition and travel paths only. Appearance comes from the specified references.' })
      const bodies: string[] = []
      for (const inputFidelity of ['guide', 'auto', 'lock'] as const) {
        const link = { ...edge(source.id, target.id, kind === 'image-generator' ? 'reference-in' : 'video-reference-in'), data: { inputFidelity } }
        const request = buildGenerationRequest(target, [source, target], [link])
        expect(request.references![0]).toMatchObject({ mediaReferenceMode: mode })
        expect(request.references![0].fidelity).toBeUndefined()
        const body = compileProviderPrompt(request).text
        expect(body).toContain(source.data.referenceDescription)
        expect(body).not.toMatch(/100% matches|@guide matches the reference in every appearance|LOCK RULE|GUIDE RULE|AUTO RULE|AUTO → PRESERVE/)
        expect(providerArtworkCarrierRequest(request)).toBe(request)
        expect(link.data.inputFidelity).toBe(inputFidelity)
        bodies.push(body)
      }
      expect(new Set(bodies).size).toBe(1)
    }
  })
  it('uses the new Reference default even on old saved media without a selected mode', () => {
    const request = buildGenerationRequest(video, [media, video], [edge(media.id, video.id, 'video-reference-in')])
    expect(request.references![0]).toMatchObject({ mediaReferenceMode: 'reference' })
    expect(request.references![0].fidelity).toBeUndefined()
  })
})


describe('two audio purposes and generated speech default', () => {
  it('uses Lip-sync for new generated speech without guessing a speaker or changing an authored override', () => {
    const speech = node('speech', 'voiceover', { outputPath: '/speech.wav', outputType: 'audio', referenceTag: '@speech' })
    const links = [edge(speech.id, video.id, 'audio-reference-in')], nodes = [speech, video]
    const description = resolvedAssetReferenceDescription(speech, nodes, links)
    expect(description).toContain('Synchronize that speaker')
    expect(description).not.toContain('[speaker reference]')
    expect(description).toContain('original speed and tempo')
    expect(description).toContain('Preserve its original voice, pronunciation, accent, pitch, speed, emotion, pauses and timeline alignment.')
    expect(description).toContain('The written sentence identifies the words; the recording determines how and when they are spoken.')
    expect(description).toContain('Use the complete original recording as the dialogue soundtrack, from the first recorded syllable through the last, including any introductory or lead-in words; play the full recording once without skipping any part. Do not edit, resynthesize, retune, time-stretch or truncate it.')
    expect(description).toContain('Preserve every word and syllable through the final word, the original spacing between words and phrases, and silence wherever the recording is silent.')
    expect(description).toContain('video time zero')
    expect(description).toContain('after the final spoken syllable')
    expect(description).toContain('remaining video interval silent')
    expect(description).toContain('longer video duration')
    const request = buildGenerationRequest(video, nodes, links)
    expect(request.references?.[0]?.mediaReferenceMode).toBe('lip-sync')
    expect(compileProviderPrompt(request).text).toContain(description)
    expect(compileProviderPrompt(request).text).toContain('remaining video interval silent')
    speech.data.referenceDescription = '@speech supplies off-screen narration only.'
    speech.data.referenceDescriptionMode = 'authored'
    expect(resolvedAssetReferenceDescription(speech, nodes, links)).toBe(speech.data.referenceDescription)
    expect(compileProviderPrompt(buildGenerationRequest(video,nodes,links)).text).not.toContain('remaining video interval silent')
  })
  it('uses Sound for new imported audio; legacy beat text and disconnect/reconnect preserve user edits', () => {
    const audio = node('audio', 'upload', { assetPath: '/song.wav', outputType: 'audio', referenceTag: '@song' })
    const links = [edge(audio.id, video.id, 'audio-reference-in')], nodes = [audio, video]
    expect(resolvedAssetReferenceDescription(audio, nodes, links)).toContain('audible beats')
    expect(resolvedAssetReferenceDescription(audio, nodes, links)).not.toContain('remaining video interval silent')
    const importedLipSync=mediaReferenceDescriptionTemplate(audio.data,'lip-sync','audio')
    expect(importedLipSync).toContain('original speed and tempo')
    expect(importedLipSync).toContain('including any introductory or lead-in words; play the full recording once without skipping any part')
    expect(importedLipSync).toContain('Do not edit, resynthesize, retune, time-stretch or truncate it.')
    expect(importedLipSync).toContain('original spacing between words and phrases')
    expect(importedLipSync).not.toMatch(/2\.647|4\.000|talking-cat|diaberkata/)
    expect(importedLipSync).toContain('[speaker reference]')
    expect(importedLipSync).not.toMatch(/feline|Haji|siapakah/)
    expect(importedLipSync).toContain('remaining video interval silent')
    audio.data.mediaReferenceMode = 'timing'
    audio.data.referenceDescription = '@song controls only the specified cuts on every fourth beat.'
    audio.data.referenceDescriptionMode = 'authored'
    for (const edges of [links, [], links]) expect(resolvedAssetReferenceDescription(audio, nodes, edges)).toBe(audio.data.referenceDescription)
    expect(mediaReferenceModePatch(audio.data, 'lip-sync', 'audio')?.referenceDescription).toContain('[speaker reference]')
  })
})
