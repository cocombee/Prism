import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tagged = readFileSync(new URL('./TaggedPromptTextarea.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')
const nodeCard = readFileSync(new URL('./NodeCardNext.tsx', import.meta.url), 'utf8')
const assetFields = readFileSync(new URL('./AssetPromptFields.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles-next.css', import.meta.url), 'utf8')

describe('active Storyboard editor and Canvas history wiring', () => {
  it('captures selection before controlled writes, restores in layout, and isolates native text history', () => {
    expect(tagged).toContain('const selection = captureTextSelection(event.currentTarget)')
    expect(tagged).toContain('pendingSelection.current = selection')
    expect(tagged.indexOf('pendingSelection.current = selection')).toBeLessThan(tagged.indexOf('onValueChange(event.currentTarget.value)'))
    expect(tagged).toContain('const selection = clampTextSelection(pending, value.length)')
    expect(tagged).toContain('const historyAction = nativeTextHistoryAction(event)')
    expect(tagged).toContain("historyAction === 'undo' ? undoControlledText")
    expect(tagged).toContain('event.preventDefault()')
  })

  it('routes Storyboard, generic, Style, and Video User prompt fields through shared controlled history', () => {
    expect(nodeCard).toContain('<TaggedPromptTextarea className="node-textarea"')
    expect(nodeCard).toContain('<AssetPromptFields')
    expect(assetFields).toContain('<TaggedPromptTextarea id={`asset-description-${id}`} className="style-prompt-inline')
    expect(nodeCard).toContain('className="node-prompt generator-prompt media-generator-prompt nodrag"')
    expect(tagged).toContain('createControlledTextHistory')
    expect(tagged).toContain("historyAction === 'undo' ? undoControlledText")
    expect(tagged).toContain('pendingScroll.current')
    expect(tagged).toContain('event.stopPropagation()')
  })

  it('removes native resizing only from active shared prompt editors', () => {
    expect(styles).toMatch(/\.studio-node > \.tagged-prompt-shell\.generator-prompt > textarea \{[^}]*resize:\s*none;/)
    expect(styles).toMatch(/\.tagged-prompt-shell\.node-prompt > textarea \{[^}]*resize:\s*none;/)
    expect(styles).toMatch(/\.tagged-prompt-shell\.style-prompt-inline > textarea \{[^}]*resize:\s*none;/)
    expect(styles).toMatch(/\.storyboard-prompt-field > \.tagged-prompt-shell > textarea \{[^}]*resize:\s*none;/)
    expect(styles).not.toMatch(/(?:generator-prompt|node-prompt|style-prompt-inline)[^\{]*::-webkit-resizer/)
  })

  it('isolates Canvas shortcuts from event targets and active text focus and sanitizes both history directions', () => {
    expect(app).toContain('const typing = isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement)')
    expect(app).toContain('const historyAction = nativeTextHistoryAction(event)')
    expect(app).toContain('if (!typing && historyAction)')
    expect(app).toContain('sanitizeCanvasHistoryNodes')
    expect(app.match(/sanitizeCanvasHistoryNodes\(/g)?.length || 0).toBeGreaterThanOrEqual(5)
  })
})
