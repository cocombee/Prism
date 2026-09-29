import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')

function sliceBetween(start: string, end: string) {
  const from = app.indexOf(start)
  const to = app.indexOf(end, from)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return app.slice(from, to)
}

describe('active next-gen Canvas Hand tool renderer contract', () => {
  it('always renders adjacent persistent Select and Hand buttons without icon swapping', () => {
    const rail = sliceBetween('<aside className="tool-rail">', '<div className="tool-cluster">')
    const select = rail.indexOf('aria-label="Select"')
    const hand = rail.indexOf('aria-label="Hand"')
    expect(select).toBeGreaterThanOrEqual(0)
    expect(hand).toBeGreaterThan(select)
    expect(rail.slice(select, hand)).toContain('<MousePointer2 size={18} />')
    expect(rail.slice(hand)).toContain('<Hand size={18} />')
    expect(rail).not.toContain('spacePanning ? <Hand')
    expect(rail).not.toContain('spacePanning ? \'Pan Canvas')
  })

  it('marks Select persistently and Hand persistently or temporarily active', () => {
    const rail = sliceBetween('<aside className="tool-rail">', '<div className="tool-cluster">')
    expect(rail).toContain("activeTool === 'select' ? 'is-active' : ''")
    expect(rail).toContain("activeTool === 'hand' || spacePanning ? 'is-active' : ''")
    expect(rail).toContain("onClick={() => setActiveTool('select')}")
    expect(rail).toContain("onClick={() => setActiveTool('hand')}")
    expect(rail).toContain('data-tooltip="Select [V]"')
    expect(rail).toContain('aria-keyshortcuts="V"')
    expect(rail).not.toMatch(/aria-label="Hand"[^>]*aria-keyshortcuts=/)
  })

  it('gives temporary Space panning explicit React Flow ownership without changing ordinary Select drag', () => {
    const flow = sliceBetween('<ReactFlow', '<ViewportPortal>')
    expect(flow).toContain('panActivationKeyCode="Space"')
    expect(flow).toContain('panOnDrag={canvasPanButtons(activeTool, spacePanning)}')
    expect(flow).toContain("nodesDraggable={activeTool === 'select' && !spacePanning}")
    expect(flow).toContain("selectionOnDrag={activeTool === 'select' && !spacePanning}")
    expect(flow).toContain("elementsSelectable={activeTool !== 'hand'}")

  })

  it('keeps Space state visual-only, supports immediate repeated keydown-to-pointerdown cycles, and releases React Flow on keyup, blur, and visibility loss', () => {
    const keyboard = sliceBetween('useEffect(() => {\n    const onKeyDown', '  const updateNode = useCallback')
    expect(keyboard).toContain("if (!typing && event.code === 'Space')")
    expect(keyboard).toContain('if (event.repeat) return')
    expect(keyboard).toContain('const releaseSpacePanning = (releaseReactFlow = false) =>')
    expect(keyboard).toContain("window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }))")
    expect(keyboard).toContain("const onVisibilityChange = () => { if (document.hidden) { releaseSpacePanning(true); stopMiddlePanning() } }")
    expect(keyboard).toContain('const onBlur = () => {\n      releaseSpacePanning(true)')
    expect(keyboard).not.toContain('if (spacePanning) return')
    expect(keyboard).toContain("const typing = isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement)")
  })
})
