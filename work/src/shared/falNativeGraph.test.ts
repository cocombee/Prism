import { generationRequirementFailures } from './generationReadiness'
import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Edge } from '@xyflow/react'
import { compileFalSchemaContract, type FalSchemaContract } from './falSchemaBinding'
import { describeFalRuntimeInputs, falRuntimeFingerprintMaterial } from './falRuntimeInputs'
import { reconcileFalNodeBinding } from './falNodeBinding'
import { buildGenerationRequest } from './workflowResolver'
import type { StudioNode, NodeKind, StudioNodeData } from './types'
import { executeFalNativeGeneration, type FalNativeGenerationDependencies } from '../main/falNativeGeneration'
const captured = JSON.parse(readFileSync(new URL('./falSchemaMedia.fixtures.json', import.meta.url), 'utf8'))
function bind(contract: FalSchemaContract) { const runtime = describeFalRuntimeInputs(contract); return { ...contract, runtime: { ...runtime, fingerprint: createHash('sha256').update(falRuntimeFingerprintMaterial(contract, runtime)).digest('hex') } } }
function model() { const fixture = captured.models[1]; return bind({ ...compileFalSchemaContract(fixture.endpoint_id, fixture.openapi), category: fixture.metadata.category }) }
function node(id: string, kind: NodeKind, data: Partial<StudioNodeData> = {}): StudioNode { return { id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...data } } }
function target(contract: FalSchemaContract) { return node('generate', 'video-generator', { videoEngine: 'old-unavailable-model', promptMode: 'manual', manualPromptDraft: '  SHOT 1 — Hold.\r\n\r\nSHOT 2 — Cut.  ', falNative: reconcileFalNodeBinding({ endpointId: contract.endpointId, label: 'Native', flow: 'video', values: contract.runtime!.fields.some(field => field.key === 'seed') ? { seed: 0 } : {}, media: [] }, contract) }) }
function refs(count: number, type: 'image' | 'video' | 'audio') { return Array.from({ length: count }, (_, i) => node(`${type}-${i}`, 'upload', { outputType: type, assetPath: `/fixture/${type}-${i}.file` })) }
function connect(source: StudioNode, field: string): Edge { return { id: `${source.id}-${field}`, source: source.id, sourceHandle: 'media-out', target: 'generate', targetHandle: field } }
function dependencies(contract: FalSchemaContract) {
 const deps = { contract: vi.fn(async () => contract), assertCurrent: vi.fn(), prepareSource: vi.fn(async source => source), client: vi.fn(async () => ({})), upload: vi.fn(async (_client, path) => `https://files.example/${encodeURIComponent(path)}`), submit: vi.fn(async (_client: object, _id: string, _input: Record<string, unknown>) => ({ requestId: 'fictional', data: { seed: 0, video: { url: 'https://files.example/result.mp4', content_type: 'video/mp4' } } })), persist: vi.fn(async output => ({ path: '/fixture/result.mp4', url: output.url })) } satisfies FalNativeGenerationDependencies<object>
 return deps
}
describe('actual graph to owned native executor', () => {
 it('wires native Motion FPS into compiled intent while preserving Manual bytes and native fields', () => {
  const contract = model(), end = target(contract)
  end.data.promptMode = 'auto'; end.data.prompt = 'A dancer turns in place.'; end.data.motionCadence = 16
  const auto = buildGenerationRequest(end, [end], [])
  expect(auto.motionCadence).toBe(16)
  expect(auto.prompt).toMatch(/16fps/)
  expect(auto.falNative!.values).not.toHaveProperty('fps')
  expect(auto.falNative!.values).not.toHaveProperty('motionCadence')
  end.data.promptMode = 'manual'
  const manual = buildGenerationRequest(end, [end], [])
  expect(manual.motionCadence).toBeUndefined()
  expect(manual.prompt).toBe(end.data.manualPromptDraft)
  expect(manual.falNative!.values.prompt).toBe(end.data.manualPromptDraft)
 })
 it.each([20, 50])('preserves manual bytes and sends %i references through the captured route', async count => {
  const contract = model(), end = target(contract), images = refs(count === 50 ? 30 : count, 'image'), videos = refs(count === 50 ? 10 : 0, 'video'), audio = refs(count === 50 ? 10 : 0, 'audio'), sources = [...images, ...videos, ...audio]
  const edges = [...images.map(source => connect(source, 'reference-in')), ...videos.map(source => connect(source, 'video-reference-in')), ...audio.map(source => connect(source, 'audio-reference-in'))]
  const request = buildGenerationRequest(end, [end, ...sources], edges), deps = dependencies(contract)
  expect(request.videoEngine).toBe(contract.endpointId); expect(request.prompt).toBe(end.data.manualPromptDraft)
  expect(request.falNative?.values.prompt).toBe(request.prompt); expect(request.references).toHaveLength(count)
  await executeFalNativeGeneration(request.falNative!, request.kind, deps)
  expect(deps.upload).toHaveBeenCalledTimes(count); expect(deps.submit).toHaveBeenCalledTimes(1)
  expect(deps.submit.mock.calls[0][2]).toMatchObject({ prompt: end.data.manualPromptDraft, image_urls: images.map(source => `https://files.example/${encodeURIComponent(source.data.assetPath!)}`) })
 })
 it('accepts a newly declared fifty-image field through Router and List, and rejects fifty-one before execution', async () => {
  const contract = bind({ endpointId: 'fixture/new-model/reference-to-video', category: 'image-to-video', schemaPath: '/native', input: { type: 'object', required: ['brand_new_images', 'prompt'], properties: { brand_new_images: { type: 'array', maxItems: 50, items: { type: 'string', uiField: 'image' } }, prompt: { type: 'string' } } }, output: { type: 'object', properties: { video: { type: 'object', properties: { url: { type: 'string' }, content_type: { type: 'string' } } } } } })
  const end = target(contract); end.data.falNative = reconcileFalNodeBinding({ endpointId: contract.endpointId, label: 'Future', flow: 'video', values: {}, media: [] }, contract)
  const source = node('images', 'list', { listSignal: 'image', listItems: refs(50, 'image').map(source => ({ id: source.id, type: 'image', asset: { id: source.id, path: source.data.assetPath!, name: source.id, mimeType: 'image/png', createdAt: '2026-10-09' } })) }), router = node('router', 'router', { routeSignal: 'image' })
  const edges: Edge[] = [{ id: 'images-router', source: source.id, sourceHandle: 'mixed-out', target: router.id, targetHandle: 'input' }, { ...connect(router, end.data.falNative!.media[0].portId), sourceHandle: 'output' }]
  const request = buildGenerationRequest(end, [source, router, end], edges), deps = dependencies(contract)
  expect(request.falNative?.media.brand_new_images).toHaveLength(50)
  await executeFalNativeGeneration(request.falNative!, request.kind, deps); expect(deps.submit).toHaveBeenCalledTimes(1)
  source.data.listItems!.push({ id: '51', type: 'image', asset: { id: '51', path: '/fixture/51.png', name: '51', mimeType: 'image/png', createdAt: '2026-10-09' } })
  expect(() => buildGenerationRequest(end, [source, router, end], edges)).toThrow(/capacity/)
 })
 it('never ignores a preserved connection that the updated model removed', () => {
  const contract = model(), end = target(contract), source = refs(1, 'image')[0]
  end.data.falNative!.retiredPorts = [{ id: 'old-input', label: 'Old', signal: 'image' }]
  expect(() => buildGenerationRequest(end, [source, end], [connect(source, 'old-input')])).toThrow(/no longer|declares|cardinality|connection/i)
 })
 it('maps semantic tags to ordinals from the exact mixed field order without ranking views again', async () => {
  const contract = model(), end = target(contract); end.data.promptMode = 'auto'; end.data.prompt = 'Show @hero then @room while @motion follows @beat.'
  const sources = [node('room', 'upload', { referenceTag: '@room', outputType: 'image', assetPath: '/fixture/room.png' }), node('hero', 'upload', { referenceTag: '@hero', outputType: 'image', assetPath: '/fixture/hero.png' }), node('motion', 'upload', { referenceTag: '@motion', outputType: 'video', assetPath: '/fixture/motion.mp4' }), node('beat', 'upload', { referenceTag: '@beat', outputType: 'audio', assetPath: '/fixture/beat.wav' })]
  const edges = sources.map(source => connect(source, source.data.outputType === 'image' ? 'reference-in' : source.data.outputType === 'video' ? 'video-reference-in' : 'audio-reference-in'))
  const request = buildGenerationRequest(end, [end, ...sources], edges), deps = dependencies(contract)
  expect(request.prompt).toContain('Show [Image2] then [Image1] while [Video1] follows [Audio1].')
  expect(request.falNative!.media.image_urls.map(source => source.path)).toEqual(['/fixture/room.png', '/fixture/hero.png'])
  await executeFalNativeGeneration(request.falNative!, request.kind, deps)
  expect(deps.submit.mock.calls[0][2].prompt).toBe(request.prompt)
 })
 it('keeps a locked start frame tag and authority with the real image route', () => {
  const fixture = captured.models[0], contract = bind({ ...compileFalSchemaContract(fixture.endpoint_id, fixture.openapi), category: fixture.metadata.category }), end = target(contract)
  end.data.promptMode = 'auto'; end.data.prompt = 'Begin exactly at @opening before she moves.'
  const source = node('opening', 'upload', { referenceTag: '@opening', outputType: 'image', assetPath: '/fixture/start.png' }), link = { ...connect(source, 'image-in'), data: { inputFidelity: 'lock' } }
  const request = buildGenerationRequest(end, [source, end], [link])
  expect(request.references).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/fixture/start.png', tag: '@opening', slot: 'start' })]))
  expect(request.inputRole).toBe('start-frame'); expect(request.falNative!.media.image_url[0].path).toBe('/fixture/start.png'); expect(request.prompt).not.toContain('no opening-frame authority')
 })
 it('preserves complete master whitespace and repeated authored paragraphs in Auto', () => {
  const contract = model(), end = target(contract)
  const master = 'FORMAT MODE\nTWO SHOTS.\nSCENE CONTEXT\nStation.\nACTIVE REFERENCES\nNone.\nCAMERA\nStatic.\nWORLD AND LIGHTING\nAuthored.\nSTYLE\nInk.\n\n  Uneven  paper.\n\n  Uneven  paper.\nCONTINUITY\nLocked.\nCHARACTER ACTING\nAuthored.\nPHYSICS\nAuthored.\nAUDIO\nAuthored.\nQUALITY\nAuthored.\nSHOT 1\nOne.\nHARD CUT.\nSHOT 2\nTwo.\nNEGATIVE PROMPT\nDrift.'
  end.data.promptMode = 'auto'; end.data.prompt = master
  const request = buildGenerationRequest(end, [end], [])
  expect(request.authoredPrompt).toBe(master); expect(request.prompt).toBe(master); expect(request.falNative!.values.prompt).toBe(master)
 })

 it('carries compiled ownership and spoken-audio intent from Storyboard through native fields and saved graph',async()=>{
  const contract=model(),end=target(contract);end.data.promptMode='auto';end.data.prompt='';end.data.falNative!.values.generate_audio=false;end.data.falNative!.values.duration='5'
  const person=node('maya','character',{referenceTag:'@maya',assetPath:'/fixture/maya.png',outputPath:'/fixture/maya.png',characterAuthorityMode:'complete-dressed-body'})
  const story=node('story','storyboard',{storyboardPanels:[{id:'one',prompt:'@maya speaks.',duration:5,shotSize:'medium',camera:'static',activeCharacterTags:['@maya'],dialogueSpans:[{id:'hello',speakerTag:'@maya',text:'Selamat pagi.',startPanelId:'one',endPanelId:'one'}]}]})
  const nodes=[end,person,story],edges:Edge[]=[{id:'person-story',source:'maya',target:'story',targetHandle:'character-in'},{id:'story-video',source:'story',target:'generate',targetHandle:'storyboard-in'}]
  const request=buildGenerationRequest(end,nodes,edges),before=JSON.stringify(request),deps=dependencies(contract)
  expect(request.providerPromptOwnership).toBe('compiled');expect(request.falNative!.requiresGeneratedSpeech).toBe(true)
  expect(generationRequirementFailures(request)).toEqual(expect.arrayContaining([expect.stringMatching(/dialogue.*audio/i)]))
  await expect(executeFalNativeGeneration(request.falNative!,request.kind,deps)).rejects.toThrow(/spoken dialogue.*generated audio/i)
  expect(deps.prepareSource).not.toHaveBeenCalled();expect(deps.client).not.toHaveBeenCalled();expect(deps.upload).not.toHaveBeenCalled();expect(deps.submit).not.toHaveBeenCalled();expect(JSON.stringify(request)).toBe(before)
  end.data.falNative!.values.generate_audio=true
  const reopenedNodes=JSON.parse(JSON.stringify(nodes)) as StudioNode[],ready=buildGenerationRequest(reopenedNodes[0],reopenedNodes,JSON.parse(JSON.stringify(edges))),enabled=dependencies(contract)
  expect(ready.providerPromptOwnership).toBe('compiled');expect(ready.falNative!.requiresGeneratedSpeech).toBe(true)
  await executeFalNativeGeneration(ready.falNative!,ready.kind,enabled)
  expect(enabled.submit.mock.calls[0][2].generate_audio).toBe(true);expect(enabled.submit.mock.calls[0][2].prompt).toBe(ready.prompt)
  expect(String(enabled.submit.mock.calls[0][2].prompt).match(/Selamat pagi[.]/g)).toHaveLength(1)
  end.data.promptMode='manual';end.data.manualPromptDraft='  Exact silent acting body.  '
  const manual=buildGenerationRequest(end,nodes,edges)
  expect(manual.providerPromptOwnership).toBe('authored');expect(manual.falNative!.requiresGeneratedSpeech).toBe(false);expect(manual.prompt).toBe(end.data.manualPromptDraft)
 })

})
