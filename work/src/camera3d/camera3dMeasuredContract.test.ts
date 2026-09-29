import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const cssPath = new URL('./camera3d.css', import.meta.url)
const oracleCssPath = '/tmp/prism-oracle-extract/out-camera/renderer/assets/index-ZLpcvB-u.css'
const css = readFileSync(cssPath, 'utf8')

function declarations(source: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches = [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))]
  return matches.at(-1)?.[1].split(';').map((part) => part.trim()).filter(Boolean).sort() ?? []
}

describe('measured Camera 88px contract', () => {
  it('uses four compact action cells totaling exactly 88px and removes the rejected 28px flex rule', () => {
    expect(css).toContain('.camera3d-camera-action-row{display:flex;align-items:center;justify-content:flex-start;gap:4px;height:28px')
    expect(css).toContain('.camera3d-camera-action-row button{width:20px;min-width:20px')
    expect(css).toContain('.camera3d-camera-action-row .camera3d-keyframe-button{width:16px;min-width:16px')
    expect(css).not.toContain('.camera3d-camera-action-row button{flex:0 0 28px}')
  })

  it('keeps the pre-rejection keyframe owner declarations identical to the oracle', () => {
    const oracle = readFileSync(oracleCssPath, 'utf8')
    for (const selector of ['.camera3d-property-tracks', '.camera3d-property-track', '.camera3d-property-track>span', '.camera3d-property-track>div', '.camera3d-property-track button', '.camera3d-property-track button.is-active', '.camera3d-stacked-diamonds', '.camera3d-stacked-diamonds i', '.camera3d-keyframe-navigation']) {
      expect(declarations(css, selector), selector).toEqual(declarations(oracle, selector))
    }
  })

  it('uses natural labels, 28px transform rows, and never masks overflow', () => {
    expect(css).toMatch(/\.camera3d-rotation-property\{display:grid!important;grid-template-columns:max-content 148px minmax\(0,1fr\) 88px!important/)
    expect(css).toMatch(/\.camera3d-rotation-property>\.camera3d-transform-controls\{[^}]*grid-template-columns:88px 56px!important/)
    expect(css).toMatch(/\.camera3d-axis-row\{grid-template-columns:max-content 4px minmax\(0,1fr\) 4px 88px/)
    expect(css).toMatch(/\.camera3d-axis-fields\{[^}]*grid-template-columns:repeat\(3,minmax\(40px,1fr\)\);gap:4px/)
    expect(css).toContain('.camera3d-balanced-row .camera3d-keyframe-control{display:grid;grid-template-columns:max-content minmax(0,1fr)!important')
    expect(css).not.toMatch(/camera3d-(?:transform-property|axis-row)[^}]*overflow:\s*hidden/)
  })

  it('owns Rotation scrub paint clipping and the exact Camera divider rhythm', () => {
    expect(css).toContain('.camera3d-rotation-section .camera3d-scrub-wheel')
    expect(css).toContain('overflow: hidden !important')
    expect(css).toContain('clip-path: inset(0 round 999px)')
    expect(css).toContain('-webkit-clip-path: inset(0 round 999px)')
    expect(css).toContain('contain: paint')
    expect(css).toContain('isolation: isolate')
    expect(css).toContain('top: 3px')
    expect(css).toContain('bottom: 3px')
    expect(css).toContain('left: 6px')
    expect(css).toContain('right: 6px')
    expect(css).toContain('max-width: calc(100% - 12px)')
    const divider = declarations(css, '.camera3d-camera-section > .camera3d-camera-pre-divider')
    expect(divider).toContain('height: 1px !important')
    expect(divider).toContain('margin: 30px 0 20px !important')
    expect(divider).not.toContain('margin-top: 61px !important')
  })
})
