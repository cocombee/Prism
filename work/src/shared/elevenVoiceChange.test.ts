import { describe, expect, it } from 'vitest'
import type { StudioNode, StudioNodeData } from './types'
import { nodeInputPorts } from './nodePorts'
import { nodeConnectionError } from './nodeConnections'
import { buildGenerationRequest } from './workflowResolver'
import { generationRequirementFailures } from './generationReadiness'
import { directElevenAvailabilityError } from './elevenLabsAudio'
import { STYLE_PRESETS, redactBuiltInStylePrompts } from './stylePresets'

const node = (id: string, data: Partial<StudioNodeData>): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'voiceover', title: id, ...data } })
const conversion = node('changed', { voiceEngine: 'elevenlabs-direct', elevenSpeechMode: 'voice-change', voice: 'fictional-target', voiceModelId: 'fictional-converter' })
const source = node('original', { kind: 'upload', assetPath: '/managed/original.wav', assetUrl: 'prism-asset://original', outputType: 'audio' })
const edge = { id: 'audio', source: source.id, sourceHandle: 'output', target: conversion.id, targetHandle: 'audio-in' }
describe('Voice Change production graph contract', () => {
  it('declares a single audio input only for the explicit direct conversion mode', () => {
    expect(nodeInputPorts(conversion.data)).toEqual([expect.objectContaining({ id: 'audio-in', signal: 'audio', maxConnections: 1 })])
    for (const mode of ['speech', 'dialogue', undefined] as const) expect(nodeInputPorts({ ...conversion.data, elevenSpeechMode: mode })).toEqual([])
    expect(nodeInputPorts({ ...conversion.data, voiceEngine: 'fish-audio' })).toEqual([])
  })
  it('accepts audio and rejects an image at the declared original input', () => {
    expect(nodeConnectionError(source.id, conversion.id, source.data, conversion.data, 'output', 'audio-in')).toBeNull()
    expect(nodeConnectionError(source.id, conversion.id, { ...source.data, outputType: 'image' }, conversion.data, 'output', 'audio-in')).toBeTruthy()
  })
  it('compiles the connected original without inventing a speech-text requirement', () => {
    const request = buildGenerationRequest(conversion, [source, conversion], [edge])
    expect(request.elevenSpeechMode).toBe('voice-change')
    expect(request.references).toEqual([expect.objectContaining({ path: source.data.assetPath, mediaType: 'audio' })])
    expect(generationRequirementFailures(request)).toEqual([])
    expect(generationRequirementFailures({ ...request, references: [] })).toContain('connect one original audio recording')
    expect(generationRequirementFailures({ ...request, references: [...request.references!, ...request.references!] })).toContain('connect one original audio recording')
  })
  it('keeps the original path when speaker or conversion settings change', () => {
    for (const patch of [{ voice: 'another-fictional-voice' }, { stability: .25, similarityBoost: .7 }, { voiceModelId: 'another-converter' }]) {
      const next = { ...conversion, data: { ...conversion.data, ...patch } }
      const request = buildGenerationRequest(next, [source, next], [edge])
      expect(request.references?.[0].path).toBe(source.data.assetPath)
      expect(request.references?.[0].url).toBe(source.data.assetUrl)
    }
  })
  it('resolves routed original audio and survives a saved JSON roundtrip', () => {
    const router = node('router', { kind: 'router', routeSignal: 'audio' })
    const nodes = JSON.parse(JSON.stringify([source, router, conversion]))
    const edges = [{ ...edge, id: 'to-router', target: router.id, targetHandle: 'input' }, { ...edge, source: router.id }]
    expect(buildGenerationRequest(conversion, nodes, edges).references?.[0].path).toBe(source.data.assetPath)
  })
  it('requires the live conversion capability instead of treating a speech model as conversion', () => {
    const request = buildGenerationRequest(conversion, [source, conversion], [edge])
    const availability = { provider: 'elevenlabs' as const, verified: true, models: [{ id: 'fictional-converter', label: 'Fictional Converter', supportsVoiceConversion: true }] }
    expect(directElevenAvailabilityError(request, availability)).toBeUndefined()
    expect(directElevenAvailabilityError(request, { ...availability, models: [{ ...availability.models[0], supportsVoiceConversion: false }] })).toContain('Voice Change model')
  })
  it('injects the new private paper style once and redacts it in the visible provider preview', () => {
    const preset = STYLE_PRESETS.find(preset => preset.id === 'handcrafted-paper-sculpture')!
    const style = node('paper', { kind: 'style-reference', stylePresetId: preset.id, referenceTag: '@handcrafted-paper-sculpture' })
    const image = node('image', { kind: 'image-generator', prompt: 'Two people greet each other.' })
    const request = buildGenerationRequest(image, [style, image], [{ id: 'style', source: style.id, sourceHandle: 'output', target: image.id, targetHandle: 'style-in' }])
    expect(request.stylePrompt).toBe(preset.prompt)
    expect(request.builtInStylePrompts).toEqual([preset.prompt])
    expect(redactBuiltInStylePrompts(preset.prompt)).not.toContain(preset.prompt)
    expect(redactBuiltInStylePrompts(preset.prompt)).toContain('Paper Sculpture')
  })
})
