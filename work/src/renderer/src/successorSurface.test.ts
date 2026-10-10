import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appNext = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')
const nodeCardNext = readFileSync(new URL('./NodeCardNext.tsx', import.meta.url), 'utf8')
const utilityNodes = readFileSync(new URL('./UtilityNodes.tsx', import.meta.url), 'utf8')
const nodePort = readFileSync(new URL('./NodePort.tsx', import.meta.url), 'utf8')
const stylesNext = readFileSync(new URL('./styles-next.css', import.meta.url), 'utf8')

describe('successor renderer asset and reference surfaces', () => {
  it('shows the selected provider/model identity exactly once outside fluid control groups', () => {
    expect(nodeCardNext).toContain("const selectedLabel = displayLabel || selected?.label || modelDisplayName(fallbackModelId)")
    expect(nodeCardNext).toContain("const accessibleLabel = requestedAccessibleLabel || selected?.label || selectedLabel")
    expect(stylesNext).toMatch(/\.grouped-menu-select \.selected-label-compact\s*\{\s*display:\s*none;\s*\}/)
    expect(nodeCardNext).toContain('aria-selected={option.value === value}')
    expect(nodeCardNext).toContain("value={`${imageProvider}::${imageModelId}`}")
  })

  it('keeps ordinary Media fluid at the source aspect ratio inside one clipped viewport', () => {
    expect(nodeCardNext).toContain('className="media-tile-preview"')
    expect(stylesNext).toMatch(/\.studio-node\.is-media-tile \.media-tile-preview\s*\{[^}]*width:\s*100%;[^}]*display:\s*block;/)
    expect(stylesNext).not.toMatch(/\.studio-node\.is-media-tile \.media-tile-preview\s*\{[^}]*aspect-ratio:/)
    expect(stylesNext).toMatch(/\.studio-node\.is-media-tile \.node-media\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*max-height:\s*none;/)
    expect(stylesNext).toMatch(/\.studio-node\.is-media-tile \.media-tile-preview\s*\{[^}]*overflow:\s*hidden;[^}]*border-radius:\s*0 0 13px 13px;/)
    expect(stylesNext).toContain('.studio-node.kind-output .media-tile-preview { border-radius: 0; }')
    expect(stylesNext).toContain('.studio-node > .gallery-collection { border-radius: 0 0 16px 16px; }')
    expect(stylesNext).toMatch(/\.storyboard-asset-node > footer \{ border-radius: 0 0 13px 13px; \}/)
  })

  it('uses one native React Flow Export route on every real output and none on terminal Gallery', () => {
    expect(nodePort).toContain("const Icon = type === 'source' ? ACTION_ICONS.export")
    expect(nodePort).toContain('onClick={available ? onRoute : undefined}')
    expect(nodePort).not.toContain('onPointerDown=')
    expect(nodePort).not.toContain('onMouseDown=')
    expect(nodePort).not.toContain('onTouchStart=')
    expect(nodeCardNext).toContain("'upload', 'image-generator', 'image-editor', 'upscaler', 'video-generator', 'output', 'character', 'location', 'wardrobe', 'element', 'style-reference', 'voiceover', 'sound-effects', 'music-generator'")
    expect(nodeCardNext).not.toMatch(/const outputsMedia = \[[^\]]*'gallery'/)
    expect(stylesNext).toContain('.react-flow__node.selected .node-port-source.connection-idle.is-stowed .node-port-visual')
    expect(utilityNodes).toContain('id="mixed-out" type="source"')
    expect(utilityNodes).toContain('id="output" type="source"')
    expect(utilityNodes).toContain('id="storyboard-out" type="source"')
    expect(utilityNodes).toContain('id="generated_prompt" type="source"')
  })

  it('routes imported generator media through shared compatibility and cardinality', () => {
    expect(appNext).toContain("compatibleTargetHandle(sourceData, target.data, 'media-out')")
    expect(appNext).toContain('inputCardinalityError(edges, target.id, target.data, targetHandle, true)')
    expect(appNext).not.toContain("availableHandles.has('reference-in') ? 'reference-in' : availableHandles.has('image-in')")
  })

  it('does not add Character Single/Multi intake modes to Storyboard', () => {
    expect(appNext).not.toContain('storyboardImageMode')
    expect(utilityNodes).not.toContain('Storyboard Image Layout')
    expect(utilityNodes).not.toContain('storyboard-image-layout')
    expect(stylesNext).not.toContain('.storyboard-image-layout')
    expect(stylesNext).not.toContain('.storyboard-image-stage')
  })

  it('offers lossless Character Multi, Sheets, and Batch modes without an aspect-ratio selector', () => {
    expect(nodeCardNext).toContain("data.characterInputMode === 'single' ? 'single' : 'multi'")
    expect(nodeCardNext).toContain("runtime?.updateNode(id, { characterInputMode: 'multi'")
    expect(nodeCardNext).toContain('>Multi</button>')
    expect(nodeCardNext).toContain("runtime?.updateNode(id, { characterInputMode: 'single'")
    expect(nodeCardNext).toContain('>Sheets</button>')
    expect(nodeCardNext).toContain('<Layers3 size={13} />Batch')
    expect(nodeCardNext).not.toContain('ariaLabel="Character Image Aspect Ratio"')
    expect(nodeCardNext).not.toMatch(/style=\{[^\n]*characterAspectRatio/)
    expect(nodeCardNext).not.toContain("characterAspectRatio: data.characterAspectRatio")
    expect(nodeCardNext).toContain("runtime?.importAsset(id, 'front')")
    expect(nodeCardNext).not.toContain('characterReadySheet')
    expect(nodeCardNext).not.toContain('Character Sheet</button>')
    expect(nodeCardNext).not.toContain('Multi-angle Images</button>')
    expect(stylesNext).toMatch(/\.character-input-mode\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/)
    expect(stylesNext).not.toContain('.character-single-mode > .grouped-menu-select')
    expect(stylesNext).toMatch(/\.character-single-image-stage img\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*max-height:\s*none;/)
    expect(nodeCardNext).not.toContain('data-character-mode=')
    expect(nodeCardNext).not.toContain('is-single-character')
    expect(stylesNext).not.toContain(".character-sheet-thumbnail[data-character-mode='single']")
    expect(stylesNext).not.toContain('.reusable-large-preview-media.is-character-preview.is-single-character')
    expect(nodeCardNext).not.toContain('is-single-character-footer')
    expect(stylesNext).not.toContain('.character-completion-footer.is-single-character-footer')
    expect(stylesNext).toMatch(/\.compact-generator-footer\s*\{[^}]*min-height:\s*44px;[^}]*padding:\s*6px 8px;/)
  })

  it('splits Character prompt and Play behavior while sharing one footer layout', () => {
    expect(nodeCardNext).toContain("data.kind === 'character' && characterCreateOpen || ['element', 'location', 'wardrobe'].includes(data.kind)")
    expect(nodeCardNext).not.toContain("characterInputMode === 'multi' && <GroupedMenuSelect className=\"character-ai-provider\"")
    expect(nodeCardNext).not.toContain("characterInputMode === 'multi' && <PlayTooltip")
    expect(nodeCardNext).toContain("characterInputMode === 'single' ? 'Generate Complete Character Sheet' : 'Complete Missing Character Views'")
  })

  it('shows and saves only the active Character mode without resetting accepted Play behavior', () => {
    expect(nodeCardNext).toContain('const characterModeAssets = characterAssetsForMode(data.referenceAssets || [], characterInputMode)')
    expect(nodeCardNext).toContain('const characterFrontFace = characterModeAssets.find')
    expect(nodeCardNext).toContain('const asset = characterModeAssets.find')
    expect(appNext).toContain('const references = characterAssetsForMode(source?.data.referenceAssets || [], characterInputMode)')
    expect(appNext).toContain("characterInputMode: target.data.characterInputMode === 'single' ? 'single' : 'multi'")
    expect(nodeCardNext).toContain("characterInputMode === 'single' ? 'Generate Complete Character Sheet' : 'Complete Missing Character Views'")
  })

  it('gives Character Sheets the same visible Trash action and sidebar Image drop replacement path as Multi', () => {
    expect(nodeCardNext).toContain('character-single-image-stage asset-intake-placeholder')
    expect(nodeCardNext).toContain("event.dataTransfer.types.includes(CANVAS_ASSET_DRAG_MIME)")
    expect(nodeCardNext).toContain("claimSemanticPlaceholderDrop(event, 'front')")
    expect(nodeCardNext).toContain('aria-label="Remove Single Character Image"')
    expect(nodeCardNext).toContain('<strong>Add Character Sheet or Reference</strong>')
    expect(nodeCardNext).not.toContain('<small>Character sheet with 2+ distinct views</small>')
    expect(nodeCardNext).toContain('<Trash2 size={10} />')
    expect(stylesNext).toContain('.character-single-image-stage:hover .asset-part-remove')
    expect(appNext).toContain('const next = [linked, ...(target.data.referenceAssets || []).filter')
  })

  it('uses distinct visual icons for Multi and Sheets intake modes', () => {
    expect(nodeCardNext).toContain('<LayoutGrid size={13} />Multi')
    expect(nodeCardNext).toContain('<ImageIcon size={13} />Sheets')
    expect(stylesNext).toMatch(/\.character-input-mode button\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*gap:/)
  })

  it('uses the reusable Character direct-save action and current panel asset name', () => {
    expect(nodeCardNext).toContain('const saveReusableAssetDirectly = () =>')
    expect(nodeCardNext).toContain('const name = firstPanelAssetName(data.referenceAssets || [])')
    expect(nodeCardNext).toContain('const semanticSaveControl = <FooterSaveAction ariaLabel={`Save ${semanticAssetLabel}`}')
    expect(nodeCardNext).not.toContain('className="reusable-save-button"')
    expect(nodeCardNext).not.toContain('editingSavedCharacter')
  })

  it('gives Element matching Multi and Sheets intake with one deletable sheet', () => {
    expect(nodeCardNext).toContain("const elementInputMode = data.kind === 'element' && data.elementInputMode === 'single' ? 'single' : 'multi'")
    expect(nodeCardNext).toContain("runtime?.updateNode(id, { elementInputMode: 'multi'")
    expect(nodeCardNext).toContain("runtime?.updateNode(id, { elementInputMode: 'single'")
    expect(nodeCardNext).toContain('<strong>Add Element Sheet or Reference</strong>')
    expect(nodeCardNext).not.toContain('<small>Element sheet with multiple views</small>')
    expect(nodeCardNext).toContain('aria-label="Remove Element Sheets"')
  })

  it('uses the Character-style Location intake wording and direct semantic drop ownership', () => {
    expect(nodeCardNext).toContain("const claimLocationPlaceholderDrop = (event: ReactDragEvent<HTMLButtonElement>) =>")
    expect(nodeCardNext).toContain('onDropCapture={claimLocationPlaceholderDrop}')
    expect(nodeCardNext).toContain("event.dataTransfer.types.includes('Files')")
    expect(nodeCardNext).toContain('event.preventDefault()')
    expect(nodeCardNext).toContain('event.stopPropagation()')
    expect(nodeCardNext).toContain('<Plus size={18} />')
    expect(nodeCardNext).toContain('<strong>Add Location or Reference</strong>')
    expect(nodeCardNext).not.toContain('<strong>Add Image or Reference</strong>')
    expect(appNext).toContain('window.prism.assets.importPaths(paths, semanticDropKind, target.data.title)')
  })
})

describe('successor project hydration', () => {
  it('does not block the active project on a slow Recent Projects lookup', () => {
    expect(appNext).toContain('void startStartupHydration({')
    expect(appNext).toContain('recentProjects: () => window.prism.projects.recent()')
    expect(appNext).toContain('onRecentProjects: (projects) => setRecentProjects([...projects])')
    expect(appNext).toContain('const activation = activateProject(storedProject, false)')
    expect(appNext).not.toMatch(/Promise\.all\(\[[^\]]*projects\.current\(\)[^\]]*projects\.recent\(\)/)
  })
})
