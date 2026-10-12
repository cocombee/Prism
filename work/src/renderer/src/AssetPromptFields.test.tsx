import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StudioNodeData } from '../../shared/types'
import { AssetDescriptionField, AssetPromptFields, PlacedMediaDescription, showsAssetDescription } from './AssetPromptFields'

const empty: StudioNodeData = { kind: 'location', title: 'Location' }
const placed = { ...empty, referenceAssets: [{ id: 'door', name: 'Door.png', path: '/door.png', url: 'asset://door', mimeType: 'image/png', createdAt: 'fixture' }] }

describe('asset Description and generation Prompt stack', () => {
  it('does not expose an older result’s Description while the selected result is empty', () => {
    const data: StudioNodeData = { kind: 'image-generator', title: 'Image', outputPath: '/previous.png', generatedResults: [{ path: '/previous.png', url: '', type: 'image', modelId: 'fixture' }, { path: '', url: '', type: 'image', modelId: 'fixture' }], activeResultIndex: 1 }
    expect(showsAssetDescription(data, true)).toBe(false)
    expect(showsAssetDescription({ ...data, activeResultIndex: 0 }, true)).toBe(true)
  })
  it('highlights the Wardrobe and downstream owner in Description without changing generation Prompt input tags', () => {
    const html = renderToStaticMarkup(<AssetPromptFields id="coat" data={{ ...placed, kind: 'wardrobe', assetGenerationPrompt: 'Make @haji-wardrobe for @haji-identity.' }} editing connectedToGenerator showPrompt description="@haji-wardrobe is worn by @haji-identity; @unknown has no supplied definition." descriptionTags={['@haji-wardrobe', '@haji-identity']} connectedTags={['@haji-wardrobe']} availableTags={['@haji-wardrobe']} onDescriptionChange={() => {}} onPromptChange={() => {}} />)
    const description = html.slice(0, html.indexOf('asset-generation-prompt-area'))
    expect(description).toContain('<mark class="is-active">@haji-wardrobe</mark>')
    expect(description).toContain('<mark class="is-active">@haji-identity</mark>')
    expect(description).toContain('<mark class="is-inactive">@unknown</mark>')
    const prompt = html.slice(html.indexOf('asset-generation-prompt-area'))
    expect(prompt).toContain('<mark class="is-inactive">@haji-identity</mark>')
  })
  it.each(['image', 'video', 'audio'] as const)('shows an editable %s canvas media description only while connected, without generation controls', type => {
    const data: StudioNodeData = { kind: 'upload', title: 'Reference', assetPath: `/reference.${type}`, outputType: type, referenceDescription: '@reference is the authored reference.' }
    const render = (connectedToGenerator: boolean) => renderToStaticMarkup(<PlacedMediaDescription data={data} connectedToGenerator={connectedToGenerator}><AssetDescriptionField id="reference" value={data.referenceDescription!} placeholder="Describe its role…" connectedTags={['@reference']} availableTags={['@reference']} onChange={() => {}} /></PlacedMediaDescription>)
    expect(render(false)).toBe('')
    const html = render(true)
    expect(html).toContain('Asset Description')
    expect(html).not.toContain('Revamp Description')
    expect(html).toContain('@reference is the authored reference.')
    expect(html).not.toContain('readonly')
    expect(html).not.toContain('Generation Prompt')
    expect(html).not.toContain('Model')
    expect(render(false)).toBe('')
    expect(data.referenceDescription).toBe('@reference is the authored reference.')
  })
  it.each(['character', 'wardrobe', 'element', 'location', 'style-reference'] as const)('hides disconnected %s Description, retains authored text, including Edit', kind => {
    const data: StudioNodeData = { ...placed, kind, referenceDescription: '@door is the sole reference for Door A closed.', assetGenerationPrompt: 'Keep creation history.' }
    const render = (connectedToGenerator: boolean, editing = false) => renderToStaticMarkup(<AssetPromptFields id={kind} data={data} editing={editing} connectedToGenerator={connectedToGenerator} showPrompt={false} connectedTags={['@door']} availableTags={['@door']} onDescriptionChange={() => {}} onPromptChange={() => {}} />)
    expect(render(true)).toContain(data.referenceDescription!)
    expect(render(false)).not.toContain('Asset Description')
    expect(render(false, true)).not.toContain('Asset Description')
    expect(render(true)).toContain(data.referenceDescription!)
    expect(data.assetGenerationPrompt).toBe('Keep creation history.')
  })
  it.each(['image-generator', 'video-generator', 'image-editor', 'upscaler', 'voiceover', 'sound-effects', 'music-generator', 'output'] as const)('hides disconnected generated %s Description without removing its saved role', kind => {
    const data: StudioNodeData = { kind, title: 'Generated', outputPath: '/fixture/generated', referenceDescription: 'Saved role.' }
    const render = (connectedToGenerator: boolean) => renderToStaticMarkup(<PlacedMediaDescription data={data} connectedToGenerator={connectedToGenerator}><span>{data.referenceDescription}</span></PlacedMediaDescription>)
    expect(render(true)).toContain('Saved role.')
    expect(render(false)).toBe('')
    expect(render(true)).toContain('Saved role.')
  })
  it('requires actual media and a generator connection together, including during Edit', () => {
    expect(showsAssetDescription(empty, false)).toBe(false)
    expect(showsAssetDescription(empty, true)).toBe(false)
    expect(showsAssetDescription(placed, false)).toBe(false)
    expect(showsAssetDescription(placed, true)).toBe(true)
    expect(showsAssetDescription({ ...empty, outputUrl: 'asset://generated' }, true)).toBe(true)
    expect(showsAssetDescription({ kind: 'upload', title: 'Camera', assetUrl: 'asset://video' }, false)).toBe(false)
    const html = renderToStaticMarkup(<AssetPromptFields id="empty-edit" data={empty} editing connectedToGenerator showPrompt connectedTags={[]} availableTags={[]} onDescriptionChange={() => {}} onPromptChange={() => {}} />)
    expect(html).not.toContain('Asset Description')
    expect(html).toContain('Generation Prompt')
  })
  it.each(['character', 'wardrobe', 'element', 'location', 'style-reference'] as const)('keeps %s description above its independent Prompt and existing footer', kind => {
    const html = renderToStaticMarkup(<AssetPromptFields id={kind} data={{ ...placed, kind, referenceDescription: '@door is Door A closed.', assetGenerationPrompt: 'Generate Door A.' }} editing={false} connectedToGenerator showPrompt connectedTags={['@door']} availableTags={['@door']} onDescriptionChange={() => {}} onPromptChange={() => {}} footer={<div>EXISTING FOOTER</div>} />)
    expect(html.indexOf('Asset Description')).toBeLessThan(html.indexOf('Generation Prompt'))
    expect(html.indexOf('Generation Prompt')).toBeLessThan(html.indexOf('EXISTING FOOTER'))
    expect(html).toContain('@door is Door A closed.')
    expect(html).toContain('Generate Door A.')
    expect(html).toContain('aria-required="true"')
    expect(html).toContain('mark class="is-active"')
  })
  it.each(['character', 'wardrobe', 'element', 'location', 'style-reference'] as const)('edits ready %s Description without opening generation editing', kind => {
    const html = renderToStaticMarkup(<AssetPromptFields id={kind} data={{ ...placed, kind, assetGenerationPrompt: 'Keep creation prompt unchanged.' }} editing={false} connectedToGenerator showPrompt={false} descriptionPlaceholder="@location is the sole representation of [the location and its environment]…" connectedTags={[]} availableTags={[]} onDescriptionChange={() => {}} onPromptChange={() => {}} />)
    expect(html).toContain('aria-label="Asset Description"')
    expect(html).not.toContain('readonly')
    expect(html).not.toContain('Generation Prompt')
    expect(html).toContain('required-marker"> *</span>')
  })
  it('retains the Prompt and footer without a Description in empty creation', () => {
    const html = renderToStaticMarkup(<AssetPromptFields id="empty" data={empty} editing={false} connectedToGenerator showPrompt connectedTags={[]} availableTags={[]} onDescriptionChange={() => {}} onPromptChange={() => {}} footer={<div>FOOTER</div>} />)
    expect(html).not.toContain('Asset Description')
    expect(html).toContain('Generation Prompt')
    expect(html).toContain('FOOTER')
  })
})
