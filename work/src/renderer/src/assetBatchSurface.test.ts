import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const app = readFileSync(join(root, 'src/renderer/src/AppNext.tsx'), 'utf8')
const nodeCard = readFileSync(join(root, 'src/renderer/src/NodeCardNext.tsx'), 'utf8')
const main = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
const styles = readFileSync(join(root, 'src/renderer/src/styles-next.css'), 'utf8')

describe('special asset Batch product surface', () => {
  it('exposes local Batch inspection and save IPC without adding staged drops to a library', () => {
    expect(preload).toContain("ipcRenderer.invoke('assets:inspect-batch'")
    expect(preload).toContain("ipcRenderer.invoke('assets:choose-batch'")
    expect(main).toContain("ipcMain.handle('assets:inspect-batch'")
    expect(main).toContain("ipcMain.handle('assets:choose-batch'")
    expect(main).toContain('inspectAssetBatchFiles')
    expect(app).toContain('const saveAssetBatchRow')
    expect(app).toContain('window.prism.assets.importPaths([row.path], kind, name)')
  })

  it('adds Batch only to Character, Element, and Location', () => {
    expect(nodeCard).toContain('<Layers3 size={13} />Batch')
    expect(nodeCard).toContain("data.kind === 'location'")
    expect(nodeCard).toContain('className="asset-batch-panel asset-intake-surface"')
    expect(nodeCard).not.toMatch(/style-reference[^\n]{0,240}<Layers3/)
  })

  it('offers Location only as Single or Batch and keeps Single on the Sheets intake path', () => {
    const locationStart = nodeCard.indexOf("data.kind === 'location' && semanticCreateOpen")
    const locationEnd = nodeCard.indexOf("data.kind === 'style-reference'", locationStart)
    const locationSurface = nodeCard.slice(locationStart, locationEnd)
    expect(locationSurface).toContain('<ImageIcon size={13} />Single')
    expect(locationSurface).toContain('<Layers3 size={13} />Batch')
    expect(locationSurface).not.toContain('<LayoutGrid size={13} />Multi')
    expect(locationSurface).not.toContain('<ImageIcon size={13} />Sheets')
    expect(styles).toContain('.location-input-mode { grid-template-columns: repeat(2, minmax(0, 1fr)); }')
    expect(app).toContain("target.data.kind === 'location' ? { locationInputMode: 'single' as const } : { wardrobeInputMode: 'single' as const }")
  })

  it('uses side-library rows, inline rename/delete/save controls, a five-row scroll cap, and Save All Assets', () => {
    for (const marker of ['asset-batch-row', 'Rename asset', 'Save Asset', 'Remove Staged Asset', 'Save All Assets']) expect(nodeCard).toContain(marker)
    expect(styles).toContain('.asset-batch-rows[data-overflow="true"]')
    expect(styles).toContain('max-height: 320px')
    expect(styles).toContain('.asset-batch-name')
    expect(nodeCard).toContain('const assetBatchPanel = assetBatchOpen && assetBatchKind')
    expect(nodeCard).toContain('await runtime!.saveAssetBatchRow(assetBatchKind, row, row.displayName)')
    expect(nodeCard).toContain('for (const row of assetBatchRows)')
    expect(app).toContain("...(kind === 'location' ? { locationInputMode: 'single' } : {})")
  })

  it('uses short, kind-specific intake guidance instead of hidden content validators', () => {
    for (const guidance of ['Add Character Sheet or Reference', '2+ Character sheets', 'Add Element Sheet or Reference', '2+ Element images', 'Add Location or Reference', '2+ Location images', 'Add Wardrobe or Reference', '2+ Wardrobe images without faces', 'Add Style or Reference']) expect(nodeCard).toContain(guidance)
    expect(main).not.toContain('assertWardrobeImageIsFaceFree')
    expect(preload).not.toContain('detectWardrobeFaces')
  })

  it('shares one dashed, padded, hover-active placeholder contract across Sheets, Batch, and Location', () => {
    expect(nodeCard.match(/asset-intake-placeholder/g)?.length).toBeGreaterThanOrEqual(4)
    expect(nodeCard).toContain('claimSemanticPlaceholderDrop')
    expect(nodeCard).toContain('onDropCapture={claimLocationPlaceholderDrop}')
    expect(styles).toContain('.asset-intake-surface { padding: 6px; display: grid; background: #111114; }')
    expect(styles).toContain('.asset-intake-placeholder:hover, .asset-intake-placeholder.is-drag-over')
    expect(styles).toContain('background: #251a39')
  })

  it('routes manually selected saved assets back to Sheets and keeps original filenames for one-image Sheets imports', () => {
    expect(app).toContain("characterInputMode: 'single'")
    expect(app).toContain("elementInputMode: 'single'")
    expect(app).toContain("locationInputMode: 'single'")
    expect(nodeCard).toContain('assetBatchDisplayName')
    expect(nodeCard).not.toContain('Rename imported Sheets asset')
  })

  it('makes Assets selections visible and exposes counted multi-delete in both project and side libraries', () => {
    expect(styles).toContain('.asset-card.is-selected')
    expect(styles).toContain('outline: 1.4px solid rgba(169,140,255,.78)')
    expect(app).toContain('asset-delete-selected')
    expect(app).toContain('canvas-asset-delete-selected')
    expect(app).toContain('Delete ${selectedManagedAssetDeletion.selectionCount} Assets')
  })

  it('places counted DELETE beside Create with the same action dimensions', () => {
    expect(app).toContain('canvas-asset-sticky-actions ${selectedManagedAssetDeletion.selectionCount > 0 ? \'has-delete\' : \'\'}')
    expect(styles).toContain('.canvas-asset-sticky-actions.has-delete { grid-template-columns: repeat(3, minmax(0, 1fr)); }')
    expect(styles).not.toContain('button.canvas-asset-delete-selected { grid-column: 1 / -1;')
  })

  it('returns project navigation to Canvas and exits Batch after its last successful save', () => {
    expect(app).toContain("setHomeSection('spaces'); setAppView('space')")
    expect(nodeCard).toContain('finishAssetBatchEditing')
  })

  it('saves Character, Element, and Location directly from the first panel filename', () => {
    expect(nodeCard).toContain('firstPanelAssetName(data.referenceAssets || [])')
    expect(nodeCard).toContain('saveReusableAssetDirectly')
  })
})
