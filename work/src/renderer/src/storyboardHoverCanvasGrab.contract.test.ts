import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const utility = readFileSync(new URL('./UtilityNodes.tsx', import.meta.url), 'utf8')
const card = readFileSync(new URL('./NodeCardNext.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles-next.css', import.meta.url), 'utf8')

describe('Storyboard compact local reveal contract', () => {
  it('owns reveal with a compact zone inside each prompt field', () => {
    expect(utility).toContain('className="storyboard-control-reveal-zone"')
    expect(utility).toMatch(/storyboard-control-reveal-zone">\s*<div className="storyboard-prompt-actions">/)
    expect(styles).toMatch(/\.storyboard-control-reveal-zone \{[^}]*position: absolute;[^}]*right: 0;[^}]*bottom: 0;[^}]*width: max-content;[^}]*max-height: 48px;/)
    expect(styles).not.toMatch(/\.storyboard-panel:hover[^}]*storyboard-prompt-actions/)
    expect(styles).not.toMatch(/\.storyboard-prompt-field:hover[^}]*storyboard-prompt-actions/)
  })

  it('reveals by opacity for local hover, focus, reduced motion, and touch', () => {
    expect(styles).toMatch(/\.storyboard-control-reveal-zone \.storyboard-prompt-actions \{[^}]*opacity: 0;[^}]*visibility: visible;[^}]*pointer-events: none;[^}]*transition: opacity 120ms ease;/)
    expect(styles).toMatch(/\.storyboard-control-reveal-zone:hover \.storyboard-prompt-actions,[\s\S]*\.storyboard-control-reveal-zone:focus-within \.storyboard-prompt-actions \{[^}]*opacity: 1;[^}]*pointer-events: auto;/)
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*storyboard-prompt-actions[^}]*transition: none;/)
    expect(styles).toMatch(/@media \(hover: none\)[\s\S]*storyboard-prompt-actions[^}]*opacity: 1;[^}]*pointer-events: auto;/)
    expect(styles).not.toMatch(/storyboard-prompt-actions[^}]*transform:/)
  })

  it('gives the nested textarea and highlight identical bottom-only clearance', () => {
    expect(styles).toMatch(/\.storyboard-prompt-field > \.tagged-prompt-shell > textarea,\s*\.storyboard-prompt-field > \.tagged-prompt-shell \.tagged-prompt-highlight pre \{[^}]*padding: 8px 8px 43px 8px;/)
    expect(styles).not.toContain('.storyboard-prompt-field.has-transition-actions')
    expect(styles).not.toMatch(/storyboard-prompt-field[^}]*padding-right:\s*(42|132)px/)
  })
})

describe('Canvas grab-through ownership contract', () => {
  it('marks selected semantic and generated preview surfaces as node-drag-through while preserving controls', () => {
    expect(card).toContain('className="reusable-large-preview nodrag"')
    expect(card).toContain('className="generator-stage nodrag"')
    expect(card).toContain('className={`generated-media-stage nodrag')
    expect(card).toContain('controls preload="metadata" playsInline draggable={false}')
    expect(card).toMatch(/reusable-large-preview-media[\s\S]*draggable=\{false\}[\s\S]*onDragStart=\{\(event\) => event\.preventDefault\(\)\}/)
  })

  it('keeps unfocused text eligible for Space grab and focused text editor-owned', () => {
    expect(app).toContain('const typing = isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement)')
    expect(app).toContain("if (!typing && event.code === 'Space')")
    expect(app).toContain("if (typing && event.key === 'Escape')")
    expect(app).toContain('panActivationKeyCode="Space"')
    expect(app).toContain('panOnDrag={canvasPanButtons(activeTool, spacePanning)}')
  })

  it('preserves ordinary node drag and physical Handle connection ownership', () => {
    expect(app).toContain("nodesDraggable={activeTool === 'select' && !spacePanning}")
    expect(app).toContain('onConnectStart={handleConnectStart}')
    expect(app).toContain('onConnectEnd={handleConnectEnd}')
    expect(styles).toMatch(/\.node-port-visual \{[^}]*pointer-events: none;/)
  })
})
