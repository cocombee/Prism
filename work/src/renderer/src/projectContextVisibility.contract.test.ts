import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')
const saveToolbarSource = readFileSync(new URL('./SaveToolbarControl.tsx', import.meta.url), 'utf8')

function sourceBetween(start: string, end: string): string {
  const startIndex = appSource.indexOf(start)
  const endIndex = appSource.indexOf(end, startIndex)
  expect(startIndex, `missing source marker: ${start}`).toBeGreaterThanOrEqual(0)
  expect(endIndex, `missing source marker: ${end}`).toBeGreaterThan(startIndex)
  return appSource.slice(startIndex, endIndex)
}

describe('project Home and Canvas context visibility', () => {
  it('keeps manual Save and Assets in the Canvas-editor guard, removes History, and leaves Connections global', () => {
    const topActions = sourceBetween('<div className="top-actions">', '</div>\n      </header>')
    const canvasGuard = topActions.match(/\{appView === 'canvas' && <>([\s\S]*?)<\/>\}/)

    expect(canvasGuard, 'missing shared Canvas-only top-action guard').not.toBeNull()
    expect(canvasGuard![1]).toContain('<CanvasManualSaveControl surface="canvas-editor"')
    expect(canvasGuard![1]).toContain('aria-label="Assets"')
    expect(topActions).not.toContain('aria-label="History"')
    expect(appSource).not.toContain('historyOpen')
    expect(saveToolbarSource).toContain("if (surface !== 'canvas-editor') return null")
    expect(saveToolbarSource).toContain('aria-label="Save project"')
    expect(topActions.indexOf('aria-label="Connections"')).toBeGreaterThan(topActions.indexOf(canvasGuard![0]) + canvasGuard![0].length)
  })

  it('preserves project Home navigation and excludes Plans or semantic workspace UI', () => {
    const projectHome = sourceBetween("{appView === 'space' && (", '<div className="space-home-content">')

    expect(projectHome).toContain('<CanvasIcon size={17} />Canvas</button>')
    expect(projectHome).toContain('<AssetLibraryIcon size={17} />Assets</button>')
    expect(projectHome).toContain('className="asset-type-submenu" aria-label="Asset Types"')
    expect(projectHome).toContain('<Heart size={14} />Favorites</button>')
    expect(projectHome).toContain('<Trash2 size={17} />Trash</button>')
    expect(projectHome).toContain('<ProjectsIcon size={15} />Switch Project</button>')
    expect(appSource).not.toMatch(/PrismSemanticWorkspace|semantic-nav-entry|Open Semantic Plans|>Plans</)
  })
})
