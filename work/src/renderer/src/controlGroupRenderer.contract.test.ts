import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const nodeCard = readFileSync(new URL('NodeCardNext.tsx', import.meta.url), 'utf8')
const utilityNodes = readFileSync(new URL('UtilityNodes.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('styles-next.css', import.meta.url), 'utf8')

function componentBody(source: string, start: string, end: string) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return source.slice(from, to)
}

function genericVideoFooter() {
  return componentBody(nodeCard, 'className="compact-video-footer-group"\n          ariaLabel="Video Footer Controls"', '\n        />}')
}

describe('active node-wide fluid control renderer contract', () => {
  it('uses the shared whole-group owner and removes legacy row allocators from active next-gen nodes', () => {
    const body = componentBody(nodeCard, 'export function FluidControlGroup', 'export function PlayTooltip')
    expect(body).toContain('allocateMixedControlRows')
    expect(body).toContain('gridTemplateColumns')
    expect(nodeCard).not.toContain('<EqualizedControlRow')
    expect(utilityNodes).not.toContain('StoryboardEqualizedRow')
  })

  it('uses the authoritative four categories with no row-fill category', () => {
    expect(nodeCard).toContain("kind: 'selector'")
    expect(nodeCard).toContain("kind: 'bounded-elastic'")
    expect(nodeCard).toContain("kind: 'intrinsic'")
    expect(nodeCard).toContain("kind: 'fixed-action'")
    expect(nodeCard).not.toContain("kind: 'row-fill'")
    expect(styles).not.toContain('[data-fluid-kind="row-fill"]')
  })

  it('lets selected text consume the fixed interior track and protects a fixed right chevron', () => {
    expect(styles).toMatch(/\[data-fluid-kind="selector"\][^{}]*:is\(\.grouped-menu-select, \.storyboard-compact-select > button\) > span[^{}]*\{[^}]*flex:\s*1 1 auto[^}]*min-width:\s*0[^}]*overflow:\s*hidden[^}]*text-align:\s*left[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s)
    expect(styles).toMatch(/\[data-fluid-kind="selector"\][^{}]*svg[^{}]*\{[^}]*margin-left:\s*var\(--selector-chevron-clearance\)[^}]*margin-right:\s*0[^}]*flex:\s*0 0 auto/s)
    expect(styles).toMatch(/\.grouped-menu-select-menu section > button > span\s*\{[^}]*text-align:\s*left/s)
    expect(styles).toMatch(/\.storyboard-compact-menu > div > button\s*\{[^}]*text-align:\s*left/s)
    expect(styles).not.toContain('margin-left: var(--control-chevron-distance')
    expect(nodeCard).not.toContain('data-control-chevron-distance')
  })

  it('applies shared production geometry to Video, Image, Voice, and Storyboard panel/footer groups', () => {
    expect(nodeCard).toContain('className="compact-video-footer-group"')
    expect(nodeCard).toContain('className="compact-image-footer-group compact-image-footer-row"')
    expect(nodeCard).toContain('className="primary-node-controls video-primary-controls nodrag"')
    expect(nodeCard).toContain('className="voice-primary-row voice-primary-row-two"')
    expect(nodeCard).toContain('className="voice-primary-controls voice-primary-row voice-generator-footer-controls"')
    expect(utilityNodes).toContain('className="storyboard-panel-meta"')
    expect(utilityNodes).toContain('className="storyboard-footer-group"')
  })

  it('preserves fixed Sound and other exact actions, and approved Save/Revamp anatomy', () => {
    expect(nodeCard).toMatch(/id: 'sound', kind: 'fixed-action'[^\n]*intrinsicWidth: 28/)
    expect(nodeCard).toMatch(/id: 'settings', kind: 'fixed-action'[^\n]*intrinsicWidth: 28/)
    expect(nodeCard).toMatch(/id: 'run', kind: 'fixed-action'[^\n]*intrinsicWidth: 28/)
    expect(nodeCard).toContain('<Settings size={14} />')
    expect(nodeCard).toContain('<Play size={12} fill="currentColor" />')
    expect(utilityNodes).toContain('<FooterSaveAction className="storyboard-save"')
    expect(nodeCard).toContain('<Save size={14} />')
    expect(utilityNodes).toContain('className="storyboard-revamp-all"')
    expect(utilityNodes).toContain('<WandSparkles size={12} />All')
    expect(styles).toMatch(/\.footer-save-action[^{}]*\{[^}]*border-radius:\s*50%/s)
    expect(styles).toMatch(/\.storyboard-footer-group button\.storyboard-revamp-all[^{}]*\{[^}]*border-radius:\s*999px/s)
  })

  it('uses automatic Video footer arrangement with no primary Bitrate while preserving Inspector Bitrate', () => {
    const footer = genericVideoFooter()
    expect(footer).toContain('modelId="model" settingsId="settings" runId="run"')
    expect(footer).toContain("iconIds={['sound']}")
    expect(footer).not.toContain('preferredRows:')
    expect(footer).not.toContain('preferredRow:')
    expect(footer).not.toContain("id: 'bitrate'")
    expect(nodeCard).not.toContain('ariaLabel="Video Bitrate"')
  })

  it('adopts the shared Storyboard footer policy with Model first and Save beside terminal Revamp', () => {
    const footer = componentBody(utilityNodes, 'className="storyboard-footer-group"', '/>\n      </footer>')
    expect(footer).toContain('modelId="assistant-model"')
    expect(footer).toContain('runId="revamp"')
    expect(footer).toContain("iconIds={['save']}")
    expect(footer.indexOf("id: 'assistant-model'")).toBeLessThan(footer.indexOf("id: 'budget'"))
    expect(footer.indexOf("id: 'budget'")).toBeLessThan(footer.indexOf("id: 'save'"))
    expect(footer.indexOf("id: 'save'")).toBeLessThan(footer.indexOf("id: 'revamp'"))
  })

  it('does not use row justification as a substitute for exact full-width columns', () => {
    const body = componentBody(nodeCard, 'export function FluidControlGroup', 'export function PlayTooltip')
    expect(body).not.toContain('justifyContent: row.justifyContent')
  })

  it('renders and validates the solver-selected shared gap horizontally and vertically', () => {
    const body = componentBody(nodeCard, 'export function FluidControlGroup', 'export function PlayTooltip')
    expect(body).toContain('const sharedGap = candidate[0]?.gap ?? gap')
    expect(body).toContain('validatePaintedControlLayout(ariaLabel, usableLeft, usableRight, sharedGap, paintedRows)')
    expect(body).toContain("'--control-group-gap': `${rows[0]?.gap ?? gap}px`")
  })

  it('bounds fixed actions and tooltip wrappers to their allocated tracks', () => {
    expect(styles).toContain('--global-play-button-size: var(--node-terminal-action-size);')
    expect(styles).toContain('.equalized-control-group [data-fluid-kind="fixed-action"] { width: 100%; min-width: 100%; max-width: 100%; }')
    expect(styles).toContain('.equalized-control-group [data-fluid-kind="fixed-action"] > :is(button, .play-tooltip-anchor),')
    expect(styles).toContain('.equalized-control-group [data-fluid-kind="fixed-action"] > .play-tooltip-anchor > button { width: 100%; min-width: 100%; max-width: 100%; }')
  })

  it('commits only validated current-descriptor layouts and never renders stale or null controls', () => {
    const body = componentBody(nodeCard, 'export function FluidControlGroup', 'export function PlayTooltip')
    expect(body).toContain('activeControlDescriptors')
    expect(body).toContain('validateControlLayout')
    expect(body).toContain('deterministicSafeControlRows')
    expect(body).toContain('lastValidRows')
    expect(body).toContain('descriptorSignature')
    expect(body).not.toContain('return control ?')
    expect(body).not.toContain(': null')
  })

  it('observes usable width only, coalesces allocation in one animation frame, and keeps stable row keys', () => {
    const body = componentBody(nodeCard, 'export function FluidControlGroup', 'export function PlayTooltip')
    expect(body).toContain('lastMeasuredWidth')
    expect(body).toContain('requestAnimationFrame')
    expect(body).toContain('cancelAnimationFrame')
    expect(body).toContain('rowMembershipKey(row)')
    expect(body).not.toContain('key={`${recalculationKey}:${rowIndex}`}')
    expect(body).not.toContain('new ResizeObserver(allocate)')
    expect(body).toMatch(/\[[^\]]*recalculationKey[^\]]*\]/)
  })

  it('measures painted intrinsic children and validates painted borders and visible gaps before committing', () => {
    const body = componentBody(nodeCard, 'export function FluidControlGroup', 'export function PlayTooltip')
    expect(body).toContain('measureIntrinsicBorderBox')
    expect(body).toContain('validatePaintedControlLayout')
    expect(body).toContain('paintedValidation.valid')
    expect(body).toContain('data-fluid-label-tier')
  })

  it('passes full compact and minimum model metadata to Video and async Storyboard selectors', () => {
    const video = genericVideoFooter()
    expect(video).toContain('fullLabel: closedVideoLabel')
    expect(video).toContain('compactLabel: closedVideoLabel')
    expect(video).toContain("shrinkPriority: 'model'")
    const footer = componentBody(utilityNodes, 'className="storyboard-footer-group"', '/>\n      </footer>')
    expect(footer).toContain('defaultLabel: assistantDefaultLabel')
    expect(footer).toContain('fullLabel: assistantDefaultLabel')
    expect(footer).toContain('compactLabel: assistantDefaultLabel')
  })

  it('uses selected-content anatomy for labels, a painted-symmetric quantity cluster, and one terminal-action token', () => {
    expect(styles).toContain('--node-terminal-action-size: var(--node-control-height);')
    expect(styles).toContain('--selector-content-inset: 8px;')
    expect(styles).toMatch(/\.primary-node-controls label > span\s*\{[^}]*padding-left:\s*var\(--selector-content-inset\)/)
    expect(styles).toMatch(/\.voice-primary-row \[data-fluid-control-id\] > label > span\s*\{[^}]*padding-left:\s*var\(--selector-content-inset\)/)
    expect(styles).toContain('.quantity-stepper-inner-cluster')
    expect(styles).toMatch(/\.footer-run\s*\{[^}]*--play-button-size:\s*var\(--node-terminal-action-size\)/)
    expect(styles).toMatch(/\.footer-run\s*>\s*svg[^\{]*\{[^}]*width:\s*14px[^}]*height:\s*14px/)
    expect(styles).toMatch(/\.compact-settings\.compact-options\s*\{[^}]*min-width:\s*var\(--node-terminal-action-size\)[^}]*max-width:\s*var\(--node-terminal-action-size\)[^}]*aspect-ratio:\s*1\s*\/\s*1[^}]*border-radius:\s*50%/)
    expect(styles).toContain('grid-template-columns: max-content minmax(0, 1fr) var(--node-terminal-action-size) var(--node-terminal-action-size);')
    expect(styles).toContain('grid-template-columns: max-content max-content minmax(0, 1fr) var(--node-terminal-action-size) var(--node-terminal-action-size);')
    expect(styles).toMatch(/\.node-inspector-panel > footer button\.footer-run\s*\{[^}]*width:\s*var\(--node-terminal-action-size\)[^}]*border-radius:\s*50%/)
    expect(styles).toMatch(/\.node-hover-toolbar \.toolbar-run-button\s*\{[^}]*width:\s*var\(--node-terminal-action-size\)[^}]*border-radius:\s*50%/)
  })

  it('omits unavailable primary Video selectors rather than rendering fixed placeholders', () => {
    const footer = genericVideoFooter()
    expect(footer).toContain("available: Boolean(selectedVideoModel?.ratios.length)")
    expect(footer).toContain("available: Boolean(selectedVideoModel?.resolutions.length)")
    expect(footer).not.toContain("value={selectedVideoModel?.ratios.length ? resolvedVideoRatio(selectedVideoModel, data.aspectRatio) : 'fixed'}")
    expect(footer).not.toContain("value={selectedVideoModel?.resolutions.length ?")
  })
})
