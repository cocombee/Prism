import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { compileElevenAudioRequest } from './elevenLabsAudio'
import { dialoguePromptText, elevenSpeechModePatch } from './elevenDialogue'
import { buildGenerationRequest } from './workflowResolver'
import { providerEffectiveRequestControls, providerRouteLabel } from './requestPreview'
import { generateElevenAudio } from '../main/elevenLabsApi'
import { persistElevenAudio } from '../main/elevenLabsAudioPersistence'
import type { GenerationRequest, StudioNode } from './types'
const turns = [{ id: 'a', voiceId: 'one', text: '  [warm] Salam.\r\n\r\n  Salam.  ' }, { id: 'b', voiceId: 'two', text: '[sober] Waalaikumussalam.' }]
const request: GenerationRequest = { nodeId: 'voice', kind: 'voiceover', voiceEngine: 'elevenlabs-direct', voiceModelId: 'eleven_v4', elevenSpeechMode: 'dialogue', elevenDialogueTurns: turns, stability: 0, similarityBoost: 0.85, voiceSeed: 0, voiceTimestamps: true, audioOutputFormat: 'pcm_16000' }
const model = { id: 'eleven_v4', label: 'Eleven v4', maxTextLength: 10000 }
const catalog = [{ model_id: model.id, name: model.label, can_do_text_to_speech: true }]
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
const segment = (voice_id: string, dialogue_input_index: number, start = 0) => ({ voice_id, dialogue_input_index, start_time_seconds: start, end_time_seconds: start + 0.5, character_start_index: 0, character_end_index: 1 })

describe('real ElevenLabs dialogue composition', () => {
 it('preserves separate speech and dialogue drafts when switching modes, including empty saved turn lists', () => {
  const data = { kind: 'voiceover' as const, title: 'Voice', voice: 'one', prompt: turns[0].text }
  const first = elevenSpeechModePatch(data, 'dialogue', () => 'new')
  expect(first.elevenDialogueTurns).toEqual([{ id: 'new', voiceId: 'one', text: data.prompt }])
  expect(elevenSpeechModePatch({ ...data, ...first }, 'speech', () => 'other')).toEqual({ elevenSpeechMode: 'speech', error: undefined })
  expect(elevenSpeechModePatch({ ...data, elevenDialogueTurns: [] }, 'dialogue', () => 'other')).not.toHaveProperty('elevenDialogueTurns')
 })
 it('carries ordered paired texts through the actual graph, preview, native HTTP adapter and managed timing persistence', async () => {
  const node: StudioNode = { id: 'voice', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'voiceover', title: 'Voice', voiceEngine: request.voiceEngine, voiceModelId: request.voiceModelId, elevenSpeechMode: request.elevenSpeechMode, elevenDialogueTurns: request.elevenDialogueTurns, stability: request.stability, similarityBoost: request.similarityBoost, voiceSeed: request.voiceSeed, voiceTimestamps: request.voiceTimestamps, audioOutputFormat: request.audioOutputFormat, prompt: 'This separate single-speech draft must remain saved.' } }
  const graph = buildGenerationRequest(node, [node], [])
  expect(graph.prompt).toBe(dialoguePromptText(turns)); expect(graph.elevenDialogueTurns).toEqual(turns)
  const compiled = compileElevenAudioRequest(graph, model)
  expect(compiled.url).toContain('/v1/text-to-dialogue/with-timestamps?')
  expect(compiled.body.inputs).toEqual(turns.map(turn => ({ text: turn.text, voice_id: turn.voiceId })))
  expect(compiled.body.settings).toEqual({ stability: 0, similarity: 0.85 }); expect(compiled.body).not.toHaveProperty('voice_settings'); expect(compiled.body.seed).toBe(0)
  expect(providerEffectiveRequestControls(graph, model).inputs).toEqual(compiled.body.inputs); expect(providerRouteLabel(graph)).toBe('elevenlabs/eleven_v4/dialogue')
  const segments = [segment('one', 0), segment('two', 1, 0.5)]
  const fetch = vi.fn().mockResolvedValueOnce(json(catalog)).mockResolvedValueOnce(json({ audio_base64: Buffer.from([0, 0, 0, 0]).toString('base64'), voice_segments: segments.map(value => ({ ...value, private: 'discard' })) }))
  const audio = await generateElevenAudio({ fetch, key: 'fictional-test-key' }, graph)
  expect(fetch).toHaveBeenCalledTimes(2); expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(compiled.body); expect(audio.voiceSegments).toEqual(segments)
  const dir = await mkdtemp(join(tmpdir(), 'prism-dialogue-persistence-')); let metadata: unknown
  try {
   const result = await persistElevenAudio(graph, audio, { outputStem: join(dir, 'dialogue'), fallbackRequestId: 'fixture', assertCommit: () => undefined, register: async (_path, value, committed) => { metadata = value; committed() }, history: async () => undefined, localUrl: path => path })
   expect((await readFile(result.outputPath!)).subarray(0, 4).toString()).toBe('RIFF')
   expect(metadata).toMatchObject({ audioTiming: { voiceSegments: segments }, elevenDialogueInputs: turns.map(turn => ({ text: turn.text, voiceId: turn.voiceId })) })
  } finally { await rm(dir, { recursive: true, force: true }) }
 })
 it.each(['voice', 'text', 'duplicate-id', 'eleven-voices', 'too-long', 'oversize-id', 'unsupported-mode'])('rejects %s before any transport', async failure => {
  let current = structuredClone(request)
  if (failure === 'voice') current.elevenDialogueTurns![0].voiceId = ''
  if (failure === 'text') current.elevenDialogueTurns![0].text = ' '
  if (failure === 'duplicate-id') current.elevenDialogueTurns![1].id = 'a'
  if (failure === 'eleven-voices') current.elevenDialogueTurns = Array.from({ length: 11 }, (_, i) => ({ id: String(i), voiceId: String(i), text: 'Hi' }))
  if (failure === 'too-long') current.elevenDialogueTurns![0].text = 'A'.repeat(2001)
  if (failure === 'oversize-id') current.elevenDialogueTurns![0].voiceId = 'x'.repeat(1025)
  if (failure === 'unsupported-mode') current.elevenSpeechMode = 'other' as 'dialogue'
  const fetch = vi.fn(); await expect(generateElevenAudio({ fetch, key: 'fictional-test-key' }, current)).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled()
 })
 it('accepts ten speakers and exactly2000 Unicode characters without flattening or extra requests', () => {
  const current = { ...request, elevenDialogueTurns: Array.from({ length: 10 }, (_, i) => ({ id: String(i), voiceId: String(i), text: '😀'.repeat(200) })) }
  expect((compileElevenAudioRequest(current, model).body.inputs as unknown[])).toHaveLength(10)
 })
 it('uses explicit newly advertised dialogue capability and rejects a withdrawn capability before POST', async () => {
  const current = { ...request, voiceModelId: 'eleven_future', voiceTimestamps: false }, fetch = vi.fn().mockResolvedValueOnce(json([{ model_id: 'eleven_future', can_do_text_to_speech: true, can_do_text_to_dialogue: true }])).mockResolvedValueOnce(new Response('audio', { headers: { 'Content-Type': 'audio/mpeg' } }))
  await generateElevenAudio({ fetch, key: 'fictional-test-key' }, current); expect(fetch).toHaveBeenCalledTimes(2)
  const withdrawn = vi.fn().mockResolvedValueOnce(json([{ ...catalog[0], can_do_text_to_dialogue: false }]))
  await expect(generateElevenAudio({ fetch: withdrawn, key: 'fictional-test-key' }, request)).rejects.toThrow(/verified Dialogue/); expect(withdrawn).toHaveBeenCalledTimes(1)
 })
 it.each([undefined, [segment('wrong', 0)], [{ ...segment('one', 0), dialogue_input_index: 2 }], [{ ...segment('one', 0), end_time_seconds: -1 }]])('rejects invalid speaker segments before persistence', async voice_segments => {
  const fetch = vi.fn().mockResolvedValueOnce(json(catalog)).mockResolvedValueOnce(json({ audio_base64: 'YXVkaW8=', voice_segments }))
  await expect(generateElevenAudio({ fetch, key: 'fictional-test-key' }, request)).rejects.toThrow(/speaker timing/)
 })
})
