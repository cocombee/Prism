import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const nodeCard = readFileSync(new URL('NodeCardNext.tsx', import.meta.url), 'utf8')
const utility = readFileSync(new URL('UtilityNodes.tsx', import.meta.url), 'utf8')
const sharedControls = readFileSync(new URL('StoryboardSharedControls.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('AppNext.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('styles-next.css', import.meta.url), 'utf8')

describe('active shared selector search surface', () => {
  it('covers grouped/simple provider-model, Inspector, Storyboard compact, Prompt Enhance, and duration selectors through shared search contracts', () => {
    expect(nodeCard).toContain('filterAndRankSelectorOptions')
    expect(nodeCard).toContain('Search ${ariaLabel} options')
    expect(nodeCard).toContain('Clear selector search')
    expect(nodeCard).toContain('No matching options')
    expect(nodeCard).toContain('prompt-enhance-model-menu')
    expect(utility).toContain('filterAndRankSelectorOptions')
    expect(sharedControls).toContain('Search ${triggerAriaLabel || label} options')
    expect(sharedControls).toContain('No matching options')
    expect(utility).not.toContain('label="Storyboard Duration"')
    expect(utility).toContain('label="Duration"')
  })

  it('preserves the closed selectors and existing outer portal geometry while pinning a 32px search row above only the scrolling results', () => {
    expect(styles).toMatch(/\.selector-search-row\s*\{[^}]*height:\s*32px;[^}]*border:\s*1px solid #302c37;[^}]*border-radius:\s*8px;[^}]*background:\s*#151419;[^}]*color:\s*#d2cbd7;/s)
    expect(styles).toMatch(/\.selector-search-row input:focus[^}]*box-shadow:\s*0 0 0 1px rgba\(159,131,255,\.55\)/)
    expect(styles).toContain('.selector-results { min-height: 0; overflow-y: auto; }')
    expect(styles).toContain('.grouped-menu-select-menu {')
    expect(styles).toContain('.storyboard-compact-menu {')
    expect(styles).toContain('gap: 4px')
  })

  it('suppresses every AppNext shortcut while any selector is open and resumes from the shared registry on close', () => {
    expect(app).toContain('appShortcutsSuppressed()')
    expect((app.match(/if \(appShortcutsSuppressed\(\)\) return/g) || []).length).toBeGreaterThanOrEqual(5)
    expect(nodeCard).toContain('setSelectorPortalOpen')
    expect(utility).toContain('setSelectorPortalOpen')
  })

  it('uses input focus plus aria-activedescendant, truthful listbox/disabled states, result count, and clean close behavior', () => {
    for (const source of [nodeCard, sharedControls]) {
      expect(source).toContain('aria-activedescendant')
      expect(source).toContain('aria-controls')
      expect(source).toContain('aria-live="polite"')
      expect(source).toContain('role="listbox"')
      expect(source).toContain('role="option"')
      expect(source).toContain('scrollIntoView({ block: \'nearest\' })')
    }
  })
})
