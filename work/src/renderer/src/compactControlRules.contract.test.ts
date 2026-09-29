import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const nodeCard = readFileSync(new URL('NodeCardNext.tsx', import.meta.url), 'utf8')
const utilityNodes = readFileSync(new URL('UtilityNodes.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('styles-next.css', import.meta.url), 'utf8')
const videoModels = readFileSync(new URL('../../shared/videoModels.ts', import.meta.url), 'utf8')
const saveLifecycleUrl = new URL('../../shared/footerSaveLifecycle.ts', import.meta.url)
const saveLifecycle = existsSync(saveLifecycleUrl) ? readFileSync(saveLifecycleUrl, 'utf8') : ''

describe('final compact-control source contract', () => {
  it('uses one canonical always-compact closed Video identity while retaining full menu and accessibility identity', () => {
    expect(videoModels).toContain('export function closedVideoModelLabel')
    expect(videoModels).toContain("return `${model.shortLabel}…`")
    expect(nodeCard).toContain('const closedVideoLabel = closedVideoModelLabel(selectedVideoModel')
    expect(nodeCard).toContain('displayLabel={closedVideoLabel}')
    expect(nodeCard).toContain('accessibleLabel={selectedVideoModel?.label')
    expect(nodeCard).toContain('fullLabel: closedVideoLabel')
    expect(nodeCard).toContain('compactLabel: closedVideoLabel')
  })

  it('routes node-footer Save controls through one truthful neutral-saving-saved lifecycle', () => {
    expect(saveLifecycle).toContain('export const SAVE_SUCCESS_TRANSIENT_MS = 2_000')
    expect(saveLifecycle).toContain("export type FooterSavePhase = 'neutral' | 'saving' | 'saved'")
    expect(nodeCard).toContain('export function FooterSaveAction')
    expect(nodeCard).toContain("phase === 'saving' ? 'is-saving' : phase === 'saved' ? 'is-saved' : 'is-neutral'")
    expect(nodeCard).not.toMatch(/footer-save-action reusable-save-button[^\n]*is-unsaved/)
    expect(utilityNodes).toContain('<FooterSaveAction')
    expect(utilityNodes).not.toContain("data.storyboardNeedsCompile ? 'is-unsaved' : 'is-saved'")
    expect(styles).toMatch(/\.footer-save-action\.is-neutral[^{}]*\{[^}]*background:\s*#211e27/s)
  })

  it('uses symmetric Quantity baseline padding and one protected selector clearance token', () => {
    expect(styles).toContain('--quantity-outer-padding-min: 4px;')
    expect(styles).toMatch(/\.quantity-stepper-inner-cluster\s*\{[^}]*padding-inline:\s*calc\(var\(--quantity-outer-padding-min\) \+ var\(--control-symmetric-padding, 0px\)\)/s)
    expect(styles).toContain('--selector-chevron-clearance: 4px;')
    expect(styles).toMatch(/span \+ svg[^{}]*\{[^}]*margin-left:\s*var\(--selector-chevron-clearance\)/s)
  })
})
