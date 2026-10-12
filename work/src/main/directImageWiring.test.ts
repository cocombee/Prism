import { assertVideoProviderPromptPreflight } from '../shared/providerPromptPreflight'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import ts from 'typescript'
import type { GenerationRequest } from '../shared/types'
import { prepareDirectImageInputs } from './directImageInputs'
import { directImageControls } from '../shared/directImageControls'
import { orderedProviderImageReferences, providerArtworkCarrierRequest, providerNativeImagePrompt } from '../shared/referenceInstructions'
import { imageReferenceLimit } from '../shared/imageModels'
import { isDirectElevenAudio } from '../shared/elevenLabsAudio'
import { assertGenerationRequirements } from '../shared/generationReadiness'
import { providerEffectiveRequestControls } from '../shared/requestPreview'
const source = ts.createSourceFile('index.ts', readFileSync(new URL('index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
function actualFunction(name: string, bindings: Record<string, unknown>) {
  const node = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name)
  if (!node) throw new Error(`Missing main owner ${name}`)
  const text = ts.transpileModule(node.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(bindings), `${text}\nreturn ${name};`)(...Object.values(bindings)) as (...args: any[]) => Promise<any>
}
function setup(provider: 'openai' | 'google') {
  const post = vi.fn(async () => new Response(JSON.stringify(provider === 'openai' ? { data: [{ b64_json: 'AQID' }] } : { output_image: { data: 'AQID', mime_type: 'image/png' } }), { headers: { 'Content-Type': 'application/json' } }))
  const bindings: Record<string, any> = { directImageControls, orderedProviderImageReferences, providerArtworkCarrierRequest, providerNativeImagePrompt, imageReferenceLimit, prepareDirectImageInputs, assertGenerationRequirements, assertVideoProviderPromptPreflight, isDirectElevenAudio, Buffer, File, FormData, basename,
    assertManagedMediaPath: vi.fn(async (path: string) => path), stat: vi.fn(async () => ({ size: 3 })), readFile: vi.fn(async () => Buffer.from([1, 2, 3])), mimeFor: () => 'image/png', loadServiceCredential: vi.fn(async () => 'fictional-key'), fetch: post,
    mainWindow: { webContents: { send: vi.fn() } }, runtimeServiceFailures: { assertCurrent: vi.fn() }, currentProject: { rootPath: '/fictional' }, finishDirectImage: vi.fn(async (_request, _provider, modelId) => ({ modelId, outputType: 'image' })), directImageFailure: vi.fn(async () => { throw new Error('Provider failure') }) }
  bindings.directImageInputs = actualFunction('directImageInputs', bindings); bindings.directImagePrompt = actualFunction('directImagePrompt', bindings)
  bindings.runOpenAIImage = actualFunction('runOpenAIImage', bindings); bindings.runGeminiImage = actualFunction('runGeminiImage', bindings)
  return { run: actualFunction('runGeneration', bindings), bindings, post }
}
const request = (provider: 'openai' | 'google'): GenerationRequest => ({ nodeId: 'fixture', kind: 'image-generator', imageProvider: provider, imageModelId: provider === 'openai' ? 'gpt-image-2' : 'gemini-3.1-flash-image', prompt: 'Place @url left of @local.', inputUrl: 'https://images.example/primary.png', references: [{ referenceDescription: 'Authored fixture reference purpose.', role: 'reference', tag: '@local', path: '/managed/local.png' }, { referenceDescription: 'Authored fixture reference purpose.', role: 'reference', tag: '@url', url: 'https://images.example/opaque?token=keep' }], aspectRatio: '16:9', imageResolution: '1K', outputFormat: 'png', seed: 99, guidanceScale: 2 })
describe('actual native image dispatcher and transport composition', () => {
  it.each(['openai', 'google'] as const)('preserves mixed %s physical input order and prompt ordinals with one POST', async provider => {
    const { run, post, bindings } = setup(provider), authored = request(provider); await run(authored)
    expect(post).toHaveBeenCalledOnce(); const [url, options] = post.mock.calls[0] as unknown as [string, RequestInit], body = JSON.parse(options.body as string)
    const images = provider === 'openai' ? body.images.map((entry: any) => entry.image_url) : body.input.slice(1).map((entry: any) => entry.uri || `data:${entry.mime_type};base64,${entry.data}`)
    expect(images).toEqual(['https://images.example/primary.png', 'https://images.example/opaque?token=keep', 'data:image/png;base64,AQID'])
    const prompt = provider === 'openai' ? body.prompt : body.input[0].text
    expect(prompt).toContain('Place Reference Image 2 left of Reference Image 3.'); expect(prompt).not.toContain('@url'); expect(prompt).not.toContain('@local')
    expect(url).toBe(provider === 'openai' ? 'https://api.openai.com/v1/images/edits' : 'https://generativelanguage.googleapis.com/v1beta/interactions')
    const controls = provider === 'openai' ? (({ images: _images, prompt: _prompt, ...fields }) => fields)(body) : (({ input: _input, ...fields }) => fields)(body)
    expect(controls).toEqual(providerEffectiveRequestControls(authored)); expect(controls).not.toHaveProperty('seed'); expect(controls).not.toHaveProperty('guidanceScale'); expect(bindings.loadServiceCredential.mock.calls).toEqual([[provider]])
  })
  it('retains image[] multipart for every local OpenAI source in exact order', async () => {
    const { run, post } = setup('openai'), authored = request('openai'); authored.inputUrl = undefined; authored.references = [{ referenceDescription: 'Authored fixture reference purpose.', role: 'reference', tag: '@local', path: '/managed/local.png' }, { referenceDescription: 'Authored fixture reference purpose.', role: 'reference', tag: '@url', path: '/managed/url.png' }]
    await run(authored); const options = (post.mock.calls[0] as any)[1], form = options.body as FormData
    expect(form.getAll('image[]').map((file: any) => file.name)).toEqual(['url.png', 'local.png']); expect(form.has('image')).toBe(false); expect(form.get('size')).toBe('1536x1024'); expect(form.get('n')).toBe('1'); expect(options.headers['Content-Type']).toBeUndefined()
  })
  it.each(['openai', 'google'] as const)('%s URL-only edits never become text-only generations; empty references still allow authored generation', async provider => {
    const { run, post } = setup(provider), authored = request(provider); authored.kind = 'image-editor'; authored.references = []; await run(authored)
    let body = JSON.parse((post.mock.calls[0] as any)[1].body); expect(provider === 'openai' ? body.images.length : body.input.filter((item: any) => item.type === 'image').length).toBe(1)
    authored.kind = 'image-generator'; authored.inputUrl = undefined; await run(authored); body = JSON.parse((post.mock.calls[1] as any)[1].body)
    expect(provider === 'openai' ? body.images : body.input.filter((item: any) => item.type === 'image')).toEqual(provider === 'openai' ? undefined : [])
  })
  it.each(['openai', 'google'] as const)('blocks %s unsafe URI, unreadable local input, overload, cancellation and owner changes before credentials/POST', async provider => {
    for (const scenario of ['uri', 'path', 'overload', 'cancel', 'owner']) {
      const { run, post, bindings } = setup(provider), authored = request(provider), controller = new AbortController()
      if (scenario === 'uri') authored.inputUrl = 'file:///private/secret.png'
      if (scenario === 'path') bindings.assertManagedMediaPath.mockRejectedValue(new Error('Relink input'))
      if (scenario === 'overload') { authored.references = Array.from({ length: 101 }, (_, i) => ({ referenceDescription: 'Authored fixture reference purpose.', role: 'reference' as const, path: `/managed/${i}.png` })) }
      if (scenario === 'cancel') controller.abort()
      if (scenario === 'owner') bindings.runtimeServiceFailures.assertCurrent.mockImplementation(() => { throw new Error('Owner changed') })
      await expect(run(authored, controller.signal)).rejects.toThrow({ uri: /HTTPS/, path: /Relink/, overload: /maximum|up to/, cancel: /cancelled/, owner: /Owner changed/ }[scenario]); expect(post).not.toHaveBeenCalled(); expect(bindings.loadServiceCredential).not.toHaveBeenCalled(); expect(bindings.finishDirectImage).not.toHaveBeenCalled()
    }
  })
  it('rechecks cancellation after deferred key loading before submission', async () => {
    const { run, post, bindings } = setup('google'), controller = new AbortController(); bindings.loadServiceCredential.mockImplementation(async () => { controller.abort(); return 'fictional-key' })
    await expect(run(request('google'), controller.signal)).rejects.toThrow(/cancelled/); expect(post).not.toHaveBeenCalled()
  })
})
