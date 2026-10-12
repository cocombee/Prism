import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const app = readFileSync(join(root, 'src/renderer/src/AppNext.tsx'), 'utf8')
const nodeCard = readFileSync(join(root, 'src/renderer/src/NodeCardNext.tsx'), 'utf8')
const palette = readFileSync(join(root, 'src/renderer/src/nodePalette.ts'), 'utf8')
const icons = readFileSync(join(root, 'src/renderer/src/iconSystem.ts'), 'utf8')
const main = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
const connectEnd = readFileSync(join(root, 'src/renderer/src/characterSemanticConnectEnd.ts'), 'utf8')

const wardrobeSurface = () => {
  const start = nodeCard.indexOf("data.kind === 'wardrobe' && semanticCreateOpen")
  const end = nodeCard.indexOf("data.kind === 'style-reference'", start)
  return nodeCard.slice(start, end)
}

describe('Wardrobe Location-parity surface', () => {
  it('registers a distinct Wardrobe node, category, Shirt icon, and storage folder', () => {
    expect(palette).toContain("{ kind: 'wardrobe', label: 'Wardrobe', detail: 'Semantic wardrobe reference'")
    expect(icons).toContain('wardrobe: Shirt')
    expect(icons).toContain("'wardrobe-reference': SEMANTIC_ICONS.wardrobe")
    expect(main).toContain("projectFolder('Wardrobes', safeFolderName(collectionName, 'Wardrobe'))")
    expect(main).toContain("category: 'wardrobe'")
  })

  it('copies Location Single/Batch intake with Wardrobe labels and state', () => {
    const surface = wardrobeSurface()
    expect(surface).not.toBe('')
    expect(surface).toContain('Wardrobe image intake mode')
    expect(surface).toContain('<ImageIcon size={13} />Single')
    expect(surface).toContain('<Layers3 size={13} />Batch')
    expect(surface).toContain('wardrobeInputMode: \'single\'')
    expect(surface).toContain('<strong>Add Wardrobe or Reference</strong>')
    expect(surface).not.toContain('Wardrobe image without faces')
    expect(surface).toContain("activeAssetDropTarget === 'wardrobe'")
    expect(nodeCard).toContain("const assetBatchKind = ['character', 'element', 'location', 'wardrobe'].includes(data.kind)")
  })

  it('integrates Wardrobe into reusable Library, save, import, and filter paths', () => {
    expect(app).toContain("type AssetTypeFilter = 'all' | 'character' | 'element' | 'location' | 'wardrobe'")
    expect(app).toContain("type SemanticCreateKind = 'character' | 'element' | 'location' | 'wardrobe'")
    expect(app).toContain("...(kind === 'wardrobe' ? { wardrobeInputMode: 'single' } : {})")
    expect(app).toContain("wardrobe: build('wardrobe', 'wardrobe')")
    expect(app).toContain("{ type: 'wardrobe', label: 'Wardrobes', icon: ASSET_TYPE_ICONS.wardrobe }")
    expect(nodeCard).toContain("semanticLibraries: Record<'element' | 'location' | 'wardrobe' | 'style-reference'")
  })

  it('keeps existing downstream node designs unchanged and adds Wardrobe only to Character', () => {
    expect(nodeCard).toContain("'wardrobe-in': 'Add Wardrobe'")
    expect(nodeCard).not.toContain("data.kind === 'video-generator' && <Wardrobe")
    expect(app).toContain("port.id === 'wardrobe-in' ? 'wardrobe'")
    expect(app).toContain("target.data.kind === 'character' && targetHandleId === 'wardrobe-in'")
    expect(app).toContain("node.data.kind === 'wardrobe' && hasMaterializedAsset(node.data)")
    expect(app).toContain("source: savedWardrobe.id, sourceHandle: 'media-out', target: target.id, targetHandle: 'wardrobe-in'")
    expect(app).toContain("{ type: 'character', label: 'Characters', icon: ASSET_TYPE_ICONS.character },\n                    { type: 'wardrobe', label: 'Wardrobes', icon: ASSET_TYPE_ICONS.wardrobe },\n                    { type: 'element', label: 'Elements', icon: ASSET_TYPE_ICONS.element }")
    expect(app).toContain("{ type: 'all', label: 'All', icon: ASSET_TYPE_ICONS.all }, { type: 'character', label: 'Characters', icon: ASSET_TYPE_ICONS.character }, { type: 'wardrobe', label: 'Wardrobes', icon: ASSET_TYPE_ICONS.wardrobe }, { type: 'element', label: 'Elements', icon: ASSET_TYPE_ICONS.element }")
  })

  it('shows the shared top-right creation cancel control for every reusable droppable editor', () => {
    expect(nodeCard).toContain("['element', 'location', 'wardrobe', 'style-reference'].includes(data.kind)")
    expect(nodeCard).toContain('aria-label="Cancel Asset Creation"')
    expect(nodeCard).toContain('onClick={cancelReusableEditor}>Cancel</button>')
    expect(nodeCard).toContain("characterEditorOpen: false, styleEditorOpen: false, semanticEditorOpen: false")
  })

  it('snaps typed Style and Wardrobe wires when Character loses an animated input handle', () => {
    expect(app).toContain('recoverCharacterSemanticConnectionAtEnd({')
    expect(connectEnd).toContain("closest<HTMLElement>('.react-flow__node')")
    expect(connectEnd).toContain("getAttribute('data-id')")
    expect(connectEnd).toContain("['style-reference', 'wardrobe'].includes(source.data.kind)")
    expect(connectEnd).toContain('recoveredConnectionTargetHandle(source.data, target.data, sourceHandleId, reportedTargetHandle)')
    expect(connectEnd).toContain('commit({ source: source.id, sourceHandle: sourceHandleId, target: target.id, targetHandle: targetHandleId })')
  })

  it('does not erase declared Style and Wardrobe inputs after Character connection commit', () => {
    expect(app).not.toContain("const characterIds = new Set(nodes.filter((node) => node.data.kind === 'character')")
    expect(app).not.toContain('current.filter((edge) => !characterIds.has(edge.target))')
    expect(app).toContain('const availableTargetHandles = new Set(nodeInputPorts(target.data).map((port) => port.id))')
  })
})
